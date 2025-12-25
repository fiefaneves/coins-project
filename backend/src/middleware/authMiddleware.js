const jwt = require('jsonwebtoken');
const JWT_SECRET = 'sua_chave_secreta_super_segura_123'; // Mesma chave do authController

const verificarToken = (req, res, next) => {
    const tokenHeader = req.headers['authorization'];
    
    if (!tokenHeader) {
        return res.status(403).json({ message: 'Nenhum token fornecido.' });
    }

    // O token vem como "Bearer eyJhbG..."
    const token = tokenHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'Token mal formatado.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token inválido ou expirado.' });
        }
        // Salva o ID do usuário na requisição para usar nos controllers
        req.userId = decoded.id;
        next();
    });
};

module.exports = verificarToken;