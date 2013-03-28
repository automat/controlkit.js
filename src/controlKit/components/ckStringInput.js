function CKStringInput(parent,object,value,label,params)
{
    CKComponent_Internal.apply(this,arguments);

    params = params || {};
    this._onChange   = params.onChange || this._onChange;
    this._onFinish   = params.onFinish || this._onFinish;

    this._lablNode.setProperty('innerHTML',label);

    var input = this._input = new CKNode(CKNode.Type.INPUT_TEXT);

    input.setProperty('value',this._object[this._key]);

    input.setEventListener(CKNode.Event.KEY_UP, this._onInputKeyUp.bind(this));
    input.setEventListener(CKNode.Event.CHANGE, this._onInputChange.bind(this));


    this._wrapNode.addChild(input);
}

CKStringInput.prototype = Object.create(CKComponent_Internal.prototype);

CKStringInput.prototype._onInputKeyUp  = function(){this._applyValue();this._onChange();};
CKStringInput.prototype._onInputChange = function(){this._applyValue();this._onFinish();};


CKStringInput.prototype._applyValue = function()
{
    this._object[this._key] = this._input.getProperty('value');
    this._parent.forceUpdate();
};

CKStringInput.prototype.forceUpdate = function()
{
    this._input.setProperty('value',this._object[this._key]);
};

