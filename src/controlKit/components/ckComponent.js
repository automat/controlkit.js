function CKComponent(parent,object,value)
{
    this._parent   = parent;
    this._object   = object;
    this._key      = value;
    this._update   = parent._update;

    this._syncVal  = false;
    this._focus    = false;
    this._onChange = function(){};
    this._onFinish = function(){};

    var d = CKDOM;
    this._liComponent = d.addElement(this._parent._ulContent,'li');

    this._divLabel    = d.addDiv(this._liComponent);
    this._divComp     = d.addDiv(this._liComponent);
}

CKComponent.prototype._forceUpdate   = function(){};
CKComponent.prototype._refreshValues = function(){};

CKComponent.prototype._doFocus       = function()
{
    this._parent._defocus();
    this._focus = true;
};