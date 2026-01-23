import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from '../css/Analise.module.css';
import dashboardStyles from '../css/Dashboard.module.css'; 

// --- CONFIGURAÇÕES GLOBAIS ---
const ALL_COLUMNS = [
    "Ciclo Concluído", 
    "Deve Ciclo", 
    "Construção", 
    "Acúmulo", 
    "Chão Acúmulo", 
    "Teto Acúmulo", 
    "Mudou", 
    "Flutuante", 
    "Flutuante no Sentido", 
    "Flutuante antes 21h",  
    "Ponto de Parada", 
    "Quebra de Score", 
    "Permissão",
    "Não Operar"            
];

const TIMES = ['MN', 'W1', 'D1', 'H4', 'H1'];

const MERCADOS: Record<string, string> = {
    'AUD': 'Ásia', 'JPY': 'Ásia', 'NZD': 'Ásia',
    'EUR': 'Europa', 'GBP': 'Europa', 'CHF': 'Europa',
    'USD': 'América', 'CAD': 'América'
};

const THRESHOLD_FORCA = 0.20;
const THRESHOLD_FRAQUEZA = -0.20;

interface PontoHistorico {
    data: string;
    valor: number | null;
}

// --- FUNÇÕES AUXILIARES ---
const getValoresPorTimeframe = (dadoBanco: any, time: string): PontoHistorico[] => {
    if (!dadoBanco) return [];
    
    // Agora todos vêm prontos do backend!
    if (time === 'MN') return dadoBanco.historico_mn || [];
    if (time === 'W1') return dadoBanco.historico_w1 || [];
    if (time === 'D1') return dadoBanco.historico_d1 || [];
    
    // H4 e H1 agora são contínuos (pegam dias anteriores)
    if (time === 'H4') return dadoBanco.historico_h4 || [];
    if (time === 'H1') return dadoBanco.historico_h1 || [];
    
    return [];
};

// --- LÓGICA DE CICLO ---
const calcularEstadoCiclo = (historico: PontoHistorico[]) => {
    let ultimoEstado: 'Força' | 'Fraqueza' | null = null;
    let dataInicio: string | null = null;

    for (const ponto of historico) {
        if (ponto.valor === null) continue;
        let novoEstado: 'Força' | 'Fraqueza' | null = ultimoEstado;

        if (ponto.valor >= THRESHOLD_FORCA) novoEstado = 'Força';
        else if (ponto.valor <= THRESHOLD_FRAQUEZA) novoEstado = 'Fraqueza';

        if (novoEstado !== null && novoEstado !== ultimoEstado) {
            ultimoEstado = novoEstado;
            dataInicio = ponto.data;
        }
    }
    return { status: ultimoEstado, dataInicio };
};

// --- CALCULADORAS ---
type CalculatorFunction = (valores: PontoHistorico[], time: string) => any;

const COLUNA_CALCULATORS: Record<string, CalculatorFunction> = {
    "Ciclo Concluído": (valores) => {
        const valoresConsolidados = valores.slice(0, -1);
        return calcularEstadoCiclo(valoresConsolidados);
    },
    
    "Deve Ciclo": (valores) => {
        const valoresConsolidados = valores.slice(0, -1);
        const { status } = calcularEstadoCiclo(valoresConsolidados);
        
        if (status === 'Força') return 'Fraqueza';
        if (status === 'Fraqueza') return 'Força';
        return null;
    },

    "Flutuante": (valores, tipoColuna = 'D1') => {
        const validos = valores.filter(v => v.valor !== null);
        if (validos.length < 2) return null;

        const atual = validos[validos.length - 1];
        const valorAtual = Number(atual.valor);
        
        // Converte data atual para objeto Date (tratando string ISO)
        const dataStr = atual.data.includes('T') ? atual.data.split('T')[0] : atual.data;
        const dataRef = new Date(dataStr + 'T12:00:00'); // Força meio-dia para evitar fuso

        let registroComparacao = null;

        // 1. Lógica para MENSAL (MN)
        // Regra: Comparar com o primeiro dia do MÊS ANTERIOR
        if (tipoColuna.includes('Mensal') || tipoColuna === 'MN') {
            const alvo = new Date(dataRef);
            alvo.setMonth(alvo.getMonth() - 1); // Volta 1 mês
            alvo.setDate(1); // Dia 1
            
            // Busca o primeiro registro >= 01/MêsAnterior
            registroComparacao = validos.find(v => {
                const d = new Date((v.data.includes('T') ? v.data.split('T')[0] : v.data) + 'T12:00:00');
                return d >= alvo;
            });
        }
        
        // 2. Lógica para SEMANAL (W1)
        // Regra: Comparar com a Segunda-feira da SEMANA ANTERIOR
        else if (tipoColuna.includes('Semanal') || tipoColuna === 'W1') {
            const alvo = new Date(dataRef);
            const diaSemana = alvo.getDay(); // 0=Dom, 1=Seg...
            
            // Acha a segunda-feira atual
            const diffSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
            alvo.setDate(alvo.getDate() + diffSegunda);
            
            // Volta 7 dias para a semana anterior
            alvo.setDate(alvo.getDate() - 7);

            // Busca o primeiro registro >= Segunda da semana passada
            registroComparacao = validos.find(v => {
                const d = new Date((v.data.includes('T') ? v.data.split('T')[0] : v.data) + 'T12:00:00');
                return d >= alvo;
            });
        }

        // 3. Lógica PADRÃO (Diário, H4, H1)
        // Regra: Comparar com o registro imediatamente anterior
        // (Isso já resolve "Segunda vs Sexta" automaticamente, pois Sábado/Dom não existem no array 'validos')
        else {
            registroComparacao = validos[validos.length - 2];
        }

        // Se não achou histórico (ex: banco novo), retorna neutro
        if (!registroComparacao) return null;

        const valorComparado = Number(registroComparacao.valor);

        if (valorAtual > valorComparado) return 'Força';
        if (valorAtual < valorComparado) return 'Fraqueza';
        
        return null;
    },

    "Flutuante no Sentido": (valores, time) => {
        // 1. Calculamos o "Deve Ciclo" reutilizando a lógica existente
        // Como estamos dentro do objeto, acessamos a função irmã pela chave
        const getDeveCiclo = COLUNA_CALCULATORS["Deve Ciclo"];
        const getFlutuante = COLUNA_CALCULATORS["Flutuante"];

        // Segurança: se as funções não existirem, retorna null
        if (!getDeveCiclo || !getFlutuante) return null;

        const deve = getDeveCiclo(valores, time);
        const flutuante = getFlutuante(valores, time);

        // 2. Lógica de Confluência
        if (deve === 'Força' && flutuante === 'Força') return 'Força';
        if (deve === 'Fraqueza' && flutuante === 'Fraqueza') return 'Fraqueza';

        // 3. Se divergirem (ex: Deve Força mas Flutuante Fraqueza), retorna neutro
        return null;
    },

    "Quebra de Score": (valores, time) => {
        const getFlutuante = COLUNA_CALCULATORS["Flutuante"];
        if (!getFlutuante) return null;

        // Calcula o Flutuante AGORA (Estado Atual)
        const estadoAtual = getFlutuante(valores, time);
        if (!estadoAtual) return null;

        let valoresAnteriores: PontoHistorico[] = [];

        if (time == 'H4' || time == 'H1') {
            // Para H4 e H1, consideramos os valores até o dia anterior
            if (valores.length == 0) return null;

            // Pega a data do último ponto
            const ultimaDataFull = valores[valores.length - 1].data;
            const ultimaData = ultimaDataFull.includes(' ') ? ultimaDataFull.split(' ')[0] : ultimaDataFull;

            // Varre de trás para frente até achar o último ponto de data diferente
            let indexCorte = -1;
            for (let i = valores.length - 2; i >= 0; i--) {
                const d = valores[i].data;
                const dataItem = d.includes(' ') ? d.split(' ')[0] : d;

                if (dataItem !== ultimaData) {
                    indexCorte = i;
                    break;
                }
            }

            // Se não tem valores anteriores, retorna null
            if (indexCorte == -1) return null;

            valoresAnteriores = valores.slice(0, indexCorte + 1);
        } else {
            // Para MN, W1, D1, consideramos todos os valores anteriores
            valoresAnteriores = valores.slice(0, -1);
        }

        // Calcula o Flutuante ANTES (Estado Anterior)
        const estadoAnterior = getFlutuante(valoresAnteriores, time);
        if (!estadoAnterior) return null;

        // Verifica a inversão
        if (estadoAnterior === 'Fraqueza' && estadoAtual === 'Força') return 'Força';
        if (estadoAnterior === 'Força' && estadoAtual === 'Fraqueza') return 'Fraqueza';

        return null;
    },

    // Futuras lógicas
};

interface AnaliseProps {
    onBack: () => void;
}

export function Analise({ onBack }: AnaliseProps) {
    const today = new Date();
    const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const [selectedDate, setSelectedDate] = useState(formattedToday);
    const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // --- ESTADO DE CONFIGURAÇÃO DAS COLUNAS ---
    const [showConfig, setShowConfig] = useState(false);
    const configRef = useRef<HTMLDivElement>(null);

    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
        "Ciclo Concluído": false,
        "Deve Ciclo": true,
        "Construção": true,
        "Acúmulo": true,
        "Chão Acúmulo": true,
        "Teto Acúmulo": true,
        "Mudou": false,
        "Flutuante": true,
        "Flutuante no Sentido": true,
        "Flutuante antes 21h": false,
        "Ponto de Parada": true,
        "Quebra de Score": true,
        "Permissão": true,
        "Não Operar": true
    });

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (configRef.current && !configRef.current.contains(event.target as Node)) {
                setShowConfig(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        // 1. Criar um controlador de cancelamento
        const controller = new AbortController();

        const carregarDados = async () => {
            setLoading(true);
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                const token = localStorage.getItem('user_token');
                
                // 2. Passar o 'signal' para o Axios
                const res = await axios.get(`${apiUrl}/api/analise?data=${selectedDate}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: controller.signal 
                });
                
                setDadosBrutos(res.data);
            } catch (error: any) {
                // 3. Ignorar erros causados pelo cancelamento proposital
                if (axios.isCancel(error)) {
                    console.log('Pedido anterior cancelado para priorizar o novo.');
                } else {
                    console.error("Erro ao carregar análise", error);
                }
            } finally {
                // Só remove o loading se o pedido não foi cancelado
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        carregarDados();

        // 4. Função de limpeza: roda automaticamente se o selectedDate mudar antes do pedido terminar
        return () => {
            controller.abort();
        };

    }, [selectedDate]);

    const toggleColumn = (col: string) => {
        setVisibleCols(prev => ({
            ...prev,
            [col]: !prev[col]
        }));
    };

    const moedasList = ['AUD', 'CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'NZD', 'USD'];
    
    const activeColumns = ALL_COLUMNS.filter(col => visibleCols[col]);

    return (
        <div className={dashboardStyles.dashboardContainer}>
            <div className={dashboardStyles.mainCard}>
                
                {/* Header */}
                <div className={dashboardStyles.header}>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        <button onClick={onBack} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', marginRight:'10px'}}>
                            ←
                        </button>
                        <span className={dashboardStyles.title}>Análise Técnica</span>
                    </div>

                    {/* Controles da Direita */}
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        
                        {/* --- MENU DE COLUNAS --- */}
                        <div className={styles.configContainer} ref={configRef}>
                            <button 
                                className={styles.configButton} 
                                onClick={() => setShowConfig(!showConfig)}
                            >
                                ⚙️ Colunas
                            </button>

                            {showConfig && (
                                <div className={styles.dropdownMenu}>
                                    {ALL_COLUMNS.map(col => (
                                        <label key={col} className={styles.checkboxItem}>
                                            <input 
                                                type="checkbox" 
                                                checked={visibleCols[col]} 
                                                onChange={() => toggleColumn(col)}
                                            />
                                            {col}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Seletor de Data */}
                        <div>
                            <span className={styles.dateLabel}>Data:</span>
                            <input 
                                type="date" 
                                className={styles.dateInput}
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className={dashboardStyles.contentBody}>
                    <div className={styles.tableContainer}>
                        <table className={styles.matrixTable}>
                            <thead>
                                <tr>
                                    {/* Colunas Fixas */}
                                    <th style={{width: '90px', left: 0, zIndex: 20}}>Data</th>
                                    <th style={{width: '60px', left: '90px', zIndex: 20}}>Moeda</th>
                                    <th style={{width: '80px', left: '150px', zIndex: 20}}>Mercado</th>
                                    <th style={{width: '50px', left: '230px', zIndex: 20}}>Time</th>
                                    
                                    {/* Colunas Dinâmicas */}
                                    {activeColumns.map(col => (
                                        <th key={col}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={activeColumns.length + 4} style={{padding:'2rem'}}>Carregando análise...</td></tr>
                                ) : (
                                    moedasList.map((moeda) => (
                                        TIMES.map((time, index) => {
                                            const isLastTime = index === TIMES.length - 1;
                                            const dadoBanco = dadosBrutos.find(d => d.moeda === moeda);
                                            const valores = getValoresPorTimeframe(dadoBanco, time);                      
                                            
                                            return (
                                                <tr key={`${moeda}-${time}`} className={isLastTime ? styles.rowDivider : ''}>
                                                    <td className={styles.colFixed} style={{position: 'sticky', left: 0, zIndex: 15}}>
                                                        {index === 0 ? selectedDate.split('-').reverse().join('/') : ''}
                                                    </td>
                                                    <td className={styles.colFixed} style={{position: 'sticky', left: '90px', zIndex: 15}}>
                                                        {index === 0 ? (
                                                            <span className={`${styles.currencyBadge} ${styles[moeda]}`}>
                                                                {moeda}
                                                            </span>
                                                        ) : ''}
                                                    </td>
                                                    <td className={styles.colFixed} style={{position: 'sticky', left: '150px', zIndex: 15}}>
                                                        {index === 0 ? MERCADOS[moeda] : ''}
                                                    </td>
                                                    <td className={styles.colFixed} style={{fontWeight:'bold', position: 'sticky', left: '230px', zIndex: 15}}>
                                                        {time}
                                                    </td>

                                                    {activeColumns.map(col => {
                                                        const calculator = COLUNA_CALCULATORS[col];

                                                        let textoExibido = null;
                                                        let classeEstilo = '';

                                                        if (valores.length > 0) {
                                                            // --- ALTERAÇÃO AQUI ---
                                                            // Passamos 'row.label' (ou a variável que guarda o nome "Mensal (MN)") 
                                                            // para que a função saiba qual regra de data aplicar.
                                                            const rawResult = calculator ? calculator(valores, time) : null;

                                                            if (col === "Ciclo Concluído" && rawResult) textoExibido = rawResult.status; // Se seu objeto tiver status
                                                            else textoExibido = rawResult;

                                                            if (textoExibido === 'Força') classeEstilo = styles.statusForca;
                                                            if (textoExibido === 'Fraqueza') classeEstilo = styles.statusFraqueza;
                                                        }
                                                        
                                                        return (
                                                            <td key={col}>
                                                                {textoExibido && (
                                                                    <div className={`${styles.cellStatus} ${classeEstilo}`}>
                                                                        {textoExibido}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}