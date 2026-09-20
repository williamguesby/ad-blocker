(() => {
  "use strict";

  /*
   * =====================================================
   * TWITCH AD PROTECTION
   * =====================================================
   */

  const AD_SELECTORS = [
    '[data-a-target="video-ad-label"]',
    '[data-test-selector="sad-overlay"]',
    '[data-test-selector="ad-banner-default-text"]',
    '[class*="ad-banner"]',
    '[class*="adBanner"]'
  ];

  function removeTwitchPageAds(root = document) {
    if (!root || !root.querySelectorAll) return;

    for (const selector of AD_SELECTORS) {
      try {
        root.querySelectorAll(selector).forEach(element => {
          element.remove();
        });
      } catch {
        // Ignore selector errors if Twitch changes its page.
      }
    }
  }


  /*
   * Detect when Twitch indicates that an advertisement
   * is currently being shown.
   */

  function detectVideoAd() {
    const adLabel = document.querySelector(
      '[data-a-target="video-ad-label"], ' +
      '[data-test-selector="sad-overlay"], ' +
      '[data-test-selector="ad-banner-default-text"]'
    );

    if (adLabel) {
      document.documentElement.dataset.myAdBlockerTwitchAd = "true";

      console.info(
        "[My Ad Blocker] Twitch advertisement detected."
      );

      return true;
    }

    delete document.documentElement.dataset.myAdBlockerTwitchAd;

    return false;
  }


  /*
   * =====================================================
   * PAGE MONITOR
   * =====================================================
   */

  let scheduled = false;

  function scheduleCheck() {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;

      removeTwitchPageAds();
      detectVideoAd();
    });
  }

  function start() {
    removeTwitchPageAds();
    detectVideoAd();

    const observer = new MutationObserver(scheduleCheck);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    console.info(
      "[My Ad Blocker] Twitch protection active."
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
