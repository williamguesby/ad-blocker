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
   * - Unique Worker function names
   * - STRUCTURE of arguments passed to "load"
   *
   * Does NOT modify Worker messages or Twitch playback.
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
   * SAFE ARGUMENT DESCRIPTION
   * ===================================================== */

  function describeValue(value) {
    if (value === null) {
      return "null";
    }

    if (Array.isArray(value)) {
      return `array(length=${value.length})`;
    }

    if (ArrayBuffer.isView(value)) {
      return "typed-array";
    }

    if (value instanceof ArrayBuffer) {
      return "array-buffer";
    }

    if (typeof value === "object") {
      try {
        const keys = Object.keys(value)
          .slice(0, 15);

        if (keys.length === 0) {
          return "object(no enumerable keys)";
        }

        return `object(keys=${keys.join(",")})`;
      } catch {
        return "object";
      }
    }

    if (typeof value === "string") {
      /*
       * Deliberately do NOT print the string itself.
       * It could contain a stream URL or temporary token.
       */
      return `string(length=${value.length})`;
    }

    return typeof value;
  }

  function inspectLoadArguments(workerId, args) {
    console.info(
      `[My Ad Blocker] Worker #${workerId} LOAD called.`
    );

    if (!Array.isArray(args)) {
      console.info(
        `[My Ad Blocker] Worker #${workerId} LOAD args container: ${describeValue(args)}`
      );

      return;
    }

    console.info(
      `[My Ad Blocker] Worker #${workerId} LOAD argument count: ${args.length}`
    );

    args.forEach((value, index) => {
      console.info(
        `[My Ad Blocker] Worker #${workerId} LOAD arg ${index}: ${describeValue(value)}`
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

    /*
     * "load" is the only function whose argument
     * structure we inspect.
     *
     * Values themselves are NOT printed.
     */
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
      "[My Ad Blocker] LOAD diagnostics active."
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
