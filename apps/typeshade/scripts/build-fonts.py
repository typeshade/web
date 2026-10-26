#!/usr/bin/env python3
"""public/fonts/ibm-plex-sans-kr-{400,600}.woff2 and their sidecar.

IBM Plex Sans KR, subset to the 2,350 KS X 1001 syllables, the compatibility jamo, and every
non-ASCII character the translated copy uses. The complete font is 440 KB per weight; the
subset is about 115 KB with the font's hints kept, which Windows rendering relies on. The sidecar lists the code points each file carries and the hash of
each file, and the build refuses a copy that uses a character the subset does not have.

Needs fonttools and brotli:  pip install fonttools brotli
Run:  bun run build:fonts
"""
from __future__ import annotations

import hashlib
import io
import json
import re
import subprocess
import sys
import tarfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "public" / "fonts"
CACHE = ROOT / "node_modules" / ".cache" / "plex-kr"
VERSION = "1.1.0"
TARBALL = f"https://registry.npmjs.org/@ibm/plex-sans-kr/-/plex-sans-kr-{VERSION}.tgz"
WEIGHTS = {400: "Regular", 600: "SemiBold"}
SIDECAR = FONTS / "ibm-plex-sans-kr.json"


def complete_font(style: str) -> Path:
    """The complete woff2 for one weight, from the npm package, cached under node_modules."""
    target = CACHE / f"IBMPlexSansKR-{style}.woff2"
    if target.exists():
        return target
    CACHE.mkdir(parents=True, exist_ok=True)
    print(f"downloading {TARBALL}")
    data = urllib.request.urlopen(TARBALL, timeout=120).read()
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        for name, out in [
            (f"package/fonts/complete/woff2/hinted/IBMPlexSansKR-{s}.woff2", CACHE / f"IBMPlexSansKR-{s}.woff2")
            for s in WEIGHTS.values()
        ] + [("package/LICENSE.txt", CACHE / "LICENSE.txt")]:
            member = tar.extractfile(name)
            if member is None:
                sys.exit(f"[fonts] {name} is not in the package")
            out.write_bytes(member.read())
    return target


def ksx1001_syllables() -> set[int]:
    """The 2,350 Hangul syllables of KS X 1001: exactly the ones ISO-2022-KR can encode."""
    out = set()
    for cp in range(0xAC00, 0xD7A4):
        try:
            chr(cp).encode("iso2022_kr")
            out.add(cp)
        except UnicodeEncodeError:
            pass
    assert len(out) == 2350, len(out)
    return out


def used_codepoints() -> set[int]:
    """Every non-ASCII character in the translated dictionaries (everything but en.ts)."""
    out = set()
    for path in (ROOT / "src" / "i18n").glob("*.ts"):
        if path.name in ("index.ts", "en.ts"):
            continue
        out |= {ord(c) for c in path.read_text(encoding="utf-8") if ord(c) > 0xFF}
    return out


def ranges(cps: set[int]) -> list[list[int]]:
    out: list[list[int]] = []
    for cp in sorted(cps):
        if out and out[-1][1] == cp - 1:
            out[-1][1] = cp
        else:
            out.append([cp, cp])
    return out


def main() -> None:
    wanted = ksx1001_syllables() | used_codepoints() | set(range(0x3131, 0x318F))
    unicodes = FONTS / ".plex-kr-unicodes.txt"
    unicodes.write_text("\n".join(f"U+{cp:04X}" for cp in sorted(wanted)))
    sidecar = {"source": f"IBM Plex Sans KR {VERSION}, SIL Open Font License 1.1", "files": {}, "codepoints": None}
    covered: set[int] | None = None
    try:
        for weight, style in WEIGHTS.items():
            out = FONTS / f"ibm-plex-sans-kr-{weight}.woff2"
            subprocess.run(
                [
                    "pyftsubset",
                    str(complete_font(style)),
                    f"--unicodes-file={unicodes}",
                    "--flavor=woff2",
                    "--layout-features=*",
                    "--desubroutinize",
                    f"--output-file={out}",
                ],
                check=True,
            )
            from fontTools.ttLib import TTFont

            cmap = set(TTFont(str(out)).getBestCmap().keys())
            covered = cmap if covered is None else covered & cmap
            sidecar["files"][out.name] = hashlib.sha256(out.read_bytes()).hexdigest()
            print(f"public/fonts/{out.name}  {out.stat().st_size // 1024} KB  {len(cmap)} code points")
    finally:
        unicodes.unlink(missing_ok=True)
    assert covered is not None
    missing = used_codepoints() - covered
    if missing:
        sys.exit(f"[fonts] the font has no glyph for: {''.join(chr(c) for c in sorted(missing))}")
    sidecar["codepoints"] = ranges(covered)
    SIDECAR.write_text(json.dumps(sidecar, separators=(",", ":")) + "\n")
    (FONTS / "LICENSE-IBM-Plex.txt").write_bytes((CACHE / "LICENSE.txt").read_bytes())
    print(f"public/fonts/{SIDECAR.name}  {len(sidecar['codepoints'])} ranges")


if __name__ == "__main__":
    main()
