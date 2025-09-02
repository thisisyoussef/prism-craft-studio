import { Link } from "react-router-dom";
import { Twitter, Instagram, Linkedin, Github } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SiteFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand & Socials */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="PTRN logo"
                className="h-7 w-7 rounded-sm border border-border"
              />
              <div className="text-lg font-semibold tracking-tight">PTRN</div>
            </div>
            <p className="text-sm text-muted-foreground leading-6">
              Transparent custom apparel for organizations and businesses. Real-time pricing,
              designer collaboration, and full production tracking.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://twitter.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="md:col-span-5 grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <div className="text-xs font-semibold mb-3 uppercase tracking-wide text-muted-foreground">Product</div>
              <ul className="space-y-2 text-sm">
                <li><Link to="/catalog" className="text-muted-foreground hover:text-foreground transition-colors">Products</Link></li>
                <li><Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/samples" className="text-muted-foreground hover:text-foreground transition-colors">Samples</Link></li>
                <li><Link to="/designers" className="text-muted-foreground hover:text-foreground transition-colors">Designers</Link></li>
                <li><Link to="/case-studies" className="text-muted-foreground hover:text-foreground transition-colors">Case Studies</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold mb-3 uppercase tracking-wide text-muted-foreground">Company</div>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link></li>
                <li><Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link></li>
                <li><Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors">Settings</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold mb-3 uppercase tracking-wide text-muted-foreground">Legal</div>
              <ul className="space-y-2 text-sm">
                <li><Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms</Link></li>
                <li><Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>

          {/* Newsletter */}
          <div className="md:col-span-3">
            <div className="text-sm font-semibold mb-3">Stay in the loop</div>
            <p className="text-sm text-muted-foreground mb-4">Get updates on new products and case studies.</p>
            <form
              className="flex w-full items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <Input
                type="email"
                placeholder="you@company.com"
                aria-label="Email address"
                className="h-11"
                required
              />
              <Button type="submit" className="h-11 px-5">Subscribe</Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">We respect your privacy. Unsubscribe anytime.</p>
          </div>
        </div>

        <div className="mt-12 border-t pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">© {year} PTRN. All rights reserved.</div>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <span className="text-muted-foreground/50">•</span>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;

