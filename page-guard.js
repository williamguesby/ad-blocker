
(() => {
  "use strict";

  const originalOpen = window.open.bind(window);
  const originalClick = HTMLAnchorElement.prototype.click;

  let intent = null;

  function getURL(value) {
    try {
      return new URL(value, location.href);
    } catch {
      return null;
    }
  }

  function suspiciousLink(link) {
    const style = getComputedStyle(link);
    const rect = link.getBoundingClientRect();

    return (
      Number(style.opacity) < 0.1 ||
      style.visibility === "hidden" ||
      style.display === "none" ||
      rect.width === 0 ||
      rect.height === 0 ||
      (
        ["fixed", "absolute"].includes(style.position) &&
        rect.width > innerWidth * 0.8 &&
        rect.height > innerHeight * 0.8
      )
    );
  }

  function recordIntent(event) {
    if (!event.isTrusted) return;

    intent = null;

    const link = event.target?.closest?.("a[href]");

    if (!link) return;

    if (suspiciousLink(link)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    const url = getURL(link.href);

    if (url) {
      intent = {
        url: url.href,
        time: Date.now()
      };
    }
  }

  function authorized(url) {
    return (
      intent &&
      Date.now() - intent.time < 1200 &&
      url.href === intent.url
    );
  }

  document.addEventListener("click", recordIntent, true);
  document.addEventListener("auxclick", recordIntent, true);

  window.open = function(url, target, features) {
    if (!url) return null;

    const destination = getURL(url);

    if (!destination || !authorized(destination)) {
      console.debug("[PageGuard] Blocked scripted popup");
      return null;
    }

    intent = null;

    return originalOpen(url, target, features);
  };

  HTMLAnchorElement.prototype.click = function() {
    const destination = getURL(this.href);

    if (!destination) return;

    if (
      this.target === "_blank" ||
      destination.origin !== location.origin
    ) {
      if (!authorized(destination)) {
        console.debug("[PageGuard] Blocked scripted link");
        return;
      }
    }

    return originalClick.call(this);
  };

  console.info("[PageGuard] Popup protection active.");
})();
