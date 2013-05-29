
ControlKit.NumberOutput = function(parent,object,value,label,params)
{
    ControlKit.Output.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params        || {};
    params.dp         = params.dp     || 2;

    /*---------------------------------------------------------------------------------*/

    this._valueDPlace = params.dp + 1;
};

ControlKit.NumberOutput.prototype = Object.create(ControlKit.Output.prototype);

ControlKit.NumberOutput.prototype._setValue = function()
{
    if(this._parent.isDisabled())return;

    var value    = this._object[this._key],
        textArea = this._textArea,
        dp       = this._valueDPlace;

    var index,
        out;

    if(typeof(value)        === 'object'   &&
       typeof(value.length) === 'number'   &&
       typeof(value.splice) === 'function' &&
       !(value.propertyIsEnumerable('length')))
    {
        out = value.slice();

        var i = -1;
        var temp;

        var wrap = this._wrap;

        while(++i<out.length)
        {
            temp   = out[i] = out[i].toString();
            index  = temp.indexOf('.');
            if(index>0)out[i] = temp.slice(0,index + dp);
        }

        if(wrap)
        {
            textArea.setStyleProperty('white-space','nowrap');
            out = out.join('\n');
        }

        textArea.setProperty('value',out);
    }
    else
    {
        out   = value.toString();
        index = out.indexOf('.');
        textArea.setProperty('value',index > 0 ? out.slice(0,index + dp) : out);
    }

};
