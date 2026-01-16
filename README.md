# Sistema de Investimento em Moedas (Coins System)

## 1. Introdução

### 1.1. Visão Geral
O **Coins System** é uma aplicação web desenvolvida para substituir planilhas manuais de análise técnica no mercado financeiro (Forex). O sistema centraliza a entrada de dados, armazena histórico técnico (H1, H4, Diário, Semanal, Mensal) e processa automaticamente indicadores de força e fraqueza das moedas.

### 1.2. Principais Funcionalidades
* **Dashboard Interativo:** Visualização rápida das últimas entradas com filtro dinâmico por moeda.
* **Formulário Inteligente de entrada inteligente;**
* **Matriz de Análise Técnica:**
    * Cálculo automático de **Ciclos** (Força/Fraqueza) baseado em thresholds (±0.20).
    * Indicador **Flutuante**: Compara a força atual com o fechamento anterior instantaneamente.
    * Configuração de visualização: Oculte/Mostre colunas conforme a necessidade.

### 1.2. Objetivos Principais
- **Centralizar Dados**: Substituir planilhas locais por um banco de dados relacional na nuvem (PostgreSQL/Aiven).
- **Integridade de Dados**: Garantir que existe apenas um registro consolidado por par de moeda/dia (Lógica de Upsert).
- **Segurança**: Controle de acesso via Login (JWT) e criptografia de senhas.
- **Preparação para Análise**: Estruturar os dados brutos para alimentar o futuro motor de cálculo de indicadores.

---

## 2. Tecnologias Utilizadas

- **Frontend**: React (Vite), TypeScript, CSS Modules.
- **Backend**: Node.js, Express.
- **Banco de Dados**: PostgreSQL (Hospedado na Aiven).
- **Autenticação**: JSON Web Token (JWT) e Bcrypt.
- **Driver de Banco**: node-postgres (`pg`) com `dotenv`.

---

## 3. Funcionalidades Implementadas

### RF 1.0: Gestão de Acesso
- [x] Login de usuários com email e senha.
- [x] Criptografia de senha utilizando `bcrypt`.
- [x] Geração de Token de Acesso (JWT) com expiração.
- [x] Proteção de Rotas no Frontend (Redirecionamento para login se não autenticado).

### RF 2.0: Entrada e Gestão de Dados
- [x] **Dashboard Interativo**:
  - Listagem inteligente com colunas Macro (Mensal, Semanal, Diário).
  - **Filtro por Moeda**: Dropdown estilizado para isolar registros específicos.
- [x] **Formulário Inteligente de Entrada**:
  - **Cadastro Técnico Completo**: Interface estruturada para registro de viés Macro (Mensal, Semanal, Diário) e detalhamento intra-diário completo (6 campos para H4 e 24 campos para H1).
  - **Fluxo de Alta Produtividade**:
    - **"Salvar e Nova Entrada"**: Funcionalidade para *Batch Input* (preenchimento em lote), que salva o registro, limpa o formulário e mantém o foco para a próxima entrada sem recarregar a página.
    - **"Salvar e Sair"**: Fluxo padrão para registrar e retornar ao Dashboard.
  - **Validação de Integridade (Anti-Duplicidade)**: O sistema verifica automaticamente se já existe um registro para a combinação *Moeda + Data*. Caso exista, impede a criação de uma duplicata e alerta o usuário visualmente, evitando sobrescrita acidental de dados.
  - **Modo de Edição**: Reaproveita a interface para carregar dados existentes, permitindo correções rápidas em registros passados.

### RF 3.0: Motor de Análise Técnica
- [x] **Matriz de Decisão**: Tela dedicada para leitura de cenários de mercado.
- [x] **Cálculos Automáticos**:
  - **Ciclo Concluído**: Analisa histórico consolidado (excluindo atual) baseando-se em níveis de força (0.20) e fraqueza (-0.20).
  - **Deve Ciclo**: Lógica inversa para prever reversões.
  - **Flutuante**: Comparação dinâmica entre a última entrada e a penúltima para indicar a força do movimento atual.
- [x] **Customização de Visualização**: Menu de configuração para Ocultar/Exibir colunas da tabela de análise.
- [x] **Indicadores Visuais**: Feedback colorido (Verde/Vermelho) automático nas células de status.

### RF 4.0: Funcionalidades Planejadas (Backlog)
- [ ] **Expansão da Análise Técnica**: Implementação da lógica matemática para os indicadores avançados:
  - *Construção, Acúmulo, Chão/Teto de Acúmulo, Ponto de Parada, Quebra de Score e etc*
- [ ] **Cadastro de Feriados**: Módulo para registrar dias sem operação bancária, afetando a análise de volume.
- [ ] **Cadastro de usuários**: Possibilidade de cadastrar novos usuários via interface.
- [ ] **Área do usuário**: Armazena informações do usuário, como foto, nome, email, etc.
- [ ] **Relatórios de Performance**: Gráficos mostrando a assertividade das análises do usuário ao longo do tempo.
- [ ] **Exportação de Dados**: Funcionalidade para baixar o histórico em CSV/Excel.

---

## 4. Estrutura do projeto
```
coins-project/
├── backend/            # API (Node.js + Express)
│   ├── src/
│   │   ├── config/     # Conexão com Banco (db.js)
│   │   ├── controllers/# Lógica das rotas (Pontos, Login)
│   │   └── routes/     # Definição das rotas API
│   ├── .env            # Variáveis de Ambiente 
│   └── server.js       # Ponto de entrada
│
├── frontend/           # Interface (React + Vite)
│   ├── src/
│   │   ├── components/ # Telas (Dashboard, Analise, DataForm)
│   │   ├── css/        # Estilos Modulares
│   │   └── App.tsx     # Rotas do Frontend
│
├── install.bat         # Script de Instalação (Windows)
└── start.bat           # Script de Inicialização (Windows)
```
---

## 5. Como Rodar o Projeto (Windows)

### 5.1. Pré-requisitos (O que baixar antes)
#### A) Instalando o Git (Para baixar o projeto)
O Git é a ferramenta que vai "clonar" (baixar) o código para sua máquina.
1. Baixe o Git clicando no [link](https://github.com/git-for-windows/git/releases/download/v2.52.0.windows.1/Git-2.52.0-64-bit.exe)
2. Execute o instalador.
   - **Dica:** Pode clicar em "Next" (Próximo) em todas as telas até finalizar. As configurações padrão são perfeitas.
3. Para testar se funcionou: Abra o seu "Prompt de Comando" (CMD) e digite `git --version`. Se aparecer um número, deu certo!

#### B) Instalando o Node.js (Para rodar o projeto)
1. Baixe a o Node.js clincando no [link](https://nodejs.org/dist/v24.12.0/node-v24.12.0-x64.msi).
2. Execute o instalador (Next, Next, Finish).

---

### 5.2. Baixando e Rodando o Projeto
Agora que você tem as ferramentas, vamos colocar o sistema para funcionar.

#### Passo 1: Baixar o Código (Clonar)
1. Crie uma pasta no seu computador onde quer salvar o projeto.
2. Clique com o botão direito nessa pasta e selecione **"Abrir no terminal"**
3. Digite o comando abaixo e aperte Enter:
   ```bash
   git clone https://github.com/fiefaneves/coins-project.git

#### Passo 2: Instalação Automática
Entre na pasta que foi criada (`coins-project`). Você verá alguns arquivos `.bat`.
1. Dê dois cliques no arquivo `install.bat`.
2. Uma janela preta vai abrir e baixar todas as bibliotecas necessárias automaticamente. Aguarde até aparecer "Instalação Concluida".

#### Passo 3: Configurar o Banco de Dados (Apenas na 1ª vez)
1. Cole o arquivo `.env` disponível no link [Arquivo](https://drive.google.com/file/d/1CUeXBLNBxlOZbUSe1BmF8iZzfkCJoCQQ/view?usp=sharing) na pasta `backend`.
2. **ATENÇÃO:** Quando baixa o arquivo no Drive ele vem sem o ponto na frente (env), renomeie para .env (com o ponto na frente).

#### Passo 4: Iniciar o Sistema
1. Dê dois cliques no arquivo `start.bat`.
2. O sistema abrirá as janelas do servidor e o site carregará no seu navegador automaticamente.
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
3. Acesse o site pelo link: http://localhost:5173
