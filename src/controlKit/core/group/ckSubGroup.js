ControlKit.SubGroup = function(parent,params)
{
    ControlKit.AbstractGroup.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params           = params        || {};
    params.label     = params.label  || null;
    params.enable    = params.enable === undefined ? true : params.enable;

    /*---------------------------------------------------------------------------------*/

    var rootNode = this._node,
        wrapNode = this._wrapNode,
        listNode = this._listNode;

        rootNode.setStyleClass(ControlKit.CSS.SubGroup);
        wrapNode.setStyleClass(ControlKit.CSS.Wrap);

        wrapNode.addChild(listNode);
        rootNode.addChild(wrapNode);

    /*-------------------------------------------------------------------------------------*/

    var label = params.label;

    if(label)
    {
        if(label.length != 0 && label != 'none')
        {
            var headNode = this._headNode = new ControlKit.Node(ControlKit.NodeType.DIV),
                lablWrap =                  new ControlKit.Node(ControlKit.NodeType.DIV),
                lablNode =                  new ControlKit.Node(ControlKit.NodeType.SPAN),
                indiNode = this._indiNode = new ControlKit.Node(ControlKit.NodeType.DIV);

                headNode.setStyleClass(ControlKit.CSS.Head);
                lablWrap.setStyleClass(ControlKit.CSS.Wrap);
                lablNode.setStyleClass(ControlKit.CSS.Label);
                indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMax);
                lablNode.setProperty('innerHTML',label);

                headNode.addChild(indiNode);
                lablWrap.addChild(lablNode);
                headNode.addChild(lablWrap);

            headNode.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onHeadMouseDown.bind(this));
            rootNode.addChildAt(headNode,0);

            if(!params.enable)this.disable();

            this.addEventListener(ControlKit.EventType.SUBGROUP_TRIGGER,this._parent,'onSubGroupTrigger');
        }
    }

    if(this.hasMaxHeight())this.addScrollWrap();

    /*-------------------------------------------------------------------------------------*/

    this._parent.addEventListener(ControlKit.EventType.SUBGROUP_ENABLE,  this, 'onEnable');
    this._parent.addEventListener(ControlKit.EventType.SUBGROUP_DISABLE, this, 'onDisable');
    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE_END,   this, 'onPanelMoveEnd');
    this._parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE,this, 'onGroupSizeChange');

    this.addEventListener(ControlKit.EventType.GROUP_SIZE_UPDATE,this._parent,'onGroupSizeUpdate');
};

ControlKit.SubGroup.prototype = Object.create(ControlKit.AbstractGroup.prototype);

/*-------------------------------------------------------------------------------------*/

//FIXME

ControlKit.SubGroup.prototype._onHeadMouseDown = function()
{
    this._disabled = !this._disabled;this._onTrigger();

    var event = ControlKit.DocumentEventType.MOUSE_UP,
        self  = this;
    var onDocumenttMouseUp = function(){self._onTrigger();
        document.removeEventListener(event,onDocumenttMouseUp);};

    document.addEventListener(event,onDocumenttMouseUp);
};

ControlKit.SubGroup.prototype._onTrigger = function()
{
    this._updateAppearance();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SUBGROUP_TRIGGER,null));
};


/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype._updateAppearance = function()
{
    if(this.isDisabled())
    {
        this._headNode.setStyleClass(ControlKit.CSS.HeadInactive);
        this._indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMin);
        this._wrapNode.setHeight(0);
    }
    else
    {
        var wrapNode = this._wrapNode;

        var height   = this.hasMaxHeight() ?
                       this.getMaxHeight() :
                       wrapNode.getFirstChild().getHeight();

        this._headNode.setStyleClass(ControlKit.CSS.Head);
        this._indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMax);

        wrapNode.setHeight(height);
    }
};

ControlKit.SubGroup.prototype.update = function(){if(this.hasMaxHeight())this._scrollBar.update();};

/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype.onEnable          = function(){if(this.isDisabled())return;this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.COMPONENTS_ENABLE, null));};
ControlKit.SubGroup.prototype.onDisable         = function(){if(this.isDisabled())return;this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.COMPONENTS_DISABLE,null));};
//bubble
ControlKit.SubGroup.prototype.onGroupSizeChange = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_CHANGE,null));};
ControlKit.SubGroup.prototype.onGroupSizeUpdate = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_UPDATE,null));};
ControlKit.SubGroup.prototype.onPanelMoveEnd    = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_END,   null));};

/*-------------------------------------------------------------------------------------*/

ControlKit.SubGroup.prototype.hasLabel         = function()    {return this._headNode != null;};
ControlKit.SubGroup.prototype.addComponentNode = function(node){this._listNode.addChild(node);};







