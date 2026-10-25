import { chunkTranscript, sourceAttribution } from "../server/tate-corpus.js";

const sourceDir = Deno.args[0] || "/home/narmexis/Projects/WhiteEye/sources/Andrew Tate";
const root = new URL("../", import.meta.url);
const paths = [];
async function walk(dir, prefix = "") {
  for await (const entry of Deno.readDir(dir)) {
    const file = `${prefix}${entry.name}`;
    if (entry.isDirectory) await walk(`${dir}/${entry.name}`, `${file}/`);
    else if (entry.isFile) paths.push(file);
  }
}
await walk(sourceDir);
paths.sort();
const inventory = [], documents = [], seen = new Map();
for (const file of paths) {
  const path = `${sourceDir}/${file}`;
  const bytes = await Deno.readFile(path);
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  const duplicate = seen.get(hash);
  if (duplicate) {
    duplicate.aliases.push(file);
    const attribution = sourceAttribution(file);
    if (
      attribution === "other-speaker" ||
      (attribution === "mixed-speakers" && duplicate.attribution === "andrew-course")
    ) {
      duplicate.attribution = attribution;
    }
    inventory.push({
      file,
      bytes: bytes.length,
      sha256: hash,
      duplicateOf: duplicate.file,
      attribution,
    });
    continue;
  }
  let text;
  if (new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") {
    const result = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    if (!result.success) throw Error(`Cannot extract ${file}`);
    text = new TextDecoder().decode(result.stdout);
  } else if (file.endsWith(".txt")) text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  else throw Error(`Unreviewed source type: ${file}`);
  const attribution = sourceAttribution(file);
  inventory.push({ file, bytes: bytes.length, sha256: hash, attribution, empty: !text.trim() });
  const document = { id: hash.slice(0, 20), file, aliases: [], attribution, text };
  documents.push(document);
  seen.set(hash, document);
}
const records = documents.flatMap((document) => chunkTranscript(document.text, document));
// Store source text once; passage offsets reproduce exact windows at runtime.
const references = records.map((record) => {
  const reference = { ...record };
  delete reference.text;
  return reference;
});
const corpus = { version: 1, inventory, documents, records: references };
await Deno.mkdir(new URL("private/", root), { recursive: true });
await Deno.writeTextFile(new URL("private/tate-corpus.json", root), JSON.stringify(corpus));
console.log(JSON.stringify(
  {
    files: inventory.length,
    uniqueDocuments: documents.length,
    duplicates: inventory.filter((file) => file.duplicateOf).length,
    empty: inventory.filter((file) => file.empty).map((file) => file.file),
    otherSpeakers: documents.filter((file) => file.attribution === "other-speaker")
      .map((file) => file.file),
    passages: records.length,
  },
  null,
  2,
));
