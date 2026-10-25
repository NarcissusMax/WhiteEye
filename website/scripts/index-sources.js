// Private build artifact: complete text, speaker attribution, stable source lines.
const root = new URL("../", import.meta.url);
const sourceDir = Deno.args[0] || "/home/narmexis/Projects/WhiteEye/sources/WhiteEye";
const records = [];
const inventory = [];
for await (const file of Deno.readDir(sourceDir)) {
  if (!file.isFile) continue;
  const path = `${sourceDir}/${file.name}`;
  let text;
  if (file.name.endsWith(".pdf")) {
    const result = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
      stdout: "piped",
    }).output();
    if (!result.success) throw Error(`Cannot extract ${file.name}`);
    text = new TextDecoder().decode(result.stdout);
  } else if (file.name.endsWith(".txt")) text = await Deno.readTextFile(path);
  else throw Error(`Unreviewed source type: ${file.name}`);
  const lines = text.split("\n");
  const start = records.length;
  if (file.name.endsWith(".pdf")) {
    let section = [];
    let lineStart = 1;
    const flush = () => {
      if (section.join("").trim()) {
        records.push({
          file: file.name,
          line: lineStart,
          speaker: file.name.startsWith("My name") ? "narrative" : "secondary",
          text: section.join("\n").trim(),
        });
      }
      section = [];
    };
    for (let i = 0; i < lines.length; i++) {
      section.push(lines[i]);
      if (section.join("\n").length > 1800 && !lines[i].trim()) {
        flush();
        lineStart = i + 2;
      }
    }
    flush();
  } else {
    const instagram = file.name.includes("Instagram");
    let current;
    let date = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (instagram && /^--- \d/.test(line)) date = line.replaceAll("---", "").trim();
      const match = instagram
        ? line.match(/^\[([^\]]+)\] (I|me):\s?(.*)$/)
        : line.match(/^\[(\d[^\]]+)\] (.+)$/);
      if (match) {
        if (current) records.push(current);
        const who = match[2];
        current = {
          file: file.name,
          line: i + 1,
          date: instagram ? `${date} ${match[1]}` : match[1],
          speaker: (instagram ? who === "I" : who.startsWith("iamjustwhiteeye"))
            ? "whiteeye"
            : "other",
          text: instagram ? match[3] : "",
        };
      } else if (current && !line.startsWith("---")) current.text += "\n" + line;
    }
    if (current) records.push(current);
  }
  for (const r of records.slice(start)) r.text = r.text.trim();
  inventory.push({
    file: file.name,
    bytes: (await Deno.stat(path)).size,
    lines: lines.length,
    records: records.length - start,
    whiteeye: records.slice(start).filter((r) => r.speaker === "whiteeye").length,
  });
}
await Deno.mkdir(new URL("private/", root), { recursive: true });
await Deno.writeTextFile(
  new URL("private/corpus.json", root),
  JSON.stringify({ inventory, records }),
);
console.log(JSON.stringify(inventory, null, 2));
