import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';

type CheckoutState = {
  order: {
    status: string;
    updatedAt: Date;
    acceptance: string;
    payments: { clientRequestId: string | null }[];
  };
  replay: boolean;
};

type CheckoutLock = {
  lockCheckoutState(
    tx: Prisma.TransactionClient,
    branchId: string,
    orderId: string,
    expectedUpdatedAt: Date,
    requestId?: string,
  ): Promise<CheckoutState>;
};

function serviceUnderTest() {
  const service = new OrdersService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return (service as unknown as CheckoutLock).lockCheckoutState.bind(service);
}

function transactionFor(order: CheckoutState['order'], calls: string[]) {
  return {
    $queryRaw: jest.fn(async () => calls.push('lock')),
    order: {
      findFirst: jest.fn(async () => {
        calls.push('read');
        return order;
      }),
    },
  } as unknown as Prisma.TransactionClient;
}

describe('checkout row locking', () => {
  const initialUpdatedAt = new Date('2026-10-01T10:00:00.000Z');

  it('locks the order row before reading current checkout state', async () => {
    const calls: string[] = [];
    const tx = transactionFor(
      {
        status: 'OPEN',
        updatedAt: initialUpdatedAt,
        acceptance: 'ACCEPTED',
        payments: [],
      },
      calls,
    );

    const result = await serviceUnderTest()(
      tx,
      'branch-1',
      'order-1',
      initialUpdatedAt,
    );

    expect(calls).toEqual(['lock', 'read']);
    expect(result.replay).toBe(false);
  });

  it('rejects a stale partial payment after another payment changed the bill', async () => {
    const tx = transactionFor(
      {
        status: 'OPEN',
        updatedAt: new Date('2026-10-01T10:01:00.000Z'),
        acceptance: 'ACCEPTED',
        payments: [{ clientRequestId: 'another-cashier-request' }],
      },
      [],
    );

    await expect(
      serviceUnderTest()(
        tx,
        'branch-1',
        'order-1',
        initialUpdatedAt,
        'my-request',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('returns an idempotent replay even after the first request paid the order', async () => {
    const tx = transactionFor(
      {
        status: 'PAID',
        updatedAt: new Date('2026-10-01T10:01:00.000Z'),
        acceptance: 'ACCEPTED',
        payments: [{ clientRequestId: 'same-request' }],
      },
      [],
    );

    const result = await serviceUnderTest()(
      tx,
      'branch-1',
      'order-1',
      initialUpdatedAt,
      'same-request',
    );

    expect(result.replay).toBe(true);
  });
});
