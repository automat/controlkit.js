function CKSlider(parent,object,value,target,label,params)
{
    CKObjectComponent.apply(this,arguments);

    this._values    = this._object[this._key];
    this._targetKey = target;

    params          = params          || {};
    params.step     = params.step     || 1;
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.dp       = params.dp       || 2;

    this._step     = params.step;
    this._onChange = params.onChange;
    this._onFinish = params.onFinish;
    this._dp       = params.dp;

    this._wrapNode.setStyleClass(CKCSS.WrapSlider);

    var slider = this._slider = new CKSlider_Internal(this._wrapNode,
                                                      this._onSliderChange.bind(this),
                                                      this._onSliderFinish.bind(this));

    slider.setBoundMin(this._values[0]);
    slider.setBoundMax(this._values[1]);
    slider.setInitialValue(this._object[this._targetKey]);

    var input  = this._textArea = new CKNumberInput_Internal(this._step,
                                                          this._dp,
                                                          this._onInputChange.bind(this),
                                                          this._onInputChange.bind(this));

    input.setValue(this._object[this._targetKey]);

    this._wrapNode.addChild(input.getNode());
}

CKSlider.prototype = Object.create(CKObjectComponent.prototype);

CKSlider.prototype._onSliderChange = function()
{
    this._applyValue();
    this._updateValueField();
    this._onChange();
    this._parent.forceUpdate();
};

CKSlider.prototype._onSliderFinish = function()
{
    this._applyValue();
    this._updateValueField();
    this._onFinish();
    this._parent.forceUpdate();
};

CKSlider.prototype._onInputChange = function()
{
    //TODO:FIX
};

CKSlider.prototype._applyValue = function()
{
    var value = this._slider.getValue();
    this._object[this._targetKey] = value;
    this._textArea.setValue(value);
};

CKSlider.prototype.forceUpdate = function()
{
    this._slider.setBoundMin(this._values[0]);
    this._slider.setBoundMax(this._values[1]);
    this._applyValue();
};

CKSlider.prototype._updateValueField = function()
{
    this._textArea.setValue(this._slider.getValue());
};
