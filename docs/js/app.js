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
    } else if (peek && peek.page_type === 'ea-process') {
      pageData = peek;
      initEAProcessPage();
    } else if (peek && peek.page_type === 'repository-explorer') {
      pageData = peek;
      initRepositoryExplorerPage();
    } else if (peek && peek.page_type === 'process-analysis') {
      pageData = peek;
      initProcessAnalysisPage();
    } else if (peek && peek.page_type === 'agent-blueprint') {
      pageData = peek;
      initAgentBlueprintPage();
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

function outputSVG(size = 16) {
  return `<svg ${ICON_ATTRS} width="${size}" height="${size}"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 18v-4"/><path d="m14 15-4 4-4-4"/></svg>`;
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
  sHtml += `<button class="sidebar-collapse-btn" aria-label="Collapse sidebar"><svg ${ICON_ATTRS} width="16" height="16"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg></button>`;
  sHtml += '</div>';
  sHtml += '<nav class="app-sidebar-nav">';

  for (const link of siteData.nav) {
    if (link.children) {
      const childActive = link.children.some(c => c.id === page);
      sHtml += '<div class="sidebar-nav-group' + (childActive ? ' open' : '') + '">';
      sHtml += '<button class="sidebar-nav-group-label">' + (NAV_ICONS[link.id] || '') + '<span>' + link.label + '</span><span class="group-chevron-wrap"><svg class="group-chevron" ' + ICON_ATTRS + ' width="16" height="16"><path d="m6 9 6 6 6-6"/></svg></span></button>';
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
  tHtml += '<span class="topbar-title">' + pageLabel + ' <span class="wip-badge">Work in progress</span></span>';
  tHtml += '<div id="topbar-phase-nav"></div>';
  tHtml += '<span class="topbar-spacer"></span>';

  // Theme picker (icon buttons like Insight)
  tHtml += '<div class="theme-picker">';
  const savedPalette = parseInt(localStorage.getItem('ea-theme-palette') || '1');
  const themeIcons = [
    `<svg ${ICON_ATTRS} width="14" height="14"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    `<svg ${ICON_ATTRS} width="14" height="14"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`,
    `<svg ${ICON_ATTRS} width="14" height="14"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
  ];
  const themeNames = ['Warm', 'Cool', 'Yello'];
  for (let i = 0; i < 3; i++) {
    const act = i === savedPalette ? ' active' : '';
    tHtml += '<button class="theme-pick' + act + '" data-palette="' + i + '" title="' + themeNames[i] + '" aria-label="Theme: ' + themeNames[i] + '">' + themeIcons[i] + '</button>';
  }
  tHtml += '</div>';

  // Search
  tHtml += `<button class="topbar-search-btn" aria-label="Search"><svg ${ICON_ATTRS} width="18" height="18"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button>`;

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

  // Theme palette picker
  topbar.querySelectorAll('.theme-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      topbar.querySelectorAll('.theme-pick').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const idx = parseInt(btn.dataset.palette);
      applyThemePalette(idx);
      localStorage.setItem('ea-theme-palette', String(idx));
    });
  });

  // Initialize theme
  initTheme();
}

/* ── Theme system (ported from Insight) ─────────────── */
const THEME_PALETTES = [
  { id: 'warm', name: 'Warm', light: {
    '--bg': '#F5F3EE', '--surface': '#FFFFFF', '--surface-dark': '#1B1B18',
    '--sidebar-bg': '#F0ECE4', '--sidebar-hover': '#E8E3D9', '--sidebar-active': '#E0DAD0',
    '--text': '#1B1B18', '--text-secondary': '#64635E', '--text-muted': '#9B9A95',
    '--border': '#E5E2DB', '--border-light': '#EDEAE4',
    '--accent': '#D97757', '--accent-hover': '#C4663F', '--accent-light': '#FAE6DD', '--accent-text': '#B34D2B',
  }, dark: {
    '--bg': '#1C1A17', '--surface': '#252220', '--surface-dark': '#161412',
    '--sidebar-bg': '#161412', '--sidebar-hover': '#2A2622', '--sidebar-active': '#3D3830',
    '--text': '#E8E4DE', '--text-secondary': '#A8A49C', '--text-muted': '#7A766E',
    '--border': '#3D3830', '--border-light': '#2E2B28',
    '--accent': '#E89070', '--accent-hover': '#F5A080', '--accent-light': '#3D2A1E', '--accent-text': '#F5B090',
  }},
  { id: 'cool', name: 'Cool', light: {
    '--bg': '#F8FAFC', '--surface': '#FFFFFF', '--surface-dark': '#0F172A',
    '--sidebar-bg': '#F1F5F9', '--sidebar-hover': '#E2E8F0', '--sidebar-active': '#CBD5E1',
    '--text': '#0F172A', '--text-secondary': '#64748B', '--text-muted': '#94A3B8',
    '--border': '#E2E8F0', '--border-light': '#F1F5F9',
    '--accent': '#2563EB', '--accent-hover': '#1D4ED8', '--accent-light': '#EFF6FF', '--accent-text': '#1E40AF',
  }, dark: {
    '--bg': '#0F172A', '--surface': '#1E293B', '--surface-dark': '#0C1322',
    '--sidebar-bg': '#0C1322', '--sidebar-hover': '#1E293B', '--sidebar-active': '#334155',
    '--text': '#E2E8F0', '--text-secondary': '#94A3B8', '--text-muted': '#64748B',
    '--border': '#334155', '--border-light': '#1E293B',
    '--accent': '#60A5FA', '--accent-hover': '#93C5FD', '--accent-light': '#172136', '--accent-text': '#93C5FD',
  }},
  { id: 'yello', name: 'Yello', light: {
    '--bg': '#FEFCE8', '--surface': '#FFFFFF', '--surface-dark': '#1A1700',
    '--sidebar-bg': '#FEF9C3', '--sidebar-hover': '#FDE047', '--sidebar-active': '#FACC15',
    '--text': '#1A1700', '--text-secondary': '#716810', '--text-muted': '#A39E40',
    '--border': '#EAE070', '--border-light': '#FEF9C3',
    '--accent': '#EAB308', '--accent-hover': '#CA8A04', '--accent-light': '#FEF9C3', '--accent-text': '#854D0E',
  }, dark: {
    '--bg': '#18160A', '--surface': '#1E1C0E', '--surface-dark': '#121006',
    '--sidebar-bg': '#121006', '--sidebar-hover': '#2A2710', '--sidebar-active': '#3D3A18',
    '--text': '#FEF9C3', '--text-secondary': '#E0D860', '--text-muted': '#8A8430',
    '--border': '#3D3A18', '--border-light': '#2A2710',
    '--accent': '#FACC15', '--accent-hover': '#FDE047', '--accent-light': '#2A2710', '--accent-text': '#FDE68A',
  }},
];

function initTheme() {
  const savedMode = localStorage.getItem('ea-theme-mode');
  if (savedMode === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  const savedPalette = parseInt(localStorage.getItem('ea-theme-palette') || '1');
  applyThemePalette(savedPalette);
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
  // Re-apply palette for new mode
  const idx = parseInt(localStorage.getItem('ea-theme-palette') || '1');
  applyThemePalette(idx);
  // Update icon
  const btn = document.querySelector('.dark-toggle');
  if (btn) {
    const sunIcon = `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
    const moonIcon = `<svg ${ICON_ATTRS}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
    btn.innerHTML = !isDark ? sunIcon : moonIcon;
  }
}

function applyThemePalette(index) {
  const palette = THEME_PALETTES[index];
  if (!palette) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const colors = isDark ? palette.dark : palette.light;
  const root = document.documentElement.style;
  for (const [token, value] of Object.entries(colors)) {
    root.setProperty(token, value);
  }
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

/* ── Repository Explorer Page ──────────────────────── */
function initRepositoryExplorerPage() {
  const container = document.getElementById('repository-explorer-content') || document.querySelector('.main-scroll');
  if (!pageData) return;
  const d = pageData;
  const layerColors = {};
  d.layers.forEach(l => { layerColors[l.name] = l.color; });
  let html = '';

  // Hero
  html += `<header class="hero"><div class="container">
    <h1>${d.title}</h1>
    <p class="hero-sub">${d.hero.subline}</p>
    <div class="stats-bar">${d.hero.stats.map(s => `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div><div class="stat-detail">${s.detail}</div></div>`).join('')}</div>
  </div></header>`;

  // Layer overview cards
  html += `<div class="dashboard-section"><div class="container">
    <h2>Architecture Layers</h2>
    <div class="repo-layers-grid">
      ${d.layers.map(l => `<div class="repo-layer-card" data-layer="${l.name}" style="--layer-color: ${l.color}">
        <div class="repo-layer-header">
          <div class="repo-layer-count">${l.count}</div>
          <div class="repo-layer-name">${l.name}</div>
        </div>
        <div class="repo-layer-types">${l.types.slice(0, 5).map(t => `<span class="repo-type-chip">${t.type} <strong>${t.count}</strong></span>`).join('')}${l.types.length > 5 ? `<span class="repo-type-chip repo-type-more">+${l.types.length - 5} more</span>` : ''}</div>
      </div>`).join('')}
    </div>
  </div></div>`;

  // Graph visualization
  html += `<div class="dashboard-section repo-graph-section"><div class="container">
    <h2>Relationship Graph</h2>
    <p class="repo-graph-desc">${d.graph.description}. Click a node to highlight connections. Use layer filters to focus the view.</p>
    <div class="repo-graph-controls">
      <button class="repo-graph-filter active" data-filter="all">All Layers</button>
      ${d.layers.map(l => `<button class="repo-graph-filter" data-filter="${l.name}" style="--filter-color: ${l.color}">${l.name}</button>`).join('')}
    </div>
    <div class="repo-graph-container" id="repo-graph"></div>
    <div class="repo-graph-legend">
      ${d.layers.map(l => `<span class="repo-legend-item"><span class="repo-legend-dot" style="background: ${l.color}"></span>${l.name}</span>`).join('')}
    </div>
  </div></div>`;

  // Relationship types
  html += `<div class="dashboard-section"><div class="container">
    <h2>Relationship Types</h2>
    <div class="repo-rel-types">
      ${d.relationship_types.map(r => `<div class="repo-rel-bar">
        <div class="repo-rel-label">${r.type}</div>
        <div class="repo-rel-track"><div class="repo-rel-fill" style="width: ${Math.round(r.count / d.relationships.length * 100)}%"></div></div>
        <div class="repo-rel-count">${r.count}</div>
      </div>`).join('')}
    </div>
  </div></div>`;

  // Element explorer
  html += `<div class="dashboard-section"><div class="container">
    <h2>Element Explorer</h2>
    <div class="repo-explorer-controls">
      <input type="text" class="repo-search-input" id="repo-search" placeholder="Search elements by name, type, or description..." />
      <div class="repo-filter-pills" id="repo-layer-filters">
        <button class="repo-pill active" data-layer="all">All <span class="repo-pill-count">${d.elements.length}</span></button>
        ${d.layers.map(l => `<button class="repo-pill" data-layer="${l.name}" style="--pill-color: ${l.color}">${l.name} <span class="repo-pill-count">${l.count}</span></button>`).join('')}
      </div>
    </div>
    <div class="repo-results-info" id="repo-results-info">Showing ${d.elements.length} elements</div>
    <div class="repo-elements-grid" id="repo-elements-grid"></div>
    <div class="repo-show-more-wrap" id="repo-show-more-wrap">
      <button class="repo-show-more-btn" id="repo-show-more">Show More</button>
    </div>
  </div></div>`;

  container.innerHTML = html;

  // ── Element Explorer logic ──
  const PAGE_SIZE = 30;
  let currentLayer = 'all';
  let searchQuery = '';
  let visibleCount = PAGE_SIZE;

  function getFilteredElements() {
    return d.elements.filter(e => {
      const matchLayer = currentLayer === 'all' || e.layer === currentLayer;
      if (!matchLayer) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) ||
             e.description.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) ||
             (e.stereotype && e.stereotype.toLowerCase().includes(q));
    });
  }

  function renderElements() {
    const filtered = getFilteredElements();
    const grid = document.getElementById('repo-elements-grid');
    const info = document.getElementById('repo-results-info');
    const showMoreWrap = document.getElementById('repo-show-more-wrap');
    const showing = Math.min(visibleCount, filtered.length);

    info.textContent = filtered.length === d.elements.length
      ? `Showing ${showing} of ${filtered.length} elements`
      : `${filtered.length} elements match${filtered.length !== d.elements.length ? '' : ''} — showing ${showing}`;

    grid.innerHTML = filtered.slice(0, visibleCount).map(e => {
      const color = layerColors[e.layer] || '#64748b';
      return `<div class="repo-elem-card">
        <div class="repo-elem-header">
          <span class="repo-elem-layer-dot" style="background: ${color}" title="${e.layer}"></span>
          <span class="repo-elem-name">${highlightSearch(e.name)}</span>
          ${e.stereotype ? `<span class="repo-elem-stereotype">${e.stereotype}</span>` : ''}
        </div>
        <div class="repo-elem-type">${highlightSearch(e.type)}</div>
        <p class="repo-elem-desc">${highlightSearch(e.description)}</p>
        <div class="repo-elem-id">${e.id}</div>
      </div>`;
    }).join('');

    showMoreWrap.style.display = visibleCount >= filtered.length ? 'none' : 'flex';
  }

  function highlightSearch(text) {
    if (!searchQuery) return text;
    const re = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(re, '<mark>$1</mark>');
  }

  // Layer filter pills
  document.querySelectorAll('.repo-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.repo-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLayer = btn.dataset.layer;
      visibleCount = PAGE_SIZE;
      renderElements();
    });
  });

  // Search input
  document.getElementById('repo-search').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    visibleCount = PAGE_SIZE;
    renderElements();
  });

  // Show more
  document.getElementById('repo-show-more').addEventListener('click', () => {
    visibleCount += PAGE_SIZE;
    renderElements();
  });

  // Layer card click → filter elements
  document.querySelectorAll('.repo-layer-card').forEach(card => {
    card.addEventListener('click', () => {
      const layer = card.dataset.layer;
      currentLayer = layer;
      document.querySelectorAll('.repo-pill').forEach(b => b.classList.toggle('active', b.dataset.layer === layer));
      visibleCount = PAGE_SIZE;
      renderElements();
      document.getElementById('repo-search').scrollIntoView({ behavior: 'smooth' });
    });
  });

  renderElements();

  // ── D3 Graph Visualization ──
  if (typeof d3 !== 'undefined' && d.graph.nodes.length > 0) {
    initRepoGraph(d, layerColors);
  }
}

function initRepoGraph(d, layerColors) {
  const container = document.getElementById('repo-graph');
  const width = container.clientWidth;
  const height = Math.min(600, Math.max(400, width * 0.5));

  const svg = d3.select('#repo-graph')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height]);

  // Zoom group
  const g = svg.append('g');
  svg.call(d3.zoom().scaleExtent([0.3, 4]).on('zoom', (event) => {
    g.attr('transform', event.transform);
  }));

  // Build lookup
  const nodeMap = new Map(d.graph.nodes.map(n => [n.id, {...n}]));
  const nodes = d.graph.nodes.map(n => ({...n}));
  const links = d.graph.edges.filter(e => nodeMap.has(e.source) && nodeMap.has(e.target)).map(e => ({...e}));

  // Simulation
  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(n => n.id).distance(60).strength(0.4))
    .force('charge', d3.forceManyBody().strength(-120))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(12));

  // Links
  const link = g.append('g').attr('class', 'repo-g-links')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', '#cbd5e1')
    .attr('stroke-width', 0.5)
    .attr('stroke-opacity', 0.4);

  // Nodes
  const node = g.append('g').attr('class', 'repo-g-nodes')
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('r', n => 3 + Math.sqrt(n.connections) * 1.5)
    .attr('fill', n => layerColors[n.layer] || '#64748b')
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.8)
    .style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
    );

  // Tooltip
  const tooltip = d3.select('#repo-graph')
    .append('div')
    .attr('class', 'repo-graph-tooltip')
    .style('opacity', 0);

  node.on('mouseover', (event, nd) => {
    tooltip.transition().duration(150).style('opacity', 1);
    tooltip.html(`<strong>${nd.name}</strong><br/><span>${nd.stereotype || nd.type}</span><br/><span class="repo-tt-layer">${nd.layer}</span> · ${nd.connections} connections`)
      .style('left', (event.offsetX + 12) + 'px')
      .style('top', (event.offsetY - 10) + 'px');
  })
  .on('mouseout', () => { tooltip.transition().duration(300).style('opacity', 0); })
  .on('click', (event, nd) => {
    // Highlight connected nodes
    const connectedIds = new Set();
    connectedIds.add(nd.id);
    links.forEach(l => {
      const sid = typeof l.source === 'object' ? l.source.id : l.source;
      const tid = typeof l.target === 'object' ? l.target.id : l.target;
      if (sid === nd.id) connectedIds.add(tid);
      if (tid === nd.id) connectedIds.add(sid);
    });

    node.attr('opacity', n => connectedIds.has(n.id) ? 1 : 0.1)
        .attr('stroke-width', n => n.id === nd.id ? 2.5 : 0.8);
    link.attr('stroke-opacity', l => {
      const sid = typeof l.source === 'object' ? l.source.id : l.source;
      const tid = typeof l.target === 'object' ? l.target.id : l.target;
      return (sid === nd.id || tid === nd.id) ? 0.8 : 0.05;
    }).attr('stroke-width', l => {
      const sid = typeof l.source === 'object' ? l.source.id : l.source;
      const tid = typeof l.target === 'object' ? l.target.id : l.target;
      return (sid === nd.id || tid === nd.id) ? 1.5 : 0.5;
    });
  });

  // Click background to reset
  svg.on('click', (event) => {
    if (event.target === svg.node()) {
      node.attr('opacity', 1).attr('stroke-width', 0.8);
      link.attr('stroke-opacity', 0.4).attr('stroke-width', 0.5);
    }
  });

  // Tick
  sim.on('tick', () => {
    link.attr('x1', l => l.source.x).attr('y1', l => l.source.y)
        .attr('x2', l => l.target.x).attr('y2', l => l.target.y);
    node.attr('cx', n => n.x).attr('cy', n => n.y);
  });

  // Layer filter for graph
  document.querySelectorAll('.repo-graph-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.repo-graph-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      if (filter === 'all') {
        node.attr('opacity', 1);
        link.attr('stroke-opacity', 0.4);
      } else {
        node.attr('opacity', n => n.layer === filter ? 1 : 0.08);
        link.attr('stroke-opacity', l => {
          const s = typeof l.source === 'object' ? l.source : nodeMap.get(l.source);
          const t = typeof l.target === 'object' ? l.target : nodeMap.get(l.target);
          return (s && s.layer === filter) || (t && t.layer === filter) ? 0.6 : 0.03;
        });
      }
    });
  });
}

/* ── EA Process Page ────────────────────────────────── */

function renderPhaseV2(phase) {
  let h = '';

  // Description
  if (phase.v2_description) {
    h += `<p class="ep-v2-description">${phase.v2_description}</p>`;
  }

  // ── Section 1: Objectives ──
  // Section definitions for nav
  const v2Sections = [
    { id: 'p1-objectives', code: 'P1', label: 'Objectives' },
    { id: 'p2-maturity', code: 'P2', label: 'Maturity' },
    { id: 'p3-inputs', code: 'P3', label: 'Inputs' },
    { id: 'p4-steps', code: 'P4', label: 'Steps' },
    { id: 'p5-outputs', code: 'P5', label: 'Outputs' },
    { id: 'p6-request', code: 'P6', label: 'Request' }
  ];

  h += `<div class="ep-v2-section ep-v2-collapsible" id="ep-sec-p1-objectives">
    <button class="ep-v2-section-header ep-v2-section-toggle" aria-expanded="true"><span class="ep-v2-sec-badge">P1</span><h3>Objectives</h3><span class="ep-section-chevron">${chevronSVG()}</span></button>
    <div class="ep-v2-section-body open">`;
  (phase.v2_objectives || []).forEach(obj => {
    h += `<div class="ep-v2-objective">
      <div class="ep-v2-objective-text">${obj.text}</div>`;
    if (obj.sub_items && obj.sub_items.length) {
      h += `<ul class="ep-v2-sub-items">${obj.sub_items.map(s => `<li>${s}</li>`).join('')}</ul>`;
    }
    h += `</div>`;
  });
  h += `<div class="ep-v2-sponsor-input">
    <label class="ep-v2-sponsor-label">Input from Sponsor</label>
    <textarea class="ep-v2-user-textarea ep-v2-sponsor-textarea" data-phase="${phase.id}" data-field="objectives" rows="3" placeholder="Describe your organisation's specific objectives for this phase..."></textarea>
  </div>`;

  // EA Agent Analysis
  h += `<div class="ep-v2-agent-output" data-phase="${phase.id}" data-section="objectives">
    <div class="ep-v2-agent-header">
      <label class="ep-v2-agent-label">EA Agent Analysis</label>
      <div class="ep-v2-agent-actions">
        <div class="ep-v2-agent-tabs">
          <button class="ep-v2-agent-tab active" data-show="view">View</button>
          <button class="ep-v2-agent-tab" data-show="source">Source</button>
        </div>
      </div>
    </div>
    <div class="ep-v2-agent-view active" data-phase="${phase.id}" data-section="objectives"></div>
    <div class="ep-v2-agent-source" data-phase="${phase.id}" data-section="objectives"></div>
    <div class="ep-v2-agent-empty" data-phase="${phase.id}" data-section="objectives">
      <p>Run <code>/ea-preliminary-analysis objectives</code> to generate the EA Agent's analysis of the sponsor's objectives.</p>
    </div>
  </div>`;

  h += `</div></div>`;

  // ── Section 2: Maturity Self-Assessment (from EA Repository) ──
  if (phase.v2_maturity) {
    h += `<div class="ep-v2-section ep-v2-collapsible" id="ep-sec-p2-maturity">
      <button class="ep-v2-section-header ep-v2-section-toggle" aria-expanded="true"><span class="ep-v2-sec-badge">P2</span><h3>Maturity Self-Assessment</h3><span class="ep-section-chevron">${chevronSVG()}</span></button>
      <div class="ep-v2-section-body open">
        <div class="ep-v2-maturity-repo" id="ep-maturity-repo">
          <p class="ep-v2-repo-hint">Loading maturity data from EA Repository...</p>
        </div>
        <div class="ep-v2-sponsor-input">
          <label class="ep-v2-sponsor-label">Input from Sponsor</label>
          <textarea class="ep-v2-user-textarea ep-v2-sponsor-textarea" data-phase="${phase.id}" data-field="maturity" rows="2" placeholder="Notes on current maturity, known gaps, or priorities..."></textarea>
        </div>
      </div>
    </div>`;
  }

  // ── Section 2: Inputs ──
  h += `<div class="ep-v2-section ep-v2-collapsible" id="ep-sec-p3-inputs">
    <button class="ep-v2-section-header ep-v2-section-toggle" aria-expanded="false"><span class="ep-v2-sec-badge">P3</span><h3>Inputs</h3><span class="ep-section-chevron">${chevronSVG()}</span></button>
    <div class="ep-v2-section-body"><div class="ep-v2-input-grid">`;
  const inputs = phase.v2_inputs || {};
  const inputCategories = [
    { key: 'reference_materials', label: 'Reference Materials' },
    { key: 'non_architectural_inputs', label: 'Non-Architectural Inputs' },
    { key: 'architectural_inputs', label: 'Architectural Inputs' }
  ];
  inputCategories.forEach(cat => {
    const items = inputs[cat.key] || [];
    if (items.length) {
      h += `<div class="ep-v2-input-card">
        <h4>${cat.label}</h4>
        <ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>`;
    }
  });
  h += `</div>
    <div class="ep-v2-sponsor-input">
      <label class="ep-v2-sponsor-label">Input from Sponsor</label>
      <textarea class="ep-v2-user-textarea ep-v2-sponsor-textarea" data-phase="${phase.id}" data-field="inputs" rows="2" placeholder="Additional reference materials, documents, or architectural inputs..."></textarea>
    </div>
  </div></div>`;

  // ── Section 3: Steps ──
  const mermaidCode = phase.v2_mermaid || '';
  h += `<div class="ep-v2-section ep-v2-collapsible" id="ep-sec-p4-steps">
    <button class="ep-v2-section-header ep-v2-section-toggle" aria-expanded="true">
      <span class="ep-v2-sec-badge">P4</span><h3>Steps</h3>
      <span class="ep-section-chevron">${chevronSVG()}</span>
    </button>
    <div class="ep-v2-section-body open">
      <div class="ep-v2-view-toggle" style="margin-bottom:.75rem">
        <button class="ep-v2-toggle-btn active" data-view="diagram">Diagram</button>
        <button class="ep-v2-toggle-btn" data-view="agent">Agent View</button>
      </div>`;

  // Diagram view — diagram on top, single step detail below
  const steps = phase.v2_steps || [];
  h += `<div class="ep-v2-steps-view active" data-view="diagram">
    <div class="ep-v2-diagram-top">
      <pre class="mermaid">${mermaidCode.replace(/&/g,'&amp;')}</pre>
    </div>
    <div class="ep-v2-step-nav">
      ${steps.map((s, i) => `<button class="ep-v2-step-pill${i === 0 ? ' active' : ''}" data-step="${s.number}" title="${s.name}">${s.number}</button>`).join('')}
    </div>
    <div class="ep-v2-step-detail-panel">`;
  steps.forEach((step, i) => {
    const outputTags = (step.outputs || []).map(o => `<span class="ep-v2-step-output">${outputSVG(12)}${o}</span>`).join('');
    h += `<div class="ep-v2-step-detail${i === 0 ? ' active' : ''}" data-step="${step.number}">
      <div class="ep-v2-step-num">${step.number}</div>
      <div class="ep-v2-step-content">
        <h4>${step.name}</h4>
        <p>${step.description}</p>`;
    if (step.sub_steps && step.sub_steps.length) {
      h += `<ul>${step.sub_steps.map(s => `<li>${s}</li>`).join('')}</ul>`;
    }
    if (outputTags) {
      h += `<div class="ep-v2-step-outputs">${outputTags}</div>`;
    }
    // EA Repository integration for Step 1 (Scoping)
    if (step.number === 1) {
      h += `<div class="ep-v2-agent-output" data-phase="${phase.id}" data-section="step1-scope">
        <div class="ep-v2-agent-header">
          <label class="ep-v2-agent-label">EA Agent — Capability Scope</label>
          <div class="ep-v2-agent-actions">
            <span class="ep-v2-scope-summary" id="ep-scope-summary"></span>
          </div>
        </div>
        <div id="ep-scope-table-wrap"></div>
        <div class="ep-v2-agent-empty" id="ep-scope-empty">
          <p>No scope data yet. Run the EA Agent to scope capabilities from the EA Repository, or click <strong>Load from Repository</strong> below.</p>
          <button class="ep-v2-agent-run ep-scope-load-btn" data-phase="${phase.id}">Load from Repository</button>
        </div>
      </div>`;
      h += `<div class="ep-v2-sponsor-input">
        <label class="ep-v2-sponsor-label">Input from Sponsor</label>
        <textarea class="ep-v2-user-textarea ep-v2-sponsor-textarea" data-phase="${phase.id}" data-field="step1-comment" rows="2" placeholder="Comments on the scope — any capabilities to add, remove, or reclassify..."></textarea>
      </div>`;
    } else {
      // User input for other steps
      h += `<div class="ep-v2-user-input">
        <textarea class="ep-v2-user-textarea" data-phase="${phase.id}" data-field="step-${step.number}" rows="2" placeholder="Your input for this step..."></textarea>
      </div>`;
    }
    h += `</div></div>`;
  });
  h += `</div></div>`;

  // Agent view (source code)
  h += `<div class="ep-v2-steps-view" data-view="agent">
    <div class="ep-v2-agent-code-wrap">
      <div class="ep-v2-agent-code-header">
        <span>Mermaid Diagram Code</span>
        <button class="ep-v2-copy-btn" data-copy="mermaid">Copy</button>
      </div>
      <pre class="ep-v2-agent-code"><code>${mermaidCode.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>
    </div>
  </div>`;

  h += `</div></div>`;

  // ── Section 5: Outputs ──
  h += `<div class="ep-v2-section ep-v2-collapsible" id="ep-sec-p5-outputs">
    <button class="ep-v2-section-header ep-v2-section-toggle" aria-expanded="true"><span class="ep-v2-sec-badge">P5</span><h3>Outputs</h3><span class="ep-section-chevron">${chevronSVG()}</span></button>
    <div class="ep-v2-section-body open">`;

  if (phase.worked_deliverables && phase.worked_deliverables.length) {
    // Expandable deliverable accordion (reuses ep-wd-* pattern)
    h += `<div class="ep-wd-list">`;
    phase.worked_deliverables.forEach((wd, idx) => {
      h += `<div class="ep-wd-item">
        <button class="ep-wd-toggle" aria-expanded="false">
          <span class="ep-wd-num">${idx + 1}</span>
          <div class="ep-wd-label">
            <span class="ep-wd-name">${wd.name}</span>
            <span class="ep-wd-summary">${wd.summary}</span>
          </div>
          <span class="ep-section-chevron">${chevronSVG()}</span>
        </button>
        <div class="ep-wd-body">
          <div class="ep-deliv-tabs">
            <button class="ep-deliv-tab active" data-wd="${wd.id}" data-view="repository">Repository View</button>
            <button class="ep-deliv-tab" data-wd="${wd.id}" data-view="agent">Agent View</button>
          </div>
          <div class="ep-deliv-panel active" data-wd="${wd.id}" data-panel="repository">
            ${wd.sections.map(s => `<div class="ep-human-section"><h4>${s.heading}</h4>${s.content}</div>`).join('')}
          </div>
          <div class="ep-deliv-panel" data-wd="${wd.id}" data-panel="agent">
            <div class="ep-yaml-filename">${wd.yaml.filename}</div>
            <div class="ep-yaml-wrap">
              <button class="ep-yaml-copy" data-yaml-id="${wd.id}" title="Copy YAML">Copy</button>
              <pre class="ep-output-yaml" id="ep-wd-yaml-${wd.id}">${wd.yaml.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
            </div>
          </div>
        </div>
      </div>`;
    });
    h += `</div>`;
  } else {
    // Simple output card grid (no deliverable detail)
    h += `<div class="ep-v2-output-grid">`;
    (phase.v2_outputs || []).forEach(out => {
      h += `<div class="ep-v2-output-card">
        <div class="ep-v2-output-icon">${outputSVG(20)}</div>
        <h4>${out.name}</h4>
        <p>${out.description}</p>
      </div>`;
    });
    h += `</div>`;
  }

  h += `</div></div>`;

  // ── Section 5: Request for Architecture Work ──
  h += `<div class="ep-v2-section ep-v2-collapsible" id="ep-sec-p6-request">
    <button class="ep-v2-section-header ep-v2-section-toggle" aria-expanded="true"><span class="ep-v2-sec-badge">P6</span><h3>Request for Architecture Work</h3><span class="ep-section-chevron">${chevronSVG()}</span></button>
    <div class="ep-v2-section-body open">
      <p class="ep-v2-description">The Request for Architecture Work is the formal contract between the sponsor and the EA team. It consolidates all inputs collected in this phase — objectives, maturity baseline, scoped organisations, principles, and governance — into a single document that authorises the ADM cycle to proceed.</p>
      <div class="ep-v2-agent-output" data-phase="${phase.id}" data-section="request-for-arch-work">
        <div class="ep-v2-agent-header">
          <label class="ep-v2-agent-label">EA Agent — Request for Architecture Work</label>
          <div class="ep-v2-agent-actions">
            <div class="ep-v2-agent-tabs">
              <button class="ep-v2-agent-tab active" data-show="view">View</button>
              <button class="ep-v2-agent-tab" data-show="source">Source</button>
            </div>
          </div>
        </div>
        <div class="ep-v2-agent-view active" data-phase="${phase.id}" data-section="request-for-arch-work"></div>
        <div class="ep-v2-agent-source" data-phase="${phase.id}" data-section="request-for-arch-work"></div>
        <div class="ep-v2-agent-empty" data-phase="${phase.id}" data-section="request-for-arch-work">
          <p>Complete the sections above (objectives, maturity assessment, inputs), then run <code>/ea-preliminary-analysis request-for-arch-work</code> to generate the Request for Architecture Work.</p>
        </div>
      </div>
      <div class="ep-v2-sponsor-input">
        <label class="ep-v2-sponsor-label">Input from Sponsor</label>
        <textarea class="ep-v2-user-textarea ep-v2-sponsor-textarea" data-phase="${phase.id}" data-field="request-for-arch-work" rows="3" placeholder="Comments, amendments, or approval notes for the Request for Architecture Work..."></textarea>
      </div>
    </div>
  </div>`;

  return h;
}

function renderWorkedPhase(phase) {
  let h = '';

  // ── Process Description (interactive Q&A form) ──
  if (phase.process && phase.process.length) {
    h += `<div class="ep-worked-section">
      <h3 class="ep-worked-heading">Process Description</h3>`;
    phase.process.forEach((sec, qi) => {
      const qid = phase.id + '-q' + qi;
      h += `<div class="ep-qa" data-qid="${qid}">
        <h4 class="ep-qa-question">${sec.question}</h4>
        <div class="ep-qa-answer">${sec.answer}</div>`;
      if (sec.steps) {
        h += `<div class="ep-steps-timeline">
          ${sec.steps.map(s => `<div class="ep-step">
            <span class="ep-step-num">${s.number}</span>
            <div class="ep-step-body">
              <strong>${s.name}</strong>
              <p>${s.description}</p>
              <div class="ep-step-outputs">${s.outputs.map(o => `<span class="ep-step-output">${o}</span>`).join('')}</div>
            </div>
          </div>`).join('')}
        </div>`;
      }
      h += `<div class="ep-qa-input">
        <span class="ep-qa-input-label">${sec.input_prompt}</span>
        <div class="ep-qa-radios">
          <label class="ep-radio"><input type="radio" name="${qid}" value="confirmed"> Confirmed</label>
          <label class="ep-radio"><input type="radio" name="${qid}" value="revise"> Needs revision</label>
          <label class="ep-radio"><input type="radio" name="${qid}" value="open"> Open</label>
        </div>
        <textarea class="ep-qa-text" data-qid="${qid}" placeholder="Your input, changes, or additional context..." rows="3"></textarea>
      </div>
      </div>`;
    });
    h += `</div>`;
  }

  // ── Artefacts & Deliverables (plain heading, accordion list) ──
  h += `<div class="ep-worked-section">
    <h3 class="ep-worked-heading">Artefacts &amp; Deliverables</h3>
    <div class="ep-wd-list">`;

  phase.worked_deliverables.forEach((wd, idx) => {
    const isFirst = idx === 0;
    h += `<div class="ep-wd-item${isFirst ? ' open' : ''}">
      <button class="ep-wd-toggle" aria-expanded="${isFirst}">
        <span class="ep-wd-num">${idx + 1}</span>
        <div class="ep-wd-label">
          <span class="ep-wd-name">${wd.name}</span>
          <span class="ep-wd-summary">${wd.summary}</span>
        </div>
        <span class="ep-section-chevron">${chevronSVG()}</span>
      </button>
      <div class="ep-wd-body${isFirst ? ' open' : ''}">
        <div class="ep-deliv-tabs">
          <button class="ep-deliv-tab active" data-wd="${wd.id}" data-view="repository">Repository View</button>
          <button class="ep-deliv-tab" data-wd="${wd.id}" data-view="agent">Agent View</button>
        </div>
        <div class="ep-deliv-panel active" data-wd="${wd.id}" data-panel="repository">
          ${wd.sections.map(s => `<div class="ep-human-section"><h4>${s.heading}</h4>${s.content}</div>`).join('')}
        </div>
        <div class="ep-deliv-panel" data-wd="${wd.id}" data-panel="agent">
          <div class="ep-yaml-filename">${wd.yaml.filename}</div>
          <div class="ep-yaml-wrap">
            <button class="ep-yaml-copy" data-yaml-id="${wd.id}" title="Copy YAML">Copy</button>
            <pre class="ep-output-yaml" id="ep-wd-yaml-${wd.id}">${wd.yaml.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
          </div>
        </div>
      </div>
    </div>`;
  });

  h += `</div></div>`;
  return h;
}

function initEAProcessPage() {
  const container = document.getElementById('ea-process-content') || document.querySelector('.main-scroll');
  if (!pageData) return;
  const d = pageData;
  const phases = d.phases;
  const EP_STORAGE = 'ea-process-v3';

  // ── Storage helpers ──
  function loadInputs(phaseId) {
    try { return (JSON.parse(localStorage.getItem(EP_STORAGE)) || {})[phaseId] || {}; } catch { return {}; }
  }
  function saveInput(phaseId, fieldId, value) {
    const all = JSON.parse(localStorage.getItem(EP_STORAGE)) || {};
    if (!all[phaseId]) all[phaseId] = {};
    all[phaseId][fieldId] = value;
    localStorage.setItem(EP_STORAGE, JSON.stringify(all));
  }
  function clearInputs(phaseId) {
    const all = JSON.parse(localStorage.getItem(EP_STORAGE)) || {};
    delete all[phaseId];
    localStorage.setItem(EP_STORAGE, JSON.stringify(all));
  }

  // ── Structured list parser ──
  function parseStructuredList(text, columns) {
    if (!text) return [];
    return text.split('\n').filter(l => l.trim()).map(line => {
      const parts = line.split('|').map(s => s.trim());
      const obj = {};
      columns.forEach((col, i) => { obj[col] = parts[i] || ''; });
      return obj;
    });
  }

  // ── YAML generators per phase ──
  function yamlLine(indent, key, value) {
    return ' '.repeat(indent) + key + ': ' + value;
  }
  function yamlLines(indent, lines) {
    return lines.filter(l => l.trim()).map(l => ' '.repeat(indent) + '- ' + l.trim()).join('\n');
  }
  function yamlEsc(s) { return /[:#\[\]{}&*!|>'"%@`]/.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s; }

  // ── ID generation helpers ──
  function makeId(prefix, i) { return prefix + '-' + String(i + 1).padStart(3, '0'); }
  function today() { return new Date().toISOString().split('T')[0]; }
  function yamlHeader(name, type, togafPhase, filename) {
    let h = `# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    h += `# ${name} — EA Repository Artefact\n`;
    h += `# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    h += `schema: ea-repository/v1\n\n`;
    h += `artifact:\n  type: ${type}\n  name: ${yamlEsc(name)}\n  togaf_phase: ${yamlEsc(togafPhase)}\n  filename: ${filename}\n\n`;
    return h;
  }

  // Heuristic: classify process step for agent suitability
  function classifyStep(step, performer) {
    const s = (step + ' ' + performer).toLowerCase();
    if (/customer|handover|acceptance|sign|approv/i.test(s)) return { decision: 'judgment', suitability: 'human-only', score: 1 };
    if (/creative|design|architect|engineer.*design/i.test(s)) return { decision: 'creative', suitability: 'agent-assisted', score: 2 };
    if (/review|assess|evaluat|plan|manag/i.test(s)) return { decision: 'judgment', suitability: 'agent-assisted', score: 3 };
    if (/receiv|order|sourc|ship|logist|schedul|test|monitor|report|catalog|check/i.test(s)) return { decision: 'structured', suitability: 'agent-autonomous', score: 5 };
    return { decision: 'judgment', suitability: 'agent-assisted', score: 3 };
  }

  // Heuristic: classify technology for agent capabilities
  function classifyTech(name, category) {
    const s = (name + ' ' + category).toLowerCase();
    const agentHosting = /kubernetes|container|cloud|openai|llm|agent/i.test(s);
    const mcpCompat = /graph|neo4j|api|rest|grpc|openai|vector|qdrant/i.test(s);
    return { agent_hosting: agentHosting, mcp_compatible: mcpCompat };
  }

  const generators = {
    'preliminary': function(inputs) {
      const principles = parseStructuredList(inputs.principles, ['name', 'statement', 'rationale', 'implications']);
      let y = yamlHeader('Principles Catalog', 'catalog', 'Preliminary', 'principles-catalog.yaml');
      y += `metadata:\n  organisation: ${yamlEsc(inputs.org_name || '...')}\n  industry: ${inputs.industry || '...'}\n  framework: ArchiMate 3.2 + AI Extensions\n  generated: ${today()}\n\n`;
      y += `elements:\n`;
      principles.forEach((p, i) => {
        const id = makeId('PRINC', i);
        y += `  - id: ${id}\n`;
        y += `    type: Principle\n`;
        y += `    archimate_type: Principle\n`;
        y += `    layer: Motivation\n`;
        y += `    name: ${yamlEsc(p.name)}\n`;
        y += `    attributes:\n`;
        y += `      statement: ${yamlEsc(p.statement)}\n`;
        y += `      rationale: ${yamlEsc(p.rationale)}\n`;
        y += `      implications: ${yamlEsc(p.implications)}\n`;
        y += `    agentic_extension:\n`;
        y += `      machine_readable: true\n`;
        y += `      enforcement_action: warn\n`;
        y += `      auto_verifiable: true\n\n`;
      });
      if (principles.length > 1) {
        y += `relationships:\n`;
        principles.forEach((p, i) => {
          if (i > 0) {
            y += `  - source: ${makeId('PRINC', i)}\n    target: ${makeId('PRINC', 0)}\n    type: ASSOCIATION\n    description: "Principles in same catalog"\n`;
          }
        });
      }
      return y.trimEnd();
    },

    'phase-a': function(inputs) {
      const stakeholders = parseStructuredList(inputs.stakeholders, ['role', 'concern', 'power', 'interest']);
      let y = yamlHeader('Stakeholder Map', 'matrix', 'A - Architecture Vision', 'stakeholder-map.yaml');
      y += `metadata:\n  initiative: ${yamlEsc(inputs.initiative_name || '...')}\n  generated: ${today()}\n\n`;
      y += `context: |\n`;
      (inputs.business_problem || '...').split('\n').forEach(l => { y += `  ${l}\n`; });
      y += `\nelements:\n`;
      const engagementMap = { 'high-high': 'manage_closely', 'high-medium': 'keep_satisfied', 'high-low': 'keep_satisfied', 'medium-high': 'keep_informed', 'medium-medium': 'keep_informed', 'medium-low': 'monitor', 'low-high': 'keep_informed', 'low-medium': 'monitor', 'low-low': 'monitor' };
      stakeholders.forEach((s, i) => {
        const id = makeId('STK', i);
        const power = (s.power || 'medium').toLowerCase().trim();
        const interest = (s.interest || 'medium').toLowerCase().trim();
        const engagement = engagementMap[power + '-' + interest] || 'keep_informed';
        y += `  - id: ${id}\n`;
        y += `    type: Stakeholder\n`;
        y += `    archimate_type: BusinessActor\n`;
        y += `    layer: Business\n`;
        y += `    name: ${yamlEsc(s.role)}\n`;
        y += `    attributes:\n`;
        y += `      concern: ${yamlEsc(s.concern)}\n`;
        y += `      power: ${power}\n`;
        y += `      interest: ${interest}\n`;
        y += `      engagement_strategy: ${engagement}\n`;
        y += `    agentic_extension:\n`;
        const agentInt = power === 'high' ? 'Receives automated architecture reports and compliance dashboards' : 'Included in periodic status summaries';
        y += `      agent_interaction: ${yamlEsc(agentInt)}\n`;
        y += `      notification_channel: ${power === 'high' ? 'direct' : 'digest'}\n\n`;
      });
      if (stakeholders.length > 1) {
        y += `relationships:\n`;
        for (let i = 0; i < stakeholders.length; i++) {
          for (let j = i + 1; j < stakeholders.length && j <= i + 1; j++) {
            y += `  - source: ${makeId('STK', i)}\n    target: ${makeId('STK', j)}\n    type: ASSOCIATION\n    description: "Stakeholder interaction"\n`;
          }
        }
      }
      return y.trimEnd();
    },

    'phase-b': function(inputs) {
      const steps = parseStructuredList(inputs.process_steps, ['step', 'performer', 'inputs', 'outputs']);
      let y = yamlHeader('Process Flow Catalog', 'catalog', 'B - Business Architecture', 'process-catalog.yaml');
      y += `metadata:\n  process: ${yamlEsc(inputs.process_name || '...')}\n  owner: ${yamlEsc(inputs.process_owner || '...')}\n  generated: ${today()}\n\n`;
      y += `elements:\n`;
      let autoCount = 0, assistCount = 0, humanCount = 0;
      steps.forEach((s, i) => {
        const id = makeId('PROC', i);
        const cls = classifyStep(s.step, s.performer);
        if (cls.suitability === 'agent-autonomous') autoCount++;
        else if (cls.suitability === 'agent-assisted') assistCount++;
        else humanCount++;
        y += `  - id: ${id}\n`;
        y += `    type: BusinessProcess\n`;
        y += `    archimate_type: BusinessProcess\n`;
        y += `    layer: Business\n`;
        y += `    name: ${yamlEsc(s.step)}\n`;
        y += `    attributes:\n`;
        y += `      sequence: ${i + 1}\n`;
        y += `      performer: ${yamlEsc(s.performer)}\n`;
        y += `      inputs: ${yamlEsc(s.inputs)}\n`;
        y += `      outputs: ${yamlEsc(s.outputs)}\n`;
        y += `    agentic_extension:\n`;
        y += `      decision_type: ${cls.decision}\n`;
        y += `      agent_suitability: ${cls.suitability}\n`;
        y += `      readiness_score: ${cls.score}  # 1=human-only, 3=assisted, 5=autonomous\n\n`;
      });
      if (steps.length > 1) {
        y += `relationships:\n`;
        for (let i = 0; i < steps.length - 1; i++) {
          y += `  - source: ${makeId('PROC', i)}\n    target: ${makeId('PROC', i + 1)}\n    type: TRIGGERING\n    description: "Sequential process flow"\n`;
        }
        y += `\n`;
      }
      y += `summary:\n  total_steps: ${steps.length}\n  agent_autonomous: ${autoCount}\n  agent_assisted: ${assistCount}\n  human_only: ${humanCount}\n`;
      y += `  agent_coverage: ${steps.length ? Math.round((autoCount + assistCount) / steps.length * 100) : 0}%\n`;
      return y.trimEnd();
    },

    'phase-c': function(inputs) {
      const apps = parseStructuredList(inputs.applications, ['name', 'description', 'classification', 'owner', 'status']);
      const ifaces = parseStructuredList(inputs.interfaces || '', ['from', 'to', 'protocol', 'data']);
      let y = yamlHeader('Application Portfolio Catalog', 'catalog', 'C - Information Systems Architecture', 'application-portfolio.yaml');
      y += `metadata:\n  scope: ${yamlEsc(inputs.scope || '...')}\n  generated: ${today()}\n\n`;
      y += `elements:\n`;
      apps.forEach((a, i) => {
        const id = makeId('APP', i);
        const status = (a.status || 'active').toLowerCase().trim();
        const classification = (a.classification || 'supporting').toLowerCase().trim();
        const isMcpAccessible = /neo4j|repository|graph|mcp/i.test(a.name + ' ' + a.description);
        const hasApi = /api|rest|sap|erp|lumada/i.test(a.name + ' ' + a.description);
        y += `  - id: ${id}\n`;
        y += `    type: ApplicationComponent\n`;
        y += `    archimate_type: ApplicationComponent\n`;
        y += `    layer: Application\n`;
        y += `    name: ${yamlEsc(a.name)}\n`;
        y += `    attributes:\n`;
        y += `      description: ${yamlEsc(a.description)}\n`;
        y += `      classification: ${classification}\n`;
        y += `      business_owner: ${yamlEsc(a.owner)}\n`;
        y += `      status: ${status}\n`;
        y += `    agentic_extension:\n`;
        y += `      mcp_accessible: ${isMcpAccessible}\n`;
        y += `      api_available: ${hasApi}\n`;
        y += `      integration_protocol: ${isMcpAccessible ? 'MCP' : hasApi ? 'REST API' : 'none'}\n\n`;
      });
      if (ifaces.length) {
        y += `relationships:\n`;
        const appNames = apps.map(a => a.name.toLowerCase().trim());
        ifaces.forEach((iface, i) => {
          const fromIdx = appNames.findIndex(n => iface.from.toLowerCase().trim().includes(n) || n.includes(iface.from.toLowerCase().trim()));
          const toIdx = appNames.findIndex(n => iface.to.toLowerCase().trim().includes(n) || n.includes(iface.to.toLowerCase().trim()));
          const fromId = fromIdx >= 0 ? makeId('APP', fromIdx) : 'APP-???';
          const toId = toIdx >= 0 ? makeId('APP', toIdx) : 'APP-???';
          y += `  - source: ${fromId}\n    target: ${toId}\n    type: SERVING\n`;
          y += `    attributes:\n      protocol: ${yamlEsc(iface.protocol)}\n      data_exchanged: ${yamlEsc(iface.data)}\n`;
        });
      }
      return y.trimEnd();
    },

    'phase-d': function(inputs) {
      const techs = parseStructuredList(inputs.technologies, ['name', 'category', 'vendor', 'version', 'status']);
      let y = yamlHeader('Technology Portfolio Catalog', 'catalog', 'D - Technology Architecture', 'technology-portfolio.yaml');
      y += `metadata:\n  scope: ${yamlEsc(inputs.scope || '...')}\n  generated: ${today()}\n\n`;
      y += `elements:\n`;
      techs.forEach((t, i) => {
        const id = makeId('NODE', i);
        const category = (t.category || 'platform').toLowerCase().trim();
        const archType = /database|data/i.test(category) ? 'SystemSoftware' : /middleware/i.test(category) ? 'SystemSoftware' : 'Node';
        const cls = classifyTech(t.name, category);
        y += `  - id: ${id}\n`;
        y += `    type: ${archType}\n`;
        y += `    archimate_type: ${archType}\n`;
        y += `    layer: Technology\n`;
        y += `    name: ${yamlEsc(t.name)}\n`;
        y += `    attributes:\n`;
        y += `      category: ${category}\n`;
        y += `      vendor: ${yamlEsc(t.vendor)}\n`;
        y += `      version: ${yamlEsc(t.version)}\n`;
        y += `      status: ${(t.status || 'current').toLowerCase().trim()}\n`;
        y += `    agentic_extension:\n`;
        y += `      agent_hosting_capable: ${cls.agent_hosting}\n`;
        y += `      mcp_compatible: ${cls.mcp_compatible}\n\n`;
      });
      return y.trimEnd();
    },

    'phase-e': function(inputs) {
      const gaps = parseStructuredList(inputs.gaps, ['capability', 'baseline', 'target', 'gap', 'priority']);
      let y = yamlHeader('Gap Analysis Matrix', 'matrix', 'E - Opportunities & Solutions', 'gap-analysis.yaml');
      y += `metadata:\n  scope: ${yamlEsc(inputs.scope || '...')}\n  generated: ${today()}\n\n`;
      y += `elements:\n`;
      gaps.forEach((g, i) => {
        const id = makeId('GAP', i);
        const capId = makeId('CAP', i);
        const priority = (g.priority || 'medium').toLowerCase().trim();
        // Heuristic agent readiness: high priority = lower readiness (bigger gap)
        const readiness = priority === 'high' ? 2 : priority === 'medium' ? 3 : 4;
        y += `  - id: ${id}\n`;
        y += `    type: Gap\n`;
        y += `    layer: Strategy\n`;
        y += `    name: ${yamlEsc(g.capability)}\n`;
        y += `    attributes:\n`;
        y += `      capability_ref: ${capId}\n`;
        y += `      baseline: ${yamlEsc(g.baseline)}\n`;
        y += `      target: ${yamlEsc(g.target)}\n`;
        y += `      gap_description: ${yamlEsc(g.gap)}\n`;
        y += `      priority: ${priority}\n`;
        y += `    agentic_extension:\n`;
        y += `      agent_readiness: ${readiness}  # 1=not ready, 5=ready for agent augmentation\n`;
        y += `      agent_value: ${priority === 'high' ? 'high' : 'medium'}  # estimated value of agent augmentation\n\n`;
      });
      if (gaps.length > 1) {
        y += `relationships:\n`;
        gaps.forEach((g, i) => {
          y += `  - source: ${makeId('GAP', i)}\n    target: ${makeId('CAP', i)}\n    type: ASSOCIATION\n    description: "Gap identified for capability"\n`;
        });
      }
      y += `\nsummary:\n  total_gaps: ${gaps.length}\n  high_priority: ${gaps.filter(g => (g.priority || '').toLowerCase().trim() === 'high').length}\n  medium_priority: ${gaps.filter(g => (g.priority || '').toLowerCase().trim() === 'medium').length}\n  low_priority: ${gaps.filter(g => (g.priority || '').toLowerCase().trim() === 'low').length}\n`;
      return y.trimEnd();
    },

    'phase-f': function(inputs) {
      const wps = parseStructuredList(inputs.work_packages, ['name', 'capabilities', 'quarter', 'dependencies']);
      let y = yamlHeader('Architecture Roadmap', 'deliverable', 'F - Migration Planning', 'architecture-roadmap.yaml');
      y += `metadata:\n  timeline: ${yamlEsc(inputs.timeline || '...')}\n  generated: ${today()}\n\n`;
      y += `elements:\n`;
      const wpNames = wps.map(w => w.name.toLowerCase().trim());
      wps.forEach((w, i) => {
        const id = makeId('WP', i);
        const isFoundation = i === 0 || /foundation|setup|base/i.test(w.name);
        const isAgent = /agent|autonomous|ai/i.test(w.name + ' ' + w.capabilities);
        const agentLevel = isFoundation ? 'foundation' : isAgent ? 'autonomous' : 'enabling';
        y += `  - id: ${id}\n`;
        y += `    type: WorkPackage\n`;
        y += `    layer: Implementation\n`;
        y += `    name: ${yamlEsc(w.name)}\n`;
        y += `    attributes:\n`;
        y += `      capabilities_delivered: ${yamlEsc(w.capabilities)}\n`;
        y += `      planned_quarter: ${yamlEsc(w.quarter)}\n`;
        y += `      dependencies: ${yamlEsc(w.dependencies)}\n`;
        y += `    agentic_extension:\n`;
        y += `      agent_involvement: ${agentLevel}\n`;
        y += `      agent_capabilities_enabled:\n`;
        if (isFoundation) y += `        - repository_queries\n        - validation\n`;
        else if (isAgent) y += `        - autonomous_monitoring\n        - proactive_recommendations\n`;
        else y += `        - data_access\n        - analysis\n`;
        y += `\n`;
      });
      if (wps.length > 1) {
        y += `relationships:\n`;
        wps.forEach((w, i) => {
          if (i === 0) return;
          // Find dependency index
          const deps = (w.dependencies || '').toLowerCase().trim();
          if (deps === 'none' || !deps) return;
          const depIdx = wpNames.findIndex(n => deps.includes(n));
          if (depIdx >= 0 && depIdx !== i) {
            y += `  - source: ${makeId('WP', depIdx)}\n    target: ${makeId('WP', i)}\n    type: TRIGGERING\n    attributes:\n      dependency_type: finish-to-start\n`;
          }
        });
      }
      return y.trimEnd();
    },

    'phase-g': function(inputs) {
      const items = parseStructuredList(inputs.checklist, ['area', 'requirement', 'status', 'evidence']);
      let y = yamlHeader('Compliance Assessment', 'deliverable', 'G - Implementation Governance', 'compliance-assessment.yaml');
      y += `metadata:\n  project: ${yamlEsc(inputs.project_name || '...')}\n  generated: ${today()}\n\n`;
      y += `elements:\n`;
      items.forEach((item, i) => {
        const id = makeId('CA', i);
        const status = (item.status || 'partial').toLowerCase().trim();
        const autoVerifiable = /data|version|api|log|boundary/i.test(item.requirement);
        y += `  - id: ${id}\n`;
        y += `    type: ComplianceItem\n`;
        y += `    layer: Governance\n`;
        y += `    name: ${yamlEsc(item.area + ' — ' + item.requirement.substring(0, 50))}\n`;
        y += `    attributes:\n`;
        y += `      architecture_area: ${yamlEsc(item.area)}\n`;
        y += `      requirement: ${yamlEsc(item.requirement)}\n`;
        y += `      status: ${status}\n`;
        y += `      evidence: ${yamlEsc(item.evidence)}\n`;
        y += `    agentic_extension:\n`;
        y += `      auto_verifiable: ${autoVerifiable}\n`;
        y += `      monitoring_frequency: ${autoVerifiable ? 'continuous' : 'periodic'}\n`;
        y += `      last_verified: ${today()}\n\n`;
      });
      const compliant = items.filter(i => (i.status || '').toLowerCase().trim() === 'compliant').length;
      const partial = items.filter(i => (i.status || '').toLowerCase().trim() === 'partial').length;
      const nonCompliant = items.filter(i => (i.status || '').toLowerCase().trim() === 'non-compliant').length;
      y += `summary:\n  total_items: ${items.length}\n  compliant: ${compliant}\n  partial: ${partial}\n  non_compliant: ${nonCompliant}\n`;
      y += `  compliance_rate: ${items.length ? Math.round(compliant / items.length * 100) : 0}%\n`;
      return y.trimEnd();
    },

    'phase-h': function(inputs) {
      const impacts = parseStructuredList(inputs.impacted_elements, ['element', 'layer', 'impact', 'severity']);
      let y = yamlHeader('Architecture Change Request', 'deliverable', 'H - Architecture Change Management', 'change-request.yaml');
      y += `metadata:\n  generated: ${today()}\n\n`;
      y += `elements:\n`;
      // Change Request element
      y += `  - id: CR-001\n`;
      y += `    type: ChangeRequest\n`;
      y += `    layer: Governance\n`;
      y += `    name: ${yamlEsc(inputs.change_title || '...')}\n`;
      y += `    attributes:\n`;
      y += `      description: |\n`;
      (inputs.change_detail || '...').split('\n').forEach(l => { y += `        ${l}\n`; });
      y += `      status: submitted\n`;
      y += `      priority: ${impacts.some(i => (i.severity || '').toLowerCase().trim() === 'high') ? 'high' : 'medium'}\n`;
      const directCount = impacts.filter(i => (i.impact || '').toLowerCase().trim() === 'direct').length;
      const layers = [...new Set(impacts.map(i => (i.layer || '').trim()))].filter(Boolean);
      y += `      classification: ${layers.length >= 3 ? 're_architecting' : directCount >= 3 ? 'incremental' : 'simplification'}\n`;
      y += `    agentic_extension:\n`;
      y += `      auto_detected: false\n`;
      y += `      impact_analysis_method: graph_traversal\n`;
      y += `      impacted_elements_count: ${impacts.length}\n`;
      y += `      cross_layer_impact: ${layers.length >= 2}\n\n`;
      // Impact elements
      impacts.forEach((imp, i) => {
        const id = makeId('IMPACT', i);
        y += `  - id: ${id}\n`;
        y += `    type: ImpactAssessment\n`;
        y += `    layer: Governance\n`;
        y += `    name: ${yamlEsc('Impact on ' + imp.element)}\n`;
        y += `    attributes:\n`;
        y += `      element_name: ${yamlEsc(imp.element)}\n`;
        y += `      architecture_layer: ${yamlEsc(imp.layer)}\n`;
        y += `      impact_type: ${(imp.impact || 'indirect').toLowerCase().trim()}\n`;
        y += `      severity: ${(imp.severity || 'medium').toLowerCase().trim()}\n\n`;
      });
      if (impacts.length) {
        y += `relationships:\n`;
        impacts.forEach((imp, i) => {
          y += `  - source: CR-001\n    target: ${makeId('IMPACT', i)}\n    type: ASSOCIATION\n    description: "Change impacts element"\n`;
        });
      }
      return y.trimEnd();
    },

    'requirements-management': function(inputs) {
      const reqs = parseStructuredList(inputs.requirements, ['id', 'description', 'priority', 'category', 'traces_to']);
      let y = yamlHeader('Requirements Catalog', 'catalog', 'Requirements Management', 'requirements-catalog.yaml');
      y += `metadata:\n  source: ${yamlEsc(inputs.source || '...')}\n  generated: ${today()}\n\n`;
      y += `elements:\n`;
      reqs.forEach((r, i) => {
        const id = r.id || makeId('REQ', i);
        const priority = (r.priority || 'should').toLowerCase().trim();
        const category = (r.category || 'business').toLowerCase().trim();
        const autoValidated = /accuracy|response|log|trail|compli/i.test(r.description);
        y += `  - id: ${id}\n`;
        y += `    type: Requirement\n`;
        y += `    archimate_type: Requirement\n`;
        y += `    layer: Motivation\n`;
        y += `    name: ${yamlEsc(r.description.substring(0, 60))}\n`;
        y += `    attributes:\n`;
        y += `      description: ${yamlEsc(r.description)}\n`;
        y += `      priority: ${priority}\n`;
        y += `      category: ${category}\n`;
        y += `      traces_to: ${yamlEsc(r.traces_to)}\n`;
        y += `      status: active\n`;
        y += `    agentic_extension:\n`;
        y += `      auto_validated: ${autoValidated}\n`;
        y += `      validation_method: ${autoValidated ? 'automated_coverage_check' : 'manual_review'}\n`;
        y += `      validation_status: pending\n\n`;
      });
      if (reqs.length > 0) {
        y += `relationships:\n`;
        reqs.forEach((r, i) => {
          if (r.traces_to) {
            const traceId = r.traces_to.match(/^[A-Z]+-\d+/) ? r.traces_to.match(/^[A-Z]+-\d+/)[0] : null;
            if (traceId) {
              y += `  - source: ${r.id || makeId('REQ', i)}\n    target: ${traceId}\n    type: REALIZATION\n    description: "Requirement realized by element"\n`;
            }
          }
        });
        y += `\n`;
      }
      const must = reqs.filter(r => (r.priority || '').toLowerCase().trim() === 'must').length;
      const should = reqs.filter(r => (r.priority || '').toLowerCase().trim() === 'should').length;
      const could = reqs.filter(r => (r.priority || '').toLowerCase().trim() === 'could').length;
      y += `summary:\n  total: ${reqs.length}\n  must_have: ${must}\n  should_have: ${should}\n  could_have: ${could}\n`;
      return y.trimEnd();
    }
  };

  function generateYAML(phaseId, inputs) {
    const gen = generators[phaseId];
    return gen ? gen(inputs) : '# No generator defined for this phase';
  }

  function getFieldValues(phaseId, phase) {
    const saved = loadInputs(phaseId);
    const vals = {};
    (phase.deliverable.fields || []).forEach(f => {
      vals[f.id] = saved[f.id] !== undefined ? saved[f.id] : (f.default || '');
    });
    return vals;
  }

  // ── Render ──
  let html = '';

  // ADM sub-nav bar — cycle selector + phase pills, rendered below the topbar
  html += `<div class="ep-adm-bar">
    <div class="ep-cycle-bar" id="ep-cycle-bar"></div>
    <div class="ep-phase-nav">
      ${phases.map((p, i) => `<button class="ep-phase-pill${i === 0 ? ' active' : ''}" data-phase="${p.id}" style="--phase-color: ${p.color}" title="${p.name}" onclick="document.querySelectorAll('.ep-phase-pill').forEach(b=>b.classList.remove('active'));this.classList.add('active');document.querySelectorAll('.ep-phase-detail').forEach(d=>d.classList.toggle('active',d.id==='ep-detail-${p.id}'));document.querySelector('.main-scroll').scrollTop=0;">
        <span class="ep-pill-code">${p.code}</span>
        <span class="ep-pill-name">${p.name}</span>
      </button>`).join('')}
    </div>
  </div>`;

  // Phase detail panels
  html += `<div class="ep-detail-wrap"><div class="container">`;
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    const prevIdx = i === 0 ? null : i - 1;
    const nextIdx = i === phases.length - 1 ? null : i + 1;
    html += `<div class="ep-phase-detail${i === 0 ? ' active' : ''}" id="ep-detail-${p.id}">`;

    // Phase header removed — phase name is already in the nav pills

    if (p.phase_version === 'v2') {
      // ── V2 path: side nav + TOGAF-structured sections ──
      const secs = [
        { id: 'p1-objectives', code: 'P1', label: 'Objectives' },
        { id: 'p2-maturity', code: 'P2', label: 'Maturity' },
        { id: 'p3-inputs', code: 'P3', label: 'Inputs' },
        { id: 'p4-steps', code: 'P4', label: 'Steps' },
        { id: 'p5-outputs', code: 'P5', label: 'Outputs' },
        { id: 'p6-request', code: 'P6', label: 'Request' }
      ];
      html += `<div class="ep-v2-layout">
        <nav class="ep-v2-sidenav">
          ${secs.map((s, si) => `<a class="ep-v2-sidenav-item${si === 0 ? ' active' : ''}" href="#ep-sec-${s.id}" data-sec="${s.id}">
            <span class="ep-v2-sidenav-code">${s.code}</span>
            <span class="ep-v2-sidenav-label">${s.label}</span>
          </a>`).join('')}
        </nav>
        <div class="ep-v2-main">`;
      html += renderPhaseV2(p);
      html += `</div></div>`;
    } else if (p.worked_deliverables) {
      // ── Worked deliverables path ──
      html += renderWorkedPhase(p);
    } else {
      // ── Existing path: TOGAF descriptions + YAML generator ──
      const dl = p.deliverable;

      // Section 1: Process Description (collapsible)
      html += `<div class="ep-section ep-collapsible">
        <button class="ep-section-toggle" aria-expanded="true">
          <h3>Process Description</h3>
          <span class="ep-section-chevron">${chevronSVG()}</span>
        </button>
        <div class="ep-section-body open">
          <div class="ep-desc-block">
            <div class="ep-desc-traditional">
              <h4>Traditional EA</h4>
              <p class="ep-togaf-summary">${p.togaf_summary}</p>
              <h5>Objectives</h5>
              <ul>${p.objectives.map(o => `<li>${o}</li>`).join('')}</ul>
              <h5>Steps</h5>
              <ol>${p.steps.map(s => `<li>${s}</li>`).join('')}</ol>
            </div>
            <div class="ep-desc-agentic">
              <h4>Agentic Organisation</h4>
              ${p.agentic_shift.split('\n\n').map(para => `<p>${para}</p>`).join('')}
            </div>
          </div>
        </div>
      </div>`;

      // Section 2: Deliverables (collapsible)
      html += `<div class="ep-section ep-collapsible">
        <button class="ep-section-toggle" aria-expanded="true">
          <h3>Deliverables</h3>
          <span class="ep-section-chevron">${chevronSVG()}</span>
        </button>
        <div class="ep-section-body open">
          <div class="ep-togaf-deliverables">
            ${p.togaf_deliverables.map(td => `<div class="ep-togaf-card">
              <span class="ep-togaf-name">${td.name}</span>
              <span class="ep-togaf-desc">${td.desc}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>`;

      // Section 3: Example — YAML Twin (collapsible)
      html += `<div class="ep-section ep-collapsible">
        <button class="ep-section-toggle" aria-expanded="true">
          <h3>Example: ${dl.name}</h3>
          <span class="ep-section-chevron">${chevronSVG()}</span>
        </button>
        <div class="ep-section-body open">
          <div class="ep-deliverable-hero" style="border-left: 4px solid ${p.color}">
            <div class="ep-deliv-meta">
              <span class="ep-deliv-source">TOGAF Artefact: ${dl.togaf_source}</span>
            </div>
            <p>${dl.description}</p>
            <div class="ep-deliv-produces"><strong>Produces:</strong> ${dl.what_it_produces}</div>
          </div>
        </div>
      </div>`;

      // Create Deliverable (expandable form)
      html += `<div class="ep-section ep-create-section">
        <button class="ep-create-toggle" data-phase="${p.id}" style="--phase-color: ${p.color}">
          <span class="ep-create-toggle-text">Generate YAML Twin</span>
          <span class="ep-create-toggle-icon">${chevronSVG()}</span>
        </button>
        <div class="ep-create-content" id="ep-create-${p.id}">
          <div class="ep-create-form">`;

      // Form fields
      const saved = loadInputs(p.id);
      (dl.fields || []).forEach(f => {
        const val = saved[f.id] !== undefined ? saved[f.id] : (f.default || '');
        let input = '';
        if (f.type === 'text') {
          input = `<input type="text" class="ep-form-input" data-phase="${p.id}" data-field="${f.id}" placeholder="${f.placeholder || ''}" value="${String(val).replace(/"/g, '&quot;')}" />`;
        } else if (f.type === 'textarea' || f.type === 'structured-list') {
          const rows = f.type === 'structured-list' ? Math.max(4, (val || '').split('\n').length + 1) : 3;
          const formatHint = f.format ? `<div class="ep-format-hint">Format: <code>${f.format}</code></div>` : '';
          input = `${formatHint}<textarea class="ep-form-textarea${f.type === 'structured-list' ? ' ep-structured' : ''}" data-phase="${p.id}" data-field="${f.id}" placeholder="${f.placeholder || ''}" rows="${rows}">${val}</textarea>`;
        } else if (f.type === 'select') {
          input = `<select class="ep-form-select" data-phase="${p.id}" data-field="${f.id}">
            <option value="">— Select —</option>
            ${(f.options || []).map(o => `<option value="${o}"${val === o ? ' selected' : ''}>${o}</option>`).join('')}
          </select>`;
        }
        const isWide = f.type === 'structured-list' || f.type === 'textarea';
        html += `<div class="ep-form-group${f.required ? ' ep-required' : ''}${isWide ? ' ep-form-wide' : ''}">
          <label class="ep-form-label">${f.label}${f.required ? ' *' : ''}</label>
          ${input}
          ${f.help ? `<div class="ep-form-help">${f.help}</div>` : ''}
        </div>`;
      });

      html += `</div>
          <div class="ep-output-wrap">
            <div class="ep-output-header">
              <span class="ep-output-title">Repository Artefact (YAML)</span>
              <div class="ep-output-actions">
                <button class="ep-reset-btn" data-phase="${p.id}" title="Reset to example values">Reset</button>
                <button class="ep-copy-btn" data-phase="${p.id}" title="Copy to clipboard">Copy</button>
              </div>
            </div>
            <pre class="ep-output-yaml" id="ep-yaml-${p.id}"></pre>
          </div>
        </div>
      </div>`;
    } // end if/else worked_deliverables

    // Prev/Next
    html += `<div class="ep-phase-nav-bottom">`;
    if (prevIdx !== null) {
      html += `<button class="ep-nav-btn ep-nav-prev" data-phase="${phases[prevIdx].id}">
        <span class="ep-nav-arrow">&larr;</span>
        <span><span class="ep-nav-label">Previous</span><span class="ep-nav-phase-name">${phases[prevIdx].name}</span></span>
      </button>`;
    } else { html += `<div></div>`; }
    if (nextIdx !== null) {
      html += `<button class="ep-nav-btn ep-nav-next" data-phase="${phases[nextIdx].id}">
        <span><span class="ep-nav-label">Next</span><span class="ep-nav-phase-name">${phases[nextIdx].name}</span></span>
        <span class="ep-nav-arrow">&rarr;</span>
      </button>`;
    } else { html += `<div></div>`; }
    html += `</div></div>`;
  }
  html += `</div></div>`;

  container.innerHTML = html;

  // ── V2: Mermaid rendering & event handlers ──
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
    // Only process visible mermaid elements (skip those in closed accordion panels)
    const visibleMermaid = Array.from(container.querySelectorAll('.mermaid')).filter(el => {
      const body = el.closest('.ep-wd-body');
      return !body || body.classList.contains('open');
    });
    mermaid.run({ nodes: visibleMermaid }).then(() => {
      // Trim SVG viewBox to content bounds — removes dagre centering padding
      container.querySelectorAll('.mermaid svg').forEach(svg => {
        const bbox = svg.getBBox();
        const pad = 8;
        svg.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`);
        svg.removeAttribute('width');
        svg.style.width = (bbox.width + pad * 2) + 'px';
        svg.style.maxWidth = '100%';
        svg.style.height = 'auto';
      });
    });
  }

  // V2 interactive step selection (called by Mermaid click callbacks + pills)
  function highlightStep(num) {
    // Update pills
    container.querySelectorAll('.ep-v2-step-pill').forEach(p =>
      p.classList.toggle('active', parseInt(p.dataset.step) === num));
    // Update detail panels
    container.querySelectorAll('.ep-v2-step-detail').forEach(d =>
      d.classList.toggle('active', parseInt(d.dataset.step) === num));
    // Highlight active node in SVG
    const svg = container.querySelector('.mermaid svg');
    if (svg) {
      svg.querySelectorAll('.node').forEach(n => {
        const id = n.id || '';
        const isStep = /flowchart-S\d/.test(id);
        if (!isStep) { n.style.opacity = ''; return; }
        const match = id.match(/flowchart-S(\d)/);
        const isActive = match && parseInt(match[1]) === num;
        n.style.opacity = isActive ? '1' : '0.45';
        n.style.transition = 'opacity 0.2s';
      });
    }
  }
  // Expose for Mermaid click callbacks
  window.selectStep = function(nodeId) {
    const m = nodeId.match(/\d+/);
    if (m) highlightStep(parseInt(m[0]));
  };

  // Step pill clicks
  container.querySelectorAll('.ep-v2-step-pill').forEach(pill => {
    pill.addEventListener('click', function() {
      highlightStep(parseInt(this.dataset.step));
    });
  });

  // ── Step 1 Scope Display (hierarchical) ──
  function renderScopeTable() {
    const data = activeCycleData();
    const scope = data.preliminary && data.preliminary.step1_scope;
    const wrap = document.getElementById('ep-scope-table-wrap');
    const empty = document.getElementById('ep-scope-empty');
    const summaryEl = document.getElementById('ep-scope-summary');
    if (!wrap) return;

    if (!scope || !scope.tree || !scope.tree.length) {
      wrap.innerHTML = '';
      if (empty) empty.style.display = '';
      if (summaryEl) summaryEl.textContent = '';
      return;
    }

    if (empty) empty.style.display = 'none';
    const prios = scope.priorities || {};
    const p1 = Object.values(prios).filter(function(v) { return v === 1; }).length;
    const p2 = Object.values(prios).filter(function(v) { return v === 2; }).length;
    if (summaryEl) summaryEl.textContent = p1 + ' Prio 1 \u00b7 ' + p2 + ' Prio 2';

    function prioSelect(capId) {
      var val = prios[capId] || 0;
      return '<select class="ep-scope-select" data-cap-id="' + capId + '">'
        + '<option value="0"' + (val === 0 ? ' selected' : '') + '>\u2014</option>'
        + '<option value="1"' + (val === 1 ? ' selected' : '') + '>Prio 1</option>'
        + '<option value="2"' + (val === 2 ? ' selected' : '') + '>Prio 2</option>'
        + '</select>';
    }

    function prioClass(capId) {
      var val = prios[capId] || 0;
      if (val === 1) return ' ep-scope-prio1';
      if (val === 2) return ' ep-scope-prio2';
      return '';
    }

    function renderNode(node, depth) {
      var hasKids = node.children && node.children.length > 0;
      var h = '';
      if (depth === 0) {
        h += '<div class="ep-scope-l0">';
        h += '<div class="ep-scope-l0-header">';
        h += '<strong>' + node.name + '</strong>';
        if (hasKids) h += '<span class="ep-scope-group-count">' + node.children.length + '</span>';
        h += prioSelect(node.id);
        h += '</div>';
        if (hasKids) {
          h += '<div class="ep-scope-l0-body">';
          node.children.forEach(function(child) { h += renderNode(child, 1); });
          h += '</div>';
        }
        h += '</div>';
      } else if (depth === 1) {
        h += '<div class="ep-scope-l1">';
        h += '<button class="ep-scope-l1-header' + prioClass(node.id) + '">';
        if (hasKids) h += '<span class="ep-section-chevron">' + chevronSVG() + '</span>';
        h += '<span class="ep-scope-l1-name">' + node.name + '</span>';
        if (hasKids) h += '<span class="ep-scope-group-count">' + node.children.length + '</span>';
        h += prioSelect(node.id);
        h += '</button>';
        if (hasKids) {
          h += '<div class="ep-scope-l2-body">';
          node.children.forEach(function(child) { h += renderNode(child, 2); });
          h += '</div>';
        }
        h += '</div>';
      } else {
        h += '<div class="ep-scope-l2-row' + prioClass(node.id) + '">';
        h += '<span class="ep-scope-l2-name">' + node.name + '</span>';
        h += prioSelect(node.id);
        h += '</div>';
      }
      return h;
    }

    var html = '';
    scope.tree.forEach(function(root) { html += renderNode(root, 0); });
    wrap.innerHTML = html;

  }

  // L1 collapse/expand (delegated)
  container.addEventListener('click', function(e) {
    var header = e.target.closest('.ep-scope-l1-header');
    if (!header) return;
    if (e.target.closest('.ep-scope-select')) return;
    e.preventDefault();
    header.closest('.ep-scope-l1').classList.toggle('open');
  });

  // Handle priority changes
  container.addEventListener('change', function(e) {
    var sel = e.target.closest('.ep-scope-select');
    if (!sel) return;
    var capId = sel.dataset.capId;
    var newPrio = parseInt(sel.value);
    var data = activeCycleData();
    var scope = data.preliminary && data.preliminary.step1_scope;
    if (!scope || !scope.priorities) return;
    if (newPrio === 0) {
      delete scope.priorities[capId];
    } else {
      scope.priorities[capId] = newPrio;
    }
    persistAll();
    var p1 = Object.values(scope.priorities).filter(function(v) { return v === 1; }).length;
    var p2 = Object.values(scope.priorities).filter(function(v) { return v === 2; }).length;
    var summaryEl = document.getElementById('ep-scope-summary');
    if (summaryEl) summaryEl.textContent = p1 + ' Prio 1 \u00b7 ' + p2 + ' Prio 2';
    var row = sel.closest('.ep-scope-l1-header, .ep-scope-l2-row');
    if (row) {
      row.classList.remove('ep-scope-prio1', 'ep-scope-prio2');
      if (newPrio === 1) row.classList.add('ep-scope-prio1');
      if (newPrio === 2) row.classList.add('ep-scope-prio2');
    }
  });

  // Render scope on page load
  setTimeout(renderScopeTable, 200);

  // Patch populateFormFromCycle to also render scope
  var origPopulateScope = populateFormFromCycle;
  populateFormFromCycle = function() {
    origPopulateScope();
    renderScopeTable();
  };


  // V2 collapsible sections
  container.querySelectorAll('.ep-v2-section-toggle').forEach(btn => {
    btn.addEventListener('click', function() {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !expanded);
      const body = this.nextElementSibling;
      body.classList.toggle('open', !expanded);
      this.querySelector('.ep-section-chevron').style.transform = expanded ? '' : 'rotate(180deg)';
    });
  });

  // V2 maturity domain expand/collapse
  container.querySelectorAll('.ep-v2-mat-domain-header').forEach(btn => {
    btn.addEventListener('click', function() {
      const domain = this.closest('.ep-v2-mat-domain');
      domain.classList.toggle('open');
    });
  });

  // V2 view toggle (diagram / agent)
  container.querySelectorAll('.ep-v2-toggle-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const view = this.dataset.view;
      const section = this.closest('.ep-v2-section');
      section.querySelectorAll('.ep-v2-toggle-btn').forEach(b => b.classList.toggle('active', b === this));
      section.querySelectorAll('.ep-v2-steps-view').forEach(v => v.classList.toggle('active', v.dataset.view === view));
    });
  });

  // V2 copy button
  container.querySelectorAll('.ep-v2-copy-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const code = this.closest('.ep-v2-agent-code-wrap').querySelector('code');
      if (code) {
        navigator.clipboard.writeText(code.textContent).then(() => {
          this.textContent = 'Copied!';
          setTimeout(() => { this.textContent = 'Copy'; }, 2000);
        });
      }
    });
  });

  // ── Constants ──
  const EA_REPO_URL = 'http://localhost:3000';

  // ── ADM Cycle Management ──
  const V2_INPUT_KEY = 'ea-process-v2-inputs';
  let store = { active_cycle: null, cycles: {} };

  function activeCycleData() {
    if (!store.active_cycle || !store.cycles[store.active_cycle]) return {};
    return store.cycles[store.active_cycle].phases || {};
  }

  function loadV2Inputs() {
    return activeCycleData();
  }

  function saveV2Input(phaseId, fieldId, value) {
    const cd = ensureCyclePhase(phaseId);
    cd[fieldId] = value;
    persistAll();
  }

  function ensureCyclePhase(phaseId) {
    if (!store.active_cycle) return {};
    const cycle = store.cycles[store.active_cycle];
    if (!cycle.phases) cycle.phases = {};
    if (!cycle.phases[phaseId]) cycle.phases[phaseId] = {};
    return cycle.phases[phaseId];
  }

  let persistTimer;
  function persistAll() {
    localStorage.setItem(V2_INPUT_KEY, JSON.stringify(store));
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      fetch('/api/save-v2-inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(store)
      }).catch(() => {});
    }, 500);
  }

  let availableClients = [];

  function createCycle(name, client) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cycle-' + Date.now();
    if (store.cycles[slug]) return slug;
    store.cycles[slug] = {
      name: name,
      client: client || '',
      created: new Date().toISOString().split('T')[0],
      phases: {}
    };
    store.active_cycle = slug;
    persistAll();
    return slug;
  }

  function getActiveCycleClient() {
    if (!store.active_cycle || !store.cycles[store.active_cycle]) return '';
    return store.cycles[store.active_cycle].client || '';
  }

  function switchCycle(slug) {
    if (!store.cycles[slug]) return;
    store.active_cycle = slug;
    persistAll();
    populateFormFromCycle();
  }

  function deleteCycle(slug) {
    if (!store.cycles[slug]) return;
    delete store.cycles[slug];
    const remaining = Object.keys(store.cycles);
    store.active_cycle = remaining.length ? remaining[0] : null;
    persistAll();
    renderCycleSelector();
    populateFormFromCycle();
  }

  function populateFormFromCycle() {
    const data = activeCycleData();
    // Clear and restore textareas
    container.querySelectorAll('.ep-v2-user-textarea').forEach(ta => { ta.value = ''; });
    container.querySelectorAll('.ep-v2-user-textarea').forEach(ta => {
      const pid = ta.dataset.phase;
      const fid = ta.dataset.field;
      if (data[pid] && data[pid][fid]) ta.value = data[pid][fid];
    });
  }

  function renderCycleSelector() {
    const bar = document.getElementById('ep-cycle-bar');
    if (!bar) return;
    const slugs = Object.keys(store.cycles);
    const active = store.active_cycle;
    const activeCycle = store.cycles[active] || {};
    const clientLabel = activeCycle.client ? activeCycle.client.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'No client';
    bar.innerHTML = `
      <select class="ep-cycle-select" id="ep-cycle-select">
        ${slugs.map(s => {
          const c = store.cycles[s];
          const cl = c.client ? c.client.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
          return '<option value="' + s + '"' + (s === active ? ' selected' : '') + '>' + c.name + (cl ? ' — ' + cl : '') + '</option>';
        }).join('')}
      </select>
      <span class="ep-cycle-client-badge" title="EA Repository Client">${clientLabel}</span>
      <button class="ep-cycle-btn ep-cycle-new" id="ep-cycle-new-btn" title="New ADM Cycle">+ New Cycle</button>
      ${slugs.length > 1 ? '<button class="ep-cycle-btn ep-cycle-delete" id="ep-cycle-delete-btn" title="Delete active cycle">Delete</button>' : ''}
    `;
    document.getElementById('ep-cycle-select').addEventListener('change', function() {
      switchCycle(this.value);
      renderCycleSelector();
    });
    document.getElementById('ep-cycle-new-btn').addEventListener('click', function() {
      showNewCycleDialog();
    });
    const delBtn = document.getElementById('ep-cycle-delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', function() {
        const name = store.cycles[store.active_cycle]?.name || store.active_cycle;
        if (confirm(`Delete cycle "${name}"? This cannot be undone.`)) {
          deleteCycle(store.active_cycle);
        }
      });
    }
  }

  function showNewCycleDialog() {
    // Remove existing dialog if any
    const existing = document.getElementById('ep-new-cycle-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'ep-new-cycle-dialog';
    dialog.className = 'ep-cycle-dialog-overlay';
    dialog.innerHTML = `
      <div class="ep-cycle-dialog">
        <h3>New ADM Cycle</h3>
        <div class="ep-cycle-dialog-field">
          <label>Cycle Name</label>
          <input type="text" id="ep-new-cycle-name" placeholder="e.g. AI Transformation 2026" autofocus />
        </div>
        <div class="ep-cycle-dialog-field">
          <label>EA Repository Client</label>
          <select id="ep-new-cycle-client">
            <option value="">— No client —</option>
            ${availableClients.map(c => '<option value="' + c.slug + '">' + c.name + '</option>').join('')}
          </select>
          <span class="ep-cycle-dialog-hint">Links this cycle to a client's architecture data</span>
        </div>
        <div class="ep-cycle-dialog-actions">
          <button class="ep-cycle-btn" id="ep-new-cycle-cancel">Cancel</button>
          <button class="ep-cycle-btn ep-cycle-new" id="ep-new-cycle-create">Create Cycle</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    dialog.addEventListener('click', function(e) {
      if (e.target === dialog || e.target.id === 'ep-new-cycle-cancel') {
        dialog.remove();
      }
      if (e.target.id === 'ep-new-cycle-create') {
        const name = document.getElementById('ep-new-cycle-name').value.trim();
        const client = document.getElementById('ep-new-cycle-client').value;
        if (!name) return;
        createCycle(name, client);
        dialog.remove();
        renderCycleSelector();
        populateFormFromCycle();
      }
    });

    document.getElementById('ep-new-cycle-name').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('ep-new-cycle-create').click();
      if (e.key === 'Escape') dialog.remove();
    });
  }

  // ── Load store and initialise ──
  (async function initCycles() {
    // Fetch available EA Repository clients
    try {
      const r = await fetch(`${EA_REPO_URL}/`);
      if (r.ok) {
        const html = await r.text();
        const matches = html.match(/data-slug="([^"]+)"/g) || [];
        availableClients = matches.map(m => {
          const slug = m.match(/data-slug="([^"]+)"/)[1];
          return { slug, name: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') };
        });
      }
    } catch {}
    // Also scan the data directory for .db files as fallback
    if (!availableClients.length) {
      // Hardcode known clients from our repository
      availableClients = [
        { slug: 'energy-company', name: 'Energy Company' },
        { slug: 'scor-client', name: 'SCOR Client' },
        { slug: 'banking-client', name: 'Banking Client' }
      ];
    }

    // Try server file first
    try {
      const r = await fetch('data/ea-process-v2-inputs.json');
      if (r.ok) {
        const data = await r.json();
        if (data.cycles) {
          store = data;
        } else if (Object.keys(data).length > 0) {
          store = {
            active_cycle: 'default',
            cycles: { 'default': { name: 'Default Cycle', client: '', created: new Date().toISOString().split('T')[0], phases: data } }
          };
        }
      }
    } catch {}
    // Merge localStorage as fallback
    try {
      const local = JSON.parse(localStorage.getItem(V2_INPUT_KEY)) || {};
      if (local.cycles) {
        if (!store.active_cycle) store = local;
      } else if (Object.keys(local).length > 0 && !store.active_cycle) {
        store = {
          active_cycle: 'default',
          cycles: { 'default': { name: 'Default Cycle', client: '', created: new Date().toISOString().split('T')[0], phases: local } }
        };
      }
    } catch {}
    // Ensure at least one cycle exists
    if (!store.active_cycle || Object.keys(store.cycles).length === 0) {
      createCycle('ADM Cycle 1', '');
    }
    renderCycleSelector();
    populateFormFromCycle();
  })();

  // Auto-save on input
  container.addEventListener('input', (e) => {
    const ta = e.target.closest('.ep-v2-user-textarea');
    if (ta) saveV2Input(ta.dataset.phase, ta.dataset.field, ta.value);
  });

  // ── V2 Maturity: fetch from EA Repository ──
  function loadMaturityFromRepo() {
    const wrap = document.getElementById('ep-maturity-repo');
    if (!wrap) return;
    const cycleClient = getActiveCycleClient();
    if (!cycleClient) {
      wrap.innerHTML = '<p class="ep-v2-repo-hint">No EA Repository client assigned to this cycle.</p>';
      return;
    }

    // Switch to the cycle's client first
    fetch(EA_REPO_URL + '/api/clients/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'slug=' + encodeURIComponent(cycleClient),
      credentials: 'include'
    })
    .then(function() { return fetch(EA_REPO_URL + '/api/v1/maturity', { credentials: 'include' }); })
    .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function(data) {
      var h = '';

      // Summary bar
      var s = data.summary || {};
      h += '<div class="ep-v2-maturity-summary-bar">';
      h += '<div class="ep-v2-maturity-stat"><span class="ep-v2-maturity-stat-val">' + (s.avg_current || 0).toFixed(1) + '</span><span class="ep-v2-maturity-stat-label">Avg Current</span></div>';
      h += '<div class="ep-v2-maturity-stat"><span class="ep-v2-maturity-stat-val">' + (s.avg_target || 0).toFixed(1) + '</span><span class="ep-v2-maturity-stat-label">Avg Target</span></div>';
      h += '<div class="ep-v2-maturity-stat ep-v2-maturity-gap"><span class="ep-v2-maturity-stat-val">+' + (s.gap || 0).toFixed(1) + '</span><span class="ep-v2-maturity-stat-label">Gap</span></div>';
      h += '</div>';

      // Assessment info
      var a = data.assessment || {};
      if (a.name) {
        h += '<p class="ep-v2-maturity-meta">' + a.name + ' &middot; ' + (a.status || '') + ' &middot; ' + (a.assessed_at || '') + '</p>';
      }

      // Domain cards
      (data.domains || []).forEach(function(dom) {
        h += '<div class="ep-v2-mat-domain" data-domain="' + dom.id + '">';
        h += '<button class="ep-v2-mat-domain-header">';
        h += '<div class="ep-v2-mat-domain-info">';
        h += '<strong>' + dom.label + '</strong>';
        h += '<span class="ep-v2-mat-domain-desc">' + (dom.avg_current || 0).toFixed(1) + ' &rarr; ' + (dom.avg_target || 0).toFixed(1) + ' (gap: +' + ((dom.avg_target || 0) - (dom.avg_current || 0)).toFixed(1) + ')</span>';
        h += '</div>';
        h += '<span class="ep-section-chevron">' + chevronSVG() + '</span>';
        h += '</button>';
        h += '<div class="ep-v2-mat-domain-body">';
        h += '<div class="ep-v2-maturity-grid">';
        h += '<div class="ep-v2-maturity-header-row">';
        h += '<div class="ep-v2-maturity-dim-header">Capability</div>';
        h += '<div class="ep-v2-maturity-scale-header">Current</div>';
        h += '<div class="ep-v2-maturity-scale-header">Target</div>';
        h += '<div class="ep-v2-maturity-scale-header">Gap</div>';
        h += '</div>';
        (dom.capabilities || []).forEach(function(cap) {
          var cur = cap.current || 0;
          var tgt = cap.target || 0;
          var gap = tgt - cur;
          var gapCls = gap > 2 ? 'ep-gap-high' : gap > 0 ? 'ep-gap-med' : 'ep-gap-none';
          h += '<div class="ep-v2-maturity-row">';
          h += '<div class="ep-v2-maturity-dim"><div class="ep-v2-maturity-dim-label">' + cap.name + '</div></div>';
          h += '<div class="ep-v2-maturity-val"><span class="ep-v2-mat-level" data-level="' + cur + '">' + (cur || '—') + '</span></div>';
          h += '<div class="ep-v2-maturity-val"><span class="ep-v2-mat-level" data-level="' + tgt + '">' + (tgt || '—') + '</span></div>';
          h += '<div class="ep-v2-maturity-val"><span class="ep-v2-mat-gap ' + gapCls + '">' + (gap > 0 ? '+' + gap : gap === 0 ? '—' : gap) + '</span></div>';
          h += '</div>';
        });
        h += '</div></div></div>';
      });

      // Link to EA Repository
      h += '<p class="ep-v2-maturity-link"><a href="' + EA_REPO_URL + '/maturity" target="_blank">Edit scores in EA Repository &rarr;</a></p>';

      wrap.innerHTML = h;

      // Domain expand/collapse
      wrap.querySelectorAll('.ep-v2-mat-domain-header').forEach(function(btn) {
        btn.addEventListener('click', function() {
          this.closest('.ep-v2-mat-domain').classList.toggle('open');
        });
      });
    })
    .catch(function() {
      wrap.innerHTML = '<p class="ep-v2-repo-hint ep-v2-repo-offline">EA Repository is not running. Start it with <code>ea serve</code> at <a href="http://localhost:3000" target="_blank">localhost:3000</a></p>';
    });
  }

  // Load maturity data on page init
  setTimeout(loadMaturityFromRepo, 300);

  // Reload when cycle changes
  var origPopulateMat = populateFormFromCycle;
  populateFormFromCycle = function() {
    origPopulateMat();
    loadMaturityFromRepo();
  };

  // ── EA Agent Analysis: tabs, generate, load/save ──
  function renderAgentMarkdown(md) {
    if (typeof marked !== 'undefined') {
      return marked.parse(md);
    }
    // Minimal fallback if marked.js not loaded
    return md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }

  function loadAgentOutput(phaseId, section) {
    const data = activeCycleData();
    return (data[phaseId] && data[phaseId]._agent && data[phaseId]._agent[section]) || null;
  }

  function saveAgentOutput(phaseId, section, markdown) {
    const cd = ensureCyclePhase(phaseId);
    if (!cd._agent) cd._agent = {};
    cd._agent[section] = markdown;
    persistAll();
  }

  function showAgentOutput(phaseId, section) {
    const md = loadAgentOutput(phaseId, section);
    const viewEl = container.querySelector(`.ep-v2-agent-view[data-phase="${phaseId}"][data-section="${section}"]`);
    const srcEl = container.querySelector(`.ep-v2-agent-source[data-phase="${phaseId}"][data-section="${section}"]`);
    const emptyEl = container.querySelector(`.ep-v2-agent-empty[data-phase="${phaseId}"][data-section="${section}"]`);
    if (!viewEl) return;
    if (md) {
      viewEl.innerHTML = `<div class="ep-v2-agent-md">${renderAgentMarkdown(md)}</div>`;
      srcEl.innerHTML = `<pre><code>${md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`;
      emptyEl.style.display = 'none';
      viewEl.closest('.ep-v2-agent-output').classList.add('has-content');
    } else {
      viewEl.innerHTML = '';
      srcEl.innerHTML = '';
      emptyEl.style.display = '';
      viewEl.closest('.ep-v2-agent-output').classList.remove('has-content');
    }
  }

  // Tab switching
  container.addEventListener('click', (e) => {
    const tab = e.target.closest('.ep-v2-agent-tab');
    if (tab) {
      const wrap = tab.closest('.ep-v2-agent-output');
      const show = tab.dataset.show;
      wrap.querySelectorAll('.ep-v2-agent-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      wrap.querySelector('.ep-v2-agent-view').classList.toggle('active', show === 'view');
      wrap.querySelector('.ep-v2-agent-source').classList.toggle('active', show === 'source');
      return;
    }

  });

  // Restore agent outputs on page load / cycle switch
  function restoreAllAgentOutputs() {
    container.querySelectorAll('.ep-v2-agent-output').forEach(el => {
      const phaseId = el.dataset.phase;
      const section = el.dataset.section;
      if (!phaseId || !section) return;
      const existing = loadAgentOutput(phaseId, section);
      if (existing) {
        showAgentOutput(phaseId, section);
      } else {
        // Try loading from markdown file on disk
        fetch(`data/ea-agent/${phaseId}-${section}.md`)
          .then(r => { if (!r.ok) throw new Error(); return r.text(); })
          .then(md => {
            saveAgentOutput(phaseId, section, md);
            showAgentOutput(phaseId, section);
          })
          .catch(() => showAgentOutput(phaseId, section));
      }
    });
  }

  // Patch populateFormFromCycle to also restore agent outputs
  const origPopulate = populateFormFromCycle;
  populateFormFromCycle = function() {
    origPopulate();
    restoreAllAgentOutputs();
  };

  // Initial restore
  setTimeout(restoreAllAgentOutputs, 100);

  // ── V2 Phase Context (callable per phase) ──
  window.getPhaseContext = async function(phaseId) {
    const all = loadV2Inputs();
    const phaseData = all[phaseId] || {};
    const sponsorInput = {};
    const maturityAssessment = phaseData.maturity || {};
    Object.keys(phaseData).forEach(k => {
      if (k !== 'maturity') sponsorInput[k] = phaseData[k];
    });
    const phase = phases.find(p => p.id === phaseId);
    // Fetch repository summary (element counts per layer)
    let repoSummary = null;
    try {
      const layers = ['Strategy', 'Business', 'Application', 'Technology', 'Motivation'];
      const counts = {};
      await Promise.all(layers.map(async (layer) => {
        const res = await fetch(`${EA_REPO_URL}/api/v1/elements?layer=${layer}`);
        if (res.ok) { const data = await res.json(); counts[layer.toLowerCase()] = data.length; }
        else { counts[layer.toLowerCase()] = 0; }
      }));
      repoSummary = counts;
    } catch (e) {
      // Repository unavailable — leave summary null
    }
    return {
      exported_at: new Date().toISOString(),
      phase: phaseId,
      phase_name: phase ? phase.name : phaseId,
      sponsor_input: sponsorInput,
      maturity_assessment: maturityAssessment,
      ea_repository: { url: EA_REPO_URL, summary: repoSummary }
    };
  };

  // Business layer type options
  const BUSINESS_TYPES = [
    { value: 'BusinessActor', label: 'Business Actor' },
    { value: 'BusinessRole', label: 'Business Role' },
    { value: 'BusinessProcess', label: 'Business Process' },
    { value: 'BusinessFunction', label: 'Business Function' },
    { value: 'BusinessService', label: 'Business Service' },
    { value: 'BusinessObject', label: 'Business Object' },
    { value: 'BusinessEvent', label: 'Business Event' },
    { value: 'BusinessInteraction', label: 'Business Interaction' },
    { value: 'BusinessCollaboration', label: 'Business Collaboration' },
    { value: 'BusinessInterface', label: 'Business Interface' },
    { value: 'Product', label: 'Product' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Representation', label: 'Representation' }
  ];

  // Layer → type mapping
  const LAYER_TYPES = {
    Strategy: ['Resource', 'Capability', 'CourseOfAction', 'ValueStream'],
    Business: BUSINESS_TYPES.map(t => t.value),
    Application: ['ApplicationComponent', 'ApplicationService', 'ApplicationFunction', 'ApplicationInterface', 'ApplicationEvent', 'ApplicationInteraction', 'ApplicationCollaboration', 'ApplicationProcess', 'DataObject'],
    Technology: ['Node', 'Device', 'SystemSoftware', 'TechnologyService', 'TechnologyFunction', 'TechnologyInterface', 'TechnologyEvent', 'TechnologyInteraction', 'TechnologyCollaboration', 'TechnologyProcess', 'Artifact', 'CommunicationNetwork', 'Path', 'Facility', 'Equipment', 'Material', 'DistributionNetwork'],
    Motivation: ['Stakeholder', 'Driver', 'Assessment', 'Goal', 'Outcome', 'Principle', 'Requirement', 'Constraint', 'Meaning', 'Value']
  };

  // Load client list for EA Repository dropdown
  (function loadRepoClients() {
  // Load capabilities from EA Repository (uses the cycle's client)
  container.addEventListener('click', (e) => {
    const loadBtn = e.target.closest('.ep-v2-repo-load');
    if (!loadBtn) return;

    const phaseId = loadBtn.dataset.phase;
    const panel = container.querySelector(`.ep-v2-repo-results[data-phase="${phaseId}"]`);
    if (!panel) return;

    const cycleClient = getActiveCycleClient();
    if (!cycleClient) {
      panel.innerHTML = '<p class="ep-v2-repo-hint">No EA Repository client assigned to this cycle. Edit the cycle or create a new one with a client selected.</p>';
      return;
    }

    loadBtn.textContent = 'Loading...';
    loadBtn.disabled = true;
    panel.innerHTML = '<p class="ep-v2-repo-hint">Connecting to EA Repository...</p>';

    // Switch to the cycle's client, then fetch capabilities
    fetch(`${EA_REPO_URL}/api/clients/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `slug=${encodeURIComponent(cycleClient)}`,
      credentials: 'include'
    })
      .then(() => fetch(`${EA_REPO_URL}/api/v1/elements?layer=Strategy&type=Capability`, { credentials: 'include' }))
      .then(r => {
        if (!r.ok) throw new Error('Server error');
        return r.json();
      })
      .then(elements => {
        loadBtn.textContent = 'Load Capabilities';
        loadBtn.disabled = false;
        if (!elements || elements.length === 0) {
          panel.innerHTML = '<p class="ep-v2-repo-hint">No capabilities found for this client.</p>';
          return;
        }
        elements.sort((a, b) => {
          const la = (a.properties && JSON.parse(a.properties || '{}').level) || 99;
          const lb = (b.properties && JSON.parse(b.properties || '{}').level) || 99;
          return la - lb || a.name.localeCompare(b.name);
        });
        const clientLabel = cycleClient.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        let html = `<div class="ep-v2-repo-count">${elements.length} capabilities from <strong>${clientLabel}</strong></div>`;
        html += '<div class="ep-v2-repo-table-wrap"><table class="ep-v2-repo-table"><thead><tr><th>ID</th><th>Capability</th><th>Description</th></tr></thead><tbody>';
        elements.forEach(el => {
          let props = {};
          try { props = JSON.parse(el.properties || '{}'); } catch {}
          const level = props.level !== undefined ? props.level : '';
          const indent = level ? '&nbsp;'.repeat(level * 3) : '';
          const desc = el.description ? (el.description.length > 100 ? el.description.substring(0, 100) + '...' : el.description) : '';
          html += `<tr><td><code>${el.id}</code></td><td>${indent}<strong>${el.name}</strong></td><td>${desc}</td></tr>`;
        });
        html += '</tbody></table></div>';
        panel.innerHTML = html;
      })
      .catch(() => {
        loadBtn.textContent = 'Load Capabilities';
        loadBtn.disabled = false;
        panel.innerHTML = '<p class="ep-v2-repo-hint ep-v2-repo-offline">EA Repository is not running. Start it with <code>ea serve</code> at <a href="http://localhost:3000" target="_blank">localhost:3000</a></p>';
      });
  });

  // ── Sponsor input: load & save ──
  const sponsorInputCache = {};
  (function loadSponsorInput() {
    fetch('data/ea-process-input.json').then(r => r.ok ? r.json() : {}).catch(() => ({})).then(data => {
      Object.assign(sponsorInputCache, data);
      // Populate form controls
      container.querySelectorAll('.ep-qa').forEach(qa => {
        const qid = qa.dataset.qid;
        if (!qid || !data[qid]) return;
        const saved = data[qid];
        if (saved.status) {
          const radio = qa.querySelector(`input[name="${qid}"][value="${saved.status}"]`);
          if (radio) radio.checked = true;
        }
        if (saved.comment) {
          const ta = qa.querySelector('.ep-qa-text');
          if (ta) ta.value = saved.comment;
        }
      });
    });
  })();

  function saveSponsorInput(qid, status, comment) {
    sponsorInputCache[qid] = { status: status || '', comment: comment || '' };
    fetch('/api/save-input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sponsorInputCache)
    }).catch(() => {});
  }

  container.addEventListener('change', (e) => {
    const radio = e.target.closest('input[type="radio"]');
    if (radio && radio.name) {
      const qa = radio.closest('.ep-qa');
      if (qa) {
        const qid = qa.dataset.qid;
        const ta = qa.querySelector('.ep-qa-text');
        saveSponsorInput(qid, radio.value, ta ? ta.value : '');
      }
      return;
    }
  });

  container.addEventListener('input', (e) => {
    const ta = e.target.closest('.ep-qa-text');
    if (ta) {
      const qa = ta.closest('.ep-qa');
      if (qa) {
        const qid = qa.dataset.qid;
        const checked = qa.querySelector(`input[name="${qid}"]:checked`);
        saveSponsorInput(qid, checked ? checked.value : '', ta.value);
      }
      return;
    }
  });

  // ── YAML generation ──
  function updateYAML(phaseId) {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;
    const vals = getFieldValues(phaseId, phase);
    const el = document.getElementById(`ep-yaml-${phaseId}`);
    if (el) el.textContent = generateYAML(phaseId, vals);
  }

  // Initialize all YAMLs (only for phases with the old form-based deliverable)
  phases.filter(p => !p.worked_deliverables).forEach(p => updateYAML(p.id));

  // Form input listeners
  container.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.phase && el.dataset.field) {
      saveInput(el.dataset.phase, el.dataset.field, el.value);
      updateYAML(el.dataset.phase);
    }
  });
  container.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.phase && el.dataset.field) {
      saveInput(el.dataset.phase, el.dataset.field, el.value);
      updateYAML(el.dataset.phase);
    }
  });

  // Copy buttons & worked deliverable interactions
  container.addEventListener('click', (e) => {
    // Worked deliverable: tab switching
    const tabBtn = e.target.closest('.ep-deliv-tab');
    if (tabBtn) {
      const wdId = tabBtn.dataset.wd;
      const view = tabBtn.dataset.view;
      const wdBody = tabBtn.closest('.ep-wd-body');
      if (wdBody) {
        wdBody.querySelectorAll(`.ep-deliv-tab[data-wd="${wdId}"]`).forEach(t => t.classList.toggle('active', t.dataset.view === view));
        wdBody.querySelectorAll(`.ep-deliv-panel[data-wd="${wdId}"]`).forEach(p => p.classList.toggle('active', p.dataset.panel === view));
      }
      return;
    }

    // Worked deliverable: YAML copy
    const yamlCopy = e.target.closest('.ep-yaml-copy');
    if (yamlCopy) {
      const wdId = yamlCopy.dataset.yamlId;
      const pre = document.getElementById(`ep-wd-yaml-${wdId}`);
      if (pre) {
        navigator.clipboard.writeText(pre.textContent).then(() => {
          yamlCopy.textContent = 'Copied!';
          yamlCopy.classList.add('ep-copied');
          setTimeout(() => { yamlCopy.textContent = 'Copy'; yamlCopy.classList.remove('ep-copied'); }, 2000);
        });
      }
      return;
    }

    const copyBtn = e.target.closest('.ep-copy-btn');
    if (copyBtn) {
      const phaseId = copyBtn.dataset.phase;
      const phase = phases.find(p => p.id === phaseId);
      const vals = getFieldValues(phaseId, phase);
      const yaml = generateYAML(phaseId, vals);
      navigator.clipboard.writeText(yaml).then(() => {
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('ep-copied');
        setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('ep-copied'); }, 2000);
      });
      return;
    }

    // Reset buttons
    const resetBtn = e.target.closest('.ep-reset-btn');
    if (resetBtn) {
      const phaseId = resetBtn.dataset.phase;
      const phase = phases.find(p => p.id === phaseId);
      clearInputs(phaseId);
      // Restore defaults to form fields
      const createEl = document.getElementById(`ep-create-${phaseId}`);
      if (createEl && phase) {
        phase.deliverable.fields.forEach(f => {
          const input = createEl.querySelector(`[data-field="${f.id}"]`);
          if (input) {
            if (input.tagName === 'SELECT') input.value = f.default || '';
            else if (input.tagName === 'TEXTAREA') input.value = f.default || '';
            else input.value = f.default || '';
          }
        });
      }
      updateYAML(phaseId);
      return;
    }

    // Create toggle
    const toggle = e.target.closest('.ep-create-toggle');
    if (toggle) {
      const content = document.getElementById(`ep-create-${toggle.dataset.phase}`);
      if (content) {
        const isOpen = content.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
      }
      return;
    }

    // Worked deliverable item toggle
    const wdToggle = e.target.closest('.ep-wd-toggle');
    if (wdToggle) {
      const item = wdToggle.closest('.ep-wd-item');
      const body = wdToggle.nextElementSibling;
      if (item && body) {
        const isOpen = item.classList.toggle('open');
        body.classList.toggle('open', isOpen);
        wdToggle.setAttribute('aria-expanded', isOpen);
        // Render any unprocessed Mermaid diagrams inside the expanded panel
        if (isOpen && typeof mermaid !== 'undefined') {
          const unprocessed = body.querySelectorAll('pre.mermaid:not([data-processed])');
          if (unprocessed.length) {
            mermaid.run({ nodes: unprocessed }).then(() => {
              body.querySelectorAll('.mermaid svg').forEach(svg => {
                const bbox = svg.getBBox();
                const pad = 8;
                svg.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`);
                svg.removeAttribute('width');
                svg.style.width = (bbox.width + pad * 2) + 'px';
                svg.style.maxWidth = '100%';
                svg.style.height = 'auto';
              });
            });
          }
        }
      }
      return;
    }

    // Section collapse toggle
    const secToggle = e.target.closest('.ep-section-toggle');
    if (secToggle) {
      const body = secToggle.nextElementSibling;
      if (body && body.classList.contains('ep-section-body')) {
        const isOpen = body.classList.toggle('open');
        secToggle.setAttribute('aria-expanded', isOpen);
      }
      return;
    }
  });

  // ── Phase switching ──
  function switchPhase(phaseId) {
    document.querySelectorAll('.ep-phase-pill').forEach(btn => btn.classList.toggle('active', btn.dataset.phase === phaseId));
    document.querySelectorAll('.ep-phase-detail').forEach(panel => panel.classList.toggle('active', panel.id === `ep-detail-${phaseId}`));
    const activePill = document.querySelector(`.ep-phase-pill[data-phase="${phaseId}"]`);
    if (activePill) activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    // Scroll the main content area back to top
    const scroll = document.querySelector('.main-scroll');
    if (scroll) scroll.scrollTop = 0;
  }

  document.addEventListener('click', (e) => {
    const pill = e.target.closest('.ep-phase-pill');
    if (pill) { switchPhase(pill.dataset.phase); return; }
    const navBtn = e.target.closest('.ep-nav-btn');
    if (navBtn) { switchPhase(navBtn.dataset.phase); return; }
    // Sidenav clicks
    const sideItem = e.target.closest('.ep-v2-sidenav-item');
    if (sideItem) {
      e.preventDefault();
      const target = document.getElementById('ep-sec-' + sideItem.dataset.sec);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Scroll-spy for sidenav — use IntersectionObserver for reliability
  const sidenavItems = {};
  document.querySelectorAll('.ep-v2-sidenav-item').forEach(function(item) {
    sidenavItems[item.dataset.sec] = item;
  });

  if (Object.keys(sidenavItems).length) {
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        const secId = entry.target.id.replace('ep-sec-', '');
        const navItem = sidenavItems[secId];
        if (navItem) {
          if (entry.isIntersecting) {
            Object.values(sidenavItems).forEach(function(n) { n.classList.remove('active'); });
            navItem.classList.add('active');
          }
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });

    document.querySelectorAll('[id^="ep-sec-p"]').forEach(function(sec) {
      observer.observe(sec);
    });
  }

  // Keyboard nav
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    const currentPanel = document.querySelector('.ep-phase-detail.active');
    if (!currentPanel) return;
    const currentId = currentPanel.id.replace('ep-detail-', '');
    const idx = phases.findIndex(p => p.id === currentId);
    if (e.key === 'ArrowLeft' && idx > 0) { e.preventDefault(); switchPhase(phases[idx - 1].id); }
    else if (e.key === 'ArrowRight' && idx < phases.length - 1) { e.preventDefault(); switchPhase(phases[idx + 1].id); }
  });
  });
}

/* ── Process Analysis Page ─────────────────────────────── */
function initProcessAnalysisPage() {
  const container = document.getElementById('process-analysis-content') || document.querySelector('.main-scroll');
  if (!pageData) return;
  const d = pageData;

  function ratingBadge(r) {
    const cls = r === 'high' ? 'priority-high' : r === 'medium' ? 'priority-medium' : 'priority-low';
    return `<span class="priority-badge ${cls}">${r}</span>`;
  }
  function approachBadge(a) {
    const map = { 'agent-native': 'impact-new', 'agent-augmented': 'impact-modify', 'hybrid': 'impact-extend' };
    return `<span class="impact-badge ${map[a] || 'impact-unchanged'}">${a}</span>`;
  }
  function techChip(t) { return `<span class="pa-tech-chip">${t}</span>`; }
  function chevron() { return `<svg class="pa-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`; }

  // ── Hero ──
  let html = `<header class="hero"><div class="container">
    <h1>${d.title}</h1>
    <p class="subtitle">${d.subtitle}</p>
    <div class="pa-stats-bar">
      <div class="pa-stat"><span class="pa-stat-num">${d.stats.total_processes}</span><span class="pa-stat-label">Processes</span></div>
      <div class="pa-stat"><span class="pa-stat-num pa-high">${d.stats.high_impact}</span><span class="pa-stat-label">High Impact</span></div>
      <div class="pa-stat"><span class="pa-stat-num pa-medium">${d.stats.medium_impact}</span><span class="pa-stat-label">Medium Impact</span></div>
      <div class="pa-stat"><span class="pa-stat-num pa-low">${d.stats.low_impact}</span><span class="pa-stat-label">Low Impact</span></div>
      <div class="pa-stat"><span class="pa-stat-num">${d.stats.applications_linked}</span><span class="pa-stat-label">Apps Linked</span></div>
      <div class="pa-stat"><span class="pa-stat-num">${d.stats.roles_linked}</span><span class="pa-stat-label">Roles Linked</span></div>
    </div>
  </div></header>`;

  // ── Impact overview cards ──
  html += `<div class="dashboard-section"><div class="container">
    <h2>Value Stream Overview</h2>
    <div class="pa-vs-grid">`;
  d.value_streams.forEach(vs => {
    html += `<div class="pa-vs-card">
      <div class="pa-vs-card-header">
        <h3>${vs.name}</h3>
        ${ratingBadge(vs.overall_rating)}
      </div>
      <p class="pa-vs-desc">${vs.description}</p>
      <div class="pa-vs-meta"><span>${vs.process_count} processes</span></div>
    </div>`;
  });
  html += `</div></div></div>`;

  // ── Value stream sections ──
  d.value_streams.forEach((vs, vsIdx) => {
    html += `<div class="dashboard-section"><div class="container">
      <div class="pa-vs-header" data-vs="${vsIdx}">
        <h2>${vs.name} ${ratingBadge(vs.overall_rating)}</h2>
        ${chevron()}
      </div>
      <div class="pa-vs-body open" id="pa-vs-${vsIdx}">`;

    // Mermaid diagram
    html += `<div class="pa-flow-wrap">
      <h3>Process Flow</h3>
      <div class="mermaid">${vs.mermaid}</div>
    </div>`;

    // Process table
    html += `<div class="pa-process-list">`;
    vs.processes.forEach((p, pIdx) => {
      const ai = p.ai_impact;
      html += `<div class="pa-process-card${p.is_parent ? ' pa-parent' : ''}" data-proc="${vsIdx}-${pIdx}">
        <div class="pa-process-header">
          <div class="pa-process-title">
            ${p.is_parent ? '<span class="pa-parent-icon">&#9654;</span>' : ''}
            <strong>${p.name}</strong>
            <span class="pa-owner">${p.owner}</span>
          </div>
          <div class="pa-process-badges">
            ${ratingBadge(ai.rating)}
            ${approachBadge(ai.approach)}
            ${chevron()}
          </div>
        </div>
        <div class="pa-process-summary">${ai.summary}</div>
        <div class="pa-process-detail" id="pa-detail-${vsIdx}-${pIdx}">
          <div class="pa-detail-grid">
            <div class="pa-detail-col">
              <h4>Current State</h4>
              <p>${ai.current_state}</p>
            </div>
            <div class="pa-detail-col">
              <h4>AI Opportunity</h4>
              <p>${ai.ai_opportunity}</p>
            </div>
          </div>
          <div class="pa-detail-row">
            <div class="pa-detail-item"><strong>Estimated Value:</strong> ${ai.estimated_value}</div>
            <div class="pa-detail-item"><strong>Readiness:</strong> ${ratingBadge(ai.readiness)}</div>
          </div>
          <div class="pa-detail-row">
            <div class="pa-detail-item"><strong>Techniques:</strong> ${ai.techniques.map(techChip).join(' ')}</div>
          </div>`;
      if (ai.barriers && ai.barriers.length) {
        html += `<div class="pa-detail-row"><div class="pa-detail-item"><strong>Barriers:</strong> ${ai.barriers.join(' &bull; ')}</div></div>`;
      }
      // Linked elements
      if (p.roles.length || p.applications.length || p.data_objects.length) {
        html += `<div class="pa-linked">`;
        if (p.roles.length) html += `<div class="pa-linked-group"><span class="pa-linked-label">Roles:</span> ${p.roles.map(r => `<span class="pa-linked-tag pa-tag-role">${r}</span>`).join(' ')}</div>`;
        if (p.applications.length) html += `<div class="pa-linked-group"><span class="pa-linked-label">Applications:</span> ${p.applications.map(a => `<span class="pa-linked-tag pa-tag-app">${a}</span>`).join(' ')}</div>`;
        if (p.data_objects.length) html += `<div class="pa-linked-group"><span class="pa-linked-label">Data:</span> ${p.data_objects.map(o => `<span class="pa-linked-tag pa-tag-data">${o.name} <small>(${o.access})</small></span>`).join(' ')}</div>`;
        html += `</div>`;
      }
      html += `</div></div>`;
    });
    html += `</div></div></div>`;
  });

  // ── Cross-cutting analysis ──
  html += `<div class="dashboard-section"><div class="container">
    <h2>Cross-Cutting Analysis</h2>
    <div class="pa-cross-grid">`;

  // Technique frequency
  html += `<div class="pa-cross-card">
    <h3>AI Technique Frequency</h3>
    <div class="pa-technique-list">`;
  d.cross_cutting.technique_frequency.slice(0, 10).forEach(t => {
    const pct = Math.round(t.count / 20 * 100);
    html += `<div class="pa-technique-row">
      <span class="pa-technique-name">${t.technique}</span>
      <div class="pa-technique-bar"><div class="pa-technique-fill" style="width:${Math.max(pct, 8)}%"></div></div>
      <span class="pa-technique-count">${t.count}</span>
    </div>`;
  });
  html += `</div></div>`;

  // Approach distribution
  const appr = d.cross_cutting.approach_distribution;
  html += `<div class="pa-cross-card">
    <h3>AI Approach Distribution</h3>
    <div class="pa-approach-list">
      <div class="pa-approach-item"><span class="impact-badge impact-new">agent-native</span><span class="pa-approach-count">${appr['agent-native']} processes</span><p class="pa-approach-desc">AI agents operate autonomously with minimal human oversight</p></div>
      <div class="pa-approach-item"><span class="impact-badge impact-modify">agent-augmented</span><span class="pa-approach-count">${appr['agent-augmented']} processes</span><p class="pa-approach-desc">AI assists human experts, enhancing their capabilities</p></div>
      <div class="pa-approach-item"><span class="impact-badge impact-extend">hybrid</span><span class="pa-approach-count">${appr['hybrid']} processes</span><p class="pa-approach-desc">Mix of autonomous and human-driven activities</p></div>
    </div>
  </div>`;

  // Readiness heat map
  const rd = d.cross_cutting.readiness_summary;
  html += `<div class="pa-cross-card">
    <h3>Implementation Readiness</h3>
    <div class="pa-readiness-bars">
      <div class="pa-readiness-item"><span class="pa-readiness-label">High</span><div class="pa-readiness-bar"><div class="pa-readiness-fill pa-fill-high" style="width:${rd.high / 20 * 100}%"></div></div><span>${rd.high}</span></div>
      <div class="pa-readiness-item"><span class="pa-readiness-label">Medium</span><div class="pa-readiness-bar"><div class="pa-readiness-fill pa-fill-medium" style="width:${rd.medium / 20 * 100}%"></div></div><span>${rd.medium}</span></div>
      <div class="pa-readiness-item"><span class="pa-readiness-label">Low</span><div class="pa-readiness-bar"><div class="pa-readiness-fill pa-fill-low" style="width:${rd.low / 20 * 100}%"></div></div><span>${rd.low}</span></div>
    </div>
  </div>`;

  html += `</div></div></div>`;

  // ── Methodology note ──
  html += `<div class="dashboard-section"><div class="container">
    <div class="pa-methodology">${d.methodology_note}</div>
  </div></div>`;

  container.innerHTML = html;

  // ── Mermaid rendering ──
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
    const visibleMermaid = Array.from(container.querySelectorAll('.mermaid')).filter(el => {
      const body = el.closest('.pa-vs-body');
      return !body || body.classList.contains('open');
    });
    mermaid.run({ nodes: visibleMermaid }).then(() => {
      container.querySelectorAll('.mermaid svg').forEach(svg => {
        const bbox = svg.getBBox();
        const pad = 8;
        svg.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`);
        svg.removeAttribute('width');
        svg.style.width = (bbox.width + pad * 2) + 'px';
        svg.style.maxWidth = '100%';
        svg.style.height = 'auto';
      });
    });
  }

  // ── Event handlers ──
  // Value stream expand/collapse
  container.querySelectorAll('.pa-vs-header').forEach(h => {
    h.addEventListener('click', function() {
      const idx = this.dataset.vs;
      const body = document.getElementById(`pa-vs-${idx}`);
      body.classList.toggle('open');
      this.classList.toggle('open');
      // Re-render mermaid in newly opened sections
      if (body.classList.contains('open') && typeof mermaid !== 'undefined') {
        const unrendered = body.querySelectorAll('.mermaid:not([data-processed])');
        if (unrendered.length) {
          mermaid.run({ nodes: Array.from(unrendered) }).then(() => {
            body.querySelectorAll('.mermaid svg').forEach(svg => {
              const bbox = svg.getBBox();
              const pad = 8;
              svg.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`);
              svg.removeAttribute('width');
              svg.style.width = (bbox.width + pad * 2) + 'px';
              svg.style.maxWidth = '100%';
              svg.style.height = 'auto';
            });
          });
        }
      }
    });
  });

  // Process card expand/collapse
  container.querySelectorAll('.pa-process-header').forEach(h => {
    h.addEventListener('click', function() {
      const card = this.closest('.pa-process-card');
      card.classList.toggle('open');
    });
  });
}

/* ── Agent Blueprint Page ──────────────────────────────── */
function initAgentBlueprintPage() {
  const container = document.getElementById('agent-blueprint-content') || document.querySelector('.main-scroll');
  if (!pageData) return;
  const d = pageData;
  let activeProcessIdx = 0;

  function chevron() { return `<svg class="ab-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`; }
  function autonomyBadge(a) {
    const map = { 'agent-native': 'impact-new', 'agent-augmented': 'impact-modify', 'hybrid': 'impact-extend' };
    return `<span class="impact-badge ${map[a] || 'impact-unchanged'}">${a}</span>`;
  }
  function levelColor(l) {
    const map = { 'life-safety': '#7f1d1d', 'equipment': '#dc2626', 'operational': '#d97706', 'regulatory': '#7c3aed', 'data-privacy': '#7f1d1d', 'accuracy': '#dc2626', 'service-quality': '#d97706', 'data-integrity': '#dc2626', 'brand': '#2563eb' };
    return map[l] || '#64748b';
  }
  function levelLabel(l) {
    const map = { 'life-safety': 'Life Safety', 'equipment': 'Equipment', 'operational': 'Operational', 'regulatory': 'Regulatory', 'data-privacy': 'Data Privacy', 'accuracy': 'Accuracy', 'service-quality': 'Service Quality', 'data-integrity': 'Data Integrity', 'brand': 'Brand' };
    return map[l] || l.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  function layerBadge(l) {
    const map = { 'Business': 'ab-layer-business', 'Application': 'ab-layer-app', 'Technology': 'ab-layer-tech', 'Physical': 'ab-layer-physical' };
    return `<span class="ab-layer-badge ${map[l] || ''}">${l}</span>`;
  }

  function fixMermaidSvg(svgList) {
    svgList.forEach(svg => {
      const bbox = svg.getBBox();
      const pad = 8;
      svg.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`);
      svg.removeAttribute('width');
      svg.style.width = (bbox.width + pad * 2) + 'px';
      svg.style.maxWidth = '100%';
      svg.style.height = 'auto';
    });
  }

  // ── Derive client list ──
  const clients = [...new Set(d.processes.map(p => p.client))];

  // ── Render page shell: hero + client filter + selector + content area ──
  let shell = `<header class="hero"><div class="container">
    <h1>${d.title}</h1>
    <p class="subtitle">${d.subtitle}</p>
  </div></header>`;

  shell += `<div class="dashboard-section ab-selector-section"><div class="container">`;
  if (clients.length > 1) {
    shell += `<div class="ab-client-filter" id="ab-client-filter">
      <button class="ab-client-btn active" data-client="all">All</button>
      ${clients.map(c => `<button class="ab-client-btn" data-client="${c}">${c}</button>`).join('')}
    </div>`;
  }
  shell += `<div class="ab-process-selector" id="ab-process-selector">
      ${d.processes.map((p, i) => `<button class="ab-selector-card${i === 0 ? ' active' : ''}" data-idx="${i}" data-client="${p.client}">
        <span class="ab-selector-category">${p.client} &middot; ${p.category}</span>
        <strong>${p.name}</strong>
        <span class="ab-selector-summary">${p.summary}</span>
        <span class="ab-selector-meta">${p.agent_steps.length} steps &middot; ${p.architecture_elements.length} elements</span>
      </button>`).join('')}
    </div>
  </div></div>`;

  shell += `<div id="ab-process-content"></div>`;

  container.innerHTML = shell;

  function renderBlueprint(proc) {
    const target = document.getElementById('ab-process-content');
    const po = proc.process_overview;
    const totalDur = po.current_timeline.map(t => t.duration).join(' + ');

    let html = '';

    // ── Stats bar ──
    html += `<div class="dashboard-section"><div class="container">
      <div class="ab-stats-bar">
        ${proc.hero_stats.map(s => `<div class="ab-stat"><span class="ab-stat-num ${s.class}">${s.value}</span><span class="ab-stat-label">${s.label}</span></div>`).join('')}
      </div>
    </div></div>`;

    // ── Feasibility Summary ──
    const fs = proc.feasibility_summary;
    const scoreColor = fs.score >= 8.5 ? '#16a34a' : fs.score >= 7 ? '#d97706' : '#dc2626';
    const riskColors = { low: '#16a34a', medium: '#d97706', high: '#dc2626' };
    html += `<div class="dashboard-section"><div class="container">
      <h2>AI-Support Feasibility</h2>
      <div class="ab-feas-card">
        <div class="ab-feas-score" style="border-color: ${scoreColor}">
          <span class="ab-feas-score-num" style="color: ${scoreColor}">${fs.score}</span>
          <span class="ab-feas-score-of">/10</span>
          <span class="ab-feas-score-label">${fs.score_label}</span>
        </div>
        <div class="ab-feas-metrics">
          <div class="ab-feas-metric">
            <span class="ab-feas-metric-label">Time Savings</span>
            <span class="ab-feas-metric-value">${fs.time_reduction}</span>
            <span class="ab-feas-metric-detail">${fs.time_current} → ${fs.time_target}</span>
          </div>
          <div class="ab-feas-metric">
            <span class="ab-feas-metric-label">Risk</span>
            <span class="ab-feas-metric-value" style="color: ${riskColors[fs.risk_level] || '#64748b'}">${fs.risk_level}</span>
            <span class="ab-feas-metric-detail">${fs.risk_rationale.split('.')[0]}</span>
          </div>
          <div class="ab-feas-metric">
            <span class="ab-feas-metric-label">Autonomy</span>
            <span class="ab-feas-metric-value">${fs.autonomy_rate}%</span>
            <span class="ab-feas-metric-detail">without human involvement</span>
          </div>
          <div class="ab-feas-metric">
            <span class="ab-feas-metric-label">Token Cost</span>
            <span class="ab-feas-metric-value">${fs.token_estimate.cost_per_execution}</span>
            <span class="ab-feas-metric-detail">per execution (${fs.token_estimate.per_execution} tokens)</span>
          </div>
          <div class="ab-feas-metric">
            <span class="ab-feas-metric-label">Volume</span>
            <span class="ab-feas-metric-value">${fs.estimated_volume.split('(')[0].trim()}</span>
            <span class="ab-feas-metric-detail">${fs.token_estimate.annual_estimate}/year est. cost</span>
          </div>
          <div class="ab-feas-metric">
            <span class="ab-feas-metric-label">Complexity</span>
            <span class="ab-feas-metric-value" style="color: ${riskColors[fs.implementation_complexity] || '#64748b'}">${fs.implementation_complexity}</span>
            <span class="ab-feas-metric-detail">${fs.complexity_rationale.split(';')[0]}</span>
          </div>
        </div>
      </div>
      <div class="ab-feas-detail-grid">
        <div class="ab-feas-detail-col">
          <h4>Token Breakdown</h4>
          <div class="ab-token-breakdown">
            ${fs.token_estimate.breakdown.map(b => `<div class="ab-token-row">
              <strong>${b.step}</strong>
              <span class="ab-token-count">${b.tokens}</span>
              <span class="ab-token-note">${b.note}</span>
            </div>`).join('')}
          </div>
        </div>
        <div class="ab-feas-detail-col">
          <h4>Key Risks</h4>
          <ul class="ab-feas-list ab-feas-risks">${fs.key_risks.map(r => `<li>${r}</li>`).join('')}</ul>
        </div>
        <div class="ab-feas-detail-col">
          <h4>Key Benefits</h4>
          <ul class="ab-feas-list ab-feas-benefits">${fs.key_benefits.map(b => `<li>${b}</li>`).join('')}</ul>
        </div>
      </div>
    </div></div>`;

    // ── Process Overview ──
    html += `<div class="dashboard-section"><div class="container">
      <h2>Process Overview</h2>
      <p class="ab-overview-desc">${po.description}</p>

      <div class="ab-flow-comparison">
        <div class="ab-flow-card">
          <h3>Current State</h3>
          <div class="ab-diagram-wrap">
            <div class="ab-diagram-tabs">
              <button class="ab-diagram-tab active" data-show="view">Diagram</button>
              <button class="ab-diagram-tab" data-show="source">Source</button>
            </div>
            <div class="ab-diagram-view active"><div class="mermaid">${po.mermaid}</div></div>
            <div class="ab-diagram-source"><pre><code>${po.mermaid.replace(/\\n/g, '\n').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre></div>
          </div>
        </div>
        <div class="ab-flow-card ab-flow-ai">
          <h3>AI Agent State</h3>
          <div class="ab-diagram-wrap">
            <div class="ab-diagram-tabs">
              <button class="ab-diagram-tab active" data-show="view">Diagram</button>
              <button class="ab-diagram-tab" data-show="source">Source</button>
            </div>
            <div class="ab-diagram-view active"><div class="mermaid">${fs.ai_process_mermaid}</div></div>
            <div class="ab-diagram-source"><pre><code>${fs.ai_process_mermaid.replace(/\\n/g, '\n').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre></div>
          </div>
        </div>
      </div>

      <div class="ab-timeline-card">
        <h3>Current State Timeline</h3>
        <div class="ab-timeline-horizontal">
          ${po.current_timeline.map((t, i) => `<div class="ab-tl-step">
            <div class="ab-tl-step-header"><span class="ab-tl-step-num">${i + 1}</span><strong>${t.phase}</strong><span class="ab-timeline-dur">${t.duration}</span></div>
            <p>${t.description}</p>
          </div>`).join('')}
        </div>
      </div>

      <h3 style="margin-top:1.5rem">Pain Points</h3>
      <div class="ab-pain-grid">
        ${po.pain_points.map(p => `<div class="ab-pain-card">
          <strong>${p.title}</strong>
          <p>${p.description}</p>
        </div>`).join('')}
      </div>
    </div></div>`;

    // ── Agent Steps ──
    html += `<div class="dashboard-section"><div class="container">
      <h2>Agent Steps</h2>
      <p class="ab-section-intro">${proc.agent_steps.length} steps in a pipeline. Each card shows what the agent needs (context, skills, tools), how it decides (decision logic), what it produces (outputs), and what it must not do (guardrails).</p>`;
    proc.agent_steps.forEach((step, idx) => {
      const hasRoles = step.involved_roles && step.involved_roles.length > 0;
      html += `<div class="ab-step-card" data-step="${idx}">
        <div class="ab-step-header">
          <div class="ab-step-title">
            <span class="ab-step-num">${step.step_number}</span>
            <div>
              <strong>${step.name}</strong>
              <span class="ab-agent-name">${step.agent_name}</span>
            </div>
          </div>
          <div class="ab-step-badges">
            ${autonomyBadge(step.autonomy)}
            <span class="ab-target-badge">${step.target_time}</span>
            ${chevron()}
          </div>
        </div>
        <div class="ab-step-summary">${step.summary}</div>
        <div class="ab-step-detail" id="ab-step-detail-${idx}">
          <p class="ab-autonomy-desc">${step.autonomy_description}</p>

          <div class="ab-inner-section">
            <h4>Context Data</h4>
            <table class="ab-context-table">
              <thead><tr><th>Source</th><th>Type</th><th>Description</th><th>Access</th></tr></thead>
              <tbody>${step.context_data.map(c => `<tr><td><strong>${c.source}</strong></td><td>${c.type}</td><td>${c.description}</td><td><code>${c.access}</code></td></tr>`).join('')}</tbody>
            </table>
          </div>

          <div class="ab-inner-section">
            <h4>Skills</h4>
            <div class="ab-skills-grid">
              ${step.skills.map(s => `<div class="ab-skill-card">
                <div class="ab-skill-header"><strong>${s.name}</strong><span class="ab-skill-type">${s.type}</span></div>
                <p>${s.description}</p>
              </div>`).join('')}
            </div>
          </div>

          <div class="ab-inner-section">
            <h4>Tools & Data</h4>
            <table class="ab-tool-table">
              <thead><tr><th>Tool</th><th>Purpose</th><th>Access</th><th>Element</th></tr></thead>
              <tbody>${step.tools_and_data.map(t => `<tr><td><strong>${t.tool}</strong></td><td>${t.purpose}</td><td><code>${t.access}</code></td><td><code>${t.element_id}</code></td></tr>`).join('')}</tbody>
            </table>
          </div>

          <div class="ab-inner-section">
            <h4>Guardrails</h4>
            <div class="ab-guardrails-list">
              ${step.guardrails.map(g => `<div class="ab-guardrail-item" style="border-left-color: ${levelColor(g.level)}">
                <div class="ab-guardrail-header"><strong>${g.rule}</strong><span class="ab-guardrail-level" style="color: ${levelColor(g.level)}">${levelLabel(g.level)}</span></div>
                <p>${g.description}</p>
              </div>`).join('')}
            </div>
          </div>

          <div class="ab-inner-section">
            <h4>Decision Logic</h4>
            <div class="ab-decision-wrap">
              <div class="mermaid">${step.decision_logic_mermaid}</div>
            </div>
          </div>

          <div class="ab-inner-section">
            <h4>Outputs</h4>
            <div class="ab-outputs-grid">
              ${step.outputs.map(o => `<div class="ab-output-card">
                <div class="ab-output-header"><strong>${o.name}</strong><span class="ab-output-format">${o.format}</span></div>
                <p>${o.description}</p>
                <span class="ab-output-consumer">Consumer: ${o.consumer}</span>
              </div>`).join('')}
            </div>
          </div>

          ${hasRoles ? `<div class="ab-inner-section">
            <h4>Involved Roles</h4>
            <div class="ab-roles-list">
              ${step.involved_roles.map(r => `<div class="ab-role-item">
                <span class="pa-linked-tag pa-tag-role">${r.role}</span>
                <span class="ab-role-desc">${r.involvement}</span>
                <code class="ab-role-id">${r.element_id}</code>
              </div>`).join('')}
            </div>
          </div>` : ''}
        </div>
      </div>`;
    });
    html += `</div></div>`;

    // ── Orchestration ──
    const orch = proc.orchestration;
    html += `<div class="dashboard-section"><div class="container">
      <h2>Orchestration</h2>
      <p class="ab-section-intro">${orch.description}</p>
      <div class="ab-orch-diagram">
        <h3>Sequence Diagram</h3>
        <div class="mermaid">${orch.mermaid}</div>
      </div>

      <h3 style="margin-top:1.5rem">Agent Handoffs</h3>
      <div class="ab-handoffs-grid">
        ${orch.handoffs.map(h => `<div class="ab-handoff-card">
          <div class="ab-handoff-flow"><span class="ab-handoff-from">${h.from}</span><span class="ab-handoff-arrow">&rarr;</span><span class="ab-handoff-to">${h.to}</span></div>
          <div class="ab-handoff-trigger"><strong>Trigger:</strong> ${h.trigger}</div>
          <div class="ab-handoff-payload"><strong>Payload:</strong> ${h.payload}</div>
          <div class="ab-handoff-latency"><strong>Latency:</strong> ${h.latency}</div>
        </div>`).join('')}
      </div>

      <h3 style="margin-top:1.5rem">Shared State: ${orch.shared_state.name}</h3>
      <p class="ab-shared-desc">${orch.shared_state.description}</p>
      <div class="ab-lifecycle">
        ${orch.shared_state.stages.map((s, i) => `<div class="ab-lifecycle-stage">
          <div class="ab-lifecycle-marker"><span class="ab-lifecycle-num">${i + 1}</span></div>
          <div class="ab-lifecycle-content">
            <strong>${s.stage}</strong><span class="ab-lifecycle-owner">${s.owner}</span>
            <p>${s.fields_added}</p>
          </div>
        </div>`).join('')}
      </div>
    </div></div>`;

    // ── Guardrails Framework ──
    const gf = proc.guardrails_framework;
    html += `<div class="dashboard-section"><div class="container">
      <h2>Guardrails Framework</h2>
      <p class="ab-section-intro">${gf.description}</p>
      <div class="ab-levels-grid">
        ${gf.levels.map(l => `<div class="ab-level-card" style="border-left-color: ${l.color}">
          <div class="ab-level-header">
            <span class="ab-level-priority">P${l.priority}</span>
            <strong>${l.label}</strong>
          </div>
          <p class="ab-level-desc">${l.description}</p>
          <ul class="ab-level-rules">
            ${l.rules.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>`).join('')}
      </div>

      <h3 style="margin-top:1.5rem">Human Gates</h3>
      <table class="ab-gates-table">
        <thead><tr><th>Gate</th><th>Trigger</th><th>Approver</th><th>Agent Step</th><th>Description</th></tr></thead>
        <tbody>${gf.human_gates.map(g => `<tr><td><strong>${g.gate}</strong></td><td>${g.trigger}</td><td><span class="pa-linked-tag pa-tag-role">${g.approver}</span></td><td>${g.agent_step}</td><td>${g.description}</td></tr>`).join('')}</tbody>
      </table>
    </div></div>`;

    // ── Implementation Reference ──
    if (proc.implementation && proc.implementation.length) {
      const cats = { model: [], skill: [], guardrail: [] };
      proc.implementation.forEach(item => {
        if (cats[item.category]) cats[item.category].push(item);
      });
      const catMeta = {
        model: { label: 'Data Models', desc: 'Pydantic models defining the shared data structures that flow between agents' },
        skill: { label: 'Skills', desc: 'Async functions implementing each agent capability — ML inference, graph traversal, text generation' },
        guardrail: { label: 'Guardrails', desc: 'Validation checks that run before or after each agent action — blocking, escalating, or logging' }
      };
      html += `<div class="dashboard-section"><div class="container">
        <h2>Implementation Reference</h2>
        <p class="ab-section-intro">How each model, skill, and guardrail would be implemented in Python. Toggle between the structured view and the source code.</p>`;

      for (const [cat, items] of Object.entries(cats)) {
        if (!items.length) continue;
        const meta = catMeta[cat];
        html += `<div class="ab-impl-group">
          <h3>${meta.label} <span class="ab-impl-count">${items.length}</span></h3>
          <p class="ab-impl-group-desc">${meta.desc}</p>`;
        items.forEach((item, idx) => {
          const uid = `impl-${cat}-${idx}`;
          const escapedCode = item.code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          html += `<div class="ab-impl-card" data-uid="${uid}">
            <div class="ab-impl-header">
              <div class="ab-impl-title">
                <code class="ab-impl-name">${item.name}</code>
                <span class="ab-impl-step">${item.agent_step}</span>
                ${item.level ? `<span class="ab-guardrail-level" style="color: ${levelColor(item.level)}">${levelLabel(item.level)}</span>` : ''}
              </div>
              ${chevron()}
            </div>
            <div class="ab-impl-body" id="${uid}-body">
              <div class="ab-impl-tabs">
                <button class="ab-impl-tab active" data-tab="view" data-uid="${uid}">View</button>
                <button class="ab-impl-tab" data-tab="code" data-uid="${uid}">Source Code</button>
              </div>
              <div class="ab-impl-panel ab-impl-view active" id="${uid}-view">
                <p class="ab-impl-desc">${item.description}</p>
              </div>
              <div class="ab-impl-panel ab-impl-code" id="${uid}-code">
                <pre><code>${escapedCode}</code></pre>
              </div>
            </div>
          </div>`;
        });
        html += `</div>`;
      }
      html += `</div></div>`;
    }

    // ── Architecture Elements ──
    html += `<div class="dashboard-section"><div class="container">
      <h2>Architecture Elements</h2>
      <p class="ab-section-intro">All ${proc.architecture_elements.length} ArchiMate elements involved in this blueprint, linked to the EA Repository with typed IDs.</p>
      <table class="ab-element-table">
        <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Layer</th><th>Role in Blueprint</th></tr></thead>
        <tbody>${proc.architecture_elements.map(e => `<tr><td><code>${e.id}</code></td><td><strong>${e.name}</strong></td><td>${e.type}</td><td>${layerBadge(e.layer)}</td><td>${e.role_in_blueprint}</td></tr>`).join('')}</tbody>
      </table>
    </div></div>`;

    // ── Methodology Note ──
    html += `<div class="dashboard-section"><div class="container">
      <div class="pa-methodology">${d.methodology_note}</div>
    </div></div>`;

    target.innerHTML = html;

    // ── Fullscreen overlay (create once) ──
    if (!document.getElementById('ab-fullscreen-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'ab-fullscreen-overlay';
      overlay.className = 'ab-fs-overlay';
      overlay.innerHTML = '<div class="ab-fs-content"><button class="ab-fs-close" title="Close">&times;</button><div class="ab-fs-body"></div></div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay || e.target.closest('.ab-fs-close')) {
          overlay.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.classList.contains('open')) {
          overlay.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    }

    function addExpandButtons(scope) {
      scope.querySelectorAll('.mermaid').forEach(el => {
        if (el.previousElementSibling && el.previousElementSibling.classList.contains('ab-expand-btn')) return;
        const parent = el.parentElement;
        parent.style.position = 'relative';
        const btn = document.createElement('button');
        btn.className = 'ab-expand-btn';
        btn.title = 'View fullscreen';
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const svg = el.querySelector('svg');
          if (!svg) return;
          const overlay = document.getElementById('ab-fullscreen-overlay');
          const body = overlay.querySelector('.ab-fs-body');
          body.innerHTML = '';
          const clone = svg.cloneNode(true);
          clone.style.width = '100%';
          clone.style.maxWidth = 'none';
          clone.style.height = 'auto';
          body.appendChild(clone);
          overlay.classList.add('open');
          document.body.style.overflow = 'hidden';
        });
        parent.insertBefore(btn, el);
      });
    }

    // ── Mermaid rendering ──
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
      const visibleMermaid = Array.from(target.querySelectorAll('.mermaid')).filter(el => {
        const detail = el.closest('.ab-step-detail');
        return !detail;
      });
      mermaid.run({ nodes: visibleMermaid }).then(() => {
        fixMermaidSvg(target.querySelectorAll('.mermaid svg'));
        addExpandButtons(target);
      });
    }

    // ── Step card expand/collapse ──
    target.querySelectorAll('.ab-step-header').forEach(h => {
      h.addEventListener('click', function() {
        const card = this.closest('.ab-step-card');
        card.classList.toggle('open');
        if (card.classList.contains('open') && typeof mermaid !== 'undefined') {
          const unrendered = card.querySelectorAll('.mermaid:not([data-processed])');
          if (unrendered.length) {
            mermaid.run({ nodes: Array.from(unrendered) }).then(() => {
              fixMermaidSvg(card.querySelectorAll('.mermaid svg'));
              addExpandButtons(card);
            });
          }
        }
      });
    });

    // ── Implementation card expand/collapse ──
    target.querySelectorAll('.ab-impl-header').forEach(h => {
      h.addEventListener('click', function() {
        this.closest('.ab-impl-card').classList.toggle('open');
      });
    });

    // ── Diagram view/source tabs ──
    target.querySelectorAll('.ab-diagram-tab').forEach(tab => {
      tab.addEventListener('click', function() {
        const wrap = this.closest('.ab-diagram-wrap');
        const show = this.dataset.show;
        wrap.querySelectorAll('.ab-diagram-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        wrap.querySelector('.ab-diagram-view').classList.toggle('active', show === 'view');
        wrap.querySelector('.ab-diagram-source').classList.toggle('active', show === 'source');
      });
    });

    // ── Implementation view/code tabs ──
    target.querySelectorAll('.ab-impl-tab').forEach(tab => {
      tab.addEventListener('click', function(e) {
        e.stopPropagation();
        const uid = this.dataset.uid;
        const which = this.dataset.tab;
        const card = this.closest('.ab-impl-card');
        card.querySelectorAll('.ab-impl-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        card.querySelectorAll('.ab-impl-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`${uid}-${which}`).classList.add('active');
      });
    });
  }

  // ── Render first process ──
  renderBlueprint(d.processes[0]);

  // ── Process selector events ──
  document.getElementById('ab-process-selector').addEventListener('click', function(e) {
    const btn = e.target.closest('.ab-selector-card');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx);
    if (idx === activeProcessIdx) return;
    activeProcessIdx = idx;
    this.querySelectorAll('.ab-selector-card').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderBlueprint(d.processes[idx]);
    document.getElementById('ab-process-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ── Client filter events ──
  const clientFilter = document.getElementById('ab-client-filter');
  if (clientFilter) {
    clientFilter.addEventListener('click', function(e) {
      const btn = e.target.closest('.ab-client-btn');
      if (!btn) return;
      const client = btn.dataset.client;
      this.querySelectorAll('.ab-client-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cards = document.querySelectorAll('.ab-selector-card');
      cards.forEach(card => {
        card.style.display = (client === 'all' || card.dataset.client === client) ? '' : 'none';
      });
    });
  }

}

// Global keyboard shortcut: "/" to open search
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    openSearch();
  }
});

