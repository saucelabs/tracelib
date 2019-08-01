import TimelineModel from './index'
import TimelineData from './timelineData'
import Event from '../tracingModel/event'
import { RecordType } from '../types'

type Initiatior = Map<string, {
    causes: string[],
    joinBy: string
}>

export default class TimelineAsyncEventTracker {
    private static _asyncEvents: Initiatior
    private _initiatorByType: Map<number | string, Map<string, Event>> // todo
    private static _typeToInitiator: Map<RecordType | string, RecordType>

    public constructor () {
        TimelineAsyncEventTracker._initialize()
        /** @type {!Map<!TimelineModel.TimelineModel.RecordType, !Map<string, !SDK.TracingModel.Event>>} */
        this._initiatorByType = new Map()
        for (const initiator of TimelineAsyncEventTracker._asyncEvents.keys()) {
            this._initiatorByType.set(initiator, new Map())
        }
    }

    private static _initialize(): void {
        if (TimelineAsyncEventTracker._asyncEvents) {
            return
        }

        /**
         * ToDo: type events
         */
        const events:Initiatior = new Map()
        events.set(RecordType.TimerInstall, {
            causes: [RecordType.TimerFire],
            joinBy: 'timerId',
        })
        events.set(RecordType.ResourceSendRequest, {
            causes: [
                RecordType.ResourceReceiveResponse,
                RecordType.ResourceReceivedData,
                RecordType.ResourceFinish,
            ],
            joinBy: 'requestId',
        })
        events.set(RecordType.RequestAnimationFrame, {
            causes: [RecordType.FireAnimationFrame],
            joinBy: 'id',
        })
        events.set(RecordType.RequestIdleCallback, {
            causes: [RecordType.FireIdleCallback],
            joinBy: 'id',
        })
        events.set(RecordType.WebSocketCreate, {
            causes: [
                RecordType.WebSocketSendHandshakeRequest,
                RecordType.WebSocketReceiveHandshakeResponse,
                RecordType.WebSocketDestroy,
            ],
            joinBy: 'identifier',
        })

        TimelineAsyncEventTracker._asyncEvents = events
        /** @type {!Map<!TimelineModel.TimelineModel.RecordType, !TimelineModel.TimelineModel.RecordType>} */
        this._typeToInitiator = new Map()
        for (const entry of events) {
            const types = entry[1].causes
            for (let causeType of types) {
                this._typeToInitiator.set(causeType, entry[0])
            }
        }
    }

    /**
     * @param {!SDK.TracingModel.Event} event
     */
    public processEvent(event: Event): void {
        /** @type {!TimelineModel.TimelineModel.RecordType} */
        let initiatorType: RecordType | string = TimelineAsyncEventTracker._typeToInitiator.get(event.name)
        const isInitiator = !initiatorType

        if (!initiatorType) {
            /** @type {!TimelineModel.TimelineModel.RecordType} */
            initiatorType = event.name
        }

        const initiatorInfo = TimelineAsyncEventTracker._asyncEvents.get(initiatorType)
        if (!initiatorInfo) {
            return
        }

        const id = TimelineModel.globalEventId(event, initiatorInfo.joinBy)
        if (!id) {
            return
        }

        /** @type {!Map<string, !SDK.TracingModel.Event>|undefined} */
        const initiatorMap: Map<string, Event> = this._initiatorByType.get(initiatorType)
        if (isInitiator) {
            initiatorMap.set(id, event)
            return
        }

        const initiator: Event | null = initiatorMap.get(id) || null
        const timelineData = TimelineData.forEvent(event)
        timelineData.setInitiator(initiator)
        if (!timelineData.frameId && initiator) {
            timelineData.frameId = TimelineModel.eventFrameId(initiator)
        }
    }
}
