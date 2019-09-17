import TimelineUIUtils from './../devtools/timelineModel/timelineUIUtils'
import { StatsArray } from './../devtools/types'
import TimelineModel from './../devtools/timelineModel'
import Event from './../devtools/tracingModel/event'
import TracingModel from './../devtools/tracingModel'

export default class CustomUtils extends TimelineUIUtils {
    public constructor() {
        super()
    }

    /**
    * @param {!Array<!SDK.TracingModel.Event>} events
    * @param {number} startTime
    * @param {number} endTime
    * @return {!Object<string, number>}
    */
    public detailStatsForTimeRange(events: Event[], startTime: number, endTime: number): StatsArray {
        const eventStyle = this.eventStyle.bind(this)
        const visibleEventsFilterFunc = this.visibleEventsFilter.bind(this)

        if (!events.length) {
            return {
                idle: {
                    'time': [endTime - startTime],
                    'value': [endTime - startTime]
                }
            }
        }

        // aggeregatedStats is a map by categories. For each category there's an array
        // containing sorted time points which records accumulated value of the category.
        const aggregatedStats: StatsArray = {}
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
            return (event: Event): any => visibleEventsFilter.accept(event) || TracingModel.isTopLevelEvent(event)
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
            if (statsArrays.time.length && statsArrays.time[statsArrays.time.length - 1] === time) {
                return
            }
            // const lastValue = statsArrays.value.length ? statsArrays.value[statsArrays.value.length - 1] : 0
            statsArrays.value.push(time - lastTime)
            statsArrays.time.push(time)
        }

        /**
        * @param {?string} from
        * @param {?string} to
        * @param {number} time
        */
        function categoryChange(from?: string, to?: string, time?: number): void {
            if (from) {
                updateCategory(from, time)
            }

            lastTime = time

            if (to) {
                updateCategory(to, time)
            }
        }

        /**
        * @param {!SDK.TracingModel.Event} e
        */
        function onStartEvent(e: Event): void {
            const category = eventStyle(e).category.name
            const parentCategory = categoryStack.length ? categoryStack[categoryStack.length - 1] : null
            if (category !== parentCategory) {
                categoryChange(parentCategory, category, e.startTime)
            }
            categoryStack.push(category)
        }

        /**
        * @param {!SDK.TracingModel.Event} e
        */
        function onEndEvent(e: Event): void {
            const category = categoryStack.pop()
            const parentCategory = categoryStack.length ? categoryStack[categoryStack.length - 1] : null
            if (category !== parentCategory) {
                categoryChange(category, parentCategory, e.endTime)
            }
        }
        return aggregatedStats
    }
}
