# Integrações externas

## Princesas — Fandom / MediaWiki

Consulta direta do navegador, sem credenciais, a `https://adventuretime.fandom.com/api.php`:

- `action=query`, `prop=info`, `inprop=url`, `redirects=1`, `format=json`, `origin=*`.
- `titles`: os seis títulos curados de personagens presentes em `script.js`.
- Resposta usada: título, identificador da página e URL de origem. Normalizações e redirecionamentos são associados aos títulos locais.
- A interface mostra os metadados reais e links nos cartões. Resumos em português são de autoria local; imagens usam placeholder original em vez de imagens externas sem licença verificada.
- IDs inválidos, páginas ausentes e fontes fora de HTTPS/Adventure Time Wiki não são aceitos. Conteúdo externo é inserido com `textContent`, sem HTML da API.
- Erros HTTP, JSON inválido, bloqueio de rede/CORS ou timeout de oito segundos ativam o aviso de catálogo offline. O jogador pode iniciar sem esperar a consulta e tentar novamente.

**Evidência de 03/11/2026:** consulta no Chrome headless, a partir da aplicação em `http://127.0.0.1:8000`, retornou HTTP 200, tipo cors, com seis princesas reconhecidas. Não garante disponibilidade permanente ou CORS em uma futura origem publicada.

Referência: [MediaWiki API:Info](https://www.mediawiki.org/wiki/API:Info) e [requisições entre origens](https://www.mediawiki.org/wiki/API:Cross-site_requests).

## Ranking — pendente

Não há projeto, credenciais ou integração Supabase configurados. A interface informa “Ranking global indisponível”. Não há envio nem armazenamento de resultados nesta versão. Migração, políticas de acesso, função de submissão e teste entre dois navegadores pertencem a uma etapa futura.
