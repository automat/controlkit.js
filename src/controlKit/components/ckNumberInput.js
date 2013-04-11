function CKNumberInput(parent,object,value,label,params)
{
    CKComponent_Internal.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.dp       = params.dp       || 2;
    params.step     = params.step     || 1;

    /*---------------------------------------------------------------------------------*/

    this._onChange    = params.onChange;
    this._onFinish    = params.onFinish;
    this._dp          = params.dp;
    this._stepValue   = params.step;

    this._lablNode.setProperty('innerHTML',label);

    if(this._stepValue)
    {

    }

    var input = this._input = new CKNumberInput_Internal(this._stepValue,
                                                         this._dp,
                                                         this._onInputChange.bind(this),
                                                         this._onInputFinish.bind(this));

    input.setValue(this._object[this._key]);

    this._wrapNode.addChild(input.getNode());
}

CKNumberInput.prototype = Object.create(CKComponent_Internal.prototype);

CKNumberInput.prototype._onInputChange = function(){this._updateValue();this._onChange();};
CKNumberInput.prototype._onInputFinish = function(){this._updateValue();this._onFinish();};

CKNumberInput.prototype._updateValue = function()
{
    this._object[this._key] = this._input.getValue();
};

CKNumberInput.prototype.forceUpdate = function()
{
    this._input.setValue(this._object[this._key]);
};
