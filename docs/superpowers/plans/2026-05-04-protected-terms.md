# Protected Terms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `protected-terms.json` file that is fetched on page load and injected into the Claude prompt so specified terms, quoted text, proper nouns, scripture references, honorifics, and dates are never rewritten.

**Architecture:** Two changes only — create `protected-terms.json` in the repo root, and update `app.js` to fetch it on load and pass the result into `buildPrompt()`. No UI changes. Fetch failure is silent; tool works normally without protections.

**Tech Stack:** Vanilla JS (fetch API), JSON, existing `app.js` prompt builder.

---

## File Map

| File | Change |
|---|---|
| `protected-terms.json` | Create — defines protected terms and rule flags |
| `app.js` | Add fetch on load; update `buildPrompt` to accept and inject protections |

---

## Task 1: Create protected-terms.json

**Files:**
- Create: `protected-terms.json`

- [ ] **Step 1: Create `protected-terms.json` in the repo root**

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

- [ ] **Step 2: Verify the file is valid JSON**

Open a browser console and run:
```js
fetch('protected-terms.json').then(r => r.json()).then(console.log)
```
Expected: the object printed with `terms` array and `rules` object. (Must be served via a local server or GitHub Pages — not `file://`.)

- [ ] **Step 3: Commit**

```bash
git add protected-terms.json
git commit -m "feat: add protected-terms.json with default church terms and rules"
```

---

## Task 2: Fetch protections on page load and update buildPrompt

**Files:**
- Modify: `app.js`

This task has two parts: (1) add the fetch, (2) update `buildPrompt` to use the result.

- [ ] **Step 1: Add module-level protections variable and fetch to `app.js`**

Add this block immediately after the `// PLATFORM TONE MAP & PROMPT BUILDER` section comment, before the `PLATFORM_TONE` constant:

```js
// ============================================================================
// PROTECTED TERMS (fetched on load)
// ============================================================================

let protections = null;

fetch('protected-terms.json')
  .then(r => r.json())
  .then(data => { protections = data; })
  .catch(() => {}); // silent fallback — tool works without protections
```

- [ ] **Step 2: Add buildProtectionClause() helper function**

Add this function immediately before `buildPrompt`:

```js
function buildProtectionClause(p) {
  if (!p) return '';
  const lines = [];
  if (p.terms && p.terms.length > 0) {
    lines.push(`Never change the following terms: ${p.terms.join(', ')}.`);
  }
  if (p.rules?.speech_marks)         lines.push('Do not alter anything inside quotation marks.');
  if (p.rules?.proper_nouns)         lines.push('Do not alter capitalised proper nouns.');
  if (p.rules?.scripture_references) lines.push('Do not alter scripture references (e.g. John 3:16, Genesis 1).');
  if (p.rules?.honorifics)           lines.push('Do not alter titles or honorifics (Rev, Pastor, Dr) before names.');
  if (p.rules?.dates_and_times)      lines.push('Do not alter dates or times (e.g. Sunday 15th June, 10:30am).');
  return lines.length > 0 ? lines.join(' ') + '\n\n' : '';
}
```

- [ ] **Step 3: Update buildPrompt to accept and inject protections**

Replace the existing `buildPrompt` function:

```js
function buildPrompt(text, platform, score, p) {
  const tone = PLATFORM_TONE[platform] || '';
  const scoreNote = score !== null ? ` The current reading age is ${score}.` : '';
  const protectionClause = buildProtectionClause(p);
  return `You are a plain-English writing assistant for a UK Methodist church.${scoreNote} Target reading age: 11 (Flesch-Kincaid UK). 13 is acceptable. Platform: ${platform}. Tone: ${tone}

${protectionClause}Fix spelling and grammar. Replace words of 4+ syllables with simpler alternatives where possible. Adjust tone for the platform.

Return ONLY valid JSON — no markdown, no explanation outside the JSON:
{"rewrite":"...","reasoning":[{"original":"...","replacement":"...","reason":"..."}]}

Text to improve:
${text}`;
}
```

- [ ] **Step 4: Update the callClaude call to pass protections**

Find this line inside `callClaude`:
```js
messages: [{ role: 'user', content: buildPrompt(text, platform, score) }],
```

Replace with:
```js
messages: [{ role: 'user', content: buildPrompt(text, platform, score, protections) }],
```

- [ ] **Step 5: Verify in browser**

Open the tool (via GitHub Pages or a local server — not `file://`). Open the browser console. After page load, run:
```js
protections
```
Expected: the object from `protected-terms.json` (not `null`).

Then paste this text and click Check:
```
Rev Smith will speak at Layton Methodist Church on Sunday 15th June at 10:30am. He will read from John 3:16. The "Forward Project" aims to help the community.
```
Expected: the rewrite leaves "Rev Smith", "Layton Methodist Church", "Sunday 15th June", "10:30am", "John 3:16", and "Forward Project" (in quotes) unchanged.

- [ ] **Step 6: Commit**

```bash
git add app.js
git commit -m "feat: fetch protected-terms.json and inject rules into Claude prompt"
```

---

## Self-Review

**Spec coverage:**
- ✅ `protected-terms.json` created with `terms` array and `rules` flags — Task 1
- ✅ Fetched on page load, stored in `protections` — Task 2 Step 1
- ✅ Silent fallback on fetch failure — Task 2 Step 1 (`.catch(() => {})`)
- ✅ All 6 rule types injected into prompt — Task 2 Step 2 (`buildProtectionClause`)
- ✅ `buildPrompt` updated to accept `p` parameter — Task 2 Step 3
- ✅ `callClaude` passes `protections` to `buildPrompt` — Task 2 Step 4
- ✅ File editable on GitHub without code knowledge — covered by Task 1 (plain JSON)

**Placeholder scan:** None found.

**Type consistency:** `protections` / `p` used consistently. `buildProtectionClause(p)` defined in Task 2 Step 2, called in `buildPrompt` in Task 2 Step 3. `buildPrompt(..., p)` defined in Step 3, called with `protections` in Step 4. ✓
