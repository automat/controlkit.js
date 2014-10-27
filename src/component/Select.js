var ObjectComponent = require('../core/component/ObjectComponent');
var Node = require('../core/document/Node');
var CSS = require('../core/document/CSS');

var Options = require('./internal/Options');

var Event_ = require('../core/event/Event'),
    NodeEvent = require('../core/document/NodeEvent'),
    ComponentEvent = require('../core/component/ComponentEvent'),
    SelectEvent = require('./SelectEvent');

var BaseShared = require('../core/BaseShared');

function Select(parent, object, value, params) {
    ObjectComponent.apply(this, arguments);

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    this._onChange = params.onChange;
    this._onFinish = params.onFinish;

    var obj = this._object,
        key = this._key;

    var targetKey = this._targetKey = params.target,
        values = this._values = obj[key];


    this._selectedIndex = -1;
    this._selected = null;

    var select = this._select = new Node(Node.INPUT_BUTTON);
        select.setStyleClass(CSS.Select);
        select.addEventListener(NodeEvent.MOUSE_DOWN, this._onSelectTrigger.bind(this));

    if(this._hasTarget()) {
        var targetObj = obj[targetKey] || '';
        var i = -1;
        while (++i < values.length) {
            if (targetObj == values[i]){
                this._selected = values[i];
            }
        }
        select.setProperty('value', targetObj.toString().length > 0 ? targetObj : values[0]);
    }
    else {
        select.setProperty('value', params.selected ? values[params.selected] : 'Choose ...');
    }

    this._wrapNode.addChild(select);

    var base = BaseShared.get();
        base.addEventListener(SelectEvent.TRIGGER_SELECT, this, 'onSelectTrigger');

    this.addEventListener(SelectEvent.SELECT_TRIGGERED, base, 'onSelectTriggered');
}

Select.prototype = Object.create(ObjectComponent.prototype);

Select.prototype.onSelectTrigger = function (e) {
    if (e.data.origin == this) {
        this._active = !this._active;
        this._updateAppearance();

        if (this._active) {
            this._buildOptions();
        }
        else {
            Options.getInstance().clear();
        }

        return;
    }

    this._active = false;
    this._updateAppearance();
};

Select.prototype._buildOptions = function () {
    var options = Options.getInstance();
    var self = this;

    options.build(this._values, this._selected, this._select,
        function(){
            self.applyValue();
            self._active = false;
            self._updateAppearance();
            self._selectedIndex = options.getSelectedIndex();
            self._onChange(self._selectedIndex);
            options.clear();
        },
        function(){
            self._active = false;
            self._updateAppearance();
            options.clear()
        }, false);
};


Select.prototype.applyValue = function () {
    var index = Options.getInstance().getSelectedIndex(),
        selected = this._selected = this._values[index];

    if (this._hasTarget()) {
        this.pushHistoryState();
        this._object[this._targetKey] = selected;
    }

    this._select.setProperty('value', selected);
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
};

Select.prototype.pushHistoryState = function () {
    var obj = this._object,
        key = this._targetKey;
    History.getInstance().pushState(obj, key, obj[key]);
};

Select.prototype._onSelectTrigger = function () {
    this.dispatchEvent(new Event_(this, SelectEvent.SELECT_TRIGGERED, null));
};

Select.prototype._updateAppearance = function () {
    this._select.setStyleClass(this._active ? CSS.SelectActive : CSS.Select);
};

Select.prototype.onValueUpdate = function (e) {
    if (!this._hasTarget())return;
    this._selected = this._object[this._targetKey];
    this._select.setProperty('value', this._selected.toString());
};

Select.prototype._hasTarget = function () {
    return this._targetKey != null;
};

Select.prototype.getIndex = function(){
    return this._selectedIndex;
};

module.exports = Select;
