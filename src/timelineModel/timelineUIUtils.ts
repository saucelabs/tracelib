import {
    timelineRecordObject,
    RecordType,
    CallFrame,
    timelineCategoryObject,
    Category,
    NetworkCategory,
    statsObject,
    statsArray,
} from '../types'
import TimelineRecordStyle from './timelineModelFilter/timelineRecordStyle'
import TimelineJSProfileProcessor, { NativeGroups } from './timelineJSProfileProcessor'
import Event from '../tracingModel/event'
import TimelineData from './timelineData'
import TracingModel, { Phase } from '../tracingModel'
import NetworkRequest from './networkRequest'
import TimelineModel from '.'
import { binaryIndexOf, upperBound } from '../utils'
import TimelineModelFilter from './timelineModelFilter/timelineModelFilter'
import TimelineVisibleEventsFilter from './timelineModelFilter/timelineVisibleEventsFilter'
import TimelineCategory from './timelineModelFilter/timelineCategory'

export enum CategoryBreakdownCacheSymbol {
    categoryBreakdownCache,
}

export default class TimelineUIUtils {
    private _eventStylesMap: timelineRecordObject
    private _interactionPhaseStylesMap: Map<any, any>
    private _categories: timelineCategoryObject

    constructor() {}

    /**
     * @return {!Object.<string, !Timeline.TimelineRecordStyle>}
     */
    private _initEventStyles(): timelineRecordObject {
        if (this._eventStylesMap) return this._eventStylesMap

        const type = RecordType
        const categories = this.categories()
        const rendering = categories['rendering']
        const scripting = categories['scripting']
        const loading = categories['loading']
        const painting = categories['painting']
        const other = categories['other']

        const eventStyles: timelineRecordObject = {}
        eventStyles[type.Task] = new TimelineRecordStyle(`Task`, other)
        eventStyles[type.Program] = new TimelineRecordStyle(`Other`, other)
        eventStyles[type.Animation] = new TimelineRecordStyle(`Animation`, rendering)
        eventStyles[type.EventDispatch] = new TimelineRecordStyle(`Event`, scripting)
        eventStyles[type.RequestMainThreadFrame] = new TimelineRecordStyle(`Request Main Thread Frame`, rendering, true)
        eventStyles[type.BeginFrame] = new TimelineRecordStyle(`Frame Start`, rendering, true)
        eventStyles[type.BeginMainThreadFrame] = new TimelineRecordStyle(`Frame Start (main thread)`, rendering, true)
        eventStyles[type.DrawFrame] = new TimelineRecordStyle(`Draw Frame`, rendering, true)
        eventStyles[type.HitTest] = new TimelineRecordStyle(`Hit Test`, rendering)
        eventStyles[type.ScheduleStyleRecalculation] = new TimelineRecordStyle(
            `Schedule Style Recalculation`,
            rendering
        )
        eventStyles[type.RecalculateStyles] = new TimelineRecordStyle(`Recalculate Style`, rendering)
        eventStyles[type.UpdateLayoutTree] = new TimelineRecordStyle(`Recalculate Style`, rendering)
        eventStyles[type.InvalidateLayout] = new TimelineRecordStyle(`Invalidate Layout`, rendering, true)
        eventStyles[type.Layout] = new TimelineRecordStyle(`Layout`, rendering)
        eventStyles[type.PaintSetup] = new TimelineRecordStyle(`Paint Setup`, painting)
        eventStyles[type.PaintImage] = new TimelineRecordStyle(`Paint Image`, painting, true)
        eventStyles[type.UpdateLayer] = new TimelineRecordStyle(`Update Layer`, painting, true)
        eventStyles[type.UpdateLayerTree] = new TimelineRecordStyle(`Update Layer Tree`, rendering)
        eventStyles[type.Paint] = new TimelineRecordStyle(`Paint`, painting)
        eventStyles[type.RasterTask] = new TimelineRecordStyle(`Rasterize Paint`, painting)
        eventStyles[type.ScrollLayer] = new TimelineRecordStyle(`Scroll`, rendering)
        eventStyles[type.CompositeLayers] = new TimelineRecordStyle(`Composite Layers`, painting)
        eventStyles[type.ParseHTML] = new TimelineRecordStyle(`Parse HTML`, loading)
        eventStyles[type.ParseAuthorStyleSheet] = new TimelineRecordStyle(`Parse Stylesheet`, loading)
        eventStyles[type.TimerInstall] = new TimelineRecordStyle(`Install Timer`, scripting)
        eventStyles[type.TimerRemove] = new TimelineRecordStyle(`Remove Timer`, scripting)
        eventStyles[type.TimerFire] = new TimelineRecordStyle(`Timer Fired`, scripting)
        eventStyles[type.XHRReadyStateChange] = new TimelineRecordStyle(`XHR Ready State Change`, scripting)
        eventStyles[type.XHRLoad] = new TimelineRecordStyle(`XHR Load`, scripting)
        eventStyles[type.CompileScript] = new TimelineRecordStyle(`Compile Script`, scripting)
        eventStyles[type.EvaluateScript] = new TimelineRecordStyle(`Evaluate Script`, scripting)
        eventStyles[type.CompileModule] = new TimelineRecordStyle(`Compile Module`, scripting)
        eventStyles[type.EvaluateModule] = new TimelineRecordStyle(`Evaluate Module`, scripting)
        eventStyles[type.ParseScriptOnBackground] = new TimelineRecordStyle(`Parse Script`, scripting)
        eventStyles[type.WasmStreamFromResponseCallback] = new TimelineRecordStyle(`Streaming Wasm Response`, scripting)
        eventStyles[type.WasmCompiledModule] = new TimelineRecordStyle(`Compiled Wasm Module`, scripting)
        eventStyles[type.WasmCachedModule] = new TimelineRecordStyle(`Cached Wasm Module`, scripting)
        eventStyles[type.WasmModuleCacheHit] = new TimelineRecordStyle(`Wasm Module Cache Hit`, scripting)
        eventStyles[type.WasmModuleCacheInvalid] = new TimelineRecordStyle(`Wasm Module Cache Invalid`, scripting)
        eventStyles[type.FrameStartedLoading] = new TimelineRecordStyle(`Frame Started Loading`, loading, true)
        eventStyles[type.MarkLoad] = new TimelineRecordStyle(`Onload Event`, scripting, true)
        eventStyles[type.MarkDOMContent] = new TimelineRecordStyle(`DOMContentLoaded Event`, scripting, true)
        eventStyles[type.MarkFirstPaint] = new TimelineRecordStyle(`First Paint`, painting, true)
        eventStyles[type.MarkFCP] = new TimelineRecordStyle(`First Contentful Paint`, rendering, true)
        eventStyles[type.MarkFMP] = new TimelineRecordStyle(`First Meaningful Paint`, rendering, true)
        eventStyles[type.TimeStamp] = new TimelineRecordStyle(`Timestamp`, scripting)
        eventStyles[type.ConsoleTime] = new TimelineRecordStyle(`Console Time`, scripting)
        eventStyles[type.UserTiming] = new TimelineRecordStyle(`User Timing`, scripting)
        eventStyles[type.ResourceSendRequest] = new TimelineRecordStyle(`Send Request`, loading)
        eventStyles[type.ResourceReceiveResponse] = new TimelineRecordStyle(`Receive Response`, loading)
        eventStyles[type.ResourceFinish] = new TimelineRecordStyle(`Finish Loading`, loading)
        eventStyles[type.ResourceReceivedData] = new TimelineRecordStyle(`Receive Data`, loading)
        eventStyles[type.RunMicrotasks] = new TimelineRecordStyle(`Run Microtasks`, scripting)
        eventStyles[type.FunctionCall] = new TimelineRecordStyle(`Function Call`, scripting)
        eventStyles[type.GCEvent] = new TimelineRecordStyle(`GC Event`, scripting)
        eventStyles[type.MajorGC] = new TimelineRecordStyle(`Major GC`, scripting)
        eventStyles[type.MinorGC] = new TimelineRecordStyle(`Minor GC`, scripting)
        eventStyles[type.JSFrame] = new TimelineRecordStyle(`JS Frame`, scripting)
        eventStyles[type.RequestAnimationFrame] = new TimelineRecordStyle(`Request Animation Frame`, scripting)
        eventStyles[type.CancelAnimationFrame] = new TimelineRecordStyle(`Cancel Animation Frame`, scripting)
        eventStyles[type.FireAnimationFrame] = new TimelineRecordStyle(`Animation Frame Fired`, scripting)
        eventStyles[type.RequestIdleCallback] = new TimelineRecordStyle(`Request Idle Callback`, scripting)
        eventStyles[type.CancelIdleCallback] = new TimelineRecordStyle(`Cancel Idle Callback`, scripting)
        eventStyles[type.FireIdleCallback] = new TimelineRecordStyle(`Fire Idle Callback`, scripting)
        eventStyles[type.WebSocketCreate] = new TimelineRecordStyle(`Create WebSocket`, scripting)
        eventStyles[type.WebSocketSendHandshakeRequest] = new TimelineRecordStyle(`Send WebSocket Handshake`, scripting)
        eventStyles[type.WebSocketReceiveHandshakeResponse] = new TimelineRecordStyle(
            `Receive WebSocket Handshake`,
            scripting
        )
        eventStyles[type.WebSocketDestroy] = new TimelineRecordStyle(`Destroy WebSocket`, scripting)
        eventStyles[type.EmbedderCallback] = new TimelineRecordStyle(`Embedder Callback`, scripting)
        eventStyles[type.DecodeImage] = new TimelineRecordStyle(`Image Decode`, painting)
        eventStyles[type.ResizeImage] = new TimelineRecordStyle(`Image Resize`, painting)
        eventStyles[type.GPUTask] = new TimelineRecordStyle(`GPU`, categories['gpu'])
        eventStyles[type.LatencyInfo] = new TimelineRecordStyle(`Input Latency`, scripting)

        eventStyles[type.GCCollectGarbage] = new TimelineRecordStyle(`DOM GC`, scripting)

        eventStyles[type.CryptoDoEncrypt] = new TimelineRecordStyle(`Encrypt`, scripting)
        eventStyles[type.CryptoDoEncryptReply] = new TimelineRecordStyle(`Encrypt Reply`, scripting)
        eventStyles[type.CryptoDoDecrypt] = new TimelineRecordStyle(`Decrypt`, scripting)
        eventStyles[type.CryptoDoDecryptReply] = new TimelineRecordStyle(`Decrypt Reply`, scripting)
        eventStyles[type.CryptoDoDigest] = new TimelineRecordStyle(`Digest`, scripting)
        eventStyles[type.CryptoDoDigestReply] = new TimelineRecordStyle(`Digest Reply`, scripting)
        eventStyles[type.CryptoDoSign] = new TimelineRecordStyle(`Sign`, scripting)
        eventStyles[type.CryptoDoSignReply] = new TimelineRecordStyle(`Sign Reply`, scripting)
        eventStyles[type.CryptoDoVerify] = new TimelineRecordStyle(`Verify`, scripting)
        eventStyles[type.CryptoDoVerifyReply] = new TimelineRecordStyle(`Verify Reply`, scripting)

        eventStyles[type.AsyncTask] = new TimelineRecordStyle(`Async Task`, categories['async'])

        this._eventStylesMap = eventStyles
        return eventStyles
    }

    /**
     * @param {!TimelineModel.TimelineIRModel.InputEvents} inputEventType
     * @return {?string}
     */
    public static inputEventDisplayName(inputEventType: any): string {
        return null
    }

    /**
     * @param {!Protocol.Runtime.CallFrame} frame
     * @return {string}
     */
    public static frameDisplayName(frame: CallFrame): string {
        if (!TimelineJSProfileProcessor.isNativeRuntimeFrame(frame)) {
            return frame.functionName
        }
        const nativeGroup = TimelineJSProfileProcessor.nativeGroup(frame.functionName)
        const groups = NativeGroups
        switch (nativeGroup) {
            case groups.Compile:
                return `Compile`
            case groups.Parse:
                return `Parse`
        }
        return frame.functionName
    }

    /**
     * @param {!SDK.TracingModel.Event} traceEvent
     * @param {!RegExp} regExp
     * @return {boolean}
     */
    public testContentMatching(traceEvent: Event, regExp: RegExp): boolean {
        const title = this.eventStyle(traceEvent).title
        const tokens: any[] = [title]
        const url = TimelineData.forEvent(traceEvent).url
        if (url) tokens.push(url)
        appendObjectProperties(traceEvent.args, 2)
        return regExp.test(tokens.join('|'))

        /**
         * @param {!Object} object
         * @param {number} depth
         */
        function appendObjectProperties(object: any, depth: number): void {
            if (!depth) {
                return
            }
            for (const key in object) {
                const value = object[key]
                const type = typeof value
                if (type === 'string') tokens.push(value)
                else if (type === 'number') tokens.push(String(value))
                else if (type === 'object') appendObjectProperties(value, depth - 1)
            }
        }
    }

    /**
     * @param {!SDK.TracingModel.Event} event
     * @return {?string}
     */
    public static eventURL(event: Event): string {
        const data = event.args['data'] || event.args['beginData']
        const url = data && data.url
        if (url) {
            return url
        }
        const stackTrace = data && data['stackTrace']
        const frame: any = (stackTrace && stackTrace.length && stackTrace[0]) || TimelineData.forEvent(event).topFrame()
        return (frame && frame.url) || null
    }

    /**
     * @param {!SDK.TracingModel.Event} event
     * @return {!{title: string, category: !Timeline.TimelineCategory}}
     */
    public eventStyle(event: Event): { title: string; category: TimelineCategory } {
        const eventStyles = this._initEventStyles()
        if (event.hasCategory(Category.Console) || event.hasCategory(Category.UserTiming))
            return {
                title: event.name,
                category: this.categories()['scripting'],
            }

        if (event.hasCategory(Category.LatencyInfo)) {
            /** @const */
            const prefix = 'InputLatency::'
            const inputEventType = event.name.startsWith(prefix) ? event.name.substr(prefix.length) : event.name
            const displayName = TimelineUIUtils.inputEventDisplayName(
                /** @type {!TimelineModel.TimelineIRModel.InputEvents} */ inputEventType
            )
            return { title: displayName || inputEventType, category: this.categories()['scripting'] }
        }
        let result = eventStyles[event.name]
        if (!result) {
            result = new TimelineRecordStyle(event.name, this.categories()['other'], true)
            eventStyles[event.name] = result
        }
        return result
    }

    /**
     * @param {!SDK.TracingModel.Event} event
     * @return {string}
     */
    public eventTitle(event: Event): string {
        const recordType = RecordType
        const eventData: any = event.args['data']
        if (event.name === recordType.JSFrame) return TimelineUIUtils.frameDisplayName(eventData)
        const title = this.eventStyle(event).title
        if (event.hasCategory(Category.Console)) return title
        if (event.name === recordType.TimeStamp) return `${title}: ${eventData['message']}`
        if (event.name === recordType.Animation && eventData && eventData['name'])
            return `${title}: ${eventData['name']}`
        if (event.name === recordType.EventDispatch && eventData && eventData['type'])
            return `${title}: ${eventData['type']}`
        return title
    }

    /**
     * @param {!Protocol.Runtime.CallFrame} frame
     * @return {boolean}
     */
    public static isUserFrame(frame: CallFrame): boolean {
        return frame.scriptId !== '0' && !(frame.url && frame.url.startsWith('native '))
    }

    /**
     * @param {!TimelineModel.TimelineModel.NetworkRequest} request
     * @return {!TimelineUIUtils.NetworkCategory}
     */
    public static networkRequestCategory(request: NetworkRequest): NetworkCategory {
        const categories = NetworkCategory
        switch (request.mimeType) {
            case 'text/html':
                return categories.HTML
            case 'application/javascript':
            case 'application/x-javascript':
            case 'text/javascript':
                return categories.Script
            case 'text/css':
                return categories.Style
            case 'audio/ogg':
            case 'image/gif':
            case 'image/jpeg':
            case 'image/png':
            case 'image/svg+xml':
            case 'image/webp':
            case 'image/x-icon':
            case 'font/opentype':
            case 'font/woff2':
            case 'application/font-woff':
                return categories.Media
            default:
                return categories.Other
        }
    }

    /**
     * @param {!TimelineUIUtils.NetworkCategory} category
     * @return {string}
     */
    public static networkCategoryColor(category: NetworkCategory): string {
        const categories = NetworkCategory
        switch (category) {
            case categories.HTML:
                return 'hsl(214, 67%, 66%)'
            case categories.Script:
                return 'hsl(43, 83%, 64%)'
            case categories.Style:
                return 'hsl(256, 67%, 70%)'
            case categories.Media:
                return 'hsl(109, 33%, 55%)'
            default:
                return 'hsl(0, 0%, 70%)'
        }
    }

    /**
     * @param {!SDK.TracingModel.Event} event
     * @param {?SDK.Target} target
     * @return {?string}
     */
    public static buildDetailsTextForTraceEvent(event: Event, target?: any): string {
        const recordType = RecordType
        let detailsText
        const eventArgs: any = event.args
        const eventData = eventArgs['data']
        switch (event.name) {
            case recordType.GCEvent:
            case recordType.MajorGC:
            case recordType.MinorGC: {
                const delta = eventArgs['usedHeapSizeBefore'] - eventArgs['usedHeapSizeAfter']
                detailsText = `${delta} collected`
                break
            }
            case recordType.FunctionCall:
                if (eventData) {
                    detailsText = linkifyLocationAsText(
                        eventData['scriptId'],
                        eventData['lineNumber'],
                        eventData['columnNumber']
                    )
                }
                break
            case recordType.JSFrame:
                detailsText = TimelineUIUtils.frameDisplayName(eventData)
                break
            case recordType.EventDispatch:
                detailsText = eventData ? eventData['type'] : null
                break
            case recordType.Paint: {
                const width = TimelineUIUtils.quadWidth(eventData.clip)
                const height = TimelineUIUtils.quadHeight(eventData.clip)
                if (width && height) detailsText = `${width}\xa0\u00d7\xa0${height}`
                break
            }
            case recordType.ParseHTML: {
                const startLine = eventArgs['beginData']['startLine']
                const endLine = eventArgs['endData'] && eventArgs['endData']['endLine']
                const url = eventArgs['beginData']['url']
                if (endLine >= 0) detailsText = `${url}, ${startLine + 1}, ${endLine + 1}`
                else detailsText = `${url} [${startLine + 1}\u2026]`
                break
            }
            case recordType.CompileModule:
                detailsText = eventArgs['fileName']
                break
            case recordType.CompileScript:
            case recordType.EvaluateScript: {
                const url = eventData && eventData['url']
                if (url) detailsText = url + ':' + (eventData['lineNumber'] + 1)
                break
            }
            case recordType.WasmCompiledModule:
            case recordType.WasmModuleCacheHit: {
                const url = eventArgs['url']
                if (url) detailsText = url
                break
            }

            case recordType.ParseScriptOnBackground:
            case recordType.XHRReadyStateChange:
            case recordType.XHRLoad: {
                const url = eventData['url']
                if (url) detailsText = url
                break
            }
            case recordType.TimeStamp:
                detailsText = eventData['message']
                break

            case recordType.WebSocketCreate:
            case recordType.WebSocketSendHandshakeRequest:
            case recordType.WebSocketReceiveHandshakeResponse:
            case recordType.WebSocketDestroy:
            case recordType.ResourceSendRequest:
            case recordType.ResourceReceivedData:
            case recordType.ResourceReceiveResponse:
            case recordType.ResourceFinish:
            case recordType.PaintImage:
            case recordType.DecodeImage:
            case recordType.ResizeImage:
            case recordType.DecodeLazyPixelRef: {
                const url = TimelineData.forEvent(event).url
                if (url) detailsText = url
                break
            }

            case recordType.EmbedderCallback:
                detailsText = eventData['callbackName']
                break

            case recordType.Animation:
                detailsText = eventData && eventData['name']
                break

            case recordType.AsyncTask:
                detailsText = eventData ? eventData['name'] : null
                break

            default:
                if (event.hasCategory(Category.Console)) detailsText = null
                else detailsText = linkifyTopCallFrameAsText()
                break
        }

        return detailsText

        /**
         * @param {string} scriptId
         * @param {number} lineNumber
         * @param {number} columnNumber
         * @return {?string}
         */
        function linkifyLocationAsText(scriptId: string, lineNumber: number, columnNumber: number): string {
            return null
        }

        /**
         * @return {?string}
         */
        function linkifyTopCallFrameAsText(): string {
            const frame = TimelineData.forEvent(event).topFrame()
            if (!frame) return null
            let text = linkifyLocationAsText(frame.scriptId, frame.lineNumber, frame.columnNumber)
            if (!text) {
                text = frame.url
                if (typeof frame.lineNumber === 'number') text += ':' + (frame.lineNumber + 1)
            }
            return text
        }
    }

    /**
     * @param {!Array<!SDK.TracingModel.Event>} events
     * @param {number} startTime
     * @param {number} endTime
     * @return {!Object<string, number>}
     */
    public statsForTimeRange(events: Event[], startTime: number, endTime: number): statsObject {
        const eventStyle = this.eventStyle.bind(this)
        const visibleEventsFilterFunc = this.visibleEventsFilter.bind(this)
        if (!events.length) return { idle: endTime - startTime }

        buildRangeStatsCacheIfNeeded(events);
        const aggregatedStats = subtractStats(aggregatedStatsAtTime(endTime), aggregatedStatsAtTime(startTime))
        const aggregatedTotal: any = Object.values(aggregatedStats).reduce((a: any, b: any) => a + b, 0)
        aggregatedStats['idle'] = Math.max(0, endTime - startTime - aggregatedTotal)
        return aggregatedStats

        /**
         * @param {number} time
         * @return {!Object}
         */
        function aggregatedStatsAtTime(time: number): statsObject {
            const stats: statsObject = {}
            const cache: any = events[CategoryBreakdownCacheSymbol.categoryBreakdownCache]
            for (const category in cache) {
                const categoryCache = cache[category]
                let value
                if (!categoryCache.time) {
                    value = 0
                } else {
                    const index = upperBound(categoryCache.time, time)
                    if (index === 0) {
                        value = 0
                    } else if (index === categoryCache.time.length) {
                        value = categoryCache.value[categoryCache.value.length - 1]
                    } else {
                        const t0 = categoryCache.time[index - 1]
                        const t1 = categoryCache.time[index]
                        const v0 = categoryCache.value[index - 1]
                        const v1 = categoryCache.value[index]
                        value = v0 + ((v1 - v0) * (time - t0)) / (t1 - t0)
                    }
                }
                stats[category] = value
            }
            return stats
        }

        /**
         * @param {!Object<string, number>} a
         * @param {!Object<string, number>} b
         * @return {!Object<string, number>}
         */
        function subtractStats(a: statsObject, b: statsObject): statsObject {
            const result = Object.assign({}, a)
            for (const key in b) result[key] -= b[key]
            return result
        }

        /**
         * @param {!Array<!SDK.TracingModel.Event>} events
         */
        function buildRangeStatsCacheIfNeeded(events: Event[]): void {
            // if (events[CategoryBreakdownCacheSymbol.categoryBreakdownCache]) return

            // aggeregatedStats is a map by categories. For each category there's an array
            // containing sorted time points which records accumulated value of the category.
            const aggregatedStats: statsArray = {}
            const categoryStack: string[] = []
            let lastTime = 0
            TimelineModel.forEachEvent(
                events,
                onStartEvent,
                onEndEvent,
                undefined,
                undefined,
                undefined,
                filterForStats()
            )

            /**
             * @return {function(!SDK.TracingModel.Event):boolean}
             */
            function filterForStats(): any {
                const visibleEventsFilter = visibleEventsFilterFunc()
                return (event: Event) => visibleEventsFilter.accept(event) || TracingModel.isTopLevelEvent(event)
            }

            /**
             * @param {string} category
             * @param {number} time
             */
            function updateCategory(category: string, time: number): void {
                let statsArrays = aggregatedStats[category]
                if (!statsArrays) {
                    statsArrays = { time: [], value: [] }
                    aggregatedStats[category] = statsArrays
                }
                if (statsArrays.time.length && statsArrays.time[statsArrays.time.length - 1] === time) return
                const lastValue = statsArrays.value.length ? statsArrays.value[statsArrays.value.length - 1] : 0
                statsArrays.value.push(lastValue + time - lastTime)
                statsArrays.time.push(time)
            }

            /**
             * @param {?string} from
             * @param {?string} to
             * @param {number} time
             */
            function categoryChange(from?: string, to?: string, time?: number): void {
                if (from) updateCategory(from, time)
                lastTime = time
                if (to) updateCategory(to, time)
            }

            /**
             * @param {!SDK.TracingModel.Event} e
             */
            function onStartEvent(e: Event): void {
                const category = eventStyle(e).category.name
                const parentCategory = categoryStack.length ? categoryStack[categoryStack.length - 1] : null
                if (category !== parentCategory) categoryChange(parentCategory, category, e.startTime)
                categoryStack.push(category)
            }

            /**
             * @param {!SDK.TracingModel.Event} e
             */
            function onEndEvent(e: Event): void {
                const category = categoryStack.pop()
                const parentCategory = categoryStack.length ? categoryStack[categoryStack.length - 1] : null
                if (category !== parentCategory) categoryChange(category, parentCategory, e.endTime)
            }

            const obj: any = /** @type {!Object} */ events
            obj[CategoryBreakdownCacheSymbol.categoryBreakdownCache] = aggregatedStats
        }
    }

    /**
     * @param {!Array<!Protocol.Runtime.CallFrame>} callFrames
     * @return {!Protocol.Runtime.StackTrace}
     */
    public static _stackTraceFromCallFrames(callFrames: any): any {
        return /** @type {!Protocol.Runtime.StackTrace} */ { callFrames: callFrames }
    }

    /**
     * @param {!Object} total
     * @param {!TimelineModel.TimelineModel} model
     * @param {!SDK.TracingModel.Event} event
     * @return {boolean}
     */
    private _aggregatedStatsForTraceEvent(total: any, model: TimelineModel, event: Event): boolean {
        const events = model.inspectedTargetEvents()
        /**
         * @param {number} startTime
         * @param {!SDK.TracingModel.Event} e
         * @return {number}
         */
        function eventComparator(startTime: number, e: Event): number {
            return startTime - e.startTime
        }
        const index = binaryIndexOf(events, event.startTime, eventComparator)
        // Not a main thread event?
        if (index < 0) return false
        let hasChildren = false
        const endTime = event.endTime
        if (endTime) {
            for (let i = index; i < events.length; i++) {
                const nextEvent = events[i]
                if (nextEvent.startTime >= endTime) break
                if (!nextEvent.selfTime) continue
                if (nextEvent.thread !== event.thread) continue
                if (i > index) hasChildren = true
                const categoryName = this.eventStyle(nextEvent).category.name
                total[categoryName] = (total[categoryName] || 0) + nextEvent.selfTime
            }
        }
        if (TracingModel.isAsyncPhase(event.phase)) {
            if (event.endTime) {
                let aggregatedTotal = 0
                for (const categoryName in total) aggregatedTotal += total[categoryName]
                total['idle'] = Math.max(0, event.endTime - event.startTime - aggregatedTotal)
            }
            return false
        }
        return hasChildren
    }

    /**
     * @return {!Array.<string>}
     */
    private _visibleTypes(): string[] {
        const eventStyles = this._initEventStyles()
        const result = []
        for (const name in eventStyles) {
            if (!eventStyles[name].hidden) result.push(name)
        }
        return result
    }

    /**
     * @return {!TimelineModel.TimelineModelFilter}
     */
    public visibleEventsFilter(): TimelineModelFilter {
        return new TimelineVisibleEventsFilter(this._visibleTypes())
    }

    /**
     * @return {!Object.<string, !Timeline.TimelineCategory>}
     */
    public categories(): timelineCategoryObject {
        if (this._categories) return this._categories
        this._categories = {
            loading: new TimelineCategory('loading', `Loading`, true, 'hsl(214, 67%, 74%)', 'hsl(214, 67%, 66%)'),
            scripting: new TimelineCategory(
                'scripting',
                `ScriptingYo3`,
                true,
                'hsl(43, 83%, 72%)',
                'hsl(43, 83%, 64%) '
            ),
            rendering: new TimelineCategory('rendering', `Rendering`, true, 'hsl(256, 67%, 76%)', 'hsl(256, 67%, 70%)'),
            painting: new TimelineCategory('painting', `Painting`, true, 'hsl(109, 33%, 64%)', 'hsl(109, 33%, 55%)'),
            gpu: new TimelineCategory('gpu', `GPU`, false, 'hsl(109, 33%, 64%)', 'hsl(109, 33%, 55%)'),
            async: new TimelineCategory('async', `Async`, false, 'hsl(0, 100%, 50%)', 'hsl(0, 100%, 40%)'),
            other: new TimelineCategory('other', `System`, false, 'hsl(0, 0%, 87%)', 'hsl(0, 0%, 79%)'),
            idle: new TimelineCategory('idle', `Idle`, false, 'hsl(0, 0%, 98%)', 'hsl(0, 0%, 98%)'),
        }
        return this._categories
    }

    /**
     * @param {!Array.<number>} quad
     * @return {number}
     */
    public static quadWidth(quad: number[]): number {
        return Math.round(Math.sqrt(Math.pow(quad[0] - quad[2], 2) + Math.pow(quad[1] - quad[3], 2)))
    }

    /**
     * @param {!Array.<number>} quad
     * @return {number}
     */
    public static quadHeight(quad: number[]): number {
        return Math.round(Math.sqrt(Math.pow(quad[0] - quad[6], 2) + Math.pow(quad[1] - quad[7], 2)))
    }

    /**
     * @param {!SDK.TracingModel.Event} event
     * @return {?string}
     */
    public static markerShortTitle(event: Event): string {
        const recordTypes = RecordType
        switch (event.name) {
            case recordTypes.MarkDOMContent:
                return `DCL`
            case recordTypes.MarkLoad:
                return `L`
            case recordTypes.MarkFirstPaint:
                return `FP`
            case recordTypes.MarkFCP:
                return `FCP`
            case recordTypes.MarkFMP:
                return `FMP`
        }
        return null
    }
}
