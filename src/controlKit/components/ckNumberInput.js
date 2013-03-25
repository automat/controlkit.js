function CKNumberInput(parent,object,value,label,params)
{
    CKComponent.apply(this,arguments);

    params            = params || {};
    this._onChange    = params.onChange    || this._onChange;
    this._onFinish    = params.onFinish    || this._onFinish;
    this._dp          = params.dp          || 2;
    this._stepValue   = params.step        || 1;
    this._showStepper = params.showStepper || false;
    this._presetsKey  = params.presets;

    var d = CKDOM,
        c = d.CSS;

    var funcOnChange = function(){this._doFocus();this._updateValue();this._onChange();}.bind(this),
        funcOnFinish = function(){this._doFocus();this._updateValue();this._onFinish();}.bind(this);


    d.set(this._divComp, {className: c.CompAutoSlot});
    d.set(this._divLabel,{className: c.CompLabel, innerHTML:label});

    this._divInput = null;

    if (!this._presetsKey)
    {
        this._divInput    = d.addDiv(this._divComp, {className: c.TextWPresetInput});
        this._numberInput = new CKNumberInput_Internal(this._divInput, this._stepValue, this._dp, funcOnChange, funcOnFinish);
    }
    else {

        this._presets     = this._object[this._presetsKey];
        this._presetBtn   = new CKPresetBtn_Internal(this._divComp);
        this._divInput    = d.addDiv(this._divComp, {className: c.TextWPresetInput});
        this._numberInput = new CKNumberInput_Internal(this._divInput, this._stepValue, this._dp, funcOnChange, funcOnFinish);

        var presetBtn          = this._presetBtn,
            numberInput        = this._numberInput,
            numberInputElement = numberInput.getElement(),
            options            = ControlKit._Options,
            presets            = this._presets,
            obj                = this._object,
            key                = this._key;

        presetBtn.setOnMouseDown(function ()
        {
            presetBtn.setStateActive();

            options.build(presets,
                numberInput.getValue(),
                numberInput.getElement(),
                function ()
                {
                    obj[key] = presets[options.getSelected()];
                    numberInput.setValue(presets[options.getSelected()]);
                },
                function ()
                {
                    presetBtn.setStateInActive();
                });

        });
    }

    this._numberInput.setValue(this._object[this._key]);




}

CKNumberInput.prototype = Object.create(CKComponent.prototype);

CKNumberInput.prototype._updateValue = function()
{
    this._object[this._key] = this._numberInput.getValue();
};

CKNumberInput.prototype._forceUpdate = function()
{
    //if(this._syncVal && this._focus)return;
    this._numberInput.setValue(this._object[this._key]);
};