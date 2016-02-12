var EventDispatcher = require('../core/event/EventDispatcher');

function AbstractComponent(parent,labelStr){
    EventDispatcher.apply(this);

    this._parent   = parent;
    this._labelStr = labelStr;
    this._enabled  = true;
}

AbstractComponent.prototype = Object.create(EventDispatcher.prototype);
AbstractComponent.prototype.constructor = AbstractComponent;

AbstractComponent.prototype.setEnable = function(enable){
    this._enabled = enable;
};

AbstractComponent.prototype.isEnabled = function () {
    return this._enabled;
};

module.exports = AbstractComponent;