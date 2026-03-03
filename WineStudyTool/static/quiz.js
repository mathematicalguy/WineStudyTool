'use strict';

// ============================================================
// Quiz module — handles follow-up questions after correct region
// click in study mode.
// ============================================================

const QUIZ_CATEGORIES = [
  { key: 'grapes',      label: 'Grapes' },
  { key: 'wines',       label: 'Wines' },
  { key: 'processes',   label: 'Processes' },
  { key: 'producers',   label: 'Producers' },
  { key: 'bestBottles', label: 'Best Bottles' }
];

// Which categories are active (checkboxes)
const quizSettings = {
  grapes: false,
  wines: false,
  processes: false,
  producers: false,
  bestBottles: false,
  questionFormat: 'multipleChoice' // 'multipleChoice' | 'trueFalse'
};

// ---- helpers ----

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Return the list of enabled category keys that have data for the given region */
function activeKeysWithData(region) {
  return QUIZ_CATEGORIES
    .filter(c => quizSettings[c.key])
    .map(c => c.key)
    .filter(key => region[key] && region[key].length > 0);
}

/** Are any quiz categories enabled? */
function isQuizActive() {
  return QUIZ_CATEGORIES.some(c => quizSettings[c.key]);
}

/**
 * Gather wrong-answer pool items for a category from all OTHER regions.
 * Returns an array of strings.
 */
function wrongPool(allRegions, correctRegion, categoryKey) {
  const pool = [];
  for (const r of allRegions) {
    if (r.id === correctRegion.id) continue;
    if (r[categoryKey] && r[categoryKey].length) {
      for (const item of r[categoryKey]) {
        pool.push(item);
      }
    }
  }
  return pool;
}

/**
 * Build a quiz question object.
 * Returns null if no question can be generated.
 *
 * Shape: { text, type:'mc'|'tf', options:[{label, correct}], categoryLabel }
 */
function buildQuestion(allRegions, region) {
  const keys = activeKeysWithData(region);
  if (!keys.length) return null;

  const catKey = pickRandom(keys);
  const catLabel = QUIZ_CATEGORIES.find(c => c.key === catKey).label;
  const items = region[catKey]; // string[]

  if (quizSettings.questionFormat === 'trueFalse') {
    return buildTFQuestion(allRegions, region, catKey, catLabel, items);
  }
  return buildMCQuestion(allRegions, region, catKey, catLabel, items);
}

function buildTFQuestion(allRegions, region, catKey, catLabel, items) {
  const isTrue = Math.random() < 0.5;
  let displayItem;
  if (isTrue) {
    displayItem = pickRandom(items);
  } else {
    const pool = wrongPool(allRegions, region, catKey);
    // Filter out items that actually belong to this region to avoid ambiguity
    const filtered = pool.filter(p => !items.includes(p));
    if (!filtered.length) {
      // Can't make a false statement — fall back to true
      displayItem = pickRandom(items);
      return {
        text: `True or False: "${displayItem}" is a ${singularize(catLabel).toLowerCase()} of ${region.name}.`,
        type: 'tf',
        options: [
          { label: 'True', correct: true },
          { label: 'False', correct: false }
        ],
        categoryLabel: catLabel
      };
    }
    displayItem = pickRandom(filtered);
  }

  return {
    text: `True or False: "${displayItem}" is a ${singularize(catLabel).toLowerCase()} of ${region.name}.`,
    type: 'tf',
    options: [
      { label: 'True', correct: isTrue },
      { label: 'False', correct: !isTrue }
    ],
    categoryLabel: catLabel
  };
}

function buildMCQuestion(allRegions, region, catKey, catLabel, items) {
  const correctItem = pickRandom(items);
  const pool = wrongPool(allRegions, region, catKey)
    .filter(p => p !== correctItem);

  // Need at least 3 distractors; if not enough, pad with "None of the above"
  let distractors = shuffleArray(pool).slice(0, 3);
  while (distractors.length < 3) {
    const pad = `(no other ${catLabel.toLowerCase()})`;
    if (!distractors.includes(pad)) distractors.push(pad);
    else break;
  }

  const options = shuffleArray([
    { label: correctItem, correct: true },
    ...distractors.map(d => ({ label: d, correct: false }))
  ]);

  return {
    text: `Which of the following is a ${singularize(catLabel).toLowerCase()} of ${region.name}?`,
    type: 'mc',
    options,
    categoryLabel: catLabel
  };
}

function singularize(word) {
  if (word === 'Processes') return 'Process';
  if (word === 'Best Bottles') return 'Best Bottle';
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

// ---- Modal UI ----

let quizResolve = null; // resolve function for the current quiz promise

function getQuizModal() {
  return document.getElementById('quizModal');
}

/**
 * Show a quiz question modal. Returns a promise that resolves with
 * true (answered correctly) or false.
 */
function showQuizQuestion(question) {
  const modal = getQuizModal();
  const questionEl = document.getElementById('quizQuestion');
  const optionsEl = document.getElementById('quizOptions');
  const feedbackEl = document.getElementById('quizFeedback');
  const nextBtn = document.getElementById('quizNextBtn');

  questionEl.textContent = question.text;
  optionsEl.innerHTML = '';
  feedbackEl.textContent = '';
  nextBtn.hidden = true;

  return new Promise(resolve => {
    quizResolve = resolve;

    question.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        // Disable all buttons
        optionsEl.querySelectorAll('button').forEach(b => {
          b.disabled = true;
          if (b.textContent === question.options.find(o => o.correct).label) {
            b.classList.add('quiz-correct');
          }
        });
        if (opt.correct) {
          btn.classList.add('quiz-correct');
          feedbackEl.innerHTML = '<span class="badge ok">Correct!</span>';
        } else {
          btn.classList.add('quiz-wrong');
          feedbackEl.innerHTML = `<span class="badge err">Wrong — answer: ${question.options.find(o => o.correct).label}</span>`;
        }
        nextBtn.hidden = false;
      });
      optionsEl.appendChild(btn);
    });

    nextBtn.onclick = () => {
      modal.hidden = true;
      const wasCorrect = optionsEl.querySelector('.quiz-correct:not(.quiz-wrong)') !== null
        && !optionsEl.querySelector('.quiz-wrong');
      resolve(wasCorrect);
    };

    modal.hidden = false;
  });
}

// ---- Settings panel wiring (called from app.js after DOM ready) ----

function initQuizSettingsUI() {
  const container = document.getElementById('quizSettingsBody');
  if (!container) return;

  // Checkboxes
  QUIZ_CATEGORIES.forEach(cat => {
    const label = document.createElement('label');
    label.className = 'quiz-setting-label';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = quizSettings[cat.key];
    cb.addEventListener('change', () => { quizSettings[cat.key] = cb.checked; });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + cat.label));
    container.appendChild(label);
  });

  // Divider
  const hr = document.createElement('div');
  hr.className = 'quiz-settings-divider';
  container.appendChild(hr);

  // Radio buttons
  const formatLabel = document.createElement('div');
  formatLabel.className = 'quiz-settings-heading';
  formatLabel.textContent = 'Question Format';
  container.appendChild(formatLabel);

  [{ value: 'multipleChoice', label: 'Multiple Choice' },
   { value: 'trueFalse', label: 'True or False' }].forEach(fmt => {
    const label = document.createElement('label');
    label.className = 'quiz-setting-label';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'quizFormat';
    radio.value = fmt.value;
    radio.checked = quizSettings.questionFormat === fmt.value;
    radio.addEventListener('change', () => {
      if (radio.checked) quizSettings.questionFormat = fmt.value;
    });
    label.appendChild(radio);
    label.appendChild(document.createTextNode(' ' + fmt.label));
    container.appendChild(label);
  });
}

// ---- Setup-mode list editor helpers ----

/**
 * Build the category list editors for a region inside the given container.
 */
function buildCategoryEditors(region, container) {
  container.innerHTML = '';

  QUIZ_CATEGORIES.forEach(cat => {
    if (!region[cat.key]) region[cat.key] = [];
    const section = document.createElement('div');
    section.className = 'category-editor';

    const header = document.createElement('div');
    header.className = 'category-editor-header';
    header.textContent = cat.label;
    section.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'category-list';

    const renderList = () => {
      list.innerHTML = '';
      region[cat.key].forEach((item, idx) => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.textContent = item;
        span.className = 'category-item-text';
        const del = document.createElement('button');
        del.textContent = '×';
        del.className = 'category-item-del';
        del.addEventListener('click', () => {
          region[cat.key].splice(idx, 1);
          renderList();
        });
        li.appendChild(span);
        li.appendChild(del);
        list.appendChild(li);
      });
    };
    renderList();
    section.appendChild(list);

    const addRow = document.createElement('div');
    addRow.className = 'category-add-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Add ${singularize(cat.label).toLowerCase()}…`;
    input.className = 'category-add-input';
    const addBtn = document.createElement('button');
    addBtn.textContent = '+';
    addBtn.className = 'category-add-btn';
    const doAdd = () => {
      const val = input.value.trim();
      if (!val) return;
      region[cat.key].push(val);
      input.value = '';
      renderList();
    };
    addBtn.addEventListener('click', doAdd);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doAdd(); }
    });
    addRow.appendChild(input);
    addRow.appendChild(addBtn);
    section.appendChild(addRow);

    container.appendChild(section);
  });
}
