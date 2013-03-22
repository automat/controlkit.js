CKStepper = function(parent,object,value,label,params)
{
    CKComponent.apply(this,arguments);

    params = params || {};
    this._onChange  = params.onChange = params.onChange || this._onChange;
    this._onFinish  = params.onFinish = params.onFinish || this._onFinish;
    this._dp        = params.dp       = params.dp   || 2;
    this._stepValue = params.step     = params.step || 1;



    var d = CKDOM,
        c = d.CSS;

    d.set(this._divLabel,{className:c.CompLabel,innerHTML:label});
    d.set(this._divComp, {className:c.CompStepperSlot});

    this._divStepperBtns    = d.addDiv(  this._divComp,       {className:c.StepperBtns});
    this._stepperBtnUp      = d.addInput(this._divStepperBtns,{type:'button',className:c.StepperBtnUp, value:'+'});
    this._stepperBtnDown    = d.addInput(this._divStepperBtns,{type:'button',className:c.StepperBtnDown,value:'-'});


    this._divInput = d.addDiv(  this._divComp,       {className: c.StepperInput});

    this._numberInput = new CKNumberInput_Internal(this._divInput,this._stepValue,this._dp,function()
    {
        this._doFocus();
        this._updateValue();
        this._onChange();
        //this._parent._forceUpdate();

    }.bind(this),
        function()
        {
            this._doFocus();
            this._updateValue();
            this._onFinish();
            //this._parent._forceUpdate();
        }.bind(this));


    this._numberInput.setValue(this._object[this._key]);


    this._stepperBtnUp.onclick   = function()
    {
        this._doFocus();
        this._numberInput.stepUp();
        this._updateValue();
        //this._parent._forceUpdate();

    }.bind(this);

    this._stepperBtnDown.onclick = function()
    {
        this._doFocus();
        this._numberInput.stepDown();
        this._updateValue();
        //this._parent._forceUpdate();

    }.bind(this);

};

CKStepper.prototype = Object.create(CKComponent.prototype);

CKStepper.prototype._updateValue = function()
{
    this._object[this._key] = this._numberInput.getValue();
};

CKStepper.prototype._forceUpdate = function()
{
    //if(this._syncVal && this._focus)return;
    this._numberInput.setValue(this._object[this._key]);
};