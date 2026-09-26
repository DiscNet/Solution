const path = require("path");

const authDir = path.join(__dirname, "bot_auth");
const credsPath = path.join(authDir, "creds.json");

module.exports = { authDir, credsPath };
