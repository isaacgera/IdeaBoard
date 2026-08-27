// Idea Board — Rendering (Dashboard, Kanban, List, Cards)

import { state, STATUSES } from './state.js';
import { escapeHtml, escapeAttr, formatDate, formatDateTime, formatTimeAgo } from './utils.js';
import { getVoteScore, getUserVote } from './voting.js';
import { isAdmin, updateUserDisplay } from './auth.js';

// ============================================================
// FILTERING & SORTING
// ============================================================
export function filterIdeas() {
  state.filters.search = document.getElementById('search-input').value.toLowerCase();
  state.filters.category = document.getElementById('filter-category').value;
  state.filters.priority = document.getElementById('filter-priority').value;
  render();
}

export function getFilteredIdeas() {
  var ideas = [];
  Object.keys(state.ideas).forEach(function(id) {
    var idea = state.ideas[id];
    if (state.filters.search) {
      var s = state.filters.search;
      if ((idea.title || '').toLowerCase().indexOf(s) === -1 &&
          (idea.description || '').toLowerCase().indexOf(s) === -1 &&
          (idea.benefits || '').toLowerCase().indexOf(s) === -1 &&
          (idea.submittedBy || '').toLowerCase().indexOf(s) === -1) return;
    }
    if (state.filters.category && idea.category !== state.filters.category) return;
    if (state.filters.priority && idea.priority !== state.filters.priority) return;
    ideas.push(idea);
  });

  var col = state.sort.column, dir = state.sort.direction === 'asc' ? 1 : -1;
  var po = { 'High': 0, 'Medium': 1, 'Low': 2 };
  var so = { 'New': 0, 'In Progress': 1, 'Review': 2, 'Done': 3 };

  ideas.sort(function(a, b) {
    var va, vb;
    if (col === 'priority') { va = po[a.priority] !== undefined ? po[a.priority] : 9; vb = po[b.priority] !== undefined ? po[b.priority] : 9; }
    else if (col === 'status') { va = so[a.status] !== undefined ? so[a.status] : 9; vb = so[b.status] !== undefined ? so[b.status] : 9; }
    else if (col === 'createdAt') { va = a.createdAt || 0; vb = b.createdAt || 0; }
    else if (col === 'votes') { va = getVoteScore(a); vb = getVoteScore(b); }
    else { va = (a[col] || '').toLowerCase(); vb = (b[col] || '').toLowerCase(); }
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
  return ideas;
}

export function sortBy(column) {
  if (state.sort.column === column) {
    state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    state.sort.column = column;
    state.sort.direction = (column === 'createdAt' || column === 'votes') ? 'desc' : 'asc';
  }
  render();
}

// ============================================================
// VIEW SWITCHING
// ============================================================
export function setView(view) {
  state.currentView = view;
  document.getElementById('view-kanban').classList.toggle('active', view === 'kanban');
  document.getElementById('view-list').classList.toggle('active', view === 'list');
  render();
}

// ============================================================
// THEME
// ============================================================
export function loadTheme() {
  var saved = localStorage.getItem('ib_theme');
  state.darkMode = (saved === 'dark');
  applyTheme();
}

export function toggleTheme() {
  state.darkMode = !state.darkMode;
  localStorage.setItem('ib_theme', state.darkMode ? 'dark' : 'light');
  applyTheme();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
  var btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = state.darkMode ? '\u2600\uFE0F' : '\uD83C\uDF19';
}

// ============================================================
// RENDER CATEGORY FILTER
// ============================================================
export function renderCategoryFilter() {
  var select = document.getElementById('filter-category');
  var cur = select.value;
  select.innerHTML = '<option value="">All Categories</option>';
  state.categories.forEach(function(cat) {
    select.innerHTML += '<option value="' + escapeHtml(cat) + '"' + (cur === cat ? ' selected' : '') + '>' + escapeHtml(cat) + '</option>';
  });
}

// ============================================================
// MAIN RENDER
// ============================================================
export function render() {
  var dashContainer = document.getElementById('dashboard-container');
  if (dashContainer) dashContainer.innerHTML = renderDashboard();

  var contentHtml = '';
  if (state.currentView === 'kanban') { contentHtml = renderKanbanHtml(); }
  else { contentHtml = renderListHtml(); }
  document.getElementById('board-content').innerHTML = contentHtml;

  updateLastUpdated();

  var manageBtn = document.getElementById('btn-manage-data');
  if (manageBtn) manageBtn.style.display = isAdmin() ? 'inline-flex' : 'none';
  var switchBtn = document.getElementById('btn-switch-user');
  if (switchBtn) switchBtn.style.display = isAdmin() ? 'inline-flex' : 'none';
  var onlineBtn = document.getElementById('online-count');
  if (onlineBtn) onlineBtn.style.display = isAdmin() ? 'inline-block' : 'none';

  updateUserDisplay();
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  var allIdeas = Object.values(state.ideas);
  var total = allIdeas.length;
  if (!total) return '';

  var byStat = {};
  STATUSES.forEach(function(s) { byStat[s] = 0; });
  var bySubmitter = {};
  var thisMonth = 0;
  var now = new Date(), monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  allIdeas.forEach(function(idea) {
    if (byStat[idea.status] !== undefined) byStat[idea.status]++;
    bySubmitter[idea.submittedBy] = (bySubmitter[idea.submittedBy] || 0) + 1;
    if (idea.createdAt >= monthStart) thisMonth++;
  });

  var topContrib = '', topCount = 0;
  Object.keys(bySubmitter).forEach(function(name) {
    if (bySubmitter[name] > topCount) { topCount = bySubmitter[name]; topContrib = name; }
  });

  var html = '<div class="dashboard" id="dashboard-bar">';
  html += '<div class="stat-card clickable" onclick="IB.dashFilter(\'all\')" onmouseenter="IB.dashHover(\'all\')" onmouseleave="IB.dashHoverEnd()"><span class="stat-number">' + total + '</span><span class="stat-label">Total Ideas</span></div>';
  html += '<div class="stat-card stat-new clickable" onclick="IB.dashFilter(\'status\',\'New\')" onmouseenter="IB.dashHover(\'status\',\'New\')" onmouseleave="IB.dashHoverEnd()"><span class="stat-number">' + byStat['New'] + '</span><span class="stat-label">New</span></div>';
  html += '<div class="stat-card stat-progress clickable" onclick="IB.dashFilter(\'status\',\'In Progress\')" onmouseenter="IB.dashHover(\'status\',\'In Progress\')" onmouseleave="IB.dashHoverEnd()"><span class="stat-number">' + byStat['In Progress'] + '</span><span class="stat-label">In Progress</span></div>';
  html += '<div class="stat-card stat-review clickable" onclick="IB.dashFilter(\'status\',\'Review\')" onmouseenter="IB.dashHover(\'status\',\'Review\')" onmouseleave="IB.dashHoverEnd()"><span class="stat-number">' + byStat['Review'] + '</span><span class="stat-label">In Review</span></div>';
  html += '<div class="stat-card stat-done clickable" onclick="IB.dashFilter(\'status\',\'Done\')" onmouseenter="IB.dashHover(\'status\',\'Done\')" onmouseleave="IB.dashHoverEnd()"><span class="stat-number">' + byStat['Done'] + '</span><span class="stat-label">Done</span></div>';
  html += '<div class="stat-card clickable" onclick="IB.dashFilter(\'month\')" onmouseenter="IB.dashHover(\'month\')" onmouseleave="IB.dashHoverEnd()"><span class="stat-number">' + thisMonth + '</span><span class="stat-label">This Month</span></div>';
  html += '<div class="stat-card clickable" onclick="IB.dashFilter(\'submitter\',\'' + escapeAttr(topContrib) + '\')" onmouseenter="IB.dashHover(\'submitter\',\'' + escapeAttr(topContrib) + '\')" onmouseleave="IB.dashHoverEnd()"><span class="stat-number">' + escapeHtml(topContrib) + '</span><span class="stat-label">Top Contributor</span></div>';
  html += '</div>';
  return html;
}

// ============================================================
// DASHBOARD HIGHLIGHT LOGIC
// ============================================================
export function dashFilter(type, value) {
  if (state.dashHighlight && state.dashHighlight.type === type && state.dashHighlight.value === value) {
    state.dashHighlight = null;
  } else if (type === 'all') {
    state.dashHighlight = null;
  } else {
    state.dashHighlight = { type: type, value: value || null };
  }
  state.dashLocked = !!state.dashHighlight;
  applyDashHighlight();
}

export function dashHover(type, value) {
  if (state.dashLocked) return;
  if (type === 'all') { state.dashHighlight = null; }
  else { state.dashHighlight = { type: type, value: value || null }; }
  applyDashHighlight();
}

export function dashHoverEnd() {
  if (state.dashLocked) return;
  state.dashHighlight = null;
  applyDashHighlight();
}

export function dashClearOnOutsideClick(e) {
  if (!state.dashHighlight && !state.dashLocked) return;
  var dashboard = document.getElementById('dashboard-container');
  if (dashboard && !dashboard.contains(e.target)) {
    state.dashHighlight = null;
    state.dashLocked = false;
    applyDashHighlight();
  }
}

function ideaMatchesDashHighlight(idea) {
  if (!state.dashHighlight) return true;
  var h = state.dashHighlight;
  if (h.type === 'status') return idea.status === h.value;
  if (h.type === 'month') {
    var now = new Date(), monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return idea.createdAt >= monthStart;
  }
  if (h.type === 'submitter') return idea.submittedBy === h.value;
  return true;
}

function applyDashHighlight() {
  var hasHighlight = !!state.dashHighlight;

  document.querySelectorAll('.stat-card').forEach(function(card) { card.classList.remove('active'); });
  if (hasHighlight) {
    document.querySelectorAll('.stat-card').forEach(function(card) {
      var onclick = card.getAttribute('onclick') || '';
      if (state.dashHighlight.type === 'status' && onclick.indexOf("'" + state.dashHighlight.value + "'") !== -1 && onclick.indexOf("'status'") !== -1) {
        card.classList.add('active');
      } else if (state.dashHighlight.type === 'month' && onclick.indexOf("'month'") !== -1) {
        card.classList.add('active');
      } else if (state.dashHighlight.type === 'submitter' && onclick.indexOf("'submitter'") !== -1) {
        card.classList.add('active');
      }
    });
  }

  var boardContent = document.getElementById('board-content');
  var ideaCards = document.querySelectorAll('.idea-card');

  if (hasHighlight) {
    boardContent.classList.add('has-dash-highlight');
    ideaCards.forEach(function(card) {
      var id = card.getAttribute('data-id');
      var idea = state.ideas[id];
      if (idea && ideaMatchesDashHighlight(idea)) {
        card.classList.add('dash-highlight');
        card.classList.remove('dash-dim');
      } else {
        card.classList.remove('dash-highlight');
        card.classList.add('dash-dim');
      }
    });
    document.querySelectorAll('.list-table tbody tr').forEach(function(row) {
      var onclick = row.getAttribute('onclick') || '';
      var m = onclick.match(/showDetail\('([^']+)'\)/);
      if (m) {
        var idea = state.ideas[m[1]];
        if (idea && ideaMatchesDashHighlight(idea)) {
          row.style.display = '';
          row.classList.add('dash-highlight');
          row.classList.remove('dash-dim');
        } else {
          row.style.display = 'none';
          row.classList.remove('dash-highlight');
          row.classList.add('dash-dim');
        }
      }
    });
    document.querySelectorAll('.kanban-column').forEach(function(col) {
      if (state.dashHighlight.type === 'status') {
        var s = col.getAttribute('data-status');
        if (s === state.dashHighlight.value) { col.classList.add('dash-highlight'); col.classList.remove('dash-dim'); }
        else { col.classList.remove('dash-highlight'); col.classList.add('dash-dim'); }
      } else { col.classList.remove('dash-highlight', 'dash-dim'); }
    });
  } else {
    boardContent.classList.remove('has-dash-highlight');
    ideaCards.forEach(function(c) { c.classList.remove('dash-highlight', 'dash-dim'); });
    document.querySelectorAll('.list-table tbody tr').forEach(function(r) { r.style.display = ''; r.classList.remove('dash-highlight', 'dash-dim'); });
    document.querySelectorAll('.kanban-column').forEach(function(c) { c.classList.remove('dash-highlight', 'dash-dim'); });
  }
}

// ============================================================
// KANBAN VIEW
// ============================================================
function renderKanbanHtml() {
  var ideas = getFilteredIdeas();
  var columns = {};
  STATUSES.forEach(function(s) { columns[s] = []; });
  ideas.forEach(function(idea) { if (columns[idea.status]) columns[idea.status].push(idea); });
  STATUSES.forEach(function(s) {
    columns[s].sort(function(a, b) {
      var oa = a.sortOrder !== undefined ? a.sortOrder : 99999;
      var ob = b.sortOrder !== undefined ? b.sortOrder : 99999;
      if (oa !== ob) return oa - ob;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  });

  var html = '<div class="kanban">';
  STATUSES.forEach(function(status) {
    var colClass = status === 'New' ? 'col-new' : status === 'In Progress' ? 'col-progress' : status === 'Review' ? 'col-review' : 'col-done';
    html += '<div class="kanban-column ' + colClass + '" data-status="' + status + '">';
    html += '<div class="kanban-column-header"><span>' + status + '</span><span class="count">' + columns[status].length + '</span></div>';
    html += '<div class="kanban-cards" data-status="' + status + '">';
    columns[status].forEach(function(idea) { html += renderCard(idea); });
    if (!columns[status].length) html += '<div class="drop-placeholder">Drop here</div>';
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

function renderCard(idea) {
  var priorityClass = 'priority-' + idea.priority.toLowerCase();
  var score = getVoteScore(idea);
  var uv = getUserVote(idea);
  var commentCount = (idea.comments && idea.comments.length) || 0;
  return '<div class="idea-card" draggable="true" data-id="' + idea.id + '">' +
    '<div class="card-title">' + escapeHtml(idea.title) + '</div>' +
    '<div class="card-meta">' +
      '<span class="card-category">' + escapeHtml(idea.category) + '</span>' +
      '<span class="card-priority ' + priorityClass + '">' + idea.priority + '</span>' +
    '</div>' +
    (idea.benefits ? '<div class="card-benefits">' + escapeHtml(idea.benefits) + '</div>' : '') +
    '<div class="card-footer">' +
      '<span>' + escapeHtml(idea.submittedBy) + '</span>' +
      '<div class="card-actions">' +
        (commentCount ? '<span class="card-comment-count" title="' + commentCount + ' comments">&#128172; ' + commentCount + '</span>' : '') +
        '<span class="vote-widget">' +
          '<button class="vote-btn up' + (uv === 1 ? ' active' : '') + '" onclick="IB.upvote(\'' + idea.id + '\',event)" title="Upvote">&#9650;</button>' +
          '<span class="vote-score' + (score > 0 ? ' positive' : '') + (score < 0 ? ' negative' : '') + '">' + score + '</span>' +
          '<button class="vote-btn down' + (uv === -1 ? ' active' : '') + '" onclick="IB.downvote(\'' + idea.id + '\',event)" title="Downvote">&#9660;</button>' +
        '</span>' +
      '</div>' +
    '</div>' +
  '</div>';
}

// ============================================================
// LIST VIEW
// ============================================================
function renderListHtml() {
  var ideas = getFilteredIdeas();
  var sortCol = state.sort.column, sortDir = state.sort.direction;
  function si(col) {
    if (sortCol !== col) return ' <span class="sort-icon">&#8597;</span>';
    return sortDir === 'asc' ? ' <span class="sort-icon active">&#9650;</span>' : ' <span class="sort-icon active">&#9660;</span>';
  }

  var selCount = state.selectedIds.length;
  var html = '';

  // Bulk action bar
  if (selCount > 0) {
    var canDeleteCount = 0;
    state.selectedIds.forEach(function(id) {
      var idea = state.ideas[id];
      if (idea && (isAdmin() || idea.submittedBy === state.currentUser.name)) canDeleteCount++;
    });

    html += '<div class="bulk-bar">';
    html += '<span class="bulk-count">' + selCount + ' selected</span>';
    html += '<select onchange="IB.bulkChangeStatus(this.value);this.selectedIndex=0"><option value="">Change Status...</option>';
    STATUSES.forEach(function(s) { html += '<option value="' + s + '">' + s + '</option>'; });
    html += '</select>';
    html += '<select onchange="IB.bulkChangePriority(this.value);this.selectedIndex=0"><option value="">Change Priority...</option>';
    ['High', 'Medium', 'Low'].forEach(function(p) { html += '<option value="' + p + '">' + p + '</option>'; });
    html += '</select>';
    html += '<select onchange="IB.bulkChangeCategory(this.value);this.selectedIndex=0"><option value="">Change Category...</option>';
    state.categories.forEach(function(c) { html += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; });
    html += '</select>';
    if (canDeleteCount > 0) {
      var delLabel = canDeleteCount === selCount ? 'Delete ' + selCount : 'Delete ' + canDeleteCount + ' of ' + selCount + ' (yours)';
      html += '<button class="btn btn-sm btn-danger" onclick="IB.bulkDelete()">' + delLabel + '</button>';
    }
    html += '<button class="btn btn-sm" onclick="IB.bulkClear()">Clear</button>';
    html += '</div>';
  }

  // Table
  var allVisibleIds = ideas.map(function(i) { return i.id; });
  var allSelected = allVisibleIds.length > 0 && allVisibleIds.every(function(id) { return state.selectedIds.indexOf(id) !== -1; });

  html += '<div class="list-view"><table class="list-table"><thead><tr>' +
    '<th class="checkbox-col" onclick="IB.bulkToggleAll(event)"><input type="checkbox" ' + (allSelected ? 'checked' : '') + ' onclick="IB.bulkToggleAll(event)"></th>' +
    '<th onclick="IB.sortBy(\'title\')">Title' + si('title') + '</th>' +
    '<th onclick="IB.sortBy(\'category\')">Category' + si('category') + '</th>' +
    '<th onclick="IB.sortBy(\'status\')">Status' + si('status') + '</th>' +
    '<th onclick="IB.sortBy(\'priority\')">Priority' + si('priority') + '</th>' +
    '<th onclick="IB.sortBy(\'votes\')">Votes' + si('votes') + '</th>' +
    '<th onclick="IB.sortBy(\'submittedBy\')">Submitted By' + si('submittedBy') + '</th>' +
    '<th onclick="IB.sortBy(\'createdAt\')">Date' + si('createdAt') + '</th>' +
    '<th>Last Change</th>' +
    '</tr></thead><tbody>';

  if (!ideas.length) {
    html += '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">No ideas yet.</td></tr>';
  }

  ideas.forEach(function(idea) {
    var sc = 'status-' + idea.status.toLowerCase().replace(' ', '-');
    var pc = 'priority-' + idea.priority.toLowerCase();
    var score = getVoteScore(idea);
    var isSelected = state.selectedIds.indexOf(idea.id) !== -1;
    var lastChange = '';
    if (idea.history && idea.history.length) {
      var last = idea.history[idea.history.length - 1];
      lastChange = '<span class="history-cell-action">' + escapeHtml(last.action) + '</span>';
      if (last.details) lastChange += '<span class="history-cell-details">' + escapeHtml(last.details) + '</span>';
      lastChange += '<span class="history-cell-meta">' + escapeHtml(last.user) + ' &middot; ' + formatDate(last.timestamp) + '</span>';
    }
    html += '<tr class="' + (isSelected ? 'row-selected' : '') + '" onclick="IB.showDetail(\'' + idea.id + '\')">' +
      '<td class="checkbox-col" onclick="event.stopPropagation()"><input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="IB.bulkToggle(\'' + idea.id + '\',event)"></td>' +
      '<td style="font-weight:600">' + escapeHtml(idea.title) + '</td>' +
      '<td>' + escapeHtml(idea.category) + '</td>' +
      '<td><span class="status-badge ' + sc + '">' + idea.status + '</span></td>' +
      '<td><span class="card-priority ' + pc + '">' + idea.priority + '</span></td>' +
      '<td class="vote-cell"><span class="vote-score' + (score > 0 ? ' positive' : '') + (score < 0 ? ' negative' : '') + '">' + score + '</span></td>' +
      '<td>' + escapeHtml(idea.submittedBy) + '</td>' +
      '<td style="white-space:nowrap">' + (idea.createdAt ? formatDate(idea.createdAt) : '') + '</td>' +
      '<td class="history-cell">' + lastChange + '</td></tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

// ============================================================
// HELPERS
// ============================================================
function updateLastUpdated() {
  var el = document.getElementById('last-updated');
  if (!el) return;
  var latest = 0;
  Object.values(state.ideas).forEach(function(idea) {
    if (idea.updatedAt && idea.updatedAt > latest) latest = idea.updatedAt;
    if (idea.createdAt && idea.createdAt > latest && !idea.updatedAt) latest = idea.createdAt;
  });
  if (latest) {
    el.textContent = 'Last updated ' + formatTimeAgo(latest);
  } else {
    el.textContent = '';
  }
}
