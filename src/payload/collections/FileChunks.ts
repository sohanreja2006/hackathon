import type { CollectionConfig } from "payload";

/**
 * Payload CMS Collection: FileChunks
 *
 * Stores metadata and IPFS references for individual encrypted file chunks.
 * NEVER stores plaintext chunk contents.
 */
export const FileChunksCollection: CollectionConfig = {
  slug: "fileChunks",
  admin: {
    useAsTitle: "ipfsCID",
    defaultColumns: ["fileId", "chunkIndex", "ipfsCID", "sha256", "status", "createdAt"],
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
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
      name: "chunkIndex",
      type: "number",
      required: true,
    },
    {
      name: "ipfsCID",
      type: "text",
      required: true,
    },
    {
      name: "sha256",
      type: "text",
      required: true,
    },
    {
      name: "iv",
      type: "text",
      required: true,
    },
    {
      name: "encryptedSize",
      type: "number",
      required: true,
    },
    {
      name: "status",
      type: "select",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Uploaded", value: "uploaded" },
        { label: "Verified", value: "verified" },
        { label: "Failed", value: "failed" },
      ],
      defaultValue: "uploaded",
      required: true,
    },
  ],
  timestamps: true,
};

export default FileChunksCollection;
