import { useState } from 'react';
import styles from '../css/Login.module.css';

interface LoginProps {
  onLoginSuccess: (token: string, nome: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setIsLoading(true); 

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    try {     
      const response = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (response.ok) {
        onLoginSuccess(data.token, data.usuario.nome);
      } else {
        setErro(data.message || 'Erro ao entrar. Verifique suas credenciais.');
      }
    } catch (error) {
      setErro('Erro de conexão com o servidor. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h2 className={styles.loginTitle}>Acesso ao Sistema</h2>
        
        {erro && <div className={styles.errorMessage}>{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input 
              id="email"
              type="email" 
              className={styles.input}
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="exemplo@coins.com"
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="senha" className={styles.label}>Senha</label>
            <input 
              id="senha"
              type="password" 
              className={styles.input}
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              placeholder="Sua senha"
              required 
            />
          </div>

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}