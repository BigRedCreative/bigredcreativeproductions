"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import CartNavLink from "./CartNavLink";

// A pure "are we on the client, past hydration" read — document.body
// doesn't exist during SSR, so the portal target isn't available yet.
// useSyncExternalStore (rather than a useEffect + setState "mounted"
// flag) is the lint-clean, React-recommended primitive for this exact
// question: no subscription ever fires, it just returns a different
// snapshot server- vs. client-side.
const noopSubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

type NavItem = { label: string; href: string };

type MobileNavProps = {
  // Real, already-resolved navigation_items data passed down from Header
  // (a server component) — this component never fetches or hardcodes a
  // second copy of the nav; it only renders what it's given.
  items: NavItem[];
  headerCta: NavItem;
};

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled])';

// Phase 22 — the mobile navigation experience the existing site lacked:
// below 900px, the desktop <nav> (and, until now, the CartNavLink it
// contained) simply vanished via `display:none`, leaving no way to reach
// any nav link OR the cart from a small viewport. This is a real,
// self-contained overlay panel, not a redesign of desktop Header
// behavior, which stays byte-identical.
export default function MobileNav({ items, headerCta }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const mounted = useIsClient();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!isOpen) return;

    // Body-scroll lock while the panel is open, restored on close/unmount.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the panel the moment it opens.
    const panel = panelRef.current;
    const focusable = panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];
    focusable[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        return;
      }
      // A small, self-contained focus trap — Tab/Shift+Tab cycle within
      // the panel only, rather than escaping into header/page content
      // hidden behind it while it's open.
      if (event.key === "Tab" && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="mobile-nav-trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="mobile-nav-trigger-bar" />
        <span className="mobile-nav-trigger-bar" />
      </button>

      {/* Portaled to document.body: .site-header has backdrop-filter
          (its frosted-glass treatment), which per spec establishes a
          containing block for position:fixed descendants — left in the
          header's own DOM subtree, this panel's inset:0 would resolve
          against the header's own small box instead of the viewport,
          producing a half-height overlay instead of the intended
          full-screen takeover. */}
      {mounted &&
        createPortal(
          <div
            id={panelId}
            ref={panelRef}
            className="mobile-nav-panel"
            data-open={isOpen ? "true" : "false"}
            aria-hidden={!isOpen}
          >
            <nav aria-label="Mobile navigation">
              <ol className="mobile-nav-list">
                {items.map((item, index) => (
                  <li key={item.href} style={{ "--mobile-nav-index": index } as React.CSSProperties}>
                    <a href={item.href} onClick={close}>
                      <span className="mobile-nav-number">0{index + 1}</span>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
              <div className="mobile-nav-foot">
                <span className="mobile-nav-cart" onClick={close}>
                  <CartNavLink />
                </span>
                <a href={headerCta.href} className="mobile-nav-cta" onClick={close}>
                  {headerCta.label}
                </a>
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}
