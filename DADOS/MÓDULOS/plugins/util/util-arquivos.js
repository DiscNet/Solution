// Menu: Utilidades - Arquivos/PDF
const fsp = require("fs").promises;
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const sharp = require("sharp");
const kit = require("../../functions/utilityKit");
const { createStatusQuoted } = require("../../functions/statusCard");

function ensurePdf(media) {
  const mime = String(media.mimetype || "").toLowerCase();
  const name = String(media.fileName || "").toLowerCase();
  if (media.type !== "document" || (mime !== "application/pdf" && !name.endsWith(".pdf"))) {
    throw kit.userError("Responda a um documento PDF.");
  }
}

async function pdfPages(file) {
  const text = await kit.run("pdfinfo", [file]);
  const match = String(text).match(/^Pages:\s+(\d+)/mi);
  return match ? Number(match[1]) : 0;
}

function parseRange(value, pages) {
  if (!value) return null;
  const m = String(value).match(/^(\d+)(?:-(\d+))?$/);
  if (!m) throw kit.userError("Use uma página como 3 ou um intervalo como 2-5.");
  const start = Number(m[1]);
  const end = Number(m[2] || m[1]);
  if (start < 1 || end < start || end > pages) throw kit.userError(`Escolha páginas entre 1 e ${pages}.`);
  return { start, end };
}

function mergeDir(sender) {
  return path.join(os.tmpdir(), "grimm-pdf-merge", String(sender || "user").replace(/[^a-z0-9_-]/gi, "_"));
}

const commands = [
  kit.makeCommand({
    name: "arquivo", section: "Arquivos", usage: "arquivo (responda à mídia)",
    async execute(conn, msg, args, from) {
      try {
        const media = await kit.downloadMedia(msg);
        const sha = crypto.createHash("sha256").update(media.buffer).digest("hex");
        const lines = [
          "📁 *Informações do arquivo*",
          `\nTipo: ${media.type}`,
          `MIME: ${media.mimetype || "—"}`,
          `Nome: ${media.fileName || "—"}`,
          `Tamanho: ${kit.formatBytes(media.buffer.length)}`,
          `SHA-256: ${sha}`,
        ];
        if (["image", "sticker"].includes(media.type)) {
          try {
            const meta = await sharp(media.buffer, { failOn: "none" }).metadata();
            lines.push(`Imagem: ${meta.width || "?"}x${meta.height || "?"} ${meta.format || ""}`);
          } catch (_) {}
        }
        await kit.reply(conn, msg, from, lines.join("\n"));
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível analisar o arquivo."); }
    },
  }),

  kit.makeCommand({
    name: "img2pdf", section: "PDF", usage: "img2pdf (responda à imagem)",
    async execute(conn, msg, args, from) {
      try {
        const media = await kit.downloadMedia(msg);
        if (!["image", "sticker"].includes(media.type)) throw kit.userError("Responda a uma imagem.");
        await kit.withTempDir(async (dir) => {
          const image = path.join(dir, "imagem.jpg");
          const pdf = path.join(dir, "imagem.pdf");
          await sharp(media.buffer).rotate().flatten({ background: "white" }).jpeg({ quality: 92 }).toFile(image);
          await kit.run("img2pdf", [image, "-o", pdf], { timeout: 45000 });
          await conn.sendMessage(from, { document: await fsp.readFile(pdf), mimetype: "application/pdf", fileName: "imagem.pdf" }, { quoted: createStatusQuoted(msg) });
        }, "grimm-imgpdf-");
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível converter a imagem para PDF."); }
    },
  }),

  kit.makeCommand({
    name: "pdf2img", section: "PDF", usage: "pdf2img [página|intervalo] (responda ao PDF)",
    async execute(conn, msg, args, from) {
      try {
        const media = await kit.downloadMedia(msg); ensurePdf(media);
        await kit.withTempDir(async (dir) => {
          const input = path.join(dir, "entrada.pdf");
          await fsp.writeFile(input, media.buffer);
          const pages = await pdfPages(input);
          if (!pages) throw kit.userError("Não consegui identificar as páginas desse PDF.");
          const chosen = parseRange(args[0], pages);
          const start = chosen?.start || 1;
          const end = chosen?.end || Math.min(pages, 10);
          if (!chosen && pages > 10) await kit.reply(conn, msg, from, `ℹ️ O PDF tem ${pages} páginas. Vou enviar as 10 primeiras; use .pdf2img 11-20 para escolher outro intervalo.`);
          const prefix = path.join(dir, "pagina");
          await kit.run("pdftoppm", ["-f", String(start), "-l", String(end), "-png", "-r", "130", input, prefix], { timeout: 90000 });
          const images = (await fsp.readdir(dir)).filter((n) => /^pagina-\d+\.png$/.test(n)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
          if (!images.length) throw new Error("nenhuma página renderizada");
          for (const [i, name] of images.entries()) {
            await conn.sendMessage(from, { image: await fsp.readFile(path.join(dir, name)), caption: `📄 Página ${start + i}/${pages}` }, { quoted: createStatusQuoted(msg) });
          }
        }, "grimm-pdfimg-");
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível converter o PDF em imagens."); }
    },
  }),

  kit.makeCommand({
    name: "unirpdf", section: "PDF", usage: "unirpdf [adicionar|gerar|limpar]",
    async execute(conn, msg, args, from) {
      try {
        const sender = kit.senderId(msg, from);
        const dir = mergeDir(sender);
        const action = String(args[0] || "adicionar").toLowerCase();
        if (["limpar", "clear"].includes(action)) {
          await fsp.rm(dir, { recursive: true, force: true });
          return kit.reply(conn, msg, from, "🧹 PDFs temporários removidos.");
        }
        if (["gerar", "unir", "merge"].includes(action)) {
          const files = await fsp.readdir(dir).catch(() => []);
          const pdfs = files.filter((x) => /^\d+\.pdf$/.test(x)).sort();
          if (pdfs.length < 2) throw kit.userError("Adicione pelo menos 2 PDFs antes de gerar. Use .unirpdf adicionar respondendo a cada PDF.");
          const out = path.join(dir, "resultado.pdf");
          await fsp.rm(out, { force: true }).catch(() => {});
          await kit.run("pdfunite", [...pdfs.map((x) => path.join(dir, x)), out], { timeout: 90000 });
          await conn.sendMessage(from, { document: await fsp.readFile(out), mimetype: "application/pdf", fileName: "pdf-unido.pdf" }, { quoted: createStatusQuoted(msg) });
          await fsp.rm(dir, { recursive: true, force: true });
          return;
        }
        const media = await kit.downloadMedia(msg); ensurePdf(media);
        await fsp.mkdir(dir, { recursive: true });
        const files = (await fsp.readdir(dir)).filter((x) => /^\d+\.pdf$/.test(x));
        if (files.length >= 10) throw kit.userError("Limite de 10 PDFs por união.");
        const file = path.join(dir, `${String(files.length + 1).padStart(2, "0")}.pdf`);
        await fsp.writeFile(file, media.buffer);
        await kit.reply(conn, msg, from, `➕ PDF ${files.length + 1} adicionado.\nUse .unirpdf gerar quando terminar.`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível processar os PDFs."); }
    },
  }),

  kit.makeCommand({
    name: "dividirpdf", section: "PDF", usage: "dividirpdf [página|intervalo] (responda ao PDF)",
    async execute(conn, msg, args, from) {
      try {
        const media = await kit.downloadMedia(msg); ensurePdf(media);
        await kit.withTempDir(async (dir) => {
          const input = path.join(dir, "entrada.pdf");
          await fsp.writeFile(input, media.buffer);
          const pages = await pdfPages(input);
          if (!pages) throw kit.userError("Não consegui identificar as páginas desse PDF.");
          const chosen = parseRange(args[0], pages);
          if (!chosen && pages > 10) throw kit.userError(`O PDF tem ${pages} páginas. Informe um intervalo de até 10 páginas, por exemplo: .dividirpdf 1-10`);
          const start = chosen?.start || 1, end = chosen?.end || pages;
          if (end - start + 1 > 10) throw kit.userError("Divida no máximo 10 páginas por vez para não lotar o chat.");
          const pattern = path.join(dir, "pagina-%d.pdf");
          await kit.run("pdfseparate", ["-f", String(start), "-l", String(end), input, pattern], { timeout: 60000 });
          for (let page = start; page <= end; page++) {
            const file = path.join(dir, `pagina-${page}.pdf`);
            if (!fs.existsSync(file)) continue;
            await conn.sendMessage(from, { document: await fsp.readFile(file), mimetype: "application/pdf", fileName: `pagina-${page}.pdf` }, { quoted: createStatusQuoted(msg) });
          }
        }, "grimm-splitpdf-");
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível dividir o PDF."); }
    },
  }),

  kit.makeCommand({
    name: "comprimirpdf", section: "PDF", usage: "comprimirpdf (responda ao PDF)",
    async execute(conn, msg, args, from) {
      try {
        const media = await kit.downloadMedia(msg); ensurePdf(media);
        await kit.withTempDir(async (dir) => {
          const input = path.join(dir, "entrada.pdf");
          const output = path.join(dir, "comprimido.pdf");
          await fsp.writeFile(input, media.buffer);
          await kit.run("gs", ["-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4", "-dPDFSETTINGS=/ebook", "-dNOPAUSE", "-dQUIET", "-dBATCH", `-sOutputFile=${output}`, input], { timeout: 120000 });
          const out = await fsp.readFile(output);
          await conn.sendMessage(from, { document: out, mimetype: "application/pdf", fileName: "pdf-comprimido.pdf", caption: `📦 ${kit.formatBytes(media.buffer.length)} → ${kit.formatBytes(out.length)}` }, { quoted: createStatusQuoted(msg) });
        }, "grimm-compresspdf-");
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível comprimir o PDF."); }
    },
  }),
];

module.exports = commands;
