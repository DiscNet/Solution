const config = require("../../config/config");

// Conteúdo dos menus escrito manualmente. Não depende da lista de arquivos/plugins.
const menuImages = Object.freeze({
  menu: "menu.jpg",
  menugeral: "menu.jpg",
  menuadm: "menuadm.jpg",
  menudono: "menudono.jpg",
  menurpg: "menurpg.jpg",
  menucoins: "menu.jpg",
  menupokemon: "menu.jpg",
  menudws: "menudws.jpg",
  menualterar: "menualterar.jpg",
  menulogos: "menu.jpg",
  menusticker: "menusticker.jpg",
  menubn: "menubn.jpg",
  menuoutros: "menuoutros.jpg",
});

const pages = Object.freeze({
  menurpg: {
    title: "⚔️ RPG",
    summary: "Jornada, nível, guildas e desafios",
    sections: [
      ["Começar", [["jornada", "inicie e acompanhe a jornada"], ["modorpg", "configuração do RPG no grupo"]]],
      ["Progressão", [["level", "nível e experiência"], ["ranklevel", "ranking de níveis"], ["guilda", "guildas e membros"]]],
      ["Aventura", [["arsenal", "equipamentos"], ["desafios", "missões e desafios"]]],
    ],
  },
  menucoins: {
    title: "🪙 Economia",
    summary: "Moedas virtuais, cidade e rankings",
    sections: [
      ["Conta", [["coins", "consulte suas moedas virtuais"], ["doarcoins", "transfira moedas do jogo"], ["rankcoins", "ranking de moedas"]]],
      ["Atividades", [["minerar", "atividade de mineração"], ["registrarcidade", "crie sua cidade"], ["economiacoins", "ações da economia"]]],
      ["Configuração", [["modocoins", "modo de economia no grupo"]]],
    ],
  },
  menupokemon: {
    title: "🔴 Pokémon",
    summary: "Coleção, cuidados, evolução e missões",
    sections: [
      ["Coleção", [["pokemoninventario", "veja seus Pokémon"], ["verpokemon", "detalhes de um Pokémon"], ["lojapokemon", "itens e opções da loja"]]],
      ["Evolução", [["alimentarpokemon", "alimente seu Pokémon"], ["pokemoncuidados", "acompanhe os cuidados"], ["evoluirpokemon", "evolua seu Pokémon"], ["apelidopokemon", "mude o apelido"]]],
      ["Comunidade", [["missaopokemon", "missões Pokémon"], ["rankpokemon", "ranking Pokémon"]]],
    ],
  },
  menuadm: {
    title: "🛡️ Grupos",
    summary: "Moderação, boas-vindas e automações",
    sections: [
      ["Configuração", [["sembotoes 1/0", "mensagens sem botões (padrão: ativo)"], ["autofigu 1/0", "figurinhas automáticas"], ["bemvindo 1/0", "boas-vindas"], ["configgrupo", "opções do grupo"]]],
      ["Moderação", [["antilink on/off", "filtro de links"], ["antiimagem on/off", "filtro de imagens"], ["antivideo on/off", "filtro de vídeos"], ["filtros", "consulte os filtros"], ["advertir", "advertências"], ["mutar", "silencie um membro"]]],
      ["Gestão", [["abrir", "libere mensagens"], ["fechar", "restrinja mensagens"], ["ban", "remova um membro"], ["tag", "marque os membros"], ["regras", "veja as regras"], ["atividades", "resumo de atividade"]]],
    ],
  },
  menudono: {
    title: "👑 Dono",
    summary: "Configuração e diagnóstico do bot",
    sections: [
      ["Bot", [["reload", "recarregue a configuração"], ["setprefix", "altere o prefixo"], ["botestado", "estado do bot"], ["integridadebot", "diagnóstico"], ["botsaudavel", "resumo de saúde"]]],
      ["Comandos", [["catalogocmd", "catálogo de comandos"], ["buscarcmd", "busca de comando"], ["cmdestatistica", "estatísticas"], ["cmderros", "erros recentes"]]],
      ["Grupos", [["listg", "grupos do bot"], ["gerenciar", "administre um grupo"], ["autorizargrupo", "autorize um grupo"]]],
    ],
  },
  menudws: {
    title: "📥 Downloads",
    summary: "Busca e mídia",
    sections: [
      ["YouTube", [["ytsearch termo", "pesquise vídeos"], ["play termo/link", "receba áudio"], ["ytmp3 link", "baixe áudio"], ["ytmp4 link", "baixe vídeo"]]],
      ["Outras fontes", [["spotify link", "música por link"], ["ttkmp4 link", "vídeo curto"], ["igvideo link", "vídeo do Instagram"], ["pin termo", "pesquise imagens"]]],
      ["Biblioteca", [["playlist", "organize uma playlist"], ["play_audio termo", "áudio por pesquisa"]]],
    ],
  },
  menualterar: {
    title: "🎛️ Alteradores",
    summary: "Efeitos em imagem, vídeo e áudio",
    sections: [
      ["Imagem", [["blur", "desfoque"], ["bw", "preto e branco"], ["cartoon", "efeito de desenho"]]],
      ["Mídia", [["lento", "reduza a velocidade"], ["rapido", "acelere a mídia"], ["grave", "tom grave"], ["eco", "efeito de eco"]]],
    ],
  },
  menulogos: {
    title: "🎨 Logos",
    summary: "Efeitos visuais para textos",
    sections: [
      ["Texto e arte", [["logoglitch texto", "efeito glitch"], ["logocartoon texto", "estilo cartoon"], ["logodesfoque texto", "efeito de desfoque"]]],
    ],
  },
  menusticker: {
    title: "🖼️ Figurinhas",
    summary: "Criação, conversão e edição",
    sections: [
      ["Criar", [["s", "converta uma mídia em figurinha"], ["sbrat texto", "figurinha com texto"], ["stext texto", "texto em figurinha"], ["emoji", "figurinha de emoji"]]],
      ["Editar", [["rename nome|autor", "altere informações"], ["toimg", "converta para imagem"], ["togif", "converta para GIF"], ["stbg", "altere o fundo"]]],
      ["Extras", [["figperfil", "foto de perfil em figurinha"], ["stickergif", "figurinha animada"]]],
    ],
  },
  menubn: {
    title: "🎮 Brincadeiras",
    summary: "Jogos de palavras e atividades do grupo",
    sections: [
      ["Jogos", [["akinator", "jogo de perguntas"], ["dama", "partida de damas"], ["adivinhepalavra", "descubra a palavra"], ["cacapalavras", "encontre palavras"], ["jogodavelha", "partida por texto"]]],
      ["Grupo", [["rankbeta", "ranking de brincadeira"], ["sortearmembro", "sorteie um membro"], ["times", "forme equipes"]]],
    ],
  },
  menuoutros: {
    title: "🧰 Utilidades",
    summary: "Perfil, pesquisa, IA e ferramentas",
    sections: [
      ["Perfil", [["perfil", "seu perfil"], ["ping", "latência do bot"], ["afk", "marque ausência"], ["atividade", "sua atividade"], ["rankativo", "ranking de atividade"]]],
      ["Informação", [["info comando", "como usar um comando"], ["cep número", "consulta de CEP"], ["clima cidade", "previsão do tempo"], ["wikipedia termo", "resumo de tema"]]],
      ["Ferramentas", [["gemini pergunta", "assistente de IA"], ["ocr", "texto de imagem"], ["qrcode texto", "gere um QR Code"], ["traduzir texto", "tradução"], ["totalcmd", "quantidade de comandos"]]],
    ],
  },
});

const order = [
  "menurpg", "menucoins", "menupokemon", "menuadm", "menudono",
  "menudws", "menualterar", "menulogos", "menusticker", "menubn", "menuoutros",
];

const names = Object.freeze({
  rpg: "menurpg", coins: "menucoins", economia: "menucoins",
  pokemon: "menupokemon", poke: "menupokemon",
  adm: "menuadm", admin: "menuadm", grupos: "menuadm",
  dono: "menudono", downloads: "menudws", dws: "menudws",
  alterar: "menualterar", alteradores: "menualterar",
  logos: "menulogos", figurinhas: "menusticker", sticker: "menusticker",
  brincadeiras: "menubn", bn: "menubn",
  utilidades: "menuoutros", outros: "menuoutros", diversos: "menuoutros",
  geral: "menugeral", menus: "menugeral",
});

function clean(value, fallback) {
  return String(value || fallback).replace(/[\x00-\x1f\x7f]/g, "").trim() || fallback;
}

function botName() { return clean(config.botName, "Solution"); }
function ownerName() { return clean(config.ownerName, "Kxlyn"); }

function header(title, prefix) {
  return [
    "╭─〔 ✦ SOLUTION 〕",
    "│ 🤖 " + botName(),
    "│ 👑 " + ownerName(),
    "│ 🕒 " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    "│ 🔎 Prefixo: " + prefix,
    "╰─〔 " + title + " 〕",
  ].join("\n");
}

function mainText(prefix) {
  const groups = order.map(name => {
    const page = pages[name];
    const featured = page.sections[0][1].slice(0, 2).map(item => prefix + item[0].split(" ")[0]).join(" · ");
    return "• " + prefix + name + " — " + page.title + "\n  " + featured;
  });
  return [
    header("Menu principal", prefix),
    "",
    "*Escolha um menu:*",
    ...groups,
    "",
    "*Atalhos:* " + prefix + "perfil · " + prefix + "ping · " + prefix + "info comando",
    "Use " + prefix + "menu <categoria> ou digite o nome de um menu.",
  ].join("\n");
}

function render(name, prefix) {
  if (name === "menu" || name === "menugeral") return mainText(prefix);
  const page = pages[name];
  if (!page) return mainText(prefix);
  const blocks = page.sections.map(([section, items]) => [
    "╭─ " + section,
    ...items.map(([command, description]) => "│ " + prefix + command + " — " + description),
    "╰─",
  ].join("\n"));
  return [
    header(page.title, prefix),
    page.summary,
    "",
    ...blocks,
    "",
    "Outros detalhes: " + prefix + "info <comando>",
    "Menus: " + prefix + "menu",
  ].join("\n");
}

function mainPayload(prefix) {
  return {
    text: mainText(prefix),
    footer: botName(),
    interactiveButtons: [{
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "Escolher menu",
        sections: [{
          title: "Categorias",
          rows: order.map(name => ({
            title: pages[name].title,
            description: pages[name].summary,
            id: prefix + name,
          })),
        }],
      }),
    }],
  };
}

function resolveMenu(value) {
  const key = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return pages[key] ? key : names[key] || "";
}

module.exports = { menuImages, pages, order, botName, ownerName, header, mainText, mainPayload, resolveMenu, render };
