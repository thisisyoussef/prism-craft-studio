import Navigation from "@/components/Navigation";
import SampleOrdering from "@/components/SampleOrdering";
import { ScrollReveal } from "@/components/ScrollReveal";

const Samples = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10">
        <ScrollReveal variant="fade-up" distancePx={24}>
          <SampleOrdering />
        </ScrollReveal>
      </div>
    </div>
  );
};

export default Samples;
