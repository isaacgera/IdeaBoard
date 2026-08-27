// Idea Board — Bulk Actions (List View)

import { state, STATUSES, PRIORITIES } from './state.js';
import { saveIdea, deleteIdea, addAuditEntry, updateStatusDates } from './ideas.js';
import { canEdit, canDelete, canChangeStatus, isAdmin } from './auth.js';
import { render, getFilteredIdeas } from './rendering.js';
import { showToast } from './utils.js';

export function bulkToggle(id, e) {
  if (e) e.stopPropagation();
  var idx = state.selectedIds.indexOf(id);
  if (idx !== -1) { state.selectedIds.splice(idx, 1); }
  else { state.selectedIds.push(id); }
  render();
}

export function bulkToggleAll(e) {
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

export function bulkClear() {
  state.selectedIds = [];
  render();
}

export function bulkChangeStatus(newStatus) {
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

export function bulkChangePriority(newPriority) {
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

export function bulkChangeCategory(newCategory) {
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

export function bulkDelete() {
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
