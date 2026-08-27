// Idea Board — Firebase Integration
// Handles Firebase init, real-time sync, and presence tracking

import { state, firebaseConfig, firebase as fb } from './state.js';
import { render, renderCategoryFilter } from './rendering.js';
import { loadUsers, registerUser } from './auth.js';

export function initFirebase() {
  if (firebaseConfig.apiKey === 'YOUR_API_KEY') {
    state.firebaseReady = false;
    loadFromLocalStorage();
    render();
    return;
  }
  try {
    // Uses the global firebase object loaded via <script> tags
    window.firebase.initializeApp(firebaseConfig);
    fb.db = window.firebase.database();
    state.firebaseReady = true;

    fb.db.ref('ideas').on('value', function(snap) {
      state.ideas = snap.val() || {};
      render();
    });

    fb.db.ref('categories').on('value', function(snap) {
      var c = snap.val();
      if (c) state.categories = c;
      renderCategoryFilter();
    });

    var connRef = fb.db.ref('.info/connected');
    var presRef = fb.db.ref('presence/' + state.currentUser.id);
    connRef.on('value', function(s) {
      if (s.val()) {
        presRef.set({ name: state.currentUser.name, online: true });
        presRef.onDisconnect().remove();
      }
    });

    fb.db.ref('presence').on('value', function(s) {
      state.onlineUsers = s.val() || {};
      var c = Object.keys(state.onlineUsers).length;
      document.getElementById('online-count').textContent = c + ' online';
    });

    loadUsers();
    registerUser();
  } catch (e) {
    state.firebaseReady = false;
    loadFromLocalStorage();
    render();
  }
}

export function loadFromLocalStorage() {
  var d = localStorage.getItem('ib_data');
  if (d) {
    var p = JSON.parse(d);
    state.ideas = p.ideas || {};
    if (p.categories) state.categories = p.categories;
  }
}

export function saveToLocalStorage() {
  localStorage.setItem('ib_data', JSON.stringify({
    ideas: state.ideas,
    categories: state.categories
  }));
}
