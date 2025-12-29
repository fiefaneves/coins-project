import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from '../css/DataForm.module.css';
import { Modal } from './Modal';

// Definição dos tipos do formulário
type FormData = {
    data: string;
    hora: string;
    moeda: string;
    mensal: string;
    semanal: string;
    diario: string;
    [key: string]: string; // Permite chaves dinâmicas como h4_00, h1_15...
};

interface DataFormProps {
    editingId?: number | null; // Se vier ID, é edição. Se null, é novo.
    onSuccess?: () => void;    // Função para voltar ao dashboard
}

export function DataForm({ editingId, onSuccess }: DataFormProps) {
    const navigate = useNavigate();

    // Estado inicial com campos dinâmicos para H1
    const [formData, setFormData] = useState<FormData>({
        data: '',
        hora: '',
        moeda: 'AUD',
        mensal: '',
        semanal: '',
        diario: '',
        // Campos H4 iniciais
        h4_00: '', h4_04: '', h4_08: '', h4_12: '', h4_16: '', h4_20: '',
        // Gera campos H1 (h1_00 até h1_23)
        ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => 
            [`h1_${i.toString().padStart(2, '0')}`, '']
        ))
    });

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    // Estado para controlar o Modal de Confirmação
    const [showSaveModal, setShowSaveModal] = useState(false);

    // EFEITO: Carrega dados se for Edição
    useEffect(() => {
        if (editingId) {
            setIsLoading(true);
            const token = localStorage.getItem('user_token');
            
            axios.get(`http://localhost:3001/api/pontos/${editingId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => {
                const dados = res.data;
                // Converte tudo para string para o formulário não reclamar de null
                const formatedData: any = { ...dados };
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
    
    // Atualiza os inputs conforme digita
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    // 1. Função chamada pelo FORMULÁRIO (Botão Salvar/Registrar)
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Se for Edição, perguntamos antes (Abre o Modal)
        if (editingId) {
            setShowSaveModal(true);
        } else {
            // Se for Novo, salva direto
            processSave();
        }
    };

    // 2. Função REAL que manda para o Backend (chamada pelo Modal ou direto se for novo)
    const processSave = async () => {
        // Fecha o modal se estiver aberto
        setShowSaveModal(false);
        setIsLoading(true);
        setMessage('');
        setIsError(false);

        try {
            // Criamos uma cópia para enviar
            const dadosParaEnviar = { ...formData };
            
            // O Backend já tem helpers para tratar data (DD/MM/AAAA ou YYYY-MM-DD),
            // então enviamos como está no input.

            const token = localStorage.getItem('user_token');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            if (editingId) {
                // --- MODO EDIÇÃO (PUT) ---
                await axios.put(`http://localhost:3001/api/pontos/${editingId}`, dadosParaEnviar, { headers });
                
                // Se tiver função de sucesso (voltar pro dashboard), chama ela
                if (onSuccess) {
                    onSuccess(); 
                } else {
                    navigate('/dashboard');
                }
            } else {
                // --- MODO CRIAÇÃO (POST) ---
                await axios.post('http://localhost:3001/api/pontos', dadosParaEnviar, { headers });
                
                // SUCESSO! Agora redirecionamos para o Dashboard
                navigate('/dashboard');
            }

        } catch (error) {
            console.error('Erro:', error);
            setMessage('Erro ao enviar. Verifique se o servidor está rodando.');
            setIsError(true);
            // Só paramos o loading se der erro, pois se der sucesso vamos mudar de página
            setIsLoading(false);
        }
    };

    // Arrays auxiliares para gerar os inputs no JSX
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
                            <div className={styles.field}>
                                <label className={styles.label}>Moeda</label>
                                <select className={styles.select} name="moeda" value={formData.moeda} onChange={handleChange}>
                                    {['AUD','CAD','CHF','EUR','GBP','JPY','NZD','USD'].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Data</label>
                                <input className={styles.input} type="text" name="data" value={formData.data} onChange={handleChange} placeholder="DD/MM/AAAA" required />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Hora</label>
                                <input className={styles.input} type="time" name="hora" value={formData.hora} onChange={handleChange} required />
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
                    
                    {/* Botão de Envio */}
                    <div className={styles.buttonContainer}>
                        <button type="submit" className={styles.button} disabled={isLoading}>
                            {isLoading ? 'Processando...' : (editingId ? 'Salvar Alterações' : 'Registrar Entrada')}
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
                onConfirm={processSave}         // Ao confirmar, chama o processSave
                onCancel={() => setShowSaveModal(false)}
            />
        </div>
    );
}