
ControlKit.ScrollBar = function(parent,target)
{

    this._parent = parent;
    this._target = target;


    var wrap   = this._wrapNode   = new ControlKit.Node(ControlKit.NodeType.DIV),
        node   = this._rootNode   = new ControlKit.Node(ControlKit.NodeType.DIV),
        track  = this._track      = new ControlKit.ScrollTrack(this);

    /*---------------------------------------------------------------------------------*/

    var parentNode = parent.getNode(),
        targetNode = target.getNode();

    parentNode.removeChild(targetNode);
    wrap.addChild(targetNode);
    node.addChild(track.getNode());

    parentNode.addChild(wrap);
    parentNode.addChildAt(node,0);

    /*---------------------------------------------------------------------------------*/

    wrap.setStyleClass(ControlKit.CSS.ScrollWrap);
    node.setStyleClass(ControlKit.CSS.ScrollBar);

    /*---------------------------------------------------------------------------------*/

    this._scrollUnit = 0;



};


ControlKit.ScrollBar.prototype.update = function()
{
    this._track.update();
};

ControlKit.ScrollBar.prototype.getScrollTarget     = function(){return this._wrapNode;};
ControlKit.ScrollBar.prototype.getScrollTargetWrap = function(){return this._parent;};

/*---------------------------------------------------------------------------------*/

ControlKit.ScrollThumb = function(parent)
{
    this._parent = parent;

    var node = this._node = new ControlKit.Node(ControlKit.NodeType.DIV);
    this._parent.getNode().addChild(node);

    node.setStyleClass(ControlKit.CSS.ScrollbarThumb);
    node.setPositionGlobalY( ControlKit.Constant.SCROLLBAR_TRACK_PADDING);
    node.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onDragStart.bind(this));
};

ControlKit.ScrollThumb.prototype =
{
    _onDragStart : function()
    {
        var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
            eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

        var node       = this._node,
            parentNode = this._parent.getNode();

        var mouse       = ControlKit.Mouse.getInstance(),
            mouseOffset = mouse.getY() - node.getPositionGlobalY();

        var self = this;

        var onDrag = function()
        {
            self.scroll(mouse.getY() - parentNode.getPositionGlobalY() - mouseOffset);
            console.log('drag');
        };

        var onDragEnd = function()
        {
            document.removeEventListener(eventMouseMove, onDrag,    false);
            document.removeEventListener(eventMouseUp,   onDragEnd, false);

            console.log('drag_end');
        };

        document.addEventListener(eventMouseMove, onDrag,    false);
        document.addEventListener(eventMouseUp,   onDragEnd, false);


        console.log('drag_start');
    },

    update : function()
    {
        /*
        var track = this._parent;

        var target           = track.getParent().getScrollTarget(),
            targetWrap       = track.getParent().getScrollTargetWrap(),
            targetHeight     = target.getHeight(),
            targetWrapHeight = targetWrap.getHeight() ? targetWrap.getMaxHeight() :
                               targetWrap.getHeight();
                               */

        //console.log(targetHeight + ' ' + targetWrapHeight);

        //var padding = ControlKit.Constant.SCROLLBAR_TRACK_PADDING;

        /*
        var interpolation = bar.getScrollTarget().getHeight() /
                            bar.getScrollTargetWrap().getHeight();
                            */



    },

    scroll  : function(y)
    {
        var node = this._node;

        node.setPositionGlobalY(y);

        /*
        var trackNode = this._parent.getNode(),
            thumbNode = this._node;

        var trackOffset  = trackNode.getPositionGlobalY(),
            trackPadding = ControlKit.Constant.SCROLLBAR_TRACK_PADDING;

        var min = trackOffset + trackPadding,
            max = trackOffset + trackNode.getHeight() - trackPadding - thumbNode.getHeight();

        thumbNode.setPositionGlobalY(Math.round((y < min) ? trackPadding :
                                                (y > max) ? max - trackOffset :
                                                (y - trackOffset)));
                                                */




    },

    getNode : function(){return this._node;}
};

/*---------------------------------------------------------------------------------*/

ControlKit.ScrollTrack = function(parent)
{
    this._parent = parent;

    this._node  = new ControlKit.Node(ControlKit.NodeType.DIV);
    this._thumb = new ControlKit.ScrollThumb(this);

    this._node.setStyleClass(ControlKit.CSS.ScrollbarTrack);
    this._node.addChild(this._thumb.getNode());
};

ControlKit.ScrollTrack.prototype =
{
    update   : function(){this._thumb.update();},
    getNode  : function(){return this._node;},
    getParent: function(){return this._parent;}
};

