const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const tokitoApi = require("../functions/tokitoApi");
const spotify = require("../commands/dws/spotify");
const pin = require("../commands/dws/pinterest");
const aiPack = require("../commands/outros/tokito-api-ai");
const logoPack = require("../commands/outros/tokito-api-logos");
const gamesPack = require("../commands/brincadeiras/tokito-api-games");
const couplePack = require("../commands/brincadeiras/tokito-api-couple");
const downloadPack = require("../commands/dws/tokito-api-downloads");
const extraPack = require("../commands/dws/tokito-api-extras");
const playlist = require("../commands/dws/playlist");
const rpgCards = require("../commands/rpg/tokito-cards");
const akinator = require("../commands/brincadeiras/akinator");
const textTools = require("../commands/outros/util-texto");
const totext = textTools.find(command => command.name === "transcrever");
const bratPack = require("../commands/dws/brat");
const stickerPack = require("../commands/sticker/tokito-api-stickers");
const freeFirePack = require("../commands/outros/tokito-freefire");
const { loadCommandModules, buildCommandRegistry } = require("../functions/commandRegistry");
const youtubeResult = require("../functions/youtubeResult");
const youtubeMedia = require("../functions/youtubeMedia");
const messageText = require("../functions/messageText");

test("Tokito API client centraliza base URL e chave", () => {
  const old = process.env.TOKITO_API;
  process.env.TOKITO_API = "tokito_test_key";
  try {
    const u = new URL(tokitoApi.url("/api/youtube-search", { query: "teste" }));
    assert.equal(u.origin + u.pathname, "https://tokito-apis.com.br/api/youtube-search");
    assert.equal(u.searchParams.get("query"), "teste");
    assert.equal(u.searchParams.get("apikey"), "tokito_test_key");
  } finally {
    if (old === undefined) delete process.env.TOKITO_API;
    else process.env.TOKITO_API = old;
  }
});

test("interface usa o nome configurado e não marcas fixas antigas", () => {
  const pinSource = fs.readFileSync(path.join(__dirname, "..", "commands", "dws", "pinterest.js"), "utf8");
  const profileSource = fs.readFileSync(path.join(__dirname, "..", "commands", "outros", "perfil.js"), "utf8");
  const welcomeSource = fs.readFileSync(path.join(__dirname, "..", "functions", "groupWelcomeBanner.js"), "utf8");
  assert.doesNotMatch(pinSource, /Solution\s*•\s*Tokito API/);
  assert.doesNotMatch(profileSource, /config\.botName \|\| "Solution"/);
  assert.match(pinSource, /config\.botName/);
  assert.match(welcomeSource, /config\.botName/);
});

test("Spotify reconhece link e mantém busca textual", () => {
  assert.equal(spotify._internals.isSpotifyUrl("https://open.spotify.com/track/abc"), true);
  assert.equal(spotify._internals.isSpotifyUrl("musica qualquer"), false);
});

test("Pinterest aceita respostas simples e aninhadas", () => {
  const urls = pin._internals.imageUrls({
    resultado: {
      pins: [
        "https://example.com/1.jpg",
        { image: "https://example.com/2.jpg" },
        { images: { orig: { url: "https://example.com/3.jpg" } } },
      ],
    },
  });
  assert.deepEqual(urls, [
    "https://example.com/1.jpg",
    "https://example.com/2.jpg",
    "https://example.com/3.jpg",
  ]);
  assert.match(pin._internals.searchCaption("anime", 3), /3/);
  assert.equal(typeof pin._internals.sendCarousel, "function");
});

test("pin mantém carrossel como saída principal", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "dws", "pinterest.js"),
    "utf8"
  );
  assert.match(source, /carouselMessage/);
  assert.match(source, /prepareWAMessageMedia/);
  assert.match(source, /await sendCarousel\(conn, msg, from, urls, query\)/);
  assert.match(source, /displayBotName\(\)/);
});

test("pacote IA registra endpoints Tokito esperados", () => {
  const names = aiPack.map(x => x.name);
  for (const name of ["gemini", "geminipro", "openai", "perplexity", "chatia", "geminitts", "iaaudio", "apitest"]) {
    assert.ok(names.includes(name), name);
  }
});

test("catálogo de downloaders Tokito cobre as principais plataformas", () => {
  const names = downloadPack.map(x => x.name);
  for (const name of [
    "tiktoksearch", "spotifysearch", "facebook", "twitter", "kwai",
    "pinterestvideo", "applemusic", "deezer", "soundcloud", "capcut",
    "mediafire", "mega", "playstore", "aptoide", "happymod"
  ]) assert.ok(names.includes(name), name);
});

test("tiktoksearch encontra vídeo reproduzível em respostas aninhadas", () => {
  const items = downloadPack._test.tiktokItems({
    resultado: {
      aweme_list: [
        {
          desc: "Vídeo",
          video: {
            play_addr: {
              url_list: ["https://cdn.example.com/video-stream"],
            },
          },
        },
      ],
    },
  });
  assert.equal(items.length, 1);
  assert.equal(
    downloadPack._test.tiktokDirectVideoUrl(items[0]),
    "https://cdn.example.com/video-stream"
  );
});

test("tiktoksearch separa link da página de vídeo direto", () => {
  const item = {
    title: "Teste",
    url: "https://www.tiktok.com/@usuario/video/123",
  };
  assert.equal(downloadPack._test.tiktokDirectVideoUrl(item), "");
  assert.equal(
    downloadPack._test.tiktokPageUrl(item),
    "https://www.tiktok.com/@usuario/video/123"
  );
});

test("tiktoksearch percorre wrappers desconhecidos e reconstrói link por id", () => {
  const data = {
    payload: {
      bloco: {
        resultadosNovos: [
          {
            aweme_id: "7481234567890123456",
            author: { unique_id: "usuario_teste" },
            desc: "Vídeo teste",
          },
        ],
      },
    },
  };

  const items = downloadPack._test.tiktokItems(data);
  assert.equal(items.length, 1);
  assert.equal(
    downloadPack._test.tiktokPageUrl(items[0]),
    "https://www.tiktok.com/@usuario_teste/video/7481234567890123456"
  );
});

test("YouTube normaliza campos objeto sem produzir object Object", () => {
  const video = youtubeResult.normalizeYoutubeItem({
    type: "video",
    videoId: "abcdefghijk",
    title: { text: "Título teste" },
    author: { name: "Canal teste" },
    duration: { timestamp: "3:21" },
    views: { text: "123 mil" },
    thumbnail: { url: "https://img.example.com/thumb.jpg" },
  });

  assert.equal(video.title, "Título teste");
  assert.equal(video.channel, "Canal teste");
  assert.equal(video.duration, "3:21");
  assert.equal(video.views, "123 mil");
  assert.equal(video.thumbnail, "https://img.example.com/thumb.jpg");
  assert.doesNotMatch(youtubeResult.infoText(video), /\[object Object\]/);
});

test("play e ytmp3 usam o resolvedor robusto de áudio", () => {
  const playSource = fs.readFileSync(
    path.join(__dirname, "..", "commands", "dws", "play.js"),
    "utf8"
  );
  const ytmp3Source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "dws", "ytmp3.js"),
    "utf8"
  );
  const playAudioSource = fs.readFileSync(
    path.join(__dirname, "..", "commands", "dws", "play_audio.js"),
    "utf8"
  );
  const helper = fs.readFileSync(
    path.join(__dirname, "..", "functions", "youtubeMedia.js"),
    "utf8"
  );

  for (const source of [playSource, ytmp3Source, playAudioSource]) {
    assert.match(source, /sendYoutubeAudio/);
  }

  assert.match(helper, /\/api\/youtube-play/);
  assert.match(helper, /\/api\/youtube-audio/);
  assert.match(helper, /downloadAudioUrl/);
  assert.match(helper, /audio: audio\.buffer/);
});

test("ytsearch usa lista single_select pelo mesmo wrapper do menu", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "dws", "ytsearch.js"),
    "utf8"
  );

  assert.match(source, /sendInteractiveMessage/);
  assert.match(source, /name: "single_select"/);
  assert.match(source, /title: "🎬 Resultados"/);
  assert.match(source, /aimode: true/);
  assert.match(source, /prefix \+ "ytplay " \+ video\.url/);
  assert.match(source, /sendFallback/);
  assert.match(source, /\[YTSEARCH LIST\]/);
});

test("single_select do ytsearch vira comando mesmo dentro de viewOnce", () => {
  const msg = {
    message: {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            nativeFlowResponseMessage: {
              paramsJson: JSON.stringify({
                selected_row_id: ".ytplay https://www.youtube.com/watch?v=abcdefghijk",
              }),
            },
          },
        },
      },
    },
  };

  assert.equal(
    messageText.extractMessageText(msg),
    ".ytplay https://www.youtube.com/watch?v=abcdefghijk"
  );
  assert.equal(messageText.isInteractiveReply(msg), true);
  assert.equal(
    messageText.interactiveReplyId(msg),
    ".ytplay https://www.youtube.com/watch?v=abcdefghijk"
  );

  const startBotSource = fs.readFileSync(
    path.join(__dirname, "..", "core", "startBot.js"),
    "utf8"
  );
  assert.match(startBotSource, /!interactiveReply && isAntiAtivo\(from, 'link'\)/);
});

test("ytplay usa botões nativos de áudio vídeo e documento", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "dws", "ytplay.js"),
    "utf8"
  );
  const helper = fs.readFileSync(
    path.join(__dirname, "..", "functions", "youtubeResult.js"),
    "utf8"
  );

  assert.match(source, /sendYoutubeChoice/);
  assert.doesNotMatch(source, /gifted-btns/);
  assert.match(helper, /quick_reply/);
  assert.match(helper, /🎵 Áudio/);
  assert.match(helper, /📹 Vídeo/);
  assert.match(helper, /📄 Documento/);
  assert.match(helper, /prefix \+ "play " \+ video\.url/);
  assert.match(helper, /prefix \+ "ytmp4 " \+ video\.url/);
});

test("play não reaproveita aliases canônicos de play_audio", () => {
  const play = require("../commands/dws/play");
  const playAudio = require("../commands/dws/play_audio");
  assert.deepEqual(play.aliases, ["yta"]);
  assert.equal(playAudio.name, "play_audio");
  assert.ok(playAudio.aliases.includes("playaudio"));
});

test("resolvedor de mídia YouTube extrai URL de JSON", () => {
  assert.equal(
    youtubeMedia.firstMediaUrl({
      resultado: {
        download: "https://cdn.example.com/audio.mp3",
      },
    }),
    "https://cdn.example.com/audio.mp3"
  );
});

test("extras Tokito incluem playdoc TikTok foto e metadinha", () => {
  const names = extraPack.map(x => x.name);
  assert.ok(names.includes("playdoc"));
  assert.ok(names.includes("tiktokfoto"));
  assert.ok(names.includes("metadinha"));
});

test("playlist resolve resultado da pesquisa YouTube", () => {
  const track = playlist._internals.trackFromSearch({ resultado: [{
    title: "Faixa", url: "https://youtube.com/watch?v=abc", channel: "Canal", duration: "3:10"
  }] });
  assert.equal(track.title, "Faixa");
  assert.equal(track.url, "https://youtube.com/watch?v=abc");
});

test("cards RPG Tokito incluem level e coinscard", () => {
  const names = rpgCards.map(x => x.name);
  assert.deepEqual(names, ["level", "coinscard"]);
});

test("perfil e welcome apontam para os canvases da Tokito API", () => {
  const perfil = fs.readFileSync(path.join(__dirname, "..", "commands", "outros", "perfil.js"), "utf8");
  const welcome = fs.readFileSync(path.join(__dirname, "..", "functions", "groupWelcomeBanner.js"), "utf8");
  assert.match(perfil, /\/canvas\/perfil/);
  assert.match(welcome, /\/canvas\/welcome/);
});

test("RPG está organizado em seções Tokito-style", () => {
  const registro = fs.readFileSync(path.join(__dirname, "..", "commands", "rpg", "registro.js"), "utf8");
  const ficha = fs.readFileSync(path.join(__dirname, "..", "commands", "rpg", "ficha.js"), "utf8");
  const loja = fs.readFileSync(path.join(__dirname, "..", "commands", "rpg", "loja.js"), "utf8");
  assert.match(registro, /Sistema RPG/);
  assert.match(ficha, /Sistema RPG/);
  assert.match(loja, /Loja e Itens/);
});

test("todos os novos comandos carregam no registry sem erro de módulo", () => {
  const commandsPath = path.join(__dirname, "..", "commands");
  const loaded = loadCommandModules(commandsPath, { clearCache: true });
  assert.equal(loaded.errors.length, 0, loaded.errors.map(x => x.file + ": " + x.error.message).join("\n"));
  const built = buildCommandRegistry(loaded.records);
  const required = [
    "gemini", "openai", "tiktoksearch", "spotifysearch", "facebook", "twitter",
    "playdoc", "tiktokfoto", "playlist", "level", "coinscard",
    "akinator", "transcrever", "figu", "brat", "likes", "criarsala", "iaaudio", "chatia", "apitest", "darkgreen", "neonglitch", "galaxy",
    "play_audio", "playvideo", "spotify_audio", "tiktok_audio", "instagram_audio", "face_audio", "twitter_audio", "kwai_audio", "apple_audio", "sound_audio", "menulogos",
    "casal", "casalgif", "mines", "adivinhepalavra", "cacapalavras", "resetforca", "resetquiz", "resetmines", "resetadivinhe", "resetcaca", "logoglitch", "logocartoon", "logodesfoque"
  ];
  for (const name of required) assert.ok(built.registry[name], name);
  assert.ok(built.registry.printsite, "printsite");
});


test("Akinator e transcrição usam rotas Tokito dedicadas", () => {
  assert.equal(akinator.name, "akinator");
  assert.ok(akinator.aliases.includes("aki"));
  assert.equal(totext.name, "transcrever");
  assert.ok(totext.aliases.includes("totext"));

  const akiSource = fs.readFileSync(
    path.join(__dirname, "..", "commands", "brincadeiras", "akinator.js"),
    "utf8"
  );
  const textSource = fs.readFileSync(
    path.join(__dirname, "..", "commands", "outros", "util-texto.js"),
    "utf8"
  );

  assert.match(akiSource, /\/api\/akinator\/start/);
  assert.match(akiSource, /\/api\/akinator\/answer/);
  assert.match(akiSource, /\/canvas\/akinator/);
  assert.match(textSource, /\/api\/outros\/totext/);
});

test("pacote de stickers Tokito inclui categorias figu e Brat consolidado", () => {
  const names = stickerPack.map(x => x.name);
  for (const name of ["figu", "figuemoji", "figuanime", "figuflork"]) {
    assert.ok(names.includes(name), name);
  }
  const bratNames = bratPack.map(x => x.name);
  assert.ok(bratNames.includes("brat"));
  assert.ok(bratNames.includes("bratvid"));
});

test("Free Fire Tokito inclui likes e controles de sala", () => {
  const names = freeFirePack.map(x => x.name);
  for (const name of ["likes", "criarsala", "versala", "jogadoressala", "expulsarsala", "iniciarsala", "pararsala", "statussalas"]) {
    assert.ok(names.includes(name), name);
  }
});

test("playdoc usa o mesmo youtube-audio do Tokito V10", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "dws", "tokito-api-extras.js"),
    "utf8"
  );
  assert.match(source, /\/api\/youtube-audio/);
  assert.doesNotMatch(source, /\/api\/youtube-doc/);
});

test("ping usa o canvas ping2 da Tokito", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "outros", "ping.js"),
    "utf8"
  );
  assert.match(source, /\/canvas\/ping2/);
  assert.match(source, /const background = requesterPicture\?\.url \|\| fallbackBackground/);
  assert.match(source, /fundo: background/);
});


test("novos comandos visuais Tokito V10 estão registrados sem duplicação", () => {
  assert.deepEqual(gamesPack.map(command => command.name), ["adivinhepalavra", "mines", "cacapalavras", "resetmines", "resetadivinhe", "resetcaca"]);
  assert.deepEqual(couplePack.map(command => command.name), ["casal", "casalgif"]);

  const gamesSource = fs.readFileSync(
    path.join(__dirname, "..", "commands", "brincadeiras", "tokito-api-games.js"),
    "utf8"
  );
  const coupleSource = fs.readFileSync(
    path.join(__dirname, "..", "commands", "brincadeiras", "tokito-api-couple.js"),
    "utf8"
  );

  assert.match(gamesSource, /\/canvas\/adivinhepalavra/);
  assert.match(gamesSource, /\/canvas\/mines/);
  assert.match(gamesSource, /\/canvas\/cacapalavras/);
  assert.match(coupleSource, /\/canvas\/casal2/);
  assert.match(coupleSource, /\/canvas\/casal2-gif/);
});

test("forca existente usa o canvas Tokito V10 com fallback de texto", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "brincadeiras", "extras.js"),
    "utf8"
  );

  assert.match(source, /\/canvas\/forca/);
  assert.match(source, /sendForcaCard/);
});

test("pacote de logos Tokito V10 registra os endpoints de arte", () => {
  const names = logoPack.map(command => command.name);
  assert.ok(names.length >= 41);
  assert.ok(logoPack.every(command => command.menuCategory === "Logos"));
  for (const name of [
    "darkgreen",
    "logoglitch",
    "advancedglow",
    "neonglitch",
    "blackpink",
    "galaxy",
    "naruto",
    "amongus",
    "comic3d",
    "logocartoon",
    "logodesfoque"
  ]) {
    assert.ok(names.includes(name), name);
  }

  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "outros", "tokito-api-logos.js"),
    "utf8"
  );
  assert.match(source, /"\/api\/" \+ route/);
  assert.match(source, /\{ texto: text \}/);
});


test("quiz existente usa o canvas Tokito V10 e possui reset", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "outros", "tokito-extras.js"),
    "utf8"
  );

  assert.match(source, /\/canvas\/quiz/);
  assert.match(source, /name: "resetquiz"/);
});

test("forca e jogos Tokito possuem comandos de reset sem duplicar jogos antigos", () => {
  const forcaSource = fs.readFileSync(
    path.join(__dirname, "..", "commands", "brincadeiras", "extras.js"),
    "utf8"
  );
  const gamesSource = fs.readFileSync(
    path.join(__dirname, "..", "commands", "brincadeiras", "tokito-api-games.js"),
    "utf8"
  );

  assert.match(forcaSource, /"resetforca"/);
  assert.match(gamesSource, /resetCommand\("resetmines"/);
  assert.match(gamesSource, /resetCommand\("resetadivinhe"/);
  assert.match(gamesSource, /resetCommand\("resetcaca"/);
});
