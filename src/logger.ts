/**
 * Logger utility for tracelib debug output.
 * Debug logging is disabled by default and can be enabled via:
 * - Environment variable: TRACELIB_DEBUG=true or DEBUG=tracelib
 * - Constructor option: new Tracelib(tracelog, { debug: true })
 * - Static method: Logger.setDebugMode(true)
 */
class Logger {
    private static debugEnabled: boolean =
        process.env.TRACELIB_DEBUG === 'true' ||
        (typeof process.env.DEBUG === 'string' && process.env.DEBUG.includes('tracelib'))

    /**
     * Enable or disable debug mode
     */
    public static setDebugMode(enabled: boolean): void {
        Logger.debugEnabled = enabled
    }

    /**
     * Check if debug mode is enabled
     */
    public static isDebugEnabled(): boolean {
        return Logger.debugEnabled
    }

    /**
     * Log debug messages (only when debug mode is enabled)
     */
    public static debug(component: string, ...args: unknown[]): void {
        if (Logger.debugEnabled) {
            console.log(`[${component}]`, ...args)
        }
    }

    /**
     * Log error messages (always logged)
     */
    public static error(component: string, ...args: unknown[]): void {
        console.error(`[${component}]`, ...args)
    }
}

export default Logger

