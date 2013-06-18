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

        textArea.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onInputDragStart.bind(this));
        this.addEventListener(ControlKit.EventType.INPUT_SELECT_DRAG,ControlKit.getKitInstance(),'onInputSelectDrag');
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

            textArea.setHeight(Math.max(height  ,ControlKit.Metric.COMPONENT_MIN_HEIGHT));
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

/*---------------------------------------------------------------------------------*/

//Prevent chrome select drag
ControlKit.Output.prototype._onInputDragStart = function()
{
    var eventMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventUp   = ControlKit.DocumentEventType.MOUSE_UP;

    var event = ControlKit.EventType.INPUT_SELECT_DRAG;

    var self  = this;

    var onDrag = function()
        {
            self.dispatchEvent(new ControlKit.Event(this,event,null));
        },

        onDragFinish = function()
        {
            self.dispatchEvent(new ControlKit.Event(this,event,null));

            document.removeEventListener(eventMove, onDrag,       false);
            document.removeEventListener(eventMove, onDragFinish, false);
        };

    this.dispatchEvent(new ControlKit.Event(this,event,null));

    document.addEventListener(eventMove, onDrag,       false);
    document.addEventListener(eventUp,   onDragFinish, false);
};
