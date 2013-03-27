
function CKCheckbox(parent,object,value,label,params)
{
    CKComponent_Internal.apply(this,arguments);

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    this._onChange = params.onChange;
    this._onFinish = params.onFinish;

    this._lablNode.setProperty('innerHTML',label);

    var input = this._input = new CKNode(CKNode.Type.INPUT_CHECKBOX);

    input.setProperty('checked',this._object[this._key]);
    input.setListener(CKNode.Event.CHANGE,this._onInputChange.bind(this));

    this._wrapNode.addChild(this._input);
}

CKCheckbox.prototype = Object.create(CKComponent_Internal.prototype);

CKCheckbox.prototype._onInputChange = function()
{
    this._object[this._key] = !this._object[this._key];
    this._onChange();
    this._parent.forceUpdate();
};

CKCheckbox.prototype.forceUpdate = function()
{
    this._input.setProperty('checked',this._object[this._key]);
};