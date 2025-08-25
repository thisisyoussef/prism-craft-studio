import Navigation from "@/components/Navigation";
import SampleOrdering from "@/components/SampleOrdering";

const Samples = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10">
        <SampleOrdering />
      </div>
    </div>
  );
};

export default Samples;
