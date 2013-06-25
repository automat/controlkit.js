ControlKit.StringOutput = function(parent,object,value,params)
{
    ControlKit.Output.apply(this,arguments);
};

ControlKit.StringOutput.prototype = Object.create(ControlKit.Output.prototype);

ControlKit.StringOutput.prototype._setValue = function()
{
    if(this._parent.isDisabled())return;

    var textAreaString = this._object[this._key];

    if(textAreaString == this._prevString)return;

    var textArea             = this._textArea,
        textAreaElement      = textArea.getElement(),
        textAreaScrollHeight;

        textArea.setProperty('value',textAreaString);

        textAreaScrollHeight = textAreaElement.scrollHeight;
        textArea.setHeight(textAreaScrollHeight);

    var scrollBar = this._scrollBar;

    if(scrollBar)
    {
        if(textAreaScrollHeight <= this._wrapNode.getHeight())
        {
            scrollBar.disable();
        }
        else
        {
            scrollBar.enable();
            scrollBar.update();
            scrollBar.reset();
        }
    }

    this._prevString = textAreaString;
};
