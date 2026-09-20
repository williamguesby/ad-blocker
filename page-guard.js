(() => {
  "use strict";

  const originalOpen = window.open.bind(window);

  const INTENT_WINDOW = 1500;

  let allowedExternalNavigation = {
    time: 0,
    hostname: ""
  };

  function getHostname(url) {
    try {
      return new URL(url, location.href).hostname;
    } catch {
      return "";
    }
  }

  function sameSite(hostA, hostB) {
    if (!hostA || !hostB) return false;

    return (
      hostA === hostB ||
      hostA.endsWith("." + hostB) ||
      hostB.endsWith("." + hostA)
    );
  }

  function rememberIntentionalLink(link) {
    if (!link?.href) return;

    const destination = getHostname(link.href);

    if (
      destination &&
      !sameSite(destination, location.hostname)
    ) {
      allowedExternalNavigation = {
        time: Date.now(),
        hostname: destination
      };
    }
  }

  function wasIntentional(destination) {
    return (
      Date.now() - allowedExternalNavigation.time < INTENT_WINDOW &&
      sameSite(destination, allowedExternalNavigation.hostname)
    );
  }

  /*
   * Watch clicks BEFORE the website handles them.
   *
   * Only a real <a href> counts as permission to navigate
   * to an unrelated website.
   *
   * Clicking a video, pause button, div, image, etc.
   * does NOT give permission.
   */
  document.addEventListener(
    "click",
    event => {
      const link = event.target.closest?.("a[href]");

      if (link) {
        rememberIntentionalLink(link);
      }
    },
    true
  );

  /*
   * Also account for middle-clicking a legitimate link.
   */
  document.addEventListener(
    "auxclick",
    event => {
      const link = event.target.closest?.("a[href]");

      if (link) {
        rememberIntentionalLink(link);
      }
    },
    true
  );

  /*
   * Block JavaScript-created unrelated tabs/windows.
   */
  window.open = function(url, target, features) {
    if (!url) {
      return originalOpen(url, target, features);
    }

    const destination = getHostname(url);

    if (!destination) {
      return originalOpen(url, target, features);
    }

    // Navigation within the same site is okay.
    if (sameSite(destination, location.hostname)) {
      return originalOpen(url, target, features);
    }

    // User intentionally clicked a real external link.
    if (wasIntentional(destination)) {
      return originalOpen(url, target, features);
    }

    console.warn(
      "[My Ad Blocker] Blocked cross-site popup:",
      url
    );

    return null;
  };

  /*
   * Catch dynamically-created links that attempt to behave
   * like invisible popup/redirect overlays.
   */
  document.addEventListener(
    "click",
    event => {
      const link = event.target.closest?.("a[href]");

      if (!link) return;

      const destination = getHostname(link.href);

      if (!destination) return;

      /*
       * Don't interfere with same-site links.
       */
      if (sameSite(destination, location.hostname)) {
        return;
      }

      /*
       * This is still a real link the user clicked, so allow it.
       * The important distinction is that clicking a video control
       * itself should NOT authorize an unrelated popup.
       */
    },
    true
  );

  console.info(
    "[My Ad Blocker] Redirect protection active."
  );
})();
