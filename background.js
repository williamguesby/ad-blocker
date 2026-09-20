"use strict";

/*
 * Browser-level popup protection.
 *
 * This runs in the extension's background service worker.
 * It watches for tabs that were created by another tab.
 */

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

/*
 * When a new tab is created, Chrome tells us which existing
 * tab opened it through openerTabId.
 */
chrome.tabs.onCreated.addListener(async tab => {
  if (tab.openerTabId === undefined) {
    return;
  }

  try {
    const opener = await chrome.tabs.get(tab.openerTabId);

    /*
     * Sometimes the new tab starts as about:blank and receives
     * its real URL a moment later. In that case we'll wait for
     * tabs.onUpdated below.
     */
    if (!tab.url || tab.url === "about:blank") {
      return;
    }

    const sourceHost = getHostname(opener.url);
    const destinationHost = getHostname(tab.url);

    if (!sourceHost || !destinationHost) {
      return;
    }

    /*
     * Same-site tabs are fine.
     */
    if (sameSite(sourceHost, destinationHost)) {
      return;
    }

    console.warn(
      "[My Ad Blocker] Closing cross-site popup:",
      sourceHost,
      "->",
      destinationHost
    );

    await chrome.tabs.remove(tab.id);
  } catch (error) {
    console.debug(
      "[My Ad Blocker] Tab check failed:",
      error
    );
  }
});

/*
 * Catch popups that are initially created as about:blank
 * and redirected afterward.
 */
chrome.tabs.onUpdated.addListener(
  async (tabId, changeInfo, tab) => {
    if (!changeInfo.url) {
      return;
    }

    if (tab.openerTabId === undefined) {
      return;
    }

    try {
      const opener = await chrome.tabs.get(tab.openerTabId);

      const sourceHost = getHostname(opener.url);
      const destinationHost = getHostname(changeInfo.url);

      if (!sourceHost || !destinationHost) {
        return;
      }

      if (sameSite(sourceHost, destinationHost)) {
        return;
      }

      console.warn(
        "[My Ad Blocker] Closing redirected popup:",
        sourceHost,
        "->",
        destinationHost
      );

      await chrome.tabs.remove(tabId);
    } catch (error) {
      console.debug(
        "[My Ad Blocker] Redirected tab check failed:",
        error
      );
    }
  }
);
