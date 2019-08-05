import { TimeByCategory } from '../../types'
import LayerPaintEvent from './layerPaintEvent'

export default class PendingFrame {
    public timeByCategory: TimeByCategory;
    public paints: LayerPaintEvent []
    public mainFrameId: number | undefined
    public triggerTime: number

    /**
    * @param {number} triggerTime
    * @param {!Object.<string, number>} timeByCategory
    */
    public constructor(triggerTime: number, timeByCategory: TimeByCategory) {
        /** @type {!Object.<string, number>} */
        this.timeByCategory = timeByCategory
        /** @type {!Array.<!TimelineModel.LayerPaintEvent>} */
        this.paints = []
        /** @type {number|undefined} */
        this.mainFrameId = undefined
        this.triggerTime = triggerTime
    }
};
