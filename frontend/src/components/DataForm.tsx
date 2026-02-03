import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from '../css/DataForm.module.css';
import { Modal } from './Modal';

// Definição dos tipos do formulário
type FormData = {
    data: string;
    moeda: string;
    mensal: string;
    semanal: string;
    diario: string;
    [key: string]: string; // Permite chaves dinâmicas como h4_00, h1_15...
};

interface DataFormProps {
    editingId?: number | null; // Se vier ID, é edição. Se null, é novo.
    onSuccess?: () => void;   
}

export function DataForm({ editingId, onSuccess }: DataFormProps) {
    const navigate = useNavigate();

    // Lógica de Data Padrão (Hoje)
    const getHojeFormatado = () => {
        const hoje = new Date();
        return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    };

    // --- LÓGICA DE RESTRIÇÃO DE MOEDAS (UX) ---
    const getMoedasPermitidas = () => {
        const usuarioNome = localStorage.getItem('user_name')?.toLowerCase() || '';
        
        if (usuarioNome === 'carlos') return ['AUD'];
        if (usuarioNome === 'clovis') return ['JPY'];
        if (usuarioNome === 'luis') return ['NZD'];
        
        // Admin ou outros usuários veem todas
        return ['AUD','CAD','CHF','EUR','GBP','JPY','NZD','USD'];
    };

    const moedasDisponiveis = getMoedasPermitidas();

    // Função auxiliar para gerar o estado inicial
    const getInitialState = (): FormData => ({
        data: getHojeFormatado(),
        moeda: moedasDisponiveis[0] || 'AUD',
        mensal: '',
        semanal: '',
        diario: '',
        h4_00: '', h4_04: '', h4_08: '', h4_12: '', h4_16: '', h4_20: '',
        ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => 
            [`h1_${i.toString().padStart(2, '0')}`, '']
        ))
    });

    const [formData, setFormData] = useState<FormData>(getInitialState());

    // Controle de qual ação tomar após salvar ('exit' = Dashboard, 'new' = Limpar e Continuar)
    const [actionAfterSave, setActionAfterSave] = useState<'exit' | 'new'>('exit');

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);

    useEffect(() => {
        if (!editingId && moedasDisponiveis.length > 0) {
            setFormData(prev => ({ ...prev, moeda: moedasDisponiveis[0] }));
        }
    }, [moedasDisponiveis, editingId]);

    // Carrega dados se for Edição
    useEffect(() => {
        if (editingId) {
            setIsLoading(true);
            const token = localStorage.getItem('user_token');
            
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            axios.get(`${apiUrl}/api/pontos/${editingId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => {
                const dados = res.data;
                const formatedData: any = { ...dados };

                if (formatedData.data && formatedData.data.includes('/')) {
                    const [dia, mes, ano] = formatedData.data.split('/');
                    formatedData.data = `${ano}-${mes}-${dia}`;
                }

                Object.keys(formatedData).forEach(key => {
                    if (formatedData[key] === null) formatedData[key] = '';
                    else formatedData[key] = String(formatedData[key]);
                });
                setFormData(formatedData);
            })
            .catch(err => {
                console.error("Erro ao carregar:", err);
                setMessage('Erro ao carregar dados para edição.');
            })
            .finally(() => setIsLoading(false));
        }
    }, [editingId]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Se estiver editando, pede confirmação
        if (editingId) {
            setShowSaveModal(true);
        } else {
            // Se for novo, salva direto
            processSave();
        }
    };

    const processSave = async () => {
        setShowSaveModal(false);
        setIsLoading(true);
        setMessage('');
        setIsError(false);

        try {
            const dataInvertida = formData.data.split('-').reverse().join('/');
            const dadosParaEnviar = { 
                ...formData,
                data: dataInvertida
            };

            const token = localStorage.getItem('user_token');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

            // --- Lógica de Edição ---
            if (editingId) {
                await axios.put(`${apiUrl}/api/pontos/${editingId}`, dadosParaEnviar, { headers });
                
                if (actionAfterSave === 'exit') {
                    if (onSuccess) onSuccess(); 
                    else navigate('/dashboard');
                } else {
                    // Se clicou em "Salvar e Novo" estando na edição, vai para a tela de Novo
                    navigate('/novo');
                }
            
            // --- Lógica de Nova Entrada ---
            } else {
                await axios.post(`${apiUrl}/api/pontos`, dadosParaEnviar, { headers });
                
                if (actionAfterSave === 'exit') {
                    navigate('/dashboard');
                } else {

                    setFormData(currentState => ({
                        ...getInitialState(),      // Pega o template limpo
                        data: currentState.data,   // Sobrescreve com a Data que estava no form
                        moeda: moedasDisponiveis[0] // Mantém a moeda restrita correta
                    }));

                    // Salvar e Novo: Reseta o formulário e exibe sucesso
                    setMessage('✅ Registro salvo com sucesso! Pronto para o próximo.');
                    setIsLoading(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }

        } catch (error: any) {
            console.error('Erro:', error);
            setIsError(true);
            setIsLoading(false);

            if (error.response) {
                // Se for erro 403 (Restrição de Moeda), APENAS mostra a mensagem.
                if (error.response.status === 403) {
                    setMessage(error.response.data.message || 'Ação não permitida para seu usuário.');
                    return; // PARE AQUI. Não faz logout.
                }

                // Se for erro 401 (Token Vencido), aí sim desloga.
                if (error.response.status === 401) {
                    alert('Sessão expirada. Faça login novamente.');
                    localStorage.removeItem('user_token');
                    navigate('/login');
                    return;
                }

                // Outros erros (ex: 400, 409, 500)
                setMessage(error.response.data.message || 'Erro ao processar requisição.');
            } else {
                setMessage('Erro de conexão. Verifique se o servidor está rodando.');
            }
        }
    };

    const h4Hours = ['00', '04', '08', '12', '16', '20'];
    const h1Hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

    return (
        <div className={styles.container}>
            <div className={styles.formCard}>
                
                <header className={styles.header}>
                    <h2 className={styles.title}>
                        {editingId ? `Editando Entrada #${editingId}` : 'Nova Entrada de Mercado'}
                    </h2>
                    <p className={styles.subtitle}>Preencha os dados técnicos para análise</p>
                </header>

                <form onSubmit={handleSubmit}>
                    
                    {/* Seção 1: Dados Gerais */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Informações Principais</h3>
                        <div className={styles.row}>

                            {/* CAMPO DE MOEDA ATUALIZADO COM RESTRIÇÃO */}
                            <div className={styles.field}>
                                <label className={styles.label}>Moeda</label>
                                <select 
                                    className={styles.select} 
                                    name="moeda" 
                                    value={formData.moeda} 
                                    onChange={handleChange}
                                    // Desabilita se só houver uma opção (melhor UX)
                                    disabled={moedasDisponiveis.length === 1 && !editingId}
                                >
                                    {moedasDisponiveis.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                {/* Feedback visual para o usuário restrito */}
                                {moedasDisponiveis.length === 1 && (
                                    <small style={{color: '#718096', fontSize: '0.85em', marginTop: '4px', display: 'block'}}>
                                        Você possui permissão apenas para {moedasDisponiveis[0]}
                                    </small>
                                )}
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Data</label>
                                <input className={styles.input} type="date" name="data" value={formData.data} onChange={handleChange} required />
                            </div>
                        </div>
                    </div>

                    {/* Seção 2: Macro Tendência */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Macro Tendência (Pontos)</h3>
                        <div className={styles.row}>
                            <div className={styles.field}>
                                <label className={styles.label}>Mensal</label>
                                <input className={styles.input} type="text" name="mensal" value={formData.mensal} onChange={handleChange} placeholder="0.00000" />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Semanal</label>
                                <input className={styles.input} type="text" name="semanal" value={formData.semanal} onChange={handleChange} placeholder="0.00000" />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Diário</label>
                                <input className={styles.input} type="text" name="diario" value={formData.diario} onChange={handleChange} placeholder="0.00000" />
                            </div>
                        </div>
                    </div>

                    {/* Seção 3: H4 */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Estrutura H4</h3>
                        <div className={styles.gridH4}>
                            {h4Hours.map(hour => (
                                <div key={`h4_${hour}`}>
                                    <span className={styles.miniLabel}>{hour}:00</span>
                                    <input
                                        className={`${styles.input} ${styles.compactInput}`}
                                        type="text"
                                        name={`h4_${hour}`}
                                        value={formData[`h4_${hour}`] as string}
                                        onChange={handleChange}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Seção 4: H1 */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Estrutura H1</h3>
                        <div className={styles.gridH1}>
                            {h1Hours.map(hour => (
                                <div key={`h1_${hour}`}>
                                    <span className={styles.miniLabel}>{hour}h</span>
                                    <input
                                        className={`${styles.input} ${styles.compactInput}`}
                                        type="text"
                                        name={`h1_${hour}`}
                                        value={formData[`h1_${hour}`] as string}
                                        onChange={handleChange}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Feedback Visual */}
                    {message && (
                        <div className={`${styles.message} ${isError ? styles.messageError : styles.messageSuccess}`}>
                            {message}
                        </div>
                    )}
                    
                    {/* Botões de Ação */}
                    <div className={styles.buttonContainer} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        
                        {/* Botão 1: Salvar e Continuar (Prioridade secundária visualmente, mas útil) */}
                        <button 
                            type="submit" 
                            className={styles.button} 
                            style={{ flex: 1, backgroundColor: '#2b6cb0', minWidth: '180px' }}
                            onClick={() => setActionAfterSave('new')}
                            disabled={isLoading}
                        >
                            {isLoading ? '...' : 'Salvar e Nova Entrada'}
                        </button>

                        {/* Botão 2: Salvar e Sair (Ação padrão) */}
                        <button 
                            type="submit" 
                            className={styles.button}
                            style={{ flex: 1, minWidth: '160px' }}
                            onClick={() => setActionAfterSave('exit')}
                            disabled={isLoading}
                        >
                            {isLoading ? '...' : 'Salvar e Sair'}
                        </button>
                    </div>

                </form>
            </div>

            {/* --- COMPONENTE MODAL DE CONFIRMAÇÃO --- */}
            <Modal 
                isOpen={showSaveModal}
                title="Salvar Alterações"
                message={`Tem certeza que deseja aplicar as alterações na entrada #${editingId}?`}
                type="confirm"
                onConfirm={processSave}  
                onCancel={() => setShowSaveModal(false)}
            />
        </div>
    );
}