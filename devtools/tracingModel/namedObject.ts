import TracingModel from './index'

export default class NamedObject {
    protected _model: TracingModel
    protected _id: number
    private _name: string
    private _sortIndex: number

    /**
     * @param {!TracingModel} model
     * @param {number} id
     */
    public constructor (model: TracingModel, id: number) {
        this._model = model
        this._id = id
        this._name = ''
        this._sortIndex = 0
    }

    public get model (): TracingModel {
        return this._model
    }

    /**
     * @param {!Array.<!TracingModel.NamedObject>} array
     */
    public static sort<T extends NamedObject> (array: T[]): T[] {
        /**
         * @param {!TracingModel.NamedObject} a
         * @param {!TracingModel.NamedObject} b
         */
        function comparator<T extends NamedObject> (a: T, b: T): number {
            return a._sortIndex !== b._sortIndex ? a._sortIndex - b._sortIndex : a.name().localeCompare(b.name())
        }
        return array.sort(comparator)
    }

    /**
     * @param {string} name
     */
    protected _setName (name: string): void {
        this._name = name
    }

    /**
     * @return {string}
     */
    public name (): string {
        return this._name
    }

    /**
     * @param {number} sortIndex
     */
    public setSortIndex (sortIndex: number): void {
        this._sortIndex = sortIndex
    }
}
