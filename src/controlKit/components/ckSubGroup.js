
function CKSubGroup(parent,label,params)
{
    CKEventDispatcher.apply(this,arguments);

    this._parent = parent;

    /*---------------------------------------------------------------------------------*/

    var rootNode = this._rootNode = new CKNode(CKNodeType.LIST_ITEM),
        wrapNode = this._wrapNode = new CKNode(CKNodeType.DIV),
        listNode = this._listNode = new CKNode(CKNodeType.LIST);

    /*---------------------------------------------------------------------------------*/

    this._parent.getSubGroupList().addChild(rootNode);

    /*---------------------------------------------------------------------------------*/

    rootNode.setStyleClass(CKCSS.SubGroup);
    wrapNode.setStyleClass(CKCSS.Wrap);

    /*-------------------------------------------------------------------------------------*/

    this.set(label,params);

    /*-------------------------------------------------------------------------------------*/

    wrapNode.addChild(listNode);
    rootNode.addChild(wrapNode);

}

CKSubGroup.prototype = Object.create(CKEventDispatcher.prototype);

CKSubGroup.prototype.getList = function()
{
    return this._listNode;
};

CKSubGroup.prototype.set = function(label,params)
{
    /*-------------------------------------------------------------------------------------*/

    params        = params || {};

    /*-------------------------------------------------------------------------------------*/

    if(label && label.length!=0 )
    {
        var headNode = this._headNode = new CKNode(CKNodeType.DIV),
            lablNode = new CKNode(CKNodeType.SPAN);

            headNode.addChild(lablNode);
            this._rootNode.addChild(headNode);

    }

};

