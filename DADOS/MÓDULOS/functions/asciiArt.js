const fs = require('fs');
const path = require('path');
const { unwrapMessage } = require('./messageText');
const sharpCompat = require('./sharpCompat');
const runtime = require('./runtimeCompat');

const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const MAX_INPUT_PIXELS = 24 * 1024 * 1024;
const MAX_ROWS = 120;
const DEFAULT_WIDTH = 32;
const CHAT_WIDTH_LIMIT = 36;
const TEXT_LIMIT = 3500;
const RAMPS = { normal: '@%#*+=-:. ', detailed: '@MW#8&%$*o+=-:,. ' };

function asciiError(code, cause) {
  const error = new Error(code); error.code = code;
  if (cause) error.cause = cause;
  return error;
}

function parseOptions(args = []) {
  const options = { width: DEFAULT_WIDTH, invert: false, detailed: false, file: false, help: false };
  let hasWidth = false;
  for (const raw of args) {
    const arg = String(raw).toLowerCase().trim();
    if (['ajuda', 'help', '--help', '-h'].includes(arg)) options.help = true;
    else if (['negativo', 'invertido', 'inverter', '--invert'].includes(arg)) options.invert = true;
    else if (['detalhado', 'detalhe', '--detail'].includes(arg)) options.detailed = true;
    else if (['arquivo', 'txt', '--file'].includes(arg)) options.file = true;
    else if (/^-?\d+$/.test(arg) && !hasWidth) {
      options.width = Number(arg); hasWidth = true;
      if (!Number.isSafeInteger(options.width) || options.width < 16 || options.width > 120) {
        throw asciiError('ERR_ASCII_WIDTH');
      }
    } else throw asciiError('ERR_ASCII_OPTIONS');
  }
  return options;
}

function imageContent(raw) {
  const message = unwrapMessage(raw);
  if (message.imageMessage) return { payload: message.imageMessage, type: 'image' };
  if (message.stickerMessage) return { payload: message.stickerMessage, type: 'sticker' };
  const document = message.documentMessage;
  if (document && (/^image\/(?:jpeg|jpg|png|webp|gif|avif|heic|heif|tiff|bmp)$/i.test(document.mimetype || '') ||
      /\.(?:jpe?g|png|webp|gif|avif|heic|heif|tiff?|bmp)$/i.test(document.fileName || ''))) {
    return { payload: document, type: 'document' };
  }
  return null;
}

function imageSource(msg) {
  const message = unwrapMessage(msg?.message);
  const direct = imageContent(message);
  if (direct) return direct;
  for (const value of Object.values(message)) {
    if (!value || typeof value !== 'object') continue;
    const quoted = value.contextInfo?.quotedMessage;
    const image = quoted && imageContent(quoted);
    if (image) return image;
  }
  return null;
}

async function downloadImage(source, download) {
  if (Number(source.payload.fileLength || 0) > MAX_INPUT_BYTES) throw asciiError('ERR_ASCII_TOO_LARGE');
  let stream;
  try {
    stream = await download(source.payload, source.type);
    const chunks = [];
    let size = 0;
    for await (const chunk of stream) {
      size += chunk.length;
      if (size > MAX_INPUT_BYTES) {
        stream.destroy?.();
        throw asciiError('ERR_ASCII_TOO_LARGE');
      }
      chunks.push(Buffer.from(chunk));
    }
    if (!size) throw asciiError('ERR_ASCII_DOWNLOAD');
    return Buffer.concat(chunks);
  } catch (error) {
    if (error.code?.startsWith('ERR_ASCII_')) throw error;
    throw asciiError('ERR_ASCII_DOWNLOAD', error);
  }
}

function rasterFormat(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'jpeg';
  if (/^GIF8[79]a/.test(buffer.subarray(0, 6).toString('ascii'))) return 'gif';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (buffer.subarray(0, 2).toString('ascii') === 'BM') return 'bmp';
  if (buffer.subarray(0, 4).equals(Buffer.from([73,73,42,0])) || buffer.subarray(0, 4).equals(Buffer.from([77,77,0,42]))) return 'tiff';
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp' && /avif|avis|heic|heix|hevc|hevx|mif1|msf1/.test(buffer.subarray(8, 48).toString('ascii'))) return 'heif';
  throw asciiError('ERR_ASCII_IMAGE');
}

function gridSize(width, height, columns) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw asciiError('ERR_ASCII_IMAGE');
  }
  if (width * height > MAX_INPUT_PIXELS) throw asciiError('ERR_ASCII_TOO_LARGE');
  // A monospace character is about twice as tall as it is wide.
  let rows = Math.max(1, Math.round(height / width * columns * 0.5));
  if (rows > MAX_ROWS) {
    columns = Math.max(1, Math.round(columns * MAX_ROWS / rows));
    rows = MAX_ROWS;
  }
  return { width: columns, height: rows };
}

async function decodeSharp(buffer, options, sharp) {
  const pipeline = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, animated: false, pages: 1, failOn: 'error' });
  const metadata = await pipeline.metadata();
  let width = metadata.width, height = metadata.pageHeight || metadata.height;
  if ([5,6,7,8].includes(metadata.orientation)) [width, height] = [height, width];
  const size = gridSize(width, height, options.width);
  return pipeline.autoOrient().flatten({ background: '#ffffff' })
    .resize(size.width, size.height, { fit: 'fill', kernel: 'lanczos3' })
    .toColourspace('b-w').raw().toBuffer({ resolveWithObject: true });
}

async function decodeFfmpeg(buffer, format, options, dependencies) {
  const run = dependencies.execFile || runtime.execFileCompat;
  const base = dependencies.tempDir || runtime.writableTempDir('solution-ascii');
  fs.mkdirSync(base, { recursive: true });
  const directory = fs.mkdtempSync(path.join(base, 'image-'));
  const input = path.join(directory, 'input.' + format);
  try {
    fs.writeFileSync(input, buffer);
    const probe = await run('ffprobe', [
      '-v', 'error', '-protocol_whitelist', 'file,pipe', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height:stream_side_data=rotation', '-of', 'json', input
    ], { encoding: 'utf8', useTnode: true, timeout: 15000, killSignal: 'SIGKILL', maxBuffer: 1024 * 1024 });
    const stream = JSON.parse(probe.stdout).streams?.[0];
    let width = stream?.width, height = stream?.height;
    const rotation = stream?.side_data_list?.find(item => Number.isFinite(item.rotation))?.rotation || 0;
    if (Math.abs(rotation) % 180 === 90) [width, height] = [height, width];
    const size = gridSize(width, height, options.width);
    const filters = '[0:v]scale=' + size.width + ':' + size.height + ':flags=area,format=rgba[fg];' +
      'color=c=white:s=' + size.width + 'x' + size.height + ':r=1,format=rgba[bg];' +
      '[bg][fg]overlay=shortest=1:format=auto,format=gray[out]';
    const converted = await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'file,pipe', '-threads', '1', '-i', input,
      '-frames:v', '1', '-filter_complex_threads', '1', '-filter_complex', filters, '-map', '[out]',
      '-threads', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1'
    ], { encoding: null, useTnode: true, timeout: 20000, killSignal: 'SIGKILL', maxBuffer: MAX_ROWS * 120 + 1024 });
    const data = Buffer.from(converted.stdout);
    if (data.length !== size.width * size.height) throw asciiError('ERR_ASCII_IMAGE');
    return { data, info: { ...size, channels: 1 } };
  } catch (error) {
    if (error.code?.startsWith('ERR_ASCII_')) throw error;
    if (['ERR_EXEC_MISSING', 'ERR_EXEC_PERMISSION'].includes(error.code)) throw asciiError('ERR_ASCII_ENGINE', error);
    throw asciiError('ERR_ASCII_IMAGE', error);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

function pixelsToAscii(data, width, height, options = {}) {
  if (data.length !== width * height) throw asciiError('ERR_ASCII_IMAGE');
  const histogram = new Uint32Array(256);
  for (const value of data) histogram[value]++;
  let lower = 0, upper = 255, count = 0;
  for (let value = 0; value < 256; value++) {
    count += histogram[value];
    if (count >= data.length * 0.01) { lower = value; break; }
  }
  count = 0;
  for (let value = 255; value >= 0; value--) {
    count += histogram[value];
    if (count >= data.length * 0.01) { upper = value; break; }
  }
  const ramp = options.detailed ? RAMPS.detailed : RAMPS.normal;
  const lines = [];
  for (let row = 0; row < height; row++) {
    let line = '';
    for (let col = 0; col < width; col++) {
      let value = data[row * width + col];
      if (upper - lower >= 12) value = Math.max(0, Math.min(255, (value - lower) * 255 / (upper - lower)));
      if (options.invert) value = 255 - value;
      line += ramp[Math.round(value / 255 * (ramp.length - 1))];
    }
    lines.push(line);
  }
  return lines.join('\n');
}

async function imageToAscii(buffer, options = {}, dependencies = {}) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw asciiError('ERR_ASCII_IMAGE');
  if (buffer.length > MAX_INPUT_BYTES) throw asciiError('ERR_ASCII_TOO_LARGE');
  const active = { width: DEFAULT_WIDTH, invert: false, detailed: false, ...options };
  if (!Number.isInteger(active.width) || active.width < 16 || active.width > 120) throw asciiError('ERR_ASCII_WIDTH');
  const format = rasterFormat(buffer);
  let pixels;
  try {
    pixels = await decodeSharp(buffer, active, dependencies.sharp || sharpCompat);
  } catch (error) {
    if (error.code?.startsWith('ERR_ASCII_')) throw error;
    if (/pixel limit/i.test(error.message)) throw asciiError('ERR_ASCII_TOO_LARGE', error);
    if (error.code === 'ERR_IMAGE_ENGINE_UNAVAILABLE' || /unsupported image format/i.test(error.message)) {
      pixels = await decodeFfmpeg(buffer, format, active, dependencies);
    } else throw asciiError('ERR_ASCII_IMAGE', error);
  }
  const text = pixelsToAscii(pixels.data, pixels.info.width, pixels.info.height, active);
  return { text, width: pixels.info.width, height: pixels.info.height };
}

module.exports = {
  MAX_INPUT_BYTES, MAX_INPUT_PIXELS, TEXT_LIMIT, DEFAULT_WIDTH, CHAT_WIDTH_LIMIT, RAMPS,
  parseOptions, imageSource, downloadImage, imageToAscii, pixelsToAscii, gridSize
};
