import Event from "../core/event/Event";

export default class BaseEvent extends Event{
    constructor(type,data){
        super(type,data);
    }
}

BaseEvent.UPDATE_LAYOUT = 'updateLayout';
BaseEvent.UPDATE_DRAW   = 'updateDraw';