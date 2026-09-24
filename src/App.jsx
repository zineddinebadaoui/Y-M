import { useState, useEffect, useMemo, useCallback, useContext, createContext, useRef } from "react";
import {
  Plus, X, Search, Check, Trash2, Pencil, AlertTriangle, Scale,
  ArrowDownLeft, ArrowUpRight, Package, Plane, LayoutDashboard, Users,
  Receipt, Ship, Paperclip, Database, Download, Upload,
} from "./icons.jsx";
import { loadKey, saveKey, subscribeKey } from "./storage.js";
import { shrinkImage } from "./imageUtils.js";
import { scanBonImage, scanPassengerDoc } from "./scanBon.js";
import { auth } from "./firebase.js";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";

/* ------------------------------------------------------------------ */
/*  Données de départ (reprises du fichier CABA_Gestion_des_dettes)    */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Traduction (français / arabe)                                      */
/* ------------------------------------------------------------------ */

const STRINGS = {
  fr: {
    appTitle: "Registre CABA",
    appSubtitle: "Dettes, paiements, billets et marchandise",
    tab_dashboard: "Tableau de bord",
    tab_recu: "Ils me doivent",
    tab_du: "Je leur dois",
    tab_paiements: "Paiements",
    tab_billets: "Billets",
    tab_rotations: "Rotations",
    tab_marchandise: "Marchandise",
    tab_fournisseurs: "Fournisseurs",
    tab_database: "Base de données",
    add: "Ajouter",
    edit: "Modifier",
    delete: "Supprimer",
    cancel: "Annuler",
    save: "Enregistrer",
    save_payment: "Enregistrer le paiement",
    search: "Rechercher un nom…",
    loading: "Chargement du registre…",
    footer: "Les données restent enregistrées sur cet appareil, dans cette conversation.",
    kpi_solde: "Solde net",
    kpi_recu: "Ils me doivent",
    kpi_du: "Je leur dois",
    kpi_merch: "Bénéfice marchandise",
    section_repartition: "Répartition des dettes",
    section_billets: "Billets d'avion",
    section_billets_passagers: "Billets des passagers (rotations)",
    section_surveiller: "À surveiller",
    statut_incomplet: "À compléter",
    statut_payee: "Payée",
    statut_retard: "En retard",
    statut_encours: "En cours",
    billet_paye: "Payé",
    billet_non_paye: "Non payé",
    billet_a_confirmer: "À confirmer",
    add_entry: "Ajouter une entrée",
    add_payment: "Ajouter un paiement",
    add_billet: "Ajouter un billet",
    add_rotation: "Nouvelle rotation",
    col_nom: "Nom",
    col_categorie: "Catégorie",
    col_montant: "Montant",
    col_reste: "Reste",
    col_statut: "Statut",
    col_date: "Date",
    col_dette: "Dette",
    col_mode: "Mode",
    col_beneficiaire: "Bénéficiaire",
    col_compagnie: "Compagnie / Agence",
    col_prix: "Prix",
    empty_recu: "Aucune entrée dans « Ils me doivent » pour l'instant.",
    empty_du: "Aucune entrée dans « Je leur dois » pour l'instant.",
    empty_paiements: "Ajoute une ligne pour chaque paiement reçu ou effectué : le reste et le statut des dettes se mettent à jour automatiquement.",
    empty_billets: "Aucun billet suivi pour l'instant.",
    empty_rotations: "Crée une rotation pour chaque voyage Algérie–Chine, ajoute les passagers, puis la marchandise que chacun transporte.",
  },
  ar: {
    appTitle: "سجل كابا",
    appSubtitle: "الديون والدفعات والتذاكر والبضاعة",
    tab_dashboard: "لوحة التحكم",
    tab_recu: "ديون لي",
    tab_du: "ديون علي",
    tab_paiements: "الدفعات",
    tab_billets: "التذاكر",
    tab_rotations: "الرحلات",
    tab_marchandise: "البضاعة",
    tab_fournisseurs: "الموردون",
    tab_database: "قاعدة البيانات",
    add: "إضافة",
    edit: "تعديل",
    delete: "حذف",
    cancel: "إلغاء",
    save: "حفظ",
    save_payment: "حفظ الدفعة",
    search: "ابحث عن اسم…",
    loading: "جارٍ تحميل السجل…",
    footer: "تبقى البيانات محفوظة على هذا الجهاز، في هذه المحادثة.",
    kpi_solde: "الرصيد الصافي",
    kpi_recu: "ديون لي",
    kpi_du: "ديون علي",
    kpi_merch: "ربح البضاعة",
    section_repartition: "توزيع الديون",
    section_billets: "تذاكر الطيران",
    section_billets_passagers: "تذاكر المسافرين (الرحلات)",
    section_surveiller: "للمتابعة",
    statut_incomplet: "يجب إكماله",
    statut_payee: "مدفوعة",
    statut_retard: "متأخرة",
    statut_encours: "جارية",
    billet_paye: "مدفوعة",
    billet_non_paye: "غير مدفوعة",
    billet_a_confirmer: "بانتظار التأكيد",
    add_entry: "إضافة سجل",
    add_payment: "إضافة دفعة",
    add_billet: "إضافة تذكرة",
    add_rotation: "رحلة جديدة",
    col_nom: "الاسم",
    col_categorie: "الفئة",
    col_montant: "المبلغ",
    col_reste: "المتبقي",
    col_statut: "الحالة",
    col_date: "التاريخ",
    col_dette: "الدين",
    col_mode: "طريقة الدفع",
    col_beneficiaire: "المستفيد",
    col_compagnie: "شركة الطيران / الوكالة",
    col_prix: "السعر",
    empty_recu: "لا توجد أي ديون مسجّلة هنا بعد.",
    empty_du: "لا توجد أي ديون مسجّلة هنا بعد.",
    empty_paiements: "أضف سطرًا لكل دفعة مستلمة أو مسددة: يتحدّث المتبقي وحالة الدين تلقائيًا.",
    empty_billets: "لا توجد أي تذكرة مسجّلة بعد.",
    empty_rotations: "أنشئ رحلة لكل سفرة بين الجزائر والصين، أضف المسافرين، ثم البضاعة التي ينقلها كل واحد منهم.",
  },
};

const LangContext = createContext({ lang: "fr", dir: "ltr", t: (k) => STRINGS.fr[k] || k });
const useLang = () => useContext(LangContext);

/* ------------------------------------------------------------------ */
/*  Données de départ (reprises du fichier CABA_Gestion_des_dettes)    */
/* ------------------------------------------------------------------ */

const SEED_DEBTS = [
  { id: "D001", sens: "recu", nom: "Ilyas Belfort", categorie: "Client", telephone: "", ville: "Belfort El-Harrach", dateDette: "", echeance: "", montantInitial: 4579200, notes: "Téléphones / accessoires" },
  { id: "D002", sens: "recu", nom: "Mohamed Café Chergui", categorie: "Client", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: 117000, notes: "Téléphones / accessoires" },
  { id: "D003", sens: "recu", nom: "", categorie: "", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: null, notes: "" },
  { id: "D004", sens: "recu", nom: "", categorie: "", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: null, notes: "" },
  { id: "D005", sens: "recu", nom: "Walid Sayad", categorie: "Argent prêté", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: 186000, notes: "" },
  { id: "D006", sens: "recu", nom: "Walid Bentarzi", categorie: "Argent prêté", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: 23000, notes: "" },
  { id: "D007", sens: "recu", nom: "Abdenor", categorie: "Argent prêté", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: 25000, notes: "" },
  { id: "D008", sens: "recu", nom: "", categorie: "", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: null, notes: "" },
  { id: "D009", sens: "recu", nom: "Bedro (frère)", categorie: "Argent prêté", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: 17000, notes: "" },
  { id: "D010", sens: "recu", nom: "Mère", categorie: "Argent prêté", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: 70500, notes: "" },
  { id: "D011", sens: "recu", nom: "Djilali", categorie: "Argent prêté", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: 20000, notes: "" },
  { id: "D012", sens: "recu", nom: "Salim", categorie: "Argent prêté", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: 57000, notes: "" },
  { id: "D013", sens: "recu", nom: "Khireddine (frère)", categorie: "Argent prêté", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: 18000, notes: "" },
  { id: "D014", sens: "recu", nom: "Aziz Boulahya", categorie: "Argent prêté", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: 19000, notes: "" },
  { id: "D015", sens: "recu", nom: "Malek A", categorie: "Argent prêté", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: 135000, notes: "" },
  { id: "D016", sens: "recu", nom: "SEPHIR CARGO", categorie: "Cargo", telephone: "", ville: "", dateDette: "", echeance: "", montantInitial: 45000, notes: "" },
];

const SEED_PAYMENTS = [];

const SEED_BILLETS = [
  { id: "B001", rotation: "15–19/09/2026", beneficiaire: "Zineddine Badaoui", compagnie: "Turkish Airlines", agence: "EL-IHCEN VOYAGE", prix: 300000, montantPaye: 0, statut: "a_confirmer", notes: "Paiement à confirmer" },
  { id: "B002", rotation: "15–19/09/2026", beneficiaire: "Youcef Berour", compagnie: "Turkish Airlines", agence: "EL-IHCEN VOYAGE", prix: 300000, montantPaye: 0, statut: "a_confirmer", notes: "Paiement à confirmer" },
  { id: "B003", rotation: "15–19/09/2026", beneficiaire: "Hamza Mokdad", compagnie: "Egyptair", agence: "SIDALI VOYAGE", prix: 213000, montantPaye: 0, statut: "a_confirmer", notes: "Paiement à confirmer" },
  { id: "B004", rotation: "15–19/09/2026", beneficiaire: "Salim Ghani", compagnie: "Egyptair", agence: "SIDALI VOYAGE", prix: 215000, montantPaye: 0, statut: "a_confirmer", notes: "Paiement à confirmer" },
  { id: "B005", rotation: "15–19/09/2026", beneficiaire: "Walid Sayad", compagnie: "Egyptair", agence: "SIDALI VOYAGE", prix: 215000, montantPaye: 0, statut: "a_confirmer", notes: "Paiement à confirmer" },
  { id: "B006", rotation: "24–30/10/2026", beneficiaire: "Salim Ghani", compagnie: "Turkish Airlines", agence: "À vérifier", prix: 300000, montantPaye: 0, statut: "a_confirmer", notes: "Agence à confirmer (double marquage dans le fichier d'origine)" },
];

const SEED_ROTATIONS = [];
const SEED_MERCH = [];
const SEED_PASSENGERS = [];
const SEED_FOURNISSEURS = [];
const SEED_VERSEMENTS = [];

/* ------------------------------------------------------------------ */
/*  Utilitaires                                                        */
/* ------------------------------------------------------------------ */

const money = (n) =>
  (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " DA";

const nextId = (items, prefix) => {
  const nums = items
    .map((it) => parseInt(String(it.id).replace(prefix, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return prefix + String(next).padStart(3, "0");
};

const isComplete = (d) => Boolean(d.nom && d.montantInitial);

const computePaid = (debtId, payments) =>
  payments.filter((p) => p.detteId === debtId).reduce((s, p) => s + (Number(p.montant) || 0), 0);

const computeStatut = (debt, paid) => {
  if (!isComplete(debt)) return "incomplet";
  const reste = Math.max(0, Number(debt.montantInitial) - paid);
  if (reste === 0) return "payee";
  if (debt.echeance && new Date(debt.echeance) < new Date(new Date().toDateString())) return "retard";
  return "encours";
};

const statutLabel = (statut, lang) => STRINGS[lang || "fr"]["statut_" + statut] || statut;

const STATUT_STYLE = {
  incomplet: { color: "#B07D12", background: "#FCEFCB" },
  payee: { color: "#5B6072", background: "#EEF0F6" },
  retard: { color: "#E2572B", background: "#FDE3D8" },
  encours: { color: "#148F5B", background: "#DCF5EA" },
};

const billetLabel = (statut, lang) => STRINGS[lang || "fr"]["billet_" + statut] || statut;
const BILLET_STYLE = {
  paye: { color: "#148F5B", background: "#DCF5EA" },
  non_paye: { color: "#E2572B", background: "#FDE3D8" },
  a_confirmer: { color: "#B07D12", background: "#FCEFCB" },
};


/* ------------------------------------------------------------------ */
/*  Petits composants d'UI                                             */
/* ------------------------------------------------------------------ */

function StatusPill({ style, children }) {
  return (
    <span
      className="inline-block rounded-[3px] px-2 py-0.5 text-[12px] font-medium whitespace-nowrap"
      style={style}
    >
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-[12.5px] mb-1" style={{ color: "#5B6072" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-[8px] border px-2.5 py-1.5 text-[14.5px] outline-none transition-colors";
const inputStyle = { borderColor: "#E4E7F2", background: "#FFFFFF", color: "#14172B" };

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(20,23,43,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-[20px] sm:rounded-[18px] p-5"
        style={{ background: "#FFFFFF", border: "1px solid #E4E7F2" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[17px]" style={{ fontFamily: "'Sora', sans-serif", color: "#14172B" }}>
            {title}
          </h3>
          <button onClick={onClose} aria-label="Fermer" className="p-1 rounded hover:bg-black/5">
            <X size={18} color="#5B6072" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div
      className="text-center py-10 text-[14px] rounded-[12px]"
      style={{ color: "#8A8FA3", border: "1px dashed #E4E7F2" }}
    >
      {text}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Formulaire : dette                                                 */
/* ------------------------------------------------------------------ */

function DebtForm({ sens, initial, onCancel, onSave }) {
  const { t } = useLang();
  const [f, setF] = useState(
    initial || {
      nom: "", categorie: "", telephone: "", ville: "",
      dateDette: "", echeance: "", montantInitial: "", notes: "",
    }
  );
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.nom.trim()) return;
        onSave({ ...f, montantInitial: f.montantInitial === "" ? null : Number(f.montantInitial) });
      }}
    >
      <Field label={sens === "recu" ? "Nom / client" : "Nom / personne"}>
        <input className={inputCls} style={inputStyle} value={f.nom} onChange={set("nom")} autoFocus />
      </Field>
      <Field label="Catégorie">
        <input className={inputCls} style={inputStyle} value={f.categorie} onChange={set("categorie")} placeholder="Client, Argent prêté, Fournisseur…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Téléphone">
          <input className={inputCls} style={inputStyle} value={f.telephone} onChange={set("telephone")} />
        </Field>
        <Field label="Ville">
          <input className={inputCls} style={inputStyle} value={f.ville} onChange={set("ville")} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date de la dette">
          <input type="date" className={inputCls} style={inputStyle} value={f.dateDette} onChange={set("dateDette")} />
        </Field>
        <Field label="Échéance">
          <input type="date" className={inputCls} style={inputStyle} value={f.echeance} onChange={set("echeance")} />
        </Field>
      </div>
      <Field label="Montant initial (DA)">
        <input type="number" min="0" className={inputCls} style={inputStyle} value={f.montantInitial} onChange={set("montantInitial")} />
      </Field>
      <Field label="Notes">
        <input className={inputCls} style={inputStyle} value={f.notes} onChange={set("notes")} />
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[14px] rounded-[8px]" style={{ color: "#5B6072" }}>
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="px-3.5 py-1.5 text-[14px] rounded-[8px] text-white"
          style={{ background: sens === "recu" ? "#148F5B" : "#E2572B" }}
        >
          {t("save")}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Tableau des dettes (Ils me doivent / Je leur dois)                 */
/* ------------------------------------------------------------------ */

function DebtsPanel({ sens, debts, payments, onAdd, onEdit, onDelete }) {
  const { t, lang } = useLang();
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null); // null | 'new' | debt object

  const rows = useMemo(() => {
    return debts
      .filter((d) => d.sens === sens)
      .map((d) => {
        const paid = computePaid(d.id, payments);
        const reste = isComplete(d) ? Math.max(0, Number(d.montantInitial) - paid) : null;
        return { ...d, paid, reste, statut: computeStatut(d, paid) };
      })
      .filter((d) => (d.nom || "").toLowerCase().includes(query.toLowerCase()));
  }, [debts, payments, sens, query]);

  const label = t(sens === "recu" ? "tab_recu" : "tab_du");
  const accent = sens === "recu" ? "#148F5B" : "#E2572B";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2" color="#8A8FA3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="w-full rounded-[8px] border pl-8 pr-3 py-1.5 text-[14.5px] outline-none"
            style={inputStyle}
          />
        </div>
        <button
          onClick={() => setModal("new")}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[8px] text-white text-[14px] whitespace-nowrap"
          style={{ background: accent }}
        >
          <Plus size={15} /> {t("add_entry")}
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState text={t(sens === "recu" ? "empty_recu" : "empty_du")} />
      ) : (
        <div className="overflow-x-auto rounded-[12px]" style={{ border: "1px solid #EAECF5", background: "#FFFFFF" }}>
          <table className="w-full text-[14px]" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F0F1F8", color: "#5B6072" }}>
                <th className="text-left font-medium px-3 py-2">{t("col_nom")}</th>
                <th className="text-left font-medium px-3 py-2 hidden sm:table-cell">{t("col_categorie")}</th>
                <th className="text-right font-medium px-3 py-2">{t("col_montant")}</th>
                <th className="text-right font-medium px-3 py-2">{t("col_reste")}</th>
                <th className="text-left font-medium px-3 py-2">{t("col_statut")}</th>
                <th className="text-right font-medium px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid #EAECF5" }}>
                  <td className="px-3 py-2">
                    <div style={{ color: "#14172B" }}>{d.nom || "—"}</div>
                    <div className="text-[12px]" style={{ color: "#8A8FA3" }}>{d.id}{d.ville ? ` · ${d.ville}` : ""}</div>
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell" style={{ color: "#5B6072" }}>{d.categorie || "—"}</td>
                  <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: "tabular-nums", color: "#14172B" }}>
                    {d.montantInitial != null ? money(d.montantInitial) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: "tabular-nums", color: "#14172B" }}>
                    {d.reste != null ? money(d.reste) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill style={STATUT_STYLE[d.statut]}>{statutLabel(d.statut, lang)}</StatusPill>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setModal(d)} className="p-1.5 rounded hover:bg-black/5" aria-label="Modifier">
                        <Pencil size={14} color="#5B6072" />
                      </button>
                      <button onClick={() => onDelete(d.id)} className="p-1.5 rounded hover:bg-black/5" aria-label="Supprimer">
                        <Trash2 size={14} color="#E2572B" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={modal === "new" ? "Nouvelle entrée" : `Modifier ${modal.nom || modal.id}`}
          onClose={() => setModal(null)}
        >
          <DebtForm
            sens={sens}
            initial={modal === "new" ? null : modal}
            onCancel={() => setModal(null)}
            onSave={(vals) => {
              if (modal === "new") onAdd({ ...vals, sens });
              else onEdit(modal.id, vals);
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Paiements                                                          */
/* ------------------------------------------------------------------ */

function PaymentForm({ debts, payments, onCancel, onSave }) {
  const { t, lang } = useLang();
  const options = debts.filter(isComplete).map((d) => {
    const paid = computePaid(d.id, payments);
    const reste = Math.max(0, Number(d.montantInitial) - paid);
    return { ...d, reste };
  });
  const [f, setF] = useState({
    detteId: options[0]?.id || "",
    date: new Date().toISOString().slice(0, 10),
    montant: "",
    mode: "Espèces",
    note: "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const chosen = options.find((o) => o.id === f.detteId);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.detteId || !f.montant) return;
        onSave({ ...f, montant: Number(f.montant) });
      }}
    >
      <Field label="Dette concernée">
        <select className={inputCls} style={inputStyle} value={f.detteId} onChange={set("detteId")}>
          {options.length === 0 && <option value="">Aucune dette complète disponible</option>}
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nom} — reste {money(o.reste)}
            </option>
          ))}
        </select>
      </Field>
      {chosen && (
        <p className="text-[12.5px] -mt-2 mb-3" style={{ color: "#8A8FA3" }}>
          Reste actuel : {money(chosen.reste)}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" className={inputCls} style={inputStyle} value={f.date} onChange={set("date")} />
        </Field>
        <Field label="Montant (DA)">
          <input type="number" min="0" className={inputCls} style={inputStyle} value={f.montant} onChange={set("montant")} autoFocus />
        </Field>
      </div>
      <Field label="Mode">
        <select className={inputCls} style={inputStyle} value={f.mode} onChange={set("mode")}>
          {["Espèces", "Virement", "BaridiMob", "Carte", "Autre"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </Field>
      <Field label="Note">
        <input className={inputCls} style={inputStyle} value={f.note} onChange={set("note")} />
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[14px] rounded-[8px]" style={{ color: "#5B6072" }}>
          {t("cancel")}
        </button>
        <button type="submit" disabled={!options.length} className="px-3.5 py-1.5 text-[14px] rounded-[8px] text-white disabled:opacity-40" style={{ background: "#14172B" }}>
          {t("save_payment")}
        </button>
      </div>
    </form>
  );
}

function PaymentsPanel({ debts, payments, onAdd, onDelete }) {
  const { t } = useLang();
  const [modal, setModal] = useState(false);
  const nameOf = (id) => debts.find((d) => d.id === id)?.nom || id;

  const sorted = [...payments].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-[13.5px]" style={{ color: "#8A8FA3" }}>
          {payments.length} paiement{payments.length > 1 ? "s" : ""} enregistré{payments.length > 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-white text-[14px]"
          style={{ background: "#14172B" }}
        >
          <Plus size={15} /> {t("add_payment")}
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState text={t("empty_paiements")} />
      ) : (
        <div className="overflow-x-auto rounded-[12px]" style={{ border: "1px solid #EAECF5", background: "#FFFFFF" }}>
          <table className="w-full text-[14px]" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F0F1F8", color: "#5B6072" }}>
                <th className="text-left font-medium px-3 py-2">{t("col_date")}</th>
                <th className="text-left font-medium px-3 py-2">{t("col_dette")}</th>
                <th className="text-right font-medium px-3 py-2">{t("col_montant")}</th>
                <th className="text-left font-medium px-3 py-2 hidden sm:table-cell">{t("col_mode")}</th>
                <th className="text-right font-medium px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid #EAECF5" }}>
                  <td className="px-3 py-2" style={{ color: "#5B6072" }}>{p.date}</td>
                  <td className="px-3 py-2" style={{ color: "#14172B" }}>{nameOf(p.detteId)}</td>
                  <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: "tabular-nums", color: "#148F5B" }}>
                    +{money(p.montant)}
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell" style={{ color: "#5B6072" }}>{p.mode}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => onDelete(p.id)} className="p-1.5 rounded hover:bg-black/5" aria-label="Supprimer">
                      <Trash2 size={14} color="#E2572B" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title="Nouveau paiement" onClose={() => setModal(false)}>
          <PaymentForm
            debts={debts}
            payments={payments}
            onCancel={() => setModal(false)}
            onSave={(vals) => {
              onAdd(vals);
              setModal(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Billets d'avion                                                    */
/* ------------------------------------------------------------------ */

function BilletForm({ initial, onCancel, onSave }) {
  const { t } = useLang();
  const [f, setF] = useState(
    initial || {
      beneficiaire: "", compagnie: "", rotation: "", agence: "",
      prix: "", montantPaye: "", statut: "a_confirmer", notes: "",
    }
  );
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.beneficiaire.trim() || !f.prix) return;
        onSave({ ...f, prix: Number(f.prix), montantPaye: Number(f.montantPaye) || 0 });
      }}
    >
      <Field label="Bénéficiaire">
        <input className={inputCls} style={inputStyle} value={f.beneficiaire} onChange={set("beneficiaire")} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Compagnie">
          <input className={inputCls} style={inputStyle} value={f.compagnie} onChange={set("compagnie")} />
        </Field>
        <Field label="Agence">
          <input className={inputCls} style={inputStyle} value={f.agence} onChange={set("agence")} />
        </Field>
      </div>
      <Field label="Rotation / dates">
        <input className={inputCls} style={inputStyle} value={f.rotation} onChange={set("rotation")} placeholder="ex. 15–19/09/2026" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix (DA)">
          <input type="number" min="0" className={inputCls} style={inputStyle} value={f.prix} onChange={set("prix")} />
        </Field>
        <Field label="Montant payé (DA)">
          <input type="number" min="0" className={inputCls} style={inputStyle} value={f.montantPaye} onChange={set("montantPaye")} />
        </Field>
      </div>
      <Field label="Statut">
        <select className={inputCls} style={inputStyle} value={f.statut} onChange={set("statut")}>
          <option value="a_confirmer">À confirmer</option>
          <option value="paye">Payé</option>
          <option value="non_paye">Non payé</option>
        </select>
      </Field>
      <Field label="Notes">
        <input className={inputCls} style={inputStyle} value={f.notes} onChange={set("notes")} />
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[14px] rounded-[8px]" style={{ color: "#5B6072" }}>
          {t("cancel")}
        </button>
        <button type="submit" className="px-3.5 py-1.5 text-[14px] rounded-[8px] text-white" style={{ background: "#14172B" }}>
          {t("save")}
        </button>
      </div>
    </form>
  );
}

function BilletsGroup({ title, style, items, total, onEdit, onDelete }) {
  const { t } = useLang();
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusPill style={style}>{title}</StatusPill>
          <span className="text-[13px]" style={{ color: "#8A8FA3" }}>
            {items.length} billet{items.length > 1 ? "s" : ""}
          </span>
        </div>
        <span className="text-[13px]" style={{ color: "#8A8FA3", fontVariantNumeric: "tabular-nums" }}>
          {money(total)}
        </span>
      </div>
      <div className="overflow-x-auto rounded-[12px]" style={{ border: "1px solid #EAECF5", background: "#FFFFFF" }}>
        <table className="w-full text-[14px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F0F1F8", color: "#5B6072" }}>
              <th className="text-left font-medium px-3 py-2">{t("col_beneficiaire")}</th>
              <th className="text-left font-medium px-3 py-2 hidden sm:table-cell">{t("col_compagnie")}</th>
              <th className="text-right font-medium px-3 py-2">{t("col_prix")}</th>
              <th className="text-right font-medium px-3 py-2">{t("col_reste")}</th>
              <th className="text-right font-medium px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => {
              const reste = Math.max(0, Number(b.prix) - Number(b.montantPaye || 0));
              return (
                <tr key={b.id} style={{ borderTop: "1px solid #EAECF5" }}>
                  <td className="px-3 py-2">
                    <div style={{ color: "#14172B" }}>{b.beneficiaire}</div>
                    <div className="text-[12px]" style={{ color: "#8A8FA3" }}>{b.id}{b.rotation ? ` · ${b.rotation}` : ""}</div>
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell" style={{ color: "#5B6072" }}>
                    {b.compagnie}{b.agence ? ` · ${b.agence}` : ""}
                  </td>
                  <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: "tabular-nums", color: "#14172B" }}>
                    {money(b.prix)}
                  </td>
                  <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: "tabular-nums", color: "#14172B" }}>
                    {money(reste)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => onEdit(b)} className="p-1.5 rounded hover:bg-black/5" aria-label="Modifier">
                        <Pencil size={14} color="#5B6072" />
                      </button>
                      <button onClick={() => onDelete(b.id)} className="p-1.5 rounded hover:bg-black/5" aria-label="Supprimer">
                        <Trash2 size={14} color="#E2572B" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BilletsPanel({ billets, onAdd, onEdit, onDelete }) {
  const { t, lang } = useLang();
  const [modal, setModal] = useState(null);

  const payes = billets.filter((b) => b.statut === "paye");
  const nonPayes = billets.filter((b) => b.statut === "non_paye");
  const aConfirmer = billets.filter((b) => b.statut === "a_confirmer");
  const sumPrix = (arr) => arr.reduce((s, b) => s + (Number(b.prix) || 0), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <p className="text-[13.5px]" style={{ color: "#8A8FA3" }}>
          {billets.length} billet{billets.length > 1 ? "s" : ""} suivi{billets.length > 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setModal("new")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-white text-[14px]"
          style={{ background: "#14172B" }}
        >
          <Plus size={15} /> {t("add_billet")}
        </button>
      </div>

      {billets.length === 0 ? (
        <EmptyState text={t("empty_billets")} />
      ) : (
        <>
          <BilletsGroup title={billetLabel("paye", lang)} style={BILLET_STYLE.paye} items={payes} total={sumPrix(payes)} onEdit={setModal} onDelete={onDelete} />
          <BilletsGroup title={billetLabel("non_paye", lang)} style={BILLET_STYLE.non_paye} items={nonPayes} total={sumPrix(nonPayes)} onEdit={setModal} onDelete={onDelete} />
          <BilletsGroup title={billetLabel("a_confirmer", lang)} style={BILLET_STYLE.a_confirmer} items={aConfirmer} total={sumPrix(aConfirmer)} onEdit={setModal} onDelete={onDelete} />
        </>
      )}

      {modal && (
        <Modal title={modal === "new" ? "Nouveau billet" : `Modifier le billet ${modal.id}`} onClose={() => setModal(null)}>
          <BilletForm
            initial={modal === "new" ? null : modal}
            onCancel={() => setModal(null)}
            onSave={(vals) => {
              if (modal === "new") onAdd(vals);
              else onEdit(modal.id, vals);
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rotations : marchandise Algérie–Chine                              */
/* ------------------------------------------------------------------ */

function RotationForm({ initial, onCancel, onSave }) {
  const { t } = useLang();
  const [f, setF] = useState(initial || { label: "", dateDepart: "", dateRetour: "", fraisRotation: "", notes: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.label.trim()) return;
        onSave({ ...f, fraisRotation: Number(f.fraisRotation) || 0 });
      }}
    >
      <Field label="Nom de la rotation">
        <input className={inputCls} style={inputStyle} value={f.label} onChange={set("label")} placeholder="ex. Rotation Guangzhou – octobre 2026" autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date de départ">
          <input type="date" className={inputCls} style={inputStyle} value={f.dateDepart} onChange={set("dateDepart")} />
        </Field>
        <Field label="Date de retour">
          <input type="date" className={inputCls} style={inputStyle} value={f.dateRetour} onChange={set("dateRetour")} />
        </Field>
      </div>
      <Field label="Frais généraux de la rotation (DA)">
        <input type="number" min="0" className={inputCls} style={inputStyle} value={f.fraisRotation} onChange={set("fraisRotation")} placeholder="douane, transport local…" />
      </Field>
      <Field label="Notes">
        <input className={inputCls} style={inputStyle} value={f.notes} onChange={set("notes")} />
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[14px] rounded-[8px]" style={{ color: "#5B6072" }}>
          {t("cancel")}
        </button>
        <button type="submit" className="px-3.5 py-1.5 text-[14px] rounded-[8px] text-white" style={{ background: "#14172B" }}>
          {t("save")}
        </button>
      </div>
    </form>
  );
}

function MerchLineForm({ initial, onCancel, onSave }) {
  const { t } = useLang();
  const [f, setF] = useState(
    initial || { type: "revente", designation: "", quantite: "1", prixAchatUnitaire: "", prixVenteUnitaire: "", piece: null }
  );
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const fileRef = useRef(null);
  const isTransport = f.type === "transport";
  const qte = Number(f.quantite) || 0;
  const achat = isTransport ? 0 : Number(f.prixAchatUnitaire) || 0;
  const vente = Number(f.prixVenteUnitaire) || 0;
  const apercu = qte * (vente - achat);

  /* Lecture automatique du bon par IA (fonction serveur /api/scan-bon) */
  const [scanState, setScanState] = useState("idle"); // idle | scanning | done | error
  const [scanMessage, setScanMessage] = useState("");

  const scanBon = async (dataUrl, currentType) => {
    setScanState("scanning");
    setScanMessage("Lecture du bon en cours…");
    try {
      const data = await scanBonImage(dataUrl, currentType === "transport");
      setF((prev) => ({
        ...prev,
        designation: typeof data?.designation === "string" && data.designation.trim() ? data.designation.trim() : prev.designation,
        quantite: data?.quantite != null && !Number.isNaN(Number(data.quantite)) ? String(data.quantite) : prev.quantite,
        ...(prev.type === "transport"
          ? { prixVenteUnitaire: data?.prixUnitaire != null && !Number.isNaN(Number(data.prixUnitaire)) ? String(data.prixUnitaire) : prev.prixVenteUnitaire }
          : { prixAchatUnitaire: data?.prixUnitaire != null && !Number.isNaN(Number(data.prixUnitaire)) ? String(data.prixUnitaire) : prev.prixAchatUnitaire }),
      }));
      setScanState("done");
      setScanMessage("Champs pré-remplis à partir du bon — vérifie avant d'enregistrer.");
    } catch (err) {
      setScanState("error");
      setScanMessage(
        err && err.code === "missing_api_key"
          ? "Lecture automatique non configurée (clé API manquante côté serveur)."
          : "La lecture automatique du bon a échoué — remplis ou corrige les champs manuellement."
      );
    }
  };

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      if (file.size > 20 * 1024 * 1024) {
        alert("Cette photo dépasse 20 Mo — choisis-en une plus légère.");
        return;
      }
      setScanState("idle");
      setScanMessage("");
      shrinkImage(file)
        .then((dataUrl) => {
          setF((prev) => ({ ...prev, piece: { name: file.name.replace(/\.\w+$/, "") + ".jpg", type: "image/jpeg", dataUrl } }));
          scanBon(dataUrl, f.type);
        })
        .catch(() => alert("Impossible de lire cette photo — réessaie avec un autre fichier."));
      return;
    }
    if (file.type === "application/pdf") {
      if (file.size > 500 * 1024) {
        alert("Un PDF joint doit faire moins de 500 Ko pour être sauvegardé — utilise plutôt une photo, qui est automatiquement réduite.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setF((prev) => ({ ...prev, piece: { name: file.name, type: file.type, dataUrl: reader.result } }));
      };
      reader.readAsDataURL(file);
      setScanState("idle");
      setScanMessage("");
      return;
    }
    alert("Formats acceptés : PDF ou photo (JPEG, PNG…).");
  };

  const rescanBon = () => {
    if (!f.piece || !f.piece.dataUrl) return;
    scanBon(f.piece.dataUrl, f.type);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.designation.trim() || !f.quantite) return;
        onSave({
          ...f,
          quantite: Number(f.quantite),
          prixAchatUnitaire: isTransport ? 0 : Number(f.prixAchatUnitaire) || 0,
          prixVenteUnitaire: Number(f.prixVenteUnitaire) || 0,
        });
      }}
    >
      <Field label="Comment cette marchandise génère un bénéfice ?">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setF({ ...f, type: "revente" })}
            className="flex-1 px-2.5 py-1.5 rounded-[8px] text-[13.5px]"
            style={{
              border: "1px solid " + (!isTransport ? "#4C5FD5" : "#E4E7F2"),
              background: !isTransport ? "#EEF0FD" : "#FFFFFF",
              color: !isTransport ? "#4C5FD5" : "#5B6072",
            }}
          >
            J'achète et je revends
          </button>
          <button
            type="button"
            onClick={() => setF({ ...f, type: "transport" })}
            className="flex-1 px-2.5 py-1.5 rounded-[8px] text-[13.5px]"
            style={{
              border: "1px solid " + (isTransport ? "#4C5FD5" : "#E4E7F2"),
              background: isTransport ? "#EEF0FD" : "#FFFFFF",
              color: isTransport ? "#4C5FD5" : "#5B6072",
            }}
          >
            Je suis payé pour la transporter
          </button>
        </div>
      </Field>
      <Field label="Type de marchandise">
        <input className={inputCls} style={inputStyle} value={f.designation} onChange={set("designation")} placeholder="ex. Téléphones" autoFocus />
      </Field>
      <Field label="Quantité">
        <input type="number" min="0" className={inputCls} style={inputStyle} value={f.quantite} onChange={set("quantite")} />
      </Field>
      {isTransport ? (
        <Field label="Montant reçu / unité (DA)">
          <input type="number" min="0" className={inputCls} style={inputStyle} value={f.prixVenteUnitaire} onChange={set("prixVenteUnitaire")} />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prix d'achat / unité (DA)">
            <input type="number" min="0" className={inputCls} style={inputStyle} value={f.prixAchatUnitaire} onChange={set("prixAchatUnitaire")} />
          </Field>
          <Field label="Prix de vente / unité (DA)">
            <input type="number" min="0" className={inputCls} style={inputStyle} value={f.prixVenteUnitaire} onChange={set("prixVenteUnitaire")} />
          </Field>
        </div>
      )}
      <p className="text-[13px] mb-3" style={{ color: apercu >= 0 ? "#148F5B" : "#E2572B" }}>
        Bénéfice pour cette ligne : {money(apercu)}
      </p>

      <Field label="Bon de marchandise (PDF ou photo)">
        <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={onFile} className="hidden" />
        {f.piece ? (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[8px]" style={{ border: "1px solid #E4E7F2", background: "#FFFFFF" }}>
            <a href={f.piece.dataUrl} target="_blank" rel="noreferrer" className="text-[13.5px] truncate" style={{ color: "#4C5FD5" }}>
              {f.piece.name}
            </a>
            <button
              type="button"
              onClick={() => { setF({ ...f, piece: null }); setScanState("idle"); setScanMessage(""); }}
              aria-label="Retirer la pièce jointe"
              className="p-1 rounded hover:bg-black/5 shrink-0"
            >
              <X size={14} color="#8A8FA3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current && fileRef.current.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[13.5px]"
            style={{ border: "1px solid #E4E7F2", color: "#5B6072" }}
          >
            <Paperclip size={14} /> Joindre un fichier
          </button>
        )}
        {f.piece && f.piece.type && f.piece.type.startsWith("image/") && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {scanState === "scanning" && (
              <p className="text-[12.5px]" style={{ color: "#8A8FA3" }}>{scanMessage}</p>
            )}
            {scanState === "done" && (
              <p className="text-[12.5px]" style={{ color: "#148F5B" }}>{scanMessage}</p>
            )}
            {scanState === "error" && (
              <p className="text-[12.5px]" style={{ color: "#E2572B" }}>{scanMessage}</p>
            )}
            {scanState !== "scanning" && (
              <button type="button" onClick={rescanBon} className="text-[12.5px] shrink-0" style={{ color: "#4C5FD5" }}>
                {scanState === "idle" ? "Lire le bon avec l'IA" : "Relire le bon"}
              </button>
            )}
          </div>
        )}
      </Field>

      <div className="flex justify-end gap-2 mt-1">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[14px] rounded-[8px]" style={{ color: "#5B6072" }}>
          {t("cancel")}
        </button>
        <button type="submit" className="px-3.5 py-1.5 text-[14px] rounded-[8px] text-white" style={{ background: "#14172B" }}>
          {t("save")}
        </button>
      </div>
    </form>
  );
}

function PassengerForm({ initial, onCancel, onSave }) {
  const { t } = useLang();
  const [f, setF] = useState(() => {
    if (initial) {
      const poidsTotalInit = (Number(initial.poidsSoute) || 0) + (Number(initial.poidsCabine) || 0);
      const prixKgBagage = initial.prixKgBagage != null
        ? String(initial.prixKgBagage)
        : (poidsTotalInit > 0 && initial.coutTransport ? String(Math.round((Number(initial.coutTransport) || 0) / poidsTotalInit)) : "");
      return { ...initial, prixKgBagage };
    }
    return {
      nom: "", poidsSoute: "23", poidsCabine: "10",
      prixKgBagage: "", prixBillet: "", statutBillet: "a_confirmer", fraisVisa: "",
      notes: "", piece: null,
    };
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const fileRef = useRef(null);
  const poidsTotal = (Number(f.poidsSoute) || 0) + (Number(f.poidsCabine) || 0);
  const montantBagage = poidsTotal * (Number(f.prixKgBagage) || 0);

  /* Lecture automatique du document par IA (fonction serveur /api/scan-bon) */
  const [scanState, setScanState] = useState("idle"); // idle | scanning | done | error
  const [scanMessage, setScanMessage] = useState("");

  const scanDocument = async (dataUrl) => {
    setScanState("scanning");
    setScanMessage("Analyse en cours…");
    try {
      const data = await scanPassengerDoc(dataUrl);
      setF((prev) => ({
        ...prev,
        nom: !prev.nom.trim() && typeof data?.nomPassager === "string" && data.nomPassager.trim() ? data.nomPassager.trim() : prev.nom,
        prixBillet: data?.prixBillet != null && !Number.isNaN(Number(data.prixBillet)) ? String(data.prixBillet) : prev.prixBillet,
        fraisVisa: data?.fraisVisa != null && !Number.isNaN(Number(data.fraisVisa)) ? String(data.fraisVisa) : prev.fraisVisa,
      }));
      setScanState("done");
      setScanMessage("Champs pré-remplis à partir du document — vérifie avant d'enregistrer.");
    } catch (err) {
      setScanState("error");
      setScanMessage(
        err && err.code === "missing_api_key"
          ? "Lecture automatique non configurée (clé API manquante côté serveur)."
          : "La lecture automatique a échoué — remplis ou corrige les champs manuellement."
      );
    }
  };

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      if (file.size > 20 * 1024 * 1024) {
        alert("Cette photo dépasse 20 Mo — choisis-en une plus légère.");
        return;
      }
      setScanState("idle");
      setScanMessage("");
      shrinkImage(file)
        .then((dataUrl) => {
          setF((prev) => ({ ...prev, piece: { name: file.name.replace(/\.\w+$/, "") + ".jpg", type: "image/jpeg", dataUrl } }));
          scanDocument(dataUrl);
        })
        .catch(() => alert("Impossible de lire cette photo — réessaie avec un autre fichier."));
      return;
    }
    if (file.type === "application/pdf") {
      if (file.size > 500 * 1024) {
        alert("Un PDF joint doit faire moins de 500 Ko pour être sauvegardé — utilise plutôt une photo, qui est automatiquement réduite.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setF((prev) => ({ ...prev, piece: { name: file.name, type: file.type, dataUrl: reader.result } }));
      };
      reader.readAsDataURL(file);
      setScanState("idle");
      setScanMessage("");
      return;
    }
    alert("Formats acceptés : PDF ou photo (JPEG, PNG…).");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.nom.trim()) return;
        onSave({
          ...f,
          poidsSoute: Number(f.poidsSoute) || 0,
          poidsCabine: Number(f.poidsCabine) || 0,
          prixKgBagage: Number(f.prixKgBagage) || 0,
          coutTransport: poidsTotal * (Number(f.prixKgBagage) || 0),
          prixBillet: Number(f.prixBillet) || 0,
          fraisVisa: Number(f.fraisVisa) || 0,
        });
      }}
    >
      <Field label="Passager">
        <input className={inputCls} style={inputStyle} value={f.nom} onChange={set("nom")} placeholder="ex. Youcef" autoFocus />
      </Field>
      {initial && initial.code && (
        <p className="text-[12.5px] -mt-2.5 mb-3" style={{ color: "#8A8FA3" }}>
          Code passager : {initial.code} (généré automatiquement)
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bagage soute (kg)">
          <input type="number" min="0" className={inputCls} style={inputStyle} value={f.poidsSoute} onChange={set("poidsSoute")} />
        </Field>
        <Field label="Bagage cabine (kg)">
          <input type="number" min="0" className={inputCls} style={inputStyle} value={f.poidsCabine} onChange={set("poidsCabine")} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix du billet (DA)">
          <input type="number" min="0" className={inputCls} style={inputStyle} value={f.prixBillet} onChange={set("prixBillet")} />
        </Field>
        <Field label="Statut du billet">
          <select className={inputCls} style={inputStyle} value={f.statutBillet} onChange={set("statutBillet")}>
            <option value="a_confirmer">À confirmer</option>
            <option value="paye">Payé</option>
            <option value="non_paye">Non payé</option>
          </select>
        </Field>
      </div>
      <Field label="Frais de visa (DA)">
        <input type="number" min="0" className={inputCls} style={inputStyle} value={f.fraisVisa} onChange={set("fraisVisa")} />
      </Field>
      <Field label="Prix par kg pour le bagage (DA/kg)">
        <input type="number" min="0" className={inputCls} style={inputStyle} value={f.prixKgBagage} onChange={set("prixKgBagage")} placeholder="ex. 2000" />
      </Field>
      <p className="text-[12.5px] -mt-2.5 mb-3" style={{ color: "#8A8FA3" }}>
        {poidsTotal} kg × {money(Number(f.prixKgBagage) || 0)}/kg = <span style={{ color: "#14172B" }}>{money(montantBagage)}</span> payés pour le bagage
      </p>
      <Field label="Notes">
        <input className={inputCls} style={inputStyle} value={f.notes} onChange={set("notes")} />
      </Field>

      <Field label="Bon de marchandise (PDF ou photo)">
        <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={onFile} className="hidden" />
        {f.piece ? (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[8px]" style={{ border: "1px solid #E4E7F2", background: "#FFFFFF" }}>
            <a href={f.piece.dataUrl} target="_blank" rel="noreferrer" className="text-[13.5px] truncate" style={{ color: "#4C5FD5" }}>
              {f.piece.name}
            </a>
            <button
              type="button"
              onClick={() => { setF({ ...f, piece: null }); setScanState("idle"); setScanMessage(""); }}
              aria-label="Retirer la pièce jointe"
              className="p-1 rounded hover:bg-black/5 shrink-0"
            >
              <X size={14} color="#8A8FA3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current && fileRef.current.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[13.5px]"
            style={{ border: "1px solid #E4E7F2", color: "#5B6072" }}
          >
            <Paperclip size={14} /> Joindre un fichier
          </button>
        )}
        {scanState !== "idle" && (
          <p
            className="text-[12.5px] mt-2"
            style={{ color: scanState === "scanning" ? "#8A8FA3" : scanState === "done" ? "#148F5B" : "#E2572B" }}
          >
            {scanMessage}
          </p>
        )}
      </Field>

      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[14px] rounded-[8px]" style={{ color: "#5B6072" }}>
          {t("cancel")}
        </button>
        <button type="submit" className="px-3.5 py-1.5 text-[14px] rounded-[8px] text-white" style={{ background: "#14172B" }}>
          {t("save")}
        </button>
      </div>
    </form>
  );
}

/* Fiche détaillée d'un passager, avec sa propre marchandise transportée imbriquée */
function PassengerFiche({ passenger, lines, onEdit, onDelete, onAddLine, onEditLine, onDeleteLine }) {
  const { lang } = useLang();
  const [lineModal, setLineModal] = useState(null);
  const merch = lines.reduce(
    (acc, l) => {
      const q = Number(l.quantite) || 0;
      acc.achat += q * (Number(l.prixAchatUnitaire) || 0);
      acc.vente += q * (Number(l.prixVenteUnitaire) || 0);
      return acc;
    },
    { achat: 0, vente: 0 }
  );
  const coutPassager = (Number(passenger.prixBillet) || 0) + (Number(passenger.fraisVisa) || 0) + (Number(passenger.coutTransport) || 0);
  const soldePassager = merch.vente - merch.achat - coutPassager;

  return (
    <div className="rounded-[10px] mb-3" style={{ border: "1px solid #EAECF5" }}>
      <div className="flex items-start justify-between px-3.5 py-2.5" style={{ background: "#FAFBFD", borderBottom: "1px solid #EAECF5" }}>
        <div>
          <div className="text-[14.5px]" style={{ color: "#14172B", fontWeight: 600 }}>
            {passenger.nom}{passenger.code ? ` · ${passenger.code}` : ""}
          </div>
          <div className="text-[12px] mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: "#8A8FA3" }}>
            <span>
              Bagages {passenger.poidsSoute}+{passenger.poidsCabine} kg · Billet {money(passenger.prixBillet)} · Visa {money(passenger.fraisVisa)} · Bagage payé {money(passenger.coutTransport)}
              {passenger.prixKgBagage ? ` (${money(passenger.prixKgBagage)}/kg)` : ""}
            </span>
            <StatusPill style={BILLET_STYLE[passenger.statutBillet || "a_confirmer"]}>{billetLabel(passenger.statutBillet || "a_confirmer", lang)}</StatusPill>
          </div>
          {(passenger.notes || passenger.piece) && (
            <div className="text-[12px] mt-1 flex items-center gap-1.5 flex-wrap" style={{ color: "#8A8FA3" }}>
              {passenger.notes && <span>{passenger.notes}</span>}
              {passenger.piece && (
                <a href={passenger.piece.dataUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1" style={{ color: "#4C5FD5" }}>
                  <Paperclip size={11} /> {passenger.piece.name}
                </a>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-[11px]" style={{ color: "#8A8FA3" }}>Bénéfice</div>
            <div className="text-[14px]" style={{ fontVariantNumeric: "tabular-nums", color: soldePassager >= 0 ? "#148F5B" : "#E2572B" }}>
              {money(soldePassager)}
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onEdit(passenger)} className="p-1.5 rounded hover:bg-black/5" aria-label="Modifier le passager">
              <Pencil size={13} color="#5B6072" />
            </button>
            <button onClick={() => onDelete(passenger.id)} className="p-1.5 rounded hover:bg-black/5" aria-label="Supprimer le passager">
              <Trash2 size={13} color="#E2572B" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-3.5 py-2.5">
        {lines.length === 0 ? (
          <p className="text-[13px] mb-2.5" style={{ color: "#8A8FA3" }}>
            Aucune marchandise transportée par ce passager.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[8px] mb-2.5" style={{ border: "1px solid #EAECF5", background: "#FFFFFF" }}>
            <table className="w-full text-[13.5px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F0F1F8", color: "#5B6072" }}>
                  <th className="text-left font-medium px-2.5 py-1.5">Marchandise</th>
                  <th className="text-right font-medium px-2.5 py-1.5">Qté</th>
                  <th className="text-right font-medium px-2.5 py-1.5 hidden sm:table-cell">Achat / u.</th>
                  <th className="text-right font-medium px-2.5 py-1.5 hidden sm:table-cell">Vente / u.</th>
                  <th className="text-right font-medium px-2.5 py-1.5">Bénéfice</th>
                  <th className="text-right font-medium px-2.5 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const q = Number(l.quantite) || 0;
                  const b = q * ((Number(l.prixVenteUnitaire) || 0) - (Number(l.prixAchatUnitaire) || 0));
                  return (
                    <tr key={l.id} style={{ borderTop: "1px solid #EAECF5" }}>
                      <td className="px-2.5 py-1.5" style={{ color: "#14172B" }}>
                        {l.designation}
                        {l.type === "transport" && (
                          <span className="ml-1.5 text-[10.5px] px-1.5 py-0.5 rounded-full" style={{ background: "#EEF0FD", color: "#4C5FD5" }}>
                            transport
                          </span>
                        )}
                        {l.piece && (
                          <a href={l.piece.dataUrl} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex items-center gap-1 text-[11.5px]" style={{ color: "#4C5FD5" }}>
                            <Paperclip size={10} /> {l.piece.name}
                          </a>
                        )}
                      </td>
                      <td className="px-2.5 py-1.5 text-right" style={{ fontVariantNumeric: "tabular-nums", color: "#14172B" }}>{q}</td>
                      <td className="px-2.5 py-1.5 text-right hidden sm:table-cell" style={{ fontVariantNumeric: "tabular-nums", color: "#5B6072" }}>
                        {l.type === "transport" ? "—" : money(l.prixAchatUnitaire)}
                      </td>
                      <td className="px-2.5 py-1.5 text-right hidden sm:table-cell" style={{ fontVariantNumeric: "tabular-nums", color: "#5B6072" }}>
                        {money(l.prixVenteUnitaire)}
                      </td>
                      <td className="px-2.5 py-1.5 text-right" style={{ fontVariantNumeric: "tabular-nums", color: b >= 0 ? "#148F5B" : "#E2572B" }}>
                        {money(b)}
                      </td>
                      <td className="px-2.5 py-1.5">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setLineModal(l)} className="p-1 rounded hover:bg-black/5" aria-label="Modifier">
                            <Pencil size={13} color="#5B6072" />
                          </button>
                          <button onClick={() => onDeleteLine(l.id)} className="p-1 rounded hover:bg-black/5" aria-label="Supprimer">
                            <Trash2 size={13} color="#E2572B" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <button
          onClick={() => setLineModal("new")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[13px]"
          style={{ color: "#14172B", border: "1px solid #E4E7F2" }}
        >
          <Plus size={13} /> Ajouter une marchandise transportée
        </button>
      </div>

      {lineModal && (
        <Modal
          title={lineModal === "new" ? "Nouvelle marchandise" : "Modifier la marchandise"}
          onClose={() => setLineModal(null)}
        >
          <MerchLineForm
            initial={lineModal === "new" ? null : lineModal}
            onCancel={() => setLineModal(null)}
            onSave={(vals) => {
              if (lineModal === "new") onAddLine(passenger.id, vals);
              else onEditLine(lineModal.id, vals);
              setLineModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function RotationCard({ rotation, lines, passengers, onEditRotation, onDeleteRotation, onAddLine, onEditLine, onDeleteLine, onAddPassenger, onEditPassenger, onDeletePassenger }) {
  const { lang } = useLang();
  const [pModal, setPModal] = useState(null);
  const totals = lines.reduce(
    (acc, l) => {
      const q = Number(l.quantite) || 0;
      acc.achat += q * (Number(l.prixAchatUnitaire) || 0);
      acc.vente += q * (Number(l.prixVenteUnitaire) || 0);
      return acc;
    },
    { achat: 0, vente: 0 }
  );
  const coutPassager = (p) => (Number(p.prixBillet) || 0) + (Number(p.fraisVisa) || 0) + (Number(p.coutTransport) || 0);
  const totalPassagers = passengers.reduce((s, p) => s + coutPassager(p), 0);
  const fraisRotation = Number(rotation.fraisRotation) || 0;
  const benefice = totals.vente - totals.achat - totalPassagers - fraisRotation;
  const periode = [rotation.dateDepart, rotation.dateRetour].filter(Boolean).join(" → ");

  const billetStatut = (s) => passengers.filter((p) => (p.statutBillet || "a_confirmer") === s);
  const billetsPayes = billetStatut("paye");
  const billetsNonPayes = billetStatut("non_paye");
  const billetsAConfirmer = billetStatut("a_confirmer");
  const resteAPayer = passengers.reduce((s, p) => s + ((p.statutBillet || "a_confirmer") !== "paye" ? Number(p.prixBillet) || 0 : 0), 0);

  return (
    <div className="mb-6 rounded-[12px] overflow-hidden" style={{ border: "1px solid #EAECF5", background: "#FFFFFF" }}>
      <div className="flex items-start justify-between px-4 py-3" style={{ borderBottom: "1px solid #EAECF5", background: "#F7F8FC" }}>
        <div>
          <div className="text-[15.5px]" style={{ fontFamily: "'Sora', sans-serif", color: "#14172B" }}>
            {rotation.label}
          </div>
          {periode && <div className="text-[12.5px]" style={{ color: "#8A8FA3" }}>{periode}</div>}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[12px]" style={{ color: "#8A8FA3" }}>Bénéfice</div>
            <div
              className="text-[16px]"
              style={{ fontVariantNumeric: "tabular-nums", color: benefice >= 0 ? "#148F5B" : "#E2572B" }}
            >
              {money(benefice)}
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onEditRotation(rotation)} className="p-1.5 rounded hover:bg-black/5" aria-label="Modifier la rotation">
              <Pencil size={14} color="#5B6072" />
            </button>
            <button onClick={() => onDeleteRotation(rotation.id)} className="p-1.5 rounded hover:bg-black/5" aria-label="Supprimer la rotation">
              <Trash2 size={14} color="#E2572B" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        {fraisRotation > 0 && (
          <p className="text-[12.5px] mb-3" style={{ color: "#8A8FA3" }}>
            Frais généraux de la rotation (douane, transport local…) : {money(fraisRotation)}
          </p>
        )}

        <h5 className="text-[13.5px] mb-2.5" style={{ color: "#5B6072" }}>Passagers & marchandise transportée</h5>

        {passengers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <StatusPill style={BILLET_STYLE.paye}>{billetsPayes.length} · {billetLabel("paye", lang)}</StatusPill>
            <StatusPill style={BILLET_STYLE.non_paye}>{billetsNonPayes.length} · {billetLabel("non_paye", lang)}</StatusPill>
            <StatusPill style={BILLET_STYLE.a_confirmer}>{billetsAConfirmer.length} · {billetLabel("a_confirmer", lang)}</StatusPill>
            {resteAPayer > 0 && (
              <span className="text-[12.5px]" style={{ color: "#8A8FA3" }}>· reste à payer sur billets : {money(resteAPayer)}</span>
            )}
          </div>
        )}

        {passengers.length === 0 ? (
          <p className="text-[13.5px] mb-3" style={{ color: "#8A8FA3" }}>
            Aucun passager ajouté à cette rotation.
          </p>
        ) : (
          passengers.map((p) => (
            <PassengerFiche
              key={p.id}
              passenger={p}
              lines={lines.filter((l) => l.passagerId === p.id)}
              onEdit={setPModal}
              onDelete={onDeletePassenger}
              onAddLine={onAddLine}
              onEditLine={onEditLine}
              onDeleteLine={onDeleteLine}
            />
          ))
        )}

        <button
          onClick={() => setPModal("new")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13.5px]"
          style={{ color: "#14172B", border: "1px solid #E4E7F2" }}
        >
          <Plus size={14} /> Ajouter un passager
        </button>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3" style={{ borderTop: "1px solid #EAECF5" }}>
          <div>
            <div className="text-[11.5px]" style={{ color: "#8A8FA3" }}>Achat marchandise</div>
            <div className="text-[13.5px]" style={{ fontVariantNumeric: "tabular-nums", color: "#14172B" }}>{money(totals.achat)}</div>
          </div>
          <div>
            <div className="text-[11.5px]" style={{ color: "#8A8FA3" }}>Vente marchandise</div>
            <div className="text-[13.5px]" style={{ fontVariantNumeric: "tabular-nums", color: "#14172B" }}>{money(totals.vente)}</div>
          </div>
          <div>
            <div className="text-[11.5px]" style={{ color: "#8A8FA3" }}>Coût passagers + rotation</div>
            <div className="text-[13.5px]" style={{ fontVariantNumeric: "tabular-nums", color: "#E2572B" }}>{money(totalPassagers + fraisRotation)}</div>
          </div>
          <div>
            <div className="text-[11.5px]" style={{ color: "#8A8FA3" }}>Bénéfice net</div>
            <div className="text-[13.5px]" style={{ fontVariantNumeric: "tabular-nums", color: benefice >= 0 ? "#148F5B" : "#E2572B" }}>{money(benefice)}</div>
          </div>
        </div>
      </div>

      {pModal && (
        <Modal title={pModal === "new" ? "Nouveau passager" : `Modifier ${pModal.nom}`} onClose={() => setPModal(null)}>
          <PassengerForm
            initial={pModal === "new" ? null : pModal}
            onCancel={() => setPModal(null)}
            onSave={(vals) => {
              if (pModal === "new") onAddPassenger(rotation.id, vals);
              else onEditPassenger(pModal.id, vals);
              setPModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* Vue consolidée : toute la marchandise achetée-revendue, tous voyages confondus */
function MerchandiseOverviewPanel({ rotations, passengers, merchLines }) {
  const [vue, setVue] = useState("rotation");
  const rotationOf = (id) => rotations.find((r) => r.id === id);
  const passengerOf = (id) => passengers.find((p) => p.id === id);

  const revente = merchLines.filter((l) => l.type !== "transport");
  const transport = merchLines.filter((l) => l.type === "transport");

  const ligneBenefice = (l) => {
    const q = Number(l.quantite) || 0;
    return q * ((Number(l.prixVenteUnitaire) || 0) - (Number(l.prixAchatUnitaire) || 0));
  };
  const ligneAchat = (l) => (Number(l.quantite) || 0) * (Number(l.prixAchatUnitaire) || 0);
  const ligneVente = (l) => (Number(l.quantite) || 0) * (Number(l.prixVenteUnitaire) || 0);

  const totalAchat = revente.reduce((s, l) => s + ligneAchat(l), 0);
  const totalVente = revente.reduce((s, l) => s + ligneVente(l), 0);
  const totalTransportRecu = transport.reduce((s, l) => s + ligneBenefice(l), 0);

  const moisLabel = (iso) => {
    if (!iso) return "Sans date";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };
  const anneeLabel = (iso) => (iso ? iso.slice(0, 4) : "Sans date");

  const groupBy = (keyFn, labelFn) => {
    const map = new Map();
    for (const l of merchLines) {
      const r = rotationOf(l.rotationId);
      const key = keyFn(r ? r.dateDepart : null);
      if (!map.has(key)) map.set(key, { key, label: labelFn(r ? r.dateDepart : null), qte: 0, achat: 0, vente: 0 });
      const g = map.get(key);
      g.qte += Number(l.quantite) || 0;
      if (l.type !== "transport") {
        g.achat += ligneAchat(l);
        g.vente += ligneVente(l);
      } else {
        g.vente += ligneBenefice(l);
      }
    }
    return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  };

  const parRotation = rotations
    .map((r) => {
      const lignes = merchLines.filter((l) => l.rotationId === r.id);
      const achat = lignes.filter((l) => l.type !== "transport").reduce((s, l) => s + ligneAchat(l), 0);
      const vente = lignes.filter((l) => l.type !== "transport").reduce((s, l) => s + ligneVente(l), 0);
      const transportRecu = lignes.filter((l) => l.type === "transport").reduce((s, l) => s + ligneBenefice(l), 0);
      const qte = lignes.reduce((s, l) => s + (Number(l.quantite) || 0), 0);
      return { key: r.id, label: r.label, periode: [r.dateDepart, r.dateRetour].filter(Boolean).join(" → "), qte, achat, vente: vente + transportRecu };
    })
    .filter((r) => r.qte > 0);

  const parMois = groupBy((d) => (d ? d.slice(0, 7) : "zzz"), moisLabel);
  const parAnnee = groupBy((d) => (d ? d.slice(0, 4) : "zzz"), anneeLabel);

  const SummaryTable = ({ rows, showPeriode }) => (
    <div className="overflow-x-auto rounded-[12px] mb-6" style={{ border: "1px solid #EAECF5", background: "#FFFFFF" }}>
      <table className="w-full text-[14px]" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F0F1F8", color: "#5B6072" }}>
            <th className="text-left font-medium px-3 py-2">{showPeriode ? "Rotation" : "Période"}</th>
            {showPeriode && <th className="text-left font-medium px-3 py-2 hidden sm:table-cell">Dates</th>}
            <th className="text-right font-medium px-3 py-2">Qté</th>
            <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">Achat</th>
            <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">Vente</th>
            <th className="text-right font-medium px-3 py-2">Bénéfice</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const b = row.vente - row.achat;
            return (
              <tr key={row.key} style={{ borderTop: "1px solid #EAECF5" }}>
                <td className="px-3 py-2" style={{ color: "#14172B" }}>{row.label}</td>
                {showPeriode && <td className="px-3 py-2 hidden sm:table-cell" style={{ color: "#5B6072" }}>{row.periode || "—"}</td>}
                <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: "tabular-nums", color: "#14172B" }}>{row.qte}</td>
                <td className="px-3 py-2 text-right hidden sm:table-cell" style={{ fontVariantNumeric: "tabular-nums", color: "#5B6072" }}>{money(row.achat)}</td>
                <td className="px-3 py-2 text-right hidden sm:table-cell" style={{ fontVariantNumeric: "tabular-nums", color: "#5B6072" }}>{money(row.vente)}</td>
                <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: "tabular-nums", color: b >= 0 ? "#148F5B" : "#E2572B" }}>{money(b)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const Table = ({ rows, showAchat }) => (
    <div className="overflow-x-auto rounded-[12px] mb-6" style={{ border: "1px solid #EAECF5", background: "#FFFFFF" }}>
      <table className="w-full text-[14px]" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F0F1F8", color: "#5B6072" }}>
            <th className="text-left font-medium px-3 py-2">Marchandise</th>
            <th className="text-left font-medium px-3 py-2 hidden sm:table-cell">Rotation / passager</th>
            <th className="text-right font-medium px-3 py-2">Qté</th>
            {showAchat && <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">Achat / u.</th>}
            <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">{showAchat ? "Vente / u." : "Reçu / u."}</th>
            <th className="text-right font-medium px-3 py-2">Bénéfice</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            const r = rotationOf(l.rotationId);
            const p = passengerOf(l.passagerId);
            const b = ligneBenefice(l);
            return (
              <tr key={l.id} style={{ borderTop: "1px solid #EAECF5" }}>
                <td className="px-3 py-2">
                  <div style={{ color: "#14172B" }}>{l.designation}</div>
                  {l.piece && (
                    <a href={l.piece.dataUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11.5px]" style={{ color: "#4C5FD5" }}>
                      <Paperclip size={10} /> {l.piece.name}
                    </a>
                  )}
                </td>
                <td className="px-3 py-2 hidden sm:table-cell" style={{ color: "#5B6072" }}>
                  {r ? r.label : "—"}{p ? ` · ${p.nom}` : ""}
                </td>
                <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: "tabular-nums", color: "#14172B" }}>{l.quantite}</td>
                {showAchat && (
                  <td className="px-3 py-2 text-right hidden sm:table-cell" style={{ fontVariantNumeric: "tabular-nums", color: "#5B6072" }}>
                    {money(l.prixAchatUnitaire)}
                  </td>
                )}
                <td className="px-3 py-2 text-right hidden sm:table-cell" style={{ fontVariantNumeric: "tabular-nums", color: "#5B6072" }}>
                  {money(l.prixVenteUnitaire)}
                </td>
                <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: "tabular-nums", color: b >= 0 ? "#148F5B" : "#E2572B" }}>
                  {money(b)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const VUES = [
    { key: "rotation", label: "Par rotation" },
    { key: "mois", label: "Par mois" },
    { key: "annee", label: "Par année" },
    { key: "detail", label: "Détail" },
  ];

  return (
    <div>
      <p className="text-[13.5px] mb-5" style={{ color: "#8A8FA3" }}>
        Toute la marchandise achetée puis revendue en Algérie, tous voyages confondus. Pour en ajouter, ouvre l'onglet Rotations et va sur la fiche du passager concerné.
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <KpiCard icon={Package} label="Achat total" value={money(totalAchat)} accent="#5B6072" />
        <KpiCard icon={Package} label="Vente totale" value={money(totalVente)} accent="#148F5B" />
        <KpiCard icon={Scale} label="Bénéfice achat-revente" value={money(totalVente - totalAchat)} accent={totalVente - totalAchat >= 0 ? "#148F5B" : "#E2572B"} />
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar p-1 rounded-[12px]" style={{ background: "#EEF0F8", width: "fit-content" }}>
        {VUES.map((v) => (
          <button
            key={v.key}
            onClick={() => setVue(v.key)}
            className="px-3 py-1.5 text-[13px] whitespace-nowrap rounded-[9px] transition-all"
            style={{
              color: vue === v.key ? "#14172B" : "#8A8FA3",
              background: vue === v.key ? "#FFFFFF" : "transparent",
              boxShadow: vue === v.key ? "0 1px 3px rgba(20,23,43,0.08)" : "none",
              fontWeight: vue === v.key ? 600 : 400,
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {vue === "rotation" && (
        parRotation.length === 0 ? <EmptyState text="Aucun inventaire de rotation pour l'instant." /> : <SummaryTable rows={parRotation} showPeriode={true} />
      )}
      {vue === "mois" && (
        parMois.length === 0 ? <EmptyState text="Aucun inventaire mensuel pour l'instant." /> : <SummaryTable rows={parMois} showPeriode={false} />
      )}
      {vue === "annee" && (
        parAnnee.length === 0 ? <EmptyState text="Aucun inventaire annuel pour l'instant." /> : <SummaryTable rows={parAnnee} showPeriode={false} />
      )}
      {vue === "detail" && (
        <>
          <h4 className="text-[13.5px] mb-2" style={{ color: "#5B6072" }}>Achetée puis revendue</h4>
          {revente.length === 0 ? (
            <EmptyState text="Aucune marchandise achat-revente enregistrée pour l'instant." />
          ) : (
            <Table rows={revente} showAchat={true} />
          )}

          {transport.length > 0 && (
            <>
              <h4 className="text-[13.5px] mb-2 flex items-center justify-between" style={{ color: "#5B6072" }}>
                <span>Simplement transportée (rémunérée)</span>
                <span style={{ color: totalTransportRecu >= 0 ? "#148F5B" : "#E2572B", fontVariantNumeric: "tabular-nums" }}>{money(totalTransportRecu)}</span>
              </h4>
              <Table rows={transport} showAchat={false} />
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fournisseurs & agences de voyage                                   */
/* ------------------------------------------------------------------ */

function FournisseurForm({ initial, onCancel, onSave }) {
  const { t } = useLang();
  const [f, setF] = useState(
    initial || { nom: "", type: "Agence de voyage", telephone: "", notes: "", soldeInitial: "", soldeInitialSens: "je_dois" }
  );
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.nom.trim()) return;
        onSave({ ...f, soldeInitial: Number(f.soldeInitial) || 0 });
      }}
    >
      <Field label="Nom">
        <input className={inputCls} style={inputStyle} value={f.nom} onChange={set("nom")} placeholder="ex. SIDALI VOYAGE" autoFocus />
      </Field>
      <Field label="Type">
        <input className={inputCls} style={inputStyle} value={f.type} onChange={set("type")} placeholder="Agence de voyage, fournisseur marchandise…" />
      </Field>
      <Field label="Téléphone">
        <input className={inputCls} style={inputStyle} value={f.telephone} onChange={set("telephone")} />
      </Field>
      {!initial && (
        <>
          <Field label="Ancien solde (avant d'utiliser l'application)">
            <input type="number" min="0" className={inputCls} style={inputStyle} value={f.soldeInitial} onChange={set("soldeInitial")} placeholder="0" />
          </Field>
          <Field label="Ce solde de départ veut dire...">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setF({ ...f, soldeInitialSens: "je_dois" })}
                className="flex-1 px-2.5 py-1.5 rounded-[8px] text-[13.5px]"
                style={{
                  border: "1px solid " + (f.soldeInitialSens === "je_dois" ? "#E2572B" : "#E4E7F2"),
                  background: f.soldeInitialSens === "je_dois" ? "#FDE3D8" : "#FFFFFF",
                  color: f.soldeInitialSens === "je_dois" ? "#E2572B" : "#5B6072",
                }}
              >
                Je leur dois
              </button>
              <button
                type="button"
                onClick={() => setF({ ...f, soldeInitialSens: "ils_doivent" })}
                className="flex-1 px-2.5 py-1.5 rounded-[8px] text-[13.5px]"
                style={{
                  border: "1px solid " + (f.soldeInitialSens === "ils_doivent" ? "#148F5B" : "#E4E7F2"),
                  background: f.soldeInitialSens === "ils_doivent" ? "#DCF5EA" : "#FFFFFF",
                  color: f.soldeInitialSens === "ils_doivent" ? "#148F5B" : "#5B6072",
                }}
              >
                Ils me doivent
              </button>
            </div>
          </Field>
        </>
      )}
      <Field label="Notes">
        <input className={inputCls} style={inputStyle} value={f.notes} onChange={set("notes")} />
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[14px] rounded-[8px]" style={{ color: "#5B6072" }}>
          {t("cancel")}
        </button>
        <button type="submit" className="px-3.5 py-1.5 text-[14px] rounded-[8px] text-white" style={{ background: "#14172B" }}>
          {t("save")}
        </button>
      </div>
    </form>
  );
}

function VersementForm({ initial, soldeActuel, onCancel, onSave }) {
  const { t } = useLang();
  const [f, setF] = useState(
    initial || { sens: "facture", montant: "", date: new Date().toISOString().slice(0, 10), note: "" }
  );
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const montantNum = Number(f.montant) || 0;
  const soldeApres = f.sens === "facture" ? soldeActuel + montantNum : soldeActuel - montantNum;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.montant) return;
        onSave({ ...f, montant: Number(f.montant) });
      }}
    >
      <p className="text-[13px] mb-3" style={{ color: "#8A8FA3" }}>
        Reste actuel : <span style={{ color: soldeActuel > 0 ? "#E2572B" : soldeActuel < 0 ? "#148F5B" : "#5B6072", fontVariantNumeric: "tabular-nums" }}>
          {soldeActuel >= 0 ? money(soldeActuel) : `${money(Math.abs(soldeActuel))} (ils me doivent)`}
        </span>
      </p>
      <Field label="Type de mouvement">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setF({ ...f, sens: "facture" })}
            className="flex-1 px-2.5 py-1.5 rounded-[8px] text-[13.5px]"
            style={{
              border: "1px solid " + (f.sens === "facture" ? "#E2572B" : "#E4E7F2"),
              background: f.sens === "facture" ? "#FDE3D8" : "#FFFFFF",
              color: f.sens === "facture" ? "#E2572B" : "#5B6072",
            }}
          >
            Facture reçue (je dois)
          </button>
          <button
            type="button"
            onClick={() => setF({ ...f, sens: "versement" })}
            className="flex-1 px-2.5 py-1.5 rounded-[8px] text-[13.5px]"
            style={{
              border: "1px solid " + (f.sens === "versement" ? "#148F5B" : "#E4E7F2"),
              background: f.sens === "versement" ? "#DCF5EA" : "#FFFFFF",
              color: f.sens === "versement" ? "#148F5B" : "#5B6072",
            }}
          >
            Versement effectué (je paie)
          </button>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" className={inputCls} style={inputStyle} value={f.date} onChange={set("date")} />
        </Field>
        <Field label="Montant (DA)">
          <input type="number" min="0" className={inputCls} style={inputStyle} value={f.montant} onChange={set("montant")} autoFocus />
        </Field>
      </div>
      {montantNum > 0 && (
        <p className="text-[13px] mb-3" style={{ color: soldeApres > 0 ? "#E2572B" : soldeApres < 0 ? "#148F5B" : "#5B6072" }}>
          Reste après ce mouvement : {soldeApres >= 0 ? money(soldeApres) : `${money(Math.abs(soldeApres))} (ils me doivent)`}
        </p>
      )}
      <Field label="Note">
        <input className={inputCls} style={inputStyle} value={f.note} onChange={set("note")} placeholder="ex. billets Youcef + Salim" />
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[14px] rounded-[8px]" style={{ color: "#5B6072" }}>
          {t("cancel")}
        </button>
        <button type="submit" className="px-3.5 py-1.5 text-[14px] rounded-[8px] text-white" style={{ background: "#14172B" }}>
          {t("save")}
        </button>
      </div>
    </form>
  );
}

function FournisseurCard({ fournisseur, versements, onEdit, onDelete, onAddVersement, onDeleteVersement }) {
  const [vModal, setVModal] = useState(false);
  const soldeInitialSigne = fournisseur.soldeInitialSens === "ils_doivent" ? -(Number(fournisseur.soldeInitial) || 0) : (Number(fournisseur.soldeInitial) || 0);
  const totalFacture = versements.filter((v) => v.sens === "facture").reduce((s, v) => s + (Number(v.montant) || 0), 0);
  const totalVerse = versements.filter((v) => v.sens === "versement").reduce((s, v) => s + (Number(v.montant) || 0), 0);
  const solde = soldeInitialSigne + totalFacture - totalVerse; // positif = je dois encore ; négatif = ils me doivent (trop versé)

  return (
    <div className="mb-6 rounded-[12px] overflow-hidden" style={{ border: "1px solid #EAECF5", background: "#FFFFFF" }}>
      <div className="flex items-start justify-between px-4 py-3" style={{ borderBottom: "1px solid #EAECF5", background: "#F7F8FC" }}>
        <div>
          <div className="text-[15.5px]" style={{ fontFamily: "'Sora', sans-serif", color: "#14172B" }}>{fournisseur.nom}</div>
          <div className="text-[12.5px]" style={{ color: "#8A8FA3" }}>
            {fournisseur.type}{fournisseur.telephone ? ` · ${fournisseur.telephone}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[12px]" style={{ color: "#8A8FA3" }}>{solde >= 0 ? "Reste à payer" : "Ils me doivent"}</div>
            <div className="text-[16px]" style={{ fontVariantNumeric: "tabular-nums", color: solde > 0 ? "#E2572B" : solde < 0 ? "#148F5B" : "#5B6072" }}>
              {money(Math.abs(solde))}
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onEdit(fournisseur)} className="p-1.5 rounded hover:bg-black/5" aria-label="Modifier">
              <Pencil size={14} color="#5B6072" />
            </button>
            <button onClick={() => onDelete(fournisseur.id)} className="p-1.5 rounded hover:bg-black/5" aria-label="Supprimer">
              <Trash2 size={14} color="#E2572B" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        {versements.length === 0 ? (
          <p className="text-[13.5px] mb-3" style={{ color: "#8A8FA3" }}>Aucun mouvement enregistré.</p>
        ) : (
          <div className="overflow-x-auto rounded-[8px] mb-3" style={{ border: "1px solid #EAECF5", background: "#FFFFFF" }}>
            <table className="w-full text-[14px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F0F1F8", color: "#5B6072" }}>
                  <th className="text-left font-medium px-3 py-2">Date</th>
                  <th className="text-left font-medium px-3 py-2">Détail</th>
                  <th className="text-right font-medium px-3 py-2">Montant</th>
                  <th className="text-right font-medium px-3 py-2">Reste</th>
                  <th className="text-right font-medium px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const chrono = [...versements].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
                  let running = soldeInitialSigne;
                  const withReste = chrono.map((v) => {
                    running += v.sens === "facture" ? Number(v.montant) || 0 : -(Number(v.montant) || 0);
                    return { ...v, resteApres: running };
                  });
                  return withReste
                    .slice()
                    .reverse()
                    .map((v) => (
                      <tr key={v.id} style={{ borderTop: "1px solid #EAECF5" }}>
                        <td className="px-3 py-2" style={{ color: "#5B6072" }}>{v.date}</td>
                        <td className="px-3 py-2" style={{ color: "#14172B" }}>
                          {v.sens === "facture" ? "Facture" : "Versement"}{v.note ? ` · ${v.note}` : ""}
                        </td>
                        <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: "tabular-nums", color: v.sens === "facture" ? "#E2572B" : "#148F5B" }}>
                          {v.sens === "facture" ? "+" : "−"}{money(v.montant)}
                        </td>
                        <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: "tabular-nums", color: v.resteApres > 0 ? "#E2572B" : v.resteApres < 0 ? "#148F5B" : "#5B6072" }}>
                          {money(Math.abs(v.resteApres))}{v.resteApres < 0 ? " (ils me doivent)" : ""}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => onDeleteVersement(v.id)} className="p-1.5 rounded hover:bg-black/5" aria-label="Supprimer">
                            <Trash2 size={13} color="#E2572B" />
                          </button>
                        </td>
                      </tr>
                    ));
                })()}
              </tbody>
            </table>
          </div>
        )}
        <button
          onClick={() => setVModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13.5px]"
          style={{ color: "#14172B", border: "1px solid #E4E7F2" }}
        >
          <Plus size={14} /> Ajouter un mouvement
        </button>
      </div>

      {vModal && (
        <Modal title={`Nouveau mouvement — ${fournisseur.nom}`} onClose={() => setVModal(false)}>
          <VersementForm
            soldeActuel={solde}
            onCancel={() => setVModal(false)}
            onSave={(vals) => {
              onAddVersement(fournisseur.id, vals);
              setVModal(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function FournisseursPanel({ fournisseurs, versements, onAdd, onEdit, onDelete, onAddVersement, onDeleteVersement }) {
  const [modal, setModal] = useState(null);
  const totalDu = fournisseurs.reduce((s, f) => {
    const soldeInitialSigne = f.soldeInitialSens === "ils_doivent" ? -(Number(f.soldeInitial) || 0) : (Number(f.soldeInitial) || 0);
    const vs = versements.filter((v) => v.fournisseurId === f.id);
    const solde = soldeInitialSigne
      + vs.filter((v) => v.sens === "facture").reduce((s2, v) => s2 + (Number(v.montant) || 0), 0)
      - vs.filter((v) => v.sens === "versement").reduce((s2, v) => s2 + (Number(v.montant) || 0), 0);
    return s + Math.max(0, solde);
  }, 0);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <KpiCard icon={Receipt} label="Reste à payer (tous fournisseurs)" value={money(totalDu)} accent={totalDu > 0 ? "#E2572B" : "#148F5B"} sub={`${fournisseurs.length} fournisseur${fournisseurs.length > 1 ? "s" : ""}`} />
      </div>

      <div className="flex justify-between items-center mb-5">
        <p className="text-[13.5px]" style={{ color: "#8A8FA3" }}>Agences de voyage et fournisseurs</p>
        <button
          onClick={() => setModal("new")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-white text-[14px]"
          style={{ background: "#14172B" }}
        >
          <Plus size={15} /> Ajouter un fournisseur
        </button>
      </div>

      {fournisseurs.length === 0 ? (
        <EmptyState text="Ajoute une agence ou un fournisseur pour suivre les factures et les versements." />
      ) : (
        fournisseurs.map((f) => (
          <FournisseurCard
            key={f.id}
            fournisseur={f}
            versements={versements.filter((v) => v.fournisseurId === f.id)}
            onEdit={setModal}
            onDelete={onDelete}
            onAddVersement={onAddVersement}
            onDeleteVersement={onDeleteVersement}
          />
        ))
      )}

      {modal && (
        <Modal title={modal === "new" ? "Nouveau fournisseur" : `Modifier ${modal.nom}`} onClose={() => setModal(null)}>
          <FournisseurForm
            initial={modal === "new" ? null : modal}
            onCancel={() => setModal(null)}
            onSave={(vals) => {
              if (modal === "new") onAdd(vals);
              else onEdit(modal.id, vals);
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function RotationsPanel({ rotations, merchLines, passengers, onAddRotation, onEditRotation, onDeleteRotation, onAddLine, onEditLine, onDeleteLine, onAddPassenger, onEditPassenger, onDeletePassenger }) {
  const { t } = useLang();
  const [modal, setModal] = useState(null);

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <p className="text-[13.5px]" style={{ color: "#8A8FA3" }}>
          {rotations.length} rotation{rotations.length > 1 ? "s" : ""} de marchandise
        </p>
        <button
          onClick={() => setModal("new")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-white text-[14px]"
          style={{ background: "#14172B" }}
        >
          <Plus size={15} /> {t("add_rotation")}
        </button>
      </div>

      {rotations.length === 0 ? (
        <EmptyState text={t("empty_rotations")} />
      ) : (
        rotations.map((r) => (
          <RotationCard
            key={r.id}
            rotation={r}
            lines={merchLines.filter((l) => l.rotationId === r.id)}
            passengers={passengers.filter((p) => p.rotationId === r.id)}
            onEditRotation={setModal}
            onDeleteRotation={onDeleteRotation}
            onAddLine={onAddLine}
            onEditLine={onEditLine}
            onDeleteLine={onDeleteLine}
            onAddPassenger={onAddPassenger}
            onEditPassenger={onEditPassenger}
            onDeletePassenger={onDeletePassenger}
          />
        ))
      )}

      {modal && (
        <Modal title={modal === "new" ? "Nouvelle rotation" : `Modifier ${modal.label}`} onClose={() => setModal(null)}>
          <RotationForm
            initial={modal === "new" ? null : modal}
            onCancel={() => setModal(null)}
            onSave={(vals) => {
              if (modal === "new") onAddRotation(vals);
              else onEditRotation(modal.id, vals);
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tableau de bord                                                    */
/* ------------------------------------------------------------------ */

function KpiCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <div
      className="flex-1 min-w-[150px] rounded-[16px] p-4"
      style={{ background: "#FFFFFF", border: "1px solid #EAECF5" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px]" style={{ color: "#8A8FA3" }}>{label}</span>
        <span
          className="flex items-center justify-center rounded-[9px] w-7 h-7"
          style={{ background: accent + "1A" }}
        >
          <Icon size={15} color={accent} />
        </span>
      </div>
      <div
        className="text-[22px] leading-none"
        style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, color: "#14172B", fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </div>
      {sub && <div className="text-[12.5px] mt-1.5" style={{ color: "#8A8FA3" }}>{sub}</div>}
    </div>
  );
}

function CompareBar({ recu, du }) {
  const max = Math.max(recu, du, 1);
  const bar = (val, color) => (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#F0F1F8" }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(3, (val / max) * 100)}%`, background: color }} />
      </div>
      <span className="text-[13px] w-24 text-right shrink-0" style={{ color: "#5B6072", fontVariantNumeric: "tabular-nums" }}>
        {money(val)}
      </span>
    </div>
  );
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[12.5px] mb-1.5" style={{ color: "#8A8FA3" }}>Ils me doivent</div>
        {bar(recu, "#148F5B")}
      </div>
      <div>
        <div className="text-[12.5px] mb-1.5" style={{ color: "#8A8FA3" }}>Je leur dois</div>
        {bar(du, "#E2572B")}
      </div>
    </div>
  );
}

function Dashboard({ debts, payments, billets, rotations, merchLines, passengers }) {
  const { t, lang } = useLang();
  const stats = useMemo(() => {
    const withCalc = debts.map((d) => {
      const paid = computePaid(d.id, payments);
      const reste = isComplete(d) ? Math.max(0, Number(d.montantInitial) - paid) : 0;
      return { ...d, paid, reste, statut: computeStatut(d, paid) };
    });
    const recu = withCalc.filter((d) => d.sens === "recu");
    const du = withCalc.filter((d) => d.sens === "du");
    const sum = (arr, key) => arr.reduce((s, d) => s + (d[key] || 0), 0);
    const activeCount = (arr) => arr.filter((d) => d.reste > 0).length;
    const incomplets = withCalc.filter((d) => d.statut === "incomplet");
    const enRetard = withCalc.filter((d) => d.statut === "retard");

    return {
      recuReste: sum(recu, "reste"),
      duReste: sum(du, "reste"),
      recuActifs: activeCount(recu),
      duActifs: activeCount(du),
      incomplets,
      enRetard,
    };
  }, [debts, payments]);

  const billetStats = useMemo(() => {
    const total = billets.length;
    const coutTotal = billets.reduce((s, b) => s + (Number(b.prix) || 0), 0);
    const payes = billets.filter((b) => b.statut === "paye").length;
    const nonPayes = billets.filter((b) => b.statut === "non_paye").length;
    const aConfirmer = billets.filter((b) => b.statut === "a_confirmer").length;
    const totalPaye = billets.reduce((s, b) => s + (Number(b.montantPaye) || 0), 0);
    return { total, coutTotal, payes, nonPayes, aConfirmer, totalPaye };
  }, [billets]);

  const solde = stats.recuReste - stats.duReste;

  const merchBenefice = useMemo(() => {
    const marge = merchLines.reduce((s, l) => {
      const q = Number(l.quantite) || 0;
      return s + q * ((Number(l.prixVenteUnitaire) || 0) - (Number(l.prixAchatUnitaire) || 0));
    }, 0);
    const coutsPassagers = passengers.reduce(
      (s, p) => s + (Number(p.prixBillet) || 0) + (Number(p.fraisVisa) || 0) + (Number(p.coutTransport) || 0),
      0
    );
    const fraisRotations = rotations.reduce((s, r) => s + (Number(r.fraisRotation) || 0), 0);
    return marge - coutsPassagers - fraisRotations;
  }, [merchLines, passengers, rotations]);

  const passagerBilletStats = useMemo(() => {
    const total = passengers.length;
    const payes = passengers.filter((p) => (p.statutBillet || "a_confirmer") === "paye").length;
    const nonPayes = passengers.filter((p) => (p.statutBillet || "a_confirmer") === "non_paye").length;
    const aConfirmer = passengers.filter((p) => (p.statutBillet || "a_confirmer") === "a_confirmer").length;
    const resteAPayer = passengers.reduce((s, p) => s + ((p.statutBillet || "a_confirmer") !== "paye" ? Number(p.prixBillet) || 0 : 0), 0);
    return { total, payes, nonPayes, aConfirmer, resteAPayer };
  }, [passengers]);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <KpiCard icon={Scale} label={t("kpi_solde")} value={money(solde)} accent="#4C5FD5" />
        <KpiCard icon={ArrowDownLeft} label={t("kpi_recu")} value={money(stats.recuReste)} accent="#148F5B" sub={`${stats.recuActifs} dette${stats.recuActifs > 1 ? "s" : ""} active${stats.recuActifs > 1 ? "s" : ""}`} />
        <KpiCard icon={ArrowUpRight} label={t("kpi_du")} value={money(stats.duReste)} accent="#E2572B" sub={`${stats.duActifs} dette${stats.duActifs > 1 ? "s" : ""} active${stats.duActifs > 1 ? "s" : ""}`} />
        <KpiCard icon={Package} label={t("kpi_merch")} value={money(merchBenefice)} accent={merchBenefice >= 0 ? "#148F5B" : "#E2572B"} sub={`${rotations.length} rotation${rotations.length > 1 ? "s" : ""}`} />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-[16px] p-4" style={{ background: "#FFFFFF", border: "1px solid #EAECF5" }}>
          <h4 className="text-[13.5px] mb-3" style={{ color: "#5B6072" }}>{t("section_repartition")}</h4>
          <CompareBar recu={stats.recuReste} du={stats.duReste} />
        </div>
        <div className="rounded-[16px] p-4" style={{ background: "#FFFFFF", border: "1px solid #EAECF5" }}>
          <h4 className="text-[13.5px] mb-3 flex items-center gap-1.5" style={{ color: "#5B6072" }}>
            <Plane size={14} color="#8A8FA3" /> {t("section_billets")}
          </h4>
          <p className="text-[14.5px]" style={{ color: "#14172B" }}>
            {billetStats.total} billets · {money(billetStats.coutTotal)} de coût total
          </p>
          <p className="text-[13px] mt-1" style={{ color: "#8A8FA3" }}>
            {billetStats.payes} · {billetLabel("paye", lang)} — {billetStats.nonPayes} · {billetLabel("non_paye", lang)} — {billetStats.aConfirmer} · {billetLabel("a_confirmer", lang)}
            {billetStats.totalPaye > 0 ? ` · ${money(billetStats.totalPaye)} déjà versés` : ""}
          </p>
        </div>
        <div className="rounded-[16px] p-4" style={{ background: "#FFFFFF", border: "1px solid #EAECF5" }}>
          <h4 className="text-[13.5px] mb-3 flex items-center gap-1.5" style={{ color: "#5B6072" }}>
            <Ship size={14} color="#8A8FA3" /> {t("section_billets_passagers")}
          </h4>
          <p className="text-[14.5px]" style={{ color: "#14172B" }}>
            {passagerBilletStats.total} passager{passagerBilletStats.total > 1 ? "s" : ""} suivi{passagerBilletStats.total > 1 ? "s" : ""}
          </p>
          <p className="text-[13px] mt-1" style={{ color: "#8A8FA3" }}>
            {passagerBilletStats.payes} · {billetLabel("paye", lang)} — {passagerBilletStats.nonPayes} · {billetLabel("non_paye", lang)} — {passagerBilletStats.aConfirmer} · {billetLabel("a_confirmer", lang)}
            {passagerBilletStats.resteAPayer > 0 ? ` · ${money(passagerBilletStats.resteAPayer)} restant à payer` : ""}
          </p>
        </div>
      </div>

      {(stats.incomplets.length > 0 || stats.enRetard.length > 0) && (
        <div className="rounded-[16px] p-4" style={{ background: "#FFFFFF", border: "1px solid #EAECF5" }}>
          <h4 className="text-[13.5px] mb-3 flex items-center gap-1.5" style={{ color: "#5B6072" }}>
            <AlertTriangle size={14} color="#E2572B" /> {t("section_surveiller")}
          </h4>
          <ul className="space-y-2.5">
            {stats.enRetard.map((d) => (
              <li key={d.id} className="text-[14px] flex flex-wrap items-center gap-2" style={{ color: "#14172B" }}>
                <StatusPill style={STATUT_STYLE.retard}>{statutLabel("retard", lang)}</StatusPill>
                {d.nom} — échéance dépassée, reste {money(d.reste)}
              </li>
            ))}
            {stats.incomplets.map((d) => (
              <li key={d.id} className="text-[14px] flex flex-wrap items-center gap-2" style={{ color: "#14172B" }}>
                <StatusPill style={STATUT_STYLE.incomplet}>{statutLabel("incomplet", lang)}</StatusPill>
                {d.id} — nom et montant manquants ({d.sens === "recu" ? t("tab_recu") : t("tab_du")})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Base de données (sauvegarde / restauration complète)               */
/* ------------------------------------------------------------------ */

function DatabasePanel({ data, onImport }) {
  const { t } = useLang();
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null); // parsed backup awaiting confirmation
  const [message, setMessage] = useState(null);

  const counts = [
    { label: "Dettes (Ils me doivent / Je leur dois)", n: data.debts.length, icon: Scale },
    { label: "Paiements", n: data.payments.length, icon: Receipt },
    { label: "Billets d'avion", n: data.billets.length, icon: Plane },
    { label: "Rotations", n: data.rotations.length, icon: Ship },
    { label: "Passagers", n: data.passengers.length, icon: Users },
    { label: "Lignes de marchandise", n: data.merchLines.length, icon: Package },
    { label: "Fournisseurs", n: data.fournisseurs.length, icon: Receipt },
    { label: "Mouvements fournisseurs", n: data.versements.length, icon: Receipt },
  ];
  const totalRecords = counts.reduce((s, c) => s + c.n, 0);

  const handleExport = () => {
    const backup = {
      app: "Registre CABA",
      version: 1,
      exportedAt: new Date().toISOString(),
      debts: data.debts,
      payments: data.payments,
      billets: data.billets,
      rotations: data.rotations,
      merchLines: data.merchLines,
      passengers: data.passengers,
      fournisseurs: data.fournisseurs,
      versements: data.versements,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `registre-caba-sauvegarde-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage({ type: "ok", text: "Sauvegarde téléchargée." });
  };

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== "object") throw new Error("format invalide");
        setPending(parsed);
        setMessage(null);
      } catch (err) {
        setMessage({ type: "error", text: "Ce fichier n'est pas une sauvegarde valide." });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmImport = () => {
    onImport(pending);
    setPending(null);
    setMessage({ type: "ok", text: "Sauvegarde restaurée." });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <KpiCard icon={Database} label="Total des enregistrements" value={String(totalRecords)} accent="#4C5FD5" />
      </div>

      <div className="rounded-[16px] p-4 mb-6" style={{ background: "#FFFFFF", border: "1px solid #EAECF5" }}>
        <h4 className="text-[13.5px] mb-3" style={{ color: "#5B6072" }}>Contenu actuel</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {counts.map((c) => (
            <div key={c.label}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <c.icon size={13} color="#8A8FA3" />
                <span className="text-[11.5px]" style={{ color: "#8A8FA3" }}>{c.label}</span>
              </div>
              <div className="text-[16px]" style={{ fontVariantNumeric: "tabular-nums", color: "#14172B" }}>{c.n}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[16px] p-4 mb-4" style={{ background: "#FFFFFF", border: "1px solid #EAECF5" }}>
        <h4 className="text-[13.5px] mb-1 flex items-center gap-1.5" style={{ color: "#5B6072" }}>
          <Download size={14} color="#8A8FA3" /> Exporter
        </h4>
        <p className="text-[13px] mb-3" style={{ color: "#8A8FA3" }}>
          Télécharge toutes les données de l'application (dettes, paiements, billets, rotations, marchandise, fournisseurs) dans un seul fichier.
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-white text-[14px]"
          style={{ background: "#14172B" }}
        >
          <Download size={15} /> Télécharger la sauvegarde
        </button>
      </div>

      <div className="rounded-[16px] p-4" style={{ background: "#FFFFFF", border: "1px solid #EAECF5" }}>
        <h4 className="text-[13.5px] mb-1 flex items-center gap-1.5" style={{ color: "#5B6072" }}>
          <Upload size={14} color="#8A8FA3" /> Importer
        </h4>
        <p className="text-[13px] mb-3" style={{ color: "#8A8FA3" }}>
          Restaure un fichier de sauvegarde. Cela remplacera toutes les données actuelles de l'application.
        </p>
        <input ref={fileRef} type="file" accept="application/json" onChange={onFile} className="hidden" />
        <button
          onClick={() => fileRef.current && fileRef.current.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[14px]"
          style={{ border: "1px solid #E4E7F2", color: "#5B6072" }}
        >
          <Upload size={15} /> Choisir un fichier
        </button>
      </div>

      {message && (
        <p className="text-[13px] mt-4" style={{ color: message.type === "error" ? "#E2572B" : "#148F5B" }}>
          {message.text}
        </p>
      )}

      {pending && (
        <Modal title="Confirmer la restauration" onClose={() => setPending(null)}>
          <p className="text-[14px] mb-4" style={{ color: "#14172B" }}>
            Cette sauvegarde{pending.exportedAt ? ` du ${new Date(pending.exportedAt).toLocaleDateString("fr-FR")}` : ""} va remplacer toutes les données actuelles de l'application. Cette action ne peut pas être annulée.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPending(null)} className="px-3 py-1.5 text-[14px] rounded-[8px]" style={{ color: "#5B6072" }}>
              {t("cancel")}
            </button>
            <button onClick={confirmImport} className="px-3.5 py-1.5 text-[14px] rounded-[8px] text-white" style={{ background: "#E2572B" }}>
              Remplacer les données
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App principale                                                     */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: "dashboard", labelKey: "tab_dashboard", icon: LayoutDashboard },
  { key: "recu", labelKey: "tab_recu", icon: ArrowDownLeft },
  { key: "du", labelKey: "tab_du", icon: ArrowUpRight },
  { key: "paiements", labelKey: "tab_paiements", icon: Receipt },
  { key: "billets", labelKey: "tab_billets", icon: Plane },
  { key: "rotations", labelKey: "tab_rotations", icon: Ship },
  { key: "marchandise", labelKey: "tab_marchandise", icon: Package },
  { key: "fournisseurs", labelKey: "tab_fournisseurs", icon: Receipt },
  { key: "database", labelKey: "tab_database", icon: Database },
];

function MainApp({ onLogout, currentUserName }) {
  const [loading, setLoading] = useState(true);
  const [syncWarning, setSyncWarning] = useState(null);
  const [debts, setDebts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [billets, setBillets] = useState([]);
  const [rotations, setRotations] = useState([]);
  const [merchLines, setMerchLines] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [versements, setVersements] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [lang, setLang] = useState("fr");

  useEffect(() => {
    (async () => {
      const [d, p, b, r, m, pax, savedLang, fourn, vers] = await Promise.all([
        loadKey("debts", SEED_DEBTS),
        loadKey("payments", SEED_PAYMENTS),
        loadKey("billets", SEED_BILLETS),
        loadKey("rotations", SEED_ROTATIONS),
        loadKey("merchLines", SEED_MERCH),
        loadKey("passengers", SEED_PASSENGERS),
        loadKey("lang", "fr"),
        loadKey("fournisseurs", SEED_FOURNISSEURS),
        loadKey("versements", SEED_VERSEMENTS),
      ]);
      setDebts(d);
      setPayments(p);
      setBillets(b);
      setRotations(r);
      setMerchLines(m);
      setPassengers(pax);
      setLang(savedLang);
      setFournisseurs(fourn);
      setVersements(vers);
      setLoading(false);
    })();
  }, []);

  /* Synchronisation en direct : ce que l'autre téléphone enregistre
     apparaît ici automatiquement, sans recharger la page. */
  useEffect(() => {
    const unsubs = [
      subscribeKey("debts", SEED_DEBTS, setDebts),
      subscribeKey("payments", SEED_PAYMENTS, setPayments),
      subscribeKey("billets", SEED_BILLETS, setBillets),
      subscribeKey("rotations", SEED_ROTATIONS, setRotations),
      subscribeKey("merchLines", SEED_MERCH, setMerchLines),
      subscribeKey("passengers", SEED_PASSENGERS, setPassengers),
      subscribeKey("fournisseurs", SEED_FOURNISSEURS, setFournisseurs),
      subscribeKey("versements", SEED_VERSEMENTS, setVersements),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const changeLang = (next) => { setLang(next); saveKey("lang", next); };

  /* Persiste un tableau (Firestore, avec secours localStorage) et signale
     l'échec à l'écran plutôt que de perdre les données en silence. */
  const persistFactory = (setter, key, label) => (next) => {
    setter(next);
    saveKey(key, next).then((ok) => {
      if (!ok) setSyncWarning(`La sauvegarde de « ${label} » a échoué — les données restent affichées sur ce téléphone mais pas confirmées en ligne. Réessaie dans un instant.`);
    });
  };
  const persistDebts = useCallback(persistFactory(setDebts, "debts", "Dettes"), []);
  const persistPayments = useCallback(persistFactory(setPayments, "payments", "Paiements"), []);
  const persistBillets = useCallback(persistFactory(setBillets, "billets", "Billets"), []);
  const persistRotations = useCallback(persistFactory(setRotations, "rotations", "Rotations"), []);
  const persistMerchLines = useCallback(persistFactory(setMerchLines, "merchLines", "Marchandise"), []);
  const persistPassengers = useCallback(persistFactory(setPassengers, "passengers", "Passagers"), []);
  const persistFournisseurs = useCallback(persistFactory(setFournisseurs, "fournisseurs", "Fournisseurs"), []);
  const persistVersements = useCallback(persistFactory(setVersements, "versements", "Mouvements fournisseurs"), []);

  const addFournisseur = (vals) => persistFournisseurs([...fournisseurs, { ...vals, id: nextId(fournisseurs, "F") }]);
  const editFournisseur = (id, vals) => persistFournisseurs(fournisseurs.map((f) => (f.id === id ? { ...f, ...vals } : f)));
  const deleteFournisseur = (id) => {
    persistFournisseurs(fournisseurs.filter((f) => f.id !== id));
    persistVersements(versements.filter((v) => v.fournisseurId !== id));
  };
  const addVersement = (fournisseurId, vals) => persistVersements([...versements, { ...vals, id: nextId(versements, "V"), fournisseurId }]);
  const deleteVersement = (id) => persistVersements(versements.filter((v) => v.id !== id));

  const importAll = (backup) => {
    persistDebts(Array.isArray(backup.debts) ? backup.debts : debts);
    persistPayments(Array.isArray(backup.payments) ? backup.payments : payments);
    persistBillets(Array.isArray(backup.billets) ? backup.billets : billets);
    persistRotations(Array.isArray(backup.rotations) ? backup.rotations : rotations);
    persistMerchLines(Array.isArray(backup.merchLines) ? backup.merchLines : merchLines);
    persistPassengers(Array.isArray(backup.passengers) ? backup.passengers : passengers);
    persistFournisseurs(Array.isArray(backup.fournisseurs) ? backup.fournisseurs : fournisseurs);
    persistVersements(Array.isArray(backup.versements) ? backup.versements : versements);
  };

  const addDebt = (vals) => persistDebts([...debts, { ...vals, id: nextId(debts, "D") }]);
  const editDebt = (id, vals) => persistDebts(debts.map((d) => (d.id === id ? { ...d, ...vals } : d)));
  const deleteDebt = (id) => {
    persistDebts(debts.filter((d) => d.id !== id));
    persistPayments(payments.filter((p) => p.detteId !== id));
  };

  const addPayment = (vals) => persistPayments([...payments, { ...vals, id: nextId(payments, "P") }]);
  const deletePayment = (id) => persistPayments(payments.filter((p) => p.id !== id));

  const addBillet = (vals) => persistBillets([...billets, { ...vals, id: nextId(billets, "B") }]);
  const editBillet = (id, vals) => persistBillets(billets.map((b) => (b.id === id ? { ...b, ...vals } : b)));
  const deleteBillet = (id) => persistBillets(billets.filter((b) => b.id !== id));

  const addRotation = (vals) => persistRotations([...rotations, { ...vals, id: nextId(rotations, "R") }]);
  const editRotation = (id, vals) => persistRotations(rotations.map((r) => (r.id === id ? { ...r, ...vals } : r)));
  const deleteRotation = (id) => {
    persistRotations(rotations.filter((r) => r.id !== id));
    persistMerchLines(merchLines.filter((l) => l.rotationId !== id));
    persistPassengers(passengers.filter((p) => p.rotationId !== id));
  };
  const addMerchLine = (passagerId, vals) => {
    const owner = passengers.find((p) => p.id === passagerId);
    persistMerchLines([...merchLines, { ...vals, id: nextId(merchLines, "M"), passagerId, rotationId: owner ? owner.rotationId : null }]);
  };
  const editMerchLine = (id, vals) => persistMerchLines(merchLines.map((l) => (l.id === id ? { ...l, ...vals } : l)));
  const deleteMerchLine = (id) => persistMerchLines(merchLines.filter((l) => l.id !== id));

  const addPassenger = (rotationId, vals) =>
    persistPassengers([...passengers, { ...vals, code: "P" + String(passengers.length + 1).padStart(2, "0"), id: nextId(passengers, "PX"), rotationId }]);
  const editPassenger = (id, vals) => persistPassengers(passengers.map((p) => (p.id === id ? { ...p, ...vals } : p)));
  const deletePassenger = (id) => {
    persistPassengers(passengers.filter((p) => p.id !== id));
    persistMerchLines(merchLines.filter((l) => l.passagerId !== id));
  };

  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = (k) => (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.fr[k] || k;
  const fontFamily = lang === "ar" ? "'Cairo', sans-serif" : "'Inter', ui-sans-serif, system-ui, sans-serif";
  const displayFont = lang === "ar" ? "'Cairo', sans-serif" : "'Sora', sans-serif";

  return (
    <LangContext.Provider value={{ lang, dir, t }}>
    <div
      dir={dir}
      className="min-h-screen w-full"
      style={{ background: "#F6F7FB", fontFamily }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600&family=Cairo:wght@400;500;600;700&display=swap');
      `}</style>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] leading-tight" style={{ fontFamily: displayFont, fontWeight: 700, color: "#14172B" }}>
              {t("appTitle")}
            </h1>
            <p className="text-[13.5px] mt-0.5" style={{ color: "#8A8FA3" }}>
              {t("appSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex p-0.5 rounded-[10px]" style={{ background: "#EEF0F8" }}>
              <button
                onClick={() => changeLang("fr")}
                className="px-2.5 py-1 text-[12.5px] rounded-[8px]"
                style={{
                  color: lang === "fr" ? "#14172B" : "#8A8FA3",
                  background: lang === "fr" ? "#FFFFFF" : "transparent",
                  fontWeight: lang === "fr" ? 600 : 400,
                }}
              >
                FR
              </button>
              <button
                onClick={() => changeLang("ar")}
                className="px-2.5 py-1 text-[12.5px] rounded-[8px]"
                style={{
                  color: lang === "ar" ? "#14172B" : "#8A8FA3",
                  background: lang === "ar" ? "#FFFFFF" : "transparent",
                  fontWeight: lang === "ar" ? 600 : 400,
                  fontFamily: "'Cairo', sans-serif",
                }}
              >
                عربي
              </button>
            </div>
            <span
              className="flex items-center justify-center rounded-[12px] w-10 h-10 shrink-0"
              style={{ background: "#4C5FD5" }}
            >
              <Scale size={18} color="#FFFFFF" />
            </span>
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-[12px] px-2 py-1 rounded-[8px] shrink-0"
                style={{ color: "#8A8FA3", border: "1px solid #E4E7F2" }}
                title={currentUserName ? `Connecté·e : ${currentUserName} — se déconnecter` : "Se déconnecter"}
              >
                ⏻
              </button>
            )}
          </div>
        </header>

        {syncWarning && (
          <div
            className="flex items-start gap-2 rounded-[12px] p-3 mb-4 text-[13px]"
            style={{ background: "#FCEFCB", border: "1px solid #F0D89A", color: "#8A6414" }}
          >
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span className="flex-1">{syncWarning}</span>
            <button onClick={() => setSyncWarning(null)} className="shrink-0" style={{ color: "#8A6414" }}>
              <X size={15} />
            </button>
          </div>
        )}

        <nav className="flex gap-1.5 mb-5 overflow-x-auto no-scrollbar p-1 rounded-[14px]" style={{ background: "#EEF0F8" }}>
          {TABS.map((tabItem) => {
            const active = tab === tabItem.key;
            const Icon = tabItem.icon;
            return (
              <button
                key={tabItem.key}
                onClick={() => setTab(tabItem.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13.5px] whitespace-nowrap rounded-[10px] transition-all"
                style={{
                  color: active ? "#14172B" : "#8A8FA3",
                  background: active ? "#FFFFFF" : "transparent",
                  boxShadow: active ? "0 1px 3px rgba(20,23,43,0.08)" : "none",
                  fontWeight: active ? 600 : 400,
                }}
              >
                <Icon size={14} color={active ? "#4C5FD5" : "#8A8FA3"} />
                {t(tabItem.labelKey)}
              </button>
            );
          })}
        </nav>

        <main
          className="rounded-[16px] p-4 sm:p-6"
          style={{ background: "#F6F7FB", minHeight: "320px" }}
        >
          {loading ? (
            <p className="text-[14px]" style={{ color: "#8A8FA3" }}>{t("loading")}</p>
          ) : tab === "dashboard" ? (
            <Dashboard debts={debts} payments={payments} billets={billets} rotations={rotations} merchLines={merchLines} passengers={passengers} />
          ) : tab === "recu" ? (
            <DebtsPanel sens="recu" debts={debts} payments={payments} onAdd={addDebt} onEdit={editDebt} onDelete={deleteDebt} />
          ) : tab === "du" ? (
            <DebtsPanel sens="du" debts={debts} payments={payments} onAdd={addDebt} onEdit={editDebt} onDelete={deleteDebt} />
          ) : tab === "paiements" ? (
            <PaymentsPanel debts={debts} payments={payments} onAdd={addPayment} onDelete={deletePayment} />
          ) : tab === "billets" ? (
            <BilletsPanel billets={billets} onAdd={addBillet} onEdit={editBillet} onDelete={deleteBillet} />
          ) : tab === "rotations" ? (
            <RotationsPanel
              rotations={rotations}
              merchLines={merchLines}
              passengers={passengers}
              onAddRotation={addRotation}
              onEditRotation={editRotation}
              onDeleteRotation={deleteRotation}
              onAddLine={addMerchLine}
              onEditLine={editMerchLine}
              onDeleteLine={deleteMerchLine}
              onAddPassenger={addPassenger}
              onEditPassenger={editPassenger}
              onDeletePassenger={deletePassenger}
            />
          ) : tab === "marchandise" ? (
            <MerchandiseOverviewPanel rotations={rotations} passengers={passengers} merchLines={merchLines} />
          ) : tab === "fournisseurs" ? (
            <FournisseursPanel
              fournisseurs={fournisseurs}
              versements={versements}
              onAdd={addFournisseur}
              onEdit={editFournisseur}
              onDelete={deleteFournisseur}
              onAddVersement={addVersement}
              onDeleteVersement={deleteVersement}
            />
          ) : (
            <DatabasePanel
              data={{ debts, payments, billets, rotations, merchLines, passengers, fournisseurs, versements }}
              onImport={importAll}
            />
          )}
        </main>

        <p className="text-[12.5px] text-center mt-6" style={{ color: "#A0A4B8" }}>
          {t("footer")}
        </p>
      </div>
    </div>
    </LangContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Connexion (Firebase Authentication)                                */
/* ------------------------------------------------------------------ */

const authInputCls = "w-full px-3 py-2 rounded-[10px] text-[14.5px] outline-none";
const authInputStyle = { border: "1px solid #E4E7F2", background: "#FFFFFF", color: "#14172B" };

function AuthGate() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auth) { setChecking(false); return; }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), motDePasse);
    } catch (err) {
      setError("Email ou mot de passe incorrect.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    if (auth) signOut(auth);
  };

  if (checking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#F6F7FB" }}>
        <p style={{ color: "#8A8FA3", fontFamily: "'Inter', sans-serif" }}>Chargement…</p>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: "#F6F7FB" }}>
        <p style={{ color: "#8A8FA3", fontFamily: "'Inter', sans-serif", textAlign: "center" }}>
          Configuration Firebase manquante — impossible de se connecter.
        </p>
      </div>
    );
  }

  if (user) {
    return <MainApp onLogout={handleLogout} currentUserName={user.email} />;
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{ background: "#F6F7FB", fontFamily: "'Inter', sans-serif" }}
    >
      <div className="w-full max-w-[360px] rounded-[16px] p-6" style={{ background: "#FFFFFF", border: "1px solid #EAECF5" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center justify-center rounded-[12px] w-9 h-9" style={{ background: "#4C5FD5" }}>
            <Scale size={17} color="#FFFFFF" />
          </span>
          <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 17, color: "#14172B" }}>Registre CABA</span>
        </div>
        <p className="text-[13px] mb-5" style={{ color: "#8A8FA3" }}>
          Connexion à l'application.
        </p>

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="block text-[12.5px] mb-1" style={{ color: "#5B6072" }}>Email</label>
            <input
              type="email"
              className={authInputCls}
              style={authInputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoFocus
            />
          </div>
          <div className="mb-3">
            <label className="block text-[12.5px] mb-1" style={{ color: "#5B6072" }}>Mot de passe</label>
            <input
              type="password"
              className={authInputCls}
              style={authInputStyle}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </div>
          {error && <p className="text-[13px] mb-3" style={{ color: "#E2572B" }}>{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 rounded-[10px] text-white text-[14.5px] mt-1 disabled:opacity-50"
            style={{ background: "#14172B" }}
          >
            {submitting ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="text-[11.5px] text-center mt-4" style={{ color: "#A0A4B8" }}>
          Les comptes se créent depuis la console Firebase (Authentication → Users).
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return <AuthGate />;
}

