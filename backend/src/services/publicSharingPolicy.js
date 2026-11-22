import SystemSetting from '../models/SystemSetting.js';
export const PUBLIC_SHARING_KEY = 'documents.publicSharing';
export async function getPublicSharingPolicy() {
    const setting = await SystemSetting.findOne({ key: PUBLIC_SHARING_KEY }).lean();
    return { enabled: setting?.value?.enabled !== false, disableExistingLinks: setting?.value?.disableExistingLinks !== false };
}
export function publicLinksBlocked(policy) { return !policy.enabled && policy.disableExistingLinks; }
