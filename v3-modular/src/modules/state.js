// Idea Board — Shared State & Constants
// Central state object shared across all modules

export const ADMIN_NAMES = ['isaac gera'];
export const STATUSES = ['New', 'In Progress', 'Review', 'Done'];
export const PRIORITIES = ['High', 'Medium', 'Low'];

export const state = {
  ideas: {},
  categories: ['Process Improvement', 'Technology', 'Customer Experience', 'Cost Saving', 'Team Culture', 'Other'],
  currentView: 'kanban',
  currentUser: null,
  firebaseReady: false,
  filters: { search: '', category: '', priority: '' },
  sort: { column: 'createdAt', direction: 'desc' },
  darkMode: false,
  dashHighlight: null,
  dashLocked: false,
  users: {},
  selectedIds: [],
  onlineUsers: {}
};

export const firebaseConfig = {
  apiKey: "AIzaSyDhHQAxUU-Dsvh6seA5USQugR7nCHvwnSI",
  authDomain: "ideaboard-iag-2026.firebaseapp.com",
  databaseURL: "https://ideaboard-iag-2026-default-rtdb.firebaseio.com",
  projectId: "ideaboard-iag-2026",
  storageBucket: "ideaboard-iag-2026.firebasestorage.app",
  messagingSenderId: "163546732868",
  appId: "1:163546732868:web:8689079b56b21850785f11"
};

// Mutable reference for the Firebase database instance
export const firebase = {
  db: null
};

// Drag state (shared between dragdrop and rendering)
export const dragState = {
  dragging: false,
  didDrag: false,
  draggedId: null
};
