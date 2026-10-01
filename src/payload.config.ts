import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import { UsersCollection } from "./payload/collections/Users";
import { FilesCollection } from "./payload/collections/Files";
import { FileChunksCollection } from "./payload/collections/FileChunks";
import { SharesCollection } from "./payload/collections/Shares";
import { ActivityCollection } from "./payload/collections/Activity";

/**
 * Payload CMS Configuration for SecureVault
 *
 * Configures the decentralized storage metadata backend with PostgreSQL:
 * - Users: Wallet identity records (MetaMask & VaultX)
 * - Files: Drive-style encrypted file entries
 * - FileChunks: Encrypted IPFS chunk references & integrity checksums
 * - Shares: Key-agreement envelopes, download limits, expiration & revocation
 * - Activity: Immutable audit trail for all operations
 */
export const payloadConfig = buildConfig({
  admin: {
    user: "users",
    meta: {
      titleSuffix: "— SecureVault Storage Console",
    },
  },
  collections: [
    UsersCollection,
    FilesCollection,
    FileChunksCollection,
    SharesCollection,
    ActivityCollection,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "securevault_default_secret_key_minimum_32_characters_long",
  db: postgresAdapter({
    pool: {
      connectionString:
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@127.0.0.1:5432/securevault",
    },
  }),
});

export default payloadConfig;
