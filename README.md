<div align="center">
  <img src="DADOS/imagens/readme-banner.svg" alt="Solution, bot de WhatsApp de Kxlyn" width="100%">
  <br><br>
  <a href="https://github.com/DiscNet/Solution"><img src="https://img.shields.io/badge/Projeto-Solution-8B5CF6?style=for-the-badge&logo=github&logoColor=white" alt="Projeto Solution"></a>
  <img src="https://img.shields.io/badge/Node.js-22%2B-18212B?style=for-the-badge&logo=nodedotjs&logoColor=78D990" alt="Node.js 22 ou superior">
  <img src="https://img.shields.io/badge/WhatsApp-Baileys-18212B?style=for-the-badge&logo=whatsapp&logoColor=6EE7B7" alt="WhatsApp com Baileys">
  <img src="https://img.shields.io/badge/Deploy-Railway-18212B?style=for-the-badge&logo=railway&logoColor=C4B5FD" alt="Deploy no Railway">
</div>

# Solution · GrimmJow-WA

Bot de WhatsApp mantido por **Kxlyn**, com comandos para grupos, mídia, utilidades e sistemas de jogo. O prefixo padrão é `.`. A estrutura foi reunida em `DADOS/MÓDULOS/`, com plugins por categoria e textos de menu separados da lógica dos comandos.

## ✦ O que o bot reúne

| Área | Exemplos no projeto |
| --- | --- |
| 🧭 **Menus** | `.menu` reúne categorias e comandos principais; `.menurpg`, `.menuadm` e outros abrem páginas escritas à mão. |
| 🛡️ **Grupos** | Administração, boas-vindas, filtros e ferramentas para moderadores. |
| 🎮 **Sistemas** | RPG, Pokémon, coins, progressão e rankings do próprio bot. |
| 🎧 **Mídia** | Busca e downloads, figurinhas, imagens e comandos de áudio. |
| ✨ **Utilidades** | Perfil, ping, ferramentas de texto e comandos integrados à API. |

Alguns comandos de busca, download e IA precisam de serviços externos ativos e de uma chave configurada para funcionar.

## 🧭 Menus e mensagens em grupos

O texto de cada categoria fica em `DADOS/MÓDULOS/mensagens/menus.js`. Os menus são editados manualmente: ao adicionar um comando, atualize a categoria correspondente. `.menu` mostra as categorias e os principais comandos; `.menu adm` ou `.menuadm` abre a página de administração.

Grupos novos recebem respostas **sem botões** por padrão. Um administrador pode consultar ou alterar esse modo com `.sembotoes`, `.sembotoes 1` (texto) e `.sembotoes 0` (permitir botões). A escolha é salva por grupo. No modo de texto, opções interativas aparecem como comandos para digitar; por exemplo, `.autofigu` mostra o estado e indica `.autofigu 0` quando estiver ativo.

## 🎨 Visual dos menus

<div align="center">
  <img src="DADOS/imagens/menu.jpg" alt="Arte usada no menu do bot" width="460">
  <br>
  <sub>Arte de menu já incluída no Solution.</sub>
</div>

## 🚀 Rodar localmente

Requer **Node.js 22.22.2 ou superior**. Depois de clonar o repositório:

```bash
npm install
npm run connect
npm start
```

`npm run connect` faz o pareamento e cria a sessão usada pelo bot. Nas próximas inicializações, use `npm start`. O script de início prepara a sessão e carrega `DADOS/index.js`.

Para os comandos integrados à API, configure `TOKITO_API` no ambiente. Outras integrações podem pedir variáveis próprias; consulte `DADOS/config/config.js` antes de ativá-las.

> **Sessão:** `DADOS/conexão/bot_auth/` contém credenciais de conexão. Trate essa pasta como privada. Em uma implantação nova, prefira armazenar a sessão em um volume ou usar `AUTH_INFO_B64`, que o inicializador reconhece.

## 🗂️ Organização

| Caminho | Responsabilidade |
| --- | --- |
| `DADOS/MÓDULOS/plugins/` | Comandos divididos por categoria. |
| `DADOS/MÓDULOS/mensagens/` | Menus, mensagens e respostas de erro. |
| `DADOS/MÓDULOS/sistemas/` | Regras e contexto dos sistemas do bot. |
| `DADOS/database/` | Dados e estados dos recursos, incluindo os filtros de moderação. |
| `DADOS/MÓDULOS/functions/` | Integrações, renderização e funções compartilhadas. |
| `DADOS/config/config.js` | Configuração geral do bot. |
| `DADOS/conexão/` | Caminho de sessão e pasta `bot_auth/` do WhatsApp. |
| `DADOS/core/` e `DADOS/eventos/` | Inicialização, conexão e eventos. |
| `DADOS/imagens/` | Artes usadas nas mensagens e neste README. |

O comando de produção é `npm start`; o `Dockerfile` da raiz instala as dependências e inicia o mesmo script.

---

<div align="center">
  <strong>Solution</strong> · feito e mantido por <strong>Kxlyn</strong>
</div>
