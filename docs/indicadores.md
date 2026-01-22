# Documentação de Lógica e Indicadores Técnicos

Este documento descreve detalhadamente a implementação matemática e lógica dos indicadores utilizados na matriz de Análise Técnica do projeto.

## 1. Definições Globais e Constantes

Para garantir consistência em todos os cálculos, utilizamos os seguintes limiares (*thresholds*) definidos no código (`Analise.tsx`):

* **LIMIAR DE FORÇA (`THRESHOLD_FORCA`):** `>= 0.20`
* **LIMIAR DE FRAQUEZA (`THRESHOLD_FRAQUEZA`):** `<= -0.20`
* **ZONA NEUTRA:** Valores entre `-0.19` e `0.19`.

## 2. Indicadores Implementados

### 2.1. Ciclo Concluído
**Conceito:** Representa a tendência consolidada do mercado *antes* do período atual começar. Serve como uma "bússola" de longo prazo para aquele timeframe.

**Lógica de Implementação:**
1.  **Exclusão do Presente:** O algoritmo ignora propositalmente a vela/registro atual (em aberto). Utiliza-se `historico.slice(0, -1)`.
2.  **Máquina de Estados (Histerese com Memória):**
    * O algoritmo percorre o histórico do passado para o presente.
    * Se o valor atingir `>= 0.20`, o estado vira **FORÇA**.
    * Se o valor atingir `<= -0.20`, o estado vira **FRAQUEZA**.
    * Se o valor estiver na **Zona Neutra** (ex: 0.05), o estado **mantém o anterior**.

**Exemplo:**
> Se o ciclo estava em FORÇA e o valor cai para 0.10, ele continua em FORÇA. Ele só mudará para FRAQUEZA se o valor cair abaixo de -0.20.

### 2.2. Deve Ciclo
**Conceito:** Um indicador preditivo baseado na teoria de reversão à média ou equilíbrio de mercado. Assume que, se um ciclo se concluiu com força, o mercado buscará equilíbrio (fraqueza) e vice-versa.

**Lógica de Implementação:**
1.  Calcula-se o **Ciclo Concluído** (vide item 2.1).
2.  Aplica-se a inversão lógica:
    * Se Ciclo Concluído = **FORÇA** → Deve Ciclo = **FRAQUEZA**.
    * Se Ciclo Concluído = **FRAQUEZA** → Deve Ciclo = **FORÇA**.
    * Se Ciclo Concluído = Nulo → Deve Ciclo = Nulo.

### 2.3. Flutuante
**Conceito:** Indica o *momentum* imediato ou a direção da força no momento presente. É sensível ao contexto temporal (Timeframe) para comparações justas.

**Lógica Geral:**
Comparação entre o `Valor Atual` e um `Valor de Referência`.
* `Valor Atual > Valor Referência` = **FORÇA**
* `Valor Atual < Valor Referência` = **FRAQUEZA**

**Regras de Referência por Timeframe:**

| Timeframe | Regra de Referência | Descrição Técnica |
| :--- | :--- | :--- |
| **Mensal (MN)** | **Início do Mês Anterior** | Busca o primeiro registro válido a partir do dia 01 do mês passado. (Ex: Se hoje é 15/Jan, compara com 01/Dez). |
| **Semanal (W1)** | **Segunda-feira Anterior** | Busca o primeiro registro válido a partir da segunda-feira da semana passada. |
| **Diário (D1)** | **Dia Útil Anterior** | Compara com o último registro válido disponível (`n-1`). Ignora fins de semana automaticamente. |
| **H4 / H1** | **Vela Anterior** | Compara com o fechamento da vela imediatamente anterior (`n-1`). |

### 2.4. Flutuante no Sentido
**Conceito:** É um indicador de confirmação (confluência). Ele verifica se a *expectativa matemática* de reversão ("Deve Ciclo") está alinhada com a *realidade imediata* do preço ("Flutuante"). Quando ambos apontam para a mesma direção, temos um sinal técnico de alta confiabilidade.

**Lógica de Implementação:**
O cálculo é uma comparação booleana simples entre os resultados de dois outros indicadores já calculados:

1.  Obtém-se o resultado de **Deve Ciclo** (Força/Fraqueza).
2.  Obtém-se o resultado de **Flutuante** (Força/Fraqueza).
3.  Aplica-se a regra de confluência:
    * Se `Deve Ciclo == FORÇA` **E** `Flutuante == FORÇA` → Resultado: **FORÇA**.
    * Se `Deve Ciclo == FRAQUEZA` **E** `Flutuante == FRAQUEZA` → Resultado: **FRAQUEZA**.
    * Em qualquer outro caso (divergência) → Resultado: **NULO** (Neutro/Vazio).

**Interpretação:**
* **Badge Verde (Força):** O ciclo anterior sugeriu compra e o preço *já está* subindo. Sinal forte de entrada.
* **Badge Vermelho (Fraqueza):** O ciclo anterior sugeriu venda e o preço *já está* caindo. Sinal forte de entrada.
* **Vazio:** O mercado está indeciso ou em transição (ex: O ciclo sugere compra, mas o preço ainda está caindo).

## 3. Indicadores Pendentes / Em Construção

Os seguintes indicadores constam na interface mas aguardam definição de regra de negócio para implementação:

* **Construção:** (A definir)
* **Acúmulo:** (A definir)
* **Chão Acúmulo:** (A definir)
* **Teto Acúmulo:** (A definir)
* **Mudou:** (A definir)
* **Flutuante antes 21h:** (A definir)
* **Ponto de Parada:** (A definir)
* **Quebra de Score:** (A definir)
* **Permissão:** (A definir)
* **Não Operar:** (A definir)

## 4. Tratamento de Erros e Casos de Borda

* **Dados Insuficientes:** Se o histórico for menor que 2 registros, o Flutuante retorna `null`.
* **Lateralização Longa:** Como o Backend busca 120 registros, o sistema consegue identificar ciclos mesmo se o mercado ficar lateralizado por 3 meses (no diário) ou vários dias (no H4).
* **Sanitização:** O Backend converte explicitamente valores numéricos para `Float` e datas para Strings ISO, prevenindo erros de tipagem no Frontend.

## 5. Como Adicionar Novos Indicadores

1.  Abra `frontend/src/components/Analise.tsx`.
2.  Localize o objeto `COLUNA_CALCULATORS`.
3.  Adicione uma nova chave com o nome exato da coluna.
4.  Implemente a função recebendo `(valores, time)`.

```typescript
"Novo Indicador": (valores, time) => {
    // Lógica aqui...
    return "Resultado";
}