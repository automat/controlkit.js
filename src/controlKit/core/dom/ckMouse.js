ControlKit.CKMouse = function()
{
    this._pos = [0,0];
    document.addEventListener(ControlKit.CKDocumentEventType.MOUSE_MOVE,this._onDocumentMouseMove.bind(this));
}

ControlKit.CKMouse.prototype._onDocumentMouseMove = function(e)
{
    var dx = 0,
        dy = 0;

    if(!e)e = window.event;
    if(e.pageX)
    {
        dx = e.pageX;
        dy = e.pageY;
    }
    else if(e.clientX)
    {
        dx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        dy = e.clientY + document.body.scrollTop  + document.documentElement.scrollTop;
    }
    this._pos[0] = dx;
    this._pos[1] = dy;
};

ControlKit.CKMouse.prototype.getPosition = function(){return this._pos;};
ControlKit.CKMouse.prototype.getX        = function(){return this._pos[0];};
ControlKit.CKMouse.prototype.getY        = function(){return this._pos[1];};

ControlKit.CKMouse.init        = function(){if(!ControlKit.CKMouse._instance)ControlKit.CKMouse._instance = new ControlKit.CKMouse();};
ControlKit.CKMouse.getInstance = function(){return ControlKit.CKMouse._instance;};