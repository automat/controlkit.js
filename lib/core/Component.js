var Node = require('./document/Node'),
    CSS = require('./document/CSS');
var EventDispatcher = require('./event/EventDispatcher'),
    ComponentEvent  = require('./ComponentEvent');

function Component(parent, params) {
    EventDispatcher.apply(this,arguments);

    params.label = parent.usesLabels() ? params.label : 'none';

    this._parent  = parent;
    this._enabled = true;

    var root = this._node = new Node(Node.LIST_ITEM),
        wrap = this._wrapNode = new Node();
        wrap.setStyleClass(CSS.Wrap);
        root.addChild(wrap);

    params.ratio = params.ratio || getParentRatio(parent);

    if (params.ratio) {
        wrap.setStyleProperty('width', params.ratio + '%');
    }

    if (params.label !== undefined) {
        if (params.label.length != 0 && params.label != 'none') {
            var label_ = this._lablNode = new Node(Node.SPAN);
                label_.setStyleClass(CSS.Label);
                label_.setProperty('innerHTML', params.label);

            if (params.ratio) {
                label_.setStyleProperty('width', (100 - params.ratio) + '%');
            }

            root.addChild(label_);
        }

        if (params.label == 'none') {
            wrap.setStyleProperty('marginLeft', '0');
            wrap.setStyleProperty('width', '100%');
        }
    }

    this._parent.addEventListener(ComponentEvent.ENABLE, this,'onEnable');
    this._parent.addEventListener(ComponentEvent.DISABLE,this,'onDisable');
    this._parent.addComponentNode(root);
}
Component.prototype = Object.create(EventDispatcher.prototype);
Component.prototype.constructor = Component;

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

// Helper to crawl upwards until a ratio is found, or undefined
getParentRatio = function(node) {
    while (!node._ratio && node._parent) {
        node = node._parent;
    }
    return node._ratio;
}

module.exports = Component;
