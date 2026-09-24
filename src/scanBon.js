import { auth } from "./firebase.js";

/* Appelle la fonction serveur /api/scan-bon (voir api/scan-bon.js), qui lit
   la clé Anthropic côté serveur et ne l'expose jamais au navigateur. La
   fonction serveur exige un jeton Firebase valide (utilisateur connecté). */
async function callScanBon(dataUrl, extraPayload) {
  if (!auth || !auth.currentUser) {
    const err = new Error("Non connecté.");
    err.code = "not_authenticated";
    throw err;
  }
  const idToken = await auth.currentUser.getIdToken();

  const res = await fetch("/api/scan-bon", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ image: dataUrl, ...extraPayload }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || "scan_failed");
    err.code = body.code || "scan_failed";
    throw err;
  }
  return res.json();
}

/* Lecture d'un bon/facture de marchandise : { designation, quantite, prixUnitaire } */
export function scanBonImage(dataUrl, isTransport) {
  return callScanBon(dataUrl, { isTransport: Boolean(isTransport) });
}

/* Lecture d'un document passager (billet, reçu de visa…) : { prixBillet, fraisVisa } */
export function scanPassengerDoc(dataUrl) {
  return callScanBon(dataUrl, { docType: "passager" });
}
