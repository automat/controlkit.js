import Event from "../core/event/Event";

export default class DisplayTreeEvent extends Event{
    constructor(type,data){
        super(type,data);
    }
}

DisplayTreeEvent.UPDATE_LAYOUT = 'updateLayout';
DisplayTreeEvent.UPDATE_DRAW   = 'updateDraw';