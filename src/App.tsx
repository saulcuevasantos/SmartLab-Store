/**
 * SmartLab Store — Aplicación Principal
 * docs/08_PLAN_SPRINTS.md — Sprint 03 (AuthProvider) y Sprint 06 (CartProvider)
 */

import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AppRouter } from './routes/AppRouter';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppRouter />
      </CartProvider>
    </AuthProvider>
  );
}
