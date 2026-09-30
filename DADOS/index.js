process.chdir(__dirname);
require('./MÓDULOS/functions/terminalLogger').installOutputEffects();
const { startBotWithRecovery } = require("./core/startBot");

startBotWithRecovery();
