import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store";
import AuthDialog from "./AuthDialog";
import { LogOut, User, Settings as SettingsIcon, Menu, X, Home, Package, BadgeDollarSign, FlaskConical, BookOpen } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useProfile } from "@/lib/profile";

const Navigation = () => {
  const { user, signOut, initialize } = useAuthStore();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    console.log("Navigation: Initializing auth...");
    initialize();
  }, [initialize]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
    <nav className="fixed top-0 inset-x-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 py-2 md:py-3 pt-[env(safe-area-inset-top)] md:pt-0">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="text-2xl font-medium tracking-tight text-foreground">
          <Link to="/">PTRN</Link>
        </div>
        
        <div className="hidden md:flex space-x-6 text-sm font-medium">
          <Link 
            to="/catalog" 
            className={`transition-colors duration-200 ${isActive('/catalog') ? 'text-primary' : 'text-foreground hover:text-muted-foreground'}`}
          >
            Products
          </Link>
          <Link 
            to="/pricing" 
            className={`transition-colors duration-200 ${isActive('/pricing') ? 'text-primary' : 'text-foreground hover:text-muted-foreground'}`}
          >
            Pricing
          </Link>
          <Link 
            to="/samples" 
            className={`transition-colors duration-200 ${isActive('/samples') ? 'text-primary' : 'text-foreground hover:text-muted-foreground'}`}
          >
            Samples
          </Link>
          <Link 
            to="/designers" 
            className={`transition-colors duration-200 ${isActive('/designers') ? 'text-primary' : 'text-foreground hover:text-muted-foreground'}`}
          >
            Designers
          </Link>
          <Link 
            to="/case-studies" 
            className={`transition-colors duration-200 ${isActive('/case-studies') ? 'text-primary' : 'text-foreground hover:text-muted-foreground'}`}
          >
            Case Studies
          </Link>
        </div>
        
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                <span className="text-muted-foreground">
                  {user.user_metadata?.company_name || user.email}
                </span>
              </div>
              {/* Admin quick links */}
              {profile?.role === 'admin' ? (
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (location.pathname === '/admin/inventory') {
                        navigate('/admin/inventory', { replace: true });
                      } else {
                        navigate('/admin/inventory');
                      }
                    }}
                  >
                    Inventory
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (location.pathname === '/admin/orders') {
                        navigate('/admin/orders', { replace: true });
                      } else {
                        navigate('/admin/orders');
                      }
                    }}
                  >
                    Orders
                  </Button>
                </div>
              ) : null}
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden md:inline-flex">
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/settings')}
                className="hidden md:inline-flex"
              >
                <SettingsIcon className="w-4 h-4" />
                Settings
              </Button>
              <Button 
                variant="hero" 
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="hidden md:inline-flex"
              >
                Dashboard
              </Button>
            </div>
          ) : (
            <>
              <AuthDialog 
                trigger={<Button variant="ghost" size="sm" className="hidden md:inline-flex">Sign in</Button>}
                defaultTab="signin"
              />
              <Button 
                variant="hero" 
                size="sm" 
                className="hidden md:inline-flex"
                onClick={() => navigate('/carrier-setup')}
              >
                Sign up
              </Button>
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
        <div
          className="md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Main menu"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        >
          <div className="absolute left-4 right-4 mt-3 rounded-lg border bg-popover text-popover-foreground shadow-lg origin-top transition-all duration-200 ease-out animate-in fade-in-0 zoom-in-95">
            <div className="p-2">
              <div className="grid gap-1">
                <Link
                  to="/catalog"
                  className={`px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground ${isActive('/catalog') ? 'bg-accent/60 text-accent-foreground' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  Products
                </Link>
                <Link
                  to="/pricing"
                  className={`px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground ${isActive('/pricing') ? 'bg-accent/60 text-accent-foreground' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  to="/samples"
                  className={`px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground ${isActive('/samples') ? 'bg-accent/60 text-accent-foreground' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  Samples
                </Link>
                <Link
                  to="/designers"
                  className={`px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground ${isActive('/designers') ? 'bg-accent/60 text-accent-foreground' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  Designers
                </Link>
                <Link
                  to="/case-studies"
                  className={`px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground ${isActive('/case-studies') ? 'bg-accent/60 text-accent-foreground' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  Case Studies
                </Link>
              </div>
              <div className="my-2 h-px bg-border" />
              {user ? (
                <div className="grid gap-2 p-1">
                  {profile?.role === 'admin' ? (
                    <div className="grid gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setOpen(false);
                          if (location.pathname === '/admin/inventory') {
                            navigate('/admin/inventory', { replace: true });
                          } else {
                            navigate('/admin/inventory');
                          }
                        }}
                      >
                        Inventory
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setOpen(false);
                          if (location.pathname === '/admin/orders') {
                            navigate('/admin/orders', { replace: true });
                          } else {
                            navigate('/admin/orders');
                          }
                        }}
                      >
                        Orders
                      </Button>
                    </div>
                  ) : null}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setOpen(false);
                      handleSignOut();
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
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
                    trigger={<Button variant="ghost">Sign in</Button>}
                    defaultTab="signin"
                  />
                  <Button
                    variant="hero"
                    onClick={() => {
                      setOpen(false);
                      navigate('/carrier-setup');
                    }}
                  >
                    Sign up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
    {/* Spacer to offset fixed nav height */}
    <div className="h-14 md:h-16" aria-hidden="true" />
    {/* Bottom mobile navigation */}
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        <Link to="/" className={`flex flex-col items-center justify-center py-2.5 min-h-11 gap-1 text-xs ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`}>
          <Home className="h-6 w-6" />
          <span>Home</span>
        </Link>
        <Link to="/catalog" className={`flex flex-col items-center justify-center py-2.5 min-h-11 gap-1 text-xs ${isActive('/catalog') ? 'text-primary' : 'text-muted-foreground'}`}>
          <Package className="h-6 w-6" />
          <span>Products</span>
        </Link>
        <Link to="/pricing" className={`flex flex-col items-center justify-center py-2.5 min-h-11 gap-1 text-xs ${isActive('/pricing') ? 'text-primary' : 'text-muted-foreground'}`}>
          <BadgeDollarSign className="h-6 w-6" />
          <span>Pricing</span>
        </Link>
        <Link to="/samples" className={`flex flex-col items-center justify-center py-2.5 min-h-11 gap-1 text-xs ${isActive('/samples') ? 'text-primary' : 'text-muted-foreground'}`}>
          <FlaskConical className="h-6 w-6" />
          <span>Samples</span>
        </Link>
        <Link to="/case-studies" className={`flex flex-col items-center justify-center py-2.5 min-h-11 gap-1 text-xs ${isActive('/case-studies') ? 'text-primary' : 'text-muted-foreground'}`}>
          <BookOpen className="h-6 w-6" />
          <span>Cases</span>
        </Link>
      </div>
    </nav>
    </>
  );
};

export default Navigation;