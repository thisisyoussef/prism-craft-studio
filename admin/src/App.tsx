import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { api } from './lib/api';
import Login from './pages/Login';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import LeadTimes from './pages/LeadTimes';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient();

function useAuth() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: async () => {
      const res = await api.get('/auth/profile');
      return res.data.user as { id: string; email: string; role: 'admin' | 'customer'; firstName: string; lastName: string };
    },
    retry: false,
  });
  return { user: data, isLoading, isError };
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/orders"
          element={
            <Protected>
              <Layout>
                <Orders />
              </Layout>
            </Protected>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <Protected>
              <Layout>
                <OrderDetail />
              </Layout>
            </Protected>
          }
        />
        <Route
          path="/products"
          element={
            <Protected>
              <Layout>
                <ErrorBoundary>
                  <Products />
                </ErrorBoundary>
              </Layout>
            </Protected>
          }
        />
        <Route
          path="/products/:id"
          element={
            <Protected>
              <Layout>
                <ErrorBoundary>
                  <ProductDetail />
                </ErrorBoundary>
              </Layout>
            </Protected>
          }
        />
        <Route
          path="/settings/lead-times"
          element={
            <Protected>
              <Layout>
                <ErrorBoundary>
                  <LeadTimes />
                </ErrorBoundary>
              </Layout>
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>
    </QueryClientProvider>
  );
}
