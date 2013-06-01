ControlKit.StringOutput = function(parent,object,value,params)
{
    ControlKit.Output.apply(this,arguments);
};

ControlKit.StringOutput.prototype = Object.create(ControlKit.Output.prototype);

ControlKit.StringOutput.prototype._setValue = function()
{
    if(this._parent.isDisabled())return;

    var textArea = this._textArea;

    if(!this._wrap)
    {
        textArea.setProperty('value',this._object[this._key]);
    }
    else
    {
        var value = this._object[this._key];

        if(typeof(value)        === 'object'   &&
           typeof(value.length) === 'number'   &&
           typeof(value.splice) === 'function' &&
           !(value.propertyIsEnumerable('length')))
        {
            textArea.setStyleProperty('white-space','nowrap');
        }

        textArea.setProperty('value',value.join("\n"));
    }
};
