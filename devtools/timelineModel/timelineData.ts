import ObjectSnapshot from '../tracingModel/objectSnapshot'
import Event from '../tracingModel/event'
import { CallFrame, WarningType } from '../types'

export default class TimelineData {
    public static readonly timelineDataSymbol: unique symbol = Symbol('timelineData')
    public warning: WarningType | null
    public previewElement: Element
    public url: string
    public backendNodeId: number
    public stackTrace: any // todo
    public picture: ObjectSnapshot
    public frameId: string
    public timeWaitingForMainThread: number | undefined
    private _initiator: Event

    public constructor () {
        this.warning = null
        this.previewElement = null
        this.url = null
        this.backendNodeId = 0
        this.stackTrace = null
        this.picture = null
        this._initiator = null
        this.frameId = ''
        this.timeWaitingForMainThread
    }

    /**
     * @param {!SDK.TracingModel.Event} initiator
     */
    public setInitiator(initiator: Event): void {
        this._initiator = initiator
        if (!initiator || this.url) {
            return
        }
        const initiatorURL = TimelineData.forEvent(initiator).url
        if (initiatorURL) {
            this.url = initiatorURL
        }
    }

    /**
     * @return {?SDK.TracingModel.Event}
     */
    public initiator(): Event {
        return this._initiator
    }

    /**
     * @return {?Protocol.Runtime.CallFrame}
     */
    public topFrame(): CallFrame | null {
        const stackTrace = this.stackTraceForSelfOrInitiator()
        return (stackTrace && stackTrace[0]) || null
    }

    /**
     * @return {?Array<!Protocol.Runtime.CallFrame>}
     */
    public stackTraceForSelfOrInitiator(): CallFrame[] | null {
        return (
            this.stackTrace ||
            (
                this._initiator &&
                TimelineData.forEvent(this._initiator).stackTrace
            )
        )
    }

    /**
     * @param {!SDK.TracingModel.Event} event
     * @return {!TimelineModel.TimelineData}
     */
    public static forEvent(event: any): TimelineData {
        let data = event[TimelineData.timelineDataSymbol]

        if (!data) {
            data = new TimelineData()
            event[TimelineData.timelineDataSymbol] = data
        }

        return data
    }
}
