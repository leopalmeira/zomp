// backend/seed.js — cria o admin e config inicial
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  // 1. Admin user
  const adminEmail = 'leandro2703palmeira@gmail.com'
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existing) {
    const hash = await bcrypt.hash('Lps27031981@', 10)
    await prisma.user.create({
      data: {
        name: 'Leandro Palmeira',
        email: adminEmail,
        password: hash,
        role: 'ADMIN',
      }
    })
    console.log('✅ Admin criado:', adminEmail)
  } else {
    console.log('ℹ️  Admin já existe:', adminEmail)
  }

  // 2. Config inicial (upsert)
  await prisma.adminConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      pricePerKmCar: 2.00,
      pricePerKmMoto: 1.50,
      minFareCar: 8.40,
      minFareMoto: 7.20,
      royaltyPerRide: 0.30,
      royaltyMonthlyLimit: 8,
      maxPassengersPerDriver: 700,
      bindingMonthsFirst: 36,
      bindingMonthsRenew: 24,
    }
  })
  console.log('✅ AdminConfig inicializado')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
