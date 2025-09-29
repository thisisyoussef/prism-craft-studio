import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { setToken } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';

export default function Layout({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const qc = useQueryClient();

  function logout() {
    setToken(null);
    qc.clear();
    nav('/login');
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-brand-100 text-brand-800' : 'text-gray-700 hover:bg-gray-100'}`;

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/orders" className="font-semibold text-lg text-gray-900">Prism Craft Admin</Link>
          <nav className="flex items-center gap-2">
            <NavLink to="/orders" className={linkClass}>Orders</NavLink>
            <NavLink to="/products" className={linkClass}>Products</NavLink>
          </nav>
          <div className="ml-auto">
            <button onClick={logout} className="px-3 py-1.5 text-sm rounded-md bg-gray-900 text-white hover:bg-gray-800">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto w-full p-4">
        {children}
      </main>
    </div>
  );
}
