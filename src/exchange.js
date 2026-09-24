import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc,
  onSnapshot, query, where, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase.js";

/* Devises étrangères gérées par le module de change — le DZD est toujours
   la contrepartie implicite de chaque opération (on échange une de ces
   devises contre des DZD, ou l'inverse). */
export const DEVISES = ["CNY", "EUR", "GBP", "CAD", "USD"];

/* ------------------------------------------------------------------ */
/*  Photos de reçus : Firebase Storage (jamais en base64 dans Firestore) */
/* ------------------------------------------------------------------ */

export async function uploadReceiptPhoto(dataUrl, uid) {
  if (!storage) throw new Error("Firebase Storage non configuré.");
  const path = `receipts/${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const storageRef = ref(storage, path);
  await uploadString(storageRef, dataUrl, "data_url");
  return getDownloadURL(storageRef);
}

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
/*  Calculs partagés admin (résumé par rotation)                        */
/* ------------------------------------------------------------------ */

/* Dernière opération de change validée pour une devise + rotation
   données (triée par date de saisie) — sert au calcul du "coût réel
   selon les taux obtenus" côté admin. */
export function latestRateForRotation(exchangeOps, devise, rotationId) {
  const candidates = exchangeOps
    .filter((o) => o.devise === devise && o.rotationId === rotationId && o.status === "valide")
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return candidates.length > 0 ? candidates[0].taux : null;
}
