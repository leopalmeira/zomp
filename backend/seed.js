const { query, pool } = require('./db');
const bcrypt = require('bcrypt');

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Administrador Zomp';

  if (!adminEmail || !adminPassword) {
    console.log('âšï¸  ADMIN_EMAIL ou ADMIN_PASSWORD nÃ£o definidos. Pulando criaÃ§Ã£o do admin.');
  } else {
    const { rows } = await query('SELECT id FROM "User" WHERE email = $1', [adminEmail]);
    if (rows.length === 0) {
      const hash = await bcrypt.hash(adminPassword, 10);
      await query(
        'INSERT INTO "User" (name, email, password, role, balance, rating, "totalRatings", "ridesAccepted", "ridesMissed", "ridesCompleted", "isApproved") VALUES ($1, $2, $3, $4, 0, 5, 0, 0, 0, 0, true)',
        [adminName, adminEmail, hash, 'ADMIN']
      );
      console.log('âœ… Admin criado:', adminEmail);
    } else {
      console.log('â„¹ï¸  Admin jÃ¡ existe:', adminEmail);
    }
  }

  // Config inicial
  const { rows: configRows } = await query('SELECT id FROM "AdminConfig" WHERE id = $1', ['singleton']);
  if (configRows.length === 0) {
    await query(
      'INSERT INTO "AdminConfig" (id, "pricePerKmCar", "pricePerKmMoto", "minFareCar", "minFareMoto", "royaltyPerRide", "royaltyMonthlyLimit", "maxPassengersPerDriver", "bindingMonthsFirst", "bindingMonthsRenew") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      ['singleton', 2.00, 1.50, 8.40, 7.20, 0.30, 8, 700, 36, 24]
    );
    console.log('âœ… AdminConfig inicializado');
  } else {
    console.log('â„¹ï¸  AdminConfig jÃ¡ existente');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => pool.end());
