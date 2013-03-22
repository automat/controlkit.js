function CKSlider(parent,object,value,label,target,params)
{
    CKComponent.apply(this,arguments);

    this._values    = this._object[this._key];
    this._targetKey = target;

    params          = params          || {};

    this._step      = params.step     || 1;
    this._onChange  = params.onChange || this._onChange;
    this._onFinish  = params.onFinish || this._onFinish;
    this._dp        = params.dp       || 2;

    var d = CKDOM,
        c = d.CSS;

    d.set(this._divLabel,{className:c.CompLabel,innerHTML:label});
    d.set(this._divComp, {className:c.CompSliderSlot});

    this._slider = new CKSlider_Internal(this,false,
                                         this._onSliderChange.bind(this),
                                         this._onSliderFinish.bind(this));

    this._slider.setBoundMin(this._values[0]);
    this._slider.setBoundMax(this._values[1]);
    this._slider.setInitialValue(this._object[this._targetKey]);

    this._textField = new CKNumberInput_Internal(this._divComp,this._step,this._dp,
        this._onFieldChange.bind(this),
        this._onFieldChange.bind(this));

    this._textField.setValue(this._object[this._targetKey]);
}

CKSlider.prototype = Object.create(CKComponent.prototype);


CKSlider.prototype._onSliderChange = function()
{
    this._doFocus();
    this._applyValue();
    this._updateValueField();
    this._onChange();
    this._parent._forceUpdate();
};

CKSlider.prototype._onSliderFinish = function()
{
    this._doFocus();
    this._applyValue();
    this._updateValueField();
    this._onFinish();
    this._parent._forceUpdate();
};

CKSlider.prototype._onFieldChange = function()
{
};

CKSlider.prototype._updateValueField = function()
{
    this._textField.setValue(this._slider.getValue());
};

CKSlider.prototype._applyValue = function()
{
    var value = this._slider.getValue();
    this._object[this._targetKey] = value;
    this._textField.setValue(value);
};


CKSlider.prototype._forceUpdate = function()
{
    //if(this._focus)return;
    this._slider.setBoundMin(this._values[0]);
    this._slider.setBoundMax(this._values[1]);
    this._applyValue();

};