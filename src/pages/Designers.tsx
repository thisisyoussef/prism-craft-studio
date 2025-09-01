import Navigation from "@/components/Navigation";
import DesignerBooking from "@/components/DesignerBooking";
import { ScrollReveal } from "@/components/ScrollReveal";

const Designers = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10">
        <ScrollReveal variant="fade-up" distancePx={24}>
          <DesignerBooking />
        </ScrollReveal>
      </div>
    </div>
  );
};

export default Designers;
