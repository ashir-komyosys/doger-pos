import { StockService } from './stock.service';

describe('StockService.adjustStock', () => {
  const createService = (options: {
    currentStock: number;
    batches?: { id: string; quantityRemaining: number }[];
    reserved?: number;
  }) => {
    const createdMovements: Record<string, unknown>[] = [];
    const tx = {
      $queryRaw: jest.fn(),
      ingredient: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'ingredient-1',
          currentStock: options.currentStock,
        }),
        update: jest.fn(),
      },
      stockReservation: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { quantity: options.reserved ?? 0 },
        }),
      },
      stockBatch: {
        findMany: jest.fn().mockResolvedValue(options.batches ?? []),
        update: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          createdMovements.push(data);
          return data;
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    return {
      service: new StockService(prisma as never),
      tx,
      createdMovements,
    };
  };

  it('reduces FIFO batches for a negative stocktake adjustment', async () => {
    const { service, tx, createdMovements } = createService({
      currentStock: 10,
      batches: [
        { id: 'oldest', quantityRemaining: 2 },
        { id: 'newer', quantityRemaining: 5 },
      ],
    });

    await service.adjustStock('branch-1', 'user-1', 'ingredient-1', {
      quantity: -6,
      note: 'Physical count',
    });

    expect(tx.stockBatch.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'oldest' },
      data: { quantityRemaining: 0 },
    });
    expect(tx.stockBatch.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'newer' },
      data: { quantityRemaining: 1 },
    });
    expect(
      createdMovements.map(({ batchId, quantity }) => [batchId, quantity]),
    ).toEqual([
      ['oldest', -2],
      ['newer', -4],
    ]);
  });

  it('records positive stocktake additions without inventing a supplier batch', async () => {
    const { service, tx, createdMovements } = createService({
      currentStock: 4,
    });

    await service.adjustStock('branch-1', 'user-1', 'ingredient-1', {
      quantity: 3,
      note: 'Physical count',
    });

    expect(tx.stockBatch.findMany).not.toHaveBeenCalled();
    expect(createdMovements).toEqual([
      expect.objectContaining({
        type: 'ADJUSTMENT',
        quantity: 3,
      }),
    ]);
    expect(createdMovements[0]).not.toHaveProperty('batchId');
  });
});
