/**
 * Payload CMS Collection: Users
 *
 * Scopes user accounts to unique Web3 wallet addresses (MetaMask or VaultX).
 * Never stores private keys, seed phrases, or wallet passwords.
 */

export const UsersCollection = {
  slug: "users",
  admin: {
    useAsTitle: "walletAddress",
    defaultColumns: ["walletAddress", "network", "lastAuthenticatedAt", "createdAt"],
  },
  fields: [
    {
      name: "walletAddress",
      type: "text",
      required: true,
      unique: true,
      index: true,
    },
    {
      name: "network",
      type: "text",
      defaultValue: "Sepolia",
    },
    {
      name: "lastAuthenticatedAt",
      type: "date",
      required: true,
    },
    {
      name: "createdAt",
      type: "date",
      required: true,
    },
  ],
};
