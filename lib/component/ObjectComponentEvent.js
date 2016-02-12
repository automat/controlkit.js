var Event = require('../core/event/Event');

function ObjectComponentEvent(type) {
    Event.call(this, type);
}

ObjectComponentEvent.prototype = Object.create(Event.prototype);
ObjectComponentEvent.prototype.constructor = ObjectComponentEvent;

ObjectComponentEvent.VALUE_UPDATED = 'valueUpdated';
ObjectComponentEvent.UPDATE_VALUE  = 'updateValue';

module.exports = ObjectComponentEvent;