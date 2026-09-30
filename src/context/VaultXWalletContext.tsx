"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  VaultXWalletIdentity,
  createVaultXWallet,
  getVaultXWalletIdentity,
  hasVaultXWallet,
  unlockVaultXWallet,
  lockVaultXWallet,
  destroyVaultXWallet,
} from "@/lib/vaultxWallet";

interface VaultXWalletContextType {
  identity: VaultXWalletIdentity | null;
  hasExistingWallet: boolean;
  isConnected: boolean;
  isCreating: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  createWallet: () => Promise<VaultXWalletIdentity>;
  unlockWallet: () => Promise<VaultXWalletIdentity>;
  disconnectWallet: () => void;
  destroyWallet: () => Promise<void>;
}

const VaultXWalletContext = createContext<VaultXWalletContextType | undefined>(undefined);

export function VaultXWalletProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<VaultXWalletIdentity | null>(null);
  const [hasExistingWallet, setHasExistingWallet] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Synchronize on mount
  useEffect(() => {
    async function loadIdentity() {
      const exists = await hasVaultXWallet();
      setHasExistingWallet(exists);
      if (exists) {
        const stored = getVaultXWalletIdentity();
        setIdentity(stored);
      }
    }
    loadIdentity();
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const createWallet = useCallback(async (): Promise<VaultXWalletIdentity> => {
    setIsCreating(true);
    try {
      const newIdentity = await createVaultXWallet();
      setIdentity(newIdentity);
      setHasExistingWallet(true);
      return newIdentity;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const unlockWallet = useCallback(async (): Promise<VaultXWalletIdentity> => {
    setIsCreating(true);
    try {
      const unlocked = await unlockVaultXWallet();
      setIdentity(unlocked);
      return unlocked;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    lockVaultXWallet();
    const updated = getVaultXWalletIdentity();
    setIdentity(updated);
  }, []);

  const destroyWallet = useCallback(async () => {
    await destroyVaultXWallet();
    setIdentity(null);
    setHasExistingWallet(false);
  }, []);

  const isConnected = !!identity && identity.status === "protected";

  return (
    <VaultXWalletContext.Provider
      value={{
        identity,
        hasExistingWallet,
        isConnected,
        isCreating,
        isModalOpen,
        openModal,
        closeModal,
        createWallet,
        unlockWallet,
        disconnectWallet,
        destroyWallet,
      }}
    >
      {children}
    </VaultXWalletContext.Provider>
  );
}

export function useVaultXWallet() {
  const context = useContext(VaultXWalletContext);
  if (!context) {
    throw new Error("useVaultXWallet must be used within a VaultXWalletProvider");
  }
  return context;
}
