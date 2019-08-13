import PerformanceModel from '../src/timelineModel/performanceModel'
import { StatsObject } from '../src/types';
import TimelineData from '../src/timelineModel/timelineData';
import Event from '../src/tracingModel/event';

export default class Warning {
    private _performanceModel: PerformanceModel

    constructor(performanceModel: PerformanceModel) {
        this._performanceModel = performanceModel
    }

    public getCounts(): StatsObject {
        if (!this._performanceModel.findMainTrack()) {
            throw new Error('MainTrack is missing in traceLog')
        }
        return this._performanceModel.findMainTrack().events.reduce((counter: StatsObject, event: Event): StatsObject => {
            const timelineData = TimelineData.forEvent(event)
            const warning = timelineData.warning
            if (warning) {
                counter[warning] = counter[warning] ? counter[warning] + 1 : 1
            }
            return counter
        }, {})
    }
}
