function CKMouse()
{
    this._pos = [0,0];
    document.addEventListener(CKDocumentEventType.MOUSE_MOVE,this._onDocumentMouseMove.bind(this));
}

CKMouse.prototype._onDocumentMouseMove = function(e)
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

CKMouse.prototype.getPosition = function(){return this._pos;};
CKMouse.prototype.getX        = function(){return this._pos[0];};
CKMouse.prototype.getY        = function(){return this._pos[1];};

CKMouse.init        = function(){if(!CKMouse._instance)CKMouse._instance = new CKMouse();};
CKMouse.getInstance = function(){return CKMouse._instance;};