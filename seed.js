const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  // Credenciales del admin de prueba
  const adminEmail = 'admin@test.com';
  const adminPasswordPlain = 'admin123'; // Contraseña de prueba

  const hashedPassword = await bcrypt.hash(adminPasswordPlain, SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: 'Admin de Prueba' },
    create: {
      name: 'Admin de Prueba',
      email: adminEmail,
      hashedPassword: hashedPassword,
      role: 'admin', // Rol admin
      gender: 'male', // Ajusta según sea necesario
      isActive: true,
    }
  });
  console.log(`Admin de prueba creado: ${admin.email}`);
  console.log(`Correo: ${adminEmail} - Contraseña: ${adminPasswordPlain}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });