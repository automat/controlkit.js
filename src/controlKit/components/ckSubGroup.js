
function CKSubGroup(parent,label,params)
{
    CKEventDispatcher.apply(this,arguments);

    this._parent = parent;

    /*---------------------------------------------------------------------------------*/

    params = params || {};
    params.label  = params.label || null;




    /*---------------------------------------------------------------------------------*/

    var rootNode = this._rootNode = new CKNode(CKNodeType.LIST);
        rootNode.setStyleClass(CKCSS.SubGroup);
    var listNode = this._listNode = new CKNode(CKNodeType.LIST);

    /*-------------------------------------------------------------------------------------*/

    if(params.label)
    {
        var headNode = new CKNode(CKNodeType.DIV),
            lablNode = new CKNode(CKNodeType.SPAN);

       // rootNode.addChild(headNode);

    }

    //var rootNode




    this._parent.getGroupList().addChild(rootNode);

}

CKSubGroup.prototype = Object.create(CKEventDispatcher.prototype);

CKSubGroup.prototype.getList = function()
{

};

