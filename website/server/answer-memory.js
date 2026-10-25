import { VOICE_SCENES } from "../src/persona/voice-scenes.js";
import { cleanSource, tokens } from "./retrieval.js";

// The exports contain simultaneous threads and delayed replies. An adjacent
// message is never silently promoted into a verified answer.
const alias = new Map(Object.entries({
  favourite: "favorite",
  favourites: "favorite",
  colours: "color",
  colour: "color",
  games: "game",
  gaming: "game",
  played: "play",
  playing: "play",
  movies: "movie",
  films: "movie",
  shows: "show",
  animes: "anime",
  studying: "study",
  studied: "study",
  studies: "study",
  exams: "exam",
  friends: "friend",
  friendship: "friend",
  relationships: "relationship",
  texting: "text",
  texted: "text",
  replied: "reply",
  replies: "reply",
  solution: "fix",
  solve: "fix",
  solved: "fix",
  repair: "fix",
  choosing: "choose",
  chose: "choose",
  selected: "choose",
  recommend: "worth",
  recommendation: "worth",
  advisable: "worth",
  procrastinate: "avoid",
  procrastination: "avoid",
  delaying: "avoid",
}));
const meaningGroups = [
  ["study", "exam", "school", "test", "syllabus"],
  ["friend", "friendship", "care", "text", "reply", "reach"],
  ["regret", "past", "mistake", "wasted"],
  ["appearance", "looks", "attractive", "face", "ugly"],
  ["game", "gaming", "play", "fps"],
  ["freedom", "free", "independent"],
  ["religion", "god", "faith", "spiritual"],
];
function terms(value) {
  const normalized = new Set(tokens(value).map((word) => alias.get(word) || word));
  for (const group of meaningGroups) {
    if (group.some((word) => normalized.has(word))) normalized.add(`topic:${group[0]}`);
  }
  return normalized;
}
function normalized(value) {
  return cleanSource(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function isQuestion(value) {
  const text = cleanSource(value);
  return text.length >= 8 && text.length <= 1700 &&
    (/\?/.test(text) ||
      /^(?:what|why|how|when|where|who|which|should|would|could|can|do|does|did|is|are|tell me|send or no)\b/i
        .test(text) ||
      /\bor (?:the )?(?:old|new) one$/i.test(text));
}
function validSource(record, speaker) {
  return record && record.speaker === speaker && record.file?.endsWith(".txt") &&
    cleanSource(record.text).length > 0;
}
function sameDay(a, b) {
  if (a.file !== b.file || !a.date || !b.date) return false;
  return a.date.slice(0, 10) === b.date.slice(0, 10);
}
function answerBurst(records, start) {
  const first = records[start];
  if (!validSource(first, "whiteeye")) return [];
  const result = [];
  for (let i = start; i < Math.min(start + 4, records.length); i++) {
    const row = records[i];
    if (!validSource(row, "whiteeye") || !sameDay(first, row)) break;
    if (row.file === "Whiteye DMS (txt file old account).txt" && row.line === 153) break;
    const text = cleanSource(row.text);
    if (result.reduce((n, x) => n + x.text.length, 0) + text.length > 3300) break;
    result.push({ file: row.file, line: row.line, date: row.date, text });
  }
  return result;
}
function scorePair(row, query, frequencies, count) {
  if (row.normalized === normalized(query) && row.normalized.length >= 8) return 100;
  const q = terms(query);
  if (!q.size || !row.terms.size) return 0;
  let overlap = 0, possible = 0;
  for (const term of q) {
    const weight = term.startsWith("topic:")
      ? 0.6
      : Math.log(1 + count / (1 + (frequencies.get(term) || 0)));
    possible += weight;
    if (row.terms.has(term)) overlap += weight;
  }
  if (!overlap) return 0;
  const coverage = overlap / (possible || 1);
  const specificity =
    [...q].filter((term) => !term.startsWith("topic:") && row.terms.has(term)).length;
  return coverage * 8 + Math.min(3, specificity) + (row.verified ? 0.5 : 0);
}

export function createAnswerMemory(records) {
  const byAnchor = new Map(records.map((record) => [`${record.file}:${record.line}`, record]));
  const entries = [];
  const seen = new Set();
  const byQuestion = new Map();
  const confidence = (pairing) =>
    pairing === "explicit-reply" ? 3 : pairing === "curated-exchange" ? 2 : 1;
  const add = (question, answer, pairing) => {
    if (!isQuestion(question.text) || !answer.length) return;
    const key = `${question.file}:${question.line}:${answer[0].line}`;
    if (seen.has(key)) return;
    seen.add(key);
    const questionKey = `${question.file}:${question.line}`;
    const existing = byQuestion.get(questionKey);
    if (existing) {
      if (confidence(pairing) < confidence(existing.pairing)) return;
      if (confidence(pairing) > confidence(existing.pairing)) {
        existing.answers = answer;
        existing.pairing = pairing;
        existing.verified = true;
        return;
      }
      const existingAnswers = new Set(existing.answers.map((part) => `${part.file}:${part.line}`));
      for (const part of answer) {
        if (!existingAnswers.has(`${part.file}:${part.line}`)) existing.answers.push(part);
      }
      return;
    }
    const text = cleanSource(question.text);
    const entry = {
      question: { file: question.file, line: question.line, date: question.date, text },
      answers: answer,
      pairing,
      verified: ["curated-exchange", "explicit-reply"].includes(pairing),
      normalized: normalized(text),
      terms: terms(text),
    };
    entries.push(entry);
    byQuestion.set(questionKey, entry);
  };

  // Editorially paired exchanges are the strongest source evidence.
  for (const scene of VOICE_SCENES) {
    const questions = [];
    let currentQuestion = null;
    for (const turn of scene.turns) {
      const record = byAnchor.get(`${scene.file}:${turn.line}`);
      if (!record || record.speaker !== turn.speaker) throw Error("Answer scene anchor changed.");
      if (turn.speaker === "other") {
        currentQuestion = null;
        if (isQuestion(record.text)) questions.push(record);
      } else {
        const preview = record.text.match(/\(re me: "([^"\n]{5,240})"\)/);
        let matched = -1;
        if (preview) {
          const target = normalized(preview[1]);
          matched = questions.findIndex((question) => normalized(question.text).startsWith(target));
          if (target && matched < 0) {
            currentQuestion = null;
            continue;
          }
        }
        if (matched >= 0) currentQuestion = questions.splice(matched, 1)[0];
        else if (questions.length) currentQuestion = questions.shift();
        if (currentQuestion) {
          add(currentQuestion, [{
            file: record.file,
            line: record.line,
            date: record.date,
            text: cleanSource(record.text),
          }], "curated-exchange");
        }
      }
    }
  }

  // Instagram reply previews identify the parent message. Require an exact
  // prefix match to a previous Griffith turn in the same export and date.
  const instagram = "WhiteEye Instagram Dms.txt";
  const previousOther = [];
  for (const record of records) {
    if (record.file !== instagram) continue;
    if (validSource(record, "other")) previousOther.push(record);
    if (!validSource(record, "whiteeye")) continue;
    const preview = record.text.match(/\(re me: "([^"\n]{5,240})"\)/);
    if (!preview) continue;
    const start = normalized(preview[1]);
    if (start.length < 8) continue;
    const question = previousOther.slice(-350).reverse().find((candidate) =>
      sameDay(candidate, record) && normalized(candidate.text).startsWith(start) &&
      isQuestion(candidate.text)
    );
    if (question) {
      add(question, [{
        file: record.file,
        line: record.line,
        date: record.date,
        text: cleanSource(record.text),
      }], "explicit-reply");
    }
  }

  // A chronological handoff can still be a different thread. In Instagram,
  // allow only an immediate handoff without a preview of a different message.
  // These candidates stay explicitly unverified.
  for (let i = 0; i < records.length - 1; i++) {
    const question = records[i];
    if (!validSource(question, "other") || !isQuestion(question.text)) continue;
    for (let j = i + 1; j < Math.min(i + 7, records.length); j++) {
      const next = records[j];
      if (!sameDay(question, next)) break;
      if (question.file === instagram && j > i + 1) break;
      if (validSource(next, "whiteeye")) {
        const preview = next.text.match(/\(re me: "([^"\n]*)"\)/);
        if (
          question.file === instagram && preview?.[1] &&
          !normalized(question.text).startsWith(normalized(preview[1]))
        ) break;
        add(
          question,
          answerBurst(records, j),
          j === i + 1 ? "adjacent-possible-reply" : "nearby-possible-reply",
        );
        break;
      }
    }
  }
  const frequencies = new Map();
  for (const entry of entries) {
    for (const term of entry.terms) frequencies.set(term, (frequencies.get(term) || 0) + 1);
  }
  return Object.freeze({
    size: entries.length,
    find(query, limit = 10) {
      const latest = typeof query === "string" ? query : query.latest;
      const prior = typeof query === "string" ? "" : query.prior;
      const ranked = entries.map((row) => ({
        row,
        score: scorePair(row, latest, frequencies, entries.length) +
          (prior ? scorePair(row, prior, frequencies, entries.length) * 0.2 : 0),
      })).filter(({ score }) => score >= 3.5)
        .sort((a, b) => b.score - a.score || Number(b.row.verified) - Number(a.row.verified));
      const output = [], seenQuestion = new Set();
      let budget = 12500;
      for (const { row, score } of ranked) {
        if (output.length >= limit || budget < 250) break;
        const key = `${row.question.file}:${row.question.line}`;
        if (seenQuestion.has(key)) continue;
        const size = row.question.text.length + row.answers.reduce((n, a) => n + a.text.length, 0);
        if (size > budget) continue;
        budget -= size;
        seenQuestion.add(key);
        output.push({
          question: row.question,
          answers: row.answers,
          pairing: row.pairing,
          score: Math.round(score * 100) / 100,
        });
      }
      return output;
    },
  });
}
