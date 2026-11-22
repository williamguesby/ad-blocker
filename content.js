
"use strict";

/*
 * PAGEGUARD - GENERAL AD PROTECTION
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
  ".ad-overlay",
  ".advertisement-overlay",
  ".popup-ad",
  ".video-ad-overlay",

  "[data-ad]",
  "[data-ads]",
  "[data-ad-slot]",
  "[data-ad-client]",

  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googlesyndication.com"]',
  'iframe[src*="googleadservices.com"]',
  'iframe[src*="adnxs.com"]',
  'iframe[src*="adsrvr.org"]',

  // Recurring popup protection
  '.creative:has(.wrapper[data-onopen]):has(img.close[data-onclose])',
  'iframe[srcdoc*="AD BLOCKER PRO" i]'

].join(",");


/* REMOVE STANDARD ADS */

function removeAds() {
  document.querySelectorAll(AD_SELECTORS).forEach(element => {
    if (!element.querySelector("video")) {
      element.remove();
    }
  });
}


/* REMOVE EXTENSION INSTALL POPUPS */

function removeExtensionPopups() {
  document.querySelectorAll(".creative").forEach(element => {
    const text = element.textContent || "";

    const isExtensionAd =
      /ad blocker pro/i.test(text) &&
      /add extension/i.test(text);

    if (isExtensionAd) {
      element.remove();

      console.debug(
        "[PageGuard] Extension advertisement removed."
      );
    }
  });

  document.querySelectorAll("iframe[srcdoc]").forEach(frame => {
    const source = frame.getAttribute("srcdoc") || "";

    if (
      /ad blocker pro/i.test(source) &&
      /add extension/i.test(source)
    ) {
      frame.remove();
    }
  });
}


/* REMOVE ADVERTISING OVERLAYS */

function removeOverlays() {
  const elements = document.querySelectorAll(
    'div, aside, section, [role="dialog"]'
  );

  for (const element of elements) {
    if (element.querySelector("video, input, form")) {
      continue;
    }

    const style = getComputedStyle(element);

    if (
      style.position !== "fixed" &&
      style.position !== "absolute"
    ) {
      continue;
    }

    const rect = element.getBoundingClientRect();

    if (rect.width < 100 || rect.height < 60) {
      continue;
    }

    const text = element.textContent.trim();

    if (text.length > 400) continue;

    const adText =
      /\badvertisement\b|\bsponsored ad\b|\bclose ad\b|\bskip ad\b|\bad blocker pro\b/i.test(text);

    const hasClose = element.querySelector(
      'button, [aria-label*="close" i], [class*="close" i]'
    );

    if (adText && hasClose) {
      element.remove();
    }
  }
}


/* POPUP AND REDIRECT DETECTION */

document.addEventListener("pointerdown", event => {
  if (!event.isTrusted) return;

  const link = event.target?.closest?.("a[href]");

  try {
    chrome.runtime.sendMessage({
      type: "page-click",
      destination: link?.href || null
    }).catch(() => {});
  } catch {}
}, true);


/* CONTINUOUS AD MONITORING */

let scheduled = false;

function scan() {
  removeAds();
  removeExtensionPopups();
  removeOverlays();
}

function scheduleScan() {
  if (scheduled) return;

  scheduled = true;

  setTimeout(() => {
    scheduled = false;
    scan();
  }, 100);
}

function start() {
  scan();

  const observer = new MutationObserver(scheduleScan);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "class",
      "style",
      "src",
      "srcdoc"
    ]
  });

  setInterval(scan, 1000);
}

if (document.documentElement) {
  start();
} else {
  document.addEventListener("DOMContentLoaded", start, {
    once: true
  });
}

console.info("[PageGuard] Enhanced ad protection active.");
