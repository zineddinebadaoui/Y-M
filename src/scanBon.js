/* Appelle la fonction serveur /api/scan-bon (voir api/scan-bon.js), qui lit
   la clé Anthropic côté serveur et ne l'expose jamais au navigateur. */
export async function scanBonImage(dataUrl, isTransport) {
  const res = await fetch("/api/scan-bon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataUrl, isTransport: Boolean(isTransport) }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || "scan_failed");
    err.code = body.code || "scan_failed";
    throw err;
  }
  return res.json(); // { designation, quantite, prixUnitaire }
}
