import Event from "../core/event/Event";

export default class RendererEvent extends Event{
    constructor(type,data){
        super(type,data);
    }
}

RendererEvent.DRAW = 'draw';

RendererEvent.LISTENER_EVENT_MAP = {
    onDraw : RendererEvent.DRAW
};