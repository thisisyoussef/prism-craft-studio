import { Button } from "@/components/ui/button";

const Navigation = () => {
  return (
    <nav className="relative z-10 px-6 py-8">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="text-2xl font-medium tracking-tight text-foreground">
          prism
        </div>
        
        <div className="hidden md:flex space-x-8 text-sm font-medium">
          <a 
            href="#capabilities" 
            className="text-foreground hover:text-muted-foreground transition-colors duration-200"
          >
            Capabilities
          </a>
          <a 
            href="#materials" 
            className="text-foreground hover:text-muted-foreground transition-colors duration-200"
          >
            Materials
          </a>
          <a 
            href="#process" 
            className="text-foreground hover:text-muted-foreground transition-colors duration-200"
          >
            Process
          </a>
          <a 
            href="#pricing" 
            className="text-foreground hover:text-muted-foreground transition-colors duration-200"
          >
            Pricing
          </a>
        </div>
        
        <Button variant="hero" size="lg">
          Start a Project
        </Button>
      </div>
    </nav>
  );
};

export default Navigation;