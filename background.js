
"use strict";

const clicks = new Map();
const pending = new Map();

const CLICK_WINDOW = 3000;
const REDIRECT_WINDOW = 15000;

function hostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function sameSite(a, b) {
  return Boolean(a && b && (
    a === b ||
    a.endsWith("." + b) ||
    b.endsWith("." + a)
  ));
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (
    message?.type !== "page-click" ||
    sender.tab?.id === undefined
  ) return;

  clicks.set(sender.tab.id, {
    time: Date.now(),
    source: hostname(sender.url || sender.tab.url),
    destination: message.destination
      ? hostname(message.destination)
      : ""
  });
});

async function inspect(tabId, url) {
  const info = pending.get(tabId);

  if (!info) return;

  if (Date.now() > info.expires) {
    pending.delete(tabId);
    return;
  }

  const destination = hostname(url);

  if (!destination) return;

  if (
    info.destination &&
    sameSite(info.destination, destination)
  ) {
    return;
  }

  if (sameSite(info.source, destination)) {
    return;
  }

  pending.delete(tabId);

  try {
    await chrome.tabs.remove(tabId);
    console.debug("[PageGuard] Unwanted popup closed");
  } catch {}
}

chrome.tabs.onCreated.addListener(tab => {
  if (
    tab.id === undefined ||
    tab.openerTabId === undefined
  ) return;

  const click = clicks.get(tab.openerTabId);

  if (!click || Date.now() - click.time > CLICK_WINDOW) {
    return;
  }

  pending.set(tab.id, {
    ...click,
    expires: Date.now() + REDIRECT_WINDOW
  });

  const url = tab.pendingUrl || tab.url;

  if (url) inspect(tab.id, url);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    inspect(tabId, changeInfo.url);
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  clicks.delete(tabId);
  pending.delete(tabId);
});
