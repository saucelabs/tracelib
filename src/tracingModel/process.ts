import Thread from './thread'
import TracingModel from './index'
import NamedObject from './namedObject'

export default class Process extends NamedObject {
    private _threads: Map<number, Thread>
    private _threadByName: Map<string, Thread>

    /**
     * @param {!TracingModel} model
     * @param {number} id
     */
    public constructor (model: TracingModel, id: number): void {
        super(model, id)
        this._threads = new Map()
        this._threadByName = new Map()
    }

    public get threads (): Map<number, Thread> {
        return this._threads
    }

    /**
     * @return {number}
     */
    public id (): number {
        return this._id
    }

    /**
     * @param {number} id
     * @return {!TracingModel.Thread}
     */
    public threadById (id: number): Thread {
        let thread = this._threads.get(id)
        if (!thread) {
            thread = new TracingModel.Thread(this, id)
            this._threads.set(id, thread)
        }
        return thread
    }

    /**
     * @param {string} name
     * @return {?TracingModel.Thread}
     */
    public threadByName (name: string): Thread | null {
        return this._threadByName.get(name) || null
    }

    /**
     * @param {string} name
     * @param {!TracingModel.Thread} thread
     */
    public setThreadByName (name: string, thread: Thread): void {
        this._threadByName.set(name, thread)
    }

    /**
     * @param {!TracingManager.EventPayload} payload
     * @return {?TracingModel.Event} event
     */
    public addEvent (payload: EventPayload): Event {
        return this.threadById(payload.tid)._addEvent(payload)
    }

    /**
     * @return {!Array.<!TracingModel.Thread>}
     */
    public sortedThreads (): Thread[] {
        return TracingModel.NamedObject._sort(this._threads.valuesArray())
    }
}
