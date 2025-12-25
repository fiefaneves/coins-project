const express = require('express');
const router = express.Router();
const pontosController = require('../controllers/pontosController');
const verificarToken = require('../middleware/authMiddleware'); // Importa o porteiro

router.get('/pontos', pontosController.listarPontos);
router.post('/pontos', verificarToken, pontosController.salvarPonto); // Protegido
router.get('/pontos/:id', verificarToken, pontosController.obterPonto); // Novo: Pegar um
router.put('/pontos/:id', verificarToken, pontosController.atualizarPonto); // Novo: Editar
router.delete('/pontos/:id', verificarToken, pontosController.excluirPonto); // Novo: Excluir

module.exports = router;