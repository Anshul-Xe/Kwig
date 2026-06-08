/* Core Application Logic for Kwig Mobile App */
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';


// 1. Storage Bridge (Fallback to localStorage when window.storage is not provided)
if (!window.storage) {
  window.storage = {
    get: async (key) => {
      try {
        const val = localStorage.getItem(key);
        return val ? { value: val } : null;
      } catch (e) {
        console.error("Local storage read error:", e);
        return null;
      }
    },
    set: async (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.error("Local storage write error:", e);
      }
    }
  };
}

// 2. Theme Management Logic
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function updateThemeUI(theme) {
  document.documentElement.classList.remove('theme-coffee');
  let iconName = 'ti-moon';
  let title = 'Default Dark';
  if (theme === 'coffee') {
    document.documentElement.classList.add('theme-coffee');
    iconName = 'ti-coffee';
    title = 'Coffee';
  }
  if (themeIcon) {
    themeIcon.className = `ti ${iconName}`;
  }
  if (themeToggleBtn) {
    themeToggleBtn.setAttribute('title', `Theme: ${title}`);
    themeToggleBtn.setAttribute('aria-label', `Theme: ${title}`);
  }
}

// Initialize theme
(async () => {
  const savedTheme = localStorage.getItem('app-theme') || 'dark';
  // Fallback if savedTheme was retroma
  const actualTheme = savedTheme === 'retroma' ? 'dark' : savedTheme;
  updateThemeUI(actualTheme);
})();

// Add toggle click handler
themeToggleBtn.addEventListener('click', () => {
  if (navigator.vibrate) navigator.vibrate(50);
  const currentTheme = localStorage.getItem('app-theme') || 'dark';
  const nextTheme = (currentTheme === 'coffee') ? 'dark' : 'coffee';
  localStorage.setItem('app-theme', nextTheme);
  updateThemeUI(nextTheme);
});

// 3. Main Application Code
const THOUGHTS = [
  "The disciplined mind creates freedom. The undisciplined one creates chaos.",
  "Small consistent steps compound into extraordinary outcomes.",
  "Clarity precedes mastery. Know what you're building before you build it.",
  "Identity shapes behavior. Become the person first.",
  "Rest is not the absence of ambition — it's built into the system.",
  "You don't rise to your goals. You fall to your systems.",
  "Depth over breadth. Do fewer things, completely.",
  "The gap between who you are and who you want to be is where the work lives.",
  "Attention is currency. Spend it with intention."
];

const SB = [
  { id: "linear_algebra", label: "Linear Algebra" },
  { id: "statistics", label: "Statistics" },
  { id: "python", label: "Python" },
  { id: "project", label: "Project" }
];

const FB = [
  { id: "book_reading", label: "Book Reading" },
  { id: "fl_studio", label: "FL Studio" },
  { id: "speaking", label: "Speaking" }
];

const HB = [
  { id: "water", label: "Water" },
  { id: "gym", label: "Gym" },
  { id: "running", label: "Running" },
  { id: "food", label: "Food" },
  { id: "meditation", label: "Meditation" }
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const _t = new Date();
const TK = `${_t.getFullYear()}-${_t.getMonth() + 1}-${_t.getDate()}`;
const DN = DAYS[_t.getDay()];
const DS = `${MONTHS[_t.getMonth()]} ${_t.getDate()}, ${_t.getFullYear()}`;

let S = {
  page: 'home',
  pc: {},
  hc: {},
  ti: 0,
  cs: [],
  cf: [],
  ch: [],
  deleted_defaults: [], // Track deleted default habits
  tasks: [],
  pages: [],            // Note pages inside "The Void"
  activePageId: null,   // Active note page ID
  as: null,
  wd: null,
  db: null,
  history: [],          // Navigation history stack
  sidebarExpanded: false, // Sidebar folder dropdown expanded
  gdriveToken: null,    // Google Drive access token
  gdriveClientId: '910899479357-oeqhpsg705kspesph1m6q10411r1h25o.apps.googleusercontent.com', // Default OAuth Client ID
  weeklyHabitStates: {}, // Habit states for the last 7 days
  dbFilter: 'monthly',
  prodFormula: 'linear_algebra(2) + statistics(2) + python(2) + project(2) + book_reading(2) + fl_studio(2) + speaking(2)',
  healthFormula: 'water_meter(2) + conscious_meter(2) + water(2) + gym(2) + running(2) + food(2) + meditation(2)',
  habitIcons: {},        // Habit custom icons
  notifiers: {
    water: { enabled: false, interval: 1 },
    walk: { enabled: false, interval: 1 }
  },
  workout: {},
  workout_cycle_start: null,
  calendar_year: null,
  calendar_month: null
};

// Calculate thought of the day index based on year progress
{
  const sy = new Date(_t.getFullYear(), 0, 0);
  S.ti = Math.floor((_t - sy) / 86400000) % THOUGHTS.length;
}

const ld = async (k, fb) => {
  try {
    const r = await window.storage.get(k);
    return r ? JSON.parse(r.value) : fb;
  } catch (e) {
    return fb;
  }
};

const sv = async (k, v) => {
  try {
    await window.storage.set(k, JSON.stringify(v));
  } catch (e) {
    console.error("Failed to save data:", e);
  }
};

// 4. Notification Scheduler Logic
async function updateNotificationScheduling() {
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
    
    // Clear existing reminders
    await LocalNotifications.cancel({ notifications: [{ id: 101 }, { id: 102 }] });
    
    const pending = [];
    
    // Water
    if (S.notifiers.water.enabled) {
      pending.push({
        id: 101,
        title: "Stay Hydrated 💧",
        body: "Time to drink some water and stay healthy!",
        schedule: {
          every: S.notifiers.water.interval === 1 ? 'hour' : undefined,
          on: S.notifiers.water.interval > 1 ? { hour: new Date().getHours() + S.notifiers.water.interval } : undefined,
          repeats: true
        }
      });
    }
    
    // Walk
    if (S.notifiers.walk.enabled) {
      pending.push({
        id: 102,
        title: "Time for a Walk 🚶‍♂️",
        body: "Take a break, stretch your legs, and get some fresh air!",
        schedule: {
          every: S.notifiers.walk.interval === 1 ? 'hour' : undefined,
          on: S.notifiers.walk.interval > 1 ? { hour: new Date().getHours() + S.notifiers.walk.interval } : undefined,
          repeats: true
        }
      });
    }
    
    if (pending.length > 0) {
      await LocalNotifications.schedule({ notifications: pending });
    }
  } catch (e) {
    console.warn("Native local notifications unavailable, using web fallbacks:", e);
    setupWebTimers();
  }
}

let webIntervals = { water: null, walk: null };
function setupWebTimers() {
  clearInterval(webIntervals.water);
  clearInterval(webIntervals.walk);
  
  if (S.notifiers.water.enabled && 'Notification' in window && Notification.permission === 'granted') {
    webIntervals.water = setInterval(() => {
      new Notification("Stay Hydrated 💧", { body: "It's time to drink some water!" });
    }, S.notifiers.water.interval * 3600 * 1000);
  }
  
  if (S.notifiers.walk.enabled && 'Notification' in window && Notification.permission === 'granted') {
    webIntervals.walk = setInterval(() => {
      new Notification("Time for a Walk 🚶‍♂️", { body: "Take a break and stretch your legs!" });
    }, S.notifiers.walk.interval * 3600 * 1000);
  }
}

// 5. State Loading
async function loadAll() {
  S.pc = await ld(`prod-${TK}`, {});
  S.hc = await ld(`health-${TK}`, {});
  S.tasks = await ld(`tasks-${TK}`, []);
  S.cs = await ld('cs', []);
  S.cf = await ld('cf', []);
  S.ch = await ld('ch', []);
  S.pages = await ld('kwig_pages', []);
  S.deleted_defaults = await ld('deleted_defaults', []);
  S.sidebarExpanded = await ld('sidebarExpanded', false);
  S.gdriveClientId = await ld('gdrive_client_id', '910899479357-oeqhpsg705kspesph1m6q10411r1h25o.apps.googleusercontent.com');
  S.workout = await ld('kwig_workout_data', {});
  S.workout_cycle_start = await ld('kwig_workout_cycle_start', null);
  
  // Load weekly habit states
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(_t);
    d.setDate(d.getDate() - i);
    days.push(gdk(d));
  }
  S.weeklyHabitStates = {};
  for (const dk of days) {
    S.weeklyHabitStates[dk] = {
      prod: await ld(`prod-${dk}`, {}),
      health: await ld(`health-${dk}`, {})
    };
  }
  
  S.dbFilter = await ld('db_filter', 'monthly');
  S.prodFormula = await ld('prod_formula', 'linear_algebra(2) + statistics(2) + python(2) + project(2) + book_reading(2) + fl_studio(2) + speaking(2)');
  S.healthFormula = await ld('health_formula', 'water_meter(2) + conscious_meter(2) + water(2) + gym(2) + running(2) + food(2) + meditation(2)');
  S.principles = await ld('kwig_principles', [
    "Keep it simple.",
    "Prioritize health.",
    "Consistency beats intensity."
  ]);
  S.username = await ld('kwig_username', 'Kwig User');
  S.habitIcons = await ld('kwig_habit_icons', {});
  S.folders = await ld('kwig_folders', []);
  S.expandedFolders = await ld('kwig_expanded_folders', {});

  
  // Parse Google OAuth redirect hash if present
  if (window.location.hash.includes('access_token=')) {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const token = params.get('access_token');
    if (token) {
      S.gdriveToken = token;
      await sv('gdrive_token', token);
      // Clean url hash without reloading
      history.replaceState(null, null, ' ');
    }
  } else {
    S.gdriveToken = await ld('gdrive_token', null);
  }
  
  S.notifiers = await ld('notifiers', {
    water: { enabled: false, interval: 1 },
    walk: { enabled: false, interval: 1 }
  });
  
  // Apply web timers fallback if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    setupWebTimers();
  }
  
  // Render initial items inside sidebar drawer
  renderSidebarPages();
  window.renderAccountSync();
  window.updateSidebarToggleUI();
}

const si = () => [...SB, ...S.cs].filter(i => !S.deleted_defaults.includes(i.id));
const fi = () => [...FB, ...S.cf].filter(i => !S.deleted_defaults.includes(i.id));
const hi = () => [...HB, ...S.ch].filter(i => !S.deleted_defaults.includes(i.id));
const ai = () => [...si(), ...fi()];

const uid = () => Math.random().toString(36).slice(2, 9);
const gdk = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const sd = d => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;

const cleanNameForFormula = label => label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');

function parseFormulaWeights(formulaStr) {
  const weights = {};
  if (!formulaStr) return weights;
  const regex = /(\b[a-zA-Z0-9_-]+)\s*\(\s*([0-9.]+)\s*\)/g;
  let match;
  while ((match = regex.exec(formulaStr)) !== null) {
    const name = match[1].toLowerCase();
    const weight = parseFloat(match[2]);
    weights[name] = weight;
  }
  return weights;
}

const getHabitTotals = (pcState, hcState) => {
  const prodWeights = parseFormulaWeights(S.prodFormula);
  const healthWeights = parseFormulaWeights(S.healthFormula);

  const activeS = si();
  let studyEarned = 0;
  let studyTotal = 0;
  for (const h of activeS) {
    const name = cleanNameForFormula(h.label);
    const weight = prodWeights[name] !== undefined ? prodWeights[name] : 2;
    studyTotal += weight;
    if (pcState[h.id]) {
      studyEarned += weight;
    }
  }

  const activeF = fi();
  let funEarned = 0;
  let funTotal = 0;
  for (const h of activeF) {
    const name = cleanNameForFormula(h.label);
    const weight = prodWeights[name] !== undefined ? prodWeights[name] : 2;
    funTotal += weight;
    if (pcState[h.id]) {
      funEarned += weight;
    }
  }

  const activeH = hi();
  let healthEarned = 0;
  let healthTotal = 0;
  for (const h of activeH) {
    const name = cleanNameForFormula(h.label);
    const weight = healthWeights[name] !== undefined ? healthWeights[name] : 2;
    healthTotal += weight;
    if (hcState[h.id]) {
      healthEarned += weight;
    }
  }

  const waterLvl = hcState.water_level !== undefined ? hcState.water_level : 1.0;
  const waterMeterWeight = healthWeights['water_meter'] !== undefined ? healthWeights['water_meter'] : 2;
  healthTotal += waterMeterWeight;
  healthEarned += waterMeterWeight * (waterLvl / 4.0);

  const consciousLvl = hcState.conscious_level !== undefined ? hcState.conscious_level : 4;
  const consciousMeterWeight = healthWeights['conscious_meter'] !== undefined ? healthWeights['conscious_meter'] : 2;
  healthTotal += consciousMeterWeight;
  healthEarned += consciousMeterWeight * (consciousLvl / 6.0);

  return {
    study: studyTotal ? Math.round((studyEarned / studyTotal) * 100) : 0,
    fun: funTotal ? Math.round((funEarned / funTotal) * 100) : 0,
    prod: (studyTotal + funTotal) ? Math.round(((studyEarned + funEarned) / (studyTotal + funTotal)) * 100) : 0,
    health: healthTotal ? Math.round((healthEarned / healthTotal) * 100) : 0
  };
};

const pc = p => p >= 75 ? 'var(--color-accent-green)' : p >= 40 ? 'var(--color-accent-orange)' : p > 0 ? 'var(--color-accent-red)' : 'var(--color-text-tertiary)';
const fmtDl = iso => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}`;
};
const tiso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function updWd() {
  if (!S.wd) return;
  const t = S.wd.find(x => x.isToday);
  if (!t) return;
  const totals = getHabitTotals(S.pc, S.hc);
  t.study = totals.study;
  t.fun = totals.fun;
  t.health = totals.health;
}

async function loadWd() {
  const rows = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(_t);
    d.setDate(d.getDate() - i);
    const dk = gdk(d);
    const p = await ld(`prod-${dk}`, {}), h = await ld(`health-${dk}`, {});
    const totals = getHabitTotals(p, h);
    rows.push({
      label: i === 0 ? 'Today' : sd(d),
      isToday: i === 0,
      study: totals.study,
      fun: totals.fun,
      health: totals.health
    });
  }
  S.wd = rows;
}

async function loadDb() {
  const rows = [];
  let limit = 30;
  const activeDateKeys = new Set();
  let hasLocalStorage = false;
  
  try {
    const datePattern = /^(prod|health|tasks)-(\d{4}-\d{1,2}-\d{1,2})$/;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const match = key.match(datePattern);
      if (match) {
        activeDateKeys.add(match[2]);
      }
    }
    hasLocalStorage = localStorage.length > 0;
  } catch (e) {
    console.warn("localStorage check failed:", e);
  }

  if (S.dbFilter === 'weekly') {
    limit = 7;
  } else if (S.dbFilter === 'monthly') {
    limit = 30;
  } else {
    // find the oldest date in localStorage
    let oldestDays = 365; // fallback
    try {
      let earliestTime = Date.now();
      let found = false;
      for (const dk of activeDateKeys) {
        const parts = dk.split('-');
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (!isNaN(d.getTime())) {
          if (d.getTime() < earliestTime) {
            earliestTime = d.getTime();
            found = true;
          }
        }
      }
      if (found) {
        const diffTime = Math.abs(_t.getTime() - earliestTime);
        oldestDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (oldestDays < 365) oldestDays = 365; // show at least 365 days or all data
      }
    } catch (e) {
      console.warn("Error calculating oldest day limit:", e);
    }
    limit = oldestDays;
  }
  
  for (let i = 0; i < limit; i++) {
    const d = new Date(_t);
    d.setDate(d.getDate() - i);
    const dk = gdk(d);
    
    // Only load from storage if it is today, or if we don't have localStorage, or if the date actually has keys
    if (i === 0 || !hasLocalStorage || activeDateKeys.has(dk)) {
      const p = await ld(`prod-${dk}`, {}), h = await ld(`health-${dk}`, {}), ta = await ld(`tasks-${dk}`, []);
      const totals = getHabitTotals(p, h);
      const tDn = ta.filter(t => t.done).length;
      
      const customS = await ld('cs', []), customF = await ld('cf', []), customH = await ld('ch', []);
      const totalCount = SB.length + customS.length + FB.length + customF.length + HB.length + customH.length + ta.length;
      
      if (totalCount > 0 || i === 0) {
        rows.push({
          dateKey: dk,
          fd: `${DAYS[d.getDay()].slice(0, 3)}, ${sd(d)}`,
          isToday: i === 0,
          study: totals.study,
          fun: totals.fun,
          health: totals.health,
          tDone: tDn,
          tTotal: ta.length
        });
      }
    }
  }
  S.db = rows;
}


function ring(done, tot, sz, sw, col) {
  const r = (sz - sw) / 2, c = 2 * Math.PI * r, pct = tot ? done / tot : 0, off = c * (1 - pct);
  return `<div style="position:relative;width:${sz}px;height:${sz}px">
    <svg width="${sz}" height="${sz}" style="transform:rotate(-90deg);display:block">
      <circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" style="stroke:var(--color-border-tertiary);stroke-width:${sw}"/>
      <circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" style="stroke:${col};stroke-width:${sw};stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${off.toFixed(1)};stroke-linecap:round;transition:stroke-dashoffset 0.7s ease"/>
    </svg>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:14px;font-weight:600;color:var(--color-text-primary)">${Math.round(pct * 100)}%</div>
  </div>`;
}

function pri(p) {
  const c = {
    High: { b: 'rgba(252, 235, 235, 0.9)', f: '#A32D2D', db: 'rgba(74, 20, 20, 0.4)', df: '#e06b6b' },
    Medium: { b: 'rgba(250, 238, 218, 0.9)', f: '#854F0B', db: 'rgba(79, 58, 25, 0.4)', df: '#e3ad68' },
    Low: { b: 'rgba(225, 245, 238, 0.9)', f: '#0F6E56', db: 'rgba(21, 64, 52, 0.4)', df: '#69c2ad' }
  }[p] || { b: '#F1EFE8', f: '#5F5E5A', db: '#333230', df: '#a3a19d' };

  const isDark = document.documentElement.classList.contains('dark');
  const bg = isDark ? c.db : c.b;
  const fg = isDark ? c.df : c.f;

  return `<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px;background:${bg};color:${fg};white-space:nowrap">${p}</span>`;
}

function cbx(checked) {
  return `<div style="width:18px;height:18px;border:1.5px solid ${checked ? 'var(--color-text-primary)' : 'var(--color-border-secondary)'};border-radius:4px;background:${checked ? 'var(--color-text-primary)' : 'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s">
    ${checked ? '<i class="ti ti-check" style="font-size:11px;color:var(--color-background-primary)" aria-hidden="true"></i>' : ''}
  </div>`;
}

function shdr(title, fn, mt) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;${mt ? 'margin-top:' + mt : ''}">
    <span style="font-size:10px;font-weight:600;color:var(--color-text-tertiary);letter-spacing:0.1em;text-transform:uppercase">${title}</span>
    <button class="add-btn" onclick="${fn}">+ Add row</button>
  </div>`;
}

function irow(item, chk, type, isCus, sec) {
  const col = chk ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)', dec = chk ? 'line-through' : 'none';
  return `<div class="cr" id="habit-row-${item.id}" onclick="togI('${item.id}','${type}')" 
    data-del-type="habit" 
    data-del-id="${item.id}" 
    data-del-sec="${sec}" 
    data-del-name="${item.label}"
    style="display:flex;align-items:center;gap:8px;padding:12px 0;border-bottom:0.5px solid var(--color-border-tertiary)">
    <span style="flex:1;font-size:15px;color:${col};text-decoration:${dec};transition:all 0.2s">${item.label}</span>
    <div>${cbx(chk)}</div>
  </div>`;
}

function aiform(sec) {
  return `<div style="display:flex;align-items:center;gap:8px;padding:11px 0;border-bottom:0.5px solid var(--color-border-tertiary)">
    <input id="ni-${sec}" type="text" placeholder="Add item..." style="flex:1;font-size:14px;border:none;background:transparent;color:var(--color-text-primary);font-family:var(--font-sans)" onkeydown="if(event.key==='Enter')confI('${sec}');if(event.key==='Escape')cancelA()">
    <button onclick="confI('${sec}')" style="background:var(--color-text-primary);border:none;border-radius:4px;padding:4px 10px;font-size:12px;color:var(--color-background-primary);cursor:pointer;font-family:var(--font-sans);font-weight:500">Add</button>
    <button onclick="cancelA()" style="background:none;border:0.5px solid var(--color-border-secondary);border-radius:4px;padding:4px 8px;font-size:12px;color:var(--color-text-secondary);cursor:pointer;font-family:var(--font-sans)">×</button>
  </div>`;
}

function renderHome() {
  const prod = ai(), hlth = hi();
  const pD = prod.filter(i => S.pc[i.id]).length, hD = hlth.filter(i => S.hc[i.id]).length;
  const totals = getHabitTotals(S.pc, S.hc);

  const principlesCount = S.principles ? S.principles.length : 0;
  let activePrincipleText = "No principles set. Hold to manage!";
  let index = 0;
  if (principlesCount > 0) {
    if (S.activePrincipleIndex === undefined || S.activePrincipleIndex === null || S.activePrincipleIndex >= principlesCount) {
      const dayOfYear = Math.floor((_t - new Date(_t.getFullYear(), 0, 0)) / 86400000);
      S.activePrincipleIndex = dayOfYear % principlesCount;
    }
    index = S.activePrincipleIndex;
    activePrincipleText = S.principles[index];
  }
  const displayPrinciple = activePrincipleText.trim() || "Empty principle. Click to cycle, hold to edit...";
  const fraction = principlesCount > 0 ? `${index + 1}/${principlesCount}` : '0/0';

  // Compute weekly habit matrix html
  const mHabits = (() => {
    const study = si().map(h => ({ ...h, type: 'prod', category: 'Study', icon: getHabitIcon(h.id, 'Study') }));
    const fun = fi().map(h => ({ ...h, type: 'prod', category: 'Fun', icon: getHabitIcon(h.id, 'Fun') }));
    const healthList = hi().filter(h => h.id !== 'water').map(h => ({ ...h, type: 'health', category: 'Health', icon: getHabitIcon(h.id, 'Health') }));
    
    const specialHealth = [
      { id: 'water_meter', label: 'Water Intake', type: 'health', category: 'Health', icon: getHabitIcon('water_meter', 'Health'), isDropdown: true, dropdownType: 'water' },
      { id: 'conscious_meter', label: 'Consciousness', type: 'health', category: 'Health', icon: getHabitIcon('conscious_meter', 'Health'), isDropdown: true, dropdownType: 'conscious' }
    ];
    
    return [...study, ...fun, ...healthList, ...specialHealth];
  })();

  const mDays = (() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(_t);
      d.setDate(d.getDate() - i);
      list.push({
        dateKey: gdk(d),
        dayName: DAYS[d.getDay()].slice(0, 3),
        isToday: i === 0
      });
    }
    return list;
  })();

  const mHeaders = mDays.map(d => {
    const inner = d.isToday 
      ? `<span style="background:var(--color-text-primary);color:var(--color-background-primary);border-radius:4px;padding:2px 5px;font-size:9px;font-weight:700">${d.dayName}</span>` 
      : d.dayName;
    return `<th style="padding:10px 4px;text-align:center;font-size:10px;font-weight:600;color:var(--color-text-tertiary)">${inner}</th>`;
  }).join('');

  const mRows = mHabits.map(h => {
    let color = 'var(--color-accent-blue)';
    if (h.category === 'Fun') color = 'var(--color-accent-orange)';
    if (h.category === 'Health') color = 'var(--color-accent-green)';
    
    const cells = mDays.map(d => {
      if (h.isDropdown) {
        const hState = S.weeklyHabitStates[d.dateKey] && S.weeklyHabitStates[d.dateKey].health ? S.weeklyHabitStates[d.dateKey].health : {};
        if (h.dropdownType === 'water') {
          const hasWater = hState.water_level !== undefined && hState.water_level !== null;
          const wLvl = hState.water_level;
          const display = hasWater 
            ? `${wLvl % 1 === 0 ? wLvl.toFixed(0) + 'L' : wLvl.toFixed(1) + 'L'}&nbsp;<i class="ti ti-chevron-down" style="font-size:8px; opacity:0.5"></i>` 
            : `<i class="ti ti-chevron-down" style="font-size:10px; opacity:0.6"></i>`;
          return `<td style="padding:4px 2px;text-align:center;vertical-align:middle">
            <div id="wm-drop-${d.dateKey}-water" 
                 onclick="window.openWeeklyLevelDropdown(event, '${d.dateKey}', 'water')" 
                 style="font-size:10px; font-weight:600; color:var(--color-title-faded); cursor:pointer; user-select:none; display:inline-flex; align-items:center; justify-content:center; gap:2px; width:100%; height:20px; border-radius:4px; transition: background-color 0.15s;"
                 onmouseover="this.style.background='var(--color-background-secondary)'"
                 onmouseout="this.style.background='transparent'">
              ${display}
            </div>
          </td>`;
        } else {
          const hasConscious = hState.conscious_level !== undefined && hState.conscious_level !== null;
          const cLvl = hState.conscious_level;
          const display = hasConscious 
            ? `${cLvl}&nbsp;<i class="ti ti-chevron-down" style="font-size:8px; opacity:0.5"></i>` 
            : `<i class="ti ti-chevron-down" style="font-size:10px; opacity:0.6"></i>`;
          return `<td style="padding:4px 2px;text-align:center;vertical-align:middle">
            <div id="wm-drop-${d.dateKey}-conscious" 
                 onclick="window.openWeeklyLevelDropdown(event, '${d.dateKey}', 'conscious')" 
                 style="font-size:10px; font-weight:600; color:var(--color-title-faded); cursor:pointer; user-select:none; display:inline-flex; align-items:center; justify-content:center; gap:2px; width:100%; height:20px; border-radius:4px; transition: background-color 0.15s;"
                 onmouseover="this.style.background='var(--color-background-secondary)'"
                 onmouseout="this.style.background='transparent'">
              ${display}
            </div>
          </td>`;
        }
      }
      
      const isCh = S.weeklyHabitStates[d.dateKey] && S.weeklyHabitStates[d.dateKey][h.type] && S.weeklyHabitStates[d.dateKey][h.type][h.id];
      return `<td style="padding:6px 4px;text-align:center;vertical-align:middle">
        <div id="wm-check-${h.id}-${d.dateKey}" 
             onclick="window.togWeeklyHabit('${h.id}','${d.dateKey}','${h.type}')" 
             style="width:16px;height:16px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;cursor:pointer;
                    border:1.5px solid ${isCh ? color : 'var(--color-border-secondary)'};
                    background-color: ${isCh ? color : 'transparent'};
                    transition:all 0.15s ease;"
             title="${h.label} (${d.dayName})">
          ${isCh ? `<i class="ti ti-check" style="font-size:9px;color:var(--color-background-primary);font-weight:bold"></i>` : ''}
        </div>
      </td>`;
    }).join('');
    
    return `<tr style="border-bottom:0.5px solid var(--color-border-tertiary)">
      <td style="padding:6px 4px;text-align:center;vertical-align:middle">
        <div onmousedown="window.handleHabitLogoPointerStart(event, '${h.id}', '${h.label.replace(/'/g, "\\'")}')"
             onmousemove="window.handleHabitLogoPointerMove(event)"
             onmouseup="window.handleHabitLogoPointerEnd()"
             onmouseleave="window.handleHabitLogoPointerEnd()"
             ontouchstart="window.handleHabitLogoPointerStart(event, '${h.id}', '${h.label.replace(/'/g, "\\'")}')"
             ontouchmove="window.handleHabitLogoPointerMove(event)"
             ontouchend="window.handleHabitLogoPointerEnd()"
             onclick="window.handleHabitLogoClick(event, '${h.label.replace(/'/g, "\\'")}')"
             style="font-size:20px;color:${color};display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);cursor:pointer;user-select:none;-webkit-user-select:none;" 
             title="${h.label}">
          <i class="${h.icon}"></i>
        </div>
      </td>
      ${cells}
    </tr>`;
  }).join('');

  const matrixHtml = `<div class="f4" style="margin-bottom:24px">
    <div style="font-size:10px;font-weight:600;color:var(--color-text-tertiary);letter-spacing:0.09em;text-transform:uppercase;margin-bottom:8px">Habit Matrix</div>
    <div style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow-x:auto;box-shadow: 0 2px 8px var(--color-shadow)">
      <table style="width:100%;border-collapse:collapse;table-layout:fixed">
        <thead>
          <tr style="border-bottom:0.5px solid var(--color-border-secondary);background:var(--color-background-secondary)">
            <th style="width:40px;padding:10px 4px;text-align:center;font-size:10px;font-weight:600;color:var(--color-text-tertiary)">Habit</th>
            ${mHeaders}
          </tr>
        </thead>
        <tbody>
          ${mRows}
        </tbody>
      </table>
    </div>
  </div>`;

  const tRows = S.tasks.map(t => {
    const od = t.deadline && t.deadline < tiso() && !t.done;
    const dlColor = od ? 'var(--color-accent-red)' : 'var(--color-text-secondary)';
    return `<div class="cr" 
      id="task-row-${t.id}"
      data-del-type="task" 
      data-del-id="${t.id}" 
      data-del-name="${t.text || 'Untitled'}"
      style="display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:0.5px solid var(--color-border-tertiary)">
      <span onclick="togT('${t.id}')" style="flex:1;min-width:0;font-size:13px;color:${t.done ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)'};text-decoration:${t.done ? 'line-through' : 'none'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:all 0.2s">${t.text || 'Untitled'}</span>
      <span onclick="cycP('${t.id}')" style="width:54px;flex-shrink:0;cursor:pointer">${pri(t.priority || 'Medium')}</span>
      <span style="width:52px;flex-shrink:0;font-size:11px;text-align:center;color:${dlColor}">${t.deadline ? fmtDl(t.deadline) : '—'}</span>
      <div onclick="togT('${t.id}')" style="cursor:pointer;flex-shrink:0">${cbx(t.done)}</div>
    </div>`;
  }).join('');

  const tEmpty = `<div id="task-list-empty" style="padding:16px 12px;font-size:13px;color:var(--color-text-tertiary);text-align:center;${S.tasks.length === 0 ? '' : 'display:none;'}">No tasks — add one above</div>`;
  
  let wk = '';
  if (!S.wd) {
    wk = `<div style="padding:20px;text-align:center;font-size:12px;color:var(--color-text-tertiary)">Loading weekly data...</div>`;
  } else {
    const wr = S.wd.map(d => `<tr style="border-bottom:0.5px solid var(--color-border-tertiary)">
      <td style="padding:8px 4px 8px 12px;font-size:12px;color:${d.isToday ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'};font-weight:${d.isToday ? 600 : 400}">${d.label}</td>
      <td style="padding:8px 4px;text-align:center;font-size:12px;font-weight:600;color:${pc(d.study)}">${d.study}%</td>
      <td style="padding:8px 4px;text-align:center;font-size:12px;font-weight:600;color:${pc(d.fun)}">${d.fun}%</td>
      <td style="padding:8px 12px 8px 4px;text-align:center;font-size:12px;font-weight:600;color:${pc(d.health)}">${d.health}%</td>
    </tr>`).join('');
    
    wk = `<table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="border-bottom:0.5px solid var(--color-border-secondary)">
          <th style="padding:10px 4px 8px 12px;font-size:10px;font-weight:600;color:var(--color-text-tertiary);text-align:left;text-transform:uppercase;letter-spacing:0.08em">Date</th>
          <th style="padding:10px 4px 8px;font-size:10px;font-weight:600;color:var(--color-text-tertiary);text-align:center;text-transform:uppercase;letter-spacing:0.08em">Study</th>
          <th style="padding:10px 4px 8px;font-size:10px;font-weight:600;color:var(--color-text-tertiary);text-align:center;text-transform:uppercase;letter-spacing:0.08em">Fun</th>
          <th style="padding:10px 12px 8px 4px;font-size:10px;font-weight:600;color:var(--color-text-tertiary);text-align:center;text-transform:uppercase;letter-spacing:0.08em">Health</th>
        </tr>
      </thead>
      <tbody>${wr}</tbody>
    </table>
    <div style="padding:8px 12px;display:flex;align-items:center;justify-content:flex-end;gap:4px;border-top:0.5px solid var(--color-border-tertiary)">
      <span style="font-size:11px;color:var(--color-text-tertiary)">Open database</span>
      <i class="ti ti-arrow-up-right" style="font-size:12px;color:var(--color-text-tertiary)" aria-hidden="true"></i>
    </div>`;
  }

  // The Void Folders grid under Matrix
  const folders = S.folders || [];
  const foldersGrid = folders.map(f => {
    const fPages = S.pages.filter(p => p.folderId === f.id);
    return `
      <div onclick="goTo('notes')" class="tap" 
           style="background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-md); padding:12px 14px; display:flex; flex-direction:column; gap:6px; cursor:pointer; box-shadow:0 2px 6px var(--color-shadow); transition:transform 0.15s ease, box-shadow 0.15s ease;"
           onmouseover="this.style.transform='translateY(-2px)';"
           onmouseout="this.style.transform='none';">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="ti ti-folder" style="font-size:20px; color:var(--color-accent-blue)"></i>
          <span style="font-size:13px; font-weight:600; color:var(--color-text-primary); text-overflow:ellipsis; white-space:nowrap; overflow:hidden;">${f.name}</span>
        </div>
        <div style="font-size:11px; color:var(--color-text-tertiary);">${fPages.length} note${fPages.length !== 1 ? 's' : ''}</div>
      </div>
    `;
  }).join('');
  
  const foldersEmpty = folders.length === 0 
    ? `<div style="padding:16px; text-align:center; font-size:12px; color:var(--color-text-tertiary); font-style:italic; background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-md);">No folders created. Add folders in The Void!</div>`
    : `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:10px;">${foldersGrid}</div>`;

  const voidFoldersHtml = `
    <div class="f4" style="margin-bottom:24px">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px">
        <span style="font-size:10px; font-weight:600; color:var(--color-text-tertiary); letter-spacing:0.09em; text-transform:uppercase">The Void Folders</span>
        <button onclick="goTo('notes')" style="background:none; border:none; cursor:pointer; font-size:11px; color:var(--color-text-secondary); font-family:var(--font-sans); padding:0; display:inline-flex; align-items:center; gap:3px">
          Manage <i class="ti ti-arrow-up-right" style="font-size:12px"></i>
        </button>
      </div>
      ${foldersEmpty}
    </div>
  `;

  // Notifiers UI Component
  const wEn = S.notifiers.water.enabled, wInt = S.notifiers.water.interval;
  const lEn = S.notifiers.walk.enabled, lInt = S.notifiers.walk.interval;
  const notifierHtml = `<div class="f4" style="margin-bottom:24px">
    <div style="font-size:10px;font-weight:600;color:var(--color-text-tertiary);letter-spacing:0.09em;text-transform:uppercase;margin-bottom:8px">Reminders</div>
    <div style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:14px 16px;display:flex;flex-direction:column;gap:14px;box-shadow: 0 2px 8px var(--color-shadow)">
      
      <!-- Water reminder -->
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px">
          <i class="ti ti-droplet" style="font-size:18px;color:var(--color-accent-blue)" aria-hidden="true"></i>
          <div style="display:flex;flex-direction:column">
            <span style="font-size:13px;font-weight:500;color:var(--color-text-primary)">Drink Water</span>
            <span style="font-size:11px;color:var(--color-text-tertiary)">Stay hydrated during the day</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <select class="dropdown-select" onchange="window.changeNotifierInterval('water', this.value)">
            <option value="1" ${wInt === 1 ? 'selected' : ''}>Every 1 hr</option>
            <option value="2" ${wInt === 2 ? 'selected' : ''}>Every 2 hr</option>
            <option value="3" ${wInt === 3 ? 'selected' : ''}>Every 3 hr</option>
          </select>
          <label class="switch">
            <input type="checkbox" ${wEn ? 'checked' : ''} onchange="window.toggleNotifier('water', this.checked)">
            <span class="slider-toggle"></span>
          </label>
        </div>
      </div>
      
      <div style="height:0.5px;background:var(--color-border-tertiary)"></div>
      
      <!-- Walk reminder -->
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px">
          <i class="ti ti-walk" style="font-size:18px;color:var(--color-accent-green)" aria-hidden="true"></i>
          <div style="display:flex;flex-direction:column">
            <span style="font-size:13px;font-weight:500;color:var(--color-text-primary)">Go for a Walk</span>
            <span style="font-size:11px;color:var(--color-text-tertiary)">Take breaks and stretch</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <select class="dropdown-select" onchange="window.changeNotifierInterval('walk', this.value)">
            <option value="1" ${lInt === 1 ? 'selected' : ''}>Every 1 hr</option>
            <option value="2" ${lInt === 2 ? 'selected' : ''}>Every 2 hr</option>
            <option value="3" ${lInt === 3 ? 'selected' : ''}>Every 3 hr</option>
          </select>
          <label class="switch">
            <input type="checkbox" ${lEn ? 'checked' : ''} onchange="window.toggleNotifier('walk', this.checked)">
            <span class="slider-toggle"></span>
          </label>
        </div>
      </div>
      
    </div>
  </div>`;

  return `<div style="padding:20px 0 20px">
    <div class="f1">
      <div style="font-size:11px;color:var(--color-text-tertiary);font-weight:600;letter-spacing:0.09em;text-transform:uppercase;margin-bottom:4px">${DN}</div>
      <div style="font-size:26px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-serif);line-height:1.2;margin-bottom:24px">${DS}</div>
    </div>
    
    <div class="tc f2" 
         onmousedown="window.handlePrinciplePointerStart(event)"
         onmousemove="window.handlePrinciplePointerMove(event)"
         onmouseup="window.handlePrinciplePointerEnd()"
         onmouseleave="window.handlePrinciplePointerEnd()"
         ontouchstart="window.handlePrinciplePointerStart(event)"
         ontouchmove="window.handlePrinciplePointerMove(event)"
         ontouchend="window.handlePrinciplePointerEnd()"
         onclick="window.handlePrincipleClick(event)"
         style="background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-left:3px solid var(--color-text-primary);border-radius:0 8px 8px 0;padding:14px 16px 12px;margin-bottom:24px;cursor:pointer;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;outline:none;-webkit-tap-highlight-color:transparent;">
      <div style="font-size:10px;font-weight:600;color:var(--color-text-tertiary);letter-spacing:0.09em;text-transform:uppercase;margin-bottom:8px;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;">Principle of the day</div>
      <div id="tt" style="font-size:14px;color:var(--color-text-primary);font-family:var(--font-serif);font-style:italic;line-height:1.65;margin-bottom:10px;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;">&ldquo;${displayPrinciple}&rdquo;</div>
      <div id="th" style="font-size:11px;color:var(--color-text-tertiary);text-align:right;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;">${fraction}</div>
    </div>
    
    <div class="f3">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:10px;font-weight:600;color:var(--color-text-tertiary);letter-spacing:0.09em;text-transform:uppercase">Today's progress</span>
        <button onclick="goTo('database')" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--color-text-secondary);font-family:var(--font-sans);padding:0;display:inline-flex;align-items:center;gap:3px">
          View all <i class="ti ti-arrow-up-right" style="font-size:12px" aria-hidden="true"></i>
        </button>
      </div>
      <div style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);display:flex;margin-bottom:24px;box-shadow: 0 2px 8px var(--color-shadow)">
        <div class="tap" onclick="goTo('productivity')" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 8px;border-radius:var(--border-radius-lg) 0 0 var(--border-radius-lg)">
          <div id="ring-prod-container" style="display:flex;justify-content:center;align-items:center;width:100px;height:100px;">
            ${ring(totals.prod, 100, 86, 6, 'var(--color-text-primary)')}
          </div>
          <div style="font-size:10px;font-weight:600;color:var(--color-text-secondary);letter-spacing:0.07em;text-transform:uppercase">Productivity</div>
        </div>
        <div style="width:0.5px;background:var(--color-border-tertiary);margin:12px 0"></div>
        <div class="tap" onclick="goTo('health')" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 8px;border-radius:0 var(--border-radius-lg) var(--border-radius-lg) 0">
          <div id="ring-health-container" style="display:flex;justify-content:center;align-items:center;width:100px;height:100px;">
            ${ring(totals.health, 100, 86, 6, 'var(--color-text-secondary)')}
          </div>
          <div style="font-size:10px;font-weight:600;color:var(--color-text-secondary);letter-spacing:0.07em;text-transform:uppercase">Health</div>
        </div>
      </div>
    </div>
    
    <div class="f4" style="margin-bottom:24px">
      ${shdr('Tasks', "addR('task')")}
      <div style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;box-shadow: 0 2px 8px var(--color-shadow)">
        <div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:var(--color-background-secondary);border-bottom:0.5px solid var(--color-border-tertiary)">
          <span style="flex:1;font-size:10px;font-weight:600;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.07em">Task</span>
          <span style="width:54px;flex-shrink:0;font-size:10px;font-weight:600;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.07em">Priority</span>
          <span style="width:52px;flex-shrink:0;font-size:10px;font-weight:600;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.07em;text-align:center">Deadline</span>
          <span style="width:18px;flex-shrink:0"></span>
        </div>
        <div id="task-list-container">
          ${tRows}${tEmpty}
        </div>
      </div>
    </div>
    
    <!-- Weekly Habit Grid Matrix -->
    ${matrixHtml}
    
    <!-- The Void Folders Grid -->
    ${voidFoldersHtml}
    
    <!-- Reminders / Notifiers -->
    ${notifierHtml}
    
  </div>`;
}


function renderProd() {
  const sIds = new Set(SB.map(x => x.id)), fIds = new Set(FB.map(x => x.id));
  const sR = si().map(i => irow(i, !!S.pc[i.id], 'prod', !sIds.has(i.id), 'study')).join('');
  const fR = fi().map(i => irow(i, !!S.pc[i.id], 'prod', !fIds.has(i.id), 'fun')).join('');
  
  const consoleHtml = `
    <div style="margin-top:28px;border-top:0.5px solid var(--color-border-tertiary);padding-top:20px">
      <div style="font-size:10px;font-weight:600;color:var(--color-text-tertiary);letter-spacing:0.09em;text-transform:uppercase;margin-bottom:8px">Weights Console</div>
      <div style="background:#121212;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);padding:10px 12px;font-family:'Silkscreen',monospace;box-shadow:inset 0 1px 4px rgba(0,0,0,0.6)">
        <div style="display:flex;align-items:center;gap:6px;font-size:10px;color:#00ff00;margin-bottom:6px">
          <span>$ kwig --configure-weights</span>
        </div>
        <textarea onchange="window.saveConsoleWeights('prod', this.value)" 
                  style="width:100%;height:48px;background:transparent;border:none;outline:none;color:#ffffff;font-family:'Silkscreen',monospace;font-size:9px;line-height:1.4;resize:none;box-sizing:border-box;padding:0;margin:0"
                  placeholder="e.g. math(3) + python(2)">${S.prodFormula}</textarea>
        <div style="font-size:8px;color:#888888;text-align:right;margin-top:4px">Edit weights & focus out to save</div>
      </div>
    </div>
  `;

  return `<div class="pg" style="padding:20px 0 20px">
    <button class="back-btn" onclick="goTo('home')">
      <i class="ti ti-arrow-left" style="font-size:15px" aria-hidden="true"></i>Back
    </button>
    <div style="font-size:24px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-serif);margin:18px 0 4px">Productivity</div>
    <div style="font-size:12px;color:var(--color-text-tertiary);margin-bottom:28px">${DS}</div>
    
    ${shdr('Study', "addR('study')")}
    <div id="study-list-container" style="border-top:0.5px solid var(--color-border-tertiary);margin-bottom:28px">
      ${sR}
    </div>
    
    ${shdr('Fun', "addR('fun')", '28px')}
    <div id="fun-list-container" style="border-top:0.5px solid var(--color-border-tertiary)">
      ${fR}
    </div>
    ${consoleHtml}
  </div>`;
}

function renderHealth() {
  const hIds = new Set(HB.map(x => x.id));
  const hR = hi().map(i => irow(i, !!S.hc[i.id], 'health', !hIds.has(i.id), 'health')).join('');
  
  // Water Level Slider UI
  const wLvl = S.hc.water_level !== undefined ? S.hc.water_level : 1.0;
  const waterSliderHtml = `<div class="range-container" style="margin-top: 24px">
    <div class="range-label-container">
      <span class="range-title"><i class="ti ti-drop-circle" style="color:var(--color-accent-blue)"></i> Water Intake Scale</span>
      <span class="range-value" id="water-slider-value">${wLvl.toFixed(1)} L</span>
    </div>
    <input type="range" class="range-slider" min="1" max="4" step="0.5" value="${wLvl}" oninput="window.updateWaterSlider(this.value)">
    <div class="scale-ticks">
      <span class="scale-tick">1L</span>
      <span class="scale-tick">1.5</span>
      <span class="scale-tick">2L</span>
      <span class="scale-tick">2.5</span>
      <span class="scale-tick">3L</span>
      <span class="scale-tick">3.5</span>
      <span class="scale-tick">4L</span>
    </div>
  </div>`;
  
  // Consciousness Meter Slider UI
  const cLvl = S.hc.conscious_level !== undefined ? S.hc.conscious_level : 4;
  const cText = cLvl <= 2 ? "Low 😴" : cLvl <= 4 ? "Decent 🙂" : "High 🧠";
  const consciousSliderHtml = `<div class="range-container" style="margin-top: 32px; border-top: 0.5px solid var(--color-border-tertiary); padding-top: 20px">
    <div class="range-label-container">
      <span class="range-title"><i class="ti ti-brain" style="color:var(--color-accent-orange)"></i> Conscious Meter</span>
      <span class="range-value" id="conscious-slider-value" style="color:${cLvl <= 2 ? 'var(--color-accent-red)' : cLvl <= 4 ? 'var(--color-accent-orange)' : 'var(--color-accent-green)'}">${cLvl} - ${cText}</span>
    </div>
    <input type="range" class="range-slider" min="1" max="6" step="1" value="${cLvl}" oninput="window.updateConsciousSlider(this.value)">
    <div class="scale-ticks">
      <span class="scale-tick">1 (Low)</span>
      <span class="scale-tick">2</span>
      <span class="scale-tick">3</span>
      <span class="scale-tick">4 (Decent)</span>
      <span class="scale-tick">5</span>
      <span class="scale-tick">6 (High)</span>
    </div>
  </div>`;

  const consoleHtml = `
    <div style="margin-top:28px;border-top:0.5px solid var(--color-border-tertiary);padding-top:20px">
      <div style="font-size:10px;font-weight:600;color:var(--color-text-tertiary);letter-spacing:0.09em;text-transform:uppercase;margin-bottom:8px">Weights Console</div>
      <div style="background:#121212;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);padding:10px 12px;font-family:'Silkscreen',monospace;box-shadow:inset 0 1px 4px rgba(0,0,0,0.6)">
        <div style="display:flex;align-items:center;gap:6px;font-size:10px;color:#00ff00;margin-bottom:6px">
          <span>$ kwig --configure-weights</span>
        </div>
        <textarea onchange="window.saveConsoleWeights('health', this.value)" 
                  style="width:100%;height:48px;background:transparent;border:none;outline:none;color:#ffffff;font-family:'Silkscreen',monospace;font-size:9px;line-height:1.4;resize:none;box-sizing:border-box;padding:0;margin:0"
                  placeholder="e.g. water(3) + gym(2)">${S.healthFormula}</textarea>
        <div style="font-size:8px;color:#888888;text-align:right;margin-top:4px">Edit weights & focus out to save</div>
      </div>
    </div>
  `;

  return `<div class="pg" style="padding:20px 0 20px">
    <button class="back-btn" onclick="goTo('home')">
      <i class="ti ti-arrow-left" style="font-size:15px" aria-hidden="true"></i>Back
    </button>
    <div style="font-size:24px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-serif);margin:18px 0 4px">Health</div>
    <div style="font-size:12px;color:var(--color-text-tertiary);margin-bottom:28px">${DS}</div>
    
    ${shdr('Daily habits', "addR('health')")}
    <div id="health-list-container" style="border-top:0.5px solid var(--color-border-tertiary)">
      ${hR}
    </div>
    
    <!-- Water Intake Scale -->
    ${waterSliderHtml}
    
    <!-- Consciousness Scale -->
    ${consciousSliderHtml}
    ${consoleHtml}
  </div>`;
}

function renderDb() {
  if (!S.db) {
    return `<div class="pg" style="padding:20px 0 20px">
      <button class="back-btn" onclick="goTo('home')">
        <i class="ti ti-arrow-left" style="font-size:15px" aria-hidden="true"></i>Back
      </button>
      <div style="font-size:24px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-serif);margin:18px 0 24px">Database</div>
      <div style="text-align:center;padding:32px;color:var(--color-text-tertiary);font-size:13px">Loading history...</div>
    </div>`;
  }
  
  const rows = S.db.map(d => `<tr class="dbr cr" data-del-type="db_row" data-del-id="${d.dateKey}" data-del-name="${d.fd}" style="${d.isToday ? 'background:var(--color-background-secondary);' : ''}">
    <td style="padding:11px 4px 11px 12px;font-size:12px;color:${d.isToday ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'};font-weight:${d.isToday ? 600 : 400}">${d.fd}</td>
    <td style="padding:11px 4px;text-align:center"><span style="font-size:11px;font-weight:600;color:${pc(d.study)}">${d.study}%</span></td>
    <td style="padding:11px 4px;text-align:center"><span style="font-size:11px;font-weight:600;color:${pc(d.fun)}">${d.fun}%</span></td>
    <td style="padding:11px 4px;text-align:center"><span style="font-size:11px;font-weight:600;color:${pc(d.health)}">${d.health}%</span></td>
    <td style="padding:11px 12px 11px 4px;text-align:center;font-size:11px;color:var(--color-text-secondary)">${d.tTotal > 0 ? d.tDone + '/' + d.tTotal : '—'}</td>
  </tr>`).join('');

  const filterDesc = S.dbFilter === 'weekly' ? 'last 7 days' : S.dbFilter === 'monthly' ? 'last 30 days' : 'all time';

  return `<div class="pg" style="padding:20px 0 20px">
    <button class="back-btn" onclick="goTo('home')">
      <i class="ti ti-arrow-left" style="font-size:15px" aria-hidden="true"></i>Back
    </button>
    <div style="display:flex;align-items:center;justify-content:space-between;margin:18px 0 10px">
      <div style="font-size:24px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-serif)">Database</div>
      <div style="display:flex;align-items:center;gap:8px">
        <button onclick="window.resetPreviousData()" style="font-size:11px;border:0.5px solid var(--color-accent-red);border-radius:6px;padding:4px 8px;background:transparent;color:var(--color-accent-red);font-family:var(--font-sans);cursor:pointer;display:inline-flex;align-items:center;gap:3px">
          <i class="ti ti-trash-x" style="font-size:12px"></i> Reset All
        </button>
        <select onchange="window.changeDbFilter(this.value)" style="font-size:11px;border:0.5px solid var(--color-border-secondary);border-radius:6px;padding:4px 6px;background:var(--color-background-primary);color:var(--color-text-primary);font-family:var(--font-sans);outline:none;cursor:pointer">
          <option value="weekly" ${S.dbFilter === 'weekly' ? 'selected' : ''}>Weekly</option>
          <option value="monthly" ${S.dbFilter === 'monthly' ? 'selected' : ''}>Monthly</option>
          <option value="all" ${S.dbFilter === 'all' ? 'selected' : ''}>All</option>
        </select>
      </div>
    </div>
    <div id="db-desc-text" style="font-size:12px;color:var(--color-text-tertiary);margin-bottom:24px">${S.db.length} day${S.db.length !== 1 ? 's' : ''} shown &nbsp;&middot;&nbsp; ${filterDesc}</div>
    
    <div style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;box-shadow: 0 2px 8px var(--color-shadow)">
      <table style="width:100%;border-collapse:collapse;table-layout:fixed">
        <colgroup>
          <col style="width:36%">
          <col style="width:14%">
          <col style="width:14%">
          <col style="width:14%">
          <col style="width:22%">
        </colgroup>
        <thead>
          <tr style="background:var(--color-background-secondary);border-bottom:0.5px solid var(--color-border-secondary)">
            <th style="padding:10px 4px 10px 12px;font-size:10px;font-weight:600;color:var(--color-text-tertiary);text-align:left;text-transform:uppercase;letter-spacing:0.07em">Date</th>
            <th style="padding:10px 4px;font-size:10px;font-weight:600;color:var(--color-text-tertiary);text-align:center;text-transform:uppercase;letter-spacing:0.07em">Study</th>
            <th style="padding:10px 4px;font-size:10px;font-weight:600;color:var(--color-text-tertiary);text-align:center;text-transform:uppercase;letter-spacing:0.07em">Fun</th>
            <th style="padding:10px 4px;font-size:10px;font-weight:600;color:var(--color-text-tertiary);text-align:center;text-transform:uppercase;letter-spacing:0.07em">Health</th>
            <th style="padding:10px 12px 10px 4px;font-size:10px;font-weight:600;color:var(--color-text-tertiary);text-align:center;text-transform:uppercase;letter-spacing:0.07em">Tasks</th>
          </tr>
        </thead>
        <tbody id="db-tbody">${rows}</tbody>
      </table>
    </div>
  </div>`;
}

// "The Void" - Notes Manager Page
function renderNotes() {
  const folders = S.folders || [];
  const pages = S.pages || [];
  
  // Render each folder block
  const folderHtmlList = folders.map(f => {
    const fPages = pages.filter(p => p.folderId === f.id);
    const pageRows = fPages.map(p => `
      <div class="notes-tr" style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-bottom:0.5px solid var(--color-border-tertiary); cursor:pointer;" onclick="window.openPage('${p.id}')">
        <div style="display:flex; align-items:center; gap:6px; font-size:13px; color:var(--color-text-primary)">
          <i class="ti ti-file-text" style="color:var(--color-text-secondary); font-size:15px;"></i>
          <span>${p.name || 'Untitled'}</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:11px; color:var(--color-text-tertiary);">${p.date}</span>
          <button class="notes-delete-btn" style="background:none; border:none; color:var(--color-accent-red); cursor:pointer; padding:4px;" onclick="event.stopPropagation(); window.confirmDeletePage('${p.id}', '${p.name.replace(/'/g, "\\'")}')" aria-label="Delete note">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
    
    const pagesEmpty = fPages.length === 0 
      ? `<div style="padding:16px; text-align:center; font-size:12px; color:var(--color-text-tertiary); font-style:italic;">Empty folder</div>` 
      : pageRows;

    return `
      <div id="notes-folder-block-${f.id}" style="background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-lg); padding: 12px 14px; margin-bottom: 16px; box-shadow: 0 2px 8px var(--color-shadow)">

        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <i class="ti ti-folder" style="font-size: 20px; color: var(--color-accent-blue);"></i>
            <span style="font-size: 15px; font-weight: 600; color: var(--color-text-primary);">${f.name}</span>
            <span style="font-size: 11px; color: var(--color-text-tertiary);">(${fPages.length})</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button class="add-btn" style="padding: 4px 8px; font-size: 11px;" onclick="window.createNewPage('${f.id}')">+ New Page</button>
            <button style="background:none; border:none; color:var(--color-accent-red); cursor:pointer; padding:4px; display:inline-flex; align-items:center;" onclick="window.deleteFolder('${f.id}')" title="Delete Folder">
              <i class="ti ti-trash" style="font-size:16px;"></i>
            </button>
          </div>
        </div>
        <div style="background:var(--color-background-secondary); border-radius:var(--border-radius-md); overflow:hidden;">
          ${pagesEmpty}
        </div>
      </div>
    `;
  }).join('');
  
  // Render root pages block
  const rootPages = pages.filter(p => !p.folderId);
  const rootPageRows = rootPages.map(p => `
    <div class="notes-tr" style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-bottom:0.5px solid var(--color-border-tertiary); cursor:pointer;" onclick="window.openPage('${p.id}')">
      <div style="display:flex; align-items:center; gap:6px; font-size:13px; color:var(--color-text-primary)">
        <i class="ti ti-file-text" style="color:var(--color-text-secondary); font-size:15px;"></i>
        <span>${p.name || 'Untitled'}</span>
      </div>
      <div style="display:flex; align-items:center; gap:12px;">
        <span style="font-size:11px; color:var(--color-text-tertiary);">${p.date}</span>
        <button class="notes-delete-btn" style="background:none; border:none; color:var(--color-accent-red); cursor:pointer; padding:4px;" onclick="event.stopPropagation(); window.confirmDeletePage('${p.id}', '${p.name.replace(/'/g, "\\'")}')" aria-label="Delete note">
          <i class="ti ti-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
  
  const rootEmpty = rootPages.length === 0 
    ? `<div style="padding:16px; text-align:center; font-size:12px; color:var(--color-text-tertiary); font-style:italic;">No root-level pages</div>` 
    : rootPageRows;
    
  const rootHtml = `
    <div style="background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-lg); padding: 12px 14px; box-shadow: 0 2px 8px var(--color-shadow); margin-bottom:16px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="ti ti-file-text" style="font-size: 18px; color: var(--color-text-secondary);"></i>
          <span style="font-size: 15px; font-weight: 600; color: var(--color-text-primary);">Root Pages</span>
          <span style="font-size: 11px; color: var(--color-text-tertiary);">(${rootPages.length})</span>
        </div>
        <button class="add-btn" style="padding: 4px 8px; font-size: 11px;" onclick="window.createNewPage(null)">+ New Page</button>
      </div>
      <div style="background:var(--color-background-secondary); border-radius:var(--border-radius-md); overflow:hidden;">
        ${rootEmpty}
      </div>
    </div>
  `;
  
  const emptyBlock = `<div id="notes-empty-message" style="padding:48px 0; text-align:center; color:var(--color-text-tertiary); background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-lg); box-shadow:0 2px 8px var(--color-shadow); ${(folders.length === 0 && pages.length === 0) ? '' : 'display:none;'}">
    <i class="ti ti-notebook" style="font-size: 32px; margin-bottom: 12px; display:block;" aria-hidden="true"></i>
    <div style="font-size: 14px; font-weight: 500;">No folders or pages found</div>
    <div style="font-size: 11px; margin-top: 4px;">Click the buttons below to create your directory structure</div>
  </div>`;

  return `<div class="pg" style="padding:20px 0 20px">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 24px;">
      <div>
        <div style="font-size:24px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-serif)">The Void</div>
        <div style="font-size:12px;color:var(--color-text-tertiary);margin-top:2px;">Your personal thought canvas</div>
      </div>
      <div style="display:flex; gap: 8px;">
        <button class="add-btn" onclick="window.createFolder()">+ Add Folder</button>
        <button class="add-btn" onclick="window.createNewPage()">+ New Page</button>
      </div>
    </div>
    
    <div id="notes-list-wrapper">
      ${emptyBlock}
      <div id="notes-items-container">
        ${folderHtmlList}${rootHtml}
      </div>
    </div>
  </div>`;
}

// "The Void" - Notes Editor Page
function renderEditor() {
  const page = S.pages.find(p => p.id === S.activePageId);
  if (!page) return `<div class="pg">Page not found</div>`;
  
  return `<div class="pg" style="padding:20px 0 20px">
    <div class="editor-actions">
      <button class="back-btn" onclick="window.goTo('notes')">
        <i class="ti ti-arrow-left" aria-hidden="true"></i> The Void
      </button>
      <div style="display:flex; gap: 8px;">
        <button class="editor-btn" onclick="window.triggerImageImport()">
          <i class="ti ti-photo-plus" aria-hidden="true"></i> Import
        </button>
        <button class="editor-btn" onclick="window.triggerPasteClipboard()">
          <i class="ti ti-clipboard" aria-hidden="true"></i> Paste
        </button>
      </div>
    </div>
    
    <input type="text" class="editor-title-input" id="editor-title" value="${page.name || ''}" placeholder="Untitled" oninput="window.updatePageTitle(this.value)">
    
    <div class="editor-content-area" id="editor-content" contenteditable="true" onblur="window.saveEditorContent()" oninput="window.saveEditorContent()">${page.content || ''}</div>
  </div>`;
}

function renderPrinciples() {
  const listHtml = S.principles.map((pr, idx) => `
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);padding:10px 12px;">
      <textarea oninput="window.updatePrinciple(${idx}, this.value)" 
                style="flex:1;background:transparent;border:none;outline:none;color:var(--color-text-primary);font-family:var(--font-sans);font-size:13px;line-height:1.5;resize:none;height:48px;padding:0;margin:0;"
                placeholder="Enter principle...">${pr}</textarea>
      <button onclick="window.deletePrinciple(${idx})" 
              style="background:none;border:none;color:var(--color-accent-red);cursor:pointer;padding:4px;display:flex;align-items:center;justify-content:center;outline:none;" 
              title="Delete Principle">
        <i class="ti ti-trash" style="font-size:16px;"></i>
      </button>
    </div>
  `).join('');

  const empty = S.principles.length === 0 ? `
    <div style="padding:48px 0; text-align:center; color:var(--color-text-tertiary); font-family:var(--font-sans); font-size:12px;">
      No principles found.<br>Click the button below to add one.
    </div>
  ` : listHtml;

  return `<div class="pg" style="padding:20px 0 20px">
    <button class="back-btn" onclick="goTo('home')">
      <i class="ti ti-arrow-left" style="font-size:15px" aria-hidden="true"></i>Back
    </button>
    
    <div style="display:flex; align-items:center; justify-content:space-between; margin:18px 0 16px;">
      <div>
        <div style="font-size:20px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-serif)">Principles</div>
        <div style="font-size:11px;color:var(--color-text-tertiary);margin-top:2px;">Your personal life compass</div>
      </div>
      <button class="add-btn" onclick="window.addPrinciple()" style="font-family:var(--font-sans); font-size:11px; padding: 4px 8px;">+ Add Principle</button>
    </div>
    
    <div style="margin-top:10px;">
      ${empty}
    </div>
  </div>`;
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;
  
  // Highlight active sidebar links
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  if (S.page === 'home') document.getElementById('sb-home')?.classList.add('active');
  else if (S.page === 'database') document.getElementById('sb-db')?.classList.add('active');
  else if (S.page === 'notes' || S.page === 'editor') document.getElementById('sb-void-mgr')?.classList.add('active');
  else if (S.page === 'workout' || S.page === 'workout_db') document.getElementById('sb-workout')?.classList.add('active');
  else if (S.page === 'calendar') document.getElementById('sb-calendar')?.classList.add('active');
  
  if (S.page === 'home') app.innerHTML = renderHome();
  else if (S.page === 'productivity') app.innerHTML = renderProd();
  else if (S.page === 'health') app.innerHTML = renderHealth();
  else if (S.page === 'database') app.innerHTML = renderDb();
  else if (S.page === 'notes') app.innerHTML = renderNotes();
  else if (S.page === 'editor') app.innerHTML = renderEditor();
  else if (S.page === 'principles') app.innerHTML = renderPrinciples();
  else if (S.page === 'workout') app.innerHTML = renderWorkout();
  else if (S.page === 'workout_db') app.innerHTML = renderWorkoutDb();
  else if (S.page === 'calendar') app.innerHTML = renderCalendar();
}

window.updatePrinciple = (idx, val) => {
  S.principles[idx] = val;
  sv('kwig_principles', S.principles);
};

window.deletePrinciple = (idx) => {
  S.principles.splice(idx, 1);
  sv('kwig_principles', S.principles);
  render();
};

window.addPrinciple = () => {
  S.principles.push("");
  sv('kwig_principles', S.principles);
  render();
};

let principleHoldTimer = null;
let principleHoldTriggered = false;
let pStartX = 0, pStartY = 0;

window.handlePrinciplePointerStart = (e) => {
  principleHoldTriggered = false;
  const touch = e.touches ? e.touches[0] : e;
  pStartX = touch.clientX;
  pStartY = touch.clientY;
  
  if (window.getSelection) {
    window.getSelection().removeAllRanges();
  }
  
  if (principleHoldTimer) clearTimeout(principleHoldTimer);
  principleHoldTimer = setTimeout(() => {
    principleHoldTriggered = true;
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    window.goTo('principles');
  }, 600);
};

window.handlePrinciplePointerMove = (e) => {
  if (!principleHoldTimer) return;
  const touch = e.touches ? e.touches[0] : e;
  const diffX = Math.abs(touch.clientX - pStartX);
  const diffY = Math.abs(touch.clientY - pStartY);
  if (diffX > 10 || diffY > 10) {
    window.handlePrinciplePointerEnd();
  }
};

window.handlePrinciplePointerEnd = () => {
  if (principleHoldTimer) {
    clearTimeout(principleHoldTimer);
    principleHoldTimer = null;
  }
};

window.handlePrincipleClick = (e) => {
  if (window.getSelection) {
    window.getSelection().removeAllRanges();
  }
  if (principleHoldTriggered) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    principleHoldTriggered = false;
    return;
  }
  window.cyclePrinciple(e);
};

window.cyclePrinciple = (e) => {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const principlesCount = S.principles ? S.principles.length : 0;
  if (principlesCount > 1) {
    if (S.activePrincipleIndex === undefined || S.activePrincipleIndex === null || S.activePrincipleIndex >= principlesCount) {
      const dayOfYear = Math.floor((_t - new Date(_t.getFullYear(), 0, 0)) / 86400000);
      S.activePrincipleIndex = dayOfYear % principlesCount;
    }
    S.activePrincipleIndex = (S.activePrincipleIndex + 1) % principlesCount;
    
    const displayPrinciple = S.principles[S.activePrincipleIndex].trim() || "Empty principle. Click to cycle, hold to edit...";
    const fraction = `${S.activePrincipleIndex + 1}/${principlesCount}`;
    
    const ttEl = document.getElementById('tt');
    const thEl = document.getElementById('th');
    if (ttEl && thEl) {
      ttEl.innerHTML = `&ldquo;${displayPrinciple}&rdquo;`;
      thEl.textContent = fraction;
    } else {
      render();
    }
  }
};

window.goTo = (p, skipHistory = false) => {
  const bubble = document.getElementById('image-control-bubble');
  if (bubble) bubble.style.display = 'none';

  if (!skipHistory && S.page !== p) {
    S.history.push(S.page);
  }

  S.page = p;
  S.as = null;
  render();
  if (p === 'database') {
    S.db = null;
    render();
    loadDb().then(() => render());
  }
};

window.nxt = () => {
  S.ti = (S.ti + 1) % THOUGHTS.length;
  const el = document.getElementById('tt'), h = document.getElementById('th');
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(5px)';
    el.style.transition = 'opacity 0.15s, transform 0.15s';
    setTimeout(() => {
      el.innerHTML = `&ldquo;${THOUGHTS[S.ti]}&rdquo;`;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      if (h) h.textContent = `${S.ti + 1}/${THOUGHTS.length} · tap for next`;
    }, 150);
  }
};

window.togI = (id, type) => {
  const isCh = type === 'prod' ? !S.pc[id] : !S.hc[id];
  if (type === 'prod') {
    S.pc[id] = isCh;
    sv(`prod-${TK}`, S.pc);
  } else {
    S.hc[id] = isCh;
    sv(`health-${TK}`, S.hc);
  }
  updWd();
  
  const rowEl = document.getElementById(`habit-row-${id}`);
  if (rowEl) {
    const textEl = rowEl.children[0];
    const checkboxEl = rowEl.children[1];
    if (textEl && checkboxEl) {
      textEl.style.color = isCh ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)';
      textEl.style.textDecoration = isCh ? 'line-through' : 'none';
      checkboxEl.innerHTML = cbx(isCh);
    }
  } else {
    render();
  }
};

window.togWeeklyHabit = async (habitId, dateKey, type) => {
  if (!S.weeklyHabitStates[dateKey]) {
    S.weeklyHabitStates[dateKey] = { prod: {}, health: {} };
  }
  const isCh = !S.weeklyHabitStates[dateKey][type][habitId];
  S.weeklyHabitStates[dateKey][type][habitId] = isCh;
  await sv(`${type}-${dateKey}`, S.weeklyHabitStates[dateKey][type]);
  
  if (dateKey === TK) {
    if (type === 'prod') {
      S.pc[habitId] = isCh;
    } else {
      S.hc[habitId] = isCh;
    }
  }
  
  const checkEl = document.getElementById(`wm-check-${habitId}-${dateKey}`);
  if (checkEl) {
    let color = 'var(--color-accent-blue)';
    const category = type === 'prod' ? (si().some(x => x.id === habitId) ? 'Study' : 'Fun') : 'Health';
    if (category === 'Fun') color = 'var(--color-accent-orange)';
    if (category === 'Health') color = 'var(--color-accent-green)';
    
    checkEl.style.borderColor = isCh ? color : 'var(--color-border-secondary)';
    checkEl.style.backgroundColor = isCh ? color : 'transparent';
    checkEl.innerHTML = isCh ? `<i class="ti ti-check" style="font-size:9px;color:var(--color-background-primary);font-weight:bold"></i>` : '';
  }

  await loadWd();
  await loadDb();
  
  const totals = getHabitTotals(S.pc, S.hc);
  
  const ringProdCont = document.getElementById('ring-prod-container');
  if (ringProdCont) {
    ringProdCont.innerHTML = ring(totals.prod, 100, 86, 6, 'var(--color-text-primary)');
  }
  
  const ringHealthCont = document.getElementById('ring-health-container');
  if (ringHealthCont) {
    ringHealthCont.innerHTML = ring(totals.health, 100, 86, 6, 'var(--color-text-secondary)');
  }
};

function getHabitIcon(id, category) {
  if (S.habitIcons && S.habitIcons[id]) {
    return S.habitIcons[id];
  }
  const mapping = {
    linear_algebra: 'ti ti-math-symbols',
    statistics: 'ti ti-chart-bar',
    python: 'ti ti-brand-python',
    project: 'ti ti-rocket',
    book_reading: 'ti ti-book',
    fl_studio: 'ti ti-music',
    speaking: 'ti ti-microphone',
    water: 'ti ti-droplet',
    gym: 'ti ti-barbell',
    running: 'ti ti-run',
    food: 'ti ti-apple',
    meditation: 'ti ti-brain',
    water_meter: 'ti ti-droplet',
    conscious_meter: 'ti ti-brain'
  };
  if (mapping[id]) return mapping[id];
  if (category === 'Study') return 'ti ti-notebook';
  if (category === 'Fun') return 'ti ti-sparkles';
  return 'ti ti-heart';
}


window.togT = id => {
  const t = S.tasks.find(x => x.id === id);
  if (t) {
    t.done = !t.done;
    sv(`tasks-${TK}`, S.tasks);
    
    const rowEl = document.getElementById(`task-row-${id}`);
    if (rowEl) {
      const textEl = rowEl.children[0];
      const checkboxEl = rowEl.children[3];
      if (textEl && checkboxEl) {
        textEl.style.color = t.done ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)';
        textEl.style.textDecoration = t.done ? 'line-through' : 'none';
        checkboxEl.innerHTML = cbx(t.done);
      }
      
      const dlEl = rowEl.children[2];
      if (dlEl) {
        const od = t.deadline && t.deadline < tiso() && !t.done;
        dlEl.style.color = od ? 'var(--color-accent-red)' : 'var(--color-text-secondary)';
      }
    } else {
      render();
    }
  }
};

window.cycP = id => {
  const t = S.tasks.find(x => x.id === id);
  if (!t) return;
  const o = ['High', 'Medium', 'Low'];
  t.priority = o[(o.indexOf(t.priority || 'Medium') + 1) % 3];
  sv(`tasks-${TK}`, S.tasks);
  
  const rowEl = document.getElementById(`task-row-${id}`);
  if (rowEl) {
    const priEl = rowEl.children[1];
    if (priEl) {
      priEl.innerHTML = pri(t.priority);
    }
  } else {
    render();
  }
};

window.addR = sec => {
  if (sec === 'task') {
    if (document.getElementById('ni-task-container')) {
      const el = document.getElementById('ni-task');
      if (el) el.focus();
      return;
    }
    const tEmptyEl = document.getElementById('task-list-empty');
    if (tEmptyEl) {
      tEmptyEl.style.display = 'none';
    }
    const formDiv = document.createElement('div');
    formDiv.id = 'ni-task-container';
    formDiv.style.cssText = "padding:12px;border-top:0.5px solid var(--color-border-tertiary);background:var(--color-background-secondary);border-radius:var(--border-radius-md);margin-top:8px";
    formDiv.innerHTML = `
      <input id="ni-task" type="text" placeholder="Task name..." style="width:100%;font-size:14px;border:none;background:transparent;color:var(--color-text-primary);margin-bottom:8px;font-family:var(--font-sans);box-sizing:border-box" onkeydown="if(event.key==='Enter')window.confT();if(event.key==='Escape')window.cancelTaskForm()">
      <div style="display:flex;align-items:center;gap:7px">
        <select id="ni-pri" style="font-size:12px;border:0.5px solid var(--color-border-secondary);border-radius:4px;padding:4px 6px;background:var(--color-background-primary);color:var(--color-text-primary);font-family:var(--font-sans);cursor:pointer">
          <option>High</option>
          <option selected>Medium</option>
          <option>Low</option>
        </select>
        <input id="ni-dl" type="date" style="flex:1;font-size:12px;border:0.5px solid var(--color-border-secondary);border-radius:4px;padding:4px 6px;background:var(--color-background-primary);color:var(--color-text-primary);font-family:var(--font-sans)">
        <button onclick="window.cancelTaskForm()" style="background:none;border:0.5px solid var(--color-border-secondary);border-radius:4px;padding:4px 8px;font-size:12px;color:var(--color-text-secondary);cursor:pointer;font-family:var(--font-sans)">Cancel</button>
        <button onclick="window.confT()" style="background:var(--color-text-primary);border:none;border-radius:4px;padding:4px 10px;font-size:12px;color:var(--color-background-primary);cursor:pointer;font-family:var(--font-sans);font-weight:500">Add</button>
      </div>
    `;
    const container = document.getElementById('task-list-container');
    if (container) {
      container.appendChild(formDiv);
    }
    setTimeout(() => {
      const el = document.getElementById('ni-task');
      if (el) el.focus();
    }, 60);
  } else {
    if (document.getElementById(`ni-${sec}-container`)) {
      const el = document.getElementById(`ni-${sec}`);
      if (el) el.focus();
      return;
    }
    const formDiv = document.createElement('div');
    formDiv.id = `ni-${sec}-container`;
    formDiv.style.cssText = "display:flex;align-items:center;gap:8px;padding:11px 0;border-bottom:0.5px solid var(--color-border-tertiary)";
    formDiv.innerHTML = `
      <input id="ni-${sec}" type="text" placeholder="Add item..." style="flex:1;font-size:14px;border:none;background:transparent;color:var(--color-text-primary);font-family:var(--font-sans)" onkeydown="if(event.key==='Enter')window.confI('${sec}');if(event.key==='Escape')window.cancelHabitForm('${sec}')">
      <button onclick="window.confI('${sec}')" style="background:var(--color-text-primary);border:none;border-radius:4px;padding:4px 10px;font-size:12px;color:var(--color-background-primary);cursor:pointer;font-family:var(--font-sans);font-weight:500">Add</button>
      <button onclick="window.cancelHabitForm('${sec}')" style="background:none;border:0.5px solid var(--color-border-secondary);border-radius:4px;padding:4px 8px;font-size:12px;color:var(--color-text-secondary);cursor:pointer;font-family:var(--font-sans)">×</button>
    `;
    const container = document.getElementById(`${sec}-list-container`);
    if (container) {
      container.appendChild(formDiv);
    }
    setTimeout(() => {
      const el = document.getElementById(`ni-${sec}`);
      if (el) el.focus();
    }, 60);
  }
};

window.cancelTaskForm = () => {
  const formDiv = document.getElementById('ni-task-container');
  if (formDiv) formDiv.remove();
  if (!S.tasks || S.tasks.length === 0) {
    const tEmptyEl = document.getElementById('task-list-empty');
    if (tEmptyEl) {
      tEmptyEl.style.display = 'block';
    }
  }
};

window.cancelHabitForm = sec => {
  const formDiv = document.getElementById(`ni-${sec}-container`);
  if (formDiv) formDiv.remove();
};

window.cancelA = () => {
  window.cancelTaskForm();
  window.cancelHabitForm('study');
  window.cancelHabitForm('fun');
  window.cancelHabitForm('health');
  window.cancelFolderForm();
  S.as = null;
};

window.confI = sec => {
  const el = document.getElementById(`ni-${sec}`);
  if (!el) return;
  const label = el.value.trim();
  if (!label) {
    cancelA();
    return;
  }
  const item = { id: uid(), label };
  const clean = cleanNameForFormula(label);
  
  if (sec === 'study') {
    S.cs.push(item);
    sv('cs', S.cs);
    if (!S.prodFormula.toLowerCase().includes(clean)) {
      S.prodFormula = S.prodFormula ? `${S.prodFormula} + ${clean}(2)` : `${clean}(2)`;
      sv('prod_formula', S.prodFormula);
    }
  } else if (sec === 'fun') {
    S.cf.push(item);
    sv('cf', S.cf);
    if (!S.prodFormula.toLowerCase().includes(clean)) {
      S.prodFormula = S.prodFormula ? `${S.prodFormula} + ${clean}(2)` : `${clean}(2)`;
      sv('prod_formula', S.prodFormula);
    }
  } else {
    S.ch.push(item);
    sv('ch', S.ch);
    if (!S.healthFormula.toLowerCase().includes(clean)) {
      S.healthFormula = S.healthFormula ? `${S.healthFormula} + ${clean}(2)` : `${clean}(2)`;
      sv('health_formula', S.healthFormula);
    }
  }
  S.as = null;
  render();
};

window.confT = () => {
  const tx = document.getElementById('ni-task');
  if (!tx) return;
  const text = tx.value.trim();
  if (!text) {
    cancelA();
    return;
  }
  const p = (document.getElementById('ni-pri') || { value: 'Medium' }).value,
        dl = (document.getElementById('ni-dl') || { value: '' }).value;
  S.tasks.push({ id: uid(), text, priority: p, deadline: dl, done: false });
  sv(`tasks-${TK}`, S.tasks);
  S.as = null;
  render();
};

window.delC = (sec, id) => {
  if (sec === 'study') S.cs = S.cs.filter(i => i.id !== id);
  else if (sec === 'fun') S.cf = S.cf.filter(i => i.id !== id);
  else S.ch = S.ch.filter(i => i.id !== id);
  
  const arr = sec === 'study' ? S.cs : sec === 'fun' ? S.cf : S.ch;
  const key = sec === 'study' ? 'cs' : sec === 'fun' ? 'cf' : 'ch';
  
  sv(key, arr);
  render();
};

// 6. Sliders Handler functions
window.updateWaterSlider = val => {
  const floatVal = parseFloat(val);
  S.hc.water_level = floatVal;
  sv(`health-${TK}`, S.hc);
  const el = document.getElementById('water-slider-value');
  if (el) el.textContent = `${floatVal.toFixed(1)} L`;
};

window.updateConsciousSlider = val => {
  const intVal = parseInt(val);
  S.hc.conscious_level = intVal;
  sv(`health-${TK}`, S.hc);
  
  const el = document.getElementById('conscious-slider-value');
  if (el) {
    const text = intVal <= 2 ? "Low 😴" : intVal <= 4 ? "Decent 🙂" : "High 🧠";
    el.textContent = `${intVal} - ${text}`;
    el.style.color = intVal <= 2 ? 'var(--color-accent-red)' : intVal <= 4 ? 'var(--color-accent-orange)' : 'var(--color-accent-green)';
  }
};

window.changeWeeklyLevel = async (dateKey, type, value) => {
  if (!S.weeklyHabitStates[dateKey]) {
    S.weeklyHabitStates[dateKey] = { prod: {}, health: {} };
  }
  
  let floatVal = null;
  let intVal = null;
  
  if (type === 'water') {
    floatVal = (value === null || value === 'null') ? null : parseFloat(value);
    if (floatVal === null) {
      delete S.weeklyHabitStates[dateKey].health.water_level;
    } else {
      S.weeklyHabitStates[dateKey].health.water_level = floatVal;
    }
    await sv(`health-${dateKey}`, S.weeklyHabitStates[dateKey].health);
    if (dateKey === TK) {
      if (floatVal === null) {
        delete S.hc.water_level;
      } else {
        S.hc.water_level = floatVal;
      }
      await sv(`health-${TK}`, S.hc);
      const el = document.getElementById('water-slider-value');
      if (el) el.textContent = floatVal !== null ? `${floatVal.toFixed(1)} L` : '1.0 L';
      const slider = document.querySelector('input[oninput*="updateWaterSlider"]');
      if (slider) slider.value = floatVal !== null ? floatVal : 1.0;
    }
  } else if (type === 'conscious') {
    intVal = (value === null || value === 'null') ? null : parseInt(value);
    if (intVal === null) {
      delete S.weeklyHabitStates[dateKey].health.conscious_level;
    } else {
      S.weeklyHabitStates[dateKey].health.conscious_level = intVal;
    }
    await sv(`health-${dateKey}`, S.weeklyHabitStates[dateKey].health);
    if (dateKey === TK) {
      if (intVal === null) {
        delete S.hc.conscious_level;
      } else {
        S.hc.conscious_level = intVal;
      }
      await sv(`health-${TK}`, S.hc);
      const el = document.getElementById('conscious-slider-value');
      if (el) {
        if (intVal !== null) {
          const text = intVal <= 2 ? "Low 😴" : intVal <= 4 ? "Decent 🙂" : "High 🧠";
          el.textContent = `${intVal} - ${text}`;
          el.style.color = intVal <= 2 ? 'var(--color-accent-red)' : intVal <= 4 ? 'var(--color-accent-orange)' : 'var(--color-accent-green)';
        } else {
          el.textContent = '4 - Decent 🙂';
          el.style.color = 'var(--color-accent-orange)';
        }
      }
      const slider = document.querySelector('input[oninput*="updateConsciousSlider"]');
      if (slider) slider.value = intVal !== null ? intVal : 4;
    }
  }
  
  // Synchronous DOM update of dropdown button
  const dropEl = document.getElementById(`wm-drop-${dateKey}-${type}`);
  if (dropEl) {
    if (type === 'water') {
      const display = floatVal !== null 
        ? `${floatVal % 1 === 0 ? floatVal.toFixed(0) + 'L' : floatVal.toFixed(1) + 'L'}&nbsp;<i class="ti ti-chevron-down" style="font-size:8px; opacity:0.5"></i>` 
        : `<i class="ti ti-chevron-down" style="font-size:10px; opacity:0.6"></i>`;
      dropEl.innerHTML = display;
    } else {
      const display = intVal !== null 
        ? `${intVal}&nbsp;<i class="ti ti-chevron-down" style="font-size:8px; opacity:0.5"></i>` 
        : `<i class="ti ti-chevron-down" style="font-size:10px; opacity:0.6"></i>`;
      dropEl.innerHTML = display;
    }
  }
  
  await loadWd();
  await loadDb();
  
  const totals = getHabitTotals(S.pc, S.hc);
  
  const ringProdCont = document.getElementById('ring-prod-container');
  if (ringProdCont) {
    ringProdCont.innerHTML = ring(totals.prod, 100, 86, 6, 'var(--color-text-primary)');
  }
  
  const ringHealthCont = document.getElementById('ring-health-container');
  if (ringHealthCont) {
    ringHealthCont.innerHTML = ring(totals.health, 100, 86, 6, 'var(--color-text-secondary)');
  }
};

window.openWeeklyLevelDropdown = (event, dateKey, type) => {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  window.closeAllWeeklyDropdowns();
  
  const dropdown = document.createElement('div');
  dropdown.className = 'weekly-level-dropdown-popover';
  dropdown.style.cssText = `
    position: absolute;
    background: var(--color-background-primary);
    border: 0.5px solid var(--color-border-secondary);
    border-radius: 6px;
    box-shadow: 0 4px 12px var(--color-shadow);
    z-index: 1000;
    max-height: 200px;
    overflow-y: auto;
    width: 65px;
    padding: 4px 0;
    opacity: 0;
    transform: scale(0.95) translateY(-5px);
    transform-origin: top center;
    transition: opacity 0.15s ease, transform 0.15s ease;
  `;
  
  const hState = S.weeklyHabitStates[dateKey] && S.weeklyHabitStates[dateKey].health ? S.weeklyHabitStates[dateKey].health : {};
  
  let options = [];
  if (type === 'water') {
    const wLvl = hState.water_level;
    const isNoneSelected = wLvl === undefined || wLvl === null;
    const noneHtml = `<div onclick="window.selectWeeklyLevel('${dateKey}', 'water', null)" 
                 style="padding: 6px 8px; font-size: 11px; font-weight: 600; text-align: center; cursor: pointer; color: ${isNoneSelected ? 'var(--color-accent-green)' : 'var(--color-text-tertiary)'}; background: ${isNoneSelected ? 'rgba(37, 184, 148, 0.08)' : 'transparent'}; transition: background 0.1s;"
                 onmouseover="this.style.background='var(--color-background-secondary)'"
                 onmouseout="this.style.background='${isNoneSelected ? 'rgba(37, 184, 148, 0.08)' : 'transparent'}'">
      <i class="ti ti-chevron-down" style="font-size:10px; opacity:0.6"></i>
    </div>`;
    
    options = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0].map(val => {
      const display = val % 1 === 0 ? val.toFixed(0) + 'L' : val.toFixed(1) + 'L';
      const isSelected = wLvl === val;
      return `<div onclick="window.selectWeeklyLevel('${dateKey}', 'water', ${val})" 
                   style="padding: 6px 8px; font-size: 11px; font-weight: 600; text-align: center; cursor: pointer; color: ${isSelected ? 'var(--color-accent-green)' : 'var(--color-text-secondary)'}; background: ${isSelected ? 'rgba(37, 184, 148, 0.08)' : 'transparent'}; transition: background 0.1s;"
                   onmouseover="this.style.background='var(--color-background-secondary)'"
                   onmouseout="this.style.background='${isSelected ? 'rgba(37, 184, 148, 0.08)' : 'transparent'}'">
        ${display}
      </div>`;
    });
    options.unshift(noneHtml);
  } else {
    const cLvl = hState.conscious_level;
    const isNoneSelected = cLvl === undefined || cLvl === null;
    const noneHtml = `<div onclick="window.selectWeeklyLevel('${dateKey}', 'conscious', null)" 
                 style="padding: 6px 8px; font-size: 11px; font-weight: 600; text-align: center; cursor: pointer; color: ${isNoneSelected ? 'var(--color-accent-green)' : 'var(--color-text-tertiary)'}; background: ${isNoneSelected ? 'rgba(37, 184, 148, 0.08)' : 'transparent'}; transition: background 0.1s;"
                 onmouseover="this.style.background='var(--color-background-secondary)'"
                 onmouseout="this.style.background='${isNoneSelected ? 'rgba(37, 184, 148, 0.08)' : 'transparent'}'">
      <i class="ti ti-chevron-down" style="font-size:10px; opacity:0.6"></i>
    </div>`;
    
    options = [1, 2, 3, 4, 5, 6].map(val => {
      const isSelected = cLvl === val;
      return `<div onclick="window.selectWeeklyLevel('${dateKey}', 'conscious', ${val})" 
                   style="padding: 6px 8px; font-size: 11px; font-weight: 600; text-align: center; cursor: pointer; color: ${isSelected ? 'var(--color-accent-green)' : 'var(--color-text-secondary)'}; background: ${isSelected ? 'rgba(37, 184, 148, 0.08)' : 'transparent'}; transition: background 0.1s;"
                   onmouseover="this.style.background='var(--color-background-secondary)'"
                   onmouseout="this.style.background='${isSelected ? 'rgba(37, 184, 148, 0.08)' : 'transparent'}'">
        ${val}
      </div>`;
    });
    options.unshift(noneHtml);
  }
  
  dropdown.innerHTML = options.join('');
  document.body.appendChild(dropdown);
  
  const rect = event.currentTarget.getBoundingClientRect();
  const top = rect.bottom + window.scrollY + 4;
  const left = rect.left + window.scrollX + rect.width / 2 - 32.5;
  
  dropdown.style.top = top + 'px';
  dropdown.style.left = left + 'px';
  
  setTimeout(() => {
    dropdown.style.opacity = '1';
    dropdown.style.transform = 'scale(1) translateY(0)';
  }, 10);
  
  const closeHandler = (e) => {
    if (!dropdown.contains(e.target) && e.target !== event.currentTarget) {
      window.closeAllWeeklyDropdowns();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 10);
};

window.closeAllWeeklyDropdowns = () => {
  const existing = document.querySelectorAll('.weekly-level-dropdown-popover');
  existing.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'scale(0.95) translateY(-5px)';
    setTimeout(() => el.remove(), 150);
  });
};

window.selectWeeklyLevel = async (dateKey, type, value) => {
  window.closeAllWeeklyDropdowns();
  await window.changeWeeklyLevel(dateKey, type, value);
};

window.showHabitTooltip = (event, label) => {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  const existing = document.querySelectorAll('.habit-tooltip');
  existing.forEach(el => el.remove());
  
  const tooltip = document.createElement('div');
  tooltip.className = 'habit-tooltip';
  tooltip.textContent = label;
  tooltip.style.cssText = `
    position: absolute;
    background: var(--color-background-secondary);
    color: var(--color-text-primary);
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 4px;
    border: 0.5px solid var(--color-border-secondary);
    box-shadow: 0 4px 12px var(--color-shadow);
    white-space: nowrap;
    z-index: 1000;
    pointer-events: none;
    opacity: 0;
    transform: translate(-50%, -10px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  `;
  
  document.body.appendChild(tooltip);
  
  const rect = event.currentTarget.getBoundingClientRect();
  const top = rect.top + window.scrollY - 30;
  const left = rect.left + window.scrollX + rect.width / 2;
  
  tooltip.style.top = top + 'px';
  tooltip.style.left = left + 'px';
  
  setTimeout(() => {
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'translate(-50%, -5px)';
  }, 10);
  
  setTimeout(() => {
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translate(-50%, -10px)';
    setTimeout(() => tooltip.remove(), 150);
  }, 1500);
};

let selectedHabitIdForIcon = null;
let habitLogoHoldTimer = null;
let habitLogoHoldTriggered = false;
let hlStartX = 0, hlStartY = 0;

window.handleHabitLogoPointerStart = (e, habitId, label) => {
  habitLogoHoldTriggered = false;
  const touch = e.touches ? e.touches[0] : e;
  hlStartX = touch.clientX;
  hlStartY = touch.clientY;
  
  if (habitLogoHoldTimer) clearTimeout(habitLogoHoldTimer);
  habitLogoHoldTimer = setTimeout(() => {
    habitLogoHoldTriggered = true;
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    window.openIconSelectorModal(habitId, label);
  }, 600);
};

window.handleHabitLogoPointerMove = (e) => {
  if (!habitLogoHoldTimer) return;
  const touch = e.touches ? e.touches[0] : e;
  const diffX = Math.abs(touch.clientX - hlStartX);
  const diffY = Math.abs(touch.clientY - hlStartY);
  if (diffX > 10 || diffY > 10) {
    window.handleHabitLogoPointerEnd();
  }
};

window.handleHabitLogoPointerEnd = () => {
  if (habitLogoHoldTimer) {
    clearTimeout(habitLogoHoldTimer);
    habitLogoHoldTimer = null;
  }
};

window.handleHabitLogoClick = (e, label) => {
  if (habitLogoHoldTriggered) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    habitLogoHoldTriggered = false;
    return;
  }
  window.showHabitTooltip(e, label);
};

window.openIconSelectorModal = (habitId, label) => {
  selectedHabitIdForIcon = habitId;
  const modal = document.getElementById('icon-selector-modal');
  const nameEl = document.getElementById('icon-modal-habit-name');
  const gridEl = document.getElementById('icon-modal-grid');
  
  if (nameEl) nameEl.textContent = label;
  
  const currentIcon = getHabitIcon(habitId, '');
  
  const PRESET_ICONS = [
    'ti ti-barbell', 'ti ti-run', 'ti ti-bike', 'ti ti-swimming', 'ti ti-heart', 'ti ti-heartbeat', 'ti ti-activity', 'ti ti-flame', 'ti ti-droplet', 'ti ti-walk',
    'ti ti-zzz', 'ti ti-moon', 'ti ti-sun', 'ti ti-brain', 'ti ti-leaf', 'ti ti-pill', 'ti ti-clock', 'ti ti-hourglass',
    'ti ti-apple', 'ti ti-salad', 'ti ti-carrot', 'ti ti-coffee', 'ti ti-tea', 'ti ti-beer', 'ti ti-glass', 'ti ti-cookie', 'ti ti-mug', 'ti ti-meat',
    'ti ti-book', 'ti ti-pencil', 'ti ti-notebook', 'ti ti-code', 'ti ti-device-laptop', 'ti ti-terminal', 'ti ti-database', 'ti ti-calculator', 'ti ti-math-symbols', 'ti ti-briefcase', 'ti ti-chart-bar', 'ti ti-chart-line', 'ti ti-calendar', 'ti ti-bulb', 'ti ti-coin', 'ti ti-wallet', 'ti ti-piggy-bank',
    'ti ti-home', 'ti ti-brush', 'ti ti-trash', 'ti ti-bucket', 'ti ti-shirt', 'ti ti-key', 'ti ti-package', 'ti ti-tools', 'ti ti-bath', 'ti ti-shower',
    'ti ti-music', 'ti ti-headphones', 'ti ti-microphone', 'ti ti-guitar', 'ti ti-camera', 'ti ti-video', 'ti ti-device-gamepad-2', 'ti ti-movie', 'ti ti-palette', 'ti ti-photo', 'ti ti-ball-football', 'ti ti-ball-basketball', 'ti ti-ball-tennis', 'ti ti-trophy', 'ti ti-medal', 'ti ti-plane', 'ti ti-map-pin', 'ti ti-star', 'ti ti-flag', 'ti ti-target'
  ];
  
  if (gridEl) {
    gridEl.innerHTML = PRESET_ICONS.map(ico => {
      const isActive = currentIcon === ico;
      return `<button class="icon-grid-item ${isActive ? 'active' : ''}" 
                      onclick="window.changeHabitIcon('${habitId}', '${ico}')" 
                      aria-label="Select icon ${ico}"
                      title="${ico.replace('ti ti-', '').replace('-', ' ')}">
        <i class="${ico}"></i>
      </button>`;
    }).join('');
  }
  
  if (modal) modal.classList.add('active');
};

window.closeIconSelectorModal = () => {
  const modal = document.getElementById('icon-selector-modal');
  if (modal) modal.classList.remove('active');
  selectedHabitIdForIcon = null;
};

window.changeHabitIcon = (habitId, newIcon) => {
  if (!S.habitIcons) S.habitIcons = {};
  S.habitIcons[habitId] = newIcon;
  sv('kwig_habit_icons', S.habitIcons);
  render();
  window.closeIconSelectorModal();
};

// 7. Notifier Toggle / Value update functions
window.toggleNotifier = async (type, checked) => {
  S.notifiers[type].enabled = checked;
  sv('notifiers', S.notifiers);
  
  if (checked) {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }
  
  updateNotificationScheduling();
};

window.changeNotifierInterval = (type, val) => {
  S.notifiers[type].interval = parseInt(val);
  sv('notifiers', S.notifiers);
  updateNotificationScheduling();
};

window.changeDbFilter = async (val) => {
  S.dbFilter = val;
  await sv('db_filter', val);
  
  const tbody = document.getElementById('db-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--color-text-tertiary);font-size:13px">Loading history...</td></tr>`;
  }
  
  S.db = null;
  await loadDb();
  
  if (tbody && S.db) {
    tbody.innerHTML = S.db.map(d => `<tr class="dbr cr" data-del-type="db_row" data-del-id="${d.dateKey}" data-del-name="${d.fd}" style="${d.isToday ? 'background:var(--color-background-secondary);' : ''}">
      <td style="padding:11px 4px 11px 12px;font-size:12px;color:${d.isToday ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'};font-weight:${d.isToday ? 600 : 400}">${d.fd}</td>
      <td style="padding:11px 4px;text-align:center"><span style="font-size:11px;font-weight:600;color:${pc(d.study)}">${d.study}%</span></td>
      <td style="padding:11px 4px;text-align:center"><span style="font-size:11px;font-weight:600;color:${pc(d.fun)}">${d.fun}%</span></td>
      <td style="padding:11px 4px;text-align:center"><span style="font-size:11px;font-weight:600;color:${pc(d.health)}">${d.health}%</span></td>
      <td style="padding:11px 12px 11px 4px;text-align:center;font-size:11px;color:var(--color-text-secondary)">${d.tTotal > 0 ? d.tDone + '/' + d.tTotal : '—'}</td>
    </tr>`).join('');
    
    const filterDesc = S.dbFilter === 'weekly' ? 'last 7 days' : S.dbFilter === 'monthly' ? 'last 30 days' : 'all time';
    const descEl = document.getElementById('db-desc-text');
    if (descEl) {
      descEl.innerHTML = `${S.db.length} day${S.db.length !== 1 ? 's' : ''} shown &nbsp;&middot;&nbsp; ${filterDesc}`;
    }
  } else {
    render();
  }
};

window.resetPreviousData = () => {
  window.showCustomConfirm(
    "Reset history?",
    "Are you sure you want to delete all historical logs and tasks except today's? This action cannot be undone.",
    "Yes, Reset",
    async () => {
      const datePattern = /^(prod|health|tasks)-(\d{4}-\d{1,2}-\d{1,2})$/;
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const match = key.match(datePattern);
          if (match) {
            const dateKey = match[2];
            if (dateKey !== TK) {
              keysToRemove.push(key);
            }
          }
        }
      }
      
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
      
      // Clear weekly state cache for previous days
      const todayState = S.weeklyHabitStates[TK] || { prod: {}, health: {} };
      S.weeklyHabitStates = {};
      S.weeklyHabitStates[TK] = todayState;
      
      // Reload and refresh
      S.db = null;
      render();
      await loadDb();
      render();
      alert("All historical logs deleted successfully!");
    }
  );
};

window.saveConsoleWeights = async (type, val) => {
  if (type === 'prod') {
    S.prodFormula = val;
    await sv('prod_formula', val);
  } else {
    S.healthFormula = val;
    await sv('health_formula', val);
  }
  await loadWd();
  await loadDb();
};

window.editUsername = () => {
  const displayContainer = document.getElementById('username-display')?.parentNode;
  if (!displayContainer) return;
  
  const currentName = S.username || "Kwig User";
  displayContainer.innerHTML = `
    <input id="username-input" type="text" value="${currentName}" 
           style="width: 100%; font-size: 13px; font-weight: 600; border: none; border-bottom: 0.5px solid var(--color-text-primary); background: transparent; color: var(--color-text-primary); outline: none; padding: 2px 0; font-family: var(--font-sans);"
           onkeydown="if(event.key==='Enter')window.saveUsername(this.value);if(event.key==='Escape')window.cancelUsernameEdit();"
           onblur="window.saveUsername(this.value)">
  `;
  setTimeout(() => {
    const inp = document.getElementById('username-input');
    if (inp) inp.focus();
  }, 50);
};

window.saveUsername = (val) => {
  const trimmed = val.trim();
  if (trimmed) {
    S.username = trimmed;
    sv('kwig_username', S.username);
  }
  window.cancelUsernameEdit();
};

window.cancelUsernameEdit = () => {
  const displayContainer = document.getElementById('username-input')?.parentNode;
  if (!displayContainer) return;
  const currentName = S.username || "Kwig User";
  displayContainer.innerHTML = `
    <span class="profile-name" id="username-display" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:110px; font-size:14px; font-weight:600;">${currentName}</span>
    <button onclick="event.stopPropagation(); window.editUsername();" style="background:none; border:none; color:var(--color-text-tertiary); cursor:pointer; padding:4px 0 4px 6px; display:inline-flex; align-items:center; outline:none; -webkit-tap-highlight-color:transparent;" title="Edit Username">
      <i class="ti ti-edit" style="font-size:13px;"></i>
    </button>
  `;
};

// 8. Sidebar & Drive Alert functions
window.openSidebar = () => {
  document.getElementById('sidebar').classList.add('active');
  document.getElementById('sidebar-overlay').classList.add('active');
  document.getElementById('menu-btn').querySelector('i').style.transform = 'rotate(90deg)';
  
  const el = document.getElementById('username-display');
  if (el) el.textContent = S.username || 'Kwig User';
  
  renderSidebarPages();
  window.renderAccountSync();
  window.updateSidebarToggleUI();
};

window.closeSidebar = () => {
  document.getElementById('sidebar').classList.remove('active');
  document.getElementById('sidebar-overlay').classList.remove('active');
  document.getElementById('menu-btn').querySelector('i').style.transform = 'rotate(0deg)';
};

function renderSidebarPages() {
  const listEl = document.getElementById('sidebar-pages-list');
  if (!listEl) return;
  
  const folders = S.folders || [];
  const pages = S.pages || [];
  if (!S.expandedFolders) S.expandedFolders = {};
  
  // Render folders and pages under folders
  const foldersHtml = folders.map(f => {
    const isExpanded = !!S.expandedFolders[f.id];
    const fPages = pages.filter(p => p.folderId === f.id);
    const pagesHtml = isExpanded ? fPages.map(p => {
      const isActive = S.page === 'editor' && S.activePageId === p.id;
      return `<a href="#" class="sidebar-page-item ${isActive ? 'active' : ''}" style="padding-left:18px; border-left: 0.5px solid var(--color-border-tertiary);" onclick="event.preventDefault(); window.openPage('${p.id}'); window.closeSidebar();">
        <i class="ti ti-file-text" aria-hidden="true"></i><span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.name || 'Untitled'}</span>
      </a>`;
    }).join('') : '';
    
    return `<div style="display:flex; flex-direction:column; gap:2px; margin-bottom:4px;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding: 4px 6px; font-size:12px; color:var(--color-text-secondary); cursor:pointer; border-radius:4px; transition: background-color 0.15s;" onmouseover="this.style.background='var(--color-background-secondary)'" onmouseout="this.style.background='transparent'">
        <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:0;" onclick="window.toggleSidebarFolder('${f.id}')">
          <i class="ti ${isExpanded ? 'ti-folder-open' : 'ti-folder'}" style="color:var(--color-accent-blue); font-size:13px;"></i>
          <span style="font-weight:600; text-overflow:ellipsis; white-space:nowrap; overflow:hidden; max-width:110px;">${f.name}</span>
        </div>
        <button onclick="event.stopPropagation(); window.createNewPage('${f.id}');" style="background:none; border:none; color:var(--color-text-tertiary); cursor:pointer; padding:2px 4px; display:inline-flex; align-items:center; outline:none;" title="New note in folder">+</button>
      </div>
      ${pagesHtml}
    </div>`;
  }).join('');
  
  // Render root pages
  const rootPages = pages.filter(p => !p.folderId);
  const rootPagesHtml = rootPages.map(p => {
    const isActive = S.page === 'editor' && S.activePageId === p.id;
    return `<a href="#" class="sidebar-page-item ${isActive ? 'active' : ''}" onclick="event.preventDefault(); window.openPage('${p.id}'); window.closeSidebar();">
      <i class="ti ti-file-text" aria-hidden="true"></i><span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.name || 'Untitled'}</span>
    </a>`;
  }).join('');
  
  listEl.innerHTML = `${foldersHtml}${rootPagesHtml}`;
}


window.toggleSidebarPages = () => {
  S.sidebarExpanded = !S.sidebarExpanded;
  sv('sidebarExpanded', S.sidebarExpanded);
  window.updateSidebarToggleUI();
};

window.updateSidebarToggleUI = () => {
  const sublist = document.getElementById('sidebar-pages-list');
  const chevron = document.getElementById('sb-void-chevron');
  if (sublist && chevron) {
    if (S.sidebarExpanded) {
      sublist.classList.add('expanded');
      chevron.classList.remove('collapsed');
      renderSidebarPages();
    } else {
      sublist.classList.remove('expanded');
      chevron.classList.add('collapsed');
    }
  }
};

// Google Drive OAuth & REST Sync Functions
async function findBackupFileId() {
  try {
    const res = await fetch("https://www.googleapis.com/drive/v3/files?q=name='kwig_backup.json'+and+trashed=false", {
      headers: { 'Authorization': `Bearer ${S.gdriveToken}` }
    });
    if (!res.ok) {
      if (res.status === 401) {
        alert("Google session has expired. Redirecting to Google Login...");
        window.startGoogleDriveLogin();
        return null;
      }
      throw new Error("Drive response status " + res.status);
    }
    const data = await res.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  } catch (e) {
    console.error("Error finding backup file:", e);
    throw e;
  }
}

window.startGoogleDriveLogin = () => {
  const clientId = S.gdriveClientId;
  const redirectUri = window.location.origin;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}&prompt=select_account`;
  
  window.location.href = authUrl;
};

window.logoutGoogleDrive = async () => {
  S.gdriveToken = null;
  await sv('gdrive_token', null);
  window.renderAccountSync();
  alert("Signed out from Google Account.");
};

window.showSyncSettingsModal = () => {
  const modal = document.getElementById('sync-settings-modal');
  if (modal) {
    modal.classList.add('active');
    
    const gInput = document.getElementById('oauth-client-id-input');
    if (gInput) gInput.value = S.gdriveClientId || '';
    
    window.switchSyncTab('local');
  }
};

window.closeSyncSettingsModal = () => {
  const modal = document.getElementById('sync-settings-modal');
  if (modal) {
    modal.classList.remove('active');
  }
};

window.switchSyncTab = (tabId) => {
  document.querySelectorAll('.sync-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.sync-tab').forEach(t => t.classList.remove('active'));
  
  const panel = document.getElementById(`panel-${tabId}`);
  const tab = document.getElementById(`tab-${tabId}`);
  if (panel && tab) {
    panel.style.display = 'block';
    tab.classList.add('active');
  }
};

// 1. Local File Backup Export/Import
window.exportLocalBackup = () => {
  try {
    const backupData = {
      version: 2,
      timestamp: new Date().toISOString(),
      localStorage: {}
    };
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      backupData.localStorage[k] = localStorage.getItem(k);
    }
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `kwig_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Local backup export failed:", e);
    alert("Export failed: " + e.message);
  }
};

window.triggerLocalRestore = () => {
  document.getElementById('import-backup-file').click();
};

document.getElementById('import-backup-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = event => {
    try {
      const backupData = JSON.parse(event.target.result);
      if (!backupData || !backupData.localStorage) {
        throw new Error("Invalid backup file format.");
      }
      
      const count = Object.keys(backupData.localStorage).length;
      window.showCustomConfirm(
        "Restore backup?",
        `Valid backup file found.\n\nThis will restore ${count} records and overwrite all current app data. Are you sure you want to proceed?`,
        "Yes, Restore",
        () => {
          localStorage.clear();
          for (const [k, v] of Object.entries(backupData.localStorage)) {
            localStorage.setItem(k, v);
          }
          alert("Backup successfully restored! App will now reload.");
          window.location.reload();
        }
      );
    } catch (err) {
      alert("Restore failed: " + err.message);
    }
    e.target.value = ''; // clear input
  };
  reader.readAsText(file);
});


window.saveClientConfigId = () => {
  const input = document.getElementById('oauth-client-id-input');
  if (input) {
    const val = input.value.trim();
    if (!val) {
      alert("Please enter a valid Google Client ID.");
      return;
    }
    S.gdriveClientId = val;
    sv('gdrive_client_id', val);
    window.closeSyncSettingsModal();
    alert("Google Client ID saved successfully!\nYou can now sign in with Google.");
  }
};

window.renderAccountSync = () => {
  const container = document.getElementById('sidebar-account-container');
  const profileSync = document.getElementById('profile-sync-status');
  
  if (S.gdriveToken) {
    if (profileSync) {
      profileSync.innerHTML = '<i class="ti ti-cloud-check"></i> Google Drive Active';
      profileSync.classList.add('active');
    }
    if (container) {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:4px; padding: 2px 4px;">
          <div style="font-size: 10px; color: var(--color-accent-green); padding: 0 10px; display:flex; align-items:center; gap:4px; font-weight:600; margin-bottom:2px;">
            <i class="ti ti-brand-google"></i> Google Drive Synced
          </div>
          <a href="#" class="sidebar-item" id="sb-sync-upload" onclick="event.preventDefault(); window.syncToGoogleDrive();" style="padding: 6px 10px; background: rgba(56, 176, 0, 0.08);">
            <i class="ti ti-cloud-upload" aria-hidden="true" style="color:var(--color-accent-green)"></i> Sync to Drive
          </a>
          <a href="#" class="sidebar-item" id="sb-sync-download" onclick="event.preventDefault(); window.syncFromGoogleDrive();" style="padding: 6px 10px;">
            <i class="ti ti-cloud-download" aria-hidden="true" style="color:var(--color-accent-blue)"></i> Restore from Drive
          </a>
          <a href="#" class="sidebar-item" id="sb-sync-logout" onclick="event.preventDefault(); window.logoutGoogleDrive();" style="font-size:11px; padding:4px 10px; color:var(--color-text-tertiary); margin-top:2px;">
            <i class="ti ti-logout" aria-hidden="true" style="font-size:12px;"></i> Sign Out
          </a>
        </div>
      `;
    }
  } else {
    if (profileSync) {
      profileSync.innerHTML = '<i class="ti ti-cloud-off"></i> Local Mode';
      profileSync.classList.remove('active');
    }
    if (container) {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:4px; padding: 2px 4px;">
          <a href="#" class="sidebar-item" onclick="event.preventDefault(); window.showSyncSettingsModal();">
            <i class="ti ti-settings" aria-hidden="true"></i> Configure Sync / Backup
          </a>
          <a href="#" class="sidebar-item" onclick="event.preventDefault(); window.exportLocalBackup();">
            <i class="ti ti-download" aria-hidden="true"></i> Quick Export File
          </a>
        </div>
      `;
    }
  }
};

window.syncToGoogleDrive = async () => {
  if (!S.gdriveToken) {
    alert("Please sign in with Google first.");
    return;
  }
  
  const btn = document.getElementById('sb-sync-upload');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '<i class="ti ti-loader rotate" style="display:inline-block; animation:spin 1s linear infinite;" aria-hidden="true"></i> Syncing...';
  
  try {
    const fileId = await findBackupFileId();
    
    // Backup all of localStorage
    const backupData = {
      version: 2,
      timestamp: new Date().toISOString(),
      localStorage: {}
    };
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      backupData.localStorage[k] = localStorage.getItem(k);
    }
    
    let res;
    if (fileId) {
      res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${S.gdriveToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backupData)
      });
    } else {
      const createMetaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${S.gdriveToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'kwig_backup.json',
          mimeType: 'application/json'
        })
      });
      if (!createMetaRes.ok) {
        throw new Error(`Failed to initialize Google Drive backup space (Status: ${createMetaRes.status}).`);
      }
      const meta = await createMetaRes.json();
      
      res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${meta.id}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${S.gdriveToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backupData)
      });
    }
    
    if (!res.ok) {
      throw new Error(`Google Drive API upload status: ${res.status}`);
    }
    alert("Data successfully backed up to your Google Drive! (kwig_backup.json)");
  } catch (err) {
    console.error("Cloud backup sync error:", err);
    let extraTip = "";
    if (err.message.includes("403") || err.message.includes("404")) {
      extraTip = "\n\nImportant: Please verify that the Google Drive API is enabled in your Google Cloud Project, and that your email is registered as a Test User in your OAuth Consent Screen.";
    }
    alert("Cloud Sync failed:\n" + err.message + extraTip + "\n\nTip: Signing out and back in to refresh credentials can fix authorization errors.");
  } finally {
    if (btn) btn.innerHTML = originalHtml;
    window.renderAccountSync();
  }
};

window.syncFromGoogleDrive = async () => {
  if (!S.gdriveToken) {
    alert("Please sign in with Google first.");
    return;
  }
  
  const btn = document.getElementById('sb-sync-download');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '<i class="ti ti-loader rotate" style="display:inline-block; animation:spin 1s linear infinite;" aria-hidden="true"></i> Restoring...';
  
  try {
    const fileId = await findBackupFileId();
    if (!fileId) {
      alert("No backup file (kwig_backup.json) found on your Google Drive. Backup your current data first!");
      return;
    }
    
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${S.gdriveToken}` }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch backup file from Drive (Status: ${res.status}).`);
    }
    
    const backupData = await res.json();
    if (!backupData || !backupData.localStorage) throw new Error("Malformed backup data.");
    
    const count = Object.keys(backupData.localStorage).length;
    const dateStr = new Date(backupData.timestamp || Date.now()).toLocaleString();
    
    window.showCustomConfirm(
      "Restore backup?",
      `Backup found from: ${dateStr}\n\nThis will restore ${count} keys and overwrite all current habits, logs, and notes on this device. Do you want to proceed?`,
      "Yes, Restore",
      () => {
        localStorage.clear();
        for (const [key, val] of Object.entries(backupData.localStorage)) {
          localStorage.setItem(key, val);
        }
        alert("Data successfully restored from Google Drive! Restarting application...");
        window.location.reload();
      }
    );
  } catch (err) {
    console.error("Cloud download sync error:", err);
    let extraTip = "";
    if (err.message.includes("403") || err.message.includes("404")) {
      extraTip = "\n\nImportant: Please verify that the Google Drive API is enabled in your Google Cloud Project, and that your email is registered as a Test User in your OAuth Consent Screen.";
    }
    alert("Failed to restore backup:\n" + err.message + extraTip);
  } finally {
    if (btn) btn.innerHTML = originalHtml;
    window.renderAccountSync();
  }
};

// 9. Notes Page Manager State functions
window.createNewPage = (folderId = null) => {
  const newId = uid();
  const formatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const dateString = new Date().toLocaleDateString('en-US', formatOptions);
  
  const newPage = {
    id: newId,
    name: "Untitled",
    date: dateString,
    content: "",
    folderId: folderId
  };
  
  S.pages.unshift(newPage);
  sv('kwig_pages', S.pages);
  
  window.openPage(newId);
  window.closeSidebar();
  renderSidebarPages();
};

window.createFolder = () => {
  if (document.getElementById('ni-folder-container')) {
    const el = document.getElementById('ni-folder');
    if (el) el.focus();
    return;
  }
  const emptyMsg = document.getElementById('notes-empty-message');
  if (emptyMsg) emptyMsg.style.display = 'none';
  const formDiv = document.createElement('div');
  formDiv.id = 'ni-folder-container';
  formDiv.style.cssText = "background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-lg); padding: 12px 14px; margin-bottom: 16px; box-shadow: 0 2px 8px var(--color-shadow); display:flex; align-items:center; gap:8px;";
  formDiv.innerHTML = `
    <i class="ti ti-folder" style="font-size: 20px; color: var(--color-accent-blue);"></i>
    <input id="ni-folder" type="text" placeholder="Folder name..." style="flex:1; font-size:14px; border:none; background:transparent; color:var(--color-text-primary); font-family:var(--font-sans); outline:none;" onkeydown="if(event.key==='Enter')window.confFolder();if(event.key==='Escape')window.cancelFolderForm()">
    <button onclick="window.confFolder()" style="background:var(--color-text-primary); border:none; border-radius:4px; padding:4px 10px; font-size:12px; color:var(--color-background-primary); cursor:pointer; font-family:var(--font-sans); font-weight:500">Add</button>
    <button onclick="window.cancelFolderForm()" style="background:none; border:0.5px solid var(--color-border-secondary); border-radius:4px; padding:4px 8px; font-size:12px; color:var(--color-text-secondary); cursor:pointer; font-family:var(--font-sans)">×</button>
  `;
  const wrapper = document.getElementById('notes-list-wrapper');
  if (wrapper) {
    wrapper.insertBefore(formDiv, wrapper.firstChild);
  }
  setTimeout(() => {
    const el = document.getElementById('ni-folder');
    if (el) el.focus();
  }, 60);
};

window.cancelFolderForm = () => {
  const formDiv = document.getElementById('ni-folder-container');
  if (formDiv) formDiv.remove();
  if ((!S.folders || S.folders.length === 0) && (!S.pages || S.pages.filter(p => !p.folderId).length === 0)) {
    const emptyMsg = document.getElementById('notes-empty-message');
    if (emptyMsg) emptyMsg.style.display = 'block';
  }
};

window.confFolder = () => {
  const el = document.getElementById('ni-folder');
  if (!el) return;
  const name = el.value.trim();
  if (!name) {
    window.cancelFolderForm();
    return;
  }
  const newFolder = {
    id: uid(),
    name: name
  };
  if (!S.folders) S.folders = [];
  S.folders.push(newFolder);
  sv('kwig_folders', S.folders);
  S.as = null;
  render();
  renderSidebarPages();
};

window.deleteFolder = (folderId) => {
  const folder = S.folders.find(f => f.id === folderId);
  if (!folder) return;
  
  window.showCustomConfirm(
    "Delete Folder?",
    `Are you sure you want to delete the folder "${folder.name}" and all notes inside it?`,
    "Yes, Delete",
    () => {
      S.folders = S.folders.filter(f => f.id !== folderId);
      S.pages = S.pages.filter(p => p.folderId !== folderId);
      sv('kwig_folders', S.folders);
      sv('kwig_pages', S.pages);
      render();
      renderSidebarPages();
    }
  );
};

window.toggleSidebarFolder = (folderId) => {
  if (!S.expandedFolders) S.expandedFolders = {};
  S.expandedFolders[folderId] = !S.expandedFolders[folderId];
  sv('kwig_expanded_folders', S.expandedFolders);
  renderSidebarPages();
};

window.goToFolder = (folderId) => {
  S.page = 'notes';
  render();
  setTimeout(() => {
    const el = document.getElementById(`notes-folder-block-${folderId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.outline = '1.5px solid var(--color-accent-blue)';
      setTimeout(() => {
        el.style.transition = 'outline 0.5s ease';
        el.style.outline = '1.5px solid transparent';
      }, 1500);
    }
  }, 100);
};



window.openPage = id => {
  if (S.page !== 'editor') {
    S.history.push(S.page);
  }
  S.page = 'editor';
  S.activePageId = id;
  render();
  
  const contentArea = document.getElementById('editor-content');
  if (contentArea) {
    contentArea.addEventListener('keyup', cacheSelection);
    contentArea.addEventListener('mouseup', cacheSelection);
    contentArea.addEventListener('touchend', cacheSelection);
    contentArea.focus();
    bindEditorImageEvents();
  }
};

window.updatePageTitle = title => {
  const page = S.pages.find(p => p.id === S.activePageId);
  if (page) {
    page.name = title.trim() || "Untitled";
    sv('kwig_pages', S.pages);
    renderSidebarPages();
  }
};

window.saveEditorContent = () => {
  const page = S.pages.find(p => p.id === S.activePageId);
  const contentArea = document.getElementById('editor-content');
  if (page && contentArea) {
    bindEditorImageEvents();
    page.content = contentArea.innerHTML;
    sv('kwig_pages', S.pages);
  }
};

// Custom Image Resizing & Drag Event Bindings inside contenteditable
let selectedImg = null;

function bindEditorImageEvents() {
  const contentArea = document.getElementById('editor-content');
  if (!contentArea) return;
  
  contentArea.querySelectorAll('img').forEach(img => {
    if (img.dataset.bound) return;
    img.dataset.bound = "true";
    
    // Tap to select / show resize controls
    img.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      window.selectEditorImage(img);
    });
    
    // Drag-to-position touch logic
    let dragActive = false;
    
    img.addEventListener('touchstart', e => {
      dragActive = true;
      img.classList.add('dragging-image');
      window.hideImageBubble();
    }, { passive: true });
    
    img.addEventListener('touchmove', e => {
      if (!dragActive) return;
      const touch = e.touches[0];
      
      if (e.cancelable) e.preventDefault(); // block viewport scrolling while dragging
      
      let range;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(touch.clientX, touch.clientY);
      } else if (document.caretPositionFromPoint) {
        let pos = document.caretPositionFromPoint(touch.clientX, touch.clientY);
        if (pos) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      }
      
      if (range && contentArea.contains(range.startContainer)) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, { passive: false });
    
    img.addEventListener('touchend', e => {
      if (!dragActive) return;
      dragActive = false;
      img.classList.remove('dragging-image');
      
      const touch = e.changedTouches[0];
      let range;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(touch.clientX, touch.clientY);
      } else if (document.caretPositionFromPoint) {
        let pos = document.caretPositionFromPoint(touch.clientX, touch.clientY);
        if (pos) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      }
      
      if (range && contentArea.contains(range.startContainer)) {
        range.insertNode(img);
        window.saveEditorContent();
        setTimeout(() => window.selectEditorImage(img), 100);
      }
    }, { passive: true });
  });
}

window.selectEditorImage = img => {
  window.hideImageBubble();
  selectedImg = img;
  img.classList.add('selected-image');
  
  const bubble = document.getElementById('image-control-bubble');
  const appContainer = document.getElementById('app-container');
  if (!bubble || !appContainer) return;
  
  // Highlight active preset button
  bubble.querySelectorAll('.bubble-btn').forEach(btn => {
    btn.classList.remove('active');
    if (img.style.width === btn.textContent) {
      btn.classList.add('active');
    }
  });
  
  const containerRect = appContainer.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();
  
  bubble.style.display = 'flex';
  
  const bubbleHeight = bubble.offsetHeight;
  const bubbleWidth = bubble.offsetWidth;
  
  let top = imgRect.top - containerRect.top - bubbleHeight - 6;
  let left = imgRect.left - containerRect.left + (imgRect.width - bubbleWidth) / 2;
  
  if (top < 0) top = imgRect.bottom - containerRect.top + 6;
  if (left < 0) left = 6;
  if (left + bubbleWidth > containerRect.width) left = containerRect.width - bubbleWidth - 6;
  
  bubble.style.top = `${top}px`;
  bubble.style.left = `${left}px`;
};

window.hideImageBubble = () => {
  const bubble = document.getElementById('image-control-bubble');
  if (bubble) bubble.style.display = 'none';
  if (selectedImg) {
    selectedImg.classList.remove('selected-image');
    selectedImg = null;
  }
};

window.resizeSelectedImage = widthPct => {
  if (!selectedImg) return;
  selectedImg.style.width = widthPct;
  selectedImg.style.height = 'auto';
  window.saveEditorContent();
  setTimeout(() => {
    if (selectedImg) window.selectEditorImage(selectedImg);
  }, 50);
};

window.alignSelectedImage = alignment => {
  if (!selectedImg) return;
  selectedImg.style.display = 'block';
  if (alignment === 'left') {
    selectedImg.style.marginLeft = '0';
    selectedImg.style.marginRight = 'auto';
  } else if (alignment === 'center') {
    selectedImg.style.marginLeft = 'auto';
    selectedImg.style.marginRight = 'auto';
  } else if (alignment === 'right') {
    selectedImg.style.marginLeft = 'auto';
    selectedImg.style.marginRight = '0';
  }
  window.saveEditorContent();
  setTimeout(() => {
    if (selectedImg) window.selectEditorImage(selectedImg);
  }, 50);
};

window.deleteSelectedImage = () => {
  if (!selectedImg) return;
  selectedImg.remove();
  window.hideImageBubble();
  window.saveEditorContent();
};

window.confirmDeletePage = (id, name) => {
  showDeleteModal('page', id, null, name);
};

// 10. Selection & Caret Position Caching
let lastSelectionRange = null;

function cacheSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    lastSelectionRange = sel.getRangeAt(0).cloneRange();
  }
}

function restoreSelection() {
  const contentArea = document.getElementById('editor-content');
  if (!contentArea) return;
  
  contentArea.focus();
  const sel = window.getSelection();
  
  if (lastSelectionRange) {
    sel.removeAllRanges();
    sel.addRange(lastSelectionRange);
  } else {
    const range = document.createRange();
    range.selectNodeContents(contentArea);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    lastSelectionRange = range.cloneRange();
  }
}

function insertHtmlAtCursor(html) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  
  const range = sel.getRangeAt(0);
  range.deleteContents();
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  const frag = document.createDocumentFragment();
  let node, lastNode;
  while ((node = tempDiv.firstChild)) {
    lastNode = frag.appendChild(node);
  }
  
  range.insertNode(frag);
  
  if (lastNode) {
    range.setStartAfter(lastNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    lastSelectionRange = range.cloneRange();
  }
}

function insertTextAtCursor(text) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  
  const range = sel.getRangeAt(0);
  range.deleteContents();
  
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  
  range.setStartAfter(textNode);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  lastSelectionRange = range.cloneRange();
}

// 11. Editor Media Actions (Import & Paste)
window.triggerImageImport = () => {
  document.getElementById('import-image-file').click();
};

document.getElementById('import-image-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = event => {
    const base64 = event.target.result;
    restoreSelection();
    const imgHtml = `<img src="${base64}" alt="Imported Image">`;
    insertHtmlAtCursor(imgHtml);
    e.target.value = ''; // Clear file input
    window.saveEditorContent();
  };
  reader.readAsDataURL(file);
});

window.triggerPasteClipboard = async () => {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageTypes = item.types.filter(t => t.startsWith('image/'));
      if (imageTypes.length > 0) {
        const blob = await item.getType(imageTypes[0]);
        const reader = new FileReader();
        reader.onload = event => {
          const base64 = event.target.result;
          restoreSelection();
          const imgHtml = `<img src="${base64}" alt="Pasted Image">`;
          insertHtmlAtCursor(imgHtml);
          window.saveEditorContent();
        };
        reader.readAsDataURL(blob);
        return;
      }
    }
    
    // Fallback to text
    const text = await navigator.clipboard.readText();
    if (text) {
      restoreSelection();
      insertTextAtCursor(text);
      window.saveEditorContent();
    }
  } catch (err) {
    console.warn("Advanced clipboard API failed, checking simple paste:", err);
    alert("Clipboard reading permission is required.\nTip: You can also use standard Ctrl+V (or keyboard paste) directly inside the notes editor canvas!");
  }
};

// 12. Long Press (Hold-to-Delete) Gesture Logic
let holdTimer = null;
let holdTarget = null;
let holdTriggered = false;
let pendingDelete = null;
let customConfirmCallback = null;
let startX = 0, startY = 0;

function handlePointerStart(e, targetRow) {
  holdTarget = targetRow;
  holdTriggered = false;
  
  targetRow.classList.add('held-highlight');
  
  holdTimer = setTimeout(() => {
    holdTriggered = true;
    targetRow.classList.remove('held-highlight');
    
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    const type = targetRow.getAttribute('data-del-type');
    const id = targetRow.getAttribute('data-del-id');
    const sec = targetRow.getAttribute('data-del-sec');
    const name = targetRow.getAttribute('data-del-name') || 'this item';
    
    showDeleteModal(type, id, sec, name);
  }, 600);
}

function handlePointerEnd() {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  if (holdTarget) {
    holdTarget.classList.remove('held-highlight');
  }
}

function showDeleteModal(type, id, sec, name) {
  pendingDelete = { type, id, sec };
  const modal = document.getElementById('delete-modal');
  if (modal) {
    const descEl = modal.querySelector('.modal-desc');
    if (descEl) {
      descEl.textContent = `Are you sure you want to delete "${name}"? This action cannot be undone.`;
    }
    modal.classList.add('active');
  }
}

window.showCustomConfirm = (title, desc, confirmBtnText, onConfirm) => {
  customConfirmCallback = onConfirm;
  const modal = document.getElementById('delete-modal');
  if (modal) {
    const titleEl = modal.querySelector('.modal-title');
    const descEl = modal.querySelector('.modal-desc');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (confirmBtn) {
      confirmBtn.textContent = confirmBtnText;
      confirmBtn.className = confirmBtnText.toLowerCase().includes('delete') || confirmBtnText.toLowerCase().includes('remove') || confirmBtnText.toLowerCase().includes('reset') ? 'modal-btn modal-btn-delete' : 'modal-btn modal-btn-confirm';
    }
    modal.classList.add('active');
  }
};

function closeDeleteModal() {
  const modal = document.getElementById('delete-modal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => {
      const titleEl = modal.querySelector('.modal-title');
      const descEl = modal.querySelector('.modal-desc');
      const confirmBtn = document.getElementById('modal-confirm-btn');
      if (titleEl) titleEl.textContent = 'Remove row?';
      if (descEl) descEl.textContent = 'Are you sure you want to delete this item? This action cannot be undone.';
      if (confirmBtn) {
        confirmBtn.textContent = 'Yes, Remove';
        confirmBtn.className = 'modal-btn modal-btn-delete';
      }
    }, 200);
  }
  pendingDelete = null;
  customConfirmCallback = null;
}

// Attach global event listeners to block short clicks when long-press was triggered
document.addEventListener('click', e => {
  if (holdTriggered) {
    e.preventDefault();
    e.stopPropagation();
    holdTriggered = false;
  }
}, true); // Capture phase!

document.addEventListener('touchstart', e => {
  const row = e.target.closest('.cr');
  if (!row) return;
  const touch = e.touches[0];
  startX = touch.clientX;
  startY = touch.clientY;
  handlePointerStart(e, row);
}, { passive: true });

document.addEventListener('touchmove', e => {
  if (!holdTarget) return;
  const touch = e.touches[0];
  const diffX = Math.abs(touch.clientX - startX);
  const diffY = Math.abs(touch.clientY - startY);
  if (diffX > 10 || diffY > 10) {
    handlePointerEnd();
  }
}, { passive: true });

document.addEventListener('touchend', handlePointerEnd, { passive: true });

document.addEventListener('mousedown', e => {
  const row = e.target.closest('.cr');
  if (!row || e.button !== 0) return;
  startX = e.clientX;
  startY = e.clientY;
  handlePointerStart(e, row);
});

document.addEventListener('mousemove', e => {
  if (!holdTarget) return;
  const diffX = Math.abs(e.clientX - startX);
  const diffY = Math.abs(e.clientY - startY);
  if (diffX > 10 || diffY > 10) {
    handlePointerEnd();
  }
});

document.addEventListener('mouseup', handlePointerEnd);

// Setup Modal Cancel/Confirm buttons
document.getElementById('modal-cancel-btn').addEventListener('click', () => {
  closeDeleteModal();
});

document.getElementById('modal-confirm-btn').addEventListener('click', async () => {
  if (customConfirmCallback) {
    const cb = customConfirmCallback;
    customConfirmCallback = null;
    closeDeleteModal();
    await cb();
    return;
  }
  
  if (pendingDelete) {
    const { type, id, sec } = pendingDelete;
    
    if (type === 'task') {
      S.tasks = S.tasks.filter(t => t.id !== id);
      sv(`tasks-${TK}`, S.tasks);
    } else if (type === 'page') {
      S.pages = S.pages.filter(p => p.id !== id);
      sv('kwig_pages', S.pages);
      if (S.page === 'editor' && S.activePageId === id) {
        S.page = 'notes';
        S.activePageId = null;
      }
    } else if (type === 'habit') {
      const isDefault = SB.some(x => x.id === id) || FB.some(x => x.id === id) || HB.some(x => x.id === id);
      if (isDefault) {
        S.deleted_defaults.push(id);
        sv('deleted_defaults', S.deleted_defaults);
      } else {
        if (sec === 'study') S.cs = S.cs.filter(i => i.id !== id);
        else if (sec === 'fun') S.cf = S.cf.filter(i => i.id !== id);
        else S.ch = S.ch.filter(i => i.id !== id);
        
        const arr = sec === 'study' ? S.cs : sec === 'fun' ? S.cf : S.ch;
        const key = sec === 'study' ? 'cs' : sec === 'fun' ? 'cf' : 'ch';
        sv(key, arr);
      }
    } else if (type === 'db_row') {
      localStorage.removeItem(`prod-${id}`);
      localStorage.removeItem(`health-${id}`);
      localStorage.removeItem(`tasks-${id}`);
      if (S.weeklyHabitStates[id]) {
        S.weeklyHabitStates[id] = { prod: {}, health: {} };
      }
      if (id === TK) {
        S.pc = {};
        S.hc = {};
        S.tasks = [];
      }
      await loadDb();
    }
    
    updWd();
    render();
  }
  closeDeleteModal();
});

// Setup click listener on the backdrop overlay to close sidebar
document.getElementById('sidebar-overlay').addEventListener('click', window.closeSidebar);

// Hook up Ctrl+V paste event directly in the contenteditable area for desktop convenience
document.addEventListener('paste', e => {
  const contentArea = document.getElementById('editor-content');
  if (document.activeElement !== contentArea) return;
  
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (const item of items) {
    if (item.type.indexOf('image') === 0) {
      e.preventDefault(); // Prevent duplicate paste
      const blob = item.getAsFile();
      const reader = new FileReader();
      reader.onload = event => {
        const base64 = event.target.result;
        restoreSelection();
        const imgHtml = `<img src="${base64}" alt="Pasted Image">`;
        insertHtmlAtCursor(imgHtml);
        window.saveEditorContent();
      };
      reader.readAsDataURL(blob);
      return;
    }
  }
  // Standard text pasting runs default browser behavior and updates local state oninput
});

// Setup global click listener to clear image selection bubble when tapping outside
document.addEventListener('click', e => {
  if (S.page !== 'editor') return;
  if (e.target.closest('#image-control-bubble') || e.target.tagName === 'IMG') {
    return;
  }
  window.hideImageBubble();
});

// window.goBack handles back navigation and app exit
window.goBack = () => {
  if (S.page === 'home') {
    App.exitApp().catch(err => {
      console.warn("App exit failed:", err);
    });
    return;
  }
  
  let prev = S.history.pop();
  if (!prev || prev === S.page) {
    prev = 'home';
  }
  window.goTo(prev, true);
};

// Global Touch Swipe-Back Gesture listener
let swipeStartX = null;
let swipeStartY = null;

document.addEventListener('touchstart', e => {
  if (e.target.closest('input[type="range"]') || e.target.closest('.switch') || e.target.closest('img')) {
    swipeStartX = null;
    swipeStartY = null;
    return;
  }
  swipeStartX = e.touches[0].clientX;
  swipeStartY = e.touches[0].clientY;
}, true);

document.addEventListener('touchend', e => {
  if (swipeStartX === null || swipeStartY === null) return;
  
  const diffX = swipeStartX - e.changedTouches[0].clientX;
  const diffY = Math.abs(swipeStartY - e.changedTouches[0].clientY);
  
  const container = document.getElementById('app-container') || document.body;
  const rect = container.getBoundingClientRect();
  const edgeThreshold = 35; // px from edge
  const minSwipeDistance = 40; // px of horizontal swipe
  
  const isLeftEdgeSwipe = swipeStartX < rect.left + edgeThreshold && diffX < -minSwipeDistance;
  const isRightEdgeSwipe = swipeStartX > rect.right - edgeThreshold && diffX > minSwipeDistance;
  
  if ((isLeftEdgeSwipe || isRightEdgeSwipe) && diffY < 40) {
    window.goBack();
  }
  
  swipeStartX = null;
  swipeStartY = null;
}, true);

// 6. Workout Tracker & Database Logic
const ALL_EXERCISES = [
  { name: "Bench Press", category: "CHEST", days: ["Mon", "Fri"] },
  { name: "Chest Fly", category: "CHEST", days: ["Mon"] },
  { name: "Push-up", category: "CHEST", days: ["Mon", "Fri"] },
  { name: "Seated DB Press", category: "SHOULDER", days: ["Mon"] },
  { name: "Standing Shoulder Press", category: "SHOULDER", days: ["Mon", "Fri"] },
  { name: "Lateral Raise", category: "SHOULDER", days: ["Mon"] },
  { name: "Front Raise", category: "SHOULDER", days: ["Mon"] },
  { name: "Upright row", category: "SHOULDER", days: ["Mon"] },
  { name: "Cable Face Pull", category: "SHOULDER", days: ["Tue"] },
  { name: "Rope Extension", category: "TRICEP", days: ["Mon"] },
  { name: "Tricep Dip", category: "TRICEP", days: ["Mon"] },
  { name: "One-Arm Extension", category: "TRICEP", days: ["Mon"] },
  { name: "Bench Dip", category: "TRICEP", days: ["Fri"] },
  { name: "Diamond Push-up", category: "TRICEP", days: ["Mon"] },
  { name: "Pull-up", category: "BACK", days: ["Tue"] },
  { name: "Wide-grip pull", category: "BACK", days: ["Tue"] },
  { name: "Barbell Row", category: "BACK", days: ["Tue", "Fri"] },
  { name: "Dumble Row", category: "BACK", days: ["Tue"] },
  { name: "Seated Row", category: "BACK", days: ["Tue"] },
  { name: "Hyper Extension", category: "BACK", days: ["Tue", "Sat"] },
  { name: "EZ bar curl", category: "BICEP", days: ["Tue"] },
  { name: "Dumbbell Curl", category: "BICEP", days: ["Tue"] },
  { name: "Hammer Curl", category: "BICEP", days: ["Tue"] },
  { name: "Barbell Squat", category: "LEGS", days: ["Wed"] },
  { name: "Romanian Deadlift", category: "LEGS", days: ["Wed"] },
  { name: "Leg Press", category: "LEGS", days: ["Wed", "Fri"] },
  { name: "Leg Curl", category: "LEGS", days: ["Wed"] },
  { name: "Hip Abductor", category: "LEGS", days: ["Wed"] },
  { name: "Calf Extension", category: "LEGS", days: ["Wed"] },
  { name: "Plank", category: "CORE", days: ["Wed"] },
  { name: "Hanging Leg Raise", category: "CORE", days: ["Wed"] },
  { name: "Crunches", category: "CORE", days: ["Wed"] },
  { name: "Treadmill", category: "CARDIO", days: ["Thu", "Fri", "Sat"] },
  { name: "Cycling", category: "CARDIO", days: ["Thu", "Sat"] },
  { name: "Walking Elliptical", category: "CARDIO", days: ["Thu", "Sat"] }
];

const WORKOUT_ROUTINES = {
  "Mon": "Push",
  "Tue": "Pull",
  "Wed": "Legs, Core",
  "Thu": "Cardio",
  "Fri": "Full, Hit",
  "Sat": "Active",
  "Sun": "Rest"
};

const DB_DATES = [
  30, 31, 1, 2, 3, 4, 5,
  6, 7, 8, 9, 10, 11, 12,
  13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26,
  27, 28, 29, 30, 1, 2, 3
];
const DB_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayOfCurrentWeek(d) {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = local.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  local.setDate(local.getDate() + diff);
  return local;
}

function getLocalDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(str) {
  const parts = str.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

function getWorkoutColIdx() {
  if (!S.workout_cycle_start) {
    const monday = getMondayOfCurrentWeek(new Date());
    S.workout_cycle_start = getLocalDateString(monday);
    sv('kwig_workout_cycle_start', S.workout_cycle_start);
  } else {
    // Validate stored cycle start date and correct if it is not a Monday
    const start = parseLocalDate(S.workout_cycle_start);
    if (start.getDay() !== 1) { // 1 is Monday
      const monday = getMondayOfCurrentWeek(start);
      S.workout_cycle_start = getLocalDateString(monday);
      sv('kwig_workout_cycle_start', S.workout_cycle_start);
    }
  }
  
  const start = parseLocalDate(S.workout_cycle_start);
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const diffTime = todayMidnight.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0 || diffDays >= 35) {
    const monday = getMondayOfCurrentWeek(new Date());
    S.workout_cycle_start = getLocalDateString(monday);
    sv('kwig_workout_cycle_start', S.workout_cycle_start);
    return getWorkoutColIdx();
  }
  
  return diffDays + 1;
}

function getColumnCheckCount(colKey) {
  let count = 0;
  for (const ex of ALL_EXERCISES) {
    if (S.workout[colKey] && S.workout[colKey][ex.name]) {
      count++;
    }
  }
  return count;
}

function getCategoryColorStyle(category) {
  const colors = {
    "CHEST": { bg: "rgba(231, 76, 60, 0.12)", fg: "#e74c3c" },
    "SHOULDER": { bg: "rgba(230, 126, 34, 0.12)", fg: "#e67e22" },
    "TRICEP": { bg: "rgba(155, 89, 182, 0.12)", fg: "#9b59b6" },
    "BACK": { bg: "rgba(52, 152, 219, 0.12)", fg: "#3498db" },
    "BICEP": { bg: "rgba(244, 143, 177, 0.18)", fg: "#f48fb1" },
    "LEGS": { bg: "rgba(46, 204, 113, 0.12)", fg: "#2ecc71" },
    "CORE": { bg: "rgba(241, 196, 15, 0.12)", fg: "#f1c40f" },
    "CARDIO": { bg: "rgba(26, 188, 156, 0.12)", fg: "#1abc9c" }
  };
  const c = colors[category] || { bg: "var(--color-background-secondary)", fg: "var(--color-text-secondary)" };
  return `background: ${c.bg}; color: ${c.fg}; border: 0.5px solid ${c.fg}33;`;
}

function getCategoryDbHeaderStyle(category) {
  const colors = {
    "CHEST": { bg: "linear-gradient(90deg, rgba(231,76,60,0.15) 0%, rgba(231,76,60,0.02) 100%)", fg: "#e74c3c", border: "#e74c3c" },
    "SHOULDER": { bg: "linear-gradient(90deg, rgba(230,126,34,0.15) 0%, rgba(230,126,34,0.02) 100%)", fg: "#e67e22", border: "#e67e22" },
    "TRICEP": { bg: "linear-gradient(90deg, rgba(155,89,182,0.15) 0%, rgba(155,89,182,0.02) 100%)", fg: "#9b59b6", border: "#9b59b6" },
    "BACK": { bg: "linear-gradient(90deg, rgba(52,152,219,0.15) 0%, rgba(52,152,219,0.02) 100%)", fg: "#3498db", border: "#3498db" },
    "BICEP": { bg: "linear-gradient(90deg, rgba(244,143,177,0.2) 0%, rgba(244,143,177,0.04) 100%)", fg: "#f48fb1", border: "#f48fb1" },
    "LEGS": { bg: "linear-gradient(90deg, rgba(46,204,113,0.15) 0%, rgba(46,204,113,0.02) 100%)", fg: "#2ecc71", border: "#2ecc71" },
    "CORE": { bg: "linear-gradient(90deg, rgba(241,196,15,0.15) 0%, rgba(241,196,15,0.02) 100%)", fg: "#f1c40f", border: "#f1c40f" },
    "CARDIO": { bg: "linear-gradient(90deg, rgba(26,188,156,0.15) 0%, rgba(26,188,156,0.02) 100%)", fg: "#1abc9c", border: "#1abc9c" }
  };
  const c = colors[category] || { bg: "var(--color-background-secondary)", fg: "var(--color-text-secondary)", border: "var(--color-border-secondary)" };
  return `background: ${c.bg}; color: ${c.fg}; border-left: 4px solid ${c.border}; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;`;
}

function renderWorkout() {
  const activeColIdx = getWorkoutColIdx();
  const activeW = Math.floor((activeColIdx - 1) / 7) + 1;
  const activeDIdx = (activeColIdx - 1) % 7;
  const activeD = DB_DAYS[activeDIdx];
  const colKey = `col-${activeColIdx}`;

  const isSkipped = S.workout[colKey] && S.workout[colKey]["skipped_gym"];
  const walkingDist = S.workout[colKey] && S.workout[colKey]["walking_dist"] || "";

  // Exercises List for current day
  const dayExs = ALL_EXERCISES.filter(ex => ex.days.includes(activeD));
  let exercisesHtml = "";

  if (activeD === "Sun" || dayExs.length === 0) {
    exercisesHtml = `
      <div style="padding:40px 20px; text-align:center; color:var(--color-text-tertiary)">
        <i class="ti ti-massage" style="font-size:36px; display:block; margin-bottom:12px; color:var(--color-accent-orange)"></i>
        <div style="font-size:15px; font-weight:600; color:var(--color-text-primary);">Rest Day</div>
        <div style="font-size:12px; margin-top:4px;">No workouts scheduled today. Recovery is part of progress!</div>
      </div>
    `;
  } else if (isSkipped) {
    exercisesHtml = `
      <div style="background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-lg); padding:32px 20px; text-align:center; box-shadow: 0 2px 8px var(--color-shadow);">
        <i class="ti ti-walk" style="font-size:36px; display:block; margin-bottom:12px; color:var(--color-accent-blue)"></i>
        <div style="font-size:15px; font-weight:600; color:var(--color-text-primary);">Gym Skipped Today</div>
        <div style="font-size:12px; margin-top:4px; color:var(--color-text-tertiary);">Walking Logged: ${walkingDist || 'None'}</div>
      </div>
    `;
  } else {
    const rowsHtml = dayExs.map(ex => {
      const isChecked = S.workout[colKey] && S.workout[colKey][ex.name];
      const idSafe = ex.name.replace(/\s+/g, '_');
      return `
        <div class="workout-exercise-row" id="workout-row-${idSafe}" onclick="window.toggleWorkoutExercise('${ex.name.replace(/'/g, "\\'")}')">
          <span class="workout-cat-badge" style="${getCategoryColorStyle(ex.category)}">${ex.category}</span>
          <span class="workout-ex-name" style="flex:1; font-size:14px; font-weight:500; color:${isChecked ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)'}; text-decoration:${isChecked ? 'line-through' : 'none'}; transition:all 0.15s ease;">${ex.name}</span>
          <div class="workout-cbx-container">${cbx(isChecked)}</div>
        </div>
      `;
    }).join('');

    exercisesHtml = `
      <div style="background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-lg); overflow:hidden; box-shadow: 0 2px 8px var(--color-shadow);">
        ${rowsHtml}
      </div>
    `;
  }

  const routineName = WORKOUT_ROUTINES[activeD];
  const dateFormatted = `${activeD}, ${DS}`;

  const skippedGymSection = `
    <div style="background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-lg); padding:12px 14px; margin-bottom:20px; box-shadow: 0 2px 8px var(--color-shadow);">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="ti ti-ban" style="font-size:18px; color:var(--color-accent-red);"></i>
          <span style="font-size:13px; font-weight:500; color:var(--color-text-primary);">Skipped Gym</span>
        </div>
        <label class="switch">
          <input type="checkbox" id="skip-gym-toggle" ${isSkipped ? 'checked' : ''} onchange="window.toggleSkipGym(this.checked)">
          <span class="slider-toggle"></span>
        </label>
      </div>
      
      <div id="walking-dist-container" style="margin-top:12px; border-top:0.5px solid var(--color-border-tertiary); padding-top:12px; display:${isSkipped ? 'flex' : 'none'}; align-items:center; justify-content:space-between;">
        <span style="font-size:13px; color:var(--color-text-secondary);">Walking distance:</span>
        <select id="walking-dist-select" onchange="window.changeWalkingDist(this.value)" style="font-size:12px; border:0.5px solid var(--color-border-secondary); border-radius:6px; padding:4px 8px; background:var(--color-background-primary); color:var(--color-text-primary); font-family:var(--font-sans); outline:none; cursor:pointer;">
          <option value="" ${walkingDist === '' ? 'selected' : ''}>None</option>
          <option value="1 km" ${walkingDist === '1 km' ? 'selected' : ''}>1 km</option>
          <option value="2 km" ${walkingDist === '2 km' ? 'selected' : ''}>2 km</option>
          <option value="3 km" ${walkingDist === '3 km' ? 'selected' : ''}>3 km</option>
          <option value="4 km" ${walkingDist === '4 km' ? 'selected' : ''}>4 km</option>
          <option value="5 km" ${walkingDist === '5 km' ? 'selected' : ''}>5 km</option>
        </select>
      </div>
    </div>
  `;

  return `<div class="pg" style="padding:20px 0 20px">
    <button class="back-btn" onclick="goTo('home')">
      <i class="ti ti-arrow-left" style="font-size:15px" aria-hidden="true"></i>Back
    </button>
    <div style="font-size:24px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-serif);margin:18px 0 4px">Workout</div>
    <div style="font-size:12px;color:var(--color-text-tertiary);margin-bottom:20px">${dateFormatted} &nbsp;&middot;&nbsp; Week ${activeW} of 5</div>
    
    <div style="background:var(--color-background-secondary); border:0.5px solid var(--color-border-tertiary); border-left:3px solid var(--color-text-primary); border-radius:0 8px 8px 0; padding:12px 14px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:9px; font-weight:600; color:var(--color-text-tertiary); letter-spacing:0.09em; text-transform:uppercase; margin-bottom:2px;">Routine</div>
        <div style="font-size:15px; font-weight:600; color:var(--color-text-primary); font-family:var(--font-serif);">${routineName}</div>
      </div>
      <span style="font-size:9px; font-weight:700; background:var(--color-accent-green); color:#fff; padding:2px 6px; border-radius:4px;">ACTIVE TODAY</span>
    </div>

    ${skippedGymSection}
    ${exercisesHtml}

    <button class="workout-db-btn" onclick="goTo('workout_db')">
      <i class="ti ti-database"></i> Open Workout Database
    </button>
  </div>`;
}

function renderWorkoutDb() {
  let headerRow1 = `<th class="workout-db-sticky-col" rowspan="3" style="font-weight:600; text-align:left;">Exercise</th>`;
  headerRow1 += `<th colspan="7" style="background:var(--color-background-secondary); font-weight:600; border-bottom:0.5px solid var(--color-border-tertiary);">Week 1</th>`;
  headerRow1 += `<th colspan="7" style="background:var(--color-background-secondary); font-weight:600; border-bottom:0.5px solid var(--color-border-tertiary);">Week 2</th>`;
  headerRow1 += `<th colspan="7" style="background:var(--color-background-secondary); font-weight:600; border-bottom:0.5px solid var(--color-border-tertiary);">Week 3</th>`;
  headerRow1 += `<th colspan="7" style="background:var(--color-background-secondary); font-weight:600; border-bottom:0.5px solid var(--color-border-tertiary);">Week 4</th>`;
  headerRow1 += `<th colspan="7" style="background:var(--color-background-secondary); font-weight:600; border-bottom:0.5px solid var(--color-border-tertiary);">Week 5</th>`;

  let headerRow2 = "";
  for (let i = 0; i < 35; i++) {
    headerRow2 += `<th style="background:var(--color-background-secondary); font-size:10px; font-weight:600; border-bottom:0.5px solid var(--color-border-tertiary);">${DB_DAYS[i % 7]}</th>`;
  }

  let headerRow3 = "";
  for (let i = 0; i < 35; i++) {
    headerRow3 += `<th style="background:var(--color-background-secondary); font-size:10px; font-weight:600; border-bottom:0.5px solid var(--color-border-secondary);">${DB_DATES[i]}</th>`;
  }

  let tableRowsHtml = "";
  let prevCategory = null;

  for (const ex of ALL_EXERCISES) {
    if (ex.category !== prevCategory) {
      prevCategory = ex.category;
      const colStyle = getCategoryDbHeaderStyle(ex.category);
      tableRowsHtml += `
        <tr style="background:var(--color-background-secondary);">
          <td colspan="36" style="padding:6px 12px; border-bottom:0.5px solid var(--color-border-secondary); text-align:left; position:sticky; left:0; z-index:9; ${colStyle}">
            ${ex.category}
          </td>
        </tr>
      `;
    }
    
    let rowCells = `<td class="workout-db-sticky-col" style="text-align:left; font-weight:500; white-space:nowrap; font-size:11px;">${ex.name}</td>`;
    
    for (let i = 0; i < 35; i++) {
      const dayName = DB_DAYS[i % 7];
      const colKey = `col-${i + 1}`;
      const isChecked = S.workout && S.workout[colKey] && S.workout[colKey][ex.name];
      const isScheduled = ex.days.includes(dayName);
      
      let cellContent = "";
      let cellStyle = "";
      if (isChecked) {
        cellContent = "✓";
        cellStyle = "color:var(--color-accent-green); font-weight:bold; font-size:12px;";
      } else if (isScheduled) {
        cellContent = "–";
        cellStyle = "color:var(--color-text-tertiary); font-weight:normal; opacity:0.7;";
      }
      
      const idSafe = ex.name.replace(/\s+/g, '_');
      rowCells += `
        <td id="db-cell-${idSafe}-${colKey}" onclick="window.toggleDbCell('${ex.name.replace(/'/g, "\\'")}', '${colKey}', '${dayName}')" 
            style="cursor:pointer; user-select:none; -webkit-user-select:none; ${cellStyle}">
          ${cellContent}
        </td>
      `;
    }
    
    tableRowsHtml += `<tr>${rowCells}</tr>`;
  }

  // Render Walking Row
  let walkingCells = `<td class="workout-db-sticky-col" style="text-align:left; font-weight:600; font-size:11px; color:var(--color-text-secondary);">Walking (km)</td>`;
  for (let i = 0; i < 35; i++) {
    const colKey = `col-${i + 1}`;
    const dist = S.workout && S.workout[colKey] && S.workout[colKey]["walking_dist"] || "";
    walkingCells += `
      <td id="db-walking-cell-${colKey}" onclick="window.toggleWalkingDbCell('${colKey}')" 
          style="cursor:pointer; user-select:none; -webkit-user-select:none; font-weight:600; color:var(--color-accent-blue); font-size:11px;">
        ${dist ? dist.replace(" km", "") : ""}
      </td>
    `;
  }
  tableRowsHtml += `<tr style="border-top:1.5px solid var(--color-border-tertiary);">${walkingCells}</tr>`;

  // Done this week row
  let bottomCells = `<td class="workout-db-sticky-col" style="background:var(--color-background-secondary) !important; text-align:left; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-text-secondary);">DONE THIS WEEK →</td>`;
  for (let i = 0; i < 35; i++) {
    const colKey = `col-${i + 1}`;
    const count = getColumnCheckCount(colKey);
    bottomCells += `
      <td id="db-count-cell-${colKey}" style="background:var(--color-background-secondary); font-weight:700; color:var(--color-text-primary); font-size:11px;">
        ${count > 0 ? count : ""}
      </td>
    `;
  }
  tableRowsHtml += `<tr style="border-top:1.5px solid var(--color-border-secondary);">${bottomCells}</tr>`;

  return `<div class="pg" style="padding:20px 0 20px">
    <button class="back-btn" onclick="goTo('workout')">
      <i class="ti ti-arrow-left" style="font-size:15px" aria-hidden="true"></i>Back
    </button>
    <div style="display:flex; align-items:center; justify-content:space-between; margin:18px 0 10px">
      <div>
        <div style="font-size:24px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-serif)">Workout Database</div>
        <div style="font-size:11px;color:var(--color-text-tertiary);margin-top:2px;">Scroll horizontally. Tap cells to manually record checks / walking distance.</div>
      </div>
      <button onclick="window.resetWorkoutCycle()" style="font-size:11px;border:0.5px solid var(--color-accent-red);border-radius:6px;padding:5px 10px;background:transparent;color:var(--color-accent-red);font-family:var(--font-sans);cursor:pointer;display:inline-flex;align-items:center;gap:4px">
        <i class="ti ti-trash-x" style="font-size:12px"></i> Reset Cycle
      </button>
    </div>

    <div class="workout-db-table-container">
      <table class="workout-db-table">
        <thead>
          <tr style="border-bottom:0.5px solid var(--color-border-secondary);">${headerRow1}</tr>
          <tr style="border-bottom:0.5px solid var(--color-border-tertiary);">${headerRow2}</tr>
          <tr style="border-bottom:0.5px solid var(--color-border-secondary);">${headerRow3}</tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>
  </div>`;
}

function renderCalendar() {
  const today = new Date();
  if (S.calendar_year === null) S.calendar_year = today.getFullYear();
  if (S.calendar_month === null) S.calendar_month = today.getMonth();

  const year = S.calendar_year;
  const month = S.calendar_month;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startDayIdx = firstDay === 0 ? 6 : firstDay - 1;

  // Header
  const headerHtml = `
    <div class="calendar-header">
      <button class="calendar-nav-btn" onclick="window.changeCalendarMonth(-1)">
        <i class="ti ti-chevron-left"></i>
      </button>
      <div class="calendar-title">${monthNames[month]} ${year}</div>
      <button class="calendar-nav-btn" onclick="window.changeCalendarMonth(1)">
        <i class="ti ti-chevron-right"></i>
      </button>
    </div>
  `;

  // Grid Headers
  const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekdaysHtml = weekdayNames.map(name => `
    <div class="calendar-day-name">${name}</div>
  `).join('');

  let cellsHtml = "";
  // Empty slots at start of month
  for (let i = 0; i < startDayIdx; i++) {
    cellsHtml += `<div class="calendar-day-cell empty"></div>`;
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    cellsHtml += `
      <div class="calendar-day-cell ${isToday ? 'today' : ''}">
        ${d}
      </div>
    `;
  }

  // Fill remaining slots
  const totalCells = startDayIdx + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < remaining; i++) {
    cellsHtml += `<div class="calendar-day-cell empty"></div>`;
  }

  return `<div class="pg" style="padding:20px 0 20px">
    <button class="back-btn" onclick="goTo('home')">
      <i class="ti ti-arrow-left" style="font-size:15px" aria-hidden="true"></i>Back
    </button>
    <div style="font-size:24px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-serif);margin:18px 0 4px">Calendar</div>
    <div style="font-size:12px;color:var(--color-text-tertiary);margin-bottom:24px">View the current monthly schedule</div>

    ${headerHtml}

    <div class="calendar-grid">
      ${weekdaysHtml}
      ${cellsHtml}
    </div>
  </div>`;
}

window.toggleWorkoutExercise = (exName) => {
  if (navigator.vibrate) navigator.vibrate(50);
  const activeColIdx = getWorkoutColIdx();
  const colKey = `col-${activeColIdx}`;

  if (!S.workout[colKey]) {
    S.workout[colKey] = {};
  }

  const isChecked = !S.workout[colKey][exName];
  S.workout[colKey][exName] = isChecked;
  sv('kwig_workout_data', S.workout);
  
  const idSafe = exName.replace(/\s+/g, '_');
  const rowEl = document.getElementById(`workout-row-${idSafe}`);
  if (rowEl) {
    const textEl = rowEl.querySelector('.workout-ex-name');
    const cbxCont = rowEl.querySelector('.workout-cbx-container');
    if (textEl && cbxCont) {
      textEl.style.color = isChecked ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)';
      textEl.style.textDecoration = isChecked ? 'line-through' : 'none';
      cbxCont.innerHTML = cbx(isChecked);
    }
  } else {
    render();
  }
};

window.toggleDbCell = (exName, colKey, dayName) => {
  if (navigator.vibrate) navigator.vibrate(50);
  if (!S.workout[colKey]) {
    S.workout[colKey] = {};
  }

  const isChecked = !S.workout[colKey][exName];
  S.workout[colKey][exName] = isChecked;
  sv('kwig_workout_data', S.workout);
  
  const idSafe = exName.replace(/\s+/g, '_');
  const cellEl = document.getElementById(`db-cell-${idSafe}-${colKey}`);
  if (cellEl) {
    const isScheduled = ALL_EXERCISES.find(ex => ex.name === exName).days.includes(dayName);
    if (isChecked) {
      cellEl.textContent = "✓";
      cellEl.style.color = "var(--color-accent-green)";
      cellEl.style.fontWeight = "bold";
      cellEl.style.fontSize = "12px";
      cellEl.style.opacity = "1";
    } else if (isScheduled) {
      cellEl.textContent = "–";
      cellEl.style.color = "var(--color-text-tertiary)";
      cellEl.style.fontWeight = "normal";
      cellEl.style.fontSize = "11px";
      cellEl.style.opacity = "0.7";
    } else {
      cellEl.textContent = "";
      cellEl.style.color = "";
      cellEl.style.fontWeight = "";
      cellEl.style.fontSize = "";
    }
    
    // Update count row inline
    const count = getColumnCheckCount(colKey);
    const countEl = document.getElementById(`db-count-cell-${colKey}`);
    if (countEl) {
      countEl.textContent = count > 0 ? count : "";
    }
  } else {
    render();
  }
};

window.toggleSkipGym = (checked) => {
  if (navigator.vibrate) navigator.vibrate(50);
  const activeColIdx = getWorkoutColIdx();
  const colKey = `col-${activeColIdx}`;
  
  if (!S.workout[colKey]) {
    S.workout[colKey] = {};
  }
  
  S.workout[colKey]["skipped_gym"] = checked;
  if (!checked) {
    S.workout[colKey]["walking_dist"] = "";
  }
  sv('kwig_workout_data', S.workout);
  render();
};

window.changeWalkingDist = (val) => {
  if (navigator.vibrate) navigator.vibrate(40);
  const activeColIdx = getWorkoutColIdx();
  const colKey = `col-${activeColIdx}`;
  
  if (!S.workout[colKey]) {
    S.workout[colKey] = {};
  }
  
  S.workout[colKey]["walking_dist"] = val;
  sv('kwig_workout_data', S.workout);
  render();
};

window.toggleWalkingDbCell = (colKey) => {
  if (navigator.vibrate) navigator.vibrate(50);
  if (!S.workout[colKey]) {
    S.workout[colKey] = {};
  }
  
  const current = S.workout[colKey]["walking_dist"] || "";
  const cycle = ["", "1 km", "2 km", "3 km", "4 km", "5 km"];
  const nextIdx = (cycle.indexOf(current) + 1) % cycle.length;
  const nextVal = cycle[nextIdx];
  
  S.workout[colKey]["walking_dist"] = nextVal;
  S.workout[colKey]["skipped_gym"] = nextVal !== "";
  
  sv('kwig_workout_data', S.workout);
  
  const cellEl = document.getElementById(`db-walking-cell-${colKey}`);
  if (cellEl) {
    cellEl.textContent = nextVal ? nextVal.replace(" km", "") : "";
  } else {
    render();
  }
};

window.changeCalendarMonth = (offset) => {
  if (navigator.vibrate) navigator.vibrate(40);
  let newMonth = S.calendar_month + offset;
  let newYear = S.calendar_year;
  
  if (newMonth < 0) {
    newMonth = 11;
    newYear -= 1;
  } else if (newMonth > 11) {
    newMonth = 0;
    newYear += 1;
  }
  
  S.calendar_month = newMonth;
  S.calendar_year = newYear;
  render();
};

window.resetWorkoutCycle = () => {
  const conf = confirm("Are you sure you want to reset the workout cycle? This will clear all recorded checks.");
  if (!conf) return;
  
  if (navigator.vibrate) navigator.vibrate(100);
  const monday = getMondayOfCurrentWeek(new Date());
  S.workout_cycle_start = getLocalDateString(monday);
  S.workout = {};
  sv('kwig_workout_cycle_start', S.workout_cycle_start);
  sv('kwig_workout_data', S.workout);
  
  render();
};

// Initial run
render();
loadAll().then(() => {
  render();
  loadWd().then(() => render());
});
