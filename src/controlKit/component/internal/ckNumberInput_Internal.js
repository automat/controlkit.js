ControlKit.NumberInput_Internal = function(stepValue,decimalPlaces,onChange,onFinish)
{
    ControlKit.EventDispatcher.apply(this,null);

    /*---------------------------------------------------------------------------------*/

    this._value        = this._temp  = 0;
    this._valueStep    = stepValue || 1.0;
    this._valueDPlace  = decimalPlaces + 1;

    /*---------------------------------------------------------------------------------*/

    this._onChange  = onChange || function(){};
    this._onFinish  = onFinish || function(){};

    /*---------------------------------------------------------------------------------*/

    var input = this._input = new ControlKit.Node(ControlKit.NodeType.INPUT_TEXT);

    input.setProperty('value',this._value);

    /*---------------------------------------------------------------------------------*/

    input.setEventListener(ControlKit.NodeEventType.KEY_DOWN, this._onInputKeyDown.bind(this));
    input.setEventListener(ControlKit.NodeEventType.KEY_UP,   this._onInputKeyUp.bind(this));
    input.setEventListener(ControlKit.NodeEventType.CHANGE,   this._onInputChange.bind(this));

    /*---------------------------------------------------------------------------------*/

    //prevent chrome drag scroll TODO:Move to Input
    input.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN, this._onInputDragStart.bind(this));
};

ControlKit.NumberInput_Internal.prototype = Object.create(ControlKit.EventDispatcher.prototype);


ControlKit.NumberInput_Internal.prototype._onInputDragStart = function()
{
    var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

    var eventDragStart = ControlKit.EventType.INPUT_SELECTDRAG_START,
        eventDrag      = ControlKit.EventType.INPUT_SELECTDRAG,
        eventDragEnd   = ControlKit.EventType.INPUT_SELECTDRAG_END;

    var self = this;

    var onDrag = function()
    {
        self.dispatchEvent(new ControlKit.Event(self,eventDrag,null));
    };

    var onDragEnd = function()
    {
        document.removeEventListener(eventMouseMove, onDrag,    false);
        document.removeEventListener(eventMouseUp,   onDragEnd, false);

        self.dispatchEvent(new ControlKit.Event(self,eventDragEnd,null));
    };


    document.addEventListener(eventMouseMove,onDrag,   false);
    document.addEventListener(eventMouseUp,  onDragEnd,false);

    this.dispatchEvent(new ControlKit.Event(this,eventDragStart,null));
};

ControlKit.NumberInput_Internal.prototype._onInputKeyDown = function(e)
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

ControlKit.NumberInput_Internal.prototype._onInputKeyUp = function(e)
{
    var keyCode = e.keyCode;

    if(e.shiftKey     || keyCode == 38  ||
        keyCode == 40 || keyCode == 190 ||
        keyCode == 8  || keyCode == 39  ||
        keyCode == 37)return;

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
    if(this._inputIsNumber())
    {
        this._temp = this._value = Number(this._input.getProperty('value'));
        return;
    }

    this._temp = this._value;
    this._input.setProperty('value',this._value);
};

ControlKit.NumberInput_Internal.prototype._validateNumber = function()
{
    if(this._inputIsNumber())return;
    this._temp = this._value;
};

ControlKit.NumberInput_Internal.prototype._inputIsNumber = function()
{
    var value = this._input.getProperty('value');

    //TODO:FIX
    if(value == '-')return true;
    return /^\s*-?[0-9]\d*(\.\d{1,1000000})?\s*$/.test(value);
};

ControlKit.NumberInput_Internal.prototype._formatDisplayOutput = function()
{
    this._temp   = this._value;
    this._out    = this._temp.toString();

    var output = this._out,
        index  = output.indexOf('.');

    if(index>0)this._out = output.slice(0,index+this._valueDPlace);

    this._input.setProperty('value',this._out);
};

ControlKit.NumberInput_Internal.prototype.getValue = function()
{
    return this._value;
};

ControlKit.NumberInput_Internal.prototype.setValue = function(n)
{
    this._value = this._temp = n;
    this._formatDisplayOutput();
};

ControlKit.NumberInput_Internal.prototype.stepUp = function()
{
    this._value = this._temp  = this._value + (this._valueStep);
    this._formatDisplayOutput();
};

ControlKit.NumberInput_Internal.prototype.stepDown = function()
{
    this._value = this._temp  = this._value - (this._valueStep);
    this._formatDisplayOutput();
};

ControlKit.NumberInput_Internal.prototype.getNode = function()
{
    return this._input;
};