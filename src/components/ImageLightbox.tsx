import { useLockBodyScroll } from "../hooks/useLockBodyScroll";

// Full-screen image viewer. Tap anywhere (or the ✕) to dismiss.
export function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useLockBodyScroll();
  return (
    <div className="lightbox" onClick={onClose}>
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <img src={src} alt="" />
    </div>
  );
}
