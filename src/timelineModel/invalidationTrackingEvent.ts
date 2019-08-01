import Event from '../tracingModel/event'
import { InvalidationCause, InvalidationMap, EventData, RecordType } from '../types'

export default class InvalidationTrackingEvent {
    public type: string
    public startTime: number
    public tracingEvent: Event

    /** @type {number} */
    public frame: number & string
    /** @type {?number} */
    public nodeId?: number
    /** @type {?string} */
    public nodeName?: string
    /** @type {?number} */
    public invalidationSet?: number
    /** @type {?string} */
    public invalidatedSelectorId?: string
    /** @type {?string} */
    public changedId?: string
    /** @type {?string} */
    public changedClass?: string
    /** @type {?string} */
    public changedAttribute?: string
    /** @type {?string} */
    public changedPseudo?: string
    /** @type {?string} */
    public selectorPart?: string
    /** @type {?string} */
    public extraData?: string
    /** @type {?Array.<!Object.<string, number>>} */
    public invalidationList?: InvalidationMap[]
    /** @type {!TimelineModel.InvalidationCause} */
    public cause: InvalidationCause
    public linkedRecalcStyleEvent: boolean
    public linkedLayoutEvent: boolean

    public constructor(event: Event) {
        this.type = event.name
        this.startTime = event.startTime
        this.tracingEvent = event

        const eventData: EventData = event.args['data']
        // this.frame = eventData['frame']
        this.nodeId = eventData['nodeId']
        this.nodeName = eventData['nodeName']
        this.invalidationSet = eventData['invalidationSet']
        this.invalidatedSelectorId = eventData['invalidatedSelectorId']
        this.changedId = eventData['changedId']
        this.changedClass = eventData['changedClass']
        this.changedAttribute = eventData['changedAttribute']
        this.changedPseudo = eventData['changedPseudo']
        this.selectorPart = eventData['selectorPart']
        this.extraData = eventData['extraData']
        this.invalidationList = eventData['invalidationList']
        this.cause = {
            reason: eventData['reason'],
            stackTrace: eventData['stackTrace'],
        }

        if (
            !this.cause.reason &&
            this.cause.stackTrace &&
            this.type === RecordType.LayoutInvalidationTracking
        ) {
            this.cause.reason = 'Layout forced'
        }
    }
}
