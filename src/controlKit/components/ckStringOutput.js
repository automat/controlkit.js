function CKStringOutput(parent,object,value,label,params)
{
    CKObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params        || {};
    params.height     = params.height || null;
    params.wrap       = params.wrap   || false;

    /*---------------------------------------------------------------------------------*/

    this._wrap = params.wrap;

    this._textArea = new CKNode(CKNodeType.TEXTAREA);
    this._textArea.setProperty('readOnly',true);

    this._wrapNode.addChild(this._textArea);

    if( params.height)
    {
        this._textArea.setHeight(params.height);
        this._wrapNode.setHeight(this._textArea.getHeight() + CKCSS.WrapperPadding );
        this._node.setHeight(    this._textArea.getHeight() + CKCSS.WrapperPadding -2 );
    }

    if(this._wrap)this._textArea.setStyleProperty('white-space','pre-wrap');

    this._setValue();

}

CKStringOutput.prototype = Object.create(CKObjectComponent.prototype);

CKStringOutput.prototype._setValue = function()
{
    var textArea = this._textArea;

    if(!this._wrap)
    {
        textArea.setProperty('value',this._object[this._key]);
    }
    else
    {
        var value = this._object[this._key];

        if(typeof(value)         === 'object'   &&
            typeof(value.length) === 'number'   &&
            typeof(value.splice) === 'function' &&
            !(value.propertyIsEnumerable('length')))
        {
            textArea.setStyleProperty('white-space','nowrap');
        }

        textArea.setProperty('value',value.join("\n"));
    }
};

CKStringOutput.prototype.forceUpdate = function()
{
    this._setValue();
};

CKStringOutput.prototype.update = function()
{
    this._setValue();
};


