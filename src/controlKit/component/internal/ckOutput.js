ControlKit.Output = function(parent,object,value,params)
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
        rootNode = this._node;

        textArea.setProperty('readOnly',true);
        wrapNode.addChild(textArea);

    /*---------------------------------------------------------------------------------*/


    //TODO: fix
    if(params.height)
    {
        if(params.height != 'auto')
        {
            var textAreaWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
                textAreaWrap.setStyleClass(ControlKit.CSS.TextAreaWrap);
            wrapNode.addChild(textAreaWrap);
            textAreaWrap.addChild(textArea);

            var height  = this._height = params.height,
                padding = 6;

            textArea.setHeight(Math.max(height  ,ControlKit.Constant.MIN_HEIGHT));
            wrapNode.setHeight(textArea.getHeight() +6 );
            rootNode.setHeight(wrapNode.getHeight() +4);

            this._scrollbar = new ControlKit.ScrollBar(textAreaWrap,textArea,height);
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
