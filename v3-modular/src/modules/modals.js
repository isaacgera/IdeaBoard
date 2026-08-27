// Idea Board — Modals (Idea Form, Detail View, Manage Data, Categories)

import { state, STATUSES, PRIORITIES } from './state.js';
import { escapeHtml, escapeAttr, formatDate, formatDateTime, generateId, showToast } from './utils.js';
import { saveIdea, deleteIdea, saveCategories, addAuditEntry, updateStatusDates } from './ideas.js';
import { getVoteScore, getUserVote } from './voting.js';
import { isAdmin, canEdit, canDelete, showManageUsers } from './auth.js';
import { render, getFilteredIdeas, renderCategoryFilter } from './rendering.js';

// ============================================================
// MODAL SHOW / CLOSE
// ============================================================
export function showModal(h) {
  document.getElementById('modal-content').innerHTML = h;
  document.getElementById('modal-overlay').classList.add('show');
}

export function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

export function setupModalListeners() {
  document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });
}

// ============================================================
// ADD / EDIT IDEA FORM
// ============================================================
export function showAddIdea() { showIdeaForm(null); }

export function showEditIdea(id) {
  var idea = state.ideas[id];
  if (!idea) return;
  if (!canEdit(idea)) { showToast('You can only edit your own ideas'); return; }
  showIdeaForm(idea);
}

function showIdeaForm(idea) {
  var isEdit = !!idea, title = isEdit ? 'Edit Idea' : 'New Idea';
  var catOpts = state.categories.map(function(c) { return '<option value="' + escapeHtml(c) + '"' + (idea && idea.category === c ? ' selected' : '') + '>' + escapeHtml(c) + '</option>'; }).join('');
  var statOpts = STATUSES.map(function(s) { return '<option value="' + s + '"' + (idea && idea.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('');
  var prioOpts = PRIORITIES.map(function(p) { return '<option value="' + p + '"' + (idea && idea.priority === p ? ' selected' : '') + '>' + p + '</option>'; }).join('');

  var html = '<div class="modal-header"><h2>' + title + '</h2><button class="close-btn" onclick="IB.closeModal()">&times;</button></div>';
  html += '<div class="modal-body">';
  html += '<div class="form-group"><label>Title *</label><input type="text" id="f-title" value="' + (idea ? escapeAttr(idea.title) : '') + '" placeholder="What\'s the idea?"></div>';
  html += '<div class="form-group"><label>Description</label><textarea id="f-desc" placeholder="Describe the idea in detail...">' + (idea ? escapeHtml(idea.description) : '') + '</textarea></div>';
  html += '<div class="form-group"><label>Benefits</label><textarea id="f-benefits" placeholder="What benefits does this bring?">' + (idea ? escapeHtml(idea.benefits) : '') + '</textarea></div>';
  html += '<div class="form-row"><div class="form-group"><label>Category</label><select id="f-category">' + catOpts + '</select></div><div class="form-group"><label>Priority</label><select id="f-priority">' + prioOpts + '</select></div></div>';
  html += '<div class="form-row"><div class="form-group"><label>Status</label><select id="f-status">' + statOpts + '</select></div><div class="form-group"><label>Submitted By</label><input type="text" id="f-submitter" value="' + (idea ? escapeAttr(idea.submittedBy) : escapeAttr(state.currentUser.name)) + '"></div></div>';
  html += '</div><div class="modal-footer">';
  if (isEdit) html += '<button class="btn btn-danger" onclick="IB.confirmDelete(\'' + idea.id + '\')">Delete</button>';
  html += '<button class="btn" onclick="IB.closeModal()">Cancel</button><button class="btn btn-primary" onclick="IB.submitIdea(\'' + (idea ? idea.id : '') + '\')">' + (isEdit ? 'Update' : 'Add Idea') + '</button></div>';
  showModal(html);
  setTimeout(function() { document.getElementById('f-title').focus(); }, 100);
}

export function submitIdea(existingId) {
  var title = document.getElementById('f-title').value.trim();
  if (!title) { showToast('Title is required'); return; }
  var newStatus = document.getElementById('f-status').value;
  var existing = existingId ? state.ideas[existingId] : null;
  var oldStatus = existing ? existing.status : null;

  var idea = {
    id: existingId || generateId(),
    title: title,
    description: document.getElementById('f-desc').value.trim(),
    benefits: document.getElementById('f-benefits').value.trim(),
    category: document.getElementById('f-category').value,
    priority: document.getElementById('f-priority').value,
    status: newStatus,
    submittedBy: document.getElementById('f-submitter').value.trim() || state.currentUser.name,
    createdAt: existing ? existing.createdAt : Date.now(),
    updatedAt: Date.now(),
    updatedBy: state.currentUser.name,
    comments: existing ? (existing.comments || []) : [],
    history: existing ? (existing.history || []) : [],
    dates: existing ? (existing.dates || {}) : {},
    votes: existing ? (existing.votes || {}) : {}
  };

  if (!existingId) {
    idea.dates.created = Date.now();
    addAuditEntry(idea, 'Created', 'Idea submitted by ' + idea.submittedBy);
    if (newStatus !== 'New') {
      updateStatusDates(idea, newStatus, 'New');
      addAuditEntry(idea, 'Status changed', 'New \u2192 ' + newStatus);
    }
  } else {
    var changes = [];
    if (existing.title !== idea.title) changes.push('Title');
    if (existing.description !== idea.description) changes.push('Description');
    if (existing.benefits !== idea.benefits) changes.push('Benefits');
    if (existing.category !== idea.category) changes.push('Category: ' + existing.category + ' \u2192 ' + idea.category);
    if (existing.priority !== idea.priority) changes.push('Priority: ' + existing.priority + ' \u2192 ' + idea.priority);
    if (oldStatus !== newStatus) {
      updateStatusDates(idea, newStatus, oldStatus);
      addAuditEntry(idea, 'Status changed', oldStatus + ' \u2192 ' + newStatus);
    }
    if (changes.length) addAuditEntry(idea, 'Edited', changes.join(', '));
  }
  saveIdea(idea);
  closeModal();
  showToast(existingId ? 'Idea updated' : 'Idea added');
}

// ============================================================
// DETAIL VIEW
// ============================================================
export function showDetail(id) {
  var idea = state.ideas[id];
  if (!idea) return;
  var sc = 'status-' + idea.status.toLowerCase().replace(' ', '-');
  var pc = 'priority-' + idea.priority.toLowerCase();
  var score = getVoteScore(idea), uv = getUserVote(idea);

  var html = '<div class="modal-header"><h2>' + escapeHtml(idea.title) + '</h2><button class="close-btn" onclick="IB.closeModal()">&times;</button></div>';
  html += '<div class="modal-body">';
  html += '<div class="detail-meta"><div class="detail-meta-item"><span class="status-badge ' + sc + '">' + idea.status + '</span></div><div class="detail-meta-item"><span class="card-priority ' + pc + '">' + idea.priority + '</span></div><div class="detail-meta-item"><span class="card-category">' + escapeHtml(idea.category) + '</span></div>';
  html += '<div class="detail-meta-item"><span class="detail-vote-widget"><button class="vote-btn up' + (uv === 1 ? ' active' : '') + '" onclick="IB.upvote(\'' + idea.id + '\');IB.showDetail(\'' + idea.id + '\')">&#9650;</button><span class="vote-score' + (score > 0 ? ' positive' : '') + (score < 0 ? ' negative' : '') + '">' + score + '</span><button class="vote-btn down' + (uv === -1 ? ' active' : '') + '" onclick="IB.downvote(\'' + idea.id + '\');IB.showDetail(\'' + idea.id + '\')">&#9660;</button></span></div>';
  html += '</div>';

  if (idea.description) html += '<div class="detail-section"><h4>Description</h4><p>' + escapeHtml(idea.description).replace(/\n/g, '<br>') + '</p></div>';
  if (idea.benefits) html += '<div class="detail-section"><h4>Benefits</h4><p>' + escapeHtml(idea.benefits).replace(/\n/g, '<br>') + '</p></div>';

  // Timeline
  html += '<div class="detail-section"><h4>Timeline</h4><div class="timeline">';
  var dates = idea.dates || {};
  [{ key: 'created', label: 'Created', icon: '&#9679;' }, { key: 'started', label: 'Started', icon: '&#9654;' }, { key: 'inReview', label: 'In Review', icon: '&#9733;' }, { key: 'completed', label: 'Completed', icon: '&#10003;' }].forEach(function(m) {
    var active = dates[m.key] ? ' active' : '';
    html += '<div class="timeline-item' + active + '"><span class="timeline-icon">' + m.icon + '</span><span class="timeline-label">' + m.label + '</span><span class="timeline-date">' + (dates[m.key] ? formatDateTime(dates[m.key]) : '-') + '</span></div>';
  });
  html += '</div></div>';

  // Details
  html += '<div class="detail-section"><h4>Details</h4><p style="font-size:.82rem"><strong>Submitted by:</strong> ' + escapeHtml(idea.submittedBy) + '<br><strong>Last updated:</strong> ' + (idea.updatedAt ? formatDateTime(idea.updatedAt) : 'Unknown') + (idea.updatedBy ? ' by ' + escapeHtml(idea.updatedBy) : '') + '</p></div>';

  // Version History
  var history = idea.history || [];
  html += '<div class="detail-section"><h4>Version History</h4>';
  if (history.length) {
    html += '<div class="audit-log">';
    history.slice().reverse().forEach(function(e) {
      html += '<div class="audit-entry"><span class="audit-time">' + formatDateTime(e.timestamp) + '</span><span class="audit-user">' + escapeHtml(e.user) + '</span><span class="audit-action">' + escapeHtml(e.action) + '</span>' + (e.details ? '<span class="audit-details">' + escapeHtml(e.details) + '</span>' : '') + '</div>';
    });
    html += '</div>';
  } else {
    html += '<p style="font-size:.78rem;color:var(--text-light);font-style:italic">No history yet.</p>';
  }
  html += '</div>';

  // Comments
  var comments = idea.comments || [];
  html += '<div class="comments-section"><h4>Comments (' + comments.length + ')</h4>';
  if (comments.length) {
    html += '<div class="comments-list">';
    comments.forEach(function(c) {
      html += '<div class="comment-item"><div class="comment-header"><span class="comment-user">' + escapeHtml(c.user) + '</span><span class="comment-time">' + formatDateTime(c.timestamp) + '</span>';
      if (c.user === state.currentUser.name) html += '<button class="btn btn-sm btn-danger" onclick="IB.deleteComment(\'' + idea.id + '\',\'' + c.id + '\')">x</button>';
      html += '</div><div class="comment-text">' + escapeHtml(c.text).replace(/\n/g, '<br>') + '</div></div>';
    });
    html += '</div>';
  }
  html += '<div class="comment-form"><textarea id="comment-input" placeholder="Add a comment..." rows="2"></textarea><button class="btn btn-primary btn-sm" onclick="IB.addComment(\'' + idea.id + '\')">Post</button></div>';
  html += '</div>';

  html += '</div><div class="modal-footer">';
  if (canDelete(idea)) html += '<button class="btn btn-danger" onclick="IB.confirmDelete(\'' + idea.id + '\')">Delete</button>';
  html += '<button class="btn" onclick="IB.closeModal()">Close</button>';
  if (canEdit(idea)) html += '<button class="btn btn-primary" onclick="IB.showEditIdea(\'' + idea.id + '\')">Edit</button>';
  html += '</div>';
  showModal(html);
}

// ============================================================
// DELETE
// ============================================================
export function confirmDelete(id) {
  var idea = state.ideas[id];
  if (!idea) return;
  if (!canDelete(idea)) { showToast('You can only delete your own ideas'); return; }
  if (confirm('Delete "' + idea.title + '"?')) {
    deleteIdea(id);
    closeModal();
    showToast('Idea deleted');
  }
}

// ============================================================
// CATEGORY MANAGEMENT
// ============================================================
export function addCategory() {
  var inp = document.getElementById('new-category');
  var n = inp.value.trim();
  if (!n) return;
  if (state.categories.indexOf(n) !== -1) { showToast('Already exists'); return; }
  state.categories.push(n);
  saveCategories();
  showManageData();
  showToast('Category added');
}

export function removeCategory(i) {
  if (confirm('Remove "' + state.categories[i] + '"?')) {
    state.categories.splice(i, 1);
    saveCategories();
    showManageData();
    showToast('Removed');
  }
}

// ============================================================
// MANAGE DATA MODAL
// ============================================================
export function showManageData() {
  if (!isAdmin()) { showToast('Admin access required'); return; }
  var html = '<div class="modal-header"><h2>Manage Data</h2><button class="close-btn" onclick="IB.closeModal()">&times;</button></div>';
  html += '<div class="modal-body">';

  html += '<div class="detail-section"><h4>Export &amp; Import</h4>';
  html += '<div style="display:flex;gap:.5rem;margin-bottom:.8rem;flex-wrap:wrap">';
  html += '<button class="btn btn-primary btn-sm" onclick="IB.exportData();IB.closeModal()">Export as JSON</button>';
  html += '<button class="btn btn-sm" onclick="IB.importData()">Import from JSON</button>';
  html += '</div>';
  html += '<p style="font-size:.72rem;color:var(--text-light)">Export downloads a JSON file and copies a text summary to clipboard. Import merges ideas from a JSON file.</p>';
  html += '</div>';

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

  var total = Object.keys(state.ideas).length;
  html += '<div class="detail-section"><h4>Data Summary</h4>';
  html += '<p style="font-size:.8rem">' + total + ' ideas stored ' + (state.firebaseReady ? '(synced via Firebase)' : '(local storage only)') + '</p>';
  html += '</div>';

  if (isAdmin()) {
    html += '<div class="detail-section"><h4>Administration</h4>';
    html += '<button class="btn btn-sm" onclick="IB.showManageUsers()">Manage Users &amp; Roles</button>';
    html += '</div>';
  }

  html += '</div>';
  html += '<div class="modal-footer"><button class="btn" onclick="IB.closeModal()">Close</button></div>';
  showModal(html);
}

// ============================================================
// EXPORT / IMPORT
// ============================================================
export function exportData() {
  var ideas = getFilteredIdeas();
  var text = 'IDEA BOARD EXPORT - ' + new Date().toLocaleDateString() + '\n' + '='.repeat(50) + '\n\n';
  ideas.forEach(function(idea, i) {
    text += (i + 1) + '. ' + idea.title + '\n   Status: ' + idea.status + ' | Priority: ' + idea.priority + ' | Category: ' + idea.category + ' | Votes: ' + getVoteScore(idea) + '\n   Submitted by: ' + idea.submittedBy + ' (' + (idea.createdAt ? formatDate(idea.createdAt) : '') + ')' + '\n';
    if (idea.description) text += '   Description: ' + idea.description + '\n';
    if (idea.benefits) text += '   Benefits: ' + idea.benefits + '\n';
    text += '\n';
  });
  text += '---\nTotal: ' + ideas.length + ' ideas\n';

  var json = JSON.stringify(ideas, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'idea-board-export-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() { showToast('Exported + copied'); });
  } else {
    showToast('JSON downloaded');
  }
}

export function importData() {
  document.getElementById('import-file').click();
}

export function handleImport(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      var ideas = [];
      if (Array.isArray(data)) ideas = data;
      else if (data.ideas) {
        ideas = Array.isArray(data.ideas) ? data.ideas : Object.values(data.ideas);
        if (data.categories && Array.isArray(data.categories)) {
          state.categories = data.categories;
          saveCategories();
        }
      }
      if (!ideas.length) { showToast('No ideas found'); input.value = ''; return; }
      if (!confirm('Found ' + ideas.length + ' ideas. Merge?')) { input.value = ''; return; }

      var imp = 0;
      ideas.forEach(function(idea) {
        if (!idea.title) return;
        if (!idea.id) idea.id = generateId();
        if (!idea.status) idea.status = 'New';
        if (!idea.priority) idea.priority = 'Medium';
        if (!idea.category) idea.category = state.categories[0] || 'Other';
        if (!idea.submittedBy) idea.submittedBy = state.currentUser.name;
        if (!idea.createdAt) idea.createdAt = Date.now();
        if (!idea.updatedAt) idea.updatedAt = Date.now();
        if (!idea.description) idea.description = '';
        if (!idea.benefits) idea.benefits = '';
        if (!idea.comments) idea.comments = [];
        if (!idea.history) idea.history = [];
        if (!idea.votes) idea.votes = {};
        if (!idea.dates) {
          idea.dates = { created: idea.createdAt };
          if (idea.status === 'In Progress' || idea.status === 'Review' || idea.status === 'Done') idea.dates.started = idea.createdAt;
          if (idea.status === 'Review' || idea.status === 'Done') idea.dates.inReview = idea.updatedAt || idea.createdAt;
          if (idea.status === 'Done') idea.dates.completed = idea.updatedAt || idea.createdAt;
        }
        saveIdea(idea, true);
        imp++;
      });
      showToast('Imported ' + imp + ' ideas');
      if (!state.firebaseReady) render();
    } catch (err) {
      showToast('Error: Invalid JSON');
      console.error(err);
    }
    input.value = '';
  };
  reader.readAsText(file);
}
