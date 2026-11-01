/**
 * SmartLab Store — Layout Principal de la Tienda Pública (Fiel a Techoze-04)
 * docs/06_DISENO_VISUAL_UX_UI.md & docs/08_PLAN_SPRINTS.md (Sprint 04 y Sprint 06)
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { useCart } from '../../hooks/useCart';
import { MiniCartDrawer } from '../../modules/store/cart/MiniCartDrawer';

export const PublicLayout: React.FC = () => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const {
    itemCount,
    netTotalPen,
    isCartDrawerOpen,
    openCartDrawer,
    closeCartDrawer,
  } = useCart();

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F8] text-[#1E293B]">
      <Header
        isMobileDrawerOpen={isMobileDrawerOpen}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
        isCartDrawerOpen={isCartDrawerOpen}
        onOpenCartDrawer={openCartDrawer}
        onCloseCartDrawer={closeCartDrawer}
        cartCount={itemCount}
        cartTotalPen={netTotalPen}
      />

      <main className="flex-1 w-full">
        <Outlet />
      </main>

      <Footer
        onOpenMobileCategories={() => setIsMobileDrawerOpen(true)}
        cartCount={itemCount}
      />

      {/* Drawer desplegable del Mini-Carrito (Sprint 06) */}
      <MiniCartDrawer />
    </div>
  );
};
