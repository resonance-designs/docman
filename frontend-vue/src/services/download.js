import { api } from '@/services/api';

function filenameFromDisposition(header, fallback) {
  if (!header) {
    return fallback;
  }
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) {
    return decodeURIComponent(utf8[1]);
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1] : fallback;
}

/**
 * Download a protected file with the user's bearer token and hand it to the browser.
 * Document files are never public, so a plain <a href> cannot be used.
 */
export async function downloadProtectedFile(url, fallbackName = 'download') {
  const response = await api.get(url, { responseType: 'blob' });
  const name = filenameFromDisposition(response.headers['content-disposition'], fallbackName);
  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
}

/** Download a blob-producing API endpoint (e.g. audit export). */
export async function downloadFromApi(url, params, fallbackName) {
  const response = await api.get(url, { params, responseType: 'blob' });
  const name = filenameFromDisposition(response.headers['content-disposition'], fallbackName);
  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
}
