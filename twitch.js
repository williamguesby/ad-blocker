(() => {
  "use strict";

  /*
   * =====================================================
   * TWITCH AD DETECTOR
   * =====================================================
   *
   * Detects Twitch's player ad state, including the
   * "Ad" / countdown UI that appears during video ads.
   */

  let adActive = false;

  const AD_SELECTORS = [
    '[data-a-target="video-ad-label"]',
    '[data-test-selector="sad-overlay"]',
    '[data-test-selector="ad-banner-default-text"]',
    '[class*="ad-banner"]',
    '[class*="adBanner"]'
  ];


  /* ---------------- PAGE AD REMOVAL ---------------- */

  function removePageAds(root = document) {
    if (!root || !root.querySelectorAll) return;

    for (const selector of AD_SELECTORS) {
      try {
        root.querySelectorAll(selector).forEach(element => {
          /*
           * Don't remove the video-ad label yet because
           * we use it to detect the ad state.
           */
          if (
            element.matches(
              '[data-a-target="video-ad-label"]'
            )
          ) {
            continue;
          }

          element.remove();
        });
      } catch {
        // Ignore selector errors.
      }
    }
  }


  /* ---------------- AD DETECTION ---------------- */

  function findAdIndicator() {
    const selectors = [
      '[data-a-target="video-ad-label"]',
      '[data-test-selector="sad-overlay"]',
      '[data-test-selector="ad-banner-default-text"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);

      if (element) {
        return element;
      }
    }

    /*
     * Fallback:
     * Search small player text elements for Twitch's
     * visible advertisement/countdown text.
     */
    const player = document.querySelector(
      '[data-a-target="video-player"]'
    );

    if (!player) {
      return null;
    }

    const elements = player.querySelectorAll(
      "span, p, div"
    );

    for (const element of elements) {
      const text = element.textContent
        ?.trim()
        .toLowerCase();

      if (!text || text.length > 80) {
        continue;
      }

      if (
        text === "ad" ||
        text.startsWith("ad ") ||
        text.includes("advertisement")
      ) {
        return element;
      }
    }

    return null;
  }


  function checkAdState() {
    const indicator = findAdIndicator();
    const currentlyShowingAd = Boolean(indicator);

    if (currentlyShowingAd && !adActive) {
      adActive = true;

      document.documentElement.dataset
        .myAdBlockerTwitchAd = "true";

      console.info(
        "[My Ad Blocker] Twitch video ad started."
      );
    }

    if (!currentlyShowingAd && adActive) {
      adActive = false;

      delete document.documentElement.dataset
        .myAdBlockerTwitchAd;

      console.info(
        "[My Ad Blocker] Twitch video ad ended."
      );
    }

    return currentlyShowingAd;
  }


  /* ---------------- PAGE MONITOR ---------------- */

  let scheduled = false;

  function scheduleCheck() {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;

      checkAdState();
      removePageAds();
    });
  }


  function start() {
    checkAdState();
    removePageAds();

    const observer = new MutationObserver(
      scheduleCheck
    );

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    console.info(
      "[My Ad Blocker] Twitch ad detector active."
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
