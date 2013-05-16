ControlKit.SubGroup = function(parent,params)
{
    ControlKit.AbstractGroup.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    this._rootNode.setStyleClass(ControlKit.CSS.SubGroup);
    this._wrapNode.setStyleClass(ControlKit.CSS.Wrap);

    this._wrapNode.addChild(this._listNode);
    this._rootNode.addChild(this._wrapNode);

    /*-------------------------------------------------------------------------------------*/

    this.set(params);
};

ControlKit.SubGroup.prototype = Object.create(ControlKit.AbstractGroup.prototype);

/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype.set = function(params)
{
    /*-------------------------------------------------------------------------------------*/

    params           = params || {};
    params.show      = params.show === undefined ? true : params.show;
    params.label     = params.label     || null;
    params.maxHeight = params.maxHeight || null;

    /*-------------------------------------------------------------------------------------*/

    if(params.label && params.label.length!=0 )
    {
        var headNode = this._headNode = new ControlKit.Node(ControlKit.NodeType.DIV),
            lablNode =                  new ControlKit.Node(ControlKit.NodeType.SPAN),
            indiNode = this._indiNode = new ControlKit.Node(ControlKit.NodeType.DIV);

        headNode.setStyleClass(ControlKit.CSS.Head);
        lablNode.setStyleClass(ControlKit.CSS.Label);
        indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMax);

        lablNode.setProperty('innerHTML',params.label);

        headNode.addChild(lablNode);
        headNode.addChild(indiNode);

        headNode.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onHeadMouseDown.bind(this));

        this.addEventListener(ControlKit.EventType.SUBGROUP_HIDDEN,this._parent,'onSubGroupHidden');
        this.addEventListener(ControlKit.EventType.SUBGROUP_SHOWN, this._parent,'onSubGroupShown');

        this._rootNode.addChildAt(headNode,0);

        if(!params.show)this.hide();
    }

    /*-------------------------------------------------------------------------------------*/

    if(params.maxHeight)
    {
        var maxHeight = this._maxHeight = params.maxHeight,
            rootNode  = this._rootNode,
            wrapNode  = this._wrapNode;

        if(!this._hidden)wrapNode.setHeight(maxHeight);

        this._scrollbar  = new ControlKit.ScrollBar(wrapNode,this._listNode,maxHeight);

    }
};

/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype._onHeadMouseDown = function()
{
    this._hidden = !this._hidden;this._updateVisibility();
    this.dispatchEvent(new ControlKit.Event(this,this._hidden ? ControlKit.EventType.SUBGROUP_HIDDEN : ControlKit.EventType.SUBGROUP_SHOWN,null));
};

ControlKit.SubGroup.prototype._updateVisibility = function()
{
    if(this._hidden)
    {
        this._wrapNode.setHeight(0);
        this._headNode.setStyleClass(ControlKit.CSS.HeadInactive);
        this._indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMin);
    }
    else
    {
        var maxHeight = this._maxHeight;

        this._wrapNode.setHeight(maxHeight ? maxHeight : this._wrapNode.getFirstChild().getHeight());
        this._headNode.setStyleClass(ControlKit.CSS.Head);
        this._indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMax);
    }
};

ControlKit.SubGroup.prototype.update = function()
{
    if(!this._maxHeight)return;
    this._scrollbar.update();
};

/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype.hasLabel         = function()    {return this._headNode != null;};
ControlKit.SubGroup.prototype.addComponentRoot = function(node){this._listNode.addChild(node);};

