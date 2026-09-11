// ============================================================
// Idea Board — Entra ID (Azure AD) Auth Config  [PROTOTYPE]
// ============================================================
// Public-client (SPA) configuration for MSAL.js. None of these values are
// secrets: the Client ID and Tenant ID are safe to ship in client-side code.
// A client SECRET must NEVER appear here — SPAs use the PKCE flow, no secret.
//
// This gate protects the APP (who can open the page). It does not lock down the
// Firebase database itself (that is a separate, future phase).
//
// EDIT THESE THREE VALUES to match the BT app registration:
//   - clientId     : Application (client) ID from the app registration
//   - tenantId     : Directory (tenant) ID (the BT tenant)
//   - redirectUri  : must EXACTLY match a redirect URI registered under the
//                    "Single-page application" platform in the app registration.
// ------------------------------------------------------------

window.IB_AUTH_CONFIG = {
  // --- BT app-registration values (SPA platform) ---
  clientId: '5dfd62e6-5070-401e-b91c-e433387c07ae',
  tenantId: 'a7f35688-9c00-4d5e-ba41-29f146377ab0',

  // The registered SPA redirect URI for the BT GitLab-hosted copy.
  redirectUri: 'https://pages.gitlab.prod.ec.devops.nat.bt.com/ideaboard-c706fb/ideaboard.html',

  // ----------------------------------------------------------
  // AUTHORIZED-SUBSET GATE
  // ----------------------------------------------------------
  // The REAL enforcement should be done Entra-side by the BT admin:
  //   App registration -> Enterprise application -> Properties ->
  //   "Assignment required?" = Yes, then assign only approved users/groups.
  // When that is on, Entra refuses to issue a token to anyone not assigned,
  // so unapproved users never even get signed in.
  //
  // The app-side checks below are a SECONDARY, UX-level gate — they give a clean
  // "not authorized" screen instead of a blank page, but a client-side list is
  // NOT a hard security boundary on its own. Prefer the Entra-side assignment.
  //
  // How the app-side gate decides "authorized":
  //   - If BOTH lists below are empty  -> any signed-in tenant user is allowed
  //     (i.e. "verified only"). Combine with Entra "Assignment required" for the
  //     real subset gate.
  //   - If allowedGroupIds is non-empty -> the signed-in user must have at least
  //     one of these Entra group object-IDs in their token's "groups" claim.
  //     (Requires the app registration to emit the groups claim; ask BT admin.)
  //   - If allowedUsers is non-empty    -> the user's UPN/email must match one
  //     entry (case-insensitive). Handy for a small, hand-maintained allow-list.
  //   - If both are set, matching EITHER one authorizes the user.

  allowedGroupIds: [
    // 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',  // e.g. an Entra security group
  ],

  allowedUsers: [
    'isaac.2.gera@bt.com',   // prototype verification — single authorized user
  ],

  // ----------------------------------------------------------
  // HOST GATING
  // ----------------------------------------------------------
  // Auth engages ONLY on these origins. Everywhere else (file://, other hosts)
  // the app stays open, so the same codebase still runs on the public GitHub
  // copy and can be opened locally without a login. This keeps the BT-internal
  // registration tied to its own origin only.
  //
  // 'localhost'/127.0.0.1 are included so you CAN exercise the real sign-in
  // locally IF you also register a localhost SPA redirect URI. If you'd rather
  // keep local fully open (no login when testing on Live Server), remove the
  // localhost entries below.
  gatedHosts: [
    'pages.gitlab.prod.ec.devops.nat.bt.com',
    // 'localhost',
    // '127.0.0.1',
  ],

  // Where to send the user after they sign out.
  postLogoutRedirectUri: 'https://pages.gitlab.prod.ec.devops.nat.bt.com/ideaboard-c706fb/ideaboard.html',
};
