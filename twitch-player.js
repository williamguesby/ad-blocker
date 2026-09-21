(() => {
  "use strict";

  /*
   * =====================================================
   * MY AD BLOCKER — TWITCH PLAYER MODULE
   * =====================================================
   *
   * Runs in Twitch's MAIN page context.
   *
   * Current jobs:
   * 1. Receive the ad-state signal from twitch.js.
   * 2. Watch page-level Fetch/XHR for HLS playlists.
   * 3. Detect Web Workers created by Twitch.
   *
   * DIAGNOSTIC ONLY:
   * This version does not modify Twitch's stream,
   * playlist, or workers.
   */

  if (window.__myAdBlockerTwitchPlayerLoaded) {
    return;
  }

  window.__myAdBlockerTwitchPlayerLoaded = true;

  let adActive = false;

  /* =====================================================
   * AD STATE
   * ===================================================== */

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
      document.documentElement
        .dataset
        .myAdBlockerTwitchAd === "true";

    setAdState(active);
  }

  /* =====================================================
   * PLAYLIST DIAGNOSTICS
   * ===================================================== */

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
   * Watch page-level fetch().
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
        // Diagnostic only.
      }

      return originalFetch.apply(this, args);
    };
  }

  /*
   * Watch page-level XMLHttpRequest.
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

  /* =====================================================
   * WEB WORKER DIAGNOSTICS
   * ===================================================== */

  const OriginalWorker = window.Worker;

  if (typeof OriginalWorker === "function") {
    const WorkerProxy = new Proxy(
      OriginalWorker,
      {
        construct(target, args) {
          try {
            const workerSource = String(args[0]);

            /*
             * Don't print the complete URL because Twitch
             * may use temporary or session-specific data.
             */

            let workerType = "unknown";

            if (
              workerSource
                .toLowerCase()
                .includes("amazon")
            ) {
              workerType = "amazon";
            }

            if (
              workerSource
                .toLowerCase()
                .includes("ivs")
            ) {
              workerType = "amazon-ivs";
            }

            if (
              workerSource.startsWith("blob:")
            ) {
              workerType =
                workerType === "unknown"
                  ? "blob"
                  : workerType + "-blob";
            }

            console.info(
              "[My Ad Blocker] Twitch Worker created:",
              workerType
            );
          } catch {
            console.info(
              "[My Ad Blocker] Twitch Worker created."
            );
          }

          return Reflect.construct(
            target,
            args
          );
        }
      }
    );

    Object.defineProperty(
      WorkerProxy,
      "name",
      {
        value: "Worker"
      }
    );

    window.Worker = WorkerProxy;

    console.info(
      "[My Ad Blocker] Twitch Worker diagnostics active."
    );
  }

  /* =====================================================
   * START
   * ===================================================== */

  function start() {
    readAdState();

    const observer =
      new MutationObserver(readAdState);

    observer.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: [
          "data-my-ad-blocker-twitch-ad"
        ]
      }
    );

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
