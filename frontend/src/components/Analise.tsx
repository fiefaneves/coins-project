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

interface AnaliseProps {
    onBack: () => void;
}

export function Analise({ onBack }: AnaliseProps) {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        carregarDados();
    }, [selectedDate]);

    const carregarDados = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('user_token');
            const res = await axios.get(`http://localhost:3001/api/analise?data=${selectedDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setDadosBrutos(res.data);
        } catch (error) {
            console.error("Erro ao carregar análise", error);
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA MOCK (Simulação) ---
    const getStatus = (moeda: string, time: string, coluna: string) => {
        // Simulação aleatória de status (Força, Fraqueza ou null)
        const rand = Math.random();
        if (rand > 0.6) return 'Força';
        if (rand < 0.2) return 'Fraqueza';
        return null; 
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
                                            // const dadoBanco = dadosBrutos.find(d => d.moeda === moeda); // (Será usado no futuro)
                                            
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
                                                        const status = getStatus(moeda, time, col);
                                                        
                                                        return (
                                                            <td key={col}>
                                                                {status && (
                                                                    <div className={`${styles.cellStatus} ${status === 'Força' ? styles.statusForca : styles.statusFraqueza}`}>
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