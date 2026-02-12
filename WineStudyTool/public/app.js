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

let currentMode = 'setup'; // 'setup' | 'study'
let image = null;
let imageName = '';
let scale = 1;
let origin = { x: 0, y: 0 };

// Data model: { regions: [ { id, name, color, points: [{x,y}], labelPos: {x,y} } ] }
let data = { regions: [] };
let drawing = { points: [] };
let hoverPoint = null;
let hoverRegionId = null;
let targetOrder = [];
let currentTargetIndex = 0;

function randColor() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h} 70% 70%)`;
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
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  // draw existing regions
  for (const r of data.regions) {
    if (!r.points || r.points.length < 3) continue;
    ctx.save();
    ctx.beginPath();
    r.points.forEach((p, i) => {
      const x = p.x * canvas.width;
      const y = p.y * canvas.height;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = r.fillOverride || 'rgba(0,0,0,0.08)';
    ctx.strokeStyle = r.strokeOverride || r.color || '#333';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = r.showName ? r.name : '';
    const c = r.labelPos || centroid(r.points);
    label.style.left = (c.x * 100) + '%';
    label.style.top = (c.y * 100) + '%';
    overlay.appendChild(label);
  }

  // draw current poly being created
  if (currentMode === 'setup' && drawing.points.length) {
    ctx.save();
    ctx.beginPath();
    drawing.points.forEach((p, i) => {
      const x = p.x * canvas.width;
      const y = p.y * canvas.height;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#0078d4';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function canvasToNorm(pt) {
  const rect = canvas.getBoundingClientRect();
  return { x: (pt.x - rect.left) / rect.width, y: (pt.y - rect.top) / rect.height };
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

// Setup interactions
canvas.addEventListener('click', (e) => {
  if (!image) return;
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
  }
});

setupModeBtn.addEventListener('click', () => setMode('setup'));
studyModeBtn.addEventListener('click', () => setMode('study'));

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
  image.src = `/maps/${encodeURIComponent(name)}`;
  await image.decode().catch(() => {});
  fitCanvas();
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
    studyStatus.innerHTML = '<span class="badge ok">All regions completed</span>';
    return;
  }
  const id = targetOrder[currentTargetIndex];
  const region = data.regions.find(r => r.id === id);
  targetNameEl.textContent = region ? region.name : '';
}

function handleStudyClick(region) {
  const targetId = targetOrder[currentTargetIndex];
  if (!targetId) return;
  const correct = region.id === targetId;
  if (correct) {
    region.fillOverride = 'rgba(0,200,0,0.25)';
    region.strokeOverride = 'green';
    region.showName = true;
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
