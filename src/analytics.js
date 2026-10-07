// GA4 custom events (gtag is defined in index.html).
// Page views, outbound links and file downloads are already captured by
// GA4 enhanced measurement; only in-page interactions are sent from here.
export function track(name, params = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, params)
  }
}
