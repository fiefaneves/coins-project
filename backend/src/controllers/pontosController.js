// src/controllers/pontosController.js
const pool = require('../config/db');
const { formatarDataParaBanco, toNum } = require('../utils/helpers');

const salvarPonto = async (req, res) => {
    const dados = req.body;
    console.log(`Recebido: ${dados.moeda} | ${dados.data} | ${dados.hora}`);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Regra de Negócio
        const horaEnvio = dados.hora || '00:00';
        const horas = parseInt(horaEnvio.split(':')[0], 10);
        const tipoEntrada = horas >= 21 ? 'FINAL' : 'PARCIAL';

        // Inserir Cabeçalho
        const insertQuery = `
            INSERT INTO entradas_mercado 
            (data_registro, hora_registro, moeda, tipo_entrada, valor_mensal, valor_semanal, valor_diario)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;
        `;
        
        const values = [
            formatarDataParaBanco(dados.data),
            dados.hora,
            dados.moeda,
            tipoEntrada,
            toNum(dados.mensal),
            toNum(dados.semanal),
            toNum(dados.diario)
        ];

        const resEntrada = await client.query(insertQuery, values);
        const entradaId = resEntrada.rows[0].id;

        // Inserir H4
        const h4Hours = ['00', '04', '08', '12', '16', '20'];
        for (const hour of h4Hours) {
            const valor = toNum(dados[`h4_${hour}`]);
            if (valor !== null && !isNaN(valor)) {
                await client.query(
                    'INSERT INTO entradas_h4 (entrada_id, hora, valor) VALUES ($1, $2, $3)',
                    [entradaId, hour, valor]
                );
            }
        }

        // Inserir H1
        for (let i = 0; i < 24; i++) {
            const hourStr = i.toString().padStart(2, '0');
            const valor = toNum(dados[`h1_${hourStr}`]);
            if (valor !== null && !isNaN(valor)) {
                await client.query(
                    'INSERT INTO entradas_h1 (entrada_id, hora, valor) VALUES ($1, $2, $3)',
                    [entradaId, hourStr, valor]
                );
            }
        }

        await client.query('COMMIT');
        
        res.status(201).json({ 
            message: 'Dados salvos com sucesso!',
            id: entradaId,
            tipo: tipoEntrada
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro:', error);
        res.status(500).json({ message: 'Erro ao salvar dados.', detail: error.message });
    } finally {
        client.release();
    }
};

module.exports = { salvarPonto };