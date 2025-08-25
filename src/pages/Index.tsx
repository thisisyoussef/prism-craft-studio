import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 gradient-subtle opacity-50"></div>
      
      <Navigation />
      <HeroSection />
      
      <div className="relative z-10 px-6 max-w-6xl mx-auto">
        <FeaturesSection />
      </div>
    </div>
  );
};

export default Index;
