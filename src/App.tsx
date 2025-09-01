import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster as HotToaster } from 'react-hot-toast';
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
import Settings from "./pages/Settings";
import CaseStudies from "./pages/CaseStudies";
import CaseStudyArticle from "./pages/CaseStudyArticle";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HotToaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/samples" element={<Samples />} />
          <Route path="/designers" element={<Designers />} />
          <Route path="/customize" element={<Customize />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/case-studies" element={<CaseStudies />} />
          <Route path="/case-studies/:slug" element={<CaseStudyArticle />} />
          <Route path="/orders/:id" element={<OrderDetails />} />
          <Route path="/admin/inventory" element={<AdminInventory />} />
          <Route path="/admin/inventory/new" element={<AdminNewProduct />} />
          <Route path="/admin/inventory/:productId" element={<AdminProductEditor />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;


