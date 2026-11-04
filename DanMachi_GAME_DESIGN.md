# DanMachi — Game Design Document (GDD)

**Versão:** 1.0 — especificação para implementação e testes  
**Disciplina:** Técnicas de Programação com IA — UNISANTA — 2026/2  
**Projeto:** jogo web 2D, RPG de masmorra em turnos, inspirado em *Finn & Bones* e no universo de *Hora de Aventura*  
**Status:** regras principais aprovadas pelo autor; decisões de engenharia explicitadas como propostas quando necessário.

> **Missão do documento:** ser a fonte de verdade do Codex. Não modificar regras por conveniência sem sinalizar e pedir aprovação. O jogo deve cumprir a avaliação acadêmica: link público acessível no celular, ação real do jogador, feedback imediato, regras e pontuação, começo/meio/fim e reinício; implementar por etapas testáveis, com revisão e commits.

## 1. Visão geral

Finn atravessa uma masmorra de **10 andares**, enfrentando **3 monstros por andar**. O Rei Gelado é o chefe após os três combates do andar 10. Antes de jogar, o usuário escolhe **exatamente 3 princesas diferentes** a partir de um catálogo, inicialmente com Caroço, Fogo e Jujuba pré-selecionadas. A ordem de resgate é **sorteada uma vez por campanha**, salva e não muda ao recarregar. A história é montada por **modelos de texto predefinidos** usando os nomes, resumos em português e a ordem sorteada. A vitória ocorre ao derrotar o Rei Gelado e resgatar a terceira princesa.

**Público:** geral. **Visual:** pixel art 2D com interface típica de RPG (Finn e monstro frente a frente). **Áudio:** nenhum. **Controles:** teclado no desktop e toque/clique em botões equivalentes no celular. **Publicação:** GitHub Pages. **Ranking:** global, com serviço de dados externo e indicação honesta de indisponibilidade se não configurado.

### Objetivo acadêmico

- Abrir em um navegador desktop e celular usando um link público.
- Permitir escolher princesas e tomar decisões em cada combate.
- Mostrar imediatamente dano, defesa, crítico, XP, drops, resgate e outras consequências.
- Exibir 0–3 estrelas por princesas resgatadas, andar mais profundo e tempo ativo.
- Oferecer telas de vitória e Game Over, com opção de novo jogo.
- Variar encontros, loot, eventos e ordem das princesas.
- Evidenciar uso verdadeiro de API externa, tratar falhas e documentar o teste no navegador.
- Seguir etapas: **prompt → testar (navegador/F12) → entender alterações → commit**.

## 2. Escopo e prioridades

**Obrigatório para a versão final:** menu; escolha de princesas; consulta à API e fallback; história dinâmica; combate completo; 10 andares; XP/level up; equipamentos; inventário; fusão; poções; sala bônus; princesa 1/2/3; Rei Gelado; salvamento; ranking global; game over; vitória; controles mobile/teclado; publicação.

**Estratégia de implementação:** construir primeiro um ciclo completo jogável, testar, depois adicionar camadas. Não trocar HTML/CSS/JavaScript por React, canvas engine, backend próprio ou build system sem necessidade. Supabase é apenas a proposta de serviço externo para o ranking.

## 3. Estados e telas

1. **Menu inicial:** Nova aventura; Continuar (somente se houver campanha válida); Ranking; Como jogar.
2. **Seleção de princesas:** catálogo de personagens elegíveis, cartões com nome/resumo curto em português, imagem permitida ou placeholder e indicador da API; exatamente três escolhas, com padrão Caroço/Fogo/Jujuba; sem duplicatas.
3. **Introdução gerada:** narrativa baseada nos três nomes, características conhecidas e no sequestro. Ordem sorteada pertence ao estado da campanha; pode ficar oculta para não antecipar encontros.
4. **Tela de combate:** Finn vs. monstro, barras de HP, nível, progresso de XP, número do andar e combate (1/3 a 3/3), atributos, espada/escudo/amuleto, efeitos temporários, ações Atacar e Defender; registro de eventos legível.
5. **Intervalo entre combates:** usar poções, equipar/desquipar, descartar, fundir, inspecionar itens, continuar; não existe cura automática.
6. **Tela de evolução:** duas escolhas de atributos; o mesmo atributo pode ser escolhido duas vezes. Confirmar e exibir efeitos antes do próximo combate.
7. **Fim de andar:** sorteio de 1/2/3 recompensas; gerenciamento de inventário; tentativa de resgate; oferta de sala bônus se sorteada; prosseguir.
8. **Sala bônus:** sala de tesouro sem luta; escolha Entrar/Recusar; um loot adicional de raridade favorecida se entrar.
9. **Resgate:** cartão da princesa, resumo, estrela conquistada, pequeno texto narrativo.
10. **Rei Gelado:** confronto após os três monstros do andar 10, com barra de chefe.
11. **Fim de campanha:** vitória ou Game Over; estrelas, andar máximo e tempo ativo; registro de resultado global; Jogar novamente.
12. **Ranking global:** ordenação pública, status de carregamento/erro/reenvio e apelidos; não exibir dados pessoais.

**Navegação:** teclado (setas ou Tab para selecionar, Enter/Espaço para confirmar, Esc para voltar onde couber) e botões grandes para toque. Nunca depender de hover. Em telas pequenas priorizar layout vertical e textos legíveis.

## 4. Estado base e atributos do jogador

**Nível inicial:** 1. **Nível máximo:** 10.

| Atributo | Valor inicial | Cada escolha ao subir para nível 2–5 | Cada escolha ao subir para nível 6–10 |
|---|---:|---:|---:|
| Vida máxima | 20 | +5 | +10 |
| Dano base | 15 | +5 | +10 |
| Sorte | 5 | +2 | +4 |
| Armadura | 0 | +3 | +6 |

- A cada evolução o jogador recebe **duas escolhas**, incluindo repetição do mesmo atributo.
- O bônus dobrado passa a valer na evolução **5 → 6**.
- Nível 10 não recebe novas evoluções.
- Ao melhorar Vida, aumentar **vida máxima e vida atual** pelo valor ganho (sem superar a máxima).
- Máximos individuais (todos os 18 pontos aplicados ao mesmo atributo, sem equipamentos): **Vida 160, Dano 155, Sorte 61, Armadura 84**. Não são máximos simultâneos.
- Nenhuma regeneração entre combates ou andares. Cura somente com poções e aumento de Vida por evolução.

## 5. Combate por turnos

**Ordem de um turno:** Finn escolhe ação → calcular seu ataque → se inimigo sobreviver, inimigo contra-ataca → mostrar registro → decrementar efeitos temporários após a ação do Finn → verificar vitória/morte. Se o ataque mata, não existe contra-ataque.

### Atacar

- Causa **100% do dano** calculado.
- Probabilidade de crítico = **Sorte efetiva em %**, limitada entre 0% e 100%.
- Crítico apenas nesta ação: **2× o dano**, antes da Defesa do monstro.

### Defender

- Ainda ataca, mas causa **50% do dano** calculado.
- **Não pode critar**.
- Durante o contra-ataque correspondente, recebe **40% a mais de defesa proveniente do escudo**, não 40 pontos e não 40% de toda a armadura.
- Pode reduzir o dano inimigo a **zero**.

### Fórmulas definitivas propostas para implementação

Os números intermediários podem ser decimais; aplicar `floor` **uma única vez ao valor final**, para evitar arredondamento em cascata.

- `dano_ofensivo = DanoBaseFinn + BonusEspada`
- `multiplicador_dano = (1 + BonusAmuletoDano) × (1 + BonusPocaoDano)`
- `dano_ao_monstro = floor(max(0, dano_ofensivo × multiplicador_dano × FatorAcao × FatorCritico − DefesaMonstro))`
- `FatorAcao = 1.0` ao Atacar ou `0.5` ao Defender.
- `FatorCritico = 2` somente em Atacar com sucesso de crítico; nos demais casos `1`.
- `defesa_finn = ArmaduraBase × (1 + BonusAmuletoArmadura + BonusPocaoArmadura) + BonusEscudo × (1.4 se Defender, caso contrário 1)`.
- `dano_recebido = floor(max(0, DanoMonstro − defesa_finn))`.
- **Amuletos de Vida:** aumentam Vida máxima proporcionalmente à Vida base (arredondada para baixo), sem curar ao equipar; ao remover, limitar Vida atual à nova Vida máxima. Evita cura infinita trocando equipamentos.
- **Amuletos de Sorte:** aumentam a Sorte efetiva proporcionalmente à Sorte base; cálculo de chance pode conservar decimais.
- Mensagens diferentes para ataque, crítico, defesa, dano zero, derrota e recompensa.

### Regras operacionais a testar

- Finn pode anular completamente o ataque, inclusive no chefe.
- Ao matar um inimigo em um único ataque, não recebe dano de resposta.
- Efeitos de cinco rodadas contam **ações do Finn em combate**, não segundos, e persistem entre combates e andares.
- Poções são utilizáveis **apenas fora de combates**, nos intervalos.
- Uma derrota apaga a campanha e seus itens; resultados já registrados no ranking permanecem.

## 6. Monstros e chefe

Três combates obrigatórios por andar. O nível-base do monstro é o número do andar, máximo 10.

- Monstro 1: nível-base garantido.
- Monstro 2: **30%** de chance de ser nível-base +1, caso contrário nível-base.
- Monstro 3: **75%** de chance de ser nível-base +1, caso contrário nível-base.
- `nivelMonstro = min(10, nivelSorteado)`. No andar 10, os três serão nível 10.

### Fórmulas aprovadas

- Vida = `15 + 10 × nivelMonstro`.
- Dano = `3 + 3 × nivelMonstro`.
- Defesa = `2 × floor((nivelMonstro − 1)/3)`.

| Nível | HP | Dano | Defesa |
|---:|---:|---:|---:|
| 1 | 25 | 6 | 0 |
| 2 | 35 | 9 | 0 |
| 3 | 45 | 12 | 0 |
| 4 | 55 | 15 | 2 |
| 5 | 65 | 18 | 2 |
| 6 | 75 | 21 | 2 |
| 7 | 85 | 24 | 4 |
| 8 | 95 | 27 | 4 |
| 9 | 105 | 30 | 4 |
| 10 | 115 | 33 | 6 |

**Rei Gelado:** **190 HP, 46 Dano, 10 Defesa**, após os três combates do andar 10. Derrotá-lo leva à libertação da terceira princesa e à vitória; se Finn morrer, Game Over.

## 7. Experiência

Para nível atual `L` de 1 a 9, requisito da próxima evolução: `XP_necessario = 20 + 5 × (L − 1)`.

| L | XP para próximo |
|---:|---:|
| 1 | 20 |
| 2 | 25 |
| 3 | 30 |
| 4 | 35 |
| 5 | 40 |
| 6 | 45 |
| 7 | 50 |
| 8 | 55 |
| 9 | 60 |
| 10 | Nível máximo |

XP recebido em uma vitória, com base no nível do monstro **comparado ao nível atual de Finn**:

- Monstro abaixo: `floor(XP_necessario × 0.20)`.
- Monstro igual: `floor(XP_necessario × 0.30)`.
- Monstro acima: `floor(XP_necessario × 0.50)`.

Preservar XP excedente. Se XP permitir evoluções consecutivas, enfileirar as distribuições de pontos sem perder XP; congelar a próxima batalha até resolver escolhas. No nível 10, não gerar XP que produza novas evoluções. O chefe é a conclusão narrativa, não necessita conceder XP depois do encerramento.

## 8. Equipamentos e atributos de itens

**Início da campanha:** Finn possui **somente uma espada comum equipada (+10 dano)**. Não possui escudo, amuleto nem poção inicial. **Equipamentos não ocupam os cinco slots do inventário.**

| Raridade | Espada (+Dano) | Escudo (+Defesa) | Amuleto (bônus % do atributo) |
|---|---:|---:|---:|
| Comum | 10 | 5 | 5% |
| Incomum | 20 | 10 | 10% |
| Raro | 30 | 15 | 15% |
| Épico | 40 | 20 | 20% |
| Lendário | 50 | 25 | 25% |

Amuletos possuem **um atributo escolhido na geração do item**: Vida, Dano, Sorte ou Armadura. Um amuleto incomum de Dano dá +10% do Dano base; um amuleto comum de Sorte dá +5% da Sorte base. Somente um amuleto equipado.

## 9. Poções

### Poção de cura (raridade importa)

| Raridade | Cura |
|---|---:|
| Comum | 7 HP |
| Incomum | 10 HP |
| Rara | 15 HP |
| Épica | 20 HP |
| Lendária | 30 HP |

Vida restaurada = `min(VidaMaxima, VidaAtual + Cura)`. Pode ser **fundida** com outra poção de cura da **mesma raridade**.

### Poções temporárias

- **Dano:** +30% de dano por **5 ações de combate do Finn**.
- **Armadura:** +30% **somente da Armadura base do Finn**, não do escudo, por 5 ações de combate.
- Utilização somente entre combates; duração persiste ao mudar de andar.
- **Regra operacional proposta:** as poções temporárias têm efeito fixo e não são fundíveis; somente poções de cura participam do sistema de raridades/fusão. Isso evita raridades de buffs sem diferença mecânica. Se o autor preferir buffs com raridade, rever em outra versão.
- Duas poções do mesmo buff não empilham; usar uma nova reinicia a duração para cinco ações (proposta antiexploit).

## 10. Inventário, gerenciamento e fusão

- **Exatamente cinco slots** de armazenamento, distintos de espada/escudo/amuleto equipados.
- Selecionar item, inspecionar, equipar, usar quando permitido, descartar pelo botão **lixeira**, ou inserir na área de fusão.
- O item equipado que for substituído retorna ao inventário; caso não caiba, abrir escolha e impedir perda silenciosa.
- Se receber loot com inventário cheio: **pausar e solicitar escolha** entre descartar o novo ou descartar/substituir um item guardado; jamais apagar itens sem decisão.
- **Fusão:** exatamente dois itens de **mesmo tipo e mesma raridade**, consumidos para produzir um da raridade seguinte. No caso de **amuletos**, também exigir **mesmo atributo**. Espada + espada, escudo + escudo, poção de cura + poção de cura são válidos.
- Raridades: comum → incomum → raro → épico → lendário. **Lendários não podem ser fundidos.**
- Fusão inválida exibe explicação, sem consumir itens. Fusão bem-sucedida produz item no inventário; duas posições liberadas comportam o item resultante.
- Se uma das peças estiver equipada, exigir desequipar antes de fusão; validar espaço ao retornar ao inventário.

## 11. Drops: quantidade, categoria e raridade

### Quantidade ao completar **cada andar**

As probabilidades são **mutuamente exclusivas**, com um sorteio único:

| Quantidade | Probabilidade |
|---|---:|
| 1 item | 50% |
| 2 itens | 35% |
| 3 itens | 15% |

Sempre ao menos um item. Média esperada = **1,65 item por andar**. O andar 10 libera seu loot após os três monstros e antes do Rei Gelado.

### Categoria de cada item sorteado (aprovada)

- Espada: **25%**.
- Escudo: **20%**.
- Amuleto: **15%** (atributo sorteado de forma equilibrada entre quatro opções).
- Poção de cura: **30%**.
- Poção de Dano: **5%**.
- Poção de Armadura: **5%**.

Para espada/escudo/amuleto/cura, sortear raridade conforme a curva abaixo. Poções temporárias mantêm seu efeito fixo.

### Chance de raridade (aprovada)

Inicial: **79% comum, 15% incomum, 5% raro, 1% épico, 0% lendário**.

Para nível de Finn `L` e **Sorte efetiva** `S`:

- `q = min(79, max(0, 3 × (L − 1) + max(0, S − 5)))`.
- `legend = min(5, 0.07 × q)`.
- `excessoLegend = max(0, 0.07 × q − 5)`.
- `comum = 79 − q`.
- `incomum = 15 + 0.25 × q`.
- `raro = 5 + 0.40 × q + excessoLegend`.
- `epico = 1 + 0.28 × q`.
- `lendario = legend`.

As cinco chances somam 100%. O bônus é **+3 pontos de qualidade por nível acima do 1** e **+1 ponto de qualidade por Sorte acima da Sorte inicial 5**, mantendo exatamente a distribuição inicial no nível 1 / Sorte 5. A chance de lendário nunca supera **5%**. Usar decimais completos no sorteio, sem arredondar probabilidades para exibição/cálculo; mostrar percentuais formatados apenas na UI.

### Sala bônus

- Sorteio **independente de 10% uma vez por andar**.
- O jogador recebe uma oferta de entrar ou recusar, **sem combate**.
- Se entrar, recebe **um item extra**; não substitui os drops do andar.
- Raridade 50% favorecida: pegar as probabilidades normais, multiplicar os pesos de **incomum, raro, épico e lendário por 1,5**, manter o peso de comum, normalizar para 100% e, se a chance lendária ultrapassar 5%, limitar a 5% redistribuindo o excedente proporcionalmente entre as outras quatro raridades. É um bônus de pesos **relativos**, não +50 pontos percentuais. Quando comum tiver chance zero, o multiplicador igual sobre todas as outras raridades não altera a distribuição — limitação matemática esperada desta regra aprovada.
- Em caso de inventário cheio, usar a mesma seleção de descarte/substituição.

## 12. Princesas, API e história dinâmica

### Personagens

- As três opções pré-selecionadas são **Princesa Caroço, Princesa de Fogo e Princesa Jujuba**.
- O jogador escolhe exatamente três princesas **distintas** de um catálogo **curado com resumo revisado/traduzido previamente para português**.
- Consultar a **Adventure Time Wiki (Fandom), via MediaWiki Action API (`api.php`)** para recuperar dados públicos dos personagens. Usar os nomes/identificadores para relacionar a resposta aos resumos locais em português; imagens só se houver fonte e direito de uso adequado, com placeholder caso contrário.
- A API do Fandom pode ter restrições CORS, bloqueio de alguns endpoints, páginas ausentes e conteúdo em inglês. **Não presumir que já funciona.** Testar `api.php` de fato no navegador da aplicação (Network, status/JSON/CORS). Não mascarar falhas: mostrar status "catálogo offline" e usar catálogo local de reserva.
- Endpoint candidato, **sujeito a validação real**: `https://adventuretime.fandom.com/api.php` usando `action=query`, `list=categorymembers`, `cmtitle=Category:Princesses`, `format=json` e `origin=*` quando suportado. Para descrição, tentar as propriedades/extensões realmente disponíveis; não assumir que `extracts` ou `pageimages` funcionem nesse wiki.
- Incluir pelo menos as três princesas padrão no fallback local. Se a API listar outras personagens sem tradução curada, não mostrá-las como selecionáveis até existir resumo em português.
- **A API deve contribuir dados visíveis e demonstráveis**, não apenas uma requisição fictícia: cartões atualizados com metadados reais e indicação de origem/fallback.

### Ordem e probabilidade dos resgates

- Sortear as três princesas selecionadas **sem repetição**; salvar a ordem uma só vez.
- **1ª posição:** sorteio após concluir os combates de cada andar elegível; chance 10% no andar 1, crescimento linear até **100% no andar 8**: `min(1, 0.10 + (andar−1) × 0.90/7)`.
- **2ª posição:** apenas em **andares posteriores** ao resgate da primeira, nunca no mesmo andar. Primeiro andar elegível usa 10% (salvo se já for o andar 9); crescimento linear até **100% no andar 9**. Se seu primeiro andar elegível for `E < 9`, usar `min(1, 0.10 + (andar−E) × 0.90/(9−E))`. Se `E=9`, resgate garantido.
- **3ª posição:** sempre após a derrota do Rei Gelado no **andar 10**.
- Máximo de uma princesa encontrada por andar.
- Resgate concede **uma estrela**; máximo **três estrelas**.
- Os sorteios de resgate são após os combates do andar; a regra da terceira princesa após chefe tem prioridade no andar 10.

### História

- **Sem API de IA generativa.** História dinâmica a partir de **templates locais** de introdução, resgate e vitória, e de dados/resumos previamente localizados em português.
- Os três nomes escolhidos e as características dos resumos entram nos textos; ordem e textos selecionados são **persistidos**.
- Nenhum resumo externo deve ser inserido como HTML não confiável (usar texto seguro, sem `innerHTML` com conteúdo da API).
- Evitar reproduzir descrições extensas da wiki; usar resumos curtos e autoria própria/tradução revisada, com indicação de fonte quando apropriado.

## 13. Pontuação, cronômetro e ranking global

- **1 estrela por princesa resgatada**, máximo 3.
- Mostrar também **andar mais profundo** e **tempo ativo em segundos/minutos**.
- Tempo conta somente com partida aberta, em foco e não pausada; **não corre com a aba oculta, navegador fechado ou menu de pausa**. Persistir acumulado em salvamento; retomar sem contar período desconectado.
- Classificação: **mais estrelas primeiro; em empate, maior andar; persistindo empate, menor tempo ativo**.
- Permitir apelido público (3 a 20 caracteres; validar/escapar), sem necessidade de conta de usuário.
- Publicar resultado **ao encerrar vitória ou derrota**; um resultado por `id` de campanha para impedir duplicação por reenvio.

### Infraestrutura proposta: Supabase

GitHub Pages hospeda o frontend estático, **não** um banco global. Proposta: **Supabase (Postgres + Edge Function)**. O projeto e as credenciais ainda precisam ser configurados pelo usuário; **não afirmar que o ranking é global até testar múltiplos navegadores**.

- Estrutura de score: `attempt_id` (UUID único), `nickname`, `stars` (0–3), `deepest_floor` (1–10), `active_seconds` (>0), `finished` (boolean), `created_at` (servidor).
- RLS habilitado; frontend tem **apenas leitura** dos dados públicos necessários, sem `INSERT/UPDATE/DELETE` direto na tabela de ranking.
- Submissão por **Edge Function** com validação de esquema/faixas, tamanho do apelido, idempotência, limites de requisição e CORS da origem publicada. Uma função pública sem login não impede fraude deliberada; documentar isso como limitação do placar sem autenticação.
- **Nunca** enviar segredo, chave `service_role`/secret key ou credenciais administrativas para JavaScript ou GitHub. Usar chave publishable somente onde apropriado, e segredos apenas em função no servidor. Revisar documentação atual antes de aplicar migração/deploy.
- Se backend não estiver configurado ou estiver fora do ar, mostrar "Ranking global indisponível", guardar resultado **pendente** localmente para reenvio e permitir jogar. **Nunca** rotular um placar local como global.

## 14. Salvamento automático

- Salvar `gameState` versionado no `localStorage` após escolhas, sorteios, combates, XP/evolução, equipamento, poções, fusão, drops, resgates, andamento de sala e cronômetro.
- Campos mínimos: `schemaVersion`, `attemptId`, `nickname`, 3 princesas (IDs, nomes, resumos curtos), ordem sorteada, trechos da história, andar/combate/etapa, atributos/HP/XP/nível, itens equipados, inventário, poções/turnos restantes, princesas resgatadas, estrelas, tempo acumulado, flags de eventos já sorteados e PRNG/save metadata para evitar re-rolagem por reload.
- Ao fechar e reabrir: **Continuar** exatamente do checkpoint. Não repetir o drop, não sortear outra princesa, não reiniciar duração de poções.
- Ao morrer: limpar somente o salvamento da campanha e permitir novo jogo; histórico do ranking não é apagado.
- Se dado salvo estiver inválido ou em versão incompatível: mensagem clara, recuperação segura ou nova campanha, sem travar a página.

## 15. Arquivos e arquitetura esperados

```text
DanMachi/
├── GAME_DESIGN.md
├── index.html
├── style.css
├── script.js
├── README.md
├── .gitignore
├── assets/
│   ├── img/          # arte original ou imagens com permissão
│   └── icons/        # favicon e ícones
└── docs/
    ├── tests.md      # checklist com resultados de testes
    └── backend.md    # configuração do ranking e API (sem segredos)
```

O código pode ser dividido em JS adicionais em `js/` se isso aumentar legibilidade (por exemplo `state`, `combat`, `loot`, `api`, `ui`, `storage`), usando módulos ES nativos. **`index.html` na raiz**, URLs de arquivos relativas para GitHub Pages. Não incluir bibliotecas pesadas ou frameworks sem necessidade. Nada de áudio. Pixel art feita com recursos originais/seguros; fallback visual para imagens de wiki não carregadas.

**Direitos autorais:** personagens e identidade de *Hora de Aventura* e o título *DanMachi* remetem a propriedades intelectuais de terceiros. Este é um protótipo acadêmico não oficial; a publicação aberta com nomes/imagens reconhecíveis pode exigir autorização. Não copiar sprites ou áudios comerciais. Se necessário, disponibilizar versão pública com arte/nome próprios e preservar regras.

## 16. Plano de implementação incremental para Codex

Cada fase deve terminar com **comportamento verificável**, instrução de teste, revisão do diff e sugestão de commit. **Não fazer push/deploy automaticamente.**

1. **Estrutura e UI mínima:** páginas, navegação, layout mobile, tela inicial, mock de combate e sprites originais provisórios.
2. **Engine de combate:** ações, cálculo de dano, defesa, crítico, inimigos, Game Over, mensagens e simuladores de teste.
3. **XP/level up e 10 andares:** curva de níveis, atribuição dupla, progressão e chefe.
4. **Inventário/equipamentos/poções/fusão:** cinco slots, ações e validações.
5. **Drops/raridades/salas bônus:** gerador aleatório testável e percentuais.
6. **API e escolha das princesas:** provar acesso real do navegador; resumos em português e fallback.
7. **Resgates, história e estrelas:** narrativa/template, ordem aleatória fixa e garantias até andares 8/9/10.
8. **Save/continue e cronômetro ativo:** não re-sortear eventos no reload.
9. **Ranking global:** tabela/RLS/Edge Function em arquivos de configuração + integração; requer configurar Supabase, executar implantação controlada e testes reais.
10. **QA e publicação:** teclado/toque, testes estatísticos, Chrome mobile, screenshots, GitHub Pages, README e links.

## 17. Critérios de aceitação mínimos

- [ ] Carrega `index.html` localmente via servidor HTTP e depois no GitHub Pages.
- [ ] Menu e jogo são totalmente operáveis por teclado e toque.
- [ ] Selecionar exatamente 3 princesas distintas; padrão correto; narrativa em português; API realmente consultada ou status de fallback explícito.
- [ ] Ordem sorteada salva, nunca reembaralha ao continuar.
- [ ] Finn começa nível 1, HP 20, dano 15, sorte 5, armadura 0, **apenas espada comum equipada**.
- [ ] 10 andares de 3 monstros; +1 nível no segundo/terceiro sob 30%/75%; nível cap 10; Rei Gelado no final.
- [ ] Atacar pode critar (2×); Defender nunca crita, causa metade do dano e fortalece só escudo em 40%.
- [ ] Dano recebido pode ser zero; regras de `floor` no final dos cálculos.
- [ ] 2 pontos de atributo por nível, repetição possível e dobro de ganho de 6 a 10.
- [ ] Poções só fora do combate; buffs de 5 turnos persistem entre salas; cura nunca ultrapassa HP máximo.
- [ ] 5 slots de inventário + 3 de equipamentos; inventário cheio exige decisão; descarte/fusão seguros.
- [ ] Drops 1/2/3 = 50/35/15; categoria soma 100%; raridade soma 100%; lendário ≤5%.
- [ ] Sala bônus com 10% por andar, sem combate, entrada opcional e recompensa com peso de qualidade 1,5×.
- [ ] Primeira princesa garantida até andar 8; segunda até 9, nunca no mesmo andar; terceira após chefe; 0–3 estrelas.
- [ ] Game Over limpa a campanha; nova partida começa sem inventário/XP anterior.
- [ ] Save/continue preserva todos os sorteios e o cronômetro não contabiliza aba fechada/oculta.
- [ ] Ranking realmente compartilhado entre dois navegadores quando Supabase estiver configurado; caso contrário, mensagem honesta de indisponibilidade.
- [ ] Página pública abre no celular com layout responsivo, sem erros críticos no console.

### Testes estatísticos a criar

- 100 mil amostras de quantidade de drops: proporções próximas a 50/35/15.
- 100 mil amostras de categoria: próximas a 25/20/15/30/5/5.
- 100 mil amostras da curva de raridade nos extremos; soma 100% e lendário nunca >5%.
- 100 mil sorteios do evento bônus: aproximadamente 10%.
- Simulações de encontros: primeiro 100% base, segundo ~30% nível superior, terceiro ~75% superior, sem ultrapassar 10.
- Teste determinístico para garantir resgate no andar 8/9, não duas princesas no mesmo andar, chefe no 10.
- Testes de borda: HP zero, defesa total, crítico, inventário cheio, fusão inválida, duplicidade de submit, Fandom/API e ranking indisponíveis, retorno após reload.

## 18. Limitações e pendências externas

1. **API Fandom:** confirmar CORS, endpoint e campos reais em navegador. Se inacessível, manter fallback e registrar o bloqueio; integração API não deve ser declarada plenamente funcional sem teste.
2. **Supabase:** projeto, configuração de segurança e publicação da função precisam de ação do proprietário; o Codex prepara arquivos, mas não inventa URLs/chaves.
3. **Ranking sem conta:** validação básica e rate limit ajudam, mas não provam a veracidade de pontuações enviadas por browsers públicos.
4. **Balanceamento:** HP inicial 20 e só espada podem tornar os primeiros encontros difíceis; **não alterar stats aprovados sem autorização**. Testar e registrar dificuldades antes de propor mudanças.
5. **Arte e IP:** manter protótipos visuais próprios e conferir licença antes de usar retratos ou sprites externos.

## 19. Convenções para o desenvolvimento

- Interface e comentários em português claro; nomes de funções e arquivos consistentes.
- Separar funções puras de regras (`calcularDano`, `gerarMonstro`, `xpNecessario`, `sortearLoot`, etc.) das ações de DOM e rede.
- Isolar fonte de aleatoriedade para permitir testes com seed/função injetada.
- Verificar erros na API, não bloquear os demais recursos do jogo.
- Sem mudanças ocultas de probabilidades e sem criar arte/recursos com direitos duvidosos.
- Não pedir ao agente para fabricar prints, links de deploy, resultados de teste ou integrações que ainda não ocorreram.

---

**Referência didática:** slides da disciplina, seção “Seu jogo no ar” (páginas 76–87), especialmente requisitos (p.79), planejamento/contexto (p.81–82), ritual prompt/teste/commit (p.83), GitHub Pages (p.84) e entrega (p.85).
