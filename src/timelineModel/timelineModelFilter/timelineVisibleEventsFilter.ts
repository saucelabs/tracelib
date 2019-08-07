import TimelineModelFilter from './timelineModelFilter'
import Event from '../../tracingModel/event'
import { RecordType, Category } from '../../types'

export default class TimelineVisibleEventsFilter extends TimelineModelFilter {
    private _visibleTypes: Set<any>

    /**
     * @param {!Array<string>} visibleTypes
     */
    public constructor(visibleTypes: string[]) {
        super()
        this._visibleTypes = new Set(visibleTypes)
    }

    /**
     * @override
     * @param {!SDK.TracingModel.Event} event
     * @return {boolean}
     */
    public accept(event: Event): boolean {
        return this._visibleTypes.has(TimelineVisibleEventsFilter._eventType(event))
    }

    /**
     * @return {!TimelineModel.TimelineModel.RecordType}
     */
    static _eventType(event: Event): RecordType | string {
        if (event.hasCategory(Category.Console)) {
            return RecordType.ConsoleTime
        }
        if (event.hasCategory(Category.UserTiming)) {
            return RecordType.UserTiming
        }
        if (event.hasCategory(Category.LatencyInfo)) {
            return RecordType.LatencyInfo
        }
        return /** @type !TimelineModel.TimelineModel.RecordType */ event.name
    }
}
