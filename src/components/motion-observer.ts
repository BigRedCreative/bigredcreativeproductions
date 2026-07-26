// Phase 19D-1 — the ONE shared IntersectionObserver instance for the
// entire page. Every MotionSection/useMotionEntrance consumer calls
// observeMotionElement() to register itself; nothing here ever creates a
// second observer or a scroll-event listener. Module-scoped (not
// component-scoped) so the same single observer instance is reused across
// every animated section on the homepage, per the explicit "one shared
// IntersectionObserver instance per page, not one observer per section"
// requirement.
//
// Fires once per element, then immediately unobserves it — entrance
// animations never repeat on scroll-back, by construction (there is no
// re-observe path once an element has fired).

let sharedObserver: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, () => void>();

function getSharedObserver(): IntersectionObserver {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const callback = callbacks.get(entry.target);
        callback?.();
        sharedObserver!.unobserve(entry.target);
        callbacks.delete(entry.target);
      }
    },
    // Fires once the element is ~15% into the viewport from the bottom —
    // late enough that the entrance reads as intentional scroll-driven
    // reveal, early enough that it doesn't feel delayed.
    { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
  );
  return sharedObserver;
}

// Registers `el` with the shared observer; calls `onVisible` exactly once,
// the first time `el` enters the viewport. Returns an unregister function
// for cleanup (e.g. on unmount before the element ever became visible).
export function observeMotionElement(el: Element, onVisible: () => void): () => void {
  const observer = getSharedObserver();
  callbacks.set(el, onVisible);
  observer.observe(el);
  return () => {
    observer.unobserve(el);
    callbacks.delete(el);
  };
}
