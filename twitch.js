(() => {
  "use strict";

  /*
   * =====================================================
   * TWITCH VIDEO AD PROTECTION
   * =====================================================
   */

  let adActive = false;
  let originalMuted = null;

  const AD_SELECTORS = [
    '[data-a-target="video-ad-label"]',
    '[data-test-selector="sad-overlay"]',
    '[data-test-selector="ad-banner-default-text"]'
  ];


  /* ---------------- FIND AD STATE ---------------- */

  function findAdIndicator() {
    for (const selector of AD_SELECTORS) {
      const element = document.querySelector(selector);

      if (element) {
        return element;
      }
    }

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


  /* ---------------- FIND VIDEO ---------------- */

  function getVideo() {
    const player = document.querySelector(
      '[data-a-target="video-player"]'
    );

    if (!player) {
      return document.querySelector("video");
    }

    return player.querySelector("video");
  }


  /* ---------------- HANDLE AD ---------------- */

  function handleAd() {
    const indicator = findAdIndicator();
    const video = getVideo();

    if (!indicator) {
      if (adActive) {
        adActive = false;

        if (video && originalMuted !== null) {
          video.muted = originalMuted;
        }

        originalMuted = null;

        console.info(
          "[My Ad Blocker] Twitch ad ended."
        );
      }

      return;
    }

    if (!adActive) {
      adActive = true;

      if (video) {
        originalMuted = video.muted;
      }

      console.info(
        "[My Ad Blocker] Twitch video ad detected."
      );
    }

    if (!video) {
      return;
    }

    /*
     * Silence the advertisement while we attempt
     * to move through its media.
     */
    video.muted = true;

    /*
     * If Twitch exposes the ad as normal seekable video,
     * jump close to its end.
     *
     * Some Twitch ads will not expose a seekable duration,
     * in which case this simply does nothing.
     */
    try {
      if (
        Number.isFinite(video.duration) &&
        video.duration > 1 &&
        video.seekable.length > 0
      ) {
        const end =
          video.seekable.end(video.seekable.length - 1);

        if (
          Number.isFinite(end) &&
          end > video.currentTime
        ) {
          video.currentTime = Math.max(
            video.currentTime,
            end - 0.05
          );
        }
      }
    } catch {
      // Twitch may prevent seeking during an ad.
    }
  }


  /* ---------------- REMOVE AD UI ---------------- */

  function removeExtraAdUI() {
    const selectors = [
      '[data-test-selector="sad-overlay"]',
      '[data-test-selector="ad-banner-default-text"]',
      '[class*="ad-banner"]',
      '[class*="adBanner"]'
    ];

    for (const selector of selectors) {
      try {
        document
          .querySelectorAll(selector)
          .forEach(element => element.remove());
      } catch {
        // Ignore Twitch DOM changes.
      }
    }
  }


  /* ---------------- MONITOR PLAYER ---------------- */

  let scheduled = false;

  function scheduleCheck() {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;

      handleAd();
      removeExtraAdUI();
    });
  }


  function start() {
    handleAd();
    removeExtraAdUI();

    const observer = new MutationObserver(
      scheduleCheck
    );

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });

    /*
     * Twitch's video state can change without a useful DOM
     * mutation, so periodically check while the page is open.
     */
    setInterval(handleAd, 500);

    console.info(
      "[My Ad Blocker] Twitch video protection active."
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
