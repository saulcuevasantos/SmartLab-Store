import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Product } from '../types/catalog.types';
import { Coupon } from '../types/order.types';
import { getEffectivePricePEN } from '../services/catalog.service';
import {
  calculateCouponDiscountPEN,
  validateCouponForSubtotal,
} from '../services/coupons.service';
import { formatPEN } from '../utils/currency';

const CART_STORAGE_KEY = 'smartlab_cart_state_v1';

export interface CartItem {
  product: Product;
  quantity: 1; // Regla comercial: licencia unitaria digital (quantity = 1 sin duplicados)
  addedAt: string;
}

export interface CartItemFinancialBreakdown extends CartItem {
  unitPricePen: number;
  regularPricePen: number;
  couponDiscountAllocatedPen: number;
  netItemPricePen: number;
}

export interface AddToCartResult {
  added: boolean;
  reason?: 'ADDED' | 'ALREADY_IN_CART' | 'CUSTOM_PRODUCT_NOT_ALLOWED';
  message: string;
}

export interface CartNotice {
  type: 'success' | 'warning' | 'info' | 'error';
  text: string;
}

export interface CartContextValue {
  items: CartItemFinancialBreakdown[];
  itemCount: number;
  regularSubtotalPen: number;
  grossSubtotalPen: number;
  promoSavingsPen: number;
  appliedCoupon: Coupon | null;
  discountPen: number;
  netTotalPen: number;
  isCartDrawerOpen: boolean;
  cartNotice: CartNotice | null;
  isInCart: (productId: string) => boolean;
  addItem: (product: Product, options?: { openDrawer?: boolean }) => AddToCartResult;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  applyCouponCode: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  clearCartNotice: () => void;
}

export const CartContext = createContext<CartContextValue | undefined>(undefined);

interface StoredCartState {
  items: CartItem[];
  appliedCoupon: Coupon | null;
}

function loadStoredCart(): StoredCartState {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [], appliedCoupon: null };
    const parsed = JSON.parse(raw) as Partial<StoredCartState>;

    // Deduplicar defensivamente por product.id y forzar quantity = 1
    const uniqueMap = new Map<string, CartItem>();
    if (Array.isArray(parsed.items)) {
      for (const entry of parsed.items) {
        if (
          entry &&
          entry.product &&
          typeof entry.product.id === 'string' &&
          entry.product.modalidad !== 'PERSONALIZADO' &&
          !uniqueMap.has(entry.product.id)
        ) {
          uniqueMap.set(entry.product.id, {
            product: entry.product,
            quantity: 1,
            addedAt: entry.addedAt || new Date().toISOString(),
          });
        }
      }
    }

    return {
      items: Array.from(uniqueMap.values()),
      appliedCoupon: parsed.appliedCoupon || null,
    };
  } catch {
    return { items: [], appliedCoupon: null };
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = useMemo(() => loadStoredCart(), []);

  const [rawItems, setRawItems] = useState<CartItem[]>(initial.items);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(initial.appliedCoupon);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [cartNotice, setCartNotice] = useState<CartNotice | null>(null);

  // Persistir automáticamente en localStorage
  useEffect(() => {
    try {
      const payload: StoredCartState = {
        items: rawItems,
        appliedCoupon,
      };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignorar restricciones de almacenamiento privado
    }
  }, [rawItems, appliedCoupon]);

  // Cálculos de subtotales en Soles (PEN / S/)
  const { regularSubtotalPen, grossSubtotalPen, promoSavingsPen } = useMemo(() => {
    let regSum = 0;
    let grossSum = 0;

    for (const item of rawItems) {
      const eff = getEffectivePricePEN(item.product);
      const reg =
        item.product.modalidad === 'FREE'
          ? 0
          : Math.max(eff, Number(item.product.price_regular_pen || 0));
      regSum += reg;
      grossSum += eff;
    }

    const cleanReg = Number(regSum.toFixed(2));
    const cleanGross = Number(grossSum.toFixed(2));
    const savings = Math.max(0, Number((cleanReg - cleanGross).toFixed(2)));

    return {
      regularSubtotalPen: cleanReg,
      grossSubtotalPen: cleanGross,
      promoSavingsPen: savings,
    };
  }, [rawItems]);

  // Verificar que el cupón aplicado siga cumpliendo el mínimo de compra cuando cambia el carrito
  useEffect(() => {
    if (!appliedCoupon) return;

    if (rawItems.length === 0 || grossSubtotalPen <= 0) {
      setAppliedCoupon(null);
      return;
    }

    if (grossSubtotalPen < appliedCoupon.minimum_order_pen) {
      const minRequired = formatPEN(appliedCoupon.minimum_order_pen);
      const removedCode = appliedCoupon.code;
      setAppliedCoupon(null);
      setCartNotice({
        type: 'warning',
        text: `El cupón ${removedCode} se retiró porque el subtotal actual es menor al mínimo requerido (${minRequired}).`,
      });
    }
  }, [rawItems.length, grossSubtotalPen, appliedCoupon]);

  // Descuento y Total Neto (jamás negativo)
  const { discountPen, netTotalPen } = useMemo(() => {
    if (!appliedCoupon || grossSubtotalPen <= 0) {
      return {
        discountPen: 0,
        netTotalPen: grossSubtotalPen,
      };
    }

    const disc = calculateCouponDiscountPEN(appliedCoupon, grossSubtotalPen);
    const net = Math.max(0, Number((grossSubtotalPen - disc).toFixed(2)));

    return {
      discountPen: disc,
      netTotalPen: net,
    };
  }, [appliedCoupon, grossSubtotalPen]);

  // Desglose financiero por ítem (prorrateando el cupón entre productos con precio > 0 sin errores de redondeo)
  const items: CartItemFinancialBreakdown[] = useMemo(() => {
    if (rawItems.length === 0) return [];

    let remainingDiscountToAllocate = discountPen;
    const paidItemsIndices = rawItems
      .map((it, idx) => ({ idx, price: getEffectivePricePEN(it.product) }))
      .filter((x) => x.price > 0);

    return rawItems.map((item, idx) => {
      const unitPricePen = Number(getEffectivePricePEN(item.product).toFixed(2));
      const regularPricePen =
        item.product.modalidad === 'FREE'
          ? 0
          : Number(item.product.price_regular_pen.toFixed(2));

      let itemDiscount = 0;

      if (discountPen > 0 && unitPricePen > 0 && grossSubtotalPen > 0) {
        const isLastPaidItem =
          paidItemsIndices.length > 0 &&
          paidItemsIndices[paidItemsIndices.length - 1].idx === idx;

        if (isLastPaidItem) {
          itemDiscount = Math.min(
            unitPricePen,
            Math.max(0, Number(remainingDiscountToAllocate.toFixed(2)))
          );
        } else {
          const proportional = Number(
            ((discountPen * unitPricePen) / grossSubtotalPen).toFixed(2)
          );
          itemDiscount = Math.min(unitPricePen, proportional);
          remainingDiscountToAllocate = Number(
            (remainingDiscountToAllocate - itemDiscount).toFixed(2)
          );
        }
      }

      const netItemPricePen = Math.max(0, Number((unitPricePen - itemDiscount).toFixed(2)));

      return {
        ...item,
        unitPricePen,
        regularPricePen,
        couponDiscountAllocatedPen: itemDiscount,
        netItemPricePen,
      };
    });
  }, [rawItems, discountPen, grossSubtotalPen]);

  const isInCart = useCallback(
    (productId: string) => rawItems.some((item) => item.product.id === productId),
    [rawItems]
  );

  const addItem = useCallback(
    (product: Product, options?: { openDrawer?: boolean }): AddToCartResult => {
      if (product.modalidad === 'PERSONALIZADO') {
        const msg =
          'Los productos PERSONALIZADO requieren cotización a medida y no se agregan al carrito estándar.';
        setCartNotice({ type: 'warning', text: msg });
        return {
          added: false,
          reason: 'CUSTOM_PRODUCT_NOT_ALLOWED',
          message: msg,
        };
      }

      const alreadyExists = rawItems.some((item) => item.product.id === product.id);
      if (alreadyExists) {
        const msg = `"${product.name}" ya se encuentra en tu carrito (1 licencia digital por pedido).`;
        setCartNotice({ type: 'info', text: msg });
        if (options?.openDrawer !== false) {
          setIsCartDrawerOpen(true);
        }
        return {
          added: false,
          reason: 'ALREADY_IN_CART',
          message: msg,
        };
      }

      const newItem: CartItem = {
        product,
        quantity: 1,
        addedAt: new Date().toISOString(),
      };

      setRawItems((prev) => [...prev, newItem]);
      const msg = `"${product.name}" se agregó a tu carrito en Soles (${formatPEN(
        getEffectivePricePEN(product)
      )}).`;
      setCartNotice({ type: 'success', text: msg });

      if (options?.openDrawer !== false) {
        setIsCartDrawerOpen(true);
      }

      return {
        added: true,
        reason: 'ADDED',
        message: msg,
      };
    },
    [rawItems]
  );

  const removeItem = useCallback((productId: string) => {
    setRawItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setRawItems([]);
    setAppliedCoupon(null);
    setCartNotice(null);
  }, []);

  const applyCouponCode = useCallback(
    async (code: string): Promise<{ success: boolean; message: string }> => {
      const validation = await validateCouponForSubtotal(code, grossSubtotalPen);

      if (!validation.valid || !validation.coupon) {
        const errorMsg = validation.error || 'No se pudo aplicar el cupón.';
        setCartNotice({ type: 'error', text: errorMsg });
        return { success: false, message: errorMsg };
      }

      setAppliedCoupon(validation.coupon);
      const successMsg = `Cupón ${validation.coupon.code} aplicado: ahorras ${formatPEN(
        validation.discountPen
      )}.`;
      setCartNotice({ type: 'success', text: successMsg });
      return { success: true, message: successMsg };
    },
    [grossSubtotalPen]
  );

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCartNotice({ type: 'info', text: 'El cupón de descuento fue retirado del carrito.' });
  }, []);

  const openCartDrawer = useCallback(() => setIsCartDrawerOpen(true), []);
  const closeCartDrawer = useCallback(() => setIsCartDrawerOpen(false), []);
  const clearCartNotice = useCallback(() => setCartNotice(null), []);

  const value: CartContextValue = {
    items,
    itemCount: items.length,
    regularSubtotalPen,
    grossSubtotalPen,
    promoSavingsPen,
    appliedCoupon,
    discountPen,
    netTotalPen,
    isCartDrawerOpen,
    cartNotice,
    isInCart,
    addItem,
    removeItem,
    clearCart,
    applyCouponCode,
    removeCoupon,
    openCartDrawer,
    closeCartDrawer,
    clearCartNotice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
