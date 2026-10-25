// Keep extracted text intact. Offsets and line ranges refer to that exact text.
export function chunkTranscript(text, document, { size = 2000, overlap = 400 } = {}) {
  const records = [];
  let start = 0, line = 1;
  while (start < text.length) {
    let end = Math.min(text.length, start + size);
    if (end < text.length) {
      const boundary = text.lastIndexOf("\n", end);
      if (boundary > start + size / 2) end = boundary + 1;
    }
    const passage = text.slice(start, end);
    const endLine = line + (passage.match(/\n/g) || []).length;
    if (passage.trim()) {
      records.push({
        id: `${document.id}:${start}`,
        document: document.id,
        file: document.file,
        aliases: document.aliases,
        attribution: document.attribution,
        start,
        end,
        line,
        endLine,
        text: passage,
      });
    }
    if (end === text.length) break;
    let next = Math.max(start + 1, end - overlap);
    const boundary = text.indexOf("\n", next);
    if (boundary >= 0 && boundary < end) next = boundary + 1;
    line += (text.slice(start, next).match(/\n/g) || []).length;
    start = next;
  }
  return records;
}

export function sourceAttribution(file) {
  if (/tristan|luc[ .]|dan pena|AI Automated Campus|How To Actually Get Rich/i.test(file)) {
    return "other-speaker";
  }
  if (file === "The Tate Bible") return "edited-compilation";
  if (
    /interview|podcast|psychosphere|therapist|emergency meetings|ALL COURSES|Millionaire Kickboxer/i
      .test(file)
  ) {
    return "mixed-speakers";
  }
  return "andrew-course";
}
