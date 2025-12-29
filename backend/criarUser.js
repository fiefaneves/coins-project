const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

/*
PARA CRIAR QUALQUER USUÁRIO, INSIRA AS CREDENCIAIS AQUI E RODE ESTE ARQUIVO UMA VEZ.
Exemplo de comando para rodar este arquivo:
    node backend/criarUser.js
*/

// Esta linha diz ao Node para não rejeitar certificados "desconhecidos" (como o da Aiven)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const criarUsuario = async () => {
    
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
        console.error("❌ ERRO: DATABASE_URL não encontrada no .env");
        process.exit(1);
    }

    console.log("🔍 Tentando conectar...");

    const pool = new Pool({
        connectionString: dbUrl,
        ssl: {
            rejectUnauthorized: false // Reforça a permissão
        }
    });

    // Teste de conexão antes de tentar rodar queries
    let client;
    try {
        client = await pool.connect();
        console.log("🔌 Conectado ao banco com sucesso!");

        // ALTERE OS 3 PARAMETROS DO USUÁRIO QUE SERÁ CRIADO
        const username = 'Admin Supremo';
        const emailAdmin = 'admin@coins.com';
        const senhaPlana = '123456';

        const saltRounds = 10;
        const hashSenha = await bcrypt.hash(senhaPlana, saltRounds);

        // Cria novo
        const res = await client.query(
            `INSERT INTO usuarios (nome, email, senha)
            VALUES ($1, $2, $3) 
            RETURNING id, nome, email`,
            [username, emailAdmin, hashSenha]
        );

        console.log(`✅ Usuário criado com sucesso! ID: ${res.rows[0].id}`);

    } catch (error) {
        console.error("❌ Erro no processo:");
        console.error(error);
    } finally {
        if (client) client.release();
        pool.end();
    }
};

criarUsuario();