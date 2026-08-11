import QRCode from "qrcode";

// Inline SVG string — embed directly in a server component, no network request.
export async function qrSvg(data: string): Promise<string> {
  return QRCode.toString(data, {
    type: "svg",
    margin: 1,
    width: 240,
    errorCorrectionLevel: "M",
    color: { dark: "#111827", light: "#ffffff" },
  });
}

// PNG data URL — for download links or <img src>.
export async function qrDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    margin: 1,
    width: 512,
    errorCorrectionLevel: "M",
  });
}
