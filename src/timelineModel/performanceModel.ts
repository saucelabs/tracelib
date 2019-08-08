import TracingModel from '../tracingModel'
import TimelineModel from '.'
import TimelineFrameModel from './timelineFrameModel'
import Track, { TrackType } from './track'
import TimelineFrame from './timelineFrame/timelineFrame'
import { ThreadData, WarningType, StatsObject } from '../types'
import Event from '../tracingModel/event'
import TimelineData from './timelineData'

interface ExtensionTracingModel {
    title: string
    model: TracingModel
    timeOffset: number
}

export default class PerformanceModel {
    private _mainTarget: any
    private _tracingModel: TracingModel
    private _timelineModel: TimelineModel
    private _frameModel: TimelineFrameModel
    private _extensionTracingModels: ExtensionTracingModel[]
    private _recordStartTime: number
    public startTime: number
    public endTime: number

    public constructor() {
        /** @type {?SDK.Target} */
        this._mainTarget = null
        /** @type {?SDK.TracingModel} */
        this._tracingModel = null
        this._timelineModel = new TimelineModel()
        /** @type {!Array<!{title: string, model: !SDK.TracingModel, timeOffset: number}>} */
        this._extensionTracingModels = []
        /** @type {number|undefined} */
        this._recordStartTime = undefined
        this._frameModel = new TimelineFrameModel()
    }

    /**
     * @param {number} time
     */
    public setRecordStartTime(time: number): void {
        this._recordStartTime = time
    }

    /**
     * @return {number|undefined}
     */
    public recordStartTime(): number {
        return this._recordStartTime
    }

    /**
     * @param {!SDK.TracingModel} model
     */
    public setTracingModel(model: TracingModel): void {
        this._tracingModel = model
        this._timelineModel.setEvents(model)

        let inputEvents = null
        let animationEvents = null
        for (const track of this._timelineModel.tracks()) {
            if (track.type === TrackType.Input) {
                inputEvents = track.asyncEvents
            }
            if (track.type === TrackType.Animation) {
                animationEvents = track.asyncEvents
            }
        }

        const mainTracks = this._timelineModel
            .tracks()
            .filter((track): any => track.type === TrackType.MainThread && track.forMainFrame && track.events.length)
        const threadData = mainTracks.map((track): ThreadData => {
            const event = track.events[0]
            return { thread: event.thread, time: event.startTime }
        })
        this._frameModel.addTraceEvents(this._mainTarget, this._timelineModel.inspectedTargetEvents(), threadData)

        for (const entry of this._extensionTracingModels) {
            entry.model.adjustTime(
                this._tracingModel.minimumRecordTime() + entry.timeOffset / 1000 - this._recordStartTime
            )
        }
        this._autoWindowTimes()
    }

    public findMainTrack(): Track {
        return this._timelineModel
            .tracks()
            .find((track): any => track.type === TrackType.MainThread && track.forMainFrame && track.events.length)
    }

    public getWarningCounts(): StatsObject {
        return this.findMainTrack().events.reduce((counter: StatsObject, event: Event): StatsObject => {
            const timelineData = TimelineData.forEvent(event)
            const warning = timelineData.warning
            if (warning) {
                counter[warning] = counter[warning] ? counter[warning] + 1 : 1
            }
            return counter
        }, {})
    }

    /**
     * @param {string} title
     * @param {!SDK.TracingModel} model
     * @param {number} timeOffset
     */
    public addExtensionEvents(title: string, model: TracingModel, timeOffset: number): void {
        this._extensionTracingModels.push({ model: model, title: title, timeOffset: timeOffset })
        if (!this._tracingModel) {
            return
        }
        model.adjustTime(this._tracingModel.minimumRecordTime() + timeOffset / 1000 - this._recordStartTime)
    }

    /**
     * @return {!SDK.TracingModel}
     */
    public tracingModel(): TracingModel {
        if (!this._tracingModel) {
            throw 'call setTracingModel before accessing PerformanceModel'
        }
        return this._tracingModel
    }

    /**
     * @return {!TimelineModel.TimelineModel}
     */
    public timelineModel(): TimelineModel {
        return this._timelineModel
    }

    /**
     * @return {!Array<!TimelineModel.TimelineFrame>} frames
     */
    public frames(): TimelineFrame[] {
        return this._frameModel.frames()
    }

    /**
     * @return {!TimelineModel.TimelineFrameModel} frames
     */
    public frameModel(): TimelineFrameModel {
        return this._frameModel
    }

    public setWindow (option: {left: number, right: number}) : void {
        this.startTime = option.left
        this.endTime = option.right
    }

    private _autoWindowTimes(): void {
        const timelineModel = this._timelineModel
        let tasks: Event[] = []
        for (const track of timelineModel.tracks()) {
            // Deliberately pick up last main frame's track.
            if (track.type === TrackType.MainThread && track.forMainFrame) {
                tasks = track.tasks
            }
        }
        if (!tasks.length) {
            this.setWindow({ left: timelineModel.minimumRecordTime(), right: timelineModel.maximumRecordTime() })
            return
        }

        /**
         * @param {number} startIndex
         * @param {number} stopIndex
         * @return {number}
         */
        function findLowUtilizationRegion(startIndex: number, stopIndex: number): number {
            const /** @const */ threshold = 0.1
            let cutIndex = startIndex
            let cutTime = (tasks[cutIndex].startTime + tasks[cutIndex].endTime) / 2
            let usedTime = 0
            const step = Math.sign(stopIndex - startIndex)
            for (let i = startIndex; i !== stopIndex; i += step) {
                const task = tasks[i]
                const taskTime = (task.startTime + task.endTime) / 2
                const interval = Math.abs(cutTime - taskTime)
                if (usedTime < threshold * interval) {
                    cutIndex = i
                    cutTime = taskTime
                    usedTime = 0
                }
                usedTime += task.duration
            }
            return cutIndex
        }

        const rightIndex = findLowUtilizationRegion(tasks.length - 1, 0)
        const leftIndex = findLowUtilizationRegion(0, rightIndex)
        let leftTime = tasks[leftIndex].startTime
        let rightTime = tasks[rightIndex].endTime
        const span = rightTime - leftTime
        const totalSpan = timelineModel.maximumRecordTime() - timelineModel.minimumRecordTime()

        if (span < totalSpan * 0.1) {
            leftTime = timelineModel.minimumRecordTime()
            rightTime = timelineModel.maximumRecordTime()
        } else {
            leftTime = Math.max(leftTime - 0.05 * span, timelineModel.minimumRecordTime())
            rightTime = Math.min(rightTime + 0.05 * span, timelineModel.maximumRecordTime())
        }

        this.setWindow({ left: leftTime, right: rightTime })
    }
}
