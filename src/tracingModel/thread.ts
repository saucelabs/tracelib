import AsyncEvent from './asyncEvent'
import Event from './event'
import Process from './process'
import NamedObject from './namedObject'
import ObjectSnapshot from './objectSnapshot'
import TracingModel, { Phase } from './'
import { TraceEvent } from '../types'
import { stableSort, remove } from '../utils'

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

    public tracingComplete(): void {
        stableSort(this._asyncEvents, Event.compareStartTime)
        stableSort(this._events, Event.compareStartTime)
        const phases = Phase
        const stack = []
        for (let i = 0; i < this._events.length; ++i) {
            const e = this._events[i]
            e.ordinal = i
            switch (e.phase) {
                case phases.End:
                    this._events[i] = null  // Mark for removal.
                    // Quietly ignore unbalanced close events, they're legit (we could have missed start one).
                    if (!stack.length) {
                        continue
                    }
                    const top: any = stack.pop()
                    if (top.name !== e.name || top.categoriesString !== e.categoriesString) {
                        console.error(
                            'B/E events mismatch at ' + top.startTime + ' (' + top.name + ') vs. ' + e.startTime + ' (' + e.name +
                        ')')
                    } else {
                        top._complete(e)
                    }
                    break
                case phases.Begin:
                    stack.push(e)
                    break
            }
        }
        while (stack.length) {
            stack.pop().setEndTime(this._model.maximumRecordTime())
        }
        remove(this._events, null, false)
    }

    /**
     * @param {!TracingManager.EventPayload} payload
     * @return {?Event} event
     */
    public addEvent (payload: TraceEvent): Event | null {
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
