/**
 * Gateway To Future — GDPR & TDDDG § 25 Cookie Consent Manager
 * Google Analytics 4 (G-CFB6FD052Q) is strictly blocked until explicit opt-in.
 */
(function () {
  var STORAGE_KEY = "gtf_cookie_consent_v1";
  var GA_ID = "G-CFB6FD052Q";
  var gaLoaded = false;

  function getConsent() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setConsent(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      // Ignore storage errors in restricted browsing modes
    }
  }

  function loadGoogleAnalytics() {
    if (gaLoaded || document.getElementById("gtf-ga4-script")) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });

    var script = document.createElement("script");
    script.id = "gtf-ga4-script";
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(script);
  }

  function injectStyles() {
    if (document.getElementById("gtf-cookie-consent-style")) return;
    var style = document.createElement("style");
    style.id = "gtf-cookie-consent-style";
    style.textContent =
      "#gtf-cookie-banner{" +
      "position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;" +
      "max-width:720px;margin:0 auto;background:#0f172a;color:#f8fafc;" +
      "border:1px solid rgba(148,163,184,0.35);border-radius:16px;" +
      "padding:16px 20px;box-shadow:0 20px 50px rgba(15,23,42,0.38);" +
      "font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;" +
      "display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;" +
      "}" +
      "#gtf-cookie-banner .gtf-cc-text{flex:1 1 320px;font-size:13px;line-height:1.55;color:#e2e8f0;}" +
      "#gtf-cookie-banner .gtf-cc-text strong{color:#ffffff;display:block;font-size:14px;margin-bottom:4px;}" +
      "#gtf-cookie-banner .gtf-cc-text a{color:#93c5fd;text-decoration:underline;}" +
      "#gtf-cookie-banner .gtf-cc-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}" +
      "#gtf-cookie-banner button{" +
      "cursor:pointer;border-radius:10px;padding:9px 14px;font-size:12.5px;font-weight:600;" +
      "letter-spacing:0.02em;transition:background 0.15s ease,border-color 0.15s ease;white-space:nowrap;" +
      "}" +
      "#gtf-cookie-banner .gtf-cc-essential{" +
      "background:transparent;color:#f8fafc;border:1px solid rgba(148,163,184,0.55);" +
      "}" +
      "#gtf-cookie-banner .gtf-cc-essential:hover{background:rgba(255,255,255,0.08);}" +
      "#gtf-cookie-banner .gtf-cc-accept{" +
      "background:#2563eb;color:#ffffff;border:1px solid #3b82f6;" +
      "}" +
      "#gtf-cookie-banner .gtf-cc-accept:hover{background:#1d4ed8;}" +
      "@media (max-width:520px){" +
      "#gtf-cookie-banner{left:10px;right:10px;bottom:10px;padding:14px 16px;}" +
      "#gtf-cookie-banner .gtf-cc-actions{width:100%;}" +
      "#gtf-cookie-banner button{flex:1 1 auto;text-align:center;}" +
      "}";
    document.head.appendChild(style);
  }

  function removeBanner() {
    var el = document.getElementById("gtf-cookie-banner");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function showBanner() {
    if (document.getElementById("gtf-cookie-banner")) return;
    injectStyles();

    var banner = document.createElement("aside");
    banner.id = "gtf-cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookie & Analytics Preferences");
    banner.innerHTML =
      '<div class="gtf-cc-text">' +
      "<strong>Cookie &amp; Privacy Preferences (GDPR / TDDDG § 25)</strong>" +
      "We use essential storage for site functionality and optional Google Analytics (GA4) to improve our German training programs. Analytics loads only with your explicit consent. " +
      '<a href="https://app.gatewaytofuture.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> &middot; ' +
      '<a href="impressum.html">Impressum</a>' +
      "</div>" +
      '<div class="gtf-cc-actions">' +
      '<button type="button" class="gtf-cc-essential" id="gtf-cc-essential-btn">Essential Only</button>' +
      '<button type="button" class="gtf-cc-accept" id="gtf-cc-accept-btn">Accept Analytics</button>' +
      "</div>";

    document.body.appendChild(banner);

    var essentialBtn = document.getElementById("gtf-cc-essential-btn");
    var acceptBtn = document.getElementById("gtf-cc-accept-btn");

    if (essentialBtn) {
      essentialBtn.addEventListener("click", function () {
        setConsent("essential");
        removeBanner();
      });
    }
    if (acceptBtn) {
      acceptBtn.addEventListener("click", function () {
        setConsent("accepted");
        loadGoogleAnalytics();
        removeBanner();
      });
    }
  }

  function attachFooterTrigger() {
    var containers = document.querySelectorAll(".footer-bottom-links");
    containers.forEach(function (container) {
      if (container.querySelector("[data-gtf-cookie-settings]")) return;
      var sep = document.createTextNode(" • ");
      var link = document.createElement("a");
      link.href = "#cookie-settings";
      link.setAttribute("data-gtf-cookie-settings", "true");
      link.textContent = "Cookie Settings";
      link.addEventListener("click", function (ev) {
        ev.preventDefault();
        showBanner();
      });
      container.appendChild(sep);
      container.appendChild(link);
    });
  }

  window.gtfOpenCookieSettings = showBanner;

  function init() {
    attachFooterTrigger();
    var consent = getConsent();
    if (consent === "accepted") {
      loadGoogleAnalytics();
    } else if (consent !== "essential") {
      showBanner();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
