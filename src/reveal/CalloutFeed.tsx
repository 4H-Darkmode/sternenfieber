import { useEffect, useMemo, useRef, useState } from 'react';
import Callout from './Callout';
import type { CalloutData } from './content';
import s from './CalloutFeed.module.css';

export interface CalloutFeedProps {
  items: CalloutData[];
  onDismiss: (id: string) => void;
  /** max cards on screen; older ones are dismissed (default 4) */
  maxVisible?: number;
  /** auto-dismiss after ms; 0 = never (default 14000). Paused on hover/focus. */
  ttlMs?: number;
  className?: string;
}

const LEAVE_MS = 450;

/**
 * Stack of annotated-paper callouts, newest on top. Older cards fade, cards
 * beyond `maxVisible` are dismissed, every card auto-fades after `ttlMs`.
 * Timers pause while the pointer or keyboard focus is inside the feed.
 */
export default function CalloutFeed({ items, onDismiss, maxVisible = 4, ttlMs = 14000, className }: CalloutFeedProps) {
  // newest first; same timestamp → later in the array is newer
  const sorted = useMemo(
    () =>
      items
        .map((item, i) => ({ item, i }))
        .sort((a, b) => b.item.at - a.item.at || b.i - a.i)
        .map((x) => x.item),
    [items],
  );
  const visible = sorted.slice(0, maxVisible);
  const overflow = sorted.slice(maxVisible);

  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hover, setHover] = useState(false);
  const [focusIn, setFocusIn] = useState(false);
  const paused = hover || focusIn || expanded !== null;

  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const deadlines = useRef(new Map<string, number>());

  // Overflow: drop silently so the parent's list stays bounded.
  const overflowKey = overflow.map((i) => i.id).join('|');
  useEffect(() => {
    overflow.forEach((i) => dismissRef.current(i.id));
  }, [overflowKey]);

  // Register deadlines for new items, forget removed ones.
  useEffect(() => {
    const ids = new Set(visible.map((i) => i.id));
    for (const it of visible) if (!deadlines.current.has(it.id)) deadlines.current.set(it.id, it.at + ttlMs);
    for (const id of [...deadlines.current.keys()]) if (!ids.has(id)) deadlines.current.delete(id);
    if (expanded && !ids.has(expanded)) setExpanded(null);
  });

  // When resuming after a pause, give every card some time again.
  useEffect(() => {
    if (paused) return;
    const now = Date.now();
    deadlines.current.forEach((d, id) => deadlines.current.set(id, Math.max(d, now + 4000)));
    setLeaving(new Set());
  }, [paused]);

  // One ticker drives fade + dismiss.
  const hasItems = visible.length > 0;
  useEffect(() => {
    if (!ttlMs || paused || !hasItems) return;
    const t = window.setInterval(() => {
      const now = Date.now();
      const nextLeaving = new Set<string>();
      deadlines.current.forEach((d, id) => {
        if (now >= d) dismissRef.current(id);
        else if (now >= d - LEAVE_MS) nextLeaving.add(id);
      });
      setLeaving((prev) =>
        prev.size === nextLeaving.size && [...nextLeaving].every((id) => prev.has(id)) ? prev : nextLeaving,
      );
    }, 150);
    return () => window.clearInterval(t);
  }, [ttlMs, paused, hasItems]);

  return (
    <section
      className={`${s.feed} ${className ?? ''}`}
      aria-label="Entlarvt: Hinweise zu den Mechanismen"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocusIn(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusIn(false);
      }}
    >
      <ol className={s.list} role="log" aria-live="polite" aria-relevant="additions">
        {visible.map((item, i) => (
          <li key={item.id} className={s.item}>
            <Callout
              item={item}
              onDismiss={onDismiss}
              emphasis={1 - i * 0.15}
              leaving={leaving.has(item.id)}
              expanded={expanded === item.id}
              onToggleExpand={() => setExpanded((cur) => (cur === item.id ? null : item.id))}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
