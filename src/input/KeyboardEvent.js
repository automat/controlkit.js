import Event from "../core/event/Event";

export default class KeyboardEvent extends Event{
    constructor(type,data){
        super(type,data);
    }
}

KeyboardEvent.KEY_DOWN = 'keydown';
KeyboardEvent.KEY_PRESS = 'keypress';
KeyboardEvent.KEY_UP = 'keyup';

KeyboardEvent.KEY_SPACE = 32;
KeyboardEvent.KEY_ENTER = 13;
KeyboardEvent.KEY_BACKSPACE = 8;
KeyboardEvent.KEY_DELETE = 46;

KeyboardEvent.LISTENER_EVENT_MAP = {
    onKeyDown : KeyboardEvent.KEY_DOWN,
    onKeyPress : KeyboardEvent.KEY_PRESS,
    onKeyUp : KeyboardEvent.KEY_UP
};