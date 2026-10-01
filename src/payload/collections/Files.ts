import type { CollectionConfig } from "payload";

/**
 * Payload CMS Collection: Files
 *
 * Stores metadata and upload status for Drive-style files.
 * NEVER stores plaintext data or raw encryption keys.
 */
export const FilesCollection: CollectionConfig = {
  slug: "files",
  admin: {
    useAsTitle: "filename",
    defaultColumns: [
      "filename",
      "ownerWallet",
      "size",
      "status",
      "manifestCID",
      "createdAt",
    ],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      return {
        owner: { equals: user.id },
      };
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false;
      return {
        owner: { equals: user.id },
      };
    },
    delete: ({ req: { user } }) => {
      if (!user) return false;
      return {
        owner: { equals: user.id },
      };
    },
  },
  fields: [
    {
      name: "fileId",
      type: "text",
      required: true,
      unique: true,
      index: true,
    },
    {
      name: "owner",
      type: "relationship",
      relationTo: "users",
      required: true,
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
      name: "filename",
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
      index: true,
    },
    {
      name: "status",
      type: "select",
      options: [
        { label: "Preparing", value: "preparing" },
        { label: "Encrypting", value: "encrypting" },
        { label: "Uploading", value: "uploading" },
        { label: "Paused", value: "paused" },
        { label: "Verifying", value: "verifying" },
        { label: "Complete", value: "complete" },
        { label: "Failed", value: "failed" },
        { label: "Deleted", value: "deleted" },
      ],
      defaultValue: "preparing",
      required: true,
      index: true,
    },
    {
      name: "logicalPath",
      type: "text",
    },
  ],
  timestamps: true,
};

export default FilesCollection;
