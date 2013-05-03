ControlKit.Checkbox = function(parent,object,value,label,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    /*---------------------------------------------------------------------------------*/

    this._onChange = params.onChange;
    this._onFinish = params.onFinish;

    var input = this._textArea = new ControlKit.Node(ControlKit.NodeType.INPUT_CHECKBOX);

    input.setProperty('checked',this._object[this._key]);
    input.setEventListener(ControlKit.NodeEventType.CHANGE,this._onInputChange.bind(this));

    this._wrapNode.addChild(this._textArea);
};

ControlKit.Checkbox.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.Checkbox.prototype._onInputChange = function()
{
    this._object[this._key] = !this._object[this._key];
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED));
    this._onChange();

};

ControlKit.Checkbox.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._textArea.setProperty('checked',this._object[this._key]);
};