import type { CollectionConfig } from "payload";

/**
 * Payload CMS Collection: Shares
 *
 * Stores access grants and key agreement envelopes for sharing encrypted files.
 * NEVER stores raw AES file keys. Only stores wrapped key envelopes.
 */
export const SharesCollection: CollectionConfig = {
  slug: "shares",
  admin: {
    useAsTitle: "shareId",
    defaultColumns: [
      "shareId",
      "fileId",
      "ownerWallet",
      "recipient",
      "status",
      "downloadCount",
      "expiresAt",
    ],
  },
  access: {
    read: () => true, // Access verified dynamically in endpoint
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: "shareId",
      type: "text",
      required: true,
      unique: true,
      index: true,
    },
    {
      name: "file",
      type: "relationship",
      relationTo: "files",
      required: false,
      index: true,
    },
    {
      name: "fileId",
      type: "text",
      required: true,
      index: true,
    },
    {
      name: "owner",
      type: "relationship",
      relationTo: "users",
      required: false,
      index: true,
    },
    {
      name: "ownerWallet",
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
      name: "recipient",
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
      name: "recipientPublicKeyFingerprint",
      type: "text",
    },
    {
      name: "encryptedFileKey",
      type: "text",
      required: true,
    },
    {
      name: "keyAgreementMetadata",
      type: "json",
    },
    {
      name: "expiresAt",
      type: "date",
      index: true,
    },
    {
      name: "maxDownloads",
      type: "number",
      defaultValue: 1,
    },
    {
      name: "downloadCount",
      type: "number",
      defaultValue: 0,
    },
    {
      name: "oneTime",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "burnAfterReading",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "burnDurationSeconds",
      type: "number",
      defaultValue: 60,
    },
    {
      name: "status",
      type: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Expired", value: "expired" },
        { label: "Revoked", value: "revoked" },
        { label: "Download Limit Reached", value: "download-limit-reached" },
      ],
      defaultValue: "active",
      required: true,
      index: true,
    },
    {
      name: "lastAccessedAt",
      type: "date",
    },
  ],
  timestamps: true,
};

export default SharesCollection;
