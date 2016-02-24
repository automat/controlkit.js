var Event = require('../core/event/Event');

function ComponentEvent(type) {
    Event.call(this, type);
}

ComponentEvent.prototype = Object.create(Event.prototype);
ComponentEvent.prototype.constructor = ComponentEvent;

ComponentEvent.ENABLE  = 'enable';
ComponentEvent.DISABLE = 'disable';

module.exports = ComponentEvent;