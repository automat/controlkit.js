//TODO: Add mouseoffset & reset..
ControlKit.ScrollBar = function(parentNode,targetNode,wrapHeight)
{
    this._parentNode = parentNode;
    this._targetNode = targetNode;
    this._wrapHeight = wrapHeight;

    /*---------------------------------------------------------------------------------*/

    var wrap   = this._wrapNode   = new ControlKit.Node(ControlKit.NodeType.DIV),
        node   = this._node   = new ControlKit.Node(ControlKit.NodeType.DIV),
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

    this._scrollMin    = 0;
    this._scrollMax    = 1;
    this._scrollPos    = 0;


    thumb.setPositionY(ControlKit.Constant.SCROLLBAR_TRACK_PADDING);
    thumb.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onThumbDragStart.bind(this));

    this._isValid  = false;
    this._disabled = false;
};

ControlKit.ScrollBar.prototype =
{
    update : function()
    {
        var target  = this._targetNode,
            thumb   = this._thumbNode;

        var padding = ControlKit.Constant.SCROLLBAR_TRACK_PADDING;

        var targetWrapHeight = this._wrapHeight,
            targetHeight     = target.getHeight(),
            trackHeight      = targetWrapHeight - padding * 2;

        thumb.setHeight(trackHeight);

        var ratio = targetWrapHeight / targetHeight;

        this._isValid = false;

        if(ratio > 1.0)return;

        var thumbHeight = trackHeight * ratio;

        this._scrollHeight = trackHeight  - thumbHeight;
        this._scrollUnit   = targetHeight - trackHeight - padding * 2;

        thumb.setHeight(thumbHeight);

        this._isValid = true;


        /*
        var scrollMin = this._scrollMin,
            scrollMax = this._scrollMax,
            scrollPos = this._scrollPos;

        var scrollPosNorm = (scrollPos - scrollMin) / (scrollMax - scrollPos);
        */


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

        var min = this._scrollMin = trackCenter - scrollHeight * 0.5,
            max = this._scrollMax = trackCenter + scrollHeight * 0.5;

        var pos       = Math.max(min,Math.min(y - trackTop,max));

        var thumbPos  = this._scrollPos =  pos - thumbHeight * 0.5,
            targetPos = -(pos - min) / (max - min) * scrollUnit;

        thumb.setPositionY(thumbPos);
        target.setPositionY(targetPos);
    },

    _onThumbDragStart : function()
    {
        if(!this._isValid || this._disabled)return;

        var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
            eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

        var self = this;

        var mouse = ControlKit.Mouse.getInstance();

        //TODO:add
        this._scrollOffset = mouse.getY() - this._thumbNode.getPositionGlobalY();

        var onDrag    = function()
            {
                self._scrollThumb(mouse.getY());
            },

            onDragEnd = function()
            {
                document.removeEventListener(eventMouseMove, onDrag,    false);
                document.removeEventListener(eventMouseUp,   onDragEnd, false);
            };

        this._scrollThumb(mouse.getY());
        document.addEventListener(eventMouseMove, onDrag,    false);
        document.addEventListener(eventMouseUp,   onDragEnd, false);
    },

    enable  : function(){this._disabled = false;this._updateAppearance();},
    disable : function(){this._disabled = true; this._updateAppearance();},

    _updateAppearance : function()
    {
        if(this._disabled)
        {
            this._node.setStyleProperty('display','none');
            this._targetNode.setPositionY(0);
            this._thumbNode.setPositionY(ControlKit.Constant.SCROLLBAR_TRACK_PADDING);
        }
        else
        {
            this._node.setStyleProperty('display','block');
        }
    },

    isValid : function(){return this._isValid;},

    setWrapHeight : function(height)
    {
        this._wrapHeight = height;
        this.update();
    },

    removeTargetNode : function(){return this._wrapNode.removeChild(this._targetNode);},

    removeFromParent : function()
    {
        var parentNode = this._parentNode,
            rootNode   = this._node,
            targetNode = this._targetNode;

        rootNode.removeChild(targetNode);
        parentNode.removeChild(this._wrapNode);
        parentNode.removeChild(rootNode);

        return targetNode;
    },

    getWrapNode    : function(){return this._wrapNode;},
    getNode        : function(){return this._node;},
    getTargetNode  : function(){return this._targetNode;}
};
