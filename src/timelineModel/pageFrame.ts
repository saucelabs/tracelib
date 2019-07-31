import { EventPayload } from '../tracingManager'

interface PageFrameProcess {
    time: number;
    processId: number;
    processPseudoId?: string;
    url: string;
}

export default class PageFrame {
    public frameId: string
    public url: string
    public name: string
    public children: PageFrame[]
    public parent: PageFrame
    public processes: PageFrameProcess[]
    public deletedTime: number
    // public ownerNode: any

    /**
     * @param {!Object} payload
     */
    public constructor (payload: EventPayload) {
        this.frameId = payload['frame']
        this.url = payload['url'] || ''
        this.name = payload['name']
        this.children = []
        this.parent = null
        this.processes = []
        this.deletedTime = null
        // TODO(dgozman): figure this out.
        // this.ownerNode = target && payload['nodeId'] ? new SDK.DeferredDOMNode(target, payload['nodeId']) : null
        // this.ownerNode = null
    }

    /**
     * @param {number} time
     * @param {!Object} payload
     */
    public update (time: number, payload: EventPayload): void {
        this.url = payload['url'] || ''
        this.name = payload['name']
        this.processes.push({
            time,
            processId: payload['processId'] ? payload['processId'] : -1,
            processPseudoId: payload['processId'] ? '' : payload['processPseudoId'],
            url: payload['url'] || ''
        })
    }

    /**
     * @param {string} processPseudoId
     * @param {number} processId
     */
    public processReady (processPseudoId: string, processId: number): void {
        for (const process of this.processes) {
            if (process.processPseudoId === processPseudoId) {
                process.processPseudoId = ''
                process.processId = processId
            }
        }
    }

    /**
     * @param {!TimelineModel.TimelineModel.PageFrame} child
     */
    public addChild (child: PageFrame): void {
        this.children.push(child)
        child.parent = this
    }
}
