const express = require('express');
const router = express.Router();
const pontosController = require('../controllers/pontosController');
const verificarToken = require('../middleware/authMiddleware');

router.get('/pontos', pontosController.listarPontos);
router.post('/pontos', verificarToken, pontosController.salvarPonto); // Protegido
router.get('/pontos/:id', verificarToken, pontosController.obterPonto); // Novo: Pegar um
router.put('/pontos/:id', verificarToken, pontosController.atualizarPonto); // Novo: Editar
router.delete('/pontos/:id', verificarToken, pontosController.excluirPonto); // Novo: Excluir
router.get('/analise', verificarToken, pontosController.buscarAnalisePorData);

module.exports = router;