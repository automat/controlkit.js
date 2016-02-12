var EventDispatcher = require('../core/event/EventDispatcher');

function AbstractGroup(parent, options){
    EventDispatcher.apply(this,arguments);

    options        = options || {};
    options.height = options.height || null;
    options.enable = options.enable === undefined ? true : options.enable;

    this._parent  = parent;
    this._height  = options.height;
    this._enabled = options.enable;

    this._childList = null;
}

AbstractGroup.prototype = Object.create(EventDispatcher.prototype);
AbstractGroup.prototype.constructor = AbstractGroup;

//override
AbstractGroup.prototype._updateAppearence = function(){};

AbstractGroup.prototype.hasMaxHeight = function(){
    return this._height !== null;
};

AbstractGroup.prototype.getMaxHeight = function(){
    return this._height;
};

AbstractGroup.prototype.setEnable = function(enable){
    this._enabled = enable;
    this._updateAppearence();
};

AbstractGroup.prototype.getChildList = function(){
    return this._childList;
};

module.exports = AbstractGroup;





