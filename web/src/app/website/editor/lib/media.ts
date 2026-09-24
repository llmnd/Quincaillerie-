import { authHeaders } from "../../../../lib/auth";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ?? "";
const API_URL =
  process.env.NODE_ENV === "production"
    ? "https://quincaillerie-858p.onrender.com"
    : configuredApiUrl || "http://localhost:8000";
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
/* ============================================================
   Upload média
   ============================================================ */
export async function uploadWebsiteMedia(file: File): Promise<string> {
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET) {
    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", file);
    cloudinaryForm.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: cloudinaryForm },
    );

    if (cloudinaryResponse.ok) {
      const payload = (await cloudinaryResponse.json()) as {
        secure_url?: string;
        url?: string;
      };
      const url = payload.secure_url ?? payload.url ?? "";
      if (url) return url;
    }
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/v1/websites/current/media/upload`, {
    method: "POST",
    credentials: "include",
    headers: { ...authHeaders() },
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof (payload as { detail?: string }).detail === "string"
        ? (payload as { detail: string }).detail
        : "Impossible d'importer l'image";
    throw new Error(message);
  }

  const payload = (await response.json()) as
    | { url?: string; data?: { url?: string }; file_url?: string }
    | string;

  if (typeof payload === "string") return payload;
  return payload.url ?? payload.data?.url ?? payload.file_url ?? "";
}
