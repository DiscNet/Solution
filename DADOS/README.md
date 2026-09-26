🤖 WhatsApp Bot - GitHub

<div align="center">

https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,2,5,30&height=200&section=header&text=WhatsApp%20Bot&fontSize=70&fontColor=fff&animation=fadeIn&fontAlignY=38&desc=Automação%20Inteligente%20para%20WhatsApp&descAlignY=55&descSize=20

https://img.shields.io/github/stars/seu-usuario/whatsapp-bot?style=for-the-badge&logo=github&color=yellow
https://img.shields.io/github/forks/seu-usuario/whatsapp-bot?style=for-the-badge&logo=github&color=blue
https://img.shields.io/github/issues/seu-usuario/whatsapp-bot?style=for-the-badge&logo=github&color=red
https://img.shields.io/badge/License-MIT-green?style=for-the-badge&logo=opensourceinitiative

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=24&pause=1000&color=25D366&center=true&vCenter=true&width=600&lines=Bem-vindo+ao+WhatsApp+Bot!+%F0%9F%A4%96;Automatize+suas+mensagens+%F0%9F%92%AC;Feito+com+Node.js+%2B+Baileys+%E2%9A%A1;100%25+Gratuito+e+Open+Source+%F0%9F%8C%9F" alt="Typing SVG" />

</div>

---

📋 Índice

· ✨ Sobre o Projeto
· 🚀 Funcionalidades
· 📸 Demonstração
· ⚙️ Instalação
· 🎮 Comandos
· 🛠️ Tecnologias
· 📁 Estrutura
· 🤝 Contribuindo
· 📄 Licença

---

✨ Sobre o Projeto

<div align="center">

<img src="https://media.giphy.com/media/qgQUggAC3Pfv687qPC/giphy.gif" width="400" />

</div>

Um bot de WhatsApp moderno, rápido e cheio de funcionalidades, desenvolvido com Node.js e a biblioteca Baileys. Ideal para automatizar tarefas, gerenciar grupos e interagir com usuários de forma inteligente. 🎯

💡 Dica: Este bot é totalmente gratuito, open source e fácil de configurar!

---

🚀 Funcionalidades

<div align="center">

🎯 Recurso 📝 Descrição ✅ Status
🤖 Auto-responder Respostas automáticas inteligentes ✅
🎨 Sticker Maker Crie figurinhas personalizadas ✅
📥 Downloader YouTube, Instagram, TikTok ✅
🎵 Música Busca e envia áudios ✅
🎮 Jogos Quiz, forca, adivinhações ✅
👥 Admin Grupo Ban, kick, promote ✅
🔒 Anti-Link Bloqueio de links indesejados ✅
📊 Ranking Sistema de níveis e XP ✅
🌐 IA Integrada ChatGPT / Gemini ✅

</div>

---

📸 Demonstração

<div align="center">

🎨 Preview do Bot

<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="700" />

📱 Screenshots

https://via.placeholder.com/400x600/25D366/FFFFFF?text=Menu+Principal
https://via.placeholder.com/400x600/128C7E/FFFFFF?text=Sticker+Maker
https://via.placeholder.com/400x600/075E54/FFFFFF?text=Downloader

</div>

---

⚙️ Instalação

📦 Pré-requisitos

```bash
✅ Node.js v18+
✅ NPM ou Yarn
✅ Git
✅ WhatsApp ativo
```

🔧 Passo a Passo

```bash
# 1️⃣ Clone o repositório
git clone https://github.com/seu-usuario/whatsapp-bot.git

# 2️⃣ Entre na pasta
cd whatsapp-bot

# 3️⃣ Instale as dependências
npm install

# 4️⃣ Configure o arquivo .env
cp .env.example .env

# 5️⃣ Inicie o bot
npm start
```

📲 Conectar ao WhatsApp

```bash
# Escaneie o QR Code que aparecerá no terminal
# Ou use o código de pareamento de 8 dígitos
```

<div align="center">

<img src="https://media.giphy.com/media/LnQjpWaON8nhr21vNW/giphy.gif" width="200" />

</div>

---

🎮 Comandos

<div align="center">

🔥 Comandos Populares

</div>

```yaml
🎨 Stickers:
  !sticker      - Converte imagem em figurinha
  !attp         - Cria sticker de texto animado
  !toimg        - Converte sticker em imagem

📥 Downloads:
  !yt           - Baixa vídeo do YouTube
  !ig           - Baixa do Instagram
  !tiktok       - Baixa do TikTok
  !play         - Toca música

👥 Grupo:
  !ban          - Bane membro
  !promote      - Promove a admin
  !kick         - Remove membro
  !tagall       - Marca todos

🤖 IA:
  !gpt          - Conversa com ChatGPT
  !gemini       - Conversa com Gemini
  !imagine      - Gera imagens IA

🎮 Diversão:
  !quiz         - Inicia quiz
  !forca        - Jogo da forca
  !ship         - Shippa casais
```

---

🛠️ Tecnologias

<div align="center">

https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black
https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white
https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white
https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white
https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white

</div>

---

📁 Estrutura

```bash
📦 whatsapp-bot
 ┣ 📂 src
 ┃ ┣ 📂 commands      # Comandos do bot
 ┃ ┣ 📂 events        # Eventos (mensagens, grupos)
 ┃ ┣ 📂 database      # Conexão DB
 ┃ ┣ 📂 utils         # Funções utilitárias
 ┃ ┗ 📜 index.js      # Arquivo principal
 ┣ 📂 assets          # Imagens e mídias
 ┣ 📜 .env.example    # Variáveis de ambiente
 ┣ 📜 package.json
 ┗ 📜 README.md
```

---

🤝 Contribuindo

<div align="center">

Contribuições são muito bem-vindas! 💚

</div>

```bash
# 1. Fork o projeto
# 2. Crie sua branch
git checkout -b feature/MinhaFeature

# 3. Commit suas mudanças
git commit -m "✨ Adiciona nova feature"

# 4. Push
git push origin feature/MinhaFeature

# 5. Abra um Pull Request
```

---

📄 Licença

<div align="center">

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

</div>

---

<div align="center">

🌟 Se este projeto te ajudou, deixe uma estrela! 🌟

https://img.shields.io/github/stars/seu-usuario/whatsapp-bot?style=social

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,2,5,30&height=120&section=footer&animation=twinkling" />

Feito com 💚 por Seu Nome

https://profile-counter.glitch.me/seu-usuario/count.svg

</div>
```

---

🎨 Recursos Visuais Usados

Este README utiliza elementos animados e coloridos:

Recurso Descrição
🌊 Capsule Render Header/Footer com onda animada em chroma color
⌨️ Typing SVG Texto digitado animado
🎞️ GIPHY GIFs animados de tecnologia
🏷️ Shields.io Badges coloridos e dinâmicos
✨ Emojis Ícones em toda a documentação
📊 Tabelas Organização visual limpa
