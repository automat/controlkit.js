var Event = require('../core/event/Event');

function MouseEvent(type, data) {
    Event.call(this, type, data);
}

MouseEvent.prototype = Object.create(Event.prototype);
MouseEvent.prototype.constructor = MouseEvent;

MouseEvent.MOUSE_DOWN   = 'mousedown';
MouseEvent.MOUSE_UP     = 'mouseup';
MouseEvent.MOUSE_MOVE   = 'mousemove';
MouseEvent.MOUSE_DRAG   = 'mousedrag';
MouseEvent.MOUSE_SCROLL = 'mousescroll';

module.exports = MouseEvent;
