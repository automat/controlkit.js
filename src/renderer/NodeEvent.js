import Event from "../core/event/Event";

export default class NodeEvent extends Event{
    constructor(type,data){
        super(type,data);
    }
}

NodeEvent.FOCUS = 'focus';
NodeEvent.BLUR = 'blur';
NodeEvent.INPUT = 'input';