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

    textArea.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN, this._onInputDragStart.bind(this));

    this.addEventListener( ControlKit.EventType.INPUT_SELECTDRAG_START,this._parent,'onSelectDragStart');
    this.addEventListener( ControlKit.EventType.INPUT_SELECTDRAG,      this._parent,'onSelectDrag');
    this.addEventListener( ControlKit.EventType.INPUT_SELECTDRAG_END,  this._parent,'onSelectDragEnd');

    /*---------------------------------------------------------------------------------*/

    this._setValue();
};

ControlKit.Output.prototype = Object.create(ControlKit.ObjectComponent.prototype);

/*---------------------------------------------------------------------------------*/

//Override in subclass
ControlKit.Output.prototype._setValue     = function(){};
ControlKit.Output.prototype.onValueUpdate = function(){this._setValue();};
ControlKit.Output.prototype.update        = function(){this._setValue();};

ControlKit.Output.prototype._onInputDragStart = function()
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