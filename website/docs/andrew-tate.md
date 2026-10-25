# Andrew Tate source persona

Select **Andrew Tate** in Speaking with. Conversation history and prior-chat recall remain scoped to
the active persona. The source collection stays server-side, separate from WhiteEye's corpus.

## Collection and provenance

`deno task index:tate` recursively reads `/home/narmexis/Projects/WhiteEye/sources/Andrew Tate`, including the
extensionless PDF `The Tate Bible` (detected by its PDF signature). An alternative directory may be
passed to `scripts/index-tate.js`. The index inventories all 74 supplied files with SHA-256 hashes,
preserving 68 unique extracted documents, six duplicate aliases, the empty Speed Wins transcript and
3,863 overlapping passages. Original extracted characters, offsets and line ranges are retained
without grammar correction, URL stripping or quote rewriting.

Material explicitly attributed to Tristan Tate, Luc Tate, Dan Peña, the AI campus instructor, and
the unrelated seven-hour wealth compilation remains in the inventory but is excluded from Andrew's
automatic evidence. The other course titles provide title-based attribution only. Interviews,
reaction meetings and multi-course compilations are marked as mixed speakers. The transcript files
generally lack timestamps and speaker labels; a model must interpret local attribution, which cannot
be guaranteed by substring verification.

The Tate Bible's own preface describes G. Slim editing transcripts for clarity and brevity. It is
tagged as an edited compilation. Its editorial preface, prayer, and quotations from others are not
Andrew's first-person evidence. No recording dates are invented from titles.

## Responses

Retrieval searches all eligible passages with document-normalized lexical relevance and small topic
synonym families. One relevant window per distinct document is considered before extra windows from
a document, up to three non-overlapping windows per document and a 128,000-character evidence
budget. Copied documents do not crowd out distinct material. The model receives all selected
passages together and is instructed to combine complementary answers, preserve distinct
qualifications and contradictions, and avoid averaging them into a new opinion. This is bounded
retrieval, not a guarantee that every relevant sentence or semantic paraphrase is discovered.

For a source answer, the model selects passage IDs and inclusive line numbers from the numbered
source lines. The server copies the complete original span between them. It also accepts uniquely
verified opening/closing phrases or short exact excerpts. This avoids regenerating thousands of
quotation tokens. Source requests allow up to four minutes to read across the collection. The server
buffers that response and verifies **every** excerpt against the selected original text before
emitting any answer. Mixed interviews and edited compilations receive an independent speaker review
in a smaller, separate request to the same selected model. It can narrow or omit uncertain,
redundant or irrelevant ranges. Invalid line selections are corrected in that request; valid course
selections stay intact. Every resulting span is verified again. Unknown IDs, paraphrases, invented
transitions, altered words, malformed JSON or incomplete output produce a retryable error. Verified
excerpts are joined with two newlines; their characters are unchanged. File aliases, line ranges and
offsets accompany the reply and survive browser history. Edited-book text is explicitly identified
in source details.

Greetings, new situations, unsupported questions, and responses that need safety context use the
persona's source-informed continuation mode. The UI labels these **AI continuation**. This mode is
generated, not a historical quotation. Prior simulated replies cannot establish canon. The persona
prompt restricts its knowledge and voice to the supplied evidence rather than pretrained public
stereotypes. Style examples are separate from current-question evidence.

Source verification proves text provenance, not speaker attribution, interpretation, truth, coverage
of every source, or identical personality. Finite model context, lexical recall, mixed speakers,
transcription errors and output limits remain practical constraints.

## Checks

The offline suite checks full source indexing, character/line provenance, no chunk gaps,
cross-document answer coverage, exclusions, explicit context omissions, quotation rejection, persona
isolation, unavailable-index errors and verified NDJSON transport. Browser checks must mock chat
endpoints. Live fidelity checks, when performed, are recorded separately from UI checks.
