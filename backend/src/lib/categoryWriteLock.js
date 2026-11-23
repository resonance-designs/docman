import { withSettingLock } from './settingLock.js';

// Share one cross-process guard across category checks/mutations and book writes.
// No lease takeover: a slow writer must never outlive the lock protecting it.
// After a crash, stop ALL app writers before clearing this lock's value.
export const CATEGORY_WRITE_LOCK = 'locks.category-book-references';
export const withCategoryWriteLock = work => withSettingLock(CATEGORY_WRITE_LOCK, work, { ttlMs: null });
