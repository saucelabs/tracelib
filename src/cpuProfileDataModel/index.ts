import CPUProfileNode from './cpuProfileNode'
import ProfileNode from '../profileTreeModel/profileNode'
import ProfileTreeModel from '../profileTreeModel'
import { lowerBound, stableSort } from '../utils'
import { Profile } from '../types'

export default class CPUProfileDataModel extends ProfileTreeModel {
    public profileStartTime: number
    public profileEndTime: number
    public timestamps: number[]
    public samples: number[]
    public lines: number[]
    public totalHitCount: number
    public profileHead: ProfileNode
    public gcNode: ProfileNode
    public programNode?: ProfileNode
    public idleNode?: ProfileNode

    private _stackStartTimes?: Float64Array
    private _stackChildrenDuration?: Float64Array
    private _idToNode: Map<number, CPUProfileNode>

    /**
     * @param {!Protocol.Profiler.Profile} profile
     */
    public constructor (profile: Profile) {
        super()
        const isLegacyFormat = !!profile['head']

        if (isLegacyFormat) {
            // Legacy format contains raw timestamps and start/stop times are in seconds.
            this.profileStartTime = profile.startTime * 1000
            this.profileEndTime = profile.endTime * 1000
            this.timestamps = profile.timestamps
            this._compatibilityConversionHeadToNodes(profile)
        } else {
            // Current format encodes timestamps as deltas. Start/stop times are in microseconds.
            this.profileStartTime = profile.startTime / 1000
            this.profileEndTime = profile.endTime / 1000
            this.timestamps = this._convertTimeDeltas(profile)
        }

        this.samples = profile.samples
        this.lines = profile.lines
        this.totalHitCount = 0
        this.profileHead = this._translateProfileTree(profile.nodes)
        this.initialize(this.profileHead)
        this._extractMetaNodes()

        if (this.samples) {
            this._buildIdToNodeMap()
            this._sortSamples()
            this._normalizeTimestamps()
            this._fixMissingSamples()
        }
    }

    /**
     * @param {!Protocol.Profiler.Profile} profile
     */
    private _compatibilityConversionHeadToNodes (profile: Profile): void {
        /** @type {!Array<!Protocol.Profiler.ProfileNode>} */
        const nodes: ProfileNode[] = []

        /**
         * @param {!Protocol.Profiler.ProfileNode} node
         * @return {number}
         */
        function convertNodesTree (node: ProfileNode): number {
            nodes.push(node);
            // TODO(Christian) fix typings
            (node.children as unknown as number[]) = node.children.map(convertNodesTree)
            return node.id
        }

        if (!profile.head || profile.nodes) {
            return
        }

        convertNodesTree(profile.head)
        profile.nodes = nodes
        delete profile.head
    }

    /**
     * @param {!Protocol.Profiler.Profile} profile
     * @return {?Array<number>}
     */
    private _convertTimeDeltas (profile: Profile): number[] {
        if (!profile.timeDeltas) {
            return null
        }

        let lastTimeUsec = profile.startTime
        const timestamps = new Array(profile.timeDeltas.length)

        for (let i = 0; i < profile.timeDeltas.length; ++i) {
            lastTimeUsec += profile.timeDeltas[i]
            timestamps[i] = lastTimeUsec
        }

        return timestamps
    }

    /**
     * @param {!Array<!Protocol.Profiler.ProfileNode>} nodes
     * @return {!CPUProfileNode}
     */
    private _translateProfileTree (nodes: ProfileNode[]): CPUProfileNode {
        /** @type {!Map<number, !Protocol.Profiler.ProfileNode>} */
        const nodeByIdMap: Map<number, ProfileNode> = new Map()

        /**
         * @param {!Array<!Protocol.Profiler.ProfileNode>} nodes
         */
        function buildChildrenFromParents (nodes: ProfileNode[]): void {
            if (nodes[0].children) {
                return
            }

            nodes[0].children = []
            for (let i = 1; i < nodes.length; ++i) {
                const node = nodes[i]
                // TODO(Christian) fix typings
                const parentNode = nodeByIdMap.get((node.parent as unknown as number))
                // TODO(Christian) fix typings
                if (parentNode.children) {
                    (parentNode.children as unknown as number[]).push(node.id)
                } else {
                    (parentNode.children as unknown as number[]) = [node.id]
                }
            }
        }

        /**
         * @param {!Array<!Protocol.Profiler.ProfileNode>} nodes
         * @param {!Array<number>|undefined} samples
         */
        function buildHitCountFromSamples (nodes: ProfileNode[], samples?: number[]): void {
            /**
             * hitCount not defined in ProfileNode model
             */
            if (typeof(nodes[0].hitCount) === 'number') {
                return
            }

            console.assert(Boolean(samples), 'Error: Neither hitCount nor samples are present in profile.')
            for (let i = 0; i < nodes.length; ++i) {
                nodes[i].hitCount = 0
            }

            for (let i = 0; i < samples.length; ++i) {
                ++nodeByIdMap.get(samples[i]).hitCount
            }
        }

        for (let i = 0; i < nodes.length; ++i) {
            const node: ProfileNode = nodes[i]
            nodeByIdMap.set(node.id, node)
        }

        buildHitCountFromSamples(nodes, this.samples)
        buildChildrenFromParents(nodes)
        this.totalHitCount = nodes.reduce((acc, node): number => acc + node.hitCount, 0)
        const sampleTime = (this.profileEndTime - this.profileStartTime) / this.totalHitCount
        const root = nodes[0]
        /** @type {!Map<number, number>} */
        const idMap = new Map([[root.id, root.id]])
        const resultRoot = new CPUProfileNode(root, sampleTime)
        const parentNodeStack = root.children.map((): CPUProfileNode => resultRoot)

        // TODO(Christian) fix typings
        const sourceNodeStack = root.children.map((id): ProfileNode => nodeByIdMap.get(((id as unknown as number))))
        while (sourceNodeStack.length) {
            let parentNode = parentNodeStack.pop()
            const sourceNode = sourceNodeStack.pop()
            if (!sourceNode.children) {
                sourceNode.children = []
            }

            const targetNode = new CPUProfileNode(sourceNode, sampleTime)
            parentNode.children.push(targetNode)
            parentNode = targetNode
            idMap.set(sourceNode.id, parentNode.id)
            parentNodeStack.push.apply(parentNodeStack, sourceNode.children.map((): CPUProfileNode => parentNode))
            /**
             * type defect
             */
            // sourceNodeStack.push.apply(sourceNodeStack, sourceNode.children.map((id): ProfileNode => nodeByIdMap.get(id)))
        }

        if (this.samples) {
            this.samples = this.samples.map((id): number => idMap.get(id))
        }

        return resultRoot
    }

    private _sortSamples (): void {
        const timestamps = this.timestamps
        if (!timestamps) {
            return
        }

        const samples = this.samples
        const indices = [...timestamps.keys()]
        stableSort(indices, (a, b): number => timestamps[a] - timestamps[b])
        for (let i = 0; i < timestamps.length; ++i) {
            let index = indices[i]
            if (index === i) {
                continue
            }

            // Move items in a cycle.
            const savedTimestamp = timestamps[i]
            const savedSample = samples[i]
            let currentIndex = i
            while (index !== i) {
                samples[currentIndex] = samples[index]
                timestamps[currentIndex] = timestamps[index]
                currentIndex = index
                index = indices[index]
                indices[currentIndex] = currentIndex
            }

            samples[currentIndex] = savedSample
            timestamps[currentIndex] = savedTimestamp
        }
    }

    private _normalizeTimestamps (): void {
        let timestamps = this.timestamps
        if (!timestamps) {
            // Support loading old CPU profiles that are missing timestamps.
            // Derive timestamps from profile start and stop times.
            const profileStartTime = this.profileStartTime
            const interval = (this.profileEndTime - profileStartTime) / this.samples.length
            timestamps = [...Array(this.samples.length + 1)].map((): number => 0)

            for (let i = 0; i < timestamps.length; ++i) {
                timestamps[i] = profileStartTime + i * interval
            }

            this.timestamps = timestamps
            return
        }

        /**
         * Convert samples from usec to msec
         */
        for (let i = 0; i < timestamps.length; ++i) {
            timestamps[i] /= 1000
        }

        /**
         * Support for a legacy format where were no timeDeltas.
         * Add an extra timestamp used to calculate the last sample duration.
         */
        if (this.samples.length === timestamps.length) {
            const averageSample = (timestamps[timestamps.length - 1] - timestamps[0]) / (timestamps.length - 1)
            this.timestamps.push(timestamps[timestamps.length - 1] + averageSample)
        }

        this.profileStartTime = timestamps[0]
        this.profileEndTime = timestamps[timestamps.length - 1]
    }

    private _buildIdToNodeMap (): void {
        /** @type {!Map<number, !CPUProfileNode>} */
        this._idToNode = new Map()
        const idToNode = this._idToNode
        const stack = [this.profileHead]

        while (stack.length) {
            const node = stack.pop()
            idToNode.set(node.id, node)
            stack.push.apply(stack, node.children)
        }
    }

    private _extractMetaNodes (): void {
        const topLevelNodes = this.profileHead.children
        for (let i = 0; i < topLevelNodes.length && !(this.gcNode && this.programNode && this.idleNode); i++) {
            const node = topLevelNodes[i]
            if (node.functionName === '(garbage collector)') {
                this.gcNode = node
            } else if (node.functionName === '(program)') {
                this.programNode = node
            } else if (node.functionName === '(idle)') {
                this.idleNode = node
            }
        }
    }

    /**
     * Sometimes sampler is not able to parse the JS stack and returns
     * a (program) sample instead. The issue leads to call frames belong
     * to the same function invocation being split apart.
     * Here's a workaround for that. When there's a single (program) sample
     * between two call stacks sharing the same bottom node, it is replaced
     * with the preceeding sample.
     */
    private _fixMissingSamples (): void {
        const samples = this.samples
        const samplesCount = samples.length
        const idToNode = this._idToNode
        const programNodeId = this.programNode.id
        const gcNodeId = this.gcNode ? this.gcNode.id : -1
        const idleNodeId = this.idleNode ? this.idleNode.id : -1
        let prevNodeId = samples[0]
        let nodeId = samples[1]
        let count = 0

        /**
         * @param {!SDK.ProfileNode} node
         * @return {!SDK.ProfileNode}
         */
        function bottomNode (node: ProfileNode): ProfileNode {
            while (node.parent && node.parent.parent) {
                node = node.parent
            }

            return node
        }

        /**
         * @param {number} nodeId
         * @return {boolean}
         */
        function isSystemNode (nodeId: number): boolean {
            return nodeId === programNodeId || nodeId === gcNodeId || nodeId === idleNodeId
        }

        if (!this.programNode || samplesCount < 3) {
            return
        }

        for (let sampleIndex = 1; sampleIndex < samplesCount - 1; sampleIndex++) {
            const nextNodeId = samples[sampleIndex + 1]
            if (
                nodeId === programNodeId &&
                !isSystemNode(prevNodeId) &&
                !isSystemNode(nextNodeId) &&
                bottomNode(idToNode.get(prevNodeId)) === bottomNode(idToNode.get(nextNodeId))
            ) {
                ++count
                samples[sampleIndex] = prevNodeId
            }

            prevNodeId = nodeId
            nodeId = nextNodeId
        }

        if (count) {
            console.warn(`DevTools: CPU profile parser is fixing ${count} missing samples.`)
        }
    }

    /**
     * @param {function(number, !CPUProfileNode, number)} openFrameCallback
     * @param {function(number, !CPUProfileNode, number, number, number)} closeFrameCallback
     * @param {number=} startTime
     * @param {number=} stopTime
     */
    public forEachFrame (
        openFrameCallback: (depth: number, node: CPUProfileNode, startTime: number) => void,
        closeFrameCallback: (depth: number, node: CPUProfileNode, startTime: number, duration: number, selfTime: number) => void,
        startTime?: number,
        stopTime?: number
    ): void {
        if (!this.profileHead || !this.samples) {
            return
        }

        startTime = startTime || 0
        stopTime = stopTime || Infinity
        const samples = this.samples
        const timestamps = this.timestamps
        const idToNode = this._idToNode
        const gcNode = this.gcNode
        const samplesCount = samples.length
        const startIndex = lowerBound(timestamps, startTime)
        const stackNodes: CPUProfileNode[] = []

        let stackTop = 0
        let prevId = this.profileHead.id
        let sampleTime: number
        let gcParentNode: CPUProfileNode = null

        // Extra slots for gc being put on top,
        // and one at the bottom to allow safe stackTop-1 access.
        const stackDepth = this.maxDepth + 3
        if (!this._stackStartTimes) {
            this._stackStartTimes = new Float64Array(stackDepth)
        }

        const stackStartTimes = this._stackStartTimes
        if (!this._stackChildrenDuration) {
            this._stackChildrenDuration = new Float64Array(stackDepth)
        }

        const stackChildrenDuration = this._stackChildrenDuration

        let node: CPUProfileNode
        let sampleIndex: number
        for (sampleIndex = startIndex; sampleIndex < samplesCount; sampleIndex++) {
            sampleTime = timestamps[sampleIndex]
            if (sampleTime >= stopTime) {
                break
            }

            const id = samples[sampleIndex]
            if (id === prevId) {
                continue
            }

            node = idToNode.get(id)
            let prevNode = idToNode.get(prevId)

            /**
             * GC samples have no stack, so we just put GC node on top
             * of the last recorded sample.
             */
            if (node === gcNode) {
                gcParentNode = prevNode
                openFrameCallback(gcParentNode.depth + 1, gcNode, sampleTime)
                stackStartTimes[++stackTop] = sampleTime
                stackChildrenDuration[stackTop] = 0
                prevId = id
                continue
            }

            /**
             * end of GC frame
             */
            if (prevNode === gcNode) {
                const start = stackStartTimes[stackTop]
                const duration = sampleTime - start
                stackChildrenDuration[stackTop - 1] += duration
                closeFrameCallback(
                    gcParentNode.depth + 1,
                    gcNode,
                    start,
                    duration,
                    duration - stackChildrenDuration[stackTop]
                )
                --stackTop
                prevNode = gcParentNode
                prevId = prevNode.id
                gcParentNode = null
            }

            while (node.depth > prevNode.depth) {
                stackNodes.push(node)
                node = node.parent
            }

            /**
             * Go down to the LCA and close current intervals.
             */
            while (prevNode !== node) {
                const start = stackStartTimes[stackTop]
                const duration = sampleTime - start
                stackChildrenDuration[stackTop - 1] += duration
                closeFrameCallback(
                    prevNode.depth,
                    prevNode,
                    start,
                    duration,
                    duration - stackChildrenDuration[stackTop]
                )
                --stackTop
                if (node.depth === prevNode.depth) {
                    stackNodes.push(node)
                    node = node.parent
                }
                prevNode = prevNode.parent
            }

            /**
             * Go up the nodes stack and open new intervals.
             */
            while (stackNodes.length) {
                node = stackNodes.pop()
                openFrameCallback(node.depth, node, sampleTime)
                stackStartTimes[++stackTop] = sampleTime
                stackChildrenDuration[stackTop] = 0
            }

            prevId = id
        }

        sampleTime = timestamps[sampleIndex] || this.profileEndTime
        if (idToNode.get(prevId) === gcNode) {
            const start = stackStartTimes[stackTop]
            const duration = sampleTime - start
            stackChildrenDuration[stackTop - 1] += duration
            closeFrameCallback(gcParentNode.depth + 1, node, start, duration, duration - stackChildrenDuration[stackTop])
            --stackTop
            prevId = gcParentNode.id
        }

        for (let node = idToNode.get(prevId); node.parent; node = node.parent) {
            const start = stackStartTimes[stackTop]
            const duration = sampleTime - start
            stackChildrenDuration[stackTop - 1] += duration
            closeFrameCallback(
                node.depth,
                node,
                start,
                duration,
                duration - stackChildrenDuration[stackTop]
            )
            --stackTop
        }
    }

    /**
     * @param {number} index
     * @return {?CPUProfileNode}
     */
    public nodeByIndex (index: number): CPUProfileNode {
        return this._idToNode.get(this.samples[index]) || null
    }
}
