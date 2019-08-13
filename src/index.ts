import { Range, StatsObject } from './types'
import TimelineLoader from './loader'
import { calcFPS } from './utils'
import Track, { TrackType } from './timelineModel/track'
import TimelineUIUtils from './timelineModel/timelineUIUtils'
import PerformanceModelUtils from '../custom/performanceModelUtils'
import PerformanceModel from './timelineModel/performanceModel'

export default class Tracelib {
    public tracelog: object
    private _timelineLoader: TimelineLoader
    private _performanceModel: PerformanceModel
    private _performanceModelUtils: PerformanceModelUtils

    public constructor (tracelog: object, range?: Range) {
        this.tracelog = tracelog
        this._timelineLoader = new TimelineLoader(this.tracelog)
        this._timelineLoader.init()
        this._performanceModel = this._timelineLoader.performanceModel
        this._performanceModelUtils = new PerformanceModelUtils(this._performanceModel)
    }

    public getFPS(): number[] {
        return this._timelineLoader.performanceModel.frames()
            .map(( { duration } ): number => calcFPS(duration))
    }

    public getSummary(from?: number, to?: number): StatsObject {
        const performanceModel = this._timelineLoader.performanceModel

        const timelineUtils = new TimelineUIUtils()
        const startTime = from || performanceModel.startTime
        const endTime = to || performanceModel.endTime
        return {
            ...timelineUtils.statsForTimeRange(
                this._performanceModelUtils.findMainTrack().syncEvents(), startTime, endTime
            ),
            startTime,
            endTime,
        }
    }

    public getWarningCounts(): StatsObject {
        return this._performanceModelUtils.getWarningCounts()
    }

    public getMainThreadEventsLength(): number {
        const performanceModel = this._timelineLoader.performanceModel
        if (!this._performanceModelUtils.findMainTrack()) {
            throw new Error('MainTrack is missing in traceLog')
        }
        return this._performanceModelUtils.findMainTrack().events.length
    }
}
