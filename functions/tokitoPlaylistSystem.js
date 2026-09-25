const fs = require("fs");
const path = require("path");

const FILE = process.env.TOKITO_PLAYLIST_DB || path.join(__dirname, "..", "database", "tokito-playlists.json");
const sessions = new Map();

function normalizeName(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 40);
}

function read() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function write(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}

function bucket(data, owner) {
  data[owner] ||= {};
  return data[owner];
}

function list(owner) {
  return Object.values(read()[owner] || {}).sort((a, b) => a.name.localeCompare(b.name));
}

function get(owner, name) {
  const key = normalizeName(name).toLowerCase();
  return read()[owner]?.[key] || null;
}

function create(owner, name) {
  const clean = normalizeName(name);
  if (!clean) return { ok: false, reason: "invalid" };
  const data = read();
  const user = bucket(data, owner);
  const key = clean.toLowerCase();
  if (user[key]) return { ok: false, reason: "exists" };
  if (Object.keys(user).length >= 20) return { ok: false, reason: "limit" };
  user[key] = { name: clean, tracks: [], createdAt: Date.now() };
  write(data);
  return { ok: true, playlist: user[key] };
}

function removePlaylist(owner, name) {
  const data = read();
  const key = normalizeName(name).toLowerCase();
  const user = bucket(data, owner);
  if (!user[key]) return false;
  delete user[key];
  write(data);
  return true;
}

function addTrack(owner, name, track) {
  const data = read();
  const key = normalizeName(name).toLowerCase();
  const user = bucket(data, owner);
  const playlist = user[key];
  if (!playlist) return { ok: false, reason: "missing" };
  if (playlist.tracks.length >= 50) return { ok: false, reason: "limit" };
  if (playlist.tracks.some(x => x.url === track.url)) return { ok: false, reason: "duplicate" };
  playlist.tracks.push({
    title: String(track.title || "Música").slice(0, 120),
    url: String(track.url || ""),
    channel: String(track.channel || "").slice(0, 80),
    duration: String(track.duration || "").slice(0, 30),
    thumbnail: String(track.thumbnail || ""),
  });
  write(data);
  return { ok: true, playlist, track: playlist.tracks.at(-1) };
}

function removeTrack(owner, name, index) {
  const data = read();
  const key = normalizeName(name).toLowerCase();
  const playlist = bucket(data, owner)[key];
  if (!playlist) return { ok: false, reason: "missing" };
  const i = Number(index) - 1;
  if (!Number.isInteger(i) || i < 0 || i >= playlist.tracks.length) return { ok: false, reason: "index" };
  const [track] = playlist.tracks.splice(i, 1);
  write(data);
  return { ok: true, playlist, track };
}

function startSession(chat, owner, playlist) {
  if (!playlist?.tracks?.length) return null;
  const session = { chat, owner, playlistName: playlist.name, tracks: playlist.tracks, index: 0, startedAt: Date.now() };
  sessions.set(chat, session);
  return session;
}

function session(chat) { return sessions.get(chat) || null; }
function stop(chat) { return sessions.delete(chat); }

function move(chat, delta) {
  const s = sessions.get(chat);
  if (!s) return null;
  const next = s.index + Number(delta || 0);
  if (next < 0 || next >= s.tracks.length) return null;
  s.index = next;
  return s;
}

function current(chat) {
  const s = session(chat);
  return s ? { session: s, track: s.tracks[s.index] } : null;
}

module.exports = {
  FILE, sessions, normalizeName, read, write, list, get, create, removePlaylist,
  addTrack, removeTrack, startSession, session, stop, move, current,
};
