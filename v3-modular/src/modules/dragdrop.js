// Idea Board — Drag and Drop

import { state, STATUSES, dragState } from './state.js';
import { saveIdea, addAuditEntry, updateStatusDates } from './ideas.js';
import { showToast } from './utils.js';
import { render } from './rendering.js';
import { showDetail } from './modals.js';

export function setupDragListeners() {
  var bc = document.getElementById('board-content');

  bc.addEventListener('dragstart', function(e) {
    var card = e.target.closest('.idea-card');
    if (!card) return;
    dragState.dragging = true;
    dragState.didDrag = false;
    dragState.draggedId = card.getAttribute('data-id');
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragState.draggedId);
    try { e.dataTransfer.setDragImage(card, 50, 20); } catch (err) {}
  });

  bc.addEventListener('drag', function() { dragState.didDrag = true; });

  bc.addEventListener('dragend', function(e) {
    var card = e.target.closest('.idea-card');
    if (card) card.classList.remove('dragging');
    dragState.dragging = false;
    document.querySelectorAll('.kanban-column').forEach(function(c) { c.classList.remove('drag-over'); });
    document.querySelectorAll('.idea-card').forEach(function(c) { c.classList.remove('drop-above', 'drop-below'); });
    setTimeout(function() { dragState.didDrag = false; }, 50);
  });

  bc.addEventListener('dragover', function(e) {
    var col = e.target.closest('.kanban-column');
    if (!col) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    var card = e.target.closest('.idea-card');
    col.querySelectorAll('.idea-card').forEach(function(c) { c.classList.remove('drop-above', 'drop-below'); });
    if (card && card.getAttribute('data-id') !== dragState.draggedId) {
      var r = card.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) card.classList.add('drop-above');
      else card.classList.add('drop-below');
    }
  });

  bc.addEventListener('dragenter', function(e) {
    e.preventDefault();
    var c = e.target.closest('.kanban-column');
    if (c) c.classList.add('drag-over');
  });

  bc.addEventListener('dragleave', function(e) {
    var c = e.target.closest('.kanban-column');
    if (c && !c.contains(e.relatedTarget)) {
      c.classList.remove('drag-over');
      c.querySelectorAll('.idea-card').forEach(function(x) { x.classList.remove('drop-above', 'drop-below'); });
    }
  });

  bc.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var col = e.target.closest('.kanban-column');
    if (!col) return;
    col.classList.remove('drag-over');
    var id = e.dataTransfer.getData('text/plain') || dragState.draggedId;
    if (!id) return;
    var newStatus = col.getAttribute('data-status');
    var idea = state.ideas[id];
    if (!idea) return;
    var oldStatus = idea.status;
    var statusChanged = (oldStatus !== newStatus);

    var targetCard = e.target.closest('.idea-card');
    var dropBefore = null;
    if (targetCard && targetCard.getAttribute('data-id') !== id) {
      var r = targetCard.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        dropBefore = targetCard.getAttribute('data-id');
      } else {
        var nx = targetCard.nextElementSibling;
        if (nx && nx.classList.contains('idea-card')) dropBefore = nx.getAttribute('data-id');
      }
    }

    var colIdeas = [];
    Object.keys(state.ideas).forEach(function(iid) {
      var i = state.ideas[iid];
      if (iid === id) return;
      if (i.status === newStatus) colIdeas.push(i);
    });
    colIdeas.sort(function(a, b) {
      var oa = a.sortOrder !== undefined ? a.sortOrder : 99999;
      var ob = b.sortOrder !== undefined ? b.sortOrder : 99999;
      if (oa !== ob) return oa - ob;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    var insertIdx = colIdeas.length;
    if (dropBefore) {
      for (var i = 0; i < colIdeas.length; i++) {
        if (colIdeas[i].id === dropBefore) { insertIdx = i; break; }
      }
    }
    colIdeas.splice(insertIdx, 0, idea);
    colIdeas.forEach(function(item, idx) { item.sortOrder = (idx + 1) * 10; });

    if (statusChanged) {
      updateStatusDates(idea, newStatus, oldStatus);
      addAuditEntry(idea, 'Status changed', oldStatus + ' \u2192 ' + newStatus);
      idea.status = newStatus;
      idea.updatedAt = Date.now();
      idea.updatedBy = state.currentUser.name;
    }

    colIdeas.forEach(function(item) { saveIdea(item, true); });
    document.querySelectorAll('.idea-card').forEach(function(c) { c.classList.remove('drop-above', 'drop-below'); });
    if (statusChanged) showToast('Moved to ' + newStatus);
    dragState.didDrag = true;
    if (!state.firebaseReady) render();
  });

  // Click on card (not drag)
  bc.addEventListener('click', function(e) {
    if (dragState.didDrag) return;
    if (e.target.closest('.vote-btn')) return;
    var card = e.target.closest('.idea-card');
    if (card) {
      var id = card.getAttribute('data-id');
      if (id) showDetail(id);
    }
  });
}
