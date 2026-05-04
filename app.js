// Clear Language Tool — app.js
// Task 1: static layout verified
// Task 2: Flesch-Kincaid scoring with live badge

// ============================================================================
// FLESCH-KINCAID SCORING (Task 2)
// ============================================================================

// Counts syllables in a single English word (approximation)
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

// Returns UK reading age (integer) or null if text is too short
function fleschKincaidAge(text) {
  const normalised = text.replace(/(\d)\.(\d)/g, '$1$2');
  const sentences = normalised.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.trim().split(/\s+/)
    .filter(w => w.replace(/[^a-z]/gi, '').length > 0);
  if (sentences.length === 0 || words.length < 5) return null;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const grade = 0.39 * (words.length / sentences.length)
              + 11.8 * (syllables / words.length)
              - 15.59;
  return Math.max(5, Math.round(grade + 5)); // convert to UK reading age
}

// Returns CSS class name for badge colour
function badgeClass(age) {
  if (age <= 11) return 'green';
  if (age <= 13) return 'amber';
  return 'red';
}

// Updates a badge element with age text and colour, or hides it
function renderBadge(el, age) {
  if (age === null) { el.textContent = ''; el.classList.add('hidden'); return; }
  el.textContent = `Reading age: ${age}`;
  el.className = `badge ${badgeClass(age)}`;
}

// ============================================================================
// LIVE SCORING (Task 2)
// ============================================================================

const inputText  = document.getElementById('input-text');
const inputBadge = document.getElementById('input-badge');

let debounceTimer;
inputText.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const age = fleschKincaidAge(inputText.value);
    renderBadge(inputBadge, age);
  }, 500);
});

// ============================================================================
// API KEY MANAGEMENT (Task 3)
// ============================================================================

const apiKeySaved  = document.getElementById('api-key-saved');
const apiKeyForm   = document.getElementById('api-key-form');
const apiKeyInput  = document.getElementById('api-key-input');
const saveKeyBtn   = document.getElementById('save-key-btn');
const changeKeyBtn = document.getElementById('change-key-btn');
const checkBtn     = document.getElementById('check-btn');

function getKey() {
  return localStorage.getItem('cl_api_key') || '';
}

function renderKeyUI() {
  const key = getKey();
  if (key) {
    apiKeySaved.classList.remove('hidden');
    apiKeyForm.classList.add('hidden');
    checkBtn.disabled = false;
    checkBtn.textContent = 'Check my text →';
  } else {
    apiKeySaved.classList.add('hidden');
    apiKeyForm.classList.remove('hidden');
    checkBtn.disabled = true;
    checkBtn.textContent = 'Add API key to continue';
  }
}

saveKeyBtn.addEventListener('click', () => {
  const val = apiKeyInput.value.trim();
  if (!val) return;
  if (!val.startsWith('sk-ant-')) {
    apiKeyInput.style.borderColor = '#C8202E';
    apiKeyInput.placeholder = 'Key must start with sk-ant-';
    apiKeyInput.value = '';
    return;
  }
  apiKeyInput.style.borderColor = '';
  localStorage.setItem('cl_api_key', val);
  apiKeyInput.value = '';
  renderKeyUI();
});

changeKeyBtn.addEventListener('click', () => {
  localStorage.removeItem('cl_api_key');
  renderKeyUI();
});

apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveKeyBtn.click();
});

renderKeyUI(); // run on page load

// ============================================================================
// PLATFORM TONE MAP & PROMPT BUILDER (Task 4)
// ============================================================================

const PLATFORM_TONE = {
  'newsletter':    'Warm, community tone. 150-400 words per section.',
  'facebook':      'Conversational and friendly. Short paragraphs. End with a call to action.',
  'instagram':     'Short and visual-first. 1-3 sentences. Hashtags optional.',
  'press-release': 'Formal, third-person. Use headline, intro, quotes, boilerplate structure.',
  'leaflet':       'Punchy and scannable. Short sentences, clear headings, no filler.',
  'website':       'Clear and informative. Use headings, keep language accessible.',
  'talk-notes':    'Spoken-word style. Short sentences, personal tone, written to be heard aloud.',
};

function buildPrompt(text, platform, score) {
  const tone = PLATFORM_TONE[platform] || '';
  const scoreNote = score !== null ? ` The current reading age is ${score}.` : '';
  return `You are a plain-English writing assistant for a UK Methodist church.${scoreNote} Target reading age: 11 (Flesch-Kincaid UK). 13 is acceptable. Platform: ${platform}. Tone: ${tone}

Fix spelling and grammar. Replace words of 4+ syllables with simpler alternatives where possible. Adjust tone for the platform.

Return ONLY valid JSON — no markdown, no explanation outside the JSON:
{"rewrite":"...","reasoning":[{"original":"...","replacement":"...","reason":"..."}]}

Text to improve:
${text}`;
}

// ============================================================================
// CLAUDE API CALL (Task 4)
// ============================================================================

async function callClaude(text, platform, score) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(text, platform, score) }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text || '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  let result;
  try {
    result = JSON.parse(cleaned);
  } catch {
    throw new Error('The response was not in the expected format. Please try again.');
  }
  if (typeof result.rewrite !== 'string') {
    throw new Error('Claude returned an incomplete response. Please try again.');
  }
  return result;
}

// ============================================================================
// OUTPUT RENDERING & BUTTON WIRING (Task 4)
// ============================================================================

const platform         = document.getElementById('platform');
const outputText       = document.getElementById('output-text');
const outputBadge      = document.getElementById('output-badge');
const copyBtn          = document.getElementById('copy-btn');
const reasoningSection = document.getElementById('reasoning-section');
const reasoningList    = document.getElementById('reasoning-list');

checkBtn.addEventListener('click', async () => {
  const text = inputText.value.trim();
  if (!text) return;

  checkBtn.disabled = true;
  checkBtn.textContent = 'Checking…';
  outputText.value = '';
  outputBadge.textContent = '';
  outputBadge.classList.add('hidden');
  copyBtn.classList.add('hidden');
  reasoningSection.classList.add('hidden');

  try {
    const score = fleschKincaidAge(inputText.value);
    const result = await callClaude(text, platform.value, score);

    outputText.value = result.rewrite;

    const outAge = fleschKincaidAge(result.rewrite);
    renderBadge(outputBadge, outAge);

    copyBtn.classList.remove('hidden');

    reasoningList.innerHTML = '';
    (result.reasoning || []).forEach(item => {
      const li     = document.createElement('li');
      const bullet = document.createTextNode('• ');
      const strong = document.createElement('strong');
      strong.textContent = `"${item.original}"`;
      const middle = document.createTextNode(` → "${item.replacement}" — ${item.reason}`);
      li.appendChild(bullet);
      li.appendChild(strong);
      li.appendChild(middle);
      reasoningList.appendChild(li);
    });
    if (result.reasoning?.length) reasoningSection.classList.remove('hidden');

  } catch (err) {
    outputText.value = `Error: ${err.message}`;
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = 'Check my text →';
  }
});

copyBtn.addEventListener('click', () => {
  if (!navigator.clipboard) {
    copyBtn.textContent = 'Copy unavailable (needs HTTPS)';
    setTimeout(() => { copyBtn.textContent = '📋 Copy to clipboard'; }, 2000);
    return;
  }
  navigator.clipboard.writeText(outputText.value)
    .then(() => { copyBtn.textContent = '✓ Copied!'; })
    .catch(() => { copyBtn.textContent = 'Copy failed — please copy manually'; })
    .finally(() => {
      setTimeout(() => { copyBtn.textContent = '📋 Copy to clipboard'; }, 2000);
    });
});
