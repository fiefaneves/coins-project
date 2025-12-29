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

### Pré-requisitos
- Node.js (v18 ou superior).
- Acesso ao banco PostgreSQL (Nuvem/Aiven).

### Passo 1: Configuração do Backend

1. **Primeira vez?**
   Execute o arquivo `instalar.bat`. Ele vai baixar todas as bibliotecas necessárias para o Backend e Frontend.

2. **Configurar o Banco (Primeira vez)**
   Certifique-se de que criou o arquivo `.env` dentro da pasta `backend`.

3. **Rodar o Projeto**
   Execute o arquivo `iniciar.bat`.
   O sistema abrirá as janelas do servidor e do site automaticamente.
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001