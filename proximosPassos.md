# Próximos Passos - 16/01/2026
## TO-DO ✅
- [✅] Campo mensal e semanal mudam so no primeiro dia do mes e no domingo, respectivamente. Se não for o primeiro dia do mês, pode puxar o último valor do mês. Se não for domingo, pode puxar o último valor da semana.
- [✅] Filtro por moeda em Dashboard
- [✅] Tirar coluna de hora de Dashboard
- [✅] Incluir Mensal Semanal e Diário em Dashboard
- [✅] Exibir erro ao tentar dar entrada numa moeda/data que já existe
- [✅] Dois botões em DataForm -> Salvar e Sair , Salvar e Nova Entrada
- [✅] Ocultar colunas em Analise (Botão de configuração para manipular as colunas que quer enxergar)
- [✅] Retirar limite variável por moeda, todas tem -0.20 e 0.20 como threshold de fraqueza e força

## Implementação das Fórmulas - Análise
- FORÇA E FRAQUEZA

### [✅] Ciclo concluido x Deve ciclo
- Explicação em imagem
![Ciclo Análise](images/ciclo_analise.jpeg)
- Um é o oposto do outro, ou seja, se `Ciclo Concluído = FORÇA`, então `Deve Ciclo = FRAQUEZA`.
- Por exemplo, no caso da moeda AUD:
  - Existem 2 pontos que definem a força e a fraqueza: 0.20 e -0.20.
  - Quando ultrapassa o 0.20, conclui o ciclo de força, após o próximo score.
  - Quando ultrapassa o -0.20, conclui o ciclo de fraqueza, após o próximo score.
  - Se um score passa pela linha de fraqueza, sobe sem passar pela linha de força e cai novamente para linha de fraqueza, esse segundo momento não é o ciclo concluído, o que fica armazenado ainda é o primeiro pois isso será importante para outro parâmetro posteriormente. A mesma coisa acontece com o ciclo de força.

### [✅] Flutuante
- Apenas compara a última entrada com a penúltima e analisa se aumentou (Força) ou se diminuiu (Fraqueza)

#### Dúvida
- E se a variação de último para penúltimo for zero, ou seja, os valores forem iguais? (Discutir com Clovis e Luis). Por enquanto, se for igual, mantém neutro (vazio)