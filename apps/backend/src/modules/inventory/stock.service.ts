import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, StockMovement, StockMovementType } from '@prisma/client';
import type { StockAdjustmentDto } from '@nodedr-restaurant/types';
import { PrismaService } from '../../prisma/prisma.service';
import { round3 } from '../../common/money';

type Tx = Prisma.TransactionClient;

export interface StockConsumptionPortion {
  batchId: string | null;
  quantity: number;
  unitCost: number;
}

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  listMovements(branchId: string, ingredientId: string) {
    return this.prisma.stockMovement.findMany({
      where: { branchId, ingredientId },
      include: { createdBy: { select: { id: true, name: true } }, batch: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async listBranchMovements(
    branchId: string,
    options: { ingredientId?: string; type?: StockMovementType; cursor?: string; from?: Date; to?: Date },
  ) {
    const take = 50;
    const rows = await this.prisma.stockMovement.findMany({
      where: {
        branchId,
        ...(options.ingredientId ? { ingredientId: options.ingredientId } : {}),
        ...(options.type ? { type: options.type } : {}),
        ...(options.from || options.to
          ? { createdAt: { ...(options.from ? { gte: options.from } : {}), ...(options.to ? { lt: options.to } : {}) } }
          : {}),
      },
      include: {
        ingredient: { select: { id: true, name: true, unit: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > take;
    const data = rows.slice(0, take);
    return {
      data,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
    };
  }

  listBatches(branchId: string, ingredientId: string) {
    return this.prisma.stockBatch.findMany({
      where: { branchId, ingredientId },
      orderBy: { receivedAt: 'desc' },
    });
  }

  // Shared FIFO consumption core — draws from the oldest StockBatch first,
  // logs one StockMovement per batch touched (each carrying that batch's
  // own cost), and updates Ingredient.currentStock. Used by both waste
  // logging (blocks over-consumption) and order-checkout ingredient
  // deduction (allows going negative — see allowNegative below).
  //
  // Takes the caller's own transaction client rather than opening one
  // itself, so it composes into a larger transaction (order checkout) as
  // cleanly as it runs standalone (waste logging) — the caller owns the
  // atomicity boundary. Ingredient and batches are both read fresh via
  // `tx` as the FIRST thing this does, not from a pre-transaction snapshot
  // the caller might be holding — narrows the concurrent-request race on
  // a shared ingredient's stock to the transaction's own duration, the
  // same discipline `orders.service.ts` already applies to loyalty-point
  // redemption (re-read the mutable balance inside the transaction, not
  // before it).
  async consumeStock(
    tx: Tx,
    branchId: string,
    ingredientId: string,
    quantity: number,
    opts: {
      type: StockMovementType;
      note?: string;
      userId: string;
      allowNegative?: boolean;
      orderId?: string;
      reservationKotId?: string;
    },
  ): Promise<StockConsumptionPortion[]> {
    // Row lock: FIFO batch consumption reads multiple StockBatch rows plus
    // the Ingredient's own currentStock, then writes all of them based on
    // what it read — unlike a single balance column, this can't be made
    // safe with a guarded atomic decrement alone. Locking the ingredient
    // row for the rest of this transaction serializes concurrent
    // consumeStock calls for the SAME ingredient (e.g. two checkouts
    // selling the same low-stock item at once), so the second call's reads
    // above would otherwise be safe only by luck — without this lock they
    // can both see the same pre-consumption batch quantities and each
    // independently subtract from them, silently over-consuming stock
    // beyond what was actually on hand.
    await tx.$queryRaw`SELECT id FROM ingredients WHERE id = ${ingredientId} FOR UPDATE`;
    const ingredient = await tx.ingredient.findFirst({
      where: { id: ingredientId, branchId },
    });
    if (!ingredient) throw new NotFoundException('Ingredient not found');

    const batches = await tx.stockBatch.findMany({
      where: { branchId, ingredientId, quantityRemaining: { gt: 0 } },
      orderBy: { receivedAt: 'asc' },
    });

    // Ingredient.currentStock is the full on-hand balance, including manual
    // stocktake additions that do not belong to a purchase batch. FIFO still
    // draws batch quantities first; any remainder is recorded unbatched.
    const physicalAvailable = Number(ingredient.currentStock);

    const reserved = await tx.stockReservation.aggregate({
      where: {
        branchId,
        ingredientId,
        status: 'RESERVED',
        ...(opts.reservationKotId
          ? { kotId: { not: opts.reservationKotId } }
          : {}),
      },
      _sum: { quantity: true },
    });
    const available = Math.max(
      0,
      round3(physicalAvailable - Number(reserved._sum.quantity ?? 0)),
    );

    if (quantity > available && !opts.allowNegative) {
      throw new BadRequestException(
        `Cannot consume ${quantity} ${ingredient.unit} of ${ingredient.name} — only ${available} in stock`,
      );
    }

    const portions: StockConsumptionPortion[] = [];
    let remaining = quantity;
    let balance = physicalAvailable;

    for (const batch of batches) {
      if (remaining <= 0) break;
      const consumeQty = Math.min(remaining, Number(batch.quantityRemaining));

      await tx.stockBatch.update({
        where: { id: batch.id },
        data: {
          quantityRemaining: round3(
            Number(batch.quantityRemaining) - consumeQty,
          ),
        },
      });
      await tx.stockMovement.create({
        data: {
          branchId,
          ingredientId,
          batchId: batch.id,
          type: opts.type,
          quantity: -consumeQty,
          stockBefore: balance,
          stockAfter: round3(balance - consumeQty),
          note: opts.note,
          createdById: opts.userId,
          orderId: opts.orderId,
        },
      });
      balance = round3(balance - consumeQty);
      portions.push({
        batchId: batch.id,
        quantity: consumeQty,
        unitCost: Number(batch.unitCost),
      });
      remaining = round3(remaining - consumeQty);
    }

    if (remaining > 0) {
      // Either no batch history at all, or (allowNegative only) demand
      // exceeded every batch on hand — book the rest against the
      // ingredient directly at its current weighted-average cost.
      await tx.stockMovement.create({
        data: {
          branchId,
          ingredientId,
          type: opts.type,
          quantity: -remaining,
          stockBefore: balance,
          stockAfter: round3(balance - remaining),
          note: opts.note,
          createdById: opts.userId,
          orderId: opts.orderId,
        },
      });
      balance = round3(balance - remaining);
      portions.push({
        batchId: null,
        quantity: remaining,
        unitCost: Number(ingredient.costPerUnit),
      });
    }

    await tx.ingredient.update({
      where: { id: ingredientId },
      data: {
        currentStock: round3(Number(ingredient.currentStock) - quantity),
      },
    });

    return portions;
  }

  // Compensating entry for sold units that physically came back. Never edits
  // or deletes the original CONSUMPTION rows: it appends REVERSAL movements,
  // returns quantity to the batches the sale drew from, and is capped at what
  // the order consumed minus what earlier reversals already restored.
  async restoreStock(
    tx: Tx,
    branchId: string,
    ingredientId: string,
    quantity: number,
    opts: { userId: string; orderId: string; note?: string },
  ): Promise<number> {
    await tx.$queryRaw`SELECT id FROM ingredients WHERE id = ${ingredientId} FOR UPDATE`;
    const ingredient = await tx.ingredient.findFirst({
      where: { id: ingredientId, branchId },
    });
    if (!ingredient) throw new NotFoundException('Ingredient not found');

    const moves = await tx.stockMovement.findMany({
      where: { orderId: opts.orderId, ingredientId },
      orderBy: { createdAt: 'asc' },
    });
    const consumed = moves
      .filter((m) => m.type === 'CONSUMPTION')
      .reduce((sum, m) => sum + -Number(m.quantity), 0);
    const reversed = moves
      .filter((m) => m.type === 'REVERSAL')
      .reduce((sum, m) => sum + Number(m.quantity), 0);
    let remaining = round3(Math.min(quantity, consumed - reversed));
    if (remaining <= 0) return 0;
    const restored = remaining;
    let balance = Number(ingredient.currentStock);

    // Put units back onto the batch each came from (newest batch first), never
    // exceeding what that batch gave up minus what earlier reversals returned.
    const room = new Map<string | null, number>();
    for (const m of moves) {
      const key = m.batchId;
      if (m.type === 'CONSUMPTION') {
        room.set(key, round3((room.get(key) ?? 0) + -Number(m.quantity)));
      } else if (m.type === 'REVERSAL') {
        room.set(key, round3((room.get(key) ?? 0) - Number(m.quantity)));
      }
    }
    for (const [batchId, available] of [...room.entries()].reverse()) {
      if (remaining <= 0) break;
      const back = Math.min(remaining, available);
      if (back <= 0) continue;
      if (batchId) {
        const batch = await tx.stockBatch.findUnique({
          where: { id: batchId },
        });
        if (batch) {
          await tx.stockBatch.update({
            where: { id: batch.id },
            data: {
              quantityRemaining: round3(Number(batch.quantityRemaining) + back),
            },
          });
        }
      }
      await tx.stockMovement.create({
        data: {
          branchId,
          ingredientId,
          batchId,
          type: 'REVERSAL',
          quantity: back,
          stockBefore: balance,
          stockAfter: round3(balance + back),
          note: opts.note,
          createdById: opts.userId,
          orderId: opts.orderId,
        },
      });
      balance = round3(balance + back);
      remaining = round3(remaining - back);
    }

    await tx.ingredient.update({
      where: { id: ingredientId },
      data: {
        currentStock: round3(Number(ingredient.currentStock) + restored),
      },
    });
    return restored;
  }

  // Manual correction (stocktake variance, data-entry fix) — NOT for
  // receiving stock (use a GRN, which carries cost/batch/supplier info) or
  // wasting stock (use the waste log, which carries a reason). This is the
  // narrow escape hatch for "the physical count doesn't match the system."
  async adjustStock(
    branchId: string,
    userId: string,
    ingredientId: string,
    dto: StockAdjustmentDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM ingredients WHERE id = ${ingredientId} FOR UPDATE`;
      const ingredient = await tx.ingredient.findFirst({
        where: { id: ingredientId, branchId },
      });
      if (!ingredient) throw new NotFoundException('Ingredient not found');

      const newStock = round3(Number(ingredient.currentStock) + dto.quantity);
      if (newStock < 0) {
        throw new BadRequestException('Adjustment would take stock below zero');
      }
      const reserved = await tx.stockReservation.aggregate({
        where: { branchId, ingredientId, status: 'RESERVED' },
        _sum: { quantity: true },
      });
      if (newStock < Number(reserved._sum.quantity ?? 0)) {
        throw new BadRequestException(
          'Adjustment would reduce stock below the quantity reserved for kitchen orders',
        );
      }

      await tx.ingredient.update({
        where: { id: ingredientId },
        data: { currentStock: newStock },
      });

      // Negative stocktake corrections must also reduce the FIFO batches;
      // otherwise future receipts/sales can consume quantities that were
      // already counted out of the physical stock. Positive corrections stay
      // unbatched because they do not represent a supplier receipt/known lot.
      const movements: StockMovement[] = [];
      let remaining = round3(Math.max(0, -dto.quantity));
      let balance = Number(ingredient.currentStock);
      if (remaining > 0) {
        const batches = await tx.stockBatch.findMany({
          where: { branchId, ingredientId, quantityRemaining: { gt: 0 } },
          orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
        });
        for (const batch of batches) {
          if (remaining <= 0) break;
          const adjusted = Math.min(remaining, Number(batch.quantityRemaining));
          await tx.stockBatch.update({
            where: { id: batch.id },
            data: {
              quantityRemaining: round3(
                Number(batch.quantityRemaining) - adjusted,
              ),
            },
          });
          movements.push(
            await tx.stockMovement.create({
              data: {
                branchId,
                ingredientId,
                batchId: batch.id,
                type: 'ADJUSTMENT',
                quantity: -adjusted,
                stockBefore: balance,
                stockAfter: round3(balance - adjusted),
                note: dto.note,
                createdById: userId,
              },
            }),
          );
          balance = round3(balance - adjusted);
          remaining = round3(remaining - adjusted);
        }
      }

      // This entry also captures positive adjustments and any amount not
      // represented by a received batch.
      if (dto.quantity > 0 || remaining > 0) {
        const delta = dto.quantity > 0 ? dto.quantity : -remaining;
        movements.push(
          await tx.stockMovement.create({
            data: {
              branchId,
              ingredientId,
              type: 'ADJUSTMENT',
              quantity: delta,
              stockBefore: balance,
              stockAfter: round3(balance + delta),
              note: dto.note,
              createdById: userId,
            },
          }),
        );
      }
      return movements;
    });
  }
}
