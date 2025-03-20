const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function seedEmployee() {
  try {
    // Encriptar la contraseña del empleado
    const hashedPassword = await bcrypt.hash("employee123", 10); // Contraseña: "employee123"

    // Crear el usuario empleado para el Puesto 1
    const employee = await prisma.user.create({
      data: {
        name: "Empleado Puesto 1",
        email: "empleado1@gym.com",
        phone: 123456789,
        hashedPassword: hashedPassword,
        role: "employee",
        post: "post_1",
        isActive: true,
        gender: "male",
        age: 30,
        height: 175,
        weight: 70,
        goal: "get_fitter",
        level: "intermediate",
      },
    });

    console.log("Usuario empleado creado:", employee);
  } catch (error) {
    console.error("Error al crear el usuario empleado:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedEmployee();