import Navigation from "@/components/Navigation";
import DesignerBooking from "@/components/DesignerBooking";

const Designers = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10">
        <DesignerBooking />
      </div>
    </div>
  );
};

export default Designers;
