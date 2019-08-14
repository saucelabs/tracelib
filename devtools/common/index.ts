import Settings from './settings'

export default class Common {
    public static moduleSetting(settingName: string): Settings {
        return Settings.moduleSetting(settingName)
    }
}
