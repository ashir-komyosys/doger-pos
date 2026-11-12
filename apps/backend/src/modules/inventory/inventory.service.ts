import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  IngredientDto,
  SupplierDto,
  RecipeLineDto,
  MenuItemTrackingDto,
} from '@nodedr-restaurant/types';
import { PrismaService } from '../../prisma/prisma.service';
import { round2, round3 } from '../../common/money';
import { StockService } from './stock.service';
import { planStockUsage, type PlanItem, type StockPlan } from './stock-plan';
import { convertIngredientQuantity } from './ingredient-units';

type Tx = Prisma.TransactionClient;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
  ) {}

  // --- Ingredients ----------------------------------------------------------

  async listIngredients(branchId: string) {
    const ingredients = await this.prisma.ingredient.findMany({
      where: { branchId },
      orderBy: { name: 'asc' },
    });
    const reservations = await this.prisma.stockReservation.groupBy({
      by: ['ingredientId'],
      where: { branchId, status: 'RESERVED' },
      _sum: { quantity: true },
    });
    const reservedByIngredient = new Map(
      reservations.map((reservation) => [
        reservation.ingredientId,
        Number(reservation._sum.quantity ?? 0),
      ]),
    );
    return ingredients.map((ingredient) => {
      const reservedStock = round3(
        reservedByIngredient.get(ingredient.id) ?? 0,
      );
      return {
        ...ingredient,
        reservedStock,
        availableStock: round3(Number(ingredient.currentStock) - reservedStock),
      };
    });
  }

  async getIngredient(branchId: string, id: string) {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id, branchId },
    });
    if (!ingredient) throw new NotFoundException('Ingredient not found');
    return ingredient;
  }

  createIngredient(branchId: string, userId: string, dto: IngredientDto) {
    const { openingStock, ...ingredientData } = dto;
    return this.prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.create({
        data: { ...ingredientData, branchId },
      });
      if (openingStock > 0) {
        await tx.ingredient.update({
          where: { id: ingredient.id },
          data: { currentStock: openingStock },
        });
        await tx.stockMovement.create({
          data: {
            branchId,
            ingredientId: ingredient.id,
            type: 'ADJUSTMENT',
            quantity: openingStock,
            stockBefore: 0,
            stockAfter: openingStock,
            note: 'Opening stock',
            createdById: userId,
          },
        });
      }
      return tx.ingredient.findUniqueOrThrow({ where: { id: ingredient.id } });
    });
  }

  async updateIngredient(
    branchId: string,
    id: string,
    dto: Partial<IngredientDto>,
  ) {
    const ingredient = await this.getIngredient(branchId, id);
    if (dto.unit && dto.unit !== ingredient.unit) {
      const [recipes, directItems, movements, reservations] = await Promise.all(
        [
          this.prisma.recipeIngredient.count({ where: { ingredientId: id } }),
          this.prisma.menuItem.count({ where: { stockIngredientId: id } }),
          this.prisma.stockMovement.count({ where: { ingredientId: id } }),
          this.prisma.stockReservation.count({ where: { ingredientId: id } }),
        ],
      );
      if (
        recipes > 0 ||
        directItems > 0 ||
        movements > 0 ||
        reservations > 0 ||
        Number(ingredient.currentStock) !== 0
      ) {
        throw new BadRequestException(
          'This ingredient unit is already used by recipes or stock records. Create a new ingredient with the correct unit instead.',
        );
      }
    }
    const data = { ...dto };
    delete data.openingStock;
    return this.prisma.ingredient.update({ where: { id }, data });
  }

  async deleteIngredient(branchId: string, id: string) {
    await this.getIngredient(branchId, id);
    const [
      usedInRecipe,
      directItems,
      poItems,
      receiptItems,
      batches,
      movements,
      waste,
      reservations,
      requests,
      quotations,
    ] = await Promise.all([
      this.prisma.recipeIngredient.count({ where: { ingredientId: id } }),
      this.prisma.menuItem.count({ where: { stockIngredientId: id } }),
      this.prisma.purchaseOrderItem.count({ where: { ingredientId: id } }),
      this.prisma.goodsReceiptItem.count({ where: { ingredientId: id } }),
      this.prisma.stockBatch.count({ where: { ingredientId: id } }),
      this.prisma.stockMovement.count({ where: { ingredientId: id } }),
      this.prisma.wasteLog.count({ where: { ingredientId: id } }),
      this.prisma.stockReservation.count({ where: { ingredientId: id } }),
      this.prisma.purchaseRequestItem.count({ where: { ingredientId: id } }),
      this.prisma.supplierQuotationItem.count({ where: { ingredientId: id } }),
    ]);
    if (
      [
        usedInRecipe,
        directItems,
        poItems,
        receiptItems,
        batches,
        movements,
        waste,
        reservations,
        requests,
        quotations,
      ].some((count) => count > 0)
    ) {
      throw new BadRequestException(
        'This ingredient has menu links or stock history. Deactivate it instead to preserve records.',
      );
    }
    await this.prisma.ingredient.delete({ where: { id } });
    return { ok: true };
  }

  async lowStockIngredients(branchId: string) {
    const ingredients = await this.listIngredients(branchId);
    return ingredients.filter(
      (i) => Number(i.availableStock) <= Number(i.reorderLevel),
    );
  }

  // --- Suppliers --------------------------------------------------------------

  listSuppliers(branchId: string) {
    return this.prisma.supplier.findMany({
      where: { branchId },
      orderBy: { name: 'asc' },
    });
  }

  async getSupplier(branchId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, branchId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  createSupplier(branchId: string, dto: SupplierDto) {
    return this.prisma.supplier.create({ data: { ...dto, branchId } });
  }

  async updateSupplier(
    branchId: string,
    id: string,
    dto: Partial<SupplierDto>,
  ) {
    await this.getSupplier(branchId, id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async deleteSupplier(branchId: string, id: string) {
    await this.getSupplier(branchId, id);
    const usedInPo = await this.prisma.purchaseOrder.count({
      where: { supplierId: id },
    });
    if (usedInPo > 0) {
      throw new BadRequestException(
        'Supplier has purchase orders on record — deactivate instead of deleting',
      );
    }
    await this.prisma.supplier.delete({ where: { id } });
    return { ok: true };
  }

  // --- Recipe costing -----------------------------------------------------------
  //
  // costPerUnit on Ingredient is a weighted-average, kept current by
  // GoodsReceiptsService on every GRN — so recipe cost here is always a
  // live, accurate read, not a stale snapshot recomputed on a timer.

  async getRecipe(branchId: string, menuItemId: string) {
    await this.assertMenuItemInBranch(branchId, menuItemId);
    const lines = await this.prisma.recipeIngredient.findMany({
      where: { menuItemId },
      include: { ingredient: true },
      orderBy: { createdAt: 'asc' },
    });
    const costed = lines.map((line) => ({
      id: line.id,
      ingredientId: line.ingredientId,
      ingredientName: line.ingredient.name,
      unit: line.unit ?? line.ingredient.unit,
      quantity: Number(line.quantity),
      costPerUnit: Number(line.ingredient.costPerUnit),
      lineCost: round2(
        convertIngredientQuantity(
          Number(line.quantity),
          line.unit ?? line.ingredient.unit,
          line.ingredient.unit,
        ) * Number(line.ingredient.costPerUnit),
      ),
    }));
    const totalCost = round2(costed.reduce((sum, l) => sum + l.lineCost, 0));
    return { lines: costed, totalCost };
  }

  async setRecipe(
    branchId: string,
    menuItemId: string,
    lines: RecipeLineDto[],
  ) {
    await this.assertMenuItemInBranch(branchId, menuItemId);

    const ingredientIds = lines.map((l) => l.ingredientId);
    if (new Set(ingredientIds).size !== ingredientIds.length) {
      throw new BadRequestException('Duplicate ingredient in recipe');
    }
    if (ingredientIds.length > 0) {
      const ingredients = await this.prisma.ingredient.findMany({
        where: { id: { in: ingredientIds }, branchId, isActive: true },
        select: { id: true, unit: true },
      });
      if (ingredients.length !== ingredientIds.length) {
        throw new BadRequestException(
          'One or more ingredients not found in this branch',
        );
      }
      const stockUnits = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient.unit]));
      for (const line of lines) {
        const stockUnit = stockUnits.get(line.ingredientId)!;
        const recipeUnit = line.unit ?? stockUnit;
        try {
          convertIngredientQuantity(
            line.quantity,
            recipeUnit,
            stockUnit,
          );
        } catch {
          throw new BadRequestException(
            `Recipe unit ${recipeUnit} is incompatible with ingredient stock unit ${stockUnit}`,
          );
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.recipeIngredient.deleteMany({ where: { menuItemId } });
      if (lines.length > 0) {
        await tx.recipeIngredient.createMany({
          data: lines.map((l) => ({
            menuItemId,
            ingredientId: l.ingredientId,
            quantity: l.quantity,
            unit: l.unit,
          })),
        });
      }
    });

    const recipe = await this.getRecipe(branchId, menuItemId);
    await this.prisma.menuItem.update({
      where: { id: menuItemId },
      data: {
        costPrice: recipe.totalCost,
        ...(lines.length > 0
          ? {
              inventoryTracking: 'RECIPE',
              stockIngredientId: null,
              stockQuantityPerSale: 0,
            }
          : {}),
      },
    });
    if (lines.length === 0) {
      await this.prisma.menuItem.updateMany({
        where: { id: menuItemId, inventoryTracking: 'RECIPE' },
        data: {
          inventoryTracking: 'NONE',
          stockIngredientId: null,
          stockQuantityPerSale: 0,
        },
      });
    }
    // Explicit recipe configuration replaces direct stock tracking so this
    // recipe, rather than an older single-ingredient mapping, drives usage.
    return recipe;
  }

  async getTracking(branchId: string, menuItemId: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, branchId },
      select: {
        id: true,
        inventoryTracking: true,
        stockIngredientId: true,
        stockQuantityPerSale: true,
        isCombo: true,
      },
    });
    if (!item) throw new NotFoundException('Menu item not found');
    return {
      ...item,
      stockQuantityPerSale: Number(item.stockQuantityPerSale),
    };
  }

  async setTracking(
    branchId: string,
    menuItemId: string,
    dto: MenuItemTrackingDto,
  ) {
    await this.assertMenuItemInBranch(branchId, menuItemId);
    if (dto.inventoryTracking === 'DIRECT') {
      const ingredient = await this.prisma.ingredient.findFirst({
        where: { id: dto.stockIngredientId ?? '', branchId, isActive: true },
        select: { id: true },
      });
      if (!ingredient) {
        throw new BadRequestException('Stock item not found in this branch');
      }
    }
    await this.prisma.menuItem.update({
      where: { id: menuItemId },
      data: {
        inventoryTracking: dto.inventoryTracking,
        stockIngredientId:
          dto.inventoryTracking === 'DIRECT' ? dto.stockIngredientId : null,
        stockQuantityPerSale:
          dto.inventoryTracking === 'DIRECT'
            ? (dto.stockQuantityPerSale ?? 1)
            : 1,
      },
    });
    return this.getTracking(branchId, menuItemId);
  }

  private async assertMenuItemInBranch(branchId: string, menuItemId: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, branchId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Menu item not found');
  }

  // --- Automatic deduction on order checkout ------------------------------
  //
  // Called from OrdersService.checkout() inside its own transaction (`tx`
  // passed through, not opened here), so the movements, the ingredient
  // balances and the OPEN->PAID order update commit or roll back together.
  // What moves is decided by planStockUsage(): RECIPE items deduct their
  // recipe lines, DIRECT items deduct one stock item, NONE items nothing,
  // combos expand into their components. Stock may go negative on purpose
  // (allowNegative): a shortage must never block a paid sale, it shows up as
  // a negative balance for the next stocktake. Tracked items that cannot be
  // mapped to stock are returned in `skipped` and reported by the caller -
  // never silently ignored.
  //
  // Idempotent per order: checkout's guarded status update already makes
  // double-payment impossible; the CONSUMPTION lookup is a second line of
  // defence against any retry path re-running this for the same order.
  async deductForOrder(
    tx: Tx,
    branchId: string,
    userId: string,
    orderId: string,
    lines: { menuItemId: string; quantity: number }[],
  ): Promise<{ skipped: StockPlan['skipped'] }> {
    if (lines.length === 0) return { skipped: [] };
    const already = await tx.stockMovement.count({
      where: { orderId, type: 'CONSUMPTION' },
    });
    if (already > 0) return { skipped: [] };

    const plan = await this.planFor(tx, lines);
    for (const [ingredientId, quantity] of [...plan.needs].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      if (quantity <= 0) continue;
      await this.stockService.consumeStock(
        tx,
        branchId,
        ingredientId,
        quantity,
        {
          type: 'CONSUMPTION',
          note: 'Order checkout',
          userId,
          allowNegative: true,
          orderId,
        },
      );
    }
    return { skipped: plan.skipped };
  }

  /** Reserve ingredient quantities for one kitchen ticket without changing on-hand stock. */
  async reserveForKot(
    tx: Tx,
    branchId: string,
    kotId: string,
    lines: { menuItemId: string; quantity: number }[],
  ) {
    const kot = await tx.kot.findUnique({
      where: { id: kotId },
      select: { inventoryReservedAt: true },
    });
    if (!kot) throw new NotFoundException('Kitchen ticket not found');
    if (kot.inventoryReservedAt) return;

    const plan = await this.planFor(tx, lines);
    for (const [ingredientId, quantity] of [...plan.needs].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      if (quantity <= 0) continue;
      await tx.$queryRaw`SELECT id FROM ingredients WHERE id = ${ingredientId} FOR UPDATE`;
      const ingredient = await tx.ingredient.findFirst({
        where: { id: ingredientId, branchId },
        select: { id: true },
      });
      if (!ingredient) {
        throw new BadRequestException(
          'A menu item uses an ingredient that is missing from this branch',
        );
      }
      // Record the full requirement even when current stock is short. A busy
      // restaurant must still be able to take the order; the resulting
      // negative available balance makes the shortage visible to the manager.
      await tx.stockReservation.create({
        data: { branchId, ingredientId, kotId, quantity },
      });
    }

    await tx.kot.update({
      where: { id: kotId },
      data: { inventoryReservedAt: new Date() },
    });
  }

  /** Keep holds aligned when staff changes an unstarted ticket's lines. */
  async reconcileKotReservations(tx: Tx, branchId: string, kotId: string) {
    const kot = await tx.kot.findUnique({
      where: { id: kotId },
      select: {
        inventoryReservedAt: true,
        items: {
          include: {
            orderItem: { select: { menuItemId: true, quantity: true } },
          },
        },
      },
    });
    if (!kot?.inventoryReservedAt) return;

    const lines = kot.items.map(({ orderItem }) => ({
      menuItemId: orderItem.menuItemId,
      quantity: orderItem.quantity,
    }));
    const needs = (await this.planFor(tx, lines)).needs;
    const existing = await tx.stockReservation.findMany({
      where: { branchId, kotId },
    });
    const byIngredient = new Map(
      existing.map((row) => [row.ingredientId, row]),
    );
    const ingredientIds = [
      ...new Set([...byIngredient.keys(), ...needs.keys()]),
    ].sort();

    for (const ingredientId of ingredientIds) {
      const row = byIngredient.get(ingredientId);
      const required = needs.get(ingredientId) ?? 0;
      if (required <= 0) {
        if (row?.status === 'RESERVED') {
          await tx.stockReservation.update({
            where: { id: row.id },
            data: { status: 'RELEASED', resolvedAt: new Date() },
          });
        }
        continue;
      }

      await tx.$queryRaw`SELECT id FROM ingredients WHERE id = ${ingredientId} FOR UPDATE`;
      const ingredient = await tx.ingredient.findFirst({
        where: { id: ingredientId, branchId },
        select: { id: true },
      });
      if (!ingredient) throw new BadRequestException('Ingredient not found');
      if (row) {
        await tx.stockReservation.update({
          where: { id: row.id },
          data: { quantity: required, status: 'RESERVED', resolvedAt: null },
        });
      } else {
        await tx.stockReservation.create({
          data: { branchId, ingredientId, kotId, quantity: required },
        });
      }
    }
  }

  /** Resolve a ticket's holds exactly once when it is ready, rejected, or withdrawn. */
  async resolveKotReservations(
    tx: Tx,
    branchId: string,
    userId: string,
    kotId: string,
    resolution: 'CONSUMED' | 'RELEASED' | 'WASTED',
  ) {
    const reservations = await tx.stockReservation.findMany({
      where: { branchId, kotId, status: 'RESERVED' },
    });
    const kot = await tx.kot.findUniqueOrThrow({
      where: { id: kotId },
      select: { orderId: true },
    });
    for (const reservation of reservations) {
      if (resolution === 'CONSUMED' || resolution === 'WASTED') {
        const portions = await this.stockService.consumeStock(
          tx,
          branchId,
          reservation.ingredientId,
          Number(reservation.quantity),
          {
            type: resolution === 'WASTED' ? 'WASTE' : 'CONSUMPTION',
            note:
              resolution === 'WASTED'
                ? 'Kitchen ticket rejected after preparation started'
                : 'Kitchen ticket marked ready',
            userId,
            allowNegative: true,
            orderId: kot.orderId,
            reservationKotId: kotId,
          },
        );
        if (resolution === 'WASTED') {
          for (const portion of portions) {
            await tx.wasteLog.create({
              data: {
                branchId,
                ingredientId: reservation.ingredientId,
                batchId: portion.batchId,
                quantity: portion.quantity,
                reason: 'PREP_ERROR',
                unitCostAtWaste: portion.unitCost,
                notes: 'Kitchen ticket rejected after preparation started',
                createdById: userId,
              },
            });
          }
        }
      }
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: {
          status: resolution === 'RELEASED' ? 'RELEASED' : 'CONSUMED',
          resolvedAt: new Date(),
        },
      });
    }
  }

  async resolveOrderReservations(
    tx: Tx,
    branchId: string,
    userId: string,
    orderId: string,
  ) {
    const tickets = await tx.kot.findMany({
      where: { orderId, stockReservations: { some: { status: 'RESERVED' } } },
      select: { id: true, status: true },
    });
    for (const ticket of tickets) {
      const started = ['PREPARING', 'READY', 'SERVED'].includes(ticket.status);
      await this.resolveKotReservations(
        tx,
        branchId,
        userId,
        ticket.id,
        started ? 'WASTED' : 'RELEASED',
      );
    }
  }

  // Puts physically returned units back in stock (compensating REVERSAL
  // movements). Only called when a refund explicitly names the returned
  // items; a money-only refund never reaches here.
  async restoreForReturn(
    tx: Tx,
    branchId: string,
    userId: string,
    orderId: string,
    lines: { menuItemId: string; quantity: number }[],
  ): Promise<{ restored: number }> {
    const plan = await this.planFor(tx, lines);
    let restored = 0;
    for (const [ingredientId, quantity] of plan.needs) {
      restored += await this.stockService.restoreStock(
        tx,
        branchId,
        ingredientId,
        quantity,
        { userId, orderId, note: 'Returned with refund' },
      );
    }
    return { restored };
  }

  private async planFor(
    tx: Tx,
    lines: { menuItemId: string; quantity: number }[],
  ): Promise<StockPlan> {
    const ids = [...new Set(lines.map((l) => l.menuItemId))];
    const combos = await tx.comboComponent.findMany({
      where: { comboItemId: { in: ids } },
    });
    const allIds = [
      ...new Set([...ids, ...combos.map((c) => c.componentItemId)]),
    ];
    const rows = await tx.menuItem.findMany({
      where: { id: { in: allIds } },
      include: {
        recipeLines: {
          include: { ingredient: { select: { unit: true } } },
        },
      },
    });
    const items = new Map<string, PlanItem>(
      rows.map((m) => [
        m.id,
        {
          id: m.id,
          name: m.name,
          isCombo: m.isCombo,
          tracking: m.inventoryTracking,
          stockIngredientId: m.stockIngredientId,
          stockQuantityPerSale: Number(m.stockQuantityPerSale),
          recipe: m.recipeLines.map((l) => ({
            ingredientId: l.ingredientId,
            quantity: convertIngredientQuantity(
              Number(l.quantity),
              l.unit ?? l.ingredient.unit,
              l.ingredient.unit,
            ),
          })),
        },
      ]),
    );
    return planStockUsage(lines, items, combos);
  }

  // Setup status: sellable items whose inventory tracking is switched on but
  // not mapped to any stock, so selling them would deduct nothing.
  async trackingSetupStatus(branchId: string) {
    const items = await this.prisma.menuItem.findMany({
      where: {
        branchId,
        isActive: true,
        isCombo: false,
        inventoryTracking: { not: 'NONE' },
      },
      select: {
        id: true,
        name: true,
        inventoryTracking: true,
        stockIngredientId: true,
        stockQuantityPerSale: true,
        _count: { select: { recipeLines: true } },
      },
      orderBy: { name: 'asc' },
    });
    const problems = items.flatMap<StockPlan['skipped'][number]>((i) => {
      if (i.inventoryTracking === 'RECIPE' && i._count.recipeLines === 0) {
        return [
          { menuItemId: i.id, name: i.name, reason: 'NO_RECIPE' as const },
        ];
      }
      if (
        i.inventoryTracking === 'DIRECT' &&
        (!i.stockIngredientId || Number(i.stockQuantityPerSale) <= 0)
      ) {
        return [
          { menuItemId: i.id, name: i.name, reason: 'NO_STOCK_ITEM' as const },
        ];
      }
      return [];
    });
    const [untracked, tracked] = await Promise.all([
      this.prisma.menuItem.count({
        where: {
          branchId,
          isActive: true,
          isCombo: false,
          inventoryTracking: 'NONE',
        },
      }),
      this.prisma.menuItem.count({
        where: {
          branchId,
          isActive: true,
          isCombo: false,
          inventoryTracking: { not: 'NONE' },
        },
      }),
    ]);
    return { tracked, untracked, problems };
  }
}
