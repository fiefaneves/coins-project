import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../css/Analise.module.css';
import dashboardStyles from '../css/Dashboard.module.css'; 

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

// Extrai a lista de valores (scores) de um registro baseado no Timeframe
const getValoresPorTimeframe = (dadoBanco: any, time: string): (number | null)[] => {
    if (!dadoBanco) return [];

    if (time === 'MN') return [toNum(dadoBanco.valor_mensal)];
    if (time === 'W1') return [toNum(dadoBanco.valor_semanal)];
    if (time === 'D1') return [toNum(dadoBanco.valor_diario)];

    if (time === 'H4') {
        const h4Times = ['00', '04', '08', '12', '16', '20'];
        return h4Times.map(h => toNum(dadoBanco[`h4_${h}`]));
    }

    if (time === 'H1') {
        const h1Times = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
        return h1Times.map(h => toNum(dadoBanco[`h1_${h}`]));
    }

    return [];
};

// Lógica central do Ciclo Concluído
// Percorre a lista de valores e determina o estado final baseando-se na troca de limites
const calcularEstadoCiclo = (valores: (number | null)[], moeda: string) => {
    const limites = LIMITES_MOEDA[moeda] || DEFAULT_LIMIT;
    let ultimoEstado: 'Força' | 'Fraqueza' | null = null;

    for (const valor of valores) {
        if (valor === null) continue;

        if (valor >= limites.forca) {
            // Só muda para Força se não estiver em Força (ou se for o primeiro registro relevante)
            // A lógica "passar pela linha" implica atingir o valor.
            if (ultimoEstado !== 'Força') {
                ultimoEstado = 'Força';
            }
        } else if (valor <= limites.fraqueza) {
            if (ultimoEstado !== 'Fraqueza') {
                ultimoEstado = 'Fraqueza';
            }
        }
    }
    return ultimoEstado;
};

// --- MAPA DE CALCULADORAS POR COLUNA ---
// Aqui é onde você organiza a lógica de cada coluna nova.
type CalculatorFunction = (valores: (number | null)[], moeda: string) => string | null;

const COLUNA_CALCULATORS: Record<string, CalculatorFunction> = {
    "Ciclo Concluído": (valores, moeda) => {
        return calcularEstadoCiclo(valores, moeda);
    },
    
    "Deve Ciclo": (valores, moeda) => {
        const cicloAtual = calcularEstadoCiclo(valores, moeda);
        // Oposto do Ciclo Concluído
        if (cicloAtual === 'Força') return 'Fraqueza';
        if (cicloAtual === 'Fraqueza') return 'Força';
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
                                            const valores = getValoresPorTimeframe(dadoBanco, time);                                            
                                            
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
                                                        // Busca a função calculadora correta no mapa
                                                        const calculator = COLUNA_CALCULATORS[col];
                                                        
                                                        // Se existir calculadora, executa. Se não, retorna null (vazio).
                                                        const status = calculator ? calculator(valores, moeda) : null;
                                                        
                                                        // Define estilo baseado no resultado
                                                        let classeEstilo = '';
                                                        if (status === 'Força') classeEstilo = styles.statusForca;
                                                        if (status === 'Fraqueza') classeEstilo = styles.statusFraqueza;
                                                        
                                                        return (
                                                            <td key={col}>
                                                                {status && (
                                                                    <div className={`${styles.cellStatus} ${classeEstilo}`}>
                                                                        {status}
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