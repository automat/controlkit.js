

function CKGroup(parent,params)
{
    this._parent = parent;

    /*-------------------------------------------------------------------------------------*/

    params        = params || {};
    params.label  = params.label || null;

    /*-------------------------------------------------------------------------------------*/

    var rootNode  = this._rootNode = new CKNode(CKNodeType.LIST_ITEM),
        wrapNode  = this._wrapNode = new CKNode(CKNodeType.DIV),
        listNode  = this._listNode = new CKNode(CKNodeType.LIST);

    /*-------------------------------------------------------------------------------------*/

    this._parent.getList().addChild(rootNode);

    /*-------------------------------------------------------------------------------------*/

    rootNode.setStyleClass(CKCSS.GroupList);
    wrapNode.setStyleClass(CKCSS.Wrap);
    listNode.setStyleClass(CKCSS.SubGroupList);

    /*-------------------------------------------------------------------------------------*/

    //Head

    if(params.label)
    {
        var headNode  = new CKNode(CKNodeType.DIV),
            lablNode  = new CKNode(CKNodeType.SPAN),
            indiNode  = this._indiNode = new CKNode(CKNodeType.DIV);

        headNode.setStyleClass(CKCSS.Head);
        lablNode.setStyleClass(CKCSS.Label);
        indiNode.setStyleClass(CKCSS.ArrowBMax);
        lablNode.setProperty('innerHTML',params.label);

        headNode.addChild(lablNode);
        headNode.addChild(indiNode);

        headNode.setEventListener(CKNodeEvent.MOUSE_DOWN,function()
                                                         {
                                                             this._hidden = !this._hidden;
                                                             this._updateVisibility();
                                                             this._indiNode.setStyleClass(this._hidden ? CKCSS.ArrowBMin : CKCSS.ArrowBMax);

                                                         }.bind(this));

        rootNode.addChild(headNode);
    }
    else
    {
        //TODO: Add CSS Class
        wrapNode.getStyle().borderTop = "1px solid #3b4447";
    }

    /*-------------------------------------------------------------------------------------*/

    wrapNode.addChild(listNode);
    rootNode.addChild(wrapNode);

    /*-------------------------------------_collapsed-----------------------------------------*/

    this._hidden = false;
    this._components = [];
    this._subGroups  = [];
}



CKGroup.prototype =
{
    /*-------------------------------------------------------------------------------------*/

    addSubGroup        : function(label,params)                    {this._subGroups.push(new CKSubGroup(this,label,params));
                                                                    this._updateHeight();
                                                                    return this;},

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
    addNumberOutput    : function(object,value,label,params)       {return this._addComponent(new CKNumberOutput(    this,object,value,label,params));},
    addStringOutput    : function(object,value,label,params)       {return this._addComponent(new CKStringOutput(    this,object,value,label,params));},

    addObject : function(obj){},

    /*-------------------------------------------------------------------------------------*/

    _addComponent : function(component)
    {
        this._components.push(component);
        this._updateHeight();
        return this;
    },

    /*-------------------------------------------------------------------------------------*/

    _updateHeight : function()
    {
        var wrapNode = this._wrapNode;
        wrapNode.setHeight(wrapNode.getFirstChild().getHeight());
    },

    forceUpdate   : function(){this._parent.forceUpdate();},

    /*----------------------------------------------------------collapsed---------------------*/

    hide : function() { this._hidden = true;  this._updateVisibility();},
    show : function() { this._hidden = false; this._updateVisibility();},

    _updateVisibility : function()
    {
        var hidden   = this._hidden,
            wrapNode = this._wrapNode;

        wrapNode.setHeight(hidden ? 0 : wrapNode.getFirstChild().getHeight());
    },

    /*-------------------------------------------------------------------------------------*/


    getComponents : function(){return this._components;},
    getNode       : function(){return this._rootNode;},

    getGroupList  : function(){return this._listNode;},

    getList       : function(){
        //if first element islisbgroup
        var listNode = this._listNode;
        if(!listNode.hasChildren())listNode.addChild(new CKNode(CKNodeType.LIST));

        return listNode.getLastChild();
    },

    isHidden     :function(){return this._hidden;}


};