import { Link } from "react-router-dom";
import { Github, Twitter, Linkedin, Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t bg-background/60 pb-16 md:pb-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="text-xl font-semibold tracking-tight">PTRN</div>
          <p className="text-muted-foreground mt-2">
            Custom apparel made simple. Fast, reliable, and built for teams.
          </p>
          <div className="flex items-center gap-3 mt-4 text-muted-foreground">
            <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="hover:text-foreground">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub" className="hover:text-foreground">
              <Github className="h-5 w-5" />
            </a>
            <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="hover:text-foreground">
              <Linkedin className="h-5 w-5" />
            </a>
            <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-foreground">
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div>
          <div className="font-medium mb-3">Product</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/catalog" className="hover:text-foreground">Products</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
            <li><Link to="/samples" className="hover:text-foreground">Samples</Link></li>
            <li><Link to="/designers" className="hover:text-foreground">Designers</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-medium mb-3">Company</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
            <li><Link to="/settings" className="hover:text-foreground">Settings</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-medium mb-3">Legal</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-xs text-muted-foreground flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <p>
            © {new Date().getFullYear()} PTRN. All rights reserved.
          </p>
          <p className="">
            Made with ❤️ for teams and organizations.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

