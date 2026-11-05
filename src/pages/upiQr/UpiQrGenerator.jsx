import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  IndianRupee,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import html2canvas from "html2canvas";
import { buildUpiPaymentUri, buildUpiQrUrl, SAO_UPI_PAYEE, SAO_UPI_VPA } from "../../utils/upiPayment";
import "./UpiQrGenerator.css";

const BUSINESS_NAME = "SAO AUTO TRACTOR";
const PAYEE_NAME = SAO_UPI_PAYEE;
const AMOUNT_KEY = "saoAutoTractorLastQrAmount";
const QUICK_AMOUNTS = [500, 1000, 2500, 5000];

function formatAmount(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function readLastAmount() {
  try {
    return localStorage.getItem(AMOUNT_KEY) || "";
  } catch {
    return "";
  }
}

export default function UpiQrGenerator() {
  const [amount, setAmount] = useState(readLastAmount);
  const [readyAmount, setReadyAmount] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const downloadCardRef = useRef(null);

  const numericAmount = Number(amount);
  const isValidAmount = amount.trim() !== "" && Number.isFinite(numericAmount) && numericAmount > 0;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!isValidAmount) {
        setReadyAmount("");
        setImageLoaded(false);
        setImageFailed(false);
        return;
      }

      const nextAmount = numericAmount.toFixed(2);
      setReadyAmount(nextAmount);
      setImageLoaded(false);
      setImageFailed(false);
      try {
        localStorage.setItem(AMOUNT_KEY, nextAmount);
      } catch {
        // The amount remains usable when browser storage is unavailable.
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [amount, isValidAmount, numericAmount]);

  const stableReadyAmount = isValidAmount && readyAmount === numericAmount.toFixed(2) ? readyAmount : "";
  const qrUrl = useMemo(
    () => stableReadyAmount ? buildUpiQrUrl(stableReadyAmount, PAYEE_NAME) : "",
    [stableReadyAmount],
  );
  const paymentUri = useMemo(
    () => stableReadyAmount ? buildUpiPaymentUri(stableReadyAmount, PAYEE_NAME) : "",
    [stableReadyAmount],
  );

  const copyPaymentLink = async () => {
    if (!paymentUri) return;
    try {
      await navigator.clipboard.writeText(paymentUri);
      setNotice("UPI payment link copied.");
      setError("");
    } catch {
      setError("Clipboard access is unavailable. Download the QR card or allow clipboard access and retry.");
    }
  };

  const downloadQr = async () => {
    if (!qrUrl || !stableReadyAmount || !downloadCardRef.current) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const canvas = await html2canvas(downloadCardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#fffdf9",
        logging: false,
      });
      const cardBounds = downloadCardRef.current.getBoundingClientRect();
      const qrFrame = downloadCardRef.current.querySelector(".upi-qr-image-frame");
      const qrBounds = qrFrame?.getBoundingClientRect();
      const scale = canvas.width / cardBounds.width;
      if (!qrBounds) throw new Error("QR image area is missing from the payment card.");
      const qrPixels = canvas.getContext("2d").getImageData(
        Math.round((qrBounds.left - cardBounds.left) * scale),
        Math.round((qrBounds.top - cardBounds.top) * scale),
        Math.round(qrBounds.width * scale),
        Math.round(qrBounds.height * scale),
      ).data;
      let darkQrPixels = 0;
      for (let index = 0; index < qrPixels.length; index += 4) {
        if (qrPixels[index] < 80 && qrPixels[index + 1] < 80 && qrPixels[index + 2] < 80) darkQrPixels += 1;
      }
      if (darkQrPixels < 150) throw new Error("QR image was blocked while preparing the download.");
      const image = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!image) throw new Error("QR card image could not be prepared.");
      const objectUrl = URL.createObjectURL(image);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `SAO-AUTO-TRACTOR-UPI-QR-${stableReadyAmount.replace(".", "-")}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setNotice("Branded payment QR card downloaded as a PNG image.");
    } catch {
      setError("The full QR card could not be downloaded. Check that the QR image has finished loading and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="upi-qr-page">
      <header className="upi-qr-heading">
        <div>
          <div className="upi-qr-eyebrow"><span /> FINANCE <span className="upi-qr-crumb">/</span> PAYMENT TOOLS</div>
          <h1>UPI QR Generator</h1>
          <p>Create a payment QR with a fixed amount and download it for sharing or printing.</p>
        </div>
        <div className="upi-qr-heading-mark" aria-hidden="true"><QrCode size={24} /></div>
      </header>

      <section className="upi-qr-layout" aria-label="Generate a payment QR">
        <div className="upi-qr-form-card">
          <div className="upi-qr-card-kicker">PAYMENT AMOUNT</div>
          <h2>How much should they pay?</h2>
          <p className="upi-qr-muted">The amount is pre-filled when the customer scans this QR in a UPI app.</p>

          <label className="upi-amount-label" htmlFor="upi-qr-amount">Amount in rupees</label>
          <div className={`upi-amount-input${error && !isValidAmount ? " has-error" : ""}`}>
            <IndianRupee size={20} aria-hidden="true" />
            <input
              id="upi-qr-amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setNotice("");
                setError("");
              }}
              placeholder="Enter amount"
              aria-describedby="upi-amount-help"
            />
          </div>
          <small id="upi-amount-help" className="upi-amount-help">
            Enter an amount greater than ₹0. You can use paise too.
          </small>

          <div className="upi-quick-amounts" aria-label="Suggested amounts">
            <span>Quick amount</span>
            <div>
              {QUICK_AMOUNTS.map((preset) => (
                <button key={preset} type="button" onClick={() => { setAmount(String(preset)); setNotice(""); setError(""); }}>
                  ₹{formatAmount(preset)}
                </button>
              ))}
            </div>
          </div>

          <div className="upi-payee-card">
            <div className="upi-payee-icon"><IndianRupee size={17} /></div>
            <div><span>UPI ACCOUNT NAME</span><strong>{PAYEE_NAME}</strong><small>{BUSINESS_NAME} · {SAO_UPI_VPA}</small></div>
            <ShieldCheck size={17} aria-label="UPI details supplied by the business owner" />
          </div>

          {error && <div className="upi-feedback upi-feedback-error" role="alert">{error}</div>}
          {notice && <div className="upi-feedback upi-feedback-success" role="status"><Check size={15} />{notice}</div>}
        </div>

        <div className="upi-qr-preview-card">
          <div className="upi-qr-preview-heading">
            <div><div className="upi-qr-card-kicker">SCAN TO PAY</div><h2>Payment QR</h2></div>
          {stableReadyAmount && <span className="upi-qr-live"><span /> Ready</span>}
          </div>

          <div className="upi-qr-download-card" ref={downloadCardRef}>
            <div className="upi-qr-brand-row">
              <div className="upi-qr-brand-mark" aria-hidden="true">SA</div>
              <div><strong>{BUSINESS_NAME}</strong><span>OFFICIAL PAYMENT QR</span></div>
            </div>

            <div className={`upi-qr-image-frame${imageFailed ? " is-failed" : ""}`}>
            {!qrUrl ? (
              <div className="upi-qr-placeholder"><QrCode size={38} /><strong>Your QR will appear here</strong><span>Enter an amount to generate it.</span></div>
            ) : imageFailed ? (
              <div className="upi-qr-placeholder upi-qr-placeholder-error"><QrCode size={38} /><strong>Could not load the QR image</strong><span>Check your internet connection and try again.</span></div>
            ) : (
              <>
                {!imageLoaded && <div className="upi-qr-image-loading" aria-label="Loading QR image" />}
              <img src={qrUrl} alt={`UPI payment QR for ₹${formatAmount(stableReadyAmount)} payable to ${PAYEE_NAME}`} onLoad={() => setImageLoaded(true)} onError={() => setImageFailed(true)} />
              </>
            )}
            </div>

            {stableReadyAmount && <div className="upi-qr-amount"><span>AMOUNT TO PAY</span><strong>₹{formatAmount(stableReadyAmount)}</strong></div>}
            <div className="upi-qr-scan-instructions">
              <QrCode size={17} aria-hidden="true" />
              <div><strong>Scan with any UPI app</strong><span>Open your UPI app, scan this code, and confirm the payment.</span></div>
            </div>
            <div className="upi-qr-recipient-line"><span>PAYEE NAME</span><strong>{PAYEE_NAME}</strong><small>{SAO_UPI_VPA}</small></div>
          </div>

          <div className="upi-qr-actions">
            <button type="button" className="upi-qr-download" onClick={downloadQr} disabled={!qrUrl || imageFailed || !imageLoaded || busy}>
              <Download size={16} />{busy ? "Preparing download…" : "Download QR Card"}
            </button>
            <button type="button" className="upi-qr-copy" onClick={copyPaymentLink} disabled={!paymentUri}>
              <Copy size={15} />Copy UPI link
            </button>
          </div>
          {paymentUri && <a className="upi-qr-open-app" href={paymentUri}><ExternalLink size={13} /> Open in a UPI app</a>}
        </div>
      </section>

      <aside className="upi-qr-safety-note">
        <ShieldCheck size={17} />
        <p><strong>Payment note:</strong> Scanning this QR only starts a payment with the amount filled in. Confirm the money in your bank/UPI app before marking an invoice as paid.</p>
      </aside>
      <p className="upi-qr-service-note">The QR image is created through QRServer using your supplied payment link; the UPI ID and entered amount are sent to that service to render the image.</p>
    </main>
  );
}
