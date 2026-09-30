const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Readable } = require('stream');
const sharp = require('sharp');
const art = require('../MÓDULOS/functions/asciiArt');
const runtime = require('../MÓDULOS/functions/runtimeCompat');
const { createAsciiCommand } = require('../MÓDULOS/plugins/util/ascii');

test('FFmpeg fallback flattens sticker transparency to the same white background', async t => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ascii-alpha-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const image = await sharp({ create: { width: 80, height: 80, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } }).webp().toBuffer();
  const result = await art.imageToAscii(image, {}, {
    sharp: () => { const error = new Error('missing sharp'); error.code = 'ERR_IMAGE_ENGINE_UNAVAILABLE'; throw error; },
    tempDir
  });
  assert(result.text.split('\n').every(line => line === ' '.repeat(32)));
  assert.deepEqual(fs.readdirSync(tempDir), []);
});

async function fixture(format = 'png') {
  const width = 160, height = 80;
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const value = Math.round(x * 255 / (width - 1));
    const index = (y * width + x) * 3;
    data[index] = data[index + 1] = data[index + 2] = value;
  }
  return sharp(data, { raw: { width, height, channels: 3 } }).toFormat(format).toBuffer();
}
function incoming(payload = {}) {
  return { key: { remoteJid: 'fixture@g.us', id: 'fixture' },
    message: { extendedTextMessage: { text: '.ascii', contextInfo: { quotedMessage: { imageMessage: payload } } } } };
}
function commandFixture(dependencies = {}) {
  const messages = [];
  const conn = { async sendMessage(from, content, options) { messages.push({ from, content, options }); } };
  const command = createAsciiCommand({ getPrefix: () => '.', quote: msg => msg, ...dependencies });
  return { command, conn, messages };
}

test('options accept width and combined effects in any order', () => {
  assert.equal(art.parseOptions().width, 32);
  assert.deepEqual(art.parseOptions(['detalhado', '80', 'negativo', 'arquivo']),
    { width: 80, detailed: true, invert: true, file: true, help: false });
  assert.equal(art.parseOptions(['ajuda']).help, true);
});

test('invalid or excessive widths and unknown options are rejected', () => {
  for (const args of [['0'], ['-1'], ['121'], ['16.5'], ['99999999999999999'], ['80','90']]) {
    assert.throws(() => art.parseOptions(args), error => /^ERR_ASCII_/.test(error.code));
  }
  assert.throws(() => art.parseOptions(['--shell']), { code: 'ERR_ASCII_OPTIONS' });
});

test('pixels use grayscale levels, preserve complete rows and invert correctly', () => {
  const data = Buffer.from([0,85,170,255]);
  assert.equal(art.pixelsToAscii(data, 4, 1), '@*- ');
  assert.equal(art.pixelsToAscii(data, 4, 1, { invert: true }), ' -*@');
  assert.equal(art.pixelsToAscii(Buffer.from([0,255,0,255]), 2, 2), '@ \n@ ');
  const ramp = Buffer.from(Array.from({ length: 256 }, (_, index) => index));
  assert(new Set(art.pixelsToAscii(ramp, 256, 1, { detailed: true })).size >
    new Set(art.pixelsToAscii(ramp, 256, 1)).size);
});

for (const format of ['jpeg', 'png', 'webp', 'gif']) {
  test('converts a real ' + format + ' image with corrected aspect ratio', async () => {
    const result = await art.imageToAscii(await fixture(format));
    assert.equal(result.width, 32); assert.equal(result.height, 8);
    assert.equal(result.text.split('\n').length, 8);
    assert(result.text.split('\n').every(line => line.length === 32));
    assert(result.text.split('\n').every(line => line[0] === '@' && line[31] === ' '));
  });
}

test('EXIF rotation is applied before calculating character proportions', async () => {
  const image = await sharp({ create: { width: 160, height: 80, channels: 3, background: '#444' } })
    .withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const result = await art.imageToAscii(image);
  assert.equal(result.width, 32); assert.equal(result.height, 32);
});

test('transparent pixels are flattened consistently on a white background', async () => {
  const buffer = await sharp({ create: { width: 80, height: 80, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } }).png().toBuffer();
  const result = await art.imageToAscii(buffer);
  assert(result.text.split('\n').every(line => line === ' '.repeat(32)));
});

test('very tall images are scaled to bounded rows without stretching', () => {
  const size = art.gridSize(100, 4000, 120);
  assert.equal(size.height, 120); assert.equal(size.width, 6);
});

test('invalid image data and oversized images fail with clear codes', async () => {
  await assert.rejects(art.imageToAscii(Buffer.from('not an image')), { code: 'ERR_ASCII_IMAGE' });
  await assert.rejects(art.imageToAscii(Buffer.alloc(art.MAX_INPUT_BYTES + 1)), { code: 'ERR_ASCII_TOO_LARGE' });
  assert.throws(() => art.gridSize(10000,10000,32), { code: 'ERR_ASCII_TOO_LARGE' });
});

test('media selection supports direct, ephemeral, quoted images and image documents', () => {
  const image = { imageMessage: { url: 'fixture-image' } };
  assert.equal(art.imageSource({ message: image }).payload.url, 'fixture-image');
  assert.equal(art.imageSource({ message: { ephemeralMessage: { message: image } } }).type, 'image');
  assert.equal(art.imageSource(incoming({ url: 'quoted' })).payload.url, 'quoted');
  assert.equal(art.imageSource({ message: { documentWithCaptionMessage: { message: {
    documentMessage: { mimetype: 'image/png', fileName: 'photo.png' } } } } }).type, 'document');
  assert.equal(art.imageSource({ message: { stickerMessage: { url: 'sticker' } } }).type, 'sticker');
  assert.equal(art.imageSource({ message: { videoMessage: {} } }), null);
});

test('media can be quoted from an image caption context', () => {
  const msg = { message: { imageMessage: { contextInfo: {
    quotedMessage: { stickerMessage: { url: 'quoted-sticker' } }
  } } } };
  // A command on the current photo converts that photo first.
  assert.equal(art.imageSource(msg).type, 'image');
  assert.equal(art.imageSource({ message: { videoMessage: { contextInfo: {
    quotedMessage: { imageMessage: { url: 'quoted-photo' } }
  } } } }).payload.url, 'quoted-photo');
});

test('stream download is bounded and checks declared file size before downloading', async () => {
  let called = false;
  await assert.rejects(art.downloadImage({ payload: { fileLength: art.MAX_INPUT_BYTES + 1 }, type: 'image' },
    async () => { called = true; }), { code: 'ERR_ASCII_TOO_LARGE' });
  assert.equal(called, false);
  await assert.rejects(art.downloadImage({ payload: {}, type: 'image' },
    async () => Readable.from([Buffer.alloc(art.MAX_INPUT_BYTES), Buffer.alloc(1)])), { code: 'ERR_ASCII_TOO_LARGE' });
  const buffer = await art.downloadImage({ payload: {}, type: 'image' },
    async () => Readable.from([Buffer.from('abc'),Buffer.from('def')]));
  assert.equal(buffer.toString(), 'abcdef');
});

test('expired media returns a download error without asking to install jp2a', async () => {
  await assert.rejects(art.downloadImage({ payload: {}, type: 'image' },
    async () => { throw new Error('expired media'); }), { code: 'ERR_ASCII_DOWNLOAD' });
});

test('command sends real ASCII in a monospace block and survives reaction failures', async () => {
  const image = await fixture();
  const f = commandFixture({ download: async () => Readable.from([image]) });
  f.conn.sendMessage = async (from, content, options) => {
    if (content.react) throw new Error('reaction failed');
    f.messages.push({ from, content, options });
  };
  const msg = incoming();
  await f.command.execute(f.conn, msg, [], 'fixture@g.us');
  assert.equal(f.messages.length, 1);
  const text = f.messages[0].content.text;
  assert.match(text, /32 × 8/);
  assert(text.includes(String.fromCharCode(96).repeat(3)));
  assert.equal(f.messages[0].options.quoted, msg);
});

test('wide or large art is delivered once as a complete txt file', async () => {
  const image = await fixture();
  const f = commandFixture({ download: async () => Readable.from([image]) });
  await f.command.execute(f.conn, incoming(), ['120','detalhado'], 'fixture@g.us');
  const sent = f.messages.filter(message => !message.content.react);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].content.mimetype, 'text/plain');
  const rows = sent[0].content.document.toString('utf8').trimEnd().split('\n');
  assert.equal(rows.length, 30);
  assert.equal(sent[0].content.fileName, 'ascii_120x30.txt');
  assert(sent[0].content.document.toString('utf8').split('\n').slice(0,30).every(row => row.length === 120));
});

test('explicit file mode preserves the full art with small images', async () => {
  const f = commandFixture({ download: async () => Readable.from([await fixture()]) });
  await f.command.execute(f.conn, incoming(), ['arquivo'], 'fixture@g.us');
  assert.equal(f.messages.filter(message => !message.content.react)[0].content.fileName, 'ascii_32x8.txt');
});

test('help and missing images avoid downloads', async () => {
  let downloads = 0;
  const f = commandFixture({ download: async () => { downloads++; } });
  await f.command.execute(f.conn, { key: {}, message: { conversation: '.ascii' } }, [], 'fixture@g.us');
  await f.command.execute(f.conn, incoming(), ['ajuda'], 'fixture@g.us');
  assert.equal(downloads, 0);
  assert(f.messages.every(message => message.content.text.includes('.ascii negativo')));
});

test('command reports precise errors and prevents duplicate generic error replies', async () => {
  const f = commandFixture({ download: async () => Readable.from([Buffer.from('bad')]) });
  await assert.rejects(f.command.execute(f.conn, incoming(), [], 'fixture@g.us'), error => {
    assert.equal(error.code, 'ERR_ASCII_IMAGE'); assert.equal(error.userMessageSent, true); return true;
  });
  const sent = f.messages.filter(message => !message.content.react);
  assert.equal(sent.length, 1);
  assert.match(sent[0].content.text, /JPG, PNG ou WebP/);
  assert(!sent[0].content.text.includes('jp2a'));
});

test('FFmpeg fallback converts real images and removes its temporary files', async t => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ascii-fallback-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const calls = [];
  const result = await art.imageToAscii(await fixture(), {}, {
    sharp: () => { const error = new Error('missing sharp'); error.code = 'ERR_IMAGE_ENGINE_UNAVAILABLE'; throw error; },
    tempDir, execFile: async (program, args, options) => {
      calls.push({ program, args, options });
      return runtime.execFileCompat(program, args, options);
    }
  });
  assert.equal(result.width, 32); assert.equal(result.height, 8);
  assert(calls.every(call => call.options.useTnode === true));
  assert.deepEqual(calls.map(call => call.program), ['ffprobe','ffmpeg']);
  assert.deepEqual(fs.readdirSync(tempDir), []);
});

test('FFmpeg fallback also removes temporary files if decoding fails', async t => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ascii-failure-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  await assert.rejects(art.imageToAscii(await fixture(), {}, {
    sharp: () => { const error = new Error('missing sharp'); error.code = 'ERR_IMAGE_ENGINE_UNAVAILABLE'; throw error; },
    tempDir, execFile: async () => { throw new Error('failed tool'); }
  }), { code: 'ERR_ASCII_IMAGE' });
  assert.deepEqual(fs.readdirSync(tempDir), []);
});
