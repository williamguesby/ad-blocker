"use strict";

/*
 * SMART POPUP GUARD
 *
 * Only considers a new tab suspicious when it appears
 * immediately after a NON-LINK click on the opener page.
 *
 * This prevents the extension from blocking normal browsing
 * and normal external links.
 */

const suspiciousClicks = new Map();
const pendingTabs = new Map();

const CLICK_WINDOW = 1500;
const PENDING_WINDOW = 5000;


/* ---------------- URL HELPERS ---------------- */

function getHostname(url) {
  try {
    return new URL(url).hostname;
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


/* ---------------- RECEIVE CLICK INFO ---------------- */

chrome.runtime.onMessage.addListener((message, sender) => {
  if (
    message?.type !== "non-link-click" ||
    sender.tab?.id === undefined
  ) {
    return;
  }

  suspiciousClicks.set(sender.tab.id, Date.now());
});


/* ---------------- CHECK A NEW TAB ---------------- */

async function inspectTab(tabId, openerTabId, destinationUrl) {
  try {
    const clickTime = suspiciousClicks.get(openerTabId);

    // No recent non-link click = leave this tab alone.
    if (!clickTime) {
      pendingTabs.delete(tabId);
      return;
    }

    const age = Date.now() - clickTime;

    if (age > CLICK_WINDOW) {
      suspiciousClicks.delete(openerTabId);
      pendingTabs.delete(tabId);
      return;
    }

    const opener = await chrome.tabs.get(openerTabId);

    const sourceHost = getHostname(opener.url);
    const destinationHost = getHostname(destinationUrl);

    if (!sourceHost || !destinationHost) {
      pendingTabs.delete(tabId);
      return;
    }

    // Same-site tabs are allowed.
    if (sameSite(sourceHost, destinationHost)) {
      pendingTabs.delete(tabId);
      return;
    }

    // Recent non-link click + unrelated website = suspicious popup.
    console.warn(
      "[My Ad Blocker] Blocked suspicious popup:",
      sourceHost,
      "->",
      destinationHost
    );

    suspiciousClicks.delete(openerTabId);
    pendingTabs.delete(tabId);

    await chrome.tabs.remove(tabId);

  } catch (error) {
    pendingTabs.delete(tabId);

    console.debug(
      "[My Ad Blocker] Popup check failed:",
      error
    );
  }
}


/* ---------------- WATCH NEW TABS ---------------- */

chrome.tabs.onCreated.addListener(tab => {
  if (
    tab.id === undefined ||
    tab.openerTabId === undefined
  ) {
    return;
  }

  const clickTime = suspiciousClicks.get(tab.openerTabId);

  /*
   * If the opener did not just receive a non-link click,
   * don't monitor the new tab at all.
   */
  if (
    !clickTime ||
    Date.now() - clickTime > CLICK_WINDOW
  ) {
    return;
  }

  pendingTabs.set(tab.id, {
    openerTabId: tab.openerTabId,
    createdAt: Date.now()
  });

  /*
   * Chrome may already know the new tab's URL.
   */
  if (
    tab.url &&
    tab.url !== "about:blank" &&
    (
      tab.url.startsWith("http://") ||
      tab.url.startsWith("https://")
    )
  ) {
    inspectTab(
      tab.id,
      tab.openerTabId,
      tab.url
    );
  }
});


/* ---------------- ABOUT:BLANK -> WEBSITE ---------------- */

chrome.tabs.onUpdated.addListener(
  (tabId, changeInfo) => {
    const pending = pendingTabs.get(tabId);

    if (!pending || !changeInfo.url) {
      return;
    }

    if (
      !changeInfo.url.startsWith("http://") &&
      !changeInfo.url.startsWith("https://")
    ) {
      return;
    }

    inspectTab(
      tabId,
      pending.openerTabId,
      changeInfo.url
    );
  }
);


/* ---------------- CLEANUP ---------------- */

chrome.tabs.onRemoved.addListener(tabId => {
  pendingTabs.delete(tabId);
  suspiciousClicks.delete(tabId);
});

setInterval(() => {
  const now = Date.now();

  for (const [tabId, time] of suspiciousClicks) {
    if (now - time > CLICK_WINDOW) {
      suspiciousClicks.delete(tabId);
    }
  }

  for (const [tabId, info] of pendingTabs) {
    if (now - info.createdAt > PENDING_WINDOW) {
      pendingTabs.delete(tabId);
    }
  }
}, 5000);
