require('dotenv').config();

const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const login = async (req, res) => {
    const { email, senha } = req.body;

    try {
        // 1. Verificar se o usuário existe
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const usuario = result.rows[0];

        if (!usuario) {
            return res.status(401).json({ message: 'Email ou senha incorretos' });
        }

        // 2. Verificar a senha (compara a senha enviada com o hash do banco)
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ message: 'Email ou senha incorretos' });
        }

        // 3. Gerar o Token (O "Crachá")
        const token = jwt.sign(
            { id: usuario.id, nome: usuario.nome },
            JWT_SECRET,
            { expiresIn: '8h' } // Token expira em 8 horas
        );

        res.json({
            message: 'Login realizado com sucesso',
            token: token,
            usuario: { nome: usuario.nome, email: usuario.email }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

module.exports = { login };