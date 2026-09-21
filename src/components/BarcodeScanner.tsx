import { useEffect, useRef, useState } from "react";

// Camera barcode scanner. Lazy-loads ZXing so it isn't in the main bundle.
// Reads 1D retail barcodes (EAN-13 / EAN-8 / UPC-A / UPC-E).
export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let controls: { stop: () => void } | undefined;
    let done = false;
    let cancelled = false;

    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, zxing] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        const hints = new Map();
        hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, [
          zxing.BarcodeFormat.EAN_13,
          zxing.BarcodeFormat.EAN_8,
          zxing.BarcodeFormat.UPC_A,
          zxing.BarcodeFormat.UPC_E,
        ]);
        const reader = new BrowserMultiFormatReader(hints);
        if (cancelled || !videoRef.current) return;
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current,
          (result, _err, ctrl) => {
            if (result && !done) {
              done = true;
              ctrl.stop();
              onDetectedRef.current(result.getText());
            }
          }
        );
      } catch (e) {
        if (!cancelled) setError(cameraErrorMessage(e));
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card scanner" onClick={(e) => e.stopPropagation()}>
        <h2>Scan barcode</h2>
        {error ? (
          <p className="error">{error}</p>
        ) : (
          <video ref={videoRef} className="scanner-video" muted playsInline />
        )}
        <p className="muted small-hint">Point the rear camera at the barcode.</p>
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function cameraErrorMessage(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera permission was denied. Allow camera access in your browser, then try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No camera was found on this device.";
  return e instanceof Error ? e.message : "Could not start the camera.";
}
