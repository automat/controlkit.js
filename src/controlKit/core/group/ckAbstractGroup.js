ControlKit.CKAbstractGroup = function(parent)
{
    ControlKit.CKEventDispatcher.apply(this,arguments);

    this._parent = parent;

    /*---------------------------------------------------------------------------------*/

    var rootNode = this._rootNode = new ControlKit.CKNode(ControlKit.CKNodeType.LIST_ITEM),
        wrapNode = this._wrapNode = new ControlKit.CKNode(ControlKit.CKNodeType.DIV),
        listNode = this._listNode = new ControlKit.CKNode(ControlKit.CKNodeType.LIST);

    /*---------------------------------------------------------------------------------*/

    this._parent.getList().addChild(rootNode);

    /*---------------------------------------------------------------------------------*/

    this._hidden = false;

}

ControlKit.CKAbstractGroup.prototype = Object.create(ControlKit.CKEventDispatcher.prototype);

ControlKit.CKAbstractGroup.prototype._onHeadMouseDown  = function(){};
ControlKit.CKAbstractGroup.prototype._updateVisibility = function(){};

ControlKit.CKAbstractGroup.prototype.hide     = function() { this._hidden = true;  this._updateVisibility();};
ControlKit.CKAbstractGroup.prototype.show     = function() { this._hidden = false; this._updateVisibility();};
ControlKit.CKAbstractGroup.prototype.isHidden = function(){return this._hidden;};

ControlKit.CKAbstractGroup.prototype.getList      = function(){return this._listNode;};
