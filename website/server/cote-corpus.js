import { chunkTranscript } from "./tate-corpus.js";

export function pdfPageStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length - 1; i++) if (text[i] === "\f") starts.push(i + 1);
  return starts;
}

// Section hints never guarantee the speaker of individual lines.
export function coteSections(text, file) {
  const sections = [{ start: 0, section: "Front matter", viewpointHint: "unassigned" }];
  const heading =
    /^\s*(?:(Chapter\s+\d+\s*[:–-][^\n]*)|([^\n]{2,65}(?:Monologue|Soliloquy))|([^\n]{2,65}SS\s*[–-][^\n]*)|(Postscript|(?:RoyalMTLs\s+)?Afterword))\s*$/gm;
  for (const match of text.matchAll(heading)) {
    const page = text.slice(0, match.index).split("\f").at(-1);
    if (/Table of Contents|\bIndex\b/.test(page)) continue;
    const section = match[0].trim().replace(/\s+/g, " ");
    let viewpointHint = "unassigned; verify the local scene";
    if (match[2] || match[3]) viewpointHint = section;
    if (match[4]) viewpointHint = "author or translator; not character narration";
    // Checked in Volume 0: Chapter 5 is Kiyotaka's childhood narration;
    // the surrounding chapters belong to Atsuomi.
    if (file === "cote_0.pdf" && match[1]) {
      viewpointHint = /Chapter\s+5\b/.test(match[1]) ? "Kiyotaka narration" : "Atsuomi narration";
    }
    sections.push({ start: match.index, section, viewpointHint });
  }
  let offset = 0;
  for (const page of text.split("\f")) {
    if (!/Table of Contents|\bIndex\b/.test(page)) {
      const named = page.slice(0, 450).match(
        /([A-Z][A-Za-zōū]+(?:[ \t]+[A-Z][A-Za-zōū]+){1,3})[’']s\s+(Monologue|Soliloquy)/,
      );
      if (named) {
        const section = named[0].replace(/\s+/g, " ");
        sections.push({ start: offset + named.index, section, viewpointHint: section });
      }
    }
    offset += page.length + 1;
  }
  return sections.sort((a, b) => a.start - b.start);
}

export function chunkCote(document) {
  const sections = coteSections(document.text, document.file);
  return chunkTranscript(document.text, document, { size: 6000, overlap: 1500 }).map((row) => {
    const section = sections.findLast((item) => item.start <= row.start);
    return {
      ...row,
      section: section.section,
      viewpointHint: section.viewpointHint,
      extraction: document.extraction,
    };
  });
}
