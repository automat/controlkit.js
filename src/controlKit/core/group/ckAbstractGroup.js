function CKAbstractGroup(parent,params)
{
    CKEventDispatcher.apply(this,arguments);

    this._parent = parent;

    /*---------------------------------------------------------------------------------*/

    var rootNode = this._rootNode = new CKNode(CKNodeType.LIST_ITEM),
        wrapNode = this._wrapNode = new CKNode(CKNodeType.DIV),
        listNode = this._listNode = new CKNode(CKNodeType.LIST);

    /*---------------------------------------------------------------------------------*/

    this._parent.getList().addChild(rootNode);

    /*---------------------------------------------------------------------------------*/

    this._hidden = false;

}

CKAbstractGroup.prototype = Object.create(CKEventDispatcher.prototype);

CKAbstractGroup.prototype._onHeadMouseDown  = function(){};
CKAbstractGroup.prototype._updateVisibility = function(){};

CKAbstractGroup.prototype.hide     = function() { this._hidden = true;  this._updateVisibility();};
CKAbstractGroup.prototype.show     = function() { this._hidden = false; this._updateVisibility();};
CKAbstractGroup.prototype.isHidden = function(){return this._hidden;};

CKAbstractGroup.prototype.getList      = function(){return this._listNode;};
