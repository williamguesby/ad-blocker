(() => {
  "use strict";

  const originalOpen = window.open.bind(window);

  // How long after a real link click we consider a cross-site
  // navigation intentional.
  const INTENT_WINDOW = 1500;

  let lastIntentionalExternalLink = {
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

  // Record when the user actually clicks a real external link.
  document.addEventListener(
    "click",
    event => {
      const link = event.target.closest?.("a[href]");

      if (!link) return;

      const destination = getHostname(link.href);

      if (
        destination &&
        !sameSite(destination, location.hostname)
      ) {
        lastIntentionalExternalLink = {
          time: Date.now(),
          hostname: destination
        };
      }
    },
    true
  );

  // Intercept JavaScript-created windows/tabs.
  window.open = function(url, target, features) {
    if (!url) {
      return originalOpen(url, target, features);
    }

    const destination = getHostname(url);

    // Same website/subdomain? Allow it.
    if (sameSite(destination, location.hostname)) {
      return originalOpen(url, target, features);
    }

    // Did the user just intentionally click an actual link
    // leading to this external website?
    const intentional =
      Date.now() - lastIntentionalExternalLink.time < INTENT_WINDOW &&
      sameSite(
        destination,
        lastIntentionalExternalLink.hostname
      );

    if (intentional) {
      return originalOpen(url, target, features);
    }

    // Otherwise this looks like an unrelated cross-site popup.
    console.info(
      "[My Ad Blocker] Blocked unwanted popup:",
      url
    );

    return null;
  };
})();
