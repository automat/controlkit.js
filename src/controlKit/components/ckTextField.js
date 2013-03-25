function CKTextField(parent,object,value,label,params)
{
    CKComponent.apply(this,arguments);

    params = params || {};
    this._onChange   = params.onChange || this._onChange;
    this._onFinish   = params.onFinish || this._onFinish;
    this._presetsKey = params.presets;

    var d = CKDOM,
        c = d.CSS;

    d.set(this._divLabel,{className:c.CompLabel,innerHTML:label});


    this._stringInput = null;

    if(this._presetsKey)
    {
        d.set(this._divComp, {className:c.CompAutoSlot});
        this._presets = this._object[this._presetsKey];
        this._presetBtn   = new CKPresetBtn_Internal(this._divComp);
        this._divInput    = d.addDiv(  this._divComp,{className: c.TextWPresetInput});
        this._stringInput =  d.addInput(this._divInput,{type:'text',value:this._object[this._key]});

        var presetBtn   = this._presetBtn;
        var stringInput = this._stringInput;
        var options     = ControlKit._Options;
        var presets     = this._presets;
        var obj         = this._object;
        var key         = this._key;



        presetBtn.setOnMouseDown(function()
                                 {
                                     d.set(presetBtn,{className: c.PresetBtnActive});

                                     options.build(presets,
                                                   stringInput.value,
                                                   stringInput,
                                                   function()
                                                   {
                                                       obj[key]=stringInput.value=presets[options.getSelected()];
                                                   },
                                                   function()
                                                   {
                                                       d.set(presetBtn,{className: c.PresetBtn});
                                                   });
                                 });
    }
    else
    {
        d.set(this._divComp, {className:c.CompSlot});
        this._stringInput =  d.addInput(this._divComp,{type:'text',value:this._object[this._key]});
    }

    this._stringInput.onkeyup = function()
    {
        this._applyValue();
        this._onChange();
        this._parent._forceUpdate();


    }.bind(this);


    this._stringInput.onchange = function()
    {
        this._applyValue();
        this._onFinish();
        this._parent._forceUpdate();

    }.bind(this);






}

CKTextField.prototype = Object.create(CKComponent.prototype);

CKTextField.prototype._applyValue = function()
{
    this._object[this._key] = this._stringInput.value;
};

CKTextField.prototype._forceUpdate = function()
{
    if(this._syncVal && this._focus)return;
    this._stringInput.value = this._object[this._key];
};