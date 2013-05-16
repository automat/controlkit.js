//TODO: Add mouseoffset
ControlKit.ScrollBar = function(parentNode,targetNode,wrapHeight)
{
    this._wrapHeight = wrapHeight;
    this._targetNode = targetNode;

    var wrap   = this._wrapNode   = new ControlKit.Node(ControlKit.NodeType.DIV),
        node   = this._rootNode   = new ControlKit.Node(ControlKit.NodeType.DIV),
        track  = this._trackNode  = new ControlKit.Node(ControlKit.NodeType.DIV),
        thumb  = this._thumbNode  = new ControlKit.Node(ControlKit.NodeType.DIV);

    /*---------------------------------------------------------------------------------*/

    parentNode.removeChild(targetNode);
    parentNode.addChild(wrap);
    parentNode.addChildAt(node,0);

    wrap.addChild(targetNode);
    node.addChild(track);
    track.addChild(thumb);

    /*---------------------------------------------------------------------------------*/

    wrap.setStyleClass(ControlKit.CSS.ScrollWrap);
    node.setStyleClass(ControlKit.CSS.ScrollBar);
    track.setStyleClass(ControlKit.CSS.ScrollbarTrack);
    thumb.setStyleClass(ControlKit.CSS.ScrollbarThumb);

    /*---------------------------------------------------------------------------------*/

    this._scrollHeight = 0;
    this._scrollUnit   = 0;

    thumb.setPositionY(ControlKit.Constant.SCROLLBAR_TRACK_PADDING);
    thumb.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onThumbDragStart.bind(this));

    this._valid  = false;
    this._hidden = false;
};

ControlKit.ScrollBar.prototype =
{
    update : function()
    {
        if(this._hidden)return;

        var wrapHeight   = this._wrapHeight,
            target       = this._targetNode,
            targetHeight = target.getHeight();

        var padding     = ControlKit.Constant.SCROLLBAR_TRACK_PADDING,
            trackHeight = wrapHeight - padding * 2,
            thumb        = this._thumbNode;

        thumb.setHeight(trackHeight);

        var ratio = wrapHeight / targetHeight;

        if(ratio > 1.0 || ratio == Infinity)return;

        var thumbHeight = trackHeight * ratio;

        this._scrollHeight = trackHeight  - thumbHeight;
        this._scrollUnit   = targetHeight - trackHeight - padding * 2;

        thumb.setHeight(thumbHeight);

        this._valid = true;
    },

    _scrollThumb : function(y)
    {
        var thumb          = this._thumbNode,
            thumbHeight    = thumb.getHeight();

        var track        = this._trackNode,
            trackHeight  = this._wrapHeight,
            trackTop     = track.getPositionGlobalY(),
            trackCenter  = trackHeight * 0.5;

        var target       = this._targetNode;

        var scrollHeight = this._scrollHeight,
            scrollUnit   = this._scrollUnit;

        var min = trackCenter - scrollHeight * 0.5,
            max = trackCenter + scrollHeight * 0.5;

        var pos      =  Math.max(min,Math.min(y - trackTop,max));

        var thumbPos  = pos - thumbHeight * 0.5,
            targetPos = -(pos - min) / (max - min) * scrollUnit;

        thumb.setPositionY(thumbPos);
        target.setPositionY(targetPos);
    },

    _onThumbDragStart : function()
    {
        if(!this._valid || this._hidden)return;

        var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
            eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

        var self = this;

        var mouse = ControlKit.Mouse.getInstance();

        this._scrollOffset = mouse.getY() - this._thumbNode.getPositionGlobalY();

        var onDrag = function(){self._scrollThumb(mouse.getY());};

        var onDragEnd = function()
        {
            document.removeEventListener(eventMouseMove, onDrag,    false);
            document.removeEventListener(eventMouseUp,   onDragEnd, false);

        };

        self._scrollThumb(mouse.getY());
        document.addEventListener(eventMouseMove, onDrag,    false);
        document.addEventListener(eventMouseUp,   onDragEnd, false);
    },

    show : function(){this._hidden = false;this._updateVisibily();},
    hide : function(){this._hidden = true; this._updateVisibily();},

    _updateVisibily : function()
    {
        this._rootNode.setStyleProperty('display',this._hidden ? 'none' : 'block');
    }
};

