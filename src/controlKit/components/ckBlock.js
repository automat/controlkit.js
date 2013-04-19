

function CKBlock(parent, label, params)
{
    this._parent = parent;

    params = params || {};

    var rootNode = this._node = new CKNode(CKNodeType.LIST_ITEM),
        headNode = new CKNode(CKNodeType.DIV),
        lablNode = new CKNode(CKNodeType.SPAN),
        indiNode = this._indiNode = new CKNode(CKNodeType.DIV),
        wrapNode = this._wrapNode = new CKNode(CKNodeType.DIV),
        contNode = new CKNode(CKNodeType.DIV),
        listNode = this._listNode = new CKNode(CKNodeType.LIST);

    this._parent.getList().addChild(rootNode);

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

    headNode.setEventListener(CKNodeEvent.MOUSE_DOWN,this._onHeadMouseDown.bind(this));
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

    addStringInput     : function(object,value,label,params)       {return this._addComponent(new CKStringInput(     this,object,value,label,params));},
    addNumberInput     : function(object,value,label,params)       {return this._addComponent(new CKNumberInput(     this,object,value,label,params));},
    addRange           : function(object,value,label,params)       {return this._addComponent(new CKRange(           this,object,value,label,params));},
    addCheckbox        : function(object,value,label,params)       {return this._addComponent(new CKCheckbox(        this,object,value,label,params));},
    addButton          : function(label,onPress)                   {return this._addComponent(new CKButton(          this,label,onPress));},
    addSelect          : function(object,value,target,label,params){return this._addComponent(new CKSelect(          this,object,value,target,label,params));},
    addSlider          : function(object,value,target,label,params){return this._addComponent(new CKSlider(          this,object,value,target,label,params));},


    addFunctionPlotter : function(object,value,label,params)       {return this._addComponent(new CKFunctionPlotter( this,object,value,label,params));},
    addPad             : function(object,value,label,params)       {return this._addComponent(new CKPad(             this,object,value,label,params));},
    addValuePlotter    : function(object,value,label,params)       {return this._addComponent(new CKValuePlotter(    this,object,value,label,params));},
    addOutput          : function(object,value,label,params)       {return this._addComponent(new CKStringOutput(          this,object,value,label,params));},

    addObject : function(obj){},

    _addComponent : function(component)
    {
        this._components.push(component);
        var wrapNode = this._wrapNode;
        wrapNode.setHeight(wrapNode.getFirstChild().getHeight());
        return this;
    },

    forceUpdate   : function(){this._parent.forceUpdate();},
    getComponents : function(){return this._components;},
    getNode       : function(){return this._node;},
    getList       : function(){return this._listNode;}

};