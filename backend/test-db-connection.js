#!/usr/bin/env node
/**
 * Script de Teste de Conexão com o Banco de Dados PostgreSQL
 * Uso: node test-db-connection.js
 * 
 * Testa:
 * 1. Conexão com o banco de dados
 * 2. Verificação de usuários de teste
 * 3. Verificação de configurações do admin
 */

const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://zomp_user:8yv530quG8LpXypejVO0UDmiwVovjOnW@dpg-d8guds48aovs73efq1a0-a.oregon-postgres.render.com/zomp_f1dk';

console.log('🔍 ZOMP - Teste de Conexão com Banco de Dados');
console.log('=============================================\n');

// Configuração do Pool (mesma do db.js)
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes('.render.com')
    ? { rejectUnauthorized: false }
    : false,
  connectionTimeoutMillis: 10000
});

async function testConnection() {
  let client;
  try {
    console.log('🔌 Tentando conectar ao banco de dados...');
    console.log(`   Host: ${DATABASE_URL.split('@')[1]?.split('/')[0] || 'localhost'}`);
    
    client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso!\n');

    // Teste 1: Verificar se o banco está acessível
    const { rows: dbRows } = await client.query('SELECT current_database() as db_name');
    console.log('📁 Banco de dados:', dbRows[0].db_name);

    // Teste 2: Verificar usuários de teste
    console.log('\n👥 Verificando usuários de teste...');
    const { rows: users } = await client.query(`
      SELECT id, email, role, isApproved, password IS NOT NULL as has_password 
      FROM "User" 
      WHERE email IN ('cliente@zomp.com', 'motorista@zomp.com', 'leandro2703palmeira@gmail.com')
      ORDER BY email
    `);

    if (users.length === 0) {
      console.log('❌ NENHUM USUÁRIO DE TESTE ENCONTRADO!');
      console.log('   Os usuários serão criados automaticamente pelo initDB() no startup do backend.');
    } else {
      console.log(`✅ ${users.length} usuário(s) de teste encontrado(s):\n`);
      users.forEach(user => {
        console.log(`   Email: ${user.email}`);
        console.log(`     Role: ${user.role}`);
        console.log(`     Aprovado: ${user.isApproved}`);
        console.log(`     Tem senha: ${user.has_password}`);
        console.log('');
      });
    }

    // Teste 3: Verificar configuração do Admin
    console.log('\n⚙️  Verificando configuração do Admin...');
    const { rows: adminConfig } = await client.query('SELECT * FROM "AdminConfig" WHERE id = \'singleton\'');
    if (adminConfig.length > 0) {
      const config = adminConfig[0];
      console.log('✅ Configuração do Admin encontrada:');
      console.log(`   Preço por km (carro): R$ ${config.pricePerKmCar}`);
      console.log(`   Preço por km (moto): R$ ${config.pricePerKmMoto}`);
      console.log(`   Royalty por corrida: R$ ${config.royaltyPerRide}`);
      console.log(`   Valor do crédito: R$ ${config.pricePerCredit}`);
    } else {
      console.log('⚠️  Configuração do Admin não encontrada (será criada no startup)');
    }

    // Teste 4: Contagem de tabelas
    console.log('\n📊 Estatísticas do banco:');
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('User', 'AdminConfig', 'Referral', 'Ride')
      ORDER BY table_name
    `);
    
    for (const table of tables) {
      const { rows: count } = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
      console.log(`   ${table.table_name}: ${count[0].count} registros`);
    }

    console.log('\n✅ Todos os testes passaram!');
    console.log('\n💡 Dica: Se os usuários não existirem, inicie o backend (node index.js)');
    console.log('   que o initDB() criará automaticamente os usuários de teste.\n');

    return true;

  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:');
    console.error(`   Mensagem: ${err.message}`);
    console.error(`   Código: ${err.code}`);
    console.error('\n🔧 Possíveis soluções:');
    console.error('   1. Verifique se o DATABASE_URL está correto');
    console.error('   2. Verifique se o banco está online (Render Dashboard)');
    console.error('   3. Verifique as credenciais do banco');
    console.error('   4. Tente desabilitar SSL temporariamente para debug\n');
    return false;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Executar testes
testConnection().then(success => {
  process.exit(success ? 0 : 1);
}).catch(() => {
  process.exit(1);
});
