ControlKit.AbstractGroup = function(parent,params)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    this._parent = parent;

    /*---------------------------------------------------------------------------------*/

    var rootNode = this._rootNode = new ControlKit.Node(ControlKit.NodeType.LIST_ITEM),
        wrapNode = this._wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        listNode = this._listNode = new ControlKit.Node(ControlKit.NodeType.LIST);

    /*---------------------------------------------------------------------------------*/

    this._parent.getList().addChild(rootNode);

    /*---------------------------------------------------------------------------------z*/

    this._height = null;
    this._disabled  = false;

    /*---------------------------------------------------------------------------------*/
};

ControlKit.AbstractGroup.prototype = Object.create(ControlKit.EventDispatcher.prototype);

//Override in subclass
ControlKit.AbstractGroup.prototype.set = function(label,params){};

/*---------------------------------------------------------------------------------*/

ControlKit.AbstractGroup.prototype._onHeadDragStart  = function(){};
ControlKit.AbstractGroup.prototype._updateAppearance = function(){};

/*---------------------------------------------------------------------------------*/

ControlKit.AbstractGroup.prototype.disable         = function() {this._disabled = false; this._updateAppearance();};
ControlKit.AbstractGroup.prototype.enable         = function() {this._disabled = true;  this._updateAppearance();};
ControlKit.AbstractGroup.prototype.isDisabled   = function() {return this._disabled;};
ControlKit.AbstractGroup.prototype.isEnabled    = function() {return !this._disabled;};


ControlKit.AbstractGroup.prototype.getMaxHeight = function() {return this._height;};


/*---------------------------------------------------------------------------------*/

/*
ControlKit.AbstractGroup.prototype.onSelectDragStart = function(e){this.scrollTo(this._scrollV);};
ControlKit.AbstractGroup.prototype.onSelectDrag      = function(e){this.scrollTo(this._scrollV);};
ControlKit.AbstractGroup.prototype.onSelectDragEnd   = function(e){this.scrollTo(this._scrollV);};
*/

/*---------------------------------------------------------------------------------*/

ControlKit.AbstractGroup.prototype.onComponentAdded = function()
{
    if(!this._height)return;
    this._scrollbar._update();
};

/*---------------------------------------------------------------------------------*/

ControlKit.AbstractGroup.prototype.getList      = function(){return this._listNode;};
