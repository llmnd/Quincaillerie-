"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Droplets,
  Plus,
  Thermometer,
  X,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import { authHeaders, clearStoredAuth, getStoredUser } from "../../lib/auth";
import styles from "./page.module.css";

type Batch = {
  id: number;
  reference: string;
  species: string;
  production_type: string;
  breed?: string | null;
  image_url?: string | null;
  start_date: string;
  initial_count: number;
  current_count: number;
  status: string;
};

type HealthEvent = { id: number; batch_id: number; event_date: string; event_type: string; title: string; diagnosis?: string | null; mortality_count: number };
type EggProduction = { id: number; batch_id: number; production_date: string; quantity: number; damaged_quantity: number };
type Product = { id: number; name: string; sku: string; unit_price: number; stock_quantity: number; is_active: boolean };
type ProductDraft = { sku: string; name: string; category: string; unit_price: string };
type BatchHealth = "healthy" | "watch" | "alert";

const DECOR_FARM_IMAGE = "https://i.pinimg.com/736x/35/c9/c6/35c9c61b569fd8f5a560c960c2325c56.jpg";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function readJsonSafely<T>(response: Response): Promise<T | null> {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return await response.json() as T;
  } catch {
    return null;
  }
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyBatch = { reference: "", species: "chicken", production_type: "broiler", breed: "", start_date: "", initial_count: "", image_url: "" };
const emptyHealth = { batch_id: "", event_date: "", event_type: "vaccination", title: "", diagnosis: "", mortality_count: "0" };
const emptyEgg = { batch_id: "", production_date: "", quantity: "", damaged_quantity: "0" };
const emptyTransfer = { batch_id: "", product_id: "", egg_production_id: "", transfer_type: "poultry", quantity: "", unit_cost: "", transfer_date: "", notes: "" };
const emptyProductDraft: ProductDraft = { sku: "", name: "", category: "", unit_price: "" };

const isLayerProduction = (value?: string | null) =>
  ["layer", "layers", "pondeuse", "pondeuses", "ponte"].includes(
    (value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  );

const batchAgeDays = (start: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 86_400_000));

const formatAge = (start: string) => {
  const d = batchAgeDays(start);
  if (d < 14) return `${d} j`;
  if (d < 60) return `${Math.floor(d / 7)} sem`;
  if (d < 365) return `${Math.floor(d / 30)} mois`;
  return `${(d / 365).toFixed(1)} an`;
};

const batchHealthStatus = (batchId: number, events: HealthEvent[]): BatchHealth => {
  const list = events.filter(e => e.batch_id === batchId);
  if (list.length === 0) return "healthy";
  const recentWithLoss = list.some(
    e => e.mortality_count > 0 && Date.now() - new Date(e.event_date).getTime() < 7 * 86_400_000
  );
  if (recentWithLoss) return "alert";
  if (list.some(e => e.mortality_count > 0)) return "watch";
  return "healthy";
};

const HEALTH_LABEL: Record<BatchHealth, string> = {
  healthy: "Sain",
  watch: "Surveiller",
  alert: "Alerte",
};

export default function FarmingPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [eggProductions, setEggProductions] = useState<EggProduction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [batchForm, setBatchForm] = useState(emptyBatch);
  const [healthForm, setHealthForm] = useState(emptyHealth);
  const [eggForm, setEggForm] = useState(emptyEgg);
  const [transferForm, setTransferForm] = useState(emptyTransfer);
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProductDraft);

  const [activeForm, setActiveForm] = useState<"batch" | "health" | "egg" | "transfer" | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null);
  const [workspaceView, setWorkspaceView] = useState<"overview" | "batches" | "health" | "production">("overview");
  const [batchFilter, setBatchFilter] = useState<"all" | "layer" | "broiler" | "alert">("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // ✅ Évite les mismatches serveur/client
  const [mounted, setMounted] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [todayLabel, setTodayLabel] = useState("");

  useEffect(() => {
    setMounted(true);
    setPortalReady(true);
    setTodayLabel(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));
    setIsAdmin(getStoredUser()?.role === "admin");
  }, []);

  // Initialiser les dates des formulaires une fois monté côté client
  useEffect(() => {
    if (!mounted) return;
    const iso = todayIso();
    setBatchForm(prev => ({ ...prev, start_date: prev.start_date || iso }));
    setHealthForm(prev => ({ ...prev, event_date: prev.event_date || iso }));
    setEggForm(prev => ({ ...prev, production_date: prev.production_date || iso }));
    setTransferForm(prev => ({ ...prev, transfer_date: prev.transfer_date || iso }));
  }, [mounted]);

  async function load() {
    try {
      const [bRes, hRes, eRes, pRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/farming/batches`, { headers: authHeaders(), credentials: "include" }),
        fetch(`${API_URL}/api/v1/farming/health-events`, { headers: authHeaders(), credentials: "include" }),
        fetch(`${API_URL}/api/v1/farming/egg-productions`, { headers: authHeaders(), credentials: "include" }),
        fetch(`${API_URL}/api/v1/products`, { headers: authHeaders(), credentials: "include" }),
      ]);

      const nextBatches = await readJsonSafely<Batch[]>(bRes);
      const nextHealthEvents = await readJsonSafely<HealthEvent[]>(hRes);
      const nextEggProductions = await readJsonSafely<EggProduction[]>(eRes);
      const nextProducts = await readJsonSafely<Product[]>(pRes);

      if (bRes.status === 401 || bRes.status === 403) {
        clearStoredAuth();
        if (typeof window !== "undefined") window.location.replace("/login");
        return;
      }
      if (bRes.ok) setBatches(nextBatches ?? []);
      if (hRes.ok) setHealthEvents(nextHealthEvents ?? []);
      if (eRes.ok) setEggProductions(nextEggProductions ?? []);
      if (pRes.ok) setProducts(nextProducts ?? []);
    } catch (err) {
      console.error("Erreur de chargement:", err);
    }
  }

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!isMounted) return;
      await load();
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, []);

  function openForm(form: "batch" | "health" | "egg" | "transfer") {
    if (form === "health") {
      const activeBatchIds = new Set(batches.filter(b => b.status === "active").map(b => String(b.id)));
      const selectedBatchId = activeBatchIds.has(healthForm.batch_id)
        ? healthForm.batch_id
        : batches.find(b => b.status === "active")?.id?.toString() ?? "";
      setHealthForm(prev => ({ ...prev, batch_id: selectedBatchId }));
    }
    if (form === "egg") {
      const eligibleBatches = batches.filter(b => b.status === "active" && isLayerProduction(b.production_type));
      const eligibleIds = new Set(eligibleBatches.map(b => String(b.id)));
      const selectedBatchId = eligibleIds.has(eggForm.batch_id)
        ? eggForm.batch_id
        : eligibleBatches[0]?.id?.toString() ?? "";
      setEggForm(prev => ({ ...prev, batch_id: selectedBatchId }));
    }
    if (form === "transfer") {
      const selectedBatchId = batches.find(b => b.status === "active")?.id?.toString() ?? "";
      const selectedProductId = products[0]?.id?.toString() ?? "";
      setTransferForm(prev => ({ ...prev, batch_id: selectedBatchId, product_id: selectedProductId }));
    }
    setActiveForm(form);
  }

  useEffect(() => {
    if (!activeForm) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveForm(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeForm]);

  function handleImageSelect(event: ChangeEvent<HTMLInputElement>) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setBatchForm(prev => ({ ...prev, image_url: result }));
    };
    reader.readAsDataURL(file);
  }

  async function createBatch(e: FormEvent) {
    e.preventDefault();
    const payload = { ...batchForm, initial_count: Number(batchForm.initial_count), species: batchForm.species || "chicken" };
    const url = editingBatchId ? `${API_URL}/api/v1/farming/batches/${editingBatchId}` : `${API_URL}/api/v1/farming/batches`;
    const method = editingBatchId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setBatchForm({ ...emptyBatch, start_date: todayIso() });
      setEditingBatchId(null);
      setActiveForm(null);
      load();
    }
  }

  async function deleteBatch(batchId: number) {
    if (!window.confirm("Voulez-vous vraiment supprimer ce lot ?")) return;
    const res = await fetch(`${API_URL}/api/v1/farming/batches/${batchId}`, {
      method: "DELETE",
      headers: authHeaders(),
      credentials: "include",
    });
    if (res.ok) {
      setSelectedBatch(null);
      setEditingBatchId(null);
      setActiveForm(null);
      load();
    }
  }

  async function createHealth(e: FormEvent) {
    e.preventDefault();
    const batch = batches.find(item => item.id === Number(healthForm.batch_id) && item.status === "active");
    if (!batch) {
      alert("Aucune bande active disponible pour cet événement sanitaire.");
      return;
    }
    const res = await fetch(`${API_URL}/api/v1/farming/health-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify({
        ...healthForm,
        batch_id: Number(healthForm.batch_id),
        mortality_count: Number(healthForm.mortality_count),
        affected_count: Number(healthForm.mortality_count),
      }),
    });
    if (res.ok) {
      setHealthForm({ ...emptyHealth, event_date: todayIso() });
      setActiveForm(null);
      load();
    }
  }

  async function createEgg(e: FormEvent) {
    e.preventDefault();
    const batch = batches.find(
      item => item.id === Number(eggForm.batch_id) && item.status === "active" && isLayerProduction(item.production_type)
    );
    if (!batch) {
      alert("Aucune bande de ponte active disponible pour enregistrer une récolte.");
      return;
    }
    const res = await fetch(`${API_URL}/api/v1/farming/egg-productions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify({
        ...eggForm,
        batch_id: Number(eggForm.batch_id),
        quantity: Number(eggForm.quantity),
        damaged_quantity: Number(eggForm.damaged_quantity),
      }),
    });
    if (res.ok) {
      setEggForm({ ...emptyEgg, production_date: todayIso() });
      setActiveForm(null);
      load();
    }
  }

  async function createTransfer(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API_URL}/api/v1/farming/stock-transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify({
        ...transferForm,
        batch_id: Number(transferForm.batch_id),
        product_id: Number(transferForm.product_id),
        egg_production_id: transferForm.transfer_type === "eggs" ? Number(transferForm.egg_production_id) : null,
        quantity: Number(transferForm.quantity),
        unit_cost: Number(transferForm.unit_cost || 0),
      }),
    });
    if (res.ok) {
      setTransferForm({ ...emptyTransfer, transfer_date: todayIso() });
      setActiveForm(null);
      load();
    } else {
      const error = await readJsonSafely<{ detail?: string }>(res);
      alert(error?.detail || "Le transfert vers le stock a échoué.");
    }
  }

  async function createProductFromTransfer() {
    const sku = productDraft.sku.trim();
    const name = productDraft.name.trim();
    if (!sku || !name) {
      alert("Le SKU et le nom du produit sont obligatoires.");
      return;
    }
    setIsCreatingProduct(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          sku,
          name,
          category: productDraft.category.trim() || null,
          unit_price: Number(productDraft.unit_price || 0),
          stock_quantity: 0,
          image_url: null,
          description: "Produit issu de la production agricole",
        }),
      });
      if (!res.ok) {
        const error = await readJsonSafely<{ detail?: string }>(res);
        alert(error?.detail || "La création du produit a échoué.");
        return;
      }
      const product = await res.json() as Product;
      setProducts(current => [...current, product]);
      setTransferForm(current => ({ ...current, product_id: String(product.id) }));
      setProductDraft(emptyProductDraft);
      setProductModalOpen(false);
    } finally {
      setIsCreatingProduct(false);
    }
  }

  const totalBirds = batches.reduce((acc, b) => acc + b.current_count, 0);
  const totalEggs = eggProductions.reduce((acc, e) => acc + e.quantity, 0);
  const totalBrokenEggs = eggProductions.reduce((acc, e) => acc + (e.damaged_quantity || 0), 0);

  const activeBatches = batches.filter(b => b.status === "active");
  const layerBatches = batches.filter(b => b.status === "active" && isLayerProduction(b.production_type));
  const eggSelectOptions = layerBatches;

  const filteredBatches = batches.filter(b => {
    if (batchFilter === "all") return true;
    if (batchFilter === "layer") return isLayerProduction(b.production_type);
    if (batchFilter === "broiler") return !isLayerProduction(b.production_type);
    if (batchFilter === "alert") return batchHealthStatus(b.id, healthEvents) !== "healthy";
    return true;
  });

  const selectedBatchEggs = selectedBatch ? eggProductions.filter(e => e.batch_id === selectedBatch.id) : [];
  const selectedBatchHealthEvents = selectedBatch
    ? healthEvents.filter(e => e.batch_id === selectedBatch.id).sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
    : [];
  const selectedBatchValidEggs = selectedBatchEggs.reduce((acc, e) => acc + e.quantity, 0);
  const selectedBatchBrokenEggs = selectedBatchEggs.reduce((acc, e) => acc + (e.damaged_quantity || 0), 0);
  const latestHealthEvents = healthEvents.slice().sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
  const mortalityTotal = healthEvents.reduce((acc, event) => acc + (event.mortality_count || 0), 0);
  const healthyBatches = activeBatches.filter(batch => batchHealthStatus(batch.id, healthEvents) === "healthy");
  const productionRate = totalBirds > 0 ? Math.round((totalEggs / totalBirds) * 100) / 100 : 0;

  const recentEggs = eggProductions
    .slice()
    .sort((a, b) => new Date(b.production_date).getTime() - new Date(a.production_date).getTime())
    .slice(0, 5);

  // -------------------------------------------------------------------------
  // Portails
  // -------------------------------------------------------------------------
  const actionModalPortal =
    portalReady && activeForm
      ? createPortal(
          <div
            className={styles.actionModalOverlay}
            onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveForm(null); }}
          >
            <section className={styles.actionModal} role="dialog" aria-modal="true" aria-labelledby="action-modal-title">
              {activeForm === "batch" && (
                <form className={styles.formInlineCard} onSubmit={createBatch}>
                  <div className={styles.formHeader}>
                    <div><span className={styles.modalEyebrow}>Nouvelle opération</span><h2 id="action-modal-title">{editingBatchId ? "Modifier la bande" : "Créer une bande"}</h2></div>
                    <button type="button" className={styles.modalCloseButton} onClick={() => { setEditingBatchId(null); setActiveForm(null); }} aria-label="Fermer"><X size={18} /></button>
                  </div>
                  <div className={styles.gridInputs}>
                    <div className={styles.inputField}><label>Référence du lot</label><input required placeholder="Lot Pondeuses 04" value={batchForm.reference} onChange={e => setBatchForm({...batchForm, reference: e.target.value})} /></div>
                    <div className={styles.inputField}><label>Type de production</label><select value={batchForm.production_type} onChange={e => setBatchForm({...batchForm, production_type: e.target.value})}><option value="broiler">Poulets de chair</option><option value="layer">Pondeuses</option></select></div>
                    <div className={styles.inputField}><label>Souche / Race</label><input placeholder="Cobb 500, ISA Brown" value={batchForm.breed} onChange={e => setBatchForm({...batchForm, breed: e.target.value})} /></div>
                    <div className={styles.inputField}><label>Date d&apos;arrivée</label><input type="date" value={batchForm.start_date} onChange={e => setBatchForm({...batchForm, start_date: e.target.value})} /></div>
                    <div className={styles.inputField}><label>Effectif initial</label><input type="number" required placeholder="1000" value={batchForm.initial_count} onChange={e => setBatchForm({...batchForm, initial_count: e.target.value})} /></div>
                    <div className={styles.inputField}>
                      <label>Image du lot</label>
                      <input type="file" accept="image/*" onChange={handleImageSelect} onClick={event => event.stopPropagation()} style={{ display: "none" }} id="batch-image-upload" />
                      <label htmlFor="batch-image-upload" className={styles.btnMinimal} onClick={event => event.stopPropagation()} style={{ display: "inline-flex", justifyContent: "center", width: "100%", cursor: "pointer" }}>
                        {batchForm.image_url ? "Changer l'image" : "Choisir une image"}
                      </label>
                      {batchForm.image_url && (
                        <img src={batchForm.image_url} alt="Preview du lot" style={{ width: "100%", height: "112px", objectFit: "cover", borderRadius: "4px", marginTop: "10px" }} />
                      )}
                    </div>
                  </div>
                  <button type="submit" className={styles.btnPrimary}>{editingBatchId ? "Enregistrer" : "Créer la bande"}</button>
                </form>
              )}

              {activeForm === "transfer" && (
                <>
                  <form className={styles.formInlineCard} onSubmit={createTransfer}>
                    <div className={styles.formHeader}>
                      <div><span className={styles.modalEyebrow}>Production agricole</span><h2 id="action-modal-title">Transférer vers le stock</h2></div>
                      <button type="button" className={styles.modalCloseButton} onClick={() => setActiveForm(null)} aria-label="Fermer"><X size={18} /></button>
                    </div>
                    <p className={styles.emptyState}>Ce transfert rend la production disponible dans les ventes et conserve sa bande d&apos;origine.</p>
                    {products.length === 0 && (
                      <div className={styles.emptyState}>
                        Aucun produit commercial n&apos;est encore disponible. <Link href="/products" onClick={() => setActiveForm(null)}>Créer un produit commercial</Link>.
                      </div>
                    )}
                    <div className={styles.gridInputs}>
                      <div className={styles.inputField}>
                        <label>Type de sortie</label>
                        <select required value={transferForm.transfer_type} onChange={event => setTransferForm({ ...transferForm, transfer_type: event.target.value, egg_production_id: "" })}>
                          <option value="poultry">Volailles</option>
                          <option value="eggs">Œufs</option>
                        </select>
                      </div>
                      <div className={styles.inputField}>
                        <label>Bande d&apos;origine</label>
                        <select required value={transferForm.batch_id} onChange={event => setTransferForm({ ...transferForm, batch_id: event.target.value, egg_production_id: "" })}>
                          <option value="">Sélectionner une bande</option>
                          {activeBatches.map(batch => <option key={batch.id} value={batch.id}>{batch.reference} ({batch.current_count} sujets)</option>)}
                        </select>
                      </div>
                      {transferForm.transfer_type === "eggs" && (
                        <div className={styles.inputField}>
                          <label>Production de ponte</label>
                          <select required value={transferForm.egg_production_id} onChange={event => setTransferForm({ ...transferForm, egg_production_id: event.target.value })}>
                            <option value="">Sélectionner une production</option>
                            {eggProductions.filter(production => String(production.batch_id) === transferForm.batch_id).map(production => (
                              <option key={production.id} value={production.id}>{new Date(production.production_date).toLocaleDateString("fr-FR")} · {production.quantity - production.damaged_quantity} œufs utilisables</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className={styles.inputField}>
                        <label>Produit commercial</label>
                        <select required value={transferForm.product_id} onChange={event => setTransferForm({ ...transferForm, product_id: event.target.value })}>
                          <option value="">Sélectionner un produit</option>
                          {products.map(product => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
                        </select>
                        <button type="button" className={styles.btnMinimal} onClick={() => setProductModalOpen(true)}>
                          <Plus size={14} /> Ajouter un produit
                        </button>
                      </div>
                      <div className={styles.inputField}><label>Quantité</label><input required min="1" type="number" value={transferForm.quantity} onChange={event => setTransferForm({ ...transferForm, quantity: event.target.value })} /></div>
                      <div className={styles.inputField}><label>Coût unitaire</label><input min="0" step="0.01" type="number" value={transferForm.unit_cost} onChange={event => setTransferForm({ ...transferForm, unit_cost: event.target.value })} placeholder="0" /></div>
                      <div className={styles.inputField}><label>Date du transfert</label><input required type="date" value={transferForm.transfer_date} onChange={event => setTransferForm({ ...transferForm, transfer_date: event.target.value })} /></div>
                      <div className={styles.inputField}><label>Note</label><input value={transferForm.notes} onChange={event => setTransferForm({ ...transferForm, notes: event.target.value })} placeholder="Abattage, collecte, marché…" /></div>
                    </div>
                    <button type="submit" className={styles.btnPrimary} disabled={products.length === 0}>Ajouter au stock commercial</button>
                  </form>

                  {productModalOpen && createPortal(
                    <div className={styles.nestedModalOverlay} onMouseDown={event => { if (event.target === event.currentTarget) setProductModalOpen(false); }}>
                      <div className={`${styles.actionModal} ${styles.productMiniModal}`} role="dialog" aria-modal="true">
                        <div className={styles.formInlineCard}>
                          <div className={styles.formHeader}>
                            <div><span className={styles.modalEyebrow}>Catalogue commercial</span><h2>Ajouter un produit</h2></div>
                            <button type="button" className={styles.modalCloseButton} onClick={() => setProductModalOpen(false)} aria-label="Fermer"><X size={18} /></button>
                          </div>
                          <p className={styles.emptyState}>Le stock initial sera créé à zéro. Le transfert de production ajoutera ensuite la quantité.</p>
                          <div className={styles.gridInputs}>
                            <div className={styles.inputField}><label>SKU / Référence</label><input required value={productDraft.sku} onChange={event => setProductDraft({ ...productDraft, sku: event.target.value })} placeholder="OEUFS-STD" /></div>
                            <div className={styles.inputField}><label>Nom du produit</label><input required value={productDraft.name} onChange={event => setProductDraft({ ...productDraft, name: event.target.value })} placeholder="Œufs frais" /></div>
                            <div className={styles.inputField}><label>Catégorie</label><input value={productDraft.category} onChange={event => setProductDraft({ ...productDraft, category: event.target.value })} placeholder="Élevage" /></div>
                            <div className={styles.inputField}><label>Prix unitaire</label><input min="0" step="0.01" type="number" value={productDraft.unit_price} onChange={event => setProductDraft({ ...productDraft, unit_price: event.target.value })} placeholder="0" /></div>
                          </div>
                          <button type="button" className={styles.btnPrimary} onClick={() => void createProductFromTransfer()} disabled={isCreatingProduct}>
                            {isCreatingProduct ? "Création…" : "Créer et sélectionner"}
                          </button>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}
                </>
              )}

              {activeForm === "health" && (
                <form className={styles.formInlineCard} onSubmit={createHealth}>
                  <div className={styles.formHeader}>
                    <div><span className={styles.modalEyebrow}>Suivi sanitaire</span><h2 id="action-modal-title">Événement sanitaire</h2></div>
                    <button type="button" className={styles.modalCloseButton} onClick={() => setActiveForm(null)} aria-label="Fermer"><X size={18} /></button>
                  </div>
                  <div className={styles.gridInputs}>
                    <div className={styles.inputField}>
                      <label>Bande concernée</label>
                      <select required value={healthForm.batch_id} onChange={e => setHealthForm({...healthForm, batch_id: e.target.value})}>
                        <option value="">Sélectionner une bande</option>
                        {activeBatches.map(b => <option key={b.id} value={b.id}>{b.reference} ({b.current_count} sujets)</option>)}
                      </select>
                    </div>
                    <div className={styles.inputField}><label>Type d&apos;intervention</label><select value={healthForm.event_type} onChange={e => setHealthForm({...healthForm, event_type: e.target.value})}><option value="vaccination">Vaccination</option><option value="treatment">Traitement</option><option value="mortality">Mortalité</option></select></div>
                    <div className={styles.inputField}><label>Intitulé</label><input required placeholder="Vaccin Gumboro Booster" value={healthForm.title} onChange={e => setHealthForm({...healthForm, title: e.target.value})} /></div>
                    <div className={styles.inputField}><label>Pertes (mortalité)</label><input type="number" value={healthForm.mortality_count} onChange={e => setHealthForm({...healthForm, mortality_count: e.target.value})} /></div>
                  </div>
                  <button className={styles.btnPrimary}>Enregistrer l&apos;événement</button>
                </form>
              )}

              {activeForm === "egg" && (
                <form className={styles.formInlineCard} onSubmit={createEgg}>
                  <div className={styles.formHeader}>
                    <div><span className={styles.modalEyebrow}>Production du jour</span><h2 id="action-modal-title">Saisie de la ponte</h2></div>
                    <button type="button" className={styles.modalCloseButton} onClick={() => setActiveForm(null)} aria-label="Fermer"><X size={18} /></button>
                  </div>
                  {eggSelectOptions.length === 0 && <p className={styles.formNotice}>Aucune bande de ponte active. Créez une bande « Pondeuses » pour enregistrer une récolte.</p>}
                  <div className={styles.gridInputs}>
                    <div className={styles.inputField}>
                      <label>Bande de Pondeuses</label>
                      <select required value={eggForm.batch_id} onChange={e => setEggForm({...eggForm, batch_id: e.target.value})}>
                        <option value="">{eggSelectOptions.length ? "Sélectionner la bande" : "Aucune bande de ponte"}</option>
                        {eggSelectOptions.map(b => <option key={b.id} value={b.id}>{b.reference} — {b.current_count} sujets</option>)}
                      </select>
                    </div>
                    <div className={styles.inputField}><label>Date de récolte</label><input type="date" value={eggForm.production_date} onChange={e => setEggForm({...eggForm, production_date: e.target.value})} /></div>
                    <div className={styles.inputField}><label>Œufs valides</label><input type="number" required placeholder="350" value={eggForm.quantity} onChange={e => setEggForm({...eggForm, quantity: e.target.value})} /></div>
                    <div className={styles.inputField}><label>Œufs cassés</label><input type="number" value={eggForm.damaged_quantity} onChange={e => setEggForm({...eggForm, damaged_quantity: e.target.value})} /></div>
                  </div>
                  <button className={styles.btnPrimary} disabled={eggSelectOptions.length === 0}>Enregistrer la récolte</button>
                </form>
              )}
            </section>
          </div>,
          document.body
        )
      : null;

  const drawerPortal =
    portalReady && selectedBatch
      ? createPortal(
          <div className={styles.drawerOverlay} onClick={() => setSelectedBatch(null)}>
            <div className={styles.drawer} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
              <div>
                <div className={styles.drawerHeader}>
                  <span className={styles.eyebrow}>{selectedBatch.status || "ACTIF"}</span>
                  <button className={styles.closeBtn} onClick={() => setSelectedBatch(null)} aria-label="Fermer">✕</button>
                </div>

                <img
                  src={selectedBatch.image_url && selectedBatch.image_url.trim() !== "" ? selectedBatch.image_url : DECOR_FARM_IMAGE}
                  alt={selectedBatch.reference}
                  className={styles.drawerImage}
                />

                <div className={styles.drawerBody}>
                  <div>
                    <h2 style={{ fontSize: "1.6rem", fontWeight: 300, margin: "0 0 6px 0", color: "var(--ink-1)", letterSpacing: "-0.03em" }}>{selectedBatch.reference}</h2>
                    <p style={{ color: "var(--ink-3)", fontSize: "0.82rem", margin: 0 }}>
                      {selectedBatch.production_type === "layer" ? "Poule Pondeuse" : "Poulet de Chair"} · {selectedBatch.breed || "Standard"}
                    </p>
                  </div>

                  <div className={styles.drawerCard}>
                    <label>Effectif actuel</label>
                    <span>{selectedBatch.current_count} sujets</span>
                  </div>

                  <div className={styles.drawerCard}>
                    <label>Effectif initial</label>
                    <span style={{ fontSize: "1.1rem" }}>{selectedBatch.initial_count} sujets</span>
                  </div>

                  <div className={styles.drawerCard}>
                    <label>Âge de la bande</label>
                    <span style={{ fontSize: "1.1rem" }}>{mounted ? formatAge(selectedBatch.start_date) : "—"}</span>
                  </div>

                  <div className={styles.drawerCard}>
                    <label>Mise en place</label>
                    <span style={{ fontSize: "1.1rem" }}>{new Date(selectedBatch.start_date).toLocaleDateString("fr-FR")}</span>
                  </div>

                  <div className={styles.drawerCard}>
                    <label>Production totale</label>
                    <span style={{ fontSize: "1.1rem" }}>{selectedBatchValidEggs.toLocaleString("fr-FR")} œufs</span>
                  </div>

                  <div className={styles.drawerCard}>
                    <label>Œufs cassés</label>
                    <span style={{ fontSize: "1.1rem" }}>
                      {selectedBatchBrokenEggs.toLocaleString("fr-FR")} unités
                    </span>
                  </div>

                  <div className={styles.drawerCard} style={{ display: "block" }}>
                    <label>Santé</label>
                    {selectedBatchHealthEvents.length === 0 ? (
                      <span style={{ fontSize: "0.95rem" }}>Aucun événement</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                        {selectedBatchHealthEvents.slice(0, 4).map(event => (
                          <div key={event.id} style={{ border: "1px solid var(--stroke-1)", borderRadius: "4px", padding: "9px 11px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <strong style={{ color: "var(--ink-1)", fontSize: "0.85rem", fontWeight: 500 }}>{event.title}</strong>
                              <span style={{ color: event.mortality_count > 0 ? "var(--danger)" : "var(--accent)", fontSize: "0.75rem", fontWeight: 600 }}>
                                {event.mortality_count > 0 ? `-${event.mortality_count}` : "OK"}
                              </span>
                            </div>
                            <div style={{ color: "var(--ink-4)", fontSize: "0.7rem" }}>
                              {event.event_type.toUpperCase()} · {new Date(event.event_date).toLocaleDateString("fr-FR")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button
                  className={styles.btnPrimary}
                  style={{ flex: 1 }}
                  onClick={() => {
                    setEditingBatchId(selectedBatch.id);
                    setBatchForm({
                      reference: selectedBatch.reference,
                      species: selectedBatch.species,
                      production_type: selectedBatch.production_type,
                      breed: selectedBatch.breed ?? "",
                      start_date: selectedBatch.start_date,
                      initial_count: String(selectedBatch.initial_count),
                      image_url: selectedBatch.image_url ?? "",
                    });
                    setSelectedBatch(null);
                    setActiveForm("batch");
                  }}
                >
                  Modifier
                </button>
                <button className={styles.btnMinimal} style={{ flex: 1 }} onClick={() => deleteBatch(selectedBatch.id)}>
                  Supprimer
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  const renderBatchCard = (batch: Batch) => {
    const health = batchHealthStatus(batch.id, healthEvents);
    const type = isLayerProduction(batch.production_type) ? "Pondeuses" : "Chair";
    return (
      <button
        key={batch.id}
        type="button"
        className={styles.batchCard}
        onClick={() => setSelectedBatch(batch)}
        aria-label={`${batch.reference} — ${batch.current_count} sujets, état ${HEALTH_LABEL[health]}`}
      >
        <div className={styles.batchImageWrap}>
          <img
            className={styles.batchImage}
            src={batch.image_url && batch.image_url.trim() !== "" ? batch.image_url : DECOR_FARM_IMAGE}
            alt=""
          />
          <span className={`${styles.batchStatusDot} ${health === "alert" ? styles.dotAlert : health === "watch" ? styles.dotWarn : styles.dotOk}`} aria-hidden="true" />
          <span className={styles.batchType}>{type}</span>
        </div>
        <div className={styles.batchBody}>
          <strong className={styles.batchName}>{batch.reference}</strong>
          <small className={styles.batchMeta} suppressHydrationWarning>
            {batch.breed || "Standard"}{mounted ? ` · ${formatAge(batch.start_date)}` : ""}
          </small>
          <div className={styles.batchFooter}>
            <span className={styles.batchCount}>{batch.current_count.toLocaleString("fr-FR")}</span>
            <span className={`${styles.healthBadge} ${health === "alert" ? styles.healthAlert : health === "watch" ? styles.healthWatch : styles.healthHealthy}`}>
              {HEALTH_LABEL[health]}
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <AppShell>
      <div className={styles.container}>

        <header className={styles.pageHeader}>
          <div className={styles.headerText}>
            <span className={styles.eyebrow}>Exploitation avicole</span>
            <h1>Centre d&apos;élevage</h1>
          </div>
          <span className={styles.datePill} suppressHydrationWarning>
            <CalendarDays size={14} aria-hidden="true" />
            {todayLabel || "—"}
          </span>
        </header>

        <div className={styles.toolbar}>
          <nav className={styles.tabs} role="tablist" aria-label="Vues de l'élevage">
            {([
              ["overview", "Vue d'ensemble"],
              ["batches", "Bandes"],
              ["health", "Santé"],
              ["production", "Production"],
            ] as const).map(([view, label]) => (
              <button
                key={view}
                role="tab"
                aria-selected={workspaceView === view}
                className={workspaceView === view ? styles.tabActive : styles.tab}
                onClick={() => setWorkspaceView(view)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className={styles.toolbarActions}>
            <button type="button" className={styles.btnGhost} onClick={() => openForm("egg")}>
              <Droplets size={14} aria-hidden="true" /> Récolte
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => openForm("health")}>
              <Thermometer size={14} aria-hidden="true" /> Santé
            </button>
            {isAdmin && (
              <button type="button" className={styles.btnGhost} onClick={() => openForm("transfer")}>
                <ClipboardList size={14} aria-hidden="true" /> Transfert
              </button>
            )}
            <button type="button" className={styles.btnPrimary} onClick={() => openForm("batch")}>
              <Plus size={14} aria-hidden="true" /> Nouvelle bande
            </button>
          </div>
        </div>

        <section className={styles.kpiStrip} aria-label="Indicateurs">
          <article className={styles.kpi}>
            <span className={styles.kpiLabel}>Cheptel vivant</span>
            <strong className={styles.kpiValue}>{totalBirds.toLocaleString("fr-FR")}</strong>
            <small className={styles.kpiHint}>{activeBatches.length} bande(s) active(s)</small>
          </article>
          <article className={styles.kpi}>
            <span className={styles.kpiLabel}>Œufs cumulés</span>
            <strong className={styles.kpiValue}>{totalEggs.toLocaleString("fr-FR")}</strong>
            <small className={styles.kpiHint}>
              {totalBrokenEggs > 0 ? `${totalBrokenEggs} cassé(s)` : "Aucun cassé"}
            </small>
          </article>
          <article className={styles.kpi}>
            <span className={styles.kpiLabel}>Taux de ponte</span>
            <strong className={styles.kpiValue}>
              {productionRate.toLocaleString("fr-FR")}<em> / sujet</em>
            </strong>
            <div className={styles.progress} aria-hidden="true">
              <span style={{ width: `${Math.min(productionRate * 100, 100)}%` }} />
            </div>
          </article>
          <article className={styles.kpi}>
            <span className={styles.kpiLabel}>Pertes signalées</span>
            <strong className={`${styles.kpiValue} ${mortalityTotal > 0 ? styles.dangerText : ""}`}>
              {mortalityTotal || 0}
            </strong>
            <small className={styles.kpiHint}>
              {mortalityTotal > 0 ? "sur 7 derniers jours" : "aucune perte"}
            </small>
          </article>
        </section>

        <section className={styles.workspace}>

          <main className={styles.main}>

            {workspaceView === "overview" && (
              <>
                <div className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <span className={styles.panelKicker}>Aujourd&apos;hui</span>
                      <h2>Activité récente</h2>
                    </div>
                    <span className={styles.panelHint}>{latestHealthEvents.length}</span>
                  </div>
                  {latestHealthEvents.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>Aucune activité récente.</p>
                      <span>Commencez par créer une bande.</span>
                    </div>
                  ) : (
                    <div className={styles.activityList}>
                      {latestHealthEvents.slice(0, 5).map(event => {
                        const batch = batches.find(b => b.id === event.batch_id);
                        const isAlert = event.mortality_count > 0;
                        return (
                          <div key={event.id} className={styles.activityItem}>
                            <span className={`${styles.activityDot} ${isAlert ? styles.dotAlert : styles.dotOk}`} aria-hidden="true" />
                            <div className={styles.activityText}>
                              <strong>{event.title}</strong>
                              <small>{batch?.reference ?? "Bande supprimée"} · {new Date(event.event_date).toLocaleDateString("fr-FR")}</small>
                            </div>
                            <span className={`${styles.activityValue} ${isAlert ? styles.dangerText : ""}`}>
                              {isAlert ? `−${event.mortality_count}` : "OK"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <span className={styles.panelKicker}>Troupeau</span>
                      <h2>Bandes actives</h2>
                    </div>
                    <button type="button" className={styles.btnGhostSm} onClick={() => setWorkspaceView("batches")}>
                      Voir tout <ChevronRight size={13} aria-hidden="true" />
                    </button>
                  </div>
                  {activeBatches.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>Aucune bande active.</p>
                      <span>Créez votre première bande pour démarrer.</span>
                    </div>
                  ) : (
                    <div className={styles.batchGrid}>
                      {activeBatches.slice(0, 4).map(batch => renderBatchCard(batch))}
                    </div>
                  )}
                </div>
              </>
            )}

            {workspaceView === "batches" && (
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelKicker}>Inventaire</span>
                    <h2>Toutes les bandes</h2>
                  </div>
                  <span className={styles.panelHint}>{filteredBatches.length} / {batches.length}</span>
                </div>

                <div className={styles.filterChips} role="group" aria-label="Filtres">
                  {([
                    ["all", "Toutes"],
                    ["layer", "Pondeuses"],
                    ["broiler", "Chair"],
                    ["alert", "En alerte"],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={batchFilter === key}
                      className={batchFilter === key ? styles.filterChipActive : styles.filterChip}
                      onClick={() => setBatchFilter(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {batches.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>Aucune bande enregistrée.</p>
                    <span>Créez une bande pour commencer le suivi.</span>
                  </div>
                ) : filteredBatches.length === 0 ? (
                  <div className={styles.emptyState}><p>Aucun résultat pour ce filtre.</p></div>
                ) : (
                  <div className={styles.batchGrid}>
                    {filteredBatches.map(batch => renderBatchCard(batch))}
                  </div>
                )}
              </div>
            )}

            {workspaceView === "health" && (
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelKicker}>Suivi sanitaire</span>
                    <h2>Journal de santé</h2>
                  </div>
                  <span className={styles.panelHint}>{healthEvents.length}</span>
                </div>
                {healthEvents.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>Aucun événement enregistré.</p>
                    <span>Vaccinations et traitements apparaîtront ici.</span>
                  </div>
                ) : (
                  <div className={styles.eventList}>
                    {latestHealthEvents.map(event => {
                      const batch = batches.find(b => b.id === event.batch_id);
                      const isAlert = event.mortality_count > 0;
                      return (
                        <div key={event.id} className={styles.eventItem}>
                          <span className={`${styles.eventIcon} ${isAlert ? styles.eventIconAlert : ""}`} aria-hidden="true">
                            {isAlert ? <Thermometer size={14} /> : <CheckCircle2 size={14} />}
                          </span>
                          <div className={styles.eventBody}>
                            <strong>{event.title}</strong>
                            <small>
                              {batch?.reference ?? "—"} · {event.event_type.toUpperCase()} · {new Date(event.event_date).toLocaleDateString("fr-FR")}
                            </small>
                          </div>
                          <span className={isAlert ? styles.dangerText : ""} style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                            {isAlert ? `−${event.mortality_count}` : "OK"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {workspaceView === "production" && (
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelKicker}>Ponte</span>
                    <h2>Production d&apos;œufs</h2>
                  </div>
                  <button type="button" className={styles.btnPrimary} onClick={() => openForm("egg")}>
                    <Plus size={14} aria-hidden="true" /> Saisir une récolte
                  </button>
                </div>
                {eggProductions.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>Aucune récolte enregistrée.</p>
                    <span>Enregistrez votre première collecte.</span>
                  </div>
                ) : (
                  <div className={styles.eventList}>
                    {recentEggs.map(prod => {
                      const batch = batches.find(b => b.id === prod.batch_id);
                      return (
                        <div key={prod.id} className={styles.eventItem}>
                          <div className={styles.eventBody}>
                            <strong>{prod.quantity.toLocaleString("fr-FR")} œufs valides</strong>
                            <small>{batch?.reference ?? "—"} · {new Date(prod.production_date).toLocaleDateString("fr-FR")}</small>
                          </div>
                          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: prod.damaged_quantity > 0 ? "var(--warn)" : "var(--ink-4)" }}>
                            {prod.damaged_quantity > 0 ? `${prod.damaged_quantity} cassés` : "0 cassé"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </main>

          <aside className={styles.side}>

            <div className={styles.sideCard}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelKicker}>Exploitation</span>
                  <h2>Plan</h2>
                </div>
              </div>
              <div className={styles.mapCanvas}>
                <img src={DECOR_FARM_IMAGE} alt="Vue aérienne" />
                <div className={styles.mapShade} />
                <button
                  className={`${styles.zoneMarker} ${styles.zoneGreen}`}
                  style={{ top: "26%", left: "44%" }}
                  onClick={() => activeBatches[0] && setSelectedBatch(activeBatches[0])}
                  aria-label={activeBatches[0] ? `Zone 01 — ${activeBatches[0].reference}` : "Zone 01"}
                >
                  <span>01</span><b>{activeBatches[0]?.reference || "—"}</b>
                </button>
                <button
                  className={`${styles.zoneMarker} ${styles.zoneGold}`}
                  style={{ top: "56%", left: "62%" }}
                  onClick={() => activeBatches[1] && setSelectedBatch(activeBatches[1])}
                  aria-label={activeBatches[1] ? `Zone 02 — ${activeBatches[1].reference}` : "Zone 02"}
                >
                  <span>02</span><b>{activeBatches[1]?.reference || "—"}</b>
                </button>
                <button
                  className={`${styles.zoneMarker} ${styles.zoneBlue}`}
                  style={{ top: "72%", left: "28%" }}
                  onClick={() => activeBatches[2] && setSelectedBatch(activeBatches[2])}
                  aria-label={activeBatches[2] ? `Zone 03 — ${activeBatches[2].reference}` : "Zone 03"}
                >
                  <span>03</span><b>{activeBatches[2]?.reference || "—"}</b>
                </button>
              </div>
              <div className={styles.mapLegend}>
                <span><i className={styles.dotOk} aria-hidden="true" /> Actif</span>
                <span><i className={styles.dotWarn} aria-hidden="true" /> À contrôler</span>
                <span><i className={styles.dotInfo} aria-hidden="true" /> Ponte</span>
              </div>
            </div>

            <div className={styles.sideCard}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelKicker}>À faire</span>
                  <h2>Tâches du jour</h2>
                </div>
                <span className={styles.badge}>{activeBatches.length + 2}</span>
              </div>
              <div className={styles.taskList}>
                <button className={styles.taskItem} onClick={() => openForm("egg")}>
                  <span>
                    <strong>Enregistrer la ponte</strong>
                    <small>{layerBatches.length || activeBatches.length} bande(s) à vérifier</small>
                  </span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
                <button className={styles.taskItem} onClick={() => openForm("health")}>
                  <span>
                    <strong>Contrôle sanitaire</strong>
                    <small>{latestHealthEvents.length ? "Dernier suivi disponible" : "Aucun suivi"}</small>
                  </span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
                <button className={styles.taskItem} onClick={() => setWorkspaceView("batches")}>
                  <span>
                    <strong>Vérifier les effectifs</strong>
                    <small>{activeBatches.length} bandes actives</small>
                  </span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
              <div className={styles.taskFooter}>
                {healthyBatches.length} bande(s) sans alerte
              </div>
            </div>

          </aside>

        </section>

        {actionModalPortal}
        {drawerPortal}

      </div>
    </AppShell>
  );
}