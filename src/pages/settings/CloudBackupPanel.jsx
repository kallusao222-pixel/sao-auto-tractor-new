import { useEffect, useMemo, useState } from "react";
import { Cloud, Download, LogIn, LogOut, RefreshCw, Upload } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import {
  buildCloudWorkspaceSnapshot,
  getCloudWorkspaceCounts,
  restoreCloudWorkspaceSnapshot,
} from "../../data/cloudWorkspaceBackup";
import { fetchCloudWorkspace, uploadCloudWorkspace } from "../../data/cloudWorkspaceApi";
import "./CloudBackupPanel.css";

const DATA_LABELS = {
  saoAutoTractorTractors: "Tractors",
  saoAutoTractorParties: "Parties",
  saoAutoTractorMaterials: "Materials",
  saoAutoTractorTrips: "Trips",
  saoAutoTractorPayments: "Payments",
  saoAutoTractorStaff: "Staff",
  saoAutoTractorExpenses: "Expenses",
  saoAutoTractorInvoices: "Invoices",
  saoAutoTractorStaffSalaryPayments: "Salary payments",
  saoAutoTractorTripTemplates: "Trip templates",
  saoAutoTractorSettings: "Business settings",
  saoAutoTractorBusinessDetails: "Invoice business details",
  saoAutoTractorStaffAttendance: "Staff attendance",
  saoAutoTractorTripEntryPreferences: "Trip entry preferences",
  saoAutoTractorPreferredTripTractor: "Preferred trip tractor",
  saoAutoTractorInvoiceNumber: "Invoice number",
};

function formatTimestamp(value) {
  if (!value) return "No cloud backup yet";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function CloudBackupPanel() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [cloudBackup, setCloudBackup] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const configured = Boolean(supabase);
  const localSnapshot = useMemo(() => {
    if (!configured) return null;
    try {
      return buildCloudWorkspaceSnapshot();
    } catch {
      return null;
    }
  }, [configured]);
  const localCounts = useMemo(() => getCloudWorkspaceCounts(localSnapshot?.payload), [localSnapshot]);

  async function refreshCloudBackup() {
    if (!supabase || !user) {
      setCloudBackup(null);
      return;
    }
    const current = await fetchCloudWorkspace();
    setCloudBackup(current);
  }

  useEffect(() => {
    if (!supabase) return undefined;
    let mounted = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError(sessionError.message);
      setUser(data.session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCloudBackup(null);
      setError("");
      setMessage("");
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    fetchCloudWorkspace()
      .then((backup) => { if (mounted) setCloudBackup(backup); })
      .catch((cause) => { if (mounted) setError(cause.message || "Could not load the cloud backup."); });
    return () => { mounted = false; };
  }, [user]);

  async function handleAuth(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setMessage("Check your email to confirm your cloud backup account, then sign in here.");
      } else {
        setUser(result.data.user ?? result.data.session?.user ?? null);
        setMessage(mode === "signup" ? "Cloud backup account created." : "Signed in to cloud backup.");
      }
    } catch (cause) {
      setError(cause.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload() {
    if (!localSnapshot) return;
    const details = Object.entries(localCounts)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => `${DATA_LABELS[key] || key}: ${count}`)
      .join("\n");
    const replaces = cloudBackup
      ? `\n\nThis will replace the cloud snapshot from ${formatTimestamp(cloudBackup.updatedAt)}.`
      : "\n\nThis will create the first cloud snapshot.";
    if (!window.confirm(`Upload this browser's business data to your SAO Auto Tractor cloud project?\n\n${details || "No saved records found."}${replaces}`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await uploadCloudWorkspace(localSnapshot);
      await refreshCloudBackup();
      setMessage("Local backup uploaded to your cloud account.");
    } catch (cause) {
      setError(cause.message || "Cloud upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (!cloudBackup?.snapshot) return;
    const counts = getCloudWorkspaceCounts(cloudBackup.snapshot.payload);
    const details = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => `${DATA_LABELS[key] || key}: ${count}`)
      .join("\n");
    if (!window.confirm(`Restore the cloud snapshot from ${formatTimestamp(cloudBackup.updatedAt)} to this browser?\n\n${details}\n\nA downloadable safety copy of the current browser data will be created first. Existing local records in included categories will be replaced.`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      restoreCloudWorkspaceSnapshot(cloudBackup.snapshot);
      setMessage("Cloud backup restored. A safety copy of the previous browser data was downloaded.");
      window.setTimeout(() => window.location.reload(), 900);
    } catch (cause) {
      setError(cause.message || "Cloud restore failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setError("");
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      setUser(null);
      setCloudBackup(null);
      setMessage("Signed out of cloud backup. Local app data is unchanged.");
    } catch (cause) {
      setError(cause.message || "Could not sign out.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cloud-backup-panel" aria-labelledby="cloud-backup-title">
      <div className="cloud-backup-heading">
        <div className="cloud-backup-icon"><Cloud size={20} /></div>
        <div>
          <h3 id="cloud-backup-title">SAO Auto Tractor Cloud Backup</h3>
          <p>Optional, manual backup in your dedicated Supabase project. Local data stays on this device until you upload it.</p>
        </div>
      </div>

      {!configured ? (
        <div className="cloud-backup-notice" role="status">
          Cloud backup is not configured in this build. Your local app continues to work normally.
        </div>
      ) : !user ? (
        <form className="cloud-backup-auth" onSubmit={handleAuth}>
          <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <div className="cloud-backup-actions">
            <button className="settings-btn settings-btn-primary" type="submit" disabled={busy}>
              <LogIn size={15} />{busy ? "Please wait…" : mode === "signup" ? "Create cloud account" : "Sign in"}
            </button>
            <button className="settings-btn settings-btn-secondary" type="button" disabled={busy} onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}>
              {mode === "signin" ? "Create account" : "I already have an account"}
            </button>
          </div>
          <small>Cloud backup account is separate from the local app PIN/password. Use an email you can access.</small>
        </form>
      ) : (
        <div className="cloud-backup-connected">
          <div className="cloud-backup-account"><span>Signed in as</span><strong>{user.email || "Cloud backup account"}</strong></div>
          <div className="cloud-backup-status">
            <strong>{formatTimestamp(cloudBackup?.updatedAt)}</strong>
            <span>{cloudBackup ? "Cloud snapshot" : "No cloud snapshot stored yet"}</span>
          </div>
          <div className="cloud-backup-actions">
            <button className="settings-btn settings-btn-primary" type="button" onClick={handleUpload} disabled={busy || !localSnapshot}>
              <Upload size={15} />{busy ? "Working…" : cloudBackup ? "Upload / replace cloud backup" : "Upload local backup"}
            </button>
            <button className="settings-btn settings-btn-secondary" type="button" onClick={handleRestore} disabled={busy || !cloudBackup}>
              <Download size={15} />Restore cloud backup
            </button>
            <button className="settings-btn settings-btn-secondary" type="button" onClick={() => { setBusy(true); setError(""); refreshCloudBackup().catch((cause) => setError(cause.message)).finally(() => setBusy(false)); }} disabled={busy}>
              <RefreshCw size={15} />Refresh status
            </button>
            <button className="settings-btn settings-btn-secondary" type="button" onClick={handleSignOut} disabled={busy}>
              <LogOut size={15} />Sign out
            </button>
          </div>
        </div>
      )}
      {message && <p className="cloud-backup-message" role="status">{message}</p>}
      {error && <p className="cloud-backup-error" role="alert">{error}</p>}
      <p className="cloud-backup-privacy">Business records and settings are sent to the dedicated SAO Auto Tractor Supabase project only when you choose Upload. PIN, local password, and login state are excluded.</p>
    </section>
  );
}
