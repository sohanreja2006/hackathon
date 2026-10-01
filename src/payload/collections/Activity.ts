import type { CollectionConfig } from "payload";

/**
 * Payload CMS Collection: Activity
 *
 * Immutable audit logs for identity, file, upload, download, and sharing actions.
 * NEVER stores cryptographic keys or plaintext data.
 */
export const ActivityCollection: CollectionConfig = {
  slug: "activity",
  admin: {
    useAsTitle: "action",
    defaultColumns: ["action", "userWallet", "fileId", "timestamp"],
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: () => true,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: "user",
      type: "relationship",
      relationTo: "users",
      required: false,
    },
    {
      name: "userWallet",
      type: "text",
      required: true,
      index: true,
      hooks: {
        beforeValidate: [
          ({ value }) => (typeof value === "string" ? value.toLowerCase() : value),
        ],
      },
    },
    {
      name: "file",
      type: "relationship",
      relationTo: "files",
      required: false,
    },
    {
      name: "fileId",
      type: "text",
      index: true,
    },
    {
      name: "share",
      type: "relationship",
      relationTo: "shares",
      required: false,
    },
    {
      name: "shareId",
      type: "text",
      index: true,
    },
    {
      name: "action",
      type: "select",
      options: [
        { label: "Wallet Authenticated", value: "wallet_authenticated" },
        { label: "File Created", value: "file_created" },
        { label: "Encryption Started", value: "encryption_started" },
        { label: "Encryption Completed", value: "encryption_completed" },
        { label: "Upload Started", value: "upload_started" },
        { label: "Upload Paused", value: "upload_paused" },
        { label: "Upload Resumed", value: "upload_resumed" },
        { label: "Upload Completed", value: "upload_completed" },
        { label: "Integrity Verified", value: "integrity_verified" },
        { label: "Download Started", value: "download_started" },
        { label: "Download Completed", value: "download_completed" },
        { label: "Share Created", value: "share_created" },
        { label: "Share Accessed", value: "share_accessed" },
        { label: "Share Revoked", value: "share_revoked" },
        { label: "Share Expired", value: "share_expired" },
      ],
      required: true,
      index: true,
    },
    {
      name: "metadata",
      type: "json",
    },
    {
      name: "timestamp",
      type: "date",
      required: true,
    },
  ],
  timestamps: true,
};

export default ActivityCollection;
