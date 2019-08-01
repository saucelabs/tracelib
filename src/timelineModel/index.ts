import PageFrame from './pageFrame'
import Track, { TrackType } from './track'
import TimelineData from './TimelineData'
import NetworkRequest from './networkRequest'
import InvalidationTracker from './invalidationTracker'
import InvalidationTrackingEvent from './invalidationTrackingEvent'
import TimelineAsyncEventTracker from './timelineAsyncEventTracker'
import TimelineJSProfileProcessor from './timelineJSProfileProcessor'

import TracingModel, { Phase, DevToolsMetadataEventCategory } from '../tracingModel'
import CPUProfileDataModel from '../cpuProfileDataModel/index'
import Event from '../tracingModel/event'
import AsyncEvent from '../tracingModel/AsyncEvent'
import Thread from '../tracingModel/thread'

import {
    PageFramePayload, BrowserFrames, LayoutInvalidationMap, Range,
    MetadataEvents, Thresholds, DevToolsMetadataEvent, RecordType,
    Category, WarningType, EventData, Profile
} from '../types'

import {
    upperBound,
    stableSort,
    pushAll,
    mergeOrIntersect,
    lowerBound,
} from '../utils'

export const WorkerThreadName = 'DedicatedWorker thread'
export const WorkerThreadNameLegacy = 'DedicatedWorker Thread'
export const RendererMainThreadName = 'CrRendererMain'
export const BrowserMainThreadName = 'CrBrowserMain'

export default class TimelineModel {
    private _isGenericTrace: boolean
    private _tracks: Track[]
    private _namedTracks: Map<TrackType, Track>
    private _inspectedTargetEvents: Event[]
    private _timeMarkerEvents: Event[]
    private _sessionId: string
    private _mainFrameNodeId: number
    private _cpuProfiles: CPUProfileDataModel[]
    private _workerIdByThread: WeakMap<Thread, string>
    private _pageFrames: Map<string, PageFrame>
    private _mainFrame: PageFrame
    private _minimumRecordTime: number
    private _maximumRecordTime: number
    private _persistentIds: boolean
    private _asyncEventTracker: TimelineAsyncEventTracker
    private _invalidationTracker: InvalidationTracker
    private _layoutInvalidate: LayoutInvalidationMap
    private _lastScheduleStyleRecalculation: LayoutInvalidationMap
    private _paintImageEventByPixelRefId: LayoutInvalidationMap
    private _lastPaintForLayer: LayoutInvalidationMap
    private _lastRecalculateStylesEvent: Event
    private _currentScriptEvent: Event
    private _eventStack: Event[]
    private _knownInputEvents: Set<string>
    private _browserFrameTracking: boolean
    private _legacyCurrentPage: any
    private _tracingModel: TracingModel
    private _currentTaskLayoutAndRecalcEvents: Event[]
    private _mainFrameLayerTreeId: string | number

    public constructor() {
        this._reset()
    }

    private _reset(): void {
        this._isGenericTrace = false
        this._tracks = []
        this._namedTracks = new Map()
        this._inspectedTargetEvents = []
        this._timeMarkerEvents = []
        this._sessionId = null
        this._mainFrameNodeId = null
        this._cpuProfiles = []
        this._workerIdByThread = new WeakMap()
        this._pageFrames = new Map()
        this._mainFrame = null

        this._minimumRecordTime = 0
        this._maximumRecordTime = 0
    }

    /**
     * @param {!Array<!TracingModel.Event>} events
     * @param {function(!TracingModel.Event)} onStartEvent
     * @param {function(!TracingModel.Event)} onEndEvent
     * @param {function(!TracingModel.Event,?TracingModel.Event)|undefined=} onInstantEvent
     * @param {number=} startTime
     * @param {number=} endTime
     * @param {function(!TracingModel.Event):boolean=} filter
     */
    public static forEachEvent(
        events: Event[],
        onStartEvent: (event: Event) => void,
        onEndEvent: (event: Event) => void,
        onInstantEvent: (ev1: Event, ev2: Event) => void | undefined,
        startTime: number,
        endTime?: number,
        filter?: (event: Event) => boolean
    ): void {
        startTime = startTime || 0
        endTime = endTime || Infinity
        const stack: Event[] = []
        const startEvent = TimelineModel._topLevelEventEndingAfter(
            events,
            startTime
        )
        for (let i = startEvent; i < events.length; ++i) {
            const e = events[i]
            if ((e.endTime || e.startTime) < startTime) {
                continue
            }

            if (e.startTime >= endTime) {
                break
            }

            if (
                TracingModel.isAsyncPhase(e.phase) ||
                TracingModel.isFlowPhase(e.phase)
            ) {
                continue
            }

            while (
                stack.length &&
                stack[stack.length - 1].endTime <= e.startTime
            ) {
                onEndEvent(stack.pop())
            }

            if (filter && !filter(e)) {
                continue
            }

            if (e.duration) {
                onStartEvent(e)
                stack.push(e)
            } else {
                onInstantEvent &&
                    onInstantEvent(e, stack[stack.length - 1] || null)
            }
        }
        while (stack.length) {
            onEndEvent(stack.pop())
        }
    }

    /**
     * @param {!Array<!TracingModel.Event>} events
     * @param {number} time
     */
    private static _topLevelEventEndingAfter(
        events: Event[],
        time: number
    ): number {
        let index =
            upperBound(
                events,
                time,
                (time, event): number => time - event.startTime
            ) - 1

        while (index > 0 && !TracingModel.isTopLevelEvent(events[index])) {
            index--
        }

        return Math.max(index, 0)
    }

    /**
     * @param {!TracingModel.Event} event
     * @return {boolean}
     */
    public isMarkerEvent(event: Event): boolean {
        switch (event.name) {
        case RecordType.TimeStamp:
            return true
        case RecordType.MarkFirstPaint:
        case RecordType.MarkFCP:
        case RecordType.MarkFMP:
            // TODO(alph): There are duplicate FMP events coming from the backend. Keep the one having 'data' property.
            return (
                this._mainFrame &&
                event.args.frame === this._mainFrame.frameId &&
                !!event.args.data
            )
        case RecordType.MarkDOMContent:
        case RecordType.MarkLoad:
            return !!event.args.data.isMainFrame
        default:
            return false
        }
    }

    /**
     * @param {!TracingModel.Event} event
     * @param {string} field
     * @return {string}
     */
    public static globalEventId(event: Event, field: string): string {
        const data = event.args.data || event.args.beginData
        const id = data && data[field]
        if (!id) {
            return ''
        }

        return `${event.thread.process().id()}.${id}`
    }

    /**
     * @param {!TracingModel.Event} event
     * @return {string}
     */
    public static eventFrameId(event: Event): string {
        const data = event.args['data'] || event.args['beginData']
        return (data && data['frame']) || ''
    }

    /**
     * @return {!Array<!SDK.CPUProfileDataModel>}
     */
    public cpuProfiles(): CPUProfileDataModel[] {
        return this._cpuProfiles
    }

    /**
     * @param {!TracingModel.Event} event
     * @return {?SDK.Target}
     */
    public targetByEvent(): null {
        /**
         * not applicable for loaded tracelogs
         */
        return null
    }

    /**
     * @param {!TracingModel} tracingModel
     */
    public setEvents(tracingModel: TracingModel): void {
        this._reset()
        this._resetProcessingState()
        this._tracingModel = tracingModel

        this._minimumRecordTime = tracingModel.minimumRecordTime()
        this._maximumRecordTime = tracingModel.maximumRecordTime()

        this._processSyncBrowserEvents(tracingModel)
        if (this._browserFrameTracking) {
            this._processThreadsForBrowserFrames(tracingModel)
        } else {
            // The next line is for loading legacy traces recorded before M67.
            // TODO(alph): Drop the support at some point.
            const metadataEvents = this._processMetadataEvents(tracingModel)
            this._isGenericTrace = !metadataEvents
            if (metadataEvents) {
                this._processMetadataAndThreads(tracingModel, metadataEvents)
            } else {
                this._processGenericTrace(tracingModel)
            }
        }
        stableSort(this._inspectedTargetEvents, Event.compareStartTime)
        this._processAsyncBrowserEvents(tracingModel)
        this._buildGPUEvents(tracingModel)
        this._resetProcessingState()
    }

    /**
     * @param {!TracingModel} tracingModel
     */
    private _processGenericTrace(tracingModel: TracingModel): void {
        let browserMainThread = TracingModel.browserMainThread(tracingModel)
        if (!browserMainThread && tracingModel.sortedProcesses().length) {
            browserMainThread = tracingModel
                .sortedProcesses()[0]
                .sortedThreads()[0]
        }

        for (const process of tracingModel.sortedProcesses()) {
            for (const thread of process.sortedThreads()) {
                this._processThreadEvents(
                    tracingModel,
                    [{ from: 0, to: Infinity }],
                    thread,
                    thread === browserMainThread,
                    false,
                    true,
                    null
                )
            }
        }
    }

    /**
     * @param {!TracingModel} tracingModel
     * @param {!TimelineModel.MetadataEvents} metadataEvents
     */
    private _processMetadataAndThreads(
        tracingModel: TracingModel,
        metadataEvents: MetadataEvents
    ): void {
        let startTime = 0

        for (let i = 0, length = metadataEvents.page.length; i < length; i++) {
            const metaEvent = metadataEvents.page[i]
            const process = metaEvent.thread.process()
            const endTime =
                i + 1 < length ? metadataEvents.page[i + 1].startTime : Infinity

            if (startTime === endTime) {
                continue
            }

            this._legacyCurrentPage = metaEvent.args.data && metaEvent.args.data.page
            for (const thread of process.sortedThreads()) {
                let workerUrl = null
                if (
                    thread.name() === WorkerThreadName ||
                    thread.name() === WorkerThreadNameLegacy
                ) {
                    const workerMetaEvent = metadataEvents.workers.find((event: Event): boolean => {
                        if (event.args.data.workerThreadId !== thread.id()) {
                            return false
                        }

                        /**
                         * This is to support old traces.
                         */
                        if (event.args.data.sessionId === this._sessionId) {
                            return true
                        }

                        return Boolean(
                            this._pageFrames.get(TimelineModel.eventFrameId(event))
                        )
                    })

                    if (!workerMetaEvent) {
                        continue
                    }

                    const workerId = workerMetaEvent.args.data.workerId
                    if (workerId) {
                        this._workerIdByThread.set(thread, workerId)
                    }

                    workerUrl = workerMetaEvent.args.data.url || ''
                }

                this._processThreadEvents(
                    tracingModel,
                    [{
                        from: startTime,
                        to: endTime,
                    }],
                    thread,
                    thread === metaEvent.thread,
                    !!workerUrl,
                    true,
                    workerUrl
                )
            }

            startTime = endTime
        }
    }

    /**
     * @param {!TracingModel} tracingModel
     */
    private _processThreadsForBrowserFrames(tracingModel: TracingModel): void {
        const processData = new Map<number, BrowserFrames[]>()
        for (const frame of this._pageFrames.values()) {
            for (let i = 0; i < frame.processes.length; i++) {
                const pid = frame.processes[i].processId
                let data = processData.get(pid)
                if (!data) {
                    data = []
                    processData.set(pid, data)
                }
                const to = i === frame.processes.length - 1
                    ? frame.deletedTime || this._maximumRecordTime
                    : frame.processes[i + 1].time

                data.push({
                    from: frame.processes[i].time,
                    to: to,
                    main: !frame.parent,
                    url: frame.processes[i].url,
                })
            }
        }

        const allMetadataEvents = tracingModel.devToolsMetadataEvents()
        for (const process of tracingModel.sortedProcesses()) {
            const data = processData.get(process.id())
            if (!data) {
                continue
            }

            data.sort(
                (a: BrowserFrames, b: BrowserFrames): number => a.from - b.from || a.to - b.to)
            const ranges: Range[] = []

            let lastUrl = null
            let lastMainUrl = null
            let hasMain = false
            for (const item of data) {
                if (
                    !ranges.length ||
                    item.from > ranges[ranges.length - 1].to
                ) {
                    ranges.push({ from: item.from, to: item.to })
                } else {
                    ranges[ranges.length - 1].to = item.to
                }

                if (item.main) {
                    hasMain = true
                }

                if (item.url) {
                    if (item.main) {
                        lastMainUrl = item.url
                    }
                    lastUrl = item.url
                }
            }

            for (const thread of process.sortedThreads()) {
                if (thread.name() === RendererMainThreadName) {
                    this._processThreadEvents(
                        tracingModel,
                        ranges,
                        thread,
                        true /* isMainThread */,
                        false /* isWorker */,
                        hasMain,
                        hasMain ? lastMainUrl : lastUrl
                    )
                } else if (
                    thread.name() === WorkerThreadName ||
                    thread.name() === WorkerThreadNameLegacy
                ) {
                    const workerMetaEvent = allMetadataEvents.find(
                        (e): boolean => {
                            if (
                                e.name !==
                                DevToolsMetadataEvent.TracingSessionIdForWorker
                            )
                                return false
                            if (e.thread.process() !== process) return false
                            if (
                                e.args['data']['workerThreadId'] !== thread.id()
                            )
                                return false
                            return !!this._pageFrames.get(
                                TimelineModel.eventFrameId(e)
                            )
                        }
                    )
                    if (!workerMetaEvent) continue
                    this._workerIdByThread.set(
                        thread,
                        workerMetaEvent.args.data.workerId || ''
                    )
                    this._processThreadEvents(
                        tracingModel,
                        ranges,
                        thread,
                        false /* isMainThread */,
                        true /* isWorker */,
                        false /* forMainFrame */,
                        workerMetaEvent.args['data']['url'] || ''
                    )
                } else {
                    this._processThreadEvents(
                        tracingModel,
                        ranges,
                        thread,
                        false /* isMainThread */,
                        false /* isWorker */,
                        false /* forMainFrame */,
                        null
                    )
                }
            }
        }
    }

    /**
     * @param {!TracingModel} tracingModel
     * @return {?TimelineModel.MetadataEvents}
     */
    private _processMetadataEvents(tracingModel: TracingModel): MetadataEvents | null {
        const metadataEvents = tracingModel.devToolsMetadataEvents()

        const pageDevToolsMetadataEvents = []
        const workersDevToolsMetadataEvents = []
        for (const event of metadataEvents) {
            if (event.name === DevToolsMetadataEvent.TracingStartedInPage) {
                pageDevToolsMetadataEvents.push(event)
                if (event.args.data && event.args.data.persistentIds) {
                    this._persistentIds = true
                }

                const frames = (event.args.data && event.args.data.frames) || []
                frames.forEach((payload: PageFramePayload): boolean =>
                    this._addPageFrame(event, payload)
                )
                this._mainFrame = this.rootFrames()[0]
            } else if (
                event.name === DevToolsMetadataEvent.TracingSessionIdForWorker
            ) {
                workersDevToolsMetadataEvents.push(event)
            } else if (
                event.name === DevToolsMetadataEvent.TracingStartedInBrowser
            ) {
                console.assert(
                    !this._mainFrameNodeId,
                    'Multiple sessions in trace'
                )
                this._mainFrameNodeId = event.args.frameTreeNodeId
            }
        }
        if (!pageDevToolsMetadataEvents.length) {
            return null
        }

        const sessionId = (
            pageDevToolsMetadataEvents[0].args.sessionId ||
            pageDevToolsMetadataEvents[0].args.data.sessionId
        )
        this._sessionId = sessionId

        const mismatchingIds: Set<string> = new Set()
        /**
         * @param {!TracingModel.Event} event
         * @return {boolean}
         */
        function checkSessionId(event: Event): boolean {
            let args = event.args
            // FIXME: put sessionId into args["data"] for TracingStartedInPage event.
            if (args.data) {
                args = args.data
            }

            const id = args.sessionId
            if (id === sessionId) {
                return true
            }

            mismatchingIds.add(id)
            return false
        }

        const result = {
            page: pageDevToolsMetadataEvents
                .filter(checkSessionId)
                .sort(Event.compareStartTime),
            workers: workersDevToolsMetadataEvents.sort(Event.compareStartTime),
        }

        if (mismatchingIds.size) {
            console.error(
                'Timeline recording was started in more than one page simultaneously. Session id mismatch: ' +
                    this._sessionId +
                    ' and ' +
                    Array.from(mismatchingIds.values()) +
                    '.'
            )
        }

        return result
    }

    /**
     * @param {!TracingModel} tracingModel
     */
    private _processSyncBrowserEvents(tracingModel: TracingModel): void {
        const browserMain = TracingModel.browserMainThread(tracingModel)
        if (browserMain)
            browserMain.events().forEach(this._processBrowserEvent, this)
    }

    /**
     * @param {!TracingModel} tracingModel
     */
    private _processAsyncBrowserEvents(tracingModel: TracingModel): void {
        const browserMain = TracingModel.browserMainThread(tracingModel)
        if (browserMain)
            this._processAsyncEvents(browserMain, [{ from: 0, to: Infinity }])
    }

    /**
     * @param {!TracingModel} tracingModel
     */
    private _buildGPUEvents(tracingModel: TracingModel): void {
        const thread = tracingModel.threadByName('GPU Process', 'CrGpuMain')
        if (!thread) return
        const gpuEventName = RecordType.GPUTask
        const track = this._ensureNamedTrack(TrackType.GPU)
        track.thread = thread
        track.events = thread
            .events()
            .filter((event): boolean => event.name === gpuEventName)
    }

    private _resetProcessingState(): void {
        this._asyncEventTracker = new TimelineAsyncEventTracker()
        this._invalidationTracker = new InvalidationTracker()
        this._layoutInvalidate = {}
        this._lastScheduleStyleRecalculation = {}
        this._paintImageEventByPixelRefId = {}
        this._lastPaintForLayer = {}
        this._lastRecalculateStylesEvent = null
        this._currentScriptEvent = null
        this._eventStack = []
        /** @type {!Set<string>} */
        this._knownInputEvents = new Set()
        this._browserFrameTracking = false
        this._persistentIds = false
        this._legacyCurrentPage = null
    }

    /**
     * @param {!TracingModel} tracingModel
     * @param {!TracingModel.Thread} thread
     * @return {?SDK.CPUProfileDataModel}
     */
    private _extractCpuProfile(
        tracingModel: TracingModel,
        thread: Thread
    ): CPUProfileDataModel | null {
        const events = thread.events()
        /** @type {?Protocol.Profiler.Profile} */
        let cpuProfile: Profile
        let target = null

        // Check for legacy CpuProfile event format first.
        let cpuProfileEvent = events[events.length - 1]
        if (cpuProfileEvent && cpuProfileEvent.name === RecordType.CpuProfile) {
            const eventData = cpuProfileEvent.args['data']
            cpuProfile = eventData && eventData['cpuProfile']
            target = this.targetByEvent()
        }

        if (!cpuProfile) {
            cpuProfileEvent = events.find(
                (e): boolean => e.name === RecordType.Profile
            )
            if (!cpuProfileEvent) {
                return null
            }

            target = this.targetByEvent()
            const profileGroup = tracingModel.profileGroup(cpuProfileEvent)
            if (!profileGroup) {
                console.error('Invalid CPU profile format.')
                return null
            }

            cpuProfile = {
                startTime: cpuProfileEvent.args['data']['startTime'],
                endTime: 0,
                nodes: [],
                samples: [],
                timeDeltas: [],
                lines: [],
            }

            for (const profileEvent of profileGroup.children) {
                const eventData = profileEvent.args.data
                if ('startTime' in eventData) {
                    cpuProfile.startTime = eventData.startTime
                }

                if ('endTime' in eventData) {
                    cpuProfile.endTime = eventData.endTime
                }
                const defaultProfile: Profile = {
                    samples: [],
                    nodes: []
                }
                const nodesAndSamples = eventData.cpuProfile || defaultProfile
                const samples = nodesAndSamples.samples || []
                const lines = eventData.lines || Array(samples.length).fill(0)
                cpuProfile.nodes = pushAll(
                    cpuProfile.nodes,
                    nodesAndSamples.nodes || []
                )
                cpuProfile.lines = pushAll(cpuProfile.lines, lines)
                cpuProfile.samples = pushAll(cpuProfile.samples, samples)
                cpuProfile.timeDeltas = pushAll(
                    cpuProfile.timeDeltas,
                    eventData.timeDeltas || []
                )
                if (
                    cpuProfile.samples.length !== cpuProfile.timeDeltas.length
                ) {
                    console.error('Failed to parse CPU profile.')
                    return null
                }
            }
            if (!cpuProfile.endTime) {
                cpuProfile.endTime = cpuProfile.timeDeltas.reduce(
                    (x: number, y: number): number => x + y,
                    cpuProfile.startTime
                )
            }
        }

        try {
            const jsProfileModel = new CPUProfileDataModel(cpuProfile, target)
            this._cpuProfiles.push(jsProfileModel)
            return jsProfileModel
        } catch (e) {
            console.error('Failed to parse CPU profile.')
        }
        return null
    }

    /**
     * @param {!TracingModel} tracingModel
     * @param {!TracingModel.Thread} thread
     * @return {!Array<!TracingModel.Event>}
     */
    private _injectJSFrameEvents(
        tracingModel: TracingModel,
        thread: Thread
    ): Event[] {
        const jsProfileModel = this._extractCpuProfile(tracingModel, thread)
        let events = thread.events()
        const jsSamples = jsProfileModel
            ? TimelineJSProfileProcessor.generateTracingEventsFromCpuProfile(
                jsProfileModel,
                thread
            )
            : null

        if (jsSamples && jsSamples.length) {
            events = mergeOrIntersect(
                events,
                jsSamples,
                Event.orderedCompareStartTime,
                true
            )
        }

        if (
            jsSamples ||
            events.some((e): boolean => e.name === RecordType.JSSample)
        ) {
            const jsFrameEvents = TimelineJSProfileProcessor.generateJSFrameEvents(
                events
            )
            if (jsFrameEvents && jsFrameEvents.length) {
                events = mergeOrIntersect(
                    jsFrameEvents,
                    events,
                    Event.orderedCompareStartTime,
                    true
                )
            }
        }
        return events
    }

    /**
     * @param {!TracingModel} tracingModel
     * @param {!Array<!{from: number, to: number}>} ranges
     * @param {!TracingModel.Thread} thread
     * @param {boolean} isMainThread
     * @param {boolean} isWorker
     * @param {boolean} forMainFrame
     * @param {?string} url
     */
    private _processThreadEvents(
        tracingModel: TracingModel,
        ranges: Range[],
        thread: Thread,
        isMainThread: boolean,
        isWorker: boolean,
        forMainFrame: boolean,
        url: string
    ): void {
        const track = new Track()
        track.name = thread.name() || `Thread ${thread.id()}` // todo: original ls`Thread ${thread.id()}`
        track.type = TrackType.Other
        track.thread = thread
        if (isMainThread) {
            track.type = TrackType.MainThread
            track.url = url || null
            track.forMainFrame = forMainFrame
        } else if (isWorker) {
            track.type = TrackType.Worker
            track.url = url
        } else if (thread.name().startsWith('CompositorTileWorker')) {
            track.type = TrackType.Raster
        }
        this._tracks.push(track)

        const events = this._injectJSFrameEvents(tracingModel, thread)
        this._eventStack = []
        const eventStack = this._eventStack

        for (const range of ranges) {
            let i = lowerBound(
                events,
                range.from,
                (time: number, event: Event): number => time - event.startTime
            )
            for (; i < events.length; i++) {
                const event = events[i]
                if (event.startTime >= range.to) {
                    break
                }

                while (
                    eventStack.length &&
                    eventStack[eventStack.length - 1].endTime <= event.startTime
                ) {
                    eventStack.pop()
                }

                if (!this._processEvent(event)) {
                    continue
                }

                if (!TracingModel.isAsyncPhase(event.phase) && event.duration) {
                    if (eventStack.length) {
                        const parent = eventStack[eventStack.length - 1]
                        parent.selfTime -= event.duration
                        if (parent.selfTime < 0) {
                            this._fixNegativeDuration(parent, event)
                        }
                    }

                    event.selfTime = event.duration
                    if (!eventStack.length) {
                        track.tasks.push(event)
                    }

                    eventStack.push(event)
                }
                if (this.isMarkerEvent(event)) {
                    this._timeMarkerEvents.push(event)
                }

                track.events.push(event)
                this._inspectedTargetEvents.push(event)
            }
        }
        this._processAsyncEvents(thread, ranges)
    }

    /**
     * @param {!TracingModel.Event} event
     * @param {!TracingModel.Event} child
     */
    private _fixNegativeDuration(event: Event, child: Event): void {
        const epsilon = 1e-3
        if (event.selfTime < -epsilon) {
            console.error(
                `Children are longer than parent at ${event.startTime} ` +
                    `(${(child.startTime - this.minimumRecordTime()).toFixed(
                        3
                    )} by ${(-event.selfTime).toFixed(3)}`
            )
        }
        event.selfTime = 0
    }

    /**
     * @param {!TracingModel.Thread} thread
     * @param {!Array<!{from: number, to: number}>} ranges
     */
    private _processAsyncEvents(thread: Thread, ranges: Range[]): void {
        const asyncEvents = thread.asyncEvents()
        const groups = new Map()

        /**
         * @param {!TrackType} type
         * @return {!Array<!TracingModel.AsyncEvent>}
         */
        function group(type: TrackType): AsyncEvent[] {
            if (!groups.has(type)) {
                groups.set(type, [])
            }
            return groups.get(type)
        }

        for (const range of ranges) {
            let i = lowerBound(
                asyncEvents,
                range.from,
                (time: number, asyncEvent: AsyncEvent): number =>
                    time - asyncEvent.startTime
            )

            for (; i < asyncEvents.length; ++i) {
                const asyncEvent = asyncEvents[i]
                if (asyncEvent.startTime >= range.to) {
                    break
                }

                if (asyncEvent.hasCategory(Category.Console)) {
                    group(TrackType.Console).push(asyncEvent)
                    continue
                }

                if (asyncEvent.hasCategory(Category.UserTiming)) {
                    group(TrackType.Timings).push(asyncEvent)
                    continue
                }

                if (asyncEvent.name === RecordType.Animation) {
                    group(TrackType.Animation).push(asyncEvent)
                    continue
                }

                if (
                    asyncEvent.hasCategory(Category.LatencyInfo) ||
                    asyncEvent.name === RecordType.ImplSideFling
                ) {
                    const lastStep =
                        asyncEvent.steps[asyncEvent.steps.length - 1]
                    // FIXME: fix event termination on the back-end instead.
                    if (lastStep.phase !== Phase.AsyncEnd) continue
                    const data = lastStep.args['data']
                    asyncEvent.causedFrame = !!(
                        data &&
                        data['INPUT_EVENT_LATENCY_RENDERER_SWAP_COMPONENT']
                    )
                    if (asyncEvent.hasCategory(Category.LatencyInfo)) {
                        if (!this._knownInputEvents.has(lastStep.id)) continue
                        if (
                            asyncEvent.name ===
                                RecordType.InputLatencyMouseMove &&
                            !asyncEvent.causedFrame
                        )
                            continue
                        const rendererMain =
                            data['INPUT_EVENT_LATENCY_RENDERER_MAIN_COMPONENT']
                        if (rendererMain) {
                            const time = rendererMain['time'] / 1000
                            TimelineData.forEvent(
                                asyncEvent.steps[0]
                            ).timeWaitingForMainThread =
                                time - asyncEvent.steps[0].startTime
                        }
                    }
                    group(TrackType.Input).push(asyncEvent)
                    continue
                }
            }
        }

        for (const [type, events] of groups) {
            const track = this._ensureNamedTrack(type)
            track.thread = thread
            track.asyncEvents = mergeOrIntersect(
                track.asyncEvents,
                events,
                Event.compareStartTime,
                true
            )
        }
    }

    /**
     * @param {!TracingModel.Event} event
     * @return {boolean}
     */
    private _processEvent(event: Event): boolean {
        const recordTypes = RecordType
        const eventStack = this._eventStack

        if (!eventStack.length) {
            if (
                this._currentTaskLayoutAndRecalcEvents &&
                this._currentTaskLayoutAndRecalcEvents.length
            ) {
                const totalTime = this._currentTaskLayoutAndRecalcEvents.reduce(
                    (time, event): number => time + event.duration,
                    0
                )
                if (totalTime > Thresholds.ForcedLayout) {
                    for (const e of this._currentTaskLayoutAndRecalcEvents) {
                        const timelineData = TimelineData.forEvent(e)
                        timelineData.warning =
                            e.name === recordTypes.Layout
                                ? WarningType.ForcedLayout
                                : WarningType.ForcedStyle
                    }
                }
            }
            this._currentTaskLayoutAndRecalcEvents = []
        }

        if (
            this._currentScriptEvent &&
            event.startTime > this._currentScriptEvent.endTime
        ) {
            this._currentScriptEvent = null
        }

        const eventData:EventData = event.args.data || event.args.beginData || {}
        const timelineData = TimelineData.forEvent(event)
        if (eventData.stackTrace)
            timelineData.stackTrace = eventData.stackTrace
        if (timelineData.stackTrace && event.name !== recordTypes.JSSample) {
            // TraceEvents come with 1-based line & column numbers. The frontend code
            // requires 0-based ones. Adjust the values.
            for (let i = 0; i < timelineData.stackTrace.length; ++i) {
                --timelineData.stackTrace[i].lineNumber
                --timelineData.stackTrace[i].columnNumber
            }
        }
        let pageFrameId = TimelineModel.eventFrameId(event)
        if (!pageFrameId && eventStack.length)
            pageFrameId = TimelineData.forEvent(
                eventStack[eventStack.length - 1]
            ).frameId
        timelineData.frameId =
            pageFrameId || (this._mainFrame && this._mainFrame.frameId) || ''
        this._asyncEventTracker.processEvent(event)

        if (this.isMarkerEvent(event)) this._ensureNamedTrack(TrackType.Timings)

        switch (event.name) {
        case recordTypes.ResourceSendRequest:
        case recordTypes.WebSocketCreate:
            timelineData.setInitiator(
                eventStack[eventStack.length - 1] || null
            )
            timelineData.url = eventData.url
            break

        case recordTypes.ScheduleStyleRecalculation:
            this._lastScheduleStyleRecalculation[eventData.frame] = event
            break

        case recordTypes.UpdateLayoutTree:
        case recordTypes.RecalculateStyles:
            this._invalidationTracker.didRecalcStyle(event)
            if (event.args['beginData'])
                timelineData.setInitiator(
                    this._lastScheduleStyleRecalculation[
                        event.args['beginData']['frame']
                    ]
                )
            this._lastRecalculateStylesEvent = event
            if (this._currentScriptEvent) {
                this._currentTaskLayoutAndRecalcEvents.push(event)
            }
            break

        case recordTypes.ScheduleStyleInvalidationTracking:
        case recordTypes.StyleRecalcInvalidationTracking:
        case recordTypes.StyleInvalidatorInvalidationTracking:
        case recordTypes.LayoutInvalidationTracking:
            this._invalidationTracker.addInvalidation(
                new InvalidationTrackingEvent(event)
            )
            break

        case recordTypes.InvalidateLayout: {
            // Consider style recalculation as a reason for layout invalidation,
            // but only if we had no earlier layout invalidation records.
            let layoutInitator = event
            const frameId = eventData['frame']
            if (
                !this._layoutInvalidate[frameId] &&
                this._lastRecalculateStylesEvent &&
                this._lastRecalculateStylesEvent.endTime > event.startTime
            )
                layoutInitator = TimelineData.forEvent(
                    this._lastRecalculateStylesEvent
                ).initiator()
            this._layoutInvalidate[frameId] = layoutInitator
            break
        }

        case recordTypes.Layout: {
            this._invalidationTracker.didLayout(event)
            const frameId = event.args['beginData']['frame']
            timelineData.setInitiator(this._layoutInvalidate[frameId])
            // In case we have no closing Layout event, endData is not available.
            if (event.args['endData'])
                timelineData.backendNodeId =
                    event.args['endData']['rootNode']
            this._layoutInvalidate[frameId] = null
            if (this._currentScriptEvent) {
                this._currentTaskLayoutAndRecalcEvents.push(event)
            }
            break
        }

        case recordTypes.Task:
            if (event.duration > Thresholds.LongTask)
                timelineData.warning = WarningType.LongTask
            break

        case recordTypes.EventDispatch:
            if (event.duration > Thresholds.RecurringHandler)
                timelineData.warning = WarningType.LongHandler
            break

        case recordTypes.TimerFire:
        case recordTypes.FireAnimationFrame:
            if (event.duration > Thresholds.RecurringHandler)
                timelineData.warning = WarningType.LongRecurringHandler
            break

        case recordTypes.FunctionCall:
            // Compatibility with old format.
            if (typeof eventData['scriptName'] === 'string')
                eventData['url'] = eventData['scriptName']
            if (typeof eventData['scriptLine'] === 'number')
                eventData['lineNumber'] = eventData['scriptLine']

        // Fallthrough.
        case recordTypes.EvaluateScript:
        case recordTypes.CompileScript:
            if (typeof eventData['lineNumber'] === 'number')
                --eventData['lineNumber']
            if (typeof eventData['columnNumber'] === 'number')
                --eventData['columnNumber']

        // Fallthrough intended.
        case recordTypes.RunMicrotasks:
            // Microtasks technically are not necessarily scripts, but for purpose of
            // forced sync style recalc or layout detection they are.
            if (!this._currentScriptEvent) {
                this._currentScriptEvent = event
            }
            break

        case recordTypes.SetLayerTreeId:
            // This is to support old traces.
            if (
                this._sessionId &&
                eventData['sessionId'] &&
                this._sessionId === eventData['sessionId']
            ) {
                this._mainFrameLayerTreeId = eventData['layerTreeId']
                break
            }

            // We currently only show layer tree for the main frame.
            const frameId = TimelineModel.eventFrameId(event)
            const pageFrame = this._pageFrames.get(frameId)
            if (!pageFrame || pageFrame.parent) return false
            this._mainFrameLayerTreeId = eventData['layerTreeId']
            break

        case recordTypes.Paint: {
            this._invalidationTracker.didPaint(event)
            timelineData.backendNodeId = eventData['nodeId']
            // Only keep layer paint events, skip paints for subframes that get painted to the same layer as parent.
            if (!eventData['layerId']) break
            const layerId = eventData['layerId']
            this._lastPaintForLayer[layerId] = event
            break
        }

        case recordTypes.DisplayItemListSnapshot:
        case recordTypes.PictureSnapshot: {
            const layerUpdateEvent = this._findAncestorEvent(recordTypes.UpdateLayer)

            if (
                !layerUpdateEvent ||
                layerUpdateEvent.args['layerTreeId'] !== this._mainFrameLayerTreeId
            ) {
                break
            }

            const paintEvent = this._lastPaintForLayer[
                layerUpdateEvent.args['layerId']
            ]
            if (paintEvent) {
                /** @type {!TracingModel.ObjectSnapshot} */
                TimelineData.forEvent(paintEvent).picture =  event
            }
            break
        }

        case recordTypes.ScrollLayer:
            timelineData.backendNodeId = eventData['nodeId']
            break

        case recordTypes.PaintImage:
            timelineData.backendNodeId = eventData['nodeId']
            timelineData.url = eventData['url']
            break

        case recordTypes.DecodeImage:
        case recordTypes.ResizeImage: {
            let paintImageEvent = this._findAncestorEvent(
                recordTypes.PaintImage
            )
            if (!paintImageEvent) {
                const decodeLazyPixelRefEvent = this._findAncestorEvent(
                    recordTypes.DecodeLazyPixelRef
                )
                paintImageEvent =
                    decodeLazyPixelRefEvent &&
                    this._paintImageEventByPixelRefId[
                        decodeLazyPixelRefEvent.args['LazyPixelRef']
                    ]
            }
            if (!paintImageEvent) break
            const paintImageData = TimelineData.forEvent(paintImageEvent)
            timelineData.backendNodeId = paintImageData.backendNodeId
            timelineData.url = paintImageData.url
            break
        }

        case recordTypes.DrawLazyPixelRef: {
            const paintImageEvent = this._findAncestorEvent(
                recordTypes.PaintImage
            )
            if (!paintImageEvent) break
            this._paintImageEventByPixelRefId[
                event.args['LazyPixelRef']
            ] = paintImageEvent
            const paintImageData = TimelineData.forEvent(paintImageEvent)
            timelineData.backendNodeId = paintImageData.backendNodeId
            timelineData.url = paintImageData.url
            break
        }

        case recordTypes.FrameStartedLoading:
            if (timelineData.frameId !== event.args['frame']) return false
            break

        case recordTypes.MarkDOMContent:
        case recordTypes.MarkLoad: {
            const frameId = TimelineModel.eventFrameId(event)
            if (!this._pageFrames.has(frameId)) return false
            break
        }

        case recordTypes.CommitLoad: {
            if (this._browserFrameTracking) {
                break
            }

            const frameId = TimelineModel.eventFrameId(event)
            const isMainFrame = !!eventData['isMainFrame']
            const pageFrame = this._pageFrames.get(frameId)
            if (pageFrame) {
                pageFrame.update(event.startTime, eventData)
            } else if (!this._persistentIds) {
                if (
                    eventData['page'] &&
                    eventData['page'] !== this._legacyCurrentPage
                ) {
                    return false
                }

            } else if (isMainFrame) {
                return false
            } else if (!this._addPageFrame(event, eventData)) {
                return false
            }

            if (isMainFrame) {
                this._mainFrame = this._pageFrames.get(frameId)
            }
            break
        }

        case recordTypes.FireIdleCallback:
            if (
                event.duration >
                eventData['allottedMilliseconds'] +
                    Thresholds.IdleCallbackAddon
            )
                timelineData.warning = WarningType.IdleDeadlineExceeded
            break
        }
        return true
    }

    /**
     * @param {!TracingModel.Event} event
     */
    private _processBrowserEvent(event: Event): void {
        if (event.name === RecordType.LatencyInfoFlow) {
            const frameId = event.args['frameTreeNodeId']
            if (
                typeof frameId === 'number' &&
                frameId === this._mainFrameNodeId
            )
                this._knownInputEvents.add(event.bind_id)
            return
        }

        if (
            event.hasCategory(DevToolsMetadataEventCategory) &&
            event.args['data']
        ) {
            const data = event.args['data']
            if (event.name === DevToolsMetadataEvent.TracingStartedInBrowser) {
                if (!data['persistentIds']) return
                this._browserFrameTracking = true
                this._mainFrameNodeId = data['frameTreeNodeId']
                const frames = data['frames'] || []
                frames.forEach((payload: EventData): void => {
                    const parent = (
                        payload['parent'] &&
                        this._pageFrames.get(payload['parent'])
                    )

                    if (payload['parent'] && !parent) {
                        return
                    }

                    let frame = this._pageFrames.get(payload['frame'])
                    if (!frame) {
                        frame = new PageFrame(payload)
                        this._pageFrames.set(frame.frameId, frame)
                        if (parent) {
                            parent.addChild(frame)
                        } else {
                            this._mainFrame = frame
                        }
                    }
                    // TODO: this should use event.startTime, but due to races between tracing start
                    // in different processes we cannot do this yet.
                    frame.update(this._minimumRecordTime, payload)
                })
                return
            }
            if (
                event.name === DevToolsMetadataEvent.FrameCommittedInBrowser &&
                this._browserFrameTracking
            ) {
                let frame = this._pageFrames.get(data['frame'])
                if (!frame) {
                    const parent = (
                        data['parent'] &&
                        this._pageFrames.get(data['parent'])
                    )

                    if (!parent) {
                        return
                    }

                    frame = new PageFrame(data)
                    this._pageFrames.set(frame.frameId, frame)
                    parent.addChild(frame)
                }
                frame.update(event.startTime, data)
                return
            }

            if (
                event.name === DevToolsMetadataEvent.ProcessReadyInBrowser &&
                this._browserFrameTracking
            ) {
                const frame = this._pageFrames.get(data['frame'])
                if (frame)
                    frame.processReady(
                        data['processPseudoId'],
                        data['processId']
                    )
                return
            }

            if (
                event.name === DevToolsMetadataEvent.FrameDeletedInBrowser &&
                this._browserFrameTracking
            ) {
                const frame = this._pageFrames.get(data['frame'])
                if (frame) {
                    frame.deletedTime = event.startTime
                }
                return
            }
        }
    }

    /**
     * @param {!TrackType} type
     * @return {!TimelineModel.Track}
     */
    private _ensureNamedTrack(type: TrackType): Track {
        if (!this._namedTracks.has(type)) {
            const track = new Track()
            track.type = type
            this._tracks.push(track)
            this._namedTracks.set(type, track)
        }
        return this._namedTracks.get(type)
    }

    /**
     * @param {string} name
     * @return {?TracingModel.Event}
     */
    private _findAncestorEvent(name: string): Event {
        for (let i = this._eventStack.length - 1; i >= 0; --i) {
            const event = this._eventStack[i]
            if (event.name === name) return event
        }
        return null
    }

    /**
     * @param {!TracingModel.Event} event
     * @param {!Object} payload
     * @return {boolean}
     */
    private _addPageFrame(event: Event, payload: PageFramePayload): boolean {
        const parent =
            payload['parent'] && this._pageFrames.get(payload['parent'])
        if (payload['parent'] && !parent) return false
        const pageFrame = new PageFrame(payload)
        this._pageFrames.set(pageFrame.frameId, pageFrame)
        pageFrame.update(event.startTime, payload)
        if (parent) parent.addChild(pageFrame)
        return true
    }

    /**
     * @return {boolean}
     */
    public isGenericTrace(): boolean {
        return this._isGenericTrace
    }

    /**
     * @return {!TracingModel}
     */
    public tracingModel(): TracingModel {
        return this._tracingModel
    }

    /**
     * @return {number}
     */
    public minimumRecordTime(): number {
        return this._minimumRecordTime
    }

    /**
     * @return {number}
     */
    public maximumRecordTime(): number {
        return this._maximumRecordTime
    }

    /**
     * @return {!Array<!TracingModel.Event>}
     */
    public inspectedTargetEvents(): Event[] {
        return this._inspectedTargetEvents
    }

    /**
     * @return {!Array<!TimelineModel.Track>}
     */
    public tracks(): Track[] {
        return this._tracks
    }

    /**
     * @return {boolean}
     */
    public isEmpty(): boolean {
        return this.minimumRecordTime() === 0 && this.maximumRecordTime() === 0
    }

    /**
     * @return {!Array<!TracingModel.Event>}
     */
    public timeMarkerEvents(): Event[] {
        return this._timeMarkerEvents
    }

    /**
     * @return {!Array<!PageFrame>}
     */
    public rootFrames(): PageFrame[] {
        return Array.from(this._pageFrames.values()).filter(
            (frame): boolean => !frame.parent
        )
    }

    /**
     * @return {string}
     */
    public pageURL(): string {
        return (this._mainFrame && this._mainFrame.url) || ''
    }

    /**
     * @param {string} frameId
     * @return {?PageFrame}
     */
    public pageFrameById(frameId: string): PageFrame {
        return frameId ? this._pageFrames.get(frameId) || null : null
    }

    /**
     * @return {!Array<!TimelineModel.NetworkRequest>}
     */
    public networkRequests(): NetworkRequest[] {
        if (this.isGenericTrace()) {
            return []
        }

        /** @type {!Map<string,!TimelineModel.NetworkRequest>} */
        const requests: Map<string, NetworkRequest> = new Map()
        /** @type {!Array<!TimelineModel.NetworkRequest>} */
        const requestsList: NetworkRequest[] = []
        /** @type {!Array<!TimelineModel.NetworkRequest>} */
        const zeroStartRequestsList: NetworkRequest[] = []
        const resourceTypes: Set<RecordType> = new Set([
            RecordType.ResourceSendRequest,
            RecordType.ResourceReceiveResponse,
            RecordType.ResourceReceivedData,
            RecordType.ResourceFinish,
        ])

        const events = this.inspectedTargetEvents()
        for (let i = 0; i < events.length; ++i) {
            const e = events[i]
            if (!resourceTypes.has(e.name)) {
                continue
            }

            const id = TimelineModel.globalEventId(e, 'requestId')
            let request = requests.get(id)

            if (request) {
                request.addEvent(e)
            } else {
                request = new NetworkRequest(e)
                requests.set(id, request)
                if (request.startTime) requestsList.push(request)
                else zeroStartRequestsList.push(request)
            }
        }
        return zeroStartRequestsList.concat(requestsList)
    }
}
