ControlKit.CKCheckbox = function(parent,object,value,label,params)
{
    ControlKit.CKObjectComponent.apply(this,arguments);

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    this._onChange = params.onChange;
    this._onFinish = params.onFinish;

    var input = this._textArea = new ControlKit.CKNode(ControlKit.CKNodeType.INPUT_CHECKBOX);

    input.setProperty('checked',this._object[this._key]);
    input.setEventListener(ControlKit.CKNodeEventType.CHANGE,this._onInputChange.bind(this));

    this._wrapNode.addChild(this._textArea);
}

ControlKit.CKCheckbox.prototype = Object.create(ControlKit.CKObjectComponent.prototype);

ControlKit.CKCheckbox.prototype._onInputChange = function()
{
    this._object[this._key] = !this._object[this._key];
    this.dispatchEvent(new ControlKit.CKEvent(this,ControlKit.CKEventType.VALUE_UPDATED));
    this._onChange();

};

ControlKit.CKCheckbox.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._textArea.setProperty('checked',this._object[this._key]);
};