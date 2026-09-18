"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../login/page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function SignupPage() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [organizationLogo, setOrganizationLogo] = useState("");
  const [organizationLogoFile, setOrganizationLogoFile] = useState<File | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Sélectionnez une image valide.");
      return;
    }
    if (file.size > 1_500_000) {
      setError("L’image doit faire moins de 1,5 Mo.");
      return;
    }
    const reader = new FileReader();
    setOrganizationLogoFile(file);
    reader.onload = () => setOrganizationLogo(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Impossible de lire l’image."));
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      let logoUrl = "";
      if (organizationLogoFile) {
        if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET) {
          try {
            const uploadData = new FormData();
            uploadData.append("file", organizationLogoFile);
            uploadData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
            const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
              method: "POST",
              body: uploadData,
            });
            if (uploadResponse.ok) {
              logoUrl = (await uploadResponse.json()).secure_url ?? "";
            }
          } catch {
            logoUrl = "";
          }
        }

        if (!logoUrl) {
          logoUrl = await readFileAsDataUrl(organizationLogoFile);
        }
      }

      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organization_name: organizationName,
          organization_logo: logoUrl || null,
          full_name: fullName,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.detail ?? "Impossible de créer votre organisation.");
        return;
      }

      const payload = await response.json();
      const accessToken = typeof payload?.access_token === "string" ? payload.access_token : typeof payload?.user?.access_token === "string" ? payload.user.access_token : null;
      window.localStorage.removeItem("quincaillerie_access_token");
      if (accessToken) {
        window.localStorage.setItem("quincaillerie_access_token", accessToken);
      }
      window.localStorage.setItem("quincaillerie_user", JSON.stringify(payload.user ?? payload));
      router.push("/dashboard");
    } catch {
      setError("Le service est momentanément indisponible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.pageShell}>
      <Link href="/" className={styles.brand}>
        <span className={styles.brandMark}>S</span>
        <span>
          <small>ERP</small>
          <strong>Studio</strong>
        </span>
      </Link>

      <section className={styles.loginLayout}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Créer votre organisation</p>
          <h1>Bienvenue dans votre ERP.</h1>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <label htmlFor="organizationName">Nom de l’entreprise</label>
            <input
              id="organizationName"
              type="text"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              required
              minLength={2}
            />
          </div>
          <label className={styles.logoField} htmlFor="organizationLogo">
            <span>Photo de l’entreprise <small>(facultatif)</small></span>
            <input id="organizationLogo" type="file" accept="image/*" onChange={handleLogoChange} />
            {organizationLogo ? <img src={organizationLogo} alt="Aperçu de l’entreprise" className={styles.logoPreview} /> : null}
          </label>
          <div>
            <label htmlFor="fullName">Votre nom</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? "Création…" : "Créer mon organisation"}
          </button>
        </form>

        <div className={styles.signupHint}>
          <span>Vous avez déjà un compte ?</span>
          <Link href="/login">Se connecter</Link>
        </div>
      </section>
    </main>
  );
}
