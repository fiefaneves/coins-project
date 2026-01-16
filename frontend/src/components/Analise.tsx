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

// --- ALTERAÇÃO: LIMITES FIXOS UNIVERSAIS ---
const THRESHOLD_FORCA = 0.20;
const THRESHOLD_FRAQUEZA = -0.20;

// --- HELPERS ---

const toNum = (val: any) => {
    if (val === null || val === undefined || val === '') return null;
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? null : num;
};

interface PontoHistorico {
    data: string;
    valor: number | null;
}

const fmtData = (d: any) => {
    if (!d) return '';
    if (typeof d === 'string' && d.includes('-')) return d.split('T')[0];
    return String(d);
};

const getValoresPorTimeframe = (dadoBanco: any, time: string, dataReferencia: string): PontoHistorico[] => {
    if (!dadoBanco) return [];
    let lista: any[] = [];

    if (time === 'MN') lista = dadoBanco.historico_mn || [];
    if (time === 'W1') lista = dadoBanco.historico_w1 || [];
    if (time === 'D1') lista = dadoBanco.historico_d1 || [];

    if (['MN', 'W1', 'D1'].includes(time)) {
        return lista.map((item: any) => ({
            data: fmtData(item.data),
            valor: toNum(item.valor)
        }));
    }

    if (time === 'H4') {
        const h4Times = ['00', '04', '08', '12', '16', '20'];
        return h4Times.map(h => ({
            data: `${dataReferencia} ${h}:00`,
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

// --- LÓGICA DE CICLO SIMPLIFICADA ---
const calcularEstadoCiclo = (historico: PontoHistorico[]) => {
    // Agora usa as constantes globais, ignorando qual é a moeda
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
// (Removemos o parametro 'moeda' que não é mais usado no calculo de ciclo)
type CalculatorFunction = (valores: PontoHistorico[], moeda: string) => any;

const COLUNA_CALCULATORS: Record<string, CalculatorFunction> = {
    "Ciclo Concluído": (valores) => calcularEstadoCiclo(valores),
    
    "Deve Ciclo": (valores) => {
        const { status } = calcularEstadoCiclo(valores);
        if (status === 'Força') return 'Fraqueza';
        if (status === 'Fraqueza') return 'Força';
        return null;
    },
    
    // Futuras lógicas podem usar 'moeda' se necessário, por isso mantive na assinatura do tipo
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
        "Flutuante antes 21h": true,
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
                                            const valores = getValoresPorTimeframe(dadoBanco, time, selectedDate);                      
                                            
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
                                                        const valoresParaCalculo = valores.slice(0, -1);
                                                        
                                                        if (valoresParaCalculo.length === 0) return <td key={col}></td>; 

                                                        const rawResult = calculator ? calculator(valoresParaCalculo, moeda) : null;
                                                        
                                                        let textoExibido = null;
                                                        if (col === "Ciclo Concluído" && rawResult) textoExibido = rawResult.status;
                                                        else textoExibido = rawResult;

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