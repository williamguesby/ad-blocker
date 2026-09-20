"use strict";

/*
 * =========================================================
 * GENERAL AD REMOVAL
 * =========================================================
 */

const AD_SELECTORS = [
  ".ad",
  ".ads",
  ".advertisement",
  ".advertising",
  ".ad-container",
  ".ad-wrapper",
  ".ad-slot",
  ".ad-banner",

  "[data-ad]",
  "[data-ads]",
  "[data-ad-slot]",
  "[data-ad-client]",

  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googlesyndication.com"]',
  'iframe[src*="googleadservices.com"]',
  'iframe[src*="adnxs.com"]',
  'iframe[src*="adsrvr.org"]'
];

function removeAds(root = document) {
  if (!root || !root.querySelectorAll) return;

  for (const selector of AD_SELECTORS) {
    try {
      root.querySelectorAll(selector).forEach(element => {
        element.remove();
      });
    } catch {
      // Ignore unusual selector errors.
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
    } catch {
      // Ignore unusual selector errors.
    }
  }

  removeAds(node);
}


/*
 * =========================================================
 * CLICK CLASSIFICATION
 * =========================================================
 *
 * Real links are left alone.
 *
 * Clicking something that is NOT a link — such as a video
 * play/pause/volume control — temporarily tells background.js
 * to watch for an unrelated popup tab.
 */

function classifyClick(event) {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  /*
   * If the click happened on a real link, do nothing.
   * Normal links should continue working normally.
   */
  const link = target.closest("a[href]");

  if (link) {
    return;
  }

  /*
   * This was a non-link click.
   */
  try {
    chrome.runtime.sendMessage({
      type: "non-link-click"
    });
  } catch {
    // Ignore extension-context errors during navigation.
  }
}

document.addEventListener(
  "pointerdown",
  classifyClick,
  true
);


/*
 * =========================================================
 * DYNAMIC AD MONITORING
 * =========================================================
 */

function startObserver() {
  if (!document.documentElement) {
    return;
  }

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

if (document.documentElement) {
  startObserver();
} else {
  document.addEventListener(
    "DOMContentLoaded",
    startObserver,
    { once: true }
  );
}


/*
 * =========================================================
 * PAGE-LEVEL POPUP GUARD
 * =========================================================
 */

function injectPageGuard() {
  const script = document.createElement("script");

  script.src = chrome.runtime.getURL("page-guard.js");

  script.onload = () => {
    script.remove();
  };

  (document.head || document.documentElement).appendChild(script);
}

injectPageGuard();

console.info("[My Ad Blocker] Content protection active.");
