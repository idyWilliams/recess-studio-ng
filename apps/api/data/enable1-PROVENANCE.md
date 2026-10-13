# ENABLE1 dictionary — provenance and licensing

This directory bundles `enable1.txt`, the offline English word list used by the Word Battle
API to validate submitted words. This document records **what was verified, when, and against
which sources**, so the licensing claim rests on evidence rather than assumption.

> This is engineering documentation, not legal advice. The claims below are stated as
> carefully as the available evidence allows and no further.

## What the file is

**ENABLE1** — the "Enhanced North American Benchmark LExicon" — is a word list of the English
language with 172,823 entries. It was originally compiled by the ENABLE project as a
reference lexicon for word games. The list contains lowercase alphabetic words from 2 to 28
letters; it contains no one-letter words.

## Integrity verification (performed 2026-10-13)

The bundled file was compared against a canonical copy retrieved at the time of verification:

| Check | Result |
|---|---|
| Line count | 172,823 (matches the widely published ENABLE1 entry count) |
| MD5 | `33f2b09e2d9dfb732fa16b5f05a5a8d1` |
| SHA-256 | `3f16130220645692ed49c7134e24a18504c2ca55b3c012f7290e3e77c63b1a89` |
| `diff` against reference copy | **byte-identical — no differences** |
| Character set | pure ASCII, all lines `[a-z]+` |
| Duplicate lines | 0 |
| CRLF line endings | none (LF only) |

Reference copy used for comparison:
`https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt` (the
`dolph/dictionary` repository, a long-standing community mirror of ENABLE1).

**To re-verify:** re-download the reference and compare hashes. If the mirror has changed,
re-establish provenance before updating this file — do not silently replace the word list.

## Licensing evidence

**Claim supported by the evidence:** ENABLE1 is in the **public domain** and may be
redistributed and used commercially without royalty.

Evidence, in order of strength:

1. **Official ENABLE distribution README (mirror-based evidence).** The file
   `README-enable2k.txt`, distributed with the official ENABLE release and mirrored in
   `github.com/BartMassey/wordlists`, states:
   > "This list was placed in the Public Domain by its creators."

2. **Community consensus (corroborating, weaker).** Multiple long-standing references
   (e.g. discussions of the `enable1.txt` mirror hosted at
   `starbeamrainbowlabs.com/blog/article.php?article=posts/090-Hosting-enable1.html`)
   describe the list as public-domain and free to redistribute.

**Limits of the evidence — read before relying on this:**

- The ENABLE project's original publisher site (`bytefusion.com`) is **no longer reliably
  reachable** — it currently resolves to a parked/for-sale domain page. The primary-source
  statement therefore survives only via mirrors of the official distribution README. The
  public-domain status is well-attested but not verifiable at its original URL today.
- ENABLE1 has no separate machine-readable `LICENSE` file in the common distributions; the
  public-domain dedication lives in the distribution README quoted above.
- The file intentionally contains **no proper nouns, abbreviations, or words with diacritics**,
  and notably omits some modern two-letter words (e.g. `qi`, `za`). These are properties of
  the genuine list, not corruption. Word Battle's minimum word length is 3, so the omissions
  have no gameplay effect.

## Version control policy

`enable1.txt` is a **production asset** and is intentionally version-controlled with the
repository (it is deliberately *not* gitignored). Reproducible builds and deterministic
validation require a fixed word list, so the file must be committed deliberately (never via
a broad `git add .`), and any future update must update this provenance document in the same
change.

The list is loaded once into memory at API startup; the file itself is only read at that
point (`apps/api/src/games/word-validator.ts`).
