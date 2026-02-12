'use strict';

const mapSelect = document.getElementById('mapSelect');
const setupModeBtn = document.getElementById('setupModeBtn');
const studyModeBtn = document.getElementById('studyModeBtn');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const regionsList = document.getElementById('regionsList');
const setupPanel = document.getElementById('setupPanel');
const studyPanel = document.getElementById('studyPanel');
const targetNameEl = document.getElementById('targetName');
const studyStatus = document.getElementById('studyStatus');
const resetZoomBtn = document.getElementById('resetZoomBtn');

let currentMode = 'setup'; // 'setup' | 'study'
let image = null;
let imageName = '';
let scale = 1;
let origin = { x: 0, y: 0 };
let panStart = null;
let imageRect = { x: 0, y: 0, width: 0, height: 0 }; // actual image dimensions on canvas

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
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
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
  if (!image) return;
  
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
  const canvasX = pt.x - rect.left;
  const canvasY = pt.y - rect.top;
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
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      data.regions = data.regions.filter(x => x !== r);
      refreshRegionsList();
      draw();
    });
    li.appendChild(color);
    li.appendChild(input);
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
    data.regions.push({ id: crypto.randomUUID(), name, color: randColor(), points: drawing.points.slice(), showName: false });
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
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

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

saveBtn.addEventListener('click', async () => {
  if (!imageName) return;
  await fetch(`/api/polygons/${encodeURIComponent(imageName)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  alert('Saved');
});

clearBtn.addEventListener('click', () => {
  drawing.points = [];
  data.regions = [];
  refreshRegionsList();
  draw();
});

mapSelect.addEventListener('change', () => loadMap(mapSelect.value));

async function loadMaps() {
  const res = await fetch('/api/maps');
  const maps = await res.json();
  mapSelect.innerHTML = '';
  for (const m of maps) {
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = m; mapSelect.appendChild(opt);
  }
  if (maps.length) loadMap(maps[0]);
}

async function loadMap(name) {
  imageName = name;
  image = new Image();
  const loadPromise = new Promise((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  });
  image.src = `/maps/${encodeURIComponent(name)}`;
  if (image.decode) {
    await image.decode().catch(() => loadPromise);
  } else {
    await loadPromise;
  }
  
  // Reset zoom and pan
  scale = 1;
  origin = { x: 0, y: 0 };
  
  fitCanvas();
  requestAnimationFrame(fitCanvas);
  // load polygons
  const res = await fetch(`/api/polygons/${encodeURIComponent(name)}`);
  const json = await res.json();
  data = { regions: (json.regions || []).map(r => ({ ...r, showName: false })) };
  refreshRegionsList();
  draw();
  if (currentMode === 'study') startStudy();
}

function startStudy() {
  // prepare order of unseen or all regions
  const regions = data.regions.filter(r => r.points && r.points.length >= 3);
  targetOrder = shuffle(regions.map(r => r.id));
  currentTargetIndex = 0;
  completedRegions = new Set();
  for (const r of data.regions) { r.fillOverride = undefined; r.strokeOverride = undefined; r.showName = false; }
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
  targetNameEl.textContent = region ? region.name : '';
}

function handleStudyClick(region) {
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
    currentTargetIndex++;
    nextTarget();
  } else {
    region.fillOverride = 'rgba(255,0,0,0.25)';
    region.strokeOverride = 'red';
    region.showName = true;
    studyStatus.innerHTML = `<span class="badge err">${region.name}</span>`;
  }
  draw();
}

// init
loadMaps();
setMode('setup');
fitCanvas();
