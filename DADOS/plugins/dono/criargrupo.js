// Menu: Dono - Grupos | Comando: criargrupo
const fs = require("fs");
const path = require("path");
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const {
  newsletterContext,
  ensureOwner,
  readableError,
} = require("../../functions/ownerGroupManager");

module.exports = {
  permissions: { owner: true },
  name: "criargrupo",
  aliases: ["novogrupo"],
  description: "Cria um novo grupo e adiciona o dono",
  usage: "criargrupo nome do grupo",
  menuCategory: "Dono",
  menuSection: "Grupos",

  async execute(conn, msg, args = [], from) {
    const quoted = createStatusQuoted(msg);
    try {
      if (!ensureOwner(msg)) {
        return conn.sendMessage(from, {
          text: "❌ Apenas o dono pode usar este comando.",
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      const groupName = args.join(" ").trim();
      if (!groupName) {
        return conn.sendMessage(from, {
          text: `❌ Informe o nome do grupo.\nEx.: ${config.prefix || "."}criargrupo Grupo de testes`,
          contextInfo: newsletterContext(),
        }, { quoted });
      }
      if (groupName.length > 100) {
        return conn.sendMessage(from, {
          text: "❌ O nome do grupo deve ter no máximo 100 caracteres.",
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      const ownerNumber = String(config.ownerNumber || "").replace(/\D/g, "");
      if (ownerNumber.length < 8 || ownerNumber.length > 15) {
        return conn.sendMessage(from, {
          text: "❌ ownerNumber está ausente ou inválido no config.js.",
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      const group = await conn.groupCreate(groupName, [`${ownerNumber}@s.whatsapp.net`]);
      const groupId = group?.id;
      if (!groupId) throw new Error("groupCreate returned no group id");

      const warnings = [];
      const imgPath = path.join(__dirname, "..", "..", "imagens", "bot.jpg");
      if (fs.existsSync(imgPath)) {
        try {
          await conn.updateProfilePicture(groupId, fs.readFileSync(imgPath));
        } catch (error) {
          warnings.push("não foi possível definir a foto");
          console.warn("[CRIARGRUPO] foto:", error?.message || error);
        }
      }

      let inviteLink = null;
      try {
        const inviteCode = await conn.groupInviteCode(groupId);
        if (inviteCode) inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
      } catch (error) {
        warnings.push("não foi possível obter o link de convite");
        console.warn("[CRIARGRUPO] link:", error?.message || error);
      }

      try {
        await conn.sendMessage(groupId, {
          text: `🎉 *Grupo criado com sucesso!*\n\n📛 ${groupName}\n🤖 ${config.botName || "GrimmJow-WA"}`,
          contextInfo: newsletterContext(),
        });
      } catch (error) {
        warnings.push("não foi possível enviar a mensagem inicial");
      }

      const lines = [
        `✅ Grupo *${groupName}* criado.`,
        `🆔 \`${groupId}\``,
        inviteLink ? `🔗 ${inviteLink}` : "🔗 Link: indisponível",
        `🖼️ Foto: ${fs.existsSync(imgPath) ? (warnings.includes("não foi possível definir a foto") ? "falhou" : "definida") : "arquivo bot.jpg não encontrado"}`,
      ];
      if (warnings.length) lines.push(`⚠️ Avisos: ${warnings.join("; ")}.`);

      return conn.sendMessage(from, {
        text: lines.join("\n"),
        contextInfo: newsletterContext(),
      }, { quoted });
    } catch (error) {
      console.error("[CRIARGRUPO]", error);
      return conn.sendMessage(from, {
        text: readableError(error, "criar o grupo"),
        contextInfo: newsletterContext(),
      }, { quoted });
    }
  },
};
