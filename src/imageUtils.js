/* Réduit une photo (bon, reçu, billet…) avant de la stocker en base64 dans
   Firestore (pas de Firebase Storage — plan Spark) : une photo de téléphone
   (souvent 2-8 Mo) est redimensionnée à 1200 px de large maximum et
   compressée en JPEG qualité 0,7. Si le résultat dépasse encore
   targetBytes (700 Ko par défaut), la qualité est abaissée par paliers ;
   si même la qualité la plus basse ne suffit pas, la promesse est rejetée
   avec une erreur "image_too_large" pour que l'appelant affiche un message
   clair plutôt que d'enregistrer une image trop volumineuse. */
export function shrinkImage(file, maxDim = 1200, targetBytes = 700 * 1024) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      let quality = 0.7;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      let guard = 0;
      while (dataUrl.length > targetBytes * 1.37 && guard < 6) {
        quality = Math.max(0.2, quality - 0.15);
        dataUrl = canvas.toDataURL("image/jpeg", quality);
        guard += 1;
      }
      if (dataUrl.length > targetBytes * 1.37) {
        reject(new Error("image_too_large"));
        return;
      }
      resolve(dataUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image_decode_failed")); };
    img.src = url;
  });
}
