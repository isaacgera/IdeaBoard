// Idea Board — Main Entry Point (v3.0 Modular)
// Imports all modules and wires the public API on window.IB

import { state } from './modules/state.js';
import { loadUser, changeUser, isAdmin, promoteUser, demoteUser, editUser, deleteUser, showOnlineUsers, showManageUsers } from './modules/auth.js';
import { initFirebase } from './modules/firebase.js';
import { render, renderCategoryFilter, filterIdeas, sortBy, setView, loadTheme, toggleTheme, dashFilter, dashHover, dashHoverEnd, dashClearOnOutsideClick } from './modules/rendering.js';
import { upvote, downvote } from './modules/voting.js';
import { addComment, deleteComment } from './modules/comments.js';
import { setupDragListeners } from './modules/dragdrop.js';
import { bulkToggle, bulkToggleAll, bulkClear, bulkChangeStatus, bulkChangePriority, bulkChangeCategory, bulkDelete } from './modules/bulk.js';
import { startTour, tourNext, tourPrev, tourEnd, checkFirstVisit } from './modules/tour.js';
import { showModal, closeModal, setupModalListeners, showAddIdea, showEditIdea, submitIdea, showDetail, confirmDelete, addCategory, removeCategory, showManageData, exportData, importData, handleImport } from './modules/modals.js';

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
  setupModalListeners();

  // Outside click clears dashboard highlight
  document.addEventListener('click', dashClearOnOutsideClick);
}

// ============================================================
// PUBLIC API (for inline onclick handlers in HTML)
// ============================================================
window.IB = {
  // Ideas
  showAddIdea,
  showEditIdea,
  showDetail,
  submitIdea,
  confirmDelete,

  // Modal
  closeModal,

  // Views & Filters
  setView,
  filterIdeas,
  sortBy,

  // Export / Import
  exportData,
  importData,
  handleImport,

  // User
  changeUser,

  // Categories
  addCategory,
  removeCategory,

  // Theme
  toggleTheme,

  // Voting
  upvote,
  downvote,

  // Comments
  addComment,
  deleteComment,

  // Dashboard
  dashFilter,
  dashHover,
  dashHoverEnd,

  // Manage Data
  showManageData,
  showManageUsers,
  showOnlineUsers,

  // User Admin
  promoteUser,
  demoteUser,
  editUser,
  deleteUser,

  // Bulk Actions
  bulkToggle,
  bulkToggleAll,
  bulkClear,
  bulkChangeStatus,
  bulkChangePriority,
  bulkChangeCategory,
  bulkDelete,

  // Tour
  startTour,
  tourNext,
  tourPrev,
  tourEnd
};

// Start the app
init();
checkFirstVisit();
