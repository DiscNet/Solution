// commands/jidc.js

module.exports = {
  name: "jidc",
  description: "Mostra o JID do canal atual",

  async execute(conn, msg, args, from) {
    try {
      const jid = msg?.key?.remoteJid || from

      if (!jid.endsWith("@newsletter")) {
        return await conn.sendMessage(from, {
          text: "❌ Este comando só funciona dentro de canais."
        })
      }

      await conn.sendMessage(from, {
        text:
`📢 Canal detectado

🆔 JID:
${jid}`
      })

    } catch (err) {
      console.error(err)

      await conn.sendMessage(from, {
        text: "❌ Erro ao obter o JID do canal."
      })
    }
  }
}