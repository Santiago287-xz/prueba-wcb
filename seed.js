const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMembershipPrices() {
  try {
    console.log('Creando precios de membresías...');
    
    // Primero, eliminar registros existentes para evitar duplicados
    await prisma.membershipPrice.deleteMany({});
    
    // Crear precios base de membresías
    const membershipPrices = [
      {
        type: 'standard',
        basePrice: 15000,
        description: 'Membresía Estándar - Acceso básico al gimnasio'
      },
      {
        type: 'premium',
        basePrice: 25000,
        description: 'Membresía Premium - Acceso extendido y clases grupales'
      },
      {
        type: 'vip',
        basePrice: 35000,
        description: 'Membresía VIP - Acceso completo y entrenamiento personalizado'
      }
    ];
    
    // Insertar los precios de membresía
    for (const price of membershipPrices) {
      await prisma.membershipPrice.create({
        data: price
      });
    }
    
    console.log('Precios de membresía creados correctamente');
    
    // Crear algunas transacciones de muestra para miembros existentes
    const members = await prisma.user.findMany({
      where: {
        rfidCardNumber: { not: null }
      },
      take: 5
    });
    
    if (members.length === 0) {
      console.log('No hay miembros con tarjetas RFID para crear transacciones de ejemplo');
      return;
    }
    
    // Crear transacciones para cada miembro
    for (const member of members) {
      const membershipType = member.membershipType || 'standard';
      const priceRecord = await prisma.membershipPrice.findFirst({
        where: { type: membershipType }
      });
      
      if (!priceRecord) continue;
      
      const months = Math.floor(Math.random() * 5) + 1;
      const amount = priceRecord.basePrice * months;
      
      // Crear fecha aleatoria en los últimos 30 días
      const paymentDate = new Date();
      paymentDate.setDate(paymentDate.getDate() - Math.floor(Math.random() * 30));
      
      // Crear transacción
      await prisma.transaction.create({
        data: {
          type: 'income',
          category: 'membership',
          amount,
          description: `Pago de membresía ${membershipType} por ${months} mes(es) - ${member.name}`,
          paymentMethod: ['cash', 'transfer', 'card'][Math.floor(Math.random() * 3)],
          userId: member.id,
          createdAt: paymentDate,
          updatedAt: paymentDate
        }
      });
      
      // Actualizar fecha de expiración de la membresía
      const now = new Date();
      const expiryDate = member.membershipExpiry || now;
      const newExpiryDate = new Date(expiryDate);
      newExpiryDate.setMonth(newExpiryDate.getMonth() + months);
      
      await prisma.user.update({
        where: { id: member.id },
        data: {
          membershipExpiry: newExpiryDate,
          membershipStatus: 'active'
        }
      });
    }
    
    console.log('Transacciones de membresía de ejemplo creadas');
  } catch (error) {
    console.error('Error al crear datos de prueba de membresías:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMembershipPrices()
  .then(() => console.log('Script de precios de membresías completado'))
  .catch(error => console.error('Error:', error));