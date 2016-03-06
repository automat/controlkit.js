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

MouseEvent.LISTENER_EVENT_MAP = {
    onMouseDown : MouseEvent.MOUSE_DOWN,
    onMouseUp : MouseEvent.MOUSE_UP,
    onMouseMove : MouseEvent.MOUSE_MOVE,
    onMouseDrag : MouseEvent.MOUSE_DRAG,
    onMouseScroll : MouseEvent.MOUSE_SCROLL,
    onMouseOver : MouseEvent.MOUSE_OVER,
    onMouseLeave : MouseEvent.MOUSE_LEAVE
};