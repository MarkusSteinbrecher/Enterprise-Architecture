/* ── EA for the Agentic Organisation ─────────────────── */
/* Single JS file: navigation, tabs, content, assessment  */

/* ── State ───────────────────────────────────────────── */
let siteData = null;
let pageData = null;
let currentSubtopic = null;
let currentTab = 'overview';

const STORAGE_KEY = 'ea-agentic-assessment';

/* ── Init ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  siteData = await loadJSON('data/site.json');
  if (!siteData) return;

  renderTopNav();

  const page = getPageId();
  if (page === 'home') {
    await initHome();
  } else if (page === 'overview') {
    await initOverview();
  } else {
    // Peek at JSON to detect page type
    const peek = await loadJSON(`data/${page}.json`);
    if (peek && peek.page_type === 'industry') {
      pageData = peek;
      initIndustryPage();
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
  return '<svg class="finding-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"/></svg>';
}

/* ── Top Navigation ──────────────────────────────────── */
function renderTopNav() {
  const nav = document.getElementById('top-nav');
  if (!nav || !siteData) return;

  const page = getPageId();

  /* ── Brand + hamburger button (mobile) ── */
  let html = `<a class="top-nav-brand" href="overview.html">${siteData.brand || 'EA for AI'}</a>`;
  html += '<button class="nav-hamburger" aria-label="Menu">&#9776;</button>';

  /* ── Link list (horizontal on desktop, vertical drawer on mobile) ── */
  html += '<div class="top-nav-links">';
  for (const link of siteData.nav) {
    if (link.children) {
      /* Desktop: dropdown. Mobile: group label + children inline */
      const childActive = link.children.some(c => c.id === page);
      html += `<div class="top-nav-dropdown${childActive ? ' active' : ''}">`;
      html += `<button class="top-nav-link dropdown-trigger${childActive ? ' active' : ''}">${link.label} \u25BE</button>`;
      html += '<div class="dropdown-menu">';
      for (const child of link.children) {
        const cActive = child.id === page ? ' active' : '';
        html += `<a class="dropdown-item${cActive}" href="${child.href}">${child.label}</a>`;
      }
      html += '</div></div>';
      /* Mobile-only: flat links with indent */
      html += `<span class="mobile-nav-group">${link.label}</span>`;
      for (const child of link.children) {
        const cActive = child.id === page ? ' active' : '';
        html += `<a class="top-nav-link mobile-nav-child${cActive}" href="${child.href}">${child.label}</a>`;
      }
    } else {
      const isExternal = link.external || link.href.startsWith('http');
      const active = !isExternal && link.id === page ? ' active' : '';
      const target = isExternal ? ' target="_blank" rel="noopener"' : '';
      html += `<a class="top-nav-link${active}" href="${link.href}"${target}>${link.label}</a>`;
    }
  }
  html += '</div>';
  /* Search icon — outside links div so it's always visible on mobile */
  html += '<button class="search-toggle" aria-label="Search">'
    + '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"/></svg>'
    + '</button>';
  nav.innerHTML = html;

  /* ── Hamburger toggle ── */
  const hamburger = nav.querySelector('.nav-hamburger');
  const links = nav.querySelector('.top-nav-links');
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    links.classList.toggle('open');
    hamburger.classList.toggle('open');
  });

  /* ── Desktop dropdown: hover + click ── */
  function positionDropdown(dd) {
    const menu = dd.querySelector('.dropdown-menu');
    const btn = dd.querySelector('.dropdown-trigger');
    if (!menu || !btn) return;
    const r = btn.getBoundingClientRect();
    menu.style.top = (r.bottom + 4) + 'px';
    menu.style.left = r.left + 'px';
  }
  nav.querySelectorAll('.top-nav-dropdown').forEach(dd => {
    const btn = dd.querySelector('.dropdown-trigger');
    const menu = dd.querySelector('.dropdown-menu');
    let hideTimer = null;
    function showDD() { clearTimeout(hideTimer); dd.classList.add('open'); positionDropdown(dd); }
    function hideDD() { hideTimer = setTimeout(() => dd.classList.remove('open'), 120); }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const opening = !dd.classList.contains('open');
      closeAllDropdowns();
      if (opening) showDD();
    });
    // Hover on trigger
    dd.addEventListener('mouseenter', showDD);
    dd.addEventListener('mouseleave', hideDD);
    // Hover on fixed-position menu (outside trigger's DOM bounds)
    if (menu) {
      menu.addEventListener('mouseenter', showDD);
      menu.addEventListener('mouseleave', hideDD);
    }
  });

  function closeAllDropdowns() {
    nav.querySelectorAll('.top-nav-dropdown.open').forEach(d => d.classList.remove('open'));
  }
  document.addEventListener('click', (e) => {
    closeAllDropdowns();
    if (!nav.contains(e.target)) { links.classList.remove('open'); hamburger.classList.remove('open'); }
  });

  /* ── Search toggle ── */
  const searchBtn = nav.querySelector('.search-toggle');
  if (searchBtn) searchBtn.addEventListener('click', (e) => { e.stopPropagation(); openSearch(); });
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
  const pages = siteData.nav.filter(n => n.id !== 'home' && n.id !== 'overview' && !n.external);

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

  el.innerHTML = html;
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
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  let html = '<div class="sidebar-section">';
  html += '<div class="sidebar-heading">Topics</div>';
  for (const st of subtopics) {
    html += `<a class="sidebar-link" href="#${st.id}" data-subtopic="${st.id}" onclick="event.preventDefault();scrollToTopic('${st.id}')">${st.label}</a>`;
  }
  html += '</div>';
  sidebar.innerHTML = html;
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
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.toggle('active', link.dataset.subtopic === id);
  });
}

function selectSubtopic(id) {
  currentSubtopic = pageData.subtopics.find(s => s.id === id);
  if (!currentSubtopic) return;
  document.querySelectorAll('.sidebar-link').forEach(link => {
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

  // One row per subtopic (with optional group headers)
  let currentGroup = null;
  for (const st of pageData.subtopics) {
    // Group header row when group changes
    if (st.group && st.group !== currentGroup) {
      currentGroup = st.group;
      html += `<div class="compare-group-header"><span class="compare-group-label">${st.group}</span></div>`;
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
      const cat = st.ai_impact ? st.ai_impact.impact_category : 'A';
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
  document.querySelectorAll('.sidebar-link').forEach(link => {
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
    'ea-operating-model', 'ea-development-method', 'ea-governance',
    'ea-repository', 'ea-roles-skills', 'risk-security',
    'banking', 'reinsurance', 'pharma'
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

    // New capabilities
    if (file === 'new-capabilities' && Array.isArray(data)) {
      for (const c of data) {
        idx.push({ type: 'finding', title: c.title, snippet: truncate(stripHTML(c.description), 200), href: 'overview.html', page: 'New Capabilities', _text: (c.title + ' ' + stripHTML(c.description)).toLowerCase() });
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
        <svg class="search-input-icon" width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"/></svg>
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

// Global keyboard shortcut: "/" to open search
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    openSearch();
  }
});

