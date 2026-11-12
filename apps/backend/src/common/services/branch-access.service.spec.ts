import { ForbiddenException } from '@nestjs/common';
import type { SessionUser } from '@nodedr-restaurant/types';
import { BranchAccessService } from './branch-access.service';

const user = (
  roleName: string,
): Pick<SessionUser, 'id' | 'restaurantId' | 'roleName'> => ({
  id: 'user-1',
  restaurantId: 'restaurant-1',
  roleName,
});

describe('BranchAccessService', () => {
  const createService = () => {
    const prisma = { branch: { findFirst: jest.fn() } };
    return {
      service: new BranchAccessService(prisma as never),
      findFirst: prisma.branch.findFirst,
    };
  };

  it.each(['OWNER', 'ADMINISTRATOR'])(
    '%s can access any active branch in their restaurant',
    async (roleName) => {
      const { service, findFirst } = createService();
      findFirst.mockResolvedValue({ id: 'branch-1' });

      await expect(
        service.assertAccess(user(roleName), 'branch-1'),
      ).resolves.toBeUndefined();
      expect(findFirst).toHaveBeenCalledWith({
        where: {
          id: 'branch-1',
          restaurantId: 'restaurant-1',
          isActive: true,
        },
        select: { id: true },
      });
    },
  );

  it('limits other staff to branches assigned to their account', async () => {
    const { service, findFirst } = createService();
    findFirst.mockResolvedValue({ id: 'branch-1' });

    await service.assertAccess(user('CASHIER'), 'branch-1');

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'branch-1',
        restaurantId: 'restaurant-1',
        isActive: true,
        users: { some: { userId: 'user-1' } },
      },
      select: { id: true },
    });
  });

  it('rejects inactive or unassigned branches', async () => {
    const { service, findFirst } = createService();
    findFirst.mockResolvedValue(null);

    await expect(
      service.assertAccess(user('CASHIER'), 'branch-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
