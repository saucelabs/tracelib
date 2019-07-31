import Event from './event'
import Thread from './thread'
import TracingModel, { Phase } from './'
import { EventPayload } from '../tracingManager'

export default class ObjectSnapshot extends Event {
    /**
     * @param {string|undefined} category
     * @param {string} name
     * @param {number} startTime
     * @param {!SDK.TracingModel.Thread} thread
     */
    public constructor(category: string, name: string, startTime: number, thread: Thread) {
        super(category, name, Phase.SnapshotObject, startTime, thread)
    }

    /**
     * @param {!SDK.TracingManager.EventPayload} payload
     * @param {!SDK.TracingModel.Thread} thread
     * @return {!SDK.TracingModel.ObjectSnapshot}
     */
    public static fromPayload (payload: EventPayload, thread: Thread): ObjectSnapshot {
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
}
