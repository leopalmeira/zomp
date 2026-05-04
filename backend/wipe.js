require('dotenv').config();
const { query, pool } = require('./db');

async function wipeDatabase() {
  try {
    console.log('Starting database wipe...');
    
    // Delete transactions and rides first due to foreign keys
    await query('DELETE FROM "Ride"');
    console.log('✅ All rides deleted');
    
    // Delete referrals
    try {
      await query('DELETE FROM "Referral"');
      console.log('✅ All referrals deleted');
    } catch(e) { console.log('No Referral table or error:', e.message); }

    // Delete withdrawals
    try {
      await query('DELETE FROM "Withdrawal"');
      console.log('✅ All withdrawals deleted');
    } catch(e) { console.log('No Withdrawal table or error:', e.message); }

    // Delete credit transactions if any
    try {
      await query('DELETE FROM "CreditTransaction"');
      console.log('✅ All credit transactions deleted');
    } catch(e) { console.log('No CreditTransaction table or error:', e.message); }

    // Delete all users EXCEPT the admin
    const { rowCount } = await query('DELETE FROM "User" WHERE role != $1', ['ADMIN']);
    console.log(`✅ ${rowCount} users (drivers, passengers) deleted`);

    // Reset sequences or auto-increments if necessary, but UUIDs are used so it's fine.

    // Also update admin stats to zero just in case
    await query('UPDATE "AdminConfig" SET id = id'); // trigger update if needed, but not necessary

    console.log('🎉 Database wipe complete. Only Admin remains.');
  } catch (err) {
    console.error('❌ Error wiping database:', err);
  } finally {
    pool.end();
  }
}

wipeDatabase();
