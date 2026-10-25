# Ayanokoji Kiyotaka

This document records the COTE source pipeline originally used by the now-retired individual
Ayanokoji choice. IMP still uses bounded context from the owner's 20 PDFs in
/home/narmexis/Projects/WhiteEye/sources/COTE: Volume 0,
Year 1 volumes 1–8 and 7.5, 11.75 short stories, and supplied Year 2 volumes/short stories through
12.5. Missing volumes are not supplied canon. The index contains 4,300 physical PDF pages and
1,676 overlapping passages; it preserves the full extracted text once per document.

Run deno task index:cote to rebuild private/cote-corpus.json. The indexer recursively inventories
PDFs, hashes original bytes, preserves duplicate aliases, and extracts selectable text with
pdftotext -layout. The mostly scanned Year 2 10.25 short-story PDF is rendered at 300 dpi and
read with Tesseract rather than silently indexing only its selectable credits. This requires
pdftotext, pdftoppm and English Tesseract. OCR text is explicitly identified in citations and may
contain recognition errors; exact-copy verification applies to the extracted text, not an
independently proofread transcription.

Every query searches all indexed documents. Retrieval allocates one matching window per document
before additional non-overlapping windows, within a 128,000-character evidence budget. COTE topic
families and checked voice anchors are separate from Tate's. Coverage metadata reports documents
omitted for space. This is bounded retrieval, not a guarantee that every relevant passage from all
4,300 pages fits each response.

For source answers, the model selects passage IDs, inclusive line ranges and dialogue or
inner-narration. The server buffers the response, copies exact original substrings and validates
every range; paraphrased quotation text, invented IDs and out-of-range selections fail closed.
Every novel selection then receives an independent model speaker review before any answer text
streams to the browser. That review can narrow or omit a passage but cannot switch its source ID
or rewrite its wording. Physical PDF page numbers, extracted line ranges, narration type and OCR
status appear in expandable source details and survive refresh.

The source prompt asks for complementary views across volumes, retaining qualifications,
contradictions and development. It distinguishes Kiyotaka from Atsuomi, other viewpoint narrators,
classmates' dialogue, teachers, author/translator afterwords and promotional text. Source-checked
Volume 0 chapter boundaries and named monologue headings provide hints, not automatic speaker
labels. A model review is not guaranteed diarization or perfect character replication.

The individual exact-wording route is no longer selectable. IMP uses these novels as bounded
characterization context for original synthesis; it does not reproduce alleged canonical lines.
Older Ayanokoji messages remain readable with their original speaker labels. WhiteEye and Andrew
Tate retain their own source systems.

The corpus is server-only, embedded in the hosted worker and never served as a downloadable public
asset. The worker initializes the COTE retriever lazily. No model, provider credentials or site
sharing settings are changed by this addition.
