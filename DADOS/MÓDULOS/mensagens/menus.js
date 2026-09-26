const config = require("../../config/config");

const IMAGE_URL =
  "https://ik.imagekit.io/f6qfdj7c6p/Grimm%20V2%20(1).jpg";

const OFFICIAL_GROUP =
  "https://chat.whatsapp.com/DgzrFZtkitBHZvNNYbuEKr?s=cl&p=a&ilr=4";

const routes = Object.freeze({
  RPG: "menurpg",
  Economia: "menucoins",
  "Pokémon": "menupokemon",
  Grupos: "menuadm",
  Dono: "menudono",
  Downloads: "menudws",
  Alteradores: "menualterar",
  Logos: "menulogos",
  Figurinhas: "menusticker",
  Brincadeiras: "menubn",
  Utilidades: "menuoutros",
  Menus: "menugeral menus",
});

const menuImages = Object.freeze({
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
  menugeral: "menu.jpg",
});

function clean(value, fallback = "Bot") {
  return (
    String(value || fallback)
      .replace(/[\x00-\x1F\x7F]/g, "")
      .trim() || fallback
  );
}

function botName() {
  return clean(config.botName, "Bot");
}

function ownerName() {
  return clean(config.ownerName, "Kxlyn");
}

function header(title, prefix, page, pages) {
  const pageLine =
    page && pages
      ? "\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙿𝚊𝚐𝚒𝚗𝚊: " + page + "/" + pages
      : "";

  return (
    "╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮\n" +
    "├̬⌑ؔ͟ ⎾🧊⏌͟ˉ̵͟͞𝙱𝚘𝚝: " + botName() + "\n" +
    "├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙳𝚎𝚟: " + ownerName() + "\n" +
    "├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙷𝚘𝚛𝚊: " +
      new Date().toLocaleTimeString("pt-BR") +
      "\n" +
    "├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙿𝚛𝚎𝚏𝚒𝚡𝚘: " + prefix + "\n" +
    "├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙼𝚎𝚗𝚞: " + title + pageLine + "\n" +
    "╰┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╯"
  );
}

function row(prefix, id, title, description, headerText) {
  const item = {
    id: prefix + id,
    title,
    description,
  };

  if (headerText) item.header = headerText;
  return item;
}

function mainSections(prefix) {
  const r = (id, title, description, headerText) =>
    row(prefix, id, title, description, headerText);

  return [
    {
      title: "       》🧊 𝐒𝐈𝐒𝐓𝐄𝐌𝐀𝐒 🧊《",
      highlight_label: "KXLYN",
      rows: [
        r(
          "menurpg",
          "   『⚔️』𝗠𝗘𝗡𝗨 𝗥𝗣𝗚",
          "jornada • classes • arsenal • bosses • guildas • level",
          "⚔️ RPG"
        ),
        r(
          "menucoins",
          "   『🪙』𝗠𝗘𝗡𝗨 𝗖𝗢𝗜𝗡𝗦",
          "economia • cidade • trabalho • banco • mineração",
          "🪙 ECONOMIA"
        ),
        r(
          "menupokemon",
          "   『🔴』𝗠𝗘𝗡𝗨 𝗣𝗢𝗞𝗘́𝗠𝗢𝗡",
          "loja • evolução • cuidados • batalha • missões • ranking",
          "🔴 POKÉMON"
        ),
      ],
    },
    {
      title: "       》🧊 𝐌𝐄𝐍𝐔𝐒 🧊《",
      rows: [
        r(
          "menugeral",
          "   『🧊』𝗠𝗘𝗡𝗨 𝗚𝗘𝗥𝗔𝗟",
          "todos os comandos organizados por categoria e seção"
        ),
        r(
          "menuadm",
          "   『🛡️』𝗠𝗘𝗡𝗨 𝗔𝗗𝗠",
          "administração e moderação de grupos"
        ),
        r(
          "menudono",
          "   『👑』𝗠𝗘𝗡𝗨 𝗗𝗢𝗡𝗢",
          "ferramentas exclusivas do dono"
        ),
        r(
          "menudws",
          "   『📥』𝗠𝗘𝗡𝗨 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗦",
          "YouTube • TikTok • Instagram • mídia"
        ),
        r(
          "menusticker",
          "   『🖼️』𝗠𝗘𝗡𝗨 𝗦𝗧𝗜𝗖𝗞𝗘𝗥",
          "figurinhas e ferramentas relacionadas"
        ),
        r(
          "menubn",
          "   『🎮』𝗠𝗘𝗡𝗨 𝗕𝗥𝗜𝗡𝗖𝗔𝗗𝗘𝗜𝗥𝗔𝗦",
          "jogos e comandos de diversão"
        ),
        r(
          "menuoutros",
          "   『🧰』𝗠𝗘𝗡𝗨 𝗨𝗧𝗜𝗟𝗜𝗗𝗔𝗗𝗘𝗦",
          "ferramentas, consultas e recursos gerais"
        ),
        r(
          "menualterar",
          "   『🎛️』𝗠𝗘𝗡𝗨 𝗔𝗟𝗧𝗘𝗥𝗔𝗗𝗢𝗥𝗘𝗦",
          "edição e conversão de mídia"
        ),
        r(
          "menulogos",
          "   『🎨』𝗠𝗘𝗡𝗨 𝗟𝗢𝗚𝗢𝗦",
          "efeitos visuais e logos pela API"
        ),
      ],
    },
    {
      title: "       》💎 𝐄𝐗𝐓𝐑𝐀𝐒 💎《",
      rows: [
        r("ping", "   『💎』𝐏𝐈𝐍𝐆", "latência e informações do bot"),
        r(
          "info comando",
          "   『📘』𝐀𝐉𝐔𝐃𝐀 𝐃𝐄 𝐂𝐎𝐌𝐀𝐍𝐃𝐎",
          "mostra como usar um comando específico"
        ),
      ],
    },
  ];
}

function mainPayload(prefix) {
  return {
    text: "\n" + header("Principal", prefix) + "\n",
    footer: "『🧊』" + botName() + " • escolha um menu",
    image: { url: IMAGE_URL },
    aimode: true,
    interactiveButtons: [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "『🧊』𝐌𝐄𝐍𝐔『🧊』",
          sections: mainSections(prefix),
        }),
      },
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "『🧊』𝐆𝐫𝐮𝐩𝐨 𝐎𝐟𝐢𝐜𝐢𝐚𝐥",
          url: OFFICIAL_GROUP,
          merchant_url: OFFICIAL_GROUP,
        }),
      },
    ],
  };
}

function index(prefix, catalog) {
  return (
    Object.entries(routes)
      .map(([category, route]) =>
        "├̬⌑ؔ͟ 「🧊」" +
        prefix +
        route +
        " — " +
        category +
        "\n┃  " +
        (catalog.sections(category).join(" · ") || "Navegação")
      )
      .join("\n") +
    "\n├̬⌑ؔ͟ 「🧊」" +
    prefix +
    "menugeral — Todos os comandos" +
    "\n├̬⌑ؔ͟ 「🧊」" +
    prefix +
    "info comando — Ajuda de um comando" +
    "\n╰─┄─💎"
  );
}

const smallCapsMap = {
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ",
  g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ",
  m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ",
  s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x",
  y: "ʏ", z: "ᴢ",
};

function smallCaps(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split("")
    .map(char => smallCapsMap[char] || char)
    .join("");
}

function decoratePage(text) {
  const lines = String(text || "").split("\n");
  const out = [];
  let sectionOpen = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const heading = line.match(/^\*(.+)\*$/);

    if (heading) {
      if (sectionOpen) {
        out.push("╰─");
        out.push("");
      }

      const [category, ...sectionParts] =
        heading[1].split(" - ");

      const section = sectionParts.join(" - ");

      out.push(categoryHeading(category));

      if (section) {
        out.push("│ " + smallCaps(section));
      }

      sectionOpen = true;
      continue;
    }

    if (!sectionOpen) {
      out.push("╭─〔 🧊 ᴄᴏᴍᴀɴᴅᴏs 〕");
      sectionOpen = true;
    }

    out.push("├̬⌑ؔ͟ 「🧊」" + line);
  }

  if (sectionOpen) out.push("╰─");

  return out.join("\n");
}

function categoryHeading(category) {
  const label = String(category || "")
    .replace(/^[^\p{L}\p{N}]*/u, "")
    .trim();
  return "╭─〔 🧊 " + smallCaps(label) + " 〕";
}

// O menu geral em texto é curado à mão e usado só por .menu no modo sem botões.
const textPages = Object.freeze({
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


const textExtras = Object.freeze({
  menurpg: ["gerenciarlevel", "gerenciarxp"],
  menucoins: ["gerenciarcoins", "entrarnacidade"],
  menupokemon: ["comprarpokemon", "venderpokemon"],
  menuadm: [
    "admlist", "veradmin", "listaadv", "limparadv", "limiteadv",
    "salvarnota", "notas", "setregras", "delregras", "linkgrupo",
    "revogarlink", "modolento", "saudegrupo", "modlog", "editargrupo",
    "promover", "rebaixar", "set-nome", "set-desc", "antiaudio",
    "antisticker", "antienquete"
  ],
  menudono: [
    "botestatisticas", "botmemoria", "topcomandos", "limparcooldowns",
    "gruposautorizados", "botmodo", "botnome", "dononome", "getcmd", "cmdorigem"
  ],
  menudws: [
    "tiktoksearch", "spotifysearch", "soundcloudsearch", "igaudio",
    "pinmp3", "pinmp4", "upscale", "imgascii", "lyrics", "animesearch",
    "mangasearch", "pinterestvideo", "twitter", "facebook", "mediafire"
  ],
  menualterar: [
    "pixel", "rotate", "sepia", "sharpen", "brilho", "contraste",
    "neon", "reverter", "agudo", "bass", "normalizar", "reverb"
  ],
  menulogos: [
    "neonglitch", "galaxy", "watercolor", "typography", "frozen",
    "papercut", "metal3d", "glowing"
  ],
  menusticker: [
    "stickerwm", "stext2", "steffect", "gsbrat", "gsbrat2", "scirculo", "sc", "exif"
  ],
  menubn: [
    "rankfalido", "rankgado", "rankotaku", "ranksigma", "rankcasal", "fakechat"
  ],
  menuoutros: [
    "avatar",
    "statussite", "dns", "moeda"
  ]
});

const textOrder = [
  "menusticker", "menudws", "menurpg", "menucoins", "menupokemon",
  "menuadm", "menudono", "menualterar", "menulogos", "menubn", "menuoutros",
];

function commandLines(commands, prefix) {
  return commands.map(command => {
    const name = String(command).trim().split(/\s+/)[0];
    return "├̬⌑ؔ͟ 「🧊」" + prefix + name +
      " | Uso: " + prefix + name;
  });
}

function textSection(title) {
  return [categoryHeading(title)];
}

function textSectionEnd() {
  return "╰─";
}

function textGeneral(prefix) {
  const lines = [header("Menu Geral", prefix), ""];

  for (const name of textOrder) {
    const page = textPages[name];
    const commands = [...new Set([
      ...page.sections.flatMap(([, items]) => items.map(([command]) => command)),
      ...(textExtras[name] || []),
    ])];
    lines.push(...textSection(page.title));
    lines.push(...commandLines(commands, prefix));
    lines.push(textSectionEnd());
    lines.push("");
  }
  return lines.join("\n");
}

module.exports = {
  IMAGE_URL,
  OFFICIAL_GROUP,
  routes,
  menuImages,
  botName,
  ownerName,
  header,
  mainSections,
  mainPayload,
  index,
  decoratePage,
  textGeneral,
};
