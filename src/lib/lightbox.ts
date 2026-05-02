/**
 * PhotoSwipe lightbox + scroll reveal + image fade-in.
 *
 * Loaded via <Lightbox /> as a client island on pages that contain a gallery.
 * Initialises any element with [data-pswp-gallery] and binds keyboard nav,
 * swipe, pinch-zoom, image counter, and a Fraunces-italic caption block.
 */
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

declare global {
  interface Window {
    __atunbiLightbox?: boolean;
  }
}

function init() {
  if (window.__atunbiLightbox) return;
  window.__atunbiLightbox = true;

  // --- Lightbox per gallery ---
  document.querySelectorAll<HTMLElement>('[data-pswp-gallery]').forEach((galleryEl) => {
    const lb = new PhotoSwipeLightbox({
      gallery: galleryEl,
      children: 'a',
      pswpModule: () => import('photoswipe'),
      bgOpacity: 0.97,
      showHideAnimationType: 'fade',
      padding: { top: 24, bottom: 24, left: 16, right: 16 },
    });

    lb.on('uiRegister', () => {
      lb.pswp?.ui?.registerElement({
        name: 'caption',
        order: 9,
        isButton: false,
        appendTo: 'root',
        html: '',
        onInit: (el, pswp) => {
          el.classList.add('pswp__custom-caption');
          pswp.on('change', () => {
            const slide = pswp.currSlide;
            const data = slide?.data?.element as HTMLElement | undefined;
            const caption = data?.dataset.caption ?? '';
            const project = data?.dataset.project ?? '';
            const projectHref = data?.dataset.projectHref ?? '';
            let html = caption;
            if (project && projectHref) {
              html = caption
                ? `${caption} · <a href="${projectHref}">${project}</a>`
                : `<a href="${projectHref}">${project}</a>`;
            }
            el.innerHTML = html;
          });
        },
      });
    });

    lb.init();
  });

  // --- Image fade-in once decoded ---
  document.querySelectorAll<HTMLImageElement>('.gallery img, .project-grid img').forEach((img) => {
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('is-loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
      img.addEventListener('error', () => img.classList.add('is-loaded'), { once: true });
    }
  });

  // --- Scroll reveal (IntersectionObserver) ---
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((t) => t.setAttribute('data-reveal', 'visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.setAttribute('data-reveal', 'visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
  );
  targets.forEach((t) => observer.observe(t));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
