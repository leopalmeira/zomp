// backend/seed.js — cria o admin e config inicial
// Credenciais via variáveis de ambiente (nunca hardcoded no código)
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME || 'Administrador Zomp'

  if (!adminEmail || !adminPassword) {
    console.log('⚠️  ADMIN_EMAIL ou ADMIN_PASSWORD não definidos. Pulando criação do admin.')
  } else {
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!existing) {
      const hash = await bcrypt.hash(adminPassword, 10)
      await prisma.user.create({
        data: { name: adminName, email: adminEmail, password: hash, role: 'ADMIN' }
      })
      console.log('✅ Admin criado:', adminEmail)
    } else {
      console.log('ℹ️  Admin já existe:', adminEmail)
    }
  }

  // Config inicial (upsert — idempotente)
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
