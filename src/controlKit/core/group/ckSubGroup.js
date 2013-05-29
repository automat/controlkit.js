ControlKit.SubGroup = function(parent,params)
{
    ControlKit.AbstractGroup.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    this._rootNode.setStyleClass(ControlKit.CSS.SubGroup);
    this._wrapNode.setStyleClass(ControlKit.CSS.Wrap);

    this._wrapNode.addChild(this._listNode);
    this._rootNode.addChild(this._wrapNode);

    /*-------------------------------------------------------------------------------------*/

    this._components = [];

    this.set(params);
};

ControlKit.SubGroup.prototype = Object.create(ControlKit.AbstractGroup.prototype);

/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype.set = function(params)
{
    /*-------------------------------------------------------------------------------------*/

    params           = params || {};
    params.enable      = params.enable === undefined ? true : params.enable;
    params.label     = params.label     || null;
    params.maxHeight = params.maxHeight || null;

    var parent = this._parent;

    /*-------------------------------------------------------------------------------------*/

    if(params.label && params.label.length!=0 )
    {
        var headNode = this._headNode = new ControlKit.Node(ControlKit.NodeType.DIV),
            lablWrap =                  new ControlKit.Node(ControlKit.NodeType.DIV),
            lablNode =                  new ControlKit.Node(ControlKit.NodeType.SPAN),
            indiNode = this._indiNode = new ControlKit.Node(ControlKit.NodeType.DIV);

        headNode.setStyleClass(ControlKit.CSS.Head);
        lablWrap.setStyleClass(ControlKit.CSS.Wrap);
        lablNode.setStyleClass(ControlKit.CSS.Label);
        indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMax);

        lablNode.setProperty('innerHTML',params.label);

        headNode.addChild(indiNode);
        lablWrap.addChild(lablNode);
        headNode.addChild(lablWrap);

        headNode.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onHeadDragStart.bind(this));

        this.addEventListener(ControlKit.EventType.SUBGROUP_TRIGGER,parent,'onSubGroupTrigger');

        this._rootNode.addChildAt(headNode,0);

        if(!params.enable)this.disable();
    }

    /*-------------------------------------------------------------------------------------*/

    if(params.maxHeight)
    {
        var maxHeight = this._maxHeight = params.maxHeight,
            wrapNode  = this._wrapNode;

        if(!this._disabled)wrapNode.setHeight(maxHeight);

        this._scrollbar  = new ControlKit.ScrollBar(wrapNode,this._listNode,maxHeight);
    }


    parent.addEventListener(ControlKit.EventType.SUBGROUP_ENABLE,  this, 'onEnable');
    parent.addEventListener(ControlKit.EventType.SUBGROUP_DISABLE, this, 'onDisable');
};

/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype._onHeadDragStart = function()
{
    this._disabled = !this._disabled;this._updateAppearance();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SUBGROUP_TRIGGER,null));
};

ControlKit.SubGroup.prototype._updateAppearance = function()
{
    if(this.isDisabled())
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

ControlKit.SubGroup.prototype.onEnable  = function(){if(this.isDisabled())return;this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.COMPONENTS_ENABLE, null));};
ControlKit.SubGroup.prototype.onDisable = function(){if(this.isDisabled())return;this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.COMPONENTS_DISABLE,null));};

/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype.hasLabel         = function()    {return this._headNode != null;};
ControlKit.SubGroup.prototype.addComponentRoot = function(node){this._listNode.addChild(node);};


