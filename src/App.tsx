import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { Toaster as HotToaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { lazy, Suspense } from 'react';
import { featureFlags } from "@/lib/featureFlags";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Catalog from "./pages/Catalog";
import Pricing from "./pages/Pricing";
import Samples from "./pages/Samples";
import Designers from "./pages/Designers";
import Customize from "./pages/Customize";
import Dashboard from "./pages/Dashboard";
import OrderDetails from "./pages/OrderDetails";
import AdminInventory from "./pages/AdminInventory";
import AdminNewProduct from "./pages/AdminNewProduct";
import AdminProductEditor from "./pages/AdminProductEditor";
import AdminOrders from "./pages/AdminOrders";
import AdminOrderDetail from "./pages/AdminOrderDetail";
import AdminGuestDrafts from "./pages/AdminGuestDrafts";
import FindMyOrder from "./pages/FindMyOrder";
import VerifyGuestLink from "./pages/VerifyGuestLink";
import GuestOrderPortal from "./pages/GuestOrderPortal";
import CheckEmail from "./pages/CheckEmail";
import Settings from "./pages/Settings";
import CaseStudies from "./pages/CaseStudies";
import CaseStudyArticle from "./pages/CaseStudyArticle";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import SiteFooter from "@/components/SiteFooter";
const ProductSpecs = lazy(() => import('./pages/ProductSpecs'));
const AiMockup = lazy(() => import('./pages/AiMockup'));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <HelmetProvider>
        <Toaster />
        <Sonner />
        <HotToaster position="top-right" />
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/samples" element={<Samples />} />
            {featureFlags.designers && (
              <Route path="/designers" element={<Designers />} />
            )}
            <Route path="/customize" element={<Customize />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route path="/case-studies/:slug" element={<CaseStudyArticle />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/admin/inventory" element={<AdminInventory />} />
            <Route path="/admin/inventory/new" element={<AdminNewProduct />} />
            <Route path="/admin/inventory/:productId" element={<AdminProductEditor />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
            <Route path="/admin/guest-drafts" element={<AdminGuestDrafts />} />
            {featureFlags.findOrder && (
              <Route path="/find-order" element={<FindMyOrder />} />
            )}
            <Route path="/guest/verify" element={<VerifyGuestLink />} />
            <Route path="/guest/orders" element={<GuestOrderPortal />} />
            <Route path="/check-email" element={<CheckEmail />} />
            <Route path="/products/:productId" element={<ProductSpecs />} />
            <Route path="/lab/ai-mockup" element={<AiMockup />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <SiteFooter />
        </BrowserRouter>
      </HelmetProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;


