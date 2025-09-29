import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, setToken } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();
  const location = useLocation() as any;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      const token = res.data?.token as string | undefined;
      if (!token) throw new Error('No token returned');
      setToken(token);
      const to = location.state?.from?.pathname || '/orders';
      nav(to, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white border rounded-lg p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-4">Sign in</h1>
        {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          className="w-full border rounded px-3 py-2 mb-3"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          className="w-full border rounded px-3 py-2 mb-4"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
