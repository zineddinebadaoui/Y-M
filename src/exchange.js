import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, setDoc,
  onSnapshot, query, where, limit, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase.js";

/* Devises étrangères gérées par le module de change — le DZD est toujours
   la contrepartie implicite de chaque opération (on échange une de ces
   devises contre des DZD, ou l'inverse). */
export const DEVISES = ["CNY", "EUR", "GBP", "CAD", "USD"];

/* Les photos de reçus (change, achats) sont compressées côté navigateur
   (voir src/imageUtils.js shrinkImage) et stockées directement en base64
   dans le champ "photo" des documents exchangeOps/purchases — pas de
   Firebase Storage (indisponible sur le plan Spark gratuit). */

/* ------------------------------------------------------------------ */
/*  Taux du jour par devise : par défaut dans les formulaires, maintenus  */
/*  par l'admin, lus par tous les comptes connectés (admin et passager). */
/* ------------------------------------------------------------------ */

export async function getTauxDuJour() {
  if (!db) return {};
  try {
    const snap = await getDoc(doc(db, "settings", "tauxDuJour"));
    return snap.exists() ? snap.data() : {};
  } catch (e) {
    console.error("[exchange] lecture des taux du jour impossible :", e);
    return {};
  }
}

export function subscribeTauxDuJour(onChange) {
  if (!db) return () => {};
  return onSnapshot(
    doc(db, "settings", "tauxDuJour"),
    (snap) => onChange(snap.exists() ? snap.data() : {}),
    (err) => console.error("[exchange] écoute des taux du jour impossible :", err)
  );
}

export async function setTauxDuJour(devise, taux) {
  if (!db) throw new Error("Firebase non configuré.");
  await setDoc(doc(db, "settings", "tauxDuJour"), { [devise]: Number(taux) || 0, updatedAt: serverTimestamp() }, { merge: true });
}

/* ------------------------------------------------------------------ */
/*  Opérations de change                                                */
/* ------------------------------------------------------------------ */

/* uid + isAdmin déterminent la portée de l'écoute : l'admin voit toutes
   les opérations, un passager ne voit que celles qu'il a lui-même
   saisies (voir firestore.rules — même filtrage appliqué côté serveur). */
export function subscribeExchangeOps(uid, isAdmin, onChange) {
  if (!db) return () => {};
  const q = isAdmin
    ? collection(db, "exchangeOps")
    : query(collection(db, "exchangeOps"), where("createdBy", "==", uid));
  return onSnapshot(q, (snap) => {
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    onChange(rows);
  }, (err) => console.error("[exchange] écoute des opérations de change impossible :", err));
}

export async function addExchangeOp(vals, { uid, email, isAdmin }) {
  if (!db) throw new Error("Firebase non configuré.");
  await addDoc(collection(db, "exchangeOps"), {
    ...vals,
    createdBy: uid,
    createdByEmail: email || null,
    status: isAdmin ? "valide" : "a_confirmer",
    createdAt: serverTimestamp(),
  });
}

export async function deleteExchangeOp(id) {
  if (!db) return;
  await deleteDoc(doc(db, "exchangeOps", id));
}

export async function validateExchangeOp(id) {
  if (!db) return;
  await updateDoc(doc(db, "exchangeOps", id), { status: "valide" });
}

/* ------------------------------------------------------------------ */
/*  Achats en devise                                                    */
/* ------------------------------------------------------------------ */

export function subscribePurchases(uid, isAdmin, onChange) {
  if (!db) return () => {};
  const q = isAdmin
    ? collection(db, "purchases")
    : query(collection(db, "purchases"), where("createdBy", "==", uid));
  return onSnapshot(q, (snap) => {
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    onChange(rows);
  }, (err) => console.error("[exchange] écoute des achats impossible :", err));
}

export async function addPurchase(vals, { uid, email, isAdmin }) {
  if (!db) throw new Error("Firebase non configuré.");
  await addDoc(collection(db, "purchases"), {
    ...vals,
    createdBy: uid,
    createdByEmail: email || null,
    status: isAdmin ? "valide" : "a_confirmer",
    createdAt: serverTimestamp(),
  });
}

export async function updatePurchase(id, vals) {
  if (!db) return;
  await updateDoc(doc(db, "purchases", id), vals);
}

export async function deletePurchase(id) {
  if (!db) return;
  await deleteDoc(doc(db, "purchases", id));
}

export async function validatePurchase(id) {
  if (!db) return;
  await updateDoc(doc(db, "purchases", id), { status: "valide" });
}

/* ------------------------------------------------------------------ */
/*  Frais (hôtel, transport, excédent bagages, repas, autre)            */
/* ------------------------------------------------------------------ */

/* Mêmes règles que les achats : saisis par l'admin (validés immédiatement)
   ou par un passager (en attente jusqu'à validation par l'admin) — voir
   firestore.rules. */
export function subscribeExpenses(uid, isAdmin, onChange) {
  if (!db) return () => {};
  const q = isAdmin
    ? collection(db, "expenses")
    : query(collection(db, "expenses"), where("createdBy", "==", uid));
  return onSnapshot(q, (snap) => {
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    onChange(rows);
  }, (err) => console.error("[exchange] écoute des frais impossible :", err));
}

export async function addExpense(vals, { uid, email, isAdmin }) {
  if (!db) throw new Error("Firebase non configuré.");
  await addDoc(collection(db, "expenses"), {
    ...vals,
    createdBy: uid,
    createdByEmail: email || null,
    status: isAdmin ? "valide" : "a_confirmer",
    createdAt: serverTimestamp(),
  });
}

export async function updateExpense(id, vals) {
  if (!db) return;
  await updateDoc(doc(db, "expenses", id), vals);
}

export async function deleteExpense(id) {
  if (!db) return;
  await deleteDoc(doc(db, "expenses", id));
}

export async function validateExpense(id) {
  if (!db) return;
  await updateDoc(doc(db, "expenses", id), { status: "valide" });
}

/* ------------------------------------------------------------------ */
/*  Calculs partagés admin (résumé par rotation)                        */
/* ------------------------------------------------------------------ */

/* Devises "relais" utilisées pour le change en Algérie (DZD -> devise) et
   en Chine (devise -> CNY) — le CNY n'apparaît jamais comme devise reçue
   en Algérie ni donnée en Chine, seulement comme résultat final. */
export const DEVISES_RELAIS = ["EUR", "USD", "CAD", "GBP"];

/* Dernière opération de change "Algérie" (DZD -> devise) validée pour une
   devise + rotation données (triée par date de saisie) — sert de
   suggestion de taux pour les achats dans cette devise, et de "dernier
   taux obtenu" pour le coût réel côté admin. Ne concerne jamais le CNY :
   voir realCnyRateForRotation() pour son taux, calculé en chaîne. */
export function latestRateForRotation(exchangeOps, devise, rotationId) {
  const candidates = exchangeOps
    .filter((o) => o.categorie === "algerie" && o.deviseRecue === devise && o.rotationId === rotationId && o.status === "valide")
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return candidates.length > 0 ? candidates[0].taux : null;
}

/* Calcule, pour une rotation donnée, le taux réel "1 CNY = X DZD" en
   enchaînant le taux moyen pondéré DZD->devise (change en Algérie) et le
   taux moyen pondéré devise->CNY (change en Chine), séparément pour
   chaque devise relais. La moyenne pondérée par le volume échangé revient
   simplement à diviser le total reçu par le total donné sur chaque étape.
   Si une étape manque pour une devise (aucune opération validée), sa
   valeur est null — à afficher comme "taux DZD manquant", jamais un
   chiffre inventé.
   Le taux "retenu", destiné à convertir les achats en CNY, privilégie une
   moyenne des opérations de change direct DZD -> CNY quand elles existent
   (plus fiables bien que rares), sinon une moyenne des taux par devise
   pondérée par le volume de CNY obtenu via chacune. */
export function realCnyRateForRotation(exchangeOps, rotationId) {
  const ops = exchangeOps.filter((o) => o.rotationId === rotationId && o.status === "valide");

  const parDeviseDetail = {};
  DEVISES_RELAIS.forEach((d) => {
    const algerieOps = ops.filter((o) => o.categorie === "algerie" && o.deviseRecue === d);
    const chineOps = ops.filter((o) => o.categorie === "chine" && o.deviseDonnee === d);
    const totalDZD = algerieOps.reduce((s, o) => s + (Number(o.montantDonne) || 0), 0);
    const totalDeviseAlgerie = algerieOps.reduce((s, o) => s + (Number(o.montantRecu) || 0), 0);
    const totalCNY = chineOps.reduce((s, o) => s + (Number(o.montantRecu) || 0), 0);
    const totalDeviseChine = chineOps.reduce((s, o) => s + (Number(o.montantDonne) || 0), 0);
    if (totalDeviseAlgerie <= 0 || totalDeviseChine <= 0) {
      parDeviseDetail[d] = null;
      return;
    }
    const tauxAlgerie = totalDZD / totalDeviseAlgerie; // 1 devise = X DZD
    const tauxChine = totalCNY / totalDeviseChine; // 1 devise = Y CNY
    parDeviseDetail[d] = { taux: tauxAlgerie / tauxChine, poidsCNY: totalCNY };
  });

  const directOps = ops.filter((o) => o.categorie === "direct");
  const totalDZDDirect = directOps.reduce((s, o) => s + (Number(o.montantDonne) || 0), 0);
  const totalCNYDirect = directOps.reduce((s, o) => s + (Number(o.montantRecu) || 0), 0);

  let retenu = null;
  let source = null;
  if (totalCNYDirect > 0) {
    retenu = totalDZDDirect / totalCNYDirect;
    source = "direct";
  } else {
    const disponibles = DEVISES_RELAIS.map((d) => parDeviseDetail[d]).filter(Boolean);
    const poidsTotal = disponibles.reduce((s, x) => s + x.poidsCNY, 0);
    if (poidsTotal > 0) {
      retenu = disponibles.reduce((s, x) => s + x.taux * x.poidsCNY, 0) / poidsTotal;
      source = "chaine";
    }
  }

  return {
    parDevise: Object.fromEntries(DEVISES_RELAIS.map((d) => [d, parDeviseDetail[d] ? parDeviseDetail[d].taux : null])),
    retenu,
    source,
  };
}

/* Convertit un montant dans une devise donnée en DZD, au taux réel de la
   rotation (1 pour le DZD lui-même, le dernier taux "Algérie" pour
   EUR/USD/CAD/GBP, le taux réel chaîné pour le CNY — voir
   realCnyRateForRotation). Retourne null si le taux nécessaire manque,
   pour que l'appelant affiche "taux DZD manquant" plutôt qu'un chiffre
   inventé. Utilisé pour les soldes (avances - achats - frais) du résumé
   par rotation. */
export function realDZDForDevise(devise, montant, rotationId, exchangeOps) {
  const m = Number(montant) || 0;
  if (devise === "DZD") return m;
  if (devise === "CNY") {
    const real = realCnyRateForRotation(exchangeOps, rotationId).retenu;
    return real != null ? m * real : null;
  }
  const rate = latestRateForRotation(exchangeOps, devise, rotationId);
  return rate != null ? m * rate : null;
}

/* Vrai si la rotation a encore au moins une opération de change, un achat,
   un frais ou une avance qui lui est lié (rotationId) — sert à empêcher la
   suppression d'une rotation encore utilisée par ces modules (voir
   deleteRotation dans App.jsx, qui bloque aussi si des passagers y sont
   encore rattachés). */
export async function rotationHasLinkedOperations(rotationId) {
  if (!db) return false;
  const collections = ["exchangeOps", "purchases", "expenses", "advances"];
  for (const name of collections) {
    const q = query(collection(db, name), where("rotationId", "==", rotationId), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  Avances aux passagers                                               */
/* ------------------------------------------------------------------ */

/* Saisies uniquement par l'admin (voir firestore.rules) ; passagerId
   scope l'écoute pour un compte passager (sa propre fiche), l'admin voit
   toutes les avances. */
export function subscribeAdvances(passagerId, isAdmin, onChange) {
  if (!db) return () => {};
  const q = isAdmin
    ? collection(db, "advances")
    : query(collection(db, "advances"), where("passagerId", "==", passagerId));
  return onSnapshot(q, (snap) => {
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    onChange(rows);
  }, (err) => console.error("[exchange] écoute des avances impossible :", err));
}

export async function addAdvance(vals, { uid, email }) {
  if (!db) throw new Error("Firebase non configuré.");
  await addDoc(collection(db, "advances"), {
    ...vals,
    confirme: false,
    confirmeAt: null,
    createdBy: uid,
    createdByEmail: email || null,
    status: "valide",
    createdAt: serverTimestamp(),
  });
}

export async function deleteAdvance(id) {
  if (!db) return;
  await deleteDoc(doc(db, "advances", id));
}

/* Seule action possible pour un compte passager sur une avance : confirmer
   l'avoir reçue (firestore.rules limite l'update à ces deux champs). */
export async function confirmAdvanceReceipt(id) {
  if (!db) return;
  await updateDoc(doc(db, "advances", id), { confirme: true, confirmeAt: serverTimestamp() });
}
