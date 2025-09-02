import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Download, Eraser, History, ImagePlus, Layers, Move, Pencil, Play, Upload, Wand2, X } from "lucide-react";
import toast from "react-hot-toast";
import { fileToDataUrl, invokeGeminiEdit, type InlineImage } from "@/lib/nanobanana";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
 
// Simple overlay type for drag/resize
interface Overlay {
  id: string;
  img?: HTMLImageElement;
  src?: string; // dataURL
  x: number; // 0..1 relative
  y: number; // 0..1
  w: number; // width fraction of canvas
  h: number; // height fraction
  r: number; // rotation radians
}

interface HistoryItem {
  id: string;
  preview: string; // dataURL
  label: string;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export default function AiMockupEditor() {
  const [baseImg, setBaseImg] = useState<HTMLImageElement | null>(null);
  const [baseSrc, setBaseSrc] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tool, setTool] = useState<"move" | "brush" | "eraser">("move");
  const [brushSize, setBrushSize] = useState<number>(10);
  const [color, setColor] = useState<string>("#111827");
  const [prompt, setPrompt] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [variations, setVariations] = useState<HistoryItem[]>([]);

  // Products and variants (Supabase)
  type ProductRow = { id: string; name: string };
  type VariantRow = {
    id: string;
    color_name: string;
    image_url?: string | null;
    front_image_url?: string | null;
    back_image_url?: string | null;
    active?: boolean | null;
  };
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [view, setView] = useState<"front" | "back">("front");

  // Dev-only: log all env keys and mask values (esp. API-like)
  useEffect(() => {
    const envAny = (import.meta as any)?.env || {};
    if (!(import.meta as any)?.env?.DEV) return;
    try {
      console.log("[Env] AiMockupEditor mounted");
      const keys = Object.keys(envAny);
      console.log("[Env] Vite env keys:", keys);
      const maskVal = (v: any) => {
        const s = String(v ?? "");
        if (!s) return "<empty>";
        return `${s.slice(0, 6)}... (len=${s.length})`;
      };
      const allMasked: Record<string, string> = {};
      for (const k of keys) allMasked[k] = maskVal(envAny[k]);
      console.log("[Env] All env vars (masked):", allMasked);
      const suspectedKeyNames = keys.filter(k => /key|token|secret|api/i.test(k));
      const masked: Record<string, string> = {};
      for (const k of suspectedKeyNames) masked[k] = allMasked[k];
      console.log("[Env] Suspected API-like vars (masked):", masked);
      if (!envAny?.VITE_GEMINI_API_KEY) {
        console.error("[Env] VITE_GEMINI_API_KEY is NOT defined in import.meta.env");
      }
      // Expose for quick console inspection
      (window as any).__VITE_ENV = envAny;
      (window as any).__VITE_ENV_MASKED = allMasked;
      console.log("[Env] Access in console: __VITE_ENV and __VITE_ENV_MASKED");
      // Also post to dev server so it shows up in terminal
      fetch('/__log_client_env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allMasked)
      }).catch(() => {});
    } catch {}
  }, []);

  // Load products once
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("products")
          .select("id, name")
          .order("name", { ascending: true });
        if (error) throw error;
        if (Array.isArray(data)) setProducts(data as ProductRow[]);
      } catch (e) {
        toast.error("Failed to load products");
      }
    })();
  }, []);

  // Auto-select first product
  useEffect(() => {
    if (!selectedProduct && products.length > 0) {
      setSelectedProduct(products[0]!.id);
    }
  }, [products]);

  // Load variants when product changes
  useEffect(() => {
    if (!selectedProduct) { setVariants([]); return; }
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("product_variants")
          .select("id, color_name, image_url, front_image_url, back_image_url, active")
          .eq("product_id", selectedProduct);
        if (error) throw error;
        if (Array.isArray(data)) setVariants(data as VariantRow[]);
        setSelectedVariantId(null); // reset color selection on product change
      } catch (e) {
        toast.error("Failed to load variants");
      }
    })();
  }, [selectedProduct]);

  // When variants load, auto-select first active variant (color)
  useEffect(() => {
    if (!variants.length) { setSelectedVariantId(null); return; }
    const firstActive = variants.find(v => v.active !== false) || variants[0]!;
    setSelectedVariantId(prev => prev ?? firstActive.id);
  }, [variants]);

  // When selected color (variant) or view changes, load base image accordingly
  useEffect(() => {
    if (!variants.length) return;
    const v = variants.find(v => v.id === selectedVariantId) || variants.find(v => v.active !== false) || variants[0]!;
    const src = view === "back" ? (v.back_image_url || v.image_url) : (v.front_image_url || v.image_url);
    if (src) loadBaseFromVariantUrl(src);
  }, [variants, view, selectedVariantId]);

  // Canvas layers: drawing layer (sketch) + composed preview
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sketchRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load dataURL into HTMLImageElement
  const loadImage = (dataUrl: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });

  // Track dynamic aspect ratio of the displayed region to avoid stretching
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  // Auto-crop padded whitespace/background around garment
  const [autoCrop, setAutoCrop] = useState<boolean>(true);
  const [cropBox, setCropBox] = useState<null | { sx: number; sy: number; sw: number; sh: number }>(null);

  // Compute crop by detecting pixels that differ from background or have alpha
  function computeAutoCrop(img: HTMLImageElement): { sx: number; sy: number; sw: number; sh: number } | null {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const ictx = off.getContext('2d');
    if (!ictx) return null;
    ictx.drawImage(img, 0, 0);
    let data: ImageData;
    try { data = ictx.getImageData(0, 0, w, h); } catch { return null; }
    const px = data.data;
    // sample background as average of corners
    const cors = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
    const bg = { r: 0, g: 0, b: 0, a: 0 };
    for (const i of cors) { bg.r += px[i]; bg.g += px[i + 1]; bg.b += px[i + 2]; bg.a += px[i + 3]; }
    bg.r /= 4; bg.g /= 4; bg.b /= 4; bg.a /= 4;
    const thresh = 18; // color distance threshold
    const alphaThresh = 8; // >8 considered visible
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const a = px[i + 3];
        const dr = px[i] - bg.r, dg = px[i + 1] - bg.g, db = px[i + 2] - bg.b;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (a > alphaThresh || dist > thresh) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return null;
    // add a small padding
    const pad = Math.round(Math.max(w, h) * 0.02);
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const sw = Math.min(w - sx, (maxX - minX + 1) + pad * 2);
    const sh = Math.min(h - sy, (maxY - minY + 1) + pad * 2);
    // if crop is too aggressive (e.g., >95% area), skip
    const area = (sw * sh) / (w * h);
    if (area > 0.98) return null;
    return { sx, sy, sw, sh };
  }

  // Fetch remote image safely to dataURL (reduces canvas taint issues)
  const fetchImageDataUrl = async (url: string): Promise<string> => {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  };

  const addOverlayFromFile = async (file: File) => {
    try {
      const inline = await fileToDataUrl(file);
      const img = await loadImage(inline.dataUrl);
      const o: Overlay = {
        id: crypto.randomUUID(),
        img,
        src: inline.dataUrl,
        x: 0.5,
        y: 0.5,
        w: 0.4,
        h: (img.height / img.width) * 0.4,
        r: 0,
      };
      setOverlays((prev) => [...prev, o]);
      setActiveId(o.id);
    } catch (e) {
      toast.error("Failed to add overlay");
    }
  };

  const onUploadBase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const inline = await fileToDataUrl(file);
      const img = await loadImage(inline.dataUrl);
      setBaseImg(img);
      setBaseSrc(inline.dataUrl);
      // Compute crop and aspect ratio
      const crop = autoCrop ? computeAutoCrop(img) : null;
      setCropBox(crop);
      const w = crop ? crop.sw : (img.naturalWidth || img.width || 1);
      const h = crop ? crop.sh : (img.naturalHeight || img.height || 1);
      setAspectRatio(w / h);
      // resize canvases to image
      requestAnimationFrame(() => {
        const c = canvasRef.current;
        const s = sketchRef.current;
        if (c && s) {
          c.width = w;
          c.height = h;
          s.width = w;
          s.height = h;
          const sk = s.getContext("2d");
          if (sk) {
            sk.clearRect(0, 0, s.width, s.height);
          }
        }
        render();
      });
    } catch (e) {
      toast.error("Failed to load base image");
    }
  };

  // Load base image from a variant URL (front/back/sleeve)
  const loadBaseFromVariantUrl = async (url?: string | null) => {
    if (!url) return;
    try {
      const dataUrl = await fetchImageDataUrl(url);
      const img = await loadImage(dataUrl);
      setBaseImg(img);
      setBaseSrc(dataUrl);
      // Compute crop and aspect ratio
      const crop = autoCrop ? computeAutoCrop(img) : null;
      setCropBox(crop);
      const w = crop ? crop.sw : ((img as any).naturalWidth || img.width || 1);
      const h = crop ? crop.sh : ((img as any).naturalHeight || img.height || 1);
      setAspectRatio(w / h);
      requestAnimationFrame(() => {
        const c = canvasRef.current;
        const s = sketchRef.current;
        if (c && s) {
          c.width = w;
          c.height = h;
          s.width = w;
          s.height = h;
          const sk = s.getContext("2d");
          if (sk) sk.clearRect(0, 0, s.width, s.height);
        }
        render();
      });
    } catch (err) {
      toast.error("Failed to load base image from product variant");
    }
  };

  const removeOverlay = (id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    if (activeId === id) setActiveId(null);
    render();
  };

  // Rendering
  const render = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (baseImg) {
      if (autoCrop && cropBox) {
        const { sx, sy, sw, sh } = cropBox;
        try {
          ctx.drawImage(baseImg, sx, sy, sw, sh, 0, 0, c.width, c.height);
        } catch {
          ctx.drawImage(baseImg, 0, 0, c.width, c.height);
        }
      } else {
        ctx.drawImage(baseImg, 0, 0, c.width, c.height);
      }
    }

    // draw sketch layer
    const s = sketchRef.current;
    if (s) ctx.drawImage(s, 0, 0);

    // draw overlays
    overlays.forEach((o) => {
      if (!o.img) return;
      const cx = o.x * c.width;
      const cy = o.y * c.height;
      const w = o.w * c.width;
      const h = o.h * c.height;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(o.r);
      ctx.drawImage(o.img, -w / 2, -h / 2, w, h);
      // selection box
      if (o.id === activeId) {
        ctx.strokeStyle = "#2563eb";
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
      }
      ctx.restore();
    });
  };

  // Re-render when deps change
  useEffect(() => { render(); }, [baseImg, overlays, activeId]);

  // Pointer interaction on container
  useEffect(() => {
    const el = containerRef.current;
    const c = canvasRef.current;
    if (!el || !c) return;
    let dragging: { id: string; mode: "move" | "scale" | "rotate"; ox: number; oy: number } | null = null;

    const getLocal = (ev: PointerEvent) => {
      const rect = c.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * c.width;
      const y = ((ev.clientY - rect.top) / rect.height) * c.height;
      return { x, y };
    };

    const onDown = (ev: PointerEvent) => {
      if (!c) return;
      const { x, y } = getLocal(ev);
      const cx = x / c.width;
      const cy = y / c.height;

      if (tool !== "move") {
        // drawing tools on sketch
        const sk = sketchRef.current?.getContext("2d");
        if (sk) {
          sk.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
          sk.strokeStyle = tool === "eraser" ? "rgba(0,0,0,1)" : color;
          sk.lineWidth = brushSize;
          sk.lineJoin = "round";
          sk.lineCap = "round";
          sk.beginPath();
          sk.moveTo(x, y);
          const move = (e: PointerEvent) => {
            const p = getLocal(e);
            sk.lineTo(p.x, p.y);
            sk.stroke();
            render();
          };
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }
        return;
      }

      // hit test overlays (top-first)
      for (let i = overlays.length - 1; i >= 0; i--) {
        const o = overlays[i];
        const ox = o.x * c.width;
        const oy = o.y * c.height;
        const w = o.w * c.width;
        const h = o.h * c.height;
        // inverse rotate
        const dx = x - ox;
        const dy = y - oy;
        const cos = Math.cos(-o.r);
        const sin = Math.sin(-o.r);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        if (rx >= -w / 2 && rx <= w / 2 && ry >= -h / 2 && ry <= h / 2) {
          setActiveId(o.id);
          dragging = { id: o.id, mode: "move", ox: cx - o.x, oy: cy - o.y };
          ev.preventDefault();
          break;
        }
      }

      const move = (e: PointerEvent) => {
        if (!dragging) return;
        const { x: lx, y: ly } = getLocal(e);
        const nx = clamp(lx / c.width - dragging.ox, 0, 1);
        const ny = clamp(ly / c.height - dragging.oy, 0, 1);
        setOverlays((prev) => prev.map((o) => (o.id === dragging!.id ? { ...o, x: nx, y: ny } : o)));
      };
      const up = () => {
        dragging = null;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };

    el.addEventListener("pointerdown", onDown);
    return () => {
      el.removeEventListener("pointerdown", onDown);
    };
  }, [overlays, tool, brushSize, color]);

  // Export current composed canvas as dataURL
  const exportComposite = (): string | null => {
    const c = canvasRef.current;
    if (!c) return null;
    try {
      return c.toDataURL("image/png");
    } catch (e) {
      toast.error("Export failed");
      return null;
    }
  };

  const applyAiEdit = async () => {
    const composed = exportComposite();
    if (!composed) {
      toast.error("Add a base image first");
      return;
    }
    setBusy(true);
    try {
      const result = await invokeGeminiEdit({
        prompt: prompt || "Enhance this apparel mockup. Keep garment textures and seams realistic, maintain logo placement and proportions, and ensure lighting/shadows look natural on fabric.",
        base: { dataUrl: composed, mimeType: "image/png" },
        overlays: [],
        maxOutputs: 2,
        apiKey: (import.meta as any)?.env?.VITE_GEMINI_API_KEY ?? (window as any)?.__VITE_ENV?.VITE_GEMINI_API_KEY,
      });
      if (!result.images.length) {
        toast("No images returned. Try refining your prompt.", { icon: "🤔" });
      }
      const newVars: HistoryItem[] = result.images.map((im, idx) => ({
        id: crypto.randomUUID(),
        preview: im.dataUrl,
        label: `AI variation ${idx + 1}`,
      }));
      setVariations((prev) => [...newVars, ...prev]);
    } catch (e: any) {
      toast.error(e?.message || "AI edit failed");
    } finally {
      setBusy(false);
    }
  };

  const acceptVariation = async (v: HistoryItem) => {
    try {
      const img = await loadImage(v.preview);
      setBaseImg(img);
      setBaseSrc(v.preview);
      requestAnimationFrame(() => render());
    } catch {}
  };

  const onDropOverlays = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter((f) => /image\/(png|jpeg|jpg)/.test(f.type));
    for (const f of files) await addOverlayFromFile(f);
  };

  return (
    <div className="grid xl:grid-cols-[360px_1fr_300px] gap-6">
      {/* Left panel */}
      <div className="space-y-4">
        {/* Product and variant selection */}
        <div className="space-y-2">
          <Label>Product</Label>
          <Select value={selectedProduct} onValueChange={(v) => setSelectedProduct(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-between">
            <Label className="text-xs">View</Label>
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList>
                <TabsTrigger value="front">Front</TabsTrigger>
                <TabsTrigger value="back">Back</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Color</Label>
            <Select value={selectedVariantId || ''} onValueChange={(v) => setSelectedVariantId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a color" />
              </SelectTrigger>
              <SelectContent>
                {variants.filter(v => v.active !== false).map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.color_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="h-[160px] rounded border p-2">
            <div className="grid grid-cols-3 gap-2">
              {variants.length === 0 ? (
                <p className="col-span-3 text-xs text-muted-foreground">Pick a product to see variant images.</p>
              ) : (
                variants.filter(v => v.active !== false).map((v) => {
                  const src = view === "back" ? (v.back_image_url || v.image_url) : (v.front_image_url || v.image_url);
                  return (
                    <div key={v.id} className="relative border rounded overflow-hidden" title={v.color_name}>
                      {src ? <img src={src} alt={v.color_name} className="w-full h-20 object-cover"/> : <div className="w-full h-20 bg-muted flex items-center justify-center text-[10px] text-muted-foreground">no image</div>}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5">{v.color_name}</div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-2">
          <Label>Base image</Label>
          <div className="flex items-center gap-2">
            <Input type="file" accept="image/png,image/jpeg" onChange={onUploadBase} />
            <Button variant="outline" size="icon" onClick={() => {
              const data = exportComposite();
              if (!data) return;
              const a = document.createElement("a");
              a.href = data;
              a.download = "mockup.png";
              a.click();
            }} title="Export PNG"><Download className="w-4 h-4"/></Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Overlays</Label>
          <div className="flex items-center gap-2">
            <Input type="file" accept="image/png,image/jpeg" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await addOverlayFromFile(f);
            }} />
            <Button variant="outline" size="icon" title="Add overlay"><ImagePlus className="w-4 h-4"/></Button>
          </div>
          {overlays.length > 0 ? (
            <div className="space-y-2">
              {overlays.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded border p-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Layers className="w-4 h-4"/>
                    <span className="truncate max-w-[160px]">{o.src?.slice(0, 32)}...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={activeId === o.id ? "secondary" : "ghost"} onClick={() => setActiveId(o.id)}>select</Button>
                    <Button size="icon" variant="ghost" onClick={() => removeOverlay(o.id)}><X className="w-4 h-4"/></Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No overlays yet. Drag images onto the canvas.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Sketch</Label>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={tool === "move" ? "secondary" : "outline"} onClick={() => setTool("move")}><Move className="w-4 h-4 mr-1"/>move</Button>
            <Button size="sm" variant={tool === "brush" ? "secondary" : "outline"} onClick={() => setTool("brush")}><Pencil className="w-4 h-4 mr-1"/>brush</Button>
            <Button size="sm" variant={tool === "eraser" ? "secondary" : "outline"} onClick={() => setTool("eraser")}><Eraser className="w-4 h-4 mr-1"/>eraser</Button>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <Label className="text-xs">brush</Label>
              <Slider defaultValue={[brushSize]} value={[brushSize]} onValueChange={(v) => setBrushSize(v[0] || 10)} min={2} max={64} step={1}/>
            </div>
            <div>
              <Label className="text-xs">color</Label>
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 p-1"/>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Text prompt</Label>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., place the logo centered on the chest, make the t-shirt red, add soft fabric shadows"/>
          <div className="flex items-center gap-2">
            <Button onClick={applyAiEdit} disabled={busy}><Wand2 className="w-4 h-4 mr-1"/>{busy ? "Applying…" : "Apply edit"}</Button>
            <Button variant="outline" onClick={() => setPrompt("")}>clear</Button>
          </div>
          <p className="text-xs text-muted-foreground">Tip: be direct. Example: "place the logo on the chest, keep fabric texture, add realistic lighting"</p>
        </div>
      </div>

      {/* Canvas center */}
      <div>
        <div
          className="rounded-md border bg-muted/20 p-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropOverlays}
        >
          <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Upload className="w-4 h-4"/> Canvas</div>
            <div className="flex items-center gap-2">
              <span className="text-xs">drag overlays to reposition</span>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={autoCrop} onChange={(e) => {
                  const enabled = e.target.checked; setAutoCrop(enabled);
                  if (baseImg) {
                    const crop = enabled ? computeAutoCrop(baseImg) : null;
                    setCropBox(crop);
                    const w = crop ? crop.sw : (baseImg.naturalWidth || baseImg.width || 1);
                    const h = crop ? crop.sh : (baseImg.naturalHeight || baseImg.height || 1);
                    setAspectRatio(w / h);
                    requestAnimationFrame(() => {
                      const c = canvasRef.current, s = sketchRef.current;
                      if (c && s) { c.width = w; c.height = h; s.width = w; s.height = h; }
                      render();
                    });
                  }
                }} /> auto-crop
              </label>
            </div>
          </div>
          <AspectRatio ratio={aspectRatio}>
            <div ref={containerRef} className="w-full h-full relative select-none">
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"/>
              <canvas ref={sketchRef} className="absolute inset-0 w-full h-full pointer-events-none"/>
            </div>
          </AspectRatio>
        </div>
      </div>

      {/* Right history */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm"><History className="w-4 h-4"/> History</div>
        <ScrollArea className="h-[520px] rounded border p-2">
          {variations.length === 0 ? (
            <p className="text-xs text-muted-foreground">AI results will appear here. Generate variations, then click one to accept.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {variations.map((v) => (
                <div key={v.id} className="border rounded-md overflow-hidden">
                  <img src={v.preview} alt={v.label} className="w-full h-auto"/>
                  <div className="p-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{v.label}</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => acceptVariation(v)}>use</Button>
                      <Button size="icon" variant="ghost" onClick={() => {
                        const a = document.createElement("a");
                        a.href = v.preview; a.download = "variation.png"; a.click();
                      }} title="download"><Download className="w-4 h-4"/></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
