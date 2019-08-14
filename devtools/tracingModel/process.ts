import Event from './event'
import Thread from './thread'
import TracingModel from './index'
import NamedObject from './namedObject'
import { TraceEvent } from '../types'

export default class Process extends NamedObject {
    private _threads: Map<number, Thread>
    private _threadByName: Map<string, Thread>

    /**
     * @param {!TracingModel} model
     * @param {number} id
     */
    public constructor (model: TracingModel, id: number) {
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
     * @override
     * @param {string} name
     */
    public setName (name: string): void {
        super._setName(name)
    }

    /**
     * @param {number} id
     * @return {!TracingModel.Thread}
     */
    public threadById (id: number): Thread {
        let thread = this._threads.get(id)
        if (!thread) {
            thread = new Thread(this, id)
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
    public addEvent (payload: TraceEvent): Event | null {
        return this.threadById(payload.tid).addEvent(payload)
    }

    /**
     * @return {!Array.<!TracingModel.Thread>}
     */
    public sortedThreads (): Thread[] {
        return Thread.sort([...this._threads.values()])
    }
}
