import { chunkCote, pdfPageStarts } from "../server/cote-corpus.js";

const sourceDir = Deno.args[0] || "/home/narmexis/Projects/WhiteEye/sources/COTE";
const root = new URL("../", import.meta.url);
const paths = [];
async function walk(dir, prefix = "") {
  for await (const entry of Deno.readDir(dir)) {
    const file = prefix + entry.name;
    if (entry.isDirectory) await walk(dir + "/" + entry.name, file + "/");
    else if (entry.isFile && /\.pdf$/i.test(file)) paths.push(file);
  }
}
async function command(name, args) {
  const result = await new Deno.Command(name, { args, stdout: "piped", stderr: "piped" }).output();
  if (!result.success) throw Error(name + " failed while extracting COTE.");
  return new TextDecoder().decode(result.stdout);
}
await walk(sourceDir);
paths.sort();
const inventory = [], documents = [], seen = new Map();
for (const file of paths) {
  const path = sourceDir + "/" + file;
  const bytes = await Deno.readFile(path);
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const duplicate = seen.get(hash);
  if (duplicate) {
    duplicate.aliases.push(file);
    inventory.push({ file, sha256: hash, bytes: bytes.length, duplicateOf: duplicate.file });
    continue;
  }
  let text = await command("pdftotext", ["-layout", path, "-"]);
  let extraction = "pdf-text";
  const pageCount = (text.match(/\f/g) || []).length;
  // The 10.25 short story has scanned story pages but selectable credits.
  if (text.trim().length / Math.max(1, pageCount) < 150) {
    const temp = await Deno.makeTempDir({ prefix: "whiteeye-cote-" });
    try {
      await command("pdftoppm", ["-r", "300", "-png", path, temp + "/page"]);
      const images = [];
      for await (const entry of Deno.readDir(temp)) {
        if (entry.name.endsWith(".png")) images.push(entry.name);
      }
      images.sort();
      if (images.length !== pageCount) throw Error("Incomplete page extraction: " + file);
      const pages = [];
      for (const image of images) {
        pages.push(await command("tesseract", [temp + "/" + image, "stdout", "-l", "eng"]));
      }
      text = pages.join("\f") + "\f";
      extraction = "ocr";
    } finally {
      await Deno.remove(temp, { recursive: true });
    }
  }
  if (!text.trim()) throw Error("No extractable story text: " + file);
  const document = {
    id: hash.slice(0, 20),
    file,
    aliases: [],
    attribution: "novel-scene",
    extraction,
    pageStarts: pdfPageStarts(text),
    text,
  };
  inventory.push({ file, sha256: hash, bytes: bytes.length, pages: pageCount, extraction });
  documents.push(document);
  seen.set(hash, document);
}
const records = documents.flatMap(chunkCote).map(({ text: _text, ...reference }) => reference);
const corpus = { version: 1, inventory, documents, records };
await Deno.mkdir(new URL("private/", root), { recursive: true });
await Deno.writeTextFile(new URL("private/cote-corpus.json", root), JSON.stringify(corpus));
console.log(
  JSON.stringify({
    files: inventory.length,
    passages: records.length,
    pages: inventory.reduce((sum, file) => sum + (file.pages || 0), 0),
    ocr: inventory.filter((file) => file.extraction === "ocr").map((file) => file.file),
  }),
);
