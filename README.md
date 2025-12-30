# Sistema de Investimento em Moedas (Coins System)

## 1. Introdução

### 1.1. Visão Geral do Projeto
O projeto consiste em uma aplicação web Fullstack (React + Node.js) desenvolvida para substituir planilhas de análise manual de mercado financeiro (Forex). O sistema centraliza a entrada de dados técnicos e macroeconômicos, armazena-os de forma segura em nuvem e prepara a base para um motor de cálculo de sinais técnicos (Ciclos, Contrações, Acúmulos).

Atualmente, o sistema já conta com autenticação segura, dashboard de gerenciamento e formulários complexos para registro de dados em timeframes H1 (horário) e H4 (4 horas).

### 1.2. Objetivos Principais
- **Centralizar Dados**: Substituir planilhas locais por um banco de dados relacional na nuvem (PostgreSQL/Aiven).
- **Integridade de Dados**: Garantir que existe apenas um registro consolidado por par de moeda/dia (Lógica de Upsert).
- **Segurança**: Controle de acesso via Login (JWT) e criptografia de senhas.
- **Preparação para Análise**: Estruturar os dados brutos para alimentar o futuro motor de cálculo de indicadores.

---

## 2. Tecnologias Utilizadas

- **Frontend**: React (Vite), TypeScript, CSS Modules, React Router DOM.
- **Backend**: Node.js, Express.
- **Banco de Dados**: PostgreSQL (Hospedado na Aiven).
- **Autenticação**: JSON Web Token (JWT) e Bcrypt.
- **Driver de Banco**: node-postgres (`pg`).

---

## 3. Funcionalidades Implementadas

### RF 1.0: Gestão de Acesso
- [x] Login de usuários com email e senha.
- [x] Criptografia de senha utilizando `bcrypt`.
- [x] Geração de Token de Acesso (JWT) com expiração.
- [x] Proteção de Rotas no Frontend (Redirecionamento para login se não autenticado).
- [x] Script de "Seed" para criação/reset do usuário Admin.

### RF 2.0: Entrada e Gestão de Dados
- [x] **Dashboard**: Listagem das entradas ordenadas por data e hora.
- [x] **Formulário de Entrada**:
  - Cadastro de dados Macro (Mensal, Semanal, Diário).
  - Cadastro de estrutura H4 (6 campos: 00h, 04h, 08h, 12h, 16h, 20h).
  - Cadastro de estrutura H1 (24 campos: 00h até 23h).
- [x] **Lógica de Unicidade (Upsert)**:
  - O sistema impede duplicidade. Se o usuário tentar salvar uma entrada para uma Moeda/Data que já existe, o sistema atualiza o registro existente (sobrescreve) em vez de criar um novo.
- [x] **Edição**: Capacidade de carregar dados existentes e atualizar valores.
- [x] **Navegação**: Fluxo fluido entre Dashboard, Nova Entrada e Edição.

### RF 3.0: Funcionalidades Planejadas (Em Breve)
- [ ] Motor de Cálculo (Cálculo automático de Ciclos e Permissões).
- [ ] Visualização Colorida (Dashboard com indicadores visuais de Força/Fraqueza).
- [ ] Cadastro de Feriados.
- [ ] Filtros avançados no Dashboard.

---

## 4. Estrutura do Banco de Dados

O projeto utiliza um banco PostgreSQL relacional normalizado:

- **usuarios**: Armazena credenciais e dados de acesso.
- **moedas**: Tabela de domínio/auxiliar. Contém a lista oficial de moedas operadas.
- **entradas_mercado**: Tabela "Pai". Armazena Data, Hora, Moeda e valores Macro.
- **entradas_h4**: Tabela "Filha". Armazena os 6 pontos de H4 vinculados à entrada pai.
- **entradas_h1**: Tabela "Filha". Armazena os 24 pontos de H1 vinculados à entrada pai.

---

## 5. Como Rodar o Projeto (Windows)

### 5.1. Pré-requisitos (O que baixar antes)
#### A) Instalando o Git (Para baixar o projeto)
O Git é a ferramenta que vai "clonar" (baixar) o código para sua máquina.
1. Acesse o site oficial: [git-scm.com/downloads](https://git-scm.com/downloads).
2. Clique em **"Download for Windows"**.
3. Baixe a versão **"64-bit Git for Windows Setup"**.
4. Execute o instalador.
   - **Dica:** Pode clicar em "Next" (Próximo) em todas as telas até finalizar. As configurações padrão são perfeitas.
5. Para testar se funcionou: Abra o seu "Prompt de Comando" (CMD) e digite `git --version`. Se aparecer um número, deu certo!

#### B) Instalando o Node.js (Para rodar o projeto)
1. Acesse: [nodejs.org](https://nodejs.org).
2. Baixe a versão **LTS** (Recomendada).
3. Instale (Next, Next, Finish).

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
1. Cole o arquivo `.env` disponível no link [Arquivo](https://drive.google.com/file/d/1CUeXBLNBxlOZbUSe1BmF8iZzfkCJoCQQ/view?usp=sharing) na pasta `backend` 

#### Passo 4: Iniciar o Sistema
1. Dê dois cliques no arquivo `start.bat`.
2. O sistema abrirá as janelas do servidor e o site carregará no seu navegador automaticamente.
- Frontend: http://localhost:5173 
- Backend: http://localhost:3001