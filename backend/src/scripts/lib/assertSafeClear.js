const truthy = new Set(['1', 'true', 'yes', 'y']);

export function assertSafeClear(scriptName) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.ENV === 'Production';
    const confirmed = truthy.has(String(process.env.CONFIRM_PRODUCTION_CLEAR || '').toLowerCase());

    if (isProduction && !confirmed) {
        throw new Error(
            `${scriptName} refused to clear production data. ` +
            'Set CONFIRM_PRODUCTION_CLEAR=true only when you intentionally want to delete records.'
        );
    }
}
