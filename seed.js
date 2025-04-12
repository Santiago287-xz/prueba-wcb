// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Crear un usuario con 5 puntos
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const user = await prisma.user.create({
    data: {
      name: 'Usuario Ejemplo',
      email: 'ejemplo@gym.com',
      hashedPassword,
      role: 'member',
      isActive: true,
      gender: 'male',
      age: 30,
      height: 175,
      weight: 80,
      rfidCardNumber: '123456789',
      rfidAssignedAt: new Date(),
      accessPoints: 5, // 5 puntos asignados
      lastCheckIn: null
    }
  });
  
  console.log('Usuario de ejemplo creado:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });