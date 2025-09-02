import Navigation from "@/components/Navigation";
import TwoStepCustomizer from "@/components/TwoStepCustomizer";

const Customize = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10 px-6 max-w-6xl mx-auto py-8">
        <TwoStepCustomizer />
      </div>
    </div>
  );
};

export default Customize;
