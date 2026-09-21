(() => {
  "use strict";

  /*
   * =====================================================
   * MY AD BLOCKER — TWITCH PLAYER MODULE
   * =====================================================
   *
   * DIAGNOSTIC VERSION
   *
   * Watches:
   * - Twitch ad state
   * - Page-level playlist requests
   * - Web Worker creation
   * - UNIQUE Worker function names
   *
   * Does NOT alter Twitch's stream or Worker traffic.
   */

  if (window.__myAdBlockerTwitchPlayerLoaded) {
    return;
  }

  window.__myAdBlockerTwitchPlayerLoaded = true;

  let adActive = false;
  let workerNumber = 0;

  const observedFunctions = new Map();

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
   * WORKER DIAGNOSTICS
   * ===================================================== */

  const OriginalWorker = window.Worker;

  function getWorkerFunctionSet(workerId) {
    if (!observedFunctions.has(workerId)) {
      observedFunctions.set(
        workerId,
        new Set()
      );
    }

    return observedFunctions.get(workerId);
  }

  function observeFunction(workerId, data) {
    if (
      !data ||
      typeof data !== "object" ||
      typeof data.funcName !== "string"
    ) {
      return;
    }

    const functions =
      getWorkerFunctionSet(workerId);

    if (functions.has(data.funcName)) {
      return;
    }

    functions.add(data.funcName);

    console.info(
      `[My Ad Blocker] Worker #${workerId} function observed: ${data.funcName}`
    );
  }

  if (typeof OriginalWorker === "function") {
    const WorkerProxy = new Proxy(
      OriginalWorker,
      {
        construct(target, args) {
          workerNumber += 1;

          const id = workerNumber;

          let workerType = "unknown";

          try {
            const source =
              String(args[0]).toLowerCase();

            if (source.includes("amazon")) {
              workerType = "amazon";
            }

            if (source.includes("ivs")) {
              workerType = "amazon-ivs";
            }

            if (source.startsWith("blob:")) {
              workerType =
                workerType === "unknown"
                  ? "blob"
                  : workerType + "-blob";
            }
          } catch {
            workerType = "unknown";
          }

          console.info(
            `[My Ad Blocker] Twitch Worker #${id} created: ${workerType}`
          );

          const worker =
            Reflect.construct(target, args);

          const originalPostMessage =
            worker.postMessage.bind(worker);

          worker.postMessage = function (
            data,
            ...rest
          ) {
            try {
              observeFunction(id, data);
            } catch {
              // Diagnostic only.
            }

            return originalPostMessage(
              data,
              ...rest
            );
          };

          return worker;
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

    console.info(
      "[My Ad Blocker] Unique Worker-function diagnostics active."
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
