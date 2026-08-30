const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../database/staff.json");

function loadDB() {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

function saveDB(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function addCargo(groupId, userId, cargo) {
  const db = loadDB();
  if (!db[groupId]) db[groupId] = {};
  db[groupId][userId] = cargo;
  saveDB(db);
}

function rmCargo(groupId, userId) {
  const db = loadDB();
  if (!db[groupId]) return;
  delete db[groupId][userId];
  saveDB(db);
}

function getCargo(groupId, userId) {
  const db = loadDB();
  return db[groupId]?.[userId] || null;
}

function getStaffList(groupId) {
  const db = loadDB();
  return db[groupId] || {};
}

module.exports = { addCargo, rmCargo, getCargo, getStaffList };