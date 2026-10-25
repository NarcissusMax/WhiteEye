#!/usr/bin/env python3
"""Index owner-supplied manga PDFs without publishing their scans.

Requires Poppler, Tesseract (eng), and Pillow. Each OCR page is checkpointed;
rerunning reuses it only when the source hash and extraction settings match.
Raw OCR is retained verbatim. It is not a verified manga transcription.
"""

import argparse
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time

from PIL import Image


SETTINGS = {"engine": "tesseract", "language": "eng", "psm": 11, "longEdge": 2000}


def command(args):
    return subprocess.run(args, capture_output=True, check=True, env={
        **os.environ, "OMP_THREAD_LIMIT": "1",
    })


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".partial")
    temporary.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)


def utf16_length(value):
    return len(value.encode("utf-16-le")) // 2


def read_page(pdf, page, image, cache, temporary):
    cached = cache / f"{page:05d}.json"
    if cached.exists():
        previous = json.loads(cached.read_text(encoding="utf-8"))
        if not any("\t" in word["text"] or "\n" in word["text"] for word in previous["words"]):
            return previous
    output = temporary / f"ocr-{page:05d}"
    raster = temporary / f"raster-{page:05d}.png"
    if image is None:
        command(["pdftoppm", "-f", str(page), "-l", str(page), "-singlefile",
                 "-scale-to", str(SETTINGS["longEdge"]), "-png", str(pdf),
                 str(raster.with_suffix(""))])
    else:
        with Image.open(image) as original:
            gray = original.convert("L")
            scale = SETTINGS["longEdge"] / max(gray.size)
            if scale > 1:
                gray = gray.resize((round(gray.width * scale), round(gray.height * scale)),
                                   Image.Resampling.LANCZOS)
            gray.save(raster)
    command(["tesseract", str(raster), str(output), "-l", SETTINGS["language"],
             "--psm", str(SETTINGS["psm"]), "txt", "tsv"])
    text = output.with_suffix(".txt").read_text(encoding="utf-8")
    words = []
    lines = output.with_suffix(".tsv").read_text().splitlines()
    columns = lines[0].split("\t")
    for line in lines[1:]:
        # Tesseract's TSV text is literal, not CSV-quoted. A recognized quote
        # must never swallow the following rows or corrupt confidence values.
        row = dict(zip(columns, line.split("\t", 11)))
        if row["level"] == "5" and row["text"].strip():
            words.append({
                "text": row["text"], "confidence": float(row["conf"]),
                "block": int(row["block_num"]), "line": int(row["line_num"]),
                "box": [int(row[key]) for key in ("left", "top", "width", "height")],
            })
    readable = [word for word in words if re.search(r"[A-Za-z]{2}", word["text"])]
    weight = sum(len(word["text"]) for word in readable)
    confidence = sum(word["confidence"] * len(word["text"]) for word in readable) / max(1, weight)
    result = {
        "page": page, "text": text, "words": words,
        "meanConfidence": round(confidence, 2), "readableWords": len(readable),
        "lowConfidence": bool(readable and confidence < 65),
        "noReadableText": not readable,
    }
    write_json(cached, result)
    raster.unlink()
    output.with_suffix(".txt").unlink()
    output.with_suffix(".tsv").unlink()
    return result


def index(source, output, cache_root, workers):
    files = sorted(source.rglob("*.pdf"), key=lambda path: (float(path.stem), str(path)))
    if not files:
        raise ValueError("No manga PDFs found")
    inventory, documents, records = [], [], []
    start_time = time.monotonic()
    signature = hashlib.sha256(json.dumps(SETTINGS, sort_keys=True).encode()).hexdigest()[:12]
    engine_version = command(["tesseract", "--version"]).stdout.decode().splitlines()[0]
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        for file in files:
            with file.open("rb") as source_file:
                sha = hashlib.file_digest(source_file, "sha256").hexdigest()
            file_name = str(file.relative_to(source))
            metadata = command(["pdfinfo", str(file)]).stdout.decode()
            page_count = int(re.search(r"^Pages:\s+(\d+)", metadata, re.M).group(1))
            cache = cache_root / f"{sha[:20]}-{signature}"
            cache.mkdir(parents=True, exist_ok=True)
            with tempfile.TemporaryDirectory(prefix="tomodachi-") as tmp:
                temporary = Path(tmp)
                # Native embedded images avoid rendering 1 GB of scans again.
                listing = command(["pdfimages", "-list", str(file)]).stdout.decode()
                rows = [line.split() for line in listing.splitlines()[2:] if line.strip()]
                page_images = {}
                if len(rows) == page_count and all(row[2] == "image" for row in rows):
                    command(["pdfimages", "-j", str(file), str(temporary / "image")])
                    images = sorted(temporary.glob("image-*"))
                    if len(images) == page_count:
                        page_images = {int(row[0]): image for row, image in zip(rows, images)}
                tasks = [pool.submit(read_page, file, page, page_images.get(page), cache, temporary)
                         for page in range(1, page_count + 1)]
                pages = [task.result() for task in tasks]
            text = "".join(page["text"] + "\f" for page in pages)
            if not text.strip("\f\n\t "):
                raise ValueError(f"No extractable text in {file_name}")
            offsets = [0]
            for page in pages:
                offsets.append(offsets[-1] + utf16_length(page["text"] + "\f"))
            document_id = "tomodachi-" + sha[:20]
            chapter = file.stem
            quality = [{key: page[key] for key in (
                "page", "meanConfidence", "readableWords", "lowConfidence", "noReadableText",
            )} for page in pages]
            documents.append({
                "id": document_id, "file": file_name, "chapter": chapter, "aliases": [],
                "attribution": "manga-scene-mixed-speakers", "extraction": "ocr",
                "pageStarts": offsets[:-1], "pageQuality": quality, "text": text,
            })
            for page in pages:
                if page["noReadableText"]:
                    continue
                focus = page["page"]
                first, last = max(1, focus - 1), min(page_count, focus + 1)
                records.append({
                    "id": f"{document_id}-p{focus:04d}", "document": document_id,
                    "file": file_name, "chapter": chapter, "page": first, "endPage": last,
                    "focusPage": focus, "start": offsets[first - 1], "end": offsets[last],
                    "attribution": "manga-scene-mixed-speakers", "extraction": "ocr",
                    "section": f"Numbered chapter file {chapter}, PDF pages {first}–{last}",
                    "viewpointHint": "Panel and bubble order, speaker and thought attribution are unverified",
                    "meanConfidence": page["meanConfidence"], "lowConfidence": page["lowConfidence"],
                })
            inventory.append({
                "file": file_name, "chapter": chapter, "sha256": sha, "bytes": file.stat().st_size,
                "pages": page_count, "pagesProcessed": len(pages), "extraction": "ocr",
                "lowConfidencePages": sum(page["lowConfidence"] for page in pages),
                "pagesWithoutReadableText": sum(page["noReadableText"] for page in pages),
            })
            print(json.dumps({"file": file_name, "filesProcessed": len(inventory),
                              "pagesProcessed": sum(item["pagesProcessed"] for item in inventory),
                              "seconds": round(time.monotonic() - start_time)}), flush=True)
    integer_chapters = sorted(int(item["chapter"]) for item in inventory if item["chapter"].isdigit())
    missing = [number for number in range(1, 128) if number not in integer_chapters]
    coverage = {
        "completeText": False, "allSuppliedFilesIndexed": True,
        "sourceFiles": len(inventory), "primaryPagesIndexed": sum(item["pages"] for item in inventory),
        "numberedChapterFiles": [item["chapter"] for item in inventory],
        "integerChaptersIndexed": len(integer_chapters), "missingNumberedChapters": missing,
        "extraNumberedFiles": [item["chapter"] for item in inventory if not item["chapter"].isdigit()],
        "volumeOnlyEpilogueIndexed": False, "monsterPrimaryTextIndexed": False,
        "speakerAttributionVerified": False, "transcriptionVerified": False,
        "lowConfidencePages": sum(item["lowConfidencePages"] for item in inventory),
        "pagesWithoutReadableText": sum(item["pagesWithoutReadableText"] for item in inventory),
    }
    corpus = {"version": 1, "work": "Tomodachi Game", "character": "Yuichi Katagiri",
              "extraction": {**SETTINGS, "version": engine_version,
                             "note": "Uncorrected OCR; mixed speakers and unverified panel order"},
              "coverage": coverage, "inventory": inventory, "documents": documents, "records": records}
    write_json(output, corpus)
    write_json(cache_root / "ingestion-report.json", {"coverage": coverage, "inventory": inventory,
               "records": len(records), "elapsedSeconds": round(time.monotonic() - start_time)})
    print(json.dumps({"output": str(output), "records": len(records), "coverage": coverage}), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path("private/tomodachi-corpus.json"))
    parser.add_argument("--cache", type=Path, default=Path("artifacts/tomodachi-ocr"))
    parser.add_argument("--workers", type=int, default=6)
    args = parser.parse_args()
    index(args.source, args.output, args.cache, args.workers)
