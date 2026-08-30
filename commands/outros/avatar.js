module.exports = {
    name: "avatar",
    description: "Avatar premium (anti-falha rc13 + LID)",

    async execute(conn, msg, args, from) {
        try {

            const isGroup = from.endsWith("@g.us");

            let jid;

            // =====================
            // RESOLUÇÃO DE ALVO
            // =====================

            if (args[0]?.toLowerCase() === "grupo") {
                if (!isGroup) {
                    return conn.sendMessage(from, {
                        text: "❌ Só em grupos."
                    });
                }
                jid = from;
            }

            else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
                jid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }

            else if (args[0]) {
                const num = args[0].replace(/\D/g, "");
                jid = num ? `${num}@s.whatsapp.net` : null;
            }

            else {
                jid = isGroup
                    ? (msg.key.participantAlt || msg.key.participant || msg.sender)
                    : (msg.key.remoteJidAlt || msg.key.remoteJid || from);
            }

            if (!jid) {
                return conn.sendMessage(from, {
                    text: "❌ JID inválido."
                });
            }

            console.log("📌 AVATAR JID:", jid);

            let url = null;

            // =====================
            // 1. PROFILE PICTURE NORMAL
            // =====================
            try {
                url = await conn.profilePictureUrl(jid, "image");
            } catch {}

            // =====================
            // 2. FALLBACK LID → PN
            // =====================
            if (!url) {
                try {
                    const wa = await conn.onWhatsApp(jid);
                    const realJid = wa?.[0]?.jid;

                    if (realJid) {
                        url = await conn.profilePictureUrl(realJid, "image");
                        jid = realJid;
                    }
                } catch {}
            }

            // =====================
            // 3. IQ DIRETO (MODO RAIZ WHATSAPP)
            // =====================
            if (!url) {
                try {
                    const res = await conn.query({
                        tag: "iq",
                        attrs: {
                            to: jid,
                            type: "get",
                            xmlns: "w:profile:picture"
                        },
                        content: [
                            {
                                tag: "picture",
                                attrs: { type: "image" }
                            }
                        ]
                    });

                    const pic = res?.content?.find(x => x.tag === "picture");

                    url = pic?.attrs?.url || null;

                } catch (e) {
                    console.log("IQ FAIL:", e.message);
                }
            }

            // =====================
            // FALHA TOTAL
            // =====================
            if (!url) {
                return conn.sendMessage(from, {
                    text:
`❌ Não foi possível obter a foto.

Possíveis motivos:
• Privacidade (ninguém / contatos)
• LID não resolvido
• Sem foto de perfil
• Restrição do WhatsApp

JID: ${jid}`
                });
            }

            // =====================
            // NOME
            // =====================
            let nome = jid.split("@")[0];

            if (isGroup) {
                try {
                    const g = await conn.groupMetadata(jid);
                    nome = g.subject;
                } catch {}
            }

            // =====================
            // ENVIO SEGURO
            // =====================
            await conn.sendMessage(from, {
                image: { url },
                caption:
`🖼️ *AVATAR PREMIUM*

👤 Nome: ${nome}
📱 JID: ${jid}`
            });

        } catch (err) {
            console.error(err);
            conn.sendMessage(from, {
                text: "❌ Erro interno no avatar premium."
            });
        }
    }
};