const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'coins_db',
    password: 'fmn123',
    port: 5432,
});

module.exports = pool;