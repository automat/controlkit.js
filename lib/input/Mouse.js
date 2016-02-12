var EventDispatcher = require('../core/event/EventDispatcher');
var MouseEvent      = require('./MouseEvent');

function Mouse() {
    EventDispatcher.call(this);

    this._x = 0;
    this._y = 0;
    this._prevX = 0;
    this._prevY = 0;
    this._deltaX = 0;
    this._deltaY = 0;
    this._isDown = false;
}

Mouse.prototype = Object.create(EventDispatcher.prototype);
Mouse.prototype.constructor = Mouse;

Mouse.prototype.getPosX = function() {
    return this._x;
};

Mouse.prototype.getPosY = function() {
    return this._y;
};

Mouse.prototype.getPos = function(out){
    if(out === undefined){
        return [this._x,this._y];
    }
    out[0] = this._x;
    out[1] = this._y;
    return out;
};

Mouse.prototype.getPrevPosX = function() {
    return this._prevX;
};

Mouse.prototype.getPrevPosY = function() {
    return this._prevY;
};

Mouse.prototype.getPrevPos = function(out){
    if(out === undefined){
        return [this._prevX,this._prevY];
    }
    out[0] = this._prevX;
    out[1] = this._prevY;
    return out;
};

Mouse.prototype.getDeltaX = function() {
    return this._deltaX;
};

Mouse.prototype.getDeltaY = function() {
    return this._deltaY;
};

Mouse.prototype.getDelta = function(out){
    if(out === undefined){
        return [this._deltaX,this._deltaY];
    }
    out[0] = this._deltaX;
    out[1] = this._deltaY;
    return out;
};

Mouse.prototype.handleMouseDown = function(e) {
    this._isDown = true;
    this.dispatchEvent(new MouseEvent(MouseEvent.MOUSE_DOWN, e));
};

Mouse.prototype.handleMouseUp = function(e) {
    this._isDown = false;
    this.dispatchEvent(new MouseEvent(MouseEvent.MOUSE_UP, e));
};

Mouse.prototype.handleMouseMove = function(e) {
    this._prevX = this._x;
    this._prevY = this._y;
    this._x = e.x;
    this._y = e.y;
    this._deltaX = this._x - this._prevX;
    this._deltaY = this._y - this._prevY;

    e.mouse = this;

    //don't fire mouse move events while dragging
    if (this._isDown) {
        this.dispatchEvent(new MouseEvent(MouseEvent.MOUSE_DRAG, e));
    }
    else {
        this.dispatchEvent(new MouseEvent(MouseEvent.MOUSE_MOVE, e));
    }
};

Mouse.prototype.handleMouseScroll = function(e) {
    e.mouse = this;
    this.dispatchEvent(new MouseEvent(MouseEvent.MOUSE_SCROLL, e));
};


var instance = null;

Mouse.init = function(){
    instance = new Mouse();
    return instance;
};

Mouse.get = function(){
    return instance || Mouse.init();
};

Mouse.destroy = function(){
    instance = null;
};

module.exports = Mouse;
