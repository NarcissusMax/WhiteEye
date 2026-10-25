import { build } from "esbuild";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicRoot = join(root, "public");
const generatedAssets = join(root, "worker", "assets.generated.js");
const generatedCorpora = join(root, "worker", "corpora.generated.js");
const dist = join(root, "dist");
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};
const textExtensions = new Set([".html", ".css", ".js", ".json", ".svg", ".txt"]);

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else files.push(path);
  }
  return files;
}

const assets = {};
for (const file of await filesIn(publicRoot)) {
  const extension = extname(file).toLowerCase();
  const bytes = await readFile(file);
  const binary = !textExtensions.has(extension);
  assets[`/${relative(publicRoot, file).replaceAll("\\\\", "/")}`] = {
    type: mimeTypes[extension] || "application/octet-stream",
    body: binary ? bytes.toString("base64") : bytes.toString("utf8"),
    ...(binary ? { base64: true } : {}),
  };
}

await writeFile(generatedAssets, `export const assets = ${JSON.stringify(assets)};\n`);
// Keep private source text available to chat without parsing every corpus on
// Worker startup. Static image/style requests never need these large objects.
const corpora = {
  loadCorpus: "corpus.json",
  loadCoteCorpus: "cote-corpus.json",
  loadTateCorpus: "tate-corpus.json",
  loadJaneResearch: "jane-research.json",
  loadVegetaResearch: "vegeta-research.json",
  loadImpResearch: "imp-research.json",
  loadTomodachiCorpus: "tomodachi-corpus.json",
  loadTomodachiScenes: "tomodachi-scenes.json",
};
const loaders = await Promise.all(
  Object.entries(corpora).map(async ([name, file]) => {
    const text = JSON.stringify(JSON.parse(await readFile(join(root, "private", file), "utf8")));
    return `let ${name}Data; export function ${name}() { return ${name}Data ||= JSON.parse(${
      JSON.stringify(text)
    }); }`;
  }),
);
await writeFile(generatedCorpora, loaders.join("\n") + "\n");
await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "server"), { recursive: true });
await mkdir(join(dist, ".openai"), { recursive: true });
await build({
  entryPoints: [join(root, "worker", "index.js")],
  outfile: join(dist, "server", "index.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "none",
});
await writeFile(
  join(dist, ".openai", "hosting.json"),
  await readFile(join(root, ".openai", "hosting.json")),
);
await rm(generatedAssets, { force: true });
await rm(generatedCorpora, { force: true });
console.log(`Built ${relative(root, dist)}`);
