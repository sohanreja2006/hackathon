import type { CollectionConfig } from "payload";

/**
 * Payload CMS Collection: Users
 *
 * Scopes user accounts to unique Web3 wallet addresses (MetaMask or VaultX).
 * Never stores private keys, seed phrases, or wallet passwords.
 */
export const UsersCollection: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "walletAddress",
    defaultColumns: ["walletAddress", "status", "lastAuthenticatedAt", "createdAt"],
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: () => true, // Allows registration via wallet verification
    update: ({ req: { user } }) => Boolean(user),
    delete: () => false,
  },
  fields: [
    {
      name: "walletAddress",
      type: "text",
      required: true,
      unique: true,
      index: true,
      hooks: {
        beforeValidate: [
          ({ value }) => (typeof value === "string" ? value.toLowerCase() : value),
        ],
      },
    },
    {
      name: "publicEncryptionKey",
      type: "text",
      required: false,
    },
    {
      name: "keyFingerprint",
      type: "text",
      required: false,
    },
    {
      name: "status",
      type: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
      ],
      defaultValue: "active",
      required: true,
    },
    {
      name: "lastAuthenticatedAt",
      type: "date",
    },
  ],
  timestamps: true,
};

export default UsersCollection;
