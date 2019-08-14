import TimelineCategory from './timelineCategory'

export default class TimelineRecordStyle {
    public title: string
    public category: TimelineCategory
    public hidden: boolean
    /**
     * @param {string} title
     * @param {!Timeline.TimelineCategory} category
     * @param {boolean=} hidden
     */

    public constructor(title: string, category: TimelineCategory, hidden?: boolean) {
        this.title = title
        this.category = category
        this.hidden = !!hidden
    }
}
