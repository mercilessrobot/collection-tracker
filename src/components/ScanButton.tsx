import { useState } from "react";
import { BarcodeScanner } from "./BarcodeScanner";

// A camera icon button that opens the scanner and reports the scanned code.
export function ScanButton({
  onDetected,
  title = "Scan barcode",
}: {
  onDetected: (code: string) => void;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="ghost scan-btn"
        title={title}
        aria-label={title}
        onClick={() => setOpen(true)}
      >
        📷
      </button>
      {open && (
        <BarcodeScanner
          onDetected={(code) => {
            setOpen(false);
            onDetected(code);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
