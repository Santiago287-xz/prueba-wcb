import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const exercises = [
  // Pecho
  "Press de banca", "Press de banca inclinado", "Press de banca declinado", 
  "Aperturas con mancuernas", "Flexiones", "Fondos en paralelas",

  // Espalda
  "Dominadas", "Remo con barra", "Remo con mancuerna", "Jalones al pecho", 
  "Pull-over", "Peso muerto", "Hiperextensiones",

  // Piernas
  "Sentadillas", "Prensa de piernas", "Extensiones de cuádriceps", "Curl de isquiotibiales", 
  "Elevación de gemelos", "Peso muerto rumano", "Zancadas", "Sentadilla Búlgara",

  // Hombros
  "Press militar", "Elevaciones laterales", "Elevaciones frontales", "Pájaros", 
  "Encogimientos de hombros", "Remo al mentón",

  // Brazos
  "Curl de bíceps", "Curl martillo", "Curl con barra Z", "Fondos de tríceps", 
  "Extensiones de tríceps", "Press francés",

  // Abdominales
  "Crunches", "Plancha", "Elevaciones de piernas", "Russian twist", 
  "Mountain climbers", "Rueda abdominal",

  // Cardio
  "Carrera", "Ciclismo", "Elíptica", "Salto a la cuerda", 
  "Burpees", "Jumping jacks"
]

async function main() {
  const password = await bcrypt.hash('123456', 10)

  // Crear entrenador
  const trainer = await prisma.user.create({
    data: {
      name: 'Entrenador Juan',
      email: 'trainer@gym.com',
      hashedPassword: password,
      role: 'trainer',
      gender: 'male',
      isActive: true
    }
  })

  // Crear usuario
  const user = await prisma.user.create({
    data: {
      name: 'Usuario Ana',
      email: 'user@gym.com',
      hashedPassword: password,
      role: 'user',
      gender: 'female',
      isActive: true
    }
  })

  // Cargar ejercicios en ExerciseList
  for (const name of exercises) {
    await prisma.exerciseList.create({
      data: {
        name,
        sets: 3,
        reps: 12,
        trainerId: trainer.id
      }
    })
  }

  const exerciseList = await prisma.exerciseList.findMany({ take: 10 }) // Asignar solo 10

  // Asignar algunos ejercicios al usuario
  for (const ex of exerciseList) {
    await prisma.userExercise.create({
      data: {
        userId: user.id,
        exerciseId: ex.id,
        sets: ex.sets,
        reps: ex.reps
      }
    })
  }

  console.log('Seed completado con usuarios, ejercicios y asignaciones.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
