// server.js (na raiz do backend)
const express = require('express');
const cors = require('cors');
const pontosRoutes = require('./src/routes/pontosRoutes'); // Importa as rotas

const app = express();
const PORT = 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
// Tudo o que estiver em pontosRoutes terá o prefixo '/api'
app.use('/api', pontosRoutes);

// Iniciar
app.listen(PORT, () => {
    console.log(`🚀 Servidor organizado rodando em http://localhost:${PORT}`);
});