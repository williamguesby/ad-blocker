const AD_SELECTORS = [
  ".ad",
  ".ads",
  ".advert",
  ".advertisement",
  ".ad-container",
  ".ad-wrapper",
  ".ad-banner",
  ".adsbox",

  "[data-ad]",
  "[data-ad-slot]",
  "[data-ad-client]",

  "ins.adsbygoogle",

  "iframe[src*='doubleclick.net']",
  "iframe[src*='googlesyndication.com']",
  "iframe[src*='googleadservices.com']",
  "iframe[src*='adnxs.com']",
  "iframe[src*='adsrvr.org']"
];

function removeAds(root = document) {
  if (!root.querySelectorAll) return;

  for (const selector of AD_SELECTORS) {
    try {
      root.querySelectorAll(selector).forEach(element => {
        element.remove();
      });
    } catch (error) {
      console.debug("Ad blocker selector error:", selector);
    }
  }
}

function inspectNode(node) {
  if (!(node instanceof Element)) return;

  for (const selector of AD_SELECTORS) {
    try {
      if (node.matches(selector)) {
        node.remove();
        return;
      }
    } catch {}
  }

  removeAds(node);
}

function startObserver() {
  removeAds();

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        inspectNode(node);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

// Inject our popup/redirect protection into the actual webpage.
function injectPageGuard() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("page-guard.js");

  script.onload = () => {
    script.remove();
  };

  (document.head || document.documentElement).appendChild(script);
}

injectPageGuard();

if (document.documentElement) {
  startObserver();
} else {
  document.addEventListener("DOMContentLoaded", startObserver, {
    once: true
  });
}
