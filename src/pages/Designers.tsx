import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import DesignerBooking from "@/components/DesignerBooking";

const Designers = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10">
        <DesignerBooking />
      </div>
      <div className="h-16 md:hidden" aria-hidden="true" />
      <Footer />
    </div>
  );
};

export default Designers;
