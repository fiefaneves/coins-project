import { useState, useEffect } from 'react';
import styles from '../css/Dashboard.module.css';
import { Modal } from './Modal';

// Definição dos tipos de dados que vêm do Backend
interface Ponto {
    id: number;
    data_registro: string; 
    moeda: string;
    responsavel: string;
    valor_mensal: number;
    valor_semanal: number;
    valor_diario: number;
}

interface DashboardProps {
    onNavigate: (screen: 'form' | 'analise') => void;
    onEdit?: (id: number) => void; 
    userNome: string;
}

export function Dashboard({ onNavigate, onEdit, userNome }: DashboardProps) {
    const [pontos, setPontos] = useState<Ponto[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [idToDelete, setIdToDelete] = useState<number | null>(null);

    useEffect(() => {
        const fetchPontos = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                const response = await fetch(`${apiUrl}/api/pontos`);
                const data = await response.json();
                setPontos(data);
            } catch (error) {
                console.error("Erro ao buscar dados:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPontos();
    }, []);

    const formatarData = (dataIso: string) => {
        if (!dataIso) return '-';
        
        // 1. Garante que pegamos só a parte da data (YYYY-MM-DD)
        // Isso resolve se vier "2026-01-07" ou "2026-01-07T00:00:00.000Z"
        const dataPura = dataIso.toString().split('T')[0]; 
        
        // 2. Divide os pedaços (Ano, Mês, Dia)
        const [ano, mes, dia] = dataPura.split('-');
        
        // 3. Monta no formato brasileiro manualmente
        return `${dia}/${mes}/${ano}`;
    };

    const handleClickDelete = (id: number) => {
        setIdToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!idToDelete) return;

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const token = localStorage.getItem('user_token');
            const response = await fetch(`${apiUrl}/api/pontos/${idToDelete}`, {
                method: 'DELETE',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setPontos(prev => prev.filter(p => p.id !== idToDelete));
            } else {
                alert('Erro ao excluir no servidor.');
            }
        } catch (error) {
            console.error(error);
            alert('Erro de conexão ao excluir.');
        } finally {
            setShowDeleteModal(false);
            setIdToDelete(null);
        }
    };

    // Data de hoje para o cabeçalho
    const hoje = new Date().toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.mainCard}>
                
                {/* --- HEADER --- */}
                <header className={styles.header}>
                    <div className={styles.userInfo}>
                        <img 
                            src="https://i.pravatar.cc/150?img=12" 
                            alt="Avatar" 
                            className={styles.avatar} 
                        />
                        <div>
                            <h1 className={styles.title}>Olá, {userNome || 'Investidor'}</h1>
                            <span className={styles.dateInfo}>{hoje}</span>
                        </div>
                    </div>
                    {/* Botão de Sair ou Configurações poderia ficar aqui */}
                </header>

                {/* --- CORPO DO DASHBOARD --- */}
                <div className={styles.contentBody}>
                    
                    {/* Barra de Ações Rápidas */}
                    <div className={styles.actionsBar}>
                        <div className={styles.actionButton} onClick={() => onNavigate('form')}>
                            <div className={styles.iconBox}>+</div>
                            <div className={styles.btnText}>
                                <span className={styles.btnTitle}>Nova Entrada</span>
                                <span className={styles.btnDesc}>Registrar operação</span>
                            </div>
                        </div>

                        <div className={styles.actionButton} onClick={() => onNavigate('analise')}>
                            <div className={styles.iconBox}>📈</div>
                            <div className={styles.btnText}>
                                <span className={styles.btnTitle}>Relatórios</span>
                                <span className={styles.btnDesc}>Ver performance</span>
                            </div>
                        </div>
                    </div>

                    {/* Seção da Tabela */}
                    <div className={styles.tableSection}>
                        <h3 className={styles.sectionTitle}>Registros Recentes</h3>
                        
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Moeda</th>
                                        <th>Mensal</th>
                                        <th>Semanal</th>
                                        <th>Diário</th>
                                        <th>Usuário</th>
                                        <th style={{textAlign: 'right'}}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={5} style={{textAlign:'center', padding:'2rem'}}>Carregando...</td></tr>
                                    ) : pontos.length === 0 ? (
                                        <tr><td colSpan={5} style={{textAlign:'center', padding:'2rem'}}>Nenhum registro encontrado.</td></tr>
                                    ) : (
                                        pontos.map((ponto) => (
                                            <tr key={ponto.id}>
                                                <td data-label="Data">{formatarData(ponto.data_registro)}</td>
                                                <td data-label="Moeda">
                                                    <span style={{fontWeight: 'bold'}}>{ponto.moeda}</span>
                                                </td>
                                                <td data-label="Mensal">{ponto.valor_mensal}</td>
                                                <td data-label="Semanal">{ponto.valor_semanal}</td>
                                                <td data-label="Diário">{ponto.valor_diario}</td>
                                                <td data-label="Usuário" style={{color: '#666', fontSize: '0.9rem'}}>
                                                    {ponto.responsavel || '-'}
                                                </td>
                                                <td data-label="Ações" style={{textAlign: 'right'}}>
                                                    {/* Botão Editar */}
                                                    <span 
                                                        className={styles.actionLink} 
                                                        onClick={() => onEdit && onEdit(ponto.id)}
                                                    >
                                                        Editar
                                                    </span>
                                                    
                                                    {/* Botão Excluir (Abre Modal) */}
                                                    <span 
                                                        className={styles.actionLink} 
                                                        style={{color:'#e53e3e'}}
                                                        onClick={() => handleClickDelete(ponto.id)}
                                                    >
                                                        Excluir
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- COMPONENTE MODAL (Invisível até ser ativado) --- */}
            <Modal 
                isOpen={showDeleteModal}
                title="Excluir Registro"
                message="Tem certeza que deseja excluir este registro? Esta ação moverá o item para a lixeira e só poderá ser desfeita pelo administrador."
                type="danger"
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteModal(false)}
            />
        </div>
    );
}