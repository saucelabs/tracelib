import ProfileNode from '../profileTreeModel/profileNode'
import CallFrame from '../debuggerModel/callFrame'

export default class CPUProfileNode extends ProfileNode {
    /**
     * @param {!Protocol.Profiler.ProfileNode} node
     * @param {number} sampleTime
     */
    public constructor (node: ProfileNode, sampleTime: number) {
        /**
         * Backward compatibility for old SamplingHeapProfileNode format.
         */
        const nodeCallFrame: CallFrame = {
            functionName: node.functionName,
            scriptId: node.scriptId,
            url: node.url,
            lineNumber: node.lineNumber - 1,
            columnNumber: node.columnNumber - 1
        }

        const callFrame = node.callFrame || nodeCallFrame
        super(callFrame)

        this.id = node.id
        this.self = node.hitCount * sampleTime
        this.positionTicks = node.positionTicks

        /**
         * Compatibility: legacy backends could provide "no reason" for optimized functions.
         */
        this.deoptReason = node.deoptReason && node.deoptReason !== 'no reason' ? node.deoptReason : null
    }
}
