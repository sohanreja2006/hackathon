/**
 * SecureVault Frontend — Components Registry
 * 
 * Re-exports the application UI component structure:
 * - UI primitives & Owl Guardian companion
 * - Dashboard panels, modals, and file tables
 * - Vault upload & retrieval workflows
 * - Authentication controls
 */

export * from "@/components/ui/OwlCompanion";
export * from "@/components/dashboard/RecentFiles";
export * from "@/components/dashboard/FileDetailsModal";
export * from "@/components/dashboard/CreateSecureShareModal";
export * from "@/components/dashboard/ReceiveSecureFileModal";
export * from "@/components/encryption/FileEncryptionPanel";
export * from "@/components/vault/VaultTabs";
export * from "@/components/vault/VaultUploadPanel";
export * from "@/components/vault/VaultRetrievePanel";
export * from "@/components/auth/ProtectedRoute";
