import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store";
import AuthDialog from "./AuthDialog";
import { LogOut, User, Settings as SettingsIcon, Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useProfile } from "@/lib/profile";

const Navigation = () => {
  const { user, signOut, initialize } = useAuthStore();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);

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
    <>
    <nav className="fixed top-0 inset-x-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 py-4">
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
              <Button variant="ghost" size="lg" onClick={handleSignOut} className="hidden md:inline-flex">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/settings')}
                className="hidden md:inline-flex"
              >
                <SettingsIcon className="w-4 h-4" />
                Settings
              </Button>
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => navigate('/dashboard')}
                className="hidden md:inline-flex"
              >
                Dashboard
              </Button>
            </div>
          ) : (
            <>
              <AuthDialog 
                trigger={<Button variant="ghost" size="lg" className="hidden md:inline-flex">Sign In</Button>}
                defaultTab="signin"
              />
              <AuthDialog 
                trigger={<Button variant="hero" size="lg" className="hidden md:inline-flex">Get Started</Button>}
                defaultTab="signup"
              />
            </>
          )}
          {/* Mobile menu toggle */}
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {open && (
        <div className="md:hidden">
          <div className="absolute left-4 right-4 mt-3 rounded-lg border bg-popover text-popover-foreground shadow-lg">
            <div className="p-2">
              <div className="grid gap-1">
                <Link
                  to="/catalog"
                  className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setOpen(false)}
                >
                  Products
                </Link>
                <Link
                  to="/pricing"
                  className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  to="/samples"
                  className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setOpen(false)}
                >
                  Samples
                </Link>
                <Link
                  to="/designers"
                  className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setOpen(false)}
                >
                  Designers
                </Link>
              </div>
              <div className="my-2 h-px bg-border" />
              {user ? (
                <div className="grid gap-2 p-1">
                  {profile?.role === 'admin' ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOpen(false);
                        navigate('/admin/inventory');
                      }}
                    >
                      Admin
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setOpen(false);
                      handleSignOut();
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      navigate('/settings');
                    }}
                  >
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                  <Button
                    variant="hero"
                    onClick={() => {
                      setOpen(false);
                      navigate('/dashboard');
                    }}
                  >
                    Dashboard
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2 p-1">
                  <AuthDialog
                    trigger={<Button variant="ghost">Sign In</Button>}
                    defaultTab="signin"
                  />
                  <AuthDialog
                    trigger={<Button variant="hero">Get Started</Button>}
                    defaultTab="signup"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
    {/* Spacer to offset fixed nav height */}
    <div className="h-16 md:h-20" aria-hidden="true" />
    </>
  );
};

export default Navigation;