import { ForbiddenException, Injectable } from '@nestjs/common';
import type { SessionUser } from '@nodedr-restaurant/types';
import { PrismaService } from '../../prisma/prisma.service';

export function hasFullBranchAccess(roleName: string): boolean {
  return roleName === 'OWNER' || roleName === 'ADMINISTRATOR';
}

@Injectable()
export class BranchAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAccess(
    user: Pick<SessionUser, 'id' | 'restaurantId' | 'roleName'>,
    branchId: string,
  ): Promise<void> {
    const canAccessAllBranches = hasFullBranchAccess(user.roleName);
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        restaurantId: user.restaurantId,
        isActive: true,
        ...(!canAccessAllBranches
          ? { users: { some: { userId: user.id } } }
          : {}),
      },
      select: { id: true },
    });
    if (!branch) {
      throw new ForbiddenException('Branch not found or not accessible');
    }
  }
}
