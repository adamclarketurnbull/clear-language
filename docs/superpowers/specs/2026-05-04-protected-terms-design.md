# Protected Terms Feature — Design Spec
**Date:** 2026-05-04
**Project:** Layton Methodist Church — Clear Language Tool

---

## Overview

A `protected-terms.json` file in the repo root defines words, phrases, and writing rules that Claude must never change. The file is fetched on page load and injected into the system prompt. If the fetch fails, the tool continues working without protection rules.

---

## The JSON File

```json
{
  "terms": [
    "Layton Methodist Church",
    "Forward Project",
    "Blackpool"
  ],
  "rules": {
    "speech_marks": true,
    "proper_nouns": true,
    "scripture_references": true,
    "honorifics": true,
    "dates_and_times": true
  }
}
```

- `terms` — array of exact strings Claude must never rewrite
- `rules` — boolean flags; set to `false` to disable a rule without deleting it

---

## Prompt Injection

`buildPrompt()` in `app.js` gains a `protections` parameter. If protections are loaded, a short paragraph is prepended to the existing instructions:

```
Never change the following: [term1], [term2]. Do not alter anything inside quotation marks. Do not alter capitalised proper nouns. Do not alter scripture references (e.g. John 3:16). Do not alter titles or honorifics (Rev, Pastor, Dr). Do not alter dates or times.
```

Only rules set to `true` are included. If `terms` is empty, the terms sentence is omitted.

---

## Data Flow

1. `app.js` fetches `protected-terms.json` on page load (non-blocking)
2. Result stored in a module-level `protections` variable (default: `null`)
3. `buildPrompt(text, platform, score, protections)` builds the protection paragraph if `protections` is not null
4. On fetch failure: `protections` stays `null`, no rules injected, no error shown to user

---

## Files Changed

| File | Change |
|---|---|
| `protected-terms.json` | Create — editable by anyone with repo access via GitHub file editor |
| `app.js` | Add fetch on load, update `buildPrompt` signature, inject rules into prompt |

---

## Out of Scope

- UI for editing terms in the browser
- Per-platform protection rules
- Validation of the JSON file format
