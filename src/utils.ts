export function upperBound<T extends number, S extends number>(self: any[], object: T, comparator: (object: any, arg1: any) => number, left?: number, right?: number): any {
    function defaultComparator<T extends number, S extends number>(a: T, b: S): number {
        return a < b ? -1 : (a > b ? 1 : 0)
    }
    comparator = comparator || defaultComparator
    let l = left || 0
    let r = right !== undefined ? right : self.length
    while (l < r) {
        const m = (l + r) >> 1
        if (comparator(object, self[m]) >= 0)
            l = m + 1
        else
            r = m
    }
    return r
}

export function stableSort<L extends number, R extends number>(that: any[], comparator: (r: any, l: any) => number): any {
    function defaultComparator<L extends number, R extends number>(a: number, b: number): number {
        return a < b ? -1 : (a > b ? 1 : 0)
    }
    comparator = comparator || defaultComparator

    const indices = new Array(that.length)
    for (let i = 0; i < that.length; ++i) {
        indices[i] = i
    }

    const self = that

    /**
     * @param {number} a
     * @param {number} b
     * @return {number}
     */
    function indexComparator<L extends number, R extends number>(a: number, b: number): number {
        const result = comparator(self[a], self[b])
        return result ? result : a - b
    }

    indices.sort(indexComparator)

    for (let i = 0; i < that.length; ++i) {
        if (indices[i] < 0 || i === indices[i]) {
            continue
        }

        let cyclical = i
        const saved = that[i]
        while (true) {
            const next = indices[cyclical]
            indices[cyclical] = -1
            if (next === i) {
                that[cyclical] = saved
                break
            } else {
                that[cyclical] = that[next]
                cyclical = next
            }
        }
    }

    return that
}
