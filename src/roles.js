import {
  doc, getDoc, setDoc, collection, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, getSecondaryAuth } from "./firebase.js";

/* Rôle d'un compte : "admin" (accès complet, comportement par défaut si
   aucun document roles/{uid} n'existe — ne casse pas les comptes admin déjà
   créés avant cette fonctionnalité) ou "passager" (accès restreint à sa
   propre soumission, voir firestore.rules). */
export async function getMyRole(uid) {
  if (!db) return "admin";
  try {
    const snap = await getDoc(doc(db, "roles", uid));
    if (snap.exists() && snap.data().role === "passager") return "passager";
  } catch (e) {
    /* en cas de doute (hors-ligne, etc.), on ne restreint pas l'admin */
  }
  return "admin";
}

/* Écoute tous les comptes passager (utilisé par l'interface admin). */
export function subscribePassagerAccounts(onChange) {
  if (!db) return () => {};
  return onSnapshot(collection(db, "roles"), (snap) => {
    const rows = [];
    snap.forEach((d) => {
      if (d.data().role === "passager") rows.push({ uid: d.id, ...d.data() });
    });
    onChange(rows);
  }, () => {});
}

/* Crée un compte Firebase Auth pour un passager, sans déconnecter l'admin
   (utilise une instance Firebase secondaire), puis enregistre son rôle et,
   le cas échéant, le passager/la rotation auquel il est lié. */
export async function createPassagerAccount({ email, password, linkedPassengerId, rotationId }) {
  const secondaryAuth = getSecondaryAuth();
  if (!secondaryAuth || !db) throw new Error("Firebase non configuré.");
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
  const uid = cred.user.uid;
  await signOut(secondaryAuth);
  await setDoc(doc(db, "roles", uid), {
    role: "passager",
    email: email.trim(),
    linkedPassengerId: linkedPassengerId || null,
    rotationId: rotationId || null,
    createdAt: serverTimestamp(),
  });
  return uid;
}

/* Relie un compte passager à l'entrée passager créée/mise à jour lors de la
   validation de sa soumission (pour que ses prochaines soumissions se
   fondent dans la même fiche plutôt que d'en créer une nouvelle à chaque
   fois). */
export async function linkPassagerAccount(uid, passengerId) {
  if (!db) return;
  await setDoc(doc(db, "roles", uid), { linkedPassengerId: passengerId }, { merge: true });
}

/* --- Soumission d'un compte passager (formulaire restreint) --- */

export async function getMySubmission(uid) {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, "passengerSubmissions", uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    return null;
  }
}

export async function submitPassagerEntry(uid, { nom, piece, prixBillet, fraisVisa, email }) {
  if (!db) throw new Error("Firebase non configuré.");
  await setDoc(doc(db, "passengerSubmissions", uid), {
    nom, piece: piece || null,
    prixBillet: prixBillet != null ? Number(prixBillet) || 0 : null,
    fraisVisa: fraisVisa != null ? Number(fraisVisa) || 0 : null,
    email: email || null,
    status: "a_confirmer",
    updatedAt: serverTimestamp(),
  });
}

/* Écoute toutes les soumissions passager (utilisé par l'interface admin). */
export function subscribeSubmissions(onChange) {
  if (!db) return () => {};
  return onSnapshot(collection(db, "passengerSubmissions"), (snap) => {
    const rows = [];
    snap.forEach((d) => rows.push({ uid: d.id, ...d.data() }));
    onChange(rows);
  }, () => {});
}

export async function markSubmissionValidated(uid, linkedPassengerId) {
  if (!db) return;
  await setDoc(
    doc(db, "passengerSubmissions", uid),
    { status: "valide", linkedPassengerId: linkedPassengerId || null },
    { merge: true }
  );
}
