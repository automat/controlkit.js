function CKRange(parent,object,value,label,params)
{
    CKComponent_Internal.apply(this,arguments);

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

    this._lablNode.setProperty('innerHTML',label);

    var lablMinNode = new CKNode(CKNode.Type.DIV);
    var inputMin    = this._inputMin = new CKNumberInput_Internal(this._step,
                                                                  this._dp,
                                                                  this._onInputMinChange.bind(this),
                                                                  this._onInputMinFinish.bind(this));

    var lablMaxNode = new CKNode(CKNode.Type.DIV);
    var inputMax    = this._inputMax = new CKNumberInput_Internal(this._step,
                                                                  this._dp,
                                                                  this._onInputMaxChange.bind(this),
                                                                  this._onInputMaxFinish.bind(this));

    var wrapLablMin  = new CKNode(CKNode.Type.DIV).setStyleClass(CKCSS.Wrap),
        wrapInputMin = new CKNode(CKNode.Type.DIV).setStyleClass(CKCSS.Wrap),
        wrapLablMax  = new CKNode(CKNode.Type.DIV).setStyleClass(CKCSS.Wrap),
        wrapInputMax = new CKNode(CKNode.Type.DIV).setStyleClass(CKCSS.Wrap);


    lablMinNode.setStyleClass(CKCSS.Label);
    lablMinNode.setProperty('innerHTML','MIN');
    lablMaxNode.setStyleClass(CKCSS.Label);
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

CKRange.prototype = Object.create(CKComponent_Internal.prototype);

CKRange.prototype._onInputMinChange = function()
{
    this._updateValueMin();this._onChange();this._parent.forceUpdate();
};

CKRange.prototype._onInputMinFinish = function()
{
    this._updateValueMin();this._onFinish();this._parent.forceUpdate();
};

CKRange.prototype._onInputMaxChange = function()
{
    this._updateValueMax();this._onChange();this._parent.forceUpdate();
};

CKRange.prototype._onInputMaxFinish = function()
{
    this._updateValueMax();this._onFinish();this._parent.forceUpdate();
};

CKRange.prototype._updateValueMin = function()
{
    var value = this._inputMin.getValue();
    if(value >= this._inputMax.getValue())
    {
        this._inputMin.setValue(this._values[0]);
        return;
    }
    this._values[0] = value;
};

CKRange.prototype._updateValueMax = function()
{
    var value = this._inputMax.getValue();
    if(value <= this._inputMin.getValue())
    {
        this._inputMax.setValue(this._values[1]);
        return;
    }
    this._values[1] = value;
};

CKRange.prototype.forceUpdate = function()
{
    this._inputMin.setValue(this._values[0]);
    this._inputMax.setValue(this._values[1]);
};