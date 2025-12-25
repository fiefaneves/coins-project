import { useState } from 'react';
import styles from './Login.module.css'; // Importa o NOVO CSS

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  // Novo estado para controlar se está carregando
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setIsLoading(true); // 1. Começa a carregar (bloqueia o botão)

    try {
      // Simula um pequeno delay para ver o efeito de loading (pode remover depois)
      // await new Promise(resolve => setTimeout(resolve, 1000)); 
      
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (response.ok) {
        onLoginSuccess(data.token);
      } else {
        setErro(data.message || 'Erro ao entrar. Verifique suas credenciais.');
      }
    } catch (error) {
      setErro('Erro de conexão com o servidor. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false); // 3. Termina de carregar (libera o botão)
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
            disabled={isLoading} // Desativa se estiver carregando
          >
            {isLoading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}