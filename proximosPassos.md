# Próximos Passos - 07/01/2026

## TO-DO 
- Análise de BUG - Data volta 1 dia quando entrada é feita pelo deploy. Pela aplicação local, tudo normal.
- Campo mensal e semanal mudam so no primeiro dia do mes e no domingo, respectivamente. Se não for o primeiro dia do mês, pode puxar o último valor do mês. Se não for domingo, pode puxar o último valor da semana.

## Implementação das Fórmulas - Análise
- FORÇA E FRAQUEZA --> armazenar na tabela de moedas (cada uma tem seu valor)

### Ciclo concluido x Deve ciclo
- Explicação em imagem
![Ciclo Análise](images/ciclo_analise.jpeg)
- Um é o oposto do outro, ou seja, se `Ciclo Concluído = FORÇA`, então `Deve Ciclo = FRAQUEZA`.
- Por exemplo, no caso da moeda AUD:
  - Existem 2 pontos que definem a força e a fraqueza: 0.20 e -0.20.
  - Quando ultrapassa o 0.20, conclui o ciclo de força, após o próximo score.
  - Quando ultrapassa o -0.20, conclui o ciclo de fraqueza, após o próximo score.
  - Se um score passa pela linha de fraqueza, sobre sem passar pelo de força e cai novamente para linha de fraqueza, esse segundo momento não é o ciclo concluído, o que fica armazenado ainda é o primeiro pois isso será importante para outro parâmetro posteriormente. A mesma coisa acontece com o ciclo de força.