import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store";
import AuthDialog from "./AuthDialog";
import { LogOut, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Navigation = () => {
  const { user, signOut, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                <span className="text-muted-foreground">
                  {user.user_metadata?.company_name || user.email}
                </span>
              </div>
              <Button variant="ghost" size="lg" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => {
                  toast({
                    title: "Dashboard",
                    description: "Dashboard feature coming soon!"
                  });
                }}
              >
                Dashboard
              </Button>
            </div>
          ) : (
            <>
              <AuthDialog 
                trigger={<Button variant="ghost" size="lg">Sign In</Button>}
                defaultTab="signin"
              />
              <AuthDialog 
                trigger={<Button variant="hero" size="lg">Get Started</Button>}
                defaultTab="signup"
              />
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;