/* Core Application Logic for Kwig Mobile App */
import { LocalNotifications } from '@capacitor/local-notifications';

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
  as: null,
  wd: null,
  db: null,
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
  S.deleted_defaults = await ld('deleted_defaults', []);
  S.notifiers = await ld('notifiers', {
    water: { enabled: false, interval: 1 },
    walk: { enabled: false, interval: 1 }
  });
  
  // Apply web timers fallback if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    setupWebTimers();
  }
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
    
    // Check custom habits loaded for that specific day
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

function render() {
  const app = document.getElementById('app');
  if (!app) return;
  if (S.page === 'home') app.innerHTML = renderHome();
  else if (S.page === 'productivity') app.innerHTML = renderProd();
  else if (S.page === 'health') app.innerHTML = renderHealth();
  else app.innerHTML = renderDb();
}

window.goTo = p => {
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

// Fixed persistence storage keys for deletion (original had custom-study, loadAll had cs)
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

// 8. Long Press (Hold-to-Delete) Gesture Logic
let holdTimer = null;
let holdTarget = null;
let holdTriggered = false;
let pendingDelete = null;
let startX = 0, startY = 0;

function handleStart(e, targetRow) {
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

function handleEnd() {
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
  handleStart(e, row);
}, { passive: true });

document.addEventListener('touchmove', e => {
  if (!holdTarget) return;
  const touch = e.touches[0];
  const diffX = Math.abs(touch.clientX - startX);
  const diffY = Math.abs(touch.clientY - startY);
  if (diffX > 10 || diffY > 10) {
    handleEnd();
  }
}, { passive: true });

document.addEventListener('touchend', handleEnd, { passive: true });

document.addEventListener('mousedown', e => {
  const row = e.target.closest('.cr');
  if (!row || e.button !== 0) return;
  startX = e.clientX;
  startY = e.clientY;
  handleStart(e, row);
});

document.addEventListener('mousemove', e => {
  if (!holdTarget) return;
  const diffX = Math.abs(e.clientX - startX);
  const diffY = Math.abs(e.clientY - startY);
  if (diffX > 10 || diffY > 10) {
    handleEnd();
  }
});

document.addEventListener('mouseup', handleEnd);

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
    } else if (type === 'habit') {
      // Check if it's default habit
      const isDefault = SB.some(x => x.id === id) || FB.some(x => x.id === id) || HB.some(x => x.id === id);
      if (isDefault) {
        S.deleted_defaults.push(id);
        sv('deleted_defaults', S.deleted_defaults);
      } else {
        // Custom habit
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

// Initial run
render();
loadAll().then(() => {
  render();
  loadWd().then(() => render());
});
