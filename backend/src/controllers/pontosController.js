// backend/src/controllers/pontosController.js
const pool = require('../config/db');
const { toNum, formatarDataParaBanco } = require('../utils/helpers'); 

// 1. SALVAR (CREATE)
const salvarPonto = async (req, res) => {
    try {
        const { data, hora, moeda, tipo, mensal, semanal, diario } = req.body;
        
        // Garante formato YYYY-MM-DD
        const dataFormatada = formatarDataParaBanco(data);

        const result = await pool.query(
            'INSERT INTO entradas_mercado (data_registro, hora_registro, moeda, tipo_entrada, valor_mensal, valor_semanal, valor_diario) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [dataFormatada, hora, moeda, tipo || 'PARCIAL', toNum(mensal), toNum(semanal), toNum(diario)]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao salvar' });
    }
};

// 2. LISTAR (READ)
const listarPontos = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, data_registro, hora_registro, moeda, tipo_entrada FROM entradas_mercado WHERE deletado = FALSE ORDER BY data_registro DESC, hora_registro DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar dados' });
    }
};

// 3. OBTER UM (READ ONE)
const obterPonto = async (req, res) => {
    const { id } = req.params;
    try {
        const resCabecalho = await pool.query('SELECT * FROM entradas_mercado WHERE id = $1', [id]);
        if (resCabecalho.rows.length === 0) return res.status(404).json({ message: 'Não encontrado' });
        const dados = resCabecalho.rows[0];

        const resH4 = await pool.query('SELECT hora, valor FROM entradas_h4 WHERE entrada_id = $1', [id]);
        const resH1 = await pool.query('SELECT hora, valor FROM entradas_h1 WHERE entrada_id = $1', [id]);

        let responseObj = {
            ...dados,
            // Converte para DD/MM/AAAA para o Frontend entender, ou mantém se já for string
            data: new Date(dados.data_registro).toLocaleDateString('pt-BR'), 
            hora: dados.hora_registro ? dados.hora_registro.substring(0, 5) : '',
            mensal: dados.valor_mensal,
            semanal: dados.valor_semanal,
            diario: dados.valor_diario
        };

        resH4.rows.forEach(r => responseObj[`h4_${r.hora}`] = r.valor);
        resH1.rows.forEach(r => responseObj[`h1_${r.hora}`] = r.valor);

        res.json(responseObj);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar ponto' });
    }
};

// 4. ATUALIZAR (EDITAR)
const atualizarPonto = async (req, res) => {
    const { id } = req.params;
    const dados = req.body;
    
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Formata a data recebida (DD/MM/AAAA) para banco (YYYY-MM-DD)
        const dataFormatada = formatarDataParaBanco(dados.data);

        // ATENÇÃO À ORDEM AQUI EMBAIXO:
        await client.query(`
            UPDATE entradas_mercado SET 
                moeda=$1, 
                data_registro=$2, 
                hora_registro=$3, 
                valor_mensal=$4, 
                valor_semanal=$5, 
                valor_diario=$6
            WHERE id=$7
        `, [
            dados.moeda,           // $1
            dataFormatada,         // $2 (DATA - Verifica se é YYYY-MM-DD)
            dados.hora,            // $3 (HORA - Verifica se é HH:MM)
            toNum(dados.mensal),   // $4
            toNum(dados.semanal),  // $5
            toNum(dados.diario),   // $6
            id                     // $7
        ]);

        // ... Atualiza H4/H1 ...
        await client.query('DELETE FROM entradas_h4 WHERE entrada_id = $1', [id]);
        await client.query('DELETE FROM entradas_h1 WHERE entrada_id = $1', [id]);

        const h4Hours = ['00', '04', '08', '12', '16', '20'];
        for (const hour of h4Hours) {
            const valor = toNum(dados[`h4_${hour}`]);
            if (valor !== null) {
                await client.query('INSERT INTO entradas_h4 (entrada_id, hora, valor) VALUES ($1, $2, $3)', [id, hour, valor]);
            }
        }

        for (let i = 0; i < 24; i++) {
            const hourStr = i.toString().padStart(2, '0');
            const valor = toNum(dados[`h1_${hourStr}`]);
            if (valor !== null) {
                await client.query('INSERT INTO entradas_h1 (entrada_id, hora, valor) VALUES ($1, $2, $3)', [id, hourStr, valor]);
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Atualizado com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro no update:', error); // Loga o erro no terminal
        res.status(500).json({ message: 'Erro ao atualizar dados' });
    } finally {
        client.release();
    }
};

// 5. EXCLUIR (Lógica)
const excluirPonto = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;

    try {
        await pool.query(`
            UPDATE entradas_mercado 
            SET deletado = TRUE, deletado_em = NOW(), deletado_por = $1
            WHERE id = $2
        `, [userId, id]);
        
        res.json({ message: 'Registro excluído com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao excluir' });
    }
};

module.exports = { salvarPonto, listarPontos, obterPonto, atualizarPonto, excluirPonto };