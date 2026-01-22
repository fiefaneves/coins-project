import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import { DataForm } from './components/DataForm';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Analise } from './components/Analise';
import './App.css';
import axios from 'axios';

// Componente Wrapper para pegar o ID da URL e passar para o DataForm
const EditarWrapper = () => {
    const { id } = useParams();
    return <DataForm editingId={Number(id)} />;
};

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const navigate = useNavigate(); // Hook para navegar entre páginas

  // Verificar login ao iniciar
  useEffect(() => {
    const tokenSalvo = localStorage.getItem('user_token');
    const nomeSalvo = localStorage.getItem('user_name');

    if (tokenSalvo) {
      setToken(tokenSalvo);
      if (nomeSalvo) setUserName(nomeSalvo);

      if (window.location.pathname === '/' || window.location.pathname === '/login') {
          navigate('/dashboard');
      }
    } else {
      if (window.location.pathname !== '/login') {
         navigate('/login');
      }
    }

    // 2. CONFIGURAR INTERCEPTOR DO AXIOS (Para DataForm e Analise)
    // Se qualquer requisição retornar 401 (Não autorizado) ou 403 (Proibido), faz logout.
    const interceptor = axios.interceptors.response.use(
        response => response,
        error => {
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                handleLogout();
            }
            return Promise.reject(error);
        }
    );

    // Limpeza do interceptor ao desmontar
    return () => {
        axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const handleLogin = (novoToken: string, nome: string) => {
    localStorage.setItem('user_token', novoToken);
    localStorage.setItem('user_name', nome);
    setToken(novoToken);
    setUserName(nome);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_name');
    setToken(null);
    setUserName('');
    navigate('/login');
  };

  const irParaNovo = () => navigate('/novo');
  const irParaEditar = (id: number) => navigate(`/editar/${id}`);
  const irParaAnalise = () => navigate('/analise');

  return (
    <div className="app-container">
      {/* Cabeçalho Global */}
      {token && (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: '#fff', borderBottom: '1px solid #eee' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#333' }}>Sistema Coins</h2>
          <button 
            onClick={handleLogout} 
            style={{ background: '#e53e3e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Sair
          </button>
        </header>
      )}
      
      <main style={{ background: '#f7fafc', minHeight: 'calc(100vh - 60px)' }}>
        
        {/* DEFINIÇÃO DAS ROTAS */}
        <Routes>
          
          {/* Rota de Login */}
          <Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />
          
          {/* Rota Dashboard */}
          <Route path="/dashboard" element={
            token ? (
                <Dashboard 
                    // Adaptamos o Dashboard para usar as novas funções de rota
                    onNavigate={(screen) => {
                        if (screen === 'form') irParaNovo();
                        if (screen === 'analise') irParaAnalise();
                    }}
                    onEdit={irParaEditar} 
                    userNome={userName} 
                />
            ) : <Navigate to="/login" />
          } />
          
          {/* Rota Criar Novo (sem ID) */}
          <Route path="/novo" element={
             token ? (
                 <div>
                    <BotaoVoltar onClick={() => navigate('/dashboard')} />
                    <DataForm editingId={null} />
                 </div>
             ) : <Navigate to="/login" />
          } />

          {/* Rota Editar (com ID na URL) */}
          <Route path="/editar/:id" element={
             token ? (
                 <div>
                    <BotaoVoltar onClick={() => navigate('/dashboard')} />
                    <EditarWrapper />
                 </div>
             ) : <Navigate to="/login" />
          } />

          {/* Rota Análise */}
          <Route path="/analise" element={
             token ? <Analise onBack={() => navigate('/dashboard')} /> : <Navigate to="/login" />
          } />

          {/* Rota Padrão */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </main>
    </div>
  );
}

// Pequeno componente para o botão voltar não poluir o código principal
const BotaoVoltar = ({ onClick }: { onClick: () => void }) => (
    <div style={{ maxWidth: '1000px', margin: '1rem auto', padding: '0 20px' }}>
        <button 
            onClick={onClick}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#555', fontSize: '1rem' }}
        >
            ← Voltar
        </button>
    </div>
);

export default App;