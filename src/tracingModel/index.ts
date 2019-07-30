import Event from './event'
import Thread from './thread'
import Process from './process'
import AsyncEvent from './asyncEvent'
import NamedObject from './namedObject'
import TracingEvent from './event'
import ProfileEventsGroup from './profileEventsGroup'
import { EventPayload } from '../tracingManager'

export default class TracingModel {
    public static Phase = {
        Begin: 'B',
        End: 'E',
        Complete: 'X',
        Instant: 'I',
        AsyncBegin: 'S',
        AsyncStepInto: 'T',
        AsyncStepPast: 'p',
        AsyncEnd: 'F',
        NestableAsyncBegin: 'b',
        NestableAsyncEnd: 'e',
        NestableAsyncInstant: 'n',
        FlowBegin: 's',
        FlowStep: 't',
        FlowEnd: 'f',
        Metadata: 'M',
        Counter: 'C',
        Sample: 'P',
        CreateObject: 'N',
        SnapshotObject: 'O',
        DeleteObject: 'D'
    }

    public static MetadataEvent = {
        ProcessSortIndex: 'process_sort_index',
        ProcessName: 'process_name',
        ThreadSortIndex: 'thread_sort_index',
        ThreadName: 'thread_name'
    }

    public static LegacyTopLevelEventCategory = 'toplevel'
    public static DevToolsMetadataEventCategory = 'disabled-by-default-devtools.timeline'
    public static DevToolsTimelineEventCategory = 'disabled-by-default-devtools.timeline'
    public static FrameLifecycleEventCategory = 'cc,devtools'

    private _processById = Map
    private _processByName = Map
    private _minimumRecordTime = number
    private _maximumRecordTime = number
    private _devToolsMetadataEvents = [Event]
    private _asyncEvents = [Event];
    private _openAsyncEvents = Map
    private _openNestableAsyncEvents = Map
    private _profileGroups = Map
    private _parsedCategories = Map

    public constructor() {
        this._processById = new Map<string|number, Process>()
        this._processByName = new Map<string|number, Process>()
        this._minimumRecordTime = 0
        this._maximumRecordTime = 0
        this._devToolsMetadataEvents = []
        this._asyncEvents = []
        this._openAsyncEvents = new Map<string, AsyncEvent>()
        this._openNestableAsyncEvents = new Map<string, AsyncEvent>()
        this._profileGroups = new Map<string, ProfileEventsGroup>()
        this._parsedCategories = new Map<string, Set<string>>()
    }

    /**
     * @param {string} phase
     * @return {boolean}
     */
    public static isNestableAsyncPhase (phase: string): boolean {
        return phase === 'b' || phase === 'e' || phase === 'n'
    }

    /**
     * @param {string} phase
     * @return {boolean}
     */
    public static isAsyncBeginPhase (phase: string): boolean {
        return phase === 'S' || phase === 'b'
    }

    /**
     * @param {string} phase
     * @return {boolean}
     */
    public static isAsyncPhase (phase: string): boolean {
        return (
            TracingModel.isNestableAsyncPhase(phase) ||
            phase === 'S' ||
            phase === 'T' ||
            phase === 'F' ||
            phase === 'p'
        )
    }

    /**
     * @param {string} phase
     * @return {boolean}
     */
    public static isFlowPhase (phase: string): boolean {
        return phase === 's' || phase === 't' || phase === 'f'
    }

    /**
     * @param {!TracingModel.Event} event
     * @return {boolean}
     */
    public static isTopLevelEvent (event: TracingEvent): boolean {
        return (
            (event.hasCategory(TracingModel.DevToolsTimelineEventCategory) && event.name === 'RunTask') ||
            event.hasCategory(TracingModel.LegacyTopLevelEventCategory) ||
            (event.hasCategory(TracingModel.DevToolsMetadataEventCategory) && event.name === 'Program')
        ) // Older timelines may have this instead of toplevel.
    }

    /**
     * @param {!TracingManager.EventPayload} payload
     * @return {string|undefined}
     */
    private static _extractId (payload: EventPayload): string | undefined {
        const scope = payload.scope || ''
        if (typeof payload.id2 === 'undefined') {
            return scope && payload.id ? `${scope}@${payload.id}` : payload.id
        }

        const id2 = payload.id2
        if (typeof id2 === 'object' && 'global' in id2 !== 'local' in id2) {
            return typeof id2['global'] !== 'undefined'
                ? `:${scope}:${id2['global']}`
                : `:${scope}:${payload.pid}:${id2['local']}`
        }
        console.error(
            `Unexpected id2 field at ${payload.ts / 1000}, one and only one of 'local' and 'global' should be present.`
        )
    }

    /**
     * @param {!TracingModel} tracingModel
     * @return {?TracingModel.Thread}
     *
     * TODO: Move this to a better place. This is here just for convenience o
     * re-use between modules. This really belongs to a higher level, since it
     * is specific to chrome's usage of tracing.
     */
    public static browserMainThread (tracingModel: TracingModel): Thread | null {
        const processes = tracingModel.sortedProcesses()
        // Avoid warning for an empty model.
        if (!processes.length) return null
        const browserMainThreadName = 'CrBrowserMain'
        const browserProcesses = []
        const browserMainThreads = []
        for (const process of processes) {
            if (
                process
                    .name()
                    .toLowerCase()
                    .endsWith('browser')
            ) {
                browserProcesses.push(process)
            }

            browserMainThreads.push(...process.sortedThreads().filter(
                (t: Thread): boolean => t.name() === browserMainThreadName))
        }
        if (browserMainThreads.length === 1) return browserMainThreads[0]
        if (browserProcesses.length === 1) return browserProcesses[0].threadByName(browserMainThreadName)
        const tracingStartedInBrowser = tracingModel
            .devToolsMetadataEvents()
            .filter((e: Event): boolean => e.name === 'TracingStartedInBrowser')
        if (tracingStartedInBrowser.length === 1) return tracingStartedInBrowser[0].thread
        Common.console.error('Failed to find browser main thread in trace, some timeline features may be unavailable')
        return null
    }

    /**
     * @return {!Array.<!Event>}
     */
    public devToolsMetadataEvents (): Event[] {
        return this._devToolsMetadataEvents
    }

    /**
     * @param {!Array.<!TracingManager.EventPayload>} events
     */
    public addEvents (events: EventPayload): void {
        for (let i = 0; i < events.length; ++i) {
            this._addEvent(events[i])
        }
    }

    /**
     * @param {number} offset
     */
    public adjustTime (offset: number): void {
        this._minimumRecordTime += offset
        this._maximumRecordTime += offset
        for (const process of this._processById.values()) {
            for (const thread of process._threads.values()) {
                for (const event of thread.events()) {
                    event.startTime += offset
                    if (typeof event.endTime === 'number') {
                        event.endTime += offset
                    }
                }
                for (const event of thread.asyncEvents()) {
                    event.startTime += offset
                    if (typeof event.endTime === 'number') {
                        event.endTime += offset
                    }
                }
            }
        }
    }

    /**
     * @param {!EventPayload} payload
     */
    private _addEvent (payload: EventPayload): void {
        let process = this._processById.get(payload.pid)
        if (!process) {
            process = new Process(this, payload.pid)
            this._processById.set(payload.pid, process)
        }

        const phase = TracingModel.Phase
        const timestamp = payload.ts / 1000
        // We do allow records for unrelated threads to arrive out-of-order,
        // so there's a chance we're getting records from the past.
        if (
            timestamp &&
            (!this._minimumRecordTime || timestamp < this._minimumRecordTime) &&
            (payload.ph === phase.Begin || payload.ph === phase.Complete || payload.ph === phase.Instant)
        ) {
            this._minimumRecordTime = timestamp
        }

        const endTimeStamp = (payload.ts + (payload.dur || 0)) / 1000
        this._maximumRecordTime = Math.max(this._maximumRecordTime, endTimeStamp)
        const event = process._addEvent(payload)
        if (!event) {
            return
        }

        if (payload.ph === phase.Sample) {
            this._addSampleEvent(event)
            return
        }

        // Build async event when we've got events from all threads & processes, so we can sort them and process in the
        // chronological order. However, also add individual async events to the thread flow (above), so we can easily
        // display them on the same chart as other events, should we choose so.
        if (TracingModel.isAsyncPhase(payload.ph)) {
            this._asyncEvents.push(event)
        }

        if (event.hasCategory(TracingModel.DevToolsMetadataEventCategory)) {
            this._devToolsMetadataEvents.push(event)
        }

        if (payload.ph !== phase.Metadata) return

        switch (payload.name) {
        case TracingModel.MetadataEvent.ProcessSortIndex:
            process._setSortIndex(payload.args['sort_index'])
            break
        case TracingModel.MetadataEvent.ProcessName:
            const processName = payload.args['name']
            process._setName(processName)
            this._processByName.set(processName, process)
            break
        case TracingModel.MetadataEvent.ThreadSortIndex:
            process.threadById(payload.tid)._setSortIndex(payload.args['sort_index'])
            break
        case TracingModel.MetadataEvent.ThreadName:
            process.threadById(payload.tid)._setName(payload.args['name'])
            break
        }
    }

    /**
     * @param {!Event} event
     */
    private _addSampleEvent (event: Event): void {
        const id = `${event.thread.process().id()}:${event.id}`
        const group = this._profileGroups.get(id)

        if (group) {
            group._addChild(event)
            return
        }

        this._profileGroups.set(id, new ProfileEventsGroup(event))
    }

    /**
     * @param {!Event} event
     * @return {?ProfileEventsGroup}
     */
    public profileGroup (event: Event): ProfileEventsGroup | null {
        return this._profileGroups.get(`${event.thread.process().id()}:${event.id}`) || null
    }

    /**
     * @return {number}
     */
    public minimumRecordTime (): number {
        return this._minimumRecordTime
    }

    /**
     * @return {number}
     */
    public maximumRecordTime (): number {
        return this._maximumRecordTime
    }

    /**
     * @return {!Array.<!Process>}
     */
    public sortedProcesses (): Process[] {
        return NamedObject._sort(this._processById.valuesArray())
    }

    /**
     * @param {string} name
     * @return {?Process}
     */
    public processByName (name: string): Process {
        return this._processByName.get(name)
    }

    /**
     * @param {number} pid
     * @return {?Process}
     */
    public processById (pid: number): Process | null {
        return this._processById.get(pid) || null
    }

    /**
     * @param {string} processName
     * @param {string} threadName
     * @return {?Thread}
     */
    public threadByName (processName: string, threadName: string): Thread {
        const process = this.processByName(processName)
        return process && process.threadByName(threadName)
    }

    private _closeOpenAsyncEvents (): void {
        for (const event of this._openAsyncEvents.values()) {
            event.setEndTime(this._maximumRecordTime)
            // FIXME: remove this once we figure a better way to convert async console
            // events to sync [waterfall] timeline records.
            event.steps[0].setEndTime(this._maximumRecordTime)
        }
        this._openAsyncEvents.clear()

        for (const eventStack of this._openNestableAsyncEvents.values()) {
            while (eventStack.length) eventStack.pop().setEndTime(this._maximumRecordTime)
        }
        this._openNestableAsyncEvents.clear()
    }

    /**
     * @param {!Event} event
     */
    private _addNestableAsyncEvent (event: Event): void {
        const phase = TracingModel.Phase
        const key = event.categoriesString + '.' + event.id
        let openEventsStack = this._openNestableAsyncEvents.get(key)

        switch (event.phase) {
        case phase.NestableAsyncBegin:
            if (!openEventsStack) {
                openEventsStack = []
                this._openNestableAsyncEvents.set(key, openEventsStack)
            }
            const asyncEvent = new AsyncEvent(event)
            openEventsStack.push(asyncEvent)
            event.thread._addAsyncEvent(asyncEvent)
            break

        case phase.NestableAsyncInstant:
            if (openEventsStack && openEventsStack.length) {
                openEventsStack.peekLast()._addStep(event)
            }
            break

        case phase.NestableAsyncEnd:
            if (!openEventsStack || !openEventsStack.length) {
                break
            }
            const top = openEventsStack.pop()
            if (top.name !== event.name) {
                console.error(`Begin/end event mismatch for nestable async event, ${top.name} vs. ${event.name}, key: ${key}`)
                break
            }
            top._addStep(event)
        }
    }

    /**
     * @param {!Event} event
     */
    private _addAsyncEvent (event: Event): void {
        const phase = TracingModel.Phase
        const key = event.categoriesString + '.' + event.name + '.' + event.id
        let asyncEvent = this._openAsyncEvents.get(key)

        if (event.phase === phase.AsyncBegin) {
            if (asyncEvent) {
                console.error(`Event ${event.name} has already been started`)
                return
            }
            asyncEvent = new AsyncEvent(event)
            this._openAsyncEvents.set(key, asyncEvent)
            event.thread._addAsyncEvent(asyncEvent)
            return
        }
        if (!asyncEvent) {
            // Quietly ignore stray async events, we're probably too late for the start.
            return
        }
        if (event.phase === phase.AsyncEnd) {
            asyncEvent._addStep(event)
            this._openAsyncEvents.delete(key)
            return
        }
        if (event.phase === phase.AsyncStepInto || event.phase === phase.AsyncStepPast) {
            const lastStep = asyncEvent.steps.peekLast()
            if (lastStep.phase !== phase.AsyncBegin && lastStep.phase !== event.phase) {
                console.assert(
                    false,
                    'Async event step phase mismatch: ' +
                        lastStep.phase +
                        ' at ' +
                        lastStep.startTime +
                        ' vs. ' +
                        event.phase +
                        ' at ' +
                        event.startTime
                )
                return
            }
            asyncEvent._addStep(event)
            return
        }
        console.assert(false, 'Invalid async event phase')
    }

    /**
     * @param {string} str
     * @return {!Set<string>}
     */
    private _parsedCategoriesForString (str: string): Set<string> {
        let parsedCategories = this._parsedCategories.get(str)
        if (!parsedCategories) {
            parsedCategories = new Set(str ? str.split(',') : [])
            this._parsedCategories.set(str, parsedCategories)
        }
        return parsedCategories
    }
}
