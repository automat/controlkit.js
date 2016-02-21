var EventDispatcher = require('../core/event/EventDispatcher');

var STR_ERROR_NOT_IMPLEMENTED = 'Function not implemented.';

function AbstractNodeBase(){
    EventDispatcher.apply(this);

    this._style = null;
    this._children = [];
}

AbstractNodeBase.prototype = Object.create(EventDispatcher.prototype);

AbstractNodeBase.prototype.setStyle = function(style){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNodeBase.prototype.getStyle = function(style){
    return this._style;
};

AbstractNodeBase.prototype.appendChild = function(node){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNodeBase.prototype.removeChild = function(node){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNodeBase.prototype.appendChildren = function(nodes){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNodeBase.prototype.removeChildren = function(nodes){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNodeBase.prototype.getWidth = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNodeBase.prototype.getHeight = function(){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

AbstractNodeBase.prototype.createNode = function(type){
    throw new Error(STR_ERROR_NOT_IMPLEMENTED);
};

module.exports = AbstractNodeBase;