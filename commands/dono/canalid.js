// Menu: Dono - Comandos | Comando: raw
module.exports = {
  permissions: { owner: true },
  name: "raw",

  async execute(conn, msg, args, from) {
    try {
      const serverIdAtual = Number(msg?.key?.server_id || 0)

      console.log("=== MENSAGEM ATUAL ===")
      console.log(require("util").inspect(msg, {
        depth: null,
        colors: true,
        maxArrayLength: null
      }))

      console.log("\n=== INFORMAÇÕES ÚTEIS ===")
      console.log("Canal:", from)
      console.log("Message ID:", msg?.key?.id)
      console.log("Server ID atual:", serverIdAtual)
      console.log("Server ID anterior:", serverIdAtual - 1)

      await conn.sendMessage(from, {
        text:
`📢 ᴄᴀɴᴀʟ: ${from}

🆔 ᴍᴇssᴀɢᴇ ɪᴅ:
${msg.key.id}

📌 sᴇʀᴠᴇʀ ɪᴅ ᴀᴛᴜᴀʟ:
${serverIdAtual}

📌 sᴇʀᴠᴇʀ ɪᴅ ᴀɴᴛᴇʀɪᴏʀ:
${serverIdAtual - 1}`
      })

    } catch (err) {
      console.error(err)
    }
  }
}

Object.assign(module.exports, {
  "menuCategory": "Dono",
  "menuSection": "Comandos",
  "description": "Mostra dados da mensagem respondida."
});
