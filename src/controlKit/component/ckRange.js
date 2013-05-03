ControlKit.CKRange = function(parent,object,value,label,params)
{
    ControlKit.CKObjectComponent.apply(this,arguments);

    this._values    = this._object[this._key];

    params          = params          || {};
    params.step     = params.step     || 1;
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.dp       = params.dp   || 2;

    this._step      = params.step;
    this._onChange  = params.onChange;
    this._onFinish  = params.onFinish;
    this._dp        = params.dp;

    var lablMinNode = new ControlKit.CKNode(ControlKit.CKNodeType.DIV);
    var inputMin    = this._inputMin = new ControlKit.CKNumberInput_Internal(this._step,
                                                                  this._dp,
                                                                  this._onInputMinChange.bind(this),
                                                                  this._onInputMinFinish.bind(this));

    var lablMaxNode = new ControlKit.CKNode(ControlKit.CKNodeType.DIV);
    var inputMax    = this._inputMax = new ControlKit.CKNumberInput_Internal(this._step,
                                                                  this._dp,
                                                                  this._onInputMaxChange.bind(this),
                                                                  this._onInputMaxFinish.bind(this));

    var wrapLablMin  = new ControlKit.CKNode(ControlKit.CKNodeType.DIV).setStyleClass(ControlKit.CKCSS.Wrap),
        wrapInputMin = new ControlKit.CKNode(ControlKit.CKNodeType.DIV).setStyleClass(ControlKit.CKCSS.Wrap),
        wrapLablMax  = new ControlKit.CKNode(ControlKit.CKNodeType.DIV).setStyleClass(ControlKit.CKCSS.Wrap),
        wrapInputMax = new ControlKit.CKNode(ControlKit.CKNodeType.DIV).setStyleClass(ControlKit.CKCSS.Wrap);


    lablMinNode.setStyleClass(ControlKit.CKCSS.Label);
    lablMinNode.setProperty('innerHTML','MIN');
    lablMaxNode.setStyleClass(ControlKit.CKCSS.Label);
    lablMaxNode.setProperty('innerHTML','MAX');
    inputMin.setValue(this._values[0]);
    inputMax.setValue(this._values[1]);

    var wrapNode = this._wrapNode;

    wrapLablMin.addChild(lablMinNode);
    wrapInputMin.addChild(inputMin.getNode());
    wrapLablMax.addChild(lablMaxNode);
    wrapInputMax.addChild(inputMax.getNode());

    wrapNode.addChild(wrapLablMin);
    wrapNode.addChild(wrapInputMin);
    wrapNode.addChild(wrapLablMax);
    wrapNode.addChild(wrapInputMax);
}

ControlKit.CKRange.prototype = Object.create(ControlKit.CKObjectComponent.prototype);

ControlKit.CKRange.prototype.__onChange = function()
{
    this.dispatchEvent(new ControlKit.CKEvent(this,ControlKit.CKEventType.VALUE_UPDATED));
    this._onChange();
};

ControlKit.CKRange.prototype.__onFinish = function()
{
    this.dispatchEvent(new ControlKit.CKEvent(this,ControlKit.CKEventType.VALUE_UPDATED));
    this._onFinish();
};


ControlKit.CKRange.prototype._onInputMinChange = function()
{
    this._updateValueMin();this.__onChange();
};

ControlKit.CKRange.prototype._onInputMinFinish = function()
{
    this._updateValueMin();this.__onFinish();
};

ControlKit.CKRange.prototype._onInputMaxChange = function()
{
    this._updateValueMax();this.__onChange();
};

ControlKit.CKRange.prototype._onInputMaxFinish = function()
{
    this._updateValueMax();this.__onFinish();
};

ControlKit.CKRange.prototype._updateValueMin = function()
{
    var value = this._inputMin.getValue();
    if(value >= this._inputMax.getValue())
    {
        this._inputMin.setValue(this._values[0]);
        return;
    }
    this._values[0] = value;
};

ControlKit.CKRange.prototype._updateValueMax = function()
{
    var value = this._inputMax.getValue();
    if(value <= this._inputMin.getValue())
    {
        this._inputMax.setValue(this._values[1]);
        return;
    }
    this._values[1] = value;
};

ControlKit.CKRange.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;

    this._inputMin.setValue(this._values[0]);
    this._inputMax.setValue(this._values[1]);
};

