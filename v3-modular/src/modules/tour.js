// Idea Board — Intro Tour

var _tourSteps = [
  { target: 'header', title: 'Welcome to Idea Board!', text: 'This is your team innovation tracker. Capture, discuss, and prioritise ideas together in real-time.' },
  { target: '.toolbar .btn-primary', title: 'Add New Ideas', text: 'Click here to submit a new idea. Fill in the title, description, benefits, category, and priority.' },
  { target: '#dashboard-container', title: 'Dashboard Stats', text: 'Quick overview of all ideas by status. Hover or click a card to filter the board instantly.' },
  { target: '.view-toggle', title: 'Switch Views', text: 'Toggle between Board view (kanban columns) and List view (sortable table with bulk actions).' },
  { target: '.search-box', title: 'Search & Filter', text: 'Search by title, description, or submitter. Use the dropdowns to filter by category or priority.' },
  { target: '#board-content', title: 'Your Board', text: 'Drag cards between columns to change status. Click any card to see details, comment, or vote. In List view, use checkboxes for bulk actions.' },
  { target: '.user-bar', title: 'Your Identity', text: 'Your name appears here. Use "Switch" to change it. Toggle dark/light mode, or click "Tour" to replay this guide anytime.' }
];

var _tourCurrent = 0;

export function startTour() {
  _tourCurrent = 0;
  document.getElementById('tour-overlay').classList.add('active');
  showTourStep();
}

export function tourNext() {
  _tourCurrent++;
  if (_tourCurrent >= _tourSteps.length) { tourEnd(); return; }
  showTourStep();
}

export function tourPrev() {
  if (_tourCurrent > 0) _tourCurrent--;
  showTourStep();
}

export function tourEnd() {
  document.getElementById('tour-overlay').classList.remove('active');
  localStorage.setItem('ib_tour_done', '1');
}

function showTourStep() {
  var step = _tourSteps[_tourCurrent];
  var el = document.querySelector(step.target);
  var spotlight = document.getElementById('tour-spotlight');
  var tooltip = document.getElementById('tour-tooltip');
  var content = document.getElementById('tour-content');
  var indicator = document.getElementById('tour-indicator');
  var prevBtn = document.getElementById('tour-prev');
  var nextBtn = document.getElementById('tour-next');

  content.innerHTML = '<h3>' + step.title + '</h3><p>' + step.text + '</p>';
  indicator.textContent = (_tourCurrent + 1) + ' of ' + _tourSteps.length;
  prevBtn.style.display = _tourCurrent === 0 ? 'none' : '';
  nextBtn.textContent = _tourCurrent === _tourSteps.length - 1 ? 'Finish' : 'Next';

  if (el) {
    var rect = el.getBoundingClientRect();
    var pad = 8;
    spotlight.style.top = (rect.top - pad + window.scrollY) + 'px';
    spotlight.style.left = (rect.left - pad) + 'px';
    spotlight.style.width = (rect.width + pad * 2) + 'px';
    spotlight.style.height = (rect.height + pad * 2) + 'px';

    var tooltipTop = rect.bottom + window.scrollY + 12;
    var tooltipLeft = Math.max(10, Math.min(rect.left, window.innerWidth - 380));
    if (tooltipTop + 200 > window.innerHeight + window.scrollY) {
      tooltipTop = rect.top + window.scrollY - 180;
    }
    tooltip.style.top = tooltipTop + 'px';
    tooltip.style.left = tooltipLeft + 'px';
  } else {
    spotlight.style.top = '50%';
    spotlight.style.left = '50%';
    spotlight.style.width = '0';
    spotlight.style.height = '0';
    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
  }
}

export function checkFirstVisit() {
  if (!localStorage.getItem('ib_tour_done')) {
    setTimeout(startTour, 800);
  }
}
