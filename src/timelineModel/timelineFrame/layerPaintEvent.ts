import Event from '../../tracingModel/event'
import TimelineData from '../timelineData'
import { PicturePromise } from '../../types'

export default class LayerPaintEvent {
  private _event: Event

  /**
  * @param {!SDK.TracingModel.Event} event
  */
  constructor(event: Event) {
      this._event = event;
  }
  
  /**
  * @return {string}
  */
  public layerId(): string {
      return this._event.args['data']['layerId'];
  }
  
  /**
  * @return {!SDK.TracingModel.Event}
  */
  public event(): Event {
      return this._event;
  }
  
  /**
  * @return {!Promise<?{rect: !Array<number>, serializedPicture: string}>}
  */
  public picturePromise(): Promise<PicturePromise> {
      const picture = TimelineData.forEvent(this._event).picture;
      return picture.objectPromise().then(result => {
          if (!result)
          return null;
          const rect = result['params'] && result['params']['layer_rect'];
          const picture = result['skp64'];
          return rect && picture ? {rect: rect, serializedPicture: picture} : null;
      });
  }
  
  /**
  * @return !Promise<?{rect: !Array<number>, snapshot: !SDK.PaintProfilerSnapshot}>}
  */
  public snapshotPromise(): Promise<any> {
      return this.picturePromise().then(picture => {
          if (!picture) {
            return null;
          }
      });
  }
};
