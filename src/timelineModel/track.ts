import Event from '../tracingModel/event'
import Thread from '../tracingModel/thread'
import { Phase } from '../tracingModel'

export enum TrackType {
    MainThread,
    Worker,
    Input,
    Animation,
    Timings,
    Console,
    Raster,
    GPU,
    Other
}

export default class Track {
    public name: string
    public type: TrackType
    public forMainFrame: boolean
    public url: string
    public events: Event[]
    public asyncEvents: Event[]
    public tasks: Event[]
    public thread: Thread

    private _syncEvents: Event[]

    constructor() {
        this.name = ''
        this.url = ''
        this.type = TrackType.Other
        this.asyncEvents = []
        this.tasks = []
        this._syncEvents = null
        this.thread = null

        // TODO(dgozman): replace forMainFrame with a list of frames, urls and time ranges.
        this.forMainFrame = false

        // TODO(dgozman): do not distinguish between sync and async events.
        this.events = []
    }

    /**
     * @return {!Array<!TracingModel.Event>}
     */
    public syncEvents (): Event[] {
        if (this.events.length) {
            return this.events
        }

        if (this._syncEvents) {
            return this._syncEvents
        }

        const stack = []
        this._syncEvents = []
        for (const event of this.asyncEvents) {
            const startTime = event.startTime
            const endTime = event.endTime
            while (stack.length && startTime >= stack[stack.length - 1].endTime) {
                stack.pop()
            }

            if (stack.length && endTime > stack[stack.length - 1].endTime) {
                this._syncEvents = []
                break
            }

            const syncEvent = new Event(
                event.categoriesString,
                event.name,
                Phase.Complete,
                startTime,
                event.thread
            )

            syncEvent.setEndTime(endTime)
            syncEvent.addArgs(event.args)
            this._syncEvents.push(syncEvent)
            stack.push(syncEvent)
        }

        return this._syncEvents
    }
}
