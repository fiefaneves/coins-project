const pool = require('../config/db');
const { toNum, formatarDataParaBanco } = require('../utils/helpers'); 

// 1. SALVAR (CREATE)
const salvarPonto = async (req, res) => {
    try {
        const { data, hora, moeda, tipo, mensal, semanal, diario } = req.body;
        const userId = req.userId; 
        const dataFormatada = formatarDataParaBanco(data);
        const result = await pool.query(
            `INSERT INTO entradas_mercado 
            (data_registro, hora_registro, moeda, tipo_entrada, valor_mensal, valor_semanal, valor_diario, criado_por) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *`,
            [
                dataFormatada, 
                hora, 
                moeda, 
                tipo || 'PARCIAL', 
                toNum(mensal), 
                toNum(semanal), 
                toNum(diario),
                userId
            ]
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

// 4. ATUALIZAR (EDITAR) - ATUALIZADO COM LOG DE ALTERAÇÃO
const atualizarPonto = async (req, res) => {
    const { id } = req.params;
    const dados = req.body;
    const userId = req.userId; // Vem do token de autenticação

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const dataFormatada = formatarDataParaBanco(dados.data);

        // Atualizamos os dados E gravamos quem alterou e quando
        await client.query(`
            UPDATE entradas_mercado SET 
                moeda=$1, 
                data_registro=$2, 
                hora_registro=$3, 
                valor_mensal=$4, 
                valor_semanal=$5, 
                valor_diario=$6,
                data_alteracao=NOW(),   -- Data atual
                editado_por=$7          -- ID do usuário que editou
            WHERE id=$8
        `, [
            dados.moeda,           // $1
            dataFormatada,         // $2
            dados.hora,            // $3
            toNum(dados.mensal),   // $4
            toNum(dados.semanal),  // $5
            toNum(dados.diario),   // $6
            userId,                // $7 (NOVO)
            id                     // $8
        ]);

        // --- Recriação dos H4/H1 (Mantido igual) ---
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
        console.error('Erro no update:', error);
        res.status(500).json({ message: 'Erro ao atualizar dados' });
    } finally {
        client.release();
    }
};

// 5. EXCLUIR (Lógica) - ATUALIZADO PARA USAR OS NOVOS CAMPOS
const excluirPonto = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId; // Vem do middleware de auth

    try {
        // Agora usamos data_alteracao e editado_por também na exclusão
        await pool.query(`
            UPDATE entradas_mercado 
            SET deletado = TRUE, 
                data_alteracao = NOW(), 
                editado_por = $1
            WHERE id = $2
        `, [userId, id]);
        
        res.json({ message: 'Registro excluído com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao excluir' });
    }
};

// 6. BUSCAR ANALISE (Mantido)
const buscarAnalisePorData = async (req, res) => {
    const { data } = req.query; 

    if (!data) return res.status(400).json({ message: 'Data é obrigatória' });

    try {
        // Busca registros da data que NÃO foram deletados
        const result = await pool.query(
            `SELECT * FROM entradas_mercado 
             WHERE data_registro = $1 AND deletado = FALSE
             ORDER BY moeda ASC`,
            [data]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar análise' });
    }
};

// 7. LISTAR MOEDAS (Se estiver neste arquivo, senão ignore esta parte)
// Se você tem um controller separado para moedas, não precisa por aqui.

module.exports = { salvarPonto, listarPontos, obterPonto, atualizarPonto, excluirPonto, buscarAnalisePorData };