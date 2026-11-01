import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout/PublicLayout';
import { PrivateRoute } from '../components/guards/PrivateRoute';
import { AdminRoute } from '../components/guards/AdminRoute';
import { LoginPage } from '../modules/store/account/LoginPage';
import { RegisterPage } from '../modules/store/account/RegisterPage';
import { ProfilePage } from '../modules/store/account/ProfilePage';
import { MyOrdersPage } from '../modules/store/account/MyOrdersPage';
import { OrderDetailPage } from '../modules/store/account/OrderDetailPage';
import { HomePage } from '../modules/store/home/HomePage';
import { CatalogPage } from '../modules/store/catalog/CatalogPage';
import { ProductDetailPage } from '../modules/store/product-detail/ProductDetailPage';
import { CustomRequestPage } from '../modules/store/custom-request/CustomRequestPage';
import { SupportFaqPage } from '../modules/store/support/SupportFaqPage';
import { CartPage } from '../modules/store/cart/CartPage';
import { CheckoutPage } from '../modules/store/checkout/CheckoutPage';

// Carga diferida (Lazy Loading) del Panel Administrativo — Sprint 11 Optimización de Bundle
const AdminLayout = lazy(() =>
  import('../layouts/AdminLayout/AdminLayout').then((m) => ({ default: m.AdminLayout }))
);
const DashboardPage = lazy(() =>
  import('../modules/admin/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const HomeAdminPage = lazy(() =>
  import('../modules/admin/home/HomeAdminPage').then((m) => ({
    default: m.HomeAdminPage,
  }))
);
const CategoriesAdminPage = lazy(() =>
  import('../modules/admin/categories/CategoriesAdminPage').then((m) => ({
    default: m.CategoriesAdminPage,
  }))
);
const ProductsAdminPage = lazy(() =>
  import('../modules/admin/products/ProductsAdminPage').then((m) => ({
    default: m.ProductsAdminPage,
  }))
);
const PricingAdminPage = lazy(() =>
  import('../modules/admin/pricing/PricingAdminPage').then((m) => ({
    default: m.PricingAdminPage,
  }))
);
const CouponsAdminPage = lazy(() =>
  import('../modules/admin/coupons/CouponsAdminPage').then((m) => ({
    default: m.CouponsAdminPage,
  }))
);
const CustomersAdminPage = lazy(() =>
  import('../modules/admin/customers/CustomersAdminPage').then((m) => ({
    default: m.CustomersAdminPage,
  }))
);
const CustomRequestsAdminPage = lazy(() =>
  import('../modules/admin/orders/CustomRequestsAdminPage').then((m) => ({
    default: m.CustomRequestsAdminPage,
  }))
);
const OrdersAdminPage = lazy(() =>
  import('../modules/admin/orders/OrdersAdminPage').then((m) => ({
    default: m.OrdersAdminPage,
  }))
);
const PaymentsAdminPage = lazy(() =>
  import('../modules/admin/payments/PaymentsAdminPage').then((m) => ({
    default: m.PaymentsAdminPage,
  }))
);
const DeliveriesAdminPage = lazy(() =>
  import('../modules/admin/deliveries/DeliveriesAdminPage').then((m) => ({
    default: m.DeliveriesAdminPage,
  }))
);
const CancellationsAdminPage = lazy(() =>
  import('../modules/admin/cancellations/CancellationsAdminPage').then((m) => ({
    default: m.CancellationsAdminPage,
  }))
);
const AuditLogsAdminPage = lazy(() =>
  import('../modules/admin/audit/AuditLogsAdminPage').then((m) => ({
    default: m.AuditLogsAdminPage,
  }))
);
const ReportsAdminPage = lazy(() =>
  import('../modules/admin/reports-settings/ReportsAdminPage').then((m) => ({
    default: m.ReportsAdminPage,
  }))
);
const SettingsAdminPage = lazy(() =>
  import('../modules/admin/reports-settings/SettingsAdminPage').then((m) => ({
    default: m.SettingsAdminPage,
  }))
);

const AdminLazyFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
    <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 shadow-2xs text-xs sm:text-sm font-semibold text-slate-600">
      Cargando módulo administrativo de SmartLab Store...
    </div>
  </div>
);

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<AdminLazyFallback />}>
        <Routes>
          {/* Rutas de la Tienda Pública */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="catalogo" element={<CatalogPage />} />
            <Route path="producto/:slug" element={<ProductDetailPage />} />
            <Route path="solicitud-personalizada" element={<CustomRequestPage />} />
            <Route path="soporte" element={<SupportFaqPage />} />
            <Route path="carrito" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="registro" element={<RegisterPage />} />

            {/* Rutas Protegidas del Cliente (<PrivateRoute>) */}
            <Route path="mi-cuenta" element={<PrivateRoute />}>
              <Route index element={<Navigate to="/mi-cuenta/perfil" replace />} />
              <Route path="perfil" element={<ProfilePage />} />
              <Route path="pedidos" element={<MyOrdersPage />} />
              <Route path="pedidos/:orderId" element={<OrderDetailPage />} />
            </Route>
          </Route>

          {/* Rutas Protegidas del Panel Administrativo (<AdminRoute>) con Lazy Loading */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="home" element={<HomeAdminPage />} />
            <Route path="categories" element={<CategoriesAdminPage />} />
            <Route path="products" element={<ProductsAdminPage />} />
            <Route path="pricing" element={<PricingAdminPage />} />
            <Route path="coupons" element={<CouponsAdminPage />} />
            <Route path="customers" element={<CustomersAdminPage />} />
            <Route path="custom-requests" element={<CustomRequestsAdminPage />} />
            <Route path="settings" element={<SettingsAdminPage />} />

            {/* Módulos del Sprint 09 */}
            <Route path="orders" element={<OrdersAdminPage />} />
            <Route path="payments" element={<PaymentsAdminPage />} />
            <Route path="deliveries" element={<DeliveriesAdminPage />} />

            {/* Módulos del Sprint 10 */}
            <Route path="cancellations" element={<CancellationsAdminPage />} />
            <Route path="audit" element={<AuditLogsAdminPage />} />
            <Route path="reports" element={<ReportsAdminPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
