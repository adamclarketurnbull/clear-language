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
