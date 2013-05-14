
ControlKit.NumberOutput = function(parent,object,value,label,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params        || {};
    params.height     = params.height || null;
    params.wrap       = params.wrap   || false;
    params.dp         = params.dp     || 2;

    /*---------------------------------------------------------------------------------*/

    this._wrap        = params.wrap;
    this._valueDPlace = params.dp + 1;

    this._textArea = new ControlKit.Node(ControlKit.NodeType.TEXTAREA);
    this._textArea.setProperty('readOnly',true);

    this._wrapNode.addChild(this._textArea);

    if( params.height)
    {
        params.height = params.height  < ControlKit.Constant.MIN_HEIGHT ?
                        ControlKit.Constant.MIN_HEIGHT : params.height;
        //TODO: FIXME!
        this._textArea.setHeight(params.height);
        this._wrapNode.setHeight(this._textArea.getHeight() + ControlKit.Constant.PADDING_WRAPPER -6);
        this._rootNode.setHeight(this._textArea.getHeight() + ControlKit.Constant.PADDING_WRAPPER -3);
    }

    if(this._wrap)this._textArea.setStyleProperty('white-space','pre-wrap');

    this._setValue();
};

ControlKit.NumberOutput.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.NumberOutput.prototype._setValue = function()
{
    if(this._parent.isHidden())return;

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

ControlKit.NumberOutput.prototype.onValueUpdate = function(e)
{
    this._setValue();
};

ControlKit.NumberOutput.prototype.update = function()
{
    this._setValue();
};


