/*
  Nano Banana (Gemini 2.5 Flash Image) minimal client utilities
  NOTE: For security, prefer calling this from a trusted backend (e.g., Supabase Edge Function)
  because exposing API keys on the client is unsafe. This client reads VITE_GEMINI_API_KEY.
*/

export type InlineImage = {
  dataUrl: string; // data:image/png;base64,...
  mimeType: string; // image/png or image/jpeg
};

export type EditRequest = {
  prompt: string;
  base?: InlineImage | null;
  overlays?: InlineImage[]; // optional additional context images
  model?: string; // default: gemini-2.5-flash-image-preview
  maxOutputs?: number; // default: 1
  apiKey?: string; // optional explicit key to avoid relying on import.meta.env
};

export type EditResult = {
  images: { dataUrl: string; mimeType: string }[];
  text?: string;
  raw?: any;
};

const DEFAULT_MODEL = "gemini-2.5-flash-image-preview";

function b64FromDataUrl(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

export async function fileToDataUrl(file: File): Promise<InlineImage> {
  const mimeType = file.type || "image/png";
  const buf = await file.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return { dataUrl: `data:${mimeType};base64,${b64}`, mimeType };
}

export async function invokeGeminiEdit(req: EditRequest): Promise<EditResult> {
  const envAny = (import.meta as any)?.env || {};
  if ((import.meta as any)?.env?.DEV) {
    try {
      const keys = Object.keys(envAny);
      console.log("[Gemini] Vite env keys:", keys);
      const present = Boolean(envAny?.VITE_GEMINI_API_KEY);
      const prefix = envAny?.VITE_GEMINI_API_KEY ? String(envAny.VITE_GEMINI_API_KEY).slice(0, 6) : "";
      const len = envAny?.VITE_GEMINI_API_KEY ? String(envAny.VITE_GEMINI_API_KEY).length : 0;
      console.log("[Gemini] VITE_GEMINI_API_KEY present:", present, present ? `(prefix=${prefix}..., len=${len})` : "");
    } catch {}
  }

  // Fallback: allow reading from window.__VITE_ENV if present (posted by editor for debugging)
  const winEnv = (typeof window !== 'undefined' && (window as any).__VITE_ENV) || undefined;
  let key = (req.apiKey ?? envAny?.VITE_GEMINI_API_KEY ?? (winEnv as any)?.VITE_GEMINI_API_KEY) as string | undefined;
  if (!envAny?.VITE_GEMINI_API_KEY && winEnv?.VITE_GEMINI_API_KEY && (import.meta as any)?.env?.DEV) {
    try {
      const prefix = String(winEnv.VITE_GEMINI_API_KEY).slice(0, 6);
      const len = String(winEnv.VITE_GEMINI_API_KEY).length;
      console.warn("[Gemini] Using fallback key from window.__VITE_ENV (prefix=", prefix, "..., len=", len, ")");
    } catch {}
  }
  // Dev-only: final fallback by asking Vite dev middleware for the key
  if (!key && (import.meta as any)?.env?.DEV) {
    try {
      const r = await fetch('/__env');
      if (r.ok) {
        const j = await r.json().catch(() => ({}));
        const maybe = j?.VITE_GEMINI_API_KEY as string | undefined;
        if (maybe) {
          key = maybe;
          const prefix = String(maybe).slice(0, 6);
          const len = String(maybe).length;
          console.warn("[Gemini] Using dev middleware fallback key (prefix=", prefix, "..., len=", len, ")");
        }
      }
    } catch {}
  }
  if (!key) {
    console.error("[Gemini] Missing VITE_GEMINI_API_KEY. Ensure .env at project root with 'VITE_GEMINI_API_KEY=...' and restart dev server.");
    throw new Error(
      "Missing VITE_GEMINI_API_KEY. Add it to your .env and restart dev server."
    );
  }

  const model = req.model || DEFAULT_MODEL;
  // Build contents: text prompt + images
  const contents: any[] = [];
  contents.push({ role: "user", parts: [{ text: req.prompt || "" }] });

  const images: InlineImage[] = [];
  if (req.base) images.push(req.base);
  if (req.overlays?.length) images.push(...req.overlays);

  if (images.length) {
    const imgParts = images.map((img) => ({
      inline_data: { mime_type: img.mimeType, data: b64FromDataUrl(img.dataUrl) },
    }));
    contents[0].parts.push(...imgParts);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    key
  )}`;

  const body = {
    contents,
    generationConfig: {
      // Low-ish latency settings for preview usage
      temperature: 0.8,
      candidateCount: Math.max(1, Math.min(req.maxOutputs || 1, 4)),
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini request failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const imagesOut: { dataUrl: string; mimeType: string }[] = [];
  let textOut = "";

  const candidates = json?.candidates || [];
  for (const c of candidates) {
    const parts = c?.content?.parts || [];
    for (const p of parts) {
      if (p?.text) textOut += (textOut ? "\n\n" : "") + p.text;
      if (p?.inline_data?.data && p?.inline_data?.mime_type) {
        const mime = p.inline_data.mime_type as string;
        const dataUrl = `data:${mime};base64,${p.inline_data.data}`;
        imagesOut.push({ dataUrl, mimeType: mime });
      }
    }
  }

  return { images: imagesOut, text: textOut || undefined, raw: json };
}
