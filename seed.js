const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// const bcrypt = require('bcrypt');

// async function seedEmployee() {
//   try {
//     // Encriptar la contraseña del empleado
//     const hashedPassword = await bcrypt.hash("employee123", 10); // Contraseña: "employee123"

//     // Crear el usuario empleado para el Puesto 1
//     const employee = await prisma.user.create({
//       data: {
//         name: "Empleado Puesto 1",
//         email: "empleado1@gym.com",
//         phone: 123456789,
//         hashedPassword: hashedPassword,
//         role: "employee",
//         post: "post_1",
//         isActive: true,
//         gender: "male",
//         age: 30,
//         height: 175,
//         weight: 70,
//         goal: "get_fitter",
//         level: "intermediate",
//       },
//     });

//     console.log("Usuario empleado creado:", employee);
//   } catch (error) {
//     console.error("Error al crear el usuario empleado:", error);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// seedEmployee();


async function inspectUser() {
  const users = await prisma.user.findMany({
    where: { email: "empleado1@gym.com" },
  });
  console.log("Usuario:", users[0].post);
}

inspectUser().catch(console.error);

// async function inspectProducts() {
//   const products = await prisma.product.findMany({
//     include: { stocks: true },
//   });
//   console.log("Productos y sus stocks:", products);

//   const stocks = await prisma.stock.findMany();
//   console.log("Registros de stock:", stocks);
// }

// inspectProducts().catch(console.error);