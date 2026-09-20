(() => {
  "use strict";

  /*
   * YouTube module
   * Handles ad elements and detects when YouTube's player
   * enters an advertising state.
   */

  const AD_SELECTORS = [
    "ytd-display-ad-renderer",
    "ytd-promoted-sparkles-web-renderer",
    "ytd-promoted-video-renderer",
    "ytd-ad-slot-renderer",
    "ytd-in-feed-ad-layout-renderer",
    "ytd-banner-promo-renderer",
    "ytd-companion-slot-renderer",
    "#masthead-ad"
  ];

  function removePageAds(root = document) {
    if (!root.querySelectorAll) return;

    for (const selector of AD_SELECTORS) {
      try {
        root.querySelectorAll(selector).forEach(ad => ad.remove());
      } catch {}
    }
  }

  /*
   * YouTube adds an "ad-showing" class to the player during
   * many in-video advertisements.
   */
  function handleVideoAd() {
    const player = document.querySelector("#movie_player");

    if (!player) return;

    const adShowing = player.classList.contains("ad-showing");

    if (!adShowing) return;

    /*
     * Prefer YouTube's own Skip Ad control whenever it exists.
     */
    const skipButton = document.querySelector(
      ".ytp-skip-ad-button, " +
      ".ytp-ad-skip-button, " +
      ".ytp-ad-skip-button-modern"
    );

    if (skipButton) {
      skipButton.click();
    }
  }

  let scheduled = false;

  function scheduleCheck() {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;

      removePageAds();
      handleVideoAd();
    });
  }

  function start() {
    removePageAds();
    handleVideoAd();

    const observer = new MutationObserver(scheduleCheck);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    console.info(
      "[My Ad Blocker] YouTube protection active."
    );
  }

  if (document.documentElement) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start, {
      once: true
    });
  }
})();
