var EventDispatcher      = require('../core/event/EventDispatcher');
var ObjectComponentEvent = require('./ObjectComponentEvent');


function ObjectComponentNotifier(){
    EventDispatcher.apply(this);
}
ObjectComponentNotifier.prototype = Object.create(EventDispatcher.prototype);
ObjectComponentNotifier.prototype.constructor = ObjectComponentNotifier;

ObjectComponentNotifier.prototype.onValueUpdated = function (e) {
    this.dispatchEvent(new ObjectComponentEvent(ObjectComponentEvent.UPDATE_VALUE,{origin: e.getSender()}));
};

//ObjectComponentNotifier.prototype.onOptionTriggered = function(e) {
//    //this.dispatchEvent(new Event(this, OptionEvent.TRIGGER, {origin: e.sender}));
//};

var instance = null;

ObjectComponentNotifier.get = function(){
    if(!instance){
        instance = new ObjectComponentNotifier();
    }
    return instance;
};

ObjectComponentNotifier.destroy = function(){
    instance = null;
};

module.exports = ObjectComponentNotifier;