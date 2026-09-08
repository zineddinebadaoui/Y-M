import Anthropic from "@anthropic-ai/sdk";

/* Fonction serveur Vercel : lit ANTHROPIC_API_KEY côté serveur (jamais
   exposée au navigateur) et demande à Claude de lire une photo de bon pour
   en extraire désignation / quantité / prix. Voir src/scanBon.js pour
   l'appel côté client. */

const PROMPT_ACHAT =
  "Cette photo montre un bon ou une facture d'achat de marchandise entre l'Algérie et la Chine, pour un registre personnel de dettes et marchandise.\n" +
  "Lis le document et réponds UNIQUEMENT avec un objet JSON, sans aucun texte autour, de la forme :\n" +
  '{"designation": string, "quantite": number, "prixUnitaire": number}\n' +
  '- "designation" : le nom ou type de la marchandise (ex. "Téléphones", "Coques").\n' +
  '- "quantite" : le nombre d\'unités/pièces indiqué sur le document.\n' +
  '- "prixUnitaire" : le prix d\'achat en dinars algériens (DA) par unité, s\'il est visible sur le bon.\n' +
  "Si une valeur n'est pas lisible ou absente, mets null pour ce champ. N'invente aucun chiffre.";

const PROMPT_TRANSPORT =
  "Cette photo montre un bon ou un reçu pour de la marchandise transportée (pas achetée) entre l'Algérie et la Chine, pour un registre personnel de dettes et marchandise.\n" +
  "Lis le document et réponds UNIQUEMENT avec un objet JSON, sans aucun texte autour, de la forme :\n" +
  '{"designation": string, "quantite": number, "prixUnitaire": number}\n' +
  '- "designation" : le nom ou type de la marchandise (ex. "Téléphones", "Coques").\n' +
  '- "quantite" : le nombre d\'unités/pièces indiqué sur le document.\n' +
  '- "prixUnitaire" : le montant en dinars algériens (DA) reçu par unité pour le transport, s\'il est visible.\n' +
  "Si une valeur n'est pas lisible ou absente, mets null pour ce champ. N'invente aucun chiffre.";

function parseDataUrl(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/.exec(String(dataUrl || ""));
  if (!m) return null;
  return { mediaType: m[1], base64: m[2] };
}

function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    /* essaie une clôture de code Markdown, sinon la première/dernière accolade */
  }
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch (e) { /* continue */ }
  }
  const start = trimmed.search(/[{[]/);
  const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch (e) { /* échec */ }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée", code: "method_not_allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Clé API Anthropic absente côté serveur (ANTHROPIC_API_KEY).", code: "missing_api_key" });
    return;
  }

  const { image, isTransport } = req.body || {};
  const parsed = parseDataUrl(image);
  if (!parsed) {
    res.status(400).json({ error: "Image manquante ou invalide.", code: "invalid_image" });
    return;
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: parsed.mediaType, data: parsed.base64 } },
            { type: "text", text: isTransport ? PROMPT_TRANSPORT : PROMPT_ACHAT },
          ],
        },
      ],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    const data = extractJson(text);
    if (!data || typeof data !== "object") {
      res.status(502).json({ error: "Réponse illisible de l'IA.", code: "invalid_json" });
      return;
    }

    res.status(200).json({
      designation: typeof data.designation === "string" ? data.designation : null,
      quantite: typeof data.quantite === "number" ? data.quantite : null,
      prixUnitaire: typeof data.prixUnitaire === "number" ? data.prixUnitaire : null,
    });
  } catch (err) {
    res.status(502).json({ error: "La lecture automatique a échoué.", code: "upstream_error" });
  }
}
