import Event from './event'
import Thread from './thread'
import TracingModel, { Phase } from './'
import { TraceEvent } from '../types'

export default class ObjectSnapshot extends Event {
    public id?: string
    private _objectPromise?: Promise<any>

    /**
     * @param {string|undefined} category
     * @param {string} name
     * @param {number} startTime
     * @param {!SDK.TracingModel.Thread} thread
     */
    public constructor(category?: string, name?: string, startTime?: number, thread?: Thread) {
        super(category, name, Phase.SnapshotObject, startTime, thread)
        /** @type {?function():!Promise<?string>} */
        /** @type {string} */
        this.id
        /** @type {?Promise<?>} */
        this._objectPromise = null
    }

    /**
     * @param {!SDK.TracingManager.EventPayload} payload
     * @param {!SDK.TracingModel.Thread} thread
     * @return {!SDK.TracingModel.ObjectSnapshot}
     */
    public static fromPayload(payload: TraceEvent, thread: Thread): ObjectSnapshot {
        const snapshot = new ObjectSnapshot(payload.cat, payload.name, payload.ts / 1000, thread)
        const id = TracingModel.extractId(payload)
        if (typeof id !== 'undefined') {
            snapshot.id = id
        }

        if (!payload.args || !payload.args['snapshot']) {
            console.error(`Missing mandatory 'snapshot' argument at ${payload.ts / 1000}`)
            return snapshot
        }
        if (payload.args) {
            snapshot.addArgs(payload.args)
        }

        return snapshot
    }

    /**
     * @param {function(?)} callback
     */
    // todo fix callback type
    public requestObject?(callback: any): void {
        const snapshot = this.args['snapshot']
        if (snapshot) {
            callback(snapshot)
            return
        }
        /**
         * @param {?string} result
         */
        function onRead(result: string): void {
            if (!result) {
                callback(null)
                return
            }
            try {
                const payload = JSON.parse(result)
                callback(payload['args']['snapshot'])
            } catch (e) {
                console.error('Malformed event data in backing storage')
                callback(null)
            }
        }
    }

    /**
     * @return {!Promise<?>}
     */
    public objectPromise?(): Promise<any> {
        if (!this._objectPromise) {
            this._objectPromise = new Promise(this.requestObject.bind(this))
        }
        return this._objectPromise
    }
}
