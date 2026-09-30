/**
 * Payload CMS Collection: Files
 *
 * Stores metadata and upload status for Drive-style files.
 * NEVER stores plaintext data.
 */

export const FilesCollection = {
  slug: "files",
  admin: {
    useAsTitle: "originalName",
    defaultColumns: [
      "originalName",
      "ownerWallet",
      "size",
      "uploadStatus",
      "integrityStatus",
      "createdAt",
    ],
  },
  fields: [
    {
      name: "ownerWallet",
      type: "text",
      required: true,
      index: true,
    },
    {
      name: "originalName",
      type: "text",
      required: true,
    },
    {
      name: "size",
      type: "number",
      required: true,
    },
    {
      name: "mimeType",
      type: "text",
      required: true,
    },
    {
      name: "totalChunks",
      type: "number",
      required: true,
      defaultValue: 1,
    },
    {
      name: "chunkSize",
      type: "number",
      required: true,
      defaultValue: 8388608, // 8 MB default
    },
    {
      name: "encryptionAlgorithm",
      type: "text",
      required: true,
      defaultValue: "AES-256-GCM",
    },
    {
      name: "integrityAlgorithm",
      type: "text",
      required: true,
      defaultValue: "SHA-256",
    },
    {
      name: "manifestCID",
      type: "text",
    },
    {
      name: "uploadStatus",
      type: "select",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Encrypting", value: "encrypting" },
        { label: "Uploading", value: "uploading" },
        { label: "Paused", value: "paused" },
        { label: "Verifying", value: "verifying" },
        { label: "Completed", value: "completed" },
        { label: "Failed", value: "failed" },
      ],
      defaultValue: "pending",
      required: true,
    },
    {
      name: "integrityStatus",
      type: "select",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Verified", value: "verified" },
        { label: "Failed", value: "failed" },
      ],
      defaultValue: "pending",
      required: true,
    },
    {
      name: "logicalPath",
      type: "text",
      required: true,
    },
    {
      name: "createdAt",
      type: "date",
      required: true,
    },
    {
      name: "updatedAt",
      type: "date",
      required: true,
    },
  ],
};
