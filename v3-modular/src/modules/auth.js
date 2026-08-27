// Idea Board — User Management & RBAC

import { state, ADMIN_NAMES, firebase as fb } from './state.js';
import { showToast } from './utils.js';
import { render } from './rendering.js';
import { closeModal, showModal } from './modals.js';
import { escapeHtml } from './utils.js';
import { generateId } from './utils.js';
import { saveIdea, addAuditEntry } from './ideas.js';

// ============================================================
// USER IDENTITY
// ============================================================
export function loadUser() {
  var saved = localStorage.getItem('ib_user');
  if (saved) {
    state.currentUser = JSON.parse(saved);
  } else {
    promptUser();
  }
  updateUserDisplay();
}

export function promptUser() {
  var name = '';
  while (!name || !name.trim()) {
    name = prompt('Welcome to Idea Board!\n\nPlease enter your full name to continue:');
    if (name === null) name = '';
  }
  state.currentUser = { id: generateId(), name: name.trim() };
  localStorage.setItem('ib_user', JSON.stringify(state.currentUser));
  updateUserDisplay();
}

export function changeUser() {
  var name = prompt('Enter your name:', state.currentUser ? state.currentUser.name : '');
  if (name === null) return;
  if (!name.trim()) name = 'Anonymous';
  state.currentUser.name = name.trim();
  localStorage.setItem('ib_user', JSON.stringify(state.currentUser));

  var isHardcodedAdmin = ADMIN_NAMES.indexOf(state.currentUser.name.toLowerCase()) !== -1;
  state.users[state.currentUser.id] = { name: state.currentUser.name, role: isHardcodedAdmin ? 'admin' : 'contributor', lastSeen: Date.now() };

  if (state.firebaseReady) {
    fb.db.ref('presence/' + state.currentUser.id).update({ name: state.currentUser.name });
    registerUser();
  }
  closeModal();
  state.selectedIds = [];
  updateUserDisplay();
  render();
  showToast('Switched to ' + state.currentUser.name + (isAdmin() ? ' (Admin)' : ''));
}

export function updateUserDisplay() {
  if (!state.currentUser) return;
  document.getElementById('user-display').textContent = state.currentUser.name;
  document.getElementById('user-avatar').textContent = state.currentUser.name.charAt(0).toUpperCase();
  var roleBadge = isAdmin() ? ' (Admin)' : '';
  document.getElementById('user-display').textContent = state.currentUser.name + roleBadge;
}

// ============================================================
// RBAC
// ============================================================
export function isAdmin() {
  if (!state.currentUser) return false;
  if (ADMIN_NAMES.indexOf(state.currentUser.name.toLowerCase()) !== -1) return true;
  var userRecord = state.users[state.currentUser.id];
  if (userRecord && userRecord.role === 'admin') return true;
  return false;
}

export function canEdit(idea) {
  if (!idea || !state.currentUser) return false;
  if (isAdmin()) return true;
  return idea.submittedBy === state.currentUser.name;
}

export function canDelete(idea) {
  return canEdit(idea);
}

export function canChangeStatus(idea) {
  return true;
}

// ============================================================
// USER REGISTRATION & MANAGEMENT
// ============================================================
export function registerUser() {
  if (!state.firebaseReady || !state.currentUser) return;
  var isHardcodedAdmin = ADMIN_NAMES.indexOf(state.currentUser.name.toLowerCase()) !== -1;
  var role = isHardcodedAdmin ? 'admin' : 'contributor';
  fb.db.ref('users/' + state.currentUser.id).set({
    name: state.currentUser.name,
    role: role,
    lastSeen: Date.now()
  });
  state.users[state.currentUser.id] = { name: state.currentUser.name, role: role, lastSeen: Date.now() };
}

export function loadUsers() {
  if (!state.firebaseReady) return;
  fb.db.ref('users').on('value', function(snap) {
    state.users = snap.val() || {};
    updateUserDisplay();
  });
}

export function promoteUser(userId) {
  if (!isAdmin()) { showToast('Only admins can promote users'); return; }
  if (state.firebaseReady) {
    fb.db.ref('users/' + userId + '/role').set('admin');
    showToast('User promoted to admin');
  } else {
    state.users[userId].role = 'admin';
    showToast('User promoted to admin');
  }
  showManageUsers();
}

export function demoteUser(userId) {
  if (!isAdmin()) { showToast('Only admins can demote users'); return; }
  if (state.firebaseReady) {
    fb.db.ref('users/' + userId + '/role').set('contributor');
    showToast('User demoted to contributor');
  } else {
    state.users[userId].role = 'contributor';
    showToast('User demoted to contributor');
  }
  showManageUsers();
}

export function editUser(userId) {
  if (!isAdmin()) { showToast('Admin access required'); return; }
  var user = state.users[userId];
  if (!user) return;
  var oldName = user.name;
  var newName = prompt('Rename user "' + oldName + '" to:', oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;
  newName = newName.trim();

  if (state.firebaseReady) {
    fb.db.ref('users/' + userId + '/name').set(newName);
  } else {
    state.users[userId].name = newName;
  }

  Object.keys(state.ideas).forEach(function(id) {
    var idea = state.ideas[id];
    var changed = false;
    if (idea.submittedBy === oldName) { idea.submittedBy = newName; changed = true; }
    if (idea.updatedBy === oldName) { idea.updatedBy = newName; changed = true; }
    if (idea.comments) {
      idea.comments.forEach(function(c) { if (c.user === oldName) c.user = newName; });
      changed = true;
    }
    if (idea.history) {
      idea.history.forEach(function(h) { if (h.user === oldName) h.user = newName; });
      changed = true;
    }
    if (changed) saveIdea(idea, true);
  });

  showToast('User renamed: ' + oldName + ' \u2192 ' + newName);
  if (!state.firebaseReady) render();
  showManageUsers();
}

export function deleteUser(userId) {
  if (!isAdmin()) { showToast('Admin access required'); return; }
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

  if (state.firebaseReady) {
    fb.db.ref('users/' + userId).remove();
    fb.db.ref('presence/' + userId).remove();
  } else {
    delete state.users[userId];
  }

  showToast('User "' + userName + '" deleted. Ideas reassigned to ' + adminName);
  if (!state.firebaseReady) render();
  showManageUsers();
}

export function showOnlineUsers() {
  if (!isAdmin()) return;
  var html = '<div class="modal-header"><h2>Online Users</h2><button class="close-btn" onclick="IB.closeModal()">&times;</button></div>';
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

export function showManageUsers() {
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
