export default class TimelineCategory {
    public name: string
    public title: string
    public visible: boolean
    public childColor: string
    public color: string
    private _hidden: boolean

    /**
     * @param {string} name
     * @param {string} title
     * @param {boolean} visible
     * @param {string} childColor
     * @param {string} color
     */
    public constructor(name: string, title: string, visible: boolean, childColor: string, color: string) {
        this.name = name
        this.title = title
        this.visible = visible
        this.childColor = childColor
        this.color = color
        this.hidden = false
    }

    /**
     * @return {boolean}
     */
    public get hidden(): boolean {
        return this._hidden
    }

    /**
     * @param {boolean} hidden
     */
    public set hidden(hidden) {
        this._hidden = hidden
    }
}
