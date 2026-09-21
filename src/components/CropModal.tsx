import { useEffect, useRef, useState } from "react";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";

// In-app photo editor: drag to frame just the item, rotate, and pick an aspect
// ratio, then hand back a cropped JPEG blob ready to upload.
export function CropModal({
  src,
  onCancel,
  onDone,
}: {
  src: string;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}) {
  useLockBodyScroll();
  const imgRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!imgRef.current) return;
    const cropper = new Cropper(imgRef.current, {
      viewMode: 1,
      autoCropArea: 0.9, // start with a sensible box the user can adjust
      background: false,
      responsive: true,
      checkOrientation: true, // respect iPhone EXIF rotation
      zoomable: true,
    });
    cropperRef.current = cropper;
    return () => {
      cropper.destroy();
    };
  }, []);

  function setAspect(ratio: number) {
    cropperRef.current?.setAspectRatio(ratio);
  }
  function rotate(deg: number) {
    cropperRef.current?.rotate(deg);
  }

  function handleUse() {
    const cropper = cropperRef.current;
    if (!cropper) return;
    setBusy(true);
    const canvas = cropper.getCroppedCanvas({
      maxWidth: 1000,
      maxHeight: 1000,
      imageSmoothingQuality: "high",
    });
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (blob) onDone(blob);
      },
      "image/jpeg",
      0.85
    );
  }

  return (
    <div className="modal-backdrop crop-backdrop" onClick={onCancel}>
      <div className="card crop-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Crop photo</h2>
        <div className="crop-stage">
          <img ref={imgRef} src={src} alt="" />
        </div>
        <div className="crop-tools">
          <button type="button" className="ghost small" onClick={() => rotate(-90)}>
            ↺
          </button>
          <button type="button" className="ghost small" onClick={() => rotate(90)}>
            ↻
          </button>
          <span className="crop-sep" />
          <button type="button" className="ghost small" onClick={() => setAspect(NaN)}>
            Free
          </button>
          <button type="button" className="ghost small" onClick={() => setAspect(2 / 3)}>
            2:3
          </button>
          <button type="button" className="ghost small" onClick={() => setAspect(1)}>
            1:1
          </button>
        </div>
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={handleUse} disabled={busy}>
            {busy ? "…" : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
