import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { PublicWebsiteOrderDto } from '@nodedr-restaurant/types';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { PublicMenuService } from './public-menu.service';

const MAX_ORDER_ATTEMPTS = 3;

/**
 * Public customer website: a guest browses the branch's public menu and
 * places an order for takeaway or delivery. Reached only through the
 * branch's opaque publicToken (Settings > Public website). Orders arrive
 * as channel ONLINE with acceptance PENDING, so staff must accept them on
 * the KDS before they reach the kitchen. Prices, modifiers and tax are all
 * recomputed by OrdersService (the same code the POS uses); nothing the
 * client sends is trusted for money.
 */
@Injectable()
export class PublicWebsiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly publicMenu: PublicMenuService,
    private readonly jwt: JwtService,
  ) {}

  private async resolveBranch(publicToken: string) {
    if (!/^[a-f0-9]{32}$/.test(publicToken)) {
      throw new NotFoundException('This website is not available');
    }
    const branch = await this.prisma.branch.findUnique({
      where: { publicToken },
      include: { restaurant: true },
    });
    if (!branch || !branch.isActive) {
      throw new NotFoundException('This website is not available');
    }
    return branch;
  }

  async registerCustomer(publicToken: string, data: { name: string; email: string; password: string }) {
    const branch = await this.resolveBranch(publicToken);
    const email = data.email.trim().toLowerCase();
    if (await this.prisma.publicCustomerAccount.findUnique({ where: { branchId_email: { branchId: branch.id, email } } })) {
      throw new BadRequestException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(data.password, 12);
    try {
      const account = await this.prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({ data: { branchId: branch.id, name: data.name.trim(), email } });
        return tx.publicCustomerAccount.create({ data: { branchId: branch.id, customerId: customer.id, email, passwordHash }, include: { customer: true } });
      });
      return { token: await this.issueCustomerToken(account.id), user: { name: account.customer.name, email } };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('An account with this email already exists');
      throw error;
    }
  }

  async loginCustomer(publicToken: string, data: { email: string; password: string }) {
    const branch = await this.resolveBranch(publicToken);
    const account = await this.prisma.publicCustomerAccount.findUnique({ where: { branchId_email: { branchId: branch.id, email: data.email.trim().toLowerCase() } }, include: { customer: true } });
    if (!account || !(await bcrypt.compare(data.password, account.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    return { token: await this.issueCustomerToken(account.id), user: { name: account.customer.name, email: account.email } };
  }

  async getCustomerSession(publicToken: string, token: string) {
    const branch = await this.resolveBranch(publicToken);
    const payload = await this.verifyCustomerToken(token);
    const account = await this.prisma.publicCustomerAccount.findFirst({ where: { id: payload.sub, branchId: branch.id }, include: { customer: true } });
    if (!account) throw new UnauthorizedException('Session expired');
    return { name: account.customer.name, email: account.email };
  }

  async createCustomerOrder(publicToken: string, token: string, dto: { clientRequestId: string; type: 'TAKEAWAY' | 'DELIVERY'; phone: string; delivery?: { address: string; pincode: string; phone: string }; items: PublicWebsiteOrderDto['items'] }) {
    const branch = await this.resolveBranch(publicToken);
    const payload = await this.verifyCustomerToken(token);
    const account = await this.prisma.publicCustomerAccount.findFirst({ where: { id: payload.sub, branchId: branch.id }, include: { customer: true } });
    if (!account) throw new UnauthorizedException('Session expired');
    await this.prisma.customer.update({ where: { id: account.customerId }, data: { phone: dto.phone.trim(), ...(dto.type === 'DELIVERY' ? { address: dto.delivery?.address } : {}) } });
    return this.createOrder(publicToken, { ...dto, guestName: account.customer.name ?? account.email, delivery: dto.type === 'DELIVERY' && dto.delivery ? { ...dto.delivery, phone: dto.phone } : undefined }, account.customerId);
  }

  private issueCustomerToken(accountId: string) { return this.jwt.signAsync({ sub: accountId, aud: 'storefront-customer' }, { expiresIn: '12h' }); }
  private async verifyCustomerToken(token: string): Promise<{ sub: string }> {
    try {
      return await this.jwt.verifyAsync(token, { audience: 'storefront-customer' });
    } catch {
      throw new UnauthorizedException('Please sign in to continue');
    }
  }

  async getMenu(publicToken: string) {
    const branch = await this.resolveBranch(publicToken);
    const categories = await this.publicMenu.menuCategoriesForBranch(branch.id);
    return {
      restaurantName: branch.restaurant.name,
      branchName: branch.name,
      isStoreOpen: branch.isStoreOpen,
      logoUrl: branch.restaurant.logoUrl ?? null,
      currency: branch.restaurant.currency,
      // Only categories with at least one public item are worth showing.
      categories: categories.filter((c) => c.items.length > 0),
    };
  }

  async listJournal(publicToken: string) {
    const branch = await this.resolveBranch(publicToken);
    return this.prisma.blogPost.findMany({
      where: { branchId: branch.id, status: 'PUBLISHED' },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 24,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImageUrl: true,
        seoTitle: true,
        seoDescription: true,
        publishedAt: true,
      },
    });
  }

  async getJournalArticle(publicToken: string, slug: string) {
    const branch = await this.resolveBranch(publicToken);
    const article = await this.prisma.blogPost.findFirst({
      where: { branchId: branch.id, slug, status: 'PUBLISHED' },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        coverImageUrl: true,
        seoTitle: true,
        seoDescription: true,
        publishedAt: true,
      },
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async createOrder(publicToken: string, dto: PublicWebsiteOrderDto, customerId?: string) {
    const branch = await this.resolveBranch(publicToken);

    // Retry of a submit we already completed: hand back the same order.
    const existing = await this.findByRequestId(branch.id, dto.clientRequestId);
    if (existing) return this.present(existing, branch.restaurant.currency);

    // Delivery: the pincode must fall in one of this branch's active zones
    // and the item total must clear the zone minimum. The zone's fee/ETA
    // are snapshotted onto the order by OrdersService.createOrder.
    if (dto.type === 'DELIVERY' && !dto.delivery) {
      throw new BadRequestException(
        'Delivery orders need an address, pincode and phone',
      );
    }

    const createdById = await this.resolveActor(branch.id);

    for (let attempt = 1; ; attempt++) {
      try {
        const order = await this.ordersService.createOrder(
          branch.id,
          createdById,
          {
            type: dto.type,
            guestName: dto.guestName,
            ...(customerId ? { customerId } : {}),
            ...(dto.type === 'DELIVERY'
              ? {
                  delivery: {
                    address: dto.delivery!.address,
                    pincode: dto.delivery!.pincode,
                    phone: dto.delivery!.phone,
                  },
                }
              : {}),
            items: dto.items.map((i) => ({
              menuItemId: i.menuItemId,
              quantity: i.quantity,
              modifierIds: i.modifierIds,
            })),
          },
          // ONLINE channel => category visibility + guest modifier limits
          // are enforced. requireAcceptance => staff must accept on the KDS
          // before the kitchen prints tickets.
          { channel: 'ONLINE', requireAcceptance: true, clientRequestId: dto.clientRequestId },
        );
        return this.present(order, branch.restaurant.currency);
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          // Either a concurrent duplicate submit (same clientRequestId) ...
          const dup = await this.findByRequestId(branch.id, dto.clientRequestId);
          if (dup) return this.present(dup, branch.restaurant.currency);
          // ... or two orders racing for the same daily order number.
          if (attempt < MAX_ORDER_ATTEMPTS) continue;
        }
        throw err;
      }
    }
  }

  private findByRequestId(branchId: string, clientRequestId: string) {
    return this.prisma.order.findFirst({
      where: { branchId, clientRequestId },
      include: { items: true },
    });
  }

  // Order.createdById is a required FK and a website guest has no staff
  // login: attribute to the first staff member linked to the branch.
  private async resolveActor(branchId: string) {
    const link = await this.prisma.userBranch.findFirst({
      where: { branchId },
      orderBy: { userId: 'asc' },
    });
    if (!link) {
      throw new NotFoundException(
        'This branch has no staff to receive the order',
      );
    }
    return link.userId;
  }

  // Only what the confirmation screen needs: no ids, no staff, no payments.
  private present(
    order: {
      orderNumber: string;
      subtotal: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      totalAmount: Prisma.Decimal;
      createdAt: Date;
      items: {
        nameSnapshot: string;
        quantity: number;
        lineTotal: Prisma.Decimal;
      }[];
    },
    currency: string,
  ) {
    return {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      currency,
      items: order.items.map((i) => ({
        name: i.nameSnapshot,
        quantity: i.quantity,
        lineTotal: i.lineTotal.toString(),
      })),
      subtotal: order.subtotal.toString(),
      taxAmount: order.taxAmount.toString(),
      totalAmount: order.totalAmount.toString(),
      // Website orders are not paid on the website; payment is taken at
      // the counter (takeaway) or on delivery.
      paid: false,
    };
  }
}
