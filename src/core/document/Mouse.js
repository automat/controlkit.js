var DocumentEventType = require('./DocumentEventType');

function Mouse() {
    this._pos = [0, 0];
    document.addEventListener(DocumentEventType.MOUSE_MOVE, this._onDocumentMouseMove.bind(this));
}

Mouse._instance = null;

Mouse.prototype._onDocumentMouseMove = function (e) {
    var dx = 0,
        dy = 0;

    if (!e)e = window.event;
    if (e.pageX) {
        dx = e.pageX;
        dy = e.pageY;
    }
    else if (e.clientX) {
        dx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        dy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    this._pos[0] = dx;
    this._pos[1] = dy;
};

Mouse.prototype.getPosition = function () {
    return this._pos;
};

Mouse.prototype.getX = function () {
    return this._pos[0];
};

Mouse.prototype.getY = function () {
    return this._pos[1];
};

Mouse.setup = function () {
    if(Mouse._instance){
        return;
    }
    Mouse._instance = new Mouse();
};

Mouse.getInstance = function () {
    return Mouse._instance;
};

module.exports = Mouse;

//ControlKit.Mouse = function()
//{
//    this._pos = [0,0];
//    document.addEventListener(ControlKit.DocumentEventType.MOUSE_MOVE,this._onDocumentMouseMove.bind(this));
//};
//
//ControlKit.Mouse.prototype._onDocumentMouseMove = function(e)
//{
//    var dx = 0,
//        dy = 0;
//
//    if(!e)e = window.event;
//    if(e.pageX)
//    {
//        dx = e.pageX;
//        dy = e.pageY;
//    }
//    else if(e.clientX)
//    {
//        dx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
//        dy = e.clientY + document.body.scrollTop  + document.documentElement.scrollTop;
//    }
//    this._pos[0] = dx;
//    this._pos[1] = dy;
//};
//
//ControlKit.Mouse.prototype.getPosition = function(){return this._pos;};
//ControlKit.Mouse.prototype.getX        = function(){return this._pos[0];};
//ControlKit.Mouse.prototype.getY        = function(){return this._pos[1];};
//
//ControlKit.Mouse.setup        = function(){if(!ControlKit.Mouse._instance)ControlKit.Mouse._instance = new ControlKit.Mouse();};
//ControlKit.Mouse.getInstance = function(){return ControlKit.Mouse._instance;};