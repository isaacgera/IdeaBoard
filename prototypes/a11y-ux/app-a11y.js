// Idea Board - a11y / interaction-consistency PROTOTYPE (on top of live v2.4.8)
// ---------------------------------------------------------------------------
// This is a PROTOTYPE, not the live app. Two themes are layered on 2.4.8:
//   Theme 1 — interaction consistency + keyboard operability:
//     * Kanban cards, list rows and sortable headers are now focusable and
//       operable by keyboard (Enter/Space), matching the dashboard stat cards.
//     * One shared "activate a role=button element" handler drives all of them.
//     * Dashboard click/tap/keyboard behave identically; focus previews the
//       filter the same way hover does (CSS :focus-within / :focus-visible).
//     * Dimmed (non-matching) kanban cards are hidden from assistive tech while
//       a filter is active (aria-hidden + inert-style), matching the list view
//       which fully removes non-matching rows.
//   Theme 2 — go-live a11y gaps:
//     * prefers-reduced-motion handled in CSS.
//     * Toast is a role=status aria-live region; drag/bulk status changes also
//       announce via a dedicated polite live region (#sr-live).
//     * Modals are role=dialog aria-modal with focus move-in, focus trap, and
//       focus restore to the opener on close. Same for the tour tooltip.
//
// DATA SAFETY: all localStorage keys are namespaced ibax_* so this prototype can
// never read or overwrite the live app's ib_* data. Firebase is shared (this is
// an interaction/a11y change, not a data-model change); if Firebase is blocked
// it falls back to the namespaced localStorage exactly like the live app.
(function() {
'use strict';

// Prototype version tag (NOT a live release; live app stays v2.4.8).
var APP_VERSION = '2.5.0-a11y-proto';

// Namespaced localStorage keys — isolate the sandbox from live ib_* data.
var LS = { data: 'ibax_data', user: 'ibax_user', theme: 'ibax_theme', tourDone: 'ibax_tour_done' };

var firebaseConfig = {
  apiKey: "AIzaSyDhHQAxUU-Dsvh6seA5USQugR7nCHvwnSI",
  authDomain: "ideaboard-iag-2026.firebaseapp.com",
  databaseURL: "https://ideaboard-iag-2026-default-rtdb.firebaseio.com",
  projectId: "ideaboard-iag-2026",
  storageBucket: "ideaboard-iag-2026.firebasestorage.app",
  messagingSenderId: "163546732868",
  appId: "1:163546732868:web:8689079b56b21850785f11"
};

var ADMIN_NAMES = ['isaac gera'];
var BOOTSTRAP_ADMIN_UPNS = [];

var state = {
  ideas: {},
  categories: ['Process Improvement', 'Technology', 'Customer Experience', 'Cost Saving', 'Team Culture', 'Other'],
  currentView: 'kanban',
  currentUser: null,
  firebaseReady: false,
  filters: { search: '', category: '', priority: '', contributor: '' },
  sort: { column: 'createdAt', direction: 'desc' },
  darkMode: false,
  dashHighlight: null,
  dashLocked: false,
  users: {},
  selectedIds: [],
  onlineUsers: {}
};

var STATUSES = ['New', 'In Progress', 'Review', 'Done'];
var PRIORITIES = ['High', 'Medium', 'Low'];
var db = null;
var _dragState = { dragging: false, didDrag: false, draggedId: null };

// Element that had focus before a modal opened, so we can restore it on close.
var _lastFocusedBeforeModal = null;

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
  setupKeyboardActivation();
  setupModalFocusTrap();
  showAppVersion();
}

function showAppVersion() {
  var el = document.getElementById('app-version');
  if (el) { el.textContent = 'v' + APP_VERSION; el.title = 'Idea Board ' + APP_VERSION + ' (prototype)'; }
}

// Shared activation for role="button" elements (stat cards, idea cards, list
// rows, sortable headers). Enter/Space activate, matching native buttons. This
// is the single keyboard path for every clickable surface in the app.
function setupKeyboardActivation() {
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    var el = e.target;
    if (el && el.getAttribute && el.getAttribute('role') === 'button' && el.hasAttribute('tabindex')) {
      // Let real controls inside (vote buttons, checkboxes) handle their own keys.
      if (el !== e.target.closest('[role="button"][tabindex]')) return;
      e.preventDefault();
      el.click();
    }
  });
}

// ============================================================
// LIVE REGION (screen-reader announcements)
// ============================================================
// Announce transient status that isn't (or is) also shown as a toast. Clearing
// then setting forces AT to re-read even if the text repeats.
function announce(msg) {
  var el = document.getElementById('sr-live');
  if (!el) return;
  el.textContent = '';
  // A tick later so the change is detected as a fresh update.
  setTimeout(function() { el.textContent = msg; }, 30);
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
    db.ref('presence').on('value', function(s) { state.onlineUsers = s.val() || {}; var c = Object.keys(state.onlineUsers).length; var oc = document.getElementById('online-count'); if (oc) oc.textContent = c + ' online'; });
    loadUsers();
    registerUser();
  } catch (e) { state.firebaseReady = false; loadFromLocalStorage(); render(); }
}

// ============================================================
// THEME (Dark/Light)
// ============================================================
function loadTheme() {
  var saved = localStorage.getItem(LS.theme);
  state.darkMode = (saved === 'dark');
  applyTheme();
}
function toggleTheme() {
  state.darkMode = !state.darkMode;
  localStorage.setItem(LS.theme, state.darkMode ? 'dark' : 'light');
  applyTheme();
}
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
  var btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = state.darkMode ? '\u2600\uFE0F' : '\uD83C\uDF19';
}

// ============================================================
// USER MANAGEMENT
// ============================================================
function loadUser() {
  var saved = localStorage.getItem(LS.user);
  if (saved) { state.currentUser = JSON.parse(saved); } else { promptUser(); }
  updateUserDisplay();
}
function slugifyName(s) {
  return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function localIdForName(name) {
  var slug = slugifyName(name);
  return slug ? ('local_' + slug) : generateId();
}
function promptUser() {
  var name = '';
  while (!name || !name.trim()) {
    name = prompt('Welcome to Idea Board (PROTOTYPE)!\n\nPlease enter your full name to continue:');
    if (name === null) name = '';
  }
  var trimmed = name.trim();
  state.currentUser = { id: localIdForName(trimmed), name: trimmed };
  localStorage.setItem(LS.user, JSON.stringify(state.currentUser));
  updateUserDisplay();
}
function changeUser() {
  var name = prompt('Enter your name:', state.currentUser ? state.currentUser.name : '');
  if (name === null) return;
  if (!name.trim()) name = 'Anonymous';
  var trimmed = name.trim();
  state.currentUser = { id: localIdForName(trimmed), name: trimmed };
  localStorage.setItem(LS.user, JSON.stringify(state.currentUser));
  if (state.firebaseReady) {
    db.ref('presence/' + state.currentUser.id).update({ name: state.currentUser.name });
    registerUser();
  } else {
    var existing = state.users[state.currentUser.id];
    var role = (existing && existing.role) ? existing.role : (isBootstrapAdmin() ? 'admin' : 'contributor');
    state.users[state.currentUser.id] = { name: trimmed, role: role, lastSeen: Date.now() };
  }
  closeModal();
  state.selectedIds = [];
  updateUserDisplay();
  render();
  showToast('Switched to ' + state.currentUser.name + (isAdmin() ? ' (Admin)' : ''));
}
function updateUserDisplay() {
  if (!state.currentUser) return;
  var disp = document.getElementById('user-display');
  var av = document.getElementById('user-avatar');
  if (av) av.textContent = state.currentUser.name.charAt(0).toUpperCase();
  var roleBadge = isAdmin() ? ' (Admin)' : '';
  if (disp) disp.textContent = state.currentUser.name + roleBadge;
}

// ============================================================
// RBAC
// ============================================================
function isAdmin() {
  if (!state.currentUser) return false;
  var userRecord = state.users[state.currentUser.id];
  if (userRecord && userRecord.role) return userRecord.role === 'admin';
  return isBootstrapAdmin();
}
function isBootstrapAdmin() {
  if (!state.currentUser) return false;
  var nameMatch = ADMIN_NAMES.indexOf((state.currentUser.name || '').toLowerCase()) !== -1;
  var upn = (state.currentUser.username || '').toLowerCase();
  var upnMatch = upn && BOOTSTRAP_ADMIN_UPNS.map(function (u) { return String(u).toLowerCase(); }).indexOf(upn) !== -1;
  return nameMatch || upnMatch;
}
function canEdit(idea) {
  if (!idea || !state.currentUser) return false;
  if (isAdmin()) return true;
  return idea.submittedBy === state.currentUser.name;
}
function canDelete(idea) { return canEdit(idea); }
function canChangeStatus(idea) { return true; }

function registerUser() {
  if (!state.firebaseReady || !state.currentUser) return;
  var ref = db.ref('users/' + state.currentUser.id);
  ref.once('value').then(function (snap) {
    var existing = snap.val();
    var role;
    if (existing && existing.role) { role = existing.role; }
    else { role = isBootstrapAdmin() ? 'admin' : 'contributor'; }
    var record = { name: state.currentUser.name, role: role, lastSeen: Date.now() };
    ref.set(record);
    state.users[state.currentUser.id] = record;
    updateUserDisplay();
    render();
  }).catch(function () {
    var role = isBootstrapAdmin() ? 'admin' : 'contributor';
    var record = { name: state.currentUser.name, role: role, lastSeen: Date.now() };
    ref.set(record);
    state.users[state.currentUser.id] = record;
    updateUserDisplay();
    render();
  });
}
function loadUsers() {
  if (!state.firebaseReady) return;
  db.ref('users').on('value', function(snap) { state.users = snap.val() || {}; updateUserDisplay(); });
}

function addUser() {
  if (!isAdmin()) { showToast('Admin access required'); return; }
  var nameInput = document.getElementById('add-user-name');
  var roleSelect = document.getElementById('add-user-role');
  if (!nameInput) return;
  var name = (nameInput.value || '').trim();
  if (!name) { showToast('Enter a name'); return; }
  var role = (roleSelect && roleSelect.value === 'admin') ? 'admin' : 'contributor';
  var existingIds = Object.keys(state.users).filter(function (uid) {
    return ((state.users[uid] || {}).name || '').trim().toLowerCase() === name.toLowerCase();
  });
  if (existingIds.length) {
    existingIds.forEach(function (uid) {
      if (state.firebaseReady) { db.ref('users/' + uid + '/role').set(role); }
      if (state.users[uid]) state.users[uid].role = role;
    });
    showToast('"' + name + '" already existed — role set to ' + role);
    if (!state.firebaseReady) render();
    showManageUsers();
    return;
  }
  var uid = localIdForName(name);
  var record = { name: name, role: role, lastSeen: Date.now() };
  if (state.firebaseReady) { db.ref('users/' + uid).set(record); }
  state.users[uid] = record;
  showToast('Added ' + name + ' as ' + role);
  if (!state.firebaseReady) render();
  showManageUsers();
}
function promoteUser(userId) {
  if (!isAdmin()) { showToast('Only admins can promote users'); return; }
  idsForSameName(userId).forEach(function(uid) {
    if (state.firebaseReady) { db.ref('users/' + uid + '/role').set('admin'); }
    if (state.users[uid]) state.users[uid].role = 'admin';
  });
  showToast('User promoted to admin');
  showManageUsers();
}
function demoteUser(userId) {
  if (!isAdmin()) { showToast('Only admins can demote users'); return; }
  if (adminNameCount() <= 1 && groupRoleForId(userId) === 'admin') {
    showToast('Cannot demote the last admin. Promote someone else first.');
    return;
  }
  idsForSameName(userId).forEach(function(uid) {
    if (state.firebaseReady) { db.ref('users/' + uid + '/role').set('contributor'); }
    if (state.users[uid]) state.users[uid].role = 'contributor';
  });
  showToast('User demoted to contributor');
  showManageUsers();
}
function adminNameCount() { return getDedupedUsers().filter(function (g) { return g.role === 'admin'; }).length; }
function groupRoleForId(userId) {
  var target = ((state.users[userId] || {}).name || '').trim().toLowerCase();
  var g = getDedupedUsers().filter(function (grp) { return grp.name.trim().toLowerCase() === target; })[0];
  return g ? g.role : 'contributor';
}

function showOnlineUsers() {
  if (!isAdmin()) return;
  var html = '<div class="modal-header"><h2 id="modal-title-anchor">Online Users</h2><button class="close-btn" onclick="IB.closeModal()" aria-label="Close">&times;</button></div>';
  html += '<div class="modal-body">';
  if (state.firebaseReady && state.onlineUsers) {
    var userIds = Object.keys(state.onlineUsers);
    if (!userIds.length) {
      html += '<p style="font-size:.82rem;color:var(--text-light)">No users currently online.</p>';
    } else {
      html += '<p style="font-size:.75rem;color:var(--text-light);margin-bottom:.8rem">' + userIds.length + ' user(s) currently active:</p>';
      html += '<div style="display:flex;flex-direction:column;gap:.4rem">';
      userIds.forEach(function(uid) {
        var u = state.onlineUsers[uid];
        var name = u.name || 'Unknown';
        var initial = name.charAt(0).toUpperCase();
        html += '<div style="display:flex;align-items:center;gap:.6rem;padding:.4rem .7rem;border:1px solid var(--border);border-radius:6px">';
        html += '<div style="width:28px;height:28px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700">' + initial + '</div>';
        html += '<span style="font-size:.85rem;font-weight:500">' + escapeHtml(name) + '</span>';
        html += '<span style="margin-left:auto;width:8px;height:8px;border-radius:50%;background:#10b981"></span>';
        html += '</div>';
      });
      html += '</div>';
    }
  } else {
    html += '<p style="font-size:.82rem;color:var(--text-light)">Real-time presence requires Firebase connection.</p>';
  }
  html += '</div>';
  html += '<div class="modal-footer"><button class="btn" onclick="IB.closeModal()">Close</button></div>';
  showModal(html);
}

function getDedupedUsers() {
  var groups = {};
  Object.keys(state.users).forEach(function(uid) {
    var u = state.users[uid] || {};
    var displayName = (u.name || 'Unknown').trim();
    var key = displayName.toLowerCase();
    if (!groups[key]) { groups[key] = { name: displayName, role: u.role || 'contributor', lastSeen: u.lastSeen || 0, ids: [] }; }
    var g = groups[key];
    g.ids.push(uid);
    if (u.role === 'admin') g.role = 'admin';
    if ((u.lastSeen || 0) >= g.lastSeen) { g.lastSeen = u.lastSeen || 0; if (u.name) g.name = displayName; }
  });
  return Object.keys(groups).map(function(k) { return groups[k]; })
    .sort(function(a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
}

function showManageUsers() {
  if (!isAdmin()) { showToast('Admin access required'); return; }
  var html = '<div class="modal-header"><h2 id="modal-title-anchor">Manage Users</h2><button class="close-btn" onclick="IB.closeModal()" aria-label="Close">&times;</button></div>';
  html += '<div class="modal-body">';
  html += '<p style="font-size:.75rem;color:var(--text-light);margin-bottom:1rem">Manage team members. Roles are stored per user, so promotions and demotions persist. Promote grants full admin rights; Demote returns a user to contributor. Edit renames the user (and remaps their ideas). Delete removes the user (their ideas transfer to you). The board keeps at least one admin at all times.</p>';
  var groups = getDedupedUsers();
  if (!groups.length) {
    html += '<p style="font-size:.82rem;color:var(--text-light)">No users registered yet. Users appear here after they access the board.</p>';
  } else {
    html += '<div style="margin-bottom:.5rem">';
    var adminCount = groups.filter(function (x) { return x.role === 'admin'; }).length;
    groups.forEach(function(g) {
      var isSelf = state.currentUser && g.ids.indexOf(state.currentUser.id) !== -1;
      var roleLabel = g.role === 'admin' ? '<span style="color:var(--primary);font-weight:600">Admin</span>' : '<span style="color:var(--text-light)">Contributor</span>';
      var uid = g.ids[0];
      html += '<div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.4rem;padding:.4rem .7rem;border:1px solid var(--border);border-radius:6px;flex-wrap:wrap">';
      html += '<span style="flex:1;font-size:.82rem;font-weight:500;min-width:100px">' + escapeHtml(g.name || 'Unknown') + (isSelf ? ' <span style="font-size:.62rem;color:var(--text-light)">(you)</span>' : '') + '</span>';
      html += '<span style="font-size:.72rem">' + roleLabel + '</span>';
      if (g.role === 'admin') {
        if (adminCount > 1) { html += '<button class="btn btn-sm" onclick="IB.demoteUser(\'' + uid + '\')">Demote</button>'; }
        else { html += '<span style="font-size:.62rem;color:var(--text-light)" title="Promote another admin before demoting the last one">(last admin)</span>'; }
      } else {
        html += '<button class="btn btn-sm btn-primary" onclick="IB.promoteUser(\'' + uid + '\')">Promote</button>';
      }
      html += '<button class="btn btn-sm" onclick="IB.editUser(\'' + uid + '\')" title="Rename user">Edit</button>';
      if (!isSelf) { html += '<button class="btn btn-sm btn-danger" onclick="IB.deleteUser(\'' + uid + '\')" title="Delete user (ideas transfer to you)">Delete</button>'; }
      html += '</div>';
    });
    html += '</div>';
  }
  html += '<div class="detail-section" style="margin-top:1rem"><h4>Add User</h4>';
  html += '<p style="font-size:.68rem;color:var(--text-light);margin-bottom:.5rem">Pre-adds a user by name with a role. The role takes effect when they enter that exact name (or sign in locally).</p>';
  html += '<div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center">';
  html += '<input type="text" id="add-user-name" placeholder="Full name" aria-label="New user name" style="flex:1;min-width:140px;padding:.4rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--surface);color:var(--text)">';
  html += '<select id="add-user-role" aria-label="New user role" style="padding:.4rem .5rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--surface);color:var(--text)"><option value="contributor">Contributor</option><option value="admin">Admin</option></select>';
  html += '<button class="btn btn-primary btn-sm" onclick="IB.addUser()">Add</button>';
  html += '</div></div>';
  html += '</div>';
  html += '<div class="modal-footer"><button class="btn" onclick="IB.closeModal()">Close</button></div>';
  showModal(html);
}

function isSelfUser(userId) {
  if (!state.currentUser) return false;
  if (userId === state.currentUser.id) return true;
  var target = ((state.users[userId] || {}).name || '').trim().toLowerCase();
  return !!target && target === (state.currentUser.name || '').trim().toLowerCase();
}
function idsForSameName(userId) {
  var target = ((state.users[userId] || {}).name || '').trim().toLowerCase();
  if (!target) return [userId];
  return Object.keys(state.users).filter(function(uid) {
    return ((state.users[uid] || {}).name || '').trim().toLowerCase() === target;
  });
}
function editUser(userId) {
  if (!isAdmin()) { showToast('Admin access required'); return; }
  var user = state.users[userId];
  if (!user) return;
  var oldName = user.name;
  var newName = prompt('Rename user "' + oldName + '" to:', oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;
  newName = newName.trim();
  idsForSameName(userId).forEach(function(uid) {
    if (state.firebaseReady) { db.ref('users/' + uid + '/name').set(newName); }
    if (state.users[uid]) state.users[uid].name = newName;
  });
  Object.keys(state.ideas).forEach(function(id) {
    var idea = state.ideas[id];
    var changed = false;
    if (idea.submittedBy === oldName) { idea.submittedBy = newName; changed = true; }
    if (idea.updatedBy === oldName) { idea.updatedBy = newName; changed = true; }
    if (idea.comments) { idea.comments.forEach(function(c) { if (c.user === oldName) c.user = newName; }); changed = true; }
    if (idea.history) { idea.history.forEach(function(h) { if (h.user === oldName) h.user = newName; }); changed = true; }
    if (changed) saveIdea(idea, true);
  });
  showToast('User renamed: ' + oldName + ' \u2192 ' + newName);
  if (!state.firebaseReady) render();
  showManageUsers();
}
function deleteUser(userId) {
  if (!isAdmin()) { showToast('Admin access required'); return; }
  if (isSelfUser(userId)) { showToast("You can't delete your own account."); return; }
  var user = state.users[userId];
  if (!user) return;
  var userName = user.name;
  var adminName = state.currentUser.name;
  if (!confirm('Delete user "' + userName + '"?\n\nTheir ideas will be reassigned to you (' + adminName + '). This cannot be undone.')) return;
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
  idsForSameName(userId).forEach(function(uid) {
    if (state.firebaseReady) { db.ref('users/' + uid).remove(); db.ref('presence/' + uid).remove(); }
    else { delete state.users[uid]; }
  });
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
function loadFromLocalStorage() { var d = localStorage.getItem(LS.data); if (d) { var p = JSON.parse(d); state.ideas = p.ideas || {}; if (p.categories) state.categories = p.categories; }}
function saveToLocalStorage() { localStorage.setItem(LS.data, JSON.stringify({ ideas: state.ideas, categories: state.categories })); }

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
  if (idea.votes[uid] === 1) { delete idea.votes[uid]; } else { idea.votes[uid] = 1; }
  saveIdea(idea);
}
function downvote(id, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  var idea = state.ideas[id]; if (!idea) return;
  if (!idea.votes) idea.votes = {};
  var uid = state.currentUser.id;
  if (idea.votes[uid] === -1) { delete idea.votes[uid]; } else { idea.votes[uid] = -1; }
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
  var contribEl = document.getElementById('filter-contributor');
  state.filters.contributor = contribEl ? contribEl.value : '';
  render();
  // Let AT users know the filter did something (the board updates silently).
  if (hasToolbarFilters()) {
    var n = getFilteredIdeas().length;
    announce(n + (n === 1 ? ' idea matches' : ' ideas match') + ' the current filters');
  }
}
// True when any toolbar filter (search / category / priority / contributor) is set.
function hasToolbarFilters() {
  var f = state.filters;
  return !!(f.search || f.category || f.priority || f.contributor);
}
// Any filter at all — toolbar filters OR a locked dashboard highlight.
function hasAnyFilter() {
  return hasToolbarFilters() || !!state.dashLocked;
}
// Ideas passing the TOOLBAR filters only (no sort, no dashboard highlight).
// The dashboard counts are computed from this so the summary tabs reflect the
// active toolbar filters — but a status card never filters itself out.
function getToolbarFilteredIdeas() {
  var out = [];
  Object.keys(state.ideas).forEach(function(id) {
    var idea = state.ideas[id];
    if (state.filters.search) {
      var s = state.filters.search;
      if ((idea.title||'').toLowerCase().indexOf(s)===-1 && (idea.description||'').toLowerCase().indexOf(s)===-1 && (idea.benefits||'').toLowerCase().indexOf(s)===-1 && (idea.submittedBy||'').toLowerCase().indexOf(s)===-1) return;
    }
    if (state.filters.category && idea.category !== state.filters.category) return;
    if (state.filters.priority && idea.priority !== state.filters.priority) return;
    if (state.filters.contributor && idea.submittedBy !== state.filters.contributor) return;
    out.push(idea);
  });
  return out;
}
function getFilteredIdeas() {
  var ideas = getToolbarFilteredIdeas();
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

// Number of active filters (each toolbar filter + a locked dashboard highlight).
function activeFilterCount() {
  var f = state.filters, n = 0;
  if (f.search) n++;
  if (f.category) n++;
  if (f.priority) n++;
  if (f.contributor) n++;
  if (state.dashLocked) n++;
  return n;
}

// Clear every filter in one action: search, all toolbar dropdowns, and the
// locked dashboard highlight. Resets the inputs then re-renders.
function clearFilters() {
  state.filters = { search: '', category: '', priority: '', contributor: '' };
  state.dashHighlight = null;
  state.dashLocked = false;
  var search = document.getElementById('search-input');
  if (search) search.value = '';
  ['filter-category', 'filter-priority', 'filter-contributor'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  render();
  announce('Filters cleared');
}

// Show/label the Clear-filters button based on how many filters are active.
function updateClearFiltersButton() {
  var btn = document.getElementById('btn-clear-filters');
  if (!btn) return;
  var n = activeFilterCount();
  if (n > 0) {
    btn.style.display = 'inline-flex';
    btn.textContent = '\u2715 Clear filters (' + n + ')';
  } else {
    btn.style.display = 'none';
  }
}

// ============================================================
// DASHBOARD STATS
// ============================================================
function renderDashboard() {
  // Nothing in the DB at all → no dashboard. (A filter that merely narrows to
  // zero still shows the bar, with zero counts, so the numbers track the filters.)
  if (!Object.keys(state.ideas).length) return '';
  // Counts reflect the active TOOLBAR filters (Category/Priority/Contributor/search)
  // so the summary tabs track what's filtered. The dashboard's own status highlight
  // is deliberately excluded so a status card never zeroes itself out.
  var scopedIdeas = getToolbarFilteredIdeas();
  var total = scopedIdeas.length;
  var byStat = {}; STATUSES.forEach(function(s) { byStat[s] = 0; });
  var bySubmitter = {};
  var thisMonth = 0;
  var now = new Date(), monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  scopedIdeas.forEach(function(idea) {
    if (byStat[idea.status] !== undefined) byStat[idea.status]++;
    bySubmitter[idea.submittedBy] = (bySubmitter[idea.submittedBy] || 0) + 1;
    if (idea.createdAt >= monthStart) thisMonth++;
  });
  // Unique contributors = distinct people who have actually submitted an idea
  // (distinct submittedBy across the ideas), tying the metric to "ideas added".
  // Names are trimmed + compared case-insensitively so the same person entered
  // with different casing/whitespace isn't double-counted.
  var contributorKeys = {};
  Object.keys(bySubmitter).forEach(function(name) {
    var key = String(name || '').trim().toLowerCase();
    if (key) contributorKeys[key] = true;
  });
  var uniqueContributors = Object.keys(contributorKeys).length;

  var html = '<div class="dashboard" id="dashboard-bar">';
  html += '<div class="stat-card clickable" role="button" tabindex="0" aria-label="Show all ideas" title="Click to show all ideas" onclick="IB.dashFilter(\'all\')" onmouseenter="IB.dashHover(\'all\')" onmouseleave="IB.dashHoverEnd()" onfocus="IB.dashHover(\'all\')" onblur="IB.dashHoverEnd()"><span class="stat-number">' + total + '</span><span class="stat-label">Total Ideas</span></div>';
  html += '<div class="stat-card stat-new clickable" role="button" tabindex="0" aria-label="Filter to New ideas" title="Click to filter to New ideas" onclick="IB.dashFilter(\'status\',\'New\')" onmouseenter="IB.dashHover(\'status\',\'New\')" onmouseleave="IB.dashHoverEnd()" onfocus="IB.dashHover(\'status\',\'New\')" onblur="IB.dashHoverEnd()"><span class="stat-number">' + byStat['New'] + '</span><span class="stat-label">New</span></div>';
  html += '<div class="stat-card stat-progress clickable" role="button" tabindex="0" aria-label="Filter to In Progress ideas" title="Click to filter to In Progress ideas" onclick="IB.dashFilter(\'status\',\'In Progress\')" onmouseenter="IB.dashHover(\'status\',\'In Progress\')" onmouseleave="IB.dashHoverEnd()" onfocus="IB.dashHover(\'status\',\'In Progress\')" onblur="IB.dashHoverEnd()"><span class="stat-number">' + byStat['In Progress'] + '</span><span class="stat-label">In Progress</span></div>';
  html += '<div class="stat-card stat-review clickable" role="button" tabindex="0" aria-label="Filter to In Review ideas" title="Click to filter to In Review ideas" onclick="IB.dashFilter(\'status\',\'Review\')" onmouseenter="IB.dashHover(\'status\',\'Review\')" onmouseleave="IB.dashHoverEnd()" onfocus="IB.dashHover(\'status\',\'Review\')" onblur="IB.dashHoverEnd()"><span class="stat-number">' + byStat['Review'] + '</span><span class="stat-label">In Review</span></div>';
  html += '<div class="stat-card stat-done clickable" role="button" tabindex="0" aria-label="Filter to Done ideas" title="Click to filter to Done ideas" onclick="IB.dashFilter(\'status\',\'Done\')" onmouseenter="IB.dashHover(\'status\',\'Done\')" onmouseleave="IB.dashHoverEnd()" onfocus="IB.dashHover(\'status\',\'Done\')" onblur="IB.dashHoverEnd()"><span class="stat-number">' + byStat['Done'] + '</span><span class="stat-label">Done</span></div>';
  html += '<div class="stat-card clickable" role="button" tabindex="0" aria-label="Filter to ideas added this month" title="Click to filter to ideas added this month" onclick="IB.dashFilter(\'month\')" onmouseenter="IB.dashHover(\'month\')" onmouseleave="IB.dashHoverEnd()" onfocus="IB.dashHover(\'month\')" onblur="IB.dashHoverEnd()"><span class="stat-number">' + thisMonth + '</span><span class="stat-label">This Month</span></div>';
  html += '<div class="stat-card clickable" role="button" tabindex="0" aria-label="' + uniqueContributors + ' contributors — show all ideas" title="Click to show all ideas (distinct contributors who have added ideas)" onclick="IB.dashFilter(\'contributors\')" onmouseenter="IB.dashHover(\'contributors\')" onmouseleave="IB.dashHoverEnd()" onfocus="IB.dashHover(\'contributors\')" onblur="IB.dashHoverEnd()"><span class="stat-number">' + uniqueContributors + '</span><span class="stat-label">Contributors</span></div>';
  html += '</div>';
  return html;
}

function dashFilter(type, value) {
  // Toggle relative to what's LOCKED (the persistent click state), not to the
  // transient hover highlight. On mouse, hover has already set state.dashHighlight
  // to this same card, so keying the toggle off dashHighlight made the first click
  // read as "toggle off" and show all ideas. Basing it on dashLocked instead means
  // the first click locks the correct filter (matching the hover preview), and a
  // click on the already-locked card clears it — and keyboard (no hover) behaves
  // identically.
  var alreadyLockedSame = state.dashLocked && state.dashHighlight &&
    state.dashHighlight.type === type && state.dashHighlight.value === (value || null);
  if (type === 'all' || alreadyLockedSame) {
    state.dashHighlight = null;
  } else {
    state.dashHighlight = { type: type, value: value || null };
  }
  state.dashLocked = !!state.dashHighlight;
  applyDashHighlight();
  announce(state.dashHighlight ? ('Filtered to ' + dashLabel(state.dashHighlight)) : 'Filter cleared');
}
function dashHover(type, value) {
  if (state.dashLocked) return;
  if (type === 'all') { state.dashHighlight = null; } else { state.dashHighlight = { type: type, value: value || null }; }
  applyDashHighlight();
}
function dashHoverEnd() {
  if (state.dashLocked) return;
  state.dashHighlight = null;
  applyDashHighlight();
}
function dashLabel(h) {
  if (!h) return '';
  if (h.type === 'status') return h.value + ' ideas';
  if (h.type === 'month') return 'ideas added this month';
  if (h.type === 'submitter') return 'ideas by ' + h.value;
  if (h.type === 'contributors') return 'all ideas';
  return 'all ideas';
}
function dashClearOnOutsideClick(e) {
  if (!state.dashHighlight && !state.dashLocked) return;
  var dashboard = document.getElementById('dashboard-container');
  if (dashboard && dashboard.contains(e.target)) return;
  // Don't treat opening/using an idea as "clicking away" from the filter.
  // A click that opens the detail modal (an idea card or list row), lands
  // inside an open modal, or hits a vote button must NOT clear the highlight —
  // otherwise the background filter drops the instant you open an idea.
  if (e.target.closest &&
      e.target.closest('.idea-card, .list-table tbody tr, .modal-overlay, .vote-btn')) {
    return;
  }
  state.dashHighlight = null;
  state.dashLocked = false;
  applyDashHighlight();
}
function ideaMatchesDashHighlight(idea) {
  if (!state.dashHighlight) return true;
  var h = state.dashHighlight;
  // 'contributors' is an all-ideas highlight: it participates in hover/click/lock
  // like the other cards but every idea matches, so the board/list shows all.
  if (h.type === 'contributors') return true;
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
  // Preview (hover OR keyboard focus, not committed) = single border.
  // Committed (click OR Enter, state.dashLocked) = double border.
  // We drive the double border off dashLocked ONLY, so mouse and keyboard match:
  // .active (the double-border class) is added just for the locked card, and a
  // 'dash-locked' marker on board-content upgrades the filtered items below.
  var locked = hasHighlight && state.dashLocked;
  document.querySelectorAll('.stat-card').forEach(function(card) { card.classList.remove('active'); card.setAttribute('aria-pressed', 'false'); });
  if (hasHighlight) {
    document.querySelectorAll('.stat-card').forEach(function(card) {
      var onclick = card.getAttribute('onclick') || '';
      var match = false;
      if (state.dashHighlight.type === 'status' && onclick.indexOf("'" + state.dashHighlight.value + "'") !== -1 && onclick.indexOf("'status'") !== -1) match = true;
      else if (state.dashHighlight.type === 'month' && onclick.indexOf("'month'") !== -1) match = true;
      else if (state.dashHighlight.type === 'submitter' && onclick.indexOf("'submitter'") !== -1) match = true;
      else if (state.dashHighlight.type === 'contributors' && onclick.indexOf("'contributors'") !== -1) match = true;
      if (match) {
        // aria-pressed reflects the committed (locked) state, not a hover preview.
        if (locked) card.classList.add('active');
        card.setAttribute('aria-pressed', locked ? 'true' : 'false');
      }
    });
  }

  var boardContent = document.getElementById('board-content');
  // Marker lets the CSS give filtered items a double border only when locked.
  boardContent.classList.toggle('dash-locked', locked);

  var ideaCards = document.querySelectorAll('.idea-card');
  if (hasHighlight) {
    boardContent.classList.add('has-dash-highlight');
    ideaCards.forEach(function(card) {
      var id = card.getAttribute('data-id');
      var idea = state.ideas[id];
      if (idea && ideaMatchesDashHighlight(idea)) {
        card.classList.add('dash-highlight'); card.classList.remove('dash-dim');
        card.removeAttribute('aria-hidden'); card.setAttribute('tabindex', '0');
      } else {
        card.classList.remove('dash-highlight'); card.classList.add('dash-dim');
        // Hide dimmed cards from AT + remove from tab order, matching the list
        // view (which fully removes non-matching rows).
        card.setAttribute('aria-hidden', 'true'); card.setAttribute('tabindex', '-1');
      }
    });
    document.querySelectorAll('.list-table tbody tr').forEach(function(row) {
      var m = (row.getAttribute('data-id') || '');
      if (m) {
        var idea = state.ideas[m];
        if (idea && ideaMatchesDashHighlight(idea)) { row.style.display = ''; row.classList.add('dash-highlight'); row.classList.remove('dash-dim'); row.setAttribute('tabindex', '0'); }
        else { row.style.display = 'none'; row.classList.remove('dash-highlight'); row.classList.add('dash-dim'); row.setAttribute('tabindex', '-1'); }
      }
    });
    // Ring the whole list-view box (not individual rows) while a filter is active.
    var listView = document.querySelector('.list-view');
    if (listView) listView.classList.add('dash-active');
    document.querySelectorAll('.kanban-column').forEach(function(col) {
      if (state.dashHighlight.type === 'status') {
        var s = col.getAttribute('data-status');
        if (s === state.dashHighlight.value) { col.classList.add('dash-highlight'); col.classList.remove('dash-dim'); }
        else { col.classList.remove('dash-highlight'); col.classList.add('dash-dim'); }
      } else { col.classList.remove('dash-highlight', 'dash-dim'); }
    });
  } else {
    boardContent.classList.remove('has-dash-highlight');
    ideaCards.forEach(function(c) { c.classList.remove('dash-highlight', 'dash-dim'); c.removeAttribute('aria-hidden'); c.setAttribute('tabindex', '0'); });
    document.querySelectorAll('.list-table tbody tr').forEach(function(r) { r.style.display = ''; r.classList.remove('dash-highlight', 'dash-dim'); r.setAttribute('tabindex', '0'); });
    document.querySelectorAll('.kanban-column').forEach(function(c) { c.classList.remove('dash-highlight', 'dash-dim'); });
    var listViewClear = document.querySelector('.list-view');
    if (listViewClear) listViewClear.classList.remove('dash-active');
  }
}

// ============================================================
// RENDERING
// ============================================================
function render() {
  var dashContainer = document.getElementById('dashboard-container');
  if (dashContainer) dashContainer.innerHTML = renderDashboard();
  renderContributorFilter();
  var contentHtml = '';
  if (state.currentView === 'kanban') { contentHtml = renderKanbanHtml(); }
  else { contentHtml = renderListHtml(); }
  document.getElementById('board-content').innerHTML = contentHtml;
  // Re-apply any active dashboard filter to the freshly-rendered items.
  if (state.dashHighlight) applyDashHighlight();
  updateLastUpdated();
  var manageBtn = document.getElementById('btn-manage-data');
  if (manageBtn) manageBtn.style.display = isAdmin() ? 'inline-flex' : 'none';
  var switchBtn = document.getElementById('btn-switch-user');
  if (switchBtn) switchBtn.style.display = isAdmin() ? 'inline-flex' : 'none';
  var onlineBtn = document.getElementById('online-count');
  if (onlineBtn) onlineBtn.style.display = isAdmin() ? 'inline-block' : 'none';
  updateClearFiltersButton();
  updateUserDisplay();
}

function updateLastUpdated() {
  var el = document.getElementById('last-updated');
  if (!el) return;
  var latest = 0;
  Object.values(state.ideas).forEach(function(idea) {
    if (idea.updatedAt && idea.updatedAt > latest) latest = idea.updatedAt;
    if (idea.createdAt && idea.createdAt > latest && !idea.updatedAt) latest = idea.createdAt;
  });
  el.textContent = latest ? ('Last updated ' + formatTimeAgo(latest)) : '';
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
  // Card is now a keyboard-operable button: role/tabindex/aria-label + the
  // shared Enter/Space handler open the detail, matching the stat cards.
  var cardLabel = 'Idea: ' + idea.title + '. ' + idea.status + ', ' + idea.priority + ' priority. Activate to open details.';
  return '<div class="idea-card" role="button" tabindex="0" aria-label="' + escapeAttr(cardLabel) + '" draggable="true" data-id="' + idea.id + '">' +
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
          '<button class="vote-btn up' + (uv===1?' active':'') + '" onclick="IB.upvote(\'' + idea.id + '\',event)" title="Upvote" aria-label="Upvote" aria-pressed="' + (uv===1?'true':'false') + '">&#9650;</button>' +
          '<span class="vote-score' + (score>0?' positive':'') + (score<0?' negative':'') + '" title="Vote score">' + score + '</span>' +
          '<button class="vote-btn down' + (uv===-1?' active':'') + '" onclick="IB.downvote(\'' + idea.id + '\',event)" title="Downvote" aria-label="Downvote" aria-pressed="' + (uv===-1?'true':'false') + '">&#9660;</button>' +
        '</span>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderListHtml() {
  var ideas = getFilteredIdeas();
  var sortCol = state.sort.column, sortDir = state.sort.direction;
  function si(col) { if (sortCol!==col) return ' <span class="sort-icon">&#8597;</span>'; return sortDir==='asc'?' <span class="sort-icon active">&#9650;</span>':' <span class="sort-icon active">&#9660;</span>'; }
  // Sortable headers are real <button>s inside the <th> so they're keyboard
  // operable; aria-sort stays on the <th>.
  function th(col, label) {
    var aria = sortCol === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
    return '<th scope="col" aria-sort="' + aria + '"><button type="button" class="th-sort" onclick="IB.sortBy(\'' + col + '\')" title="Sort by ' + label + '">' + label.charAt(0).toUpperCase() + label.slice(1) + si(col) + '</button></th>';
  }

  var selCount = state.selectedIds.length;
  var html = '';

  if (selCount > 0) {
    var canDeleteCount = 0;
    state.selectedIds.forEach(function(id) { var idea = state.ideas[id]; if (idea && canDelete(idea)) canDeleteCount++; });
    html += '<div class="bulk-bar">';
    html += '<span class="bulk-count">' + selCount + ' selected</span>';
    html += '<select aria-label="Bulk change status" onchange="IB.bulkChangeStatus(this.value);this.selectedIndex=0"><option value="">Change Status...</option>';
    STATUSES.forEach(function(s) { html += '<option value="' + s + '">' + s + '</option>'; });
    html += '</select>';
    html += '<select aria-label="Bulk change priority" onchange="IB.bulkChangePriority(this.value);this.selectedIndex=0"><option value="">Change Priority...</option>';
    PRIORITIES.forEach(function(p) { html += '<option value="' + p + '">' + p + '</option>'; });
    html += '</select>';
    html += '<select aria-label="Bulk change category" onchange="IB.bulkChangeCategory(this.value);this.selectedIndex=0"><option value="">Change Category...</option>';
    state.categories.forEach(function(c) { html += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; });
    html += '</select>';
    if (canDeleteCount > 0) {
      var delLabel = canDeleteCount === selCount ? 'Delete ' + selCount : 'Delete ' + canDeleteCount + ' of ' + selCount + ' (yours)';
      html += '<button class="btn btn-sm btn-danger" onclick="IB.bulkDelete()">' + delLabel + '</button>';
    }
    html += '<button class="btn btn-sm" onclick="IB.bulkClear()">Clear</button>';
    html += '</div>';
  }

  var allVisibleIds = ideas.map(function(i) { return i.id; });
  var allSelected = allVisibleIds.length > 0 && allVisibleIds.every(function(id) { return state.selectedIds.indexOf(id) !== -1; });

  html += '<div class="list-view"><table class="list-table"><thead><tr>' +
    '<th class="checkbox-col" scope="col" onclick="IB.bulkToggleAll(event)"><input type="checkbox" aria-label="Select all ideas" ' + (allSelected ? 'checked' : '') + ' onclick="IB.bulkToggleAll(event)"></th>' +
    th('title','title') + th('category','category') + th('status','status') + th('priority','priority') +
    th('votes','votes') + th('submittedBy','submitted by') + th('createdAt','date') +
    '<th class="plain-col" scope="col">Last Change</th>' +
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
    var rowLabel = 'Idea: ' + idea.title + '. ' + idea.status + ', ' + idea.priority + ' priority. Activate to open details.';
    // Row is a keyboard-operable button (role/tabindex/aria-label) using the
    // same shared activation as the cards; data-id drives open + filtering.
    html += '<tr class="' + (isSelected ? 'row-selected' : '') + '" role="button" tabindex="0" aria-label="' + escapeAttr(rowLabel) + '" data-id="' + idea.id + '" onclick="IB.rowOpen(event,\''+idea.id+'\')">' +
      '<td class="checkbox-col" onclick="event.stopPropagation()"><input type="checkbox" aria-label="Select idea: ' + escapeAttr(idea.title) + '" ' + (isSelected ? 'checked' : '') + ' onchange="IB.bulkToggle(\''+idea.id+'\',event)"></td>' +
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

// Open a row's detail, ignoring clicks that originated on the checkbox cell.
function rowOpen(e, id) {
  if (e && e.target && e.target.closest('.checkbox-col')) return;
  showDetail(id);
}

function renderCategoryFilter() {
  var select = document.getElementById('filter-category');
  if (!select) return;
  var cur = select.value;
  select.innerHTML = '<option value="">Categories</option>';
  state.categories.forEach(function(cat) { select.innerHTML += '<option value="'+escapeHtml(cat)+'"'+(cur===cat?' selected':'')+'>'+escapeHtml(cat)+'</option>'; });
}

// Populate the Contributors dropdown from the distinct submitters across ideas
// (the people who have actually added ideas). Preserves the current selection.
function renderContributorFilter() {
  var select = document.getElementById('filter-contributor');
  if (!select) return;
  var cur = state.filters.contributor || select.value;
  var seen = {};
  var names = [];
  Object.keys(state.ideas).forEach(function(id) {
    var name = (state.ideas[id].submittedBy || '').trim();
    if (!name) return;
    var key = name.toLowerCase();
    if (!seen[key]) { seen[key] = true; names.push(name); }
  });
  names.sort(function(a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
  select.innerHTML = '<option value="">Contributors</option>';
  names.forEach(function(name) {
    select.innerHTML += '<option value="'+escapeHtml(name)+'"'+(cur===name?' selected':'')+'>'+escapeHtml(name)+'</option>';
  });
  // If the previously-selected contributor no longer exists, reset the filter.
  if (cur && names.indexOf(cur) === -1) { state.filters.contributor = ''; }
}

// ============================================================
// VIEW SWITCHING
// ============================================================
function setView(view) {
  state.currentView = view;
  var kanbanBtn = document.getElementById('view-kanban');
  var listBtn = document.getElementById('view-list');
  kanbanBtn.classList.toggle('active', view==='kanban');
  listBtn.classList.toggle('active', view==='list');
  kanbanBtn.setAttribute('aria-pressed', view==='kanban' ? 'true' : 'false');
  listBtn.setAttribute('aria-pressed', view==='list' ? 'true' : 'false');
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
    if(statusChanged){ showToast(idea.title + ' moved to ' + newStatus); }
    _dragState.didDrag=true;
    if(!state.firebaseReady)render();
  });
  bc.addEventListener('click', function(e) {
    if(_dragState.didDrag)return;
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
  var html='<div class="modal-header"><h2 id="modal-title-anchor">'+title+'</h2><button class="close-btn" onclick="IB.closeModal()" aria-label="Close">&times;</button></div>';
  html+='<div class="modal-body">';
  html+='<div class="form-group"><label for="f-title">Title *</label><input type="text" id="f-title" value="'+(idea?escapeAttr(idea.title):'')+'" placeholder="What\'s the idea?"></div>';
  html+='<div class="form-group"><label for="f-desc">Description</label><textarea id="f-desc" placeholder="Describe the idea in detail...">'+(idea?escapeHtml(idea.description):'')+'</textarea></div>';
  html+='<div class="form-group"><label for="f-benefits">Benefits</label><textarea id="f-benefits" placeholder="What benefits does this bring?">'+(idea?escapeHtml(idea.benefits):'')+'</textarea></div>';
  html+='<div class="form-row"><div class="form-group"><label for="f-category">Category</label><select id="f-category">'+catOpts+'</select></div><div class="form-group"><label for="f-priority">Priority</label><select id="f-priority">'+prioOpts+'</select></div></div>';
  html+='<div class="form-row"><div class="form-group"><label for="f-status">Status</label><select id="f-status">'+statOpts+'</select></div><div class="form-group"><label for="f-submitter">Submitted By</label><input type="text" id="f-submitter" value="'+(idea?escapeAttr(idea.submittedBy):escapeAttr(state.currentUser.name))+'"></div></div>';
  html+='</div><div class="modal-footer">';
  if(isEdit)html+='<button class="btn btn-danger" onclick="IB.confirmDelete(\''+idea.id+'\')">Delete</button>';
  html+='<button class="btn" onclick="IB.closeModal()">Cancel</button><button class="btn btn-primary" onclick="IB.submitIdea(\''+(idea?idea.id:'')+'\')">'+(isEdit?'Update':'Add Idea')+'</button></div>';
  showModal(html);
  setTimeout(function(){var t=document.getElementById('f-title'); if(t) t.focus();},60);
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

  var html='<div class="modal-header"><h2 id="modal-title-anchor">'+escapeHtml(idea.title)+'</h2><button class="close-btn" onclick="IB.closeModal()" aria-label="Close">&times;</button></div>';
  html+='<div class="modal-body">';
  html+='<div class="detail-meta"><div class="detail-meta-item"><span class="status-badge '+sc+'">'+idea.status+'</span></div><div class="detail-meta-item"><span class="card-priority '+pc+'">'+idea.priority+'</span></div><div class="detail-meta-item"><span class="card-category">'+escapeHtml(idea.category)+'</span></div>';
  html+='<div class="detail-meta-item"><span class="detail-vote-widget"><button class="vote-btn up'+(uv===1?' active':'')+'" title="Upvote" aria-label="Upvote" aria-pressed="'+(uv===1?'true':'false')+'" onclick="IB.upvote(\''+idea.id+'\');IB.showDetail(\''+idea.id+'\')">&#9650;</button><span class="vote-score'+(score>0?' positive':'')+(score<0?' negative':'')+'" title="Vote score">'+score+'</span><button class="vote-btn down'+(uv===-1?' active':'')+'" title="Downvote" aria-label="Downvote" aria-pressed="'+(uv===-1?'true':'false')+'" onclick="IB.downvote(\''+idea.id+'\');IB.showDetail(\''+idea.id+'\')">&#9660;</button></span></div>';
  html+='</div>';
  if(idea.description)html+='<div class="detail-section"><h4>Description</h4><p>'+escapeHtml(idea.description).replace(/\n/g,'<br>')+'</p></div>';
  if(idea.benefits)html+='<div class="detail-section"><h4>Benefits</h4><p>'+escapeHtml(idea.benefits).replace(/\n/g,'<br>')+'</p></div>';
  html+='<div class="detail-section"><h4>Timeline</h4><div class="timeline">';
  var dates=idea.dates||{};
  [{key:'created',label:'Created',icon:'&#9679;'},{key:'started',label:'Started',icon:'&#9654;'},{key:'inReview',label:'In Review',icon:'&#9733;'},{key:'completed',label:'Completed',icon:'&#10003;'}].forEach(function(m){
    var active=dates[m.key]?' active':'';
    html+='<div class="timeline-item'+active+'"><span class="timeline-icon">'+m.icon+'</span><span class="timeline-label">'+m.label+'</span><span class="timeline-date">'+(dates[m.key]?formatDateTime(dates[m.key]):'-')+'</span></div>';
  });
  html+='</div></div>';
  html+='<div class="detail-section"><h4>Details</h4><p style="font-size:.82rem"><strong>Submitted by:</strong> '+escapeHtml(idea.submittedBy)+'<br><strong>Last updated:</strong> '+(idea.updatedAt?formatDateTime(idea.updatedAt):'Unknown')+(idea.updatedBy?' by '+escapeHtml(idea.updatedBy):'')+'</p></div>';
  var history=idea.history||[];
  html+='<div class="detail-section"><h4>Version History</h4>';
  if(history.length){html+='<div class="audit-log">';history.slice().reverse().forEach(function(e){html+='<div class="audit-entry"><span class="audit-time">'+formatDateTime(e.timestamp)+'</span><span class="audit-user">'+escapeHtml(e.user)+'</span><span class="audit-action">'+escapeHtml(e.action)+'</span>'+(e.details?'<span class="audit-details">'+escapeHtml(e.details)+'</span>':'')+'</div>';});html+='</div>';}
  else{html+='<p style="font-size:.78rem;color:var(--text-light);font-style:italic">No history yet.</p>';}
  html+='</div>';
  var comments=idea.comments||[];
  html+='<div class="comments-section"><h4>Comments ('+comments.length+')</h4>';
  if(comments.length){
    html+='<div class="comments-list">';
    comments.forEach(function(c){
      html+='<div class="comment-item"><div class="comment-header"><span class="comment-user">'+escapeHtml(c.user)+'</span><span class="comment-time">'+formatDateTime(c.timestamp)+'</span>';
      if(c.user===state.currentUser.name)html+='<button class="btn btn-sm btn-danger" onclick="IB.deleteComment(\''+idea.id+'\',\''+c.id+'\')" aria-label="Delete comment" title="Delete comment">&times;</button>';
      html+='</div><div class="comment-text">'+escapeHtml(c.text).replace(/\n/g,'<br>')+'</div></div>';
    });
    html+='</div>';
  }
  html+='<div class="comment-form"><textarea id="comment-input" placeholder="Add a comment..." rows="2" aria-label="Add a comment"></textarea><button class="btn btn-primary btn-sm" onclick="IB.addComment(\''+idea.id+'\')">Post</button></div>';
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
function showCategoryManager(){var html='<div class="modal-header"><h2 id="modal-title-anchor">Manage Categories</h2><button class="close-btn" onclick="IB.closeModal()" aria-label="Close">&times;</button></div><div class="modal-body"><div style="margin-bottom:1rem">';state.categories.forEach(function(cat,i){html+='<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem;padding:.4rem .6rem;border:1px solid var(--border);border-radius:6px"><span style="flex:1;font-size:.85rem">'+escapeHtml(cat)+'</span><button class="btn btn-sm btn-danger" onclick="IB.removeCategory('+i+')">Remove</button></div>';});html+='</div><div style="display:flex;gap:.4rem"><input type="text" id="new-category" placeholder="New category name" style="flex:1;padding:.4rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.85rem"><button class="btn btn-primary btn-sm" onclick="IB.addCategory()">Add</button></div></div><div class="modal-footer"><button class="btn" onclick="IB.closeModal()">Close</button></div>';showModal(html);}
function addCategory(){var inp=document.getElementById('new-category');var n=inp.value.trim();if(!n)return;if(state.categories.indexOf(n)!==-1){showToast('Already exists');return;}state.categories.push(n);saveCategories();showManageData();showToast('Category added');}
function removeCategory(i){if(confirm('Remove "'+state.categories[i]+'"?')){state.categories.splice(i,1);saveCategories();showManageData();showToast('Removed');}}

function showManageData() {
  if (!isAdmin()) { showToast('Admin access required'); return; }
  var html = '<div class="modal-header"><h2 id="modal-title-anchor">Manage Data</h2><button class="close-btn" onclick="IB.closeModal()" aria-label="Close">&times;</button></div>';
  html += '<div class="modal-body">';
  html += '<div class="detail-section"><h4>Export &amp; Import</h4>';
  html += '<div style="display:flex;gap:.5rem;margin-bottom:.8rem;flex-wrap:wrap">';
  html += '<button class="btn btn-primary btn-sm" onclick="IB.exportData();IB.closeModal()">Export as JSON</button>';
  html += '<button class="btn btn-sm" onclick="IB.importData()">Import from JSON</button>';
  html += '</div>';
  html += '<p style="font-size:.72rem;color:var(--text-light)">Export downloads a JSON file and copies a text summary to clipboard. Import merges ideas from a JSON file.</p>';
  html += '</div>';
  var total = Object.keys(state.ideas).length;
  html += '<div class="detail-section"><h4>Data Summary</h4>';
  html += '<p style="font-size:.8rem">' + total + ' ideas stored ' + (state.firebaseReady ? '(synced via Firebase)' : '(local storage only)') + '</p>';
  html += '</div>';
  if (isAdmin()) {
    html += '<div class="detail-section"><h4>Administration</h4>';
    html += '<button class="btn btn-sm" onclick="IB.showManageUsers()">Manage Users &amp; Roles</button>';
    html += '</div>';
  }
  html += '<div class="detail-section"><h4>Categories</h4>';
  html += '<div class="category-chips" style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.7rem">';
  state.categories.forEach(function(cat, i) {
    html += '<span class="category-chip" style="display:inline-flex;align-items:center;gap:.35rem;padding:.3rem .55rem;border:1px solid var(--border);border-radius:16px;background:var(--surface-alt);font-size:.78rem">';
    html += escapeHtml(cat);
    html += '<button class="btn btn-sm btn-danger" style="padding:0 .35rem;line-height:1.4;border-radius:10px" onclick="IB.removeCategory(' + i + ')" aria-label="Remove category ' + escapeAttr(cat) + '" title="Remove category">&times;</button>';
    html += '</span>';
  });
  html += '</div>';
  html += '<div style="display:flex;gap:.4rem"><input type="text" id="new-category" placeholder="New category name" aria-label="New category name" style="flex:1;padding:.4rem .7rem;border:1px solid var(--border);border-radius:6px;font-size:.82rem;background:var(--surface);color:var(--text)"><button class="btn btn-primary btn-sm" onclick="IB.addCategory()">Add</button></div>';
  html += '</div>';
  html += '</div>';
  html += '<div class="modal-footer"><button class="btn" onclick="IB.closeModal()">Close</button></div>';
  showModal(html);
}

function exportData(){var ideas=getFilteredIdeas();var text='IDEA BOARD EXPORT - '+new Date().toLocaleDateString()+'\n'+'='.repeat(50)+'\n\n';ideas.forEach(function(idea,i){text+=(i+1)+'. '+idea.title+'\n   Status: '+idea.status+' | Priority: '+idea.priority+' | Category: '+idea.category+' | Votes: '+getVoteScore(idea)+'\n   Submitted by: '+idea.submittedBy+' ('+(idea.createdAt?formatDate(idea.createdAt):'')+')'+'\n';if(idea.description)text+='   Description: '+idea.description+'\n';if(idea.benefits)text+='   Benefits: '+idea.benefits+'\n';text+='\n';});text+='---\nTotal: '+ideas.length+' ideas\n';var json=JSON.stringify(ideas,null,2);var blob=new Blob([json],{type:'application/json'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='idea-board-PROTO-export-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url);if(navigator.clipboard){navigator.clipboard.writeText(text).then(function(){showToast('Exported + copied');});}else{showToast('JSON downloaded');}}
function importData(){document.getElementById('import-file').click();}
function handleImport(input){var file=input.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(e){try{var data=JSON.parse(e.target.result);var ideas=[];if(Array.isArray(data))ideas=data;else if(data.ideas){ideas=Array.isArray(data.ideas)?data.ideas:Object.values(data.ideas);if(data.categories&&Array.isArray(data.categories)){state.categories=data.categories;saveCategories();}}if(!ideas.length){showToast('No ideas found');input.value='';return;}if(!confirm('Found '+ideas.length+' ideas. Merge?')){input.value='';return;}var imp=0;ideas.forEach(function(idea){if(!idea.title)return;if(!idea.id)idea.id=generateId();if(!idea.status)idea.status='New';if(!idea.priority)idea.priority='Medium';if(!idea.category)idea.category=state.categories[0]||'Other';if(!idea.submittedBy)idea.submittedBy=state.currentUser.name;if(!idea.createdAt)idea.createdAt=Date.now();if(!idea.updatedAt)idea.updatedAt=Date.now();if(!idea.description)idea.description='';if(!idea.benefits)idea.benefits='';if(!idea.comments)idea.comments=[];if(!idea.history)idea.history=[];if(!idea.votes)idea.votes={};if(!idea.dates){idea.dates={created:idea.createdAt};if(idea.status==='In Progress'||idea.status==='Review'||idea.status==='Done')idea.dates.started=idea.createdAt;if(idea.status==='Review'||idea.status==='Done')idea.dates.inReview=idea.updatedAt||idea.createdAt;if(idea.status==='Done')idea.dates.completed=idea.updatedAt||idea.createdAt;}saveIdea(idea,true);imp++;});showToast('Imported '+imp+' ideas');if(!state.firebaseReady)render();}catch(err){showToast('Error: Invalid JSON');console.error(err);}input.value='';};reader.readAsText(file);}

// ============================================================
// BULK ACTIONS (List View)
// ============================================================
function bulkToggle(id, e) {
  if (e) e.stopPropagation();
  var idx = state.selectedIds.indexOf(id);
  if (idx !== -1) { state.selectedIds.splice(idx, 1); } else { state.selectedIds.push(id); }
  render();
}
function bulkToggleAll(e) {
  if (e) e.stopPropagation();
  var ideas = getFilteredIdeas();
  var allVisibleIds = ideas.map(function(i) { return i.id; });
  var allSelected = allVisibleIds.every(function(id) { return state.selectedIds.indexOf(id) !== -1; });
  state.selectedIds = allSelected ? [] : allVisibleIds.slice();
  render();
}
function bulkClear() { state.selectedIds = []; render(); }
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
    idea.status = newStatus; idea.updatedAt = Date.now(); idea.updatedBy = state.currentUser.name;
    saveIdea(idea, true); count++;
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
    idea.priority = newPriority; idea.updatedAt = Date.now(); idea.updatedBy = state.currentUser.name;
    saveIdea(idea, true); count++;
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
    idea.category = newCategory; idea.updatedAt = Date.now(); idea.updatedBy = state.currentUser.name;
    saveIdea(idea, true); count++;
  });
  state.selectedIds = [];
  showToast(count + ' ideas moved to ' + newCategory);
  if (!state.firebaseReady) render();
}
function bulkDelete() {
  if (!state.selectedIds.length) return;
  var deletable = [];
  state.selectedIds.forEach(function(id) { var idea = state.ideas[id]; if (idea && canDelete(idea)) deletable.push(id); });
  if (!deletable.length) { showToast('No permission to delete selected ideas'); return; }
  if (!confirm('Delete ' + deletable.length + ' idea(s)? This cannot be undone.')) return;
  deletable.forEach(function(id) { deleteIdea(id); });
  state.selectedIds = [];
  showToast(deletable.length + ' ideas deleted');
  if (!state.firebaseReady) render();
}

// ============================================================
// MODAL & UTILITIES (with focus management)
// ============================================================
function getFocusable(container) {
  return Array.prototype.slice.call(container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(function(el) { return el.offsetParent !== null || el === document.activeElement; });
}

function showModal(h){
  // Remember what to return focus to when the modal closes.
  _lastFocusedBeforeModal = document.activeElement;
  var content = document.getElementById('modal-content');
  content.innerHTML = h;
  document.getElementById('modal-overlay').classList.add('show');
  // Move focus into the dialog (first focusable, else the container).
  setTimeout(function() {
    var f = getFocusable(content);
    if (f.length) { f[0].focus(); } else { content.focus(); }
  }, 30);
}
function closeModal(){
  document.getElementById('modal-overlay').classList.remove('show');
  // Restore focus to the element that opened the modal.
  if (_lastFocusedBeforeModal && typeof _lastFocusedBeforeModal.focus === 'function') {
    try { _lastFocusedBeforeModal.focus(); } catch (e) {}
  }
  _lastFocusedBeforeModal = null;
}

// Trap Tab within an open modal; Esc closes (wired below).
function setupModalFocusTrap() {
  var overlay = document.getElementById('modal-overlay');
  overlay.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab') return;
    var content = document.getElementById('modal-content');
    var f = getFocusable(content);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

document.getElementById('modal-overlay').addEventListener('click',function(e){if(e.target===this)closeModal();});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    // Close the tour first if it's open, then the modal, then (if neither is
    // open) clear any active filters as a quick keyboard shortcut.
    var tour=document.getElementById('tour-overlay');
    if(tour&&tour.classList.contains('active')){tourEnd();return;}
    if(document.getElementById('modal-overlay').classList.contains('show')){closeModal();return;}
    if(hasAnyFilter()){clearFilters();}
  }
});
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
  { target: '#dashboard-container', title: 'Dashboard Stats', text: 'Quick overview of all ideas by status. Hover, tap, or focus + Enter a card to filter the board instantly.' },
  { target: '.view-toggle', title: 'Switch Views', text: 'Toggle between Board view (kanban columns) and List view (sortable table with bulk actions).' },
  { target: '.search-box', title: 'Search & Filter', text: 'Search by title, description, or submitter. Use the dropdowns to filter by category or priority.' },
  { target: '#board-content', title: 'Your Board', text: 'Drag cards between columns to change status, or in List view use the bulk "Change Status" control. Click, tap or focus + Enter any card/row to open its details. Everything is keyboard-reachable.' },
  { target: '.user-bar', title: 'Your Identity', text: 'Your name appears here. Use "Switch" to change it. Toggle dark/light mode, or click "Tour" to replay this guide anytime.' }
];
var _tourCurrent = 0;
var _tourFocusBefore = null;

function startTour() {
  _tourCurrent = 0;
  _tourFocusBefore = document.activeElement;
  document.getElementById('tour-overlay').classList.add('active');
  showTourStep();
}
function tourNext() { _tourCurrent++; if (_tourCurrent >= _tourSteps.length) { tourEnd(); return; } showTourStep(); }
function tourPrev() { if (_tourCurrent > 0) _tourCurrent--; showTourStep(); }
function tourEnd() {
  document.getElementById('tour-overlay').classList.remove('active');
  localStorage.setItem(LS.tourDone, '1');
  if (_tourFocusBefore && typeof _tourFocusBefore.focus === 'function') { try { _tourFocusBefore.focus(); } catch (e) {} }
  _tourFocusBefore = null;
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
    var tooltipTop = rect.bottom + window.scrollY + 12;
    var tooltipLeft = Math.max(10, Math.min(rect.left, window.innerWidth - 380));
    if (tooltipTop + 200 > window.innerHeight + window.scrollY) { tooltipTop = rect.top + window.scrollY - 180; }
    tooltip.style.top = tooltipTop + 'px';
    tooltip.style.left = tooltipLeft + 'px';
  } else {
    spotlight.style.top = '50%'; spotlight.style.left = '50%'; spotlight.style.width = '0'; spotlight.style.height = '0';
    tooltip.style.top = '50%'; tooltip.style.left = '50%'; tooltip.style.transform = 'translate(-50%, -50%)';
  }
  // Move focus into the tour so keyboard users can drive it.
  setTimeout(function() { if (nextBtn) nextBtn.focus(); }, 30);
}
function checkFirstVisit() {
  if (!localStorage.getItem(LS.tourDone)) { setTimeout(startTour, 800); }
}

// ============================================================
// PUBLIC API
// ============================================================
window.IB = {showAddIdea:showAddIdea,showEditIdea:showEditIdea,showDetail:showDetail,rowOpen:rowOpen,submitIdea:submitIdea,confirmDelete:confirmDelete,closeModal:closeModal,setView:setView,filterIdeas:filterIdeas,clearFilters:clearFilters,sortBy:sortBy,exportData:exportData,importData:importData,handleImport:handleImport,changeUser:changeUser,showCategoryManager:showCategoryManager,addCategory:addCategory,removeCategory:removeCategory,toggleTheme:toggleTheme,upvote:upvote,downvote:downvote,addComment:addComment,deleteComment:deleteComment,dashFilter:dashFilter,dashHover:dashHover,dashHoverEnd:dashHoverEnd,showManageData:showManageData,showManageUsers:showManageUsers,showOnlineUsers:showOnlineUsers,addUser:addUser,promoteUser:promoteUser,demoteUser:demoteUser,editUser:editUser,deleteUser:deleteUser,bulkToggle:bulkToggle,bulkToggleAll:bulkToggleAll,bulkClear:bulkClear,bulkChangeStatus:bulkChangeStatus,bulkChangePriority:bulkChangePriority,bulkChangeCategory:bulkChangeCategory,bulkDelete:bulkDelete,startTour:startTour,tourNext:tourNext,tourPrev:tourPrev,tourEnd:tourEnd};

init();
checkFirstVisit();
})();
