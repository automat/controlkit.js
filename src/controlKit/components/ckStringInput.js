function CKStringInput(parent,object,value,label,params)
{
    CKObjectComponent.apply(this,arguments);

    params = params || {};
    this._onChange   = params.onChange || this._onChange;
    this._onFinish   = params.onFinish || this._onFinish;

    var input = this._textArea = new CKNode(CKNodeType.INPUT_TEXT);

    input.setProperty('value',this._object[this._key]);

    input.setEventListener(CKNodeEvent.KEY_UP, this._onInputKeyUp.bind(this));
    input.setEventListener(CKNodeEvent.CHANGE, this._onInputChange.bind(this));


    this._wrapNode.addChild(input);
}

CKStringInput.prototype = Object.create(CKObjectComponent.prototype);

CKStringInput.prototype._onInputKeyUp  = function(){this._applyValue();this._onChange();};
CKStringInput.prototype._onInputChange = function(){this._applyValue();this._onFinish();};


CKStringInput.prototype._applyValue = function()
{
    this._object[this._key] = this._textArea.getProperty('value');
    this._parent.forceUpdate();
};

CKStringInput.prototype.forceUpdate = function()
{
    this._textArea.setProperty('value',this._object[this._key]);
};

