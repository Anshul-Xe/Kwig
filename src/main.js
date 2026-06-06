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

function updateThemeUI(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    themeIcon.className = 'ti ti-sun';
  } else {
    document.documentElement.classList.remove('dark');
    themeIcon.className = 'ti ti-moon';
  }
}

// Initialize theme
(async () => {
  const savedTheme = localStorage.getItem('app-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
  updateThemeUI(isDark);
})();

// Add toggle click handler
themeToggleBtn.addEventListener('click', () => {
  const isCurrentlyDark = document.documentElement.classList.contains('dark');
  const newDarkState = !isCurrentlyDark;
  localStorage.setItem('app-theme', newDarkState ? 'dark' : 'light');
  updateThemeUI(newDarkState);
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
  notifiers: {
    water: { enabled: false, interval: 1 },
    walk: { enabled: false, interval: 1 }
  }
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

const getHabitTotals = (pcState, hcState) => {
  const activeS = SB.filter(x => !S.deleted_defaults.includes(x.id));
  const activeF = FB.filter(x => !S.deleted_defaults.includes(x.id));
  const activeH = HB.filter(x => !S.deleted_defaults.includes(x.id));
  return {
    study: activeS.length ? Math.round(activeS.filter(x => pcState[x.id]).length / activeS.length * 100) : 0,
    fun: activeF.length ? Math.round(activeF.filter(x => pcState[x.id]).length / activeF.length * 100) : 0,
    health: activeH.length ? Math.round(activeH.filter(x => hcState[x.id]).length / activeH.length * 100) : 0
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
  for (let i = 0; i < 30; i++) {
    const d = new Date(_t);
    d.setDate(d.getDate() - i);
    const dk = gdk(d);
    const p = await ld(`prod-${dk}`, {}), h = await ld(`health-${dk}`, {}), ta = await ld(`tasks-${dk}`, []);
    const totals = getHabitTotals(p, h);
    const tDn = ta.filter(t => t.done).length;
    
    const customS = await ld('cs', []), customF = await ld('cf', []), customH = await ld('ch', []);
    const totalCount = SB.length + customS.length + FB.length + customF.length + HB.length + customH.length + ta.length;
    
    if (totalCount > 0 || i === 0) {
      rows.push({
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
  return `<div class="cr" onclick="togI('${item.id}','${type}')" 
    data-del-type="habit" 
    data-del-id="${item.id}" 
    data-del-sec="${sec}" 
    data-del-name="${item.label}"
    style="display:flex;align-items:center;gap:8px;padding:12px 0;border-bottom:0.5px solid var(--color-border-tertiary)">
    <span style="flex:1;font-size:15px;color:${col};text-decoration:${dec};transition:all 0.2s">${item.label}</span>
    ${cbx(chk)}
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
  
  const tRows = S.tasks.map(t => {
    const od = t.deadline && t.deadline < tiso() && !t.done;
    const dlColor = od ? 'var(--color-accent-red)' : 'var(--color-text-secondary)';
    return `<div class="cr" 
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

  const tForm = S.as === 'task' ? `<div style="padding:12px;border-top:0.5px solid var(--color-border-tertiary);background:var(--color-background-secondary);border-radius:var(--border-radius-md);margin-top:8px">
    <input id="ni-task" type="text" placeholder="Task name..." style="width:100%;font-size:14px;border:none;background:transparent;color:var(--color-text-primary);margin-bottom:8px;font-family:var(--font-sans);box-sizing:border-box" onkeydown="if(event.key==='Enter')confT();if(event.key==='Escape')cancelA()">
    <div style="display:flex;align-items:center;gap:7px">
      <select id="ni-pri" style="font-size:12px;border:0.5px solid var(--color-border-secondary);border-radius:4px;padding:4px 6px;background:var(--color-background-primary);color:var(--color-text-primary);font-family:var(--font-sans);cursor:pointer">
        <option>High</option>
        <option selected>Medium</option>
        <option>Low</option>
      </select>
      <input id="ni-dl" type="date" style="flex:1;font-size:12px;border:0.5px solid var(--color-border-secondary);border-radius:4px;padding:4px 6px;background:var(--color-background-primary);color:var(--color-text-primary);font-family:var(--font-sans)">
      <button onclick="cancelA()" style="background:none;border:0.5px solid var(--color-border-secondary);border-radius:4px;padding:4px 8px;font-size:12px;color:var(--color-text-secondary);cursor:pointer;font-family:var(--font-sans)">Cancel</button>
      <button onclick="confT()" style="background:var(--color-text-primary);border:none;border-radius:4px;padding:4px 10px;font-size:12px;color:var(--color-background-primary);cursor:pointer;font-family:var(--font-sans);font-weight:500">Add</button>
    </div>
  </div>` : '';

  const tEmpty = S.tasks.length === 0 && S.as !== 'task' ? `<div style="padding:16px 12px;font-size:13px;color:var(--color-text-tertiary);text-align:center">No tasks — add one above</div>` : '';
  
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
    
    <div class="tc f2" onclick="nxt()" style="background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-left:3px solid var(--color-text-primary);border-radius:0 8px 8px 0;padding:14px 16px 12px;margin-bottom:24px">
      <div style="font-size:10px;font-weight:600;color:var(--color-text-tertiary);letter-spacing:0.09em;text-transform:uppercase;margin-bottom:8px">Thought of the day</div>
      <div id="tt" style="font-size:14px;color:var(--color-text-primary);font-family:var(--font-serif);font-style:italic;line-height:1.65;margin-bottom:10px">&ldquo;${THOUGHTS[S.ti]}&rdquo;</div>
      <div id="th" style="font-size:11px;color:var(--color-text-tertiary);text-align:right">${S.ti + 1}/${THOUGHTS.length} &middot; tap for next</div>
    </div>
    
    <div class="f3">
      <div style="font-size:10px;font-weight:600;color:var(--color-text-tertiary);letter-spacing:0.09em;text-transform:uppercase;margin-bottom:10px">Today's progress</div>
      <div style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);display:flex;margin-bottom:24px;box-shadow: 0 2px 8px var(--color-shadow)">
        <div class="tap" onclick="goTo('productivity')" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 8px;border-radius:var(--border-radius-lg) 0 0 var(--border-radius-lg)">
          ${ring(pD, prod.length, 86, 6, 'var(--color-text-primary)')}
          <div style="font-size:10px;font-weight:600;color:var(--color-text-secondary);letter-spacing:0.07em;text-transform:uppercase">Productivity</div>
          <div style="font-size:11px;color:var(--color-text-tertiary)">${pD} of ${prod.length}</div>
        </div>
        <div style="width:0.5px;background:var(--color-border-tertiary);margin:12px 0"></div>
        <div class="tap" onclick="goTo('health')" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 8px;border-radius:0 var(--border-radius-lg) var(--border-radius-lg) 0">
          ${ring(hD, hlth.length, 86, 6, 'var(--color-text-secondary)')}
          <div style="font-size:10px;font-weight:600;color:var(--color-text-secondary);letter-spacing:0.07em;text-transform:uppercase">Health</div>
          <div style="font-size:11px;color:var(--color-text-tertiary)">${hD} of ${hlth.length}</div>
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
        ${tRows}${tEmpty}${tForm}
      </div>
    </div>
    
    <!-- Reminders / Notifiers -->
    ${notifierHtml}
    
    <div class="f5">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:10px;font-weight:600;color:var(--color-text-tertiary);letter-spacing:0.09em;text-transform:uppercase">Weekly progress</span>
        <button onclick="goTo('database')" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--color-text-secondary);font-family:var(--font-sans);padding:0;display:inline-flex;align-items:center;gap:3px">
          View all <i class="ti ti-arrow-up-right" style="font-size:12px" aria-hidden="true"></i>
        </button>
      </div>
      <div onclick="goTo('database')" class="tap" style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;box-shadow: 0 2px 8px var(--color-shadow)">
        ${wk}
      </div>
    </div>
  </div>`;
}

function renderProd() {
  const sIds = new Set(SB.map(x => x.id)), fIds = new Set(FB.map(x => x.id));
  const sR = si().map(i => irow(i, !!S.pc[i.id], 'prod', !sIds.has(i.id), 'study')).join('');
  const fR = fi().map(i => irow(i, !!S.pc[i.id], 'prod', !fIds.has(i.id), 'fun')).join('');
  return `<div class="pg" style="padding:20px 0 20px">
    <button class="back-btn" onclick="goTo('home')">
      <i class="ti ti-arrow-left" style="font-size:15px" aria-hidden="true"></i>Back
    </button>
    <div style="font-size:24px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-serif);margin:18px 0 4px">Productivity</div>
    <div style="font-size:12px;color:var(--color-text-tertiary);margin-bottom:28px">${DS}</div>
    
    ${shdr('Study', "addR('study')")}
    <div style="border-top:0.5px solid var(--color-border-tertiary);margin-bottom:28px">
      ${sR}${S.as === 'study' ? aiform('study') : ''}
    </div>
    
    ${shdr('Fun', "addR('fun')", '28px')}
    <div style="border-top:0.5px solid var(--color-border-tertiary)">
      ${fR}${S.as === 'fun' ? aiform('fun') : ''}
    </div>
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

  return `<div class="pg" style="padding:20px 0 20px">
    <button class="back-btn" onclick="goTo('home')">
      <i class="ti ti-arrow-left" style="font-size:15px" aria-hidden="true"></i>Back
    </button>
    <div style="font-size:24px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-serif);margin:18px 0 4px">Health</div>
    <div style="font-size:12px;color:var(--color-text-tertiary);margin-bottom:28px">${DS}</div>
    
    ${shdr('Daily habits', "addR('health')")}
    <div style="border-top:0.5px solid var(--color-border-tertiary)">
      ${hR}${S.as === 'health' ? aiform('health') : ''}
    </div>
    
    <!-- Water Intake Scale -->
    ${waterSliderHtml}
    
    <!-- Consciousness Scale -->
    ${consciousSliderHtml}
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
  
  const rows = S.db.map(d => `<tr class="dbr" style="${d.isToday ? 'background:var(--color-background-secondary);' : ''}">
    <td style="padding:11px 4px 11px 12px;font-size:12px;color:${d.isToday ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'};font-weight:${d.isToday ? 600 : 400}">${d.fd}</td>
    <td style="padding:11px 4px;text-align:center"><span style="font-size:11px;font-weight:600;color:${pc(d.study)}">${d.study}%</span></td>
    <td style="padding:11px 4px;text-align:center"><span style="font-size:11px;font-weight:600;color:${pc(d.fun)}">${d.fun}%</span></td>
    <td style="padding:11px 4px;text-align:center"><span style="font-size:11px;font-weight:600;color:${pc(d.health)}">${d.health}%</span></td>
    <td style="padding:11px 12px 11px 4px;text-align:center;font-size:11px;color:var(--color-text-secondary)">${d.tTotal > 0 ? d.tDone + '/' + d.tTotal : '—'}</td>
  </tr>`).join('');

  return `<div class="pg" style="padding:20px 0 20px">
    <button class="back-btn" onclick="goTo('home')">
      <i class="ti ti-arrow-left" style="font-size:15px" aria-hidden="true"></i>Back
    </button>
    <div style="font-size:24px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-serif);margin:18px 0 4px">Database</div>
    <div style="font-size:12px;color:var(--color-text-tertiary);margin-bottom:24px">${S.db.length} day${S.db.length !== 1 ? 's' : ''} tracked &nbsp;&middot;&nbsp; last 30 days</div>
    
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
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

// "The Void" - Notes Manager Page
function renderNotes() {
  const rows = S.pages.map(p => `
    <tr class="notes-tr" onclick="window.openPage('${p.id}')">
      <td class="notes-td notes-td-title">
        <i class="ti ti-file-text" aria-hidden="true"></i>
        <span>${p.name || 'Untitled'}</span>
      </td>
      <td class="notes-td notes-td-date">${p.date}</td>
      <td class="notes-td" style="text-align: right; width: 60px;" onclick="event.stopPropagation();">
        <button class="notes-delete-btn" onclick="window.confirmDeletePage('${p.id}', '${p.name.replace(/'/g, "\\'")}')" aria-label="Delete note">
          <i class="ti ti-trash" aria-hidden="true"></i>
        </button>
      </td>
    </tr>
  `).join('');
  
  const empty = S.pages.length === 0 ? `
    <div style="padding:48px 0; text-align:center; color:var(--color-text-tertiary);">
      <i class="ti ti-notebook" style="font-size: 32px; margin-bottom: 12px; display:block;" aria-hidden="true"></i>
      <div style="font-size: 14px; font-weight: 500;">No notes found</div>
      <div style="font-size: 11px; margin-top: 4px;">Click the button below to add your first page</div>
    </div>
  ` : `<table class="notes-table"><tbody>${rows}</tbody></table>`;
  
  return `<div class="pg" style="padding:20px 0 20px">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 24px;">
      <div>
        <div style="font-size:24px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-serif)">The Void</div>
        <div style="font-size:12px;color:var(--color-text-tertiary);margin-top:2px;">Your personal thought canvas</div>
      </div>
      <button class="add-btn" onclick="window.createNewPage()">+ New Page</button>
    </div>
    
    <div style="background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-lg); padding: 8px 12px; box-shadow: 0 2px 8px var(--color-shadow)">
      ${empty}
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

function render() {
  const app = document.getElementById('app');
  if (!app) return;
  
  // Highlight active sidebar links
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  if (S.page === 'home') document.getElementById('sb-home')?.classList.add('active');
  else if (S.page === 'database') document.getElementById('sb-db')?.classList.add('active');
  else if (S.page === 'notes' || S.page === 'editor') document.getElementById('sb-void-mgr')?.classList.add('active');
  
  if (S.page === 'home') app.innerHTML = renderHome();
  else if (S.page === 'productivity') app.innerHTML = renderProd();
  else if (S.page === 'health') app.innerHTML = renderHealth();
  else if (S.page === 'database') app.innerHTML = renderDb();
  else if (S.page === 'notes') app.innerHTML = renderNotes();
  else if (S.page === 'editor') app.innerHTML = renderEditor();
}

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
  if (type === 'prod') {
    S.pc[id] = !S.pc[id];
    sv(`prod-${TK}`, S.pc);
  } else {
    S.hc[id] = !S.hc[id];
    sv(`health-${TK}`, S.hc);
  }
  updWd();
  render();
};

window.togT = id => {
  const t = S.tasks.find(x => x.id === id);
  if (t) {
    t.done = !t.done;
    sv(`tasks-${TK}`, S.tasks);
    render();
  }
};

window.cycP = id => {
  const t = S.tasks.find(x => x.id === id);
  if (!t) return;
  const o = ['High', 'Medium', 'Low'];
  t.priority = o[(o.indexOf(t.priority || 'Medium') + 1) % 3];
  sv(`tasks-${TK}`, S.tasks);
  render();
};

window.addR = sec => {
  S.as = sec;
  render();
  setTimeout(() => {
    const el = document.getElementById(sec === 'task' ? 'ni-task' : `ni-${sec}`);
    if (el) el.focus();
  }, 60);
};

window.cancelA = () => {
  S.as = null;
  render();
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
  if (sec === 'study') {
    S.cs.push(item);
    sv('cs', S.cs);
  } else if (sec === 'fun') {
    S.cf.push(item);
    sv('cf', S.cf);
  } else {
    S.ch.push(item);
    sv('ch', S.ch);
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

// 8. Sidebar & Drive Alert functions
window.openSidebar = () => {
  document.getElementById('sidebar').classList.add('active');
  document.getElementById('sidebar-overlay').classList.add('active');
  document.getElementById('menu-btn').querySelector('i').style.transform = 'rotate(90deg)';
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
  
  // Render sublist contents (CSS manages expand/collapse height animations)
  listEl.innerHTML = S.pages.map(p => {
    const isActive = S.page === 'editor' && S.activePageId === p.id;
    return `<a href="#" class="sidebar-page-item ${isActive ? 'active' : ''}" onclick="event.preventDefault(); window.openPage('${p.id}'); window.closeSidebar();">
      <i class="ti ti-file-text" aria-hidden="true"></i><span>${p.name || 'Untitled'}</span>
    </a>`;
  }).join('');
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
  const useCustom = confirm("Would you like to enter a custom Google Client ID?\n(Click Cancel to use Kwig's default Google client ID for standard testing)");
  let clientId = S.gdriveClientId;
  if (useCustom) {
    const input = prompt("Enter your Google Client ID:", S.gdriveClientId);
    if (input && input.trim()) {
      clientId = input.trim();
      S.gdriveClientId = clientId;
      sv('gdrive_client_id', clientId);
    } else {
      return;
    }
  }
  
  const redirectUri = 'https://localhost';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}&prompt=select_account`;
  
  window.location.href = authUrl;
};

window.logoutGoogleDrive = async () => {
  S.gdriveToken = null;
  await sv('gdrive_token', null);
  window.renderAccountSync();
  alert("Signed out from Google Account.");
};

window.renderAccountSync = () => {
  const container = document.getElementById('sidebar-account-container');
  if (!container) return;
  
  if (!S.gdriveToken) {
    container.innerHTML = `
      <a href="#" class="sidebar-item" id="sb-sync-login" onclick="event.preventDefault(); window.startGoogleDriveLogin();">
        <i class="ti ti-brand-google" aria-hidden="true"></i> Sign In with Google
      </a>
    `;
  } else {
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:4px; padding: 2px 4px;">
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
      if (!createMetaRes.ok) throw new Error("Failed to initialize Google Drive backup space.");
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
    
    if (!res.ok) throw new Error(`Google Drive API upload status: ${res.status}`);
    alert("Data successfully backed up to your Google Drive! (kwig_backup.json)");
  } catch (err) {
    console.error("Cloud backup sync error:", err);
    alert("Cloud Sync failed:\n" + err.message + "\n\nTip: Signing out and back in to refresh credentials can fix authorization errors.");
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
    if (!res.ok) throw new Error("Failed to fetch backup file from Drive.");
    
    const backupData = await res.json();
    if (!backupData || !backupData.localStorage) throw new Error("Malformed backup data.");
    
    const count = Object.keys(backupData.localStorage).length;
    const dateStr = new Date(backupData.timestamp || Date.now()).toLocaleString();
    
    if (confirm(`Backup found from: ${dateStr}\n\nThis will restore ${count} keys and overwrite all current habits, logs, and notes on this device. Do you want to proceed?`)) {
      localStorage.clear();
      for (const [key, val] of Object.entries(backupData.localStorage)) {
        localStorage.setItem(key, val);
      }
      alert("Data successfully restored from Google Drive! Restarting application...");
      window.location.reload();
    }
  } catch (err) {
    console.error("Cloud download sync error:", err);
    alert("Failed to restore backup:\n" + err.message);
  } finally {
    if (btn) btn.innerHTML = originalHtml;
    window.renderAccountSync();
  }
};

// 9. Notes Page Manager State functions
window.createNewPage = () => {
  const newId = uid();
  const formatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const dateString = new Date().toLocaleDateString('en-US', formatOptions);
  
  const newPage = {
    id: newId,
    name: "Untitled",
    date: dateString,
    content: ""
  };
  
  S.pages.unshift(newPage);
  sv('kwig_pages', S.pages);
  
  window.openPage(newId);
  window.closeSidebar();
};

window.openPage = id => {
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

function closeDeleteModal() {
  const modal = document.getElementById('delete-modal');
  if (modal) {
    modal.classList.remove('active');
  }
  pendingDelete = null;
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

document.getElementById('modal-confirm-btn').addEventListener('click', () => {
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
    return;
  }
  swipeStartX = e.touches[0].clientX;
  swipeStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
  if (swipeStartX === null || swipeStartY === null) return;
  
  const diffX = swipeStartX - e.changedTouches[0].clientX;
  const diffY = Math.abs(swipeStartY - e.changedTouches[0].clientY);
  
  // Right-to-left swipe (swiping leftwards) triggers goBack
  if (diffX > 80 && diffY < 60) {
    window.goBack();
  }
  
  swipeStartX = null;
  swipeStartY = null;
}, { passive: true });

// Initial run
render();
loadAll().then(() => {
  render();
  loadWd().then(() => render());
});
