ControlKit.CKSubGroup = function(parent,label,params)
{
    ControlKit.CKAbstractGroup.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    this._rootNode.setStyleClass(ControlKit.CKCSS.SubGroup);
    this._wrapNode.setStyleClass(ControlKit.CKCSS.Wrap);

    this._wrapNode.addChild(this._listNode);
    this._rootNode.addChild(this._wrapNode);

    /*-------------------------------------------------------------------------------------*/

    this.set(label,params);

    /*-------------------------------------------------------------------------------------*/
}

ControlKit.CKSubGroup.prototype = Object.create(ControlKit.CKAbstractGroup.prototype);

/*-------------------------------------------------------------------------------------*/

ControlKit.CKSubGroup.prototype.set = function(label,params)
{
    /*-------------------------------------------------------------------------------------*/

    params        = params || {};
    params.show   = params.show === undefined ? true : params.show;

    /*-------------------------------------------------------------------------------------*/

    if(label && label.length!=0 )
    {
        var headNode = this._headNode = new ControlKit.CKNode(ControlKit.CKNodeType.DIV),
            lablNode =                  new ControlKit.CKNode(ControlKit.CKNodeType.SPAN),
            indiNode = this._indiNode = new ControlKit.CKNode(ControlKit.CKNodeType.DIV);

        headNode.setStyleClass(ControlKit.CKCSS.Head);
        lablNode.setStyleClass(ControlKit.CKCSS.Label);
        indiNode.setStyleClass(ControlKit.CKCSS.ArrowBSubMax);

        lablNode.setProperty('innerHTML',label);

        headNode.addChild(lablNode);
        headNode.addChild(indiNode);

        headNode.setEventListener(ControlKit.CKNodeEventType.MOUSE_DOWN,this._onHeadMouseDown.bind(this));

        this.addEventListener(ControlKit.CKEventType.SUBGROUP_HIDDEN,this._parent,'onSubGroupHidden');
        this.addEventListener(ControlKit.CKEventType.SUBGROUP_SHOWN, this._parent,'onSubGroupShown');

        this._rootNode.addChildAt(headNode,0);

        if(!params.show)this.hide();
    }
};

/*-------------------------------------------------------------------------------------*/

ControlKit.CKSubGroup.prototype._onHeadMouseDown = function()
{
    this._hidden = !this._hidden;this._updateVisibility();
    this.dispatchEvent(new ControlKit.CKEvent(this,this._hidden ? ControlKit.CKEventType.SUBGROUP_HIDDEN : ControlKit.CKEventType.SUBGROUP_SHOWN));
};

ControlKit.CKSubGroup.prototype._updateVisibility = function()
{
    if(this._hidden)
    {
        this._wrapNode.setHeight(0);
        this._headNode.setStyleClass(ControlKit.CKCSS.HeadInactive);
        this._indiNode.setStyleClass(ControlKit.CKCSS.ArrowBSubMin);
    }
    else
    {
        this._wrapNode.setHeight(this._wrapNode.getFirstChild().getHeight());
        this._headNode.setStyleClass(ControlKit.CKCSS.Head);
        this._indiNode.setStyleClass(ControlKit.CKCSS.ArrowBSubMax);
    }
};

/*-------------------------------------------------------------------------------------*/

ControlKit.CKSubGroup.prototype.hasLabel         = function()    {return this._headNode != null;};
ControlKit.CKSubGroup.prototype.addComponentRoot = function(node){this._listNode.addChild(node);};

