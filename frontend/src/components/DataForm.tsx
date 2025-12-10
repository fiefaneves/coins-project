import React, { useState } from 'react';
import axios from 'axios';
import styles from './DataForm.module.css';

// O Typescript dos campos
type FormData = {
    data: string;
    hora: string;
    moeda: string;
    mensal: string;
    semanal: string;
    diario: string;
    [key: string]: string; // Para H4 e H1 dinâmicos
};

function DataForm() {
    // 1. O estado (Tipado com o tipo que criamos acima)
    const [formData, setFormData] = useState<FormData>({
        data: '',
        hora: '',
        moeda: 'AUD',
        mensal: '',
        semanal: '',
        diario: '',
        // H4
        h4_00: '', h4_04: '', h4_08: '', h4_12: '', h4_16: '', h4_20: '',
        // H1
        h1_00: '', h1_01: '', h1_02: '', h1_03: '', h1_04: '', h1_05: '',
        h1_06: '', h1_07: '', h1_08: '', h1_09: '', h1_10: '', h1_11: '',
        h1_12: '', h1_13: '', h1_14: '', h1_15: '', h1_16: '', h1_17: '',
        h1_18: '', h1_19: '', h1_20: '', h1_21: '', h1_22: '', h1_23: '',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    // 2. Função genérica para atualizar o estado
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    // Adicionei uma função para formatar a data ao enviar o formulário
    const handleDateFormat = () => {
        if (formData.data.includes('-')) {
            const [year, month, day] = formData.data.split('-');
            setFormData(prevState => ({
                ...prevState,
                data: `${day}/${month}/${year}`
            }));
        }
    };

    // 3. Função para ENVIAR os dados
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setIsError(false);

        handleDateFormat(); // Formata a data antes de enviar

        try {
            await axios.post('http://localhost:3001/api/pontos', formData);
            setMessage('Dados enviados com sucesso!');
            setIsError(false);
            // Limpar os campos após o envio
            setFormData({
                data: '',
                hora: '',
                moeda: 'AUD',
                mensal: '',
                semanal: '',
                diario: '',
                h4_00: '', h4_04: '', h4_08: '', h4_12: '', h4_16: '', h4_20: '',
                h1_00: '', h1_01: '', h1_02: '', h1_03: '', h1_04: '', h1_05: '',
                h1_06: '', h1_07: '', h1_08: '', h1_09: '', h1_10: '', h1_11: '',
                h1_12: '', h1_13: '', h1_14: '', h1_15: '', h1_16: '', h1_17: '',
                h1_18: '', h1_19: '', h1_20: '', h1_21: '', h1_22: '', h1_23: '',
            });
        } catch (error) {
            console.error('Erro ao enviar dados:', error);
            setMessage('Erro ao enviar dados. Tente novamente.');
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    // Helpers para gerar os campos H4 e H1
    const h4Hours = ['00', '04', '08', '12', '16', '20'];
    const h1Hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

    // 4. Layout simplificado e vertical
    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit} className={styles.form}>
                
                {/* Seção Principal */}
                <div className={styles.section}>
                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className={styles.label}>Data:</label>
                            <input
                                className={styles.input}
                                type="text" // Alterado de "date" para "text" para suportar o formato personalizado
                                name="data"
                                value={formData.data}
                                onChange={handleChange}
                                placeholder="dd/mm/aaaa" // Adicionado placeholder para orientar o usuário
                                required
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Hora:</label>
                            <input
                                className={styles.input}
                                type="time"
                                name="hora"
                                value={formData.hora}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className={styles.label}>Moeda:</label>
                            <select
                                className={styles.input}
                                name="moeda"
                                value={formData.moeda}
                                onChange={handleChange}
                                required
                            >
                                <option value="AUD">AUD</option>
                                <option value="CAD">CAD</option>
                                <option value="CHF">CHF</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="JPY">JPY</option>
                                <option value="NZD">NZD</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Timeframes */}
                <div className={styles.section}>
                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className={styles.label}>Mensal:</label>
                            <input
                                className={styles.input}
                                type="text"
                                name="mensal"
                                value={formData.mensal}
                                onChange={handleChange}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Semanal:</label>
                            <input
                                className={styles.input}
                                type="text"
                                name="semanal"
                                value={formData.semanal}
                                onChange={handleChange}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Diário:</label>
                            <input
                                className={styles.input}
                                type="text"
                                name="diario"
                                value={formData.diario}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {/* H4 */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>H4:</h3>
                    <div className={styles.gridH4}>
                        {h4Hours.map(hour => (
                            <div key={`h4_${hour}`} className={styles.field}>
                                <label className={styles.label}>{hour}:00:</label>
                                <input
                                    className={styles.input}
                                    type="text"
                                    name={`h4_${hour}`}
                                    value={formData[`h4_${hour}`] as string}
                                    onChange={handleChange}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* H1 */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>H1:</h3>
                    <div className={styles.gridH1}>
                        {h1Hours.map(hour => (
                            <div key={`h1_${hour}`} className={styles.field}>
                                <label className={styles.label}>{hour}:00:</label>
                                <input
                                    className={styles.input}
                                    type="text"
                                    name={`h1_${hour}`}
                                    value={formData[`h1_${hour}`] as string}
                                    onChange={handleChange}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mensagem e Botão */}
                {message && (
                    <div className={`${styles.message} ${isError ? styles.messageError : styles.messageSuccess}`}>
                        {message}
                    </div>
                )}
                
                <button
                    type="submit"
                    className={styles.button}
                    disabled={isLoading}
                >
                    {isLoading ? 'Enviando...' : 'Enviar Dados'}
                </button>

            </form>
        </div>
    );
}

export default DataForm;