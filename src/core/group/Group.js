var AbstractGroup = require('./AbstractGroup');
var CSS = require('../document/CSS');
var Node = require('../document/Node');
var NodeType = require('../document/NodeType');
var NodeEventType = require('../document/NodeEventType');
var EventType = require('../event/EventType');
var DocumentEventType = require('../document/DocumentEventType');
var Event_ = require('../event/Event');


var StringInput = require('../../component/StringInput'),
    NumberInput = require('../../component/NumberInput'),
    Range = require('../../component/Range'),
    Checkbox = require('../../component/Checkbox'),
    Color = require('../../component/Color'),
    Button = require('../../component/Button'),
    Select = require('../../component/Select'),
    Slider = require('../../component/Slider'),
    FunctionPlotter = require('../../component/FunctionPlotter'),
    Pad = require('../../component/Pad'),
    ValuePlotter = require('../../component/ValuePlotter'),
    NumberOutput = require('../../component/NumberOutput'),
    StringOutput = require('../../component/StringOutput'),
    Canvas_ = require('../../component/Canvas'),
    SVG_ = require('../../component/SVG');

function Group(parent,params) {
    params           = params || {};
    params.label     = params.label     || null;
    params.useLabels = params.useLabels || true;
    params.enable    = params.enable     === undefined ? true : params.enable;

    AbstractGroup.apply(this,arguments);

    this._components = [];
    this._subGroups  = [];

    var rootNode = this._node,
        wrapNode = this._wrapNode,
        listNode = this._listNode;

        rootNode.setStyleClass(CSS.Group);
        wrapNode.setStyleClass(CSS.Wrap);
        listNode.setStyleClass(CSS.SubGroupList);

        wrapNode.addChild(listNode);

    var label = params.label;

    if(label){
        var headNode  = new Node(NodeType.DIV),
            lablWrap  = new Node(NodeType.DIV),
            lablNode  = new Node(NodeType.SPAN),
            indiNode  = this._indiNode = new Node(NodeType.DIV);

            headNode.setStyleClass(CSS.Head);
            lablWrap.setStyleClass(CSS.Wrap);
            lablNode.setStyleClass(CSS.Label);
            indiNode.setStyleClass(CSS.ArrowBMax);
            lablNode.setProperty('innerHTML',label);

            headNode.addChild(indiNode);
            lablWrap.addChild(lablNode);
            headNode.addChild(lablWrap);
            rootNode.addChild(headNode);

        headNode.addEventListener(NodeEventType.MOUSE_DOWN,this._onHeadTrigger.bind(this));
        this.addEventListener(EventType.GROUP_LIST_SIZE_CHANGE,this._parent,'onGroupListSizeChange');

        this._updateAppearance();
    }

    if(this.hasMaxHeight()){
        this.addScrollWrap();
    }

    rootNode.addChild(wrapNode);

    if(this.hasMaxHeight()){
        if(!label){
            var bufferTop = this._scrollBufferTop = new Node(NodeType.DIV);
                bufferTop.setStyleClass(CSS.ScrollBuffer);

            rootNode.addChildAt(bufferTop,0);
        }
        var bufferBottom = this._scrollBufferBottom = new Node(NodeType.DIV);
            bufferBottom.setStyleClass(CSS.ScrollBuffer);

        rootNode.addChild(bufferBottom);
    }

    this._parent.addEventListener(EventType.PANEL_MOVE_BEGIN,          this, 'onPanelMoveBegin');
    this._parent.addEventListener(EventType.PANEL_MOVE,                this, 'onPanelMove');
    this._parent.addEventListener(EventType.PANEL_MOVE_END,            this, 'onPanelMoveEnd');
    this._parent.addEventListener(EventType.PANEL_HIDE,                this, 'onPanelHide');
    this._parent.addEventListener(EventType.PANEL_SHOW,                this, 'onPanelShow');
    this._parent.addEventListener(EventType.PANEL_SCROLL_WRAP_ADDED,   this, 'onPanelScrollWrapAdded');
    this._parent.addEventListener(EventType.PANEL_SCROLL_WRAP_REMOVED, this, 'onPanelScrollWrapRemoved');
    this._parent.addEventListener(EventType.PANEL_SIZE_CHANGE,         this, 'onPanelSizeChange');
    this._parent.addEventListener(DocumentEventType.WINDOW_RESIZE,             this, 'onWindowResize');

    this.addEventListener(EventType.GROUP_SIZE_CHANGE,this._parent,'onGroupListSizeChange');
}

Group.prototype = Object.create(AbstractGroup.prototype);

Group.prototype.onPanelMoveBegin = function () {
    this.dispatchEvent(new Event_(this, EventType.PANEL_MOVE_BEGIN, null));
};

Group.prototype.onPanelMove = function () {
    this.dispatchEvent(new Event_(this, EventType.PANEL_MOVE, null));
};

Group.prototype.onPanelMoveEnd = function () {
    this.dispatchEvent(new Event_(this, EventType.PANEL_MOVE_END, null));
};

Group.prototype.onPanelScrollWrapAdded = function () {
    this.dispatchEvent(new Event_(this, EventType.GROUP_SIZE_CHANGE, null));
};

Group.prototype.onPanelScrollWrapRemoved = function () {
    this.dispatchEvent(new Event_(this, EventType.GROUP_SIZE_CHANGE, null));
};

Group.prototype.onPanelHide = function () {
    this.dispatchEvent(new Event_(this, EventType.SUBGROUP_DISABLE, null));
};

Group.prototype.onPanelShow = function () {
    this.dispatchEvent(new Event_(this, EventType.SUBGROUP_ENABLE, null));
};

Group.prototype.onPanelSizeChange = function () {
    this.dispatchEvent(new Event_(this, EventType.GROUP_SIZE_CHANGE, null));
};

Group.prototype.onWindowResize = function (e) {
    this.dispatchEvent(e);
};

Group.prototype.onSubGroupTrigger = function () {
    this._updateHeight();

    if(!this.hasMaxHeight())return;

    var scrollBar = this._scrollBar,
        wrapNode  = this._wrapNode;

    var bufferTop    = this._scrollBufferTop,
        bufferBottom = this._scrollBufferBottom;

    scrollBar.update();

    if (!scrollBar.isValid()) {
        scrollBar.disable();
        wrapNode.setHeight(wrapNode.getChildAt(1).getHeight());

        if (bufferTop){
            bufferTop.setStyleProperty('display', 'none');
        }
        if (bufferBottom){
            bufferBottom.setStyleProperty('display', 'none');
        }
    }
    else {
        scrollBar.enable();
        wrapNode.setHeight(this.getMaxHeight());

        if (bufferTop){
            bufferTop.setStyleProperty('display', 'block');
        }
        if (bufferBottom){
            bufferBottom.setStyleProperty('display', 'block');
        }
    }

    this.dispatchEvent(new Event_(this,EventType.GROUP_SIZE_CHANGE,null));
};

Group.prototype._onHeadTrigger = function () {
    this._isDisabled = !this._isDisabled;
    this._updateAppearance();
    this.dispatchEvent(new Event_(this, EventType.GROUP_LIST_SIZE_CHANGE, null));
};

Group.prototype.addStringInput = function (object, value, params) {
    return this._addComponent(new StringInput(this.getSubGroup(), object, value, params));
};

Group.prototype.addNumberInput = function (object, value, params) {
    return this._addComponent(new NumberInput(this.getSubGroup(), object, value, params));
};

Group.prototype.addRange = function (object, value, params) {
    return this._addComponent(new Range(this.getSubGroup(), object, value, params));
};

Group.prototype.addCheckbox = function (object, value, params) {
    return this._addComponent(new Checkbox(this.getSubGroup(), object, value, params));
};

Group.prototype.addColor = function (object, value, params) {
    return this._addComponent(new Color(this.getSubGroup(), object, value, params));
};

Group.prototype.addButton = function (label, onPress, params) {
    return this._addComponent(new Button(this.getSubGroup(), label, onPress, params));
};

Group.prototype.addSelect = function (object, value, params) {
    return this._addComponent(new Select(this.getSubGroup(), object, value, params));
};

Group.prototype.addSlider = function (object, value, range, params) {
    return this._addComponent(new Slider(this.getSubGroup(), object, value, range, params));
};

Group.prototype.addFunctionPlotter = function (object, value, params) {
    return this._addComponent(new FunctionPlotter(this.getSubGroup(), object, value, params));
};

Group.prototype.addPad = function (object, value, params) {
    return this._addComponent(new Pad(this.getSubGroup(), object, value, params));
};

Group.prototype.addValuePlotter = function (object, value, params) {
    return this._addComponent(new ValuePlotter(this.getSubGroup(), object, value, params));
};

Group.prototype.addNumberOutput = function (object, value, params) {
    return this._addComponent(new NumberOutput(this.getSubGroup(), object, value, params));
};

Group.prototype.addStringOutput = function (object, value, params) {
    return this._addComponent(new StringOutput(this.getSubGroup(), object, value, params));
};

Group.prototype.addCanvas = function (params) {
    return this._addComponent(new Canvas_(this.getSubGroup(), params));
};
Group.prototype.addSVG = function (params) {
    return this._addComponent(new SVG_(this.getSubGroup(), params));
};

//TODO: Move to subroup
Group.prototype._addComponent = function(component) {
    this._components.push(component);
    this._updateHeight();
    return this;
};

Group.prototype._updateHeight = function () {
    this.getSubGroup().update();
    this.dispatchEvent(new Event_(this,EventType.GROUP_SIZE_CHANGE,null));
    if(this.hasMaxHeight())this._scrollBar.update();
};

/*----------------------------------------------------------collapsed---------------------*/

Group.prototype._updateAppearance = function () {
    var wrapNode = this._wrapNode,
        inidNode = this._indiNode;

    var scrollBar = this._scrollBar;

    var bufferTop    = this._scrollBufferTop,
        bufferBottom = this._scrollBufferBottom;

    if (this.isDisabled()) {
        wrapNode.setHeight(0);
        if (inidNode){
            inidNode.setStyleClass(CSS.ArrowBMin);
        }

        if (scrollBar) {
            if (bufferTop){
                bufferTop.setStyleProperty('display', 'none');
            }
            if (bufferBottom){
                bufferBottom.setStyleProperty('display', 'none');
            }
        }
        return;
    }

    if (this.hasMaxHeight()) {
        var maxHeight = this.getMaxHeight(),
            listHeight = wrapNode.getChildAt(1).getHeight();

        wrapNode.setHeight(listHeight < maxHeight ? listHeight : maxHeight);

        if (scrollBar.isValid()) {
            if (bufferTop){
                bufferTop.setStyleProperty('display', 'block');
            }
            if (bufferBottom){
                bufferBottom.setStyleProperty('display', 'block');
            }
        }
    }
    else {
        wrapNode.deleteStyleProperty('height');
    }

    if (inidNode){
        inidNode.setStyleClass(CSS.ArrowBMax);
    }
};

Group.prototype.onGroupSizeUpdate = function () {
    this._updateAppearance();
    if (this.hasMaxHeight()){
        this._scrollBar.update();
    }
};

Group.prototype.addSubGroup = function (params) {
    this._subGroups.push(new ControlKit.SubGroup(this, params));
    this._updateHeight();
    return this;
};

Group.prototype.getSubGroup = function () {
    var subGroups = this._subGroups,
        subGroupsLen = subGroups.length;

    if (subGroupsLen == 0){
        this.addSubGroup(null);
    }
    return subGroups[subGroupsLen - 1];
};

Group.prototype.getComponents = function () {
    return this._components;
};

module.exports = Group;

//ControlKit.Group = function(parent,params)
//{
//    ControlKit.AbstractGroup.apply(this,arguments);
//
//    /*-------------------------------------------------------------------------------------*/
//
//    params           = params || {};
//    params.label     = params.label     || null;
//    params.useLabels = params.useLabels || true;
//    params.enable    = params.enable     === undefined ? true : params.enable;
//
//    /*-------------------------------------------------------------------------------------*/
//
//    this._components = [];
//    this._subGroups  = [];
//
//    /*-------------------------------------------------------------------------------------*/
//
//    var rootNode = this._node,
//        wrapNode = this._wrapNode,
//        listNode = this._listNode;
//
//        rootNode.setStyleClass(ControlKit.CSS.Group);
//        wrapNode.setStyleClass(ControlKit.CSS.Wrap);
//        listNode.setStyleClass(ControlKit.CSS.SubGroupList);
//
//        wrapNode.addChild(listNode);
//
//    /*-------------------------------------------------------------------------------------*/
//
//    var label = params.label;
//
//    if(label)
//    {
//        var headNode  = new ControlKit.Node(ControlKit.NodeType.DIV),
//            lablWrap  = new ControlKit.Node(ControlKit.NodeType.DIV),
//            lablNode  = new ControlKit.Node(ControlKit.NodeType.SPAN),
//            indiNode  = this._indiNode = new ControlKit.Node(ControlKit.NodeType.DIV);
//
//            headNode.setStyleClass(ControlKit.CSS.Head);
//            lablWrap.setStyleClass(ControlKit.CSS.Wrap);
//            lablNode.setStyleClass(ControlKit.CSS.Label);
//            indiNode.setStyleClass(ControlKit.CSS.ArrowBMax);
//            lablNode.setProperty('innerHTML',label);
//
//            headNode.addChild(indiNode);
//            lablWrap.addChild(lablNode);
//            headNode.addChild(lablWrap);
//            rootNode.addChild(headNode);
//
//        headNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onHeadTrigger.bind(this));
//        this.addEventListener(ControlKit.EventType.GROUP_LIST_SIZE_CHANGE,this._parent,'onGroupListSizeChange');
//
//        this._updateAppearance();
//    }
//
//    if(this.hasMaxHeight())this.addScrollWrap();
//
//    rootNode.addChild(wrapNode);
//
//    if(this.hasMaxHeight())
//    {
//        if(!label)
//        {
//            var bufferTop = this._scrollBufferTop = new ControlKit.Node(ControlKit.NodeType.DIV);
//                bufferTop.setStyleClass(ControlKit.CSS.ScrollBuffer);
//
//            rootNode.addChildAt(bufferTop,0);
//        }
//
//        var bufferBottom = this._scrollBufferBottom = new ControlKit.Node(ControlKit.NodeType.DIV);
//            bufferBottom.setStyleClass(ControlKit.CSS.ScrollBuffer);
//
//        rootNode.addChild(bufferBottom);
//    }
//
//    /*-------------------------------------------------------------------------------------*/
//
//    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE_BEGIN,          this, 'onPanelMoveBegin');
//    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE,                this, 'onPanelMove');
//    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE_END,            this, 'onPanelMoveEnd');
//    this._parent.addEventListener(ControlKit.EventType.PANEL_HIDE,                this, 'onPanelHide');
//    this._parent.addEventListener(ControlKit.EventType.PANEL_SHOW,                this, 'onPanelShow');
//    this._parent.addEventListener(ControlKit.EventType.PANEL_SCROLL_WRAP_ADDED,   this, 'onPanelScrollWrapAdded');
//    this._parent.addEventListener(ControlKit.EventType.PANEL_SCROLL_WRAP_REMOVED, this, 'onPanelScrollWrapRemoved');
//    this._parent.addEventListener(ControlKit.EventType.PANEL_SIZE_CHANGE,         this, 'onPanelSizeChange');
//    this._parent.addEventListener(ControlKit.EventType.WINDOW_RESIZE,             this, 'onWindowResize');
//
//    /*-------------------------------------------------------------------------------------*/
//
//    this.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE,this._parent,'onGroupListSizeChange');
//};
//
//ControlKit.Group.prototype = Object.create(ControlKit.AbstractGroup.prototype);
//
///*-------------------------------------------------------------------------------------*/
//
//ControlKit.Group.prototype.onPanelMoveBegin         = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_BEGIN,  null));};
//ControlKit.Group.prototype.onPanelMove              = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE,        null));};
//ControlKit.Group.prototype.onPanelMoveEnd           = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_END,    null));};
//ControlKit.Group.prototype.onPanelScrollWrapAdded   = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_CHANGE, null));};
//ControlKit.Group.prototype.onPanelScrollWrapRemoved = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_CHANGE, null));};
//ControlKit.Group.prototype.onPanelHide              = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SUBGROUP_DISABLE,  null));};
//ControlKit.Group.prototype.onPanelShow              = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SUBGROUP_ENABLE,   null));};
//ControlKit.Group.prototype.onPanelSizeChange        = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_CHANGE, null));};
//ControlKit.Group.prototype.onWindowResize           = function(e){this.dispatchEvent(e);};
//
//
///*-------------------------------------------------------------------------------------*/
//
//ControlKit.Group.prototype.onSubGroupTrigger = function()
//{
//    this._updateHeight();
//
//    if(!this.hasMaxHeight())return;
//
//    var scrollBar = this._scrollBar,
//        wrapNode  = this._wrapNode;
//
//    var bufferTop    = this._scrollBufferTop,
//        bufferBottom = this._scrollBufferBottom;
//
//    scrollBar.update();
//
//    if(!scrollBar.isValid())
//    {
//        scrollBar.disable();
//        wrapNode.setHeight(wrapNode.getChildAt(1).getHeight());
//
//        if(bufferTop   )bufferTop.setStyleProperty(   'display','none');
//        if(bufferBottom)bufferBottom.setStyleProperty('display','none');
//    }
//    else
//    {
//        scrollBar.enable();
//        wrapNode.setHeight(this.getMaxHeight());
//
//        if(bufferTop   )bufferTop.setStyleProperty(   'display','block');
//        if(bufferBottom)bufferBottom.setStyleProperty('display','block');
//    }
//
//    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_CHANGE,null));
//};
//
///*-------------------------------------------------------------------------------------*/
//
//ControlKit.Group.prototype._onHeadTrigger = function()
//{
//    this._isDisabled = !this._isDisabled;
//    this._updateAppearance();
//    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_LIST_SIZE_CHANGE,null));
//};
//
///*-------------------------------------------------------------------------------------*/
//
//ControlKit.Group.prototype.addStringInput     = function(object,value,params)       {return this._addComponent(new ControlKit.StringInput(     this.getSubGroup(),object,value,params));};
//ControlKit.Group.prototype.addNumberInput     = function(object,value,params)       {return this._addComponent(new ControlKit.NumberInput(     this.getSubGroup(),object,value,params));};
//ControlKit.Group.prototype.addRange           = function(object,value,params)       {return this._addComponent(new ControlKit.Range(           this.getSubGroup(),object,value,params));};
//ControlKit.Group.prototype.addCheckbox        = function(object,value,params)       {return this._addComponent(new ControlKit.Checkbox(        this.getSubGroup(),object,value,params));};
//ControlKit.Group.prototype.addColor           = function(object,value,params)       {return this._addComponent(new ControlKit.Color(           this.getSubGroup(),object,value,params));};
//ControlKit.Group.prototype.addButton          = function(label,onPress,params)      {return this._addComponent(new ControlKit.Button(          this.getSubGroup(),label,onPress,params));};
//ControlKit.Group.prototype.addSelect          = function(object,value,params)       {return this._addComponent(new ControlKit.Select(          this.getSubGroup(),object,value,params));};
//ControlKit.Group.prototype.addSlider          = function(object,value,range,params) {return this._addComponent(new ControlKit.Slider(          this.getSubGroup(),object,value,range,params));};
//
//ControlKit.Group.prototype.addFunctionPlotter = function(object,value,params)       {return this._addComponent(new ControlKit.FunctionPlotter( this.getSubGroup(),object,value,params));};
//ControlKit.Group.prototype.addPad             = function(object,value,params)       {return this._addComponent(new ControlKit.Pad(             this.getSubGroup(),object,value,params));};
//ControlKit.Group.prototype.addValuePlotter    = function(object,value,params)       {return this._addComponent(new ControlKit.ValuePlotter(    this.getSubGroup(),object,value,params));};
//ControlKit.Group.prototype.addNumberOutput    = function(object,value,params)       {return this._addComponent(new ControlKit.NumberOutput(    this.getSubGroup(),object,value,params));};
//ControlKit.Group.prototype.addStringOutput    = function(object,value,params)       {return this._addComponent(new ControlKit.StringOutput(    this.getSubGroup(),object,value,params));};
//
//ControlKit.Group.prototype.addCanvas          = function(params)                    {return this._addComponent(new ControlKit.Canvas(          this.getSubGroup(),params));};
//ControlKit.Group.prototype.addSVG             = function(params)                    {return this._addComponent(new ControlKit.SVG(             this.getSubGroup(),params));};
//
///*-------------------------------------------------------------------------------------*/
//
////TODO: Move to subroup
//ControlKit.Group.prototype._addComponent = function(component)
//{
//    this._components.push(component);
//    this._updateHeight();
//    return this;
//};
//
///*-------------------------------------------------------------------------------------*/
//
//ControlKit.Group.prototype._updateHeight = function()
//{
//    this.getSubGroup().update();
//    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_CHANGE,null));
//    if(this.hasMaxHeight())this._scrollBar.update();
//};
//
///*----------------------------------------------------------collapsed---------------------*/
//
//ControlKit.Group.prototype._updateAppearance = function()
//{
//    var wrapNode = this._wrapNode,
//        inidNode = this._indiNode;
//
//    var scrollBar = this._scrollBar;
//
//    var bufferTop    = this._scrollBufferTop,
//        bufferBottom = this._scrollBufferBottom;
//
//    if(this.isDisabled())
//    {
//        wrapNode.setHeight(0);
//        if(inidNode)inidNode.setStyleClass(ControlKit.CSS.ArrowBMin);
//
//        if(scrollBar)
//        {
//            if(bufferTop   )bufferTop.setStyleProperty(   'display','none');
//            if(bufferBottom)bufferBottom.setStyleProperty('display','none');
//        }
//
//        return;
//    }
//
//    if (this.hasMaxHeight())
//    {
//        var maxHeight  = this.getMaxHeight(),
//            listHeight = wrapNode.getChildAt(1).getHeight();
//
//        wrapNode.setHeight(listHeight < maxHeight ? listHeight : maxHeight);
//
//        if (scrollBar.isValid())
//        {
//            if (bufferTop)bufferTop.setStyleProperty('display', 'block');
//            if (bufferBottom)bufferBottom.setStyleProperty('display', 'block');
//        }
//    }
//    else
//    {
//        wrapNode.deleteStyleProperty('height');
//    }
//
//    if (inidNode)inidNode.setStyleClass(ControlKit.CSS.ArrowBMax);
//};
//
//ControlKit.Group.prototype.onGroupSizeUpdate = function()
//{
//    this._updateAppearance();
//    if(this.hasMaxHeight())this._scrollBar.update();
//};
//
///*-------------------------------------------------------------------------------------*/
//
//ControlKit.Group.prototype.addSubGroup  = function(params)
//{
//    this._subGroups.push(new ControlKit.SubGroup(this,params));
//    this._updateHeight();
//    return this;
//};
//
///*-------------------------------------------------------------------------------------*/
//
//ControlKit.Group.prototype.getSubGroup   = function()
//{
//    var subGroups    = this._subGroups,
//        subGroupsLen = subGroups.length;
//
//    if(subGroupsLen==0)this.addSubGroup(null);
//    return subGroups[subGroupsLen-1];
//};
//ControlKit.Group.prototype.getComponents = function(){return this._components;};
