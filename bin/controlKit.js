!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.ControlKit=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var ControlKit = _dereq_('./lib/ControlKit');
	ControlKit.Canvas = _dereq_('./lib/component/Canvas');
	ControlKit.SVG = _dereq_('./lib/component/SVG');

module.exports = ControlKit;
},{"./lib/ControlKit":2,"./lib/component/Canvas":4,"./lib/component/SVG":21}],2:[function(_dereq_,module,exports){
var Node = _dereq_('./core/document/Node'),
    Panel = _dereq_('./group/Panel'),
    Options = _dereq_('./component/Options'),
    Picker = _dereq_('./component/Picker');

var CSS = _dereq_('./core/document/CSS');

var EventDispatcher = _dereq_('./core/event/EventDispatcher'),
    Event_ = _dereq_('./core/event/Event'),
    DocumentEvent = _dereq_('./core/document/DocumentEvent'),
    NodeEvent = _dereq_('./core/document/NodeEvent'),
    ComponentEvent = _dereq_('./core/ComponentEvent'),
    HistoryEvent = _dereq_('./core/HistoryEvent'),
    SelectEvent = _dereq_('./core/OptionEvent'),
    MenuEvent = _dereq_('./group/MenuEvent');

var History = _dereq_('./core/History');
var Mouse = _dereq_('./core/document/Mouse');

var ValuePlotter = _dereq_('./component/ValuePlotter');
var StringOutput = _dereq_('./component/StringOutput'),
    NumberOutput = _dereq_('./component/NumberOutput');

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
}

ControlKit.prototype = Object.create(EventDispatcher.prototype);

ControlKit.prototype._onTriggerDown = function () {
    this._node.setStyleProperty('visibility', this._isDisabled = !this._isDisabled ? 'hidden' : 'visible');
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
var instance = null;

var ControlKitGlobal = {
    setup : function(options){
        instance = new ControlKit(options);
    },
    update : function(){
        if(!instance){
            return;
        }
        instance.update();
    },
    addPanel : function(params){
        if(!instance){
            return undefined;
        }
        return instance.addPanel(params);
    },
    enable : function(){
        if(!instance){
            return;
        }
        instance.enable();
    },
    disable : function(){
        if(!instance){
            return;
        }
        instance.disable();
    },
    destroy : function(){
        instance = null;
    }
};

module.exports = ControlKitGlobal;
},{"./component/NumberOutput":13,"./component/Options":14,"./component/Picker":17,"./component/StringOutput":27,"./component/ValuePlotter":28,"./core/ComponentEvent":30,"./core/History":32,"./core/HistoryEvent":33,"./core/OptionEvent":37,"./core/document/CSS":42,"./core/document/DocumentEvent":43,"./core/document/Mouse":44,"./core/document/Node":45,"./core/document/NodeEvent":46,"./core/document/Style":47,"./core/event/Event":48,"./core/event/EventDispatcher":49,"./group/MenuEvent":55,"./group/Panel":56}],3:[function(_dereq_,module,exports){
var Event_ = _dereq_('../core/event/Event'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

var Node = _dereq_('../core/document/Node'),
    Component = _dereq_('../core/Component');

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

    var self = this;
    input.addEventListener(NodeEvent.ON_CLICK,
                           function() {
                               onPress();
                               self.dispatchEvent(new Event_(self,ComponentEvent.VALUE_UPDATED));
                           });

    this._wrapNode.addChild(input);
}
Button.prototype = Object.create(Component.prototype);

module.exports = Button;

},{"../core/Component":29,"../core/ComponentEvent":30,"../core/document/CSS":42,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48}],4:[function(_dereq_,module,exports){
var Component = _dereq_('../core/Component');
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

},{"../core/Component":29,"../core/Metric":34,"../core/document/CSS":42,"../core/event/Event":48,"../group/GroupEvent":54}],5:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent'),
    Node = _dereq_('../core/document/Node');

var Event_ = _dereq_('../core/event/Event'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

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
},{"../core/ComponentEvent":30,"../core/ObjectComponent":35,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48}],6:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('./../core/ObjectComponent');

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
	ComponentEvent = _dereq_('../core/ComponentEvent');

var ColorFormatError = _dereq_('../core/color/ColorFormatError');

var DEFAULT_COLOR_MODE = ColorMode.HEX,
	DEFAULT_PRESETS = null;

var MSG_COLOR_FORMAT_HEX = 'Color format should be hex. Set colorMode to rgb, rgbfv or hsv.',
	MSG_COLOR_FORMAT_RGB_RGBFV_HSV = 'Color format should be rgb, rgbfv or hsv. Set colorMode to hex.',
	MSG_COLOR_PRESET_FORMAT_HEX = 'Preset color format should be hex.',
	MSG_COLOR_PRESET_FORMAT_RGB_RGBFV_HSV = 'Preset color format should be rgb, rgbfv or hsv.';

function Color(parent, object, value, params) {
	ObjectComponent.apply(this, arguments);

	params = params || {};
	params.onChange = params.onChange || this._onChange;
	params.onFinish = params.onFinish || this._onFinish;
	params.presets = params.presets || DEFAULT_PRESETS;
	params.colorMode = params.colorMode || DEFAULT_COLOR_MODE;

	this._onChange = this._onFinish = params.onChange;
	this._presetsKey = params.presets;

	var color = this._color = new Node();
	value = this._value = this._object[this._key];

	var colorMode = this._colorMode = params.colorMode;

	this._validateColorFormat(value, MSG_COLOR_FORMAT_HEX, MSG_COLOR_FORMAT_RGB_RGBFV_HSV);

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
			this._validateColorFormat(presets[i], MSG_COLOR_PRESET_FORMAT_HEX,
				MSG_COLOR_PRESET_FORMAT_RGB_RGBFV_HSV);
		}

		var options = Options.get(),
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

	color.addEventListener(NodeEvent.MOUSE_DOWN, this._onColorTrigger.bind(this));

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

Color.prototype.applyValue = function () {
	this._object[this._key] = this._value;
	this._updateColor();
	this.dispatchEvent(new Event_(this, ComponentEvent.VALUE_UPDATED, null));
};

Color.prototype.onValueUpdate = function (e) {
	if (e.data.origin == this)return;
	this._value = this._object[this._key];
	this._updateColor();
};

Color.prototype._updateColor = function () {
	var color = this._value,
		colorNode = this._color,
		nodeColor;

	colorNode.setProperty('innerHTML', color);

	switch (this._colorMode) {
		case ColorMode.HEX:
			nodeColor = color;
			break;

		case ColorMode.RGB:
			nodeColor = ColorUtil.RGB2HEX(color[0], color[1], color[2]);
			break;

		case ColorMode.RGBfv:
			nodeColor = ColorUtil.RGBfv2HEX(color[0], color[1], color[2]);
			break;

		case ColorMode.HSV:
			nodeColor = ColorUtil.HSV2RGB(color[0], color[1], color[2]);
			break;
	}

	colorNode.getStyle().backgroundColor = nodeColor;
};

Color.prototype._validateColorFormat = function (value, msgHex, msgArr) {
	var colorMode = this._colorMode;


	if (colorMode == ColorMode.HEX && Object.prototype.toString.call(value) === '[object Array]' ||
		colorMode == ColorMode.HEX && Object.prototype.toString.call(value) === '[object Float32Array]') {
		throw new ColorFormatError(msgHex);
	}
	if ((colorMode == ColorMode.RGB ||
		colorMode == ColorMode.RGBfv ||
		colorMode == ColorMode.HSV) &&
		Object.prototype.toString.call(value) !== '[object Array]' ||
		colorMode == ColorMode.HSV &&
		Object.prototype.toString.call(value) !== '[object Float32Array]') {
		throw new ColorFormatError(msgArr);
	}
};

module.exports = Color;
},{"../core/ComponentEvent":30,"../core/Metric":34,"../core/color/ColorFormatError":39,"../core/color/ColorMode":40,"../core/color/ColorUtil":41,"../core/document/CSS":42,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./../core/ObjectComponent":35,"./Options":14,"./Picker":17,"./PresetBtn":19}],7:[function(_dereq_,module,exports){
var FunctionPlotType = {
    IMPLICIT: 'implicit',
    NON_IMPLICIT: 'nonImplicit'
};

module.exports = FunctionPlotType;
},{}],8:[function(_dereq_,module,exports){
var Plotter = _dereq_('./Plotter');

var Node = _dereq_('../core/document/Node');
var CSS = _dereq_('../core/document/CSS');
var FunctionPlotType = _dereq_('./FunctionPlotType');
var Preset = _dereq_('../core/Preset');

var Mouse = _dereq_('../core/document/Mouse');
var Metric = _dereq_('../core/Metric');

var DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent');

var FunctionPlotterObjectError = _dereq_('./FunctionPlotterObjectError'),
    FunctionPlotterFunctionArgsError = _dereq_('./FunctionPlotterFunctionArgsError');

var ObjectComponentNotifier = _dereq_('../core/ObjectComponentNotifier');

var DEFAULT_SHOW_MIN_MAX_LABELS = true;

function FunctionPlotter(parent, object, value, params) {
    params = params || {};
    params.showMinMaxLabels = params.showMinMaxLabels === undefined ? DEFAULT_SHOW_MIN_MAX_LABELS : params.showMinMaxLabels;

    Plotter.apply(this, arguments);

    if (typeof object[value] !== 'function') {
        throw new FunctionPlotterObjectError(object,value);
    }

    var funcArgLength = object[value].length;

    if (funcArgLength > 2 || funcArgLength == 0) {
        throw new FunctionPlotterFunctionArgsError();
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

    ObjectComponentNotifier.get().addEventListener(ComponentEvent.UPDATE_VALUE, this, 'onValueUpdate');
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
},{"../core/ComponentEvent":30,"../core/Metric":34,"../core/ObjectComponentNotifier":36,"../core/Preset":38,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/document/Node":45,"../core/document/NodeEvent":46,"./FunctionPlotType":7,"./FunctionPlotterFunctionArgsError":9,"./FunctionPlotterObjectError":10,"./Plotter":18}],9:[function(_dereq_,module,exports){
function FunctionPlotterFunctionArgsError(){
	Error.apply(this);
	Error.captureStackTrace(this,FunctionPlotterFunctionArgsError);
	this.name = 'FunctionPlotterFunctionArgsError';
	this.message = 'Function should be of form f(x) or f(x,y).';
}
FunctionPlotterFunctionArgsError.prototype = Object.create(Error.prototype);
FunctionPlotterFunctionArgsError.constructor = FunctionPlotterFunctionArgsError;

module.exports = FunctionPlotterFunctionArgsError;
},{}],10:[function(_dereq_,module,exports){
function FunctionPlotterObjectError(object,key){
	Error.apply(this);
	Error.captureStackTrace(this,FunctionPlotterObjectError);
	this.name = 'ComponentObjectError';
	this.message = 'Object ' + object.constructor.name + ' ' + key + 'should be of type Function.';
}
FunctionPlotterObjectError.prototype = Object.create(Error.prototype);
FunctionPlotterObjectError.constructor = FunctionPlotterObjectError;

module.exports = FunctionPlotterObjectError;
},{}],11:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent');
var NumberInput_Internal = _dereq_('./NumberInput_Internal');

var CSS = _dereq_('../core/document/CSS');
var Options = _dereq_('./Options');
var PresetBtn = _dereq_('./PresetBtn');
var Metric = _dereq_('../core/Metric');

var Node = _dereq_('../core/document/Node');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

var ObjectComponentNotifier = _dereq_('../core/ObjectComponentNotifier');

var DEFAULT_INPUT_DP     = 2,
    DEFAULT_INPUT_STEP   = 1,
    DEFAULT_INPUT_PRESET = null;

function NumberInput(parent,object,value,params) {
    ObjectComponent.apply(this,arguments);

    params          = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.dp       = params.dp       || DEFAULT_INPUT_DP;
    params.step     = params.step     || DEFAULT_INPUT_STEP;
    params.presets  = params.presets  || DEFAULT_INPUT_PRESET;

    this._onChange    = params.onChange;
    this._onFinish    = params.onFinish;
    this._presetsKey  = params.presets;


    var input = this._input = new NumberInput_Internal(params.step,
                                                       params.dp,
                                                       null,
                                                       this._onInputChange.bind(this),
                                                       this._onInputFinish.bind(this));

    var wrapNode = this._wrapNode;

    var presets =  params.presets;
    if (!presets) {
        wrapNode.addChild(input.getNode());
    }
    else {
        var inputWrap = new Node();
            inputWrap.setStyleClass(CSS.WrapInputWPreset);

        wrapNode.addChild(inputWrap);
        inputWrap.addChild(input.getNode());

        var options   = Options.get();
        var presetBtn = this._presetBtn = new PresetBtn(this._wrapNode);

        var onPresetDeactivate = function(){
            options.clear();
            presetBtn.deactivate();
        };

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

NumberInput.prototype.applyValue = function() {
    this.pushHistoryState();
    this._object[this._key] = this._input.getValue();
    this.dispatchEvent(new Event_(this,ComponentEvent.VALUE_UPDATED,null));
};

NumberInput.prototype.onValueUpdate = function (e) {
    if (e.data.origin == this){
        return;
    }
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
},{"../core/ComponentEvent":30,"../core/Metric":34,"../core/ObjectComponent":35,"../core/ObjectComponentNotifier":36,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./NumberInput_Internal":12,"./Options":14,"./PresetBtn":19}],12:[function(_dereq_,module,exports){
var EventDispatcher = _dereq_('../core/event/EventDispatcher');
var NodeEvent = _dereq_('../core/document/NodeEvent');
var Node = _dereq_('../core/document/Node');

var PRESET_SHIFT_MULTIPLIER  = 10;

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
    var step = (e.shiftKey ? PRESET_SHIFT_MULTIPLIER : 1) * this._valueStep,
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

},{"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/EventDispatcher":49}],13:[function(_dereq_,module,exports){
var Output = _dereq_('./Output');

var DEFAULT_OUTPUT_DP = 2;

function NumberOutput(parent, object, value, params) {
	params = params || {};
	params.dp = params.dp || DEFAULT_OUTPUT_DP;

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
			if (index > 0){
				out[i] = temp.slice(0, index + dp);
			}
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
},{"./Output":15}],14:[function(_dereq_,module,exports){
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

Options.setup = function(parentNode){return Options._instance = new Options(parentNode);};
Options.get   = function(){return Options._instance;};

module.exports = Options;
},{"../core/Metric":34,"../core/color/ColorMode":40,"../core/color/ColorUtil":41,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46}],15:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent');
var Node = _dereq_('../core/document/Node');

var CSS = _dereq_('../core/document/CSS');
var Metric = _dereq_('../core/Metric');
var ScrollBar = _dereq_('../core/layout/ScrollBar');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

var DEFAULT_HEIGHT = null,
    DEFAULT_WRAP   = false,
    DEFAULT_UPDATE = true;

function Output(parent,object,value,params) {
    ObjectComponent.apply(this,arguments);

    params            = params        || {};
    params.height     = params.height || DEFAULT_HEIGHT;
    params.wrap       = params.wrap   === undefined ?
                        DEFAULT_WRAP :
                        params.wrap;
    params.update     = params.update === undefined ?
                        DEFAULT_UPDATE :
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

},{"../core/ComponentEvent":30,"../core/Metric":34,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"../core/layout/ScrollBar":51}],16:[function(_dereq_,module,exports){
var Plotter = _dereq_('./Plotter');
var Mouse = _dereq_('../core/document/Mouse');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

var DEFAULT_BOUNDS_X = [-1,1],
    DEFAULT_BOUNDS_Y = [-1,1],
    DEFAULT_LABEL_X  = '',
    DEFAULT_LABEL_Y  = '';

function Pad(parent, object, value, params) {
    Plotter.apply(this,arguments);

    params            = params            || {};
    params.boundsX    = params.boundsX    || DEFAULT_BOUNDS_X;
    params.boundsY    = params.boundsY    || DEFAULT_BOUNDS_Y;
    params.labelX     = params.labelX     || DEFAULT_LABEL_X;
    params.labelY     = params.labelY     || DEFAULT_LABEL_Y;

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

},{"../core/ComponentEvent":30,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/event/Event":48,"./Plotter":18}],17:[function(_dereq_,module,exports){
var Node = _dereq_('../core/document/Node');

var CSS = _dereq_('../core/document/CSS');
var NumberInput_Internal = _dereq_('./NumberInput_Internal');
var Mouse = _dereq_('../core/document/Mouse');
var ColorUtil = _dereq_('../core/color/ColorUtil');
var DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent');

var DEFAULT_VALUE_HUE = 200.0,
    DEFAULT_VALUE_SAT = 50.0,
    DEFAULT_VALUE_VAL = 50.0;

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

    this._valueHue = DEFAULT_VALUE_HUE;
    this._valueSat = DEFAULT_VALUE_SAT;
    this._valueVal = DEFAULT_VALUE_VAL;
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
},{"../core/color/ColorUtil":41,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/document/Node":45,"../core/document/NodeEvent":46,"./NumberInput_Internal":12}],18:[function(_dereq_,module,exports){
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

},{"./SVGComponent":22}],19:[function(_dereq_,module,exports){
var EventDispatcher         = _dereq_('../core/event/EventDispatcher');
var ObjectComponentNotifier = _dereq_('../core/ObjectComponentNotifier');

var Event_      = _dereq_('../core/event/Event'),
    OptionEvent = _dereq_('../core/OptionEvent'),
    NodeEvent   = _dereq_('../core/document/NodeEvent');

var Node = _dereq_('../core/document/Node');
var CSS = _dereq_('../core/document/CSS');

function PresetBtn(parentNode) {
    EventDispatcher.apply(this);
    var btnNode  = this._btnNode = new Node(Node.INPUT_BUTTON),
        indiNode = this._indiNode = new Node();

    this._onActive = function () {};
    this._onDeactive = function () {};
    this._isActive = false;

    btnNode.setStyleClass(CSS.PresetBtn);
    btnNode.addEventListener(NodeEvent.MOUSE_DOWN, this._onMouseDown.bind(this));

    btnNode.addChild(indiNode);
    parentNode.addChildAt(btnNode, 0);

    ObjectComponentNotifier.get().addEventListener(OptionEvent.TRIGGER, this, 'onOptionTrigger');
    this.addEventListener(OptionEvent.TRIGGERED, ObjectComponentNotifier.get(), 'onOptionTriggered');
}

PresetBtn.prototype = Object.create(EventDispatcher.prototype);

PresetBtn.prototype.onOptionTrigger = function(e){
    if(e.data.origin == this){
        if(!this._isActive){
            this._onActive();
            this._btnNode.setStyleClass(CSS.PresetBtnActive);
            this._isActive = true;
        } else{
            this._onDeactive();
        }
        return;
    }

    if(this._isActive){
        this.deactivate();
    }
};

PresetBtn.prototype._onMouseDown = function(){
    this.dispatchEvent(new Event_(this, OptionEvent.TRIGGERED, null));
};

PresetBtn.prototype.setOnActive = function(func){
    this._onActive = func;
};

PresetBtn.prototype.setOnDeactive = function(func){
    this._onDeactive = func;
};

PresetBtn.prototype.deactivate = function(){
    this._isActive = false;
    this._btnNode.setStyleClass(CSS.PresetBtn);
};

module.exports = PresetBtn;

},{"../core/ObjectComponentNotifier":36,"../core/OptionEvent":37,"../core/document/CSS":42,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"../core/event/EventDispatcher":49}],20:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent');
var Node = _dereq_('../core/document/Node');
var NumberInput_Internal = _dereq_('./NumberInput_Internal');
var CSS = _dereq_('../core/document/CSS');

var Event_ = _dereq_('../core/event/Event'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

var DEFAULT_STEP = 1.0,
    DEFAULT_DP   = 2;

function Range(parent, object, value, params) {
    ObjectComponent.apply(this,arguments);

    params          = params          || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;

    params.step     = params.step || DEFAULT_STEP;
    params.dp       = params.dp   || DEFAULT_DP;

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
},{"../core/ComponentEvent":30,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/Node":45,"../core/event/Event":48,"./NumberInput_Internal":12}],21:[function(_dereq_,module,exports){
var Component = _dereq_('./../core/Component');
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
},{"../core/Metric":34,"../core/document/CSS":42,"../group/GroupEvent":54,"./../core/Component":29}],22:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent');
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
},{"../core/Metric":34,"../core/ObjectComponent":35,"../core/document/CSS":42,"../group/GroupEvent":54}],23:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent');
var Node = _dereq_('../core/document/Node');
var CSS  = _dereq_('../core/document/CSS');

var Options = _dereq_('./Options');

var Event_         = _dereq_('../core/event/Event'),
    NodeEvent      = _dereq_('../core/document/NodeEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent'),
    OptionEvent    = _dereq_('../core/OptionEvent');

var ObjectComponentNotifier = _dereq_('../core/ObjectComponentNotifier');

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
        select.addEventListener(NodeEvent.MOUSE_DOWN, this._onOptionTrigger.bind(this));

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

    ObjectComponentNotifier.get().addEventListener(OptionEvent.TRIGGER, this, 'onOptionTrigger');
    this.addEventListener(OptionEvent.TRIGGERED, ObjectComponentNotifier.get(), 'onOptionTriggered');
}

Select.prototype = Object.create(ObjectComponent.prototype);

Select.prototype.onOptionTrigger = function (e) {
    if (e.data.origin == this) {
        this._active = !this._active;
        this._updateAppearance();

        if (this._active) {
            this._buildOptions();
        }
        else {
            Options.get().clear();
        }

        return;
    }

    this._active = false;
    this._updateAppearance();
};

Select.prototype._buildOptions = function () {
    var options = Options.get();
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
    var index = Options.get().getSelectedIndex(),
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

Select.prototype._onOptionTrigger = function () {
    this.dispatchEvent(new Event_(this, OptionEvent.TRIGGERED, null));
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

module.exports = Select;

},{"../core/ComponentEvent":30,"../core/ObjectComponent":35,"../core/ObjectComponentNotifier":36,"../core/OptionEvent":37,"../core/document/CSS":42,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./Options":14}],24:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent');
var CSS = _dereq_('../core/document/CSS');
var Slider_Internal = _dereq_('./Slider_Internal');

var History = _dereq_('../core/History');
var Range = _dereq_('./Range');
var NumberInput_Internal = _dereq_('./NumberInput_Internal');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    PanelEvent = _dereq_('../group/PanelEvent'),
    GroupEvent = _dereq_('../group/GroupEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

var DEFAULT_STEP = 1.0,
    DEFAULT_DP   = 2;


function Slider(parent,object,value,range,params) {
    params          = params          || {};
    params.label    = params.label    || value;

    ObjectComponent.apply(this,[parent,object,range,params]);

    this._values  = this._object[this._key];
    this._targetKey = value;

    params.step     = params.step     || DEFAULT_STEP;
    params.dp       = params.dp       || DEFAULT_DP;
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
    this._parent.addEventListener(DocumentEvent.WINDOW_RESIZE,  this, 'onWindowResize');
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

    if (origin == this){
        return;
    }

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
},{"../core/ComponentEvent":30,"../core/History":32,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/event/Event":48,"../group/GroupEvent":54,"../group/PanelEvent":57,"./NumberInput_Internal":12,"./Range":20,"./Slider_Internal":25}],25:[function(_dereq_,module,exports){
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
}

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
},{"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/document/Node":45,"../core/document/NodeEvent":46}],26:[function(_dereq_,module,exports){
var ObjectComponent = _dereq_('../core/ObjectComponent');
var Node = _dereq_('../core/document/Node');
var CSS = _dereq_('../core/document/CSS');
var Options = _dereq_('./Options');
var PresetBtn = _dereq_('./PresetBtn');
var Metric = _dereq_('../core/Metric');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    ComponentEvent =  _dereq_('../core/ComponentEvent');

var DEFAULT_PRESET = null;

function StringInput(parent,object,value,params) {
    ObjectComponent.apply(this,arguments);

    params          = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.presets  = params.presets  || DEFAULT_PRESET;

    this._onChange   = params.onChange;
    this._onFinish   = params.onFinish;

    var input = this._input = new Node(Node.INPUT_TEXT);

    var wrapNode = this._wrapNode;

    var presets = params.presets;
    if (!presets) {
        wrapNode.addChild(input);
    }
    else {
        var inputWrap = new Node();
        inputWrap.setStyleClass(CSS.WrapInputWPreset);

        wrapNode.addChild(inputWrap);
        inputWrap.addChild(input);

        var options = Options.get(),
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
},{"../core/ComponentEvent":30,"../core/Metric":34,"../core/ObjectComponent":35,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./Options":14,"./PresetBtn":19}],27:[function(_dereq_,module,exports){
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

},{"./Output":15}],28:[function(_dereq_,module,exports){
var Plotter = _dereq_('./Plotter');
var Metric = _dereq_('../core/Metric');

var DEFAULT_RESOLUTION = 1;

function ValuePlotter(parent,object,value,params) {
    Plotter.apply(this,arguments);

    var svg       = this._svg,
        svgWidth  = Number(svg.getAttribute('width')),
        svgHeight = Number(svg.getAttribute('height'));

    params            = params            || {};
    params.height     = params.height     || svgHeight;
    params.resolution = params.resolution || DEFAULT_RESOLUTION;

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


},{"../core/Metric":34,"./Plotter":18}],29:[function(_dereq_,module,exports){
var Node = _dereq_('./document/Node');
var CSS = _dereq_('./document/CSS');
var EventDispatcher = _dereq_('./event/EventDispatcher'),
    GroupEvent = _dereq_('../group/GroupEvent');
var ComponentEvent = _dereq_('./ComponentEvent');

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

    this._parent.addEventListener(ComponentEvent.ENABLE, this,'onEnable');
    this._parent.addEventListener(ComponentEvent.DISABLE,this,'onDisable');
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
},{"../group/GroupEvent":54,"./ComponentEvent":30,"./document/CSS":42,"./document/Node":45,"./event/EventDispatcher":49}],30:[function(_dereq_,module,exports){
var ComponentEvent = {
	VALUE_UPDATED: 'valueUpdated',
	UPDATE_VALUE: 'updateValue',

	INPUT_SELECT_DRAG: 'inputSelectDrag',

	ENABLE  : 'enable',
	DISABLE : 'disable'
};

module.exports = ComponentEvent;
},{}],31:[function(_dereq_,module,exports){
function ComponentObjectError(object,key) {
	Error.apply(this);
	Error.captureStackTrace(this,ComponentObjectError);
	this.name = 'ComponentObjectError';
	this.message = 'Object of type ' + object.constructor.name + ' has no member ' + key + '.';
}
ComponentObjectError.prototype = Object.create(Error.prototype);
ComponentObjectError.constructor = ComponentObjectError;

module.exports = ComponentObjectError;
},{}],32:[function(_dereq_,module,exports){
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

    this.dispatchEvent(new Event_(this, HistoryEvent.STATE_POP, null));
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
},{"./HistoryEvent":33,"./event/Event":48,"./event/EventDispatcher":49}],33:[function(_dereq_,module,exports){
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
var Component = _dereq_('./Component');
var History = _dereq_('./History');
var ComponentEvent = _dereq_('./ComponentEvent');
var ObjectComponentNotifier = _dereq_('./ObjectComponentNotifier');
var ComponentObjectError = _dereq_('./ComponentObjectError');


function ObjectComponent(parent,object,key,params) {
    if(object[key] === undefined){
        throw new ComponentObjectError(object,key);
    }

    params       = params || {};
    params.label = params.label || key;

    Component.apply(this,[parent,params.label]);

    this._object   = object;
    this._key      = key;

    this._onChange = function(){};
    this._onFinish = function(){};

    ObjectComponentNotifier.get().addEventListener(ComponentEvent.UPDATE_VALUE, this,'onValueUpdate');
    this.addEventListener(ComponentEvent.VALUE_UPDATED, ObjectComponentNotifier.get(), 'onValueUpdated');
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

},{"./Component":29,"./ComponentEvent":30,"./ComponentObjectError":31,"./History":32,"./ObjectComponentNotifier":36}],36:[function(_dereq_,module,exports){
var EventDispatcher = _dereq_('./event/EventDispatcher'),
	Event_ 			= _dereq_('./event/Event');
var ComponentEvent  = _dereq_('./ComponentEvent'),
	OptionEvent		= _dereq_('./OptionEvent');

function ObjectComponentNotifier(){
	EventDispatcher.apply(this);
}
ObjectComponentNotifier.prototype = Object.create(EventDispatcher.prototype);

ObjectComponentNotifier.prototype.onValueUpdated = function (e) {
	this.dispatchEvent(new Event_(this, ComponentEvent.UPDATE_VALUE, {origin: e.sender}));
};

ObjectComponentNotifier.prototype.onOptionTriggered = function(e) {
	this.dispatchEvent(new Event_(this, OptionEvent.TRIGGER, {origin: e.sender}));
};

var instance = null;

ObjectComponentNotifier.get = function(){
	if(!instance){
		instance = new ObjectComponentNotifier();
	}
	return instance;
};

ObjectComponentNotifier.destroy = function(){
	instance = null;
};

module.exports = ObjectComponentNotifier;
},{"./ComponentEvent":30,"./OptionEvent":37,"./event/Event":48,"./event/EventDispatcher":49}],37:[function(_dereq_,module,exports){
var OptionEvent = {
	TRIGGERED: 'selectTrigger',
	TRIGGER: 'triggerSelect'
};
module.exports = OptionEvent;
},{}],38:[function(_dereq_,module,exports){
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
},{}],39:[function(_dereq_,module,exports){
function ColorFormatError(msg) {
	Error.apply(this);
	Error.captureStackTrace(this,ColorFormatError);
	this.name = 'ColorFormatError';
	this.message = msg;
}
ColorFormatError.prototype = Object.create(Error.prototype);
ColorFormatError.constructor = ColorFormatError;

module.exports = ColorFormatError;
},{}],40:[function(_dereq_,module,exports){
var ColorMode = {
	RGB: 'rgb',
	HSV: 'hsv',
	HEX: 'hex',
	RGBfv: 'rgbfv'
};

module.exports = ColorMode;
},{}],41:[function(_dereq_,module,exports){
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
},{}],42:[function(_dereq_,module,exports){
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

    HeadInactive : 'headInactive',
    PanelHeadInactive : 'panelHeadInactive',

    GroupList : 'groupList',
    Group     : 'group',
    SubGroupList  : 'subGroupList',
    SubGroup      : 'subGroup',


    TextAreaWrap : 'textAreaWrap',

    IconArrowUpBig : 'iconArrowUpBig',

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

    Select       : 'select',
    SelectActive : 'selectActive',

    Options         : 'options',
    OptionsSelected : 'liSelected',

    SelectColor : 'selectColor',

    PresetBtn        : 'presetBtn',
    PresetBtnActive  : 'presetBtnActive',

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

    ScrollBar        : 'scrollBar',
    ScrollWrap       : 'scrollWrap',
    ScrollBarBtnUp   : 'btnUp',
    ScrollBarBtnDown : 'btnDown',
    ScrollBarTrack   : 'track',
    ScrollBarThumb   : 'thumb',
    ScrollBuffer     : 'scrollBuffer',

    Trigger : 'controlKitTrigger',

    SizeHandle : 'sizeHandle'
};

module.exports = CSS;

},{}],43:[function(_dereq_,module,exports){
var DocumentEvent = {
    MOUSE_MOVE : 'mousemove',
    MOUSE_UP   : 'mouseup',
    MOUSE_DOWN : 'mousedown',

    WINDOW_RESIZE : 'resize'
};

module.exports = DocumentEvent;
},{}],44:[function(_dereq_,module,exports){
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
},{"./DocumentEvent":43}],45:[function(_dereq_,module,exports){
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

},{}],46:[function(_dereq_,module,exports){
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
},{}],47:[function(_dereq_,module,exports){
var Style = { 
	string : "/*------------------------------------------------------------------------------------- * Panel *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Components *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Canvas *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * ScrollBar *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Group & subGroup *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Menu *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Options *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Picker *-------------------------------------------------------------------------------------*/body {  margin: 0;  padding: 0; }#controlKit {  position: absolute;  top: 0;  left: 0;  width: 100%;  height: 100%;  user-select: none; }  #controlKit * {    outline: 0; }  #controlKit .panel input[type='text'],  #controlKit .panel textarea,  #controlKit .panel .color,  #controlKit .picker input[type='text'] {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    height: 25px;    width: 100%;    padding: 0 0 0 8px;    font-family: arial, sans-serif;    font-size: 11px;    color: white;    text-shadow: 1px 1px black;    background: #222729;    background-image: -o-linear-gradient(transparent 0%, rgba(0, 0, 0, 0.125) 100%);    background-image: linear-gradient(transparent 0%, rgba(0, 0, 0, 0.125) 100%);    border: none;    box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;    border-radius: 2px;    -moz-border-radius: 2px;    border-bottom: 1px solid #3b4447;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -o-user-select: none; }  #controlKit .panel .color {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    width: 100%;    height: 25px;    line-height: 25px;    background: #fff;    text-align: center;    padding: 0;    -webkit-touch-callout: none;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none;    cursor: pointer;    border: none;    box-shadow: 0 0 0 1px #111314 inset;    border-radius: 2px;    -moz-border-radius: 2px;    border-bottom: 1px solid #3b4447; }  #controlKit .panel .button,  #controlKit .picker .button,  #controlKit .panel .select,  #controlKit .panel .selectActive {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    width: 100%;    height: 26px;    margin: -2px 0 0 0;    cursor: pointer;    background: #3c494e;    background-image: -o-linear-gradient(rgba(34, 39, 41, 0) 0%, rgba(34, 39, 41, 0.65) 100%);    background-image: linear-gradient(rgba(34, 39, 41, 0) 0%, rgba(34, 39, 41, 0.65) 100%);    font-family: arial, sans-serif;    color: white;    border: none;    border-radius: 2px;    -moz-border-radius: 2px;    box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #323a44 inset;    border-bottom: 1px solid #3b4447;    outline: 0; }  #controlKit .panel .button, #controlKit .picker .button {    font-size: 10px;    font-weight: bold;    text-shadow: 0 -1px black;    text-transform: uppercase; }    #controlKit .panel .button:hover, #controlKit .picker .button:hover {      background-image: none; }    #controlKit .panel .button:active, #controlKit .picker .button:active {      background-image: -o-linear-gradient(rgba(0, 0, 0, 0.1) 0%, transparent 100%);      background-image: linear-gradient(rgba(0, 0, 0, 0.1) 0%, transparent 100%); }  #controlKit .panel {    position: relative;    z-index: 1;    margin: 0;    padding: 0;    width: 300px;    background-color: #303639;    box-shadow: 0 0 1px 1px rgba(0, 0, 0, 0.25);    font-family: arial, sans-serif;    -webkit-touch-callout: none;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none;    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    border-radius: 2px;    -moz-border-radius: 2px;    overflow: hidden;    opacity: 1.0;    float: left; }    #controlKit .panel textarea {      padding: 5px 8px 2px 8px;      overflow: hidden;      resize: none;      vertical-align: top;      white-space: nowrap; }    #controlKit .panel input[type='checkbox'] {      margin: 5px 0 0 0; }    #controlKit .panel .select, #controlKit .panel .selectActive {      padding-left: 10px;      padding-right: 20px;      font-size: 11px;      text-align: left;      text-shadow: 1px 1px black;      cursor: pointer;      overflow: hidden;      white-space: nowrap;      text-overflow: ellipsis; }    #controlKit .panel .select {      background: url(data:image/png;base64,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) 100% 50% no-repeat, -o-linear-gradient(#3a464b 0%, rgba(44, 52, 55, 0) 100%);      background: url(data:image/png;base64,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) 100% 50% no-repeat, linear-gradient(#3a464b 0%, rgba(44, 52, 55, 0) 100%); }    #controlKit .panel .select:hover, #controlKit .panel .selectActive {      background: url(data:image/png;base64,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) 100% 50% no-repeat, #3c494e; }    #controlKit .panel .presetBtn, #controlKit .panel .presetBtnActive {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      position: absolute;      right: 0;      width: 20px;      height: 25px;      margin: 0 0 0 0;      cursor: pointer;      float: right;      border: none;      border-top-right-radius: 2px;      border-bottom-right-radius: 2px;      box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #323a44 inset;      border-bottom: 1px solid #3b4447; }    #controlKit .panel .presetBtnActive, #controlKit .panel .presetBtn:hover {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #3c494e; }    #controlKit .panel .presetBtn {      background: url(data:image/png;base64,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) 50% 50% no-repeat, -o-linear-gradient(#3a464b 0%, #2c3437 100%);      background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAG5JREFUeNpi5ODiamRgYKhjwA4amVx8gxjmL1rC8P3rVxQ8b+ESBhffIAZmNR29A5evXWdiZGC019XSZGBgYGBYvmY9w7I16xoZGBgaWKBG1S9bs+4/AwNDPQMDA1ySgYGBgdEnPAbZzgY0mgEwAE9lJT1lrsffAAAAAElFTkSuQmCC) 50% 50% no-repeat, linear-gradient(#3a464b 0%, #2c3437 100%); }    #controlKit .panel .scrollBar {      -webkit-box-sizing: content-box;      -moz-box-sizing: content-box;      box-sizing: content-box;      width: 17px;      height: 100%;      float: right;      top: 0;      padding: 0;      margin: 0;      position: relative;      background: #212628;      background-image: linear-gradient(to right, #15181a 0%, rgba(26, 29, 31, 0) 100%); }      #controlKit .panel .scrollBar .track {        padding: 0 3px 0 2px; }        #controlKit .panel .scrollBar .track .thumb {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          width: 13px;          position: absolute;          cursor: pointer;          background: #3b484e;          background-image: -o-linear-gradient(#3a4145 0%, #363c40 100%);          background-image: linear-gradient(#3a4145 0%, #363c40 100%);          border: 1px solid #15181a;          border-radius: 2px;          -moz-border-radius: 2px;          box-shadow: inset 0 1px 0 0 #434b50; }    #controlKit .panel .wrap {      width: auto;      height: auto;      margin: 0;      padding: 0;      position: relative;      overflow: hidden; }    #controlKit .panel .inputWPresetWrap, #controlKit .panel .colorWPresetWrap {      width: 100%;      float: left; }    #controlKit .panel .inputWPresetWrap input[type='text'], #controlKit .panel .colorWPresetWrap .color {      padding-right: 25px;      border-top-right-radius: 2px;      border-bottom-right-radius: 2px;      float: left; }    #controlKit .panel .textAreaWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 100%;      padding: 0;      float: left;      height: 100%;      overflow: hidden;      border-radius: 2px;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447;      background-color: #222729;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      background-image: -o-linear-gradient(transparent 0%, rgba(0, 0, 0, 0.125) 100%);      background-image: linear-gradient(transparent 0%, rgba(0, 0, 0, 0.125) 100%); }      #controlKit .panel .textAreaWrap textarea {        border: none;        border-top-right-radius: 0;        border-bottom-right-radius: 0;        border-radius: 2px;        -moz-border-radius: 2px;        box-shadow: none;        background: none; }      #controlKit .panel .textAreaWrap .scrollBar {        border: 1px solid #101213;        border-bottom-right-radius: 2px;        border-top-right-radius: 2px;        border-left: none;        box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset; }    #controlKit .panel .graphSliderXWrap, #controlKit .panel .graphSliderYWrap {      position: absolute;      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box; }    #controlKit .panel .graphSliderXWrap {      bottom: 0;      left: 0;      width: 100%;      padding: 6px 20px 6px 6px; }    #controlKit .panel .graphSliderYWrap {      top: 0;      right: 0;      height: 100%;      padding: 6px 6px 20px 6px; }    #controlKit .panel .graphSliderX, #controlKit .panel .graphSliderY {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border-radius: 2px;      -moz-border-radius: 2px;      background: rgba(24, 27, 29, 0.5);      border: 1px solid #181b1d; }    #controlKit .panel .graphSliderX {      height: 8px; }    #controlKit .panel .graphSliderY {      width: 8px;      height: 100%; }    #controlKit .panel .graphSliderXHandle, #controlKit .panel .graphSliderYHandle {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      cursor: pointer;      border: 1px solid #181b1d;      background: #303639; }    #controlKit .panel .graphSliderXHandle {      width: 20px;      height: 100%;      border-top: none;      border-bottom: none; }    #controlKit .panel .graphSliderYHandle {      width: 100%;      height: 20px;      border-left: none;      border-right: none; }    #controlKit .panel .scrollWrap {      position: relative;      overflow: hidden; }    #controlKit .panel .scrollBuffer {      width: 100%;      height: 8px;      border-top: 1px solid #3b4447;      border-bottom: 1px solid #1e2224; }    #controlKit .panel canvas {      cursor: pointer;      vertical-align: bottom;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447; }    #controlKit .panel .svgWrap, #controlKit .panel .canvasWrap {      margin: 6px 0 0 0;      position: relative;      width: 70%;      float: right;      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border: none;      border-radius: 2px;      -moz-border-radius: 2px;      background: #1e2224;      background-image: -o-linear-gradient(transparent 0%, rgba(0, 0, 0, 0.05) 100%);      background-image: linear-gradient(transparent 0%, rgba(0, 0, 0, 0.05) 100%); }      #controlKit .panel .svgWrap svg, #controlKit .panel .canvasWrap svg {        position: absolute;        left: 0;        top: 0;        cursor: pointer;        vertical-align: bottom;        border: none;        box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;        border-radius: 2px;        -moz-border-radius: 2px;        border-bottom: 1px solid #3b4447; }    #controlKit .panel ul {      margin: 0;      padding: 0;      list-style: none; }    #controlKit .panel .groupList .group .head {      height: 38px;      border-top: 1px solid #566166;      border-bottom: 1px solid #1a1d1f;      padding: 0 20px 0 15px;      background-image: -o-linear-gradient(#3c4a4f 0%, #383f47 100%);      background-image: linear-gradient(#3c4a4f 0%, #383f47 100%);      cursor: pointer; }      #controlKit .panel .groupList .group .head .label {        font-size: 12px;        line-height: 38px;        color: white; }      #controlKit .panel .groupList .group .head:hover {        background-image: -o-linear-gradient(#3c4a4f 0%, #3c4a4f 100%);        background-image: linear-gradient(#3c4a4f 0%, #3c4a4f 100%); }    #controlKit .panel .groupList .group li {      height: 35px;      padding: 0 10px 0 10px; }    #controlKit .panel .groupList .group .subGroupList {      padding: 10px;      border-top: 1px solid #3b4447;      border-bottom: 1px solid #1e2224; }      #controlKit .panel .groupList .group .subGroupList .subGroup {        padding: 0;        margin-top: 6px;        height: auto;        border: 1px solid #1e2224;        border-radius: 2px;        -moz-border-radius: 2px;        box-shadow: 0 1px 0 0 #3b4447; }        #controlKit .panel .groupList .group .subGroupList .subGroup ul {          overflow: hidden; }        #controlKit .panel .groupList .group .subGroupList .subGroup:first-child {          margin-top: 0; }        #controlKit .panel .groupList .group .subGroupList .subGroup .head {          height: 26px;          padding: 0 10px 0 10px;          border-top: none;          border-bottom: 1px solid #1e2224;          border-top-left-radius: 2px;          border-top-right-radius: 2px;          background-image: none;          background-color: #25282b;          cursor: pointer; }          #controlKit .panel .groupList .group .subGroupList .subGroup .head:hover {            background-image: none;            background-color: #222629; }        #controlKit .panel .groupList .group .subGroupList .subGroup li:nth-child(odd) {          background-color: #292d30; }        #controlKit .panel .groupList .group .subGroupList .subGroup li:nth-child(even) {          background-color: #303639; }        #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          height: 26px;          padding: 0 10px 0 10px;          background-image: -o-linear-gradient(#3a4145 0%, #363c40 100%);          background-image: linear-gradient(#3a4145 0%, #363c40 100%);          box-shadow: 0 1px 0 0 #434b50 inset;          cursor: pointer; }          #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive:hover {            background-image: none;            background-color: #3a4145; }        #controlKit .panel .groupList .group .subGroupList .subGroup .head .label, #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive .label {          margin: 0;          padding: 0;          line-height: 26px;          color: white;          font-weight: bold;          font-size: 11px;          text-shadow: 1px 1px black;          text-transform: capitalize; }        #controlKit .panel .groupList .group .subGroupList .subGroup .head .wrap .label, #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive .wrap .label {          width: 100%;          font-weight: bold;          color: white;          padding: 0; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .label {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          height: 100%;          width: 30%;          padding: 10px 5px 0 0;          float: left;          font-size: 11px;          font-weight: normal;          color: #aeb5b8;          text-shadow: 1px 1px black; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          width: 70%;          padding: 6px 0 0 0;          float: right;          height: 100%; }          #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap .wrap {            width: 25%;            padding: 0;            float: left; }            #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap .wrap .label {              width: 100%;              padding: 4px 0 0 0;              color: #878787;              text-align: center;              text-transform: uppercase;              font-weight: bold;              text-shadow: 1px 1px #1a1a1a; }            #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap .wrap input[type='text'] {              padding: 0;              text-align: center; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap {          background: #25282b; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap {          background: none; }      #controlKit .panel .groupList .group .subGroupList .head .wrap, #controlKit .panel .groupList .group .subGroupList .headInactive .wrap {        background: none; }    #controlKit .panel .groupList .group:last-child .subGroupList, #controlKit .panel .groupList .group:last-child .scrollBuffer:nth-of-type(3) {      border-bottom: none; }    #controlKit .panel .groupList .group:last-child .scrollWrap .subGroupList {      border-bottom: 1px solid #1e2224; }    #controlKit .panel .wrapSlider {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 70%;      padding: 6px 0 0 0;      float: right;      height: 100%; }      #controlKit .panel .wrapSlider input[type='text'] {        width: 25%;        text-align: center;        padding: 0;        float: right; }    #controlKit .panel .sliderWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      float: left;      cursor: ew-resize;      width: 70%; }    #controlKit .panel .sliderSlot {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 100%;      height: 25px;      padding: 3px;      background-color: #1e2224;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447; }    #controlKit .panel .sliderHandle {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      position: relative;      width: 100%;      height: 100%;      background: #b32435;      background-image: -o-linear-gradient(transparent 0%, rgba(0, 0, 0, 0.1) 100%);      background-image: linear-gradient(transparent 0%, rgba(0, 0, 0, 0.1) 100%);      box-shadow: 0 1px 0 0 #0f0f0f; }    #controlKit .panel .canvasListItem, #controlKit .panel .svgListItem {      padding: 0 10px 0 10px; }    #controlKit .panel .arrowSMax {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowSMin {      background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAYAAAB4ka1VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAFpJREFUeNpsiiEOgDAMRf8SxNJzIYfB1PQkQ7RkZcfBYLnbUAsL4cn3Xkgs6NzXqQAwL+ve3TTGLWcDgKPWd0osiERa3FunuLdIpIkFiEQ2xu8UEosBUPxjzwATSjV/8qlMGAAAAABJRU5ErkJggg==) center no-repeat; }    #controlKit .panel .arrowSMax, #controlKit .panel .arrowSMin {      width: 100%;      height: 20px; }    #controlKit .panel .arrowBMax {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowBMin {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowBSubMax {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowBSubMin {      background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAYAAAD68A/GAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAG9JREFUeNp8zrEOQDAAhOG/GESYBbtJvAKD1eKBRN+sL1NN57a7iSDipkvuG06kWSaBlf/IZJoXyqqhrOpPYc2ONZq47XoVvItADHlRfCEJbHHb9QAqeCdAjCe+I4ATPnDw7oEAktelzRp99ftwDACfsS0XAbz4PwAAAABJRU5ErkJggg==) center no-repeat; }    #controlKit .panel .arrowBMax, #controlKit .panel .arrowBMin, #controlKit .panel .arrowBSubMax, #controlKit .panel .arrowBSubMin {      width: 10px;      height: 100%;      float: right; }  #controlKit .panel .sizeHandle {    float: left;    width: 10px;    height: 100px;    border-left: 1 py; }  #controlKit .panel .label, #controlKit .picker .label {    width: 100%;    float: left;    font-size: 11px;    font-weight: bold;    text-shadow: 0 -1px black;    overflow: hidden;    white-space: nowrap;    text-overflow: ellipsis;    cursor: default; }  #controlKit .panel .head, #controlKit .picker .head, #controlKit .panel .panelHeadInactive {    height: 30px;    padding: 0 10px 0 10px;    background: #1a1d1f; }    #controlKit .panel .head .wrap, #controlKit .picker .head .wrap, #controlKit .panel .panelHeadInactive .wrap {      width: auto;      height: auto;      margin: 0;      padding: 0;      position: relative;      overflow: hidden; }  #controlKit .panel .head, #controlKit .picker .head {    border-top: 1px solid #202426;    border-bottom: 1px solid #111314; }    #controlKit .panel .head .label, #controlKit .picker .head .label {      cursor: pointer;      line-height: 30px;      color: #65696b; }  #controlKit .panel .panelHeadInactive {    border-top: 1px solid #202426; }  #controlKit .panel .menu, #controlKit .picker .menu {    float: right;    padding: 5px 0 0 0; }    #controlKit .panel .menu input[type='button'], #controlKit .picker .menu input[type='button'] {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      cursor: pointer;      height: 20px;      margin-left: 4px;      border: none;      border-radius: 2px;      -moz-border-radius: 2px;      font-family: arial, sans-serif;      font-size: 10px;      font-weight: bold;      color: #aaaaaa;      text-shadow: 0 -1px black;      text-transform: uppercase;      box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #212527 inset;      border-bottom: 1px solid #24292b; }    #controlKit .panel .menu .btnHide, #controlKit .panel .menu .btnShow, #controlKit .panel .menu .btnClose, #controlKit .picker .menu .btnHide, #controlKit .picker .menu .btnShow, #controlKit .picker .menu .btnClose {      width: 20px; }    #controlKit .panel .menu .btnHide, #controlKit .picker .menu .btnHide {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #1a1d1f; }      #controlKit .panel .menu .btnHide:hover, #controlKit .picker .menu .btnHide:hover {        background: url(data:image/png;base64,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) 50% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }    #controlKit .panel .menu .btnShow, #controlKit .picker .menu .btnShow {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #1a1d1f; }      #controlKit .panel .menu .btnShow:hover, #controlKit .picker .menu .btnShow:hover {        background: url(data:image/png;base64,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) 50% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }    #controlKit .panel .menu .btnClose, #controlKit .picker .menu .btnClose {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #1a1d1f; }      #controlKit .panel .menu .btnClose:hover, #controlKit .picker .menu .btnClose:hover {        background: url(data:image/png;base64,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) 50% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }    #controlKit .panel .menu .btnUndo, #controlKit .picker .menu .btnUndo {      background: url(data:image/png;base64,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) 20% 50% no-repeat, #1a1d1f;      padding: 0 6px 1px 0;      width: 38px;      vertical-align: top;      text-align: end; }      #controlKit .panel .menu .btnUndo:hover, #controlKit .picker .menu .btnUndo:hover {        background: url(data:image/png;base64,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) 20% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }  #controlKit .picker {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    border-radius: 2px;    -moz-border-radius: 2px;    background-color: #303639;    font-family: arial, sans-serif;    font-size: 11px;    color: white;    text-shadow: 1px 1px black;    position: absolute;    z-index: 2147483631;    width: 360px;    -webkit-touch-callout: none;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none;    box-shadow: 0 0 1px 1px rgba(0, 0, 0, 0.25); }    #controlKit .picker canvas {      vertical-align: bottom;      cursor: pointer; }    #controlKit .picker .wrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      padding: 10px;      float: left; }    #controlKit .picker .fieldWrap {      padding: 3px; }    #controlKit .picker .sliderWrap {      padding: 3px 13px 3px 3px; }    #controlKit .picker .fieldWrap, #controlKit .picker .sliderWrap, #controlKit .picker .inputWrap {      height: auto;      overflow: hidden;      float: left; }    #controlKit .picker .inputWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border: 1px solid #1e2224;      border-radius: 2px;      -moz-border-radius: 2px;      box-shadow: 0 1px 0 0 #3b4447;      width: 140px;      float: right;      padding: 5px 10px 1px 0; }    #controlKit .picker .inputField {      width: 50%;      float: right;      margin-bottom: 4px; }      #controlKit .picker .inputField .label {        padding: 4px 0 0 0;        color: #878787;        text-align: center;        text-transform: uppercase;        font-weight: bold;        text-shadow: 1px 1px #1a1a1a;        width: 40%; }      #controlKit .picker .inputField .wrap {        padding: 0;        width: 60%;        height: auto;        float: right; }    #controlKit .picker .controlsWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 100%;      height: auto;      float: right;      padding: 9px 0 0 0; }      #controlKit .picker .controlsWrap input[type='button'] {        float: right;        width: 65px;        margin: 0 0 0 10px; }    #controlKit .picker .colorContrast {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447;      width: 100%;      height: 25px;      padding: 3px;      width: 80%;      margin-bottom: 4px;      float: right; }      #controlKit .picker .colorContrast div {        width: 50%;        height: 100%;        float: left; }    #controlKit .picker input[type='text'] {      padding: 0;      text-align: center;      width: 60%;      float: right; }    #controlKit .picker .wrap .inputWrap:nth-of-type(3) {      border-bottom-left-radius: 0;      border-bottom-right-radius: 0; }    #controlKit .picker .wrap .inputWrap:nth-of-type(4) {      border-top: none;      border-top-left-radius: 0;      border-top-right-radius: 0; }      #controlKit .picker .wrap .inputWrap:nth-of-type(4) .inputField {        width: 100%; }        #controlKit .picker .wrap .inputWrap:nth-of-type(4) .inputField .label {          width: 20%; }      #controlKit .picker .wrap .inputWrap:nth-of-type(4) input[type='text'] {        width: 80%; }    #controlKit .picker .fieldWrap, #controlKit .picker .sliderWrap {      background: #1e2224;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447;      position: relative;      margin-right: 5px; }      #controlKit .picker .fieldWrap .indicator, #controlKit .picker .sliderWrap .indicator {        position: absolute;        border: 2px solid white;        box-shadow: 0 1px black, 0 1px black inset;        cursor: pointer; }    #controlKit .picker .fieldWrap .indicator {      width: 8px;      height: 8px;      left: 50%;      top: 50%;      border-radius: 50%;      -moz-border-radius: 50%; }    #controlKit .picker .sliderWrap .indicator {      width: 14px;      height: 3px;      border-radius: 8px;      -moz-border-radius: 8px;      left: 1px;      top: 1px; }      #controlKit .picker .sliderWrap .indicator:after {        content: '';        width: 0;        height: 0;        border-top: 4.5px solid transparent;        border-bottom: 4.5px solid transparent;        border-right: 4px solid white;        float: right;        position: absolute;        top: -2px;        left: 19px; }      #controlKit .picker .sliderWrap .indicator:before {        content: '';        width: 0;        height: 0;        border-top: 4.5px solid transparent;        border-bottom: 4.5px solid transparent;        border-right: 4px solid black;        float: right;        position: absolute;        top: -3px;        left: 19px; }  #controlKit .options {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    border: 1px solid #131313;    border-radius: 2px;    -moz-border-radius: 2px;    position: absolute;    left: 0;    top: 0;    width: auto;    height: auto;    z-index: 2147483638;    font-family: arial, sans-serif;    font-size: 11px;    color: white;    text-shadow: 1px 1px black;    box-shadow: 0 1px 0 0 #566166 inset;    overflow: hidden;    background-color: #3c494e; }    #controlKit .options ul {      width: 100%;      list-style: none;      margin: 0;      padding: 0; }      #controlKit .options ul li {        margin: 0;        width: 100%;        height: 28px;        line-height: 28px;        padding: 0 20px 0 10px;        overflow: hidden;        white-space: normal;        text-overflow: ellipsis;        cursor: pointer; }        #controlKit .options ul li:hover {          background-color: #1f2325; }      #controlKit .options ul .liSelected {        background-color: #292d30; }    #controlKit .options .color {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box; }      #controlKit .options .color li, #controlKit .options .color .liSelected {        -webkit-box-sizing: border-box;        -moz-box-sizing: border-box;        box-sizing: border-box;        padding: 0;        height: 25px;        line-height: 25px;        text-align: center; }        #controlKit .options .color li:hover, #controlKit .options .color .liSelected:hover {          background: none;          font-weight: bold; }      #controlKit .options .color .liSelected {        font-weight: bold; }"
}; 
module.exports = Style;
},{}],48:[function(_dereq_,module,exports){
function Event_(sender,type,data) {
    this.sender = sender;
    this.type   = type;
    this.data   = data;
}
module.exports = Event_;
},{}],49:[function(_dereq_,module,exports){
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
},{}],50:[function(_dereq_,module,exports){
var LayoutMode = {
    LEFT   : 'left',
    RIGHT  : 'right',
    TOP    : 'top',
    BOTTOM : 'bottom',
    NONE   : 'none'
};

module.exports = LayoutMode;
},{}],51:[function(_dereq_,module,exports){
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
    track.setStyleClass(CSS.ScrollBarTrack);
    thumb.setStyleClass(CSS.ScrollBarThumb);

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
},{"../Metric":34,"../document/CSS":42,"../document/DocumentEvent":43,"../document/Mouse":44,"../document/Node":45,"../document/NodeEvent":46}],52:[function(_dereq_,module,exports){
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


},{"../core/document/Node":45,"../core/event/EventDispatcher":49,"../core/layout/ScrollBar":51}],53:[function(_dereq_,module,exports){
var AbstractGroup = _dereq_('./AbstractGroup');
var CSS = _dereq_('../core/document/CSS');
var Node = _dereq_('../core/document/Node');

var SubGroup = _dereq_('./SubGroup');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    NodeEvent = _dereq_('../core/document/NodeEvent'),
    PanelEvent = _dereq_('./PanelEvent'),
    GroupEvent = _dereq_('./GroupEvent');

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
    var subGroups = this._subGroups;
    if (subGroups.length == 0){
        subGroups.push(new SubGroup(this));
    }
    return subGroups[subGroups.length - 1];
};

Group.prototype.getComponents = function () {
    return this._components;
};

module.exports = Group;

},{"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./AbstractGroup":52,"./GroupEvent":54,"./PanelEvent":57,"./SubGroup":59}],54:[function(_dereq_,module,exports){
var GroupEvent = {
	GROUP_SIZE_CHANGE        : 'groupSizeChange',
	GROUP_LIST_SIZE_CHANGE   : 'groupListSizeChange',
	GROUP_SIZE_UPDATE        : 'groupSizeUpdate',
	SUBGROUP_TRIGGER         : 'subGroupTrigger',

	SUBGROUP_ENABLE          : 'enableSubGroup',
	SUBGROUP_DISABLE         : 'disableSubGroup'
};

module.exports = GroupEvent;
},{}],55:[function(_dereq_,module,exports){
var MenuEvent = {
	UPDATE_MENU: 'updateMenu'
};
module.exports = MenuEvent;
},{}],56:[function(_dereq_,module,exports){
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

/**
 * Adds a new Group to the Panel.
 * @param {Object} [params] - Group options.
 * @param {String} [params.label='Control Panel'] - The Group label string.
 * @param {Boolean} [params.useLabel=true] - Trigger whether all contained SubGroups and Components should use labels.
 * @param {Boolean} [params.enable=true] - Defines initial state open / closed.
 * @param {Number} [params.height=null] - Defines if the height of the Group should be constrained to certain height.
 * @returns {Panel}
 */

Panel.prototype.addGroup = function (params) {
    var group = new Group(this, params);
    this._groups.push(group);
    if (this.isDocked()){
        this.dispatchEvent(new Event_(this, PanelEvent.PANEL_SIZE_CHANGE));
    }
    return this;
};

/**
 * Adds a new SubGroup to the last added Group.
 * @param {Object} [params] - SubGroup options.
 * @param {String} [params.label=null] - The SubGroup label string.
 * @param {Boolean} [params.useLabel=true] - Trigger whether all contained SubGroups and Components should use labels.
 * @param {Boolean} [params.enable=true] - Defines initial state open / closed.
 * @param {Number} [params.height=null] - Defines if the height of the SubGroup should be constrained to certain height.
 * @returns {Panel}
 */

Panel.prototype.addSubGroup = function(params){
    var groups = this._groups;
    if(groups.length == 0){
        this.addGroup();
    }
    groups[groups.length - 1].addSubGroup(params);
    return this;
};

Panel.prototype._addComponent = function(){
    var groups = this._groups,
        group;
    if(groups.length == 0){
        groups.push(new Group(this));
    }
    group = groups[groups.length-1];

    group.addComponent.apply(group,arguments);
    return this;
};

/**
 * Adds a new StringInput to last added SubGroup.
 * @param {Object} object - The object.
 * @param {String} value - The property key.
 * @param {Object} [params] - StringInput options.
 * @param {String} [params.label=value] - StringInput label
 * @param {Function} [params.onChange] - Callback on
 * @returns {Panel}
 */

Panel.prototype.addStringInput = function (object, value, params) {
    return this._addComponent(StringInput,object,value,params);
};

/**
 * Adds a new NumberInput to last added SubGroup.
 * @param {Object} object - The object.
 * @param {String} value - The property key.
 * @param {Object} [params] - Component options.
 * @returns {Panel}
 */

Panel.prototype.addNumberInput = function (object, value, params) {
    return this._addComponent(NumberInput,object,value,params);
};

/**
 * Adds a new Range input to last added SubGroup.
 * @param {Object} object - The object.
 * @param {String} value - The property key.
 * @param {Object} [params] - Component options.
 * @returns {Panel}
 */

Panel.prototype.addRange = function (object, value, params) {
    return this._addComponent(Range,object,value,params);
};

/**
 * Adds a new Checkbox to last added SubGroup.
 * @param {Object} object - The object.
 * @param {String} value - The property key.
 * @param {Object} [params] - Component options.
 * @returns {Panel}
 */

Panel.prototype.addCheckbox = function (object, value, params) {
    return this._addComponent(Checkbox,object,value,params);
};

/**
 * Adds a new Color modifier to last added SubGroup.
 * @param {Object} object - The object.
 * @param {String} value - The property key.
 * @param {Object} [params] - Component options.
 * @returns {Panel}
 */

Panel.prototype.addColor = function (object, value, params) {
    return this._addComponent(Color,object,value, params);
};

/**
 * Adds a new Button to last added SubGroup.
 * @param {String} label - The object.
 * @param {Function} onPress - Callback.
 * @param {Object} [params] - Component options.
 * @returns {Panel}
 */

Panel.prototype.addButton = function (label, onPress, params) {
    return this._addComponent(Button,label,onPress,params);
};

/**
 * Adds a new Select to last added SubGroup.
 * @param {Object} object - The object.
 * @param {String} value - The property key.
 * @param {Object} [params] - Component options.
 * @returns {Panel}
 */

Panel.prototype.addSelect = function (object, value, params) {
    return this._addComponent(Select,object,value,params);
};

/**
 * Adds a new Slider to last added SubGroup.
 * @param {Object} object - The object.
 * @param {String} value - The property key.
 * @param {String} range - The min/max array key to be used.
 * @param {Object} [params] - Component options.
 * @returns {Panel}
 */

Panel.prototype.addSlider = function (object, value, range, params) {
    return this._addComponent(Slider,object,value,range,params);
};

/**
 * Adds a new FunctionPlotter to last added SubGroup.
 * @param {Object} object - The object.
 * @param {String} value - The property key.
 * @param {Object} [params] - Component options.
 * @returns {Panel}
 */

Panel.prototype.addFunctionPlotter = function (object, value, params) {
    return this._addComponent(FunctionPlotter,object,value,params);
};

/**
 * Adds a new XY-Pad to last added SubGroup.
 * @param {Object} object - The object.
 * @param {String} value - The property key.
 * @param {Object} [params] - Component options.
 * @returns {Panel}
 */

Panel.prototype.addPad = function (object, value, params) {
    return this._addComponent(Pad,object,value,params);
};

/**
 * Adds a new ValuePlotter to last added SubGroup.
 * @param {Object} object - The object.
 * @param {String} value - The property key.
 * @param {Object} [params] - Component options.
 * @returns {Panel}
 */

Panel.prototype.addValuePlotter = function (object, value, params) {
    return this._addComponent(ValuePlotter,object,value,params);
};

/**
 * Adds a new NumberOutput to last added SubGroup.
 * @param {Object} object - The object.
 * @param {String} value - The property key.
 * @param {Object} [params] - Component options.
 * @returns {Panel}
 */

Panel.prototype.addNumberOutput = function (object, value, params) {
    return this._addComponent(NumberOutput,object,value,params);
};

/**
 * Adds a new StringOutput to last added SubGroup.
 * @param {Object} object - The object.
 * @param {String} value - The property key.
 * @param {Object} [params] - Component options.
 * @returns {Panel}
 */

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
},{"../component/Button":3,"../component/Canvas":4,"../component/Checkbox":5,"../component/Color":6,"../component/FunctionPlotter":8,"../component/NumberInput":11,"../component/NumberOutput":13,"../component/Pad":16,"../component/Range":20,"../component/SVG":21,"../component/Select":23,"../component/Slider":24,"../component/StringInput":26,"../component/StringOutput":27,"../component/ValuePlotter":28,"../core/History":32,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"../core/event/EventDispatcher":49,"../core/layout/LayoutMode":50,"../core/layout/ScrollBar":51,"./Group":53,"./MenuEvent":55,"./PanelEvent":57,"./PanelNoGroupError":58}],57:[function(_dereq_,module,exports){
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
},{}],58:[function(_dereq_,module,exports){
function PanelNoGroupError() {
	Error.apply(this);
	Error.captureStackTrace(this,PanelNoGroupError);
	this.name = 'PanelNoGroupError';
	this.message = 'Panel has no Group.';
}
PanelNoGroupError.prototype = Object.create(Error.prototype);
PanelNoGroupError.constructor = PanelNoGroupError;

module.exports = PanelNoGroupError;
},{}],59:[function(_dereq_,module,exports){
var AbstractGroup = _dereq_('./AbstractGroup');
var Node = _dereq_('../core/document/Node');
var CSS = _dereq_('../core/document/CSS');

var Event_ = _dereq_('../core/event/Event'),
    DocumentEvent = _dereq_('../core/document/DocumentEvent'),
    PanelEvent = _dereq_('./PanelEvent'),
    GroupEvent = _dereq_('./GroupEvent'),
    ComponentEvent = _dereq_('../core/ComponentEvent');

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
    this.dispatchEvent(new Event_(this, ComponentEvent.ENABLE, null));
};
SubGroup.prototype.onDisable = function () {
    if (this.isDisabled()){
        return;
    }
    this.dispatchEvent(new Event_(this, ComponentEvent.DISABLE, null));
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
},{"../core/ComponentEvent":30,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/event/Event":48,"./AbstractGroup":52,"./GroupEvent":54,"./PanelEvent":57}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9pbmRleC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvQ29udHJvbEtpdC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0J1dHRvbi5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0NhbnZhcy5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0NoZWNrYm94LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvQ29sb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9GdW5jdGlvblBsb3RUeXBlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvRnVuY3Rpb25QbG90dGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9GdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L051bWJlcklucHV0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvTnVtYmVySW5wdXRfSW50ZXJuYWwuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9OdW1iZXJPdXRwdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9PcHRpb25zLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvT3V0cHV0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGFkLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGlja2VyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGxvdHRlci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1ByZXNldEJ0bi5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1JhbmdlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU1ZHLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU1ZHQ29tcG9uZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2VsZWN0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2xpZGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2xpZGVyX0ludGVybmFsLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU3RyaW5nSW5wdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9TdHJpbmdPdXRwdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9WYWx1ZVBsb3R0ZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvQ29tcG9uZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0NvbXBvbmVudEV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0NvbXBvbmVudE9iamVjdEVycm9yLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0hpc3RvcnkuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvSGlzdG9yeUV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL01ldHJpYy5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9PYmplY3RDb21wb25lbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvT3B0aW9uRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvUHJlc2V0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2NvbG9yL0NvbG9yRm9ybWF0RXJyb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvY29sb3IvQ29sb3JNb2RlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2NvbG9yL0NvbG9yVXRpbC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9DU1MuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9Nb3VzZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9Ob2RlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2RvY3VtZW50L05vZGVFdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9TdHlsZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9ldmVudC9FdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvbGF5b3V0L0xheW91dE1vZGUuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvbGF5b3V0L1Njcm9sbEJhci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvQWJzdHJhY3RHcm91cC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvR3JvdXAuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL0dyb3VwRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL01lbnVFdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvUGFuZWwuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL1BhbmVsRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL1BhbmVsTm9Hcm91cEVycm9yLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9ncm91cC9TdWJHcm91cC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3R5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6YkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2dUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgQ29udHJvbEtpdCA9IHJlcXVpcmUoJy4vbGliL0NvbnRyb2xLaXQnKTtcblx0Q29udHJvbEtpdC5DYW52YXMgPSByZXF1aXJlKCcuL2xpYi9jb21wb25lbnQvQ2FudmFzJyk7XG5cdENvbnRyb2xLaXQuU1ZHID0gcmVxdWlyZSgnLi9saWIvY29tcG9uZW50L1NWRycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xLaXQ7IiwidmFyIE5vZGUgPSByZXF1aXJlKCcuL2NvcmUvZG9jdW1lbnQvTm9kZScpLFxuICAgIFBhbmVsID0gcmVxdWlyZSgnLi9ncm91cC9QYW5lbCcpLFxuICAgIE9wdGlvbnMgPSByZXF1aXJlKCcuL2NvbXBvbmVudC9PcHRpb25zJyksXG4gICAgUGlja2VyID0gcmVxdWlyZSgnLi9jb21wb25lbnQvUGlja2VyJyk7XG5cbnZhciBDU1MgPSByZXF1aXJlKCcuL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG4gICAgRXZlbnRfID0gcmVxdWlyZSgnLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi9jb3JlL0NvbXBvbmVudEV2ZW50JyksXG4gICAgSGlzdG9yeUV2ZW50ID0gcmVxdWlyZSgnLi9jb3JlL0hpc3RvcnlFdmVudCcpLFxuICAgIFNlbGVjdEV2ZW50ID0gcmVxdWlyZSgnLi9jb3JlL09wdGlvbkV2ZW50JyksXG4gICAgTWVudUV2ZW50ID0gcmVxdWlyZSgnLi9ncm91cC9NZW51RXZlbnQnKTtcblxudmFyIEhpc3RvcnkgPSByZXF1aXJlKCcuL2NvcmUvSGlzdG9yeScpO1xudmFyIE1vdXNlID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XG5cbnZhciBWYWx1ZVBsb3R0ZXIgPSByZXF1aXJlKCcuL2NvbXBvbmVudC9WYWx1ZVBsb3R0ZXInKTtcbnZhciBTdHJpbmdPdXRwdXQgPSByZXF1aXJlKCcuL2NvbXBvbmVudC9TdHJpbmdPdXRwdXQnKSxcbiAgICBOdW1iZXJPdXRwdXQgPSByZXF1aXJlKCcuL2NvbXBvbmVudC9OdW1iZXJPdXRwdXQnKTtcblxudmFyIERFRkFVTFRfS0lUX1RSSUdHRVIgPSBmYWxzZSxcbiAgICBERUZBVUxUX0hJU1RPUlkgPSBmYWxzZSxcbiAgICBERUZBVUxUX1BBTkVMU19DTE9TQUJMRSA9IGZhbHNlLFxuICAgIERFRkFVTFRfT1BBQ0lUWSA9IDEuMDtcblxuZnVuY3Rpb24gQ29udHJvbEtpdChwYXJhbXMpIHtcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLnRyaWdnZXIgPSBwYXJhbXMudHJpZ2dlciA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9LSVRfVFJJR0dFUiA6IHBhcmFtcy5maXhlZDtcbiAgICBwYXJhbXMuaGlzdG9yeSA9IHBhcmFtcy5oaXN0b3J5ID09PSB1bmRlZmluZWQgPyBERUZBVUxUX0hJU1RPUlkgOiBwYXJhbXMuaGlzdG9yeTtcbiAgICBwYXJhbXMucGFuZWxzQ2xvc2FibGUgPSBwYXJhbXMucGFuZWxzQ2xvc2FibGUgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxTX0NMT1NBQkxFIDogcGFyYW1zLnBhbmVsc0Nsb3NhYmxlO1xuICAgIHBhcmFtcy5vcGFjaXR5ID0gcGFyYW1zLm9wYWNpdHkgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfT1BBQ0lUWSA6IHBhcmFtcy5vcGFjaXR5O1xuICAgIHBhcmFtcy51c2VFeHRlcm5hbFN0eWxlID0gcGFyYW1zLnVzZUV4dGVybmFsU3R5bGUgPT09IHVuZGVmaW5lZCA/IGZhbHNlIDogcGFyYW1zLnVzZUV4dGVybmFsU3R5bGU7XG5cbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHZhciBub2RlID0gbnVsbDtcbiAgICBpZiAoIXBhcmFtcy5wYXJlbnREb21FbGVtZW50SWQpIHtcbiAgICAgICAgbm9kZSA9IG5ldyBOb2RlKCk7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG5vZGUgPSBOb2RlLmdldE5vZGVCeUlkKHBhcmFtcy5wYXJlbnREb21FbGVtZW50SWQpO1xuICAgIH1cblxuICAgIGlmKCFwYXJhbXMudXNlRXh0ZXJuYWxTdHlsZSl7XG4gICAgICAgIHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICAgICAgICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbiAgICAgICAgdmFyIGNzcyA9ICFwYXJhbXMuc3R5bGUgPyByZXF1aXJlKCcuL2NvcmUvZG9jdW1lbnQvU3R5bGUnKS5zdHJpbmcgOiBwYXJhbXMuc3R5bGU7XG4gICAgICAgIGlmKHN0eWxlLnN0eWxlc2hlZXQpe1xuICAgICAgICAgICAgc3R5bGUuc3R5bGVzaGVldC5jc3NUZXh0ID0gY3NzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gICAgICAgIH1cbiAgICAgICAgKGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSkuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgIH1cblxuICAgIG5vZGUuc2V0UHJvcGVydHkoJ2lkJywgQ1NTLkNvbnRyb2xLaXQpO1xuXG4gICAgdGhpcy5fbm9kZSA9IG5vZGU7XG4gICAgdGhpcy5fcGFuZWxzID0gW107XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xuICAgIHRoaXMuX2hpc3RvcnlFbmFibGVkID0gcGFyYW1zLmhpc3Rvcnk7XG4gICAgdGhpcy5fcGFuZWxzQ2xvc2FibGUgPSBwYXJhbXMucGFuZWxzQ2xvc2FibGU7XG5cbiAgICB2YXIgaGlzdG9yeSA9IEhpc3Rvcnkuc2V0dXAoKTtcblxuICAgIGlmICghdGhpcy5faGlzdG9yeUVuYWJsZWQpe1xuICAgICAgICBoaXN0b3J5LmRpc2FibGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBoaXN0b3J5LmFkZEV2ZW50TGlzdGVuZXIoSGlzdG9yeUV2ZW50LlNUQVRFX1BVU0gsIHRoaXMsICdvbkhpc3RvcnlTdGF0ZVB1c2gnKTtcbiAgICAgICAgaGlzdG9yeS5hZGRFdmVudExpc3RlbmVyKEhpc3RvcnlFdmVudC5TVEFURV9QT1AsIHRoaXMsICdvbkhpc3RvcnlTdGF0ZVBvcCcpO1xuICAgIH1cblxuICAgIE1vdXNlLnNldHVwKCk7XG4gICAgUGlja2VyLnNldHVwKHRoaXMuZ2V0Tm9kZSgpKTtcbiAgICBPcHRpb25zLnNldHVwKHRoaXMuZ2V0Tm9kZSgpKTtcblxuICAgIGlmIChwYXJhbXMudHJpZ2dlcikge1xuICAgICAgICB2YXIgdHJpZ2dlciA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHRyaWdnZXIuc2V0UHJvcGVydHkoJ2lkJywgQ1NTLlRyaWdnZXIpO1xuICAgICAgICB0cmlnZ2VyLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uVHJpZ2dlckRvd24uYmluZCh0aGlzKSk7XG5cbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0cmlnZ2VyLmdldEVsZW1lbnQoKSk7XG4gICAgfVxuXG4gICAgaWYgKHBhcmFtcy5vcGFjaXR5ICE9IDEuMCAmJiBwYXJhbXMub3BhY2l0eSAhPSAwLjApIHtcbiAgICAgICAgbm9kZS5zZXRTdHlsZVByb3BlcnR5KCdvcGFjaXR5JywgcGFyYW1zLm9wYWNpdHkpO1xuICAgIH1cblxuICAgIHRoaXMuX2NhblVwZGF0ZSA9IHRydWU7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGludGVydmFsLFxuICAgICAgICBjb3VudCA9IDAsXG4gICAgICAgIGNvdW50TWF4ID0gMTA7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsZnVuY3Rpb24oKXtcbiAgICAgICAgc2VsZi5fY2FuVXBkYXRlID0gZmFsc2U7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZihjb3VudCA+PSBjb3VudE1heCl7XG4gICAgICAgICAgICAgICAgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgIHNlbGYuX2NhblVwZGF0ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICB9LDI1KVxuICAgIH0pO1xufVxuXG5Db250cm9sS2l0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLl9vblRyaWdnZXJEb3duID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgndmlzaWJpbGl0eScsIHRoaXMuX2lzRGlzYWJsZWQgPSAhdGhpcy5faXNEaXNhYmxlZCA/ICdoaWRkZW4nIDogJ3Zpc2libGUnKTtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLmFkZFBhbmVsID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgIHZhciBwYW5lbCA9IG5ldyBQYW5lbCh0aGlzLCBwYXJhbXMpO1xuICAgIHRoaXMuX3BhbmVscy5wdXNoKHBhbmVsKTtcbiAgICByZXR1cm4gcGFuZWw7XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX2lzRGlzYWJsZWQgfHwgIXRoaXMuX2NhblVwZGF0ZSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGksIGosIGs7XG4gICAgdmFyIGwsIG0sIG47XG5cbiAgICB2YXIgcGFuZWxzID0gdGhpcy5fcGFuZWxzLFxuICAgICAgICBwYW5lbCxcbiAgICAgICAgZ3JvdXBzLFxuICAgICAgICBjb21wb25lbnRzLFxuICAgICAgICBjb21wb25lbnQ7XG5cbiAgICBpID0gLTE7IGwgPSBwYW5lbHMubGVuZ3RoO1xuICAgIHdoaWxlICgrK2kgPCBsKSB7XG4gICAgICAgIHBhbmVsID0gcGFuZWxzW2ldO1xuICAgICAgICBpZiAocGFuZWwuaXNEaXNhYmxlZCgpKXtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGdyb3VwcyA9IHBhbmVsLmdldEdyb3VwcygpO1xuICAgICAgICBqID0gLTE7IG0gPSBncm91cHMubGVuZ3RoO1xuXG4gICAgICAgIHdoaWxlICgrK2ogPCBtKSB7XG4gICAgICAgICAgICBjb21wb25lbnRzID0gZ3JvdXBzW2pdLmdldENvbXBvbmVudHMoKTtcbiAgICAgICAgICAgIGsgPSAtMTsgbiA9IGNvbXBvbmVudHMubGVuZ3RoO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytrIDwgbikge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudCA9IGNvbXBvbmVudHNba107XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5pc0Rpc2FibGVkKCkpe1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudCBpbnN0YW5jZW9mIFZhbHVlUGxvdHRlciB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQgaW5zdGFuY2VvZiBTdHJpbmdPdXRwdXQgfHxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50IGluc3RhbmNlb2YgTnVtYmVyT3V0cHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5oaXN0b3J5SXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oaXN0b3J5RW5hYmxlZDtcbn07XG5Db250cm9sS2l0LnByb3RvdHlwZS5wYW5lbHNBcmVDbG9zYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcGFuZWxzQ2xvc2FibGU7XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xufTtcbkNvbnRyb2xLaXQucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IHRydWU7XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5kaXNhYmxlQWxsUGFuZWxzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpID0gLTEsIHAgPSB0aGlzLl9wYW5lbHMsIGwgPSBwLmxlbmd0aDtcbiAgICB3aGlsZSAoKytpIDwgbCl7XG4gICAgICAgIHBbaV0uZW5hYmxlKCk7XG4gICAgfVxufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUuZW5hYmxlQWxsUGFuZWxzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpID0gLTEsIHAgPSB0aGlzLl9wYW5lbHMsIGwgPSBwLmxlbmd0aDtcbiAgICB3aGlsZSAoKytpIDwgbCl7XG4gICAgICAgIHBbaV0uZGlzYWJsZSgpO1xuICAgIH1cbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLm9uSGlzdG9yeVN0YXRlUHVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBNZW51RXZlbnQuVVBEQVRFX01FTlUsIG51bGwpKTtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLm9uSGlzdG9yeVN0YXRlUG9wID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwge29yaWdpbjogbnVsbH0pKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBNZW51RXZlbnQuVVBEQVRFX01FTlUsIG51bGwpKTtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGU7XG59O1xuXG4vL1xudmFyIGluc3RhbmNlID0gbnVsbDtcblxudmFyIENvbnRyb2xLaXRHbG9iYWwgPSB7XG4gICAgc2V0dXAgOiBmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgaW5zdGFuY2UgPSBuZXcgQ29udHJvbEtpdChvcHRpb25zKTtcbiAgICB9LFxuICAgIHVwZGF0ZSA6IGZ1bmN0aW9uKCl7XG4gICAgICAgIGlmKCFpbnN0YW5jZSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFuY2UudXBkYXRlKCk7XG4gICAgfSxcbiAgICBhZGRQYW5lbCA6IGZ1bmN0aW9uKHBhcmFtcyl7XG4gICAgICAgIGlmKCFpbnN0YW5jZSl7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnN0YW5jZS5hZGRQYW5lbChwYXJhbXMpO1xuICAgIH0sXG4gICAgZW5hYmxlIDogZnVuY3Rpb24oKXtcbiAgICAgICAgaWYoIWluc3RhbmNlKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YW5jZS5lbmFibGUoKTtcbiAgICB9LFxuICAgIGRpc2FibGUgOiBmdW5jdGlvbigpe1xuICAgICAgICBpZighaW5zdGFuY2Upe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGluc3RhbmNlLmRpc2FibGUoKTtcbiAgICB9LFxuICAgIGRlc3Ryb3kgOiBmdW5jdGlvbigpe1xuICAgICAgICBpbnN0YW5jZSA9IG51bGw7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sS2l0R2xvYmFsOyIsInZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKSxcbiAgICBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudCcpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIERFRkFVTFRfTEFCRUwgPSAnJztcblxuZnVuY3Rpb24gQnV0dG9uKHBhcmVudCxsYWJlbCxvblByZXNzLHBhcmFtcykge1xuICAgIG9uUHJlc3MgICAgICA9IG9uUHJlc3MgfHwgZnVuY3Rpb24oKXt9O1xuICAgIHBhcmFtcyAgICAgICA9IHBhcmFtcyAgICAgICB8fCB7fTtcbiAgICBwYXJhbXMubGFiZWwgPSBwYXJhbXMubGFiZWwgfHwgREVGQVVMVF9MQUJFTDtcblxuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLFtwYXJlbnQscGFyYW1zLmxhYmVsXSk7XG5cbiAgICB2YXIgaW5wdXQgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG5cbiAgICBpbnB1dC5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b24pO1xuICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsbGFiZWwpO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk9OX0NMSUNLLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25QcmVzcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHNlbGYsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICB0aGlzLl93cmFwTm9kZS5hZGRDaGlsZChpbnB1dCk7XG59XG5CdXR0b24ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb21wb25lbnQucHJvdG90eXBlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCdXR0b247XG4iLCJ2YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnQnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4uL2NvcmUvTWV0cmljJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKTtcblxuZnVuY3Rpb24gQ2FudmFzKHBhcmVudCxwYXJhbXMpIHtcbiAgICBDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG4gICAgICAgIHdyYXBOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkNhbnZhc1dyYXApO1xuXG4gICAgdmFyIHdyYXBXaWR0aCA9IHdyYXBOb2RlLmdldFdpZHRoKCk7XG5cbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIHdyYXBOb2RlLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChjYW52YXMpO1xuXG4gICAgdGhpcy5fY2FudmFzV2lkdGggPSB0aGlzLl9jYW52YXNIZWlnaHQgPSAwO1xuICAgIHRoaXMuX3NldENhbnZhc1NpemUod3JhcFdpZHRoLHdyYXBXaWR0aCk7XG5cbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcblxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzTGlzdEl0ZW0pO1xuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSx0aGlzLCAgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsdGhpcy5fcGFyZW50LCdvbkdyb3VwU2l6ZVVwZGF0ZScpO1xufVxuXG5DYW52YXMucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb21wb25lbnQucHJvdG90eXBlKTtcblxuQ2FudmFzLnByb3RvdHlwZS5fdXBkYXRlSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW52YXNIZWlnaHQgPSB0aGlzLl9jYW52YXMuaGVpZ2h0O1xuXG4gICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KGNhbnZhc0hlaWdodCk7XG4gICAgdGhpcy5fbm9kZS5zZXRIZWlnaHQoY2FudmFzSGVpZ2h0ICsgTWV0cmljLlBBRERJTkdfV1JBUFBFUik7XG5cbn07XG5cbkNhbnZhcy5wcm90b3R5cGUub25Hcm91cFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKTtcblxuICAgIHRoaXMuX3NldENhbnZhc1NpemUod2lkdGgsIHdpZHRoKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcbiAgICB0aGlzLl9yZWRyYXcoKTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIG51bGwpKTtcbn07XG5cbkNhbnZhcy5wcm90b3R5cGUuX3NldENhbnZhc1NpemUgPSBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgIHZhciBjYW52YXNXaWR0aCA9IHRoaXMuX2NhbnZhc1dpZHRoID0gd2lkdGgsXG4gICAgICAgIGNhbnZhc0hlaWdodCA9IHRoaXMuX2NhbnZhc0hlaWdodCA9IGhlaWdodDtcblxuICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXM7XG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IGNhbnZhc1dpZHRoICsgJ3B4JztcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGNhbnZhc0hlaWdodCArICdweCc7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhc1dpZHRoO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzSGVpZ2h0O1xufTtcblxuQ2FudmFzLnByb3RvdHlwZS5nZXRDYW52YXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhbnZhcztcbn07XG5cbkNhbnZhcy5wcm90b3R5cGUuZ2V0Q29udGV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbnZhcztcbiIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpLFxuICAgIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG5mdW5jdGlvbiBDaGVja2JveChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5vbkZpbmlzaCA9IHBhcmFtcy5vbkZpbmlzaCB8fCB0aGlzLl9vbkZpbmlzaDtcblxuICAgIHRoaXMuX29uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlO1xuICAgIHRoaXMuX29uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoO1xuXG4gICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXQgPSBuZXcgTm9kZShOb2RlLklOUFVUX0NIRUNLQk9YKTtcbiAgICBpbnB1dC5zZXRQcm9wZXJ0eSgnY2hlY2tlZCcsdGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LkNIQU5HRSx0aGlzLl9vbklucHV0Q2hhbmdlLmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5fd3JhcE5vZGUuYWRkQ2hpbGQodGhpcy5faW5wdXQpO1xufVxuXG5DaGVja2JveC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5DaGVja2JveC5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcblxuICAgIHZhciBvYmogPSB0aGlzLl9vYmplY3QsIGtleSA9IHRoaXMuX2tleTtcbiAgICBvYmpba2V5XSA9ICFvYmpba2V5XTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbn07XG5cbkNoZWNrYm94LnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuQ2hlY2tib3gucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2lucHV0LnNldFByb3BlcnR5KCdjaGVja2VkJywgdGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDaGVja2JveDsiLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi8uLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENvbG9yTW9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JNb2RlJyk7XG52YXIgUGlja2VyID0gcmVxdWlyZSgnLi9QaWNrZXInKTtcbnZhciBDb2xvclV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yVXRpbCcpO1xudmFyIE9wdGlvbnMgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcbnZhciBQcmVzZXRCdG4gPSByZXF1aXJlKCcuL1ByZXNldEJ0bicpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4uL2NvcmUvTWV0cmljJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcblx0Tm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcblx0Q29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbnZhciBDb2xvckZvcm1hdEVycm9yID0gcmVxdWlyZSgnLi4vY29yZS9jb2xvci9Db2xvckZvcm1hdEVycm9yJyk7XG5cbnZhciBERUZBVUxUX0NPTE9SX01PREUgPSBDb2xvck1vZGUuSEVYLFxuXHRERUZBVUxUX1BSRVNFVFMgPSBudWxsO1xuXG52YXIgTVNHX0NPTE9SX0ZPUk1BVF9IRVggPSAnQ29sb3IgZm9ybWF0IHNob3VsZCBiZSBoZXguIFNldCBjb2xvck1vZGUgdG8gcmdiLCByZ2JmdiBvciBoc3YuJyxcblx0TVNHX0NPTE9SX0ZPUk1BVF9SR0JfUkdCRlZfSFNWID0gJ0NvbG9yIGZvcm1hdCBzaG91bGQgYmUgcmdiLCByZ2JmdiBvciBoc3YuIFNldCBjb2xvck1vZGUgdG8gaGV4LicsXG5cdE1TR19DT0xPUl9QUkVTRVRfRk9STUFUX0hFWCA9ICdQcmVzZXQgY29sb3IgZm9ybWF0IHNob3VsZCBiZSBoZXguJyxcblx0TVNHX0NPTE9SX1BSRVNFVF9GT1JNQVRfUkdCX1JHQkZWX0hTViA9ICdQcmVzZXQgY29sb3IgZm9ybWF0IHNob3VsZCBiZSByZ2IsIHJnYmZ2IG9yIGhzdi4nO1xuXG5mdW5jdGlvbiBDb2xvcihwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuXHRPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuXHRwYXJhbXMgPSBwYXJhbXMgfHwge307XG5cdHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcblx0cGFyYW1zLm9uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoIHx8IHRoaXMuX29uRmluaXNoO1xuXHRwYXJhbXMucHJlc2V0cyA9IHBhcmFtcy5wcmVzZXRzIHx8IERFRkFVTFRfUFJFU0VUUztcblx0cGFyYW1zLmNvbG9yTW9kZSA9IHBhcmFtcy5jb2xvck1vZGUgfHwgREVGQVVMVF9DT0xPUl9NT0RFO1xuXG5cdHRoaXMuX29uQ2hhbmdlID0gdGhpcy5fb25GaW5pc2ggPSBwYXJhbXMub25DaGFuZ2U7XG5cdHRoaXMuX3ByZXNldHNLZXkgPSBwYXJhbXMucHJlc2V0cztcblxuXHR2YXIgY29sb3IgPSB0aGlzLl9jb2xvciA9IG5ldyBOb2RlKCk7XG5cdHZhbHVlID0gdGhpcy5fdmFsdWUgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcblxuXHR2YXIgY29sb3JNb2RlID0gdGhpcy5fY29sb3JNb2RlID0gcGFyYW1zLmNvbG9yTW9kZTtcblxuXHR0aGlzLl92YWxpZGF0ZUNvbG9yRm9ybWF0KHZhbHVlLCBNU0dfQ09MT1JfRk9STUFUX0hFWCwgTVNHX0NPTE9SX0ZPUk1BVF9SR0JfUkdCRlZfSFNWKTtcblxuXHR2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcblxuXHRpZiAoIXRoaXMuX3ByZXNldHNLZXkpIHtcblx0XHRjb2xvci5zZXRTdHlsZUNsYXNzKENTUy5Db2xvcik7XG5cdFx0d3JhcE5vZGUuYWRkQ2hpbGQoY29sb3IpO1xuXHR9XG5cdGVsc2Uge1xuXHRcdGNvbG9yLnNldFN0eWxlQ2xhc3MoQ1NTLkNvbG9yKTtcblxuXHRcdHZhciBjb2xvcldyYXAgPSBuZXcgTm9kZSgpO1xuXHRcdGNvbG9yV3JhcC5zZXRTdHlsZUNsYXNzKENTUy5XcmFwQ29sb3JXUHJlc2V0KTtcblxuXHRcdHdyYXBOb2RlLmFkZENoaWxkKGNvbG9yV3JhcCk7XG5cdFx0Y29sb3JXcmFwLmFkZENoaWxkKGNvbG9yKTtcblxuXHRcdHZhciBwcmVzZXRzID0gdGhpcy5fb2JqZWN0W3RoaXMuX3ByZXNldHNLZXldO1xuXG5cdFx0dmFyIGkgPSAtMTtcblx0XHR3aGlsZSAoKytpIDwgcHJlc2V0cy5sZW5ndGgpIHtcblx0XHRcdHRoaXMuX3ZhbGlkYXRlQ29sb3JGb3JtYXQocHJlc2V0c1tpXSwgTVNHX0NPTE9SX1BSRVNFVF9GT1JNQVRfSEVYLFxuXHRcdFx0XHRNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9SR0JfUkdCRlZfSFNWKTtcblx0XHR9XG5cblx0XHR2YXIgb3B0aW9ucyA9IE9wdGlvbnMuZ2V0KCksXG5cdFx0XHRwcmVzZXRCdG4gPSBuZXcgUHJlc2V0QnRuKHdyYXBOb2RlKTtcblxuXHRcdHZhciBvblByZXNldERlYWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRvcHRpb25zLmNsZWFyKCk7XG5cdFx0XHRwcmVzZXRCdG4uZGVhY3RpdmF0ZSgpO1xuXHRcdH07XG5cblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIG9uUHJlc2V0QWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRvcHRpb25zLmJ1aWxkKHByZXNldHMsXG5cdFx0XHRcdHNlbGYuX3ZhbHVlLFxuXHRcdFx0XHRjb2xvcixcblx0XHRcdFx0ZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHNlbGYucHVzaEhpc3RvcnlTdGF0ZSgpO1xuXHRcdFx0XHRcdHNlbGYuX3ZhbHVlID0gcHJlc2V0c1tvcHRpb25zLmdldFNlbGVjdGVkSW5kZXgoKV07XG5cdFx0XHRcdFx0c2VsZi5hcHBseVZhbHVlKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUHJlc2V0RGVhY3RpdmF0ZSxcblx0XHRcdFx0TWV0cmljLlBBRERJTkdfUFJFU0VULFxuXHRcdFx0XHR0cnVlLFxuXHRcdFx0XHRjb2xvck1vZGUpO1xuXHRcdH07XG5cblx0XHRwcmVzZXRCdG4uc2V0T25BY3RpdmUob25QcmVzZXRBY3RpdmF0ZSk7XG5cdFx0cHJlc2V0QnRuLnNldE9uRGVhY3RpdmUob25QcmVzZXREZWFjdGl2YXRlKTtcblx0fVxuXG5cdGNvbG9yLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uQ29sb3JUcmlnZ2VyLmJpbmQodGhpcykpO1xuXG5cdHRoaXMuX3VwZGF0ZUNvbG9yKCk7XG5cbn1cblxuQ29sb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcblxuQ29sb3IucHJvdG90eXBlLl9vbkNvbG9yVHJpZ2dlciA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGNvbG9yTW9kZSA9IHRoaXMuX2NvbG9yTW9kZSxcblx0XHRjb2xvck1vZGVIRVggPSBDb2xvck1vZGUuSEVYLFxuXHRcdGNvbG9yTW9kZVJHQiA9IENvbG9yTW9kZS5SR0IsXG5cdFx0Y29sb3JNb2RlUkdCZnYgPSBDb2xvck1vZGUuUkdCZnYsXG5cdFx0Y29sb3JNb2RlSFNWID0gQ29sb3JNb2RlLkhTVjtcblxuXHR2YXIgdmFsdWUgPSB0aGlzLl92YWx1ZSxcblx0XHR0ZW1wO1xuXG5cdHZhciBvblBpY2tlclBpY2sgPSBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG5cblx0XHRzd2l0Y2ggKGNvbG9yTW9kZSkge1xuXHRcdFx0Y2FzZSBjb2xvck1vZGVIRVg6XG5cdFx0XHRcdHRoaXMuX3ZhbHVlID0gUGlja2VyLmdldEluc3RhbmNlKCkuZ2V0SEVYKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBjb2xvck1vZGVSR0I6XG5cdFx0XHRcdC8vaWYgdmFsID0gRmxvYXQzMmFycmF5IG9yIHNvXG5cdFx0XHRcdHRlbXAgPSBQaWNrZXIuZ2V0SW5zdGFuY2UoKS5nZXRSR0IoKTtcblx0XHRcdFx0dmFsdWVbMF0gPSB0ZW1wWzBdO1xuXHRcdFx0XHR2YWx1ZVsxXSA9IHRlbXBbMV07XG5cdFx0XHRcdHZhbHVlWzJdID0gdGVtcFsyXTtcblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdGNhc2UgY29sb3JNb2RlUkdCZnY6XG5cdFx0XHRcdHRlbXAgPSBQaWNrZXIuZ2V0SW5zdGFuY2UoKS5nZXRSR0JmdigpO1xuXHRcdFx0XHR2YWx1ZVswXSA9IHRlbXBbMF07XG5cdFx0XHRcdHZhbHVlWzFdID0gdGVtcFsxXTtcblx0XHRcdFx0dmFsdWVbMl0gPSB0ZW1wWzJdO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSBjb2xvck1vZGVIU1Y6XG5cdFx0XHRcdHRoaXMuX3ZhbHVlID0gUGlja2VyLmdldEluc3RhbmNlKCkuZ2V0SFNWKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHRoaXMuYXBwbHlWYWx1ZSgpO1xuXG5cdH0uYmluZCh0aGlzKTtcblxuXHR2YXIgcGlja2VyID0gUGlja2VyLmdldEluc3RhbmNlKCk7XG5cblx0c3dpdGNoIChjb2xvck1vZGUpIHtcblx0XHRjYXNlIGNvbG9yTW9kZUhFWDpcblx0XHRcdHBpY2tlci5zZXRDb2xvckhFWCh2YWx1ZSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIGNvbG9yTW9kZVJHQjpcblx0XHRcdHBpY2tlci5zZXRDb2xvclJHQih2YWx1ZVswXSwgdmFsdWVbMV0sIHZhbHVlWzJdKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgY29sb3JNb2RlUkdCZnY6XG5cdFx0XHRwaWNrZXIuc2V0Q29sb3JSR0Jmdih2YWx1ZVswXSwgdmFsdWVbMV0sIHZhbHVlWzJdKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgY29sb3JNb2RlSFNWOlxuXHRcdFx0cGlja2VyLnNldENvbG9ySFNWKHZhbHVlWzBdLCB2YWx1ZVsxXSwgdmFsdWVbMl0pO1xuXHRcdFx0YnJlYWs7XG5cdH1cblxuXHRwaWNrZXIuc2V0Q2FsbGJhY2tQaWNrKG9uUGlja2VyUGljayk7XG5cdHBpY2tlci5vcGVuKCk7XG59O1xuXG5Db2xvci5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fb2JqZWN0W3RoaXMuX2tleV0gPSB0aGlzLl92YWx1ZTtcblx0dGhpcy5fdXBkYXRlQ29sb3IoKTtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xufTtcblxuQ29sb3IucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuXHRpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXJldHVybjtcblx0dGhpcy5fdmFsdWUgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcblx0dGhpcy5fdXBkYXRlQ29sb3IoKTtcbn07XG5cbkNvbG9yLnByb3RvdHlwZS5fdXBkYXRlQ29sb3IgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBjb2xvciA9IHRoaXMuX3ZhbHVlLFxuXHRcdGNvbG9yTm9kZSA9IHRoaXMuX2NvbG9yLFxuXHRcdG5vZGVDb2xvcjtcblxuXHRjb2xvck5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGNvbG9yKTtcblxuXHRzd2l0Y2ggKHRoaXMuX2NvbG9yTW9kZSkge1xuXHRcdGNhc2UgQ29sb3JNb2RlLkhFWDpcblx0XHRcdG5vZGVDb2xvciA9IGNvbG9yO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIENvbG9yTW9kZS5SR0I6XG5cdFx0XHRub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCMkhFWChjb2xvclswXSwgY29sb3JbMV0sIGNvbG9yWzJdKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSBDb2xvck1vZGUuUkdCZnY6XG5cdFx0XHRub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCZnYySEVYKGNvbG9yWzBdLCBjb2xvclsxXSwgY29sb3JbMl0pO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIENvbG9yTW9kZS5IU1Y6XG5cdFx0XHRub2RlQ29sb3IgPSBDb2xvclV0aWwuSFNWMlJHQihjb2xvclswXSwgY29sb3JbMV0sIGNvbG9yWzJdKTtcblx0XHRcdGJyZWFrO1xuXHR9XG5cblx0Y29sb3JOb2RlLmdldFN0eWxlKCkuYmFja2dyb3VuZENvbG9yID0gbm9kZUNvbG9yO1xufTtcblxuQ29sb3IucHJvdG90eXBlLl92YWxpZGF0ZUNvbG9yRm9ybWF0ID0gZnVuY3Rpb24gKHZhbHVlLCBtc2dIZXgsIG1zZ0Fycikge1xuXHR2YXIgY29sb3JNb2RlID0gdGhpcy5fY29sb3JNb2RlO1xuXG5cblx0aWYgKGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuSEVYICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScgfHxcblx0XHRjb2xvck1vZGUgPT0gQ29sb3JNb2RlLkhFWCAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBGbG9hdDMyQXJyYXldJykge1xuXHRcdHRocm93IG5ldyBDb2xvckZvcm1hdEVycm9yKG1zZ0hleCk7XG5cdH1cblx0aWYgKChjb2xvck1vZGUgPT0gQ29sb3JNb2RlLlJHQiB8fFxuXHRcdGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuUkdCZnYgfHxcblx0XHRjb2xvck1vZGUgPT0gQ29sb3JNb2RlLkhTVikgJiZcblx0XHRPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICE9PSAnW29iamVjdCBBcnJheV0nIHx8XG5cdFx0Y29sb3JNb2RlID09IENvbG9yTW9kZS5IU1YgJiZcblx0XHRPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICE9PSAnW29iamVjdCBGbG9hdDMyQXJyYXldJykge1xuXHRcdHRocm93IG5ldyBDb2xvckZvcm1hdEVycm9yKG1zZ0Fycik7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sb3I7IiwidmFyIEZ1bmN0aW9uUGxvdFR5cGUgPSB7XG4gICAgSU1QTElDSVQ6ICdpbXBsaWNpdCcsXG4gICAgTk9OX0lNUExJQ0lUOiAnbm9uSW1wbGljaXQnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZ1bmN0aW9uUGxvdFR5cGU7IiwidmFyIFBsb3R0ZXIgPSByZXF1aXJlKCcuL1Bsb3R0ZXInKTtcblxudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIEZ1bmN0aW9uUGxvdFR5cGUgPSByZXF1aXJlKCcuL0Z1bmN0aW9uUGxvdFR5cGUnKTtcbnZhciBQcmVzZXQgPSByZXF1aXJlKCcuLi9jb3JlL1ByZXNldCcpO1xuXG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi4vY29yZS9NZXRyaWMnKTtcblxudmFyIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xuXG52YXIgRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3IgPSByZXF1aXJlKCcuL0Z1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yJyksXG4gICAgRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IgPSByZXF1aXJlKCcuL0Z1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yJyk7XG5cbnZhciBPYmplY3RDb21wb25lbnROb3RpZmllciA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Tm90aWZpZXInKTtcblxudmFyIERFRkFVTFRfU0hPV19NSU5fTUFYX0xBQkVMUyA9IHRydWU7XG5cbmZ1bmN0aW9uIEZ1bmN0aW9uUGxvdHRlcihwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMuc2hvd01pbk1heExhYmVscyA9IHBhcmFtcy5zaG93TWluTWF4TGFiZWxzID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1NIT1dfTUlOX01BWF9MQUJFTFMgOiBwYXJhbXMuc2hvd01pbk1heExhYmVscztcblxuICAgIFBsb3R0ZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIGlmICh0eXBlb2Ygb2JqZWN0W3ZhbHVlXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3Iob2JqZWN0LHZhbHVlKTtcbiAgICB9XG5cbiAgICB2YXIgZnVuY0FyZ0xlbmd0aCA9IG9iamVjdFt2YWx1ZV0ubGVuZ3RoO1xuXG4gICAgaWYgKGZ1bmNBcmdMZW5ndGggPiAyIHx8IGZ1bmNBcmdMZW5ndGggPT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IoKTtcbiAgICB9XG5cbiAgICB2YXIgc3ZnUm9vdCA9IHRoaXMuX3N2Z1Jvb3QsXG4gICAgICAgIHBhdGggPSB0aGlzLl9wYXRoO1xuXG4gICAgdmFyIGF4ZXMgPSB0aGlzLl9heGVzID0gc3ZnUm9vdC5pbnNlcnRCZWZvcmUodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdwYXRoJyksIHBhdGgpO1xuICAgIGF4ZXMuc3R5bGUuc3Ryb2tlV2lkdGggPSAxO1xuXG4gICAgdmFyIGF4ZXNMYWJlbHMgPSB0aGlzLl9heGVzTGFiZWxzID0gc3ZnUm9vdC5pbnNlcnRCZWZvcmUodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdwYXRoJyksIHBhdGgpO1xuICAgIGF4ZXNMYWJlbHMuc3R5bGUuc3Ryb2tlID0gJ3JnYig0Myw0OCw1MSknO1xuICAgIGF4ZXNMYWJlbHMuc3R5bGUuc3Ryb2tlV2lkdGggPSAxO1xuXG4gICAgdmFyIGdyaWQgPSB0aGlzLl9ncmlkO1xuXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyxcbiAgICAgICAgc2l6ZSA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcblxuICAgIHZhciBzbGlkZXJYV3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHNsaWRlclhXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWFdyYXApO1xuXG4gICAgdmFyIHNsaWRlcllXcmFwID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWVdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJZV3JhcCk7XG5cbiAgICB2YXIgc2xpZGVyWFRyYWNrID0gdGhpcy5fc2xpZGVyWFRyYWNrID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWFRyYWNrLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWCk7XG5cbiAgICB2YXIgc2xpZGVyWVRyYWNrID0gdGhpcy5fc2xpZGVyWVRyYWNrID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWVRyYWNrLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWSk7XG5cbiAgICB2YXIgc2xpZGVyWEhhbmRsZSA9IHRoaXMuX3NsaWRlclhIYW5kbGUgPSBuZXcgTm9kZSgpO1xuICAgICAgICBzbGlkZXJYSGFuZGxlLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWEhhbmRsZSk7XG5cbiAgICB2YXIgc2xpZGVyWUhhbmRsZSA9IHRoaXMuX3NsaWRlcllIYW5kbGUgPSBuZXcgTm9kZSgpO1xuICAgICAgICBzbGlkZXJZSGFuZGxlLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWUhhbmRsZSk7XG5cbiAgICBzbGlkZXJYVHJhY2suYWRkQ2hpbGQoc2xpZGVyWEhhbmRsZSk7XG4gICAgc2xpZGVyWVRyYWNrLmFkZENoaWxkKHNsaWRlcllIYW5kbGUpO1xuICAgIHNsaWRlclhXcmFwLmFkZENoaWxkKHNsaWRlclhUcmFjayk7XG4gICAgc2xpZGVyWVdyYXAuYWRkQ2hpbGQoc2xpZGVyWVRyYWNrKTtcblxuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlO1xuXG4gICAgdmFyIHBsb3RNb2RlID0gdGhpcy5fcGxvdE1vZGUgPSBmdW5jQXJnTGVuZ3RoID09IDEgP1xuICAgICAgICBGdW5jdGlvblBsb3RUeXBlLk5PTl9JTVBMSUNJVCA6XG4gICAgICAgIEZ1bmN0aW9uUGxvdFR5cGUuSU1QTElDSVQ7XG5cbiAgICBpZiAocGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5JTVBMSUNJVCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBzaXplICsgJ3B4JztcbiAgICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzLmhlaWdodCA9IHNpemU7XG5cbiAgICAgICAgd3JhcE5vZGUuZ2V0RWxlbWVudCgpLmluc2VydEJlZm9yZShjYW52YXMsIHN2Zyk7XG5cbiAgICAgICAgdGhpcy5fY2FudmFzQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICB0aGlzLl9jYW52YXNJbWFnZURhdGEgPSB0aGlzLl9jYW52YXNDb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCBzaXplLCBzaXplKTtcblxuICAgICAgICBheGVzLnN0eWxlLnN0cm9rZSA9IFByZXNldC5GVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX0FYRVNfQ09MT1I7XG4gICAgICAgIGdyaWQuc3R5bGUuc3Ryb2tlID0gUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfR1JJRF9DT0xPUjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGF4ZXMuc3R5bGUuc3Ryb2tlID0gUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX0FYRVNfQ09MT1I7XG4gICAgICAgIGdyaWQuc3R5bGUuc3Ryb2tlID0gUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX0dSSURfQ09MT1I7XG4gICAgfVxuXG4gICAgd3JhcE5vZGUuYWRkQ2hpbGQoc2xpZGVyWFdyYXApO1xuICAgIHdyYXBOb2RlLmFkZENoaWxkKHNsaWRlcllXcmFwKTtcblxuICAgIHNsaWRlclhIYW5kbGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25TbGlkZXJYSGFuZGxlRG93bi5iaW5kKHRoaXMpKTtcbiAgICBzbGlkZXJZSGFuZGxlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uU2xpZGVyWUhhbmRsZURvd24uYmluZCh0aGlzKSk7XG5cbiAgICB2YXIgdW5pdHMgPSB0aGlzLl91bml0cyA9IFtudWxsLCBudWxsXTtcbiAgICB0aGlzLl9zY2FsZSA9IG51bGw7XG5cbiAgICBpZiAocGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5OT05fSU1QTElDSVQpIHtcbiAgICAgICAgdW5pdHNbMF0gPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfVU5JVF9YO1xuICAgICAgICB1bml0c1sxXSA9IFByZXNldC5GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1k7XG5cbiAgICAgICAgdGhpcy5fc2NhbGUgPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfU0NBTEU7XG4gICAgfVxuICAgIGVsc2UgaWYgKHBsb3RNb2RlID09IEZ1bmN0aW9uUGxvdFR5cGUuSU1QTElDSVQpIHtcbiAgICAgICAgdW5pdHNbMF0gPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9VTklUX1g7XG4gICAgICAgIHVuaXRzWzFdID0gUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfVU5JVF9ZO1xuXG4gICAgICAgIHRoaXMuX3NjYWxlID0gUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfU0NBTEU7XG4gICAgfVxuXG4gICAgdGhpcy5fdW5pdHNNaW5NYXggPSBbUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfVU5JVF9NSU4sIFByZXNldC5GVU5DVElPTl9QTE9UVEVSX1VOSVRfTUFYXTsgLy8xLzgtPjRcblxuICAgIHRoaXMuX3NjYWxlTWluTWF4ID0gW1ByZXNldC5GVU5DVElPTl9QTE9UVEVSX1NDQUxFX01JTiwgUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUFYXTsgLy8xLzUwIC0+IDI1XG5cbiAgICB0aGlzLl9jZW50ZXIgPSBbTWF0aC5yb3VuZChzaXplICogMC41KSxNYXRoLnJvdW5kKHNpemUgKiAwLjUpXTtcbiAgICB0aGlzLl9zdmdQb3MgPSBbMCwgMF07XG5cbiAgICB0aGlzLl9mdW5jID0gbnVsbDtcbiAgICB0aGlzLnNldEZ1bmN0aW9uKHRoaXMuX29iamVjdFt0aGlzLl9rZXldKTtcblxuICAgIHRoaXMuX3NsaWRlclhIYW5kbGVVcGRhdGUoKTtcbiAgICB0aGlzLl9zbGlkZXJZSGFuZGxlVXBkYXRlKCk7XG5cbiAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uRHJhZ1N0YXJ0LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgICB0aGlzLl93cmFwTm9kZS5nZXRFbGVtZW50KCkuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNld2hlZWxcIiwgdGhpcy5fb25TY2FsZS5iaW5kKHRoaXMsIGZhbHNlKSk7XG5cbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKS5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwgdGhpcywgJ29uVmFsdWVVcGRhdGUnKTtcbn1cblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGxvdHRlci5wcm90b3R5cGUpO1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl91cGRhdGVDZW50ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyxcbiAgICAgICAgd2lkdGggPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIGhlaWdodCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XG5cbiAgICB2YXIgbW91c2VQb3MgPSBNb3VzZS5nZXRJbnN0YW5jZSgpLmdldFBvc2l0aW9uKCksXG4gICAgICAgIHN2Z1BvcyA9IHRoaXMuX3N2Z1BvcyxcbiAgICAgICAgY2VudGVyID0gdGhpcy5fY2VudGVyO1xuXG4gICAgY2VudGVyWzBdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VQb3NbMF0gLSBzdmdQb3NbMF0sIHdpZHRoKSk7XG4gICAgY2VudGVyWzFdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VQb3NbMV0gLSBzdmdQb3NbMV0sIGhlaWdodCkpO1xuXG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9vbkRyYWdTdGFydCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9zdmc7XG5cbiAgICB2YXIgc3ZnUG9zID0gdGhpcy5fc3ZnUG9zO1xuICAgIHN2Z1Bvc1swXSA9IDA7XG4gICAgc3ZnUG9zWzFdID0gMDtcblxuICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgIHN2Z1Bvc1swXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgIHN2Z1Bvc1sxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgIH1cblxuICAgIHZhciBldmVudE1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50VXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIG9uRHJhZyA9IHRoaXMuX3VwZGF0ZUNlbnRlci5iaW5kKHRoaXMpLFxuICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl91cGRhdGVDZW50ZXIuYmluZCh0aGlzKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG5cbiAgICAgICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG5cbiAgICB0aGlzLl91cGRhdGVDZW50ZXIoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uU2NhbGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIGUgPSB3aW5kb3cuZXZlbnQgfHwgZTtcbiAgICB0aGlzLl9zY2FsZSArPSBNYXRoLm1heCgtMSwgTWF0aC5taW4oMSwgKGUud2hlZWxEZWx0YSB8fCAtZS5kZXRhaWwpKSkgKiAtMTtcblxuICAgIHZhciBzY2FsZU1pbk1heCA9IHRoaXMuX3NjYWxlTWluTWF4O1xuICAgIHRoaXMuX3NjYWxlID0gTWF0aC5tYXgoc2NhbGVNaW5NYXhbMF0sIE1hdGgubWluKHRoaXMuX3NjYWxlLCBzY2FsZU1pbk1heFsxXSkpO1xuXG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEZ1bmN0aW9uKHRoaXMuX29iamVjdFt0aGlzLl9rZXldKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3JlZHJhdyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5fcGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5JTVBMSUNJVCkge1xuICAgICAgICB2YXIgc2l6ZSA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCksXG4gICAgICAgICAgICBjYW52YXMgPSB0aGlzLl9jYW52YXM7XG5cbiAgICAgICAgY2FudmFzLnN0eWxlLndpZHRoID0gY2FudmFzLnN0eWxlLmhlaWdodCA9IHNpemUgKyAncHgnO1xuICAgICAgICBjYW52YXMud2lkdGggPSBjYW52YXMuaGVpZ2h0ID0gc2l6ZTtcblxuICAgICAgICB0aGlzLl9jYW52YXNJbWFnZURhdGEgPSB0aGlzLl9jYW52YXNDb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCBzaXplLCBzaXplKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zbGlkZXJYSGFuZGxlVXBkYXRlKCk7XG4gICAgdGhpcy5fc2xpZGVyWUhhbmRsZVVwZGF0ZSgpO1xuXG4gICAgdGhpcy5zZXRGdW5jdGlvbih0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLnNldEZ1bmN0aW9uID0gZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICB0aGlzLl9mdW5jID0gZnVuYy5iaW5kKHRoaXMuX29iamVjdCk7XG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9wbG90R3JhcGggPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZHJhd0dyaWQoKTtcbiAgICB0aGlzLl9kcmF3QXhlcygpO1xuICAgIHRoaXMuX2RyYXdQbG90KCk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9kcmF3QXhlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnLFxuICAgICAgICBzdmdXaWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgc3ZnSGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcblxuICAgIHZhciBjZW50ZXIgPSB0aGlzLl9jZW50ZXIsXG4gICAgICAgIGNlbnRlclggPSBjZW50ZXJbMF0sXG4gICAgICAgIGNlbnRlclkgPSBjZW50ZXJbMV07XG5cbiAgICB2YXIgcGF0aENtZCA9ICcnO1xuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUoMCwgY2VudGVyWSwgc3ZnV2lkdGgsIGNlbnRlclkpO1xuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUoY2VudGVyWCwgMCwgY2VudGVyWCwgc3ZnSGVpZ2h0KTtcblxuICAgIHRoaXMuX2F4ZXMuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9kcmF3UGxvdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd2lkdGgsIGhlaWdodDtcblxuICAgIHZhciBjZW50ZXIgPSB0aGlzLl9jZW50ZXIsXG4gICAgICAgIGNlbnRlclggPSBjZW50ZXJbMF0sXG4gICAgICAgIGNlbnRlclkgPSBjZW50ZXJbMV07XG5cbiAgICB2YXIgdW5pdHMgPSB0aGlzLl91bml0cyxcbiAgICAgICAgdW5pdFgsIHVuaXRZO1xuXG4gICAgdmFyIHNjYWxlID0gdGhpcy5fc2NhbGU7XG4gICAgdmFyIG5vcm12YWwsIHNjYWxlZFZhbCwgdmFsdWUsIGluZGV4O1xuICAgIHZhciBvZmZzZXRYLCBvZmZzZXRZO1xuXG4gICAgdmFyIGk7XG5cbiAgICBpZiAodGhpcy5fcGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5OT05fSU1QTElDSVQpIHtcbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZztcblxuICAgICAgICB3aWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcbiAgICAgICAgaGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcbiAgICAgICAgdW5pdFggPSB1bml0c1swXSAqIHNjYWxlO1xuICAgICAgICB1bml0WSA9IGhlaWdodCAvICh1bml0c1sxXSAqIHNjYWxlKTtcbiAgICAgICAgb2Zmc2V0WCA9IGNlbnRlclggLyB3aWR0aDtcblxuICAgICAgICB2YXIgbGVuID0gTWF0aC5mbG9vcih3aWR0aCksXG4gICAgICAgICAgICBwb2ludHMgPSBuZXcgQXJyYXkobGVuICogMik7XG5cbiAgICAgICAgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICBub3JtdmFsID0gKC1vZmZzZXRYICsgaSAvIGxlbik7XG4gICAgICAgICAgICBzY2FsZWRWYWwgPSBub3JtdmFsICogdW5pdFg7XG4gICAgICAgICAgICB2YWx1ZSA9IGNlbnRlclkgLSB0aGlzLl9mdW5jKHNjYWxlZFZhbCkgKiB1bml0WTtcblxuICAgICAgICAgICAgaW5kZXggPSBpICogMjtcblxuICAgICAgICAgICAgcG9pbnRzW2luZGV4XSA9IGk7XG4gICAgICAgICAgICBwb2ludHNbaW5kZXggKyAxXSA9IHZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHBhdGhDbWQgPSAnJztcbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTW92ZVRvKHBvaW50c1swXSwgcG9pbnRzWzFdKTtcblxuICAgICAgICBpID0gMjtcbiAgICAgICAgd2hpbGUgKGkgPCBwb2ludHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lVG8ocG9pbnRzW2ldLCBwb2ludHNbaSArIDFdKTtcbiAgICAgICAgICAgIGkgKz0gMjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3BhdGguc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzLFxuICAgICAgICAgICAgY29udGV4dCA9IHRoaXMuX2NhbnZhc0NvbnRleHQsXG4gICAgICAgICAgICBpbWdEYXRhID0gdGhpcy5fY2FudmFzSW1hZ2VEYXRhO1xuXG4gICAgICAgIHdpZHRoID0gY2FudmFzLndpZHRoO1xuICAgICAgICBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0O1xuXG4gICAgICAgIHVuaXRYID0gdW5pdHNbMF0gKiBzY2FsZTtcbiAgICAgICAgdW5pdFkgPSB1bml0c1sxXSAqIHNjYWxlO1xuXG4gICAgICAgIG9mZnNldFggPSBjZW50ZXJYIC8gd2lkdGg7XG4gICAgICAgIG9mZnNldFkgPSBjZW50ZXJZIC8gaGVpZ2h0O1xuXG4gICAgICAgIHZhciBpbnZXaWR0aCA9IDEgLyB3aWR0aCxcbiAgICAgICAgICAgIGludkhlaWdodCA9IDEgLyBoZWlnaHQ7XG4gICAgICAgIHZhciByZ2IgPSBbMCwgMCwgMF07XG5cbiAgICAgICAgdmFyIGNvbDAgPSBbMzAsIDM0LCAzNl0sXG4gICAgICAgICAgICBjb2wxID0gWzI1NSwgMjU1LCAyNTVdO1xuXG4gICAgICAgIGkgPSAtMTtcbiAgICAgICAgdmFyIGo7XG4gICAgICAgIHdoaWxlICgrK2kgPCBoZWlnaHQpIHtcbiAgICAgICAgICAgIGogPSAtMTtcblxuICAgICAgICAgICAgd2hpbGUgKCsraiA8IHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLl9mdW5jKCgtb2Zmc2V0WCArIGogKiBpbnZXaWR0aCkgKiB1bml0WCxcbiAgICAgICAgICAgICAgICAgICAgKC1vZmZzZXRZICsgaSAqIGludkhlaWdodCkgKiB1bml0WSk7XG5cbiAgICAgICAgICAgICAgICByZ2JbMF0gPSBNYXRoLmZsb29yKChjb2wxWzBdIC0gY29sMFswXSkgKiB2YWx1ZSArIGNvbDBbMF0pO1xuICAgICAgICAgICAgICAgIHJnYlsxXSA9IE1hdGguZmxvb3IoKGNvbDFbMV0gLSBjb2wwWzFdKSAqIHZhbHVlICsgY29sMFsxXSk7XG4gICAgICAgICAgICAgICAgcmdiWzJdID0gTWF0aC5mbG9vcigoY29sMVsyXSAtIGNvbDBbMl0pICogdmFsdWUgKyBjb2wwWzJdKTtcblxuICAgICAgICAgICAgICAgIGluZGV4ID0gKGkgKiB3aWR0aCArIGopICogNDtcblxuICAgICAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpbmRleF0gPSByZ2JbMF07XG4gICAgICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2luZGV4ICsgMV0gPSByZ2JbMV07XG4gICAgICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2luZGV4ICsgMl0gPSByZ2JbMl07XG4gICAgICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2luZGV4ICsgM10gPSAyNTU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgY29udGV4dC5wdXRJbWFnZURhdGEoaW1nRGF0YSwgMCwgMCk7XG4gICAgfVxufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fZHJhd0dyaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyxcbiAgICAgICAgd2lkdGggPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIGhlaWdodCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XG5cbiAgICB2YXIgc2NhbGUgPSB0aGlzLl9zY2FsZTtcblxuICAgIHZhciBncmlkUmVzID0gdGhpcy5fdW5pdHMsXG4gICAgICAgIGdyaWRTcGFjaW5nWCA9IHdpZHRoIC8gKGdyaWRSZXNbMF0gKiBzY2FsZSksXG4gICAgICAgIGdyaWRTcGFjaW5nWSA9IGhlaWdodCAvIChncmlkUmVzWzFdICogc2NhbGUpO1xuXG4gICAgdmFyIGNlbnRlciA9IHRoaXMuX2NlbnRlcixcbiAgICAgICAgY2VudGVyWCA9IGNlbnRlclswXSxcbiAgICAgICAgY2VudGVyWSA9IGNlbnRlclsxXTtcblxuICAgIHZhciBncmlkTnVtVG9wID0gTWF0aC5yb3VuZChjZW50ZXJZIC8gZ3JpZFNwYWNpbmdZKSArIDEsXG4gICAgICAgIGdyaWROdW1Cb3R0b20gPSBNYXRoLnJvdW5kKChoZWlnaHQgLSBjZW50ZXJZKSAvIGdyaWRTcGFjaW5nWSkgKyAxLFxuICAgICAgICBncmlkTnVtTGVmdCA9IE1hdGgucm91bmQoY2VudGVyWCAvIGdyaWRTcGFjaW5nWCkgKyAxLFxuICAgICAgICBncmlkTnVtUmlnaHQgPSBNYXRoLnJvdW5kKCh3aWR0aCAtIGNlbnRlclgpIC8gZ3JpZFNwYWNpbmdYKSArIDE7XG5cbiAgICB2YXIgcGF0aENtZEdyaWQgPSAnJyxcbiAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgPSAnJztcblxuICAgIHZhciBpLCB0ZW1wO1xuXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XG5cbiAgICB2YXIgbGFiZWxUaWNrU2l6ZSA9IE1ldHJpYy5GVU5DVElPTl9QTE9UVEVSX0xBQkVMX1RJQ0tfU0laRSxcbiAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0ID0gd2lkdGggLSBsYWJlbFRpY2tTaXplIC0gc3Ryb2tlU2l6ZSxcbiAgICAgICAgbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSA9IGhlaWdodCAtIGxhYmVsVGlja1NpemUgLSBzdHJva2VTaXplLFxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nUmlnaHRPZmZzZXQgPSBsYWJlbFRpY2tQYWRkaW5nUmlnaHQgLSBsYWJlbFRpY2tTaXplLFxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nQm90dG9tT2Zmc2V0ID0gbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSAtIGxhYmVsVGlja1NpemUsXG4gICAgICAgIGxhYmVsVGlja09mZnNldFJpZ2h0ID0gbGFiZWxUaWNrUGFkZGluZ1JpZ2h0IC0gKGxhYmVsVGlja1NpemUgKyBzdHJva2VTaXplKSAqIDIsXG4gICAgICAgIGxhYmVsVGlja09mZnNldEJvdHRvbSA9IGxhYmVsVGlja1BhZGRpbmdCb3R0b20gLSAobGFiZWxUaWNrU2l6ZSArIHN0cm9rZVNpemUpICogMjtcblxuICAgIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgZ3JpZE51bVRvcCkge1xuICAgICAgICB0ZW1wID0gTWF0aC5yb3VuZChjZW50ZXJZIC0gZ3JpZFNwYWNpbmdZICogaSk7XG4gICAgICAgIHBhdGhDbWRHcmlkICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIHRlbXAsIHdpZHRoLCB0ZW1wKTtcblxuICAgICAgICBpZiAodGVtcCA+IGxhYmVsVGlja1NpemUpe1xuICAgICAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgKz0gdGhpcy5fcGF0aENtZExpbmUobGFiZWxUaWNrUGFkZGluZ1JpZ2h0LCB0ZW1wLFxuICAgICAgICAgICAgICAgIGxhYmVsVGlja1BhZGRpbmdSaWdodE9mZnNldCwgdGVtcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IGdyaWROdW1Cb3R0b20pIHtcbiAgICAgICAgdGVtcCA9IE1hdGgucm91bmQoY2VudGVyWSArIGdyaWRTcGFjaW5nWSAqIGkpO1xuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCB0ZW1wLCB3aWR0aCwgdGVtcCk7XG5cbiAgICAgICAgaWYgKHRlbXAgPCBsYWJlbFRpY2tPZmZzZXRCb3R0b20pe1xuICAgICAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgKz0gdGhpcy5fcGF0aENtZExpbmUobGFiZWxUaWNrUGFkZGluZ1JpZ2h0LCB0ZW1wLFxuICAgICAgICAgICAgICAgIGxhYmVsVGlja1BhZGRpbmdSaWdodE9mZnNldCwgdGVtcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IGdyaWROdW1MZWZ0KSB7XG4gICAgICAgIHRlbXAgPSBNYXRoLnJvdW5kKGNlbnRlclggLSBncmlkU3BhY2luZ1ggKiBpKTtcbiAgICAgICAgcGF0aENtZEdyaWQgKz0gdGhpcy5fcGF0aENtZExpbmUodGVtcCwgMCwgdGVtcCwgaGVpZ2h0KTtcblxuICAgICAgICBpZiAodGVtcCA+IGxhYmVsVGlja1NpemUpe1xuICAgICAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgKz0gdGhpcy5fcGF0aENtZExpbmUodGVtcCwgbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSxcbiAgICAgICAgICAgICAgICB0ZW1wLCBsYWJlbFRpY2tQYWRkaW5nQm90dG9tT2Zmc2V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgZ3JpZE51bVJpZ2h0KSB7XG4gICAgICAgIHRlbXAgPSBNYXRoLnJvdW5kKGNlbnRlclggKyBncmlkU3BhY2luZ1ggKiBpKTtcbiAgICAgICAgcGF0aENtZEdyaWQgKz0gdGhpcy5fcGF0aENtZExpbmUodGVtcCwgMCwgdGVtcCwgaGVpZ2h0KTtcblxuICAgICAgICBpZiAodGVtcCA8IGxhYmVsVGlja09mZnNldFJpZ2h0KXtcbiAgICAgICAgICAgIHBhdGhDbWRBeGVzTGFiZWxzICs9IHRoaXMuX3BhdGhDbWRMaW5lKHRlbXAsIGxhYmVsVGlja1BhZGRpbmdCb3R0b20sXG4gICAgICAgICAgICAgICAgdGVtcCwgbGFiZWxUaWNrUGFkZGluZ0JvdHRvbU9mZnNldCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9ncmlkLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWRHcmlkKTtcbiAgICB0aGlzLl9heGVzTGFiZWxzLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWRBeGVzTGFiZWxzKTtcbn07XG5cblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fc2xpZGVyWFN0ZXAgPSBmdW5jdGlvbiAobW91c2VQb3MpIHtcbiAgICB2YXIgbW91c2VYID0gbW91c2VQb3NbMF07XG5cbiAgICB2YXIgaGFuZGxlID0gdGhpcy5fc2xpZGVyWEhhbmRsZSxcbiAgICAgICAgaGFuZGxlV2lkdGggPSBoYW5kbGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgaGFuZGxlV2lkdGhIYWxmID0gaGFuZGxlV2lkdGggKiAwLjU7XG5cbiAgICB2YXIgdHJhY2sgPSB0aGlzLl9zbGlkZXJYVHJhY2ssXG4gICAgICAgIHRyYWNrV2lkdGggPSB0cmFjay5nZXRXaWR0aCgpLFxuICAgICAgICB0cmFja0xlZnQgPSB0cmFjay5nZXRQb3NpdGlvbkdsb2JhbFgoKTtcblxuICAgIHZhciBzdHJva2VTaXplID0gTWV0cmljLlNUUk9LRV9TSVpFO1xuXG4gICAgdmFyIG1heCA9IHRyYWNrV2lkdGggLSBoYW5kbGVXaWR0aEhhbGYgLSBzdHJva2VTaXplICogMjtcblxuICAgIHZhciBwb3MgPSBNYXRoLm1heChoYW5kbGVXaWR0aEhhbGYsIE1hdGgubWluKG1vdXNlWCAtIHRyYWNrTGVmdCwgbWF4KSksXG4gICAgICAgIGhhbmRsZVBvcyA9IHBvcyAtIGhhbmRsZVdpZHRoSGFsZjtcblxuICAgIGhhbmRsZS5zZXRQb3NpdGlvblgoaGFuZGxlUG9zKTtcblxuICAgIHZhciB1bml0c01pbiA9IHRoaXMuX3VuaXRzTWluTWF4WzBdLFxuICAgICAgICB1bml0c01heCA9IHRoaXMuX3VuaXRzTWluTWF4WzFdO1xuXG4gICAgdmFyIG5vcm1WYWwgPSAocG9zIC0gaGFuZGxlV2lkdGhIYWxmKSAvIChtYXggLSBoYW5kbGVXaWR0aEhhbGYpLFxuICAgICAgICBtYXBwZWRWYWwgPSB1bml0c01pbiArICh1bml0c01heCAtIHVuaXRzTWluKSAqIG5vcm1WYWw7XG5cbiAgICB0aGlzLl91bml0c1swXSA9IG1hcHBlZFZhbDtcblxuICAgIHRoaXMuX3Bsb3RHcmFwaCgpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fc2xpZGVyWVN0ZXAgPSBmdW5jdGlvbiAobW91c2VQb3MpIHtcbiAgICB2YXIgbW91c2VZID0gbW91c2VQb3NbMV07XG5cbiAgICB2YXIgaGFuZGxlID0gdGhpcy5fc2xpZGVyWUhhbmRsZSxcbiAgICAgICAgaGFuZGxlSGVpZ2h0ID0gaGFuZGxlLmdldEhlaWdodCgpLFxuICAgICAgICBoYW5kbGVIZWlnaHRIYWxmID0gaGFuZGxlSGVpZ2h0ICogMC41O1xuXG4gICAgdmFyIHRyYWNrID0gdGhpcy5fc2xpZGVyWVRyYWNrLFxuICAgICAgICB0cmFja0hlaWdodCA9IHRyYWNrLmdldEhlaWdodCgpLFxuICAgICAgICB0cmFja1RvcCA9IHRyYWNrLmdldFBvc2l0aW9uR2xvYmFsWSgpO1xuXG4gICAgdmFyIG1heCA9IHRyYWNrSGVpZ2h0IC0gaGFuZGxlSGVpZ2h0SGFsZiAtIDI7XG5cbiAgICB2YXIgcG9zID0gTWF0aC5tYXgoaGFuZGxlSGVpZ2h0SGFsZiwgTWF0aC5taW4obW91c2VZIC0gdHJhY2tUb3AsIG1heCkpLFxuICAgICAgICBoYW5kbGVQb3MgPSBwb3MgLSBoYW5kbGVIZWlnaHRIYWxmO1xuXG4gICAgaGFuZGxlLnNldFBvc2l0aW9uWShoYW5kbGVQb3MpO1xuXG4gICAgdmFyIHVuaXRzTWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXG4gICAgICAgIHVuaXRzTWluID0gdGhpcy5fdW5pdHNNaW5NYXhbMV07XG5cbiAgICB2YXIgbm9ybVZhbCA9IChwb3MgLSBoYW5kbGVIZWlnaHRIYWxmKSAvIChtYXggLSBoYW5kbGVIZWlnaHRIYWxmKSxcbiAgICAgICAgbWFwcGVkVmFsID0gdW5pdHNNaW4gKyAodW5pdHNNYXggLSB1bml0c01pbikgKiBub3JtVmFsO1xuXG4gICAgdGhpcy5fdW5pdHNbMV0gPSBtYXBwZWRWYWw7XG5cbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uU2xpZGVyWEhhbmRsZURvd24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fb25TbGlkZXJIYW5kbGVEb3duKHRoaXMuX3NsaWRlclhTdGVwLmJpbmQodGhpcykpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TbGlkZXJZSGFuZGxlRG93biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9vblNsaWRlckhhbmRsZURvd24odGhpcy5fc2xpZGVyWVN0ZXAuYmluZCh0aGlzKSk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9vblNsaWRlckhhbmRsZURvd24gPSBmdW5jdGlvbiAoc2xpZGVyU3RlcEZ1bmMpIHtcbiAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgbW91c2UgPSBNb3VzZS5nZXRJbnN0YW5jZSgpO1xuXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNsaWRlclN0ZXBGdW5jKG1vdXNlLmdldFBvc2l0aW9uKCkpXG4gICAgICAgIH0sXG4gICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgc2xpZGVyU3RlcEZ1bmMobW91c2UuZ2V0UG9zaXRpb24oKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fc2xpZGVyWEhhbmRsZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdW5pdE1pbiA9IHRoaXMuX3VuaXRzTWluTWF4WzBdLFxuICAgICAgICB1bml0TWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMV0sXG4gICAgICAgIHVuaXRYID0gdGhpcy5fdW5pdHNbMF07XG5cbiAgICB2YXIgaGFuZGxlWCA9IHRoaXMuX3NsaWRlclhIYW5kbGUsXG4gICAgICAgIGhhbmRsZVhXaWR0aCA9IGhhbmRsZVguZ2V0V2lkdGgoKSxcbiAgICAgICAgaGFuZGxlWFdpZHRoSGFsZiA9IGhhbmRsZVhXaWR0aCAqIDAuNSxcbiAgICAgICAgdHJhY2tYV2lkdGggPSB0aGlzLl9zbGlkZXJYVHJhY2suZ2V0V2lkdGgoKTtcblxuICAgIHZhciBzdHJva2VTaXplID0gTWV0cmljLlNUUk9LRV9TSVpFO1xuXG4gICAgdmFyIGhhbmRsZVhNaW4gPSBoYW5kbGVYV2lkdGhIYWxmLFxuICAgICAgICBoYW5kbGVYTWF4ID0gdHJhY2tYV2lkdGggLSBoYW5kbGVYV2lkdGhIYWxmIC0gc3Ryb2tlU2l6ZSAqIDI7XG5cbiAgICBoYW5kbGVYLnNldFBvc2l0aW9uWCgoaGFuZGxlWE1pbiArIChoYW5kbGVYTWF4IC0gaGFuZGxlWE1pbikgKiAoKHVuaXRYIC0gdW5pdE1pbikgLyAodW5pdE1heCAtIHVuaXRNaW4pKSkgLSBoYW5kbGVYV2lkdGhIYWxmKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3NsaWRlcllIYW5kbGVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHVuaXRNaW4gPSB0aGlzLl91bml0c01pbk1heFswXSxcbiAgICAgICAgdW5pdE1heCA9IHRoaXMuX3VuaXRzTWluTWF4WzFdLFxuICAgICAgICB1bml0WSA9IHRoaXMuX3VuaXRzWzFdO1xuXG4gICAgdmFyIGhhbmRsZVkgPSB0aGlzLl9zbGlkZXJZSGFuZGxlLFxuICAgICAgICBoYW5kbGVZSGVpZ2h0ID0gaGFuZGxlWS5nZXRIZWlnaHQoKSxcbiAgICAgICAgaGFuZGxlWUhlaWdodEhhbGYgPSBoYW5kbGVZSGVpZ2h0ICogMC41LFxuICAgICAgICB0cmFja1lIZWlnaHQgPSB0aGlzLl9zbGlkZXJZVHJhY2suZ2V0SGVpZ2h0KCk7XG5cbiAgICB2YXIgc3Ryb2tlU2l6ZSA9IE1ldHJpYy5TVFJPS0VfU0laRTtcblxuICAgIHZhciBoYW5kbGVZTWluID0gdHJhY2tZSGVpZ2h0IC0gaGFuZGxlWUhlaWdodEhhbGYgLSBzdHJva2VTaXplICogMixcbiAgICAgICAgaGFuZGxlWU1heCA9IGhhbmRsZVlIZWlnaHRIYWxmO1xuXG4gICAgaGFuZGxlWS5zZXRQb3NpdGlvblkoKGhhbmRsZVlNaW4gKyAoaGFuZGxlWU1heCAtIGhhbmRsZVlNaW4pICogKCh1bml0WSAtIHVuaXRNaW4pIC8gKHVuaXRNYXggLSB1bml0TWluKSkpIC0gaGFuZGxlWUhlaWdodEhhbGYpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvblBsb3R0ZXI7IiwiZnVuY3Rpb24gRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IoKXtcblx0RXJyb3IuYXBwbHkodGhpcyk7XG5cdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IpO1xuXHR0aGlzLm5hbWUgPSAnRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3InO1xuXHR0aGlzLm1lc3NhZ2UgPSAnRnVuY3Rpb24gc2hvdWxkIGJlIG9mIGZvcm0gZih4KSBvciBmKHgseSkuJztcbn1cbkZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yLmNvbnN0cnVjdG9yID0gRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3I7IiwiZnVuY3Rpb24gRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3Iob2JqZWN0LGtleSl7XG5cdEVycm9yLmFwcGx5KHRoaXMpO1xuXHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLEZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yKTtcblx0dGhpcy5uYW1lID0gJ0NvbXBvbmVudE9iamVjdEVycm9yJztcblx0dGhpcy5tZXNzYWdlID0gJ09iamVjdCAnICsgb2JqZWN0LmNvbnN0cnVjdG9yLm5hbWUgKyAnICcgKyBrZXkgKyAnc2hvdWxkIGJlIG9mIHR5cGUgRnVuY3Rpb24uJztcbn1cbkZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yLmNvbnN0cnVjdG9yID0gRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3I7IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XG52YXIgTnVtYmVySW5wdXRfSW50ZXJuYWwgPSByZXF1aXJlKCcuL051bWJlcklucHV0X0ludGVybmFsJyk7XG5cbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE9wdGlvbnMgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcbnZhciBQcmVzZXRCdG4gPSByZXF1aXJlKCcuL1ByZXNldEJ0bicpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4uL2NvcmUvTWV0cmljJyk7XG5cbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbnZhciBPYmplY3RDb21wb25lbnROb3RpZmllciA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Tm90aWZpZXInKTtcblxudmFyIERFRkFVTFRfSU5QVVRfRFAgICAgID0gMixcbiAgICBERUZBVUxUX0lOUFVUX1NURVAgICA9IDEsXG4gICAgREVGQVVMVF9JTlBVVF9QUkVTRVQgPSBudWxsO1xuXG5mdW5jdGlvbiBOdW1iZXJJbnB1dChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5vbkZpbmlzaCA9IHBhcmFtcy5vbkZpbmlzaCB8fCB0aGlzLl9vbkZpbmlzaDtcbiAgICBwYXJhbXMuZHAgICAgICAgPSBwYXJhbXMuZHAgICAgICAgfHwgREVGQVVMVF9JTlBVVF9EUDtcbiAgICBwYXJhbXMuc3RlcCAgICAgPSBwYXJhbXMuc3RlcCAgICAgfHwgREVGQVVMVF9JTlBVVF9TVEVQO1xuICAgIHBhcmFtcy5wcmVzZXRzICA9IHBhcmFtcy5wcmVzZXRzICB8fCBERUZBVUxUX0lOUFVUX1BSRVNFVDtcblxuICAgIHRoaXMuX29uQ2hhbmdlICAgID0gcGFyYW1zLm9uQ2hhbmdlO1xuICAgIHRoaXMuX29uRmluaXNoICAgID0gcGFyYW1zLm9uRmluaXNoO1xuICAgIHRoaXMuX3ByZXNldHNLZXkgID0gcGFyYW1zLnByZXNldHM7XG5cblxuICAgIHZhciBpbnB1dCA9IHRoaXMuX2lucHV0ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHBhcmFtcy5zdGVwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5kcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0RmluaXNoLmJpbmQodGhpcykpO1xuXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICB2YXIgcHJlc2V0cyA9ICBwYXJhbXMucHJlc2V0cztcbiAgICBpZiAoIXByZXNldHMpIHtcbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQoaW5wdXQuZ2V0Tm9kZSgpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBpbnB1dFdyYXAgPSBuZXcgTm9kZSgpO1xuICAgICAgICAgICAgaW5wdXRXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXBJbnB1dFdQcmVzZXQpO1xuXG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGlucHV0V3JhcCk7XG4gICAgICAgIGlucHV0V3JhcC5hZGRDaGlsZChpbnB1dC5nZXROb2RlKCkpO1xuXG4gICAgICAgIHZhciBvcHRpb25zICAgPSBPcHRpb25zLmdldCgpO1xuICAgICAgICB2YXIgcHJlc2V0QnRuID0gdGhpcy5fcHJlc2V0QnRuID0gbmV3IFByZXNldEJ0bih0aGlzLl93cmFwTm9kZSk7XG5cbiAgICAgICAgdmFyIG9uUHJlc2V0RGVhY3RpdmF0ZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBvcHRpb25zLmNsZWFyKCk7XG4gICAgICAgICAgICBwcmVzZXRCdG4uZGVhY3RpdmF0ZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIG9uUHJlc2V0QWN0aXZhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBvcHRpb25zLmJ1aWxkKHByZXNldHMsIGlucHV0LmdldFZhbHVlKCksIGlucHV0LmdldE5vZGUoKSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0LnNldFZhbHVlKHByZXNldHNbb3B0aW9ucy5nZXRTZWxlY3RlZEluZGV4KCldKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5hcHBseVZhbHVlKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblByZXNldERlYWN0aXZhdGUsIE1ldHJpYy5QQURESU5HX1BSRVNFVCxcbiAgICAgICAgICAgICAgICBmYWxzZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcHJlc2V0QnRuLnNldE9uQWN0aXZlKG9uUHJlc2V0QWN0aXZhdGUpO1xuICAgICAgICBwcmVzZXRCdG4uc2V0T25EZWFjdGl2ZShvblByZXNldERlYWN0aXZhdGUpXG4gICAgfVxuXG4gICAgaW5wdXQuZ2V0Tm9kZSgpLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sICAgdGhpcy5fb25JbnB1dERyYWdTdGFydC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsdGhpcy5fcGFyZW50LCdvbkNvbXBvbmVudFNlbGVjdERyYWcnKTtcblxuICAgIGlucHV0LnNldFZhbHVlKHRoaXMuX29iamVjdFt0aGlzLl9rZXldKTtcbn1cblxuTnVtYmVySW5wdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcblxuTnVtYmVySW5wdXQucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX29uQ2hhbmdlKCk7XG59O1xuXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUuX29uSW5wdXRGaW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fb25GaW5pc2goKTtcbn07XG5cbk51bWJlcklucHV0LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgdGhpcy5fb2JqZWN0W3RoaXMuX2tleV0gPSB0aGlzLl9pbnB1dC5nZXRWYWx1ZSgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCxudWxsKSk7XG59O1xuXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faW5wdXQuc2V0VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufTtcblxuLy9QcmV2ZW50IGNocm9tZSBzZWxlY3QgZHJhZ1xuTnVtYmVySW5wdXQucHJvdG90eXBlLl9vbklucHV0RHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBldmVudE1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50VXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIGV2ZW50ID0gQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUc7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbkRyYWdGaW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuXG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnRmluaXNoLCBmYWxzZSk7XG4gICAgICAgIH07XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRmluaXNoLCBmYWxzZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlcklucHV0OyIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpO1xudmFyIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgUFJFU0VUX1NISUZUX01VTFRJUExJRVIgID0gMTA7XG5cbk51bWJlcklucHV0X0ludGVybmFsID0gZnVuY3Rpb24gKHN0ZXBWYWx1ZSwgZGVjaW1hbFBsYWNlcywgb25CZWdpbiwgb25DaGFuZ2UsIG9uRmluaXNoKSB7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsIG51bGwpO1xuXG4gICAgdGhpcy5fdmFsdWUgPSAwO1xuICAgIHRoaXMuX3ZhbHVlU3RlcCA9IHN0ZXBWYWx1ZTtcbiAgICB0aGlzLl92YWx1ZURQbGFjZSA9IGRlY2ltYWxQbGFjZXMgKyAxO1xuXG4gICAgdGhpcy5fb25CZWdpbiA9IG9uQmVnaW4gfHwgZnVuY3Rpb24gKCl7fTtcbiAgICB0aGlzLl9vbkNoYW5nZSA9IG9uQ2hhbmdlIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgIHRoaXMuX29uRmluaXNoID0gb25GaW5pc2ggfHwgZnVuY3Rpb24gKCkge307XG5cbiAgICB0aGlzLl9wcmV2S2V5Q29kZSA9IG51bGw7XG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfVEVYVCk7XG4gICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGhpcy5fdmFsdWUpO1xuXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuS0VZX0RPV04sIHRoaXMuX29uSW5wdXRLZXlEb3duLmJpbmQodGhpcykpO1xuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LktFWV9VUCwgdGhpcy5fb25JbnB1dEtleVVwLmJpbmQodGhpcykpO1xuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LkNIQU5HRSwgdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fb25JbnB1dEtleURvd24gPSBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBzdGVwID0gKGUuc2hpZnRLZXkgPyBQUkVTRVRfU0hJRlRfTVVMVElQTElFUiA6IDEpICogdGhpcy5fdmFsdWVTdGVwLFxuICAgICAgICBrZXlDb2RlID0gZS5rZXlDb2RlO1xuXG4gICAgaWYgKGtleUNvZGUgPT0gMzggfHxcbiAgICAgICAga2V5Q29kZSA9PSA0MCkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgdmFyIG11bHRpcGxpZXIgPSBrZXlDb2RlID09IDM4ID8gMS4wIDogLTEuMDtcbiAgICAgICAgdGhpcy5fdmFsdWUgKz0gKHN0ZXAgKiBtdWx0aXBsaWVyKTtcblxuICAgICAgICB0aGlzLl9vbkJlZ2luKCk7XG4gICAgICAgIHRoaXMuX29uQ2hhbmdlKCk7XG4gICAgICAgIHRoaXMuX2Zvcm1hdCgpO1xuICAgIH1cbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fb25JbnB1dEtleVVwID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIga2V5Q29kZSA9IGUua2V5Q29kZTtcblxuXG4gICAgaWYgKGUuc2hpZnRLZXkgfHwga2V5Q29kZSA9PSAzOCB8fFxuICAgICAgICBrZXlDb2RlID09IDQwIHx8IGtleUNvZGUgPT0gMTkwIHx8XG4gICAgICAgIGtleUNvZGUgPT0gOCB8fCBrZXlDb2RlID09IDM5IHx8XG4gICAgICAgIGtleUNvZGUgPT0gMzcgfHwga2V5Q29kZSA9PSAxODkpIHtcbiAgICAgICAgdGhpcy5fcHJldktleUNvZGUgPSBrZXlDb2RlO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3ByZXZLZXlDb2RlID09IDE4OSAmJiBrZXlDb2RlID09IDQ4KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9IC8vLTBcbiAgICBpZiAodGhpcy5fcHJldktleUNvZGUgPT0gMTkwICYmIGtleUNvZGUgPT0gNDgpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH0gLy8wLjBcblxuICAgIHRoaXMuX3ZhbGlkYXRlKCk7XG4gICAgdGhpcy5fZm9ybWF0KCk7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoZSkge1xuICAgIHRoaXMuX3ZhbGlkYXRlKCk7XG4gICAgdGhpcy5fZm9ybWF0KCk7XG4gICAgdGhpcy5fb25GaW5pc2goKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fdmFsaWRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaW5wdXRJc051bWJlcigpKSB7XG4gICAgICAgIHZhciBpbnB1dCA9IHRoaXMuX2dldElucHV0KCk7XG4gICAgICAgIGlmIChpbnB1dCAhPSAnLScpdGhpcy5fdmFsdWUgPSBOdW1iZXIoaW5wdXQpO1xuICAgICAgICB0aGlzLl9vbkNoYW5nZSgpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fc2V0T3V0cHV0KHRoaXMuX3ZhbHVlKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5pbnB1dElzTnVtYmVyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMuX2dldElucHV0KCk7XG5cbiAgICAvL1RPRE86RklYXG4gICAgaWYgKHZhbHVlID09ICctJyB8fCB2YWx1ZSA9PSAnMCcpcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIC9eXFxzKi0/WzAtOV1cXGQqKFxcLlxcZHsxLDEwMDAwMDB9KT9cXHMqJC8udGVzdCh2YWx1ZSk7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuX2Zvcm1hdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3RyaW5nID0gdGhpcy5fdmFsdWUudG9TdHJpbmcoKSxcbiAgICAgICAgaW5kZXggPSBzdHJpbmcuaW5kZXhPZignLicpO1xuXG4gICAgaWYgKGluZGV4ID4gMCkge1xuICAgICAgICBzdHJpbmcgPSBzdHJpbmcuc2xpY2UoMCwgaW5kZXggKyB0aGlzLl92YWx1ZURQbGFjZSk7XG4gICAgfVxuICAgIHRoaXMuX3NldE91dHB1dChzdHJpbmcpO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl9zZXRPdXRwdXQgPSBmdW5jdGlvbiAobikge1xuICAgIHRoaXMuX2lucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsIG4pO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl9nZXRJbnB1dCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJylcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbiAobikge1xuICAgIHRoaXMuX3ZhbHVlID0gbjtcbiAgICB0aGlzLl9mb3JtYXQoKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5nZXROb2RlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9pbnB1dDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVySW5wdXRfSW50ZXJuYWw7XG4iLCJ2YXIgT3V0cHV0ID0gcmVxdWlyZSgnLi9PdXRwdXQnKTtcblxudmFyIERFRkFVTFRfT1VUUFVUX0RQID0gMjtcblxuZnVuY3Rpb24gTnVtYmVyT3V0cHV0KHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG5cdHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcblx0cGFyYW1zLmRwID0gcGFyYW1zLmRwIHx8IERFRkFVTFRfT1VUUFVUX0RQO1xuXG5cdE91dHB1dC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHR0aGlzLl92YWx1ZURQbGFjZSA9IHBhcmFtcy5kcCArIDE7XG59XG5cbk51bWJlck91dHB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE91dHB1dC5wcm90b3R5cGUpO1xuXG4vL0ZJWE1FXG5OdW1iZXJPdXRwdXQucHJvdG90eXBlLl9zZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKHRoaXMuX3BhcmVudC5pc0Rpc2FibGVkKCkpe1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHZhciB2YWx1ZSA9IHRoaXMuX29iamVjdFt0aGlzLl9rZXldLFxuXHRcdHRleHRBcmVhID0gdGhpcy5fdGV4dEFyZWEsXG5cdFx0ZHAgPSB0aGlzLl92YWx1ZURQbGFjZTtcblxuXHR2YXIgaW5kZXgsXG5cdFx0b3V0O1xuXG5cdGlmICh0eXBlb2YodmFsdWUpID09PSAnb2JqZWN0JyAmJlxuXHRcdHR5cGVvZih2YWx1ZS5sZW5ndGgpID09PSAnbnVtYmVyJyAmJlxuXHRcdHR5cGVvZih2YWx1ZS5zcGxpY2UpID09PSAnZnVuY3Rpb24nICYmXG5cdFx0IXZhbHVlLnByb3BlcnR5SXNFbnVtZXJhYmxlKCdsZW5ndGgnKSkge1xuXG5cdFx0b3V0ID0gdmFsdWUuc2xpY2UoKTtcblxuXHRcdHZhciBpID0gLTE7XG5cdFx0dmFyIHRlbXA7XG5cdFx0dmFyIHdyYXAgPSB0aGlzLl93cmFwO1xuXG5cdFx0d2hpbGUgKCsraSA8IG91dC5sZW5ndGgpIHtcblx0XHRcdHRlbXAgPSBvdXRbaV0gPSBvdXRbaV0udG9TdHJpbmcoKTtcblx0XHRcdGluZGV4ID0gdGVtcC5pbmRleE9mKCcuJyk7XG5cdFx0XHRpZiAoaW5kZXggPiAwKXtcblx0XHRcdFx0b3V0W2ldID0gdGVtcC5zbGljZSgwLCBpbmRleCArIGRwKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAod3JhcCkge1xuXHRcdFx0dGV4dEFyZWEuc2V0U3R5bGVQcm9wZXJ0eSgnd2hpdGUtc3BhY2UnLCAnbm93cmFwJyk7XG5cdFx0XHRvdXQgPSBvdXQuam9pbignXFxuJyk7XG5cdFx0fVxuXG5cdFx0dGV4dEFyZWEuc2V0UHJvcGVydHkoJ3ZhbHVlJywgb3V0KTtcblx0fWVsc2Uge1xuXHRcdG91dCA9IHZhbHVlLnRvU3RyaW5nKCk7XG5cdFx0aW5kZXggPSBvdXQuaW5kZXhPZignLicpO1xuXHRcdHRleHRBcmVhLnNldFByb3BlcnR5KCd2YWx1ZScsIGluZGV4ID4gMCA/IG91dC5zbGljZSgwLCBpbmRleCArIGRwKSA6IG91dCk7XG5cdH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJPdXRwdXQ7IiwidmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBDb2xvck1vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yTW9kZScpO1xudmFyIENvbG9yVXRpbCA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JVdGlsJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi4vY29yZS9NZXRyaWMnKTtcblxuZnVuY3Rpb24gT3B0aW9ucyhwYXJlbnROb2RlKSB7XG4gICAgdGhpcy5fcGFyZW5Ob2RlID0gcGFyZW50Tm9kZTtcblxuICAgIHZhciBub2RlID0gdGhpcy5fbm9kZSA9IG5ldyBOb2RlKCk7XG4gICAgdmFyIGxpc3ROb2RlID0gdGhpcy5fbGlzdE5vZGUgPSBuZXcgTm9kZShOb2RlLkxJU1QpO1xuXG4gICAgbm9kZS5zZXRTdHlsZUNsYXNzKENTUy5PcHRpb25zKTtcbiAgICBub2RlLmFkZENoaWxkKGxpc3ROb2RlKTtcblxuICAgIHRoaXMuX3NlbGVjdGVkSW5kZXggPSBudWxsO1xuICAgIHRoaXMuX2NhbGxiYWNrT3V0ID0gZnVuY3Rpb24gKCkgeyB9O1xuXG4gICAgdGhpcy5fdW5mb2N1c2FibGUgPSBmYWxzZTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbkRvY3VtZW50TW91c2VEb3duLmJpbmQodGhpcykpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9VUCwgdGhpcy5fb25Eb2N1bWVudE1vdXNlVXAuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLmNsZWFyKCk7XG59XG5cbk9wdGlvbnMucHJvdG90eXBlID0ge1xuICAgIF9vbkRvY3VtZW50TW91c2VEb3duOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghdGhpcy5fdW5mb2N1c2FibGUpcmV0dXJuO1xuICAgICAgICB0aGlzLl9jYWxsYmFja091dCgpO1xuICAgIH0sXG5cbiAgICBfb25Eb2N1bWVudE1vdXNlVXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fdW5mb2N1c2FibGUgPSB0cnVlO1xuICAgIH0sXG5cbiAgICBidWlsZDogZnVuY3Rpb24gKGVudHJpZXMsIHNlbGVjdGVkLCBlbGVtZW50LCBjYWxsYmFja1NlbGVjdCwgY2FsbGJhY2tPdXQsIHBhZGRpbmdSaWdodCwgYXJlQ29sb3JzLCBjb2xvck1vZGUpIHtcbiAgICAgICAgdGhpcy5fY2xlYXJMaXN0KCk7XG5cbiAgICAgICAgdGhpcy5fcGFyZW5Ob2RlLmFkZENoaWxkKHRoaXMuZ2V0Tm9kZSgpKTtcblxuICAgICAgICB2YXIgcm9vdE5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICAgICAgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZTtcblxuICAgICAgICBwYWRkaW5nUmlnaHQgPSBwYWRkaW5nUmlnaHQgfHwgMDtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgLy8gYnVpbGQgbGlzdFxuICAgICAgICB2YXIgaXRlbU5vZGUsIGVudHJ5O1xuICAgICAgICB2YXIgaSA9IC0xO1xuXG4gICAgICAgIGlmIChhcmVDb2xvcnMpIHtcbiAgICAgICAgICAgIGNvbG9yTW9kZSA9IGNvbG9yTW9kZSB8fCBDb2xvck1vZGUuSEVYO1xuXG4gICAgICAgICAgICBsaXN0Tm9kZS5zZXRTdHlsZUNsYXNzKENTUy5Db2xvcik7XG5cbiAgICAgICAgICAgIHZhciBjb2xvciwgbm9kZUNvbG9yO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytpIDwgZW50cmllcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IGVudHJpZXNbaV07XG4gICAgICAgICAgICAgICAgaXRlbU5vZGUgPSBsaXN0Tm9kZS5hZGRDaGlsZChuZXcgTm9kZShOb2RlLkxJU1RfSVRFTSkpO1xuICAgICAgICAgICAgICAgIGNvbG9yID0gaXRlbU5vZGUuYWRkQ2hpbGQobmV3IE5vZGUoKSk7XG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGNvbG9yTW9kZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIENvbG9yTW9kZS5IRVg6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ29sb3IgPSBlbnRyeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIENvbG9yTW9kZS5SR0I6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCMkhFWChlbnRyeVswXSwgZW50cnlbMV0sIGVudHJ5WzJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIENvbG9yTW9kZS5SR0JmdjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVDb2xvciA9IENvbG9yVXRpbC5SR0JmdjJIRVgoZW50cnlbMF0sIGVudHJ5WzFdLCBlbnRyeVsyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuSFNWOlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUNvbG9yID0gQ29sb3JVdGlsLkhTVjJSR0IoZW50cnlbMF0sIGVudHJ5WzFdLCBlbnRyeVsyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb2xvci5nZXRTdHlsZSgpLmJhY2tncm91bmRDb2xvciA9IG5vZGVDb2xvcjtcbiAgICAgICAgICAgICAgICBjb2xvci5nZXRTdHlsZSgpLmJhY2tncm91bmRJbWFnZSA9ICdsaW5lYXItZ3JhZGllbnQoIHJnYmEoMCwwLDAsMCkgMCUsIHJnYmEoMCwwLDAsMC4xKSAxMDAlKSc7XG4gICAgICAgICAgICAgICAgY29sb3Iuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGVudHJ5KTtcblxuICAgICAgICAgICAgICAgIGlmIChlbnRyeSA9PSBzZWxlY3RlZClpdGVtTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5PcHRpb25zU2VsZWN0ZWQpO1xuXG4gICAgICAgICAgICAgICAgaXRlbU5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0ZWRJbmRleCA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcy5wYXJlbnROb2RlLmNoaWxkcmVuLCB0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrU2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBsaXN0Tm9kZS5kZWxldGVTdHlsZUNsYXNzKCk7XG5cbiAgICAgICAgICAgIHdoaWxlICgrK2kgPCBlbnRyaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGVudHJ5ID0gZW50cmllc1tpXTtcblxuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlID0gbGlzdE5vZGUuYWRkQ2hpbGQobmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pKTtcbiAgICAgICAgICAgICAgICBpdGVtTm9kZS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgZW50cnkpO1xuICAgICAgICAgICAgICAgIGlmIChlbnRyeSA9PSBzZWxlY3RlZClpdGVtTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5PcHRpb25zU2VsZWN0ZWQpO1xuXG4gICAgICAgICAgICAgICAgaXRlbU5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0ZWRJbmRleCA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcy5wYXJlbnROb2RlLmNoaWxkcmVuLCB0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrU2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy9wb3NpdGlvbiwgc2V0IHdpZHRoIGFuZCBlbmFibGVcblxuICAgICAgICB2YXIgZWxlbWVudFBvcyA9IGVsZW1lbnQuZ2V0UG9zaXRpb25HbG9iYWwoKSxcbiAgICAgICAgICAgIGVsZW1lbnRXaWR0aCA9IGVsZW1lbnQuZ2V0V2lkdGgoKSAtIHBhZGRpbmdSaWdodCxcbiAgICAgICAgICAgIGVsZW1lbnRIZWlnaHQgPSBlbGVtZW50LmdldEhlaWdodCgpO1xuXG4gICAgICAgIHZhciBsaXN0V2lkdGggPSBsaXN0Tm9kZS5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgbGlzdEhlaWdodCA9IGxpc3ROb2RlLmdldEhlaWdodCgpLFxuICAgICAgICAgICAgc3Ryb2tlT2Zmc2V0ID0gTWV0cmljLlNUUk9LRV9TSVpFICogMjtcblxuICAgICAgICB2YXIgcGFkZGluZ09wdGlvbnMgPSBNZXRyaWMuUEFERElOR19PUFRJT05TO1xuXG4gICAgICAgIHZhciB3aWR0aCA9IChsaXN0V2lkdGggPCBlbGVtZW50V2lkdGggPyBlbGVtZW50V2lkdGggOiBsaXN0V2lkdGgpIC0gc3Ryb2tlT2Zmc2V0LFxuICAgICAgICAgICAgcG9zWCA9IGVsZW1lbnRQb3NbMF0sXG4gICAgICAgICAgICBwb3NZID0gZWxlbWVudFBvc1sxXSArIGVsZW1lbnRIZWlnaHQgLSBwYWRkaW5nT3B0aW9ucztcblxuICAgICAgICB2YXIgd2luZG93V2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgICAgICAgIHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcblxuICAgICAgICB2YXIgcm9vdFBvc1ggPSAocG9zWCArIHdpZHRoKSA+IHdpbmRvd1dpZHRoID8gKHBvc1ggLSB3aWR0aCArIGVsZW1lbnRXaWR0aCAtIHN0cm9rZU9mZnNldCkgOiBwb3NYLFxuICAgICAgICAgICAgcm9vdFBvc1kgPSAocG9zWSArIGxpc3RIZWlnaHQpID4gd2luZG93SGVpZ2h0ID8gKHBvc1kgLSBsaXN0SGVpZ2h0ICogMC41IC0gZWxlbWVudEhlaWdodCAqIDAuNSkgOiBwb3NZO1xuXG4gICAgICAgIGxpc3ROb2RlLnNldFdpZHRoKHdpZHRoKTtcbiAgICAgICAgcm9vdE5vZGUuc2V0UG9zaXRpb25HbG9iYWwocm9vdFBvc1gsIHJvb3RQb3NZKTtcblxuICAgICAgICB0aGlzLl9jYWxsYmFja091dCA9IGNhbGxiYWNrT3V0O1xuICAgICAgICB0aGlzLl91bmZvY3VzYWJsZSA9IGZhbHNlO1xuICAgIH0sXG5cbiAgICBfY2xlYXJMaXN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2xpc3ROb2RlLnJlbW92ZUFsbENoaWxkcmVuKCk7XG4gICAgICAgIHRoaXMuX2xpc3ROb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ3dpZHRoJyk7XG4gICAgICAgIHRoaXMuX3NlbGVjdGVkSW5kZXggPSBudWxsO1xuICAgICAgICB0aGlzLl9idWlsZCA9IGZhbHNlO1xuICAgIH0sXG5cbiAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9jbGVhckxpc3QoKTtcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tPdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX3BhcmVuTm9kZS5yZW1vdmVDaGlsZCh0aGlzLmdldE5vZGUoKSk7XG5cbiAgICB9LFxuXG4gICAgaXNCdWlsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYnVpbGQ7XG4gICAgfSxcbiAgICBnZXROb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ub2RlO1xuICAgIH0sXG4gICAgZ2V0U2VsZWN0ZWRJbmRleDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VsZWN0ZWRJbmRleDtcbiAgICB9XG59O1xuXG5PcHRpb25zLnNldHVwID0gZnVuY3Rpb24ocGFyZW50Tm9kZSl7cmV0dXJuIE9wdGlvbnMuX2luc3RhbmNlID0gbmV3IE9wdGlvbnMocGFyZW50Tm9kZSk7fTtcbk9wdGlvbnMuZ2V0ICAgPSBmdW5jdGlvbigpe3JldHVybiBPcHRpb25zLl9pbnN0YW5jZTt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9wdGlvbnM7IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xudmFyIFNjcm9sbEJhciA9IHJlcXVpcmUoJy4uL2NvcmUvbGF5b3V0L1Njcm9sbEJhcicpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9IRUlHSFQgPSBudWxsLFxuICAgIERFRkFVTFRfV1JBUCAgID0gZmFsc2UsXG4gICAgREVGQVVMVF9VUERBVEUgPSB0cnVlO1xuXG5mdW5jdGlvbiBPdXRwdXQocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zICAgICAgICAgICAgPSBwYXJhbXMgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCB8fCBERUZBVUxUX0hFSUdIVDtcbiAgICBwYXJhbXMud3JhcCAgICAgICA9IHBhcmFtcy53cmFwICAgPT09IHVuZGVmaW5lZCA/XG4gICAgICAgICAgICAgICAgICAgICAgICBERUZBVUxUX1dSQVAgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLndyYXA7XG4gICAgcGFyYW1zLnVwZGF0ZSAgICAgPSBwYXJhbXMudXBkYXRlID09PSB1bmRlZmluZWQgP1xuICAgICAgICAgICAgICAgICAgICAgICAgREVGQVVMVF9VUERBVEUgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnVwZGF0ZTtcblxuICAgIHRoaXMuX3dyYXAgPSBwYXJhbXMud3JhcDtcbiAgICB0aGlzLl91cGRhdGUgPSBwYXJhbXMudXBkYXRlO1xuXG4gICAgdmFyIHRleHRBcmVhID0gdGhpcy5fdGV4dEFyZWEgPSBuZXcgTm9kZShOb2RlLlRFWFRBUkVBKSxcbiAgICAgICAgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgcm9vdE5vZGUgPSB0aGlzLl9ub2RlO1xuXG4gICAgICAgIHRleHRBcmVhLnNldFByb3BlcnR5KCdyZWFkT25seScsdHJ1ZSk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKHRleHRBcmVhKTtcblxuICAgICAgICB0ZXh0QXJlYS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uSW5wdXREcmFnU3RhcnQuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRyx0aGlzLl9wYXJlbnQsJ29uQ29tcG9uZW50U2VsZWN0RHJhZycpO1xuXG5cbiAgICBpZihwYXJhbXMuaGVpZ2h0KXtcbiAgICAgICAgdmFyIHRleHRBcmVhV3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgICAgICB0ZXh0QXJlYVdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuVGV4dEFyZWFXcmFwKTtcbiAgICAgICAgICAgIHRleHRBcmVhV3JhcC5hZGRDaGlsZCh0ZXh0QXJlYSk7XG4gICAgICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZCh0ZXh0QXJlYVdyYXApO1xuXG4gICAgICAgIC8vRklYTUVcbiAgICAgICAgdmFyIGhlaWdodCAgPSB0aGlzLl9oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0LFxuICAgICAgICAgICAgcGFkZGluZyA9IDQ7XG5cbiAgICAgICAgICAgIHRleHRBcmVhLnNldEhlaWdodChNYXRoLm1heChoZWlnaHQgKyBwYWRkaW5nICAsTWV0cmljLkNPTVBPTkVOVF9NSU5fSEVJR0hUKSk7XG4gICAgICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQodGV4dEFyZWEuZ2V0SGVpZ2h0KCkpO1xuICAgICAgICAgICAgcm9vdE5vZGUuc2V0SGVpZ2h0KHdyYXBOb2RlLmdldEhlaWdodCgpICsgcGFkZGluZyk7XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsQmFyID0gbmV3IFNjcm9sbEJhcih0ZXh0QXJlYVdyYXAsdGV4dEFyZWEsaGVpZ2h0IC0gcGFkZGluZylcbiAgICB9XG5cbiAgICBpZihwYXJhbXMud3JhcCl7XG4gICAgICAgIHRleHRBcmVhLnNldFN0eWxlUHJvcGVydHkoJ3doaXRlLXNwYWNlJywncHJlLXdyYXAnKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wcmV2U3RyaW5nID0gJyc7XG4gICAgdGhpcy5fcHJldlNjcm9sbEhlaWdodCA9IC0xO1xuICAgIHRoaXMuX3NldFZhbHVlKCk7XG59XG5cbk91dHB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5cbi8vT3ZlcnJpZGUgaW4gc3ViY2xhc3Ncbk91dHB1dC5wcm90b3R5cGUuX3NldFZhbHVlID0gZnVuY3Rpb24gKCkge307XG5cblxuT3V0cHV0LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3NldFZhbHVlKCk7XG59O1xuXG5PdXRwdXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZighdGhpcy5fdXBkYXRlKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9zZXRWYWx1ZSgpO1xufTtcblxuXG4vL1ByZXZlbnQgY2hyb21lIHNlbGVjdCBkcmFnXG5cbk91dHB1dC5wcm90b3R5cGUuX29uRHJhZyA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsIG51bGwpKTtcbn07XG5cbk91dHB1dC5wcm90b3R5cGUuX29uRHJhZ0ZpbmlzaCA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsIG51bGwpKTtcblxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLCB0aGlzLl9vbkRyYWcsIGZhbHNlKTtcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25EcmFnRmluaXNoLCBmYWxzZSk7XG59O1xuXG5PdXRwdXQucHJvdG90eXBlLl9vbklucHV0RHJhZ1N0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsIG51bGwpKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25EcmFnLmJpbmQodGhpcyksIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfVVAsICAgdGhpcy5fb25EcmFnRmluaXNoLmJpbmQodGhpcyksIGZhbHNlKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBPdXRwdXQ7XG4iLCJ2YXIgUGxvdHRlciA9IHJlcXVpcmUoJy4vUGxvdHRlcicpO1xudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIERFRkFVTFRfQk9VTkRTX1ggPSBbLTEsMV0sXG4gICAgREVGQVVMVF9CT1VORFNfWSA9IFstMSwxXSxcbiAgICBERUZBVUxUX0xBQkVMX1ggID0gJycsXG4gICAgREVGQVVMVF9MQUJFTF9ZICA9ICcnO1xuXG5mdW5jdGlvbiBQYWQocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICBQbG90dGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyAgICAgICAgICAgID0gcGFyYW1zICAgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLmJvdW5kc1ggICAgPSBwYXJhbXMuYm91bmRzWCAgICB8fCBERUZBVUxUX0JPVU5EU19YO1xuICAgIHBhcmFtcy5ib3VuZHNZICAgID0gcGFyYW1zLmJvdW5kc1kgICAgfHwgREVGQVVMVF9CT1VORFNfWTtcbiAgICBwYXJhbXMubGFiZWxYICAgICA9IHBhcmFtcy5sYWJlbFggICAgIHx8IERFRkFVTFRfTEFCRUxfWDtcbiAgICBwYXJhbXMubGFiZWxZICAgICA9IHBhcmFtcy5sYWJlbFkgICAgIHx8IERFRkFVTFRfTEFCRUxfWTtcblxuICAgIHBhcmFtcy5zaG93Q3Jvc3MgID0gcGFyYW1zLnNob3dDcm9zcyAgfHwgdHJ1ZTtcblxuXG4gICAgdGhpcy5fb25DaGFuZ2UgICAgID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHRoaXMuX29uRmluaXNoICAgICA9IHBhcmFtcy5vbkZpbmlzaCB8fCB0aGlzLl9vbkZpbmlzaDtcblxuICAgIHRoaXMuX2JvdW5kc1ggICAgICA9IHBhcmFtcy5ib3VuZHNYO1xuICAgIHRoaXMuX2JvdW5kc1kgICAgICA9IHBhcmFtcy5ib3VuZHNZO1xuICAgIHRoaXMuX2xhYmVsQXhpc1ggICA9IHBhcmFtcy5sYWJlbFggIT0gJycgJiYgcGFyYW1zLmxhYmVsWCAhPSAnbm9uZScgPyBwYXJhbXMubGFiZWxYIDogbnVsbDtcbiAgICB0aGlzLl9sYWJlbEF4aXNZICAgPSBwYXJhbXMubGFiZWxZICE9ICcnICYmIHBhcmFtcy5sYWJlbFkgIT0gJ25vbmUnID8gcGFyYW1zLmxhYmVsWSA6IG51bGw7XG5cbiAgICB2YXIgcGF0aCA9IHRoaXMuX3BhdGg7XG4gICAgICAgIHBhdGguc3R5bGUuc3Ryb2tlV2lkdGggPSAxO1xuICAgICAgICBwYXRoLnN0eWxlLnN0cm9rZSAgICAgID0gJyMzNjNjNDAnO1xuXG4gICAgdGhpcy5fZ3JpZC5zdHlsZS5zdHJva2UgPSAncmdiKDI1LDI1LDI1KSc7XG5cbiAgICB0aGlzLl9zdmdQb3MgPSBbMCwwXTtcblxuXG4gICAgdmFyIGhhbmRsZSA9IHRoaXMuX2hhbmRsZSA9IHRoaXMuX3N2Z1Jvb3QuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdnJykpO1xuICAgIHZhciBoYW5kbGVDaXJjbGUwID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xuICAgICAgICBoYW5kbGVDaXJjbGUwLnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDExKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTAuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiYSgwLDAsMCwwLjA1KScpO1xuICAgIHZhciBoYW5kbGVDaXJjbGUxID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xuICAgICAgICBoYW5kbGVDaXJjbGUxLnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDEwKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTEuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiKDgzLDkzLDk4KScpO1xuXG4gICAgdmFyIGhhbmRsZUNpcmNsZTIgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTIuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoOSkpO1xuICAgICAgICBoYW5kbGVDaXJjbGUyLnNldEF0dHJpYnV0ZSgnZmlsbCcsJ3JnYig1Nyw2OSw3NiknKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMi5zZXRBdHRyaWJ1dGUoJ2N5JyxTdHJpbmcoMC43NSkpO1xuXG4gICAgdmFyIGhhbmRsZUNpcmNsZTMgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTMuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMTApKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMy5zZXRBdHRyaWJ1dGUoJ3N0cm9rZScsJ3JnYigxNywxOSwyMCknKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMy5zZXRBdHRyaWJ1dGUoJ3N0cm9rZS13aWR0aCcsU3RyaW5nKDEpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMy5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdub25lJyk7XG5cbiAgICB2YXIgaGFuZGxlQ2lyY2xlNCA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlNC5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZyg2KSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTQuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiKDMwLDM0LDM2KScpO1xuICAgIHZhciBoYW5kbGVDaXJjbGU1ID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xuICAgICAgICBoYW5kbGVDaXJjbGU1LnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDMpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlNS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoMjU1LDI1NSwyNTUpJyk7XG5cbiAgICAgICAgaGFuZGxlLnNldEF0dHJpYnV0ZSgndHJhbmZvcm0nLCd0cmFuc2xhdGUoMCAwKScpO1xuXG4gICAgdGhpcy5fc3ZnLmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uRHJhZ1N0YXJ0LmJpbmQodGhpcyksZmFsc2UpO1xuICAgIHRoaXMuX2RyYXdWYWx1ZSh0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG59XG5cblBhZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBsb3R0ZXIucHJvdG90eXBlKTtcblxuUGFkLnByb3RvdHlwZS5fb25EcmFnU3RhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9zdmc7XG5cbiAgICB2YXIgc3ZnUG9zID0gdGhpcy5fc3ZnUG9zO1xuICAgICAgICBzdmdQb3NbMF0gPSAwO1xuICAgICAgICBzdmdQb3NbMV0gPSAwO1xuXG4gICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgc3ZnUG9zWzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgc3ZnUG9zWzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgfVxuXG4gICAgdmFyIGV2ZW50TW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRVcCAgID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2RyYXdWYWx1ZUlucHV0KCk7XG4gICAgICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgICAgICB0aGlzLl9vbkNoYW5nZSgpO1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIHZhciBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xuICAgICAgICB0aGlzLl9kcmF3VmFsdWVJbnB1dCgpO1xuICAgICAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgdGhpcy5fb25GaW5pc2goKTtcblxuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgICAgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgICBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgIHRoaXMuX2RyYXdWYWx1ZUlucHV0KCk7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cblBhZC5wcm90b3R5cGUuX3JlZHJhdyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9kcmF3VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufTtcblxuUGFkLnByb3RvdHlwZS5fZHJhd1ZhbHVlSW5wdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZHJhd1ZhbHVlKHRoaXMuX2dldE1vdXNlTm9ybWFsaXplZCgpKTtcbn07XG5cblBhZC5wcm90b3R5cGUuX2RyYXdWYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMuX29iamVjdFt0aGlzLl9rZXldID0gdmFsdWU7XG4gICAgdGhpcy5fZHJhd0dyaWQoKTtcbiAgICB0aGlzLl9kcmF3UG9pbnQoKTtcbn07XG5cblBhZC5wcm90b3R5cGUuX2RyYXdHcmlkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmdTaXplID0gTnVtYmVyKHRoaXMuX3N2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBzdmdNaWRYID0gTWF0aC5mbG9vcihzdmdTaXplICogMC41KSxcbiAgICAgICAgc3ZnTWlkWSA9IE1hdGguZmxvb3Ioc3ZnU2l6ZSAqIDAuNSk7XG5cbiAgICB2YXIgcGF0aENtZCA9ICcnO1xuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUoMCwgc3ZnTWlkWSwgc3ZnU2l6ZSwgc3ZnTWlkWSk7XG4gICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZShzdmdNaWRYLCAwLCBzdmdNaWRYLCBzdmdTaXplKTtcblxuICAgIHRoaXMuX2dyaWQuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XG59O1xuXG5cblBhZC5wcm90b3R5cGUuX2RyYXdQb2ludCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnU2l6ZSA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgc3ZnTWlkWCA9IHN2Z1NpemUgKiAwLjUsXG4gICAgICAgIHN2Z01pZFkgPSBzdmdTaXplICogMC41O1xuXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG5cbiAgICB2YXIgbG9jYWxYID0gKCAwLjUgKyB2YWx1ZVswXSAqIDAuNSApICogc3ZnU2l6ZSxcbiAgICAgICAgbG9jYWxZID0gKCAwLjUgKyAtdmFsdWVbMV0gKiAwLjUgKSAqIHN2Z1NpemU7XG5cbiAgICB2YXIgcGF0aENtZCA9ICcnO1xuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIGxvY2FsWSwgc3ZnU2l6ZSwgbG9jYWxZKTtcbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZShsb2NhbFgsIDAsIGxvY2FsWCwgc3ZnU2l6ZSk7XG5cbiAgICB0aGlzLl9wYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xuICAgIHRoaXMuX2hhbmRsZS5zZXRBdHRyaWJ1dGUoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIGxvY2FsWCArICcgJyArIGxvY2FsWSArICcpJyk7XG59O1xuXG5QYWQucHJvdG90eXBlLl9nZXRNb3VzZU5vcm1hbGl6ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9mZnNldCA9IHRoaXMuX3N2Z1BvcyxcbiAgICAgICAgbW91c2UgPSBNb3VzZS5nZXRJbnN0YW5jZSgpLmdldFBvc2l0aW9uKCksXG4gICAgICAgIHN2Z1NpemUgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSk7XG5cbiAgICByZXR1cm4gWy0xICsgTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VbMF0gLSBvZmZzZXRbMF0sIHN2Z1NpemUpKSAvIHN2Z1NpemUgKiAyLFxuICAgICAgICAoIDEgLSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVsxXSAtIG9mZnNldFsxXSwgc3ZnU2l6ZSkpIC8gc3ZnU2l6ZSAqIDIpXTtcblxufTtcblxuUGFkLnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbn07XG5cblBhZC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcylyZXR1cm47XG4gICAgdGhpcy5fZHJhd1ZhbHVlKHRoaXMuX29iamVjdFt0aGlzLl9rZXldKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGFkO1xuIiwidmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTnVtYmVySW5wdXRfSW50ZXJuYWwgPSByZXF1aXJlKCcuL051bWJlcklucHV0X0ludGVybmFsJyk7XG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XG52YXIgQ29sb3JVdGlsID0gcmVxdWlyZSgnLi4vY29yZS9jb2xvci9Db2xvclV0aWwnKTtcbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcblxudmFyIERFRkFVTFRfVkFMVUVfSFVFID0gMjAwLjAsXG4gICAgREVGQVVMVF9WQUxVRV9TQVQgPSA1MC4wLFxuICAgIERFRkFVTFRfVkFMVUVfVkFMID0gNTAuMDtcblxuZnVuY3Rpb24gUGlja2VyKHBhcmVudE5vZGUpe1xuICAgIHZhciByb290Tm9kZSA9IHRoaXMuX25vZGUgICAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXIpLFxuICAgICAgICBoZWFkTm9kZSA9IHRoaXMuX2hlYWROb2RlID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkKSxcbiAgICAgICAgbGFibFdyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApLFxuICAgICAgICBsYWJsTm9kZSA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLFxuICAgICAgICBtZW51Tm9kZSA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuTWVudSksXG4gICAgICAgIHdyYXBOb2RlID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcblxuICAgIHZhciBtZW51Q2xvc2UgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG4gICAgICAgIG1lbnVDbG9zZS5zZXRTdHlsZUNsYXNzKENTUy5NZW51QnRuQ2xvc2UpO1xuXG4gICAgdmFyIGZpZWxkV3JhcCAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoIENTUy5QaWNrZXJGaWVsZFdyYXApLFxuICAgICAgICBzbGlkZXJXcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJXcmFwKSxcbiAgICAgICAgaW5wdXRXcmFwICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyggQ1NTLlBpY2tlcklucHV0V3JhcCk7XG5cbiAgICB2YXIgY2FudmFzRmllbGQgID0gdGhpcy5fY2FudmFzRmllbGQgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyksXG4gICAgICAgIGNhbnZhc1NsaWRlciA9IHRoaXMuX2NhbnZhc1NsaWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ0NhbnZhcycpO1xuXG4gICAgICAgIGZpZWxkV3JhcC5nZXRFbGVtZW50KCkuYXBwZW5kQ2hpbGQoY2FudmFzRmllbGQpO1xuICAgICAgICBzbGlkZXJXcmFwLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChjYW52YXNTbGlkZXIpO1xuXG4gICAgICAgIHRoaXMuX3NldFNpemVDYW52YXNGaWVsZCgxNTQsMTU0KTtcbiAgICAgICAgdGhpcy5fc2V0U2l6ZUNhbnZhc1NsaWRlcigxNCwxNTQpO1xuXG4gICAgdmFyIGNvbnRleHRDYW52YXNGaWVsZCAgPSB0aGlzLl9jb250ZXh0Q2FudmFzRmllbGQgID0gY2FudmFzRmllbGQuZ2V0Q29udGV4dCgnMmQnKSxcbiAgICAgICAgY29udGV4dENhbnZhc1NsaWRlciA9IHRoaXMuX2NvbnRleHRDYW52YXNTbGlkZXIgPSBjYW52YXNTbGlkZXIuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgIHZhciBoYW5kbGVGaWVsZCAgPSB0aGlzLl9oYW5kbGVGaWVsZCAgPSBuZXcgTm9kZSgpO1xuICAgICAgICBoYW5kbGVGaWVsZC5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJIYW5kbGVGaWVsZCk7XG5cbiAgICB2YXIgaGFuZGxlU2xpZGVyID0gdGhpcy5faGFuZGxlU2xpZGVyID0gbmV3IE5vZGUoKTtcbiAgICAgICAgaGFuZGxlU2xpZGVyLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckhhbmRsZVNsaWRlcik7XG5cbiAgICB2YXIgc3RlcCA9IDEuMCxcbiAgICAgICAgZHAgICA9IDA7XG5cbiAgICB2YXIgY2FsbGJhY2tIdWUgPSB0aGlzLl9vbklucHV0SHVlQ2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgIGNhbGxiYWNrU2F0ID0gdGhpcy5fb25JbnB1dFNhdENoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICBjYWxsYmFja1ZhbCA9IHRoaXMuX29uSW5wdXRWYWxDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgY2FsbGJhY2tSICAgPSB0aGlzLl9vbklucHV0UkNoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICBjYWxsYmFja0cgICA9IHRoaXMuX29uSW5wdXRHQ2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgIGNhbGxiYWNrQiAgID0gdGhpcy5fb25JbnB1dEJDaGFuZ2UuYmluZCh0aGlzKTtcblxuXG4gICAgdmFyIGlucHV0SHVlID0gdGhpcy5faW5wdXRIdWUgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrSHVlLGNhbGxiYWNrSHVlKSxcbiAgICAgICAgaW5wdXRTYXQgPSB0aGlzLl9pbnB1dFNhdCA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tTYXQsY2FsbGJhY2tTYXQpLFxuICAgICAgICBpbnB1dFZhbCA9IHRoaXMuX2lucHV0VmFsID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja1ZhbCxjYWxsYmFja1ZhbCksXG4gICAgICAgIGlucHV0UiAgID0gdGhpcy5faW5wdXRSICAgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrUixjYWxsYmFja1IpLFxuICAgICAgICBpbnB1dEcgICA9IHRoaXMuX2lucHV0RyAgID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja0csY2FsbGJhY2tHKSxcbiAgICAgICAgaW5wdXRCICAgPSB0aGlzLl9pbnB1dEIgICA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tCLGNhbGxiYWNrQik7XG5cbiAgICB2YXIgY29udHJvbHNXcmFwID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJDb250cm9sc1dyYXApO1xuXG4gICAgdmFyIGJ1dHRvblBpY2sgICA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKS5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b24pLnNldFByb3BlcnR5KCd2YWx1ZScsJ3BpY2snKSxcbiAgICAgICAgYnV0dG9uQ2FuY2VsID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbikuc2V0UHJvcGVydHkoJ3ZhbHVlJywnY2FuY2VsJyk7XG5cblxuICAgIHZhciBjb2xvckNvbnRyYXN0ID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJDb2xvckNvbnRyYXN0KTtcblxuICAgIHZhciBjb2xvcjAgPSB0aGlzLl9jb2xvckN1cnJOb2RlID0gbmV3IE5vZGUoKSxcbiAgICAgICAgY29sb3IxID0gdGhpcy5fY29sb3JQcmV2Tm9kZSA9IG5ldyBOb2RlKCk7XG5cbiAgICBjb2xvckNvbnRyYXN0LmFkZENoaWxkKGNvbG9yMCk7XG4gICAgY29sb3JDb250cmFzdC5hZGRDaGlsZChjb2xvcjEpO1xuXG4gICAgY29udHJvbHNXcmFwLmFkZENoaWxkKGJ1dHRvbkNhbmNlbCk7XG4gICAgY29udHJvbHNXcmFwLmFkZENoaWxkKGJ1dHRvblBpY2spO1xuICAgIGNvbnRyb2xzV3JhcC5hZGRDaGlsZChjb2xvckNvbnRyYXN0KTtcblxuICAgIHRoaXMuX3NldENvbnRyYXNQcmV2Q29sb3IoMCwwLDApO1xuXG4gICAgdmFyIGlucHV0RmllbGRXcmFwSHVlID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBTYXQgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcFZhbCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCk7XG5cbiAgICB2YXIgaW5wdXRGaWVsZFdyYXBIdWVMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdIJyksXG4gICAgICAgIGlucHV0RmllbGRXcmFwU2F0TGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnUycpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcFZhbExhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ1YnKTtcblxuICAgICAgICBpbnB1dEZpZWxkV3JhcEh1ZS5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcEh1ZUxhYmVsLGlucHV0SHVlLmdldE5vZGUoKSk7XG4gICAgICAgIGlucHV0RmllbGRXcmFwU2F0LmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwU2F0TGFiZWwsaW5wdXRTYXQuZ2V0Tm9kZSgpKTtcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBWYWwuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBWYWxMYWJlbCxpbnB1dFZhbC5nZXROb2RlKCkpO1xuXG4gICAgdmFyIGlucHV0RmllbGRXcmFwUiA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCksXG4gICAgICAgIGlucHV0RmllbGRXcmFwRyA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCksXG4gICAgICAgIGlucHV0RmllbGRXcmFwQiA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCk7XG5cbiAgICB2YXIgaW5wdXRGaWVsZFdyYXBSTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnUicpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcEdMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdHJyksXG4gICAgICAgIGlucHV0RmllbGRXcmFwQkxhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ0InKTtcblxuICAgICAgICBpbnB1dEZpZWxkV3JhcFIuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBSTGFiZWwsaW5wdXRSLmdldE5vZGUoKSk7XG4gICAgICAgIGlucHV0RmllbGRXcmFwRy5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcEdMYWJlbCxpbnB1dEcuZ2V0Tm9kZSgpKTtcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBCLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwQkxhYmVsLGlucHV0Qi5nZXROb2RlKCkpO1xuXG5cbiAgICAgICAgaW5wdXRXcmFwLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwUixpbnB1dEZpZWxkV3JhcEh1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0RmllbGRXcmFwRyxpbnB1dEZpZWxkV3JhcFNhdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0RmllbGRXcmFwQixpbnB1dEZpZWxkV3JhcFZhbCxjb2xvckNvbnRyYXN0KTtcblxuICAgIHZhciBoZXhJbnB1dFdyYXAgPSBuZXcgTm9kZSgpO1xuICAgICAgICBoZXhJbnB1dFdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRXcmFwKTtcblxuICAgIHZhciBpbnB1dEhFWCA9IHRoaXMuX2lucHV0SEVYID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9URVhUKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBIRVggICAgICAgICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCksXG4gICAgICAgIGlucHV0RmllbGRXcmFwSEVYTGFiZWwgICAgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKTtcblxuICAgICAgICBpbnB1dEZpZWxkV3JhcEhFWExhYmVsLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCcjJyk7XG4gICAgICAgIGlucHV0RmllbGRXcmFwSEVYLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwSEVYTGFiZWwsaW5wdXRIRVgpO1xuXG4gICAgICAgIGhleElucHV0V3JhcC5hZGRDaGlsZChpbnB1dEZpZWxkV3JhcEhFWCk7XG5cbiAgICAgICAgaW5wdXRIRVguYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuQ0hBTkdFLHRoaXMuX29uSW5wdXRIRVhGaW5pc2guYmluZCh0aGlzKSk7XG5cbiAgICAgICAgbGFibE5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ0NvbG9yIFBpY2tlcicpO1xuXG4gICAgICAgIG1lbnVOb2RlLmFkZENoaWxkKG1lbnVDbG9zZSk7XG4gICAgICAgIGhlYWROb2RlLmFkZENoaWxkKG1lbnVOb2RlKTtcbiAgICAgICAgbGFibFdyYXAuYWRkQ2hpbGQobGFibE5vZGUpO1xuICAgICAgICBoZWFkTm9kZS5hZGRDaGlsZChsYWJsV3JhcCk7XG4gICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKGhlYWROb2RlKTtcbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQod3JhcE5vZGUpO1xuXG4gICAgICAgIC8vd3JhcE5vZGUuYWRkQ2hpbGQocGFsZXR0ZVdyYXApO1xuXG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGZpZWxkV3JhcCk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKHNsaWRlcldyYXApO1xuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChpbnB1dFdyYXApO1xuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChoZXhJbnB1dFdyYXApO1xuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChjb250cm9sc1dyYXApO1xuXG4gICAgICAgIGZpZWxkV3JhcC5hZGRDaGlsZCggaGFuZGxlRmllbGQpO1xuICAgICAgICBzbGlkZXJXcmFwLmFkZENoaWxkKGhhbmRsZVNsaWRlcik7XG5cbiAgICB2YXIgZXZlbnRNb3VzZURvd24gPSBOb2RlRXZlbnQuTU9VU0VfRE9XTixcbiAgICAgICAgY2FsbGJhY2sgICAgICAgPSB0aGlzLl9vbkNhbnZhc0ZpZWxkTW91c2VEb3duLmJpbmQodGhpcyk7XG5cbiAgICAgICAgZmllbGRXcmFwLmFkZEV2ZW50TGlzdGVuZXIoICBldmVudE1vdXNlRG93biwgY2FsbGJhY2spO1xuICAgICAgICBoYW5kbGVGaWVsZC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VEb3duLCBjYWxsYmFjayk7XG5cbiAgICAgICAgY2FsbGJhY2sgPSB0aGlzLl9vbkNhbnZhc1NsaWRlck1vdXNlRG93bi5iaW5kKHRoaXMpO1xuXG4gICAgICAgIHNsaWRlcldyYXAuYWRkRXZlbnRMaXN0ZW5lciggIGV2ZW50TW91c2VEb3duLCBjYWxsYmFjayk7XG4gICAgICAgIGhhbmRsZVNsaWRlci5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VEb3duLCBjYWxsYmFjayk7XG5cbiAgICAgICAgbWVudUNsb3NlLmFkZEV2ZW50TGlzdGVuZXIoICAgZXZlbnRNb3VzZURvd24sIHRoaXMuX29uQ2xvc2UuYmluZCh0aGlzKSk7XG4gICAgICAgIGJ1dHRvblBpY2suYWRkRXZlbnRMaXN0ZW5lciggIGV2ZW50TW91c2VEb3duLCB0aGlzLl9vblBpY2suYmluZCh0aGlzKSk7XG4gICAgICAgIGJ1dHRvbkNhbmNlbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VEb3duLCB0aGlzLl9vbkNsb3NlLmJpbmQodGhpcykpO1xuXG4gICAgICAgIGhlYWROb2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uSGVhZERyYWdTdGFydC5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMuX3BhcmVudE5vZGUgPSBwYXJlbnROb2RlO1xuXG4gICAgdGhpcy5fbW91c2VPZmZzZXQgPSBbMCwwXTtcbiAgICB0aGlzLl9wb3NpdGlvbiAgICA9IFswLDBdO1xuXG4gICAgdGhpcy5fY2FudmFzU2xpZGVyUG9zID0gWzAsMF07XG4gICAgdGhpcy5fY2FudmFzRmllbGRQb3MgID0gWzAsMF07XG4gICAgdGhpcy5faGFuZGxlRmllbGRTaXplICAgID0gMTI7XG4gICAgdGhpcy5faGFuZGxlU2xpZGVySGVpZ2h0ID0gNztcblxuICAgIHRoaXMuX2ltYWdlRGF0YVNsaWRlciA9IGNvbnRleHRDYW52YXNTbGlkZXIuY3JlYXRlSW1hZ2VEYXRhKGNhbnZhc1NsaWRlci53aWR0aCxjYW52YXNTbGlkZXIuaGVpZ2h0KTtcbiAgICB0aGlzLl9pbWFnZURhdGFGaWVsZCAgPSBjb250ZXh0Q2FudmFzRmllbGQuY3JlYXRlSW1hZ2VEYXRhKCBjYW52YXNGaWVsZC53aWR0aCwgY2FudmFzRmllbGQuaGVpZ2h0KTtcblxuICAgIHRoaXMuX3ZhbHVlSHVlTWluTWF4ID0gWzAsMzYwXTtcbiAgICB0aGlzLl92YWx1ZVNhdE1pbk1heCA9IHRoaXMuX3ZhbHVlVmFsTWluTWF4ID0gWzAsMTAwXTtcbiAgICB0aGlzLl92YWx1ZVJHQk1pbk1heCA9IFswLDI1NV07XG5cbiAgICB0aGlzLl92YWx1ZUh1ZSA9IERFRkFVTFRfVkFMVUVfSFVFO1xuICAgIHRoaXMuX3ZhbHVlU2F0ID0gREVGQVVMVF9WQUxVRV9TQVQ7XG4gICAgdGhpcy5fdmFsdWVWYWwgPSBERUZBVUxUX1ZBTFVFX1ZBTDtcbiAgICB0aGlzLl92YWx1ZVIgICA9IDA7XG4gICAgdGhpcy5fdmFsdWVHICAgPSAwO1xuICAgIHRoaXMuX3ZhbHVlQiAgID0gMDtcblxuICAgIHRoaXMuX3ZhbHVlSEVYID0gJyMwMDAwMDAnO1xuICAgIHRoaXMuX3ZhbHVlSEVYVmFsaWQgPSB0aGlzLl92YWx1ZUhFWDtcblxuICAgIHRoaXMuX2NhbGxiYWNrUGljayA9IGZ1bmN0aW9uKCl7fTtcblxuICAgIC8vdGhpcy5fY2FudmFzRmllbGRJbWFnZURhdGFGdW5jID0gZnVuY3Rpb24oaSxqKXtyZXR1cm4gdGhpcy5fSFNWMlJHQih0aGlzLl92YWx1ZUh1ZSxqKX1cblxuICAgIHRoaXMuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgIHRoaXMuX2RyYXdDYW52YXNTbGlkZXIoKTtcblxuICAgIHRoaXMuX3NldENvbG9ySFNWKHRoaXMuX3ZhbHVlSHVlLHRoaXMuX3ZhbHVlU2F0LHRoaXMuX3ZhbHVlVmFsKTtcblxuICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuXG4gICAgdGhpcy5fdXBkYXRlSGFuZGxlcygpO1xufVxuXG5QaWNrZXIucHJvdG90eXBlID1cbntcbiAgICBfZHJhd0hhbmRsZUZpZWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNGaWVsZCxcbiAgICAgICAgICAgIG5vZGVQb3MgPSB0aGlzLl9jYW52YXNGaWVsZFBvcyxcbiAgICAgICAgICAgIG1vdXNlUG9zID0gTW91c2UuZ2V0SW5zdGFuY2UoKS5nZXRQb3NpdGlvbigpO1xuXG4gICAgICAgIHZhciBwb3NYID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VQb3NbMF0gLSBub2RlUG9zWzBdLCBjYW52YXMud2lkdGgpKSxcbiAgICAgICAgICAgIHBvc1kgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1sxXSAtIG5vZGVQb3NbMV0sIGNhbnZhcy5oZWlnaHQpKSxcbiAgICAgICAgICAgIHBvc1hOb3JtID0gcG9zWCAvIGNhbnZhcy53aWR0aCxcbiAgICAgICAgICAgIHBvc1lOb3JtID0gcG9zWSAvIGNhbnZhcy5oZWlnaHQ7XG5cbiAgICAgICAgdmFyIHNhdCA9IE1hdGgucm91bmQocG9zWE5vcm0gKiB0aGlzLl92YWx1ZVNhdE1pbk1heFsxXSksXG4gICAgICAgICAgICB2YWwgPSBNYXRoLnJvdW5kKCgxLjAgLSBwb3NZTm9ybSkgKiB0aGlzLl92YWx1ZVZhbE1pbk1heFsxXSk7XG5cbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YodGhpcy5fdmFsdWVIdWUsIHNhdCwgdmFsKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUhhbmRsZUZpZWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB3aWR0aCA9IHRoaXMuX2NhbnZhc0ZpZWxkLndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0ID0gdGhpcy5fY2FudmFzRmllbGQuaGVpZ2h0LFxuICAgICAgICAgICAgb2Zmc2V0SGFuZGxlID0gdGhpcy5faGFuZGxlRmllbGRTaXplICogMC4yNTtcblxuICAgICAgICB2YXIgc2F0Tm9ybSA9IHRoaXMuX3ZhbHVlU2F0IC8gdGhpcy5fdmFsdWVTYXRNaW5NYXhbMV0sXG4gICAgICAgICAgICB2YWxOb3JtID0gdGhpcy5fdmFsdWVWYWwgLyB0aGlzLl92YWx1ZVZhbE1pbk1heFsxXTtcblxuICAgICAgICB0aGlzLl9oYW5kbGVGaWVsZC5zZXRQb3NpdGlvbkdsb2JhbChzYXROb3JtICogd2lkdGggLSBvZmZzZXRIYW5kbGUsXG4gICAgICAgICAgICAoMS4wIC0gdmFsTm9ybSkgKiBoZWlnaHQgLSBvZmZzZXRIYW5kbGUpO1xuXG4gICAgfSxcblxuICAgIF9kcmF3SGFuZGxlU2xpZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNTbGlkZXIsXG4gICAgICAgICAgICBjYW52YXNQb3NZID0gdGhpcy5fY2FudmFzU2xpZGVyUG9zWzFdLFxuICAgICAgICAgICAgbW91c2VQb3NZID0gTW91c2UuZ2V0SW5zdGFuY2UoKS5nZXRZKCk7XG5cbiAgICAgICAgdmFyIHBvc1kgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1kgLSBjYW52YXNQb3NZLCBjYW52YXMuaGVpZ2h0KSksXG4gICAgICAgICAgICBwb3NZTm9ybSA9IHBvc1kgLyBjYW52YXMuaGVpZ2h0O1xuXG4gICAgICAgIHZhciBodWUgPSBNYXRoLmZsb29yKCgxLjAgLSBwb3NZTm9ybSkgKiB0aGlzLl92YWx1ZUh1ZU1pbk1heFsxXSk7XG5cbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YoaHVlLCB0aGlzLl92YWx1ZVNhdCwgdGhpcy5fdmFsdWVWYWwpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVTbGlkZXIoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUhhbmRsZVNsaWRlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGhpcy5fY2FudmFzU2xpZGVyLmhlaWdodCxcbiAgICAgICAgICAgIG9mZnNldEhhbmRsZSA9IHRoaXMuX2hhbmRsZVNsaWRlckhlaWdodCAqIDAuMjU7XG5cbiAgICAgICAgdmFyIGh1ZU5vcm0gPSB0aGlzLl92YWx1ZUh1ZSAvIHRoaXMuX3ZhbHVlSHVlTWluTWF4WzFdO1xuXG4gICAgICAgIHRoaXMuX2hhbmRsZVNsaWRlci5zZXRQb3NpdGlvbkdsb2JhbFkoKGhlaWdodCAtIG9mZnNldEhhbmRsZSkgKiAoMS4wIC0gaHVlTm9ybSkpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlSGFuZGxlczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVGaWVsZCgpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVTbGlkZXIoKTtcbiAgICB9LFxuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgX3NldEh1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciBtaW5NYXggPSB0aGlzLl92YWx1ZUh1ZU1pbk1heDtcblxuICAgICAgICB0aGlzLl92YWx1ZUh1ZSA9IHZhbHVlID09IG1pbk1heFsxXSA/IG1pbk1heFswXSA6IHZhbHVlO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVigpO1xuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX3NldFNhdDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlU2F0ID0gTWF0aC5yb3VuZCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWKCk7XG4gICAgfSxcblxuICAgIF9zZXRWYWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl92YWx1ZVZhbCA9IE1hdGgucm91bmQodmFsdWUpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVigpO1xuICAgIH0sXG5cbiAgICBfc2V0UjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlUiA9IE1hdGgucm91bmQodmFsdWUpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQigpO1xuICAgIH0sXG5cbiAgICBfc2V0RzogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlRyA9IE1hdGgucm91bmQodmFsdWUpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQigpO1xuICAgIH0sXG5cbiAgICBfc2V0QjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlQiA9IE1hdGgucm91bmQodmFsdWUpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQigpO1xuICAgIH0sXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICBfb25JbnB1dEh1ZUNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dEh1ZSxcbiAgICAgICAgICAgIGlucHV0VmFsID0gdGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKGlucHV0LCB0aGlzLl92YWx1ZUh1ZU1pbk1heCk7XG5cbiAgICAgICAgdmFyIG1pbk1heCA9IHRoaXMuX3ZhbHVlSHVlTWluTWF4O1xuXG4gICAgICAgIGlmIChpbnB1dFZhbCA9PSBtaW5NYXhbMV0pIHtcbiAgICAgICAgICAgIGlucHV0VmFsID0gbWluTWF4WzBdO1xuICAgICAgICAgICAgaW5wdXQuc2V0VmFsdWUoaW5wdXRWYWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fc2V0SHVlKGlucHV0VmFsKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVTbGlkZXIoKTtcblxuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRTYXRDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0U2F0KHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dFNhdCwgdGhpcy5fdmFsdWVTYXRNaW5NYXgpKTtcbiAgICAgICAgdGhpcy5fb25JbnB1dFNWQ2hhbmdlKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0VmFsQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldFZhbCh0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQodGhpcy5faW5wdXRWYWwsIHRoaXMuX3ZhbHVlVmFsTWluTWF4KSk7XG4gICAgICAgIHRoaXMuX29uSW5wdXRTVkNoYW5nZSgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dFJDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Uih0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQodGhpcy5faW5wdXRSLCB0aGlzLl92YWx1ZVJHQk1pbk1heCkpO1xuICAgICAgICB0aGlzLl9vbklucHV0UkdCQ2hhbmdlKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0R0NoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRHKHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dEcsIHRoaXMuX3ZhbHVlUkdCTWluTWF4KSk7XG4gICAgICAgIHRoaXMuX29uSW5wdXRSR0JDaGFuZ2UoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRCQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldEIodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0QiwgdGhpcy5fdmFsdWVSR0JNaW5NYXgpKTtcbiAgICAgICAgdGhpcy5fb25JbnB1dFJHQkNoYW5nZSgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dEhFWEZpbmlzaDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dEhFWCxcbiAgICAgICAgICAgIHZhbHVlID0gaW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJyk7XG5cbiAgICAgICAgaWYgKCFDb2xvclV0aWwuaXNWYWxpZEhFWCh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX3ZhbHVlSEVYVmFsaWQpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fdmFsdWVIRVggPSB0aGlzLl92YWx1ZUhFWFZhbGlkID0gdmFsdWU7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yRnJvbUhFWCgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dFNWQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRSR0JDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1ZGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVzKCk7XG4gICAgfSxcblxuICAgIF9nZXRWYWx1ZUNvbnRyYWluZWQ6IGZ1bmN0aW9uIChpbnB1dCwgbWluTWF4KSB7XG4gICAgICAgIHZhciBpbnB1dFZhbCA9IE1hdGgucm91bmQoaW5wdXQuZ2V0VmFsdWUoKSksXG4gICAgICAgICAgICBtaW4gPSBtaW5NYXhbMF0sXG4gICAgICAgICAgICBtYXggPSBtaW5NYXhbMV07XG5cbiAgICAgICAgaWYgKGlucHV0VmFsIDw9IG1pbikge1xuICAgICAgICAgICAgaW5wdXRWYWwgPSBtaW47XG4gICAgICAgICAgICBpbnB1dC5zZXRWYWx1ZShpbnB1dFZhbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlucHV0VmFsID49IG1heCkge1xuICAgICAgICAgICAgaW5wdXRWYWwgPSBtYXg7XG4gICAgICAgICAgICBpbnB1dC5zZXRWYWx1ZShpbnB1dFZhbCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5wdXRWYWw7XG4gICAgfSxcblxuXG4gICAgX3VwZGF0ZUlucHV0SHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0SHVlLnNldFZhbHVlKHRoaXMuX3ZhbHVlSHVlKTtcbiAgICB9LFxuICAgIF91cGRhdGVJbnB1dFNhdDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dFNhdC5zZXRWYWx1ZSh0aGlzLl92YWx1ZVNhdCk7XG4gICAgfSxcbiAgICBfdXBkYXRlSW5wdXRWYWw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRWYWwuc2V0VmFsdWUodGhpcy5fdmFsdWVWYWwpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUlucHV0UjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dFIuc2V0VmFsdWUodGhpcy5fdmFsdWVSKTtcbiAgICB9LFxuICAgIF91cGRhdGVJbnB1dEc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRHLnNldFZhbHVlKHRoaXMuX3ZhbHVlRyk7XG4gICAgfSxcbiAgICBfdXBkYXRlSW5wdXRCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0Qi5zZXRWYWx1ZSh0aGlzLl92YWx1ZUIpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUlucHV0SEVYOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0SEVYLnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX3ZhbHVlSEVYKTtcbiAgICB9LFxuXG5cbiAgICBfc2V0Q29sb3JIU1Y6IGZ1bmN0aW9uIChodWUsIHNhdCwgdmFsKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlSHVlID0gaHVlO1xuICAgICAgICB0aGlzLl92YWx1ZVNhdCA9IHNhdDtcbiAgICAgICAgdGhpcy5fdmFsdWVWYWwgPSB2YWw7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRIdWUoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRTYXQoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRWYWwoKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xuICAgIH0sXG5cbiAgICBfc2V0Q29sb3JSR0I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlUiA9IHI7XG4gICAgICAgIHRoaXMuX3ZhbHVlRyA9IGc7XG4gICAgICAgIHRoaXMuX3ZhbHVlQiA9IGI7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRSKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0RygpO1xuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dEIoKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xuICAgIH0sXG5cbiAgICBfc2V0Q29sb3JIRVg6IGZ1bmN0aW9uIChoZXgpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVIRVggPSBoZXg7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0SEVYKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvckhTVjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVih0aGlzLl92YWx1ZUh1ZSwgdGhpcy5fdmFsdWVTYXQsIHRoaXMuX3ZhbHVlVmFsKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29udHJhc3RDdXJyQ29sb3IoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbG9yUkdCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldENvbG9yUkdCKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29sb3JIU1ZGcm9tUkdCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBoc3YgPSBDb2xvclV0aWwuUkdCMkhTVih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YoaHN2WzBdLCBoc3ZbMV0sIGhzdlsyXSk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvclJHQkZyb21IU1Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJnYiA9IENvbG9yVXRpbC5IU1YyUkdCKHRoaXMuX3ZhbHVlSHVlLCB0aGlzLl92YWx1ZVNhdCwgdGhpcy5fdmFsdWVWYWwpO1xuICAgICAgICB0aGlzLl9zZXRDb2xvclJHQihyZ2JbMF0sIHJnYlsxXSwgcmdiWzJdKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaGV4ID0gQ29sb3JVdGlsLlJHQjJIRVgodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XG4gICAgICAgIHRoaXMuX3NldENvbG9ySEVYKGhleCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvckZyb21IRVg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJnYiA9IENvbG9yVXRpbC5IRVgyUkdCKHRoaXMuX3ZhbHVlSEVYKTtcblxuICAgICAgICB0aGlzLl9zZXRDb2xvclJHQihyZ2JbMF0sIHJnYlsxXSwgcmdiWzJdKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1ZGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZXMoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldENvbnRyYXN0Q3VyckNvbG9yKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUNvbnRyYXN0UHJldkNvbG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldENvbnRyYXNQcmV2Q29sb3IodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQilcbiAgICB9LFxuXG4gICAgX3NldENvbnRyYXN0Q3VyckNvbG9yOiBmdW5jdGlvbiAociwgZywgYikge1xuICAgICAgICB0aGlzLl9jb2xvckN1cnJOb2RlLnNldFN0eWxlUHJvcGVydHkoJ2JhY2tncm91bmQnLCAncmdiKCcgKyByICsgJywnICsgZyArICcsJyArIGIgKyAnKScpXG4gICAgfSxcbiAgICBfc2V0Q29udHJhc1ByZXZDb2xvcjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgdGhpcy5fY29sb3JQcmV2Tm9kZS5zZXRTdHlsZVByb3BlcnR5KCdiYWNrZ3JvdW5kJywgJ3JnYignICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJyknKVxuICAgIH0sXG5cbiAgICBfb25IZWFkRHJhZ1N0YXJ0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgICAgIHBhcmVudE5vZGUgPSB0aGlzLl9wYXJlbnROb2RlO1xuXG4gICAgICAgIHZhciBub2RlUG9zID0gbm9kZS5nZXRQb3NpdGlvbkdsb2JhbCgpLFxuICAgICAgICAgICAgbW91c2VQb3MgPSBNb3VzZS5nZXRJbnN0YW5jZSgpLmdldFBvc2l0aW9uKCksXG4gICAgICAgICAgICBvZmZzZXRQb3MgPSB0aGlzLl9tb3VzZU9mZnNldDtcblxuICAgICAgICBvZmZzZXRQb3NbMF0gPSBtb3VzZVBvc1swXSAtIG5vZGVQb3NbMF07XG4gICAgICAgIG9mZnNldFBvc1sxXSA9IG1vdXNlUG9zWzFdIC0gbm9kZVBvc1sxXTtcblxuICAgICAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgICAgICBldmVudE1vdXNlVXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZVBvc2l0aW9uKCk7XG4gICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9ucygpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUNhbnZhc05vZGVQb3NpdGlvbnMoKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgICAgIHBhcmVudE5vZGUuYWRkQ2hpbGQobm9kZSk7XG5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVQb3NpdGlvbjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbW91c2VQb3MgPSBNb3VzZS5nZXRJbnN0YW5jZSgpLmdldFBvc2l0aW9uKCksXG4gICAgICAgICAgICBvZmZzZXRQb3MgPSB0aGlzLl9tb3VzZU9mZnNldDtcblxuICAgICAgICB2YXIgY3VyclBvc2l0aW9uWCA9IG1vdXNlUG9zWzBdIC0gb2Zmc2V0UG9zWzBdLFxuICAgICAgICAgICAgY3VyclBvc2l0aW9uWSA9IG1vdXNlUG9zWzFdIC0gb2Zmc2V0UG9zWzFdO1xuXG4gICAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgICAgIGhlYWQgPSB0aGlzLl9oZWFkTm9kZSxcbiAgICAgICAgICAgIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb247XG5cbiAgICAgICAgdmFyIG1heFggPSB3aW5kb3cuaW5uZXJXaWR0aCAtIG5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgICAgIG1heFkgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBoZWFkLmdldEhlaWdodCgpO1xuXG4gICAgICAgIHBvc2l0aW9uWzBdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oY3VyclBvc2l0aW9uWCwgbWF4WCkpO1xuICAgICAgICBwb3NpdGlvblsxXSA9IE1hdGgubWF4KDAsIE1hdGgubWluKGN1cnJQb3NpdGlvblksIG1heFkpKTtcblxuICAgICAgICBub2RlLnNldFBvc2l0aW9uR2xvYmFsKHBvc2l0aW9uWzBdLCBwb3NpdGlvblsxXSk7XG4gICAgfSxcblxuICAgIF9kcmF3Q2FudmFzRmllbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc0ZpZWxkLFxuICAgICAgICAgICAgY29udGV4dCA9IHRoaXMuX2NvbnRleHRDYW52YXNGaWVsZDtcblxuICAgICAgICB2YXIgd2lkdGggPSBjYW52YXMud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0LFxuICAgICAgICAgICAgaW52V2lkdGggPSAxIC8gd2lkdGgsXG4gICAgICAgICAgICBpbnZIZWlnaHQgPSAxIC8gaGVpZ2h0O1xuXG4gICAgICAgIHZhciBpbWFnZURhdGEgPSB0aGlzLl9pbWFnZURhdGFGaWVsZCxcbiAgICAgICAgICAgIHJnYiA9IFtdLFxuICAgICAgICAgICAgaW5kZXggPSAwO1xuXG4gICAgICAgIHZhciB2YWx1ZUh1ZSA9IHRoaXMuX3ZhbHVlSHVlO1xuXG4gICAgICAgIHZhciBpID0gLTEsIGo7XG4gICAgICAgIHdoaWxlICgrK2kgPCBoZWlnaHQpIHtcbiAgICAgICAgICAgIGogPSAtMTtcblxuICAgICAgICAgICAgd2hpbGUgKCsraiA8IHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgcmdiID0gQ29sb3JVdGlsLkhTVjJSR0IodmFsdWVIdWUsIGogKiBpbnZXaWR0aCAqIDEwMC4wLCAoIDEuMCAtIGkgKiBpbnZIZWlnaHQgKSAqIDEwMC4wKTtcbiAgICAgICAgICAgICAgICBpbmRleCA9IChpICogd2lkdGggKyBqKSAqIDQ7XG5cbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleF0gPSByZ2JbMF07XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAxXSA9IHJnYlsxXTtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDJdID0gcmdiWzJdO1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgM10gPSAyNTU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApO1xuICAgIH0sXG5cbiAgICBfZHJhd0NhbnZhc1NsaWRlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzU2xpZGVyLFxuICAgICAgICAgICAgY29udGV4dCA9IHRoaXMuX2NvbnRleHRDYW52YXNTbGlkZXI7XG5cbiAgICAgICAgdmFyIHdpZHRoID0gY2FudmFzLndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0ID0gY2FudmFzLmhlaWdodCxcbiAgICAgICAgICAgIGludkhlaWdodCA9IDEgLyBoZWlnaHQ7XG5cbiAgICAgICAgdmFyIGltYWdlRGF0YSA9IHRoaXMuX2ltYWdlRGF0YVNsaWRlcixcbiAgICAgICAgICAgIHJnYiA9IFtdLFxuICAgICAgICAgICAgaW5kZXggPSAwO1xuXG4gICAgICAgIHZhciBpID0gLTEsIGo7XG4gICAgICAgIHdoaWxlICgrK2kgPCBoZWlnaHQpIHtcbiAgICAgICAgICAgIGogPSAtMTtcblxuICAgICAgICAgICAgd2hpbGUgKCsraiA8IHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgcmdiID0gQ29sb3JVdGlsLkhTVjJSR0IoKDEuMCAtIGkgKiBpbnZIZWlnaHQpICogMzYwLjAsIDEwMC4wLCAxMDAuMCk7XG4gICAgICAgICAgICAgICAgaW5kZXggPSAoaSAqIHdpZHRoICsgaikgKiA0O1xuXG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXhdID0gcmdiWzBdO1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgMV0gPSByZ2JbMV07XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAyXSA9IHJnYlsyXTtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDNdID0gMjU1O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKTtcblxuICAgIH0sXG5cbiAgICBfb25DYW52YXNGaWVsZE1vdXNlRG93bjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgICAgICBldmVudE1vdXNlVXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuX2RyYXdIYW5kbGVGaWVsZCgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgICAgICBzZWxmLl9kcmF3SGFuZGxlRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX29uQ2FudmFzU2xpZGVyTW91c2VEb3duOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fZHJhd0hhbmRsZVNsaWRlcigpO1xuICAgICAgICAgICAgICAgIHNlbGYuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBzZWxmLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgICAgICBzZWxmLl9kcmF3SGFuZGxlU2xpZGVyKCk7XG4gICAgICAgIHNlbGYuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfc2V0U2l6ZUNhbnZhc0ZpZWxkOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzRmllbGQ7XG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG4gICAgfSxcblxuICAgIF9zZXRTaXplQ2FudmFzU2xpZGVyOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzU2xpZGVyO1xuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XG4gICAgICAgIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyAncHgnO1xuICAgICAgICBjYW52YXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGhlaWdodDtcbiAgICB9LFxuXG4gICAgb3BlbjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGU7XG5cbiAgICAgICAgdGhpcy5fcGFyZW50Tm9kZS5hZGRDaGlsZChub2RlKTtcbiAgICAgICAgbm9kZS5zZXRQb3NpdGlvbkdsb2JhbCh3aW5kb3cuaW5uZXJXaWR0aCAqIDAuNSAtIG5vZGUuZ2V0V2lkdGgoKSAqIDAuNSxcbiAgICAgICAgICAgIHdpbmRvdy5pbm5lckhlaWdodCAqIDAuNSAtIG5vZGUuZ2V0SGVpZ2h0KCkgKiAwLjUpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNhbnZhc05vZGVQb3NpdGlvbnMoKTtcbiAgICB9LFxuXG4gICAgY2xvc2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fcGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLl9ub2RlKTtcbiAgICB9LFxuXG4gICAgX29uQ2xvc2U6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH0sXG4gICAgX29uUGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9jYWxsYmFja1BpY2soKTtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2FudmFzU2xpZGVyUG9zID0gdGhpcy5fY2FudmFzU2xpZGVyUG9zLFxuICAgICAgICAgICAgY2FudmFzRmllbGRQb3MgPSB0aGlzLl9jYW52YXNGaWVsZFBvcztcblxuICAgICAgICBjYW52YXNTbGlkZXJQb3NbMF0gPSBjYW52YXNTbGlkZXJQb3NbMV0gPSAwO1xuICAgICAgICBjYW52YXNGaWVsZFBvc1swXSA9IGNhbnZhc0ZpZWxkUG9zWzFdID0gMDtcblxuICAgICAgICB2YXIgZWxlbWVudCA9IHRoaXMuX2NhbnZhc1NsaWRlcjtcblxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICAgICAgY2FudmFzU2xpZGVyUG9zWzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgICAgIGNhbnZhc1NsaWRlclBvc1sxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW1lbnQgPSB0aGlzLl9jYW52YXNGaWVsZDtcblxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICAgICAgY2FudmFzRmllbGRQb3NbMF0gKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICAgICAgY2FudmFzRmllbGRQb3NbMV0gKz0gZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgc2V0Q2FsbGJhY2tQaWNrOiBmdW5jdGlvbiAoZnVuYykge1xuICAgICAgICB0aGlzLl9jYWxsYmFja1BpY2sgPSBmdW5jO1xuICAgIH0sXG5cbiAgICBzZXRDb2xvckhFWDogZnVuY3Rpb24gKGhleCkge1xuICAgICAgICB0aGlzLl9zZXRDb2xvckhFWChoZXgpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckZyb21IRVgoKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3IoKTtcbiAgICB9LFxuXG4gICAgc2V0Q29sb3JSR0I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgICAgIHRoaXMuX3NldENvbG9yUkdCKHIsIGcsIGIpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1ZGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3NldENvbG9yKCk7XG4gICAgfSxcblxuICAgIHNldENvbG9yUkdCZnY6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgICAgIHRoaXMuc2V0Q29sb3JSR0IoTWF0aC5mbG9vcihyICogMjU1LjApLFxuICAgICAgICAgICAgTWF0aC5mbG9vcihnICogMjU1LjApLFxuICAgICAgICAgICAgTWF0aC5mbG9vcihiICogMjU1LjApKTtcbiAgICB9LFxuXG4gICAgc2V0Q29sb3JIU1Y6IGZ1bmN0aW9uIChoLCBzLCB2KSB7XG4gICAgICAgIHRoaXMuX3NldENvbG9ySFNWKGgsIHMsIHYpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3NldENvbG9yKCk7XG4gICAgfSxcblxuICAgIF9zZXRDb2xvcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICAgICAgdGhpcy5fZHJhd0NhbnZhc1NsaWRlcigpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVzKCk7XG4gICAgICAgIHRoaXMuX3NldENvbnRyYXNQcmV2Q29sb3IodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XG4gICAgfSxcblxuICAgIGdldFI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlUjtcbiAgICB9LFxuICAgIGdldEc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlRztcbiAgICB9LFxuICAgIGdldEI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlQjtcbiAgICB9LFxuICAgIGdldFJHQjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gW3RoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUJdO1xuICAgIH0sXG4gICAgZ2V0SHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZUh1ZTtcbiAgICB9LFxuICAgIGdldFNhdDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVTYXQ7XG4gICAgfSxcbiAgICBnZXRWYWw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlVmFsO1xuICAgIH0sXG4gICAgZ2V0SFNWOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbdGhpcy5fdmFsdWVIdWUsIHRoaXMuX3ZhbHVlU2F0LCB0aGlzLl92YWx1ZVZhbF07XG4gICAgfSxcbiAgICBnZXRIRVg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlSEVYO1xuICAgIH0sXG4gICAgZ2V0UkdCZnY6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFt0aGlzLl92YWx1ZVIgLyAyNTUuMCwgdGhpcy5fdmFsdWVHIC8gMjU1LjAsIHRoaXMuX3ZhbHVlQiAvIDI1NS4wXTtcbiAgICB9LFxuXG4gICAgZ2V0Tm9kZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbm9kZTtcbiAgICB9XG59O1xuXG5QaWNrZXIuc2V0dXAgPSBmdW5jdGlvbiAocGFyZW50Tm9kZSkge1xuICAgIHJldHVybiBQaWNrZXIuX2luc3RhbmNlID0gbmV3IFBpY2tlcihwYXJlbnROb2RlKTtcbn07XG5QaWNrZXIuZ2V0SW5zdGFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFBpY2tlci5faW5zdGFuY2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBpY2tlcjsiLCJ2YXIgU1ZHQ29tcG9uZW50ID0gcmVxdWlyZSgnLi9TVkdDb21wb25lbnQnKTtcblxuZnVuY3Rpb24gUGxvdHRlcihwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMubGluZVdpZHRoICA9IHBhcmFtcy5saW5lV2lkdGggIHx8IDI7XG4gICAgcGFyYW1zLmxpbmVDb2xvciAgPSBwYXJhbXMubGluZUNvbG9yICB8fCBbMjU1LDI1NSwyNTVdO1xuXG4gICAgU1ZHQ29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHZhciBsaW5lV2lkdGggPSB0aGlzLl9saW5lV2lkdGggPSBwYXJhbXMubGluZVdpZHRoO1xuICAgIHZhciBsaW5lQ29sb3IgPSBwYXJhbXMubGluZUNvbG9yO1xuXG4gICAgdmFyIGdyaWQgPSB0aGlzLl9ncmlkID0gdGhpcy5fc3ZnUm9vdC5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3BhdGgnKSk7XG4gICAgICAgIGdyaWQuc3R5bGUuc3Ryb2tlID0gJ3JnYigyNiwyOSwzMSknO1xuXG5cbiAgICB2YXIgcGF0aCA9IHRoaXMuX3BhdGggPSB0aGlzLl9zdmdSb290LmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgncGF0aCcpKTtcbiAgICAgICAgcGF0aC5zdHlsZS5zdHJva2UgICAgICA9ICdyZ2IoJytsaW5lQ29sb3JbMF0rJywnK2xpbmVDb2xvclsxXSsnLCcrbGluZUNvbG9yWzJdKycpJztcbiAgICAgICAgcGF0aC5zdHlsZS5zdHJva2VXaWR0aCA9IGxpbmVXaWR0aCA7XG4gICAgICAgIHBhdGguc3R5bGUuZmlsbCAgICAgICAgPSAnbm9uZSc7XG59XG5cblBsb3R0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTVkdDb21wb25lbnQucHJvdG90eXBlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBQbG90dGVyO1xuIiwidmFyIEV2ZW50RGlzcGF0Y2hlciAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXInKTtcbnZhciBPYmplY3RDb21wb25lbnROb3RpZmllciA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Tm90aWZpZXInKTtcblxudmFyIEV2ZW50XyAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIE9wdGlvbkV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PcHRpb25FdmVudCcpLFxuICAgIE5vZGVFdmVudCAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcblxudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xuXG5mdW5jdGlvbiBQcmVzZXRCdG4ocGFyZW50Tm9kZSkge1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzKTtcbiAgICB2YXIgYnRuTm9kZSAgPSB0aGlzLl9idG5Ob2RlID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pLFxuICAgICAgICBpbmRpTm9kZSA9IHRoaXMuX2luZGlOb2RlID0gbmV3IE5vZGUoKTtcblxuICAgIHRoaXMuX29uQWN0aXZlID0gZnVuY3Rpb24gKCkge307XG4gICAgdGhpcy5fb25EZWFjdGl2ZSA9IGZ1bmN0aW9uICgpIHt9O1xuICAgIHRoaXMuX2lzQWN0aXZlID0gZmFsc2U7XG5cbiAgICBidG5Ob2RlLnNldFN0eWxlQ2xhc3MoQ1NTLlByZXNldEJ0bik7XG4gICAgYnRuTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbk1vdXNlRG93bi5iaW5kKHRoaXMpKTtcblxuICAgIGJ0bk5vZGUuYWRkQ2hpbGQoaW5kaU5vZGUpO1xuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGRBdChidG5Ob2RlLCAwKTtcblxuICAgIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLmFkZEV2ZW50TGlzdGVuZXIoT3B0aW9uRXZlbnQuVFJJR0dFUiwgdGhpcywgJ29uT3B0aW9uVHJpZ2dlcicpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihPcHRpb25FdmVudC5UUklHR0VSRUQsIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLCAnb25PcHRpb25UcmlnZ2VyZWQnKTtcbn1cblxuUHJlc2V0QnRuLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5cblByZXNldEJ0bi5wcm90b3R5cGUub25PcHRpb25UcmlnZ2VyID0gZnVuY3Rpb24oZSl7XG4gICAgaWYoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXtcbiAgICAgICAgaWYoIXRoaXMuX2lzQWN0aXZlKXtcbiAgICAgICAgICAgIHRoaXMuX29uQWN0aXZlKCk7XG4gICAgICAgICAgICB0aGlzLl9idG5Ob2RlLnNldFN0eWxlQ2xhc3MoQ1NTLlByZXNldEJ0bkFjdGl2ZSk7XG4gICAgICAgICAgICB0aGlzLl9pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZXtcbiAgICAgICAgICAgIHRoaXMuX29uRGVhY3RpdmUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYodGhpcy5faXNBY3RpdmUpe1xuICAgICAgICB0aGlzLmRlYWN0aXZhdGUoKTtcbiAgICB9XG59O1xuXG5QcmVzZXRCdG4ucHJvdG90eXBlLl9vbk1vdXNlRG93biA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgT3B0aW9uRXZlbnQuVFJJR0dFUkVELCBudWxsKSk7XG59O1xuXG5QcmVzZXRCdG4ucHJvdG90eXBlLnNldE9uQWN0aXZlID0gZnVuY3Rpb24oZnVuYyl7XG4gICAgdGhpcy5fb25BY3RpdmUgPSBmdW5jO1xufTtcblxuUHJlc2V0QnRuLnByb3RvdHlwZS5zZXRPbkRlYWN0aXZlID0gZnVuY3Rpb24oZnVuYyl7XG4gICAgdGhpcy5fb25EZWFjdGl2ZSA9IGZ1bmM7XG59O1xuXG5QcmVzZXRCdG4ucHJvdG90eXBlLmRlYWN0aXZhdGUgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX2lzQWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5fYnRuTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5QcmVzZXRCdG4pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmVzZXRCdG47XG4iLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgTnVtYmVySW5wdXRfSW50ZXJuYWwgPSByZXF1aXJlKCcuL051bWJlcklucHV0X0ludGVybmFsJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIERFRkFVTFRfU1RFUCA9IDEuMCxcbiAgICBERUZBVUxUX0RQICAgPSAyO1xuXG5mdW5jdGlvbiBSYW5nZShwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5vbkZpbmlzaCA9IHBhcmFtcy5vbkZpbmlzaCB8fCB0aGlzLl9vbkZpbmlzaDtcblxuICAgIHBhcmFtcy5zdGVwICAgICA9IHBhcmFtcy5zdGVwIHx8IERFRkFVTFRfU1RFUDtcbiAgICBwYXJhbXMuZHAgICAgICAgPSBwYXJhbXMuZHAgICB8fCBERUZBVUxUX0RQO1xuXG4gICAgdGhpcy5fb25DaGFuZ2UgID0gcGFyYW1zLm9uQ2hhbmdlO1xuICAgIHRoaXMuX29uRmluaXNoICA9IHBhcmFtcy5vbkZpbmlzaDtcblxuICAgIHZhciBzdGVwID0gdGhpcy5fc3RlcCA9IHBhcmFtcy5zdGVwLFxuICAgICAgICBkcCAgID0gdGhpcy5fZHAgICA9IHBhcmFtcy5kcDtcblxuICAgIC8vRklYTUU6IGhpc3RvcnkgcHVzaCBwb3BcblxuICAgIHZhciBsYWJsTWluTm9kZSA9IG5ldyBOb2RlKCk7XG4gICAgdmFyIGlucHV0TWluICAgID0gdGhpcy5faW5wdXRNaW4gPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCwgdGhpcy5wdXNoSGlzdG9yeVN0YXRlLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25JbnB1dE1pbkNoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRNaW5GaW5pc2guYmluZCh0aGlzKSk7XG5cbiAgICB2YXIgbGFibE1heE5vZGUgPSBuZXcgTm9kZSgpO1xuICAgIHZhciBpbnB1dE1heCAgICA9IHRoaXMuX2lucHV0TWF4ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsIHRoaXMucHVzaEhpc3RvcnlTdGF0ZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRNYXhDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0TWF4RmluaXNoLmJpbmQodGhpcykpO1xuXG4gICAgdmFyIHdyYXBMYWJsTWluICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIHdyYXBJbnB1dE1pbiA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIHdyYXBMYWJsTWF4ICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIHdyYXBJbnB1dE1heCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG5cblxuICAgICAgICBsYWJsTWluTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ01JTicpO1xuICAgICAgICBsYWJsTWF4Tm9kZS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ01BWCcpO1xuXG4gICAgdmFyIHZhbHVlcyA9IHRoaXMuX29iamVjdFt0aGlzLl9rZXldO1xuXG4gICAgaW5wdXRNaW4uc2V0VmFsdWUodmFsdWVzWzBdKTtcbiAgICBpbnB1dE1heC5zZXRWYWx1ZSh2YWx1ZXNbMV0pO1xuXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICAgICAgd3JhcExhYmxNaW4uYWRkQ2hpbGQobGFibE1pbk5vZGUpO1xuICAgICAgICB3cmFwSW5wdXRNaW4uYWRkQ2hpbGQoaW5wdXRNaW4uZ2V0Tm9kZSgpKTtcbiAgICAgICAgd3JhcExhYmxNYXguYWRkQ2hpbGQobGFibE1heE5vZGUpO1xuICAgICAgICB3cmFwSW5wdXRNYXguYWRkQ2hpbGQoaW5wdXRNYXguZ2V0Tm9kZSgpKTtcblxuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZCh3cmFwTGFibE1pbik7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKHdyYXBJbnB1dE1pbik7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKHdyYXBMYWJsTWF4KTtcbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQod3JhcElucHV0TWF4KTtcbn1cblxuUmFuZ2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcblxuUmFuZ2UucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuUmFuZ2UucHJvdG90eXBlLl9vbklucHV0RmluaXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkZpbmlzaCgpO1xufTtcblxuUmFuZ2UucHJvdG90eXBlLl91cGRhdGVWYWx1ZU1pbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG5cbiAgICB2YXIgaW5wdXRNaW4gPSB0aGlzLl9pbnB1dE1pbixcbiAgICAgICAgaW5wdXRWYWx1ZSA9IGlucHV0TWluLmdldFZhbHVlKCk7XG5cbiAgICBpZiAoaW5wdXRWYWx1ZSA+PSB0aGlzLl9pbnB1dE1heC5nZXRWYWx1ZSgpKSB7XG4gICAgICAgIGlucHV0TWluLnNldFZhbHVlKHZhbHVlc1swXSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFsdWVzWzBdID0gaW5wdXRWYWx1ZTtcblxufTtcblxuUmFuZ2UucHJvdG90eXBlLl91cGRhdGVWYWx1ZU1heCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG5cbiAgICB2YXIgaW5wdXRNYXggPSB0aGlzLl9pbnB1dE1heCxcbiAgICAgICAgaW5wdXRWYWx1ZSA9IGlucHV0TWF4LmdldFZhbHVlKCk7XG5cbiAgICBpZiAoaW5wdXRWYWx1ZSA8PSB0aGlzLl9pbnB1dE1pbi5nZXRWYWx1ZSgpKSB7XG4gICAgICAgIGlucHV0TWF4LnNldFZhbHVlKHZhbHVlc1sxXSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFsdWVzWzFdID0gaW5wdXRWYWx1ZTtcbn07XG5cblxuUmFuZ2UucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChlLmRhdGEub3JpZ2luID09IG51bGwpIHtcbiAgICB9XG5cbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG4gICAgdGhpcy5faW5wdXRNaW4uc2V0VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX2tleV1bMF0pO1xuICAgIHRoaXMuX2lucHV0TWF4LnNldFZhbHVlKHRoaXMuX29iamVjdFt0aGlzLl9rZXldWzFdKTtcbn07XG5cblxuUmFuZ2UucHJvdG90eXBlLl9vbklucHV0TWluQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZVZhbHVlTWluKCk7XG4gICAgdGhpcy5fb25JbnB1dENoYW5nZSgpO1xufTtcblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dE1pbkZpbmlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVWYWx1ZU1pbigpO1xuICAgIHRoaXMuX29uSW5wdXRGaW5pc2goKTtcbn07XG5SYW5nZS5wcm90b3R5cGUuX29uSW5wdXRNYXhDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVNYXgoKTtcbiAgICB0aGlzLl9vbklucHV0Q2hhbmdlKCk7XG59O1xuUmFuZ2UucHJvdG90eXBlLl9vbklucHV0TWF4RmluaXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZVZhbHVlTWF4KCk7XG4gICAgdGhpcy5fb25JbnB1dEZpbmlzaCgpO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFJhbmdlOyIsInZhciBDb21wb25lbnQgPSByZXF1aXJlKCcuLy4uL2NvcmUvQ29tcG9uZW50Jyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xudmFyIEdyb3VwRXZlbnQgPSByZXF1aXJlKCcuLi9ncm91cC9Hcm91cEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIFNWRyhwYXJlbnQsIHBhcmFtcykge1xuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG4gICAgd3JhcE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzV3JhcCk7XG4gICAgdmFyIHdyYXBTaXplID0gd3JhcE5vZGUuZ2V0V2lkdGgoKTtcblxuXG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZyA9IHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnc3ZnJyk7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgndmVyc2lvbicsICcxLjInKTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCdiYXNlUHJvZmlsZScsICd0aW55Jyk7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgncHJlc2VydmVBc3BlY3RSYXRpbycsICd0cnVlJyk7XG5cbiAgICB3cmFwTm9kZS5nZXRFbGVtZW50KCkuYXBwZW5kQ2hpbGQoc3ZnKTtcblxuICAgIHRoaXMuX3N2Z1NldFNpemUod3JhcFNpemUsIHdyYXBTaXplKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcblxuXG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZUNsYXNzKENTUy5DYW52YXNMaXN0SXRlbSk7XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCB0aGlzLCAnb25Hcm91cFNpemVDaGFuZ2UnKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSwgdGhpcy5fcGFyZW50LCAnb25Hcm91cFNpemVVcGRhdGUnKTtcbn1cblxuU1ZHLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ29tcG9uZW50LnByb3RvdHlwZSk7XG5cblNWRy5wcm90b3R5cGUuX3VwZGF0ZUhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnSGVpZ2h0ID0gTnVtYmVyKHRoaXMuX3N2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcbiAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQoc3ZnSGVpZ2h0KTtcbiAgICB0aGlzLl9ub2RlLnNldEhlaWdodChzdmdIZWlnaHQgKyBNZXRyaWMuUEFERElOR19XUkFQUEVSKTtcbn07XG5cblNWRy5wcm90b3R5cGUub25Hcm91cFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKTtcbiAgICB0aGlzLl9zdmdTZXRTaXplKHdpZHRoLCB3aWR0aCk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG59O1xuXG5TVkcucHJvdG90eXBlLl9zdmdTZXRTaXplID0gZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGgpO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgndmlld2JveCcsICcwIDAgJyArIHdpZHRoICsgJyAnICsgaGVpZ2h0KTtcbn07XG5cblNWRy5wcm90b3R5cGUuZ2V0U1ZHID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zdmc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNWRzsiLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIEdyb3VwRXZlbnQgPSByZXF1aXJlKCcuLi9ncm91cC9Hcm91cEV2ZW50Jyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi4vY29yZS9NZXRyaWMnKTtcblxuZnVuY3Rpb24gU1ZHQ29tcG9uZW50KHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKXtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG4gICAgICAgIHdyYXBOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLlNWR1dyYXApO1xuICAgIHZhciB3cmFwU2l6ZSA9IHdyYXBOb2RlLmdldFdpZHRoKCk7XG5cbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnID0gdGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdzdmcnKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgndmVyc2lvbicsICcxLjInKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnYmFzZVByb2ZpbGUnLCAndGlueScpO1xuXG4gICAgICAgIHdyYXBOb2RlLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChzdmcpO1xuXG4gICAgdmFyIHN2Z1Jvb3QgPSB0aGlzLl9zdmdSb290ID0gc3ZnLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnZycpKTtcbiAgICAgICAgc3ZnUm9vdC5zZXRBdHRyaWJ1dGUoJ3RyYW5zZm9ybScsJ3RyYW5zbGF0ZSgwLjUgMC41KScpO1xuXG4gICAgdGhpcy5fc3ZnU2V0U2l6ZSh3cmFwU2l6ZSx3cmFwU2l6ZSk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG5cbiAgICB0aGlzLl9ub2RlLnNldFN0eWxlQ2xhc3MoQ1NTLlNWR0xpc3RJdGVtKTtcblxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIHRoaXMsICdvbkdyb3VwU2l6ZUNoYW5nZScpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfVVBEQVRFLCB0aGlzLl9wYXJlbnQsICdvbkdyb3VwU2l6ZVVwZGF0ZScpO1xufVxuXG5TVkdDb21wb25lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcblxuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl91cGRhdGVIZWlnaHQgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzdmdIZWlnaHQgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuXG4gICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KHN2Z0hlaWdodCk7XG4gICAgdGhpcy5fbm9kZS5zZXRIZWlnaHQoc3ZnSGVpZ2h0ICsgTWV0cmljLlBBRERJTkdfV1JBUFBFUik7XG59O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9yZWRyYXcgPSBmdW5jdGlvbigpe307XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUub25Hcm91cFNpemVDaGFuZ2UgPSBmdW5jdGlvbigpe1xuICAgIHZhciB3aWR0aCA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCk7XG5cbiAgICB0aGlzLl9zdmdTZXRTaXplKHdpZHRoLHdpZHRoKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcbiAgICB0aGlzLl9yZWRyYXcoKTtcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX2NyZWF0ZVNWR09iamVjdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIix0eXBlKTtcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3N2Z1NldFNpemUgPSBmdW5jdGlvbih3aWR0aCxoZWlnaHQpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCd3aWR0aCcsICB3aWR0aCk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ZpZXdib3gnLCAnMCAwICcgKyB3aWR0aCArICcgJyArIGhlaWdodCk7XG59O1xuXG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRNb3ZlVG8gPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiAnTSAnICsgeCArICcgJyArIHkgKyAnICc7XG59O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kTGluZVRvID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICByZXR1cm4gJ0wgJyArIHggKyAnICcgKyB5ICsgJyAnO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZENsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAnWic7XG59O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kTGluZSA9IGZ1bmN0aW9uICh4MCwgeTAsIHgxLCB5MSkge1xuICAgIHJldHVybiAnTSAnICsgeDAgKyAnICcgKyB5MCArICcgTCAnICsgeDEgKyAnICcgKyB5MTtcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRCZXppZXJDdWJpYyA9IGZ1bmN0aW9uIChjbWQsIHgwLCB5MCwgY3gwLCBjeTAsIGN4MSwgY3kxLCB4MSwgeTEpIHtcbiAgICByZXR1cm4gJ00gJyArIHgwICsgJyAnICsgeTAgKyAnIEMgJyArIGN4MCArICcgJyArIGN5MCArICcsICcgKyBjeDEgKyAnICcgKyBjeTEgKyAnLCAnICsgeDEgKyAnICcgKyB5MTtcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRCZXppZXJRdWFkcmF0aWMgPSBmdW5jdGlvbiAoY21kLCB4MCwgeTAsIGN4LCBjeSwgeDEsIHkxKSB7XG4gICAgcmV0dXJuICdNICcgKyB4MCArICcgJyArIHkwICsgJyBRICcgKyBjeCArICcgJyArIGN5ICsgJywgJyArIHgxICsgJyAnICsgeTE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNWR0NvbXBvbmVudDsiLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgQ1NTICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbnZhciBPcHRpb25zID0gcmVxdWlyZSgnLi9PcHRpb25zJyk7XG5cbnZhciBFdmVudF8gICAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50JyksXG4gICAgT3B0aW9uRXZlbnQgICAgPSByZXF1aXJlKCcuLi9jb3JlL09wdGlvbkV2ZW50Jyk7XG5cbnZhciBPYmplY3RDb21wb25lbnROb3RpZmllciA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Tm90aWZpZXInKTtcblxuZnVuY3Rpb24gU2VsZWN0KHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5vbkZpbmlzaCA9IHBhcmFtcy5vbkZpbmlzaCB8fCB0aGlzLl9vbkZpbmlzaDtcblxuICAgIHRoaXMuX29uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlO1xuICAgIHRoaXMuX29uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoO1xuXG4gICAgdmFyIG9iaiA9IHRoaXMuX29iamVjdCxcbiAgICAgICAga2V5ID0gdGhpcy5fa2V5O1xuXG4gICAgdmFyIHRhcmdldEtleSA9IHRoaXMuX3RhcmdldEtleSA9IHBhcmFtcy50YXJnZXQsXG4gICAgICAgIHZhbHVlcyA9IHRoaXMuX3ZhbHVlcyA9IG9ialtrZXldO1xuXG5cbiAgICB0aGlzLl9zZWxlY3RlZEluZGV4ID0gLTE7XG4gICAgdGhpcy5fc2VsZWN0ZWQgPSBudWxsO1xuXG4gICAgdmFyIHNlbGVjdCA9IHRoaXMuX3NlbGVjdCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcbiAgICAgICAgc2VsZWN0LnNldFN0eWxlQ2xhc3MoQ1NTLlNlbGVjdCk7XG4gICAgICAgIHNlbGVjdC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbk9wdGlvblRyaWdnZXIuYmluZCh0aGlzKSk7XG5cbiAgICBpZih0aGlzLl9oYXNUYXJnZXQoKSkge1xuICAgICAgICB2YXIgdGFyZ2V0T2JqID0gb2JqW3RhcmdldEtleV0gfHwgJyc7XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCB2YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAodGFyZ2V0T2JqID09IHZhbHVlc1tpXSl7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2VsZWN0ZWQgPSB2YWx1ZXNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc2VsZWN0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRhcmdldE9iai50b1N0cmluZygpLmxlbmd0aCA+IDAgPyB0YXJnZXRPYmogOiB2YWx1ZXNbMF0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2VsZWN0LnNldFByb3BlcnR5KCd2YWx1ZScsIHBhcmFtcy5zZWxlY3RlZCA/IHZhbHVlc1twYXJhbXMuc2VsZWN0ZWRdIDogJ0Nob29zZSAuLi4nKTtcbiAgICB9XG5cbiAgICB0aGlzLl93cmFwTm9kZS5hZGRDaGlsZChzZWxlY3QpO1xuXG4gICAgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCkuYWRkRXZlbnRMaXN0ZW5lcihPcHRpb25FdmVudC5UUklHR0VSLCB0aGlzLCAnb25PcHRpb25UcmlnZ2VyJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKE9wdGlvbkV2ZW50LlRSSUdHRVJFRCwgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCksICdvbk9wdGlvblRyaWdnZXJlZCcpO1xufVxuXG5TZWxlY3QucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcblxuU2VsZWN0LnByb3RvdHlwZS5vbk9wdGlvblRyaWdnZXIgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpIHtcbiAgICAgICAgdGhpcy5fYWN0aXZlID0gIXRoaXMuX2FjdGl2ZTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuXG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcbiAgICAgICAgICAgIHRoaXMuX2J1aWxkT3B0aW9ucygpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgT3B0aW9ucy5nZXQoKS5jbGVhcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX2FjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuX2J1aWxkT3B0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb3B0aW9ucyA9IE9wdGlvbnMuZ2V0KCk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgb3B0aW9ucy5idWlsZCh0aGlzLl92YWx1ZXMsIHRoaXMuX3NlbGVjdGVkLCB0aGlzLl9zZWxlY3QsXG4gICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgICAgIHNlbGYuX2FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgc2VsZi5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgICAgICAgICAgc2VsZi5fc2VsZWN0ZWRJbmRleCA9IG9wdGlvbnMuZ2V0U2VsZWN0ZWRJbmRleCgpO1xuICAgICAgICAgICAgc2VsZi5fb25DaGFuZ2Uoc2VsZi5fc2VsZWN0ZWRJbmRleCk7XG4gICAgICAgICAgICBvcHRpb25zLmNsZWFyKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLl9hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKVxuICAgICAgICB9LCBmYWxzZSk7XG59O1xuXG5cblNlbGVjdC5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW5kZXggPSBPcHRpb25zLmdldCgpLmdldFNlbGVjdGVkSW5kZXgoKSxcbiAgICAgICAgc2VsZWN0ZWQgPSB0aGlzLl9zZWxlY3RlZCA9IHRoaXMuX3ZhbHVlc1tpbmRleF07XG5cbiAgICBpZiAodGhpcy5faGFzVGFyZ2V0KCkpIHtcbiAgICAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgICAgIHRoaXMuX29iamVjdFt0aGlzLl90YXJnZXRLZXldID0gc2VsZWN0ZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5fc2VsZWN0LnNldFByb3BlcnR5KCd2YWx1ZScsIHNlbGVjdGVkKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLnB1c2hIaXN0b3J5U3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9iaiA9IHRoaXMuX29iamVjdCxcbiAgICAgICAga2V5ID0gdGhpcy5fdGFyZ2V0S2V5O1xuICAgIEhpc3RvcnkuZ2V0SW5zdGFuY2UoKS5wdXNoU3RhdGUob2JqLCBrZXksIG9ialtrZXldKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuX29uT3B0aW9uVHJpZ2dlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBPcHRpb25FdmVudC5UUklHR0VSRUQsIG51bGwpKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuX3VwZGF0ZUFwcGVhcmFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fc2VsZWN0LnNldFN0eWxlQ2xhc3ModGhpcy5fYWN0aXZlID8gQ1NTLlNlbGVjdEFjdGl2ZSA6IENTUy5TZWxlY3QpO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoIXRoaXMuX2hhc1RhcmdldCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9zZWxlY3RlZCA9IHRoaXMuX29iamVjdFt0aGlzLl90YXJnZXRLZXldO1xuICAgIHRoaXMuX3NlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl9zZWxlY3RlZC50b1N0cmluZygpKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuX2hhc1RhcmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGFyZ2V0S2V5ICE9IG51bGw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdDtcbiIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgU2xpZGVyX0ludGVybmFsID0gcmVxdWlyZSgnLi9TbGlkZXJfSW50ZXJuYWwnKTtcblxudmFyIEhpc3RvcnkgPSByZXF1aXJlKCcuLi9jb3JlL0hpc3RvcnknKTtcbnZhciBSYW5nZSA9IHJlcXVpcmUoJy4vUmFuZ2UnKTtcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgUGFuZWxFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL1BhbmVsRXZlbnQnKSxcbiAgICBHcm91cEV2ZW50ID0gcmVxdWlyZSgnLi4vZ3JvdXAvR3JvdXBFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9TVEVQID0gMS4wLFxuICAgIERFRkFVTFRfRFAgICA9IDI7XG5cblxuZnVuY3Rpb24gU2xpZGVyKHBhcmVudCxvYmplY3QsdmFsdWUscmFuZ2UscGFyYW1zKSB7XG4gICAgcGFyYW1zICAgICAgICAgID0gcGFyYW1zICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5sYWJlbCAgICA9IHBhcmFtcy5sYWJlbCAgICB8fCB2YWx1ZTtcblxuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLFtwYXJlbnQsb2JqZWN0LHJhbmdlLHBhcmFtc10pO1xuXG4gICAgdGhpcy5fdmFsdWVzICA9IHRoaXMuX29iamVjdFt0aGlzLl9rZXldO1xuICAgIHRoaXMuX3RhcmdldEtleSA9IHZhbHVlO1xuXG4gICAgcGFyYW1zLnN0ZXAgICAgID0gcGFyYW1zLnN0ZXAgICAgIHx8IERFRkFVTFRfU1RFUDtcbiAgICBwYXJhbXMuZHAgICAgICAgPSBwYXJhbXMuZHAgICAgICAgfHwgREVGQVVMVF9EUDtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgcGFyYW1zLm9uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoIHx8IHRoaXMuX29uRmluaXNoO1xuXG4gICAgdGhpcy5fc3RlcCAgICAgPSBwYXJhbXMuc3RlcDtcbiAgICB0aGlzLl9vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZTtcbiAgICB0aGlzLl9vbkZpbmlzaCA9IHBhcmFtcy5vbkZpbmlzaDtcbiAgICB0aGlzLl9kcCAgICAgICA9IHBhcmFtcy5kcDtcblxuICAgIHZhciB2YWx1ZXMgICAgPSB0aGlzLl92YWx1ZXMsXG4gICAgICAgIG9iaiAgICAgICA9IHRoaXMuX29iamVjdCxcbiAgICAgICAgdGFyZ2V0S2V5ID0gdGhpcy5fdGFyZ2V0S2V5O1xuXG4gICAgdmFyIHdyYXBOb2RlICA9IHRoaXMuX3dyYXBOb2RlO1xuICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwU2xpZGVyKTtcblxuICAgIHZhciBzbGlkZXIgPSB0aGlzLl9zbGlkZXIgPSBuZXcgU2xpZGVyX0ludGVybmFsKHdyYXBOb2RlLCB0aGlzLl9vblNsaWRlckJlZ2luLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vblNsaWRlck1vdmUuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uU2xpZGVyRW5kLmJpbmQodGhpcykpO1xuXG4gICAgc2xpZGVyLnNldEJvdW5kTWluKHZhbHVlc1swXSk7XG4gICAgc2xpZGVyLnNldEJvdW5kTWF4KHZhbHVlc1sxXSk7XG4gICAgc2xpZGVyLnNldFZhbHVlKG9ialt0YXJnZXRLZXldKTtcblxuXG4gICAgdmFyIGlucHV0ICA9IHRoaXMuX2lucHV0ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHRoaXMuX3N0ZXAsIHRoaXMuX2RwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0Q2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICBpbnB1dC5zZXRWYWx1ZShvYmpbdGFyZ2V0S2V5XSk7XG5cbiAgICB3cmFwTm9kZS5hZGRDaGlsZChpbnB1dC5nZXROb2RlKCkpO1xuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0VORCwgICAgdGhpcywgJ29uUGFuZWxNb3ZlRW5kJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgdGhpcywgJ29uR3JvdXBXaWR0aENoYW5nZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSwgIHRoaXMsICdvbldpbmRvd1Jlc2l6ZScpO1xufVxuXG5TbGlkZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcblxuU2xpZGVyLnByb3RvdHlwZS5wdXNoSGlzdG9yeVN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvYmogPSB0aGlzLl9vYmplY3QsXG4gICAgICAgIGtleSA9IHRoaXMuX3RhcmdldEtleTtcbiAgICBIaXN0b3J5LmdldEluc3RhbmNlKCkucHVzaFN0YXRlKG9iaiwga2V5LCBvYmpba2V5XSk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLl9vblNsaWRlckJlZ2luID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5fb25TbGlkZXJNb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX3VwZGF0ZVZhbHVlRmllbGQoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cblNsaWRlci5wcm90b3R5cGUuX29uU2xpZGVyRW5kID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX3VwZGF0ZVZhbHVlRmllbGQoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG4gICAgdGhpcy5fb25GaW5pc2goKTtcbn07XG5cblNsaWRlci5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXQsXG4gICAgICAgIHZhbHVlTWluID0gdGhpcy5fdmFsdWVzWzBdLFxuICAgICAgICB2YWx1ZU1heCA9IHRoaXMuX3ZhbHVlc1sxXTtcblxuICAgIGlmIChpbnB1dC5nZXRWYWx1ZSgpID49IHZhbHVlTWF4KXtcbiAgICAgICAgaW5wdXQuc2V0VmFsdWUodmFsdWVNYXgpO1xuICAgIH1cbiAgICBpZiAoaW5wdXQuZ2V0VmFsdWUoKSA8PSB2YWx1ZU1pbil7XG4gICAgICAgIGlucHV0LnNldFZhbHVlKHZhbHVlTWluKTtcbiAgICB9XG5cbiAgICB2YXIgdmFsdWUgPSBpbnB1dC5nZXRWYWx1ZSgpO1xuXG4gICAgdGhpcy5fc2xpZGVyLnNldFZhbHVlKHZhbHVlKTtcbiAgICB0aGlzLl9vYmplY3RbdGhpcy5fdGFyZ2V0S2V5XSA9IHZhbHVlO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkZpbmlzaCgpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMuX3NsaWRlci5nZXRWYWx1ZSgpO1xuICAgIHRoaXMuX29iamVjdFt0aGlzLl90YXJnZXRLZXldID0gdmFsdWU7XG4gICAgdGhpcy5faW5wdXQuc2V0VmFsdWUodmFsdWUpO1xufTtcblxuLy9UT0RPOkZJWCBNRVxuU2xpZGVyLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgb3JpZ2luID0gZS5kYXRhLm9yaWdpbjtcblxuICAgIGlmIChvcmlnaW4gPT0gdGhpcyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc2xpZGVyID0gdGhpcy5fc2xpZGVyO1xuXG4gICAgaWYgKCEob3JpZ2luIGluc3RhbmNlb2YgU2xpZGVyKSkge1xuICAgICAgICB2YXIgdmFsdWVzID0gdGhpcy5fdmFsdWVzO1xuXG4gICAgICAgIC8vVE9ETzogRklYIE1FIVxuICAgICAgICBpZiAob3JpZ2luIGluc3RhbmNlb2YgUmFuZ2UpIHtcbiAgICAgICAgICAgIHNsaWRlci5zZXRCb3VuZE1pbih2YWx1ZXNbMF0pO1xuICAgICAgICAgICAgc2xpZGVyLnNldEJvdW5kTWF4KHZhbHVlc1sxXSk7XG4gICAgICAgICAgICAvL3NsaWRlci5zZXRWYWx1ZSh0aGlzLl9vYmplY3RbdGhpcy5fdGFyZ2V0S2V5XSk7XG4gICAgICAgICAgICAvL3RoaXMuX3NsaWRlci51cGRhdGVJbnRlcnBvbGF0ZWRWYWx1ZSgpO1xuICAgICAgICAgICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzbGlkZXIuc2V0Qm91bmRNaW4odmFsdWVzWzBdKTtcbiAgICAgICAgICAgIHNsaWRlci5zZXRCb3VuZE1heCh2YWx1ZXNbMV0pO1xuICAgICAgICAgICAgc2xpZGVyLnNldFZhbHVlKHRoaXMuX29iamVjdFt0aGlzLl90YXJnZXRLZXldKTtcbiAgICAgICAgICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzbGlkZXIuc2V0VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX3RhcmdldEtleV0pO1xuICAgICAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICB9XG59O1xuXG5cblNsaWRlci5wcm90b3R5cGUuX3VwZGF0ZVZhbHVlRmllbGQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faW5wdXQuc2V0VmFsdWUodGhpcy5fc2xpZGVyLmdldFZhbHVlKCkpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5vblBhbmVsTW92ZUVuZCA9XG4gICAgU2xpZGVyLnByb3RvdHlwZS5vbkdyb3VwV2lkdGhDaGFuZ2UgPVxuICAgICAgICBTbGlkZXIucHJvdG90eXBlLm9uV2luZG93UmVzaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fc2xpZGVyLnJlc2V0T2Zmc2V0KCk7XG4gICAgICAgIH07XG5cbm1vZHVsZS5leHBvcnRzID0gU2xpZGVyOyIsInZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG5cbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcblxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XG5cbmZ1bmN0aW9uIFNsaWRlcl9JbnRlcm5hbChwYXJlbnROb2RlLG9uQmVnaW4sb25DaGFuZ2Usb25GaW5pc2gpIHtcbiAgICB0aGlzLl9ib3VuZHMgICA9IFswLDFdO1xuICAgIHRoaXMuX3ZhbHVlICAgID0gMDtcbiAgICB0aGlzLl9pbnRlcnBsICA9IDA7XG4gICAgdGhpcy5fZm9jdXMgICAgPSBmYWxzZTtcblxuXG4gICAgdGhpcy5fb25CZWdpbiAgICA9IG9uQmVnaW4gIHx8IGZ1bmN0aW9uKCl7fTtcbiAgICB0aGlzLl9vbkNoYW5nZSAgID0gb25DaGFuZ2UgfHwgZnVuY3Rpb24oKXt9O1xuICAgIHRoaXMuX29uRmluaXNoICAgPSBvbkZpbmlzaCB8fCBmdW5jdGlvbigpe307XG5cblxuICAgIHZhciB3cmFwTm9kZSA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuU2xpZGVyV3JhcCk7XG4gICAgcGFyZW50Tm9kZS5hZGRDaGlsZCh3cmFwTm9kZSk7XG5cbiAgICB2YXIgc2xvdCAgID0gdGhpcy5fc2xvdCAgID0ge25vZGU6ICAgIG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuU2xpZGVyU2xvdCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXRYOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6ICAgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6IDN9O1xuXG4gICAgdmFyIGhhbmRsZSA9IHRoaXMuX2hhbmRsZSA9IHtub2RlICAgIDogbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJIYW5kbGUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGggICA6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFnZ2luZzogZmFsc2V9O1xuXG4gICAgd3JhcE5vZGUuYWRkQ2hpbGQoc2xvdC5ub2RlKTtcbiAgICBzbG90Lm5vZGUuYWRkQ2hpbGQoaGFuZGxlLm5vZGUpO1xuXG4gICAgc2xvdC5vZmZzZXRYID0gc2xvdC5ub2RlLmdldFBvc2l0aW9uR2xvYmFsWCgpO1xuICAgIHNsb3Qud2lkdGggICA9IE1hdGguZmxvb3Ioc2xvdC5ub2RlLmdldFdpZHRoKCkgLSBzbG90LnBhZGRpbmcgKiAyKSA7XG5cbiAgICBoYW5kbGUubm9kZS5zZXRXaWR0aChoYW5kbGUud2lkdGgpO1xuXG4gICAgc2xvdC5ub2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sdGhpcy5fb25TbG90TW91c2VEb3duLmJpbmQodGhpcykpO1xuICAgIHNsb3Qubm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9VUCwgIHRoaXMuX29uU2xvdE1vdXNlVXAuYmluZCh0aGlzKSk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSx0aGlzLl9vbkRvY3VtZW50TW91c2VNb3ZlLmJpbmQodGhpcykpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9VUCwgIHRoaXMuX29uRG9jdW1lbnRNb3VzZVVwLmJpbmQodGhpcykpO1xufVxuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlID1cbntcbiAgICBfb25Eb2N1bWVudE1vdXNlTW92ZSA6IGZ1bmN0aW9uKGUpXG4gICAge1xuICAgICAgICBpZighdGhpcy5faGFuZGxlLmRyYWdnaW5nKXJldHVybjtcblxuICAgICAgICB0aGlzLl91cGRhdGUoKTtcbiAgICAgICAgdGhpcy5fb25DaGFuZ2UoKTtcbiAgICB9LFxuXG4gICAgX29uRG9jdW1lbnRNb3VzZVVwIDogZnVuY3Rpb24oZSlcbiAgICB7XG4gICAgICAgIGlmKHRoaXMuX2hhbmRsZS5kcmFnZ2luZyl0aGlzLl9vbkZpbmlzaCgpO1xuICAgICAgICB0aGlzLl9oYW5kbGUuZHJhZ2dpbmcgPSBmYWxzZTtcbiAgICB9LFxuXG4gICAgX29uU2xvdE1vdXNlRG93biA6IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIHRoaXMuX29uQmVnaW4oKTtcbiAgICAgICAgdGhpcy5fZm9jdXMgPSB0cnVlO1xuICAgICAgICB0aGlzLl9oYW5kbGUuZHJhZ2dpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLl9oYW5kbGUubm9kZS5nZXRFbGVtZW50KCkuZm9jdXMoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlKCk7XG4gICAgfSxcblxuICAgIF9vblNsb3RNb3VzZVVwIDogZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgaWYodGhpcy5fZm9jdXMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGUgPSB0aGlzLl9oYW5kbGU7XG4gICAgICAgICAgICBpZihoYW5kbGUuZHJhZ2dpbmcpdGhpcy5fb25GaW5pc2goKTtcbiAgICAgICAgICAgIGhhbmRsZS5kcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fZm9jdXMgPSBmYWxzZTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZSA6IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIHZhciBteCA9IE1vdXNlLmdldEluc3RhbmNlKCkuZ2V0WCgpLFxuICAgICAgICAgICAgc3ggPSB0aGlzLl9zbG90Lm9mZnNldFgsXG4gICAgICAgICAgICBzdyA9IHRoaXMuX3Nsb3Qud2lkdGgsXG4gICAgICAgICAgICBweCA9IChteCA8IHN4KSA/IDAgOiAobXggPiAoc3ggKyBzdykpID8gc3cgOiAobXggLSBzeCk7XG5cbiAgICAgICAgdGhpcy5faGFuZGxlLm5vZGUuc2V0V2lkdGgoTWF0aC5yb3VuZChweCkpO1xuICAgICAgICB0aGlzLl9pbnRycGwgPSBweCAvIHN3O1xuICAgICAgICB0aGlzLl9pbnRlcnBvbGF0ZVZhbHVlKCk7XG4gICAgfSxcblxuICAgIC8vRklYTUVcbiAgICBfdXBkYXRlSGFuZGxlIDogZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgdmFyIHNsb3RXaWR0aCAgID0gdGhpcy5fc2xvdC53aWR0aCxcbiAgICAgICAgICAgIGhhbmRsZVdpZHRoID0gTWF0aC5yb3VuZCh0aGlzLl9pbnRycGwgKiBzbG90V2lkdGgpO1xuXG4gICAgICAgIHRoaXMuX2hhbmRsZS5ub2RlLnNldFdpZHRoKE1hdGgubWluKGhhbmRsZVdpZHRoLHNsb3RXaWR0aCkpO1xuICAgIH0sXG5cbiAgICBfaW50ZXJwb2xhdGVWYWx1ZSA6IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIHZhciBpbnRycGwgPSB0aGlzLl9pbnRycGw7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdGhpcy5fYm91bmRzWzBdKigxLjAtaW50cnBsKSt0aGlzLl9ib3VuZHNbMV0qaW50cnBsO1xuICAgIH0sXG5cbiAgICByZXNldE9mZnNldCA6IGZ1bmN0aW9uKCl7dmFyIHNsb3QgPSB0aGlzLl9zbG90O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2xvdC5vZmZzZXRYID0gc2xvdC5ub2RlLmdldFBvc2l0aW9uR2xvYmFsWCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2xvdC53aWR0aCAgID0gTWF0aC5mbG9vcihzbG90Lm5vZGUuZ2V0V2lkdGgoKSAtIHNsb3QucGFkZGluZyAqIDIpfSxcblxuICAgIHNldEJvdW5kTWluIDogZnVuY3Rpb24odmFsdWUpXG4gICAge1xuICAgICAgICB2YXIgYm91bmRzID0gdGhpcy5fYm91bmRzO1xuICAgICAgICBpZih2YWx1ZSA+PSBib3VuZHNbMV0pcmV0dXJuO1xuXG4gICAgICAgIGJvdW5kc1swXSA9IHZhbHVlO1xuICAgICAgICB0aGlzLl9pbnRlcnBvbGF0ZVZhbHVlUmVsYXRpdmUoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlKCk7XG4gICAgfSxcblxuICAgIHNldEJvdW5kTWF4IDogZnVuY3Rpb24odmFsdWUpXG4gICAge1xuICAgICAgICB2YXIgYm91bmRzID0gdGhpcy5fYm91bmRzO1xuICAgICAgICBpZih2YWx1ZSA8PSBib3VuZHNbMF0pcmV0dXJuO1xuXG4gICAgICAgIGJvdW5kc1sxXSA9IHZhbHVlO1xuICAgICAgICB0aGlzLl9pbnRlcnBvbGF0ZVZhbHVlUmVsYXRpdmUoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlKCk7XG4gICAgfSxcblxuICAgIF9pbnRlcnBvbGF0ZVZhbHVlUmVsYXRpdmUgOiBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICB2YXIgYm91bmRzTWluICA9IHRoaXMuX2JvdW5kc1swXSxcbiAgICAgICAgICAgIGJvdW5kc01heCAgPSB0aGlzLl9ib3VuZHNbMV0sXG4gICAgICAgICAgICBwcmV2SW50cnBsID0gTWF0aC5hYnMoKHRoaXMuX3ZhbHVlIC0gYm91bmRzTWluKSAvIChib3VuZHNNaW4gLSBib3VuZHNNYXgpKTtcblxuICAgICAgICB0aGlzLl92YWx1ZSAgPSBib3VuZHNNaW4qKDEuMC1wcmV2SW50cnBsKSArIGJvdW5kc01heCpwcmV2SW50cnBsO1xuICAgICAgICB0aGlzLl9pbnRycGwgPSBNYXRoLmFicygodGhpcy5fdmFsdWUgLSBib3VuZHNNaW4pIC8gKGJvdW5kc01pbiAtIGJvdW5kc01heCkpO1xuICAgIH0sXG5cbiAgICBzZXRWYWx1ZSAgICA6IGZ1bmN0aW9uKHZhbHVlKVxuICAgIHtcbiAgICAgICAgdmFyIGJvdW5kc01pbiA9IHRoaXMuX2JvdW5kc1swXSxcbiAgICAgICAgICAgIGJvdW5kc01heCA9IHRoaXMuX2JvdW5kc1sxXTtcblxuICAgICAgICBpZih2YWx1ZSA8IGJvdW5kc01pbiB8fCB2YWx1ZSA+IGJvdW5kc01heClyZXR1cm47XG4gICAgICAgIHRoaXMuX2ludHJwbCA9IE1hdGguYWJzKCh2YWx1ZS1ib3VuZHNNaW4pIC8gKGJvdW5kc01pbiAtIGJvdW5kc01heCkpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGUoKTtcbiAgICAgICAgdGhpcy5fdmFsdWUgID0gdmFsdWU7XG4gICAgfSxcblxuXG4gICAgZ2V0VmFsdWUgOiBmdW5jdGlvbigpe3JldHVybiB0aGlzLl92YWx1ZTt9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gU2xpZGVyX0ludGVybmFsOyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE9wdGlvbnMgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcbnZhciBQcmVzZXRCdG4gPSByZXF1aXJlKCcuL1ByZXNldEJ0bicpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4uL2NvcmUvTWV0cmljJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSAgcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9QUkVTRVQgPSBudWxsO1xuXG5mdW5jdGlvbiBTdHJpbmdJbnB1dChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5vbkZpbmlzaCA9IHBhcmFtcy5vbkZpbmlzaCB8fCB0aGlzLl9vbkZpbmlzaDtcbiAgICBwYXJhbXMucHJlc2V0cyAgPSBwYXJhbXMucHJlc2V0cyAgfHwgREVGQVVMVF9QUkVTRVQ7XG5cbiAgICB0aGlzLl9vbkNoYW5nZSAgID0gcGFyYW1zLm9uQ2hhbmdlO1xuICAgIHRoaXMuX29uRmluaXNoICAgPSBwYXJhbXMub25GaW5pc2g7XG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfVEVYVCk7XG5cbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcblxuICAgIHZhciBwcmVzZXRzID0gcGFyYW1zLnByZXNldHM7XG4gICAgaWYgKCFwcmVzZXRzKSB7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGlucHV0KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBpbnB1dFdyYXAgPSBuZXcgTm9kZSgpO1xuICAgICAgICBpbnB1dFdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcElucHV0V1ByZXNldCk7XG5cbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQoaW5wdXRXcmFwKTtcbiAgICAgICAgaW5wdXRXcmFwLmFkZENoaWxkKGlucHV0KTtcblxuICAgICAgICB2YXIgb3B0aW9ucyA9IE9wdGlvbnMuZ2V0KCksXG4gICAgICAgICAgICBwcmVzZXRCdG4gPSBuZXcgUHJlc2V0QnRuKHRoaXMuX3dyYXBOb2RlKTtcblxuICAgICAgICB2YXIgb25QcmVzZXREZWFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgb3B0aW9ucy5jbGVhcigpO1xuICAgICAgICAgICAgcHJlc2V0QnRuLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBvblByZXNldEFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgb3B0aW9ucy5idWlsZChwcmVzZXRzLFxuICAgICAgICAgICAgICAgIGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpLFxuICAgICAgICAgICAgICAgIGlucHV0LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJywgcHJlc2V0c1tvcHRpb25zLmdldFNlbGVjdGVkSW5kZXgoKV0pO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5hcHBseVZhbHVlKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblByZXNldERlYWN0aXZhdGUsXG4gICAgICAgICAgICAgICAgTWV0cmljLlBBRERJTkdfUFJFU0VULFxuICAgICAgICAgICAgICAgIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgICAgICBwcmVzZXRCdG4uc2V0T25BY3RpdmUob25QcmVzZXRBY3RpdmF0ZSk7XG4gICAgICAgIHByZXNldEJ0bi5zZXRPbkRlYWN0aXZlKG9uUHJlc2V0RGVhY3RpdmF0ZSlcbiAgICB9XG5cbiAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLHRoaXMuX29iamVjdFt0aGlzLl9rZXldKTtcblxuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LktFWV9VUCwgdGhpcy5fb25JbnB1dEtleVVwLmJpbmQodGhpcykpO1xuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LkNIQU5HRSwgdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpKTtcblxuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uSW5wdXREcmFnU3RhcnQuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLHRoaXMuX3BhcmVudCwnb25Db21wb25lbnRTZWxlY3REcmFnJyk7XG59XG5cblN0cmluZ0lucHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5cblN0cmluZ0lucHV0LnByb3RvdHlwZS5fb25JbnB1dEtleVVwID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAodGhpcy5fa2V5SXNDaGFyKGUua2V5Q29kZSkpe1xuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICB9XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cblN0cmluZ0lucHV0LnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKHRoaXMuX2tleUlzQ2hhcihlLmtleUNvZGUpKXtcbiAgICAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgfVxuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX29uRmluaXNoKCk7XG59O1xuXG4vL1RPRE86IEZpbmlzaCBjaGVja1xuU3RyaW5nSW5wdXQucHJvdG90eXBlLl9rZXlJc0NoYXIgPSBmdW5jdGlvbiAoa2V5Q29kZSkge1xuICAgIHJldHVybiBrZXlDb2RlICE9IDE3ICYmXG4gICAgICAgIGtleUNvZGUgIT0gMTggJiZcbiAgICAgICAga2V5Q29kZSAhPSAyMCAmJlxuICAgICAgICBrZXlDb2RlICE9IDM3ICYmXG4gICAgICAgIGtleUNvZGUgIT0gMzggJiZcbiAgICAgICAga2V5Q29kZSAhPSAzOSAmJlxuICAgICAgICBrZXlDb2RlICE9IDQwICYmXG4gICAgICAgIGtleUNvZGUgIT0gMTY7XG59O1xuXG5cblN0cmluZ0lucHV0LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX29iamVjdFt0aGlzLl9rZXldID0gdGhpcy5faW5wdXQuZ2V0UHJvcGVydHkoJ3ZhbHVlJyk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xufTtcblxuU3RyaW5nSW5wdXQucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLmRhdGEub3JpZ2luID09IHRoaXMpcmV0dXJuO1xuICAgIHRoaXMuX2lucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX29iamVjdFt0aGlzLl9rZXldKTtcbn07XG5cbi8vUHJldmVudCBjaHJvbWUgc2VsZWN0IGRyYWdcblN0cmluZ0lucHV0LnByb3RvdHlwZS5fb25JbnB1dERyYWdTdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICBldmVudFVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBldmVudCA9IENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbkRyYWdGaW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuXG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnRmluaXNoLCBmYWxzZSk7XG4gICAgICAgIH07XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRmluaXNoLCBmYWxzZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmluZ0lucHV0OyIsInZhciBPdXRwdXQgPSByZXF1aXJlKCcuL091dHB1dCcpO1xuXG5TdHJpbmdPdXRwdXQgPSBmdW5jdGlvbiAocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICBPdXRwdXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cblN0cmluZ091dHB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE91dHB1dC5wcm90b3R5cGUpO1xuXG5TdHJpbmdPdXRwdXQucHJvdG90eXBlLl9zZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5fcGFyZW50LmlzRGlzYWJsZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0ZXh0QXJlYVN0cmluZyA9IHRoaXMuX29iamVjdFt0aGlzLl9rZXldO1xuXG4gICAgaWYgKHRleHRBcmVhU3RyaW5nID09IHRoaXMuX3ByZXZTdHJpbmcpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0ZXh0QXJlYSA9IHRoaXMuX3RleHRBcmVhLFxuICAgICAgICB0ZXh0QXJlYUVsZW1lbnQgPSB0ZXh0QXJlYS5nZXRFbGVtZW50KCksXG4gICAgICAgIHRleHRBcmVhU2Nyb2xsSGVpZ2h0O1xuXG4gICAgdGV4dEFyZWEuc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGV4dEFyZWFTdHJpbmcpO1xuICAgIHRleHRBcmVhU2Nyb2xsSGVpZ2h0ID0gdGV4dEFyZWFFbGVtZW50LnNjcm9sbEhlaWdodDtcbiAgICB0ZXh0QXJlYS5zZXRIZWlnaHQodGV4dEFyZWFTY3JvbGxIZWlnaHQpO1xuXG4gICAgdmFyIHNjcm9sbEJhciA9IHRoaXMuX3Njcm9sbEJhcjtcblxuICAgIGlmIChzY3JvbGxCYXIpIHtcbiAgICAgICAgaWYgKHRleHRBcmVhU2Nyb2xsSGVpZ2h0IDw9IHRoaXMuX3dyYXBOb2RlLmdldEhlaWdodCgpKSB7XG4gICAgICAgICAgICBzY3JvbGxCYXIuZGlzYWJsZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2Nyb2xsQmFyLmVuYWJsZSgpO1xuICAgICAgICAgICAgc2Nyb2xsQmFyLnVwZGF0ZSgpO1xuICAgICAgICAgICAgc2Nyb2xsQmFyLnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fcHJldlN0cmluZyA9IHRleHRBcmVhU3RyaW5nO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJpbmdPdXRwdXQ7XG4iLCJ2YXIgUGxvdHRlciA9IHJlcXVpcmUoJy4vUGxvdHRlcicpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4uL2NvcmUvTWV0cmljJyk7XG5cbnZhciBERUZBVUxUX1JFU09MVVRJT04gPSAxO1xuXG5mdW5jdGlvbiBWYWx1ZVBsb3R0ZXIocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcbiAgICBQbG90dGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHZhciBzdmcgICAgICAgPSB0aGlzLl9zdmcsXG4gICAgICAgIHN2Z1dpZHRoICA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgc3ZnSGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcblxuICAgIHBhcmFtcyAgICAgICAgICAgID0gcGFyYW1zICAgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLmhlaWdodCAgICAgPSBwYXJhbXMuaGVpZ2h0ICAgICB8fCBzdmdIZWlnaHQ7XG4gICAgcGFyYW1zLnJlc29sdXRpb24gPSBwYXJhbXMucmVzb2x1dGlvbiB8fCBERUZBVUxUX1JFU09MVVRJT047XG5cbiAgICB2YXIgcmVzb2x1dGlvbiA9IHBhcmFtcy5yZXNvbHV0aW9uLFxuICAgICAgICBsZW5ndGggICAgID0gTWF0aC5mbG9vcihzdmdXaWR0aCAvIHJlc29sdXRpb24pO1xuXG4gICAgdmFyIHBvaW50cyAgICAgPSB0aGlzLl9wb2ludHMgID0gbmV3IEFycmF5KGxlbmd0aCAqIDIpLFxuICAgICAgICBidWZmZXIwICAgID0gdGhpcy5fYnVmZmVyMCA9IG5ldyBBcnJheShsZW5ndGgpLFxuICAgICAgICBidWZmZXIxICAgID0gdGhpcy5fYnVmZmVyMSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXG4gICAgdmFyIG1pbiA9IHRoaXMuX2xpbmVXaWR0aCAqIDAuNTtcblxuICAgIHZhciBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IGxlbmd0aCkge1xuICAgICAgICBidWZmZXIwW2ldID0gYnVmZmVyMVtpXSA9IHBvaW50c1tpICogMl0gPSBwb2ludHNbaSAqIDIgKyAxXSA9IG1pbjtcbiAgICB9XG5cbiAgICB0aGlzLl9oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0ID0gcGFyYW1zLmhlaWdodCAgPCBNZXRyaWMuQ09NUE9ORU5UX01JTl9IRUlHSFQgP1xuICAgICAgICAgICAgICAgICAgIE1ldHJpYy5DT01QT05FTlRfTUlOX0hFSUdIVCA6IHBhcmFtcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl9zdmdTZXRTaXplKHN2Z0hlaWdodCxNYXRoLmZsb29yKHBhcmFtcy5oZWlnaHQpKTtcbiAgICB0aGlzLl9ncmlkLnN0eWxlLnN0cm9rZSA9ICdyZ2IoMzksNDQsNDYpJztcblxuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHRoaXMuX2RyYXdWYWx1ZSgpO1xufVxuXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQbG90dGVyLnByb3RvdHlwZSk7XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUuX3JlZHJhdyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcG9pbnRzID0gdGhpcy5fcG9pbnRzLFxuICAgICAgICBidWZmZXJMZW4gPSB0aGlzLl9idWZmZXIwLmxlbmd0aDtcblxuICAgIHZhciB3aWR0aCA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgcmF0aW8gPSB3aWR0aCAvIChidWZmZXJMZW4gLSAxKTtcblxuICAgIHZhciBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IGJ1ZmZlckxlbikge1xuICAgICAgICBwb2ludHNbaSAqIDJdID0gd2lkdGggLSBpICogcmF0aW87XG4gICAgfVxuXG4gICAgdGhpcy5fZHJhd1ZhbHVlKCk7XG59O1xuXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3aWR0aCA9IHRoaXMuX3dyYXBOb2RlLmdldFdpZHRoKCksXG4gICAgICAgIGhlaWdodCA9IHRoaXMuX2hlaWdodDtcblxuICAgIHRoaXMuX3N2Z1NldFNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG4gICAgdGhpcy5fZHJhd0dyaWQoKTtcbiAgICB0aGlzLl9yZWRyYXcoKTtcbn07XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUuX2RyYXdWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9kcmF3Q3VydmUoKTtcbn07XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUuX2RyYXdHcmlkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XG5cbiAgICB2YXIgc3ZnV2lkdGggPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIHN2Z0hlaWdodEhhbGYgPSBNYXRoLmZsb29yKE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSkgKiAwLjUpO1xuXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTW92ZVRvKDAsIHN2Z0hlaWdodEhhbGYpO1xuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lVG8oc3ZnV2lkdGgsIHN2Z0hlaWdodEhhbGYpO1xuXG4gICAgdGhpcy5fZ3JpZC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbn07XG5cbi8vVE9ETzogbWVyZ2UgdXBkYXRlICsgcGF0aGNtZFxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fZHJhd0N1cnZlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XG5cbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcblxuICAgIHZhciBidWZmZXIwID0gdGhpcy5fYnVmZmVyMCxcbiAgICAgICAgYnVmZmVyMSA9IHRoaXMuX2J1ZmZlcjEsXG4gICAgICAgIHBvaW50cyA9IHRoaXMuX3BvaW50cztcblxuICAgIHZhciBidWZmZXJMZW5ndGggPSBidWZmZXIwLmxlbmd0aDtcblxuICAgIHZhciBwYXRoQ21kID0gJyc7XG5cbiAgICB2YXIgaGVpZ2h0SGFsZiA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSkgKiAwLjUsXG4gICAgICAgIHVuaXQgPSBoZWlnaHRIYWxmIC0gdGhpcy5fbGluZVdpZHRoICogMC41O1xuXG4gICAgcG9pbnRzWzFdID0gYnVmZmVyMFswXTtcbiAgICBidWZmZXIwW2J1ZmZlckxlbmd0aCAtIDFdID0gKHZhbHVlICogdW5pdCkgKiAtMSArIE1hdGguZmxvb3IoaGVpZ2h0SGFsZik7XG5cbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRNb3ZlVG8ocG9pbnRzWzBdLCBwb2ludHNbMV0pO1xuXG4gICAgdmFyIGkgPSAwLCBpbmRleDtcblxuICAgIHdoaWxlICgrK2kgPCBidWZmZXJMZW5ndGgpIHtcbiAgICAgICAgaW5kZXggPSBpICogMjtcblxuICAgICAgICBidWZmZXIxW2kgLSAxXSA9IGJ1ZmZlcjBbaV07XG4gICAgICAgIHBvaW50c1tpbmRleCArIDFdID0gYnVmZmVyMFtpIC0gMV0gPSBidWZmZXIxW2kgLSAxXTtcblxuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lVG8ocG9pbnRzW2luZGV4XSwgcG9pbnRzW2luZGV4ICsgMV0pO1xuICAgIH1cblxuICAgIHRoaXMuX3BhdGguc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XG59O1xuXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5fcGFyZW50LmlzRGlzYWJsZWQoKSlyZXR1cm47XG4gICAgdGhpcy5fZHJhd1ZhbHVlKCk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBWYWx1ZVBsb3R0ZXI7XG5cbiIsInZhciBOb2RlID0gcmVxdWlyZSgnLi9kb2N1bWVudC9Ob2RlJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi9kb2N1bWVudC9DU1MnKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuICAgIEdyb3VwRXZlbnQgPSByZXF1aXJlKCcuLi9ncm91cC9Hcm91cEV2ZW50Jyk7XG52YXIgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuL0NvbXBvbmVudEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIENvbXBvbmVudChwYXJlbnQsbGFiZWwpIHtcbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgbGFiZWwgPSBwYXJlbnQudXNlc0xhYmVscygpID8gbGFiZWwgOiAnbm9uZSc7XG5cbiAgICB0aGlzLl9wYXJlbnQgICA9IHBhcmVudDtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gZmFsc2U7XG5cbiAgICB2YXIgcm9vdE5vZGUgPSB0aGlzLl9ub2RlID0gbmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pLFxuICAgICAgICB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlID0gbmV3IE5vZGUoKTtcblxuICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQod3JhcE5vZGUpO1xuXG5cbiAgICBpZiAobGFiZWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAobGFiZWwubGVuZ3RoICE9IDAgJiYgbGFiZWwgIT0gJ25vbmUnKSB7XG4gICAgICAgICAgICB2YXIgbGFibE5vZGUgPSB0aGlzLl9sYWJsTm9kZSA9IG5ldyBOb2RlKE5vZGUuU1BBTik7XG4gICAgICAgICAgICAgICAgbGFibE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpO1xuICAgICAgICAgICAgICAgIGxhYmxOb2RlLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCBsYWJlbCk7XG4gICAgICAgICAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQobGFibE5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxhYmVsID09ICdub25lJykge1xuICAgICAgICAgICAgd3JhcE5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnbWFyZ2luTGVmdCcsICcwJyk7XG4gICAgICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZVByb3BlcnR5KCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5FTkFCTEUsIHRoaXMsJ29uRW5hYmxlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuRElTQUJMRSx0aGlzLCdvbkRpc2FibGUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkQ29tcG9uZW50Tm9kZShyb290Tm9kZSk7XG59XG5cbkNvbXBvbmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuXG5Db21wb25lbnQucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gZmFsc2U7XG59O1xuQ29tcG9uZW50LnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSB0cnVlO1xufTtcblxuQ29tcG9uZW50LnByb3RvdHlwZS5pc0VuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICF0aGlzLl9pc0Rpc2FibGVkO1xufTtcbkNvbXBvbmVudC5wcm90b3R5cGUuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faXNEaXNhYmxlZFxufTtcblxuQ29tcG9uZW50LnByb3RvdHlwZS5vbkVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVuYWJsZSgpO1xufTtcbkNvbXBvbmVudC5wcm90b3R5cGUub25EaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzYWJsZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIENvbXBvbmVudEV2ZW50ID0ge1xuXHRWQUxVRV9VUERBVEVEOiAndmFsdWVVcGRhdGVkJyxcblx0VVBEQVRFX1ZBTFVFOiAndXBkYXRlVmFsdWUnLFxuXG5cdElOUFVUX1NFTEVDVF9EUkFHOiAnaW5wdXRTZWxlY3REcmFnJyxcblxuXHRFTkFCTEUgIDogJ2VuYWJsZScsXG5cdERJU0FCTEUgOiAnZGlzYWJsZSdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RXZlbnQ7IiwiZnVuY3Rpb24gQ29tcG9uZW50T2JqZWN0RXJyb3Iob2JqZWN0LGtleSkge1xuXHRFcnJvci5hcHBseSh0aGlzKTtcblx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcyxDb21wb25lbnRPYmplY3RFcnJvcik7XG5cdHRoaXMubmFtZSA9ICdDb21wb25lbnRPYmplY3RFcnJvcic7XG5cdHRoaXMubWVzc2FnZSA9ICdPYmplY3Qgb2YgdHlwZSAnICsgb2JqZWN0LmNvbnN0cnVjdG9yLm5hbWUgKyAnIGhhcyBubyBtZW1iZXIgJyArIGtleSArICcuJztcbn1cbkNvbXBvbmVudE9iamVjdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkNvbXBvbmVudE9iamVjdEVycm9yLmNvbnN0cnVjdG9yID0gQ29tcG9uZW50T2JqZWN0RXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50T2JqZWN0RXJyb3I7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG4gICAgRXZlbnRfID0gcmVxdWlyZSgnLi9ldmVudC9FdmVudCcpLFxuICAgIEhpc3RvcnlFdmVudCA9IHJlcXVpcmUoJy4vSGlzdG9yeUV2ZW50Jyk7XG5cbnZhciBNQVhfU1RBVEVTID0gMzA7XG5cbmZ1bmN0aW9uIEhpc3RvcnkoKSB7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdGhpcy5fc3RhdGVzID0gW107XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xufVxuXG5IaXN0b3J5LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5cbkhpc3RvcnkucHJvdG90eXBlLnB1c2hTdGF0ZSA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSwgdmFsdWUpIHtcbiAgICBpZiAodGhpcy5faXNEaXNhYmxlZCl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgIGlmIChzdGF0ZXMubGVuZ3RoID49IE1BWF9TVEFURVMpe1xuICAgICAgICBzdGF0ZXMuc2hpZnQoKTtcbiAgICB9XG4gICAgc3RhdGVzLnB1c2goe29iamVjdDogb2JqZWN0LCBrZXk6IGtleSwgdmFsdWU6IHZhbHVlfSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgSGlzdG9yeUV2ZW50LlNUQVRFX1BVU0gsIG51bGwpKTtcbn07XG5cbkhpc3RvcnkucHJvdG90eXBlLmdldFN0YXRlID0gZnVuY3Rpb24gKG9iamVjdCwga2V5KSB7XG4gICAgdmFyIHN0YXRlcyA9IHRoaXMuX3N0YXRlcyxcbiAgICAgICAgc3RhdGVzTGVuID0gc3RhdGVzLmxlbmd0aDtcblxuICAgIGlmIChzdGF0ZXNMZW4gPT0gMCl7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHZhciBzdGF0ZSwgdmFsdWU7XG4gICAgdmFyIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgc3RhdGVzTGVuKSB7XG4gICAgICAgIHN0YXRlID0gc3RhdGVzW2ldO1xuICAgICAgICBpZiAoc3RhdGUub2JqZWN0ID09PSBvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5rZXkgPT09IGtleSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhdGUudmFsdWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuSGlzdG9yeS5wcm90b3R5cGUucG9wU3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX2lzRGlzYWJsZWQpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICBpZiAoc3RhdGVzLmxlbmd0aCA8IDEpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGxhc3RTdGF0ZSA9IHN0YXRlcy5wb3AoKTtcbiAgICBsYXN0U3RhdGUub2JqZWN0W2xhc3RTdGF0ZS5rZXldID0gbGFzdFN0YXRlLnZhbHVlO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgSGlzdG9yeUV2ZW50LlNUQVRFX1BPUCwgbnVsbCkpO1xufTtcblxuSGlzdG9yeS5wcm90b3R5cGUuZ2V0TnVtU3RhdGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZXMubGVuZ3RoO1xufTtcblxuSGlzdG9yeS5faW5zdGFuY2UgPSBudWxsO1xuXG5IaXN0b3J5LnNldHVwID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBIaXN0b3J5Ll9pbnN0YW5jZSA9IG5ldyBIaXN0b3J5KCk7XG59O1xuXG5IaXN0b3J5LmdldEluc3RhbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBIaXN0b3J5Ll9pbnN0YW5jZTtcbn07XG5cbkhpc3RvcnkucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gZmFsc2U7XG59O1xuSGlzdG9yeS5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gdHJ1ZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSGlzdG9yeTsiLCJ2YXIgSGlzdG9yeUV2ZW50ID0ge1xuXHRTVEFURV9QVVNIOiAnaGlzdG9yeVN0YXRlUHVzaCcsXG5cdFNUQVRFX1BPUDogJ2hpc3RvcnlTdGF0ZVBvcCdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSGlzdG9yeUV2ZW50OyIsInZhciBNZXRyaWMgPSB7XG5cdENPTVBPTkVOVF9NSU5fSEVJR0hUOiAyNSxcblx0U1RST0tFX1NJWkU6IDEsXG5cdFBBRERJTkdfV1JBUFBFUjogMTIsXG5cdFBBRERJTkdfT1BUSU9OUzogMixcblx0UEFERElOR19QUkVTRVQ6IDIwLFxuXG5cdFNDUk9MTEJBUl9UUkFDS19QQURESU5HOiAyLFxuXHRGVU5DVElPTl9QTE9UVEVSX0xBQkVMX1RJQ0tfU0laRTogNlxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXRyaWM7IiwidmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50Jyk7XG52YXIgSGlzdG9yeSA9IHJlcXVpcmUoJy4vSGlzdG9yeScpO1xudmFyIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi9Db21wb25lbnRFdmVudCcpO1xudmFyIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi9PYmplY3RDb21wb25lbnROb3RpZmllcicpO1xudmFyIENvbXBvbmVudE9iamVjdEVycm9yID0gcmVxdWlyZSgnLi9Db21wb25lbnRPYmplY3RFcnJvcicpO1xuXG5cbmZ1bmN0aW9uIE9iamVjdENvbXBvbmVudChwYXJlbnQsb2JqZWN0LGtleSxwYXJhbXMpIHtcbiAgICBpZihvYmplY3Rba2V5XSA9PT0gdW5kZWZpbmVkKXtcbiAgICAgICAgdGhyb3cgbmV3IENvbXBvbmVudE9iamVjdEVycm9yKG9iamVjdCxrZXkpO1xuICAgIH1cblxuICAgIHBhcmFtcyAgICAgICA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMubGFiZWwgPSBwYXJhbXMubGFiZWwgfHwga2V5O1xuXG4gICAgQ29tcG9uZW50LmFwcGx5KHRoaXMsW3BhcmVudCxwYXJhbXMubGFiZWxdKTtcblxuICAgIHRoaXMuX29iamVjdCAgID0gb2JqZWN0O1xuICAgIHRoaXMuX2tleSAgICAgID0ga2V5O1xuXG4gICAgdGhpcy5fb25DaGFuZ2UgPSBmdW5jdGlvbigpe307XG4gICAgdGhpcy5fb25GaW5pc2ggPSBmdW5jdGlvbigpe307XG5cbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKS5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwgdGhpcywnb25WYWx1ZVVwZGF0ZScpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKSwgJ29uVmFsdWVVcGRhdGVkJyk7XG59XG5cbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG4vL092ZXJyaWRlIGluIFN1YmNsYXNzXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbigpIHt9O1xuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24oZSkge307XG5cbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUucHVzaEhpc3RvcnlTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvYmogPSB0aGlzLl9vYmplY3QsIGtleSA9IHRoaXMuX2tleTtcbiAgICBIaXN0b3J5LmdldEluc3RhbmNlKCkucHVzaFN0YXRlKG9iaiwga2V5LCBvYmpba2V5XSk7XG59O1xuXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSA9IHZhbHVlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RDb21wb25lbnQ7XG4iLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcblx0RXZlbnRfIFx0XHRcdD0gcmVxdWlyZSgnLi9ldmVudC9FdmVudCcpO1xudmFyIENvbXBvbmVudEV2ZW50ICA9IHJlcXVpcmUoJy4vQ29tcG9uZW50RXZlbnQnKSxcblx0T3B0aW9uRXZlbnRcdFx0PSByZXF1aXJlKCcuL09wdGlvbkV2ZW50Jyk7XG5cbmZ1bmN0aW9uIE9iamVjdENvbXBvbmVudE5vdGlmaWVyKCl7XG5cdEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzKTtcbn1cbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5cbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlZCA9IGZ1bmN0aW9uIChlKSB7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwge29yaWdpbjogZS5zZW5kZXJ9KSk7XG59O1xuXG5PYmplY3RDb21wb25lbnROb3RpZmllci5wcm90b3R5cGUub25PcHRpb25UcmlnZ2VyZWQgPSBmdW5jdGlvbihlKSB7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE9wdGlvbkV2ZW50LlRSSUdHRVIsIHtvcmlnaW46IGUuc2VuZGVyfSkpO1xufTtcblxudmFyIGluc3RhbmNlID0gbnVsbDtcblxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0ID0gZnVuY3Rpb24oKXtcblx0aWYoIWluc3RhbmNlKXtcblx0XHRpbnN0YW5jZSA9IG5ldyBPYmplY3RDb21wb25lbnROb3RpZmllcigpO1xuXHR9XG5cdHJldHVybiBpbnN0YW5jZTtcbn07XG5cbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLmRlc3Ryb3kgPSBmdW5jdGlvbigpe1xuXHRpbnN0YW5jZSA9IG51bGw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdENvbXBvbmVudE5vdGlmaWVyOyIsInZhciBPcHRpb25FdmVudCA9IHtcblx0VFJJR0dFUkVEOiAnc2VsZWN0VHJpZ2dlcicsXG5cdFRSSUdHRVI6ICd0cmlnZ2VyU2VsZWN0J1xufTtcbm1vZHVsZS5leHBvcnRzID0gT3B0aW9uRXZlbnQ7IiwidmFyIFByZXNldCA9XG57XG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLy9ISVNUT1JZX01BWF9TVEFURVMgOiAzMCxcbiAgICBOVU1CRVJfSU5QVVRfU0hJRlRfTVVMVElQTElFUiA6IDEwLFxuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfVU5JVF9YICAgIDogIDEsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfVU5JVF9ZICAgIDogIDEsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9VTklUX1ggICAgOiAgMC4yNSxcbiAgICBGVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1VOSVRfWSAgICA6ICAwLjI1LFxuICAgIEZVTkNUSU9OX1BMT1RURVJfVU5JVF9NSU4gIDogMC4xNSxcbiAgICBGVU5DVElPTl9QTE9UVEVSX1VOSVRfTUFYICA6IDQsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfU0NBTEUgICAgIDogMTAuMCxcbiAgICBGVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1NDQUxFICAgICA6MS4wLFxuICAgIEZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUlOIDogMC4wMixcbiAgICBGVU5DVElPTl9QTE9UVEVSX1NDQUxFX01BWCA6IDI1LFxuXG4gICAgRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9BWEVTX0NPTE9SIDogJ3JnYmEoMjU1LDI1NSwyNTUsMC43NSknLFxuICAgIEZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfR1JJRF9DT0xPUiA6ICdyZ2JhKDI1LDI1LDI1LDAuNzUpJyxcblxuICAgIEZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX0FYRVNfQ09MT1IgOiAncmdiKDU0LDYwLDY0KScsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfR1JJRF9DT0xPUiA6ICdyZ2IoMjUsMjUsMjUpJyxcblxuICAgIEZVTkNUSU9OX1BMT1RURVJfQ0lSQ0xFX0xBQkVMX1JBRElVUyA6IDMsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9DSVJDTEVfTEFCRUxfRklMTCAgIDogJ3JnYigyNTUsMjU1LDI1NSknLFxuICAgIEZVTkNUSU9OX1BMT1RURVJfQ0lSQ0xFX1NUUk9LRSAgICAgICA6ICcjYjEyMzM0J1xuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByZXNldDsiLCJmdW5jdGlvbiBDb2xvckZvcm1hdEVycm9yKG1zZykge1xuXHRFcnJvci5hcHBseSh0aGlzKTtcblx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcyxDb2xvckZvcm1hdEVycm9yKTtcblx0dGhpcy5uYW1lID0gJ0NvbG9yRm9ybWF0RXJyb3InO1xuXHR0aGlzLm1lc3NhZ2UgPSBtc2c7XG59XG5Db2xvckZvcm1hdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkNvbG9yRm9ybWF0RXJyb3IuY29uc3RydWN0b3IgPSBDb2xvckZvcm1hdEVycm9yO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9yRm9ybWF0RXJyb3I7IiwidmFyIENvbG9yTW9kZSA9IHtcblx0UkdCOiAncmdiJyxcblx0SFNWOiAnaHN2Jyxcblx0SEVYOiAnaGV4Jyxcblx0UkdCZnY6ICdyZ2Jmdidcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sb3JNb2RlOyIsInZhciBDb2xvclV0aWwgPSB7XG5cdEhTVjJSR0I6IGZ1bmN0aW9uIChodWUsIHNhdCwgdmFsKSB7XG5cdFx0dmFyIG1heF9odWUgPSAzNjAuMCxcblx0XHRcdG1heF9zYXQgPSAxMDAuMCxcblx0XHRcdG1heF92YWwgPSAxMDAuMDtcblxuXHRcdHZhciBtaW5faHVlID0gMC4wLFxuXHRcdFx0bWluX3NhdCA9IDAsXG5cdFx0XHRtaW5fdmFsID0gMDtcblxuXHRcdGh1ZSA9IGh1ZSAlIG1heF9odWU7XG5cdFx0dmFsID0gTWF0aC5tYXgobWluX3ZhbCwgTWF0aC5taW4odmFsLCBtYXhfdmFsKSkgLyBtYXhfdmFsICogMjU1LjA7XG5cblx0XHRpZiAoc2F0IDw9IG1pbl9zYXQpIHtcblx0XHRcdHZhbCA9IE1hdGgucm91bmQodmFsKTtcblx0XHRcdHJldHVybiBbdmFsLCB2YWwsIHZhbF07XG5cdFx0fVxuXHRcdGVsc2UgaWYgKHNhdCA+IG1heF9zYXQpc2F0ID0gbWF4X3NhdDtcblxuXHRcdHNhdCA9IHNhdCAvIG1heF9zYXQ7XG5cblx0XHQvL2h0dHA6Ly9kLmhhdGVuYS5uZS5qcC9qYTkvMjAxMDA5MDMvMTI4MzUwNDM0XG5cblx0XHR2YXIgaGkgPSBNYXRoLmZsb29yKGh1ZSAvIDYwLjApICUgNixcblx0XHRcdGYgPSAoaHVlIC8gNjAuMCkgLSBoaSxcblx0XHRcdHAgPSB2YWwgKiAoMSAtIHNhdCksXG5cdFx0XHRxID0gdmFsICogKDEgLSBmICogc2F0KSxcblx0XHRcdHQgPSB2YWwgKiAoMSAtICgxIC0gZikgKiBzYXQpO1xuXG5cdFx0dmFyIHIgPSAwLFxuXHRcdFx0ZyA9IDAsXG5cdFx0XHRiID0gMDtcblxuXHRcdHN3aXRjaCAoaGkpIHtcblx0XHRcdGNhc2UgMDpcblx0XHRcdFx0ciA9IHZhbDtcblx0XHRcdFx0ZyA9IHQ7XG5cdFx0XHRcdGIgPSBwO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0ciA9IHE7XG5cdFx0XHRcdGcgPSB2YWw7XG5cdFx0XHRcdGIgPSBwO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgMjpcblx0XHRcdFx0ciA9IHA7XG5cdFx0XHRcdGcgPSB2YWw7XG5cdFx0XHRcdGIgPSB0O1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgMzpcblx0XHRcdFx0ciA9IHA7XG5cdFx0XHRcdGcgPSBxO1xuXHRcdFx0XHRiID0gdmFsO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgNDpcblx0XHRcdFx0ciA9IHQ7XG5cdFx0XHRcdGcgPSBwO1xuXHRcdFx0XHRiID0gdmFsO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgNTpcblx0XHRcdFx0ciA9IHZhbDtcblx0XHRcdFx0ZyA9IHA7XG5cdFx0XHRcdGIgPSBxO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHIgPSBNYXRoLnJvdW5kKHIpO1xuXHRcdGcgPSBNYXRoLnJvdW5kKGcpO1xuXHRcdGIgPSBNYXRoLnJvdW5kKGIpO1xuXG5cdFx0cmV0dXJuIFtyLCBnLCBiXTtcblxuXHR9LFxuXG5cdFJHQjJIU1Y6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG5cdFx0dmFyIGggPSAwLFxuXHRcdFx0cyA9IDAsXG5cdFx0XHR2ID0gMDtcblxuXHRcdHIgPSByIC8gMjU1LjA7XG5cdFx0ZyA9IGcgLyAyNTUuMDtcblx0XHRiID0gYiAvIDI1NS4wO1xuXG5cdFx0dmFyIG1pblJHQiA9IE1hdGgubWluKHIsIE1hdGgubWluKGcsIGIpKSxcblx0XHRcdG1heFJHQiA9IE1hdGgubWF4KHIsIE1hdGgubWF4KGcsIGIpKTtcblxuXHRcdGlmIChtaW5SR0IgPT0gbWF4UkdCKSB7XG5cdFx0XHR2ID0gbWluUkdCO1xuXHRcdFx0cmV0dXJuIFswLCAwLCBNYXRoLnJvdW5kKHYpXTtcblx0XHR9XG5cblx0XHR2YXIgZGQgPSAociA9PSBtaW5SR0IpID8gZyAtIGIgOiAoKGIgPT0gbWluUkdCKSA/IHIgLSBnIDogYiAtIHIpLFxuXHRcdFx0aGggPSAociA9PSBtaW5SR0IpID8gMyA6ICgoYiA9PSBtaW5SR0IpID8gMSA6IDUpO1xuXG5cdFx0aCA9IE1hdGgucm91bmQoNjAgKiAoaGggLSBkZCAvIChtYXhSR0IgLSBtaW5SR0IpKSk7XG5cdFx0cyA9IE1hdGgucm91bmQoKG1heFJHQiAtIG1pblJHQikgLyBtYXhSR0IgKiAxMDAuMCk7XG5cdFx0diA9IE1hdGgucm91bmQobWF4UkdCICogMTAwLjApO1xuXG5cdFx0cmV0dXJuIFtoLCBzLCB2XTtcblx0fSxcblxuXHRSR0IySEVYOiBmdW5jdGlvbiAociwgZywgYikge1xuXHRcdHJldHVybiBcIiNcIiArICgoMSA8PCAyNCkgKyAociA8PCAxNikgKyAoZyA8PCA4KSArIGIpLnRvU3RyaW5nKDE2KS5zbGljZSgxKTtcblx0fSxcblxuXHRSR0JmdjJIRVg6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG5cdFx0cmV0dXJuIENvbG9yVXRpbC5SR0IySEVYKE1hdGguZmxvb3IociAqIDI1NS4wKSxcblx0XHRcdE1hdGguZmxvb3IoZyAqIDI1NS4wKSxcblx0XHRcdE1hdGguZmxvb3IoYiAqIDI1NS4wKSk7XG5cdH0sXG5cblx0SFNWMkhFWDogZnVuY3Rpb24gKGgsIHMsIHYpIHtcblx0XHR2YXIgcmdiID0gQ29udHJvbEtpdC5Db2xvclV0aWwuSFNWMlJHQihoLCBzLCB2KTtcblx0XHRyZXR1cm4gQ29udHJvbEtpdC5Db2xvclV0aWwuUkdCMkhFWChyZ2JbMF0sIHJnYlsxXSwgcmdiWzJdKTtcblx0fSxcblxuXHRIRVgyUkdCOiBmdW5jdGlvbiAoaGV4KSB7XG5cdFx0dmFyIHNob3J0aGFuZFJlZ2V4ID0gL14jPyhbYS1mXFxkXSkoW2EtZlxcZF0pKFthLWZcXGRdKSQvaTtcblx0XHRoZXggPSBoZXgucmVwbGFjZShzaG9ydGhhbmRSZWdleCwgZnVuY3Rpb24gKG0sIHIsIGcsIGIpIHtcblx0XHRcdHJldHVybiByICsgciArIGcgKyBnICsgYiArIGI7XG5cdFx0fSk7XG5cblx0XHR2YXIgcmVzdWx0ID0gL14jPyhbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KSQvaS5leGVjKGhleCk7XG5cdFx0cmV0dXJuIHJlc3VsdCA/IFtwYXJzZUludChyZXN1bHRbMV0sIDE2KSwgcGFyc2VJbnQocmVzdWx0WzJdLCAxNiksIHBhcnNlSW50KHJlc3VsdFszXSwgMTYpXSA6IG51bGw7XG5cblx0fSxcblxuXHRpc1ZhbGlkSEVYOiBmdW5jdGlvbiAoaGV4KSB7XG5cdFx0cmV0dXJuIC9eI1swLTlBLUZdezZ9JC9pLnRlc3QoaGV4KTtcblx0fSxcblxuXHRpc1ZhbGlkUkdCOiBmdW5jdGlvbiAociwgZywgYikge1xuXHRcdHJldHVybiByID49IDAgJiYgciA8PSAyNTUgJiZcblx0XHRcdGcgPj0gMCAmJiBnIDw9IDI1NSAmJlxuXHRcdFx0YiA+PSAwICYmIGIgPD0gMjU1O1xuXHR9LFxuXG5cdGlzVmFsaWRSR0JmdjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcblx0XHRyZXR1cm4gciA+PSAwICYmIHIgPD0gMS4wICYmXG5cdFx0XHRnID49IDAgJiYgZyA8PSAxLjAgJiZcblx0XHRcdGIgPj0gMCAmJiBiIDw9IDEuMDtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvclV0aWw7IiwidmFyIENTUyA9IHtcbiAgICBDb250cm9sS2l0ICAgOiAnY29udHJvbEtpdCcsXG5cbiAgICBQYW5lbCAgICAgICAgOiAncGFuZWwnLFxuICAgIEhlYWQgICAgICAgICA6ICdoZWFkJyxcbiAgICBMYWJlbCAgICAgICAgOiAnbGFiZWwnLFxuICAgIE1lbnUgICAgICAgICA6ICdtZW51JyxcbiAgICBXcmFwICAgICAgICAgOiAnd3JhcCcsXG5cbiAgICBNZW51QnRuQ2xvc2UgOiAnYnRuQ2xvc2UnLFxuICAgIE1lbnVCdG5IaWRlICA6ICdidG5IaWRlJyxcbiAgICBNZW51QnRuU2hvdyAgOiAnYnRuU2hvdycsXG4gICAgTWVudUJ0blVuZG8gIDogJ2J0blVuZG8nLFxuXG4gICAgV3JhcElucHV0V1ByZXNldCA6ICdpbnB1dFdQcmVzZXRXcmFwJyxcbiAgICBXcmFwQ29sb3JXUHJlc2V0IDogJ2NvbG9yV1ByZXNldFdyYXAnLFxuXG4gICAgSGVhZEluYWN0aXZlIDogJ2hlYWRJbmFjdGl2ZScsXG4gICAgUGFuZWxIZWFkSW5hY3RpdmUgOiAncGFuZWxIZWFkSW5hY3RpdmUnLFxuXG4gICAgR3JvdXBMaXN0IDogJ2dyb3VwTGlzdCcsXG4gICAgR3JvdXAgICAgIDogJ2dyb3VwJyxcbiAgICBTdWJHcm91cExpc3QgIDogJ3N1Ykdyb3VwTGlzdCcsXG4gICAgU3ViR3JvdXAgICAgICA6ICdzdWJHcm91cCcsXG5cblxuICAgIFRleHRBcmVhV3JhcCA6ICd0ZXh0QXJlYVdyYXAnLFxuXG4gICAgSWNvbkFycm93VXBCaWcgOiAnaWNvbkFycm93VXBCaWcnLFxuXG4gICAgQnV0dG9uICAgICAgIDogJ2J1dHRvbicsXG5cbiAgICBXcmFwU2xpZGVyICAgOiAnd3JhcFNsaWRlcicsXG5cbiAgICBTbGlkZXJXcmFwICAgOiAnc2xpZGVyV3JhcCcsXG4gICAgU2xpZGVyU2xvdCAgIDogJ3NsaWRlclNsb3QnLFxuICAgIFNsaWRlckhhbmRsZSA6ICdzbGlkZXJIYW5kbGUnLFxuXG4gICAgQXJyb3dCTWluICAgIDogJ2Fycm93Qk1pbicsXG4gICAgQXJyb3dCTWF4ICAgIDogJ2Fycm93Qk1heCcsXG4gICAgQXJyb3dCU3ViTWluIDogJ2Fycm93QlN1Yk1pbicsXG4gICAgQXJyb3dCU3ViTWF4IDogJ2Fycm93QlN1Yk1heCcsXG4gICAgQXJyb3dTTWluICAgIDogJ2Fycm93U01pbicsXG4gICAgQXJyb3dTTWF4ICAgIDogJ2Fycm93U01heCcsXG5cbiAgICBTZWxlY3QgICAgICAgOiAnc2VsZWN0JyxcbiAgICBTZWxlY3RBY3RpdmUgOiAnc2VsZWN0QWN0aXZlJyxcblxuICAgIE9wdGlvbnMgICAgICAgICA6ICdvcHRpb25zJyxcbiAgICBPcHRpb25zU2VsZWN0ZWQgOiAnbGlTZWxlY3RlZCcsXG5cbiAgICBTZWxlY3RDb2xvciA6ICdzZWxlY3RDb2xvcicsXG5cbiAgICBQcmVzZXRCdG4gICAgICAgIDogJ3ByZXNldEJ0bicsXG4gICAgUHJlc2V0QnRuQWN0aXZlICA6ICdwcmVzZXRCdG5BY3RpdmUnLFxuXG4gICAgQ2FudmFzTGlzdEl0ZW0gIDogJ2NhbnZhc0xpc3RJdGVtJyxcbiAgICBDYW52YXNXcmFwICAgICAgOiAnY2FudmFzV3JhcCcsXG5cbiAgICBTVkdMaXN0SXRlbSAgICAgOiAnc3ZnTGlzdEl0ZW0nLFxuICAgIFNWR1dyYXAgICAgICAgICA6ICdzdmdXcmFwJyxcblxuICAgIEdyYXBoU2xpZGVyWFdyYXAgICA6ICdncmFwaFNsaWRlclhXcmFwJyxcbiAgICBHcmFwaFNsaWRlcllXcmFwICAgOiAnZ3JhcGhTbGlkZXJZV3JhcCcsXG4gICAgR3JhcGhTbGlkZXJYICAgICAgIDogJ2dyYXBoU2xpZGVyWCcsXG4gICAgR3JhcGhTbGlkZXJZICAgICAgIDogJ2dyYXBoU2xpZGVyWScsXG4gICAgR3JhcGhTbGlkZXJYSGFuZGxlIDogJ2dyYXBoU2xpZGVyWEhhbmRsZScsXG4gICAgR3JhcGhTbGlkZXJZSGFuZGxlIDogJ2dyYXBoU2xpZGVyWUhhbmRsZScsXG5cbiAgICBQaWNrZXIgICAgICAgICAgICAgIDogJ3BpY2tlcicsXG4gICAgUGlja2VyUGFsbGV0ZVdyYXAgICA6ICdwYWxsZXRlV3JhcCcsXG4gICAgUGlja2VyRmllbGRXcmFwICAgICA6ICdmaWVsZFdyYXAnLFxuICAgIFBpY2tlcklucHV0V3JhcCAgICAgOiAnaW5wdXRXcmFwJyxcbiAgICBQaWNrZXJJbnB1dEZpZWxkICAgIDogJ2lucHV0RmllbGQnLFxuICAgIFBpY2tlckNvbnRyb2xzV3JhcCAgOiAnY29udHJvbHNXcmFwJyxcbiAgICBQaWNrZXJDb2xvckNvbnRyYXN0IDogJ2NvbG9yQ29udHJhc3QnLFxuXG4gICAgUGlja2VySGFuZGxlRmllbGQgIDogJ2luZGljYXRvcicsXG4gICAgUGlja2VySGFuZGxlU2xpZGVyIDogJ2luZGljYXRvcicsXG5cbiAgICBDb2xvciA6ICdjb2xvcicsXG5cbiAgICBTY3JvbGxCYXIgICAgICAgIDogJ3Njcm9sbEJhcicsXG4gICAgU2Nyb2xsV3JhcCAgICAgICA6ICdzY3JvbGxXcmFwJyxcbiAgICBTY3JvbGxCYXJCdG5VcCAgIDogJ2J0blVwJyxcbiAgICBTY3JvbGxCYXJCdG5Eb3duIDogJ2J0bkRvd24nLFxuICAgIFNjcm9sbEJhclRyYWNrICAgOiAndHJhY2snLFxuICAgIFNjcm9sbEJhclRodW1iICAgOiAndGh1bWInLFxuICAgIFNjcm9sbEJ1ZmZlciAgICAgOiAnc2Nyb2xsQnVmZmVyJyxcblxuICAgIFRyaWdnZXIgOiAnY29udHJvbEtpdFRyaWdnZXInLFxuXG4gICAgU2l6ZUhhbmRsZSA6ICdzaXplSGFuZGxlJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDU1M7XG4iLCJ2YXIgRG9jdW1lbnRFdmVudCA9IHtcbiAgICBNT1VTRV9NT1ZFIDogJ21vdXNlbW92ZScsXG4gICAgTU9VU0VfVVAgICA6ICdtb3VzZXVwJyxcbiAgICBNT1VTRV9ET1dOIDogJ21vdXNlZG93bicsXG5cbiAgICBXSU5ET1dfUkVTSVpFIDogJ3Jlc2l6ZSdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnRFdmVudDsiLCJ2YXIgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4vRG9jdW1lbnRFdmVudCcpO1xuXG5mdW5jdGlvbiBNb3VzZSgpIHtcbiAgICB0aGlzLl9wb3MgPSBbMCwgMF07XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUuYmluZCh0aGlzKSk7XG59XG5cbk1vdXNlLl9pbnN0YW5jZSA9IG51bGw7XG5cbk1vdXNlLnByb3RvdHlwZS5fb25Eb2N1bWVudE1vdXNlTW92ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgdmFyIGR4ID0gMCxcbiAgICAgICAgZHkgPSAwO1xuXG4gICAgaWYgKCFlKWUgPSB3aW5kb3cuZXZlbnQ7XG4gICAgaWYgKGUucGFnZVgpIHtcbiAgICAgICAgZHggPSBlLnBhZ2VYO1xuICAgICAgICBkeSA9IGUucGFnZVk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGUuY2xpZW50WCkge1xuICAgICAgICBkeCA9IGUuY2xpZW50WCArIGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdCArIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0O1xuICAgICAgICBkeSA9IGUuY2xpZW50WSArIGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcbiAgICB9XG4gICAgdGhpcy5fcG9zWzBdID0gZHg7XG4gICAgdGhpcy5fcG9zWzFdID0gZHk7XG59O1xuXG5Nb3VzZS5wcm90b3R5cGUuZ2V0UG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvcztcbn07XG5cbk1vdXNlLnByb3RvdHlwZS5nZXRYID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9wb3NbMF07XG59O1xuXG5Nb3VzZS5wcm90b3R5cGUuZ2V0WSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcG9zWzFdO1xufTtcblxuTW91c2Uuc2V0dXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYoTW91c2UuX2luc3RhbmNlKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBNb3VzZS5faW5zdGFuY2UgPSBuZXcgTW91c2UoKTtcbn07XG5cbk1vdXNlLmdldEluc3RhbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBNb3VzZS5faW5zdGFuY2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1vdXNlOyIsImZ1bmN0aW9uIE5vZGUoKSB7XG4gICAgdGhpcy5fZWxlbWVudCA9IG51bGw7XG5cbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpe1xuICAgICAgICBjYXNlIDEgOlxuICAgICAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgICAgIGlmIChhcmcgIT0gTm9kZS5JTlBVVF9URVhUICYmXG4gICAgICAgICAgICAgICAgYXJnICE9IE5vZGUuSU5QVVRfQlVUVE9OICYmXG4gICAgICAgICAgICAgICAgYXJnICE9IE5vZGUuSU5QVVRfU0VMRUNUICYmXG4gICAgICAgICAgICAgICAgYXJnICE9IE5vZGUuSU5QVVRfQ0hFQ0tCT1gpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChhcmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZWxlbWVudC50eXBlID0gYXJnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn1cblxuTm9kZS5ESVYgPSAnZGl2Jztcbk5vZGUuSU5QVVRfVEVYVCA9ICcnO1xuTm9kZS5JTlBVVF9URVhUID0gJ3RleHQnO1xuTm9kZS5JTlBVVF9CVVRUT04gPSAnYnV0dG9uJztcbk5vZGUuSU5QVVRfU0VMRUNUID0gJ3NlbGVjdCc7XG5Ob2RlLklOUFVUX0NIRUNLQk9YID0gJ2NoZWNrYm94Jztcbk5vZGUuT1BUSU9OID0gJ29wdGlvbic7XG5Ob2RlLkxJU1QgPSAndWwnO1xuTm9kZS5MSVNUX0lURU0gPSAnbGknO1xuTm9kZS5TUEFOID0gJ3NwYW4nO1xuTm9kZS5URVhUQVJFQSA9ICd0ZXh0YXJlYSc7XG5cbk5vZGUucHJvdG90eXBlID0ge1xuICAgIGFkZENoaWxkOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmFwcGVuZENoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcblxuICAgIGFkZENoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpID0gLTEsIGwgPSBhcmd1bWVudHMubGVuZ3RoLCBlID0gdGhpcy5fZWxlbWVudDtcbiAgICAgICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgICAgIGUuYXBwZW5kQ2hpbGQoYXJndW1lbnRzW2ldLmdldEVsZW1lbnQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGFkZENoaWxkQXQ6IGZ1bmN0aW9uIChub2RlLCBpbmRleCkge1xuICAgICAgICB0aGlzLl9lbGVtZW50Lmluc2VydEJlZm9yZShub2RlLmdldEVsZW1lbnQoKSwgdGhpcy5fZWxlbWVudC5jaGlsZHJlbltpbmRleF0pO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlQ2hpbGQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIGlmICghdGhpcy5jb250YWlucyhub2RlKSlyZXR1cm4gbnVsbDtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVDaGlsZChub2RlLmdldEVsZW1lbnQoKSk7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG5cbiAgICByZW1vdmVDaGlsZHJlbjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaSA9IC0xLCBsID0gYXJndW1lbnRzLmxlbmd0aCwgZSA9IHRoaXMuX2VsZW1lbnQ7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsKSB7XG4gICAgICAgICAgICBlLnJlbW92ZUNoaWxkKGFyZ3VtZW50c1tpXS5nZXRFbGVtZW50KCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICByZW1vdmVDaGlsZEF0OiBmdW5jdGlvbiAobm9kZSwgaW5kZXgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5zKG5vZGUpKXJldHVybiBudWxsO1xuICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUNoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcblxuICAgIHJlbW92ZUFsbENoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcbiAgICAgICAgd2hpbGUgKGVsZW1lbnQuaGFzQ2hpbGROb2RlcygpKWVsZW1lbnQucmVtb3ZlQ2hpbGQoZWxlbWVudC5sYXN0Q2hpbGQpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc2V0V2lkdGg6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLndpZHRoID0gdmFsdWUgKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldFdpZHRoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldFdpZHRoO1xuICAgIH0sXG5cbiAgICBzZXRIZWlnaHQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLmhlaWdodCA9IHZhbHVlICsgJ3B4JztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBnZXRIZWlnaHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0SGVpZ2h0O1xuICAgIH0sXG5cbiAgICBzZXRQb3NpdGlvbjogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0UG9zaXRpb24oeCkuc2V0UG9zaXRpb24oeSk7XG4gICAgfSxcbiAgICBzZXRQb3NpdGlvblg6IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUubWFyZ2luTGVmdCA9IHggKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uWTogZnVuY3Rpb24gKHkpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5tYXJnaW5Ub3AgPSB5ICsgJ3B4JztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHNldFBvc2l0aW9uR2xvYmFsOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRQb3NpdGlvbkdsb2JhbFgoeCkuc2V0UG9zaXRpb25HbG9iYWxZKHkpO1xuICAgIH0sXG4gICAgc2V0UG9zaXRpb25HbG9iYWxYOiBmdW5jdGlvbiAoeCkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLmxlZnQgPSB4ICsgJ3B4JztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBzZXRQb3NpdGlvbkdsb2JhbFk6IGZ1bmN0aW9uICh5KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUudG9wID0geSArICdweCc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBnZXRQb3NpdGlvbjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gW3RoaXMuZ2V0UG9zaXRpb25YKCksIHRoaXMuZ2V0UG9zaXRpb25ZKCldO1xuICAgIH0sXG4gICAgZ2V0UG9zaXRpb25YOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgfSxcbiAgICBnZXRQb3NpdGlvblk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0VG9wO1xuICAgIH0sXG5cbiAgICBnZXRQb3NpdGlvbkdsb2JhbDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gWzAsIDBdLFxuICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XG5cbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIG9mZnNldFswXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgICAgICBvZmZzZXRbMV0gKz0gZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb2Zmc2V0O1xuICAgIH0sXG5cbiAgICBnZXRQb3NpdGlvbkdsb2JhbFg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9mZnNldCA9IDAsXG4gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcblxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICAgICAgb2Zmc2V0ICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgfSxcblxuICAgIGdldFBvc2l0aW9uR2xvYmFsWTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gMCxcbiAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuXG4gICAgICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgICAgICBvZmZzZXQgKz0gZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb2Zmc2V0O1xuICAgIH0sXG5cbiAgICBhZGRFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICByZW1vdmVFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHNldFN0eWxlQ2xhc3M6IGZ1bmN0aW9uIChzdHlsZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmNsYXNzTmFtZSA9IHN0eWxlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFN0eWxlUHJvcGVydHk6IGZ1bmN0aW9uIChwcm9wZXJ0eSwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBnZXRTdHlsZVByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldO1xuICAgIH0sXG4gICAgc2V0U3R5bGVQcm9wZXJ0aWVzOiBmdW5jdGlvbiAocHJvcGVydGllcykge1xuICAgICAgICBmb3IgKHZhciBwIGluIHByb3BlcnRpZXMpdGhpcy5fZWxlbWVudC5zdHlsZVtwXSA9IHByb3BlcnRpZXNbcF07XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBkZWxldGVTdHlsZUNsYXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuY2xhc3NOYW1lID0gJyc7XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgfSxcbiAgICBkZWxldGVTdHlsZVByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV0gPSAnJztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBkZWxldGVTdHlsZVByb3BlcnRpZXM6IGZ1bmN0aW9uIChwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGZvciAodmFyIHAgaW4gcHJvcGVydGllcyl0aGlzLl9lbGVtZW50LnN0eWxlW3BdID0gJyc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBnZXRDaGlsZEF0OiBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudCh0aGlzLl9lbGVtZW50LmNoaWxkcmVuW2luZGV4XSk7XG4gICAgfSxcbiAgICBnZXRDaGlsZEluZGV4OiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXhPZih0aGlzLl9lbGVtZW50LCBub2RlLmdldEVsZW1lbnQoKSk7XG4gICAgfSxcbiAgICBnZXROdW1DaGlsZHJlbjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5jaGlsZHJlbi5sZW5ndGg7XG4gICAgfSxcbiAgICBnZXRGaXJzdENoaWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICB9LFxuICAgIGdldExhc3RDaGlsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IE5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQubGFzdENoaWxkKTtcbiAgICB9LFxuICAgIGhhc0NoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50LmNoaWxkcmVuLmxlbmd0aCAhPSAwO1xuICAgIH0sXG4gICAgY29udGFpbnM6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleE9mKHRoaXMuX2VsZW1lbnQsIG5vZGUuZ2V0RWxlbWVudCgpKSAhPSAtMTtcbiAgICB9LFxuXG4gICAgX2luZGV4T2Y6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50LCBlbGVtZW50KSB7XG4gICAgICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHBhcmVudEVsZW1lbnQuY2hpbGRyZW4sIGVsZW1lbnQpO1xuICAgIH0sXG5cbiAgICBzZXRQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFByb3BlcnRpZXM6IGZ1bmN0aW9uIChwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGZvciAodmFyIHAgaW4gcHJvcGVydGllcyl0aGlzLl9lbGVtZW50W3BdID0gcHJvcGVydGllc1twXTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBnZXRQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50W3Byb3BlcnR5XTtcbiAgICB9LFxuXG5cbiAgICBzZXRFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBnZXRFbGVtZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50O1xuICAgIH0sXG5cbiAgICBnZXRTdHlsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5zdHlsZTtcbiAgICB9LFxuXG4gICAgZ2V0UGFyZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5wYXJlbnROb2RlKTtcbiAgICB9XG59O1xuXG5Ob2RlLmdldE5vZGVCeUVsZW1lbnQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQoZWxlbWVudCk7XG59O1xuTm9kZS5nZXROb2RlQnlJZCA9IGZ1bmN0aW9uIChpZCkge1xuICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9kZTtcblxuLy9Db250cm9sS2l0Lk5vZGUgPSBmdW5jdGlvbigpXG4vL3tcbi8vICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuLy9cbi8vICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMSlcbi8vICAgIHtcbi8vICAgICAgICB2YXIgYXJnICA9IGFyZ3VtZW50c1swXTtcbi8vXG4vLyAgICAgICAgaWYoYXJnICE9IENvbnRyb2xLaXQuTm9kZVR5cGUuSU5QVVRfVEVYVCAgICYmXG4vLyAgICAgICAgICAgYXJnICE9IENvbnRyb2xLaXQuTm9kZVR5cGUuSU5QVVRfQlVUVE9OICYmXG4vLyAgICAgICAgICAgYXJnICE9IENvbnRyb2xLaXQuTm9kZVR5cGUuSU5QVVRfU0VMRUNUICYmXG4vLyAgICAgICAgICAgYXJnICE9IENvbnRyb2xLaXQuTm9kZVR5cGUuSU5QVVRfQ0hFQ0tCT1gpXG4vLyAgICAgICAge1xuLy8gICAgICAgICAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChhcmcpO1xuLy8gICAgICAgIH1cbi8vICAgICAgICBlbHNlXG4vLyAgICAgICAge1xuLy8gICAgICAgICAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbi8vICAgICAgICAgICAgdGhpcy5fZWxlbWVudC50eXBlID0gYXJnO1xuLy8gICAgICAgIH1cbi8vICAgIH1cbi8vfTtcbi8vXG4vL0NvbnRyb2xLaXQuTm9kZS5wcm90b3R5cGUgPVxuLy97XG4vLyAgICBhZGRDaGlsZCAgIDogZnVuY3Rpb24obm9kZSlcbi8vICAgIHtcbi8vICAgICAgICB0aGlzLl9lbGVtZW50LmFwcGVuZENoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbi8vICAgICAgICByZXR1cm4gbm9kZTtcbi8vICAgIH0sXG4vL1xuLy8gICAgYWRkQ2hpbGRyZW4gOiBmdW5jdGlvbigpXG4vLyAgICB7XG4vLyAgICAgICAgdmFyIGkgPSAtMSxsID0gYXJndW1lbnRzLmxlbmd0aCxlID0gdGhpcy5fZWxlbWVudDtcbi8vICAgICAgICB3aGlsZSgrK2kgPCBsKXtlLmFwcGVuZENoaWxkKGFyZ3VtZW50c1tpXS5nZXRFbGVtZW50KCkpO31cbi8vICAgICAgICByZXR1cm4gdGhpcztcbi8vICAgIH0sXG4vL1xuLy8gICAgYWRkQ2hpbGRBdCA6IGZ1bmN0aW9uKG5vZGUsaW5kZXgpXG4vLyAgICB7XG4vLyAgICAgICAgdGhpcy5fZWxlbWVudC5pbnNlcnRCZWZvcmUobm9kZS5nZXRFbGVtZW50KCksdGhpcy5fZWxlbWVudC5jaGlsZHJlbltpbmRleF0pO1xuLy8gICAgICAgIHJldHVybiBub2RlO1xuLy8gICAgfSxcbi8vXG4vLyAgICByZW1vdmVDaGlsZCA6IGZ1bmN0aW9uKG5vZGUpXG4vLyAgICB7XG4vLyAgICAgICAgaWYoIXRoaXMuY29udGFpbnMobm9kZSkpcmV0dXJuIG51bGw7XG4vLyAgICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVDaGlsZChub2RlLmdldEVsZW1lbnQoKSk7XG4vLyAgICAgICAgcmV0dXJuIG5vZGU7XG4vLyAgICB9LFxuLy9cbi8vICAgIHJlbW92ZUNoaWxkcmVuIDogZnVuY3Rpb24oKVxuLy8gICAge1xuLy8gICAgICAgIHZhciBpID0gLTEsIGwgPSBhcmd1bWVudHMubGVuZ3RoLCBlID0gdGhpcy5fZWxlbWVudDtcbi8vICAgICAgICB3aGlsZSgrK2k8bCl7ZS5yZW1vdmVDaGlsZChhcmd1bWVudHNbaV0uZ2V0RWxlbWVudCgpKTt9XG4vLyAgICAgICAgcmV0dXJuIHRoaXM7XG4vLyAgICB9LFxuLy9cbi8vICAgIHJlbW92ZUNoaWxkQXQgOiBmdW5jdGlvbihub2RlLGluZGV4KVxuLy8gICAge1xuLy8gICAgICAgIGlmKCF0aGlzLmNvbnRhaW5zKG5vZGUpKXJldHVybiBudWxsO1xuLy8gICAgICAgIHRoaXMuX2VsZW1lbnQucmVtb3ZlQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xuLy8gICAgICAgIHJldHVybiBub2RlO1xuLy8gICAgfSxcbi8vXG4vLyAgICByZW1vdmVBbGxDaGlsZHJlbiA6IGZ1bmN0aW9uKClcbi8vICAgIHtcbi8vICAgICAgICB2YXIgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XG4vLyAgICAgICAgd2hpbGUoZWxlbWVudC5oYXNDaGlsZE5vZGVzKCkpZWxlbWVudC5yZW1vdmVDaGlsZChlbGVtZW50Lmxhc3RDaGlsZCk7XG4vLyAgICAgICAgcmV0dXJuIHRoaXM7XG4vLyAgICB9LFxuLy9cbi8vICAgIHNldFdpZHRoICA6IGZ1bmN0aW9uKHZhbHVlKXt0aGlzLl9lbGVtZW50LnN0eWxlLndpZHRoID0gdmFsdWUgKyAncHgnOyByZXR1cm4gdGhpczt9LFxuLy8gICAgZ2V0V2lkdGggIDogZnVuY3Rpb24oKSAgICAge3JldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldFdpZHRoO30sXG4vL1xuLy8gICAgc2V0SGVpZ2h0IDogZnVuY3Rpb24odmFsdWUpe3RoaXMuX2VsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gdmFsdWUgKyAncHgnOyByZXR1cm4gdGhpczt9LFxuLy8gICAgZ2V0SGVpZ2h0IDogZnVuY3Rpb24oKSAgICAge3JldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldEhlaWdodDt9LFxuLy9cbi8vICAgIHNldFBvc2l0aW9uICA6IGZ1bmN0aW9uKHgseSl7IHJldHVybiB0aGlzLnNldFBvc2l0aW9uKHgpLnNldFBvc2l0aW9uKHkpO30sXG4vLyAgICBzZXRQb3NpdGlvblggOiBmdW5jdGlvbih4KSAge3RoaXMuX2VsZW1lbnQuc3R5bGUubWFyZ2luTGVmdCA9IHggKyAncHgnO3JldHVybiB0aGlzO30sXG4vLyAgICBzZXRQb3NpdGlvblkgOiBmdW5jdGlvbih5KSAge3RoaXMuX2VsZW1lbnQuc3R5bGUubWFyZ2luVG9wICA9IHkgKyAncHgnO3JldHVybiB0aGlzO30sXG4vL1xuLy8gICAgc2V0UG9zaXRpb25HbG9iYWwgIDogZnVuY3Rpb24oeCx5KXtyZXR1cm4gdGhpcy5zZXRQb3NpdGlvbkdsb2JhbFgoeCkuc2V0UG9zaXRpb25HbG9iYWxZKHkpO30sXG4vLyAgICBzZXRQb3NpdGlvbkdsb2JhbFggOiBmdW5jdGlvbih4KSAge3RoaXMuX2VsZW1lbnQuc3R5bGUubGVmdCA9IHggKyAncHgnO3JldHVybiB0aGlzO30sXG4vLyAgICBzZXRQb3NpdGlvbkdsb2JhbFkgOiBmdW5jdGlvbih5KSAge3RoaXMuX2VsZW1lbnQuc3R5bGUudG9wICA9IHkgKyAncHgnO3JldHVybiB0aGlzO30sXG4vL1xuLy8gICAgZ2V0UG9zaXRpb24gIDogZnVuY3Rpb24oKXtyZXR1cm4gW3RoaXMuZ2V0UG9zaXRpb25YKCksdGhpcy5nZXRQb3NpdGlvblkoKV07fSxcbi8vICAgIGdldFBvc2l0aW9uWCA6IGZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0TGVmdDt9LFxuLy8gICAgZ2V0UG9zaXRpb25ZIDogZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRUb3A7fSxcbi8vXG4vLyAgICBnZXRQb3NpdGlvbkdsb2JhbCA6IGZ1bmN0aW9uKClcbi8vICAgIHtcbi8vICAgICAgICB2YXIgb2Zmc2V0ICA9IFswLDBdLFxuLy8gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcbi8vXG4vLyAgICAgICAgd2hpbGUoZWxlbWVudClcbi8vICAgICAgICB7XG4vLyAgICAgICAgICAgIG9mZnNldFswXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4vLyAgICAgICAgICAgIG9mZnNldFsxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbi8vICAgICAgICAgICAgZWxlbWVudCAgICA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuLy8gICAgICAgIH1cbi8vXG4vLyAgICAgICAgcmV0dXJuIG9mZnNldDtcbi8vICAgIH0sXG4vL1xuLy8gICAgZ2V0UG9zaXRpb25HbG9iYWxYIDogZnVuY3Rpb24oKVxuLy8gICAge1xuLy8gICAgICAgIHZhciBvZmZzZXQgID0gMCxcbi8vICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XG4vL1xuLy8gICAgICAgIHdoaWxlKGVsZW1lbnQpXG4vLyAgICAgICAge1xuLy8gICAgICAgICAgICBvZmZzZXQgKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuLy8gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4vLyAgICAgICAgfVxuLy9cbi8vICAgICAgICByZXR1cm4gb2Zmc2V0O1xuLy8gICAgfSxcbi8vXG4vLyAgICBnZXRQb3NpdGlvbkdsb2JhbFkgOiBmdW5jdGlvbigpXG4vLyAgICB7XG4vLyAgICAgICAgdmFyIG9mZnNldCAgPSAwLFxuLy8gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcbi8vXG4vLyAgICAgICAgd2hpbGUoZWxlbWVudClcbi8vICAgICAgICB7XG4vLyAgICAgICAgICAgIG9mZnNldCArPSBlbGVtZW50Lm9mZnNldFRvcDtcbi8vICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuLy8gICAgICAgIH1cbi8vXG4vLyAgICAgICAgcmV0dXJuIG9mZnNldDtcbi8vICAgIH0sXG4vL1xuLy8gICAgYWRkRXZlbnRMaXN0ZW5lciAgICA6IGZ1bmN0aW9uKHR5cGUsbGlzdGVuZXIsdXNlQ2FwdHVyZSl7dGhpcy5fZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCAgIHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTsgcmV0dXJuIHRoaXM7fSxcbi8vICAgIHJlbW92ZUV2ZW50TGlzdGVuZXIgOiBmdW5jdGlvbih0eXBlLGxpc3RlbmVyLHVzZUNhcHR1cmUpe3RoaXMuX2VsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSk7cmV0dXJuIHRoaXM7fSxcbi8vXG4vLyAgICBzZXRTdHlsZUNsYXNzICAgICAgOiBmdW5jdGlvbihzdHlsZSkgICAgICAgICB7dGhpcy5fZWxlbWVudC5jbGFzc05hbWUgPSBzdHlsZTsgcmV0dXJuIHRoaXM7fSxcbi8vICAgIHNldFN0eWxlUHJvcGVydHkgICA6IGZ1bmN0aW9uKHByb3BlcnR5LHZhbHVlKXt0aGlzLl9lbGVtZW50LnN0eWxlW3Byb3BlcnR5XSA9IHZhbHVlOyByZXR1cm4gdGhpczt9LFxuLy8gICAgZ2V0U3R5bGVQcm9wZXJ0eSAgIDogZnVuY3Rpb24ocHJvcGVydHkpICAgICAge3JldHVybiB0aGlzLl9lbGVtZW50LnN0eWxlW3Byb3BlcnR5XTt9LFxuLy8gICAgc2V0U3R5bGVQcm9wZXJ0aWVzIDogZnVuY3Rpb24ocHJvcGVydGllcykgICAge2Zvcih2YXIgcCBpbiBwcm9wZXJ0aWVzKXRoaXMuX2VsZW1lbnQuc3R5bGVbcF0gPSBwcm9wZXJ0aWVzW3BdO3JldHVybiB0aGlzO30sXG4vL1xuLy8gICAgZGVsZXRlU3R5bGVDbGFzcyAgICAgIDogZnVuY3Rpb24oKSAgICAgICAgICAge3RoaXMuX2VsZW1lbnQuY2xhc3NOYW1lID0gJyc7cmV0dXJuIHRoaXN9LFxuLy8gICAgZGVsZXRlU3R5bGVQcm9wZXJ0eSAgIDogZnVuY3Rpb24ocHJvcGVydHkpICAge3RoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldID0gJyc7cmV0dXJuIHRoaXM7fSxcbi8vICAgIGRlbGV0ZVN0eWxlUHJvcGVydGllcyA6IGZ1bmN0aW9uKHByb3BlcnRpZXMpIHtmb3IodmFyIHAgaW4gcHJvcGVydGllcyl0aGlzLl9lbGVtZW50LnN0eWxlW3BdID0gJyc7cmV0dXJuIHRoaXM7fSxcbi8vXG4vLyAgICBnZXRDaGlsZEF0ICAgICA6IGZ1bmN0aW9uKGluZGV4KSB7cmV0dXJuIG5ldyBDb250cm9sS2l0Lk5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQuY2hpbGRyZW5baW5kZXhdKTt9LFxuLy8gICAgZ2V0Q2hpbGRJbmRleCAgOiBmdW5jdGlvbihub2RlKSAge3JldHVybiB0aGlzLl9pbmRleE9mKHRoaXMuX2VsZW1lbnQsbm9kZS5nZXRFbGVtZW50KCkpO30sXG4vLyAgICBnZXROdW1DaGlsZHJlbiA6IGZ1bmN0aW9uKCkgICAgICB7cmV0dXJuIHRoaXMuX2VsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoO30sXG4vLyAgICBnZXRGaXJzdENoaWxkICA6IGZ1bmN0aW9uKCkgICAgICB7cmV0dXJuIG5ldyBDb250cm9sS2l0Lk5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQuZmlyc3RDaGlsZCk7fSxcbi8vICAgIGdldExhc3RDaGlsZCAgIDogZnVuY3Rpb24oKSAgICAgIHtyZXR1cm4gbmV3IENvbnRyb2xLaXQuTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5sYXN0Q2hpbGQpO30sXG4vLyAgICBoYXNDaGlsZHJlbiAgICA6IGZ1bmN0aW9uKCkgICAgICB7cmV0dXJuIHRoaXMuX2VsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoICE9IDA7fSxcbi8vICAgIGNvbnRhaW5zICAgICAgIDogZnVuY3Rpb24obm9kZSkgIHtyZXR1cm4gdGhpcy5faW5kZXhPZih0aGlzLl9lbGVtZW50LG5vZGUuZ2V0RWxlbWVudCgpKSAhPSAtMTt9LFxuLy9cbi8vICAgIF9pbmRleE9mICAgICAgIDogZnVuY3Rpb24ocGFyZW50RWxlbWVudCxlbGVtZW50KXtyZXR1cm4gQXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbChwYXJlbnRFbGVtZW50LmNoaWxkcmVuLGVsZW1lbnQpO30sXG4vL1xuLy8gICAgc2V0UHJvcGVydHkgICA6IGZ1bmN0aW9uKHByb3BlcnR5LCB2YWx1ZSl7dGhpcy5fZWxlbWVudFtwcm9wZXJ0eV0gPSB2YWx1ZTtyZXR1cm4gdGhpczt9LFxuLy8gICAgc2V0UHJvcGVydGllcyA6IGZ1bmN0aW9uKHByb3BlcnRpZXMpICAgICB7Zm9yKHZhciBwIGluIHByb3BlcnRpZXMpdGhpcy5fZWxlbWVudFtwXSA9IHByb3BlcnRpZXNbcF07cmV0dXJuIHRoaXM7fSxcbi8vICAgIGdldFByb3BlcnR5ICAgOiBmdW5jdGlvbihwcm9wZXJ0eSkgICAgICAge3JldHVybiB0aGlzLl9lbGVtZW50W3Byb3BlcnR5XTt9LFxuLy9cbi8vXG4vLyAgICBzZXRFbGVtZW50IDogZnVuY3Rpb24oZWxlbWVudCl7dGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7cmV0dXJuIHRoaXM7fSxcbi8vICAgIGdldEVsZW1lbnQgOiBmdW5jdGlvbigpICAgICAgIHsgcmV0dXJuIHRoaXMuX2VsZW1lbnQ7fSxcbi8vXG4vLyAgICBnZXRTdHlsZSAgIDogZnVuY3Rpb24oKSAgICAgICB7cmV0dXJuIHRoaXMuX2VsZW1lbnQuc3R5bGU7fSxcbi8vXG4vLyAgICBnZXRQYXJlbnQgIDogZnVuY3Rpb24oKXsgcmV0dXJuIG5ldyBDb250cm9sS2l0Lk5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQucGFyZW50Tm9kZSk7IH1cbi8vfTtcbi8vXG4vL0NvbnRyb2xLaXQuTm9kZS5nZXROb2RlQnlFbGVtZW50ID0gZnVuY3Rpb24oZWxlbWVudCl7cmV0dXJuIG5ldyBDb250cm9sS2l0Lk5vZGUoKS5zZXRFbGVtZW50KGVsZW1lbnQpO307XG4vL0NvbnRyb2xLaXQuTm9kZS5nZXROb2RlQnlJZCAgICAgID0gZnVuY3Rpb24oaWQpICAgICB7cmV0dXJuIG5ldyBDb250cm9sS2l0Lk5vZGUoKS5zZXRFbGVtZW50KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKSk7fTtcbi8vXG4iLCJ2YXIgTm9kZUV2ZW50ID0ge1xuICAgIE1PVVNFX0RPV04gICA6ICdtb3VzZWRvd24nLFxuICAgIE1PVVNFX1VQICAgICA6ICdtb3VzZXVwJyxcbiAgICBNT1VTRV9PVkVSICAgOiAnbW91c2VvdmVyJyxcbiAgICBNT1VTRV9NT1ZFICAgOiAnbW91c2Vtb3ZlJyxcbiAgICBNT1VTRV9PVVQgICAgOiAnbW91c2VvdXQnLFxuICAgIEtFWV9ET1dOICAgICA6ICdrZXlkb3duJyxcbiAgICBLRVlfVVAgICAgICAgOiAna2V5dXAnLFxuICAgIENIQU5HRSAgICAgICA6ICdjaGFuZ2UnLFxuICAgIEZJTklTSCAgICAgICA6ICdmaW5pc2gnLFxuICAgIERCTF9DTElDSyAgICA6ICdkYmxjbGljaycsXG4gICAgT05fQ0xJQ0sgICAgIDogJ2NsaWNrJyxcbiAgICBTRUxFQ1RfU1RBUlQgOiAnc2VsZWN0c3RhcnQnLFxuICAgIERSQUdfU1RBUlQgICA6ICdkcmFnc3RhcnQnLFxuICAgIERSQUcgICAgICAgICA6ICdkcmFnJyxcbiAgICBEUkFHX0VORCAgICAgOiAnZHJhZ2VuZCcsXG5cbiAgICBEUkFHX0VOVEVSICAgOiAnZHJhZ2VudGVyJyxcbiAgICBEUkFHX09WRVIgICAgOiAnZHJhZ292ZXInLFxuICAgIERSQUdfTEVBVkUgICA6ICdkcmFnbGVhdmUnLFxuXG4gICAgUkVTSVpFICAgICAgIDogJ3Jlc2l6ZSdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9kZUV2ZW50OyIsInZhciBTdHlsZSA9IHsgXG5cdHN0cmluZyA6IFwiLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICogUGFuZWwgKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qLy8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqIENvbXBvbmVudHMgKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qLy8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqIENhbnZhcyAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICogU2Nyb2xsQmFyICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi8vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKiBHcm91cCAmIHN1Ykdyb3VwICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi8vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKiBNZW51ICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi8vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKiBPcHRpb25zICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi8vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKiBQaWNrZXIgKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL2JvZHkgeyAgbWFyZ2luOiAwOyAgcGFkZGluZzogMDsgfSNjb250cm9sS2l0IHsgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgIHRvcDogMDsgIGxlZnQ6IDA7ICB3aWR0aDogMTAwJTsgIGhlaWdodDogMTAwJTsgIHVzZXItc2VsZWN0OiBub25lOyB9ICAjY29udHJvbEtpdCAqIHsgICAgb3V0bGluZTogMDsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIGlucHV0W3R5cGU9J3RleHQnXSwgICNjb250cm9sS2l0IC5wYW5lbCB0ZXh0YXJlYSwgICNjb250cm9sS2l0IC5wYW5lbCAuY29sb3IsICAjY29udHJvbEtpdCAucGlja2VyIGlucHV0W3R5cGU9J3RleHQnXSB7ICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICBoZWlnaHQ6IDI1cHg7ICAgIHdpZHRoOiAxMDAlOyAgICBwYWRkaW5nOiAwIDAgMCA4cHg7ICAgIGZvbnQtZmFtaWx5OiBhcmlhbCwgc2Fucy1zZXJpZjsgICAgZm9udC1zaXplOiAxMXB4OyAgICBjb2xvcjogd2hpdGU7ICAgIHRleHQtc2hhZG93OiAxcHggMXB4IGJsYWNrOyAgICBiYWNrZ3JvdW5kOiAjMjIyNzI5OyAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCUsIHJnYmEoMCwgMCwgMCwgMC4xMjUpIDEwMCUpOyAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCUsIHJnYmEoMCwgMCwgMCwgMC4xMjUpIDEwMCUpOyAgICBib3JkZXI6IG5vbmU7ICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4wMTI1KSBpbnNldCwgMCAwIDFweCAxcHggIzExMTMxNCBpbnNldDsgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzYjQ0NDc7ICAgIC13ZWJraXQtdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1raHRtbC11c2VyLXNlbGVjdDogbm9uZTsgICAgLW1vei11c2VyLXNlbGVjdDogbm9uZTsgICAgLW8tdXNlci1zZWxlY3Q6IG5vbmU7IH0gICNjb250cm9sS2l0IC5wYW5lbCAuY29sb3IgeyAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgd2lkdGg6IDEwMCU7ICAgIGhlaWdodDogMjVweDsgICAgbGluZS1oZWlnaHQ6IDI1cHg7ICAgIGJhY2tncm91bmQ6ICNmZmY7ICAgIHRleHQtYWxpZ246IGNlbnRlcjsgICAgcGFkZGluZzogMDsgICAgLXdlYmtpdC10b3VjaC1jYWxsb3V0OiBub25lOyAgICAtd2Via2l0LXVzZXItc2VsZWN0OiBub25lOyAgICAta2h0bWwtdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1tb3otdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1tcy11c2VyLXNlbGVjdDogbm9uZTsgICAgdXNlci1zZWxlY3Q6IG5vbmU7ICAgIGN1cnNvcjogcG9pbnRlcjsgICAgYm9yZGVyOiBub25lOyAgICBib3gtc2hhZG93OiAwIDAgMCAxcHggIzExMTMxNCBpbnNldDsgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzYjQ0NDc7IH0gICNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLCAgI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9uLCAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QsICAjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdEFjdGl2ZSB7ICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICB3aWR0aDogMTAwJTsgICAgaGVpZ2h0OiAyNnB4OyAgICBtYXJnaW46IC0ycHggMCAwIDA7ICAgIGN1cnNvcjogcG9pbnRlcjsgICAgYmFja2dyb3VuZDogIzNjNDk0ZTsgICAgYmFja2dyb3VuZC1pbWFnZTogLW8tbGluZWFyLWdyYWRpZW50KHJnYmEoMzQsIDM5LCA0MSwgMCkgMCUsIHJnYmEoMzQsIDM5LCA0MSwgMC42NSkgMTAwJSk7ICAgIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudChyZ2JhKDM0LCAzOSwgNDEsIDApIDAlLCByZ2JhKDM0LCAzOSwgNDEsIDAuNjUpIDEwMCUpOyAgICBmb250LWZhbWlseTogYXJpYWwsIHNhbnMtc2VyaWY7ICAgIGNvbG9yOiB3aGl0ZTsgICAgYm9yZGVyOiBub25lOyAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICBib3gtc2hhZG93OiAwIDAgMCAxcHggIzEzMTMxMyBpbnNldCwgLTFweCAycHggMCAwICMzMjNhNDQgaW5zZXQ7ICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjM2I0NDQ3OyAgICBvdXRsaW5lOiAwOyB9ICAjY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbiwgI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9uIHsgICAgZm9udC1zaXplOiAxMHB4OyAgICBmb250LXdlaWdodDogYm9sZDsgICAgdGV4dC1zaGFkb3c6IDAgLTFweCBibGFjazsgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbjpob3ZlciwgI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9uOmhvdmVyIHsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBub25lOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uOmFjdGl2ZSwgI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9uOmFjdGl2ZSB7ICAgICAgYmFja2dyb3VuZC1pbWFnZTogLW8tbGluZWFyLWdyYWRpZW50KHJnYmEoMCwgMCwgMCwgMC4xKSAwJSwgdHJhbnNwYXJlbnQgMTAwJSk7ICAgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KHJnYmEoMCwgMCwgMCwgMC4xKSAwJSwgdHJhbnNwYXJlbnQgMTAwJSk7IH0gICNjb250cm9sS2l0IC5wYW5lbCB7ICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsgICAgei1pbmRleDogMTsgICAgbWFyZ2luOiAwOyAgICBwYWRkaW5nOiAwOyAgICB3aWR0aDogMzAwcHg7ICAgIGJhY2tncm91bmQtY29sb3I6ICMzMDM2Mzk7ICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4yNSk7ICAgIGZvbnQtZmFtaWx5OiBhcmlhbCwgc2Fucy1zZXJpZjsgICAgLXdlYmtpdC10b3VjaC1jYWxsb3V0OiBub25lOyAgICAtd2Via2l0LXVzZXItc2VsZWN0OiBub25lOyAgICAta2h0bWwtdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1tb3otdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1tcy11c2VyLXNlbGVjdDogbm9uZTsgICAgdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICBvdmVyZmxvdzogaGlkZGVuOyAgICBvcGFjaXR5OiAxLjA7ICAgIGZsb2F0OiBsZWZ0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCB0ZXh0YXJlYSB7ICAgICAgcGFkZGluZzogNXB4IDhweCAycHggOHB4OyAgICAgIG92ZXJmbG93OiBoaWRkZW47ICAgICAgcmVzaXplOiBub25lOyAgICAgIHZlcnRpY2FsLWFsaWduOiB0b3A7ICAgICAgd2hpdGUtc3BhY2U6IG5vd3JhcDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgaW5wdXRbdHlwZT0nY2hlY2tib3gnXSB7ICAgICAgbWFyZ2luOiA1cHggMCAwIDA7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QsICNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0QWN0aXZlIHsgICAgICBwYWRkaW5nLWxlZnQ6IDEwcHg7ICAgICAgcGFkZGluZy1yaWdodDogMjBweDsgICAgICBmb250LXNpemU6IDExcHg7ICAgICAgdGV4dC1hbGlnbjogbGVmdDsgICAgICB0ZXh0LXNoYWRvdzogMXB4IDFweCBibGFjazsgICAgICBjdXJzb3I6IHBvaW50ZXI7ICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsgICAgICB3aGl0ZS1zcGFjZTogbm93cmFwOyAgICAgIHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0IHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCQUFBQUFMQ0FZQUFBQjI0ZzA1QUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQU1OSlJFRlVlTnFja2pFS3dqQVVoajhsNTNBUTUyNkJIS0tMSWhTbEhrSHhCa2t1SUZXUElMUU9RUWQzVjRWdVhpZ3VGbHJGUlB6aExYbDgzM3VCMTB1em5DYVArcTRCRXFsczgzWTVIZ2hGdE9IMWFta0FpdDIrSXdrbXpYSUd3NUhlRkZ2ZlpGTnMvV0E0MG1tVzQ3MFAxZ2Y4TG9rSlJDSVYxMXZOOWJiNDJDNlJLdm9EQWRoWC9SWHhxTzhHMEYvNkZqQkJRU0lWOCttRTJYVGNhVlR1VE9sTzBRMzZnQ25keVZidS9BNUhwN2Z2d0x5bWFlQm51SE5JTFFtL3dnRFBBUUFQTklzSG5PNzk0UUFBQUFCSlJVNUVya0pnZ2c9PSkgMTAwJSA1MCUgbm8tcmVwZWF0LCAtby1saW5lYXItZ3JhZGllbnQoIzNhNDY0YiAwJSwgcmdiYSg0NCwgNTIsIDU1LCAwKSAxMDAlKTsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCQUFBQUFMQ0FZQUFBQjI0ZzA1QUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQU1OSlJFRlVlTnFja2pFS3dqQVVoajhsNTNBUTUyNkJIS0tMSWhTbEhrSHhCa2t1SUZXUElMUU9RUWQzVjRWdVhpZ3VGbHJGUlB6aExYbDgzM3VCMTB1em5DYVArcTRCRXFsczgzWTVIZ2hGdE9IMWFta0FpdDIrSXdrbXpYSUd3NUhlRkZ2ZlpGTnMvV0E0MG1tVzQ3MFAxZ2Y4TG9rSlJDSVYxMXZOOWJiNDJDNlJLdm9EQWRoWC9SWHhxTzhHMEYvNkZqQkJRU0lWOCttRTJYVGNhVlR1VE9sTzBRMzZnQ25keVZidS9BNUhwN2Z2d0x5bWFlQm51SE5JTFFtL3dnRFBBUUFQTklzSG5PNzk0UUFBQUFCSlJVNUVya0pnZ2c9PSkgMTAwJSA1MCUgbm8tcmVwZWF0LCBsaW5lYXItZ3JhZGllbnQoIzNhNDY0YiAwJSwgcmdiYSg0NCwgNTIsIDU1LCAwKSAxMDAlKTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdDpob3ZlciwgI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3RBY3RpdmUgeyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJBQUFBQUxDQVlBQUFCMjRnMDVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBTU5KUkVGVWVOcWNrakVLd2pBVWhqOGw1M0FRNTI2QkhLS0xJaFNsSGtIeEJra3VJRldQSUxRT1FRZDNWNFZ1WGlndUZsckZSUHpoTFhsODMzdUIxMHV6bkNhUCtxNEJFcWxzODNZNUhnaEZ0T0gxYW1rQWl0MitJd2ttelhJR3c1SGVGRnZmWkZOcy9XQTQwbW1XNDcwUDFnZjhMb2tKUkNJVjExdk45YmI0MkM2Ukt2b0RBZGhYL1JYeHFPOEcwRi82RmpCQlFTSVY4K21FMlhUY2FWVHVUT2xPMFEzNmdDbmR5VmJ1L0E1SHA3ZnZ3THltYWVCbnVITklMUW0vd2dEUEFRQVBOSXNIbk83OTRRQUFBQUJKUlU1RXJrSmdnZz09KSAxMDAlIDUwJSBuby1yZXBlYXQsICMzYzQ5NGU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5wcmVzZXRCdG4sICNjb250cm9sS2l0IC5wYW5lbCAucHJlc2V0QnRuQWN0aXZlIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgcG9zaXRpb246IGFic29sdXRlOyAgICAgIHJpZ2h0OiAwOyAgICAgIHdpZHRoOiAyMHB4OyAgICAgIGhlaWdodDogMjVweDsgICAgICBtYXJnaW46IDAgMCAwIDA7ICAgICAgY3Vyc29yOiBwb2ludGVyOyAgICAgIGZsb2F0OiByaWdodDsgICAgICBib3JkZXI6IG5vbmU7ICAgICAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDJweDsgICAgICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogMnB4OyAgICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCAjMTMxMzEzIGluc2V0LCAtMXB4IDJweCAwIDAgIzMyM2E0NCBpbnNldDsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnByZXNldEJ0bkFjdGl2ZSwgI2NvbnRyb2xLaXQgLnBhbmVsIC5wcmVzZXRCdG46aG92ZXIgeyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRzVKUkVGVWVOcGk1T0RpYW1SZ1lLaGp3QTRhbVZ4OGd4am1MMXJDOFAzclZ4UThiK0VTQmhmZklBWm1OUjI5QTVldlhXZGlaR0MwMTlYU1pHQmdZR0JZdm1ZOXc3STE2eG9aR0JnYVdLQkcxUzlicys0L0F3TkRQUU1EQTF5U2dZR0JnZEVuUEFiWnpnWTBtZ0V3QUU5bEpUMWxyc2ZmQUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsICMzYzQ5NGU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5wcmVzZXRCdG4geyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRzVKUkVGVWVOcGk1T0RpYW1SZ1lLaGp3QTRhbVZ4OGd4am1MMXJDOFAzclZ4UThiK0VTQmhmZklBWm1OUjI5QTVldlhXZGlaR0MwMTlYU1pHQmdZR0JZdm1ZOXc3STE2eG9aR0JnYVdLQkcxUzlicys0L0F3TkRQUU1EQTF5U2dZR0JnZEVuUEFiWnpnWTBtZ0V3QUU5bEpUMWxyc2ZmQUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsIC1vLWxpbmVhci1ncmFkaWVudCgjM2E0NjRiIDAlLCAjMmMzNDM3IDEwMCUpOyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRzVKUkVGVWVOcGk1T0RpYW1SZ1lLaGp3QTRhbVZ4OGd4am1MMXJDOFAzclZ4UThiK0VTQmhmZklBWm1OUjI5QTVldlhXZGlaR0MwMTlYU1pHQmdZR0JZdm1ZOXc3STE2eG9aR0JnYVdLQkcxUzlicys0L0F3TkRQUU1EQTF5U2dZR0JnZEVuUEFiWnpnWTBtZ0V3QUU5bEpUMWxyc2ZmQUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsIGxpbmVhci1ncmFkaWVudCgjM2E0NjRiIDAlLCAjMmMzNDM3IDEwMCUpOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQmFyIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGNvbnRlbnQtYm94OyAgICAgIC1tb3otYm94LXNpemluZzogY29udGVudC1ib3g7ICAgICAgYm94LXNpemluZzogY29udGVudC1ib3g7ICAgICAgd2lkdGg6IDE3cHg7ICAgICAgaGVpZ2h0OiAxMDAlOyAgICAgIGZsb2F0OiByaWdodDsgICAgICB0b3A6IDA7ICAgICAgcGFkZGluZzogMDsgICAgICBtYXJnaW46IDA7ICAgICAgcG9zaXRpb246IHJlbGF0aXZlOyAgICAgIGJhY2tncm91bmQ6ICMyMTI2Mjg7ICAgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KHRvIHJpZ2h0LCAjMTUxODFhIDAlLCByZ2JhKDI2LCAyOSwgMzEsIDApIDEwMCUpOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zY3JvbGxCYXIgLnRyYWNrIHsgICAgICAgIHBhZGRpbmc6IDAgM3B4IDAgMnB4OyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbEJhciAudHJhY2sgLnRodW1iIHsgICAgICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIHdpZHRoOiAxM3B4OyAgICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7ICAgICAgICAgIGN1cnNvcjogcG9pbnRlcjsgICAgICAgICAgYmFja2dyb3VuZDogIzNiNDg0ZTsgICAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogLW8tbGluZWFyLWdyYWRpZW50KCMzYTQxNDUgMCUsICMzNjNjNDAgMTAwJSk7ICAgICAgICAgIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCgjM2E0MTQ1IDAlLCAjMzYzYzQwIDEwMCUpOyAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCAjMTUxODFhOyAgICAgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgICAgICBib3gtc2hhZG93OiBpbnNldCAwIDFweCAwIDAgIzQzNGI1MDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLndyYXAgeyAgICAgIHdpZHRoOiBhdXRvOyAgICAgIGhlaWdodDogYXV0bzsgICAgICBtYXJnaW46IDA7ICAgICAgcGFkZGluZzogMDsgICAgICBwb3NpdGlvbjogcmVsYXRpdmU7ICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmlucHV0V1ByZXNldFdyYXAsICNjb250cm9sS2l0IC5wYW5lbCAuY29sb3JXUHJlc2V0V3JhcCB7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgZmxvYXQ6IGxlZnQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5pbnB1dFdQcmVzZXRXcmFwIGlucHV0W3R5cGU9J3RleHQnXSwgI2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvcldQcmVzZXRXcmFwIC5jb2xvciB7ICAgICAgcGFkZGluZy1yaWdodDogMjVweDsgICAgICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMnB4OyAgICAgIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAycHg7ICAgICAgZmxvYXQ6IGxlZnQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC50ZXh0QXJlYVdyYXAgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICB3aWR0aDogMTAwJTsgICAgICBwYWRkaW5nOiAwOyAgICAgIGZsb2F0OiBsZWZ0OyAgICAgIGhlaWdodDogMTAwJTsgICAgICBvdmVyZmxvdzogaGlkZGVuOyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICBib3JkZXI6IG5vbmU7ICAgICAgYm94LXNoYWRvdzogMCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjAxMjUpIGluc2V0LCAwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0OyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMjIyNzI5OyAgICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4wMTI1KSBpbnNldCwgMCAwIDFweCAxcHggIzExMTMxNCBpbnNldDsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCUsIHJnYmEoMCwgMCwgMCwgMC4xMjUpIDEwMCUpOyAgICAgIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwJSwgcmdiYSgwLCAwLCAwLCAwLjEyNSkgMTAwJSk7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLnRleHRBcmVhV3JhcCB0ZXh0YXJlYSB7ICAgICAgICBib3JkZXI6IG5vbmU7ICAgICAgICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMDsgICAgICAgIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAwOyAgICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgICBib3gtc2hhZG93OiBub25lOyAgICAgICAgYmFja2dyb3VuZDogbm9uZTsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAudGV4dEFyZWFXcmFwIC5zY3JvbGxCYXIgeyAgICAgICAgYm9yZGVyOiAxcHggc29saWQgIzEwMTIxMzsgICAgICAgIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAycHg7ICAgICAgICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMnB4OyAgICAgICAgYm9yZGVyLWxlZnQ6IG5vbmU7ICAgICAgICBib3gtc2hhZG93OiAwIDAgMXB4IDJweCByZ2JhKDAsIDAsIDAsIDAuMDEyNSkgaW5zZXQsIDAgMCAxcHggMXB4ICMxMTEzMTQgaW5zZXQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlclhXcmFwLCAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWVdyYXAgeyAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlclhXcmFwIHsgICAgICBib3R0b206IDA7ICAgICAgbGVmdDogMDsgICAgICB3aWR0aDogMTAwJTsgICAgICBwYWRkaW5nOiA2cHggMjBweCA2cHggNnB4OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJZV3JhcCB7ICAgICAgdG9wOiAwOyAgICAgIHJpZ2h0OiAwOyAgICAgIGhlaWdodDogMTAwJTsgICAgICBwYWRkaW5nOiA2cHggNnB4IDIwcHggNnB4OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJYLCAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWSB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICBiYWNrZ3JvdW5kOiByZ2JhKDI0LCAyNywgMjksIDAuNSk7ICAgICAgYm9yZGVyOiAxcHggc29saWQgIzE4MWIxZDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWCB7ICAgICAgaGVpZ2h0OiA4cHg7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlclkgeyAgICAgIHdpZHRoOiA4cHg7ICAgICAgaGVpZ2h0OiAxMDAlOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJYSGFuZGxlLCAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWUhhbmRsZSB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGN1cnNvcjogcG9pbnRlcjsgICAgICBib3JkZXI6IDFweCBzb2xpZCAjMTgxYjFkOyAgICAgIGJhY2tncm91bmQ6ICMzMDM2Mzk7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlclhIYW5kbGUgeyAgICAgIHdpZHRoOiAyMHB4OyAgICAgIGhlaWdodDogMTAwJTsgICAgICBib3JkZXItdG9wOiBub25lOyAgICAgIGJvcmRlci1ib3R0b206IG5vbmU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlcllIYW5kbGUgeyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIGhlaWdodDogMjBweDsgICAgICBib3JkZXItbGVmdDogbm9uZTsgICAgICBib3JkZXItcmlnaHQ6IG5vbmU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zY3JvbGxXcmFwIHsgICAgICBwb3NpdGlvbjogcmVsYXRpdmU7ICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbEJ1ZmZlciB7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgaGVpZ2h0OiA4cHg7ICAgICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICMzYjQ0NDc7ICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMxZTIyMjQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIGNhbnZhcyB7ICAgICAgY3Vyc29yOiBwb2ludGVyOyAgICAgIHZlcnRpY2FsLWFsaWduOiBib3R0b207ICAgICAgYm9yZGVyOiBub25lOyAgICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4wMTI1KSBpbnNldCwgMCAwIDFweCAxcHggIzExMTMxNCBpbnNldDsgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzYjQ0NDc7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zdmdXcmFwLCAjY29udHJvbEtpdCAucGFuZWwgLmNhbnZhc1dyYXAgeyAgICAgIG1hcmdpbjogNnB4IDAgMCAwOyAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsgICAgICB3aWR0aDogNzAlOyAgICAgIGZsb2F0OiByaWdodDsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm9yZGVyOiBub25lOyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICBiYWNrZ3JvdW5kOiAjMWUyMjI0OyAgICAgIGJhY2tncm91bmQtaW1hZ2U6IC1vLWxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwJSwgcmdiYSgwLCAwLCAwLCAwLjA1KSAxMDAlKTsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCUsIHJnYmEoMCwgMCwgMCwgMC4wNSkgMTAwJSk7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLnN2Z1dyYXAgc3ZnLCAjY29udHJvbEtpdCAucGFuZWwgLmNhbnZhc1dyYXAgc3ZnIHsgICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgICAgICAgIGxlZnQ6IDA7ICAgICAgICB0b3A6IDA7ICAgICAgICBjdXJzb3I6IHBvaW50ZXI7ICAgICAgICB2ZXJ0aWNhbC1hbGlnbjogYm90dG9tOyAgICAgICAgYm9yZGVyOiBub25lOyAgICAgICAgYm94LXNoYWRvdzogMCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjAxMjUpIGluc2V0LCAwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0OyAgICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgdWwgeyAgICAgIG1hcmdpbjogMDsgICAgICBwYWRkaW5nOiAwOyAgICAgIGxpc3Qtc3R5bGU6IG5vbmU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5oZWFkIHsgICAgICBoZWlnaHQ6IDM4cHg7ICAgICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICM1NjYxNjY7ICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMxYTFkMWY7ICAgICAgcGFkZGluZzogMCAyMHB4IDAgMTVweDsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQoIzNjNGE0ZiAwJSwgIzM4M2Y0NyAxMDAlKTsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQoIzNjNGE0ZiAwJSwgIzM4M2Y0NyAxMDAlKTsgICAgICBjdXJzb3I6IHBvaW50ZXI7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLmhlYWQgLmxhYmVsIHsgICAgICAgIGZvbnQtc2l6ZTogMTJweDsgICAgICAgIGxpbmUtaGVpZ2h0OiAzOHB4OyAgICAgICAgY29sb3I6IHdoaXRlOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5oZWFkOmhvdmVyIHsgICAgICAgIGJhY2tncm91bmQtaW1hZ2U6IC1vLWxpbmVhci1ncmFkaWVudCgjM2M0YTRmIDAlLCAjM2M0YTRmIDEwMCUpOyAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KCMzYzRhNGYgMCUsICMzYzRhNGYgMTAwJSk7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIGxpIHsgICAgICBoZWlnaHQ6IDM1cHg7ICAgICAgcGFkZGluZzogMCAxMHB4IDAgMTBweDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCB7ICAgICAgcGFkZGluZzogMTBweDsgICAgICBib3JkZXItdG9wOiAxcHggc29saWQgIzNiNDQ0NzsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzFlMjIyNDsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCB7ICAgICAgICBwYWRkaW5nOiAwOyAgICAgICAgbWFyZ2luLXRvcDogNnB4OyAgICAgICAgaGVpZ2h0OiBhdXRvOyAgICAgICAgYm9yZGVyOiAxcHggc29saWQgIzFlMjIyNDsgICAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgICAgYm94LXNoYWRvdzogMCAxcHggMCAwICMzYjQ0NDc7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCB1bCB7ICAgICAgICAgIG92ZXJmbG93OiBoaWRkZW47IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cDpmaXJzdC1jaGlsZCB7ICAgICAgICAgIG1hcmdpbi10b3A6IDA7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAuaGVhZCB7ICAgICAgICAgIGhlaWdodDogMjZweDsgICAgICAgICAgcGFkZGluZzogMCAxMHB4IDAgMTBweDsgICAgICAgICAgYm9yZGVyLXRvcDogbm9uZTsgICAgICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMxZTIyMjQ7ICAgICAgICAgIGJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDJweDsgICAgICAgICAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDJweDsgICAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogbm9uZTsgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzI1MjgyYjsgICAgICAgICAgY3Vyc29yOiBwb2ludGVyOyB9ICAgICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAuaGVhZDpob3ZlciB7ICAgICAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogbm9uZTsgICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMjIyNjI5OyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgbGk6bnRoLWNoaWxkKG9kZCkgeyAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMjkyZDMwOyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgbGk6bnRoLWNoaWxkKGV2ZW4pIHsgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzMwMzYzOTsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC5oZWFkSW5hY3RpdmUgeyAgICAgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgaGVpZ2h0OiAyNnB4OyAgICAgICAgICBwYWRkaW5nOiAwIDEwcHggMCAxMHB4OyAgICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQoIzNhNDE0NSAwJSwgIzM2M2M0MCAxMDAlKTsgICAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KCMzYTQxNDUgMCUsICMzNjNjNDAgMTAwJSk7ICAgICAgICAgIGJveC1zaGFkb3c6IDAgMXB4IDAgMCAjNDM0YjUwIGluc2V0OyAgICAgICAgICBjdXJzb3I6IHBvaW50ZXI7IH0gICAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC5oZWFkSW5hY3RpdmU6aG92ZXIgeyAgICAgICAgICAgIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7ICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzNhNDE0NTsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC5oZWFkIC5sYWJlbCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC5oZWFkSW5hY3RpdmUgLmxhYmVsIHsgICAgICAgICAgbWFyZ2luOiAwOyAgICAgICAgICBwYWRkaW5nOiAwOyAgICAgICAgICBsaW5lLWhlaWdodDogMjZweDsgICAgICAgICAgY29sb3I6IHdoaXRlOyAgICAgICAgICBmb250LXdlaWdodDogYm9sZDsgICAgICAgICAgZm9udC1zaXplOiAxMXB4OyAgICAgICAgICB0ZXh0LXNoYWRvdzogMXB4IDFweCBibGFjazsgICAgICAgICAgdGV4dC10cmFuc2Zvcm06IGNhcGl0YWxpemU7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAuaGVhZCAud3JhcCAubGFiZWwsICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAuaGVhZEluYWN0aXZlIC53cmFwIC5sYWJlbCB7ICAgICAgICAgIHdpZHRoOiAxMDAlOyAgICAgICAgICBmb250LXdlaWdodDogYm9sZDsgICAgICAgICAgY29sb3I6IHdoaXRlOyAgICAgICAgICBwYWRkaW5nOiAwOyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLndyYXAgLmxhYmVsIHsgICAgICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIGhlaWdodDogMTAwJTsgICAgICAgICAgd2lkdGg6IDMwJTsgICAgICAgICAgcGFkZGluZzogMTBweCA1cHggMCAwOyAgICAgICAgICBmbG9hdDogbGVmdDsgICAgICAgICAgZm9udC1zaXplOiAxMXB4OyAgICAgICAgICBmb250LXdlaWdodDogbm9ybWFsOyAgICAgICAgICBjb2xvcjogI2FlYjViODsgICAgICAgICAgdGV4dC1zaGFkb3c6IDFweCAxcHggYmxhY2s7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAud3JhcCAud3JhcCB7ICAgICAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICB3aWR0aDogNzAlOyAgICAgICAgICBwYWRkaW5nOiA2cHggMCAwIDA7ICAgICAgICAgIGZsb2F0OiByaWdodDsgICAgICAgICAgaGVpZ2h0OiAxMDAlOyB9ICAgICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAud3JhcCAud3JhcCAud3JhcCB7ICAgICAgICAgICAgd2lkdGg6IDI1JTsgICAgICAgICAgICBwYWRkaW5nOiAwOyAgICAgICAgICAgIGZsb2F0OiBsZWZ0OyB9ICAgICAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC53cmFwIC53cmFwIC53cmFwIC5sYWJlbCB7ICAgICAgICAgICAgICB3aWR0aDogMTAwJTsgICAgICAgICAgICAgIHBhZGRpbmc6IDRweCAwIDAgMDsgICAgICAgICAgICAgIGNvbG9yOiAjODc4Nzg3OyAgICAgICAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyOyAgICAgICAgICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTsgICAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkOyAgICAgICAgICAgICAgdGV4dC1zaGFkb3c6IDFweCAxcHggIzFhMWExYTsgfSAgICAgICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAud3JhcCAud3JhcCAud3JhcCBpbnB1dFt0eXBlPSd0ZXh0J10geyAgICAgICAgICAgICAgcGFkZGluZzogMDsgICAgICAgICAgICAgIHRleHQtYWxpZ246IGNlbnRlcjsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC53cmFwIHsgICAgICAgICAgYmFja2dyb3VuZDogIzI1MjgyYjsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC53cmFwIC53cmFwIHsgICAgICAgICAgYmFja2dyb3VuZDogbm9uZTsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5oZWFkIC53cmFwLCAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuaGVhZEluYWN0aXZlIC53cmFwIHsgICAgICAgIGJhY2tncm91bmQ6IG5vbmU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwOmxhc3QtY2hpbGQgLnN1Ykdyb3VwTGlzdCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwOmxhc3QtY2hpbGQgLnNjcm9sbEJ1ZmZlcjpudGgtb2YtdHlwZSgzKSB7ICAgICAgYm9yZGVyLWJvdHRvbTogbm9uZTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXA6bGFzdC1jaGlsZCAuc2Nyb2xsV3JhcCAuc3ViR3JvdXBMaXN0IHsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzFlMjIyNDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLndyYXBTbGlkZXIgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICB3aWR0aDogNzAlOyAgICAgIHBhZGRpbmc6IDZweCAwIDAgMDsgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgaGVpZ2h0OiAxMDAlOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwU2xpZGVyIGlucHV0W3R5cGU9J3RleHQnXSB7ICAgICAgICB3aWR0aDogMjUlOyAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyOyAgICAgICAgcGFkZGluZzogMDsgICAgICAgIGZsb2F0OiByaWdodDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnNsaWRlcldyYXAgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBmbG9hdDogbGVmdDsgICAgICBjdXJzb3I6IGV3LXJlc2l6ZTsgICAgICB3aWR0aDogNzAlOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyU2xvdCB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIGhlaWdodDogMjVweDsgICAgICBwYWRkaW5nOiAzcHg7ICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzFlMjIyNDsgICAgICBib3JkZXI6IG5vbmU7ICAgICAgYm94LXNoYWRvdzogMCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjAxMjUpIGluc2V0LCAwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0OyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnNsaWRlckhhbmRsZSB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsgICAgICB3aWR0aDogMTAwJTsgICAgICBoZWlnaHQ6IDEwMCU7ICAgICAgYmFja2dyb3VuZDogI2IzMjQzNTsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCUsIHJnYmEoMCwgMCwgMCwgMC4xKSAxMDAlKTsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCUsIHJnYmEoMCwgMCwgMCwgMC4xKSAxMDAlKTsgICAgICBib3gtc2hhZG93OiAwIDFweCAwIDAgIzBmMGYwZjsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmNhbnZhc0xpc3RJdGVtLCAjY29udHJvbEtpdCAucGFuZWwgLnN2Z0xpc3RJdGVtIHsgICAgICBwYWRkaW5nOiAwIDEwcHggMCAxMHB4OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dTTWF4IHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUc1SlJFRlVlTnBpNU9EaWFtUmdZS2hqd0E0YW1WeDhneGptTDFyQzhQM3JWeFE4YitFU0JoZmZJQVptTlIyOUE1ZXZYV2RpWkdDMDE5WFNaR0JnWUdCWXZtWTl3N0kxNnhvWkdCZ2FXS0JHMVM5YnMrNC9Bd05EUFFNREExeVNnWUdCZ2RFblBBYlp6Z1kwbWdFd0FFOWxKVDFscnNmZkFBQUFBRWxGVGtTdVFtQ0MpIGNlbnRlciBuby1yZXBlYXQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd1NNaW4geyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRnBKUkVGVWVOcHNpaUVPZ0RBTVJmOFN4Tkp6SVlmQjFQUWtRN1JrWmNmQllMbmJVQXNMNGNuM1hrZ3M2TnpYcVFBd0wrdmUzVFRHTFdjRGdLUFdkMG9zaUVSYTNGdW51TGRJcElrRmlFUTJ4dThVRW9zQlVQeGp6d0FUU2pWLzhxbE1HQUFBQUFCSlJVNUVya0pnZ2c9PSkgY2VudGVyIG5vLXJlcGVhdDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmFycm93U01heCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd1NNaW4geyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIGhlaWdodDogMjBweDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmFycm93Qk1heCB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFESkpSRUZVZU5wc3lzRU5BQ0FNQXpFMjkramhBeEtsUFNtdmVLMmFzekVJTWlISTdVZmxiQ2hKZngrM0FRQUEvLzhEQVBMa1NhbUhhc3R4QUFBQUFFbEZUa1N1UW1DQykgY2VudGVyIG5vLXJlcGVhdDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmFycm93Qk1pbiB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFDOUpSRUZVZU5xRWpERU9BQ0FRZ3hoOE9EL0gyUmhQa2s0MEFBajBtS3ZpUzJVM1RpZW4waUUzQUFBQS8vOERBRWQxTnRJQ1Y0RXVBQUFBQUVsRlRrU3VRbUNDKSBjZW50ZXIgbm8tcmVwZWF0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dCU3ViTWF4IHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBb0FBQUFHQ0FZQUFBRDY4QS9HQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUdKSlJFRlVlTnBpOUFtUFlVQUdlemF2cTJkZ1lHQnc4UTFxUkJablFWZGthZS9jQUdXaktHWlcwOUZEVVdUcDRNSWdxNkRFd01EQTRIQm8xellHSlhYTmczQ0Z5SXBnQUYweDg2UDdkeHJRRldGVHpPZ1RIdFBBd01CUXo0QWZOQUFHQU4xQ0tQczROREx2QUFBQUFFbEZUa1N1UW1DQykgY2VudGVyIG5vLXJlcGVhdDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmFycm93QlN1Yk1pbiB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQW9BQUFBR0NBWUFBQUQ2OEEvR0FBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHOUpSRUZVZU5wOHpyRU9RREFBaE9HL0dFU1lCYnRKdkFLRDFlS0JSTitzTDFOTjU3YTdpU0RpcGt2dUcwNmtXU2FCbGYvSVpKb1h5cXFock9wUFljMk9OWnE0N1hvVnZJdEFESGxSZkNFSmJISGI5UUFxZUNkQWpDZStJNEFUUG5EdzdvRUFrdGVselJwOTlmdHdEQUNmc1MwWEFiejRQd0FBQUFCSlJVNUVya0pnZ2c9PSkgY2VudGVyIG5vLXJlcGVhdDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmFycm93Qk1heCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd0JNaW4sICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dCU3ViTWF4LCAjY29udHJvbEtpdCAucGFuZWwgLmFycm93QlN1Yk1pbiB7ICAgICAgd2lkdGg6IDEwcHg7ICAgICAgaGVpZ2h0OiAxMDAlOyAgICAgIGZsb2F0OiByaWdodDsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zaXplSGFuZGxlIHsgICAgZmxvYXQ6IGxlZnQ7ICAgIHdpZHRoOiAxMHB4OyAgICBoZWlnaHQ6IDEwMHB4OyAgICBib3JkZXItbGVmdDogMSBweTsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIC5sYWJlbCwgI2NvbnRyb2xLaXQgLnBpY2tlciAubGFiZWwgeyAgICB3aWR0aDogMTAwJTsgICAgZmxvYXQ6IGxlZnQ7ICAgIGZvbnQtc2l6ZTogMTFweDsgICAgZm9udC13ZWlnaHQ6IGJvbGQ7ICAgIHRleHQtc2hhZG93OiAwIC0xcHggYmxhY2s7ICAgIG92ZXJmbG93OiBoaWRkZW47ICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7ICAgIHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzOyAgICBjdXJzb3I6IGRlZmF1bHQ7IH0gICNjb250cm9sS2l0IC5wYW5lbCAuaGVhZCwgI2NvbnRyb2xLaXQgLnBpY2tlciAuaGVhZCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5wYW5lbEhlYWRJbmFjdGl2ZSB7ICAgIGhlaWdodDogMzBweDsgICAgcGFkZGluZzogMCAxMHB4IDAgMTBweDsgICAgYmFja2dyb3VuZDogIzFhMWQxZjsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmhlYWQgLndyYXAsICNjb250cm9sS2l0IC5waWNrZXIgLmhlYWQgLndyYXAsICNjb250cm9sS2l0IC5wYW5lbCAucGFuZWxIZWFkSW5hY3RpdmUgLndyYXAgeyAgICAgIHdpZHRoOiBhdXRvOyAgICAgIGhlaWdodDogYXV0bzsgICAgICBtYXJnaW46IDA7ICAgICAgcGFkZGluZzogMDsgICAgICBwb3NpdGlvbjogcmVsYXRpdmU7ICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIC5oZWFkLCAjY29udHJvbEtpdCAucGlja2VyIC5oZWFkIHsgICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICMyMDI0MjY7ICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMTExMzE0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuaGVhZCAubGFiZWwsICNjb250cm9sS2l0IC5waWNrZXIgLmhlYWQgLmxhYmVsIHsgICAgICBjdXJzb3I6IHBvaW50ZXI7ICAgICAgbGluZS1oZWlnaHQ6IDMwcHg7ICAgICAgY29sb3I6ICM2NTY5NmI7IH0gICNjb250cm9sS2l0IC5wYW5lbCAucGFuZWxIZWFkSW5hY3RpdmUgeyAgICBib3JkZXItdG9wOiAxcHggc29saWQgIzIwMjQyNjsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IHsgICAgZmxvYXQ6IHJpZ2h0OyAgICBwYWRkaW5nOiA1cHggMCAwIDA7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IGlucHV0W3R5cGU9J2J1dHRvbiddLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IGlucHV0W3R5cGU9J2J1dHRvbiddIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgY3Vyc29yOiBwb2ludGVyOyAgICAgIGhlaWdodDogMjBweDsgICAgICBtYXJnaW4tbGVmdDogNHB4OyAgICAgIGJvcmRlcjogbm9uZTsgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgZm9udC1mYW1pbHk6IGFyaWFsLCBzYW5zLXNlcmlmOyAgICAgIGZvbnQtc2l6ZTogMTBweDsgICAgICBmb250LXdlaWdodDogYm9sZDsgICAgICBjb2xvcjogI2FhYWFhYTsgICAgICB0ZXh0LXNoYWRvdzogMCAtMXB4IGJsYWNrOyAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7ICAgICAgYm94LXNoYWRvdzogMCAwIDAgMXB4ICMxMzEzMTMgaW5zZXQsIC0xcHggMnB4IDAgMCAjMjEyNTI3IGluc2V0OyAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMjQyOTJiOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnRuSGlkZSwgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5TaG93LCAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ0bkNsb3NlLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5IaWRlLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5TaG93LCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5DbG9zZSB7ICAgICAgd2lkdGg6IDIwcHg7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5IaWRlLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5IaWRlIHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUdSSlJFRlVlTnBpZFBVTllvQ0JVMGNPMURNd01EQ1kyVGcwd3NSWWtDVmxGWlVib0d5NEltWmxkVTI0cEp5U0NnTy9vQkFEQXdPRHcvVkw1eG1rNVJRT01yOTkvUkl1Q1FQSWlsak1iQndZR0JnWUdINy8vTW1BRENTbFpSa2twV1VaQUFNQXZUc2dYQnZPc3EwQUFBQUFTVVZPUks1Q1lJST0pIDUwJSA1MCUgbm8tcmVwZWF0LCAjMWExZDFmOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5IaWRlOmhvdmVyLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5IaWRlOmhvdmVyIHsgICAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBR1JKUkVGVWVOcGlkUFVOWW9DQlUwY08xRE13TURDWTJUZzB3c1JZa0NWbEZaVWJvR3k0SW1abGRVMjRwSnlTQ2dPL29CQURBd09Edy9WTDV4bWs1UlFPTXI5OS9SSXVDUVBJaWxqTWJCd1lHQmdZR0g3Ly9NbUFEQ1NsWlJra3BXVVpBQU1BdlRzZ1hCdk9zcTBBQUFBQVNVVk9SSzVDWUlJPSkgNTAlIDUwJSBuby1yZXBlYXQsICMxMTEzMTQ7ICAgICAgICBib3gtc2hhZG93OiAwIDAgMCAxcHggIzEzMTMxMyBpbnNldCwgLTFweCAycHggMCAwICMxMjEzMTQgaW5zZXQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5TaG93LCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5TaG93IHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUZwSlJFRlVlTnBzakRFT2dDQVFCT2M0ZXFOZm9DQjh3TXJDbndrLzgyRUhXRWt3Y2F0SlpyS3lyRnNHTHY1WC9INmNxUGM0MVk5cHRWTE4wQkRUM1ZzVEVUbkZ1VmtXSUd1SUNXQkV2ZmNoQWZ6MG1xdlo0QmVlQVFEelZpTXpKeTBSWGdBQUFBQkpSVTVFcmtKZ2dnPT0pIDUwJSA1MCUgbm8tcmVwZWF0LCAjMWExZDFmOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5TaG93OmhvdmVyLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5TaG93OmhvdmVyIHsgICAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRnBKUkVGVWVOcHNqREVPZ0NBUUJPYzRlcU5mb0NCOHdNckNud2svODJFSFdFa3djYXRKWnJLeXJGc0dMdjVYL0g2Y3FQYzQxWTlwdFZMTjBCRFQzVnNURVRuRnVWa1dJR3VJQ1dCRXZmY2hBZnowbXF2WjRCZWVBUUR6VmlNekp5MFJYZ0FBQUFCSlJVNUVya0pnZ2c9PSkgNTAlIDUwJSBuby1yZXBlYXQsICMxMTEzMTQ7ICAgICAgICBib3gtc2hhZG93OiAwIDAgMCAxcHggIzEzMTMxMyBpbnNldCwgLTFweCAycHggMCAwICMxMjEzMTQgaW5zZXQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5DbG9zZSwgI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnRuQ2xvc2UgeyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUpDQVlBQUFBUFUyMHVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBUTFKUkVGVWVOcE0wRDlMQW1FQXgvSHZQWGVEVHFlWHBWZVlZanBZR1ExaEJRN1NueGZRMHBBMUZFVmJyNkZlUmdadUNiMkVvT0NnbTI2c3BvSWdpS0JRUWFJVW51Y2VXMjd3dDM2SEQvd01PK25jQW5hMVZsOWpiSUh2dFlBTmEybGx0WUpodUlIdlhWVnI5Wk1vSHBYbUZ3L3RwQ090V0N4K0wweHp2MWhlT0E1OEx3NjhwcWRuemxOcGwxREtOd3M0MEdINGtKcktYQXBoTmdaL3YyVHpCWlNVYmFBaElyTFovZjY2bTh5NHpCYUsvUFQ3WGFBQklDTHpiRGdjYk9rd0pGUUtQZElUZ2UrMUFRdzc2ZHk0MmR4dWZxNUVxRlFMZUJkQ1hQUjZIVjZlSHorTTlmcjJaOEp4WENWbEV6aU55RDNUc3E2Vmtzb3NWNVkzdGRZZFlHZnNocWVSMWprREkvRS9BTzhyWVJsd1hCcXVBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCwgIzFhMWQxZjsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnRuQ2xvc2U6aG92ZXIsICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ0bkNsb3NlOmhvdmVyIHsgICAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUpDQVlBQUFBUFUyMHVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBUTFKUkVGVWVOcE0wRDlMQW1FQXgvSHZQWGVEVHFlWHBWZVlZanBZR1ExaEJRN1NueGZRMHBBMUZFVmJyNkZlUmdadUNiMkVvT0NnbTI2c3BvSWdpS0JRUWFJVW51Y2VXMjd3dDM2SEQvd01PK25jQW5hMVZsOWpiSUh2dFlBTmEybGx0WUpodUlIdlhWVnI5Wk1vSHBYbUZ3L3RwQ090V0N4K0wweHp2MWhlT0E1OEx3NjhwcWRuemxOcGwxREtOd3M0MEdINGtKcktYQXBoTmdaL3YyVHpCWlNVYmFBaElyTFovZjY2bTh5NHpCYUsvUFQ3WGFBQklDTHpiRGdjYk9rd0pGUUtQZElUZ2UrMUFRdzc2ZHk0MmR4dWZxNUVxRlFMZUJkQ1hQUjZIVjZlSHorTTlmcjJaOEp4WENWbEV6aU55RDNUc3E2Vmtzb3NWNVkzdGRZZFlHZnNocWVSMWprREkvRS9BTzhyWVJsd1hCcXVBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCwgIzExMTMxNDsgICAgICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCAjMTMxMzEzIGluc2V0LCAtMXB4IDJweCAwIDAgIzEyMTMxNCBpbnNldDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ0blVuZG8sICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ0blVuZG8geyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUF3QUFBQUxDQVlBQUFCTGNHeGZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBWVZKUkVGVWVOcGNrRDFJVzFFWWhwOXo3cm0zb3FraHpaL3hENnRSMUVwRktlbGdobEJvblZ3S0RwYVdEbmJxMmxWRjBNSEJVYmRDcDVhQ1VpZ2RuSVNnb1VQQXFXTWxZc0dsTnRZSzFaaHp6cjFkVkc3emJ0L0w5N3g4N3ljZVR6MGxySEtwK0JKWUJIcXVyRy9BZkM1ZitBd2d3a0M1Vkh5YnlyVFBkdmRtQTlmMUJFSlFPLy9MWVdXZmsrT2ZTN2w4WWVFR0tKZUtyN05EOTlhVDZReldtSFBnRStBQU00N3JjblI0d0kvSy9xUzhUczkwZHErbE1oMVlZMWFCRnVBRjhBeVFWdXZOcnJ0OXhPS0pqeUlhdS9NT0dKcDQ5T1JoclhaaDlyN3ViZ1BQYy9uQ3IzQTM2VGpHOTMxSERZK09UeWpQNnc4QUtSMDFNdmFnY0ZxdHhvSC9nTFBUM3dleFJES3JJcmRiZDZUajlBc2hjRDBQUWFUYTNCSTVvVUZhMTNzSUFpVHd5cmQyd1dxTnFWL3VBUjNBY2NPclB5UlNiVXJYNjMvVWxiZmsrMzRGeEpkeXFkZ0VMQU8zZ0Rnd1BUQnkvM3B2Um9XQzNnTWtVbTNwU0RUNlJrcUpjbDNpeVhRUVdJczFaZ1hZVW8yMzlnNE0xc0t6MWZvN01BZHNBUHdiQUw5aGZ0dlRsTmtkQUFBQUFFbEZUa1N1UW1DQykgMjAlIDUwJSBuby1yZXBlYXQsICMxYTFkMWY7ICAgICAgcGFkZGluZzogMCA2cHggMXB4IDA7ICAgICAgd2lkdGg6IDM4cHg7ICAgICAgdmVydGljYWwtYWxpZ246IHRvcDsgICAgICB0ZXh0LWFsaWduOiBlbmQ7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ0blVuZG86aG92ZXIsICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ0blVuZG86aG92ZXIgeyAgICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQXdBQUFBTENBWUFBQUJMY0d4ZkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFZVkpSRUZVZU5wY2tEMUlXMUVZaHA5ejdybTNvcWtoeloveEQ2dFIxRXBGS2VsZ2hsQm9uVndLRHBhV0RuYnEybFZGME1IQlViZENwNWFDVWlnZG5JU2dvVVBBcVdNbFlzR2xOdFlLMVpoenpyMWRWRzd6YnQvTDk3eDg3eWNlVHowbHJIS3ArQkpZQkhxdXJHL0FmQzVmK0F3Z3drQzVWSHlieXJUUGR2ZG1BOWYxQkVKUU8vL0xZV1dmaytPZlM3bDhZZUVHS0plS3I3TkQ5OWFUNlF6V21IUGdFK0FBTTQ3cmNuUjR3SS9LL3FTOFRzOTBkcStsTWgxWVkxYUJGdUFGOEF5UVZ1dk5ycnQ5eE9LSmp5SWF1L01PR0pwNDlPUmhyWFpoOXI3dWJnUFBjL25DcjNBMzZUakc5MzFIRFkrT1R5alA2dzhBS1IwMU12YWdjRnF0eG9IL2dMUFQzd2V4UkRLcklyZGJkNlRqOUFzaGNEMFBRYVRhM0JJNW9VRmExM3NJQWlUd3lyZDJ3V3FOcVYvdUFSM0FjY09yUHlSU2JVclg2My9VbGJmayszNEZ4SmR5cWRnRUxBTzNnRGd3UFRCeS8zcHZSb1dDM2dNa1VtM3BTRFQ2UmtxSmNsM2l5WFFRV0lzMVpnWFlVbzIzOWc0TTFzS3oxZm83TUFkc0FQd2JBTDloZnR2VGxOa2RBQUFBQUVsRlRrU3VRbUNDKSAyMCUgNTAlIG5vLXJlcGVhdCwgIzExMTMxNDsgICAgICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCAjMTMxMzEzIGluc2V0LCAtMXB4IDJweCAwIDAgIzEyMTMxNCBpbnNldDsgfSAgI2NvbnRyb2xLaXQgLnBpY2tlciB7ICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMzAzNjM5OyAgICBmb250LWZhbWlseTogYXJpYWwsIHNhbnMtc2VyaWY7ICAgIGZvbnQtc2l6ZTogMTFweDsgICAgY29sb3I6IHdoaXRlOyAgICB0ZXh0LXNoYWRvdzogMXB4IDFweCBibGFjazsgICAgcG9zaXRpb246IGFic29sdXRlOyAgICB6LWluZGV4OiAyMTQ3NDgzNjMxOyAgICB3aWR0aDogMzYwcHg7ICAgIC13ZWJraXQtdG91Y2gtY2FsbG91dDogbm9uZTsgICAgLXdlYmtpdC11c2VyLXNlbGVjdDogbm9uZTsgICAgLWtodG1sLXVzZXItc2VsZWN0OiBub25lOyAgICAtbW96LXVzZXItc2VsZWN0OiBub25lOyAgICAtbXMtdXNlci1zZWxlY3Q6IG5vbmU7ICAgIHVzZXItc2VsZWN0OiBub25lOyAgICBib3gtc2hhZG93OiAwIDAgMXB4IDFweCByZ2JhKDAsIDAsIDAsIDAuMjUpOyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgY2FudmFzIHsgICAgICB2ZXJ0aWNhbC1hbGlnbjogYm90dG9tOyAgICAgIGN1cnNvcjogcG9pbnRlcjsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIC53cmFwIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgcGFkZGluZzogMTBweDsgICAgICBmbG9hdDogbGVmdDsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIC5maWVsZFdyYXAgeyAgICAgIHBhZGRpbmc6IDNweDsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXJXcmFwIHsgICAgICBwYWRkaW5nOiAzcHggMTNweCAzcHggM3B4OyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkV3JhcCwgI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyV3JhcCwgI2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXRXcmFwIHsgICAgICBoZWlnaHQ6IGF1dG87ICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsgICAgICBmbG9hdDogbGVmdDsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIC5pbnB1dFdyYXAgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3JkZXI6IDFweCBzb2xpZCAjMWUyMjI0OyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICBib3gtc2hhZG93OiAwIDFweCAwIDAgIzNiNDQ0NzsgICAgICB3aWR0aDogMTQwcHg7ICAgICAgZmxvYXQ6IHJpZ2h0OyAgICAgIHBhZGRpbmc6IDVweCAxMHB4IDFweCAwOyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0RmllbGQgeyAgICAgIHdpZHRoOiA1MCU7ICAgICAgZmxvYXQ6IHJpZ2h0OyAgICAgIG1hcmdpbi1ib3R0b206IDRweDsgfSAgICAgICNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0RmllbGQgLmxhYmVsIHsgICAgICAgIHBhZGRpbmc6IDRweCAwIDAgMDsgICAgICAgIGNvbG9yOiAjODc4Nzg3OyAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyOyAgICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTsgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkOyAgICAgICAgdGV4dC1zaGFkb3c6IDFweCAxcHggIzFhMWExYTsgICAgICAgIHdpZHRoOiA0MCU7IH0gICAgICAjY29udHJvbEtpdCAucGlja2VyIC5pbnB1dEZpZWxkIC53cmFwIHsgICAgICAgIHBhZGRpbmc6IDA7ICAgICAgICB3aWR0aDogNjAlOyAgICAgICAgaGVpZ2h0OiBhdXRvOyAgICAgICAgZmxvYXQ6IHJpZ2h0OyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLmNvbnRyb2xzV3JhcCB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIGhlaWdodDogYXV0bzsgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgcGFkZGluZzogOXB4IDAgMCAwOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuY29udHJvbHNXcmFwIGlucHV0W3R5cGU9J2J1dHRvbiddIHsgICAgICAgIGZsb2F0OiByaWdodDsgICAgICAgIHdpZHRoOiA2NXB4OyAgICAgICAgbWFyZ2luOiAwIDAgMCAxMHB4OyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLmNvbG9yQ29udHJhc3QgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3JkZXI6IG5vbmU7ICAgICAgYm94LXNoYWRvdzogMCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjAxMjUpIGluc2V0LCAwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0OyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgICAgICB3aWR0aDogMTAwJTsgICAgICBoZWlnaHQ6IDI1cHg7ICAgICAgcGFkZGluZzogM3B4OyAgICAgIHdpZHRoOiA4MCU7ICAgICAgbWFyZ2luLWJvdHRvbTogNHB4OyAgICAgIGZsb2F0OiByaWdodDsgfSAgICAgICNjb250cm9sS2l0IC5waWNrZXIgLmNvbG9yQ29udHJhc3QgZGl2IHsgICAgICAgIHdpZHRoOiA1MCU7ICAgICAgICBoZWlnaHQ6IDEwMCU7ICAgICAgICBmbG9hdDogbGVmdDsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIGlucHV0W3R5cGU9J3RleHQnXSB7ICAgICAgcGFkZGluZzogMDsgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7ICAgICAgd2lkdGg6IDYwJTsgICAgICBmbG9hdDogcmlnaHQ7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXRXcmFwOm50aC1vZi10eXBlKDMpIHsgICAgICBib3JkZXItYm90dG9tLWxlZnQtcmFkaXVzOiAwOyAgICAgIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAwOyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0V3JhcDpudGgtb2YtdHlwZSg0KSB7ICAgICAgYm9yZGVyLXRvcDogbm9uZTsgICAgICBib3JkZXItdG9wLWxlZnQtcmFkaXVzOiAwOyAgICAgIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiAwOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXRXcmFwOm50aC1vZi10eXBlKDQpIC5pbnB1dEZpZWxkIHsgICAgICAgIHdpZHRoOiAxMDAlOyB9ICAgICAgICAjY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dFdyYXA6bnRoLW9mLXR5cGUoNCkgLmlucHV0RmllbGQgLmxhYmVsIHsgICAgICAgICAgd2lkdGg6IDIwJTsgfSAgICAgICNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0V3JhcDpudGgtb2YtdHlwZSg0KSBpbnB1dFt0eXBlPSd0ZXh0J10geyAgICAgICAgd2lkdGg6IDgwJTsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIC5maWVsZFdyYXAsICNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlcldyYXAgeyAgICAgIGJhY2tncm91bmQ6ICMxZTIyMjQ7ICAgICAgYm9yZGVyOiBub25lOyAgICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4wMTI1KSBpbnNldCwgMCAwIDFweCAxcHggIzExMTMxNCBpbnNldDsgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzYjQ0NDc7ICAgICAgcG9zaXRpb246IHJlbGF0aXZlOyAgICAgIG1hcmdpbi1yaWdodDogNXB4OyB9ICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGRXcmFwIC5pbmRpY2F0b3IsICNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlcldyYXAgLmluZGljYXRvciB7ICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7ICAgICAgICBib3JkZXI6IDJweCBzb2xpZCB3aGl0ZTsgICAgICAgIGJveC1zaGFkb3c6IDAgMXB4IGJsYWNrLCAwIDFweCBibGFjayBpbnNldDsgICAgICAgIGN1cnNvcjogcG9pbnRlcjsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIC5maWVsZFdyYXAgLmluZGljYXRvciB7ICAgICAgd2lkdGg6IDhweDsgICAgICBoZWlnaHQ6IDhweDsgICAgICBsZWZ0OiA1MCU7ICAgICAgdG9wOiA1MCU7ICAgICAgYm9yZGVyLXJhZGl1czogNTAlOyAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogNTAlOyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlcldyYXAgLmluZGljYXRvciB7ICAgICAgd2lkdGg6IDE0cHg7ICAgICAgaGVpZ2h0OiAzcHg7ICAgICAgYm9yZGVyLXJhZGl1czogOHB4OyAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogOHB4OyAgICAgIGxlZnQ6IDFweDsgICAgICB0b3A6IDFweDsgfSAgICAgICNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlcldyYXAgLmluZGljYXRvcjphZnRlciB7ICAgICAgICBjb250ZW50OiAnJzsgICAgICAgIHdpZHRoOiAwOyAgICAgICAgaGVpZ2h0OiAwOyAgICAgICAgYm9yZGVyLXRvcDogNC41cHggc29saWQgdHJhbnNwYXJlbnQ7ICAgICAgICBib3JkZXItYm90dG9tOiA0LjVweCBzb2xpZCB0cmFuc3BhcmVudDsgICAgICAgIGJvcmRlci1yaWdodDogNHB4IHNvbGlkIHdoaXRlOyAgICAgICAgZmxvYXQ6IHJpZ2h0OyAgICAgICAgcG9zaXRpb246IGFic29sdXRlOyAgICAgICAgdG9wOiAtMnB4OyAgICAgICAgbGVmdDogMTlweDsgfSAgICAgICNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlcldyYXAgLmluZGljYXRvcjpiZWZvcmUgeyAgICAgICAgY29udGVudDogJyc7ICAgICAgICB3aWR0aDogMDsgICAgICAgIGhlaWdodDogMDsgICAgICAgIGJvcmRlci10b3A6IDQuNXB4IHNvbGlkIHRyYW5zcGFyZW50OyAgICAgICAgYm9yZGVyLWJvdHRvbTogNC41cHggc29saWQgdHJhbnNwYXJlbnQ7ICAgICAgICBib3JkZXItcmlnaHQ6IDRweCBzb2xpZCBibGFjazsgICAgICAgIGZsb2F0OiByaWdodDsgICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgICAgICAgIHRvcDogLTNweDsgICAgICAgIGxlZnQ6IDE5cHg7IH0gICNjb250cm9sS2l0IC5vcHRpb25zIHsgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGJvcmRlcjogMXB4IHNvbGlkICMxMzEzMTM7ICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgICAgbGVmdDogMDsgICAgdG9wOiAwOyAgICB3aWR0aDogYXV0bzsgICAgaGVpZ2h0OiBhdXRvOyAgICB6LWluZGV4OiAyMTQ3NDgzNjM4OyAgICBmb250LWZhbWlseTogYXJpYWwsIHNhbnMtc2VyaWY7ICAgIGZvbnQtc2l6ZTogMTFweDsgICAgY29sb3I6IHdoaXRlOyAgICB0ZXh0LXNoYWRvdzogMXB4IDFweCBibGFjazsgICAgYm94LXNoYWRvdzogMCAxcHggMCAwICM1NjYxNjYgaW5zZXQ7ICAgIG92ZXJmbG93OiBoaWRkZW47ICAgIGJhY2tncm91bmQtY29sb3I6ICMzYzQ5NGU7IH0gICAgI2NvbnRyb2xLaXQgLm9wdGlvbnMgdWwgeyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIGxpc3Qtc3R5bGU6IG5vbmU7ICAgICAgbWFyZ2luOiAwOyAgICAgIHBhZGRpbmc6IDA7IH0gICAgICAjY29udHJvbEtpdCAub3B0aW9ucyB1bCBsaSB7ICAgICAgICBtYXJnaW46IDA7ICAgICAgICB3aWR0aDogMTAwJTsgICAgICAgIGhlaWdodDogMjhweDsgICAgICAgIGxpbmUtaGVpZ2h0OiAyOHB4OyAgICAgICAgcGFkZGluZzogMCAyMHB4IDAgMTBweDsgICAgICAgIG92ZXJmbG93OiBoaWRkZW47ICAgICAgICB3aGl0ZS1zcGFjZTogbm9ybWFsOyAgICAgICAgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7ICAgICAgICBjdXJzb3I6IHBvaW50ZXI7IH0gICAgICAgICNjb250cm9sS2l0IC5vcHRpb25zIHVsIGxpOmhvdmVyIHsgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzFmMjMyNTsgfSAgICAgICNjb250cm9sS2l0IC5vcHRpb25zIHVsIC5saVNlbGVjdGVkIHsgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICMyOTJkMzA7IH0gICAgI2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7IH0gICAgICAjY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgbGksICNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciAubGlTZWxlY3RlZCB7ICAgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgcGFkZGluZzogMDsgICAgICAgIGhlaWdodDogMjVweDsgICAgICAgIGxpbmUtaGVpZ2h0OiAyNXB4OyAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyOyB9ICAgICAgICAjY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgbGk6aG92ZXIsICNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciAubGlTZWxlY3RlZDpob3ZlciB7ICAgICAgICAgIGJhY2tncm91bmQ6IG5vbmU7ICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkOyB9ICAgICAgI2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIC5saVNlbGVjdGVkIHsgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkOyB9XCJcbn07IFxubW9kdWxlLmV4cG9ydHMgPSBTdHlsZTsiLCJmdW5jdGlvbiBFdmVudF8oc2VuZGVyLHR5cGUsZGF0YSkge1xuICAgIHRoaXMuc2VuZGVyID0gc2VuZGVyO1xuICAgIHRoaXMudHlwZSAgID0gdHlwZTtcbiAgICB0aGlzLmRhdGEgICA9IGRhdGE7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50XzsiLCJmdW5jdGlvbiBFdmVudERpc3BhdGNoZXIoKSB7XG4gICAgdGhpcy5fbGlzdGVuZXJzID0gW107XG59XG5cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUgPSB7XG4gICAgYWRkRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gKGV2ZW50VHlwZSwgbGlzdGVuZXIsIGNhbGxiYWNrTWV0aG9kKSB7XG4gICAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudFR5cGVdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50VHlwZV0gfHwgW107XG4gICAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudFR5cGVdLnB1c2goe29iajogbGlzdGVuZXIsIG1ldGhvZDogY2FsbGJhY2tNZXRob2R9KTtcbiAgICB9LFxuXG4gICAgZGlzcGF0Y2hFdmVudDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHZhciB0eXBlID0gZXZlbnQudHlwZTtcblxuICAgICAgICBpZiAoIXRoaXMuaGFzRXZlbnRMaXN0ZW5lcih0eXBlKSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuICAgICAgICB2YXIgaSA9IC0xLCBsID0gbGlzdGVuZXJzLmxlbmd0aDtcblxuICAgICAgICB2YXIgb2JqLCBtZXRob2Q7XG5cbiAgICAgICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgICAgIG9iaiA9IGxpc3RlbmVyc1tpXS5vYmo7XG4gICAgICAgICAgICBtZXRob2QgPSBsaXN0ZW5lcnNbaV0ubWV0aG9kO1xuXG4gICAgICAgICAgICBpZiAoIW9ialttZXRob2RdKXtcbiAgICAgICAgICAgICAgICB0aHJvdyBvYmogKyAnIGhhcyBubyBtZXRob2QgJyArIG1ldGhvZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb2JqW21ldGhvZF0oZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlLCBvYmosIG1ldGhvZCkge1xuICAgICAgICBpZiAoIXRoaXMuaGFzRXZlbnRMaXN0ZW5lcih0eXBlKSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuXG4gICAgICAgIHZhciBpID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKC0taSA+IC0xKSB7XG4gICAgICAgICAgICBpZiAobGlzdGVuZXJzW2ldLm9iaiA9PSBvYmogJiYgbGlzdGVuZXJzW2ldLm1ldGhvZCA9PSBtZXRob2QpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lcnMubGVuZ3RoID09IDApe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICByZW1vdmVBbGxFdmVudExpc3RlbmVyczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9saXN0ZW5lcnMgPSBbXTtcbiAgICB9LFxuXG5cbiAgICBoYXNFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbGlzdGVuZXJzW3R5cGVdICE9IHVuZGVmaW5lZCAmJiB0aGlzLl9saXN0ZW5lcnNbdHlwZV0gIT0gbnVsbDtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RGlzcGF0Y2hlcjsiLCJ2YXIgTGF5b3V0TW9kZSA9IHtcbiAgICBMRUZUICAgOiAnbGVmdCcsXG4gICAgUklHSFQgIDogJ3JpZ2h0JyxcbiAgICBUT1AgICAgOiAndG9wJyxcbiAgICBCT1RUT00gOiAnYm90dG9tJyxcbiAgICBOT05FICAgOiAnbm9uZSdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTGF5b3V0TW9kZTsiLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L05vZGUnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9NZXRyaWMnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9kb2N1bWVudC9DU1MnKTtcbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L05vZGVFdmVudCcpO1xudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvTW91c2UnKTtcblxuLy8gL1RPRE86IEFkZCBtb3VzZW9mZnNldCAmIHJlc2V0Li5cbmZ1bmN0aW9uIFNjcm9sbEJhcihwYXJlbnROb2RlLHRhcmdldE5vZGUsd3JhcEhlaWdodCkge1xuICAgIHRoaXMuX3BhcmVudE5vZGUgPSBwYXJlbnROb2RlO1xuICAgIHRoaXMuX3RhcmdldE5vZGUgPSB0YXJnZXROb2RlO1xuICAgIHRoaXMuX3dyYXBIZWlnaHQgPSB3cmFwSGVpZ2h0O1xuXG4gICAgdmFyIHdyYXAgICA9IHRoaXMuX3dyYXBOb2RlICAgPSBuZXcgTm9kZSgpLFxuICAgICAgICBub2RlICAgPSB0aGlzLl9ub2RlICAgICAgID0gbmV3IE5vZGUoKSxcbiAgICAgICAgdHJhY2sgID0gdGhpcy5fdHJhY2tOb2RlICA9IG5ldyBOb2RlKCksXG4gICAgICAgIHRodW1iICA9IHRoaXMuX3RodW1iTm9kZSAgPSBuZXcgTm9kZSgpO1xuXG4gICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0YXJnZXROb2RlKTtcbiAgICBwYXJlbnROb2RlLmFkZENoaWxkKHdyYXApO1xuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGRBdChub2RlLDApO1xuXG4gICAgd3JhcC5hZGRDaGlsZCh0YXJnZXROb2RlKTtcbiAgICBub2RlLmFkZENoaWxkKHRyYWNrKTtcbiAgICB0cmFjay5hZGRDaGlsZCh0aHVtYik7XG5cbiAgICB3cmFwLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbFdyYXApO1xuICAgIG5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsQmFyKTtcbiAgICB0cmFjay5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCYXJUcmFjayk7XG4gICAgdGh1bWIuc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsQmFyVGh1bWIpO1xuXG4gICAgdGhpcy5fc2Nyb2xsSGVpZ2h0ID0gMDtcbiAgICB0aGlzLl9zY3JvbGxVbml0ICAgPSAwO1xuXG4gICAgdGhpcy5fc2Nyb2xsTWluICAgID0gMDtcbiAgICB0aGlzLl9zY3JvbGxNYXggICAgPSAxO1xuICAgIHRoaXMuX3Njcm9sbFBvcyAgICA9IDA7XG5cbiAgICB0aHVtYi5zZXRQb3NpdGlvblkoTWV0cmljLlNDUk9MTEJBUl9UUkFDS19QQURESU5HKTtcbiAgICB0aHVtYi5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uVGh1bWJEcmFnU3RhcnQuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLl9pc1ZhbGlkICA9IGZhbHNlO1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSBmYWxzZTtcbn1cblxuU2Nyb2xsQmFyLnByb3RvdHlwZSA9XG57XG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0YXJnZXQgPSB0aGlzLl90YXJnZXROb2RlLFxuICAgICAgICAgICAgdGh1bWIgPSB0aGlzLl90aHVtYk5vZGU7XG5cbiAgICAgICAgdmFyIHBhZGRpbmcgPSBNZXRyaWMuU0NST0xMQkFSX1RSQUNLX1BBRERJTkc7XG5cbiAgICAgICAgdmFyIHRhcmdldFdyYXBIZWlnaHQgPSB0aGlzLl93cmFwSGVpZ2h0LFxuICAgICAgICAgICAgdGFyZ2V0SGVpZ2h0ID0gdGFyZ2V0LmdldEhlaWdodCgpLFxuICAgICAgICAgICAgdHJhY2tIZWlnaHQgPSB0YXJnZXRXcmFwSGVpZ2h0IC0gcGFkZGluZyAqIDI7XG5cbiAgICAgICAgdGh1bWIuc2V0SGVpZ2h0KHRyYWNrSGVpZ2h0KTtcblxuICAgICAgICB2YXIgcmF0aW8gPSB0YXJnZXRXcmFwSGVpZ2h0IC8gdGFyZ2V0SGVpZ2h0O1xuXG4gICAgICAgIHRoaXMuX2lzVmFsaWQgPSBmYWxzZTtcblxuICAgICAgICBpZiAocmF0aW8gPiAxLjApe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRodW1iSGVpZ2h0ID0gdHJhY2tIZWlnaHQgKiByYXRpbztcblxuICAgICAgICB0aGlzLl9zY3JvbGxIZWlnaHQgPSB0cmFja0hlaWdodCAtIHRodW1iSGVpZ2h0O1xuICAgICAgICB0aGlzLl9zY3JvbGxVbml0ID0gdGFyZ2V0SGVpZ2h0IC0gdHJhY2tIZWlnaHQgLSBwYWRkaW5nICogMjtcblxuICAgICAgICB0aHVtYi5zZXRIZWlnaHQodGh1bWJIZWlnaHQpO1xuXG4gICAgICAgIHRoaXMuX2lzVmFsaWQgPSB0cnVlO1xuXG4gICAgICAgIC8qXG4gICAgICAgICB2YXIgc2Nyb2xsTWluID0gdGhpcy5fc2Nyb2xsTWluLFxuICAgICAgICAgc2Nyb2xsTWF4ID0gdGhpcy5fc2Nyb2xsTWF4LFxuICAgICAgICAgc2Nyb2xsUG9zID0gdGhpcy5fc2Nyb2xsUG9zO1xuXG4gICAgICAgICB2YXIgc2Nyb2xsUG9zTm9ybSA9IChzY3JvbGxQb3MgLSBzY3JvbGxNaW4pIC8gKHNjcm9sbE1heCAtIHNjcm9sbFBvcyk7XG4gICAgICAgICAqL1xuICAgIH0sXG5cbiAgICBfc2Nyb2xsVGh1bWI6IGZ1bmN0aW9uICh5KSB7XG4gICAgICAgIHZhciB0aHVtYiA9IHRoaXMuX3RodW1iTm9kZSxcbiAgICAgICAgICAgIHRodW1iSGVpZ2h0ID0gdGh1bWIuZ2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcy5fdHJhY2tOb2RlLFxuICAgICAgICAgICAgdHJhY2tIZWlnaHQgPSB0aGlzLl93cmFwSGVpZ2h0LFxuICAgICAgICAgICAgdHJhY2tUb3AgPSB0cmFjay5nZXRQb3NpdGlvbkdsb2JhbFkoKSxcbiAgICAgICAgICAgIHRyYWNrQ2VudGVyID0gdHJhY2tIZWlnaHQgKiAwLjU7XG5cbiAgICAgICAgdmFyIHRhcmdldCA9IHRoaXMuX3RhcmdldE5vZGU7XG5cbiAgICAgICAgdmFyIHNjcm9sbEhlaWdodCA9IHRoaXMuX3Njcm9sbEhlaWdodCxcbiAgICAgICAgICAgIHNjcm9sbFVuaXQgPSB0aGlzLl9zY3JvbGxVbml0O1xuXG4gICAgICAgIHZhciBtaW4gPSB0aGlzLl9zY3JvbGxNaW4gPSB0cmFja0NlbnRlciAtIHNjcm9sbEhlaWdodCAqIDAuNSxcbiAgICAgICAgICAgIG1heCA9IHRoaXMuX3Njcm9sbE1heCA9IHRyYWNrQ2VudGVyICsgc2Nyb2xsSGVpZ2h0ICogMC41O1xuXG4gICAgICAgIHZhciBwb3MgPSBNYXRoLm1heChtaW4sIE1hdGgubWluKHkgLSB0cmFja1RvcCwgbWF4KSk7XG5cbiAgICAgICAgdmFyIHRodW1iUG9zID0gdGhpcy5fc2Nyb2xsUG9zID0gcG9zIC0gdGh1bWJIZWlnaHQgKiAwLjUsXG4gICAgICAgICAgICB0YXJnZXRQb3MgPSAtKHBvcyAtIG1pbikgLyAobWF4IC0gbWluKSAqIHNjcm9sbFVuaXQ7XG5cbiAgICAgICAgdGh1bWIuc2V0UG9zaXRpb25ZKHRodW1iUG9zKTtcbiAgICAgICAgdGFyZ2V0LnNldFBvc2l0aW9uWSh0YXJnZXRQb3MpO1xuICAgIH0sXG5cbiAgICBfb25UaHVtYkRyYWdTdGFydDogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2lzVmFsaWQgfHwgdGhpcy5faXNEaXNhYmxlZCl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgICAgICBldmVudE1vdXNlVXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgbW91c2UgPSBNb3VzZS5nZXRJbnN0YW5jZSgpO1xuXG4gICAgICAgIC8vVE9ETzphZGRcbiAgICAgICAgdGhpcy5fc2Nyb2xsT2Zmc2V0ID0gbW91c2UuZ2V0WSgpIC0gdGhpcy5fdGh1bWJOb2RlLmdldFBvc2l0aW9uR2xvYmFsWSgpO1xuXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fc2Nyb2xsVGh1bWIobW91c2UuZ2V0WSgpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX3Njcm9sbFRodW1iKG1vdXNlLmdldFkoKSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgfSxcblxuICAgIGVuYWJsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pc0Rpc2FibGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICB9LFxuICAgIGRpc2FibGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faXNEaXNhYmxlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICB9LFxuXG4gICAgcmVzZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2Nyb2xsVGh1bWIoMCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVBcHBlYXJhbmNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLl9pc0Rpc2FibGVkKSB7XG4gICAgICAgICAgICB0aGlzLl9ub2RlLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgdGhpcy5fdGFyZ2V0Tm9kZS5zZXRQb3NpdGlvblkoMCk7XG4gICAgICAgICAgICB0aGlzLl90aHVtYk5vZGUuc2V0UG9zaXRpb25ZKE1ldHJpYy5TQ1JPTExCQVJfVFJBQ0tfUEFERElORyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9ub2RlLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpc1ZhbGlkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pc1ZhbGlkO1xuICAgIH0sXG5cbiAgICBzZXRXcmFwSGVpZ2h0OiBmdW5jdGlvbiAoaGVpZ2h0KSB7XG4gICAgICAgIHRoaXMuX3dyYXBIZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgfSxcblxuICAgIHJlbW92ZVRhcmdldE5vZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dyYXBOb2RlLnJlbW92ZUNoaWxkKHRoaXMuX3RhcmdldE5vZGUpO1xuICAgIH0sXG5cbiAgICByZW1vdmVGcm9tUGFyZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwYXJlbnROb2RlID0gdGhpcy5fcGFyZW50Tm9kZSxcbiAgICAgICAgICAgIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgICAgIHRhcmdldE5vZGUgPSB0aGlzLl90YXJnZXROb2RlO1xuXG4gICAgICAgIHJvb3ROb2RlLnJlbW92ZUNoaWxkKHRhcmdldE5vZGUpO1xuICAgICAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuX3dyYXBOb2RlKTtcbiAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChyb290Tm9kZSk7XG5cbiAgICAgICAgcmV0dXJuIHRhcmdldE5vZGU7XG4gICAgfSxcblxuICAgIGdldFdyYXBOb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93cmFwTm9kZTtcbiAgICB9LFxuICAgIGdldE5vZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX25vZGU7XG4gICAgfSxcbiAgICBnZXRUYXJnZXROb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90YXJnZXROb2RlO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2Nyb2xsQmFyOyIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBTY3JvbGxCYXIgPSByZXF1aXJlKCcuLi9jb3JlL2xheW91dC9TY3JvbGxCYXInKTtcblxuZnVuY3Rpb24gQWJzdHJhY3RHcm91cChwYXJlbnQsIHBhcmFtcykge1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0IHx8IG51bGw7XG4gICAgcGFyYW1zLmVuYWJsZSA9IHBhcmFtcy5lbmFibGUgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBwYXJhbXMuZW5hYmxlO1xuXG4gICAgdGhpcy5fcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMuX2hlaWdodCA9IHBhcmFtcy5oZWlnaHQ7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9ICFwYXJhbXMuZW5hYmxlO1xuICAgIHRoaXMuX3Njcm9sbEJhciA9IG51bGw7XG5cbiAgICB0aGlzLl9ub2RlID0gbmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pO1xuICAgIHRoaXMuX3dyYXBOb2RlID0gbmV3IE5vZGUoKTtcbiAgICB0aGlzLl9saXN0Tm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVCk7XG5cbiAgICB0aGlzLl9wYXJlbnQuZ2V0TGlzdCgpLmFkZENoaWxkKHRoaXMuX25vZGUpO1xufVxuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmFkZFNjcm9sbFdyYXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIG1heEhlaWdodCA9IHRoaXMuZ2V0TWF4SGVpZ2h0KCk7XG5cbiAgICB0aGlzLl9zY3JvbGxCYXIgPSBuZXcgU2Nyb2xsQmFyKHdyYXBOb2RlLCB0aGlzLl9saXN0Tm9kZSwgbWF4SGVpZ2h0KTtcbiAgICBpZiAodGhpcy5pc0VuYWJsZWQoKSkge1xuICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQobWF4SGVpZ2h0KTtcbiAgICB9XG59O1xuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5wcmV2ZW50U2VsZWN0RHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9wYXJlbnQucHJldmVudFNlbGVjdERyYWcoKTtcblxuICAgIGlmICghdGhpcy5oYXNTY3JvbGxXcmFwKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl93cmFwTm9kZS5nZXRFbGVtZW50KCkuc2Nyb2xsVG9wID0gMDtcbn07XG5cblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuaGFzTWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQgIT0gbnVsbDtcbn07XG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5nZXRNYXhIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbn07XG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5oYXNTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zY3JvbGxCYXIgIT0gbnVsbDtcbn07XG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5oYXNMYWJlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbGFibE5vZGUgIT0gbnVsbDtcbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IHRydWU7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmlzRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzRGlzYWJsZWQ7XG59O1xuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuaXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhdGhpcy5faXNEaXNhYmxlZDtcbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmdldExpc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xpc3ROb2RlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdEdyb3VwO1xuXG4iLCJ2YXIgQWJzdHJhY3RHcm91cCA9IHJlcXVpcmUoJy4vQWJzdHJhY3RHcm91cCcpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgU3ViR3JvdXAgPSByZXF1aXJlKCcuL1N1Ykdyb3VwJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgUGFuZWxFdmVudCA9IHJlcXVpcmUoJy4vUGFuZWxFdmVudCcpLFxuICAgIEdyb3VwRXZlbnQgPSByZXF1aXJlKCcuL0dyb3VwRXZlbnQnKTtcblxuZnVuY3Rpb24gR3JvdXAocGFyZW50LHBhcmFtcykge1xuICAgIHBhcmFtcyAgICAgICAgICAgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLmxhYmVsICAgICA9IHBhcmFtcy5sYWJlbCAgICAgfHwgbnVsbDtcbiAgICBwYXJhbXMudXNlTGFiZWxzID0gcGFyYW1zLnVzZUxhYmVscyB8fCB0cnVlO1xuICAgIHBhcmFtcy5lbmFibGUgICAgPSBwYXJhbXMuZW5hYmxlICAgICA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IHBhcmFtcy5lbmFibGU7XG5cbiAgICBBYnN0cmFjdEdyb3VwLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHRoaXMuX2NvbXBvbmVudHMgPSBbXTtcbiAgICB0aGlzLl9zdWJHcm91cHMgID0gW107XG5cbiAgICB2YXIgcm9vdE5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICBsaXN0Tm9kZSA9IHRoaXMuX2xpc3ROb2RlO1xuXG4gICAgICAgIHJvb3ROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkdyb3VwKTtcbiAgICAgICAgd3JhcE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG4gICAgICAgIGxpc3ROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLlN1Ykdyb3VwTGlzdCk7XG5cbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQobGlzdE5vZGUpO1xuXG4gICAgdmFyIGxhYmVsID0gcGFyYW1zLmxhYmVsO1xuXG4gICAgaWYobGFiZWwpe1xuICAgICAgICB2YXIgaGVhZE5vZGUgID0gbmV3IE5vZGUoKSxcbiAgICAgICAgICAgIGxhYmxXcmFwICA9IG5ldyBOb2RlKCksXG4gICAgICAgICAgICBsYWJsTm9kZSAgPSBuZXcgTm9kZShOb2RlLlNQQU4pLFxuICAgICAgICAgICAgaW5kaU5vZGUgID0gdGhpcy5faW5kaU5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgICAgICAgICBoZWFkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkKTtcbiAgICAgICAgICAgIGxhYmxXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuICAgICAgICAgICAgbGFibE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpO1xuICAgICAgICAgICAgaW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCTWF4KTtcbiAgICAgICAgICAgIGxhYmxOb2RlLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLGxhYmVsKTtcblxuICAgICAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGQoaW5kaU5vZGUpO1xuICAgICAgICAgICAgbGFibFdyYXAuYWRkQ2hpbGQobGFibE5vZGUpO1xuICAgICAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGQobGFibFdyYXApO1xuICAgICAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQoaGVhZE5vZGUpO1xuXG4gICAgICAgIGhlYWROb2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sdGhpcy5fb25IZWFkVHJpZ2dlci5iaW5kKHRoaXMpKTtcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfTElTVF9TSVpFX0NIQU5HRSx0aGlzLl9wYXJlbnQsJ29uR3JvdXBMaXN0U2l6ZUNoYW5nZScpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICB9XG5cbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgdGhpcy5hZGRTY3JvbGxXcmFwKCk7XG4gICAgfVxuXG4gICAgcm9vdE5vZGUuYWRkQ2hpbGQod3JhcE5vZGUpO1xuXG4gICAgaWYodGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIGlmKCFsYWJlbCl7XG4gICAgICAgICAgICB2YXIgYnVmZmVyVG9wID0gdGhpcy5fc2Nyb2xsQnVmZmVyVG9wID0gbmV3IE5vZGUoKTtcbiAgICAgICAgICAgICAgICBidWZmZXJUb3Auc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsQnVmZmVyKTtcblxuICAgICAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGRBdChidWZmZXJUb3AsMCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJ1ZmZlckJvdHRvbSA9IHRoaXMuX3Njcm9sbEJ1ZmZlckJvdHRvbSA9IG5ldyBOb2RlKCk7XG4gICAgICAgICAgICBidWZmZXJCb3R0b20uc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsQnVmZmVyKTtcblxuICAgICAgICByb290Tm9kZS5hZGRDaGlsZChidWZmZXJCb3R0b20pO1xuICAgIH1cblxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRV9CRUdJTiwgdGhpcywgJ29uUGFuZWxNb3ZlQmVnaW4nKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkUsIHRoaXMsICdvblBhbmVsTW92ZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsIHRoaXMsICdvblBhbmVsTW92ZUVuZCcpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfSElERSwgdGhpcywgJ29uUGFuZWxIaWRlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TSE9XLCB0aGlzLCAnb25QYW5lbFNob3cnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NDUk9MTF9XUkFQX0FEREVELCB0aGlzLCAnb25QYW5lbFNjcm9sbFdyYXBBZGRlZCcpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfU0NST0xMX1dSQVBfUkVNT1ZFRCwgdGhpcywgJ29uUGFuZWxTY3JvbGxXcmFwUmVtb3ZlZCcpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfU0laRV9DSEFOR0UsIHRoaXMsICdvblBhbmVsU2l6ZUNoYW5nZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSwgdGhpcywgJ29uV2luZG93UmVzaXplJyk7XG5cbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSx0aGlzLl9wYXJlbnQsJ29uR3JvdXBMaXN0U2l6ZUNoYW5nZScpO1xufVxuXG5Hcm91cC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEFic3RyYWN0R3JvdXAucHJvdG90eXBlKTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxNb3ZlQmVnaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0JFR0lOLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbE1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbE1vdmVFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0VORCwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTY3JvbGxXcmFwQWRkZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTY3JvbGxXcmFwUmVtb3ZlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbEhpZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5TVUJHUk9VUF9ESVNBQkxFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbFNob3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5TVUJHUk9VUF9FTkFCTEUsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoZSkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChlKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblN1Ykdyb3VwVHJpZ2dlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcblxuICAgIGlmKCF0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzY3JvbGxCYXIgPSB0aGlzLl9zY3JvbGxCYXIsXG4gICAgICAgIHdyYXBOb2RlICA9IHRoaXMuX3dyYXBOb2RlO1xuXG4gICAgdmFyIGJ1ZmZlclRvcCAgICA9IHRoaXMuX3Njcm9sbEJ1ZmZlclRvcCxcbiAgICAgICAgYnVmZmVyQm90dG9tID0gdGhpcy5fc2Nyb2xsQnVmZmVyQm90dG9tO1xuXG4gICAgc2Nyb2xsQmFyLnVwZGF0ZSgpO1xuXG4gICAgaWYgKCFzY3JvbGxCYXIuaXNWYWxpZCgpKSB7XG4gICAgICAgIHNjcm9sbEJhci5kaXNhYmxlKCk7XG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodCh3cmFwTm9kZS5nZXRDaGlsZEF0KDEpLmdldEhlaWdodCgpKTtcblxuICAgICAgICBpZiAoYnVmZmVyVG9wKXtcbiAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYnVmZmVyQm90dG9tKXtcbiAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2Nyb2xsQmFyLmVuYWJsZSgpO1xuICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQodGhpcy5nZXRNYXhIZWlnaHQoKSk7XG5cbiAgICAgICAgaWYgKGJ1ZmZlclRvcCl7XG4gICAgICAgICAgICBidWZmZXJUb3Auc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChidWZmZXJCb3R0b20pe1xuICAgICAgICAgICAgYnVmZmVyQm90dG9tLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSxudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuX29uSGVhZFRyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9ICF0aGlzLl9pc0Rpc2FibGVkO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX0xJU1RfU0laRV9DSEFOR0UsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5hZGRDb21wb25lbnQgPSBmdW5jdGlvbigpe1xuICAgIHZhciBDbGFzc18gPSBhcmd1bWVudHNbMF07XG4gICAgdmFyIGFyZ3MgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIGFyZ3Muc2hpZnQoKTtcbiAgICAgICAgYXJncy51bnNoaWZ0KHRoaXMuX2dldFN1Ykdyb3VwKCkpO1xuXG4gICAgdmFyIGluc3RhbmNlID0gT2JqZWN0LmNyZWF0ZShDbGFzc18ucHJvdG90eXBlKTtcbiAgICBDbGFzc18uYXBwbHkoaW5zdGFuY2UsYXJncyk7XG5cbiAgICB0aGlzLl9jb21wb25lbnRzLnB1c2goaW5zdGFuY2UpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLl91cGRhdGVIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZ2V0U3ViR3JvdXAoKS51cGRhdGUoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsbnVsbCkpO1xuICAgIGlmKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICB0aGlzLl9zY3JvbGxCYXIudXBkYXRlKCk7XG4gICAgfVxufTtcblxuR3JvdXAucHJvdG90eXBlLl91cGRhdGVBcHBlYXJhbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICBpbmlkTm9kZSA9IHRoaXMuX2luZGlOb2RlO1xuXG4gICAgdmFyIHNjcm9sbEJhciA9IHRoaXMuX3Njcm9sbEJhcjtcblxuICAgIHZhciBidWZmZXJUb3AgICAgPSB0aGlzLl9zY3JvbGxCdWZmZXJUb3AsXG4gICAgICAgIGJ1ZmZlckJvdHRvbSA9IHRoaXMuX3Njcm9sbEJ1ZmZlckJvdHRvbTtcblxuICAgIGlmICh0aGlzLmlzRGlzYWJsZWQoKSkge1xuICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQoMCk7XG4gICAgICAgIGlmIChpbmlkTm9kZSl7XG4gICAgICAgICAgICBpbmlkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JNaW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNjcm9sbEJhcikge1xuICAgICAgICAgICAgaWYgKGJ1ZmZlclRvcCl7XG4gICAgICAgICAgICAgICAgYnVmZmVyVG9wLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGJ1ZmZlckJvdHRvbSl7XG4gICAgICAgICAgICAgICAgYnVmZmVyQm90dG9tLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSkge1xuICAgICAgICB2YXIgbWF4SGVpZ2h0ID0gdGhpcy5nZXRNYXhIZWlnaHQoKSxcbiAgICAgICAgICAgIGxpc3RIZWlnaHQgPSB3cmFwTm9kZS5nZXRDaGlsZEF0KDEpLmdldEhlaWdodCgpO1xuXG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodChsaXN0SGVpZ2h0IDwgbWF4SGVpZ2h0ID8gbGlzdEhlaWdodCA6IG1heEhlaWdodCk7XG5cbiAgICAgICAgaWYgKHNjcm9sbEJhci5pc1ZhbGlkKCkpIHtcbiAgICAgICAgICAgIGlmIChidWZmZXJUb3Ape1xuICAgICAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYnVmZmVyQm90dG9tKXtcbiAgICAgICAgICAgICAgICBidWZmZXJCb3R0b20uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB3cmFwTm9kZS5kZWxldGVTdHlsZVByb3BlcnR5KCdoZWlnaHQnKTtcbiAgICB9XG5cbiAgICBpZiAoaW5pZE5vZGUpe1xuICAgICAgICBpbmlkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JNYXgpO1xuICAgIH1cbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vbkdyb3VwU2l6ZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG4gICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICB0aGlzLl9zY3JvbGxCYXIudXBkYXRlKCk7XG4gICAgfVxufTtcblxuR3JvdXAucHJvdG90eXBlLmFkZFN1Ykdyb3VwID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgIHRoaXMuX3N1Ykdyb3Vwcy5wdXNoKG5ldyBTdWJHcm91cCh0aGlzLCBwYXJhbXMpKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5fZ2V0U3ViR3JvdXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN1Ykdyb3VwcyA9IHRoaXMuX3N1Ykdyb3VwcztcbiAgICBpZiAoc3ViR3JvdXBzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgc3ViR3JvdXBzLnB1c2gobmV3IFN1Ykdyb3VwKHRoaXMpKTtcbiAgICB9XG4gICAgcmV0dXJuIHN1Ykdyb3Vwc1tzdWJHcm91cHMubGVuZ3RoIC0gMV07XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuZ2V0Q29tcG9uZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcG9uZW50cztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR3JvdXA7XG4iLCJ2YXIgR3JvdXBFdmVudCA9IHtcblx0R1JPVVBfU0laRV9DSEFOR0UgICAgICAgIDogJ2dyb3VwU2l6ZUNoYW5nZScsXG5cdEdST1VQX0xJU1RfU0laRV9DSEFOR0UgICA6ICdncm91cExpc3RTaXplQ2hhbmdlJyxcblx0R1JPVVBfU0laRV9VUERBVEUgICAgICAgIDogJ2dyb3VwU2l6ZVVwZGF0ZScsXG5cdFNVQkdST1VQX1RSSUdHRVIgICAgICAgICA6ICdzdWJHcm91cFRyaWdnZXInLFxuXG5cdFNVQkdST1VQX0VOQUJMRSAgICAgICAgICA6ICdlbmFibGVTdWJHcm91cCcsXG5cdFNVQkdST1VQX0RJU0FCTEUgICAgICAgICA6ICdkaXNhYmxlU3ViR3JvdXAnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwRXZlbnQ7IiwidmFyIE1lbnVFdmVudCA9IHtcblx0VVBEQVRFX01FTlU6ICd1cGRhdGVNZW51J1xufTtcbm1vZHVsZS5leHBvcnRzID0gTWVudUV2ZW50OyIsInZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyksXG4gICAgR3JvdXAgPSByZXF1aXJlKCcuL0dyb3VwJyksXG4gICAgU2Nyb2xsQmFyID0gcmVxdWlyZSgnLi4vY29yZS9sYXlvdXQvU2Nyb2xsQmFyJyk7XG5cbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIExheW91dE1vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2xheW91dC9MYXlvdXRNb2RlJyk7XG52YXIgSGlzdG9yeSA9IHJlcXVpcmUoJy4uL2NvcmUvSGlzdG9yeScpO1xuXG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcbiAgICBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgUGFuZWxFdmVudCA9IHJlcXVpcmUoJy4vUGFuZWxFdmVudCcpLFxuICAgIE1lbnVFdmVudCA9IHJlcXVpcmUoJy4vTWVudUV2ZW50Jyk7XG5cbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcblxudmFyIFBhbmVsTm9Hcm91cEVycm9yID0gcmVxdWlyZSgnLi9QYW5lbE5vR3JvdXBFcnJvcicpO1xuXG52YXIgU3RyaW5nSW5wdXQgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvU3RyaW5nSW5wdXQnKSxcbiAgICBOdW1iZXJJbnB1dCA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9OdW1iZXJJbnB1dCcpLFxuICAgIFJhbmdlID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1JhbmdlJyksXG4gICAgQ2hlY2tib3ggPSByZXF1aXJlKCcuLi9jb21wb25lbnQvQ2hlY2tib3gnKSxcbiAgICBDb2xvciA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9Db2xvcicpLFxuICAgIEJ1dHRvbiA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9CdXR0b24nKSxcbiAgICBTZWxlY3QgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvU2VsZWN0JyksXG4gICAgU2xpZGVyID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1NsaWRlcicpLFxuICAgIEZ1bmN0aW9uUGxvdHRlciA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9GdW5jdGlvblBsb3R0ZXInKSxcbiAgICBQYWQgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvUGFkJyksXG4gICAgVmFsdWVQbG90dGVyID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1ZhbHVlUGxvdHRlcicpLFxuICAgIE51bWJlck91dHB1dCA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9OdW1iZXJPdXRwdXQnKSxcbiAgICBTdHJpbmdPdXRwdXQgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvU3RyaW5nT3V0cHV0JyksXG4gICAgQ2FudmFzXyA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9DYW52YXMnKSxcbiAgICBTVkdfID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1NWRycpO1xuXG52YXIgREVGQVVMVF9QQU5FTF9QT1NJVElPTiA9IG51bGwsXG4gICAgREVGQVVMVF9QQU5FTF9XSURUSCAgICAgID0gMzAwLFxuICAgIERFRkFVTFRfUEFORUxfSEVJR0hUICAgICA9IG51bGwsXG4gICAgREVGQVVMVF9QQU5FTF9XSURUSF9NSU4gID0gMTAwLFxuICAgIERFRkFVTFRfUEFORUxfV0lEVEhfTUFYICA9IDYwMCxcbiAgICBERUZBVUxUX1BBTkVMX1JBVElPICAgICAgPSA0MCxcbiAgICBERUZBVUxUX1BBTkVMX0xBQkVMICAgICAgPSAnQ29udHJvbCBQYW5lbCcsXG4gICAgREVGQVVMVF9QQU5FTF9WQUxJR04gICAgID0gTGF5b3V0TW9kZS5UT1AsXG4gICAgREVGQVVMVF9QQU5FTF9BTElHTiAgICAgID0gTGF5b3V0TW9kZS5SSUdIVCxcbiAgICBERUZBVUxUX1BBTkVMX0RPQ0sgICAgICAgPSB7YWxpZ246TGF5b3V0TW9kZS5SSUdIVCxyZXNpemFibGU6dHJ1ZX0sXG4gICAgREVGQVVMVF9QQU5FTF9FTkFCTEUgICAgID0gdHJ1ZSxcbiAgICBERUZBVUxUX1BBTkVMX09QQUNJVFkgICAgPSAxLjAsXG4gICAgREVGQVVMVF9QQU5FTF9GSVhFRCAgICAgID0gdHJ1ZSxcbiAgICBERUZBVUxUX1BBTkVMX1ZDT05TVFJBSU4gPSB0cnVlO1xuXG5mdW5jdGlvbiBQYW5lbChjb250cm9sS2l0LHBhcmFtcyl7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcbiAgICB0aGlzLl9wYXJlbnQgPSBjb250cm9sS2l0O1xuXG5cbiAgICBwYXJhbXMgICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLnZhbGlnbiAgICAgPSBwYXJhbXMudmFsaWduICAgIHx8IERFRkFVTFRfUEFORUxfVkFMSUdOO1xuICAgIHBhcmFtcy5hbGlnbiAgICAgID0gcGFyYW1zLmFsaWduICAgICB8fCBERUZBVUxUX1BBTkVMX0FMSUdOO1xuICAgIHBhcmFtcy5wb3NpdGlvbiAgID0gcGFyYW1zLnBvc2l0aW9uICB8fCBERUZBVUxUX1BBTkVMX1BPU0lUSU9OO1xuICAgIHBhcmFtcy53aWR0aCAgICAgID0gcGFyYW1zLndpZHRoICAgICB8fCBERUZBVUxUX1BBTkVMX1dJRFRIO1xuICAgIHBhcmFtcy5oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCAgICB8fCBERUZBVUxUX1BBTkVMX0hFSUdIVDtcbiAgICBwYXJhbXMucmF0aW8gICAgICA9IHBhcmFtcy5yYXRpbyAgICAgfHwgREVGQVVMVF9QQU5FTF9SQVRJTztcbiAgICBwYXJhbXMubGFiZWwgICAgICA9IHBhcmFtcy5sYWJlbCAgICAgfHwgREVGQVVMVF9QQU5FTF9MQUJFTDtcbiAgICBwYXJhbXMub3BhY2l0eSAgICA9IHBhcmFtcy5vcGFjaXR5ICAgfHwgREVGQVVMVF9QQU5FTF9PUEFDSVRZO1xuICAgIHBhcmFtcy5maXhlZCAgICAgID0gcGFyYW1zLmZpeGVkICAgICAgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxfRklYRUQgICAgICA6IHBhcmFtcy5maXhlZDtcbiAgICBwYXJhbXMuZW5hYmxlICAgICA9IHBhcmFtcy5lbmFibGUgICAgID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1BBTkVMX0VOQUJMRSAgICAgOiBwYXJhbXMuZW5hYmxlO1xuICAgIHBhcmFtcy52Y29uc3RyYWluID0gcGFyYW1zLnZjb25zdHJhaW4gPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxfVkNPTlNUUkFJTiA6IHBhcmFtcy52Y29uc3RyYWluO1xuXG4gICAgaWYgKHBhcmFtcy5kb2NrKSB7XG4gICAgICAgIHBhcmFtcy5kb2NrLmFsaWduID0gcGFyYW1zLmRvY2suYWxpZ24gfHwgREVGQVVMVF9QQU5FTF9ET0NLLmFsaWduO1xuICAgICAgICBwYXJhbXMuZG9jay5yZXNpemFibGUgPSBwYXJhbXMuZG9jay5yZXNpemFibGUgfHwgREVGQVVMVF9QQU5FTF9ET0NLLnJlc2l6YWJsZTtcbiAgICB9XG5cbiAgICB0aGlzLl93aWR0aCAgICAgID0gTWF0aC5tYXgoREVGQVVMVF9QQU5FTF9XSURUSF9NSU4sXG4gICAgICAgICAgICAgICAgICAgICAgIE1hdGgubWluKHBhcmFtcy53aWR0aCxERUZBVUxUX1BBTkVMX1dJRFRIX01BWCkpO1xuICAgIHRoaXMuX2hlaWdodCAgICAgPSBwYXJhbXMuaGVpZ2h0ID8gIE1hdGgubWF4KDAsTWF0aC5taW4ocGFyYW1zLmhlaWdodCx3aW5kb3cuaW5uZXJIZWlnaHQpKSA6IG51bGw7XG4gICAgdGhpcy5fZml4ZWQgICAgICA9IHBhcmFtcy5maXhlZDtcbiAgICB0aGlzLl9kb2NrICAgICAgID0gcGFyYW1zLmRvY2s7XG4gICAgdGhpcy5fcG9zaXRpb24gICA9IHBhcmFtcy5wb3NpdGlvbjtcbiAgICB0aGlzLl92Q29uc3RyYWluID0gcGFyYW1zLnZjb25zdHJhaW47XG4gICAgdGhpcy5fbGFiZWwgICAgICA9IHBhcmFtcy5sYWJlbDtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gIXBhcmFtcy5lbmFibGU7XG4gICAgdGhpcy5fZ3JvdXBzICAgICA9IFtdO1xuXG5cbiAgICB2YXIgd2lkdGggICAgPSB0aGlzLl93aWR0aCxcbiAgICAgICAgaXNGaXhlZCAgPSB0aGlzLl9maXhlZCxcbiAgICAgICAgZG9jayAgICAgPSB0aGlzLl9kb2NrLFxuICAgICAgICBwb3NpdGlvbiA9IHRoaXMuX3Bvc2l0aW9uLFxuICAgICAgICBsYWJlbCAgICA9IHRoaXMuX2xhYmVsLFxuICAgICAgICBhbGlnbiAgICA9IHBhcmFtcy5hbGlnbixcbiAgICAgICAgb3BhY2l0eSAgPSBwYXJhbXMub3BhY2l0eTtcblxuXG4gICAgdmFyIHJvb3ROb2RlICA9IHRoaXMuX25vZGUgICAgID0gbmV3IE5vZGUoKSxcbiAgICAgICAgaGVhZE5vZGUgID0gdGhpcy5faGVhZE5vZGUgPSBuZXcgTm9kZSgpLFxuICAgICAgICBtZW51Tm9kZSAgPSAgICAgICAgICAgICAgICAgIG5ldyBOb2RlKCksXG4gICAgICAgIGxhYmxXcmFwICA9ICAgICAgICAgICAgICAgICAgbmV3IE5vZGUoKSxcbiAgICAgICAgbGFibE5vZGUgID0gICAgICAgICAgICAgICAgICBuZXcgTm9kZShOb2RlLlNQQU4pLFxuICAgICAgICB3cmFwTm9kZSAgPSB0aGlzLl93cmFwTm9kZSA9IG5ldyBOb2RlKE5vZGUuRElWKSxcbiAgICAgICAgbGlzdE5vZGUgID0gdGhpcy5fbGlzdE5vZGUgPSBuZXcgTm9kZShOb2RlLkxJU1QpO1xuXG4gICAgICAgIHJvb3ROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLlBhbmVsKTtcbiAgICAgICAgaGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG4gICAgICAgIG1lbnVOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnUpO1xuICAgICAgICBsYWJsV3JhcC5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcbiAgICAgICAgbGFibE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpO1xuICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcbiAgICAgICAgbGlzdE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuR3JvdXBMaXN0KTtcblxuICAgICAgICByb290Tm9kZS5zZXRXaWR0aCh3aWR0aCk7XG4gICAgICAgIGxhYmxOb2RlLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLGxhYmVsKTtcblxuICAgICAgICBoZWFkTm9kZS5hZGRDaGlsZChtZW51Tm9kZSk7XG4gICAgICAgIGxhYmxXcmFwLmFkZENoaWxkKGxhYmxOb2RlKTtcbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGQobGFibFdyYXApO1xuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChsaXN0Tm9kZSk7XG4gICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKGhlYWROb2RlKTtcbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQod3JhcE5vZGUpO1xuXG4gICAgICAgIGNvbnRyb2xLaXQuZ2V0Tm9kZSgpLmFkZENoaWxkKHJvb3ROb2RlKTtcblxuXG4gICAgaWYgKCFkb2NrKSB7XG5cbiAgICAgICAgdmFyIG1lbnVIaWRlID0gdGhpcy5fbWVudUhpZGUgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG4gICAgICAgICAgICBtZW51SGlkZS5zZXRTdHlsZUNsYXNzKENTUy5NZW51QnRuSGlkZSk7XG4gICAgICAgICAgICBtZW51SGlkZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbk1lbnVIaWRlTW91c2VEb3duLmJpbmQodGhpcykpO1xuXG4gICAgICAgIG1lbnVOb2RlLmFkZENoaWxkKG1lbnVIaWRlKTtcblxuICAgICAgICBpZiAodGhpcy5fcGFyZW50LnBhbmVsc0FyZUNsb3NhYmxlKCkpIHtcbiAgICAgICAgICAgIHZhciBtZW51Q2xvc2UgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG4gICAgICAgICAgICBtZW51Q2xvc2Uuc2V0U3R5bGVDbGFzcyhDU1MuTWVudUJ0bkNsb3NlKTtcbiAgICAgICAgICAgIG1lbnVDbG9zZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLmRpc2FibGUuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgICAgIG1lbnVOb2RlLmFkZENoaWxkKG1lbnVDbG9zZSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmICh0aGlzLmhhc01heEhlaWdodCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9hZGRTY3JvbGxXcmFwKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzRml4ZWQpIHtcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIGlmIChhbGlnbiA9PSBMYXlvdXRNb2RlLkxFRlQgfHxcbiAgICAgICAgICAgICAgICAgICAgYWxpZ24gPT0gTGF5b3V0TW9kZS5UT1AgfHxcbiAgICAgICAgICAgICAgICAgICAgYWxpZ24gPT0gTGF5b3V0TW9kZS5CT1RUT00pIHtcbiAgICAgICAgICAgICAgICAgICAgcm9vdE5vZGUuc2V0UG9zaXRpb25HbG9iYWwocG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJvb3ROb2RlLnNldFBvc2l0aW9uR2xvYmFsKHdpbmRvdy5pbm5lcldpZHRoIC0gd2lkdGggLSBwb3NpdGlvblswXSwgcG9zaXRpb25bMV0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wb3NpdGlvbiA9IHJvb3ROb2RlLmdldFBvc2l0aW9uKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB0aGlzLl9wb3NpdGlvbiA9IHJvb3ROb2RlLmdldFBvc2l0aW9uKCk7XG5cbiAgICAgICAgICAgIHRoaXMuX21vdXNlT2Zmc2V0ID0gWzAsIDBdO1xuXG4gICAgICAgICAgICByb290Tm9kZS5zZXRTdHlsZVByb3BlcnR5KCdwb3NpdGlvbicsICdhYnNvbHV0ZScpO1xuICAgICAgICAgICAgaGVhZE5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25IZWFkRHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvc2l0aW9uWCA9IHBvc2l0aW9uWzBdLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvblkgPSBwb3NpdGlvblsxXTtcblxuICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvblkgIT0gMClyb290Tm9kZS5zZXRQb3NpdGlvblkocG9zaXRpb25ZKTtcbiAgICAgICAgICAgICAgICBpZiAocG9zaXRpb25YICE9IDApaWYgKGFsaWduID09IExheW91dE1vZGUuUklHSFQpcm9vdE5vZGUuZ2V0RWxlbWVudCgpLm1hcmdpblJpZ2h0ID0gcG9zaXRpb25YO1xuICAgICAgICAgICAgICAgIGVsc2Ugcm9vdE5vZGUuc2V0UG9zaXRpb25YKHBvc2l0aW9uWCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJvb3ROb2RlLnNldFN0eWxlUHJvcGVydHkoJ2Zsb2F0JywgYWxpZ24pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgZG9ja0FsaWdubWVudCA9IGRvY2suYWxpZ247XG5cbiAgICAgICAgaWYgKGRvY2tBbGlnbm1lbnQgPT0gTGF5b3V0TW9kZS5MRUZUIHx8XG4gICAgICAgICAgICBkb2NrQWxpZ25tZW50ID09IExheW91dE1vZGUuUklHSFQpIHtcbiAgICAgICAgICAgIGFsaWduID0gZG9ja0FsaWdubWVudDtcbiAgICAgICAgICAgIHRoaXMuX2hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkb2NrQWxpZ25tZW50ID09IExheW91dE1vZGUuVE9QIHx8XG4gICAgICAgICAgICBkb2NrQWxpZ25tZW50ID09IExheW91dE1vZGUuQk9UVE9NKSB7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIC8qXG4gICAgICAgICBpZihkb2NrLnJlc2l6YWJsZSlcbiAgICAgICAgIHtcbiAgICAgICAgIHZhciBzaXplSGFuZGxlID0gbmV3IENvbnRyb2xLaXQuTm9kZShDb250cm9sS2l0Lk5vZGVUeXBlLkRJVik7XG4gICAgICAgICBzaXplSGFuZGxlLnNldFN0eWxlQ2xhc3MoQ29udHJvbEtpdC5DU1MuU2l6ZUhhbmRsZSk7XG4gICAgICAgICByb290Tm9kZS5hZGRDaGlsZChzaXplSGFuZGxlKTtcbiAgICAgICAgIH1cbiAgICAgICAgICovXG5cbiAgICAgICAgcm9vdE5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZmxvYXQnLCBhbGlnbik7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BhcmVudC5oaXN0b3J5SXNFbmFibGVkKCkpIHtcbiAgICAgICAgdmFyIG1lbnVVbmRvID0gdGhpcy5fbWVudVVuZG8gPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG4gICAgICAgICAgICBtZW51VW5kby5zZXRTdHlsZUNsYXNzKENTUy5NZW51QnRuVW5kbyk7XG4gICAgICAgICAgICBtZW51VW5kby5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIG1lbnVVbmRvLnNldFByb3BlcnR5KCd2YWx1ZScsIEhpc3RvcnkuZ2V0SW5zdGFuY2UoKS5nZXROdW1TdGF0ZXMoKSk7XG4gICAgICAgICAgICBtZW51Tm9kZS5hZGRDaGlsZEF0KG1lbnVVbmRvLCAwKTtcblxuICAgICAgICAgICAgbWVudVVuZG8uYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25NZW51VW5kb1RyaWdnZXIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBoZWFkTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9PVkVSLCB0aGlzLl9vbkhlYWRNb3VzZU92ZXIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBoZWFkTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9PVVQsIHRoaXMuX29uSGVhZE1vdXNlT3V0LmJpbmQodGhpcykpXG4gICAgfVxuXG4gICAgaWYgKG9wYWNpdHkgIT0gMS4wICYmIG9wYWNpdHkgIT0gMC4wKSB7XG4gICAgICAgIHJvb3ROb2RlLnNldFN0eWxlUHJvcGVydHkoJ29wYWNpdHknLCBvcGFjaXR5KTtcbiAgICB9XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihNZW51RXZlbnQuVVBEQVRFX01FTlUsICAgICAgdGhpcywgJ29uVXBkYXRlTWVudScpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSx0aGlzLl9vbldpbmRvd1Jlc2l6ZS5iaW5kKHRoaXMpKTtcbn1cblxuUGFuZWwucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblxuXG5QYW5lbC5wcm90b3R5cGUuX29uTWVudUhpZGVNb3VzZURvd24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9ICF0aGlzLl9pc0Rpc2FibGVkO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcm9vdE5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICBoZWFkTm9kZSA9IHRoaXMuX2hlYWROb2RlLFxuICAgICAgICBtZW51SGlkZSA9IHRoaXMuX21lbnVIaWRlO1xuXG4gICAgaWYgKHRoaXMuX2lzRGlzYWJsZWQpIHtcbiAgICAgICAgaGVhZE5vZGUuZ2V0U3R5bGUoKS5ib3JkZXJCb3R0b20gPSAnbm9uZSc7XG5cbiAgICAgICAgcm9vdE5vZGUuc2V0SGVpZ2h0KGhlYWROb2RlLmdldEhlaWdodCgpKTtcbiAgICAgICAgbWVudUhpZGUuc2V0U3R5bGVDbGFzcyhDU1MuTWVudUJ0blNob3cpO1xuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfSElERSwgbnVsbCkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcm9vdE5vZGUuc2V0SGVpZ2h0KGhlYWROb2RlLmdldEhlaWdodCgpICsgdGhpcy5fd3JhcE5vZGUuZ2V0SGVpZ2h0KCkpO1xuICAgICAgICByb290Tm9kZS5kZWxldGVTdHlsZVByb3BlcnR5KCdoZWlnaHQnKTtcbiAgICAgICAgbWVudUhpZGUuc2V0U3R5bGVDbGFzcyhDU1MuTWVudUJ0bkhpZGUpO1xuICAgICAgICBoZWFkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkKTtcblxuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NIT1csIG51bGwpKTtcbiAgICB9XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX29uSGVhZE1vdXNlT3ZlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9tZW51VW5kby5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2lubGluZScpXG59O1xuUGFuZWwucHJvdG90eXBlLl9vbkhlYWRNb3VzZU91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9tZW51VW5kby5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKVxufTtcblBhbmVsLnByb3RvdHlwZS5vblVwZGF0ZU1lbnUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fbWVudVVuZG8uc2V0UHJvcGVydHkoJ3ZhbHVlJywgSGlzdG9yeS5nZXRJbnN0YW5jZSgpLmdldE51bVN0YXRlcygpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fb25NZW51VW5kb1RyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgSGlzdG9yeS5nZXRJbnN0YW5jZSgpLnBvcFN0YXRlKCk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX29uSGVhZERyYWdTdGFydCA9IGZ1bmN0aW9uKClcbntcbiAgICB2YXIgcGFyZW50Tm9kZSA9IHRoaXMuX3BhcmVudC5nZXROb2RlKCksXG4gICAgICAgIG5vZGUgICAgICAgPSB0aGlzLl9ub2RlO1xuXG4gICAgdmFyIG5vZGVQb3MgICA9IG5vZGUuZ2V0UG9zaXRpb25HbG9iYWwoKSxcbiAgICAgICAgbW91c2VQb3MgID0gTW91c2UuZ2V0SW5zdGFuY2UoKS5nZXRQb3NpdGlvbigpLFxuICAgICAgICBvZmZzZXRQb3MgPSB0aGlzLl9tb3VzZU9mZnNldDtcblxuICAgICAgICBvZmZzZXRQb3NbMF0gPSBtb3VzZVBvc1swXSAtIG5vZGVQb3NbMF07XG4gICAgICAgIG9mZnNldFBvc1sxXSA9IG1vdXNlUG9zWzFdIC0gbm9kZVBvc1sxXTtcblxuICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRNb3VzZVVwICAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuX3VwZGF0ZVBvc2l0aW9uKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCBudWxsKSk7XG4gICAgICAgIH07XG5cbiAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGQoICAgbm9kZSk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsICAgIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgICBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0JFR0lOLG51bGwpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fdXBkYXRlUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG1vdXNlUG9zID0gTW91c2UuZ2V0SW5zdGFuY2UoKS5nZXRQb3NpdGlvbigpLFxuICAgICAgICBvZmZzZXRQb3MgPSB0aGlzLl9tb3VzZU9mZnNldDtcblxuICAgIHZhciBwb3NpdGlvbiA9IHRoaXMuX3Bvc2l0aW9uO1xuICAgIHBvc2l0aW9uWzBdID0gbW91c2VQb3NbMF0gLSBvZmZzZXRQb3NbMF07XG4gICAgcG9zaXRpb25bMV0gPSBtb3VzZVBvc1sxXSAtIG9mZnNldFBvc1sxXTtcblxuICAgIHRoaXMuX2NvbnN0cmFpbkhlaWdodCgpO1xuICAgIHRoaXMuX2NvbnN0cmFpblBvc2l0aW9uKCk7XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkUsIG51bGwpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fb25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNEb2NrZWQoKSkge1xuICAgICAgICB2YXIgZG9jayA9IHRoaXMuX2RvY2s7XG5cbiAgICAgICAgaWYgKGRvY2suYWxpZ24gPT0gTGF5b3V0TW9kZS5SSUdIVCB8fFxuICAgICAgICAgICAgZG9jay5hbGlnbiA9PSBMYXlvdXRNb2RlLkxFRlQpIHtcbiAgICAgICAgICAgIHZhciB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQsXG4gICAgICAgICAgICAgICAgbGlzdEhlaWdodCA9IHRoaXMuX2xpc3ROb2RlLmdldEhlaWdodCgpLFxuICAgICAgICAgICAgICAgIGhlYWRIZWlnaHQgPSB0aGlzLl9oZWFkTm9kZS5nZXRIZWlnaHQoKTtcblxuICAgICAgICAgICAgdGhpcy5faGVpZ2h0ID0gd2luZG93SGVpZ2h0O1xuXG4gICAgICAgICAgICBpZiAoKHdpbmRvd0hlaWdodCAtIGhlYWRIZWlnaHQpID4gbGlzdEhlaWdodCl7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLmRpc2FibGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLmVuYWJsZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NJWkVfQ0hBTkdFKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmICghdGhpcy5pc0ZpeGVkKCkpe1xuICAgICAgICAgICAgdGhpcy5fY29uc3RyYWluUG9zaXRpb24oKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9jb25zdHJhaW5IZWlnaHQoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fY29uc3RyYWluUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlO1xuXG4gICAgdmFyIG1heFggPSB3aW5kb3cuaW5uZXJXaWR0aCAtIG5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgbWF4WSA9IHdpbmRvdy5pbm5lckhlaWdodCAtIG5vZGUuZ2V0SGVpZ2h0KCk7XG5cbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbjtcbiAgICBwb3NpdGlvblswXSA9IE1hdGgubWF4KDAsIE1hdGgubWluKHBvc2l0aW9uWzBdLCBtYXhYKSk7XG4gICAgcG9zaXRpb25bMV0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihwb3NpdGlvblsxXSwgbWF4WSkpO1xuXG4gICAgbm9kZS5zZXRQb3NpdGlvbkdsb2JhbChwb3NpdGlvblswXSwgcG9zaXRpb25bMV0pO1xufTtcblxuUGFuZWwucHJvdG90eXBlLl9jb25zdHJhaW5IZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl92Q29uc3RyYWluKXJldHVybjtcblxuICAgIHZhciBoYXNNYXhIZWlnaHQgPSB0aGlzLmhhc01heEhlaWdodCgpLFxuICAgICAgICBoYXNTY3JvbGxXcmFwID0gdGhpcy5oYXNTY3JvbGxXcmFwKCk7XG5cbiAgICB2YXIgaGVhZE5vZGUgPSB0aGlzLl9oZWFkTm9kZSxcbiAgICAgICAgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcblxuICAgIHZhciBzY3JvbGxCYXIgPSB0aGlzLl9zY3JvbGxCYXI7XG5cbiAgICB2YXIgcGFuZWxUb3AgPSB0aGlzLmlzRG9ja2VkKCkgPyAwIDpcbiAgICAgICAgdGhpcy5pc0ZpeGVkKCkgPyAwIDpcbiAgICAgICAgICAgIHRoaXMuX3Bvc2l0aW9uWzFdO1xuXG4gICAgdmFyIHBhbmVsSGVpZ2h0ID0gaGFzTWF4SGVpZ2h0ID8gdGhpcy5nZXRNYXhIZWlnaHQoKSA6XG4gICAgICAgIGhhc1Njcm9sbFdyYXAgPyBzY3JvbGxCYXIuZ2V0VGFyZ2V0Tm9kZSgpLmdldEhlaWdodCgpIDpcbiAgICAgICAgICAgIHdyYXBOb2RlLmdldEhlaWdodCgpO1xuXG4gICAgdmFyIHBhbmVsQm90dG9tID0gcGFuZWxUb3AgKyBwYW5lbEhlaWdodDtcbiAgICB2YXIgaGVhZEhlaWdodCA9IGhlYWROb2RlLmdldEhlaWdodCgpO1xuXG4gICAgdmFyIHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCxcbiAgICAgICAgaGVpZ2h0RGlmZiA9IHdpbmRvd0hlaWdodCAtIHBhbmVsQm90dG9tIC0gaGVhZEhlaWdodCxcbiAgICAgICAgaGVpZ2h0U3VtO1xuXG4gICAgaWYgKGhlaWdodERpZmYgPCAwLjApIHtcbiAgICAgICAgaGVpZ2h0U3VtID0gcGFuZWxIZWlnaHQgKyBoZWlnaHREaWZmO1xuXG4gICAgICAgIGlmICghaGFzU2Nyb2xsV3JhcCkge1xuICAgICAgICAgICAgdGhpcy5fYWRkU2Nyb2xsV3JhcChoZWlnaHRTdW0pO1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9TQ1JPTExfV1JBUF9BRERFRCwgbnVsbCkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgc2Nyb2xsQmFyLnNldFdyYXBIZWlnaHQoaGVpZ2h0U3VtKTtcbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KGhlaWdodFN1bSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAoIWhhc01heEhlaWdodCAmJiBoYXNTY3JvbGxXcmFwKSB7XG4gICAgICAgICAgICBzY3JvbGxCYXIucmVtb3ZlRnJvbVBhcmVudCgpO1xuICAgICAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQodGhpcy5fbGlzdE5vZGUpO1xuICAgICAgICAgICAgd3JhcE5vZGUuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XG5cbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbEJhciA9IG51bGw7XG5cbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfU0NST0xMX1dSQVBfUkVNT1ZFRCwgbnVsbCkpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuUGFuZWwucHJvdG90eXBlLm9uR3JvdXBMaXN0U2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5oYXNTY3JvbGxXcmFwKCkpe1xuICAgICAgICB0aGlzLl91cGRhdGVTY3JvbGxXcmFwKCk7XG4gICAgfVxuICAgIHRoaXMuX2NvbnN0cmFpbkhlaWdodCgpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLl91cGRhdGVTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICBzY3JvbGxCYXIgPSB0aGlzLl9zY3JvbGxCYXIsXG4gICAgICAgIGhlaWdodCA9IHRoaXMuaGFzTWF4SGVpZ2h0KCkgP1xuICAgICAgICAgICAgdGhpcy5nZXRNYXhIZWlnaHQoKSA6IDEwMCxcbiAgICAgICAgbGlzdEhlaWdodCA9IHRoaXMuX2xpc3ROb2RlLmdldEhlaWdodCgpO1xuXG4gICAgd3JhcE5vZGUuc2V0SGVpZ2h0KGxpc3RIZWlnaHQgPCBoZWlnaHQgPyBsaXN0SGVpZ2h0IDogaGVpZ2h0KTtcblxuICAgIHNjcm9sbEJhci51cGRhdGUoKTtcblxuICAgIGlmICghc2Nyb2xsQmFyLmlzVmFsaWQoKSkge1xuICAgICAgICBzY3JvbGxCYXIuZGlzYWJsZSgpO1xuICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQod3JhcE5vZGUuZ2V0Q2hpbGRBdCgxKS5nZXRIZWlnaHQoKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzY3JvbGxCYXIuZW5hYmxlKCk7XG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodChoZWlnaHQpO1xuICAgIH1cbn07XG5cblBhbmVsLnByb3RvdHlwZS5fYWRkU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZSxcbiAgICAgICAgaGVpZ2h0ID0gYXJndW1lbnRzLmxlbmd0aCA9PSAwID9cbiAgICAgICAgICAgIHRoaXMuZ2V0TWF4SGVpZ2h0KCkgOlxuICAgICAgICAgICAgYXJndW1lbnRzWzBdO1xuXG4gICAgdGhpcy5fc2Nyb2xsQmFyID0gbmV3IFNjcm9sbEJhcih3cmFwTm9kZSwgbGlzdE5vZGUsIGhlaWdodCk7XG4gICAgaWYgKHRoaXMuaXNFbmFibGVkKCkpe1xuICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQoaGVpZ2h0KTtcbiAgICB9XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaGFzU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2Nyb2xsQmFyICE9IG51bGw7XG59O1xuXG5cblBhbmVsLnByb3RvdHlwZS5wcmV2ZW50U2VsZWN0RHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuaGFzU2Nyb2xsV3JhcCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl93cmFwTm9kZS5nZXRFbGVtZW50KCkuc2Nyb2xsVG9wID0gMDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5cblxuUGFuZWwucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gdHJ1ZTtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhdGhpcy5faXNEaXNhYmxlZDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5pc0Rpc2FibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9pc0Rpc2FibGVkO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmhhc01heEhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faGVpZ2h0ICE9IG51bGw7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0TWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaXNEb2NrZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2RvY2s7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaXNGaXhlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fZml4ZWQ7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0R3JvdXBzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9ncm91cHM7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbm9kZTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRMaXN0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9saXN0Tm9kZTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRXaWR0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fd2lkdGg7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0UG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvc2l0aW9uO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmdldFBhcmVudCA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuX3BhcmVudDtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBHcm91cCB0byB0aGUgUGFuZWwuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBHcm91cCBvcHRpb25zLlxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9J0NvbnRyb2wgUGFuZWwnXSAtIFRoZSBHcm91cCBsYWJlbCBzdHJpbmcuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtwYXJhbXMudXNlTGFiZWw9dHJ1ZV0gLSBUcmlnZ2VyIHdoZXRoZXIgYWxsIGNvbnRhaW5lZCBTdWJHcm91cHMgYW5kIENvbXBvbmVudHMgc2hvdWxkIHVzZSBsYWJlbHMuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtwYXJhbXMuZW5hYmxlPXRydWVdIC0gRGVmaW5lcyBpbml0aWFsIHN0YXRlIG9wZW4gLyBjbG9zZWQuXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5oZWlnaHQ9bnVsbF0gLSBEZWZpbmVzIGlmIHRoZSBoZWlnaHQgb2YgdGhlIEdyb3VwIHNob3VsZCBiZSBjb25zdHJhaW5lZCB0byBjZXJ0YWluIGhlaWdodC5cbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkR3JvdXAgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgdmFyIGdyb3VwID0gbmV3IEdyb3VwKHRoaXMsIHBhcmFtcyk7XG4gICAgdGhpcy5fZ3JvdXBzLnB1c2goZ3JvdXApO1xuICAgIGlmICh0aGlzLmlzRG9ja2VkKCkpe1xuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NJWkVfQ0hBTkdFKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFN1Ykdyb3VwIHRvIHRoZSBsYXN0IGFkZGVkIEdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gU3ViR3JvdXAgb3B0aW9ucy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPW51bGxdIC0gVGhlIFN1Ykdyb3VwIGxhYmVsIHN0cmluZy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy51c2VMYWJlbD10cnVlXSAtIFRyaWdnZXIgd2hldGhlciBhbGwgY29udGFpbmVkIFN1Ykdyb3VwcyBhbmQgQ29tcG9uZW50cyBzaG91bGQgdXNlIGxhYmVscy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy5lbmFibGU9dHJ1ZV0gLSBEZWZpbmVzIGluaXRpYWwgc3RhdGUgb3BlbiAvIGNsb3NlZC5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmhlaWdodD1udWxsXSAtIERlZmluZXMgaWYgdGhlIGhlaWdodCBvZiB0aGUgU3ViR3JvdXAgc2hvdWxkIGJlIGNvbnN0cmFpbmVkIHRvIGNlcnRhaW4gaGVpZ2h0LlxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRTdWJHcm91cCA9IGZ1bmN0aW9uKHBhcmFtcyl7XG4gICAgdmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcztcbiAgICBpZihncm91cHMubGVuZ3RoID09IDApe1xuICAgICAgICB0aGlzLmFkZEdyb3VwKCk7XG4gICAgfVxuICAgIGdyb3Vwc1tncm91cHMubGVuZ3RoIC0gMV0uYWRkU3ViR3JvdXAocGFyYW1zKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fYWRkQ29tcG9uZW50ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLFxuICAgICAgICBncm91cDtcbiAgICBpZihncm91cHMubGVuZ3RoID09IDApe1xuICAgICAgICBncm91cHMucHVzaChuZXcgR3JvdXAodGhpcykpO1xuICAgIH1cbiAgICBncm91cCA9IGdyb3Vwc1tncm91cHMubGVuZ3RoLTFdO1xuXG4gICAgZ3JvdXAuYWRkQ29tcG9uZW50LmFwcGx5KGdyb3VwLGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgU3RyaW5nSW5wdXQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0LlxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIFN0cmluZ0lucHV0IG9wdGlvbnMuXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBTdHJpbmdJbnB1dCBsYWJlbFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkNoYW5nZV0gLSBDYWxsYmFjayBvblxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRTdHJpbmdJbnB1dCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFN0cmluZ0lucHV0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IE51bWJlcklucHV0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9ucy5cbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkTnVtYmVySW5wdXQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChOdW1iZXJJbnB1dCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBSYW5nZSBpbnB1dCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3QuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5LlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFJhbmdlID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoUmFuZ2Usb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgQ2hlY2tib3ggdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0LlxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zLlxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRDaGVja2JveCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KENoZWNrYm94LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IENvbG9yIG1vZGlmaWVyIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9ucy5cbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkQ29sb3IgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChDb2xvcixvYmplY3QsdmFsdWUsIHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgQnV0dG9uIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge1N0cmluZ30gbGFiZWwgLSBUaGUgb2JqZWN0LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gb25QcmVzcyAtIENhbGxiYWNrLlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZEJ1dHRvbiA9IGZ1bmN0aW9uIChsYWJlbCwgb25QcmVzcywgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChCdXR0b24sbGFiZWwsb25QcmVzcyxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFNlbGVjdCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3QuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5LlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFNlbGVjdCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFNlbGVjdCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBTbGlkZXIgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0LlxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleS5cbiAqIEBwYXJhbSB7U3RyaW5nfSByYW5nZSAtIFRoZSBtaW4vbWF4IGFycmF5IGtleSB0byBiZSB1c2VkLlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFNsaWRlciA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCByYW5nZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChTbGlkZXIsb2JqZWN0LHZhbHVlLHJhbmdlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgRnVuY3Rpb25QbG90dGVyIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9ucy5cbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkRnVuY3Rpb25QbG90dGVyID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoRnVuY3Rpb25QbG90dGVyLG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFhZLVBhZCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3QuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5LlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFBhZCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFBhZCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBWYWx1ZVBsb3R0ZXIgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0LlxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zLlxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRWYWx1ZVBsb3R0ZXIgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChWYWx1ZVBsb3R0ZXIsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgTnVtYmVyT3V0cHV0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9ucy5cbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkTnVtYmVyT3V0cHV0ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoTnVtYmVyT3V0cHV0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFN0cmluZ091dHB1dCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3QuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5LlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFN0cmluZ091dHB1dCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFN0cmluZ091dHB1dCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5hZGRDYW52YXMgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChDYW52YXNfLHBhcmFtcyk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkU1ZHID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoU1ZHXyxwYXJhbXMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYW5lbDsiLCJ2YXIgUGFuZWxFdmVudCA9IHtcblx0UEFORUxfTU9WRV9CRUdJTiAgICAgICAgICA6ICdwYW5lbE1vdmVCZWdpbicsXG5cdFBBTkVMX01PVkUgICAgICAgICAgICAgICAgOiAncGFuZWxNb3ZlJyxcblx0UEFORUxfTU9WRV9FTkQgICAgICAgICAgICA6ICdwYW5lbE1vdmVFbmQnLFxuXG5cdFBBTkVMX1NIT1cgICAgICAgICAgICAgICAgOiAncGFuZWxTaG93Jyxcblx0UEFORUxfSElERSAgICAgICAgICAgICAgICA6ICdwYW5lbEhpZGUnLFxuXG5cdFBBTkVMX1NDUk9MTF9XUkFQX0FEREVEICAgOiAncGFuZWxTY3JvbGxXcmFwQWRkZWQnLFxuXHRQQU5FTF9TQ1JPTExfV1JBUF9SRU1PVkVEIDogJ3BhbmVsU2Nyb2xsV3JhcFJlbW92ZWQnLFxuXG5cdFBBTkVMX1NJWkVfQ0hBTkdFICAgICAgICA6ICdwYW5lbFNpemVDaGFuZ2UnXG59O1xubW9kdWxlLmV4cG9ydHMgPSBQYW5lbEV2ZW50OyIsImZ1bmN0aW9uIFBhbmVsTm9Hcm91cEVycm9yKCkge1xuXHRFcnJvci5hcHBseSh0aGlzKTtcblx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcyxQYW5lbE5vR3JvdXBFcnJvcik7XG5cdHRoaXMubmFtZSA9ICdQYW5lbE5vR3JvdXBFcnJvcic7XG5cdHRoaXMubWVzc2FnZSA9ICdQYW5lbCBoYXMgbm8gR3JvdXAuJztcbn1cblBhbmVsTm9Hcm91cEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcblBhbmVsTm9Hcm91cEVycm9yLmNvbnN0cnVjdG9yID0gUGFuZWxOb0dyb3VwRXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gUGFuZWxOb0dyb3VwRXJyb3I7IiwidmFyIEFic3RyYWN0R3JvdXAgPSByZXF1aXJlKCcuL0Fic3RyYWN0R3JvdXAnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgUGFuZWxFdmVudCA9IHJlcXVpcmUoJy4vUGFuZWxFdmVudCcpLFxuICAgIEdyb3VwRXZlbnQgPSByZXF1aXJlKCcuL0dyb3VwRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxuZnVuY3Rpb24gU3ViR3JvdXAocGFyZW50LHBhcmFtcyl7XG4gICAgcGFyYW1zICAgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLmxhYmVsICAgICAgPSBwYXJhbXMubGFiZWwgICAgfHwgbnVsbDtcbiAgICBwYXJhbXMudXNlTGFiZWxzICA9IHBhcmFtcy51c2VMYWJlbHMgID09PSB1bmRlZmluZWQgPyB0cnVlIDogcGFyYW1zLnVzZUxhYmVscztcblxuICAgIEFic3RyYWN0R3JvdXAuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZTtcblxuICAgICAgICByb290Tm9kZS5zZXRTdHlsZUNsYXNzKENTUy5TdWJHcm91cCk7XG4gICAgICAgIHdyYXBOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuXG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGxpc3ROb2RlKTtcbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQod3JhcE5vZGUpO1xuXG4gICAgdGhpcy5fdXNlTGFiZWxzICA9IHBhcmFtcy51c2VMYWJlbHM7XG5cbiAgICB2YXIgbGFiZWwgPSBwYXJhbXMubGFiZWw7XG5cbiAgICBpZiAobGFiZWwgJiYgbGFiZWwubGVuZ3RoICE9IDAgJiYgbGFiZWwgIT0gJ25vbmUnKSB7XG4gICAgICAgIHZhciBoZWFkTm9kZSA9IHRoaXMuX2hlYWROb2RlID0gbmV3IE5vZGUoKSxcbiAgICAgICAgICAgIGxhYmxXcmFwID0gbmV3IE5vZGUoKSxcbiAgICAgICAgICAgIGxhYmxOb2RlID0gbmV3IE5vZGUoTm9kZS5TUEFOKTtcblxuICAgICAgICBoZWFkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkKTtcbiAgICAgICAgbGFibFdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG4gICAgICAgIGxhYmxOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKTtcblxuICAgICAgICBsYWJsTm9kZS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgbGFiZWwpO1xuXG4gICAgICAgIGxhYmxXcmFwLmFkZENoaWxkKGxhYmxOb2RlKTtcbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGQobGFibFdyYXApO1xuXG5cbiAgICAgICAgdmFyIGluZGlOb2RlID0gdGhpcy5faW5kaU5vZGUgPSBuZXcgTm9kZSgpO1xuICAgICAgICBpbmRpTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JTdWJNYXgpO1xuICAgICAgICBoZWFkTm9kZS5hZGRDaGlsZEF0KGluZGlOb2RlLCAwKTtcblxuICAgICAgICByb290Tm9kZS5hZGRDaGlsZEF0KGhlYWROb2RlLCAwKTtcblxuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5TVUJHUk9VUF9UUklHR0VSLCB0aGlzLl9wYXJlbnQsICdvblN1Ykdyb3VwVHJpZ2dlcicpO1xuICAgICAgICBoZWFkTm9kZS5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25IZWFkTW91c2VEb3duLmJpbmQodGhpcykpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcblxuICAgIH1cblxuICAgIGlmKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICB0aGlzLmFkZFNjcm9sbFdyYXAoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LlNVQkdST1VQX0VOQUJMRSwgIHRoaXMsICdvbkVuYWJsZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuU1VCR1JPVVBfRElTQUJMRSwgdGhpcywgJ29uRGlzYWJsZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsICAgdGhpcywgJ29uUGFuZWxNb3ZlRW5kJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSx0aGlzLCAnb25Hcm91cFNpemVDaGFuZ2UnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NJWkVfQ0hBTkdFLHRoaXMsICdvblBhbmVsU2l6ZUNoYW5nZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSwgICAgdGhpcywgJ29uV2luZG93UmVzaXplJyk7XG5cbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSx0aGlzLl9wYXJlbnQsJ29uR3JvdXBTaXplVXBkYXRlJyk7XG59XG5cblN1Ykdyb3VwLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQWJzdHJhY3RHcm91cC5wcm90b3R5cGUpO1xuXG4vL0ZJWE1FXG5TdWJHcm91cC5wcm90b3R5cGUuX29uSGVhZE1vdXNlRG93biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gIXRoaXMuX2lzRGlzYWJsZWQ7XG4gICAgdGhpcy5fb25UcmlnZ2VyKCk7XG5cbiAgICB2YXIgZXZlbnQgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQLFxuICAgICAgICBzZWxmICA9IHRoaXM7XG4gICAgdmFyIG9uRG9jdW1lbnRNb3VzZVVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLl9vblRyaWdnZXIoKTtcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgb25Eb2N1bWVudE1vdXNlVXApO1xuICAgIH07XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LG9uRG9jdW1lbnRNb3VzZVVwKTtcbn07XG5cblN1Ykdyb3VwLnByb3RvdHlwZS5fb25UcmlnZ2VyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsR3JvdXBFdmVudC5TVUJHUk9VUF9UUklHR0VSLG51bGwpKTtcbn07XG5cblxuU3ViR3JvdXAucHJvdG90eXBlLl91cGRhdGVBcHBlYXJhbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlzRGlzYWJsZWQoKSkge1xuICAgICAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQoMCk7XG4gICAgICAgIGlmICh0aGlzLmhhc0xhYmVsKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2hlYWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWRJbmFjdGl2ZSk7XG4gICAgICAgICAgICB0aGlzLl9pbmRpTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JTdWJNaW4pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSkge1xuICAgICAgICAgICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KHRoaXMuZ2V0TWF4SGVpZ2h0KCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fd3JhcE5vZGUuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaGFzTGFiZWwoKSkge1xuICAgICAgICAgICAgdGhpcy5faGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG4gICAgICAgICAgICB0aGlzLl9pbmRpTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JTdWJNYXgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuU3ViR3JvdXAucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIHRoaXMuX3Njcm9sbEJhci51cGRhdGUoKTtcbiAgICB9XG59O1xuXG5TdWJHcm91cC5wcm90b3R5cGUub25Db21wb25lbnRTZWxlY3REcmFnID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucHJldmVudFNlbGVjdERyYWcoKTtcbn07XG5cblN1Ykdyb3VwLnByb3RvdHlwZS5vbkVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pc0Rpc2FibGVkKCkpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LkVOQUJMRSwgbnVsbCkpO1xufTtcblN1Ykdyb3VwLnByb3RvdHlwZS5vbkRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNEaXNhYmxlZCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5ESVNBQkxFLCBudWxsKSk7XG59O1xuXG4vL2J1YmJsZVxuU3ViR3JvdXAucHJvdG90eXBlLm9uR3JvdXBTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIG51bGwpKTtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUub25Hcm91cFNpemVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSwgbnVsbCkpO1xufTtcblN1Ykdyb3VwLnByb3RvdHlwZS5vblBhbmVsTW92ZUVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCBudWxsKSk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUub25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoZSkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChlKTtcbn07XG5cblN1Ykdyb3VwLnByb3RvdHlwZS5oYXNMYWJlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faGVhZE5vZGUgIT0gbnVsbDtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUuYWRkQ29tcG9uZW50Tm9kZSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgdGhpcy5fbGlzdE5vZGUuYWRkQ2hpbGQobm9kZSk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLnVzZXNMYWJlbHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3VzZUxhYmVscztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3ViR3JvdXA7Il19
(1)
});
