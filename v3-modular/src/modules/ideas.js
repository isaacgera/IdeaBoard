// Idea Board — Idea CRUD, Audit Log, Data Operations

import { state, firebase as fb } from './state.js';
import { saveToLocalStorage } from './firebase.js';
import { render } from './rendering.js';

// ============================================================
// SAVE / DELETE
// ============================================================
export function saveIdea(idea, skipRender) {
  if (state.firebaseReady) {
    fb.db.ref('ideas/' + idea.id).set(idea);
  } else {
    state.ideas[idea.id] = idea;
    saveToLocalStorage();
    if (!skipRender) render();
  }
}

export function deleteIdea(id) {
  if (state.firebaseReady) {
    fb.db.ref('ideas/' + id).remove();
  } else {
    delete state.ideas[id];
    saveToLocalStorage();
    render();
  }
}

export function saveCategories() {
  if (state.firebaseReady) {
    fb.db.ref('categories').set(state.categories);
  } else {
    saveToLocalStorage();
  }
}

// ============================================================
// AUDIT LOG
// ============================================================
export function addAuditEntry(idea, action, details) {
  if (!idea.history) idea.history = [];
  idea.history.push({
    timestamp: Date.now(),
    user: state.currentUser.name,
    action: action,
    details: details || ''
  });
}

export function updateStatusDates(idea, newStatus, oldStatus) {
  if (!idea.dates) idea.dates = {};
  if (!idea.dates.created) idea.dates.created = idea.createdAt || Date.now();
  if (newStatus === 'In Progress' && oldStatus !== 'In Progress') idea.dates.started = Date.now();
  if (newStatus === 'Review' && oldStatus !== 'Review') idea.dates.inReview = Date.now();
  if (newStatus === 'Done' && oldStatus !== 'Done') idea.dates.completed = Date.now();
}
