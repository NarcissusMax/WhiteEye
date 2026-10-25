import { getSoundtrack, SOUNDTRACKS } from "./soundtracks.js";
import { makeRecordingPlayer, saveRecordingFile } from "./recording-player.js";

const $ = (selector) => document.querySelector(selector);
const toggle = $("#music-toggle");
const options = $("#music-options");
const panel = $("#music-panel");
const label = $("#music-label");
const trackList = $("#music-tracks");
const stopButton = $("#music-stop");
const volumeInput = $("#music-volume");
const volumeValue = $("#music-volume-value");
const status = $("#music-status");
const fileControl = $("#recording-file-control");
const fileInput = $("#recording-file");
const fileLabel = $("#recording-file-label");
const fileStatus = $("#recording-file-status");
const STORAGE_KEY = "whiteeye:music:v1";

let selected = SOUNDTRACKS[0].id;
let volume = 45;
let enabled = true;
let player = null;
let recording = null;
let timer = null;
let activationArmed = false;

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  if (saved && SOUNDTRACKS.some((track) => track.id === saved.track)) selected = saved.track;
  if (Number.isFinite(saved?.volume)) volume = Math.min(100, Math.max(0, saved.volume));
  if (typeof saved?.enabled === "boolean") enabled = saved.enabled;
} catch { /* Storage is optional; playback still works. */ }

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ track: selected, volume, enabled }));
  } catch { /* This session keeps the chosen settings. */ }
}

function noteFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function makePlayer(track) {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = volume / 100 * .26;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.ratio.value = 2.5;
  master.connect(compressor);
  compressor.connect(context.destination);

  const delay = context.createDelay(.8);
  delay.delayTime.value = .32;
  const feedback = context.createGain();
  feedback.gain.value = .16;
  const wet = context.createGain();
  wet.gain.value = .16;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(master);

  return {
    context,
    master,
    delay,
    color: track.color,
    nextTime: context.currentTime + .08,
    bar: 0,
  };
}

function playNote(player, midi, when, beats, beatLength, voice, strength = 1) {
  const { context, master, delay } = player;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const frequency = noteFrequency(midi);
  const organLead = voice === "lead" && player.color === "organ";
  oscillator.type = voice === "pad" && player.color === "strings"
    ? "sawtooth"
    : organLead || voice === "pad"
    ? "triangle"
    : "sine";
  oscillator.frequency.setValueAtTime(frequency, when);
  filter.type = "lowpass";
  filter.frequency.value = voice === "pad" && player.color === "strings"
    ? 680
    : voice === "pad"
    ? 1350
    : voice === "bass"
    ? 440
    : 2600;
  const duration = beats * beatLength;
  const attack = voice === "pad" ? .34 : voice === "bass" ? .08 : organLead ? .04 : .008;
  const release = voice === "pad" ? .9 : voice === "bass" ? .45 : .5;
  const peak = (voice === "pad" ? .055 : voice === "bass" ? .14 : .15) * strength;
  const end = when + duration + release;
  gain.gain.setValueAtTime(.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + attack);
  if (voice === "pad" || organLead) {
    gain.gain.setValueAtTime(peak * .72, when + Math.max(attack, duration));
  } else {
    gain.gain.exponentialRampToValueAtTime(
      Math.max(.001, peak * .2),
      when + Math.max(attack + .02, duration),
    );
  }
  gain.gain.exponentialRampToValueAtTime(.0001, end);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  gain.connect(delay);
  oscillator.start(when);
  oscillator.stop(end + .02);
  oscillator.onended = () => {
    oscillator.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

function scheduleBar(player, track) {
  const beatLength = 60 / track.bpm;
  const barLength = track.beats * beatLength;
  const barIndex = player.bar % track.chords.length;
  const cycle = Math.floor(player.bar / track.chords.length);
  const chord = track.chords[barIndex];
  const when = player.nextTime;

  chord.forEach((note, index) =>
    playNote(player, note, when, track.beats + .3, beatLength, "pad", index === 0 ? 1 : .72)
  );
  playNote(player, chord[0] - 12, when, track.beats * .9, beatLength, "bass", .8);

  const stepLength = track.beats / track.pattern.length;
  track.pattern.forEach((chordIndex, step) => {
    // Leave some air between notes; each second pass changes the emphasis.
    if (cycle % 2 && step % 4 === 3) return;
    const offset = step * stepLength;
    const strength = track.color === "strings" ? .42 : .58;
    playNote(
      player,
      chord[chordIndex] + 12,
      when + offset * beatLength,
      stepLength * .7,
      beatLength,
      "lead",
      strength,
    );
  });
  track.lead[barIndex].forEach(([beat, note, length]) => {
    const strength = track.color === "organ" ? .8 : .68;
    playNote(player, note, when + beat * beatLength, length, beatLength, "lead", strength);
  });

  player.nextTime += barLength;
  player.bar++;
}

function schedule() {
  if (!player || player.context.state !== "running") return;
  const track = getSoundtrack(selected);
  while (player.nextTime < player.context.currentTime + 1.5) {
    if (player.nextTime < player.context.currentTime) {
      player.nextTime = player.context.currentTime + .06;
    }
    scheduleBar(player, track);
  }
}

function updateUI() {
  const playing = Boolean(
    recording?.playing || (player && player.context.state === "running" && timer),
  );
  const waiting = enabled && !playing;
  const needsFile = Boolean(recording?.needsFile);
  fileControl.hidden = !getSoundtrack(selected).recording;
  fileLabel.textContent = `Audio file for ${getSoundtrack(selected).title}`;
  if (recording?.fileName) {
    fileStatus.textContent = recording.persisted
      ? `Using ${recording.fileName}. Saved on this device.`
      : `Using ${recording.fileName} for this visit. This browser could not save the file.`;
  }
  toggle.setAttribute("aria-pressed", String(playing));
  toggle.setAttribute(
    "aria-label",
    needsFile
      ? `Add audio for ${getSoundtrack(selected).title}`
      : playing
      ? `${getSoundtrack(selected).title}, stop background music`
      : enabled
      ? `${getSoundtrack(selected).title}, start background music`
      : "Music off, start background music",
  );
  toggle.title = playing
    ? "Stop background music"
    : waiting
    ? "Music starts when your browser permits sound"
    : "Start background music";
  label.textContent = needsFile
    ? "Add audio"
    : playing || waiting
    ? getSoundtrack(selected).title
    : "Music off";
  stopButton.disabled = !enabled;
  status.textContent = recording?.error ||
    (waiting
      ? "If your browser blocks autoplay, music starts with your first click or keypress."
      : "");
  for (const button of trackList.querySelectorAll("button[data-track]")) {
    const active = button.dataset.track === selected;
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("selected", active);
  }
}

function disarmActivation() {
  if (!activationArmed) return;
  document.removeEventListener("pointerdown", resumeOnGesture, true);
  document.removeEventListener("keydown", resumeOnGesture, true);
  activationArmed = false;
}

function armActivation() {
  if (activationArmed) return;
  document.addEventListener("pointerdown", resumeOnGesture, true);
  document.addEventListener("keydown", resumeOnGesture, true);
  activationArmed = true;
}

function releasePlayer() {
  recording?.destroy();
  recording = null;
  clearInterval(timer);
  timer = null;
  disarmActivation();
  if (player) {
    const old = player;
    player = null;
    old.context.onstatechange = null;
    if (old.context.state === "running") {
      const now = old.context.currentTime;
      old.master.gain.cancelScheduledValues(now);
      old.master.gain.setTargetAtTime(0, now, .045);
      setTimeout(() => old.context.close().catch(() => {}), 260);
    } else old.context.close().catch(() => {});
  }
}

function stopMusic() {
  enabled = false;
  persist();
  releasePlayer();
  updateUI();
}

function beginScheduling(current) {
  if (!enabled || current !== player || current.context.state !== "running") return;
  if (!timer) {
    current.nextTime = Math.max(current.nextTime, current.context.currentTime + .06);
    schedule();
    timer = setInterval(schedule, 200);
  }
  disarmActivation();
  updateUI();
}

function resumeMusic(showMissing = false) {
  if (!enabled) return;
  const track = getSoundtrack(selected);
  if (track.recording) {
    if (recording?.error) {
      recording.destroy();
      recording = null;
    }
    if (!recording) {
      recording = makeRecordingPlayer(track, volume, () => {
        if (recording?.playing || recording?.error) disarmActivation();
        else if (recording?.ready) armActivation();
        updateUI();
        if (showMissing && recording?.needsFile) {
          setPanelOpen(true);
          fileInput.focus();
        }
      });
    } else recording.play();
    if (!recording.playing) armActivation();
    updateUI();
    return;
  }
  try {
    if (!player) {
      player = makePlayer(getSoundtrack(selected));
      const current = player;
      current.context.onstatechange = () => {
        if (current !== player || !enabled) return;
        if (current.context.state === "running") beginScheduling(current);
        else {
          clearInterval(timer);
          timer = null;
          armActivation();
          updateUI();
        }
      };
    }
    const current = player;
    if (current.context.state === "running") {
      beginScheduling(current);
      return;
    }
    armActivation();
    updateUI();
    current.context.resume().then(() => beginScheduling(current)).catch(() => {
      if (current !== player || !enabled) return;
      status.textContent = "Audio could not start here. Check your browser’s sound permissions.";
    });
  } catch {
    releasePlayer();
    status.textContent = "Audio could not start here. Check your browser’s sound permissions.";
    label.textContent = "Audio unavailable";
  }
}

function resumeOnGesture(event) {
  // The music buttons handle their own gesture. Running here as well would
  // turn a first click on Play into a start immediately followed by a Stop.
  if (
    event.target instanceof Element &&
    event.target.closest("#music-toggle, #music-stop, .music-track")
  ) return;
  if (event.type === "keydown" && ["Tab", "Shift", "Control", "Alt", "Meta"].includes(event.key)) {
    return;
  }
  resumeMusic();
}

function setPanelOpen(open) {
  panel.hidden = !open;
  options.setAttribute("aria-expanded", String(open));
  if (open) trackList.querySelector(".selected")?.focus();
}

for (const track of SOUNDTRACKS) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "music-track";
  button.dataset.track = track.id;
  const name = document.createElement("strong");
  name.textContent = track.title;
  const description = document.createElement("small");
  description.textContent = track.description;
  button.append(name, description);
  button.addEventListener("click", () => {
    selected = track.id;
    enabled = true;
    persist();
    releasePlayer();
    fileStatus.textContent = "";
    fileInput.value = "";
    fileInput.removeAttribute("aria-invalid");
    resumeMusic(true);
    updateUI();
  });
  trackList.append(button);
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  const track = getSoundtrack(selected);
  if (!file || !track.recording) return;
  if (
    !file.size || (!file.type.startsWith("audio/") && !/\.(mp3|ogg|m4a|wav|flac)$/i.test(file.name))
  ) {
    fileInput.setAttribute("aria-invalid", "true");
    fileStatus.textContent = "Choose a nonempty MP3, Ogg, M4A, WAV or FLAC audio file.";
    return;
  }
  fileInput.removeAttribute("aria-invalid");
  fileInput.disabled = true;
  fileStatus.textContent = "Saving audio…";
  let saved = true;
  try {
    await saveRecordingFile(track.id, file);
  } catch {
    saved = false;
  }
  fileInput.disabled = false;
  if (selected !== track.id) return;
  fileStatus.textContent = saved
    ? `Using ${file.name}. Saved on this device.`
    : `Using ${file.name} for this visit. This browser could not save the file.`;
  enabled = true;
  persist();
  releasePlayer();
  resumeMusic();
});

volumeInput.value = String(volume);
volumeValue.value = `${volume}%`;
volumeInput.addEventListener("input", () => {
  volume = Number(volumeInput.value);
  volumeValue.value = `${volume}%`;
  recording?.setVolume(volume);
  if (player) {
    player.master.gain.setTargetAtTime(volume / 100 * .26, player.context.currentTime, .03);
  }
  persist();
});
toggle.addEventListener("click", () => {
  if (recording?.playing || (player?.context.state === "running" && timer)) stopMusic();
  else {
    enabled = true;
    persist();
    resumeMusic(true);
  }
});
stopButton.addEventListener("click", stopMusic);
options.addEventListener("click", () => setPanelOpen(panel.hidden));
document.addEventListener("pointerdown", (event) => {
  if (!panel.hidden && !event.target.closest("#music-control")) setPanelOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !panel.hidden) {
    setPanelOpen(false);
    options.focus();
  }
});

if (!("AudioContext" in globalThis) && !getSoundtrack(selected).recording) {
  toggle.disabled = true;
  options.disabled = true;
  label.textContent = "Audio unavailable";
} else updateUI();
if (enabled) resumeMusic();
