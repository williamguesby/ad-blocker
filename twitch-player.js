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
   * - Web Worker creation
   * - Unique Worker functions
   * - Structure of "load" arguments
   * - Safe classification of LOAD strings
   *
   * Does NOT modify Twitch playback or Worker messages.
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
   * SAFE STRING CLASSIFICATION
   * ===================================================== */

  function classifyString(value) {
    const lower = value.toLowerCase();
    const trimmed = value.trim();

    let looksLikeJSON = false;

    if (
      trimmed.startsWith("{") ||
      trimmed.startsWith("[")
    ) {
      try {
        JSON.parse(trimmed);
        looksLikeJSON = true;
      } catch {
        looksLikeJSON = false;
      }
    }

    return {
      length: value.length,

      startsWithHTTP:
        lower.startsWith("http://") ||
        lower.startsWith("https://"),

      containsM3U8:
        lower.includes(".m3u8"),

      containsTTVNW:
        lower.includes("ttvnw"),

      containsUsher:
        lower.includes("usher"),

      containsAmazon:
        lower.includes("amazon"),

      containsIVS:
        lower.includes("ivs"),

      looksLikeJSON
    };
  }

  function logStringClassification(
    workerId,
    index,
    value
  ) {
    const info = classifyString(value);

    console.info(
      `[My Ad Blocker] Worker #${workerId} LOAD arg ${index} classification:`
    );

    console.info(
      `[My Ad Blocker]   length: ${info.length}`
    );

    console.info(
      `[My Ad Blocker]   starts with HTTP: ${info.startsWithHTTP}`
    );

    console.info(
      `[My Ad Blocker]   contains .m3u8: ${info.containsM3U8}`
    );

    console.info(
      `[My Ad Blocker]   contains ttvnw: ${info.containsTTVNW}`
    );

    console.info(
      `[My Ad Blocker]   contains usher: ${info.containsUsher}`
    );

    console.info(
      `[My Ad Blocker]   contains amazon: ${info.containsAmazon}`
    );

    console.info(
      `[My Ad Blocker]   contains ivs: ${info.containsIVS}`
    );

    console.info(
      `[My Ad Blocker]   looks like JSON: ${info.looksLikeJSON}`
    );
  }

  /* =====================================================
   * LOAD DIAGNOSTICS
   * ===================================================== */

  function inspectLoadArguments(workerId, args) {
    console.info(
      `[My Ad Blocker] Worker #${workerId} LOAD called.`
    );

    if (!Array.isArray(args)) {
      console.info(
        `[My Ad Blocker] Worker #${workerId} LOAD args are not an array.`
      );

      return;
    }

    console.info(
      `[My Ad Blocker] Worker #${workerId} LOAD argument count: ${args.length}`
    );

    args.forEach((value, index) => {
      if (typeof value === "string") {
        logStringClassification(
          workerId,
          index,
          value
        );

        return;
      }

      if (value === null) {
        console.info(
          `[My Ad Blocker] Worker #${workerId} LOAD arg ${index}: null`
        );

        return;
      }

      if (Array.isArray(value)) {
        console.info(
          `[My Ad Blocker] Worker #${workerId} LOAD arg ${index}: array`
        );

        return;
      }

      if (typeof value === "object") {
        let keys = [];

        try {
          keys = Object.keys(value).slice(0, 15);
        } catch {
          // Diagnostic only.
        }

        console.info(
          `[My Ad Blocker] Worker #${workerId} LOAD arg ${index}: object keys = ${keys.join(", ")}`
        );

        return;
      }

      console.info(
        `[My Ad Blocker] Worker #${workerId} LOAD arg ${index}: ${typeof value}`
      );
    });
  }

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

    const functionName = data.funcName;

    const functions =
      getWorkerFunctionSet(workerId);

    if (!functions.has(functionName)) {
      functions.add(functionName);

      console.info(
        `[My Ad Blocker] Worker #${workerId} function observed: ${functionName}`
      );
    }

    if (functionName === "load") {
      inspectLoadArguments(
        workerId,
        data.args
      );
    }
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
      "[My Ad Blocker] LOAD string-classification diagnostics active."
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
