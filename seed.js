// prisma/seed.js (Estrategia: Borrar y Crear para ExerciseList)

const { PrismaClient } = require('@prisma/client'); // Ya no necesitamos Role si usamos strings
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

// Lista de nombres y detalles de ejercicios básicos
const exerciseDefinitions = [
  { name: "Press de banca", sets: 3, reps: 10, description: "Pecho, hombros, tríceps." },
  { name: "Sentadilla con Barra", sets: 4, reps: 8, description: "Piernas y glúteos." },
  { name: "Peso Muerto", sets: 1, reps: 5, description: "Espalda, piernas, glúteos." },
  { name: "Dominadas", sets: 3, reps: 8, description: "Espalda y bíceps." },
  { name: "Curl de Bíceps con Mancuernas", sets: 3, reps: 12, description: "Bíceps." },
  { name: "Press Militar", sets: 3, reps: 10, description: "Hombros y tríceps." },
  { name: "Plancha", sets: 3, reps: 60, description: "Core (reps como segundos)." },
];

async function main() {
  console.log(`Start seeding ...`);
  const password = await bcrypt.hash('123456', SALT_ROUNDS);

  // --- 1. Upsert Entrenador (Upsert está bien para User porque email SÍ es @unique) ---
  const trainer = await prisma.user.upsert({
    where: { email: 'trainer@gym.com' },
    update: { name: 'Entrenador Juan (Actualizado)' },
    create: {
      name: 'Entrenador Juan',
      email: 'trainer@gym.com',
      hashedPassword: password,
      role: 'trainer', // Usar String
      gender: 'male',
      isActive: true,
    }
  });
  console.log(`Upserted trainer: ${trainer.email} (ID: ${trainer.id})`);

  // --- 2. Upsert Usuario ---
  const user = await prisma.user.upsert({
    where: { email: 'user@gym.com' },
    update: { name: 'Usuario Ana (Actualizado)' },
    create: {
      name: 'Usuario Ana',
      email: 'user@gym.com',
      hashedPassword: password,
      role: 'user', // Usar String
      gender: 'female',
      isActive: true,
    }
  });
  console.log(`Upserted user: ${user.email} (ID: ${user.id})`);

  // --- 3. Borrar Ejercicios Base Anteriores (Modelo 'ExerciseList') ---
  // Borramos los ejercicios creados anteriormente por este entrenador en el seed
  const deletedExercises = await prisma.exerciseList.deleteMany({
      where: { trainerId: trainer.id } // Borra solo los creados por el trainer del seed
  });
  console.log(`Deleted ${deletedExercises.count} previous base exercises (ExerciseList) for trainer ${trainer.id}.`);

  // --- 4. Crear Nuevos Ejercicios Base (Modelo 'ExerciseList') ---
  const createdExerciseListItems = [];
  console.log(`Creating base exercises (ExerciseList)...`);
  for (const exDef of exerciseDefinitions) {
    // Ahora usamos 'create' en lugar de 'upsert'
    const exerciseListItem = await prisma.exerciseList.create({
      data: {
        name: exDef.name,
        description: exDef.description,
        sets: exDef.sets,
        reps: exDef.reps,
        trainerId: trainer.id, // Asociado al entrenador
      }
    });
    createdExerciseListItems.push(exerciseListItem);
  }
  console.log(`Created ${createdExerciseListItems.length} base exercises in ExerciseList.`);

  // --- 5. Limpiar Asignaciones Previas (Modelo 'UserExercise') ---
  const deletedAssignments = await prisma.userExercise.deleteMany({
    where: { userId: user.id }
  });
  console.log(`Deleted ${deletedAssignments.count} previous assignments (UserExercise) for user: ${user.id}`);

  // --- 6. Crear Nuevas Asignaciones Específicas (Modelo 'UserExercise') ---
  console.log(`Assigning exercises (UserExercise) to user: ${user.name}...`);
  if (createdExerciseListItems.length >= 4) {
    await prisma.userExercise.create({
      data: {
        userId: user.id,
        exerciseId: createdExerciseListItems[0].id,
        sets: 3, reps: 10, weight: 45.0, notes: 'Enfocarse en la forma.',
      }
    });
    await prisma.userExercise.create({
      data: {
        userId: user.id, exerciseId: createdExerciseListItems[1].id,
        sets: 4, reps: 8, weight: 60.0, notes: 'Bajar profundo, espalda recta.',
      }
    });
    await prisma.userExercise.create({
      data: {
        userId: user.id, exerciseId: createdExerciseListItems[3].id,
        sets: 3, reps: 5, notes: 'Usar asistencia si es necesario.',
      }
    });
    await prisma.userExercise.create({
      data: {
        userId: user.id, exerciseId: createdExerciseListItems[6].id,
        sets: 3, reps: 45, notes: 'Mantener cuerpo recto.', // reps como segundos
      }
    });
     console.log(`Assigned 4 exercises (UserExercise) to ${user.name}.`);
  } else {
    console.log("Skipping exercise assignment: Not enough base exercises were created.");
  }

  console.log('Seed completado.');
}

// --- Ejecución ---
main()
  .catch((e) => {
    console.error('Ocurrió un error durante el seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Cliente Prisma desconectado.');
  });