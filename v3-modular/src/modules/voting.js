// Idea Board — Voting (Upvote / Downvote)

import { state } from './state.js';
import { saveIdea } from './ideas.js';

export function upvote(id, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  var idea = state.ideas[id];
  if (!idea) return;
  if (!idea.votes) idea.votes = {};
  var uid = state.currentUser.id;
  if (idea.votes[uid] === 1) { delete idea.votes[uid]; }
  else { idea.votes[uid] = 1; }
  saveIdea(idea);
}

export function downvote(id, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  var idea = state.ideas[id];
  if (!idea) return;
  if (!idea.votes) idea.votes = {};
  var uid = state.currentUser.id;
  if (idea.votes[uid] === -1) { delete idea.votes[uid]; }
  else { idea.votes[uid] = -1; }
  saveIdea(idea);
}

export function getVoteScore(idea) {
  if (!idea.votes) return 0;
  var score = 0;
  Object.keys(idea.votes).forEach(function(k) { score += idea.votes[k]; });
  return score;
}

export function getUserVote(idea) {
  if (!idea.votes || !state.currentUser) return 0;
  return idea.votes[state.currentUser.id] || 0;
}
