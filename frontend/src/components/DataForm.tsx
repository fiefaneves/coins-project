import React, { useState } from 'react';
import axios from 'axios';
import styles from './DataForm.module.css';

type FormData = {
    data: string;
    hora: string;
    moeda: string;
    mensal: string;
    semanal: string;
    diario: string;
    [key: string]: string; 
};

export function DataForm() { // Mudado para export function nomeada (padrão melhor)
    
    // Estado inicial
    const [formData, setFormData] = useState<FormData>({
        data: '',
        hora: '',
        moeda: 'AUD',
        mensal: '',
        semanal: '',
        diario: '',
        // H4
        h4_00: '', h4_04: '', h4_08: '', h4_12: '', h4_16: '', h4_20: '',
        // H1 (inicializando vazio)
        ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => 
            [`h1_${i.toString().padStart(2, '0')}`, '']
        ))
    });

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    // Formata DD/MM/AAAA -> AAAA-MM-DD se necessário, ou mantém string para o backend tratar
    const handleDateFormat = () => {
        // A lógica de formatação idealmente deve ser feita no envio ou usar input date
        // Mantendo sua lógica original visual:
        if (formData.data.includes('-') && !formData.data.includes('/')) {
             const [year, month, day] = formData.data.split('-');
             setFormData(prev => ({ ...prev, data: `${day}/${month}/${year}` }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setIsError(false);

        handleDateFormat();

        try {
            // RECUPERAR O TOKEN DO LOGIN
            const token = localStorage.getItem('user_token');

            await axios.post('http://localhost:3001/api/pontos', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`, // Enviando o crachá!
                    'Content-Type': 'application/json'
                }
            });

            setMessage('Dados registrados com sucesso!');
            setIsError(false);
            
            // Resetar formulário (mas manter a moeda pode ser útil, aqui resetei tudo)
            setFormData(prev => ({
                ...prev,
                data: '',
                hora: '',
                mensal: '', semanal: '', diario: '',
                h4_00: '', h4_04: '', h4_08: '', h4_12: '', h4_16: '', h4_20: '',
                ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => 
                    [`h1_${i.toString().padStart(2, '0')}`, '']
                ))
            }));

        } catch (error) {
            console.error('Erro:', error);
            setMessage('Erro ao enviar. Verifique se o servidor está rodando.');
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const h4Hours = ['00', '04', '08', '12', '16', '20'];
    const h1Hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

    return (
        <div className={styles.container}>
            <div className={styles.formCard}>
                
                <header className={styles.header}>
                    <h2 className={styles.title}>Nova Entrada de Mercado</h2>
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

                    {/* Feedback e Botão */}
                    {message && (
                        <div className={`${styles.message} ${isError ? styles.messageError : styles.messageSuccess}`}>
                            {message}
                        </div>
                    )}
                    
                    <div className={styles.buttonContainer}>
                        <button type="submit" className={styles.button} disabled={isLoading}>
                            {isLoading ? 'Salvando...' : 'Registrar Entrada'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}