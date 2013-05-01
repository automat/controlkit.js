

function CKGroup(parent,params)
{
    CKEventDispatcher.apply(this,arguments);

    this._parent = parent;

    /*-------------------------------------------------------------------------------------*/

    params           = params           || {};
    params.label     = params.label     || null;
    params.useLabels = params.useLabels || true;
    params.show      = params.show === undefined ? true : params.show;

    /*-------------------------------------------------------------------------------------*/

    var rootNode  = this._rootNode = new CKNode(CKNodeType.LIST_ITEM),
        wrapNode  = this._wrapNode = new CKNode(CKNodeType.DIV),
        listNode  = this._listNode = new CKNode(CKNodeType.LIST);

    /*-------------------------------------------------------------------------------------*/

    this._parent.getList().addChild(rootNode);

    /*-------------------------------------------------------------------------------------*/

    rootNode.setStyleClass(CKCSS.Group);
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

        headNode.setEventListener(CKNodeEventType.MOUSE_DOWN,this._onHeadMouseDown.bind(this));

        rootNode.addChild(headNode);

        if(!params.show)this.hide();
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

    /*-------------------------------------------------------------------------------------*/

    this._parent.addEventListener(CKEventType.PANEL_MOVE_BEGIN,this,'onPanelMoveBegin');
    this._parent.addEventListener(CKEventType.PANEL_MOVE,      this,'onPanelMove');
    this._parent.addEventListener(CKEventType.PANEL_MOVE_END,  this,'onPanelMoveEnd');

    /*-------------------------------------------------------------------------------------*/
    //add first subgroup
    //TODO: FIX

    this._subGroupsInit = false;
    this._subGroups.push(new CKSubGroup(this,'',null));

    /*-------------------------------------------------------------------------------------*/
}

CKGroup.prototype = Object.create(CKEventDispatcher.prototype);

/*-------------------------------------------------------------------------------------*/

CKGroup.prototype.onPanelMoveBegin = function(){var eventType = CKEventType.PANEL_MOVE_BEGIN;if(!this.hasEventListener(eventType))return;this.dispatchEvent(new CKEvent(this,eventType));};
CKGroup.prototype.onPanelMove      = function(){var eventType = CKEventType.PANEL_MOVE;      if(!this.hasEventListener(eventType))return;this.dispatchEvent(new CKEvent(this,eventType))};
CKGroup.prototype.onPanelMoveEnd   = function(){var eventType = CKEventType.PANEL_MOVE_END;  if(!this.hasEventListener(eventType))return;this.dispatchEvent(new CKEvent(this,eventType))};

/*-------------------------------------------------------------------------------------*/

CKGroup.prototype.onSubGroupShown  = function(){this._updateVisibility();};
CKGroup.prototype.onSubGroupHidden = function(){this._updateVisibility();};

/*-------------------------------------------------------------------------------------*/


CKGroup.prototype._onHeadMouseDown   = function(){this._hidden = !this._hidden;this._updateVisibility();};

/*-------------------------------------------------------------------------------------*/


CKGroup.prototype.addStringInput     = function(object,value,label,params)       {return this._addComponent(new CKStringInput(     this,object,value,label,params));};
CKGroup.prototype.addNumberInput     = function(object,value,label,params)       {return this._addComponent(new CKNumberInput(     this,object,value,label,params));};
CKGroup.prototype.addRange           = function(object,value,label,params)       {return this._addComponent(new CKRange(           this,object,value,label,params));};
CKGroup.prototype.addCheckbox        = function(object,value,label,params)       {return this._addComponent(new CKCheckbox(        this,object,value,label,params));};
CKGroup.prototype.addButton          = function(label,onPress)                   {return this._addComponent(new CKButton(          this,label,onPress));};
CKGroup.prototype.addSelect          = function(object,value,target,label,params){return this._addComponent(new CKSelect(          this,object,value,target,label,params));};
CKGroup.prototype.addSlider          = function(object,value,target,label,params){return this._addComponent(new CKSlider(          this,object,value,target,label,params));};


CKGroup.prototype.addFunctionPlotter = function(object,value,label,params)       {return this._addComponent(new CKFunctionPlotter( this,object,value,label,params));};
CKGroup.prototype.addPad             = function(object,value,label,params)       {return this._addComponent(new CKPad(             this,object,value,label,params));};
CKGroup.prototype.addValuePlotter    = function(object,value,label,params)       {return this._addComponent(new CKValuePlotter(    this,object,value,label,params));};
CKGroup.prototype.addNumberOutput    = function(object,value,label,params)       {return this._addComponent(new CKNumberOutput(    this,object,value,label,params));};
CKGroup.prototype.addStringOutput    = function(object,value,label,params)       {return this._addComponent(new CKStringOutput(    this,object,value,label,params));};

/*-------------------------------------------------------------------------------------*/

// Generate components from Object
CKGroup.prototype.addObject = function(obj){};

/*-------------------------------------------------------------------------------------*/

CKGroup.prototype._addComponent = function(component)
{
    this._components.push(component);
    this._updateHeight();
    return this;
};

/*-------------------------------------------------------------------------------------*/

CKGroup.prototype._updateHeight = function()
{
    var wrapNode = this._wrapNode;
    wrapNode.setHeight(wrapNode.getFirstChild().getHeight());
};

/*----------------------------------------------------------collapsed---------------------*/

CKGroup.prototype.hide = function() { this._hidden = true;  this._updateVisibility();};
CKGroup.prototype.show = function() { this._hidden = false; this._updateVisibility();};

CKGroup.prototype._updateVisibility = function()
{
    if(this._hidden)
    {
        this._wrapNode.setHeight(0);
        this._indiNode.setStyleClass(CKCSS.ArrowBMin);
    }
    else
    {
        this._wrapNode.setHeight(this._wrapNode.getFirstChild().getHeight());
        this._indiNode.setStyleClass(CKCSS.ArrowBMax);
    }
};

/*-------------------------------------------------------------------------------------*/

//TODO: FIX
CKGroup.prototype.addSubGroup        = function(label,params)
{

    if(!this._subGroupsInit)
    {
        this.getActiveSubGroup().set(label,params);
        this._subGroupsInit = true;
    }
    else this._subGroups.push(new CKSubGroup(this,label,params));

    this._updateHeight();
    return this;
};

/*-------------------------------------------------------------------------------------*/



CKGroup.prototype.getComponents = function(){return this._components;};
CKGroup.prototype.getNode       = function(){return this._rootNode;};

CKGroup.prototype.getList           = function(){return this._listNode;};
CKGroup.prototype.getActiveSubGroup = function(){return this._subGroups[this._subGroups.length-1];};

CKGroup.prototype.isHidden     = function(){return this._hidden;};


