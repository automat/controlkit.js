var Event = require('../core/event/Event');

function StageEvent(type) {
    Event.call(this, type);
}

StageEvent.prototype = Object.create(Event.prototype);
StageEvent.prototype.constructor = StageEvent;

StageEvent.RESIZE = 'resize';

module.exports = StageEvent;