// commands/admins/blockcmd.js
const path = require("path");
const config = require("../../config/config");
const blockcmdStore = require("../../functions/blockcmd");
const { createStatusQuoted } = require("../../functions/statusCard");
const {
  normalizeCommandName,
  loadCommandModules,
  buildCommandRegistry
} = require("../../functions/commandRegistry");

function newsletterContext(bot) {
  return {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363426698503859@newsletter",
      newsletterName: bot,
      serverMessageId: 116
    }
  };
}

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

async function canManage(conn, msg, from) {
  const sender = msg.key.participant || msg.key.remoteJid || from;
  const senderDigits = digits(sender);
  const ownerLid = String(config.ownerLid || "");
  const ownerNumber = String(config.ownerNumber || "");
  const isOwner =
    sender === ownerLid ||
    (ownerLid && senderDigits === digits(ownerLid)) ||
    (ownerNumber && senderDigits === digits(ownerNumber));

  if (isOwner) return true;
  const metadata = await conn.groupMetadata(from);
  return metadata.participants.some(p => p.id === sender && p.admin);
}

function resolveCanonicalCommand(input) {
  const key = normalizeCommandName(input);
  if (!key) return null;

  const commandsPath = path.join(__dirname, "..");
  const { records } = loadCommandModules(commandsPath, { clearCache: false });
  const { registry } = buildCommandRegistry(records);
  return normalizeCommandName(registry[key]?.name) || key;
}

async function reply(conn, from, msg, text, bot) {
  return conn.sendMessage(from, {
    text,
    contextInfo: newsletterContext(bot)
  }, { quoted: createStatusQuoted(msg) });
}

module.exports = {
  name: "blockcmd",
  aliases: ["blcmd"],
  description: "Bloqueia um comando no grupo, incluindo todos os seus aliases",

  async execute(conn, msg, args, from, _axiosInstance, cmdUsado) {
    const bot = config.botName || "LukaModzz";
    const prefix = config.prefix || ".";
    const used = normalizeCommandName(cmdUsado) || "blockcmd";

    try {
      if (!from.endsWith("@g.us")) {
        return reply(conn, from, msg, "❌ Este comando só pode ser usado em grupos!", bot);
      }

      if (!(await canManage(conn, msg, from))) {
        return reply(conn, from, msg, "❌ Apenas administradores ou o dono podem usar este comando!", bot);
      }

      if (!args?.[0]) {
        return reply(conn, from, msg, `❌ Informe o comando a bloquear.\n\n📌 Exemplo: ${prefix}${used} figurinha`, bot);
      }

      const typed = normalizeCommandName(args[0]);
      const canonical = resolveCanonicalCommand(typed);
      if (!canonical) {
        return reply(conn, from, msg, "❌ Nome de comando inválido.", bot);
      }

      const data = blockcmdStore.loadConfig(true);
      if (!data[from]) data[from] = { bloqueados: [] };
      if (!Array.isArray(data[from].bloqueados)) data[from].bloqueados = [];

      // Remove aliases antigos equivalentes e passa a guardar somente o nome canônico.
      data[from].bloqueados = data[from].bloqueados.filter(name => {
        const normalized = normalizeCommandName(name);
        return normalized && resolveCanonicalCommand(normalized) !== canonical;
      });

      data[from].bloqueados.push(canonical);
      data[from].bloqueados = [...new Set(data[from].bloqueados)];
      blockcmdStore.saveConfig(data);

      const aliasInfo = typed !== canonical ? `\n🔗 Alias resolvido: ${prefix}${typed} → ${prefix}${canonical}` : "";
      return reply(
        conn,
        from,
        msg,
        `🚫 *Comando bloqueado!*\n\n📌 Comando: ${prefix}${canonical}${aliasInfo}\n\nTodos os aliases desse comando também ficam bloqueados.`,
        bot
      );
    } catch (error) {
      console.error("blockcmd:", error);
      return reply(conn, from, msg, `❌ Erro ao bloquear comando.\n\n📌 ${error.message}`, bot).catch(() => {});
    }
  }
};
