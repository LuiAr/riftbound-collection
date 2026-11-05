"use client";

import { useSyncExternalStore } from "react";

const URL_CHANGE_EVENT = "riftbound:url-change";

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(URL_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(URL_CHANGE_EVENT, callback);
  };
}

export function useSearchString() {
  return useSyncExternalStore(subscribe, () => window.location.search, () => "");
}

export function currentSearchParams() {
  return new URLSearchParams(window.location.search);
}

export function writeSearchParams(changes: Record<string, string | null>, mode: "push" | "replace" = "replace") {
  const params = currentSearchParams();
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  if (mode === "push") window.history.pushState(window.history.state, "", next);
  else window.history.replaceState(window.history.state, "", next);
  window.dispatchEvent(new Event(URL_CHANGE_EVENT));
}
