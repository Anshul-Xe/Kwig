/* Core Application Logic for Daily Tracker Mobile App */

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
  tasks: [],
  as: null,
  wd: null,
  db: null
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

async function loadAll() {
  S.pc = await ld(`prod-${TK}`, {});
  S.hc = await ld(`health-${TK}`, {});
  S.tasks = await ld(`tasks-${TK}`, []);
  S.cs = await ld('cs', []);
  S.cf = await ld('cf', []);
  S.ch = await ld('ch', []);
}

const si = () => [...SB, ...S.cs];
const fi = () => [...FB, ...S.cf];
const hi = () => [...HB, ...S.ch];
const ai = () => [...si(), ...fi()];

const uid = () => Math.random().toString(36).slice(2, 9);
const gdk = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const sd = d => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
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
  t.study = Math.round(SB.filter(x => S.pc[x.id]).length / SB.length * 100);
  t.fun = Math.round(FB.filter(x => S.pc[x.id]).length / FB.length * 100);
  t.health = Math.round(HB.filter(x => S.hc[x.id]).length / HB.length * 100);
}

async function loadWd() {
  const rows = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(_t);
    d.setDate(d.getDate() - i);
    const dk = gdk(d);
    const p = await ld(`prod-${dk}`, {}), h = await ld(`health-${dk}`, {});
    rows.push({
      label: i === 0 ? 'Today' : sd(d),
      isToday: i === 0,
      study: Math.round(SB.filter(x => p[x.id]).length / SB.length * 100),
      fun: Math.round(FB.filter(x => p[x.id]).length / FB.length * 100),
      health: Math.round(HB.filter(x => h[x.id]).length / HB.length * 100)
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
    const sD = SB.filter(x => p[x.id]).length, fD = FB.filter(x => p[x.id]).length, hD = HB.filter(x => h[x.id]).length, tDn = ta.filter(t => t.done).length;
    if (sD + fD + hD + ta.length > 0 || i === 0) {
      rows.push({
        fd: `${DAYS[d.getDay()].slice(0, 3)}, ${sd(d)}`,
        isToday: i === 0,
        study: Math.round(sD / SB.length * 100),
        fun: Math.round(fD / FB.length * 100),
        health: Math.round(hD / HB.length * 100),
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
  const del = isCus ? `<button onclick="event.stopPropagation();delC('${sec}','${item.id}')" style="background:none;border:none;cursor:pointer;padding:0 4px;color:var(--color-text-tertiary);flex-shrink:0" aria-label="Delete habit"><i class="ti ti-x" style="font-size:12px" aria-hidden="true"></i></button>` : '';
  return `<div class="cr" onclick="togI('${item.id}','${type}')" style="display:flex;align-items:center;gap:8px;padding:12px 0;border-bottom:0.5px solid var(--color-border-tertiary)">
    <span style="flex:1;font-size:15px;color:${col};text-decoration:${dec};transition:all 0.2s">${item.label}</span>
    ${del}
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
    return `<div class="cr" style="display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:0.5px solid var(--color-border-tertiary)">
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

// Initial run
render();
loadAll().then(() => {
  render();
  loadWd().then(() => render());
});
