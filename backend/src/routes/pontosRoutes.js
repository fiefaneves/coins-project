const express = require('express');
const router = express.Router();
const pontosController = require('../controllers/pontosController');
const verificarToken = require('../middleware/authMiddleware');

router.get('/pontos', pontosController.listarPontos);
router.post('/pontos', verificarToken, pontosController.salvarPonto); 
router.get('/pontos/:id', verificarToken, pontosController.obterPonto);
router.put('/pontos/:id', verificarToken, pontosController.atualizarPonto); 
router.delete('/pontos/:id', verificarToken, pontosController.excluirPonto); 
router.get('/analise', verificarToken, pontosController.getAnalise);

module.exports = router;