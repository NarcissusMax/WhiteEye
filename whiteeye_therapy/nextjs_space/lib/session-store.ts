'use client';

// localStorage cache of this browser's sessions. the database is the source of truth,
// but we keep a fast local index so the logs sidebar and the mirror work instantly.

import type { SessionMeta, ChatMessage } from './types';

const INDEX_KEY = 'whiteeye_sessions';
const CURRENT_KEY = 'whiteeye_current';
const MSG_PREFIX = 'whiteeye_msgs_';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getSessionIndex(): SessionMeta[] {
  if (typeof window === 'undefined') return [];
  const list = safeParse<SessionMeta[]>(window.localStorage.getItem(INDEX_KEY), []);
  return Array.isArray(list) ? list : [];
}

export function upsertSessionMeta(meta: SessionMeta): void {
  if (typeof window === 'undefined') return;
  const list = getSessionIndex().filter((s) => s?.id !== meta?.id);
  list.unshift(meta);
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(list.slice(0, 100)));
}

export function removeSessionMeta(id: string): void {
  if (typeof window === 'undefined') return;
  const list = getSessionIndex().filter((s) => s?.id !== id);
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  window.localStorage.removeItem(MSG_PREFIX + id);
  if (getCurrentSessionId() === id) clearCurrentSessionId();
}

export function setCurrentSessionId(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CURRENT_KEY, id);
}

export function getCurrentSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CURRENT_KEY);
}

export function clearCurrentSessionId(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CURRENT_KEY);
}

export function cacheMessages(sessionId: string, messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MSG_PREFIX + sessionId, JSON.stringify(messages ?? []));
  } catch {
    // storage full or unavailable — ignore, db remains source of truth
  }
}

export function getCachedMessages(sessionId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  return safeParse<ChatMessage[]>(window.localStorage.getItem(MSG_PREFIX + sessionId), []);
}
