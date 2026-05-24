import { adminSupabase } from "./admin";

export async function getSignedUrl(storagePath: string, expiresIn = 86400): Promise<string> {
  const { data, error } = await adminSupabase.storage
    .from("property-media")
    .createSignedUrl(storagePath, expiresIn); // 24h default (fix M3)

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message}`);
  }
  return data.signedUrl;
}

export async function getSignedUrls(
  paths: string[],
  expiresIn = 86400
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const { data, error } = await adminSupabase.storage
    .from("property-media")
    .createSignedUrls(paths, expiresIn);

  if (error || !data) throw new Error(`Batch signed URL failed: ${error?.message}`);

  return Object.fromEntries(
    data.map(item => [item.path, item.signedUrl ?? ""])
  );
}

export async function deleteStorageFile(storagePath: string): Promise<void> {
  await adminSupabase.storage
    .from("property-media")
    .remove([storagePath]);
}
