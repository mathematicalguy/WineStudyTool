'use strict';

const mapMenuBtn = document.getElementById('mapMenuBtn');
const mapMenu = document.getElementById('mapMenu');
const setupModeBtn = document.getElementById('setupModeBtn');
const studyModeBtn = document.getElementById('studyModeBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const clearBtn = document.getElementById('clearBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const regionsList = document.getElementById('regionsList');
const setupPanel = document.getElementById('setupPanel');
const studyPanel = document.getElementById('studyPanel');
const targetNameEl = document.getElementById('targetName');
const studyStatus = document.getElementById('studyStatus');
const fileInput = document.getElementById('fileInput');
const resetZoomBtn = document.getElementById('resetZoomBtn');
const mobileStudyOverlay = document.getElementById('mobileStudyOverlay');
const mobileTargetNameEl = document.getElementById('mobileTargetName');
const mobileStudyStatusEl = document.getElementById('mobileStudyStatus');

// Detect mobile / touch device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

if (isMobile) {
  document.body.classList.add('mobile-mode');
}

let currentMode = 'setup'; // 'setup' | 'study'
let image = null;
let imageName = '';
let scale = 1;
let origin = { x: 0, y: 0 };
let panStart = null;
let imageRect = { x: 0, y: 0, width: 0, height: 0 }; // actual image dimensions on canvas

// Available maps configuration — hierarchical by country
const AVAILABLE_MAPS = [
  {
    label: 'France',
    mapFile: 'France.png',
    dataFile: 'France.json',
    folder: '',
    children: [
      { label: 'Bordeaux',   mapFile: 'France/Bordeaux.png',   dataFile: 'France/Bordeaux.json' },
      { label: 'Burgundy',   mapFile: 'France/Burgundy.png',   dataFile: 'France/Burgundy.json' },
      { label: 'Champagne',  mapFile: 'France/Champagne.png',  dataFile: 'France/Champagne.json' },
      { label: 'Languedoc',  mapFile: 'France/Languedoc.png',  dataFile: 'France/Languedoc.json' },
      { label: 'Loire',      mapFile: 'France/Loire.png',      dataFile: 'France/Loire.json' },
      { label: 'Provence',   mapFile: 'France/Provence.png',   dataFile: 'France/Provence.json' },
      { label: 'Rhone',      mapFile: 'France/Rhone.png',      dataFile: 'France/Rhone.json' }
    ]
  },
  {
    label: 'Italy',
    mapFile: 'Italy.png',
    dataFile: 'Italy.json',
    folder: '',
    children: [
      { label: 'Abruzzo',        mapFile: 'Italy/Abruzzo.png',        dataFile: 'Italy/Abruzzo.json' },
      { label: 'Alto Adige',     mapFile: 'Italy/AltoAdige.jpg',      dataFile: 'Italy/AltoAdige.json' },
      { label: 'Bascilicata',    mapFile: 'Italy/Bascilicata.png',    dataFile: 'Italy/Bascilicata.json' },
      { label: 'Calabria',       mapFile: 'Italy/Calabria.png',       dataFile: 'Italy/Calabria.json' },
      { label: 'Campania',       mapFile: 'Italy/Campania.png',       dataFile: 'Italy/Campania.json' },
      { label: 'Emilia Romagna', mapFile: 'Italy/Emilia Romagna.png', dataFile: 'Italy/Emilia Romagna.json' },
      { label: 'Lazio',          mapFile: 'Italy/Lazio.jpg',          dataFile: 'Italy/Lazio.json' },
      { label: 'Liguria',        mapFile: 'Italy/Liguria.png',        dataFile: 'Italy/Liguria.json' },
      { label: 'Marche',         mapFile: 'Italy/Marche.png',         dataFile: 'Italy/Marche.json' },
      { label: 'Molise',         mapFile: 'Italy/Molise.jpg',         dataFile: 'Italy/Molise.json' },
      { label: 'Piedmont',       mapFile: 'Italy/piedmont.png',       dataFile: 'Italy/piedmont.json' },
      { label: 'Puglia',         mapFile: 'Italy/Puglia.png',         dataFile: 'Italy/Puglia.json' },
      { label: 'Sardinia',       mapFile: 'Italy/Sardinia.png',       dataFile: 'Italy/Sardinia.json' },
      { label: 'Tuscany',        mapFile: 'Italy/Tuscany.png',        dataFile: 'Italy/Tuscany.json' },
      { label: 'Umbria',         mapFile: 'Italy/Umbria.png',         dataFile: 'Italy/Umbria.json' },
      { label: 'Veneto',         mapFile: 'Italy/Veneto.png',         dataFile: 'Italy/Veneto.json' }
    ]
  }
];

// Data model: { regions: [ { id, name, color, points: [{x,y}], labelPos: {x,y} } ] }
let data = { regions: [] };
let drawing = { points: [] };
let hoverPoint = null;
let hoverRegionId = null;
let targetOrder = [];
let currentTargetIndex = 0;
let completedRegions = new Set();

function randColor() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h} 70% 70%)`;
}

function resetView() {
  scale = 1;
  origin = { x: 0, y: 0 };
  draw();
}

function setMode(mode) {
  currentMode = mode;
  setupModeBtn.classList.toggle('active', mode === 'setup');
  studyModeBtn.classList.toggle('active', mode === 'study');
  setupPanel.hidden = mode !== 'setup';
  studyPanel.hidden = mode !== 'study';
  studyStatus.textContent = '';
  clearCanvas();
  draw();
  if (mode === 'study') startStudy();
}

function fitCanvas() {
  // Temporarily shrink canvas so the parent can report its true constrained size
  canvas.width = 1;
  canvas.height = 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  // Account for the border of the parent (canvas-wrap has 2px border)
  const style = getComputedStyle(canvas.parentElement);
  const borderL = parseFloat(style.borderLeftWidth) || 0;
  const borderR = parseFloat(style.borderRightWidth) || 0;
  const borderT = parseFloat(style.borderTopWidth) || 0;
  const borderB = parseFloat(style.borderBottomWidth) || 0;
  canvas.width = rect.width - borderL - borderR;
  canvas.height = rect.height - borderT - borderB;
  draw();
}
window.addEventListener('resize', fitCanvas);

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  overlay.innerHTML = '';
}

function pointInPoly(pt, vs) {
  // ray-casting algorithm
  const x = pt.x, y = pt.y;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x, yi = vs[i].y;
    const xj = vs[j].x, yj = vs[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function centroid(points) {
  let x = 0, y = 0;
  for (const p of points) { x += p.x; y += p.y; }
  return { x: x / points.length, y: y / points.length };
}

function draw() {
clearCanvas();
if (!image || !image.width || !image.height) return;

// Calculate image dimensions maintaining aspect ratio (in unscaled canvas space)
const canvasAspect = canvas.width / canvas.height;
const imageAspect = image.width / image.height;
let drawWidth, drawHeight;

  if (imageAspect > canvasAspect) {
    // Image is wider - fit to width
    drawWidth = canvas.width;
    drawHeight = drawWidth / imageAspect;
  } else {
    // Image is taller - fit to height
    drawHeight = canvas.height;
    drawWidth = drawHeight * imageAspect;
  }

  // Center the image (in unscaled canvas space)
  const drawX = (canvas.width - drawWidth) / 2;
  const drawY = (canvas.height - drawHeight) / 2;

  // Store image rect for coordinate conversion (in unscaled canvas space)
  imageRect = { x: drawX, y: drawY, width: drawWidth, height: drawHeight };

  // Apply zoom and pan transformations
  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.scale(scale, scale);
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();

  // draw existing regions
  for (const r of data.regions) {
    if (!r.points || r.points.length < 3) continue;
    ctx.save();
    ctx.translate(origin.x, origin.y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    r.points.forEach((p, i) => {
      const x = imageRect.x + p.x * imageRect.width;
      const y = imageRect.y + p.y * imageRect.height;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = r.fillOverride || 'rgba(0,0,0,0.08)';
    ctx.strokeStyle = r.strokeOverride || r.color || '#333';
    ctx.lineWidth = 2 / scale;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = r.showName ? r.name : '';
    const c = r.labelPos || centroid(r.points);
    const labelX = (imageRect.x + c.x * imageRect.width) * scale + origin.x;
    const labelY = (imageRect.y + c.y * imageRect.height) * scale + origin.y;
    label.style.left = (labelX / canvas.width * 100) + '%';
    label.style.top = (labelY / canvas.height * 100) + '%';
    overlay.appendChild(label);
  }

  // draw current poly being created
  if (currentMode === 'setup' && drawing.points.length) {
    ctx.save();
    ctx.translate(origin.x, origin.y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    drawing.points.forEach((p, i) => {
      const x = imageRect.x + p.x * imageRect.width;
      const y = imageRect.y + p.y * imageRect.height;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#0078d4';
    ctx.setLineDash([4 / scale, 4 / scale]);
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
    ctx.restore();
  }
}

function canvasToNorm(pt) {
  const rect = canvas.getBoundingClientRect();
  // Scale from CSS pixels to canvas-buffer pixels
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (pt.x - rect.left) * scaleX;
  const canvasY = (pt.y - rect.top) * scaleY;
  // Account for zoom and pan
  const imageX = (canvasX - origin.x) / scale - imageRect.x;
  const imageY = (canvasY - origin.y) / scale - imageRect.y;
  // Convert to normalized coordinates (0-1 range within the image)
  const normX = imageX / imageRect.width;
  const normY = imageY / imageRect.height;
  return { x: normX, y: normY };
}

function pickRegion(normPt) {
  for (let i = data.regions.length - 1; i >= 0; i--) {
    const r = data.regions[i];
    if (pointInPoly(normPt, r.points)) return r;
  }
  return null;
}

function refreshRegionsList() {
  regionsList.innerHTML = '';
  const categoryEditorsWrap = document.getElementById('categoryEditorsWrap');
  const categoryEditors = document.getElementById('categoryEditors');
  const categoryEditorsTitle = document.getElementById('categoryEditorsTitle');
  if (categoryEditorsWrap) categoryEditorsWrap.hidden = true;

  data.regions.forEach((r) => {
    const li = document.createElement('li');
    const color = document.createElement('span');
    color.className = 'region-color';
    color.style.background = r.color || '#ccc';
    const input = document.createElement('input');
    input.className = 'region-name';
    input.value = r.name || '';
    input.placeholder = 'Region name';
    input.addEventListener('input', () => { r.name = input.value; });
    const edit = document.createElement('button');
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => {
      if (categoryEditorsWrap && categoryEditors) {
        categoryEditorsWrap.hidden = false;
        categoryEditorsTitle.textContent = r.name || 'Region';
        buildCategoryEditors(r, categoryEditors);
      }
    });
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      data.regions = data.regions.filter(x => x !== r);
      refreshRegionsList();
      draw();
    });
    li.appendChild(color);
    li.appendChild(input);
    li.appendChild(edit);
    li.appendChild(del);
    regionsList.appendChild(li);
  });
}

// Timestamp of last touch-handled tap to suppress synthesized click
let touchHandledAt = 0;

// Setup interactions
canvas.addEventListener('click', (e) => {
  if (!image) return;
  // Ignore synthesized click events that follow a touch tap already handled
  if (Date.now() - touchHandledAt < 500) return;
  const norm = canvasToNorm({ x: e.clientX, y: e.clientY });
  if (currentMode === 'setup') {
    drawing.points.push(norm);
    draw();
  } else {
    const region = pickRegion(norm);
    if (region) handleStudyClick(region);
  }
});

canvas.addEventListener('dblclick', (e) => {
  if (!image || currentMode !== 'setup') return;
  if (drawing.points.length >= 3) {
    const name = prompt('Region name?') || `Region ${data.regions.length + 1}`;
    data.regions.push({ 
      id: generateUUID(), 
      name, 
      color: randColor(), 
      points: drawing.points.slice(), 
      showName: false 
    });
    drawing.points = [];
    refreshRegionsList();
    draw();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    drawing.points = [];
    draw();
  } else if (e.key === 'r' || e.key === 'R') {
    resetView();
  } else if (e.key === '+' || e.key === '=') {
    // Zoom in at center
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const zoomFactor = 1.1;
    const newScale = Math.min(5, scale * zoomFactor);
    origin.x = centerX - (centerX - origin.x) * (newScale / scale);
    origin.y = centerY - (centerY - origin.y) * (newScale / scale);
    scale = newScale;
    draw();
  } else if (e.key === '-' || e.key === '_') {
    // Zoom out at center
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const zoomFactor = 0.9;
    const newScale = Math.max(0.5, scale * zoomFactor);
    origin.x = centerX - (centerX - origin.x) * (newScale / scale);
    origin.y = centerY - (centerY - origin.y) * (newScale / scale);
    scale = newScale;
    draw();
  }
});

// Mouse wheel zoom
canvas.addEventListener('wheel', (e) => {
e.preventDefault();
if (!image) return;

const rect = canvas.getBoundingClientRect();
const scaleX = canvas.width / rect.width;
const scaleY = canvas.height / rect.height;
const mouseX = (e.clientX - rect.left) * scaleX;
const mouseY = (e.clientY - rect.top) * scaleY;

  // Calculate zoom factor
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
  const newScale = Math.max(0.5, Math.min(5, scale * zoomFactor));

  // Adjust origin to zoom towards mouse position
  origin.x = mouseX - (mouseX - origin.x) * (newScale / scale);
  origin.y = mouseY - (mouseY - origin.y) * (newScale / scale);

  scale = newScale;
  draw();
}, { passive: false });

// Pan with middle mouse or right mouse button
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 1 || e.button === 2) {
    e.preventDefault();
    panStart = { x: e.clientX - origin.x, y: e.clientY - origin.y };
    canvas.style.cursor = 'grabbing';
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (panStart) {
    origin.x = e.clientX - panStart.x;
    origin.y = e.clientY - panStart.y;
    draw();
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (e.button === 1 || e.button === 2) {
    panStart = null;
    canvas.style.cursor = 'default';
  }
});

canvas.addEventListener('mouseleave', () => {
  if (panStart) {
    panStart = null;
    canvas.style.cursor = 'default';
  }
});

// Prevent context menu on right click
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

setupModeBtn.addEventListener('click', () => setMode('setup'));
studyModeBtn.addEventListener('click', () => setMode('study'));
resetZoomBtn.addEventListener('click', resetView);

// Download polygon data
saveBtn.addEventListener('click', () => {
  if (!currentMapEntry) return;
  // Strip runtime-only display properties; keep category arrays
  const saveData = {
    regions: data.regions.map(r => {
      const { fillOverride, strokeOverride, showName, ...rest } = r;
      return rest;
    })
  };
  const dataStr = JSON.stringify(saveData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const jsonName = (currentMapEntry.label || 'map') + '.json';
  a.download = jsonName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Upload polygon data
loadBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const json = JSON.parse(evt.target.result);
      data = { regions: (json.regions || []).map(r => ({ ...r, showName: false })) };
      refreshRegionsList();
      draw();
      if (currentMode === 'study') startStudy();
    } catch (err) {
      alert('Error loading file: ' + err.message);
    }
  };
  reader.readAsText(file);
  fileInput.value = '';
});

clearBtn.addEventListener('click', () => {
  drawing.points = [];
  data.regions = [];
  refreshRegionsList();
  draw();
});

// -------- Flyout map menu --------
let currentMapEntry = null;

mapMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  mapMenu.hidden = !mapMenu.hidden;
});

mapMenu.addEventListener('click', (e) => {
  e.stopPropagation();
});

// -------- Quiz Settings dropdown --------
const quizSettingsBtn = document.getElementById('quizSettingsBtn');
const quizSettingsMenu = document.getElementById('quizSettingsMenu');

document.addEventListener('click', () => { mapMenu.hidden = true; quizSettingsMenu.hidden = true; });

quizSettingsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  quizSettingsMenu.hidden = !quizSettingsMenu.hidden;
});

quizSettingsMenu.addEventListener('click', (e) => {
  e.stopPropagation();
});

function buildMenu() {
  mapMenu.innerHTML = '';
  for (const country of AVAILABLE_MAPS) {
    // Country header row — toggles the submenu
    const header = document.createElement('div');
    header.className = 'map-menu-header';
    const labelSpan = document.createElement('span');
    labelSpan.textContent = country.label;
    header.appendChild(labelSpan);
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    header.appendChild(arrow);

    const sub = document.createElement('div');
    sub.className = 'map-submenu';

    // Overall country map entry
    const overall = document.createElement('div');
    overall.className = 'map-menu-item';
    overall.textContent = `${country.label} (Overview)`;
    overall.addEventListener('click', (e) => {
      e.stopPropagation();
      selectMap(country);
    });
    sub.appendChild(overall);

    if (country.children && country.children.length) {
      const div = document.createElement('div');
      div.className = 'map-menu-divider';
      sub.appendChild(div);

      for (const child of country.children) {
        const ci = document.createElement('div');
        ci.className = 'map-menu-item';
        ci.textContent = child.label;
        ci.addEventListener('click', (e) => {
          e.stopPropagation();
          selectMap(child);
        });
        sub.appendChild(ci);
      }
    }

    mapMenu.appendChild(header);
    mapMenu.appendChild(sub);
  }
}

function selectMap(entry) {
  currentMapEntry = entry;
  mapMenu.hidden = true;
  // Collapse all expanded submenus so the menu is clean when reopened
  mapMenu.querySelectorAll('.map-menu-header.expanded').forEach(el => el.classList.remove('expanded'));
  mapMenu.querySelectorAll('.map-submenu.open').forEach(el => el.classList.remove('open'));
  mapMenuBtn.textContent = (entry.label || 'Map') + ' v';
  loadMap(entry);
}

function loadMaps() {
  buildMenu();
  if (AVAILABLE_MAPS.length) selectMap(AVAILABLE_MAPS[0]);
}

async function loadMap(entry) {
  imageName = entry.mapFile;
  image = new Image();
  const loadPromise = new Promise((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  });
  image.src = `./maps/${entry.mapFile}`;
  // Always wait for the load event so image.width / image.height are guaranteed
  // to be populated before we draw. image.decode() can resolve before the
  // browser has committed the intrinsic dimensions, causing aspect-ratio bugs.
  await loadPromise;
  
  // Reset zoom and pan
  scale = 1;
  origin = { x: 0, y: 0 };

  // Try to load polygon data
  if (entry.dataFile) {
      try {
          const res = await fetch(`./polyregions/${entry.dataFile}`);
          console.log(`Fetching: ./polyregions/${entry.dataFile}`, res.status, res.ok);
          if (res.ok) {
              const json = await res.json();
              console.log('Loaded JSON:', json);
              console.log('Number of regions:', json.regions?.length || 0);
              data = { regions: (json.regions || []).map(r => ({ ...r, showName: false })) };
              console.log('Data after mapping:', data);
          } else {
              console.warn('Failed to load polygon data, using empty regions');
              data = { regions: [] };
          }
      } catch (err) {
          console.error('Failed to load polygon data:', err);
          data = { regions: [] };
    }
  } else {
    data = { regions: [] };
  }

  refreshRegionsList();
  // fitCanvas measures the container and redraws — do it now and again on the
  // next frame to handle any pending layout recalculations.
  fitCanvas();
  requestAnimationFrame(() => {
    fitCanvas();
    if (currentMode === 'study') startStudy();
  });
}

function startStudy() {
  // prepare order of unseen or all regions
  const regions = data.regions.filter(r => r.points && r.points.length >= 3);
  targetOrder = shuffle(regions.map(r => r.id));
  currentTargetIndex = 0;
  completedRegions = new Set();
  for (const r of data.regions) { 
    r.fillOverride = undefined; 
    r.strokeOverride = undefined; 
    r.showName = false; 
  }
  nextTarget();
  draw();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function nextTarget() {
  if (currentTargetIndex >= targetOrder.length) {
    targetNameEl.textContent = 'Done!';
    studyStatus.innerHTML = '<span class="badge ok">All regions completed — restarting...</span>';
    if (mobileTargetNameEl) mobileTargetNameEl.textContent = 'Done!';
    if (mobileStudyStatusEl) mobileStudyStatusEl.innerHTML = '<span class="badge ok">All regions completed — restarting...</span>';
    // Pause, then clear all shading and start a new round
    setTimeout(() => {
      for (const r of data.regions) { r.fillOverride = undefined; r.strokeOverride = undefined; r.showName = false; }
      completedRegions = new Set();
      const regions = data.regions.filter(r => r.points && r.points.length >= 3);
      targetOrder = shuffle(regions.map(r => r.id));
      currentTargetIndex = 0;
      nextTarget();
      draw();
    }, 2000);
    return;
  }
  const id = targetOrder[currentTargetIndex];
  const region = data.regions.find(r => r.id === id);
  const name = region ? region.name : '';
  targetNameEl.textContent = name;
  if (mobileTargetNameEl) mobileTargetNameEl.textContent = name;
  if (mobileStudyStatusEl) mobileStudyStatusEl.innerHTML = '';
}

let quizPending = false; // true while a quiz modal is open

function handleStudyClick(region) {
  if (quizPending) return; // don't accept clicks while quiz modal is up
  const targetId = targetOrder[currentTargetIndex];
  if (!targetId) return;
  // Ignore clicks on already-completed (green) regions
  if (completedRegions.has(region.id) || region.strokeOverride === 'green') return;
  const correct = region.id === targetId;
  if (correct) {
    // Clear any red (wrong) shading from previous incorrect guesses, but keep green ones
    for (const r of data.regions) {
      if (!completedRegions.has(r.id)) {
        r.fillOverride = undefined;
        r.strokeOverride = undefined;
        r.showName = false;
      }
    }
    region.fillOverride = 'rgba(0,200,0,0.25)';
    region.strokeOverride = 'green';
    region.showName = true;
    completedRegions.add(region.id);
    studyStatus.innerHTML = '<span class="badge ok">Correct</span>';
    if (mobileStudyStatusEl) mobileStudyStatusEl.innerHTML = '<span class="badge ok">Correct</span>';
    draw();

    // Check if a follow-up quiz question should be shown
    if (isQuizActive()) {
      const question = buildQuestion(data.regions, region);
      if (question) {
        quizPending = true;
        showQuizQuestion(question).then(() => {
          quizPending = false;
          currentTargetIndex++;
          nextTarget();
          draw();
        });
        return;
      }
    }

    currentTargetIndex++;
    nextTarget();
  } else {
    region.fillOverride = 'rgba(255,0,0,0.25)';
    region.strokeOverride = 'red';
    region.showName = true;
    studyStatus.innerHTML = `<span class="badge err">${region.name}</span>`;
    if (mobileStudyStatusEl) mobileStudyStatusEl.innerHTML = `<span class="badge err">${region.name}</span>`;
  }
  draw();
}

// Simple UUID generator for client-side
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// -------- Touch support for mobile --------
let touchState = { type: null, startDist: 0, startScale: 1, startOrigin: null, lastTouch: null, moved: false };

function getTouchDist(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchMid(t1, t2) {
  return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
}

canvas.addEventListener('touchstart', (e) => {
  if (!image) return;
  if (e.touches.length === 2) {
    e.preventDefault();
    touchState.type = 'pinch';
    touchState.startDist = getTouchDist(e.touches[0], e.touches[1]);
    touchState.startScale = scale;
    touchState.startOrigin = { x: origin.x, y: origin.y };
    touchState.pinchMid = getTouchMid(e.touches[0], e.touches[1]);
  } else if (e.touches.length === 1) {
    touchState.type = 'single';
    touchState.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchState.moved = false;
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (!image) return;
  if (touchState.type === 'pinch' && e.touches.length === 2) {
    e.preventDefault();
    const dist = getTouchDist(e.touches[0], e.touches[1]);
    const mid = getTouchMid(e.touches[0], e.touches[1]);
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const midX = (mid.x - rect.left) * scaleX;
    const midY = (mid.y - rect.top) * scaleY;
    const newScale = Math.max(0.5, Math.min(5, touchState.startScale * (dist / touchState.startDist)));
    origin.x = midX - (midX - touchState.startOrigin.x) * (newScale / touchState.startScale);
    origin.y = midY - (midY - touchState.startOrigin.y) * (newScale / touchState.startScale);
    scale = newScale;
    draw();
  } else if (touchState.type === 'single' && e.touches.length === 1 && scale > 1.05) {
    // Pan only when zoomed in
    e.preventDefault();
    const dx = e.touches[0].clientX - touchState.lastTouch.x;
    const dy = e.touches[0].clientY - touchState.lastTouch.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) touchState.moved = true;
    origin.x += dx;
    origin.y += dy;
    touchState.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    draw();
  } else if (touchState.type === 'single' && e.touches.length === 1) {
    const dx = e.touches[0].clientX - touchState.lastTouch.x;
    const dy = e.touches[0].clientY - touchState.lastTouch.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) touchState.moved = true;
    touchState.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  if (!image) return;
  // Single-finger tap (no movement) ? treat as click
  if (touchState.type === 'single' && !touchState.moved && e.changedTouches.length === 1) {
    const t = e.changedTouches[0];
    const norm = canvasToNorm({ x: t.clientX, y: t.clientY });
    if (currentMode === 'study') {
      const region = pickRegion(norm);
      if (region) {
        touchHandledAt = Date.now();
        handleStudyClick(region);
      }
    }
  }
  if (e.touches.length === 0) {
    touchState.type = null;
  } else if (e.touches.length === 1) {
    // Went from pinch to single finger
    touchState.type = 'single';
    touchState.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchState.moved = true; // don't treat lift as a tap
  }
}, { passive: false });

// init
loadMaps();
initQuizSettingsUI();
setMode(isMobile ? 'study' : 'setup');
fitCanvas();
