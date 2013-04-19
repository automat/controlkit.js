
function CKSubGroup(parent,label,params)
{
    this._parent = parent;

    /*---------------------------------------------------------------------------------*/

    params = params || {};

    /*---------------------------------------------------------------------------------*/

    var rootNode = this._node = new CKNode(CKNodeType.LIST),
        headNode = new CKNode(CKNodeType.DIV),
        lablNode = new CKNode(CKNodeType.SPAN);


    this._parent.getGroupList().addChild(rootNode);

}