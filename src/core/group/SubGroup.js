var AbstractGroup = require('./AbstractGroup');
var Node = require('../document/Node');
var CSS = require('../document/CSS');
var NodeType = require('../document/NodeType');
var EventType = require('../event/EventType');
var Event_ = require('../event/Event');
var NodeEventType = require('../event/EventType');
var DocumentEventType = require('../document/DocumentEventType');

function SubGroup(parent,params){
    params            = params          || {};
    params.label      = params.label    || null;
    params.useLabels  = params.useLabels  === undefined ? true : params.useLabels;

    AbstractGroup.apply(this,arguments);

    var rootNode = this._node,
        wrapNode = this._wrapNode,
        listNode = this._listNode;

        rootNode.setStyleClass(CSS.SubGroup);
        wrapNode.setStyleClass(CSS.Wrap);

        wrapNode.addChild(listNode);
        rootNode.addChild(wrapNode);

    this._useLabels  = params.useLabels;

    var label = params.label;

    if (label && label.length != 0 && label != 'none') {
        var headNode = this._headNode = new Node(NodeType.DIV),
            lablWrap = new Node(NodeType.DIV),
            lablNode = new Node(NodeType.SPAN);

        headNode.setStyleClass(CSS.Head);
        lablWrap.setStyleClass(CSS.Wrap);
        lablNode.setStyleClass(CSS.Label);

        lablNode.setProperty('innerHTML', label);

        lablWrap.addChild(lablNode);
        headNode.addChild(lablWrap);


        var indiNode = this._indiNode = new Node(NodeType.DIV);
        indiNode.setStyleClass(CSS.ArrowBSubMax);
        headNode.addChildAt(indiNode, 0);

        rootNode.addChildAt(headNode, 0);

        this.addEventListener(EventType.SUBGROUP_TRIGGER, this._parent, 'onSubGroupTrigger');
        headNode.addEventListener(DocumentEventType.MOUSE_DOWN, this._onHeadMouseDown.bind(this));

        this._updateAppearance();

    }

    if(this.hasMaxHeight()){
        this.addScrollWrap();
    }

    this._parent.addEventListener(EventType.SUBGROUP_ENABLE,  this, 'onEnable');
    this._parent.addEventListener(EventType.SUBGROUP_DISABLE, this, 'onDisable');
    this._parent.addEventListener(EventType.PANEL_MOVE_END,   this, 'onPanelMoveEnd');
    this._parent.addEventListener(EventType.GROUP_SIZE_CHANGE,this, 'onGroupSizeChange');
    this._parent.addEventListener(EventType.PANEL_SIZE_CHANGE,this, 'onPanelSizeChange');
    this._parent.addEventListener(DocumentEventType.WINDOW_RESIZE,    this, 'onWindowResize');

    this.addEventListener(EventType.GROUP_SIZE_UPDATE,this._parent,'onGroupSizeUpdate');
}

SubGroup.prototype = Object.create(AbstractGroup.prototype);

//FIXME
SubGroup.prototype._onHeadMouseDown = function () {
    this._isDisabled = !this._isDisabled;
    this._onTrigger();

    var event = DocumentEventType.MOUSE_UP,
        self  = this;
    var onDocumentMouseUp = function () {
        self._onTrigger();
        document.removeEventListener(event, onDocumentMouseUp);
    };

    document.addEventListener(event,onDocumentMouseUp);
};

SubGroup.prototype._onTrigger = function() {
    this._updateAppearance();
    this.dispatchEvent(new Event_(this,EventType.SUBGROUP_TRIGGER,null));
};


SubGroup.prototype._updateAppearance = function () {
    if (this.isDisabled()) {
        this._wrapNode.setHeight(0);
        if (this.hasLabel()) {
            this._headNode.setStyleClass(CSS.HeadInactive);
            this._indiNode.setStyleClass(CSS.ArrowBSubMin);
        }
    }
    else {
        if (this.hasMaxHeight()) {
            this._wrapNode.setHeight(this.getMaxHeight());
        } else {
            this._wrapNode.deleteStyleProperty('height');
        }
        if (this.hasLabel()) {
            this._headNode.setStyleClass(CSS.Head);
            this._indiNode.setStyleClass(CSS.ArrowBSubMax);
        }
    }
};

SubGroup.prototype.update = function () {
    if (this.hasMaxHeight()){
        this._scrollBar.update();
    }
};

SubGroup.prototype.onComponentSelectDrag = function () {
    this.preventSelectDrag();
};

SubGroup.prototype.onEnable = function () {
    if (this.isDisabled()){
        return;
    }
    this.dispatchEvent(new Event_(this, EventType.COMPONENTS_ENABLE, null));
};
SubGroup.prototype.onDisable = function () {
    if (this.isDisabled()){
        return;
    }
    this.dispatchEvent(new Event_(this, EventType.COMPONENTS_DISABLE, null));
};

//bubble
SubGroup.prototype.onGroupSizeChange = function () {
    this.dispatchEvent(new Event_(this, EventType.GROUP_SIZE_CHANGE, null));
};
SubGroup.prototype.onGroupSizeUpdate = function () {
    this.dispatchEvent(new Event_(this, EventType.GROUP_SIZE_UPDATE, null));
};
SubGroup.prototype.onPanelMoveEnd = function () {
    this.dispatchEvent(new Event_(this, EventType.PANEL_MOVE_END, null));
};
SubGroup.prototype.onPanelSizeChange = function () {
    this._updateAppearance();
};
SubGroup.prototype.onWindowResize = function (e) {
    this.dispatchEvent(e);
};

SubGroup.prototype.hasLabel = function () {
    return this._headNode != null;
};
SubGroup.prototype.addComponentNode = function (node) {
    this._listNode.addChild(node);
};
SubGroup.prototype.usesLabels = function () {
    return this._useLabels;
};


module.exports = SubGroup;




//ControlKit.SubGroup = function(parent,params)
//{
//    ControlKit.AbstractGroup.apply(this,arguments);
//
//    /*---------------------------------------------------------------------------------*/
//
//    params            = params          || {};
//    params.label      = params.label    || null;
//    params.useLabels  = params.useLabels  === undefined ? true : params.useLabels;
//
//    /*---------------------------------------------------------------------------------*/
//
//    var rootNode = this._node,
//        wrapNode = this._wrapNode,
//        listNode = this._listNode;
//
//        rootNode.setStyleClass(ControlKit.CSS.SubGroup);
//        wrapNode.setStyleClass(ControlKit.CSS.Wrap);
//
//        wrapNode.addChild(listNode);
//        rootNode.addChild(wrapNode);
//
//    this._useLabels  = params.useLabels;
//
//    /*-------------------------------------------------------------------------------------*/
//
//    var label = params.label;
//
//    if(label)
//    {
//        if(label.length != 0 && label != 'none')
//        {
//            var headNode = this._headNode = new ControlKit.Node(ControlKit.NodeType.DIV),
//                lablWrap =                  new ControlKit.Node(ControlKit.NodeType.DIV),
//                lablNode =                  new ControlKit.Node(ControlKit.NodeType.SPAN);
//
//                headNode.setStyleClass(ControlKit.CSS.Head);
//                lablWrap.setStyleClass(ControlKit.CSS.Wrap);
//                lablNode.setStyleClass(ControlKit.CSS.Label);
//
//                lablNode.setProperty('innerHTML',label);
//
//                lablWrap.addChild(lablNode);
//                headNode.addChild(lablWrap);
//
//
//            var indiNode = this._indiNode = new ControlKit.Node(ControlKit.NodeType.DIV);
//            indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMax);
//            headNode.addChildAt(indiNode,0);
//
//            rootNode.addChildAt(headNode,0);
//
//            this.addEventListener(ControlKit.EventType.SUBGROUP_TRIGGER,this._parent,'onSubGroupTrigger');
//            headNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onHeadMouseDown.bind(this));
//
//            this._updateAppearance();
//        }
//    }
//
//    if(this.hasMaxHeight())this.addScrollWrap();
//
//    /*-------------------------------------------------------------------------------------*/
//
//    this._parent.addEventListener(ControlKit.EventType.SUBGROUP_ENABLE,  this, 'onEnable');
//    this._parent.addEventListener(ControlKit.EventType.SUBGROUP_DISABLE, this, 'onDisable');
//    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE_END,   this, 'onPanelMoveEnd');
//    this._parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE,this, 'onGroupSizeChange');
//    this._parent.addEventListener(ControlKit.EventType.PANEL_SIZE_CHANGE,this, 'onPanelSizeChange');
//    this._parent.addEventListener(ControlKit.EventType.WINDOW_RESIZE,    this, 'onWindowResize');
//
//    this.addEventListener(ControlKit.EventType.GROUP_SIZE_UPDATE,this._parent,'onGroupSizeUpdate');
//
//
//};
//
//ControlKit.SubGroup.prototype = Object.create(ControlKit.AbstractGroup.prototype);
//
///*-------------------------------------------------------------------------------------*/
//
////FIXME
//
//ControlKit.SubGroup.prototype._onHeadMouseDown = function()
//{
//    this._isDisabled = !this._isDisabled;this._onTrigger();
//
//    var event = ControlKit.DocumentEventType.MOUSE_UP,
//        self  = this;
//    var onDocumenttMouseUp = function(){self._onTrigger();
//        document.removeEventListener(event,onDocumenttMouseUp);};
//
//    document.addEventListener(event,onDocumenttMouseUp);
//};
//
//ControlKit.SubGroup.prototype._onTrigger = function()
//{
//    this._updateAppearance();
//    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.SUBGROUP_TRIGGER,null));
//};
//
//
///*-------------------------------------------------------------------------------------*/
//
//ControlKit.SubGroup.prototype._updateAppearance = function()
//{
//    if(this.isDisabled())
//    {
//        this._wrapNode.setHeight(0);
//
//        if(this.hasLabel())
//        {
//            this._headNode.setStyleClass(ControlKit.CSS.HeadInactive);
//            this._indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMin);
//        }
//
//    }
//    else
//    {
//        if(this.hasMaxHeight())
//        {
//            this._wrapNode.setHeight(this.getMaxHeight());
//        }
//        else
//        {
//            this._wrapNode.deleteStyleProperty('height');
//        }
//
//        if(this.hasLabel())
//        {
//            this._headNode.setStyleClass(ControlKit.CSS.Head);
//            this._indiNode.setStyleClass(ControlKit.CSS.ArrowBSubMax);
//        }
//
//    }
//};
//
//ControlKit.SubGroup.prototype.update = function(){if(this.hasMaxHeight())this._scrollBar.update();};
//
///*-------------------------------------------------------------------------------------*/
//
//ControlKit.SubGroup.prototype.onComponentSelectDrag = function()
//{
//    this.preventSelectDrag();
//};
//
///*-------------------------------------------------------------------------------------*/
//
//ControlKit.SubGroup.prototype.onEnable          = function(){if(this.isDisabled())return;this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.COMPONENTS_ENABLE, null));};
//ControlKit.SubGroup.prototype.onDisable         = function(){if(this.isDisabled())return;this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.COMPONENTS_DISABLE,null));};
////bubble
//ControlKit.SubGroup.prototype.onGroupSizeChange = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_CHANGE,null));};
//ControlKit.SubGroup.prototype.onGroupSizeUpdate = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_UPDATE,null));};
//ControlKit.SubGroup.prototype.onPanelMoveEnd    = function(){this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.PANEL_MOVE_END,   null));};
//ControlKit.SubGroup.prototype.onPanelSizeChange = function(){this._updateAppearance();};
//ControlKit.SubGroup.prototype.onWindowResize    = function(e){this.dispatchEvent(e);};
///*-------------------------------------------------------------------------------------*/
//
//ControlKit.SubGroup.prototype.hasLabel         = function()    {return this._headNode != null;};
//ControlKit.SubGroup.prototype.addComponentNode = function(node){this._listNode.addChild(node);};
//ControlKit.SubGroup.prototype.usesLabels       = function()    {return this._useLabels;};
//
//
//
//
//
//
//
