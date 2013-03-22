function CKRange(parent,object,value,label,params)
{
    CKComponent.apply(this,arguments);

    this._values    = this._object[this._key];

    params          = params          || {};

    this._step      = params.step     = params.step     || 1;
    this._onChange  = params.onChange = params.onChange || this._onChange;
    this._onFinish  = params.onFinish = params.onFinish || this._onFinish;
    this._dp        = params.dp       = params.dp   || 2;


    var d = CKDOM,
        c = d.CSS;

    d.set(this._divLabel,{className:c.CompLabel,innerHTML:label});
    d.set(this._divComp, {className:c.CompRangeFieldSlot});

    this._divLabelMin  = d.addDiv(  this._divComp,{className:c.CompLabel,innerHTML:'min'});
    this._numberFieldMin = new CKNumberInput_Internal(this._divComp,this._step,this._dp,function()
    {
        this._doFocus();
        this._updateValueMin();
        this._onChange();
        this._parent._forceUpdate();

    }.bind(this),
        function()
        {
            this._doFocus();
            this._updateValueMin();
            this._onFinish();
            this._parent._forceUpdate();

        }.bind(this));
    this._divLabelMax  = d.addDiv(  this._divComp,{className:c.CompLabel,innerHTML:'max'});
    this._numberFieldMax = new CKNumberInput_Internal(this._divComp,this._step,this._dp,function()
    {
        this._doFocus();
        this._updateValueMax();
        this._onChange();
        this._parent._forceUpdate();

    }.bind(this),
        function()
        {
            this._doFocus();
            this._updateValueMax();
            this._onFinish();
            this._parent._forceUpdate();

        }.bind(this));
    this._numberFieldMin.setValue(this._values[0]);
    this._numberFieldMax.setValue(this._values[1]);


}


CKRange.prototype = Object.create(CKComponent.prototype);


CKRange.prototype._updateValueMin = function()
{
    var value = this._numberFieldMin.getValue();
    if(value >= this._numberFieldMax.getValue())
    {
        this._numberFieldMin.setValue(this._values[0]);
        return;
    }
    this._values[0] = value;
};

CKRange.prototype._updateValueMax = function()
{
    var value = this._numberFieldMax.getValue();
    if(value <= this._numberFieldMin.getValue())
    {
        this._numberFieldMax.setValue(this._values[1]);
        return;
    }
    this._values[1] = value;
};

CKRange.prototype._forceUpdate = function()
{
    //if(this._syncVal && this._focus)return;
    this._numberFieldMin.setValue(this._values[0]);
    this._numberFieldMax.setValue(this._values[1]);
};