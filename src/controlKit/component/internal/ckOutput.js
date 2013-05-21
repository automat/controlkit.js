ControlKit.Output = function(parent,object,value,label,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params        || {};
    params.height     = params.height || null;
    params.wrap       = params.wrap   || false;

    /*---------------------------------------------------------------------------------*/

    this._wrap = params.wrap;

    var textArea = this._textArea = new ControlKit.Node(ControlKit.NodeType.TEXTAREA),
        wrapNode = this._wrapNode,
        rootNode = this._rootNode;

    textArea.setProperty('readOnly',true);
    wrapNode.addChild(textArea);

    /*---------------------------------------------------------------------------------*/

    if(params.height)
    {
        if(params.height != 'auto')
        {
            textArea.setHeight(Math.max(params.height,ControlKit.Constant.MIN_HEIGHT));
            wrapNode.setHeight(textArea.getHeight() + ControlKit.Constant.PADDING_WRAPPER - 6);
            rootNode.setHeight(textArea.getHeight() + ControlKit.Constant.PADDING_WRAPPER - 3);
        }

        //TODO: Add auto height
    }

    if(params.wrap)textArea.setStyleProperty('white-space','pre-wrap');


    /*---------------------------------------------------------------------------------*/

    this._setValue();
};

ControlKit.Output.prototype = Object.create(ControlKit.ObjectComponent.prototype);

/*---------------------------------------------------------------------------------*/

//Override in subclass
ControlKit.Output.prototype._setValue     = function(){};
ControlKit.Output.prototype.onValueUpdate = function(){this._setValue();};
ControlKit.Output.prototype.update        = function(){this._setValue();};
