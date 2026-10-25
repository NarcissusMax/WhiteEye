# IMP

IMP is one original persona for influence, persuasion, strategic thinking and reading social
pressure. It combines three fictional mindsets: Johan Liebert's quiet attention to motive and
information, Yuichi Katagiri's improvisation around incentives and reversals, and Kiyotaka
Ayanokoji's observation and longer horizon. These are influences on a new voice, not three
interchangeable character replies or a claim that any fictional person would agree with IMP.

## Book foundation

Robert Greene's [book catalog](https://powerseductionandwar.com/books/) names seven published works.
IMP's prompt includes a separate original research lens for each one:

| Book                                                                                                                   | IMP's lens                                                     | Evidence available to this project                                                      |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [The 48 Laws of Power](https://www.penguinrandomhouse.com/books/330912/the-48-laws-of-power-by-robert-greene/)         | Power arrangements, reputation, leverage, defensive awareness  | Author and publisher descriptions; attributed reprints in the supplied _The Daily Laws_ |
| [The Art of Seduction](https://www.penguinrandomhouse.com/books/286423/the-art-of-seduction-by-robert-greene/)         | Attention, desire, presentation, timing, pressure              | Owner-supplied EPUB and PDF; author description                                         |
| [The 33 Strategies of War](https://www.penguinrandomhouse.com/books/291190/the-33-strategies-of-war-by-robert-greene/) | Conflict selection, initiative, strategy and end state         | Author and publisher descriptions; attributed reprints in the supplied _The Daily Laws_ |
| [The 50th Law](https://powerseductionandwar.com/books/)                                                                | Realism, fear, self-reliance, momentum and developing skill    | Owner-supplied PDF; author description; co-written with 50 Cent                         |
| [Mastery](https://www.penguinrandomhouse.com/books/302099/mastery-by-robert-greene/)                                   | Apprenticeship, practice, mentorship and competence            | Author and publisher descriptions; attributed reprints in the supplied _The Daily Laws_ |
| [The Laws of Human Nature](https://www.penguinrandomhouse.com/books/317474/the-laws-of-human-nature-by-robert-greene/) | Emotion, bias, motives, character and alternative explanations | Owner-supplied PDF; author and publisher descriptions                                   |
| [The Daily Laws](https://www.penguinrandomhouse.com/books/673666/the-daily-laws-by-robert-greene/)                     | Repeated study of power, persuasion, self-control and mastery  | Owner-supplied PDF; publisher description                                               |

The owner's `Documents/IMP books.zip` contains the four named full titles, including two formats of
_The Art of Seduction_. The other three have no standalone copies in the collection, but the
supplied _The Daily Laws_ includes source-attributed reprints from each. IMP uses original notes
informed by these passages and catalog descriptions; it must not invent exact passage wording, page
numbers, examples or numbered laws. Book titles and source basis are exposed below IMP replies.
These are foundations for an original answer, not citation proof that a reply matches the books. No
complete book text is sent with a chat request.

The publisher lists
[The Law of the Sublime](https://www.penguinrandomhouse.com/books/634294/the-law-of-the-sublime-by-robert-greene/)
for November 10, 2026. It is forthcoming as of this implementation and is not treated as a read book
or an eighth substantive source.

## Character foundation

Yuichi now has primary manga evidence from the owner's `Projects/Tomodachi Game.zip`. The archive
was extracted into `Projects/Tomodachi Game/`; all 107 supplied PDFs are processed, totaling 4,089
PDF pages. The numbered files run from 1 through 104 without an internal integer gap, with three
extra files: 7.1, 7.2 and 42.5. File numbering is retained as a source label rather than inventing a
mapping to collected volumes or printed page numbers.

[The primary index](../private/tomodachi-corpus.json) keeps each PDF's SHA-256 hash, page count,
original OCR, page offsets, per-page confidence and mixed-speaker attribution. Every supplied page
is accounted for, including covers, credit pages and pages without readable text. Neighboring
three-page windows provide scene context. The unrelated cooking manga and translation appendix in
`62.pdf`, pages 34–51, remain in the extracted archive but are excluded from persona retrieval. Page
windows stop at that boundary, so the extra story cannot become Yuichi evidence. Text is stored once
per document; retrieval slices it without rewriting, whitespace normalization or silent clipping.
JavaScript UTF-16 offsets preserve Unicode characters. The raw PDF scans stay in the user's Projects
directory and are not published as site assets.

[Separate scene analyses](../private/tomodachi-scenes.json) distinguish observations from this
project's interpretations for IMP. They cover incentives, observable coordination, evidence versus
accusation, disclosure timing, the pressure inside a commitment, revising first impressions,
opponents' counterplay and the relationship costs of winning. Each analysis has specific file and
PDF-page locations. A character's accusation, an administrator's rule explanation, an opponent's
reflection and Yuichi's own speech remain distinct. These notes do not turn every scene into a
universal principle or make harmful fictional methods instructions for real life.

### What the source does and does not establish

This is **all supplied files indexed**, not a complete manga series. Numbered chapters 105–127 and
the volume-only epilogue are absent. Monster primary manga text is still unavailable. OCR is
uncorrected machine extraction: artwork can create false words, speech bubbles can be merged or read
in the wrong order, spelling can be misread, and speakers or thoughts cannot be identified reliably
from first person alone. `transcriptionVerified` and `speakerAttributionVerified` remain false.
Retrieval supplies neighboring pages and confidence metadata; an uncertain attribution stays
uncertain. Neither IMP nor Vesper may turn OCR into an alleged verified quotation.

The existing 49 original research notes remain supporting evidence:

| Material reviewed                                 | Coverage                                 | Evidence type                                                |
| ------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| VIZ's _Monster: The Perfect Edition_ descriptions | Volumes 1–9                              | Publisher descriptions, not manga pages                      |
| Kodansha's _Tomodachi Game_ descriptions          | Volumes 1–26                             | Publisher descriptions, separate from supplied scan coverage |
| Official _Tomodachi Game_ anime synopses          | Episodes 1–12                            | Adaptation synopses, not manga or full scripts               |
| Series and manga character profiles               | Johan's series framing; Yuichi's profile | Publisher characterization                                   |

[The research index](../private/imp-research.json) remains a description-only inventory. Its
historical `primaryMangaVolumesIndexed: 0` describes that inventory and is not a count of the new
numbered manga PDFs. The combined IMP response adds `tomodachiPrimary`,
`primaryMangaChapterFilesIndexed` and `primaryMangaPagesIndexed`. No count of primary collected
volumes is invented. `completeTexts` stays false because both complete manga collections are not
available. Publisher cliffhangers do not establish their answers, and anime episode numbers are not
manga chapter numbers.

Kiyotaka still uses the owner's 20 indexed _Classroom of the Elite_ PDFs and the publisher's series
page. Bounded COTE passages are separate from Tomodachi manga context. Another narrator, especially
in Volume 0 or a side story, must not become Kiyotaka; internal narration differs from speech.
Johan's portrayal remains bounded to owner characterization and publisher research. The synthesis
keeps emotional variability, possible errors, effective opponents and contradictory aims.

### Rebuild the manga index

The indexer requires Poppler (`pdfinfo`, `pdfimages`, `pdftoppm`), Tesseract with English data, and
Python with Pillow. Native PDF images avoid rendering every scan again. The worker count is
configurable; each Tesseract process uses one thread. Six workers were used initially, then ten
after confirming sufficient memory. Per-page checkpoints survive interruption and are reused only
with the same source hash and OCR settings. Tesseract's TSV output is read literally, so recognized
quotation marks do not swallow confidence rows. Failed processing stops ingestion instead of quietly
dropping a page or file.

```sh
python -u scripts/index-tomodachi.py '/home/narmexis/Projects/WhiteEye/sources/Tomodachi Game' --workers 6
```

Checkpoints and the ingestion report are in `artifacts/tomodachi-ocr/`, outside the published
assets. The default output is `private/tomodachi-corpus.json`. Rebuilding the raw index does not
rewrite the separate scene analyses. Changing the supplied files requires reviewing coverage and
scene references before publishing.

## Decision pattern

IMP identifies the visitor's desired outcome and the other person's ability to choose. It separates
facts from inferred motives; maps incentives, information, power and objections; looks for a
plausible alternative interpretation; then offers a specific move, expected response and fallback.
It considers what the move spends in trust or future options and updates when the result arrives.
This pattern is an internal guide, not a mandatory list in every answer.

Questions about “dark psychology” can examine manipulative mechanisms and defenses directly.
Fictional scenes may depict bluffing, misdirection and power struggles. Real-life advice stays
concrete about persuasion, bargaining and framing without turning threats, blackmail, isolation or
exploitation of vulnerability into an actionable plan. It does not invent a hidden motive or treat a
Greene maxim as a scientific law.

## Site behavior

`IMP` remains the sole active choice for Johan, Yuichi and Ayanokoji. The old individual choices are
retired; historical messages keep their original labels. Persona-specific private conversation
recall remains separate. IMP responses are original synthesis, not verified fiction or Greene
quotations. Expandable details show selected primary manga locations, supporting publisher research
and the seven Greene foundations. Coverage persists with the saved reply. Older replies without
primary manga context retain their historical source description.

[The IMP retriever](../server/imp-retrieval.js) combines supporting research with
[the primary manga retriever](../server/tomodachi-retrieval.js). Both prioritize the current
question over inherited topics. Named manga chapter and PDF-page requests stay within that source;
unavailable chapters are reported without substituting a different chapter. Topic retrieval searches
all indexed manga windows. Relevant reviewed scenes provide stable context for ordinary questions,
and observations are separate from analytical inferences. Overlapping windows are excluded and whole
windows that exceed the context budget are omitted rather than silently trimmed.

IMP's maximum contexts are 8,000 characters of supporting research, 10,000 of primary manga excerpts
and 2,800 of scene analyses, alongside its COTE context. Vesper uses 5,000, 6,000 and 2,800
respectively. These are ceilings, not quotas; unrelated evidence is not required. Both the local
server and hosted Worker load the same primary and scene indexes. Incomplete ingestion or an invalid
reviewed scene fails closed. Manga sources are server context; requests for the private JSON files
return 404.

Tests cover source offsets and Unicode, whole-window budgets, unavailable chapters and pages,
observation versus interpretation, IMP and Vesper prompt integration, streamed coverage, full
107-file/4,089-page accounting and retrieval of early, middle, extra and late numbered files. The
packaged-site check verifies both persona paths receive actual primary manga context, keep bounded
prompts and do not expose the indexes publicly.

### Verification on October 9, 2026

All 132 tests and the packaged-site validation passed. Ten randomly selected page windows (seed
20261009) match the raw page OCR checkpoints character for character, with zero storage mismatches;
the report is `artifacts/tomodachi-ocr/ten-passage-audit.json`. This checks preservation through
indexing, not OCR accuracy against the printed manga. Ten key scene pages were also inspected as
images to review their interpretations and attribution. The extraction reports 897 pages below a
65 mean OCR-confidence score and four without readable English words. Artwork and credit pages
affect these values. Exact transcription and automatic speaker attribution remain unverified.
