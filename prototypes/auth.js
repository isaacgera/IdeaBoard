// ============================================================
// Idea Board — Entra ID (Azure AD) Auth Gate  [PROTOTYPE]
// ============================================================
// Wraps app start-up in a sign-in gate using MSAL.js (public-client PKCE flow).
//
// Flow:
//   1. If the current host is NOT in gatedHosts -> skip auth, start the app.
//   2. Otherwise initialise MSAL, handle any redirect response.
//   3. If no signed-in account -> show the gate screen with a Sign in button.
//   4. On sign-in, verify the account is AUTHORIZED (group/user allow-list).
//      - authorized   -> start the app, wire the identity into it.
//      - unauthorized -> show a "not authorized" screen with Sign out.
//
// IB_AUTH is the public surface used by ideaboard.html buttons.
// window.IB_startApp() is defined by app-proto.js and boots the real app once.
// ------------------------------------------------------------
(function () {
  'use strict';

  var cfg = window.IB_AUTH_CONFIG || {};
  var msalInstance = null;
  var account = null;

  // ---- Small DOM helpers for the gate screen ----
  function gateEl() { return document.getElementById('auth-gate'); }
  function show(html) {
    var g = gateEl();
    if (!g) return;
    g.querySelector('.auth-card').innerHTML = html;
    g.classList.add('show');
  }
  function hideGate() {
    var g = gateEl();
    if (g) g.classList.remove('show');
  }

  function isGatedHost() {
    var host = location.hostname;
    var list = cfg.gatedHosts || [];
    // Also treat file:// (empty hostname) as ungated.
    if (!host) return false;
    return list.indexOf(host) !== -1;
  }

  // ---- Authorization: is this signed-in account allowed in? ----
  function isAuthorized(acct) {
    if (!acct) return false;
    var groups = (cfg.allowedGroupIds || []).filter(Boolean);
    var users = (cfg.allowedUsers || []).filter(Boolean);

    // No app-side lists configured => any verified tenant user is allowed.
    // (Real subset enforcement is expected to be Entra "Assignment required".)
    if (!groups.length && !users.length) return true;

    // Group match: token must carry a "groups" claim with an allowed id.
    if (groups.length) {
      var claims = acct.idTokenClaims || {};
      var tokenGroups = claims.groups || [];
      for (var i = 0; i < tokenGroups.length; i++) {
        if (groups.indexOf(tokenGroups[i]) !== -1) return true;
      }
    }

    // User match: UPN / preferred_username / email (case-insensitive).
    if (users.length) {
      var lower = users.map(function (u) { return String(u).toLowerCase(); });
      var candidates = [];
      var c = acct.idTokenClaims || {};
      if (acct.username) candidates.push(acct.username);
      if (c.preferred_username) candidates.push(c.preferred_username);
      if (c.upn) candidates.push(c.upn);
      if (c.email) candidates.push(c.email);
      for (var j = 0; j < candidates.length; j++) {
        if (lower.indexOf(String(candidates[j]).toLowerCase()) !== -1) return true;
      }
    }

    return false;
  }

  // ---- Screens ----
  function screenSignIn() {
    show(
      '<div class="auth-logo"><img src="icon-192.png" alt="Idea Board" width="56" height="56"></div>' +
      '<h1>Idea Board</h1>' +
      '<p class="auth-sub">This board is restricted to authorized BT users.</p>' +
      '<button class="auth-btn" id="auth-signin">Sign in with Microsoft</button>' +
      '<p class="auth-note">You will be redirected to your organisation sign-in.</p>'
    );
    var btn = document.getElementById('auth-signin');
    if (btn) btn.addEventListener('click', signIn);
  }

  function screenUnauthorized(acct) {
    var who = acct && acct.username ? acct.username : 'this account';
    show(
      '<div class="auth-logo"><img src="icon-192.png" alt="Idea Board" width="56" height="56"></div>' +
      '<h1>Access denied</h1>' +
      '<p class="auth-sub">You are signed in as <strong>' + escapeText(who) + '</strong>, ' +
      'but this account is not authorized to use Idea Board.</p>' +
      '<p class="auth-note">If you believe this is a mistake, ask an administrator to grant you access.</p>' +
      '<button class="auth-btn auth-btn-secondary" id="auth-signout">Sign out</button>'
    );
    var btn = document.getElementById('auth-signout');
    if (btn) btn.addEventListener('click', signOut);
  }

  function screenError(msg) {
    show(
      '<div class="auth-logo"><img src="icon-192.png" alt="Idea Board" width="56" height="56"></div>' +
      '<h1>Sign-in problem</h1>' +
      '<p class="auth-sub">' + escapeText(msg || 'Something went wrong during sign-in.') + '</p>' +
      '<button class="auth-btn" id="auth-retry">Try again</button>'
    );
    var btn = document.getElementById('auth-retry');
    if (btn) btn.addEventListener('click', function () { location.reload(); });
  }

  function escapeText(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---- MSAL actions ----
  var loginRequest = { scopes: ['User.Read'] };

  function signIn() {
    if (!msalInstance) return;
    msalInstance.loginRedirect(loginRequest).catch(function (e) {
      screenError(e && e.message ? e.message : 'Login failed.');
    });
  }

  function signOut() {
    if (!msalInstance) return;
    var req = {};
    if (account) req.account = account;
    if (cfg.postLogoutRedirectUri) req.postLogoutRedirectUri = cfg.postLogoutRedirectUri;
    msalInstance.logoutRedirect(req);
  }

  // ---- Authorized: hand identity to the app and boot it ----
  function proceedAuthorized(acct) {
    account = acct;
    var claims = acct.idTokenClaims || {};
    window.IB_AUTH_IDENTITY = {
      name: acct.name || claims.name || acct.username || 'BT User',
      username: acct.username || claims.preferred_username || claims.upn || '',
      // stable per-user id from the token; falls back to username
      oid: claims.oid || claims.sub || acct.username || ''
    };
    hideGate();
    if (typeof window.IB_startApp === 'function') {
      window.IB_startApp();
    }
  }

  // ---- Entry point ----
  function begin() {
    // Ungated host (file://, GitHub public copy, local without gating):
    // start the app immediately, no login.
    if (!isGatedHost()) {
      if (typeof window.IB_startApp === 'function') window.IB_startApp();
      return;
    }

    // Gated host but MSAL library not loaded (offline/CDN blocked): fail closed
    // with a clear message rather than silently opening the board.
    if (typeof msal === 'undefined') {
      screenError('The sign-in library could not be loaded. Check your connection and try again.');
      return;
    }

    // Config sanity: refuse to run the gate with placeholder values.
    if (!cfg.clientId || cfg.clientId.indexOf('PASTE-') === 0 ||
        !cfg.tenantId || cfg.tenantId.indexOf('PASTE-') === 0) {
      screenError('Auth is not configured yet (missing Client ID / Tenant ID in auth-config.js).');
      return;
    }

    msalInstance = new msal.PublicClientApplication({
      auth: {
        clientId: cfg.clientId,
        authority: 'https://login.microsoftonline.com/' + cfg.tenantId,
        redirectUri: cfg.redirectUri || location.href,
        postLogoutRedirectUri: cfg.postLogoutRedirectUri || (cfg.redirectUri || location.href)
      },
      cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false }
    });

    msalInstance.handleRedirectPromise()
      .then(function (resp) {
        if (resp && resp.account) {
          msalInstance.setActiveAccount(resp.account);
        }
        var acct = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0] || null;

        if (!acct) {
          screenSignIn();
          return;
        }
        if (!isAuthorized(acct)) {
          screenUnauthorized(acct);
          return;
        }
        proceedAuthorized(acct);
      })
      .catch(function (e) {
        screenError(e && e.message ? e.message : 'Sign-in failed.');
      });
  }

  // Public surface for header buttons / app use.
  window.IB_AUTH = {
    signOut: signOut,
    getIdentity: function () { return window.IB_AUTH_IDENTITY || null; },
    isGated: isGatedHost
  };

  // Kick off once the DOM is ready.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', begin);
  } else {
    begin();
  }
})();
