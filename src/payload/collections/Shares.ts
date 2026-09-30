/**
 * Payload CMS Collection: Shares
 *
 * Stores end-to-end encrypted key envelopes, recipient public key fingerprints,
 * expiration, download count limits, and share permissions.
 *
 * ZERO-KNOWLEDGE GUARANTEE:
 * - NEVER stores plaintext AES encryption keys.
 * - NEVER stores recipient private keys.
 * - Only stores asymmetric key agreement metadata and ciphertext envelopes.
 */

export const SharesCollection = {
  slug: "shares",
  admin: {
    useAsTitle: "shareCode",
    defaultColumns: [
      "shareCode",
      "fileName",
      "ownerWallet",
      "recipientUserId",
      "status",
      "downloadCount",
      "expiresAt",
      "createdAt",
    ],
  },
  fields: [
    {
      name: "shareCode",
      type: "text",
      required: true,
      unique: true,
      index: true,
    },
    {
      name: "fileId",
      type: "text",
      required: true,
      index: true,
    },
    {
      name: "fileName",
      type: "text",
      required: true,
    },
    {
      name: "fileSize",
      type: "number",
      required: true,
    },
    {
      name: "mimeType",
      type: "text",
      required: true,
    },
    {
      name: "ownerWallet",
      type: "text",
      required: true,
      index: true,
    },
    {
      name: "manifestCID",
      type: "text",
      required: false,
    },
    {
      name: "recipientUserId",
      type: "text",
      required: false,
      index: true,
    },
    {
      name: "recipientPublicKeyFingerprint",
      type: "text",
      required: false,
    },
    {
      name: "encryptedFileKey",
      type: "textarea",
      required: false,
    },
    {
      name: "keyAgreementMetadata",
      type: "json",
      required: false,
    },
    {
      name: "isQuickShare",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "quickShareEnvelope",
      type: "textarea",
      required: false,
    },
    {
      name: "encryptionAlgorithm",
      type: "text",
      defaultValue: "AES-256-GCM",
    },
    {
      name: "integrityAlgorithm",
      type: "text",
      defaultValue: "SHA-256",
    },
    {
      name: "expiresAt",
      type: "date",
      required: false,
    },
    {
      name: "maxDownloads",
      type: "number",
      required: false,
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
      name: "passwordProtected",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "passwordHash",
      type: "text",
      required: false,
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
      index: true,
    },
    {
      name: "createdAt",
      type: "date",
      required: true,
    },
    {
      name: "lastAccessedAt",
      type: "date",
      required: false,
    },
  ],
};
