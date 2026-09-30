/**
 * Payload CMS Collection: Chunks
 *
 * Tracks individual encrypted chunks, their CIDs on IPFS, IVs, and SHA-256 integrity hashes.
 * Enables granular chunk verification and resumable uploads.
 */

export const ChunksCollection = {
  slug: "chunks",
  admin: {
    useAsTitle: "cid",
    defaultColumns: ["fileId", "chunkIndex", "cid", "status", "uploadedAt"],
  },
  fields: [
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
      name: "chunkSize",
      type: "number",
      required: true,
    },
    {
      name: "encryptedSize",
      type: "number",
      required: true,
    },
    {
      name: "iv",
      type: "text",
      required: true,
    },
    {
      name: "hash",
      type: "text",
      required: true,
    },
    {
      name: "cid",
      type: "text",
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
    {
      name: "uploadedAt",
      type: "date",
      required: true,
    },
  ],
};
