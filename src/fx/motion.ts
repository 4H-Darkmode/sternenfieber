import { useEffect, useRef, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Imperative check (evaluated on every call so OS toggles apply live). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/** React hook version that updates when the OS setting changes. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(QUERY);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/**
 * Singleton guard for app-level overlays. If the same overlay is mounted twice
 * (e.g. once in the app shell and once in the dev harness) only the first
 * mounted instance is active; the others render nothing.
 */
const owners = new Map<string, symbol>();

export function useOwner(key: string): boolean {
  const token = useRef<symbol>(Symbol(key));
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    const me = token.current;
    if (!owners.has(key)) owners.set(key, me);
    setIsOwner(owners.get(key) === me);
    return () => {
      if (owners.get(key) === me) owners.delete(key);
    };
  }, [key]);
  return isOwner;
}

/** Screen element to shake for "screen shake" (the app root, not overlays). */
export function screenElement(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById('root');
}
