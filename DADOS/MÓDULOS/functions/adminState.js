const { createJsonStore } = require("./jsonStore");
const { resolveDataFile } = require("./dataPaths");
const store = createJsonStore(resolveDataFile("administration.json"), {
  version: 1,
  global: {},
  groups: {},
});
function read() {
  const d = store.read(true);
  d.global ||= {};
  d.groups ||= {};
  return d;
}
function group(d, jid) {
  return (d.groups[jid] ||= {
    warnings: {},
    mutes: {},
    notes: {},
    filters: {},
    words: [],
    blacklist: [],
    cooldowns: {},
    rules: "",
    slowmode: 0,
    warnLimit: 3,
    autoban: false,
    approvalNotice: false,
    autoApprove: false,
  });
}
// All mutations are synchronous and atomic; never retain this object across an await.
function update(fn) {
  const d = read();
  const result = fn(d);
  store.write(d);
  return result;
}
function globalSettings() {
  return read().global;
}
function groupSettings(jid) {
  return group(read(), jid);
}
module.exports = {
  read,
  group,
  update,
  globalSettings,
  groupSettings,
  filePath: store.filePath,
};
