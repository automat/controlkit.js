var ObjectComponent = require('../core/component/ObjectComponent');
var Node = require('../core/document/Node');
var NodeType = require('../core/document/NodeType');
var NodeEventType = require('../core/document/NodeEventType');
var Default = require('../core/Default');
var CSS = require('../core/document/CSS');
var Options = require('./internal/Options');
var PresetBtn = require('./internal/PresetBtn');
var Event_ = require('../core/event/Event');
var EventType = require('../core/event/EventType');
var DocumentEventType = require('../core/document/DocumentEventType');
var Metric = require('../core/Metric');

function StringInput(parent,object,value,params) {
    params          = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.presets  = params.presets  || Default.STRING_INPUT_PRESET;


    ObjectComponent.apply(this,arguments);

    this._onChange   = params.onChange;
    this._onFinish   = params.onFinish;

    this._presetsKey = params.presets;

    var input = this._input = new Node(NodeType.INPUT_TEXT);

    var wrapNode = this._wrapNode;

    if (!this._presetsKey) {
        wrapNode.addChild(input);
    }
    else {
        var inputWrap = new Node(NodeType.DIV);
        inputWrap.setStyleClass(CSS.WrapInputWPreset);

        wrapNode.addChild(inputWrap);
        inputWrap.addChild(input);

        var presets = this._object[this._presetsKey],
            options = Options.getInstance(),
            presetBtn = new PresetBtn(this._wrapNode);

        var onPresetDeactivate = function () {
            options.clear();
            presetBtn.deactivate();
        };

        var self = this;
        var onPresetActivate = function () {
            options.build(presets,
                input.getProperty('value'),
                input,
                function () {
                    input.setProperty('value', presets[options.getSelectedIndex()]);
                    self.pushHistoryState();
                    self.applyValue();
                },
                onPresetDeactivate,
                Metric.PADDING_PRESET,
                false);
        };

        presetBtn.setOnActive(onPresetActivate);
        presetBtn.setOnDeactive(onPresetDeactivate)
    }

    input.setProperty('value',this._object[this._key]);

    input.addEventListener(NodeEventType.KEY_UP, this._onInputKeyUp.bind(this));
    input.addEventListener(NodeEventType.CHANGE, this._onInputChange.bind(this));

    input.addEventListener(NodeEventType.MOUSE_DOWN, this._onInputDragStart.bind(this));
    this.addEventListener(EventType.INPUT_SELECT_DRAG,this._parent,'onComponentSelectDrag');
}

StringInput.prototype = Object.create(ObjectComponent.prototype);

StringInput.prototype._onInputKeyUp = function (e) {
    if (this._keyIsChar(e.keyCode)){
        this.pushHistoryState();
    }
    this.applyValue();
    this._onChange();
};

StringInput.prototype._onInputChange = function (e) {
    if (this._keyIsChar(e.keyCode)){
        this.pushHistoryState();
    }
    this.applyValue();
    this._onFinish();
};

//TODO: Finish check
StringInput.prototype._keyIsChar = function (keyCode) {
    return keyCode != 17 &&
        keyCode != 18 &&
        keyCode != 20 &&
        keyCode != 37 &&
        keyCode != 38 &&
        keyCode != 39 &&
        keyCode != 40 &&
        keyCode != 16;
};


StringInput.prototype.applyValue = function () {
    this._object[this._key] = this._input.getProperty('value');
    this.dispatchEvent(new Event_(this, EventType.VALUE_UPDATED, null));
};

StringInput.prototype.onValueUpdate = function (e) {
    if (e.data.origin == this)return;
    this._input.setProperty('value', this._object[this._key]);
};

//Prevent chrome select drag
StringInput.prototype._onInputDragStart = function () {
    var eventMove = DocumentEventType.MOUSE_MOVE,
        eventUp = DocumentEventType.MOUSE_UP;

    var event = EventType.INPUT_SELECT_DRAG;
    var self = this;
    var onDrag = function () {
            self.dispatchEvent(new Event_(this, event, null));
        },

        onDragFinish = function () {
            self.dispatchEvent(new Event_(this, event, null));

            document.removeEventListener(eventMove, onDrag, false);
            document.removeEventListener(eventMove, onDragFinish, false);
        };

    this.dispatchEvent(new Event_(this, event, null));

    document.addEventListener(eventMove, onDrag, false);
    document.addEventListener(eventUp, onDragFinish, false);
};

module.exports = StringInput;