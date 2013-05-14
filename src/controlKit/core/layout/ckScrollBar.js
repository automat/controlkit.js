
ControlKit.ScrollBar = function(parentNode,targetNode,targetHeight)
{
    var wrap  = this._wrapNode    = new ControlKit.Node(ControlKit.NodeType.DIV);
    var node  = this._rootNode    = new ControlKit.Node(ControlKit.NodeType.DIV);

    var btnSU = this._btnStepUp   = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON),
        btnSD = this._btnStepDown = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);

    var track = this._track = new ControlKit.ScrollTrack();
    var thumb = this._thumb = new ControlKit.ScrollThumb();


    /*---------------------------------------------------------------------------------*/

    parentNode.removeChild(targetNode);
    wrap.addChild(targetNode);


    track.getNode().addChild(thumb.getNode());

    node.addChild(btnSU);
    node.addChild(track.getNode());
    node.addChild(btnSD);

    parentNode.addChild(wrap);
    parentNode.addChildAt(node,0);

    /*---------------------------------------------------------------------------------*/

    wrap.setStyleClass(ControlKit.CSS.ScrollWrap);
    node.setStyleClass(ControlKit.CSS.ScrollBar);

    btnSU.setStyleClass(ControlKit.CSS.ScrollbarBtnUp);
    btnSD.setStyleClass(ControlKit.CSS.ScrollbarBtnDown);




    /*---------------------------------------------------------------------------------*/


    this._scrollUnit = 0;

};

ControlKit.ScrollBar.prototype =
{
    onTargetHeightChanged : function(e){},

    _updateHeight : function(){},

    _updateThumb  : function(){},

    _scroll : function(){},

    updateRatio : function(){},

    _update : function(){},

    _setPosition : function(y){}






};

ControlKit.ScrollThumb = function()
{
    this._node = new ControlKit.Node(ControlKit.NodeType.DIV);

    this._dragging = false;
    this._top      = 0;
    this._middle   = 0;
    this._height   = 0;
};

ControlKit.ScrollThumb.prototype =
{
    getNode : function(){return this._node;}
};

ControlKit.ScrollTrack = function()
{
    var node = this._node = new ControlKit.Node(ControlKit.NodeType.DIV);
    node.setStyleClass(ControlKit.CSS.ScrollbarTrack);

    this.offset = 0;
    this.height = 0;
    this.scrollHeight = 0;

};

ControlKit.ScrollTrack.prototype =
{
    getNode : function()      {return this._node;},
    setHeight:function(height){this._height = height;this._node.setHeight(this);},
    getHeight:function()      {return this._height;}

};

