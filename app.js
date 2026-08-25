// Idea Board - App Logic v1.3 (Aug 24, 2026)
// v1.3: RBAC - Admin (Isaac) has full privileges, contributors can only edit/delete own ideas
(function() {
'use strict';

var firebaseConfig = {
  apiKey: "AIzaSyDhHQAxUU-Dsvh6seA5USQugR7nCHvwnSI",
  authDomain: "ideaboard-iag-2026.firebaseapp.com",
  databaseURL: "https://ideaboard-iag-2026-default-rtdb.firebaseio.com",
  projectId: "ideaboard-iag-2026",
  storageBucket: "ideaboard-iag-2026.firebasestorage.app",
  messagingSenderId: "163546732868",
  appId: "1:163546732868:web:8689079b56b21850785f11"
};

// Hardcoded admin name (case-insensitive match)
var ADMIN_NAMES = ['isaac gera'];

var state = {
  ideas: {},
  categories: ['Process Improvement', 'Technology', 'Customer Experience', 'Cost Saving', 'Team Culture', 'Other'],
  currentView: 'kanban',
  currentUser: null,
  firebaseReady: false,
  filters: { search: '', category: '', priority: '' },
  sort: { column: 'createdAt', direction: 'desc' },
  darkMode: false,
  dashHighlight: null,
  dashLocked: false,
  users: {}, // {userId: {name, role, lastSeen}} synced from Firebase
  selectedIds: [] // bulk selection in list view
};

var STATUSES = ['New', 'In Progress', 'Review', 'Done'];
var PRIORITIES = ['High', 'Medium', 'Low'];
var db = null;
var _dragState = { dragging: false, didDrag: false, draggedId: null };

// ============================================================
// INITIALIZATION
// ============================================================
function init() {
  loadUser();
  loadTheme();
  initFirebase();
  renderCategoryFilter();
  render();
  setupDragListeners();
}

function initFirebase() {
  if (firebaseConfig.apiKey === 'YOUR_API_KEY') {
    state.firebaseReady = false;
    loadFromLocalStorage();
    render();
    return;
  }
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    state.firebaseReady = true;
    db.ref('ideas').on('value', function(snap) { state.ideas = snap.val() || {}; render(); });
    db.ref('categories').on('value', function(snap) { var c = snap.val(); if (c) state.categories = c; renderCategoryFilter(); });
    var connRef = db.ref('.info/connected');
    var presRef = db.ref('presence/' + state.currentUser.id);
    connRef.on('value', function(s) { if (s.val()) { presRef.set({ name: state.currentUser.name, online: true }); presRef.onDisconnect().remove(); }});
    db.ref('presence').on('value', function(s) { var c = 0; s.forEach(function() { c++; }); document.getElementById('online-count').textContent = c + ' online'; });
    loadUsers();
    registerUser();
  } catch (e) { state.firebaseReady = false; loadFromLocalStorage(); render(); }
}

// ============================================================
// THEME (Dark/Light)
// ============================================================
function loadTheme() {
  var saved = localStorage.getItem('ib_theme');
  state.darkMode = (saved === 'dark');
  applyTheme();
}

function toggleTheme() {
  state.darkMode = !state.darkMode;
  localStorage.setItem('ib_theme', state.darkMode ? 'dark' : 'light');
  applyTheme();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
  var btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = state.darkMode ? '☀️' : '🌙';
}

// ============================================================
// USER MANAGEMENT
// ============================================================
function loadUser() {
  var saved = localStorage.getItem('ib_user');
  if (saved) { state.currentUser = JSON.parse(saved); } else { promptUser(); }
  updateUserDisplay();
}
function promptUser() {
  var name = prompt('Welcome to Idea Board! Enter your name:');
  if (!name || !name.trim()) name = 'Anonymous';
  state.currentUser = { id: generateId(), name: name.trim() };
  localStorage.setItem('ib_user', JSON.stringify(state.currentUser));
  updateUserDisplay();
}
function changeUser() {
  var name = prompt('Enter your name:', state.currentUser ? state.currentUser.name : '');
  if (name === null) return;
  if (!name.trim()) name = 'Anonymous';
  state.currentUser.name = name.trim();
  localStorage.setItem('ib_user', JSON.stringify(state.currentUser));
  updateUserDisplay();
  if (state.firebaseReady) {
    db.ref('presence/' + state.currentUser.id).update({ name: state.currentUser.name });
    registerUser();
  }
  render(); // re-render to update permission-based UI
}
function updateUserDisplay() {
  if (!state.currentUser) return;
  document.getElementById('user-display').textContent = state.currentUser.name;
  document.getElementById('user-avatar').textContent = state.currentUser.name.charAt(0).toUpperCase();
  // Show role badge
  var roleBadge = isAdmin() ? ' (Admin)' : '';
  document.getElementById('user-display').textContent = state.currentUser.name + roleBadge;
}

// ============================================================
// RBAC (Role-Based Access Control)
// ============================================================
function isAdmin() {
  if (!state.currentUser) return false;
  // Check hardcoded admin names
  if (ADMIN_NAMES.indexOf(state.currentUser.name.toLowerCase()) !== -1) return true;
  // Check promoted admins from Firebase users list
  var userRecord = state.users[state.currentUser.id];
  if (userRecord && userRecord.role === 'admin') return true;
  return false;
}

function canEdit(idea) {
  if (!idea || !state.currentUser) return false;
  if (isAdmin()) return true;
  return idea.submittedBy === state.currentUser.name;
}

function canDelete(idea) {
  return canEdit(idea); // same rules: own ideas or admin
}

function canChangeStatus(idea) {
  // Anyone can drag cards / change status (team collaboration)
  return true;
}

function registerUser() {
  if (!state.firebaseReady || !state.currentUser) return;
  var role = isAdmin() ? 'admin' : 'contributor';
  db.ref('users/' + state.currentUser.id).set({
    name: state.currentUser.name,
    role: role,
    lastSeen: Date.now()
  });
}

function loadUsers() {
  if (!state.firebaseReady) return;
  db.ref('users').on('value', function(snap) {
    state.users = snap.val() || {};
    updateUserDisplay(); // refresh in case role changed
  });
}

function promoteUser(userId) {
  if (!isAdmin()) { showToast('Only admins can promote users'); return; }
  if (state.firebaseReady) {
    db.ref('users/' + userId + '/role').set('admin');
    showToast('User promoted to admin');
  } else {
    state.users[userId].role = 'admin';
    showToast('User promoted to admin');
  }
  showManageUsers();
}

function demoteUser(userId) {
  if (!isAdmin()) { showToast('Only admins can demote users'); return; }
  if (state.firebaseReady) {
    db.ref('users/' + userId + '/role').set('contributor');
    showToast('User demoted to contributor');
  } else {
    state.users[userId].role = 'contributor';
    showToast('User demoted to contributor');
  }
  showManageUsers();
}

function showManageUsers() {
  if (!isAdmin()) { showToast('Admin access required'); return; }
  var html = '<div class="modal-header"><h2>Manage Users</h2><button class="close-btn" onclick="IB.closeModal()">&times;</button></div>';
  html += '<div class="modal-body">';
  html += '<p style="font-size:.75rem;color:var(--text-light);margin-bottom:1rem">Manage team members. Edit renames the user (and remaps their ideas). Delete removes the user (their ideas transfer to admin). Hardcoded admin (' + ADMIN_NAMES.join(', ') + ') cannot be modified.</p>';

  var userIds = Object.keys(state.users);
  if (!userIds.length) {
    html += '<p style="font-size:.82rem;color:var(--text-light)">No users registered yet. Users appear here after they access the board.</p>';
  } else {
    html += '<div style="margin-bottom:.5rem">';
    userIds.forEach(function(uid) {
      var u = state.users[uid];
      var isHardcoded = ADMIN_NAMES.indexOf((u.name || '').toLowerCase()) !== -1;
      var roleLabel = u.role === 'admin' ? '<span style="color:var(--primary);font-weight:600">Admin</span>' : '<span style="color:var(--text-light)">Contributor</span>';
      html += '<div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.4rem;padding:.4rem .7rem;border:1px solid var(--border);border-radius:6px;flex-wrap:wrap">';
      html += '<span style="flex:1;font-size:.82rem;font-weight:500;min-width:100px">' + escapeHtml(u.name || 'Unknown') + '</span>';
      html += '<span style="font-size:.72rem">' + roleLabel + '</span>';
      if (!isHardcoded) {
        if (u.role === 'admin') {
          html += '<button class="btn btn-sm" onclick="IB.demoteUser(\'' + uid + '\')">Demote</button>';
        } else {
          html += '<button class="btn btn-sm btn-primary" onclick="IB.promoteUser(\'' + uid + '\')">Promote</button>';
        }
        html += '<button class="btn btn-sm" onclick="IB.editUser(\'' + uid + '\')" title="Rename user">Edit</button>';
        html += '<button class="btn btn-sm btn-danger" onclick="IB.deleteUser(\'' + uid + '\')" title="Delete user (ideas transfer to admin)">Delete</button>';
      } else {
        html += '<span style="font-size:.65rem;color:var(--text-light)">(hardcoded)</span>';
      }
      html += '</div>';
    });
    html += '</div>';
  }
  html += '</div>';
  html += '<div class="modal-footer"><button class="btn" onclick="IB.closeModal()">Close</button></div>';
  showModal(html);
}

function editUser(userId) {
  if (!isAdmin()) { showToast('Admin access required'); return; }
  var user = state.users[userId];
  if (!user) return;
  var oldName = user.name;
  var newName = prompt('Rename user "' + oldName + '" to:', oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;
  newName = newName.trim();

  // Update user record
  if (state.firebaseReady) {
    db.ref('users/' + userId + '/name').set(newName);
  } else {
    state.users[userId].name = newName;
  }

  // Remap all ideas from old name to new name
  Object.keys(state.ideas).forEach(function(id) {
    var idea = state.ideas[id];
    var changed = false;
    if (idea.submittedBy === oldName) { idea.submittedBy = newName; changed = true; }
    if (idea.updatedBy === oldName) { idea.updatedBy = newName; changed = true; }
    // Update comments by this user
    if (idea.comments) {
      idea.comments.forEach(function(c) { if (c.user === oldName) c.user = newName; });
      changed = true;
    }
    // Update history entries
    if (idea.history) {
      idea.history.forEach(function(h) { if (h.user === oldName) h.user = newName; });
      changed = true;
    }
    if (changed) saveIdea(idea, true);
  });

  showToast('User renamed: ' + oldName + ' → ' + newName);
  if (!state.firebaseReady) render();
  showManageUsers();
}

function deleteUser(userId) {
  if (!isAdmin()) { showToast('Admin access required'); return; }
  var user = state.users[userId];
  if (!user) return;
  var userName = user.name;

  // Get admin name for reassignment
  var adminName = state.currentUser.name;

  if (!confirm('Delete user "' + userName + '"?\n\nTheir ideas will be reassigned to you (' + adminName + '). This cannot be undone.')) return;

  // Reassign all ideas from deleted user to admin
  Object.keys(state.ideas).forEach(function(id) {
    var idea = state.ideas[id];
    if (idea.submittedBy === userName) {
      idea.submittedBy = adminName;
      idea.updatedAt = Date.now();
      idea.updatedBy = adminName;
      addAuditEntry(idea, 'Reassigned', 'User ' + userName + ' deleted, idea reassigned to ' + adminName);
      saveIdea(idea, true);
    }
  });

  // Remove user record
  if (state.firebaseReady) {
    db.ref('users/' + userId).remove();
    db.ref('presence/' + userId).remove();
  } else {
    delete state.users[userId];
  }

  showToast('User "' + userName + '" deleted. Ideas reassigned to ' + adminName);
  if (!state.firebaseReady) render();
  showManageUsers();
}

// ============================================================
// DATA OPERATIONS
// ============================================================
function saveIdea(idea, skipRender) {
  if (state.firebaseReady) { db.ref('ideas/' + idea.id).set(idea); }
  else { state.ideas[idea.id] = idea; saveToLocalStorage(); if (!skipRender) render(); }
}
function deleteIdea(id) {
  if (state.firebaseReady) { db.ref('ideas/' + id).remove(); }
  else { delete state.ideas[id]; saveToLocalStorage(); render(); }
}
function saveCategories() {
  if (state.firebaseReady) { db.ref('categories').set(state.categories); } else { saveToLocalStorage(); }
  renderCategoryFilter();
}
function loadFromLocalStorage() { var d = localStorage.getItem('ib_data'); if (d) { var p = JSON.parse(d); state.ideas = p.ideas || {}; if (p.categories) state.categories = p.categories; }}
function saveToLocalStorage() { localStorage.setItem('ib_data', JSON.stringify({ ideas: state.ideas, categories: state.categories })); }

// ============================================================
// AUDIT LOG
// ============================================================
function addAuditEntry(idea, action, details) {
  if (!idea.history) idea.history = [];
  idea.history.push({ timestamp: Date.now(), user: state.currentUser.name, action: action, details: details || '' });
}
function updateStatusDates(idea, newStatus, oldStatus) {
  if (!idea.dates) idea.dates = {};
  if (!idea.dates.created) idea.dates.created = idea.createdAt || Date.now();
  if (newStatus === 'In Progress' && oldStatus !== 'In Progress') idea.dates.started = Date.now();
  if (newStatus === 'Review' && oldStatus !== 'Review') idea.dates.inReview = Date.now();
  if (newStatus === 'Done' && oldStatus !== 'Done') idea.dates.completed = Date.now();
}

// ============================================================
// VOTING
// ============================================================
function upvote(id, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  var idea = state.ideas[id]; if (!idea) return;
  if (!idea.votes) idea.votes = {};
  var uid = state.currentUser.id;
  if (idea.votes[uid] === 1) { delete idea.votes[uid]; } // toggle off
  else { idea.votes[uid] = 1; } // upvote (clears any downvote)
  saveIdea(idea);
}
function downvote(id, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  var idea = state.ideas[id]; if (!idea) return;
  if (!idea.votes) idea.votes = {};
  var uid = state.currentUser.id;
  if (idea.votes[uid] === -1) { delete idea.votes[uid]; } // toggle off
  else { idea.votes[uid] = -1; } // downvote
  saveIdea(idea);
}
function getVoteScore(idea) {
  if (!idea.votes) return 0;
  var score = 0;
  Object.keys(idea.votes).forEach(function(k) { score += idea.votes[k]; });
  return score;
}
function getUserVote(idea) {
  if (!idea.votes || !state.currentUser) return 0;
  return idea.votes[state.currentUser.id] || 0;
}

// ============================================================
// COMMENTS
// ============================================================
function addComment(id) {
  var input = document.getElementById('comment-input');
  var text = input.value.trim();
  if (!text) return;
  var idea = state.ideas[id]; if (!idea) return;
  if (!idea.comments) idea.comments = [];
  idea.comments.push({ id: generateId(), user: state.currentUser.name, text: text, timestamp: Date.now() });
  idea.updatedAt = Date.now();
  idea.updatedBy = state.currentUser.name;
  addAuditEntry(idea, 'Comment added', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
  saveIdea(idea, true);
  // Re-render the detail view
  showDetail(id);
}
function deleteComment(ideaId, commentId) {
  var idea = state.ideas[ideaId]; if (!idea || !idea.comments) return;
  idea.comments = idea.comments.filter(function(c) { return c.id !== commentId; });
  saveIdea(idea, true);
  showDetail(ideaId);
}

// ============================================================
// FILTERING & SORTING
// ============================================================
function filterIdeas() {
  state.filters.search = document.getElementById('search-input').value.toLowerCase();
  state.filters.category = document.getElementById('filter-category').value;
  state.filters.priority = document.getElementById('filter-priority').value;
  render();
}
function getFilteredIdeas() {
  var ideas = [];
  Object.keys(state.ideas).forEach(function(id) {
    var idea = state.ideas[id];
    if (state.filters.search) {
      var s = state.filters.search;
      if ((idea.title||'').toLowerCase().indexOf(s)===-1 && (idea.description||'').toLowerCase().indexOf(s)===-1 && (idea.benefits||'').toLowerCase().indexOf(s)===-1 && (idea.submittedBy||'').toLowerCase().indexOf(s)===-1) return;
    }
    if (state.filters.category && idea.category !== state.filters.category) return;
    if (state.filters.priority && idea.priority !== state.filters.priority) return;
    ideas.push(idea);
  });
  var col = state.sort.column, dir = state.sort.direction === 'asc' ? 1 : -1;
  var po = { 'High': 0, 'Medium': 1, 'Low': 2 }, so = { 'New': 0, 'In Progress': 1, 'Review': 2, 'Done': 3 };
  ideas.sort(function(a, b) {
    var va, vb;
    if (col==='priority') { va=po[a.priority]!==undefined?po[a.priority]:9; vb=po[b.priority]!==undefined?po[b.priority]:9; }
    else if (col==='status') { va=so[a.status]!==undefined?so[a.status]:9; vb=so[b.status]!==undefined?so[b.status]:9; }
    else if (col==='createdAt') { va=a.createdAt||0; vb=b.createdAt||0; }
    else if (col==='votes') { va=getVoteScore(a); vb=getVoteScore(b); }
    else { va=(a[col]||'').toLowerCase(); vb=(b[col]||'').toLowerCase(); }
    if (va < vb) return -1*dir; if (va > vb) return 1*dir; return 0;
  });
  return ideas;
}
function sortBy(column) {
  if (state.sort.column === column) { state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc'; }
  else { state.sort.column = column; state.sort.direction = (column === 'createdAt' || column === 'votes') ? 'desc' : 'asc'; }
  render();
}

// ============================================================
// DASHBOARD STATS
// ============================================================
function renderDashboard() {
  var allIdeas = Object.values(state.ideas);
  var total = allIdeas.length;
  if (!total) return '';

  var byStat = {}; STATUSES.forEach(function(s) { byStat[s] = 0; });
  var bySubmitter = {};
  var thisMonth = 0;
  var now = new Date(), monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  allIdeas.forEach(function(idea) {
    if (byStat[idea.status] !== undefined) byStat[idea.status]++;
    bySubmitter[idea.submittedBy] = (bySubmitter[idea.submittedBy] || 0) + 1;
    if (idea.createdAt >= monthStart) thisMonth++;
  });

  var topContrib = ''; var topCount = 0;
  Object.keys(bySubmitter).forEach(function(name) { if (bySubmitter[name] > topCount) { topCount = bySubmitter[name]; topContrib = name; }});

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

function dashFilter(type, value) {
  if (state.dashHighlight && state.dashHighlight.type === type && state.dashHighlight.value === value) {
    state.dashHighlight = null;
  } else if (type === 'all') {
    state.dashHighlight = null;
  } else {
    state.dashHighlight = { type: type, value: value || null };
  }
  state.dashLocked = !!state.dashHighlight; // lock on click
  applyDashHighlight();
}

function dashHover(type, value) {
  if (state.dashLocked) return; // don't override a clicked filter
  if (type === 'all') {
    state.dashHighlight = null;
  } else {
    state.dashHighlight = { type: type, value: value || null };
  }
  applyDashHighlight();
}

function dashHoverEnd() {
  if (state.dashLocked) return; // keep the clicked filter
  state.dashHighlight = null;
  applyDashHighlight();
}

function dashClearOnOutsideClick(e) {
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

  // Highlight the active stat card
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

  // Apply dim/highlight to kanban cards
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
    // List view: HIDE non-matching rows (filter, not dim)
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
    // Dim non-matching kanban columns for status filter
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
// RENDERING
// ============================================================
function render() {
  // Render dashboard into its own container (above toolbar)
  var dashContainer = document.getElementById('dashboard-container');
  if (dashContainer) dashContainer.innerHTML = renderDashboard();

  var contentHtml = '';
  if (state.currentView === 'kanban') { contentHtml = renderKanbanHtml(); }
  else { contentHtml = renderListHtml(); }
  document.getElementById('board-content').innerHTML = contentHtml;

  // Update last-modified timestamp
  updateLastUpdated();

  // Show/hide admin-only UI
  var manageBtn = document.getElementById('btn-manage-data');
  if (manageBtn) manageBtn.style.display = isAdmin() ? '' : 'none';
}

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

function formatTimeAgo(ts) {
  var diff = Date.now() - ts;
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  var days = Math.floor(hrs / 24);
  if (days < 7) return days + 'd ago';
  return formatDate(ts);
}

function renderKanbanHtml() {
  var ideas = getFilteredIdeas();
  var columns = {}; STATUSES.forEach(function(s) { columns[s] = []; });
  ideas.forEach(function(idea) { if (columns[idea.status]) columns[idea.status].push(idea); });
  STATUSES.forEach(function(s) {
    columns[s].sort(function(a, b) {
      var oa = a.sortOrder !== undefined ? a.sortOrder : 99999;
      var ob = b.sortOrder !== undefined ? b.sortOrder : 99999;
      if (oa !== ob) return oa - ob;
      return (b.createdAt||0) - (a.createdAt||0);
    });
  });

  var html = '<div class="kanban">';
  STATUSES.forEach(function(status) {
    var colClass = status==='New'?'col-new':status==='In Progress'?'col-progress':status==='Review'?'col-review':'col-done';
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
          '<button class="vote-btn up' + (uv===1?' active':'') + '" onclick="IB.upvote(\'' + idea.id + '\',event)" title="Upvote">&#9650;</button>' +
          '<span class="vote-score' + (score>0?' positive':'') + (score<0?' negative':'') + '">' + score + '</span>' +
          '<button class="vote-btn down' + (uv===-1?' active':'') + '" onclick="IB.downvote(\'' + idea.id + '\',event)" title="Downvote">&#9660;</button>' +
        '</span>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderListHtml() {
  var ideas = getFilteredIdeas();
  var sortCol = state.sort.column, sortDir = state.sort.direction;
  function si(col) { if (sortCol!==col) return ' <span class="sort-icon">&#8597;</span>'; return sortDir==='asc'?' <span class="sort-icon active">&#9650;</span>':' <span class="sort-icon active">&#9660;</span>'; }

  var selCount = state.selectedIds.length;
  var html = '';

  // Bulk action bar (shown when items selected)
  if (selCount > 0) {
    var canDeleteCount = 0;
    state.selectedIds.forEach(function(id) {
      var idea = state.ideas[id];
      if (idea && canDelete(idea)) canDeleteCount++;
    });

    html += '<div class="bulk-bar">';
    html += '<span class="bulk-count">' + selCount + ' selected</span>';
    html += '<select onchange="IB.bulkChangeStatus(this.value);this.selectedIndex=0"><option value="">Change Status...</option>';
    STATUSES.forEach(function(s) { html += '<option value="' + s + '">' + s + '</option>'; });
    html += '</select>';
    html += '<select onchange="IB.bulkChangePriority(this.value);this.selectedIndex=0"><option value="">Change Priority...</option>';
    PRIORITIES.forEach(function(p) { html += '<option value="' + p + '">' + p + '</option>'; });
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
    '<th onclick="IB.sortBy(\'title\')">Title'+si('title')+'</th>' +
    '<th onclick="IB.sortBy(\'category\')">Category'+si('category')+'</th>' +
    '<th onclick="IB.sortBy(\'status\')">Status'+si('status')+'</th>' +
    '<th onclick="IB.sortBy(\'priority\')">Priority'+si('priority')+'</th>' +
    '<th onclick="IB.sortBy(\'votes\')">Votes'+si('votes')+'</th>' +
    '<th onclick="IB.sortBy(\'submittedBy\')">Submitted By'+si('submittedBy')+'</th>' +
    '<th onclick="IB.sortBy(\'createdAt\')">Date'+si('createdAt')+'</th>' +
    '<th>Last Change</th>' +
    '</tr></thead><tbody>';

  if (!ideas.length) { html += '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-light)">No ideas yet.</td></tr>'; }

  ideas.forEach(function(idea) {
    var sc = 'status-'+idea.status.toLowerCase().replace(' ','-');
    var pc = 'priority-'+idea.priority.toLowerCase();
    var score = getVoteScore(idea);
    var isSelected = state.selectedIds.indexOf(idea.id) !== -1;
    var lastChange = '';
    if (idea.history && idea.history.length) {
      var last = idea.history[idea.history.length-1];
      lastChange = '<span class="history-cell-action">'+escapeHtml(last.action)+'</span>';
      if (last.details) lastChange += '<span class="history-cell-details">'+escapeHtml(last.details)+'</span>';
      lastChange += '<span class="history-cell-meta">'+escapeHtml(last.user)+' &middot; '+formatDate(last.timestamp)+'</span>';
    }
    html += '<tr class="' + (isSelected ? 'row-selected' : '') + '" onclick="IB.showDetail(\''+idea.id+'\')">' +
      '<td class="checkbox-col" onclick="event.stopPropagation()"><input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="IB.bulkToggle(\''+idea.id+'\',event)"></td>' +
      '<td style="font-weight:600">'+escapeHtml(idea.title)+'</td>' +
      '<td>'+escapeHtml(idea.category)+'</td>' +
      '<td><span class="status-badge '+sc+'">'+idea.status+'</span></td>' +
      '<td><span class="card-priority '+pc+'">'+idea.priority+'</span></td>' +
      '<td class="vote-cell"><span class="vote-score'+(score>0?' positive':'')+(score<0?' negative':'')+'">'+score+'</span></td>' +
      '<td>'+escapeHtml(idea.submittedBy)+'</td>' +
      '<td style="white-space:nowrap">'+(idea.createdAt?formatDate(idea.createdAt):'')+'</td>' +
      '<td class="history-cell">'+lastChange+'</td></tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

function renderCategoryFilter() {
  var select = document.getElementById('filter-category');
  var cur = select.value;
  select.innerHTML = '<option value="">All Categories</option>';
  state.categories.forEach(function(cat) { select.innerHTML += '<option value="'+escapeHtml(cat)+'"'+(cur===cat?' selected':'')+'>'+escapeHtml(cat)+'</option>'; });
}

// ============================================================
// VIEW SWITCHING
// ============================================================
function setView(view) {
  state.currentView = view;
  document.getElementById('view-kanban').classList.toggle('active', view==='kanban');
  document.getElementById('view-list').classList.toggle('active', view==='list');
  render();
}

// ============================================================
// DRAG AND DROP
// ============================================================
function setupDragListeners() {
  var bc = document.getElementById('board-content');
  bc.addEventListener('dragstart', function(e) {
    var card = e.target.closest('.idea-card'); if (!card) return;
    _dragState.dragging=true; _dragState.didDrag=false;
    _dragState.draggedId = card.getAttribute('data-id');
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed='move';
    e.dataTransfer.setData('text/plain', _dragState.draggedId);
    try { e.dataTransfer.setDragImage(card,50,20); } catch(err){}
  });
  bc.addEventListener('drag', function() { _dragState.didDrag=true; });
  bc.addEventListener('dragend', function(e) {
    var card = e.target.closest('.idea-card'); if (card) card.classList.remove('dragging');
    _dragState.dragging=false;
    document.querySelectorAll('.kanban-column').forEach(function(c){c.classList.remove('drag-over');});
    document.querySelectorAll('.idea-card').forEach(function(c){c.classList.remove('drop-above','drop-below');});
    setTimeout(function(){_dragState.didDrag=false;},50);
  });
  bc.addEventListener('dragover', function(e) {
    var col = e.target.closest('.kanban-column'); if (!col) return;
    e.preventDefault(); e.dataTransfer.dropEffect='move';
    var card = e.target.closest('.idea-card');
    col.querySelectorAll('.idea-card').forEach(function(c){c.classList.remove('drop-above','drop-below');});
    if (card && card.getAttribute('data-id')!==_dragState.draggedId) {
      var r=card.getBoundingClientRect();
      if (e.clientY < r.top+r.height/2) card.classList.add('drop-above'); else card.classList.add('drop-below');
    }
  });
  bc.addEventListener('dragenter', function(e) { e.preventDefault(); var c=e.target.closest('.kanban-column'); if(c)c.classList.add('drag-over'); });
  bc.addEventListener('dragleave', function(e) { var c=e.target.closest('.kanban-column'); if(c&&!c.contains(e.relatedTarget)){c.classList.remove('drag-over');c.querySelectorAll('.idea-card').forEach(function(x){x.classList.remove('drop-above','drop-below');});}});
  bc.addEventListener('drop', function(e) {
    e.preventDefault(); e.stopPropagation();
    var col=e.target.closest('.kanban-column'); if(!col)return;
    col.classList.remove('drag-over');
    var id=e.dataTransfer.getData('text/plain')||_dragState.draggedId; if(!id)return;
    var newStatus=col.getAttribute('data-status');
    var idea=state.ideas[id]; if(!idea)return;
    var oldStatus=idea.status, statusChanged=(oldStatus!==newStatus);
    var targetCard=e.target.closest('.idea-card'), dropBefore=null;
    if(targetCard&&targetCard.getAttribute('data-id')!==id){
      var r=targetCard.getBoundingClientRect();
      if(e.clientY<r.top+r.height/2){dropBefore=targetCard.getAttribute('data-id');}
      else{var nx=targetCard.nextElementSibling;if(nx&&nx.classList.contains('idea-card'))dropBefore=nx.getAttribute('data-id');}
    }
    var colIdeas=[]; Object.keys(state.ideas).forEach(function(iid){var i=state.ideas[iid];if(iid===id)return;if(i.status===newStatus)colIdeas.push(i);});
    colIdeas.sort(function(a,b){var oa=a.sortOrder!==undefined?a.sortOrder:99999;var ob=b.sortOrder!==undefined?b.sortOrder:99999;if(oa!==ob)return oa-ob;return(b.createdAt||0)-(a.createdAt||0);});
    var insertIdx=colIdeas.length;
    if(dropBefore){for(var i=0;i<colIdeas.length;i++){if(colIdeas[i].id===dropBefore){insertIdx=i;break;}}}
    colIdeas.splice(insertIdx,0,idea);
    colIdeas.forEach(function(item,idx){item.sortOrder=(idx+1)*10;});
    if(statusChanged){updateStatusDates(idea,newStatus,oldStatus);addAuditEntry(idea,'Status changed',oldStatus+' \u2192 '+newStatus);idea.status=newStatus;idea.updatedAt=Date.now();idea.updatedBy=state.currentUser.name;}
    colIdeas.forEach(function(item){saveIdea(item,true);});
    document.querySelectorAll('.idea-card').forEach(function(c){c.classList.remove('drop-above','drop-below');});
    if(statusChanged)showToast('Moved to '+newStatus);
    _dragState.didDrag=true;
    if(!state.firebaseReady)render();
  });
  bc.addEventListener('click', function(e) {
    if(_dragState.didDrag)return;
    // Don't handle clicks on vote buttons
    if(e.target.closest('.vote-btn'))return;
    var card=e.target.closest('.idea-card');
    if(card){var id=card.getAttribute('data-id');if(id)showDetail(id);}
  });
}

// ============================================================
// ADD/EDIT IDEA
// ============================================================
function showAddIdea(){showIdeaForm(null);}
function showEditIdea(id){var idea=state.ideas[id];if(!idea)return;if(!canEdit(idea)){showToast('You can only edit your own ideas');return;}showIdeaForm(idea);}

function showIdeaForm(idea) {
  var isEdit=!!idea, title=isEdit?'Edit Idea':'New Idea';
  var catOpts=state.categories.map(function(c){return '<option value="'+escapeHtml(c)+'"'+(idea&&idea.category===c?' selected':'')+'>'+escapeHtml(c)+'</option>';}).join('');
  var statOpts=STATUSES.map(function(s){return '<option value="'+s+'"'+(idea&&idea.status===s?' selected':'')+'>'+s+'</option>';}).join('');
  var prioOpts=PRIORITIES.map(function(p){return '<option value="'+p+'"'+(idea&&idea.priority===p?' selected':'')+'>'+p+'</option>';}).join('');
  var html='<div class="modal-header"><h2>'+title+'</h2><button class="close-btn" onclick="IB.closeModal()">&times;</button></div>';
  html+='<div class="modal-body">';
  html+='<div class="form-group"><label>Title *</label><input type="text" id="f-title" value="'+(idea?escapeAttr(idea.title):'')+'" placeholder="What\'s the idea?"></div>';
  html+='<div class="form-group"><label>Description</label><textarea id="f-desc" placeholder="Describe the idea in detail...">'+(idea?escapeHtml(idea.description):'')+'</textarea></div>';
  html+='<div class="form-group"><label>Benefits</label><textarea id="f-benefits" placeholder="What benefits does this bring?">'+(idea?escapeHtml(idea.benefits):'')+'</textarea></div>';
  html+='<div class="form-row"><div class="form-group"><label>Category</label><select id="f-category">'+catOpts+'</select></div><div class="form-group"><label>Priority</label><select id="f-priority">'+prioOpts+'</select></div></div>';
  html+='<div class="form-row"><div class="form-group"><label>Status</label><select id="f-status">'+statOpts+'</select></div><div class="form-group"><label>Submitted By</label><input type="text" id="f-submitter" value="'+(idea?escapeAttr(idea.submittedBy):escapeAttr(state.currentUser.name))+'"></div></div>';
  html+='</div><div class="modal-footer">';
  if(isEdit)html+='<button class="btn btn-danger" onclick="IB.confirmDelete(\''+idea.id+'\')">Delete</button>';
  html+='<button class="btn" onclick="IB.closeModal()">Cancel</button><button class="btn btn-primary" onclick="IB.submitIdea(\''+(idea?idea.id:'')+'\')">'+(isEdit?'Update':'Add Idea')+'</button></div>';
  showModal(html);
  setTimeout(function(){document.getElementById('f-title').focus();},100);
}

function submitIdea(existingId) {
  var title=document.getElementById('f-title').value.trim();
  if(!title){showToast('Title is required');return;}
  var newStatus=document.getElementById('f-status').value;
  var existing=existingId?state.ideas[existingId]:null;
  var oldStatus=existing?existing.status:null;
  var idea={id:existingId||generateId(),title:title,description:document.getElementById('f-desc').value.trim(),benefits:document.getElementById('f-benefits').value.trim(),category:document.getElementById('f-category').value,priority:document.getElementById('f-priority').value,status:newStatus,submittedBy:document.getElementById('f-submitter').value.trim()||state.currentUser.name,createdAt:existing?existing.createdAt:Date.now(),updatedAt:Date.now(),updatedBy:state.currentUser.name,comments:existing?(existing.comments||[]):[],history:existing?(existing.history||[]):[],dates:existing?(existing.dates||{}):{},votes:existing?(existing.votes||{}):{}};
  if(!existingId){
    idea.dates.created=Date.now();addAuditEntry(idea,'Created','Idea submitted by '+idea.submittedBy);
    if(newStatus!=='New'){updateStatusDates(idea,newStatus,'New');addAuditEntry(idea,'Status changed','New \u2192 '+newStatus);}
  } else {
    var changes=[];
    if(existing.title!==idea.title)changes.push('Title');
    if(existing.description!==idea.description)changes.push('Description');
    if(existing.benefits!==idea.benefits)changes.push('Benefits');
    if(existing.category!==idea.category)changes.push('Category: '+existing.category+' \u2192 '+idea.category);
    if(existing.priority!==idea.priority)changes.push('Priority: '+existing.priority+' \u2192 '+idea.priority);
    if(oldStatus!==newStatus){updateStatusDates(idea,newStatus,oldStatus);addAuditEntry(idea,'Status changed',oldStatus+' \u2192 '+newStatus);}
    if(changes.length)addAuditEntry(idea,'Edited',changes.join(', '));
  }
  saveIdea(idea);closeModal();showToast(existingId?'Idea updated':'Idea added');
}

// ============================================================
// DETAIL VIEW
// ============================================================
function showDetail(id) {
  var idea=state.ideas[id];if(!idea)return;
  var sc='status-'+idea.status.toLowerCase().replace(' ','-');
  var pc='priority-'+idea.priority.toLowerCase();
  var score=getVoteScore(idea), uv=getUserVote(idea);

  var html='<div class="modal-header"><h2>'+escapeHtml(idea.title)+'</h2><button class="close-btn" onclick="IB.closeModal()">&times;</button></div>';
  html+='<div class="modal-body">';
  html+='<div class="detail-meta"><div class="detail-meta-item"><span class="status-badge '+sc+'">'+idea.status+'</span></div><div class="detail-meta-item"><span class="card-priority '+pc+'">'+idea.priority+'</span></div><div class="detail-meta-item"><span class="card-category">'+escapeHtml(idea.category)+'</span></div>';
  // Votes in detail
  html+='<div class="detail-meta-item"><span class="detail-vote-widget"><button class="vote-btn up'+(uv===1?' active':'')+'" onclick="IB.upvote(\''+idea.id+'\');IB.showDetail(\''+idea.id+'\')">&#9650;</button><span class="vote-score'+(score>0?' positive':'')+(score<0?' negative':'')+'">'+score+'</span><button class="vote-btn down'+(uv===-1?' active':'')+'" onclick="IB.downvote(\''+idea.id+'\');IB.showDetail(\''+idea.id+'\')">&#9660;</button></span></div>';
  html+='</div>';

  if(idea.description)html+='<div class="detail-section"><h4>Description</h4><p>'+escapeHtml(idea.description).replace(/\n/g,'<br>')+'</p></div>';
  if(idea.benefits)html+='<div class="detail-section"><h4>Benefits</h4><p>'+escapeHtml(idea.benefits).replace(/\n/g,'<br>')+'</p></div>';

  // Timeline
  html+='<div class="detail-section"><h4>Timeline</h4><div class="timeline">';
  var dates=idea.dates||{};
  [{key:'created',label:'Created',icon:'&#9679;'},{key:'started',label:'Started',icon:'&#9654;'},{key:'inReview',label:'In Review',icon:'&#9733;'},{key:'completed',label:'Completed',icon:'&#10003;'}].forEach(function(m){
    var active=dates[m.key]?' active':'';
    html+='<div class="timeline-item'+active+'"><span class="timeline-icon">'+m.icon+'</span><span class="timeline-label">'+m.label+'</span><span class="timeline-date">'+(dates[m.key]?formatDateTime(dates[m.key]):'-')+'</span></div>';
  });
  html+='</div></div>';

  // Details
  html+='<div class="detail-section"><h4>Details</h4><p style="font-size:.82rem"><strong>Submitted by:</strong> '+escapeHtml(idea.submittedBy)+'<br><strong>Last updated:</strong> '+(idea.updatedAt?formatDateTime(idea.updatedAt):'Unknown')+(idea.updatedBy?' by '+escapeHtml(idea.updatedBy):'')+'</p></div>';

  // Version History
  var history=idea.history||[];
  html+='<div class="detail-section"><h4>Version History</h4>';
  if(history.length){html+='<div class="audit-log">';history.slice().reverse().forEach(function(e){html+='<div class="audit-entry"><span class="audit-time">'+formatDateTime(e.timestamp)+'</span><span class="audit-user">'+escapeHtml(e.user)+'</span><span class="audit-action">'+escapeHtml(e.action)+'</span>'+(e.details?'<span class="audit-details">'+escapeHtml(e.details)+'</span>':'')+'</div>';});html+='</div>';}
  else{html+='<p style="font-size:.78rem;color:var(--text-light);font-style:italic">No history yet.</p>';}
  html+='</div>';

  // Comments Thread
  var comments=idea.comments||[];
  html+='<div class="comments-section"><h4>Comments ('+comments.length+')</h4>';
  if(comments.length){
    html+='<div class="comments-list">';
    comments.forEach(function(c){
      html+='<div class="comment-item"><div class="comment-header"><span class="comment-user">'+escapeHtml(c.user)+'</span><span class="comment-time">'+formatDateTime(c.timestamp)+'</span>';
      if(c.user===state.currentUser.name)html+='<button class="btn btn-sm btn-danger" onclick="IB.deleteComment(\''+idea.id+'\',\''+c.id+'\')">x</button>';
      html+='</div><div class="comment-text">'+escapeHtml(c.text).replace(/\n/g,'<br>')+'</div></div>';
    });
    html+='</div>';
  }
  html+='<div class="comment-form"><textarea id="comment-input" placeholder="Add a comment..." rows="2"></textarea><button class="btn btn-primary btn-sm" onclick="IB.addComment(\''+idea.id+'\')">Post</button></div>';
  html+='</div>';

  html+='</div><div class="modal-footer">';
  if(canDelete(idea)) html+='<button class="btn btn-danger" onclick="IB.confirmDelete(\''+idea.id+'\')">Delete</button>';
  html+='<button class="btn" onclick="IB.closeModal()">Close</button>';
  if(canEdit(idea)) html+='<button class="btn btn-primary" onclick="IB.showEditIdea(\''+idea.id+'\')">Edit</button>';
  html+='</div>';
  showModal(html);
}

// ============================================================
// DELETE / CATEGORIES / EXPORT / IMPORT
// ============================================================
function confirmDelete(id){var idea=state.ideas[id];if(!idea)return;if(!canDelete(idea)){showToast('You can only delete your own ideas');return;}if(confirm('Delete "'+idea.title+'"?')){deleteIdea(id);closeModal();showToast('Idea deleted');}}
function showCategoryManager(){var html='<div class="modal-header"><h2>Manage Categories</h2><button class="close-btn" onclick="IB.closeModal()">&times;</button></div><div class="modal-body"><div style="margin-bottom:1rem">';state.categories.forEach(function(cat,i){html+='<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem;padding:.4rem .6rem;border:1px solid var(--border);border-radius:6px"><span style="flex:1;font-size:.85rem">'+escapeHtml(cat)+'</span><button class="btn btn-sm btn-danger" onclick="IB.removeCategory('+i+')">Remove</button></div>';});html+='</div><div style="display:flex;gap:.4rem"><input type="text" id="new-category" placeholder="New category name" style="flex:1;padding:.4rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.85rem"><button class="btn btn-primary btn-sm" onclick="IB.addCategory()">Add</button></div></div><div class="modal-footer"><button class="btn" onclick="IB.closeModal()">Close</button></div>';showModal(html);}
function addCategory(){var inp=document.getElementById('new-category');var n=inp.value.trim();if(!n)return;if(state.categories.indexOf(n)!==-1){showToast('Already exists');return;}state.categories.push(n);saveCategories();showManageData();showToast('Category added');}
function removeCategory(i){if(confirm('Remove "'+state.categories[i]+'"?')){state.categories.splice(i,1);saveCategories();showManageData();showToast('Removed');}}

function showManageData() {
  if (!isAdmin()) { showToast('Admin access required'); return; }
  var html = '<div class="modal-header"><h2>Manage Data</h2><button class="close-btn" onclick="IB.closeModal()">&times;</button></div>';
  html += '<div class="modal-body">';

  // Export/Import section
  html += '<div class="detail-section"><h4>Export &amp; Import</h4>';
  html += '<div style="display:flex;gap:.5rem;margin-bottom:.8rem;flex-wrap:wrap">';
  html += '<button class="btn btn-primary btn-sm" onclick="IB.exportData();IB.closeModal()">Export as JSON</button>';
  html += '<button class="btn btn-sm" onclick="IB.importData()">Import from JSON</button>';
  html += '</div>';
  html += '<p style="font-size:.72rem;color:var(--text-light)">Export downloads a JSON file and copies a text summary to clipboard. Import merges ideas from a JSON file.</p>';
  html += '</div>';

  // Categories section
  html += '<div class="detail-section"><h4>Categories</h4>';
  html += '<div style="margin-bottom:.6rem">';
  state.categories.forEach(function(cat, i) {
    html += '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem;padding:.35rem .6rem;border:1px solid var(--border);border-radius:6px">';
    html += '<span style="flex:1;font-size:.82rem">' + escapeHtml(cat) + '</span>';
    html += '<button class="btn btn-sm btn-danger" onclick="IB.removeCategory(' + i + ')">x</button>';
    html += '</div>';
  });
  html += '</div>';
  html += '<div style="display:flex;gap:.4rem"><input type="text" id="new-category" placeholder="New category name" style="flex:1;padding:.4rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--surface);color:var(--text)"><button class="btn btn-primary btn-sm" onclick="IB.addCategory()">Add</button></div>';
  html += '</div>';

  // Data stats
  var total = Object.keys(state.ideas).length;
  html += '<div class="detail-section"><h4>Data Summary</h4>';
  html += '<p style="font-size:.8rem">' + total + ' ideas stored ' + (state.firebaseReady ? '(synced via Firebase)' : '(local storage only)') + '</p>';
  html += '</div>';

  // Admin: Manage Users button
  if (isAdmin()) {
    html += '<div class="detail-section"><h4>Administration</h4>';
    html += '<button class="btn btn-sm" onclick="IB.showManageUsers()">Manage Users &amp; Roles</button>';
    html += '</div>';
  }

  html += '</div>';
  html += '<div class="modal-footer"><button class="btn" onclick="IB.closeModal()">Close</button></div>';
  showModal(html);
}

function exportData(){var ideas=getFilteredIdeas();var text='IDEA BOARD EXPORT - '+new Date().toLocaleDateString()+'\n'+'='.repeat(50)+'\n\n';ideas.forEach(function(idea,i){text+=(i+1)+'. '+idea.title+'\n   Status: '+idea.status+' | Priority: '+idea.priority+' | Category: '+idea.category+' | Votes: '+getVoteScore(idea)+'\n   Submitted by: '+idea.submittedBy+' ('+(idea.createdAt?formatDate(idea.createdAt):'')+')'+'\n';if(idea.description)text+='   Description: '+idea.description+'\n';if(idea.benefits)text+='   Benefits: '+idea.benefits+'\n';text+='\n';});text+='---\nTotal: '+ideas.length+' ideas\n';var json=JSON.stringify(ideas,null,2);var blob=new Blob([json],{type:'application/json'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='idea-board-export-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url);if(navigator.clipboard){navigator.clipboard.writeText(text).then(function(){showToast('Exported + copied');});}else{showToast('JSON downloaded');}}

function importData(){document.getElementById('import-file').click();}
function handleImport(input){var file=input.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(e){try{var data=JSON.parse(e.target.result);var ideas=[];if(Array.isArray(data))ideas=data;else if(data.ideas){ideas=Array.isArray(data.ideas)?data.ideas:Object.values(data.ideas);if(data.categories&&Array.isArray(data.categories)){state.categories=data.categories;saveCategories();}}if(!ideas.length){showToast('No ideas found');input.value='';return;}if(!confirm('Found '+ideas.length+' ideas. Merge?')){input.value='';return;}var imp=0;ideas.forEach(function(idea){if(!idea.title)return;if(!idea.id)idea.id=generateId();if(!idea.status)idea.status='New';if(!idea.priority)idea.priority='Medium';if(!idea.category)idea.category=state.categories[0]||'Other';if(!idea.submittedBy)idea.submittedBy=state.currentUser.name;if(!idea.createdAt)idea.createdAt=Date.now();if(!idea.updatedAt)idea.updatedAt=Date.now();if(!idea.description)idea.description='';if(!idea.benefits)idea.benefits='';if(!idea.comments)idea.comments=[];if(!idea.history)idea.history=[];if(!idea.votes)idea.votes={};if(!idea.dates){idea.dates={created:idea.createdAt};if(idea.status==='In Progress'||idea.status==='Review'||idea.status==='Done')idea.dates.started=idea.createdAt;if(idea.status==='Review'||idea.status==='Done')idea.dates.inReview=idea.updatedAt||idea.createdAt;if(idea.status==='Done')idea.dates.completed=idea.updatedAt||idea.createdAt;}saveIdea(idea,true);imp++;});showToast('Imported '+imp+' ideas');if(!state.firebaseReady)render();}catch(err){showToast('Error: Invalid JSON');console.error(err);}input.value='';};reader.readAsText(file);}

// ============================================================
// BULK ACTIONS (List View)
// ============================================================
function bulkToggle(id, e) {
  if (e) e.stopPropagation();
  var idx = state.selectedIds.indexOf(id);
  if (idx !== -1) { state.selectedIds.splice(idx, 1); }
  else { state.selectedIds.push(id); }
  render();
}

function bulkToggleAll(e) {
  if (e) e.stopPropagation();
  var ideas = getFilteredIdeas();
  var allVisibleIds = ideas.map(function(i) { return i.id; });
  var allSelected = allVisibleIds.every(function(id) { return state.selectedIds.indexOf(id) !== -1; });
  if (allSelected) {
    state.selectedIds = [];
  } else {
    state.selectedIds = allVisibleIds.slice();
  }
  render();
}

function bulkClear() {
  state.selectedIds = [];
  render();
}

function bulkChangeStatus(newStatus) {
  if (!newStatus || !state.selectedIds.length) return;
  var count = 0;
  state.selectedIds.forEach(function(id) {
    var idea = state.ideas[id];
    if (!idea) return;
    if (!canEdit(idea) && !canChangeStatus(idea)) return;
    var oldStatus = idea.status;
    if (oldStatus === newStatus) return;
    updateStatusDates(idea, newStatus, oldStatus);
    addAuditEntry(idea, 'Status changed', oldStatus + ' \u2192 ' + newStatus + ' (bulk)');
    idea.status = newStatus;
    idea.updatedAt = Date.now();
    idea.updatedBy = state.currentUser.name;
    saveIdea(idea, true);
    count++;
  });
  state.selectedIds = [];
  showToast(count + ' ideas moved to ' + newStatus);
  if (!state.firebaseReady) render();
}

function bulkChangePriority(newPriority) {
  if (!newPriority || !state.selectedIds.length) return;
  var count = 0;
  state.selectedIds.forEach(function(id) {
    var idea = state.ideas[id];
    if (!idea || !canEdit(idea)) return;
    if (idea.priority === newPriority) return;
    addAuditEntry(idea, 'Priority changed', idea.priority + ' \u2192 ' + newPriority + ' (bulk)');
    idea.priority = newPriority;
    idea.updatedAt = Date.now();
    idea.updatedBy = state.currentUser.name;
    saveIdea(idea, true);
    count++;
  });
  state.selectedIds = [];
  showToast(count + ' ideas set to ' + newPriority + ' priority');
  if (!state.firebaseReady) render();
}

function bulkChangeCategory(newCategory) {
  if (!newCategory || !state.selectedIds.length) return;
  var count = 0;
  state.selectedIds.forEach(function(id) {
    var idea = state.ideas[id];
    if (!idea || !canEdit(idea)) return;
    if (idea.category === newCategory) return;
    addAuditEntry(idea, 'Category changed', idea.category + ' \u2192 ' + newCategory + ' (bulk)');
    idea.category = newCategory;
    idea.updatedAt = Date.now();
    idea.updatedBy = state.currentUser.name;
    saveIdea(idea, true);
    count++;
  });
  state.selectedIds = [];
  showToast(count + ' ideas moved to ' + newCategory);
  if (!state.firebaseReady) render();
}

function bulkDelete() {
  if (!state.selectedIds.length) return;
  var deletable = [];
  state.selectedIds.forEach(function(id) {
    var idea = state.ideas[id];
    if (idea && canDelete(idea)) deletable.push(id);
  });
  if (!deletable.length) { showToast('No permission to delete selected ideas'); return; }
  if (!confirm('Delete ' + deletable.length + ' idea(s)? This cannot be undone.')) return;
  deletable.forEach(function(id) { deleteIdea(id); });
  state.selectedIds = [];
  showToast(deletable.length + ' ideas deleted');
  if (!state.firebaseReady) render();
}

// ============================================================
// MODAL & UTILITIES
// ============================================================
function showModal(h){document.getElementById('modal-content').innerHTML=h;document.getElementById('modal-overlay').classList.add('show');}
function closeModal(){document.getElementById('modal-overlay').classList.remove('show');}
document.getElementById('modal-overlay').addEventListener('click',function(e){if(e.target===this)closeModal();});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
document.addEventListener('click', dashClearOnOutsideClick);

function generateId(){return Date.now().toString(36)+Math.random().toString(36).substr(2,9);}
function escapeHtml(s){if(!s)return'';return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function escapeAttr(s){if(!s)return'';return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function formatDate(ts){var d=new Date(ts);return d.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]+' '+d.getFullYear();}
function formatDateTime(ts){var d=new Date(ts);return formatDate(ts)+' '+d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');}
function showToast(msg){var el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(function(){el.classList.remove('show');},2500);}

// ============================================================
// INTRO TOUR
// ============================================================
var _tourSteps = [
  { target: 'header', title: 'Welcome to Idea Board!', text: 'This is your team innovation tracker. Capture, discuss, and prioritise ideas together in real-time.' },
  { target: '.toolbar .btn-primary', title: 'Add New Ideas', text: 'Click here to submit a new idea. Fill in the title, description, benefits, category, and priority.' },
  { target: '#dashboard-container', title: 'Dashboard Stats', text: 'Quick overview of all ideas by status. Hover or click a card to filter the board instantly.' },
  { target: '.view-toggle', title: 'Switch Views', text: 'Toggle between Board view (kanban columns) and List view (sortable table with bulk actions).' },
  { target: '.search-box', title: 'Search & Filter', text: 'Search by title, description, or submitter. Use the dropdowns to filter by category or priority.' },
  { target: '#board-content', title: 'Your Board', text: 'Drag cards between columns to change status. Click any card to see details, comment, or vote. In List view, use checkboxes for bulk actions.' },
  { target: '.user-bar', title: 'Your Identity', text: 'Your name appears here. Use "Switch" to change it. Toggle dark/light mode, or click "Tour" to replay this guide anytime.' }
];
var _tourCurrent = 0;

function startTour() {
  _tourCurrent = 0;
  document.getElementById('tour-overlay').classList.add('active');
  showTourStep();
}

function tourNext() {
  _tourCurrent++;
  if (_tourCurrent >= _tourSteps.length) { tourEnd(); return; }
  showTourStep();
}

function tourPrev() {
  if (_tourCurrent > 0) _tourCurrent--;
  showTourStep();
}

function tourEnd() {
  document.getElementById('tour-overlay').classList.remove('active');
  localStorage.setItem('ib_tour_done', '1');
}

function showTourStep() {
  var step = _tourSteps[_tourCurrent];
  var el = document.querySelector(step.target);
  var spotlight = document.getElementById('tour-spotlight');
  var tooltip = document.getElementById('tour-tooltip');
  var content = document.getElementById('tour-content');
  var indicator = document.getElementById('tour-indicator');
  var prevBtn = document.getElementById('tour-prev');
  var nextBtn = document.getElementById('tour-next');

  content.innerHTML = '<h3>' + step.title + '</h3><p>' + step.text + '</p>';
  indicator.textContent = (_tourCurrent + 1) + ' of ' + _tourSteps.length;
  prevBtn.style.display = _tourCurrent === 0 ? 'none' : '';
  nextBtn.textContent = _tourCurrent === _tourSteps.length - 1 ? 'Finish' : 'Next';

  if (el) {
    var rect = el.getBoundingClientRect();
    var pad = 8;
    spotlight.style.top = (rect.top - pad + window.scrollY) + 'px';
    spotlight.style.left = (rect.left - pad) + 'px';
    spotlight.style.width = (rect.width + pad * 2) + 'px';
    spotlight.style.height = (rect.height + pad * 2) + 'px';

    // Position tooltip below or above the target
    var tooltipTop = rect.bottom + window.scrollY + 12;
    var tooltipLeft = Math.max(10, Math.min(rect.left, window.innerWidth - 380));
    if (tooltipTop + 200 > window.innerHeight + window.scrollY) {
      tooltipTop = rect.top + window.scrollY - 180;
    }
    tooltip.style.top = tooltipTop + 'px';
    tooltip.style.left = tooltipLeft + 'px';
  } else {
    // Fallback: center
    spotlight.style.top = '50%';
    spotlight.style.left = '50%';
    spotlight.style.width = '0';
    spotlight.style.height = '0';
    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
  }
}

function checkFirstVisit() {
  if (!localStorage.getItem('ib_tour_done')) {
    setTimeout(startTour, 800); // slight delay so the page loads first
  }
}

// ============================================================
// PUBLIC API
// ============================================================
window.IB = {showAddIdea:showAddIdea,showEditIdea:showEditIdea,showDetail:showDetail,submitIdea:submitIdea,confirmDelete:confirmDelete,closeModal:closeModal,setView:setView,filterIdeas:filterIdeas,sortBy:sortBy,exportData:exportData,importData:importData,handleImport:handleImport,changeUser:changeUser,showCategoryManager:showCategoryManager,addCategory:addCategory,removeCategory:removeCategory,toggleTheme:toggleTheme,upvote:upvote,downvote:downvote,addComment:addComment,deleteComment:deleteComment,dashFilter:dashFilter,dashHover:dashHover,dashHoverEnd:dashHoverEnd,showManageData:showManageData,showManageUsers:showManageUsers,promoteUser:promoteUser,demoteUser:demoteUser,editUser:editUser,deleteUser:deleteUser,bulkToggle:bulkToggle,bulkToggleAll:bulkToggleAll,bulkClear:bulkClear,bulkChangeStatus:bulkChangeStatus,bulkChangePriority:bulkChangePriority,bulkChangeCategory:bulkChangeCategory,bulkDelete:bulkDelete,startTour:startTour,tourNext:tourNext,tourPrev:tourPrev,tourEnd:tourEnd};

init();
checkFirstVisit();
})();
