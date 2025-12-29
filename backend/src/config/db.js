const { Pool } = require('pg');
require('dotenv').config();

if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('aivencloud')) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necessário para conectar no Aiven sem configurar certificados manuais
    }
});

pool.on('connect', () => {
    console.log('Base de Dados conectada com sucesso (Aiven)!');
});

pool.on('error', (err) => {
    console.error('❌ Erro inesperado no cliente do banco', err);
    process.exit(-1);
});

module.exports = pool;