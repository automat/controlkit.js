
function CKCheckbox(parent,object,value,label,params)
{
    CKObjectComponent.apply(this,arguments);

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    this._onChange = params.onChange;
    this._onFinish = params.onFinish;

    var input = this._input = new CKNode(CKNodeType.INPUT_CHECKBOX);

    input.setProperty('checked',this._object[this._key]);
    input.setEventListener(CKNodeEvent.CHANGE,this._onInputChange.bind(this));

    this._wrapNode.addChild(this._input);
}

CKCheckbox.prototype = Object.create(CKObjectComponent.prototype);

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