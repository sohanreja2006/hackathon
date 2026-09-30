/**
 * Payload CMS Collection: Manifests
 *
 * Stores the cryptographic assembly manifests for reconstructed downloads.
 * Never exposes raw encryption keys.
 */

export const ManifestsCollection = {
  slug: "manifests",
  admin: {
    useAsTitle: "manifestCID",
    defaultColumns: ["fileId", "fileName", "manifestCID", "totalChunks", "createdAt"],
  },
  fields: [
    {
      name: "fileId",
      type: "text",
      required: true,
      index: true,
    },
    {
      name: "manifestCID",
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
      name: "chunkSize",
      type: "number",
      required: true,
    },
    {
      name: "totalChunks",
      type: "number",
      required: true,
    },
    {
      name: "encryption",
      type: "text",
      defaultValue: "AES-256-GCM",
      required: true,
    },
    {
      name: "integrity",
      type: "text",
      defaultValue: "SHA-256",
      required: true,
    },
    {
      name: "chunks",
      type: "json",
      required: true,
    },
    {
      name: "createdAt",
      type: "date",
      required: true,
    },
  ],
};
