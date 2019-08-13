import PerformanceModel from '../src/timelineModel/performanceModel'
import { StatsObject } from '../src/types';
import TimelineData from '../src/timelineModel/timelineData';
import Event from '../src/tracingModel/event';
import Track, { TrackType } from '../src/timelineModel/track';

export default class PerformanceModelUtils {
    private _performanceModel: PerformanceModel

    constructor(performanceModel: PerformanceModel) {
        this._performanceModel = performanceModel
    }

    public findMainTrack(): Track {
        return this._performanceModel
            .timelineModel()
            .tracks()
            .find((track: Track): boolean => Boolean(
                track.type === TrackType.MainThread && track.forMainFrame && track.events.length
            ))
    }

    public getWarningCounts(): StatsObject {
        if (!this.findMainTrack()) {
            throw new Error('MainTrack is missing in traceLog')
        }
        return this.findMainTrack().events.reduce((counter: StatsObject, event: Event): StatsObject => {
            const timelineData = TimelineData.forEvent(event)
            const warning = timelineData.warning
            if (warning) {
                counter[warning] = counter[warning] ? counter[warning] + 1 : 1
            }
            return counter
        }, {})
    }
}
