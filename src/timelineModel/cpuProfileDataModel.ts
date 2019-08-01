export class CPUProfileNode {
  public depth: any
  public parent: any
}

export default class CPUProfileDataModel {
  public idleNode: any
  public programNode: any
  public gcNode: any
  public samples: any
  public timestamps: any

  constructor(profile: any, target: any) {
    
  }

  public nodeByIndex(i: number): CPUProfileNode {
    return new CPUProfileNode()
  }
}
