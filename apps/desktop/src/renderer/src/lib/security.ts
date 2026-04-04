export const isValidUrl = (url: string): boolean => {
    if (!url) return false;
    try {
        const u = new URL(url);
        return ['http:', 'https:', 'asset:', 'file:'].includes(u.protocol);
    } catch {
        return false;
    }
};

export const sanitizeDomain = (input: string): string => {
    if (!input) return '';
    // Remove protocol if user pasted it
    let domain = input.replace(/^https?:\/\//, '');
    // Keep only valid hostname characters (alphanumeric, dots, dashes)
    domain = domain.replace(/[^a-zA-Z0-9.-]/g, '');
    // Remove leading/trailing dots/dashes
    return domain.replace(/^[-.]+|[-.]+$/g, '');
};
