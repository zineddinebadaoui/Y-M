import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const app = hasConfig ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;
export const storage = app ? getStorage(app) : null;

/* Garde la session ouverte entre deux lancements de l'appli (utile en PWA
   installée sur mobile, où on ne veut pas se reconnecter à chaque fois). */
if (auth) {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    /* si indisponible (mode privé…), Firebase retombe sur son défaut */
  });
}

/* Instance Firebase secondaire, utilisée uniquement pour créer un compte
   passager depuis l'interface admin sans déconnecter l'admin (createUser
   sur l'instance principale ouvrirait sinon une session sur ce nouveau
   compte à la place de la sienne). */
export function getSecondaryAuth() {
  if (!hasConfig) return null;
  const existing = getApps().find((a) => a.name === "secondary");
  const secondaryApp = existing || initializeApp(firebaseConfig, "secondary");
  return getAuth(secondaryApp);
}
