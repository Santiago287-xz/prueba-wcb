const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seed() {
  await prisma.court.createMany({
    data: [
      { name: "Cancha de Pádel 1", type: "padel" },
      { name: "Cancha de Pádel 2", type: "padel" },
      { name: "Cancha de Fútbol 1", type: "futbol" },
      { name: "Cancha de Fútbol 2", type: "futbol" },
    ],
  });
  console.log("Canchas creadas");
}

seed().catch(console.error);