# Integrated course authoring

Course 2 combines the user-supplied IMP books collection into a thematic learning sequence. It is separately authored study material; it is not WhiteEye speech. Course 1's approved quotations must remain untouched.

Module documents use a compact authoring format. Book IDs refer to the local, private extraction audit in `/home/narmexis/.local/state/imp-course`; original books and extracted text are never bundled into the website. The curriculum builder removes internal lineage fields from the published course.
Expansion documents under `expansions/` append lessons to the matching module after its original lessons. Existing lesson IDs therefore remain stable for saved progress and cross-links. Each added lesson names its source book IDs in a private `BOOKS:` field.
Second-pass documents under `refinements/` append after the expansion, again preserving all earlier lesson IDs. They focus on distinct topics located during a further chapter and source-coverage review.
Modules 21 and 22 replace retired game-specific lessons. Their new lessons use fresh storage IDs while presenting ordinary lesson numbers, so old saved game completions and notes cannot be mistaken for the new material. The other lesson IDs remain stable.
The `excluded-source-ids.json` gate prevents retired chess source IDs from re-entering a module pool or a lesson's internal lineage.

Every lesson needs a question, an explanation, a cross-disciplinary connection or a distinction, an applied example, two concrete practices, a reflection, and a retrieval question. Use additional lessons for distinct concepts rather than squeezing unrelated frameworks into a title. Do not present historical, philosophical, religious, speculative, or contested claims as established scientific findings. Keep substantive disagreements visible.

The course is organized by abilities and prerequisites, not by author or book. Technical sources contribute to appropriate technical-literacy and supervised-practice lessons; merely listing a book does not establish comprehensive coverage of it. Coverage auditing distinguishes reviewed material, curricular treatment, duplicate versions, and remaining limitations.
