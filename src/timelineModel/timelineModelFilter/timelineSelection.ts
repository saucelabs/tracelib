import { TimelineSelectionType } from '../../types'
import TimelineFrame from '../timelineFrame/timelineFrame'
import NetworkRequest from '../networkRequest'
import Event from '../../tracingModel/event'

export default class TimelineSelection {
    private _type: TimelineSelectionType
    private _startTime: number
    private _endTime: number
    private _object: object

    /**
     * @param {!Timeline.TimelineSelection.Type} type
     * @param {number} startTime
     * @param {number} endTime
     * @param {!Object=} object
     */
    public constructor(type: TimelineSelectionType, startTime: number, endTime: number, object?: object) {
        this._type = type
        this._startTime = startTime
        this._endTime = endTime
        this._object = object || null
    }

    /**
     * @param {!TimelineModel.TimelineFrame} frame
     * @return {!Timeline.TimelineSelection}
     */
    public static fromFrame(frame: TimelineFrame): TimelineSelection {
        return new TimelineSelection(TimelineSelectionType.Frame, frame.startTime, frame.endTime, frame)
    }

    /**
     * @param {!TimelineModel.TimelineModel.NetworkRequest} request
     * @return {!Timeline.TimelineSelection}
     */
    public static fromNetworkRequest(request: NetworkRequest): TimelineSelection {
        return new TimelineSelection(
            TimelineSelectionType.NetworkRequest,
            request.startTime,
            request.endTime || request.startTime,
            request
        )
    }

    /**
     * @param {!SDK.TracingModel.Event} event
     * @return {!Timeline.TimelineSelection}
     */
    public static fromTraceEvent(event: Event): TimelineSelection {
        return new TimelineSelection(
            TimelineSelectionType.TraceEvent,
            event.startTime,
            event.endTime || event.startTime + 1,
            event
        )
    }

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @return {!Timeline.TimelineSelection}
     */
    public static fromRange(startTime: number, endTime: number): TimelineSelection {
        return new TimelineSelection(TimelineSelectionType.Range, startTime, endTime)
    }

    /**
     * @return {!Timeline.TimelineSelection.Type}
     */
    public type(): TimelineSelectionType {
        return this._type
    }

    /**
     * @return {?Object}
     */
    public object(): object {
        return this._object
    }

    /**
     * @return {number}
     */
    public startTime(): number {
        return this._startTime
    }

    /**
     * @return {number}
     */
    public endTime(): number {
        return this._endTime
    }
}
