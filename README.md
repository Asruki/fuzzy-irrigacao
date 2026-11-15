# Simulador fuzzy Mamdani de irrigação

**Universidade Federal do Piauí · Inteligência Artificial · 2026.2**
Atividade Prática sobre Sistemas Fuzzy

## Autores

- Gabriel Sampaio Teixeira (20249023287)
- José Nelson (20249022083)
- Diego Bruno (20249021415)

## Links

- Aplicação publicada (GitHub Pages): `https://asruki.github.io/fuzzy-irrigacao/`
- Repositório público: `https://github.com/Asruki/fuzzy-irrigacao`
- 

## Descrição do modelo Mamdani

O sistema recomenda o tempo de irrigação `z` (0 a 30 min) a partir da umidade do solo `U` (0 a 100 %) e da temperatura `T` (10 a 40 °C). A inferência segue as cinco etapas do enunciado, todas implementadas em `fuzzy.js` sem nenhuma biblioteca de lógica fuzzy ou de IA:

1. **Fuzzificação:** calcula os três graus de pertinência de `U` e os três de `T` com funções trapezoidais `(a, b, c, d)`. O trecho de pertinência 1 (`b ≤ x ≤ c`) é avaliado antes das rampas, então `a = b` ou `c = d` nunca geram divisão por zero.
2. **Avaliação das regras:** `h(r) = min(μumidade(U), μtemperatura(T))` (operador E = mínimo).
3. **Implicação:** `μr(z) = min(h(r), μconsequente(z))`, ou seja, recorte do conjunto de saída. Regras com `h = 0` não contribuem.
4. **Agregação:** `μagregada(z) = max(μ1(z), …, μ9(z))`. Máximo, nunca soma.
5. **Defuzzificação:** centroide numérico por pontos médios, com `N = 30/Δz`, `z(k) = (k + 0,5)·Δz` e `z* = Σ z(k)·μ(z(k)) / Σ μ(z(k))`. Se o denominador for zero, a interface informa que não há saída válida (nunca devolve 0 nem `NaN`).

Os graus de pertinência são graus de compatibilidade com termos linguísticos, não probabilidades, e não precisam somar 1. O tempo calculado é resultado de inferência por regras, não de aprendizado.

### Conjuntos fixos

| Variável | Conjunto | (a, b, c, d) |
|---|---|---|
| Umidade (%) | seco | (0, 0, 20, 50) |
| | intermediário | (20, 50, 50, 80) |
| | úmido | (50, 80, 100, 100) |
| Temperatura (°C) | baixa | (10, 10, 15, 25) |
| | média | (15, 25, 25, 35) |
| | alta | (25, 35, 40, 40) |
| Tempo (min) | curto | (0, 0, 0, 15) |
| | médio | (0, 15, 15, 30) |
| | longo | (15, 30, 30, 30) |

### Base de regras padrão

| Regra | Umidade | Temperatura | Tempo |
|---|---|---|---|
| R1 | seco | baixa | médio |
| R2 | seco | média | longo |
| R3 | seco | alta | longo |
| R4 | intermediário | baixa | curto |
| R5 | intermediário | média | médio |
| R6 | intermediário | alta | longo |
| R7 | úmido | baixa | curto |
| R8 | úmido | média | curto |
| R9 | úmido | alta | curto |

Na interface só os consequentes são editáveis (curto, médio ou longo); os antecedentes são fixos e as nove regras ficam sempre preenchidas.

## Instruções de uso

1. Abra a aplicação no navegador (não precisa de login nem de instalação).
2. Informe a **umidade** e a **temperatura** (campo numérico ou deslizante). Valores iniciais: 35 % e 30 °C.
3. Opcionalmente, escolha o passo **Δz** (0,1; 0,05 ou 0,01 min) e altere o consequente de qualquer regra.
4. Clique em **Calcular** para executar toda a inferência, ou em **Avançar etapa** para percorrer as cinco etapas na ordem. As duas formas usam o mesmo resultado.
5. **Restaurar padrão** repõe entradas, regras e passo iniciais e limpa os resultados.

Ao mudar qualquer configuração, os resultados anteriores são limpos e a sequência de etapas reinicia. Campos vazios, texto não numérico, valores não finitos e valores fora dos intervalos **bloqueiam o cálculo** com mensagem clara; o valor nunca é corrigido silenciosamente.

Cada etapa mostra gráficos (conjuntos de entrada com marcação dos valores, recorte de uma regra escolhida, região agregada e centroide), tabelas com todos os graus (inclusive os iguais a zero) e um log textual.

Para rodar os testes: botão **Executar testes** no rodapé da página, ou `node tests.js` no terminal.

## Bibliotecas auxiliares

**Nenhuma.** HTML, CSS e JavaScript puros. Os gráficos são SVG gerado pelo próprio código (`app.js`).

## Estrutura do repositório

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Página e campos de configuração |
| `style.css` | Estilos |
| `fuzzy.js` | Motor Mamdani e validação de entradas (sem interface) |
| `app.js` | Estado, eventos, validação de formulário, gráficos e textos |
| `tests.js` | Testes da seção 6 (Node e navegador) |

## Resultados dos testes

Todos usam a base padrão e Δz = 0,1 min, salvo indicação contrária. Saída de `node tests.js`: **37 de 37 testes passaram**. Tolerâncias: 1e-6 para pertinências e ativações, 0,01 min para tempos.

### 6.1 Pertinências e extremos

| Entrada | Esperado | Obtido | Conclusão |
|---|---|---|---|
| U = 35 % (seco; interm.; úmido) | (0,5; 0,5; 0) | (0,5; 0,5; 0) | passou |
| T = 30 °C (baixa; média; alta) | (0; 0,5; 0,5) | (0; 0,5; 0,5) | passou |
| U = 0 % | (1; 0; 0) | (1; 0; 0) | passou |
| U = 100 % | (0; 0; 1) | (0; 0; 1) | passou |
| T = 10 °C | (1; 0; 0) | (1; 0; 0) | passou |
| T = 40 °C | (0; 0; 1) | (0; 0; 1) | passou |
| Varredura dos 9 conjuntos (5409 avaliações) | finitas, em [0, 1] | finitas, em [0, 1] | passou |

Não ocorreu divisão por zero em nenhum caso.

### 6.2 Ativação de uma única regra

| Entrada | Regra ativa | Tempo esperado | Tempo obtido | Conclusão |
|---|---|---|---|---|
| U = 20 %, T = 35 °C | R3 (h = 1), saída = longo completo | ≈ 25,00 | 24,999889 | passou |
| U = 50 %, T = 25 °C | R5 (h = 1), saída = médio completo | 15,00 | 15,000000 | passou |
| U = 80 %, T = 25 °C | R8 (h = 1), saída = curto completo | ≈ 5,00 | 5,000111 | passou |

Os valores 5 e 25 vêm do centroide dos triângulos de saída, não de seus picos. Por isso solo úmido não implica tempo zero neste modelo didático.

### 6.3 Inferência completa com sobreposição

Entrada U = 35 %, T = 30 °C, Δz = 0,1.

- Fuzzificação: seco = 0,5; intermediário = 0,5; úmido = 0; baixa = 0; média = 0,5; alta = 0,5.
- Regras ativadas: R2 → longo (h = 0,5); R3 → longo (h = 0,5); R5 → médio (h = 0,5); R6 → longo (h = 0,5). As demais têm ativação zero.
- Agregação (máximo): μ(0) = 0; μ(3) = 0,2; μ(7,5) = 0,5; μ(15) = 0,5; μ(30) = 0,5. As três regras que concluem *longo* não elevam a altura acima de 0,5.
- Tempo obtido: **16,785683 min** (tela: **16,79 min**). Referência do enunciado: 16,785683 (numérico) e 16,785714 (contínuo). Conclusão: passou.

### 6.4 Simetria, alteração de regras e precisão

| Teste | Esperado | Obtido | Conclusão |
|---|---|---|---|
| U = 35 %, T = 20 °C: ativadas R1, R2, R4, R5 (h = 0,5) | idem | idem | passou |
| Agregação em [0, 30] | constante em 0,5 | constante em 0,5 | passou |
| Tempo da simetria | 15,00 | 15,000000 | passou |
| Todas as regras → curto, U = 50 %, T = 25 °C | ≈ 5,00 | 5,000111 | passou |
| Restaurar padrão e recalcular (35 %, 30 °C) | 16,79 | 16,79 | passou |

**Efeito do passo Δz** (teste 6.3 repetido; centroide contínuo = 16,785714):

| Δz (min) | Esperado | Obtido | Erro vs. contínuo |
|---|---|---|---|
| 0,1 | 16,785683 | 16,785683 | 3,17e-5 |
| 0,05 | 16,785706 | 16,785706 | 7,94e-6 |
| 0,01 | 16,785714 | 16,785714 | 3,18e-7 |

Análise: a regra dos pontos médios aproxima a integral por retângulos. Como a área agregada é linear por partes, o erro vem só dos pontos de quebra (cantos) e cai aproximadamente com o **quadrado** do passo: dividir Δz por 2 (0,1 → 0,05) reduz o erro cerca de 4 vezes (3,17e-5 → 7,94e-6), e dividir por 10 (0,1 → 0,01) reduz cerca de 100 vezes. Com duas casas decimais o resultado é 16,79 nos três casos, então a mudança de passo só aparece nas casas seguintes. Passos menores aproximam melhor o centroide contínuo ao custo de mais pontos (N = 300, 600 ou 3000).

Alterar consequentes muda a forma da agregação e, portanto, o centroide: com todas as regras em *curto*, a entrada (50 %, 25 °C) passa de 15,00 min (R5 → médio) para ≈ 5,00 min (centroide do triângulo *curto*).

### 6.5 Interface e determinismo

- Bloqueiam o cálculo, sem correção silenciosa: U = −1 %, U = 101 %, T = 9 °C, T = 41 °C, campo vazio, somente espaços, texto não numérico, `NaN` e `Infinity`. Cada caso exibe mensagem clara. Conclusão: passou (9 de 9).
- Entrada válida com vírgula decimal (`35,5`) é aceita.
- Repetir a mesma configuração produz graus, ativações, área agregada e tempo idênticos (comparação do resultado completo serializado). **Calcular** e **Avançar etapa** usam o mesmo resultado, calculado uma única vez, então a saída final coincide. Gráficos e animações só leem esse resultado e não o alteram.
- Verificado também com um navegador simulado (jsdom): Calcular, passo a passo, limpeza ao alterar configuração, bloqueio de entradas inválidas e Restaurar padrão (35 %, 30 °C, regras e Δz iniciais, resultado 16,79 min).
