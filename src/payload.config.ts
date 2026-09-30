import { UsersCollection } from "./payload/collections/Users";
import { FilesCollection } from "./payload/collections/Files";
import { ChunksCollection } from "./payload/collections/Chunks";
import { ManifestsCollection } from "./payload/collections/Manifests";

/**
 * Payload CMS Configuration for SecureVault
 *
 * Configures the decentralized storage metadata backend:
 * - Users: Wallet identity records
 * - Files: Drive-style encrypted file entries
 * - Chunks: Encrypted IPFS chunk references & integrity checksums
 * - Manifests: Cryptographic assembly schemas for local browser decryption
 */
export const payloadConfig = {
  admin: {
    user: "users",
    meta: {
      titleSuffix: "— SecureVault Storage Console",
    },
  },
  collections: [
    UsersCollection,
    FilesCollection,
    ChunksCollection,
    ManifestsCollection,
  ],
};

export default payloadConfig;
