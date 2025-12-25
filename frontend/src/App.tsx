import { useState, useEffect } from 'react';
import { DataForm } from './components/DataForm'; // Note que não usamos mais default export
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import './App.css';

// Definição das telas possíveis
type Screen = 'login' | 'dashboard' | 'form' | 'analise';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Verificar login ao iniciar
  useEffect(() => {
    const tokenSalvo = localStorage.getItem('user_token');
    if (tokenSalvo) {
      setToken(tokenSalvo);
      setCurrentScreen('dashboard'); // Se já logado, vai para Dashboard
    } else {
      setCurrentScreen('login');
    }
  }, []);

  const handleLogin = (novoToken: string) => {
    localStorage.setItem('user_token', novoToken);
    setToken(novoToken);
    setCurrentScreen('dashboard'); // Login sucesso -> Dashboard
  };

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    setToken(null);
    setCurrentScreen('login');
  };

  const handleEditRequest = (id: number) => {
    setEditingId(id);
    setCurrentScreen('form');
  };

  const handleNewRequest = () => {
    setEditingId(null);
    setCurrentScreen('form');
  };

  // Função para adicionar botão "Voltar" no DataForm
  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <Login onLoginSuccess={handleLogin} />;
      
      case 'dashboard':
        return (
          <Dashboard 
            onNavigate={(screen) => {
              if (screen === 'form') handleNewRequest(); // Se for novo, limpa ID
              else setCurrentScreen(screen);
            }}
            onEdit={handleEditRequest} // Passa função de editar
            userNome="Admin" // Exemplo de nome de usuário
          />
        );
      
      case 'form':
        return (
          <div>
            <div style={{ maxWidth: '1000px', margin: '1rem auto', padding: '0 20px' }}>
              <button 
                onClick={() => {
                    setEditingId(null); // Limpa ao voltar
                    setCurrentScreen('dashboard');
                }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#555', fontSize: '1rem' }}
              >
                ← Voltar
              </button>
            </div>
            {/* Passamos o ID para o DataForm saber se é edição ou novo */}
            <DataForm editingId={editingId} onSuccess={() => setCurrentScreen('dashboard')} />
          </div>
        );

      case 'analise':
        return (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <h2>Tela de Análise</h2>
                <p>Em construção...</p>
                <button onClick={() => setCurrentScreen('dashboard')}>Voltar</button>
            </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {/* Cabeçalho Global (Só aparece se estiver logado) */}
      {token && (
        <header style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '10px 20px', 
            background: '#fff', 
            borderBottom: '1px solid #eee' 
        }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#333' }}>Sistema Coins</h2>
          <button 
            onClick={handleLogout} 
            style={{ 
                background: '#e53e3e', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '4px',
                cursor: 'pointer' 
            }}
          >
            Sair
          </button>
        </header>
      )}
      
      {/* Área Principal */}
      <main style={{ background: '#f7fafc', minHeight: 'calc(100vh - 60px)' }}>
        {renderScreen()}
      </main>
    </div>
  );
}

export default App;