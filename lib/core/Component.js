var Node = require('./document/Node'),
    CSS = require('./document/CSS');
var EventDispatcher = require('./event/EventDispatcher'),
    ComponentEvent  = require('./ComponentEvent');

function Component(parent,label) {
    EventDispatcher.apply(this,arguments);

    label = parent.usesLabels() ? label : 'none';

    this._parent  = parent;
    this._enabled = true;

    var rootNode = this._node = new Node(Node.LIST_ITEM),
        wrapNode = this._wrapNode = new Node();
        wrapNode.setStyleClass(CSS.Wrap);
        rootNode.addChild(wrapNode);

    if (label !== undefined) {
        if (label.length != 0 && label != 'none') {
            var lablNode = this._lablNode = new Node(Node.SPAN);
                lablNode.setStyleClass(CSS.Label);
                lablNode.setProperty('innerHTML', label);
                rootNode.addChild(lablNode);
        }

        if (label == 'none') {
            wrapNode.setStyleProperty('marginLeft', '0');
            wrapNode.setStyleProperty('width', '100%');
        }
    }

    this._parent.addEventListener(ComponentEvent.ENABLE, this,'onEnable');
    this._parent.addEventListener(ComponentEvent.DISABLE,this,'onDisable');
    this._parent.addComponentNode(rootNode);
}

Component.prototype = Object.create(EventDispatcher.prototype);

Component.prototype.enable = function () {
    this._enabled = true;
};

Component.prototype.disable = function () {
    this._enabled = false;
};

Component.prototype.isEnabled = function () {
    return this._enabled;
};
Component.prototype.isDisabled = function () {
    return !this._enabled;
};

Component.prototype.onEnable = function () {
    this.enable();
};

Component.prototype.onDisable = function () {
    this.disable();
};

module.exports = Component;