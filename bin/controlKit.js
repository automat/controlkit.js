!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.ControlKit=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var ControlKit = _dereq_('./lib/ControlKit');
	ControlKit.Canvas = _dereq_('./lib/component/Canvas');
	ControlKit.SVG = _dereq_('./lib/component/SVG');

module.exports = ControlKit;
},{"./lib/ControlKit":2,"./lib/component/Canvas":5,"./lib/component/SVG":23}],2:[function(_dereq_,module,exports){
var Node = _dereq_('./core/document/Node'),
    Panel = _dereq_('./group/Panel'),
    Options = _dereq_('./component/Options'),
    Picker = _dereq_('./component/Picker');

var CSS = _dereq_('./core/document/CSS');

var EventDispatcher = _dereq_('./core/event/EventDispatcher'),
    Event_ = _dereq_('./core/event/Event'),
    DocumentEvent = _dereq_('./core/document/DocumentEvent'),
    NodeEvent = _dereq_('./core/document/NodeEvent'),
    ComponentEvent = _dereq_('./component/ComponentEvent'),
    HistoryEvent = _dereq_('./core/HistoryEvent'),
    SelectEvent = _dereq_('./component/SelectEvent'),
    MenuEvent = _dereq_('./group/MenuEvent');

var History = _dereq_('./core/History');
var Mouse = _dereq_('./core/document/Mouse');

var ValuePlotter = _dereq_('./component/ValuePlotter');
var StringOutput = _dereq_('./component/StringOutput'),
    NumberOutput = _dereq_('./component/NumberOutput');

var ControlKitShared = _dereq_('./ControlKitShared');

var DEFAULT_KIT_TRIGGER = false,
    DEFAULT_HISTORY = false,
    DEFAULT_PANELS_CLOSABLE = false,
    DEFAULT_OPACITY = 1.0;

function ControlKit(params) {
    params = params || {};
    params.trigger = params.trigger === undefined ? DEFAULT_KIT_TRIGGER : params.fixed;
    params.history = params.history === undefined ? DEFAULT_HISTORY : params.history;
    params.panelsClosable = params.panelsClosable === undefined ? DEFAULT_PANELS_CLOSABLE : params.panelsClosable;
    params.opacity = params.opacity === undefined ? DEFAULT_OPACITY : params.opacity;
    params.useExternalStyle = params.useExternalStyle === undefined ? false : params.useExternalStyle;

    EventDispatcher.apply(this, arguments);

    var node = null;
    if (!params.parentDomElementId) {
        node = new Node();
        document.body.appendChild(node.getElement());
    } else {
        node = Node.getNodeById(params.parentDomElementId);
    }

    if(!params.useExternalStyle){
        var style = document.createElement('style');
            style.type = 'text/css';
        var css = !params.style ? _dereq_('./core/document/Style').string : params.style;
        if(style.stylesheet){
            style.stylesheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        (document.head || document.getElementsByTagName('head')[0]).appendChild(style);
    }

    node.setProperty('id', CSS.ControlKit);

    this._node = node;
    this._panels = [];
    this._isDisabled = false;
    this._historyEnabled = params.history;
    this._panelsClosable = params.panelsClosable;

    var history = History.setup();

    if (!this._historyEnabled){
        history.disable();
    } else {
        history.addEventListener(HistoryEvent.STATE_PUSH, this, 'onHistoryStatePush');
        history.addEventListener(HistoryEvent.STATE_POP, this, 'onHistoryStatePop');
    }

    Mouse.setup();
    Picker.setup(this.getNode());
    Options.setup(this.getNode());

    if (params.trigger) {
        var trigger = new Node();
        trigger.setProperty('id', CSS.Trigger);
        trigger.addEventListener(NodeEvent.MOUSE_DOWN, this._onTriggerDown.bind(this));

        document.body.appendChild(trigger.getElement());
    }

    if (params.opacity != 1.0 && params.opacity != 0.0) {
        node.setStyleProperty('opacity', params.opacity);
    }

    this._canUpdate = true;

    var self = this;
    var interval,
        count = 0,
        countMax = 10;

    window.addEventListener(DocumentEvent.WINDOW_RESIZE,function(){
        self._canUpdate = false;
        clearInterval(interval);
        interval = setInterval(function(){
            if(count >= countMax){
                count = 0;
                self._canUpdate = true;
                clearInterval(interval);
            }
            count++;
        },25)
    });

    ControlKitShared._instance = this;
}

ControlKit.prototype = Object.create(EventDispatcher.prototype);

ControlKit.prototype._onTriggerDown = function () {
    this._node.setStyleProperty('visibility', this._isDisabled = !this._isDisabled ? 'hidden' : 'visible');
};

ControlKit.prototype.onValueUpdated = function (e) {
    this.dispatchEvent(new Event_(this, ComponentEvent.UPDATE_VALUE, {origin: e.sender}));
};

ControlKit.prototype.onSelectTriggered = function (e) {
    this.dispatchEvent(new Event_(this, SelectEvent.TRIGGER_SELECT, {origin: e.sender}));
};

ControlKit.prototype.addPanel = function (params) {
    var panel = new Panel(this, params);
    this._panels.push(panel);
    return panel;
};

ControlKit.prototype.update = function () {
    if (this._isDisabled || !this._canUpdate){
        return;
    }
    var i, j, k;
    var l, m, n;

    var panels = this._panels,
        panel,
        groups,
        components,
        component;

    i = -1; l = panels.length;
    while (++i < l) {
        panel = panels[i];
        if (panel.isDisabled()){
            continue;
        }
        groups = panel.getGroups();
        j = -1; m = groups.length;

        while (++j < m) {
            components = groups[j].getComponents();
            k = -1; n = components.length;

            while (++k < n) {
                component = components[k];
                if (component.isDisabled()){
                    continue;
                }
                if (component instanceof ValuePlotter ||
                    component instanceof StringOutput ||
                    component instanceof NumberOutput) {
                    component.update();
                }
            }
        }
    }
};

ControlKit.prototype.historyIsEnabled = function () {
    return this._historyEnabled;
};
ControlKit.prototype.panelsAreClosable = function () {
    return this._panelsClosable;
};

ControlKit.prototype.enable = function () {
    this._isDisabled = false;
};
ControlKit.prototype.disable = function () {
    this._isDisabled = true;
};

ControlKit.prototype.disableAllPanels = function () {
    var i = -1, p = this._panels, l = p.length;
    while (++i < l){
        p[i].enable();
    }
};

ControlKit.prototype.enableAllPanels = function () {
    var i = -1, p = this._panels, l = p.length;
    while (++i < l){
        p[i].disable();
    }
};

ControlKit.prototype.onHistoryStatePush = function () {
    this.dispatchEvent(new Event_(this, MenuEvent.UPDATE_MENU, null));
};

ControlKit.prototype.onHistoryStatePop = function () {
    this.dispatchEvent(new Event_(this, ComponentEvent.UPDATE_VALUE, {origin: null}));
    this.dispatchEvent(new Event_(this, MenuEvent.UPDATE_MENU, null));
};

ControlKit.prototype.getNode = function () {
    return this._node;
};

//

var ControlKitGlobal = {
    setup : function(options){
        new ControlKit(options);
    },
    update : function(){
        if(!ControlKitShared._instance){
            return;
        }
        ControlKitShared._instance.update();
    },
    addPanel : function(params){
        if(!ControlKitShared._instance){
            return undefined;
        }
        return ControlKitShared._instance.addPanel(params);
    },
    enable : function(){
        if(!ControlKitShared._instance){
            return;
        }
        ControlKitShared._instance.enable();
    },
    disable : function(){
        if(!ControlKitShared._instance){
            return;
        }
        ControlKitShared._instance.disable();
    },
    destroy : function(){
        ControlKitShared._instance = null;
    }
};

module.exports = ControlKitGlobal;
},{"./ControlKitShared":3,"./component/ComponentEvent":9,"./component/NumberOutput":14,"./component/Options":16,"./component/Picker":19,"./component/SelectEvent":26,"./component/StringOutput":30,"./component/ValuePlotter":31,"./core/History":32,"./core/HistoryEvent":33,"./core/document/CSS":38,"./core/document/DocumentEvent":39,"./core/document/Mouse":40,"./core/document/Node":41,"./core/document/NodeEvent":42,"./core/document/Style":43,"./core/event/Event":46,"./core/event/EventDispatcher":47,"./group/MenuEvent":54,"./group/Panel":55}],3:[function(_dereq_,module,exports){
var ControlKitShared = {
	_instance : null,
	get : function(){
		return this._instance;
	}
};

module.exports = ControlKitShared;
},{}],4:[function(_dereq_,module,exports){
var Event_ = _dereq_('../core/event/Event'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('./ComponentEvent');

var Node = _dereq_('../core/document/Node'),
    Component = _dereq_('./Component');

var CSS = _dereq_('../core/document/CSS');

var DEFAULT_LABEL = '';

function Button(parent,label,onPress,params) {
    onPress      = onPress || function(){};
    params       = params       || {};
    params.label = params.label || DEFAULT_LABEL;

    Component.apply(this,[parent,params.label]);

    var input = new Node(Node.INPUT_BUTTON);

    input.setStyleClass(CSS.Button);
    input.setProperty('value',label);
    input.addEventListener(NodeEvent.ON_CLICK,
                           function() {
                               onPress();
                               this.dispatchEvent(new Event_(this,ComponentEvent.VALUE_UPDATED));
                           }.bind(this));

    this._wrapNode.addChild(input);
}
Button.prototype = Object.create(Component.prototype);

module.exports = Button;

},{"../core/document/CSS":38,"../core/document/Node":41,"../core/document/NodeEvent":42,"../core/event/Event":46,"./Component":8,"./ComponentEvent":9}],5:[function(_dereq_,module,exports){
var Component = _dereq_('./Component');
var CSS = _dereq_('../core/document/CSS');
var Metric = _dereq_('../core/Metric');


var Event_ = _dereq_('../core/event/Event'),
    GroupEvent = _dereq_('../group/GroupEvent');


function Canvas(parent,params) {
    Component.apply(this,arguments);

    var wrapNode = this._wrapNode;
        wrapNode.setStyleClass(CSS.CanvasWrap);

    var wrapWidth = wrapNode.getWidth();

    var canvas = this._canvas = document.createElement('canvas');
        wrapNode.getElement().appendChild(canvas);

    this._canvasWidth = this._canvasHeight = 0;
    this._setCanvasSize(wrapWidth,wrapWidth);

    this._updateHeight();

    this._node.setStyleClass(CSS.CanvasListItem);

    this._parent.addEventListener(GroupEvent.GROUP_SIZE_CHANGE,this,  'onGroupSizeChange');
    this.addEventListener(GroupEvent.GROUP_SIZE_UPDATE,this._parent,'onGroupSizeUpdate');
}

Canvas.prototype = Object.create(Component.prototype);

Canvas.prototype._updateHeight = function () {
    var canvasHeight = this._canvas.height;

    this._wrapNode.setHeight(canvasHeight);
    this._node.setHeight(canvasHeight + Metric.PADDING_WRAPPER);

};

Canvas.prototype.onGroupSizeChange = function () {
    var width = this._wrapNode.getWidth();

    this._setCanvasSize(width, width);
    this._updateHeight();
    this._redraw();

    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_SIZE_UPDATE, null));
};

Canvas.prototype._setCanvasSize = function (width, height) {
    var canvasWidth = this._canvasWidth = width,
        canvasHeight = this._canvasHeight = height;

    var canvas = this._canvas;
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasHeight + 'px';
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
};

Canvas.prototype.getCanvas = function () {
    return this._canvas;
};

Canvas.prototype.getContext = function () {
    return this._canvas.getContext('2d');
};

module.exports = Canvas;

},{"../core/Metric":34,"../core/document/CSS":38,"../core/event/Event":46,"../group/GroupEvent":52,"./Component":8}],6:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('./ObjectComponent'),
    Node = _dereq_('../core/document/Node');

var Event_ = _dereq_('../core/event/Event'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('./ComponentEvent');

function Checkbox(parent, object, value, params) {
    ObjectComponent.apply(this,arguments);

    params = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    this._onChange = params.onChange;
    this._onFinish = params.onFinish;

    var input = this._input = new Node(Node.INPUT_CHECKBOX);
    input.setProperty('checked',this._object[this._key]);
    input.addEventListener(NodeEvent.CHANGE,this._onInputChange.bind(this));

    this._wrapNode.addChild(this._input);
}

Checkbox.prototype = Object.create(ObjectComponent.prototype);

Checkbox.prototype.applyValue = function () {
    this.pushHistoryState();

    var obj = this._object, key = this._key;
    obj[key] = !obj[key];

    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
};

Checkbox.prototype._onInputChange = function () {
    this.applyValue();
    this._onChange();
};

Checkbox.prototype.onValueUpdate = function (e) {
    if (e.data.origin == this){
        return;
    }
    this._input.setProperty('checked', this._object[this._key]);
};

module.exports = Checkbox;
},{"../core/document/Node":41,"../core/document/NodeEvent":42,"../core/event/Event":46,"./ComponentEvent":9,"./ObjectComponent":15}],7:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('./ObjectComponent');

var Error = _dereq_('../core/error/ckError');

var Node = _dereq_('../core/document/Node');
var ColorMode = _dereq_('../core/color/ColorMode');
var Picker = _dereq_('./Picker');
var ColorUtil = _dereq_('../core/color/ColorUtil');
var Options = _dereq_('./Options');
var PresetBtn = _dereq_('./PresetBtn');
var Metric = _dereq_('../core/Metric');
var CSS = _dereq_('../core/document/CSS');

var Event_ = _dereq_('../core/event/Event'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('./ComponentEvent');

var DEFAULT_COLOR_COLOR_MODE = ColorMode.HEX,
    DEFAULT_COLOR_PRESETS    = null;

function Color(parent,object,value,params) {
    ObjectComponent.apply(this,arguments);

    params           = params           || {};
    params.onChange  = params.onChange  || this._onChange;
    params.onFinish  = params.onFinish  || this._onFinish;
    params.presets   = params.presets   || DEFAULT_COLOR_PRESETS;
    params.colorMode = params.colorMode || DEFAULT_COLOR_COLOR_MODE;


    this._onChange   = this._onFinish = params.onChange;
    this._presetsKey = params.presets;


    var color = this._color = new Node();
        value = this._value = this._object[this._key];

    var colorMode = this._colorMode = params.colorMode;

    this._validateColorFormat(value, Error.COLOR_FORMAT_HEX,
                                     Error.COLOR_FORMAT_RGB_RGBFV_HSV);

    var wrapNode = this._wrapNode;

    if (!this._presetsKey) {
        color.setStyleClass(CSS.Color);
        wrapNode.addChild(color);
    }
    else {
        color.setStyleClass(CSS.Color);

        var colorWrap = new Node();
        colorWrap.setStyleClass(CSS.WrapColorWPreset);

        wrapNode.addChild(colorWrap);
        colorWrap.addChild(color);

        var presets = this._object[this._presetsKey];

        var i = -1;
        while (++i < presets.length) {
            this._validateColorFormat(presets[i], Error.COLOR_PRESET_FORMAT_HEX,
                Error.COLOR_PRESET_FORMAT_RGB_RGBFV_HSV);
        }

        var options = Options.getInstance(),
            presetBtn = new PresetBtn(wrapNode);

        var onPresetDeactivate = function () {
            options.clear();
            presetBtn.deactivate();
        };

        var self = this;
        var onPresetActivate = function () {
            options.build(presets,
                self._value,
                color,
                function () {
                    self.pushHistoryState();
                    self._value = presets[options.getSelectedIndex()];
                    self.applyValue();
                },
                onPresetDeactivate,
                Metric.PADDING_PRESET,
                true,
                colorMode);
        };

        presetBtn.setOnActive(onPresetActivate);
        presetBtn.setOnDeactive(onPresetDeactivate);
    }

    color.addEventListener(NodeEvent.MOUSE_DOWN,this._onColorTrigger.bind(this));

    this._updateColor();

}

Color.prototype = Object.create(ObjectComponent.prototype);

Color.prototype._onColorTrigger = function () {
    var colorMode = this._colorMode,
        colorModeHEX = ColorMode.HEX,
        colorModeRGB = ColorMode.RGB,
        colorModeRGBfv = ColorMode.RGBfv,
        colorModeHSV = ColorMode.HSV;

    var value = this._value,
        temp;

    var onPickerPick = function () {
        this.pushHistoryState();

        switch (colorMode) {
            case colorModeHEX:
                this._value = Picker.getInstance().getHEX();
                break;
            case colorModeRGB:

                //if val = Float32array or so
                temp = Picker.getInstance().getRGB();
                value[0] = temp[0];
                value[1] = temp[1];
                value[2] = temp[2];
                break;

            case colorModeRGBfv:

                temp = Picker.getInstance().getRGBfv();
                value[0] = temp[0];
                value[1] = temp[1];
                value[2] = temp[2];
                break;

            case colorModeHSV:
                this._value = Picker.getInstance().getHSV();
                break;
        }

        this.applyValue();

    }.bind(this);

    var picker = Picker.getInstance();

    switch (colorMode) {
        case colorModeHEX:
            picker.setColorHEX(value);
            break;
        case colorModeRGB:
            picker.setColorRGB(value[0], value[1], value[2]);
            break;
        case colorModeRGBfv:
            picker.setColorRGBfv(value[0], value[1], value[2]);
            break;
        case colorModeHSV:
            picker.setColorHSV(value[0], value[1], value[2]);
            break;
    }

    picker.setCallbackPick(onPickerPick);
    picker.open();
};

/*---------------------------------------------------------------------------------*/

Color.prototype.applyValue = function()
{
    this._object[this._key] = this._value;
    this._updateColor();
    this.dispatchEvent(new Event_(this,ComponentEvent.VALUE_UPDATED,null));

};

Color.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._value = this._object[this._key];
    this._updateColor();
};

/*---------------------------------------------------------------------------------*/

Color.prototype._updateColor = function()
{
    var color  = this._value,
        colorNode = this._color,
        nodeColor;

    colorNode.setProperty('innerHTML',color);

    switch(this._colorMode)
    {
        case ColorMode.HEX:
            nodeColor = color;
            break;

        case ColorMode.RGB:
            nodeColor = ColorUtil.RGB2HEX(color[0],color[1],color[2]);
            break;

        case ColorMode.RGBfv:
            nodeColor = ColorUtil.RGBfv2HEX(color[0],color[1],color[2]);
            break;

        case ColorMode.HSV:
            nodeColor = ColorUtil.HSV2RGB(color[0],color[1],color[2]);
            break;
    }

    colorNode.getStyle().backgroundColor = nodeColor;
};

Color.prototype._validateColorFormat = function(value,msgHex,msgArr)
{
    var colorMode = this._colorMode;


    if(colorMode == ColorMode.HEX && Object.prototype.toString.call(value) === '[object Array]' ||
       colorMode == ColorMode.HEX && Object.prototype.toString.call(value) === '[object Float32Array]')
    {
        throw new TypeError(msgHex);
    }
    if((colorMode == ColorMode.RGB   ||
        colorMode == ColorMode.RGBfv ||
        colorMode == ColorMode.HSV) &&
        Object.prototype.toString.call(value) !== '[object Array]' ||
        colorMode == ColorMode.HSV &&
        Object.prototype.toString.call(value) !== '[object Float32Array]')
    {
        throw new TypeError(msgArr);
    }
};

module.exports = Color;
},{"../core/Metric":34,"../core/color/ColorMode":36,"../core/color/ColorUtil":37,"../core/document/CSS":38,"../core/document/Node":41,"../core/document/NodeEvent":42,"../core/error/ckError":44,"../core/event/Event":46,"./ComponentEvent":9,"./ObjectComponent":15,"./Options":16,"./Picker":19,"./PresetBtn":21}],8:[function(_dereq_,module,exports){

var Node = _dereq_('../core/document/Node');
var CSS = _dereq_('../core/document/CSS');
var EventDispatcher = _dereq_('../core/event/EventDispatcher'),
    GroupEvent = _dereq_('../group/GroupEvent');

function Component(parent,label) {
    EventDispatcher.apply(this,arguments);

    label = parent.usesLabels() ? label : 'none';

    this._parent   = parent;
    this._isDisabled = false;

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

    this._parent.addEventListener(GroupEvent.COMPONENTS_ENABLE, this,'onEnable');
    this._parent.addEventListener(GroupEvent.COMPONENTS_DISABLE,this,'onDisable');
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
},{"../core/document/CSS":38,"../core/document/Node":41,"../core/event/EventDispatcher":47,"../group/GroupEvent":52}],9:[function(_dereq_,module,exports){
var ComponentEvent = {
	VALUE_UPDATED: 'valueUpdated',
	UPDATE_VALUE: 'updateValue',

	INPUT_SELECT_DRAG: 'inputSelectDrag'
};

module.exports = ComponentEvent;
},{}],10:[function(_dereq_,module,exports){
var FunctionPlotType = {
    IMPLICIT: 'implicit',
    NON_IMPLICIT: 'nonImplicit'
};

module.exports = FunctionPlotType;
},{}],11:[function(_dereq_,module,exports){
var Plotter = _dereq_('./Plotter');
var ErrorUtil = _dereq_('../core/error/ckErrorUtil');
var Error = _dereq_('../core/error/ckError');


var Node = _dereq_('../core/document/Node');
var CSS = _dereq_('../core/document/CSS');
var FunctionPlotType = _dereq_('./FunctionPlotType');
var Preset = _dereq_('../core/Preset');

var Mouse = _dereq_('../core/document/Mouse');
var Metric = _dereq_('../core/Metric');

var DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    ComponentEvent = _dereq_('./ComponentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent');

var ControlKitShared = _dereq_('../ControlKitShared');

var DEFAULT_FUNCTION_PLOTTER_SHOW_MIN_MAX_LABELS = true;

function FunctionPlotter(parent, object, value, params) {
    params = params || {};
    params.showMinMaxLabels = params.showMinMaxLabels === undefined ?
        DEFAULT_FUNCTION_PLOTTER_SHOW_MIN_MAX_LABELS :
        params.showMinMaxLabels;

    Plotter.apply(this, arguments);

    if (ErrorUtil.TypeError(object, value, Function)) {
        throw new TypeError(Error.COMPONENT_OBJECT +
        object.constructor.name + ' ' +
        value +
        Error.TYPE +
        'Function');
    }

    var funcArgLength = object[value].length;

    if (funcArgLength > 2 || funcArgLength == 0) {
        throw new Error(Error.COMPONENT_FUNCTION_LENGTH);
    }


    var svgRoot = this._svgRoot,
        path = this._path;

    var axes = this._axes = svgRoot.insertBefore(this._createSVGObject('path'), path);
    axes.style.strokeWidth = 1;

    var axesLabels = this._axesLabels = svgRoot.insertBefore(this._createSVGObject('path'), path);
    axesLabels.style.stroke = 'rgb(43,48,51)';
    axesLabels.style.strokeWidth = 1;

    var grid = this._grid;

    var svg = this._svg,
        size = Number(svg.getAttribute('width'));

    var sliderXWrap = new Node();
        sliderXWrap.setStyleClass(CSS.GraphSliderXWrap);

    var sliderYWrap = new Node();
        sliderYWrap.setStyleClass(CSS.GraphSliderYWrap);

    var sliderXTrack = this._sliderXTrack = new Node();
        sliderXTrack.setStyleClass(CSS.GraphSliderX);

    var sliderYTrack = this._sliderYTrack = new Node();
        sliderYTrack.setStyleClass(CSS.GraphSliderY);

    var sliderXHandle = this._sliderXHandle = new Node();
        sliderXHandle.setStyleClass(CSS.GraphSliderXHandle);

    var sliderYHandle = this._sliderYHandle = new Node();
        sliderYHandle.setStyleClass(CSS.GraphSliderYHandle);

    sliderXTrack.addChild(sliderXHandle);
    sliderYTrack.addChild(sliderYHandle);
    sliderXWrap.addChild(sliderXTrack);
    sliderYWrap.addChild(sliderYTrack);

    var wrapNode = this._wrapNode;

    var plotMode = this._plotMode = funcArgLength == 1 ?
        FunctionPlotType.NON_IMPLICIT :
        FunctionPlotType.IMPLICIT;

    if (plotMode == FunctionPlotType.IMPLICIT) {
        var canvas = this._canvas = document.createElement('canvas');
        canvas.style.width = canvas.style.height = size + 'px';
        canvas.width = canvas.height = size;

        wrapNode.getElement().insertBefore(canvas, svg);

        this._canvasContext = canvas.getContext('2d');
        this._canvasImageData = this._canvasContext.getImageData(0, 0, size, size);

        axes.style.stroke = Preset.FUNCTION_PLOTTER_IMPLICIT_AXES_COLOR;
        grid.style.stroke = Preset.FUNCTION_PLOTTER_IMPLICIT_GRID_COLOR;
    }
    else {
        axes.style.stroke = Preset.FUNCTION_PLOTTER_NON_IMPLICIT_AXES_COLOR;
        grid.style.stroke = Preset.FUNCTION_PLOTTER_NON_IMPLICIT_GRID_COLOR;
    }

    wrapNode.addChild(sliderXWrap);
    wrapNode.addChild(sliderYWrap);

    sliderXHandle.addEventListener(NodeEvent.MOUSE_DOWN, this._onSliderXHandleDown.bind(this));
    sliderYHandle.addEventListener(NodeEvent.MOUSE_DOWN, this._onSliderYHandleDown.bind(this));

    var units = this._units = [null, null];
    this._scale = null;

    if (plotMode == FunctionPlotType.NON_IMPLICIT) {
        units[0] = Preset.FUNCTION_PLOTTER_NON_IMPLICIT_UNIT_X;
        units[1] = Preset.FUNCTION_PLOTTER_NON_IMPLICIT_UNIT_Y;

        this._scale = Preset.FUNCTION_PLOTTER_NON_IMPLICIT_SCALE;
    }
    else if (plotMode == FunctionPlotType.IMPLICIT) {
        units[0] = Preset.FUNCTION_PLOTTER_IMPLICIT_UNIT_X;
        units[1] = Preset.FUNCTION_PLOTTER_IMPLICIT_UNIT_Y;

        this._scale = Preset.FUNCTION_PLOTTER_IMPLICIT_SCALE;
    }

    this._unitsMinMax = [Preset.FUNCTION_PLOTTER_UNIT_MIN, Preset.FUNCTION_PLOTTER_UNIT_MAX]; //1/8->4

    this._scaleMinMax = [Preset.FUNCTION_PLOTTER_SCALE_MIN, Preset.FUNCTION_PLOTTER_SCALE_MAX]; //1/50 -> 25

    this._center = [Math.round(size * 0.5),Math.round(size * 0.5)];
    this._svgPos = [0, 0];

    this._func = null;
    this.setFunction(this._object[this._key]);

    this._sliderXHandleUpdate();
    this._sliderYHandleUpdate();

    svg.addEventListener(DocumentEvent.MOUSE_DOWN, this._onDragStart.bind(this), false);
    this._wrapNode.getElement().addEventListener("mousewheel", this._onScale.bind(this, false));

    ControlKitShared.get().addEventListener(ComponentEvent.UPDATE_VALUE, this, 'onValueUpdate');
}

FunctionPlotter.prototype = Object.create(Plotter.prototype);

FunctionPlotter.prototype._updateCenter = function () {
    var svg = this._svg,
        width = Number(svg.getAttribute('width')),
        height = Number(svg.getAttribute('height'));

    var mousePos = Mouse.getInstance().getPosition(),
        svgPos = this._svgPos,
        center = this._center;

    center[0] = Math.max(0, Math.min(mousePos[0] - svgPos[0], width));
    center[1] = Math.max(0, Math.min(mousePos[1] - svgPos[1], height));

    this._plotGraph();
};

FunctionPlotter.prototype._onDragStart = function (e) {
    var element = this._svg;

    var svgPos = this._svgPos;
    svgPos[0] = 0;
    svgPos[1] = 0;

    while (element) {
        svgPos[0] += element.offsetLeft;
        svgPos[1] += element.offsetTop;
        element = element.offsetParent;
    }

    var eventMove = DocumentEvent.MOUSE_MOVE,
        eventUp = DocumentEvent.MOUSE_UP;

    var onDrag = this._updateCenter.bind(this),
        onDragEnd = function () {
            this._updateCenter.bind(this);
            document.removeEventListener(eventMove, onDrag, false);
            document.removeEventListener(eventUp, onDragEnd, false);

        }.bind(this);

    document.addEventListener(eventMove, onDrag, false);
    document.addEventListener(eventUp, onDragEnd, false);

    this._updateCenter();
};

FunctionPlotter.prototype._onScale = function (e) {
    e = window.event || e;
    this._scale += Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) * -1;

    var scaleMinMax = this._scaleMinMax;
    this._scale = Math.max(scaleMinMax[0], Math.min(this._scale, scaleMinMax[1]));

    this._plotGraph();

    e.preventDefault();

};

FunctionPlotter.prototype.onValueUpdate = function () {
    this.setFunction(this._object[this._key]);
};

FunctionPlotter.prototype._redraw = function () {
    if (this._plotMode == FunctionPlotType.IMPLICIT) {
        var size = this._wrapNode.getWidth(),
            canvas = this._canvas;

        canvas.style.width = canvas.style.height = size + 'px';
        canvas.width = canvas.height = size;

        this._canvasImageData = this._canvasContext.getImageData(0, 0, size, size);
    }

    this._sliderXHandleUpdate();
    this._sliderYHandleUpdate();

    this.setFunction(this._object[this._key]);
};

FunctionPlotter.prototype.setFunction = function (func) {
    this._func = func.bind(this._object);
    this._plotGraph();
};

FunctionPlotter.prototype._plotGraph = function () {
    this._drawGrid();
    this._drawAxes();
    this._drawPlot();
};

FunctionPlotter.prototype._drawAxes = function () {
    var svg = this._svg,
        svgWidth = Number(svg.getAttribute('width')),
        svgHeight = Number(svg.getAttribute('height'));

    var center = this._center,
        centerX = center[0],
        centerY = center[1];

    var pathCmd = '';
    pathCmd += this._pathCmdLine(0, centerY, svgWidth, centerY);
    pathCmd += this._pathCmdLine(centerX, 0, centerX, svgHeight);

    this._axes.setAttribute('d', pathCmd);
};

FunctionPlotter.prototype._drawPlot = function () {
    var width, height;

    var center = this._center,
        centerX = center[0],
        centerY = center[1];

    var units = this._units,
        unitX, unitY;

    var scale = this._scale;
    var normval, scaledVal, value, index;
    var offsetX, offsetY;

    var i;

    if (this._plotMode == FunctionPlotType.NON_IMPLICIT) {
        var svg = this._svg;

        width = Number(svg.getAttribute('width'));
        height = Number(svg.getAttribute('height'));
        unitX = units[0] * scale;
        unitY = height / (units[1] * scale);
        offsetX = centerX / width;

        var len = Math.floor(width),
            points = new Array(len * 2);

        i = -1;
        while (++i < len) {
            normval = (-offsetX + i / len);
            scaledVal = normval * unitX;
            value = centerY - this._func(scaledVal) * unitY;

            index = i * 2;

            points[index] = i;
            points[index + 1] = value;
        }

        var pathCmd = '';
        pathCmd += this._pathCmdMoveTo(points[0], points[1]);

        i = 2;
        while (i < points.length) {
            pathCmd += this._pathCmdLineTo(points[i], points[i + 1]);
            i += 2;
        }

        this._path.setAttribute('d', pathCmd);
    }
    else {
        var canvas = this._canvas,
            context = this._canvasContext,
            imgData = this._canvasImageData;

        width = canvas.width;
        height = canvas.height;

        unitX = units[0] * scale;
        unitY = units[1] * scale;

        offsetX = centerX / width;
        offsetY = centerY / height;

        var invWidth = 1 / width,
            invHeight = 1 / height;
        var rgb = [0, 0, 0];

        var col0 = [30, 34, 36],
            col1 = [255, 255, 255];

        i = -1;
        var j;
        while (++i < height) {
            j = -1;

            while (++j < width) {
                value = this._func((-offsetX + j * invWidth) * unitX,
                    (-offsetY + i * invHeight) * unitY);

                rgb[0] = Math.floor((col1[0] - col0[0]) * value + col0[0]);
                rgb[1] = Math.floor((col1[1] - col0[1]) * value + col0[1]);
                rgb[2] = Math.floor((col1[2] - col0[2]) * value + col0[2]);

                index = (i * width + j) * 4;

                imgData.data[index] = rgb[0];
                imgData.data[index + 1] = rgb[1];
                imgData.data[index + 2] = rgb[2];
                imgData.data[index + 3] = 255;
            }
        }

        context.clearRect(0, 0, width, height);
        context.putImageData(imgData, 0, 0);
    }
};

FunctionPlotter.prototype._drawGrid = function () {
    var svg = this._svg,
        width = Number(svg.getAttribute('width')),
        height = Number(svg.getAttribute('height'));

    var scale = this._scale;

    var gridRes = this._units,
        gridSpacingX = width / (gridRes[0] * scale),
        gridSpacingY = height / (gridRes[1] * scale);

    var center = this._center,
        centerX = center[0],
        centerY = center[1];

    var gridNumTop = Math.round(centerY / gridSpacingY) + 1,
        gridNumBottom = Math.round((height - centerY) / gridSpacingY) + 1,
        gridNumLeft = Math.round(centerX / gridSpacingX) + 1,
        gridNumRight = Math.round((width - centerX) / gridSpacingX) + 1;

    var pathCmdGrid = '',
        pathCmdAxesLabels = '';

    var i, temp;

    var strokeSize = Metric.STROKE_SIZE;

    var labelTickSize = Metric.FUNCTION_PLOTTER_LABEL_TICK_SIZE,
        labelTickPaddingRight = width - labelTickSize - strokeSize,
        labelTickPaddingBottom = height - labelTickSize - strokeSize,
        labelTickPaddingRightOffset = labelTickPaddingRight - labelTickSize,
        labelTickPaddingBottomOffset = labelTickPaddingBottom - labelTickSize,
        labelTickOffsetRight = labelTickPaddingRight - (labelTickSize + strokeSize) * 2,
        labelTickOffsetBottom = labelTickPaddingBottom - (labelTickSize + strokeSize) * 2;

    i = -1;
    while (++i < gridNumTop) {
        temp = Math.round(centerY - gridSpacingY * i);
        pathCmdGrid += this._pathCmdLine(0, temp, width, temp);

        if (temp > labelTickSize){
            pathCmdAxesLabels += this._pathCmdLine(labelTickPaddingRight, temp,
                labelTickPaddingRightOffset, temp);
        }
    }

    i = -1;
    while (++i < gridNumBottom) {
        temp = Math.round(centerY + gridSpacingY * i);
        pathCmdGrid += this._pathCmdLine(0, temp, width, temp);

        if (temp < labelTickOffsetBottom){
            pathCmdAxesLabels += this._pathCmdLine(labelTickPaddingRight, temp,
                labelTickPaddingRightOffset, temp);
        }
    }

    i = -1;
    while (++i < gridNumLeft) {
        temp = Math.round(centerX - gridSpacingX * i);
        pathCmdGrid += this._pathCmdLine(temp, 0, temp, height);

        if (temp > labelTickSize){
            pathCmdAxesLabels += this._pathCmdLine(temp, labelTickPaddingBottom,
                temp, labelTickPaddingBottomOffset);
        }
    }

    i = -1;
    while (++i < gridNumRight) {
        temp = Math.round(centerX + gridSpacingX * i);
        pathCmdGrid += this._pathCmdLine(temp, 0, temp, height);

        if (temp < labelTickOffsetRight){
            pathCmdAxesLabels += this._pathCmdLine(temp, labelTickPaddingBottom,
                temp, labelTickPaddingBottomOffset);
        }
    }

    this._grid.setAttribute('d', pathCmdGrid);
    this._axesLabels.setAttribute('d', pathCmdAxesLabels);
};


FunctionPlotter.prototype._sliderXStep = function (mousePos) {
    var mouseX = mousePos[0];

    var handle = this._sliderXHandle,
        handleWidth = handle.getWidth(),
        handleWidthHalf = handleWidth * 0.5;

    var track = this._sliderXTrack,
        trackWidth = track.getWidth(),
        trackLeft = track.getPositionGlobalX();

    var strokeSize = Metric.STROKE_SIZE;

    var max = trackWidth - handleWidthHalf - strokeSize * 2;

    var pos = Math.max(handleWidthHalf, Math.min(mouseX - trackLeft, max)),
        handlePos = pos - handleWidthHalf;

    handle.setPositionX(handlePos);

    var unitsMin = this._unitsMinMax[0],
        unitsMax = this._unitsMinMax[1];

    var normVal = (pos - handleWidthHalf) / (max - handleWidthHalf),
        mappedVal = unitsMin + (unitsMax - unitsMin) * normVal;

    this._units[0] = mappedVal;

    this._plotGraph();
};

FunctionPlotter.prototype._sliderYStep = function (mousePos) {
    var mouseY = mousePos[1];

    var handle = this._sliderYHandle,
        handleHeight = handle.getHeight(),
        handleHeightHalf = handleHeight * 0.5;

    var track = this._sliderYTrack,
        trackHeight = track.getHeight(),
        trackTop = track.getPositionGlobalY();

    var max = trackHeight - handleHeightHalf - 2;

    var pos = Math.max(handleHeightHalf, Math.min(mouseY - trackTop, max)),
        handlePos = pos - handleHeightHalf;

    handle.setPositionY(handlePos);

    var unitsMax = this._unitsMinMax[0],
        unitsMin = this._unitsMinMax[1];

    var normVal = (pos - handleHeightHalf) / (max - handleHeightHalf),
        mappedVal = unitsMin + (unitsMax - unitsMin) * normVal;

    this._units[1] = mappedVal;

    this._plotGraph();
};

FunctionPlotter.prototype._onSliderXHandleDown = function () {
    this._onSliderHandleDown(this._sliderXStep.bind(this));
};

FunctionPlotter.prototype._onSliderYHandleDown = function () {
    this._onSliderHandleDown(this._sliderYStep.bind(this));
};

FunctionPlotter.prototype._onSliderHandleDown = function (sliderStepFunc) {
    var eventMouseMove = DocumentEvent.MOUSE_MOVE,
        eventMouseUp = DocumentEvent.MOUSE_UP;

    var mouse = Mouse.getInstance();

    var onDrag = function () {
            sliderStepFunc(mouse.getPosition())
        },
        onDragEnd = function () {
            document.removeEventListener(eventMouseMove, onDrag, false);
            document.removeEventListener(eventMouseUp, onDragEnd, false);
        };

    sliderStepFunc(mouse.getPosition());
    document.addEventListener(eventMouseMove, onDrag, false);
    document.addEventListener(eventMouseUp, onDragEnd, false);
};

FunctionPlotter.prototype._sliderXHandleUpdate = function () {
    var unitMin = this._unitsMinMax[0],
        unitMax = this._unitsMinMax[1],
        unitX = this._units[0];

    var handleX = this._sliderXHandle,
        handleXWidth = handleX.getWidth(),
        handleXWidthHalf = handleXWidth * 0.5,
        trackXWidth = this._sliderXTrack.getWidth();

    var strokeSize = Metric.STROKE_SIZE;

    var handleXMin = handleXWidthHalf,
        handleXMax = trackXWidth - handleXWidthHalf - strokeSize * 2;

    handleX.setPositionX((handleXMin + (handleXMax - handleXMin) * ((unitX - unitMin) / (unitMax - unitMin))) - handleXWidthHalf);
};

FunctionPlotter.prototype._sliderYHandleUpdate = function () {
    var unitMin = this._unitsMinMax[0],
        unitMax = this._unitsMinMax[1],
        unitY = this._units[1];

    var handleY = this._sliderYHandle,
        handleYHeight = handleY.getHeight(),
        handleYHeightHalf = handleYHeight * 0.5,
        trackYHeight = this._sliderYTrack.getHeight();

    var strokeSize = Metric.STROKE_SIZE;

    var handleYMin = trackYHeight - handleYHeightHalf - strokeSize * 2,
        handleYMax = handleYHeightHalf;

    handleY.setPositionY((handleYMin + (handleYMax - handleYMin) * ((unitY - unitMin) / (unitMax - unitMin))) - handleYHeightHalf);
};

module.exports = FunctionPlotter;
},{"../ControlKitShared":3,"../core/Metric":34,"../core/Preset":35,"../core/document/CSS":38,"../core/document/DocumentEvent":39,"../core/document/Mouse":40,"../core/document/Node":41,"../core/document/NodeEvent":42,"../core/error/ckError":44,"../core/error/ckErrorUtil":45,"./ComponentEvent":9,"./FunctionPlotType":10,"./Plotter":20}],12:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('./ObjectComponent');
var NumberInput_Internal = _dereq_('./NumberInput_Internal');

var CSS = _dereq_('../core/document/CSS');
var Options = _dereq_('./Options');
var PresetBtn = _dereq_('./PresetBtn');
var Metric = _dereq_('../core/Metric');

var Node = _dereq_('../core/document/Node');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('./ComponentEvent');

var DEFAULT_NUMBER_INPUT_DP     = 2,
    DEFAULT_NUMBER_INPUT_STEP   = 1,
    DEFAULT_NUMBER_INPUT_PRESET = null;

function NumberInput(parent,object,value,params) {
    ObjectComponent.apply(this,arguments);

    params          = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.dp       = params.dp       || DEFAULT_NUMBER_INPUT_DP;
    params.step     = params.step     || DEFAULT_NUMBER_INPUT_STEP;
    params.presets  = params.presets  || DEFAULT_NUMBER_INPUT_PRESET;

    this._onChange    = params.onChange;
    this._onFinish    = params.onFinish;
    this._presetsKey  = params.presets;


    var input = this._input = new NumberInput_Internal(params.step,
                                                       params.dp,
                                                       null,
                                                       this._onInputChange.bind(this),
                                                       this._onInputFinish.bind(this));

    var wrapNode = this._wrapNode;

    if (!this._presetsKey) {
        wrapNode.addChild(input.getNode());
    }
    else {
        var inputWrap = new Node();
            inputWrap.setStyleClass(CSS.WrapInputWPreset);

        wrapNode.addChild(inputWrap);
        inputWrap.addChild(input.getNode());

        var presets = this._object[this._presetsKey];

        var options   = Options.getInstance();
        var presetBtn = this._presetBtn = new PresetBtn(this._wrapNode);

        var onPresetDeactivate = function(){options.clear();presetBtn.deactivate();};

        var self = this;
        var onPresetActivate = function () {
            options.build(presets, input.getValue(), input.getNode(),
                function () {
                    input.setValue(presets[options.getSelectedIndex()]);
                    self.applyValue();
                },
                onPresetDeactivate, Metric.PADDING_PRESET,
                false);
        };

        presetBtn.setOnActive(onPresetActivate);
        presetBtn.setOnDeactive(onPresetDeactivate)
    }

    input.getNode().addEventListener(NodeEvent.MOUSE_DOWN,   this._onInputDragStart.bind(this));
    this.addEventListener(ComponentEvent.INPUT_SELECT_DRAG,this._parent,'onComponentSelectDrag');

    input.setValue(this._object[this._key]);
}

NumberInput.prototype = Object.create(ObjectComponent.prototype);

NumberInput.prototype._onInputChange = function () {
    this.applyValue();
    this._onChange();
};
NumberInput.prototype._onInputFinish = function () {
    this.applyValue();
    this._onFinish();
};

NumberInput.prototype.applyValue = function()
{
    this.pushHistoryState();
    this._object[this._key] = this._input.getValue();
    this.dispatchEvent(new Event_(this,ComponentEvent.VALUE_UPDATED,null));
};

NumberInput.prototype.onValueUpdate = function (e) {
    if (e.data.origin == this)return;
    this._input.setValue(this._object[this._key]);
};

//Prevent chrome select drag
NumberInput.prototype._onInputDragStart = function () {
    var eventMove = DocumentEvent.MOUSE_MOVE,
        eventUp = DocumentEvent.MOUSE_UP;

    var event = ComponentEvent.INPUT_SELECT_DRAG;

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

module.exports = NumberInput;
},{"../core/Metric":34,"../core/document/CSS":38,"../core/document/DocumentEvent":39,"../core/document/Node":41,"../core/document/NodeEvent":42,"../core/event/Event":46,"./ComponentEvent":9,"./NumberInput_Internal":13,"./ObjectComponent":15,"./Options":16,"./PresetBtn":21}],13:[function(_dereq_,module,exports){
var EventDispatcher = _dereq_('../core/event/EventDispatcher');
var NodeEvent = _dereq_('../core/document/NodeEvent');
var Node = _dereq_('../core/document/Node');

var PRESET_NUMBER_INPUT_SHIFT_MULTIPLIER  = 10;


NumberInput_Internal = function (stepValue, decimalPlaces, onBegin, onChange, onFinish) {
    EventDispatcher.apply(this, null);

    this._value = 0;
    this._valueStep = stepValue;
    this._valueDPlace = decimalPlaces + 1;

    this._onBegin = onBegin || function (){};
    this._onChange = onChange || function () {};
    this._onFinish = onFinish || function () {};

    this._prevKeyCode = null;

    var input = this._input = new Node(Node.INPUT_TEXT);
    input.setProperty('value', this._value);

    input.addEventListener(NodeEvent.KEY_DOWN, this._onInputKeyDown.bind(this));
    input.addEventListener(NodeEvent.KEY_UP, this._onInputKeyUp.bind(this));
    input.addEventListener(NodeEvent.CHANGE, this._onInputChange.bind(this));
};

NumberInput_Internal.prototype = Object.create(EventDispatcher.prototype);

NumberInput_Internal.prototype._onInputKeyDown = function (e) {
    var step = (e.shiftKey ? PRESET_NUMBER_INPUT_SHIFT_MULTIPLIER : 1) * this._valueStep,
        keyCode = e.keyCode;

    if (keyCode == 38 ||
        keyCode == 40) {
        e.preventDefault();

        var multiplier = keyCode == 38 ? 1.0 : -1.0;
        this._value += (step * multiplier);

        this._onBegin();
        this._onChange();
        this._format();
    }
};

NumberInput_Internal.prototype._onInputKeyUp = function (e) {
    var keyCode = e.keyCode;


    if (e.shiftKey || keyCode == 38 ||
        keyCode == 40 || keyCode == 190 ||
        keyCode == 8 || keyCode == 39 ||
        keyCode == 37 || keyCode == 189) {
        this._prevKeyCode = keyCode;
        return;
    }

    if (this._prevKeyCode == 189 && keyCode == 48) {
        return;
    } //-0
    if (this._prevKeyCode == 190 && keyCode == 48) {
        return;
    } //0.0

    this._validate();
    this._format();
};

NumberInput_Internal.prototype._onInputChange = function (e) {
    this._validate();
    this._format();
    this._onFinish();
};

NumberInput_Internal.prototype._validate = function () {
    if (this.inputIsNumber()) {
        var input = this._getInput();
        if (input != '-')this._value = Number(input);
        this._onChange();
        return;
    }

    this._setOutput(this._value);
};

NumberInput_Internal.prototype.inputIsNumber = function () {
    var value = this._getInput();

    //TODO:FIX
    if (value == '-' || value == '0')return true;
    return /^\s*-?[0-9]\d*(\.\d{1,1000000})?\s*$/.test(value);
};

NumberInput_Internal.prototype._format = function () {
    var string = this._value.toString(),
        index = string.indexOf('.');


    if (index > 0) {
        string = string.slice(0, index + this._valueDPlace);
    }

    this._setOutput(string);
};

NumberInput_Internal.prototype._setOutput = function (n) {
    this._input.setProperty('value', n);
};

NumberInput_Internal.prototype._getInput = function () {
    return this._input.getProperty('value')
};

NumberInput_Internal.prototype.getValue = function () {
    return this._value;
};

NumberInput_Internal.prototype.setValue = function (n) {
    this._value = n;
    this._format();
};

NumberInput_Internal.prototype.getNode = function () {
    return this._input;
};

module.exports = NumberInput_Internal;

},{"../core/document/Node":41,"../core/document/NodeEvent":42,"../core/event/EventDispatcher":47}],14:[function(_dereq_,module,exports){
var Output = _dereq_('./Output');

var DEFAULT_NUMBER_OUTPUT_DP = 2;

function NumberOutput(parent, object, value, params) {
	params = params || {};
	params.dp = params.dp || DEFAULT_NUMBER_OUTPUT_DP;

	Output.apply(this, arguments);
	this._valueDPlace = params.dp + 1;
}

NumberOutput.prototype = Object.create(Output.prototype);

//FIXME
NumberOutput.prototype._setValue = function () {
	if (this._parent.isDisabled()){
		return;
	}

	var value = this._object[this._key],
		textArea = this._textArea,
		dp = this._valueDPlace;

	var index,
		out;

	if (typeof(value) === 'object' &&
		typeof(value.length) === 'number' &&
		typeof(value.splice) === 'function' &&
		!value.propertyIsEnumerable('length')) {

		out = value.slice();

		var i = -1;
		var temp;
		var wrap = this._wrap;

		while (++i < out.length) {
			temp = out[i] = out[i].toString();
			index = temp.indexOf('.');
			if (index > 0)out[i] = temp.slice(0, index + dp);
		}

		if (wrap) {
			textArea.setStyleProperty('white-space', 'nowrap');
			out = out.join('\n');
		}

		textArea.setProperty('value', out);
	}else {
		out = value.toString();
		index = out.indexOf('.');
		textArea.setProperty('value', index > 0 ? out.slice(0, index + dp) : out);
	}

};

module.exports = NumberOutput;
},{"./Output":17}],15:[function(_dereq_,module,exports){
var Component = _dereq_('./Component');
var History = _dereq_('../core/History');
var ControlKitShared = _dereq_('../ControlKitShared');
var ComponentEvent = _dereq_('./ComponentEvent');


function ObjectComponent(parent,object,key,params) {
    if(object[key] === undefined){
        throw new ReferenceError('Object of type ' + object.constructor.name + ' has no member ' + key + '.');
    }

    params       = params || {};
    params.label = params.label || key;

    Component.apply(this,[parent,params.label]);

    this._object   = object;
    this._key      = key;

    this._onChange = function(){};
    this._onFinish = function(){};

    var base = ControlKitShared.get();
    base.addEventListener(ComponentEvent.UPDATE_VALUE, this,'onValueUpdate');
    this.addEventListener(ComponentEvent.VALUE_UPDATED, base, 'onValueUpdated');
}

ObjectComponent.prototype = Object.create(Component.prototype);

//Override in Subclass
ObjectComponent.prototype.applyValue = function() {};
ObjectComponent.prototype.onValueUpdate = function(e) {};

ObjectComponent.prototype.pushHistoryState = function() {
    var obj = this._object, key = this._key;
    History.getInstance().pushState(obj, key, obj[key]);
};

ObjectComponent.prototype.setValue = function(value) {
    this._object[this._key] = value;
};

module.exports = ObjectComponent;

},{"../ControlKitShared":3,"../core/History":32,"./Component":8,"./ComponentEvent":9}],16:[function(_dereq_,module,exports){
var Node = _dereq_('../core/document/Node');

var DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent');

var CSS = _dereq_('../core/document/CSS');
var ColorMode = _dereq_('../core/color/ColorMode');
var ColorUtil = _dereq_('../core/color/ColorUtil');
var Metric = _dereq_('../core/Metric');

function Options(parentNode) {
    this._parenNode = parentNode;

    var node = this._node = new Node();
    var listNode = this._listNode = new Node(Node.LIST);

    node.setStyleClass(CSS.Options);
    node.addChild(listNode);

    this._selectedIndex = null;
    this._callbackOut = function () { };

    this._unfocusable = false;

    document.addEventListener(DocumentEvent.MOUSE_DOWN, this._onDocumentMouseDown.bind(this));
    document.addEventListener(DocumentEvent.MOUSE_UP, this._onDocumentMouseUp.bind(this));

    this.clear();
}

Options.prototype = {
    _onDocumentMouseDown: function () {
        if (!this._unfocusable)return;
        this._callbackOut();
    },

    _onDocumentMouseUp: function () {
        this._unfocusable = true;
    },

    build: function (entries, selected, element, callbackSelect, callbackOut, paddingRight, areColors, colorMode) {
        this._clearList();

        this._parenNode.addChild(this.getNode());

        var rootNode = this._node,
            listNode = this._listNode;

        paddingRight = paddingRight || 0;

        var self = this;

        // build list
        var itemNode, entry;
        var i = -1;

        if (areColors) {
            colorMode = colorMode || ColorMode.HEX;

            listNode.setStyleClass(CSS.Color);

            var color, nodeColor;

            while (++i < entries.length) {
                entry = entries[i];
                itemNode = listNode.addChild(new Node(Node.LIST_ITEM));
                color = itemNode.addChild(new Node());

                switch (colorMode) {
                    case ColorMode.HEX:
                        nodeColor = entry;
                        break;
                    case ColorMode.RGB:
                        nodeColor = ColorUtil.RGB2HEX(entry[0], entry[1], entry[2]);
                        break;
                    case ColorMode.RGBfv:
                        nodeColor = ColorUtil.RGBfv2HEX(entry[0], entry[1], entry[2]);
                        break;
                    case ColorMode.HSV:
                        nodeColor = ColorUtil.HSV2RGB(entry[0], entry[1], entry[2]);
                        break;
                }

                color.getStyle().backgroundColor = nodeColor;
                color.getStyle().backgroundImage = 'linear-gradient( rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)';
                color.setProperty('innerHTML', entry);

                if (entry == selected)itemNode.setStyleClass(CSS.OptionsSelected);

                itemNode.addEventListener(NodeEvent.MOUSE_DOWN,
                    function () {
                        self._selectedIndex = Array.prototype.indexOf.call(this.parentNode.children, this);
                        callbackSelect();
                    });
            }

        }
        else {
            listNode.deleteStyleClass();

            while (++i < entries.length) {
                entry = entries[i];

                itemNode = listNode.addChild(new Node(Node.LIST_ITEM));
                itemNode.setProperty('innerHTML', entry);
                if (entry == selected)itemNode.setStyleClass(CSS.OptionsSelected);

                itemNode.addEventListener(NodeEvent.MOUSE_DOWN,
                    function () {
                        self._selectedIndex = Array.prototype.indexOf.call(this.parentNode.children, this);
                        callbackSelect();
                    });
            }
        }

        //position, set width and enable

        var elementPos = element.getPositionGlobal(),
            elementWidth = element.getWidth() - paddingRight,
            elementHeight = element.getHeight();

        var listWidth = listNode.getWidth(),
            listHeight = listNode.getHeight(),
            strokeOffset = Metric.STROKE_SIZE * 2;

        var paddingOptions = Metric.PADDING_OPTIONS;

        var width = (listWidth < elementWidth ? elementWidth : listWidth) - strokeOffset,
            posX = elementPos[0],
            posY = elementPos[1] + elementHeight - paddingOptions;

        var windowWidth = window.innerWidth,
            windowHeight = window.innerHeight;

        var rootPosX = (posX + width) > windowWidth ? (posX - width + elementWidth - strokeOffset) : posX,
            rootPosY = (posY + listHeight) > windowHeight ? (posY - listHeight * 0.5 - elementHeight * 0.5) : posY;

        listNode.setWidth(width);
        rootNode.setPositionGlobal(rootPosX, rootPosY);

        this._callbackOut = callbackOut;
        this._unfocusable = false;
    },

    _clearList: function () {
        this._listNode.removeAllChildren();
        this._listNode.deleteStyleProperty('width');
        this._selectedIndex = null;
        this._build = false;
    },

    clear: function () {
        this._clearList();
        this._callbackOut = function () {
        };
        this._parenNode.removeChild(this.getNode());

    },

    isBuild: function () {
        return this._build;
    },
    getNode: function () {
        return this._node;
    },
    getSelectedIndex: function () {
        return this._selectedIndex;
    }
};

Options.setup        = function(parentNode){return Options._instance = new Options(parentNode);};
Options.getInstance = function(){return Options._instance;};

module.exports = Options;
},{"../core/Metric":34,"../core/color/ColorMode":36,"../core/color/ColorUtil":37,"../core/document/CSS":38,"../core/document/DocumentEvent":39,"../core/document/Node":41,"../core/document/NodeEvent":42}],17:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('./ObjectComponent');
var Node = _dereq_('../core/document/Node');

var CSS = _dereq_('../core/document/CSS');
var Metric = _dereq_('../core/Metric');
var ScrollBar = _dereq_('../core/layout/ScrollBar');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('./ComponentEvent');

var DEFAULT_OUTPUT_HEIGHT = null,
    DEFAULT_OUTPUT_WRAP   = false,
    DEFAULT_OUTPUT_UPDATE = true;

function Output(parent,object,value,params) {
    ObjectComponent.apply(this,arguments);

    params            = params        || {};
    params.height     = params.height || DEFAULT_OUTPUT_HEIGHT;
    params.wrap       = params.wrap   === undefined ?
                        DEFAULT_OUTPUT_WRAP :
                        params.wrap;
    params.update     = params.update === undefined ?
                        DEFAULT_OUTPUT_UPDATE :
                        params.update;

    this._wrap = params.wrap;
    this._update = params.update;

    var textArea = this._textArea = new Node(Node.TEXTAREA),
        wrapNode = this._wrapNode,
        rootNode = this._node;

        textArea.setProperty('readOnly',true);
        wrapNode.addChild(textArea);

        textArea.addEventListener(NodeEvent.MOUSE_DOWN,this._onInputDragStart.bind(this));
        this.addEventListener(ComponentEvent.INPUT_SELECT_DRAG,this._parent,'onComponentSelectDrag');


    if(params.height){
        var textAreaWrap = new Node();
            textAreaWrap.setStyleClass(CSS.TextAreaWrap);
            textAreaWrap.addChild(textArea);
            wrapNode.addChild(textAreaWrap);

        //FIXME
        var height  = this._height = params.height,
            padding = 4;

            textArea.setHeight(Math.max(height + padding  ,Metric.COMPONENT_MIN_HEIGHT));
            wrapNode.setHeight(textArea.getHeight());
            rootNode.setHeight(wrapNode.getHeight() + padding);

        this._scrollBar = new ScrollBar(textAreaWrap,textArea,height - padding)
    }

    if(params.wrap){
        textArea.setStyleProperty('white-space','pre-wrap');
    }

    this._prevString = '';
    this._prevScrollHeight = -1;
    this._setValue();
}

Output.prototype = Object.create(ObjectComponent.prototype);


//Override in subclass
Output.prototype._setValue = function () {};


Output.prototype.onValueUpdate = function () {
    this._setValue();
};

Output.prototype.update = function () {
    if(!this._update){
        return;
    }
    this._setValue();
};


//Prevent chrome select drag

Output.prototype._onDrag = function(){
    this.dispatchEvent(new Event_(this, ComponentEvent.INPUT_SELECT_DRAG, null));
};

Output.prototype._onDragFinish = function(){
    this.dispatchEvent(new Event_(this, ComponentEvent.INPUT_SELECT_DRAG, null));

    document.removeEventListener(DocumentEvent.MOUSE_MOVE, this._onDrag, false);
    document.removeEventListener(DocumentEvent.MOUSE_MOVE, this._onDragFinish, false);
};

Output.prototype._onInputDragStart = function() {
    this.dispatchEvent(new Event_(this, ComponentEvent.INPUT_SELECT_DRAG, null));
    document.addEventListener(DocumentEvent.MOUSE_MOVE, this._onDrag.bind(this), false);
    document.addEventListener(DocumentEvent.MOUSE_UP,   this._onDragFinish.bind(this), false);
};


module.exports = Output;

},{"../core/Metric":34,"../core/document/CSS":38,"../core/document/DocumentEvent":39,"../core/document/Node":41,"../core/document/NodeEvent":42,"../core/event/Event":46,"../core/layout/ScrollBar":49,"./ComponentEvent":9,"./ObjectComponent":15}],18:[function(_dereq_,module,exports){
var Plotter = _dereq_('./Plotter');
var Mouse = _dereq_('../core/document/Mouse');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    ComponentEvent = _dereq_('./ComponentEvent');

var DEFAULT_PAD_BOUNDS_X = [-1,1],
    DEFAULT_PAD_BOUNDS_Y = [-1,1],
    DEFAULT_PAD_LABEL_X  = '',
    DEFAULT_PAD_LABEL_Y  = '';

function Pad(parent, object, value, params) {
    Plotter.apply(this,arguments);

    params            = params            || {};
    params.boundsX    = params.boundsX    || DEFAULT_PAD_BOUNDS_X;
    params.boundsY    = params.boundsY    || DEFAULT_PAD_BOUNDS_Y;
    params.labelX     = params.labelX     || DEFAULT_PAD_LABEL_X;
    params.labelY     = params.labelY     || DEFAULT_PAD_LABEL_Y;

    params.showCross  = params.showCross  || true;


    this._onChange     = params.onChange || this._onChange;
    this._onFinish     = params.onFinish || this._onFinish;

    this._boundsX      = params.boundsX;
    this._boundsY      = params.boundsY;
    this._labelAxisX   = params.labelX != '' && params.labelX != 'none' ? params.labelX : null;
    this._labelAxisY   = params.labelY != '' && params.labelY != 'none' ? params.labelY : null;

    var path = this._path;
        path.style.strokeWidth = 1;
        path.style.stroke      = '#363c40';

    this._grid.style.stroke = 'rgb(25,25,25)';

    this._svgPos = [0,0];


    var handle = this._handle = this._svgRoot.appendChild(this._createSVGObject('g'));
    var handleCircle0 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle0.setAttribute('r',String(11));
        handleCircle0.setAttribute('fill','rgba(0,0,0,0.05)');
    var handleCircle1 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle1.setAttribute('r',String(10));
        handleCircle1.setAttribute('fill','rgb(83,93,98)');

    var handleCircle2 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle2.setAttribute('r',String(9));
        handleCircle2.setAttribute('fill','rgb(57,69,76)');
        handleCircle2.setAttribute('cy',String(0.75));

    var handleCircle3 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle3.setAttribute('r',String(10));
        handleCircle3.setAttribute('stroke','rgb(17,19,20)');
        handleCircle3.setAttribute('stroke-width',String(1));
        handleCircle3.setAttribute('fill','none');

    var handleCircle4 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle4.setAttribute('r',String(6));
        handleCircle4.setAttribute('fill','rgb(30,34,36)');
    var handleCircle5 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle5.setAttribute('r',String(3));
        handleCircle5.setAttribute('fill','rgb(255,255,255)');

        handle.setAttribute('tranform','translate(0 0)');

    this._svg.addEventListener(DocumentEvent.MOUSE_DOWN,this._onDragStart.bind(this),false);
    this._drawValue(this._object[this._key]);
}

Pad.prototype = Object.create(Plotter.prototype);

Pad.prototype._onDragStart = function () {
    var element = this._svg;

    var svgPos = this._svgPos;
        svgPos[0] = 0;
        svgPos[1] = 0;

    while (element) {
        svgPos[0] += element.offsetLeft;
        svgPos[1] += element.offsetTop;
        element = element.offsetParent;
    }

    var eventMove = DocumentEvent.MOUSE_MOVE,
        eventUp   = DocumentEvent.MOUSE_UP;

    var onDrag = function () {
        this._drawValueInput();
        this.applyValue();
        this._onChange();
    }.bind(this);

    var onDragEnd = function () {
        this.pushHistoryState();
        this._drawValueInput();
        this.applyValue();
        this._onFinish();

        document.removeEventListener(eventMove, onDrag, false);
        document.removeEventListener(eventUp, onDragEnd, false);
    }.bind(this);

    document.addEventListener(eventMove, onDrag,    false);
    document.addEventListener(eventUp,   onDragEnd, false);

    this._drawValueInput();
    this.applyValue();
    this._onChange();
};

Pad.prototype._redraw = function () {
    this._drawValue(this._object[this._key]);
};

Pad.prototype._drawValueInput = function () {
    this._drawValue(this._getMouseNormalized());
};

Pad.prototype._drawValue = function (value) {
    this._object[this._key] = value;
    this._drawGrid();
    this._drawPoint();
};

Pad.prototype._drawGrid = function () {
    var svgSize = Number(this._svg.getAttribute('width')),
        svgMidX = Math.floor(svgSize * 0.5),
        svgMidY = Math.floor(svgSize * 0.5);

    var pathCmd = '';
    pathCmd += this._pathCmdLine(0, svgMidY, svgSize, svgMidY);
    pathCmd += this._pathCmdLine(svgMidX, 0, svgMidX, svgSize);

    this._grid.setAttribute('d', pathCmd);
};


Pad.prototype._drawPoint = function () {
    var svgSize = Number(this._svg.getAttribute('width')),
        svgMidX = svgSize * 0.5,
        svgMidY = svgSize * 0.5;

    var value = this._object[this._key];

    var localX = ( 0.5 + value[0] * 0.5 ) * svgSize,
        localY = ( 0.5 + -value[1] * 0.5 ) * svgSize;

    var pathCmd = '';
        pathCmd += this._pathCmdLine(0, localY, svgSize, localY);
        pathCmd += this._pathCmdLine(localX, 0, localX, svgSize);

    this._path.setAttribute('d', pathCmd);
    this._handle.setAttribute('transform', 'translate(' + localX + ' ' + localY + ')');
};

Pad.prototype._getMouseNormalized = function () {
    var offset = this._svgPos,
        mouse = Mouse.getInstance().getPosition(),
        svgSize = Number(this._svg.getAttribute('width'));

    return [-1 + Math.max(0, Math.min(mouse[0] - offset[0], svgSize)) / svgSize * 2,
        ( 1 - Math.max(0, Math.min(mouse[1] - offset[1], svgSize)) / svgSize * 2)];

};

Pad.prototype.applyValue = function () {
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
};

Pad.prototype.onValueUpdate = function (e) {
    if (e.data.origin == this)return;
    this._drawValue(this._object[this._key]);
};

module.exports = Pad;

},{"../core/document/DocumentEvent":39,"../core/document/Mouse":40,"../core/event/Event":46,"./ComponentEvent":9,"./Plotter":20}],19:[function(_dereq_,module,exports){
var Node = _dereq_('../core/document/Node');

var CSS = _dereq_('../core/document/CSS');
var NumberInput_Internal = _dereq_('./NumberInput_Internal');
var Mouse = _dereq_('../core/document/Mouse');
var ColorUtil = _dereq_('../core/color/ColorUtil');
var DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent');

var DEFAULT_COLOR_PICKER_VALUE_HUE = 200.0,
    DEFAULT_COLOR_PICKER_VALUE_SAT = 50.0,
    DEFAULT_COLOR_PICKER_VALUE_VAL = 50.0;

function Picker(parentNode){
    var rootNode = this._node     = new Node().setStyleClass(CSS.Picker),
        headNode = this._headNode = new Node().setStyleClass(CSS.Head),
        lablWrap = new Node().setStyleClass(CSS.Wrap),
        lablNode = new Node().setStyleClass(CSS.Label),
        menuNode = new Node().setStyleClass(CSS.Menu),
        wrapNode = new Node().setStyleClass(CSS.Wrap);

    var menuClose = new Node(Node.INPUT_BUTTON);
        menuClose.setStyleClass(CSS.MenuBtnClose);

    var fieldWrap  = new Node().setStyleClass( CSS.PickerFieldWrap),
        sliderWrap = new Node().setStyleClass(CSS.SliderWrap),
        inputWrap  = new Node().setStyleClass( CSS.PickerInputWrap);

    var canvasField  = this._canvasField  = document.createElement('canvas'),
        canvasSlider = this._canvasSlider = document.createElement('Canvas');

        fieldWrap.getElement().appendChild(canvasField);
        sliderWrap.getElement().appendChild(canvasSlider);

        this._setSizeCanvasField(154,154);
        this._setSizeCanvasSlider(14,154);

    var contextCanvasField  = this._contextCanvasField  = canvasField.getContext('2d'),
        contextCanvasSlider = this._contextCanvasSlider = canvasSlider.getContext('2d');

    var handleField  = this._handleField  = new Node();
        handleField.setStyleClass(CSS.PickerHandleField);

    var handleSlider = this._handleSlider = new Node();
        handleSlider.setStyleClass(CSS.PickerHandleSlider);

    var step = 1.0,
        dp   = 0;

    var callbackHue = this._onInputHueChange.bind(this),
        callbackSat = this._onInputSatChange.bind(this),
        callbackVal = this._onInputValChange.bind(this),
        callbackR   = this._onInputRChange.bind(this),
        callbackG   = this._onInputGChange.bind(this),
        callbackB   = this._onInputBChange.bind(this);


    var inputHue = this._inputHue = new NumberInput_Internal(step,dp,null,callbackHue,callbackHue),
        inputSat = this._inputSat = new NumberInput_Internal(step,dp,null,callbackSat,callbackSat),
        inputVal = this._inputVal = new NumberInput_Internal(step,dp,null,callbackVal,callbackVal),
        inputR   = this._inputR   = new NumberInput_Internal(step,dp,null,callbackR,callbackR),
        inputG   = this._inputG   = new NumberInput_Internal(step,dp,null,callbackG,callbackG),
        inputB   = this._inputB   = new NumberInput_Internal(step,dp,null,callbackB,callbackB);

    var controlsWrap = new Node().setStyleClass(CSS.PickerControlsWrap);

    var buttonPick   = new Node(Node.INPUT_BUTTON).setStyleClass(CSS.Button).setProperty('value','pick'),
        buttonCancel = new Node(Node.INPUT_BUTTON).setStyleClass(CSS.Button).setProperty('value','cancel');


    var colorContrast = new Node().setStyleClass(CSS.PickerColorContrast);

    var color0 = this._colorCurrNode = new Node(),
        color1 = this._colorPrevNode = new Node();

    colorContrast.addChild(color0);
    colorContrast.addChild(color1);

    controlsWrap.addChild(buttonCancel);
    controlsWrap.addChild(buttonPick);
    controlsWrap.addChild(colorContrast);

    this._setContrasPrevColor(0,0,0);

    var inputFieldWrapHue = new Node().setStyleClass(CSS.PickerInputField),
        inputFieldWrapSat = new Node().setStyleClass(CSS.PickerInputField),
        inputFieldWrapVal = new Node().setStyleClass(CSS.PickerInputField);

    var inputFieldWrapHueLabel = new Node(Node.SPAN).setStyleClass(CSS.Label).setProperty('innerHTML','H'),
        inputFieldWrapSatLabel = new Node(Node.SPAN).setStyleClass(CSS.Label).setProperty('innerHTML','S'),
        inputFieldWrapValLabel = new Node(Node.SPAN).setStyleClass(CSS.Label).setProperty('innerHTML','V');

        inputFieldWrapHue.addChildren(inputFieldWrapHueLabel,inputHue.getNode());
        inputFieldWrapSat.addChildren(inputFieldWrapSatLabel,inputSat.getNode());
        inputFieldWrapVal.addChildren(inputFieldWrapValLabel,inputVal.getNode());

    var inputFieldWrapR = new Node().setStyleClass(CSS.PickerInputField),
        inputFieldWrapG = new Node().setStyleClass(CSS.PickerInputField),
        inputFieldWrapB = new Node().setStyleClass(CSS.PickerInputField);

    var inputFieldWrapRLabel = new Node(Node.SPAN).setStyleClass(CSS.Label).setProperty('innerHTML','R'),
        inputFieldWrapGLabel = new Node(Node.SPAN).setStyleClass(CSS.Label).setProperty('innerHTML','G'),
        inputFieldWrapBLabel = new Node(Node.SPAN).setStyleClass(CSS.Label).setProperty('innerHTML','B');

        inputFieldWrapR.addChildren(inputFieldWrapRLabel,inputR.getNode());
        inputFieldWrapG.addChildren(inputFieldWrapGLabel,inputG.getNode());
        inputFieldWrapB.addChildren(inputFieldWrapBLabel,inputB.getNode());


        inputWrap.addChildren(inputFieldWrapR,inputFieldWrapHue,
                              inputFieldWrapG,inputFieldWrapSat,
                              inputFieldWrapB,inputFieldWrapVal,colorContrast);

    var hexInputWrap = new Node();
        hexInputWrap.setStyleClass(CSS.PickerInputWrap);

    var inputHEX = this._inputHEX = new Node(Node.INPUT_TEXT),
        inputFieldWrapHEX         = new Node().setStyleClass(CSS.PickerInputField),
        inputFieldWrapHEXLabel    = new Node(Node.SPAN).setStyleClass(CSS.Label);

        inputFieldWrapHEXLabel.setProperty('innerHTML','#');
        inputFieldWrapHEX.addChildren(inputFieldWrapHEXLabel,inputHEX);

        hexInputWrap.addChild(inputFieldWrapHEX);

        inputHEX.addEventListener(NodeEvent.CHANGE,this._onInputHEXFinish.bind(this));

        lablNode.setProperty('innerHTML','Color Picker');

        menuNode.addChild(menuClose);
        headNode.addChild(menuNode);
        lablWrap.addChild(lablNode);
        headNode.addChild(lablWrap);
        rootNode.addChild(headNode);
        rootNode.addChild(wrapNode);

        //wrapNode.addChild(paletteWrap);

        wrapNode.addChild(fieldWrap);
        wrapNode.addChild(sliderWrap);
        wrapNode.addChild(inputWrap);
        wrapNode.addChild(hexInputWrap);
        wrapNode.addChild(controlsWrap);

        fieldWrap.addChild( handleField);
        sliderWrap.addChild(handleSlider);

    var eventMouseDown = NodeEvent.MOUSE_DOWN,
        callback       = this._onCanvasFieldMouseDown.bind(this);

        fieldWrap.addEventListener(  eventMouseDown, callback);
        handleField.addEventListener(eventMouseDown, callback);

        callback = this._onCanvasSliderMouseDown.bind(this);

        sliderWrap.addEventListener(  eventMouseDown, callback);
        handleSlider.addEventListener(eventMouseDown, callback);

        menuClose.addEventListener(   eventMouseDown, this._onClose.bind(this));
        buttonPick.addEventListener(  eventMouseDown, this._onPick.bind(this));
        buttonCancel.addEventListener(eventMouseDown, this._onClose.bind(this));

        headNode.addEventListener(NodeEvent.MOUSE_DOWN, this._onHeadDragStart.bind(this));

    this._parentNode = parentNode;

    this._mouseOffset = [0,0];
    this._position    = [0,0];

    this._canvasSliderPos = [0,0];
    this._canvasFieldPos  = [0,0];
    this._handleFieldSize    = 12;
    this._handleSliderHeight = 7;

    this._imageDataSlider = contextCanvasSlider.createImageData(canvasSlider.width,canvasSlider.height);
    this._imageDataField  = contextCanvasField.createImageData( canvasField.width, canvasField.height);

    this._valueHueMinMax = [0,360];
    this._valueSatMinMax = this._valueValMinMax = [0,100];
    this._valueRGBMinMax = [0,255];

    this._valueHue = DEFAULT_COLOR_PICKER_VALUE_HUE;
    this._valueSat = DEFAULT_COLOR_PICKER_VALUE_SAT;
    this._valueVal = DEFAULT_COLOR_PICKER_VALUE_VAL;
    this._valueR   = 0;
    this._valueG   = 0;
    this._valueB   = 0;

    this._valueHEX = '#000000';
    this._valueHEXValid = this._valueHEX;

    this._callbackPick = function(){};

    //this._canvasFieldImageDataFunc = function(i,j){return this._HSV2RGB(this._valueHue,j)}

    this._drawCanvasField();
    this._drawCanvasSlider();

    this._setColorHSV(this._valueHue,this._valueSat,this._valueVal);

    this._updateColorRGBFromHSV();
    this._updateColorHEXFromRGB();

    this._updateHandles();
}

Picker.prototype =
{
    _drawHandleField: function () {
        var canvas = this._canvasField,
            nodePos = this._canvasFieldPos,
            mousePos = Mouse.getInstance().getPosition();

        var posX = Math.max(0, Math.min(mousePos[0] - nodePos[0], canvas.width)),
            posY = Math.max(0, Math.min(mousePos[1] - nodePos[1], canvas.height)),
            posXNorm = posX / canvas.width,
            posYNorm = posY / canvas.height;

        var sat = Math.round(posXNorm * this._valueSatMinMax[1]),
            val = Math.round((1.0 - posYNorm) * this._valueValMinMax[1]);

        this._setColorHSV(this._valueHue, sat, val);

        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();

        this._updateHandleField();
    },

    _updateHandleField: function () {
        var width = this._canvasField.width,
            height = this._canvasField.height,
            offsetHandle = this._handleFieldSize * 0.25;

        var satNorm = this._valueSat / this._valueSatMinMax[1],
            valNorm = this._valueVal / this._valueValMinMax[1];

        this._handleField.setPositionGlobal(satNorm * width - offsetHandle,
            (1.0 - valNorm) * height - offsetHandle);

    },

    _drawHandleSlider: function () {
        var canvas = this._canvasSlider,
            canvasPosY = this._canvasSliderPos[1],
            mousePosY = Mouse.getInstance().getY();

        var posY = Math.max(0, Math.min(mousePosY - canvasPosY, canvas.height)),
            posYNorm = posY / canvas.height;

        var hue = Math.floor((1.0 - posYNorm) * this._valueHueMinMax[1]);

        this._setColorHSV(hue, this._valueSat, this._valueVal);

        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();

        this._updateHandleSlider();
    },

    _updateHandleSlider: function () {
        var height = this._canvasSlider.height,
            offsetHandle = this._handleSliderHeight * 0.25;

        var hueNorm = this._valueHue / this._valueHueMinMax[1];

        this._handleSlider.setPositionGlobalY((height - offsetHandle) * (1.0 - hueNorm));
    },

    _updateHandles: function () {
        this._updateHandleField();
        this._updateHandleSlider();
    },

    /*---------------------------------------------------------------------------------*/

    _setHue: function (value) {
        var minMax = this._valueHueMinMax;

        this._valueHue = value == minMax[1] ? minMax[0] : value;
        this._updateColorHSV();
        this._drawCanvasField();
    },

    _setSat: function (value) {
        this._valueSat = Math.round(value);
        this._updateColorHSV();
    },

    _setVal: function (value) {
        this._valueVal = Math.round(value);
        this._updateColorHSV();
    },

    _setR: function (value) {
        this._valueR = Math.round(value);
        this._updateColorRGB();
    },

    _setG: function (value) {
        this._valueG = Math.round(value);
        this._updateColorRGB();
    },

    _setB: function (value) {
        this._valueB = Math.round(value);
        this._updateColorRGB();
    },

    /*---------------------------------------------------------------------------------*/

    _onInputHueChange: function () {
        var input = this._inputHue,
            inputVal = this._getValueContrained(input, this._valueHueMinMax);

        var minMax = this._valueHueMinMax;

        if (inputVal == minMax[1]) {
            inputVal = minMax[0];
            input.setValue(inputVal);
        }

        this._setHue(inputVal);
        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();
        this._updateHandleSlider();

        this._drawCanvasField();
    },

    _onInputSatChange: function () {
        this._setSat(this._getValueContrained(this._inputSat, this._valueSatMinMax));
        this._onInputSVChange();
    },

    _onInputValChange: function () {
        this._setVal(this._getValueContrained(this._inputVal, this._valueValMinMax));
        this._onInputSVChange();
    },

    _onInputRChange: function () {
        this._setR(this._getValueContrained(this._inputR, this._valueRGBMinMax));
        this._onInputRGBChange();
    },

    _onInputGChange: function () {
        this._setG(this._getValueContrained(this._inputG, this._valueRGBMinMax));
        this._onInputRGBChange();
    },

    _onInputBChange: function () {
        this._setB(this._getValueContrained(this._inputB, this._valueRGBMinMax));
        this._onInputRGBChange();
    },

    _onInputHEXFinish: function () {
        var input = this._inputHEX,
            value = input.getProperty('value');

        if (!ColorUtil.isValidHEX(value)) {
            input.setProperty('value', this._valueHEXValid);
            return;
        }

        this._valueHEX = this._valueHEXValid = value;
        this._updateColorFromHEX();
    },

    _onInputSVChange: function () {
        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();
        this._updateHandleField();
    },

    _onInputRGBChange: function () {
        this._updateColorHSVFromRGB();
        this._updateColorHEXFromRGB();
        this._updateHandles();
    },

    _getValueContrained: function (input, minMax) {
        var inputVal = Math.round(input.getValue()),
            min = minMax[0],
            max = minMax[1];

        if (inputVal <= min) {
            inputVal = min;
            input.setValue(inputVal);
        }
        if (inputVal >= max) {
            inputVal = max;
            input.setValue(inputVal);
        }

        return inputVal;
    },


    _updateInputHue: function () {
        this._inputHue.setValue(this._valueHue);
    },
    _updateInputSat: function () {
        this._inputSat.setValue(this._valueSat);
    },
    _updateInputVal: function () {
        this._inputVal.setValue(this._valueVal);
    },
    _updateInputR: function () {
        this._inputR.setValue(this._valueR);
    },
    _updateInputG: function () {
        this._inputG.setValue(this._valueG);
    },
    _updateInputB: function () {
        this._inputB.setValue(this._valueB);
    },
    _updateInputHEX: function () {
        this._inputHEX.setProperty('value', this._valueHEX);
    },


    _setColorHSV: function (hue, sat, val) {
        this._valueHue = hue;
        this._valueSat = sat;
        this._valueVal = val;

        this._updateInputHue();
        this._updateInputSat();
        this._updateInputVal();

        this._updateContrastCurrColor();
    },

    _setColorRGB: function (r, g, b) {
        this._valueR = r;
        this._valueG = g;
        this._valueB = b;

        this._updateInputR();
        this._updateInputG();
        this._updateInputB();

        this._updateContrastCurrColor();
    },

    _setColorHEX: function (hex) {
        this._valueHEX = hex;
        this._updateInputHEX();
    },

    _updateColorHSV: function () {
        this._setColorHSV(this._valueHue, this._valueSat, this._valueVal);
        this._updateContrastCurrColor();
    },

    _updateColorRGB: function () {
        this._setColorRGB(this._valueR, this._valueG, this._valueB);
        this._updateContrastCurrColor();
    },

    _updateColorHSVFromRGB: function () {
        var hsv = ColorUtil.RGB2HSV(this._valueR, this._valueG, this._valueB);
        this._setColorHSV(hsv[0], hsv[1], hsv[2]);
    },

    _updateColorRGBFromHSV: function () {
        var rgb = ColorUtil.HSV2RGB(this._valueHue, this._valueSat, this._valueVal);
        this._setColorRGB(rgb[0], rgb[1], rgb[2]);
    },

    _updateColorHEXFromRGB: function () {
        var hex = ColorUtil.RGB2HEX(this._valueR, this._valueG, this._valueB);
        this._setColorHEX(hex);
    },

    _updateColorFromHEX: function () {
        var rgb = ColorUtil.HEX2RGB(this._valueHEX);

        this._setColorRGB(rgb[0], rgb[1], rgb[2]);
        this._updateColorHSVFromRGB();
        this._updateHandles();
    },

    _updateContrastCurrColor: function () {
        this._setContrastCurrColor(this._valueR, this._valueG, this._valueB);
    },
    _updateContrastPrevColor: function () {
        this._setContrasPrevColor(this._valueR, this._valueG, this._valueB)
    },

    _setContrastCurrColor: function (r, g, b) {
        this._colorCurrNode.setStyleProperty('background', 'rgb(' + r + ',' + g + ',' + b + ')')
    },
    _setContrasPrevColor: function (r, g, b) {
        this._colorPrevNode.setStyleProperty('background', 'rgb(' + r + ',' + g + ',' + b + ')')
    },

    _onHeadDragStart: function () {
        var node = this._node,
            parentNode = this._parentNode;

        var nodePos = node.getPositionGlobal(),
            mousePos = Mouse.getInstance().getPosition(),
            offsetPos = this._mouseOffset;

        offsetPos[0] = mousePos[0] - nodePos[0];
        offsetPos[1] = mousePos[1] - nodePos[1];

        var eventMouseMove = DocumentEvent.MOUSE_MOVE,
            eventMouseUp = DocumentEvent.MOUSE_UP;

        var self = this;

        var onDrag = function () {
                self._updatePosition();
                self._updateCanvasNodePositions();
            },

            onDragEnd = function () {
                self._updateCanvasNodePositions();
                document.removeEventListener(eventMouseMove, onDrag, false);
                document.removeEventListener(eventMouseUp, onDragEnd, false);
            };

        parentNode.removeChild(node);
        parentNode.addChild(node);

        document.addEventListener(eventMouseMove, onDrag, false);
        document.addEventListener(eventMouseUp, onDragEnd, false);

        this._updateCanvasNodePositions();
    },

    _updatePosition: function () {
        var mousePos = Mouse.getInstance().getPosition(),
            offsetPos = this._mouseOffset;

        var currPositionX = mousePos[0] - offsetPos[0],
            currPositionY = mousePos[1] - offsetPos[1];

        var node = this._node,
            head = this._headNode,
            position = this._position;

        var maxX = window.innerWidth - node.getWidth(),
            maxY = window.innerHeight - head.getHeight();

        position[0] = Math.max(0, Math.min(currPositionX, maxX));
        position[1] = Math.max(0, Math.min(currPositionY, maxY));

        node.setPositionGlobal(position[0], position[1]);
    },

    _drawCanvasField: function () {
        var canvas = this._canvasField,
            context = this._contextCanvasField;

        var width = canvas.width,
            height = canvas.height,
            invWidth = 1 / width,
            invHeight = 1 / height;

        var imageData = this._imageDataField,
            rgb = [],
            index = 0;

        var valueHue = this._valueHue;

        var i = -1, j;
        while (++i < height) {
            j = -1;

            while (++j < width) {
                rgb = ColorUtil.HSV2RGB(valueHue, j * invWidth * 100.0, ( 1.0 - i * invHeight ) * 100.0);
                index = (i * width + j) * 4;

                imageData.data[index] = rgb[0];
                imageData.data[index + 1] = rgb[1];
                imageData.data[index + 2] = rgb[2];
                imageData.data[index + 3] = 255;
            }
        }

        context.putImageData(imageData, 0, 0);
    },

    _drawCanvasSlider: function () {
        var canvas = this._canvasSlider,
            context = this._contextCanvasSlider;

        var width = canvas.width,
            height = canvas.height,
            invHeight = 1 / height;

        var imageData = this._imageDataSlider,
            rgb = [],
            index = 0;

        var i = -1, j;
        while (++i < height) {
            j = -1;

            while (++j < width) {
                rgb = ColorUtil.HSV2RGB((1.0 - i * invHeight) * 360.0, 100.0, 100.0);
                index = (i * width + j) * 4;

                imageData.data[index] = rgb[0];
                imageData.data[index + 1] = rgb[1];
                imageData.data[index + 2] = rgb[2];
                imageData.data[index + 3] = 255;
            }
        }

        context.putImageData(imageData, 0, 0);

    },

    _onCanvasFieldMouseDown: function () {
        var eventMouseMove = DocumentEvent.MOUSE_MOVE,
            eventMouseUp = DocumentEvent.MOUSE_UP;

        var self = this;

        var onDrag = function () {
                self._drawHandleField();
            },

            onDragEnd = function () {
                document.removeEventListener(eventMouseMove, onDrag, false);
                document.removeEventListener(eventMouseUp, onDragEnd, false);
            };

        document.addEventListener(eventMouseMove, onDrag, false);
        document.addEventListener(eventMouseUp, onDragEnd, false);

        self._drawHandleField();
    },

    _onCanvasSliderMouseDown: function () {
        var eventMouseMove = DocumentEvent.MOUSE_MOVE,
            eventMouseUp = DocumentEvent.MOUSE_UP;

        var self = this;

        var onDrag = function () {
                self._drawHandleSlider();
                self._drawCanvasField();
            },

            onDragEnd = function () {
                document.removeEventListener(eventMouseMove, onDrag, false);
                document.removeEventListener(eventMouseUp, onDragEnd, false);
                self._drawCanvasField();
            };

        document.addEventListener(eventMouseMove, onDrag, false);
        document.addEventListener(eventMouseUp, onDragEnd, false);

        self._drawHandleSlider();
        self._drawCanvasField();
    },

    _setSizeCanvasField: function (width, height) {
        var canvas = this._canvasField;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = width;
        canvas.height = height;

    },

    _setSizeCanvasSlider: function (width, height) {
        var canvas = this._canvasSlider;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = width;
        canvas.height = height;
    },

    open: function () {
        var node = this._node;

        this._parentNode.addChild(node);
        node.setPositionGlobal(window.innerWidth * 0.5 - node.getWidth() * 0.5,
            window.innerHeight * 0.5 - node.getHeight() * 0.5);

        this._updateCanvasNodePositions();
    },

    close: function () {
        this._parentNode.removeChild(this._node);
    },

    _onClose: function (e) {
        e.cancelBubble = true;
        this.close();
    },
    _onPick: function () {
        this._callbackPick();
        this.close();
    },

    _updateCanvasNodePositions: function () {
        var canvasSliderPos = this._canvasSliderPos,
            canvasFieldPos = this._canvasFieldPos;

        canvasSliderPos[0] = canvasSliderPos[1] = 0;
        canvasFieldPos[0] = canvasFieldPos[1] = 0;

        var element = this._canvasSlider;

        while (element) {
            canvasSliderPos[0] += element.offsetLeft;
            canvasSliderPos[1] += element.offsetTop;
            element = element.offsetParent;
        }

        element = this._canvasField;

        while (element) {
            canvasFieldPos[0] += element.offsetLeft;
            canvasFieldPos[1] += element.offsetTop;
            element = element.offsetParent;
        }
    },

    setCallbackPick: function (func) {
        this._callbackPick = func;
    },

    setColorHEX: function (hex) {
        this._setColorHEX(hex);
        this._updateColorFromHEX();
        this._setColor();
    },

    setColorRGB: function (r, g, b) {
        this._setColorRGB(r, g, b);
        this._updateColorHEXFromRGB();
        this._updateColorHSVFromRGB();
        this._setColor();
    },

    setColorRGBfv: function (r, g, b) {
        this.setColorRGB(Math.floor(r * 255.0),
            Math.floor(g * 255.0),
            Math.floor(b * 255.0));
    },

    setColorHSV: function (h, s, v) {
        this._setColorHSV(h, s, v);
        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();
        this._setColor();
    },

    _setColor: function () {
        this._drawCanvasField();
        this._drawCanvasSlider();
        this._updateHandles();
        this._setContrasPrevColor(this._valueR, this._valueG, this._valueB);
    },

    getR: function () {
        return this._valueR;
    },
    getG: function () {
        return this._valueG;
    },
    getB: function () {
        return this._valueB;
    },
    getRGB: function () {
        return [this._valueR, this._valueG, this._valueB];
    },
    getHue: function () {
        return this._valueHue;
    },
    getSat: function () {
        return this._valueSat;
    },
    getVal: function () {
        return this._valueVal;
    },
    getHSV: function () {
        return [this._valueHue, this._valueSat, this._valueVal];
    },
    getHEX: function () {
        return this._valueHEX;
    },
    getRGBfv: function () {
        return [this._valueR / 255.0, this._valueG / 255.0, this._valueB / 255.0];
    },

    getNode: function () {
        return this._node;
    }
};

Picker.setup = function (parentNode) {
    return Picker._instance = new Picker(parentNode);
};
Picker.getInstance = function () {
    return Picker._instance;
};

module.exports = Picker;
},{"../core/color/ColorUtil":37,"../core/document/CSS":38,"../core/document/DocumentEvent":39,"../core/document/Mouse":40,"../core/document/Node":41,"../core/document/NodeEvent":42,"./NumberInput_Internal":13}],20:[function(_dereq_,module,exports){
var SVGComponent = _dereq_('./SVGComponent');

function Plotter(parent,object,value,params) {
    params = params || {};
    params.lineWidth  = params.lineWidth  || 2;
    params.lineColor  = params.lineColor  || [255,255,255];

    SVGComponent.apply(this,arguments);

    var lineWidth = this._lineWidth = params.lineWidth;
    var lineColor = params.lineColor;

    var grid = this._grid = this._svgRoot.appendChild(this._createSVGObject('path'));
        grid.style.stroke = 'rgb(26,29,31)';


    var path = this._path = this._svgRoot.appendChild(this._createSVGObject('path'));
        path.style.stroke      = 'rgb('+lineColor[0]+','+lineColor[1]+','+lineColor[2]+')';
        path.style.strokeWidth = lineWidth ;
        path.style.fill        = 'none';
}

Plotter.prototype = Object.create(SVGComponent.prototype);

module.exports = Plotter;

},{"./SVGComponent":24}],21:[function(_dereq_,module,exports){
var NodeEvent = _dereq_('../core/document/NodeEvent');
var Node = _dereq_('../core/document/Node');
var CSS = _dereq_('../core/document/CSS');

function PresetBtn(parentNode) {
    var btnNode = this._btnNode = new Node(Node.INPUT_BUTTON);
    var indiNode = this._indiNode = new Node();

    this._onActive = function () {};
    this._onDeactive = function () {};
    this._isActive = false;

    btnNode.setStyleClass(CSS.PresetBtn);
    btnNode.addEventListener(NodeEvent.MOUSE_DOWN, this._onMouseDown.bind(this));

    btnNode.addChild(indiNode);
    parentNode.addChildAt(btnNode, 0);
}

PresetBtn.prototype = {
    _onMouseDown: function () {
        var isActive = this._isActive = !this._isActive;

        if (isActive) {
            this._btnNode.setStyleClass(CSS.PresetBtnActive);
            this._onActive();
        }
        else {
            this._btnNode.setStyleClass(CSS.PresetBtn);
            this._onDeactive();
        }
    },

    setOnActive: function (func) {
        this._onActive = func;
    },
    setOnDeactive: function (func) {
        this._onDeactive = func;
    },

    deactivate: function () {
        this._active = false;
        this._btnNode.setStyleClass(CSS.PresetBtn);
    }
};

module.exports = PresetBtn;

},{"../core/document/CSS":38,"../core/document/Node":41,"../core/document/NodeEvent":42}],22:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('./ObjectComponent');
var Node = _dereq_('../core/document/Node');
var NumberInput_Internal = _dereq_('./NumberInput_Internal');
var CSS = _dereq_('../core/document/CSS');

var Event_ = _dereq_('../core/event/Event'),
    ComponentEvent = _dereq_('./ComponentEvent');

var DEFAULT_RANGE_STEP = 1.0,
    DEFAULT_RANGE_DP   = 2;

function Range(parent, object, value, params) {
    ObjectComponent.apply(this,arguments);

    params          = params          || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    params.step     = params.step || DEFAULT_RANGE_STEP;
    params.dp       = params.dp   || DEFAULT_RANGE_DP;

    this._onChange  = params.onChange;
    this._onFinish  = params.onFinish;

    var step = this._step = params.step,
        dp   = this._dp   = params.dp;

    //FIXME: history push pop

    var lablMinNode = new Node();
    var inputMin    = this._inputMin = new NumberInput_Internal(step,dp, this.pushHistoryState.bind(this),
                                                                         this._onInputMinChange.bind(this),
                                                                         this._onInputMinFinish.bind(this));

    var lablMaxNode = new Node();
    var inputMax    = this._inputMax = new NumberInput_Internal(step,dp, this.pushHistoryState.bind(this),
                                                                         this._onInputMaxChange.bind(this),
                                                                         this._onInputMaxFinish.bind(this));

    var wrapLablMin  = new Node().setStyleClass(CSS.Wrap),
        wrapInputMin = new Node().setStyleClass(CSS.Wrap),
        wrapLablMax  = new Node().setStyleClass(CSS.Wrap),
        wrapInputMax = new Node().setStyleClass(CSS.Wrap);


        lablMinNode.setStyleClass(CSS.Label).setProperty('innerHTML','MIN');
        lablMaxNode.setStyleClass(CSS.Label).setProperty('innerHTML','MAX');

    var values = this._object[this._key];

    inputMin.setValue(values[0]);
    inputMax.setValue(values[1]);

    var wrapNode = this._wrapNode;

        wrapLablMin.addChild(lablMinNode);
        wrapInputMin.addChild(inputMin.getNode());
        wrapLablMax.addChild(lablMaxNode);
        wrapInputMax.addChild(inputMax.getNode());

        wrapNode.addChild(wrapLablMin);
        wrapNode.addChild(wrapInputMin);
        wrapNode.addChild(wrapLablMax);
        wrapNode.addChild(wrapInputMax);
}

Range.prototype = Object.create(ObjectComponent.prototype);

Range.prototype._onInputChange = function () {
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
    this._onChange();
};

Range.prototype._onInputFinish = function () {
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
    this._onFinish();
};

Range.prototype._updateValueMin = function () {
    var values = this._object[this._key];

    var inputMin = this._inputMin,
        inputValue = inputMin.getValue();

    if (inputValue >= this._inputMax.getValue()) {
        inputMin.setValue(values[0]);
        return;
    }
    values[0] = inputValue;

};

Range.prototype._updateValueMax = function () {
    var values = this._object[this._key];

    var inputMax = this._inputMax,
        inputValue = inputMax.getValue();

    if (inputValue <= this._inputMin.getValue()) {
        inputMax.setValue(values[1]);
        return;
    }
    values[1] = inputValue;
};


Range.prototype.onValueUpdate = function (e) {
    if (e.data.origin == this){
        return;
    }
    if (e.data.origin == null) {
    }

    var values = this._object[this._key];
    this._inputMin.setValue(this._object[this._key][0]);
    this._inputMax.setValue(this._object[this._key][1]);
};


Range.prototype._onInputMinChange = function () {
    this._updateValueMin();
    this._onInputChange();
};
Range.prototype._onInputMinFinish = function () {
    this._updateValueMin();
    this._onInputFinish();
};
Range.prototype._onInputMaxChange = function () {
    this._updateValueMax();
    this._onInputChange();
};
Range.prototype._onInputMaxFinish = function () {
    this._updateValueMax();
    this._onInputFinish();
};


module.exports = Range;
},{"../core/document/CSS":38,"../core/document/Node":41,"../core/event/Event":46,"./ComponentEvent":9,"./NumberInput_Internal":13,"./ObjectComponent":15}],23:[function(_dereq_,module,exports){
var Component = _dereq_('./Component');
var CSS = _dereq_('../core/document/CSS');
var Metric = _dereq_('../core/Metric');
var GroupEvent = _dereq_('../group/GroupEvent');

function SVG(parent, params) {
    Component.apply(this, arguments);

    var wrapNode = this._wrapNode;
    wrapNode.setStyleClass(CSS.CanvasWrap);
    var wrapSize = wrapNode.getWidth();


    var svg = this._svg = this._createSVGObject('svg');
    svg.setAttribute('version', '1.2');
    svg.setAttribute('baseProfile', 'tiny');
    svg.setAttribute('preserveAspectRatio', 'true');

    wrapNode.getElement().appendChild(svg);

    this._svgSetSize(wrapSize, wrapSize);
    this._updateHeight();


    this._node.setStyleClass(CSS.CanvasListItem);

    this._parent.addEventListener(GroupEvent.GROUP_SIZE_CHANGE, this, 'onGroupSizeChange');
    this.addEventListener(GroupEvent.GROUP_SIZE_UPDATE, this._parent, 'onGroupSizeUpdate');
}

SVG.prototype = Object.create(Component.prototype);

SVG.prototype._updateHeight = function () {
    var svgHeight = Number(this._svg.getAttribute('height'));
    this._wrapNode.setHeight(svgHeight);
    this._node.setHeight(svgHeight + Metric.PADDING_WRAPPER);
};

SVG.prototype.onGroupSizeChange = function () {
    var width = this._wrapNode.getWidth();
    this._svgSetSize(width, width);
    this._updateHeight();
};

SVG.prototype._svgSetSize = function (width, height) {
    var svg = this._svg;
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewbox', '0 0 ' + width + ' ' + height);
};

SVG.prototype.getSVG = function () {
    return this._svg;
};

module.exports = SVG;
},{"../core/Metric":34,"../core/document/CSS":38,"../group/GroupEvent":52,"./Component":8}],24:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('./ObjectComponent');
var CSS = _dereq_('../core/document/CSS');
var GroupEvent = _dereq_('../group/GroupEvent');
var Metric = _dereq_('../core/Metric');

function SVGComponent(parent,object,value,params){
    ObjectComponent.apply(this,arguments);

    var wrapNode = this._wrapNode;
        wrapNode.setStyleClass(CSS.SVGWrap);
    var wrapSize = wrapNode.getWidth();

    var svg = this._svg = this._createSVGObject('svg');
        svg.setAttribute('version', '1.2');
        svg.setAttribute('baseProfile', 'tiny');

        wrapNode.getElement().appendChild(svg);

    var svgRoot = this._svgRoot = svg.appendChild(this._createSVGObject('g'));
        svgRoot.setAttribute('transform','translate(0.5 0.5)');

    this._svgSetSize(wrapSize,wrapSize);
    this._updateHeight();

    this._node.setStyleClass(CSS.SVGListItem);

    this._parent.addEventListener(GroupEvent.GROUP_SIZE_CHANGE, this, 'onGroupSizeChange');
    this.addEventListener(GroupEvent.GROUP_SIZE_UPDATE, this._parent, 'onGroupSizeUpdate');
}

SVGComponent.prototype = Object.create(ObjectComponent.prototype);


SVGComponent.prototype._updateHeight = function(){
    var svgHeight = Number(this._svg.getAttribute('height'));

    this._wrapNode.setHeight(svgHeight);
    this._node.setHeight(svgHeight + Metric.PADDING_WRAPPER);
};

SVGComponent.prototype._redraw = function(){};

SVGComponent.prototype.onGroupSizeChange = function(){
    var width = this._wrapNode.getWidth();

    this._svgSetSize(width,width);
    this._updateHeight();
    this._redraw();
};

SVGComponent.prototype._createSVGObject = function(type) {
    return document.createElementNS("http://www.w3.org/2000/svg",type);
};

SVGComponent.prototype._svgSetSize = function(width,height) {
    var svg = this._svg;
        svg.setAttribute('width',  width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewbox', '0 0 ' + width + ' ' + height);
};


SVGComponent.prototype._pathCmdMoveTo = function (x, y) {
    return 'M ' + x + ' ' + y + ' ';
};

SVGComponent.prototype._pathCmdLineTo = function (x, y) {
    return 'L ' + x + ' ' + y + ' ';
};

SVGComponent.prototype._pathCmdClose = function () {
    return 'Z';
};

SVGComponent.prototype._pathCmdLine = function (x0, y0, x1, y1) {
    return 'M ' + x0 + ' ' + y0 + ' L ' + x1 + ' ' + y1;
};

SVGComponent.prototype._pathCmdBezierCubic = function (cmd, x0, y0, cx0, cy0, cx1, cy1, x1, y1) {
    return 'M ' + x0 + ' ' + y0 + ' C ' + cx0 + ' ' + cy0 + ', ' + cx1 + ' ' + cy1 + ', ' + x1 + ' ' + y1;
};

SVGComponent.prototype._pathCmdBezierQuadratic = function (cmd, x0, y0, cx, cy, x1, y1) {
    return 'M ' + x0 + ' ' + y0 + ' Q ' + cx + ' ' + cy + ', ' + x1 + ' ' + y1;
};

module.exports = SVGComponent;
},{"../core/Metric":34,"../core/document/CSS":38,"../group/GroupEvent":52,"./ObjectComponent":15}],25:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('./ObjectComponent');
var Node = _dereq_('../core/document/Node');
var CSS = _dereq_('../core/document/CSS');

var Options = _dereq_('./Options');

var Event_ = _dereq_('../core/event/Event'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('./ComponentEvent'),
    SelectEvent = _dereq_('./SelectEvent');

var ControlKitShared = _dereq_('../ControlKitShared');

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

    var base = ControlKitShared.get();
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
    if (!this._hasTarget()){
        return;
    }
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

},{"../ControlKitShared":3,"../core/document/CSS":38,"../core/document/Node":41,"../core/document/NodeEvent":42,"../core/event/Event":46,"./ComponentEvent":9,"./ObjectComponent":15,"./Options":16,"./SelectEvent":26}],26:[function(_dereq_,module,exports){
var SelectEvent = {
	SELECT_TRIGGERED: 'selectTrigger',
	TRIGGER_SELECT: 'triggerSelect'
};
module.exports = SelectEvent;
},{}],27:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('./ObjectComponent');
var CSS = _dereq_('../core/document/CSS');
var Slider_Internal = _dereq_('./Slider_Internal');

var History = _dereq_('../core/History');
var Range = _dereq_('./Range');
var NumberInput_Internal = _dereq_('./NumberInput_Internal');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    PanelEvent = _dereq_('../group/PanelEvent'),
    GroupEvent = _dereq_('../group/GroupEvent'),
    ComponentEvent = _dereq_('./ComponentEvent');

var DEFAULT_SLIDER_STEP = 1.0,
    DEFAULT_SLIDER_DP   = 2;


function Slider(parent,object,value,range,params) {
    params          = params          || {};
    params.label    = params.label    || value;

    ObjectComponent.apply(this,[parent,object,range,params]);

    this._values  = this._object[this._key];
    this._targetKey = value;

    params.step     = params.step     || DEFAULT_SLIDER_STEP;
    params.dp       = params.dp       || DEFAULT_SLIDER_DP;
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    this._step     = params.step;
    this._onChange = params.onChange;
    this._onFinish = params.onFinish;
    this._dp       = params.dp;

    var values    = this._values,
        obj       = this._object,
        targetKey = this._targetKey;

    var wrapNode  = this._wrapNode;
        wrapNode.setStyleClass(CSS.WrapSlider);

    var slider = this._slider = new Slider_Internal(wrapNode, this._onSliderBegin.bind(this),
                                                               this._onSliderMove.bind(this),
                                                               this._onSliderEnd.bind(this));

    slider.setBoundMin(values[0]);
    slider.setBoundMax(values[1]);
    slider.setValue(obj[targetKey]);


    var input  = this._input = new NumberInput_Internal(this._step, this._dp,
                                                                    null,
                                                                    this._onInputChange.bind(this),
                                                                    this._onInputChange.bind(this));

    input.setValue(obj[targetKey]);

    wrapNode.addChild(input.getNode());

    this._parent.addEventListener(PanelEvent.PANEL_MOVE_END,    this, 'onPanelMoveEnd');
    this._parent.addEventListener(GroupEvent.GROUP_SIZE_CHANGE, this, 'onGroupWidthChange');
    this._parent.addEventListener(DocumentEvent.WINDOW_RESIZE,     this, 'onWindowResize');
}

Slider.prototype = Object.create(ObjectComponent.prototype);

Slider.prototype.pushHistoryState = function () {
    var obj = this._object,
        key = this._targetKey;
    History.getInstance().pushState(obj, key, obj[key]);
};

Slider.prototype._onSliderBegin = function () {
    this.pushHistoryState();
};

Slider.prototype._onSliderMove = function () {
    this.applyValue();
    this._updateValueField();
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
    this._onChange();
};

Slider.prototype._onSliderEnd = function () {
    this.applyValue();
    this._updateValueField();
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
    this._onFinish();
};

Slider.prototype._onInputChange = function () {
    var input = this._input,
        valueMin = this._values[0],
        valueMax = this._values[1];

    if (input.getValue() >= valueMax){
        input.setValue(valueMax);
    }
    if (input.getValue() <= valueMin){
        input.setValue(valueMin);
    }

    var value = input.getValue();

    this._slider.setValue(value);
    this._object[this._targetKey] = value;
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
    this._onFinish();
};

Slider.prototype.applyValue = function () {
    var value = this._slider.getValue();
    this._object[this._targetKey] = value;
    this._input.setValue(value);
};

//TODO:FIX ME
Slider.prototype.onValueUpdate = function (e) {
    var origin = e.data.origin;

    if (origin == this)return;

    var slider = this._slider;

    if (!(origin instanceof Slider)) {
        var values = this._values;

        //TODO: FIX ME!
        if (origin instanceof Range) {
            slider.setBoundMin(values[0]);
            slider.setBoundMax(values[1]);
            //slider.setValue(this._object[this._targetKey]);
            //this._slider.updateInterpolatedValue();
            this.applyValue();
        }
        else {
            slider.setBoundMin(values[0]);
            slider.setBoundMax(values[1]);
            slider.setValue(this._object[this._targetKey]);
            this.applyValue();
        }
    }
    else {
        slider.setValue(this._object[this._targetKey]);
        this.applyValue();
    }
};


Slider.prototype._updateValueField = function () {
    this._input.setValue(this._slider.getValue());
};

Slider.prototype.onPanelMoveEnd =
    Slider.prototype.onGroupWidthChange =
        Slider.prototype.onWindowResize = function () {
            this._slider.resetOffset();
        };

module.exports = Slider;
},{"../core/History":32,"../core/document/CSS":38,"../core/document/DocumentEvent":39,"../core/event/Event":46,"../group/GroupEvent":52,"../group/PanelEvent":56,"./ComponentEvent":9,"./NumberInput_Internal":13,"./ObjectComponent":15,"./Range":22,"./Slider_Internal":28}],28:[function(_dereq_,module,exports){
var Node = _dereq_('../core/document/Node');

var DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent');


var CSS = _dereq_('../core/document/CSS');
var Mouse = _dereq_('../core/document/Mouse');


function Slider_Internal(parentNode,onBegin,onChange,onFinish) {
    this._bounds   = [0,1];
    this._value    = 0;
    this._interpl  = 0;
    this._focus    = false;


    this._onBegin    = onBegin  || function(){};
    this._onChange   = onChange || function(){};
    this._onFinish   = onFinish || function(){};


    var wrapNode = new Node().setStyleClass(CSS.SliderWrap);
    parentNode.addChild(wrapNode);

    var slot   = this._slot   = {node:    new Node().setStyleClass(CSS.SliderSlot),
                                 offsetX: 0,
                                 width:   0,
                                 padding: 3};

    var handle = this._handle = {node    : new Node().setStyleClass(CSS.SliderHandle),
                                 width   : 0,
                                 dragging: false};

    wrapNode.addChild(slot.node);
    slot.node.addChild(handle.node);

    slot.offsetX = slot.node.getPositionGlobalX();
    slot.width   = Math.floor(slot.node.getWidth() - slot.padding * 2) ;

    handle.node.setWidth(handle.width);

    slot.node.addEventListener(NodeEvent.MOUSE_DOWN,this._onSlotMouseDown.bind(this));
    slot.node.addEventListener(NodeEvent.MOUSE_UP,  this._onSlotMouseUp.bind(this));

    document.addEventListener(DocumentEvent.MOUSE_MOVE,this._onDocumentMouseMove.bind(this));
    document.addEventListener(DocumentEvent.MOUSE_UP,  this._onDocumentMouseUp.bind(this));
};

Slider_Internal.prototype =
{
    _onDocumentMouseMove : function(e)
    {
        if(!this._handle.dragging)return;

        this._update();
        this._onChange();
    },

    _onDocumentMouseUp : function(e)
    {
        if(this._handle.dragging)this._onFinish();
        this._handle.dragging = false;
    },

    _onSlotMouseDown : function()
    {
        this._onBegin();
        this._focus = true;
        this._handle.dragging = true;
        this._handle.node.getElement().focus();
        this._update();
    },

    _onSlotMouseUp : function()
    {
        if(this._focus)
        {
            var handle = this._handle;
            if(handle.dragging)this._onFinish();
            handle.dragging = false;
        }

        this._focus = false;
    },

    _update : function()
    {
        var mx = Mouse.getInstance().getX(),
            sx = this._slot.offsetX,
            sw = this._slot.width,
            px = (mx < sx) ? 0 : (mx > (sx + sw)) ? sw : (mx - sx);

        this._handle.node.setWidth(Math.round(px));
        this._intrpl = px / sw;
        this._interpolateValue();
    },

    //FIXME
    _updateHandle : function()
    {
        var slotWidth   = this._slot.width,
            handleWidth = Math.round(this._intrpl * slotWidth);

        this._handle.node.setWidth(Math.min(handleWidth,slotWidth));
    },

    _interpolateValue : function()
    {
        var intrpl = this._intrpl;
        this._value = this._bounds[0]*(1.0-intrpl)+this._bounds[1]*intrpl;
    },

    resetOffset : function(){var slot = this._slot;
                                 slot.offsetX = slot.node.getPositionGlobalX();
                                 slot.width   = Math.floor(slot.node.getWidth() - slot.padding * 2)},

    setBoundMin : function(value)
    {
        var bounds = this._bounds;
        if(value >= bounds[1])return;

        bounds[0] = value;
        this._interpolateValueRelative();
        this._updateHandle();
    },

    setBoundMax : function(value)
    {
        var bounds = this._bounds;
        if(value <= bounds[0])return;

        bounds[1] = value;
        this._interpolateValueRelative();
        this._updateHandle();
    },

    _interpolateValueRelative : function()
    {
        var boundsMin  = this._bounds[0],
            boundsMax  = this._bounds[1],
            prevIntrpl = Math.abs((this._value - boundsMin) / (boundsMin - boundsMax));

        this._value  = boundsMin*(1.0-prevIntrpl) + boundsMax*prevIntrpl;
        this._intrpl = Math.abs((this._value - boundsMin) / (boundsMin - boundsMax));
    },

    setValue    : function(value)
    {
        var boundsMin = this._bounds[0],
            boundsMax = this._bounds[1];

        if(value < boundsMin || value > boundsMax)return;
        this._intrpl = Math.abs((value-boundsMin) / (boundsMin - boundsMax));
        this._updateHandle();
        this._value  = value;
    },


    getValue : function(){return this._value;}
};


module.exports = Slider_Internal;

//ControlKit.Slider_Internal = function(parentNode,onBegin,onChange,onFinish)
//{
//    this._bounds   = [0,1];
//    this._value    = 0;
//    this._interpl  = 0;
//    this._focus    = false;
//
//    /*---------------------------------------------------------------------------------*/
//
//    this._onBegin    = onBegin  || function(){};
//    this._onChange   = onChange || function(){};
//    this._onFinish   = onFinish || function(){};
//
//    /*---------------------------------------------------------------------------------*/
//
//    var wrapNode = new ControlKit.Node(ControlKit.).setStyleClass(ControlKit.CSS.SliderWrap);
//    parentNode.addChild(wrapNode);
//
//    var slot   = this._slot   = {node:    new ControlKit.Node(ControlKit.).setStyleClass(ControlKit.CSS.SliderSlot),
//                                 offsetX: 0,
//                                 width:   0,
//                                 padding: 3};
//
//    var handle = this._handle = {node    : new ControlKit.Node(ControlKit.).setStyleClass(ControlKit.CSS.SliderHandle),
//                                 width   : 0,
//                                 dragging: false};
//
//    wrapNode.addChild(slot.node);
//    slot.node.addChild(handle.node);
//
//    slot.offsetX = slot.node.getPositionGlobalX();
//    slot.width   = Math.floor(slot.node.getWidth() - slot.padding * 2) ;
//
//    handle.node.setWidth(handle.width);
//
//    slot.node.addEventListener(ControlKit.NodeEvent.MOUSE_DOWN,this._onSlotMouseDown.bind(this));
//    slot.node.addEventListener(ControlKit.NodeEvent.MOUSE_UP,  this._onSlotMouseUp.bind(this));
//
//    document.addEventListener(ControlKit.DocumentEvent.MOUSE_MOVE,this._onDocumentMouseMove.bind(this));
//    document.addEventListener(ControlKit.DocumentEvent.MOUSE_UP,  this._onDocumentMouseUp.bind(this));
//};
//
//ControlKit.Slider_Internal.prototype =
//{
//    _onDocumentMouseMove : function(e)
//    {
//        if(!this._handle.dragging)return;
//
//        this._update();
//        this._onChange();
//    },
//
//    _onDocumentMouseUp : function(e)
//    {
//        if(this._handle.dragging)this._onFinish();
//        this._handle.dragging = false;
//    },
//
//    _onSlotMouseDown : function()
//    {
//        this._onBegin();
//        this._focus = true;
//        this._handle.dragging = true;
//        this._handle.node.getElement().focus();
//        this._update();
//    },
//
//    _onSlotMouseUp : function()
//    {
//        if(this._focus)
//        {
//            var handle = this._handle;
//            if(handle.dragging)this._onFinish();
//            handle.dragging = false;
//        }
//
//        this._focus = false;
//    },
//
//    _update : function()
//    {
//        var mx = ControlKit.Mouse.getInstance().getX(),
//            sx = this._slot.offsetX,
//            sw = this._slot.width,
//            px = (mx < sx) ? 0 : (mx > (sx + sw)) ? sw : (mx - sx);
//
//        this._handle.node.setWidth(Math.round(px));
//        this._intrpl = px / sw;
//        this._interpolateValue();
//    },
//
//    //FIXME
//    _updateHandle : function()
//    {
//        var slotWidth   = this._slot.width,
//            handleWidth = Math.round(this._intrpl * slotWidth);
//
//        this._handle.node.setWidth(Math.min(handleWidth,slotWidth));
//    },
//
//    _interpolateValue : function()
//    {
//        var intrpl = this._intrpl;
//        this._value = this._bounds[0]*(1.0-intrpl)+this._bounds[1]*intrpl;
//    },
//
//    resetOffset : function(){var slot = this._slot;
//                                 slot.offsetX = slot.node.getPositionGlobalX();
//                                 slot.width   = Math.floor(slot.node.getWidth() - slot.padding * 2)},
//
//    setBoundMin : function(value)
//    {
//        var bounds = this._bounds;
//        if(value >= bounds[1])return;
//
//        bounds[0] = value;
//        this._interpolateValueRelative();
//        this._updateHandle();
//    },
//
//    setBoundMax : function(value)
//    {
//        var bounds = this._bounds;
//        if(value <= bounds[0])return;
//
//        bounds[1] = value;
//        this._interpolateValueRelative();
//        this._updateHandle();
//    },
//
//    _interpolateValueRelative : function()
//    {
//        var boundsMin  = this._bounds[0],
//            boundsMax  = this._bounds[1],
//            prevIntrpl = Math.abs((this._value - boundsMin) / (boundsMin - boundsMax));
//
//        this._value  = boundsMin*(1.0-prevIntrpl) + boundsMax*prevIntrpl;
//        this._intrpl = Math.abs((this._value - boundsMin) / (boundsMin - boundsMax));
//    },
//
//    setValue    : function(value)
//    {
//        var boundsMin = this._bounds[0],
//            boundsMax = this._bounds[1];
//
//        if(value < boundsMin || value > boundsMax)return;
//        this._intrpl = Math.abs((value-boundsMin) / (boundsMin - boundsMax));
//        this._updateHandle();
//        this._value  = value;
//    },
//
//
//    getValue : function(){return this._value;}
//};
},{"../core/document/CSS":38,"../core/document/DocumentEvent":39,"../core/document/Mouse":40,"../core/document/Node":41,"../core/document/NodeEvent":42}],29:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('./ObjectComponent');
var Node = _dereq_('../core/document/Node');
var CSS = _dereq_('../core/document/CSS');
var Options = _dereq_('./Options');
var PresetBtn = _dereq_('./PresetBtn');
var Metric = _dereq_('../core/Metric');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    ComponentEvent =  _dereq_('./ComponentEvent');

var DEFAULT_STRING_INPUT_PRESET = null;

function StringInput(parent,object,value,params) {
    ObjectComponent.apply(this,arguments);

    params          = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.presets  = params.presets  || DEFAULT_STRING_INPUT_PRESET;

    this._onChange   = params.onChange;
    this._onFinish   = params.onFinish;

    this._presetsKey = params.presets;

    var input = this._input = new Node(Node.INPUT_TEXT);

    var wrapNode = this._wrapNode;

    if (!this._presetsKey) {
        wrapNode.addChild(input);
    }
    else {
        var inputWrap = new Node();
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

    input.addEventListener(NodeEvent.KEY_UP, this._onInputKeyUp.bind(this));
    input.addEventListener(NodeEvent.CHANGE, this._onInputChange.bind(this));

    input.addEventListener(NodeEvent.MOUSE_DOWN, this._onInputDragStart.bind(this));
    this.addEventListener(ComponentEvent.INPUT_SELECT_DRAG,this._parent,'onComponentSelectDrag');
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
    this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
};

StringInput.prototype.onValueUpdate = function (e) {
    if (e.data.origin == this)return;
    this._input.setProperty('value', this._object[this._key]);
};

//Prevent chrome select drag
StringInput.prototype._onInputDragStart = function () {
    var eventMove = DocumentEvent.MOUSE_MOVE,
        eventUp = DocumentEvent.MOUSE_UP;

    var event = ComponentEvent.INPUT_SELECT_DRAG;
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
},{"../core/Metric":34,"../core/document/CSS":38,"../core/document/DocumentEvent":39,"../core/document/Node":41,"../core/document/NodeEvent":42,"../core/event/Event":46,"./ComponentEvent":9,"./ObjectComponent":15,"./Options":16,"./PresetBtn":21}],30:[function(_dereq_,module,exports){
var Output = _dereq_('./Output');

StringOutput = function (parent, object, value, params) {
    Output.apply(this, arguments);
};

StringOutput.prototype = Object.create(Output.prototype);

StringOutput.prototype._setValue = function () {
    if (this._parent.isDisabled()) {
        return;
    }
    var textAreaString = this._object[this._key];

    if (textAreaString == this._prevString){
        return;
    }
    var textArea = this._textArea,
        textAreaElement = textArea.getElement(),
        textAreaScrollHeight;

    textArea.setProperty('value', textAreaString);
    textAreaScrollHeight = textAreaElement.scrollHeight;
    textArea.setHeight(textAreaScrollHeight);

    var scrollBar = this._scrollBar;

    if (scrollBar) {
        if (textAreaScrollHeight <= this._wrapNode.getHeight()) {
            scrollBar.disable();
        }
        else {
            scrollBar.enable();
            scrollBar.update();
            scrollBar.reset();
        }
    }
    this._prevString = textAreaString;
};

module.exports = StringOutput;

},{"./Output":17}],31:[function(_dereq_,module,exports){
var Plotter = _dereq_('./Plotter');
var Metric = _dereq_('../core/Metric');

var DEFAULT_VALUE_PLOTTER_RESOLUTION = 1;

function ValuePlotter(parent,object,value,params) {
    Plotter.apply(this,arguments);

    var svg       = this._svg,
        svgWidth  = Number(svg.getAttribute('width')),
        svgHeight = Number(svg.getAttribute('height'));

    params            = params            || {};
    params.height     = params.height     || svgHeight;
    params.resolution = params.resolution || DEFAULT_VALUE_PLOTTER_RESOLUTION;

    var resolution = params.resolution,
        length     = Math.floor(svgWidth / resolution);

    var points     = this._points  = new Array(length * 2),
        buffer0    = this._buffer0 = new Array(length),
        buffer1    = this._buffer1 = new Array(length);

    var min = this._lineWidth * 0.5;

    var i = -1;
    while (++i < length) {
        buffer0[i] = buffer1[i] = points[i * 2] = points[i * 2 + 1] = min;
    }

    this._height = params.height = params.height  < Metric.COMPONENT_MIN_HEIGHT ?
                   Metric.COMPONENT_MIN_HEIGHT : params.height;

    this._svgSetSize(svgHeight,Math.floor(params.height));
    this._grid.style.stroke = 'rgb(39,44,46)';

    this._updateHeight();
    this._drawValue();
}

ValuePlotter.prototype = Object.create(Plotter.prototype);

ValuePlotter.prototype._redraw = function () {
    var points = this._points,
        bufferLen = this._buffer0.length;

    var width = Number(this._svg.getAttribute('width')),
        ratio = width / (bufferLen - 1);

    var i = -1;
    while (++i < bufferLen) {
        points[i * 2] = width - i * ratio;
    }

    this._drawValue();
};

ValuePlotter.prototype.onGroupSizeChange = function () {
    var width = this._wrapNode.getWidth(),
        height = this._height;

    this._svgSetSize(width, height);
    this._updateHeight();
    this._drawGrid();
    this._redraw();
};

ValuePlotter.prototype._drawValue = function () {
    this._drawCurve();
};

ValuePlotter.prototype._drawGrid = function () {
    var svg = this._svg;

    var svgWidth = Number(svg.getAttribute('width')),
        svgHeightHalf = Math.floor(Number(svg.getAttribute('height')) * 0.5);

    var pathCmd = '';
        pathCmd += this._pathCmdMoveTo(0, svgHeightHalf);
        pathCmd += this._pathCmdLineTo(svgWidth, svgHeightHalf);

    this._grid.setAttribute('d', pathCmd);
};

//TODO: merge update + pathcmd
ValuePlotter.prototype._drawCurve = function () {
    var svg = this._svg;

    var value = this._object[this._key];

    var buffer0 = this._buffer0,
        buffer1 = this._buffer1,
        points = this._points;

    var bufferLength = buffer0.length;

    var pathCmd = '';

    var heightHalf = Number(svg.getAttribute('height')) * 0.5,
        unit = heightHalf - this._lineWidth * 0.5;

    points[1] = buffer0[0];
    buffer0[bufferLength - 1] = (value * unit) * -1 + Math.floor(heightHalf);

    pathCmd += this._pathCmdMoveTo(points[0], points[1]);

    var i = 0, index;

    while (++i < bufferLength) {
        index = i * 2;

        buffer1[i - 1] = buffer0[i];
        points[index + 1] = buffer0[i - 1] = buffer1[i - 1];

        pathCmd += this._pathCmdLineTo(points[index], points[index + 1]);
    }

    this._path.setAttribute('d', pathCmd);
};

ValuePlotter.prototype.update = function () {
    if (this._parent.isDisabled())return;
    this._drawValue();
}


module.exports = ValuePlotter;


},{"../core/Metric":34,"./Plotter":20}],32:[function(_dereq_,module,exports){
var EventDispatcher = _dereq_('./event/EventDispatcher'),
    Event_ = _dereq_('./event/Event'),
    HistoryEvent = _dereq_('./HistoryEvent');

var MAX_STATES = 30;

function History() {
    EventDispatcher.apply(this, arguments);
    this._states = [];
    this._isDisabled = false;
}

History.prototype = Object.create(EventDispatcher.prototype);

History.prototype.pushState = function (object, key, value) {
    if (this._isDisabled){
        return;
    }

    var states = this._states;
    if (states.length >= MAX_STATES){
        states.shift();
    }
    states.push({object: object, key: key, value: value});
    this.dispatchEvent(new Event_(this, HistoryEvent.STATE_PUSH, null));
};

History.prototype.getState = function (object, key) {
    var states = this._states,
        statesLen = states.length;

    if (statesLen == 0){
        return null;
    }

    var state, value;
    var i = -1;
    while (++i < statesLen) {
        state = states[i];
        if (state.object === object) {
            if (state.key === key) {
                value = state.value;
                break;
            }
        }
    }
    return value;
};

History.prototype.popState = function () {
    if (this._isDisabled){
        return;
    }

    var states = this._states;
    if (states.length < 1){
        return;
    }

    var lastState = states.pop();
    lastState.object[lastState.key] = lastState.value;

    this.dispatchEvent(new Event_(this, History.HISTORY_STATE_POP, null));
};

History.prototype.getNumStates = function () {
    return this._states.length;
};

History._instance = null;

History.setup = function () {
    return History._instance = new History();
};

History.getInstance = function () {
    return History._instance;
};

History.prototype.enable = function () {
    this._isDisabled = false;
};
History.prototype.disable = function () {
    this._isDisabled = true;
};

module.exports = History;

//ControlKit.History.prototype.isDisabled = function(){return this._isDisabled;};ControlKit.History = function()
//{
//    ControlKit.EventDispatcher.apply(this,arguments);
//    this._states   = [];
//    this._isDisabled = false;
//};
//
//ControlKit.History.prototype = Object.create(ControlKit.EventDispatcher.prototype);
//
///*---------------------------------------------------------------------------------*/
//
//ControlKit.History.prototype.pushState = function(object,key,value)
//{
//    if(this._isDisabled)return;
//
//    var states    = this._states,
//        statesMax = ControlKit.Preset.HISTORY_MAX_STATES;
//
//    if(states.length >= statesMax)states.shift();
//    states.push({object:object,key:key,value:value});
//
//    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.STATE_PUSH,null));
//};
//
//ControlKit.History.prototype.getState = function(object,key)
//{
//    var states    = this._states,
//        statesLen = states.length;
//
//    if(statesLen == 0)return null;
//
//    var state,value;
//
//    var i = -1;
//    while(++i < statesLen)
//    {
//        state = states[i];
//
//        if(state.object === object)
//        {
//            if(state.key === key)
//            {
//               value = state.value;
//               break;
//            }
//        }
//    }
//
//    return value;
//};
//
//ControlKit.History.prototype.popState  = function()
//{
//    if(this._isDisabled)return;
//
//    var states = this._states;
//    if(states.length < 1)return;
//
//    var lastState = states.pop();
//    lastState.object[lastState.key] = lastState.value;
//
//    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.STATE_POP,null));
//};
//
//ControlKit.History.prototype.getNumStates = function(){return this._states.length;};
//
///*---------------------------------------------------------------------------------*/
//
//ControlKit.History._instance   = null;
//ControlKit.History.Setup        = function(){return ControlKit.History._instance = new ControlKit.History();};
//ControlKit.History.getInstance = function(){return ControlKit.History._instance;};
//
//ControlKit.History.prototype.enable     = function(){this._isDisabled=false;};
//ControlKit.History.prototype.disable    = function(){this._isDisabled=true;};
//ControlKit.History.prototype.isDisabled = function(){return this._isDisabled;};
},{"./HistoryEvent":33,"./event/Event":46,"./event/EventDispatcher":47}],33:[function(_dereq_,module,exports){
var HistoryEvent = {
	STATE_PUSH: 'historyStatePush',
	STATE_POP: 'historyStatePop'
};

module.exports = HistoryEvent;
},{}],34:[function(_dereq_,module,exports){
var Metric = {
	COMPONENT_MIN_HEIGHT: 25,
	STROKE_SIZE: 1,
	PADDING_WRAPPER: 12,
	PADDING_OPTIONS: 2,
	PADDING_PRESET: 20,

	SCROLLBAR_TRACK_PADDING: 2,
	FUNCTION_PLOTTER_LABEL_TICK_SIZE: 6
};

module.exports = Metric;
},{}],35:[function(_dereq_,module,exports){
var Preset =
{
    /*---------------------------------------------------------------------------------*/

    //HISTORY_MAX_STATES : 30,
    NUMBER_INPUT_SHIFT_MULTIPLIER : 10,

    /*---------------------------------------------------------------------------------*/

    FUNCTION_PLOTTER_NON_IMPLICIT_UNIT_X    :  1,
    FUNCTION_PLOTTER_NON_IMPLICIT_UNIT_Y    :  1,
    FUNCTION_PLOTTER_IMPLICIT_UNIT_X    :  0.25,
    FUNCTION_PLOTTER_IMPLICIT_UNIT_Y    :  0.25,
    FUNCTION_PLOTTER_UNIT_MIN  : 0.15,
    FUNCTION_PLOTTER_UNIT_MAX  : 4,
    FUNCTION_PLOTTER_NON_IMPLICIT_SCALE     : 10.0,
    FUNCTION_PLOTTER_IMPLICIT_SCALE     :1.0,
    FUNCTION_PLOTTER_SCALE_MIN : 0.02,
    FUNCTION_PLOTTER_SCALE_MAX : 25,

    FUNCTION_PLOTTER_IMPLICIT_AXES_COLOR : 'rgba(255,255,255,0.75)',
    FUNCTION_PLOTTER_IMPLICIT_GRID_COLOR : 'rgba(25,25,25,0.75)',

    FUNCTION_PLOTTER_NON_IMPLICIT_AXES_COLOR : 'rgb(54,60,64)',
    FUNCTION_PLOTTER_NON_IMPLICIT_GRID_COLOR : 'rgb(25,25,25)',

    FUNCTION_PLOTTER_CIRCLE_LABEL_RADIUS : 3,
    FUNCTION_PLOTTER_CIRCLE_LABEL_FILL   : 'rgb(255,255,255)',
    FUNCTION_PLOTTER_CIRCLE_STROKE       : '#b12334'

    /*---------------------------------------------------------------------------------*/

};

module.exports = Preset;
},{}],36:[function(_dereq_,module,exports){
var ColorMode = {
	RGB: 'rgb',
	HSV: 'hsv',
	HEX: 'hex',
	RGBfv: 'rgbfv'
};

module.exports = ColorMode;
},{}],37:[function(_dereq_,module,exports){
var ColorUtil = {
	HSV2RGB: function (hue, sat, val) {
		var max_hue = 360.0,
			max_sat = 100.0,
			max_val = 100.0;

		var min_hue = 0.0,
			min_sat = 0,
			min_val = 0;

		hue = hue % max_hue;
		val = Math.max(min_val, Math.min(val, max_val)) / max_val * 255.0;

		if (sat <= min_sat) {
			val = Math.round(val);
			return [val, val, val];
		}
		else if (sat > max_sat)sat = max_sat;

		sat = sat / max_sat;

		//http://d.hatena.ne.jp/ja9/20100903/128350434

		var hi = Math.floor(hue / 60.0) % 6,
			f = (hue / 60.0) - hi,
			p = val * (1 - sat),
			q = val * (1 - f * sat),
			t = val * (1 - (1 - f) * sat);

		var r = 0,
			g = 0,
			b = 0;

		switch (hi) {
			case 0:
				r = val;
				g = t;
				b = p;
				break;
			case 1:
				r = q;
				g = val;
				b = p;
				break;
			case 2:
				r = p;
				g = val;
				b = t;
				break;
			case 3:
				r = p;
				g = q;
				b = val;
				break;
			case 4:
				r = t;
				g = p;
				b = val;
				break;
			case 5:
				r = val;
				g = p;
				b = q;
				break;
			default:
				break;
		}

		r = Math.round(r);
		g = Math.round(g);
		b = Math.round(b);

		return [r, g, b];

	},

	RGB2HSV: function (r, g, b) {
		var h = 0,
			s = 0,
			v = 0;

		r = r / 255.0;
		g = g / 255.0;
		b = b / 255.0;

		var minRGB = Math.min(r, Math.min(g, b)),
			maxRGB = Math.max(r, Math.max(g, b));

		if (minRGB == maxRGB) {
			v = minRGB;
			return [0, 0, Math.round(v)];
		}

		var dd = (r == minRGB) ? g - b : ((b == minRGB) ? r - g : b - r),
			hh = (r == minRGB) ? 3 : ((b == minRGB) ? 1 : 5);

		h = Math.round(60 * (hh - dd / (maxRGB - minRGB)));
		s = Math.round((maxRGB - minRGB) / maxRGB * 100.0);
		v = Math.round(maxRGB * 100.0);

		return [h, s, v];
	},

	RGB2HEX: function (r, g, b) {
		return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
	},

	RGBfv2HEX: function (r, g, b) {
		return ColorUtil.RGB2HEX(Math.floor(r * 255.0),
			Math.floor(g * 255.0),
			Math.floor(b * 255.0));
	},

	HSV2HEX: function (h, s, v) {
		var rgb = ControlKit.ColorUtil.HSV2RGB(h, s, v);
		return ControlKit.ColorUtil.RGB2HEX(rgb[0], rgb[1], rgb[2]);
	},

	HEX2RGB: function (hex) {
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(shorthandRegex, function (m, r, g, b) {
			return r + r + g + g + b + b;
		});

		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;

	},

	isValidHEX: function (hex) {
		return /^#[0-9A-F]{6}$/i.test(hex);
	},

	isValidRGB: function (r, g, b) {
		return r >= 0 && r <= 255 &&
			g >= 0 && g <= 255 &&
			b >= 0 && b <= 255;
	},

	isValidRGBfv: function (r, g, b) {
		return r >= 0 && r <= 1.0 &&
			g >= 0 && g <= 1.0 &&
			b >= 0 && b <= 1.0;
	}
};

module.exports = ColorUtil;
},{}],38:[function(_dereq_,module,exports){
var CSS = {
    ControlKit   : 'controlKit',

    Panel        : 'panel',
    Head         : 'head',
    Label        : 'label',
    Menu         : 'menu',
    Wrap         : 'wrap',

    MenuBtnClose : 'btnClose',
    MenuBtnHide  : 'btnHide',
    MenuBtnShow  : 'btnShow',
    MenuBtnUndo  : 'btnUndo',

    WrapInputWPreset : 'inputWPresetWrap',
    WrapColorWPreset : 'colorWPresetWrap',

    /*-------------------------------------------------------------------------------------*/

    HeadInactive : 'headInactive',
    PanelHeadInactive : 'panelHeadInactive',

    /*-------------------------------------------------------------------------------------*/

    GroupList : 'groupList',
    Group     : 'group',
    SubGroupList  : 'subGroupList',
    SubGroup      : 'subGroup',


    TextAreaWrap : 'textAreaWrap',

    IconArrowUpBig : 'iconArrowUpBig',


    /*-------------------------------------------------------------------------------------*/

    Button       : 'button',

    WrapSlider   : 'wrapSlider',

    SliderWrap   : 'sliderWrap',
    SliderSlot   : 'sliderSlot',
    SliderHandle : 'sliderHandle',

    ArrowBMin    : 'arrowBMin',
    ArrowBMax    : 'arrowBMax',
    ArrowBSubMin : 'arrowBSubMin',
    ArrowBSubMax : 'arrowBSubMax',
    ArrowSMin    : 'arrowSMin',
    ArrowSMax    : 'arrowSMax',

    /*-------------------------------------------------------------------------------------*/

    Select       : 'select',
    SelectActive : 'selectActive',

    Options         : 'options',
    OptionsSelected : 'liSelected',


    SelectColor : 'selectColor',

    /*-------------------------------------------------------------------------------------*/

    PresetBtn        : 'presetBtn',
    PresetBtnActive  : 'presetBtnActive',

    /*-------------------------------------------------------------------------------------*/

    CanvasListItem  : 'canvasListItem',
    CanvasWrap      : 'canvasWrap',

    SVGListItem     : 'svgListItem',
    SVGWrap         : 'svgWrap',

    GraphSliderXWrap   : 'graphSliderXWrap',
    GraphSliderYWrap   : 'graphSliderYWrap',
    GraphSliderX       : 'graphSliderX',
    GraphSliderY       : 'graphSliderY',
    GraphSliderXHandle : 'graphSliderXHandle',
    GraphSliderYHandle : 'graphSliderYHandle',

    /*-------------------------------------------------------------------------------------*/

    Picker              : 'picker',
    PickerPalleteWrap   : 'palleteWrap',
    PickerFieldWrap     : 'fieldWrap',
    PickerInputWrap     : 'inputWrap',
    PickerInputField    : 'inputField',
    PickerControlsWrap  : 'controlsWrap',
    PickerColorContrast : 'colorContrast',

    PickerHandleField  : 'indicator',
    PickerHandleSlider : 'indicator',

    Color : 'color',

    /*-------------------------------------------------------------------------------------*/

    ScrollBar        : 'scrollBar',
    ScrollWrap       : 'scrollWrap',
    ScrollbarBtnUp   : 'btnUp',
    ScrollbarBtnDown : 'btnDown',
    ScrollbarTrack   : 'track',
    ScrollbarThumb   : 'thumb',
    ScrollBuffer     : 'scrollBuffer',

    /*-------------------------------------------------------------------------------------*/

    Trigger : 'controlKitTrigger',

    SizeHandle : 'sizeHandle'
};

module.exports = CSS;

},{}],39:[function(_dereq_,module,exports){
var DocumentEvent = {
    MOUSE_MOVE : 'mousemove',
    MOUSE_UP   : 'mouseup',
    MOUSE_DOWN : 'mousedown',

    WINDOW_RESIZE : 'resize'
};

module.exports = DocumentEvent;
},{}],40:[function(_dereq_,module,exports){
var DocumentEvent = _dereq_('./DocumentEvent');

function Mouse() {
    this._pos = [0, 0];
    document.addEventListener(DocumentEvent.MOUSE_MOVE, this._onDocumentMouseMove.bind(this));
}

Mouse._instance = null;

Mouse.prototype._onDocumentMouseMove = function (e) {
    var dx = 0,
        dy = 0;

    if (!e)e = window.event;
    if (e.pageX) {
        dx = e.pageX;
        dy = e.pageY;
    }
    else if (e.clientX) {
        dx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        dy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    this._pos[0] = dx;
    this._pos[1] = dy;
};

Mouse.prototype.getPosition = function () {
    return this._pos;
};

Mouse.prototype.getX = function () {
    return this._pos[0];
};

Mouse.prototype.getY = function () {
    return this._pos[1];
};

Mouse.setup = function () {
    if(Mouse._instance){
        return;
    }
    Mouse._instance = new Mouse();
};

Mouse.getInstance = function () {
    return Mouse._instance;
};

module.exports = Mouse;
},{"./DocumentEvent":39}],41:[function(_dereq_,module,exports){
function Node() {
    this._element = null;

    switch (arguments.length){
        case 1 :
            var arg = arguments[0];
            if (arg != Node.INPUT_TEXT &&
                arg != Node.INPUT_BUTTON &&
                arg != Node.INPUT_SELECT &&
                arg != Node.INPUT_CHECKBOX) {
                this._element = document.createElement(arg);
            }
            else {
                this._element = document.createElement('input');
                this._element.type = arg;
            }
            break;
        case 0:
            this._element = document.createElement('div');
            break;
    }
}

Node.DIV = 'div';
Node.INPUT_TEXT = '';
Node.INPUT_TEXT = 'text';
Node.INPUT_BUTTON = 'button';
Node.INPUT_SELECT = 'select';
Node.INPUT_CHECKBOX = 'checkbox';
Node.OPTION = 'option';
Node.LIST = 'ul';
Node.LIST_ITEM = 'li';
Node.SPAN = 'span';
Node.TEXTAREA = 'textarea';

Node.prototype = {
    addChild: function (node) {
        this._element.appendChild(node.getElement());
        return node;
    },

    addChildren: function () {
        var i = -1, l = arguments.length, e = this._element;
        while (++i < l) {
            e.appendChild(arguments[i].getElement());
        }
        return this;
    },

    addChildAt: function (node, index) {
        this._element.insertBefore(node.getElement(), this._element.children[index]);
        return node;
    },

    removeChild: function (node) {
        if (!this.contains(node))return null;
        this._element.removeChild(node.getElement());
        return node;
    },

    removeChildren: function () {
        var i = -1, l = arguments.length, e = this._element;
        while (++i < l) {
            e.removeChild(arguments[i].getElement());
        }
        return this;
    },

    removeChildAt: function (node, index) {
        if (!this.contains(node))return null;
        this._element.removeChild(node.getElement());
        return node;
    },

    removeAllChildren: function () {
        var element = this._element;
        while (element.hasChildNodes())element.removeChild(element.lastChild);
        return this;
    },

    setWidth: function (value) {
        this._element.style.width = value + 'px';
        return this;
    },
    getWidth: function () {
        return this._element.offsetWidth;
    },

    setHeight: function (value) {
        this._element.style.height = value + 'px';
        return this;
    },
    getHeight: function () {
        return this._element.offsetHeight;
    },

    setPosition: function (x, y) {
        return this.setPosition(x).setPosition(y);
    },
    setPositionX: function (x) {
        this._element.style.marginLeft = x + 'px';
        return this;
    },
    setPositionY: function (y) {
        this._element.style.marginTop = y + 'px';
        return this;
    },

    setPositionGlobal: function (x, y) {
        return this.setPositionGlobalX(x).setPositionGlobalY(y);
    },
    setPositionGlobalX: function (x) {
        this._element.style.left = x + 'px';
        return this;
    },
    setPositionGlobalY: function (y) {
        this._element.style.top = y + 'px';
        return this;
    },

    getPosition: function () {
        return [this.getPositionX(), this.getPositionY()];
    },
    getPositionX: function () {
        return this._element.offsetLeft;
    },
    getPositionY: function () {
        return this._element.offsetTop;
    },

    getPositionGlobal: function () {
        var offset = [0, 0],
            element = this._element;

        while (element) {
            offset[0] += element.offsetLeft;
            offset[1] += element.offsetTop;
            element = element.offsetParent;
        }

        return offset;
    },

    getPositionGlobalX: function () {
        var offset = 0,
            element = this._element;

        while (element) {
            offset += element.offsetLeft;
            element = element.offsetParent;
        }

        return offset;
    },

    getPositionGlobalY: function () {
        var offset = 0,
            element = this._element;

        while (element) {
            offset += element.offsetTop;
            element = element.offsetParent;
        }

        return offset;
    },

    addEventListener: function (type, listener, useCapture) {
        this._element.addEventListener(type, listener, useCapture);
        return this;
    },
    removeEventListener: function (type, listener, useCapture) {
        this._element.removeEventListener(type, listener, useCapture);
        return this;
    },

    setStyleClass: function (style) {
        this._element.className = style;
        return this;
    },
    setStyleProperty: function (property, value) {
        this._element.style[property] = value;
        return this;
    },
    getStyleProperty: function (property) {
        return this._element.style[property];
    },
    setStyleProperties: function (properties) {
        for (var p in properties)this._element.style[p] = properties[p];
        return this;
    },

    deleteStyleClass: function () {
        this._element.className = '';
        return this
    },
    deleteStyleProperty: function (property) {
        this._element.style[property] = '';
        return this;
    },
    deleteStyleProperties: function (properties) {
        for (var p in properties)this._element.style[p] = '';
        return this;
    },

    getChildAt: function (index) {
        return new Node().setElement(this._element.children[index]);
    },
    getChildIndex: function (node) {
        return this._indexOf(this._element, node.getElement());
    },
    getNumChildren: function () {
        return this._element.children.length;
    },
    getFirstChild: function () {
        return new Node().setElement(this._element.firstChild);
    },
    getLastChild: function () {
        return new Node().setElement(this._element.lastChild);
    },
    hasChildren: function () {
        return this._element.children.length != 0;
    },
    contains: function (node) {
        return this._indexOf(this._element, node.getElement()) != -1;
    },

    _indexOf: function (parentElement, element) {
        return Array.prototype.indexOf.call(parentElement.children, element);
    },

    setProperty: function (property, value) {
        this._element[property] = value;
        return this;
    },
    setProperties: function (properties) {
        for (var p in properties)this._element[p] = properties[p];
        return this;
    },
    getProperty: function (property) {
        return this._element[property];
    },


    setElement: function (element) {
        this._element = element;
        return this;
    },
    getElement: function () {
        return this._element;
    },

    getStyle: function () {
        return this._element.style;
    },

    getParent: function () {
        return new Node().setElement(this._element.parentNode);
    }
};

Node.getNodeByElement = function (element) {
    return new Node().setElement(element);
};
Node.getNodeById = function (id) {
    return new Node().setElement(document.getElementById(id));
};

module.exports = Node;

//ControlKit.Node = function()
//{
//    this._element = null;
//
//    if(arguments.length == 1)
//    {
//        var arg  = arguments[0];
//
//        if(arg != ControlKit.NodeType.INPUT_TEXT   &&
//           arg != ControlKit.NodeType.INPUT_BUTTON &&
//           arg != ControlKit.NodeType.INPUT_SELECT &&
//           arg != ControlKit.NodeType.INPUT_CHECKBOX)
//        {
//            this._element = document.createElement(arg);
//        }
//        else
//        {
//            this._element = document.createElement('input');
//            this._element.type = arg;
//        }
//    }
//};
//
//ControlKit.Node.prototype =
//{
//    addChild   : function(node)
//    {
//        this._element.appendChild(node.getElement());
//        return node;
//    },
//
//    addChildren : function()
//    {
//        var i = -1,l = arguments.length,e = this._element;
//        while(++i < l){e.appendChild(arguments[i].getElement());}
//        return this;
//    },
//
//    addChildAt : function(node,index)
//    {
//        this._element.insertBefore(node.getElement(),this._element.children[index]);
//        return node;
//    },
//
//    removeChild : function(node)
//    {
//        if(!this.contains(node))return null;
//        this._element.removeChild(node.getElement());
//        return node;
//    },
//
//    removeChildren : function()
//    {
//        var i = -1, l = arguments.length, e = this._element;
//        while(++i<l){e.removeChild(arguments[i].getElement());}
//        return this;
//    },
//
//    removeChildAt : function(node,index)
//    {
//        if(!this.contains(node))return null;
//        this._element.removeChild(node.getElement());
//        return node;
//    },
//
//    removeAllChildren : function()
//    {
//        var element = this._element;
//        while(element.hasChildNodes())element.removeChild(element.lastChild);
//        return this;
//    },
//
//    setWidth  : function(value){this._element.style.width = value + 'px'; return this;},
//    getWidth  : function()     {return this._element.offsetWidth;},
//
//    setHeight : function(value){this._element.style.height = value + 'px'; return this;},
//    getHeight : function()     {return this._element.offsetHeight;},
//
//    setPosition  : function(x,y){ return this.setPosition(x).setPosition(y);},
//    setPositionX : function(x)  {this._element.style.marginLeft = x + 'px';return this;},
//    setPositionY : function(y)  {this._element.style.marginTop  = y + 'px';return this;},
//
//    setPositionGlobal  : function(x,y){return this.setPositionGlobalX(x).setPositionGlobalY(y);},
//    setPositionGlobalX : function(x)  {this._element.style.left = x + 'px';return this;},
//    setPositionGlobalY : function(y)  {this._element.style.top  = y + 'px';return this;},
//
//    getPosition  : function(){return [this.getPositionX(),this.getPositionY()];},
//    getPositionX : function(){return this._element.offsetLeft;},
//    getPositionY : function(){return this._element.offsetTop;},
//
//    getPositionGlobal : function()
//    {
//        var offset  = [0,0],
//            element = this._element;
//
//        while(element)
//        {
//            offset[0] += element.offsetLeft;
//            offset[1] += element.offsetTop;
//            element    = element.offsetParent;
//        }
//
//        return offset;
//    },
//
//    getPositionGlobalX : function()
//    {
//        var offset  = 0,
//            element = this._element;
//
//        while(element)
//        {
//            offset += element.offsetLeft;
//            element = element.offsetParent;
//        }
//
//        return offset;
//    },
//
//    getPositionGlobalY : function()
//    {
//        var offset  = 0,
//            element = this._element;
//
//        while(element)
//        {
//            offset += element.offsetTop;
//            element = element.offsetParent;
//        }
//
//        return offset;
//    },
//
//    addEventListener    : function(type,listener,useCapture){this._element.addEventListener(   type, listener, useCapture); return this;},
//    removeEventListener : function(type,listener,useCapture){this._element.removeEventListener(type, listener, useCapture);return this;},
//
//    setStyleClass      : function(style)         {this._element.className = style; return this;},
//    setStyleProperty   : function(property,value){this._element.style[property] = value; return this;},
//    getStyleProperty   : function(property)      {return this._element.style[property];},
//    setStyleProperties : function(properties)    {for(var p in properties)this._element.style[p] = properties[p];return this;},
//
//    deleteStyleClass      : function()           {this._element.className = '';return this},
//    deleteStyleProperty   : function(property)   {this._element.style[property] = '';return this;},
//    deleteStyleProperties : function(properties) {for(var p in properties)this._element.style[p] = '';return this;},
//
//    getChildAt     : function(index) {return new ControlKit.Node().setElement(this._element.children[index]);},
//    getChildIndex  : function(node)  {return this._indexOf(this._element,node.getElement());},
//    getNumChildren : function()      {return this._element.children.length;},
//    getFirstChild  : function()      {return new ControlKit.Node().setElement(this._element.firstChild);},
//    getLastChild   : function()      {return new ControlKit.Node().setElement(this._element.lastChild);},
//    hasChildren    : function()      {return this._element.children.length != 0;},
//    contains       : function(node)  {return this._indexOf(this._element,node.getElement()) != -1;},
//
//    _indexOf       : function(parentElement,element){return Array.prototype.indexOf.call(parentElement.children,element);},
//
//    setProperty   : function(property, value){this._element[property] = value;return this;},
//    setProperties : function(properties)     {for(var p in properties)this._element[p] = properties[p];return this;},
//    getProperty   : function(property)       {return this._element[property];},
//
//
//    setElement : function(element){this._element = element;return this;},
//    getElement : function()       { return this._element;},
//
//    getStyle   : function()       {return this._element.style;},
//
//    getParent  : function(){ return new ControlKit.Node().setElement(this._element.parentNode); }
//};
//
//ControlKit.Node.getNodeByElement = function(element){return new ControlKit.Node().setElement(element);};
//ControlKit.Node.getNodeById      = function(id)     {return new ControlKit.Node().setElement(document.getElementById(id));};
//

},{}],42:[function(_dereq_,module,exports){
var NodeEvent = {
    MOUSE_DOWN   : 'mousedown',
    MOUSE_UP     : 'mouseup',
    MOUSE_OVER   : 'mouseover',
    MOUSE_MOVE   : 'mousemove',
    MOUSE_OUT    : 'mouseout',
    KEY_DOWN     : 'keydown',
    KEY_UP       : 'keyup',
    CHANGE       : 'change',
    FINISH       : 'finish',
    DBL_CLICK    : 'dblclick',
    ON_CLICK     : 'click',
    SELECT_START : 'selectstart',
    DRAG_START   : 'dragstart',
    DRAG         : 'drag',
    DRAG_END     : 'dragend',

    DRAG_ENTER   : 'dragenter',
    DRAG_OVER    : 'dragover',
    DRAG_LEAVE   : 'dragleave',

    RESIZE       : 'resize'
};

module.exports = NodeEvent;
},{}],43:[function(_dereq_,module,exports){
var Style = { 
	string : "/*------------------------------------------------------------------------------------- * Panel *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Components *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Canvas *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * ScrollBar *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Group & subGroup *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Menu *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Options *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Picker *-------------------------------------------------------------------------------------*/body {  margin: 0;  padding: 0; }#controlKit {  position: absolute;  top: 0;  left: 0;  width: 100%;  height: 100%;  user-select: none; }  #controlKit * {    outline: 0; }  #controlKit .panel input[type='text'],  #controlKit .panel textarea,  #controlKit .panel .color,  #controlKit .picker input[type='text'] {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    height: 25px;    width: 100%;    padding: 0 0 0 8px;    font-family: arial, sans-serif;    font-size: 11px;    color: white;    text-shadow: 1px 1px black;    background: #222729;    background-image: -o-linear-gradient(transparent 0%, rgba(0, 0, 0, 0.125) 100%);    background-image: linear-gradient(transparent 0%, rgba(0, 0, 0, 0.125) 100%);    border: none;    box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;    border-radius: 2px;    -moz-border-radius: 2px;    border-bottom: 1px solid #3b4447;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -o-user-select: none; }  #controlKit .panel .color {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    width: 100%;    height: 25px;    line-height: 25px;    background: #fff;    text-align: center;    padding: 0;    -webkit-touch-callout: none;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none;    cursor: pointer;    border: none;    box-shadow: 0 0 0 1px #111314 inset;    border-radius: 2px;    -moz-border-radius: 2px;    border-bottom: 1px solid #3b4447; }  #controlKit .panel .button,  #controlKit .picker .button,  #controlKit .panel .select,  #controlKit .panel .selectActive {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    width: 100%;    height: 26px;    margin: -2px 0 0 0;    cursor: pointer;    background: #3c494e;    background-image: -o-linear-gradient(rgba(34, 39, 41, 0) 0%, rgba(34, 39, 41, 0.65) 100%);    background-image: linear-gradient(rgba(34, 39, 41, 0) 0%, rgba(34, 39, 41, 0.65) 100%);    font-family: arial, sans-serif;    color: white;    border: none;    border-radius: 2px;    -moz-border-radius: 2px;    box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #323a44 inset;    border-bottom: 1px solid #3b4447;    outline: 0; }  #controlKit .panel .button, #controlKit .picker .button {    font-size: 10px;    font-weight: bold;    text-shadow: 0 -1px black;    text-transform: uppercase; }    #controlKit .panel .button:hover, #controlKit .picker .button:hover {      background-image: none; }    #controlKit .panel .button:active, #controlKit .picker .button:active {      background-image: -o-linear-gradient(rgba(0, 0, 0, 0.1) 0%, transparent 100%);      background-image: linear-gradient(rgba(0, 0, 0, 0.1) 0%, transparent 100%); }  #controlKit .panel {    position: relative;    z-index: 1;    margin: 0;    padding: 0;    width: 300px;    background-color: #303639;    box-shadow: 0 0 1px 1px rgba(0, 0, 0, 0.25);    font-family: arial, sans-serif;    -webkit-touch-callout: none;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none;    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    border-radius: 2px;    -moz-border-radius: 2px;    overflow: hidden;    opacity: 1.0;    float: left; }    #controlKit .panel textarea {      padding: 5px 8px 2px 8px;      overflow: hidden;      resize: none;      vertical-align: top;      white-space: nowrap; }    #controlKit .panel input[type='checkbox'] {      margin: 5px 0 0 0; }    #controlKit .panel .select, #controlKit .panel .selectActive {      padding-left: 10px;      padding-right: 20px;      font-size: 11px;      text-align: left;      text-shadow: 1px 1px black;      cursor: pointer;      overflow: hidden;      white-space: nowrap;      text-overflow: ellipsis; }    #controlKit .panel .select {      background: url(data:image/png;base64,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) 100% 50% no-repeat, -o-linear-gradient(#3a464b 0%, rgba(44, 52, 55, 0) 100%);      background: url(data:image/png;base64,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) 100% 50% no-repeat, linear-gradient(#3a464b 0%, rgba(44, 52, 55, 0) 100%); }    #controlKit .panel .select:hover, #controlKit .panel .selectActive {      background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAALCAYAAAB24g05AAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAMNJREFUeNqckjEKwjAUhj8l53AQ526BHKKLIhSlHkHxBkkuIFWPILQOQQd3V4VuXiguFlrFRPzhLXl833uB10uznCaP+q4BEqls83Y5HghFtOH1amkAit2+IwkmzXIGw5HeFFvfZFNs/WA40mmW470P1gf8LokJRCIV11vN9bb42C6RKvoDAdhX/RXxqO8G0F/6FjBBQSIV8+mE2XTcaVTuTOlO0Q36gCndyVbu/A5Hp7fvwLymaeBnuHNILQm/wgDPAQAPNIsHnO794QAAAABJRU5ErkJggg==) 100% 50% no-repeat, #3c494e; }    #controlKit .panel .presetBtn, #controlKit .panel .presetBtnActive {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      position: absolute;      right: 0;      width: 20px;      height: 25px;      margin: 0 0 0 0;      cursor: pointer;      float: right;      border: none;      border-top-right-radius: 2px;      border-bottom-right-radius: 2px;      box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #323a44 inset;      border-bottom: 1px solid #3b4447; }    #controlKit .panel .presetBtnActive, #controlKit .panel .presetBtn:hover {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #3c494e; }    #controlKit .panel .presetBtn {      background: url(data:image/png;base64,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) 50% 50% no-repeat, -o-linear-gradient(#3a464b 0%, #2c3437 100%);      background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAG5JREFUeNpi5ODiamRgYKhjwA4amVx8gxjmL1rC8P3rVxQ8b+ESBhffIAZmNR29A5evXWdiZGC019XSZGBgYGBYvmY9w7I16xoZGBgaWKBG1S9bs+4/AwNDPQMDA1ySgYGBgdEnPAbZzgY0mgEwAE9lJT1lrsffAAAAAElFTkSuQmCC) 50% 50% no-repeat, linear-gradient(#3a464b 0%, #2c3437 100%); }    #controlKit .panel .scrollBar {      -webkit-box-sizing: content-box;      -moz-box-sizing: content-box;      box-sizing: content-box;      width: 17px;      height: 100%;      float: right;      top: 0;      padding: 0;      margin: 0;      position: relative;      background: #212628;      background-image: linear-gradient(to right, #15181a 0%, rgba(26, 29, 31, 0) 100%); }      #controlKit .panel .scrollBar .track {        padding: 0 3px 0 2px; }        #controlKit .panel .scrollBar .track .thumb {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          width: 13px;          position: absolute;          cursor: pointer;          background: #3b484e;          background-image: -o-linear-gradient(#3a4145 0%, #363c40 100%);          background-image: linear-gradient(#3a4145 0%, #363c40 100%);          border: 1px solid #15181a;          border-radius: 2px;          -moz-border-radius: 2px;          box-shadow: inset 0 1px 0 0 #434b50; }    #controlKit .panel .wrap {      width: auto;      height: auto;      margin: 0;      padding: 0;      position: relative;      overflow: hidden; }    #controlKit .panel .inputWPresetWrap, #controlKit .panel .colorWPresetWrap {      width: 100%;      float: left; }    #controlKit .panel .inputWPresetWrap input[type='text'], #controlKit .panel .colorWPresetWrap .color {      padding-right: 25px;      border-top-right-radius: 2px;      border-bottom-right-radius: 2px;      float: left; }    #controlKit .panel .textAreaWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 100%;      padding: 0;      float: left;      height: 100%;      overflow: hidden;      border-radius: 2px;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447;      background-color: #222729;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      background-image: -o-linear-gradient(transparent 0%, rgba(0, 0, 0, 0.125) 100%);      background-image: linear-gradient(transparent 0%, rgba(0, 0, 0, 0.125) 100%); }      #controlKit .panel .textAreaWrap textarea {        border: none;        border-top-right-radius: 0;        border-bottom-right-radius: 0;        border-radius: 2px;        -moz-border-radius: 2px;        box-shadow: none;        background: none; }      #controlKit .panel .textAreaWrap .scrollBar {        border: 1px solid #101213;        border-bottom-right-radius: 2px;        border-top-right-radius: 2px;        border-left: none;        box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset; }    #controlKit .panel .graphSliderXWrap, #controlKit .panel .graphSliderYWrap {      position: absolute;      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box; }    #controlKit .panel .graphSliderXWrap {      bottom: 0;      left: 0;      width: 100%;      padding: 6px 20px 6px 6px; }    #controlKit .panel .graphSliderYWrap {      top: 0;      right: 0;      height: 100%;      padding: 6px 6px 20px 6px; }    #controlKit .panel .graphSliderX, #controlKit .panel .graphSliderY {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border-radius: 2px;      -moz-border-radius: 2px;      background: rgba(24, 27, 29, 0.5);      border: 1px solid #181b1d; }    #controlKit .panel .graphSliderX {      height: 8px; }    #controlKit .panel .graphSliderY {      width: 8px;      height: 100%; }    #controlKit .panel .graphSliderXHandle, #controlKit .panel .graphSliderYHandle {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      cursor: pointer;      border: 1px solid #181b1d;      background: #303639; }    #controlKit .panel .graphSliderXHandle {      width: 20px;      height: 100%;      border-top: none;      border-bottom: none; }    #controlKit .panel .graphSliderYHandle {      width: 100%;      height: 20px;      border-left: none;      border-right: none; }    #controlKit .panel .scrollWrap {      position: relative;      overflow: hidden; }    #controlKit .panel .scrollBuffer {      width: 100%;      height: 8px;      border-top: 1px solid #3b4447;      border-bottom: 1px solid #1e2224; }    #controlKit .panel canvas {      cursor: pointer;      vertical-align: bottom;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447; }    #controlKit .panel .svgWrap, #controlKit .panel .canvasWrap {      margin: 6px 0 0 0;      position: relative;      width: 70%;      float: right;      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border: none;      border-radius: 2px;      -moz-border-radius: 2px;      background: #1e2224;      background-image: -o-linear-gradient(transparent 0%, rgba(0, 0, 0, 0.05) 100%);      background-image: linear-gradient(transparent 0%, rgba(0, 0, 0, 0.05) 100%); }      #controlKit .panel .svgWrap svg, #controlKit .panel .canvasWrap svg {        position: absolute;        left: 0;        top: 0;        cursor: pointer;        vertical-align: bottom;        border: none;        box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;        border-radius: 2px;        -moz-border-radius: 2px;        border-bottom: 1px solid #3b4447; }    #controlKit .panel ul {      margin: 0;      padding: 0;      list-style: none; }    #controlKit .panel .groupList .group .head {      height: 38px;      border-top: 1px solid #566166;      border-bottom: 1px solid #1a1d1f;      padding: 0 20px 0 15px;      background-image: -o-linear-gradient(#3c4a4f 0%, #383f47 100%);      background-image: linear-gradient(#3c4a4f 0%, #383f47 100%);      cursor: pointer; }      #controlKit .panel .groupList .group .head .label {        font-size: 12px;        line-height: 38px;        color: white; }      #controlKit .panel .groupList .group .head:hover {        background-image: -o-linear-gradient(#3c4a4f 0%, #3c4a4f 100%);        background-image: linear-gradient(#3c4a4f 0%, #3c4a4f 100%); }    #controlKit .panel .groupList .group li {      height: 35px;      padding: 0 10px 0 10px; }    #controlKit .panel .groupList .group .subGroupList {      padding: 10px;      border-top: 1px solid #3b4447;      border-bottom: 1px solid #1e2224; }      #controlKit .panel .groupList .group .subGroupList .subGroup {        padding: 0;        margin-top: 6px;        height: auto;        border: 1px solid #1e2224;        border-radius: 2px;        -moz-border-radius: 2px;        box-shadow: 0 1px 0 0 #3b4447; }        #controlKit .panel .groupList .group .subGroupList .subGroup ul {          overflow: hidden; }        #controlKit .panel .groupList .group .subGroupList .subGroup:first-child {          margin-top: 0; }        #controlKit .panel .groupList .group .subGroupList .subGroup .head {          height: 26px;          padding: 0 10px 0 10px;          border-top: none;          border-bottom: 1px solid #1e2224;          border-top-left-radius: 2px;          border-top-right-radius: 2px;          background-image: none;          background-color: #25282b;          cursor: pointer; }          #controlKit .panel .groupList .group .subGroupList .subGroup .head:hover {            background-image: none;            background-color: #222629; }        #controlKit .panel .groupList .group .subGroupList .subGroup li:nth-child(odd) {          background-color: #292d30; }        #controlKit .panel .groupList .group .subGroupList .subGroup li:nth-child(even) {          background-color: #303639; }        #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          height: 26px;          padding: 0 10px 0 10px;          background-image: -o-linear-gradient(#3a4145 0%, #363c40 100%);          background-image: linear-gradient(#3a4145 0%, #363c40 100%);          box-shadow: 0 1px 0 0 #434b50 inset;          cursor: pointer; }          #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive:hover {            background-image: none;            background-color: #3a4145; }        #controlKit .panel .groupList .group .subGroupList .subGroup .head .label, #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive .label {          margin: 0;          padding: 0;          line-height: 26px;          color: white;          font-weight: bold;          font-size: 11px;          text-shadow: 1px 1px black;          text-transform: capitalize; }        #controlKit .panel .groupList .group .subGroupList .subGroup .head .wrap .label, #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive .wrap .label {          width: 100%;          font-weight: bold;          color: white;          padding: 0; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .label {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          height: 100%;          width: 30%;          padding: 10px 5px 0 0;          float: left;          font-size: 11px;          font-weight: normal;          color: #aeb5b8;          text-shadow: 1px 1px black; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          width: 70%;          padding: 6px 0 0 0;          float: right;          height: 100%; }          #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap .wrap {            width: 25%;            padding: 0;            float: left; }            #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap .wrap .label {              width: 100%;              padding: 4px 0 0 0;              color: #878787;              text-align: center;              text-transform: uppercase;              font-weight: bold;              text-shadow: 1px 1px #1a1a1a; }            #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap .wrap input[type='text'] {              padding: 0;              text-align: center; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap {          background: #25282b; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap {          background: none; }      #controlKit .panel .groupList .group .subGroupList .head .wrap, #controlKit .panel .groupList .group .subGroupList .headInactive .wrap {        background: none; }    #controlKit .panel .groupList .group:last-child .subGroupList, #controlKit .panel .groupList .group:last-child .scrollBuffer:nth-of-type(3) {      border-bottom: none; }    #controlKit .panel .groupList .group:last-child .scrollWrap .subGroupList {      border-bottom: 1px solid #1e2224; }    #controlKit .panel .wrapSlider {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 70%;      padding: 6px 0 0 0;      float: right;      height: 100%; }      #controlKit .panel .wrapSlider input[type='text'] {        width: 25%;        text-align: center;        padding: 0;        float: right; }    #controlKit .panel .sliderWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      float: left;      cursor: ew-resize;      width: 70%; }    #controlKit .panel .sliderSlot {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 100%;      height: 25px;      padding: 3px;      background-color: #1e2224;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447; }    #controlKit .panel .sliderHandle {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      position: relative;      width: 100%;      height: 100%;      background: #b32435;      background-image: -o-linear-gradient(transparent 0%, rgba(0, 0, 0, 0.1) 100%);      background-image: linear-gradient(transparent 0%, rgba(0, 0, 0, 0.1) 100%);      box-shadow: 0 1px 0 0 #0f0f0f; }    #controlKit .panel .canvasListItem, #controlKit .panel .svgListItem {      padding: 0 10px 0 10px; }    #controlKit .panel .arrowSMax {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowSMin {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowSMax, #controlKit .panel .arrowSMin {      width: 100%;      height: 20px; }    #controlKit .panel .arrowBMax {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowBMin {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowBSubMax {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowBSubMin {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowBMax, #controlKit .panel .arrowBMin, #controlKit .panel .arrowBSubMax, #controlKit .panel .arrowBSubMin {      width: 10px;      height: 100%;      float: right; }  #controlKit .panel .sizeHandle {    float: left;    width: 10px;    height: 100px;    border-left: 1 py; }  #controlKit .panel .label, #controlKit .picker .label {    width: 100%;    float: left;    font-size: 11px;    font-weight: bold;    text-shadow: 0 -1px black;    overflow: hidden;    white-space: nowrap;    text-overflow: ellipsis;    cursor: default; }  #controlKit .panel .head, #controlKit .picker .head, #controlKit .panel .panelHeadInactive {    height: 30px;    padding: 0 10px 0 10px;    background: #1a1d1f; }    #controlKit .panel .head .wrap, #controlKit .picker .head .wrap, #controlKit .panel .panelHeadInactive .wrap {      width: auto;      height: auto;      margin: 0;      padding: 0;      position: relative;      overflow: hidden; }  #controlKit .panel .head, #controlKit .picker .head {    border-top: 1px solid #202426;    border-bottom: 1px solid #111314; }    #controlKit .panel .head .label, #controlKit .picker .head .label {      cursor: pointer;      line-height: 30px;      color: #65696b; }  #controlKit .panel .panelHeadInactive {    border-top: 1px solid #202426; }  #controlKit .panel .menu, #controlKit .picker .menu {    float: right;    padding: 5px 0 0 0; }    #controlKit .panel .menu input[type='button'], #controlKit .picker .menu input[type='button'] {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      cursor: pointer;      height: 20px;      margin-left: 4px;      border: none;      border-radius: 2px;      -moz-border-radius: 2px;      font-family: arial, sans-serif;      font-size: 10px;      font-weight: bold;      color: #aaaaaa;      text-shadow: 0 -1px black;      text-transform: uppercase;      box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #212527 inset;      border-bottom: 1px solid #24292b; }    #controlKit .panel .menu .btnHide, #controlKit .panel .menu .btnShow, #controlKit .panel .menu .btnClose, #controlKit .picker .menu .btnHide, #controlKit .picker .menu .btnShow, #controlKit .picker .menu .btnClose {      width: 20px; }    #controlKit .panel .menu .btnHide, #controlKit .picker .menu .btnHide {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #1a1d1f; }      #controlKit .panel .menu .btnHide:hover, #controlKit .picker .menu .btnHide:hover {        background: url(data:image/png;base64,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) 50% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }    #controlKit .panel .menu .btnShow, #controlKit .picker .menu .btnShow {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #1a1d1f; }      #controlKit .panel .menu .btnShow:hover, #controlKit .picker .menu .btnShow:hover {        background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAFpJREFUeNpsjDEOgCAQBOc4eqNfoCB8wMrCnwk/82EHWEkwcatJZrKyrFsGLv5X/H6cqPc41Y9ptVLN0BDT3VsTETnFuVkWIGuICWBEvfchAfz0mqvZ4BeeAQDzViMzJy0RXgAAAABJRU5ErkJggg==) 50% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }    #controlKit .panel .menu .btnClose, #controlKit .picker .menu .btnClose {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #1a1d1f; }      #controlKit .panel .menu .btnClose:hover, #controlKit .picker .menu .btnClose:hover {        background: url(data:image/png;base64,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) 50% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }    #controlKit .panel .menu .btnUndo, #controlKit .picker .menu .btnUndo {      background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAYVJREFUeNpckD1IW1EYhp9z7rm3oqkhzZ/xD6tR1EpFKelghlBonVwKDpaWDnbq2lVF0MHBUbdCp5aCUigdnISgoUPAqWMlYsGlNtYK1Zhzzr1dVG7zbt/L97x87yceTz0lrHKp+BJYBHqurG/AfC5f+AwgwkC5VHybyrTPdvdmA9f1BEJQO//LYWWfk+OfS7l8YeEGKJeKr7ND99aT6QzWmHPgE+AAM47rcnR4wI/K/qS8Ts90dq+lMh1YY1aBFuAF8AyQVuvNrrt9xOKJjyIau/MOGJp49ORhrXZh9r7ubgPPc/nCr3A36TjG931HDY+OTyjP6w8AKR01MvagcFqtxoH/gLPT3wexRDKrIrdbd6Tj9AshcD0PQaTa3BI5oUFa13sIAiTwyrd2wWqNqV/uAR3AccOrPyRSbUrX63/Ulbfk+34FxJdyqdgELAO3gDgwPTBy/3pvRoWC3gMkUm3pSDT6RkqJcl3iyXQQWIs1ZgXYUo239g4M1sKz1fo7MAdsAPwbAL9hftvTlNkdAAAAAElFTkSuQmCC) 20% 50% no-repeat, #1a1d1f;      padding: 0 6px 1px 0;      width: 38px;      vertical-align: top;      text-align: end; }      #controlKit .panel .menu .btnUndo:hover, #controlKit .picker .menu .btnUndo:hover {        background: url(data:image/png;base64,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) 20% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }  #controlKit .picker {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    border-radius: 2px;    -moz-border-radius: 2px;    background-color: #303639;    font-family: arial, sans-serif;    font-size: 11px;    color: white;    text-shadow: 1px 1px black;    position: absolute;    z-index: 2147483631;    width: 360px;    -webkit-touch-callout: none;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none;    box-shadow: 0 0 1px 1px rgba(0, 0, 0, 0.25); }    #controlKit .picker canvas {      vertical-align: bottom;      cursor: pointer; }    #controlKit .picker .wrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      padding: 10px;      float: left; }    #controlKit .picker .fieldWrap {      padding: 3px; }    #controlKit .picker .sliderWrap {      padding: 3px 13px 3px 3px; }    #controlKit .picker .fieldWrap, #controlKit .picker .sliderWrap, #controlKit .picker .inputWrap {      height: auto;      overflow: hidden;      float: left; }    #controlKit .picker .inputWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border: 1px solid #1e2224;      border-radius: 2px;      -moz-border-radius: 2px;      box-shadow: 0 1px 0 0 #3b4447;      width: 140px;      float: right;      padding: 5px 10px 1px 0; }    #controlKit .picker .inputField {      width: 50%;      float: right;      margin-bottom: 4px; }      #controlKit .picker .inputField .label {        padding: 4px 0 0 0;        color: #878787;        text-align: center;        text-transform: uppercase;        font-weight: bold;        text-shadow: 1px 1px #1a1a1a;        width: 40%; }      #controlKit .picker .inputField .wrap {        padding: 0;        width: 60%;        height: auto;        float: right; }    #controlKit .picker .controlsWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 100%;      height: auto;      float: right;      padding: 9px 0 0 0; }      #controlKit .picker .controlsWrap input[type='button'] {        float: right;        width: 65px;        margin: 0 0 0 10px; }    #controlKit .picker .colorContrast {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447;      width: 100%;      height: 25px;      padding: 3px;      width: 80%;      margin-bottom: 4px;      float: right; }      #controlKit .picker .colorContrast div {        width: 50%;        height: 100%;        float: left; }    #controlKit .picker input[type='text'] {      padding: 0;      text-align: center;      width: 60%;      float: right; }    #controlKit .picker .wrap .inputWrap:nth-of-type(3) {      border-bottom-left-radius: 0;      border-bottom-right-radius: 0; }    #controlKit .picker .wrap .inputWrap:nth-of-type(4) {      border-top: none;      border-top-left-radius: 0;      border-top-right-radius: 0; }      #controlKit .picker .wrap .inputWrap:nth-of-type(4) .inputField {        width: 100%; }        #controlKit .picker .wrap .inputWrap:nth-of-type(4) .inputField .label {          width: 20%; }      #controlKit .picker .wrap .inputWrap:nth-of-type(4) input[type='text'] {        width: 80%; }    #controlKit .picker .fieldWrap, #controlKit .picker .sliderWrap {      background: #1e2224;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447;      position: relative;      margin-right: 5px; }      #controlKit .picker .fieldWrap .indicator, #controlKit .picker .sliderWrap .indicator {        position: absolute;        border: 2px solid white;        box-shadow: 0 1px black, 0 1px black inset;        cursor: pointer; }    #controlKit .picker .fieldWrap .indicator {      width: 8px;      height: 8px;      left: 50%;      top: 50%;      border-radius: 50%;      -moz-border-radius: 50%; }    #controlKit .picker .sliderWrap .indicator {      width: 14px;      height: 3px;      border-radius: 8px;      -moz-border-radius: 8px;      left: 1px;      top: 1px; }      #controlKit .picker .sliderWrap .indicator:after {        content: '';        width: 0;        height: 0;        border-top: 4.5px solid transparent;        border-bottom: 4.5px solid transparent;        border-right: 4px solid white;        float: right;        position: absolute;        top: -2px;        left: 19px; }      #controlKit .picker .sliderWrap .indicator:before {        content: '';        width: 0;        height: 0;        border-top: 4.5px solid transparent;        border-bottom: 4.5px solid transparent;        border-right: 4px solid black;        float: right;        position: absolute;        top: -3px;        left: 19px; }  #controlKit .options {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    border: 1px solid #131313;    border-radius: 2px;    -moz-border-radius: 2px;    position: absolute;    left: 0;    top: 0;    width: auto;    height: auto;    z-index: 2147483638;    font-family: arial, sans-serif;    font-size: 11px;    color: white;    text-shadow: 1px 1px black;    box-shadow: 0 1px 0 0 #566166 inset;    overflow: hidden;    background-color: #3c494e; }    #controlKit .options ul {      width: 100%;      list-style: none;      margin: 0;      padding: 0; }      #controlKit .options ul li {        margin: 0;        width: 100%;        height: 28px;        line-height: 28px;        padding: 0 20px 0 10px;        overflow: hidden;        white-space: normal;        text-overflow: ellipsis;        cursor: pointer; }        #controlKit .options ul li:hover {          background-color: #1f2325; }      #controlKit .options ul .liSelected {        background-color: #292d30; }    #controlKit .options .color {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box; }      #controlKit .options .color li, #controlKit .options .color .liSelected {        -webkit-box-sizing: border-box;        -moz-box-sizing: border-box;        box-sizing: border-box;        padding: 0;        height: 25px;        line-height: 25px;        text-align: center; }        #controlKit .options .color li:hover, #controlKit .options .color .liSelected:hover {          background: none;          font-weight: bold; }      #controlKit .options .color .liSelected {        font-weight: bold; }"
}; 
module.exports = Style;
},{}],44:[function(_dereq_,module,exports){
var Error = {
    COLOR_FORMAT_HEX                  : 'Color format should be hex. Set colorMode to rgb, rgbfv or hsv.',
    COLOR_FORMAT_RGB_RGBFV_HSV        : 'Color format should be rgb, rgbfv or hsv. Set colorMode to hex.',
    COLOR_PRESET_FORMAT_HEX           : 'Preset color format should be hex.',
    COLOR_PRESET_FORMAT_RGB_RGBFV_HSV : 'Preset color format should be rgb, rgbfv or hsv.',
    COMPONENT_OBJECT                  : 'Object ',
    COMPONENT_OBJECT_MEMBER_REFERENCE : ' has no member ',
    TYPE                              : ' should be of type ',
    COMPONENT_FUNCTION_LENGTH         : 'Function should be of form f(x) or f(x,y).',
    END                               : '.'
};

module.exports = Error;
},{}],45:[function(_dereq_,module,exports){
var ErrorUtil = {
    ReferenceError : function(object,key)       {return (object[key] === undefined);},
    TypeError      : function(object,value,type){return Object.prototype.toString.call(object[value]) !== Object.prototype.toString.call(type);}
};

module.exports = ErrorUtil;
},{}],46:[function(_dereq_,module,exports){
function Event_(sender,type,data) {
    this.sender = sender;
    this.type   = type;
    this.data   = data;
}

Event.prototype.clone = function() {
    return new Event_(this.sender,this.type,this.data);
};

module.exports = Event_;
},{}],47:[function(_dereq_,module,exports){
function EventDispatcher() {
    this._listeners = [];
}

EventDispatcher.prototype = {
    addEventListener: function (eventType, listener, callbackMethod) {
        this._listeners[eventType] = this._listeners[eventType] || [];
        this._listeners[eventType].push({obj: listener, method: callbackMethod});
    },

    dispatchEvent: function (event) {
        var type = event.type;

        if (!this.hasEventListener(type)){
            return;
        }

        var listeners = this._listeners[type];
        var i = -1, l = listeners.length;

        var obj, method;

        while (++i < l) {
            obj = listeners[i].obj;
            method = listeners[i].method;

            if (!obj[method]){
                throw obj + ' has no method ' + method;
            }

            obj[method](event);
        }
    },

    removeEventListener: function (type, obj, method) {
        if (!this.hasEventListener(type)){
            return;
        }

        var listeners = this._listeners[type];

        var i = listeners.length;
        while (--i > -1) {
            if (listeners[i].obj == obj && listeners[i].method == method) {
                listeners.splice(i, 1);
                if (listeners.length == 0){
                    delete this._listeners[type];
                }
                break;
            }
        }
    },

    removeAllEventListeners: function () {
        this._listeners = [];
    },


    hasEventListener: function (type) {
        return this._listeners[type] != undefined && this._listeners[type] != null;
    }
};

module.exports = EventDispatcher;
},{}],48:[function(_dereq_,module,exports){
var LayoutMode = {
    LEFT   : 'left',
    RIGHT  : 'right',
    TOP    : 'top',
    BOTTOM : 'bottom',
    NONE   : 'none'
};

module.exports = LayoutMode;
},{}],49:[function(_dereq_,module,exports){
var Node = _dereq_('../document/Node');
var Metric = _dereq_('../Metric');
var CSS = _dereq_('../document/CSS');
var DocumentEvent = _dereq_('../document/DocumentEvent'),
    NodeEvent = _dereq_('../document/NodeEvent');
var Mouse = _dereq_('../document/Mouse');

// /TODO: Add mouseoffset & reset..
function ScrollBar(parentNode,targetNode,wrapHeight) {
    this._parentNode = parentNode;
    this._targetNode = targetNode;
    this._wrapHeight = wrapHeight;

    var wrap   = this._wrapNode   = new Node(),
        node   = this._node       = new Node(),
        track  = this._trackNode  = new Node(),
        thumb  = this._thumbNode  = new Node();

    parentNode.removeChild(targetNode);
    parentNode.addChild(wrap);
    parentNode.addChildAt(node,0);

    wrap.addChild(targetNode);
    node.addChild(track);
    track.addChild(thumb);

    wrap.setStyleClass(CSS.ScrollWrap);
    node.setStyleClass(CSS.ScrollBar);
    track.setStyleClass(CSS.ScrollbarTrack);
    thumb.setStyleClass(CSS.ScrollbarThumb);

    this._scrollHeight = 0;
    this._scrollUnit   = 0;

    this._scrollMin    = 0;
    this._scrollMax    = 1;
    this._scrollPos    = 0;

    thumb.setPositionY(Metric.SCROLLBAR_TRACK_PADDING);
    thumb.addEventListener(NodeEvent.MOUSE_DOWN,this._onThumbDragStart.bind(this));

    this._isValid  = false;
    this._isDisabled = false;
}

ScrollBar.prototype =
{
    update: function () {
        var target = this._targetNode,
            thumb = this._thumbNode;

        var padding = Metric.SCROLLBAR_TRACK_PADDING;

        var targetWrapHeight = this._wrapHeight,
            targetHeight = target.getHeight(),
            trackHeight = targetWrapHeight - padding * 2;

        thumb.setHeight(trackHeight);

        var ratio = targetWrapHeight / targetHeight;

        this._isValid = false;

        if (ratio > 1.0){
            return;
        }

        var thumbHeight = trackHeight * ratio;

        this._scrollHeight = trackHeight - thumbHeight;
        this._scrollUnit = targetHeight - trackHeight - padding * 2;

        thumb.setHeight(thumbHeight);

        this._isValid = true;

        /*
         var scrollMin = this._scrollMin,
         scrollMax = this._scrollMax,
         scrollPos = this._scrollPos;

         var scrollPosNorm = (scrollPos - scrollMin) / (scrollMax - scrollPos);
         */
    },

    _scrollThumb: function (y) {
        var thumb = this._thumbNode,
            thumbHeight = thumb.getHeight();

        var track = this._trackNode,
            trackHeight = this._wrapHeight,
            trackTop = track.getPositionGlobalY(),
            trackCenter = trackHeight * 0.5;

        var target = this._targetNode;

        var scrollHeight = this._scrollHeight,
            scrollUnit = this._scrollUnit;

        var min = this._scrollMin = trackCenter - scrollHeight * 0.5,
            max = this._scrollMax = trackCenter + scrollHeight * 0.5;

        var pos = Math.max(min, Math.min(y - trackTop, max));

        var thumbPos = this._scrollPos = pos - thumbHeight * 0.5,
            targetPos = -(pos - min) / (max - min) * scrollUnit;

        thumb.setPositionY(thumbPos);
        target.setPositionY(targetPos);
    },

    _onThumbDragStart: function () {
        if (!this._isValid || this._isDisabled){
            return;
        }

        var eventMouseMove = DocumentEvent.MOUSE_MOVE,
            eventMouseUp = DocumentEvent.MOUSE_UP;

        var self = this;

        var mouse = Mouse.getInstance();

        //TODO:add
        this._scrollOffset = mouse.getY() - this._thumbNode.getPositionGlobalY();

        var onDrag = function () {
                self._scrollThumb(mouse.getY());
            },

            onDragEnd = function () {
                document.removeEventListener(eventMouseMove, onDrag, false);
                document.removeEventListener(eventMouseUp, onDragEnd, false);
            };

        this._scrollThumb(mouse.getY());
        document.addEventListener(eventMouseMove, onDrag, false);
        document.addEventListener(eventMouseUp, onDragEnd, false);
    },

    enable: function () {
        this._isDisabled = false;
        this._updateAppearance();
    },
    disable: function () {
        this._isDisabled = true;
        this._updateAppearance();
    },

    reset: function () {
        this._scrollThumb(0);
    },

    _updateAppearance: function () {
        if (this._isDisabled) {
            this._node.setStyleProperty('display', 'none');
            this._targetNode.setPositionY(0);
            this._thumbNode.setPositionY(Metric.SCROLLBAR_TRACK_PADDING);
        }
        else {
            this._node.setStyleProperty('display', 'block');
        }
    },

    isValid: function () {
        return this._isValid;
    },

    setWrapHeight: function (height) {
        this._wrapHeight = height;
        this.update();
    },

    removeTargetNode: function () {
        return this._wrapNode.removeChild(this._targetNode);
    },

    removeFromParent: function () {
        var parentNode = this._parentNode,
            rootNode = this._node,
            targetNode = this._targetNode;

        rootNode.removeChild(targetNode);
        parentNode.removeChild(this._wrapNode);
        parentNode.removeChild(rootNode);

        return targetNode;
    },

    getWrapNode: function () {
        return this._wrapNode;
    },
    getNode: function () {
        return this._node;
    },
    getTargetNode: function () {
        return this._targetNode;
    }
};

module.exports = ScrollBar;
},{"../Metric":34,"../document/CSS":38,"../document/DocumentEvent":39,"../document/Mouse":40,"../document/Node":41,"../document/NodeEvent":42}],50:[function(_dereq_,module,exports){
var EventDispatcher = _dereq_('../core/event/EventDispatcher');
var Node = _dereq_('../core/document/Node');
var ScrollBar = _dereq_('../core/layout/ScrollBar');

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


},{"../core/document/Node":41,"../core/event/EventDispatcher":47,"../core/layout/ScrollBar":49}],51:[function(_dereq_,module,exports){
var AbstractGroup = _dereq_('./AbstractGroup');
var CSS = _dereq_('../core/document/CSS');
var Node = _dereq_('../core/document/Node');

var SubGroup = _dereq_('./SubGroup');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    PanelEvent = _dereq_('./PanelEvent'),
    GroupEvent = _dereq_('./GroupEvent');

var GroupNoSubGroupError = _dereq_('./GroupNoSubGroupError');

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
        var headNode  = new Node(),
            lablWrap  = new Node(),
            lablNode  = new Node(Node.SPAN),
            indiNode  = this._indiNode = new Node();

            headNode.setStyleClass(CSS.Head);
            lablWrap.setStyleClass(CSS.Wrap);
            lablNode.setStyleClass(CSS.Label);
            indiNode.setStyleClass(CSS.ArrowBMax);
            lablNode.setProperty('innerHTML',label);

            headNode.addChild(indiNode);
            lablWrap.addChild(lablNode);
            headNode.addChild(lablWrap);
            rootNode.addChild(headNode);

        headNode.addEventListener(NodeEvent.MOUSE_DOWN,this._onHeadTrigger.bind(this));
        this.addEventListener(GroupEvent.GROUP_LIST_SIZE_CHANGE,this._parent,'onGroupListSizeChange');

        this._updateAppearance();
    }

    if(this.hasMaxHeight()){
        this.addScrollWrap();
    }

    rootNode.addChild(wrapNode);

    if(this.hasMaxHeight()){
        if(!label){
            var bufferTop = this._scrollBufferTop = new Node();
                bufferTop.setStyleClass(CSS.ScrollBuffer);

            rootNode.addChildAt(bufferTop,0);
        }
        var bufferBottom = this._scrollBufferBottom = new Node();
            bufferBottom.setStyleClass(CSS.ScrollBuffer);

        rootNode.addChild(bufferBottom);
    }

    this._parent.addEventListener(PanelEvent.PANEL_MOVE_BEGIN, this, 'onPanelMoveBegin');
    this._parent.addEventListener(PanelEvent.PANEL_MOVE, this, 'onPanelMove');
    this._parent.addEventListener(PanelEvent.PANEL_MOVE_END, this, 'onPanelMoveEnd');
    this._parent.addEventListener(PanelEvent.PANEL_HIDE, this, 'onPanelHide');
    this._parent.addEventListener(PanelEvent.PANEL_SHOW, this, 'onPanelShow');
    this._parent.addEventListener(PanelEvent.PANEL_SCROLL_WRAP_ADDED, this, 'onPanelScrollWrapAdded');
    this._parent.addEventListener(PanelEvent.PANEL_SCROLL_WRAP_REMOVED, this, 'onPanelScrollWrapRemoved');
    this._parent.addEventListener(PanelEvent.PANEL_SIZE_CHANGE, this, 'onPanelSizeChange');
    this._parent.addEventListener(DocumentEvent.WINDOW_RESIZE, this, 'onWindowResize');

    this.addEventListener(GroupEvent.GROUP_SIZE_CHANGE,this._parent,'onGroupListSizeChange');
}

Group.prototype = Object.create(AbstractGroup.prototype);

Group.prototype.onPanelMoveBegin = function () {
    this.dispatchEvent(new Event_(this, PanelEvent.PANEL_MOVE_BEGIN, null));
};

Group.prototype.onPanelMove = function () {
    this.dispatchEvent(new Event_(this, PanelEvent.PANEL_MOVE, null));
};

Group.prototype.onPanelMoveEnd = function () {
    this.dispatchEvent(new Event_(this, PanelEvent.PANEL_MOVE_END, null));
};

Group.prototype.onPanelScrollWrapAdded = function () {
    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_SIZE_CHANGE, null));
};

Group.prototype.onPanelScrollWrapRemoved = function () {
    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_SIZE_CHANGE, null));
};

Group.prototype.onPanelHide = function () {
    this.dispatchEvent(new Event_(this, GroupEvent.SUBGROUP_DISABLE, null));
};

Group.prototype.onPanelShow = function () {
    this.dispatchEvent(new Event_(this, GroupEvent.SUBGROUP_ENABLE, null));
};

Group.prototype.onPanelSizeChange = function () {
    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_SIZE_CHANGE, null));
};

Group.prototype.onWindowResize = function (e) {
    this.dispatchEvent(e);
};

Group.prototype.onSubGroupTrigger = function () {
    this._updateHeight();

    if(!this.hasMaxHeight()){
        return;
    }

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

    this.dispatchEvent(new Event_(this,GroupEvent.GROUP_SIZE_CHANGE,null));
};

Group.prototype._onHeadTrigger = function () {
    this._isDisabled = !this._isDisabled;
    this._updateAppearance();
    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_LIST_SIZE_CHANGE, null));
};

Group.prototype.addComponent = function(){
    var Class_ = arguments[0];
    var args   = Array.prototype.slice.call(arguments);
        args.shift();
        args.unshift(this._getSubGroup());

    var instance = Object.create(Class_.prototype);
    Class_.apply(instance,args);

    this._components.push(instance);
    this._updateHeight();
};

Group.prototype._updateHeight = function () {
    this._getSubGroup().update();
    this.dispatchEvent(new Event_(this,GroupEvent.GROUP_SIZE_CHANGE,null));
    if(this.hasMaxHeight()){
        this._scrollBar.update();
    }
};

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
    this._subGroups.push(new SubGroup(this, params));
    this._updateHeight();
    return this;
};

Group.prototype._getSubGroup = function () {
    var subGroups = this._subGroups,
        subGroupsLen = subGroups.length;

    if (subGroupsLen == 0){
        throw new GroupNoSubGroupError();
    }
    return subGroups[subGroupsLen - 1];
};

Group.prototype.getComponents = function () {
    return this._components;
};

module.exports = Group;

},{"../core/document/CSS":38,"../core/document/DocumentEvent":39,"../core/document/Node":41,"../core/document/NodeEvent":42,"../core/event/Event":46,"./AbstractGroup":50,"./GroupEvent":52,"./GroupNoSubGroupError":53,"./PanelEvent":56,"./SubGroup":58}],52:[function(_dereq_,module,exports){
var GroupEvent = {
	GROUP_SIZE_CHANGE        : 'groupSizeChange',
	GROUP_LIST_SIZE_CHANGE   : 'groupListSizeChange',
	GROUP_SIZE_UPDATE        : 'groupSizeUpdate',
	SUBGROUP_TRIGGER         : 'subGroupTrigger',

	COMPONENTS_ENABLE         : 'enableCompo',
	COMPONENTS_DISABLE        : 'disableComps',

	SUBGROUP_ENABLE          : 'enableSubGroup',
	SUBGROUP_DISABLE         : 'disableSubGroup'
};

module.exports = GroupEvent;
},{}],53:[function(_dereq_,module,exports){
function GroupNoSubGroupError() {
	Error.apply(this);
	Error.captureStackTrace(this,GroupNoSubGroupError);
	this.name = 'PanelNoGroupError';
	this.message = 'Group has no SubGroup.';
}
GroupNoSubGroupError.prototype = Object.create(Error.prototype);
GroupNoSubGroupError.constructor = GroupNoSubGroupError;

module.exports = GroupNoSubGroupError;
},{}],54:[function(_dereq_,module,exports){
var MenuEvent = {
	UPDATE_MENU: 'updateMenu'
};
module.exports = MenuEvent;
},{}],55:[function(_dereq_,module,exports){
var Node = _dereq_('../core/document/Node'),
    Group = _dereq_('./Group'),
    ScrollBar = _dereq_('../core/layout/ScrollBar');

var CSS = _dereq_('../core/document/CSS');
var LayoutMode = _dereq_('../core/layout/LayoutMode');
var History = _dereq_('../core/History');

var EventDispatcher = _dereq_('../core/event/EventDispatcher'),
    Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    PanelEvent = _dereq_('./PanelEvent'),
    MenuEvent = _dereq_('./MenuEvent');

var Mouse = _dereq_('../core/document/Mouse');

var PanelNoGroupError = _dereq_('./PanelNoGroupError');

var StringInput = _dereq_('../component/StringInput'),
    NumberInput = _dereq_('../component/NumberInput'),
    Range = _dereq_('../component/Range'),
    Checkbox = _dereq_('../component/Checkbox'),
    Color = _dereq_('../component/Color'),
    Button = _dereq_('../component/Button'),
    Select = _dereq_('../component/Select'),
    Slider = _dereq_('../component/Slider'),
    FunctionPlotter = _dereq_('../component/FunctionPlotter'),
    Pad = _dereq_('../component/Pad'),
    ValuePlotter = _dereq_('../component/ValuePlotter'),
    NumberOutput = _dereq_('../component/NumberOutput'),
    StringOutput = _dereq_('../component/StringOutput'),
    Canvas_ = _dereq_('../component/Canvas'),
    SVG_ = _dereq_('../component/SVG');

var DEFAULT_PANEL_POSITION = null,
    DEFAULT_PANEL_WIDTH      = 300,
    DEFAULT_PANEL_HEIGHT     = null,
    DEFAULT_PANEL_WIDTH_MIN  = 100,
    DEFAULT_PANEL_WIDTH_MAX  = 600,
    DEFAULT_PANEL_RATIO      = 40,
    DEFAULT_PANEL_LABEL      = 'Control Panel',
    DEFAULT_PANEL_VALIGN     = LayoutMode.TOP,
    DEFAULT_PANEL_ALIGN      = LayoutMode.RIGHT,
    DEFAULT_PANEL_DOCK       = {align:LayoutMode.RIGHT,resizable:true},
    DEFAULT_PANEL_ENABLE     = true,
    DEFAULT_PANEL_OPACITY    = 1.0,
    DEFAULT_PANEL_FIXED      = true,
    DEFAULT_PANEL_VCONSTRAIN = true;

function Panel(controlKit,params){
    EventDispatcher.apply(this,arguments);
    this._parent = controlKit;


    params            = params           || {};
    params.valign     = params.valign    || DEFAULT_PANEL_VALIGN;
    params.align      = params.align     || DEFAULT_PANEL_ALIGN;
    params.position   = params.position  || DEFAULT_PANEL_POSITION;
    params.width      = params.width     || DEFAULT_PANEL_WIDTH;
    params.height     = params.height    || DEFAULT_PANEL_HEIGHT;
    params.ratio      = params.ratio     || DEFAULT_PANEL_RATIO;
    params.label      = params.label     || DEFAULT_PANEL_LABEL;
    params.opacity    = params.opacity   || DEFAULT_PANEL_OPACITY;
    params.fixed      = params.fixed      === undefined ? DEFAULT_PANEL_FIXED      : params.fixed;
    params.enable     = params.enable     === undefined ? DEFAULT_PANEL_ENABLE     : params.enable;
    params.vconstrain = params.vconstrain === undefined ? DEFAULT_PANEL_VCONSTRAIN : params.vconstrain;

    if (params.dock) {
        params.dock.align = params.dock.align || DEFAULT_PANEL_DOCK.align;
        params.dock.resizable = params.dock.resizable || DEFAULT_PANEL_DOCK.resizable;
    }

    this._width      = Math.max(DEFAULT_PANEL_WIDTH_MIN,
                       Math.min(params.width,DEFAULT_PANEL_WIDTH_MAX));
    this._height     = params.height ?  Math.max(0,Math.min(params.height,window.innerHeight)) : null;
    this._fixed      = params.fixed;
    this._dock       = params.dock;
    this._position   = params.position;
    this._vConstrain = params.vconstrain;
    this._label      = params.label;
    this._isDisabled = !params.enable;
    this._groups     = [];


    var width    = this._width,
        isFixed  = this._fixed,
        dock     = this._dock,
        position = this._position,
        label    = this._label,
        align    = params.align,
        opacity  = params.opacity;


    var rootNode  = this._node     = new Node(),
        headNode  = this._headNode = new Node(),
        menuNode  =                  new Node(),
        lablWrap  =                  new Node(),
        lablNode  =                  new Node(Node.SPAN),
        wrapNode  = this._wrapNode = new Node(Node.DIV),
        listNode  = this._listNode = new Node(Node.LIST);

        rootNode.setStyleClass(CSS.Panel);
        headNode.setStyleClass(CSS.Head);
        menuNode.setStyleClass(CSS.Menu);
        lablWrap.setStyleClass(CSS.Wrap);
        lablNode.setStyleClass(CSS.Label);
        wrapNode.setStyleClass(CSS.Wrap);
        listNode.setStyleClass(CSS.GroupList);

        rootNode.setWidth(width);
        lablNode.setProperty('innerHTML',label);

        headNode.addChild(menuNode);
        lablWrap.addChild(lablNode);
        headNode.addChild(lablWrap);
        wrapNode.addChild(listNode);
        rootNode.addChild(headNode);
        rootNode.addChild(wrapNode);

        controlKit.getNode().addChild(rootNode);


    if (!dock) {

        var menuHide = this._menuHide = new Node(Node.INPUT_BUTTON);
            menuHide.setStyleClass(CSS.MenuBtnHide);
            menuHide.addEventListener(NodeEvent.MOUSE_DOWN, this._onMenuHideMouseDown.bind(this));

        menuNode.addChild(menuHide);

        if (this._parent.panelsAreClosable()) {
            var menuClose = new Node(Node.INPUT_BUTTON);
            menuClose.setStyleClass(CSS.MenuBtnClose);
            menuClose.addEventListener(NodeEvent.MOUSE_DOWN, this.disable.bind(this));

            menuNode.addChild(menuClose);
        }


        if (this.hasMaxHeight()) {
            this._addScrollWrap();
        }

        if (!isFixed) {
            if (position) {
                if (align == LayoutMode.LEFT ||
                    align == LayoutMode.TOP ||
                    align == LayoutMode.BOTTOM) {
                    rootNode.setPositionGlobal(position[0], position[1]);
                }
                else {
                    rootNode.setPositionGlobal(window.innerWidth - width - position[0], position[1]);
                    this._position = rootNode.getPosition();
                }
            }
            else this._position = rootNode.getPosition();

            this._mouseOffset = [0, 0];

            rootNode.setStyleProperty('position', 'absolute');
            headNode.addEventListener(NodeEvent.MOUSE_DOWN, this._onHeadDragStart.bind(this));
        }
        else {
            if (position) {
                var positionX = position[0],
                    positionY = position[1];

                if (positionY != 0)rootNode.setPositionY(positionY);
                if (positionX != 0)if (align == LayoutMode.RIGHT)rootNode.getElement().marginRight = positionX;
                else rootNode.setPositionX(positionX);
            }

            rootNode.setStyleProperty('float', align);
        }
    }
    else {
        var dockAlignment = dock.align;

        if (dockAlignment == LayoutMode.LEFT ||
            dockAlignment == LayoutMode.RIGHT) {
            align = dockAlignment;
            this._height = window.innerHeight;
        }

        if (dockAlignment == LayoutMode.TOP ||
            dockAlignment == LayoutMode.BOTTOM) {

        }

        /*
         if(dock.resizable)
         {
         var sizeHandle = new ControlKit.Node(ControlKit.NodeType.DIV);
         sizeHandle.setStyleClass(ControlKit.CSS.SizeHandle);
         rootNode.addChild(sizeHandle);
         }
         */

        rootNode.setStyleProperty('float', align);
    }

    if (this._parent.historyIsEnabled()) {
        var menuUndo = this._menuUndo = new Node(Node.INPUT_BUTTON);
            menuUndo.setStyleClass(CSS.MenuBtnUndo);
            menuUndo.setStyleProperty('display', 'none');
            menuUndo.setProperty('value', History.getInstance().getNumStates());
            menuNode.addChildAt(menuUndo, 0);

            menuUndo.addEventListener(NodeEvent.MOUSE_DOWN, this._onMenuUndoTrigger.bind(this));
            headNode.addEventListener(NodeEvent.MOUSE_OVER, this._onHeadMouseOver.bind(this));
            headNode.addEventListener(NodeEvent.MOUSE_OUT, this._onHeadMouseOut.bind(this))
    }

    if (opacity != 1.0 && opacity != 0.0) {
        rootNode.setStyleProperty('opacity', opacity);
    }

    this._parent.addEventListener(MenuEvent.UPDATE_MENU,      this, 'onUpdateMenu');
    window.addEventListener(DocumentEvent.WINDOW_RESIZE,this._onWindowResize.bind(this));
}

Panel.prototype = Object.create(EventDispatcher.prototype);


Panel.prototype._onMenuHideMouseDown = function () {
    this._isDisabled = !this._isDisabled;
    this._updateAppearance();
};

Panel.prototype._updateAppearance = function () {
    var rootNode = this._node,
        headNode = this._headNode,
        menuHide = this._menuHide;

    if (this._isDisabled) {
        headNode.getStyle().borderBottom = 'none';

        rootNode.setHeight(headNode.getHeight());
        menuHide.setStyleClass(CSS.MenuBtnShow);

        this.dispatchEvent(new Event_(this, PanelEvent.PANEL_HIDE, null));
    }
    else {
        rootNode.setHeight(headNode.getHeight() + this._wrapNode.getHeight());
        rootNode.deleteStyleProperty('height');
        menuHide.setStyleClass(CSS.MenuBtnHide);
        headNode.setStyleClass(CSS.Head);

        this.dispatchEvent(new Event_(this, PanelEvent.PANEL_SHOW, null));
    }
};

Panel.prototype._onHeadMouseOver = function () {
    this._menuUndo.setStyleProperty('display', 'inline')
};
Panel.prototype._onHeadMouseOut = function () {
    this._menuUndo.setStyleProperty('display', 'none')
};
Panel.prototype.onUpdateMenu = function () {
    this._menuUndo.setProperty('value', History.getInstance().getNumStates());
};

Panel.prototype._onMenuUndoTrigger = function () {
    History.getInstance().popState();
};

Panel.prototype._onHeadDragStart = function()
{
    var parentNode = this._parent.getNode(),
        node       = this._node;

    var nodePos   = node.getPositionGlobal(),
        mousePos  = Mouse.getInstance().getPosition(),
        offsetPos = this._mouseOffset;

        offsetPos[0] = mousePos[0] - nodePos[0];
        offsetPos[1] = mousePos[1] - nodePos[1];

    var eventMouseMove = DocumentEvent.MOUSE_MOVE,
        eventMouseUp   = DocumentEvent.MOUSE_UP;

    var self = this;

    var onDrag = function () {
            self._updatePosition();
        },

        onDragEnd = function () {
            document.removeEventListener(eventMouseMove, onDrag, false);
            document.removeEventListener(eventMouseUp, onDragEnd, false);
            self.dispatchEvent(new Event_(this, PanelEvent.PANEL_MOVE_END, null));
        };

    parentNode.removeChild(node);
    parentNode.addChild(   node);

    document.addEventListener(eventMouseMove, onDrag,    false);
    document.addEventListener(eventMouseUp,   onDragEnd, false);

    this.dispatchEvent(new Event_(this,PanelEvent.PANEL_MOVE_BEGIN,null));
};

Panel.prototype._updatePosition = function () {
    var mousePos = Mouse.getInstance().getPosition(),
        offsetPos = this._mouseOffset;

    var position = this._position;
    position[0] = mousePos[0] - offsetPos[0];
    position[1] = mousePos[1] - offsetPos[1];

    this._constrainHeight();
    this._constrainPosition();

    this.dispatchEvent(new Event_(this, PanelEvent.PANEL_MOVE, null));
};

Panel.prototype._onWindowResize = function () {
    if (this.isDocked()) {
        var dock = this._dock;

        if (dock.align == LayoutMode.RIGHT ||
            dock.align == LayoutMode.LEFT) {
            var windowHeight = window.innerHeight,
                listHeight = this._listNode.getHeight(),
                headHeight = this._headNode.getHeight();

            this._height = windowHeight;

            if ((windowHeight - headHeight) > listHeight){
                this._scrollBar.disable();
            }
            else{
                this._scrollBar.enable();
            }

            this.dispatchEvent(new Event_(this, PanelEvent.PANEL_SIZE_CHANGE));
        }
    }
    else {
        if (!this.isFixed()){
            this._constrainPosition();
        }
    }
    this._constrainHeight();
    this.dispatchEvent(new Event_(this, DocumentEvent.WINDOW_RESIZE));
};

Panel.prototype._constrainPosition = function () {
    var node = this._node;

    var maxX = window.innerWidth - node.getWidth(),
        maxY = window.innerHeight - node.getHeight();

    var position = this._position;
    position[0] = Math.max(0, Math.min(position[0], maxX));
    position[1] = Math.max(0, Math.min(position[1], maxY));

    node.setPositionGlobal(position[0], position[1]);
};

Panel.prototype._constrainHeight = function () {
    if (!this._vConstrain)return;

    var hasMaxHeight = this.hasMaxHeight(),
        hasScrollWrap = this.hasScrollWrap();

    var headNode = this._headNode,
        wrapNode = this._wrapNode;

    var scrollBar = this._scrollBar;

    var panelTop = this.isDocked() ? 0 :
        this.isFixed() ? 0 :
            this._position[1];

    var panelHeight = hasMaxHeight ? this.getMaxHeight() :
        hasScrollWrap ? scrollBar.getTargetNode().getHeight() :
            wrapNode.getHeight();

    var panelBottom = panelTop + panelHeight;
    var headHeight = headNode.getHeight();

    var windowHeight = window.innerHeight,
        heightDiff = windowHeight - panelBottom - headHeight,
        heightSum;

    if (heightDiff < 0.0) {
        heightSum = panelHeight + heightDiff;

        if (!hasScrollWrap) {
            this._addScrollWrap(heightSum);
            this.dispatchEvent(new Event_(this, PanelEvent.PANEL_SCROLL_WRAP_ADDED, null));
            return;
        }

        scrollBar.setWrapHeight(heightSum);
        wrapNode.setHeight(heightSum);
    }
    else {
        if (!hasMaxHeight && hasScrollWrap) {
            scrollBar.removeFromParent();
            wrapNode.addChild(this._listNode);
            wrapNode.deleteStyleProperty('height');

            this._scrollBar = null;

            this.dispatchEvent(new Event_(this, PanelEvent.PANEL_SCROLL_WRAP_REMOVED, null));
        }
    }
};

Panel.prototype.onGroupListSizeChange = function () {
    if (this.hasScrollWrap()){
        this._updateScrollWrap();
    }
    this._constrainHeight();
};

Panel.prototype._updateScrollWrap = function () {
    var wrapNode = this._wrapNode,
        scrollBar = this._scrollBar,
        height = this.hasMaxHeight() ?
            this.getMaxHeight() : 100,
        listHeight = this._listNode.getHeight();

    wrapNode.setHeight(listHeight < height ? listHeight : height);

    scrollBar.update();

    if (!scrollBar.isValid()) {
        scrollBar.disable();
        wrapNode.setHeight(wrapNode.getChildAt(1).getHeight());
    }
    else {
        scrollBar.enable();
        wrapNode.setHeight(height);
    }
};

Panel.prototype._addScrollWrap = function () {
    var wrapNode = this._wrapNode,
        listNode = this._listNode,
        height = arguments.length == 0 ?
            this.getMaxHeight() :
            arguments[0];

    this._scrollBar = new ScrollBar(wrapNode, listNode, height);
    if (this.isEnabled()){
        wrapNode.setHeight(height);
    }
};

Panel.prototype.hasScrollWrap = function () {
    return this._scrollBar != null;
};


Panel.prototype.preventSelectDrag = function () {
    if (!this.hasScrollWrap()){
        return;
    }
    this._wrapNode.getElement().scrollTop = 0;
};

Panel.prototype.enable = function () {
    this._node.setStyleProperty('display', 'block');
    this._isDisabled = false;
    this._updateAppearance();
};

Panel.prototype.disable = function () {
    this._node.setStyleProperty('display', 'none');
    this._isDisabled = true;
    this._updateAppearance();
};

Panel.prototype.isEnabled = function () {
    return !this._isDisabled;
};

Panel.prototype.isDisabled = function () {
    return this._isDisabled;
};

Panel.prototype.hasMaxHeight = function () {
    return this._height != null;
};

Panel.prototype.getMaxHeight = function () {
    return this._height;
};

Panel.prototype.isDocked = function () {
    return this._dock;
};

Panel.prototype.isFixed = function () {
    return this._fixed;
};

Panel.prototype.getGroups = function () {
    return this._groups;
};

Panel.prototype.getNode = function () {
    return this._node;
};

Panel.prototype.getList = function () {
    return this._listNode;
};

Panel.prototype.getWidth = function () {
    return this._width;
};

Panel.prototype.getPosition = function () {
    return this._position;
};

Panel.prototype.getParent = function(){
    return this._parent;
};

Panel.prototype.addGroup = function (params) {
    var group = new Group(this, params);
    this._groups.push(group);
    if (this.isDocked()){
        this.dispatchEvent(new Event_(this, PanelEvent.PANEL_SIZE_CHANGE));
    }
    return this;
};

Panel.prototype.addSubGroup = function(params){
    var group = this._groups[this._groups.length - 1];
    if(!group){
        throw new PanelNoGroupError();
    }
    group.addSubGroup(params);
    return this;
};

Panel.prototype._addComponent = function(){
    var group = this._groups[this._groups.length - 1];
    if(!group){
        throw new PanelNoGroupError();
    }
    group.addComponent.apply(group,arguments);
    return this;
};

Panel.prototype.addStringInput = function (object, value, params) {
    return this._addComponent(StringInput,object,value,params);
};

Panel.prototype.addNumberInput = function (object, value, params) {
    return this._addComponent(NumberInput,object,value,params);
};

Panel.prototype.addRange = function (object, value, params) {
    return this._addComponent(Range,object,value,params);
};

Panel.prototype.addCheckbox = function (object, value, params) {
    return this._addComponent(Checkbox,object,value,params);
};

Panel.prototype.addColor = function (object, value, params) {
    return this._addComponent(Color,object,value, params);
};

Panel.prototype.addButton = function (label, onPress, params) {
    return this._addComponent(Button,label,onPress,params);
};

Panel.prototype.addSelect = function (object, value, params) {
    return this._addComponent(Select,object,value,params);
};

Panel.prototype.addSlider = function (object, value, range, params) {
    return this._addComponent(Slider,object,value,range,params);
};

Panel.prototype.addFunctionPlotter = function (object, value, params) {
    return this._addComponent(FunctionPlotter,object,value,params);
};

Panel.prototype.addPad = function (object, value, params) {
    return this._addComponent(Pad,object,value,params);
};

Panel.prototype.addValuePlotter = function (object, value, params) {
    return this._addComponent(ValuePlotter,object,value,params);
};

Panel.prototype.addNumberOutput = function (object, value, params) {
    return this._addComponent(NumberOutput,object,value,params);
};

Panel.prototype.addStringOutput = function (object, value, params) {
    return this._addComponent(StringOutput,object,value,params);
};

Panel.prototype.addCanvas = function (params) {
    return this._addComponent(Canvas_,params);
};

Panel.prototype.addSVG = function (params) {
    return this._addComponent(SVG_,params);
};

module.exports = Panel;
},{"../component/Button":4,"../component/Canvas":5,"../component/Checkbox":6,"../component/Color":7,"../component/FunctionPlotter":11,"../component/NumberInput":12,"../component/NumberOutput":14,"../component/Pad":18,"../component/Range":22,"../component/SVG":23,"../component/Select":25,"../component/Slider":27,"../component/StringInput":29,"../component/StringOutput":30,"../component/ValuePlotter":31,"../core/History":32,"../core/document/CSS":38,"../core/document/DocumentEvent":39,"../core/document/Mouse":40,"../core/document/Node":41,"../core/document/NodeEvent":42,"../core/event/Event":46,"../core/event/EventDispatcher":47,"../core/layout/LayoutMode":48,"../core/layout/ScrollBar":49,"./Group":51,"./MenuEvent":54,"./PanelEvent":56,"./PanelNoGroupError":57}],56:[function(_dereq_,module,exports){
var PanelEvent = {
	PANEL_MOVE_BEGIN          : 'panelMoveBegin',
	PANEL_MOVE                : 'panelMove',
	PANEL_MOVE_END            : 'panelMoveEnd',

	PANEL_SHOW                : 'panelShow',
	PANEL_HIDE                : 'panelHide',

	PANEL_SCROLL_WRAP_ADDED   : 'panelScrollWrapAdded',
	PANEL_SCROLL_WRAP_REMOVED : 'panelScrollWrapRemoved',

	PANEL_SIZE_CHANGE        : 'panelSizeChange'
};
module.exports = PanelEvent;
},{}],57:[function(_dereq_,module,exports){
function PanelNoGroupError() {
	Error.apply(this);
	Error.captureStackTrace(this,PanelNoGroupError);
	this.name = 'PanelNoGroupError';
	this.message = 'Panel has no Group.';
}
PanelNoGroupError.prototype = Object.create(Error.prototype);
PanelNoGroupError.constructor = PanelNoGroupError;

module.exports = PanelNoGroupError;
},{}],58:[function(_dereq_,module,exports){
var AbstractGroup = _dereq_('./AbstractGroup');
var Node = _dereq_('../core/document/Node');
var CSS = _dereq_('../core/document/CSS');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    PanelEvent = _dereq_('./PanelEvent'),
    GroupEvent = _dereq_('./GroupEvent');

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
        var headNode = this._headNode = new Node(),
            lablWrap = new Node(),
            lablNode = new Node(Node.SPAN);

        headNode.setStyleClass(CSS.Head);
        lablWrap.setStyleClass(CSS.Wrap);
        lablNode.setStyleClass(CSS.Label);

        lablNode.setProperty('innerHTML', label);

        lablWrap.addChild(lablNode);
        headNode.addChild(lablWrap);


        var indiNode = this._indiNode = new Node();
        indiNode.setStyleClass(CSS.ArrowBSubMax);
        headNode.addChildAt(indiNode, 0);

        rootNode.addChildAt(headNode, 0);

        this.addEventListener(GroupEvent.SUBGROUP_TRIGGER, this._parent, 'onSubGroupTrigger');
        headNode.addEventListener(DocumentEvent.MOUSE_DOWN, this._onHeadMouseDown.bind(this));

        this._updateAppearance();

    }

    if(this.hasMaxHeight()){
        this.addScrollWrap();
    }

    this._parent.addEventListener(GroupEvent.SUBGROUP_ENABLE,  this, 'onEnable');
    this._parent.addEventListener(GroupEvent.SUBGROUP_DISABLE, this, 'onDisable');
    this._parent.addEventListener(PanelEvent.PANEL_MOVE_END,   this, 'onPanelMoveEnd');
    this._parent.addEventListener(GroupEvent.GROUP_SIZE_CHANGE,this, 'onGroupSizeChange');
    this._parent.addEventListener(PanelEvent.PANEL_SIZE_CHANGE,this, 'onPanelSizeChange');
    this._parent.addEventListener(DocumentEvent.WINDOW_RESIZE,    this, 'onWindowResize');

    this.addEventListener(GroupEvent.GROUP_SIZE_UPDATE,this._parent,'onGroupSizeUpdate');
}

SubGroup.prototype = Object.create(AbstractGroup.prototype);

//FIXME
SubGroup.prototype._onHeadMouseDown = function () {
    this._isDisabled = !this._isDisabled;
    this._onTrigger();

    var event = DocumentEvent.MOUSE_UP,
        self  = this;
    var onDocumentMouseUp = function () {
        self._onTrigger();
        document.removeEventListener(event, onDocumentMouseUp);
    };

    document.addEventListener(event,onDocumentMouseUp);
};

SubGroup.prototype._onTrigger = function() {
    this._updateAppearance();
    this.dispatchEvent(new Event_(this,GroupEvent.SUBGROUP_TRIGGER,null));
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
    this.dispatchEvent(new Event_(this, GroupEvent.COMPONENTS_ENABLE, null));
};
SubGroup.prototype.onDisable = function () {
    if (this.isDisabled()){
        return;
    }
    this.dispatchEvent(new Event_(this, GroupEvent.COMPONENTS_DISABLE, null));
};

//bubble
SubGroup.prototype.onGroupSizeChange = function () {
    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_SIZE_CHANGE, null));
};
SubGroup.prototype.onGroupSizeUpdate = function () {
    this.dispatchEvent(new Event_(this, GroupEvent.GROUP_SIZE_UPDATE, null));
};
SubGroup.prototype.onPanelMoveEnd = function () {
    this.dispatchEvent(new Event_(this, PanelEvent.PANEL_MOVE_END, null));
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
},{"../core/document/CSS":38,"../core/document/DocumentEvent":39,"../core/document/Node":41,"../core/event/Event":46,"./AbstractGroup":50,"./GroupEvent":52,"./PanelEvent":56}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9pbmRleC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvQ29udHJvbEtpdC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvQ29udHJvbEtpdFNoYXJlZC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0J1dHRvbi5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0NhbnZhcy5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0NoZWNrYm94LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvQ29sb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9Db21wb25lbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9Db21wb25lbnRFdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0Z1bmN0aW9uUGxvdFR5cGUuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9GdW5jdGlvblBsb3R0ZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9OdW1iZXJJbnB1dC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L051bWJlcklucHV0X0ludGVybmFsLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvTnVtYmVyT3V0cHV0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvT2JqZWN0Q29tcG9uZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvT3B0aW9ucy5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L091dHB1dC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1BhZC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1BpY2tlci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1Bsb3R0ZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9QcmVzZXRCdG4uanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9SYW5nZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1NWRy5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1NWR0NvbXBvbmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1NlbGVjdC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1NlbGVjdEV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2xpZGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2xpZGVyX0ludGVybmFsLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU3RyaW5nSW5wdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9TdHJpbmdPdXRwdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9WYWx1ZVBsb3R0ZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvSGlzdG9yeS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9IaXN0b3J5RXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvTWV0cmljLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL1ByZXNldC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9jb2xvci9Db2xvck1vZGUuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvY29sb3IvQ29sb3JVdGlsLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2RvY3VtZW50L0NTUy5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2RvY3VtZW50L01vdXNlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2RvY3VtZW50L05vZGUuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2RvY3VtZW50L1N0eWxlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2Vycm9yL2NrRXJyb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZXJyb3IvY2tFcnJvclV0aWwuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZXZlbnQvRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2xheW91dC9MYXlvdXRNb2RlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2xheW91dC9TY3JvbGxCYXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL0Fic3RyYWN0R3JvdXAuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL0dyb3VwLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9ncm91cC9Hcm91cEV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9ncm91cC9Hcm91cE5vU3ViR3JvdXBFcnJvci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvTWVudUV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9ncm91cC9QYW5lbC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvUGFuZWxFdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvUGFuZWxOb0dyb3VwRXJyb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL1N1Ykdyb3VwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3R5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6YkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwbUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIENvbnRyb2xLaXQgPSByZXF1aXJlKCcuL2xpYi9Db250cm9sS2l0Jyk7XG5cdENvbnRyb2xLaXQuQ2FudmFzID0gcmVxdWlyZSgnLi9saWIvY29tcG9uZW50L0NhbnZhcycpO1xuXHRDb250cm9sS2l0LlNWRyA9IHJlcXVpcmUoJy4vbGliL2NvbXBvbmVudC9TVkcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sS2l0OyIsInZhciBOb2RlID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L05vZGUnKSxcbiAgICBQYW5lbCA9IHJlcXVpcmUoJy4vZ3JvdXAvUGFuZWwnKSxcbiAgICBPcHRpb25zID0gcmVxdWlyZSgnLi9jb21wb25lbnQvT3B0aW9ucycpLFxuICAgIFBpY2tlciA9IHJlcXVpcmUoJy4vY29tcG9uZW50L1BpY2tlcicpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L0NTUycpO1xuXG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuICAgIEV2ZW50XyA9IHJlcXVpcmUoJy4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4vY29tcG9uZW50L0NvbXBvbmVudEV2ZW50JyksXG4gICAgSGlzdG9yeUV2ZW50ID0gcmVxdWlyZSgnLi9jb3JlL0hpc3RvcnlFdmVudCcpLFxuICAgIFNlbGVjdEV2ZW50ID0gcmVxdWlyZSgnLi9jb21wb25lbnQvU2VsZWN0RXZlbnQnKSxcbiAgICBNZW51RXZlbnQgPSByZXF1aXJlKCcuL2dyb3VwL01lbnVFdmVudCcpO1xuXG52YXIgSGlzdG9yeSA9IHJlcXVpcmUoJy4vY29yZS9IaXN0b3J5Jyk7XG52YXIgTW91c2UgPSByZXF1aXJlKCcuL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcblxudmFyIFZhbHVlUGxvdHRlciA9IHJlcXVpcmUoJy4vY29tcG9uZW50L1ZhbHVlUGxvdHRlcicpO1xudmFyIFN0cmluZ091dHB1dCA9IHJlcXVpcmUoJy4vY29tcG9uZW50L1N0cmluZ091dHB1dCcpLFxuICAgIE51bWJlck91dHB1dCA9IHJlcXVpcmUoJy4vY29tcG9uZW50L051bWJlck91dHB1dCcpO1xuXG52YXIgQ29udHJvbEtpdFNoYXJlZCA9IHJlcXVpcmUoJy4vQ29udHJvbEtpdFNoYXJlZCcpO1xuXG52YXIgREVGQVVMVF9LSVRfVFJJR0dFUiA9IGZhbHNlLFxuICAgIERFRkFVTFRfSElTVE9SWSA9IGZhbHNlLFxuICAgIERFRkFVTFRfUEFORUxTX0NMT1NBQkxFID0gZmFsc2UsXG4gICAgREVGQVVMVF9PUEFDSVRZID0gMS4wO1xuXG5mdW5jdGlvbiBDb250cm9sS2l0KHBhcmFtcykge1xuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMudHJpZ2dlciA9IHBhcmFtcy50cmlnZ2VyID09PSB1bmRlZmluZWQgPyBERUZBVUxUX0tJVF9UUklHR0VSIDogcGFyYW1zLmZpeGVkO1xuICAgIHBhcmFtcy5oaXN0b3J5ID0gcGFyYW1zLmhpc3RvcnkgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfSElTVE9SWSA6IHBhcmFtcy5oaXN0b3J5O1xuICAgIHBhcmFtcy5wYW5lbHNDbG9zYWJsZSA9IHBhcmFtcy5wYW5lbHNDbG9zYWJsZSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9QQU5FTFNfQ0xPU0FCTEUgOiBwYXJhbXMucGFuZWxzQ2xvc2FibGU7XG4gICAgcGFyYW1zLm9wYWNpdHkgPSBwYXJhbXMub3BhY2l0eSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9PUEFDSVRZIDogcGFyYW1zLm9wYWNpdHk7XG4gICAgcGFyYW1zLnVzZUV4dGVybmFsU3R5bGUgPSBwYXJhbXMudXNlRXh0ZXJuYWxTdHlsZSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBwYXJhbXMudXNlRXh0ZXJuYWxTdHlsZTtcblxuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdmFyIG5vZGUgPSBudWxsO1xuICAgIGlmICghcGFyYW1zLnBhcmVudERvbUVsZW1lbnRJZCkge1xuICAgICAgICBub2RlID0gbmV3IE5vZGUoKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlLmdldEVsZW1lbnQoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZSA9IE5vZGUuZ2V0Tm9kZUJ5SWQocGFyYW1zLnBhcmVudERvbUVsZW1lbnRJZCk7XG4gICAgfVxuXG4gICAgaWYoIXBhcmFtcy51c2VFeHRlcm5hbFN0eWxlKXtcbiAgICAgICAgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgICAgICAgIHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuICAgICAgICB2YXIgY3NzID0gIXBhcmFtcy5zdHlsZSA/IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9TdHlsZScpLnN0cmluZyA6IHBhcmFtcy5zdHlsZTtcbiAgICAgICAgaWYoc3R5bGUuc3R5bGVzaGVldCl7XG4gICAgICAgICAgICBzdHlsZS5zdHlsZXNoZWV0LmNzc1RleHQgPSBjc3M7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgICAgICAgfVxuICAgICAgICAoZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdKS5hcHBlbmRDaGlsZChzdHlsZSk7XG4gICAgfVxuXG4gICAgbm9kZS5zZXRQcm9wZXJ0eSgnaWQnLCBDU1MuQ29udHJvbEtpdCk7XG5cbiAgICB0aGlzLl9ub2RlID0gbm9kZTtcbiAgICB0aGlzLl9wYW5lbHMgPSBbXTtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gZmFsc2U7XG4gICAgdGhpcy5faGlzdG9yeUVuYWJsZWQgPSBwYXJhbXMuaGlzdG9yeTtcbiAgICB0aGlzLl9wYW5lbHNDbG9zYWJsZSA9IHBhcmFtcy5wYW5lbHNDbG9zYWJsZTtcblxuICAgIHZhciBoaXN0b3J5ID0gSGlzdG9yeS5zZXR1cCgpO1xuXG4gICAgaWYgKCF0aGlzLl9oaXN0b3J5RW5hYmxlZCl7XG4gICAgICAgIGhpc3RvcnkuZGlzYWJsZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGhpc3RvcnkuYWRkRXZlbnRMaXN0ZW5lcihIaXN0b3J5RXZlbnQuU1RBVEVfUFVTSCwgdGhpcywgJ29uSGlzdG9yeVN0YXRlUHVzaCcpO1xuICAgICAgICBoaXN0b3J5LmFkZEV2ZW50TGlzdGVuZXIoSGlzdG9yeUV2ZW50LlNUQVRFX1BPUCwgdGhpcywgJ29uSGlzdG9yeVN0YXRlUG9wJyk7XG4gICAgfVxuXG4gICAgTW91c2Uuc2V0dXAoKTtcbiAgICBQaWNrZXIuc2V0dXAodGhpcy5nZXROb2RlKCkpO1xuICAgIE9wdGlvbnMuc2V0dXAodGhpcy5nZXROb2RlKCkpO1xuXG4gICAgaWYgKHBhcmFtcy50cmlnZ2VyKSB7XG4gICAgICAgIHZhciB0cmlnZ2VyID0gbmV3IE5vZGUoKTtcbiAgICAgICAgdHJpZ2dlci5zZXRQcm9wZXJ0eSgnaWQnLCBDU1MuVHJpZ2dlcik7XG4gICAgICAgIHRyaWdnZXIuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25UcmlnZ2VyRG93bi5iaW5kKHRoaXMpKTtcblxuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRyaWdnZXIuZ2V0RWxlbWVudCgpKTtcbiAgICB9XG5cbiAgICBpZiAocGFyYW1zLm9wYWNpdHkgIT0gMS4wICYmIHBhcmFtcy5vcGFjaXR5ICE9IDAuMCkge1xuICAgICAgICBub2RlLnNldFN0eWxlUHJvcGVydHkoJ29wYWNpdHknLCBwYXJhbXMub3BhY2l0eSk7XG4gICAgfVxuXG4gICAgdGhpcy5fY2FuVXBkYXRlID0gdHJ1ZTtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgaW50ZXJ2YWwsXG4gICAgICAgIGNvdW50ID0gMCxcbiAgICAgICAgY291bnRNYXggPSAxMDtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSxmdW5jdGlvbigpe1xuICAgICAgICBzZWxmLl9jYW5VcGRhdGUgPSBmYWxzZTtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmKGNvdW50ID49IGNvdW50TWF4KXtcbiAgICAgICAgICAgICAgICBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgc2VsZi5fY2FuVXBkYXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgIH0sMjUpXG4gICAgfSk7XG5cbiAgICBDb250cm9sS2l0U2hhcmVkLl9pbnN0YW5jZSA9IHRoaXM7XG59XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUuX29uVHJpZ2dlckRvd24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZVByb3BlcnR5KCd2aXNpYmlsaXR5JywgdGhpcy5faXNEaXNhYmxlZCA9ICF0aGlzLl9pc0Rpc2FibGVkID8gJ2hpZGRlbicgOiAndmlzaWJsZScpO1xufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZWQgPSBmdW5jdGlvbiAoZSkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwge29yaWdpbjogZS5zZW5kZXJ9KSk7XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5vblNlbGVjdFRyaWdnZXJlZCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgU2VsZWN0RXZlbnQuVFJJR0dFUl9TRUxFQ1QsIHtvcmlnaW46IGUuc2VuZGVyfSkpO1xufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUuYWRkUGFuZWwgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgdmFyIHBhbmVsID0gbmV3IFBhbmVsKHRoaXMsIHBhcmFtcyk7XG4gICAgdGhpcy5fcGFuZWxzLnB1c2gocGFuZWwpO1xuICAgIHJldHVybiBwYW5lbDtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5faXNEaXNhYmxlZCB8fCAhdGhpcy5fY2FuVXBkYXRlKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaSwgaiwgaztcbiAgICB2YXIgbCwgbSwgbjtcblxuICAgIHZhciBwYW5lbHMgPSB0aGlzLl9wYW5lbHMsXG4gICAgICAgIHBhbmVsLFxuICAgICAgICBncm91cHMsXG4gICAgICAgIGNvbXBvbmVudHMsXG4gICAgICAgIGNvbXBvbmVudDtcblxuICAgIGkgPSAtMTsgbCA9IHBhbmVscy5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgcGFuZWwgPSBwYW5lbHNbaV07XG4gICAgICAgIGlmIChwYW5lbC5pc0Rpc2FibGVkKCkpe1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZ3JvdXBzID0gcGFuZWwuZ2V0R3JvdXBzKCk7XG4gICAgICAgIGogPSAtMTsgbSA9IGdyb3Vwcy5sZW5ndGg7XG5cbiAgICAgICAgd2hpbGUgKCsraiA8IG0pIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMgPSBncm91cHNbal0uZ2V0Q29tcG9uZW50cygpO1xuICAgICAgICAgICAgayA9IC0xOyBuID0gY29tcG9uZW50cy5sZW5ndGg7XG5cbiAgICAgICAgICAgIHdoaWxlICgrK2sgPCBuKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50ID0gY29tcG9uZW50c1trXTtcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LmlzRGlzYWJsZWQoKSl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50IGluc3RhbmNlb2YgVmFsdWVQbG90dGVyIHx8XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudCBpbnN0YW5jZW9mIFN0cmluZ091dHB1dCB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQgaW5zdGFuY2VvZiBOdW1iZXJPdXRwdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50LnVwZGF0ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLmhpc3RvcnlJc0VuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hpc3RvcnlFbmFibGVkO1xufTtcbkNvbnRyb2xLaXQucHJvdG90eXBlLnBhbmVsc0FyZUNsb3NhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9wYW5lbHNDbG9zYWJsZTtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gZmFsc2U7XG59O1xuQ29udHJvbEtpdC5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gdHJ1ZTtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLmRpc2FibGVBbGxQYW5lbHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGkgPSAtMSwgcCA9IHRoaXMuX3BhbmVscywgbCA9IHAubGVuZ3RoO1xuICAgIHdoaWxlICgrK2kgPCBsKXtcbiAgICAgICAgcFtpXS5lbmFibGUoKTtcbiAgICB9XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5lbmFibGVBbGxQYW5lbHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGkgPSAtMSwgcCA9IHRoaXMuX3BhbmVscywgbCA9IHAubGVuZ3RoO1xuICAgIHdoaWxlICgrK2kgPCBsKXtcbiAgICAgICAgcFtpXS5kaXNhYmxlKCk7XG4gICAgfVxufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUub25IaXN0b3J5U3RhdGVQdXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE1lbnVFdmVudC5VUERBVEVfTUVOVSwgbnVsbCkpO1xufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUub25IaXN0b3J5U3RhdGVQb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVVBEQVRFX1ZBTFVFLCB7b3JpZ2luOiBudWxsfSkpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE1lbnVFdmVudC5VUERBVEVfTUVOVSwgbnVsbCkpO1xufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUuZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbm9kZTtcbn07XG5cbi8vXG5cbnZhciBDb250cm9sS2l0R2xvYmFsID0ge1xuICAgIHNldHVwIDogZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgICAgIG5ldyBDb250cm9sS2l0KG9wdGlvbnMpO1xuICAgIH0sXG4gICAgdXBkYXRlIDogZnVuY3Rpb24oKXtcbiAgICAgICAgaWYoIUNvbnRyb2xLaXRTaGFyZWQuX2luc3RhbmNlKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBDb250cm9sS2l0U2hhcmVkLl9pbnN0YW5jZS51cGRhdGUoKTtcbiAgICB9LFxuICAgIGFkZFBhbmVsIDogZnVuY3Rpb24ocGFyYW1zKXtcbiAgICAgICAgaWYoIUNvbnRyb2xLaXRTaGFyZWQuX2luc3RhbmNlKXtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIENvbnRyb2xLaXRTaGFyZWQuX2luc3RhbmNlLmFkZFBhbmVsKHBhcmFtcyk7XG4gICAgfSxcbiAgICBlbmFibGUgOiBmdW5jdGlvbigpe1xuICAgICAgICBpZighQ29udHJvbEtpdFNoYXJlZC5faW5zdGFuY2Upe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIENvbnRyb2xLaXRTaGFyZWQuX2luc3RhbmNlLmVuYWJsZSgpO1xuICAgIH0sXG4gICAgZGlzYWJsZSA6IGZ1bmN0aW9uKCl7XG4gICAgICAgIGlmKCFDb250cm9sS2l0U2hhcmVkLl9pbnN0YW5jZSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgQ29udHJvbEtpdFNoYXJlZC5faW5zdGFuY2UuZGlzYWJsZSgpO1xuICAgIH0sXG4gICAgZGVzdHJveSA6IGZ1bmN0aW9uKCl7XG4gICAgICAgIENvbnRyb2xLaXRTaGFyZWQuX2luc3RhbmNlID0gbnVsbDtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xLaXRHbG9iYWw7IiwidmFyIENvbnRyb2xLaXRTaGFyZWQgPSB7XG5cdF9pbnN0YW5jZSA6IG51bGwsXG5cdGdldCA6IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIHRoaXMuX2luc3RhbmNlO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xLaXRTaGFyZWQ7IiwidmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpLFxuICAgIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50Jyk7XG5cbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xuXG52YXIgREVGQVVMVF9MQUJFTCA9ICcnO1xuXG5mdW5jdGlvbiBCdXR0b24ocGFyZW50LGxhYmVsLG9uUHJlc3MscGFyYW1zKSB7XG4gICAgb25QcmVzcyAgICAgID0gb25QcmVzcyB8fCBmdW5jdGlvbigpe307XG4gICAgcGFyYW1zICAgICAgID0gcGFyYW1zICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5sYWJlbCA9IHBhcmFtcy5sYWJlbCB8fCBERUZBVUxUX0xBQkVMO1xuXG4gICAgQ29tcG9uZW50LmFwcGx5KHRoaXMsW3BhcmVudCxwYXJhbXMubGFiZWxdKTtcblxuICAgIHZhciBpbnB1dCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcblxuICAgIGlucHV0LnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbik7XG4gICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJyxsYWJlbCk7XG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuT05fQ0xJQ0ssXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvblByZXNzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVEKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5fd3JhcE5vZGUuYWRkQ2hpbGQoaW5wdXQpO1xufVxuQnV0dG9uLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ29tcG9uZW50LnByb3RvdHlwZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQnV0dG9uO1xuIiwidmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50Jyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xuXG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKTtcblxuXG5mdW5jdGlvbiBDYW52YXMocGFyZW50LHBhcmFtcykge1xuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcbiAgICAgICAgd3JhcE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzV3JhcCk7XG5cbiAgICB2YXIgd3JhcFdpZHRoID0gd3JhcE5vZGUuZ2V0V2lkdGgoKTtcblxuICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgd3JhcE5vZGUuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKGNhbnZhcyk7XG5cbiAgICB0aGlzLl9jYW52YXNXaWR0aCA9IHRoaXMuX2NhbnZhc0hlaWdodCA9IDA7XG4gICAgdGhpcy5fc2V0Q2FudmFzU2l6ZSh3cmFwV2lkdGgsd3JhcFdpZHRoKTtcblxuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuXG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZUNsYXNzKENTUy5DYW52YXNMaXN0SXRlbSk7XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLHRoaXMsICAnb25Hcm91cFNpemVDaGFuZ2UnKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSx0aGlzLl9wYXJlbnQsJ29uR3JvdXBTaXplVXBkYXRlJyk7XG59XG5cbkNhbnZhcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5DYW52YXMucHJvdG90eXBlLl91cGRhdGVIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhbnZhc0hlaWdodCA9IHRoaXMuX2NhbnZhcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQoY2FudmFzSGVpZ2h0KTtcbiAgICB0aGlzLl9ub2RlLnNldEhlaWdodChjYW52YXNIZWlnaHQgKyBNZXRyaWMuUEFERElOR19XUkFQUEVSKTtcblxufTtcblxuQ2FudmFzLnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd2lkdGggPSB0aGlzLl93cmFwTm9kZS5nZXRXaWR0aCgpO1xuXG4gICAgdGhpcy5fc2V0Q2FudmFzU2l6ZSh3aWR0aCwgd2lkdGgpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHRoaXMuX3JlZHJhdygpO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSwgbnVsbCkpO1xufTtcblxuQ2FudmFzLnByb3RvdHlwZS5fc2V0Q2FudmFzU2l6ZSA9IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIGNhbnZhc1dpZHRoID0gdGhpcy5fY2FudmFzV2lkdGggPSB3aWR0aCxcbiAgICAgICAgY2FudmFzSGVpZ2h0ID0gdGhpcy5fY2FudmFzSGVpZ2h0ID0gaGVpZ2h0O1xuXG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhcztcbiAgICAgICAgY2FudmFzLnN0eWxlLndpZHRoID0gY2FudmFzV2lkdGggKyAncHgnO1xuICAgICAgICBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gY2FudmFzSGVpZ2h0ICsgJ3B4JztcbiAgICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzV2lkdGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXNIZWlnaHQ7XG59O1xuXG5DYW52YXMucHJvdG90eXBlLmdldENhbnZhcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY2FudmFzO1xufTtcblxuQ2FudmFzLnByb3RvdHlwZS5nZXRDb250ZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FudmFzO1xuIiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4vT2JqZWN0Q29tcG9uZW50JyksXG4gICAgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuL0NvbXBvbmVudEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIENoZWNrYm94KHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgcGFyYW1zLm9uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoIHx8IHRoaXMuX29uRmluaXNoO1xuXG4gICAgdGhpcy5fb25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2U7XG4gICAgdGhpcy5fb25GaW5pc2ggPSBwYXJhbXMub25GaW5pc2g7XG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQ0hFQ0tCT1gpO1xuICAgIGlucHV0LnNldFByb3BlcnR5KCdjaGVja2VkJyx0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuQ0hBTkdFLHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLl93cmFwTm9kZS5hZGRDaGlsZCh0aGlzLl9pbnB1dCk7XG59XG5cbkNoZWNrYm94LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5cbkNoZWNrYm94LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xuXG4gICAgdmFyIG9iaiA9IHRoaXMuX29iamVjdCwga2V5ID0gdGhpcy5fa2V5O1xuICAgIG9ialtrZXldID0gIW9ialtrZXldO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xufTtcblxuQ2hlY2tib3gucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX29uQ2hhbmdlKCk7XG59O1xuXG5DaGVja2JveC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faW5wdXQuc2V0UHJvcGVydHkoJ2NoZWNrZWQnLCB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENoZWNrYm94OyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuL09iamVjdENvbXBvbmVudCcpO1xuXG52YXIgRXJyb3IgPSByZXF1aXJlKCcuLi9jb3JlL2Vycm9yL2NrRXJyb3InKTtcblxudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBDb2xvck1vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yTW9kZScpO1xudmFyIFBpY2tlciA9IHJlcXVpcmUoJy4vUGlja2VyJyk7XG52YXIgQ29sb3JVdGlsID0gcmVxdWlyZSgnLi4vY29yZS9jb2xvci9Db2xvclV0aWwnKTtcbnZhciBPcHRpb25zID0gcmVxdWlyZSgnLi9PcHRpb25zJyk7XG52YXIgUHJlc2V0QnRuID0gcmVxdWlyZSgnLi9QcmVzZXRCdG4nKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIERFRkFVTFRfQ09MT1JfQ09MT1JfTU9ERSA9IENvbG9yTW9kZS5IRVgsXG4gICAgREVGQVVMVF9DT0xPUl9QUkVTRVRTICAgID0gbnVsbDtcblxuZnVuY3Rpb24gQ29sb3IocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlICA9IHBhcmFtcy5vbkNoYW5nZSAgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgcGFyYW1zLm9uRmluaXNoICA9IHBhcmFtcy5vbkZpbmlzaCAgfHwgdGhpcy5fb25GaW5pc2g7XG4gICAgcGFyYW1zLnByZXNldHMgICA9IHBhcmFtcy5wcmVzZXRzICAgfHwgREVGQVVMVF9DT0xPUl9QUkVTRVRTO1xuICAgIHBhcmFtcy5jb2xvck1vZGUgPSBwYXJhbXMuY29sb3JNb2RlIHx8IERFRkFVTFRfQ09MT1JfQ09MT1JfTU9ERTtcblxuXG4gICAgdGhpcy5fb25DaGFuZ2UgICA9IHRoaXMuX29uRmluaXNoID0gcGFyYW1zLm9uQ2hhbmdlO1xuICAgIHRoaXMuX3ByZXNldHNLZXkgPSBwYXJhbXMucHJlc2V0cztcblxuXG4gICAgdmFyIGNvbG9yID0gdGhpcy5fY29sb3IgPSBuZXcgTm9kZSgpO1xuICAgICAgICB2YWx1ZSA9IHRoaXMuX3ZhbHVlID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG5cbiAgICB2YXIgY29sb3JNb2RlID0gdGhpcy5fY29sb3JNb2RlID0gcGFyYW1zLmNvbG9yTW9kZTtcblxuICAgIHRoaXMuX3ZhbGlkYXRlQ29sb3JGb3JtYXQodmFsdWUsIEVycm9yLkNPTE9SX0ZPUk1BVF9IRVgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRXJyb3IuQ09MT1JfRk9STUFUX1JHQl9SR0JGVl9IU1YpO1xuXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICBpZiAoIXRoaXMuX3ByZXNldHNLZXkpIHtcbiAgICAgICAgY29sb3Iuc2V0U3R5bGVDbGFzcyhDU1MuQ29sb3IpO1xuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChjb2xvcik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjb2xvci5zZXRTdHlsZUNsYXNzKENTUy5Db2xvcik7XG5cbiAgICAgICAgdmFyIGNvbG9yV3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgIGNvbG9yV3JhcC5zZXRTdHlsZUNsYXNzKENTUy5XcmFwQ29sb3JXUHJlc2V0KTtcblxuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChjb2xvcldyYXApO1xuICAgICAgICBjb2xvcldyYXAuYWRkQ2hpbGQoY29sb3IpO1xuXG4gICAgICAgIHZhciBwcmVzZXRzID0gdGhpcy5fb2JqZWN0W3RoaXMuX3ByZXNldHNLZXldO1xuXG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBwcmVzZXRzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fdmFsaWRhdGVDb2xvckZvcm1hdChwcmVzZXRzW2ldLCBFcnJvci5DT0xPUl9QUkVTRVRfRk9STUFUX0hFWCxcbiAgICAgICAgICAgICAgICBFcnJvci5DT0xPUl9QUkVTRVRfRk9STUFUX1JHQl9SR0JGVl9IU1YpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG9wdGlvbnMgPSBPcHRpb25zLmdldEluc3RhbmNlKCksXG4gICAgICAgICAgICBwcmVzZXRCdG4gPSBuZXcgUHJlc2V0QnRuKHdyYXBOb2RlKTtcblxuICAgICAgICB2YXIgb25QcmVzZXREZWFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgb3B0aW9ucy5jbGVhcigpO1xuICAgICAgICAgICAgcHJlc2V0QnRuLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBvblByZXNldEFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgb3B0aW9ucy5idWlsZChwcmVzZXRzLFxuICAgICAgICAgICAgICAgIHNlbGYuX3ZhbHVlLFxuICAgICAgICAgICAgICAgIGNvbG9yLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3ZhbHVlID0gcHJlc2V0c1tvcHRpb25zLmdldFNlbGVjdGVkSW5kZXgoKV07XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuYXBwbHlWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25QcmVzZXREZWFjdGl2YXRlLFxuICAgICAgICAgICAgICAgIE1ldHJpYy5QQURESU5HX1BSRVNFVCxcbiAgICAgICAgICAgICAgICB0cnVlLFxuICAgICAgICAgICAgICAgIGNvbG9yTW9kZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcHJlc2V0QnRuLnNldE9uQWN0aXZlKG9uUHJlc2V0QWN0aXZhdGUpO1xuICAgICAgICBwcmVzZXRCdG4uc2V0T25EZWFjdGl2ZShvblByZXNldERlYWN0aXZhdGUpO1xuICAgIH1cblxuICAgIGNvbG9yLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sdGhpcy5fb25Db2xvclRyaWdnZXIuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLl91cGRhdGVDb2xvcigpO1xuXG59XG5cbkNvbG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5cbkNvbG9yLnByb3RvdHlwZS5fb25Db2xvclRyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNvbG9yTW9kZSA9IHRoaXMuX2NvbG9yTW9kZSxcbiAgICAgICAgY29sb3JNb2RlSEVYID0gQ29sb3JNb2RlLkhFWCxcbiAgICAgICAgY29sb3JNb2RlUkdCID0gQ29sb3JNb2RlLlJHQixcbiAgICAgICAgY29sb3JNb2RlUkdCZnYgPSBDb2xvck1vZGUuUkdCZnYsXG4gICAgICAgIGNvbG9yTW9kZUhTViA9IENvbG9yTW9kZS5IU1Y7XG5cbiAgICB2YXIgdmFsdWUgPSB0aGlzLl92YWx1ZSxcbiAgICAgICAgdGVtcDtcblxuICAgIHZhciBvblBpY2tlclBpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xuXG4gICAgICAgIHN3aXRjaCAoY29sb3JNb2RlKSB7XG4gICAgICAgICAgICBjYXNlIGNvbG9yTW9kZUhFWDpcbiAgICAgICAgICAgICAgICB0aGlzLl92YWx1ZSA9IFBpY2tlci5nZXRJbnN0YW5jZSgpLmdldEhFWCgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb2xvck1vZGVSR0I6XG5cbiAgICAgICAgICAgICAgICAvL2lmIHZhbCA9IEZsb2F0MzJhcnJheSBvciBzb1xuICAgICAgICAgICAgICAgIHRlbXAgPSBQaWNrZXIuZ2V0SW5zdGFuY2UoKS5nZXRSR0IoKTtcbiAgICAgICAgICAgICAgICB2YWx1ZVswXSA9IHRlbXBbMF07XG4gICAgICAgICAgICAgICAgdmFsdWVbMV0gPSB0ZW1wWzFdO1xuICAgICAgICAgICAgICAgIHZhbHVlWzJdID0gdGVtcFsyXTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBjb2xvck1vZGVSR0JmdjpcblxuICAgICAgICAgICAgICAgIHRlbXAgPSBQaWNrZXIuZ2V0SW5zdGFuY2UoKS5nZXRSR0JmdigpO1xuICAgICAgICAgICAgICAgIHZhbHVlWzBdID0gdGVtcFswXTtcbiAgICAgICAgICAgICAgICB2YWx1ZVsxXSA9IHRlbXBbMV07XG4gICAgICAgICAgICAgICAgdmFsdWVbMl0gPSB0ZW1wWzJdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIGNvbG9yTW9kZUhTVjpcbiAgICAgICAgICAgICAgICB0aGlzLl92YWx1ZSA9IFBpY2tlci5nZXRJbnN0YW5jZSgpLmdldEhTVigpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5hcHBseVZhbHVlKCk7XG5cbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB2YXIgcGlja2VyID0gUGlja2VyLmdldEluc3RhbmNlKCk7XG5cbiAgICBzd2l0Y2ggKGNvbG9yTW9kZSkge1xuICAgICAgICBjYXNlIGNvbG9yTW9kZUhFWDpcbiAgICAgICAgICAgIHBpY2tlci5zZXRDb2xvckhFWCh2YWx1ZSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBjb2xvck1vZGVSR0I6XG4gICAgICAgICAgICBwaWNrZXIuc2V0Q29sb3JSR0IodmFsdWVbMF0sIHZhbHVlWzFdLCB2YWx1ZVsyXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBjb2xvck1vZGVSR0JmdjpcbiAgICAgICAgICAgIHBpY2tlci5zZXRDb2xvclJHQmZ2KHZhbHVlWzBdLCB2YWx1ZVsxXSwgdmFsdWVbMl0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgY29sb3JNb2RlSFNWOlxuICAgICAgICAgICAgcGlja2VyLnNldENvbG9ySFNWKHZhbHVlWzBdLCB2YWx1ZVsxXSwgdmFsdWVbMl0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcGlja2VyLnNldENhbGxiYWNrUGljayhvblBpY2tlclBpY2spO1xuICAgIHBpY2tlci5vcGVuKCk7XG59O1xuXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbkNvbG9yLnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24oKVxue1xuICAgIHRoaXMuX29iamVjdFt0aGlzLl9rZXldID0gdGhpcy5fdmFsdWU7XG4gICAgdGhpcy5fdXBkYXRlQ29sb3IoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsbnVsbCkpO1xuXG59O1xuXG5Db2xvci5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uKGUpXG57XG4gICAgaWYoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXJldHVybjtcbiAgICB0aGlzLl92YWx1ZSA9IHRoaXMuX29iamVjdFt0aGlzLl9rZXldO1xuICAgIHRoaXMuX3VwZGF0ZUNvbG9yKCk7XG59O1xuXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbkNvbG9yLnByb3RvdHlwZS5fdXBkYXRlQ29sb3IgPSBmdW5jdGlvbigpXG57XG4gICAgdmFyIGNvbG9yICA9IHRoaXMuX3ZhbHVlLFxuICAgICAgICBjb2xvck5vZGUgPSB0aGlzLl9jb2xvcixcbiAgICAgICAgbm9kZUNvbG9yO1xuXG4gICAgY29sb3JOb2RlLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLGNvbG9yKTtcblxuICAgIHN3aXRjaCh0aGlzLl9jb2xvck1vZGUpXG4gICAge1xuICAgICAgICBjYXNlIENvbG9yTW9kZS5IRVg6XG4gICAgICAgICAgICBub2RlQ29sb3IgPSBjb2xvcjtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgQ29sb3JNb2RlLlJHQjpcbiAgICAgICAgICAgIG5vZGVDb2xvciA9IENvbG9yVXRpbC5SR0IySEVYKGNvbG9yWzBdLGNvbG9yWzFdLGNvbG9yWzJdKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgQ29sb3JNb2RlLlJHQmZ2OlxuICAgICAgICAgICAgbm9kZUNvbG9yID0gQ29sb3JVdGlsLlJHQmZ2MkhFWChjb2xvclswXSxjb2xvclsxXSxjb2xvclsyXSk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIENvbG9yTW9kZS5IU1Y6XG4gICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuSFNWMlJHQihjb2xvclswXSxjb2xvclsxXSxjb2xvclsyXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjb2xvck5vZGUuZ2V0U3R5bGUoKS5iYWNrZ3JvdW5kQ29sb3IgPSBub2RlQ29sb3I7XG59O1xuXG5Db2xvci5wcm90b3R5cGUuX3ZhbGlkYXRlQ29sb3JGb3JtYXQgPSBmdW5jdGlvbih2YWx1ZSxtc2dIZXgsbXNnQXJyKVxue1xuICAgIHZhciBjb2xvck1vZGUgPSB0aGlzLl9jb2xvck1vZGU7XG5cblxuICAgIGlmKGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuSEVYICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScgfHxcbiAgICAgICBjb2xvck1vZGUgPT0gQ29sb3JNb2RlLkhFWCAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBGbG9hdDMyQXJyYXldJylcbiAgICB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobXNnSGV4KTtcbiAgICB9XG4gICAgaWYoKGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuUkdCICAgfHxcbiAgICAgICAgY29sb3JNb2RlID09IENvbG9yTW9kZS5SR0JmdiB8fFxuICAgICAgICBjb2xvck1vZGUgPT0gQ29sb3JNb2RlLkhTVikgJiZcbiAgICAgICAgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSAhPT0gJ1tvYmplY3QgQXJyYXldJyB8fFxuICAgICAgICBjb2xvck1vZGUgPT0gQ29sb3JNb2RlLkhTViAmJlxuICAgICAgICBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICE9PSAnW29iamVjdCBGbG9hdDMyQXJyYXldJylcbiAgICB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobXNnQXJyKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9yOyIsIlxudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG4gICAgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKTtcblxuZnVuY3Rpb24gQ29tcG9uZW50KHBhcmVudCxsYWJlbCkge1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBsYWJlbCA9IHBhcmVudC51c2VzTGFiZWxzKCkgPyBsYWJlbCA6ICdub25lJztcblxuICAgIHRoaXMuX3BhcmVudCAgID0gcGFyZW50O1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSBmYWxzZTtcblxuICAgIHZhciByb290Tm9kZSA9IHRoaXMuX25vZGUgPSBuZXcgTm9kZShOb2RlLkxJU1RfSVRFTSksXG4gICAgICAgIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgICAgIHdyYXBOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuICAgICAgICByb290Tm9kZS5hZGRDaGlsZCh3cmFwTm9kZSk7XG5cblxuICAgIGlmIChsYWJlbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChsYWJlbC5sZW5ndGggIT0gMCAmJiBsYWJlbCAhPSAnbm9uZScpIHtcbiAgICAgICAgICAgIHZhciBsYWJsTm9kZSA9IHRoaXMuX2xhYmxOb2RlID0gbmV3IE5vZGUoTm9kZS5TUEFOKTtcbiAgICAgICAgICAgICAgICBsYWJsTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XG4gICAgICAgICAgICAgICAgbGFibE5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGxhYmVsKTtcbiAgICAgICAgICAgICAgICByb290Tm9kZS5hZGRDaGlsZChsYWJsTm9kZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGFiZWwgPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZVByb3BlcnR5KCdtYXJnaW5MZWZ0JywgJzAnKTtcbiAgICAgICAgICAgIHdyYXBOb2RlLnNldFN0eWxlUHJvcGVydHkoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuQ09NUE9ORU5UU19FTkFCTEUsIHRoaXMsJ29uRW5hYmxlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5DT01QT05FTlRTX0RJU0FCTEUsdGhpcywnb25EaXNhYmxlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZENvbXBvbmVudE5vZGUocm9vdE5vZGUpO1xufVxuXG5Db21wb25lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblxuQ29tcG9uZW50LnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xufTtcbkNvbXBvbmVudC5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gdHJ1ZTtcbn07XG5cbkNvbXBvbmVudC5wcm90b3R5cGUuaXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhdGhpcy5faXNEaXNhYmxlZDtcbn07XG5Db21wb25lbnQucHJvdG90eXBlLmlzRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzRGlzYWJsZWRcbn07XG5cbkNvbXBvbmVudC5wcm90b3R5cGUub25FbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbmFibGUoKTtcbn07XG5Db21wb25lbnQucHJvdG90eXBlLm9uRGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc2FibGUoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsInZhciBDb21wb25lbnRFdmVudCA9IHtcblx0VkFMVUVfVVBEQVRFRDogJ3ZhbHVlVXBkYXRlZCcsXG5cdFVQREFURV9WQUxVRTogJ3VwZGF0ZVZhbHVlJyxcblxuXHRJTlBVVF9TRUxFQ1RfRFJBRzogJ2lucHV0U2VsZWN0RHJhZydcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RXZlbnQ7IiwidmFyIEZ1bmN0aW9uUGxvdFR5cGUgPSB7XG4gICAgSU1QTElDSVQ6ICdpbXBsaWNpdCcsXG4gICAgTk9OX0lNUExJQ0lUOiAnbm9uSW1wbGljaXQnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZ1bmN0aW9uUGxvdFR5cGU7IiwidmFyIFBsb3R0ZXIgPSByZXF1aXJlKCcuL1Bsb3R0ZXInKTtcbnZhciBFcnJvclV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL2Vycm9yL2NrRXJyb3JVdGlsJyk7XG52YXIgRXJyb3IgPSByZXF1aXJlKCcuLi9jb3JlL2Vycm9yL2NrRXJyb3InKTtcblxuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgRnVuY3Rpb25QbG90VHlwZSA9IHJlcXVpcmUoJy4vRnVuY3Rpb25QbG90VHlwZScpO1xudmFyIFByZXNldCA9IHJlcXVpcmUoJy4uL2NvcmUvUHJlc2V0Jyk7XG5cbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xuXG52YXIgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi9Db21wb25lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG5cbnZhciBDb250cm9sS2l0U2hhcmVkID0gcmVxdWlyZSgnLi4vQ29udHJvbEtpdFNoYXJlZCcpO1xuXG52YXIgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1NIT1dfTUlOX01BWF9MQUJFTFMgPSB0cnVlO1xuXG5mdW5jdGlvbiBGdW5jdGlvblBsb3R0ZXIocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLnNob3dNaW5NYXhMYWJlbHMgPSBwYXJhbXMuc2hvd01pbk1heExhYmVscyA9PT0gdW5kZWZpbmVkID9cbiAgICAgICAgREVGQVVMVF9GVU5DVElPTl9QTE9UVEVSX1NIT1dfTUlOX01BWF9MQUJFTFMgOlxuICAgICAgICBwYXJhbXMuc2hvd01pbk1heExhYmVscztcblxuICAgIFBsb3R0ZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIGlmIChFcnJvclV0aWwuVHlwZUVycm9yKG9iamVjdCwgdmFsdWUsIEZ1bmN0aW9uKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEVycm9yLkNPTVBPTkVOVF9PQkpFQ1QgK1xuICAgICAgICBvYmplY3QuY29uc3RydWN0b3IubmFtZSArICcgJyArXG4gICAgICAgIHZhbHVlICtcbiAgICAgICAgRXJyb3IuVFlQRSArXG4gICAgICAgICdGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIHZhciBmdW5jQXJnTGVuZ3RoID0gb2JqZWN0W3ZhbHVlXS5sZW5ndGg7XG5cbiAgICBpZiAoZnVuY0FyZ0xlbmd0aCA+IDIgfHwgZnVuY0FyZ0xlbmd0aCA9PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihFcnJvci5DT01QT05FTlRfRlVOQ1RJT05fTEVOR1RIKTtcbiAgICB9XG5cblxuICAgIHZhciBzdmdSb290ID0gdGhpcy5fc3ZnUm9vdCxcbiAgICAgICAgcGF0aCA9IHRoaXMuX3BhdGg7XG5cbiAgICB2YXIgYXhlcyA9IHRoaXMuX2F4ZXMgPSBzdmdSb290Lmluc2VydEJlZm9yZSh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3BhdGgnKSwgcGF0aCk7XG4gICAgYXhlcy5zdHlsZS5zdHJva2VXaWR0aCA9IDE7XG5cbiAgICB2YXIgYXhlc0xhYmVscyA9IHRoaXMuX2F4ZXNMYWJlbHMgPSBzdmdSb290Lmluc2VydEJlZm9yZSh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3BhdGgnKSwgcGF0aCk7XG4gICAgYXhlc0xhYmVscy5zdHlsZS5zdHJva2UgPSAncmdiKDQzLDQ4LDUxKSc7XG4gICAgYXhlc0xhYmVscy5zdHlsZS5zdHJva2VXaWR0aCA9IDE7XG5cbiAgICB2YXIgZ3JpZCA9IHRoaXMuX2dyaWQ7XG5cbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnLFxuICAgICAgICBzaXplID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpO1xuXG4gICAgdmFyIHNsaWRlclhXcmFwID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWFdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJYV3JhcCk7XG5cbiAgICB2YXIgc2xpZGVyWVdyYXAgPSBuZXcgTm9kZSgpO1xuICAgICAgICBzbGlkZXJZV3JhcC5zZXRTdHlsZUNsYXNzKENTUy5HcmFwaFNsaWRlcllXcmFwKTtcblxuICAgIHZhciBzbGlkZXJYVHJhY2sgPSB0aGlzLl9zbGlkZXJYVHJhY2sgPSBuZXcgTm9kZSgpO1xuICAgICAgICBzbGlkZXJYVHJhY2suc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJYKTtcblxuICAgIHZhciBzbGlkZXJZVHJhY2sgPSB0aGlzLl9zbGlkZXJZVHJhY2sgPSBuZXcgTm9kZSgpO1xuICAgICAgICBzbGlkZXJZVHJhY2suc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJZKTtcblxuICAgIHZhciBzbGlkZXJYSGFuZGxlID0gdGhpcy5fc2xpZGVyWEhhbmRsZSA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHNsaWRlclhIYW5kbGUuc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJYSGFuZGxlKTtcblxuICAgIHZhciBzbGlkZXJZSGFuZGxlID0gdGhpcy5fc2xpZGVyWUhhbmRsZSA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHNsaWRlcllIYW5kbGUuc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJZSGFuZGxlKTtcblxuICAgIHNsaWRlclhUcmFjay5hZGRDaGlsZChzbGlkZXJYSGFuZGxlKTtcbiAgICBzbGlkZXJZVHJhY2suYWRkQ2hpbGQoc2xpZGVyWUhhbmRsZSk7XG4gICAgc2xpZGVyWFdyYXAuYWRkQ2hpbGQoc2xpZGVyWFRyYWNrKTtcbiAgICBzbGlkZXJZV3JhcC5hZGRDaGlsZChzbGlkZXJZVHJhY2spO1xuXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICB2YXIgcGxvdE1vZGUgPSB0aGlzLl9wbG90TW9kZSA9IGZ1bmNBcmdMZW5ndGggPT0gMSA/XG4gICAgICAgIEZ1bmN0aW9uUGxvdFR5cGUuTk9OX0lNUExJQ0lUIDpcbiAgICAgICAgRnVuY3Rpb25QbG90VHlwZS5JTVBMSUNJVDtcblxuICAgIGlmIChwbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUKSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgY2FudmFzLnN0eWxlLndpZHRoID0gY2FudmFzLnN0eWxlLmhlaWdodCA9IHNpemUgKyAncHgnO1xuICAgICAgICBjYW52YXMud2lkdGggPSBjYW52YXMuaGVpZ2h0ID0gc2l6ZTtcblxuICAgICAgICB3cmFwTm9kZS5nZXRFbGVtZW50KCkuaW5zZXJ0QmVmb3JlKGNhbnZhcywgc3ZnKTtcblxuICAgICAgICB0aGlzLl9jYW52YXNDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIHRoaXMuX2NhbnZhc0ltYWdlRGF0YSA9IHRoaXMuX2NhbnZhc0NvbnRleHQuZ2V0SW1hZ2VEYXRhKDAsIDAsIHNpemUsIHNpemUpO1xuXG4gICAgICAgIGF4ZXMuc3R5bGUuc3Ryb2tlID0gUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfQVhFU19DT0xPUjtcbiAgICAgICAgZ3JpZC5zdHlsZS5zdHJva2UgPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9HUklEX0NPTE9SO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgYXhlcy5zdHlsZS5zdHJva2UgPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfQVhFU19DT0xPUjtcbiAgICAgICAgZ3JpZC5zdHlsZS5zdHJva2UgPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfR1JJRF9DT0xPUjtcbiAgICB9XG5cbiAgICB3cmFwTm9kZS5hZGRDaGlsZChzbGlkZXJYV3JhcCk7XG4gICAgd3JhcE5vZGUuYWRkQ2hpbGQoc2xpZGVyWVdyYXApO1xuXG4gICAgc2xpZGVyWEhhbmRsZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vblNsaWRlclhIYW5kbGVEb3duLmJpbmQodGhpcykpO1xuICAgIHNsaWRlcllIYW5kbGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25TbGlkZXJZSGFuZGxlRG93bi5iaW5kKHRoaXMpKTtcblxuICAgIHZhciB1bml0cyA9IHRoaXMuX3VuaXRzID0gW251bGwsIG51bGxdO1xuICAgIHRoaXMuX3NjYWxlID0gbnVsbDtcblxuICAgIGlmIChwbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLk5PTl9JTVBMSUNJVCkge1xuICAgICAgICB1bml0c1swXSA9IFByZXNldC5GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1g7XG4gICAgICAgIHVuaXRzWzFdID0gUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX1VOSVRfWTtcblxuICAgICAgICB0aGlzLl9zY2FsZSA9IFByZXNldC5GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9TQ0FMRTtcbiAgICB9XG4gICAgZWxzZSBpZiAocGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5JTVBMSUNJVCkge1xuICAgICAgICB1bml0c1swXSA9IFByZXNldC5GVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1VOSVRfWDtcbiAgICAgICAgdW5pdHNbMV0gPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9VTklUX1k7XG5cbiAgICAgICAgdGhpcy5fc2NhbGUgPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9TQ0FMRTtcbiAgICB9XG5cbiAgICB0aGlzLl91bml0c01pbk1heCA9IFtQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9VTklUX01JTiwgUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfVU5JVF9NQVhdOyAvLzEvOC0+NFxuXG4gICAgdGhpcy5fc2NhbGVNaW5NYXggPSBbUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUlOLCBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9TQ0FMRV9NQVhdOyAvLzEvNTAgLT4gMjVcblxuICAgIHRoaXMuX2NlbnRlciA9IFtNYXRoLnJvdW5kKHNpemUgKiAwLjUpLE1hdGgucm91bmQoc2l6ZSAqIDAuNSldO1xuICAgIHRoaXMuX3N2Z1BvcyA9IFswLCAwXTtcblxuICAgIHRoaXMuX2Z1bmMgPSBudWxsO1xuICAgIHRoaXMuc2V0RnVuY3Rpb24odGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xuXG4gICAgdGhpcy5fc2xpZGVyWEhhbmRsZVVwZGF0ZSgpO1xuICAgIHRoaXMuX3NsaWRlcllIYW5kbGVVcGRhdGUoKTtcblxuICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25EcmFnU3RhcnQuYmluZCh0aGlzKSwgZmFsc2UpO1xuICAgIHRoaXMuX3dyYXBOb2RlLmdldEVsZW1lbnQoKS5hZGRFdmVudExpc3RlbmVyKFwibW91c2V3aGVlbFwiLCB0aGlzLl9vblNjYWxlLmJpbmQodGhpcywgZmFsc2UpKTtcblxuICAgIENvbnRyb2xLaXRTaGFyZWQuZ2V0KCkuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5VUERBVEVfVkFMVUUsIHRoaXMsICdvblZhbHVlVXBkYXRlJyk7XG59XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBsb3R0ZXIucHJvdG90eXBlKTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fdXBkYXRlQ2VudGVyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXG4gICAgICAgIHdpZHRoID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBoZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuXG4gICAgdmFyIG1vdXNlUG9zID0gTW91c2UuZ2V0SW5zdGFuY2UoKS5nZXRQb3NpdGlvbigpLFxuICAgICAgICBzdmdQb3MgPSB0aGlzLl9zdmdQb3MsXG4gICAgICAgIGNlbnRlciA9IHRoaXMuX2NlbnRlcjtcblxuICAgIGNlbnRlclswXSA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlUG9zWzBdIC0gc3ZnUG9zWzBdLCB3aWR0aCkpO1xuICAgIGNlbnRlclsxXSA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlUG9zWzFdIC0gc3ZnUG9zWzFdLCBoZWlnaHQpKTtcblxuICAgIHRoaXMuX3Bsb3RHcmFwaCgpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25EcmFnU3RhcnQgPSBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBlbGVtZW50ID0gdGhpcy5fc3ZnO1xuXG4gICAgdmFyIHN2Z1BvcyA9IHRoaXMuX3N2Z1BvcztcbiAgICBzdmdQb3NbMF0gPSAwO1xuICAgIHN2Z1Bvc1sxXSA9IDA7XG5cbiAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICBzdmdQb3NbMF0gKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICBzdmdQb3NbMV0gKz0gZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICB9XG5cbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICBldmVudFVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBvbkRyYWcgPSB0aGlzLl91cGRhdGVDZW50ZXIuYmluZCh0aGlzKSxcbiAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlQ2VudGVyLmJpbmQodGhpcyk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgICAgIH0uYmluZCh0aGlzKTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgdGhpcy5fdXBkYXRlQ2VudGVyKCk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9vblNjYWxlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBlID0gd2luZG93LmV2ZW50IHx8IGU7XG4gICAgdGhpcy5fc2NhbGUgKz0gTWF0aC5tYXgoLTEsIE1hdGgubWluKDEsIChlLndoZWVsRGVsdGEgfHwgLWUuZGV0YWlsKSkpICogLTE7XG5cbiAgICB2YXIgc2NhbGVNaW5NYXggPSB0aGlzLl9zY2FsZU1pbk1heDtcbiAgICB0aGlzLl9zY2FsZSA9IE1hdGgubWF4KHNjYWxlTWluTWF4WzBdLCBNYXRoLm1pbih0aGlzLl9zY2FsZSwgc2NhbGVNaW5NYXhbMV0pKTtcblxuICAgIHRoaXMuX3Bsb3RHcmFwaCgpO1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRGdW5jdGlvbih0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9yZWRyYXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX3Bsb3RNb2RlID09IEZ1bmN0aW9uUGxvdFR5cGUuSU1QTElDSVQpIHtcbiAgICAgICAgdmFyIHNpemUgPSB0aGlzLl93cmFwTm9kZS5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgY2FudmFzID0gdGhpcy5fY2FudmFzO1xuXG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBzaXplICsgJ3B4JztcbiAgICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzLmhlaWdodCA9IHNpemU7XG5cbiAgICAgICAgdGhpcy5fY2FudmFzSW1hZ2VEYXRhID0gdGhpcy5fY2FudmFzQ29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgc2l6ZSwgc2l6ZSk7XG4gICAgfVxuXG4gICAgdGhpcy5fc2xpZGVyWEhhbmRsZVVwZGF0ZSgpO1xuICAgIHRoaXMuX3NsaWRlcllIYW5kbGVVcGRhdGUoKTtcblxuICAgIHRoaXMuc2V0RnVuY3Rpb24odGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5zZXRGdW5jdGlvbiA9IGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgdGhpcy5fZnVuYyA9IGZ1bmMuYmluZCh0aGlzLl9vYmplY3QpO1xuICAgIHRoaXMuX3Bsb3RHcmFwaCgpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fcGxvdEdyYXBoID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2RyYXdHcmlkKCk7XG4gICAgdGhpcy5fZHJhd0F4ZXMoKTtcbiAgICB0aGlzLl9kcmF3UGxvdCgpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fZHJhd0F4ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyxcbiAgICAgICAgc3ZnV2lkdGggPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIHN2Z0hlaWdodCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XG5cbiAgICB2YXIgY2VudGVyID0gdGhpcy5fY2VudGVyLFxuICAgICAgICBjZW50ZXJYID0gY2VudGVyWzBdLFxuICAgICAgICBjZW50ZXJZID0gY2VudGVyWzFdO1xuXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIGNlbnRlclksIHN2Z1dpZHRoLCBjZW50ZXJZKTtcbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKGNlbnRlclgsIDAsIGNlbnRlclgsIHN2Z0hlaWdodCk7XG5cbiAgICB0aGlzLl9heGVzLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fZHJhd1Bsb3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdpZHRoLCBoZWlnaHQ7XG5cbiAgICB2YXIgY2VudGVyID0gdGhpcy5fY2VudGVyLFxuICAgICAgICBjZW50ZXJYID0gY2VudGVyWzBdLFxuICAgICAgICBjZW50ZXJZID0gY2VudGVyWzFdO1xuXG4gICAgdmFyIHVuaXRzID0gdGhpcy5fdW5pdHMsXG4gICAgICAgIHVuaXRYLCB1bml0WTtcblxuICAgIHZhciBzY2FsZSA9IHRoaXMuX3NjYWxlO1xuICAgIHZhciBub3JtdmFsLCBzY2FsZWRWYWwsIHZhbHVlLCBpbmRleDtcbiAgICB2YXIgb2Zmc2V0WCwgb2Zmc2V0WTtcblxuICAgIHZhciBpO1xuXG4gICAgaWYgKHRoaXMuX3Bsb3RNb2RlID09IEZ1bmN0aW9uUGxvdFR5cGUuTk9OX0lNUExJQ0lUKSB7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XG5cbiAgICAgICAgd2lkdGggPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSk7XG4gICAgICAgIGhlaWdodCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XG4gICAgICAgIHVuaXRYID0gdW5pdHNbMF0gKiBzY2FsZTtcbiAgICAgICAgdW5pdFkgPSBoZWlnaHQgLyAodW5pdHNbMV0gKiBzY2FsZSk7XG4gICAgICAgIG9mZnNldFggPSBjZW50ZXJYIC8gd2lkdGg7XG5cbiAgICAgICAgdmFyIGxlbiA9IE1hdGguZmxvb3Iod2lkdGgpLFxuICAgICAgICAgICAgcG9pbnRzID0gbmV3IEFycmF5KGxlbiAqIDIpO1xuXG4gICAgICAgIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgbm9ybXZhbCA9ICgtb2Zmc2V0WCArIGkgLyBsZW4pO1xuICAgICAgICAgICAgc2NhbGVkVmFsID0gbm9ybXZhbCAqIHVuaXRYO1xuICAgICAgICAgICAgdmFsdWUgPSBjZW50ZXJZIC0gdGhpcy5fZnVuYyhzY2FsZWRWYWwpICogdW5pdFk7XG5cbiAgICAgICAgICAgIGluZGV4ID0gaSAqIDI7XG5cbiAgICAgICAgICAgIHBvaW50c1tpbmRleF0gPSBpO1xuICAgICAgICAgICAgcG9pbnRzW2luZGV4ICsgMV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwYXRoQ21kID0gJyc7XG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZE1vdmVUbyhwb2ludHNbMF0sIHBvaW50c1sxXSk7XG5cbiAgICAgICAgaSA9IDI7XG4gICAgICAgIHdoaWxlIChpIDwgcG9pbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZVRvKHBvaW50c1tpXSwgcG9pbnRzW2kgKyAxXSk7XG4gICAgICAgICAgICBpICs9IDI7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9wYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhcyxcbiAgICAgICAgICAgIGNvbnRleHQgPSB0aGlzLl9jYW52YXNDb250ZXh0LFxuICAgICAgICAgICAgaW1nRGF0YSA9IHRoaXMuX2NhbnZhc0ltYWdlRGF0YTtcblxuICAgICAgICB3aWR0aCA9IGNhbnZhcy53aWR0aDtcbiAgICAgICAgaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcblxuICAgICAgICB1bml0WCA9IHVuaXRzWzBdICogc2NhbGU7XG4gICAgICAgIHVuaXRZID0gdW5pdHNbMV0gKiBzY2FsZTtcblxuICAgICAgICBvZmZzZXRYID0gY2VudGVyWCAvIHdpZHRoO1xuICAgICAgICBvZmZzZXRZID0gY2VudGVyWSAvIGhlaWdodDtcblxuICAgICAgICB2YXIgaW52V2lkdGggPSAxIC8gd2lkdGgsXG4gICAgICAgICAgICBpbnZIZWlnaHQgPSAxIC8gaGVpZ2h0O1xuICAgICAgICB2YXIgcmdiID0gWzAsIDAsIDBdO1xuXG4gICAgICAgIHZhciBjb2wwID0gWzMwLCAzNCwgMzZdLFxuICAgICAgICAgICAgY29sMSA9IFsyNTUsIDI1NSwgMjU1XTtcblxuICAgICAgICBpID0gLTE7XG4gICAgICAgIHZhciBqO1xuICAgICAgICB3aGlsZSAoKytpIDwgaGVpZ2h0KSB7XG4gICAgICAgICAgICBqID0gLTE7XG5cbiAgICAgICAgICAgIHdoaWxlICgrK2ogPCB3aWR0aCkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5fZnVuYygoLW9mZnNldFggKyBqICogaW52V2lkdGgpICogdW5pdFgsXG4gICAgICAgICAgICAgICAgICAgICgtb2Zmc2V0WSArIGkgKiBpbnZIZWlnaHQpICogdW5pdFkpO1xuXG4gICAgICAgICAgICAgICAgcmdiWzBdID0gTWF0aC5mbG9vcigoY29sMVswXSAtIGNvbDBbMF0pICogdmFsdWUgKyBjb2wwWzBdKTtcbiAgICAgICAgICAgICAgICByZ2JbMV0gPSBNYXRoLmZsb29yKChjb2wxWzFdIC0gY29sMFsxXSkgKiB2YWx1ZSArIGNvbDBbMV0pO1xuICAgICAgICAgICAgICAgIHJnYlsyXSA9IE1hdGguZmxvb3IoKGNvbDFbMl0gLSBjb2wwWzJdKSAqIHZhbHVlICsgY29sMFsyXSk7XG5cbiAgICAgICAgICAgICAgICBpbmRleCA9IChpICogd2lkdGggKyBqKSAqIDQ7XG5cbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXhdID0gcmdiWzBdO1xuICAgICAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpbmRleCArIDFdID0gcmdiWzFdO1xuICAgICAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpbmRleCArIDJdID0gcmdiWzJdO1xuICAgICAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpbmRleCArIDNdID0gMjU1O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltZ0RhdGEsIDAsIDApO1xuICAgIH1cbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX2RyYXdHcmlkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXG4gICAgICAgIHdpZHRoID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBoZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuXG4gICAgdmFyIHNjYWxlID0gdGhpcy5fc2NhbGU7XG5cbiAgICB2YXIgZ3JpZFJlcyA9IHRoaXMuX3VuaXRzLFxuICAgICAgICBncmlkU3BhY2luZ1ggPSB3aWR0aCAvIChncmlkUmVzWzBdICogc2NhbGUpLFxuICAgICAgICBncmlkU3BhY2luZ1kgPSBoZWlnaHQgLyAoZ3JpZFJlc1sxXSAqIHNjYWxlKTtcblxuICAgIHZhciBjZW50ZXIgPSB0aGlzLl9jZW50ZXIsXG4gICAgICAgIGNlbnRlclggPSBjZW50ZXJbMF0sXG4gICAgICAgIGNlbnRlclkgPSBjZW50ZXJbMV07XG5cbiAgICB2YXIgZ3JpZE51bVRvcCA9IE1hdGgucm91bmQoY2VudGVyWSAvIGdyaWRTcGFjaW5nWSkgKyAxLFxuICAgICAgICBncmlkTnVtQm90dG9tID0gTWF0aC5yb3VuZCgoaGVpZ2h0IC0gY2VudGVyWSkgLyBncmlkU3BhY2luZ1kpICsgMSxcbiAgICAgICAgZ3JpZE51bUxlZnQgPSBNYXRoLnJvdW5kKGNlbnRlclggLyBncmlkU3BhY2luZ1gpICsgMSxcbiAgICAgICAgZ3JpZE51bVJpZ2h0ID0gTWF0aC5yb3VuZCgod2lkdGggLSBjZW50ZXJYKSAvIGdyaWRTcGFjaW5nWCkgKyAxO1xuXG4gICAgdmFyIHBhdGhDbWRHcmlkID0gJycsXG4gICAgICAgIHBhdGhDbWRBeGVzTGFiZWxzID0gJyc7XG5cbiAgICB2YXIgaSwgdGVtcDtcblxuICAgIHZhciBzdHJva2VTaXplID0gTWV0cmljLlNUUk9LRV9TSVpFO1xuXG4gICAgdmFyIGxhYmVsVGlja1NpemUgPSBNZXRyaWMuRlVOQ1RJT05fUExPVFRFUl9MQUJFTF9USUNLX1NJWkUsXG4gICAgICAgIGxhYmVsVGlja1BhZGRpbmdSaWdodCA9IHdpZHRoIC0gbGFiZWxUaWNrU2l6ZSAtIHN0cm9rZVNpemUsXG4gICAgICAgIGxhYmVsVGlja1BhZGRpbmdCb3R0b20gPSBoZWlnaHQgLSBsYWJlbFRpY2tTaXplIC0gc3Ryb2tlU2l6ZSxcbiAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0T2Zmc2V0ID0gbGFiZWxUaWNrUGFkZGluZ1JpZ2h0IC0gbGFiZWxUaWNrU2l6ZSxcbiAgICAgICAgbGFiZWxUaWNrUGFkZGluZ0JvdHRvbU9mZnNldCA9IGxhYmVsVGlja1BhZGRpbmdCb3R0b20gLSBsYWJlbFRpY2tTaXplLFxuICAgICAgICBsYWJlbFRpY2tPZmZzZXRSaWdodCA9IGxhYmVsVGlja1BhZGRpbmdSaWdodCAtIChsYWJlbFRpY2tTaXplICsgc3Ryb2tlU2l6ZSkgKiAyLFxuICAgICAgICBsYWJlbFRpY2tPZmZzZXRCb3R0b20gPSBsYWJlbFRpY2tQYWRkaW5nQm90dG9tIC0gKGxhYmVsVGlja1NpemUgKyBzdHJva2VTaXplKSAqIDI7XG5cbiAgICBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IGdyaWROdW1Ub3ApIHtcbiAgICAgICAgdGVtcCA9IE1hdGgucm91bmQoY2VudGVyWSAtIGdyaWRTcGFjaW5nWSAqIGkpO1xuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCB0ZW1wLCB3aWR0aCwgdGVtcCk7XG5cbiAgICAgICAgaWYgKHRlbXAgPiBsYWJlbFRpY2tTaXplKXtcbiAgICAgICAgICAgIHBhdGhDbWRBeGVzTGFiZWxzICs9IHRoaXMuX3BhdGhDbWRMaW5lKGxhYmVsVGlja1BhZGRpbmdSaWdodCwgdGVtcCxcbiAgICAgICAgICAgICAgICBsYWJlbFRpY2tQYWRkaW5nUmlnaHRPZmZzZXQsIHRlbXApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBncmlkTnVtQm90dG9tKSB7XG4gICAgICAgIHRlbXAgPSBNYXRoLnJvdW5kKGNlbnRlclkgKyBncmlkU3BhY2luZ1kgKiBpKTtcbiAgICAgICAgcGF0aENtZEdyaWQgKz0gdGhpcy5fcGF0aENtZExpbmUoMCwgdGVtcCwgd2lkdGgsIHRlbXApO1xuXG4gICAgICAgIGlmICh0ZW1wIDwgbGFiZWxUaWNrT2Zmc2V0Qm90dG9tKXtcbiAgICAgICAgICAgIHBhdGhDbWRBeGVzTGFiZWxzICs9IHRoaXMuX3BhdGhDbWRMaW5lKGxhYmVsVGlja1BhZGRpbmdSaWdodCwgdGVtcCxcbiAgICAgICAgICAgICAgICBsYWJlbFRpY2tQYWRkaW5nUmlnaHRPZmZzZXQsIHRlbXApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBncmlkTnVtTGVmdCkge1xuICAgICAgICB0ZW1wID0gTWF0aC5yb3VuZChjZW50ZXJYIC0gZ3JpZFNwYWNpbmdYICogaSk7XG4gICAgICAgIHBhdGhDbWRHcmlkICs9IHRoaXMuX3BhdGhDbWRMaW5lKHRlbXAsIDAsIHRlbXAsIGhlaWdodCk7XG5cbiAgICAgICAgaWYgKHRlbXAgPiBsYWJlbFRpY2tTaXplKXtcbiAgICAgICAgICAgIHBhdGhDbWRBeGVzTGFiZWxzICs9IHRoaXMuX3BhdGhDbWRMaW5lKHRlbXAsIGxhYmVsVGlja1BhZGRpbmdCb3R0b20sXG4gICAgICAgICAgICAgICAgdGVtcCwgbGFiZWxUaWNrUGFkZGluZ0JvdHRvbU9mZnNldCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IGdyaWROdW1SaWdodCkge1xuICAgICAgICB0ZW1wID0gTWF0aC5yb3VuZChjZW50ZXJYICsgZ3JpZFNwYWNpbmdYICogaSk7XG4gICAgICAgIHBhdGhDbWRHcmlkICs9IHRoaXMuX3BhdGhDbWRMaW5lKHRlbXAsIDAsIHRlbXAsIGhlaWdodCk7XG5cbiAgICAgICAgaWYgKHRlbXAgPCBsYWJlbFRpY2tPZmZzZXRSaWdodCl7XG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCBsYWJlbFRpY2tQYWRkaW5nQm90dG9tLFxuICAgICAgICAgICAgICAgIHRlbXAsIGxhYmVsVGlja1BhZGRpbmdCb3R0b21PZmZzZXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fZ3JpZC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kR3JpZCk7XG4gICAgdGhpcy5fYXhlc0xhYmVscy5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kQXhlc0xhYmVscyk7XG59O1xuXG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3NsaWRlclhTdGVwID0gZnVuY3Rpb24gKG1vdXNlUG9zKSB7XG4gICAgdmFyIG1vdXNlWCA9IG1vdXNlUG9zWzBdO1xuXG4gICAgdmFyIGhhbmRsZSA9IHRoaXMuX3NsaWRlclhIYW5kbGUsXG4gICAgICAgIGhhbmRsZVdpZHRoID0gaGFuZGxlLmdldFdpZHRoKCksXG4gICAgICAgIGhhbmRsZVdpZHRoSGFsZiA9IGhhbmRsZVdpZHRoICogMC41O1xuXG4gICAgdmFyIHRyYWNrID0gdGhpcy5fc2xpZGVyWFRyYWNrLFxuICAgICAgICB0cmFja1dpZHRoID0gdHJhY2suZ2V0V2lkdGgoKSxcbiAgICAgICAgdHJhY2tMZWZ0ID0gdHJhY2suZ2V0UG9zaXRpb25HbG9iYWxYKCk7XG5cbiAgICB2YXIgc3Ryb2tlU2l6ZSA9IE1ldHJpYy5TVFJPS0VfU0laRTtcblxuICAgIHZhciBtYXggPSB0cmFja1dpZHRoIC0gaGFuZGxlV2lkdGhIYWxmIC0gc3Ryb2tlU2l6ZSAqIDI7XG5cbiAgICB2YXIgcG9zID0gTWF0aC5tYXgoaGFuZGxlV2lkdGhIYWxmLCBNYXRoLm1pbihtb3VzZVggLSB0cmFja0xlZnQsIG1heCkpLFxuICAgICAgICBoYW5kbGVQb3MgPSBwb3MgLSBoYW5kbGVXaWR0aEhhbGY7XG5cbiAgICBoYW5kbGUuc2V0UG9zaXRpb25YKGhhbmRsZVBvcyk7XG5cbiAgICB2YXIgdW5pdHNNaW4gPSB0aGlzLl91bml0c01pbk1heFswXSxcbiAgICAgICAgdW5pdHNNYXggPSB0aGlzLl91bml0c01pbk1heFsxXTtcblxuICAgIHZhciBub3JtVmFsID0gKHBvcyAtIGhhbmRsZVdpZHRoSGFsZikgLyAobWF4IC0gaGFuZGxlV2lkdGhIYWxmKSxcbiAgICAgICAgbWFwcGVkVmFsID0gdW5pdHNNaW4gKyAodW5pdHNNYXggLSB1bml0c01pbikgKiBub3JtVmFsO1xuXG4gICAgdGhpcy5fdW5pdHNbMF0gPSBtYXBwZWRWYWw7XG5cbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3NsaWRlcllTdGVwID0gZnVuY3Rpb24gKG1vdXNlUG9zKSB7XG4gICAgdmFyIG1vdXNlWSA9IG1vdXNlUG9zWzFdO1xuXG4gICAgdmFyIGhhbmRsZSA9IHRoaXMuX3NsaWRlcllIYW5kbGUsXG4gICAgICAgIGhhbmRsZUhlaWdodCA9IGhhbmRsZS5nZXRIZWlnaHQoKSxcbiAgICAgICAgaGFuZGxlSGVpZ2h0SGFsZiA9IGhhbmRsZUhlaWdodCAqIDAuNTtcblxuICAgIHZhciB0cmFjayA9IHRoaXMuX3NsaWRlcllUcmFjayxcbiAgICAgICAgdHJhY2tIZWlnaHQgPSB0cmFjay5nZXRIZWlnaHQoKSxcbiAgICAgICAgdHJhY2tUb3AgPSB0cmFjay5nZXRQb3NpdGlvbkdsb2JhbFkoKTtcblxuICAgIHZhciBtYXggPSB0cmFja0hlaWdodCAtIGhhbmRsZUhlaWdodEhhbGYgLSAyO1xuXG4gICAgdmFyIHBvcyA9IE1hdGgubWF4KGhhbmRsZUhlaWdodEhhbGYsIE1hdGgubWluKG1vdXNlWSAtIHRyYWNrVG9wLCBtYXgpKSxcbiAgICAgICAgaGFuZGxlUG9zID0gcG9zIC0gaGFuZGxlSGVpZ2h0SGFsZjtcblxuICAgIGhhbmRsZS5zZXRQb3NpdGlvblkoaGFuZGxlUG9zKTtcblxuICAgIHZhciB1bml0c01heCA9IHRoaXMuX3VuaXRzTWluTWF4WzBdLFxuICAgICAgICB1bml0c01pbiA9IHRoaXMuX3VuaXRzTWluTWF4WzFdO1xuXG4gICAgdmFyIG5vcm1WYWwgPSAocG9zIC0gaGFuZGxlSGVpZ2h0SGFsZikgLyAobWF4IC0gaGFuZGxlSGVpZ2h0SGFsZiksXG4gICAgICAgIG1hcHBlZFZhbCA9IHVuaXRzTWluICsgKHVuaXRzTWF4IC0gdW5pdHNNaW4pICogbm9ybVZhbDtcblxuICAgIHRoaXMuX3VuaXRzWzFdID0gbWFwcGVkVmFsO1xuXG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9vblNsaWRlclhIYW5kbGVEb3duID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX29uU2xpZGVySGFuZGxlRG93bih0aGlzLl9zbGlkZXJYU3RlcC5iaW5kKHRoaXMpKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uU2xpZGVyWUhhbmRsZURvd24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fb25TbGlkZXJIYW5kbGVEb3duKHRoaXMuX3NsaWRlcllTdGVwLmJpbmQodGhpcykpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TbGlkZXJIYW5kbGVEb3duID0gZnVuY3Rpb24gKHNsaWRlclN0ZXBGdW5jKSB7XG4gICAgdmFyIGV2ZW50TW91c2VNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICBldmVudE1vdXNlVXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIG1vdXNlID0gTW91c2UuZ2V0SW5zdGFuY2UoKTtcblxuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzbGlkZXJTdGVwRnVuYyhtb3VzZS5nZXRQb3NpdGlvbigpKVxuICAgICAgICB9LFxuICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgIHNsaWRlclN0ZXBGdW5jKG1vdXNlLmdldFBvc2l0aW9uKCkpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3NsaWRlclhIYW5kbGVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHVuaXRNaW4gPSB0aGlzLl91bml0c01pbk1heFswXSxcbiAgICAgICAgdW5pdE1heCA9IHRoaXMuX3VuaXRzTWluTWF4WzFdLFxuICAgICAgICB1bml0WCA9IHRoaXMuX3VuaXRzWzBdO1xuXG4gICAgdmFyIGhhbmRsZVggPSB0aGlzLl9zbGlkZXJYSGFuZGxlLFxuICAgICAgICBoYW5kbGVYV2lkdGggPSBoYW5kbGVYLmdldFdpZHRoKCksXG4gICAgICAgIGhhbmRsZVhXaWR0aEhhbGYgPSBoYW5kbGVYV2lkdGggKiAwLjUsXG4gICAgICAgIHRyYWNrWFdpZHRoID0gdGhpcy5fc2xpZGVyWFRyYWNrLmdldFdpZHRoKCk7XG5cbiAgICB2YXIgc3Ryb2tlU2l6ZSA9IE1ldHJpYy5TVFJPS0VfU0laRTtcblxuICAgIHZhciBoYW5kbGVYTWluID0gaGFuZGxlWFdpZHRoSGFsZixcbiAgICAgICAgaGFuZGxlWE1heCA9IHRyYWNrWFdpZHRoIC0gaGFuZGxlWFdpZHRoSGFsZiAtIHN0cm9rZVNpemUgKiAyO1xuXG4gICAgaGFuZGxlWC5zZXRQb3NpdGlvblgoKGhhbmRsZVhNaW4gKyAoaGFuZGxlWE1heCAtIGhhbmRsZVhNaW4pICogKCh1bml0WCAtIHVuaXRNaW4pIC8gKHVuaXRNYXggLSB1bml0TWluKSkpIC0gaGFuZGxlWFdpZHRoSGFsZik7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9zbGlkZXJZSGFuZGxlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB1bml0TWluID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXG4gICAgICAgIHVuaXRNYXggPSB0aGlzLl91bml0c01pbk1heFsxXSxcbiAgICAgICAgdW5pdFkgPSB0aGlzLl91bml0c1sxXTtcblxuICAgIHZhciBoYW5kbGVZID0gdGhpcy5fc2xpZGVyWUhhbmRsZSxcbiAgICAgICAgaGFuZGxlWUhlaWdodCA9IGhhbmRsZVkuZ2V0SGVpZ2h0KCksXG4gICAgICAgIGhhbmRsZVlIZWlnaHRIYWxmID0gaGFuZGxlWUhlaWdodCAqIDAuNSxcbiAgICAgICAgdHJhY2tZSGVpZ2h0ID0gdGhpcy5fc2xpZGVyWVRyYWNrLmdldEhlaWdodCgpO1xuXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XG5cbiAgICB2YXIgaGFuZGxlWU1pbiA9IHRyYWNrWUhlaWdodCAtIGhhbmRsZVlIZWlnaHRIYWxmIC0gc3Ryb2tlU2l6ZSAqIDIsXG4gICAgICAgIGhhbmRsZVlNYXggPSBoYW5kbGVZSGVpZ2h0SGFsZjtcblxuICAgIGhhbmRsZVkuc2V0UG9zaXRpb25ZKChoYW5kbGVZTWluICsgKGhhbmRsZVlNYXggLSBoYW5kbGVZTWluKSAqICgodW5pdFkgLSB1bml0TWluKSAvICh1bml0TWF4IC0gdW5pdE1pbikpKSAtIGhhbmRsZVlIZWlnaHRIYWxmKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRnVuY3Rpb25QbG90dGVyOyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuL09iamVjdENvbXBvbmVudCcpO1xudmFyIE51bWJlcklucHV0X0ludGVybmFsID0gcmVxdWlyZSgnLi9OdW1iZXJJbnB1dF9JbnRlcm5hbCcpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBPcHRpb25zID0gcmVxdWlyZSgnLi9PcHRpb25zJyk7XG52YXIgUHJlc2V0QnRuID0gcmVxdWlyZSgnLi9QcmVzZXRCdG4nKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9OVU1CRVJfSU5QVVRfRFAgICAgID0gMixcbiAgICBERUZBVUxUX05VTUJFUl9JTlBVVF9TVEVQICAgPSAxLFxuICAgIERFRkFVTFRfTlVNQkVSX0lOUFVUX1BSRVNFVCA9IG51bGw7XG5cbmZ1bmN0aW9uIE51bWJlcklucHV0KHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKSB7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyAgICAgICAgICA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgcGFyYW1zLm9uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoIHx8IHRoaXMuX29uRmluaXNoO1xuICAgIHBhcmFtcy5kcCAgICAgICA9IHBhcmFtcy5kcCAgICAgICB8fCBERUZBVUxUX05VTUJFUl9JTlBVVF9EUDtcbiAgICBwYXJhbXMuc3RlcCAgICAgPSBwYXJhbXMuc3RlcCAgICAgfHwgREVGQVVMVF9OVU1CRVJfSU5QVVRfU1RFUDtcbiAgICBwYXJhbXMucHJlc2V0cyAgPSBwYXJhbXMucHJlc2V0cyAgfHwgREVGQVVMVF9OVU1CRVJfSU5QVVRfUFJFU0VUO1xuXG4gICAgdGhpcy5fb25DaGFuZ2UgICAgPSBwYXJhbXMub25DaGFuZ2U7XG4gICAgdGhpcy5fb25GaW5pc2ggICAgPSBwYXJhbXMub25GaW5pc2g7XG4gICAgdGhpcy5fcHJlc2V0c0tleSAgPSBwYXJhbXMucHJlc2V0cztcblxuXG4gICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXQgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwocGFyYW1zLnN0ZXAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRGaW5pc2guYmluZCh0aGlzKSk7XG5cbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcblxuICAgIGlmICghdGhpcy5fcHJlc2V0c0tleSkge1xuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChpbnB1dC5nZXROb2RlKCkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIGlucHV0V3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgICAgICBpbnB1dFdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcElucHV0V1ByZXNldCk7XG5cbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQoaW5wdXRXcmFwKTtcbiAgICAgICAgaW5wdXRXcmFwLmFkZENoaWxkKGlucHV0LmdldE5vZGUoKSk7XG5cbiAgICAgICAgdmFyIHByZXNldHMgPSB0aGlzLl9vYmplY3RbdGhpcy5fcHJlc2V0c0tleV07XG5cbiAgICAgICAgdmFyIG9wdGlvbnMgICA9IE9wdGlvbnMuZ2V0SW5zdGFuY2UoKTtcbiAgICAgICAgdmFyIHByZXNldEJ0biA9IHRoaXMuX3ByZXNldEJ0biA9IG5ldyBQcmVzZXRCdG4odGhpcy5fd3JhcE5vZGUpO1xuXG4gICAgICAgIHZhciBvblByZXNldERlYWN0aXZhdGUgPSBmdW5jdGlvbigpe29wdGlvbnMuY2xlYXIoKTtwcmVzZXRCdG4uZGVhY3RpdmF0ZSgpO307XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgb25QcmVzZXRBY3RpdmF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuYnVpbGQocHJlc2V0cywgaW5wdXQuZ2V0VmFsdWUoKSwgaW5wdXQuZ2V0Tm9kZSgpLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuc2V0VmFsdWUocHJlc2V0c1tvcHRpb25zLmdldFNlbGVjdGVkSW5kZXgoKV0pO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUHJlc2V0RGVhY3RpdmF0ZSwgTWV0cmljLlBBRERJTkdfUFJFU0VULFxuICAgICAgICAgICAgICAgIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgICAgICBwcmVzZXRCdG4uc2V0T25BY3RpdmUob25QcmVzZXRBY3RpdmF0ZSk7XG4gICAgICAgIHByZXNldEJ0bi5zZXRPbkRlYWN0aXZlKG9uUHJlc2V0RGVhY3RpdmF0ZSlcbiAgICB9XG5cbiAgICBpbnB1dC5nZXROb2RlKCkuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgICB0aGlzLl9vbklucHV0RHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRyx0aGlzLl9wYXJlbnQsJ29uQ29tcG9uZW50U2VsZWN0RHJhZycpO1xuXG4gICAgaW5wdXQuc2V0VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufVxuXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5OdW1iZXJJbnB1dC5wcm90b3R5cGUuX29uSW5wdXRGaW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fb25GaW5pc2goKTtcbn07XG5cbk51bWJlcklucHV0LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24oKVxue1xuICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xuICAgIHRoaXMuX29iamVjdFt0aGlzLl9rZXldID0gdGhpcy5faW5wdXQuZ2V0VmFsdWUoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsbnVsbCkpO1xufTtcblxuTnVtYmVySW5wdXQucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpcmV0dXJuO1xuICAgIHRoaXMuX2lucHV0LnNldFZhbHVlKHRoaXMuX29iamVjdFt0aGlzLl9rZXldKTtcbn07XG5cbi8vUHJldmVudCBjaHJvbWUgc2VsZWN0IGRyYWdcbk51bWJlcklucHV0LnByb3RvdHlwZS5fb25JbnB1dERyYWdTdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICBldmVudFVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBldmVudCA9IENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25EcmFnRmluaXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcblxuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJJbnB1dDsiLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXInKTtcbnZhciBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIFBSRVNFVF9OVU1CRVJfSU5QVVRfU0hJRlRfTVVMVElQTElFUiAgPSAxMDtcblxuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbCA9IGZ1bmN0aW9uIChzdGVwVmFsdWUsIGRlY2ltYWxQbGFjZXMsIG9uQmVnaW4sIG9uQ2hhbmdlLCBvbkZpbmlzaCkge1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLCBudWxsKTtcblxuICAgIHRoaXMuX3ZhbHVlID0gMDtcbiAgICB0aGlzLl92YWx1ZVN0ZXAgPSBzdGVwVmFsdWU7XG4gICAgdGhpcy5fdmFsdWVEUGxhY2UgPSBkZWNpbWFsUGxhY2VzICsgMTtcblxuICAgIHRoaXMuX29uQmVnaW4gPSBvbkJlZ2luIHx8IGZ1bmN0aW9uICgpe307XG4gICAgdGhpcy5fb25DaGFuZ2UgPSBvbkNoYW5nZSB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICB0aGlzLl9vbkZpbmlzaCA9IG9uRmluaXNoIHx8IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgdGhpcy5fcHJldktleUNvZGUgPSBudWxsO1xuXG4gICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXQgPSBuZXcgTm9kZShOb2RlLklOUFVUX1RFWFQpO1xuICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX3ZhbHVlKTtcblxuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LktFWV9ET1dOLCB0aGlzLl9vbklucHV0S2V5RG93bi5iaW5kKHRoaXMpKTtcbiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5LRVlfVVAsIHRoaXMuX29uSW5wdXRLZXlVcC5iaW5kKHRoaXMpKTtcbiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5DSEFOR0UsIHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSk7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuX29uSW5wdXRLZXlEb3duID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgc3RlcCA9IChlLnNoaWZ0S2V5ID8gUFJFU0VUX05VTUJFUl9JTlBVVF9TSElGVF9NVUxUSVBMSUVSIDogMSkgKiB0aGlzLl92YWx1ZVN0ZXAsXG4gICAgICAgIGtleUNvZGUgPSBlLmtleUNvZGU7XG5cbiAgICBpZiAoa2V5Q29kZSA9PSAzOCB8fFxuICAgICAgICBrZXlDb2RlID09IDQwKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICB2YXIgbXVsdGlwbGllciA9IGtleUNvZGUgPT0gMzggPyAxLjAgOiAtMS4wO1xuICAgICAgICB0aGlzLl92YWx1ZSArPSAoc3RlcCAqIG11bHRpcGxpZXIpO1xuXG4gICAgICAgIHRoaXMuX29uQmVnaW4oKTtcbiAgICAgICAgdGhpcy5fb25DaGFuZ2UoKTtcbiAgICAgICAgdGhpcy5fZm9ybWF0KCk7XG4gICAgfVxufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl9vbklucHV0S2V5VXAgPSBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBrZXlDb2RlID0gZS5rZXlDb2RlO1xuXG5cbiAgICBpZiAoZS5zaGlmdEtleSB8fCBrZXlDb2RlID09IDM4IHx8XG4gICAgICAgIGtleUNvZGUgPT0gNDAgfHwga2V5Q29kZSA9PSAxOTAgfHxcbiAgICAgICAga2V5Q29kZSA9PSA4IHx8IGtleUNvZGUgPT0gMzkgfHxcbiAgICAgICAga2V5Q29kZSA9PSAzNyB8fCBrZXlDb2RlID09IDE4OSkge1xuICAgICAgICB0aGlzLl9wcmV2S2V5Q29kZSA9IGtleUNvZGU7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcHJldktleUNvZGUgPT0gMTg5ICYmIGtleUNvZGUgPT0gNDgpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH0gLy8tMFxuICAgIGlmICh0aGlzLl9wcmV2S2V5Q29kZSA9PSAxOTAgJiYga2V5Q29kZSA9PSA0OCkge1xuICAgICAgICByZXR1cm47XG4gICAgfSAvLzAuMFxuXG4gICAgdGhpcy5fdmFsaWRhdGUoKTtcbiAgICB0aGlzLl9mb3JtYXQoKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgdGhpcy5fdmFsaWRhdGUoKTtcbiAgICB0aGlzLl9mb3JtYXQoKTtcbiAgICB0aGlzLl9vbkZpbmlzaCgpO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl92YWxpZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pbnB1dElzTnVtYmVyKCkpIHtcbiAgICAgICAgdmFyIGlucHV0ID0gdGhpcy5fZ2V0SW5wdXQoKTtcbiAgICAgICAgaWYgKGlucHV0ICE9ICctJyl0aGlzLl92YWx1ZSA9IE51bWJlcihpbnB1dCk7XG4gICAgICAgIHRoaXMuX29uQ2hhbmdlKCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl9zZXRPdXRwdXQodGhpcy5fdmFsdWUpO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLmlucHV0SXNOdW1iZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5fZ2V0SW5wdXQoKTtcblxuICAgIC8vVE9ETzpGSVhcbiAgICBpZiAodmFsdWUgPT0gJy0nIHx8IHZhbHVlID09ICcwJylyZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gL15cXHMqLT9bMC05XVxcZCooXFwuXFxkezEsMTAwMDAwMH0pP1xccyokLy50ZXN0KHZhbHVlKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fZm9ybWF0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdHJpbmcgPSB0aGlzLl92YWx1ZS50b1N0cmluZygpLFxuICAgICAgICBpbmRleCA9IHN0cmluZy5pbmRleE9mKCcuJyk7XG5cblxuICAgIGlmIChpbmRleCA+IDApIHtcbiAgICAgICAgc3RyaW5nID0gc3RyaW5nLnNsaWNlKDAsIGluZGV4ICsgdGhpcy5fdmFsdWVEUGxhY2UpO1xuICAgIH1cblxuICAgIHRoaXMuX3NldE91dHB1dChzdHJpbmcpO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl9zZXRPdXRwdXQgPSBmdW5jdGlvbiAobikge1xuICAgIHRoaXMuX2lucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsIG4pO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl9nZXRJbnB1dCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJylcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbiAobikge1xuICAgIHRoaXMuX3ZhbHVlID0gbjtcbiAgICB0aGlzLl9mb3JtYXQoKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5nZXROb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9pbnB1dDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVySW5wdXRfSW50ZXJuYWw7XG4iLCJ2YXIgT3V0cHV0ID0gcmVxdWlyZSgnLi9PdXRwdXQnKTtcblxudmFyIERFRkFVTFRfTlVNQkVSX09VVFBVVF9EUCA9IDI7XG5cbmZ1bmN0aW9uIE51bWJlck91dHB1dChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuXHRwYXJhbXMgPSBwYXJhbXMgfHwge307XG5cdHBhcmFtcy5kcCA9IHBhcmFtcy5kcCB8fCBERUZBVUxUX05VTUJFUl9PVVRQVVRfRFA7XG5cblx0T3V0cHV0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdHRoaXMuX3ZhbHVlRFBsYWNlID0gcGFyYW1zLmRwICsgMTtcbn1cblxuTnVtYmVyT3V0cHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT3V0cHV0LnByb3RvdHlwZSk7XG5cbi8vRklYTUVcbk51bWJlck91dHB1dC5wcm90b3R5cGUuX3NldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuXHRpZiAodGhpcy5fcGFyZW50LmlzRGlzYWJsZWQoKSl7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dmFyIHZhbHVlID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV0sXG5cdFx0dGV4dEFyZWEgPSB0aGlzLl90ZXh0QXJlYSxcblx0XHRkcCA9IHRoaXMuX3ZhbHVlRFBsYWNlO1xuXG5cdHZhciBpbmRleCxcblx0XHRvdXQ7XG5cblx0aWYgKHR5cGVvZih2YWx1ZSkgPT09ICdvYmplY3QnICYmXG5cdFx0dHlwZW9mKHZhbHVlLmxlbmd0aCkgPT09ICdudW1iZXInICYmXG5cdFx0dHlwZW9mKHZhbHVlLnNwbGljZSkgPT09ICdmdW5jdGlvbicgJiZcblx0XHQhdmFsdWUucHJvcGVydHlJc0VudW1lcmFibGUoJ2xlbmd0aCcpKSB7XG5cblx0XHRvdXQgPSB2YWx1ZS5zbGljZSgpO1xuXG5cdFx0dmFyIGkgPSAtMTtcblx0XHR2YXIgdGVtcDtcblx0XHR2YXIgd3JhcCA9IHRoaXMuX3dyYXA7XG5cblx0XHR3aGlsZSAoKytpIDwgb3V0Lmxlbmd0aCkge1xuXHRcdFx0dGVtcCA9IG91dFtpXSA9IG91dFtpXS50b1N0cmluZygpO1xuXHRcdFx0aW5kZXggPSB0ZW1wLmluZGV4T2YoJy4nKTtcblx0XHRcdGlmIChpbmRleCA+IDApb3V0W2ldID0gdGVtcC5zbGljZSgwLCBpbmRleCArIGRwKTtcblx0XHR9XG5cblx0XHRpZiAod3JhcCkge1xuXHRcdFx0dGV4dEFyZWEuc2V0U3R5bGVQcm9wZXJ0eSgnd2hpdGUtc3BhY2UnLCAnbm93cmFwJyk7XG5cdFx0XHRvdXQgPSBvdXQuam9pbignXFxuJyk7XG5cdFx0fVxuXG5cdFx0dGV4dEFyZWEuc2V0UHJvcGVydHkoJ3ZhbHVlJywgb3V0KTtcblx0fWVsc2Uge1xuXHRcdG91dCA9IHZhbHVlLnRvU3RyaW5nKCk7XG5cdFx0aW5kZXggPSBvdXQuaW5kZXhPZignLicpO1xuXHRcdHRleHRBcmVhLnNldFByb3BlcnR5KCd2YWx1ZScsIGluZGV4ID4gMCA/IG91dC5zbGljZSgwLCBpbmRleCArIGRwKSA6IG91dCk7XG5cdH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJPdXRwdXQ7IiwidmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50Jyk7XG52YXIgSGlzdG9yeSA9IHJlcXVpcmUoJy4uL2NvcmUvSGlzdG9yeScpO1xudmFyIENvbnRyb2xLaXRTaGFyZWQgPSByZXF1aXJlKCcuLi9Db250cm9sS2l0U2hhcmVkJyk7XG52YXIgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuL0NvbXBvbmVudEV2ZW50Jyk7XG5cblxuZnVuY3Rpb24gT2JqZWN0Q29tcG9uZW50KHBhcmVudCxvYmplY3Qsa2V5LHBhcmFtcykge1xuICAgIGlmKG9iamVjdFtrZXldID09PSB1bmRlZmluZWQpe1xuICAgICAgICB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoJ09iamVjdCBvZiB0eXBlICcgKyBvYmplY3QuY29uc3RydWN0b3IubmFtZSArICcgaGFzIG5vIG1lbWJlciAnICsga2V5ICsgJy4nKTtcbiAgICB9XG5cbiAgICBwYXJhbXMgICAgICAgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLmxhYmVsID0gcGFyYW1zLmxhYmVsIHx8IGtleTtcblxuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLFtwYXJlbnQscGFyYW1zLmxhYmVsXSk7XG5cbiAgICB0aGlzLl9vYmplY3QgICA9IG9iamVjdDtcbiAgICB0aGlzLl9rZXkgICAgICA9IGtleTtcblxuICAgIHRoaXMuX29uQ2hhbmdlID0gZnVuY3Rpb24oKXt9O1xuICAgIHRoaXMuX29uRmluaXNoID0gZnVuY3Rpb24oKXt9O1xuXG4gICAgdmFyIGJhc2UgPSBDb250cm9sS2l0U2hhcmVkLmdldCgpO1xuICAgIGJhc2UuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5VUERBVEVfVkFMVUUsIHRoaXMsJ29uVmFsdWVVcGRhdGUnKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgYmFzZSwgJ29uVmFsdWVVcGRhdGVkJyk7XG59XG5cbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG4vL092ZXJyaWRlIGluIFN1YmNsYXNzXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbigpIHt9O1xuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24oZSkge307XG5cbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUucHVzaEhpc3RvcnlTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvYmogPSB0aGlzLl9vYmplY3QsIGtleSA9IHRoaXMuX2tleTtcbiAgICBIaXN0b3J5LmdldEluc3RhbmNlKCkucHVzaFN0YXRlKG9iaiwga2V5LCBvYmpba2V5XSk7XG59O1xuXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSA9IHZhbHVlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RDb21wb25lbnQ7XG4iLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG5cbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIENvbG9yTW9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JNb2RlJyk7XG52YXIgQ29sb3JVdGlsID0gcmVxdWlyZSgnLi4vY29yZS9jb2xvci9Db2xvclV0aWwnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xuXG5mdW5jdGlvbiBPcHRpb25zKHBhcmVudE5vZGUpIHtcbiAgICB0aGlzLl9wYXJlbk5vZGUgPSBwYXJlbnROb2RlO1xuXG4gICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlID0gbmV3IE5vZGUoKTtcbiAgICB2YXIgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVCk7XG5cbiAgICBub2RlLnNldFN0eWxlQ2xhc3MoQ1NTLk9wdGlvbnMpO1xuICAgIG5vZGUuYWRkQ2hpbGQobGlzdE5vZGUpO1xuXG4gICAgdGhpcy5fc2VsZWN0ZWRJbmRleCA9IG51bGw7XG4gICAgdGhpcy5fY2FsbGJhY2tPdXQgPSBmdW5jdGlvbiAoKSB7IH07XG5cbiAgICB0aGlzLl91bmZvY3VzYWJsZSA9IGZhbHNlO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uRG9jdW1lbnRNb3VzZURvd24uYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX1VQLCB0aGlzLl9vbkRvY3VtZW50TW91c2VVcC5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMuY2xlYXIoKTtcbn1cblxuT3B0aW9ucy5wcm90b3R5cGUgPSB7XG4gICAgX29uRG9jdW1lbnRNb3VzZURvd246IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl91bmZvY3VzYWJsZSlyZXR1cm47XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrT3V0KCk7XG4gICAgfSxcblxuICAgIF9vbkRvY3VtZW50TW91c2VVcDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl91bmZvY3VzYWJsZSA9IHRydWU7XG4gICAgfSxcblxuICAgIGJ1aWxkOiBmdW5jdGlvbiAoZW50cmllcywgc2VsZWN0ZWQsIGVsZW1lbnQsIGNhbGxiYWNrU2VsZWN0LCBjYWxsYmFja091dCwgcGFkZGluZ1JpZ2h0LCBhcmVDb2xvcnMsIGNvbG9yTW9kZSkge1xuICAgICAgICB0aGlzLl9jbGVhckxpc3QoKTtcblxuICAgICAgICB0aGlzLl9wYXJlbk5vZGUuYWRkQ2hpbGQodGhpcy5nZXROb2RlKCkpO1xuXG4gICAgICAgIHZhciByb290Tm9kZSA9IHRoaXMuX25vZGUsXG4gICAgICAgICAgICBsaXN0Tm9kZSA9IHRoaXMuX2xpc3ROb2RlO1xuXG4gICAgICAgIHBhZGRpbmdSaWdodCA9IHBhZGRpbmdSaWdodCB8fCAwO1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAvLyBidWlsZCBsaXN0XG4gICAgICAgIHZhciBpdGVtTm9kZSwgZW50cnk7XG4gICAgICAgIHZhciBpID0gLTE7XG5cbiAgICAgICAgaWYgKGFyZUNvbG9ycykge1xuICAgICAgICAgICAgY29sb3JNb2RlID0gY29sb3JNb2RlIHx8IENvbG9yTW9kZS5IRVg7XG5cbiAgICAgICAgICAgIGxpc3ROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkNvbG9yKTtcblxuICAgICAgICAgICAgdmFyIGNvbG9yLCBub2RlQ29sb3I7XG5cbiAgICAgICAgICAgIHdoaWxlICgrK2kgPCBlbnRyaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGVudHJ5ID0gZW50cmllc1tpXTtcbiAgICAgICAgICAgICAgICBpdGVtTm9kZSA9IGxpc3ROb2RlLmFkZENoaWxkKG5ldyBOb2RlKE5vZGUuTElTVF9JVEVNKSk7XG4gICAgICAgICAgICAgICAgY29sb3IgPSBpdGVtTm9kZS5hZGRDaGlsZChuZXcgTm9kZSgpKTtcblxuICAgICAgICAgICAgICAgIHN3aXRjaCAoY29sb3JNb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ29sb3JNb2RlLkhFWDpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVDb2xvciA9IGVudHJ5O1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ29sb3JNb2RlLlJHQjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVDb2xvciA9IENvbG9yVXRpbC5SR0IySEVYKGVudHJ5WzBdLCBlbnRyeVsxXSwgZW50cnlbMl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ29sb3JNb2RlLlJHQmZ2OlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUNvbG9yID0gQ29sb3JVdGlsLlJHQmZ2MkhFWChlbnRyeVswXSwgZW50cnlbMV0sIGVudHJ5WzJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIENvbG9yTW9kZS5IU1Y6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuSFNWMlJHQihlbnRyeVswXSwgZW50cnlbMV0sIGVudHJ5WzJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbG9yLmdldFN0eWxlKCkuYmFja2dyb3VuZENvbG9yID0gbm9kZUNvbG9yO1xuICAgICAgICAgICAgICAgIGNvbG9yLmdldFN0eWxlKCkuYmFja2dyb3VuZEltYWdlID0gJ2xpbmVhci1ncmFkaWVudCggcmdiYSgwLDAsMCwwKSAwJSwgcmdiYSgwLDAsMCwwLjEpIDEwMCUpJztcbiAgICAgICAgICAgICAgICBjb2xvci5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgZW50cnkpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5ID09IHNlbGVjdGVkKWl0ZW1Ob2RlLnNldFN0eWxlQ2xhc3MoQ1NTLk9wdGlvbnNTZWxlY3RlZCk7XG5cbiAgICAgICAgICAgICAgICBpdGVtTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9zZWxlY3RlZEluZGV4ID0gQXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLnBhcmVudE5vZGUuY2hpbGRyZW4sIHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tTZWxlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxpc3ROb2RlLmRlbGV0ZVN0eWxlQ2xhc3MoKTtcblxuICAgICAgICAgICAgd2hpbGUgKCsraSA8IGVudHJpZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZW50cnkgPSBlbnRyaWVzW2ldO1xuXG4gICAgICAgICAgICAgICAgaXRlbU5vZGUgPSBsaXN0Tm9kZS5hZGRDaGlsZChuZXcgTm9kZShOb2RlLkxJU1RfSVRFTSkpO1xuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCBlbnRyeSk7XG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5ID09IHNlbGVjdGVkKWl0ZW1Ob2RlLnNldFN0eWxlQ2xhc3MoQ1NTLk9wdGlvbnNTZWxlY3RlZCk7XG5cbiAgICAgICAgICAgICAgICBpdGVtTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9zZWxlY3RlZEluZGV4ID0gQXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLnBhcmVudE5vZGUuY2hpbGRyZW4sIHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tTZWxlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvL3Bvc2l0aW9uLCBzZXQgd2lkdGggYW5kIGVuYWJsZVxuXG4gICAgICAgIHZhciBlbGVtZW50UG9zID0gZWxlbWVudC5nZXRQb3NpdGlvbkdsb2JhbCgpLFxuICAgICAgICAgICAgZWxlbWVudFdpZHRoID0gZWxlbWVudC5nZXRXaWR0aCgpIC0gcGFkZGluZ1JpZ2h0LFxuICAgICAgICAgICAgZWxlbWVudEhlaWdodCA9IGVsZW1lbnQuZ2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgdmFyIGxpc3RXaWR0aCA9IGxpc3ROb2RlLmdldFdpZHRoKCksXG4gICAgICAgICAgICBsaXN0SGVpZ2h0ID0gbGlzdE5vZGUuZ2V0SGVpZ2h0KCksXG4gICAgICAgICAgICBzdHJva2VPZmZzZXQgPSBNZXRyaWMuU1RST0tFX1NJWkUgKiAyO1xuXG4gICAgICAgIHZhciBwYWRkaW5nT3B0aW9ucyA9IE1ldHJpYy5QQURESU5HX09QVElPTlM7XG5cbiAgICAgICAgdmFyIHdpZHRoID0gKGxpc3RXaWR0aCA8IGVsZW1lbnRXaWR0aCA/IGVsZW1lbnRXaWR0aCA6IGxpc3RXaWR0aCkgLSBzdHJva2VPZmZzZXQsXG4gICAgICAgICAgICBwb3NYID0gZWxlbWVudFBvc1swXSxcbiAgICAgICAgICAgIHBvc1kgPSBlbGVtZW50UG9zWzFdICsgZWxlbWVudEhlaWdodCAtIHBhZGRpbmdPcHRpb25zO1xuXG4gICAgICAgIHZhciB3aW5kb3dXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoLFxuICAgICAgICAgICAgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuXG4gICAgICAgIHZhciByb290UG9zWCA9IChwb3NYICsgd2lkdGgpID4gd2luZG93V2lkdGggPyAocG9zWCAtIHdpZHRoICsgZWxlbWVudFdpZHRoIC0gc3Ryb2tlT2Zmc2V0KSA6IHBvc1gsXG4gICAgICAgICAgICByb290UG9zWSA9IChwb3NZICsgbGlzdEhlaWdodCkgPiB3aW5kb3dIZWlnaHQgPyAocG9zWSAtIGxpc3RIZWlnaHQgKiAwLjUgLSBlbGVtZW50SGVpZ2h0ICogMC41KSA6IHBvc1k7XG5cbiAgICAgICAgbGlzdE5vZGUuc2V0V2lkdGgod2lkdGgpO1xuICAgICAgICByb290Tm9kZS5zZXRQb3NpdGlvbkdsb2JhbChyb290UG9zWCwgcm9vdFBvc1kpO1xuXG4gICAgICAgIHRoaXMuX2NhbGxiYWNrT3V0ID0gY2FsbGJhY2tPdXQ7XG4gICAgICAgIHRoaXMuX3VuZm9jdXNhYmxlID0gZmFsc2U7XG4gICAgfSxcblxuICAgIF9jbGVhckxpc3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fbGlzdE5vZGUucmVtb3ZlQWxsQ2hpbGRyZW4oKTtcbiAgICAgICAgdGhpcy5fbGlzdE5vZGUuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnd2lkdGgnKTtcbiAgICAgICAgdGhpcy5fc2VsZWN0ZWRJbmRleCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2J1aWxkID0gZmFsc2U7XG4gICAgfSxcblxuICAgIGNsZWFyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2NsZWFyTGlzdCgpO1xuICAgICAgICB0aGlzLl9jYWxsYmFja091dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fcGFyZW5Ob2RlLnJlbW92ZUNoaWxkKHRoaXMuZ2V0Tm9kZSgpKTtcblxuICAgIH0sXG5cbiAgICBpc0J1aWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9idWlsZDtcbiAgICB9LFxuICAgIGdldE5vZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX25vZGU7XG4gICAgfSxcbiAgICBnZXRTZWxlY3RlZEluZGV4OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZWxlY3RlZEluZGV4O1xuICAgIH1cbn07XG5cbk9wdGlvbnMuc2V0dXAgICAgICAgID0gZnVuY3Rpb24ocGFyZW50Tm9kZSl7cmV0dXJuIE9wdGlvbnMuX2luc3RhbmNlID0gbmV3IE9wdGlvbnMocGFyZW50Tm9kZSk7fTtcbk9wdGlvbnMuZ2V0SW5zdGFuY2UgPSBmdW5jdGlvbigpe3JldHVybiBPcHRpb25zLl9pbnN0YW5jZTt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9wdGlvbnM7IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4vT2JqZWN0Q29tcG9uZW50Jyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xudmFyIFNjcm9sbEJhciA9IHJlcXVpcmUoJy4uL2NvcmUvbGF5b3V0L1Njcm9sbEJhcicpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9PVVRQVVRfSEVJR0hUID0gbnVsbCxcbiAgICBERUZBVUxUX09VVFBVVF9XUkFQICAgPSBmYWxzZSxcbiAgICBERUZBVUxUX09VVFBVVF9VUERBVEUgPSB0cnVlO1xuXG5mdW5jdGlvbiBPdXRwdXQocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zICAgICAgICAgICAgPSBwYXJhbXMgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCB8fCBERUZBVUxUX09VVFBVVF9IRUlHSFQ7XG4gICAgcGFyYW1zLndyYXAgICAgICAgPSBwYXJhbXMud3JhcCAgID09PSB1bmRlZmluZWQgP1xuICAgICAgICAgICAgICAgICAgICAgICAgREVGQVVMVF9PVVRQVVRfV1JBUCA6XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMud3JhcDtcbiAgICBwYXJhbXMudXBkYXRlICAgICA9IHBhcmFtcy51cGRhdGUgPT09IHVuZGVmaW5lZCA/XG4gICAgICAgICAgICAgICAgICAgICAgICBERUZBVUxUX09VVFBVVF9VUERBVEUgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnVwZGF0ZTtcblxuICAgIHRoaXMuX3dyYXAgPSBwYXJhbXMud3JhcDtcbiAgICB0aGlzLl91cGRhdGUgPSBwYXJhbXMudXBkYXRlO1xuXG4gICAgdmFyIHRleHRBcmVhID0gdGhpcy5fdGV4dEFyZWEgPSBuZXcgTm9kZShOb2RlLlRFWFRBUkVBKSxcbiAgICAgICAgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgcm9vdE5vZGUgPSB0aGlzLl9ub2RlO1xuXG4gICAgICAgIHRleHRBcmVhLnNldFByb3BlcnR5KCdyZWFkT25seScsdHJ1ZSk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKHRleHRBcmVhKTtcblxuICAgICAgICB0ZXh0QXJlYS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uSW5wdXREcmFnU3RhcnQuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRyx0aGlzLl9wYXJlbnQsJ29uQ29tcG9uZW50U2VsZWN0RHJhZycpO1xuXG5cbiAgICBpZihwYXJhbXMuaGVpZ2h0KXtcbiAgICAgICAgdmFyIHRleHRBcmVhV3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgICAgICB0ZXh0QXJlYVdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuVGV4dEFyZWFXcmFwKTtcbiAgICAgICAgICAgIHRleHRBcmVhV3JhcC5hZGRDaGlsZCh0ZXh0QXJlYSk7XG4gICAgICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZCh0ZXh0QXJlYVdyYXApO1xuXG4gICAgICAgIC8vRklYTUVcbiAgICAgICAgdmFyIGhlaWdodCAgPSB0aGlzLl9oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0LFxuICAgICAgICAgICAgcGFkZGluZyA9IDQ7XG5cbiAgICAgICAgICAgIHRleHRBcmVhLnNldEhlaWdodChNYXRoLm1heChoZWlnaHQgKyBwYWRkaW5nICAsTWV0cmljLkNPTVBPTkVOVF9NSU5fSEVJR0hUKSk7XG4gICAgICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQodGV4dEFyZWEuZ2V0SGVpZ2h0KCkpO1xuICAgICAgICAgICAgcm9vdE5vZGUuc2V0SGVpZ2h0KHdyYXBOb2RlLmdldEhlaWdodCgpICsgcGFkZGluZyk7XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsQmFyID0gbmV3IFNjcm9sbEJhcih0ZXh0QXJlYVdyYXAsdGV4dEFyZWEsaGVpZ2h0IC0gcGFkZGluZylcbiAgICB9XG5cbiAgICBpZihwYXJhbXMud3JhcCl7XG4gICAgICAgIHRleHRBcmVhLnNldFN0eWxlUHJvcGVydHkoJ3doaXRlLXNwYWNlJywncHJlLXdyYXAnKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wcmV2U3RyaW5nID0gJyc7XG4gICAgdGhpcy5fcHJldlNjcm9sbEhlaWdodCA9IC0xO1xuICAgIHRoaXMuX3NldFZhbHVlKCk7XG59XG5cbk91dHB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5cbi8vT3ZlcnJpZGUgaW4gc3ViY2xhc3Ncbk91dHB1dC5wcm90b3R5cGUuX3NldFZhbHVlID0gZnVuY3Rpb24gKCkge307XG5cblxuT3V0cHV0LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3NldFZhbHVlKCk7XG59O1xuXG5PdXRwdXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZighdGhpcy5fdXBkYXRlKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9zZXRWYWx1ZSgpO1xufTtcblxuXG4vL1ByZXZlbnQgY2hyb21lIHNlbGVjdCBkcmFnXG5cbk91dHB1dC5wcm90b3R5cGUuX29uRHJhZyA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsIG51bGwpKTtcbn07XG5cbk91dHB1dC5wcm90b3R5cGUuX29uRHJhZ0ZpbmlzaCA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsIG51bGwpKTtcblxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLCB0aGlzLl9vbkRyYWcsIGZhbHNlKTtcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25EcmFnRmluaXNoLCBmYWxzZSk7XG59O1xuXG5PdXRwdXQucHJvdG90eXBlLl9vbklucHV0RHJhZ1N0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsIG51bGwpKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25EcmFnLmJpbmQodGhpcyksIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfVVAsICAgdGhpcy5fb25EcmFnRmluaXNoLmJpbmQodGhpcyksIGZhbHNlKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBPdXRwdXQ7XG4iLCJ2YXIgUGxvdHRlciA9IHJlcXVpcmUoJy4vUGxvdHRlcicpO1xudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIERFRkFVTFRfUEFEX0JPVU5EU19YID0gWy0xLDFdLFxuICAgIERFRkFVTFRfUEFEX0JPVU5EU19ZID0gWy0xLDFdLFxuICAgIERFRkFVTFRfUEFEX0xBQkVMX1ggID0gJycsXG4gICAgREVGQVVMVF9QQURfTEFCRUxfWSAgPSAnJztcblxuZnVuY3Rpb24gUGFkKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgUGxvdHRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5ib3VuZHNYICAgID0gcGFyYW1zLmJvdW5kc1ggICAgfHwgREVGQVVMVF9QQURfQk9VTkRTX1g7XG4gICAgcGFyYW1zLmJvdW5kc1kgICAgPSBwYXJhbXMuYm91bmRzWSAgICB8fCBERUZBVUxUX1BBRF9CT1VORFNfWTtcbiAgICBwYXJhbXMubGFiZWxYICAgICA9IHBhcmFtcy5sYWJlbFggICAgIHx8IERFRkFVTFRfUEFEX0xBQkVMX1g7XG4gICAgcGFyYW1zLmxhYmVsWSAgICAgPSBwYXJhbXMubGFiZWxZICAgICB8fCBERUZBVUxUX1BBRF9MQUJFTF9ZO1xuXG4gICAgcGFyYW1zLnNob3dDcm9zcyAgPSBwYXJhbXMuc2hvd0Nyb3NzICB8fCB0cnVlO1xuXG5cbiAgICB0aGlzLl9vbkNoYW5nZSAgICAgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgdGhpcy5fb25GaW5pc2ggICAgID0gcGFyYW1zLm9uRmluaXNoIHx8IHRoaXMuX29uRmluaXNoO1xuXG4gICAgdGhpcy5fYm91bmRzWCAgICAgID0gcGFyYW1zLmJvdW5kc1g7XG4gICAgdGhpcy5fYm91bmRzWSAgICAgID0gcGFyYW1zLmJvdW5kc1k7XG4gICAgdGhpcy5fbGFiZWxBeGlzWCAgID0gcGFyYW1zLmxhYmVsWCAhPSAnJyAmJiBwYXJhbXMubGFiZWxYICE9ICdub25lJyA/IHBhcmFtcy5sYWJlbFggOiBudWxsO1xuICAgIHRoaXMuX2xhYmVsQXhpc1kgICA9IHBhcmFtcy5sYWJlbFkgIT0gJycgJiYgcGFyYW1zLmxhYmVsWSAhPSAnbm9uZScgPyBwYXJhbXMubGFiZWxZIDogbnVsbDtcblxuICAgIHZhciBwYXRoID0gdGhpcy5fcGF0aDtcbiAgICAgICAgcGF0aC5zdHlsZS5zdHJva2VXaWR0aCA9IDE7XG4gICAgICAgIHBhdGguc3R5bGUuc3Ryb2tlICAgICAgPSAnIzM2M2M0MCc7XG5cbiAgICB0aGlzLl9ncmlkLnN0eWxlLnN0cm9rZSA9ICdyZ2IoMjUsMjUsMjUpJztcblxuICAgIHRoaXMuX3N2Z1BvcyA9IFswLDBdO1xuXG5cbiAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlID0gdGhpcy5fc3ZnUm9vdC5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2cnKSk7XG4gICAgdmFyIGhhbmRsZUNpcmNsZTAgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTAuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMTEpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMC5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2JhKDAsMCwwLDAuMDUpJyk7XG4gICAgdmFyIGhhbmRsZUNpcmNsZTEgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTEuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMTApKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoODMsOTMsOTgpJyk7XG5cbiAgICB2YXIgaGFuZGxlQ2lyY2xlMiA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMi5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZyg5KSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTIuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiKDU3LDY5LDc2KScpO1xuICAgICAgICBoYW5kbGVDaXJjbGUyLnNldEF0dHJpYnV0ZSgnY3knLFN0cmluZygwLjc1KSk7XG5cbiAgICB2YXIgaGFuZGxlQ2lyY2xlMyA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMy5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZygxMCkpO1xuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgnc3Ryb2tlJywncmdiKDE3LDE5LDIwKScpO1xuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgnc3Ryb2tlLXdpZHRoJyxTdHJpbmcoMSkpO1xuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgnZmlsbCcsJ25vbmUnKTtcblxuICAgIHZhciBoYW5kbGVDaXJjbGU0ID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xuICAgICAgICBoYW5kbGVDaXJjbGU0LnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDYpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlNC5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoMzAsMzQsMzYpJyk7XG4gICAgdmFyIGhhbmRsZUNpcmNsZTUgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTUuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMykpO1xuICAgICAgICBoYW5kbGVDaXJjbGU1LnNldEF0dHJpYnV0ZSgnZmlsbCcsJ3JnYigyNTUsMjU1LDI1NSknKTtcblxuICAgICAgICBoYW5kbGUuc2V0QXR0cmlidXRlKCd0cmFuZm9ybScsJ3RyYW5zbGF0ZSgwIDApJyk7XG5cbiAgICB0aGlzLl9zdmcuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sdGhpcy5fb25EcmFnU3RhcnQuYmluZCh0aGlzKSxmYWxzZSk7XG4gICAgdGhpcy5fZHJhd1ZhbHVlKHRoaXMuX29iamVjdFt0aGlzLl9rZXldKTtcbn1cblxuUGFkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGxvdHRlci5wcm90b3R5cGUpO1xuXG5QYWQucHJvdG90eXBlLl9vbkRyYWdTdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMuX3N2ZztcblxuICAgIHZhciBzdmdQb3MgPSB0aGlzLl9zdmdQb3M7XG4gICAgICAgIHN2Z1Bvc1swXSA9IDA7XG4gICAgICAgIHN2Z1Bvc1sxXSA9IDA7XG5cbiAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICBzdmdQb3NbMF0gKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICBzdmdQb3NbMV0gKz0gZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICB9XG5cbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICBldmVudFVwICAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fZHJhd1ZhbHVlSW5wdXQoKTtcbiAgICAgICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgICAgIHRoaXMuX29uQ2hhbmdlKCk7XG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgdmFyIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgICAgIHRoaXMuX2RyYXdWYWx1ZUlucHV0KCk7XG4gICAgICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgICAgICB0aGlzLl9vbkZpbmlzaCgpO1xuXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCAgICBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFVwLCAgIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgdGhpcy5fZHJhd1ZhbHVlSW5wdXQoKTtcbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuUGFkLnByb3RvdHlwZS5fcmVkcmF3ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2RyYXdWYWx1ZSh0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG59O1xuXG5QYWQucHJvdG90eXBlLl9kcmF3VmFsdWVJbnB1dCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9kcmF3VmFsdWUodGhpcy5fZ2V0TW91c2VOb3JtYWxpemVkKCkpO1xufTtcblxuUGFkLnByb3RvdHlwZS5fZHJhd1ZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdGhpcy5fb2JqZWN0W3RoaXMuX2tleV0gPSB2YWx1ZTtcbiAgICB0aGlzLl9kcmF3R3JpZCgpO1xuICAgIHRoaXMuX2RyYXdQb2ludCgpO1xufTtcblxuUGFkLnByb3RvdHlwZS5fZHJhd0dyaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2Z1NpemUgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIHN2Z01pZFggPSBNYXRoLmZsb29yKHN2Z1NpemUgKiAwLjUpLFxuICAgICAgICBzdmdNaWRZID0gTWF0aC5mbG9vcihzdmdTaXplICogMC41KTtcblxuICAgIHZhciBwYXRoQ21kID0gJyc7XG4gICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCBzdmdNaWRZLCBzdmdTaXplLCBzdmdNaWRZKTtcbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKHN2Z01pZFgsIDAsIHN2Z01pZFgsIHN2Z1NpemUpO1xuXG4gICAgdGhpcy5fZ3JpZC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbn07XG5cblxuUGFkLnByb3RvdHlwZS5fZHJhd1BvaW50ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmdTaXplID0gTnVtYmVyKHRoaXMuX3N2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBzdmdNaWRYID0gc3ZnU2l6ZSAqIDAuNSxcbiAgICAgICAgc3ZnTWlkWSA9IHN2Z1NpemUgKiAwLjU7XG5cbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcblxuICAgIHZhciBsb2NhbFggPSAoIDAuNSArIHZhbHVlWzBdICogMC41ICkgKiBzdmdTaXplLFxuICAgICAgICBsb2NhbFkgPSAoIDAuNSArIC12YWx1ZVsxXSAqIDAuNSApICogc3ZnU2l6ZTtcblxuICAgIHZhciBwYXRoQ21kID0gJyc7XG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUoMCwgbG9jYWxZLCBzdmdTaXplLCBsb2NhbFkpO1xuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKGxvY2FsWCwgMCwgbG9jYWxYLCBzdmdTaXplKTtcblxuICAgIHRoaXMuX3BhdGguc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XG4gICAgdGhpcy5faGFuZGxlLnNldEF0dHJpYnV0ZSgndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgbG9jYWxYICsgJyAnICsgbG9jYWxZICsgJyknKTtcbn07XG5cblBhZC5wcm90b3R5cGUuX2dldE1vdXNlTm9ybWFsaXplZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb2Zmc2V0ID0gdGhpcy5fc3ZnUG9zLFxuICAgICAgICBtb3VzZSA9IE1vdXNlLmdldEluc3RhbmNlKCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgc3ZnU2l6ZSA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcblxuICAgIHJldHVybiBbLTEgKyBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVswXSAtIG9mZnNldFswXSwgc3ZnU2l6ZSkpIC8gc3ZnU2l6ZSAqIDIsXG4gICAgICAgICggMSAtIE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlWzFdIC0gb2Zmc2V0WzFdLCBzdmdTaXplKSkgLyBzdmdTaXplICogMildO1xuXG59O1xuXG5QYWQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xufTtcblxuUGFkLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXJldHVybjtcbiAgICB0aGlzLl9kcmF3VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYWQ7XG4iLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcbnZhciBDb2xvclV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yVXRpbCcpO1xudmFyIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xuXG52YXIgREVGQVVMVF9DT0xPUl9QSUNLRVJfVkFMVUVfSFVFID0gMjAwLjAsXG4gICAgREVGQVVMVF9DT0xPUl9QSUNLRVJfVkFMVUVfU0FUID0gNTAuMCxcbiAgICBERUZBVUxUX0NPTE9SX1BJQ0tFUl9WQUxVRV9WQUwgPSA1MC4wO1xuXG5mdW5jdGlvbiBQaWNrZXIocGFyZW50Tm9kZSl7XG4gICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSAgICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlciksXG4gICAgICAgIGhlYWROb2RlID0gdGhpcy5faGVhZE5vZGUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpLFxuICAgICAgICBsYWJsV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIGxhYmxOb2RlID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCksXG4gICAgICAgIG1lbnVOb2RlID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5NZW51KSxcbiAgICAgICAgd3JhcE5vZGUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuXG4gICAgdmFyIG1lbnVDbG9zZSA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcbiAgICAgICAgbWVudUNsb3NlLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnVCdG5DbG9zZSk7XG5cbiAgICB2YXIgZmllbGRXcmFwICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyggQ1NTLlBpY2tlckZpZWxkV3JhcCksXG4gICAgICAgIHNsaWRlcldyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNsaWRlcldyYXApLFxuICAgICAgICBpbnB1dFdyYXAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKCBDU1MuUGlja2VySW5wdXRXcmFwKTtcblxuICAgIHZhciBjYW52YXNGaWVsZCAgPSB0aGlzLl9jYW52YXNGaWVsZCAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKSxcbiAgICAgICAgY2FudmFzU2xpZGVyID0gdGhpcy5fY2FudmFzU2xpZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnQ2FudmFzJyk7XG5cbiAgICAgICAgZmllbGRXcmFwLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChjYW52YXNGaWVsZCk7XG4gICAgICAgIHNsaWRlcldyYXAuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKGNhbnZhc1NsaWRlcik7XG5cbiAgICAgICAgdGhpcy5fc2V0U2l6ZUNhbnZhc0ZpZWxkKDE1NCwxNTQpO1xuICAgICAgICB0aGlzLl9zZXRTaXplQ2FudmFzU2xpZGVyKDE0LDE1NCk7XG5cbiAgICB2YXIgY29udGV4dENhbnZhc0ZpZWxkICA9IHRoaXMuX2NvbnRleHRDYW52YXNGaWVsZCAgPSBjYW52YXNGaWVsZC5nZXRDb250ZXh0KCcyZCcpLFxuICAgICAgICBjb250ZXh0Q2FudmFzU2xpZGVyID0gdGhpcy5fY29udGV4dENhbnZhc1NsaWRlciA9IGNhbnZhc1NsaWRlci5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgdmFyIGhhbmRsZUZpZWxkICA9IHRoaXMuX2hhbmRsZUZpZWxkICA9IG5ldyBOb2RlKCk7XG4gICAgICAgIGhhbmRsZUZpZWxkLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckhhbmRsZUZpZWxkKTtcblxuICAgIHZhciBoYW5kbGVTbGlkZXIgPSB0aGlzLl9oYW5kbGVTbGlkZXIgPSBuZXcgTm9kZSgpO1xuICAgICAgICBoYW5kbGVTbGlkZXIuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySGFuZGxlU2xpZGVyKTtcblxuICAgIHZhciBzdGVwID0gMS4wLFxuICAgICAgICBkcCAgID0gMDtcblxuICAgIHZhciBjYWxsYmFja0h1ZSA9IHRoaXMuX29uSW5wdXRIdWVDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgY2FsbGJhY2tTYXQgPSB0aGlzLl9vbklucHV0U2F0Q2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgIGNhbGxiYWNrVmFsID0gdGhpcy5fb25JbnB1dFZhbENoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICBjYWxsYmFja1IgICA9IHRoaXMuX29uSW5wdXRSQ2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgIGNhbGxiYWNrRyAgID0gdGhpcy5fb25JbnB1dEdDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgY2FsbGJhY2tCICAgPSB0aGlzLl9vbklucHV0QkNoYW5nZS5iaW5kKHRoaXMpO1xuXG5cbiAgICB2YXIgaW5wdXRIdWUgPSB0aGlzLl9pbnB1dEh1ZSA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tIdWUsY2FsbGJhY2tIdWUpLFxuICAgICAgICBpbnB1dFNhdCA9IHRoaXMuX2lucHV0U2F0ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja1NhdCxjYWxsYmFja1NhdCksXG4gICAgICAgIGlucHV0VmFsID0gdGhpcy5faW5wdXRWYWwgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrVmFsLGNhbGxiYWNrVmFsKSxcbiAgICAgICAgaW5wdXRSICAgPSB0aGlzLl9pbnB1dFIgICA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tSLGNhbGxiYWNrUiksXG4gICAgICAgIGlucHV0RyAgID0gdGhpcy5faW5wdXRHICAgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrRyxjYWxsYmFja0cpLFxuICAgICAgICBpbnB1dEIgICA9IHRoaXMuX2lucHV0QiAgID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja0IsY2FsbGJhY2tCKTtcblxuICAgIHZhciBjb250cm9sc1dyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckNvbnRyb2xzV3JhcCk7XG5cbiAgICB2YXIgYnV0dG9uUGljayAgID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbikuc2V0UHJvcGVydHkoJ3ZhbHVlJywncGljaycpLFxuICAgICAgICBidXR0b25DYW5jZWwgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTikuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uKS5zZXRQcm9wZXJ0eSgndmFsdWUnLCdjYW5jZWwnKTtcblxuXG4gICAgdmFyIGNvbG9yQ29udHJhc3QgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckNvbG9yQ29udHJhc3QpO1xuXG4gICAgdmFyIGNvbG9yMCA9IHRoaXMuX2NvbG9yQ3Vyck5vZGUgPSBuZXcgTm9kZSgpLFxuICAgICAgICBjb2xvcjEgPSB0aGlzLl9jb2xvclByZXZOb2RlID0gbmV3IE5vZGUoKTtcblxuICAgIGNvbG9yQ29udHJhc3QuYWRkQ2hpbGQoY29sb3IwKTtcbiAgICBjb2xvckNvbnRyYXN0LmFkZENoaWxkKGNvbG9yMSk7XG5cbiAgICBjb250cm9sc1dyYXAuYWRkQ2hpbGQoYnV0dG9uQ2FuY2VsKTtcbiAgICBjb250cm9sc1dyYXAuYWRkQ2hpbGQoYnV0dG9uUGljayk7XG4gICAgY29udHJvbHNXcmFwLmFkZENoaWxkKGNvbG9yQ29udHJhc3QpO1xuXG4gICAgdGhpcy5fc2V0Q29udHJhc1ByZXZDb2xvcigwLDAsMCk7XG5cbiAgICB2YXIgaW5wdXRGaWVsZFdyYXBIdWUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcFNhdCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCksXG4gICAgICAgIGlucHV0RmllbGRXcmFwVmFsID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKTtcblxuICAgIHZhciBpbnB1dEZpZWxkV3JhcEh1ZUxhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ0gnKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBTYXRMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdTJyksXG4gICAgICAgIGlucHV0RmllbGRXcmFwVmFsTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnVicpO1xuXG4gICAgICAgIGlucHV0RmllbGRXcmFwSHVlLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwSHVlTGFiZWwsaW5wdXRIdWUuZ2V0Tm9kZSgpKTtcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBTYXQuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBTYXRMYWJlbCxpbnB1dFNhdC5nZXROb2RlKCkpO1xuICAgICAgICBpbnB1dEZpZWxkV3JhcFZhbC5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFZhbExhYmVsLGlucHV0VmFsLmdldE5vZGUoKSk7XG5cbiAgICB2YXIgaW5wdXRGaWVsZFdyYXBSID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBHID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBCID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKTtcblxuICAgIHZhciBpbnB1dEZpZWxkV3JhcFJMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdSJyksXG4gICAgICAgIGlucHV0RmllbGRXcmFwR0xhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ0cnKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBCTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnQicpO1xuXG4gICAgICAgIGlucHV0RmllbGRXcmFwUi5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFJMYWJlbCxpbnB1dFIuZ2V0Tm9kZSgpKTtcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBHLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwR0xhYmVsLGlucHV0Ry5nZXROb2RlKCkpO1xuICAgICAgICBpbnB1dEZpZWxkV3JhcEIuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBCTGFiZWwsaW5wdXRCLmdldE5vZGUoKSk7XG5cblxuICAgICAgICBpbnB1dFdyYXAuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBSLGlucHV0RmllbGRXcmFwSHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRGaWVsZFdyYXBHLGlucHV0RmllbGRXcmFwU2F0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRGaWVsZFdyYXBCLGlucHV0RmllbGRXcmFwVmFsLGNvbG9yQ29udHJhc3QpO1xuXG4gICAgdmFyIGhleElucHV0V3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgIGhleElucHV0V3JhcC5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dFdyYXApO1xuXG4gICAgdmFyIGlucHV0SEVYID0gdGhpcy5faW5wdXRIRVggPSBuZXcgTm9kZShOb2RlLklOUFVUX1RFWFQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcEhFWCAgICAgICAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBIRVhMYWJlbCAgICA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpO1xuXG4gICAgICAgIGlucHV0RmllbGRXcmFwSEVYTGFiZWwuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJyMnKTtcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBIRVguYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBIRVhMYWJlbCxpbnB1dEhFWCk7XG5cbiAgICAgICAgaGV4SW5wdXRXcmFwLmFkZENoaWxkKGlucHV0RmllbGRXcmFwSEVYKTtcblxuICAgICAgICBpbnB1dEhFWC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5DSEFOR0UsdGhpcy5fb25JbnB1dEhFWEZpbmlzaC5iaW5kKHRoaXMpKTtcblxuICAgICAgICBsYWJsTm9kZS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnQ29sb3IgUGlja2VyJyk7XG5cbiAgICAgICAgbWVudU5vZGUuYWRkQ2hpbGQobWVudUNsb3NlKTtcbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGQobWVudU5vZGUpO1xuICAgICAgICBsYWJsV3JhcC5hZGRDaGlsZChsYWJsTm9kZSk7XG4gICAgICAgIGhlYWROb2RlLmFkZENoaWxkKGxhYmxXcmFwKTtcbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQoaGVhZE5vZGUpO1xuICAgICAgICByb290Tm9kZS5hZGRDaGlsZCh3cmFwTm9kZSk7XG5cbiAgICAgICAgLy93cmFwTm9kZS5hZGRDaGlsZChwYWxldHRlV3JhcCk7XG5cbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQoZmllbGRXcmFwKTtcbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQoc2xpZGVyV3JhcCk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGlucHV0V3JhcCk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGhleElucHV0V3JhcCk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGNvbnRyb2xzV3JhcCk7XG5cbiAgICAgICAgZmllbGRXcmFwLmFkZENoaWxkKCBoYW5kbGVGaWVsZCk7XG4gICAgICAgIHNsaWRlcldyYXAuYWRkQ2hpbGQoaGFuZGxlU2xpZGVyKTtcblxuICAgIHZhciBldmVudE1vdXNlRG93biA9IE5vZGVFdmVudC5NT1VTRV9ET1dOLFxuICAgICAgICBjYWxsYmFjayAgICAgICA9IHRoaXMuX29uQ2FudmFzRmllbGRNb3VzZURvd24uYmluZCh0aGlzKTtcblxuICAgICAgICBmaWVsZFdyYXAuYWRkRXZlbnRMaXN0ZW5lciggIGV2ZW50TW91c2VEb3duLCBjYWxsYmFjayk7XG4gICAgICAgIGhhbmRsZUZpZWxkLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcblxuICAgICAgICBjYWxsYmFjayA9IHRoaXMuX29uQ2FudmFzU2xpZGVyTW91c2VEb3duLmJpbmQodGhpcyk7XG5cbiAgICAgICAgc2xpZGVyV3JhcC5hZGRFdmVudExpc3RlbmVyKCAgZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcbiAgICAgICAgaGFuZGxlU2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcblxuICAgICAgICBtZW51Q2xvc2UuYWRkRXZlbnRMaXN0ZW5lciggICBldmVudE1vdXNlRG93biwgdGhpcy5fb25DbG9zZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgYnV0dG9uUGljay5hZGRFdmVudExpc3RlbmVyKCAgZXZlbnRNb3VzZURvd24sIHRoaXMuX29uUGljay5iaW5kKHRoaXMpKTtcbiAgICAgICAgYnV0dG9uQ2FuY2VsLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIHRoaXMuX29uQ2xvc2UuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgaGVhZE5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25IZWFkRHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5fcGFyZW50Tm9kZSA9IHBhcmVudE5vZGU7XG5cbiAgICB0aGlzLl9tb3VzZU9mZnNldCA9IFswLDBdO1xuICAgIHRoaXMuX3Bvc2l0aW9uICAgID0gWzAsMF07XG5cbiAgICB0aGlzLl9jYW52YXNTbGlkZXJQb3MgPSBbMCwwXTtcbiAgICB0aGlzLl9jYW52YXNGaWVsZFBvcyAgPSBbMCwwXTtcbiAgICB0aGlzLl9oYW5kbGVGaWVsZFNpemUgICAgPSAxMjtcbiAgICB0aGlzLl9oYW5kbGVTbGlkZXJIZWlnaHQgPSA3O1xuXG4gICAgdGhpcy5faW1hZ2VEYXRhU2xpZGVyID0gY29udGV4dENhbnZhc1NsaWRlci5jcmVhdGVJbWFnZURhdGEoY2FudmFzU2xpZGVyLndpZHRoLGNhbnZhc1NsaWRlci5oZWlnaHQpO1xuICAgIHRoaXMuX2ltYWdlRGF0YUZpZWxkICA9IGNvbnRleHRDYW52YXNGaWVsZC5jcmVhdGVJbWFnZURhdGEoIGNhbnZhc0ZpZWxkLndpZHRoLCBjYW52YXNGaWVsZC5oZWlnaHQpO1xuXG4gICAgdGhpcy5fdmFsdWVIdWVNaW5NYXggPSBbMCwzNjBdO1xuICAgIHRoaXMuX3ZhbHVlU2F0TWluTWF4ID0gdGhpcy5fdmFsdWVWYWxNaW5NYXggPSBbMCwxMDBdO1xuICAgIHRoaXMuX3ZhbHVlUkdCTWluTWF4ID0gWzAsMjU1XTtcblxuICAgIHRoaXMuX3ZhbHVlSHVlID0gREVGQVVMVF9DT0xPUl9QSUNLRVJfVkFMVUVfSFVFO1xuICAgIHRoaXMuX3ZhbHVlU2F0ID0gREVGQVVMVF9DT0xPUl9QSUNLRVJfVkFMVUVfU0FUO1xuICAgIHRoaXMuX3ZhbHVlVmFsID0gREVGQVVMVF9DT0xPUl9QSUNLRVJfVkFMVUVfVkFMO1xuICAgIHRoaXMuX3ZhbHVlUiAgID0gMDtcbiAgICB0aGlzLl92YWx1ZUcgICA9IDA7XG4gICAgdGhpcy5fdmFsdWVCICAgPSAwO1xuXG4gICAgdGhpcy5fdmFsdWVIRVggPSAnIzAwMDAwMCc7XG4gICAgdGhpcy5fdmFsdWVIRVhWYWxpZCA9IHRoaXMuX3ZhbHVlSEVYO1xuXG4gICAgdGhpcy5fY2FsbGJhY2tQaWNrID0gZnVuY3Rpb24oKXt9O1xuXG4gICAgLy90aGlzLl9jYW52YXNGaWVsZEltYWdlRGF0YUZ1bmMgPSBmdW5jdGlvbihpLGope3JldHVybiB0aGlzLl9IU1YyUkdCKHRoaXMuX3ZhbHVlSHVlLGopfVxuXG4gICAgdGhpcy5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgdGhpcy5fZHJhd0NhbnZhc1NsaWRlcigpO1xuXG4gICAgdGhpcy5fc2V0Q29sb3JIU1YodGhpcy5fdmFsdWVIdWUsdGhpcy5fdmFsdWVTYXQsdGhpcy5fdmFsdWVWYWwpO1xuXG4gICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XG4gICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG5cbiAgICB0aGlzLl91cGRhdGVIYW5kbGVzKCk7XG59XG5cblBpY2tlci5wcm90b3R5cGUgPVxue1xuICAgIF9kcmF3SGFuZGxlRmllbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc0ZpZWxkLFxuICAgICAgICAgICAgbm9kZVBvcyA9IHRoaXMuX2NhbnZhc0ZpZWxkUG9zLFxuICAgICAgICAgICAgbW91c2VQb3MgPSBNb3VzZS5nZXRJbnN0YW5jZSgpLmdldFBvc2l0aW9uKCk7XG5cbiAgICAgICAgdmFyIHBvc1ggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1swXSAtIG5vZGVQb3NbMF0sIGNhbnZhcy53aWR0aCkpLFxuICAgICAgICAgICAgcG9zWSA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlUG9zWzFdIC0gbm9kZVBvc1sxXSwgY2FudmFzLmhlaWdodCkpLFxuICAgICAgICAgICAgcG9zWE5vcm0gPSBwb3NYIC8gY2FudmFzLndpZHRoLFxuICAgICAgICAgICAgcG9zWU5vcm0gPSBwb3NZIC8gY2FudmFzLmhlaWdodDtcblxuICAgICAgICB2YXIgc2F0ID0gTWF0aC5yb3VuZChwb3NYTm9ybSAqIHRoaXMuX3ZhbHVlU2F0TWluTWF4WzFdKSxcbiAgICAgICAgICAgIHZhbCA9IE1hdGgucm91bmQoKDEuMCAtIHBvc1lOb3JtKSAqIHRoaXMuX3ZhbHVlVmFsTWluTWF4WzFdKTtcblxuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVih0aGlzLl92YWx1ZUh1ZSwgc2F0LCB2YWwpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlSGFuZGxlRmllbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5fY2FudmFzRmllbGQud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSB0aGlzLl9jYW52YXNGaWVsZC5oZWlnaHQsXG4gICAgICAgICAgICBvZmZzZXRIYW5kbGUgPSB0aGlzLl9oYW5kbGVGaWVsZFNpemUgKiAwLjI1O1xuXG4gICAgICAgIHZhciBzYXROb3JtID0gdGhpcy5fdmFsdWVTYXQgLyB0aGlzLl92YWx1ZVNhdE1pbk1heFsxXSxcbiAgICAgICAgICAgIHZhbE5vcm0gPSB0aGlzLl92YWx1ZVZhbCAvIHRoaXMuX3ZhbHVlVmFsTWluTWF4WzFdO1xuXG4gICAgICAgIHRoaXMuX2hhbmRsZUZpZWxkLnNldFBvc2l0aW9uR2xvYmFsKHNhdE5vcm0gKiB3aWR0aCAtIG9mZnNldEhhbmRsZSxcbiAgICAgICAgICAgICgxLjAgLSB2YWxOb3JtKSAqIGhlaWdodCAtIG9mZnNldEhhbmRsZSk7XG5cbiAgICB9LFxuXG4gICAgX2RyYXdIYW5kbGVTbGlkZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1NsaWRlcixcbiAgICAgICAgICAgIGNhbnZhc1Bvc1kgPSB0aGlzLl9jYW52YXNTbGlkZXJQb3NbMV0sXG4gICAgICAgICAgICBtb3VzZVBvc1kgPSBNb3VzZS5nZXRJbnN0YW5jZSgpLmdldFkoKTtcblxuICAgICAgICB2YXIgcG9zWSA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlUG9zWSAtIGNhbnZhc1Bvc1ksIGNhbnZhcy5oZWlnaHQpKSxcbiAgICAgICAgICAgIHBvc1lOb3JtID0gcG9zWSAvIGNhbnZhcy5oZWlnaHQ7XG5cbiAgICAgICAgdmFyIGh1ZSA9IE1hdGguZmxvb3IoKDEuMCAtIHBvc1lOb3JtKSAqIHRoaXMuX3ZhbHVlSHVlTWluTWF4WzFdKTtcblxuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVihodWUsIHRoaXMuX3ZhbHVlU2F0LCB0aGlzLl92YWx1ZVZhbCk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZVNsaWRlcigpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlSGFuZGxlU2xpZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBoZWlnaHQgPSB0aGlzLl9jYW52YXNTbGlkZXIuaGVpZ2h0LFxuICAgICAgICAgICAgb2Zmc2V0SGFuZGxlID0gdGhpcy5faGFuZGxlU2xpZGVySGVpZ2h0ICogMC4yNTtcblxuICAgICAgICB2YXIgaHVlTm9ybSA9IHRoaXMuX3ZhbHVlSHVlIC8gdGhpcy5fdmFsdWVIdWVNaW5NYXhbMV07XG5cbiAgICAgICAgdGhpcy5faGFuZGxlU2xpZGVyLnNldFBvc2l0aW9uR2xvYmFsWSgoaGVpZ2h0IC0gb2Zmc2V0SGFuZGxlKSAqICgxLjAgLSBodWVOb3JtKSk7XG4gICAgfSxcblxuICAgIF91cGRhdGVIYW5kbGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZUZpZWxkKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZVNsaWRlcigpO1xuICAgIH0sXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICBfc2V0SHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIG1pbk1heCA9IHRoaXMuX3ZhbHVlSHVlTWluTWF4O1xuXG4gICAgICAgIHRoaXMuX3ZhbHVlSHVlID0gdmFsdWUgPT0gbWluTWF4WzFdID8gbWluTWF4WzBdIDogdmFsdWU7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWKCk7XG4gICAgICAgIHRoaXMuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfc2V0U2F0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVTYXQgPSBNYXRoLnJvdW5kKHZhbHVlKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1YoKTtcbiAgICB9LFxuXG4gICAgX3NldFZhbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlVmFsID0gTWF0aC5yb3VuZCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWKCk7XG4gICAgfSxcblxuICAgIF9zZXRSOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVSID0gTWF0aC5yb3VuZCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCKCk7XG4gICAgfSxcblxuICAgIF9zZXRHOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVHID0gTWF0aC5yb3VuZCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCKCk7XG4gICAgfSxcblxuICAgIF9zZXRCOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVCID0gTWF0aC5yb3VuZCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCKCk7XG4gICAgfSxcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIF9vbklucHV0SHVlQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpbnB1dCA9IHRoaXMuX2lucHV0SHVlLFxuICAgICAgICAgICAgaW5wdXRWYWwgPSB0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQoaW5wdXQsIHRoaXMuX3ZhbHVlSHVlTWluTWF4KTtcblxuICAgICAgICB2YXIgbWluTWF4ID0gdGhpcy5fdmFsdWVIdWVNaW5NYXg7XG5cbiAgICAgICAgaWYgKGlucHV0VmFsID09IG1pbk1heFsxXSkge1xuICAgICAgICAgICAgaW5wdXRWYWwgPSBtaW5NYXhbMF07XG4gICAgICAgICAgICBpbnB1dC5zZXRWYWx1ZShpbnB1dFZhbCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9zZXRIdWUoaW5wdXRWYWwpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZVNsaWRlcigpO1xuXG4gICAgICAgIHRoaXMuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dFNhdENoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRTYXQodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0U2F0LCB0aGlzLl92YWx1ZVNhdE1pbk1heCkpO1xuICAgICAgICB0aGlzLl9vbklucHV0U1ZDaGFuZ2UoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRWYWxDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0VmFsKHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dFZhbCwgdGhpcy5fdmFsdWVWYWxNaW5NYXgpKTtcbiAgICAgICAgdGhpcy5fb25JbnB1dFNWQ2hhbmdlKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0UkNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRSKHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dFIsIHRoaXMuX3ZhbHVlUkdCTWluTWF4KSk7XG4gICAgICAgIHRoaXMuX29uSW5wdXRSR0JDaGFuZ2UoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRHQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldEcodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0RywgdGhpcy5fdmFsdWVSR0JNaW5NYXgpKTtcbiAgICAgICAgdGhpcy5fb25JbnB1dFJHQkNoYW5nZSgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dEJDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Qih0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQodGhpcy5faW5wdXRCLCB0aGlzLl92YWx1ZVJHQk1pbk1heCkpO1xuICAgICAgICB0aGlzLl9vbklucHV0UkdCQ2hhbmdlKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0SEVYRmluaXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpbnB1dCA9IHRoaXMuX2lucHV0SEVYLFxuICAgICAgICAgICAgdmFsdWUgPSBpbnB1dC5nZXRQcm9wZXJ0eSgndmFsdWUnKTtcblxuICAgICAgICBpZiAoIUNvbG9yVXRpbC5pc1ZhbGlkSEVYKHZhbHVlKSkge1xuICAgICAgICAgICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGhpcy5fdmFsdWVIRVhWYWxpZCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl92YWx1ZUhFWCA9IHRoaXMuX3ZhbHVlSEVYVmFsaWQgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JGcm9tSEVYKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0U1ZDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dFJHQkNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVkZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZXMoKTtcbiAgICB9LFxuXG4gICAgX2dldFZhbHVlQ29udHJhaW5lZDogZnVuY3Rpb24gKGlucHV0LCBtaW5NYXgpIHtcbiAgICAgICAgdmFyIGlucHV0VmFsID0gTWF0aC5yb3VuZChpbnB1dC5nZXRWYWx1ZSgpKSxcbiAgICAgICAgICAgIG1pbiA9IG1pbk1heFswXSxcbiAgICAgICAgICAgIG1heCA9IG1pbk1heFsxXTtcblxuICAgICAgICBpZiAoaW5wdXRWYWwgPD0gbWluKSB7XG4gICAgICAgICAgICBpbnB1dFZhbCA9IG1pbjtcbiAgICAgICAgICAgIGlucHV0LnNldFZhbHVlKGlucHV0VmFsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5wdXRWYWwgPj0gbWF4KSB7XG4gICAgICAgICAgICBpbnB1dFZhbCA9IG1heDtcbiAgICAgICAgICAgIGlucHV0LnNldFZhbHVlKGlucHV0VmFsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbnB1dFZhbDtcbiAgICB9LFxuXG5cbiAgICBfdXBkYXRlSW5wdXRIdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRIdWUuc2V0VmFsdWUodGhpcy5fdmFsdWVIdWUpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUlucHV0U2F0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0U2F0LnNldFZhbHVlKHRoaXMuX3ZhbHVlU2F0KTtcbiAgICB9LFxuICAgIF91cGRhdGVJbnB1dFZhbDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dFZhbC5zZXRWYWx1ZSh0aGlzLl92YWx1ZVZhbCk7XG4gICAgfSxcbiAgICBfdXBkYXRlSW5wdXRSOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0Ui5zZXRWYWx1ZSh0aGlzLl92YWx1ZVIpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUlucHV0RzogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dEcuc2V0VmFsdWUodGhpcy5fdmFsdWVHKTtcbiAgICB9LFxuICAgIF91cGRhdGVJbnB1dEI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRCLnNldFZhbHVlKHRoaXMuX3ZhbHVlQik7XG4gICAgfSxcbiAgICBfdXBkYXRlSW5wdXRIRVg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRIRVguc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGhpcy5fdmFsdWVIRVgpO1xuICAgIH0sXG5cblxuICAgIF9zZXRDb2xvckhTVjogZnVuY3Rpb24gKGh1ZSwgc2F0LCB2YWwpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVIdWUgPSBodWU7XG4gICAgICAgIHRoaXMuX3ZhbHVlU2F0ID0gc2F0O1xuICAgICAgICB0aGlzLl92YWx1ZVZhbCA9IHZhbDtcblxuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dEh1ZSgpO1xuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dFNhdCgpO1xuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dFZhbCgpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yKCk7XG4gICAgfSxcblxuICAgIF9zZXRDb2xvclJHQjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVSID0gcjtcbiAgICAgICAgdGhpcy5fdmFsdWVHID0gZztcbiAgICAgICAgdGhpcy5fdmFsdWVCID0gYjtcblxuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dFIoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRHKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0QigpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yKCk7XG4gICAgfSxcblxuICAgIF9zZXRDb2xvckhFWDogZnVuY3Rpb24gKGhleCkge1xuICAgICAgICB0aGlzLl92YWx1ZUhFWCA9IGhleDtcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRIRVgoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbG9ySFNWOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldENvbG9ySFNWKHRoaXMuX3ZhbHVlSHVlLCB0aGlzLl92YWx1ZVNhdCwgdGhpcy5fdmFsdWVWYWwpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29sb3JSR0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JSR0IodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvckhTVkZyb21SR0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhzdiA9IENvbG9yVXRpbC5SR0IySFNWKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVihoc3ZbMF0sIGhzdlsxXSwgaHN2WzJdKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcmdiID0gQ29sb3JVdGlsLkhTVjJSR0IodGhpcy5fdmFsdWVIdWUsIHRoaXMuX3ZhbHVlU2F0LCB0aGlzLl92YWx1ZVZhbCk7XG4gICAgICAgIHRoaXMuX3NldENvbG9yUkdCKHJnYlswXSwgcmdiWzFdLCByZ2JbMl0pO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29sb3JIRVhGcm9tUkdCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBoZXggPSBDb2xvclV0aWwuUkdCMkhFWCh0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIRVgoaGV4KTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbG9yRnJvbUhFWDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcmdiID0gQ29sb3JVdGlsLkhFWDJSR0IodGhpcy5fdmFsdWVIRVgpO1xuXG4gICAgICAgIHRoaXMuX3NldENvbG9yUkdCKHJnYlswXSwgcmdiWzFdLCByZ2JbMl0pO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVkZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlcygpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29udHJhc3RDdXJyQ29sb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29udHJhc3RDdXJyQ29sb3IodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XG4gICAgfSxcbiAgICBfdXBkYXRlQ29udHJhc3RQcmV2Q29sb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29udHJhc1ByZXZDb2xvcih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKVxuICAgIH0sXG5cbiAgICBfc2V0Q29udHJhc3RDdXJyQ29sb3I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgICAgIHRoaXMuX2NvbG9yQ3Vyck5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnYmFja2dyb3VuZCcsICdyZ2IoJyArIHIgKyAnLCcgKyBnICsgJywnICsgYiArICcpJylcbiAgICB9LFxuICAgIF9zZXRDb250cmFzUHJldkNvbG9yOiBmdW5jdGlvbiAociwgZywgYikge1xuICAgICAgICB0aGlzLl9jb2xvclByZXZOb2RlLnNldFN0eWxlUHJvcGVydHkoJ2JhY2tncm91bmQnLCAncmdiKCcgKyByICsgJywnICsgZyArICcsJyArIGIgKyAnKScpXG4gICAgfSxcblxuICAgIF9vbkhlYWREcmFnU3RhcnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICAgICAgcGFyZW50Tm9kZSA9IHRoaXMuX3BhcmVudE5vZGU7XG5cbiAgICAgICAgdmFyIG5vZGVQb3MgPSBub2RlLmdldFBvc2l0aW9uR2xvYmFsKCksXG4gICAgICAgICAgICBtb3VzZVBvcyA9IE1vdXNlLmdldEluc3RhbmNlKCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgICAgIG9mZnNldFBvcyA9IHRoaXMuX21vdXNlT2Zmc2V0O1xuXG4gICAgICAgIG9mZnNldFBvc1swXSA9IG1vdXNlUG9zWzBdIC0gbm9kZVBvc1swXTtcbiAgICAgICAgb2Zmc2V0UG9zWzFdID0gbW91c2VQb3NbMV0gLSBub2RlUG9zWzFdO1xuXG4gICAgICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlUG9zaXRpb24oKTtcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9ucygpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICAgICAgcGFyZW50Tm9kZS5hZGRDaGlsZChub2RlKTtcblxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNhbnZhc05vZGVQb3NpdGlvbnMoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZVBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBtb3VzZVBvcyA9IE1vdXNlLmdldEluc3RhbmNlKCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgICAgIG9mZnNldFBvcyA9IHRoaXMuX21vdXNlT2Zmc2V0O1xuXG4gICAgICAgIHZhciBjdXJyUG9zaXRpb25YID0gbW91c2VQb3NbMF0gLSBvZmZzZXRQb3NbMF0sXG4gICAgICAgICAgICBjdXJyUG9zaXRpb25ZID0gbW91c2VQb3NbMV0gLSBvZmZzZXRQb3NbMV07XG5cbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICAgICAgaGVhZCA9IHRoaXMuX2hlYWROb2RlLFxuICAgICAgICAgICAgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbjtcblxuICAgICAgICB2YXIgbWF4WCA9IHdpbmRvdy5pbm5lcldpZHRoIC0gbm9kZS5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgbWF4WSA9IHdpbmRvdy5pbm5lckhlaWdodCAtIGhlYWQuZ2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgcG9zaXRpb25bMF0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihjdXJyUG9zaXRpb25YLCBtYXhYKSk7XG4gICAgICAgIHBvc2l0aW9uWzFdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oY3VyclBvc2l0aW9uWSwgbWF4WSkpO1xuXG4gICAgICAgIG5vZGUuc2V0UG9zaXRpb25HbG9iYWwocG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcbiAgICB9LFxuXG4gICAgX2RyYXdDYW52YXNGaWVsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzRmllbGQsXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY29udGV4dENhbnZhc0ZpZWxkO1xuXG4gICAgICAgIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aCxcbiAgICAgICAgICAgIGhlaWdodCA9IGNhbnZhcy5oZWlnaHQsXG4gICAgICAgICAgICBpbnZXaWR0aCA9IDEgLyB3aWR0aCxcbiAgICAgICAgICAgIGludkhlaWdodCA9IDEgLyBoZWlnaHQ7XG5cbiAgICAgICAgdmFyIGltYWdlRGF0YSA9IHRoaXMuX2ltYWdlRGF0YUZpZWxkLFxuICAgICAgICAgICAgcmdiID0gW10sXG4gICAgICAgICAgICBpbmRleCA9IDA7XG5cbiAgICAgICAgdmFyIHZhbHVlSHVlID0gdGhpcy5fdmFsdWVIdWU7XG5cbiAgICAgICAgdmFyIGkgPSAtMSwgajtcbiAgICAgICAgd2hpbGUgKCsraSA8IGhlaWdodCkge1xuICAgICAgICAgICAgaiA9IC0xO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytqIDwgd2lkdGgpIHtcbiAgICAgICAgICAgICAgICByZ2IgPSBDb2xvclV0aWwuSFNWMlJHQih2YWx1ZUh1ZSwgaiAqIGludldpZHRoICogMTAwLjAsICggMS4wIC0gaSAqIGludkhlaWdodCApICogMTAwLjApO1xuICAgICAgICAgICAgICAgIGluZGV4ID0gKGkgKiB3aWR0aCArIGopICogNDtcblxuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4XSA9IHJnYlswXTtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDFdID0gcmdiWzFdO1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgMl0gPSByZ2JbMl07XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAzXSA9IDI1NTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XG4gICAgfSxcblxuICAgIF9kcmF3Q2FudmFzU2xpZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNTbGlkZXIsXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY29udGV4dENhbnZhc1NsaWRlcjtcblxuICAgICAgICB2YXIgd2lkdGggPSBjYW52YXMud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0LFxuICAgICAgICAgICAgaW52SGVpZ2h0ID0gMSAvIGhlaWdodDtcblxuICAgICAgICB2YXIgaW1hZ2VEYXRhID0gdGhpcy5faW1hZ2VEYXRhU2xpZGVyLFxuICAgICAgICAgICAgcmdiID0gW10sXG4gICAgICAgICAgICBpbmRleCA9IDA7XG5cbiAgICAgICAgdmFyIGkgPSAtMSwgajtcbiAgICAgICAgd2hpbGUgKCsraSA8IGhlaWdodCkge1xuICAgICAgICAgICAgaiA9IC0xO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytqIDwgd2lkdGgpIHtcbiAgICAgICAgICAgICAgICByZ2IgPSBDb2xvclV0aWwuSFNWMlJHQigoMS4wIC0gaSAqIGludkhlaWdodCkgKiAzNjAuMCwgMTAwLjAsIDEwMC4wKTtcbiAgICAgICAgICAgICAgICBpbmRleCA9IChpICogd2lkdGggKyBqKSAqIDQ7XG5cbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleF0gPSByZ2JbMF07XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAxXSA9IHJnYlsxXTtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDJdID0gcmdiWzJdO1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgM10gPSAyNTU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApO1xuXG4gICAgfSxcblxuICAgIF9vbkNhbnZhc0ZpZWxkTW91c2VEb3duOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fZHJhd0hhbmRsZUZpZWxkKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgICAgIHNlbGYuX2RyYXdIYW5kbGVGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfb25DYW52YXNTbGlkZXJNb3VzZURvd246IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGV2ZW50TW91c2VNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICAgICAgZXZlbnRNb3VzZVVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9kcmF3SGFuZGxlU2xpZGVyKCk7XG4gICAgICAgICAgICAgICAgc2VsZi5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIHNlbGYuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgICAgIHNlbGYuX2RyYXdIYW5kbGVTbGlkZXIoKTtcbiAgICAgICAgc2VsZi5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgfSxcblxuICAgIF9zZXRTaXplQ2FudmFzRmllbGQ6IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNGaWVsZDtcbiAgICAgICAgY2FudmFzLnN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnO1xuICAgICAgICBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcbiAgICAgICAgY2FudmFzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG5cbiAgICB9LFxuXG4gICAgX3NldFNpemVDYW52YXNTbGlkZXI6IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNTbGlkZXI7XG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgIH0sXG5cbiAgICBvcGVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZTtcblxuICAgICAgICB0aGlzLl9wYXJlbnROb2RlLmFkZENoaWxkKG5vZGUpO1xuICAgICAgICBub2RlLnNldFBvc2l0aW9uR2xvYmFsKHdpbmRvdy5pbm5lcldpZHRoICogMC41IC0gbm9kZS5nZXRXaWR0aCgpICogMC41LFxuICAgICAgICAgICAgd2luZG93LmlubmVySGVpZ2h0ICogMC41IC0gbm9kZS5nZXRIZWlnaHQoKSAqIDAuNSk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9ucygpO1xuICAgIH0sXG5cbiAgICBjbG9zZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuX25vZGUpO1xuICAgIH0sXG5cbiAgICBfb25DbG9zZTogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfSxcbiAgICBfb25QaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrUGljaygpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjYW52YXNTbGlkZXJQb3MgPSB0aGlzLl9jYW52YXNTbGlkZXJQb3MsXG4gICAgICAgICAgICBjYW52YXNGaWVsZFBvcyA9IHRoaXMuX2NhbnZhc0ZpZWxkUG9zO1xuXG4gICAgICAgIGNhbnZhc1NsaWRlclBvc1swXSA9IGNhbnZhc1NsaWRlclBvc1sxXSA9IDA7XG4gICAgICAgIGNhbnZhc0ZpZWxkUG9zWzBdID0gY2FudmFzRmllbGRQb3NbMV0gPSAwO1xuXG4gICAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5fY2FudmFzU2xpZGVyO1xuXG4gICAgICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgICAgICBjYW52YXNTbGlkZXJQb3NbMF0gKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICAgICAgY2FudmFzU2xpZGVyUG9zWzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbWVudCA9IHRoaXMuX2NhbnZhc0ZpZWxkO1xuXG4gICAgICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgICAgICBjYW52YXNGaWVsZFBvc1swXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgICAgICBjYW52YXNGaWVsZFBvc1sxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzZXRDYWxsYmFja1BpY2s6IGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrUGljayA9IGZ1bmM7XG4gICAgfSxcblxuICAgIHNldENvbG9ySEVYOiBmdW5jdGlvbiAoaGV4KSB7XG4gICAgICAgIHRoaXMuX3NldENvbG9ySEVYKGhleCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yRnJvbUhFWCgpO1xuICAgICAgICB0aGlzLl9zZXRDb2xvcigpO1xuICAgIH0sXG5cbiAgICBzZXRDb2xvclJHQjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JSR0IociwgZywgYik7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVkZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3IoKTtcbiAgICB9LFxuXG4gICAgc2V0Q29sb3JSR0JmdjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgdGhpcy5zZXRDb2xvclJHQihNYXRoLmZsb29yKHIgKiAyNTUuMCksXG4gICAgICAgICAgICBNYXRoLmZsb29yKGcgKiAyNTUuMCksXG4gICAgICAgICAgICBNYXRoLmZsb29yKGIgKiAyNTUuMCkpO1xuICAgIH0sXG5cbiAgICBzZXRDb2xvckhTVjogZnVuY3Rpb24gKGgsIHMsIHYpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YoaCwgcywgdik7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3IoKTtcbiAgICB9LFxuXG4gICAgX3NldENvbG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzU2xpZGVyKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZXMoKTtcbiAgICAgICAgdGhpcy5fc2V0Q29udHJhc1ByZXZDb2xvcih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKTtcbiAgICB9LFxuXG4gICAgZ2V0UjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVSO1xuICAgIH0sXG4gICAgZ2V0RzogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVHO1xuICAgIH0sXG4gICAgZ2V0QjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVCO1xuICAgIH0sXG4gICAgZ2V0UkdCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbdGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQl07XG4gICAgfSxcbiAgICBnZXRIdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlSHVlO1xuICAgIH0sXG4gICAgZ2V0U2F0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZVNhdDtcbiAgICB9LFxuICAgIGdldFZhbDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVWYWw7XG4gICAgfSxcbiAgICBnZXRIU1Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFt0aGlzLl92YWx1ZUh1ZSwgdGhpcy5fdmFsdWVTYXQsIHRoaXMuX3ZhbHVlVmFsXTtcbiAgICB9LFxuICAgIGdldEhFWDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVIRVg7XG4gICAgfSxcbiAgICBnZXRSR0JmdjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gW3RoaXMuX3ZhbHVlUiAvIDI1NS4wLCB0aGlzLl92YWx1ZUcgLyAyNTUuMCwgdGhpcy5fdmFsdWVCIC8gMjU1LjBdO1xuICAgIH0sXG5cbiAgICBnZXROb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ub2RlO1xuICAgIH1cbn07XG5cblBpY2tlci5zZXR1cCA9IGZ1bmN0aW9uIChwYXJlbnROb2RlKSB7XG4gICAgcmV0dXJuIFBpY2tlci5faW5zdGFuY2UgPSBuZXcgUGlja2VyKHBhcmVudE5vZGUpO1xufTtcblBpY2tlci5nZXRJbnN0YW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gUGlja2VyLl9pbnN0YW5jZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGlja2VyOyIsInZhciBTVkdDb21wb25lbnQgPSByZXF1aXJlKCcuL1NWR0NvbXBvbmVudCcpO1xuXG5mdW5jdGlvbiBQbG90dGVyKHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKSB7XG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5saW5lV2lkdGggID0gcGFyYW1zLmxpbmVXaWR0aCAgfHwgMjtcbiAgICBwYXJhbXMubGluZUNvbG9yICA9IHBhcmFtcy5saW5lQ29sb3IgIHx8IFsyNTUsMjU1LDI1NV07XG5cbiAgICBTVkdDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdmFyIGxpbmVXaWR0aCA9IHRoaXMuX2xpbmVXaWR0aCA9IHBhcmFtcy5saW5lV2lkdGg7XG4gICAgdmFyIGxpbmVDb2xvciA9IHBhcmFtcy5saW5lQ29sb3I7XG5cbiAgICB2YXIgZ3JpZCA9IHRoaXMuX2dyaWQgPSB0aGlzLl9zdmdSb290LmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgncGF0aCcpKTtcbiAgICAgICAgZ3JpZC5zdHlsZS5zdHJva2UgPSAncmdiKDI2LDI5LDMxKSc7XG5cblxuICAgIHZhciBwYXRoID0gdGhpcy5fcGF0aCA9IHRoaXMuX3N2Z1Jvb3QuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdwYXRoJykpO1xuICAgICAgICBwYXRoLnN0eWxlLnN0cm9rZSAgICAgID0gJ3JnYignK2xpbmVDb2xvclswXSsnLCcrbGluZUNvbG9yWzFdKycsJytsaW5lQ29sb3JbMl0rJyknO1xuICAgICAgICBwYXRoLnN0eWxlLnN0cm9rZVdpZHRoID0gbGluZVdpZHRoIDtcbiAgICAgICAgcGF0aC5zdHlsZS5maWxsICAgICAgICA9ICdub25lJztcbn1cblxuUGxvdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNWR0NvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBsb3R0ZXI7XG4iLCJ2YXIgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxuZnVuY3Rpb24gUHJlc2V0QnRuKHBhcmVudE5vZGUpIHtcbiAgICB2YXIgYnRuTm9kZSA9IHRoaXMuX2J0bk5vZGUgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG4gICAgdmFyIGluZGlOb2RlID0gdGhpcy5faW5kaU5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgdGhpcy5fb25BY3RpdmUgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICB0aGlzLl9vbkRlYWN0aXZlID0gZnVuY3Rpb24gKCkge307XG4gICAgdGhpcy5faXNBY3RpdmUgPSBmYWxzZTtcblxuICAgIGJ0bk5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuUHJlc2V0QnRuKTtcbiAgICBidG5Ob2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uTW91c2VEb3duLmJpbmQodGhpcykpO1xuXG4gICAgYnRuTm9kZS5hZGRDaGlsZChpbmRpTm9kZSk7XG4gICAgcGFyZW50Tm9kZS5hZGRDaGlsZEF0KGJ0bk5vZGUsIDApO1xufVxuXG5QcmVzZXRCdG4ucHJvdG90eXBlID0ge1xuICAgIF9vbk1vdXNlRG93bjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaXNBY3RpdmUgPSB0aGlzLl9pc0FjdGl2ZSA9ICF0aGlzLl9pc0FjdGl2ZTtcblxuICAgICAgICBpZiAoaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHRoaXMuX2J0bk5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuUHJlc2V0QnRuQWN0aXZlKTtcbiAgICAgICAgICAgIHRoaXMuX29uQWN0aXZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9idG5Ob2RlLnNldFN0eWxlQ2xhc3MoQ1NTLlByZXNldEJ0bik7XG4gICAgICAgICAgICB0aGlzLl9vbkRlYWN0aXZlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgc2V0T25BY3RpdmU6IGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgICAgIHRoaXMuX29uQWN0aXZlID0gZnVuYztcbiAgICB9LFxuICAgIHNldE9uRGVhY3RpdmU6IGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgICAgIHRoaXMuX29uRGVhY3RpdmUgPSBmdW5jO1xuICAgIH0sXG5cbiAgICBkZWFjdGl2YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9idG5Ob2RlLnNldFN0eWxlQ2xhc3MoQ1NTLlByZXNldEJ0bik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmVzZXRCdG47XG4iLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi9PYmplY3RDb21wb25lbnQnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgTnVtYmVySW5wdXRfSW50ZXJuYWwgPSByZXF1aXJlKCcuL051bWJlcklucHV0X0ludGVybmFsJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIERFRkFVTFRfUkFOR0VfU1RFUCA9IDEuMCxcbiAgICBERUZBVUxUX1JBTkdFX0RQICAgPSAyO1xuXG5mdW5jdGlvbiBSYW5nZShwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5vbkZpbmlzaCA9IHBhcmFtcy5vbkZpbmlzaCB8fCB0aGlzLl9vbkZpbmlzaDtcblxuICAgIHBhcmFtcy5zdGVwICAgICA9IHBhcmFtcy5zdGVwIHx8IERFRkFVTFRfUkFOR0VfU1RFUDtcbiAgICBwYXJhbXMuZHAgICAgICAgPSBwYXJhbXMuZHAgICB8fCBERUZBVUxUX1JBTkdFX0RQO1xuXG4gICAgdGhpcy5fb25DaGFuZ2UgID0gcGFyYW1zLm9uQ2hhbmdlO1xuICAgIHRoaXMuX29uRmluaXNoICA9IHBhcmFtcy5vbkZpbmlzaDtcblxuICAgIHZhciBzdGVwID0gdGhpcy5fc3RlcCA9IHBhcmFtcy5zdGVwLFxuICAgICAgICBkcCAgID0gdGhpcy5fZHAgICA9IHBhcmFtcy5kcDtcblxuICAgIC8vRklYTUU6IGhpc3RvcnkgcHVzaCBwb3BcblxuICAgIHZhciBsYWJsTWluTm9kZSA9IG5ldyBOb2RlKCk7XG4gICAgdmFyIGlucHV0TWluICAgID0gdGhpcy5faW5wdXRNaW4gPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCwgdGhpcy5wdXNoSGlzdG9yeVN0YXRlLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25JbnB1dE1pbkNoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRNaW5GaW5pc2guYmluZCh0aGlzKSk7XG5cbiAgICB2YXIgbGFibE1heE5vZGUgPSBuZXcgTm9kZSgpO1xuICAgIHZhciBpbnB1dE1heCAgICA9IHRoaXMuX2lucHV0TWF4ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsIHRoaXMucHVzaEhpc3RvcnlTdGF0ZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRNYXhDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0TWF4RmluaXNoLmJpbmQodGhpcykpO1xuXG4gICAgdmFyIHdyYXBMYWJsTWluICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIHdyYXBJbnB1dE1pbiA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIHdyYXBMYWJsTWF4ICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIHdyYXBJbnB1dE1heCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG5cblxuICAgICAgICBsYWJsTWluTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ01JTicpO1xuICAgICAgICBsYWJsTWF4Tm9kZS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ01BWCcpO1xuXG4gICAgdmFyIHZhbHVlcyA9IHRoaXMuX29iamVjdFt0aGlzLl9rZXldO1xuXG4gICAgaW5wdXRNaW4uc2V0VmFsdWUodmFsdWVzWzBdKTtcbiAgICBpbnB1dE1heC5zZXRWYWx1ZSh2YWx1ZXNbMV0pO1xuXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICAgICAgd3JhcExhYmxNaW4uYWRkQ2hpbGQobGFibE1pbk5vZGUpO1xuICAgICAgICB3cmFwSW5wdXRNaW4uYWRkQ2hpbGQoaW5wdXRNaW4uZ2V0Tm9kZSgpKTtcbiAgICAgICAgd3JhcExhYmxNYXguYWRkQ2hpbGQobGFibE1heE5vZGUpO1xuICAgICAgICB3cmFwSW5wdXRNYXguYWRkQ2hpbGQoaW5wdXRNYXguZ2V0Tm9kZSgpKTtcblxuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZCh3cmFwTGFibE1pbik7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKHdyYXBJbnB1dE1pbik7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKHdyYXBMYWJsTWF4KTtcbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQod3JhcElucHV0TWF4KTtcbn1cblxuUmFuZ2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcblxuUmFuZ2UucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuUmFuZ2UucHJvdG90eXBlLl9vbklucHV0RmluaXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkZpbmlzaCgpO1xufTtcblxuUmFuZ2UucHJvdG90eXBlLl91cGRhdGVWYWx1ZU1pbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG5cbiAgICB2YXIgaW5wdXRNaW4gPSB0aGlzLl9pbnB1dE1pbixcbiAgICAgICAgaW5wdXRWYWx1ZSA9IGlucHV0TWluLmdldFZhbHVlKCk7XG5cbiAgICBpZiAoaW5wdXRWYWx1ZSA+PSB0aGlzLl9pbnB1dE1heC5nZXRWYWx1ZSgpKSB7XG4gICAgICAgIGlucHV0TWluLnNldFZhbHVlKHZhbHVlc1swXSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFsdWVzWzBdID0gaW5wdXRWYWx1ZTtcblxufTtcblxuUmFuZ2UucHJvdG90eXBlLl91cGRhdGVWYWx1ZU1heCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG5cbiAgICB2YXIgaW5wdXRNYXggPSB0aGlzLl9pbnB1dE1heCxcbiAgICAgICAgaW5wdXRWYWx1ZSA9IGlucHV0TWF4LmdldFZhbHVlKCk7XG5cbiAgICBpZiAoaW5wdXRWYWx1ZSA8PSB0aGlzLl9pbnB1dE1pbi5nZXRWYWx1ZSgpKSB7XG4gICAgICAgIGlucHV0TWF4LnNldFZhbHVlKHZhbHVlc1sxXSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFsdWVzWzFdID0gaW5wdXRWYWx1ZTtcbn07XG5cblxuUmFuZ2UucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChlLmRhdGEub3JpZ2luID09IG51bGwpIHtcbiAgICB9XG5cbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG4gICAgdGhpcy5faW5wdXRNaW4uc2V0VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX2tleV1bMF0pO1xuICAgIHRoaXMuX2lucHV0TWF4LnNldFZhbHVlKHRoaXMuX29iamVjdFt0aGlzLl9rZXldWzFdKTtcbn07XG5cblxuUmFuZ2UucHJvdG90eXBlLl9vbklucHV0TWluQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZVZhbHVlTWluKCk7XG4gICAgdGhpcy5fb25JbnB1dENoYW5nZSgpO1xufTtcblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dE1pbkZpbmlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVWYWx1ZU1pbigpO1xuICAgIHRoaXMuX29uSW5wdXRGaW5pc2goKTtcbn07XG5SYW5nZS5wcm90b3R5cGUuX29uSW5wdXRNYXhDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVNYXgoKTtcbiAgICB0aGlzLl9vbklucHV0Q2hhbmdlKCk7XG59O1xuUmFuZ2UucHJvdG90eXBlLl9vbklucHV0TWF4RmluaXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZVZhbHVlTWF4KCk7XG4gICAgdGhpcy5fb25JbnB1dEZpbmlzaCgpO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFJhbmdlOyIsInZhciBDb21wb25lbnQgPSByZXF1aXJlKCcuL0NvbXBvbmVudCcpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi4vY29yZS9NZXRyaWMnKTtcbnZhciBHcm91cEV2ZW50ID0gcmVxdWlyZSgnLi4vZ3JvdXAvR3JvdXBFdmVudCcpO1xuXG5mdW5jdGlvbiBTVkcocGFyZW50LCBwYXJhbXMpIHtcbiAgICBDb21wb25lbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlO1xuICAgIHdyYXBOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkNhbnZhc1dyYXApO1xuICAgIHZhciB3cmFwU2l6ZSA9IHdyYXBOb2RlLmdldFdpZHRoKCk7XG5cblxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcgPSB0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3N2ZycpO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ZlcnNpb24nLCAnMS4yJyk7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgnYmFzZVByb2ZpbGUnLCAndGlueScpO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ByZXNlcnZlQXNwZWN0UmF0aW8nLCAndHJ1ZScpO1xuXG4gICAgd3JhcE5vZGUuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKHN2Zyk7XG5cbiAgICB0aGlzLl9zdmdTZXRTaXplKHdyYXBTaXplLCB3cmFwU2l6ZSk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG5cblxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzTGlzdEl0ZW0pO1xuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgdGhpcywgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIHRoaXMuX3BhcmVudCwgJ29uR3JvdXBTaXplVXBkYXRlJyk7XG59XG5cblNWRy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5TVkcucHJvdG90eXBlLl91cGRhdGVIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2Z0hlaWdodCA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XG4gICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KHN2Z0hlaWdodCk7XG4gICAgdGhpcy5fbm9kZS5zZXRIZWlnaHQoc3ZnSGVpZ2h0ICsgTWV0cmljLlBBRERJTkdfV1JBUFBFUik7XG59O1xuXG5TVkcucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3aWR0aCA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCk7XG4gICAgdGhpcy5fc3ZnU2V0U2l6ZSh3aWR0aCwgd2lkdGgpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xufTtcblxuU1ZHLnByb3RvdHlwZS5fc3ZnU2V0U2l6ZSA9IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZztcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ZpZXdib3gnLCAnMCAwICcgKyB3aWR0aCArICcgJyArIGhlaWdodCk7XG59O1xuXG5TVkcucHJvdG90eXBlLmdldFNWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fc3ZnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTVkc7IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4vT2JqZWN0Q29tcG9uZW50Jyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBHcm91cEV2ZW50ID0gcmVxdWlyZSgnLi4vZ3JvdXAvR3JvdXBFdmVudCcpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4uL2NvcmUvTWV0cmljJyk7XG5cbmZ1bmN0aW9uIFNWR0NvbXBvbmVudChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcyl7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlO1xuICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5TVkdXcmFwKTtcbiAgICB2YXIgd3JhcFNpemUgPSB3cmFwTm9kZS5nZXRXaWR0aCgpO1xuXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyA9IHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnc3ZnJyk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ZlcnNpb24nLCAnMS4yJyk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2Jhc2VQcm9maWxlJywgJ3RpbnknKTtcblxuICAgICAgICB3cmFwTm9kZS5nZXRFbGVtZW50KCkuYXBwZW5kQ2hpbGQoc3ZnKTtcblxuICAgIHZhciBzdmdSb290ID0gdGhpcy5fc3ZnUm9vdCA9IHN2Zy5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2cnKSk7XG4gICAgICAgIHN2Z1Jvb3Quc2V0QXR0cmlidXRlKCd0cmFuc2Zvcm0nLCd0cmFuc2xhdGUoMC41IDAuNSknKTtcblxuICAgIHRoaXMuX3N2Z1NldFNpemUod3JhcFNpemUsd3JhcFNpemUpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuXG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZUNsYXNzKENTUy5TVkdMaXN0SXRlbSk7XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCB0aGlzLCAnb25Hcm91cFNpemVDaGFuZ2UnKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSwgdGhpcy5fcGFyZW50LCAnb25Hcm91cFNpemVVcGRhdGUnKTtcbn1cblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5cblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fdXBkYXRlSGVpZ2h0ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc3ZnSGVpZ2h0ID0gTnVtYmVyKHRoaXMuX3N2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcblxuICAgIHRoaXMuX3dyYXBOb2RlLnNldEhlaWdodChzdmdIZWlnaHQpO1xuICAgIHRoaXMuX25vZGUuc2V0SGVpZ2h0KHN2Z0hlaWdodCArIE1ldHJpYy5QQURESU5HX1dSQVBQRVIpO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcmVkcmF3ID0gZnVuY3Rpb24oKXt9O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgd2lkdGggPSB0aGlzLl93cmFwTm9kZS5nZXRXaWR0aCgpO1xuXG4gICAgdGhpcy5fc3ZnU2V0U2l6ZSh3aWR0aCx3aWR0aCk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG4gICAgdGhpcy5fcmVkcmF3KCk7XG59O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9jcmVhdGVTVkdPYmplY3QgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsdHlwZSk7XG59O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9zdmdTZXRTaXplID0gZnVuY3Rpb24od2lkdGgsaGVpZ2h0KSB7XG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZztcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCAgd2lkdGgpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCd2aWV3Ym94JywgJzAgMCAnICsgd2lkdGggKyAnICcgKyBoZWlnaHQpO1xufTtcblxuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kTW92ZVRvID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICByZXR1cm4gJ00gJyArIHggKyAnICcgKyB5ICsgJyAnO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZExpbmVUbyA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgcmV0dXJuICdMICcgKyB4ICsgJyAnICsgeSArICcgJztcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRDbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJ1onO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZExpbmUgPSBmdW5jdGlvbiAoeDAsIHkwLCB4MSwgeTEpIHtcbiAgICByZXR1cm4gJ00gJyArIHgwICsgJyAnICsgeTAgKyAnIEwgJyArIHgxICsgJyAnICsgeTE7XG59O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kQmV6aWVyQ3ViaWMgPSBmdW5jdGlvbiAoY21kLCB4MCwgeTAsIGN4MCwgY3kwLCBjeDEsIGN5MSwgeDEsIHkxKSB7XG4gICAgcmV0dXJuICdNICcgKyB4MCArICcgJyArIHkwICsgJyBDICcgKyBjeDAgKyAnICcgKyBjeTAgKyAnLCAnICsgY3gxICsgJyAnICsgY3kxICsgJywgJyArIHgxICsgJyAnICsgeTE7XG59O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kQmV6aWVyUXVhZHJhdGljID0gZnVuY3Rpb24gKGNtZCwgeDAsIHkwLCBjeCwgY3ksIHgxLCB5MSkge1xuICAgIHJldHVybiAnTSAnICsgeDAgKyAnICcgKyB5MCArICcgUSAnICsgY3ggKyAnICcgKyBjeSArICcsICcgKyB4MSArICcgJyArIHkxO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTVkdDb21wb25lbnQ7IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4vT2JqZWN0Q29tcG9uZW50Jyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbnZhciBPcHRpb25zID0gcmVxdWlyZSgnLi9PcHRpb25zJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50RXZlbnQnKSxcbiAgICBTZWxlY3RFdmVudCA9IHJlcXVpcmUoJy4vU2VsZWN0RXZlbnQnKTtcblxudmFyIENvbnRyb2xLaXRTaGFyZWQgPSByZXF1aXJlKCcuLi9Db250cm9sS2l0U2hhcmVkJyk7XG5cbmZ1bmN0aW9uIFNlbGVjdChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcbiAgICBwYXJhbXMub25GaW5pc2ggPSBwYXJhbXMub25GaW5pc2ggfHwgdGhpcy5fb25GaW5pc2g7XG5cbiAgICB0aGlzLl9vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZTtcbiAgICB0aGlzLl9vbkZpbmlzaCA9IHBhcmFtcy5vbkZpbmlzaDtcblxuICAgIHZhciBvYmogPSB0aGlzLl9vYmplY3QsXG4gICAgICAgIGtleSA9IHRoaXMuX2tleTtcblxuICAgIHZhciB0YXJnZXRLZXkgPSB0aGlzLl90YXJnZXRLZXkgPSBwYXJhbXMudGFyZ2V0LFxuICAgICAgICB2YWx1ZXMgPSB0aGlzLl92YWx1ZXMgPSBvYmpba2V5XTtcblxuXG4gICAgdGhpcy5fc2VsZWN0ZWRJbmRleCA9IC0xO1xuICAgIHRoaXMuX3NlbGVjdGVkID0gbnVsbDtcblxuICAgIHZhciBzZWxlY3QgPSB0aGlzLl9zZWxlY3QgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG4gICAgICAgIHNlbGVjdC5zZXRTdHlsZUNsYXNzKENTUy5TZWxlY3QpO1xuICAgICAgICBzZWxlY3QuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25TZWxlY3RUcmlnZ2VyLmJpbmQodGhpcykpO1xuXG4gICAgaWYodGhpcy5faGFzVGFyZ2V0KCkpIHtcbiAgICAgICAgdmFyIHRhcmdldE9iaiA9IG9ialt0YXJnZXRLZXldIHx8ICcnO1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgdmFsdWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHRhcmdldE9iaiA9PSB2YWx1ZXNbaV0pe1xuICAgICAgICAgICAgICAgIHRoaXMuX3NlbGVjdGVkID0gdmFsdWVzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHNlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0YXJnZXRPYmoudG9TdHJpbmcoKS5sZW5ndGggPiAwID8gdGFyZ2V0T2JqIDogdmFsdWVzWzBdKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHNlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLCBwYXJhbXMuc2VsZWN0ZWQgPyB2YWx1ZXNbcGFyYW1zLnNlbGVjdGVkXSA6ICdDaG9vc2UgLi4uJyk7XG4gICAgfVxuXG4gICAgdGhpcy5fd3JhcE5vZGUuYWRkQ2hpbGQoc2VsZWN0KTtcblxuICAgIHZhciBiYXNlID0gQ29udHJvbEtpdFNoYXJlZC5nZXQoKTtcbiAgICAgICAgYmFzZS5hZGRFdmVudExpc3RlbmVyKFNlbGVjdEV2ZW50LlRSSUdHRVJfU0VMRUNULCB0aGlzLCAnb25TZWxlY3RUcmlnZ2VyJyk7XG5cbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoU2VsZWN0RXZlbnQuU0VMRUNUX1RSSUdHRVJFRCwgYmFzZSwgJ29uU2VsZWN0VHJpZ2dlcmVkJyk7XG59XG5cblNlbGVjdC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5TZWxlY3QucHJvdG90eXBlLm9uU2VsZWN0VHJpZ2dlciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcykge1xuICAgICAgICB0aGlzLl9hY3RpdmUgPSAhdGhpcy5fYWN0aXZlO1xuICAgICAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuICAgICAgICAgICAgdGhpcy5fYnVpbGRPcHRpb25zKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBPcHRpb25zLmdldEluc3RhbmNlKCkuY2xlYXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl9hY3RpdmUgPSBmYWxzZTtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLl9idWlsZE9wdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBPcHRpb25zLmdldEluc3RhbmNlKCk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgb3B0aW9ucy5idWlsZCh0aGlzLl92YWx1ZXMsIHRoaXMuX3NlbGVjdGVkLCB0aGlzLl9zZWxlY3QsXG4gICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgICAgIHNlbGYuX2FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgc2VsZi5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgICAgICAgICAgc2VsZi5fc2VsZWN0ZWRJbmRleCA9IG9wdGlvbnMuZ2V0U2VsZWN0ZWRJbmRleCgpO1xuICAgICAgICAgICAgc2VsZi5fb25DaGFuZ2Uoc2VsZi5fc2VsZWN0ZWRJbmRleCk7XG4gICAgICAgICAgICBvcHRpb25zLmNsZWFyKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLl9hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKVxuICAgICAgICB9LCBmYWxzZSk7XG59O1xuXG5cblNlbGVjdC5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW5kZXggPSBPcHRpb25zLmdldEluc3RhbmNlKCkuZ2V0U2VsZWN0ZWRJbmRleCgpLFxuICAgICAgICBzZWxlY3RlZCA9IHRoaXMuX3NlbGVjdGVkID0gdGhpcy5fdmFsdWVzW2luZGV4XTtcblxuICAgIGlmICh0aGlzLl9oYXNUYXJnZXQoKSkge1xuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICAgICAgdGhpcy5fb2JqZWN0W3RoaXMuX3RhcmdldEtleV0gPSBzZWxlY3RlZDtcbiAgICB9XG5cbiAgICB0aGlzLl9zZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJywgc2VsZWN0ZWQpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUucHVzaEhpc3RvcnlTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqZWN0LFxuICAgICAgICBrZXkgPSB0aGlzLl90YXJnZXRLZXk7XG4gICAgSGlzdG9yeS5nZXRJbnN0YW5jZSgpLnB1c2hTdGF0ZShvYmosIGtleSwgb2JqW2tleV0pO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5fb25TZWxlY3RUcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFNlbGVjdEV2ZW50LlNFTEVDVF9UUklHR0VSRUQsIG51bGwpKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuX3VwZGF0ZUFwcGVhcmFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fc2VsZWN0LnNldFN0eWxlQ2xhc3ModGhpcy5fYWN0aXZlID8gQ1NTLlNlbGVjdEFjdGl2ZSA6IENTUy5TZWxlY3QpO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoIXRoaXMuX2hhc1RhcmdldCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9zZWxlY3RlZCA9IHRoaXMuX29iamVjdFt0aGlzLl90YXJnZXRLZXldO1xuICAgIHRoaXMuX3NlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl9zZWxlY3RlZC50b1N0cmluZygpKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuX2hhc1RhcmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGFyZ2V0S2V5ICE9IG51bGw7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLmdldEluZGV4ID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fc2VsZWN0ZWRJbmRleDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0O1xuIiwidmFyIFNlbGVjdEV2ZW50ID0ge1xuXHRTRUxFQ1RfVFJJR0dFUkVEOiAnc2VsZWN0VHJpZ2dlcicsXG5cdFRSSUdHRVJfU0VMRUNUOiAndHJpZ2dlclNlbGVjdCdcbn07XG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdEV2ZW50OyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuL09iamVjdENvbXBvbmVudCcpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgU2xpZGVyX0ludGVybmFsID0gcmVxdWlyZSgnLi9TbGlkZXJfSW50ZXJuYWwnKTtcblxudmFyIEhpc3RvcnkgPSByZXF1aXJlKCcuLi9jb3JlL0hpc3RvcnknKTtcbnZhciBSYW5nZSA9IHJlcXVpcmUoJy4vUmFuZ2UnKTtcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgUGFuZWxFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL1BhbmVsRXZlbnQnKSxcbiAgICBHcm91cEV2ZW50ID0gcmVxdWlyZSgnLi4vZ3JvdXAvR3JvdXBFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9TTElERVJfU1RFUCA9IDEuMCxcbiAgICBERUZBVUxUX1NMSURFUl9EUCAgID0gMjtcblxuXG5mdW5jdGlvbiBTbGlkZXIocGFyZW50LG9iamVjdCx2YWx1ZSxyYW5nZSxwYXJhbXMpIHtcbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLmxhYmVsICAgID0gcGFyYW1zLmxhYmVsICAgIHx8IHZhbHVlO1xuXG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsW3BhcmVudCxvYmplY3QscmFuZ2UscGFyYW1zXSk7XG5cbiAgICB0aGlzLl92YWx1ZXMgID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG4gICAgdGhpcy5fdGFyZ2V0S2V5ID0gdmFsdWU7XG5cbiAgICBwYXJhbXMuc3RlcCAgICAgPSBwYXJhbXMuc3RlcCAgICAgfHwgREVGQVVMVF9TTElERVJfU1RFUDtcbiAgICBwYXJhbXMuZHAgICAgICAgPSBwYXJhbXMuZHAgICAgICAgfHwgREVGQVVMVF9TTElERVJfRFA7XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5vbkZpbmlzaCA9IHBhcmFtcy5vbkZpbmlzaCB8fCB0aGlzLl9vbkZpbmlzaDtcblxuICAgIHRoaXMuX3N0ZXAgICAgID0gcGFyYW1zLnN0ZXA7XG4gICAgdGhpcy5fb25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2U7XG4gICAgdGhpcy5fb25GaW5pc2ggPSBwYXJhbXMub25GaW5pc2g7XG4gICAgdGhpcy5fZHAgICAgICAgPSBwYXJhbXMuZHA7XG5cbiAgICB2YXIgdmFsdWVzICAgID0gdGhpcy5fdmFsdWVzLFxuICAgICAgICBvYmogICAgICAgPSB0aGlzLl9vYmplY3QsXG4gICAgICAgIHRhcmdldEtleSA9IHRoaXMuX3RhcmdldEtleTtcblxuICAgIHZhciB3cmFwTm9kZSAgPSB0aGlzLl93cmFwTm9kZTtcbiAgICAgICAgd3JhcE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcFNsaWRlcik7XG5cbiAgICB2YXIgc2xpZGVyID0gdGhpcy5fc2xpZGVyID0gbmV3IFNsaWRlcl9JbnRlcm5hbCh3cmFwTm9kZSwgdGhpcy5fb25TbGlkZXJCZWdpbi5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25TbGlkZXJNb3ZlLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vblNsaWRlckVuZC5iaW5kKHRoaXMpKTtcblxuICAgIHNsaWRlci5zZXRCb3VuZE1pbih2YWx1ZXNbMF0pO1xuICAgIHNsaWRlci5zZXRCb3VuZE1heCh2YWx1ZXNbMV0pO1xuICAgIHNsaWRlci5zZXRWYWx1ZShvYmpbdGFyZ2V0S2V5XSk7XG5cblxuICAgIHZhciBpbnB1dCAgPSB0aGlzLl9pbnB1dCA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbCh0aGlzLl9zdGVwLCB0aGlzLl9kcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0Q2hhbmdlLmJpbmQodGhpcykpO1xuXG4gICAgaW5wdXQuc2V0VmFsdWUob2JqW3RhcmdldEtleV0pO1xuXG4gICAgd3JhcE5vZGUuYWRkQ2hpbGQoaW5wdXQuZ2V0Tm9kZSgpKTtcblxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsICAgIHRoaXMsICdvblBhbmVsTW92ZUVuZCcpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIHRoaXMsICdvbkdyb3VwV2lkdGhDaGFuZ2UnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsICAgICB0aGlzLCAnb25XaW5kb3dSZXNpemUnKTtcbn1cblxuU2xpZGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5cblNsaWRlci5wcm90b3R5cGUucHVzaEhpc3RvcnlTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqZWN0LFxuICAgICAgICBrZXkgPSB0aGlzLl90YXJnZXRLZXk7XG4gICAgSGlzdG9yeS5nZXRJbnN0YW5jZSgpLnB1c2hTdGF0ZShvYmosIGtleSwgb2JqW2tleV0pO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5fb25TbGlkZXJCZWdpbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbn07XG5cblNsaWRlci5wcm90b3R5cGUuX29uU2xpZGVyTW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICB0aGlzLl91cGRhdGVWYWx1ZUZpZWxkKCk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xuICAgIHRoaXMuX29uQ2hhbmdlKCk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLl9vblNsaWRlckVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICB0aGlzLl91cGRhdGVWYWx1ZUZpZWxkKCk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xuICAgIHRoaXMuX29uRmluaXNoKCk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpbnB1dCA9IHRoaXMuX2lucHV0LFxuICAgICAgICB2YWx1ZU1pbiA9IHRoaXMuX3ZhbHVlc1swXSxcbiAgICAgICAgdmFsdWVNYXggPSB0aGlzLl92YWx1ZXNbMV07XG5cbiAgICBpZiAoaW5wdXQuZ2V0VmFsdWUoKSA+PSB2YWx1ZU1heCl7XG4gICAgICAgIGlucHV0LnNldFZhbHVlKHZhbHVlTWF4KTtcbiAgICB9XG4gICAgaWYgKGlucHV0LmdldFZhbHVlKCkgPD0gdmFsdWVNaW4pe1xuICAgICAgICBpbnB1dC5zZXRWYWx1ZSh2YWx1ZU1pbik7XG4gICAgfVxuXG4gICAgdmFyIHZhbHVlID0gaW5wdXQuZ2V0VmFsdWUoKTtcblxuICAgIHRoaXMuX3NsaWRlci5zZXRWYWx1ZSh2YWx1ZSk7XG4gICAgdGhpcy5fb2JqZWN0W3RoaXMuX3RhcmdldEtleV0gPSB2YWx1ZTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG4gICAgdGhpcy5fb25GaW5pc2goKTtcbn07XG5cblNsaWRlci5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9zbGlkZXIuZ2V0VmFsdWUoKTtcbiAgICB0aGlzLl9vYmplY3RbdGhpcy5fdGFyZ2V0S2V5XSA9IHZhbHVlO1xuICAgIHRoaXMuX2lucHV0LnNldFZhbHVlKHZhbHVlKTtcbn07XG5cbi8vVE9ETzpGSVggTUVcblNsaWRlci5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgdmFyIG9yaWdpbiA9IGUuZGF0YS5vcmlnaW47XG5cbiAgICBpZiAob3JpZ2luID09IHRoaXMpcmV0dXJuO1xuXG4gICAgdmFyIHNsaWRlciA9IHRoaXMuX3NsaWRlcjtcblxuICAgIGlmICghKG9yaWdpbiBpbnN0YW5jZW9mIFNsaWRlcikpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IHRoaXMuX3ZhbHVlcztcblxuICAgICAgICAvL1RPRE86IEZJWCBNRSFcbiAgICAgICAgaWYgKG9yaWdpbiBpbnN0YW5jZW9mIFJhbmdlKSB7XG4gICAgICAgICAgICBzbGlkZXIuc2V0Qm91bmRNaW4odmFsdWVzWzBdKTtcbiAgICAgICAgICAgIHNsaWRlci5zZXRCb3VuZE1heCh2YWx1ZXNbMV0pO1xuICAgICAgICAgICAgLy9zbGlkZXIuc2V0VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX3RhcmdldEtleV0pO1xuICAgICAgICAgICAgLy90aGlzLl9zbGlkZXIudXBkYXRlSW50ZXJwb2xhdGVkVmFsdWUoKTtcbiAgICAgICAgICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2xpZGVyLnNldEJvdW5kTWluKHZhbHVlc1swXSk7XG4gICAgICAgICAgICBzbGlkZXIuc2V0Qm91bmRNYXgodmFsdWVzWzFdKTtcbiAgICAgICAgICAgIHNsaWRlci5zZXRWYWx1ZSh0aGlzLl9vYmplY3RbdGhpcy5fdGFyZ2V0S2V5XSk7XG4gICAgICAgICAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2xpZGVyLnNldFZhbHVlKHRoaXMuX29iamVjdFt0aGlzLl90YXJnZXRLZXldKTtcbiAgICAgICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgfVxufTtcblxuXG5TbGlkZXIucHJvdG90eXBlLl91cGRhdGVWYWx1ZUZpZWxkID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2lucHV0LnNldFZhbHVlKHRoaXMuX3NsaWRlci5nZXRWYWx1ZSgpKTtcbn07XG5cblNsaWRlci5wcm90b3R5cGUub25QYW5lbE1vdmVFbmQgPVxuICAgIFNsaWRlci5wcm90b3R5cGUub25Hcm91cFdpZHRoQ2hhbmdlID1cbiAgICAgICAgU2xpZGVyLnByb3RvdHlwZS5vbldpbmRvd1Jlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX3NsaWRlci5yZXNldE9mZnNldCgpO1xuICAgICAgICB9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNsaWRlcjsiLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG5cblxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XG5cblxuZnVuY3Rpb24gU2xpZGVyX0ludGVybmFsKHBhcmVudE5vZGUsb25CZWdpbixvbkNoYW5nZSxvbkZpbmlzaCkge1xuICAgIHRoaXMuX2JvdW5kcyAgID0gWzAsMV07XG4gICAgdGhpcy5fdmFsdWUgICAgPSAwO1xuICAgIHRoaXMuX2ludGVycGwgID0gMDtcbiAgICB0aGlzLl9mb2N1cyAgICA9IGZhbHNlO1xuXG5cbiAgICB0aGlzLl9vbkJlZ2luICAgID0gb25CZWdpbiAgfHwgZnVuY3Rpb24oKXt9O1xuICAgIHRoaXMuX29uQ2hhbmdlICAgPSBvbkNoYW5nZSB8fCBmdW5jdGlvbigpe307XG4gICAgdGhpcy5fb25GaW5pc2ggICA9IG9uRmluaXNoIHx8IGZ1bmN0aW9uKCl7fTtcblxuXG4gICAgdmFyIHdyYXBOb2RlID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJXcmFwKTtcbiAgICBwYXJlbnROb2RlLmFkZENoaWxkKHdyYXBOb2RlKTtcblxuICAgIHZhciBzbG90ICAgPSB0aGlzLl9zbG90ICAgPSB7bm9kZTogICAgbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJTbG90KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldFg6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogM307XG5cbiAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlID0ge25vZGUgICAgOiBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNsaWRlckhhbmRsZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aCAgIDogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdnaW5nOiBmYWxzZX07XG5cbiAgICB3cmFwTm9kZS5hZGRDaGlsZChzbG90Lm5vZGUpO1xuICAgIHNsb3Qubm9kZS5hZGRDaGlsZChoYW5kbGUubm9kZSk7XG5cbiAgICBzbG90Lm9mZnNldFggPSBzbG90Lm5vZGUuZ2V0UG9zaXRpb25HbG9iYWxYKCk7XG4gICAgc2xvdC53aWR0aCAgID0gTWF0aC5mbG9vcihzbG90Lm5vZGUuZ2V0V2lkdGgoKSAtIHNsb3QucGFkZGluZyAqIDIpIDtcblxuICAgIGhhbmRsZS5ub2RlLnNldFdpZHRoKGhhbmRsZS53aWR0aCk7XG5cbiAgICBzbG90Lm5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTix0aGlzLl9vblNsb3RNb3VzZURvd24uYmluZCh0aGlzKSk7XG4gICAgc2xvdC5ub2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX1VQLCAgdGhpcy5fb25TbG90TW91c2VVcC5iaW5kKHRoaXMpKTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUuYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX1VQLCAgdGhpcy5fb25Eb2N1bWVudE1vdXNlVXAuYmluZCh0aGlzKSk7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlID1cbntcbiAgICBfb25Eb2N1bWVudE1vdXNlTW92ZSA6IGZ1bmN0aW9uKGUpXG4gICAge1xuICAgICAgICBpZighdGhpcy5faGFuZGxlLmRyYWdnaW5nKXJldHVybjtcblxuICAgICAgICB0aGlzLl91cGRhdGUoKTtcbiAgICAgICAgdGhpcy5fb25DaGFuZ2UoKTtcbiAgICB9LFxuXG4gICAgX29uRG9jdW1lbnRNb3VzZVVwIDogZnVuY3Rpb24oZSlcbiAgICB7XG4gICAgICAgIGlmKHRoaXMuX2hhbmRsZS5kcmFnZ2luZyl0aGlzLl9vbkZpbmlzaCgpO1xuICAgICAgICB0aGlzLl9oYW5kbGUuZHJhZ2dpbmcgPSBmYWxzZTtcbiAgICB9LFxuXG4gICAgX29uU2xvdE1vdXNlRG93biA6IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIHRoaXMuX29uQmVnaW4oKTtcbiAgICAgICAgdGhpcy5fZm9jdXMgPSB0cnVlO1xuICAgICAgICB0aGlzLl9oYW5kbGUuZHJhZ2dpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLl9oYW5kbGUubm9kZS5nZXRFbGVtZW50KCkuZm9jdXMoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlKCk7XG4gICAgfSxcblxuICAgIF9vblNsb3RNb3VzZVVwIDogZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgaWYodGhpcy5fZm9jdXMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGUgPSB0aGlzLl9oYW5kbGU7XG4gICAgICAgICAgICBpZihoYW5kbGUuZHJhZ2dpbmcpdGhpcy5fb25GaW5pc2goKTtcbiAgICAgICAgICAgIGhhbmRsZS5kcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fZm9jdXMgPSBmYWxzZTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZSA6IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIHZhciBteCA9IE1vdXNlLmdldEluc3RhbmNlKCkuZ2V0WCgpLFxuICAgICAgICAgICAgc3ggPSB0aGlzLl9zbG90Lm9mZnNldFgsXG4gICAgICAgICAgICBzdyA9IHRoaXMuX3Nsb3Qud2lkdGgsXG4gICAgICAgICAgICBweCA9IChteCA8IHN4KSA/IDAgOiAobXggPiAoc3ggKyBzdykpID8gc3cgOiAobXggLSBzeCk7XG5cbiAgICAgICAgdGhpcy5faGFuZGxlLm5vZGUuc2V0V2lkdGgoTWF0aC5yb3VuZChweCkpO1xuICAgICAgICB0aGlzLl9pbnRycGwgPSBweCAvIHN3O1xuICAgICAgICB0aGlzLl9pbnRlcnBvbGF0ZVZhbHVlKCk7XG4gICAgfSxcblxuICAgIC8vRklYTUVcbiAgICBfdXBkYXRlSGFuZGxlIDogZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgdmFyIHNsb3RXaWR0aCAgID0gdGhpcy5fc2xvdC53aWR0aCxcbiAgICAgICAgICAgIGhhbmRsZVdpZHRoID0gTWF0aC5yb3VuZCh0aGlzLl9pbnRycGwgKiBzbG90V2lkdGgpO1xuXG4gICAgICAgIHRoaXMuX2hhbmRsZS5ub2RlLnNldFdpZHRoKE1hdGgubWluKGhhbmRsZVdpZHRoLHNsb3RXaWR0aCkpO1xuICAgIH0sXG5cbiAgICBfaW50ZXJwb2xhdGVWYWx1ZSA6IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIHZhciBpbnRycGwgPSB0aGlzLl9pbnRycGw7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdGhpcy5fYm91bmRzWzBdKigxLjAtaW50cnBsKSt0aGlzLl9ib3VuZHNbMV0qaW50cnBsO1xuICAgIH0sXG5cbiAgICByZXNldE9mZnNldCA6IGZ1bmN0aW9uKCl7dmFyIHNsb3QgPSB0aGlzLl9zbG90O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2xvdC5vZmZzZXRYID0gc2xvdC5ub2RlLmdldFBvc2l0aW9uR2xvYmFsWCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2xvdC53aWR0aCAgID0gTWF0aC5mbG9vcihzbG90Lm5vZGUuZ2V0V2lkdGgoKSAtIHNsb3QucGFkZGluZyAqIDIpfSxcblxuICAgIHNldEJvdW5kTWluIDogZnVuY3Rpb24odmFsdWUpXG4gICAge1xuICAgICAgICB2YXIgYm91bmRzID0gdGhpcy5fYm91bmRzO1xuICAgICAgICBpZih2YWx1ZSA+PSBib3VuZHNbMV0pcmV0dXJuO1xuXG4gICAgICAgIGJvdW5kc1swXSA9IHZhbHVlO1xuICAgICAgICB0aGlzLl9pbnRlcnBvbGF0ZVZhbHVlUmVsYXRpdmUoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlKCk7XG4gICAgfSxcblxuICAgIHNldEJvdW5kTWF4IDogZnVuY3Rpb24odmFsdWUpXG4gICAge1xuICAgICAgICB2YXIgYm91bmRzID0gdGhpcy5fYm91bmRzO1xuICAgICAgICBpZih2YWx1ZSA8PSBib3VuZHNbMF0pcmV0dXJuO1xuXG4gICAgICAgIGJvdW5kc1sxXSA9IHZhbHVlO1xuICAgICAgICB0aGlzLl9pbnRlcnBvbGF0ZVZhbHVlUmVsYXRpdmUoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlKCk7XG4gICAgfSxcblxuICAgIF9pbnRlcnBvbGF0ZVZhbHVlUmVsYXRpdmUgOiBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICB2YXIgYm91bmRzTWluICA9IHRoaXMuX2JvdW5kc1swXSxcbiAgICAgICAgICAgIGJvdW5kc01heCAgPSB0aGlzLl9ib3VuZHNbMV0sXG4gICAgICAgICAgICBwcmV2SW50cnBsID0gTWF0aC5hYnMoKHRoaXMuX3ZhbHVlIC0gYm91bmRzTWluKSAvIChib3VuZHNNaW4gLSBib3VuZHNNYXgpKTtcblxuICAgICAgICB0aGlzLl92YWx1ZSAgPSBib3VuZHNNaW4qKDEuMC1wcmV2SW50cnBsKSArIGJvdW5kc01heCpwcmV2SW50cnBsO1xuICAgICAgICB0aGlzLl9pbnRycGwgPSBNYXRoLmFicygodGhpcy5fdmFsdWUgLSBib3VuZHNNaW4pIC8gKGJvdW5kc01pbiAtIGJvdW5kc01heCkpO1xuICAgIH0sXG5cbiAgICBzZXRWYWx1ZSAgICA6IGZ1bmN0aW9uKHZhbHVlKVxuICAgIHtcbiAgICAgICAgdmFyIGJvdW5kc01pbiA9IHRoaXMuX2JvdW5kc1swXSxcbiAgICAgICAgICAgIGJvdW5kc01heCA9IHRoaXMuX2JvdW5kc1sxXTtcblxuICAgICAgICBpZih2YWx1ZSA8IGJvdW5kc01pbiB8fCB2YWx1ZSA+IGJvdW5kc01heClyZXR1cm47XG4gICAgICAgIHRoaXMuX2ludHJwbCA9IE1hdGguYWJzKCh2YWx1ZS1ib3VuZHNNaW4pIC8gKGJvdW5kc01pbiAtIGJvdW5kc01heCkpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGUoKTtcbiAgICAgICAgdGhpcy5fdmFsdWUgID0gdmFsdWU7XG4gICAgfSxcblxuXG4gICAgZ2V0VmFsdWUgOiBmdW5jdGlvbigpe3JldHVybiB0aGlzLl92YWx1ZTt9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gU2xpZGVyX0ludGVybmFsO1xuXG4vL0NvbnRyb2xLaXQuU2xpZGVyX0ludGVybmFsID0gZnVuY3Rpb24ocGFyZW50Tm9kZSxvbkJlZ2luLG9uQ2hhbmdlLG9uRmluaXNoKVxuLy97XG4vLyAgICB0aGlzLl9ib3VuZHMgICA9IFswLDFdO1xuLy8gICAgdGhpcy5fdmFsdWUgICAgPSAwO1xuLy8gICAgdGhpcy5faW50ZXJwbCAgPSAwO1xuLy8gICAgdGhpcy5fZm9jdXMgICAgPSBmYWxzZTtcbi8vXG4vLyAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG4vL1xuLy8gICAgdGhpcy5fb25CZWdpbiAgICA9IG9uQmVnaW4gIHx8IGZ1bmN0aW9uKCl7fTtcbi8vICAgIHRoaXMuX29uQ2hhbmdlICAgPSBvbkNoYW5nZSB8fCBmdW5jdGlvbigpe307XG4vLyAgICB0aGlzLl9vbkZpbmlzaCAgID0gb25GaW5pc2ggfHwgZnVuY3Rpb24oKXt9O1xuLy9cbi8vICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cbi8vXG4vLyAgICB2YXIgd3JhcE5vZGUgPSBuZXcgQ29udHJvbEtpdC5Ob2RlKENvbnRyb2xLaXQuKS5zZXRTdHlsZUNsYXNzKENvbnRyb2xLaXQuQ1NTLlNsaWRlcldyYXApO1xuLy8gICAgcGFyZW50Tm9kZS5hZGRDaGlsZCh3cmFwTm9kZSk7XG4vL1xuLy8gICAgdmFyIHNsb3QgICA9IHRoaXMuX3Nsb3QgICA9IHtub2RlOiAgICBuZXcgQ29udHJvbEtpdC5Ob2RlKENvbnRyb2xLaXQuKS5zZXRTdHlsZUNsYXNzKENvbnRyb2xLaXQuQ1NTLlNsaWRlclNsb3QpLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXRYOiAwLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogICAwLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAzfTtcbi8vXG4vLyAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlID0ge25vZGUgICAgOiBuZXcgQ29udHJvbEtpdC5Ob2RlKENvbnRyb2xLaXQuKS5zZXRTdHlsZUNsYXNzKENvbnRyb2xLaXQuQ1NTLlNsaWRlckhhbmRsZSksXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoICAgOiAwLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFnZ2luZzogZmFsc2V9O1xuLy9cbi8vICAgIHdyYXBOb2RlLmFkZENoaWxkKHNsb3Qubm9kZSk7XG4vLyAgICBzbG90Lm5vZGUuYWRkQ2hpbGQoaGFuZGxlLm5vZGUpO1xuLy9cbi8vICAgIHNsb3Qub2Zmc2V0WCA9IHNsb3Qubm9kZS5nZXRQb3NpdGlvbkdsb2JhbFgoKTtcbi8vICAgIHNsb3Qud2lkdGggICA9IE1hdGguZmxvb3Ioc2xvdC5ub2RlLmdldFdpZHRoKCkgLSBzbG90LnBhZGRpbmcgKiAyKSA7XG4vL1xuLy8gICAgaGFuZGxlLm5vZGUuc2V0V2lkdGgoaGFuZGxlLndpZHRoKTtcbi8vXG4vLyAgICBzbG90Lm5vZGUuYWRkRXZlbnRMaXN0ZW5lcihDb250cm9sS2l0Lk5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uU2xvdE1vdXNlRG93bi5iaW5kKHRoaXMpKTtcbi8vICAgIHNsb3Qubm9kZS5hZGRFdmVudExpc3RlbmVyKENvbnRyb2xLaXQuTm9kZUV2ZW50Lk1PVVNFX1VQLCAgdGhpcy5fb25TbG90TW91c2VVcC5iaW5kKHRoaXMpKTtcbi8vXG4vLyAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKENvbnRyb2xLaXQuRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUuYmluZCh0aGlzKSk7XG4vLyAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKENvbnRyb2xLaXQuRG9jdW1lbnRFdmVudC5NT1VTRV9VUCwgIHRoaXMuX29uRG9jdW1lbnRNb3VzZVVwLmJpbmQodGhpcykpO1xuLy99O1xuLy9cbi8vQ29udHJvbEtpdC5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlID1cbi8ve1xuLy8gICAgX29uRG9jdW1lbnRNb3VzZU1vdmUgOiBmdW5jdGlvbihlKVxuLy8gICAge1xuLy8gICAgICAgIGlmKCF0aGlzLl9oYW5kbGUuZHJhZ2dpbmcpcmV0dXJuO1xuLy9cbi8vICAgICAgICB0aGlzLl91cGRhdGUoKTtcbi8vICAgICAgICB0aGlzLl9vbkNoYW5nZSgpO1xuLy8gICAgfSxcbi8vXG4vLyAgICBfb25Eb2N1bWVudE1vdXNlVXAgOiBmdW5jdGlvbihlKVxuLy8gICAge1xuLy8gICAgICAgIGlmKHRoaXMuX2hhbmRsZS5kcmFnZ2luZyl0aGlzLl9vbkZpbmlzaCgpO1xuLy8gICAgICAgIHRoaXMuX2hhbmRsZS5kcmFnZ2luZyA9IGZhbHNlO1xuLy8gICAgfSxcbi8vXG4vLyAgICBfb25TbG90TW91c2VEb3duIDogZnVuY3Rpb24oKVxuLy8gICAge1xuLy8gICAgICAgIHRoaXMuX29uQmVnaW4oKTtcbi8vICAgICAgICB0aGlzLl9mb2N1cyA9IHRydWU7XG4vLyAgICAgICAgdGhpcy5faGFuZGxlLmRyYWdnaW5nID0gdHJ1ZTtcbi8vICAgICAgICB0aGlzLl9oYW5kbGUubm9kZS5nZXRFbGVtZW50KCkuZm9jdXMoKTtcbi8vICAgICAgICB0aGlzLl91cGRhdGUoKTtcbi8vICAgIH0sXG4vL1xuLy8gICAgX29uU2xvdE1vdXNlVXAgOiBmdW5jdGlvbigpXG4vLyAgICB7XG4vLyAgICAgICAgaWYodGhpcy5fZm9jdXMpXG4vLyAgICAgICAge1xuLy8gICAgICAgICAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlO1xuLy8gICAgICAgICAgICBpZihoYW5kbGUuZHJhZ2dpbmcpdGhpcy5fb25GaW5pc2goKTtcbi8vICAgICAgICAgICAgaGFuZGxlLmRyYWdnaW5nID0gZmFsc2U7XG4vLyAgICAgICAgfVxuLy9cbi8vICAgICAgICB0aGlzLl9mb2N1cyA9IGZhbHNlO1xuLy8gICAgfSxcbi8vXG4vLyAgICBfdXBkYXRlIDogZnVuY3Rpb24oKVxuLy8gICAge1xuLy8gICAgICAgIHZhciBteCA9IENvbnRyb2xLaXQuTW91c2UuZ2V0SW5zdGFuY2UoKS5nZXRYKCksXG4vLyAgICAgICAgICAgIHN4ID0gdGhpcy5fc2xvdC5vZmZzZXRYLFxuLy8gICAgICAgICAgICBzdyA9IHRoaXMuX3Nsb3Qud2lkdGgsXG4vLyAgICAgICAgICAgIHB4ID0gKG14IDwgc3gpID8gMCA6IChteCA+IChzeCArIHN3KSkgPyBzdyA6IChteCAtIHN4KTtcbi8vXG4vLyAgICAgICAgdGhpcy5faGFuZGxlLm5vZGUuc2V0V2lkdGgoTWF0aC5yb3VuZChweCkpO1xuLy8gICAgICAgIHRoaXMuX2ludHJwbCA9IHB4IC8gc3c7XG4vLyAgICAgICAgdGhpcy5faW50ZXJwb2xhdGVWYWx1ZSgpO1xuLy8gICAgfSxcbi8vXG4vLyAgICAvL0ZJWE1FXG4vLyAgICBfdXBkYXRlSGFuZGxlIDogZnVuY3Rpb24oKVxuLy8gICAge1xuLy8gICAgICAgIHZhciBzbG90V2lkdGggICA9IHRoaXMuX3Nsb3Qud2lkdGgsXG4vLyAgICAgICAgICAgIGhhbmRsZVdpZHRoID0gTWF0aC5yb3VuZCh0aGlzLl9pbnRycGwgKiBzbG90V2lkdGgpO1xuLy9cbi8vICAgICAgICB0aGlzLl9oYW5kbGUubm9kZS5zZXRXaWR0aChNYXRoLm1pbihoYW5kbGVXaWR0aCxzbG90V2lkdGgpKTtcbi8vICAgIH0sXG4vL1xuLy8gICAgX2ludGVycG9sYXRlVmFsdWUgOiBmdW5jdGlvbigpXG4vLyAgICB7XG4vLyAgICAgICAgdmFyIGludHJwbCA9IHRoaXMuX2ludHJwbDtcbi8vICAgICAgICB0aGlzLl92YWx1ZSA9IHRoaXMuX2JvdW5kc1swXSooMS4wLWludHJwbCkrdGhpcy5fYm91bmRzWzFdKmludHJwbDtcbi8vICAgIH0sXG4vL1xuLy8gICAgcmVzZXRPZmZzZXQgOiBmdW5jdGlvbigpe3ZhciBzbG90ID0gdGhpcy5fc2xvdDtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2xvdC5vZmZzZXRYID0gc2xvdC5ub2RlLmdldFBvc2l0aW9uR2xvYmFsWCgpO1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzbG90LndpZHRoICAgPSBNYXRoLmZsb29yKHNsb3Qubm9kZS5nZXRXaWR0aCgpIC0gc2xvdC5wYWRkaW5nICogMil9LFxuLy9cbi8vICAgIHNldEJvdW5kTWluIDogZnVuY3Rpb24odmFsdWUpXG4vLyAgICB7XG4vLyAgICAgICAgdmFyIGJvdW5kcyA9IHRoaXMuX2JvdW5kcztcbi8vICAgICAgICBpZih2YWx1ZSA+PSBib3VuZHNbMV0pcmV0dXJuO1xuLy9cbi8vICAgICAgICBib3VuZHNbMF0gPSB2YWx1ZTtcbi8vICAgICAgICB0aGlzLl9pbnRlcnBvbGF0ZVZhbHVlUmVsYXRpdmUoKTtcbi8vICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGUoKTtcbi8vICAgIH0sXG4vL1xuLy8gICAgc2V0Qm91bmRNYXggOiBmdW5jdGlvbih2YWx1ZSlcbi8vICAgIHtcbi8vICAgICAgICB2YXIgYm91bmRzID0gdGhpcy5fYm91bmRzO1xuLy8gICAgICAgIGlmKHZhbHVlIDw9IGJvdW5kc1swXSlyZXR1cm47XG4vL1xuLy8gICAgICAgIGJvdW5kc1sxXSA9IHZhbHVlO1xuLy8gICAgICAgIHRoaXMuX2ludGVycG9sYXRlVmFsdWVSZWxhdGl2ZSgpO1xuLy8gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZSgpO1xuLy8gICAgfSxcbi8vXG4vLyAgICBfaW50ZXJwb2xhdGVWYWx1ZVJlbGF0aXZlIDogZnVuY3Rpb24oKVxuLy8gICAge1xuLy8gICAgICAgIHZhciBib3VuZHNNaW4gID0gdGhpcy5fYm91bmRzWzBdLFxuLy8gICAgICAgICAgICBib3VuZHNNYXggID0gdGhpcy5fYm91bmRzWzFdLFxuLy8gICAgICAgICAgICBwcmV2SW50cnBsID0gTWF0aC5hYnMoKHRoaXMuX3ZhbHVlIC0gYm91bmRzTWluKSAvIChib3VuZHNNaW4gLSBib3VuZHNNYXgpKTtcbi8vXG4vLyAgICAgICAgdGhpcy5fdmFsdWUgID0gYm91bmRzTWluKigxLjAtcHJldkludHJwbCkgKyBib3VuZHNNYXgqcHJldkludHJwbDtcbi8vICAgICAgICB0aGlzLl9pbnRycGwgPSBNYXRoLmFicygodGhpcy5fdmFsdWUgLSBib3VuZHNNaW4pIC8gKGJvdW5kc01pbiAtIGJvdW5kc01heCkpO1xuLy8gICAgfSxcbi8vXG4vLyAgICBzZXRWYWx1ZSAgICA6IGZ1bmN0aW9uKHZhbHVlKVxuLy8gICAge1xuLy8gICAgICAgIHZhciBib3VuZHNNaW4gPSB0aGlzLl9ib3VuZHNbMF0sXG4vLyAgICAgICAgICAgIGJvdW5kc01heCA9IHRoaXMuX2JvdW5kc1sxXTtcbi8vXG4vLyAgICAgICAgaWYodmFsdWUgPCBib3VuZHNNaW4gfHwgdmFsdWUgPiBib3VuZHNNYXgpcmV0dXJuO1xuLy8gICAgICAgIHRoaXMuX2ludHJwbCA9IE1hdGguYWJzKCh2YWx1ZS1ib3VuZHNNaW4pIC8gKGJvdW5kc01pbiAtIGJvdW5kc01heCkpO1xuLy8gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZSgpO1xuLy8gICAgICAgIHRoaXMuX3ZhbHVlICA9IHZhbHVlO1xuLy8gICAgfSxcbi8vXG4vL1xuLy8gICAgZ2V0VmFsdWUgOiBmdW5jdGlvbigpe3JldHVybiB0aGlzLl92YWx1ZTt9XG4vL307IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4vT2JqZWN0Q29tcG9uZW50Jyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgT3B0aW9ucyA9IHJlcXVpcmUoJy4vT3B0aW9ucycpO1xudmFyIFByZXNldEJ0biA9IHJlcXVpcmUoJy4vUHJlc2V0QnRuJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi4vY29yZS9NZXRyaWMnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9ICByZXF1aXJlKCcuL0NvbXBvbmVudEV2ZW50Jyk7XG5cbnZhciBERUZBVUxUX1NUUklOR19JTlBVVF9QUkVTRVQgPSBudWxsO1xuXG5mdW5jdGlvbiBTdHJpbmdJbnB1dChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5vbkZpbmlzaCA9IHBhcmFtcy5vbkZpbmlzaCB8fCB0aGlzLl9vbkZpbmlzaDtcbiAgICBwYXJhbXMucHJlc2V0cyAgPSBwYXJhbXMucHJlc2V0cyAgfHwgREVGQVVMVF9TVFJJTkdfSU5QVVRfUFJFU0VUO1xuXG4gICAgdGhpcy5fb25DaGFuZ2UgICA9IHBhcmFtcy5vbkNoYW5nZTtcbiAgICB0aGlzLl9vbkZpbmlzaCAgID0gcGFyYW1zLm9uRmluaXNoO1xuXG4gICAgdGhpcy5fcHJlc2V0c0tleSA9IHBhcmFtcy5wcmVzZXRzO1xuXG4gICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXQgPSBuZXcgTm9kZShOb2RlLklOUFVUX1RFWFQpO1xuXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICBpZiAoIXRoaXMuX3ByZXNldHNLZXkpIHtcbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQoaW5wdXQpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIGlucHV0V3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgIGlucHV0V3JhcC5zZXRTdHlsZUNsYXNzKENTUy5XcmFwSW5wdXRXUHJlc2V0KTtcblxuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChpbnB1dFdyYXApO1xuICAgICAgICBpbnB1dFdyYXAuYWRkQ2hpbGQoaW5wdXQpO1xuXG4gICAgICAgIHZhciBwcmVzZXRzID0gdGhpcy5fb2JqZWN0W3RoaXMuX3ByZXNldHNLZXldLFxuICAgICAgICAgICAgb3B0aW9ucyA9IE9wdGlvbnMuZ2V0SW5zdGFuY2UoKSxcbiAgICAgICAgICAgIHByZXNldEJ0biA9IG5ldyBQcmVzZXRCdG4odGhpcy5fd3JhcE5vZGUpO1xuXG4gICAgICAgIHZhciBvblByZXNldERlYWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBvcHRpb25zLmNsZWFyKCk7XG4gICAgICAgICAgICBwcmVzZXRCdG4uZGVhY3RpdmF0ZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIG9uUHJlc2V0QWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBvcHRpb25zLmJ1aWxkKHByZXNldHMsXG4gICAgICAgICAgICAgICAgaW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJyksXG4gICAgICAgICAgICAgICAgaW5wdXQsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLCBwcmVzZXRzW29wdGlvbnMuZ2V0U2VsZWN0ZWRJbmRleCgpXSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYucHVzaEhpc3RvcnlTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUHJlc2V0RGVhY3RpdmF0ZSxcbiAgICAgICAgICAgICAgICBNZXRyaWMuUEFERElOR19QUkVTRVQsXG4gICAgICAgICAgICAgICAgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHByZXNldEJ0bi5zZXRPbkFjdGl2ZShvblByZXNldEFjdGl2YXRlKTtcbiAgICAgICAgcHJlc2V0QnRuLnNldE9uRGVhY3RpdmUob25QcmVzZXREZWFjdGl2YXRlKVxuICAgIH1cblxuICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsdGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xuXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuS0VZX1VQLCB0aGlzLl9vbklucHV0S2V5VXAuYmluZCh0aGlzKSk7XG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuQ0hBTkdFLCB0aGlzLl9vbklucHV0Q2hhbmdlLmJpbmQodGhpcykpO1xuXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25JbnB1dERyYWdTdGFydC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsdGhpcy5fcGFyZW50LCdvbkNvbXBvbmVudFNlbGVjdERyYWcnKTtcbn1cblxuU3RyaW5nSW5wdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcblxuU3RyaW5nSW5wdXQucHJvdG90eXBlLl9vbklucHV0S2V5VXAgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmICh0aGlzLl9rZXlJc0NoYXIoZS5rZXlDb2RlKSl7XG4gICAgICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xuICAgIH1cbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuU3RyaW5nSW5wdXQucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAodGhpcy5fa2V5SXNDaGFyKGUua2V5Q29kZSkpe1xuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICB9XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fb25GaW5pc2goKTtcbn07XG5cbi8vVE9ETzogRmluaXNoIGNoZWNrXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUuX2tleUlzQ2hhciA9IGZ1bmN0aW9uIChrZXlDb2RlKSB7XG4gICAgcmV0dXJuIGtleUNvZGUgIT0gMTcgJiZcbiAgICAgICAga2V5Q29kZSAhPSAxOCAmJlxuICAgICAgICBrZXlDb2RlICE9IDIwICYmXG4gICAgICAgIGtleUNvZGUgIT0gMzcgJiZcbiAgICAgICAga2V5Q29kZSAhPSAzOCAmJlxuICAgICAgICBrZXlDb2RlICE9IDM5ICYmXG4gICAgICAgIGtleUNvZGUgIT0gNDAgJiZcbiAgICAgICAga2V5Q29kZSAhPSAxNjtcbn07XG5cblxuU3RyaW5nSW5wdXQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fb2JqZWN0W3RoaXMuX2tleV0gPSB0aGlzLl9pbnB1dC5nZXRQcm9wZXJ0eSgndmFsdWUnKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG59O1xuXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcylyZXR1cm47XG4gICAgdGhpcy5faW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufTtcblxuLy9QcmV2ZW50IGNocm9tZSBzZWxlY3QgZHJhZ1xuU3RyaW5nSW5wdXQucHJvdG90eXBlLl9vbklucHV0RHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBldmVudE1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50VXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIGV2ZW50ID0gQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUc7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uRHJhZ0ZpbmlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XG5cbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWdGaW5pc2gsIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdGaW5pc2gsIGZhbHNlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RyaW5nSW5wdXQ7IiwidmFyIE91dHB1dCA9IHJlcXVpcmUoJy4vT3V0cHV0Jyk7XG5cblN0cmluZ091dHB1dCA9IGZ1bmN0aW9uIChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIE91dHB1dC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuU3RyaW5nT3V0cHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT3V0cHV0LnByb3RvdHlwZSk7XG5cblN0cmluZ091dHB1dC5wcm90b3R5cGUuX3NldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9wYXJlbnQuaXNEaXNhYmxlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRleHRBcmVhU3RyaW5nID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG5cbiAgICBpZiAodGV4dEFyZWFTdHJpbmcgPT0gdGhpcy5fcHJldlN0cmluZyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRleHRBcmVhID0gdGhpcy5fdGV4dEFyZWEsXG4gICAgICAgIHRleHRBcmVhRWxlbWVudCA9IHRleHRBcmVhLmdldEVsZW1lbnQoKSxcbiAgICAgICAgdGV4dEFyZWFTY3JvbGxIZWlnaHQ7XG5cbiAgICB0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0ZXh0QXJlYVN0cmluZyk7XG4gICAgdGV4dEFyZWFTY3JvbGxIZWlnaHQgPSB0ZXh0QXJlYUVsZW1lbnQuc2Nyb2xsSGVpZ2h0O1xuICAgIHRleHRBcmVhLnNldEhlaWdodCh0ZXh0QXJlYVNjcm9sbEhlaWdodCk7XG5cbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyO1xuXG4gICAgaWYgKHNjcm9sbEJhcikge1xuICAgICAgICBpZiAodGV4dEFyZWFTY3JvbGxIZWlnaHQgPD0gdGhpcy5fd3JhcE5vZGUuZ2V0SGVpZ2h0KCkpIHtcbiAgICAgICAgICAgIHNjcm9sbEJhci5kaXNhYmxlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzY3JvbGxCYXIuZW5hYmxlKCk7XG4gICAgICAgICAgICBzY3JvbGxCYXIudXBkYXRlKCk7XG4gICAgICAgICAgICBzY3JvbGxCYXIucmVzZXQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9wcmV2U3RyaW5nID0gdGV4dEFyZWFTdHJpbmc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmluZ091dHB1dDtcbiIsInZhciBQbG90dGVyID0gcmVxdWlyZSgnLi9QbG90dGVyJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi4vY29yZS9NZXRyaWMnKTtcblxudmFyIERFRkFVTFRfVkFMVUVfUExPVFRFUl9SRVNPTFVUSU9OID0gMTtcblxuZnVuY3Rpb24gVmFsdWVQbG90dGVyKHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKSB7XG4gICAgUGxvdHRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgc3ZnICAgICAgID0gdGhpcy5fc3ZnLFxuICAgICAgICBzdmdXaWR0aCAgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIHN2Z0hlaWdodCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCAgICAgfHwgc3ZnSGVpZ2h0O1xuICAgIHBhcmFtcy5yZXNvbHV0aW9uID0gcGFyYW1zLnJlc29sdXRpb24gfHwgREVGQVVMVF9WQUxVRV9QTE9UVEVSX1JFU09MVVRJT047XG5cbiAgICB2YXIgcmVzb2x1dGlvbiA9IHBhcmFtcy5yZXNvbHV0aW9uLFxuICAgICAgICBsZW5ndGggICAgID0gTWF0aC5mbG9vcihzdmdXaWR0aCAvIHJlc29sdXRpb24pO1xuXG4gICAgdmFyIHBvaW50cyAgICAgPSB0aGlzLl9wb2ludHMgID0gbmV3IEFycmF5KGxlbmd0aCAqIDIpLFxuICAgICAgICBidWZmZXIwICAgID0gdGhpcy5fYnVmZmVyMCA9IG5ldyBBcnJheShsZW5ndGgpLFxuICAgICAgICBidWZmZXIxICAgID0gdGhpcy5fYnVmZmVyMSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXG4gICAgdmFyIG1pbiA9IHRoaXMuX2xpbmVXaWR0aCAqIDAuNTtcblxuICAgIHZhciBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IGxlbmd0aCkge1xuICAgICAgICBidWZmZXIwW2ldID0gYnVmZmVyMVtpXSA9IHBvaW50c1tpICogMl0gPSBwb2ludHNbaSAqIDIgKyAxXSA9IG1pbjtcbiAgICB9XG5cbiAgICB0aGlzLl9oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0ID0gcGFyYW1zLmhlaWdodCAgPCBNZXRyaWMuQ09NUE9ORU5UX01JTl9IRUlHSFQgP1xuICAgICAgICAgICAgICAgICAgIE1ldHJpYy5DT01QT05FTlRfTUlOX0hFSUdIVCA6IHBhcmFtcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl9zdmdTZXRTaXplKHN2Z0hlaWdodCxNYXRoLmZsb29yKHBhcmFtcy5oZWlnaHQpKTtcbiAgICB0aGlzLl9ncmlkLnN0eWxlLnN0cm9rZSA9ICdyZ2IoMzksNDQsNDYpJztcblxuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHRoaXMuX2RyYXdWYWx1ZSgpO1xufVxuXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQbG90dGVyLnByb3RvdHlwZSk7XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUuX3JlZHJhdyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcG9pbnRzID0gdGhpcy5fcG9pbnRzLFxuICAgICAgICBidWZmZXJMZW4gPSB0aGlzLl9idWZmZXIwLmxlbmd0aDtcblxuICAgIHZhciB3aWR0aCA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgcmF0aW8gPSB3aWR0aCAvIChidWZmZXJMZW4gLSAxKTtcblxuICAgIHZhciBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IGJ1ZmZlckxlbikge1xuICAgICAgICBwb2ludHNbaSAqIDJdID0gd2lkdGggLSBpICogcmF0aW87XG4gICAgfVxuXG4gICAgdGhpcy5fZHJhd1ZhbHVlKCk7XG59O1xuXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3aWR0aCA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCksXG4gICAgICAgIGhlaWdodCA9IHRoaXMuX2hlaWdodDtcblxuICAgIHRoaXMuX3N2Z1NldFNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG4gICAgdGhpcy5fZHJhd0dyaWQoKTtcbiAgICB0aGlzLl9yZWRyYXcoKTtcbn07XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUuX2RyYXdWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9kcmF3Q3VydmUoKTtcbn07XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUuX2RyYXdHcmlkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XG5cbiAgICB2YXIgc3ZnV2lkdGggPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIHN2Z0hlaWdodEhhbGYgPSBNYXRoLmZsb29yKE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSkgKiAwLjUpO1xuXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTW92ZVRvKDAsIHN2Z0hlaWdodEhhbGYpO1xuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lVG8oc3ZnV2lkdGgsIHN2Z0hlaWdodEhhbGYpO1xuXG4gICAgdGhpcy5fZ3JpZC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbn07XG5cbi8vVE9ETzogbWVyZ2UgdXBkYXRlICsgcGF0aGNtZFxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fZHJhd0N1cnZlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XG5cbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcblxuICAgIHZhciBidWZmZXIwID0gdGhpcy5fYnVmZmVyMCxcbiAgICAgICAgYnVmZmVyMSA9IHRoaXMuX2J1ZmZlcjEsXG4gICAgICAgIHBvaW50cyA9IHRoaXMuX3BvaW50cztcblxuICAgIHZhciBidWZmZXJMZW5ndGggPSBidWZmZXIwLmxlbmd0aDtcblxuICAgIHZhciBwYXRoQ21kID0gJyc7XG5cbiAgICB2YXIgaGVpZ2h0SGFsZiA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSkgKiAwLjUsXG4gICAgICAgIHVuaXQgPSBoZWlnaHRIYWxmIC0gdGhpcy5fbGluZVdpZHRoICogMC41O1xuXG4gICAgcG9pbnRzWzFdID0gYnVmZmVyMFswXTtcbiAgICBidWZmZXIwW2J1ZmZlckxlbmd0aCAtIDFdID0gKHZhbHVlICogdW5pdCkgKiAtMSArIE1hdGguZmxvb3IoaGVpZ2h0SGFsZik7XG5cbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRNb3ZlVG8ocG9pbnRzWzBdLCBwb2ludHNbMV0pO1xuXG4gICAgdmFyIGkgPSAwLCBpbmRleDtcblxuICAgIHdoaWxlICgrK2kgPCBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgaW5kZXggPSBpICogMjtcblxuICAgICAgICBidWZmZXIxW2kgLSAxXSA9IGJ1ZmZlcjBbaV07XG4gICAgICAgIHBvaW50c1tpbmRleCArIDFdID0gYnVmZmVyMFtpIC0gMV0gPSBidWZmZXIxW2kgLSAxXTtcblxuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lVG8ocG9pbnRzW2luZGV4XSwgcG9pbnRzW2luZGV4ICsgMV0pO1xuICAgIH1cblxuICAgIHRoaXMuX3BhdGguc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XG59O1xuXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5fcGFyZW50LmlzRGlzYWJsZWQoKSlyZXR1cm47XG4gICAgdGhpcy5fZHJhd1ZhbHVlKCk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBWYWx1ZVBsb3R0ZXI7XG5cbiIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuICAgIEV2ZW50XyA9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnQnKSxcbiAgICBIaXN0b3J5RXZlbnQgPSByZXF1aXJlKCcuL0hpc3RvcnlFdmVudCcpO1xuXG52YXIgTUFYX1NUQVRFUyA9IDMwO1xuXG5mdW5jdGlvbiBIaXN0b3J5KCkge1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHRoaXMuX3N0YXRlcyA9IFtdO1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSBmYWxzZTtcbn1cblxuSGlzdG9yeS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuXG5IaXN0b3J5LnByb3RvdHlwZS5wdXNoU3RhdGUgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXksIHZhbHVlKSB7XG4gICAgaWYgKHRoaXMuX2lzRGlzYWJsZWQpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICBpZiAoc3RhdGVzLmxlbmd0aCA+PSBNQVhfU1RBVEVTKXtcbiAgICAgICAgc3RhdGVzLnNoaWZ0KCk7XG4gICAgfVxuICAgIHN0YXRlcy5wdXNoKHtvYmplY3Q6IG9iamVjdCwga2V5OiBrZXksIHZhbHVlOiB2YWx1ZX0pO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEhpc3RvcnlFdmVudC5TVEFURV9QVVNILCBudWxsKSk7XG59O1xuXG5IaXN0b3J5LnByb3RvdHlwZS5nZXRTdGF0ZSA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSkge1xuICAgIHZhciBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXMsXG4gICAgICAgIHN0YXRlc0xlbiA9IHN0YXRlcy5sZW5ndGg7XG5cbiAgICBpZiAoc3RhdGVzTGVuID09IDApe1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgc3RhdGUsIHZhbHVlO1xuICAgIHZhciBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IHN0YXRlc0xlbikge1xuICAgICAgICBzdGF0ZSA9IHN0YXRlc1tpXTtcbiAgICAgICAgaWYgKHN0YXRlLm9iamVjdCA9PT0gb2JqZWN0KSB7XG4gICAgICAgICAgICBpZiAoc3RhdGUua2V5ID09PSBrZXkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHN0YXRlLnZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbn07XG5cbkhpc3RvcnkucHJvdG90eXBlLnBvcFN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9pc0Rpc2FibGVkKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG4gICAgaWYgKHN0YXRlcy5sZW5ndGggPCAxKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBsYXN0U3RhdGUgPSBzdGF0ZXMucG9wKCk7XG4gICAgbGFzdFN0YXRlLm9iamVjdFtsYXN0U3RhdGUua2V5XSA9IGxhc3RTdGF0ZS52YWx1ZTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEhpc3RvcnkuSElTVE9SWV9TVEFURV9QT1AsIG51bGwpKTtcbn07XG5cbkhpc3RvcnkucHJvdG90eXBlLmdldE51bVN0YXRlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fc3RhdGVzLmxlbmd0aDtcbn07XG5cbkhpc3RvcnkuX2luc3RhbmNlID0gbnVsbDtcblxuSGlzdG9yeS5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gSGlzdG9yeS5faW5zdGFuY2UgPSBuZXcgSGlzdG9yeSgpO1xufTtcblxuSGlzdG9yeS5nZXRJbnN0YW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gSGlzdG9yeS5faW5zdGFuY2U7XG59O1xuXG5IaXN0b3J5LnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xufTtcbkhpc3RvcnkucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IHRydWU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEhpc3Rvcnk7XG5cbi8vQ29udHJvbEtpdC5IaXN0b3J5LnByb3RvdHlwZS5pc0Rpc2FibGVkID0gZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faXNEaXNhYmxlZDt9O0NvbnRyb2xLaXQuSGlzdG9yeSA9IGZ1bmN0aW9uKClcbi8ve1xuLy8gICAgQ29udHJvbEtpdC5FdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuLy8gICAgdGhpcy5fc3RhdGVzICAgPSBbXTtcbi8vICAgIHRoaXMuX2lzRGlzYWJsZWQgPSBmYWxzZTtcbi8vfTtcbi8vXG4vL0NvbnRyb2xLaXQuSGlzdG9yeS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbnRyb2xLaXQuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG4vL1xuLy8vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG4vL1xuLy9Db250cm9sS2l0Lkhpc3RvcnkucHJvdG90eXBlLnB1c2hTdGF0ZSA9IGZ1bmN0aW9uKG9iamVjdCxrZXksdmFsdWUpXG4vL3tcbi8vICAgIGlmKHRoaXMuX2lzRGlzYWJsZWQpcmV0dXJuO1xuLy9cbi8vICAgIHZhciBzdGF0ZXMgICAgPSB0aGlzLl9zdGF0ZXMsXG4vLyAgICAgICAgc3RhdGVzTWF4ID0gQ29udHJvbEtpdC5QcmVzZXQuSElTVE9SWV9NQVhfU1RBVEVTO1xuLy9cbi8vICAgIGlmKHN0YXRlcy5sZW5ndGggPj0gc3RhdGVzTWF4KXN0YXRlcy5zaGlmdCgpO1xuLy8gICAgc3RhdGVzLnB1c2goe29iamVjdDpvYmplY3Qsa2V5OmtleSx2YWx1ZTp2YWx1ZX0pO1xuLy9cbi8vICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ29udHJvbEtpdC5FdmVudCh0aGlzLENvbnRyb2xLaXQuRXZlbnRUeXBlLlNUQVRFX1BVU0gsbnVsbCkpO1xuLy99O1xuLy9cbi8vQ29udHJvbEtpdC5IaXN0b3J5LnByb3RvdHlwZS5nZXRTdGF0ZSA9IGZ1bmN0aW9uKG9iamVjdCxrZXkpXG4vL3tcbi8vICAgIHZhciBzdGF0ZXMgICAgPSB0aGlzLl9zdGF0ZXMsXG4vLyAgICAgICAgc3RhdGVzTGVuID0gc3RhdGVzLmxlbmd0aDtcbi8vXG4vLyAgICBpZihzdGF0ZXNMZW4gPT0gMClyZXR1cm4gbnVsbDtcbi8vXG4vLyAgICB2YXIgc3RhdGUsdmFsdWU7XG4vL1xuLy8gICAgdmFyIGkgPSAtMTtcbi8vICAgIHdoaWxlKCsraSA8IHN0YXRlc0xlbilcbi8vICAgIHtcbi8vICAgICAgICBzdGF0ZSA9IHN0YXRlc1tpXTtcbi8vXG4vLyAgICAgICAgaWYoc3RhdGUub2JqZWN0ID09PSBvYmplY3QpXG4vLyAgICAgICAge1xuLy8gICAgICAgICAgICBpZihzdGF0ZS5rZXkgPT09IGtleSlcbi8vICAgICAgICAgICAge1xuLy8gICAgICAgICAgICAgICB2YWx1ZSA9IHN0YXRlLnZhbHVlO1xuLy8gICAgICAgICAgICAgICBicmVhaztcbi8vICAgICAgICAgICAgfVxuLy8gICAgICAgIH1cbi8vICAgIH1cbi8vXG4vLyAgICByZXR1cm4gdmFsdWU7XG4vL307XG4vL1xuLy9Db250cm9sS2l0Lkhpc3RvcnkucHJvdG90eXBlLnBvcFN0YXRlICA9IGZ1bmN0aW9uKClcbi8ve1xuLy8gICAgaWYodGhpcy5faXNEaXNhYmxlZClyZXR1cm47XG4vL1xuLy8gICAgdmFyIHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbi8vICAgIGlmKHN0YXRlcy5sZW5ndGggPCAxKXJldHVybjtcbi8vXG4vLyAgICB2YXIgbGFzdFN0YXRlID0gc3RhdGVzLnBvcCgpO1xuLy8gICAgbGFzdFN0YXRlLm9iamVjdFtsYXN0U3RhdGUua2V5XSA9IGxhc3RTdGF0ZS52YWx1ZTtcbi8vXG4vLyAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IENvbnRyb2xLaXQuRXZlbnQodGhpcyxDb250cm9sS2l0LkV2ZW50VHlwZS5TVEFURV9QT1AsbnVsbCkpO1xuLy99O1xuLy9cbi8vQ29udHJvbEtpdC5IaXN0b3J5LnByb3RvdHlwZS5nZXROdW1TdGF0ZXMgPSBmdW5jdGlvbigpe3JldHVybiB0aGlzLl9zdGF0ZXMubGVuZ3RoO307XG4vL1xuLy8vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG4vL1xuLy9Db250cm9sS2l0Lkhpc3RvcnkuX2luc3RhbmNlICAgPSBudWxsO1xuLy9Db250cm9sS2l0Lkhpc3RvcnkuU2V0dXAgICAgICAgID0gZnVuY3Rpb24oKXtyZXR1cm4gQ29udHJvbEtpdC5IaXN0b3J5Ll9pbnN0YW5jZSA9IG5ldyBDb250cm9sS2l0Lkhpc3RvcnkoKTt9O1xuLy9Db250cm9sS2l0Lkhpc3RvcnkuZ2V0SW5zdGFuY2UgPSBmdW5jdGlvbigpe3JldHVybiBDb250cm9sS2l0Lkhpc3RvcnkuX2luc3RhbmNlO307XG4vL1xuLy9Db250cm9sS2l0Lkhpc3RvcnkucHJvdG90eXBlLmVuYWJsZSAgICAgPSBmdW5jdGlvbigpe3RoaXMuX2lzRGlzYWJsZWQ9ZmFsc2U7fTtcbi8vQ29udHJvbEtpdC5IaXN0b3J5LnByb3RvdHlwZS5kaXNhYmxlICAgID0gZnVuY3Rpb24oKXt0aGlzLl9pc0Rpc2FibGVkPXRydWU7fTtcbi8vQ29udHJvbEtpdC5IaXN0b3J5LnByb3RvdHlwZS5pc0Rpc2FibGVkID0gZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faXNEaXNhYmxlZDt9OyIsInZhciBIaXN0b3J5RXZlbnQgPSB7XG5cdFNUQVRFX1BVU0g6ICdoaXN0b3J5U3RhdGVQdXNoJyxcblx0U1RBVEVfUE9QOiAnaGlzdG9yeVN0YXRlUG9wJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBIaXN0b3J5RXZlbnQ7IiwidmFyIE1ldHJpYyA9IHtcblx0Q09NUE9ORU5UX01JTl9IRUlHSFQ6IDI1LFxuXHRTVFJPS0VfU0laRTogMSxcblx0UEFERElOR19XUkFQUEVSOiAxMixcblx0UEFERElOR19PUFRJT05TOiAyLFxuXHRQQURESU5HX1BSRVNFVDogMjAsXG5cblx0U0NST0xMQkFSX1RSQUNLX1BBRERJTkc6IDIsXG5cdEZVTkNUSU9OX1BMT1RURVJfTEFCRUxfVElDS19TSVpFOiA2XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1ldHJpYzsiLCJ2YXIgUHJlc2V0ID1cbntcbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICAvL0hJU1RPUllfTUFYX1NUQVRFUyA6IDMwLFxuICAgIE5VTUJFUl9JTlBVVF9TSElGVF9NVUxUSVBMSUVSIDogMTAsXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICBGVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1ggICAgOiAgMSxcbiAgICBGVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1kgICAgOiAgMSxcbiAgICBGVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1VOSVRfWCAgICA6ICAwLjI1LFxuICAgIEZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfVU5JVF9ZICAgIDogIDAuMjUsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9VTklUX01JTiAgOiAwLjE1LFxuICAgIEZVTkNUSU9OX1BMT1RURVJfVU5JVF9NQVggIDogNCxcbiAgICBGVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9TQ0FMRSAgICAgOiAxMC4wLFxuICAgIEZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfU0NBTEUgICAgIDoxLjAsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9TQ0FMRV9NSU4gOiAwLjAyLFxuICAgIEZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUFYIDogMjUsXG5cbiAgICBGVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX0FYRVNfQ09MT1IgOiAncmdiYSgyNTUsMjU1LDI1NSwwLjc1KScsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9HUklEX0NPTE9SIDogJ3JnYmEoMjUsMjUsMjUsMC43NSknLFxuXG4gICAgRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfQVhFU19DT0xPUiA6ICdyZ2IoNTQsNjAsNjQpJyxcbiAgICBGVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9HUklEX0NPTE9SIDogJ3JnYigyNSwyNSwyNSknLFxuXG4gICAgRlVOQ1RJT05fUExPVFRFUl9DSVJDTEVfTEFCRUxfUkFESVVTIDogMyxcbiAgICBGVU5DVElPTl9QTE9UVEVSX0NJUkNMRV9MQUJFTF9GSUxMICAgOiAncmdiKDI1NSwyNTUsMjU1KScsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9DSVJDTEVfU1RST0tFICAgICAgIDogJyNiMTIzMzQnXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJlc2V0OyIsInZhciBDb2xvck1vZGUgPSB7XG5cdFJHQjogJ3JnYicsXG5cdEhTVjogJ2hzdicsXG5cdEhFWDogJ2hleCcsXG5cdFJHQmZ2OiAncmdiZnYnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9yTW9kZTsiLCJ2YXIgQ29sb3JVdGlsID0ge1xuXHRIU1YyUkdCOiBmdW5jdGlvbiAoaHVlLCBzYXQsIHZhbCkge1xuXHRcdHZhciBtYXhfaHVlID0gMzYwLjAsXG5cdFx0XHRtYXhfc2F0ID0gMTAwLjAsXG5cdFx0XHRtYXhfdmFsID0gMTAwLjA7XG5cblx0XHR2YXIgbWluX2h1ZSA9IDAuMCxcblx0XHRcdG1pbl9zYXQgPSAwLFxuXHRcdFx0bWluX3ZhbCA9IDA7XG5cblx0XHRodWUgPSBodWUgJSBtYXhfaHVlO1xuXHRcdHZhbCA9IE1hdGgubWF4KG1pbl92YWwsIE1hdGgubWluKHZhbCwgbWF4X3ZhbCkpIC8gbWF4X3ZhbCAqIDI1NS4wO1xuXG5cdFx0aWYgKHNhdCA8PSBtaW5fc2F0KSB7XG5cdFx0XHR2YWwgPSBNYXRoLnJvdW5kKHZhbCk7XG5cdFx0XHRyZXR1cm4gW3ZhbCwgdmFsLCB2YWxdO1xuXHRcdH1cblx0XHRlbHNlIGlmIChzYXQgPiBtYXhfc2F0KXNhdCA9IG1heF9zYXQ7XG5cblx0XHRzYXQgPSBzYXQgLyBtYXhfc2F0O1xuXG5cdFx0Ly9odHRwOi8vZC5oYXRlbmEubmUuanAvamE5LzIwMTAwOTAzLzEyODM1MDQzNFxuXG5cdFx0dmFyIGhpID0gTWF0aC5mbG9vcihodWUgLyA2MC4wKSAlIDYsXG5cdFx0XHRmID0gKGh1ZSAvIDYwLjApIC0gaGksXG5cdFx0XHRwID0gdmFsICogKDEgLSBzYXQpLFxuXHRcdFx0cSA9IHZhbCAqICgxIC0gZiAqIHNhdCksXG5cdFx0XHR0ID0gdmFsICogKDEgLSAoMSAtIGYpICogc2F0KTtcblxuXHRcdHZhciByID0gMCxcblx0XHRcdGcgPSAwLFxuXHRcdFx0YiA9IDA7XG5cblx0XHRzd2l0Y2ggKGhpKSB7XG5cdFx0XHRjYXNlIDA6XG5cdFx0XHRcdHIgPSB2YWw7XG5cdFx0XHRcdGcgPSB0O1xuXHRcdFx0XHRiID0gcDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHIgPSBxO1xuXHRcdFx0XHRnID0gdmFsO1xuXHRcdFx0XHRiID0gcDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHIgPSBwO1xuXHRcdFx0XHRnID0gdmFsO1xuXHRcdFx0XHRiID0gdDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDM6XG5cdFx0XHRcdHIgPSBwO1xuXHRcdFx0XHRnID0gcTtcblx0XHRcdFx0YiA9IHZhbDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDQ6XG5cdFx0XHRcdHIgPSB0O1xuXHRcdFx0XHRnID0gcDtcblx0XHRcdFx0YiA9IHZhbDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDU6XG5cdFx0XHRcdHIgPSB2YWw7XG5cdFx0XHRcdGcgPSBwO1xuXHRcdFx0XHRiID0gcTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHRyID0gTWF0aC5yb3VuZChyKTtcblx0XHRnID0gTWF0aC5yb3VuZChnKTtcblx0XHRiID0gTWF0aC5yb3VuZChiKTtcblxuXHRcdHJldHVybiBbciwgZywgYl07XG5cblx0fSxcblxuXHRSR0IySFNWOiBmdW5jdGlvbiAociwgZywgYikge1xuXHRcdHZhciBoID0gMCxcblx0XHRcdHMgPSAwLFxuXHRcdFx0diA9IDA7XG5cblx0XHRyID0gciAvIDI1NS4wO1xuXHRcdGcgPSBnIC8gMjU1LjA7XG5cdFx0YiA9IGIgLyAyNTUuMDtcblxuXHRcdHZhciBtaW5SR0IgPSBNYXRoLm1pbihyLCBNYXRoLm1pbihnLCBiKSksXG5cdFx0XHRtYXhSR0IgPSBNYXRoLm1heChyLCBNYXRoLm1heChnLCBiKSk7XG5cblx0XHRpZiAobWluUkdCID09IG1heFJHQikge1xuXHRcdFx0diA9IG1pblJHQjtcblx0XHRcdHJldHVybiBbMCwgMCwgTWF0aC5yb3VuZCh2KV07XG5cdFx0fVxuXG5cdFx0dmFyIGRkID0gKHIgPT0gbWluUkdCKSA/IGcgLSBiIDogKChiID09IG1pblJHQikgPyByIC0gZyA6IGIgLSByKSxcblx0XHRcdGhoID0gKHIgPT0gbWluUkdCKSA/IDMgOiAoKGIgPT0gbWluUkdCKSA/IDEgOiA1KTtcblxuXHRcdGggPSBNYXRoLnJvdW5kKDYwICogKGhoIC0gZGQgLyAobWF4UkdCIC0gbWluUkdCKSkpO1xuXHRcdHMgPSBNYXRoLnJvdW5kKChtYXhSR0IgLSBtaW5SR0IpIC8gbWF4UkdCICogMTAwLjApO1xuXHRcdHYgPSBNYXRoLnJvdW5kKG1heFJHQiAqIDEwMC4wKTtcblxuXHRcdHJldHVybiBbaCwgcywgdl07XG5cdH0sXG5cblx0UkdCMkhFWDogZnVuY3Rpb24gKHIsIGcsIGIpIHtcblx0XHRyZXR1cm4gXCIjXCIgKyAoKDEgPDwgMjQpICsgKHIgPDwgMTYpICsgKGcgPDwgOCkgKyBiKS50b1N0cmluZygxNikuc2xpY2UoMSk7XG5cdH0sXG5cblx0UkdCZnYySEVYOiBmdW5jdGlvbiAociwgZywgYikge1xuXHRcdHJldHVybiBDb2xvclV0aWwuUkdCMkhFWChNYXRoLmZsb29yKHIgKiAyNTUuMCksXG5cdFx0XHRNYXRoLmZsb29yKGcgKiAyNTUuMCksXG5cdFx0XHRNYXRoLmZsb29yKGIgKiAyNTUuMCkpO1xuXHR9LFxuXG5cdEhTVjJIRVg6IGZ1bmN0aW9uIChoLCBzLCB2KSB7XG5cdFx0dmFyIHJnYiA9IENvbnRyb2xLaXQuQ29sb3JVdGlsLkhTVjJSR0IoaCwgcywgdik7XG5cdFx0cmV0dXJuIENvbnRyb2xLaXQuQ29sb3JVdGlsLlJHQjJIRVgocmdiWzBdLCByZ2JbMV0sIHJnYlsyXSk7XG5cdH0sXG5cblx0SEVYMlJHQjogZnVuY3Rpb24gKGhleCkge1xuXHRcdHZhciBzaG9ydGhhbmRSZWdleCA9IC9eIz8oW2EtZlxcZF0pKFthLWZcXGRdKShbYS1mXFxkXSkkL2k7XG5cdFx0aGV4ID0gaGV4LnJlcGxhY2Uoc2hvcnRoYW5kUmVnZXgsIGZ1bmN0aW9uIChtLCByLCBnLCBiKSB7XG5cdFx0XHRyZXR1cm4gciArIHIgKyBnICsgZyArIGIgKyBiO1xuXHRcdH0pO1xuXG5cdFx0dmFyIHJlc3VsdCA9IC9eIz8oW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkkL2kuZXhlYyhoZXgpO1xuXHRcdHJldHVybiByZXN1bHQgPyBbcGFyc2VJbnQocmVzdWx0WzFdLCAxNiksIHBhcnNlSW50KHJlc3VsdFsyXSwgMTYpLCBwYXJzZUludChyZXN1bHRbM10sIDE2KV0gOiBudWxsO1xuXG5cdH0sXG5cblx0aXNWYWxpZEhFWDogZnVuY3Rpb24gKGhleCkge1xuXHRcdHJldHVybiAvXiNbMC05QS1GXXs2fSQvaS50ZXN0KGhleCk7XG5cdH0sXG5cblx0aXNWYWxpZFJHQjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcblx0XHRyZXR1cm4gciA+PSAwICYmIHIgPD0gMjU1ICYmXG5cdFx0XHRnID49IDAgJiYgZyA8PSAyNTUgJiZcblx0XHRcdGIgPj0gMCAmJiBiIDw9IDI1NTtcblx0fSxcblxuXHRpc1ZhbGlkUkdCZnY6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG5cdFx0cmV0dXJuIHIgPj0gMCAmJiByIDw9IDEuMCAmJlxuXHRcdFx0ZyA+PSAwICYmIGcgPD0gMS4wICYmXG5cdFx0XHRiID49IDAgJiYgYiA8PSAxLjA7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sb3JVdGlsOyIsInZhciBDU1MgPSB7XG4gICAgQ29udHJvbEtpdCAgIDogJ2NvbnRyb2xLaXQnLFxuXG4gICAgUGFuZWwgICAgICAgIDogJ3BhbmVsJyxcbiAgICBIZWFkICAgICAgICAgOiAnaGVhZCcsXG4gICAgTGFiZWwgICAgICAgIDogJ2xhYmVsJyxcbiAgICBNZW51ICAgICAgICAgOiAnbWVudScsXG4gICAgV3JhcCAgICAgICAgIDogJ3dyYXAnLFxuXG4gICAgTWVudUJ0bkNsb3NlIDogJ2J0bkNsb3NlJyxcbiAgICBNZW51QnRuSGlkZSAgOiAnYnRuSGlkZScsXG4gICAgTWVudUJ0blNob3cgIDogJ2J0blNob3cnLFxuICAgIE1lbnVCdG5VbmRvICA6ICdidG5VbmRvJyxcblxuICAgIFdyYXBJbnB1dFdQcmVzZXQgOiAnaW5wdXRXUHJlc2V0V3JhcCcsXG4gICAgV3JhcENvbG9yV1ByZXNldCA6ICdjb2xvcldQcmVzZXRXcmFwJyxcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICBIZWFkSW5hY3RpdmUgOiAnaGVhZEluYWN0aXZlJyxcbiAgICBQYW5lbEhlYWRJbmFjdGl2ZSA6ICdwYW5lbEhlYWRJbmFjdGl2ZScsXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgR3JvdXBMaXN0IDogJ2dyb3VwTGlzdCcsXG4gICAgR3JvdXAgICAgIDogJ2dyb3VwJyxcbiAgICBTdWJHcm91cExpc3QgIDogJ3N1Ykdyb3VwTGlzdCcsXG4gICAgU3ViR3JvdXAgICAgICA6ICdzdWJHcm91cCcsXG5cblxuICAgIFRleHRBcmVhV3JhcCA6ICd0ZXh0QXJlYVdyYXAnLFxuXG4gICAgSWNvbkFycm93VXBCaWcgOiAnaWNvbkFycm93VXBCaWcnLFxuXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgQnV0dG9uICAgICAgIDogJ2J1dHRvbicsXG5cbiAgICBXcmFwU2xpZGVyICAgOiAnd3JhcFNsaWRlcicsXG5cbiAgICBTbGlkZXJXcmFwICAgOiAnc2xpZGVyV3JhcCcsXG4gICAgU2xpZGVyU2xvdCAgIDogJ3NsaWRlclNsb3QnLFxuICAgIFNsaWRlckhhbmRsZSA6ICdzbGlkZXJIYW5kbGUnLFxuXG4gICAgQXJyb3dCTWluICAgIDogJ2Fycm93Qk1pbicsXG4gICAgQXJyb3dCTWF4ICAgIDogJ2Fycm93Qk1heCcsXG4gICAgQXJyb3dCU3ViTWluIDogJ2Fycm93QlN1Yk1pbicsXG4gICAgQXJyb3dCU3ViTWF4IDogJ2Fycm93QlN1Yk1heCcsXG4gICAgQXJyb3dTTWluICAgIDogJ2Fycm93U01pbicsXG4gICAgQXJyb3dTTWF4ICAgIDogJ2Fycm93U01heCcsXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgU2VsZWN0ICAgICAgIDogJ3NlbGVjdCcsXG4gICAgU2VsZWN0QWN0aXZlIDogJ3NlbGVjdEFjdGl2ZScsXG5cbiAgICBPcHRpb25zICAgICAgICAgOiAnb3B0aW9ucycsXG4gICAgT3B0aW9uc1NlbGVjdGVkIDogJ2xpU2VsZWN0ZWQnLFxuXG5cbiAgICBTZWxlY3RDb2xvciA6ICdzZWxlY3RDb2xvcicsXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgUHJlc2V0QnRuICAgICAgICA6ICdwcmVzZXRCdG4nLFxuICAgIFByZXNldEJ0bkFjdGl2ZSAgOiAncHJlc2V0QnRuQWN0aXZlJyxcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICBDYW52YXNMaXN0SXRlbSAgOiAnY2FudmFzTGlzdEl0ZW0nLFxuICAgIENhbnZhc1dyYXAgICAgICA6ICdjYW52YXNXcmFwJyxcblxuICAgIFNWR0xpc3RJdGVtICAgICA6ICdzdmdMaXN0SXRlbScsXG4gICAgU1ZHV3JhcCAgICAgICAgIDogJ3N2Z1dyYXAnLFxuXG4gICAgR3JhcGhTbGlkZXJYV3JhcCAgIDogJ2dyYXBoU2xpZGVyWFdyYXAnLFxuICAgIEdyYXBoU2xpZGVyWVdyYXAgICA6ICdncmFwaFNsaWRlcllXcmFwJyxcbiAgICBHcmFwaFNsaWRlclggICAgICAgOiAnZ3JhcGhTbGlkZXJYJyxcbiAgICBHcmFwaFNsaWRlclkgICAgICAgOiAnZ3JhcGhTbGlkZXJZJyxcbiAgICBHcmFwaFNsaWRlclhIYW5kbGUgOiAnZ3JhcGhTbGlkZXJYSGFuZGxlJyxcbiAgICBHcmFwaFNsaWRlcllIYW5kbGUgOiAnZ3JhcGhTbGlkZXJZSGFuZGxlJyxcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICBQaWNrZXIgICAgICAgICAgICAgIDogJ3BpY2tlcicsXG4gICAgUGlja2VyUGFsbGV0ZVdyYXAgICA6ICdwYWxsZXRlV3JhcCcsXG4gICAgUGlja2VyRmllbGRXcmFwICAgICA6ICdmaWVsZFdyYXAnLFxuICAgIFBpY2tlcklucHV0V3JhcCAgICAgOiAnaW5wdXRXcmFwJyxcbiAgICBQaWNrZXJJbnB1dEZpZWxkICAgIDogJ2lucHV0RmllbGQnLFxuICAgIFBpY2tlckNvbnRyb2xzV3JhcCAgOiAnY29udHJvbHNXcmFwJyxcbiAgICBQaWNrZXJDb2xvckNvbnRyYXN0IDogJ2NvbG9yQ29udHJhc3QnLFxuXG4gICAgUGlja2VySGFuZGxlRmllbGQgIDogJ2luZGljYXRvcicsXG4gICAgUGlja2VySGFuZGxlU2xpZGVyIDogJ2luZGljYXRvcicsXG5cbiAgICBDb2xvciA6ICdjb2xvcicsXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgU2Nyb2xsQmFyICAgICAgICA6ICdzY3JvbGxCYXInLFxuICAgIFNjcm9sbFdyYXAgICAgICAgOiAnc2Nyb2xsV3JhcCcsXG4gICAgU2Nyb2xsYmFyQnRuVXAgICA6ICdidG5VcCcsXG4gICAgU2Nyb2xsYmFyQnRuRG93biA6ICdidG5Eb3duJyxcbiAgICBTY3JvbGxiYXJUcmFjayAgIDogJ3RyYWNrJyxcbiAgICBTY3JvbGxiYXJUaHVtYiAgIDogJ3RodW1iJyxcbiAgICBTY3JvbGxCdWZmZXIgICAgIDogJ3Njcm9sbEJ1ZmZlcicsXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgVHJpZ2dlciA6ICdjb250cm9sS2l0VHJpZ2dlcicsXG5cbiAgICBTaXplSGFuZGxlIDogJ3NpemVIYW5kbGUnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENTUztcbiIsInZhciBEb2N1bWVudEV2ZW50ID0ge1xuICAgIE1PVVNFX01PVkUgOiAnbW91c2Vtb3ZlJyxcbiAgICBNT1VTRV9VUCAgIDogJ21vdXNldXAnLFxuICAgIE1PVVNFX0RPV04gOiAnbW91c2Vkb3duJyxcblxuICAgIFdJTkRPV19SRVNJWkUgOiAncmVzaXplJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudEV2ZW50OyIsInZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi9Eb2N1bWVudEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIE1vdXNlKCkge1xuICAgIHRoaXMuX3BvcyA9IFswLCAwXTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25Eb2N1bWVudE1vdXNlTW92ZS5iaW5kKHRoaXMpKTtcbn1cblxuTW91c2UuX2luc3RhbmNlID0gbnVsbDtcblxuTW91c2UucHJvdG90eXBlLl9vbkRvY3VtZW50TW91c2VNb3ZlID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgZHggPSAwLFxuICAgICAgICBkeSA9IDA7XG5cbiAgICBpZiAoIWUpZSA9IHdpbmRvdy5ldmVudDtcbiAgICBpZiAoZS5wYWdlWCkge1xuICAgICAgICBkeCA9IGUucGFnZVg7XG4gICAgICAgIGR5ID0gZS5wYWdlWTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZS5jbGllbnRYKSB7XG4gICAgICAgIGR4ID0gZS5jbGllbnRYICsgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0ICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XG4gICAgICAgIGR5ID0gZS5jbGllbnRZICsgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AgKyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuICAgIH1cbiAgICB0aGlzLl9wb3NbMF0gPSBkeDtcbiAgICB0aGlzLl9wb3NbMV0gPSBkeTtcbn07XG5cbk1vdXNlLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcG9zO1xufTtcblxuTW91c2UucHJvdG90eXBlLmdldFggPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvc1swXTtcbn07XG5cbk1vdXNlLnByb3RvdHlwZS5nZXRZID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9wb3NbMV07XG59O1xuXG5Nb3VzZS5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZihNb3VzZS5faW5zdGFuY2Upe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIE1vdXNlLl9pbnN0YW5jZSA9IG5ldyBNb3VzZSgpO1xufTtcblxuTW91c2UuZ2V0SW5zdGFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE1vdXNlLl9pbnN0YW5jZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW91c2U7IiwiZnVuY3Rpb24gTm9kZSgpIHtcbiAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcblxuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCl7XG4gICAgICAgIGNhc2UgMSA6XG4gICAgICAgICAgICB2YXIgYXJnID0gYXJndW1lbnRzWzBdO1xuICAgICAgICAgICAgaWYgKGFyZyAhPSBOb2RlLklOUFVUX1RFWFQgJiZcbiAgICAgICAgICAgICAgICBhcmcgIT0gTm9kZS5JTlBVVF9CVVRUT04gJiZcbiAgICAgICAgICAgICAgICBhcmcgIT0gTm9kZS5JTlBVVF9TRUxFQ1QgJiZcbiAgICAgICAgICAgICAgICBhcmcgIT0gTm9kZS5JTlBVVF9DSEVDS0JPWCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGFyZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbGVtZW50LnR5cGUgPSBhcmc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgdGhpcy5fZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxufVxuXG5Ob2RlLkRJViA9ICdkaXYnO1xuTm9kZS5JTlBVVF9URVhUID0gJyc7XG5Ob2RlLklOUFVUX1RFWFQgPSAndGV4dCc7XG5Ob2RlLklOUFVUX0JVVFRPTiA9ICdidXR0b24nO1xuTm9kZS5JTlBVVF9TRUxFQ1QgPSAnc2VsZWN0Jztcbk5vZGUuSU5QVVRfQ0hFQ0tCT1ggPSAnY2hlY2tib3gnO1xuTm9kZS5PUFRJT04gPSAnb3B0aW9uJztcbk5vZGUuTElTVCA9ICd1bCc7XG5Ob2RlLkxJU1RfSVRFTSA9ICdsaSc7XG5Ob2RlLlNQQU4gPSAnc3Bhbic7XG5Ob2RlLlRFWFRBUkVBID0gJ3RleHRhcmVhJztcblxuTm9kZS5wcm90b3R5cGUgPSB7XG4gICAgYWRkQ2hpbGQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuYXBwZW5kQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuXG4gICAgYWRkQ2hpbGRyZW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGkgPSAtMSwgbCA9IGFyZ3VtZW50cy5sZW5ndGgsIGUgPSB0aGlzLl9lbGVtZW50O1xuICAgICAgICB3aGlsZSAoKytpIDwgbCkge1xuICAgICAgICAgICAgZS5hcHBlbmRDaGlsZChhcmd1bWVudHNbaV0uZ2V0RWxlbWVudCgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgYWRkQ2hpbGRBdDogZnVuY3Rpb24gKG5vZGUsIGluZGV4KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuaW5zZXJ0QmVmb3JlKG5vZGUuZ2V0RWxlbWVudCgpLCB0aGlzLl9lbGVtZW50LmNoaWxkcmVuW2luZGV4XSk7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG5cbiAgICByZW1vdmVDaGlsZDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5zKG5vZGUpKXJldHVybiBudWxsO1xuICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUNoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcblxuICAgIHJlbW92ZUNoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpID0gLTEsIGwgPSBhcmd1bWVudHMubGVuZ3RoLCBlID0gdGhpcy5fZWxlbWVudDtcbiAgICAgICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgICAgIGUucmVtb3ZlQ2hpbGQoYXJndW1lbnRzW2ldLmdldEVsZW1lbnQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHJlbW92ZUNoaWxkQXQ6IGZ1bmN0aW9uIChub2RlLCBpbmRleCkge1xuICAgICAgICBpZiAoIXRoaXMuY29udGFpbnMobm9kZSkpcmV0dXJuIG51bGw7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQucmVtb3ZlQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlQWxsQ2hpbGRyZW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuICAgICAgICB3aGlsZSAoZWxlbWVudC5oYXNDaGlsZE5vZGVzKCkpZWxlbWVudC5yZW1vdmVDaGlsZChlbGVtZW50Lmxhc3RDaGlsZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBzZXRXaWR0aDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUud2lkdGggPSB2YWx1ZSArICdweCc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZ2V0V2lkdGg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0V2lkdGg7XG4gICAgfSxcblxuICAgIHNldEhlaWdodDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gdmFsdWUgKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldEhlaWdodDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRIZWlnaHQ7XG4gICAgfSxcblxuICAgIHNldFBvc2l0aW9uOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRQb3NpdGlvbih4KS5zZXRQb3NpdGlvbih5KTtcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uWDogZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5tYXJnaW5MZWZ0ID0geCArICdweCc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc2V0UG9zaXRpb25ZOiBmdW5jdGlvbiAoeSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLm1hcmdpblRvcCA9IHkgKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc2V0UG9zaXRpb25HbG9iYWw6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldFBvc2l0aW9uR2xvYmFsWCh4KS5zZXRQb3NpdGlvbkdsb2JhbFkoeSk7XG4gICAgfSxcbiAgICBzZXRQb3NpdGlvbkdsb2JhbFg6IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUubGVmdCA9IHggKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uR2xvYmFsWTogZnVuY3Rpb24gKHkpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS50b3AgPSB5ICsgJ3B4JztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGdldFBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbdGhpcy5nZXRQb3NpdGlvblgoKSwgdGhpcy5nZXRQb3NpdGlvblkoKV07XG4gICAgfSxcbiAgICBnZXRQb3NpdGlvblg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICB9LFxuICAgIGdldFBvc2l0aW9uWTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgfSxcblxuICAgIGdldFBvc2l0aW9uR2xvYmFsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSBbMCwgMF0sXG4gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcblxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICAgICAgb2Zmc2V0WzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgICAgIG9mZnNldFsxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgfSxcblxuICAgIGdldFBvc2l0aW9uR2xvYmFsWDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gMCxcbiAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuXG4gICAgICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgICAgICBvZmZzZXQgKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG9mZnNldDtcbiAgICB9LFxuXG4gICAgZ2V0UG9zaXRpb25HbG9iYWxZOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSAwLFxuICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XG5cbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIG9mZnNldCArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgfSxcblxuICAgIGFkZEV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc2V0U3R5bGVDbGFzczogZnVuY3Rpb24gKHN0eWxlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuY2xhc3NOYW1lID0gc3R5bGU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc2V0U3R5bGVQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldFN0eWxlUHJvcGVydHk6IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV07XG4gICAgfSxcbiAgICBzZXRTdHlsZVByb3BlcnRpZXM6IGZ1bmN0aW9uIChwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGZvciAodmFyIHAgaW4gcHJvcGVydGllcyl0aGlzLl9lbGVtZW50LnN0eWxlW3BdID0gcHJvcGVydGllc1twXTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGRlbGV0ZVN0eWxlQ2xhc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5jbGFzc05hbWUgPSAnJztcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICB9LFxuICAgIGRlbGV0ZVN0eWxlUHJvcGVydHk6IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW3Byb3BlcnR5XSA9ICcnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGRlbGV0ZVN0eWxlUHJvcGVydGllczogZnVuY3Rpb24gKHByb3BlcnRpZXMpIHtcbiAgICAgICAgZm9yICh2YXIgcCBpbiBwcm9wZXJ0aWVzKXRoaXMuX2VsZW1lbnQuc3R5bGVbcF0gPSAnJztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGdldENoaWxkQXQ6IGZ1bmN0aW9uIChpbmRleCkge1xuICAgICAgICByZXR1cm4gbmV3IE5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQuY2hpbGRyZW5baW5kZXhdKTtcbiAgICB9LFxuICAgIGdldENoaWxkSW5kZXg6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleE9mKHRoaXMuX2VsZW1lbnQsIG5vZGUuZ2V0RWxlbWVudCgpKTtcbiAgICB9LFxuICAgIGdldE51bUNoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50LmNoaWxkcmVuLmxlbmd0aDtcbiAgICB9LFxuICAgIGdldEZpcnN0Q2hpbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudCh0aGlzLl9lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgIH0sXG4gICAgZ2V0TGFzdENoaWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5sYXN0Q2hpbGQpO1xuICAgIH0sXG4gICAgaGFzQ2hpbGRyZW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoICE9IDA7XG4gICAgfSxcbiAgICBjb250YWluczogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4T2YodGhpcy5fZWxlbWVudCwgbm9kZS5nZXRFbGVtZW50KCkpICE9IC0xO1xuICAgIH0sXG5cbiAgICBfaW5kZXhPZjogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQsIGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwocGFyZW50RWxlbWVudC5jaGlsZHJlbiwgZWxlbWVudCk7XG4gICAgfSxcblxuICAgIHNldFByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHksIHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnRbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc2V0UHJvcGVydGllczogZnVuY3Rpb24gKHByb3BlcnRpZXMpIHtcbiAgICAgICAgZm9yICh2YXIgcCBpbiBwcm9wZXJ0aWVzKXRoaXMuX2VsZW1lbnRbcF0gPSBwcm9wZXJ0aWVzW3BdO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldFByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnRbcHJvcGVydHldO1xuICAgIH0sXG5cblxuICAgIHNldEVsZW1lbnQ6IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldEVsZW1lbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQ7XG4gICAgfSxcblxuICAgIGdldFN0eWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50LnN0eWxlO1xuICAgIH0sXG5cbiAgICBnZXRQYXJlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudCh0aGlzLl9lbGVtZW50LnBhcmVudE5vZGUpO1xuICAgIH1cbn07XG5cbk5vZGUuZ2V0Tm9kZUJ5RWxlbWVudCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudChlbGVtZW50KTtcbn07XG5Ob2RlLmdldE5vZGVCeUlkID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb2RlO1xuXG4vL0NvbnRyb2xLaXQuTm9kZSA9IGZ1bmN0aW9uKClcbi8ve1xuLy8gICAgdGhpcy5fZWxlbWVudCA9IG51bGw7XG4vL1xuLy8gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAxKVxuLy8gICAge1xuLy8gICAgICAgIHZhciBhcmcgID0gYXJndW1lbnRzWzBdO1xuLy9cbi8vICAgICAgICBpZihhcmcgIT0gQ29udHJvbEtpdC5Ob2RlVHlwZS5JTlBVVF9URVhUICAgJiZcbi8vICAgICAgICAgICBhcmcgIT0gQ29udHJvbEtpdC5Ob2RlVHlwZS5JTlBVVF9CVVRUT04gJiZcbi8vICAgICAgICAgICBhcmcgIT0gQ29udHJvbEtpdC5Ob2RlVHlwZS5JTlBVVF9TRUxFQ1QgJiZcbi8vICAgICAgICAgICBhcmcgIT0gQ29udHJvbEtpdC5Ob2RlVHlwZS5JTlBVVF9DSEVDS0JPWClcbi8vICAgICAgICB7XG4vLyAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGFyZyk7XG4vLyAgICAgICAgfVxuLy8gICAgICAgIGVsc2Vcbi8vICAgICAgICB7XG4vLyAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuLy8gICAgICAgICAgICB0aGlzLl9lbGVtZW50LnR5cGUgPSBhcmc7XG4vLyAgICAgICAgfVxuLy8gICAgfVxuLy99O1xuLy9cbi8vQ29udHJvbEtpdC5Ob2RlLnByb3RvdHlwZSA9XG4vL3tcbi8vICAgIGFkZENoaWxkICAgOiBmdW5jdGlvbihub2RlKVxuLy8gICAge1xuLy8gICAgICAgIHRoaXMuX2VsZW1lbnQuYXBwZW5kQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xuLy8gICAgICAgIHJldHVybiBub2RlO1xuLy8gICAgfSxcbi8vXG4vLyAgICBhZGRDaGlsZHJlbiA6IGZ1bmN0aW9uKClcbi8vICAgIHtcbi8vICAgICAgICB2YXIgaSA9IC0xLGwgPSBhcmd1bWVudHMubGVuZ3RoLGUgPSB0aGlzLl9lbGVtZW50O1xuLy8gICAgICAgIHdoaWxlKCsraSA8IGwpe2UuYXBwZW5kQ2hpbGQoYXJndW1lbnRzW2ldLmdldEVsZW1lbnQoKSk7fVxuLy8gICAgICAgIHJldHVybiB0aGlzO1xuLy8gICAgfSxcbi8vXG4vLyAgICBhZGRDaGlsZEF0IDogZnVuY3Rpb24obm9kZSxpbmRleClcbi8vICAgIHtcbi8vICAgICAgICB0aGlzLl9lbGVtZW50Lmluc2VydEJlZm9yZShub2RlLmdldEVsZW1lbnQoKSx0aGlzLl9lbGVtZW50LmNoaWxkcmVuW2luZGV4XSk7XG4vLyAgICAgICAgcmV0dXJuIG5vZGU7XG4vLyAgICB9LFxuLy9cbi8vICAgIHJlbW92ZUNoaWxkIDogZnVuY3Rpb24obm9kZSlcbi8vICAgIHtcbi8vICAgICAgICBpZighdGhpcy5jb250YWlucyhub2RlKSlyZXR1cm4gbnVsbDtcbi8vICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUNoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbi8vICAgICAgICByZXR1cm4gbm9kZTtcbi8vICAgIH0sXG4vL1xuLy8gICAgcmVtb3ZlQ2hpbGRyZW4gOiBmdW5jdGlvbigpXG4vLyAgICB7XG4vLyAgICAgICAgdmFyIGkgPSAtMSwgbCA9IGFyZ3VtZW50cy5sZW5ndGgsIGUgPSB0aGlzLl9lbGVtZW50O1xuLy8gICAgICAgIHdoaWxlKCsraTxsKXtlLnJlbW92ZUNoaWxkKGFyZ3VtZW50c1tpXS5nZXRFbGVtZW50KCkpO31cbi8vICAgICAgICByZXR1cm4gdGhpcztcbi8vICAgIH0sXG4vL1xuLy8gICAgcmVtb3ZlQ2hpbGRBdCA6IGZ1bmN0aW9uKG5vZGUsaW5kZXgpXG4vLyAgICB7XG4vLyAgICAgICAgaWYoIXRoaXMuY29udGFpbnMobm9kZSkpcmV0dXJuIG51bGw7XG4vLyAgICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVDaGlsZChub2RlLmdldEVsZW1lbnQoKSk7XG4vLyAgICAgICAgcmV0dXJuIG5vZGU7XG4vLyAgICB9LFxuLy9cbi8vICAgIHJlbW92ZUFsbENoaWxkcmVuIDogZnVuY3Rpb24oKVxuLy8gICAge1xuLy8gICAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcbi8vICAgICAgICB3aGlsZShlbGVtZW50Lmhhc0NoaWxkTm9kZXMoKSllbGVtZW50LnJlbW92ZUNoaWxkKGVsZW1lbnQubGFzdENoaWxkKTtcbi8vICAgICAgICByZXR1cm4gdGhpcztcbi8vICAgIH0sXG4vL1xuLy8gICAgc2V0V2lkdGggIDogZnVuY3Rpb24odmFsdWUpe3RoaXMuX2VsZW1lbnQuc3R5bGUud2lkdGggPSB2YWx1ZSArICdweCc7IHJldHVybiB0aGlzO30sXG4vLyAgICBnZXRXaWR0aCAgOiBmdW5jdGlvbigpICAgICB7cmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0V2lkdGg7fSxcbi8vXG4vLyAgICBzZXRIZWlnaHQgOiBmdW5jdGlvbih2YWx1ZSl7dGhpcy5fZWxlbWVudC5zdHlsZS5oZWlnaHQgPSB2YWx1ZSArICdweCc7IHJldHVybiB0aGlzO30sXG4vLyAgICBnZXRIZWlnaHQgOiBmdW5jdGlvbigpICAgICB7cmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0SGVpZ2h0O30sXG4vL1xuLy8gICAgc2V0UG9zaXRpb24gIDogZnVuY3Rpb24oeCx5KXsgcmV0dXJuIHRoaXMuc2V0UG9zaXRpb24oeCkuc2V0UG9zaXRpb24oeSk7fSxcbi8vICAgIHNldFBvc2l0aW9uWCA6IGZ1bmN0aW9uKHgpICB7dGhpcy5fZWxlbWVudC5zdHlsZS5tYXJnaW5MZWZ0ID0geCArICdweCc7cmV0dXJuIHRoaXM7fSxcbi8vICAgIHNldFBvc2l0aW9uWSA6IGZ1bmN0aW9uKHkpICB7dGhpcy5fZWxlbWVudC5zdHlsZS5tYXJnaW5Ub3AgID0geSArICdweCc7cmV0dXJuIHRoaXM7fSxcbi8vXG4vLyAgICBzZXRQb3NpdGlvbkdsb2JhbCAgOiBmdW5jdGlvbih4LHkpe3JldHVybiB0aGlzLnNldFBvc2l0aW9uR2xvYmFsWCh4KS5zZXRQb3NpdGlvbkdsb2JhbFkoeSk7fSxcbi8vICAgIHNldFBvc2l0aW9uR2xvYmFsWCA6IGZ1bmN0aW9uKHgpICB7dGhpcy5fZWxlbWVudC5zdHlsZS5sZWZ0ID0geCArICdweCc7cmV0dXJuIHRoaXM7fSxcbi8vICAgIHNldFBvc2l0aW9uR2xvYmFsWSA6IGZ1bmN0aW9uKHkpICB7dGhpcy5fZWxlbWVudC5zdHlsZS50b3AgID0geSArICdweCc7cmV0dXJuIHRoaXM7fSxcbi8vXG4vLyAgICBnZXRQb3NpdGlvbiAgOiBmdW5jdGlvbigpe3JldHVybiBbdGhpcy5nZXRQb3NpdGlvblgoKSx0aGlzLmdldFBvc2l0aW9uWSgpXTt9LFxuLy8gICAgZ2V0UG9zaXRpb25YIDogZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRMZWZ0O30sXG4vLyAgICBnZXRQb3NpdGlvblkgOiBmdW5jdGlvbigpe3JldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldFRvcDt9LFxuLy9cbi8vICAgIGdldFBvc2l0aW9uR2xvYmFsIDogZnVuY3Rpb24oKVxuLy8gICAge1xuLy8gICAgICAgIHZhciBvZmZzZXQgID0gWzAsMF0sXG4vLyAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuLy9cbi8vICAgICAgICB3aGlsZShlbGVtZW50KVxuLy8gICAgICAgIHtcbi8vICAgICAgICAgICAgb2Zmc2V0WzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbi8vICAgICAgICAgICAgb2Zmc2V0WzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuLy8gICAgICAgICAgICBlbGVtZW50ICAgID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4vLyAgICAgICAgfVxuLy9cbi8vICAgICAgICByZXR1cm4gb2Zmc2V0O1xuLy8gICAgfSxcbi8vXG4vLyAgICBnZXRQb3NpdGlvbkdsb2JhbFggOiBmdW5jdGlvbigpXG4vLyAgICB7XG4vLyAgICAgICAgdmFyIG9mZnNldCAgPSAwLFxuLy8gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcbi8vXG4vLyAgICAgICAgd2hpbGUoZWxlbWVudClcbi8vICAgICAgICB7XG4vLyAgICAgICAgICAgIG9mZnNldCArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4vLyAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbi8vICAgICAgICB9XG4vL1xuLy8gICAgICAgIHJldHVybiBvZmZzZXQ7XG4vLyAgICB9LFxuLy9cbi8vICAgIGdldFBvc2l0aW9uR2xvYmFsWSA6IGZ1bmN0aW9uKClcbi8vICAgIHtcbi8vICAgICAgICB2YXIgb2Zmc2V0ICA9IDAsXG4vLyAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuLy9cbi8vICAgICAgICB3aGlsZShlbGVtZW50KVxuLy8gICAgICAgIHtcbi8vICAgICAgICAgICAgb2Zmc2V0ICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuLy8gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4vLyAgICAgICAgfVxuLy9cbi8vICAgICAgICByZXR1cm4gb2Zmc2V0O1xuLy8gICAgfSxcbi8vXG4vLyAgICBhZGRFdmVudExpc3RlbmVyICAgIDogZnVuY3Rpb24odHlwZSxsaXN0ZW5lcix1c2VDYXB0dXJlKXt0aGlzLl9lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoICAgdHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpOyByZXR1cm4gdGhpczt9LFxuLy8gICAgcmVtb3ZlRXZlbnRMaXN0ZW5lciA6IGZ1bmN0aW9uKHR5cGUsbGlzdGVuZXIsdXNlQ2FwdHVyZSl7dGhpcy5fZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTtyZXR1cm4gdGhpczt9LFxuLy9cbi8vICAgIHNldFN0eWxlQ2xhc3MgICAgICA6IGZ1bmN0aW9uKHN0eWxlKSAgICAgICAgIHt0aGlzLl9lbGVtZW50LmNsYXNzTmFtZSA9IHN0eWxlOyByZXR1cm4gdGhpczt9LFxuLy8gICAgc2V0U3R5bGVQcm9wZXJ0eSAgIDogZnVuY3Rpb24ocHJvcGVydHksdmFsdWUpe3RoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldID0gdmFsdWU7IHJldHVybiB0aGlzO30sXG4vLyAgICBnZXRTdHlsZVByb3BlcnR5ICAgOiBmdW5jdGlvbihwcm9wZXJ0eSkgICAgICB7cmV0dXJuIHRoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldO30sXG4vLyAgICBzZXRTdHlsZVByb3BlcnRpZXMgOiBmdW5jdGlvbihwcm9wZXJ0aWVzKSAgICB7Zm9yKHZhciBwIGluIHByb3BlcnRpZXMpdGhpcy5fZWxlbWVudC5zdHlsZVtwXSA9IHByb3BlcnRpZXNbcF07cmV0dXJuIHRoaXM7fSxcbi8vXG4vLyAgICBkZWxldGVTdHlsZUNsYXNzICAgICAgOiBmdW5jdGlvbigpICAgICAgICAgICB7dGhpcy5fZWxlbWVudC5jbGFzc05hbWUgPSAnJztyZXR1cm4gdGhpc30sXG4vLyAgICBkZWxldGVTdHlsZVByb3BlcnR5ICAgOiBmdW5jdGlvbihwcm9wZXJ0eSkgICB7dGhpcy5fZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV0gPSAnJztyZXR1cm4gdGhpczt9LFxuLy8gICAgZGVsZXRlU3R5bGVQcm9wZXJ0aWVzIDogZnVuY3Rpb24ocHJvcGVydGllcykge2Zvcih2YXIgcCBpbiBwcm9wZXJ0aWVzKXRoaXMuX2VsZW1lbnQuc3R5bGVbcF0gPSAnJztyZXR1cm4gdGhpczt9LFxuLy9cbi8vICAgIGdldENoaWxkQXQgICAgIDogZnVuY3Rpb24oaW5kZXgpIHtyZXR1cm4gbmV3IENvbnRyb2xLaXQuTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5jaGlsZHJlbltpbmRleF0pO30sXG4vLyAgICBnZXRDaGlsZEluZGV4ICA6IGZ1bmN0aW9uKG5vZGUpICB7cmV0dXJuIHRoaXMuX2luZGV4T2YodGhpcy5fZWxlbWVudCxub2RlLmdldEVsZW1lbnQoKSk7fSxcbi8vICAgIGdldE51bUNoaWxkcmVuIDogZnVuY3Rpb24oKSAgICAgIHtyZXR1cm4gdGhpcy5fZWxlbWVudC5jaGlsZHJlbi5sZW5ndGg7fSxcbi8vICAgIGdldEZpcnN0Q2hpbGQgIDogZnVuY3Rpb24oKSAgICAgIHtyZXR1cm4gbmV3IENvbnRyb2xLaXQuTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5maXJzdENoaWxkKTt9LFxuLy8gICAgZ2V0TGFzdENoaWxkICAgOiBmdW5jdGlvbigpICAgICAge3JldHVybiBuZXcgQ29udHJvbEtpdC5Ob2RlKCkuc2V0RWxlbWVudCh0aGlzLl9lbGVtZW50Lmxhc3RDaGlsZCk7fSxcbi8vICAgIGhhc0NoaWxkcmVuICAgIDogZnVuY3Rpb24oKSAgICAgIHtyZXR1cm4gdGhpcy5fZWxlbWVudC5jaGlsZHJlbi5sZW5ndGggIT0gMDt9LFxuLy8gICAgY29udGFpbnMgICAgICAgOiBmdW5jdGlvbihub2RlKSAge3JldHVybiB0aGlzLl9pbmRleE9mKHRoaXMuX2VsZW1lbnQsbm9kZS5nZXRFbGVtZW50KCkpICE9IC0xO30sXG4vL1xuLy8gICAgX2luZGV4T2YgICAgICAgOiBmdW5jdGlvbihwYXJlbnRFbGVtZW50LGVsZW1lbnQpe3JldHVybiBBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHBhcmVudEVsZW1lbnQuY2hpbGRyZW4sZWxlbWVudCk7fSxcbi8vXG4vLyAgICBzZXRQcm9wZXJ0eSAgIDogZnVuY3Rpb24ocHJvcGVydHksIHZhbHVlKXt0aGlzLl9lbGVtZW50W3Byb3BlcnR5XSA9IHZhbHVlO3JldHVybiB0aGlzO30sXG4vLyAgICBzZXRQcm9wZXJ0aWVzIDogZnVuY3Rpb24ocHJvcGVydGllcykgICAgIHtmb3IodmFyIHAgaW4gcHJvcGVydGllcyl0aGlzLl9lbGVtZW50W3BdID0gcHJvcGVydGllc1twXTtyZXR1cm4gdGhpczt9LFxuLy8gICAgZ2V0UHJvcGVydHkgICA6IGZ1bmN0aW9uKHByb3BlcnR5KSAgICAgICB7cmV0dXJuIHRoaXMuX2VsZW1lbnRbcHJvcGVydHldO30sXG4vL1xuLy9cbi8vICAgIHNldEVsZW1lbnQgOiBmdW5jdGlvbihlbGVtZW50KXt0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtyZXR1cm4gdGhpczt9LFxuLy8gICAgZ2V0RWxlbWVudCA6IGZ1bmN0aW9uKCkgICAgICAgeyByZXR1cm4gdGhpcy5fZWxlbWVudDt9LFxuLy9cbi8vICAgIGdldFN0eWxlICAgOiBmdW5jdGlvbigpICAgICAgIHtyZXR1cm4gdGhpcy5fZWxlbWVudC5zdHlsZTt9LFxuLy9cbi8vICAgIGdldFBhcmVudCAgOiBmdW5jdGlvbigpeyByZXR1cm4gbmV3IENvbnRyb2xLaXQuTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5wYXJlbnROb2RlKTsgfVxuLy99O1xuLy9cbi8vQ29udHJvbEtpdC5Ob2RlLmdldE5vZGVCeUVsZW1lbnQgPSBmdW5jdGlvbihlbGVtZW50KXtyZXR1cm4gbmV3IENvbnRyb2xLaXQuTm9kZSgpLnNldEVsZW1lbnQoZWxlbWVudCk7fTtcbi8vQ29udHJvbEtpdC5Ob2RlLmdldE5vZGVCeUlkICAgICAgPSBmdW5jdGlvbihpZCkgICAgIHtyZXR1cm4gbmV3IENvbnRyb2xLaXQuTm9kZSgpLnNldEVsZW1lbnQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpKTt9O1xuLy9cbiIsInZhciBOb2RlRXZlbnQgPSB7XG4gICAgTU9VU0VfRE9XTiAgIDogJ21vdXNlZG93bicsXG4gICAgTU9VU0VfVVAgICAgIDogJ21vdXNldXAnLFxuICAgIE1PVVNFX09WRVIgICA6ICdtb3VzZW92ZXInLFxuICAgIE1PVVNFX01PVkUgICA6ICdtb3VzZW1vdmUnLFxuICAgIE1PVVNFX09VVCAgICA6ICdtb3VzZW91dCcsXG4gICAgS0VZX0RPV04gICAgIDogJ2tleWRvd24nLFxuICAgIEtFWV9VUCAgICAgICA6ICdrZXl1cCcsXG4gICAgQ0hBTkdFICAgICAgIDogJ2NoYW5nZScsXG4gICAgRklOSVNIICAgICAgIDogJ2ZpbmlzaCcsXG4gICAgREJMX0NMSUNLICAgIDogJ2RibGNsaWNrJyxcbiAgICBPTl9DTElDSyAgICAgOiAnY2xpY2snLFxuICAgIFNFTEVDVF9TVEFSVCA6ICdzZWxlY3RzdGFydCcsXG4gICAgRFJBR19TVEFSVCAgIDogJ2RyYWdzdGFydCcsXG4gICAgRFJBRyAgICAgICAgIDogJ2RyYWcnLFxuICAgIERSQUdfRU5EICAgICA6ICdkcmFnZW5kJyxcblxuICAgIERSQUdfRU5URVIgICA6ICdkcmFnZW50ZXInLFxuICAgIERSQUdfT1ZFUiAgICA6ICdkcmFnb3ZlcicsXG4gICAgRFJBR19MRUFWRSAgIDogJ2RyYWdsZWF2ZScsXG5cbiAgICBSRVNJWkUgICAgICAgOiAncmVzaXplJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb2RlRXZlbnQ7IiwidmFyIFN0eWxlID0geyBcblx0c3RyaW5nIDogXCIvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKiBQYW5lbCAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICogQ29tcG9uZW50cyAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICogQ2FudmFzICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi8vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKiBTY3JvbGxCYXIgKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qLy8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqIEdyb3VwICYgc3ViR3JvdXAgKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qLy8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqIE1lbnUgKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qLy8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqIE9wdGlvbnMgKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qLy8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqIFBpY2tlciAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovYm9keSB7ICBtYXJnaW46IDA7ICBwYWRkaW5nOiAwOyB9I2NvbnRyb2xLaXQgeyAgcG9zaXRpb246IGFic29sdXRlOyAgdG9wOiAwOyAgbGVmdDogMDsgIHdpZHRoOiAxMDAlOyAgaGVpZ2h0OiAxMDAlOyAgdXNlci1zZWxlY3Q6IG5vbmU7IH0gICNjb250cm9sS2l0ICogeyAgICBvdXRsaW5lOiAwOyB9ICAjY29udHJvbEtpdCAucGFuZWwgaW5wdXRbdHlwZT0ndGV4dCddLCAgI2NvbnRyb2xLaXQgLnBhbmVsIHRleHRhcmVhLCAgI2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvciwgICNjb250cm9sS2l0IC5waWNrZXIgaW5wdXRbdHlwZT0ndGV4dCddIHsgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGhlaWdodDogMjVweDsgICAgd2lkdGg6IDEwMCU7ICAgIHBhZGRpbmc6IDAgMCAwIDhweDsgICAgZm9udC1mYW1pbHk6IGFyaWFsLCBzYW5zLXNlcmlmOyAgICBmb250LXNpemU6IDExcHg7ICAgIGNvbG9yOiB3aGl0ZTsgICAgdGV4dC1zaGFkb3c6IDFweCAxcHggYmxhY2s7ICAgIGJhY2tncm91bmQ6ICMyMjI3Mjk7ICAgIGJhY2tncm91bmQtaW1hZ2U6IC1vLWxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwJSwgcmdiYSgwLCAwLCAwLCAwLjEyNSkgMTAwJSk7ICAgIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwJSwgcmdiYSgwLCAwLCAwLCAwLjEyNSkgMTAwJSk7ICAgIGJvcmRlcjogbm9uZTsgICAgYm94LXNoYWRvdzogMCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjAxMjUpIGluc2V0LCAwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0OyAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgICAgLXdlYmtpdC11c2VyLXNlbGVjdDogbm9uZTsgICAgLWtodG1sLXVzZXItc2VsZWN0OiBub25lOyAgICAtbW96LXVzZXItc2VsZWN0OiBub25lOyAgICAtby11c2VyLXNlbGVjdDogbm9uZTsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvciB7ICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICB3aWR0aDogMTAwJTsgICAgaGVpZ2h0OiAyNXB4OyAgICBsaW5lLWhlaWdodDogMjVweDsgICAgYmFja2dyb3VuZDogI2ZmZjsgICAgdGV4dC1hbGlnbjogY2VudGVyOyAgICBwYWRkaW5nOiAwOyAgICAtd2Via2l0LXRvdWNoLWNhbGxvdXQ6IG5vbmU7ICAgIC13ZWJraXQtdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1raHRtbC11c2VyLXNlbGVjdDogbm9uZTsgICAgLW1vei11c2VyLXNlbGVjdDogbm9uZTsgICAgLW1zLXVzZXItc2VsZWN0OiBub25lOyAgICB1c2VyLXNlbGVjdDogbm9uZTsgICAgY3Vyc29yOiBwb2ludGVyOyAgICBib3JkZXI6IG5vbmU7ICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCAjMTExMzE0IGluc2V0OyAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24sICAjY29udHJvbEtpdCAucGlja2VyIC5idXR0b24sICAjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdCwgICNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0QWN0aXZlIHsgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIHdpZHRoOiAxMDAlOyAgICBoZWlnaHQ6IDI2cHg7ICAgIG1hcmdpbjogLTJweCAwIDAgMDsgICAgY3Vyc29yOiBwb2ludGVyOyAgICBiYWNrZ3JvdW5kOiAjM2M0OTRlOyAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQocmdiYSgzNCwgMzksIDQxLCAwKSAwJSwgcmdiYSgzNCwgMzksIDQxLCAwLjY1KSAxMDAlKTsgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KHJnYmEoMzQsIDM5LCA0MSwgMCkgMCUsIHJnYmEoMzQsIDM5LCA0MSwgMC42NSkgMTAwJSk7ICAgIGZvbnQtZmFtaWx5OiBhcmlhbCwgc2Fucy1zZXJpZjsgICAgY29sb3I6IHdoaXRlOyAgICBib3JkZXI6IG5vbmU7ICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCAjMTMxMzEzIGluc2V0LCAtMXB4IDJweCAwIDAgIzMyM2E0NCBpbnNldDsgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzYjQ0NDc7ICAgIG91dGxpbmU6IDA7IH0gICNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLCAjY29udHJvbEtpdCAucGlja2VyIC5idXR0b24geyAgICBmb250LXNpemU6IDEwcHg7ICAgIGZvbnQtd2VpZ2h0OiBib2xkOyAgICB0ZXh0LXNoYWRvdzogMCAtMXB4IGJsYWNrOyAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uOmhvdmVyLCAjY29udHJvbEtpdCAucGlja2VyIC5idXR0b246aG92ZXIgeyAgICAgIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b246YWN0aXZlLCAjY29udHJvbEtpdCAucGlja2VyIC5idXR0b246YWN0aXZlIHsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQocmdiYSgwLCAwLCAwLCAwLjEpIDAlLCB0cmFuc3BhcmVudCAxMDAlKTsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQocmdiYSgwLCAwLCAwLCAwLjEpIDAlLCB0cmFuc3BhcmVudCAxMDAlKTsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIHsgICAgcG9zaXRpb246IHJlbGF0aXZlOyAgICB6LWluZGV4OiAxOyAgICBtYXJnaW46IDA7ICAgIHBhZGRpbmc6IDA7ICAgIHdpZHRoOiAzMDBweDsgICAgYmFja2dyb3VuZC1jb2xvcjogIzMwMzYzOTsgICAgYm94LXNoYWRvdzogMCAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjI1KTsgICAgZm9udC1mYW1pbHk6IGFyaWFsLCBzYW5zLXNlcmlmOyAgICAtd2Via2l0LXRvdWNoLWNhbGxvdXQ6IG5vbmU7ICAgIC13ZWJraXQtdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1raHRtbC11c2VyLXNlbGVjdDogbm9uZTsgICAgLW1vei11c2VyLXNlbGVjdDogbm9uZTsgICAgLW1zLXVzZXItc2VsZWN0OiBub25lOyAgICB1c2VyLXNlbGVjdDogbm9uZTsgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgIG92ZXJmbG93OiBoaWRkZW47ICAgIG9wYWNpdHk6IDEuMDsgICAgZmxvYXQ6IGxlZnQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIHRleHRhcmVhIHsgICAgICBwYWRkaW5nOiA1cHggOHB4IDJweCA4cHg7ICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsgICAgICByZXNpemU6IG5vbmU7ICAgICAgdmVydGljYWwtYWxpZ246IHRvcDsgICAgICB3aGl0ZS1zcGFjZTogbm93cmFwOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCBpbnB1dFt0eXBlPSdjaGVja2JveCddIHsgICAgICBtYXJnaW46IDVweCAwIDAgMDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3RBY3RpdmUgeyAgICAgIHBhZGRpbmctbGVmdDogMTBweDsgICAgICBwYWRkaW5nLXJpZ2h0OiAyMHB4OyAgICAgIGZvbnQtc2l6ZTogMTFweDsgICAgICB0ZXh0LWFsaWduOiBsZWZ0OyAgICAgIHRleHQtc2hhZG93OiAxcHggMXB4IGJsYWNrOyAgICAgIGN1cnNvcjogcG9pbnRlcjsgICAgICBvdmVyZmxvdzogaGlkZGVuOyAgICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7ICAgICAgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QgeyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJBQUFBQUxDQVlBQUFCMjRnMDVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBTU5KUkVGVWVOcWNrakVLd2pBVWhqOGw1M0FRNTI2QkhLS0xJaFNsSGtIeEJra3VJRldQSUxRT1FRZDNWNFZ1WGlndUZsckZSUHpoTFhsODMzdUIxMHV6bkNhUCtxNEJFcWxzODNZNUhnaEZ0T0gxYW1rQWl0MitJd2ttelhJR3c1SGVGRnZmWkZOcy9XQTQwbW1XNDcwUDFnZjhMb2tKUkNJVjExdk45YmI0MkM2Ukt2b0RBZGhYL1JYeHFPOEcwRi82RmpCQlFTSVY4K21FMlhUY2FWVHVUT2xPMFEzNmdDbmR5VmJ1L0E1SHA3ZnZ3THltYWVCbnVITklMUW0vd2dEUEFRQVBOSXNIbk83OTRRQUFBQUJKUlU1RXJrSmdnZz09KSAxMDAlIDUwJSBuby1yZXBlYXQsIC1vLWxpbmVhci1ncmFkaWVudCgjM2E0NjRiIDAlLCByZ2JhKDQ0LCA1MiwgNTUsIDApIDEwMCUpOyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJBQUFBQUxDQVlBQUFCMjRnMDVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBTU5KUkVGVWVOcWNrakVLd2pBVWhqOGw1M0FRNTI2QkhLS0xJaFNsSGtIeEJra3VJRldQSUxRT1FRZDNWNFZ1WGlndUZsckZSUHpoTFhsODMzdUIxMHV6bkNhUCtxNEJFcWxzODNZNUhnaEZ0T0gxYW1rQWl0MitJd2ttelhJR3c1SGVGRnZmWkZOcy9XQTQwbW1XNDcwUDFnZjhMb2tKUkNJVjExdk45YmI0MkM2Ukt2b0RBZGhYL1JYeHFPOEcwRi82RmpCQlFTSVY4K21FMlhUY2FWVHVUT2xPMFEzNmdDbmR5VmJ1L0E1SHA3ZnZ3THltYWVCbnVITklMUW0vd2dEUEFRQVBOSXNIbk83OTRRQUFBQUJKUlU1RXJrSmdnZz09KSAxMDAlIDUwJSBuby1yZXBlYXQsIGxpbmVhci1ncmFkaWVudCgjM2E0NjRiIDAlLCByZ2JhKDQ0LCA1MiwgNTUsIDApIDEwMCUpOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0OmhvdmVyLCAjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdEFjdGl2ZSB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQkFBQUFBTENBWUFBQUIyNGcwNUFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFNTkpSRUZVZU5xY2tqRUt3akFVaGo4bDUzQVE1MjZCSEtLTEloU2xIa0h4QmtrdUlGV1BJTFFPUVFkM1Y0VnVYaWd1RmxyRlJQemhMWGw4MzN1QjEwdXpuQ2FQK3E0QkVxbHM4M1k1SGdoRnRPSDFhbWtBaXQyK0l3a216WElHdzVIZUZGdmZaRk5zL1dBNDBtbVc0NzBQMWdmOExva0pSQ0lWMTF2TjliYjQyQzZSS3ZvREFkaFgvUlh4cU84RzBGLzZGakJCUVNJVjgrbUUyWFRjYVZUdVRPbE8wUTM2Z0NuZHlWYnUvQTVIcDdmdndMeW1hZUJudUhOSUxRbS93Z0RQQVFBUE5Jc0huTzc5NFFBQUFBQkpSVTVFcmtKZ2dnPT0pIDEwMCUgNTAlIG5vLXJlcGVhdCwgIzNjNDk0ZTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnByZXNldEJ0biwgI2NvbnRyb2xLaXQgLnBhbmVsIC5wcmVzZXRCdG5BY3RpdmUgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7ICAgICAgcmlnaHQ6IDA7ICAgICAgd2lkdGg6IDIwcHg7ICAgICAgaGVpZ2h0OiAyNXB4OyAgICAgIG1hcmdpbjogMCAwIDAgMDsgICAgICBjdXJzb3I6IHBvaW50ZXI7ICAgICAgZmxvYXQ6IHJpZ2h0OyAgICAgIGJvcmRlcjogbm9uZTsgICAgICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMnB4OyAgICAgIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAycHg7ICAgICAgYm94LXNoYWRvdzogMCAwIDAgMXB4ICMxMzEzMTMgaW5zZXQsIC0xcHggMnB4IDAgMCAjMzIzYTQ0IGluc2V0OyAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjM2I0NDQ3OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAucHJlc2V0QnRuQWN0aXZlLCAjY29udHJvbEtpdCAucGFuZWwgLnByZXNldEJ0bjpob3ZlciB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHNUpSRUZVZU5waTVPRGlhbVJnWUtoandBNGFtVng4Z3hqbUwxckM4UDNyVnhROGIrRVNCaGZmSUFabU5SMjlBNWV2WFdkaVpHQzAxOVhTWkdCZ1lHQll2bVk5dzdJMTZ4b1pHQmdhV0tCRzFTOWJzKzQvQXdORFBRTURBMXlTZ1lHQmdkRW5QQWJaemdZMG1nRXdBRTlsSlQxbHJzZmZBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCwgIzNjNDk0ZTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnByZXNldEJ0biB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHNUpSRUZVZU5waTVPRGlhbVJnWUtoandBNGFtVng4Z3hqbUwxckM4UDNyVnhROGIrRVNCaGZmSUFabU5SMjlBNWV2WFdkaVpHQzAxOVhTWkdCZ1lHQll2bVk5dzdJMTZ4b1pHQmdhV0tCRzFTOWJzKzQvQXdORFBRTURBMXlTZ1lHQmdkRW5QQWJaemdZMG1nRXdBRTlsSlQxbHJzZmZBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCwgLW8tbGluZWFyLWdyYWRpZW50KCMzYTQ2NGIgMCUsICMyYzM0MzcgMTAwJSk7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHNUpSRUZVZU5waTVPRGlhbVJnWUtoandBNGFtVng4Z3hqbUwxckM4UDNyVnhROGIrRVNCaGZmSUFabU5SMjlBNWV2WFdkaVpHQzAxOVhTWkdCZ1lHQll2bVk5dzdJMTZ4b1pHQmdhV0tCRzFTOWJzKzQvQXdORFBRTURBMXlTZ1lHQmdkRW5QQWJaemdZMG1nRXdBRTlsSlQxbHJzZmZBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCwgbGluZWFyLWdyYWRpZW50KCMzYTQ2NGIgMCUsICMyYzM0MzcgMTAwJSk7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zY3JvbGxCYXIgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogY29udGVudC1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBjb250ZW50LWJveDsgICAgICBib3gtc2l6aW5nOiBjb250ZW50LWJveDsgICAgICB3aWR0aDogMTdweDsgICAgICBoZWlnaHQ6IDEwMCU7ICAgICAgZmxvYXQ6IHJpZ2h0OyAgICAgIHRvcDogMDsgICAgICBwYWRkaW5nOiAwOyAgICAgIG1hcmdpbjogMDsgICAgICBwb3NpdGlvbjogcmVsYXRpdmU7ICAgICAgYmFja2dyb3VuZDogIzIxMjYyODsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQodG8gcmlnaHQsICMxNTE4MWEgMCUsIHJnYmEoMjYsIDI5LCAzMSwgMCkgMTAwJSk7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbEJhciAudHJhY2sgeyAgICAgICAgcGFkZGluZzogMCAzcHggMCAycHg7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQmFyIC50cmFjayAudGh1bWIgeyAgICAgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgd2lkdGg6IDEzcHg7ICAgICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgICAgICAgICAgY3Vyc29yOiBwb2ludGVyOyAgICAgICAgICBiYWNrZ3JvdW5kOiAjM2I0ODRlOyAgICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQoIzNhNDE0NSAwJSwgIzM2M2M0MCAxMDAlKTsgICAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KCMzYTQxNDUgMCUsICMzNjNjNDAgMTAwJSk7ICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkICMxNTE4MWE7ICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgICAgIGJveC1zaGFkb3c6IGluc2V0IDAgMXB4IDAgMCAjNDM0YjUwOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAud3JhcCB7ICAgICAgd2lkdGg6IGF1dG87ICAgICAgaGVpZ2h0OiBhdXRvOyAgICAgIG1hcmdpbjogMDsgICAgICBwYWRkaW5nOiAwOyAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsgICAgICBvdmVyZmxvdzogaGlkZGVuOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuaW5wdXRXUHJlc2V0V3JhcCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvcldQcmVzZXRXcmFwIHsgICAgICB3aWR0aDogMTAwJTsgICAgICBmbG9hdDogbGVmdDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmlucHV0V1ByZXNldFdyYXAgaW5wdXRbdHlwZT0ndGV4dCddLCAjY29udHJvbEtpdCAucGFuZWwgLmNvbG9yV1ByZXNldFdyYXAgLmNvbG9yIHsgICAgICBwYWRkaW5nLXJpZ2h0OiAyNXB4OyAgICAgIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiAycHg7ICAgICAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDJweDsgICAgICBmbG9hdDogbGVmdDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnRleHRBcmVhV3JhcCB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIHBhZGRpbmc6IDA7ICAgICAgZmxvYXQ6IGxlZnQ7ICAgICAgaGVpZ2h0OiAxMDAlOyAgICAgIG92ZXJmbG93OiBoaWRkZW47ICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIGJvcmRlcjogbm9uZTsgICAgICBib3gtc2hhZG93OiAwIDAgMXB4IDJweCByZ2JhKDAsIDAsIDAsIDAuMDEyNSkgaW5zZXQsIDAgMCAxcHggMXB4ICMxMTEzMTQgaW5zZXQ7ICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjM2I0NDQ3OyAgICAgIGJhY2tncm91bmQtY29sb3I6ICMyMjI3Mjk7ICAgICAgYm94LXNoYWRvdzogMCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjAxMjUpIGluc2V0LCAwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0OyAgICAgIGJhY2tncm91bmQtaW1hZ2U6IC1vLWxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwJSwgcmdiYSgwLCAwLCAwLCAwLjEyNSkgMTAwJSk7ICAgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KHRyYW5zcGFyZW50IDAlLCByZ2JhKDAsIDAsIDAsIDAuMTI1KSAxMDAlKTsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAudGV4dEFyZWFXcmFwIHRleHRhcmVhIHsgICAgICAgIGJvcmRlcjogbm9uZTsgICAgICAgIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiAwOyAgICAgICAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDA7ICAgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICAgIGJveC1zaGFkb3c6IG5vbmU7ICAgICAgICBiYWNrZ3JvdW5kOiBub25lOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC50ZXh0QXJlYVdyYXAgLnNjcm9sbEJhciB7ICAgICAgICBib3JkZXI6IDFweCBzb2xpZCAjMTAxMjEzOyAgICAgICAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDJweDsgICAgICAgIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiAycHg7ICAgICAgICBib3JkZXItbGVmdDogbm9uZTsgICAgICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4wMTI1KSBpbnNldCwgMCAwIDFweCAxcHggIzExMTMxNCBpbnNldDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWFdyYXAsICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJZV3JhcCB7ICAgICAgcG9zaXRpb246IGFic29sdXRlOyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWFdyYXAgeyAgICAgIGJvdHRvbTogMDsgICAgICBsZWZ0OiAwOyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIHBhZGRpbmc6IDZweCAyMHB4IDZweCA2cHg7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlcllXcmFwIHsgICAgICB0b3A6IDA7ICAgICAgcmlnaHQ6IDA7ICAgICAgaGVpZ2h0OiAxMDAlOyAgICAgIHBhZGRpbmc6IDZweCA2cHggMjBweCA2cHg7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlclgsICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJZIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIGJhY2tncm91bmQ6IHJnYmEoMjQsIDI3LCAyOSwgMC41KTsgICAgICBib3JkZXI6IDFweCBzb2xpZCAjMTgxYjFkOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJYIHsgICAgICBoZWlnaHQ6IDhweDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWSB7ICAgICAgd2lkdGg6IDhweDsgICAgICBoZWlnaHQ6IDEwMCU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlclhIYW5kbGUsICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJZSGFuZGxlIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgY3Vyc29yOiBwb2ludGVyOyAgICAgIGJvcmRlcjogMXB4IHNvbGlkICMxODFiMWQ7ICAgICAgYmFja2dyb3VuZDogIzMwMzYzOTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWEhhbmRsZSB7ICAgICAgd2lkdGg6IDIwcHg7ICAgICAgaGVpZ2h0OiAxMDAlOyAgICAgIGJvcmRlci10b3A6IG5vbmU7ICAgICAgYm9yZGVyLWJvdHRvbTogbm9uZTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWUhhbmRsZSB7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgaGVpZ2h0OiAyMHB4OyAgICAgIGJvcmRlci1sZWZ0OiBub25lOyAgICAgIGJvcmRlci1yaWdodDogbm9uZTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbFdyYXAgeyAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsgICAgICBvdmVyZmxvdzogaGlkZGVuOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQnVmZmVyIHsgICAgICB3aWR0aDogMTAwJTsgICAgICBoZWlnaHQ6IDhweDsgICAgICBib3JkZXItdG9wOiAxcHggc29saWQgIzNiNDQ0NzsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzFlMjIyNDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgY2FudmFzIHsgICAgICBjdXJzb3I6IHBvaW50ZXI7ICAgICAgdmVydGljYWwtYWxpZ246IGJvdHRvbTsgICAgICBib3JkZXI6IG5vbmU7ICAgICAgYm94LXNoYWRvdzogMCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjAxMjUpIGluc2V0LCAwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0OyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnN2Z1dyYXAsICNjb250cm9sS2l0IC5wYW5lbCAuY2FudmFzV3JhcCB7ICAgICAgbWFyZ2luOiA2cHggMCAwIDA7ICAgICAgcG9zaXRpb246IHJlbGF0aXZlOyAgICAgIHdpZHRoOiA3MCU7ICAgICAgZmxvYXQ6IHJpZ2h0OyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3JkZXI6IG5vbmU7ICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIGJhY2tncm91bmQ6ICMxZTIyMjQ7ICAgICAgYmFja2dyb3VuZC1pbWFnZTogLW8tbGluZWFyLWdyYWRpZW50KHRyYW5zcGFyZW50IDAlLCByZ2JhKDAsIDAsIDAsIDAuMDUpIDEwMCUpOyAgICAgIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwJSwgcmdiYSgwLCAwLCAwLCAwLjA1KSAxMDAlKTsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuc3ZnV3JhcCBzdmcsICNjb250cm9sS2l0IC5wYW5lbCAuY2FudmFzV3JhcCBzdmcgeyAgICAgICAgcG9zaXRpb246IGFic29sdXRlOyAgICAgICAgbGVmdDogMDsgICAgICAgIHRvcDogMDsgICAgICAgIGN1cnNvcjogcG9pbnRlcjsgICAgICAgIHZlcnRpY2FsLWFsaWduOiBib3R0b207ICAgICAgICBib3JkZXI6IG5vbmU7ICAgICAgICBib3gtc2hhZG93OiAwIDAgMXB4IDJweCByZ2JhKDAsIDAsIDAsIDAuMDEyNSkgaW5zZXQsIDAgMCAxcHggMXB4ICMxMTEzMTQgaW5zZXQ7ICAgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjM2I0NDQ3OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCB1bCB7ICAgICAgbWFyZ2luOiAwOyAgICAgIHBhZGRpbmc6IDA7ICAgICAgbGlzdC1zdHlsZTogbm9uZTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLmhlYWQgeyAgICAgIGhlaWdodDogMzhweDsgICAgICBib3JkZXItdG9wOiAxcHggc29saWQgIzU2NjE2NjsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzFhMWQxZjsgICAgICBwYWRkaW5nOiAwIDIwcHggMCAxNXB4OyAgICAgIGJhY2tncm91bmQtaW1hZ2U6IC1vLWxpbmVhci1ncmFkaWVudCgjM2M0YTRmIDAlLCAjMzgzZjQ3IDEwMCUpOyAgICAgIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCgjM2M0YTRmIDAlLCAjMzgzZjQ3IDEwMCUpOyAgICAgIGN1cnNvcjogcG9pbnRlcjsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuaGVhZCAubGFiZWwgeyAgICAgICAgZm9udC1zaXplOiAxMnB4OyAgICAgICAgbGluZS1oZWlnaHQ6IDM4cHg7ICAgICAgICBjb2xvcjogd2hpdGU7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLmhlYWQ6aG92ZXIgeyAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogLW8tbGluZWFyLWdyYWRpZW50KCMzYzRhNGYgMCUsICMzYzRhNGYgMTAwJSk7ICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQoIzNjNGE0ZiAwJSwgIzNjNGE0ZiAxMDAlKTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgbGkgeyAgICAgIGhlaWdodDogMzVweDsgICAgICBwYWRkaW5nOiAwIDEwcHggMCAxMHB4OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IHsgICAgICBwYWRkaW5nOiAxMHB4OyAgICAgIGJvcmRlci10b3A6IDFweCBzb2xpZCAjM2I0NDQ3OyAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMWUyMjI0OyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIHsgICAgICAgIHBhZGRpbmc6IDA7ICAgICAgICBtYXJnaW4tdG9wOiA2cHg7ICAgICAgICBoZWlnaHQ6IGF1dG87ICAgICAgICBib3JkZXI6IDFweCBzb2xpZCAjMWUyMjI0OyAgICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgICBib3gtc2hhZG93OiAwIDFweCAwIDAgIzNiNDQ0NzsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIHVsIHsgICAgICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwOmZpcnN0LWNoaWxkIHsgICAgICAgICAgbWFyZ2luLXRvcDogMDsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC5oZWFkIHsgICAgICAgICAgaGVpZ2h0OiAyNnB4OyAgICAgICAgICBwYWRkaW5nOiAwIDEwcHggMCAxMHB4OyAgICAgICAgICBib3JkZXItdG9wOiBub25lOyAgICAgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzFlMjIyNDsgICAgICAgICAgYm9yZGVyLXRvcC1sZWZ0LXJhZGl1czogMnB4OyAgICAgICAgICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMnB4OyAgICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBub25lOyAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMjUyODJiOyAgICAgICAgICBjdXJzb3I6IHBvaW50ZXI7IH0gICAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC5oZWFkOmhvdmVyIHsgICAgICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBub25lOyAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICMyMjI2Mjk7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCBsaTpudGgtY2hpbGQob2RkKSB7ICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICMyOTJkMzA7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCBsaTpudGgtY2hpbGQoZXZlbikgeyAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMzAzNjM5OyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLmhlYWRJbmFjdGl2ZSB7ICAgICAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICBoZWlnaHQ6IDI2cHg7ICAgICAgICAgIHBhZGRpbmc6IDAgMTBweCAwIDEwcHg7ICAgICAgICAgIGJhY2tncm91bmQtaW1hZ2U6IC1vLWxpbmVhci1ncmFkaWVudCgjM2E0MTQ1IDAlLCAjMzYzYzQwIDEwMCUpOyAgICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQoIzNhNDE0NSAwJSwgIzM2M2M0MCAxMDAlKTsgICAgICAgICAgYm94LXNoYWRvdzogMCAxcHggMCAwICM0MzRiNTAgaW5zZXQ7ICAgICAgICAgIGN1cnNvcjogcG9pbnRlcjsgfSAgICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLmhlYWRJbmFjdGl2ZTpob3ZlciB7ICAgICAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogbm9uZTsgICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjM2E0MTQ1OyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLmhlYWQgLmxhYmVsLCAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLmhlYWRJbmFjdGl2ZSAubGFiZWwgeyAgICAgICAgICBtYXJnaW46IDA7ICAgICAgICAgIHBhZGRpbmc6IDA7ICAgICAgICAgIGxpbmUtaGVpZ2h0OiAyNnB4OyAgICAgICAgICBjb2xvcjogd2hpdGU7ICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkOyAgICAgICAgICBmb250LXNpemU6IDExcHg7ICAgICAgICAgIHRleHQtc2hhZG93OiAxcHggMXB4IGJsYWNrOyAgICAgICAgICB0ZXh0LXRyYW5zZm9ybTogY2FwaXRhbGl6ZTsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC5oZWFkIC53cmFwIC5sYWJlbCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC5oZWFkSW5hY3RpdmUgLndyYXAgLmxhYmVsIHsgICAgICAgICAgd2lkdGg6IDEwMCU7ICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkOyAgICAgICAgICBjb2xvcjogd2hpdGU7ICAgICAgICAgIHBhZGRpbmc6IDA7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAud3JhcCAubGFiZWwgeyAgICAgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgaGVpZ2h0OiAxMDAlOyAgICAgICAgICB3aWR0aDogMzAlOyAgICAgICAgICBwYWRkaW5nOiAxMHB4IDVweCAwIDA7ICAgICAgICAgIGZsb2F0OiBsZWZ0OyAgICAgICAgICBmb250LXNpemU6IDExcHg7ICAgICAgICAgIGZvbnQtd2VpZ2h0OiBub3JtYWw7ICAgICAgICAgIGNvbG9yOiAjYWViNWI4OyAgICAgICAgICB0ZXh0LXNoYWRvdzogMXB4IDFweCBibGFjazsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC53cmFwIC53cmFwIHsgICAgICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIHdpZHRoOiA3MCU7ICAgICAgICAgIHBhZGRpbmc6IDZweCAwIDAgMDsgICAgICAgICAgZmxvYXQ6IHJpZ2h0OyAgICAgICAgICBoZWlnaHQ6IDEwMCU7IH0gICAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC53cmFwIC53cmFwIC53cmFwIHsgICAgICAgICAgICB3aWR0aDogMjUlOyAgICAgICAgICAgIHBhZGRpbmc6IDA7ICAgICAgICAgICAgZmxvYXQ6IGxlZnQ7IH0gICAgICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLndyYXAgLndyYXAgLndyYXAgLmxhYmVsIHsgICAgICAgICAgICAgIHdpZHRoOiAxMDAlOyAgICAgICAgICAgICAgcGFkZGluZzogNHB4IDAgMCAwOyAgICAgICAgICAgICAgY29sb3I6ICM4Nzg3ODc7ICAgICAgICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7ICAgICAgICAgICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyAgICAgICAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7ICAgICAgICAgICAgICB0ZXh0LXNoYWRvdzogMXB4IDFweCAjMWExYTFhOyB9ICAgICAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC53cmFwIC53cmFwIC53cmFwIGlucHV0W3R5cGU9J3RleHQnXSB7ICAgICAgICAgICAgICBwYWRkaW5nOiAwOyAgICAgICAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyOyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLndyYXAgeyAgICAgICAgICBiYWNrZ3JvdW5kOiAjMjUyODJiOyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLndyYXAgLndyYXAgeyAgICAgICAgICBiYWNrZ3JvdW5kOiBub25lOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLmhlYWQgLndyYXAsICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5oZWFkSW5hY3RpdmUgLndyYXAgeyAgICAgICAgYmFja2dyb3VuZDogbm9uZTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXA6bGFzdC1jaGlsZCAuc3ViR3JvdXBMaXN0LCAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXA6bGFzdC1jaGlsZCAuc2Nyb2xsQnVmZmVyOm50aC1vZi10eXBlKDMpIHsgICAgICBib3JkZXItYm90dG9tOiBub25lOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cDpsYXN0LWNoaWxkIC5zY3JvbGxXcmFwIC5zdWJHcm91cExpc3QgeyAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMWUyMjI0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAud3JhcFNsaWRlciB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIHdpZHRoOiA3MCU7ICAgICAgcGFkZGluZzogNnB4IDAgMCAwOyAgICAgIGZsb2F0OiByaWdodDsgICAgICBoZWlnaHQ6IDEwMCU7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLndyYXBTbGlkZXIgaW5wdXRbdHlwZT0ndGV4dCddIHsgICAgICAgIHdpZHRoOiAyNSU7ICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7ICAgICAgICBwYWRkaW5nOiAwOyAgICAgICAgZmxvYXQ6IHJpZ2h0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyV3JhcCB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGZsb2F0OiBsZWZ0OyAgICAgIGN1cnNvcjogZXctcmVzaXplOyAgICAgIHdpZHRoOiA3MCU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zbGlkZXJTbG90IHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgaGVpZ2h0OiAyNXB4OyAgICAgIHBhZGRpbmc6IDNweDsgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMWUyMjI0OyAgICAgIGJvcmRlcjogbm9uZTsgICAgICBib3gtc2hhZG93OiAwIDAgMXB4IDJweCByZ2JhKDAsIDAsIDAsIDAuMDEyNSkgaW5zZXQsIDAgMCAxcHggMXB4ICMxMTEzMTQgaW5zZXQ7ICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjM2I0NDQ3OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVySGFuZGxlIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgcG9zaXRpb246IHJlbGF0aXZlOyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIGhlaWdodDogMTAwJTsgICAgICBiYWNrZ3JvdW5kOiAjYjMyNDM1OyAgICAgIGJhY2tncm91bmQtaW1hZ2U6IC1vLWxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwJSwgcmdiYSgwLCAwLCAwLCAwLjEpIDEwMCUpOyAgICAgIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwJSwgcmdiYSgwLCAwLCAwLCAwLjEpIDEwMCUpOyAgICAgIGJveC1zaGFkb3c6IDAgMXB4IDAgMCAjMGYwZjBmOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuY2FudmFzTGlzdEl0ZW0sICNjb250cm9sS2l0IC5wYW5lbCAuc3ZnTGlzdEl0ZW0geyAgICAgIHBhZGRpbmc6IDAgMTBweCAwIDEwcHg7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd1NNYXggeyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRzVKUkVGVWVOcGk1T0RpYW1SZ1lLaGp3QTRhbVZ4OGd4am1MMXJDOFAzclZ4UThiK0VTQmhmZklBWm1OUjI5QTVldlhXZGlaR0MwMTlYU1pHQmdZR0JZdm1ZOXc3STE2eG9aR0JnYVdLQkcxUzlicys0L0F3TkRQUU1EQTF5U2dZR0JnZEVuUEFiWnpnWTBtZ0V3QUU5bEpUMWxyc2ZmQUFBQUFFbEZUa1N1UW1DQykgY2VudGVyIG5vLXJlcGVhdDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmFycm93U01pbiB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFGcEpSRUZVZU5wc2lpRU9nREFNUmY4U3hOSnpJWWZCMVBRa1E3UmtaY2ZCWUxuYlVBc0w0Y24zWGtnczZOelhxUUF3TCt2ZTNUVEdMV2NEZ0tQV2Qwb3NpRVJhM0Z1bnVMZElwSWtGaUVRMnh1OFVFb3NCVVB4anp3QVRTalYvOHFsTUdBQUFBQUJKUlU1RXJrSmdnZz09KSBjZW50ZXIgbm8tcmVwZWF0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dTTWF4LCAjY29udHJvbEtpdCAucGFuZWwgLmFycm93U01pbiB7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgaGVpZ2h0OiAyMHB4OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dCTWF4IHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQURKSlJFRlVlTnBzeXNFTkFDQU1BekUyOStqaEF4S2xQU212ZUsyYXN6RUlNaUhJN1VmbGJDaEpmeCszQVFBQS8vOERBUExrU2FtSGFzdHhBQUFBQUVsRlRrU3VRbUNDKSBjZW50ZXIgbm8tcmVwZWF0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dCTWluIHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUM5SlJFRlVlTnFFakRFT0FDQVFneGg4T0QvSDJSaFBrazQwQUFqMG1LdmlTMlUzVGllbjBpRTNBQUFBLy84REFFZDFOdElDVjRFdUFBQUFBRWxGVGtTdVFtQ0MpIGNlbnRlciBuby1yZXBlYXQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd0JTdWJNYXggeyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFvQUFBQUdDQVlBQUFENjhBL0dBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBR0pKUkVGVWVOcGk5QW1QWVVBR2V6YXZxMmRnWUdCdzhRMXFSQlpuUVZka2FlL2NBR1dqS0daVzA5RkRVV1RwNE1JZ3E2REV3TURBNEhCbzF6WUdKWFhOZzNDRnlJcGdBRjB4ODZQN2R4clFGV0ZUek9nVEh0UEF3TUJRejRBZk5BQUdBTjFDS1BzNE5ETHZBQUFBQUVsRlRrU3VRbUNDKSBjZW50ZXIgbm8tcmVwZWF0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dCU3ViTWluIHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBb0FBQUFHQ0FZQUFBRDY4QS9HQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUc5SlJFRlVlTnA4enJFT1FEQUFoT0cvR0VTWUJidEp2QUtEMWVLQlJOK3NMMU5ONTdhN2lTRGlwa3Z1RzA2a1dTYUJsZi9JWkpvWHlxcWhyT3BQWWMyT05acTQ3WG9Wdkl0QURIbFJmQ0VKYkhIYjlRQXFlQ2RBakNlK0k0QVRQbkR3N29FQWt0ZWx6UnA5OWZ0d0RBQ2ZzUzBYQWJ6NFB3QUFBQUJKUlU1RXJrSmdnZz09KSBjZW50ZXIgbm8tcmVwZWF0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dCTWF4LCAjY29udHJvbEtpdCAucGFuZWwgLmFycm93Qk1pbiwgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd0JTdWJNYXgsICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dCU3ViTWluIHsgICAgICB3aWR0aDogMTBweDsgICAgICBoZWlnaHQ6IDEwMCU7ICAgICAgZmxvYXQ6IHJpZ2h0OyB9ICAjY29udHJvbEtpdCAucGFuZWwgLnNpemVIYW5kbGUgeyAgICBmbG9hdDogbGVmdDsgICAgd2lkdGg6IDEwcHg7ICAgIGhlaWdodDogMTAwcHg7ICAgIGJvcmRlci1sZWZ0OiAxIHB5OyB9ICAjY29udHJvbEtpdCAucGFuZWwgLmxhYmVsLCAjY29udHJvbEtpdCAucGlja2VyIC5sYWJlbCB7ICAgIHdpZHRoOiAxMDAlOyAgICBmbG9hdDogbGVmdDsgICAgZm9udC1zaXplOiAxMXB4OyAgICBmb250LXdlaWdodDogYm9sZDsgICAgdGV4dC1zaGFkb3c6IDAgLTFweCBibGFjazsgICAgb3ZlcmZsb3c6IGhpZGRlbjsgICAgd2hpdGUtc3BhY2U6IG5vd3JhcDsgICAgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7ICAgIGN1cnNvcjogZGVmYXVsdDsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIC5oZWFkLCAjY29udHJvbEtpdCAucGlja2VyIC5oZWFkLCAjY29udHJvbEtpdCAucGFuZWwgLnBhbmVsSGVhZEluYWN0aXZlIHsgICAgaGVpZ2h0OiAzMHB4OyAgICBwYWRkaW5nOiAwIDEwcHggMCAxMHB4OyAgICBiYWNrZ3JvdW5kOiAjMWExZDFmOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuaGVhZCAud3JhcCwgI2NvbnRyb2xLaXQgLnBpY2tlciAuaGVhZCAud3JhcCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5wYW5lbEhlYWRJbmFjdGl2ZSAud3JhcCB7ICAgICAgd2lkdGg6IGF1dG87ICAgICAgaGVpZ2h0OiBhdXRvOyAgICAgIG1hcmdpbjogMDsgICAgICBwYWRkaW5nOiAwOyAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsgICAgICBvdmVyZmxvdzogaGlkZGVuOyB9ICAjY29udHJvbEtpdCAucGFuZWwgLmhlYWQsICNjb250cm9sS2l0IC5waWNrZXIgLmhlYWQgeyAgICBib3JkZXItdG9wOiAxcHggc29saWQgIzIwMjQyNjsgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMxMTEzMTQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5oZWFkIC5sYWJlbCwgI2NvbnRyb2xLaXQgLnBpY2tlciAuaGVhZCAubGFiZWwgeyAgICAgIGN1cnNvcjogcG9pbnRlcjsgICAgICBsaW5lLWhlaWdodDogMzBweDsgICAgICBjb2xvcjogIzY1Njk2YjsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIC5wYW5lbEhlYWRJbmFjdGl2ZSB7ICAgIGJvcmRlci10b3A6IDFweCBzb2xpZCAjMjAyNDI2OyB9ICAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUsICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgeyAgICBmbG9hdDogcmlnaHQ7ICAgIHBhZGRpbmc6IDVweCAwIDAgMDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgaW5wdXRbdHlwZT0nYnV0dG9uJ10sICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgaW5wdXRbdHlwZT0nYnV0dG9uJ10geyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBjdXJzb3I6IHBvaW50ZXI7ICAgICAgaGVpZ2h0OiAyMHB4OyAgICAgIG1hcmdpbi1sZWZ0OiA0cHg7ICAgICAgYm9yZGVyOiBub25lOyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICBmb250LWZhbWlseTogYXJpYWwsIHNhbnMtc2VyaWY7ICAgICAgZm9udC1zaXplOiAxMHB4OyAgICAgIGZvbnQtd2VpZ2h0OiBib2xkOyAgICAgIGNvbG9yOiAjYWFhYWFhOyAgICAgIHRleHQtc2hhZG93OiAwIC0xcHggYmxhY2s7ICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTsgICAgICBib3gtc2hhZG93OiAwIDAgMCAxcHggIzEzMTMxMyBpbnNldCwgLTFweCAycHggMCAwICMyMTI1MjcgaW5zZXQ7ICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMyNDI5MmI7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5IaWRlLCAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ0blNob3csICNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnRuQ2xvc2UsICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ0bkhpZGUsICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ0blNob3csICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ0bkNsb3NlIHsgICAgICB3aWR0aDogMjBweDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ0bkhpZGUsICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ0bkhpZGUgeyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBR1JKUkVGVWVOcGlkUFVOWW9DQlUwY08xRE13TURDWTJUZzB3c1JZa0NWbEZaVWJvR3k0SW1abGRVMjRwSnlTQ2dPL29CQURBd09Edy9WTDV4bWs1UlFPTXI5OS9SSXVDUVBJaWxqTWJCd1lHQmdZR0g3Ly9NbUFEQ1NsWlJra3BXVVpBQU1BdlRzZ1hCdk9zcTBBQUFBQVNVVk9SSzVDWUlJPSkgNTAlIDUwJSBuby1yZXBlYXQsICMxYTFkMWY7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ0bkhpZGU6aG92ZXIsICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ0bkhpZGU6aG92ZXIgeyAgICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHUkpSRUZVZU5waWRQVU5Zb0NCVTBjTzFETXdNRENZMlRnMHdzUllrQ1ZsRlpVYm9HeTRJbVpsZFUyNHBKeVNDZ08vb0JBREF3T0R3L1ZMNXhtazVSUU9Ncjk5L1JJdUNRUElpbGpNYkJ3WUdCZ1lHSDcvL01tQURDU2xaUmtrcFdVWkFBTUF2VHNnWEJ2T3NxMEFBQUFBU1VWT1JLNUNZSUk9KSA1MCUgNTAlIG5vLXJlcGVhdCwgIzExMTMxNDsgICAgICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCAjMTMxMzEzIGluc2V0LCAtMXB4IDJweCAwIDAgIzEyMTMxNCBpbnNldDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ0blNob3csICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ0blNob3cgeyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRnBKUkVGVWVOcHNqREVPZ0NBUUJPYzRlcU5mb0NCOHdNckNud2svODJFSFdFa3djYXRKWnJLeXJGc0dMdjVYL0g2Y3FQYzQxWTlwdFZMTjBCRFQzVnNURVRuRnVWa1dJR3VJQ1dCRXZmY2hBZnowbXF2WjRCZWVBUUR6VmlNekp5MFJYZ0FBQUFCSlJVNUVya0pnZ2c9PSkgNTAlIDUwJSBuby1yZXBlYXQsICMxYTFkMWY7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ0blNob3c6aG92ZXIsICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ0blNob3c6aG92ZXIgeyAgICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFGcEpSRUZVZU5wc2pERU9nQ0FRQk9jNGVxTmZvQ0I4d01yQ253ay84MkVIV0Vrd2NhdEpackt5ckZzR0x2NVgvSDZjcVBjNDFZOXB0VkxOMEJEVDNWc1RFVG5GdVZrV0lHdUlDV0JFdmZjaEFmejBtcXZaNEJlZUFRRHpWaU16SnkwUlhnQUFBQUJKUlU1RXJrSmdnZz09KSA1MCUgNTAlIG5vLXJlcGVhdCwgIzExMTMxNDsgICAgICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCAjMTMxMzEzIGluc2V0LCAtMXB4IDJweCAwIDAgIzEyMTMxNCBpbnNldDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ0bkNsb3NlLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5DbG9zZSB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBSkNBWUFBQUFQVTIwdUFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFRMUpSRUZVZU5wTTBEOUxBbUVBeC9IdlBYZURUcWVYcFZlWVlqcFlHUTFoQlE3U254ZlEwcEExRkVWYnI2RmVSZ1p1Q2IyRW9PQ2dtMjZzcG9JZ2lLQlFRYUlVbnVjZVcyN3d0MzZIRC93TU8rbmNBbmExVmw5amJJSHZ0WUFOYTJsbHRZSmh1SUh2WFZWcjlaTW9IcFhtRncvdHBDT3RXQ3grTDB4enYxaGVPQTU4THc2OHBxZG56bE5wbDFES053czQwR0g0a0pyS1hBcGhOZ1ovdjJUekJaU1ViYUFoSXJMWi9mNjZtOHk0ekJhSy9QVDdYYUFCSUNMemJEZ2NiT2t3SkZRS1BkSVRnZSsxQVF3NzZkeTQyZHh1ZnE1RXFGUUxlQmRDWFBSNkhWNmVIeitNOWZyMlo4SnhYQ1ZsRXppTnlEM1RzcTZWa3Nvc1Y1WTN0ZFlkWUdmc2hxZVIxamtESS9FL0FPOHJZUmx3WEJxdUFBQUFBRWxGVGtTdVFtQ0MpIDUwJSA1MCUgbm8tcmVwZWF0LCAjMWExZDFmOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5DbG9zZTpob3ZlciwgI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnRuQ2xvc2U6aG92ZXIgeyAgICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBSkNBWUFBQUFQVTIwdUFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFRMUpSRUZVZU5wTTBEOUxBbUVBeC9IdlBYZURUcWVYcFZlWVlqcFlHUTFoQlE3U254ZlEwcEExRkVWYnI2RmVSZ1p1Q2IyRW9PQ2dtMjZzcG9JZ2lLQlFRYUlVbnVjZVcyN3d0MzZIRC93TU8rbmNBbmExVmw5amJJSHZ0WUFOYTJsbHRZSmh1SUh2WFZWcjlaTW9IcFhtRncvdHBDT3RXQ3grTDB4enYxaGVPQTU4THc2OHBxZG56bE5wbDFES053czQwR0g0a0pyS1hBcGhOZ1ovdjJUekJaU1ViYUFoSXJMWi9mNjZtOHk0ekJhSy9QVDdYYUFCSUNMemJEZ2NiT2t3SkZRS1BkSVRnZSsxQVF3NzZkeTQyZHh1ZnE1RXFGUUxlQmRDWFBSNkhWNmVIeitNOWZyMlo4SnhYQ1ZsRXppTnlEM1RzcTZWa3Nvc1Y1WTN0ZFlkWUdmc2hxZVIxamtESS9FL0FPOHJZUmx3WEJxdUFBQUFBRWxGVGtTdVFtQ0MpIDUwJSA1MCUgbm8tcmVwZWF0LCAjMTExMzE0OyAgICAgICAgYm94LXNoYWRvdzogMCAwIDAgMXB4ICMxMzEzMTMgaW5zZXQsIC0xcHggMnB4IDAgMCAjMTIxMzE0IGluc2V0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnRuVW5kbywgI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnRuVW5kbyB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQXdBQUFBTENBWUFBQUJMY0d4ZkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFZVkpSRUZVZU5wY2tEMUlXMUVZaHA5ejdybTNvcWtoeloveEQ2dFIxRXBGS2VsZ2hsQm9uVndLRHBhV0RuYnEybFZGME1IQlViZENwNWFDVWlnZG5JU2dvVVBBcVdNbFlzR2xOdFlLMVpoenpyMWRWRzd6YnQvTDk3eDg3eWNlVHowbHJIS3ArQkpZQkhxdXJHL0FmQzVmK0F3Z3drQzVWSHlieXJUUGR2ZG1BOWYxQkVKUU8vL0xZV1dmaytPZlM3bDhZZUVHS0plS3I3TkQ5OWFUNlF6V21IUGdFK0FBTTQ3cmNuUjR3SS9LL3FTOFRzOTBkcStsTWgxWVkxYUJGdUFGOEF5UVZ1dk5ycnQ5eE9LSmp5SWF1L01PR0pwNDlPUmhyWFpoOXI3dWJnUFBjL25DcjNBMzZUakc5MzFIRFkrT1R5alA2dzhBS1IwMU12YWdjRnF0eG9IL2dMUFQzd2V4UkRLcklyZGJkNlRqOUFzaGNEMFBRYVRhM0JJNW9VRmExM3NJQWlUd3lyZDJ3V3FOcVYvdUFSM0FjY09yUHlSU2JVclg2My9VbGJmayszNEZ4SmR5cWRnRUxBTzNnRGd3UFRCeS8zcHZSb1dDM2dNa1VtM3BTRFQ2UmtxSmNsM2l5WFFRV0lzMVpnWFlVbzIzOWc0TTFzS3oxZm83TUFkc0FQd2JBTDloZnR2VGxOa2RBQUFBQUVsRlRrU3VRbUNDKSAyMCUgNTAlIG5vLXJlcGVhdCwgIzFhMWQxZjsgICAgICBwYWRkaW5nOiAwIDZweCAxcHggMDsgICAgICB3aWR0aDogMzhweDsgICAgICB2ZXJ0aWNhbC1hbGlnbjogdG9wOyAgICAgIHRleHQtYWxpZ246IGVuZDsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnRuVW5kbzpob3ZlciwgI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnRuVW5kbzpob3ZlciB7ICAgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBd0FBQUFMQ0FZQUFBQkxjR3hmQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQVlWSlJFRlVlTnBja0QxSVcxRVlocDl6N3JtM29xa2h6Wi94RDZ0UjFFcEZLZWxnaGxCb25Wd0tEcGFXRG5icTJsVkYwTUhCVWJkQ3A1YUNVaWdkbklTZ29VUEFxV01sWXNHbE50WUsxWmh6enIxZFZHN3pidC9MOTd4ODd5Y2VUejBsckhLcCtCSllCSHF1ckcvQWZDNWYrQXdnd2tDNVZIeWJ5clRQZHZkbUE5ZjFCRUpRTy8vTFlXV2ZrK09mUzdsOFllRUdLSmVLcjdORDk5YVQ2UXpXbUhQZ0UrQUFNNDdyY25SNHdJL0svcVM4VHM5MGRxK2xNaDFZWTFhQkZ1QUY4QXlRVnV2TnJydDl4T0tKanlJYXUvTU9HSnA0OU9SaHJYWmg5cjd1YmdQUGMvbkNyM0EzNlRqRzkzMUhEWStPVHlqUDZ3OEFLUjAxTXZhZ2NGcXR4b0gvZ0xQVDN3ZXhSREtySXJkYmQ2VGo5QXNoY0QwUFFhVGEzQkk1b1VGYTEzc0lBaVR3eXJkMndXcU5xVi91QVIzQWNjT3JQeVJTYlVyWDYzL1VsYmZrKzM0RnhKZHlxZGdFTEFPM2dEZ3dQVEJ5LzNwdlJvV0MzZ01rVW0zcFNEVDZSa3FKY2wzaXlYUVFXSXMxWmdYWVVvMjM5ZzRNMXNLejFmbzdNQWRzQVB3YkFMOWhmdHZUbE5rZEFBQUFBRWxGVGtTdVFtQ0MpIDIwJSA1MCUgbm8tcmVwZWF0LCAjMTExMzE0OyAgICAgICAgYm94LXNoYWRvdzogMCAwIDAgMXB4ICMxMzEzMTMgaW5zZXQsIC0xcHggMnB4IDAgMCAjMTIxMzE0IGluc2V0OyB9ICAjY29udHJvbEtpdCAucGlja2VyIHsgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgIGJhY2tncm91bmQtY29sb3I6ICMzMDM2Mzk7ICAgIGZvbnQtZmFtaWx5OiBhcmlhbCwgc2Fucy1zZXJpZjsgICAgZm9udC1zaXplOiAxMXB4OyAgICBjb2xvcjogd2hpdGU7ICAgIHRleHQtc2hhZG93OiAxcHggMXB4IGJsYWNrOyAgICBwb3NpdGlvbjogYWJzb2x1dGU7ICAgIHotaW5kZXg6IDIxNDc0ODM2MzE7ICAgIHdpZHRoOiAzNjBweDsgICAgLXdlYmtpdC10b3VjaC1jYWxsb3V0OiBub25lOyAgICAtd2Via2l0LXVzZXItc2VsZWN0OiBub25lOyAgICAta2h0bWwtdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1tb3otdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1tcy11c2VyLXNlbGVjdDogbm9uZTsgICAgdXNlci1zZWxlY3Q6IG5vbmU7ICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4yNSk7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciBjYW52YXMgeyAgICAgIHZlcnRpY2FsLWFsaWduOiBib3R0b207ICAgICAgY3Vyc29yOiBwb2ludGVyOyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBwYWRkaW5nOiAxMHB4OyAgICAgIGZsb2F0OiBsZWZ0OyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkV3JhcCB7ICAgICAgcGFkZGluZzogM3B4OyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlcldyYXAgeyAgICAgIHBhZGRpbmc6IDNweCAxM3B4IDNweCAzcHg7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGRXcmFwLCAjY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXJXcmFwLCAjY29udHJvbEtpdCAucGlja2VyIC5pbnB1dFdyYXAgeyAgICAgIGhlaWdodDogYXV0bzsgICAgICBvdmVyZmxvdzogaGlkZGVuOyAgICAgIGZsb2F0OiBsZWZ0OyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0V3JhcCB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJvcmRlcjogMXB4IHNvbGlkICMxZTIyMjQ7ICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIGJveC1zaGFkb3c6IDAgMXB4IDAgMCAjM2I0NDQ3OyAgICAgIHdpZHRoOiAxNDBweDsgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgcGFkZGluZzogNXB4IDEwcHggMXB4IDA7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXRGaWVsZCB7ICAgICAgd2lkdGg6IDUwJTsgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgbWFyZ2luLWJvdHRvbTogNHB4OyB9ICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXRGaWVsZCAubGFiZWwgeyAgICAgICAgcGFkZGluZzogNHB4IDAgMCAwOyAgICAgICAgY29sb3I6ICM4Nzg3ODc7ICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7ICAgICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7ICAgICAgICB0ZXh0LXNoYWRvdzogMXB4IDFweCAjMWExYTFhOyAgICAgICAgd2lkdGg6IDQwJTsgfSAgICAgICNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0RmllbGQgLndyYXAgeyAgICAgICAgcGFkZGluZzogMDsgICAgICAgIHdpZHRoOiA2MCU7ICAgICAgICBoZWlnaHQ6IGF1dG87ICAgICAgICBmbG9hdDogcmlnaHQ7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuY29udHJvbHNXcmFwIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgaGVpZ2h0OiBhdXRvOyAgICAgIGZsb2F0OiByaWdodDsgICAgICBwYWRkaW5nOiA5cHggMCAwIDA7IH0gICAgICAjY29udHJvbEtpdCAucGlja2VyIC5jb250cm9sc1dyYXAgaW5wdXRbdHlwZT0nYnV0dG9uJ10geyAgICAgICAgZmxvYXQ6IHJpZ2h0OyAgICAgICAgd2lkdGg6IDY1cHg7ICAgICAgICBtYXJnaW46IDAgMCAwIDEwcHg7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuY29sb3JDb250cmFzdCB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJvcmRlcjogbm9uZTsgICAgICBib3gtc2hhZG93OiAwIDAgMXB4IDJweCByZ2JhKDAsIDAsIDAsIDAuMDEyNSkgaW5zZXQsIDAgMCAxcHggMXB4ICMxMTEzMTQgaW5zZXQ7ICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjM2I0NDQ3OyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIGhlaWdodDogMjVweDsgICAgICBwYWRkaW5nOiAzcHg7ICAgICAgd2lkdGg6IDgwJTsgICAgICBtYXJnaW4tYm90dG9tOiA0cHg7ICAgICAgZmxvYXQ6IHJpZ2h0OyB9ICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuY29sb3JDb250cmFzdCBkaXYgeyAgICAgICAgd2lkdGg6IDUwJTsgICAgICAgIGhlaWdodDogMTAwJTsgICAgICAgIGZsb2F0OiBsZWZ0OyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgaW5wdXRbdHlwZT0ndGV4dCddIHsgICAgICBwYWRkaW5nOiAwOyAgICAgIHRleHQtYWxpZ246IGNlbnRlcjsgICAgICB3aWR0aDogNjAlOyAgICAgIGZsb2F0OiByaWdodDsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dFdyYXA6bnRoLW9mLXR5cGUoMykgeyAgICAgIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDA7ICAgICAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDA7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXRXcmFwOm50aC1vZi10eXBlKDQpIHsgICAgICBib3JkZXItdG9wOiBub25lOyAgICAgIGJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDA7ICAgICAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDA7IH0gICAgICAjY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dFdyYXA6bnRoLW9mLXR5cGUoNCkgLmlucHV0RmllbGQgeyAgICAgICAgd2lkdGg6IDEwMCU7IH0gICAgICAgICNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0V3JhcDpudGgtb2YtdHlwZSg0KSAuaW5wdXRGaWVsZCAubGFiZWwgeyAgICAgICAgICB3aWR0aDogMjAlOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXRXcmFwOm50aC1vZi10eXBlKDQpIGlucHV0W3R5cGU9J3RleHQnXSB7ICAgICAgICB3aWR0aDogODAlOyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkV3JhcCwgI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyV3JhcCB7ICAgICAgYmFja2dyb3VuZDogIzFlMjIyNDsgICAgICBib3JkZXI6IG5vbmU7ICAgICAgYm94LXNoYWRvdzogMCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjAxMjUpIGluc2V0LCAwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0OyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgICAgICBwb3NpdGlvbjogcmVsYXRpdmU7ICAgICAgbWFyZ2luLXJpZ2h0OiA1cHg7IH0gICAgICAjY29udHJvbEtpdCAucGlja2VyIC5maWVsZFdyYXAgLmluZGljYXRvciwgI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyV3JhcCAuaW5kaWNhdG9yIHsgICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgICAgICAgIGJvcmRlcjogMnB4IHNvbGlkIHdoaXRlOyAgICAgICAgYm94LXNoYWRvdzogMCAxcHggYmxhY2ssIDAgMXB4IGJsYWNrIGluc2V0OyAgICAgICAgY3Vyc29yOiBwb2ludGVyOyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkV3JhcCAuaW5kaWNhdG9yIHsgICAgICB3aWR0aDogOHB4OyAgICAgIGhlaWdodDogOHB4OyAgICAgIGxlZnQ6IDUwJTsgICAgICB0b3A6IDUwJTsgICAgICBib3JkZXItcmFkaXVzOiA1MCU7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiA1MCU7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyV3JhcCAuaW5kaWNhdG9yIHsgICAgICB3aWR0aDogMTRweDsgICAgICBoZWlnaHQ6IDNweDsgICAgICBib3JkZXItcmFkaXVzOiA4cHg7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiA4cHg7ICAgICAgbGVmdDogMXB4OyAgICAgIHRvcDogMXB4OyB9ICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyV3JhcCAuaW5kaWNhdG9yOmFmdGVyIHsgICAgICAgIGNvbnRlbnQ6ICcnOyAgICAgICAgd2lkdGg6IDA7ICAgICAgICBoZWlnaHQ6IDA7ICAgICAgICBib3JkZXItdG9wOiA0LjVweCBzb2xpZCB0cmFuc3BhcmVudDsgICAgICAgIGJvcmRlci1ib3R0b206IDQuNXB4IHNvbGlkIHRyYW5zcGFyZW50OyAgICAgICAgYm9yZGVyLXJpZ2h0OiA0cHggc29saWQgd2hpdGU7ICAgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7ICAgICAgICB0b3A6IC0ycHg7ICAgICAgICBsZWZ0OiAxOXB4OyB9ICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyV3JhcCAuaW5kaWNhdG9yOmJlZm9yZSB7ICAgICAgICBjb250ZW50OiAnJzsgICAgICAgIHdpZHRoOiAwOyAgICAgICAgaGVpZ2h0OiAwOyAgICAgICAgYm9yZGVyLXRvcDogNC41cHggc29saWQgdHJhbnNwYXJlbnQ7ICAgICAgICBib3JkZXItYm90dG9tOiA0LjVweCBzb2xpZCB0cmFuc3BhcmVudDsgICAgICAgIGJvcmRlci1yaWdodDogNHB4IHNvbGlkIGJsYWNrOyAgICAgICAgZmxvYXQ6IHJpZ2h0OyAgICAgICAgcG9zaXRpb246IGFic29sdXRlOyAgICAgICAgdG9wOiAtM3B4OyAgICAgICAgbGVmdDogMTlweDsgfSAgI2NvbnRyb2xLaXQgLm9wdGlvbnMgeyAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgYm9yZGVyOiAxcHggc29saWQgIzEzMTMxMzsgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgcG9zaXRpb246IGFic29sdXRlOyAgICBsZWZ0OiAwOyAgICB0b3A6IDA7ICAgIHdpZHRoOiBhdXRvOyAgICBoZWlnaHQ6IGF1dG87ICAgIHotaW5kZXg6IDIxNDc0ODM2Mzg7ICAgIGZvbnQtZmFtaWx5OiBhcmlhbCwgc2Fucy1zZXJpZjsgICAgZm9udC1zaXplOiAxMXB4OyAgICBjb2xvcjogd2hpdGU7ICAgIHRleHQtc2hhZG93OiAxcHggMXB4IGJsYWNrOyAgICBib3gtc2hhZG93OiAwIDFweCAwIDAgIzU2NjE2NiBpbnNldDsgICAgb3ZlcmZsb3c6IGhpZGRlbjsgICAgYmFja2dyb3VuZC1jb2xvcjogIzNjNDk0ZTsgfSAgICAjY29udHJvbEtpdCAub3B0aW9ucyB1bCB7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgbGlzdC1zdHlsZTogbm9uZTsgICAgICBtYXJnaW46IDA7ICAgICAgcGFkZGluZzogMDsgfSAgICAgICNjb250cm9sS2l0IC5vcHRpb25zIHVsIGxpIHsgICAgICAgIG1hcmdpbjogMDsgICAgICAgIHdpZHRoOiAxMDAlOyAgICAgICAgaGVpZ2h0OiAyOHB4OyAgICAgICAgbGluZS1oZWlnaHQ6IDI4cHg7ICAgICAgICBwYWRkaW5nOiAwIDIwcHggMCAxMHB4OyAgICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsgICAgICAgIHdoaXRlLXNwYWNlOiBub3JtYWw7ICAgICAgICB0ZXh0LW92ZXJmbG93OiBlbGxpcHNpczsgICAgICAgIGN1cnNvcjogcG9pbnRlcjsgfSAgICAgICAgI2NvbnRyb2xLaXQgLm9wdGlvbnMgdWwgbGk6aG92ZXIgeyAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMWYyMzI1OyB9ICAgICAgI2NvbnRyb2xLaXQgLm9wdGlvbnMgdWwgLmxpU2VsZWN0ZWQgeyAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzI5MmQzMDsgfSAgICAjY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgfSAgICAgICNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciBsaSwgI2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIC5saVNlbGVjdGVkIHsgICAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICBwYWRkaW5nOiAwOyAgICAgICAgaGVpZ2h0OiAyNXB4OyAgICAgICAgbGluZS1oZWlnaHQ6IDI1cHg7ICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7IH0gICAgICAgICNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciBsaTpob3ZlciwgI2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIC5saVNlbGVjdGVkOmhvdmVyIHsgICAgICAgICAgYmFja2dyb3VuZDogbm9uZTsgICAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7IH0gICAgICAjY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgLmxpU2VsZWN0ZWQgeyAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7IH1cIlxufTsgXG5tb2R1bGUuZXhwb3J0cyA9IFN0eWxlOyIsInZhciBFcnJvciA9IHtcbiAgICBDT0xPUl9GT1JNQVRfSEVYICAgICAgICAgICAgICAgICAgOiAnQ29sb3IgZm9ybWF0IHNob3VsZCBiZSBoZXguIFNldCBjb2xvck1vZGUgdG8gcmdiLCByZ2JmdiBvciBoc3YuJyxcbiAgICBDT0xPUl9GT1JNQVRfUkdCX1JHQkZWX0hTViAgICAgICAgOiAnQ29sb3IgZm9ybWF0IHNob3VsZCBiZSByZ2IsIHJnYmZ2IG9yIGhzdi4gU2V0IGNvbG9yTW9kZSB0byBoZXguJyxcbiAgICBDT0xPUl9QUkVTRVRfRk9STUFUX0hFWCAgICAgICAgICAgOiAnUHJlc2V0IGNvbG9yIGZvcm1hdCBzaG91bGQgYmUgaGV4LicsXG4gICAgQ09MT1JfUFJFU0VUX0ZPUk1BVF9SR0JfUkdCRlZfSFNWIDogJ1ByZXNldCBjb2xvciBmb3JtYXQgc2hvdWxkIGJlIHJnYiwgcmdiZnYgb3IgaHN2LicsXG4gICAgQ09NUE9ORU5UX09CSkVDVCAgICAgICAgICAgICAgICAgIDogJ09iamVjdCAnLFxuICAgIENPTVBPTkVOVF9PQkpFQ1RfTUVNQkVSX1JFRkVSRU5DRSA6ICcgaGFzIG5vIG1lbWJlciAnLFxuICAgIFRZUEUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6ICcgc2hvdWxkIGJlIG9mIHR5cGUgJyxcbiAgICBDT01QT05FTlRfRlVOQ1RJT05fTEVOR1RIICAgICAgICAgOiAnRnVuY3Rpb24gc2hvdWxkIGJlIG9mIGZvcm0gZih4KSBvciBmKHgseSkuJyxcbiAgICBFTkQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiAnLidcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXJyb3I7IiwidmFyIEVycm9yVXRpbCA9IHtcbiAgICBSZWZlcmVuY2VFcnJvciA6IGZ1bmN0aW9uKG9iamVjdCxrZXkpICAgICAgIHtyZXR1cm4gKG9iamVjdFtrZXldID09PSB1bmRlZmluZWQpO30sXG4gICAgVHlwZUVycm9yICAgICAgOiBmdW5jdGlvbihvYmplY3QsdmFsdWUsdHlwZSl7cmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3RbdmFsdWVdKSAhPT0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHR5cGUpO31cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXJyb3JVdGlsOyIsImZ1bmN0aW9uIEV2ZW50XyhzZW5kZXIsdHlwZSxkYXRhKSB7XG4gICAgdGhpcy5zZW5kZXIgPSBzZW5kZXI7XG4gICAgdGhpcy50eXBlICAgPSB0eXBlO1xuICAgIHRoaXMuZGF0YSAgID0gZGF0YTtcbn1cblxuRXZlbnQucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBFdmVudF8odGhpcy5zZW5kZXIsdGhpcy50eXBlLHRoaXMuZGF0YSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50XzsiLCJmdW5jdGlvbiBFdmVudERpc3BhdGNoZXIoKSB7XG4gICAgdGhpcy5fbGlzdGVuZXJzID0gW107XG59XG5cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUgPSB7XG4gICAgYWRkRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gKGV2ZW50VHlwZSwgbGlzdGVuZXIsIGNhbGxiYWNrTWV0aG9kKSB7XG4gICAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudFR5cGVdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50VHlwZV0gfHwgW107XG4gICAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudFR5cGVdLnB1c2goe29iajogbGlzdGVuZXIsIG1ldGhvZDogY2FsbGJhY2tNZXRob2R9KTtcbiAgICB9LFxuXG4gICAgZGlzcGF0Y2hFdmVudDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHZhciB0eXBlID0gZXZlbnQudHlwZTtcblxuICAgICAgICBpZiAoIXRoaXMuaGFzRXZlbnRMaXN0ZW5lcih0eXBlKSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuICAgICAgICB2YXIgaSA9IC0xLCBsID0gbGlzdGVuZXJzLmxlbmd0aDtcblxuICAgICAgICB2YXIgb2JqLCBtZXRob2Q7XG5cbiAgICAgICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgICAgIG9iaiA9IGxpc3RlbmVyc1tpXS5vYmo7XG4gICAgICAgICAgICBtZXRob2QgPSBsaXN0ZW5lcnNbaV0ubWV0aG9kO1xuXG4gICAgICAgICAgICBpZiAoIW9ialttZXRob2RdKXtcbiAgICAgICAgICAgICAgICB0aHJvdyBvYmogKyAnIGhhcyBubyBtZXRob2QgJyArIG1ldGhvZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb2JqW21ldGhvZF0oZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlLCBvYmosIG1ldGhvZCkge1xuICAgICAgICBpZiAoIXRoaXMuaGFzRXZlbnRMaXN0ZW5lcih0eXBlKSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuXG4gICAgICAgIHZhciBpID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKC0taSA+IC0xKSB7XG4gICAgICAgICAgICBpZiAobGlzdGVuZXJzW2ldLm9iaiA9PSBvYmogJiYgbGlzdGVuZXJzW2ldLm1ldGhvZCA9PSBtZXRob2QpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lcnMubGVuZ3RoID09IDApe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICByZW1vdmVBbGxFdmVudExpc3RlbmVyczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9saXN0ZW5lcnMgPSBbXTtcbiAgICB9LFxuXG5cbiAgICBoYXNFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbGlzdGVuZXJzW3R5cGVdICE9IHVuZGVmaW5lZCAmJiB0aGlzLl9saXN0ZW5lcnNbdHlwZV0gIT0gbnVsbDtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RGlzcGF0Y2hlcjsiLCJ2YXIgTGF5b3V0TW9kZSA9IHtcbiAgICBMRUZUICAgOiAnbGVmdCcsXG4gICAgUklHSFQgIDogJ3JpZ2h0JyxcbiAgICBUT1AgICAgOiAndG9wJyxcbiAgICBCT1RUT00gOiAnYm90dG9tJyxcbiAgICBOT05FICAgOiAnbm9uZSdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTGF5b3V0TW9kZTsiLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L05vZGUnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9NZXRyaWMnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9kb2N1bWVudC9DU1MnKTtcbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L05vZGVFdmVudCcpO1xudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvTW91c2UnKTtcblxuLy8gL1RPRE86IEFkZCBtb3VzZW9mZnNldCAmIHJlc2V0Li5cbmZ1bmN0aW9uIFNjcm9sbEJhcihwYXJlbnROb2RlLHRhcmdldE5vZGUsd3JhcEhlaWdodCkge1xuICAgIHRoaXMuX3BhcmVudE5vZGUgPSBwYXJlbnROb2RlO1xuICAgIHRoaXMuX3RhcmdldE5vZGUgPSB0YXJnZXROb2RlO1xuICAgIHRoaXMuX3dyYXBIZWlnaHQgPSB3cmFwSGVpZ2h0O1xuXG4gICAgdmFyIHdyYXAgICA9IHRoaXMuX3dyYXBOb2RlICAgPSBuZXcgTm9kZSgpLFxuICAgICAgICBub2RlICAgPSB0aGlzLl9ub2RlICAgICAgID0gbmV3IE5vZGUoKSxcbiAgICAgICAgdHJhY2sgID0gdGhpcy5fdHJhY2tOb2RlICA9IG5ldyBOb2RlKCksXG4gICAgICAgIHRodW1iICA9IHRoaXMuX3RodW1iTm9kZSAgPSBuZXcgTm9kZSgpO1xuXG4gICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0YXJnZXROb2RlKTtcbiAgICBwYXJlbnROb2RlLmFkZENoaWxkKHdyYXApO1xuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGRBdChub2RlLDApO1xuXG4gICAgd3JhcC5hZGRDaGlsZCh0YXJnZXROb2RlKTtcbiAgICBub2RlLmFkZENoaWxkKHRyYWNrKTtcbiAgICB0cmFjay5hZGRDaGlsZCh0aHVtYik7XG5cbiAgICB3cmFwLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbFdyYXApO1xuICAgIG5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsQmFyKTtcbiAgICB0cmFjay5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxiYXJUcmFjayk7XG4gICAgdGh1bWIuc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsYmFyVGh1bWIpO1xuXG4gICAgdGhpcy5fc2Nyb2xsSGVpZ2h0ID0gMDtcbiAgICB0aGlzLl9zY3JvbGxVbml0ICAgPSAwO1xuXG4gICAgdGhpcy5fc2Nyb2xsTWluICAgID0gMDtcbiAgICB0aGlzLl9zY3JvbGxNYXggICAgPSAxO1xuICAgIHRoaXMuX3Njcm9sbFBvcyAgICA9IDA7XG5cbiAgICB0aHVtYi5zZXRQb3NpdGlvblkoTWV0cmljLlNDUk9MTEJBUl9UUkFDS19QQURESU5HKTtcbiAgICB0aHVtYi5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uVGh1bWJEcmFnU3RhcnQuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLl9pc1ZhbGlkICA9IGZhbHNlO1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSBmYWxzZTtcbn1cblxuU2Nyb2xsQmFyLnByb3RvdHlwZSA9XG57XG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0YXJnZXQgPSB0aGlzLl90YXJnZXROb2RlLFxuICAgICAgICAgICAgdGh1bWIgPSB0aGlzLl90aHVtYk5vZGU7XG5cbiAgICAgICAgdmFyIHBhZGRpbmcgPSBNZXRyaWMuU0NST0xMQkFSX1RSQUNLX1BBRERJTkc7XG5cbiAgICAgICAgdmFyIHRhcmdldFdyYXBIZWlnaHQgPSB0aGlzLl93cmFwSGVpZ2h0LFxuICAgICAgICAgICAgdGFyZ2V0SGVpZ2h0ID0gdGFyZ2V0LmdldEhlaWdodCgpLFxuICAgICAgICAgICAgdHJhY2tIZWlnaHQgPSB0YXJnZXRXcmFwSGVpZ2h0IC0gcGFkZGluZyAqIDI7XG5cbiAgICAgICAgdGh1bWIuc2V0SGVpZ2h0KHRyYWNrSGVpZ2h0KTtcblxuICAgICAgICB2YXIgcmF0aW8gPSB0YXJnZXRXcmFwSGVpZ2h0IC8gdGFyZ2V0SGVpZ2h0O1xuXG4gICAgICAgIHRoaXMuX2lzVmFsaWQgPSBmYWxzZTtcblxuICAgICAgICBpZiAocmF0aW8gPiAxLjApe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRodW1iSGVpZ2h0ID0gdHJhY2tIZWlnaHQgKiByYXRpbztcblxuICAgICAgICB0aGlzLl9zY3JvbGxIZWlnaHQgPSB0cmFja0hlaWdodCAtIHRodW1iSGVpZ2h0O1xuICAgICAgICB0aGlzLl9zY3JvbGxVbml0ID0gdGFyZ2V0SGVpZ2h0IC0gdHJhY2tIZWlnaHQgLSBwYWRkaW5nICogMjtcblxuICAgICAgICB0aHVtYi5zZXRIZWlnaHQodGh1bWJIZWlnaHQpO1xuXG4gICAgICAgIHRoaXMuX2lzVmFsaWQgPSB0cnVlO1xuXG4gICAgICAgIC8qXG4gICAgICAgICB2YXIgc2Nyb2xsTWluID0gdGhpcy5fc2Nyb2xsTWluLFxuICAgICAgICAgc2Nyb2xsTWF4ID0gdGhpcy5fc2Nyb2xsTWF4LFxuICAgICAgICAgc2Nyb2xsUG9zID0gdGhpcy5fc2Nyb2xsUG9zO1xuXG4gICAgICAgICB2YXIgc2Nyb2xsUG9zTm9ybSA9IChzY3JvbGxQb3MgLSBzY3JvbGxNaW4pIC8gKHNjcm9sbE1heCAtIHNjcm9sbFBvcyk7XG4gICAgICAgICAqL1xuICAgIH0sXG5cbiAgICBfc2Nyb2xsVGh1bWI6IGZ1bmN0aW9uICh5KSB7XG4gICAgICAgIHZhciB0aHVtYiA9IHRoaXMuX3RodW1iTm9kZSxcbiAgICAgICAgICAgIHRodW1iSGVpZ2h0ID0gdGh1bWIuZ2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcy5fdHJhY2tOb2RlLFxuICAgICAgICAgICAgdHJhY2tIZWlnaHQgPSB0aGlzLl93cmFwSGVpZ2h0LFxuICAgICAgICAgICAgdHJhY2tUb3AgPSB0cmFjay5nZXRQb3NpdGlvbkdsb2JhbFkoKSxcbiAgICAgICAgICAgIHRyYWNrQ2VudGVyID0gdHJhY2tIZWlnaHQgKiAwLjU7XG5cbiAgICAgICAgdmFyIHRhcmdldCA9IHRoaXMuX3RhcmdldE5vZGU7XG5cbiAgICAgICAgdmFyIHNjcm9sbEhlaWdodCA9IHRoaXMuX3Njcm9sbEhlaWdodCxcbiAgICAgICAgICAgIHNjcm9sbFVuaXQgPSB0aGlzLl9zY3JvbGxVbml0O1xuXG4gICAgICAgIHZhciBtaW4gPSB0aGlzLl9zY3JvbGxNaW4gPSB0cmFja0NlbnRlciAtIHNjcm9sbEhlaWdodCAqIDAuNSxcbiAgICAgICAgICAgIG1heCA9IHRoaXMuX3Njcm9sbE1heCA9IHRyYWNrQ2VudGVyICsgc2Nyb2xsSGVpZ2h0ICogMC41O1xuXG4gICAgICAgIHZhciBwb3MgPSBNYXRoLm1heChtaW4sIE1hdGgubWluKHkgLSB0cmFja1RvcCwgbWF4KSk7XG5cbiAgICAgICAgdmFyIHRodW1iUG9zID0gdGhpcy5fc2Nyb2xsUG9zID0gcG9zIC0gdGh1bWJIZWlnaHQgKiAwLjUsXG4gICAgICAgICAgICB0YXJnZXRQb3MgPSAtKHBvcyAtIG1pbikgLyAobWF4IC0gbWluKSAqIHNjcm9sbFVuaXQ7XG5cbiAgICAgICAgdGh1bWIuc2V0UG9zaXRpb25ZKHRodW1iUG9zKTtcbiAgICAgICAgdGFyZ2V0LnNldFBvc2l0aW9uWSh0YXJnZXRQb3MpO1xuICAgIH0sXG5cbiAgICBfb25UaHVtYkRyYWdTdGFydDogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2lzVmFsaWQgfHwgdGhpcy5faXNEaXNhYmxlZCl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgICAgICBldmVudE1vdXNlVXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgbW91c2UgPSBNb3VzZS5nZXRJbnN0YW5jZSgpO1xuXG4gICAgICAgIC8vVE9ETzphZGRcbiAgICAgICAgdGhpcy5fc2Nyb2xsT2Zmc2V0ID0gbW91c2UuZ2V0WSgpIC0gdGhpcy5fdGh1bWJOb2RlLmdldFBvc2l0aW9uR2xvYmFsWSgpO1xuXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fc2Nyb2xsVGh1bWIobW91c2UuZ2V0WSgpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX3Njcm9sbFRodW1iKG1vdXNlLmdldFkoKSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgfSxcblxuICAgIGVuYWJsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pc0Rpc2FibGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICB9LFxuICAgIGRpc2FibGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faXNEaXNhYmxlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICB9LFxuXG4gICAgcmVzZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsVGh1bWIoMCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVBcHBlYXJhbmNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLl9pc0Rpc2FibGVkKSB7XG4gICAgICAgICAgICB0aGlzLl9ub2RlLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgdGhpcy5fdGFyZ2V0Tm9kZS5zZXRQb3NpdGlvblkoMCk7XG4gICAgICAgICAgICB0aGlzLl90aHVtYk5vZGUuc2V0UG9zaXRpb25ZKE1ldHJpYy5TQ1JPTExCQVJfVFJBQ0tfUEFERElORyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9ub2RlLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpc1ZhbGlkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pc1ZhbGlkO1xuICAgIH0sXG5cbiAgICBzZXRXcmFwSGVpZ2h0OiBmdW5jdGlvbiAoaGVpZ2h0KSB7XG4gICAgICAgIHRoaXMuX3dyYXBIZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgfSxcblxuICAgIHJlbW92ZVRhcmdldE5vZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dyYXBOb2RlLnJlbW92ZUNoaWxkKHRoaXMuX3RhcmdldE5vZGUpO1xuICAgIH0sXG5cbiAgICByZW1vdmVGcm9tUGFyZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwYXJlbnROb2RlID0gdGhpcy5fcGFyZW50Tm9kZSxcbiAgICAgICAgICAgIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgICAgIHRhcmdldE5vZGUgPSB0aGlzLl90YXJnZXROb2RlO1xuXG4gICAgICAgIHJvb3ROb2RlLnJlbW92ZUNoaWxkKHRhcmdldE5vZGUpO1xuICAgICAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuX3dyYXBOb2RlKTtcbiAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChyb290Tm9kZSk7XG5cbiAgICAgICAgcmV0dXJuIHRhcmdldE5vZGU7XG4gICAgfSxcblxuICAgIGdldFdyYXBOb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93cmFwTm9kZTtcbiAgICB9LFxuICAgIGdldE5vZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX25vZGU7XG4gICAgfSxcbiAgICBnZXRUYXJnZXROb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90YXJnZXROb2RlO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2Nyb2xsQmFyOyIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBTY3JvbGxCYXIgPSByZXF1aXJlKCcuLi9jb3JlL2xheW91dC9TY3JvbGxCYXInKTtcblxuZnVuY3Rpb24gQWJzdHJhY3RHcm91cChwYXJlbnQsIHBhcmFtcykge1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0IHx8IG51bGw7XG4gICAgcGFyYW1zLmVuYWJsZSA9IHBhcmFtcy5lbmFibGUgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBwYXJhbXMuZW5hYmxlO1xuXG4gICAgdGhpcy5fcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMuX2hlaWdodCA9IHBhcmFtcy5oZWlnaHQ7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9ICFwYXJhbXMuZW5hYmxlO1xuICAgIHRoaXMuX3Njcm9sbEJhciA9IG51bGw7XG5cbiAgICB0aGlzLl9ub2RlID0gbmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pO1xuICAgIHRoaXMuX3dyYXBOb2RlID0gbmV3IE5vZGUoKTtcbiAgICB0aGlzLl9saXN0Tm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVCk7XG5cbiAgICB0aGlzLl9wYXJlbnQuZ2V0TGlzdCgpLmFkZENoaWxkKHRoaXMuX25vZGUpO1xufVxuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmFkZFNjcm9sbFdyYXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIG1heEhlaWdodCA9IHRoaXMuZ2V0TWF4SGVpZ2h0KCk7XG5cbiAgICB0aGlzLl9zY3JvbGxCYXIgPSBuZXcgU2Nyb2xsQmFyKHdyYXBOb2RlLCB0aGlzLl9saXN0Tm9kZSwgbWF4SGVpZ2h0KTtcbiAgICBpZiAodGhpcy5pc0VuYWJsZWQoKSkge1xuICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQobWF4SGVpZ2h0KTtcbiAgICB9XG59O1xuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5wcmV2ZW50U2VsZWN0RHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9wYXJlbnQucHJldmVudFNlbGVjdERyYWcoKTtcblxuICAgIGlmICghdGhpcy5oYXNTY3JvbGxXcmFwKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl93cmFwTm9kZS5nZXRFbGVtZW50KCkuc2Nyb2xsVG9wID0gMDtcbn07XG5cblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuaGFzTWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQgIT0gbnVsbDtcbn07XG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5nZXRNYXhIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbn07XG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5oYXNTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zY3JvbGxCYXIgIT0gbnVsbDtcbn07XG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5oYXNMYWJlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbGFibE5vZGUgIT0gbnVsbDtcbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IHRydWU7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmlzRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzRGlzYWJsZWQ7XG59O1xuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuaXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhdGhpcy5faXNEaXNhYmxlZDtcbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmdldExpc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xpc3ROb2RlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdEdyb3VwO1xuXG4iLCJ2YXIgQWJzdHJhY3RHcm91cCA9IHJlcXVpcmUoJy4vQWJzdHJhY3RHcm91cCcpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgU3ViR3JvdXAgPSByZXF1aXJlKCcuL1N1Ykdyb3VwJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgUGFuZWxFdmVudCA9IHJlcXVpcmUoJy4vUGFuZWxFdmVudCcpLFxuICAgIEdyb3VwRXZlbnQgPSByZXF1aXJlKCcuL0dyb3VwRXZlbnQnKTtcblxudmFyIEdyb3VwTm9TdWJHcm91cEVycm9yID0gcmVxdWlyZSgnLi9Hcm91cE5vU3ViR3JvdXBFcnJvcicpO1xuXG5mdW5jdGlvbiBHcm91cChwYXJlbnQscGFyYW1zKSB7XG4gICAgcGFyYW1zICAgICAgICAgICA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMubGFiZWwgICAgID0gcGFyYW1zLmxhYmVsICAgICB8fCBudWxsO1xuICAgIHBhcmFtcy51c2VMYWJlbHMgPSBwYXJhbXMudXNlTGFiZWxzIHx8IHRydWU7XG4gICAgcGFyYW1zLmVuYWJsZSAgICA9IHBhcmFtcy5lbmFibGUgICAgID09PSB1bmRlZmluZWQgPyB0cnVlIDogcGFyYW1zLmVuYWJsZTtcblxuICAgIEFic3RyYWN0R3JvdXAuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5fY29tcG9uZW50cyA9IFtdO1xuICAgIHRoaXMuX3N1Ykdyb3VwcyAgPSBbXTtcblxuICAgIHZhciByb290Tm9kZSA9IHRoaXMuX25vZGUsXG4gICAgICAgIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIGxpc3ROb2RlID0gdGhpcy5fbGlzdE5vZGU7XG5cbiAgICAgICAgcm9vdE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuR3JvdXApO1xuICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcbiAgICAgICAgbGlzdE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU3ViR3JvdXBMaXN0KTtcblxuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChsaXN0Tm9kZSk7XG5cbiAgICB2YXIgbGFiZWwgPSBwYXJhbXMubGFiZWw7XG5cbiAgICBpZihsYWJlbCl7XG4gICAgICAgIHZhciBoZWFkTm9kZSAgPSBuZXcgTm9kZSgpLFxuICAgICAgICAgICAgbGFibFdyYXAgID0gbmV3IE5vZGUoKSxcbiAgICAgICAgICAgIGxhYmxOb2RlICA9IG5ldyBOb2RlKE5vZGUuU1BBTiksXG4gICAgICAgICAgICBpbmRpTm9kZSAgPSB0aGlzLl9pbmRpTm9kZSA9IG5ldyBOb2RlKCk7XG5cbiAgICAgICAgICAgIGhlYWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpO1xuICAgICAgICAgICAgbGFibFdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG4gICAgICAgICAgICBsYWJsTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XG4gICAgICAgICAgICBpbmRpTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JNYXgpO1xuICAgICAgICAgICAgbGFibE5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsbGFiZWwpO1xuXG4gICAgICAgICAgICBoZWFkTm9kZS5hZGRDaGlsZChpbmRpTm9kZSk7XG4gICAgICAgICAgICBsYWJsV3JhcC5hZGRDaGlsZChsYWJsTm9kZSk7XG4gICAgICAgICAgICBoZWFkTm9kZS5hZGRDaGlsZChsYWJsV3JhcCk7XG4gICAgICAgICAgICByb290Tm9kZS5hZGRDaGlsZChoZWFkTm9kZSk7XG5cbiAgICAgICAgaGVhZE5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTix0aGlzLl9vbkhlYWRUcmlnZ2VyLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9MSVNUX1NJWkVfQ0hBTkdFLHRoaXMuX3BhcmVudCwnb25Hcm91cExpc3RTaXplQ2hhbmdlJyk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgIH1cblxuICAgIGlmKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICB0aGlzLmFkZFNjcm9sbFdyYXAoKTtcbiAgICB9XG5cbiAgICByb290Tm9kZS5hZGRDaGlsZCh3cmFwTm9kZSk7XG5cbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgaWYoIWxhYmVsKXtcbiAgICAgICAgICAgIHZhciBidWZmZXJUb3AgPSB0aGlzLl9zY3JvbGxCdWZmZXJUb3AgPSBuZXcgTm9kZSgpO1xuICAgICAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCdWZmZXIpO1xuXG4gICAgICAgICAgICByb290Tm9kZS5hZGRDaGlsZEF0KGJ1ZmZlclRvcCwwKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYnVmZmVyQm90dG9tID0gdGhpcy5fc2Nyb2xsQnVmZmVyQm90dG9tID0gbmV3IE5vZGUoKTtcbiAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCdWZmZXIpO1xuXG4gICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKGJ1ZmZlckJvdHRvbSk7XG4gICAgfVxuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0JFR0lOLCB0aGlzLCAnb25QYW5lbE1vdmVCZWdpbicpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRSwgdGhpcywgJ29uUGFuZWxNb3ZlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0VORCwgdGhpcywgJ29uUGFuZWxNb3ZlRW5kJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9ISURFLCB0aGlzLCAnb25QYW5lbEhpZGUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NIT1csIHRoaXMsICdvblBhbmVsU2hvdycpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfU0NST0xMX1dSQVBfQURERUQsIHRoaXMsICdvblBhbmVsU2Nyb2xsV3JhcEFkZGVkJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TQ1JPTExfV1JBUF9SRU1PVkVELCB0aGlzLCAnb25QYW5lbFNjcm9sbFdyYXBSZW1vdmVkJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TSVpFX0NIQU5HRSwgdGhpcywgJ29uUGFuZWxTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5XSU5ET1dfUkVTSVpFLCB0aGlzLCAnb25XaW5kb3dSZXNpemUnKTtcblxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLHRoaXMuX3BhcmVudCwnb25Hcm91cExpc3RTaXplQ2hhbmdlJyk7XG59XG5cbkdyb3VwLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQWJzdHJhY3RHcm91cC5wcm90b3R5cGUpO1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbE1vdmVCZWdpbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfQkVHSU4sIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsTW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkUsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsTW92ZUVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbFNjcm9sbFdyYXBBZGRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbFNjcm9sbFdyYXBSZW1vdmVkID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsSGlkZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LlNVQkdST1VQX0RJU0FCTEUsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2hvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LlNVQkdST1VQX0VOQUJMRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vbldpbmRvd1Jlc2l6ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KGUpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uU3ViR3JvdXBUcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuXG4gICAgaWYoIXRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHNjcm9sbEJhciA9IHRoaXMuX3Njcm9sbEJhcixcbiAgICAgICAgd3JhcE5vZGUgID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICB2YXIgYnVmZmVyVG9wICAgID0gdGhpcy5fc2Nyb2xsQnVmZmVyVG9wLFxuICAgICAgICBidWZmZXJCb3R0b20gPSB0aGlzLl9zY3JvbGxCdWZmZXJCb3R0b207XG5cbiAgICBzY3JvbGxCYXIudXBkYXRlKCk7XG5cbiAgICBpZiAoIXNjcm9sbEJhci5pc1ZhbGlkKCkpIHtcbiAgICAgICAgc2Nyb2xsQmFyLmRpc2FibGUoKTtcbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KHdyYXBOb2RlLmdldENoaWxkQXQoMSkuZ2V0SGVpZ2h0KCkpO1xuXG4gICAgICAgIGlmIChidWZmZXJUb3Ape1xuICAgICAgICAgICAgYnVmZmVyVG9wLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChidWZmZXJCb3R0b20pe1xuICAgICAgICAgICAgYnVmZmVyQm90dG9tLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzY3JvbGxCYXIuZW5hYmxlKCk7XG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodCh0aGlzLmdldE1heEhlaWdodCgpKTtcblxuICAgICAgICBpZiAoYnVmZmVyVG9wKXtcbiAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJ1ZmZlckJvdHRvbSl7XG4gICAgICAgICAgICBidWZmZXJCb3R0b20uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5fb25IZWFkVHJpZ2dlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gIXRoaXMuX2lzRGlzYWJsZWQ7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfTElTVF9TSVpFX0NIQU5HRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLmFkZENvbXBvbmVudCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIENsYXNzXyA9IGFyZ3VtZW50c1swXTtcbiAgICB2YXIgYXJncyAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgYXJncy5zaGlmdCgpO1xuICAgICAgICBhcmdzLnVuc2hpZnQodGhpcy5fZ2V0U3ViR3JvdXAoKSk7XG5cbiAgICB2YXIgaW5zdGFuY2UgPSBPYmplY3QuY3JlYXRlKENsYXNzXy5wcm90b3R5cGUpO1xuICAgIENsYXNzXy5hcHBseShpbnN0YW5jZSxhcmdzKTtcblxuICAgIHRoaXMuX2NvbXBvbmVudHMucHVzaChpbnN0YW5jZSk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuX3VwZGF0ZUhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9nZXRTdWJHcm91cCgpLnVwZGF0ZSgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSxudWxsKSk7XG4gICAgaWYodGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIHRoaXMuX3Njcm9sbEJhci51cGRhdGUoKTtcbiAgICB9XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuX3VwZGF0ZUFwcGVhcmFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIGluaWROb2RlID0gdGhpcy5faW5kaU5vZGU7XG5cbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyO1xuXG4gICAgdmFyIGJ1ZmZlclRvcCAgICA9IHRoaXMuX3Njcm9sbEJ1ZmZlclRvcCxcbiAgICAgICAgYnVmZmVyQm90dG9tID0gdGhpcy5fc2Nyb2xsQnVmZmVyQm90dG9tO1xuXG4gICAgaWYgKHRoaXMuaXNEaXNhYmxlZCgpKSB7XG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodCgwKTtcbiAgICAgICAgaWYgKGluaWROb2RlKXtcbiAgICAgICAgICAgIGluaWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkFycm93Qk1pbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2Nyb2xsQmFyKSB7XG4gICAgICAgICAgICBpZiAoYnVmZmVyVG9wKXtcbiAgICAgICAgICAgICAgICBidWZmZXJUb3Auc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYnVmZmVyQm90dG9tKXtcbiAgICAgICAgICAgICAgICBidWZmZXJCb3R0b20uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmhhc01heEhlaWdodCgpKSB7XG4gICAgICAgIHZhciBtYXhIZWlnaHQgPSB0aGlzLmdldE1heEhlaWdodCgpLFxuICAgICAgICAgICAgbGlzdEhlaWdodCA9IHdyYXBOb2RlLmdldENoaWxkQXQoMSkuZ2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KGxpc3RIZWlnaHQgPCBtYXhIZWlnaHQgPyBsaXN0SGVpZ2h0IDogbWF4SGVpZ2h0KTtcblxuICAgICAgICBpZiAoc2Nyb2xsQmFyLmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgaWYgKGJ1ZmZlclRvcCl7XG4gICAgICAgICAgICAgICAgYnVmZmVyVG9wLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChidWZmZXJCb3R0b20pe1xuICAgICAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHdyYXBOb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ2hlaWdodCcpO1xuICAgIH1cblxuICAgIGlmIChpbmlkTm9kZSl7XG4gICAgICAgIGluaWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkFycm93Qk1heCk7XG4gICAgfVxufTtcblxuR3JvdXAucHJvdG90eXBlLm9uR3JvdXBTaXplVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIHRoaXMuX3Njcm9sbEJhci51cGRhdGUoKTtcbiAgICB9XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuYWRkU3ViR3JvdXAgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgdGhpcy5fc3ViR3JvdXBzLnB1c2gobmV3IFN1Ykdyb3VwKHRoaXMsIHBhcmFtcykpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuR3JvdXAucHJvdG90eXBlLl9nZXRTdWJHcm91cCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ViR3JvdXBzID0gdGhpcy5fc3ViR3JvdXBzLFxuICAgICAgICBzdWJHcm91cHNMZW4gPSBzdWJHcm91cHMubGVuZ3RoO1xuXG4gICAgaWYgKHN1Ykdyb3Vwc0xlbiA9PSAwKXtcbiAgICAgICAgdGhyb3cgbmV3IEdyb3VwTm9TdWJHcm91cEVycm9yKCk7XG4gICAgfVxuICAgIHJldHVybiBzdWJHcm91cHNbc3ViR3JvdXBzTGVuIC0gMV07XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuZ2V0Q29tcG9uZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcG9uZW50cztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR3JvdXA7XG4iLCJ2YXIgR3JvdXBFdmVudCA9IHtcblx0R1JPVVBfU0laRV9DSEFOR0UgICAgICAgIDogJ2dyb3VwU2l6ZUNoYW5nZScsXG5cdEdST1VQX0xJU1RfU0laRV9DSEFOR0UgICA6ICdncm91cExpc3RTaXplQ2hhbmdlJyxcblx0R1JPVVBfU0laRV9VUERBVEUgICAgICAgIDogJ2dyb3VwU2l6ZVVwZGF0ZScsXG5cdFNVQkdST1VQX1RSSUdHRVIgICAgICAgICA6ICdzdWJHcm91cFRyaWdnZXInLFxuXG5cdENPTVBPTkVOVFNfRU5BQkxFICAgICAgICAgOiAnZW5hYmxlQ29tcG8nLFxuXHRDT01QT05FTlRTX0RJU0FCTEUgICAgICAgIDogJ2Rpc2FibGVDb21wcycsXG5cblx0U1VCR1JPVVBfRU5BQkxFICAgICAgICAgIDogJ2VuYWJsZVN1Ykdyb3VwJyxcblx0U1VCR1JPVVBfRElTQUJMRSAgICAgICAgIDogJ2Rpc2FibGVTdWJHcm91cCdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR3JvdXBFdmVudDsiLCJmdW5jdGlvbiBHcm91cE5vU3ViR3JvdXBFcnJvcigpIHtcblx0RXJyb3IuYXBwbHkodGhpcyk7XG5cdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsR3JvdXBOb1N1Ykdyb3VwRXJyb3IpO1xuXHR0aGlzLm5hbWUgPSAnUGFuZWxOb0dyb3VwRXJyb3InO1xuXHR0aGlzLm1lc3NhZ2UgPSAnR3JvdXAgaGFzIG5vIFN1Ykdyb3VwLic7XG59XG5Hcm91cE5vU3ViR3JvdXBFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5Hcm91cE5vU3ViR3JvdXBFcnJvci5jb25zdHJ1Y3RvciA9IEdyb3VwTm9TdWJHcm91cEVycm9yO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwTm9TdWJHcm91cEVycm9yOyIsInZhciBNZW51RXZlbnQgPSB7XG5cdFVQREFURV9NRU5VOiAndXBkYXRlTWVudSdcbn07XG5tb2R1bGUuZXhwb3J0cyA9IE1lbnVFdmVudDsiLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpLFxuICAgIEdyb3VwID0gcmVxdWlyZSgnLi9Hcm91cCcpLFxuICAgIFNjcm9sbEJhciA9IHJlcXVpcmUoJy4uL2NvcmUvbGF5b3V0L1Njcm9sbEJhcicpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBMYXlvdXRNb2RlID0gcmVxdWlyZSgnLi4vY29yZS9sYXlvdXQvTGF5b3V0TW9kZScpO1xudmFyIEhpc3RvcnkgPSByZXF1aXJlKCcuLi9jb3JlL0hpc3RvcnknKTtcblxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG4gICAgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIFBhbmVsRXZlbnQgPSByZXF1aXJlKCcuL1BhbmVsRXZlbnQnKSxcbiAgICBNZW51RXZlbnQgPSByZXF1aXJlKCcuL01lbnVFdmVudCcpO1xuXG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XG5cbnZhciBQYW5lbE5vR3JvdXBFcnJvciA9IHJlcXVpcmUoJy4vUGFuZWxOb0dyb3VwRXJyb3InKTtcblxudmFyIFN0cmluZ0lucHV0ID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1N0cmluZ0lucHV0JyksXG4gICAgTnVtYmVySW5wdXQgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvTnVtYmVySW5wdXQnKSxcbiAgICBSYW5nZSA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9SYW5nZScpLFxuICAgIENoZWNrYm94ID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0NoZWNrYm94JyksXG4gICAgQ29sb3IgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvQ29sb3InKSxcbiAgICBCdXR0b24gPSByZXF1aXJlKCcuLi9jb21wb25lbnQvQnV0dG9uJyksXG4gICAgU2VsZWN0ID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1NlbGVjdCcpLFxuICAgIFNsaWRlciA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TbGlkZXInKSxcbiAgICBGdW5jdGlvblBsb3R0ZXIgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvRnVuY3Rpb25QbG90dGVyJyksXG4gICAgUGFkID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1BhZCcpLFxuICAgIFZhbHVlUGxvdHRlciA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9WYWx1ZVBsb3R0ZXInKSxcbiAgICBOdW1iZXJPdXRwdXQgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvTnVtYmVyT3V0cHV0JyksXG4gICAgU3RyaW5nT3V0cHV0ID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1N0cmluZ091dHB1dCcpLFxuICAgIENhbnZhc18gPSByZXF1aXJlKCcuLi9jb21wb25lbnQvQ2FudmFzJyksXG4gICAgU1ZHXyA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TVkcnKTtcblxudmFyIERFRkFVTFRfUEFORUxfUE9TSVRJT04gPSBudWxsLFxuICAgIERFRkFVTFRfUEFORUxfV0lEVEggICAgICA9IDMwMCxcbiAgICBERUZBVUxUX1BBTkVMX0hFSUdIVCAgICAgPSBudWxsLFxuICAgIERFRkFVTFRfUEFORUxfV0lEVEhfTUlOICA9IDEwMCxcbiAgICBERUZBVUxUX1BBTkVMX1dJRFRIX01BWCAgPSA2MDAsXG4gICAgREVGQVVMVF9QQU5FTF9SQVRJTyAgICAgID0gNDAsXG4gICAgREVGQVVMVF9QQU5FTF9MQUJFTCAgICAgID0gJ0NvbnRyb2wgUGFuZWwnLFxuICAgIERFRkFVTFRfUEFORUxfVkFMSUdOICAgICA9IExheW91dE1vZGUuVE9QLFxuICAgIERFRkFVTFRfUEFORUxfQUxJR04gICAgICA9IExheW91dE1vZGUuUklHSFQsXG4gICAgREVGQVVMVF9QQU5FTF9ET0NLICAgICAgID0ge2FsaWduOkxheW91dE1vZGUuUklHSFQscmVzaXphYmxlOnRydWV9LFxuICAgIERFRkFVTFRfUEFORUxfRU5BQkxFICAgICA9IHRydWUsXG4gICAgREVGQVVMVF9QQU5FTF9PUEFDSVRZICAgID0gMS4wLFxuICAgIERFRkFVTFRfUEFORUxfRklYRUQgICAgICA9IHRydWUsXG4gICAgREVGQVVMVF9QQU5FTF9WQ09OU1RSQUlOID0gdHJ1ZTtcblxuZnVuY3Rpb24gUGFuZWwoY29udHJvbEtpdCxwYXJhbXMpe1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG4gICAgdGhpcy5fcGFyZW50ID0gY29udHJvbEtpdDtcblxuXG4gICAgcGFyYW1zICAgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy52YWxpZ24gICAgID0gcGFyYW1zLnZhbGlnbiAgICB8fCBERUZBVUxUX1BBTkVMX1ZBTElHTjtcbiAgICBwYXJhbXMuYWxpZ24gICAgICA9IHBhcmFtcy5hbGlnbiAgICAgfHwgREVGQVVMVF9QQU5FTF9BTElHTjtcbiAgICBwYXJhbXMucG9zaXRpb24gICA9IHBhcmFtcy5wb3NpdGlvbiAgfHwgREVGQVVMVF9QQU5FTF9QT1NJVElPTjtcbiAgICBwYXJhbXMud2lkdGggICAgICA9IHBhcmFtcy53aWR0aCAgICAgfHwgREVGQVVMVF9QQU5FTF9XSURUSDtcbiAgICBwYXJhbXMuaGVpZ2h0ICAgICA9IHBhcmFtcy5oZWlnaHQgICAgfHwgREVGQVVMVF9QQU5FTF9IRUlHSFQ7XG4gICAgcGFyYW1zLnJhdGlvICAgICAgPSBwYXJhbXMucmF0aW8gICAgIHx8IERFRkFVTFRfUEFORUxfUkFUSU87XG4gICAgcGFyYW1zLmxhYmVsICAgICAgPSBwYXJhbXMubGFiZWwgICAgIHx8IERFRkFVTFRfUEFORUxfTEFCRUw7XG4gICAgcGFyYW1zLm9wYWNpdHkgICAgPSBwYXJhbXMub3BhY2l0eSAgIHx8IERFRkFVTFRfUEFORUxfT1BBQ0lUWTtcbiAgICBwYXJhbXMuZml4ZWQgICAgICA9IHBhcmFtcy5maXhlZCAgICAgID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1BBTkVMX0ZJWEVEICAgICAgOiBwYXJhbXMuZml4ZWQ7XG4gICAgcGFyYW1zLmVuYWJsZSAgICAgPSBwYXJhbXMuZW5hYmxlICAgICA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9QQU5FTF9FTkFCTEUgICAgIDogcGFyYW1zLmVuYWJsZTtcbiAgICBwYXJhbXMudmNvbnN0cmFpbiA9IHBhcmFtcy52Y29uc3RyYWluID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1BBTkVMX1ZDT05TVFJBSU4gOiBwYXJhbXMudmNvbnN0cmFpbjtcblxuICAgIGlmIChwYXJhbXMuZG9jaykge1xuICAgICAgICBwYXJhbXMuZG9jay5hbGlnbiA9IHBhcmFtcy5kb2NrLmFsaWduIHx8IERFRkFVTFRfUEFORUxfRE9DSy5hbGlnbjtcbiAgICAgICAgcGFyYW1zLmRvY2sucmVzaXphYmxlID0gcGFyYW1zLmRvY2sucmVzaXphYmxlIHx8IERFRkFVTFRfUEFORUxfRE9DSy5yZXNpemFibGU7XG4gICAgfVxuXG4gICAgdGhpcy5fd2lkdGggICAgICA9IE1hdGgubWF4KERFRkFVTFRfUEFORUxfV0lEVEhfTUlOLFxuICAgICAgICAgICAgICAgICAgICAgICBNYXRoLm1pbihwYXJhbXMud2lkdGgsREVGQVVMVF9QQU5FTF9XSURUSF9NQVgpKTtcbiAgICB0aGlzLl9oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCA/ICBNYXRoLm1heCgwLE1hdGgubWluKHBhcmFtcy5oZWlnaHQsd2luZG93LmlubmVySGVpZ2h0KSkgOiBudWxsO1xuICAgIHRoaXMuX2ZpeGVkICAgICAgPSBwYXJhbXMuZml4ZWQ7XG4gICAgdGhpcy5fZG9jayAgICAgICA9IHBhcmFtcy5kb2NrO1xuICAgIHRoaXMuX3Bvc2l0aW9uICAgPSBwYXJhbXMucG9zaXRpb247XG4gICAgdGhpcy5fdkNvbnN0cmFpbiA9IHBhcmFtcy52Y29uc3RyYWluO1xuICAgIHRoaXMuX2xhYmVsICAgICAgPSBwYXJhbXMubGFiZWw7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9ICFwYXJhbXMuZW5hYmxlO1xuICAgIHRoaXMuX2dyb3VwcyAgICAgPSBbXTtcblxuXG4gICAgdmFyIHdpZHRoICAgID0gdGhpcy5fd2lkdGgsXG4gICAgICAgIGlzRml4ZWQgID0gdGhpcy5fZml4ZWQsXG4gICAgICAgIGRvY2sgICAgID0gdGhpcy5fZG9jayxcbiAgICAgICAgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbixcbiAgICAgICAgbGFiZWwgICAgPSB0aGlzLl9sYWJlbCxcbiAgICAgICAgYWxpZ24gICAgPSBwYXJhbXMuYWxpZ24sXG4gICAgICAgIG9wYWNpdHkgID0gcGFyYW1zLm9wYWNpdHk7XG5cblxuICAgIHZhciByb290Tm9kZSAgPSB0aGlzLl9ub2RlICAgICA9IG5ldyBOb2RlKCksXG4gICAgICAgIGhlYWROb2RlICA9IHRoaXMuX2hlYWROb2RlID0gbmV3IE5vZGUoKSxcbiAgICAgICAgbWVudU5vZGUgID0gICAgICAgICAgICAgICAgICBuZXcgTm9kZSgpLFxuICAgICAgICBsYWJsV3JhcCAgPSAgICAgICAgICAgICAgICAgIG5ldyBOb2RlKCksXG4gICAgICAgIGxhYmxOb2RlICA9ICAgICAgICAgICAgICAgICAgbmV3IE5vZGUoTm9kZS5TUEFOKSxcbiAgICAgICAgd3JhcE5vZGUgID0gdGhpcy5fd3JhcE5vZGUgPSBuZXcgTm9kZShOb2RlLkRJViksXG4gICAgICAgIGxpc3ROb2RlICA9IHRoaXMuX2xpc3ROb2RlID0gbmV3IE5vZGUoTm9kZS5MSVNUKTtcblxuICAgICAgICByb290Tm9kZS5zZXRTdHlsZUNsYXNzKENTUy5QYW5lbCk7XG4gICAgICAgIGhlYWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpO1xuICAgICAgICBtZW51Tm9kZS5zZXRTdHlsZUNsYXNzKENTUy5NZW51KTtcbiAgICAgICAgbGFibFdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG4gICAgICAgIGxhYmxOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKTtcbiAgICAgICAgd3JhcE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG4gICAgICAgIGxpc3ROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkdyb3VwTGlzdCk7XG5cbiAgICAgICAgcm9vdE5vZGUuc2V0V2lkdGgod2lkdGgpO1xuICAgICAgICBsYWJsTm9kZS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJyxsYWJlbCk7XG5cbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGQobWVudU5vZGUpO1xuICAgICAgICBsYWJsV3JhcC5hZGRDaGlsZChsYWJsTm9kZSk7XG4gICAgICAgIGhlYWROb2RlLmFkZENoaWxkKGxhYmxXcmFwKTtcbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQobGlzdE5vZGUpO1xuICAgICAgICByb290Tm9kZS5hZGRDaGlsZChoZWFkTm9kZSk7XG4gICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKHdyYXBOb2RlKTtcblxuICAgICAgICBjb250cm9sS2l0LmdldE5vZGUoKS5hZGRDaGlsZChyb290Tm9kZSk7XG5cblxuICAgIGlmICghZG9jaykge1xuXG4gICAgICAgIHZhciBtZW51SGlkZSA9IHRoaXMuX21lbnVIaWRlID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pO1xuICAgICAgICAgICAgbWVudUhpZGUuc2V0U3R5bGVDbGFzcyhDU1MuTWVudUJ0bkhpZGUpO1xuICAgICAgICAgICAgbWVudUhpZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25NZW51SGlkZU1vdXNlRG93bi5iaW5kKHRoaXMpKTtcblxuICAgICAgICBtZW51Tm9kZS5hZGRDaGlsZChtZW51SGlkZSk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3BhcmVudC5wYW5lbHNBcmVDbG9zYWJsZSgpKSB7XG4gICAgICAgICAgICB2YXIgbWVudUNsb3NlID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pO1xuICAgICAgICAgICAgbWVudUNsb3NlLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnVCdG5DbG9zZSk7XG4gICAgICAgICAgICBtZW51Q2xvc2UuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5kaXNhYmxlLmJpbmQodGhpcykpO1xuXG4gICAgICAgICAgICBtZW51Tm9kZS5hZGRDaGlsZChtZW51Q2xvc2UpO1xuICAgICAgICB9XG5cblxuICAgICAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSkge1xuICAgICAgICAgICAgdGhpcy5fYWRkU2Nyb2xsV3JhcCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpc0ZpeGVkKSB7XG4gICAgICAgICAgICBpZiAocG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICBpZiAoYWxpZ24gPT0gTGF5b3V0TW9kZS5MRUZUIHx8XG4gICAgICAgICAgICAgICAgICAgIGFsaWduID09IExheW91dE1vZGUuVE9QIHx8XG4gICAgICAgICAgICAgICAgICAgIGFsaWduID09IExheW91dE1vZGUuQk9UVE9NKSB7XG4gICAgICAgICAgICAgICAgICAgIHJvb3ROb2RlLnNldFBvc2l0aW9uR2xvYmFsKHBvc2l0aW9uWzBdLCBwb3NpdGlvblsxXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByb290Tm9kZS5zZXRQb3NpdGlvbkdsb2JhbCh3aW5kb3cuaW5uZXJXaWR0aCAtIHdpZHRoIC0gcG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcG9zaXRpb24gPSByb290Tm9kZS5nZXRQb3NpdGlvbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgdGhpcy5fcG9zaXRpb24gPSByb290Tm9kZS5nZXRQb3NpdGlvbigpO1xuXG4gICAgICAgICAgICB0aGlzLl9tb3VzZU9mZnNldCA9IFswLCAwXTtcblxuICAgICAgICAgICAgcm9vdE5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgncG9zaXRpb24nLCAnYWJzb2x1dGUnKTtcbiAgICAgICAgICAgIGhlYWROb2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uSGVhZERyYWdTdGFydC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIHZhciBwb3NpdGlvblggPSBwb3NpdGlvblswXSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb25ZID0gcG9zaXRpb25bMV07XG5cbiAgICAgICAgICAgICAgICBpZiAocG9zaXRpb25ZICE9IDApcm9vdE5vZGUuc2V0UG9zaXRpb25ZKHBvc2l0aW9uWSk7XG4gICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uWCAhPSAwKWlmIChhbGlnbiA9PSBMYXlvdXRNb2RlLlJJR0hUKXJvb3ROb2RlLmdldEVsZW1lbnQoKS5tYXJnaW5SaWdodCA9IHBvc2l0aW9uWDtcbiAgICAgICAgICAgICAgICBlbHNlIHJvb3ROb2RlLnNldFBvc2l0aW9uWChwb3NpdGlvblgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByb290Tm9kZS5zZXRTdHlsZVByb3BlcnR5KCdmbG9hdCcsIGFsaWduKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIGRvY2tBbGlnbm1lbnQgPSBkb2NrLmFsaWduO1xuXG4gICAgICAgIGlmIChkb2NrQWxpZ25tZW50ID09IExheW91dE1vZGUuTEVGVCB8fFxuICAgICAgICAgICAgZG9ja0FsaWdubWVudCA9PSBMYXlvdXRNb2RlLlJJR0hUKSB7XG4gICAgICAgICAgICBhbGlnbiA9IGRvY2tBbGlnbm1lbnQ7XG4gICAgICAgICAgICB0aGlzLl9oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZG9ja0FsaWdubWVudCA9PSBMYXlvdXRNb2RlLlRPUCB8fFxuICAgICAgICAgICAgZG9ja0FsaWdubWVudCA9PSBMYXlvdXRNb2RlLkJPVFRPTSkge1xuXG4gICAgICAgIH1cblxuICAgICAgICAvKlxuICAgICAgICAgaWYoZG9jay5yZXNpemFibGUpXG4gICAgICAgICB7XG4gICAgICAgICB2YXIgc2l6ZUhhbmRsZSA9IG5ldyBDb250cm9sS2l0Lk5vZGUoQ29udHJvbEtpdC5Ob2RlVHlwZS5ESVYpO1xuICAgICAgICAgc2l6ZUhhbmRsZS5zZXRTdHlsZUNsYXNzKENvbnRyb2xLaXQuQ1NTLlNpemVIYW5kbGUpO1xuICAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQoc2l6ZUhhbmRsZSk7XG4gICAgICAgICB9XG4gICAgICAgICAqL1xuXG4gICAgICAgIHJvb3ROb2RlLnNldFN0eWxlUHJvcGVydHkoJ2Zsb2F0JywgYWxpZ24pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wYXJlbnQuaGlzdG9yeUlzRW5hYmxlZCgpKSB7XG4gICAgICAgIHZhciBtZW51VW5kbyA9IHRoaXMuX21lbnVVbmRvID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pO1xuICAgICAgICAgICAgbWVudVVuZG8uc2V0U3R5bGVDbGFzcyhDU1MuTWVudUJ0blVuZG8pO1xuICAgICAgICAgICAgbWVudVVuZG8uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgICAgICBtZW51VW5kby5zZXRQcm9wZXJ0eSgndmFsdWUnLCBIaXN0b3J5LmdldEluc3RhbmNlKCkuZ2V0TnVtU3RhdGVzKCkpO1xuICAgICAgICAgICAgbWVudU5vZGUuYWRkQ2hpbGRBdChtZW51VW5kbywgMCk7XG5cbiAgICAgICAgICAgIG1lbnVVbmRvLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uTWVudVVuZG9UcmlnZ2VyLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgaGVhZE5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfT1ZFUiwgdGhpcy5fb25IZWFkTW91c2VPdmVyLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgaGVhZE5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfT1VULCB0aGlzLl9vbkhlYWRNb3VzZU91dC5iaW5kKHRoaXMpKVxuICAgIH1cblxuICAgIGlmIChvcGFjaXR5ICE9IDEuMCAmJiBvcGFjaXR5ICE9IDAuMCkge1xuICAgICAgICByb290Tm9kZS5zZXRTdHlsZVByb3BlcnR5KCdvcGFjaXR5Jywgb3BhY2l0eSk7XG4gICAgfVxuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoTWVudUV2ZW50LlVQREFURV9NRU5VLCAgICAgIHRoaXMsICdvblVwZGF0ZU1lbnUnKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsdGhpcy5fb25XaW5kb3dSZXNpemUuYmluZCh0aGlzKSk7XG59XG5cblBhbmVsLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5cblxuUGFuZWwucHJvdG90eXBlLl9vbk1lbnVIaWRlTW91c2VEb3duID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSAhdGhpcy5faXNEaXNhYmxlZDtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX3VwZGF0ZUFwcGVhcmFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgaGVhZE5vZGUgPSB0aGlzLl9oZWFkTm9kZSxcbiAgICAgICAgbWVudUhpZGUgPSB0aGlzLl9tZW51SGlkZTtcblxuICAgIGlmICh0aGlzLl9pc0Rpc2FibGVkKSB7XG4gICAgICAgIGhlYWROb2RlLmdldFN0eWxlKCkuYm9yZGVyQm90dG9tID0gJ25vbmUnO1xuXG4gICAgICAgIHJvb3ROb2RlLnNldEhlaWdodChoZWFkTm9kZS5nZXRIZWlnaHQoKSk7XG4gICAgICAgIG1lbnVIaWRlLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnVCdG5TaG93KTtcblxuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX0hJREUsIG51bGwpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJvb3ROb2RlLnNldEhlaWdodChoZWFkTm9kZS5nZXRIZWlnaHQoKSArIHRoaXMuX3dyYXBOb2RlLmdldEhlaWdodCgpKTtcbiAgICAgICAgcm9vdE5vZGUuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XG4gICAgICAgIG1lbnVIaWRlLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnVCdG5IaWRlKTtcbiAgICAgICAgaGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG5cbiAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9TSE9XLCBudWxsKSk7XG4gICAgfVxufTtcblxuUGFuZWwucHJvdG90eXBlLl9vbkhlYWRNb3VzZU92ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fbWVudVVuZG8uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdpbmxpbmUnKVxufTtcblBhbmVsLnByb3RvdHlwZS5fb25IZWFkTW91c2VPdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fbWVudVVuZG8uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJylcbn07XG5QYW5lbC5wcm90b3R5cGUub25VcGRhdGVNZW51ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX21lbnVVbmRvLnNldFByb3BlcnR5KCd2YWx1ZScsIEhpc3RvcnkuZ2V0SW5zdGFuY2UoKS5nZXROdW1TdGF0ZXMoKSk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX29uTWVudVVuZG9UcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xuICAgIEhpc3RvcnkuZ2V0SW5zdGFuY2UoKS5wb3BTdGF0ZSgpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLl9vbkhlYWREcmFnU3RhcnQgPSBmdW5jdGlvbigpXG57XG4gICAgdmFyIHBhcmVudE5vZGUgPSB0aGlzLl9wYXJlbnQuZ2V0Tm9kZSgpLFxuICAgICAgICBub2RlICAgICAgID0gdGhpcy5fbm9kZTtcblxuICAgIHZhciBub2RlUG9zICAgPSBub2RlLmdldFBvc2l0aW9uR2xvYmFsKCksXG4gICAgICAgIG1vdXNlUG9zICA9IE1vdXNlLmdldEluc3RhbmNlKCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgb2Zmc2V0UG9zID0gdGhpcy5fbW91c2VPZmZzZXQ7XG5cbiAgICAgICAgb2Zmc2V0UG9zWzBdID0gbW91c2VQb3NbMF0gLSBub2RlUG9zWzBdO1xuICAgICAgICBvZmZzZXRQb3NbMV0gPSBtb3VzZVBvc1sxXSAtIG5vZGVQb3NbMV07XG5cbiAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50TW91c2VVcCAgID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLl91cGRhdGVQb3NpdGlvbigpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0VORCwgbnVsbCkpO1xuICAgICAgICB9O1xuXG4gICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICBwYXJlbnROb2RlLmFkZENoaWxkKCAgIG5vZGUpO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCAgICBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsICAgb25EcmFnRW5kLCBmYWxzZSk7XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLFBhbmVsRXZlbnQuUEFORUxfTU9WRV9CRUdJTixudWxsKSk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX3VwZGF0ZVBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBtb3VzZVBvcyA9IE1vdXNlLmdldEluc3RhbmNlKCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgb2Zmc2V0UG9zID0gdGhpcy5fbW91c2VPZmZzZXQ7XG5cbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbjtcbiAgICBwb3NpdGlvblswXSA9IG1vdXNlUG9zWzBdIC0gb2Zmc2V0UG9zWzBdO1xuICAgIHBvc2l0aW9uWzFdID0gbW91c2VQb3NbMV0gLSBvZmZzZXRQb3NbMV07XG5cbiAgICB0aGlzLl9jb25zdHJhaW5IZWlnaHQoKTtcbiAgICB0aGlzLl9jb25zdHJhaW5Qb3NpdGlvbigpO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFLCBudWxsKSk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX29uV2luZG93UmVzaXplID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlzRG9ja2VkKCkpIHtcbiAgICAgICAgdmFyIGRvY2sgPSB0aGlzLl9kb2NrO1xuXG4gICAgICAgIGlmIChkb2NrLmFsaWduID09IExheW91dE1vZGUuUklHSFQgfHxcbiAgICAgICAgICAgIGRvY2suYWxpZ24gPT0gTGF5b3V0TW9kZS5MRUZUKSB7XG4gICAgICAgICAgICB2YXIgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0LFxuICAgICAgICAgICAgICAgIGxpc3RIZWlnaHQgPSB0aGlzLl9saXN0Tm9kZS5nZXRIZWlnaHQoKSxcbiAgICAgICAgICAgICAgICBoZWFkSGVpZ2h0ID0gdGhpcy5faGVhZE5vZGUuZ2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgICAgIHRoaXMuX2hlaWdodCA9IHdpbmRvd0hlaWdodDtcblxuICAgICAgICAgICAgaWYgKCh3aW5kb3dIZWlnaHQgLSBoZWFkSGVpZ2h0KSA+IGxpc3RIZWlnaHQpe1xuICAgICAgICAgICAgICAgIHRoaXMuX3Njcm9sbEJhci5kaXNhYmxlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuX3Njcm9sbEJhci5lbmFibGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9TSVpFX0NIQU5HRSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAoIXRoaXMuaXNGaXhlZCgpKXtcbiAgICAgICAgICAgIHRoaXMuX2NvbnN0cmFpblBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fY29uc3RyYWluSGVpZ2h0KCk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgRG9jdW1lbnRFdmVudC5XSU5ET1dfUkVTSVpFKSk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX2NvbnN0cmFpblBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBub2RlID0gdGhpcy5fbm9kZTtcblxuICAgIHZhciBtYXhYID0gd2luZG93LmlubmVyV2lkdGggLSBub2RlLmdldFdpZHRoKCksXG4gICAgICAgIG1heFkgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBub2RlLmdldEhlaWdodCgpO1xuXG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb247XG4gICAgcG9zaXRpb25bMF0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihwb3NpdGlvblswXSwgbWF4WCkpO1xuICAgIHBvc2l0aW9uWzFdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4ocG9zaXRpb25bMV0sIG1heFkpKTtcblxuICAgIG5vZGUuc2V0UG9zaXRpb25HbG9iYWwocG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fY29uc3RyYWluSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5fdkNvbnN0cmFpbilyZXR1cm47XG5cbiAgICB2YXIgaGFzTWF4SGVpZ2h0ID0gdGhpcy5oYXNNYXhIZWlnaHQoKSxcbiAgICAgICAgaGFzU2Nyb2xsV3JhcCA9IHRoaXMuaGFzU2Nyb2xsV3JhcCgpO1xuXG4gICAgdmFyIGhlYWROb2RlID0gdGhpcy5faGVhZE5vZGUsXG4gICAgICAgIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyO1xuXG4gICAgdmFyIHBhbmVsVG9wID0gdGhpcy5pc0RvY2tlZCgpID8gMCA6XG4gICAgICAgIHRoaXMuaXNGaXhlZCgpID8gMCA6XG4gICAgICAgICAgICB0aGlzLl9wb3NpdGlvblsxXTtcblxuICAgIHZhciBwYW5lbEhlaWdodCA9IGhhc01heEhlaWdodCA/IHRoaXMuZ2V0TWF4SGVpZ2h0KCkgOlxuICAgICAgICBoYXNTY3JvbGxXcmFwID8gc2Nyb2xsQmFyLmdldFRhcmdldE5vZGUoKS5nZXRIZWlnaHQoKSA6XG4gICAgICAgICAgICB3cmFwTm9kZS5nZXRIZWlnaHQoKTtcblxuICAgIHZhciBwYW5lbEJvdHRvbSA9IHBhbmVsVG9wICsgcGFuZWxIZWlnaHQ7XG4gICAgdmFyIGhlYWRIZWlnaHQgPSBoZWFkTm9kZS5nZXRIZWlnaHQoKTtcblxuICAgIHZhciB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQsXG4gICAgICAgIGhlaWdodERpZmYgPSB3aW5kb3dIZWlnaHQgLSBwYW5lbEJvdHRvbSAtIGhlYWRIZWlnaHQsXG4gICAgICAgIGhlaWdodFN1bTtcblxuICAgIGlmIChoZWlnaHREaWZmIDwgMC4wKSB7XG4gICAgICAgIGhlaWdodFN1bSA9IHBhbmVsSGVpZ2h0ICsgaGVpZ2h0RGlmZjtcblxuICAgICAgICBpZiAoIWhhc1Njcm9sbFdyYXApIHtcbiAgICAgICAgICAgIHRoaXMuX2FkZFNjcm9sbFdyYXAoaGVpZ2h0U3VtKTtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfU0NST0xMX1dSQVBfQURERUQsIG51bGwpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHNjcm9sbEJhci5zZXRXcmFwSGVpZ2h0KGhlaWdodFN1bSk7XG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodChoZWlnaHRTdW0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKCFoYXNNYXhIZWlnaHQgJiYgaGFzU2Nyb2xsV3JhcCkge1xuICAgICAgICAgICAgc2Nyb2xsQmFyLnJlbW92ZUZyb21QYXJlbnQoKTtcbiAgICAgICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKHRoaXMuX2xpc3ROb2RlKTtcbiAgICAgICAgICAgIHdyYXBOb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ2hlaWdodCcpO1xuXG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxCYXIgPSBudWxsO1xuXG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NDUk9MTF9XUkFQX1JFTU9WRUQsIG51bGwpKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblBhbmVsLnByb3RvdHlwZS5vbkdyb3VwTGlzdFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaGFzU2Nyb2xsV3JhcCgpKXtcbiAgICAgICAgdGhpcy5fdXBkYXRlU2Nyb2xsV3JhcCgpO1xuICAgIH1cbiAgICB0aGlzLl9jb25zdHJhaW5IZWlnaHQoKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fdXBkYXRlU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyLFxuICAgICAgICBoZWlnaHQgPSB0aGlzLmhhc01heEhlaWdodCgpID9cbiAgICAgICAgICAgIHRoaXMuZ2V0TWF4SGVpZ2h0KCkgOiAxMDAsXG4gICAgICAgIGxpc3RIZWlnaHQgPSB0aGlzLl9saXN0Tm9kZS5nZXRIZWlnaHQoKTtcblxuICAgIHdyYXBOb2RlLnNldEhlaWdodChsaXN0SGVpZ2h0IDwgaGVpZ2h0ID8gbGlzdEhlaWdodCA6IGhlaWdodCk7XG5cbiAgICBzY3JvbGxCYXIudXBkYXRlKCk7XG5cbiAgICBpZiAoIXNjcm9sbEJhci5pc1ZhbGlkKCkpIHtcbiAgICAgICAgc2Nyb2xsQmFyLmRpc2FibGUoKTtcbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KHdyYXBOb2RlLmdldENoaWxkQXQoMSkuZ2V0SGVpZ2h0KCkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2Nyb2xsQmFyLmVuYWJsZSgpO1xuICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQoaGVpZ2h0KTtcbiAgICB9XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX2FkZFNjcm9sbFdyYXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIGxpc3ROb2RlID0gdGhpcy5fbGlzdE5vZGUsXG4gICAgICAgIGhlaWdodCA9IGFyZ3VtZW50cy5sZW5ndGggPT0gMCA/XG4gICAgICAgICAgICB0aGlzLmdldE1heEhlaWdodCgpIDpcbiAgICAgICAgICAgIGFyZ3VtZW50c1swXTtcblxuICAgIHRoaXMuX3Njcm9sbEJhciA9IG5ldyBTY3JvbGxCYXIod3JhcE5vZGUsIGxpc3ROb2RlLCBoZWlnaHQpO1xuICAgIGlmICh0aGlzLmlzRW5hYmxlZCgpKXtcbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KGhlaWdodCk7XG4gICAgfVxufTtcblxuUGFuZWwucHJvdG90eXBlLmhhc1Njcm9sbFdyYXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Njcm9sbEJhciAhPSBudWxsO1xufTtcblxuXG5QYW5lbC5wcm90b3R5cGUucHJldmVudFNlbGVjdERyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmhhc1Njcm9sbFdyYXAoKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fd3JhcE5vZGUuZ2V0RWxlbWVudCgpLnNjcm9sbFRvcCA9IDA7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSBmYWxzZTtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9ub2RlLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSB0cnVlO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5pc0VuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICF0aGlzLl9pc0Rpc2FibGVkO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmlzRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzRGlzYWJsZWQ7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaGFzTWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQgIT0gbnVsbDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRNYXhIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5pc0RvY2tlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fZG9jaztcbn07XG5cblBhbmVsLnByb3RvdHlwZS5pc0ZpeGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9maXhlZDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRHcm91cHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dyb3Vwcztcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXROb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9ub2RlO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmdldExpc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xpc3ROb2RlO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmdldFdpZHRoID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl93aWR0aDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcG9zaXRpb247XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0UGFyZW50ID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fcGFyZW50O1xufTtcblxuUGFuZWwucHJvdG90eXBlLmFkZEdyb3VwID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgIHZhciBncm91cCA9IG5ldyBHcm91cCh0aGlzLCBwYXJhbXMpO1xuICAgIHRoaXMuX2dyb3Vwcy5wdXNoKGdyb3VwKTtcbiAgICBpZiAodGhpcy5pc0RvY2tlZCgpKXtcbiAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9TSVpFX0NIQU5HRSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblBhbmVsLnByb3RvdHlwZS5hZGRTdWJHcm91cCA9IGZ1bmN0aW9uKHBhcmFtcyl7XG4gICAgdmFyIGdyb3VwID0gdGhpcy5fZ3JvdXBzW3RoaXMuX2dyb3Vwcy5sZW5ndGggLSAxXTtcbiAgICBpZighZ3JvdXApe1xuICAgICAgICB0aHJvdyBuZXcgUGFuZWxOb0dyb3VwRXJyb3IoKTtcbiAgICB9XG4gICAgZ3JvdXAuYWRkU3ViR3JvdXAocGFyYW1zKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fYWRkQ29tcG9uZW50ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZ3JvdXAgPSB0aGlzLl9ncm91cHNbdGhpcy5fZ3JvdXBzLmxlbmd0aCAtIDFdO1xuICAgIGlmKCFncm91cCl7XG4gICAgICAgIHRocm93IG5ldyBQYW5lbE5vR3JvdXBFcnJvcigpO1xuICAgIH1cbiAgICBncm91cC5hZGRDb21wb25lbnQuYXBwbHkoZ3JvdXAsYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblBhbmVsLnByb3RvdHlwZS5hZGRTdHJpbmdJbnB1dCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFN0cmluZ0lucHV0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmFkZE51bWJlcklucHV0ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoTnVtYmVySW5wdXQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkUmFuZ2UgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChSYW5nZSxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5hZGRDaGVja2JveCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KENoZWNrYm94LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmFkZENvbG9yID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoQ29sb3Isb2JqZWN0LHZhbHVlLCBwYXJhbXMpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmFkZEJ1dHRvbiA9IGZ1bmN0aW9uIChsYWJlbCwgb25QcmVzcywgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChCdXR0b24sbGFiZWwsb25QcmVzcyxwYXJhbXMpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmFkZFNlbGVjdCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFNlbGVjdCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5hZGRTbGlkZXIgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcmFuZ2UsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoU2xpZGVyLG9iamVjdCx2YWx1ZSxyYW5nZSxwYXJhbXMpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmFkZEZ1bmN0aW9uUGxvdHRlciA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KEZ1bmN0aW9uUGxvdHRlcixvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5hZGRQYWQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChQYWQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkVmFsdWVQbG90dGVyID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoVmFsdWVQbG90dGVyLG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmFkZE51bWJlck91dHB1dCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KE51bWJlck91dHB1dCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5hZGRTdHJpbmdPdXRwdXQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChTdHJpbmdPdXRwdXQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkQ2FudmFzID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoQ2FudmFzXyxwYXJhbXMpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmFkZFNWRyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFNWR18scGFyYW1zKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGFuZWw7IiwidmFyIFBhbmVsRXZlbnQgPSB7XG5cdFBBTkVMX01PVkVfQkVHSU4gICAgICAgICAgOiAncGFuZWxNb3ZlQmVnaW4nLFxuXHRQQU5FTF9NT1ZFICAgICAgICAgICAgICAgIDogJ3BhbmVsTW92ZScsXG5cdFBBTkVMX01PVkVfRU5EICAgICAgICAgICAgOiAncGFuZWxNb3ZlRW5kJyxcblxuXHRQQU5FTF9TSE9XICAgICAgICAgICAgICAgIDogJ3BhbmVsU2hvdycsXG5cdFBBTkVMX0hJREUgICAgICAgICAgICAgICAgOiAncGFuZWxIaWRlJyxcblxuXHRQQU5FTF9TQ1JPTExfV1JBUF9BRERFRCAgIDogJ3BhbmVsU2Nyb2xsV3JhcEFkZGVkJyxcblx0UEFORUxfU0NST0xMX1dSQVBfUkVNT1ZFRCA6ICdwYW5lbFNjcm9sbFdyYXBSZW1vdmVkJyxcblxuXHRQQU5FTF9TSVpFX0NIQU5HRSAgICAgICAgOiAncGFuZWxTaXplQ2hhbmdlJ1xufTtcbm1vZHVsZS5leHBvcnRzID0gUGFuZWxFdmVudDsiLCJmdW5jdGlvbiBQYW5lbE5vR3JvdXBFcnJvcigpIHtcblx0RXJyb3IuYXBwbHkodGhpcyk7XG5cdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsUGFuZWxOb0dyb3VwRXJyb3IpO1xuXHR0aGlzLm5hbWUgPSAnUGFuZWxOb0dyb3VwRXJyb3InO1xuXHR0aGlzLm1lc3NhZ2UgPSAnUGFuZWwgaGFzIG5vIEdyb3VwLic7XG59XG5QYW5lbE5vR3JvdXBFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5QYW5lbE5vR3JvdXBFcnJvci5jb25zdHJ1Y3RvciA9IFBhbmVsTm9Hcm91cEVycm9yO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhbmVsTm9Hcm91cEVycm9yOyIsInZhciBBYnN0cmFjdEdyb3VwID0gcmVxdWlyZSgnLi9BYnN0cmFjdEdyb3VwJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIFBhbmVsRXZlbnQgPSByZXF1aXJlKCcuL1BhbmVsRXZlbnQnKSxcbiAgICBHcm91cEV2ZW50ID0gcmVxdWlyZSgnLi9Hcm91cEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIFN1Ykdyb3VwKHBhcmVudCxwYXJhbXMpe1xuICAgIHBhcmFtcyAgICAgICAgICAgID0gcGFyYW1zICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5sYWJlbCAgICAgID0gcGFyYW1zLmxhYmVsICAgIHx8IG51bGw7XG4gICAgcGFyYW1zLnVzZUxhYmVscyAgPSBwYXJhbXMudXNlTGFiZWxzICA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IHBhcmFtcy51c2VMYWJlbHM7XG5cbiAgICBBYnN0cmFjdEdyb3VwLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHZhciByb290Tm9kZSA9IHRoaXMuX25vZGUsXG4gICAgICAgIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIGxpc3ROb2RlID0gdGhpcy5fbGlzdE5vZGU7XG5cbiAgICAgICAgcm9vdE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU3ViR3JvdXApO1xuICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcblxuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChsaXN0Tm9kZSk7XG4gICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKHdyYXBOb2RlKTtcblxuICAgIHRoaXMuX3VzZUxhYmVscyAgPSBwYXJhbXMudXNlTGFiZWxzO1xuXG4gICAgdmFyIGxhYmVsID0gcGFyYW1zLmxhYmVsO1xuXG4gICAgaWYgKGxhYmVsICYmIGxhYmVsLmxlbmd0aCAhPSAwICYmIGxhYmVsICE9ICdub25lJykge1xuICAgICAgICB2YXIgaGVhZE5vZGUgPSB0aGlzLl9oZWFkTm9kZSA9IG5ldyBOb2RlKCksXG4gICAgICAgICAgICBsYWJsV3JhcCA9IG5ldyBOb2RlKCksXG4gICAgICAgICAgICBsYWJsTm9kZSA9IG5ldyBOb2RlKE5vZGUuU1BBTik7XG5cbiAgICAgICAgaGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG4gICAgICAgIGxhYmxXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuICAgICAgICBsYWJsTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XG5cbiAgICAgICAgbGFibE5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGxhYmVsKTtcblxuICAgICAgICBsYWJsV3JhcC5hZGRDaGlsZChsYWJsTm9kZSk7XG4gICAgICAgIGhlYWROb2RlLmFkZENoaWxkKGxhYmxXcmFwKTtcblxuXG4gICAgICAgIHZhciBpbmRpTm9kZSA9IHRoaXMuX2luZGlOb2RlID0gbmV3IE5vZGUoKTtcbiAgICAgICAgaW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCU3ViTWF4KTtcbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGRBdChpbmRpTm9kZSwgMCk7XG5cbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGRBdChoZWFkTm9kZSwgMCk7XG5cbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuU1VCR1JPVVBfVFJJR0dFUiwgdGhpcy5fcGFyZW50LCAnb25TdWJHcm91cFRyaWdnZXInKTtcbiAgICAgICAgaGVhZE5vZGUuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uSGVhZE1vdXNlRG93bi5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG5cbiAgICB9XG5cbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgdGhpcy5hZGRTY3JvbGxXcmFwKCk7XG4gICAgfVxuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5TVUJHUk9VUF9FTkFCTEUsICB0aGlzLCAnb25FbmFibGUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LlNVQkdST1VQX0RJU0FCTEUsIHRoaXMsICdvbkRpc2FibGUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCAgIHRoaXMsICdvblBhbmVsTW92ZUVuZCcpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsdGhpcywgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TSVpFX0NIQU5HRSx0aGlzLCAnb25QYW5lbFNpemVDaGFuZ2UnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsICAgIHRoaXMsICdvbldpbmRvd1Jlc2l6ZScpO1xuXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsdGhpcy5fcGFyZW50LCdvbkdyb3VwU2l6ZVVwZGF0ZScpO1xufVxuXG5TdWJHcm91cC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEFic3RyYWN0R3JvdXAucHJvdG90eXBlKTtcblxuLy9GSVhNRVxuU3ViR3JvdXAucHJvdG90eXBlLl9vbkhlYWRNb3VzZURvd24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9ICF0aGlzLl9pc0Rpc2FibGVkO1xuICAgIHRoaXMuX29uVHJpZ2dlcigpO1xuXG4gICAgdmFyIGV2ZW50ID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUCxcbiAgICAgICAgc2VsZiAgPSB0aGlzO1xuICAgIHZhciBvbkRvY3VtZW50TW91c2VVcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5fb25UcmlnZ2VyKCk7XG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIG9uRG9jdW1lbnRNb3VzZVVwKTtcbiAgICB9O1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudCxvbkRvY3VtZW50TW91c2VVcCk7XG59O1xuXG5TdWJHcm91cC5wcm90b3R5cGUuX29uVHJpZ2dlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLEdyb3VwRXZlbnQuU1VCR1JPVVBfVFJJR0dFUixudWxsKSk7XG59O1xuXG5cblN1Ykdyb3VwLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pc0Rpc2FibGVkKCkpIHtcbiAgICAgICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KDApO1xuICAgICAgICBpZiAodGhpcy5oYXNMYWJlbCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9oZWFkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkSW5hY3RpdmUpO1xuICAgICAgICAgICAgdGhpcy5faW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCU3ViTWluKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3dyYXBOb2RlLnNldEhlaWdodCh0aGlzLmdldE1heEhlaWdodCgpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3dyYXBOb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ2hlaWdodCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmhhc0xhYmVsKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2hlYWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpO1xuICAgICAgICAgICAgdGhpcy5faW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCU3ViTWF4KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblN1Ykdyb3VwLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICB0aGlzLl9zY3JvbGxCYXIudXBkYXRlKCk7XG4gICAgfVxufTtcblxuU3ViR3JvdXAucHJvdG90eXBlLm9uQ29tcG9uZW50U2VsZWN0RHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnByZXZlbnRTZWxlY3REcmFnKCk7XG59O1xuXG5TdWJHcm91cC5wcm90b3R5cGUub25FbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNEaXNhYmxlZCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkNPTVBPTkVOVFNfRU5BQkxFLCBudWxsKSk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLm9uRGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pc0Rpc2FibGVkKCkpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuQ09NUE9ORU5UU19ESVNBQkxFLCBudWxsKSk7XG59O1xuXG4vL2J1YmJsZVxuU3ViR3JvdXAucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIG51bGwpKTtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUub25Hcm91cFNpemVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSwgbnVsbCkpO1xufTtcblN1Ykdyb3VwLnByb3RvdHlwZS5vblBhbmVsTW92ZUVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCBudWxsKSk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUub25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoZSkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChlKTtcbn07XG5cblN1Ykdyb3VwLnByb3RvdHlwZS5oYXNMYWJlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faGVhZE5vZGUgIT0gbnVsbDtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUuYWRkQ29tcG9uZW50Tm9kZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgdGhpcy5fbGlzdE5vZGUuYWRkQ2hpbGQobm9kZSk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLnVzZXNMYWJlbHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3VzZUxhYmVscztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3ViR3JvdXA7Il19
(1)
});
