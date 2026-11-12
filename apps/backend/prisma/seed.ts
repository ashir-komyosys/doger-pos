import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  STAFF_ROLES,
} from '@nodedr-restaurant/types';

// Deliberately not imported from src/modules/orders/pricing — the runtime
// image only ships apps/backend/dist + prisma (see ARCHITECTURE.md /
// install.sh packaging notes), so `src/` doesn't exist to import from once
// this script runs via a container's `npx ts-node prisma/seed.ts`. Same
// tax-inclusive math as OrdersService.priceLine, kept tiny and duplicated
// on purpose rather than reaching across that packaging boundary.
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function priceLine(
  quantity: number,
  unitPriceInclusive: number,
  taxRatePercent: number,
) {
  const lineTotal = round2(unitPriceInclusive * quantity);
  const rate = taxRatePercent / 100;
  const taxAmount = rate > 0 ? round2(lineTotal - lineTotal / (1 + rate)) : 0;
  return { lineTotal, taxAmount };
}

const prisma = new PrismaClient();

function assertLocalSeedTarget() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required before seeding.');
  }

  const hostname = new URL(connectionString).hostname.toLowerCase();
  const localDatabaseHosts = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    'postgres',
    'db',
  ]);

  if (
    !localDatabaseHosts.has(hostname) &&
    process.env.ALLOW_REMOTE_SEED !== 'true'
  ) {
    throw new Error(
      'Refusing to seed a remote database. Set ALLOW_REMOTE_SEED=true only when you intentionally want sample data in that database.',
    );
  }
}

async function main() {
  assertLocalSeedTarget();
  console.log('Seeding permissions...');
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { label: permission.label, category: permission.category },
      create: permission,
    });
  }
  const allPermissions = await prisma.permission.findMany();
  const permissionByKey = new Map(allPermissions.map((p) => [p.key, p]));

  console.log('Creating demo restaurant + branch...');
  const restaurant = await prisma.restaurant.upsert({
    where: { id: 'demo-restaurant' },
    update: {
      name: "Dogar's Fire & Flavour",
      currency: 'PKR',
      timezone: 'Asia/Karachi',
    },
    create: {
      id: 'demo-restaurant',
      name: "Dogar's Fire & Flavour",
      currency: 'PKR',
      timezone: 'Asia/Karachi',
    },
  });

  const branch = await prisma.branch.upsert({
    where: { id: 'demo-branch' },
    update: {
      country: 'PK',
      taxRegime: 'CUSTOM',
      taxMode: 'INCLUSIVE',
      isStoreOpen: true,
    },
    create: {
      id: 'demo-branch',
      restaurantId: restaurant.id,
      name: 'Main Branch',
      country: 'PK',
      taxRegime: 'CUSTOM',
      taxMode: 'INCLUSIVE',
    },
  });

  console.log('Seeding roles...');
  const roleByName = new Map<string, string>();
  for (const roleName of STAFF_ROLES) {
    const role = await prisma.role.upsert({
      where: {
        restaurantId_name: { restaurantId: restaurant.id, name: roleName },
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        name: roleName,
        label: roleName.replace(/_/g, ' '),
      },
    });
    roleByName.set(roleName, role.id);

    const grantedKeys = DEFAULT_ROLE_PERMISSIONS[roleName];
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: grantedKeys
        .map((key) => permissionByKey.get(key))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
    });
  }

  console.log(
    'Creating demo owner user (login: owner@demo.local / password: Password123!)...',
  );
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const pinHash = await bcrypt.hash('1234', 12);
  const ownerRoleId = roleByName.get('OWNER')!;

  const owner = await prisma.user.upsert({
    where: {
      restaurantId_email: {
        restaurantId: restaurant.id,
        email: 'owner@demo.local',
      },
    },
    update: {},
    create: {
      restaurantId: restaurant.id,
      roleId: ownerRoleId,
      name: 'Demo Owner',
      email: 'owner@demo.local',
      passwordHash,
      pinHash,
    },
  });

  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: owner.id, branchId: branch.id } },
    update: {},
    create: { userId: owner.id, branchId: branch.id },
  });

  console.log('Seeding floor + tables...');
  const floor = await prisma.floor.upsert({
    where: { id: 'demo-floor' },
    update: {},
    create: { id: 'demo-floor', branchId: branch.id, name: 'Ground Floor' },
  });

  for (let i = 1; i <= 8; i++) {
    await prisma.table.upsert({
      where: { floorId_number: { floorId: floor.id, number: String(i) } },
      update: {},
      create: {
        floorId: floor.id,
        number: String(i),
        name: `Table ${i}`,
        capacity: i % 3 === 0 ? 6 : 4,
        posX: ((i - 1) % 4) * 120 + 20,
        posY: Math.floor((i - 1) / 4) * 120 + 20,
      },
    });
  }

  console.log('Seeding kitchen stations + menu...');
  const mainKitchen = await prisma.kitchenStation.upsert({
    where: { id: 'demo-station-main' },
    update: {},
    create: {
      id: 'demo-station-main',
      branchId: branch.id,
      name: 'Main Kitchen',
    },
  });
  const bar = await prisma.kitchenStation.upsert({
    where: { id: 'demo-station-bar' },
    update: {},
    create: { id: 'demo-station-bar', branchId: branch.id, name: 'Bar' },
  });

  const burgers = await prisma.menuCategory.upsert({
    where: { id: 'demo-cat-starters' },
    update: { name: 'Burgers', sortOrder: 0 },
    create: {
      id: 'demo-cat-starters',
      branchId: branch.id,
      name: 'Burgers',
      sortOrder: 0,
    },
  });
  const bbq = await prisma.menuCategory.upsert({
    where: { id: 'demo-cat-mains' },
    update: { name: 'BBQ', sortOrder: 1 },
    create: {
      id: 'demo-cat-mains',
      branchId: branch.id,
      name: 'BBQ',
      sortOrder: 1,
    },
  });
  const drinks = await prisma.menuCategory.upsert({
    where: { id: 'demo-cat-drinks' },
    update: { name: 'Drinks', sortOrder: 4 },
    create: {
      id: 'demo-cat-drinks',
      branchId: branch.id,
      name: 'Drinks',
      sortOrder: 4,
    },
  });

  const pizza = await prisma.menuCategory.upsert({
    where: { id: 'dogars-cat-pizza' },
    update: { name: 'Pizza', sortOrder: 2, isActive: true },
    create: {
      id: 'dogars-cat-pizza',
      branchId: branch.id,
      name: 'Pizza',
      sortOrder: 2,
    },
  });
  const sides = await prisma.menuCategory.upsert({
    where: { id: 'dogars-cat-sides' },
    update: { name: 'Sides', sortOrder: 3, isActive: true },
    create: {
      id: 'dogars-cat-sides',
      branchId: branch.id,
      name: 'Sides',
      sortOrder: 3,
    },
  });
  const wraps = await prisma.menuCategory.upsert({
    where: { id: 'dogars-cat-wraps' },
    update: { name: 'Wraps', sortOrder: 5, isActive: true },
    create: {
      id: 'dogars-cat-wraps',
      branchId: branch.id,
      name: 'Wraps',
      sortOrder: 5,
    },
  });
  const deals = await prisma.menuCategory.upsert({
    where: { id: 'dogars-cat-deals' },
    update: { name: 'Deals', sortOrder: 6, isActive: true },
    create: {
      id: 'dogars-cat-deals',
      branchId: branch.id,
      name: 'Deals',
      sortOrder: 6,
    },
  });

  const crustGroup = await prisma.modifierGroup.upsert({
    where: { id: 'demo-mg-crust' },
    update: {},
    create: {
      id: 'demo-mg-crust',
      branchId: branch.id,
      name: 'Crust Type',
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      modifiers: {
        connectOrCreate: [
          {
            where: { id: 'demo-mod-thin' },
            create: {
              id: 'demo-mod-thin',
              name: 'Thin Crust',
              priceAdjustment: 0,
              isDefault: true,
            },
          },
          {
            where: { id: 'demo-mod-thick' },
            create: {
              id: 'demo-mod-thick',
              name: 'Thick Crust',
              priceAdjustment: 0,
            },
          },
          {
            where: { id: 'demo-mod-cheese' },
            create: {
              id: 'demo-mod-cheese',
              name: 'Extra Cheese',
              priceAdjustment: 60,
            },
          },
        ],
      },
    },
  });

  const spiceGroup = await prisma.modifierGroup.upsert({
    where: { id: 'dogars-mg-spice' },
    update: { name: 'Spice Level', minSelect: 0, maxSelect: 1, isRequired: false },
    create: {
      id: 'dogars-mg-spice',
      branchId: branch.id,
      name: 'Spice Level',
      minSelect: 0,
      maxSelect: 1,
      isRequired: false,
    },
  });
  for (const [id, name, sortOrder] of [
    ['dogars-spice-bland', 'Bland', 0],
    ['dogars-spice-mild', 'Mild', 1],
    ['dogars-spice-normal', 'Normal', 2],
    ['dogars-spice-hot', 'Hot', 3],
  ] as const) {
    await prisma.modifier.upsert({
      where: { id },
      update: { name, sortOrder },
      create: { id, groupId: spiceGroup.id, name, sortOrder },
    });
  }

  const demoItems: {
    id: string;
    name: string;
    categoryId: string;
    stationId: string;
    price: number;
    taxRatePercent: number;
    isVeg: boolean;
    modifierGroupIds?: string[];
    description: string;
  }[] = [
    {
      id: 'demo-item-chicken-65',
      name: 'Fire Zinger',
      categoryId: burgers.id,
      stationId: mainKitchen.id,
      price: 590,
      taxRatePercent: 0,
      isVeg: false,
      modifierGroupIds: [spiceGroup.id],
      description: 'Crispy chicken burger with signature Fire sauce.',
    },
    {
      id: 'demo-item-paneer-tikka',
      name: 'Beef Smash',
      categoryId: burgers.id,
      stationId: mainKitchen.id,
      price: 790,
      taxRatePercent: 0,
      isVeg: false,
      modifierGroupIds: [spiceGroup.id],
      description: 'Double beef patty, melted cheese and house sauce.',
    },
    {
      id: 'demo-item-margherita',
      name: 'Fajita Pizza',
      categoryId: pizza.id,
      stationId: mainKitchen.id,
      price: 1290,
      taxRatePercent: 0,
      isVeg: false,
      modifierGroupIds: [crustGroup.id, spiceGroup.id],
      description: 'Chicken fajita, peppers and mozzarella on fresh dough.',
    },
    {
      id: 'demo-item-butter-chicken',
      name: 'Malai Boti',
      categoryId: bbq.id,
      stationId: mainKitchen.id,
      price: 890,
      taxRatePercent: 0,
      isVeg: false,
      modifierGroupIds: [spiceGroup.id],
      description: 'Creamy, tender chicken boti grilled over charcoal.',
    },
    {
      id: 'demo-item-mojito',
      name: 'Mint Margarita',
      categoryId: drinks.id,
      stationId: bar.id,
      price: 290,
      taxRatePercent: 0,
      isVeg: true,
      description: 'Fresh mint, lime and a sparkling citrus finish.',
    },
    {
      id: 'demo-item-cola',
      name: 'Loaded Fries',
      categoryId: sides.id,
      stationId: mainKitchen.id,
      price: 490,
      taxRatePercent: 0,
      isVeg: true,
      modifierGroupIds: [spiceGroup.id],
      description: 'Golden fries topped with cheese and house sauce.',
    },
    {
      id: 'dogars-item-chicken-tikka',
      name: 'Chicken Tikka',
      categoryId: bbq.id,
      stationId: mainKitchen.id,
      price: 650,
      taxRatePercent: 0,
      isVeg: false,
      modifierGroupIds: [spiceGroup.id],
      description: 'Charcoal-grilled chicken with a smoky tikka marinade.',
    },
    {
      id: 'dogars-item-chicken-wrap',
      name: 'Chicken Wrap',
      categoryId: wraps.id,
      stationId: mainKitchen.id,
      price: 550,
      taxRatePercent: 0,
      isVeg: false,
      modifierGroupIds: [spiceGroup.id],
      description: 'Grilled chicken and crisp salad in a soft wrap.',
    },
    {
      id: 'dogars-item-bbq-platter',
      name: 'BBQ Platter',
      categoryId: bbq.id,
      stationId: mainKitchen.id,
      price: 2190,
      taxRatePercent: 0,
      isVeg: false,
      modifierGroupIds: [spiceGroup.id],
      description: 'A shareable selection of charcoal-grilled favourites.',
    },
    {
      id: 'dogars-item-family-deal',
      name: 'Family Fire Deal',
      categoryId: deals.id,
      stationId: mainKitchen.id,
      price: 2490,
      taxRatePercent: 0,
      isVeg: false,
      modifierGroupIds: [spiceGroup.id],
      description: 'A family-size mix of burgers, sides and drinks.',
    },
  ];

  for (const item of demoItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {
        branchId: branch.id,
        categoryId: item.categoryId,
        stationId: item.stationId,
        name: item.name,
        description: item.description,
        price: item.price,
        taxRatePercent: item.taxRatePercent,
        isVeg: item.isVeg,
        isHalal: true,
        isActive: true,
      },
      create: {
        id: item.id,
        branchId: branch.id,
        categoryId: item.categoryId,
        stationId: item.stationId,
        name: item.name,
        description: item.description,
        price: item.price,
        taxRatePercent: item.taxRatePercent,
        isVeg: item.isVeg,
        isHalal: true,
      },
    });
    for (const modifierGroupId of item.modifierGroupIds ?? []) {
      await prisma.menuItemModifierGroup.upsert({
        where: {
          menuItemId_modifierGroupId: {
            menuItemId: item.id,
            modifierGroupId,
          },
        },
        update: {},
        create: { menuItemId: item.id, modifierGroupId },
      });
    }
  }

  console.log('Seeding takeaway demo orders...');
  const itemById = new Map(demoItems.map((i) => [i.id, i]));

  const demoOrders: {
    id: string;
    orderNumber: string;
    paid: boolean;
    lines: { itemId: string; quantity: number }[];
  }[] = [
    {
      // Phoned in, sent to the kitchen, still waiting for pickup — shows up
      // live on the Kitchen Display with no table attached.
      id: 'demo-order-takeaway-1',
      orderNumber: 'TA-DEMO-0001',
      paid: false,
      lines: [
        { itemId: 'demo-item-chicken-65', quantity: 1 },
        { itemId: 'demo-item-cola', quantity: 2 },
      ],
    },
    {
      // Already picked up and paid — shows takeaway flowing all the way
      // through checkout, not just the kitchen side.
      id: 'demo-order-takeaway-2',
      orderNumber: 'TA-DEMO-0002',
      paid: true,
      lines: [
        { itemId: 'demo-item-butter-chicken', quantity: 1 },
        { itemId: 'demo-item-cola', quantity: 1 },
      ],
    },
  ];

  for (const demoOrder of demoOrders) {
    const lines = demoOrder.lines.map((line) => {
      const item = itemById.get(line.itemId)!;
      const priced = priceLine(line.quantity, item.price, item.taxRatePercent);
      return { item, quantity: line.quantity, priced };
    });
    const subtotal = round2(
      lines.reduce((sum, l) => sum + l.priced.lineTotal, 0),
    );
    const taxAmount = round2(
      lines.reduce((sum, l) => sum + l.priced.taxAmount, 0),
    );
    const itemStatus = demoOrder.paid ? 'SERVED' : 'NEW';

    const order = await prisma.order.upsert({
      where: { id: demoOrder.id },
      update: {},
      create: {
        id: demoOrder.id,
        branchId: branch.id,
        orderNumber: demoOrder.orderNumber,
        type: 'TAKEAWAY',
        status: demoOrder.paid ? 'PAID' : 'OPEN',
        createdById: owner.id,
        subtotal,
        taxAmount,
        totalAmount: subtotal,
        billedAt: demoOrder.paid ? new Date() : null,
        ...(demoOrder.paid
          ? { payments: { create: [{ method: 'CASH', amount: subtotal }] } }
          : {}),
      },
    });

    const itemsByStation = new Map<string | null, { id: string }[]>();
    for (const [idx, line] of lines.entries()) {
      const orderItem = await prisma.orderItem.upsert({
        where: { id: `${demoOrder.id}-item-${idx}` },
        update: {},
        create: {
          id: `${demoOrder.id}-item-${idx}`,
          orderId: order.id,
          menuItemId: line.item.id,
          nameSnapshot: line.item.name,
          unitPriceSnapshot: line.item.price,
          taxRateSnapshot: line.item.taxRatePercent,
          quantity: line.quantity,
          lineTotal: line.priced.lineTotal,
          status: itemStatus,
        },
      });
      const bucket = itemsByStation.get(line.item.stationId) ?? [];
      bucket.push({ id: orderItem.id });
      itemsByStation.set(line.item.stationId, bucket);
    }

    let ticketSeq = 1;
    for (const [stationId, items] of itemsByStation) {
      const kot = await prisma.kot.upsert({
        where: { id: `${demoOrder.id}-kot-${ticketSeq}` },
        update: {},
        create: {
          id: `${demoOrder.id}-kot-${ticketSeq}`,
          orderId: order.id,
          stationId: stationId ?? undefined,
          ticketNumber: `${demoOrder.orderNumber}-${ticketSeq}`,
          status: itemStatus,
          ...(demoOrder.paid
            ? {
                acceptedAt: new Date(),
                readyAt: new Date(),
                servedAt: new Date(),
              }
            : {}),
        },
      });
      ticketSeq += 1;
      for (const item of items) {
        await prisma.kotItem.upsert({
          where: { id: `${kot.id}-${item.id}` },
          update: {},
          create: {
            id: `${kot.id}-${item.id}`,
            kotId: kot.id,
            orderItemId: item.id,
            status: itemStatus,
          },
        });
      }
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
