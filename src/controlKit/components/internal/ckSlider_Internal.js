function CKSlider_Internal(parentNode,onChange,onFinish)
{
    this._bounds   = [0,1];
    this._value    = 0;
    this._interpl  = 0;
    this._focus    = false;

    this._onChange   = onChange || function(){};
    this._onFinish   = onFinish || function(){};

    var wrapNode = new CKNode(CKNodeType.DIV).setStyleClass(CKCSS.SliderWrap);
    parentNode.addChild(wrapNode);

    var slot   = this._slot   = {node:    new CKNode(CKNodeType.DIV).setStyleClass(CKCSS.SliderSlot),
                                 offsetX: 0,
                                 width:   0,
                                 padding: 3};

    var handle = this._handle = {node    : new CKNode(CKNodeType.DIV).setStyleClass(CKCSS.SliderHandle),
                                 width   : 10,
                                 dragging: false};

    wrapNode.addChild(slot.node);
    slot.node.addChild(handle.node);

    slot.offsetX = slot.node.getPositionGlobalX();
    slot.width   = slot.offsetX - slot.padding * 2;

    handle.node.setWidth(handle.width);

    slot.node.setEventListener(CKNodeEvent.MOUSE_DOWN,this._onSlotMouseDown.bind(this));
    slot.node.setEventListener(CKNodeEvent.MOUSE_UP,  this._onSlotMouseUp.bind(this));

    var doconmousemove = document.onmousemove || function(){},
        doconmouseup   = document.onmouseup   || function(){};

    document.onmousemove = function(e)
    {
        doconmousemove(e);
        if(handle.dragging)
        {
            this._update();
            this._onChange();
        }
    }.bind(this);

    document.onmouseup   = function(e)
    {
        doconmouseup(e);
        if(handle.dragging)this._onFinish();
        handle.dragging = false;

    }.bind(this);
}

CKSlider_Internal.prototype =
{
    _onSlotMouseDown : function()
    {
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
        var mx = CKMouse.getInstance().getX(),
            sx = this._slot.offsetX,
            sw = this._slot.width,
            px = (mx < sx) ? 0 : (mx > (sx + sw)) ? sw : (mx - sx);

        this._handle.node.setWidth(Math.round(px));
        this._interpl = px / sw;
        this._interpolateValue();
    },

    _interpolateValue : function()
    {
        var intrpl = this._intrpl;
        this._value = this._bounds[0]*(1.0-intrpl)+this._bounds[1]*intrpl;
    },

    setBoundMin : function(value){this._bounds[0] = value; this._interpolateValue();},
    setBoundMax : function(value){this._bounds[1] = value; this._interpolateValue();},
    setValue    : function(value){this._intrpl    = value/this._bounds[1]; this._value  = value;},

    setInitialValue : function(value)
    {
        this._intrpl = value/this._bounds[1];
        this._handle.node.setWidth(Math.round(this._intrpl*this._slot.width));
        this._value = value;

    },

    getValue : function(){return this._value;}
};