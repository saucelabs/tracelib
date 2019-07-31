import TracingModel, { Phase } from './index'
import Thread from './thread'
import { EventPayload } from '../tracingManager'
import { TracelogArgs } from '../types'

export default class Event {
    private _parsedCategories: Set<string>

    public id?: string
    public categoriesString: string
    public name: string
    public phase: Phase
    public startTime: number
    public endTime?: number
    public duration?: number
    public thread: Thread
    public args: Record<string, TracelogArgs>
    public selfTime: number
    // eslint-disable-next-line
    public bind_id?: string

    /**
     * @param {number} startTime     * @param {string|undefined} categories
     * @param {string} name
     * @param {!Phase} phase
     * @param {!Thread} thread
     */
    public constructor (categories: string|undefined, name: string, phase: Phase, startTime: number, thread: Thread) {
        this.categoriesString = categories || ''
        this._parsedCategories = thread.model.parsedCategoriesForString(this.categoriesString)
        this.name = name
        this.phase = phase
        this.startTime = startTime
        this.thread = thread
        this.args = {}

        this.selfTime = 0
    }

    /**
     * @param {!TracingManager.EventPayload} payload
     * @param {!Thread} thread
     * @return {!Event}
     */
    public static fromPayload (payload: EventPayload, thread: Thread): Event {
        const event = new Event(
            payload.cat,
            payload.name,
            payload.ph,
            payload.ts / 1000,
            thread
        )

        if (payload.args) {
            event.addArgs(payload.args)
        }

        if (typeof payload.dur === 'number') {
            event.setEndTime((payload.ts + payload.dur) / 1000)
        }

        const id = TracingModel.extractId(payload)
        if (typeof id !== 'undefined') {
            event.id = id
        }

        if (payload.bind_id) {
            // eslint-disable-next-line
            event.bind_id = payload.bind_id
        }

        return event
    }

    /**
     * @param {!Event} a
     * @param {!Event} b
     * @return {number}
     */
    public static compareStartTime (a: Event, b: Event): number {
        return a.startTime - b.startTime
    }

    /**
     * @param {!Event} a
     * @param {!Event} b
     * @return {number}
     */
    public static orderedCompareStartTime (a: Event, b: Event): number {
        // Array.mergeOrdered coalesces objects if comparator returns 0.
        // To change this behavior this comparator return -1 in the case events
        // startTime's are equal, so both events got placed into the result array.
        return a.startTime - b.startTime || -1
    }

    /**
     * @param {string} categoryName
     * @return {boolean}
     */
    public hasCategory (categoryName: string): boolean {
        return this._parsedCategories.has(categoryName)
    }

    /**
     * @param {number} endTime
     */
    public setEndTime (endTime: number): void {
        if (endTime < this.startTime) {
            console.assert(false, 'Event out of order: ' + this.name)
            return
        }
        this.endTime = endTime
        this.duration = endTime - this.startTime
    }

    /**
     * @param {!Object} args
     */
    public addArgs (args: Record<string, TracelogArgs>): void {
        // Shallow copy args to avoid modifying original payload which may be saved to file.
        for (const name in args) {
            if (name in this.args) {
                console.error(`Same argument name (${name}) is used for begin and end phases of ${this.name}`)
            }

            this.args[name] = args[name]
        }
    }

    /**
     * @param {!Event} endEvent
     */
    private _complete (endEvent: Event): void {
        if (endEvent.args) {
            this.addArgs(endEvent.args)
        } else {
            console.error(`Missing mandatory event argument 'args' at ${endEvent.startTime}`)
        }

        this.setEndTime(endEvent.startTime)
    }
}
