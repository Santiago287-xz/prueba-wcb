const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  console.log('Starting exercises seeding...');
  
  // Obtener o crear un usuario admin para asignar como entrenador
  const adminEmail = 'admin@test.com';
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!admin) {
    const adminPasswordPlain = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPasswordPlain, SALT_ROUNDS);
    
    admin = await prisma.user.create({
      data: {
        name: 'Admin de Prueba',
        email: adminEmail,
        hashedPassword: hashedPassword,
        role: 'admin',
        gender: 'male',
        isActive: true,
      }
    });
    console.log(`Admin user created: ${admin.email}`);
  } else {
    console.log(`Using existing admin user: ${admin.email}`);
  }

  // Definir ejercicios por categoría
  const exercisesByCategory = {
    Piernas: [
      {
        name: 'Sentadillas',
        description: 'Ejercicio básico para cuádriceps, glúteos y piernas en general',
        sets: 3,
        reps: 12,
        weight: 0
      },
      {
        name: 'Prensa de Piernas',
        description: 'Ejercicio en máquina para fortalecer cuádriceps, glúteos e isquiotibiales',
        sets: 3,
        reps: 12,
        weight: 50
      },
      {
        name: 'Extensiones de Cuádriceps',
        description: 'Aislamiento de cuádriceps en máquina',
        sets: 3,
        reps: 15,
        weight: 20
      },
      {
        name: 'Curl de Isquiotibiales',
        description: 'Fortalece la parte posterior del muslo',
        sets: 3,
        reps: 12,
        weight: 20
      },
      {
        name: 'Elevación de Pantorrillas',
        description: 'Fortalece gemelos',
        sets: 3,
        reps: 15,
        weight: 30
      },
      {
        name: 'Zancadas',
        description: 'Ejercicio funcional para piernas y glúteos',
        sets: 3,
        reps: 10,
        weight: 10
      },
      {
        name: 'Sentadilla Sumo',
        description: 'Variante de sentadilla que enfatiza aductores e isquiotibiales',
        sets: 3,
        reps: 12,
        weight: 15
      },
      {
        name: 'Puente de Glúteos',
        description: 'Aislamiento para glúteos',
        sets: 3,
        reps: 15,
        weight: 0
      },
      {
        name: 'Step-ups',
        description: 'Ejercicio funcional que trabaja piernas y mejora coordinación',
        sets: 3,
        reps: 12,
        weight: 5
      },
      {
        name: 'Peso Muerto Rumano',
        description: 'Variación del peso muerto que enfoca isquiotibiales',
        sets: 3,
        reps: 10,
        weight: 30
      }
    ],
    Brazos: [
      {
        name: 'Curl de Bíceps con Mancuernas',
        description: 'Ejercicio básico para fortalecer bíceps',
        sets: 3,
        reps: 12,
        weight: 10
      },
      {
        name: 'Extensiones de Tríceps',
        description: 'Aislamiento para tríceps con polea',
        sets: 3,
        reps: 12,
        weight: 15
      },
      {
        name: 'Press Francés',
        description: 'Ejercicio para tríceps con barra',
        sets: 3,
        reps: 10,
        weight: 15
      },
      {
        name: 'Curl Martillo',
        description: 'Trabaja bíceps y antebrazos',
        sets: 3,
        reps: 12,
        weight: 8
      },
      {
        name: 'Fondos en Banco',
        description: 'Ejercicio para tríceps utilizando el peso corporal',
        sets: 3,
        reps: 15,
        weight: 0
      },
      {
        name: 'Curl de Antebrazo',
        description: 'Fortalecimiento de antebrazos',
        sets: 3,
        reps: 15,
        weight: 5
      },
      {
        name: 'Curl con Barra',
        description: 'Ejercicio compuesto para bíceps',
        sets: 3,
        reps: 10,
        weight: 20
      },
      {
        name: 'Patada de Tríceps',
        description: 'Aislamiento para la parte posterior del tríceps',
        sets: 3,
        reps: 12,
        weight: 5
      },
      {
        name: 'Curl de Concentración',
        description: 'Aislamiento intenso para bíceps',
        sets: 3,
        reps: 10,
        weight: 8
      },
      {
        name: 'Extensiones de Tríceps Sobre la Cabeza',
        description: 'Trabaja todos los fascículos del tríceps',
        sets: 3,
        reps: 12,
        weight: 10
      }
    ],
    Pecho: [
      {
        name: 'Press de Banca',
        description: 'Ejercicio básico para pectorales',
        sets: 3,
        reps: 10,
        weight: 40
      },
      {
        name: 'Aperturas con Mancuernas',
        description: 'Aislamiento para pectorales',
        sets: 3,
        reps: 12,
        weight: 10
      },
      {
        name: 'Press Inclinado',
        description: 'Enfoca la parte superior del pectoral',
        sets: 3,
        reps: 10,
        weight: 30
      },
      {
        name: 'Press Declinado',
        description: 'Enfoca la parte inferior del pectoral',
        sets: 3,
        reps: 10,
        weight: 30
      },
      {
        name: 'Fondos en Paralelas',
        description: 'Ejercicio compuesto para pectorales y tríceps',
        sets: 3,
        reps: 12,
        weight: 0
      },
      {
        name: 'Crossover en Polea',
        description: 'Aislamiento para pectorales con mayor rango de movimiento',
        sets: 3,
        reps: 12,
        weight: 15
      },
      {
        name: 'Push Ups',
        description: 'Flexiones de pecho clásicas',
        sets: 3,
        reps: 15,
        weight: 0
      },
      {
        name: 'Pullover con Mancuerna',
        description: 'Ejercicio para pectorales y espalda',
        sets: 3,
        reps: 12,
        weight: 15
      },
      {
        name: 'Press con Banda Elástica',
        description: 'Alternativa de press con resistencia variable',
        sets: 3,
        reps: 15,
        weight: 0
      },
      {
        name: 'Pec Deck',
        description: 'Aislamiento para pectorales en máquina',
        sets: 3,
        reps: 12,
        weight: 30
      }
    ],
    Espalda: [
      {
        name: 'Dominadas',
        description: 'Ejercicio compuesto para dorsales',
        sets: 3,
        reps: 8,
        weight: 0
      },
      {
        name: 'Remo con Barra',
        description: 'Fortalece la parte media de la espalda',
        sets: 3,
        reps: 10,
        weight: 40
      },
      {
        name: 'Jalón al Pecho',
        description: 'Ejercicio para dorsales en polea',
        sets: 3,
        reps: 12,
        weight: 40
      },
      {
        name: 'Remo con Mancuerna',
        description: 'Ejercicio unilateral para espalda',
        sets: 3,
        reps: 12,
        weight: 15
      },
      {
        name: 'Peso Muerto',
        description: 'Ejercicio compuesto para espalda baja y piernas',
        sets: 3,
        reps: 8,
        weight: 60
      },
      {
        name: 'Encogimientos de Hombros',
        description: 'Aislamiento para trapecios',
        sets: 3,
        reps: 15,
        weight: 20
      },
      {
        name: 'Hiperextensiones',
        description: 'Fortalece la zona lumbar',
        sets: 3,
        reps: 12,
        weight: 0
      },
      {
        name: 'Pull-Through',
        description: 'Ejercicio para glúteos y espalda baja',
        sets: 3,
        reps: 12,
        weight: 20
      },
      {
        name: 'Remo en Máquina',
        description: 'Variante del remo que ofrece mayor estabilidad',
        sets: 3,
        reps: 12,
        weight: 40
      },
      {
        name: 'Pullover en Máquina',
        description: 'Aislamiento para músculos serratos',
        sets: 3,
        reps: 12,
        weight: 35
      }
    ],
    Cardio: [
      {
        name: 'Correr en Cinta',
        description: 'Ejercicio cardiovascular básico',
        sets: 1,
        reps: 1,
        duration: 30
      },
      {
        name: 'Bicicleta Estática',
        description: 'Cardio de bajo impacto',
        sets: 1,
        reps: 1,
        duration: 25
      },
      {
        name: 'Elíptica',
        description: 'Ejercicio cardiovascular de cuerpo completo',
        sets: 1,
        reps: 1,
        duration: 20
      },
      {
        name: 'HIIT',
        description: 'Entrenamiento interválico de alta intensidad',
        sets: 5,
        reps: 5,
        duration: 15
      },
      {
        name: 'Salto a la Cuerda',
        description: 'Ejercicio cardiovascular intenso',
        sets: 3,
        reps: 3,
        duration: 10
      },
      {
        name: 'Escalador',
        description: 'Máquina escaladora para cardio',
        sets: 1,
        reps: 1,
        duration: 15
      },
      {
        name: 'Remo',
        description: 'Ejercicio cardiovascular que trabaja todo el cuerpo',
        sets: 1,
        reps: 1,
        duration: 20
      },
      {
        name: 'Burpees',
        description: 'Ejercicio de alta intensidad que combina fuerza y cardio',
        sets: 3,
        reps: 15,
        duration: 10
      },
      {
        name: 'Jumping Jacks',
        description: 'Ejercicio cardiovascular para calentamiento',
        sets: 3,
        reps: 30,
        duration: 5
      },
      {
        name: 'Spinning',
        description: 'Ciclismo indoor intenso con intervalos',
        sets: 1,
        reps: 1,
        duration: 45
      }
    ],
    Core: [
      {
        name: 'Crunch Abdominal',
        description: 'Ejercicio básico para abdominales',
        sets: 3,
        reps: 20,
        weight: 0
      },
      {
        name: 'Plancha',
        description: 'Isométrico para core y estabilidad',
        sets: 3,
        reps: 1,
        duration: 1
      },
      {
        name: 'Russian Twist',
        description: 'Ejercicio para oblicuos',
        sets: 3,
        reps: 20,
        weight: 5
      },
      {
        name: 'Elevación de Piernas',
        description: 'Trabaja abdominales inferiores',
        sets: 3,
        reps: 15,
        weight: 0
      },
      {
        name: 'Mountain Climbers',
        description: 'Ejercicio dinámico para core y cardio',
        sets: 3,
        reps: 30,
        weight: 0
      },
      {
        name: 'Hollow Hold',
        description: 'Isométrico avanzado para abdominales',
        sets: 3,
        reps: 1,
        duration: 1
      },
      {
        name: 'Rollout con Rueda',
        description: 'Ejercicio avanzado para core',
        sets: 3,
        reps: 10,
        weight: 0
      },
      {
        name: 'Cable Woodchop',
        description: 'Ejercicio funcional para oblicuos',
        sets: 3,
        reps: 12,
        weight: 15
      },
      {
        name: 'Dragon Flag',
        description: 'Ejercicio avanzado para todo el core',
        sets: 3,
        reps: 8,
        weight: 0
      },
      {
        name: 'Abdominales en Máquina',
        description: 'Ejercicio para abdominales con asistencia',
        sets: 3,
        reps: 15,
        weight: 20
      }
    ],
    Hombros: [
      {
        name: 'Press Militar',
        description: 'Ejercicio compuesto para hombros',
        sets: 3,
        reps: 10,
        weight: 25
      },
      {
        name: 'Elevaciones Laterales',
        description: 'Aislamiento para deltoides laterales',
        sets: 3,
        reps: 12,
        weight: 8
      },
      {
        name: 'Elevaciones Frontales',
        description: 'Aislamiento para deltoides anteriores',
        sets: 3,
        reps: 12,
        weight: 8
      },
      {
        name: 'Pájaros',
        description: 'Trabajo para deltoides posteriores',
        sets: 3,
        reps: 15,
        weight: 5
      },
      {
        name: 'Press Arnold',
        description: 'Variante de press que trabaja todos los deltoides',
        sets: 3,
        reps: 10,
        weight: 12
      },
      {
        name: 'Face Pull',
        description: 'Ejercicio para deltoides posteriores y rotadores',
        sets: 3,
        reps: 15,
        weight: 15
      },
      {
        name: 'Push Press',
        description: 'Variante explosiva del press militar',
        sets: 3,
        reps: 8,
        weight: 30
      },
      {
        name: 'Upright Row',
        description: 'Ejercicio para trapecios y deltoides',
        sets: 3,
        reps: 12,
        weight: 20
      }
    ],
    Otros: [
      {
        name: 'Yoga',
        description: 'Ejercicio de flexibilidad y equilibrio',
        sets: 1,
        reps: 1,
        duration: 30
      },
      {
        name: 'Pilates',
        description: 'Fortalece core y mejora postura',
        sets: 1,
        reps: 1,
        duration: 30
      },
      {
        name: 'Estiramiento General',
        description: 'Rutina completa de estiramientos',
        sets: 1,
        reps: 1,
        duration: 15
      },
      {
        name: 'Ejercicios de Equilibrio',
        description: 'Mejora estabilidad y coordinación',
        sets: 3,
        reps: 10,
        weight: 0
      },
      {
        name: 'Entrenamiento Funcional',
        description: 'Circuito de ejercicios funcionales',
        sets: 1,
        reps: 1,
        duration: 30
      },
      {
        name: 'Ejercicios de Movilidad',
        description: 'Mejora el rango de movimiento de articulaciones',
        sets: 1,
        reps: 1,
        duration: 15
      },
      {
        name: 'TRX',
        description: 'Entrenamiento en suspensión',
        sets: 3,
        reps: 12,
        weight: 0
      },
      {
        name: 'Boxeo',
        description: 'Entrenamiento cardiovascular y de resistencia',
        sets: 1,
        reps: 1,
        duration: 30
      },
      {
        name: 'Saco de Boxeo',
        description: 'Entrenamiento de fuerza y resistencia con saco',
        sets: 3,
        reps: 3,
        duration: 5
      },
      {
        name: 'Escalada en Muro',
        description: 'Ejercicio para fuerza, coordinación y resistencia',
        sets: 2,
        reps: 3,
        duration: 10
      }
    ]
  };

  // Crear ejercicios
  for (const category in exercisesByCategory) {
    console.log(`Adding exercises for category: ${category}`);
    
    for (const exerciseData of exercisesByCategory[category]) {
      try {
        const existingExercise = await prisma.exerciseList.findFirst({
          where: { name: exerciseData.name }
        });
        
        if (!existingExercise) {
          // Preparar los datos para la creación
          const data = {
            name: exerciseData.name,
            description: exerciseData.description,
            sets: exerciseData.sets,
            reps: exerciseData.reps,
            weight: exerciseData.weight || null,
            duration: exerciseData.duration || null,
            trainerId: admin.id,
            notes: `Categoría: ${category}`
          };
          
          await prisma.exerciseList.create({ data });
          
          console.log(`Created exercise: ${exerciseData.name}`);
        } else {
          console.log(`Exercise ${exerciseData.name} already exists, skipping...`);
        }
      } catch (error) {
        console.error(`Error creating exercise ${exerciseData.name}:`, error);
      }
    }
  }

  console.log('Exercises seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during exercises seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });