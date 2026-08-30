module.exports = {
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
`📢 Canal: ${from}

🆔 Message ID:
${msg.key.id}

📌 Server ID atual:
${serverIdAtual}

📌 Server ID anterior:
${serverIdAtual - 1}`
      })

    } catch (err) {
      console.error(err)
    }
  }
}