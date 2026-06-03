import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const admin = await prisma.user.upsert({
    where: { phone: '+919999999999' },
    update: {},
    create: {
      phone: '+919999999999',
      name: 'Admin',
      role: 'admin',
      status: 'active',
    },
  });
  console.log('Seeded admin:', admin.id, admin.phone);

  // Warehouse Manager user
  const warehouseMgr = await prisma.user.upsert({
    where: { phone: '+919999999998' },
    update: {},
    create: {
      phone: '+919999999998',
      name: 'Warehouse Manager',
      role: 'warehouse_mgr',
      status: 'active',
    },
  });
  console.log('Seeded warehouse_mgr:', warehouseMgr.id, warehouseMgr.phone);

  // Sales Rep user
  const rep = await prisma.user.upsert({
    where: { phone: '+919999999997' },
    update: {},
    create: {
      phone: '+919999999997',
      name: 'Sales Rep',
      role: 'rep',
      status: 'active',
      territory: 'Bangalore',
      state: 'Karnataka',
    },
  });
  console.log('Seeded rep:', rep.id, rep.phone);

  // Main Warehouse — use a deterministic ID so we can upsert by id
  const WAREHOUSE_ID = '00000000-0000-0000-0000-000000000001';
  const warehouse = await prisma.warehouse.upsert({
    where: { id: WAREHOUSE_ID },
    update: {},
    create: {
      id: WAREHOUSE_ID,
      name: 'Main Warehouse',
      state: 'Karnataka',
      lat: 12.9716,
      lng: 77.5946,
    },
  });
  console.log('Seeded warehouse:', warehouse.id, warehouse.name);

  // Assign warehouse_mgr to warehouse
  await prisma.userWarehouseAssignment.upsert({
    where: { userId_warehouseId: { userId: warehouseMgr.id, warehouseId: warehouse.id } },
    update: {},
    create: {
      userId: warehouseMgr.id,
      warehouseId: warehouse.id,
      assignedBy: admin.id,
      isActive: true,
    },
  });
  console.log('Assigned warehouse_mgr to warehouse');

  // Assign rep to warehouse
  await prisma.userWarehouseAssignment.upsert({
    where: { userId_warehouseId: { userId: rep.id, warehouseId: warehouse.id } },
    update: {},
    create: {
      userId: rep.id,
      warehouseId: warehouse.id,
      assignedBy: admin.id,
      isActive: true,
    },
  });
  console.log('Assigned rep to warehouse');

  // Product 1: Paddy Seeds Premium
  const product1 = await prisma.product.upsert({
    where: { id: 'product-paddy-seed' },
    update: {},
    create: {
      id: 'product-paddy-seed',
      name: 'Paddy Seeds Premium',
      category: 'seeds',
      regions: [],
    },
  });
  const variant1 = await prisma.productVariant.upsert({
    where: { sku: 'PAD-1KG' },
    update: {},
    create: {
      sku: 'PAD-1KG',
      productId: product1.id,
      unit: 'KG',
      price: 120,
      isActive: true,
    },
  });
  await prisma.stock.upsert({
    where: {
      variantId_warehouseId: {
        variantId: variant1.id,
        warehouseId: warehouse.id,
      },
    },
    update: {},
    create: {
      warehouseId: warehouse.id,
      variantId: variant1.id,
      physicalQty: 100,
      reservedQty: 0,
    },
  });
  console.log('Seeded product 1:', product1.name);

  // Product 2: Sunflower Seeds
  const product2 = await prisma.product.upsert({
    where: { id: 'product-sunflower-seed' },
    update: {},
    create: {
      id: 'product-sunflower-seed',
      name: 'Sunflower Seeds',
      category: 'seeds',
      regions: [],
    },
  });
  const variant2 = await prisma.productVariant.upsert({
    where: { sku: 'SUN-1KG' },
    update: {},
    create: {
      sku: 'SUN-1KG',
      productId: product2.id,
      unit: 'KG',
      price: 85,
      isActive: true,
    },
  });
  await prisma.stock.upsert({
    where: {
      variantId_warehouseId: {
        variantId: variant2.id,
        warehouseId: warehouse.id,
      },
    },
    update: {},
    create: {
      warehouseId: warehouse.id,
      variantId: variant2.id,
      physicalQty: 50,
      reservedQty: 0,
    },
  });
  console.log('Seeded product 2:', product2.name);

  // Product 3: Cotton Seeds
  const product3 = await prisma.product.upsert({
    where: { id: 'product-cotton-seed' },
    update: {},
    create: {
      id: 'product-cotton-seed',
      name: 'Cotton Seeds',
      category: 'seeds',
      regions: [],
    },
  });
  const variant3 = await prisma.productVariant.upsert({
    where: { sku: 'COT-500G' },
    update: {},
    create: {
      sku: 'COT-500G',
      productId: product3.id,
      unit: '500g',
      price: 200,
      isActive: true,
    },
  });
  await prisma.stock.upsert({
    where: {
      variantId_warehouseId: {
        variantId: variant3.id,
        warehouseId: warehouse.id,
      },
    },
    update: {},
    create: {
      warehouseId: warehouse.id,
      variantId: variant3.id,
      physicalQty: 200,
      reservedQty: 0,
    },
  });
  console.log('Seeded product 3:', product3.name);

  // Distributor 1 — use deterministic IDs for idempotent upsert
  const DIST1_ID = '00000000-0000-0000-0000-000000000002';
  await prisma.distributor.upsert({
    where: { id: DIST1_ID },
    update: {},
    create: {
      id: DIST1_ID,
      name: 'Ramu Agro Store',
      phone: '+918765432100',
      state: 'Karnataka',
      lat: 12.9352,
      lng: 77.6245,
      status: 'active',
      assignedRepId: rep.id,
      addedBy: admin.id,
    },
  });
  console.log('Seeded distributor 1: Ramu Agro Store');

  // Distributor 2
  const DIST2_ID = '00000000-0000-0000-0000-000000000003';
  await prisma.distributor.upsert({
    where: { id: DIST2_ID },
    update: {},
    create: {
      id: DIST2_ID,
      name: 'Krishna Seeds',
      phone: '+918765432101',
      state: 'Karnataka',
      lat: 12.9716,
      lng: 77.6000,
      status: 'active',
      assignedRepId: rep.id,
      addedBy: admin.id,
    },
  });
  console.log('Seeded distributor 2: Krishna Seeds');

  // Notification configs
  const notifEvents = [
    { event: 'distributor.pending', pushEnabled: true, whatsappEnabled: false, smsEnabled: false, recipient: 'rep' as const },
    { event: 'order.submitted', pushEnabled: true, whatsappEnabled: false, smsEnabled: false, recipient: 'rep' as const },
    { event: 'order.approved', pushEnabled: true, whatsappEnabled: true, smsEnabled: false, recipient: 'rep' as const },
    { event: 'order.rejected', pushEnabled: true, whatsappEnabled: true, smsEnabled: false, recipient: 'rep' as const },
    { event: 'order.dispatched', pushEnabled: true, whatsappEnabled: true, smsEnabled: true, recipient: 'both' as const },
    { event: 'order.delivered', pushEnabled: false, whatsappEnabled: true, smsEnabled: true, recipient: 'distributor' as const },
    { event: 'stock.low', pushEnabled: true, whatsappEnabled: false, smsEnabled: false, recipient: 'rep' as const },
  ];

  for (const cfg of notifEvents) {
    await prisma.notificationConfig.upsert({
      where: { event: cfg.event },
      update: {},
      create: cfg,
    });
  }
  console.log('Seeded notification configs');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
