// server.js

// 1. Importar os pacotes
const express = require('express');
const cors = require('cors');

// 2. Inicializar o Express
const app = express();
const PORT = 3001; // A porta que o frontend está tentando acessar

// 3. Configurar os Middlewares (essencial!)
app.use(cors()); // Permite que o frontend acesse esta API
app.use(express.json()); // Permite ao servidor entender o JSON enviado pelo React

// 4. CRIAR A ROTA DE API
// Esta é a parte que "ouve" o seu frontend
app.post('/api/pontos', (req, res) => {
    
    // 'req.body' contém os dados (formData) que o seu frontend enviou
    const dadosRecebidos = req.body;

    // 5. APENAS PARA TESTE: Imprima os dados no terminal do *backend*
    console.log('--- DADOS RECEBIDOS DO FRONTEND ---');
    console.log(dadosRecebidos);
    console.log('------------------------------------');

    // 6. Responda ao frontend que tudo deu certo
    // (No futuro, você salvaria os dados no banco de dados ANTES de responder)
    res.status(201).json({
        message: 'Dados recebidos com sucesso!',
        data: dadosRecebidos
    });
});

// 7. Iniciar o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend rodando em http://localhost:${PORT}`);
});