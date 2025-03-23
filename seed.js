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


// async function inspectUser() {
//   const users = await prisma.user.findMany({
//     where: { email: "empleado1@gym.com" },
//   });
//   console.log("Usuario:", users[0].post);
// }

// inspectUser().catch(console.error);

// async function inspectProducts() {
//   const products = await prisma.product.findMany({
//     include: { stocks: true },
//   });
//   console.log("Productos y sus stocks:", products);

//   const stocks = await prisma.stock.findMany();
//   console.log("Registros de stock:", stocks);
// }

// inspectProducts().catch(console.error);

async function seedTransactions() {
  try {
    console.log('Comenzando a crear transacciones de prueba...');

    // Categorías para ingresos y gastos
    const incomeCategories = ['membership', 'court_rental', 'kiosk_sale', 'other_income'];
    const expenseCategories = ['salary', 'supplies', 'utilities', 'maintenance', 'marketing'];
    
    // Métodos de pago
    const paymentMethods = ['cash', 'transfer', 'card'];
    
    // Ubicaciones
    const locations = ['main_warehouse', 'post_1', 'post_2'];
    
    // Crear 10 transacciones
    const transactions = [];
    
    for (let i = 0; i < 10; i++) {
      const isIncome = Math.random() > 0.4; // 60% ingresos, 40% gastos
      const type = isIncome ? 'income' : 'expense';
      const categories = isIncome ? incomeCategories : expenseCategories;
      
      // Crear fecha aleatoria en los últimos 30 días
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      const transaction = {
        type,
        category: categories[Math.floor(Math.random() * categories.length)],
        amount: parseFloat((Math.random() * 2000 + 100).toFixed(2)),
        description: `${type === 'income' ? 'Ingreso' : 'Gasto'} de prueba #${i+1}`,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        createdAt: date,
        updatedAt: date
      };
      console.log(transaction)
      transactions.push(transaction);
    }
    
    // Crear transacciones en la base de datos
    const createdTransactions = await prisma.transaction.createMany({
      data: transactions,
    });
    
    console.log(`Creadas ${createdTransactions.count} transacciones de prueba.`);
  } catch (error) {
    console.error('Error al crear transacciones:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTransactions()
  .then(() => console.log('Script completado.'))
  .catch(e => console.error(e));