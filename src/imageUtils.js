/* Réduit une photo (bon, reçu…) avant de la stocker : chaque document
   Firestore doit rester petit, donc une photo de téléphone (souvent 2-8 Mo)
   est redimensionnée et recompressée pour tenir confortablement dans la
   fiche qui la porte. */
export function shrinkImage(file, maxDim = 1600, targetBytes = 400000) {
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
      let quality = 0.75;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      let guard = 0;
      while (dataUrl.length > targetBytes * 1.37 && guard < 6) {
        quality = Math.max(0.3, quality - 0.15);
        dataUrl = canvas.toDataURL("image/jpeg", quality);
        guard += 1;
      }
      resolve(dataUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image_decode_failed")); };
    img.src = url;
  });
}
