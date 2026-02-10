export function getEnv(
    key: string, 
    opts: { 
        mode: 'optional' | 'error',
        fallback?: string
    } = { mode: 'error' }
): string {
    const value = process.env[key];
    if (!value) {
        const msg = `${opts.mode === 'optional' ? 'Optional ' : ''}Environment Variable Missing: ${key}`

        if (opts.mode === 'error') throw new Error(msg);

        if (!opts.fallback) {
            throw new Error(`${msg}. Fallback not provided.`)
        } else {
            console.warn(`${msg} (Used fallback)`)
            return opts.fallback;
        }

    } else return value;
}