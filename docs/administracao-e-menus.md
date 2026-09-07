# Administração e menus

35 comandos novos para o dono, 37 para grupos e 387 comandos totais.

## Navegação

- `.menu`: categorias e seções.
- `.menu rpg pets`: seção Pets.
- `.menuadm 2`: segunda página de administração.
- `.menugeral`: todos os comandos, com próxima página indicada.
- `.info comando`: uso, seção, aliases e permissões.

Cada módulo declara `menuCategory`, `menuSection` e `usage` ou uma descrição curta. Arquivos que exportam vários comandos têm metadados individuais. O catálogo usa os nomes canônicos e o prefixo ativo.

## Novos comandos

### Dono

| Comando | Seção | Uso |
|---|---|---|
| autorizargrupo | Acesso | Uso: .autorizargrupo id@g.us |
| botambiente | Diagnóstico | Uso: .botambiente |
| botban | Acesso | Uso: .botban @usuario motivo |
| botbanlista | Acesso | Uso: .botbanlista |
| botdependencias | Diagnóstico | Uso: .botdependencias |
| botestado | Acesso | Uso: .botestado |
| botestatisticas | Estatísticas | Uso: .botestatisticas |
| botmemoria | Diagnóstico | Uso: .botmemoria |
| botmodo | Acesso | Uso: .botmodo publico / pausado / grupos / pv |
| botnome | Configuração | Uso: .botnome nome |
| botsaudavel | Diagnóstico | Uso: .botsaudavel |
| botunban | Acesso | Uso: .botunban @usuario |
| buscarcmd | Comandos | Uso: .buscarcmd termo |
| cmdaliases | Comandos | Uso: .cmdaliases comando |
| cmdauditoria | Diagnóstico | Uso: .cmdauditoria |
| cmderros | Diagnóstico | Uso: .cmderros |
| cmdestatistica | Estatísticas | Uso: .cmdestatistica comando |
| cmdglobais | Comandos | Uso: .cmdglobais |
| cmdglobaloff | Comandos | Uso: .cmdglobaloff comando |
| cmdglobalon | Comandos | Uso: .cmdglobalon comando |
| cmdorigem | Comandos | Uso: .cmdorigem comando |
| cmdpermissoes | Comandos | Uso: .cmdpermissoes comando |
| cooldowncmd | Comandos | Uso: .cooldowncmd comando segundos |
| cooldownlista | Comandos | Uso: .cooldownlista |
| cooldownpadrao | Comandos | Uso: .cooldownpadrao segundos |
| desautorizargrupo | Acesso | Uso: .desautorizargrupo id@g.us |
| dononome | Configuração | Uso: .dononome nome |
| exportaradmin | Configuração | Uso: .exportaradmin |
| gruposautorizados | Acesso | Uso: .gruposautorizados |
| limparcooldowns | Comandos | Uso: .limparcooldowns |
| pausatexto | Acesso | Uso: .pausatexto texto |
| restricaogrupos | Acesso | Uso: .restricaogrupos on / off |
| topcomandos | Estatísticas | Uso: .topcomandos |
| ultimoserros | Diagnóstico | Uso: .ultimoserros |
| zerarestatisticas | Estatísticas | Uso: .zerarestatisticas confirmar |

### Grupos

| Comando | Seção | Uso |
|---|---|---|
| advertencias | Moderação | Uso: .advertencias @usuario |
| advertir | Moderação | Uso: .advertir @usuario motivo |
| anticontato | Proteção | Uso: .anticontato on / off |
| antiencaminhado | Proteção | Uso: .antiencaminhado on / off |
| antienquete | Proteção | Uso: .antienquete on / off |
| antilocalizacao | Proteção | Uso: .antilocalizacao on / off |
| antilongo | Proteção | Uso: .antilongo caracteres (0 desliga) |
| antimencao | Proteção | Uso: .antimencao limite (0 desliga) |
| antisticker | Proteção | Uso: .antisticker on / off |
| apagarmensagem | Moderação | Uso: .apagarmensagem (responda à mensagem) |
| cmdespera | Comandos | Uso: .cmdespera comando segundos |
| cmdesperas | Comandos | Uso: .cmdesperas |
| cmdsadmin | Comandos | Uso: .cmdsadmin on / off |
| cmdsbloqueados | Comandos | Uso: .cmdsbloqueados |
| configgrupo | Configuração | Uso: .configgrupo |
| delnota | Regras e notas | Uso: .delnota nome |
| delregras | Regras e notas | Uso: .delregras |
| desmutar | Moderação | Uso: .desmutar @usuario |
| editargrupo | Configuração | Uso: .editargrupo admins / todos |
| exportarmembros | Membros | Uso: .exportarmembros |
| filtros | Proteção | Uso: .filtros |
| infogrupo | Membros | Uso: .infogrupo |
| limiteadv | Moderação | Uso: .limiteadv 1 a 20 |
| limparadv | Moderação | Uso: .limparadv @usuario |
| linkgrupo | Configuração | Uso: .linkgrupo |
| listaadv | Moderação | Uso: .listaadv |
| listamutes | Moderação | Uso: .listamutes |
| modolento | Proteção | Uso: .modolento segundos (0 desliga) |
| mutar | Moderação | Uso: .mutar @usuario minutos |
| nota | Regras e notas | Uso: .nota nome |
| notas | Regras e notas | Uso: .notas |
| regras | Regras e notas | Uso: .regras |
| retiraradv | Moderação | Uso: .retiraradv @usuario |
| revogarlink | Configuração | Uso: .revogarlink |
| salvarnota | Regras e notas | Uso: .salvarnota nome texto |
| setregras | Regras e notas | Uso: .setregras texto |
| veradmin | Membros | Uso: .veradmin @usuario |

## Comportamento

- Advertências mantêm motivo e data. Atingir o limite sinaliza revisão ao administrador; não expulsa automaticamente.
- `mutar` apaga mensagens do membro até o horário de expiração. Exige que o bot seja administrador; não é um mute nativo do WhatsApp.
- Filtros e modo lento isentam administradores e o dono.
- Regras e notas são configuradas por administradores e podem ser consultadas pelos membros.
- Bloqueios de comando abrangem aliases e botões. Comandos administrativos de recuperação não podem ser bloqueados pelo grupo.
- O dono conserva acesso durante pausa, bloqueios e restrição de grupos.
- `exportaradmin` só funciona no privado do dono; exporta exclusivamente o estado de administração, sem sessão, API keys ou configuração do proprietário.
- Estatísticas e cooldowns em andamento são do processo atual; regras, notas, bloqueios, cooldowns configurados, filtros e mutes persistem em `administration.json`.
- Os dados novos usam `RAILWAY_VOLUME_MOUNT_PATH`, `/data` quando existente, ou `database/`. Sem volume persistente, a plataforma pode perder dados em um redeploy.

## Correções

Manutenção passa a compartilhar o armazenamento com o processamento de mensagens. Banimento, promoção e rebaixamento resolvem telefone/LID e conferem o status retornado pelo WhatsApp. Abrir, fechar, editar grupo e alterar prefixo usam verificação central de permissões. A comparação de identidades não confunde LID com número telefônico do mesmo valor.

## Validação

`npm test` executa os testes de integração com socket simulado e dados temporários. `npm run audit:commands` confere carregamento, duplicação de nomes/aliases e exemplos. A paginação é verificada para incluir cada comando exatamente uma vez. Não foi usada uma sessão real de WhatsApp nos testes.
