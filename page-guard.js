(() => {
  "use strict";

  const originalOpen = window.open.bind(window);
  const INTENT_WINDOW = 1500;

  let intentionalExternalLink = {
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

  function sameSite(a, b) {
    if (!a || !b) return false;

    return (
      a === b ||
      a.endsWith("." + b) ||
      b.endsWith("." + a)
    );
  }

  function recordIntent(link) {
    if (!link?.href) return;

    const destination = getHostname(link.href);

    if (
      destination &&
      !sameSite(destination, location.hostname)
    ) {
      intentionalExternalLink = {
        time: Date.now(),
        hostname: destination
      };
    }
  }

  function hasIntent(destination) {
    return (
      Date.now() - intentionalExternalLink.time < INTENT_WINDOW &&
      sameSite(
        destination,
        intentionalExternalLink.hostname
      )
    );
  }

  /*
   * Detect what the user ACTUALLY clicked.
   *
   * A genuine <a href> can authorize external navigation.
   * Clicking a video control, button, div, overlay, etc.
   * does not.
   */
  document.addEventListener(
    "click",
    event => {
      const link = event.target.closest?.("a[href]");

      if (!link) {
        intentionalExternalLink = {
          time: 0,
          hostname: ""
        };

        return;
      }

      recordIntent(link);
    },
    true
  );

  document.addEventListener(
    "auxclick",
    event => {
      const link = event.target.closest?.("a[href]");

      if (link) {
        recordIntent(link);
      }
    },
    true
  );

  /*
   * Protect against window.open().
   */
  window.open = function(url, target, features) {
    if (!url) {
      /*
       * Some scripts create an empty tab first and navigate
       * it afterward. Blocking this is safer for our purposes.
       */
      console.warn(
        "[My Ad Blocker] Blocked empty scripted popup."
      );

      return null;
    }

    const destination = getHostname(url);

    if (!destination) {
      console.warn(
        "[My Ad Blocker] Blocked invalid popup:",
        url
      );

      return null;
    }

    if (sameSite(destination, location.hostname)) {
      return originalOpen(url, target, features);
    }

    if (hasIntent(destination)) {
      return originalOpen(url, target, features);
    }

    console.warn(
      "[My Ad Blocker] Blocked unrelated popup:",
      url
    );

    return null;
  };

  /*
   * Catch synthetic/programmatic clicks on links.
   *
   * Websites sometimes create an <a target="_blank"> and
   * trigger .click() after the user interacts with something
   * unrelated, such as the video player.
   */
  const originalAnchorClick =
    HTMLAnchorElement.prototype.click;

  HTMLAnchorElement.prototype.click = function() {
    const destination = getHostname(this.href);

    if (!destination) {
      return;
    }

    if (sameSite(destination, location.hostname)) {
      return originalAnchorClick.call(this);
    }

    if (hasIntent(destination)) {
      return originalAnchorClick.call(this);
    }

    console.warn(
      "[My Ad Blocker] Blocked scripted external link:",
      this.href
    );

    return;
  };

  /*
   * Catch suspicious real click events where the page has
   * placed an external link over an unrelated control.
   */
  document.addEventListener(
    "click",
    event => {
      const link = event.target.closest?.("a[href]");

      if (!link) return;

      const destination = getHostname(link.href);

      if (!destination) return;

      if (sameSite(destination, location.hostname)) {
        return;
      }

      /*
       * A real visible external link is allowed.
       * The earlier capture handler records that intent.
       */
      if (hasIntent(destination)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      console.warn(
        "[My Ad Blocker] Blocked external navigation:",
        link.href
      );
    },
    true
  );

  console.info(
    "[My Ad Blocker] Enhanced popup protection active."
  );
})();
