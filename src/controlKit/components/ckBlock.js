

function CKBlock(parent, label, params)
{
    this._parent = parent;

    params = params || {};

    var rootNode = this._node = new CKNode(CKNode.Type.LIST_ITEM),
        headNode = new CKNode(CKNode.Type.DIV),
        lablNode = new CKNode(CKNode.Type.DIV),
        indiNode = this._indiNode = new CKNode(CKNode.Type.DIV),
        wrapNode = this._wrapNode = new CKNode(CKNode.Type.DIV),
        contNode = new CKNode(CKNode.Type.DIV),
        listNode = this._listNode = new CKNode(CKNode.Type.LIST);

    rootNode.setStyleClass(CKCSS.Block);
    headNode.setStyleClass(CKCSS.Head);
    lablNode.setStyleClass(CKCSS.Label);
    indiNode.setStyleClass(CKCSS.ArrowBMax);
    wrapNode.setStyleClass(CKCSS.Wrap);
    contNode.setStyleClass(CKCSS.Content);

    lablNode.setProperty('innerHTML',label);

    headNode.addChild(lablNode);
    headNode.addChild(indiNode);
    contNode.addChild(listNode);
    wrapNode.addChild(contNode);
    rootNode.addChild(headNode);
    rootNode.addChild(wrapNode);

    this._hidden = false;
    this._components = [];

    headNode.setListener(CKNode.Event.MOUSE_DOWN,this._onHeadMouseDown.bind(this));
}



CKBlock.prototype =
{
    _onHeadMouseDown  : function() { this._hidden = !this._hidden; this._updateVisibility();},

    _updateVisibility : function()
    {
        var hidden   = this._hidden,
            wrapNode = this._wrapNode;

        wrapNode.setHeight(hidden ? 0 : wrapNode.getFirstChild().getHeight());

        this._indiNode.setStyleClass(hidden ? CKCSS.ArrowBMin : CKCSS.ArrowBMax);
    },

    addSubBlock    : function(label,params){},

    addStringInput : function(object,value,label,params){return this._addComponent(new CKStringInput(this,object,value,label,params));},
    addNumberInput : function(object,value,label,params){return this._addComponent(new CKNumberInput(this,object,value,label,params));},
    addRange       : function(object,value,label,params){return this._addComponent(new CKRange(      this,object,value,label,params));},

    addCheckbox    : function(object,value,label,params){return this._addComponent(new CKCheckbox(   this,object,value,label,params));},
    addButton      : function(label,onPress)            {return this._addComponent(new CKButton(this,null,'',label,onPress));},

    _addComponent : function(component)
    {
        this._listNode.addChild(component.getNode());
        this._components.push(component);
        var wrapNode = this._wrapNode;
        wrapNode.setHeight(wrapNode.getFirstChild().getHeight());
        return this;
    },

    forceUpdate   : function(){this._parent.forceUpdate();},
    getComponents : function(){return this._components;},
    getNode       : function(){return this._node;}

};