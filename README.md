# DanMachi

Protótipo acadêmico em HTML, CSS e JavaScript nativos, sem build, dependências ou áudio. Regras: [DanMachi_GAME_DESIGN.md](./DanMachi_GAME_DESIGN.md).

## Executar

Na pasta do projeto: `python -m http.server 8000 --bind 127.0.0.1`.
Abra http://127.0.0.1:8000. Encerre com Ctrl+C.

## Jogar

1. Abra **Nova aventura** e escolha exatamente três princesas diferentes. Caroço, Fogo e Jujuba começam selecionadas; desmarque uma para substituí-la.
2. A tela consulta a API Fandom e mostra título, ID da página e link de origem nos cartões. Os resumos em português são locais. Se a consulta falhar, o catálogo offline permite jogar, com aviso e botão para tentar novamente.
3. Inicie a aventura. Use Atacar (A) ou Defender (D). Monstros sobreviventes respondem; ataques letais não recebem contra-ataque.
4. Após vencer, clique em **Próxima batalha**. Após três monstros, receba ou descarte cada recompensa e use **Avançar de andar**. A vida de Finn é mantida.
5. Ao subir de nível, escolha dois bônus antes de continuar. É permitido repetir o atributo. Os ganhos dobram a partir do nível 6.
6. Existem dez andares e um chefe depois do terceiro monstro do andar 10. As princesas são resgatadas em ordem sorteada uma vez por aventura, com garantias nos andares 8/9 e após o chefe.
7. Após Game Over ou vitória, **Nova aventura** retorna à seleção e permite reiniciar do zero.

**Continuar** retoma a aventura salva automaticamente neste navegador. Atualizar a página mantém campanha, HP, XP, itens, equipamentos, efeitos, seleção de fusão e recompensas pendentes. Os sorteios já realizados não são repetidos. Game Over remove somente o salvamento desta campanha. O aviso no rodapé informa se o navegador não permitir salvar.

## Itens e equipamentos

- Finn começa com espada comum (+10 dano), sem escudo, amuleto ou poções. Os três slots de equipamento não ocupam os cinco espaços do inventário.
- Entre combates, toque/clique em um item para abrir seus detalhes. **Equipar** troca o item e devolve o equipamento anterior ao espaço liberado pelo novo, inclusive com inventário cheio. **Desequipar** exige um espaço livre.
- **Usar** consome uma poção. Cura recupera 7/10/15/20/30 HP conforme a raridade, limitada ao máximo; se a Vida já estiver cheia, a poção não é desperdiçada. Dano e Armadura dão +30% por cinco ações de Finn. Reutilizar renova a duração sem acumular potência. A mudança de andar não consome ações.
- **Descartar**, com ícone de lixeira, pede confirmação. Cancelar mantém o item.
- Nos detalhes de dois itens, escolha **Fusão 1** e **Fusão 2**, depois pressione **Fundir**. Exige itens diferentes, mesmo tipo e raridade; amuletos exigem também mesmo atributo. Lendários são bloqueados. A fusão consome dois itens e coloca o resultado em um dos espaços liberados, mesmo com inventário cheio. Os itens selecionados continuam no inventário até a confirmação da fusão.
- Há um sorteio por andar concluído: 1/2/3 itens com chances de 50/35/15%. Tipos seguem 25/20/15/30/5/5% para espada/escudo/amuleto/cura/dano/armadura. A raridade segue a fórmula de nível e Sorte efetiva do GDD, com teto de 5% para lendários.
- Recompensas ficam pendentes até **Receber** ou **Descartar recompensa**. Com inventário cheio, escolha explicitamente um item guardado para substituir; cancelar mantém ambos. É possível liberar espaço consumindo, descartando ou fundindo itens antes de receber.

As tabelas de equipamentos e a fórmula de combate do GDD foram mantidas: dano com multiplicadores de amuleto e poção; Armadura base com seus bônus; bônus do escudo separado e fortalecido em 40% ao Defender. Resultados finais são arredondados para baixo. Os atributos base não são alterados por equipamento. Amuletos de Vida não curam ao equipar e limitam a Vida atual ao retirar.

Conforme a solicitação desta implementação, **todas as categorias de poção podem ser fundidas**, substituindo a proposta anterior do GDD que restringia a fusão à cura. Poções de dano/armadura recebem raridade, mas mantêm +30% por cinco ações em qualquer raridade.

## Como testar

1. Inicie a aventura e vença os três monstros do primeiro andar. Confira de uma a três recompensas e que o avanço fica bloqueado até decidir sobre todas.
2. Receba um equipamento, abra seus detalhes entre combates e equipe. Confira o slot separado, os atributos efetivos e o retorno do equipamento anterior ao inventário. Desequipe com espaço livre.
3. Abra um item e descarte: primeiro cancele e verifique que foi mantido; depois confirme. Com cinco itens, tente receber um drop: cancele a substituição e depois escolha qual item descartar.
4. Com Finn ferido, use uma poção de cura. Use uma poção de dano/armadura no intervalo e acompanhe as cinco ações restantes. Avance de andar e confira que a mudança não reduz o contador.
5. Separe dois itens compatíveis nos slots de fusão, confirme e confira um item de raridade superior. Experimente tipos/raridades diferentes, amuletos de atributos distintos e lendários: os itens devem ser preservados e a mensagem explicar o impedimento.
6. Atualize a página com recompensas pendentes, após equipar, consumir e fundir, e durante combate. Confira que nada se duplica, o monstro mantém seu HP e os efeitos mantêm a duração restante. No menu, use **Continuar**.

Como drops são aleatórios, o roteiro pode exigir vários andares. Para testar todos os casos imediatamente, execute `python docs/run-browser-tests.py`: os testes usam itens preparados e salvamento isolado, sem modificar a campanha real. O script inicia/encerra seu próprio servidor e usa Chrome ou Edge headless instalado, sem dependências Python adicionais. É possível abrir `docs/item-tests.html` e `docs/combat-tests.html` no servidor local; o teste de armazenamento nativo deve ser executado pelo script, em perfil temporário.

## Arquivos

- `combat.js`: regras de combate, XP, evolução, encontros e resgates, sem DOM e com aleatoriedade injetável.
- `items.js`: itens, atributos efetivos, inventário, equipamentos, poções, fusão e sorteios.
- `item-ui.js`: detalhes, confirmações, inventário, fusão e tela de recompensas.
- `storage.js`: salvamento versionado, validação e recuperação de campanha.
- `script.js`: seleção, integração Fandom, navegação e apresentação.
- `index.html` / `style.css`: interface responsiva com arte provisória original.
- `docs/combat-tests.html`: testes de regras e interação no navegador; `?live=1` habilita a consulta real à Fandom.
- `docs/item-tests.html`: regras de itens, simulações de 100 mil amostras e fluxos de interface.
- `docs/storage-tests.html`: recarregamentos reais com localStorage nativo, executados pelo runner em perfil isolado.
- `docs/run-browser-tests.py`: execução automatizada no navegador; `--suite=item-tests`, `--suite=combat-tests` ou `--suite=storage-tests` seleciona uma suíte.

## Verificação e pendências

Em 03/11/2026, Chrome headless aprovou **92 verificações de itens, 35 de regressão e 10 de persistência nativa**, totalizando 137 verificações. A consulta real à Fandom havia sido validada na etapa anterior (HTTP 200, CORS e seis cartões atualizados); sua implementação foi preservada. Veja [docs/tests.md](./docs/tests.md).

Salas bônus, cronômetro e ranking online continuam pendentes. Os atributos iniciais e a progressão aprovada foram mantidos. A travessia dos 31 encontros é verificada com fixture de dano alto para isolar progressão; não é uma medição de balanceamento da campanha.

Não há backend configurado nem publicação. A única divergência em relação à proposta de itens do GDD é a fusão de poções temporárias solicitada pelo usuário, descrita acima.
