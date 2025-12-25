import { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';

interface Ponto {
    id: number;
    data_registro: string;
    hora_registro: string;
    moeda: string;
    tipo_entrada: string;
}

interface DashboardProps {
    onNavigate: (screen: 'form' | 'analise') => void;
    userNome?: string;
}

export function Dashboard({ onNavigate, userNome }: DashboardProps) {
    const [pontos, setPontos] = useState<Ponto[]>([]);

    useEffect(() => {
        fetch('http://localhost:3001/api/pontos')
            .then(res => res.json())
            .then(data => setPontos(data))
            .catch(err => console.error(err));
    }, []);

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };

    const hoje = new Date().toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.mainCard}>
                
                {/* Header fixo no topo do card */}
                <header className={styles.header}>
                    <div className={styles.userInfo}>
                        {/* A Imagem do Avatar */}
                        <img 
                            src="https://i.pravatar.cc/150?img=12"
                            alt="Avatar do usuário" 
                            className={styles.avatar} 
                        />
                        
                        {/* O bloco de texto que já existia */}
                        <div>
                            <h1 className={styles.title}>Olá, {userNome || 'Investidor'}</h1>
                            <span className={styles.dateInfo}>{hoje}</span>
                        </div>
                    </div>
                </header>

                {/* Corpo com rolagem interna */}
                <div className={styles.contentBody}>
                    
                    {/* Botões de Ação */}
                    <div className={styles.actionsBar}>
                        <div className={styles.actionButton} onClick={() => onNavigate('form')}>
                            <div className={styles.iconBox}>📈</div>
                            <div className={styles.btnText}>
                                <span className={styles.btnTitle}>Nova Entrada</span>
                                <span className={styles.btnDesc}>Registrar dados</span>
                            </div>
                        </div>

                        <div className={styles.actionButton} onClick={() => onNavigate('analise')}>
                            <div className={styles.iconBox}>📊</div>
                            <div className={styles.btnText}>
                                <span className={styles.btnTitle}>Dashboard</span>
                                <span className={styles.btnDesc}>Análise Técnica</span>
                            </div>
                        </div>
                    </div>

                    {/* Tabela expandida */}
                    <div className={styles.tableSection}>
                        <h3 className={styles.sectionTitle}>Últimos Registros</h3>
                        
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Moeda</th>
                                        <th>Data</th>
                                        <th>Hora</th>
                                        <th>Tipo</th>
                                        <th style={{textAlign: 'right'}}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pontos.map((ponto) => (
                                        <tr key={ponto.id}>
                                            <td data-label="Moeda"><strong>{ponto.moeda}</strong></td>
                                            <td data-label="Data">{formatDate(ponto.data_registro)}</td>
                                            <td data-label="Hora">{ponto.hora_registro}</td>
                                            <td data-label="Tipo">
                                                <span className={`${styles.badge} ${ponto.tipo_entrada === 'FINAL' ? styles.final : styles.parcial}`}>
                                                    {ponto.tipo_entrada}
                                                </span>
                                            </td>
                                            <td data-label="Ações" style={{textAlign: 'right'}}>
                                                <span className={styles.actionLink}>Editar</span>
                                                <span className={styles.actionLink} style={{color:'#e53e3e'}}>Excluir</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {pontos.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{textAlign: 'center', padding: '2rem', color: '#999'}}>
                                                Nenhum registro encontrado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}