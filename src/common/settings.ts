export default class Settings {
    private static _moduleSettings: Map<string, Settings> = new Map()

    /**
     * @param {string} settingName
     * @return {!Common.Setting}
     */
    public static moduleSetting(settingName: string): Settings {
        const setting = this._moduleSettings.get(settingName)
        if (!setting) {
            throw new Error('No setting registered: ' + settingName)
        }
        return setting
    }

    public get (): boolean {
        return true
    }
}
