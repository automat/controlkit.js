ControlKit.Panel = function(controlKit,params)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    var parent = this._parent = controlKit;

    /*---------------------------------------------------------------------------------*/

    params                 = params           || {};

    params.valign     = params.valign    || ControlKit.Default.PANEL_VALIGN;
    params.align      = params.align     || ControlKit.Default.PANEL_ALIGN;
    params.position   = params.position  || ControlKit.Default.PANEL_POSITION;
    params.width      = params.width     || ControlKit.Default.PANEL_WIDTH;
    params.height     = params.height    || null;
    params.ratio      = params.ratio     || ControlKit.Default.PANEL_RATIO;
    params.label      = params.label     || ControlKit.Default.PANEL_LABEL;
    params.opacity    = params.opacity   || ControlKit.Default.PANEL_OPACITY;

    params.fixed      = params.fixed === undefined ?
                        ControlKit.Default.PANEL_FIXED :
                        params.fixed;

    params.vconstrain = params.vconstrain || true;

    /*---------------------------------------------------------------------------------*/

    if(params.dock)
    {
        params.dock.align     = params.dock.align     || ControlKit.Default.PANEL_DOCK.align;
        params.dock.resizable = params.dock.resizable || ControlKit.Default.PANEL_DOCK.resizable;
    }

    /*---------------------------------------------------------------------------------*/

    var align      = this._align      = params.align,
        height     = this._height     = params.height ?  Math.max(0,Math.min(params.height,window.innerHeight)) : null,
        width      = this._width      = Math.max(ControlKit.Default.PANEL_WIDTH_MIN,
                                        Math.min(params.width,ControlKit.Default.PANEL_WIDTH_MAX)),
        fixed      = this._fixed      = params.fixed,
        dock       = this._dock       = params.dock,
        label      = this._label      = params.label,
        position   = this._position   = params.position,
        opacity    =                    params.opacity;

    this._vConstrain = params.vconstrain;

    /*---------------------------------------------------------------------------------*/

    this._isDisabled = false;

    this._groups = [];

    /*---------------------------------------------------------------------------------*/

    var rootNode  = this._node = new ControlKit.Node(ControlKit.NodeType.DIV),
        headNode  = this._headNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        lablWrap  =                  new ControlKit.Node(ControlKit.NodeType.DIV),
        lablNode  =                  new ControlKit.Node(ControlKit.NodeType.SPAN),
        wrapNode  = this._wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        listNode  = this._listNode = new ControlKit.Node(ControlKit.NodeType.LIST);

    /*---------------------------------------------------------------------------------*/

        rootNode.setStyleClass(ControlKit.CSS.Panel);
        headNode.setStyleClass(ControlKit.CSS.Head);
        lablWrap.setStyleClass(ControlKit.CSS.Wrap);
        lablNode.setStyleClass(ControlKit.CSS.Label);
        wrapNode.setStyleClass(ControlKit.CSS.Wrap);
        listNode.setStyleClass(ControlKit.CSS.GroupList);

    /*---------------------------------------------------------------------------------*/

    rootNode.setWidth(width);
    lablNode.setProperty('innerHTML',label);

    /*---------------------------------------------------------------------------------*/

    controlKit.getNode().addChild(rootNode);

    /*---------------------------------------------------------------------------------*/

    if(!fixed && !isDocked)
    {
        this._mouseOffset  = [0,0];
        headNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onHeadDragStart.bind(this));
    }

    if(opacity != 1.0 && opacity != 0.0){rootNode.setStyleProperty('opacity',opacity);}

    /*---------------------------------------------------------------------------------*/

    var menuNode = new ControlKit.Node(ControlKit.NodeType.DIV);
        menuNode.setStyleClass( ControlKit.CSS.Menu);


    if(!ControlKit.History.getInstance().isDisabled())
    {
        var menuUndo = this._menuUndo = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
            menuUndo.setStyleClass( ControlKit.CSS.MenuBtnUndo);
            menuUndo.setProperty('value',ControlKit.History.getInstance().getNumStates());
            menuNode.addChild(menuUndo);
            menuUndo.setStyleProperty('display','none');
            menuUndo.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN, this._onMenuUndoTrigger.bind(this));

            headNode.addEventListener(ControlKit.NodeEventType.MOUSE_OVER, this._onHeadMouseOver.bind(this));
            headNode.addEventListener(ControlKit.NodeEventType.MOUSE_OUT,  this._onHeadMouseOut.bind(this));
    }

    var isDocked = this.isDocked();

    if(!isDocked)
    {
        var menuClose = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON),
            menuHide  = this._menuHide = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);

            menuClose.setStyleClass(ControlKit.CSS.MenuBtnClose);
            menuHide.setStyleClass( ControlKit.CSS.MenuBtnHide);

            menuNode.addChild(menuHide);
            menuNode.addChild(menuClose);

            menuHide.addEventListener( ControlKit.NodeEventType.MOUSE_DOWN, this._onMenuHideMouseDown.bind(this));
            menuClose.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN, this.disable.bind(this));
    }
    else
    {
        var windowWidth = window.innerWidth,
            rootWidth   = rootNode.getWidth();

        switch(dock.align)
        {
            case ControlKit.LayoutMode.TOP:
                break;

            case ControlKit.LayoutMode.RIGHT:

                position[0] = windowWidth - rootWidth;
                position[1] = 0;
                this._height = window.innerHeight;
                align = this._align = ControlKit.LayoutMode.RIGHT;

                break;

            case ControlKit.LayoutMode.BOTTOM:
                break;

            case ControlKit.LayoutMode.LEFT:

                position[0] = 0;
                position[1] = 0;
                this._height = window.innerHeight;
                align = this._align = ControlKit.LayoutMode.LEFT;

                break;
        }

        /*
        if(dock.resizable)
        {
            var sizeHandle = new ControlKit.Node(ControlKit.NodeType.DIV);
                sizeHandle.setStyleClass(ControlKit.CSS.SizeHandle);
            rootNode.addChildAt(sizeHandle,0);
        }
        */

        rootNode.setPositionGlobal(position[0],position[1]);
    }

    /*---------------------------------------------------------------------------------*/

    headNode.addChild(menuNode);
    lablWrap.addChild(lablNode);
    headNode.addChild(lablWrap);
    wrapNode.addChild(listNode);
    rootNode.addChild(headNode);
    rootNode.addChild(wrapNode);

    /*---------------------------------------------------------------------------------*/

    if(!isDocked)
    {
        this._setPosition(align == ControlKit.LayoutMode.LEFT ? position[0] :
                          window.innerWidth - (position[0] - width), position[1]);

        if(this.hasMaxHeight()){this._addScrollWrap();}
    }

    /*---------------------------------------------------------------------------------*/

    this._parent.addEventListener(ControlKit.EventType.UPDATE_MENU,      this, 'onUpdateMenu');
    this._parent.addEventListener(ControlKit.EventType.INPUT_SELECT_DRAG,this, 'onComponentInputSelectDrag');

    window.addEventListener(ControlKit.DocumentEventType.WINDOW_RESIZE,this._onWindowResize.bind(this));


};

ControlKit.Panel.prototype = Object.create(ControlKit.EventDispatcher.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype.addGroup  = function(params)
{
    var group = new ControlKit.Group(this,params);
    this._groups.push(group);
    if(this.isDocked())this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_SIZE_CHANGE));
    return group;
};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype.onGroupListSizeChange = function()
{
    if(this._hasScrollWrap())this._updateScrollWrap();
    this._constrainHeight();
};

ControlKit.Panel.prototype._updateScrollWrap = function()
{
    var wrapNode   = this._wrapNode,
        scrollBar  = this._scrollBar,
        height     = this.hasMaxHeight() ?
                     this.getMaxHeight() : 100,
        listHeight = this._listNode.getHeight();

    wrapNode.setHeight(listHeight < height ? listHeight : height);

    scrollBar.update();

    if (!scrollBar.isValid())
    {
        scrollBar.disable();
        wrapNode.setHeight(wrapNode.getChildAt(1).getHeight());
    }
    else
    {
        scrollBar.enable();
        wrapNode.setHeight(height);
    }
};


ControlKit.Panel.prototype._addScrollWrap = function()
{
    var wrapNode = this._wrapNode,
        listNode = this._listNode,
        height   = arguments.length == 0 ?
                   this.getMaxHeight() :
                   arguments[0];

    this._scrollBar = new ControlKit.ScrollBar(wrapNode,listNode,height);
    if(this.isEnabled())wrapNode.setHeight(height);
};

ControlKit.Panel.prototype._hasScrollWrap = function(){return this._scrollBar != null;};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype._onMenuHideMouseDown = function()
{
    this._isDisabled = !this._isDisabled;
    this._updateAppearance();
};

ControlKit.Panel.prototype._updateAppearance = function()
{
    var rootNode = this._node,
        headNode = this._headNode,
        menuHide = this._menuHide;

    if(this._isDisabled)
    {
        headNode.getStyle().borderBottom = 'none';

        rootNode.setHeight(headNode.getHeight());
        menuHide.setStyleClass(ControlKit.CSS.MenuBtnShow);

        this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_HIDE,null));
    }
    else
    {
        rootNode.setHeight(headNode.getHeight() +  this._wrapNode.getHeight());
        rootNode.deleteStyleProperty('height');
        menuHide.setStyleClass(ControlKit.CSS.MenuBtnHide);
        headNode.setStyleClass(ControlKit.CSS.Head);

        this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_SHOW,null));
    }
};

ControlKit.Panel.prototype._onHeadMouseOver   = function(){this._menuUndo.setStyleProperty('display','inline')};
ControlKit.Panel.prototype._onHeadMouseOut    = function(){this._menuUndo.setStyleProperty('display','none')};
ControlKit.Panel.prototype.onUpdateMenu       = function(){this._menuUndo.setProperty('value',ControlKit.History.getInstance().getNumStates());};

ControlKit.Panel.prototype._onMenuUndoTrigger = function(){ControlKit.History.getInstance().popState();};

/*---------------------------------------------------------------------------------*
* Panel dragging
*----------------------------------------------------------------------------------*/

ControlKit.Panel.prototype._onHeadDragStart = function()
{
    var parentNode = this._parent.getNode(),
        node       = this._node;

    var nodePos   = node.getPositionGlobal(),
        mousePos  = ControlKit.Mouse.getInstance().getPosition(),
        offsetPos = this._mouseOffset;

    offsetPos[0] = mousePos[0] - nodePos[0];
    offsetPos[1] = mousePos[1] - nodePos[1];

    var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

    var self = this;

    var onDrag    = function()
                    {
                        self._updatePosition();
                    },

        onDragEnd = function()
                    {
                        document.removeEventListener(eventMouseMove, onDrag,    false);
                        document.removeEventListener(eventMouseUp,   onDragEnd, false);
                        self.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_END,null));
                    };

    parentNode.removeChild(node);
    parentNode.addChild(   node);

    document.addEventListener(eventMouseMove, onDrag,    false);
    document.addEventListener(eventMouseUp,   onDragEnd, false);

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_BEGIN,null));
};

ControlKit.Panel.prototype._updatePosition = function()
{
    var mousePos  = ControlKit.Mouse.getInstance().getPosition(),
        offsetPos = this._mouseOffset;

    var currPositionX = mousePos[0] - offsetPos[0],
        currPositionY = mousePos[1] - offsetPos[1];

    this._setPosition(currPositionX,currPositionY);
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE,null));
};

ControlKit.Panel.prototype._onWindowResize = function()
{
    if(this.isDocked())
    {
        var dock = this._dock;

        if(dock.align == ControlKit.LayoutMode.RIGHT ||
           dock.align == ControlKit.LayoutMode.LEFT )
        {
            var windowHeight = window.innerHeight,
                listHeight   = this._listNode.getHeight(),
                headHeight   = this._headNode.getHeight();

            this._height = windowHeight;
            this._constrainHeight();

            if((windowHeight - headHeight) > listHeight)this._scrollBar.disable();
            else this._scrollBar.enable();

            this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_SIZE_CHANGE));
        }
    }
    else
    {
        var position = this._position;
        this._setPosition(position[0],position[1]);
    }
};

ControlKit.Panel.prototype.onComponentInputSelectDrag = function()
{
    if(!this._hasScrollWrap())return;
    this._wrapNode.getElement().scrollTop = 0;
};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype._setPosition = function(x,y)
{
    var node     = this._node,
        head     = this._headNode,
        position = this._position;

    var maxX = window.innerWidth  - node.getWidth(),
        maxY = window.innerHeight - head.getHeight();

    if(!this._fixed)
    {
        position[0] = Math.max(0,Math.min(x,maxX));
        position[1] = Math.max(0,Math.min(y,maxY));
    }
    else
    {
        //TODO FIX
        position[0] = maxX;
    }

    node.setPositionGlobal(position[0],position[1]);
    if(this._vConstrain)this._constrainHeight();
};

ControlKit.Panel.prototype._constrainHeight = function()
{
    var hasMaxHeight  = this.hasMaxHeight(),
        hasScrollWrap = this._hasScrollWrap();

    var headNode      = this._headNode,
        wrapNode      = this._wrapNode;

    var scrollBar     = this._scrollBar;

    var panelTop      = this._position[1],
        panelHeight   = hasMaxHeight  ? this.getMaxHeight() :
                        hasScrollWrap ? scrollBar.getTargetNode().getHeight() :
                        wrapNode.getHeight(),
        panelBottom   = panelTop + panelHeight,
        headHeight    = headNode.getHeight();

    var windowHeight  = window.innerHeight,
        heightDiff    = windowHeight - panelBottom - headHeight,
        heightSum;

    if(heightDiff < 0.0)
    {
        heightSum = panelHeight + heightDiff;

        if(!hasScrollWrap)
        {
            this._addScrollWrap(heightSum);
            this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_SCROLL_WRAP_ADDED, null));
            return;
        }

        scrollBar.setWrapHeight(heightSum);
        wrapNode.setHeight(heightSum);
    }
    else
    {
        if(!hasMaxHeight && hasScrollWrap)
        {
            scrollBar.removeFromParent();
            wrapNode.addChild(this._listNode);
            wrapNode.deleteStyleProperty('height');

            this._scrollBar = null;

            this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_SCROLL_WRAP_REMOVED, null));
        }
    }
};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype.enable  = function()
{
    this._node.setStyleProperty('display','block');
    this._isDisabled = false;
    this._updateAppearance();
};

ControlKit.Panel.prototype.disable = function()
{
    this._node.setStyleProperty('display','none');
    this._isDisabled = true;
    this._updateAppearance();
};

ControlKit.Panel.prototype.isEnabled  = function(){return !this._isDisabled;};
ControlKit.Panel.prototype.isDisabled = function(){return this._isDisabled;};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype.hasMaxHeight  = function(){return this._height != null;};
ControlKit.Panel.prototype.getMaxHeight  = function(){return this._height;};

ControlKit.Panel.prototype.isDocked      = function(){return this._dock;};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype.getGroups     = function(){return this._groups;};
ControlKit.Panel.prototype.getNode       = function(){return this._node;};
ControlKit.Panel.prototype.getList       = function(){return this._listNode;};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype.getLabel      = function(){return this._label;};
ControlKit.Panel.prototype.getWidth      = function(){return this._width;};
ControlKit.Panel.prototype.getPosition   = function(){return this._position;};




