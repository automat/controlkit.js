ControlKit.NumberInput_Internal = function(stepValue,decimalPlaces,onChange,onFinish,onValidNumber)
{
    ControlKit.EventDispatcher.apply(this,null);

    /*---------------------------------------------------------------------------------*/

    this._value        = 0;
    this._valueStep    = stepValue || 1.0;
    this._valueDPlace  = decimalPlaces + 1;

    /*---------------------------------------------------------------------------------*/

    this._onChange     = onChange     || function(){};
    this._onFinish     = onFinish     || function(){};

    //FIXME
    this._onValidNumber = onValidNumber || function(){};

    /*---------------------------------------------------------------------------------*/

    var input = this._input = new ControlKit.Node(ControlKit.NodeType.INPUT_TEXT);

    input.setProperty('value',this._value);

    /*---------------------------------------------------------------------------------*/

    input.setEventListener(ControlKit.NodeEventType.KEY_DOWN, this._onInputKeyDown.bind(this));
    input.setEventListener(ControlKit.NodeEventType.KEY_UP,   this._onInputKeyUp.bind(this));
    input.setEventListener(ControlKit.NodeEventType.CHANGE,   this._onInputChange.bind(this));
};

ControlKit.NumberInput_Internal.prototype = Object.create(ControlKit.EventDispatcher.prototype);

ControlKit.NumberInput_Internal.prototype._onInputKeyDown = function(e)
{
    var step       = (e.shiftKey ? ControlKit.Constant.NUMBER_INPUT_SHIFT_MULTIPLIER : 1) * this._valueStep,
        keyCode    =  e.keyCode;

    if( keyCode == 38 ||
        keyCode == 40 )
    {
        e.preventDefault();

        var multiplier = keyCode == 38 ? 1.0 : -1.0;
        this._value   += (step * multiplier);

        this._onChange();
        this._formatDisplayOutput();
    }
};

ControlKit.NumberInput_Internal.prototype._onInputKeyUp = function(e)
{
    var keyCode = e.keyCode;

    if( e.shiftKey    || keyCode == 38  ||
        keyCode == 40 || keyCode == 190 ||
        keyCode == 8  || keyCode == 39  ||
        keyCode == 37)   return;

    this._validateInput();
    this._onChange();
};

ControlKit.NumberInput_Internal.prototype._onInputChange = function(e)
{
    this._validateInput();
    this._formatDisplayOutput();
    this._onFinish();
};

ControlKit.NumberInput_Internal.prototype._validateInput = function()
{
    if(this.inputIsNumber())
    {
        this._onValidNumber();
        this._value = Number(this._input.getProperty('value'));
        return;
    }

    this._input.setProperty('value',this._value);
};



ControlKit.NumberInput_Internal.prototype.inputIsNumber = function()
{
    var value = this._input.getProperty('value');

    //TODO:FIX
    if(value == '-')return true;
    return /^\s*-?[0-9]\d*(\.\d{1,1000000})?\s*$/.test(value);
};

ControlKit.NumberInput_Internal.prototype._formatDisplayOutput = function()
{
    var valueString = this._value.toString();

    var index  = valueString.indexOf('.');

    if(index>0)valueString = valueString.slice(0,index+this._valueDPlace);

    this._input.setProperty('value',valueString);
};

ControlKit.NumberInput_Internal.prototype.getValue = function()
{
    return this._value;
};

ControlKit.NumberInput_Internal.prototype.setValue = function(n)
{
    this._value = n;
    this._formatDisplayOutput();
};

ControlKit.NumberInput_Internal.prototype.getNode = function()
{
    return this._input;
};