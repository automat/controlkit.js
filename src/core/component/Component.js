var EventDispatcher = require('../event/EventDispatcher');
var NodeType = require('../document/NodeType');
var Node = require('../document/Node');
var CSS = require('../document/CSS');
var EventType = require('../event/EventType');

function Component(parent,label) {
    EventDispatcher.apply(this,arguments);

    label = parent.usesLabels() ? label : 'none';

    this._parent   = parent;
    this._isDisabled = false;

    var rootNode = this._node = new Node(NodeType.LIST_ITEM),
        wrapNode = this._wrapNode = new Node(NodeType.DIV);

        wrapNode.setStyleClass(CSS.Wrap);
        rootNode.addChild(wrapNode);


    if (label !== undefined) {
        if (label.length != 0 && label != 'none') {
            var lablNode = this._lablNode = new Node(NodeType.SPAN);
                lablNode.setStyleClass(CSS.Label);
                lablNode.setProperty('innerHTML', label);
                rootNode.addChild(lablNode);
        }

        if (label == 'none') {
            wrapNode.setStyleProperty('marginLeft', '0');
            wrapNode.setStyleProperty('width', '100%');
        }
    }

    this._parent.addEventListener(EventType.COMPONENTS_ENABLE, this,'onEnable');
    this._parent.addEventListener(EventType.COMPONENTS_DISABLE,this,'onDisable');
    this._parent.addComponentNode(rootNode);
}

Component.prototype = Object.create(EventDispatcher.prototype);

Component.prototype.enable = function () {
    this._isDisabled = false;
};
Component.prototype.disable = function () {
    this._isDisabled = true;
};

Component.prototype.isEnabled = function () {
    return !this._isDisabled;
};
Component.prototype.isDisabled = function () {
    return this._isDisabled
};

Component.prototype.onEnable = function () {
    this.enable();
};
Component.prototype.onDisable = function () {
    this.disable();
};

module.exports = Component;

//ControlKit.Component = function(parent,label)
//{
//    ControlKit.EventDispatcher.apply(this,arguments);
//
//    /*---------------------------------------------------------------------------------*/
//
//    label = parent.usesLabels() ? label : 'none';
//
//    /*---------------------------------------------------------------------------------*/
//
//    this._parent   = parent;
//    this._isDisabled = false;
//
//    /*---------------------------------------------------------------------------------*/
//
//    var rootNode = this._node = new ControlKit.Node(ControlKit.NodeType.LIST_ITEM),
//        wrapNode = this._wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV);
//
//        wrapNode.setStyleClass(ControlKit.CSS.Wrap);
//        rootNode.addChild(wrapNode);
//
//
//    if(label)
//    {
//        if(label.length != 0 && label != 'none')
//        {
//            var lablNode = this._lablNode = new ControlKit.Node(ControlKit.NodeType.SPAN);
//                lablNode.setStyleClass(ControlKit.CSS.Label);
//                lablNode.setProperty('innerHTML',label);
//                rootNode.addChild(lablNode);
//        }
//
//        if(label == 'none')
//        {
//            wrapNode.setStyleProperty('marginLeft','0');
//            wrapNode.setStyleProperty('width','100%');
//        }
//    }
//
//    /*---------------------------------------------------------------------------------*/
//
//    this._parent.addEventListener(ControlKit.EventType.COMPONENTS_ENABLE, this,'onEnable');
//    this._parent.addEventListener(ControlKit.EventType.COMPONENTS_DISABLE,this,'onDisable');
//    this._parent.addComponentNode(rootNode);
//
//};
//
//ControlKit.Component.prototype = Object.create(ControlKit.EventDispatcher.prototype);
//
///*---------------------------------------------------------------------------------*/
//
//ControlKit.Component.prototype.enable     = function(){this._isDisabled = false;};
//ControlKit.Component.prototype.disable    = function(){this._isDisabled = true; };
//
//ControlKit.Component.prototype.isEnabled  = function(){return !this._isDisabled;};
//ControlKit.Component.prototype.isDisabled = function(){return this._isDisabled};
//
//ControlKit.Component.prototype.onEnable  = function(){this.enable();};
//ControlKit.Component.prototype.onDisable = function(){this.disable();};
//
