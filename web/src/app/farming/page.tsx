"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Activity, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Droplets, MapPinned, MoreHorizontal, Plus, Thermometer, Wheat, X } from "lucide-react";
import AppShell from "../../components/AppShell";
import { authHeaders } from "../../lib/auth";
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
  status: string 
};

type HealthEvent = { id: number; batch_id: number; event_date: string; event_type: string; title: string; diagnosis?: string | null; mortality_count: number };
type EggProduction = { id: number; batch_id: number; production_date: string; quantity: number; damaged_quantity: number };

const DECOR_FARM_IMAGE = "https://i.pinimg.com/736x/35/c9/c6/35c9c61b569fd8f5a560c960c2325c56.jpg";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const emptyBatch = { reference: "", species: "chicken", production_type: "broiler", breed: "", start_date: new Date().toISOString().slice(0, 10), initial_count: "", image_url: "" };
const emptyHealth = { batch_id: "", event_date: new Date().toISOString().slice(0, 10), event_type: "vaccination", title: "", diagnosis: "", mortality_count: "0" };
const emptyEgg = { batch_id: "", production_date: new Date().toISOString().slice(0, 10), quantity: "", damaged_quantity: "0" };
const isLayerProduction = (value?: string | null) => ["layer", "layers", "pondeuse", "pondeuses", "ponte"].includes((value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

export default function FarmingPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [eggProductions, setEggProductions] = useState<EggProduction[]>([]);
  
  const [batchForm, setBatchForm] = useState(emptyBatch);
  const [healthForm, setHealthForm] = useState(emptyHealth);
  const [eggForm, setEggForm] = useState(emptyEgg);
  
  const [activeForm, setActiveForm] = useState<"batch" | "health" | "egg" | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null);
  const [workspaceView, setWorkspaceView] = useState<"overview" | "batches" | "health" | "production">("overview");
  const [tasksOpen, setTasksOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  async function load() {
    try {
      const [bRes, hRes, eRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/farming/batches`, { headers: authHeaders(), credentials: "include" }),
        fetch(`${API_URL}/api/v1/farming/health-events`, { headers: authHeaders(), credentials: "include" }),
        fetch(`${API_URL}/api/v1/farming/egg-productions`, { headers: authHeaders(), credentials: "include" }),
      ]);

      const nextBatches = bRes.ok ? await bRes.json() : null;
      const nextHealthEvents = hRes.ok ? await hRes.json() : null;
      const nextEggProductions = eRes.ok ? await eRes.json() : null;

      if (bRes.ok) setBatches(nextBatches as Batch[]);
      else console.error("Impossible de charger les bandes d'élevage", bRes.status);
      if (hRes.ok) setHealthEvents(nextHealthEvents as HealthEvent[]);
      else console.error("Impossible de charger les événements sanitaires", hRes.status);
      if (eRes.ok) setEggProductions(nextEggProductions as EggProduction[]);
      else console.error("Impossible de charger les productions d'œufs", eRes.status);
    } catch (err) {
      console.error("Erreur de chargement:", err);
    }
  }

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        if (!isMounted) return;
        await load();
      } catch (error) {
        console.error("Erreur de chargement initial:", error);
      }
    };

    void fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  function openForm(form: "batch" | "health" | "egg") {
    if (form === "health") {
      const activeBatchIds = new Set(batches.filter(batch => batch.status === "active").map(batch => String(batch.id)));
      const selectedBatch = activeBatchIds.has(healthForm.batch_id)
        ? healthForm.batch_id
        : batches.find(batch => batch.status === "active")?.id?.toString() ?? "";
      setHealthForm(prev => ({ ...prev, batch_id: selectedBatch }));
    }

    if (form === "egg") {
      const eligibleBatches = batches.filter(batch => batch.status === "active" && isLayerProduction(batch.production_type));
      const eligibleIds = new Set(eligibleBatches.map(batch => String(batch.id)));
      const selectedBatch = eligibleIds.has(eggForm.batch_id)
        ? eggForm.batch_id
        : eligibleBatches[0]?.id?.toString() ?? "";
      setEggForm(prev => ({ ...prev, batch_id: selectedBatch }));
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
    const file = event.target.files?.[0];
    if (!file) return;

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
    if (res.ok) { setBatchForm(emptyBatch); setEditingBatchId(null); setActiveForm(null); load(); }
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
    if (res.ok) { setHealthForm(emptyHealth); setActiveForm(null); load(); }
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
    if (res.ok) { setEggForm(emptyEgg); setActiveForm(null); load(); }
  }

  const totalBirds = batches.reduce((acc, b) => acc + b.current_count, 0);
  const totalEggs = eggProductions.reduce((acc, e) => acc + e.quantity, 0);
  const totalBrokenEggs = eggProductions.reduce((acc, e) => acc + (e.damaged_quantity || 0), 0);

  const activeBatches = batches.filter(b => b.status === "active");
  const layerBatches = batches.filter(b => b.status === "active" && isLayerProduction(b.production_type));
  const eggSelectOptions = layerBatches;

  const selectedBatchEggs = selectedBatch
    ? eggProductions.filter(e => e.batch_id === selectedBatch.id)
    : [];
  const selectedBatchHealthEvents = selectedBatch
    ? healthEvents.filter(e => e.batch_id === selectedBatch.id).sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
    : [];
  const selectedBatchValidEggs = selectedBatchEggs.reduce((acc, e) => acc + e.quantity, 0);
  const selectedBatchBrokenEggs = selectedBatchEggs.reduce((acc, e) => acc + (e.damaged_quantity || 0), 0);
  const latestHealthEvents = healthEvents.slice().sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
  const mortalityTotal = healthEvents.reduce((acc, event) => acc + (event.mortality_count || 0), 0);
  const healthyBatches = activeBatches.filter(batch => !healthEvents.some(event => event.batch_id === batch.id && event.mortality_count > 0));
  const productionRate = totalBirds > 0 ? Math.round((totalEggs / totalBirds) * 100) / 100 : 0;
  const currentViewLabel = workspaceView === "overview" ? "Vue d'ensemble" : workspaceView === "batches" ? "Bandes" : workspaceView === "health" ? "Santé" : "Production";

  return (
    <AppShell>
      <div className={styles.container}>
        
        <header className={styles.workspaceHeader}>
          <div>
            <span className={styles.eyebrow}>Exploitation avicole / Aujourd&apos;hui</span>
            <h1>Centre d&apos;élevage</h1>
          </div>
          <div className={styles.headerDate}><CalendarDays size={16} /> {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
        </header>

        <nav className={styles.workspaceTabs} aria-label="Vues de l'élevage">
          {([
            ["overview", "Vue d'ensemble"],
            ["batches", "Bandes"],
            ["health", "Santé"],
            ["production", "Production"],
          ] as const).map(([view, label]) => (
            <button key={view} className={workspaceView === view ? styles.workspaceTabActive : styles.workspaceTab} onClick={() => setWorkspaceView(view)}>{label}</button>
          ))}
          <button className={styles.tabMore} aria-label="Plus d'options"><MoreHorizontal size={17} /></button>
        </nav>

        <div className={styles.quickActions}>
          <span className={styles.quickLabel}>Actions rapides</span>
          <button type="button" className={styles.quickActionsToggle} onClick={() => setQuickActionsOpen(open => !open)} aria-expanded={quickActionsOpen} aria-label={quickActionsOpen ? "Masquer les actions rapides" : "Afficher les actions rapides"}>
            <Plus size={18} />
          </button>
          <div className={quickActionsOpen ? styles.quickActionListOpen : styles.quickActionList}>
            <button className={styles.btnMinimal} onClick={() => openForm("egg")}><Plus size={14} /> <p>Récolte d&apos;œufs</p></button>
            <button className={styles.btnMinimal} onClick={() => openForm("health")}><Plus size={14} /> Événement sanitaire</button>
            <button className={styles.btnPrimary} onClick={() => openForm("batch")}><Plus size={14} /> Nouvelle bande</button>
          </div>
        </div>

        <section className={styles.operationsGrid}>
          {workspaceView === "overview" && <>
          {tasksOpen && <aside className={styles.taskRail}>
            <div className={styles.panelHeading}><div><span className={styles.panelKicker}>À faire</span><h2>Journée de travail</h2></div><span className={styles.taskCount}>{activeBatches.length + 2}</span></div>
            <div className={styles.taskList}>
              <button className={styles.taskItem} onClick={() => openForm("egg")}><span className={styles.taskIcon}><Wheat size={16} /></span><span><strong>Enregistrer la ponte</strong><small>{layerBatches.length || activeBatches.length} bande(s) à vérifier</small></span><ChevronRight size={15} /></button>
              <button className={styles.taskItem} onClick={() => openForm("health")}><span className={`${styles.taskIcon} ${styles.warning}`}><Thermometer size={16} /></span><span><strong>Contrôle sanitaire</strong><small>{latestHealthEvents.length ? "Dernier suivi disponible" : "Aucun suivi enregistré"}</small></span><ChevronRight size={15} /></button>
              <button className={styles.taskItem} onClick={() => setWorkspaceView("batches")}><span className={`${styles.taskIcon} ${styles.blue}`}><ClipboardList size={16} /></span><span><strong>Vérifier les effectifs</strong><small>{activeBatches.length} bandes actives</small></span><ChevronRight size={15} /></button>
            </div>
            <div className={styles.taskFooter}><CheckCircle2 size={15} /> {healthyBatches.length} bande(s) sans alerte récente</div>
          </aside>}

          <div className={styles.farmBoard}>
            <div className={styles.boardToolbar}><div><span className={styles.panelKicker}>Plan de l&apos;exploitation</span><h2>Zones d&apos;élevage</h2></div><button className={styles.iconButton} aria-label="Ajouter une zone" title="Ajouter une zone"><Plus size={17} /></button></div>
            <div className={styles.mapCanvas}>
              <img src={DECOR_FARM_IMAGE} alt="Vue aérienne de l'exploitation" />
              <div className={styles.mapShade} />
              <button className={`${styles.zoneMarker} ${styles.zoneGreen}`} style={{ top: "22%", left: "46%" }} onClick={() => activeBatches[0] && setSelectedBatch(activeBatches[0])}><span>01</span><b>{activeBatches[0]?.reference || "Zone 01"}</b></button>
              <button className={`${styles.zoneMarker} ${styles.zoneGold}`} style={{ top: "54%", left: "61%" }} onClick={() => activeBatches[1] && setSelectedBatch(activeBatches[1])}><span>02</span><b>{activeBatches[1]?.reference || "Zone 02"}</b></button>
              <button className={`${styles.zoneMarker} ${styles.zoneBlue}`} style={{ top: "68%", left: "27%" }} onClick={() => activeBatches[2] && setSelectedBatch(activeBatches[2])}><span>03</span><b>{activeBatches[2]?.reference || "Zone 03"}</b></button>
              <div className={styles.mapLegend}><span><i className={styles.dotGreen} /> Actif</span><span><i className={styles.dotGold} /> À contrôler</span><span><i className={styles.dotBlue} /> Ponte</span></div>
            </div>
          </div>

          <aside className={styles.insightRail}>
            <div className={styles.panelHeading}><div><span className={styles.panelKicker}>Surveillance</span><h2>État de l&apos;élevage</h2></div><Activity size={17} /></div>
            <div className={styles.insightMetric}><span>Effectif vivant</span><strong>{totalBirds.toLocaleString("fr-FR")}</strong><small><span className={styles.goodText}>+ stable</span> sur {activeBatches.length} bandes</small></div>
            <div className={styles.insightMetric}><span>Production moyenne</span><strong>{productionRate.toLocaleString("fr-FR")} <em>œuf / sujet</em></strong><div className={styles.progressTrack}><span style={{ width: `${Math.min(productionRate * 100, 100)}%` }} /></div></div>
            <div className={styles.insightMetric}><span>Alertes sanitaires</span><strong className={mortalityTotal > 0 ? styles.alertText : styles.goodText}>{mortalityTotal || 0}</strong><small>{mortalityTotal > 0 ? "pertes signalées" : "aucune perte signalée"}</small></div>
            <div className={styles.weatherStrip}><Droplets size={15} /><span>Conditions de suivi</span><strong>Normal</strong></div>
          </aside>
          </>}

          <section className={styles.focusPanel}>
              <div className={styles.panelHeading}><div><span className={styles.panelKicker}>Vue active</span><h2>{currentViewLabel}</h2></div><span className={styles.focusHint}>Données en temps réel</span></div>
              <div className={styles.tabStats}>
                {workspaceView === "overview" && <><div><span>Cheptel vivant</span><strong>{totalBirds.toLocaleString("fr-FR")}</strong></div><div><span>Bandes en cours</span><strong>{activeBatches.length}</strong></div><div><span>Ponte cumulée</span><strong>{totalEggs.toLocaleString("fr-FR")}</strong></div><div><span>Œufs cassés</span><strong className={totalBrokenEggs > 0 ? styles.alertText : styles.goodText}>{totalBrokenEggs.toLocaleString("fr-FR")}</strong></div></>}
                {workspaceView === "batches" && <><div><span>Bandes actives</span><strong>{activeBatches.length}</strong></div><div><span>Sujets suivis</span><strong>{totalBirds.toLocaleString("fr-FR")}</strong></div></>}
                {workspaceView === "health" && <><div><span>Événements suivis</span><strong>{healthEvents.length}</strong></div><div><span>Pertes cumulées</span><strong className={mortalityTotal > 0 ? styles.alertText : styles.goodText}>{mortalityTotal}</strong></div></>}
                {workspaceView === "production" && <><div><span>Œufs conformes</span><strong>{totalEggs.toLocaleString("fr-FR")}</strong></div><div><span>Œufs cassés</span><strong className={totalBrokenEggs > 0 ? styles.alertText : styles.goodText}>{totalBrokenEggs.toLocaleString("fr-FR")}</strong></div><div><span>Taux de perte</span><strong>{totalEggs + totalBrokenEggs > 0 ? `${Math.round((totalBrokenEggs / (totalEggs + totalBrokenEggs)) * 100)}%` : "0%"}</strong></div></>}
              </div>
              {workspaceView === "production" && (
                <div className={styles.productionSummary}><button className={styles.btnPrimary} onClick={() => openForm("egg")}><Plus size={14} /> Saisir une récolte</button></div>
              )}
              {workspaceView === "batches" && (
                <div className={styles.tabList}><h3 className={styles.sectionTitle}>Bandes d&apos;élevage</h3>{batches.length === 0 ? <p className={styles.emptyState}>Aucune bande enregistrée</p> : <div className={styles.listGroup}>{batches.map(batch => <div key={batch.id} className={styles.listItem} onClick={() => setSelectedBatch(batch)}><div className={styles.batchLead}><img src={batch.image_url && batch.image_url.trim() !== "" ? batch.image_url : DECOR_FARM_IMAGE} alt={batch.reference} className={styles.batchThumb} /><div className={styles.itemInfo}><h4>{batch.reference}</h4><p>{batch.production_type === "layer" ? "Pondeuses" : "Poulets de chair"} · {batch.breed || "Standard"}</p></div></div><div className={styles.itemValue}><strong>{batch.current_count} sujets</strong><span className={styles.statusBadge}>{batch.status === "active" ? "Actif" : batch.status}</span></div></div>)}</div>}</div>
              )}
              {workspaceView === "health" && (
                <div className={styles.tabList}><h3 className={styles.sectionTitle}>Journal sanitaire</h3>{healthEvents.length === 0 ? <p className={styles.emptyState}>Aucun événement sanitaire récent</p> : <div className={styles.listGroup}>{latestHealthEvents.slice(0, 12).map(event => <div key={event.id} className={styles.listItem}><div className={styles.itemInfo}><h4>{event.title}</h4><p>{event.event_type.toUpperCase()} · {new Date(event.event_date).toLocaleDateString("fr-FR")}</p></div><div className={styles.itemValue}><strong style={{ color: event.mortality_count > 0 ? "#f43f5e" : "#10b981" }}>{event.mortality_count ? `-${event.mortality_count} pertes` : "Conforme"}</strong><span>{event.mortality_count > 0 ? "À surveiller" : "Suivi"}</span></div></div>)}</div>}</div>
              )}
            </section>
        </section>

        <div className={styles.taskRevealBar}>
          <button className={styles.taskToggle} onClick={() => setTasksOpen(open => !open)} aria-expanded={tasksOpen}>
            <ClipboardList size={14} /> {tasksOpen ? "Masquer les tâches" : "Afficher les tâches à faire"} <span>{activeBatches.length + 2}</span>
          </button>
        </div>

        {/* FORMULAIRE D'ACTION */}
        {activeForm && (
          <div className={styles.actionModalOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveForm(null); }}>
            <section className={styles.actionModal} role="dialog" aria-modal="true" aria-labelledby="action-modal-title">
              {activeForm === "batch" && (
          <form className={styles.formInlineCard} onSubmit={createBatch}>
            <div className={styles.formHeader}>
              <div><span className={styles.modalEyebrow}>Nouvelle opération</span><h2 id="action-modal-title">{editingBatchId ? "Modifier la bande" : "Créer une bande"}</h2></div>
              <button type="button" className={styles.modalCloseButton} onClick={() => { setEditingBatchId(null); setActiveForm(null); }} aria-label="Fermer"><X size={18} /></button>
            </div>
            <div className={styles.gridInputs}>
              <div className={styles.inputField}><label>Référence du lot</label><input required placeholder="ex: Lot Pondeuses 04" value={batchForm.reference} onChange={e => setBatchForm({...batchForm, reference: e.target.value})} /></div>
              <div className={styles.inputField}><label>Type de production</label><select value={batchForm.production_type} onChange={e => setBatchForm({...batchForm, production_type: e.target.value})}><option value="broiler">Poulets de chair</option><option value="layer">Pondeuses</option></select></div>
              <div className={styles.inputField}><label>Souche / Race</label><input placeholder="ex: Cobb 500, ISA Brown" value={batchForm.breed} onChange={e => setBatchForm({...batchForm, breed: e.target.value})} /></div>
              <div className={styles.inputField}><label>Date d&apos;arrivée</label><input type="date" value={batchForm.start_date} onChange={e => setBatchForm({...batchForm, start_date: e.target.value})} /></div>
              <div className={styles.inputField}><label>Effectif initial</label><input type="number" required placeholder="1000" value={batchForm.initial_count} onChange={e => setBatchForm({...batchForm, initial_count: e.target.value})} /></div>
              <div className={styles.inputField}>
                <label>Image du lot</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: "none" }}
                  id="batch-image-upload"
                />
                <label htmlFor="batch-image-upload" className={styles.btnMinimal} style={{ display: "inline-flex", justifyContent: "center", width: "100%", cursor: "pointer" }}>
                  {batchForm.image_url ? "Changer l&apos;image" : "Choisir une image"}
                </label>
                {batchForm.image_url && (
                  <img src={batchForm.image_url} alt="Preview du lot" style={{ width: "100%", height: "112px", objectFit: "cover", borderRadius: "12px", marginTop: "10px" }} />
                )}
              </div>
            </div>
            <button className={styles.btnPrimary}>{editingBatchId ? "Enregistrer les modifications" : "Créer la bande"}</button>
          </form>
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
              <div className={styles.inputField}><label>Type d&apos;intervention</label><select value={healthForm.event_type} onChange={e => setHealthForm({...healthForm, event_type: e.target.value})}><option value="vaccination">Vaccination</option><option value="treatment">Traitement</option><option value="mortality">Mortalité constatée</option></select></div>
              <div className={styles.inputField}><label>Intitulé / Soin</label><input required placeholder="ex: Vaccin Gumboro Booster" value={healthForm.title} onChange={e => setHealthForm({...healthForm, title: e.target.value})} /></div>
              <div className={styles.inputField}><label>Pertes (mortalité)</label><input type="number" value={healthForm.mortality_count} onChange={e => setHealthForm({...healthForm, mortality_count: e.target.value})} /></div>
            </div>
            <button className={styles.btnPrimary}>Enregistrer l&apos;événement</button>
          </form>
              )}

              {activeForm === "egg" && (
          <form className={styles.formInlineCard} onSubmit={createEgg}>
            <div className={styles.formHeader}>
              <div><span className={styles.modalEyebrow}>Production du jour</span><h2 id="action-modal-title">Saisie de la ponte journalière</h2></div>
              <button type="button" className={styles.modalCloseButton} onClick={() => setActiveForm(null)} aria-label="Fermer"><X size={18} /></button>
            </div>
            {eggSelectOptions.length === 0 && <p className={styles.formNotice}>Aucune bande de ponte active. Créez une nouvelle bande avec le type de production « Pondeuses » pour enregistrer une récolte.</p>}
            <div className={styles.gridInputs}>
              <div className={styles.inputField}>
                <label>Bande de Pondeuses</label>
                <select required value={eggForm.batch_id} onChange={e => setEggForm({...eggForm, batch_id: e.target.value})}>
                  <option value="">{eggSelectOptions.length ? "Sélectionner la bande" : "Aucune bande de ponte disponible"}</option>
                  {eggSelectOptions.map(b => (
                    <option key={b.id} value={b.id}>{b.reference} — {b.current_count} sujets</option>
                  ))}
                </select>
              </div>
              <div className={styles.inputField}><label>Date de récolte</label><input type="date" value={eggForm.production_date} onChange={e => setEggForm({...eggForm, production_date: e.target.value})} /></div>
              <div className={styles.inputField}><label>Œufs valides (unités)</label><input type="number" required placeholder="350" value={eggForm.quantity} onChange={e => setEggForm({...eggForm, quantity: e.target.value})} /></div>
              <div className={styles.inputField}><label>Œufs fêlés / cassés</label><input type="number" value={eggForm.damaged_quantity} onChange={e => setEggForm({...eggForm, damaged_quantity: e.target.value})} /></div>
            </div>
            <button className={styles.btnPrimary} disabled={eggSelectOptions.length === 0}>Enregistrer la récolte</button>
          </form>
              )}
            </section>
          </div>
        )}

        {/* SLIDE-OVER DRAWER DETAILED VIEW */}
        {selectedBatch && (
          <div className={styles.drawerOverlay} onClick={() => setSelectedBatch(null)}>
            <div className={styles.drawer} onClick={e => e.stopPropagation()}>
              <div>
                <div className={styles.drawerHeader}>
                  <span className={styles.eyebrow}>{selectedBatch.status || "ACTIF"}</span>
                  <button className={styles.closeBtn} onClick={() => setSelectedBatch(null)}>✕</button>
                </div>

                <img 
                  src={selectedBatch.image_url && selectedBatch.image_url.trim() !== "" ? selectedBatch.image_url : DECOR_FARM_IMAGE} 
                  alt={selectedBatch.reference} 
                  className={styles.drawerImage} 
                />

                <div className={styles.drawerBody}>
                  <div>
                    <h2 style={{ fontSize: "1.7rem", fontStyle: "normal", fontWeight: 300, margin: "0 0 6px 0", color: "#fff" }}>{selectedBatch.reference}</h2>
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>
                      {selectedBatch.production_type === "layer" ? "Poule Pondeuse" : "Poulet de Chair"} — Souche {selectedBatch.breed || "Standard"}
                    </p>
                  </div>

                  <div className={styles.drawerCard}>
                    <label>Effectif actuel</label>
                    <span>{selectedBatch.current_count} sujets</span>
                  </div>

                  <div className={styles.drawerCard}>
                    <label>Effectif au démarrage</label>
                    <span style={{ fontSize: "1.1rem" }}>{selectedBatch.initial_count} sujets</span>
                  </div>

                  <div className={styles.drawerCard}>
                    <label>Date d&apos;installation</label>
                    <span style={{ fontSize: "1.1rem" }}>{new Date(selectedBatch.start_date).toLocaleDateString("fr-FR")}</span>
                  </div>

                  <div className={styles.drawerCard}>
                    <label>Production totale</label>
                    <span style={{ fontSize: "1.1rem" }}>{selectedBatchValidEggs.toLocaleString("fr-FR")} œufs</span>
                  </div>

                  <div className={styles.drawerCard}>
                    <label>Œufs cassés</label>
                    <span style={{ fontSize: "1.1rem", color: selectedBatchBrokenEggs > 0 ? "#fbbf24" : "#10b981" }}>
                      {selectedBatchBrokenEggs.toLocaleString("fr-FR")} unités
                    </span>
                  </div>

                  <div className={styles.drawerCard} style={{ display: "block" }}>
                    <label>État de santé</label>
                    {selectedBatchHealthEvents.length === 0 ? (
                      <span style={{ fontSize: "1rem", color: "#10b981" }}>Aucun événement</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                        {selectedBatchHealthEvents.slice(0, 4).map(event => (
                          <div key={event.id} style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: "10px", padding: "8px 10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <strong style={{ color: "#fff", fontSize: "0.9rem" }}>{event.title}</strong>
                              <span style={{ color: event.mortality_count > 0 ? "#f43f5e" : "#10b981", fontSize: "0.75rem", fontWeight: 700 }}>
                                {event.mortality_count > 0 ? `-${event.mortality_count}` : "OK"}
                              </span>
                            </div>
                            <div style={{ color: "#cbd5e1", fontSize: "0.72rem" }}>
                              {event.event_type.toUpperCase()} · {new Date(event.event_date).toLocaleDateString("fr-FR")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
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
                <button
                  className={styles.btnMinimal}
                  style={{ flex: 1 }}
                  onClick={() => deleteBatch(selectedBatch.id)}
                >
                  Supprimer
                </button>
              </div>
              <button className={styles.btnMinimal} style={{ width: "100%", marginTop: "12px" }} onClick={() => setSelectedBatch(null)}>
                Fermer la vue
              </button>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}