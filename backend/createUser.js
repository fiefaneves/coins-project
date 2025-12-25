// backend/criarUsuario.js
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

const criar = async () => {
    const nome = 'Admin';
    const email = 'admin@coins.com';
    const senha = '123'; // Senha que você vai usar para logar

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);

    try {
        await pool.query(
            'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)',
            [nome, email, hash]
        );
        console.log('Usuário criado com sucesso!');
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
};

criar();