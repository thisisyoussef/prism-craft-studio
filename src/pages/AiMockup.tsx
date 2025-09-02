import Navigation from "@/components/Navigation";
import AiMockupEditor from "@/components/AiMockupEditor";

const AiMockup = () => {
  if ((import.meta as any)?.env?.DEV) {
    try {
      const envAny = (import.meta as any)?.env || {};
      console.log("[Env] AiMockup page mounted. MODE=", envAny.MODE, " DEV=", envAny.DEV, " PROD=", envAny.PROD, " BASE=", envAny.BASE);
    } catch {}
  }
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10 px-6 max-w-7xl mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-medium text-foreground">AI mockup editor</h1>
          <p className="text-muted-foreground">Upload a base image, drag overlays, sketch ideas, and apply AI edits. Experiment and export your mockup.</p>
        </div>
        <AiMockupEditor />
      </div>
    </div>
  );
};

export default AiMockup;
