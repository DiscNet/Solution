const { getProfilePicture } = require("./profilePicture");
// Pasta: functions/getUserInfo.js
module.exports = async (conn, userId, groupId) => {
  try {
    const info = {};

    // Pega dados do grupo, se fornecido
    let member = null;
    if (groupId && groupId.endsWith("@g.us")) {
      const groupMetadata = await conn.groupMetadata(groupId);
      member = groupMetadata.participants.find(p => p.id === userId);
    }

    // Nome exibido no grupo ou fallback
    info.name = member?.notify || userId.split("@")[0];

    // Papel no grupo
    info.role = member?.admin || member?.admin === null ? (member?.admin || "Membro") : "Membro";

    // Bio/status
    info.bio = "Não disponível";
    try {
      const status = await conn.getStatus(userId);
      info.bio = status?.status || info.bio;
    } catch {}

    // Foto de perfil: mesmo mecanismo funcional da Tokito V10.
    const picture = await getProfilePicture(conn, [userId]);
    info.ppUrl = picture?.url || null;

    return info;
  } catch (err) {
    console.error("Erro em getUserInfo:", err);
    return null;
  }
};