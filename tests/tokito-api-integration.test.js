const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const tokitoApi = require("../functions/tokitoApi");
const spotify = require("../commands/dws/spotify");
const pin = require("../commands/dws/pinterest");
const aiPack = require("../commands/outros/tokito-api-ai");
const downloadPack = require("../commands/dws/tokito-api-downloads");
const extraPack = require("../commands/dws/tokito-api-extras");
const playlist = require("../commands/dws/playlist");
const rpgCards = require("../commands/rpg/tokito-cards");
const akinator = require("../commands/outros/tokito-akinator");
const totext = require("../commands/outros/tokito-totext");
const stickerPack = require("../commands/sticker/tokito-api-stickers");
const freeFirePack = require("../commands/outros/tokito-freefire");
const { loadCommandModules, buildCommandRegistry } = require("../functions/commandRegistry");

test("Tokito API client centraliza base URL e chave", () => {
  const u = new URL(tokitoApi.url("/api/youtube-search", { query: "teste" }));
  assert.equal(u.origin + u.pathname, "https://tokito-apis.com.br/api/youtube-search");
  assert.equal(u.searchParams.get("query"), "teste");
  assert.ok(u.searchParams.get("apikey"));
});

test("Spotify reconhece link e mantém busca textual", () => {
  assert.equal(spotify._internals.isSpotifyUrl("https://open.spotify.com/track/abc"), true);
  assert.equal(spotify._internals.isSpotifyUrl("musica qualquer"), false);
});

test("Pinterest aceita resultados em string ou objeto", () => {
  const urls = pin._internals.imageUrls({ resultado: [
    "https://example.com/1.jpg",
    { image: "https://example.com/2.jpg" },
  ] });
  assert.deepEqual(urls, ["https://example.com/1.jpg", "https://example.com/2.jpg"]);
});

test("pacote IA registra endpoints Tokito esperados", () => {
  const names = aiPack.map(x => x.name);
  for (const name of ["gemini", "geminipro", "openai", "perplexity", "tokitoia", "geminitts"]) {
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
    "akinator", "totext", "figu", "brat", "likes", "criarsala"
  ];
  for (const name of required) assert.ok(built.registry[name], name);
  assert.ok(built.registry.printsite, "printsite");
});


test("Akinator e transcrição usam rotas Tokito dedicadas", () => {
  assert.equal(akinator.name, "akinator");
  assert.ok(akinator.aliases.includes("aki"));
  assert.equal(totext.name, "totext");
  assert.ok(totext.aliases.includes("transcrever"));

  const akiSource = fs.readFileSync(
    path.join(__dirname, "..", "commands", "outros", "tokito-akinator.js"),
    "utf8"
  );
  const textSource = fs.readFileSync(
    path.join(__dirname, "..", "commands", "outros", "tokito-totext.js"),
    "utf8"
  );

  assert.match(akiSource, /\/api\/akinator\/start/);
  assert.match(akiSource, /\/api\/akinator\/answer/);
  assert.match(akiSource, /\/canvas\/akinator/);
  assert.match(textSource, /\/api\/outros\/totext/);
});

test("pacote de stickers Tokito inclui Brat e categorias figu", () => {
  const names = stickerPack.map(x => x.name);
  for (const name of ["figu", "figuemoji", "figuanime", "figuflork", "brat", "bratvid"]) {
    assert.ok(names.includes(name), name);
  }
});

test("Free Fire Tokito inclui likes e controles de sala", () => {
  const names = freeFirePack.map(x => x.name);
  for (const name of ["likes", "criarsala", "versala", "jogadoressala", "expulsarsala", "iniciarsala", "pararsala", "statussalas"]) {
    assert.ok(names.includes(name), name);
  }
});

test("playdoc usa o endpoint youtube-doc da Tokito", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "dws", "tokito-api-extras.js"),
    "utf8"
  );
  assert.match(source, /\/api\/youtube-doc/);
});

test("ping usa o canvas ping2 da Tokito", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "outros", "ping.js"),
    "utf8"
  );
  assert.match(source, /\/canvas\/ping2/);
});
