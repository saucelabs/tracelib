import TimelineSelection from './timelineSelection'
import Event from '../../tracingModel/event'

export default class TimelineModelViewDelegate {
    public constructor() {}
    /**
     * @param {?Timeline.TimelineSelection} selection
     */
    public select(selection: TimelineSelection): void {}

    /**
     * @param {?Array<!SDK.TracingModel.Event>} events
     * @param {number} time
     */
    public selectEntryAtTime(events: Event, time: number): void {}

    /**
     * @param {?SDK.TracingModel.Event} event
     */
    public highlightEvent(event: Event): void {}
}
