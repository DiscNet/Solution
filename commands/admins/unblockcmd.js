// commands/admins/unblockcmd.js
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

function getRegistry() {
  const commandsPath = path.join(__dirname, "..");
  const { records } = loadCommandModules(commandsPath, { clearCache: false });
  return buildCommandRegistry(records).registry;
}

function resolveCanonicalCommand(input, registry) {
  const key = normalizeCommandName(input);
  if (!key) return null;
  return normalizeCommandName(registry[key]?.name) || key;
}

async function reply(conn, from, msg, text, bot) {
  return conn.sendMessage(from, {
    text,
    contextInfo: newsletterContext(bot)
  }, { quoted: createStatusQuoted(msg) });
}

module.exports = {
  name: "unblockcmd",
  aliases: ["ublcmd", "desbloquearcmd"],
  description: "Desbloqueia um comando no grupo, independentemente do alias usado",

  async execute(conn, msg, args, from, _axiosInstance, cmdUsado) {
    const bot = config.botName || "LukaModzz";
    const prefix = config.prefix || ".";
    const used = normalizeCommandName(cmdUsado) || "unblockcmd";

    try {
      if (!from.endsWith("@g.us")) {
        return reply(conn, from, msg, "❌ Este comando só pode ser usado em grupos!", bot);
      }

      if (!(await canManage(conn, msg, from))) {
        return reply(conn, from, msg, "❌ Apenas administradores ou o dono podem usar este comando!", bot);
      }

      const data = blockcmdStore.loadConfig(true);
      const blocked = Array.isArray(data[from]?.bloqueados) ? data[from].bloqueados : [];

      if (!args?.[0]) {
        const lines = blocked.length
          ? blocked.map(name => `🚫 ${prefix}${name}`).join("\n")
          : "📌 Nenhum comando bloqueado.";
        return reply(
          conn,
          from,
          msg,
          `📋 *Comandos bloqueados*\n\n${lines}\n\n📌 Para desbloquear: ${prefix}${used} <comando>`,
          bot
        );
      }

      const registry = getRegistry();
      const typed = normalizeCommandName(args[0]);
      const canonical = resolveCanonicalCommand(typed, registry);
      if (!canonical) {
        return reply(conn, from, msg, "❌ Nome de comando inválido.", bot);
      }

      const before = blocked.length;
      const remaining = blocked.filter(name => {
        const normalized = normalizeCommandName(name);
        if (!normalized) return false;
        return resolveCanonicalCommand(normalized, registry) !== canonical;
      });

      if (remaining.length === before) {
        return reply(conn, from, msg, `ℹ️ O comando *${canonical}* não está bloqueado neste grupo.`, bot);
      }

      if (!data[from]) data[from] = { bloqueados: [] };
      data[from].bloqueados = remaining;
      blockcmdStore.saveConfig(data);

      const aliasInfo = typed !== canonical ? `\n🔗 Alias resolvido: ${prefix}${typed} → ${prefix}${canonical}` : "";
      return reply(
        conn,
        from,
        msg,
        `✅ *Comando desbloqueado!*\n\n📌 Comando: ${prefix}${canonical}${aliasInfo}\n\nTodos os aliases voltaram a funcionar.`,
        bot
      );
    } catch (error) {
      console.error("unblockcmd:", error);
      return reply(conn, from, msg, `❌ Erro ao desbloquear comando.\n\n📌 ${error.message}`, bot).catch(() => {});
    }
  }
};
