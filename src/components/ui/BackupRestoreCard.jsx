import { useRef, useState } from "react";
import {
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  X,
} from "lucide-react";

import { useToast } from "../../App"; // ⚠️ adjust if you export useToast elsewhere
import {
  downloadBackup,
  validateBackup,
  restoreBackup,
  restoreFromSnapshot,
  summarizeBackup,
  getLastBackupAt,
} from "../../utils/backup";

import "./BackupRestoreCard.css";

export default function BackupRestoreCard() {
  const { push } = useToast();
  const fileRef = useRef(null);

  const [pending, setPending] = useState(null); // { clean, meta, summary }
  const [busy, setBusy] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);

  const lastBackupAt = getLastBackupAt();
  const lastBackupLabel = lastBackupAt
    ? new Date(lastBackupAt).toLocaleString("en-IN")
    : "Never";

  /* ---------- Export ---------- */

  const handleExport = () => {
    try {
      downloadBackup();
      push({
        variant: "success",
        title: "Backup downloaded",
        message: "File save ho gayi. Safe jagah rakhein.",
      });
    } catch (err) {
      push({
        variant: "error",
        title: "Backup failed",
        message: err.message,
      });
    }
  };

  /* ---------- File pick ---------- */

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const { clean, meta } = validateBackup(raw);

      const preview = {
        clean,
        meta,
        summary: summarizeBackup({
          counts: Object.fromEntries(
            Object.entries(clean).map(([k, v]) => [
              k,
              Array.isArray(v) ? v.length : "object",
            ])
          ),
        }),
      };

      setPending(preview);
    } catch (err) {
      push({
        variant: "error",
        title: "Invalid backup file",
        message: err.message,
      });
    }
  };

  /* ---------- Confirm restore ---------- */

  const handleConfirmRestore = () => {
    if (!pending) return;
    setBusy(true);

    try {
      const { snapshot, failed } = restoreBackup(pending.clean);

      setUndoSnapshot(snapshot);
      const tid = window.setTimeout(() => {
        setUndoSnapshot(null);
        setUndoTimer(null);
      }, 30000);
      setUndoTimer(tid);

      if (failed.length) {
        push({
          variant: "warning",
          title: "Restore partial",
          message: `${failed.length} key(s) write nahi hui.`,
        });
      } else {
        push({
          variant: "success",
          title: "Restore complete",
          message: "Data wapas aa gaya. Undo 30 sec tak available hai.",
        });
      }

      setPending(null);
    } catch (err) {
      push({
        variant: "error",
        title: "Restore failed",
        message: err.message,
      });
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Undo ---------- */

  const handleUndo = () => {
    if (!undoSnapshot) return;
    try {
      restoreFromSnapshot(undoSnapshot);
      push({
        variant: "info",
        title: "Undo ho gaya",
        message: "Pehla data wapas aa gaya.",
      });
    } catch (err) {
      push({
        variant: "error",
        title: "Undo failed",
        message: err.message,
      });
    } finally {
      if (undoTimer) window.clearTimeout(undoTimer);
      setUndoSnapshot(null);
      setUndoTimer(null);
    }
  };

  /* ---------- Render ---------- */

  return (
    <section className="backup-card" aria-labelledby="backup-card-title">
      <header className="backup-card__head">
        <span className="backup-card__icon" aria-hidden="true">
          <ShieldCheck size={18} strokeWidth={1.8} />
        </span>
        <div>
          <h3 id="backup-card-title">Backup &amp; Restore</h3>
          <p className="backup-card__sub">
            Poora business data ek file mein. Kabhi bhi wapas laayein.
          </p>
        </div>
      </header>

      <div className="backup-card__meta">
        <span>Last backup: <strong>{lastBackupLabel}</strong></span>
      </div>

      <div className="backup-card__actions">
        <button
          type="button"
          className="backup-card__btn backup-card__btn--primary"
          onClick={handleExport}
        >
          <Download size={15} strokeWidth={2} aria-hidden="true" />
          Download Backup
        </button>

        <button
          type="button"
          className="backup-card__btn"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={15} strokeWidth={2} aria-hidden="true" />
          Restore from File
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleFile}
        />
      </div>

      {undoSnapshot && (
        <div className="backup-card__undo">
          <span>Restore ho gaya. Galti hui?</span>
          <button
            type="button"
            className="backup-card__btn backup-card__btn--ghost"
            onClick={handleUndo}
          >
            <RotateCcw size={14} strokeWidth={2} />
            Undo (30s)
          </button>
        </div>
      )}

      {pending && (
        <div
          className="backup-card__confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="backup-confirm-title"
        >
          <div className="backup-card__confirm-inner">
            <header className="backup-card__confirm-head">
              <AlertCircle size={18} strokeWidth={2} aria-hidden="true" />
              <h4 id="backup-confirm-title">Restore confirm karein?</h4>
              <button
                type="button"
                className="backup-card__confirm-close"
                onClick={() => setPending(null)}
                aria-label="Close"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </header>

            <p className="backup-card__confirm-msg">
              Ye data <strong>replace</strong> hoga. Purana data ka auto-backup
              download ho jayega.
            </p>

            <ul className="backup-card__summary">
              {Object.entries(pending.summary).map(([k, v]) => (
                <li key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </li>
              ))}
            </ul>

            <footer className="backup-card__confirm-actions">
              <button
                type="button"
                className="backup-card__btn"
                onClick={() => setPending(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="backup-card__btn backup-card__btn--danger"
                onClick={handleConfirmRestore}
                disabled={busy}
              >
                {busy ? "Restoring…" : "Restore Now"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}