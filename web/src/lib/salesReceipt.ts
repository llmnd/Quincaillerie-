export type ReceiptLine = {
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
};

export type ReceiptData = {
  saleId: number;
  total: number;
  given: number;
  change: number;
  method: string;
  methodLabel: string;
  lines: ReceiptLine[];
  discount: number;
  companyName: string;
  companyLogo?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyAddress?: string | null;
  sellerName: string;
  sellerRole?: string | null;
  customerName?: string | null;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] ?? character)
  );

const money = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} FCFA`;

export function openSalesReceipt(data: ReceiptData) {
  const receiptWindow = window.open("", "_blank", "width=760,height=900");
  if (!receiptWindow) return;

  const contact = [data.companyEmail, data.companyPhone, data.companyAddress]
    .filter(Boolean)
    .map((value) => escapeHtml(String(value)))
    .join(" · ");
  const rows = data.lines
    .map(
      (line) =>
        `<tr><td><strong>${escapeHtml(line.name)}</strong><small>${escapeHtml(line.sku)}</small></td><td>${line.quantity}</td><td>${money(line.unit_price)}</td><td>${money(line.unit_price * line.quantity)}</td></tr>`
    )
    .join("");

  receiptWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Reçu #${data.saleId}</title><style>
    @page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#eef0f4}
    body{font-family:Arial,Helvetica,sans-serif;color:#17202b;font-size:10pt;line-height:1.4}
    .page{width:210mm;min-height:297mm;margin:0 auto;padding:15mm;background:#fff}
    .header{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(42mm,.7fr);gap:7mm;align-items:start;padding-bottom:7mm;border-bottom:1px solid #dfb053}
    .logo{width:22mm;height:22mm;object-fit:cover;border-radius:3mm;border:1px solid #e2e5ea;background:#fafbfc}
    .logoFallback{display:grid;place-items:center;background:#dfb053;color:#1a1408;font-size:22pt;font-weight:700}
    .brand{min-width:0}.eyebrow,.metaLabel{margin:0;color:#dfb053;font-size:7pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
    h1{margin:1mm 0 0;font-size:16pt;line-height:1.15} .contact{margin:1mm 0 0;color:#64748b;font-size:8pt;overflow-wrap:anywhere}
    .meta{text-align:right;display:grid;gap:3mm}.metaItem{display:grid;gap:1mm}.metaLabel{color:#94a3b8;font-size:7pt}.metaValue{font-size:8.5pt;font-weight:600;overflow-wrap:anywhere}
    .title{padding:6mm 0 4mm;border-bottom:1px solid #e2e8f0}.title h2{margin:0;font-size:18pt;line-height:1.1}.title p{margin:2mm 0 0;color:#64748b;font-size:9pt}
    .info{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4mm;margin:6mm 0}.infoCard{padding:4mm;background:#fafbfc;border:1px solid #e2e8f0;border-radius:2mm}.infoLabel{display:block;color:#64748b;font-size:7pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.infoValue{display:block;margin-top:2mm;font-size:10pt;font-weight:600;overflow-wrap:anywhere}
    table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:9pt}th,td{padding:3mm 2mm;text-align:left;border-bottom:1px solid #e2e8f0;vertical-align:top}th{color:#64748b;font-size:7pt;letter-spacing:.08em;text-transform:uppercase}th:nth-child(n+2),td:nth-child(n+2){text-align:right}th:first-child{width:46%}td small{display:block;margin-top:1mm;color:#64748b;font-size:7pt}
    .line{display:flex;justify-content:space-between;gap:8mm;padding:3mm 0;color:#344152}.line strong{color:#17202b}.total{display:flex;justify-content:space-between;gap:8mm;margin-top:3mm;padding:5mm 0;border-top:2px solid #17202b;font-size:13pt;font-weight:700}
    .footer{margin-top:14mm;padding-top:4mm;border-top:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:8pt}.thanks{margin:0 0 2mm;font-weight:600;color:#17202b}
    @media screen and (max-width:700px){body{background:#fff}.page{width:100%;min-height:auto;padding:20px}.header{grid-template-columns:auto minmax(0,1fr);gap:16px}.meta{grid-column:1/-1;text-align:left;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.title h2{font-size:1.35rem}.info{grid-template-columns:1fr}table{font-size:8pt}th,td{padding:10px 4px}}
    @media screen and (max-width:420px){.page{padding:14px}.header{grid-template-columns:1fr}.logo{width:18mm;height:18mm}.meta{grid-template-columns:repeat(2,minmax(0,1fr))}.metaItem:last-child{grid-column:1/-1}}
    @media print{body{background:#fff}.page{margin:0}}
  </style></head><body><main class="page">
    <header class="header">
      ${data.companyLogo ? `<img class="logo" src="${escapeHtml(data.companyLogo)}" alt="Logo de l'entreprise">` : `<div class="logo logoFallback">M</div>`}
      <div class="brand"><p class="eyebrow">MIZAN ERP</p><h1>${escapeHtml(data.companyName || "Mon entreprise")}</h1><p class="contact">${contact || "Contact non renseigné"}</p></div>
      <div class="meta"><div class="metaItem"><span class="metaLabel">Vendeur</span><strong class="metaValue">${escapeHtml(data.sellerName || "Utilisateur")}</strong></div><div class="metaItem"><span class="metaLabel">Date</span><strong class="metaValue">${escapeHtml(new Date().toLocaleString("fr-FR"))}</strong></div><div class="metaItem"><span class="metaLabel">Référence</span><strong class="metaValue">VTE-${data.saleId}</strong></div></div>
    </header>
    <section class="title"><h2>Reçu de paiement</h2><p>Vente #${data.saleId} · Document justificatif de transaction</p></section>
    <section class="info"><div class="infoCard"><span class="infoLabel">Client</span><strong class="infoValue">${escapeHtml(data.customerName || "Client comptant")}</strong></div><div class="infoCard"><span class="infoLabel">Mode de paiement</span><strong class="infoValue">${escapeHtml(data.methodLabel)}</strong></div></section>
    <table><thead><tr><th>Produit</th><th>Qté</th><th>Prix unitaire</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
    ${data.discount > 0 ? `<div class="line"><span>Remise</span><strong>- ${money(data.discount)}</strong></div>` : ""}
    <div class="total"><span>Total payé</span><strong>${money(data.total)}</strong></div>
    ${data.method === "cash" ? `<div class="line"><span>Espèces reçues</span><strong>${money(data.given)}</strong></div><div class="line"><span>Monnaie rendue</span><strong>${money(data.change)}</strong></div>` : ""}
    <footer class="footer"><p class="thanks">Merci pour votre confiance.</p><span>${escapeHtml(data.companyName || "MIZAN ERP")} · Reçu généré automatiquement · ${escapeHtml(data.sellerRole || "Vendeur")}</span></footer>
  </main><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),400)}</script></body></html>`);
  receiptWindow.document.close();
}
