import TracingFrameLayerTree from './tracingFrameLayerTree'
import LayerPaintEvent from './layerPaintEvent'

export interface TimeByCategory {
    [key: string]: any
}

export default class TimelineFrame {
    public startTime: number
    public startTimeOffset: number
    public endTime: number
    public duration: number
    public timeByCategory: TimeByCategory
    public cpuTime: number
    public idle: boolean
    public layerTree: TracingFrameLayerTree
    public paints: LayerPaintEvent[]
    public mainFrameId: number | undefined

    /**
    * @param {number} startTime
    * @param {number} startTimeOffset
    */
    public constructor(startTime: number, startTimeOffset: number) {
        this.startTime = startTime
        this.startTimeOffset = startTimeOffset
        this.endTime = this.startTime
        this.duration = 0
        this.timeByCategory = {}
        this.cpuTime = 0
        this.idle = false
        /** @type {?TimelineModel.TracingFrameLayerTree} */
        this.layerTree = null
        /** @type {!Array.<!TimelineModel.LayerPaintEvent>} */
        this.paints = []
        /** @type {number|undefined} */
        this.mainFrameId = undefined
    }

    /**
    * @return {boolean}
    */
    public hasWarnings(): boolean {
        return false
    }

    /**
    * @param {number} endTime
    */
    public setEndTime(endTime: number): void {
        this.endTime = endTime
        this.duration = this.endTime - this.startTime
    }

    /**
    * @param {?TimelineModel.TracingFrameLayerTree} layerTree
    */
    public setLayerTree(layerTree: TracingFrameLayerTree): void {
        this.layerTree = layerTree
    }

    /**
    * @param {!Object} timeByCategory
    */
    public addTimeForCategories(timeByCategory: TimeByCategory): void {
        for (const category in timeByCategory) {
            this.addTimeForCategory(category, timeByCategory[category])
        }
    }

    /**
    * @param {string} category
    * @param {number} time
    */
    public addTimeForCategory(category: string, time: number): void {
        this.timeByCategory[category] = (this.timeByCategory[category] || 0) + time
        this.cpuTime += time
    }
};
