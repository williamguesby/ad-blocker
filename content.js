
"use strict";

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
  'iframe[src*="adsrvr.org"]'
].join(",");

function removeAds() {
  document.querySelectorAll(AD_SELECTORS).forEach(element => {
    if (!element.querySelector("video")) {
      element.remove();
    }
  });
}

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
      /\badvertisement\b|\bsponsored ad\b|\bclose ad\b|\bskip ad\b/i.test(text);

    const hasClose = element.querySelector(
      'button, [aria-label*="close" i], [class*="close" i]'
    );

    if (adText && hasClose) {
      element.remove();
    }
  }
}

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

let scheduled = false;

function scan() {
  removeAds();
  removeOverlays();
}

function scheduleScan() {
  if (scheduled) return;

  scheduled = true;

  setTimeout(() => {
    scheduled = false;
    scan();
  }, 150);
}

function start() {
  scan();

  const observer = new MutationObserver(scheduleScan);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "src"]
  });

  setInterval(scan, 2000);
}

if (document.documentElement) {
  start();
} else {
  document.addEventListener("DOMContentLoaded", start, {
    once: true
  });
}

console.info("[PageGuard] Dynamic ad protection active.");
