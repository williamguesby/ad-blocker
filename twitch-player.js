(() => {
  "use strict";

  /*
   * =====================================================
   * MY AD BLOCKER — TWITCH PLAYER MODULE
   * =====================================================
   *
   * Runs in Twitch's page context.
   * Kept separate from twitch.js so player-level behavior
   * can be developed without breaking the ad detector.
   */

  if (window.__myAdBlockerTwitchPlayerLoaded) {
    return;
  }

  window.__myAdBlockerTwitchPlayerLoaded = true;

  let adActive = false;

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

  /*
   * twitch.js places this attribute on <html> when it
   * detects Twitch's visible advertisement state.
   */
  function readAdState() {
    const active =
      document.documentElement.dataset.myAdBlockerTwitchAd ===
      "true";

    setAdState(active);
  }

  function start() {
    readAdState();

    const observer = new MutationObserver(readAdState);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-my-ad-blocker-twitch-ad"]
    });

    console.info(
      "[My Ad Blocker] Twitch player module active."
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
