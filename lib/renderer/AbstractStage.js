var EventDispatcher = require('../core/event/EventDispatcher');

function AbstractStage(){
    EventDispatcher.apply(this);

    this._size = [0,0];
}

AbstractStage.prototype = Object.create(EventDispatcher.prototype);
AbstractStage.prototype.constructor = AbstractStage;

AbstractStage.prototype.getWidth = function(){
    return this._size[0];
};

AbstractStage.prototype.getHeight = function(){
    return this._size[1];
};

AbstractStage.prototype.getSize = function(){
    return this._size.slice(0);
};

module.exports = AbstractStage;

