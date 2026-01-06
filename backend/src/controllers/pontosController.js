const pool = require('../config/db');
const { toNum, formatarDataParaBanco } = require('../utils/helpers'); 

// 1. SALVAR (CREATE)
const salvarPonto = async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Inicia transação

        // 1. Removemos 'tipo' da desestruturação
        const { data, moeda, mensal, semanal, diario } = req.body;
        const userId = req.userId;

        const horaSistema = new Date().toLocaleTimeString('pt-BR', { 
            timeZone: 'America/Sao_Paulo', 
            hour12: false 
        });

        const dataFormatada = formatarDataParaBanco(data);

        // Verifica se já existe entrada para Moeda + Data
        const checkExistente = await client.query(
            `SELECT id FROM entradas_mercado 
             WHERE moeda = $1 AND data_registro = $2 AND deletado = FALSE`,
            [moeda, dataFormatada]
        );

        let entradaId;
        let acaoRealizada = '';

        if (checkExistente.rows.length > 0) {
            // --- ATUALIZAR (Sobrescreve existente) ---
            entradaId = checkExistente.rows[0].id;
            acaoRealizada = 'atualizado';

            // Removemos o campo tipo_entrada da Query e reajustamos os índices ($)
            await client.query(`
                UPDATE entradas_mercado SET 
                    hora_registro = $1,
                    valor_mensal = $2,
                    valor_semanal = $3,
                    valor_diario = $4,
                    editado_por = $5,
                    data_alteracao = NOW()
                WHERE id = $6
            `, [
                horaSistema,            // $1
                toNum(mensal),          // $2
                toNum(semanal),         // $3
                toNum(diario),          // $4
                userId,                 // $5
                entradaId               // $6
            ]);

            // Limpa filhos antigos
            await client.query('DELETE FROM entradas_h4 WHERE entrada_id = $1', [entradaId]);
            await client.query('DELETE FROM entradas_h1 WHERE entrada_id = $1', [entradaId]);

        } else {
            // --- CRIAR NOVO ---
            // Removemos o campo tipo_entrada da Query e reajustamos os índices
            const result = await client.query(
                `INSERT INTO entradas_mercado 
                (data_registro, hora_registro, moeda, valor_mensal, valor_semanal, valor_diario, criado_por) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) 
                RETURNING id`,
                [
                    dataFormatada,  // $1
                    horaSistema,    // $2
                    moeda,          // $3
                    toNum(mensal),  // $4
                    toNum(semanal), // $5
                    toNum(diario),  // $6
                    userId          // $7
                ]
            );
            entradaId = result.rows[0].id;
            acaoRealizada = 'criado';
        }

        // --- SALVAR H4 e H1 (Código igual ao anterior) ---
        const h4Hours = ['00', '04', '08', '12', '16', '20'];
        for (const h of h4Hours) {
            const valor = toNum(req.body[`h4_${h}`]);
            if (valor !== null) {
                await client.query(
                    'INSERT INTO entradas_h4 (entrada_id, hora, valor) VALUES ($1, $2, $3)',
                    [entradaId, h, valor]
                );
            }
        }

        for (let i = 0; i < 24; i++) {
            const horaString = i.toString().padStart(2, '0');
            const valor = toNum(req.body[`h1_${horaString}`]);
            if (valor !== null) {
                await client.query(
                    'INSERT INTO entradas_h1 (entrada_id, hora, valor) VALUES ($1, $2, $3)',
                    [entradaId, horaString, valor]
                );
            }
        }

        await client.query('COMMIT');
        
        res.status(201).json({ 
            message: `Registro ${acaoRealizada} com sucesso!`, 
            id: entradaId 
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro ao processar:", error);
        res.status(500).json({ message: 'Erro ao processar dados.' });
    } finally {
        client.release();
    }
};

// 2. LISTAR (READ)
const listarPontos = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                e.id, 
                e.data_registro, 
                e.hora_registro, 
                e.moeda,
                COALESCE(u_edit.nome, u_criador.nome) as responsavel
            FROM entradas_mercado e
            LEFT JOIN usuarios u_criador ON e.criado_por = u_criador.id
            LEFT JOIN usuarios u_edit ON e.editado_por = u_edit.id
            WHERE e.deletado = FALSE 
            ORDER BY e.data_registro DESC, e.hora_registro DESC`
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

        const horaSistema = new Date().toLocaleTimeString('pt-BR', { 
            timeZone: 'America/Sao_Paulo', 
            hour12: false 
        });
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
            horaSistema,           // $3
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

module.exports = { salvarPonto, listarPontos, obterPonto, atualizarPonto, excluirPonto, buscarAnalisePorData };