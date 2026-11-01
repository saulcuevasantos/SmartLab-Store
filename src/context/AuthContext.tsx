/**
 * SmartLab Store — Contexto Global de Autenticación y Permisos (RBAC)
 * docs/08_PLAN_SPRINTS.md (Sprint 03)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Profile,
  Customer,
  CustomerAddress,
  RegisterCustomerInput,
  LoginInput,
  UpdateProfileInput,
} from '../types/user.types';
import {
  getCurrentSession,
  registerCustomer,
  loginWithEmailPassword,
  logoutUser,
  updateCustomerProfile,
  saveCustomerAddress,
  deleteCustomerAddress,
  fetchUserSessionData,
  isAdminRole,
} from '../services/auth.service';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

export interface AuthContextValue {
  profile: Profile | null;
  customer: Customer | null;
  addresses: CustomerAddress[];
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<Profile>;
  register: (input: RegisterCustomerInput) => Promise<Profile>;
  logout: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  addAddress: (
    address: Omit<CustomerAddress, 'id' | 'customer_id' | 'created_at' | 'updated_at'>
  ) => Promise<void>;
  removeAddress: (addressId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const applySessionData = useCallback(
    (data: { profile: Profile; customer: Customer | null; addresses: CustomerAddress[] } | null) => {
      if (!data) {
        setProfile(null);
        setCustomer(null);
        setAddresses([]);
        return;
      }
      setProfile(data.profile);
      setCustomer(data.customer);
      setAddresses(data.addresses);
    },
    []
  );

  const refreshSession = useCallback(async () => {
    try {
      const data = await getCurrentSession();
      applySessionData(data);
    } catch {
      applySessionData(null);
    } finally {
      setIsLoading(false);
    }
  }, [applySessionData]);

  useEffect(() => {
    refreshSession();

    if (isSupabaseConfigured()) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const data = await fetchUserSessionData(session.user.id);
          applySessionData(data);
        } else {
          applySessionData(null);
        }
        setIsLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [refreshSession, applySessionData]);

  const login = async (input: LoginInput): Promise<Profile> => {
    const data = await loginWithEmailPassword(input);
    applySessionData(data);
    return data.profile;
  };

  const register = async (input: RegisterCustomerInput): Promise<Profile> => {
    const data = await registerCustomer(input);
    applySessionData(data);
    return data.profile;
  };

  const logout = async (): Promise<void> => {
    await logoutUser();
    applySessionData(null);
  };

  const updateProfile = async (input: UpdateProfileInput): Promise<void> => {
    if (!profile) throw new Error('No hay sesión activa.');
    const data = await updateCustomerProfile(profile.id, input);
    applySessionData(data);
  };

  const addAddress = async (
    address: Omit<CustomerAddress, 'id' | 'customer_id' | 'created_at' | 'updated_at'>
  ): Promise<void> => {
    if (!profile) throw new Error('No hay sesión activa.');
    const updatedAddresses = await saveCustomerAddress(profile.id, address);
    setAddresses(updatedAddresses);
  };

  const removeAddress = async (addressId: string): Promise<void> => {
    if (!profile) throw new Error('No hay sesión activa.');
    const updatedAddresses = await deleteCustomerAddress(profile.id, addressId);
    setAddresses(updatedAddresses);
  };

  const isAuthenticated = Boolean(profile && profile.is_active);
  const isAdmin = Boolean(profile && profile.is_active && isAdminRole(profile.role_id));

  return (
    <AuthContext.Provider
      value={{
        profile,
        customer,
        addresses,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        updateProfile,
        addAddress,
        removeAddress,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext debe utilizarse dentro de un <AuthProvider>.');
  }
  return context;
}
