import { Button } from "@/components/ui/button";

const Navigation = () => {
  return (
    <nav className="relative z-10 px-6 py-8">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="text-2xl font-medium tracking-tight text-foreground">
          PTRN
        </div>
        
        <div className="hidden md:flex space-x-8 text-sm font-medium">
          <a 
            href="#products" 
            className="text-foreground hover:text-muted-foreground transition-colors duration-200"
          >
            Products
          </a>
          <a 
            href="#pricing" 
            className="text-foreground hover:text-muted-foreground transition-colors duration-200"
          >
            Pricing
          </a>
          <a 
            href="#samples" 
            className="text-foreground hover:text-muted-foreground transition-colors duration-200"
          >
            Samples
          </a>
          <a 
            href="#designers" 
            className="text-foreground hover:text-muted-foreground transition-colors duration-200"
          >
            Designers
          </a>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="lg">
            Sign In
          </Button>
          <Button variant="hero" size="lg">
            Get Quote
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;