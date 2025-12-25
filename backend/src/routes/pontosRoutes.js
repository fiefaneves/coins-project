const express = require('express');
const router = express.Router();
const pontosController = require('../controllers/pontosController');

// Define que POST em '/' (que será /api/pontos) chama a função salvarPonto
router.post('/pontos', pontosController.salvarPonto);
router.get('/pontos', pontosController.listarPontos);

module.exports = router;