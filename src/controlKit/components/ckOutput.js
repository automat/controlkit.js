function CKOutput(parent,object,value,label,params)
{
    CKObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params        || {};
    params.height     = params.height || null;
    params.wrap       = params.wrap   || false;

    /*---------------------------------------------------------------------------------*/

    this._wrap = params.wrap;

    var textArea = this._textArea = new CKNode(CKNodeType.TEXTAREA);
        textArea.setProperty('readOnly',true);

    this._wrapNode.addChild(textArea);

    if( params.height)
    {
        textArea.setHeight(params.height);
        this._wrapNode.setHeight(textArea.getHeight()+6);
        this._node.setHeight(    textArea.getHeight()+10);
    }

    if(this._wrap)textArea.setStyleProperty('white-space','pre-wrap');

}

CKOutput.prototype = Object.create(CKObjectComponent.prototype);

CKOutput.prototype.forceUpdate = function()
{
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
            textArea.setProperty('value',value.join("\n"));
        }
        else
        {
            textArea.setProperty('value',value.join("\n"));
        }


    }
};


