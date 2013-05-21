ControlKit.Range = function(parent,object,value,label,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    this._values    = this._object[this._key];

    /*---------------------------------------------------------------------------------*/

    params          = params          || {};
    params.step     = params.step     || 1;
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.dp       = params.dp   || 2;

    /*---------------------------------------------------------------------------------*/

    this._step      = params.step;
    this._onChange  = params.onChange;
    this._onFinish  = params.onFinish;
    this._dp        = params.dp;

    var lablMinNode = new ControlKit.Node(ControlKit.NodeType.DIV);
    var inputMin    = this._inputMin = new ControlKit.NumberInput_Internal(this._step,
                                                                  this._dp,
                                                                  this._onInputMinChange.bind(this),
                                                                  this._onInputMinFinish.bind(this));

    var lablMaxNode = new ControlKit.Node(ControlKit.NodeType.DIV);
    var inputMax    = this._inputMax = new ControlKit.NumberInput_Internal(this._step,
                                                                  this._dp,
                                                                  this._onInputMaxChange.bind(this),
                                                                  this._onInputMaxFinish.bind(this));

    var wrapLablMin  = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Wrap),
        wrapInputMin = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Wrap),
        wrapLablMax  = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Wrap),
        wrapInputMax = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Wrap);


    lablMinNode.setStyleClass(ControlKit.CSS.Label);
    lablMinNode.setProperty('innerHTML','MIN');
    lablMaxNode.setStyleClass(ControlKit.CSS.Label);
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
};

ControlKit.Range.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.Range.prototype.__onChange = function()
{
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
    this._onChange();
};

ControlKit.Range.prototype.__onFinish = function()
{
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
    this._onFinish();
};

ControlKit.Range.prototype._onInputMinChange = function()
{
    this.pushHistoryState();this._updateValueMin();this.__onChange();
};

ControlKit.Range.prototype._onInputMinFinish = function()
{
    this._updateValueMin();this.__onFinish();
};

ControlKit.Range.prototype._onInputMaxChange = function()
{
    this.pushHistoryState();this._updateValueMax();this.__onChange();
};

ControlKit.Range.prototype._onInputMaxFinish = function()
{
    this._updateValueMax();this.__onFinish();
};

ControlKit.Range.prototype._updateValueMin = function()
{
    var value = this._inputMin.getValue();
    if(value >= this._inputMax.getValue())
    {
        this._inputMin.setValue(this._values[0]);
        return;
    }
    this._values[0] = value;
};

ControlKit.Range.prototype._updateValueMax = function()
{
    var value = this._inputMax.getValue();
    if(value <= this._inputMin.getValue())
    {
        this._inputMax.setValue(this._values[1]);
        return;
    }
    this._values[1] = value;
};

ControlKit.Range.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;

    this._inputMin.setValue(this._values[0]);
    this._inputMax.setValue(this._values[1]);
};

