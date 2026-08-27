// Idea Board — Comments

import { state } from './state.js';
import { generateId } from './utils.js';
import { saveIdea, addAuditEntry } from './ideas.js';
import { showDetail } from './modals.js';

export function addComment(id) {
  var input = document.getElementById('comment-input');
  var text = input.value.trim();
  if (!text) return;
  var idea = state.ideas[id];
  if (!idea) return;
  if (!idea.comments) idea.comments = [];
  idea.comments.push({
    id: generateId(),
    user: state.currentUser.name,
    text: text,
    timestamp: Date.now()
  });
  idea.updatedAt = Date.now();
  idea.updatedBy = state.currentUser.name;
  addAuditEntry(idea, 'Comment added', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
  saveIdea(idea, true);
  showDetail(id);
}

export function deleteComment(ideaId, commentId) {
  var idea = state.ideas[ideaId];
  if (!idea || !idea.comments) return;
  idea.comments = idea.comments.filter(function(c) { return c.id !== commentId; });
  saveIdea(idea, true);
  showDetail(ideaId);
}
