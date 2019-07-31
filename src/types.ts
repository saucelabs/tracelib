import ProfileNode from './profileTreeNode/profileNode'

export interface TracelogArgs {
    name?: string;
    // eslint-disable-next-line
    sort_index?: number;
    snapshot?: string;
}

export interface Profile {
    startTime: number;
    endTime: number;
    timestamps: number[];
    samples: number[];
    lines: number[];
    nodes: ProfileNode[];
    head: ProfileNode[];
}
