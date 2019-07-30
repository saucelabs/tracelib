import Thread from './thread'
import TracingModel from './index'
import NamedObject from './namedObject'

export default class Process extends NamedObject {
    /**
     * @param {!TracingModel} model
     * @param {number} id
     */
    public constructor (model: TracingModel, id: number): void {
        super(model, id)
        /** @type {!Map<number, !TracingModel.Thread>} */
        this._threads = new Map()
        this._threadByName = new Map()
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
    private _setThreadByName (name: string, thread: Thread): void {
        this._threadByName.set(name, thread)
    }

    /**
     * @param {!TracingManager.EventPayload} payload
     * @return {?TracingModel.Event} event
     */
    private _addEvent (payload: EventPayload): Event {
        return this.threadById(payload.tid)._addEvent(payload)
    }

    /**
     * @return {!Array.<!TracingModel.Thread>}
     */
    public sortedThreads (): Thread[] {
        return TracingModel.NamedObject._sort(this._threads.valuesArray())
    }
}
