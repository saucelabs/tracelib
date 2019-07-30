import AsyncEvent from './asyncEvent'
import Event from './event'
import Process from './process'
import NamedObject from './namedObject'
import ObjectSnapshot from './objectSnapshot'
import TracingModel, { Phase } from './'
import { EventPayload } from '../tracingManager'

export default class Thread extends NamedObject {
    public ordinal: number

    private _process: Process
    private _events: Event[]
    private _asyncEvents: AsyncEvent[]
    private _lastTopLevelEvent: Event | AsyncEvent | null

    /**
     * @param {!Process} process
     * @param {number} id
     */
    public constructor (process: Process, id: number) {
        super(process.model, id)
        this._process = process
        this._events = []
        this._asyncEvents = []
        this._lastTopLevelEvent = null
    }

    /**
     * @param {!TracingManager.EventPayload} payload
     * @return {?Event} event
     */
    public addEvent (payload: EventPayload): Event | null {
        const event = payload.ph === Phase.SnapshotObject
            ? ObjectSnapshot.fromPayload(payload, this)
            : Event.fromPayload(payload, this)

        if (TracingModel.isTopLevelEvent(event)) {
            // Discard nested "top-level" events.
            if (this._lastTopLevelEvent && this._lastTopLevelEvent.endTime > event.startTime) {
                return null
            }
            this._lastTopLevelEvent = event
        }

        this._events.push(event)
        return event
    }

    /**
     * @param {!AsyncEvent} asyncEvent
     */
    public addAsyncEvent (asyncEvent: AsyncEvent): void {
        this._asyncEvents.push(asyncEvent)
    }

    /**
     * @override
     * @param {string} name
     */
    public setName (name: string): void {
        super._setName(name)
        this._process.setThreadByName(name, this)
    }

    /**
     * @return {number}
     */
    public id (): number {
        return this._id
    }

    /**
     * @return {!Process}
     */
    public process (): Process {
        return this._process
    }

    /**
     * @return {!Array.<!SDK.TracingModel.Event>}
     */
    public events (): Event[] {
        return this._events
    }

    /**
     * @return {!Array.<!SDK.TracingModel.AsyncEvent>}
     */
    public asyncEvents (): AsyncEvent[] {
        return this._asyncEvents
    }
}
