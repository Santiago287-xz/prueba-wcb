const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: 'trainer User',
        email: 'trainer@policenter.com',
        hashedPassword,
        role: 'trainer',
        gender: 'male',
        age: 30,
        height: 175,
        weight: 70,
        goal: 'get_fitter',
        level: 'advanced',
        isActive: true
      }
    });
    
    console.log('Trainer user created successfully:');
    console.log({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();