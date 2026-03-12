/* ── EA for the Agentic Organisation ─────────────────── */
/* Single JS file: navigation, tabs, content, assessment  */

/* ── State ───────────────────────────────────────────── */
let siteData = null;
let pageData = null;
let currentSubtopic = null;
let currentTab = 'overview';
let sidebarCollapsed = false;
let sidebarMobileOpen = false;

const STORAGE_KEY = 'ea-agentic-assessment';

/* ── Init ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  siteData = await loadJSON('data/site.json');
  if (!siteData) return;

  renderAppShell();

  const page = getPageId();
  if (page === 'home') {
    await initHome();
  } else if (page === 'overview') {
    await initOverview();
  } else if (page === 'new-capabilities') {
    pageData = await loadJSON('data/new-capabilities-detail.json');
    if (pageData) initNewCapabilitiesPage();
  } else {
    // Peek at JSON to detect page type
    const peek = await loadJSON(`data/${page}.json`);
    if (peek && peek.page_type === 'industry') {
      pageData = peek;
      initIndustryPage();
    } else if (peek && peek.page_type === 'architecture') {
      pageData = peek;
      initArchitecturePage();
    } else if (peek && peek.page_type === 'operating-model') {
      pageData = peek;
      initOperatingModelPage();
    } else if (peek && peek.page_type === 'new-capabilities') {
      pageData = peek;
      initNewCapabilitiesPage();
    } else if (peek && peek.page_type === 'capabilities') {
      pageData = peek;
      initCapabilitiesPage();
    } else if (peek && peek.page_type === 'maturity') {
      pageData = peek;
      initMaturityPage();
    } else if (peek && peek.page_type === 'governance') {
      pageData = peek;
      initGovernancePage();
    } else if (peek && peek.page_type === 'people') {
      pageData = peek;
      initPeoplePage();
    } else if (peek && peek.page_type === 'processes') {
      pageData = peek;
      initProcessesPage();
    } else if (peek && peek.page_type === 'tools-repository') {
      pageData = peek;
      initToolsRepositoryPage();
    } else if (peek && peek.page_type === 'agentic-ea') {
      pageData = peek;
      initAgenticEAPage();
    } else if (peek && peek.page_type === 'poc-demo') {
      pageData = peek;
      initPocDemoPage();
    } else {
      await initConceptPage(page);
    }
  }
});

/* ── Utilities ───────────────────────────────────────── */
function getPageId() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  if (path === 'index.html' || path === '') return 'home';
  return path.replace('.html', '');
}

async function loadJSON(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

function getAssessment() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch { return {}; }
}

function saveAssessment(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function maturityColor(score) {
  if (score <= 1.5) return 'var(--maturity-1)';
  if (score <= 2.5) return 'var(--maturity-2)';
  if (score <= 3.5) return 'var(--maturity-3)';
  if (score <= 4.5) return 'var(--maturity-4)';
  return 'var(--maturity-5)';
}

function impactBadge(cat) {
  const labels = { A: 'Modify', B: 'Extend', C: 'New', U: 'Unchanged' };
  const classes = { A: 'impact-modify', B: 'impact-extend', C: 'impact-new', U: 'impact-unchanged' };
  return `<span class="impact-badge ${classes[cat] || 'impact-modify'}">${labels[cat] || cat}</span>`;
}

function chevronSVG() {
  return `<svg class="finding-chevron" ${ICON_ATTRS} width="20" height="20"><path d="m6 9 6 6 6-6"/></svg>`;
}

/* ── App Shell: Sidebar + Topbar ────────────────────── */
const ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
const NAV_ICONS = {
  'overview': `<svg ${ICON_ATTRS}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="11" width="7" height="10" rx="1"/></svg>`,
  'ea-operating-model': `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  'architecture-reference': `<svg ${ICON_ATTRS}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>`,
  'new-capabilities': `<svg ${ICON_ATTRS}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`,
  'capabilities': `<svg ${ICON_ATTRS}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>`,
  'governance': `<svg ${ICON_ATTRS}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M9 15l2 2 4-4"/></svg>`,
  'people': `<svg ${ICON_ATTRS}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  'processes': `<svg ${ICON_ATTRS}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`,
  'tools-repository': `<svg ${ICON_ATTRS}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/></svg>`,
  'maturity': `<svg ${ICON_ATTRS}><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 12 18.469a3.374 3.374 0 0 0-.964-1.46z"/></svg>`,
  'industries': `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`
};

function renderAppShell() {
  const sidebar = document.getElementById('app-sidebar');
  const topbar = document.getElementById('topbar');
  if (!sidebar || !topbar || !siteData) return;

  const page = getPageId();
  const currentNav = siteData.nav.find(n => n.id === page) ||
    siteData.nav.find(n => n.children && n.children.some(c => c.id === page));
  const pageLabel = currentNav ? (currentNav.children ?
    (currentNav.children.find(c => c.id === page) || {}).label || currentNav.label : currentNav.label)
    : siteData.brand;

  // ── Sidebar HTML ──
  let sHtml = '';
  sHtml += '<div class="app-sidebar-header">';
  sHtml += '<a class="app-sidebar-brand" href="overview.html">EA \u00B7 Agentic Org</a>';
  sHtml += '<button class="sidebar-collapse-btn" aria-label="Collapse sidebar"><svg ${ICON_ATTRS} width="16" height="16"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg></button>';
  sHtml += '</div>';
  sHtml += '<nav class="app-sidebar-nav">';

  for (const link of siteData.nav) {
    if (link.children) {
      const childActive = link.children.some(c => c.id === page);
      sHtml += '<div class="sidebar-nav-group' + (childActive ? ' open' : '') + '">';
      sHtml += '<button class="sidebar-nav-group-label">' + (NAV_ICONS[link.id] || '') + '<span>' + link.label + '</span><span class="group-chevron-wrap"><svg class="group-chevron" ${ICON_ATTRS} width="16" height="16"><path d="m6 9 6 6 6-6"/></svg></span></button>';
      sHtml += '<div class="sidebar-nav-children">';
      for (const child of link.children) {
        const active = child.id === page ? ' active' : '';
        sHtml += '<a class="sidebar-nav-child' + active + '" href="' + child.href + '">' + child.label + '</a>';
      }
      sHtml += '</div></div>';
    } else if (link.external || (link.href && link.href.startsWith('http'))) {
      sHtml += '<a class="sidebar-nav-item" href="' + link.href + '" target="_blank" rel="noopener">' + (NAV_ICONS[link.id] || '') + '<span class="sidebar-nav-item-label">' + link.label + '</span></a>';
    } else {
      const active = link.id === page ? ' active' : '';
      sHtml += '<a class="sidebar-nav-item' + active + '" href="' + link.href + '">' + (NAV_ICONS[link.id] || '') + '<span class="sidebar-nav-item-label">' + link.label + '</span></a>';
    }
  }

  sHtml += '</nav>';
  sHtml += '<div id="sidebar-subtopics"></div>';
  sidebar.innerHTML = sHtml;

  // ── Topbar HTML ──
  const darkMode = localStorage.getItem('ea-theme-mode') === 'dark';
  const sunIcon = `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
  const moonIcon = `<svg ${ICON_ATTRS}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;

  let tHtml = '';
  tHtml += `<button class="topbar-hamburger" aria-label="Menu"><svg ${ICON_ATTRS}><path d="M3 12h18M3 6h18M3 18h18"/></svg></button>`;
  tHtml += '<span class="topbar-title">' + pageLabel + '</span>';
  tHtml += '<span class="topbar-spacer"></span>';

  // Theme accent picker
  tHtml += '<div class="theme-picker">';
  const savedAccent = localStorage.getItem('ea-theme-accent') || 'blue';
  const accents = [
    { id: 'blue', color: '#2563EB' },
    { id: 'teal', color: '#0D9488' },
    { id: 'amber', color: '#D97706' }
  ];
  for (const a of accents) {
    const act = a.id === savedAccent ? ' active' : '';
    tHtml += '<button class="theme-pick' + act + '" data-accent="' + a.id + '" style="background:' + a.color + '" aria-label="' + a.id + ' theme"></button>';
  }
  tHtml += '</div>';

  // Search
  tHtml += '<button class="topbar-search-btn" aria-label="Search"><svg ${ICON_ATTRS} width="18" height="18"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button>';

  // Dark mode toggle
  tHtml += '<button class="dark-toggle" aria-label="Toggle dark mode">' + (darkMode ? sunIcon : moonIcon) + '</button>';

  topbar.innerHTML = tHtml;

  // ── Event Listeners ──

  // Sidebar collapse (desktop)
  const collapseBtn = sidebar.querySelector('.sidebar-collapse-btn');
  collapseBtn.addEventListener('click', () => {
    const layout = document.querySelector('.app-layout');
    layout.classList.toggle('sidebar-collapsed');
    sidebarCollapsed = layout.classList.contains('sidebar-collapsed');
    localStorage.setItem('ea-sidebar-collapsed', sidebarCollapsed);
  });

  // Restore sidebar collapsed state
  if (localStorage.getItem('ea-sidebar-collapsed') === 'true') {
    document.querySelector('.app-layout').classList.add('sidebar-collapsed');
    sidebarCollapsed = true;
  }

  // Mobile hamburger
  const hamburger = topbar.querySelector('.topbar-hamburger');
  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.querySelector('.app-layout').appendChild(overlay);
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
      });
    }
    overlay.classList.toggle('active');
  });

  // Industries group toggle
  sidebar.querySelectorAll('.sidebar-nav-group-label').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.sidebar-nav-group').classList.toggle('open');
    });
  });

  // Search button
  topbar.querySelector('.topbar-search-btn').addEventListener('click', () => openSearch());

  // Dark mode toggle
  topbar.querySelector('.dark-toggle').addEventListener('click', toggleDarkMode);

  // Theme accent picker
  topbar.querySelectorAll('.theme-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      topbar.querySelectorAll('.theme-pick').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyAccentTheme(btn.dataset.accent);
      localStorage.setItem('ea-theme-accent', btn.dataset.accent);
    });
  });

  // Initialize theme
  initTheme();
}

function initTheme() {
  // Dark mode
  const savedMode = localStorage.getItem('ea-theme-mode');
  if (savedMode === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  // Accent theme
  const savedAccent = localStorage.getItem('ea-theme-accent');
  if (savedAccent) applyAccentTheme(savedAccent);
}

function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('ea-theme-mode', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('ea-theme-mode', 'dark');
  }
  // Update icon
  const btn = document.querySelector('.dark-toggle');
  if (btn) {
    const sunIcon = `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
    const moonIcon = `<svg ${ICON_ATTRS}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
    btn.innerHTML = !isDark ? sunIcon : moonIcon;
  }
}

function applyAccentTheme(id) {
  const themes = {
    blue:  { accent: '#2563EB', hover: '#1D4ED8', light: null, text: '#1E40AF' },
    teal:  { accent: '#0D9488', hover: '#0F766E', light: '#F0FDFA', text: '#115E59' },
    amber: { accent: '#D97706', hover: '#B45309', light: '#FFFBEB', text: '#92400E' }
  };
  const t = themes[id];
  if (!t) return;
  const root = document.documentElement.style;
  root.setProperty('--accent', t.accent);
  root.setProperty('--accent-hover', t.hover);
  if (t.light) root.setProperty('--accent-light', t.light);
  else root.removeProperty('--accent-light');
  root.setProperty('--accent-text', t.text);
}

/* ── Home Page ───────────────────────────────────────── */
async function initHome() {
  const [homeData, recsData, capsData] = await Promise.all([
    loadJSON('data/home.json'),
    loadJSON('data/recommendations.json'),
    loadJSON('data/new-capabilities.json')
  ]);

  if (homeData) {
    renderStats(homeData.stats);
    renderFindings(homeData.findings);
  }
  if (recsData) renderRecommendations(recsData);
  if (capsData) renderCapabilities(capsData);
  renderDashboard();
}

function renderStats(stats) {
  const el = document.getElementById('hero-stats');
  if (!el || !stats) return;
  el.innerHTML = stats.map(s =>
    `<div class="stat-card"><div class="number">${s.value}</div><div class="label">${s.label}</div></div>`
  ).join('');
}

function renderDashboard() {
  const grid = document.getElementById('dashboard-grid');
  if (!grid || !siteData) return;

  const assessment = getAssessment();
  const pages = siteData.nav.filter(n => n.id !== 'home' && n.id !== 'overview' && !n.external && !n.disabled && !n.children);

  if (Object.keys(assessment).length === 0) {
    grid.innerHTML = pages.map(p =>
      `<a class="dashboard-card" href="${p.href}">
        <div class="dashboard-card-header">
          <span class="dashboard-card-title">${p.label}</span>
          <span class="dashboard-card-score" style="color: var(--text-muted)">—</span>
        </div>
        <div class="dashboard-card-bar"><div class="dashboard-card-bar-fill" style="width:0"></div></div>
        <div class="dashboard-card-label">Not assessed yet</div>
      </a>`
    ).join('');
    return;
  }

  grid.innerHTML = pages.map(p => {
    const pageAnswers = assessment[p.id] || {};
    const scores = Object.values(pageAnswers).filter(v => typeof v === 'number');
    if (scores.length === 0) {
      return `<a class="dashboard-card" href="${p.href}">
        <div class="dashboard-card-header">
          <span class="dashboard-card-title">${p.label}</span>
          <span class="dashboard-card-score" style="color: var(--text-muted)">—</span>
        </div>
        <div class="dashboard-card-bar"><div class="dashboard-card-bar-fill" style="width:0"></div></div>
        <div class="dashboard-card-label">Not assessed yet</div>
      </a>`;
    }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const pct = (avg / 5) * 100;
    const color = maturityColor(avg);
    return `<a class="dashboard-card" href="${p.href}">
      <div class="dashboard-card-header">
        <span class="dashboard-card-title">${p.label}</span>
        <span class="dashboard-card-score" style="color:${color}">${avg.toFixed(1)}</span>
      </div>
      <div class="dashboard-card-bar"><div class="dashboard-card-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="dashboard-card-label">${scores.length} question${scores.length !== 1 ? 's' : ''} answered</div>
    </a>`;
  }).join('');
}

function renderFindings(findings) {
  const el = document.getElementById('findings-list');
  if (!el || !findings) return;
  el.innerHTML = findings.map(f =>
    `<div class="finding-card">
      <div class="finding-header" onclick="this.parentElement.classList.toggle('open')">
        <span class="finding-number">${f.id}</span>
        <div class="finding-content">
          <div class="finding-title">${f.title}</div>
          <div class="finding-bottomline">${f.bottomline}</div>
        </div>
        ${chevronSVG()}
      </div>
      <div class="finding-body">${f.body}</div>
    </div>`
  ).join('');
}

function renderRecommendations(recs) {
  const el = document.getElementById('rec-list');
  if (!el || !recs) return;
  el.innerHTML = recs.map(r => {
    const badges = [];
    if (r.priority) badges.push(`<span class="priority-badge priority-${r.priority.toLowerCase()}">${r.priority}</span>`);
    if (r.effort) badges.push(`<span class="priority-badge" style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0">${r.effort} effort</span>`);
    return `<div class="rec-item">
      <span class="rec-item-number">${r.id}</span>
      <div class="rec-item-content">
        <div class="rec-item-title">${r.title}</div>
        <div class="rec-item-desc">${r.description}</div>
        ${badges.length ? `<div class="rec-item-badges">${badges.join('')}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderCapabilities(caps) {
  const el = document.getElementById('capabilities-grid');
  if (!el || !caps) return;
  el.innerHTML = caps.map(c => {
    const badge = c.priority ? `<span class="priority-badge priority-${c.priority.toLowerCase()}" style="margin-bottom:.5rem;display:inline-block">${c.priority} priority</span>` : '';
    return `<div class="capability-card">
      ${badge}
      <div class="capability-card-title">${c.title}</div>
      <div class="capability-card-desc">${c.description}</div>
    </div>`;
  }).join('');
}

/* ── Overview Page ───────────────────────────────────── */
async function initOverview() {
  const [data, capsData] = await Promise.all([
    loadJSON('data/overview.json'),
    loadJSON('data/new-capabilities.json')
  ]);
  if (data) {
    renderOverviewFindings(data.findings);
    renderImpactMatrix(data.matrix);
    renderDomainSummaries(data.domain_summaries);
  }
  if (capsData) renderCapabilities(capsData);
}

function renderOverviewFindings(findings) {
  const el = document.getElementById('findings-summary');
  if (!el || !findings) return;
  el.innerHTML = '<div class="overview-findings">' + findings.map(f =>
    `<div class="overview-finding">
      <span class="overview-finding-id">${f.id}</span>
      <span class="overview-finding-text">${f.summary}</span>
    </div>`
  ).join('') + '</div>';
}

function renderImpactMatrix(matrix) {
  const el = document.getElementById('impact-matrix');
  if (!el || !matrix) return;

  let html = '<div class="impact-matrix-wrap">';
  html += '<table class="impact-matrix-table">';

  // Header
  html += '<thead><tr>';
  html += '<th>EA Objective</th>';
  for (const dim of matrix.dimensions) {
    html += `<th>${dim.label}<span class="matrix-th-subtitle">${dim.subtitle}</span></th>`;
  }
  html += '</tr></thead>';

  // Body
  html += '<tbody>';
  for (const obj of matrix.objectives) {
    html += '<tr>';
    html += `<td>${obj.label}<span class="matrix-obj-subtitle">${obj.subtitle}</span></td>`;
    for (const dim of matrix.dimensions) {
      html += `<td>${obj.cells[dim.key]}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody>';

  html += '</table>';
  html += '</div>';
  el.innerHTML = html;
}

function renderDomainSummaries(domains) {
  const el = document.getElementById('domain-summaries');
  if (!el || !domains || !domains.length) return;
  let html = '<div class="domain-summaries-grid">';
  for (const d of domains) {
    html += `<a class="domain-summary-card" href="${d.href}">`;
    html += `<h3 class="domain-summary-title">${d.label}</h3>`;
    html += '<ul class="domain-summary-bullets">';
    for (const b of d.bullets) {
      html += `<li>${b}</li>`;
    }
    html += '</ul>';
    html += `<span class="domain-summary-link">Explore ${d.label} &rarr;</span>`;
    html += '</a>';
  }
  html += '</div>';
  el.innerHTML = html;
}

/* ── Industry Page ──────────────────────────────────── */
function initIndustryPage() {
  const el = document.getElementById('industry-content');
  if (!el || !pageData) return;

  let html = '';

  // Hero
  html += '<header class="hero"><div class="container">';
  html += `<p class="section-label">Industry Focus</p>`;
  html += `<h1>${pageData.title}</h1>`;
  html += `<p class="subtitle">${pageData.subtitle}</p>`;
  html += '</div></header>';

  const hasDomains = pageData.ea_domains && pageData.ea_domains.length;

  if (hasDomains) {
    // Tab bar
    html += '<div class="dashboard-section" style="padding-bottom:0"><div class="container">';
    html += '<div class="tabs industry-tabs">';
    html += '<button class="tab-btn active" data-industry-tab="analysis">Industry Analysis</button>';
    html += '<button class="tab-btn" data-industry-tab="domains">EA Domains</button>';
    html += '</div></div></div>';

    // Tab panels
    html += '<div id="industry-tab-analysis" class="industry-tab-panel">';
    html += renderIndustryAnalysis();
    html += '</div>';
    html += '<div id="industry-tab-domains" class="industry-tab-panel" style="display:none">';
    html += renderIndustryDomains();
    html += '</div>';
  } else {
    html += renderIndustryAnalysis();
  }

  el.innerHTML = html;

  if (hasDomains) {
    initIndustryTabs();
  }
}

function renderIndustryAnalysis() {
  let html = '';

  // Findings
  if (pageData.findings && pageData.findings.length) {
    html += '<div class="dashboard-section"><div class="container">';
    html += '<p class="section-label">Key Findings</p>';
    html += `<h2>What Makes ${pageData.title} Different</h2>`;
    html += '<div class="overview-findings">';
    for (const f of pageData.findings) {
      html += `<div class="overview-finding">
        <span class="overview-finding-id">${f.id}</span>
        <span class="overview-finding-text"><strong>${f.title}</strong> &mdash; ${f.summary}</span>
      </div>`;
    }
    html += '</div></div></div>';
  }

  // Case Studies
  if (pageData.case_studies && pageData.case_studies.length) {
    html += '<div class="dashboard-section"><div class="container">';
    html += '<p class="section-label">Industry Leaders</p>';
    html += '<h2>Agentic AI in Production</h2>';
    html += '<div class="case-study-grid">';
    for (const cs of pageData.case_studies) {
      html += `<div class="case-study-card">
        <div class="case-study-company">${cs.company}</div>
        <div class="case-study-metrics">${cs.metrics.map(m => `<span class="case-study-metric">${m}</span>`).join('')}</div>
        <div class="case-study-desc">${cs.description}</div>
      </div>`;
    }
    html += '</div></div></div>';
  }

  // Comparison Sections
  if (pageData.sections && pageData.sections.length) {
    html += '<div class="dashboard-section"><div class="container">';
    html += '<p class="section-label">EA Impact Analysis</p>';
    html += '<h2>How EA Must Adapt</h2>';
    html += `<p class="page-description">${pageData.description}</p>`;
    html += '<div class="compare-table">';
    html += '<div class="compare-header">';
    html += '<div class="compare-col-header compare-col-trad"><span class="compare-col-label">Traditional EA</span></div>';
    html += '<div class="compare-col-header compare-col-ai"><span class="compare-col-label">EA for the Agentic Organisation</span></div>';
    html += '</div>';
    for (const s of pageData.sections) {
      const t = s.traditional;
      const a = s.agentic;
      const tradText = (t && t.summary) ? t.summary : '';
      const aiText = (a && a.summary) ? a.summary : '';
      html += `<div class="compare-topic-row" id="topic-${s.id}">`;
      html += `<div class="compare-topic-header" onclick="toggleTopic('${s.id}')">`;
      html += `<div class="compare-topic-label">${s.label}</div>`;
      html += '<div class="compare-topic-summaries">';
      html += `<div class="compare-topic-summary compare-topic-trad">${tradText}</div>`;
      html += `<div class="compare-topic-summary compare-topic-ai">${aiText}</div>`;
      html += '</div></div>';

      html += '<div class="compare-topic-detail"><div class="compare-detail-grid">';
      html += '<div class="compare-detail-col compare-detail-trad">';
      if (t && t.body_html) html += `<div class="content-body">${t.body_html}</div>`;
      html += '</div>';
      html += '<div class="compare-detail-col compare-detail-ai">';
      if (a && a.body_html) html += `<div class="content-body">${a.body_html}</div>`;
      if (a && a.key_points && a.key_points.length) {
        html += `<div class="impact-section">
          <div class="impact-section-title">Key Points</div>
          <ul class="impact-list changes">
            ${a.key_points.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>`;
      }
      html += '</div>';
      html += '</div></div>'; // detail-grid, detail

      html += '</div>'; // topic-row
    }
    html += '</div>'; // compare-table
    html += '</div></div>'; // container, section
  }

  return html;
}

function renderIndustryDomains() {
  const domains = pageData.ea_domains;
  const findingsMap = {};
  if (pageData.findings) {
    for (const f of pageData.findings) findingsMap[f.id] = f.title;
  }

  let html = '<div class="dashboard-section"><div class="container">';
  html += '<p class="section-label">EA Domain Perspectives</p>';
  html += `<h2>How Each EA Domain Applies to ${pageData.title}</h2>`;
  html += '<div class="industry-domain-cards">';

  for (const d of domains) {
    html += `<div class="industry-domain-card" id="domain-${d.id}">`;

    // Header
    html += `<div class="industry-domain-header" onclick="toggleIndustryDomain('${d.id}')">`;
    html += `<h3>${d.label}</h3>`;
    html += chevronSVG();
    html += '</div>';

    // Context — always visible
    html += `<div class="industry-domain-context">${d.industry_context}</div>`;

    // Expandable detail
    html += '<div class="industry-domain-detail">';

    // Key Adaptations
    html += '<h4>Key Adaptations</h4>';
    for (const a of d.key_adaptations) {
      html += `<div class="industry-adaptation">
        <strong>${a.title}</strong>
        <p>${a.description}</p>
      </div>`;
    }

    // Recommended Practices
    if (d.practices && d.practices.length) {
      html += '<h4>Recommended Practices</h4>';
      html += '<ul class="industry-practices">';
      for (const p of d.practices) {
        html += `<li>${p}</li>`;
      }
      html += '</ul>';
    }

    // Related Findings
    if (d.related_findings && d.related_findings.length) {
      html += '<h4>Related Findings</h4>';
      html += '<div class="industry-related-findings">';
      for (const fid of d.related_findings) {
        const title = findingsMap[fid] || fid;
        html += `<span class="overview-finding-id" title="${stripHTML(title)}">${fid}</span>`;
      }
      html += '</div>';
    }

    // Link to domain sub-page
    html += `<a class="industry-domain-link" href="${d.href}">Full analysis &rarr;</a>`;

    html += '</div>'; // detail
    html += '</div>'; // card
  }

  html += '</div>'; // cards
  html += '</div></div>'; // container, section
  return html;
}

function toggleIndustryDomain(id) {
  const card = document.getElementById('domain-' + id);
  if (card) card.classList.toggle('open');
}

function initIndustryTabs() {
  const btns = document.querySelectorAll('[data-industry-tab]');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-industry-tab');
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('industry-tab-analysis').style.display = tab === 'analysis' ? '' : 'none';
      document.getElementById('industry-tab-domains').style.display = tab === 'domains' ? '' : 'none';
      history.replaceState(null, '', tab === 'domains' ? '#domains' : window.location.pathname);
    });
  });

  // Pre-select tab from hash
  if (window.location.hash === '#domains') {
    const domainsBtn = document.querySelector('[data-industry-tab="domains"]');
    if (domainsBtn) domainsBtn.click();
  }
}

/* ── Concept Page ────────────────────────────────────── */
async function initConceptPage(pageId) {
  pageData = await loadJSON(`data/${pageId}.json`);
  if (!pageData) return;

  renderSidebar(pageData.subtopics);
  initTabs();
  renderContent();
}

function renderSidebar(subtopics) {
  const el = document.getElementById('sidebar-subtopics');
  if (!el) return;
  let html = '<div class="sidebar-subtopics">';
  html += '<div class="sidebar-subtopics-heading">Topics</div>';
  for (const st of subtopics) {
    html += `<a class="sidebar-subtopic-link" href="#${st.id}" data-subtopic="${st.id}" onclick="event.preventDefault();scrollToTopic('${st.id}')">${st.label}</a>`;
  }
  html += '</div>';
  el.innerHTML = html;
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderContent();
    });
  });
}

function scrollToTopic(id) {
  const row = document.getElementById('topic-' + id);
  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Expand if collapsed
    if (!row.classList.contains('open')) row.classList.add('open');
  }
  // Highlight sidebar
  document.querySelectorAll('.sidebar-subtopic-link').forEach(link => {
    link.classList.toggle('active', link.dataset.subtopic === id);
  });
}

function selectSubtopic(id) {
  currentSubtopic = pageData.subtopics.find(s => s.id === id);
  if (!currentSubtopic) return;
  document.querySelectorAll('.sidebar-subtopic-link').forEach(link => {
    link.classList.toggle('active', link.dataset.subtopic === id);
  });
  if (currentTab === 'assessment') renderContent();
}

function renderContent() {
  const el = document.getElementById('tab-content');
  if (!el) return;

  switch (currentTab) {
    case 'overview':
      renderOverview(el);
      break;
    case 'assessment':
      renderAssessmentPage(el);
      break;
  }
}

/* ── Capabilities Page (combined domains) ────────────── */
function initCapabilitiesPage() {
  renderGroupedSidebar(pageData.domains, pageData.subtopics);
  currentTab = 'overview';
  renderContent();
}

function renderGroupedSidebar(domains, subtopics) {
  const el = document.getElementById('sidebar-subtopics');
  if (!el) return;
  let html = '<div class="sidebar-subtopics">';
  html += '<div class="sidebar-subtopics-heading">Domains</div>';
  for (const d of domains) {
    const firstSt = subtopics.find(s => s.domain === d.id);
    const anchor = firstSt ? firstSt.id : d.id;
    html += `<a class="sidebar-subtopic-link" href="#${anchor}" data-domain="${d.id}" onclick="event.preventDefault();scrollToTopic('${anchor}')">${d.label}</a>`;
  }
  html += '</div>';
  el.innerHTML = html;
}

/* ── Overview: All topics in one comparison table ────── */
function renderOverview(el) {
  const isThreeCol = pageData.subtopics[0] && pageData.subtopics[0].changes;
  let html = '';

  // Component link cards (for operating model page)
  if (pageData.components && pageData.components.length) {
    html += '<div class="om-components">';
    for (const c of pageData.components) {
      html += `<a class="om-component-card" href="${c.href}">
        <div class="om-component-title">${c.label}</div>
        <div class="om-component-desc">${c.description}</div>
      </a>`;
    }
    html += '</div>';
    html += renderCapabilityDiagram(pageData.subtopics);
  }

  html += '<div class="compare-table">';

  // Table header
  if (isThreeCol) {
    html += '<div class="compare-header compare-header-3col">';
    html += '<div class="compare-col-header compare-col-trad"><span class="compare-col-label">Traditional EA</span></div>';
    html += '<div class="compare-col-header compare-col-changes"><span class="compare-col-label">What Changes</span></div>';
    html += '<div class="compare-col-header compare-col-future"><span class="compare-col-label">EA in an Agentic Organisation</span></div>';
    html += '</div>';
  } else {
    html += '<div class="compare-header">';
    html += '<div class="compare-col-header compare-col-trad"><span class="compare-col-label">Traditional EA</span></div>';
    html += '<div class="compare-col-header compare-col-ai"><span class="compare-col-label">EA for the Agentic Organisation</span></div>';
    html += '</div>';
  }

  // Build domain label lookup for capabilities page
  const domainLabels = {};
  if (pageData.domains) {
    for (const d of pageData.domains) domainLabels[d.id] = d.label;
  }

  // One row per subtopic (with optional group headers)
  let currentGroup = null;
  for (const st of pageData.subtopics) {
    // Group header row when group or domain changes
    const groupKey = st.domain ? st.domain : st.group;
    const groupLabel = st.domain ? (domainLabels[st.domain] || st.domain) : st.group;
    if (groupKey && groupKey !== currentGroup) {
      currentGroup = groupKey;
      html += `<div class="compare-group-header"><span class="compare-group-label">${groupLabel}</span></div>`;
    }
    const t = st.traditional;
    const tradText = (t && t.summary) ? t.summary : '';

    html += `<div class="compare-topic-row" id="topic-${st.id}">`;

    if (isThreeCol) {
      const ch = st.changes;
      const fs = st.future_state;
      const changesText = (ch && ch.summary) ? ch.summary : '';
      const futureText = (fs && fs.summary) ? fs.summary : '';

      // Heading row with three summaries
      html += `<div class="compare-topic-header" onclick="toggleTopic('${st.id}')">`;
      html += `<div class="compare-topic-label">${st.label}</div>`;
      html += '<div class="compare-topic-summaries compare-topic-summaries-3col">';
      html += `<div class="compare-topic-summary compare-topic-trad">${tradText}</div>`;
      html += `<div class="compare-topic-summary compare-topic-changes">${changesText}</div>`;
      html += `<div class="compare-topic-summary compare-topic-future">${futureText}</div>`;
      html += '</div>';
      html += '</div>';

      // Expanded detail
      html += '<div class="compare-topic-detail">';
      html += '<div class="compare-detail-grid compare-detail-grid-3col">';

      // Traditional column
      html += '<div class="compare-detail-col compare-detail-trad">';
      if (t && t.body_html) html += `<div class="content-body">${t.body_html}</div>`;
      if (t && t.key_concepts && t.key_concepts.length) {
        html += '<div class="key-concepts" style="margin-top:.75rem">';
        html += t.key_concepts.map(c => `<span class="key-concept-tag">${c}</span>`).join('');
        html += '</div>';
      }
      html += '</div>';

      // Changes column
      html += '<div class="compare-detail-col compare-detail-changes">';
      if (ch) {
        const sections = [
          { key: 'key_shifts', title: 'Key Shifts', cls: 'changes' },
          { key: 'what_breaks', title: 'What No Longer Works', cls: 'breaks' },
          { key: 'what_survives', title: 'What Still Applies', cls: 'survives' }
        ];
        for (const s of sections) {
          if (ch[s.key] && ch[s.key].length) {
            html += `<div class="impact-section">
              <div class="impact-section-title">${s.title}</div>
              <ul class="impact-list ${s.cls}">
                ${ch[s.key].map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>`;
          }
        }
      }
      html += '</div>';

      // Future State column
      html += '<div class="compare-detail-col compare-detail-future">';
      if (fs) {
        if (fs.description) html += `<div class="content-body"><p>${fs.description}</p></div>`;
        if (fs.key_practices && fs.key_practices.length) {
          html += `<div class="impact-section">
            <div class="impact-section-title">Key Practices</div>
            <ul class="impact-list future-practices">
              ${fs.key_practices.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>`;
        }
      }
      html += '</div>';

      html += '</div>'; // detail-grid
      if (st.examples && st.examples.length) {
        html += '<div class="examples-row">';
        html += '<span class="examples-label">In Practice:</span>';
        for (const ex of st.examples) {
          html += `<a class="example-tag" href="${ex.href}" title="${ex.relevance}">`
            + `<strong>${ex.company}</strong> <span class="example-industry">${ex.industry}</span></a>`;
        }
        html += '</div>';
      }
      html += '</div>'; // detail

    } else {
      // Two-column layout (legacy)
      const ai = st.ai_impact;
      const aiText = (ai && ai.summary) ? ai.summary : '';
      const isNew = ai && ai.impact_category === 'C';

      html += `<div class="compare-topic-header" onclick="toggleTopic('${st.id}')">`;
      html += `<div class="compare-topic-label">${st.label}${isNew ? ' <span class="impact-badge impact-new">New</span>' : ''}</div>`;
      html += '<div class="compare-topic-summaries">';
      html += `<div class="compare-topic-summary compare-topic-trad">${tradText}</div>`;
      html += `<div class="compare-topic-summary compare-topic-ai">${aiText}</div>`;
      html += '</div>';
      html += '</div>';

      html += '<div class="compare-topic-detail">';
      html += '<div class="compare-detail-grid">';

      html += '<div class="compare-detail-col compare-detail-trad">';
      if (t && t.body_html) html += `<div class="content-body">${t.body_html}</div>`;
      if (t && t.key_concepts && t.key_concepts.length) {
        html += '<div class="key-concepts" style="margin-top:.75rem">';
        html += t.key_concepts.map(c => `<span class="key-concept-tag">${c}</span>`).join('');
        html += '</div>';
      }
      html += '</div>';

      html += '<div class="compare-detail-col compare-detail-ai">';
      if (ai && ai.body_html) html += `<div class="content-body">${ai.body_html}</div>`;
      if (ai) {
        const lists = [
          { key: 'what_changes', title: 'What Changes', cls: 'changes' },
          { key: 'what_breaks', title: 'What No Longer Works', cls: 'breaks' },
          { key: 'what_survives', title: 'What Still Applies', cls: 'survives' },
          { key: 'gaps', title: 'What Is Missing', cls: 'gaps' }
        ];
        for (const s of lists) {
          if (ai[s.key] && ai[s.key].length) {
            html += `<div class="impact-section">
              <div class="impact-section-title">${s.title}</div>
              <ul class="impact-list ${s.cls}">
                ${ai[s.key].map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>`;
          }
        }
      }
      html += '</div>';

      html += '</div>'; // detail-grid
      if (st.examples && st.examples.length) {
        html += '<div class="examples-row">';
        html += '<span class="examples-label">In Practice:</span>';
        for (const ex of st.examples) {
          html += `<a class="example-tag" href="${ex.href}" title="${ex.relevance}">`
            + `<strong>${ex.company}</strong> <span class="example-industry">${ex.industry}</span></a>`;
        }
        html += '</div>';
      }
      html += '</div>'; // detail
    }

    html += '</div>'; // topic-row
  }

  html += '</div>'; // compare-table
  el.innerHTML = html;

  // Open from hash
  const hash = window.location.hash.slice(1);
  if (hash) {
    const row = document.getElementById('topic-' + hash);
    if (row) {
      row.classList.add('open');
      setTimeout(() => row.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }
}

/* ── Capability Model Diagram ────────────────────────── */
function renderCapabilityDiagram(subtopics) {
  // Group subtopics by their group field
  const groups = {};
  const groupOrder = [];
  for (const st of subtopics) {
    if (!groups[st.group]) {
      groups[st.group] = [];
      groupOrder.push(st.group);
    }
    groups[st.group].push(st);
  }

  function impactClass(cat) {
    return { A: 'cap-box-modify', B: 'cap-box-extend', C: 'cap-box-new' }[cat] || 'cap-box-modify';
  }

  function renderBoxes(groupName) {
    if (!groups[groupName]) return '';
    return groups[groupName].map(st => {
      const cat = st.ai_impact ? st.ai_impact.impact_category : (st.impact_category || 'A');
      if (st.href) {
        return `<a class="cap-box ${impactClass(cat)}" href="${st.href}" title="${st.label}">${st.label}</a>`;
      }
      return `<button class="cap-box ${impactClass(cat)}" onclick="scrollToTopic('${st.id}')" title="${st.label}">${st.label}</button>`;
    }).join('');
  }

  let html = '<div class="cap-diagram">';
  html += '<div class="cap-diagram-title">Enterprise Architecture Capabilities</div>';

  // Top row: 3-column grid
  html += '<div class="cap-diagram-top">';

  // Left: Architecture Development (with sub-groups)
  html += '<div class="cap-diagram-area cap-diagram-dev">';
  html += '<div class="cap-area-title">Architecture Development</div>';
  const devGroups = [
    'Architecture Development \u2014 Common',
    'Business Architecture',
    'Application Architecture',
    'Data Architecture',
    'Technology Architecture'
  ];
  for (const g of devGroups) {
    if (!groups[g]) continue;
    const shortName = g.replace('Architecture Development \u2014 ', '');
    html += '<div class="cap-subgroup">';
    html += `<div class="cap-subgroup-title">${shortName}</div>`;
    html += `<div class="cap-boxes">${renderBoxes(g)}</div>`;
    html += '</div>';
  }
  html += '</div>';

  // Middle: Architecture Repository
  html += '<div class="cap-diagram-area cap-diagram-repo">';
  html += '<div class="cap-area-title">Architecture Repository</div>';
  html += `<div class="cap-boxes">${renderBoxes('Architecture Repository')}</div>`;
  html += '</div>';

  // Right: Architecture Management
  html += '<div class="cap-diagram-area cap-diagram-mgmt">';
  html += '<div class="cap-area-title">Architecture Management</div>';
  html += `<div class="cap-boxes">${renderBoxes('Architecture Management')}</div>`;
  html += '</div>';

  html += '</div>'; // cap-diagram-top

  // Governance row
  html += '<div class="cap-diagram-area cap-diagram-gov">';
  html += '<div class="cap-area-title">Governance, Communication &amp; Change</div>';
  html += `<div class="cap-boxes">${renderBoxes('Governance, Communication & Change')}</div>`;
  html += '</div>';

  // Risk, Security & Compliance row
  html += '<div class="cap-diagram-area cap-diagram-risk">';
  html += '<div class="cap-area-title">Risk, Security &amp; Compliance</div>';
  html += `<div class="cap-boxes">${renderBoxes('Risk, Security & Compliance')}</div>`;
  html += '</div>';

  // Net-New row
  html += '<div class="cap-diagram-area cap-diagram-new">';
  html += '<div class="cap-area-title">Net-New for the Agentic Organisation</div>';
  html += `<div class="cap-boxes">${renderBoxes('Net-New for the Agentic Organisation')}</div>`;
  html += '</div>';

  // Legend
  html += '<div class="cap-diagram-legend">';
  html += '<span class="cap-legend-item"><span class="cap-legend-swatch cap-box-modify"></span> Modify</span>';
  html += '<span class="cap-legend-item"><span class="cap-legend-swatch cap-box-extend"></span> Extend</span>';
  html += '<span class="cap-legend-item"><span class="cap-legend-swatch cap-box-new"></span> New</span>';
  html += '</div>';

  html += '</div>'; // cap-diagram
  return html;
}

window.toggleTopic = function(id) {
  const row = document.getElementById('topic-' + id);
  if (row) row.classList.toggle('open');
  // Update sidebar highlight
  document.querySelectorAll('.sidebar-subtopic-link').forEach(link => {
    link.classList.toggle('active', link.dataset.subtopic === id && row.classList.contains('open'));
  });
};

window.scrollToTopic = scrollToTopic;
window.selectSubtopic = selectSubtopic;

/* ── Assessment Page (all subtopics listed) ──────────── */
function renderAssessmentPage(el) {
  const pageId = getPageId();
  const assessment = getAssessment();
  const pageAnswers = assessment[pageId] || {};

  // Overall score
  const allQids = [];
  for (const st of pageData.subtopics) {
    const a = st.assessment;
    if (a && a.questions) allQids.push(...a.questions.map(q => q.id));
  }
  const allAnswered = allQids.filter(qid => typeof pageAnswers[qid] === 'number');

  let html = '';
  if (allAnswered.length > 0) {
    const avg = allAnswered.reduce((s, qid) => s + pageAnswers[qid], 0) / allAnswered.length;
    const pct = (avg / 5) * 100;
    const color = maturityColor(avg);
    html += `<div class="maturity-summary">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.5rem">
        <h4 style="margin:0">${pageData.title} — Overall Maturity</h4>
        <span style="font-size:.82rem;color:var(--text-muted)">${allAnswered.length} of ${allQids.length} answered</span>
      </div>
      <div class="maturity-bar-wrap">
        <div class="maturity-bar"><div class="maturity-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="maturity-score" style="color:${color}">${avg.toFixed(1)}</div>
      </div>
      <div class="maturity-label">${maturityLabel(avg)}</div>
    </div>`;
  }

  html += '<p class="assessment-intro">Rate your organisation\'s current maturity for each area. Responses are saved locally and inform the dashboard on the home page.</p>';

  // Render per-subtopic
  for (const st of pageData.subtopics) {
    const a = st.assessment;
    if (!a || !a.questions || !a.questions.length) continue;

    html += `<h3 style="margin:1.5rem 0 .75rem">${st.label}</h3>`;

    for (const q of a.questions) {
      const selected = pageAnswers[q.id];
      html += `<div class="assessment-question" data-qid="${q.id}">
        <div class="assessment-question-text">${q.text}</div>
        <div class="assessment-options">`;
      for (let level = 1; level <= 5; level++) {
        const desc = q.levels[level] || '';
        const isSelected = selected === level;
        html += `<label class="assessment-option${isSelected ? ' selected' : ''}">
          <input type="radio" name="${q.id}" value="${level}" ${isSelected ? 'checked' : ''} onchange="handleAssessmentChange('${q.id}', ${level})">
          <span class="assessment-option-label">
            <span class="assessment-option-level">Level ${level}</span>
            <span class="assessment-option-desc">${desc}</span>
          </span>
        </label>`;
      }
      html += '</div></div>';
    }

    // Contextual actions
    if (a.actions && a.actions.length) {
      const stQids = a.questions.map(q => q.id);
      const stAnswered = stQids.filter(qid => typeof pageAnswers[qid] === 'number');
      if (stAnswered.length > 0) {
        const avg = stAnswered.reduce((s, qid) => s + pageAnswers[qid], 0) / stAnswered.length;
        const relevant = a.actions.filter(act => {
          if (act.max_level && avg > act.max_level) return false;
          if (act.min_level && avg < act.min_level) return false;
          return true;
        });
        if (relevant.length) {
          html += `<div class="actions-box">
            <h4>Recommended Actions</h4>
            <ul class="actions-list">
              ${relevant.map(act => `<li>${act.text}</li>`).join('')}
            </ul>
          </div>`;
        }
      }
    }
  }

  el.innerHTML = html;
}

function maturityLabel(score) {
  if (score <= 1.5) return 'Initial — Ad hoc, no formal approach';
  if (score <= 2.5) return 'Developing — Some practices emerging';
  if (score <= 3.5) return 'Defined — Standardised practices in place';
  if (score <= 4.5) return 'Managed — Measured and optimised';
  return 'Optimised — Continuous improvement, industry-leading';
}

/* Global handler for assessment radio changes */
window.handleAssessmentChange = function(questionId, level) {
  const pageId = getPageId();
  const assessment = getAssessment();
  if (!assessment[pageId]) assessment[pageId] = {};
  assessment[pageId][questionId] = level;
  saveAssessment(assessment);

  // Re-render to update score bar and actions
  renderAssessmentPage(document.getElementById('tab-content'));

  // Update selected state visually
  const questionEl = document.querySelector(`[data-qid="${questionId}"]`);
  if (questionEl) {
    questionEl.querySelectorAll('.assessment-option').forEach(opt => {
      opt.classList.toggle('selected', opt.querySelector('input').checked);
    });
  }
};

/* ── Operating Model Page ─────────────────────────────── */

function initOperatingModelPage() {
  const el = document.getElementById('tab-content');
  if (!el || !pageData) return;

  let html = '';

  /* Hero */
  html += '<header class="hero"><div class="container">';
  html += '<p class="section-label">Operating Model</p>';
  html += `<h1>${pageData.title}</h1>`;
  html += `<p class="subtitle">${pageData.description}</p>`;
  html += '</div></header>';

  /* Overview section */
  if (pageData.overview) {
    html += '<div class="dashboard-section"><div class="container">';
    html += '<p class="section-label">What is an EA Operating Model?</p>';
    html += '<h2>Six Dimensions</h2>';
    html += `<p class="page-description">${pageData.overview.what}</p>`;
    html += '<div class="om-dim-grid">';
    for (const dim of pageData.overview.dimensions) {
      html += `<div class="om-dim-card">
        <div class="om-dim-icon">${dim.icon}</div>
        <div class="om-dim-label">${dim.label}</div>
        <div class="om-dim-desc">${dim.description}</div>
      </div>`;
    }
    html += '</div>';
    html += '</div></div>';
  }

  /* Operating Model Types */
  if (pageData.operating_models) {
    html += '<div class="dashboard-section"><div class="container">';
    html += '<p class="section-label">Organisational Model</p>';
    html += '<h2>Choose Your Operating Model Type</h2>';
    html += '<p class="page-description">The right model depends on your organisation\'s size, maturity, regulatory environment, and AI ambition. Most organisations deploying AI at scale benefit from a hybrid approach.</p>';
    html += '<div class="om-types-grid">';
    for (const model of pageData.operating_models) {
      const borderColour = model.id === 'hybrid' ? 'var(--accent)' : model.id === 'centralised' ? 'var(--impact-modify)' : 'var(--impact-extend)';
      html += `<div class="om-type-card" style="border-left-color:${borderColour}" id="om-type-${model.id}">`;
      html += `<div class="om-type-header" onclick="this.closest('.om-type-card').classList.toggle('open')">`;
      html += `<div>`;
      html += `<div class="om-type-label">${model.label}</div>`;
      html += `<div class="om-type-best">${model.best_for}</div>`;
      html += `</div>`;
      html += chevronSVG();
      html += `</div>`;
      html += `<div class="om-type-detail">`;
      html += `<p class="om-type-desc">${model.description}</p>`;
      /* Metrics */
      html += '<div class="om-type-metrics">';
      const metricLabels = { decision_speed: 'Decision Speed', consistency: 'Consistency', scalability: 'Scalability' };
      for (const [key, label] of Object.entries(metricLabels)) {
        const val = model.metrics[key] || 0;
        html += `<div class="om-metric">
          <div class="om-metric-label">${label}</div>
          <div class="om-metric-dots">${'<span class="om-metric-dot filled"></span>'.repeat(val)}${'<span class="om-metric-dot"></span>'.repeat(5 - val)}</div>
        </div>`;
      }
      html += '</div>';
      /* Strengths */
      html += '<div class="om-type-section"><div class="om-type-section-title">Strengths</div><ul>';
      for (const s of model.strengths) html += `<li>${s}</li>`;
      html += '</ul></div>';
      /* Trade-offs */
      html += '<div class="om-type-section"><div class="om-type-section-title">Trade-offs</div><ul>';
      for (const t of model.trade_offs) html += `<li>${t}</li>`;
      html += '</ul></div>';
      /* Agentic considerations */
      html += `<div class="om-type-agentic"><div class="om-type-section-title">Agentic Organisation Considerations</div><p>${model.agentic_considerations}</p></div>`;
      html += '</div>'; // om-type-detail
      html += '</div>'; // om-type-card
    }
    html += '</div>';
    html += '</div></div>';
  }

  /* Capability Model Diagram */
  if (pageData.subtopics) {
    html += '<div class="dashboard-section"><div class="container">';
    html += '<p class="section-label">Capability Model</p>';
    html += '<h2>47 EA Capabilities</h2>';
    html += '<p class="page-description">37 traditional capabilities (modified or extended for AI) plus 10 net-new capabilities for the agentic organisation. Click any capability to see its detailed analysis on the relevant sub-page.</p>';
    html += renderCapabilityDiagram(pageData.subtopics);
    html += '</div></div>';
  }

  /* Component Cards */
  if (pageData.components && pageData.components.length) {
    html += '<div class="dashboard-section"><div class="container">';
    html += '<p class="section-label">Deep Dives</p>';
    html += '<h2>EA Operating Model Components</h2>';
    html += '<p class="page-description">Each component has a dedicated page with detailed analysis of traditional vs. agentic EA practices, an interactive comparison table, and a self-assessment tool.</p>';
    html += '<div class="om-components">';
    for (const c of pageData.components) {
      html += `<a class="om-component-card" href="${c.href}">
        <div class="om-component-title">${c.label}</div>
        <div class="om-component-desc">${c.description}</div>
      </a>`;
    }
    html += '</div>';
    html += '</div></div>';
  }

  /* Engagement Model */
  if (pageData.engagement) {
    const eng = pageData.engagement;
    html += '<div class="dashboard-section"><div class="container">';
    html += '<p class="section-label">Engagement</p>';
    html += '<h2>When Does EA Get Involved?</h2>';
    html += `<p class="page-description">${eng.description}</p>`;
    /* Tier cards */
    html += '<div class="om-engagement-tiers">';
    for (const tier of eng.tiers) {
      html += `<div class="om-tier-card" style="border-top-color:${tier.colour}">`;
      html += `<div class="om-tier-level" style="color:${tier.colour}">${tier.label}</div>`;
      html += '<ul class="om-tier-criteria">';
      for (const c of tier.criteria) html += `<li>${c}</li>`;
      html += '</ul>';
      html += `<div class="om-tier-sla"><strong>SLA:</strong> ${tier.sla}</div>`;
      html += `<div class="om-tier-agentic">${tier.agentic_addition}</div>`;
      html += '</div>';
    }
    html += '</div>';
    /* ARB structure */
    html += '<h3 style="margin-top:2rem">Architecture Review Board Structure</h3>';
    html += '<div class="om-arb-grid">';
    for (const arb of eng.arb) {
      html += `<div class="om-arb-card">
        <div class="om-arb-board">${arb.board}</div>
        <div class="om-arb-freq">${arb.frequency}</div>
        <div class="om-arb-scope">${arb.scope}</div>
        <div class="om-arb-members"><strong>Members:</strong> ${arb.members}</div>
      </div>`;
    }
    html += '</div>';
    html += '</div></div>';
  }

  /* Performance & Maturity */
  if (pageData.performance) {
    const perf = pageData.performance;
    html += '<div class="dashboard-section"><div class="container">';
    html += '<p class="section-label">Performance</p>';
    html += '<h2>Measuring EA Effectiveness</h2>';
    html += `<p class="page-description">${perf.description}</p>`;
    /* KPIs */
    html += '<div class="om-kpi-grid">';
    for (const kpi of perf.kpis) {
      html += `<div class="om-kpi-card">
        <div class="om-kpi-icon">${kpi.icon}</div>
        <div class="om-kpi-label">${kpi.label}</div>
        <div class="om-kpi-target">${kpi.target}</div>
        <div class="om-kpi-desc">${kpi.description}</div>
      </div>`;
    }
    html += '</div>';
    /* Maturity Model */
    html += '<h3 style="margin-top:2rem">EA Maturity Model</h3>';
    html += '<p class="page-description">Five maturity levels with recommended operating model and AI readiness assessment per level.</p>';
    html += '<div class="om-maturity">';
    for (const level of perf.maturity_model) {
      html += `<div class="om-maturity-step">
        <div class="om-maturity-level">${level.level}</div>
        <div class="om-maturity-label">${level.label}</div>
        <div class="om-maturity-desc">${level.description}</div>
        <div class="om-maturity-meta"><strong>Recommended model:</strong> ${level.recommended_model}</div>
        <div class="om-maturity-meta"><strong>AI readiness:</strong> ${level.ai_readiness}</div>
      </div>`;
    }
    html += '</div>';
    html += '</div></div>';
  }

  el.innerHTML = html;
}

/* ── New Capabilities Page ────────────────────────────── */

function initNewCapabilitiesPage() {
  const el = document.getElementById('tab-content');
  if (!el || !pageData) return;

  let html = '';

  /* Hero */
  html += '<header class="hero"><div class="container">';
  html += '<p class="section-label">Net-New Capabilities</p>';
  html += `<h1>${pageData.title}</h1>`;
  html += `<p class="subtitle">${pageData.subtitle}</p>`;
  html += '</div></header>';

  /* Capabilities grid */
  html += '<div class="dashboard-section"><div class="container">';
  html += '<div class="new-cap-grid">';
  for (const cap of pageData.capabilities) {
    html += `<div class="new-cap-card" id="${cap.id}">`;
    html += `<div class="new-cap-header" onclick="this.closest('.new-cap-card').classList.toggle('open')">`;
    html += `<div class="new-cap-label">${cap.label}</div>`;
    html += chevronSVG();
    html += '</div>';
    html += '<div class="new-cap-detail">';
    html += `<div class="new-cap-desc">${cap.description}</div>`;
    html += `<div class="new-cap-why"><div class="new-cap-why-title">Why This Is New</div><p>${cap.why_new}</p></div>`;
    html += '<div class="new-cap-practices"><div class="new-cap-practices-title">Key Practices</div><ul>';
    for (const p of cap.key_practices) html += `<li>${p}</li>`;
    html += '</ul></div>';
    if (cap.related_pages && cap.related_pages.length) {
      html += '<div class="new-cap-links">';
      for (const link of cap.related_pages) {
        html += `<a class="new-cap-link" href="${link.href}">${link.label} &rarr;</a>`;
      }
      html += '</div>';
    }
    html += '</div>'; // new-cap-detail
    html += '</div>'; // new-cap-card
  }
  html += '</div>';
  html += '</div></div>';

  el.innerHTML = html;

  // Open from hash
  const hash = window.location.hash.slice(1);
  if (hash) {
    const card = document.getElementById(hash);
    if (card) {
      card.classList.add('open');
      setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }
}

/* ── Architecture Reference Page ──────────────────────── */

function initArchitecturePage() {
  const el = document.getElementById('architecture-content');
  if (!el || !pageData) return;

  let html = '';

  /* Hero */
  html += '<header class="hero"><div class="container">';
  html += '<p class="section-label">Reference Architecture</p>';
  html += `<h1>${pageData.title}</h1>`;
  html += `<p class="subtitle">${pageData.subtitle}</p>`;
  html += '</div></header>';

  /* Diagram section */
  html += '<div class="dashboard-section"><div class="container">';
  html += '<p class="section-label">Technology Stack</p>';
  html += '<h2>Nine Layers &amp; Three Cross-Cutting Concerns</h2>';
  html += `<p class="page-description">${pageData.description}</p>`;
  html += renderArchDiagram(pageData.layers, pageData.cross_cutting);
  html += '</div></div>';

  /* Sources section */
  if (pageData.reference_architectures && pageData.reference_architectures.length) {
    html += '<div class="dashboard-section"><div class="container">';
    html += '<p class="section-label">Sources</p>';
    html += '<h2>Reference Architectures Analysed</h2>';
    html += '<p class="page-description">Synthesised from eight major reference architectures across hyperscalers, analyst firms, and enterprise vendors.</p>';
    html += renderArchSources(pageData.reference_architectures, pageData.layers);
    html += '</div></div>';
  }

  el.innerHTML = html;

  /* Layer expand/collapse handlers */
  el.querySelectorAll('.arch-layer-bar').forEach(bar => {
    bar.addEventListener('click', () => {
      bar.closest('.arch-layer-row').classList.toggle('open');
    });
  });

  /* Cross-cutting expand/collapse */
  const ccTrigger = el.querySelector('.arch-cc-trigger');
  if (ccTrigger) {
    ccTrigger.addEventListener('click', () => {
      ccTrigger.closest('.arch-cc-row').classList.toggle('open');
    });
  }
}

function renderArchDiagram(layers, crossCutting) {
  let html = '<div class="arch-diagram">';

  /* Layers stack */
  html += '<div class="arch-layers-stack">';
  for (const layer of layers) {
    html += `<div class="arch-layer-row" id="arch-${layer.id}">`;
    html += `<div class="arch-layer-bar" style="background:${layer.color_bg};border-color:${layer.color_border};--layer-color:${layer.color}">`;
    html += `<div class="arch-layer-number" style="background:${layer.color}">${layer.order}</div>`;
    html += '<div class="arch-layer-info">';
    html += `<div class="arch-layer-name">${layer.label}</div>`;
    html += `<div class="arch-layer-components">${layer.short}</div>`;
    html += '</div>';
    html += chevronSVG();
    html += '</div>'; /* arch-layer-bar */

    /* Detail panel */
    html += '<div class="arch-layer-detail">';
    html += `<p class="arch-layer-desc">${layer.description}</p>`;
    if (layer.components && layer.components.length) {
      html += '<div class="arch-component-grid">';
      for (const c of layer.components) {
        html += `<div class="arch-component-card">`;
        html += `<div class="arch-component-name">${c.name}</div>`;
        html += `<div class="arch-component-desc">${c.description}</div>`;
        html += '</div>';
      }
      html += '</div>';
    }
    if (layer.sources && layer.sources.length) {
      html += '<div class="arch-layer-sources">';
      html += '<span class="arch-sources-label">Referenced in:</span> ';
      html += layer.sources.join(' &middot; ');
      html += '</div>';
    }
    if (layer.implementation && layer.implementation.length) {
      html += '<div class="arch-impl-section">';
      html += '<div class="arch-impl-label">Implementation Patterns</div>';
      for (const p of layer.implementation) {
        html += '<div class="arch-impl-card">';
        html += `<div class="arch-impl-name">${p.pattern}</div>`;
        html += `<div class="arch-impl-when">${p.when}</div>`;
        html += `<div class="arch-impl-desc">${p.description}</div>`;
        html += '<div class="arch-impl-tools">';
        for (const t of p.tools) { html += `<span class="arch-impl-tool">${t}</span>`; }
        html += '</div></div>';
      }
      html += '</div>';
    }
    html += '</div>'; /* arch-layer-detail */
    html += '</div>'; /* arch-layer-row */
  }
  html += '</div>'; /* arch-layers-stack */

  /* Cross-cutting concerns — single expandable row */
  html += '<div class="arch-cc-row">';
  html += '<div class="arch-cc-trigger">';
  html += '<span class="arch-cc-trigger-label">Cross-Cutting Concerns</span>';
  html += '<span class="arch-cc-trigger-names">';
  html += crossCutting.map(cc => `<span class="arch-cc-tag" style="--cc-color:${cc.color}"><span class="arch-cc-dot" style="background:${cc.color}"></span>${cc.label}</span>`).join('');
  html += '</span>';
  html += chevronSVG();
  html += '</div>';
  html += '<div class="arch-cc-detail">';
  html += '<div class="arch-cc-grid">';
  for (const cc of crossCutting) {
    html += `<div class="arch-cc-card" id="arch-cc-${cc.id}">`;
    html += `<div class="arch-cc-card-title" style="--cc-color:${cc.color}"><span class="arch-cc-dot" style="background:${cc.color}"></span>${cc.label}</div>`;
    html += `<p class="arch-cc-desc">${cc.description}</p>`;
    if (cc.components && cc.components.length) {
      html += '<div class="arch-component-grid">';
      for (const c of cc.components) {
        html += `<div class="arch-component-card">`;
        html += `<div class="arch-component-name">${c.name}</div>`;
        html += `<div class="arch-component-desc">${c.description}</div>`;
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div>'; /* arch-cc-grid */
  html += '</div>'; /* arch-cc-detail */
  html += '</div>'; /* arch-cc-row */

  html += '</div>'; /* arch-diagram */
  return html;
}

function renderArchSources(sources, layers) {
  let html = '<div class="arch-sources-grid">';
  for (const src of sources) {
    html += '<div class="arch-source-card">';
    html += `<div class="arch-source-name">${src.name}</div>`;
    html += `<div class="arch-source-framework">${src.framework}</div>`;
    html += `<div class="arch-source-desc">${src.description}</div>`;
    if (src.layer_coverage && src.layer_coverage.length) {
      html += '<div class="arch-source-coverage">';
      for (const layer of layers) {
        const covered = src.layer_coverage.includes(layer.id);
        html += `<span class="arch-coverage-num${covered ? ' covered' : ''}" style="${covered ? 'background:' + layer.color : ''}" title="${layer.label}${covered ? '' : ' (not covered)'}">${layer.order}</span>`;
      }
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div>';
  // Legend
  html += '<div class="arch-coverage-legend">';
  html += '<span class="arch-coverage-legend-label">Layer Coverage:</span>';
  for (const layer of layers) {
    html += `<span class="arch-coverage-legend-item"><span class="arch-legend-number" style="background:${layer.color}">${layer.order}</span>${layer.label}</span>`;
  }
  html += '</div>';
  return html;
}

/* ── Maturity Assessment Page ─────────────────────────── */

function initMaturityPage() {
  const el = document.getElementById('tab-content');
  if (!el || !pageData) return;

  let html = '';

  /* Hero */
  html += '<header class="hero"><div class="container">';
  html += '<p class="section-label">Maturity Assessment</p>';
  html += `<h1>${pageData.title}</h1>`;
  html += `<p class="subtitle">${pageData.subtitle}</p>`;
  html += '</div></header>';

  /* Dimensions overview */
  html += '<div class="dashboard-section"><div class="container">';
  html += '<p class="section-label">Assessment Framework</p>';
  html += '<h2>Six Dimensions of EA Maturity</h2>';
  html += `<p class="page-description">${pageData.description}</p>`;
  html += '<div class="om-dim-grid">';
  for (const dim of pageData.dimensions) {
    html += `<div class="om-dim-card">
      <div class="om-dim-icon">${dim.icon}</div>
      <div class="om-dim-label">${dim.label}</div>
    </div>`;
  }
  html += '</div>';
  html += '</div></div>';

  /* Stage cards */
  html += '<div class="dashboard-section"><div class="container">';
  html += '<p class="section-label">Five Stages</p>';
  html += '<h2>Where Are You Today?</h2>';
  html += '<p class="page-description">Each stage describes what you will observe across six dimensions. Identify your current stage, then focus on the prescribed actions to reach the next level.</p>';

  for (const stage of pageData.stages) {
    html += `<div class="maturity-stage" id="stage-${stage.level}" style="--stage-color:${stage.color}">`;

    /* Stage header */
    html += `<div class="maturity-stage-header" onclick="this.closest('.maturity-stage').classList.toggle('open')">`;
    html += `<div class="maturity-stage-badge" style="background:${stage.color}">${stage.level}</div>`;
    html += '<div class="maturity-stage-info">';
    html += `<div class="maturity-stage-label">${stage.label}</div>`;
    html += `<div class="maturity-stage-tagline">${stage.tagline}</div>`;
    html += '</div>';
    html += chevronSVG();
    html += '</div>';

    /* Stage detail */
    html += '<div class="maturity-stage-detail">';

    /* Summary */
    html += `<p class="maturity-stage-summary">${stage.characteristics.summary}</p>`;

    /* How you know */
    html += '<div class="maturity-know-section">';
    html += '<h4>How You Know You Are Here</h4>';
    html += '<ul class="maturity-know-list">';
    for (const item of stage.how_you_know) {
      html += `<li>${item}</li>`;
    }
    html += '</ul></div>';

    /* Dimension details */
    html += '<div class="maturity-dimensions">';
    for (const dim of pageData.dimensions) {
      const text = stage.characteristics[dim.id];
      if (!text) continue;
      html += `<div class="maturity-dim-card">`;
      html += `<div class="maturity-dim-header">${dim.icon} ${dim.label}</div>`;
      html += `<p class="maturity-dim-text">${text}</p>`;
      html += '</div>';
    }
    html += '</div>';

    /* Next actions */
    html += '<div class="maturity-actions-section">';
    html += `<h4>Focused Actions to Reach ${stage.level < 5 ? 'Stage ' + (stage.level + 1) : 'Excellence'}</h4>`;
    html += '<div class="maturity-actions-grid">';
    for (const action of stage.next_actions) {
      html += `<div class="maturity-action-card">`;
      html += `<div class="maturity-action-title">${action.title}</div>`;
      html += `<p class="maturity-action-desc">${action.description}</p>`;
      html += '</div>';
    }
    html += '</div></div>';

    html += '</div>'; // maturity-stage-detail
    html += '</div>'; // maturity-stage
  }

  /* Sources */
  html += '<div class="maturity-sources">';
  html += '<h4>Framework Sources</h4>';
  html += '<ul>';
  for (const src of pageData.sources) {
    html += `<li>${src}</li>`;
  }
  html += '</ul></div>';

  html += '</div></div>'; // container, section

  el.innerHTML = html;

  // Open from hash
  const hash = window.location.hash.slice(1);
  if (hash) {
    const target = document.getElementById(hash);
    if (target) {
      target.classList.add('open');
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }
}

/* ── Governance Page ─────────────────────────────────── */

function initGovernancePage() {
  const el = document.getElementById('tab-content');
  if (!el || !pageData) return;

  let html = '';

  /* Hero */
  html += '<header class="hero"><div class="container">';
  html += '<p class="section-label">Governance</p>';
  html += `<h1>${pageData.title}</h1>`;
  html += `<p class="subtitle">${pageData.subtitle}</p>`;
  html += '</div></header>';

  /* Section navigation */
  html += '<div class="dashboard-section"><div class="container">';
  html += '<div class="gov-nav-grid">';
  for (const sec of pageData.sections) {
    html += `<a class="gov-nav-card" href="#${sec.id}" onclick="event.preventDefault();document.getElementById('${sec.id}').scrollIntoView({behavior:'smooth',block:'start'})">`;
    html += `<span class="gov-nav-icon">${sec.icon}</span>`;
    html += `<span class="gov-nav-label">${sec.label}</span>`;
    html += '</a>';
  }
  html += '</div>';
  html += '</div></div>';

  /* Render each section */
  for (const sec of pageData.sections) {
    html += `<div class="dashboard-section" id="${sec.id}"><div class="container">`;
    html += `<p class="section-label">${sec.label}</p>`;
    html += `<h2>${sec.label}</h2>`;
    html += `<p class="page-description">${sec.summary}</p>`;

    /* Principles section — special rendering */
    if (sec.principles) {
      html += renderPrinciples(sec.principles);
    }

    /* Anti-patterns section — special rendering */
    if (sec.anti_patterns) {
      html += renderAntiPatterns(sec.anti_patterns);
    }

    /* Standard subsections */
    if (sec.subsections) {
      for (const sub of sec.subsections) {
        html += `<div class="gov-subsection" id="${sub.id}">`;
        html += `<div class="gov-subsection-header" onclick="this.closest('.gov-subsection').classList.toggle('open')">`;
        html += `<h3>${sub.title}</h3>`;
        html += chevronSVG();
        html += '</div>';
        html += `<div class="gov-subsection-content">${sub.content}</div>`;
        html += '</div>';
      }
    }

    html += '</div></div>';
  }

  /* Sources */
  html += '<div class="dashboard-section"><div class="container">';
  html += '<div class="maturity-sources">';
  html += '<h4>Sources &amp; Frameworks</h4>';
  html += '<ul>';
  for (const src of pageData.sources) {
    html += `<li>${src}</li>`;
  }
  html += '</ul></div>';
  html += '</div></div>';

  el.innerHTML = html;

  // Open from hash
  const hash = window.location.hash.slice(1);
  if (hash) {
    const target = document.getElementById(hash);
    if (target) {
      if (target.classList.contains('gov-subsection')) target.classList.add('open');
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }
}

function renderPrinciples(principles) {
  let html = '<div class="gov-principles">';
  for (let i = 0; i < principles.length; i++) {
    const p = principles[i];
    html += `<div class="gov-principle" id="${p.id}">`;
    html += `<div class="gov-principle-header" onclick="this.closest('.gov-principle').classList.toggle('open')">`;
    html += `<span class="gov-principle-num">${i + 1}</span>`;
    html += `<div class="gov-principle-info">`;
    html += `<div class="gov-principle-title">${p.title}</div>`;
    html += `<div class="gov-principle-stmt">${p.statement}</div>`;
    html += '</div>';
    html += chevronSVG();
    html += '</div>';
    html += '<div class="gov-principle-detail">';
    html += `<div class="gov-principle-section"><h5>Rationale</h5><p>${p.rationale}</p></div>`;
    html += '<div class="gov-principle-section"><h5>Implications</h5><ul>';
    for (const imp of p.implications) {
      html += `<li>${imp}</li>`;
    }
    html += '</ul></div>';
    if (p.example) {
      html += `<div class="gov-principle-example"><strong>Example:</strong> ${p.example}</div>`;
    }
    html += '</div>';
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderAntiPatterns(patterns) {
  let html = '<div class="gov-antipatterns">';
  for (const ap of patterns) {
    html += `<div class="gov-antipattern" id="${ap.id}">`;
    html += `<div class="gov-antipattern-header" onclick="this.closest('.gov-antipattern').classList.toggle('open')">`;
    html += `<div class="gov-antipattern-title">${ap.title}</div>`;
    html += chevronSVG();
    html += '</div>';
    html += '<div class="gov-antipattern-detail">';
    html += `<div class="gov-ap-row"><div class="gov-ap-label">Symptoms</div><p>${ap.symptoms}</p></div>`;
    html += `<div class="gov-ap-row"><div class="gov-ap-label">Root Cause</div><p>${ap.root_cause}</p></div>`;
    html += `<div class="gov-ap-row"><div class="gov-ap-label">Impact</div><p>${ap.impact}</p></div>`;
    html += `<div class="gov-ap-row gov-ap-fix"><div class="gov-ap-label">Fix</div><p>${ap.fix}</p></div>`;
    html += '</div>';
    html += '</div>';
  }
  html += '</div>';
  return html;
}

/* ── People & Organisation Page ──────────────────────── */

function initPeoplePage() {
  const el = document.getElementById('tab-content');
  if (!el || !pageData) return;

  let html = '';

  /* Hero */
  html += '<header class="hero"><div class="container">';
  html += '<p class="section-label">People &amp; Organisation</p>';
  html += `<h1>${pageData.title}</h1>`;
  html += `<p class="subtitle">${pageData.subtitle}</p>`;
  html += '</div></header>';

  /* Section navigation */
  html += '<div class="dashboard-section"><div class="container">';
  html += '<div class="gov-nav-grid">';
  for (const sec of pageData.sections) {
    html += `<a class="gov-nav-card" href="#${sec.id}" onclick="event.preventDefault();document.getElementById('${sec.id}').scrollIntoView({behavior:'smooth',block:'start'})">`;
    html += `<span class="gov-nav-icon">${sec.icon}</span>`;
    html += `<span class="gov-nav-label">${sec.label}</span>`;
    html += '</a>';
  }
  html += '</div>';
  html += '</div></div>';

  /* Render each section */
  for (const sec of pageData.sections) {
    html += `<div class="dashboard-section" id="${sec.id}"><div class="container">`;
    html += `<p class="section-label">${sec.label}</p>`;
    html += `<h2>${sec.label}</h2>`;
    html += `<p class="page-description">${sec.summary}</p>`;

    /* Organisation models — special rendering */
    if (sec.org_models) {
      html += renderOrgModels(sec.org_models);
    }

    /* Roadmap phases — special rendering */
    if (sec.phases) {
      html += renderRoadmapPhases(sec.phases);
    }

    /* Standard subsections */
    if (sec.subsections) {
      for (const sub of sec.subsections) {
        html += `<div class="gov-subsection" id="${sub.id}">`;
        html += `<div class="gov-subsection-header" onclick="this.closest('.gov-subsection').classList.toggle('open')">`;
        html += `<h3>${sub.title}</h3>`;
        html += chevronSVG();
        html += '</div>';
        html += `<div class="gov-subsection-content">${sub.content}</div>`;
        html += '</div>';
      }
    }

    html += '</div></div>';
  }

  /* Sources */
  html += '<div class="dashboard-section"><div class="container">';
  html += '<div class="maturity-sources">';
  html += '<h4>Sources &amp; Frameworks</h4>';
  html += '<ul>';
  for (const src of pageData.sources) {
    html += `<li>${src}</li>`;
  }
  html += '</ul></div>';
  html += '</div></div>';

  el.innerHTML = html;

  // Open from hash
  const hash = window.location.hash.slice(1);
  if (hash) {
    const target = document.getElementById(hash);
    if (target) {
      if (target.classList.contains('gov-subsection')) target.classList.add('open');
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }
}

function renderOrgModels(models) {
  let html = '<div class="people-org-models">';
  for (const m of models) {
    html += `<div class="people-org-model" id="${m.id}">`;
    html += `<div class="gov-subsection-header" onclick="this.closest('.people-org-model').classList.toggle('open')">`;
    html += `<h3>${m.title}</h3>`;
    if (m.id === 'hybrid') html += '<span class="people-recommended">Recommended</span>';
    html += chevronSVG();
    html += '</div>';
    html += '<div class="people-org-detail">';
    html += `<p>${m.description}</p>`;
    html += '<div class="people-org-grid">';
    html += '<div><h5>Strengths</h5><ul>';
    for (const s of m.strengths) html += `<li>${s}</li>`;
    html += '</ul></div>';
    html += '<div><h5>Trade-offs</h5><ul>';
    for (const t of m.trade_offs) html += `<li>${t}</li>`;
    html += '</ul></div>';
    html += '</div>';
    html += `<div class="people-org-agentic"><h5>Fit for Agentic Organisations</h5><p>${m.agentic_fit}</p></div>`;
    html += `<div class="people-org-best"><strong>Best for:</strong> ${m.best_for}</div>`;
    html += '</div></div>';
  }
  html += '</div>';
  return html;
}

function renderRoadmapPhases(phases) {
  let html = '<div class="people-roadmap">';
  for (const p of phases) {
    html += `<div class="people-phase" id="${p.id}">`;
    html += `<div class="people-phase-header">`;
    html += `<span class="people-phase-time">${p.timeframe}</span>`;
    html += `<span class="people-phase-title">${p.title}</span>`;
    html += '</div>';
    html += '<ul class="people-phase-actions">';
    for (const a of p.actions) {
      html += `<li>${a}</li>`;
    }
    html += '</ul></div>';
  }
  html += '</div>';
  return html;
}

/* ── Processes Page ───────────────────────────────────── */
function initProcessesPage() {
  const tc = document.getElementById('tab-content');
  if (!tc || !pageData) return;

  let html = '';

  /* Hero */
  html += '<header class="hero"><div class="container">';
  html += '<p class="section-label">Processes</p>';
  html += `<h1>${pageData.title}</h1>`;
  html += `<p class="subtitle">${pageData.subtitle}</p>`;
  html += '</div></header>';

  /* Section nav grid */
  html += '<div class="dashboard-section"><div class="container">';
  html += '<div class="gov-nav-grid">';
  for (const sec of pageData.sections) {
    html += `<a class="gov-nav-card" href="#${sec.id}" onclick="event.preventDefault();document.getElementById('${sec.id}').scrollIntoView({behavior:'smooth',block:'start'})">`;
    html += `<span class="gov-nav-icon">${sec.icon}</span>`;
    html += `<span class="gov-nav-label">${sec.label}</span>`;
    html += '</a>';
  }
  html += '</div>';
  html += '</div></div>';

  /* Sections */
  for (const sec of pageData.sections) {
    html += `<div class="dashboard-section" id="${sec.id}"><div class="container">`;
    html += `<p class="section-label">${sec.label}</p>`;
    html += `<h2>${sec.label}</h2>`;
    html += `<p class="page-description">${sec.summary}</p>`;

    /* Phases (practitioner guidance) */
    if (sec.phases) {
      html += renderRoadmapPhases(sec.phases);
    }

    /* Standard subsections */
    if (sec.subsections) {
      for (const sub of sec.subsections) {
        html += `<div class="gov-subsection" id="${sub.id}">`;
        html += `<div class="gov-subsection-header" onclick="this.closest('.gov-subsection').classList.toggle('open')">`;
        html += `<h3>${sub.title}</h3>`;
        html += chevronSVG();
        html += '</div>';
        html += `<div class="gov-subsection-content">${sub.content}</div>`;
        html += '</div>';
      }
    }

    html += '</div></div>';
  }

  /* Sources */
  if (pageData.sources && pageData.sources.length) {
    html += '<div class="dashboard-section" id="sources"><div class="container">';
    html += '<h2>Sources</h2><ul>';
    for (const s of pageData.sources) { html += `<li>${s}</li>`; }
    html += '</ul></div></div>';
  }

  tc.innerHTML = html;

  /* Auto-expand from hash */
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      if (target.classList.contains('gov-subsection')) target.classList.add('open');
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }
}

/* ── Tools & Repository Page ─────────────────────────── */
function initToolsRepositoryPage() {
  const tc = document.getElementById('tab-content');
  if (!tc || !pageData) return;

  let html = '';

  /* Hero */
  html += '<header class="hero"><div class="container">';
  html += '<p class="section-label">Tools & Repository</p>';
  html += `<h1>${pageData.title}</h1>`;
  html += `<p class="subtitle">${pageData.subtitle}</p>`;
  html += '</div></header>';

  /* Section nav grid */
  html += '<div class="dashboard-section"><div class="container">';
  html += '<div class="gov-nav-grid">';
  for (const sec of pageData.sections) {
    html += `<a class="gov-nav-card" href="#${sec.id}" onclick="event.preventDefault();document.getElementById('${sec.id}').scrollIntoView({behavior:'smooth',block:'start'})">`;
    html += `<span class="gov-nav-icon">${sec.icon}</span>`;
    html += `<span class="gov-nav-label">${sec.label}</span>`;
    html += '</a>';
  }
  html += '</div>';
  html += '</div></div>';

  /* Sections */
  for (const sec of pageData.sections) {
    html += `<div class="dashboard-section" id="${sec.id}"><div class="container">`;
    html += `<p class="section-label">${sec.label}</p>`;
    html += `<h2>${sec.label}</h2>`;
    html += `<p class="page-description">${sec.summary}</p>`;

    /* Phases (practitioner guidance) */
    if (sec.phases) {
      html += renderRoadmapPhases(sec.phases);
    }

    /* Standard subsections */
    if (sec.subsections) {
      for (const sub of sec.subsections) {
        html += `<div class="gov-subsection" id="${sub.id}">`;
        html += `<div class="gov-subsection-header" onclick="this.closest('.gov-subsection').classList.toggle('open')">`;
        html += `<h3>${sub.title}</h3>`;
        html += chevronSVG();
        html += '</div>';
        html += `<div class="gov-subsection-content">${sub.content}</div>`;
        html += '</div>';
      }
    }

    html += '</div></div>';
  }

  /* Sources */
  if (pageData.sources && pageData.sources.length) {
    html += '<div class="dashboard-section" id="sources"><div class="container">';
    html += '<h2>Sources</h2><ul>';
    for (const s of pageData.sources) { html += `<li>${s}</li>`; }
    html += '</ul></div></div>';
  }

  tc.innerHTML = html;

  /* Auto-expand from hash */
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      if (target.classList.contains('gov-subsection')) target.classList.add('open');
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }
}

/* ── Site-Wide Search ──────────────────────────────────── */
let searchIndex = null;
let searchOverlay = null;

function stripHTML(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || '';
}

function truncate(text, max) {
  if (!text) return '';
  text = text.replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max) + '\u2026' : text;
}

async function buildSearchIndex() {
  if (searchIndex) return searchIndex;

  const files = [
    'home', 'overview', 'recommendations', 'new-capabilities',
    'ea-operating-model', 'new-capabilities-detail',
    'banking', 'reinsurance', 'pharma',
    'architecture-reference', 'capabilities', 'maturity', 'governance', 'people',
    'processes', 'tools-repository'
  ];
  const results = await Promise.all(files.map(f => loadJSON(`data/${f}.json`)));
  const idx = [];

  const pageLabels = {};
  if (siteData) {
    for (const n of siteData.nav) {
      if (n.children) n.children.forEach(c => { pageLabels[c.id] = c.label; });
      else pageLabels[n.id] = n.label;
    }
  }

  results.forEach((data, i) => {
    if (!data) return;
    const file = files[i];
    const pageLabel = pageLabels[file] || data.title || file;
    const href = file === 'home' ? 'index.html' : file + '.html';

    // Page-level entry
    if (data.title) {
      idx.push({ type: 'page', title: pageLabel, snippet: stripHTML(data.subtitle || data.description || ''), href, page: pageLabel });
    }

    // Concept page subtopics
    if (data.subtopics) {
      for (const st of data.subtopics) {
        const texts = [
          st.traditional ? st.traditional.summary : '',
          st.traditional ? stripHTML(st.traditional.body_html) : '',
          st.changes ? st.changes.summary : '',
          st.changes ? stripHTML(st.changes.body_html) : '',
          st.changes ? (st.changes.key_shifts || []).map(stripHTML).join(' ') : '',
          st.future_state ? st.future_state.summary : '',
          st.future_state ? stripHTML(st.future_state.description) : '',
          st.ai_impact ? st.ai_impact.summary : '',
          st.ai_impact ? stripHTML(st.ai_impact.body_html) : ''
        ].join(' ');
        idx.push({ type: 'topic', title: st.label, snippet: truncate(stripHTML(st.changes?.summary || st.ai_impact?.summary || st.traditional?.summary || ''), 200), href: href + '#' + st.id, page: pageLabel, _text: (st.label + ' ' + texts).toLowerCase() });
      }
    }

    // Industry findings
    if (data.findings) {
      for (const f of data.findings) {
        idx.push({ type: 'finding', title: f.title, snippet: truncate(stripHTML(f.summary), 200), href: href, page: pageLabel, _text: (f.title + ' ' + stripHTML(f.summary)).toLowerCase() });
      }
    }

    // Industry case studies
    if (data.case_studies) {
      for (const cs of data.case_studies) {
        idx.push({ type: 'case_study', title: cs.company, snippet: truncate(stripHTML(cs.description), 200), href: href, page: pageLabel, _text: (cs.company + ' ' + stripHTML(cs.description) + ' ' + (cs.metrics || []).join(' ')).toLowerCase() });
      }
    }

    // Industry sections
    if (data.sections) {
      for (const s of data.sections) {
        const texts = [
          s.traditional ? s.traditional.summary : '',
          s.traditional ? stripHTML(s.traditional.body_html) : '',
          s.agentic ? s.agentic.summary : '',
          s.agentic ? stripHTML(s.agentic.body_html) : '',
          s.agentic ? (s.agentic.key_points || []).map(stripHTML).join(' ') : ''
        ].join(' ');
        idx.push({ type: 'topic', title: stripHTML(s.label), snippet: truncate(stripHTML(s.agentic?.summary || s.traditional?.summary || ''), 200), href: href + '#' + s.id, page: pageLabel, _text: (stripHTML(s.label) + ' ' + texts).toLowerCase() });
      }
    }

    // Industry EA domains
    if (data.ea_domains) {
      for (const d of data.ea_domains) {
        const texts = [
          d.label, d.industry_context,
          (d.key_adaptations || []).map(a => a.title + ' ' + a.description).join(' '),
          (d.practices || []).join(' ')
        ].join(' ');
        idx.push({ type: 'topic', title: stripHTML(d.label) + ' (' + pageLabel + ')', snippet: truncate(stripHTML(d.industry_context), 200), href: href + '#domains', page: pageLabel, _text: (stripHTML(d.label) + ' ' + stripHTML(texts)).toLowerCase() });
      }
    }

    // Architecture layers
    if (data.layers) {
      for (const layer of data.layers) {
        const texts = [layer.label, layer.short, layer.description,
          (layer.components || []).map(c => c.name + ' ' + c.description).join(' '),
          (layer.implementation || []).map(p => p.pattern + ' ' + p.tools.join(' ') + ' ' + p.when + ' ' + p.description).join(' ')
        ].join(' ');
        idx.push({ type: 'topic', title: layer.label, snippet: truncate(layer.short, 200), href: href + '#arch-' + layer.id, page: pageLabel, _text: texts.toLowerCase() });
      }
    }

    // Home findings
    if (data.findings && file === 'home') {
      for (const f of data.findings) {
        const text = f.title || f.headline || '';
        idx.push({ type: 'finding', title: stripHTML(text), snippet: truncate(stripHTML(f.bottomline || f.body || f.summary || ''), 200), href: href, page: 'Home', _text: (stripHTML(text) + ' ' + stripHTML(f.body || f.summary || '')).toLowerCase() });
      }
    }

    // Recommendations
    if (file === 'recommendations' && Array.isArray(data)) {
      for (const r of data) {
        idx.push({ type: 'finding', title: r.title, snippet: truncate(stripHTML(r.description), 200), href: 'overview.html', page: 'Recommendations', _text: (r.title + ' ' + stripHTML(r.description)).toLowerCase() });
      }
    }

    // New capabilities (overview list)
    if (file === 'new-capabilities' && Array.isArray(data)) {
      for (const c of data) {
        idx.push({ type: 'finding', title: c.title, snippet: truncate(stripHTML(c.description), 200), href: 'overview.html', page: 'New Capabilities', _text: (c.title + ' ' + stripHTML(c.description)).toLowerCase() });
      }
    }

    // New capabilities detail page
    if (file === 'new-capabilities-detail' && data.capabilities) {
      for (const c of data.capabilities) {
        const texts = [c.label, stripHTML(c.description), stripHTML(c.why_new), (c.key_practices || []).join(' ')].join(' ');
        idx.push({ type: 'topic', title: c.label, snippet: truncate(stripHTML(c.description), 200), href: 'new-capabilities.html#' + c.id, page: 'New Capabilities', _text: texts.toLowerCase() });
      }
    }

    // Operating model sections
    if (file === 'ea-operating-model' && data.operating_models) {
      for (const m of data.operating_models) {
        const texts = [m.label, m.description, m.best_for, m.agentic_considerations, (m.strengths || []).join(' '), (m.trade_offs || []).join(' ')].join(' ');
        idx.push({ type: 'topic', title: m.label + ' Operating Model', snippet: truncate(stripHTML(m.description), 200), href: 'ea-operating-model.html#om-type-' + m.id, page: 'Operating Model', _text: texts.toLowerCase() });
      }
    }

    // Maturity stages
    if (file === 'maturity' && data.stages) {
      for (const s of data.stages) {
        const texts = [s.label, s.tagline, s.characteristics.summary, (s.how_you_know || []).join(' '), (s.next_actions || []).map(a => a.title + ' ' + a.description).join(' ')].join(' ');
        idx.push({ type: 'topic', title: 'Stage ' + s.level + ': ' + s.label, snippet: truncate(stripHTML(s.characteristics.summary), 200), href: 'maturity.html#stage-' + s.level, page: 'Maturity', _text: texts.toLowerCase() });
      }
    }

    // People & Organisation sections
    if (file === 'people' && data.sections) {
      for (const sec of data.sections) {
        if (sec.subsections) {
          for (const sub of sec.subsections) {
            idx.push({ type: 'topic', title: sub.title, snippet: truncate(stripHTML(sub.content), 200), href: 'people.html#' + sub.id, page: 'People & Organisation', _text: (sub.title + ' ' + stripHTML(sub.content)).toLowerCase() });
          }
        }
        if (sec.org_models) {
          for (const m of sec.org_models) {
            const mText = [m.title, m.description, m.agentic_fit, m.best_for, (m.strengths || []).join(' ')].join(' ');
            idx.push({ type: 'topic', title: m.title + ' Model', snippet: truncate(m.description, 200), href: 'people.html#' + m.id, page: 'People & Organisation', _text: mText.toLowerCase() });
          }
        }
      }
    }

    // Governance sections, principles, anti-patterns
    if (file === 'governance' && data.sections) {
      for (const sec of data.sections) {
        const secTexts = [sec.label, sec.summary];
        if (sec.subsections) {
          for (const sub of sec.subsections) {
            secTexts.push(sub.title, stripHTML(sub.content));
            idx.push({ type: 'topic', title: sub.title, snippet: truncate(stripHTML(sub.content), 200), href: 'governance.html#' + sub.id, page: 'Governance', _text: (sub.title + ' ' + stripHTML(sub.content)).toLowerCase() });
          }
        }
        if (sec.principles) {
          for (const p of sec.principles) {
            const pText = [p.title, p.statement, p.rationale, (p.implications || []).join(' '), p.example || ''].join(' ');
            idx.push({ type: 'topic', title: p.title, snippet: truncate(p.statement, 200), href: 'governance.html#' + p.id, page: 'Governance', _text: pText.toLowerCase() });
          }
        }
        if (sec.anti_patterns) {
          for (const ap of sec.anti_patterns) {
            const apText = [ap.title, ap.symptoms, ap.root_cause, ap.impact, ap.fix].join(' ');
            idx.push({ type: 'topic', title: 'Anti-Pattern: ' + ap.title, snippet: truncate(ap.symptoms, 200), href: 'governance.html#' + ap.id, page: 'Governance', _text: apText.toLowerCase() });
          }
        }
      }
    }

    // Processes & Tools-Repository sections
    if ((file === 'processes' || file === 'tools-repository') && data.sections) {
      for (const sec of data.sections) {
        if (sec.subsections) {
          for (const sub of sec.subsections) {
            idx.push({ type: 'topic', title: sub.title, snippet: truncate(stripHTML(sub.content), 200), href: href + '#' + sub.id, page: pageLabel, _text: (sub.title + ' ' + stripHTML(sub.content)).toLowerCase() });
          }
        }
        if (sec.phases) {
          for (const p of sec.phases) {
            const pText = [p.title, ...p.actions].join(' ');
            idx.push({ type: 'topic', title: p.title, snippet: truncate(pText, 200), href: href + '#' + sec.id, page: pageLabel, _text: pText.toLowerCase() });
          }
        }
      }
    }
  });

  // Build _text for items that don't have it yet
  for (const item of idx) {
    if (!item._text) item._text = (item.title + ' ' + item.snippet).toLowerCase();
  }

  searchIndex = idx;
  return idx;
}

function openSearch() {
  if (searchOverlay) { searchOverlay.style.display = 'flex'; searchOverlay.querySelector('.search-input').focus(); return; }

  searchOverlay = document.createElement('div');
  searchOverlay.className = 'search-overlay';
  searchOverlay.innerHTML = `
    <div class="search-panel">
      <div class="search-input-row">
        <svg class="search-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input class="search-input" type="text" placeholder="Search across all pages\u2026" autocomplete="off" />
        <kbd class="search-kbd">Esc</kbd>
      </div>
      <div class="search-results"></div>
    </div>`;
  document.body.appendChild(searchOverlay);

  const input = searchOverlay.querySelector('.search-input');
  const resultsEl = searchOverlay.querySelector('.search-results');

  input.focus();

  let debounceTimer = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => executeSearch(input.value, resultsEl), 80);
  });

  // Close on backdrop click
  searchOverlay.addEventListener('click', (e) => { if (e.target === searchOverlay) closeSearch(); });

  // Close on Escape
  searchOverlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSearch(); });
}

function closeSearch() {
  if (searchOverlay) searchOverlay.style.display = 'none';
}

async function executeSearch(query, resultsEl) {
  if (!query || query.length < 2) { resultsEl.innerHTML = '<div class="search-empty">Type at least 2 characters to search</div>'; return; }

  const idx = await buildSearchIndex();
  const q = query.toLowerCase();
  const matches = idx.filter(item => item._text.includes(q));

  if (!matches.length) { resultsEl.innerHTML = '<div class="search-empty">No results found</div>'; return; }

  // Group by type
  const groups = { page: [], topic: [], finding: [], case_study: [] };
  const groupLabels = { page: 'Pages', topic: 'Topics', finding: 'Findings & Recommendations', case_study: 'Case Studies' };
  for (const m of matches) { if (groups[m.type]) groups[m.type].push(m); }

  let html = '';
  for (const [type, items] of Object.entries(groups)) {
    if (!items.length) continue;
    html += `<div class="search-group-label">${groupLabels[type]}</div>`;
    const shown = items.slice(0, 8);
    for (const item of shown) {
      const title = highlightMatch(stripHTML(item.title), query);
      const snippet = highlightMatch(item.snippet, query);
      html += `<a class="search-item" href="${item.href}">
        <span class="search-item-title">${title}</span>
        <span class="search-item-snippet">${snippet}</span>
        <span class="search-item-page">${item.page}</span>
      </a>`;
    }
    if (items.length > 8) {
      html += `<div class="search-more">${items.length - 8} more results</div>`;
    }
  }
  resultsEl.innerHTML = html;
}

function highlightMatch(text, query) {
  if (!text || !query) return text || '';
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp('(' + esc + ')', 'gi'), '<mark>$1</mark>');
}

/* ── Agentic EA Page ────────────────────────────────── */
function initAgenticEAPage() {
  const container = document.getElementById('agentic-ea-content') || document.querySelector('.main-scroll');
  if (!pageData) return;
  const d = pageData;
  let html = '';

  // Hero
  html += `<header class="hero"><div class="container">
    <h1>${d.title}</h1>
    <p class="hero-sub">${d.hero.subline}</p>
    <div class="stats-bar">${d.hero.stats.map(s => `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div><div class="stat-detail">${s.detail}</div></div>`).join('')}</div>
  </div></header>`;

  // Sections
  for (const sec of d.sections) {
    html += `<div class="dashboard-section"><div class="container">`;
    html += `<h2>${sec.title}</h2><p>${sec.content}</p>`;

    if (sec.points) {
      html += `<div class="findings-grid">${sec.points.map(p => `<div class="finding-card"><h3>${p.title}</h3><p>${p.description}</p></div>`).join('')}</div>`;
    }

    if (sec.tiers) {
      html += `<div class="comparison-sections">`;
      for (const tier of sec.tiers) {
        html += `<div class="finding-card"><h3>${tier.name}</h3><p class="tier-role"><strong>${tier.role}</strong></p><p>${tier.details}</p><ul>${tier.elements.map(e => `<li>${e}</li>`).join('')}</ul></div>`;
      }
      html += `</div>`;
    }

    if (sec.stereotypes) {
      html += `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Stereotype</th><th>Parent Type</th><th>Description</th></tr></thead><tbody>`;
      for (const st of sec.stereotypes) {
        html += `<tr><td><strong>${st.name}</strong></td><td>${st.parent}</td><td>${st.description}</td></tr>`;
      }
      html += `</tbody></table></div>`;
    }

    if (sec.cases) {
      html += `<div class="findings-grid">`;
      for (const uc of sec.cases) {
        html += `<div class="finding-card"><h3>${uc.title}</h3><p><strong>Input:</strong> ${uc.input}</p><p><strong>Output:</strong> ${uc.output}</p><details><summary>Workflow</summary><ol>${uc.workflow.map(w => `<li>${w}</li>`).join('')}</ol></details></div>`;
      }
      html += `</div>`;
    }

    if (sec.comparison) {
      html += `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Dimension</th><th>Traditional EA</th><th>Graph-Based EA</th></tr></thead><tbody>`;
      for (const row of sec.comparison) {
        html += `<tr><td><strong>${row.dimension}</strong></td><td>${row.traditional}</td><td><mark>${row.graph}</mark></td></tr>`;
      }
      html += `</tbody></table></div>`;
    }

    html += `</div></div>`;
  }

  container.innerHTML = html;
}

/* ── PoC Demo Page ──────────────────────────────────── */
function initPocDemoPage() {
  const container = document.getElementById('poc-demo-content') || document.querySelector('.main-scroll');
  if (!pageData) return;
  const d = pageData;
  let html = '';

  // Hero
  html += `<header class="hero"><div class="container">
    <h1>${d.title}</h1>
    <p class="hero-sub">${d.hero.subline}</p>
    <div class="stats-bar">${d.hero.stats.map(s => `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div><div class="stat-detail">${s.detail}</div></div>`).join('')}</div>
  </div></header>`;

  // Context
  html += `<div class="dashboard-section"><div class="container">
    <h2>${d.context.title}</h2>
    <p>${d.context.description}</p>
    <ul>${d.context.highlights.map(h => `<li>${h}</li>`).join('')}</ul>
  </div></div>`;

  // Repository Overview
  const ro = d.repository_overview;
  html += `<div class="dashboard-section"><div class="container">
    <h2>${ro.title}</h2>
    <div class="table-wrapper"><table class="data-table"><thead><tr><th>Layer</th><th>Elements</th><th>Examples</th></tr></thead><tbody>`;
  for (const layer of ro.layers) {
    html += `<tr><td><strong>${layer.name}</strong></td><td>${layer.count}</td><td>${layer.examples.join(', ')}</td></tr>`;
  }
  html += `</tbody></table></div></div></div>`;

  // Deliverable Samples
  html += `<div class="dashboard-section"><div class="container">
    <h2>Sample Deliverables</h2>
    <p>Each deliverable was produced by the Business Architect Agent operating on the live repository through MCP tools.</p>
    <div class="findings-grid">`;

  for (const sample of d.deliverable_samples) {
    html += `<div class="finding-card">
      <div class="finding-tag">${sample.use_case}</div>
      <h3>${sample.title}</h3>
      <p>${sample.summary}</p>
      <details><summary>Key Findings</summary><ul>${sample.key_findings.map(f => `<li>${f}</li>`).join('')}</ul></details>
      <div class="sample-meta"><span>${sample.element_count} elements</span> · <span>${sample.tool_calls} tool calls</span></div>
    </div>`;
  }
  html += `</div></div></div>`;

  // Technology Stack
  const ts = d.technology_stack;
  html += `<div class="dashboard-section"><div class="container">
    <h2>${ts.title}</h2>
    <div class="table-wrapper"><table class="data-table"><thead><tr><th>Component</th><th>Role</th><th>Detail</th></tr></thead><tbody>`;
  for (const comp of ts.components) {
    html += `<tr><td><strong>${comp.name}</strong></td><td>${comp.role}</td><td>${comp.detail}</td></tr>`;
  }
  html += `</tbody></table></div></div></div>`;

  container.innerHTML = html;
}

// Global keyboard shortcut: "/" to open search
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    openSearch();
  }
});

