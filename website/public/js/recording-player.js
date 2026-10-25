// Direct audio only: supplied files stay in this browser, never in chat storage.
const sessionFiles = new Map();
let database;
function openDatabase() {
  if (database) return database;
  database = new Promise((resolve, reject) => {
    const request = indexedDB.open("whiteeye.recordings.v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("audio");
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        database = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      database = null;
      reject(request.error);
    };
    request.onblocked = () => {
      database = null;
      reject(Error("Audio storage is blocked by another tab."));
    };
  });
  return database;
}
export async function saveRecordingFile(id, file) {
  const stored = { file, persisted: false };
  sessionFiles.set(id, stored);
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction("audio", "readwrite");
    transaction.objectStore("audio").put(file, id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || Error("Audio could not be saved."));
  });
  stored.persisted = true;
}
async function recordingFile(id) {
  if (sessionFiles.has(id)) return sessionFiles.get(id);
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const request = db.transaction("audio").objectStore("audio").get(id);
      request.onsuccess = () =>
        resolve(request.result ? { file: request.result, persisted: true } : null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}
export function makeRecordingPlayer(track, volume, onChange) {
  const audio = new Audio();
  audio.loop = true;
  audio.preload = "none";
  audio.volume = Math.min(1, Math.max(0, volume / 100));
  let objectURL = null;
  const current = {
    playing: false,
    ready: false,
    destroyed: false,
    error: "",
    needsFile: false,
    fileName: "",
    persisted: false,
    audio,
    play() {
      if (!current.ready || current.destroyed) return;
      current.error = "";
      audio.play().catch((error) => {
        if (current.destroyed) return;
        if (error.name !== "NotAllowedError") {
          current.error = "This file could not play. Choose a supported audio file.";
        }
        onChange();
      });
    },
    setVolume(value) {
      audio.volume = Math.min(1, Math.max(0, value / 100));
    },
    destroy() {
      current.destroyed = true;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      if (objectURL) URL.revokeObjectURL(objectURL);
    },
  };
  for (const event of ["playing", "pause", "waiting", "ended"]) {
    audio.addEventListener(event, () => {
      if (current.destroyed) {
        return;
      }
      current.playing = event === "playing";
      onChange();
    });
  }
  audio.addEventListener("error", () => {
    if (current.destroyed) return;
    current.playing = false;
    current.error = "This file could not play. Choose a supported audio file.";
    onChange();
  });
  recordingFile(track.id).then((stored) => {
    const file = stored?.file;
    if (current.destroyed) return;
    if (track.src) audio.src = track.src;
    else if (file instanceof Blob) {
      objectURL = URL.createObjectURL(file);
      audio.src = objectURL;
      current.fileName = file.name || "Saved audio file";
      current.persisted = stored.persisted;
    } else {
      current.needsFile = true;
      current.error = `Choose your ${track.title} audio file in the music options.`;
      onChange();
      return;
    }
    current.ready = true;
    current.play();
    onChange();
  });
  return current;
}
