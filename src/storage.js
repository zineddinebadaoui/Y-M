import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase.js";

/* Chaque "clé" (debts, payments, billets…) est un document Firestore dans la
   collection "registre". Un tableau est enregistré sous {items: [...]}, une
   valeur simple (ex. la langue) sous {value: ...} — même forme que la version
   utilisée dans l'aperçu Claude, pour que la logique de l'appli n'ait pas à
   changer. Le localStorage sert de secours si Firestore est injoignable
   (pas de configuration, hors-ligne, etc.). */

function localKey(key) {
  return "registre-caba:" + key;
}

function readLocal(key, fallback) {
  try {
    const raw = window.localStorage.getItem(localKey(key));
    if (raw != null) return JSON.parse(raw);
  } catch (e) {
    /* stockage indisponible */
  }
  return fallback;
}

function writeLocal(key, value) {
  try {
    window.localStorage.setItem(localKey(key), JSON.stringify(value));
  } catch (e) {
    /* stockage indisponible */
  }
}

function unwrap(data, fallback) {
  if (!data) return fallback;
  if (Array.isArray(data.items)) return data.items;
  if (Object.prototype.hasOwnProperty.call(data, "value")) return data.value;
  return fallback;
}

function wrap(value) {
  return Array.isArray(value) ? { items: value } : { value };
}

export async function loadKey(key, fallback) {
  if (db) {
    try {
      const snap = await getDoc(doc(db, "registre", key));
      if (snap.exists()) return unwrap(snap.data(), fallback);
    } catch (e) {
      /* on retombe sur le localStorage */
    }
  }
  return readLocal(key, fallback);
}

export async function saveKey(key, value) {
  if (db) {
    try {
      await setDoc(doc(db, "registre", key), wrap(value));
      writeLocal(key, value);
      return true;
    } catch (e) {
      return false;
    }
  }
  writeLocal(key, value);
  return true;
}

/** Écoute les changements en direct sur une clé : ce que l'autre téléphone
    enregistre apparaît ici sans recharger la page. Retourne une fonction à
    appeler pour se désabonner (ex. dans le nettoyage d'un useEffect). */
export function subscribeKey(key, fallback, onChange) {
  if (!db) return () => {};
  return onSnapshot(
    doc(db, "registre", key),
    (snap) => onChange(unwrap(snap.exists() ? snap.data() : null, fallback)),
    () => { /* connexion perdue : on garde la dernière valeur reçue */ }
  );
}
