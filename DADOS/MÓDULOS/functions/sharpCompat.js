let cached = null;
let loadError = null;

function loadSharp() {
  if (cached) return cached;

  try {
    cached = require("sharp");
    loadError = null;
    return cached;
  } catch (error) {
    loadError = error;
    const wrapped = new Error("ERR_IMAGE_ENGINE_UNAVAILABLE");
    wrapped.code = "ERR_IMAGE_ENGINE_UNAVAILABLE";
    wrapped.cause = error;
    throw wrapped;
  }
}

function sharpCompat(...args) {
  return loadSharp()(...args);
}

Object.defineProperty(sharpCompat, "kernel", {
  enumerable: true,
  get() {
    return loadSharp().kernel;
  },
});

sharpCompat.available = function available() {
  try {
    loadSharp();
    return true;
  } catch (_) {
    return false;
  }
};

sharpCompat.loadError = function getLoadError() {
  return loadError;
};

module.exports = sharpCompat;
