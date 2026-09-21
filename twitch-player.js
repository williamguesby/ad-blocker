(() => {
  "use strict";

  /*
   * =====================================================
   * MY AD BLOCKER — TWITCH PLAYER MODULE
   * =====================================================
   *
   * Runs in Twitch's MAIN page context.
   *
   * Current purpose:
   * 1. Receive the ad-state signal from twitch.js.
   * 2. Check whether Twitch's playlist requests are visible
   *    through the page's normal Fetch/XHR APIs.
   *
   * This version DOES NOT modify network responses.
   */

  if (window.__myAdBlockerTwitchPlayerLoaded) {
    return;
  }

  window.__myAdBlockerTwitchPlayerLoaded = true;

  let adActive = false;

  /* ---------------- AD STATE ---------------- */

  function setAdState(active) {
    if (active === adActive) {
      return;
    }

    adActive = active;

    if (active) {
      console.info(
        "[My Ad Blocker] Twitch player entered ad mode."
      );
    } else {
      console.info(
        "[My Ad Blocker] Twitch player returned to live mode."
      );
    }
  }

  function readAdState() {
    const active =
      document.documentElement.dataset.myAdBlockerTwitchAd ===
      "true";

    setAdState(active);
  }

  /* ---------------- PLAYLIST DIAGNOSTICS ---------------- */

  function looksLikePlaylist(url) {
    if (typeof url !== "string") {
      return false;
    }

    return (
      url.includes(".m3u8") ||
      url.includes("usher.ttvnw.net")
    );
  }

  /*
   * Watch window.fetch().
   *
   * We deliberately do NOT print the complete Twitch URL
   * because playlist URLs can contain temporary tokens.
   */
  const originalFetch = window.fetch;

  if (typeof originalFetch === "function") {
    window.fetch = function (...args) {
      try {
        const input = args[0];

        const url =
          typeof input === "string"
            ? input
            : input?.url || "";

        if (looksLikePlaylist(url)) {
          console.info(
            "[My Ad Blocker] Twitch playlist observed through fetch."
          );
        }
      } catch {
        // Diagnostic only. Never interfere with playback.
      }

      return originalFetch.apply(this, args);
    };
  }

  /*
   * Watch XMLHttpRequest as well.
   */
  const originalXHROpen =
    XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (
    method,
    url,
    ...rest
  ) {
    try {
      if (looksLikePlaylist(String(url))) {
        console.info(
          "[My Ad Blocker] Twitch playlist observed through XHR."
        );
      }
    } catch {
      // Diagnostic only.
    }

    return originalXHROpen.call(
      this,
      method,
      url,
      ...rest
    );
  };

  /* ---------------- START ---------------- */

  function start() {
    readAdState();

    const observer = new MutationObserver(readAdState);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "data-my-ad-blocker-twitch-ad"
      ]
    });

    console.info(
      "[My Ad Blocker] Twitch player module active."
    );

    console.info(
      "[My Ad Blocker] Twitch playlist diagnostics active."
    );
  }

  if (document.documentElement) {
    start();
  } else {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  }
})();
