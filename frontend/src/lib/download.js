/*
 * @name download
 * @file /docman/frontend/src/lib/download.js
 * @description Authenticated file download. Document files are no longer public under /uploads (2.3.0);
 *              they are fetched with the user's token from /api/docs/:id/files/:fileId/download.
 * @version 2.3.0
 * @license UNLICENSED
 */
import api from "./axios";

export async function downloadDocumentFile(documentId, file) {
    const response = await api.get(`/docs/${documentId}/files/${file._id}/download`, { responseType: "blob" });
    const objectUrl = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = file.originalname || "download";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
}
