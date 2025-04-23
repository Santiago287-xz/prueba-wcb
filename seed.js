const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  console.log('Starting database seeding...');
  
  // Create admin user
  const adminEmail = 'admin@test.com';
  const adminPasswordPlain = 'admin123';
  const hashedPassword = await bcrypt.hash(adminPasswordPlain, SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: 'Admin de Prueba' },
    create: {
      name: 'Admin de Prueba',
      email: adminEmail,
      hashedPassword: hashedPassword,
      role: 'admin',
      gender: 'male',
      isActive: true,
    }
  });
  console.log(`Admin user created: ${admin.email}`);

  // Create football courts
  const footballCourts = [
    { name: 'Cancha de Fútbol 1', type: 'football' },
    { name: 'Cancha de Fútbol 2', type: 'football' },
    { name: 'Cancha de Fútbol 3', type: 'football' },
    { name: 'Cancha de Fútbol 4', type: 'football' },
  ];

  for (const court of footballCourts) {
    const existingCourt = await prisma.court.findFirst({
      where: {
        name: court.name,
        type: court.type
      }
    });

    if (!existingCourt) {
      await prisma.court.create({
        data: court
      });
      console.log(`Created football court: ${court.name}`);
    } else {
      console.log(`Football court ${court.name} already exists, skipping...`);
    }
  }

  // Create padel courts
  const padelCourts = [
    { name: 'Cancha de Padel 1', type: 'padel' },
    { name: 'Cancha de Padel 2', type: 'padel' },
    { name: 'Cancha de Padel 3', type: 'padel' },
  ];

  for (const court of padelCourts) {
    const existingCourt = await prisma.court.findFirst({
      where: {
        name: court.name,
        type: court.type
      }
    });

    if (!existingCourt) {
      await prisma.court.create({
        data: court
      });
      console.log(`Created padel court: ${court.name}`);
    } else {
      console.log(`Padel court ${court.name} already exists, skipping...`);
    }
  }

  // Create categories for kiosk
  const categories = [
    { name: 'Snacks' },
    { name: 'Bebidas' }
  ];

  const createdCategories = {};

  for (const category of categories) {
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: category.name
      }
    });

    if (!existingCategory) {
      const newCategory = await prisma.category.create({
        data: category
      });
      createdCategories[category.name] = newCategory.id;
      console.log(`Created category: ${category.name}`);
    } else {
      createdCategories[category.name] = existingCategory.id;
      console.log(`Category ${category.name} already exists, skipping...`);
    }
  }

  // Create products for Snacks category
  const snacks = [
    { 
      name: 'Papas fritas', 
      description: 'Bolsa de papas fritas sabor clásico', 
      price: 2.5
    },
    { 
      name: 'Chocolatina', 
      description: 'Barra de chocolate con leche', 
      price: 1.8
    },
    { 
      name: 'Galletas', 
      description: 'Paquete de galletas dulces', 
      price: 1.5
    },
    { 
      name: 'Chicles', 
      description: 'Paquete de chicles de menta', 
      price: 1.0
    },
    { 
      name: 'Alfajor', 
      description: 'Alfajor relleno de dulce de leche', 
      price: 2.0
    }
  ];

  for (const snack of snacks) {
    const existingProduct = await prisma.product.findFirst({
      where: {
        name: snack.name,
        categoryId: createdCategories['Snacks']
      }
    });

    if (!existingProduct) {
      await prisma.product.create({
        data: {
          ...snack,
          categoryId: createdCategories['Snacks']
        }
      });
      console.log(`Created snack product: ${snack.name}`);
    } else {
      console.log(`Snack product ${snack.name} already exists, skipping...`);
    }
  }

  // Create products for Bebidas category
  const beverages = [
    { 
      name: 'Agua mineral', 
      description: 'Botella de agua mineral sin gas 500ml', 
      price: 1.5
    },
    { 
      name: 'Coca-Cola', 
      description: 'Lata de Coca-Cola 355ml', 
      price: 2.0
    },
    { 
      name: 'Powerade', 
      description: 'Bebida isotónica Powerade 500ml', 
      price: 2.5
    },
    { 
      name: 'Jugo de naranja', 
      description: 'Botella de jugo de naranja natural 350ml', 
      price: 3.0
    },
    { 
      name: 'Café', 
      description: 'Vaso de café caliente', 
      price: 1.8
    }
  ];

  for (const beverage of beverages) {
    const existingProduct = await prisma.product.findFirst({
      where: {
        name: beverage.name,
        categoryId: createdCategories['Bebidas']
      }
    });

    if (!existingProduct) {
      await prisma.product.create({
        data: {
          ...beverage,
          categoryId: createdCategories['Bebidas']
        }
      });
      console.log(`Created beverage product: ${beverage.name}`);
    } else {
      console.log(`Beverage product ${beverage.name} already exists, skipping...`);
    }
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });