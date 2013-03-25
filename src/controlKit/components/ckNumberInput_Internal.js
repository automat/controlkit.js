function CKNumberInput_Internal(parentDiv,stepValue,decimalPlaces,onChange,onFinish)
{
    this._value        = this._temp  = 0;
    this._valueStep    = stepValue || 1.0;
    this._valueDPlace  = decimalPlaces + 1;

    this._onChange  = onChange || function(){};
    this._onFinish  = onFinish || function(){};

    var d = CKDOM;

    this._input = d.addInput(parentDiv,{type:'text'});
    this._input.value = this._value;

    var mult,keycode;

    this._input.onkeydown = function(e)
    {
        mult    = e.shiftKey ? 10 : 1;
        keycode = e.keyCode;

        if(keycode == 38 || keycode == 40 ||
           keycode == 39 || keycode == 37)
        {
            e.preventDefault();
            this._validateNumber();
            this._value = this._temp  = this._value + (this._valueStep * mult) * ((keycode == 38 || keycode == 39) ? 1.0 : -1.0);
            this._onChange();
            this._formatDisplayOutput();
        }

    }.bind(this);

    this._input.onkeyup = function(e)
    {
        keycode = e.keyCode;

        if(e.shiftKey    || keycode == 38  ||
            keycode == 40 || keycode == 190 ||
            keycode == 8  || keycode == 39  ||
            keycode == 37)return;

        this._validateInput();
        this._onChange();

    }.bind(this);

    this._input.onchange = function()
    {
        this._validateInput();
        this._formatDisplayOutput();

        this._onFinish();

    }.bind(this);

}

CKNumberInput_Internal.prototype._validateInput = function()
{
    if(this._inputIsNumber())
    {
        this._temp = this._value = Number(this._input.value);
        return;
    }

    this._temp = this._input.value = this._value;
};

CKNumberInput_Internal.prototype._validateNumber = function()
{
    if(this._inputIsNumber())return;

    this._temp = this._value;
};

CKNumberInput_Internal.prototype._inputIsNumber = function()
{
    if(this._input.value == '-')return true;
    return /^\s*-?[0-9]\d*(\.\d{1,1000000})?\s*$/.test(this._input.value);
};

CKNumberInput_Internal.prototype._formatDisplayOutput = function()
{
    this._temp   = this._value;
    this._out    = this._temp.toString();

    var output = this._out,
        index  = output.indexOf('.');

    if(index>0)this._out = output.slice(0,index+this._valueDPlace);

    this._input.value = (this._out);
};


CKNumberInput_Internal.prototype.getValue = function()
{
    return this._value;
};

CKNumberInput_Internal.prototype.setValue = function(n)
{
    this._value = this._temp = n;
    this._formatDisplayOutput();
};

CKNumberInput_Internal.prototype.stepUp = function()
{
    this._value = this._temp  = this._value + (this._valueStep);
    this._formatDisplayOutput();
};

CKNumberInput_Internal.prototype.stepDown = function()
{
    this._value = this._temp  = this._value - (this._valueStep);
    this._formatDisplayOutput();
};

CKNumberInput_Internal.prototype.getElement = function()
{
    return this._input;
};