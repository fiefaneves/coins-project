import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../css/Analise.module.css';
import dashboardStyles from '../css/Dashboard.module.css'; 

// --- CONFIGURAÇÕES GLOBAIS ---

const COLUNAS = [
    "Ciclo Concluído", 
    "Deve Ciclo", 
    "Contrução", 
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

// Configuração dos Limites de Score por Moeda
// Se uma moeda tiver limites diferentes, basta alterar aqui.
const LIMITES_MOEDA: Record<string, { forca: number; fraqueza: number }> = {
    'AUD': { forca: 0.20, fraqueza: -0.20 },
    'NZD': { forca: 0.20, fraqueza: -0.20 },
    'CAD': { forca: 0.20, fraqueza: -0.20 },
    'EUR': { forca: 0.20, fraqueza: -0.20 },
    'GBP': { forca: 0.20, fraqueza: -0.20 },
    'CHF': { forca: 0.20, fraqueza: -0.20 },
    'USD': { forca: 0.20, fraqueza: -0.20 },
    'JPY': { forca: 0.20, fraqueza: -0.20 },
};
const DEFAULT_LIMIT = { forca: 0.20, fraqueza: -0.20 };

// --- HELPERS E CALCULADORAS ---

// Converte valor do banco para número
const toNum = (val: any) => {
    if (val === null || val === undefined || val === '') return null;
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? null : num;
};

// Interface para o ponto histórico
interface PontoHistorico {
    data: string;
    valor: number | null;
}

// Helper para formatar data
const fmtData = (d: any) => {
    if (!d) return '';
    if (typeof d === 'string' && d.includes('-')) return d.split('T')[0];
    return String(d);
};

// Extrai a lista de valores (scores) de um registro baseado no Timeframe
const getValoresPorTimeframe = (dadoBanco: any, time: string, dataReferencia: string): PontoHistorico[] => {
    if (!dadoBanco) return [];

    let lista: any[] = [];

    // Usamos o histórico diretamente, pois ele já contém o valor do dia/mês atual (devido ao filtro <= data no backend).
    if (time === 'MN') lista = dadoBanco.historico_mn || [];
    if (time === 'W1') lista = dadoBanco.historico_w1 || [];
    if (time === 'D1') lista = dadoBanco.historico_d1 || [];

    if (['MN', 'W1', 'D1'].includes(time)) {
        return lista.map((item: any) => ({
            data: fmtData(item.data),
            valor: toNum(item.valor)
        }));
    }

    // Para H4 e H1, o backend não manda histórico de dias anteriores, 
    // então montamos a lista apenas com as velas do dia atual.
    if (time === 'H4') {
        const h4Times = ['00', '04', '08', '12', '16', '20'];
        return h4Times.map(h => ({
            data: `${dataReferencia} ${h}:00`, // Ex: 2026-06-01 04:00
            valor: toNum(dadoBanco[`h4_${h}`])
        }));    
    }

    if (time === 'H1') {
        const h1Times = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
        return h1Times.map(h => ({
            data: `${dataReferencia} ${h}:00`,
            valor: toNum(dadoBanco[`h1_${h}`])
        }));
    }

    return [];
};

// Lógica central do Ciclo Concluído
// Percorre a lista de valores e determina o estado final baseando-se na troca de limites
const calcularEstadoCiclo = (historico: PontoHistorico[], moeda: string) => {
    const limites = LIMITES_MOEDA[moeda] || DEFAULT_LIMIT;

    let ultimoEstado: 'Força' | 'Fraqueza' | null = null;
    let dataInicio: string | null = null;

    for (const ponto of historico) {
        if (ponto.valor === null) continue;

        let novoEstado: 'Força' | 'Fraqueza' | null = ultimoEstado;

        if (ponto.valor >= limites.forca) {
            novoEstado = 'Força';
        } else if (ponto.valor <= limites.fraqueza) {
            novoEstado = 'Fraqueza';
        }

        // REGRA DE PERSISTÊNCIA:
        // Só atualizamos a Data se houve uma MUDANÇA REAL de estado (Ex: Null -> Força, ou Fraqueza -> Força)
        // Se estava 'Força', caiu pra 0.10 (Neutro) e subiu pra 0.25 (Força) de novo,
        // o 'novoEstado' será 'Força', 'ultimoEstado' era 'Força'. 
        // Entra no if? NÃO. Mantém a data antiga.
        if (novoEstado !== null && novoEstado !== ultimoEstado) {
            ultimoEstado = novoEstado;
            dataInicio = ponto.data;
        }
    }

    return { status: ultimoEstado, dataInicio };
};

// --- MAPA DE CALCULADORAS POR COLUNA ---
// Aqui é onde você organiza a lógica de cada coluna nova.
type CalculatorFunction = (valores: PontoHistorico[], moeda: string) => any;

const COLUNA_CALCULATORS: Record<string, CalculatorFunction> = {
    "Ciclo Concluído": (valores, moeda) => {
        return calcularEstadoCiclo(valores, moeda);
    },
    
    "Deve Ciclo": (valores, moeda) => {
        const { status } = calcularEstadoCiclo(valores, moeda);
        // Oposto do Ciclo Concluído
        if (status === 'Força') return 'Fraqueza';
        if (status === 'Fraqueza') return 'Força';
        return null;
    },

    // Futuras colunas virão aqui:
    // "Contrução": (valores, moeda) => { ... lógica da construção ... },
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

    useEffect(() => {
        carregarDados();
    }, [selectedDate]);

    const carregarDados = async () => {
        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const token = localStorage.getItem('user_token');
            const res = await axios.get(`${apiUrl}/api/analise?data=${selectedDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setDadosBrutos(res.data);
        } catch (error) {
            console.error("Erro ao carregar análise", error);
        } finally {
            setLoading(false);
        }
    };

    const moedasList = ['AUD', 'CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'NZD', 'USD'];

    return (
        <div className={dashboardStyles.dashboardContainer}>
            <div className={dashboardStyles.mainCard}>
                
                {/* Header */}
                <div className={dashboardStyles.header}>
                    <div>
                        <button onClick={onBack} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', marginRight:'10px'}}>
                            ←
                        </button>
                        <span className={dashboardStyles.title}>Análise Técnica</span>
                    </div>
                    
                    <div>
                        <span className={styles.dateLabel}>Data de Referência:</span>
                        <input 
                            type="date" 
                            className={styles.dateInput}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className={dashboardStyles.contentBody}>
                    <div className={styles.tableContainer}>
                        <table className={styles.matrixTable}>
                            <thead>
                                <tr>
                                    {/* Colunas Fixas */}
                                    <th style={{width: '90px'}}>Data</th>
                                    <th style={{width: '60px'}}>Moeda</th>
                                    <th style={{width: '80px'}}>Mercado</th>
                                    <th style={{width: '50px'}}>Time</th>
                                    
                                    {/* Renderiza todas as colunas da lista atualizada */}
                                    {COLUNAS.map(col => (
                                        <th key={col}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={COLUNAS.length + 4} style={{padding:'2rem'}}>Carregando análise...</td></tr>
                                ) : (
                                    moedasList.map((moeda) => (
                                        TIMES.map((time, index) => {
                                            const isLastTime = index === TIMES.length - 1;
                                                
                                            // 1. Busca dados do banco para esta moeda
                                            const dadoBanco = dadosBrutos.find(d => d.moeda === moeda);
                                            
                                            // 2. Extrai os valores numéricos para o timeframe atual
                                            const valores = getValoresPorTimeframe(dadoBanco, time, selectedDate);                      
                                            
                                            return (
                                                <tr key={`${moeda}-${time}`} className={isLastTime ? styles.rowDivider : ''}>
                                                    <td className={styles.colFixed}>
                                                        {index === 0 ? selectedDate.split('-').reverse().join('/') : ''}
                                                    </td>
                                                    <td className={styles.colFixed}>
                                                        {index === 0 ? (
                                                            <span className={`${styles.currencyBadge} ${styles[moeda]}`}>
                                                                {moeda}
                                                            </span>
                                                        ) : ''}
                                                    </td>
                                                    <td className={styles.colFixed}>
                                                        {index === 0 ? MERCADOS[moeda] : ''}
                                                    </td>
                                                    <td className={styles.colFixed} style={{fontWeight:'bold'}}>{time}</td>

                                                    {/* Células Dinâmicas */}
                                                    {COLUNAS.map(col => {
                                                        // Busca a função calculadora correta
                                                        const calculator = COLUNA_CALCULATORS[col];
                                                        
                                                        // REGRA DO DELAY:
                                                        const valoresParaCalculo = valores.slice(0, -1);
                                                        
                                                        // Se não sobrar nada, retorna vazio
                                                        if (valoresParaCalculo.length === 0) return <td key={col}></td>; 

                                                        // Calcula o resultado
                                                        const rawResult = calculator ? calculator(valoresParaCalculo, moeda) : null;
                                                        
                                                        // --- LÓGICA DE EXTRAÇÃO DO TEXTO ---
                                                        let textoExibido = null;

                                                        if (col === "Ciclo Concluído" && rawResult) {
                                                            // Aqui o resultado é um Objeto { status, dataInicio }
                                                            textoExibido = rawResult.status;
                                                        } 
                                                        else {
                                                            // Para "Deve Ciclo" e outros, o resultado já é uma String direta
                                                            textoExibido = rawResult;
                                                        }

                                                        // --- ESTILIZAÇÃO ---
                                                        let classeEstilo = '';
                                                        if (textoExibido === 'Força') classeEstilo = styles.statusForca;
                                                        if (textoExibido === 'Fraqueza') classeEstilo = styles.statusFraqueza;
                                                        
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