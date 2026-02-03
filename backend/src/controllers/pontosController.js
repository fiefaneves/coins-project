const pool = require('../config/db');
const { toNum, formatarDataParaBanco } = require('../utils/helpers'); 

// 1. SALVAR (CREATE)
const salvarPonto = async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Inicia transação

        // 1. Removemos 'tipo' da desestruturação
        const { data, moeda, mensal, semanal, diario } = req.body;
        const userId = req.userId || (req.user && req.user.id) || (req.usuario && req.usuario.id); // Vem do token de autenticação;

        // Se mesmo assim não achar, aí sim é erro de autenticação (401)
        if (!userId) {
            await client.query('ROLLBACK');
            return res.status(401).json({ message: 'Token válido, mas ID do usuário não identificado.' });
        }

        // --- LÓGICA DE RESTRIÇÃO TEMPORÁRIA ---
        const restricao = {
            5: 'AUD', // Carlos (ID 5) registra só AUD
            3: 'JPY', // Clovis (ID 3) registra só JPY
            4: 'NZD'  // Luis (ID 4) registra só NZD
        };

        if (restricao[userId]) {
            const moedaPermitida = restricao[userId];
            if (moeda !== moedaPermitida) {
                await client.query('ROLLBACK'); // Cancela a transação aberta
                return res.status(403).json({ 
                    message: `Restrição temporária: Usuário não autorizado a registrar ${moeda}. Apenas ${moedaPermitida} é permitido.` 
                });
            }
        }
        // ---------------------------------------

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
            await client.query('ROLLBACK'); // Cancela a transação aberta
            return res.status(409).json({ 
                message: `Já existe um registro para ${moeda} no dia ${data}. Edite o existente.` 
            });
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
                e.moeda,
                e.valor_mensal,
                e.valor_semanal,
                e.valor_diario,
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

        // --- CORREÇÃO DO FUSO HORÁRIO ---
        // Aqui formatamos a data manualmente (String -> String) sem passar pelo objeto Date() do JS.
        // Isso impede que o servidor subtraia horas e mude o dia.
        let dataFormatada = '';
        if (dados.data_registro) {
            // Se você aplicou a mudança no db.js, isso já é uma string "2025-05-20".
            // Se não aplicou, é um Objeto Date. O código abaixo resolve ambos os casos:
            const dataStr = typeof dados.data_registro === 'string' 
                ? dados.data_registro 
                : dados.data_registro.toISOString().split('T')[0];

            // Inverte de AAAA-MM-DD para DD/MM/AAAA
            dataFormatada = dataStr.split('-').reverse().join('/');
        }
        // --------------------------------

        let responseObj = {
            ...dados,
            data: dataFormatada, // <--- Usamos a variável segura aqui
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

// 6. BUSCAR ANALISE POR DATA
const getAnalise = async (req, res) => {
    try {
        const { data } = req.query; // Data selecionada no frontend (ex: 2026-01-16)
        
        if (!data) return res.status(400).json({ message: 'Data é obrigatória' });

        // 1. Busca todas as moedas distintas que têm registro nessa data
        // (Isso define quais linhas aparecem na tabela)
        const moedasAtivas = await pool.query(
            `SELECT DISTINCT moeda FROM entradas_mercado 
             WHERE data_registro = $1 AND deletado = FALSE`,
            [data]
        );

        const resultadoFinal = [];

        // 2. Para cada moeda, buscamos o histórico COMPLETO até a data selecionada
        for (const m of moedasAtivas.rows) {
            const moeda = m.moeda;

            // 2.1. Busca histórico MACRO (MN, W1, D1) - Limite 30 para não pesar
            // TO-DO: Estudar se limite adicionado é impedimento para as analises
            const historico = await pool.query(
                `SELECT * FROM entradas_mercado 
                 WHERE moeda = $1 
                 AND data_registro <= $2 
                 AND deletado = FALSE 
                 ORDER BY data_registro DESC
                 LIMIT 120`,
                [moeda, data]
            );

            // Coletamos os IDs dos últimos 30 dias para buscar o H4/H1 contínuo
            const idsHistorico = historico.rows.map(r => r.id);

            // 2.2. Busca histórico INTRADAY (H4) contínuo
            // O uso de ANY($1) é muito eficiente no Postgres
            const historicoH4 = await pool.query(
                `SELECT h.valor, h.hora, e.data_registro 
                 FROM entradas_h4 h
                 JOIN entradas_mercado e ON h.entrada_id = e.id
                 WHERE h.entrada_id = ANY($1)
                 ORDER BY e.data_registro ASC, h.hora ASC`, // Ordem cronológica
                [idsHistorico]
            );

            // 2.3. Busca histórico INTRADAY (H1) contínuo
            const historicoH1 = await pool.query(
                `SELECT h.valor, h.hora, e.data_registro 
                 FROM entradas_h1 h
                 JOIN entradas_mercado e ON h.entrada_id = e.id
                 WHERE h.entrada_id = ANY($1)
                 ORDER BY e.data_registro ASC, h.hora ASC`,
                [idsHistorico]
            );
            
            // Função auxiliar de mapeamento
            const mapHistorico = (campo) => {
                return historico.rows
                    .map(row => ({
                        data: row.data_registro,
                        valor: row[campo] === null ? null : Number(row[campo])
                    }))
                    .filter(item => item.valor !== null)
                    .reverse(); 
            };

            // Mapeia H4/H1 para formato unificado
            const mapIntraday = (queryResult) => {
                return queryResult.rows.map(r => {
                    let dataIso;

                    // VERIFICAÇÃO DE SEGURANÇA:
                    if (r.data_registro instanceof Date) {
                        // Se for objeto Data, usa toISOString
                        dataIso = r.data_registro.toISOString().split('T')[0];
                    } else {
                        // Se for String (ex: "2026-01-14"), converte para texto e pega a primeira parte
                        // Isso previne o erro "is not a function"
                        dataIso = String(r.data_registro).split('T')[0].split(' ')[0];
                    }

                    return {
                        data: `${dataIso} ${r.hora}:00`,
                        valor: r.valor === null ? null : Number(r.valor)
                    };
                });
            };

            resultadoFinal.push({
                moeda: moeda,
                
                // Históricos Macro
                historico_mn: mapHistorico('valor_mensal'),
                historico_w1: mapHistorico('valor_semanal'),
                historico_d1: mapHistorico('valor_diario'),

                // NOVOS Históricos Intraday Contínuos
                historico_h4: mapIntraday(historicoH4),
                historico_h1: mapIntraday(historicoH1)
            });
        }

        res.json(resultadoFinal);

    } catch (error) {
        console.error('Erro na análise:', error);
        res.status(500).json({ message: 'Erro ao processar análise' });
    }
};

module.exports = { salvarPonto, listarPontos, obterPonto, atualizarPonto, excluirPonto, getAnalise };