
function CKSubGroup(parent,label,params)
{
    CKAbstractGroup.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    this._rootNode.setStyleClass(CKCSS.SubGroup);
    this._wrapNode.setStyleClass(CKCSS.Wrap);

    this._wrapNode.addChild(this._listNode);
    this._rootNode.addChild(this._wrapNode);

    /*-------------------------------------------------------------------------------------*/

    this.set(label,params);

    /*-------------------------------------------------------------------------------------*/
}

CKSubGroup.prototype = Object.create(CKAbstractGroup.prototype);

/*-------------------------------------------------------------------------------------*/

CKSubGroup.prototype.set = function(label,params)
{
    /*-------------------------------------------------------------------------------------*/

    params        = params || {};
    params.show   = params.show === undefined ? true : params.show;

    /*-------------------------------------------------------------------------------------*/

    if(label && label.length!=0 )
    {
        var headNode = this._headNode = new CKNode(CKNodeType.DIV),
            lablNode =                  new CKNode(CKNodeType.SPAN),
            indiNode = this._indiNode = new CKNode(CKNodeType.DIV);

        headNode.setStyleClass(CKCSS.Head);
        lablNode.setStyleClass(CKCSS.Label);
        indiNode.setStyleClass(CKCSS.ArrowBSubMax);

        lablNode.setProperty('innerHTML',label);

        headNode.addChild(lablNode);
        headNode.addChild(indiNode);

        headNode.setEventListener(CKNodeEventType.MOUSE_DOWN,this._onHeadMouseDown.bind(this));

        this.addEventListener(CKEventType.SUBGROUP_HIDDEN,this._parent,'onSubGroupHidden');
        this.addEventListener(CKEventType.SUBGROUP_SHOWN, this._parent,'onSubGroupShown');

        this._rootNode.addChildAt(headNode,0);

        if(!params.show)this.hide();
    }
};

/*-------------------------------------------------------------------------------------*/

CKSubGroup.prototype._onHeadMouseDown = function()
{
    this._hidden = !this._hidden;this._updateVisibility();
    this.dispatchEvent(new CKEvent(this,this._hidden ? CKEventType.SUBGROUP_HIDDEN : CKEventType.SUBGROUP_SHOWN));
};

CKSubGroup.prototype._updateVisibility = function()
{
    if(this._hidden)
    {
        this._wrapNode.setHeight(0);
        this._headNode.setStyleClass(CKCSS.HeadInactive);
        this._indiNode.setStyleClass(CKCSS.ArrowBSubMin);
    }
    else
    {
        this._wrapNode.setHeight(this._wrapNode.getFirstChild().getHeight());
        this._headNode.setStyleClass(CKCSS.Head);
        this._indiNode.setStyleClass(CKCSS.ArrowBSubMax);
    }
};

/*-------------------------------------------------------------------------------------*/

CKSubGroup.prototype.hasLabel         = function()    {return this._headNode != null;};
CKSubGroup.prototype.addComponentRoot = function(node){this._listNode.addChild(node);};

