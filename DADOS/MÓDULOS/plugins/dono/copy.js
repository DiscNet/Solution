// Menu: Dono - Grupos | Comando: copiar
const axios = require("axios");
const config = require("../../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const {
  newsletterContext,
  ensureOwner,
} = require("../../functions/ownerGroupManager");

function normalizePhoneJid(value) {
  if (!value) return null;
  const raw = String(value).trim();

  if (raw.endsWith("@s.whatsapp.net")) {
    const user = raw.split("@")[0].split(":")[0].replace(/\D/g, "");
    if (user.length >= 8 && user.length <= 15) return `${user}@s.whatsapp.net`;
    return null;
  }

  // IDs @lid não são números de telefone e não podem ser convertidos com segurança.
  if (raw.includes("@")) return null;

  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 8 && digits.length <= 15) {
    return `${digits}@s.whatsapp.net`;
  }

  return null;
}

function participantPhoneJid(participant) {
  const candidates = [
    participant?.phoneNumber,
    participant?.jid,
    participant?.id,
  ];

  for (const candidate of candidates) {
    const jid = normalizePhoneJid(candidate);
    if (jid) return jid;
  }

  return null;
}

function samePhone(a, b) {
  const aa = normalizePhoneJid(a);
  const bb = normalizePhoneJid(b);
  return Boolean(aa && bb && aa === bb);
}

function chunk(list, size = 20) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function resultWasAdded(result) {
  const status = Number(result?.status);
  return status === 200 || status === 201;
}

module.exports = {
  permissions: { owner: true, group: true },
  name: "copiar",
  aliases: ["clone", "clonar", "copy", "copiargrupo", "clonegrupo"],
  description: "Clona o grupo atual copiando nome, foto, descrição e membros quando possível",
  usage: "copiar",
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

      if (!String(from).endsWith("@g.us")) {
        return conn.sendMessage(from, {
          text: `❌ Use ${config.prefix || "."}copiar dentro do grupo que deseja clonar.`,
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      await conn.sendMessage(from, {
        react: { text: "📋", key: msg.key },
      }).catch(() => {});

      const source = await conn.groupMetadata(from);
      const sourceName = String(source?.subject || "Grupo copiado").trim().slice(0, 100) || "Grupo copiado";
      const sourceDescription = String(source?.desc || "").trim();
      const sourceParticipants = Array.isArray(source?.participants) ? source.participants : [];

      const ownerNumber = String(config.ownerNumber || "").replace(/\D/g, "");
      const ownerJid = ownerNumber.length >= 8 && ownerNumber.length <= 15
        ? `${ownerNumber}@s.whatsapp.net`
        : null;

      if (!ownerJid) {
        return conn.sendMessage(from, {
          text: "❌ ownerNumber está ausente ou inválido no config.js. Ele é necessário para criar a cópia do grupo.",
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      // Cria primeiro o novo grupo com o dono. O bot entra automaticamente como criador.
      const created = await conn.groupCreate(sourceName, [ownerJid]);
      const newGroupId = created?.id;
      if (!newGroupId) throw new Error("groupCreate returned no group id");

      const warnings = [];
      let descriptionCopied = false;
      let photoCopied = false;

      // Copia a descrição.
      if (sourceDescription) {
        try {
          await conn.groupUpdateDescription(newGroupId, sourceDescription);
          descriptionCopied = true;
        } catch (error) {
          warnings.push("descrição não pôde ser copiada");
          console.warn("[COPIAR-GRUPO] descrição:", error?.message || error);
        }
      }

      // Copia a foto diretamente do grupo original.
      try {
        const photoUrl = await conn.profilePictureUrl(from, "image");
        if (photoUrl) {
          const response = await axios.get(photoUrl, {
            responseType: "arraybuffer",
            timeout: 15000,
          });
          const imageBuffer = Buffer.from(response.data);
          await conn.updateProfilePicture(newGroupId, imageBuffer);
          photoCopied = true;
        }
      } catch (error) {
        warnings.push("foto não pôde ser copiada");
        console.warn("[COPIAR-GRUPO] foto:", error?.message || error);
      }

      // Converte apenas participantes para os quais o WhatsApp expõe um número utilizável.
      const botJid = normalizePhoneJid(conn?.user?.id);
      const members = [];
      let unmappedMembers = 0;

      for (const participant of sourceParticipants) {
        const jid = participantPhoneJid(participant);
        if (!jid) {
          unmappedMembers++;
          continue;
        }
        if (samePhone(jid, ownerJid)) continue;
        if (botJid && samePhone(jid, botJid)) continue;
        members.push(jid);
      }

      const uniqueMembers = [...new Set(members)];
      let addedMembers = 0;
      let failedMembers = 0;

      // Adiciona em lotes para reduzir falhas e limites do WhatsApp.
      for (const batch of chunk(uniqueMembers, 20)) {
        try {
          const results = await conn.groupParticipantsUpdate(newGroupId, batch, "add");
          if (Array.isArray(results) && results.length) {
            for (const result of results) {
              if (resultWasAdded(result)) addedMembers++;
              else failedMembers++;
            }
          } else {
            addedMembers += batch.length;
          }
        } catch (error) {
          failedMembers += batch.length;
          console.warn("[COPIAR-GRUPO] membros:", error?.message || error);
        }
      }

      let inviteLink = null;
      try {
        const inviteCode = await conn.groupInviteCode(newGroupId);
        if (inviteCode) inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
      } catch (error) {
        warnings.push("link do novo grupo indisponível");
      }

      const sourceCount = sourceParticipants.length;
      const notCopied = failedMembers + unmappedMembers;
      const lines = [
        "✅ *Grupo copiado com sucesso!*",
        "",
        `📛 Nome: *${sourceName}*`,
        `📝 Descrição: ${sourceDescription ? (descriptionCopied ? "copiada" : "falhou") : "grupo original sem descrição"}`,
        `🖼️ Foto: ${photoCopied ? "copiada" : "não disponível/falhou"}`,
        `👥 Membros no original: *${sourceCount}*`,
        `➕ Membros adicionados: *${addedMembers + 1}* (incluindo o dono)`,
        `⚠️ Não copiados: *${notCopied}*`,
        `🆔 Novo grupo: \`${newGroupId}\``,
        inviteLink ? `🔗 ${inviteLink}` : "🔗 Link: indisponível",
      ];

      if (unmappedMembers > 0) {
        lines.push(`ℹ️ ${unmappedMembers} membro(s) não tinham número utilizável exposto pelo WhatsApp.`);
      }
      if (failedMembers > 0) {
        lines.push(`ℹ️ ${failedMembers} membro(s) não puderam ser adicionados, geralmente por privacidade ou limite do WhatsApp.`);
      }
      if (warnings.length) {
        lines.push(`⚠️ Avisos: ${warnings.join("; ")}.`);
      }

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});

      return conn.sendMessage(from, {
        text: lines.join("\n"),
        contextInfo: newsletterContext(),
      }, { quoted });
    } catch (error) {
      console.error("[COPIAR-GRUPO]", error);
      await conn.sendMessage(from, {
        react: { text: "❌", key: msg.key },
      }).catch(() => {});

      const text = String(error?.message || "").toLowerCase();
      let message = "❌ Não foi possível copiar o grupo.";
      if (text.includes("rate") || text.includes("429")) {
        message = "❌ O WhatsApp limitou temporariamente a criação/adição de membros. Tente novamente mais tarde.";
      } else if (text.includes("not-authorized") || text.includes("403")) {
        message = "❌ O WhatsApp não autorizou alguma etapa da cópia do grupo.";
      }

      return conn.sendMessage(from, {
        text: message,
        contextInfo: newsletterContext(),
      }, { quoted });
    }
  },
};
