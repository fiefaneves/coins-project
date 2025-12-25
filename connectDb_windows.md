# Conectar ao Banco de Dados via Terminal (Windows)

## Passo 1: Instalar o PostgreSQL

Se o PostgreSQL ainda não estiver instalado, siga as instruções abaixo para instalá-lo no Windows:

1. Baixe o instalador do PostgreSQL no site oficial: [PostgreSQL Downloads](https://www.postgresql.org/download/).
2. Execute o instalador e siga as instruções:
   - Escolha os componentes necessários (certifique-se de incluir o pgAdmin).
   - Defina uma senha para o usuário `postgres`.
   - Escolha a porta padrão (5432) ou configure outra, se necessário.
3. Após a instalação, abra o `SQL Shell (psql)` ou o pgAdmin para gerenciar o banco de dados.

---

## Passo 2: Configurar o Banco de Dados

### 2.1: Aceder ao Terminal do Banco de Dados
Para acessar o terminal `psql` no Windows:

1. Abra o menu Iniciar e procure por `SQL Shell (psql)`.
2. Clique para abrir o terminal.
3. Insira as informações solicitadas:
   - Host: `localhost`
   - Porta: `5432`
   - Nome do banco de dados: `postgres`
   - Nome do usuário: `postgres`
   - Senha: (a senha definida durante a instalação)

### 2.2: Criar a Base de Dados `coins_db`
No terminal do `psql`, execute o seguinte comando para criar a base de dados:

```sql
CREATE DATABASE coins_db;
```

### 2.3: Criar um Utilizador e Definir Permissões
Crie um novo utilizador para o projeto e defina uma senha:

```sql
CREATE USER coins_user WITH PASSWORD 'sua_senha_segura';
```

Conceda permissões ao utilizador para a base de dados:

```sql
GRANT ALL PRIVILEGES ON DATABASE coins_db TO coins_user;
```

Saia do terminal `psql`:

```sql
\q
```

---

## Passo 3: Conectar-se à Base de Dados

### 3.1: Configurar o Arquivo `.env` no Projeto
No diretório `backend`, crie um arquivo `.env` (se ainda não existir) e adicione as seguintes variáveis de ambiente:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coins_db
DB_USER=coins_user
DB_PASSWORD=sua_senha_segura
```

### 3.2: Verificar a Conexão no Projeto
Certifique-se de que o arquivo `db.js` no diretório `src/config` está configurado para usar as variáveis de ambiente. O código deve ser semelhante a:

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

module.exports = pool;
```

---

## Passo 4: Testar a Conexão

### 4.1: Iniciar o Servidor Backend
Abra o Prompt de Comando ou o PowerShell, navegue até o diretório `backend` e execute o seguinte comando para iniciar o servidor:

```cmd
npm start
```

Verifique os logs para garantir que a conexão com o banco de dados foi bem-sucedida.

---

## Passo 5: Gerenciar o Banco de Dados

### 5.1: Aceder ao Terminal do Banco de Dados
Abra novamente o `SQL Shell (psql)` e conecte-se ao servidor PostgreSQL com as credenciais fornecidas durante a instalação.

### 5.2: Comandos Úteis no `psql`
- Visualizar todas as tabelas:
  ```sql
  \dt
  ```
- Executar consultas SQL:
  ```sql
  SELECT * FROM nome_da_tabela;
  ```
- Sair do terminal:
  ```sql
  \q
  ```

---

## Passo 6: Testar a Conexão com o DBeaver

O DBeaver é uma ferramenta gráfica para gerenciar bancos de dados. Siga os passos abaixo para testar a conexão com o PostgreSQL:

1. **Baixar e Instalar o DBeaver**:
   - Acesse o site oficial do DBeaver: [DBeaver Downloads](https://dbeaver.io/download/).
   - Baixe e instale a versão apropriada para o seu sistema operacional.

2. **Criar uma Nova Conexão**:
   - Abra o DBeaver.
   - Clique no botão `New Database Connection` (ou vá em `File > New > Database Connection`).
   - Selecione `PostgreSQL` na lista de bancos de dados e clique em `Next`.

3. **Configurar a Conexão**:
   - Preencha os campos com as informações do seu banco de dados:
     - **Host**: `localhost`
     - **Port**: `5432`
     - **Database**: `coins_db`
     - **Username**: `coins_user`
     - **Password**: `sua_senha_segura`
   - Clique em `Test Connection` para verificar se a conexão está funcionando.

4. **Salvar e Conectar**:
   - Se o teste de conexão for bem-sucedido, clique em `Finish`.
   - Agora você pode explorar o banco de dados `coins_db` no painel do DBeaver.

---

Com essas instruções, qualquer pessoa pode configurar e utilizar o banco de dados `coins_db` no Windows para o projeto, incluindo testar a conexão com o DBeaver.
