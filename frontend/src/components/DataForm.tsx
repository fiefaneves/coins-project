import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from '../css/DataForm.module.css';
import { Modal } from './Modal';

type FormData = {
    data: string;
    moeda: string;
    mensal: string;
    semanal: string;
    diario: string;
    [key: string]: string; 
};

interface DataFormProps {
    editingId?: number | null; 
    onSuccess?: () => void;   
}

export function DataForm({ editingId, onSuccess }: DataFormProps) {
    const navigate = useNavigate();

    const hoje = new Date();
    const dataPadrao = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const [formData, setFormData] = useState<FormData>({
        data: dataPadrao,
        moeda: 'AUD',
        mensal: '',
        semanal: '',
        diario: '',
        h4_00: '', h4_04: '', h4_08: '', h4_12: '', h4_16: '', h4_20: '',
        ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => 
            [`h1_${i.toString().padStart(2, '0')}`, '']
        ))
    });

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);

    // Definir URL da API (ajuste se necessário)
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    // 1. Carrega dados se for Edição
    useEffect(() => {
        if (editingId) {
            setIsLoading(true);
            const token = localStorage.getItem('user_token');
            
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
    
    useEffect(() => {
        const autoFillCampos = async () => {
            // Se estiver editando (editingId existe), geralmente não queremos mudar os dados automaticamente
            // a menos que você queira permitir isso explicitamente. Por padrão, bloqueamos na edição.
            if (editingId) return; 
            
            if (!formData.data || !formData.moeda) return;

            const dateObj = new Date(formData.data + 'T12:00:00');
            const diaMes = dateObj.getDate();
            const diaSemana = dateObj.getDay(); // 0 = Domingo

            const isPrimeiroDia = (diaMes === 1);
            const isDomingo = (diaSemana === 0);

            // Se for dia 01 E Domingo, é tudo novo, não busca nada.
            if (isPrimeiroDia && isDomingo) return;

            try {
                const token = localStorage.getItem('user_token');
                const res = await axios.get(`${apiUrl}/api/pontos/ultimo`, {
                    params: { 
                        moeda: formData.moeda, 
                        data: formData.data 
                    },
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const { valor_mensal, valor_semanal } = res.data;

                // Helper para tratar valores nulos ou undefined como string vazia
                const safeStr = (val: any) => (val === null || val === undefined) ? '' : String(val);

                setFormData(prev => {
                    const novoEstado = { ...prev };
                    let mudou = false;

                    // LÓGICA CORRIGIDA:
                    // Removemos a verificação "&& valor !== ''". 
                    // Agora, se o banco mandar vazio (porque não achou registro), nós limpamos o campo.
                    
                    // REGRA MENSAL: Se não for dia 01, aplica o valor do banco (mesmo se for vazio)
                    if (!isPrimeiroDia && valor_mensal !== undefined) {
                        const novoMensal = safeStr(valor_mensal);
                        if (novoEstado.mensal !== novoMensal) {
                            novoEstado.mensal = novoMensal;
                            mudou = true;
                        }
                    }

                    // REGRA SEMANAL: Se não for Domingo, aplica o valor do banco (mesmo se for vazio)
                    if (!isDomingo && valor_semanal !== undefined) {
                        const novoSemanal = safeStr(valor_semanal);
                        if (novoEstado.semanal !== novoSemanal) {
                            novoEstado.semanal = novoSemanal;
                            mudou = true;
                        }
                    }

                    return mudou ? novoEstado : prev;
                });

            } catch (error) {
                console.log("Auto-fill info:", error);
            }
        };

        autoFillCampos();

    }, [formData.data, formData.moeda, editingId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (editingId) {
            setShowSaveModal(true);
        } else {
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

            if (editingId) {
                await axios.put(`${apiUrl}/api/pontos/${editingId}`, dadosParaEnviar, { headers });
                if (onSuccess) {
                    onSuccess(); 
                } else {
                    navigate('/dashboard');
                }
            } else {
                await axios.post(`${apiUrl}/api/pontos`, dadosParaEnviar, { headers });
                navigate('/dashboard');
            }

        } catch (error) {
            console.error('Erro:', error);
            setMessage('Erro ao enviar. Verifique se o servidor está rodando.');
            setIsError(true);
            setIsLoading(false);
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
                onConfirm={processSave}  
                onCancel={() => setShowSaveModal(false)}
            />
        </div>
    );
}