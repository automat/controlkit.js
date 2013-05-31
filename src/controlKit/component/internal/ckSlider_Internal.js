ControlKit.Slider_Internal = function(parentNode,onBegin,onChange,onFinish)
{
    this._bounds   = [0,1];
    this._value    = 0;
    this._interpl  = 0;
    this._focus    = false;

    /*---------------------------------------------------------------------------------*/

    this._onBegin    = onBegin  || function(){};
    this._onChange   = onChange || function(){};
    this._onFinish   = onFinish || function(){};

    /*---------------------------------------------------------------------------------*/

    var wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.SliderWrap);
    parentNode.addChild(wrapNode);

    var slot   = this._slot   = {node:    new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.SliderSlot),
                                 offsetX: 0,
                                 width:   0,
                                 padding: 3};

    var handle = this._handle = {node    : new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.SliderHandle),
                                 width   : 0,
                                 dragging: false};

    wrapNode.addChild(slot.node);
    slot.node.addChild(handle.node);

    slot.offsetX = slot.node.getPositionGlobalX();
    slot.width   = Math.floor(slot.node.getWidth() - slot.padding * 2) ;

    handle.node.setWidth(handle.width);

    slot.node.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onSlotMouseDown.bind(this));
    slot.node.setEventListener(ControlKit.NodeEventType.MOUSE_UP,  this._onSlotMouseUp.bind(this));

    document.addEventListener(ControlKit.DocumentEventType.MOUSE_MOVE,this._onDocumentMouseMove.bind(this));
    document.addEventListener(ControlKit.DocumentEventType.MOUSE_UP,  this._onDocumentMouseUp.bind(this));
};

ControlKit.Slider_Internal.prototype =
{
    _onDocumentMouseMove : function(e)
    {
        if(!this._handle.dragging)return;

        this._update();
        this._onChange();
    },

    _onDocumentMouseUp : function(e)
    {
        if(this._handle.dragging)this._onFinish();
        this._handle.dragging = false;
    },

    _onSlotMouseDown : function()
    {
        this._onBegin();
        this._focus = true;
        this._handle.dragging = true;
        this._handle.node.getElement().focus();
        this._update();
    },

    _onSlotMouseUp : function()
    {
        if(this._focus)
        {
            var handle = this._handle;
            if(handle.dragging)this._onFinish();
            handle.dragging = false;
        }

        this._focus = false;
    },

    _update : function()
    {
        var mx = ControlKit.Mouse.getInstance().getX(),
            sx = this._slot.offsetX,
            sw = this._slot.width,
            px = (mx < sx) ? 0 : (mx > (sx + sw)) ? sw : (mx - sx);

        this._handle.node.setWidth(Math.round(px));
        this._intrpl = px / sw;
        this._interpolateValue();
    },

    _updateHandle : function()
    {
        this._handle.node.setWidth(Math.round(this._intrpl*this._slot.width));
    },

    _interpolateValue : function()
    {
        var intrpl = this._intrpl;
        this._value = this._bounds[0]*(1.0-intrpl)+this._bounds[1]*intrpl;
    },

    resetOffset : function(){var slot = this._slot;
                                 slot.offsetX = slot.node.getPositionGlobalX();
                                 slot.width   = Math.floor(slot.node.getWidth() - slot.padding * 2)},

    setBoundMin : function(value)
    {
        var bounds = this._bounds;
        if(value >= bounds[1])return;

        bounds[0] = value;
        this._interpolateValueRelative();
        this._updateHandle();
    },

    setBoundMax : function(value)
    {
        var bounds = this._bounds;
        if(value <= bounds[0])return;

        bounds[1] = value;
        this._interpolateValueRelative();
        this._updateHandle();
    },

    _interpolateValueRelative : function()
    {
        var boundsMin  = this._bounds[0],
            boundsMax  = this._bounds[1],
            prevIntrpl = Math.abs((this._value - boundsMin) / (boundsMin - boundsMax));

        this._value  = boundsMin*(1.0-prevIntrpl) + boundsMax*prevIntrpl;
        this._intrpl = Math.abs((this._value - boundsMin) / (boundsMin - boundsMax));
    },

    setValue    : function(value)
    {
        var boundsMin = this._bounds[0],
            boundsMax = this._bounds[1];

        if(value < boundsMin || value > boundsMax)return;
        this._intrpl = Math.abs((value-boundsMin) / (boundsMin - boundsMax));
        this._updateHandle();
        this._value  = value;
    },


    getValue : function(){return this._value;}
};