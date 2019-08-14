import { Range, StatsObject, CountersData } from '../devtools/types'
import TimelineLoader from '../devtools/loader'
import { calcFPS } from '../devtools/utils'
import Track, { TrackType } from '../devtools/timelineModel/track'
import TimelineUIUtils from '../devtools/timelineModel/timelineUIUtils'
import PerformanceModel from '../devtools/timelineModel/performanceModel'
import TimelineData from '../devtools/timelineModel/timelineData'
import Event from '../devtools/tracingModel/event'
import CountersGraph from '../devtools/timelineModel/counterGraph'

export default class Tracelib {
    public tracelog: object
    private _timelineLoader: TimelineLoader
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

    public getMainTrackEvents(): Event[] {
        const mainTrack = this._findMainTrack()
        if (!mainTrack) {
            throw new Error('MainTrack is missing in traceLog')
        }
        return mainTrack.events
    }

    public getFPS(): number[] {
        return this._timelineLoader.performanceModel.frames()
            .map(({ duration }): number => calcFPS(duration))
    }

    public getSummary(from?: number, to?: number): StatsObject {
        const timelineUtils = new TimelineUIUtils()
        const startTime = from || this._performanceModel.startTime
        const endTime = to || this._performanceModel.endTime
        const mainTrack = this._findMainTrack()
        if (!mainTrack) {
            throw new Error('MainTrack is missing in traceLog')
        }

        // We are facing data mutaion issue in devtools, to avoid it cloning syncEvents
        const syncEvents = mainTrack.syncEvents().slice()

        return {
            ...timelineUtils.statsForTimeRange(
                syncEvents, startTime, endTime
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
        const counters = counterGraph.setModel(this._performanceModel, this._findMainTrack())
        return Object.keys(counters).reduce((acc, counter): CountersData => ({
            ...acc,
            [counter]: {
                times: counters[counter].times,
                values: counters[counter].values,
            }
        }), {})
    }
}
