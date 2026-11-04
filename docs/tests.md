# Verificação — seleção e continuação de batalhas

Executada em 03/11/2026, com Chrome headless e servidor HTTP Python em `127.0.0.1:8000`. Testes reproduzíveis: abra `/docs/combat-tests.html` e `/docs/combat-tests.html?live=1` no servidor local.

## Resultado

- **34 verificações aprovadas** com respostas simuladas da API.
- **31 verificações aprovadas** com consulta real à API.
- Requisição real: **HTTP 200**, resposta de tipo **cors**; dados reconhecidos para **6 de 6** princesas.
- Sem erros JavaScript capturados durante a interação automatizada.
- Sem rolagem horizontal no viewport da aplicação de 390px.

## Fluxos testados

- Três princesas padrão, limite de três, substituição por outra princesa e bloqueio do início com duas escolhas.
- História usa as personagens selecionadas.
- Requisição `api.php`, metadados visíveis, descarte de URL insegura, fallback após falha de rede e JSON inesperado. Casos de erro e de URL insegura usam respostas simuladas, identificadas como tal.
- Defender: 12 de dano ao monstro, 6 de resposta; crítico de ataque; dano recebido zero com armadura suficiente.
- Ataque letal não recebe contra-ataque; recompensa e ação não se repetem após vitória.
- Botão Próxima batalha, vida preservada, terceiro combate e avanço de andar.
- Clique duplicado não pula batalha.
- XP excedente, bloqueio até duas escolhas de evolução, repetição do atributo Vida e ganhos dobrados na evolução para nível 6.
- Chances dos monstros nos limites de 30%/75% e teto de nível 10.
- Game Over bloqueia avanço; nova aventura começa com HP e progresso iniciais.
- Sequência de 30 monstros mais chefe, garantias dos resgates nos andares 8/9 e terceira princesa após o chefe.

O teste dos 31 encontros usa um estado de teste com dano alto para isolar progressão e garantir que o percurso é finito. Não mede dificuldade nem comprova o balanceamento da campanha. Esses atributos especiais existem apenas no teste.

## Ainda não verificado

Teste visual manual, toque em aparelho físico, timeout real da API e balanceamento completo. Ranking continua pendente. API externa pode mudar ou ficar indisponível; nesse caso a interface identifica o catálogo offline.

## Atualização — itens e persistência (03/11/2026)

Execução em Chrome headless pelo runner `python docs/run-browser-tests.py`, com servidor local em porta temporária e perfil de navegador isolado. Após os ajustes, as três suítes passaram: **92 verificações de itens + 35 de regressão + 10 de persistência nativa = 137**. A suíte de persistência foi repetida isoladamente após correções das expectativas e esperas do próprio teste.

### Itens e interface

- Valores de espada, escudo e amuleto por raridade; ausência de bônus acumulados após dez trocas.
- Substituição de equipamento com inventário cheio; desequipar bloqueado sem espaço, sem perda de item.
- Amuleto de Vida sem cura ao equipar; limite de HP ao retirar; cálculo percentual sem perda por ponto flutuante.
- Dano, Sorte efetiva e defesa conforme as fórmulas do GDD. Armadura temporária atua somente na base; Defender fortalece somente o escudo. Arredondamento no resultado final.
- Cura por raridade, limite de Vida e recusa de consumo com Vida cheia.
- Poções só entre combates; renovação sem empilhar, cinco ações exatas, expiração na sexta ação e preservação entre andares.
- Fusões de todos os tipos, incluindo poções temporárias conforme solicitação do usuário. Testados inventário cheio, tipos/raridades incompatíveis, amuletos de atributos distintos, lendários, seleção duplicada e item ainda equipado.
- Recompensas únicas por andar; decisões obrigatórias, recebimento sem duplicação, inventário cheio, substituição explícita, cancelamento e descarte confirmado. Loot do andar 10 vem antes do chefe.
- Interface: detalhes, Equipar, Usar, Descartar, confirmação/cancelamento, dois slots de fusão, erro de incompatibilidade e exibição dos efeitos.
- Sem rolagem horizontal em 320, 390, 768 e 1280px. Atalhos de combate não atuam com uma janela aberta.
- Testes de itens e regressão usam armazenamento em memória no iframe; não sobrescrevem a campanha do jogador.

### Distribuições — 100 mil amostras por sorteio

Fonte pseudoaleatória determinística, tolerância de 0,6 ponto percentual por classe. Os limites exatos dos intervalos também foram testados, além de soma 100%, pesos não negativos e lendário ≤5% para níveis 1–10 e várias Sortes, incluindo decimais e saturação.

| Sorteio | Contagens observadas, na ordem das categorias |
|---|---|
| Quantidade: 1 / 2 / 3 | 50.156 / 35.059 / 14.785 |
| Tipo: espada / escudo / amuleto / cura / dano / armadura | 25.149 / 19.887 / 14.931 / 30.087 / 4.904 / 5.042 |
| Raridade inicial: comum / incomum / raro / épico / lendário | 79.127 / 14.943 / 4.991 / 939 / 0 |
| Raridade com qualidade máxima, mesma ordem | 0 / 34.699 / 37.454 / 22.911 / 4.936 |

As amostras podem oscilar em torno do percentual teórico; o teto de 5% é da probabilidade calculada.

### Persistência com recarregamento real

`storage-tests.html?isolated=1` foi executado pelo runner em origem local e perfil temporários, com **localStorage nativo**, sem substituição por mock. O navegador realmente recarregou a aplicação repetidas vezes.

- Estado completo recuperado: equipamentos, inventário, princesas e sua ordem, HP/XP, fusão, drops pendentes e efeitos.
- Recebimentos não reaparecem como recompensas após atualizar.
- Atualizar durante a batalha mantém HP do inimigo e turnos restantes das poções.
- Atualizar após vitória não repete XP, drop ou decremento de efeito.
- Derrota por ações reais remove a campanha; atualizar não restaura seus itens.
- JSON corrompido, versão incompatível, IDs duplicados e erro de gravação também foram testados na suíte de itens, sem travar o jogo.

As fixtures de interface fornecem itens para tornar os casos de inventário cheio e fusão reproduzíveis. Não são recompensas extras da campanha normal. Teste de toque em celular físico e validação visual manual continuam pendentes.
