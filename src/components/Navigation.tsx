import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store";
import AuthDialog from "./AuthDialog";
import { LogOut, User, Settings as SettingsIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useProfile } from "@/lib/profile";

const Navigation = () => {
  const { user, signOut, initialize } = useAuthStore();
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  useEffect(() => {
    console.log("Navigation: Initializing auth...");
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
          <Link to="/">PTRN</Link>
        </div>
        
        <div className="hidden md:flex space-x-8 text-sm font-medium">
          <Link 
            to="/catalog" 
            className="text-foreground hover:text-muted-foreground transition-colors duration-200"
          >
            Products
          </Link>
          <Link 
            to="/pricing" 
            className="text-foreground hover:text-muted-foreground transition-colors duration-200"
          >
            Pricing
          </Link>
          <Link 
            to="/samples" 
            className="text-foreground hover:text-muted-foreground transition-colors duration-200"
          >
            Samples
          </Link>
          <Link 
            to="/designers" 
            className="text-foreground hover:text-muted-foreground transition-colors duration-200"
          >
            Designers
          </Link>
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
              {/* Admin quick link */}
              {profile?.role === 'admin' ? (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/admin/inventory')}
                >
                  Admin
                </Button>
              ) : null}
              <Button variant="ghost" size="lg" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/settings')}
              >
                <SettingsIcon className="w-4 h-4" />
                Settings
              </Button>
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => navigate('/dashboard')}
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