ControlKit.AbstractGroup = function(parent,params)
{
    ControlKit.EventDispatcher.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params        = params        || {};
    params.height = params.height || null;

    /*---------------------------------------------------------------------------------*/

    this._parent    = parent;
    this._height    = params.height;
    this._disabled  = false;
    this._scrollBar = null;

    this._node = new ControlKit.Node(ControlKit.NodeType.LIST_ITEM);
    this._wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV);
    this._listNode = new ControlKit.Node(ControlKit.NodeType.LIST);

    this._parent.getList().addChild(this._node);

    ControlKit.getKitInstance().addEventListener(ControlKit.EventType.INPUT_SELECT_DRAG,
                                                 this,'onInputSelectDrag');
};

ControlKit.AbstractGroup.prototype = Object.create(ControlKit.EventDispatcher.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.AbstractGroup.prototype.addScrollWrap = function()
{
    var wrapNode  = this._wrapNode,
        maxHeight = this.getMaxHeight();

    this._scrollBar = new ControlKit.ScrollBar(wrapNode,this._listNode,maxHeight);
    if(this.isEnabled())wrapNode.setHeight(maxHeight);
};

//Prevent chrome select drag
ControlKit.AbstractGroup.prototype.onInputSelectDrag = function()
{
    if(!this.hasScrollWrap())return;
    this._wrapNode.getElement().scrollTop = 0;
};

ControlKit.AbstractGroup.prototype.hasMaxHeight  = function(){return this._height != null;};
ControlKit.AbstractGroup.prototype.getMaxHeight  = function(){return this._height;};
ControlKit.AbstractGroup.prototype.hasScrollWrap = function(){return this._scrollBar != null;};
ControlKit.AbstractGroup.prototype.hasLabel      = function(){return this._lablNode;};

ControlKit.AbstractGroup.prototype.disable      = function() {this._disabled = false; this._updateAppearance();};
ControlKit.AbstractGroup.prototype.enable       = function() {this._disabled = true;  this._updateAppearance();};
ControlKit.AbstractGroup.prototype.isDisabled   = function() {return this._disabled;};
ControlKit.AbstractGroup.prototype.isEnabled    = function() {return !this._disabled;};

ControlKit.AbstractGroup.prototype.getList      = function(){return this._listNode;};

