import Event from "../core/event/Event";

export default class MouseEvent extends Event{
    constructor(type,data){
        super(type,data);
    }
}

MouseEvent.MOUSE_DOWN = 'mousedown';
MouseEvent.MOUSE_UP = 'mouseup';
MouseEvent.MOUSE_MOVE = 'mousemove';
MouseEvent.MOUSE_DRAG = 'mousedrag';
MouseEvent.MOUSE_SCROLL = 'mousescroll';
MouseEvent.MOUSE_OVER = 'mouseover';
MouseEvent.MOUSE_LEAVE = 'mouseleave';