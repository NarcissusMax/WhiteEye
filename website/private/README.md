# Private build inputs

The current application uses these generated inputs:

- `corpus.json`
- `cote-corpus.json`
- `tate-corpus.json`
- `jane-research.json`
- `vegeta-research.json`
- `imp-research.json`
- `tomodachi-corpus.json`
- `tomodachi-scenes.json`

They contain private conversation material or full extracted source collections
and are deliberately excluded from the public GitHub export and source ZIP.
They remain intact in the owner's active local project and are ignored here.
Restore them from your private backup before running `npm run build`,
`npm start`, or validations that use the source-grounded conversation system.

Where an indexer is available, rebuild from your own authorized source files
using the scripts under `scripts/`. For example:

```sh
deno run --allow-read --allow-write=private --allow-run=pdftotext \
  scripts/index-sources.js /path/to/WhiteEye-sources
deno run --allow-read --allow-write=private --allow-run=pdftotext \
  scripts/index-tate.js /path/to/Andrew-Tate-sources
```

The remaining source formats, extraction tools and index procedures are covered
in `docs/ayanokoji.md`, `docs/imp.md`, `docs/andrew-tate.md` and the corresponding
research notes. Supplied research/scene analyses still require your own private
copies; they are not fabricated by the source export.

Keep `.env`, local learner SQLite data, browser conversations and the complete
source indexes out of public commits. A public code checkout alone does not
contain the owner's private source data or model credentials.
