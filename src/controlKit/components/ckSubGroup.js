
function CKSubGroup(parent,label,params)
{
    this._parent = parent;

    /*---------------------------------------------------------------------------------*/

    params = params || {};

    /*---------------------------------------------------------------------------------*/

    var rootNode = this._node = new CKNode(CKNodeType.LIST);

    if(label)
    {
        var headNode = rootNode.addChild(new CKNode(CKNodeType.DIV));

        headNode.setStyleClass(CKCSS.Head);

    }


    this._parent.getGroupList().addChild(rootNode);

}