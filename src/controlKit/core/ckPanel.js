ControlKit.Panel = function(controlKit,params)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    var parent = this._parent = controlKit;

    /*---------------------------------------------------------------------------------*/

    params            = params || {};
    params.valign     = params.valign        || ControlKit.Default.VALIGN;
    params.align      = params.align         || ControlKit.Default.ALIGN;
    params.position   = params.position      || ControlKit.Default.POSITION;
    params.width      = params.width         || ControlKit.Default.WIDTH;
    params.maxHeight  = params.maxHeight     || window.innerHeight;
    params.ratio      = params.ratio         || ControlKit.Default.RATIO;
    params.label      = params.label         || ControlKit.Default.LABEL;

    params.fixed      = params.fixed === undefined ?
                        ControlKit.Default.FIXED :
                        params.fixed;

    /*---------------------------------------------------------------------------------*/

    var align     = this._align     = params.align;
    var maxHeight = this._maxHeight = params.maxHeight;
    var width     = this._width     = Math.max(ControlKit.Default.WIDTH_MIN,
                                      Math.min(params.width,ControlKit.Default.WIDTH_MAX));
    var fixed     = this._fixed     = params.fixed;

    /*---------------------------------------------------------------------------------*/

    var rootNode = this._rootNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        headNode = this._headNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        lablNode =                  new ControlKit.Node(ControlKit.NodeType.SPAN),
        wrapNode = this._wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        listNode = this._listNode = new ControlKit.Node(ControlKit.NodeType.LIST);

    /*---------------------------------------------------------------------------------*/

    controlKit.getRootNode().addChild(rootNode);

    /*---------------------------------------------------------------------------------*/

    rootNode.setStyleClass(ControlKit.CSS.Panel);
    headNode.setStyleClass(ControlKit.CSS.Head);
    lablNode.setStyleClass(ControlKit.CSS.Label);
    wrapNode.setStyleClass(ControlKit.CSS.Wrap);
    listNode.setStyleClass(ControlKit.CSS.GroupList);

    /*---------------------------------------------------------------------------------*/

    rootNode.setWidth(width);
    lablNode.setProperty('innerHTML',params.label);

    /*---------------------------------------------------------------------------------*/

    if(!fixed)
    {
        this._headDragging = false;
        this._mouseOffset  = [0,0];

        headNode.setStyleProperty('cursor','pointer');

        headNode.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,    this._onHeadMouseDown.bind(this));
        document.addEventListener(ControlKit.DocumentEventType.MOUSE_MOVE,this._onDocumentMouseMove.bind(this));
        document.addEventListener(ControlKit.DocumentEventType.MOUSE_UP,  this._onDocumentMouseUp.bind(this));
    }

    /*---------------------------------------------------------------------------------*/

    headNode.addChild(lablNode);
    wrapNode.addChild(listNode);
    rootNode.addChild(headNode);
    rootNode.addChild(wrapNode);

    /*---------------------------------------------------------------------------------*/

    this._position = params.position;

    if(align == 'left')this._setPosition(params.position[0],params.position[1]);
    else               this._setPosition(window.innerWidth - params.position[0] - width,params.position[1]);

    this._groups = [];

    /*---------------------------------------------------------------------------------*/

    window.addEventListener('resize',this._onWindowResize.bind(this));
};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype = Object.create(ControlKit.EventDispatcher.prototype);

ControlKit.Panel.prototype.addGroup  = function(params)
{
    var group = new ControlKit.Group(this,params);
    this._groups.push(group);
    return group;
};

ControlKit.Panel.prototype.getGroups     = function(){return this._groups;};
ControlKit.Panel.prototype.getNode       = function(){return this._rootNode;};
ControlKit.Panel.prototype.getList       = function(){return this._listNode;};


/*---------------------------------------------------------------------------------*
* Panel dragging
*----------------------------------------------------------------------------------*/

ControlKit.Panel.prototype._onHeadMouseDown = function()
{
    var nodePos   = this._rootNode.getPositionGlobal(),
        mousePos  = ControlKit.Mouse.getInstance().getPosition(),
        offsetPos = this._mouseOffset;

    offsetPos[0] = mousePos[0] - nodePos[0];
    offsetPos[1] = mousePos[1] - nodePos[1];

    this._headDragging = true;

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_BEGIN,null));
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.INDEX_ORDER_CHANGED,{origin:this}));
};

ControlKit.Panel.prototype._updatePosition = function()
{
    var mousePos  = ControlKit.Mouse.getInstance().getPosition(),
        offsetPos = this._mouseOffset;

    var currPositionX = mousePos[0]-offsetPos[0],
        currPositionY = mousePos[1]-offsetPos[1];

    this._setPosition(currPositionX,currPositionY);

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE,null));
};

ControlKit.Panel.prototype._onDocumentMouseMove = function()
{
    if(!this._headDragging)return;
    this._updatePosition();
};

ControlKit.Panel.prototype._onDocumentMouseUp = function()
{
    if(!this._headDragging)return;
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_END,null));
    this._headDragging = false;
};

ControlKit.Panel.prototype._onWindowResize = function()
{
    this._setPosition(this._position[0],this._position[1]);
};

/*---------------------------------------------------------------------------------*/

ControlKit.Panel.prototype._setPosition = function(x,y)
{
    var node     = this._rootNode,
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
};

/*
ControlKit.Panel.prototype._constrainHeight = function()
{
    return;

    var node        = this._wrapNode;

    var panelTop    = this._position[1],
        panelHeight = node.getHeight(),
        panelBottom = panelTop + panelHeight;

    var height = window.innerHeight;

    if(panelBottom  < height)
    {
        node.setHeight(node.getFirstChild().getHeight());

        console.log(node.getFirstChild().getHeight());

    }
    else
    {
        node.setHeight(100);

    }
};
*/

ControlKit.Panel.prototype.getWidth      = function(){return this._width;};
ControlKit.Panel.prototype.getAlignment  = function(){return this._align;};
ControlKit.Panel.prototype.getPosition   = function(){return this._position;};

/*---------------------------------------------------------------------------------*/



