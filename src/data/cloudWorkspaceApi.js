import { supabase } from "../lib/supabaseClient";
import { CLOUD_WORKSPACE_SCHEMA_VERSION, validateCloudWorkspaceSnapshot } from "./cloudWorkspaceBackup";

const TABLE = "auto_tractor_workspaces";

function requireClient() {
  if (!supabase) throw new Error("Cloud backup is not configured for this app yet.");
  return supabase;
}

async function requireUser() {
  const client = requireClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sign in to your cloud backup account first.");
  return { client, user: data.user };
}

export async function fetchCloudWorkspace() {
  const { client, user } = await requireUser();
  const { data, error } = await client
    .from(TABLE)
    .select("schema_version,payload,updated_at")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    updatedAt: data.updated_at,
    snapshot: validateCloudWorkspaceSnapshot({
      application: "sao-auto-tractor",
      schemaVersion: data.schema_version,
      payload: data.payload,
    }),
  };
}

export async function uploadCloudWorkspace(snapshot) {
  const { client, user } = await requireUser();
  const valid = validateCloudWorkspaceSnapshot(snapshot);
  const { data, error } = await client
    .from(TABLE)
    .upsert({
      owner_id: user.id,
      schema_version: CLOUD_WORKSPACE_SCHEMA_VERSION,
      payload: valid.payload,
      updated_at: new Date().toISOString(),
    }, { onConflict: "owner_id" })
    .select("updated_at")
    .single();
  if (error) throw error;
  return data;
}
