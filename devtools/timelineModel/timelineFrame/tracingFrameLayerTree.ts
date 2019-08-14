import ObjectSnapshot from '../../tracingModel/objectSnapshot'
import LayerPaintEvent from './layerPaintEvent'

export default class TracingFrameLayerTree {
    private _snapshot: ObjectSnapshot
    private _paints: LayerPaintEvent[]

    /**
     * @param {!SDK.Target} target
     * @param {!SDK.TracingModel.ObjectSnapshot} snapshot
     */
    public constructor(target: any, snapshot: ObjectSnapshot) {
        this._snapshot = snapshot
        /** @type {!Array<!TimelineModel.LayerPaintEvent>|undefined} */
        this._paints
    }

    /**
     * @return {!Array<!TimelineModel.LayerPaintEvent>}
     */
    public paints(): LayerPaintEvent[] {
        return this._paints || []
    }

    /**
     * @param {!Array<!TimelineModel.LayerPaintEvent>} paints
     */
    public setPaints(paints: LayerPaintEvent[]): void {
        this._paints = paints
    }
};
