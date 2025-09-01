import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SampleOrdering from "@/components/SampleOrdering";

const Samples = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10">
        <SampleOrdering />
      </div>
      <div className="h-16 md:hidden" aria-hidden="true" />
      <Footer />
    </div>
  );
};

export default Samples;
