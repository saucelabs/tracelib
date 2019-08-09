import { Range, StatsObject, CountersObject, CountersData } from './types'
import TimelineLoader from './loader'
import { calcFPS } from './utils'
import Track, { TrackType } from './timelineModel/track'
import TimelineUIUtils from './timelineModel/timelineUIUtils'
import PerformanceModel from './timelineModel/performanceModel'
import TimelineData from './timelineModel/timelineData'
import Event from './tracingModel/event'
import TimelineDetailsView from './timelineModel/timelineDetailsView'
import CountersGraph from './timelineModel/counter/countersGraph'
import PerformanceModel from './timelineModel/performanceModel'

export default class Tracelib {
    public tracelog: object
    private _timelineLoader: TimelineLoader
    private _timelineDetailsView: TimelineDetailsView
    private _performanceModel: PerformanceModel

    public constructor (tracelog: object, range?: Range) {
        this.tracelog = tracelog
        this._timelineLoader = new TimelineLoader(this.tracelog)
        this._timelineLoader.init()
        this._performanceModel = this._timelineLoader.performanceModel
    }

    private _findMainTrack(): Track {
        return this._performanceModel
            .timelineModel()
            .tracks()
            .find((track: Track): boolean => Boolean(
                track.type === TrackType.MainThread && track.forMainFrame && track.events.length
            ))
    }

    public getFPS(): number[] {
        return this._timelineLoader.performanceModel.frames()
            .map(({ duration }): number => calcFPS(duration))
    }

    public getSummary(from?: number, to?: number): StatsObject {
        const timelineUtils = new TimelineUIUtils()
        const startTime = from || this._performanceModel.startTime
        const endTime = to || this._performanceModel.endTime
        return {
            ...timelineUtils.statsForTimeRange(
                this._findMainTrack().syncEvents(), startTime, endTime
            ),
            startTime,
            endTime,
        }
    }

    public getWarningCounts(): StatsObject {
        const mainTrack = this._findMainTrack()
        if (!mainTrack) {
            throw new Error('MainTrack is missing in traceLog')
        }
        return mainTrack.events.reduce((counter: StatsObject, event: Event): StatsObject => {
            const timelineData = TimelineData.forEvent(event)
            const warning = timelineData.warning
            if (warning) {
                counter[warning] = counter[warning] ? counter[warning] + 1 : 1
            }
            return counter
        }, {})
    }

    public getMemoryCounters(): CountersData {
        const counterGraph = new CountersGraph()
        const counters = counterGraph.setModel(this._performanceModel, this._performanceModel.findMainTrack())
        return Object.keys(counters).reduce((acc, counter): CountersData => ({
            ...acc,
            [counter]: {
                times: counters[counter].times,
                values: counters[counter].values,
            }
        }), {})
    }
}
