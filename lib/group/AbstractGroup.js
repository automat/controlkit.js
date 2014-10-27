var EventDispatcher = require('../core/event/EventDispatcher');
var Node = require('../core/document/Node');
var ScrollBar = require('../core/layout/ScrollBar');

function AbstractGroup(parent, params) {
    EventDispatcher.apply(this, arguments);

    params = params || {};
    params.height = params.height || null;
    params.enable = params.enable === undefined ? true : params.enable;

    this._parent = parent;
    this._height = params.height;
    this._isDisabled = !params.enable;
    this._scrollBar = null;

    this._node = new Node(Node.LIST_ITEM);
    this._wrapNode = new Node();
    this._listNode = new Node(Node.LIST);

    this._parent.getList().addChild(this._node);
}

AbstractGroup.prototype = Object.create(EventDispatcher.prototype);

AbstractGroup.prototype.addScrollWrap = function () {
    var wrapNode = this._wrapNode,
        maxHeight = this.getMaxHeight();

    this._scrollBar = new ScrollBar(wrapNode, this._listNode, maxHeight);
    if (this.isEnabled()) {
        wrapNode.setHeight(maxHeight);
    }
};

AbstractGroup.prototype.preventSelectDrag = function () {
    this._parent.preventSelectDrag();

    if (!this.hasScrollWrap()) {
        return;
    }
    this._wrapNode.getElement().scrollTop = 0;
};


AbstractGroup.prototype.hasMaxHeight = function () {
    return this._height != null;
};
AbstractGroup.prototype.getMaxHeight = function () {
    return this._height;
};
AbstractGroup.prototype.hasScrollWrap = function () {
    return this._scrollBar != null;
};
AbstractGroup.prototype.hasLabel = function () {
    return this._lablNode != null;
};

AbstractGroup.prototype.disable = function () {
    this._isDisabled = false;
    this._updateAppearance();
};
AbstractGroup.prototype.enable = function () {
    this._isDisabled = true;
    this._updateAppearance();
};
AbstractGroup.prototype.isDisabled = function () {
    return this._isDisabled;
};
AbstractGroup.prototype.isEnabled = function () {
    return !this._isDisabled;
};

AbstractGroup.prototype.getList = function () {
    return this._listNode;
};

module.exports = AbstractGroup;

