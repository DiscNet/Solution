// commands/jidc.js

module.exports = {
  permissions: { owner: true },
  name: "jidc",
  description: "ᴍᴏsᴛʀᴀ ᴏ ᴊɪᴅ ᴅᴏ ᴄᴀɴᴀʟ ᴀᴛᴜᴀʟ",

  async execute(conn, msg, args, from) {
    try {
      const jid = msg?.key?.remoteJid || from

      if (!jid.endsWith("@newsletter")) {
        return await conn.sendMessage(from, {
          text: "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ só ғᴜɴᴄɪᴏɴᴀ ᴅᴇɴᴛʀᴏ ᴅᴇ ᴄᴀɴᴀɪs."
        })
      }

      await conn.sendMessage(from, {
        text:
`📢 ᴄᴀɴᴀʟ ᴅᴇᴛᴇᴄᴛᴀᴅᴏ

🆔 ᴊɪᴅ:
${jid}`
      })

    } catch (err) {
      console.error(err)

      await conn.sendMessage(from, {
        text: "❌ ᴇʀʀᴏ ᴀᴏ ᴏʙᴛᴇʀ ᴏ ᴊɪᴅ ᴅᴏ ᴄᴀɴᴀʟ."
      })
    }
  }
}