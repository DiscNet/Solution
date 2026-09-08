const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const sharp = require("sharp");

const { getMediaSource, buildArgs } = require("../functions/mediaTransform");
const { getImageSource, applyImageEffect } = require("../functions/imageTransform");
const mediaCommands = require("../commands/alteradores/media");
const imageCommands = require("../commands/alteradores/imagem");

test("mediaTransform encontra áudio respondido dentro de wrappers do WhatsApp", () => {
  const msg = { message: { ephemeralMessage: { message: { extendedTextMessage: { contextInfo: { quotedMessage: { viewOnceMessageV2: { message: { audioMessage: { mimetype: "audio/ogg; codecs=opus" } } } } } } } } } };
  const source = getMediaSource(msg);
  assert.ok(source);
  assert.equal(source.type, "audio");
  assert.equal(source.downloadType, "audio");
});

test("mediaTransform reconhece documento de vídeo", () => {
  const msg = { message: { documentMessage: { mimetype: "video/mp4" } } };
  const source = getMediaSource(msg);
  assert.ok(source);
  assert.equal(source.type, "video");
  assert.equal(source.downloadType, "document");
});

test("nomes novos de áudio mantêm os aliases antigos", () => {
  const byName = Object.fromEntries(mediaCommands.map((command) => [command.name, command]));
  assert.ok(byName.estourar);
  assert.ok(byName.estourar.aliases.includes("aestourado"));
  assert.ok(byName.estourar.aliases.includes("aestourar"));
  assert.ok(byName.reverter.aliases.includes("areverse"));
  assert.ok(byName.lento.aliases.includes("aslow"));
  assert.ok(byName.rapido.aliases.includes("aspeed"));
  assert.ok(byName.agudo.aliases.includes("afinado"));
  assert.ok(byName.grave.aliases.includes("agravado"));
  assert.ok(byName.eco.aliases.includes("ecoaudio"));
});

test("estourar usa clipping/distorção em vez de compressor", () => {
  const command = mediaCommands.find((item) => item.name === "estourar");
  assert.ok(command);
  const def = command.mediaDefinition;
  assert.match(def.audioFilter, /asoftclip/);
  assert.match(def.audioFilterFallback, /acrusher/);
  assert.doesNotMatch(def.audioFilter, /acompressor/);
  const args = buildArgs(def, "input.ogg", "output.mp3", { hasAudio: true, hasVideo: false });
  assert.ok(args.includes("-af"));
  assert.ok(args.includes(def.audioFilter));
});

test("pipeline de imagem encontra imagem em documento respondido", () => {
  const msg = { message: { extendedTextMessage: { contextInfo: { quotedMessage: { ephemeralMessage: { message: { documentMessage: { mimetype: "image/png" } } } } } } } };
  const source = getImageSource(msg);
  assert.ok(source);
  assert.equal(source.downloadType, "document");
  assert.equal(source.mimetype, "image/png");
});

test("imagem possui pelo menos 13 efeitos novos e não duplica invert/negative", () => {
  const extras = new Set(["brilho", "contraste", "dessaturar", "posterizar", "solarizar", "vinheta", "duotone", "glitch", "cromatico", "vintage", "desbotar", "moldura", "termico", "neon"]);
  assert.ok(extras.size >= 13);
  const byName = Object.fromEntries(imageCommands.map((command) => [command.name, command]));
  for (const name of extras) assert.ok(byName[name], `faltando efeito ${name}`);
  assert.ok(byName.negativo);
  assert.ok(byName.negativo.aliases.includes("invert"));
  assert.ok(byName.negativo.aliases.includes("negative"));
  assert.equal(byName.invert, undefined);
  assert.equal(byName.negative, undefined);
});

test("efeitos de imagem escolhidos produzem resultados distintos", async () => {
  const width = 32, height = 24, channels = 3;
  const raw = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    raw[i] = (x * 7 + y * 3) % 256;
    raw[i + 1] = (x * 5 + y * 11) % 256;
    raw[i + 2] = (x * 13 + y * 2) % 256;
  }
  const input = await sharp(raw, { raw: { width, height, channels } }).png().toBuffer();
  const effects = ["negative", "posterize", "solarize", "glitch", "thermal", "neon"];
  const hashes = new Set();
  for (const effect of effects) {
    const output = await applyImageEffect(input, effect);
    assert.ok(output.length > 0);
    hashes.add(crypto.createHash("sha256").update(output).digest("hex"));
  }
  assert.equal(hashes.size, effects.length);
});
