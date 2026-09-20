"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Check, ImagePlus } from "lucide-react";
import { authHeaders } from "../../../lib/auth";
import styles from "./page.module.css";

type OrganizationProfile = {
  name: string;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function OrganizationSettings() {
  const [profile, setProfile] = useState<OrganizationProfile>({ name: "", logo: "", email: "", phone: "", address: "" });
  const [preview, setPreview] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const hasProfile = Boolean(profile.name?.trim() || profile.logo);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/organization/profile`, { headers: authHeaders(), credentials: "include" })
      .then((response) => response.ok ? response.json() as Promise<OrganizationProfile> : null)
      .then((data) => {
        if (data) {
          setProfile(data);
          setPreview(data.logo ?? "");
          setShowForm(false);
        } else {
          setShowForm(true);
        }
      })
      .catch(() => {
        setError("Impossible de charger l’identité de l’entreprise.");
        setShowForm(true);
      });
  }, []);

  function selectLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 1_500_000) {
      setError("Choisissez une image de moins de 1,5 Mo.");
      return;
    }
    setError("");
    setLogoFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Impossible de lire l’image."));
      reader.readAsDataURL(file);
    });
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      let logo = profile.logo ?? null;
      if (logoFile) {
        if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET) {
          try {
            const data = new FormData();
            data.append("file", logoFile);
            data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
            const upload = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: data });
            if (upload.ok) {
              logo = (await upload.json()).secure_url ?? logo;
            }
          } catch {
            logo = null;
          }
        }

        if (!logo) {
          logo = await readFileAsDataUrl(logoFile);
        }
      }
      const response = await fetch(`${API_URL}/api/v1/organization/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          name: profile.name.trim(),
          logo,
          email: profile.email?.trim() || null,
          phone: profile.phone?.trim() || null,
          address: profile.address?.trim() || null,
        }),
      });
      if (!response.ok) throw new Error("La sauvegarde de l’identité a échoué.");
      const updated = await response.json() as OrganizationProfile;
      setProfile(updated);
      setPreview(updated.logo ?? "");
      setLogoFile(null);
      setMessage("Identité de l’entreprise mise à jour.");
      setShowForm(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de sauvegarder les changements.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={styles.organizationCard}>
      <div className={styles.organizationCardHeader}>
        <div><p className={styles.eyebrow}>Identité</p><h2>Votre entreprise</h2><p>Ce nom et ce logo apparaissent dans le dashboard et la barre de navigation.</p></div>
        <span className={styles.organizationMark}><ImagePlus size={18} /></span>
      </div>

      {!showForm ? (
        <div className={styles.organizationSummary}>
          <div className={styles.organizationSummaryInfo}>
            {preview ? <img src={preview} alt="Logo de l’entreprise" className={styles.organizationSummaryLogo} /> : <div className={styles.organizationSummaryFallback}>{profile.name?.slice(0, 1).toUpperCase() || "E"}</div>}
            <div>
              <p className={styles.organizationSummaryLabel}>Entreprise</p>
              <strong>{profile.name || "Non définie"}</strong>
            </div>
          </div>
          <button type="button" className={styles.primaryButton} onClick={() => setShowForm(true)}>
            {hasProfile ? "Modifier" : "Définir"}
          </button>
        </div>
      ) : (
        <form className={styles.organizationForm} onSubmit={saveProfile}>
          <label>Nom de l’entreprise<input required minLength={2} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
          <label>Email<input type="email" value={profile.email ?? ""} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label>
          <label>Téléphone<input value={profile.phone ?? ""} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
          <label>Adresse<input value={profile.address ?? ""} onChange={(event) => setProfile({ ...profile, address: event.target.value })} /></label>
          <label>Logo de l’entreprise<input type="file" accept="image/*" onChange={selectLogo} /></label>
          {preview ? <img src={preview} alt="Aperçu du logo" className={styles.organizationPreview} /> : <div className={styles.organizationEmpty}>Aucun logo</div>}
          <div className={styles.organizationActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => { setShowForm(false); setError(""); setMessage(""); }}>Annuler</button>
            <button type="submit" className={styles.primaryButton} disabled={isSaving}>{isSaving ? "Enregistrement…" : <><Check size={16} /> Enregistrer l’identité</>}</button>
          </div>
        </form>
      )}
      {message ? <p className={styles.organizationSuccess}>{message}</p> : null}
      {error ? <p className={styles.organizationError} role="alert">{error}</p> : null}
    </section>
  );
}
