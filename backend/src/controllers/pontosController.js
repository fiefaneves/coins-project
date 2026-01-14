const pool = require('../config/db');
const { toNum, formatarDataParaBanco } = require('../utils/helpers'); 

// 1. SALVAR (CREATE)
const salvarPonto = async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Inicia transação

        // 1. Removemos 'tipo' da desestruturação
        let { data, moeda, mensal, semanal, diario } = req.body;
        const userId = req.userId;

        // 1. GARANTE FORMATO ISO (YYYY-MM-DD) ANTES DE TUDO
        // Isso corrige erros se o front enviar '14/01/2026'
        const dataFormatada = formatarDataParaBanco(data); 

        // 2. LÓGICA DE PREENCHIMENTO AUTOMÁTICO
        // Usamos a data formatada para criar o objeto Date com segurança
        // Adicionamos "T12:00:00" para evitar problemas de fuso horário (UTC) virando o dia anterior
        const dataObj = new Date(dataFormatada + 'T12:00:00'); 
        
        const diaMes = dataObj.getDate(); 
        const diaSemana = dataObj.getDay(); // 0 = Domingo

        const isPrimeiroDiaDoMes = (diaMes === 1);
        const isDomingo = (diaSemana === 0);

        console.log(`[Auto] Data: ${dataFormatada} | Dia: ${diaMes} | Domingo? ${isDomingo}`);

        // Se NÃO é dia de mudança (Dia 01 ou Domingo), busca o anterior
        if (!isPrimeiroDiaDoMes || !isDomingo) {
            
            // Busca o último registro VÁLIDO (não deletado) anterior a esta data
            const queryAnterior = await client.query(`
                SELECT valor_mensal, valor_semanal 
                FROM entradas_mercado 
                WHERE moeda = $1 
                  AND data_registro < $2 
                  AND deletado = FALSE
                ORDER BY data_registro DESC 
                LIMIT 1
            `, [moeda, dataFormatada]);

            if (queryAnterior.rows.length > 0) {
                const ultimoRegistro = queryAnterior.rows[0];
                console.log(`[Auto] Encontrado registro anterior: MN=${ultimoRegistro.valor_mensal}, W1=${ultimoRegistro.valor_semanal}`);

                // REGRA MENSAL: Se não for dia 01, copia o anterior (mesmo que o usuário tenha mandado vazio)
                if (!isPrimeiroDiaDoMes) {
                    mensal = ultimoRegistro.valor_mensal;
                    console.log(`[Auto] Aplicando Mensal: ${mensal}`);
                }

                // REGRA SEMANAL: Se não for Domingo, copia o anterior
                if (!isDomingo) {
                    semanal = ultimoRegistro.valor_semanal;
                    console.log(`[Auto] Aplicando Semanal: ${semanal}`);
                }
            } else {
                console.log(`[Auto] Nenhum registro anterior encontrado para copiar.`);
            }
        }
        // ----------------------------------------------------

        const horaSistema = new Date().toLocaleTimeString('pt-BR', { 
            timeZone: 'America/Sao_Paulo', 
            hour12: false 
        });

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

// 6. BUSCAR ANALISE (Mantido)
const buscarAnalisePorData = async (req, res) => {
    const { data } = req.query; 

    if (!data) return res.status(400).json({ message: 'Data é obrigatória' });

    try {
        // 1. Busca os dados do dia selecionado
        const result = await pool.query(
            `SELECT * FROM entradas_mercado 
             WHERE data_registro = $1 AND deletado = FALSE
             ORDER BY moeda ASC`,
            [data]
        );

        // 2. Para cada moeda, busca o histórico anterior (para MN, W1, D1) e o Intradiário (H4, H1)
        const analisesCompletas = await Promise.all(result.rows.map(async (entrada) => {
            
            // Busca Histórico: Pegamos os últimos 30 registros ATÉ a data atual
            const resHistorico = await pool.query(`
                SELECT data_registro, valor_mensal, valor_semanal, valor_diario 
                FROM entradas_mercado 
                WHERE moeda = $1 AND data_registro <= $2 AND deletado = FALSE
                ORDER BY data_registro DESC
                LIMIT 30
            `, [entrada.moeda, data]);

            // 2. Invertemos (.reverse) no JavaScript para ficar cronológico (Antigo -> Novo)
            // Isso é essencial para o cálculo do ciclo funcionar na ordem certa.
            const historicoOrdenado = resHistorico.rows.reverse();

            const resH4 = await pool.query('SELECT hora, valor FROM entradas_h4 WHERE entrada_id = $1 ORDER BY hora ASC', [entrada.id]);
            const resH1 = await pool.query('SELECT hora, valor FROM entradas_h1 WHERE entrada_id = $1 ORDER BY hora ASC', [entrada.id]);

            const entradaCompleta = { ...entrada };
            
            entradaCompleta.historico_mn = historicoOrdenado.map(r =>  ({
                data: r.data_registro,
                valor: r.valor_mensal
            }));
            entradaCompleta.historico_w1 = historicoOrdenado.map(r =>  ({
                data: r.data_registro,
                valor: r.valor_semanal
            }));
            entradaCompleta.historico_d1 = historicoOrdenado.map(r =>  ({
                data: r.data_registro,
                valor: r.valor_diario
            }));

            resH4.rows.forEach(r => entradaCompleta[`h4_${r.hora}`] = r.valor);
            resH1.rows.forEach(r => entradaCompleta[`h1_${r.hora}`] = r.valor);

            return entradaCompleta;
        }));

        res.json(analisesCompletas);

    } catch (error) {
        console.error("Erro no buscarAnalisePorData:", error);
        res.status(500).json({ message: 'Erro ao buscar análise' });
    }
};

const buscarUltimoRegistro = async (req, res) => {
    const client = await pool.connect();
    try {
        const { moeda, data } = req.query;

        if (!moeda || !data) {
            return res.status(400).json({ message: "Moeda e Data são obrigatórios" });
        }

        const dataFormatada = formatarDataParaBanco(data);

        // Busca o último registro VÁLIDO anterior à data selecionada
        const query = await client.query(`
            SELECT valor_mensal, valor_semanal 
            FROM entradas_mercado 
            WHERE moeda = $1 
              AND data_registro < $2 
              AND deletado = FALSE
            ORDER BY data_registro DESC 
            LIMIT 1
        `, [moeda, dataFormatada]);

        if (query.rows.length > 0) {
            res.json(query.rows[0]); 
        } else {
            res.json({ valor_mensal: '', valor_semanal: '' }); 
        }

    } catch (error) {
        console.error("Erro ao buscar último registro:", error);
        res.status(500).json({ message: "Erro interno" });
    } finally {
        client.release();
    }
};

module.exports = { salvarPonto, listarPontos, obterPonto, atualizarPonto, excluirPonto, buscarAnalisePorData, buscarUltimoRegistro };