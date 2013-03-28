function CKNumberInput_Internal(stepValue,decimalPlaces,onChange,onFinish)
{
    this._value        = this._temp  = 0;
    this._valueStep    = stepValue || 1.0;
    this._valueDPlace  = decimalPlaces + 1;

    this._onChange  = onChange || function(){};
    this._onFinish  = onFinish || function(){};

    var input = this._input = new CKNode(CKNodeType.INPUT_TEXT);

    input.setProperty('value',this._value);

    input.setEventListener(CKNodeEvent.KEY_DOWN,this._onInputKeyDown.bind(this));
    input.setEventListener(CKNodeEvent.KEY_UP,  this._onInputKeyUp.bind(this));
    input.setEventListener(CKNodeEvent.CHANGE,  this._onInputChange.bind(this));
}

CKNumberInput_Internal.prototype._onInputKeyDown = function(e)
{
    var mult    = e.shiftKey ? 10 : 1,
        keyCode = e.keyCode;

    if( keyCode == 38 || keyCode == 40 ||
        keyCode == 39 || keyCode == 37)
    {
        e.preventDefault();
        this._validateNumber();
        this._value = this._temp  = this._value + (this._valueStep * mult) * ((keyCode == 38 || keyCode == 39) ? 1.0 : -1.0);
        this._onChange();
        this._formatDisplayOutput();
    }
};

CKNumberInput_Internal.prototype._onInputKeyUp = function(e)
{
    var keyCode = e.keyCode;

    if(e.shiftKey     || keyCode == 38  ||
        keyCode == 40 || keyCode == 190 ||
        keyCode == 8  || keyCode == 39  ||
        keyCode == 37)return;

    this._validateInput();
    this._onChange();
};

CKNumberInput_Internal.prototype._onInputChange = function(e)
{
    this._validateInput();
    this._formatDisplayOutput();
    this._onFinish();
};

CKNumberInput_Internal.prototype._validateInput = function()
{
    if(this._inputIsNumber())
    {
        this._temp = this._value = Number(this._input.getProperty('value'));
        return;
    }

    this._temp = this._value;
    this._input.setProperty('value',this._value);
};

CKNumberInput_Internal.prototype._validateNumber = function()
{
    if(this._inputIsNumber())return;
    this._temp = this._value;
};

CKNumberInput_Internal.prototype._inputIsNumber = function()
{
    var value = this._input.getProperty('value');

    //TODO:FIX
    if(value == '-')return true;
    return /^\s*-?[0-9]\d*(\.\d{1,1000000})?\s*$/.test(value);
};

CKNumberInput_Internal.prototype._formatDisplayOutput = function()
{
    this._temp   = this._value;
    this._out    = this._temp.toString();

    var output = this._out,
        index  = output.indexOf('.');

    if(index>0)this._out = output.slice(0,index+this._valueDPlace);

    this._input.setProperty('value',this._out);
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

CKNumberInput_Internal.prototype.getNode = function()
{
    return this._input;
};