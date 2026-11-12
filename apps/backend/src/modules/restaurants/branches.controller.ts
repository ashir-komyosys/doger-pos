import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionUser } from '@nodedr-restaurant/types';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { hasFullBranchAccess } from '../../common/services/branch-access.service';
import { PrismaService } from '../../prisma/prisma.service';

// Roles that run the whole restaurant see every branch of it; everyone else
// sees only the branches they were assigned to (UserBranch).
@ApiTags('branches')
@Controller('v1/branches')
export class BranchesController {
  constructor(private readonly prisma: PrismaService) {}

  private async findAccessibleBranch(user: SessionUser, branchId: string) {
    const wholeRestaurant = hasFullBranchAccess(user.roleName);
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        restaurantId: user.restaurantId,
        isActive: true,
        ...(!wholeRestaurant ? { users: { some: { userId: user.id } } } : {}),
      },
      select: { id: true, name: true, isStoreOpen: true },
    });
    if (!branch)
      throw new NotFoundException('Branch not found or not accessible');
    return branch;
  }

  @Auth()
  @Get(':branchId/store-status')
  async storeStatus(
    @CurrentUser() user: SessionUser,
    @Param('branchId') branchId: string,
  ) {
    const branch = await this.findAccessibleBranch(user, branchId);
    const [lastChange, openOrders, kitchenTickets, pendingOnlineOrders] =
      await Promise.all([
        this.prisma.storeStatusEvent.findFirst({
          where: { branchId },
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        }),
        this.prisma.order.count({
          where: { branchId, status: { in: ['OPEN', 'BILLED'] } },
        }),
        this.prisma.kot.count({
          where: {
            order: { branchId },
            status: { notIn: ['SERVED', 'CANCELLED'] },
          },
        }),
        this.prisma.order.count({
          where: { branchId, status: 'OPEN', acceptance: 'PENDING' },
        }),
      ]);
    return {
      ...branch,
      lastChange: lastChange
        ? {
            isOpen: lastChange.isOpen,
            reason: lastChange.reason,
            changedAt: lastChange.createdAt,
            changedBy: lastChange.user,
          }
        : null,
      outstanding: { openOrders, kitchenTickets, pendingOnlineOrders },
    };
  }

  @Auth('store.status.manage')
  @Patch(':branchId/store-status')
  async setStoreStatus(
    @CurrentUser() user: SessionUser,
    @Param('branchId') branchId: string,
    @Body() body: unknown,
  ) {
    const branch = await this.findAccessibleBranch(user, branchId);
    if (
      !body ||
      typeof body !== 'object' ||
      !('isOpen' in body) ||
      typeof body.isOpen !== 'boolean'
    ) {
      throw new BadRequestException('isOpen must be true or false');
    }
    const isOpen = body.isOpen;
    const rawReason = 'reason' in body ? body.reason : undefined;
    if (rawReason !== undefined && typeof rawReason !== 'string') {
      throw new BadRequestException('reason must be text');
    }
    const reason =
      typeof rawReason === 'string'
        ? rawReason.trim().slice(0, 500) || null
        : null;

    if (branch.isStoreOpen === isOpen) {
      return this.storeStatus(user, branchId);
    }
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.branch.updateMany({
        where: { id: branchId, isStoreOpen: branch.isStoreOpen },
        data: { isStoreOpen: isOpen },
      });
      if (changed.count === 0) return;
      await tx.storeStatusEvent.create({
        data: { branchId, userId: user.id, isOpen, reason },
      });
    });
    return this.storeStatus(user, branchId);
  }

  @Auth()
  @Get()
  listBranches(@CurrentUser() user: SessionUser) {
    const sees = hasFullBranchAccess(user.roleName)
      ? {}
      : { users: { some: { userId: user.id } } };
    return this.prisma.branch.findMany({
      where: { restaurantId: user.restaurantId, isActive: true, ...sees },
      orderBy: { name: 'asc' },
      include: { restaurant: { select: { currency: true } } },
    });
  }
}
