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
},{"./component/NumberOutput":13,"./component/Options":14,"./component/Picker":17,"./component/StringOutput":27,"./component/ValuePlotter":28,"./core/ComponentEvent":30,"./core/History":32,"./core/HistoryEvent":33,"./core/document/CSS":42,"./core/document/DocumentEvent":43,"./core/document/Mouse":44,"./core/document/Node":45,"./core/document/NodeEvent":46,"./core/document/Style":47,"./core/event/Event":48,"./core/event/EventDispatcher":49,"./group/MenuEvent":55,"./group/Panel":56}],3:[function(_dereq_,module,exports){
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

    this._onChange = params.onChange;

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
	params.presets = params.presets || DEFAULT_PRESETS;
	params.colorMode = params.colorMode || DEFAULT_COLOR_MODE;

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
    params.dp       = params.dp       || DEFAULT_INPUT_DP;
    params.step     = params.step     || DEFAULT_INPUT_STEP;
    params.presets  = params.presets  || DEFAULT_INPUT_PRESET;

    this._onChange    = params.onChange;
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
    this._onFinish     = params.onFinish || function(){};

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
    params.step     = params.step || DEFAULT_STEP;
    params.dp       = params.dp   || DEFAULT_DP;

    this._onChange  = params.onChange;

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
    this._onChange = params.onChange;

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
    params.onFinish = params.onFinish || function () {};

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

Slider_Internal.prototype._onDocumentMouseMove = function(){
    if(!this._handle.dragging){
        return;
    }
    this._update();
    this._onChange();
};

Slider_Internal.prototype._onDocumentMouseUp = function(){
    if(this._handle.dragging){
        this._onFinish();
    }
    this._handle.dragging = false;
};

Slider_Internal.prototype._onSlotMouseDown = function(){
    this._onBegin();
    this._focus = true;
    this._handle.dragging = true;
    this._handle.node.getElement().focus();
    this._update();
};

Slider_Internal.prototype._onSlotMouseUp = function(){
    if (this._focus) {
        var handle = this._handle;
        if (handle.dragging){
            this._onFinish();
        }
        handle.dragging = false;
    }
    this._focus = false;
};

Slider_Internal.prototype._update = function(){
    var mx = Mouse.getInstance().getX(),
        sx = this._slot.offsetX,
        sw = this._slot.width,
        px = (mx < sx) ? 0 : (mx > (sx + sw)) ? sw : (mx - sx);

    this._handle.node.setWidth(Math.round(px));
    this._intrpl = px / sw;
    this._interpolateValue();
};

//FIX ME
Slider_Internal.prototype._updateHandle = function(){
    var slotWidth   = this._slot.width,
        handleWidth = Math.round(this._intrpl * slotWidth);

    this._handle.node.setWidth(Math.min(handleWidth,slotWidth));
};

Slider_Internal.prototype._interpolateValue = function () {
    var intrpl = this._intrpl;
    this._value = this._bounds[0] * (1.0 - intrpl) + this._bounds[1] * intrpl;
};

Slider_Internal.prototype.resetOffset = function () {
    var slot = this._slot;
    slot.offsetX = slot.node.getPositionGlobalX();
    slot.width = Math.floor(slot.node.getWidth() - slot.padding * 2)
};

Slider_Internal.prototype.setBoundMin = function (value) {
    var bounds = this._bounds;
    if (value >= bounds[1]){
        return;
    }

    bounds[0] = value;
    this._interpolateValueRelative();
    this._updateHandle();
};

Slider_Internal.prototype.setBoundMax = function (value) {
    var bounds = this._bounds;
    if (value <= bounds[0]){
        return;
    }

    bounds[1] = value;
    this._interpolateValueRelative();
    this._updateHandle();
};

Slider_Internal.prototype._interpolateValueRelative = function () {
    var boundsMin = this._bounds[0],
        boundsMax = this._bounds[1],
        prevIntrpl = Math.abs((this._value - boundsMin) / (boundsMin - boundsMax));

    this._value = boundsMin * (1.0 - prevIntrpl) + boundsMax * prevIntrpl;
    this._intrpl = Math.abs((this._value - boundsMin) / (boundsMin - boundsMax));
};

Slider_Internal.prototype.setValue = function (value) {
    var boundsMin = this._bounds[0],
        boundsMax = this._bounds[1];

    if (value < boundsMin || value > boundsMax){
        return;
    }
    this._intrpl = Math.abs((value - boundsMin) / (boundsMin - boundsMax));
    this._updateHandle();
    this._value = value;
};

Slider_Internal.prototype.getValue = function () {
    return this._value;
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
    params.presets  = params.presets  || DEFAULT_PRESET;

    this._onChange   = params.onChange;

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
var Node = _dereq_('./document/Node'),
    CSS = _dereq_('./document/CSS');
var EventDispatcher = _dereq_('./event/EventDispatcher'),
    ComponentEvent = _dereq_('./ComponentEvent');

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
},{"./ComponentEvent":30,"./document/CSS":42,"./document/Node":45,"./event/EventDispatcher":49}],30:[function(_dereq_,module,exports){
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
	string : "/*------------------------------------------------------------------------------------- * Panel *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Components *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Canvas *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * ScrollBar *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Group & subGroup *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Menu *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Options *-------------------------------------------------------------------------------------*//*------------------------------------------------------------------------------------- * Picker *-------------------------------------------------------------------------------------*/body {  margin: 0;  padding: 0; }#controlKit {  position: absolute;  top: 0;  left: 0;  width: 100%;  height: 100%;  -webkit-user-select: none;  user-select: none;  pointer-events: none; }  #controlKit * {    outline: 0; }  #controlKit .panel input[type='text'],  #controlKit .panel textarea,  #controlKit .panel .color,  #controlKit .picker input[type='text'] {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    height: 25px;    width: 100%;    padding: 0 0 0 8px;    font-family: arial, sans-serif;    font-size: 11px;    color: white;    text-shadow: 1px 1px black;    background: #222729;    background-image: -o-linear-gradient(transparent 0%, rgba(0, 0, 0, 0.125) 100%);    background-image: linear-gradient(transparent 0%, rgba(0, 0, 0, 0.125) 100%);    border: none;    box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;    border-radius: 2px;    -moz-border-radius: 2px;    border-bottom: 1px solid #3b4447;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -o-user-select: none; }  #controlKit .panel .color {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    width: 100%;    height: 25px;    line-height: 25px;    background: #fff;    text-align: center;    padding: 0;    -webkit-touch-callout: none;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none;    cursor: pointer;    border: none;    box-shadow: 0 0 0 1px #111314 inset;    border-radius: 2px;    -moz-border-radius: 2px;    border-bottom: 1px solid #3b4447; }  #controlKit .panel .button,  #controlKit .picker .button,  #controlKit .panel .select,  #controlKit .panel .selectActive {    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    width: 100%;    height: 26px;    margin: -2px 0 0 0;    cursor: pointer;    background: #3c494e;    background-image: -o-linear-gradient(rgba(34, 39, 41, 0) 0%, rgba(34, 39, 41, 0.65) 100%);    background-image: linear-gradient(rgba(34, 39, 41, 0) 0%, rgba(34, 39, 41, 0.65) 100%);    font-family: arial, sans-serif;    color: white;    border: none;    border-radius: 2px;    -moz-border-radius: 2px;    box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #323a44 inset;    border-bottom: 1px solid #3b4447;    outline: 0; }  #controlKit .panel .button, #controlKit .picker .button {    font-size: 10px;    font-weight: bold;    text-shadow: 0 -1px black;    text-transform: uppercase; }    #controlKit .panel .button:hover, #controlKit .picker .button:hover {      background-image: none; }    #controlKit .panel .button:active, #controlKit .picker .button:active {      background-image: -o-linear-gradient(rgba(0, 0, 0, 0.1) 0%, transparent 100%);      background-image: linear-gradient(rgba(0, 0, 0, 0.1) 0%, transparent 100%); }  #controlKit .panel {    pointer-events: auto;    position: relative;    z-index: 1;    margin: 0;    padding: 0;    width: 300px;    background-color: #303639;    box-shadow: 0 0 1px 1px rgba(0, 0, 0, 0.25);    font-family: arial, sans-serif;    -webkit-touch-callout: none;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none;    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    border-radius: 2px;    -moz-border-radius: 2px;    overflow: hidden;    opacity: 1.0;    float: left; }    #controlKit .panel textarea {      padding: 5px 8px 2px 8px;      overflow: hidden;      resize: none;      vertical-align: top;      white-space: nowrap; }    #controlKit .panel input[type='checkbox'] {      margin: 5px 0 0 0; }    #controlKit .panel .select, #controlKit .panel .selectActive {      padding-left: 10px;      padding-right: 20px;      font-size: 11px;      text-align: left;      text-shadow: 1px 1px black;      cursor: pointer;      overflow: hidden;      white-space: nowrap;      text-overflow: ellipsis; }    #controlKit .panel .select {      background: url(data:image/png;base64,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) 100% 50% no-repeat, -o-linear-gradient(#3a464b 0%, rgba(44, 52, 55, 0) 100%);      background: url(data:image/png;base64,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) 100% 50% no-repeat, linear-gradient(#3a464b 0%, rgba(44, 52, 55, 0) 100%); }    #controlKit .panel .select:hover, #controlKit .panel .selectActive {      background: url(data:image/png;base64,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) 100% 50% no-repeat, #3c494e; }    #controlKit .panel .presetBtn, #controlKit .panel .presetBtnActive {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      position: absolute;      right: 0;      width: 20px;      height: 25px;      margin: 0 0 0 0;      cursor: pointer;      float: right;      border: none;      border-top-right-radius: 2px;      border-bottom-right-radius: 2px;      box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #323a44 inset;      border-bottom: 1px solid #3b4447; }    #controlKit .panel .presetBtnActive, #controlKit .panel .presetBtn:hover {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #3c494e; }    #controlKit .panel .presetBtn {      background: url(data:image/png;base64,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) 50% 50% no-repeat, -o-linear-gradient(#3a464b 0%, #2c3437 100%);      background: url(data:image/png;base64,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) 50% 50% no-repeat, linear-gradient(#3a464b 0%, #2c3437 100%); }    #controlKit .panel .scrollBar {      -webkit-box-sizing: content-box;      -moz-box-sizing: content-box;      box-sizing: content-box;      width: 17px;      height: 100%;      float: right;      top: 0;      padding: 0;      margin: 0;      position: relative;      background: #212628;      background-image: linear-gradient(to right, #15181a 0%, rgba(26, 29, 31, 0) 100%); }      #controlKit .panel .scrollBar .track {        padding: 0 3px 0 2px; }        #controlKit .panel .scrollBar .track .thumb {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          width: 13px;          position: absolute;          cursor: pointer;          background: #3b484e;          background-image: -o-linear-gradient(#3a4145 0%, #363c40 100%);          background-image: linear-gradient(#3a4145 0%, #363c40 100%);          border: 1px solid #15181a;          border-radius: 2px;          -moz-border-radius: 2px;          box-shadow: inset 0 1px 0 0 #434b50; }    #controlKit .panel .wrap {      width: auto;      height: auto;      margin: 0;      padding: 0;      position: relative;      overflow: hidden; }    #controlKit .panel .inputWPresetWrap, #controlKit .panel .colorWPresetWrap {      width: 100%;      float: left; }    #controlKit .panel .inputWPresetWrap input[type='text'], #controlKit .panel .colorWPresetWrap .color {      padding-right: 25px;      border-top-right-radius: 2px;      border-bottom-right-radius: 2px;      float: left; }    #controlKit .panel .textAreaWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 100%;      padding: 0;      float: left;      height: 100%;      overflow: hidden;      border-radius: 2px;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447;      background-color: #222729;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      background-image: -o-linear-gradient(transparent 0%, rgba(0, 0, 0, 0.125) 100%);      background-image: linear-gradient(transparent 0%, rgba(0, 0, 0, 0.125) 100%); }      #controlKit .panel .textAreaWrap textarea {        border: none;        border-top-right-radius: 0;        border-bottom-right-radius: 0;        border-radius: 2px;        -moz-border-radius: 2px;        box-shadow: none;        background: none; }      #controlKit .panel .textAreaWrap .scrollBar {        border: 1px solid #101213;        border-bottom-right-radius: 2px;        border-top-right-radius: 2px;        border-left: none;        box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset; }    #controlKit .panel .graphSliderXWrap, #controlKit .panel .graphSliderYWrap {      position: absolute;      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box; }    #controlKit .panel .graphSliderXWrap {      bottom: 0;      left: 0;      width: 100%;      padding: 6px 20px 6px 6px; }    #controlKit .panel .graphSliderYWrap {      top: 0;      right: 0;      height: 100%;      padding: 6px 6px 20px 6px; }    #controlKit .panel .graphSliderX, #controlKit .panel .graphSliderY {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border-radius: 2px;      -moz-border-radius: 2px;      background: rgba(24, 27, 29, 0.5);      border: 1px solid #181b1d; }    #controlKit .panel .graphSliderX {      height: 8px; }    #controlKit .panel .graphSliderY {      width: 8px;      height: 100%; }    #controlKit .panel .graphSliderXHandle, #controlKit .panel .graphSliderYHandle {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      cursor: pointer;      border: 1px solid #181b1d;      background: #303639; }    #controlKit .panel .graphSliderXHandle {      width: 20px;      height: 100%;      border-top: none;      border-bottom: none; }    #controlKit .panel .graphSliderYHandle {      width: 100%;      height: 20px;      border-left: none;      border-right: none; }    #controlKit .panel .scrollWrap {      position: relative;      overflow: hidden; }    #controlKit .panel .scrollBuffer {      width: 100%;      height: 8px;      border-top: 1px solid #3b4447;      border-bottom: 1px solid #1e2224; }    #controlKit .panel canvas {      cursor: pointer;      vertical-align: bottom;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447; }    #controlKit .panel .svgWrap, #controlKit .panel .canvasWrap {      margin: 6px 0 0 0;      position: relative;      width: 70%;      float: right;      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border: none;      border-radius: 2px;      -moz-border-radius: 2px;      background: #1e2224;      background-image: -o-linear-gradient(transparent 0%, rgba(0, 0, 0, 0.05) 100%);      background-image: linear-gradient(transparent 0%, rgba(0, 0, 0, 0.05) 100%); }      #controlKit .panel .svgWrap svg, #controlKit .panel .canvasWrap svg {        position: absolute;        left: 0;        top: 0;        cursor: pointer;        vertical-align: bottom;        border: none;        box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;        border-radius: 2px;        -moz-border-radius: 2px;        border-bottom: 1px solid #3b4447; }    #controlKit .panel ul {      margin: 0;      padding: 0;      list-style: none; }    #controlKit .panel .groupList .group .head {      height: 38px;      border-top: 1px solid #566166;      border-bottom: 1px solid #1a1d1f;      padding: 0 20px 0 15px;      background-image: -o-linear-gradient(#3c4a4f 0%, #383f47 100%);      background-image: linear-gradient(#3c4a4f 0%, #383f47 100%);      cursor: pointer; }      #controlKit .panel .groupList .group .head .label {        font-size: 12px;        line-height: 38px;        color: white; }      #controlKit .panel .groupList .group .head:hover {        background-image: -o-linear-gradient(#3c4a4f 0%, #3c4a4f 100%);        background-image: linear-gradient(#3c4a4f 0%, #3c4a4f 100%); }    #controlKit .panel .groupList .group li {      height: 35px;      padding: 0 10px 0 10px; }    #controlKit .panel .groupList .group .subGroupList {      padding: 10px;      border-top: 1px solid #3b4447;      border-bottom: 1px solid #1e2224; }      #controlKit .panel .groupList .group .subGroupList .subGroup {        padding: 0;        margin-top: 6px;        height: auto;        border: 1px solid #1e2224;        border-radius: 2px;        -moz-border-radius: 2px;        box-shadow: 0 1px 0 0 #3b4447; }        #controlKit .panel .groupList .group .subGroupList .subGroup ul {          overflow: hidden; }        #controlKit .panel .groupList .group .subGroupList .subGroup:first-child {          margin-top: 0; }        #controlKit .panel .groupList .group .subGroupList .subGroup .head {          height: 26px;          padding: 0 10px 0 10px;          border-top: none;          border-bottom: 1px solid #1e2224;          border-top-left-radius: 2px;          border-top-right-radius: 2px;          background-image: none;          background-color: #25282b;          cursor: pointer; }          #controlKit .panel .groupList .group .subGroupList .subGroup .head:hover {            background-image: none;            background-color: #222629; }        #controlKit .panel .groupList .group .subGroupList .subGroup li:nth-child(odd) {          background-color: #292d30; }        #controlKit .panel .groupList .group .subGroupList .subGroup li:nth-child(even) {          background-color: #303639; }        #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          height: 26px;          padding: 0 10px 0 10px;          background-image: -o-linear-gradient(#3a4145 0%, #363c40 100%);          background-image: linear-gradient(#3a4145 0%, #363c40 100%);          box-shadow: 0 1px 0 0 #434b50 inset;          cursor: pointer; }          #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive:hover {            background-image: none;            background-color: #3a4145; }        #controlKit .panel .groupList .group .subGroupList .subGroup .head .label, #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive .label {          margin: 0;          padding: 0;          line-height: 26px;          color: white;          font-weight: bold;          font-size: 11px;          text-shadow: 1px 1px black;          text-transform: capitalize; }        #controlKit .panel .groupList .group .subGroupList .subGroup .head .wrap .label, #controlKit .panel .groupList .group .subGroupList .subGroup .headInactive .wrap .label {          width: 100%;          font-weight: bold;          color: white;          padding: 0; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .label {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          height: 100%;          width: 30%;          padding: 10px 5px 0 0;          float: left;          font-size: 11px;          font-weight: normal;          color: #aeb5b8;          text-shadow: 1px 1px black; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap {          -webkit-box-sizing: border-box;          -moz-box-sizing: border-box;          box-sizing: border-box;          width: 70%;          padding: 6px 0 0 0;          float: right;          height: 100%; }          #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap .wrap {            width: 25%;            padding: 0;            float: left; }            #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap .wrap .label {              width: 100%;              padding: 4px 0 0 0;              color: #878787;              text-align: center;              text-transform: uppercase;              font-weight: bold;              text-shadow: 1px 1px #1a1a1a; }            #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap .wrap input[type='text'] {              padding: 0;              text-align: center; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap {          background: #25282b; }        #controlKit .panel .groupList .group .subGroupList .subGroup .wrap .wrap {          background: none; }      #controlKit .panel .groupList .group .subGroupList .head .wrap, #controlKit .panel .groupList .group .subGroupList .headInactive .wrap {        background: none; }    #controlKit .panel .groupList .group:last-child .subGroupList, #controlKit .panel .groupList .group:last-child .scrollBuffer:nth-of-type(3) {      border-bottom: none; }    #controlKit .panel .groupList .group:last-child .scrollWrap .subGroupList {      border-bottom: 1px solid #1e2224; }    #controlKit .panel .wrapSlider {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 70%;      padding: 6px 0 0 0;      float: right;      height: 100%; }      #controlKit .panel .wrapSlider input[type='text'] {        width: 25%;        text-align: center;        padding: 0;        float: right; }    #controlKit .panel .sliderWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      float: left;      cursor: ew-resize;      width: 70%; }    #controlKit .panel .sliderSlot {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 100%;      height: 25px;      padding: 3px;      background-color: #1e2224;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447; }    #controlKit .panel .sliderHandle {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      position: relative;      width: 100%;      height: 100%;      background: #b32435;      background-image: -o-linear-gradient(transparent 0%, rgba(0, 0, 0, 0.1) 100%);      background-image: linear-gradient(transparent 0%, rgba(0, 0, 0, 0.1) 100%);      box-shadow: 0 1px 0 0 #0f0f0f; }    #controlKit .panel .canvasListItem, #controlKit .panel .svgListItem {      padding: 0 10px 0 10px; }    #controlKit .panel .arrowSMax {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowSMin {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowSMax, #controlKit .panel .arrowSMin {      width: 100%;      height: 20px; }    #controlKit .panel .arrowBMax {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowBMin {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowBSubMax {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowBSubMin {      background: url(data:image/png;base64,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) center no-repeat; }    #controlKit .panel .arrowBMax, #controlKit .panel .arrowBMin, #controlKit .panel .arrowBSubMax, #controlKit .panel .arrowBSubMin {      width: 10px;      height: 100%;      float: right; }  #controlKit .panel .sizeHandle {    float: left;    width: 10px;    height: 100px;    border-left: 1 py; }  #controlKit .panel .label, #controlKit .picker .label {    width: 100%;    float: left;    font-size: 11px;    font-weight: bold;    text-shadow: 0 -1px black;    overflow: hidden;    white-space: nowrap;    text-overflow: ellipsis;    cursor: default; }  #controlKit .panel .head, #controlKit .picker .head, #controlKit .panel .panelHeadInactive {    height: 30px;    padding: 0 10px 0 10px;    background: #1a1d1f; }    #controlKit .panel .head .wrap, #controlKit .picker .head .wrap, #controlKit .panel .panelHeadInactive .wrap {      width: auto;      height: auto;      margin: 0;      padding: 0;      position: relative;      overflow: hidden; }  #controlKit .panel .head, #controlKit .picker .head {    border-top: 1px solid #202426;    border-bottom: 1px solid #111314; }    #controlKit .panel .head .label, #controlKit .picker .head .label {      cursor: pointer;      line-height: 30px;      color: #65696b; }  #controlKit .panel .panelHeadInactive {    border-top: 1px solid #202426; }  #controlKit .panel .menu, #controlKit .picker .menu {    float: right;    padding: 5px 0 0 0; }    #controlKit .panel .menu input[type='button'], #controlKit .picker .menu input[type='button'] {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      cursor: pointer;      height: 20px;      margin-left: 4px;      border: none;      border-radius: 2px;      -moz-border-radius: 2px;      font-family: arial, sans-serif;      font-size: 10px;      font-weight: bold;      color: #aaaaaa;      text-shadow: 0 -1px black;      text-transform: uppercase;      box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #212527 inset;      border-bottom: 1px solid #24292b; }    #controlKit .panel .menu .btnHide, #controlKit .panel .menu .btnShow, #controlKit .panel .menu .btnClose, #controlKit .picker .menu .btnHide, #controlKit .picker .menu .btnShow, #controlKit .picker .menu .btnClose {      width: 20px; }    #controlKit .panel .menu .btnHide, #controlKit .picker .menu .btnHide {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #1a1d1f; }      #controlKit .panel .menu .btnHide:hover, #controlKit .picker .menu .btnHide:hover {        background: url(data:image/png;base64,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) 50% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }    #controlKit .panel .menu .btnShow, #controlKit .picker .menu .btnShow {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #1a1d1f; }      #controlKit .panel .menu .btnShow:hover, #controlKit .picker .menu .btnShow:hover {        background: url(data:image/png;base64,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) 50% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }    #controlKit .panel .menu .btnClose, #controlKit .picker .menu .btnClose {      background: url(data:image/png;base64,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) 50% 50% no-repeat, #1a1d1f; }      #controlKit .panel .menu .btnClose:hover, #controlKit .picker .menu .btnClose:hover {        background: url(data:image/png;base64,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) 50% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }    #controlKit .panel .menu .btnUndo, #controlKit .picker .menu .btnUndo {      background: url(data:image/png;base64,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) 20% 50% no-repeat, #1a1d1f;      padding: 0 6px 1px 0;      width: 38px;      vertical-align: top;      text-align: end; }      #controlKit .panel .menu .btnUndo:hover, #controlKit .picker .menu .btnUndo:hover {        background: url(data:image/png;base64,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) 20% 50% no-repeat, #111314;        box-shadow: 0 0 0 1px #131313 inset, -1px 2px 0 0 #121314 inset; }  #controlKit .picker {    pointer-events: auto;    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    border-radius: 2px;    -moz-border-radius: 2px;    background-color: #303639;    font-family: arial, sans-serif;    font-size: 11px;    color: white;    text-shadow: 1px 1px black;    position: absolute;    z-index: 2147483631;    width: 360px;    -webkit-touch-callout: none;    -webkit-user-select: none;    -khtml-user-select: none;    -moz-user-select: none;    -ms-user-select: none;    user-select: none;    box-shadow: 0 0 1px 1px rgba(0, 0, 0, 0.25); }    #controlKit .picker canvas {      vertical-align: bottom;      cursor: pointer; }    #controlKit .picker .wrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      padding: 10px;      float: left; }    #controlKit .picker .fieldWrap {      padding: 3px; }    #controlKit .picker .sliderWrap {      padding: 3px 13px 3px 3px; }    #controlKit .picker .fieldWrap, #controlKit .picker .sliderWrap, #controlKit .picker .inputWrap {      height: auto;      overflow: hidden;      float: left; }    #controlKit .picker .inputWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border: 1px solid #1e2224;      border-radius: 2px;      -moz-border-radius: 2px;      box-shadow: 0 1px 0 0 #3b4447;      width: 140px;      float: right;      padding: 5px 10px 1px 0; }    #controlKit .picker .inputField {      width: 50%;      float: right;      margin-bottom: 4px; }      #controlKit .picker .inputField .label {        padding: 4px 0 0 0;        color: #878787;        text-align: center;        text-transform: uppercase;        font-weight: bold;        text-shadow: 1px 1px #1a1a1a;        width: 40%; }      #controlKit .picker .inputField .wrap {        padding: 0;        width: 60%;        height: auto;        float: right; }    #controlKit .picker .controlsWrap {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      width: 100%;      height: auto;      float: right;      padding: 9px 0 0 0; }      #controlKit .picker .controlsWrap input[type='button'] {        float: right;        width: 65px;        margin: 0 0 0 10px; }    #controlKit .picker .colorContrast {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447;      width: 100%;      height: 25px;      padding: 3px;      width: 80%;      margin-bottom: 4px;      float: right; }      #controlKit .picker .colorContrast div {        width: 50%;        height: 100%;        float: left; }    #controlKit .picker input[type='text'] {      padding: 0;      text-align: center;      width: 60%;      float: right; }    #controlKit .picker .wrap .inputWrap:nth-of-type(3) {      border-bottom-left-radius: 0;      border-bottom-right-radius: 0; }    #controlKit .picker .wrap .inputWrap:nth-of-type(4) {      border-top: none;      border-top-left-radius: 0;      border-top-right-radius: 0; }      #controlKit .picker .wrap .inputWrap:nth-of-type(4) .inputField {        width: 100%; }        #controlKit .picker .wrap .inputWrap:nth-of-type(4) .inputField .label {          width: 20%; }      #controlKit .picker .wrap .inputWrap:nth-of-type(4) input[type='text'] {        width: 80%; }    #controlKit .picker .fieldWrap, #controlKit .picker .sliderWrap {      background: #1e2224;      border: none;      box-shadow: 0 0 1px 2px rgba(0, 0, 0, 0.0125) inset, 0 0 1px 1px #111314 inset;      border-radius: 2px;      -moz-border-radius: 2px;      border-bottom: 1px solid #3b4447;      position: relative;      margin-right: 5px; }      #controlKit .picker .fieldWrap .indicator, #controlKit .picker .sliderWrap .indicator {        position: absolute;        border: 2px solid white;        box-shadow: 0 1px black, 0 1px black inset;        cursor: pointer; }    #controlKit .picker .fieldWrap .indicator {      width: 8px;      height: 8px;      left: 50%;      top: 50%;      border-radius: 50%;      -moz-border-radius: 50%; }    #controlKit .picker .sliderWrap .indicator {      width: 14px;      height: 3px;      border-radius: 8px;      -moz-border-radius: 8px;      left: 1px;      top: 1px; }      #controlKit .picker .sliderWrap .indicator:after {        content: '';        width: 0;        height: 0;        border-top: 4.5px solid transparent;        border-bottom: 4.5px solid transparent;        border-right: 4px solid white;        float: right;        position: absolute;        top: -2px;        left: 19px; }      #controlKit .picker .sliderWrap .indicator:before {        content: '';        width: 0;        height: 0;        border-top: 4.5px solid transparent;        border-bottom: 4.5px solid transparent;        border-right: 4px solid black;        float: right;        position: absolute;        top: -3px;        left: 19px; }  #controlKit .options {    pointer-events: auto;    -webkit-box-sizing: border-box;    -moz-box-sizing: border-box;    box-sizing: border-box;    border: 1px solid #131313;    border-radius: 2px;    -moz-border-radius: 2px;    position: absolute;    left: 0;    top: 0;    width: auto;    height: auto;    z-index: 2147483638;    font-family: arial, sans-serif;    font-size: 11px;    color: white;    text-shadow: 1px 1px black;    box-shadow: 0 1px 0 0 #566166 inset;    overflow: hidden;    background-color: #3c494e; }    #controlKit .options ul {      width: 100%;      list-style: none;      margin: 0;      padding: 0; }      #controlKit .options ul li {        margin: 0;        width: 100%;        height: 28px;        line-height: 28px;        padding: 0 20px 0 10px;        overflow: hidden;        white-space: normal;        text-overflow: ellipsis;        cursor: pointer; }        #controlKit .options ul li:hover {          background-color: #1f2325; }      #controlKit .options ul .liSelected {        background-color: #292d30; }    #controlKit .options .color {      -webkit-box-sizing: border-box;      -moz-box-sizing: border-box;      box-sizing: border-box; }      #controlKit .options .color li, #controlKit .options .color .liSelected {        -webkit-box-sizing: border-box;        -moz-box-sizing: border-box;        box-sizing: border-box;        padding: 0;        height: 25px;        line-height: 25px;        text-align: center; }        #controlKit .options .color li:hover, #controlKit .options .color .liSelected:hover {          background: none;          font-weight: bold; }      #controlKit .options .color .liSelected {        font-weight: bold; }"
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

},{"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"./AbstractGroup":52,"./GroupEvent":54,"./PanelEvent":57,"./SubGroup":58}],54:[function(_dereq_,module,exports){
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
},{"../component/Button":3,"../component/Canvas":4,"../component/Checkbox":5,"../component/Color":6,"../component/FunctionPlotter":8,"../component/NumberInput":11,"../component/NumberOutput":13,"../component/Pad":16,"../component/Range":20,"../component/SVG":21,"../component/Select":23,"../component/Slider":24,"../component/StringInput":26,"../component/StringOutput":27,"../component/ValuePlotter":28,"../core/History":32,"../core/document/CSS":42,"../core/document/DocumentEvent":43,"../core/document/Mouse":44,"../core/document/Node":45,"../core/document/NodeEvent":46,"../core/event/Event":48,"../core/event/EventDispatcher":49,"../core/layout/LayoutMode":50,"../core/layout/ScrollBar":51,"./Group":53,"./MenuEvent":55,"./PanelEvent":57}],57:[function(_dereq_,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9pbmRleC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvQ29udHJvbEtpdC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0J1dHRvbi5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0NhbnZhcy5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0NoZWNrYm94LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvQ29sb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9GdW5jdGlvblBsb3RUeXBlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvRnVuY3Rpb25QbG90dGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9GdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L051bWJlcklucHV0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvTnVtYmVySW5wdXRfSW50ZXJuYWwuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9OdW1iZXJPdXRwdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9PcHRpb25zLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvT3V0cHV0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGFkLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGlja2VyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGxvdHRlci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1ByZXNldEJ0bi5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1JhbmdlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU1ZHLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU1ZHQ29tcG9uZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2VsZWN0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2xpZGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2xpZGVyX0ludGVybmFsLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU3RyaW5nSW5wdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9TdHJpbmdPdXRwdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9WYWx1ZVBsb3R0ZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvQ29tcG9uZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0NvbXBvbmVudEV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0NvbXBvbmVudE9iamVjdEVycm9yLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0hpc3RvcnkuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvSGlzdG9yeUV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL01ldHJpYy5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9PYmplY3RDb21wb25lbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvT3B0aW9uRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvUHJlc2V0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2NvbG9yL0NvbG9yRm9ybWF0RXJyb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvY29sb3IvQ29sb3JNb2RlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2NvbG9yL0NvbG9yVXRpbC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9DU1MuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9Nb3VzZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9Ob2RlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2RvY3VtZW50L05vZGVFdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9TdHlsZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9ldmVudC9FdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvbGF5b3V0L0xheW91dE1vZGUuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvbGF5b3V0L1Njcm9sbEJhci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvQWJzdHJhY3RHcm91cC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvR3JvdXAuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL0dyb3VwRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL01lbnVFdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvUGFuZWwuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL1BhbmVsRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL1N1Ykdyb3VwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdHlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDemJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNydUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgQ29udHJvbEtpdCA9IHJlcXVpcmUoJy4vbGliL0NvbnRyb2xLaXQnKTtcblx0Q29udHJvbEtpdC5DYW52YXMgPSByZXF1aXJlKCcuL2xpYi9jb21wb25lbnQvQ2FudmFzJyk7XG5cdENvbnRyb2xLaXQuU1ZHID0gcmVxdWlyZSgnLi9saWIvY29tcG9uZW50L1NWRycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xLaXQ7IiwidmFyIE5vZGUgPSByZXF1aXJlKCcuL2NvcmUvZG9jdW1lbnQvTm9kZScpLFxuICAgIFBhbmVsID0gcmVxdWlyZSgnLi9ncm91cC9QYW5lbCcpLFxuICAgIE9wdGlvbnMgPSByZXF1aXJlKCcuL2NvbXBvbmVudC9PcHRpb25zJyksXG4gICAgUGlja2VyID0gcmVxdWlyZSgnLi9jb21wb25lbnQvUGlja2VyJyk7XG5cbnZhciBDU1MgPSByZXF1aXJlKCcuL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG4gICAgRXZlbnRfID0gcmVxdWlyZSgnLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi9jb3JlL0NvbXBvbmVudEV2ZW50JyksXG4gICAgSGlzdG9yeUV2ZW50ID0gcmVxdWlyZSgnLi9jb3JlL0hpc3RvcnlFdmVudCcpLFxuICAgIE1lbnVFdmVudCA9IHJlcXVpcmUoJy4vZ3JvdXAvTWVudUV2ZW50Jyk7XG5cbnZhciBIaXN0b3J5ID0gcmVxdWlyZSgnLi9jb3JlL0hpc3RvcnknKTtcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xuXG52YXIgVmFsdWVQbG90dGVyID0gcmVxdWlyZSgnLi9jb21wb25lbnQvVmFsdWVQbG90dGVyJyk7XG52YXIgU3RyaW5nT3V0cHV0ID0gcmVxdWlyZSgnLi9jb21wb25lbnQvU3RyaW5nT3V0cHV0JyksXG4gICAgTnVtYmVyT3V0cHV0ID0gcmVxdWlyZSgnLi9jb21wb25lbnQvTnVtYmVyT3V0cHV0Jyk7XG5cbnZhciBERUZBVUxUX0tJVF9UUklHR0VSID0gZmFsc2UsXG4gICAgREVGQVVMVF9ISVNUT1JZID0gZmFsc2UsXG4gICAgREVGQVVMVF9QQU5FTFNfQ0xPU0FCTEUgPSBmYWxzZSxcbiAgICBERUZBVUxUX09QQUNJVFkgPSAxLjA7XG5cbmZ1bmN0aW9uIENvbnRyb2xLaXQocGFyYW1zKSB7XG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy50cmlnZ2VyID0gcGFyYW1zLnRyaWdnZXIgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfS0lUX1RSSUdHRVIgOiBwYXJhbXMuZml4ZWQ7XG4gICAgcGFyYW1zLmhpc3RvcnkgPSBwYXJhbXMuaGlzdG9yeSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9ISVNUT1JZIDogcGFyYW1zLmhpc3Rvcnk7XG4gICAgcGFyYW1zLnBhbmVsc0Nsb3NhYmxlID0gcGFyYW1zLnBhbmVsc0Nsb3NhYmxlID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1BBTkVMU19DTE9TQUJMRSA6IHBhcmFtcy5wYW5lbHNDbG9zYWJsZTtcbiAgICBwYXJhbXMub3BhY2l0eSA9IHBhcmFtcy5vcGFjaXR5ID09PSB1bmRlZmluZWQgPyBERUZBVUxUX09QQUNJVFkgOiBwYXJhbXMub3BhY2l0eTtcbiAgICBwYXJhbXMudXNlRXh0ZXJuYWxTdHlsZSA9IHBhcmFtcy51c2VFeHRlcm5hbFN0eWxlID09PSB1bmRlZmluZWQgPyBmYWxzZSA6IHBhcmFtcy51c2VFeHRlcm5hbFN0eWxlO1xuXG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgbm9kZSA9IG51bGw7XG4gICAgaWYgKCFwYXJhbXMucGFyZW50RG9tRWxlbWVudElkKSB7XG4gICAgICAgIG5vZGUgPSBuZXcgTm9kZSgpO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBub2RlID0gTm9kZS5nZXROb2RlQnlJZChwYXJhbXMucGFyZW50RG9tRWxlbWVudElkKTtcbiAgICB9XG5cbiAgICBpZighcGFyYW1zLnVzZUV4dGVybmFsU3R5bGUpe1xuICAgICAgICB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgICAgICAgICAgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG4gICAgICAgIHZhciBjc3MgPSAhcGFyYW1zLnN0eWxlID8gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L1N0eWxlJykuc3RyaW5nIDogcGFyYW1zLnN0eWxlO1xuICAgICAgICBpZihzdHlsZS5zdHlsZXNoZWV0KXtcbiAgICAgICAgICAgIHN0eWxlLnN0eWxlc2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuICAgICAgICB9XG4gICAgICAgIChkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0pLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgICB9XG5cbiAgICBub2RlLnNldFByb3BlcnR5KCdpZCcsIENTUy5Db250cm9sS2l0KTtcblxuICAgIHRoaXMuX25vZGUgPSBub2RlO1xuICAgIHRoaXMuX3BhbmVscyA9IFtdO1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9oaXN0b3J5RW5hYmxlZCA9IHBhcmFtcy5oaXN0b3J5O1xuICAgIHRoaXMuX3BhbmVsc0Nsb3NhYmxlID0gcGFyYW1zLnBhbmVsc0Nsb3NhYmxlO1xuXG4gICAgdmFyIGhpc3RvcnkgPSBIaXN0b3J5LnNldHVwKCk7XG5cbiAgICBpZiAoIXRoaXMuX2hpc3RvcnlFbmFibGVkKXtcbiAgICAgICAgaGlzdG9yeS5kaXNhYmxlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaGlzdG9yeS5hZGRFdmVudExpc3RlbmVyKEhpc3RvcnlFdmVudC5TVEFURV9QVVNILCB0aGlzLCAnb25IaXN0b3J5U3RhdGVQdXNoJyk7XG4gICAgICAgIGhpc3RvcnkuYWRkRXZlbnRMaXN0ZW5lcihIaXN0b3J5RXZlbnQuU1RBVEVfUE9QLCB0aGlzLCAnb25IaXN0b3J5U3RhdGVQb3AnKTtcbiAgICB9XG5cbiAgICBNb3VzZS5zZXR1cCgpO1xuICAgIFBpY2tlci5zZXR1cCh0aGlzLmdldE5vZGUoKSk7XG4gICAgT3B0aW9ucy5zZXR1cCh0aGlzLmdldE5vZGUoKSk7XG5cbiAgICBpZiAocGFyYW1zLnRyaWdnZXIpIHtcbiAgICAgICAgdmFyIHRyaWdnZXIgPSBuZXcgTm9kZSgpO1xuICAgICAgICAgICAgdHJpZ2dlci5zZXRQcm9wZXJ0eSgnaWQnLCBDU1MuVHJpZ2dlcik7XG4gICAgICAgICAgICB0cmlnZ2VyLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uVHJpZ2dlckRvd24uYmluZCh0aGlzKSk7XG5cbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0cmlnZ2VyLmdldEVsZW1lbnQoKSk7XG4gICAgfVxuXG4gICAgaWYgKHBhcmFtcy5vcGFjaXR5ICE9IDEuMCAmJiBwYXJhbXMub3BhY2l0eSAhPSAwLjApIHtcbiAgICAgICAgbm9kZS5zZXRTdHlsZVByb3BlcnR5KCdvcGFjaXR5JywgcGFyYW1zLm9wYWNpdHkpO1xuICAgIH1cblxuICAgIHRoaXMuX2NhblVwZGF0ZSA9IHRydWU7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGludGVydmFsLFxuICAgICAgICBjb3VudCA9IDAsXG4gICAgICAgIGNvdW50TWF4ID0gMTA7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsZnVuY3Rpb24oKXtcbiAgICAgICAgc2VsZi5fY2FuVXBkYXRlID0gZmFsc2U7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZihjb3VudCA+PSBjb3VudE1heCl7XG4gICAgICAgICAgICAgICAgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgIHNlbGYuX2NhblVwZGF0ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICB9LDI1KVxuICAgIH0pO1xufVxuXG5Db250cm9sS2l0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLl9vblRyaWdnZXJEb3duID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgndmlzaWJpbGl0eScsIHRoaXMuX2lzRGlzYWJsZWQgPSAhdGhpcy5faXNEaXNhYmxlZCA/ICdoaWRkZW4nIDogJ3Zpc2libGUnKTtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLmFkZFBhbmVsID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgIHZhciBwYW5lbCA9IG5ldyBQYW5lbCh0aGlzLCBwYXJhbXMpO1xuICAgIHRoaXMuX3BhbmVscy5wdXNoKHBhbmVsKTtcbiAgICByZXR1cm4gcGFuZWw7XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX2lzRGlzYWJsZWQgfHwgIXRoaXMuX2NhblVwZGF0ZSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGksIGosIGs7XG4gICAgdmFyIGwsIG0sIG47XG5cbiAgICB2YXIgcGFuZWxzID0gdGhpcy5fcGFuZWxzLFxuICAgICAgICBwYW5lbCxcbiAgICAgICAgZ3JvdXBzLFxuICAgICAgICBjb21wb25lbnRzLFxuICAgICAgICBjb21wb25lbnQ7XG5cbiAgICBpID0gLTE7IGwgPSBwYW5lbHMubGVuZ3RoO1xuICAgIHdoaWxlICgrK2kgPCBsKSB7XG4gICAgICAgIHBhbmVsID0gcGFuZWxzW2ldO1xuICAgICAgICBpZiAocGFuZWwuaXNEaXNhYmxlZCgpKXtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGdyb3VwcyA9IHBhbmVsLmdldEdyb3VwcygpO1xuICAgICAgICBqID0gLTE7IG0gPSBncm91cHMubGVuZ3RoO1xuXG4gICAgICAgIHdoaWxlICgrK2ogPCBtKSB7XG4gICAgICAgICAgICBjb21wb25lbnRzID0gZ3JvdXBzW2pdLmdldENvbXBvbmVudHMoKTtcbiAgICAgICAgICAgIGsgPSAtMTsgbiA9IGNvbXBvbmVudHMubGVuZ3RoO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytrIDwgbikge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudCA9IGNvbXBvbmVudHNba107XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5pc0Rpc2FibGVkKCkpe1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudCBpbnN0YW5jZW9mIFZhbHVlUGxvdHRlciB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQgaW5zdGFuY2VvZiBTdHJpbmdPdXRwdXQgfHxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50IGluc3RhbmNlb2YgTnVtYmVyT3V0cHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5oaXN0b3J5SXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oaXN0b3J5RW5hYmxlZDtcbn07XG5Db250cm9sS2l0LnByb3RvdHlwZS5wYW5lbHNBcmVDbG9zYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcGFuZWxzQ2xvc2FibGU7XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xufTtcbkNvbnRyb2xLaXQucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IHRydWU7XG59O1xuXG5Db250cm9sS2l0LnByb3RvdHlwZS5kaXNhYmxlQWxsUGFuZWxzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpID0gLTEsIHAgPSB0aGlzLl9wYW5lbHMsIGwgPSBwLmxlbmd0aDtcbiAgICB3aGlsZSAoKytpIDwgbCl7XG4gICAgICAgIHBbaV0uZW5hYmxlKCk7XG4gICAgfVxufTtcblxuQ29udHJvbEtpdC5wcm90b3R5cGUuZW5hYmxlQWxsUGFuZWxzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpID0gLTEsIHAgPSB0aGlzLl9wYW5lbHMsIGwgPSBwLmxlbmd0aDtcbiAgICB3aGlsZSAoKytpIDwgbCl7XG4gICAgICAgIHBbaV0uZGlzYWJsZSgpO1xuICAgIH1cbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLm9uSGlzdG9yeVN0YXRlUHVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBNZW51RXZlbnQuVVBEQVRFX01FTlUsIG51bGwpKTtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLm9uSGlzdG9yeVN0YXRlUG9wID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlVQREFURV9WQUxVRSwge29yaWdpbjogbnVsbH0pKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBNZW51RXZlbnQuVVBEQVRFX01FTlUsIG51bGwpKTtcbn07XG5cbkNvbnRyb2xLaXQucHJvdG90eXBlLmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGU7XG59O1xuXG4vL1xudmFyIGluc3RhbmNlID0gbnVsbDtcblxudmFyIENvbnRyb2xLaXRHbG9iYWwgPSB7XG4gICAgc2V0dXAgOiBmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgaW5zdGFuY2UgPSBuZXcgQ29udHJvbEtpdChvcHRpb25zKTtcbiAgICB9LFxuICAgIHVwZGF0ZSA6IGZ1bmN0aW9uKCl7XG4gICAgICAgIGlmKCFpbnN0YW5jZSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFuY2UudXBkYXRlKCk7XG4gICAgfSxcbiAgICBhZGRQYW5lbCA6IGZ1bmN0aW9uKHBhcmFtcyl7XG4gICAgICAgIGlmKCFpbnN0YW5jZSl7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnN0YW5jZS5hZGRQYW5lbChwYXJhbXMpO1xuICAgIH0sXG4gICAgZW5hYmxlIDogZnVuY3Rpb24oKXtcbiAgICAgICAgaWYoIWluc3RhbmNlKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YW5jZS5lbmFibGUoKTtcbiAgICB9LFxuICAgIGRpc2FibGUgOiBmdW5jdGlvbigpe1xuICAgICAgICBpZighaW5zdGFuY2Upe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGluc3RhbmNlLmRpc2FibGUoKTtcbiAgICB9LFxuICAgIGRlc3Ryb3kgOiBmdW5jdGlvbigpe1xuICAgICAgICBpbnN0YW5jZSA9IG51bGw7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sS2l0R2xvYmFsOyIsInZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKSxcbiAgICBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudCcpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIERFRkFVTFRfTEFCRUwgPSAnJztcblxuZnVuY3Rpb24gQnV0dG9uKHBhcmVudCxsYWJlbCxvblByZXNzLHBhcmFtcykge1xuICAgIG9uUHJlc3MgICAgICA9IG9uUHJlc3MgfHwgZnVuY3Rpb24oKXt9O1xuICAgIHBhcmFtcyAgICAgICA9IHBhcmFtcyAgICAgICB8fCB7fTtcbiAgICBwYXJhbXMubGFiZWwgPSBwYXJhbXMubGFiZWwgfHwgREVGQVVMVF9MQUJFTDtcblxuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLFtwYXJlbnQscGFyYW1zLmxhYmVsXSk7XG5cbiAgICB2YXIgaW5wdXQgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG5cbiAgICBpbnB1dC5zZXRTdHlsZUNsYXNzKENTUy5CdXR0b24pO1xuICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsbGFiZWwpO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk9OX0NMSUNLLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25QcmVzcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHNlbGYsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICB0aGlzLl93cmFwTm9kZS5hZGRDaGlsZChpbnB1dCk7XG59XG5CdXR0b24ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb21wb25lbnQucHJvdG90eXBlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCdXR0b247XG4iLCJ2YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnQnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4uL2NvcmUvTWV0cmljJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKTtcblxuZnVuY3Rpb24gQ2FudmFzKHBhcmVudCxwYXJhbXMpIHtcbiAgICBDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG4gICAgICAgIHdyYXBOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkNhbnZhc1dyYXApO1xuXG4gICAgdmFyIHdyYXBXaWR0aCA9IHdyYXBOb2RlLmdldFdpZHRoKCk7XG5cbiAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIHdyYXBOb2RlLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChjYW52YXMpO1xuXG4gICAgdGhpcy5fY2FudmFzV2lkdGggPSB0aGlzLl9jYW52YXNIZWlnaHQgPSAwO1xuICAgIHRoaXMuX3NldENhbnZhc1NpemUod3JhcFdpZHRoLHdyYXBXaWR0aCk7XG5cbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcblxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzTGlzdEl0ZW0pO1xuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSx0aGlzLCAgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsdGhpcy5fcGFyZW50LCdvbkdyb3VwU2l6ZVVwZGF0ZScpO1xufVxuXG5DYW52YXMucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb21wb25lbnQucHJvdG90eXBlKTtcblxuQ2FudmFzLnByb3RvdHlwZS5fdXBkYXRlSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW52YXNIZWlnaHQgPSB0aGlzLl9jYW52YXMuaGVpZ2h0O1xuXG4gICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KGNhbnZhc0hlaWdodCk7XG4gICAgdGhpcy5fbm9kZS5zZXRIZWlnaHQoY2FudmFzSGVpZ2h0ICsgTWV0cmljLlBBRERJTkdfV1JBUFBFUik7XG5cbn07XG5cbkNhbnZhcy5wcm90b3R5cGUub25Hcm91cFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKTtcblxuICAgIHRoaXMuX3NldENhbnZhc1NpemUod2lkdGgsIHdpZHRoKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcbiAgICB0aGlzLl9yZWRyYXcoKTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIG51bGwpKTtcbn07XG5cbkNhbnZhcy5wcm90b3R5cGUuX3NldENhbnZhc1NpemUgPSBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgIHZhciBjYW52YXNXaWR0aCA9IHRoaXMuX2NhbnZhc1dpZHRoID0gd2lkdGgsXG4gICAgICAgIGNhbnZhc0hlaWdodCA9IHRoaXMuX2NhbnZhc0hlaWdodCA9IGhlaWdodDtcblxuICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXM7XG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IGNhbnZhc1dpZHRoICsgJ3B4JztcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGNhbnZhc0hlaWdodCArICdweCc7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhc1dpZHRoO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzSGVpZ2h0O1xufTtcblxuQ2FudmFzLnByb3RvdHlwZS5nZXRDYW52YXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhbnZhcztcbn07XG5cbkNhbnZhcy5wcm90b3R5cGUuZ2V0Q29udGV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbnZhcztcbiIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpLFxuICAgIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG5mdW5jdGlvbiBDaGVja2JveChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuXG4gICAgdGhpcy5fb25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2U7XG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQ0hFQ0tCT1gpO1xuICAgIGlucHV0LnNldFByb3BlcnR5KCdjaGVja2VkJyx0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuQ0hBTkdFLHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLl93cmFwTm9kZS5hZGRDaGlsZCh0aGlzLl9pbnB1dCk7XG59XG5cbkNoZWNrYm94LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5cbkNoZWNrYm94LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xuXG4gICAgdmFyIG9iaiA9IHRoaXMuX29iamVjdCwga2V5ID0gdGhpcy5fa2V5O1xuICAgIG9ialtrZXldID0gIW9ialtrZXldO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xufTtcblxuQ2hlY2tib3gucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX29uQ2hhbmdlKCk7XG59O1xuXG5DaGVja2JveC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faW5wdXQuc2V0UHJvcGVydHkoJ2NoZWNrZWQnLCB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENoZWNrYm94OyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XG5cbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgQ29sb3JNb2RlID0gcmVxdWlyZSgnLi4vY29yZS9jb2xvci9Db2xvck1vZGUnKTtcbnZhciBQaWNrZXIgPSByZXF1aXJlKCcuL1BpY2tlcicpO1xudmFyIENvbG9yVXRpbCA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JVdGlsJyk7XG52YXIgT3B0aW9ucyA9IHJlcXVpcmUoJy4vT3B0aW9ucycpO1xudmFyIFByZXNldEJ0biA9IHJlcXVpcmUoJy4vUHJlc2V0QnRuJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi4vY29yZS9NZXRyaWMnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuXHROb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuXHRDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIENvbG9yRm9ybWF0RXJyb3IgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yRm9ybWF0RXJyb3InKTtcblxudmFyIERFRkFVTFRfQ09MT1JfTU9ERSA9IENvbG9yTW9kZS5IRVgsXG5cdERFRkFVTFRfUFJFU0VUUyA9IG51bGw7XG5cbnZhciBNU0dfQ09MT1JfRk9STUFUX0hFWCA9ICdDb2xvciBmb3JtYXQgc2hvdWxkIGJlIGhleC4gU2V0IGNvbG9yTW9kZSB0byByZ2IsIHJnYmZ2IG9yIGhzdi4nLFxuXHRNU0dfQ09MT1JfRk9STUFUX1JHQl9SR0JGVl9IU1YgPSAnQ29sb3IgZm9ybWF0IHNob3VsZCBiZSByZ2IsIHJnYmZ2IG9yIGhzdi4gU2V0IGNvbG9yTW9kZSB0byBoZXguJyxcblx0TVNHX0NPTE9SX1BSRVNFVF9GT1JNQVRfSEVYID0gJ1ByZXNldCBjb2xvciBmb3JtYXQgc2hvdWxkIGJlIGhleC4nLFxuXHRNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9SR0JfUkdCRlZfSFNWID0gJ1ByZXNldCBjb2xvciBmb3JtYXQgc2hvdWxkIGJlIHJnYiwgcmdiZnYgb3IgaHN2Lic7XG5cbmZ1bmN0aW9uIENvbG9yKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG5cdE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcblx0cGFyYW1zLnByZXNldHMgPSBwYXJhbXMucHJlc2V0cyB8fCBERUZBVUxUX1BSRVNFVFM7XG5cdHBhcmFtcy5jb2xvck1vZGUgPSBwYXJhbXMuY29sb3JNb2RlIHx8IERFRkFVTFRfQ09MT1JfTU9ERTtcblxuXHR0aGlzLl9wcmVzZXRzS2V5ID0gcGFyYW1zLnByZXNldHM7XG5cblx0dmFyIGNvbG9yID0gdGhpcy5fY29sb3IgPSBuZXcgTm9kZSgpO1xuXHR2YWx1ZSA9IHRoaXMuX3ZhbHVlID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG5cblx0dmFyIGNvbG9yTW9kZSA9IHRoaXMuX2NvbG9yTW9kZSA9IHBhcmFtcy5jb2xvck1vZGU7XG5cblx0dGhpcy5fdmFsaWRhdGVDb2xvckZvcm1hdCh2YWx1ZSwgTVNHX0NPTE9SX0ZPUk1BVF9IRVgsIE1TR19DT0xPUl9GT1JNQVRfUkdCX1JHQkZWX0hTVik7XG5cblx0dmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG5cblx0aWYgKCF0aGlzLl9wcmVzZXRzS2V5KSB7XG5cdFx0Y29sb3Iuc2V0U3R5bGVDbGFzcyhDU1MuQ29sb3IpO1xuXHRcdHdyYXBOb2RlLmFkZENoaWxkKGNvbG9yKTtcblx0fVxuXHRlbHNlIHtcblx0XHRjb2xvci5zZXRTdHlsZUNsYXNzKENTUy5Db2xvcik7XG5cblx0XHR2YXIgY29sb3JXcmFwID0gbmV3IE5vZGUoKTtcblx0XHRjb2xvcldyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcENvbG9yV1ByZXNldCk7XG5cblx0XHR3cmFwTm9kZS5hZGRDaGlsZChjb2xvcldyYXApO1xuXHRcdGNvbG9yV3JhcC5hZGRDaGlsZChjb2xvcik7XG5cblx0XHR2YXIgcHJlc2V0cyA9IHRoaXMuX29iamVjdFt0aGlzLl9wcmVzZXRzS2V5XTtcblxuXHRcdHZhciBpID0gLTE7XG5cdFx0d2hpbGUgKCsraSA8IHByZXNldHMubGVuZ3RoKSB7XG5cdFx0XHR0aGlzLl92YWxpZGF0ZUNvbG9yRm9ybWF0KHByZXNldHNbaV0sIE1TR19DT0xPUl9QUkVTRVRfRk9STUFUX0hFWCxcblx0XHRcdFx0TVNHX0NPTE9SX1BSRVNFVF9GT1JNQVRfUkdCX1JHQkZWX0hTVik7XG5cdFx0fVxuXG5cdFx0dmFyIG9wdGlvbnMgPSBPcHRpb25zLmdldCgpLFxuXHRcdFx0cHJlc2V0QnRuID0gbmV3IFByZXNldEJ0bih3cmFwTm9kZSk7XG5cblx0XHR2YXIgb25QcmVzZXREZWFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0b3B0aW9ucy5jbGVhcigpO1xuXHRcdFx0cHJlc2V0QnRuLmRlYWN0aXZhdGUoKTtcblx0XHR9O1xuXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBvblByZXNldEFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0b3B0aW9ucy5idWlsZChwcmVzZXRzLFxuXHRcdFx0XHRzZWxmLl92YWx1ZSxcblx0XHRcdFx0Y29sb3IsXG5cdFx0XHRcdGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRzZWxmLnB1c2hIaXN0b3J5U3RhdGUoKTtcblx0XHRcdFx0XHRzZWxmLl92YWx1ZSA9IHByZXNldHNbb3B0aW9ucy5nZXRTZWxlY3RlZEluZGV4KCldO1xuXHRcdFx0XHRcdHNlbGYuYXBwbHlWYWx1ZSgpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblByZXNldERlYWN0aXZhdGUsXG5cdFx0XHRcdE1ldHJpYy5QQURESU5HX1BSRVNFVCxcblx0XHRcdFx0dHJ1ZSxcblx0XHRcdFx0Y29sb3JNb2RlKTtcblx0XHR9O1xuXHRcdHByZXNldEJ0bi5zZXRPbkFjdGl2ZShvblByZXNldEFjdGl2YXRlKTtcblx0XHRwcmVzZXRCdG4uc2V0T25EZWFjdGl2ZShvblByZXNldERlYWN0aXZhdGUpO1xuXHR9XG5cblx0Y29sb3IuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25Db2xvclRyaWdnZXIuYmluZCh0aGlzKSk7XG5cdHRoaXMuX3VwZGF0ZUNvbG9yKCk7XG59XG5cbkNvbG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5cbkNvbG9yLnByb3RvdHlwZS5fb25Db2xvclRyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBjb2xvck1vZGUgPSB0aGlzLl9jb2xvck1vZGUsXG5cdFx0Y29sb3JNb2RlSEVYID0gQ29sb3JNb2RlLkhFWCxcblx0XHRjb2xvck1vZGVSR0IgPSBDb2xvck1vZGUuUkdCLFxuXHRcdGNvbG9yTW9kZVJHQmZ2ID0gQ29sb3JNb2RlLlJHQmZ2LFxuXHRcdGNvbG9yTW9kZUhTViA9IENvbG9yTW9kZS5IU1Y7XG5cblx0dmFyIHZhbHVlID0gdGhpcy5fdmFsdWUsXG5cdFx0dGVtcDtcblxuXHR2YXIgb25QaWNrZXJQaWNrID0gZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xuXG5cdFx0c3dpdGNoIChjb2xvck1vZGUpIHtcblx0XHRcdGNhc2UgY29sb3JNb2RlSEVYOlxuXHRcdFx0XHR0aGlzLl92YWx1ZSA9IFBpY2tlci5nZXRJbnN0YW5jZSgpLmdldEhFWCgpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgY29sb3JNb2RlUkdCOlxuXHRcdFx0XHQvL2lmIHZhbCA9IEZsb2F0MzJhcnJheSBvciBzb1xuXHRcdFx0XHR0ZW1wID0gUGlja2VyLmdldEluc3RhbmNlKCkuZ2V0UkdCKCk7XG5cdFx0XHRcdHZhbHVlWzBdID0gdGVtcFswXTtcblx0XHRcdFx0dmFsdWVbMV0gPSB0ZW1wWzFdO1xuXHRcdFx0XHR2YWx1ZVsyXSA9IHRlbXBbMl07XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlIGNvbG9yTW9kZVJHQmZ2OlxuXHRcdFx0XHR0ZW1wID0gUGlja2VyLmdldEluc3RhbmNlKCkuZ2V0UkdCZnYoKTtcblx0XHRcdFx0dmFsdWVbMF0gPSB0ZW1wWzBdO1xuXHRcdFx0XHR2YWx1ZVsxXSA9IHRlbXBbMV07XG5cdFx0XHRcdHZhbHVlWzJdID0gdGVtcFsyXTtcblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdGNhc2UgY29sb3JNb2RlSFNWOlxuXHRcdFx0XHR0aGlzLl92YWx1ZSA9IFBpY2tlci5nZXRJbnN0YW5jZSgpLmdldEhTVigpO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHR0aGlzLmFwcGx5VmFsdWUoKTtcblxuXHR9LmJpbmQodGhpcyk7XG5cblx0dmFyIHBpY2tlciA9IFBpY2tlci5nZXRJbnN0YW5jZSgpO1xuXG5cdHN3aXRjaCAoY29sb3JNb2RlKSB7XG5cdFx0Y2FzZSBjb2xvck1vZGVIRVg6XG5cdFx0XHRwaWNrZXIuc2V0Q29sb3JIRVgodmFsdWUpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSBjb2xvck1vZGVSR0I6XG5cdFx0XHRwaWNrZXIuc2V0Q29sb3JSR0IodmFsdWVbMF0sIHZhbHVlWzFdLCB2YWx1ZVsyXSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIGNvbG9yTW9kZVJHQmZ2OlxuXHRcdFx0cGlja2VyLnNldENvbG9yUkdCZnYodmFsdWVbMF0sIHZhbHVlWzFdLCB2YWx1ZVsyXSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIGNvbG9yTW9kZUhTVjpcblx0XHRcdHBpY2tlci5zZXRDb2xvckhTVih2YWx1ZVswXSwgdmFsdWVbMV0sIHZhbHVlWzJdKTtcblx0XHRcdGJyZWFrO1xuXHR9XG5cblx0cGlja2VyLnNldENhbGxiYWNrUGljayhvblBpY2tlclBpY2spO1xuXHRwaWNrZXIub3BlbigpO1xufTtcblxuQ29sb3IucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX29iamVjdFt0aGlzLl9rZXldID0gdGhpcy5fdmFsdWU7XG5cdHRoaXMuX3VwZGF0ZUNvbG9yKCk7XG5cdHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbn07XG5cbkNvbG9yLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcblx0aWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcylyZXR1cm47XG5cdHRoaXMuX3ZhbHVlID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG5cdHRoaXMuX3VwZGF0ZUNvbG9yKCk7XG59O1xuXG5Db2xvci5wcm90b3R5cGUuX3VwZGF0ZUNvbG9yID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgY29sb3IgPSB0aGlzLl92YWx1ZSxcblx0XHRjb2xvck5vZGUgPSB0aGlzLl9jb2xvcixcblx0XHRub2RlQ29sb3I7XG5cblx0Y29sb3JOb2RlLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCBjb2xvcik7XG5cblx0c3dpdGNoICh0aGlzLl9jb2xvck1vZGUpIHtcblx0XHRjYXNlIENvbG9yTW9kZS5IRVg6XG5cdFx0XHRub2RlQ29sb3IgPSBjb2xvcjtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSBDb2xvck1vZGUuUkdCOlxuXHRcdFx0bm9kZUNvbG9yID0gQ29sb3JVdGlsLlJHQjJIRVgoY29sb3JbMF0sIGNvbG9yWzFdLCBjb2xvclsyXSk7XG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgQ29sb3JNb2RlLlJHQmZ2OlxuXHRcdFx0bm9kZUNvbG9yID0gQ29sb3JVdGlsLlJHQmZ2MkhFWChjb2xvclswXSwgY29sb3JbMV0sIGNvbG9yWzJdKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSBDb2xvck1vZGUuSFNWOlxuXHRcdFx0bm9kZUNvbG9yID0gQ29sb3JVdGlsLkhTVjJSR0IoY29sb3JbMF0sIGNvbG9yWzFdLCBjb2xvclsyXSk7XG5cdFx0XHRicmVhaztcblx0fVxuXG5cdGNvbG9yTm9kZS5nZXRTdHlsZSgpLmJhY2tncm91bmRDb2xvciA9IG5vZGVDb2xvcjtcbn07XG5cbkNvbG9yLnByb3RvdHlwZS5fdmFsaWRhdGVDb2xvckZvcm1hdCA9IGZ1bmN0aW9uICh2YWx1ZSwgbXNnSGV4LCBtc2dBcnIpIHtcblx0dmFyIGNvbG9yTW9kZSA9IHRoaXMuX2NvbG9yTW9kZTtcblxuXHRpZiAoY29sb3JNb2RlID09IENvbG9yTW9kZS5IRVggJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyB8fFxuXHRcdGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuSEVYICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nKSB7XG5cdFx0dGhyb3cgbmV3IENvbG9yRm9ybWF0RXJyb3IobXNnSGV4KTtcblx0fVxuXHRpZiAoKGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuUkdCIHx8XG5cdFx0Y29sb3JNb2RlID09IENvbG9yTW9kZS5SR0JmdiB8fFxuXHRcdGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuSFNWKSAmJlxuXHRcdE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgIT09ICdbb2JqZWN0IEFycmF5XScgfHxcblx0XHRjb2xvck1vZGUgPT0gQ29sb3JNb2RlLkhTViAmJlxuXHRcdE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgIT09ICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nKSB7XG5cdFx0dGhyb3cgbmV3IENvbG9yRm9ybWF0RXJyb3IobXNnQXJyKTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvcjsiLCJ2YXIgRnVuY3Rpb25QbG90VHlwZSA9IHtcbiAgICBJTVBMSUNJVDogJ2ltcGxpY2l0JyxcbiAgICBOT05fSU1QTElDSVQ6ICdub25JbXBsaWNpdCdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRnVuY3Rpb25QbG90VHlwZTsiLCJ2YXIgUGxvdHRlciA9IHJlcXVpcmUoJy4vUGxvdHRlcicpO1xuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgRnVuY3Rpb25QbG90VHlwZSA9IHJlcXVpcmUoJy4vRnVuY3Rpb25QbG90VHlwZScpO1xudmFyIFByZXNldCA9IHJlcXVpcmUoJy4uL2NvcmUvUHJlc2V0Jyk7XG5cbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xuXG52YXIgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG5cbnZhciBGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvciA9IHJlcXVpcmUoJy4vRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3InKSxcbiAgICBGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvciA9IHJlcXVpcmUoJy4vRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3InKTtcblxudmFyIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllcicpO1xuXG52YXIgREVGQVVMVF9TSE9XX01JTl9NQVhfTEFCRUxTID0gdHJ1ZTtcblxuZnVuY3Rpb24gRnVuY3Rpb25QbG90dGVyKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5zaG93TWluTWF4TGFiZWxzID0gcGFyYW1zLnNob3dNaW5NYXhMYWJlbHMgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfU0hPV19NSU5fTUFYX0xBQkVMUyA6IHBhcmFtcy5zaG93TWluTWF4TGFiZWxzO1xuXG4gICAgUGxvdHRlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgaWYgKHR5cGVvZiBvYmplY3RbdmFsdWVdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvcihvYmplY3QsdmFsdWUpO1xuICAgIH1cblxuICAgIHZhciBmdW5jQXJnTGVuZ3RoID0gb2JqZWN0W3ZhbHVlXS5sZW5ndGg7XG5cbiAgICBpZiAoZnVuY0FyZ0xlbmd0aCA+IDIgfHwgZnVuY0FyZ0xlbmd0aCA9PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcigpO1xuICAgIH1cblxuICAgIHZhciBzdmdSb290ID0gdGhpcy5fc3ZnUm9vdCxcbiAgICAgICAgcGF0aCA9IHRoaXMuX3BhdGg7XG5cbiAgICB2YXIgYXhlcyA9IHRoaXMuX2F4ZXMgPSBzdmdSb290Lmluc2VydEJlZm9yZSh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3BhdGgnKSwgcGF0aCk7XG4gICAgYXhlcy5zdHlsZS5zdHJva2VXaWR0aCA9IDE7XG5cbiAgICB2YXIgYXhlc0xhYmVscyA9IHRoaXMuX2F4ZXNMYWJlbHMgPSBzdmdSb290Lmluc2VydEJlZm9yZSh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3BhdGgnKSwgcGF0aCk7XG4gICAgYXhlc0xhYmVscy5zdHlsZS5zdHJva2UgPSAncmdiKDQzLDQ4LDUxKSc7XG4gICAgYXhlc0xhYmVscy5zdHlsZS5zdHJva2VXaWR0aCA9IDE7XG5cbiAgICB2YXIgZ3JpZCA9IHRoaXMuX2dyaWQ7XG5cbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnLFxuICAgICAgICBzaXplID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpO1xuXG4gICAgdmFyIHNsaWRlclhXcmFwID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWFdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJYV3JhcCk7XG5cbiAgICB2YXIgc2xpZGVyWVdyYXAgPSBuZXcgTm9kZSgpO1xuICAgICAgICBzbGlkZXJZV3JhcC5zZXRTdHlsZUNsYXNzKENTUy5HcmFwaFNsaWRlcllXcmFwKTtcblxuICAgIHZhciBzbGlkZXJYVHJhY2sgPSB0aGlzLl9zbGlkZXJYVHJhY2sgPSBuZXcgTm9kZSgpO1xuICAgICAgICBzbGlkZXJYVHJhY2suc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJYKTtcblxuICAgIHZhciBzbGlkZXJZVHJhY2sgPSB0aGlzLl9zbGlkZXJZVHJhY2sgPSBuZXcgTm9kZSgpO1xuICAgICAgICBzbGlkZXJZVHJhY2suc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJZKTtcblxuICAgIHZhciBzbGlkZXJYSGFuZGxlID0gdGhpcy5fc2xpZGVyWEhhbmRsZSA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHNsaWRlclhIYW5kbGUuc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJYSGFuZGxlKTtcblxuICAgIHZhciBzbGlkZXJZSGFuZGxlID0gdGhpcy5fc2xpZGVyWUhhbmRsZSA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHNsaWRlcllIYW5kbGUuc2V0U3R5bGVDbGFzcyhDU1MuR3JhcGhTbGlkZXJZSGFuZGxlKTtcblxuICAgIHNsaWRlclhUcmFjay5hZGRDaGlsZChzbGlkZXJYSGFuZGxlKTtcbiAgICBzbGlkZXJZVHJhY2suYWRkQ2hpbGQoc2xpZGVyWUhhbmRsZSk7XG4gICAgc2xpZGVyWFdyYXAuYWRkQ2hpbGQoc2xpZGVyWFRyYWNrKTtcbiAgICBzbGlkZXJZV3JhcC5hZGRDaGlsZChzbGlkZXJZVHJhY2spO1xuXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICB2YXIgcGxvdE1vZGUgPSB0aGlzLl9wbG90TW9kZSA9IGZ1bmNBcmdMZW5ndGggPT0gMSA/XG4gICAgICAgIEZ1bmN0aW9uUGxvdFR5cGUuTk9OX0lNUExJQ0lUIDpcbiAgICAgICAgRnVuY3Rpb25QbG90VHlwZS5JTVBMSUNJVDtcblxuICAgIGlmIChwbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUKSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgY2FudmFzLnN0eWxlLndpZHRoID0gY2FudmFzLnN0eWxlLmhlaWdodCA9IHNpemUgKyAncHgnO1xuICAgICAgICBjYW52YXMud2lkdGggPSBjYW52YXMuaGVpZ2h0ID0gc2l6ZTtcblxuICAgICAgICB3cmFwTm9kZS5nZXRFbGVtZW50KCkuaW5zZXJ0QmVmb3JlKGNhbnZhcywgc3ZnKTtcblxuICAgICAgICB0aGlzLl9jYW52YXNDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIHRoaXMuX2NhbnZhc0ltYWdlRGF0YSA9IHRoaXMuX2NhbnZhc0NvbnRleHQuZ2V0SW1hZ2VEYXRhKDAsIDAsIHNpemUsIHNpemUpO1xuXG4gICAgICAgIGF4ZXMuc3R5bGUuc3Ryb2tlID0gUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfQVhFU19DT0xPUjtcbiAgICAgICAgZ3JpZC5zdHlsZS5zdHJva2UgPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9HUklEX0NPTE9SO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgYXhlcy5zdHlsZS5zdHJva2UgPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfQVhFU19DT0xPUjtcbiAgICAgICAgZ3JpZC5zdHlsZS5zdHJva2UgPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfR1JJRF9DT0xPUjtcbiAgICB9XG5cbiAgICB3cmFwTm9kZS5hZGRDaGlsZChzbGlkZXJYV3JhcCk7XG4gICAgd3JhcE5vZGUuYWRkQ2hpbGQoc2xpZGVyWVdyYXApO1xuXG4gICAgc2xpZGVyWEhhbmRsZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vblNsaWRlclhIYW5kbGVEb3duLmJpbmQodGhpcykpO1xuICAgIHNsaWRlcllIYW5kbGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25TbGlkZXJZSGFuZGxlRG93bi5iaW5kKHRoaXMpKTtcblxuICAgIHZhciB1bml0cyA9IHRoaXMuX3VuaXRzID0gW251bGwsIG51bGxdO1xuICAgIHRoaXMuX3NjYWxlID0gbnVsbDtcblxuICAgIGlmIChwbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLk5PTl9JTVBMSUNJVCkge1xuICAgICAgICB1bml0c1swXSA9IFByZXNldC5GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1g7XG4gICAgICAgIHVuaXRzWzFdID0gUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX1VOSVRfWTtcblxuICAgICAgICB0aGlzLl9zY2FsZSA9IFByZXNldC5GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9TQ0FMRTtcbiAgICB9XG4gICAgZWxzZSBpZiAocGxvdE1vZGUgPT0gRnVuY3Rpb25QbG90VHlwZS5JTVBMSUNJVCkge1xuICAgICAgICB1bml0c1swXSA9IFByZXNldC5GVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1VOSVRfWDtcbiAgICAgICAgdW5pdHNbMV0gPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9VTklUX1k7XG5cbiAgICAgICAgdGhpcy5fc2NhbGUgPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9TQ0FMRTtcbiAgICB9XG5cbiAgICB0aGlzLl91bml0c01pbk1heCA9IFtQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9VTklUX01JTiwgUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfVU5JVF9NQVhdOyAvLzEvOC0+NFxuXG4gICAgdGhpcy5fc2NhbGVNaW5NYXggPSBbUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUlOLCBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9TQ0FMRV9NQVhdOyAvLzEvNTAgLT4gMjVcblxuICAgIHRoaXMuX2NlbnRlciA9IFtNYXRoLnJvdW5kKHNpemUgKiAwLjUpLE1hdGgucm91bmQoc2l6ZSAqIDAuNSldO1xuICAgIHRoaXMuX3N2Z1BvcyA9IFswLCAwXTtcblxuICAgIHRoaXMuX2Z1bmMgPSBudWxsO1xuICAgIHRoaXMuc2V0RnVuY3Rpb24odGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xuXG4gICAgdGhpcy5fc2xpZGVyWEhhbmRsZVVwZGF0ZSgpO1xuICAgIHRoaXMuX3NsaWRlcllIYW5kbGVVcGRhdGUoKTtcblxuICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25EcmFnU3RhcnQuYmluZCh0aGlzKSwgZmFsc2UpO1xuICAgIHRoaXMuX3dyYXBOb2RlLmdldEVsZW1lbnQoKS5hZGRFdmVudExpc3RlbmVyKFwibW91c2V3aGVlbFwiLCB0aGlzLl9vblNjYWxlLmJpbmQodGhpcywgZmFsc2UpKTtcblxuICAgIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuVVBEQVRFX1ZBTFVFLCB0aGlzLCAnb25WYWx1ZVVwZGF0ZScpO1xufVxuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQbG90dGVyLnByb3RvdHlwZSk7XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3VwZGF0ZUNlbnRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnLFxuICAgICAgICB3aWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgaGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcblxuICAgIHZhciBtb3VzZVBvcyA9IE1vdXNlLmdldEluc3RhbmNlKCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgc3ZnUG9zID0gdGhpcy5fc3ZnUG9zLFxuICAgICAgICBjZW50ZXIgPSB0aGlzLl9jZW50ZXI7XG5cbiAgICBjZW50ZXJbMF0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1swXSAtIHN2Z1Bvc1swXSwgd2lkdGgpKTtcbiAgICBjZW50ZXJbMV0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1sxXSAtIHN2Z1Bvc1sxXSwgaGVpZ2h0KSk7XG5cbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uRHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMuX3N2ZztcblxuICAgIHZhciBzdmdQb3MgPSB0aGlzLl9zdmdQb3M7XG4gICAgc3ZnUG9zWzBdID0gMDtcbiAgICBzdmdQb3NbMV0gPSAwO1xuXG4gICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgc3ZnUG9zWzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgc3ZnUG9zWzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgfVxuXG4gICAgdmFyIGV2ZW50TW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgb25EcmFnID0gdGhpcy5fdXBkYXRlQ2VudGVyLmJpbmQodGhpcyksXG4gICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUNlbnRlci5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgICAgICB9LmJpbmQodGhpcyk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgIHRoaXMuX3VwZGF0ZUNlbnRlcigpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TY2FsZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgZSA9IHdpbmRvdy5ldmVudCB8fCBlO1xuICAgIHRoaXMuX3NjYWxlICs9IE1hdGgubWF4KC0xLCBNYXRoLm1pbigxLCAoZS53aGVlbERlbHRhIHx8IC1lLmRldGFpbCkpKSAqIC0xO1xuXG4gICAgdmFyIHNjYWxlTWluTWF4ID0gdGhpcy5fc2NhbGVNaW5NYXg7XG4gICAgdGhpcy5fc2NhbGUgPSBNYXRoLm1heChzY2FsZU1pbk1heFswXSwgTWF0aC5taW4odGhpcy5fc2NhbGUsIHNjYWxlTWluTWF4WzFdKSk7XG5cbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0RnVuY3Rpb24odGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fcmVkcmF3ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9wbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUKSB7XG4gICAgICAgIHZhciBzaXplID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgICAgIGNhbnZhcyA9IHRoaXMuX2NhbnZhcztcblxuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gc2l6ZSArICdweCc7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5oZWlnaHQgPSBzaXplO1xuXG4gICAgICAgIHRoaXMuX2NhbnZhc0ltYWdlRGF0YSA9IHRoaXMuX2NhbnZhc0NvbnRleHQuZ2V0SW1hZ2VEYXRhKDAsIDAsIHNpemUsIHNpemUpO1xuICAgIH1cblxuICAgIHRoaXMuX3NsaWRlclhIYW5kbGVVcGRhdGUoKTtcbiAgICB0aGlzLl9zbGlkZXJZSGFuZGxlVXBkYXRlKCk7XG5cbiAgICB0aGlzLnNldEZ1bmN0aW9uKHRoaXMuX29iamVjdFt0aGlzLl9rZXldKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuc2V0RnVuY3Rpb24gPSBmdW5jdGlvbiAoZnVuYykge1xuICAgIHRoaXMuX2Z1bmMgPSBmdW5jLmJpbmQodGhpcy5fb2JqZWN0KTtcbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3Bsb3RHcmFwaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9kcmF3R3JpZCgpO1xuICAgIHRoaXMuX2RyYXdBeGVzKCk7XG4gICAgdGhpcy5fZHJhd1Bsb3QoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX2RyYXdBeGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXG4gICAgICAgIHN2Z1dpZHRoID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBzdmdIZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuXG4gICAgdmFyIGNlbnRlciA9IHRoaXMuX2NlbnRlcixcbiAgICAgICAgY2VudGVyWCA9IGNlbnRlclswXSxcbiAgICAgICAgY2VudGVyWSA9IGNlbnRlclsxXTtcblxuICAgIHZhciBwYXRoQ21kID0gJyc7XG4gICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCBjZW50ZXJZLCBzdmdXaWR0aCwgY2VudGVyWSk7XG4gICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZShjZW50ZXJYLCAwLCBjZW50ZXJYLCBzdmdIZWlnaHQpO1xuXG4gICAgdGhpcy5fYXhlcy5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX2RyYXdQbG90ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3aWR0aCwgaGVpZ2h0O1xuXG4gICAgdmFyIGNlbnRlciA9IHRoaXMuX2NlbnRlcixcbiAgICAgICAgY2VudGVyWCA9IGNlbnRlclswXSxcbiAgICAgICAgY2VudGVyWSA9IGNlbnRlclsxXTtcblxuICAgIHZhciB1bml0cyA9IHRoaXMuX3VuaXRzLFxuICAgICAgICB1bml0WCwgdW5pdFk7XG5cbiAgICB2YXIgc2NhbGUgPSB0aGlzLl9zY2FsZTtcbiAgICB2YXIgbm9ybXZhbCwgc2NhbGVkVmFsLCB2YWx1ZSwgaW5kZXg7XG4gICAgdmFyIG9mZnNldFgsIG9mZnNldFk7XG5cbiAgICB2YXIgaTtcblxuICAgIGlmICh0aGlzLl9wbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLk5PTl9JTVBMSUNJVCkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xuXG4gICAgICAgIHdpZHRoID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpO1xuICAgICAgICBoZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuICAgICAgICB1bml0WCA9IHVuaXRzWzBdICogc2NhbGU7XG4gICAgICAgIHVuaXRZID0gaGVpZ2h0IC8gKHVuaXRzWzFdICogc2NhbGUpO1xuICAgICAgICBvZmZzZXRYID0gY2VudGVyWCAvIHdpZHRoO1xuXG4gICAgICAgIHZhciBsZW4gPSBNYXRoLmZsb29yKHdpZHRoKSxcbiAgICAgICAgICAgIHBvaW50cyA9IG5ldyBBcnJheShsZW4gKiAyKTtcblxuICAgICAgICBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIG5vcm12YWwgPSAoLW9mZnNldFggKyBpIC8gbGVuKTtcbiAgICAgICAgICAgIHNjYWxlZFZhbCA9IG5vcm12YWwgKiB1bml0WDtcbiAgICAgICAgICAgIHZhbHVlID0gY2VudGVyWSAtIHRoaXMuX2Z1bmMoc2NhbGVkVmFsKSAqIHVuaXRZO1xuXG4gICAgICAgICAgICBpbmRleCA9IGkgKiAyO1xuXG4gICAgICAgICAgICBwb2ludHNbaW5kZXhdID0gaTtcbiAgICAgICAgICAgIHBvaW50c1tpbmRleCArIDFdID0gdmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcGF0aENtZCA9ICcnO1xuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRNb3ZlVG8ocG9pbnRzWzBdLCBwb2ludHNbMV0pO1xuXG4gICAgICAgIGkgPSAyO1xuICAgICAgICB3aGlsZSAoaSA8IHBvaW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmVUbyhwb2ludHNbaV0sIHBvaW50c1tpICsgMV0pO1xuICAgICAgICAgICAgaSArPSAyO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXMsXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY2FudmFzQ29udGV4dCxcbiAgICAgICAgICAgIGltZ0RhdGEgPSB0aGlzLl9jYW52YXNJbWFnZURhdGE7XG5cbiAgICAgICAgd2lkdGggPSBjYW52YXMud2lkdGg7XG4gICAgICAgIGhlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG5cbiAgICAgICAgdW5pdFggPSB1bml0c1swXSAqIHNjYWxlO1xuICAgICAgICB1bml0WSA9IHVuaXRzWzFdICogc2NhbGU7XG5cbiAgICAgICAgb2Zmc2V0WCA9IGNlbnRlclggLyB3aWR0aDtcbiAgICAgICAgb2Zmc2V0WSA9IGNlbnRlclkgLyBoZWlnaHQ7XG5cbiAgICAgICAgdmFyIGludldpZHRoID0gMSAvIHdpZHRoLFxuICAgICAgICAgICAgaW52SGVpZ2h0ID0gMSAvIGhlaWdodDtcbiAgICAgICAgdmFyIHJnYiA9IFswLCAwLCAwXTtcblxuICAgICAgICB2YXIgY29sMCA9IFszMCwgMzQsIDM2XSxcbiAgICAgICAgICAgIGNvbDEgPSBbMjU1LCAyNTUsIDI1NV07XG5cbiAgICAgICAgaSA9IC0xO1xuICAgICAgICB2YXIgajtcbiAgICAgICAgd2hpbGUgKCsraSA8IGhlaWdodCkge1xuICAgICAgICAgICAgaiA9IC0xO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytqIDwgd2lkdGgpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMuX2Z1bmMoKC1vZmZzZXRYICsgaiAqIGludldpZHRoKSAqIHVuaXRYLFxuICAgICAgICAgICAgICAgICAgICAoLW9mZnNldFkgKyBpICogaW52SGVpZ2h0KSAqIHVuaXRZKTtcblxuICAgICAgICAgICAgICAgIHJnYlswXSA9IE1hdGguZmxvb3IoKGNvbDFbMF0gLSBjb2wwWzBdKSAqIHZhbHVlICsgY29sMFswXSk7XG4gICAgICAgICAgICAgICAgcmdiWzFdID0gTWF0aC5mbG9vcigoY29sMVsxXSAtIGNvbDBbMV0pICogdmFsdWUgKyBjb2wwWzFdKTtcbiAgICAgICAgICAgICAgICByZ2JbMl0gPSBNYXRoLmZsb29yKChjb2wxWzJdIC0gY29sMFsyXSkgKiB2YWx1ZSArIGNvbDBbMl0pO1xuXG4gICAgICAgICAgICAgICAgaW5kZXggPSAoaSAqIHdpZHRoICsgaikgKiA0O1xuXG4gICAgICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2luZGV4XSA9IHJnYlswXTtcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXggKyAxXSA9IHJnYlsxXTtcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXggKyAyXSA9IHJnYlsyXTtcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXggKyAzXSA9IDI1NTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKTtcbiAgICB9XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9kcmF3R3JpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnLFxuICAgICAgICB3aWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgaGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcblxuICAgIHZhciBzY2FsZSA9IHRoaXMuX3NjYWxlO1xuXG4gICAgdmFyIGdyaWRSZXMgPSB0aGlzLl91bml0cyxcbiAgICAgICAgZ3JpZFNwYWNpbmdYID0gd2lkdGggLyAoZ3JpZFJlc1swXSAqIHNjYWxlKSxcbiAgICAgICAgZ3JpZFNwYWNpbmdZID0gaGVpZ2h0IC8gKGdyaWRSZXNbMV0gKiBzY2FsZSk7XG5cbiAgICB2YXIgY2VudGVyID0gdGhpcy5fY2VudGVyLFxuICAgICAgICBjZW50ZXJYID0gY2VudGVyWzBdLFxuICAgICAgICBjZW50ZXJZID0gY2VudGVyWzFdO1xuXG4gICAgdmFyIGdyaWROdW1Ub3AgPSBNYXRoLnJvdW5kKGNlbnRlclkgLyBncmlkU3BhY2luZ1kpICsgMSxcbiAgICAgICAgZ3JpZE51bUJvdHRvbSA9IE1hdGgucm91bmQoKGhlaWdodCAtIGNlbnRlclkpIC8gZ3JpZFNwYWNpbmdZKSArIDEsXG4gICAgICAgIGdyaWROdW1MZWZ0ID0gTWF0aC5yb3VuZChjZW50ZXJYIC8gZ3JpZFNwYWNpbmdYKSArIDEsXG4gICAgICAgIGdyaWROdW1SaWdodCA9IE1hdGgucm91bmQoKHdpZHRoIC0gY2VudGVyWCkgLyBncmlkU3BhY2luZ1gpICsgMTtcblxuICAgIHZhciBwYXRoQ21kR3JpZCA9ICcnLFxuICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyA9ICcnO1xuXG4gICAgdmFyIGksIHRlbXA7XG5cbiAgICB2YXIgc3Ryb2tlU2l6ZSA9IE1ldHJpYy5TVFJPS0VfU0laRTtcblxuICAgIHZhciBsYWJlbFRpY2tTaXplID0gTWV0cmljLkZVTkNUSU9OX1BMT1RURVJfTEFCRUxfVElDS19TSVpFLFxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nUmlnaHQgPSB3aWR0aCAtIGxhYmVsVGlja1NpemUgLSBzdHJva2VTaXplLFxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nQm90dG9tID0gaGVpZ2h0IC0gbGFiZWxUaWNrU2l6ZSAtIHN0cm9rZVNpemUsXG4gICAgICAgIGxhYmVsVGlja1BhZGRpbmdSaWdodE9mZnNldCA9IGxhYmVsVGlja1BhZGRpbmdSaWdodCAtIGxhYmVsVGlja1NpemUsXG4gICAgICAgIGxhYmVsVGlja1BhZGRpbmdCb3R0b21PZmZzZXQgPSBsYWJlbFRpY2tQYWRkaW5nQm90dG9tIC0gbGFiZWxUaWNrU2l6ZSxcbiAgICAgICAgbGFiZWxUaWNrT2Zmc2V0UmlnaHQgPSBsYWJlbFRpY2tQYWRkaW5nUmlnaHQgLSAobGFiZWxUaWNrU2l6ZSArIHN0cm9rZVNpemUpICogMixcbiAgICAgICAgbGFiZWxUaWNrT2Zmc2V0Qm90dG9tID0gbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSAtIChsYWJlbFRpY2tTaXplICsgc3Ryb2tlU2l6ZSkgKiAyO1xuXG4gICAgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBncmlkTnVtVG9wKSB7XG4gICAgICAgIHRlbXAgPSBNYXRoLnJvdW5kKGNlbnRlclkgLSBncmlkU3BhY2luZ1kgKiBpKTtcbiAgICAgICAgcGF0aENtZEdyaWQgKz0gdGhpcy5fcGF0aENtZExpbmUoMCwgdGVtcCwgd2lkdGgsIHRlbXApO1xuXG4gICAgICAgIGlmICh0ZW1wID4gbGFiZWxUaWNrU2l6ZSl7XG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZShsYWJlbFRpY2tQYWRkaW5nUmlnaHQsIHRlbXAsXG4gICAgICAgICAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0T2Zmc2V0LCB0ZW1wKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgZ3JpZE51bUJvdHRvbSkge1xuICAgICAgICB0ZW1wID0gTWF0aC5yb3VuZChjZW50ZXJZICsgZ3JpZFNwYWNpbmdZICogaSk7XG4gICAgICAgIHBhdGhDbWRHcmlkICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIHRlbXAsIHdpZHRoLCB0ZW1wKTtcblxuICAgICAgICBpZiAodGVtcCA8IGxhYmVsVGlja09mZnNldEJvdHRvbSl7XG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZShsYWJlbFRpY2tQYWRkaW5nUmlnaHQsIHRlbXAsXG4gICAgICAgICAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0T2Zmc2V0LCB0ZW1wKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgZ3JpZE51bUxlZnQpIHtcbiAgICAgICAgdGVtcCA9IE1hdGgucm91bmQoY2VudGVyWCAtIGdyaWRTcGFjaW5nWCAqIGkpO1xuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCAwLCB0ZW1wLCBoZWlnaHQpO1xuXG4gICAgICAgIGlmICh0ZW1wID4gbGFiZWxUaWNrU2l6ZSl7XG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCBsYWJlbFRpY2tQYWRkaW5nQm90dG9tLFxuICAgICAgICAgICAgICAgIHRlbXAsIGxhYmVsVGlja1BhZGRpbmdCb3R0b21PZmZzZXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBncmlkTnVtUmlnaHQpIHtcbiAgICAgICAgdGVtcCA9IE1hdGgucm91bmQoY2VudGVyWCArIGdyaWRTcGFjaW5nWCAqIGkpO1xuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCAwLCB0ZW1wLCBoZWlnaHQpO1xuXG4gICAgICAgIGlmICh0ZW1wIDwgbGFiZWxUaWNrT2Zmc2V0UmlnaHQpe1xuICAgICAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgKz0gdGhpcy5fcGF0aENtZExpbmUodGVtcCwgbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSxcbiAgICAgICAgICAgICAgICB0ZW1wLCBsYWJlbFRpY2tQYWRkaW5nQm90dG9tT2Zmc2V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX2dyaWQuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZEdyaWQpO1xuICAgIHRoaXMuX2F4ZXNMYWJlbHMuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZEF4ZXNMYWJlbHMpO1xufTtcblxuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9zbGlkZXJYU3RlcCA9IGZ1bmN0aW9uIChtb3VzZVBvcykge1xuICAgIHZhciBtb3VzZVggPSBtb3VzZVBvc1swXTtcblxuICAgIHZhciBoYW5kbGUgPSB0aGlzLl9zbGlkZXJYSGFuZGxlLFxuICAgICAgICBoYW5kbGVXaWR0aCA9IGhhbmRsZS5nZXRXaWR0aCgpLFxuICAgICAgICBoYW5kbGVXaWR0aEhhbGYgPSBoYW5kbGVXaWR0aCAqIDAuNTtcblxuICAgIHZhciB0cmFjayA9IHRoaXMuX3NsaWRlclhUcmFjayxcbiAgICAgICAgdHJhY2tXaWR0aCA9IHRyYWNrLmdldFdpZHRoKCksXG4gICAgICAgIHRyYWNrTGVmdCA9IHRyYWNrLmdldFBvc2l0aW9uR2xvYmFsWCgpO1xuXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XG5cbiAgICB2YXIgbWF4ID0gdHJhY2tXaWR0aCAtIGhhbmRsZVdpZHRoSGFsZiAtIHN0cm9rZVNpemUgKiAyO1xuXG4gICAgdmFyIHBvcyA9IE1hdGgubWF4KGhhbmRsZVdpZHRoSGFsZiwgTWF0aC5taW4obW91c2VYIC0gdHJhY2tMZWZ0LCBtYXgpKSxcbiAgICAgICAgaGFuZGxlUG9zID0gcG9zIC0gaGFuZGxlV2lkdGhIYWxmO1xuXG4gICAgaGFuZGxlLnNldFBvc2l0aW9uWChoYW5kbGVQb3MpO1xuXG4gICAgdmFyIHVuaXRzTWluID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXG4gICAgICAgIHVuaXRzTWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMV07XG5cbiAgICB2YXIgbm9ybVZhbCA9IChwb3MgLSBoYW5kbGVXaWR0aEhhbGYpIC8gKG1heCAtIGhhbmRsZVdpZHRoSGFsZiksXG4gICAgICAgIG1hcHBlZFZhbCA9IHVuaXRzTWluICsgKHVuaXRzTWF4IC0gdW5pdHNNaW4pICogbm9ybVZhbDtcblxuICAgIHRoaXMuX3VuaXRzWzBdID0gbWFwcGVkVmFsO1xuXG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9zbGlkZXJZU3RlcCA9IGZ1bmN0aW9uIChtb3VzZVBvcykge1xuICAgIHZhciBtb3VzZVkgPSBtb3VzZVBvc1sxXTtcblxuICAgIHZhciBoYW5kbGUgPSB0aGlzLl9zbGlkZXJZSGFuZGxlLFxuICAgICAgICBoYW5kbGVIZWlnaHQgPSBoYW5kbGUuZ2V0SGVpZ2h0KCksXG4gICAgICAgIGhhbmRsZUhlaWdodEhhbGYgPSBoYW5kbGVIZWlnaHQgKiAwLjU7XG5cbiAgICB2YXIgdHJhY2sgPSB0aGlzLl9zbGlkZXJZVHJhY2ssXG4gICAgICAgIHRyYWNrSGVpZ2h0ID0gdHJhY2suZ2V0SGVpZ2h0KCksXG4gICAgICAgIHRyYWNrVG9wID0gdHJhY2suZ2V0UG9zaXRpb25HbG9iYWxZKCk7XG5cbiAgICB2YXIgbWF4ID0gdHJhY2tIZWlnaHQgLSBoYW5kbGVIZWlnaHRIYWxmIC0gMjtcblxuICAgIHZhciBwb3MgPSBNYXRoLm1heChoYW5kbGVIZWlnaHRIYWxmLCBNYXRoLm1pbihtb3VzZVkgLSB0cmFja1RvcCwgbWF4KSksXG4gICAgICAgIGhhbmRsZVBvcyA9IHBvcyAtIGhhbmRsZUhlaWdodEhhbGY7XG5cbiAgICBoYW5kbGUuc2V0UG9zaXRpb25ZKGhhbmRsZVBvcyk7XG5cbiAgICB2YXIgdW5pdHNNYXggPSB0aGlzLl91bml0c01pbk1heFswXSxcbiAgICAgICAgdW5pdHNNaW4gPSB0aGlzLl91bml0c01pbk1heFsxXTtcblxuICAgIHZhciBub3JtVmFsID0gKHBvcyAtIGhhbmRsZUhlaWdodEhhbGYpIC8gKG1heCAtIGhhbmRsZUhlaWdodEhhbGYpLFxuICAgICAgICBtYXBwZWRWYWwgPSB1bml0c01pbiArICh1bml0c01heCAtIHVuaXRzTWluKSAqIG5vcm1WYWw7XG5cbiAgICB0aGlzLl91bml0c1sxXSA9IG1hcHBlZFZhbDtcblxuICAgIHRoaXMuX3Bsb3RHcmFwaCgpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TbGlkZXJYSGFuZGxlRG93biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9vblNsaWRlckhhbmRsZURvd24odGhpcy5fc2xpZGVyWFN0ZXAuYmluZCh0aGlzKSk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9vblNsaWRlcllIYW5kbGVEb3duID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX29uU2xpZGVySGFuZGxlRG93bih0aGlzLl9zbGlkZXJZU3RlcC5iaW5kKHRoaXMpKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uU2xpZGVySGFuZGxlRG93biA9IGZ1bmN0aW9uIChzbGlkZXJTdGVwRnVuYykge1xuICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRNb3VzZVVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBtb3VzZSA9IE1vdXNlLmdldEluc3RhbmNlKCk7XG5cbiAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2xpZGVyU3RlcEZ1bmMobW91c2UuZ2V0UG9zaXRpb24oKSlcbiAgICAgICAgfSxcbiAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgICAgIH07XG5cbiAgICBzbGlkZXJTdGVwRnVuYyhtb3VzZS5nZXRQb3NpdGlvbigpKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9zbGlkZXJYSGFuZGxlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB1bml0TWluID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXG4gICAgICAgIHVuaXRNYXggPSB0aGlzLl91bml0c01pbk1heFsxXSxcbiAgICAgICAgdW5pdFggPSB0aGlzLl91bml0c1swXTtcblxuICAgIHZhciBoYW5kbGVYID0gdGhpcy5fc2xpZGVyWEhhbmRsZSxcbiAgICAgICAgaGFuZGxlWFdpZHRoID0gaGFuZGxlWC5nZXRXaWR0aCgpLFxuICAgICAgICBoYW5kbGVYV2lkdGhIYWxmID0gaGFuZGxlWFdpZHRoICogMC41LFxuICAgICAgICB0cmFja1hXaWR0aCA9IHRoaXMuX3NsaWRlclhUcmFjay5nZXRXaWR0aCgpO1xuXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XG5cbiAgICB2YXIgaGFuZGxlWE1pbiA9IGhhbmRsZVhXaWR0aEhhbGYsXG4gICAgICAgIGhhbmRsZVhNYXggPSB0cmFja1hXaWR0aCAtIGhhbmRsZVhXaWR0aEhhbGYgLSBzdHJva2VTaXplICogMjtcblxuICAgIGhhbmRsZVguc2V0UG9zaXRpb25YKChoYW5kbGVYTWluICsgKGhhbmRsZVhNYXggLSBoYW5kbGVYTWluKSAqICgodW5pdFggLSB1bml0TWluKSAvICh1bml0TWF4IC0gdW5pdE1pbikpKSAtIGhhbmRsZVhXaWR0aEhhbGYpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fc2xpZGVyWUhhbmRsZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdW5pdE1pbiA9IHRoaXMuX3VuaXRzTWluTWF4WzBdLFxuICAgICAgICB1bml0TWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMV0sXG4gICAgICAgIHVuaXRZID0gdGhpcy5fdW5pdHNbMV07XG5cbiAgICB2YXIgaGFuZGxlWSA9IHRoaXMuX3NsaWRlcllIYW5kbGUsXG4gICAgICAgIGhhbmRsZVlIZWlnaHQgPSBoYW5kbGVZLmdldEhlaWdodCgpLFxuICAgICAgICBoYW5kbGVZSGVpZ2h0SGFsZiA9IGhhbmRsZVlIZWlnaHQgKiAwLjUsXG4gICAgICAgIHRyYWNrWUhlaWdodCA9IHRoaXMuX3NsaWRlcllUcmFjay5nZXRIZWlnaHQoKTtcblxuICAgIHZhciBzdHJva2VTaXplID0gTWV0cmljLlNUUk9LRV9TSVpFO1xuXG4gICAgdmFyIGhhbmRsZVlNaW4gPSB0cmFja1lIZWlnaHQgLSBoYW5kbGVZSGVpZ2h0SGFsZiAtIHN0cm9rZVNpemUgKiAyLFxuICAgICAgICBoYW5kbGVZTWF4ID0gaGFuZGxlWUhlaWdodEhhbGY7XG5cbiAgICBoYW5kbGVZLnNldFBvc2l0aW9uWSgoaGFuZGxlWU1pbiArIChoYW5kbGVZTWF4IC0gaGFuZGxlWU1pbikgKiAoKHVuaXRZIC0gdW5pdE1pbikgLyAodW5pdE1heCAtIHVuaXRNaW4pKSkgLSBoYW5kbGVZSGVpZ2h0SGFsZik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZ1bmN0aW9uUGxvdHRlcjsiLCJmdW5jdGlvbiBGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcigpe1xuXHRFcnJvci5hcHBseSh0aGlzKTtcblx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcyxGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcik7XG5cdHRoaXMubmFtZSA9ICdGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcic7XG5cdHRoaXMubWVzc2FnZSA9ICdGdW5jdGlvbiBzaG91bGQgYmUgb2YgZm9ybSBmKHgpIG9yIGYoeCx5KS4nO1xufVxuRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IuY29uc3RydWN0b3IgPSBGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcjtcblxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcjsiLCJmdW5jdGlvbiBGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvcihvYmplY3Qsa2V5KXtcblx0RXJyb3IuYXBwbHkodGhpcyk7XG5cdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3IpO1xuXHR0aGlzLm5hbWUgPSAnQ29tcG9uZW50T2JqZWN0RXJyb3InO1xuXHR0aGlzLm1lc3NhZ2UgPSAnT2JqZWN0ICcgKyBvYmplY3QuY29uc3RydWN0b3IubmFtZSArICcgJyArIGtleSArICdzaG91bGQgYmUgb2YgdHlwZSBGdW5jdGlvbi4nO1xufVxuRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3IuY29uc3RydWN0b3IgPSBGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvcjtcblxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvcjsiLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcblxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgT3B0aW9ucyA9IHJlcXVpcmUoJy4vT3B0aW9ucycpO1xudmFyIFByZXNldEJ0biA9IHJlcXVpcmUoJy4vUHJlc2V0QnRuJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi4vY29yZS9NZXRyaWMnKTtcblxudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllcicpO1xuXG52YXIgREVGQVVMVF9JTlBVVF9EUCAgICAgPSAyLFxuICAgIERFRkFVTFRfSU5QVVRfU1RFUCAgID0gMSxcbiAgICBERUZBVUxUX0lOUFVUX1BSRVNFVCA9IG51bGw7XG5cbmZ1bmN0aW9uIE51bWJlcklucHV0KHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKSB7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyAgICAgICAgICA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgcGFyYW1zLmRwICAgICAgID0gcGFyYW1zLmRwICAgICAgIHx8IERFRkFVTFRfSU5QVVRfRFA7XG4gICAgcGFyYW1zLnN0ZXAgICAgID0gcGFyYW1zLnN0ZXAgICAgIHx8IERFRkFVTFRfSU5QVVRfU1RFUDtcbiAgICBwYXJhbXMucHJlc2V0cyAgPSBwYXJhbXMucHJlc2V0cyAgfHwgREVGQVVMVF9JTlBVVF9QUkVTRVQ7XG5cbiAgICB0aGlzLl9vbkNoYW5nZSAgICA9IHBhcmFtcy5vbkNoYW5nZTtcbiAgICB0aGlzLl9wcmVzZXRzS2V5ICA9IHBhcmFtcy5wcmVzZXRzO1xuXG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChwYXJhbXMuc3RlcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMuZHAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0Q2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25JbnB1dEZpbmlzaC5iaW5kKHRoaXMpKTtcblxuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlO1xuXG4gICAgdmFyIHByZXNldHMgPSAgcGFyYW1zLnByZXNldHM7XG4gICAgaWYgKCFwcmVzZXRzKSB7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGlucHV0LmdldE5vZGUoKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgaW5wdXRXcmFwID0gbmV3IE5vZGUoKTtcbiAgICAgICAgICAgIGlucHV0V3JhcC5zZXRTdHlsZUNsYXNzKENTUy5XcmFwSW5wdXRXUHJlc2V0KTtcblxuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChpbnB1dFdyYXApO1xuICAgICAgICBpbnB1dFdyYXAuYWRkQ2hpbGQoaW5wdXQuZ2V0Tm9kZSgpKTtcblxuICAgICAgICB2YXIgb3B0aW9ucyAgID0gT3B0aW9ucy5nZXQoKTtcbiAgICAgICAgdmFyIHByZXNldEJ0biA9IHRoaXMuX3ByZXNldEJ0biA9IG5ldyBQcmVzZXRCdG4odGhpcy5fd3JhcE5vZGUpO1xuXG4gICAgICAgIHZhciBvblByZXNldERlYWN0aXZhdGUgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgb3B0aW9ucy5jbGVhcigpO1xuICAgICAgICAgICAgcHJlc2V0QnRuLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBvblByZXNldEFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgb3B0aW9ucy5idWlsZChwcmVzZXRzLCBpbnB1dC5nZXRWYWx1ZSgpLCBpbnB1dC5nZXROb2RlKCksXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpbnB1dC5zZXRWYWx1ZShwcmVzZXRzW29wdGlvbnMuZ2V0U2VsZWN0ZWRJbmRleCgpXSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuYXBwbHlWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25QcmVzZXREZWFjdGl2YXRlLCBNZXRyaWMuUEFERElOR19QUkVTRVQsXG4gICAgICAgICAgICAgICAgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHByZXNldEJ0bi5zZXRPbkFjdGl2ZShvblByZXNldEFjdGl2YXRlKTtcbiAgICAgICAgcHJlc2V0QnRuLnNldE9uRGVhY3RpdmUob25QcmVzZXREZWFjdGl2YXRlKVxuICAgIH1cblxuICAgIGlucHV0LmdldE5vZGUoKS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCAgIHRoaXMuX29uSW5wdXREcmFnU3RhcnQuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLHRoaXMuX3BhcmVudCwnb25Db21wb25lbnRTZWxlY3REcmFnJyk7XG5cbiAgICBpbnB1dC5zZXRWYWx1ZSh0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG59XG5cbk51bWJlcklucHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5cbk51bWJlcklucHV0LnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuTnVtYmVySW5wdXQucHJvdG90eXBlLl9vbklucHV0RmluaXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xufTtcblxuTnVtYmVySW5wdXQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSA9IHRoaXMuX2lucHV0LmdldFZhbHVlKCk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELG51bGwpKTtcbn07XG5cbk51bWJlcklucHV0LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9pbnB1dC5zZXRWYWx1ZSh0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG59O1xuXG4vL1ByZXZlbnQgY2hyb21lIHNlbGVjdCBkcmFnXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUuX29uSW5wdXREcmFnU3RhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGV2ZW50TW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgZXZlbnQgPSBDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRztcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uRHJhZ0ZpbmlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XG5cbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWdGaW5pc2gsIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdGaW5pc2gsIGZhbHNlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVySW5wdXQ7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyk7XG52YXIgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG5cbnZhciBQUkVTRVRfU0hJRlRfTVVMVElQTElFUiAgPSAxMDtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwgPSBmdW5jdGlvbiAoc3RlcFZhbHVlLCBkZWNpbWFsUGxhY2VzLCBvbkJlZ2luLCBvbkNoYW5nZSwgb25GaW5pc2gpIHtcbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcywgbnVsbCk7XG5cbiAgICB0aGlzLl92YWx1ZSA9IDA7XG4gICAgdGhpcy5fdmFsdWVTdGVwID0gc3RlcFZhbHVlO1xuICAgIHRoaXMuX3ZhbHVlRFBsYWNlID0gZGVjaW1hbFBsYWNlcyArIDE7XG5cbiAgICB0aGlzLl9vbkJlZ2luID0gb25CZWdpbiB8fCBmdW5jdGlvbiAoKXt9O1xuICAgIHRoaXMuX29uQ2hhbmdlID0gb25DaGFuZ2UgfHwgZnVuY3Rpb24gKCkge307XG5cbiAgICB0aGlzLl9wcmV2S2V5Q29kZSA9IG51bGw7XG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfVEVYVCk7XG4gICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGhpcy5fdmFsdWUpO1xuXG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuS0VZX0RPV04sIHRoaXMuX29uSW5wdXRLZXlEb3duLmJpbmQodGhpcykpO1xuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LktFWV9VUCwgdGhpcy5fb25JbnB1dEtleVVwLmJpbmQodGhpcykpO1xuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LkNIQU5HRSwgdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fb25JbnB1dEtleURvd24gPSBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBzdGVwID0gKGUuc2hpZnRLZXkgPyBQUkVTRVRfU0hJRlRfTVVMVElQTElFUiA6IDEpICogdGhpcy5fdmFsdWVTdGVwLFxuICAgICAgICBrZXlDb2RlID0gZS5rZXlDb2RlO1xuXG4gICAgaWYgKGtleUNvZGUgPT0gMzggfHxcbiAgICAgICAga2V5Q29kZSA9PSA0MCkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgdmFyIG11bHRpcGxpZXIgPSBrZXlDb2RlID09IDM4ID8gMS4wIDogLTEuMDtcbiAgICAgICAgdGhpcy5fdmFsdWUgKz0gKHN0ZXAgKiBtdWx0aXBsaWVyKTtcblxuICAgICAgICB0aGlzLl9vbkJlZ2luKCk7XG4gICAgICAgIHRoaXMuX29uQ2hhbmdlKCk7XG4gICAgICAgIHRoaXMuX2Zvcm1hdCgpO1xuICAgIH1cbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fb25JbnB1dEtleVVwID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIga2V5Q29kZSA9IGUua2V5Q29kZTtcblxuXG4gICAgaWYgKGUuc2hpZnRLZXkgfHwga2V5Q29kZSA9PSAzOCB8fFxuICAgICAgICBrZXlDb2RlID09IDQwIHx8IGtleUNvZGUgPT0gMTkwIHx8XG4gICAgICAgIGtleUNvZGUgPT0gOCB8fCBrZXlDb2RlID09IDM5IHx8XG4gICAgICAgIGtleUNvZGUgPT0gMzcgfHwga2V5Q29kZSA9PSAxODkpIHtcbiAgICAgICAgdGhpcy5fcHJldktleUNvZGUgPSBrZXlDb2RlO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3ByZXZLZXlDb2RlID09IDE4OSAmJiBrZXlDb2RlID09IDQ4KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9IC8vLTBcbiAgICBpZiAodGhpcy5fcHJldktleUNvZGUgPT0gMTkwICYmIGtleUNvZGUgPT0gNDgpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH0gLy8wLjBcblxuICAgIHRoaXMuX3ZhbGlkYXRlKCk7XG4gICAgdGhpcy5fZm9ybWF0KCk7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoZSkge1xuICAgIHRoaXMuX3ZhbGlkYXRlKCk7XG4gICAgdGhpcy5fZm9ybWF0KCk7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuX3ZhbGlkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlucHV0SXNOdW1iZXIoKSkge1xuICAgICAgICB2YXIgaW5wdXQgPSB0aGlzLl9nZXRJbnB1dCgpO1xuICAgICAgICBpZiAoaW5wdXQgIT0gJy0nKXRoaXMuX3ZhbHVlID0gTnVtYmVyKGlucHV0KTtcbiAgICAgICAgdGhpcy5fb25DaGFuZ2UoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3NldE91dHB1dCh0aGlzLl92YWx1ZSk7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuaW5wdXRJc051bWJlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9nZXRJbnB1dCgpO1xuXG4gICAgLy9UT0RPOkZJWFxuICAgIGlmICh2YWx1ZSA9PSAnLScgfHwgdmFsdWUgPT0gJzAnKXJldHVybiB0cnVlO1xuICAgIHJldHVybiAvXlxccyotP1swLTldXFxkKihcXC5cXGR7MSwxMDAwMDAwfSk/XFxzKiQvLnRlc3QodmFsdWUpO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl9mb3JtYXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN0cmluZyA9IHRoaXMuX3ZhbHVlLnRvU3RyaW5nKCksXG4gICAgICAgIGluZGV4ID0gc3RyaW5nLmluZGV4T2YoJy4nKTtcblxuICAgIGlmIChpbmRleCA+IDApIHtcbiAgICAgICAgc3RyaW5nID0gc3RyaW5nLnNsaWNlKDAsIGluZGV4ICsgdGhpcy5fdmFsdWVEUGxhY2UpO1xuICAgIH1cbiAgICB0aGlzLl9zZXRPdXRwdXQoc3RyaW5nKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fc2V0T3V0cHV0ID0gZnVuY3Rpb24gKG4pIHtcbiAgICB0aGlzLl9pbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLCBuKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fZ2V0SW5wdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpXG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24gKG4pIHtcbiAgICB0aGlzLl92YWx1ZSA9IG47XG4gICAgdGhpcy5fZm9ybWF0KCk7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faW5wdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlcklucHV0X0ludGVybmFsO1xuIiwidmFyIE91dHB1dCA9IHJlcXVpcmUoJy4vT3V0cHV0Jyk7XG5cbnZhciBERUZBVUxUX09VVFBVVF9EUCA9IDI7XG5cbmZ1bmN0aW9uIE51bWJlck91dHB1dChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuXHRwYXJhbXMgPSBwYXJhbXMgfHwge307XG5cdHBhcmFtcy5kcCA9IHBhcmFtcy5kcCB8fCBERUZBVUxUX09VVFBVVF9EUDtcblxuXHRPdXRwdXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0dGhpcy5fdmFsdWVEUGxhY2UgPSBwYXJhbXMuZHAgKyAxO1xufVxuXG5OdW1iZXJPdXRwdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPdXRwdXQucHJvdG90eXBlKTtcblxuLy9GSVhNRVxuTnVtYmVyT3V0cHV0LnByb3RvdHlwZS5fc2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0aGlzLl9wYXJlbnQuaXNEaXNhYmxlZCgpKXtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR2YXIgdmFsdWUgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSxcblx0XHR0ZXh0QXJlYSA9IHRoaXMuX3RleHRBcmVhLFxuXHRcdGRwID0gdGhpcy5fdmFsdWVEUGxhY2U7XG5cblx0dmFyIGluZGV4LFxuXHRcdG91dDtcblxuXHRpZiAodHlwZW9mKHZhbHVlKSA9PT0gJ29iamVjdCcgJiZcblx0XHR0eXBlb2YodmFsdWUubGVuZ3RoKSA9PT0gJ251bWJlcicgJiZcblx0XHR0eXBlb2YodmFsdWUuc3BsaWNlKSA9PT0gJ2Z1bmN0aW9uJyAmJlxuXHRcdCF2YWx1ZS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgnbGVuZ3RoJykpIHtcblxuXHRcdG91dCA9IHZhbHVlLnNsaWNlKCk7XG5cblx0XHR2YXIgaSA9IC0xO1xuXHRcdHZhciB0ZW1wO1xuXHRcdHZhciB3cmFwID0gdGhpcy5fd3JhcDtcblxuXHRcdHdoaWxlICgrK2kgPCBvdXQubGVuZ3RoKSB7XG5cdFx0XHR0ZW1wID0gb3V0W2ldID0gb3V0W2ldLnRvU3RyaW5nKCk7XG5cdFx0XHRpbmRleCA9IHRlbXAuaW5kZXhPZignLicpO1xuXHRcdFx0aWYgKGluZGV4ID4gMCl7XG5cdFx0XHRcdG91dFtpXSA9IHRlbXAuc2xpY2UoMCwgaW5kZXggKyBkcCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHdyYXApIHtcblx0XHRcdHRleHRBcmVhLnNldFN0eWxlUHJvcGVydHkoJ3doaXRlLXNwYWNlJywgJ25vd3JhcCcpO1xuXHRcdFx0b3V0ID0gb3V0LmpvaW4oJ1xcbicpO1xuXHRcdH1cblxuXHRcdHRleHRBcmVhLnNldFByb3BlcnR5KCd2YWx1ZScsIG91dCk7XG5cdH1lbHNlIHtcblx0XHRvdXQgPSB2YWx1ZS50b1N0cmluZygpO1xuXHRcdGluZGV4ID0gb3V0LmluZGV4T2YoJy4nKTtcblx0XHR0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgndmFsdWUnLCBpbmRleCA+IDAgPyBvdXQuc2xpY2UoMCwgaW5kZXggKyBkcCkgOiBvdXQpO1xuXHR9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTnVtYmVyT3V0cHV0OyIsInZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG5cbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcblxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgQ29sb3JNb2RlID0gcmVxdWlyZSgnLi4vY29yZS9jb2xvci9Db2xvck1vZGUnKTtcbnZhciBDb2xvclV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yVXRpbCcpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4uL2NvcmUvTWV0cmljJyk7XG5cbmZ1bmN0aW9uIE9wdGlvbnMocGFyZW50Tm9kZSkge1xuICAgIHRoaXMuX3BhcmVuTm9kZSA9IHBhcmVudE5vZGU7XG5cbiAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGUgPSBuZXcgTm9kZSgpO1xuICAgIHZhciBsaXN0Tm9kZSA9IHRoaXMuX2xpc3ROb2RlID0gbmV3IE5vZGUoTm9kZS5MSVNUKTtcblxuICAgIG5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuT3B0aW9ucyk7XG4gICAgbm9kZS5hZGRDaGlsZChsaXN0Tm9kZSk7XG5cbiAgICB0aGlzLl9zZWxlY3RlZEluZGV4ID0gbnVsbDtcbiAgICB0aGlzLl9jYWxsYmFja091dCA9IGZ1bmN0aW9uICgpIHsgfTtcblxuICAgIHRoaXMuX3VuZm9jdXNhYmxlID0gZmFsc2U7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25Eb2N1bWVudE1vdXNlRG93bi5iaW5kKHRoaXMpKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfVVAsIHRoaXMuX29uRG9jdW1lbnRNb3VzZVVwLmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5jbGVhcigpO1xufVxuXG5PcHRpb25zLnByb3RvdHlwZSA9IHtcbiAgICBfb25Eb2N1bWVudE1vdXNlRG93bjogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3VuZm9jdXNhYmxlKXJldHVybjtcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tPdXQoKTtcbiAgICB9LFxuXG4gICAgX29uRG9jdW1lbnRNb3VzZVVwOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3VuZm9jdXNhYmxlID0gdHJ1ZTtcbiAgICB9LFxuXG4gICAgYnVpbGQ6IGZ1bmN0aW9uIChlbnRyaWVzLCBzZWxlY3RlZCwgZWxlbWVudCwgY2FsbGJhY2tTZWxlY3QsIGNhbGxiYWNrT3V0LCBwYWRkaW5nUmlnaHQsIGFyZUNvbG9ycywgY29sb3JNb2RlKSB7XG4gICAgICAgIHRoaXMuX2NsZWFyTGlzdCgpO1xuXG4gICAgICAgIHRoaXMuX3BhcmVuTm9kZS5hZGRDaGlsZCh0aGlzLmdldE5vZGUoKSk7XG5cbiAgICAgICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgICAgIGxpc3ROb2RlID0gdGhpcy5fbGlzdE5vZGU7XG5cbiAgICAgICAgcGFkZGluZ1JpZ2h0ID0gcGFkZGluZ1JpZ2h0IHx8IDA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIC8vIGJ1aWxkIGxpc3RcbiAgICAgICAgdmFyIGl0ZW1Ob2RlLCBlbnRyeTtcbiAgICAgICAgdmFyIGkgPSAtMTtcblxuICAgICAgICBpZiAoYXJlQ29sb3JzKSB7XG4gICAgICAgICAgICBjb2xvck1vZGUgPSBjb2xvck1vZGUgfHwgQ29sb3JNb2RlLkhFWDtcblxuICAgICAgICAgICAgbGlzdE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQ29sb3IpO1xuXG4gICAgICAgICAgICB2YXIgY29sb3IsIG5vZGVDb2xvcjtcblxuICAgICAgICAgICAgd2hpbGUgKCsraSA8IGVudHJpZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZW50cnkgPSBlbnRyaWVzW2ldO1xuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlID0gbGlzdE5vZGUuYWRkQ2hpbGQobmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pKTtcbiAgICAgICAgICAgICAgICBjb2xvciA9IGl0ZW1Ob2RlLmFkZENoaWxkKG5ldyBOb2RlKCkpO1xuXG4gICAgICAgICAgICAgICAgc3dpdGNoIChjb2xvck1vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuSEVYOlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUNvbG9yID0gZW50cnk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuUkdCOlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUNvbG9yID0gQ29sb3JVdGlsLlJHQjJIRVgoZW50cnlbMF0sIGVudHJ5WzFdLCBlbnRyeVsyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBDb2xvck1vZGUuUkdCZnY6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCZnYySEVYKGVudHJ5WzBdLCBlbnRyeVsxXSwgZW50cnlbMl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ29sb3JNb2RlLkhTVjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVDb2xvciA9IENvbG9yVXRpbC5IU1YyUkdCKGVudHJ5WzBdLCBlbnRyeVsxXSwgZW50cnlbMl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29sb3IuZ2V0U3R5bGUoKS5iYWNrZ3JvdW5kQ29sb3IgPSBub2RlQ29sb3I7XG4gICAgICAgICAgICAgICAgY29sb3IuZ2V0U3R5bGUoKS5iYWNrZ3JvdW5kSW1hZ2UgPSAnbGluZWFyLWdyYWRpZW50KCByZ2JhKDAsMCwwLDApIDAlLCByZ2JhKDAsMCwwLDAuMSkgMTAwJSknO1xuICAgICAgICAgICAgICAgIGNvbG9yLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCBlbnRyeSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZW50cnkgPT0gc2VsZWN0ZWQpaXRlbU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuT3B0aW9uc1NlbGVjdGVkKTtcblxuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3NlbGVjdGVkSW5kZXggPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMucGFyZW50Tm9kZS5jaGlsZHJlbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja1NlbGVjdCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGlzdE5vZGUuZGVsZXRlU3R5bGVDbGFzcygpO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytpIDwgZW50cmllcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IGVudHJpZXNbaV07XG5cbiAgICAgICAgICAgICAgICBpdGVtTm9kZSA9IGxpc3ROb2RlLmFkZENoaWxkKG5ldyBOb2RlKE5vZGUuTElTVF9JVEVNKSk7XG4gICAgICAgICAgICAgICAgaXRlbU5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGVudHJ5KTtcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkgPT0gc2VsZWN0ZWQpaXRlbU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuT3B0aW9uc1NlbGVjdGVkKTtcblxuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3NlbGVjdGVkSW5kZXggPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMucGFyZW50Tm9kZS5jaGlsZHJlbiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja1NlbGVjdCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vcG9zaXRpb24sIHNldCB3aWR0aCBhbmQgZW5hYmxlXG5cbiAgICAgICAgdmFyIGVsZW1lbnRQb3MgPSBlbGVtZW50LmdldFBvc2l0aW9uR2xvYmFsKCksXG4gICAgICAgICAgICBlbGVtZW50V2lkdGggPSBlbGVtZW50LmdldFdpZHRoKCkgLSBwYWRkaW5nUmlnaHQsXG4gICAgICAgICAgICBlbGVtZW50SGVpZ2h0ID0gZWxlbWVudC5nZXRIZWlnaHQoKTtcblxuICAgICAgICB2YXIgbGlzdFdpZHRoID0gbGlzdE5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgICAgIGxpc3RIZWlnaHQgPSBsaXN0Tm9kZS5nZXRIZWlnaHQoKSxcbiAgICAgICAgICAgIHN0cm9rZU9mZnNldCA9IE1ldHJpYy5TVFJPS0VfU0laRSAqIDI7XG5cbiAgICAgICAgdmFyIHBhZGRpbmdPcHRpb25zID0gTWV0cmljLlBBRERJTkdfT1BUSU9OUztcblxuICAgICAgICB2YXIgd2lkdGggPSAobGlzdFdpZHRoIDwgZWxlbWVudFdpZHRoID8gZWxlbWVudFdpZHRoIDogbGlzdFdpZHRoKSAtIHN0cm9rZU9mZnNldCxcbiAgICAgICAgICAgIHBvc1ggPSBlbGVtZW50UG9zWzBdLFxuICAgICAgICAgICAgcG9zWSA9IGVsZW1lbnRQb3NbMV0gKyBlbGVtZW50SGVpZ2h0IC0gcGFkZGluZ09wdGlvbnM7XG5cbiAgICAgICAgdmFyIHdpbmRvd1dpZHRoID0gd2luZG93LmlubmVyV2lkdGgsXG4gICAgICAgICAgICB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbiAgICAgICAgdmFyIHJvb3RQb3NYID0gKHBvc1ggKyB3aWR0aCkgPiB3aW5kb3dXaWR0aCA/IChwb3NYIC0gd2lkdGggKyBlbGVtZW50V2lkdGggLSBzdHJva2VPZmZzZXQpIDogcG9zWCxcbiAgICAgICAgICAgIHJvb3RQb3NZID0gKHBvc1kgKyBsaXN0SGVpZ2h0KSA+IHdpbmRvd0hlaWdodCA/IChwb3NZIC0gbGlzdEhlaWdodCAqIDAuNSAtIGVsZW1lbnRIZWlnaHQgKiAwLjUpIDogcG9zWTtcblxuICAgICAgICBsaXN0Tm9kZS5zZXRXaWR0aCh3aWR0aCk7XG4gICAgICAgIHJvb3ROb2RlLnNldFBvc2l0aW9uR2xvYmFsKHJvb3RQb3NYLCByb290UG9zWSk7XG5cbiAgICAgICAgdGhpcy5fY2FsbGJhY2tPdXQgPSBjYWxsYmFja091dDtcbiAgICAgICAgdGhpcy5fdW5mb2N1c2FibGUgPSBmYWxzZTtcbiAgICB9LFxuXG4gICAgX2NsZWFyTGlzdDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9saXN0Tm9kZS5yZW1vdmVBbGxDaGlsZHJlbigpO1xuICAgICAgICB0aGlzLl9saXN0Tm9kZS5kZWxldGVTdHlsZVByb3BlcnR5KCd3aWR0aCcpO1xuICAgICAgICB0aGlzLl9zZWxlY3RlZEluZGV4ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fYnVpbGQgPSBmYWxzZTtcbiAgICB9LFxuXG4gICAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fY2xlYXJMaXN0KCk7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrT3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9wYXJlbk5vZGUucmVtb3ZlQ2hpbGQodGhpcy5nZXROb2RlKCkpO1xuXG4gICAgfSxcblxuICAgIGlzQnVpbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2J1aWxkO1xuICAgIH0sXG4gICAgZ2V0Tm9kZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbm9kZTtcbiAgICB9LFxuICAgIGdldFNlbGVjdGVkSW5kZXg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbGVjdGVkSW5kZXg7XG4gICAgfVxufTtcblxuT3B0aW9ucy5zZXR1cCA9IGZ1bmN0aW9uKHBhcmVudE5vZGUpe3JldHVybiBPcHRpb25zLl9pbnN0YW5jZSA9IG5ldyBPcHRpb25zKHBhcmVudE5vZGUpO307XG5PcHRpb25zLmdldCAgID0gZnVuY3Rpb24oKXtyZXR1cm4gT3B0aW9ucy5faW5zdGFuY2U7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBPcHRpb25zOyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi4vY29yZS9NZXRyaWMnKTtcbnZhciBTY3JvbGxCYXIgPSByZXF1aXJlKCcuLi9jb3JlL2xheW91dC9TY3JvbGxCYXInKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIERFRkFVTFRfSEVJR0hUID0gbnVsbCxcbiAgICBERUZBVUxUX1dSQVAgICA9IGZhbHNlLFxuICAgIERFRkFVTFRfVVBEQVRFID0gdHJ1ZTtcblxuZnVuY3Rpb24gT3V0cHV0KHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKSB7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyAgICAgICAgICAgID0gcGFyYW1zICAgICAgICB8fCB7fTtcbiAgICBwYXJhbXMuaGVpZ2h0ICAgICA9IHBhcmFtcy5oZWlnaHQgfHwgREVGQVVMVF9IRUlHSFQ7XG4gICAgcGFyYW1zLndyYXAgICAgICAgPSBwYXJhbXMud3JhcCAgID09PSB1bmRlZmluZWQgP1xuICAgICAgICAgICAgICAgICAgICAgICAgREVGQVVMVF9XUkFQIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy53cmFwO1xuICAgIHBhcmFtcy51cGRhdGUgICAgID0gcGFyYW1zLnVwZGF0ZSA9PT0gdW5kZWZpbmVkID9cbiAgICAgICAgICAgICAgICAgICAgICAgIERFRkFVTFRfVVBEQVRFIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy51cGRhdGU7XG5cbiAgICB0aGlzLl93cmFwID0gcGFyYW1zLndyYXA7XG4gICAgdGhpcy5fdXBkYXRlID0gcGFyYW1zLnVwZGF0ZTtcblxuICAgIHZhciB0ZXh0QXJlYSA9IHRoaXMuX3RleHRBcmVhID0gbmV3IE5vZGUoTm9kZS5URVhUQVJFQSksXG4gICAgICAgIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIHJvb3ROb2RlID0gdGhpcy5fbm9kZTtcblxuICAgICAgICB0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgncmVhZE9ubHknLHRydWUpO1xuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZCh0ZXh0QXJlYSk7XG5cbiAgICAgICAgdGV4dEFyZWEuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTix0aGlzLl9vbklucHV0RHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsdGhpcy5fcGFyZW50LCdvbkNvbXBvbmVudFNlbGVjdERyYWcnKTtcblxuXG4gICAgaWYocGFyYW1zLmhlaWdodCl7XG4gICAgICAgIHZhciB0ZXh0QXJlYVdyYXAgPSBuZXcgTm9kZSgpO1xuICAgICAgICAgICAgdGV4dEFyZWFXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLlRleHRBcmVhV3JhcCk7XG4gICAgICAgICAgICB0ZXh0QXJlYVdyYXAuYWRkQ2hpbGQodGV4dEFyZWEpO1xuICAgICAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQodGV4dEFyZWFXcmFwKTtcblxuICAgICAgICAvL0ZJWE1FXG4gICAgICAgIHZhciBoZWlnaHQgID0gdGhpcy5faGVpZ2h0ID0gcGFyYW1zLmhlaWdodCxcbiAgICAgICAgICAgIHBhZGRpbmcgPSA0O1xuXG4gICAgICAgICAgICB0ZXh0QXJlYS5zZXRIZWlnaHQoTWF0aC5tYXgoaGVpZ2h0ICsgcGFkZGluZyAgLE1ldHJpYy5DT01QT05FTlRfTUlOX0hFSUdIVCkpO1xuICAgICAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KHRleHRBcmVhLmdldEhlaWdodCgpKTtcbiAgICAgICAgICAgIHJvb3ROb2RlLnNldEhlaWdodCh3cmFwTm9kZS5nZXRIZWlnaHQoKSArIHBhZGRpbmcpO1xuXG4gICAgICAgIHRoaXMuX3Njcm9sbEJhciA9IG5ldyBTY3JvbGxCYXIodGV4dEFyZWFXcmFwLHRleHRBcmVhLGhlaWdodCAtIHBhZGRpbmcpXG4gICAgfVxuXG4gICAgaWYocGFyYW1zLndyYXApe1xuICAgICAgICB0ZXh0QXJlYS5zZXRTdHlsZVByb3BlcnR5KCd3aGl0ZS1zcGFjZScsJ3ByZS13cmFwJyk7XG4gICAgfVxuXG4gICAgdGhpcy5fcHJldlN0cmluZyA9ICcnO1xuICAgIHRoaXMuX3ByZXZTY3JvbGxIZWlnaHQgPSAtMTtcbiAgICB0aGlzLl9zZXRWYWx1ZSgpO1xufVxuXG5PdXRwdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3RDb21wb25lbnQucHJvdG90eXBlKTtcblxuXG4vL092ZXJyaWRlIGluIHN1YmNsYXNzXG5PdXRwdXQucHJvdG90eXBlLl9zZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHt9O1xuXG5cbk91dHB1dC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9zZXRWYWx1ZSgpO1xufTtcblxuT3V0cHV0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYoIXRoaXMuX3VwZGF0ZSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fc2V0VmFsdWUoKTtcbn07XG5cblxuLy9QcmV2ZW50IGNocm9tZSBzZWxlY3QgZHJhZ1xuXG5PdXRwdXQucHJvdG90eXBlLl9vbkRyYWcgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLCBudWxsKSk7XG59O1xuXG5PdXRwdXQucHJvdG90eXBlLl9vbkRyYWdGaW5pc2ggPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLCBudWxsKSk7XG5cbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xufTtcblxuT3V0cHV0LnByb3RvdHlwZS5fb25JbnB1dERyYWdTdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLCBudWxsKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsIHRoaXMuX29uRHJhZy5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX1VQLCAgIHRoaXMuX29uRHJhZ0ZpbmlzaC5iaW5kKHRoaXMpLCBmYWxzZSk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gT3V0cHV0O1xuIiwidmFyIFBsb3R0ZXIgPSByZXF1aXJlKCcuL1Bsb3R0ZXInKTtcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbnZhciBERUZBVUxUX0JPVU5EU19YID0gWy0xLDFdLFxuICAgIERFRkFVTFRfQk9VTkRTX1kgPSBbLTEsMV0sXG4gICAgREVGQVVMVF9MQUJFTF9YICA9ICcnLFxuICAgIERFRkFVTFRfTEFCRUxfWSAgPSAnJztcblxuZnVuY3Rpb24gUGFkKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgUGxvdHRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5ib3VuZHNYICAgID0gcGFyYW1zLmJvdW5kc1ggICAgfHwgREVGQVVMVF9CT1VORFNfWDtcbiAgICBwYXJhbXMuYm91bmRzWSAgICA9IHBhcmFtcy5ib3VuZHNZICAgIHx8IERFRkFVTFRfQk9VTkRTX1k7XG4gICAgcGFyYW1zLmxhYmVsWCAgICAgPSBwYXJhbXMubGFiZWxYICAgICB8fCBERUZBVUxUX0xBQkVMX1g7XG4gICAgcGFyYW1zLmxhYmVsWSAgICAgPSBwYXJhbXMubGFiZWxZICAgICB8fCBERUZBVUxUX0xBQkVMX1k7XG5cbiAgICBwYXJhbXMuc2hvd0Nyb3NzICA9IHBhcmFtcy5zaG93Q3Jvc3MgIHx8IHRydWU7XG5cblxuICAgIHRoaXMuX29uQ2hhbmdlICAgICA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcbiAgICB0aGlzLl9vbkZpbmlzaCAgICAgPSBwYXJhbXMub25GaW5pc2ggfHwgZnVuY3Rpb24oKXt9O1xuXG4gICAgdGhpcy5fYm91bmRzWCAgICAgID0gcGFyYW1zLmJvdW5kc1g7XG4gICAgdGhpcy5fYm91bmRzWSAgICAgID0gcGFyYW1zLmJvdW5kc1k7XG4gICAgdGhpcy5fbGFiZWxBeGlzWCAgID0gcGFyYW1zLmxhYmVsWCAhPSAnJyAmJiBwYXJhbXMubGFiZWxYICE9ICdub25lJyA/IHBhcmFtcy5sYWJlbFggOiBudWxsO1xuICAgIHRoaXMuX2xhYmVsQXhpc1kgICA9IHBhcmFtcy5sYWJlbFkgIT0gJycgJiYgcGFyYW1zLmxhYmVsWSAhPSAnbm9uZScgPyBwYXJhbXMubGFiZWxZIDogbnVsbDtcblxuICAgIHZhciBwYXRoID0gdGhpcy5fcGF0aDtcbiAgICAgICAgcGF0aC5zdHlsZS5zdHJva2VXaWR0aCA9IDE7XG4gICAgICAgIHBhdGguc3R5bGUuc3Ryb2tlICAgICAgPSAnIzM2M2M0MCc7XG5cbiAgICB0aGlzLl9ncmlkLnN0eWxlLnN0cm9rZSA9ICdyZ2IoMjUsMjUsMjUpJztcblxuICAgIHRoaXMuX3N2Z1BvcyA9IFswLDBdO1xuXG5cbiAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlID0gdGhpcy5fc3ZnUm9vdC5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2cnKSk7XG4gICAgdmFyIGhhbmRsZUNpcmNsZTAgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTAuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMTEpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMC5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2JhKDAsMCwwLDAuMDUpJyk7XG4gICAgdmFyIGhhbmRsZUNpcmNsZTEgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTEuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMTApKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMS5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoODMsOTMsOTgpJyk7XG5cbiAgICB2YXIgaGFuZGxlQ2lyY2xlMiA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMi5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZyg5KSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTIuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiKDU3LDY5LDc2KScpO1xuICAgICAgICBoYW5kbGVDaXJjbGUyLnNldEF0dHJpYnV0ZSgnY3knLFN0cmluZygwLjc1KSk7XG5cbiAgICB2YXIgaGFuZGxlQ2lyY2xlMyA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMy5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZygxMCkpO1xuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgnc3Ryb2tlJywncmdiKDE3LDE5LDIwKScpO1xuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgnc3Ryb2tlLXdpZHRoJyxTdHJpbmcoMSkpO1xuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgnZmlsbCcsJ25vbmUnKTtcblxuICAgIHZhciBoYW5kbGVDaXJjbGU0ID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xuICAgICAgICBoYW5kbGVDaXJjbGU0LnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDYpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlNC5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoMzAsMzQsMzYpJyk7XG4gICAgdmFyIGhhbmRsZUNpcmNsZTUgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTUuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoMykpO1xuICAgICAgICBoYW5kbGVDaXJjbGU1LnNldEF0dHJpYnV0ZSgnZmlsbCcsJ3JnYigyNTUsMjU1LDI1NSknKTtcblxuICAgICAgICBoYW5kbGUuc2V0QXR0cmlidXRlKCd0cmFuZm9ybScsJ3RyYW5zbGF0ZSgwIDApJyk7XG5cbiAgICB0aGlzLl9zdmcuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sdGhpcy5fb25EcmFnU3RhcnQuYmluZCh0aGlzKSxmYWxzZSk7XG4gICAgdGhpcy5fZHJhd1ZhbHVlKHRoaXMuX29iamVjdFt0aGlzLl9rZXldKTtcbn1cblxuUGFkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGxvdHRlci5wcm90b3R5cGUpO1xuXG5QYWQucHJvdG90eXBlLl9vbkRyYWdTdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMuX3N2ZztcblxuICAgIHZhciBzdmdQb3MgPSB0aGlzLl9zdmdQb3M7XG4gICAgICAgIHN2Z1Bvc1swXSA9IDA7XG4gICAgICAgIHN2Z1Bvc1sxXSA9IDA7XG5cbiAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICBzdmdQb3NbMF0gKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICBzdmdQb3NbMV0gKz0gZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICB9XG5cbiAgICB2YXIgZXZlbnRNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICBldmVudFVwICAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fZHJhd1ZhbHVlSW5wdXQoKTtcbiAgICAgICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgICAgIHRoaXMuX29uQ2hhbmdlKCk7XG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgdmFyIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgICAgIHRoaXMuX2RyYXdWYWx1ZUlucHV0KCk7XG4gICAgICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgICAgICB0aGlzLl9vbkZpbmlzaCgpO1xuXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCAgICBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFVwLCAgIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgdGhpcy5fZHJhd1ZhbHVlSW5wdXQoKTtcbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuUGFkLnByb3RvdHlwZS5fcmVkcmF3ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2RyYXdWYWx1ZSh0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG59O1xuXG5QYWQucHJvdG90eXBlLl9kcmF3VmFsdWVJbnB1dCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9kcmF3VmFsdWUodGhpcy5fZ2V0TW91c2VOb3JtYWxpemVkKCkpO1xufTtcblxuUGFkLnByb3RvdHlwZS5fZHJhd1ZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdGhpcy5fb2JqZWN0W3RoaXMuX2tleV0gPSB2YWx1ZTtcbiAgICB0aGlzLl9kcmF3R3JpZCgpO1xuICAgIHRoaXMuX2RyYXdQb2ludCgpO1xufTtcblxuUGFkLnByb3RvdHlwZS5fZHJhd0dyaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2Z1NpemUgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIHN2Z01pZFggPSBNYXRoLmZsb29yKHN2Z1NpemUgKiAwLjUpLFxuICAgICAgICBzdmdNaWRZID0gTWF0aC5mbG9vcihzdmdTaXplICogMC41KTtcblxuICAgIHZhciBwYXRoQ21kID0gJyc7XG4gICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCBzdmdNaWRZLCBzdmdTaXplLCBzdmdNaWRZKTtcbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKHN2Z01pZFgsIDAsIHN2Z01pZFgsIHN2Z1NpemUpO1xuXG4gICAgdGhpcy5fZ3JpZC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbn07XG5cblxuUGFkLnByb3RvdHlwZS5fZHJhd1BvaW50ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmdTaXplID0gTnVtYmVyKHRoaXMuX3N2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBzdmdNaWRYID0gc3ZnU2l6ZSAqIDAuNSxcbiAgICAgICAgc3ZnTWlkWSA9IHN2Z1NpemUgKiAwLjU7XG5cbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcblxuICAgIHZhciBsb2NhbFggPSAoIDAuNSArIHZhbHVlWzBdICogMC41ICkgKiBzdmdTaXplLFxuICAgICAgICBsb2NhbFkgPSAoIDAuNSArIC12YWx1ZVsxXSAqIDAuNSApICogc3ZnU2l6ZTtcblxuICAgIHZhciBwYXRoQ21kID0gJyc7XG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUoMCwgbG9jYWxZLCBzdmdTaXplLCBsb2NhbFkpO1xuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKGxvY2FsWCwgMCwgbG9jYWxYLCBzdmdTaXplKTtcblxuICAgIHRoaXMuX3BhdGguc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XG4gICAgdGhpcy5faGFuZGxlLnNldEF0dHJpYnV0ZSgndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgbG9jYWxYICsgJyAnICsgbG9jYWxZICsgJyknKTtcbn07XG5cblBhZC5wcm90b3R5cGUuX2dldE1vdXNlTm9ybWFsaXplZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb2Zmc2V0ID0gdGhpcy5fc3ZnUG9zLFxuICAgICAgICBtb3VzZSA9IE1vdXNlLmdldEluc3RhbmNlKCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgc3ZnU2l6ZSA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcblxuICAgIHJldHVybiBbLTEgKyBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVswXSAtIG9mZnNldFswXSwgc3ZnU2l6ZSkpIC8gc3ZnU2l6ZSAqIDIsXG4gICAgICAgICggMSAtIE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlWzFdIC0gb2Zmc2V0WzFdLCBzdmdTaXplKSkgLyBzdmdTaXplICogMildO1xuXG59O1xuXG5QYWQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xufTtcblxuUGFkLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXJldHVybjtcbiAgICB0aGlzLl9kcmF3VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYWQ7XG4iLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcbnZhciBDb2xvclV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yVXRpbCcpO1xudmFyIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xuXG52YXIgREVGQVVMVF9WQUxVRV9IVUUgPSAyMDAuMCxcbiAgICBERUZBVUxUX1ZBTFVFX1NBVCA9IDUwLjAsXG4gICAgREVGQVVMVF9WQUxVRV9WQUwgPSA1MC4wO1xuXG5mdW5jdGlvbiBQaWNrZXIocGFyZW50Tm9kZSl7XG4gICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSAgICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlciksXG4gICAgICAgIGhlYWROb2RlID0gdGhpcy5faGVhZE5vZGUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpLFxuICAgICAgICBsYWJsV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIGxhYmxOb2RlID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCksXG4gICAgICAgIG1lbnVOb2RlID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5NZW51KSxcbiAgICAgICAgd3JhcE5vZGUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuXG4gICAgdmFyIG1lbnVDbG9zZSA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcbiAgICAgICAgbWVudUNsb3NlLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnVCdG5DbG9zZSk7XG5cbiAgICB2YXIgZmllbGRXcmFwICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyggQ1NTLlBpY2tlckZpZWxkV3JhcCksXG4gICAgICAgIHNsaWRlcldyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNsaWRlcldyYXApLFxuICAgICAgICBpbnB1dFdyYXAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKCBDU1MuUGlja2VySW5wdXRXcmFwKTtcblxuICAgIHZhciBjYW52YXNGaWVsZCAgPSB0aGlzLl9jYW52YXNGaWVsZCAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKSxcbiAgICAgICAgY2FudmFzU2xpZGVyID0gdGhpcy5fY2FudmFzU2xpZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnQ2FudmFzJyk7XG5cbiAgICAgICAgZmllbGRXcmFwLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChjYW52YXNGaWVsZCk7XG4gICAgICAgIHNsaWRlcldyYXAuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKGNhbnZhc1NsaWRlcik7XG5cbiAgICAgICAgdGhpcy5fc2V0U2l6ZUNhbnZhc0ZpZWxkKDE1NCwxNTQpO1xuICAgICAgICB0aGlzLl9zZXRTaXplQ2FudmFzU2xpZGVyKDE0LDE1NCk7XG5cbiAgICB2YXIgY29udGV4dENhbnZhc0ZpZWxkICA9IHRoaXMuX2NvbnRleHRDYW52YXNGaWVsZCAgPSBjYW52YXNGaWVsZC5nZXRDb250ZXh0KCcyZCcpLFxuICAgICAgICBjb250ZXh0Q2FudmFzU2xpZGVyID0gdGhpcy5fY29udGV4dENhbnZhc1NsaWRlciA9IGNhbnZhc1NsaWRlci5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgdmFyIGhhbmRsZUZpZWxkICA9IHRoaXMuX2hhbmRsZUZpZWxkICA9IG5ldyBOb2RlKCk7XG4gICAgICAgIGhhbmRsZUZpZWxkLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckhhbmRsZUZpZWxkKTtcblxuICAgIHZhciBoYW5kbGVTbGlkZXIgPSB0aGlzLl9oYW5kbGVTbGlkZXIgPSBuZXcgTm9kZSgpO1xuICAgICAgICBoYW5kbGVTbGlkZXIuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySGFuZGxlU2xpZGVyKTtcblxuICAgIHZhciBzdGVwID0gMS4wLFxuICAgICAgICBkcCAgID0gMDtcblxuICAgIHZhciBjYWxsYmFja0h1ZSA9IHRoaXMuX29uSW5wdXRIdWVDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgY2FsbGJhY2tTYXQgPSB0aGlzLl9vbklucHV0U2F0Q2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgIGNhbGxiYWNrVmFsID0gdGhpcy5fb25JbnB1dFZhbENoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICBjYWxsYmFja1IgICA9IHRoaXMuX29uSW5wdXRSQ2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgIGNhbGxiYWNrRyAgID0gdGhpcy5fb25JbnB1dEdDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgY2FsbGJhY2tCICAgPSB0aGlzLl9vbklucHV0QkNoYW5nZS5iaW5kKHRoaXMpO1xuXG5cbiAgICB2YXIgaW5wdXRIdWUgPSB0aGlzLl9pbnB1dEh1ZSA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tIdWUsY2FsbGJhY2tIdWUpLFxuICAgICAgICBpbnB1dFNhdCA9IHRoaXMuX2lucHV0U2F0ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja1NhdCxjYWxsYmFja1NhdCksXG4gICAgICAgIGlucHV0VmFsID0gdGhpcy5faW5wdXRWYWwgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrVmFsLGNhbGxiYWNrVmFsKSxcbiAgICAgICAgaW5wdXRSICAgPSB0aGlzLl9pbnB1dFIgICA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tSLGNhbGxiYWNrUiksXG4gICAgICAgIGlucHV0RyAgID0gdGhpcy5faW5wdXRHICAgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrRyxjYWxsYmFja0cpLFxuICAgICAgICBpbnB1dEIgICA9IHRoaXMuX2lucHV0QiAgID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja0IsY2FsbGJhY2tCKTtcblxuICAgIHZhciBjb250cm9sc1dyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckNvbnRyb2xzV3JhcCk7XG5cbiAgICB2YXIgYnV0dG9uUGljayAgID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbikuc2V0UHJvcGVydHkoJ3ZhbHVlJywncGljaycpLFxuICAgICAgICBidXR0b25DYW5jZWwgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTikuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uKS5zZXRQcm9wZXJ0eSgndmFsdWUnLCdjYW5jZWwnKTtcblxuXG4gICAgdmFyIGNvbG9yQ29udHJhc3QgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckNvbG9yQ29udHJhc3QpO1xuXG4gICAgdmFyIGNvbG9yMCA9IHRoaXMuX2NvbG9yQ3Vyck5vZGUgPSBuZXcgTm9kZSgpLFxuICAgICAgICBjb2xvcjEgPSB0aGlzLl9jb2xvclByZXZOb2RlID0gbmV3IE5vZGUoKTtcblxuICAgIGNvbG9yQ29udHJhc3QuYWRkQ2hpbGQoY29sb3IwKTtcbiAgICBjb2xvckNvbnRyYXN0LmFkZENoaWxkKGNvbG9yMSk7XG5cbiAgICBjb250cm9sc1dyYXAuYWRkQ2hpbGQoYnV0dG9uQ2FuY2VsKTtcbiAgICBjb250cm9sc1dyYXAuYWRkQ2hpbGQoYnV0dG9uUGljayk7XG4gICAgY29udHJvbHNXcmFwLmFkZENoaWxkKGNvbG9yQ29udHJhc3QpO1xuXG4gICAgdGhpcy5fc2V0Q29udHJhc1ByZXZDb2xvcigwLDAsMCk7XG5cbiAgICB2YXIgaW5wdXRGaWVsZFdyYXBIdWUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcFNhdCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCksXG4gICAgICAgIGlucHV0RmllbGRXcmFwVmFsID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKTtcblxuICAgIHZhciBpbnB1dEZpZWxkV3JhcEh1ZUxhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ0gnKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBTYXRMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdTJyksXG4gICAgICAgIGlucHV0RmllbGRXcmFwVmFsTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnVicpO1xuXG4gICAgICAgIGlucHV0RmllbGRXcmFwSHVlLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwSHVlTGFiZWwsaW5wdXRIdWUuZ2V0Tm9kZSgpKTtcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBTYXQuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBTYXRMYWJlbCxpbnB1dFNhdC5nZXROb2RlKCkpO1xuICAgICAgICBpbnB1dEZpZWxkV3JhcFZhbC5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFZhbExhYmVsLGlucHV0VmFsLmdldE5vZGUoKSk7XG5cbiAgICB2YXIgaW5wdXRGaWVsZFdyYXBSID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBHID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBCID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKTtcblxuICAgIHZhciBpbnB1dEZpZWxkV3JhcFJMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdSJyksXG4gICAgICAgIGlucHV0RmllbGRXcmFwR0xhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ0cnKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBCTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnQicpO1xuXG4gICAgICAgIGlucHV0RmllbGRXcmFwUi5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFJMYWJlbCxpbnB1dFIuZ2V0Tm9kZSgpKTtcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBHLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwR0xhYmVsLGlucHV0Ry5nZXROb2RlKCkpO1xuICAgICAgICBpbnB1dEZpZWxkV3JhcEIuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBCTGFiZWwsaW5wdXRCLmdldE5vZGUoKSk7XG5cblxuICAgICAgICBpbnB1dFdyYXAuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBSLGlucHV0RmllbGRXcmFwSHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRGaWVsZFdyYXBHLGlucHV0RmllbGRXcmFwU2F0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRGaWVsZFdyYXBCLGlucHV0RmllbGRXcmFwVmFsLGNvbG9yQ29udHJhc3QpO1xuXG4gICAgdmFyIGhleElucHV0V3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgIGhleElucHV0V3JhcC5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dFdyYXApO1xuXG4gICAgdmFyIGlucHV0SEVYID0gdGhpcy5faW5wdXRIRVggPSBuZXcgTm9kZShOb2RlLklOUFVUX1RFWFQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcEhFWCAgICAgICAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBIRVhMYWJlbCAgICA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpO1xuXG4gICAgICAgIGlucHV0RmllbGRXcmFwSEVYTGFiZWwuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJyMnKTtcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBIRVguYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBIRVhMYWJlbCxpbnB1dEhFWCk7XG5cbiAgICAgICAgaGV4SW5wdXRXcmFwLmFkZENoaWxkKGlucHV0RmllbGRXcmFwSEVYKTtcblxuICAgICAgICBpbnB1dEhFWC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5DSEFOR0UsdGhpcy5fb25JbnB1dEhFWEZpbmlzaC5iaW5kKHRoaXMpKTtcblxuICAgICAgICBsYWJsTm9kZS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnQ29sb3IgUGlja2VyJyk7XG5cbiAgICAgICAgbWVudU5vZGUuYWRkQ2hpbGQobWVudUNsb3NlKTtcbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGQobWVudU5vZGUpO1xuICAgICAgICBsYWJsV3JhcC5hZGRDaGlsZChsYWJsTm9kZSk7XG4gICAgICAgIGhlYWROb2RlLmFkZENoaWxkKGxhYmxXcmFwKTtcbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQoaGVhZE5vZGUpO1xuICAgICAgICByb290Tm9kZS5hZGRDaGlsZCh3cmFwTm9kZSk7XG5cbiAgICAgICAgLy93cmFwTm9kZS5hZGRDaGlsZChwYWxldHRlV3JhcCk7XG5cbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQoZmllbGRXcmFwKTtcbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQoc2xpZGVyV3JhcCk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGlucHV0V3JhcCk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGhleElucHV0V3JhcCk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGNvbnRyb2xzV3JhcCk7XG5cbiAgICAgICAgZmllbGRXcmFwLmFkZENoaWxkKCBoYW5kbGVGaWVsZCk7XG4gICAgICAgIHNsaWRlcldyYXAuYWRkQ2hpbGQoaGFuZGxlU2xpZGVyKTtcblxuICAgIHZhciBldmVudE1vdXNlRG93biA9IE5vZGVFdmVudC5NT1VTRV9ET1dOLFxuICAgICAgICBjYWxsYmFjayAgICAgICA9IHRoaXMuX29uQ2FudmFzRmllbGRNb3VzZURvd24uYmluZCh0aGlzKTtcblxuICAgICAgICBmaWVsZFdyYXAuYWRkRXZlbnRMaXN0ZW5lciggIGV2ZW50TW91c2VEb3duLCBjYWxsYmFjayk7XG4gICAgICAgIGhhbmRsZUZpZWxkLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcblxuICAgICAgICBjYWxsYmFjayA9IHRoaXMuX29uQ2FudmFzU2xpZGVyTW91c2VEb3duLmJpbmQodGhpcyk7XG5cbiAgICAgICAgc2xpZGVyV3JhcC5hZGRFdmVudExpc3RlbmVyKCAgZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcbiAgICAgICAgaGFuZGxlU2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcblxuICAgICAgICBtZW51Q2xvc2UuYWRkRXZlbnRMaXN0ZW5lciggICBldmVudE1vdXNlRG93biwgdGhpcy5fb25DbG9zZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgYnV0dG9uUGljay5hZGRFdmVudExpc3RlbmVyKCAgZXZlbnRNb3VzZURvd24sIHRoaXMuX29uUGljay5iaW5kKHRoaXMpKTtcbiAgICAgICAgYnV0dG9uQ2FuY2VsLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIHRoaXMuX29uQ2xvc2UuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgaGVhZE5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25IZWFkRHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5fcGFyZW50Tm9kZSA9IHBhcmVudE5vZGU7XG5cbiAgICB0aGlzLl9tb3VzZU9mZnNldCA9IFswLDBdO1xuICAgIHRoaXMuX3Bvc2l0aW9uICAgID0gWzAsMF07XG5cbiAgICB0aGlzLl9jYW52YXNTbGlkZXJQb3MgPSBbMCwwXTtcbiAgICB0aGlzLl9jYW52YXNGaWVsZFBvcyAgPSBbMCwwXTtcbiAgICB0aGlzLl9oYW5kbGVGaWVsZFNpemUgICAgPSAxMjtcbiAgICB0aGlzLl9oYW5kbGVTbGlkZXJIZWlnaHQgPSA3O1xuXG4gICAgdGhpcy5faW1hZ2VEYXRhU2xpZGVyID0gY29udGV4dENhbnZhc1NsaWRlci5jcmVhdGVJbWFnZURhdGEoY2FudmFzU2xpZGVyLndpZHRoLGNhbnZhc1NsaWRlci5oZWlnaHQpO1xuICAgIHRoaXMuX2ltYWdlRGF0YUZpZWxkICA9IGNvbnRleHRDYW52YXNGaWVsZC5jcmVhdGVJbWFnZURhdGEoIGNhbnZhc0ZpZWxkLndpZHRoLCBjYW52YXNGaWVsZC5oZWlnaHQpO1xuXG4gICAgdGhpcy5fdmFsdWVIdWVNaW5NYXggPSBbMCwzNjBdO1xuICAgIHRoaXMuX3ZhbHVlU2F0TWluTWF4ID0gdGhpcy5fdmFsdWVWYWxNaW5NYXggPSBbMCwxMDBdO1xuICAgIHRoaXMuX3ZhbHVlUkdCTWluTWF4ID0gWzAsMjU1XTtcblxuICAgIHRoaXMuX3ZhbHVlSHVlID0gREVGQVVMVF9WQUxVRV9IVUU7XG4gICAgdGhpcy5fdmFsdWVTYXQgPSBERUZBVUxUX1ZBTFVFX1NBVDtcbiAgICB0aGlzLl92YWx1ZVZhbCA9IERFRkFVTFRfVkFMVUVfVkFMO1xuICAgIHRoaXMuX3ZhbHVlUiAgID0gMDtcbiAgICB0aGlzLl92YWx1ZUcgICA9IDA7XG4gICAgdGhpcy5fdmFsdWVCICAgPSAwO1xuXG4gICAgdGhpcy5fdmFsdWVIRVggPSAnIzAwMDAwMCc7XG4gICAgdGhpcy5fdmFsdWVIRVhWYWxpZCA9IHRoaXMuX3ZhbHVlSEVYO1xuXG4gICAgdGhpcy5fY2FsbGJhY2tQaWNrID0gZnVuY3Rpb24oKXt9O1xuXG4gICAgLy90aGlzLl9jYW52YXNGaWVsZEltYWdlRGF0YUZ1bmMgPSBmdW5jdGlvbihpLGope3JldHVybiB0aGlzLl9IU1YyUkdCKHRoaXMuX3ZhbHVlSHVlLGopfVxuXG4gICAgdGhpcy5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgdGhpcy5fZHJhd0NhbnZhc1NsaWRlcigpO1xuXG4gICAgdGhpcy5fc2V0Q29sb3JIU1YodGhpcy5fdmFsdWVIdWUsdGhpcy5fdmFsdWVTYXQsdGhpcy5fdmFsdWVWYWwpO1xuXG4gICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XG4gICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG5cbiAgICB0aGlzLl91cGRhdGVIYW5kbGVzKCk7XG59XG5cblBpY2tlci5wcm90b3R5cGUgPVxue1xuICAgIF9kcmF3SGFuZGxlRmllbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc0ZpZWxkLFxuICAgICAgICAgICAgbm9kZVBvcyA9IHRoaXMuX2NhbnZhc0ZpZWxkUG9zLFxuICAgICAgICAgICAgbW91c2VQb3MgPSBNb3VzZS5nZXRJbnN0YW5jZSgpLmdldFBvc2l0aW9uKCk7XG5cbiAgICAgICAgdmFyIHBvc1ggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1swXSAtIG5vZGVQb3NbMF0sIGNhbnZhcy53aWR0aCkpLFxuICAgICAgICAgICAgcG9zWSA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlUG9zWzFdIC0gbm9kZVBvc1sxXSwgY2FudmFzLmhlaWdodCkpLFxuICAgICAgICAgICAgcG9zWE5vcm0gPSBwb3NYIC8gY2FudmFzLndpZHRoLFxuICAgICAgICAgICAgcG9zWU5vcm0gPSBwb3NZIC8gY2FudmFzLmhlaWdodDtcblxuICAgICAgICB2YXIgc2F0ID0gTWF0aC5yb3VuZChwb3NYTm9ybSAqIHRoaXMuX3ZhbHVlU2F0TWluTWF4WzFdKSxcbiAgICAgICAgICAgIHZhbCA9IE1hdGgucm91bmQoKDEuMCAtIHBvc1lOb3JtKSAqIHRoaXMuX3ZhbHVlVmFsTWluTWF4WzFdKTtcblxuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVih0aGlzLl92YWx1ZUh1ZSwgc2F0LCB2YWwpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlSGFuZGxlRmllbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5fY2FudmFzRmllbGQud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSB0aGlzLl9jYW52YXNGaWVsZC5oZWlnaHQsXG4gICAgICAgICAgICBvZmZzZXRIYW5kbGUgPSB0aGlzLl9oYW5kbGVGaWVsZFNpemUgKiAwLjI1O1xuXG4gICAgICAgIHZhciBzYXROb3JtID0gdGhpcy5fdmFsdWVTYXQgLyB0aGlzLl92YWx1ZVNhdE1pbk1heFsxXSxcbiAgICAgICAgICAgIHZhbE5vcm0gPSB0aGlzLl92YWx1ZVZhbCAvIHRoaXMuX3ZhbHVlVmFsTWluTWF4WzFdO1xuXG4gICAgICAgIHRoaXMuX2hhbmRsZUZpZWxkLnNldFBvc2l0aW9uR2xvYmFsKHNhdE5vcm0gKiB3aWR0aCAtIG9mZnNldEhhbmRsZSxcbiAgICAgICAgICAgICgxLjAgLSB2YWxOb3JtKSAqIGhlaWdodCAtIG9mZnNldEhhbmRsZSk7XG5cbiAgICB9LFxuXG4gICAgX2RyYXdIYW5kbGVTbGlkZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc1NsaWRlcixcbiAgICAgICAgICAgIGNhbnZhc1Bvc1kgPSB0aGlzLl9jYW52YXNTbGlkZXJQb3NbMV0sXG4gICAgICAgICAgICBtb3VzZVBvc1kgPSBNb3VzZS5nZXRJbnN0YW5jZSgpLmdldFkoKTtcblxuICAgICAgICB2YXIgcG9zWSA9IE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlUG9zWSAtIGNhbnZhc1Bvc1ksIGNhbnZhcy5oZWlnaHQpKSxcbiAgICAgICAgICAgIHBvc1lOb3JtID0gcG9zWSAvIGNhbnZhcy5oZWlnaHQ7XG5cbiAgICAgICAgdmFyIGh1ZSA9IE1hdGguZmxvb3IoKDEuMCAtIHBvc1lOb3JtKSAqIHRoaXMuX3ZhbHVlSHVlTWluTWF4WzFdKTtcblxuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVihodWUsIHRoaXMuX3ZhbHVlU2F0LCB0aGlzLl92YWx1ZVZhbCk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZVNsaWRlcigpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlSGFuZGxlU2xpZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBoZWlnaHQgPSB0aGlzLl9jYW52YXNTbGlkZXIuaGVpZ2h0LFxuICAgICAgICAgICAgb2Zmc2V0SGFuZGxlID0gdGhpcy5faGFuZGxlU2xpZGVySGVpZ2h0ICogMC4yNTtcblxuICAgICAgICB2YXIgaHVlTm9ybSA9IHRoaXMuX3ZhbHVlSHVlIC8gdGhpcy5fdmFsdWVIdWVNaW5NYXhbMV07XG5cbiAgICAgICAgdGhpcy5faGFuZGxlU2xpZGVyLnNldFBvc2l0aW9uR2xvYmFsWSgoaGVpZ2h0IC0gb2Zmc2V0SGFuZGxlKSAqICgxLjAgLSBodWVOb3JtKSk7XG4gICAgfSxcblxuICAgIF91cGRhdGVIYW5kbGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZUZpZWxkKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZVNsaWRlcigpO1xuICAgIH0sXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICBfc2V0SHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIG1pbk1heCA9IHRoaXMuX3ZhbHVlSHVlTWluTWF4O1xuXG4gICAgICAgIHRoaXMuX3ZhbHVlSHVlID0gdmFsdWUgPT0gbWluTWF4WzFdID8gbWluTWF4WzBdIDogdmFsdWU7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWKCk7XG4gICAgICAgIHRoaXMuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfc2V0U2F0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVTYXQgPSBNYXRoLnJvdW5kKHZhbHVlKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1YoKTtcbiAgICB9LFxuXG4gICAgX3NldFZhbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlVmFsID0gTWF0aC5yb3VuZCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWKCk7XG4gICAgfSxcblxuICAgIF9zZXRSOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVSID0gTWF0aC5yb3VuZCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCKCk7XG4gICAgfSxcblxuICAgIF9zZXRHOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVHID0gTWF0aC5yb3VuZCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCKCk7XG4gICAgfSxcblxuICAgIF9zZXRCOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVCID0gTWF0aC5yb3VuZCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCKCk7XG4gICAgfSxcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIF9vbklucHV0SHVlQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpbnB1dCA9IHRoaXMuX2lucHV0SHVlLFxuICAgICAgICAgICAgaW5wdXRWYWwgPSB0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQoaW5wdXQsIHRoaXMuX3ZhbHVlSHVlTWluTWF4KTtcblxuICAgICAgICB2YXIgbWluTWF4ID0gdGhpcy5fdmFsdWVIdWVNaW5NYXg7XG5cbiAgICAgICAgaWYgKGlucHV0VmFsID09IG1pbk1heFsxXSkge1xuICAgICAgICAgICAgaW5wdXRWYWwgPSBtaW5NYXhbMF07XG4gICAgICAgICAgICBpbnB1dC5zZXRWYWx1ZShpbnB1dFZhbCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9zZXRIdWUoaW5wdXRWYWwpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZVNsaWRlcigpO1xuXG4gICAgICAgIHRoaXMuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dFNhdENoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRTYXQodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0U2F0LCB0aGlzLl92YWx1ZVNhdE1pbk1heCkpO1xuICAgICAgICB0aGlzLl9vbklucHV0U1ZDaGFuZ2UoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRWYWxDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0VmFsKHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dFZhbCwgdGhpcy5fdmFsdWVWYWxNaW5NYXgpKTtcbiAgICAgICAgdGhpcy5fb25JbnB1dFNWQ2hhbmdlKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0UkNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRSKHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dFIsIHRoaXMuX3ZhbHVlUkdCTWluTWF4KSk7XG4gICAgICAgIHRoaXMuX29uSW5wdXRSR0JDaGFuZ2UoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRHQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldEcodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0RywgdGhpcy5fdmFsdWVSR0JNaW5NYXgpKTtcbiAgICAgICAgdGhpcy5fb25JbnB1dFJHQkNoYW5nZSgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dEJDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Qih0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQodGhpcy5faW5wdXRCLCB0aGlzLl92YWx1ZVJHQk1pbk1heCkpO1xuICAgICAgICB0aGlzLl9vbklucHV0UkdCQ2hhbmdlKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0SEVYRmluaXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpbnB1dCA9IHRoaXMuX2lucHV0SEVYLFxuICAgICAgICAgICAgdmFsdWUgPSBpbnB1dC5nZXRQcm9wZXJ0eSgndmFsdWUnKTtcblxuICAgICAgICBpZiAoIUNvbG9yVXRpbC5pc1ZhbGlkSEVYKHZhbHVlKSkge1xuICAgICAgICAgICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGhpcy5fdmFsdWVIRVhWYWxpZCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl92YWx1ZUhFWCA9IHRoaXMuX3ZhbHVlSEVYVmFsaWQgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JGcm9tSEVYKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0U1ZDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dFJHQkNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVkZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZXMoKTtcbiAgICB9LFxuXG4gICAgX2dldFZhbHVlQ29udHJhaW5lZDogZnVuY3Rpb24gKGlucHV0LCBtaW5NYXgpIHtcbiAgICAgICAgdmFyIGlucHV0VmFsID0gTWF0aC5yb3VuZChpbnB1dC5nZXRWYWx1ZSgpKSxcbiAgICAgICAgICAgIG1pbiA9IG1pbk1heFswXSxcbiAgICAgICAgICAgIG1heCA9IG1pbk1heFsxXTtcblxuICAgICAgICBpZiAoaW5wdXRWYWwgPD0gbWluKSB7XG4gICAgICAgICAgICBpbnB1dFZhbCA9IG1pbjtcbiAgICAgICAgICAgIGlucHV0LnNldFZhbHVlKGlucHV0VmFsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5wdXRWYWwgPj0gbWF4KSB7XG4gICAgICAgICAgICBpbnB1dFZhbCA9IG1heDtcbiAgICAgICAgICAgIGlucHV0LnNldFZhbHVlKGlucHV0VmFsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbnB1dFZhbDtcbiAgICB9LFxuXG5cbiAgICBfdXBkYXRlSW5wdXRIdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRIdWUuc2V0VmFsdWUodGhpcy5fdmFsdWVIdWUpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUlucHV0U2F0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0U2F0LnNldFZhbHVlKHRoaXMuX3ZhbHVlU2F0KTtcbiAgICB9LFxuICAgIF91cGRhdGVJbnB1dFZhbDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dFZhbC5zZXRWYWx1ZSh0aGlzLl92YWx1ZVZhbCk7XG4gICAgfSxcbiAgICBfdXBkYXRlSW5wdXRSOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0Ui5zZXRWYWx1ZSh0aGlzLl92YWx1ZVIpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUlucHV0RzogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dEcuc2V0VmFsdWUodGhpcy5fdmFsdWVHKTtcbiAgICB9LFxuICAgIF91cGRhdGVJbnB1dEI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRCLnNldFZhbHVlKHRoaXMuX3ZhbHVlQik7XG4gICAgfSxcbiAgICBfdXBkYXRlSW5wdXRIRVg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRIRVguc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGhpcy5fdmFsdWVIRVgpO1xuICAgIH0sXG5cblxuICAgIF9zZXRDb2xvckhTVjogZnVuY3Rpb24gKGh1ZSwgc2F0LCB2YWwpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVIdWUgPSBodWU7XG4gICAgICAgIHRoaXMuX3ZhbHVlU2F0ID0gc2F0O1xuICAgICAgICB0aGlzLl92YWx1ZVZhbCA9IHZhbDtcblxuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dEh1ZSgpO1xuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dFNhdCgpO1xuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dFZhbCgpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yKCk7XG4gICAgfSxcblxuICAgIF9zZXRDb2xvclJHQjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVSID0gcjtcbiAgICAgICAgdGhpcy5fdmFsdWVHID0gZztcbiAgICAgICAgdGhpcy5fdmFsdWVCID0gYjtcblxuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dFIoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRHKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0QigpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yKCk7XG4gICAgfSxcblxuICAgIF9zZXRDb2xvckhFWDogZnVuY3Rpb24gKGhleCkge1xuICAgICAgICB0aGlzLl92YWx1ZUhFWCA9IGhleDtcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRIRVgoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbG9ySFNWOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldENvbG9ySFNWKHRoaXMuX3ZhbHVlSHVlLCB0aGlzLl92YWx1ZVNhdCwgdGhpcy5fdmFsdWVWYWwpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb250cmFzdEN1cnJDb2xvcigpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29sb3JSR0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JSR0IodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvckhTVkZyb21SR0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhzdiA9IENvbG9yVXRpbC5SR0IySFNWKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xuICAgICAgICB0aGlzLl9zZXRDb2xvckhTVihoc3ZbMF0sIGhzdlsxXSwgaHN2WzJdKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcmdiID0gQ29sb3JVdGlsLkhTVjJSR0IodGhpcy5fdmFsdWVIdWUsIHRoaXMuX3ZhbHVlU2F0LCB0aGlzLl92YWx1ZVZhbCk7XG4gICAgICAgIHRoaXMuX3NldENvbG9yUkdCKHJnYlswXSwgcmdiWzFdLCByZ2JbMl0pO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29sb3JIRVhGcm9tUkdCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBoZXggPSBDb2xvclV0aWwuUkdCMkhFWCh0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIRVgoaGV4KTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbG9yRnJvbUhFWDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcmdiID0gQ29sb3JVdGlsLkhFWDJSR0IodGhpcy5fdmFsdWVIRVgpO1xuXG4gICAgICAgIHRoaXMuX3NldENvbG9yUkdCKHJnYlswXSwgcmdiWzFdLCByZ2JbMl0pO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVkZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlcygpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29udHJhc3RDdXJyQ29sb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29udHJhc3RDdXJyQ29sb3IodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XG4gICAgfSxcbiAgICBfdXBkYXRlQ29udHJhc3RQcmV2Q29sb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29udHJhc1ByZXZDb2xvcih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKVxuICAgIH0sXG5cbiAgICBfc2V0Q29udHJhc3RDdXJyQ29sb3I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgICAgIHRoaXMuX2NvbG9yQ3Vyck5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnYmFja2dyb3VuZCcsICdyZ2IoJyArIHIgKyAnLCcgKyBnICsgJywnICsgYiArICcpJylcbiAgICB9LFxuICAgIF9zZXRDb250cmFzUHJldkNvbG9yOiBmdW5jdGlvbiAociwgZywgYikge1xuICAgICAgICB0aGlzLl9jb2xvclByZXZOb2RlLnNldFN0eWxlUHJvcGVydHkoJ2JhY2tncm91bmQnLCAncmdiKCcgKyByICsgJywnICsgZyArICcsJyArIGIgKyAnKScpXG4gICAgfSxcblxuICAgIF9vbkhlYWREcmFnU3RhcnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICAgICAgcGFyZW50Tm9kZSA9IHRoaXMuX3BhcmVudE5vZGU7XG5cbiAgICAgICAgdmFyIG5vZGVQb3MgPSBub2RlLmdldFBvc2l0aW9uR2xvYmFsKCksXG4gICAgICAgICAgICBtb3VzZVBvcyA9IE1vdXNlLmdldEluc3RhbmNlKCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgICAgIG9mZnNldFBvcyA9IHRoaXMuX21vdXNlT2Zmc2V0O1xuXG4gICAgICAgIG9mZnNldFBvc1swXSA9IG1vdXNlUG9zWzBdIC0gbm9kZVBvc1swXTtcbiAgICAgICAgb2Zmc2V0UG9zWzFdID0gbW91c2VQb3NbMV0gLSBub2RlUG9zWzFdO1xuXG4gICAgICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlUG9zaXRpb24oKTtcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9ucygpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICAgICAgcGFyZW50Tm9kZS5hZGRDaGlsZChub2RlKTtcblxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNhbnZhc05vZGVQb3NpdGlvbnMoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZVBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBtb3VzZVBvcyA9IE1vdXNlLmdldEluc3RhbmNlKCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgICAgIG9mZnNldFBvcyA9IHRoaXMuX21vdXNlT2Zmc2V0O1xuXG4gICAgICAgIHZhciBjdXJyUG9zaXRpb25YID0gbW91c2VQb3NbMF0gLSBvZmZzZXRQb3NbMF0sXG4gICAgICAgICAgICBjdXJyUG9zaXRpb25ZID0gbW91c2VQb3NbMV0gLSBvZmZzZXRQb3NbMV07XG5cbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICAgICAgaGVhZCA9IHRoaXMuX2hlYWROb2RlLFxuICAgICAgICAgICAgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbjtcblxuICAgICAgICB2YXIgbWF4WCA9IHdpbmRvdy5pbm5lcldpZHRoIC0gbm9kZS5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgbWF4WSA9IHdpbmRvdy5pbm5lckhlaWdodCAtIGhlYWQuZ2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgcG9zaXRpb25bMF0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihjdXJyUG9zaXRpb25YLCBtYXhYKSk7XG4gICAgICAgIHBvc2l0aW9uWzFdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oY3VyclBvc2l0aW9uWSwgbWF4WSkpO1xuXG4gICAgICAgIG5vZGUuc2V0UG9zaXRpb25HbG9iYWwocG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcbiAgICB9LFxuXG4gICAgX2RyYXdDYW52YXNGaWVsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzRmllbGQsXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY29udGV4dENhbnZhc0ZpZWxkO1xuXG4gICAgICAgIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aCxcbiAgICAgICAgICAgIGhlaWdodCA9IGNhbnZhcy5oZWlnaHQsXG4gICAgICAgICAgICBpbnZXaWR0aCA9IDEgLyB3aWR0aCxcbiAgICAgICAgICAgIGludkhlaWdodCA9IDEgLyBoZWlnaHQ7XG5cbiAgICAgICAgdmFyIGltYWdlRGF0YSA9IHRoaXMuX2ltYWdlRGF0YUZpZWxkLFxuICAgICAgICAgICAgcmdiID0gW10sXG4gICAgICAgICAgICBpbmRleCA9IDA7XG5cbiAgICAgICAgdmFyIHZhbHVlSHVlID0gdGhpcy5fdmFsdWVIdWU7XG5cbiAgICAgICAgdmFyIGkgPSAtMSwgajtcbiAgICAgICAgd2hpbGUgKCsraSA8IGhlaWdodCkge1xuICAgICAgICAgICAgaiA9IC0xO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytqIDwgd2lkdGgpIHtcbiAgICAgICAgICAgICAgICByZ2IgPSBDb2xvclV0aWwuSFNWMlJHQih2YWx1ZUh1ZSwgaiAqIGludldpZHRoICogMTAwLjAsICggMS4wIC0gaSAqIGludkhlaWdodCApICogMTAwLjApO1xuICAgICAgICAgICAgICAgIGluZGV4ID0gKGkgKiB3aWR0aCArIGopICogNDtcblxuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4XSA9IHJnYlswXTtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDFdID0gcmdiWzFdO1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgMl0gPSByZ2JbMl07XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAzXSA9IDI1NTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XG4gICAgfSxcblxuICAgIF9kcmF3Q2FudmFzU2xpZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNTbGlkZXIsXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY29udGV4dENhbnZhc1NsaWRlcjtcblxuICAgICAgICB2YXIgd2lkdGggPSBjYW52YXMud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0LFxuICAgICAgICAgICAgaW52SGVpZ2h0ID0gMSAvIGhlaWdodDtcblxuICAgICAgICB2YXIgaW1hZ2VEYXRhID0gdGhpcy5faW1hZ2VEYXRhU2xpZGVyLFxuICAgICAgICAgICAgcmdiID0gW10sXG4gICAgICAgICAgICBpbmRleCA9IDA7XG5cbiAgICAgICAgdmFyIGkgPSAtMSwgajtcbiAgICAgICAgd2hpbGUgKCsraSA8IGhlaWdodCkge1xuICAgICAgICAgICAgaiA9IC0xO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytqIDwgd2lkdGgpIHtcbiAgICAgICAgICAgICAgICByZ2IgPSBDb2xvclV0aWwuSFNWMlJHQigoMS4wIC0gaSAqIGludkhlaWdodCkgKiAzNjAuMCwgMTAwLjAsIDEwMC4wKTtcbiAgICAgICAgICAgICAgICBpbmRleCA9IChpICogd2lkdGggKyBqKSAqIDQ7XG5cbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleF0gPSByZ2JbMF07XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAxXSA9IHJnYlsxXTtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDJdID0gcmdiWzJdO1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgM10gPSAyNTU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApO1xuXG4gICAgfSxcblxuICAgIF9vbkNhbnZhc0ZpZWxkTW91c2VEb3duOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fZHJhd0hhbmRsZUZpZWxkKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgICAgIHNlbGYuX2RyYXdIYW5kbGVGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfb25DYW52YXNTbGlkZXJNb3VzZURvd246IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGV2ZW50TW91c2VNb3ZlID0gRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLFxuICAgICAgICAgICAgZXZlbnRNb3VzZVVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9kcmF3SGFuZGxlU2xpZGVyKCk7XG4gICAgICAgICAgICAgICAgc2VsZi5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIHNlbGYuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgICAgIHNlbGYuX2RyYXdIYW5kbGVTbGlkZXIoKTtcbiAgICAgICAgc2VsZi5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgfSxcblxuICAgIF9zZXRTaXplQ2FudmFzRmllbGQ6IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNGaWVsZDtcbiAgICAgICAgY2FudmFzLnN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnO1xuICAgICAgICBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcbiAgICAgICAgY2FudmFzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG5cbiAgICB9LFxuXG4gICAgX3NldFNpemVDYW52YXNTbGlkZXI6IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNTbGlkZXI7XG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgIH0sXG5cbiAgICBvcGVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZTtcblxuICAgICAgICB0aGlzLl9wYXJlbnROb2RlLmFkZENoaWxkKG5vZGUpO1xuICAgICAgICBub2RlLnNldFBvc2l0aW9uR2xvYmFsKHdpbmRvdy5pbm5lcldpZHRoICogMC41IC0gbm9kZS5nZXRXaWR0aCgpICogMC41LFxuICAgICAgICAgICAgd2luZG93LmlubmVySGVpZ2h0ICogMC41IC0gbm9kZS5nZXRIZWlnaHQoKSAqIDAuNSk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9ucygpO1xuICAgIH0sXG5cbiAgICBjbG9zZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuX25vZGUpO1xuICAgIH0sXG5cbiAgICBfb25DbG9zZTogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfSxcbiAgICBfb25QaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrUGljaygpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjYW52YXNTbGlkZXJQb3MgPSB0aGlzLl9jYW52YXNTbGlkZXJQb3MsXG4gICAgICAgICAgICBjYW52YXNGaWVsZFBvcyA9IHRoaXMuX2NhbnZhc0ZpZWxkUG9zO1xuXG4gICAgICAgIGNhbnZhc1NsaWRlclBvc1swXSA9IGNhbnZhc1NsaWRlclBvc1sxXSA9IDA7XG4gICAgICAgIGNhbnZhc0ZpZWxkUG9zWzBdID0gY2FudmFzRmllbGRQb3NbMV0gPSAwO1xuXG4gICAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5fY2FudmFzU2xpZGVyO1xuXG4gICAgICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgICAgICBjYW52YXNTbGlkZXJQb3NbMF0gKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICAgICAgY2FudmFzU2xpZGVyUG9zWzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbWVudCA9IHRoaXMuX2NhbnZhc0ZpZWxkO1xuXG4gICAgICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgICAgICBjYW52YXNGaWVsZFBvc1swXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgICAgICBjYW52YXNGaWVsZFBvc1sxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzZXRDYWxsYmFja1BpY2s6IGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrUGljayA9IGZ1bmM7XG4gICAgfSxcblxuICAgIHNldENvbG9ySEVYOiBmdW5jdGlvbiAoaGV4KSB7XG4gICAgICAgIHRoaXMuX3NldENvbG9ySEVYKGhleCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yRnJvbUhFWCgpO1xuICAgICAgICB0aGlzLl9zZXRDb2xvcigpO1xuICAgIH0sXG5cbiAgICBzZXRDb2xvclJHQjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JSR0IociwgZywgYik7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySEVYRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVkZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3IoKTtcbiAgICB9LFxuXG4gICAgc2V0Q29sb3JSR0JmdjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgdGhpcy5zZXRDb2xvclJHQihNYXRoLmZsb29yKHIgKiAyNTUuMCksXG4gICAgICAgICAgICBNYXRoLmZsb29yKGcgKiAyNTUuMCksXG4gICAgICAgICAgICBNYXRoLmZsb29yKGIgKiAyNTUuMCkpO1xuICAgIH0sXG5cbiAgICBzZXRDb2xvckhTVjogZnVuY3Rpb24gKGgsIHMsIHYpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YoaCwgcywgdik7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3IoKTtcbiAgICB9LFxuXG4gICAgX3NldENvbG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzU2xpZGVyKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZXMoKTtcbiAgICAgICAgdGhpcy5fc2V0Q29udHJhc1ByZXZDb2xvcih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKTtcbiAgICB9LFxuXG4gICAgZ2V0UjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVSO1xuICAgIH0sXG4gICAgZ2V0RzogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVHO1xuICAgIH0sXG4gICAgZ2V0QjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVCO1xuICAgIH0sXG4gICAgZ2V0UkdCOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbdGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQl07XG4gICAgfSxcbiAgICBnZXRIdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlSHVlO1xuICAgIH0sXG4gICAgZ2V0U2F0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZVNhdDtcbiAgICB9LFxuICAgIGdldFZhbDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVWYWw7XG4gICAgfSxcbiAgICBnZXRIU1Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFt0aGlzLl92YWx1ZUh1ZSwgdGhpcy5fdmFsdWVTYXQsIHRoaXMuX3ZhbHVlVmFsXTtcbiAgICB9LFxuICAgIGdldEhFWDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVIRVg7XG4gICAgfSxcbiAgICBnZXRSR0JmdjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gW3RoaXMuX3ZhbHVlUiAvIDI1NS4wLCB0aGlzLl92YWx1ZUcgLyAyNTUuMCwgdGhpcy5fdmFsdWVCIC8gMjU1LjBdO1xuICAgIH0sXG5cbiAgICBnZXROb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ub2RlO1xuICAgIH1cbn07XG5cblBpY2tlci5zZXR1cCA9IGZ1bmN0aW9uIChwYXJlbnROb2RlKSB7XG4gICAgcmV0dXJuIFBpY2tlci5faW5zdGFuY2UgPSBuZXcgUGlja2VyKHBhcmVudE5vZGUpO1xufTtcblBpY2tlci5nZXRJbnN0YW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gUGlja2VyLl9pbnN0YW5jZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGlja2VyOyIsInZhciBTVkdDb21wb25lbnQgPSByZXF1aXJlKCcuL1NWR0NvbXBvbmVudCcpO1xuXG5mdW5jdGlvbiBQbG90dGVyKHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKSB7XG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5saW5lV2lkdGggID0gcGFyYW1zLmxpbmVXaWR0aCAgfHwgMjtcbiAgICBwYXJhbXMubGluZUNvbG9yICA9IHBhcmFtcy5saW5lQ29sb3IgIHx8IFsyNTUsMjU1LDI1NV07XG5cbiAgICBTVkdDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdmFyIGxpbmVXaWR0aCA9IHRoaXMuX2xpbmVXaWR0aCA9IHBhcmFtcy5saW5lV2lkdGg7XG4gICAgdmFyIGxpbmVDb2xvciA9IHBhcmFtcy5saW5lQ29sb3I7XG5cbiAgICB2YXIgZ3JpZCA9IHRoaXMuX2dyaWQgPSB0aGlzLl9zdmdSb290LmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgncGF0aCcpKTtcbiAgICAgICAgZ3JpZC5zdHlsZS5zdHJva2UgPSAncmdiKDI2LDI5LDMxKSc7XG5cblxuICAgIHZhciBwYXRoID0gdGhpcy5fcGF0aCA9IHRoaXMuX3N2Z1Jvb3QuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdwYXRoJykpO1xuICAgICAgICBwYXRoLnN0eWxlLnN0cm9rZSAgICAgID0gJ3JnYignK2xpbmVDb2xvclswXSsnLCcrbGluZUNvbG9yWzFdKycsJytsaW5lQ29sb3JbMl0rJyknO1xuICAgICAgICBwYXRoLnN0eWxlLnN0cm9rZVdpZHRoID0gbGluZVdpZHRoIDtcbiAgICAgICAgcGF0aC5zdHlsZS5maWxsICAgICAgICA9ICdub25lJztcbn1cblxuUGxvdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNWR0NvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBsb3R0ZXI7XG4iLCJ2YXIgRXZlbnREaXNwYXRjaGVyICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpO1xudmFyIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllcicpO1xuXG52YXIgRXZlbnRfICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgT3B0aW9uRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL09wdGlvbkV2ZW50JyksXG4gICAgTm9kZUV2ZW50ICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbmZ1bmN0aW9uIFByZXNldEJ0bihwYXJlbnROb2RlKSB7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMpO1xuICAgIHZhciBidG5Ob2RlICA9IHRoaXMuX2J0bk5vZGUgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTiksXG4gICAgICAgIGluZGlOb2RlID0gdGhpcy5faW5kaU5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgdGhpcy5fb25BY3RpdmUgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICB0aGlzLl9vbkRlYWN0aXZlID0gZnVuY3Rpb24gKCkge307XG4gICAgdGhpcy5faXNBY3RpdmUgPSBmYWxzZTtcblxuICAgIGJ0bk5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuUHJlc2V0QnRuKTtcbiAgICBidG5Ob2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uTW91c2VEb3duLmJpbmQodGhpcykpO1xuXG4gICAgYnRuTm9kZS5hZGRDaGlsZChpbmRpTm9kZSk7XG4gICAgcGFyZW50Tm9kZS5hZGRDaGlsZEF0KGJ0bk5vZGUsIDApO1xuXG4gICAgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCkuYWRkRXZlbnRMaXN0ZW5lcihPcHRpb25FdmVudC5UUklHR0VSLCB0aGlzLCAnb25PcHRpb25UcmlnZ2VyJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKE9wdGlvbkV2ZW50LlRSSUdHRVJFRCwgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCksICdvbk9wdGlvblRyaWdnZXJlZCcpO1xufVxuXG5QcmVzZXRCdG4ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblxuUHJlc2V0QnRuLnByb3RvdHlwZS5vbk9wdGlvblRyaWdnZXIgPSBmdW5jdGlvbihlKXtcbiAgICBpZihlLmRhdGEub3JpZ2luID09IHRoaXMpe1xuICAgICAgICBpZighdGhpcy5faXNBY3RpdmUpe1xuICAgICAgICAgICAgdGhpcy5fb25BY3RpdmUoKTtcbiAgICAgICAgICAgIHRoaXMuX2J0bk5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuUHJlc2V0QnRuQWN0aXZlKTtcbiAgICAgICAgICAgIHRoaXMuX2lzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNle1xuICAgICAgICAgICAgdGhpcy5fb25EZWFjdGl2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZih0aGlzLl9pc0FjdGl2ZSl7XG4gICAgICAgIHRoaXMuZGVhY3RpdmF0ZSgpO1xuICAgIH1cbn07XG5cblByZXNldEJ0bi5wcm90b3R5cGUuX29uTW91c2VEb3duID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBPcHRpb25FdmVudC5UUklHR0VSRUQsIG51bGwpKTtcbn07XG5cblByZXNldEJ0bi5wcm90b3R5cGUuc2V0T25BY3RpdmUgPSBmdW5jdGlvbihmdW5jKXtcbiAgICB0aGlzLl9vbkFjdGl2ZSA9IGZ1bmM7XG59O1xuXG5QcmVzZXRCdG4ucHJvdG90eXBlLnNldE9uRGVhY3RpdmUgPSBmdW5jdGlvbihmdW5jKXtcbiAgICB0aGlzLl9vbkRlYWN0aXZlID0gZnVuYztcbn07XG5cblByZXNldEJ0bi5wcm90b3R5cGUuZGVhY3RpdmF0ZSA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5faXNBY3RpdmUgPSBmYWxzZTtcbiAgICB0aGlzLl9idG5Ob2RlLnNldFN0eWxlQ2xhc3MoQ1NTLlByZXNldEJ0bik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByZXNldEJ0bjtcbiIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9TVEVQID0gMS4wLFxuICAgIERFRkFVTFRfRFAgICA9IDI7XG5cbmZ1bmN0aW9uIFJhbmdlKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICB8fCB7fTtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgcGFyYW1zLnN0ZXAgICAgID0gcGFyYW1zLnN0ZXAgfHwgREVGQVVMVF9TVEVQO1xuICAgIHBhcmFtcy5kcCAgICAgICA9IHBhcmFtcy5kcCAgIHx8IERFRkFVTFRfRFA7XG5cbiAgICB0aGlzLl9vbkNoYW5nZSAgPSBwYXJhbXMub25DaGFuZ2U7XG5cbiAgICB2YXIgc3RlcCA9IHRoaXMuX3N0ZXAgPSBwYXJhbXMuc3RlcCxcbiAgICAgICAgZHAgICA9IHRoaXMuX2RwICAgPSBwYXJhbXMuZHA7XG5cbiAgICAvL0ZJWE1FOiBoaXN0b3J5IHB1c2ggcG9wXG5cbiAgICB2YXIgbGFibE1pbk5vZGUgPSBuZXcgTm9kZSgpO1xuICAgIHZhciBpbnB1dE1pbiAgICA9IHRoaXMuX2lucHV0TWluID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsIHRoaXMucHVzaEhpc3RvcnlTdGF0ZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRNaW5DaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0TWluRmluaXNoLmJpbmQodGhpcykpO1xuXG4gICAgdmFyIGxhYmxNYXhOb2RlID0gbmV3IE5vZGUoKTtcbiAgICB2YXIgaW5wdXRNYXggICAgPSB0aGlzLl9pbnB1dE1heCA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLCB0aGlzLnB1c2hIaXN0b3J5U3RhdGUuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0TWF4Q2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25JbnB1dE1heEZpbmlzaC5iaW5kKHRoaXMpKTtcblxuICAgIHZhciB3cmFwTGFibE1pbiAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApLFxuICAgICAgICB3cmFwSW5wdXRNaW4gPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApLFxuICAgICAgICB3cmFwTGFibE1heCAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApLFxuICAgICAgICB3cmFwSW5wdXRNYXggPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuXG5cbiAgICAgICAgbGFibE1pbk5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdNSU4nKTtcbiAgICAgICAgbGFibE1heE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdNQVgnKTtcblxuICAgIHZhciB2YWx1ZXMgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcblxuICAgIGlucHV0TWluLnNldFZhbHVlKHZhbHVlc1swXSk7XG4gICAgaW5wdXRNYXguc2V0VmFsdWUodmFsdWVzWzFdKTtcblxuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlO1xuXG4gICAgICAgIHdyYXBMYWJsTWluLmFkZENoaWxkKGxhYmxNaW5Ob2RlKTtcbiAgICAgICAgd3JhcElucHV0TWluLmFkZENoaWxkKGlucHV0TWluLmdldE5vZGUoKSk7XG4gICAgICAgIHdyYXBMYWJsTWF4LmFkZENoaWxkKGxhYmxNYXhOb2RlKTtcbiAgICAgICAgd3JhcElucHV0TWF4LmFkZENoaWxkKGlucHV0TWF4LmdldE5vZGUoKSk7XG5cbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQod3JhcExhYmxNaW4pO1xuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZCh3cmFwSW5wdXRNaW4pO1xuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZCh3cmFwTGFibE1heCk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKHdyYXBJbnB1dE1heCk7XG59XG5cblJhbmdlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5cblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dEZpbmlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG59O1xuXG5SYW5nZS5wcm90b3R5cGUuX3VwZGF0ZVZhbHVlTWluID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcblxuICAgIHZhciBpbnB1dE1pbiA9IHRoaXMuX2lucHV0TWluLFxuICAgICAgICBpbnB1dFZhbHVlID0gaW5wdXRNaW4uZ2V0VmFsdWUoKTtcblxuICAgIGlmIChpbnB1dFZhbHVlID49IHRoaXMuX2lucHV0TWF4LmdldFZhbHVlKCkpIHtcbiAgICAgICAgaW5wdXRNaW4uc2V0VmFsdWUodmFsdWVzWzBdKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YWx1ZXNbMF0gPSBpbnB1dFZhbHVlO1xuXG59O1xuXG5SYW5nZS5wcm90b3R5cGUuX3VwZGF0ZVZhbHVlTWF4ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcblxuICAgIHZhciBpbnB1dE1heCA9IHRoaXMuX2lucHV0TWF4LFxuICAgICAgICBpbnB1dFZhbHVlID0gaW5wdXRNYXguZ2V0VmFsdWUoKTtcblxuICAgIGlmIChpbnB1dFZhbHVlIDw9IHRoaXMuX2lucHV0TWluLmdldFZhbHVlKCkpIHtcbiAgICAgICAgaW5wdXRNYXguc2V0VmFsdWUodmFsdWVzWzFdKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YWx1ZXNbMV0gPSBpbnB1dFZhbHVlO1xufTtcblxuXG5SYW5nZS5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gbnVsbCkge1xuICAgIH1cblxuICAgIHZhciB2YWx1ZXMgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcbiAgICB0aGlzLl9pbnB1dE1pbi5zZXRWYWx1ZSh0aGlzLl9vYmplY3RbdGhpcy5fa2V5XVswXSk7XG4gICAgdGhpcy5faW5wdXRNYXguc2V0VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX2tleV1bMV0pO1xufTtcblxuXG5SYW5nZS5wcm90b3R5cGUuX29uSW5wdXRNaW5DaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVNaW4oKTtcbiAgICB0aGlzLl9vbklucHV0Q2hhbmdlKCk7XG59O1xuUmFuZ2UucHJvdG90eXBlLl9vbklucHV0TWluRmluaXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZVZhbHVlTWluKCk7XG4gICAgdGhpcy5fb25JbnB1dEZpbmlzaCgpO1xufTtcblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dE1heENoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVWYWx1ZU1heCgpO1xuICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UoKTtcbn07XG5SYW5nZS5wcm90b3R5cGUuX29uSW5wdXRNYXhGaW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVNYXgoKTtcbiAgICB0aGlzLl9vbklucHV0RmluaXNoKCk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gUmFuZ2U7IiwidmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vLi4vY29yZS9Db21wb25lbnQnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4uL2NvcmUvTWV0cmljJyk7XG52YXIgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKTtcblxuZnVuY3Rpb24gU1ZHKHBhcmVudCwgcGFyYW1zKSB7XG4gICAgQ29tcG9uZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcbiAgICB3cmFwTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5DYW52YXNXcmFwKTtcbiAgICB2YXIgd3JhcFNpemUgPSB3cmFwTm9kZS5nZXRXaWR0aCgpO1xuXG5cbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnID0gdGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdzdmcnKTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd2ZXJzaW9uJywgJzEuMicpO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2Jhc2VQcm9maWxlJywgJ3RpbnknKTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCdwcmVzZXJ2ZUFzcGVjdFJhdGlvJywgJ3RydWUnKTtcblxuICAgIHdyYXBOb2RlLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChzdmcpO1xuXG4gICAgdGhpcy5fc3ZnU2V0U2l6ZSh3cmFwU2l6ZSwgd3JhcFNpemUpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuXG5cbiAgICB0aGlzLl9ub2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkNhbnZhc0xpc3RJdGVtKTtcblxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIHRoaXMsICdvbkdyb3VwU2l6ZUNoYW5nZScpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfVVBEQVRFLCB0aGlzLl9wYXJlbnQsICdvbkdyb3VwU2l6ZVVwZGF0ZScpO1xufVxuXG5TVkcucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb21wb25lbnQucHJvdG90eXBlKTtcblxuU1ZHLnByb3RvdHlwZS5fdXBkYXRlSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmdIZWlnaHQgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuICAgIHRoaXMuX3dyYXBOb2RlLnNldEhlaWdodChzdmdIZWlnaHQpO1xuICAgIHRoaXMuX25vZGUuc2V0SGVpZ2h0KHN2Z0hlaWdodCArIE1ldHJpYy5QQURESU5HX1dSQVBQRVIpO1xufTtcblxuU1ZHLnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd2lkdGggPSB0aGlzLl93cmFwTm9kZS5nZXRXaWR0aCgpO1xuICAgIHRoaXMuX3N2Z1NldFNpemUod2lkdGgsIHdpZHRoKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcbn07XG5cblNWRy5wcm90b3R5cGUuX3N2Z1NldFNpemUgPSBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aCk7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd2aWV3Ym94JywgJzAgMCAnICsgd2lkdGggKyAnICcgKyBoZWlnaHQpO1xufTtcblxuU1ZHLnByb3RvdHlwZS5nZXRTVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N2Zztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU1ZHOyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xuXG5mdW5jdGlvbiBTVkdDb21wb25lbnQocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpe1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcbiAgICAgICAgd3JhcE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU1ZHV3JhcCk7XG4gICAgdmFyIHdyYXBTaXplID0gd3JhcE5vZGUuZ2V0V2lkdGgoKTtcblxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcgPSB0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3N2ZycpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCd2ZXJzaW9uJywgJzEuMicpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCdiYXNlUHJvZmlsZScsICd0aW55Jyk7XG5cbiAgICAgICAgd3JhcE5vZGUuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKHN2Zyk7XG5cbiAgICB2YXIgc3ZnUm9vdCA9IHRoaXMuX3N2Z1Jvb3QgPSBzdmcuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdnJykpO1xuICAgICAgICBzdmdSb290LnNldEF0dHJpYnV0ZSgndHJhbnNmb3JtJywndHJhbnNsYXRlKDAuNSAwLjUpJyk7XG5cbiAgICB0aGlzLl9zdmdTZXRTaXplKHdyYXBTaXplLHdyYXBTaXplKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcblxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU1ZHTGlzdEl0ZW0pO1xuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgdGhpcywgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIHRoaXMuX3BhcmVudCwgJ29uR3JvdXBTaXplVXBkYXRlJyk7XG59XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3VwZGF0ZUhlaWdodCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHN2Z0hlaWdodCA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XG5cbiAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQoc3ZnSGVpZ2h0KTtcbiAgICB0aGlzLl9ub2RlLnNldEhlaWdodChzdmdIZWlnaHQgKyBNZXRyaWMuUEFERElOR19XUkFQUEVSKTtcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3JlZHJhdyA9IGZ1bmN0aW9uKCl7fTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHdpZHRoID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKTtcblxuICAgIHRoaXMuX3N2Z1NldFNpemUod2lkdGgsd2lkdGgpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHRoaXMuX3JlZHJhdygpO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fY3JlYXRlU1ZHT2JqZWN0ID0gZnVuY3Rpb24odHlwZSkge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLHR5cGUpO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fc3ZnU2V0U2l6ZSA9IGZ1bmN0aW9uKHdpZHRoLGhlaWdodCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgIHdpZHRoKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgndmlld2JveCcsICcwIDAgJyArIHdpZHRoICsgJyAnICsgaGVpZ2h0KTtcbn07XG5cblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZE1vdmVUbyA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgcmV0dXJuICdNICcgKyB4ICsgJyAnICsgeSArICcgJztcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRMaW5lVG8gPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiAnTCAnICsgeCArICcgJyArIHkgKyAnICc7XG59O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kQ2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICdaJztcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRMaW5lID0gZnVuY3Rpb24gKHgwLCB5MCwgeDEsIHkxKSB7XG4gICAgcmV0dXJuICdNICcgKyB4MCArICcgJyArIHkwICsgJyBMICcgKyB4MSArICcgJyArIHkxO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZEJlemllckN1YmljID0gZnVuY3Rpb24gKGNtZCwgeDAsIHkwLCBjeDAsIGN5MCwgY3gxLCBjeTEsIHgxLCB5MSkge1xuICAgIHJldHVybiAnTSAnICsgeDAgKyAnICcgKyB5MCArICcgQyAnICsgY3gwICsgJyAnICsgY3kwICsgJywgJyArIGN4MSArICcgJyArIGN5MSArICcsICcgKyB4MSArICcgJyArIHkxO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZEJlemllclF1YWRyYXRpYyA9IGZ1bmN0aW9uIChjbWQsIHgwLCB5MCwgY3gsIGN5LCB4MSwgeTEpIHtcbiAgICByZXR1cm4gJ00gJyArIHgwICsgJyAnICsgeTAgKyAnIFEgJyArIGN4ICsgJyAnICsgY3kgKyAnLCAnICsgeDEgKyAnICcgKyB5MTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU1ZHQ29tcG9uZW50OyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBDU1MgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIE9wdGlvbnMgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIE5vZGVFdmVudCAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKSxcbiAgICBPcHRpb25FdmVudCAgICA9IHJlcXVpcmUoJy4uL2NvcmUvT3B0aW9uRXZlbnQnKTtcblxudmFyIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllcicpO1xuXG5mdW5jdGlvbiBTZWxlY3QocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgdGhpcy5fb25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2U7XG5cbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqZWN0LFxuICAgICAgICBrZXkgPSB0aGlzLl9rZXk7XG5cbiAgICB2YXIgdGFyZ2V0S2V5ID0gdGhpcy5fdGFyZ2V0S2V5ID0gcGFyYW1zLnRhcmdldCxcbiAgICAgICAgdmFsdWVzID0gdGhpcy5fdmFsdWVzID0gb2JqW2tleV07XG5cblxuICAgIHRoaXMuX3NlbGVjdGVkSW5kZXggPSAtMTtcbiAgICB0aGlzLl9zZWxlY3RlZCA9IG51bGw7XG5cbiAgICB2YXIgc2VsZWN0ID0gdGhpcy5fc2VsZWN0ID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pO1xuICAgICAgICBzZWxlY3Quc2V0U3R5bGVDbGFzcyhDU1MuU2VsZWN0KTtcbiAgICAgICAgc2VsZWN0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uT3B0aW9uVHJpZ2dlci5iaW5kKHRoaXMpKTtcblxuICAgIGlmKHRoaXMuX2hhc1RhcmdldCgpKSB7XG4gICAgICAgIHZhciB0YXJnZXRPYmogPSBvYmpbdGFyZ2V0S2V5XSB8fCAnJztcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IHZhbHVlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICh0YXJnZXRPYmogPT0gdmFsdWVzW2ldKXtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZWxlY3RlZCA9IHZhbHVlc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGFyZ2V0T2JqLnRvU3RyaW5nKCkubGVuZ3RoID4gMCA/IHRhcmdldE9iaiA6IHZhbHVlc1swXSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJywgcGFyYW1zLnNlbGVjdGVkID8gdmFsdWVzW3BhcmFtcy5zZWxlY3RlZF0gOiAnQ2hvb3NlIC4uLicpO1xuICAgIH1cblxuICAgIHRoaXMuX3dyYXBOb2RlLmFkZENoaWxkKHNlbGVjdCk7XG5cbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKS5hZGRFdmVudExpc3RlbmVyKE9wdGlvbkV2ZW50LlRSSUdHRVIsIHRoaXMsICdvbk9wdGlvblRyaWdnZXInKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoT3B0aW9uRXZlbnQuVFJJR0dFUkVELCBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKSwgJ29uT3B0aW9uVHJpZ2dlcmVkJyk7XG59XG5cblNlbGVjdC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5TZWxlY3QucHJvdG90eXBlLm9uT3B0aW9uVHJpZ2dlciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcykge1xuICAgICAgICB0aGlzLl9hY3RpdmUgPSAhdGhpcy5fYWN0aXZlO1xuICAgICAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuICAgICAgICAgICAgdGhpcy5fYnVpbGRPcHRpb25zKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBPcHRpb25zLmdldCgpLmNsZWFyKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fYWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5fYnVpbGRPcHRpb25zID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvcHRpb25zID0gT3B0aW9ucy5nZXQoKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBvcHRpb25zLmJ1aWxkKHRoaXMuX3ZhbHVlcywgdGhpcy5fc2VsZWN0ZWQsIHRoaXMuX3NlbGVjdCxcbiAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuYXBwbHlWYWx1ZSgpO1xuICAgICAgICAgICAgc2VsZi5fYWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICBzZWxmLl91cGRhdGVBcHBlYXJhbmNlKCk7XG4gICAgICAgICAgICBzZWxmLl9zZWxlY3RlZEluZGV4ID0gb3B0aW9ucy5nZXRTZWxlY3RlZEluZGV4KCk7XG4gICAgICAgICAgICBzZWxmLl9vbkNoYW5nZShzZWxmLl9zZWxlY3RlZEluZGV4KTtcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuX2FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgc2VsZi5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgICAgICAgICAgb3B0aW9ucy5jbGVhcigpXG4gICAgICAgIH0sIGZhbHNlKTtcbn07XG5cblxuU2VsZWN0LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpbmRleCA9IE9wdGlvbnMuZ2V0KCkuZ2V0U2VsZWN0ZWRJbmRleCgpLFxuICAgICAgICBzZWxlY3RlZCA9IHRoaXMuX3NlbGVjdGVkID0gdGhpcy5fdmFsdWVzW2luZGV4XTtcblxuICAgIGlmICh0aGlzLl9oYXNUYXJnZXQoKSkge1xuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICAgICAgdGhpcy5fb2JqZWN0W3RoaXMuX3RhcmdldEtleV0gPSBzZWxlY3RlZDtcbiAgICB9XG5cbiAgICB0aGlzLl9zZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJywgc2VsZWN0ZWQpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUucHVzaEhpc3RvcnlTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqZWN0LFxuICAgICAgICBrZXkgPSB0aGlzLl90YXJnZXRLZXk7XG4gICAgSGlzdG9yeS5nZXRJbnN0YW5jZSgpLnB1c2hTdGF0ZShvYmosIGtleSwgb2JqW2tleV0pO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5fb25PcHRpb25UcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIE9wdGlvbkV2ZW50LlRSSUdHRVJFRCwgbnVsbCkpO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9zZWxlY3Quc2V0U3R5bGVDbGFzcyh0aGlzLl9hY3RpdmUgPyBDU1MuU2VsZWN0QWN0aXZlIDogQ1NTLlNlbGVjdCk7XG59O1xuXG5TZWxlY3QucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmICghdGhpcy5faGFzVGFyZ2V0KCkpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX3NlbGVjdGVkID0gdGhpcy5fb2JqZWN0W3RoaXMuX3RhcmdldEtleV07XG4gICAgdGhpcy5fc2VsZWN0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX3NlbGVjdGVkLnRvU3RyaW5nKCkpO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5faGFzVGFyZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl90YXJnZXRLZXkgIT0gbnVsbDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0O1xuIiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBTbGlkZXJfSW50ZXJuYWwgPSByZXF1aXJlKCcuL1NsaWRlcl9JbnRlcm5hbCcpO1xuXG52YXIgSGlzdG9yeSA9IHJlcXVpcmUoJy4uL2NvcmUvSGlzdG9yeScpO1xudmFyIFJhbmdlID0gcmVxdWlyZSgnLi9SYW5nZScpO1xudmFyIE51bWJlcklucHV0X0ludGVybmFsID0gcmVxdWlyZSgnLi9OdW1iZXJJbnB1dF9JbnRlcm5hbCcpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBQYW5lbEV2ZW50ID0gcmVxdWlyZSgnLi4vZ3JvdXAvUGFuZWxFdmVudCcpLFxuICAgIEdyb3VwRXZlbnQgPSByZXF1aXJlKCcuLi9ncm91cC9Hcm91cEV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbnZhciBERUZBVUxUX1NURVAgPSAxLjAsXG4gICAgREVGQVVMVF9EUCAgID0gMjtcblxuXG5mdW5jdGlvbiBTbGlkZXIocGFyZW50LG9iamVjdCx2YWx1ZSxyYW5nZSxwYXJhbXMpIHtcbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLmxhYmVsICAgID0gcGFyYW1zLmxhYmVsICAgIHx8IHZhbHVlO1xuXG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsW3BhcmVudCxvYmplY3QscmFuZ2UscGFyYW1zXSk7XG5cbiAgICB0aGlzLl92YWx1ZXMgID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG4gICAgdGhpcy5fdGFyZ2V0S2V5ID0gdmFsdWU7XG5cbiAgICBwYXJhbXMuc3RlcCAgICAgPSBwYXJhbXMuc3RlcCAgICAgfHwgREVGQVVMVF9TVEVQO1xuICAgIHBhcmFtcy5kcCAgICAgICA9IHBhcmFtcy5kcCAgICAgICB8fCBERUZBVUxUX0RQO1xuICAgIHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcbiAgICBwYXJhbXMub25GaW5pc2ggPSBwYXJhbXMub25GaW5pc2ggfHwgZnVuY3Rpb24gKCkge307XG5cbiAgICB0aGlzLl9zdGVwICAgICA9IHBhcmFtcy5zdGVwO1xuICAgIHRoaXMuX29uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlO1xuICAgIHRoaXMuX29uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoO1xuICAgIHRoaXMuX2RwICAgICAgID0gcGFyYW1zLmRwO1xuXG4gICAgdmFyIHZhbHVlcyAgICA9IHRoaXMuX3ZhbHVlcyxcbiAgICAgICAgb2JqICAgICAgID0gdGhpcy5fb2JqZWN0LFxuICAgICAgICB0YXJnZXRLZXkgPSB0aGlzLl90YXJnZXRLZXk7XG5cbiAgICB2YXIgd3JhcE5vZGUgID0gdGhpcy5fd3JhcE5vZGU7XG4gICAgICAgIHdyYXBOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXBTbGlkZXIpO1xuXG4gICAgdmFyIHNsaWRlciA9IHRoaXMuX3NsaWRlciA9IG5ldyBTbGlkZXJfSW50ZXJuYWwod3JhcE5vZGUsIHRoaXMuX29uU2xpZGVyQmVnaW4uYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uU2xpZGVyTW92ZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25TbGlkZXJFbmQuYmluZCh0aGlzKSk7XG5cbiAgICBzbGlkZXIuc2V0Qm91bmRNaW4odmFsdWVzWzBdKTtcbiAgICBzbGlkZXIuc2V0Qm91bmRNYXgodmFsdWVzWzFdKTtcbiAgICBzbGlkZXIuc2V0VmFsdWUob2JqW3RhcmdldEtleV0pO1xuXG5cbiAgICB2YXIgaW5wdXQgID0gdGhpcy5faW5wdXQgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwodGhpcy5fc3RlcCwgdGhpcy5fZHAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpKTtcblxuICAgIGlucHV0LnNldFZhbHVlKG9ialt0YXJnZXRLZXldKTtcblxuICAgIHdyYXBOb2RlLmFkZENoaWxkKGlucHV0LmdldE5vZGUoKSk7XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCAgICB0aGlzLCAnb25QYW5lbE1vdmVFbmQnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCB0aGlzLCAnb25Hcm91cFdpZHRoQ2hhbmdlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5XSU5ET1dfUkVTSVpFLCAgdGhpcywgJ29uV2luZG93UmVzaXplJyk7XG59XG5cblNsaWRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5TbGlkZXIucHJvdG90eXBlLnB1c2hIaXN0b3J5U3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9iaiA9IHRoaXMuX29iamVjdCxcbiAgICAgICAga2V5ID0gdGhpcy5fdGFyZ2V0S2V5O1xuICAgIEhpc3RvcnkuZ2V0SW5zdGFuY2UoKS5wdXNoU3RhdGUob2JqLCBrZXksIG9ialtrZXldKTtcbn07XG5cblNsaWRlci5wcm90b3R5cGUuX29uU2xpZGVyQmVnaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLl9vblNsaWRlck1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVGaWVsZCgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5fb25TbGlkZXJFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVGaWVsZCgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkZpbmlzaCgpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCxcbiAgICAgICAgdmFsdWVNaW4gPSB0aGlzLl92YWx1ZXNbMF0sXG4gICAgICAgIHZhbHVlTWF4ID0gdGhpcy5fdmFsdWVzWzFdO1xuXG4gICAgaWYgKGlucHV0LmdldFZhbHVlKCkgPj0gdmFsdWVNYXgpe1xuICAgICAgICBpbnB1dC5zZXRWYWx1ZSh2YWx1ZU1heCk7XG4gICAgfVxuICAgIGlmIChpbnB1dC5nZXRWYWx1ZSgpIDw9IHZhbHVlTWluKXtcbiAgICAgICAgaW5wdXQuc2V0VmFsdWUodmFsdWVNaW4pO1xuICAgIH1cblxuICAgIHZhciB2YWx1ZSA9IGlucHV0LmdldFZhbHVlKCk7XG5cbiAgICB0aGlzLl9zbGlkZXIuc2V0VmFsdWUodmFsdWUpO1xuICAgIHRoaXMuX29iamVjdFt0aGlzLl90YXJnZXRLZXldID0gdmFsdWU7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xuICAgIHRoaXMuX29uRmluaXNoKCk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5fc2xpZGVyLmdldFZhbHVlKCk7XG4gICAgdGhpcy5fb2JqZWN0W3RoaXMuX3RhcmdldEtleV0gPSB2YWx1ZTtcbiAgICB0aGlzLl9pbnB1dC5zZXRWYWx1ZSh2YWx1ZSk7XG59O1xuXG4vL1RPRE86RklYIE1FXG5TbGlkZXIucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBvcmlnaW4gPSBlLmRhdGEub3JpZ2luO1xuXG4gICAgaWYgKG9yaWdpbiA9PSB0aGlzKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzbGlkZXIgPSB0aGlzLl9zbGlkZXI7XG5cbiAgICBpZiAoIShvcmlnaW4gaW5zdGFuY2VvZiBTbGlkZXIpKSB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLl92YWx1ZXM7XG5cbiAgICAgICAgLy9UT0RPOiBGSVggTUUhXG4gICAgICAgIGlmIChvcmlnaW4gaW5zdGFuY2VvZiBSYW5nZSkge1xuICAgICAgICAgICAgc2xpZGVyLnNldEJvdW5kTWluKHZhbHVlc1swXSk7XG4gICAgICAgICAgICBzbGlkZXIuc2V0Qm91bmRNYXgodmFsdWVzWzFdKTtcbiAgICAgICAgICAgIC8vc2xpZGVyLnNldFZhbHVlKHRoaXMuX29iamVjdFt0aGlzLl90YXJnZXRLZXldKTtcbiAgICAgICAgICAgIC8vdGhpcy5fc2xpZGVyLnVwZGF0ZUludGVycG9sYXRlZFZhbHVlKCk7XG4gICAgICAgICAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNsaWRlci5zZXRCb3VuZE1pbih2YWx1ZXNbMF0pO1xuICAgICAgICAgICAgc2xpZGVyLnNldEJvdW5kTWF4KHZhbHVlc1sxXSk7XG4gICAgICAgICAgICBzbGlkZXIuc2V0VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX3RhcmdldEtleV0pO1xuICAgICAgICAgICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHNsaWRlci5zZXRWYWx1ZSh0aGlzLl9vYmplY3RbdGhpcy5fdGFyZ2V0S2V5XSk7XG4gICAgICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIH1cbn07XG5cblxuU2xpZGVyLnByb3RvdHlwZS5fdXBkYXRlVmFsdWVGaWVsZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pbnB1dC5zZXRWYWx1ZSh0aGlzLl9zbGlkZXIuZ2V0VmFsdWUoKSk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLm9uUGFuZWxNb3ZlRW5kID1cbiAgICBTbGlkZXIucHJvdG90eXBlLm9uR3JvdXBXaWR0aENoYW5nZSA9XG4gICAgICAgIFNsaWRlci5wcm90b3R5cGUub25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9zbGlkZXIucmVzZXRPZmZzZXQoKTtcbiAgICAgICAgfTtcblxubW9kdWxlLmV4cG9ydHMgPSBTbGlkZXI7IiwidmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcblxuZnVuY3Rpb24gU2xpZGVyX0ludGVybmFsKHBhcmVudE5vZGUsb25CZWdpbixvbkNoYW5nZSxvbkZpbmlzaCkge1xuICAgIHRoaXMuX2JvdW5kcyAgID0gWzAsMV07XG4gICAgdGhpcy5fdmFsdWUgICAgPSAwO1xuICAgIHRoaXMuX2ludGVycGwgID0gMDtcbiAgICB0aGlzLl9mb2N1cyAgICA9IGZhbHNlO1xuXG5cbiAgICB0aGlzLl9vbkJlZ2luICAgID0gb25CZWdpbiAgfHwgZnVuY3Rpb24oKXt9O1xuICAgIHRoaXMuX29uQ2hhbmdlICAgPSBvbkNoYW5nZSB8fCBmdW5jdGlvbigpe307XG4gICAgdGhpcy5fb25GaW5pc2ggICA9IG9uRmluaXNoIHx8IGZ1bmN0aW9uKCl7fTtcblxuXG4gICAgdmFyIHdyYXBOb2RlID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJXcmFwKTtcbiAgICBwYXJlbnROb2RlLmFkZENoaWxkKHdyYXBOb2RlKTtcblxuICAgIHZhciBzbG90ICAgPSB0aGlzLl9zbG90ICAgPSB7bm9kZTogICAgbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJTbG90KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldFg6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogM307XG5cbiAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlID0ge25vZGUgICAgOiBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNsaWRlckhhbmRsZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aCAgIDogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdnaW5nOiBmYWxzZX07XG5cbiAgICB3cmFwTm9kZS5hZGRDaGlsZChzbG90Lm5vZGUpO1xuICAgIHNsb3Qubm9kZS5hZGRDaGlsZChoYW5kbGUubm9kZSk7XG5cbiAgICBzbG90Lm9mZnNldFggPSBzbG90Lm5vZGUuZ2V0UG9zaXRpb25HbG9iYWxYKCk7XG4gICAgc2xvdC53aWR0aCAgID0gTWF0aC5mbG9vcihzbG90Lm5vZGUuZ2V0V2lkdGgoKSAtIHNsb3QucGFkZGluZyAqIDIpIDtcblxuICAgIGhhbmRsZS5ub2RlLnNldFdpZHRoKGhhbmRsZS53aWR0aCk7XG5cbiAgICBzbG90Lm5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTix0aGlzLl9vblNsb3RNb3VzZURvd24uYmluZCh0aGlzKSk7XG4gICAgc2xvdC5ub2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX1VQLCAgdGhpcy5fb25TbG90TW91c2VVcC5iaW5kKHRoaXMpKTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUuYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX1VQLCAgdGhpcy5fb25Eb2N1bWVudE1vdXNlVXAuYmluZCh0aGlzKSk7XG59XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX29uRG9jdW1lbnRNb3VzZU1vdmUgPSBmdW5jdGlvbigpe1xuICAgIGlmKCF0aGlzLl9oYW5kbGUuZHJhZ2dpbmcpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX3VwZGF0ZSgpO1xuICAgIHRoaXMuX29uQ2hhbmdlKCk7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl9vbkRvY3VtZW50TW91c2VVcCA9IGZ1bmN0aW9uKCl7XG4gICAgaWYodGhpcy5faGFuZGxlLmRyYWdnaW5nKXtcbiAgICAgICAgdGhpcy5fb25GaW5pc2goKTtcbiAgICB9XG4gICAgdGhpcy5faGFuZGxlLmRyYWdnaW5nID0gZmFsc2U7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl9vblNsb3RNb3VzZURvd24gPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX29uQmVnaW4oKTtcbiAgICB0aGlzLl9mb2N1cyA9IHRydWU7XG4gICAgdGhpcy5faGFuZGxlLmRyYWdnaW5nID0gdHJ1ZTtcbiAgICB0aGlzLl9oYW5kbGUubm9kZS5nZXRFbGVtZW50KCkuZm9jdXMoKTtcbiAgICB0aGlzLl91cGRhdGUoKTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX29uU2xvdE1vdXNlVXAgPSBmdW5jdGlvbigpe1xuICAgIGlmICh0aGlzLl9mb2N1cykge1xuICAgICAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlO1xuICAgICAgICBpZiAoaGFuZGxlLmRyYWdnaW5nKXtcbiAgICAgICAgICAgIHRoaXMuX29uRmluaXNoKCk7XG4gICAgICAgIH1cbiAgICAgICAgaGFuZGxlLmRyYWdnaW5nID0gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuX2ZvY3VzID0gZmFsc2U7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBteCA9IE1vdXNlLmdldEluc3RhbmNlKCkuZ2V0WCgpLFxuICAgICAgICBzeCA9IHRoaXMuX3Nsb3Qub2Zmc2V0WCxcbiAgICAgICAgc3cgPSB0aGlzLl9zbG90LndpZHRoLFxuICAgICAgICBweCA9IChteCA8IHN4KSA/IDAgOiAobXggPiAoc3ggKyBzdykpID8gc3cgOiAobXggLSBzeCk7XG5cbiAgICB0aGlzLl9oYW5kbGUubm9kZS5zZXRXaWR0aChNYXRoLnJvdW5kKHB4KSk7XG4gICAgdGhpcy5faW50cnBsID0gcHggLyBzdztcbiAgICB0aGlzLl9pbnRlcnBvbGF0ZVZhbHVlKCk7XG59O1xuXG4vL0ZJWCBNRVxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5fdXBkYXRlSGFuZGxlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2xvdFdpZHRoICAgPSB0aGlzLl9zbG90LndpZHRoLFxuICAgICAgICBoYW5kbGVXaWR0aCA9IE1hdGgucm91bmQodGhpcy5faW50cnBsICogc2xvdFdpZHRoKTtcblxuICAgIHRoaXMuX2hhbmRsZS5ub2RlLnNldFdpZHRoKE1hdGgubWluKGhhbmRsZVdpZHRoLHNsb3RXaWR0aCkpO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5faW50ZXJwb2xhdGVWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW50cnBsID0gdGhpcy5faW50cnBsO1xuICAgIHRoaXMuX3ZhbHVlID0gdGhpcy5fYm91bmRzWzBdICogKDEuMCAtIGludHJwbCkgKyB0aGlzLl9ib3VuZHNbMV0gKiBpbnRycGw7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLnJlc2V0T2Zmc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzbG90ID0gdGhpcy5fc2xvdDtcbiAgICBzbG90Lm9mZnNldFggPSBzbG90Lm5vZGUuZ2V0UG9zaXRpb25HbG9iYWxYKCk7XG4gICAgc2xvdC53aWR0aCA9IE1hdGguZmxvb3Ioc2xvdC5ub2RlLmdldFdpZHRoKCkgLSBzbG90LnBhZGRpbmcgKiAyKVxufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5zZXRCb3VuZE1pbiA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBib3VuZHMgPSB0aGlzLl9ib3VuZHM7XG4gICAgaWYgKHZhbHVlID49IGJvdW5kc1sxXSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBib3VuZHNbMF0gPSB2YWx1ZTtcbiAgICB0aGlzLl9pbnRlcnBvbGF0ZVZhbHVlUmVsYXRpdmUoKTtcbiAgICB0aGlzLl91cGRhdGVIYW5kbGUoKTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuc2V0Qm91bmRNYXggPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgYm91bmRzID0gdGhpcy5fYm91bmRzO1xuICAgIGlmICh2YWx1ZSA8PSBib3VuZHNbMF0pe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYm91bmRzWzFdID0gdmFsdWU7XG4gICAgdGhpcy5faW50ZXJwb2xhdGVWYWx1ZVJlbGF0aXZlKCk7XG4gICAgdGhpcy5fdXBkYXRlSGFuZGxlKCk7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl9pbnRlcnBvbGF0ZVZhbHVlUmVsYXRpdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJvdW5kc01pbiA9IHRoaXMuX2JvdW5kc1swXSxcbiAgICAgICAgYm91bmRzTWF4ID0gdGhpcy5fYm91bmRzWzFdLFxuICAgICAgICBwcmV2SW50cnBsID0gTWF0aC5hYnMoKHRoaXMuX3ZhbHVlIC0gYm91bmRzTWluKSAvIChib3VuZHNNaW4gLSBib3VuZHNNYXgpKTtcblxuICAgIHRoaXMuX3ZhbHVlID0gYm91bmRzTWluICogKDEuMCAtIHByZXZJbnRycGwpICsgYm91bmRzTWF4ICogcHJldkludHJwbDtcbiAgICB0aGlzLl9pbnRycGwgPSBNYXRoLmFicygodGhpcy5fdmFsdWUgLSBib3VuZHNNaW4pIC8gKGJvdW5kc01pbiAtIGJvdW5kc01heCkpO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBib3VuZHNNaW4gPSB0aGlzLl9ib3VuZHNbMF0sXG4gICAgICAgIGJvdW5kc01heCA9IHRoaXMuX2JvdW5kc1sxXTtcblxuICAgIGlmICh2YWx1ZSA8IGJvdW5kc01pbiB8fCB2YWx1ZSA+IGJvdW5kc01heCl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faW50cnBsID0gTWF0aC5hYnMoKHZhbHVlIC0gYm91bmRzTWluKSAvIChib3VuZHNNaW4gLSBib3VuZHNNYXgpKTtcbiAgICB0aGlzLl91cGRhdGVIYW5kbGUoKTtcbiAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gU2xpZGVyX0ludGVybmFsOyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE9wdGlvbnMgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcbnZhciBQcmVzZXRCdG4gPSByZXF1aXJlKCcuL1ByZXNldEJ0bicpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4uL2NvcmUvTWV0cmljJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSAgcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9QUkVTRVQgPSBudWxsO1xuXG5mdW5jdGlvbiBTdHJpbmdJbnB1dChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5wcmVzZXRzICA9IHBhcmFtcy5wcmVzZXRzICB8fCBERUZBVUxUX1BSRVNFVDtcblxuICAgIHRoaXMuX29uQ2hhbmdlICAgPSBwYXJhbXMub25DaGFuZ2U7XG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfVEVYVCk7XG5cbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcblxuICAgIHZhciBwcmVzZXRzID0gcGFyYW1zLnByZXNldHM7XG4gICAgaWYgKCFwcmVzZXRzKSB7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGlucHV0KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBpbnB1dFdyYXAgPSBuZXcgTm9kZSgpO1xuICAgICAgICBpbnB1dFdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcElucHV0V1ByZXNldCk7XG5cbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQoaW5wdXRXcmFwKTtcbiAgICAgICAgaW5wdXRXcmFwLmFkZENoaWxkKGlucHV0KTtcblxuICAgICAgICB2YXIgb3B0aW9ucyA9IE9wdGlvbnMuZ2V0KCksXG4gICAgICAgICAgICBwcmVzZXRCdG4gPSBuZXcgUHJlc2V0QnRuKHRoaXMuX3dyYXBOb2RlKTtcblxuICAgICAgICB2YXIgb25QcmVzZXREZWFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgb3B0aW9ucy5jbGVhcigpO1xuICAgICAgICAgICAgcHJlc2V0QnRuLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBvblByZXNldEFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgb3B0aW9ucy5idWlsZChwcmVzZXRzLFxuICAgICAgICAgICAgICAgIGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpLFxuICAgICAgICAgICAgICAgIGlucHV0LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJywgcHJlc2V0c1tvcHRpb25zLmdldFNlbGVjdGVkSW5kZXgoKV0pO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5hcHBseVZhbHVlKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblByZXNldERlYWN0aXZhdGUsXG4gICAgICAgICAgICAgICAgTWV0cmljLlBBRERJTkdfUFJFU0VULFxuICAgICAgICAgICAgICAgIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgICAgICBwcmVzZXRCdG4uc2V0T25BY3RpdmUob25QcmVzZXRBY3RpdmF0ZSk7XG4gICAgICAgIHByZXNldEJ0bi5zZXRPbkRlYWN0aXZlKG9uUHJlc2V0RGVhY3RpdmF0ZSlcbiAgICB9XG5cbiAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLHRoaXMuX29iamVjdFt0aGlzLl9rZXldKTtcblxuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LktFWV9VUCwgdGhpcy5fb25JbnB1dEtleVVwLmJpbmQodGhpcykpO1xuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LkNIQU5HRSwgdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpKTtcblxuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uSW5wdXREcmFnU3RhcnQuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LklOUFVUX1NFTEVDVF9EUkFHLHRoaXMuX3BhcmVudCwnb25Db21wb25lbnRTZWxlY3REcmFnJyk7XG59XG5cblN0cmluZ0lucHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5cblN0cmluZ0lucHV0LnByb3RvdHlwZS5fb25JbnB1dEtleVVwID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAodGhpcy5fa2V5SXNDaGFyKGUua2V5Q29kZSkpe1xuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICB9XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cblN0cmluZ0lucHV0LnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKHRoaXMuX2tleUlzQ2hhcihlLmtleUNvZGUpKXtcbiAgICAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgfVxuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xufTtcblxuLy9UT0RPOiBGaW5pc2ggY2hlY2tcblN0cmluZ0lucHV0LnByb3RvdHlwZS5fa2V5SXNDaGFyID0gZnVuY3Rpb24gKGtleUNvZGUpIHtcbiAgICByZXR1cm4ga2V5Q29kZSAhPSAxNyAmJlxuICAgICAgICBrZXlDb2RlICE9IDE4ICYmXG4gICAgICAgIGtleUNvZGUgIT0gMjAgJiZcbiAgICAgICAga2V5Q29kZSAhPSAzNyAmJlxuICAgICAgICBrZXlDb2RlICE9IDM4ICYmXG4gICAgICAgIGtleUNvZGUgIT0gMzkgJiZcbiAgICAgICAga2V5Q29kZSAhPSA0MCAmJlxuICAgICAgICBrZXlDb2RlICE9IDE2O1xufTtcblxuXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSA9IHRoaXMuX2lucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbn07XG5cblN0cmluZ0lucHV0LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXJldHVybjtcbiAgICB0aGlzLl9pbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG59O1xuXG4vL1ByZXZlbnQgY2hyb21lIHNlbGVjdCBkcmFnXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUuX29uSW5wdXREcmFnU3RhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGV2ZW50TW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgZXZlbnQgPSBDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRztcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25EcmFnRmluaXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcblxuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0ZpbmlzaCwgZmFsc2UpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJpbmdJbnB1dDsiLCJ2YXIgT3V0cHV0ID0gcmVxdWlyZSgnLi9PdXRwdXQnKTtcblxuU3RyaW5nT3V0cHV0ID0gZnVuY3Rpb24gKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgT3V0cHV0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5TdHJpbmdPdXRwdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPdXRwdXQucHJvdG90eXBlKTtcblxuU3RyaW5nT3V0cHV0LnByb3RvdHlwZS5fc2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX3BhcmVudC5pc0Rpc2FibGVkKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGV4dEFyZWFTdHJpbmcgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcblxuICAgIGlmICh0ZXh0QXJlYVN0cmluZyA9PSB0aGlzLl9wcmV2U3RyaW5nKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGV4dEFyZWEgPSB0aGlzLl90ZXh0QXJlYSxcbiAgICAgICAgdGV4dEFyZWFFbGVtZW50ID0gdGV4dEFyZWEuZ2V0RWxlbWVudCgpLFxuICAgICAgICB0ZXh0QXJlYVNjcm9sbEhlaWdodDtcblxuICAgIHRleHRBcmVhLnNldFByb3BlcnR5KCd2YWx1ZScsIHRleHRBcmVhU3RyaW5nKTtcbiAgICB0ZXh0QXJlYVNjcm9sbEhlaWdodCA9IHRleHRBcmVhRWxlbWVudC5zY3JvbGxIZWlnaHQ7XG4gICAgdGV4dEFyZWEuc2V0SGVpZ2h0KHRleHRBcmVhU2Nyb2xsSGVpZ2h0KTtcblxuICAgIHZhciBzY3JvbGxCYXIgPSB0aGlzLl9zY3JvbGxCYXI7XG5cbiAgICBpZiAoc2Nyb2xsQmFyKSB7XG4gICAgICAgIGlmICh0ZXh0QXJlYVNjcm9sbEhlaWdodCA8PSB0aGlzLl93cmFwTm9kZS5nZXRIZWlnaHQoKSkge1xuICAgICAgICAgICAgc2Nyb2xsQmFyLmRpc2FibGUoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNjcm9sbEJhci5lbmFibGUoKTtcbiAgICAgICAgICAgIHNjcm9sbEJhci51cGRhdGUoKTtcbiAgICAgICAgICAgIHNjcm9sbEJhci5yZXNldCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMuX3ByZXZTdHJpbmcgPSB0ZXh0QXJlYVN0cmluZztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RyaW5nT3V0cHV0O1xuIiwidmFyIFBsb3R0ZXIgPSByZXF1aXJlKCcuL1Bsb3R0ZXInKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xuXG52YXIgREVGQVVMVF9SRVNPTFVUSU9OID0gMTtcblxuZnVuY3Rpb24gVmFsdWVQbG90dGVyKHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKSB7XG4gICAgUGxvdHRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgc3ZnICAgICAgID0gdGhpcy5fc3ZnLFxuICAgICAgICBzdmdXaWR0aCAgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIHN2Z0hlaWdodCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCAgICAgfHwgc3ZnSGVpZ2h0O1xuICAgIHBhcmFtcy5yZXNvbHV0aW9uID0gcGFyYW1zLnJlc29sdXRpb24gfHwgREVGQVVMVF9SRVNPTFVUSU9OO1xuXG4gICAgdmFyIHJlc29sdXRpb24gPSBwYXJhbXMucmVzb2x1dGlvbixcbiAgICAgICAgbGVuZ3RoICAgICA9IE1hdGguZmxvb3Ioc3ZnV2lkdGggLyByZXNvbHV0aW9uKTtcblxuICAgIHZhciBwb2ludHMgICAgID0gdGhpcy5fcG9pbnRzICA9IG5ldyBBcnJheShsZW5ndGggKiAyKSxcbiAgICAgICAgYnVmZmVyMCAgICA9IHRoaXMuX2J1ZmZlcjAgPSBuZXcgQXJyYXkobGVuZ3RoKSxcbiAgICAgICAgYnVmZmVyMSAgICA9IHRoaXMuX2J1ZmZlcjEgPSBuZXcgQXJyYXkobGVuZ3RoKTtcblxuICAgIHZhciBtaW4gPSB0aGlzLl9saW5lV2lkdGggKiAwLjU7XG5cbiAgICB2YXIgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBsZW5ndGgpIHtcbiAgICAgICAgYnVmZmVyMFtpXSA9IGJ1ZmZlcjFbaV0gPSBwb2ludHNbaSAqIDJdID0gcG9pbnRzW2kgKiAyICsgMV0gPSBtaW47XG4gICAgfVxuXG4gICAgdGhpcy5faGVpZ2h0ID0gcGFyYW1zLmhlaWdodCA9IHBhcmFtcy5oZWlnaHQgIDwgTWV0cmljLkNPTVBPTkVOVF9NSU5fSEVJR0hUID9cbiAgICAgICAgICAgICAgICAgICBNZXRyaWMuQ09NUE9ORU5UX01JTl9IRUlHSFQgOiBwYXJhbXMuaGVpZ2h0O1xuXG4gICAgdGhpcy5fc3ZnU2V0U2l6ZShzdmdIZWlnaHQsTWF0aC5mbG9vcihwYXJhbXMuaGVpZ2h0KSk7XG4gICAgdGhpcy5fZ3JpZC5zdHlsZS5zdHJva2UgPSAncmdiKDM5LDQ0LDQ2KSc7XG5cbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcbiAgICB0aGlzLl9kcmF3VmFsdWUoKTtcbn1cblxuVmFsdWVQbG90dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGxvdHRlci5wcm90b3R5cGUpO1xuXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLl9yZWRyYXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBvaW50cyA9IHRoaXMuX3BvaW50cyxcbiAgICAgICAgYnVmZmVyTGVuID0gdGhpcy5fYnVmZmVyMC5sZW5ndGg7XG5cbiAgICB2YXIgd2lkdGggPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIHJhdGlvID0gd2lkdGggLyAoYnVmZmVyTGVuIC0gMSk7XG5cbiAgICB2YXIgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBidWZmZXJMZW4pIHtcbiAgICAgICAgcG9pbnRzW2kgKiAyXSA9IHdpZHRoIC0gaSAqIHJhdGlvO1xuICAgIH1cblxuICAgIHRoaXMuX2RyYXdWYWx1ZSgpO1xufTtcblxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd2lkdGggPSB0aGlzLl93cmFwTm9kZS5nZXRXaWR0aCgpLFxuICAgICAgICBoZWlnaHQgPSB0aGlzLl9oZWlnaHQ7XG5cbiAgICB0aGlzLl9zdmdTZXRTaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHRoaXMuX2RyYXdHcmlkKCk7XG4gICAgdGhpcy5fcmVkcmF3KCk7XG59O1xuXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLl9kcmF3VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZHJhd0N1cnZlKCk7XG59O1xuXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLl9kcmF3R3JpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xuXG4gICAgdmFyIHN2Z1dpZHRoID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBzdmdIZWlnaHRIYWxmID0gTWF0aC5mbG9vcihOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpICogMC41KTtcblxuICAgIHZhciBwYXRoQ21kID0gJyc7XG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZE1vdmVUbygwLCBzdmdIZWlnaHRIYWxmKTtcbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZVRvKHN2Z1dpZHRoLCBzdmdIZWlnaHRIYWxmKTtcblxuICAgIHRoaXMuX2dyaWQuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZCk7XG59O1xuXG4vL1RPRE86IG1lcmdlIHVwZGF0ZSArIHBhdGhjbWRcblZhbHVlUGxvdHRlci5wcm90b3R5cGUuX2RyYXdDdXJ2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xuXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG5cbiAgICB2YXIgYnVmZmVyMCA9IHRoaXMuX2J1ZmZlcjAsXG4gICAgICAgIGJ1ZmZlcjEgPSB0aGlzLl9idWZmZXIxLFxuICAgICAgICBwb2ludHMgPSB0aGlzLl9wb2ludHM7XG5cbiAgICB2YXIgYnVmZmVyTGVuZ3RoID0gYnVmZmVyMC5sZW5ndGg7XG5cbiAgICB2YXIgcGF0aENtZCA9ICcnO1xuXG4gICAgdmFyIGhlaWdodEhhbGYgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpICogMC41LFxuICAgICAgICB1bml0ID0gaGVpZ2h0SGFsZiAtIHRoaXMuX2xpbmVXaWR0aCAqIDAuNTtcblxuICAgIHBvaW50c1sxXSA9IGJ1ZmZlcjBbMF07XG4gICAgYnVmZmVyMFtidWZmZXJMZW5ndGggLSAxXSA9ICh2YWx1ZSAqIHVuaXQpICogLTEgKyBNYXRoLmZsb29yKGhlaWdodEhhbGYpO1xuXG4gICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTW92ZVRvKHBvaW50c1swXSwgcG9pbnRzWzFdKTtcblxuICAgIHZhciBpID0gMCwgaW5kZXg7XG5cbiAgICB3aGlsZSAoKytpIDwgYnVmZmVyTGVuZ3RoKSB7XG4gICAgICAgIGluZGV4ID0gaSAqIDI7XG5cbiAgICAgICAgYnVmZmVyMVtpIC0gMV0gPSBidWZmZXIwW2ldO1xuICAgICAgICBwb2ludHNbaW5kZXggKyAxXSA9IGJ1ZmZlcjBbaSAtIDFdID0gYnVmZmVyMVtpIC0gMV07XG5cbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZVRvKHBvaW50c1tpbmRleF0sIHBvaW50c1tpbmRleCArIDFdKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wYXRoLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xufTtcblxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX3BhcmVudC5pc0Rpc2FibGVkKCkpcmV0dXJuO1xuICAgIHRoaXMuX2RyYXdWYWx1ZSgpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gVmFsdWVQbG90dGVyO1xuXG4iLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4vZG9jdW1lbnQvTm9kZScpLFxuICAgIENTUyA9IHJlcXVpcmUoJy4vZG9jdW1lbnQvQ1NTJyk7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50RXZlbnQnKTtcblxuZnVuY3Rpb24gQ29tcG9uZW50KHBhcmVudCxsYWJlbCkge1xuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBsYWJlbCA9IHBhcmVudC51c2VzTGFiZWxzKCkgPyBsYWJlbCA6ICdub25lJztcblxuICAgIHRoaXMuX3BhcmVudCAgID0gcGFyZW50O1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSBmYWxzZTtcblxuICAgIHZhciByb290Tm9kZSA9IHRoaXMuX25vZGUgPSBuZXcgTm9kZShOb2RlLkxJU1RfSVRFTSksXG4gICAgICAgIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUgPSBuZXcgTm9kZSgpO1xuICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQod3JhcE5vZGUpO1xuXG4gICAgaWYgKGxhYmVsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKGxhYmVsLmxlbmd0aCAhPSAwICYmIGxhYmVsICE9ICdub25lJykge1xuICAgICAgICAgICAgdmFyIGxhYmxOb2RlID0gdGhpcy5fbGFibE5vZGUgPSBuZXcgTm9kZShOb2RlLlNQQU4pO1xuICAgICAgICAgICAgICAgIGxhYmxOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKTtcbiAgICAgICAgICAgICAgICBsYWJsTm9kZS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgbGFiZWwpO1xuICAgICAgICAgICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKGxhYmxOb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsYWJlbCA9PSAnbm9uZScpIHtcbiAgICAgICAgICAgIHdyYXBOb2RlLnNldFN0eWxlUHJvcGVydHkoJ21hcmdpbkxlZnQnLCAnMCcpO1xuICAgICAgICAgICAgd3JhcE5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuRU5BQkxFLCB0aGlzLCdvbkVuYWJsZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LkRJU0FCTEUsdGhpcywnb25EaXNhYmxlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZENvbXBvbmVudE5vZGUocm9vdE5vZGUpO1xufVxuXG5Db21wb25lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblxuQ29tcG9uZW50LnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xufTtcblxuQ29tcG9uZW50LnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSB0cnVlO1xufTtcblxuQ29tcG9uZW50LnByb3RvdHlwZS5pc0VuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICF0aGlzLl9pc0Rpc2FibGVkO1xufTtcbkNvbXBvbmVudC5wcm90b3R5cGUuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faXNEaXNhYmxlZFxufTtcblxuQ29tcG9uZW50LnByb3RvdHlwZS5vbkVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVuYWJsZSgpO1xufTtcblxuQ29tcG9uZW50LnByb3RvdHlwZS5vbkRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNhYmxlKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDsiLCJ2YXIgQ29tcG9uZW50RXZlbnQgPSB7XG5cdFZBTFVFX1VQREFURUQ6ICd2YWx1ZVVwZGF0ZWQnLFxuXHRVUERBVEVfVkFMVUU6ICd1cGRhdGVWYWx1ZScsXG5cblx0SU5QVVRfU0VMRUNUX0RSQUc6ICdpbnB1dFNlbGVjdERyYWcnLFxuXG5cdEVOQUJMRSAgOiAnZW5hYmxlJyxcblx0RElTQUJMRSA6ICdkaXNhYmxlJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnRFdmVudDsiLCJmdW5jdGlvbiBDb21wb25lbnRPYmplY3RFcnJvcihvYmplY3Qsa2V5KSB7XG5cdEVycm9yLmFwcGx5KHRoaXMpO1xuXHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLENvbXBvbmVudE9iamVjdEVycm9yKTtcblx0dGhpcy5uYW1lID0gJ0NvbXBvbmVudE9iamVjdEVycm9yJztcblx0dGhpcy5tZXNzYWdlID0gJ09iamVjdCBvZiB0eXBlICcgKyBvYmplY3QuY29uc3RydWN0b3IubmFtZSArICcgaGFzIG5vIG1lbWJlciAnICsga2V5ICsgJy4nO1xufVxuQ29tcG9uZW50T2JqZWN0RXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuQ29tcG9uZW50T2JqZWN0RXJyb3IuY29uc3RydWN0b3IgPSBDb21wb25lbnRPYmplY3RFcnJvcjtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnRPYmplY3RFcnJvcjsiLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9ldmVudC9FdmVudERpc3BhdGNoZXInKSxcbiAgICBFdmVudF8gPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50JyksXG4gICAgSGlzdG9yeUV2ZW50ID0gcmVxdWlyZSgnLi9IaXN0b3J5RXZlbnQnKTtcblxudmFyIE1BWF9TVEFURVMgPSAzMDtcblxuZnVuY3Rpb24gSGlzdG9yeSgpIHtcbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB0aGlzLl9zdGF0ZXMgPSBbXTtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gZmFsc2U7XG59XG5cbkhpc3RvcnkucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblxuSGlzdG9yeS5wcm90b3R5cGUucHVzaFN0YXRlID0gZnVuY3Rpb24gKG9iamVjdCwga2V5LCB2YWx1ZSkge1xuICAgIGlmICh0aGlzLl9pc0Rpc2FibGVkKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG4gICAgaWYgKHN0YXRlcy5sZW5ndGggPj0gTUFYX1NUQVRFUyl7XG4gICAgICAgIHN0YXRlcy5zaGlmdCgpO1xuICAgIH1cbiAgICBzdGF0ZXMucHVzaCh7b2JqZWN0OiBvYmplY3QsIGtleToga2V5LCB2YWx1ZTogdmFsdWV9KTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBIaXN0b3J5RXZlbnQuU1RBVEVfUFVTSCwgbnVsbCkpO1xufTtcblxuSGlzdG9yeS5wcm90b3R5cGUuZ2V0U3RhdGUgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXkpIHtcbiAgICB2YXIgc3RhdGVzID0gdGhpcy5fc3RhdGVzLFxuICAgICAgICBzdGF0ZXNMZW4gPSBzdGF0ZXMubGVuZ3RoO1xuXG4gICAgaWYgKHN0YXRlc0xlbiA9PSAwKXtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdmFyIHN0YXRlLCB2YWx1ZTtcbiAgICB2YXIgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBzdGF0ZXNMZW4pIHtcbiAgICAgICAgc3RhdGUgPSBzdGF0ZXNbaV07XG4gICAgICAgIGlmIChzdGF0ZS5vYmplY3QgPT09IG9iamVjdCkge1xuICAgICAgICAgICAgaWYgKHN0YXRlLmtleSA9PT0ga2V5KSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBzdGF0ZS52YWx1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG5IaXN0b3J5LnByb3RvdHlwZS5wb3BTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5faXNEaXNhYmxlZCl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgIGlmIChzdGF0ZXMubGVuZ3RoIDwgMSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbGFzdFN0YXRlID0gc3RhdGVzLnBvcCgpO1xuICAgIGxhc3RTdGF0ZS5vYmplY3RbbGFzdFN0YXRlLmtleV0gPSBsYXN0U3RhdGUudmFsdWU7XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBIaXN0b3J5RXZlbnQuU1RBVEVfUE9QLCBudWxsKSk7XG59O1xuXG5IaXN0b3J5LnByb3RvdHlwZS5nZXROdW1TdGF0ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlcy5sZW5ndGg7XG59O1xuXG5IaXN0b3J5Ll9pbnN0YW5jZSA9IG51bGw7XG5cbkhpc3Rvcnkuc2V0dXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIEhpc3RvcnkuX2luc3RhbmNlID0gbmV3IEhpc3RvcnkoKTtcbn07XG5cbkhpc3RvcnkuZ2V0SW5zdGFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIEhpc3RvcnkuX2luc3RhbmNlO1xufTtcblxuSGlzdG9yeS5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSBmYWxzZTtcbn07XG5IaXN0b3J5LnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSB0cnVlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBIaXN0b3J5OyIsInZhciBIaXN0b3J5RXZlbnQgPSB7XG5cdFNUQVRFX1BVU0g6ICdoaXN0b3J5U3RhdGVQdXNoJyxcblx0U1RBVEVfUE9QOiAnaGlzdG9yeVN0YXRlUG9wJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBIaXN0b3J5RXZlbnQ7IiwidmFyIE1ldHJpYyA9IHtcblx0Q09NUE9ORU5UX01JTl9IRUlHSFQ6IDI1LFxuXHRTVFJPS0VfU0laRTogMSxcblx0UEFERElOR19XUkFQUEVSOiAxMixcblx0UEFERElOR19PUFRJT05TOiAyLFxuXHRQQURESU5HX1BSRVNFVDogMjAsXG5cblx0U0NST0xMQkFSX1RSQUNLX1BBRERJTkc6IDIsXG5cdEZVTkNUSU9OX1BMT1RURVJfTEFCRUxfVElDS19TSVpFOiA2XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1ldHJpYzsiLCJ2YXIgQ29tcG9uZW50ID0gcmVxdWlyZSgnLi9Db21wb25lbnQnKTtcbnZhciBIaXN0b3J5ID0gcmVxdWlyZSgnLi9IaXN0b3J5Jyk7XG52YXIgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuL0NvbXBvbmVudEV2ZW50Jyk7XG52YXIgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIgPSByZXF1aXJlKCcuL09iamVjdENvbXBvbmVudE5vdGlmaWVyJyk7XG52YXIgQ29tcG9uZW50T2JqZWN0RXJyb3IgPSByZXF1aXJlKCcuL0NvbXBvbmVudE9iamVjdEVycm9yJyk7XG5cblxuZnVuY3Rpb24gT2JqZWN0Q29tcG9uZW50KHBhcmVudCxvYmplY3Qsa2V5LHBhcmFtcykge1xuICAgIGlmKG9iamVjdFtrZXldID09PSB1bmRlZmluZWQpe1xuICAgICAgICB0aHJvdyBuZXcgQ29tcG9uZW50T2JqZWN0RXJyb3Iob2JqZWN0LGtleSk7XG4gICAgfVxuXG4gICAgcGFyYW1zICAgICAgID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5sYWJlbCA9IHBhcmFtcy5sYWJlbCB8fCBrZXk7XG5cbiAgICBDb21wb25lbnQuYXBwbHkodGhpcyxbcGFyZW50LHBhcmFtcy5sYWJlbF0pO1xuXG4gICAgdGhpcy5fb2JqZWN0ICAgPSBvYmplY3Q7XG4gICAgdGhpcy5fa2V5ICAgICAgPSBrZXk7XG5cbiAgICB0aGlzLl9vbkNoYW5nZSA9IGZ1bmN0aW9uKCl7fTtcblxuICAgIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuVVBEQVRFX1ZBTFVFLCB0aGlzLCdvblZhbHVlVXBkYXRlJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIE9iamVjdENvbXBvbmVudE5vdGlmaWVyLmdldCgpLCAnb25WYWx1ZVVwZGF0ZWQnKTtcbn1cblxuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ29tcG9uZW50LnByb3RvdHlwZSk7XG5cbi8vT3ZlcnJpZGUgaW4gU3ViY2xhc3Ncbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uKCkge307XG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbihlKSB7fTtcblxuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZS5wdXNoSGlzdG9yeVN0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9iaiA9IHRoaXMuX29iamVjdCwga2V5ID0gdGhpcy5fa2V5O1xuICAgIEhpc3RvcnkuZ2V0SW5zdGFuY2UoKS5wdXNoU3RhdGUob2JqLCBrZXksIG9ialtrZXldKTtcbn07XG5cbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMuX29iamVjdFt0aGlzLl9rZXldID0gdmFsdWU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdENvbXBvbmVudDtcbiIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuXHRFdmVudF8gXHRcdFx0PSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50Jyk7XG52YXIgQ29tcG9uZW50RXZlbnQgID0gcmVxdWlyZSgnLi9Db21wb25lbnRFdmVudCcpLFxuXHRPcHRpb25FdmVudFx0XHQ9IHJlcXVpcmUoJy4vT3B0aW9uRXZlbnQnKTtcblxuZnVuY3Rpb24gT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIoKXtcblx0RXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMpO1xufVxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIucHJvdG90eXBlLm9uVmFsdWVVcGRhdGVkID0gZnVuY3Rpb24gKGUpIHtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVVBEQVRFX1ZBTFVFLCB7b3JpZ2luOiBlLnNlbmRlcn0pKTtcbn07XG5cbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLnByb3RvdHlwZS5vbk9wdGlvblRyaWdnZXJlZCA9IGZ1bmN0aW9uKGUpIHtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgT3B0aW9uRXZlbnQuVFJJR0dFUiwge29yaWdpbjogZS5zZW5kZXJ9KSk7XG59O1xuXG52YXIgaW5zdGFuY2UgPSBudWxsO1xuXG5PYmplY3RDb21wb25lbnROb3RpZmllci5nZXQgPSBmdW5jdGlvbigpe1xuXHRpZighaW5zdGFuY2Upe1xuXHRcdGluc3RhbmNlID0gbmV3IE9iamVjdENvbXBvbmVudE5vdGlmaWVyKCk7XG5cdH1cblx0cmV0dXJuIGluc3RhbmNlO1xufTtcblxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZGVzdHJveSA9IGZ1bmN0aW9uKCl7XG5cdGluc3RhbmNlID0gbnVsbDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0Q29tcG9uZW50Tm90aWZpZXI7IiwidmFyIE9wdGlvbkV2ZW50ID0ge1xuXHRUUklHR0VSRUQ6ICdzZWxlY3RUcmlnZ2VyJyxcblx0VFJJR0dFUjogJ3RyaWdnZXJTZWxlY3QnXG59O1xubW9kdWxlLmV4cG9ydHMgPSBPcHRpb25FdmVudDsiLCJ2YXIgUHJlc2V0ID1cbntcbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICAvL0hJU1RPUllfTUFYX1NUQVRFUyA6IDMwLFxuICAgIE5VTUJFUl9JTlBVVF9TSElGVF9NVUxUSVBMSUVSIDogMTAsXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICBGVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1ggICAgOiAgMSxcbiAgICBGVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1kgICAgOiAgMSxcbiAgICBGVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1VOSVRfWCAgICA6ICAwLjI1LFxuICAgIEZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfVU5JVF9ZICAgIDogIDAuMjUsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9VTklUX01JTiAgOiAwLjE1LFxuICAgIEZVTkNUSU9OX1BMT1RURVJfVU5JVF9NQVggIDogNCxcbiAgICBGVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9TQ0FMRSAgICAgOiAxMC4wLFxuICAgIEZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfU0NBTEUgICAgIDoxLjAsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9TQ0FMRV9NSU4gOiAwLjAyLFxuICAgIEZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUFYIDogMjUsXG5cbiAgICBGVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX0FYRVNfQ09MT1IgOiAncmdiYSgyNTUsMjU1LDI1NSwwLjc1KScsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9HUklEX0NPTE9SIDogJ3JnYmEoMjUsMjUsMjUsMC43NSknLFxuXG4gICAgRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfQVhFU19DT0xPUiA6ICdyZ2IoNTQsNjAsNjQpJyxcbiAgICBGVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9HUklEX0NPTE9SIDogJ3JnYigyNSwyNSwyNSknLFxuXG4gICAgRlVOQ1RJT05fUExPVFRFUl9DSVJDTEVfTEFCRUxfUkFESVVTIDogMyxcbiAgICBGVU5DVElPTl9QTE9UVEVSX0NJUkNMRV9MQUJFTF9GSUxMICAgOiAncmdiKDI1NSwyNTUsMjU1KScsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9DSVJDTEVfU1RST0tFICAgICAgIDogJyNiMTIzMzQnXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJlc2V0OyIsImZ1bmN0aW9uIENvbG9yRm9ybWF0RXJyb3IobXNnKSB7XG5cdEVycm9yLmFwcGx5KHRoaXMpO1xuXHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLENvbG9yRm9ybWF0RXJyb3IpO1xuXHR0aGlzLm5hbWUgPSAnQ29sb3JGb3JtYXRFcnJvcic7XG5cdHRoaXMubWVzc2FnZSA9IG1zZztcbn1cbkNvbG9yRm9ybWF0RXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuQ29sb3JGb3JtYXRFcnJvci5jb25zdHJ1Y3RvciA9IENvbG9yRm9ybWF0RXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sb3JGb3JtYXRFcnJvcjsiLCJ2YXIgQ29sb3JNb2RlID0ge1xuXHRSR0I6ICdyZ2InLFxuXHRIU1Y6ICdoc3YnLFxuXHRIRVg6ICdoZXgnLFxuXHRSR0JmdjogJ3JnYmZ2J1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvck1vZGU7IiwidmFyIENvbG9yVXRpbCA9IHtcblx0SFNWMlJHQjogZnVuY3Rpb24gKGh1ZSwgc2F0LCB2YWwpIHtcblx0XHR2YXIgbWF4X2h1ZSA9IDM2MC4wLFxuXHRcdFx0bWF4X3NhdCA9IDEwMC4wLFxuXHRcdFx0bWF4X3ZhbCA9IDEwMC4wO1xuXG5cdFx0dmFyIG1pbl9odWUgPSAwLjAsXG5cdFx0XHRtaW5fc2F0ID0gMCxcblx0XHRcdG1pbl92YWwgPSAwO1xuXG5cdFx0aHVlID0gaHVlICUgbWF4X2h1ZTtcblx0XHR2YWwgPSBNYXRoLm1heChtaW5fdmFsLCBNYXRoLm1pbih2YWwsIG1heF92YWwpKSAvIG1heF92YWwgKiAyNTUuMDtcblxuXHRcdGlmIChzYXQgPD0gbWluX3NhdCkge1xuXHRcdFx0dmFsID0gTWF0aC5yb3VuZCh2YWwpO1xuXHRcdFx0cmV0dXJuIFt2YWwsIHZhbCwgdmFsXTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoc2F0ID4gbWF4X3NhdClzYXQgPSBtYXhfc2F0O1xuXG5cdFx0c2F0ID0gc2F0IC8gbWF4X3NhdDtcblxuXHRcdC8vaHR0cDovL2QuaGF0ZW5hLm5lLmpwL2phOS8yMDEwMDkwMy8xMjgzNTA0MzRcblxuXHRcdHZhciBoaSA9IE1hdGguZmxvb3IoaHVlIC8gNjAuMCkgJSA2LFxuXHRcdFx0ZiA9IChodWUgLyA2MC4wKSAtIGhpLFxuXHRcdFx0cCA9IHZhbCAqICgxIC0gc2F0KSxcblx0XHRcdHEgPSB2YWwgKiAoMSAtIGYgKiBzYXQpLFxuXHRcdFx0dCA9IHZhbCAqICgxIC0gKDEgLSBmKSAqIHNhdCk7XG5cblx0XHR2YXIgciA9IDAsXG5cdFx0XHRnID0gMCxcblx0XHRcdGIgPSAwO1xuXG5cdFx0c3dpdGNoIChoaSkge1xuXHRcdFx0Y2FzZSAwOlxuXHRcdFx0XHRyID0gdmFsO1xuXHRcdFx0XHRnID0gdDtcblx0XHRcdFx0YiA9IHA7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHRyID0gcTtcblx0XHRcdFx0ZyA9IHZhbDtcblx0XHRcdFx0YiA9IHA7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHRyID0gcDtcblx0XHRcdFx0ZyA9IHZhbDtcblx0XHRcdFx0YiA9IHQ7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHRyID0gcDtcblx0XHRcdFx0ZyA9IHE7XG5cdFx0XHRcdGIgPSB2YWw7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSA0OlxuXHRcdFx0XHRyID0gdDtcblx0XHRcdFx0ZyA9IHA7XG5cdFx0XHRcdGIgPSB2YWw7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSA1OlxuXHRcdFx0XHRyID0gdmFsO1xuXHRcdFx0XHRnID0gcDtcblx0XHRcdFx0YiA9IHE7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0ciA9IE1hdGgucm91bmQocik7XG5cdFx0ZyA9IE1hdGgucm91bmQoZyk7XG5cdFx0YiA9IE1hdGgucm91bmQoYik7XG5cblx0XHRyZXR1cm4gW3IsIGcsIGJdO1xuXG5cdH0sXG5cblx0UkdCMkhTVjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcblx0XHR2YXIgaCA9IDAsXG5cdFx0XHRzID0gMCxcblx0XHRcdHYgPSAwO1xuXG5cdFx0ciA9IHIgLyAyNTUuMDtcblx0XHRnID0gZyAvIDI1NS4wO1xuXHRcdGIgPSBiIC8gMjU1LjA7XG5cblx0XHR2YXIgbWluUkdCID0gTWF0aC5taW4ociwgTWF0aC5taW4oZywgYikpLFxuXHRcdFx0bWF4UkdCID0gTWF0aC5tYXgociwgTWF0aC5tYXgoZywgYikpO1xuXG5cdFx0aWYgKG1pblJHQiA9PSBtYXhSR0IpIHtcblx0XHRcdHYgPSBtaW5SR0I7XG5cdFx0XHRyZXR1cm4gWzAsIDAsIE1hdGgucm91bmQodildO1xuXHRcdH1cblxuXHRcdHZhciBkZCA9IChyID09IG1pblJHQikgPyBnIC0gYiA6ICgoYiA9PSBtaW5SR0IpID8gciAtIGcgOiBiIC0gciksXG5cdFx0XHRoaCA9IChyID09IG1pblJHQikgPyAzIDogKChiID09IG1pblJHQikgPyAxIDogNSk7XG5cblx0XHRoID0gTWF0aC5yb3VuZCg2MCAqIChoaCAtIGRkIC8gKG1heFJHQiAtIG1pblJHQikpKTtcblx0XHRzID0gTWF0aC5yb3VuZCgobWF4UkdCIC0gbWluUkdCKSAvIG1heFJHQiAqIDEwMC4wKTtcblx0XHR2ID0gTWF0aC5yb3VuZChtYXhSR0IgKiAxMDAuMCk7XG5cblx0XHRyZXR1cm4gW2gsIHMsIHZdO1xuXHR9LFxuXG5cdFJHQjJIRVg6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG5cdFx0cmV0dXJuIFwiI1wiICsgKCgxIDw8IDI0KSArIChyIDw8IDE2KSArIChnIDw8IDgpICsgYikudG9TdHJpbmcoMTYpLnNsaWNlKDEpO1xuXHR9LFxuXG5cdFJHQmZ2MkhFWDogZnVuY3Rpb24gKHIsIGcsIGIpIHtcblx0XHRyZXR1cm4gQ29sb3JVdGlsLlJHQjJIRVgoTWF0aC5mbG9vcihyICogMjU1LjApLFxuXHRcdFx0TWF0aC5mbG9vcihnICogMjU1LjApLFxuXHRcdFx0TWF0aC5mbG9vcihiICogMjU1LjApKTtcblx0fSxcblxuXHRIU1YySEVYOiBmdW5jdGlvbiAoaCwgcywgdikge1xuXHRcdHZhciByZ2IgPSBDb250cm9sS2l0LkNvbG9yVXRpbC5IU1YyUkdCKGgsIHMsIHYpO1xuXHRcdHJldHVybiBDb250cm9sS2l0LkNvbG9yVXRpbC5SR0IySEVYKHJnYlswXSwgcmdiWzFdLCByZ2JbMl0pO1xuXHR9LFxuXG5cdEhFWDJSR0I6IGZ1bmN0aW9uIChoZXgpIHtcblx0XHR2YXIgc2hvcnRoYW5kUmVnZXggPSAvXiM/KFthLWZcXGRdKShbYS1mXFxkXSkoW2EtZlxcZF0pJC9pO1xuXHRcdGhleCA9IGhleC5yZXBsYWNlKHNob3J0aGFuZFJlZ2V4LCBmdW5jdGlvbiAobSwgciwgZywgYikge1xuXHRcdFx0cmV0dXJuIHIgKyByICsgZyArIGcgKyBiICsgYjtcblx0XHR9KTtcblxuXHRcdHZhciByZXN1bHQgPSAvXiM/KFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pJC9pLmV4ZWMoaGV4KTtcblx0XHRyZXR1cm4gcmVzdWx0ID8gW3BhcnNlSW50KHJlc3VsdFsxXSwgMTYpLCBwYXJzZUludChyZXN1bHRbMl0sIDE2KSwgcGFyc2VJbnQocmVzdWx0WzNdLCAxNildIDogbnVsbDtcblxuXHR9LFxuXG5cdGlzVmFsaWRIRVg6IGZ1bmN0aW9uIChoZXgpIHtcblx0XHRyZXR1cm4gL14jWzAtOUEtRl17Nn0kL2kudGVzdChoZXgpO1xuXHR9LFxuXG5cdGlzVmFsaWRSR0I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG5cdFx0cmV0dXJuIHIgPj0gMCAmJiByIDw9IDI1NSAmJlxuXHRcdFx0ZyA+PSAwICYmIGcgPD0gMjU1ICYmXG5cdFx0XHRiID49IDAgJiYgYiA8PSAyNTU7XG5cdH0sXG5cblx0aXNWYWxpZFJHQmZ2OiBmdW5jdGlvbiAociwgZywgYikge1xuXHRcdHJldHVybiByID49IDAgJiYgciA8PSAxLjAgJiZcblx0XHRcdGcgPj0gMCAmJiBnIDw9IDEuMCAmJlxuXHRcdFx0YiA+PSAwICYmIGIgPD0gMS4wO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9yVXRpbDsiLCJ2YXIgQ1NTID0ge1xuICAgIENvbnRyb2xLaXQgICA6ICdjb250cm9sS2l0JyxcblxuICAgIFBhbmVsICAgICAgICA6ICdwYW5lbCcsXG4gICAgSGVhZCAgICAgICAgIDogJ2hlYWQnLFxuICAgIExhYmVsICAgICAgICA6ICdsYWJlbCcsXG4gICAgTWVudSAgICAgICAgIDogJ21lbnUnLFxuICAgIFdyYXAgICAgICAgICA6ICd3cmFwJyxcblxuICAgIE1lbnVCdG5DbG9zZSA6ICdidG5DbG9zZScsXG4gICAgTWVudUJ0bkhpZGUgIDogJ2J0bkhpZGUnLFxuICAgIE1lbnVCdG5TaG93ICA6ICdidG5TaG93JyxcbiAgICBNZW51QnRuVW5kbyAgOiAnYnRuVW5kbycsXG5cbiAgICBXcmFwSW5wdXRXUHJlc2V0IDogJ2lucHV0V1ByZXNldFdyYXAnLFxuICAgIFdyYXBDb2xvcldQcmVzZXQgOiAnY29sb3JXUHJlc2V0V3JhcCcsXG5cbiAgICBIZWFkSW5hY3RpdmUgOiAnaGVhZEluYWN0aXZlJyxcbiAgICBQYW5lbEhlYWRJbmFjdGl2ZSA6ICdwYW5lbEhlYWRJbmFjdGl2ZScsXG5cbiAgICBHcm91cExpc3QgOiAnZ3JvdXBMaXN0JyxcbiAgICBHcm91cCAgICAgOiAnZ3JvdXAnLFxuICAgIFN1Ykdyb3VwTGlzdCAgOiAnc3ViR3JvdXBMaXN0JyxcbiAgICBTdWJHcm91cCAgICAgIDogJ3N1Ykdyb3VwJyxcblxuXG4gICAgVGV4dEFyZWFXcmFwIDogJ3RleHRBcmVhV3JhcCcsXG5cbiAgICBJY29uQXJyb3dVcEJpZyA6ICdpY29uQXJyb3dVcEJpZycsXG5cbiAgICBCdXR0b24gICAgICAgOiAnYnV0dG9uJyxcblxuICAgIFdyYXBTbGlkZXIgICA6ICd3cmFwU2xpZGVyJyxcblxuICAgIFNsaWRlcldyYXAgICA6ICdzbGlkZXJXcmFwJyxcbiAgICBTbGlkZXJTbG90ICAgOiAnc2xpZGVyU2xvdCcsXG4gICAgU2xpZGVySGFuZGxlIDogJ3NsaWRlckhhbmRsZScsXG5cbiAgICBBcnJvd0JNaW4gICAgOiAnYXJyb3dCTWluJyxcbiAgICBBcnJvd0JNYXggICAgOiAnYXJyb3dCTWF4JyxcbiAgICBBcnJvd0JTdWJNaW4gOiAnYXJyb3dCU3ViTWluJyxcbiAgICBBcnJvd0JTdWJNYXggOiAnYXJyb3dCU3ViTWF4JyxcbiAgICBBcnJvd1NNaW4gICAgOiAnYXJyb3dTTWluJyxcbiAgICBBcnJvd1NNYXggICAgOiAnYXJyb3dTTWF4JyxcblxuICAgIFNlbGVjdCAgICAgICA6ICdzZWxlY3QnLFxuICAgIFNlbGVjdEFjdGl2ZSA6ICdzZWxlY3RBY3RpdmUnLFxuXG4gICAgT3B0aW9ucyAgICAgICAgIDogJ29wdGlvbnMnLFxuICAgIE9wdGlvbnNTZWxlY3RlZCA6ICdsaVNlbGVjdGVkJyxcblxuICAgIFNlbGVjdENvbG9yIDogJ3NlbGVjdENvbG9yJyxcblxuICAgIFByZXNldEJ0biAgICAgICAgOiAncHJlc2V0QnRuJyxcbiAgICBQcmVzZXRCdG5BY3RpdmUgIDogJ3ByZXNldEJ0bkFjdGl2ZScsXG5cbiAgICBDYW52YXNMaXN0SXRlbSAgOiAnY2FudmFzTGlzdEl0ZW0nLFxuICAgIENhbnZhc1dyYXAgICAgICA6ICdjYW52YXNXcmFwJyxcblxuICAgIFNWR0xpc3RJdGVtICAgICA6ICdzdmdMaXN0SXRlbScsXG4gICAgU1ZHV3JhcCAgICAgICAgIDogJ3N2Z1dyYXAnLFxuXG4gICAgR3JhcGhTbGlkZXJYV3JhcCAgIDogJ2dyYXBoU2xpZGVyWFdyYXAnLFxuICAgIEdyYXBoU2xpZGVyWVdyYXAgICA6ICdncmFwaFNsaWRlcllXcmFwJyxcbiAgICBHcmFwaFNsaWRlclggICAgICAgOiAnZ3JhcGhTbGlkZXJYJyxcbiAgICBHcmFwaFNsaWRlclkgICAgICAgOiAnZ3JhcGhTbGlkZXJZJyxcbiAgICBHcmFwaFNsaWRlclhIYW5kbGUgOiAnZ3JhcGhTbGlkZXJYSGFuZGxlJyxcbiAgICBHcmFwaFNsaWRlcllIYW5kbGUgOiAnZ3JhcGhTbGlkZXJZSGFuZGxlJyxcblxuICAgIFBpY2tlciAgICAgICAgICAgICAgOiAncGlja2VyJyxcbiAgICBQaWNrZXJQYWxsZXRlV3JhcCAgIDogJ3BhbGxldGVXcmFwJyxcbiAgICBQaWNrZXJGaWVsZFdyYXAgICAgIDogJ2ZpZWxkV3JhcCcsXG4gICAgUGlja2VySW5wdXRXcmFwICAgICA6ICdpbnB1dFdyYXAnLFxuICAgIFBpY2tlcklucHV0RmllbGQgICAgOiAnaW5wdXRGaWVsZCcsXG4gICAgUGlja2VyQ29udHJvbHNXcmFwICA6ICdjb250cm9sc1dyYXAnLFxuICAgIFBpY2tlckNvbG9yQ29udHJhc3QgOiAnY29sb3JDb250cmFzdCcsXG5cbiAgICBQaWNrZXJIYW5kbGVGaWVsZCAgOiAnaW5kaWNhdG9yJyxcbiAgICBQaWNrZXJIYW5kbGVTbGlkZXIgOiAnaW5kaWNhdG9yJyxcblxuICAgIENvbG9yIDogJ2NvbG9yJyxcblxuICAgIFNjcm9sbEJhciAgICAgICAgOiAnc2Nyb2xsQmFyJyxcbiAgICBTY3JvbGxXcmFwICAgICAgIDogJ3Njcm9sbFdyYXAnLFxuICAgIFNjcm9sbEJhckJ0blVwICAgOiAnYnRuVXAnLFxuICAgIFNjcm9sbEJhckJ0bkRvd24gOiAnYnRuRG93bicsXG4gICAgU2Nyb2xsQmFyVHJhY2sgICA6ICd0cmFjaycsXG4gICAgU2Nyb2xsQmFyVGh1bWIgICA6ICd0aHVtYicsXG4gICAgU2Nyb2xsQnVmZmVyICAgICA6ICdzY3JvbGxCdWZmZXInLFxuXG4gICAgVHJpZ2dlciA6ICdjb250cm9sS2l0VHJpZ2dlcicsXG5cbiAgICBTaXplSGFuZGxlIDogJ3NpemVIYW5kbGUnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENTUztcbiIsInZhciBEb2N1bWVudEV2ZW50ID0ge1xuICAgIE1PVVNFX01PVkUgOiAnbW91c2Vtb3ZlJyxcbiAgICBNT1VTRV9VUCAgIDogJ21vdXNldXAnLFxuICAgIE1PVVNFX0RPV04gOiAnbW91c2Vkb3duJyxcblxuICAgIFdJTkRPV19SRVNJWkUgOiAncmVzaXplJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudEV2ZW50OyIsInZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi9Eb2N1bWVudEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIE1vdXNlKCkge1xuICAgIHRoaXMuX3BvcyA9IFswLCAwXTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25Eb2N1bWVudE1vdXNlTW92ZS5iaW5kKHRoaXMpKTtcbn1cblxuTW91c2UuX2luc3RhbmNlID0gbnVsbDtcblxuTW91c2UucHJvdG90eXBlLl9vbkRvY3VtZW50TW91c2VNb3ZlID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgZHggPSAwLFxuICAgICAgICBkeSA9IDA7XG5cbiAgICBpZiAoIWUpZSA9IHdpbmRvdy5ldmVudDtcbiAgICBpZiAoZS5wYWdlWCkge1xuICAgICAgICBkeCA9IGUucGFnZVg7XG4gICAgICAgIGR5ID0gZS5wYWdlWTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZS5jbGllbnRYKSB7XG4gICAgICAgIGR4ID0gZS5jbGllbnRYICsgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0ICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XG4gICAgICAgIGR5ID0gZS5jbGllbnRZICsgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AgKyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuICAgIH1cbiAgICB0aGlzLl9wb3NbMF0gPSBkeDtcbiAgICB0aGlzLl9wb3NbMV0gPSBkeTtcbn07XG5cbk1vdXNlLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcG9zO1xufTtcblxuTW91c2UucHJvdG90eXBlLmdldFggPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvc1swXTtcbn07XG5cbk1vdXNlLnByb3RvdHlwZS5nZXRZID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9wb3NbMV07XG59O1xuXG5Nb3VzZS5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZihNb3VzZS5faW5zdGFuY2Upe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIE1vdXNlLl9pbnN0YW5jZSA9IG5ldyBNb3VzZSgpO1xufTtcblxuTW91c2UuZ2V0SW5zdGFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE1vdXNlLl9pbnN0YW5jZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW91c2U7IiwiZnVuY3Rpb24gTm9kZSgpIHtcbiAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcblxuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCl7XG4gICAgICAgIGNhc2UgMSA6XG4gICAgICAgICAgICB2YXIgYXJnID0gYXJndW1lbnRzWzBdO1xuICAgICAgICAgICAgaWYgKGFyZyAhPSBOb2RlLklOUFVUX1RFWFQgJiZcbiAgICAgICAgICAgICAgICBhcmcgIT0gTm9kZS5JTlBVVF9CVVRUT04gJiZcbiAgICAgICAgICAgICAgICBhcmcgIT0gTm9kZS5JTlBVVF9TRUxFQ1QgJiZcbiAgICAgICAgICAgICAgICBhcmcgIT0gTm9kZS5JTlBVVF9DSEVDS0JPWCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGFyZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbGVtZW50LnR5cGUgPSBhcmc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgdGhpcy5fZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxufVxuXG5Ob2RlLkRJViA9ICdkaXYnO1xuTm9kZS5JTlBVVF9URVhUID0gJyc7XG5Ob2RlLklOUFVUX1RFWFQgPSAndGV4dCc7XG5Ob2RlLklOUFVUX0JVVFRPTiA9ICdidXR0b24nO1xuTm9kZS5JTlBVVF9TRUxFQ1QgPSAnc2VsZWN0Jztcbk5vZGUuSU5QVVRfQ0hFQ0tCT1ggPSAnY2hlY2tib3gnO1xuTm9kZS5PUFRJT04gPSAnb3B0aW9uJztcbk5vZGUuTElTVCA9ICd1bCc7XG5Ob2RlLkxJU1RfSVRFTSA9ICdsaSc7XG5Ob2RlLlNQQU4gPSAnc3Bhbic7XG5Ob2RlLlRFWFRBUkVBID0gJ3RleHRhcmVhJztcblxuTm9kZS5wcm90b3R5cGUgPSB7XG4gICAgYWRkQ2hpbGQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuYXBwZW5kQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuXG4gICAgYWRkQ2hpbGRyZW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGkgPSAtMSwgbCA9IGFyZ3VtZW50cy5sZW5ndGgsIGUgPSB0aGlzLl9lbGVtZW50O1xuICAgICAgICB3aGlsZSAoKytpIDwgbCkge1xuICAgICAgICAgICAgZS5hcHBlbmRDaGlsZChhcmd1bWVudHNbaV0uZ2V0RWxlbWVudCgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgYWRkQ2hpbGRBdDogZnVuY3Rpb24gKG5vZGUsIGluZGV4KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuaW5zZXJ0QmVmb3JlKG5vZGUuZ2V0RWxlbWVudCgpLCB0aGlzLl9lbGVtZW50LmNoaWxkcmVuW2luZGV4XSk7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG5cbiAgICByZW1vdmVDaGlsZDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5zKG5vZGUpKXJldHVybiBudWxsO1xuICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUNoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcblxuICAgIHJlbW92ZUNoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpID0gLTEsIGwgPSBhcmd1bWVudHMubGVuZ3RoLCBlID0gdGhpcy5fZWxlbWVudDtcbiAgICAgICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgICAgIGUucmVtb3ZlQ2hpbGQoYXJndW1lbnRzW2ldLmdldEVsZW1lbnQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHJlbW92ZUNoaWxkQXQ6IGZ1bmN0aW9uIChub2RlLCBpbmRleCkge1xuICAgICAgICBpZiAoIXRoaXMuY29udGFpbnMobm9kZSkpcmV0dXJuIG51bGw7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQucmVtb3ZlQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlQWxsQ2hpbGRyZW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuICAgICAgICB3aGlsZSAoZWxlbWVudC5oYXNDaGlsZE5vZGVzKCkpZWxlbWVudC5yZW1vdmVDaGlsZChlbGVtZW50Lmxhc3RDaGlsZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBzZXRXaWR0aDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUud2lkdGggPSB2YWx1ZSArICdweCc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZ2V0V2lkdGg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0V2lkdGg7XG4gICAgfSxcblxuICAgIHNldEhlaWdodDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gdmFsdWUgKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldEhlaWdodDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRIZWlnaHQ7XG4gICAgfSxcblxuICAgIHNldFBvc2l0aW9uOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRQb3NpdGlvbih4KS5zZXRQb3NpdGlvbih5KTtcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uWDogZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5tYXJnaW5MZWZ0ID0geCArICdweCc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc2V0UG9zaXRpb25ZOiBmdW5jdGlvbiAoeSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLm1hcmdpblRvcCA9IHkgKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc2V0UG9zaXRpb25HbG9iYWw6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldFBvc2l0aW9uR2xvYmFsWCh4KS5zZXRQb3NpdGlvbkdsb2JhbFkoeSk7XG4gICAgfSxcbiAgICBzZXRQb3NpdGlvbkdsb2JhbFg6IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUubGVmdCA9IHggKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uR2xvYmFsWTogZnVuY3Rpb24gKHkpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS50b3AgPSB5ICsgJ3B4JztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGdldFBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbdGhpcy5nZXRQb3NpdGlvblgoKSwgdGhpcy5nZXRQb3NpdGlvblkoKV07XG4gICAgfSxcbiAgICBnZXRQb3NpdGlvblg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICB9LFxuICAgIGdldFBvc2l0aW9uWTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgfSxcblxuICAgIGdldFBvc2l0aW9uR2xvYmFsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSBbMCwgMF0sXG4gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcblxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICAgICAgb2Zmc2V0WzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgICAgIG9mZnNldFsxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgfSxcblxuICAgIGdldFBvc2l0aW9uR2xvYmFsWDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gMCxcbiAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuXG4gICAgICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgICAgICBvZmZzZXQgKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG9mZnNldDtcbiAgICB9LFxuXG4gICAgZ2V0UG9zaXRpb25HbG9iYWxZOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSAwLFxuICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XG5cbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIG9mZnNldCArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgfSxcblxuICAgIGFkZEV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc2V0U3R5bGVDbGFzczogZnVuY3Rpb24gKHN0eWxlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuY2xhc3NOYW1lID0gc3R5bGU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc2V0U3R5bGVQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldFN0eWxlUHJvcGVydHk6IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV07XG4gICAgfSxcbiAgICBzZXRTdHlsZVByb3BlcnRpZXM6IGZ1bmN0aW9uIChwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGZvciAodmFyIHAgaW4gcHJvcGVydGllcyl0aGlzLl9lbGVtZW50LnN0eWxlW3BdID0gcHJvcGVydGllc1twXTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGRlbGV0ZVN0eWxlQ2xhc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5jbGFzc05hbWUgPSAnJztcbiAgICAgICAgcmV0dXJuIHRoaXNcbiAgICB9LFxuICAgIGRlbGV0ZVN0eWxlUHJvcGVydHk6IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW3Byb3BlcnR5XSA9ICcnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGRlbGV0ZVN0eWxlUHJvcGVydGllczogZnVuY3Rpb24gKHByb3BlcnRpZXMpIHtcbiAgICAgICAgZm9yICh2YXIgcCBpbiBwcm9wZXJ0aWVzKXRoaXMuX2VsZW1lbnQuc3R5bGVbcF0gPSAnJztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGdldENoaWxkQXQ6IGZ1bmN0aW9uIChpbmRleCkge1xuICAgICAgICByZXR1cm4gbmV3IE5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQuY2hpbGRyZW5baW5kZXhdKTtcbiAgICB9LFxuICAgIGdldENoaWxkSW5kZXg6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleE9mKHRoaXMuX2VsZW1lbnQsIG5vZGUuZ2V0RWxlbWVudCgpKTtcbiAgICB9LFxuICAgIGdldE51bUNoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50LmNoaWxkcmVuLmxlbmd0aDtcbiAgICB9LFxuICAgIGdldEZpcnN0Q2hpbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudCh0aGlzLl9lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgIH0sXG4gICAgZ2V0TGFzdENoaWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5sYXN0Q2hpbGQpO1xuICAgIH0sXG4gICAgaGFzQ2hpbGRyZW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoICE9IDA7XG4gICAgfSxcbiAgICBjb250YWluczogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4T2YodGhpcy5fZWxlbWVudCwgbm9kZS5nZXRFbGVtZW50KCkpICE9IC0xO1xuICAgIH0sXG5cbiAgICBfaW5kZXhPZjogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQsIGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwocGFyZW50RWxlbWVudC5jaGlsZHJlbiwgZWxlbWVudCk7XG4gICAgfSxcblxuICAgIHNldFByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHksIHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnRbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc2V0UHJvcGVydGllczogZnVuY3Rpb24gKHByb3BlcnRpZXMpIHtcbiAgICAgICAgZm9yICh2YXIgcCBpbiBwcm9wZXJ0aWVzKXRoaXMuX2VsZW1lbnRbcF0gPSBwcm9wZXJ0aWVzW3BdO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldFByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnRbcHJvcGVydHldO1xuICAgIH0sXG5cblxuICAgIHNldEVsZW1lbnQ6IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldEVsZW1lbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQ7XG4gICAgfSxcblxuICAgIGdldFN0eWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50LnN0eWxlO1xuICAgIH0sXG5cbiAgICBnZXRQYXJlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudCh0aGlzLl9lbGVtZW50LnBhcmVudE5vZGUpO1xuICAgIH1cbn07XG5cbk5vZGUuZ2V0Tm9kZUJ5RWxlbWVudCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudChlbGVtZW50KTtcbn07XG5Ob2RlLmdldE5vZGVCeUlkID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb2RlO1xuXG4vL0NvbnRyb2xLaXQuTm9kZSA9IGZ1bmN0aW9uKClcbi8ve1xuLy8gICAgdGhpcy5fZWxlbWVudCA9IG51bGw7XG4vL1xuLy8gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAxKVxuLy8gICAge1xuLy8gICAgICAgIHZhciBhcmcgID0gYXJndW1lbnRzWzBdO1xuLy9cbi8vICAgICAgICBpZihhcmcgIT0gQ29udHJvbEtpdC5Ob2RlVHlwZS5JTlBVVF9URVhUICAgJiZcbi8vICAgICAgICAgICBhcmcgIT0gQ29udHJvbEtpdC5Ob2RlVHlwZS5JTlBVVF9CVVRUT04gJiZcbi8vICAgICAgICAgICBhcmcgIT0gQ29udHJvbEtpdC5Ob2RlVHlwZS5JTlBVVF9TRUxFQ1QgJiZcbi8vICAgICAgICAgICBhcmcgIT0gQ29udHJvbEtpdC5Ob2RlVHlwZS5JTlBVVF9DSEVDS0JPWClcbi8vICAgICAgICB7XG4vLyAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGFyZyk7XG4vLyAgICAgICAgfVxuLy8gICAgICAgIGVsc2Vcbi8vICAgICAgICB7XG4vLyAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuLy8gICAgICAgICAgICB0aGlzLl9lbGVtZW50LnR5cGUgPSBhcmc7XG4vLyAgICAgICAgfVxuLy8gICAgfVxuLy99O1xuLy9cbi8vQ29udHJvbEtpdC5Ob2RlLnByb3RvdHlwZSA9XG4vL3tcbi8vICAgIGFkZENoaWxkICAgOiBmdW5jdGlvbihub2RlKVxuLy8gICAge1xuLy8gICAgICAgIHRoaXMuX2VsZW1lbnQuYXBwZW5kQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xuLy8gICAgICAgIHJldHVybiBub2RlO1xuLy8gICAgfSxcbi8vXG4vLyAgICBhZGRDaGlsZHJlbiA6IGZ1bmN0aW9uKClcbi8vICAgIHtcbi8vICAgICAgICB2YXIgaSA9IC0xLGwgPSBhcmd1bWVudHMubGVuZ3RoLGUgPSB0aGlzLl9lbGVtZW50O1xuLy8gICAgICAgIHdoaWxlKCsraSA8IGwpe2UuYXBwZW5kQ2hpbGQoYXJndW1lbnRzW2ldLmdldEVsZW1lbnQoKSk7fVxuLy8gICAgICAgIHJldHVybiB0aGlzO1xuLy8gICAgfSxcbi8vXG4vLyAgICBhZGRDaGlsZEF0IDogZnVuY3Rpb24obm9kZSxpbmRleClcbi8vICAgIHtcbi8vICAgICAgICB0aGlzLl9lbGVtZW50Lmluc2VydEJlZm9yZShub2RlLmdldEVsZW1lbnQoKSx0aGlzLl9lbGVtZW50LmNoaWxkcmVuW2luZGV4XSk7XG4vLyAgICAgICAgcmV0dXJuIG5vZGU7XG4vLyAgICB9LFxuLy9cbi8vICAgIHJlbW92ZUNoaWxkIDogZnVuY3Rpb24obm9kZSlcbi8vICAgIHtcbi8vICAgICAgICBpZighdGhpcy5jb250YWlucyhub2RlKSlyZXR1cm4gbnVsbDtcbi8vICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUNoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbi8vICAgICAgICByZXR1cm4gbm9kZTtcbi8vICAgIH0sXG4vL1xuLy8gICAgcmVtb3ZlQ2hpbGRyZW4gOiBmdW5jdGlvbigpXG4vLyAgICB7XG4vLyAgICAgICAgdmFyIGkgPSAtMSwgbCA9IGFyZ3VtZW50cy5sZW5ndGgsIGUgPSB0aGlzLl9lbGVtZW50O1xuLy8gICAgICAgIHdoaWxlKCsraTxsKXtlLnJlbW92ZUNoaWxkKGFyZ3VtZW50c1tpXS5nZXRFbGVtZW50KCkpO31cbi8vICAgICAgICByZXR1cm4gdGhpcztcbi8vICAgIH0sXG4vL1xuLy8gICAgcmVtb3ZlQ2hpbGRBdCA6IGZ1bmN0aW9uKG5vZGUsaW5kZXgpXG4vLyAgICB7XG4vLyAgICAgICAgaWYoIXRoaXMuY29udGFpbnMobm9kZSkpcmV0dXJuIG51bGw7XG4vLyAgICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVDaGlsZChub2RlLmdldEVsZW1lbnQoKSk7XG4vLyAgICAgICAgcmV0dXJuIG5vZGU7XG4vLyAgICB9LFxuLy9cbi8vICAgIHJlbW92ZUFsbENoaWxkcmVuIDogZnVuY3Rpb24oKVxuLy8gICAge1xuLy8gICAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcbi8vICAgICAgICB3aGlsZShlbGVtZW50Lmhhc0NoaWxkTm9kZXMoKSllbGVtZW50LnJlbW92ZUNoaWxkKGVsZW1lbnQubGFzdENoaWxkKTtcbi8vICAgICAgICByZXR1cm4gdGhpcztcbi8vICAgIH0sXG4vL1xuLy8gICAgc2V0V2lkdGggIDogZnVuY3Rpb24odmFsdWUpe3RoaXMuX2VsZW1lbnQuc3R5bGUud2lkdGggPSB2YWx1ZSArICdweCc7IHJldHVybiB0aGlzO30sXG4vLyAgICBnZXRXaWR0aCAgOiBmdW5jdGlvbigpICAgICB7cmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0V2lkdGg7fSxcbi8vXG4vLyAgICBzZXRIZWlnaHQgOiBmdW5jdGlvbih2YWx1ZSl7dGhpcy5fZWxlbWVudC5zdHlsZS5oZWlnaHQgPSB2YWx1ZSArICdweCc7IHJldHVybiB0aGlzO30sXG4vLyAgICBnZXRIZWlnaHQgOiBmdW5jdGlvbigpICAgICB7cmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0SGVpZ2h0O30sXG4vL1xuLy8gICAgc2V0UG9zaXRpb24gIDogZnVuY3Rpb24oeCx5KXsgcmV0dXJuIHRoaXMuc2V0UG9zaXRpb24oeCkuc2V0UG9zaXRpb24oeSk7fSxcbi8vICAgIHNldFBvc2l0aW9uWCA6IGZ1bmN0aW9uKHgpICB7dGhpcy5fZWxlbWVudC5zdHlsZS5tYXJnaW5MZWZ0ID0geCArICdweCc7cmV0dXJuIHRoaXM7fSxcbi8vICAgIHNldFBvc2l0aW9uWSA6IGZ1bmN0aW9uKHkpICB7dGhpcy5fZWxlbWVudC5zdHlsZS5tYXJnaW5Ub3AgID0geSArICdweCc7cmV0dXJuIHRoaXM7fSxcbi8vXG4vLyAgICBzZXRQb3NpdGlvbkdsb2JhbCAgOiBmdW5jdGlvbih4LHkpe3JldHVybiB0aGlzLnNldFBvc2l0aW9uR2xvYmFsWCh4KS5zZXRQb3NpdGlvbkdsb2JhbFkoeSk7fSxcbi8vICAgIHNldFBvc2l0aW9uR2xvYmFsWCA6IGZ1bmN0aW9uKHgpICB7dGhpcy5fZWxlbWVudC5zdHlsZS5sZWZ0ID0geCArICdweCc7cmV0dXJuIHRoaXM7fSxcbi8vICAgIHNldFBvc2l0aW9uR2xvYmFsWSA6IGZ1bmN0aW9uKHkpICB7dGhpcy5fZWxlbWVudC5zdHlsZS50b3AgID0geSArICdweCc7cmV0dXJuIHRoaXM7fSxcbi8vXG4vLyAgICBnZXRQb3NpdGlvbiAgOiBmdW5jdGlvbigpe3JldHVybiBbdGhpcy5nZXRQb3NpdGlvblgoKSx0aGlzLmdldFBvc2l0aW9uWSgpXTt9LFxuLy8gICAgZ2V0UG9zaXRpb25YIDogZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRMZWZ0O30sXG4vLyAgICBnZXRQb3NpdGlvblkgOiBmdW5jdGlvbigpe3JldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldFRvcDt9LFxuLy9cbi8vICAgIGdldFBvc2l0aW9uR2xvYmFsIDogZnVuY3Rpb24oKVxuLy8gICAge1xuLy8gICAgICAgIHZhciBvZmZzZXQgID0gWzAsMF0sXG4vLyAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuLy9cbi8vICAgICAgICB3aGlsZShlbGVtZW50KVxuLy8gICAgICAgIHtcbi8vICAgICAgICAgICAgb2Zmc2V0WzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbi8vICAgICAgICAgICAgb2Zmc2V0WzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuLy8gICAgICAgICAgICBlbGVtZW50ICAgID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4vLyAgICAgICAgfVxuLy9cbi8vICAgICAgICByZXR1cm4gb2Zmc2V0O1xuLy8gICAgfSxcbi8vXG4vLyAgICBnZXRQb3NpdGlvbkdsb2JhbFggOiBmdW5jdGlvbigpXG4vLyAgICB7XG4vLyAgICAgICAgdmFyIG9mZnNldCAgPSAwLFxuLy8gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcbi8vXG4vLyAgICAgICAgd2hpbGUoZWxlbWVudClcbi8vICAgICAgICB7XG4vLyAgICAgICAgICAgIG9mZnNldCArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4vLyAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbi8vICAgICAgICB9XG4vL1xuLy8gICAgICAgIHJldHVybiBvZmZzZXQ7XG4vLyAgICB9LFxuLy9cbi8vICAgIGdldFBvc2l0aW9uR2xvYmFsWSA6IGZ1bmN0aW9uKClcbi8vICAgIHtcbi8vICAgICAgICB2YXIgb2Zmc2V0ICA9IDAsXG4vLyAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuLy9cbi8vICAgICAgICB3aGlsZShlbGVtZW50KVxuLy8gICAgICAgIHtcbi8vICAgICAgICAgICAgb2Zmc2V0ICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuLy8gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4vLyAgICAgICAgfVxuLy9cbi8vICAgICAgICByZXR1cm4gb2Zmc2V0O1xuLy8gICAgfSxcbi8vXG4vLyAgICBhZGRFdmVudExpc3RlbmVyICAgIDogZnVuY3Rpb24odHlwZSxsaXN0ZW5lcix1c2VDYXB0dXJlKXt0aGlzLl9lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoICAgdHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpOyByZXR1cm4gdGhpczt9LFxuLy8gICAgcmVtb3ZlRXZlbnRMaXN0ZW5lciA6IGZ1bmN0aW9uKHR5cGUsbGlzdGVuZXIsdXNlQ2FwdHVyZSl7dGhpcy5fZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTtyZXR1cm4gdGhpczt9LFxuLy9cbi8vICAgIHNldFN0eWxlQ2xhc3MgICAgICA6IGZ1bmN0aW9uKHN0eWxlKSAgICAgICAgIHt0aGlzLl9lbGVtZW50LmNsYXNzTmFtZSA9IHN0eWxlOyByZXR1cm4gdGhpczt9LFxuLy8gICAgc2V0U3R5bGVQcm9wZXJ0eSAgIDogZnVuY3Rpb24ocHJvcGVydHksdmFsdWUpe3RoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldID0gdmFsdWU7IHJldHVybiB0aGlzO30sXG4vLyAgICBnZXRTdHlsZVByb3BlcnR5ICAgOiBmdW5jdGlvbihwcm9wZXJ0eSkgICAgICB7cmV0dXJuIHRoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldO30sXG4vLyAgICBzZXRTdHlsZVByb3BlcnRpZXMgOiBmdW5jdGlvbihwcm9wZXJ0aWVzKSAgICB7Zm9yKHZhciBwIGluIHByb3BlcnRpZXMpdGhpcy5fZWxlbWVudC5zdHlsZVtwXSA9IHByb3BlcnRpZXNbcF07cmV0dXJuIHRoaXM7fSxcbi8vXG4vLyAgICBkZWxldGVTdHlsZUNsYXNzICAgICAgOiBmdW5jdGlvbigpICAgICAgICAgICB7dGhpcy5fZWxlbWVudC5jbGFzc05hbWUgPSAnJztyZXR1cm4gdGhpc30sXG4vLyAgICBkZWxldGVTdHlsZVByb3BlcnR5ICAgOiBmdW5jdGlvbihwcm9wZXJ0eSkgICB7dGhpcy5fZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV0gPSAnJztyZXR1cm4gdGhpczt9LFxuLy8gICAgZGVsZXRlU3R5bGVQcm9wZXJ0aWVzIDogZnVuY3Rpb24ocHJvcGVydGllcykge2Zvcih2YXIgcCBpbiBwcm9wZXJ0aWVzKXRoaXMuX2VsZW1lbnQuc3R5bGVbcF0gPSAnJztyZXR1cm4gdGhpczt9LFxuLy9cbi8vICAgIGdldENoaWxkQXQgICAgIDogZnVuY3Rpb24oaW5kZXgpIHtyZXR1cm4gbmV3IENvbnRyb2xLaXQuTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5jaGlsZHJlbltpbmRleF0pO30sXG4vLyAgICBnZXRDaGlsZEluZGV4ICA6IGZ1bmN0aW9uKG5vZGUpICB7cmV0dXJuIHRoaXMuX2luZGV4T2YodGhpcy5fZWxlbWVudCxub2RlLmdldEVsZW1lbnQoKSk7fSxcbi8vICAgIGdldE51bUNoaWxkcmVuIDogZnVuY3Rpb24oKSAgICAgIHtyZXR1cm4gdGhpcy5fZWxlbWVudC5jaGlsZHJlbi5sZW5ndGg7fSxcbi8vICAgIGdldEZpcnN0Q2hpbGQgIDogZnVuY3Rpb24oKSAgICAgIHtyZXR1cm4gbmV3IENvbnRyb2xLaXQuTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5maXJzdENoaWxkKTt9LFxuLy8gICAgZ2V0TGFzdENoaWxkICAgOiBmdW5jdGlvbigpICAgICAge3JldHVybiBuZXcgQ29udHJvbEtpdC5Ob2RlKCkuc2V0RWxlbWVudCh0aGlzLl9lbGVtZW50Lmxhc3RDaGlsZCk7fSxcbi8vICAgIGhhc0NoaWxkcmVuICAgIDogZnVuY3Rpb24oKSAgICAgIHtyZXR1cm4gdGhpcy5fZWxlbWVudC5jaGlsZHJlbi5sZW5ndGggIT0gMDt9LFxuLy8gICAgY29udGFpbnMgICAgICAgOiBmdW5jdGlvbihub2RlKSAge3JldHVybiB0aGlzLl9pbmRleE9mKHRoaXMuX2VsZW1lbnQsbm9kZS5nZXRFbGVtZW50KCkpICE9IC0xO30sXG4vL1xuLy8gICAgX2luZGV4T2YgICAgICAgOiBmdW5jdGlvbihwYXJlbnRFbGVtZW50LGVsZW1lbnQpe3JldHVybiBBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHBhcmVudEVsZW1lbnQuY2hpbGRyZW4sZWxlbWVudCk7fSxcbi8vXG4vLyAgICBzZXRQcm9wZXJ0eSAgIDogZnVuY3Rpb24ocHJvcGVydHksIHZhbHVlKXt0aGlzLl9lbGVtZW50W3Byb3BlcnR5XSA9IHZhbHVlO3JldHVybiB0aGlzO30sXG4vLyAgICBzZXRQcm9wZXJ0aWVzIDogZnVuY3Rpb24ocHJvcGVydGllcykgICAgIHtmb3IodmFyIHAgaW4gcHJvcGVydGllcyl0aGlzLl9lbGVtZW50W3BdID0gcHJvcGVydGllc1twXTtyZXR1cm4gdGhpczt9LFxuLy8gICAgZ2V0UHJvcGVydHkgICA6IGZ1bmN0aW9uKHByb3BlcnR5KSAgICAgICB7cmV0dXJuIHRoaXMuX2VsZW1lbnRbcHJvcGVydHldO30sXG4vL1xuLy9cbi8vICAgIHNldEVsZW1lbnQgOiBmdW5jdGlvbihlbGVtZW50KXt0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtyZXR1cm4gdGhpczt9LFxuLy8gICAgZ2V0RWxlbWVudCA6IGZ1bmN0aW9uKCkgICAgICAgeyByZXR1cm4gdGhpcy5fZWxlbWVudDt9LFxuLy9cbi8vICAgIGdldFN0eWxlICAgOiBmdW5jdGlvbigpICAgICAgIHtyZXR1cm4gdGhpcy5fZWxlbWVudC5zdHlsZTt9LFxuLy9cbi8vICAgIGdldFBhcmVudCAgOiBmdW5jdGlvbigpeyByZXR1cm4gbmV3IENvbnRyb2xLaXQuTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5wYXJlbnROb2RlKTsgfVxuLy99O1xuLy9cbi8vQ29udHJvbEtpdC5Ob2RlLmdldE5vZGVCeUVsZW1lbnQgPSBmdW5jdGlvbihlbGVtZW50KXtyZXR1cm4gbmV3IENvbnRyb2xLaXQuTm9kZSgpLnNldEVsZW1lbnQoZWxlbWVudCk7fTtcbi8vQ29udHJvbEtpdC5Ob2RlLmdldE5vZGVCeUlkICAgICAgPSBmdW5jdGlvbihpZCkgICAgIHtyZXR1cm4gbmV3IENvbnRyb2xLaXQuTm9kZSgpLnNldEVsZW1lbnQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpKTt9O1xuLy9cbiIsInZhciBOb2RlRXZlbnQgPSB7XG4gICAgTU9VU0VfRE9XTiAgIDogJ21vdXNlZG93bicsXG4gICAgTU9VU0VfVVAgICAgIDogJ21vdXNldXAnLFxuICAgIE1PVVNFX09WRVIgICA6ICdtb3VzZW92ZXInLFxuICAgIE1PVVNFX01PVkUgICA6ICdtb3VzZW1vdmUnLFxuICAgIE1PVVNFX09VVCAgICA6ICdtb3VzZW91dCcsXG4gICAgS0VZX0RPV04gICAgIDogJ2tleWRvd24nLFxuICAgIEtFWV9VUCAgICAgICA6ICdrZXl1cCcsXG4gICAgQ0hBTkdFICAgICAgIDogJ2NoYW5nZScsXG4gICAgRklOSVNIICAgICAgIDogJ2ZpbmlzaCcsXG4gICAgREJMX0NMSUNLICAgIDogJ2RibGNsaWNrJyxcbiAgICBPTl9DTElDSyAgICAgOiAnY2xpY2snLFxuICAgIFNFTEVDVF9TVEFSVCA6ICdzZWxlY3RzdGFydCcsXG4gICAgRFJBR19TVEFSVCAgIDogJ2RyYWdzdGFydCcsXG4gICAgRFJBRyAgICAgICAgIDogJ2RyYWcnLFxuICAgIERSQUdfRU5EICAgICA6ICdkcmFnZW5kJyxcblxuICAgIERSQUdfRU5URVIgICA6ICdkcmFnZW50ZXInLFxuICAgIERSQUdfT1ZFUiAgICA6ICdkcmFnb3ZlcicsXG4gICAgRFJBR19MRUFWRSAgIDogJ2RyYWdsZWF2ZScsXG5cbiAgICBSRVNJWkUgICAgICAgOiAncmVzaXplJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb2RlRXZlbnQ7IiwidmFyIFN0eWxlID0geyBcblx0c3RyaW5nIDogXCIvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKiBQYW5lbCAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICogQ29tcG9uZW50cyAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICogQ2FudmFzICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi8vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKiBTY3JvbGxCYXIgKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qLy8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqIEdyb3VwICYgc3ViR3JvdXAgKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qLy8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqIE1lbnUgKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qLy8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqIE9wdGlvbnMgKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qLy8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqIFBpY2tlciAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovYm9keSB7ICBtYXJnaW46IDA7ICBwYWRkaW5nOiAwOyB9I2NvbnRyb2xLaXQgeyAgcG9zaXRpb246IGFic29sdXRlOyAgdG9wOiAwOyAgbGVmdDogMDsgIHdpZHRoOiAxMDAlOyAgaGVpZ2h0OiAxMDAlOyAgLXdlYmtpdC11c2VyLXNlbGVjdDogbm9uZTsgIHVzZXItc2VsZWN0OiBub25lOyAgcG9pbnRlci1ldmVudHM6IG5vbmU7IH0gICNjb250cm9sS2l0ICogeyAgICBvdXRsaW5lOiAwOyB9ICAjY29udHJvbEtpdCAucGFuZWwgaW5wdXRbdHlwZT0ndGV4dCddLCAgI2NvbnRyb2xLaXQgLnBhbmVsIHRleHRhcmVhLCAgI2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvciwgICNjb250cm9sS2l0IC5waWNrZXIgaW5wdXRbdHlwZT0ndGV4dCddIHsgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGhlaWdodDogMjVweDsgICAgd2lkdGg6IDEwMCU7ICAgIHBhZGRpbmc6IDAgMCAwIDhweDsgICAgZm9udC1mYW1pbHk6IGFyaWFsLCBzYW5zLXNlcmlmOyAgICBmb250LXNpemU6IDExcHg7ICAgIGNvbG9yOiB3aGl0ZTsgICAgdGV4dC1zaGFkb3c6IDFweCAxcHggYmxhY2s7ICAgIGJhY2tncm91bmQ6ICMyMjI3Mjk7ICAgIGJhY2tncm91bmQtaW1hZ2U6IC1vLWxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwJSwgcmdiYSgwLCAwLCAwLCAwLjEyNSkgMTAwJSk7ICAgIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwJSwgcmdiYSgwLCAwLCAwLCAwLjEyNSkgMTAwJSk7ICAgIGJvcmRlcjogbm9uZTsgICAgYm94LXNoYWRvdzogMCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjAxMjUpIGluc2V0LCAwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0OyAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgICAgLXdlYmtpdC11c2VyLXNlbGVjdDogbm9uZTsgICAgLWtodG1sLXVzZXItc2VsZWN0OiBub25lOyAgICAtbW96LXVzZXItc2VsZWN0OiBub25lOyAgICAtby11c2VyLXNlbGVjdDogbm9uZTsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvciB7ICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICB3aWR0aDogMTAwJTsgICAgaGVpZ2h0OiAyNXB4OyAgICBsaW5lLWhlaWdodDogMjVweDsgICAgYmFja2dyb3VuZDogI2ZmZjsgICAgdGV4dC1hbGlnbjogY2VudGVyOyAgICBwYWRkaW5nOiAwOyAgICAtd2Via2l0LXRvdWNoLWNhbGxvdXQ6IG5vbmU7ICAgIC13ZWJraXQtdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1raHRtbC11c2VyLXNlbGVjdDogbm9uZTsgICAgLW1vei11c2VyLXNlbGVjdDogbm9uZTsgICAgLW1zLXVzZXItc2VsZWN0OiBub25lOyAgICB1c2VyLXNlbGVjdDogbm9uZTsgICAgY3Vyc29yOiBwb2ludGVyOyAgICBib3JkZXI6IG5vbmU7ICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCAjMTExMzE0IGluc2V0OyAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b24sICAjY29udHJvbEtpdCAucGlja2VyIC5idXR0b24sICAjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdCwgICNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0QWN0aXZlIHsgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIHdpZHRoOiAxMDAlOyAgICBoZWlnaHQ6IDI2cHg7ICAgIG1hcmdpbjogLTJweCAwIDAgMDsgICAgY3Vyc29yOiBwb2ludGVyOyAgICBiYWNrZ3JvdW5kOiAjM2M0OTRlOyAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQocmdiYSgzNCwgMzksIDQxLCAwKSAwJSwgcmdiYSgzNCwgMzksIDQxLCAwLjY1KSAxMDAlKTsgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KHJnYmEoMzQsIDM5LCA0MSwgMCkgMCUsIHJnYmEoMzQsIDM5LCA0MSwgMC42NSkgMTAwJSk7ICAgIGZvbnQtZmFtaWx5OiBhcmlhbCwgc2Fucy1zZXJpZjsgICAgY29sb3I6IHdoaXRlOyAgICBib3JkZXI6IG5vbmU7ICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCAjMTMxMzEzIGluc2V0LCAtMXB4IDJweCAwIDAgIzMyM2E0NCBpbnNldDsgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzYjQ0NDc7ICAgIG91dGxpbmU6IDA7IH0gICNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLCAjY29udHJvbEtpdCAucGlja2VyIC5idXR0b24geyAgICBmb250LXNpemU6IDEwcHg7ICAgIGZvbnQtd2VpZ2h0OiBib2xkOyAgICB0ZXh0LXNoYWRvdzogMCAtMXB4IGJsYWNrOyAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uOmhvdmVyLCAjY29udHJvbEtpdCAucGlja2VyIC5idXR0b246aG92ZXIgeyAgICAgIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5idXR0b246YWN0aXZlLCAjY29udHJvbEtpdCAucGlja2VyIC5idXR0b246YWN0aXZlIHsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQocmdiYSgwLCAwLCAwLCAwLjEpIDAlLCB0cmFuc3BhcmVudCAxMDAlKTsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQocmdiYSgwLCAwLCAwLCAwLjEpIDAlLCB0cmFuc3BhcmVudCAxMDAlKTsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIHsgICAgcG9pbnRlci1ldmVudHM6IGF1dG87ICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsgICAgei1pbmRleDogMTsgICAgbWFyZ2luOiAwOyAgICBwYWRkaW5nOiAwOyAgICB3aWR0aDogMzAwcHg7ICAgIGJhY2tncm91bmQtY29sb3I6ICMzMDM2Mzk7ICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4yNSk7ICAgIGZvbnQtZmFtaWx5OiBhcmlhbCwgc2Fucy1zZXJpZjsgICAgLXdlYmtpdC10b3VjaC1jYWxsb3V0OiBub25lOyAgICAtd2Via2l0LXVzZXItc2VsZWN0OiBub25lOyAgICAta2h0bWwtdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1tb3otdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1tcy11c2VyLXNlbGVjdDogbm9uZTsgICAgdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICBvdmVyZmxvdzogaGlkZGVuOyAgICBvcGFjaXR5OiAxLjA7ICAgIGZsb2F0OiBsZWZ0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCB0ZXh0YXJlYSB7ICAgICAgcGFkZGluZzogNXB4IDhweCAycHggOHB4OyAgICAgIG92ZXJmbG93OiBoaWRkZW47ICAgICAgcmVzaXplOiBub25lOyAgICAgIHZlcnRpY2FsLWFsaWduOiB0b3A7ICAgICAgd2hpdGUtc3BhY2U6IG5vd3JhcDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgaW5wdXRbdHlwZT0nY2hlY2tib3gnXSB7ICAgICAgbWFyZ2luOiA1cHggMCAwIDA7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QsICNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0QWN0aXZlIHsgICAgICBwYWRkaW5nLWxlZnQ6IDEwcHg7ICAgICAgcGFkZGluZy1yaWdodDogMjBweDsgICAgICBmb250LXNpemU6IDExcHg7ICAgICAgdGV4dC1hbGlnbjogbGVmdDsgICAgICB0ZXh0LXNoYWRvdzogMXB4IDFweCBibGFjazsgICAgICBjdXJzb3I6IHBvaW50ZXI7ICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsgICAgICB3aGl0ZS1zcGFjZTogbm93cmFwOyAgICAgIHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0IHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCQUFBQUFMQ0FZQUFBQjI0ZzA1QUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQU1OSlJFRlVlTnFja2pFS3dqQVVoajhsNTNBUTUyNkJIS0tMSWhTbEhrSHhCa2t1SUZXUElMUU9RUWQzVjRWdVhpZ3VGbHJGUlB6aExYbDgzM3VCMTB1em5DYVArcTRCRXFsczgzWTVIZ2hGdE9IMWFta0FpdDIrSXdrbXpYSUd3NUhlRkZ2ZlpGTnMvV0E0MG1tVzQ3MFAxZ2Y4TG9rSlJDSVYxMXZOOWJiNDJDNlJLdm9EQWRoWC9SWHhxTzhHMEYvNkZqQkJRU0lWOCttRTJYVGNhVlR1VE9sTzBRMzZnQ25keVZidS9BNUhwN2Z2d0x5bWFlQm51SE5JTFFtL3dnRFBBUUFQTklzSG5PNzk0UUFBQUFCSlJVNUVya0pnZ2c9PSkgMTAwJSA1MCUgbm8tcmVwZWF0LCAtby1saW5lYXItZ3JhZGllbnQoIzNhNDY0YiAwJSwgcmdiYSg0NCwgNTIsIDU1LCAwKSAxMDAlKTsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCQUFBQUFMQ0FZQUFBQjI0ZzA1QUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQU1OSlJFRlVlTnFja2pFS3dqQVVoajhsNTNBUTUyNkJIS0tMSWhTbEhrSHhCa2t1SUZXUElMUU9RUWQzVjRWdVhpZ3VGbHJGUlB6aExYbDgzM3VCMTB1em5DYVArcTRCRXFsczgzWTVIZ2hGdE9IMWFta0FpdDIrSXdrbXpYSUd3NUhlRkZ2ZlpGTnMvV0E0MG1tVzQ3MFAxZ2Y4TG9rSlJDSVYxMXZOOWJiNDJDNlJLdm9EQWRoWC9SWHhxTzhHMEYvNkZqQkJRU0lWOCttRTJYVGNhVlR1VE9sTzBRMzZnQ25keVZidS9BNUhwN2Z2d0x5bWFlQm51SE5JTFFtL3dnRFBBUUFQTklzSG5PNzk0UUFBQUFCSlJVNUVya0pnZ2c9PSkgMTAwJSA1MCUgbm8tcmVwZWF0LCBsaW5lYXItZ3JhZGllbnQoIzNhNDY0YiAwJSwgcmdiYSg0NCwgNTIsIDU1LCAwKSAxMDAlKTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdDpob3ZlciwgI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3RBY3RpdmUgeyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUJBQUFBQUxDQVlBQUFCMjRnMDVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBTU5KUkVGVWVOcWNrakVLd2pBVWhqOGw1M0FRNTI2QkhLS0xJaFNsSGtIeEJra3VJRldQSUxRT1FRZDNWNFZ1WGlndUZsckZSUHpoTFhsODMzdUIxMHV6bkNhUCtxNEJFcWxzODNZNUhnaEZ0T0gxYW1rQWl0MitJd2ttelhJR3c1SGVGRnZmWkZOcy9XQTQwbW1XNDcwUDFnZjhMb2tKUkNJVjExdk45YmI0MkM2Ukt2b0RBZGhYL1JYeHFPOEcwRi82RmpCQlFTSVY4K21FMlhUY2FWVHVUT2xPMFEzNmdDbmR5VmJ1L0E1SHA3ZnZ3THltYWVCbnVITklMUW0vd2dEUEFRQVBOSXNIbk83OTRRQUFBQUJKUlU1RXJrSmdnZz09KSAxMDAlIDUwJSBuby1yZXBlYXQsICMzYzQ5NGU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5wcmVzZXRCdG4sICNjb250cm9sS2l0IC5wYW5lbCAucHJlc2V0QnRuQWN0aXZlIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgcG9zaXRpb246IGFic29sdXRlOyAgICAgIHJpZ2h0OiAwOyAgICAgIHdpZHRoOiAyMHB4OyAgICAgIGhlaWdodDogMjVweDsgICAgICBtYXJnaW46IDAgMCAwIDA7ICAgICAgY3Vyc29yOiBwb2ludGVyOyAgICAgIGZsb2F0OiByaWdodDsgICAgICBib3JkZXI6IG5vbmU7ICAgICAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDJweDsgICAgICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogMnB4OyAgICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCAjMTMxMzEzIGluc2V0LCAtMXB4IDJweCAwIDAgIzMyM2E0NCBpbnNldDsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnByZXNldEJ0bkFjdGl2ZSwgI2NvbnRyb2xLaXQgLnBhbmVsIC5wcmVzZXRCdG46aG92ZXIgeyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRzVKUkVGVWVOcGk1T0RpYW1SZ1lLaGp3QTRhbVZ4OGd4am1MMXJDOFAzclZ4UThiK0VTQmhmZklBWm1OUjI5QTVldlhXZGlaR0MwMTlYU1pHQmdZR0JZdm1ZOXc3STE2eG9aR0JnYVdLQkcxUzlicys0L0F3TkRQUU1EQTF5U2dZR0JnZEVuUEFiWnpnWTBtZ0V3QUU5bEpUMWxyc2ZmQUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsICMzYzQ5NGU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5wcmVzZXRCdG4geyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRzVKUkVGVWVOcGk1T0RpYW1SZ1lLaGp3QTRhbVZ4OGd4am1MMXJDOFAzclZ4UThiK0VTQmhmZklBWm1OUjI5QTVldlhXZGlaR0MwMTlYU1pHQmdZR0JZdm1ZOXc3STE2eG9aR0JnYVdLQkcxUzlicys0L0F3TkRQUU1EQTF5U2dZR0JnZEVuUEFiWnpnWTBtZ0V3QUU5bEpUMWxyc2ZmQUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsIC1vLWxpbmVhci1ncmFkaWVudCgjM2E0NjRiIDAlLCAjMmMzNDM3IDEwMCUpOyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRzVKUkVGVWVOcGk1T0RpYW1SZ1lLaGp3QTRhbVZ4OGd4am1MMXJDOFAzclZ4UThiK0VTQmhmZklBWm1OUjI5QTVldlhXZGlaR0MwMTlYU1pHQmdZR0JZdm1ZOXc3STE2eG9aR0JnYVdLQkcxUzlicys0L0F3TkRQUU1EQTF5U2dZR0JnZEVuUEFiWnpnWTBtZ0V3QUU5bEpUMWxyc2ZmQUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsIGxpbmVhci1ncmFkaWVudCgjM2E0NjRiIDAlLCAjMmMzNDM3IDEwMCUpOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQmFyIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGNvbnRlbnQtYm94OyAgICAgIC1tb3otYm94LXNpemluZzogY29udGVudC1ib3g7ICAgICAgYm94LXNpemluZzogY29udGVudC1ib3g7ICAgICAgd2lkdGg6IDE3cHg7ICAgICAgaGVpZ2h0OiAxMDAlOyAgICAgIGZsb2F0OiByaWdodDsgICAgICB0b3A6IDA7ICAgICAgcGFkZGluZzogMDsgICAgICBtYXJnaW46IDA7ICAgICAgcG9zaXRpb246IHJlbGF0aXZlOyAgICAgIGJhY2tncm91bmQ6ICMyMTI2Mjg7ICAgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KHRvIHJpZ2h0LCAjMTUxODFhIDAlLCByZ2JhKDI2LCAyOSwgMzEsIDApIDEwMCUpOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zY3JvbGxCYXIgLnRyYWNrIHsgICAgICAgIHBhZGRpbmc6IDAgM3B4IDAgMnB4OyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbEJhciAudHJhY2sgLnRodW1iIHsgICAgICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIHdpZHRoOiAxM3B4OyAgICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7ICAgICAgICAgIGN1cnNvcjogcG9pbnRlcjsgICAgICAgICAgYmFja2dyb3VuZDogIzNiNDg0ZTsgICAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogLW8tbGluZWFyLWdyYWRpZW50KCMzYTQxNDUgMCUsICMzNjNjNDAgMTAwJSk7ICAgICAgICAgIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCgjM2E0MTQ1IDAlLCAjMzYzYzQwIDEwMCUpOyAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCAjMTUxODFhOyAgICAgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgICAgICBib3gtc2hhZG93OiBpbnNldCAwIDFweCAwIDAgIzQzNGI1MDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLndyYXAgeyAgICAgIHdpZHRoOiBhdXRvOyAgICAgIGhlaWdodDogYXV0bzsgICAgICBtYXJnaW46IDA7ICAgICAgcGFkZGluZzogMDsgICAgICBwb3NpdGlvbjogcmVsYXRpdmU7ICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmlucHV0V1ByZXNldFdyYXAsICNjb250cm9sS2l0IC5wYW5lbCAuY29sb3JXUHJlc2V0V3JhcCB7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgZmxvYXQ6IGxlZnQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5pbnB1dFdQcmVzZXRXcmFwIGlucHV0W3R5cGU9J3RleHQnXSwgI2NvbnRyb2xLaXQgLnBhbmVsIC5jb2xvcldQcmVzZXRXcmFwIC5jb2xvciB7ICAgICAgcGFkZGluZy1yaWdodDogMjVweDsgICAgICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMnB4OyAgICAgIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAycHg7ICAgICAgZmxvYXQ6IGxlZnQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC50ZXh0QXJlYVdyYXAgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICB3aWR0aDogMTAwJTsgICAgICBwYWRkaW5nOiAwOyAgICAgIGZsb2F0OiBsZWZ0OyAgICAgIGhlaWdodDogMTAwJTsgICAgICBvdmVyZmxvdzogaGlkZGVuOyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICBib3JkZXI6IG5vbmU7ICAgICAgYm94LXNoYWRvdzogMCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjAxMjUpIGluc2V0LCAwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0OyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMjIyNzI5OyAgICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4wMTI1KSBpbnNldCwgMCAwIDFweCAxcHggIzExMTMxNCBpbnNldDsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCUsIHJnYmEoMCwgMCwgMCwgMC4xMjUpIDEwMCUpOyAgICAgIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwJSwgcmdiYSgwLCAwLCAwLCAwLjEyNSkgMTAwJSk7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLnRleHRBcmVhV3JhcCB0ZXh0YXJlYSB7ICAgICAgICBib3JkZXI6IG5vbmU7ICAgICAgICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMDsgICAgICAgIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAwOyAgICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgICBib3gtc2hhZG93OiBub25lOyAgICAgICAgYmFja2dyb3VuZDogbm9uZTsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAudGV4dEFyZWFXcmFwIC5zY3JvbGxCYXIgeyAgICAgICAgYm9yZGVyOiAxcHggc29saWQgIzEwMTIxMzsgICAgICAgIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAycHg7ICAgICAgICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMnB4OyAgICAgICAgYm9yZGVyLWxlZnQ6IG5vbmU7ICAgICAgICBib3gtc2hhZG93OiAwIDAgMXB4IDJweCByZ2JhKDAsIDAsIDAsIDAuMDEyNSkgaW5zZXQsIDAgMCAxcHggMXB4ICMxMTEzMTQgaW5zZXQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlclhXcmFwLCAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWVdyYXAgeyAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlclhXcmFwIHsgICAgICBib3R0b206IDA7ICAgICAgbGVmdDogMDsgICAgICB3aWR0aDogMTAwJTsgICAgICBwYWRkaW5nOiA2cHggMjBweCA2cHggNnB4OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJZV3JhcCB7ICAgICAgdG9wOiAwOyAgICAgIHJpZ2h0OiAwOyAgICAgIGhlaWdodDogMTAwJTsgICAgICBwYWRkaW5nOiA2cHggNnB4IDIwcHggNnB4OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJYLCAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWSB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICBiYWNrZ3JvdW5kOiByZ2JhKDI0LCAyNywgMjksIDAuNSk7ICAgICAgYm9yZGVyOiAxcHggc29saWQgIzE4MWIxZDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWCB7ICAgICAgaGVpZ2h0OiA4cHg7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlclkgeyAgICAgIHdpZHRoOiA4cHg7ICAgICAgaGVpZ2h0OiAxMDAlOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJYSGFuZGxlLCAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWUhhbmRsZSB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGN1cnNvcjogcG9pbnRlcjsgICAgICBib3JkZXI6IDFweCBzb2xpZCAjMTgxYjFkOyAgICAgIGJhY2tncm91bmQ6ICMzMDM2Mzk7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlclhIYW5kbGUgeyAgICAgIHdpZHRoOiAyMHB4OyAgICAgIGhlaWdodDogMTAwJTsgICAgICBib3JkZXItdG9wOiBub25lOyAgICAgIGJvcmRlci1ib3R0b206IG5vbmU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlcllIYW5kbGUgeyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIGhlaWdodDogMjBweDsgICAgICBib3JkZXItbGVmdDogbm9uZTsgICAgICBib3JkZXItcmlnaHQ6IG5vbmU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zY3JvbGxXcmFwIHsgICAgICBwb3NpdGlvbjogcmVsYXRpdmU7ICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbEJ1ZmZlciB7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgaGVpZ2h0OiA4cHg7ICAgICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICMzYjQ0NDc7ICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMxZTIyMjQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIGNhbnZhcyB7ICAgICAgY3Vyc29yOiBwb2ludGVyOyAgICAgIHZlcnRpY2FsLWFsaWduOiBib3R0b207ICAgICAgYm9yZGVyOiBub25lOyAgICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4wMTI1KSBpbnNldCwgMCAwIDFweCAxcHggIzExMTMxNCBpbnNldDsgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzYjQ0NDc7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zdmdXcmFwLCAjY29udHJvbEtpdCAucGFuZWwgLmNhbnZhc1dyYXAgeyAgICAgIG1hcmdpbjogNnB4IDAgMCAwOyAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsgICAgICB3aWR0aDogNzAlOyAgICAgIGZsb2F0OiByaWdodDsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm9yZGVyOiBub25lOyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICBiYWNrZ3JvdW5kOiAjMWUyMjI0OyAgICAgIGJhY2tncm91bmQtaW1hZ2U6IC1vLWxpbmVhci1ncmFkaWVudCh0cmFuc3BhcmVudCAwJSwgcmdiYSgwLCAwLCAwLCAwLjA1KSAxMDAlKTsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCUsIHJnYmEoMCwgMCwgMCwgMC4wNSkgMTAwJSk7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLnN2Z1dyYXAgc3ZnLCAjY29udHJvbEtpdCAucGFuZWwgLmNhbnZhc1dyYXAgc3ZnIHsgICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgICAgICAgIGxlZnQ6IDA7ICAgICAgICB0b3A6IDA7ICAgICAgICBjdXJzb3I6IHBvaW50ZXI7ICAgICAgICB2ZXJ0aWNhbC1hbGlnbjogYm90dG9tOyAgICAgICAgYm9yZGVyOiBub25lOyAgICAgICAgYm94LXNoYWRvdzogMCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjAxMjUpIGluc2V0LCAwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0OyAgICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgdWwgeyAgICAgIG1hcmdpbjogMDsgICAgICBwYWRkaW5nOiAwOyAgICAgIGxpc3Qtc3R5bGU6IG5vbmU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5oZWFkIHsgICAgICBoZWlnaHQ6IDM4cHg7ICAgICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICM1NjYxNjY7ICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMxYTFkMWY7ICAgICAgcGFkZGluZzogMCAyMHB4IDAgMTVweDsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQoIzNjNGE0ZiAwJSwgIzM4M2Y0NyAxMDAlKTsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQoIzNjNGE0ZiAwJSwgIzM4M2Y0NyAxMDAlKTsgICAgICBjdXJzb3I6IHBvaW50ZXI7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLmhlYWQgLmxhYmVsIHsgICAgICAgIGZvbnQtc2l6ZTogMTJweDsgICAgICAgIGxpbmUtaGVpZ2h0OiAzOHB4OyAgICAgICAgY29sb3I6IHdoaXRlOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5oZWFkOmhvdmVyIHsgICAgICAgIGJhY2tncm91bmQtaW1hZ2U6IC1vLWxpbmVhci1ncmFkaWVudCgjM2M0YTRmIDAlLCAjM2M0YTRmIDEwMCUpOyAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KCMzYzRhNGYgMCUsICMzYzRhNGYgMTAwJSk7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIGxpIHsgICAgICBoZWlnaHQ6IDM1cHg7ICAgICAgcGFkZGluZzogMCAxMHB4IDAgMTBweDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCB7ICAgICAgcGFkZGluZzogMTBweDsgICAgICBib3JkZXItdG9wOiAxcHggc29saWQgIzNiNDQ0NzsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzFlMjIyNDsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCB7ICAgICAgICBwYWRkaW5nOiAwOyAgICAgICAgbWFyZ2luLXRvcDogNnB4OyAgICAgICAgaGVpZ2h0OiBhdXRvOyAgICAgICAgYm9yZGVyOiAxcHggc29saWQgIzFlMjIyNDsgICAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgICAgYm94LXNoYWRvdzogMCAxcHggMCAwICMzYjQ0NDc7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCB1bCB7ICAgICAgICAgIG92ZXJmbG93OiBoaWRkZW47IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cDpmaXJzdC1jaGlsZCB7ICAgICAgICAgIG1hcmdpbi10b3A6IDA7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAuaGVhZCB7ICAgICAgICAgIGhlaWdodDogMjZweDsgICAgICAgICAgcGFkZGluZzogMCAxMHB4IDAgMTBweDsgICAgICAgICAgYm9yZGVyLXRvcDogbm9uZTsgICAgICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMxZTIyMjQ7ICAgICAgICAgIGJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDJweDsgICAgICAgICAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDJweDsgICAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogbm9uZTsgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzI1MjgyYjsgICAgICAgICAgY3Vyc29yOiBwb2ludGVyOyB9ICAgICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAuaGVhZDpob3ZlciB7ICAgICAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogbm9uZTsgICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMjIyNjI5OyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgbGk6bnRoLWNoaWxkKG9kZCkgeyAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMjkyZDMwOyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgbGk6bnRoLWNoaWxkKGV2ZW4pIHsgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzMwMzYzOTsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC5oZWFkSW5hY3RpdmUgeyAgICAgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgaGVpZ2h0OiAyNnB4OyAgICAgICAgICBwYWRkaW5nOiAwIDEwcHggMCAxMHB4OyAgICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQoIzNhNDE0NSAwJSwgIzM2M2M0MCAxMDAlKTsgICAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KCMzYTQxNDUgMCUsICMzNjNjNDAgMTAwJSk7ICAgICAgICAgIGJveC1zaGFkb3c6IDAgMXB4IDAgMCAjNDM0YjUwIGluc2V0OyAgICAgICAgICBjdXJzb3I6IHBvaW50ZXI7IH0gICAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC5oZWFkSW5hY3RpdmU6aG92ZXIgeyAgICAgICAgICAgIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7ICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzNhNDE0NTsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC5oZWFkIC5sYWJlbCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC5oZWFkSW5hY3RpdmUgLmxhYmVsIHsgICAgICAgICAgbWFyZ2luOiAwOyAgICAgICAgICBwYWRkaW5nOiAwOyAgICAgICAgICBsaW5lLWhlaWdodDogMjZweDsgICAgICAgICAgY29sb3I6IHdoaXRlOyAgICAgICAgICBmb250LXdlaWdodDogYm9sZDsgICAgICAgICAgZm9udC1zaXplOiAxMXB4OyAgICAgICAgICB0ZXh0LXNoYWRvdzogMXB4IDFweCBibGFjazsgICAgICAgICAgdGV4dC10cmFuc2Zvcm06IGNhcGl0YWxpemU7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAuaGVhZCAud3JhcCAubGFiZWwsICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAuaGVhZEluYWN0aXZlIC53cmFwIC5sYWJlbCB7ICAgICAgICAgIHdpZHRoOiAxMDAlOyAgICAgICAgICBmb250LXdlaWdodDogYm9sZDsgICAgICAgICAgY29sb3I6IHdoaXRlOyAgICAgICAgICBwYWRkaW5nOiAwOyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLndyYXAgLmxhYmVsIHsgICAgICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIGhlaWdodDogMTAwJTsgICAgICAgICAgd2lkdGg6IDMwJTsgICAgICAgICAgcGFkZGluZzogMTBweCA1cHggMCAwOyAgICAgICAgICBmbG9hdDogbGVmdDsgICAgICAgICAgZm9udC1zaXplOiAxMXB4OyAgICAgICAgICBmb250LXdlaWdodDogbm9ybWFsOyAgICAgICAgICBjb2xvcjogI2FlYjViODsgICAgICAgICAgdGV4dC1zaGFkb3c6IDFweCAxcHggYmxhY2s7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAud3JhcCAud3JhcCB7ICAgICAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICB3aWR0aDogNzAlOyAgICAgICAgICBwYWRkaW5nOiA2cHggMCAwIDA7ICAgICAgICAgIGZsb2F0OiByaWdodDsgICAgICAgICAgaGVpZ2h0OiAxMDAlOyB9ICAgICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAud3JhcCAud3JhcCAud3JhcCB7ICAgICAgICAgICAgd2lkdGg6IDI1JTsgICAgICAgICAgICBwYWRkaW5nOiAwOyAgICAgICAgICAgIGZsb2F0OiBsZWZ0OyB9ICAgICAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC53cmFwIC53cmFwIC53cmFwIC5sYWJlbCB7ICAgICAgICAgICAgICB3aWR0aDogMTAwJTsgICAgICAgICAgICAgIHBhZGRpbmc6IDRweCAwIDAgMDsgICAgICAgICAgICAgIGNvbG9yOiAjODc4Nzg3OyAgICAgICAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyOyAgICAgICAgICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTsgICAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkOyAgICAgICAgICAgICAgdGV4dC1zaGFkb3c6IDFweCAxcHggIzFhMWExYTsgfSAgICAgICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAud3JhcCAud3JhcCAud3JhcCBpbnB1dFt0eXBlPSd0ZXh0J10geyAgICAgICAgICAgICAgcGFkZGluZzogMDsgICAgICAgICAgICAgIHRleHQtYWxpZ246IGNlbnRlcjsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC53cmFwIHsgICAgICAgICAgYmFja2dyb3VuZDogIzI1MjgyYjsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC53cmFwIC53cmFwIHsgICAgICAgICAgYmFja2dyb3VuZDogbm9uZTsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5oZWFkIC53cmFwLCAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuaGVhZEluYWN0aXZlIC53cmFwIHsgICAgICAgIGJhY2tncm91bmQ6IG5vbmU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwOmxhc3QtY2hpbGQgLnN1Ykdyb3VwTGlzdCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwOmxhc3QtY2hpbGQgLnNjcm9sbEJ1ZmZlcjpudGgtb2YtdHlwZSgzKSB7ICAgICAgYm9yZGVyLWJvdHRvbTogbm9uZTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXA6bGFzdC1jaGlsZCAuc2Nyb2xsV3JhcCAuc3ViR3JvdXBMaXN0IHsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzFlMjIyNDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLndyYXBTbGlkZXIgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICB3aWR0aDogNzAlOyAgICAgIHBhZGRpbmc6IDZweCAwIDAgMDsgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgaGVpZ2h0OiAxMDAlOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwU2xpZGVyIGlucHV0W3R5cGU9J3RleHQnXSB7ICAgICAgICB3aWR0aDogMjUlOyAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyOyAgICAgICAgcGFkZGluZzogMDsgICAgICAgIGZsb2F0OiByaWdodDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnNsaWRlcldyYXAgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBmbG9hdDogbGVmdDsgICAgICBjdXJzb3I6IGV3LXJlc2l6ZTsgICAgICB3aWR0aDogNzAlOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuc2xpZGVyU2xvdCB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIGhlaWdodDogMjVweDsgICAgICBwYWRkaW5nOiAzcHg7ICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzFlMjIyNDsgICAgICBib3JkZXI6IG5vbmU7ICAgICAgYm94LXNoYWRvdzogMCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjAxMjUpIGluc2V0LCAwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0OyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnNsaWRlckhhbmRsZSB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsgICAgICB3aWR0aDogMTAwJTsgICAgICBoZWlnaHQ6IDEwMCU7ICAgICAgYmFja2dyb3VuZDogI2IzMjQzNTsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCUsIHJnYmEoMCwgMCwgMCwgMC4xKSAxMDAlKTsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCUsIHJnYmEoMCwgMCwgMCwgMC4xKSAxMDAlKTsgICAgICBib3gtc2hhZG93OiAwIDFweCAwIDAgIzBmMGYwZjsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmNhbnZhc0xpc3RJdGVtLCAjY29udHJvbEtpdCAucGFuZWwgLnN2Z0xpc3RJdGVtIHsgICAgICBwYWRkaW5nOiAwIDEwcHggMCAxMHB4OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dTTWF4IHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUc1SlJFRlVlTnBpNU9EaWFtUmdZS2hqd0E0YW1WeDhneGptTDFyQzhQM3JWeFE4YitFU0JoZmZJQVptTlIyOUE1ZXZYV2RpWkdDMDE5WFNaR0JnWUdCWXZtWTl3N0kxNnhvWkdCZ2FXS0JHMVM5YnMrNC9Bd05EUFFNREExeVNnWUdCZ2RFblBBYlp6Z1kwbWdFd0FFOWxKVDFscnNmZkFBQUFBRWxGVGtTdVFtQ0MpIGNlbnRlciBuby1yZXBlYXQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd1NNaW4geyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRnBKUkVGVWVOcHNpaUVPZ0RBTVJmOFN4Tkp6SVlmQjFQUWtRN1JrWmNmQllMbmJVQXNMNGNuM1hrZ3M2TnpYcVFBd0wrdmUzVFRHTFdjRGdLUFdkMG9zaUVSYTNGdW51TGRJcElrRmlFUTJ4dThVRW9zQlVQeGp6d0FUU2pWLzhxbE1HQUFBQUFCSlJVNUVya0pnZ2c9PSkgY2VudGVyIG5vLXJlcGVhdDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmFycm93U01heCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd1NNaW4geyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIGhlaWdodDogMjBweDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmFycm93Qk1heCB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFESkpSRUZVZU5wc3lzRU5BQ0FNQXpFMjkramhBeEtsUFNtdmVLMmFzekVJTWlISTdVZmxiQ2hKZngrM0FRQUEvLzhEQVBMa1NhbUhhc3R4QUFBQUFFbEZUa1N1UW1DQykgY2VudGVyIG5vLXJlcGVhdDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmFycm93Qk1pbiB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFDOUpSRUZVZU5xRWpERU9BQ0FRZ3hoOE9EL0gyUmhQa2s0MEFBajBtS3ZpUzJVM1RpZW4waUUzQUFBQS8vOERBRWQxTnRJQ1Y0RXVBQUFBQUVsRlRrU3VRbUNDKSBjZW50ZXIgbm8tcmVwZWF0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dCU3ViTWF4IHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBb0FBQUFHQ0FZQUFBRDY4QS9HQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUdKSlJFRlVlTnBpOUFtUFlVQUdlemF2cTJkZ1lHQnc4UTFxUkJablFWZGthZS9jQUdXaktHWlcwOUZEVVdUcDRNSWdxNkRFd01EQTRIQm8xellHSlhYTmczQ0Z5SXBnQUYweDg2UDdkeHJRRldGVHpPZ1RIdFBBd01CUXo0QWZOQUFHQU4xQ0tQczROREx2QUFBQUFFbEZUa1N1UW1DQykgY2VudGVyIG5vLXJlcGVhdDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmFycm93QlN1Yk1pbiB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQW9BQUFBR0NBWUFBQUQ2OEEvR0FBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHOUpSRUZVZU5wOHpyRU9RREFBaE9HL0dFU1lCYnRKdkFLRDFlS0JSTitzTDFOTjU3YTdpU0RpcGt2dUcwNmtXU2FCbGYvSVpKb1h5cXFock9wUFljMk9OWnE0N1hvVnZJdEFESGxSZkNFSmJISGI5UUFxZUNkQWpDZStJNEFUUG5EdzdvRUFrdGVselJwOTlmdHdEQUNmc1MwWEFiejRQd0FBQUFCSlJVNUVya0pnZ2c9PSkgY2VudGVyIG5vLXJlcGVhdDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmFycm93Qk1heCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd0JNaW4sICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dCU3ViTWF4LCAjY29udHJvbEtpdCAucGFuZWwgLmFycm93QlN1Yk1pbiB7ICAgICAgd2lkdGg6IDEwcHg7ICAgICAgaGVpZ2h0OiAxMDAlOyAgICAgIGZsb2F0OiByaWdodDsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zaXplSGFuZGxlIHsgICAgZmxvYXQ6IGxlZnQ7ICAgIHdpZHRoOiAxMHB4OyAgICBoZWlnaHQ6IDEwMHB4OyAgICBib3JkZXItbGVmdDogMSBweTsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIC5sYWJlbCwgI2NvbnRyb2xLaXQgLnBpY2tlciAubGFiZWwgeyAgICB3aWR0aDogMTAwJTsgICAgZmxvYXQ6IGxlZnQ7ICAgIGZvbnQtc2l6ZTogMTFweDsgICAgZm9udC13ZWlnaHQ6IGJvbGQ7ICAgIHRleHQtc2hhZG93OiAwIC0xcHggYmxhY2s7ICAgIG92ZXJmbG93OiBoaWRkZW47ICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7ICAgIHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzOyAgICBjdXJzb3I6IGRlZmF1bHQ7IH0gICNjb250cm9sS2l0IC5wYW5lbCAuaGVhZCwgI2NvbnRyb2xLaXQgLnBpY2tlciAuaGVhZCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5wYW5lbEhlYWRJbmFjdGl2ZSB7ICAgIGhlaWdodDogMzBweDsgICAgcGFkZGluZzogMCAxMHB4IDAgMTBweDsgICAgYmFja2dyb3VuZDogIzFhMWQxZjsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmhlYWQgLndyYXAsICNjb250cm9sS2l0IC5waWNrZXIgLmhlYWQgLndyYXAsICNjb250cm9sS2l0IC5wYW5lbCAucGFuZWxIZWFkSW5hY3RpdmUgLndyYXAgeyAgICAgIHdpZHRoOiBhdXRvOyAgICAgIGhlaWdodDogYXV0bzsgICAgICBtYXJnaW46IDA7ICAgICAgcGFkZGluZzogMDsgICAgICBwb3NpdGlvbjogcmVsYXRpdmU7ICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIC5oZWFkLCAjY29udHJvbEtpdCAucGlja2VyIC5oZWFkIHsgICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICMyMDI0MjY7ICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMTExMzE0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuaGVhZCAubGFiZWwsICNjb250cm9sS2l0IC5waWNrZXIgLmhlYWQgLmxhYmVsIHsgICAgICBjdXJzb3I6IHBvaW50ZXI7ICAgICAgbGluZS1oZWlnaHQ6IDMwcHg7ICAgICAgY29sb3I6ICM2NTY5NmI7IH0gICNjb250cm9sS2l0IC5wYW5lbCAucGFuZWxIZWFkSW5hY3RpdmUgeyAgICBib3JkZXItdG9wOiAxcHggc29saWQgIzIwMjQyNjsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51LCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IHsgICAgZmxvYXQ6IHJpZ2h0OyAgICBwYWRkaW5nOiA1cHggMCAwIDA7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IGlucHV0W3R5cGU9J2J1dHRvbiddLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IGlucHV0W3R5cGU9J2J1dHRvbiddIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgY3Vyc29yOiBwb2ludGVyOyAgICAgIGhlaWdodDogMjBweDsgICAgICBtYXJnaW4tbGVmdDogNHB4OyAgICAgIGJvcmRlcjogbm9uZTsgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgZm9udC1mYW1pbHk6IGFyaWFsLCBzYW5zLXNlcmlmOyAgICAgIGZvbnQtc2l6ZTogMTBweDsgICAgICBmb250LXdlaWdodDogYm9sZDsgICAgICBjb2xvcjogI2FhYWFhYTsgICAgICB0ZXh0LXNoYWRvdzogMCAtMXB4IGJsYWNrOyAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7ICAgICAgYm94LXNoYWRvdzogMCAwIDAgMXB4ICMxMzEzMTMgaW5zZXQsIC0xcHggMnB4IDAgMCAjMjEyNTI3IGluc2V0OyAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMjQyOTJiOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnRuSGlkZSwgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5TaG93LCAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ0bkNsb3NlLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5IaWRlLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5TaG93LCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5DbG9zZSB7ICAgICAgd2lkdGg6IDIwcHg7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5IaWRlLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5IaWRlIHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUdSSlJFRlVlTnBpZFBVTllvQ0JVMGNPMURNd01EQ1kyVGcwd3NSWWtDVmxGWlVib0d5NEltWmxkVTI0cEp5U0NnTy9vQkFEQXdPRHcvVkw1eG1rNVJRT01yOTkvUkl1Q1FQSWlsak1iQndZR0JnWUdINy8vTW1BRENTbFpSa2twV1VaQUFNQXZUc2dYQnZPc3EwQUFBQUFTVVZPUks1Q1lJST0pIDUwJSA1MCUgbm8tcmVwZWF0LCAjMWExZDFmOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5IaWRlOmhvdmVyLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5IaWRlOmhvdmVyIHsgICAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBR1JKUkVGVWVOcGlkUFVOWW9DQlUwY08xRE13TURDWTJUZzB3c1JZa0NWbEZaVWJvR3k0SW1abGRVMjRwSnlTQ2dPL29CQURBd09Edy9WTDV4bWs1UlFPTXI5OS9SSXVDUVBJaWxqTWJCd1lHQmdZR0g3Ly9NbUFEQ1NsWlJra3BXVVpBQU1BdlRzZ1hCdk9zcTBBQUFBQVNVVk9SSzVDWUlJPSkgNTAlIDUwJSBuby1yZXBlYXQsICMxMTEzMTQ7ICAgICAgICBib3gtc2hhZG93OiAwIDAgMCAxcHggIzEzMTMxMyBpbnNldCwgLTFweCAycHggMCAwICMxMjEzMTQgaW5zZXQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5TaG93LCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5TaG93IHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUZwSlJFRlVlTnBzakRFT2dDQVFCT2M0ZXFOZm9DQjh3TXJDbndrLzgyRUhXRWt3Y2F0SlpyS3lyRnNHTHY1WC9INmNxUGM0MVk5cHRWTE4wQkRUM1ZzVEVUbkZ1VmtXSUd1SUNXQkV2ZmNoQWZ6MG1xdlo0QmVlQVFEelZpTXpKeTBSWGdBQUFBQkpSVTVFcmtKZ2dnPT0pIDUwJSA1MCUgbm8tcmVwZWF0LCAjMWExZDFmOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5TaG93OmhvdmVyLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5TaG93OmhvdmVyIHsgICAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRnBKUkVGVWVOcHNqREVPZ0NBUUJPYzRlcU5mb0NCOHdNckNud2svODJFSFdFa3djYXRKWnJLeXJGc0dMdjVYL0g2Y3FQYzQxWTlwdFZMTjBCRFQzVnNURVRuRnVWa1dJR3VJQ1dCRXZmY2hBZnowbXF2WjRCZWVBUUR6VmlNekp5MFJYZ0FBQUFCSlJVNUVya0pnZ2c9PSkgNTAlIDUwJSBuby1yZXBlYXQsICMxMTEzMTQ7ICAgICAgICBib3gtc2hhZG93OiAwIDAgMCAxcHggIzEzMTMxMyBpbnNldCwgLTFweCAycHggMCAwICMxMjEzMTQgaW5zZXQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5DbG9zZSwgI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnRuQ2xvc2UgeyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUpDQVlBQUFBUFUyMHVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBUTFKUkVGVWVOcE0wRDlMQW1FQXgvSHZQWGVEVHFlWHBWZVlZanBZR1ExaEJRN1NueGZRMHBBMUZFVmJyNkZlUmdadUNiMkVvT0NnbTI2c3BvSWdpS0JRUWFJVW51Y2VXMjd3dDM2SEQvd01PK25jQW5hMVZsOWpiSUh2dFlBTmEybGx0WUpodUlIdlhWVnI5Wk1vSHBYbUZ3L3RwQ090V0N4K0wweHp2MWhlT0E1OEx3NjhwcWRuemxOcGwxREtOd3M0MEdINGtKcktYQXBoTmdaL3YyVHpCWlNVYmFBaElyTFovZjY2bTh5NHpCYUsvUFQ3WGFBQklDTHpiRGdjYk9rd0pGUUtQZElUZ2UrMUFRdzc2ZHk0MmR4dWZxNUVxRlFMZUJkQ1hQUjZIVjZlSHorTTlmcjJaOEp4WENWbEV6aU55RDNUc3E2Vmtzb3NWNVkzdGRZZFlHZnNocWVSMWprREkvRS9BTzhyWVJsd1hCcXVBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCwgIzFhMWQxZjsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnRuQ2xvc2U6aG92ZXIsICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ0bkNsb3NlOmhvdmVyIHsgICAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUpDQVlBQUFBUFUyMHVBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBUTFKUkVGVWVOcE0wRDlMQW1FQXgvSHZQWGVEVHFlWHBWZVlZanBZR1ExaEJRN1NueGZRMHBBMUZFVmJyNkZlUmdadUNiMkVvT0NnbTI2c3BvSWdpS0JRUWFJVW51Y2VXMjd3dDM2SEQvd01PK25jQW5hMVZsOWpiSUh2dFlBTmEybGx0WUpodUlIdlhWVnI5Wk1vSHBYbUZ3L3RwQ090V0N4K0wweHp2MWhlT0E1OEx3NjhwcWRuemxOcGwxREtOd3M0MEdINGtKcktYQXBoTmdaL3YyVHpCWlNVYmFBaElyTFovZjY2bTh5NHpCYUsvUFQ3WGFBQklDTHpiRGdjYk9rd0pGUUtQZElUZ2UrMUFRdzc2ZHk0MmR4dWZxNUVxRlFMZUJkQ1hQUjZIVjZlSHorTTlmcjJaOEp4WENWbEV6aU55RDNUc3E2Vmtzb3NWNVkzdGRZZFlHZnNocWVSMWprREkvRS9BTzhyWVJsd1hCcXVBQUFBQUVsRlRrU3VRbUNDKSA1MCUgNTAlIG5vLXJlcGVhdCwgIzExMTMxNDsgICAgICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCAjMTMxMzEzIGluc2V0LCAtMXB4IDJweCAwIDAgIzEyMTMxNCBpbnNldDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ0blVuZG8sICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ0blVuZG8geyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUF3QUFBQUxDQVlBQUFCTGNHeGZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBWVZKUkVGVWVOcGNrRDFJVzFFWWhwOXo3cm0zb3FraHpaL3hENnRSMUVwRktlbGdobEJvblZ3S0RwYVdEbmJxMmxWRjBNSEJVYmRDcDVhQ1VpZ2RuSVNnb1VQQXFXTWxZc0dsTnRZSzFaaHp6cjFkVkc3emJ0L0w5N3g4N3ljZVR6MGxySEtwK0JKWUJIcXVyRy9BZkM1ZitBd2d3a0M1Vkh5YnlyVFBkdmRtQTlmMUJFSlFPLy9MWVdXZmsrT2ZTN2w4WWVFR0tKZUtyN05EOTlhVDZReldtSFBnRStBQU00N3JjblI0d0kvSy9xUzhUczkwZHErbE1oMVlZMWFCRnVBRjhBeVFWdXZOcnJ0OXhPS0pqeUlhdS9NT0dKcDQ5T1JoclhaaDlyN3ViZ1BQYy9uQ3IzQTM2VGpHOTMxSERZK09UeWpQNnc4QUtSMDFNdmFnY0ZxdHhvSC9nTFBUM3dleFJES3JJcmRiZDZUajlBc2hjRDBQUWFUYTNCSTVvVUZhMTNzSUFpVHd5cmQyd1dxTnFWL3VBUjNBY2NPclB5UlNiVXJYNjMvVWxiZmsrMzRGeEpkeXFkZ0VMQU8zZ0Rnd1BUQnkvM3B2Um9XQzNnTWtVbTNwU0RUNlJrcUpjbDNpeVhRUVdJczFaZ1hZVW8yMzlnNE0xc0t6MWZvN01BZHNBUHdiQUw5aGZ0dlRsTmtkQUFBQUFFbEZUa1N1UW1DQykgMjAlIDUwJSBuby1yZXBlYXQsICMxYTFkMWY7ICAgICAgcGFkZGluZzogMCA2cHggMXB4IDA7ICAgICAgd2lkdGg6IDM4cHg7ICAgICAgdmVydGljYWwtYWxpZ246IHRvcDsgICAgICB0ZXh0LWFsaWduOiBlbmQ7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ0blVuZG86aG92ZXIsICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ0blVuZG86aG92ZXIgeyAgICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQXdBQUFBTENBWUFBQUJMY0d4ZkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFZVkpSRUZVZU5wY2tEMUlXMUVZaHA5ejdybTNvcWtoeloveEQ2dFIxRXBGS2VsZ2hsQm9uVndLRHBhV0RuYnEybFZGME1IQlViZENwNWFDVWlnZG5JU2dvVVBBcVdNbFlzR2xOdFlLMVpoenpyMWRWRzd6YnQvTDk3eDg3eWNlVHowbHJIS3ArQkpZQkhxdXJHL0FmQzVmK0F3Z3drQzVWSHlieXJUUGR2ZG1BOWYxQkVKUU8vL0xZV1dmaytPZlM3bDhZZUVHS0plS3I3TkQ5OWFUNlF6V21IUGdFK0FBTTQ3cmNuUjR3SS9LL3FTOFRzOTBkcStsTWgxWVkxYUJGdUFGOEF5UVZ1dk5ycnQ5eE9LSmp5SWF1L01PR0pwNDlPUmhyWFpoOXI3dWJnUFBjL25DcjNBMzZUakc5MzFIRFkrT1R5alA2dzhBS1IwMU12YWdjRnF0eG9IL2dMUFQzd2V4UkRLcklyZGJkNlRqOUFzaGNEMFBRYVRhM0JJNW9VRmExM3NJQWlUd3lyZDJ3V3FOcVYvdUFSM0FjY09yUHlSU2JVclg2My9VbGJmayszNEZ4SmR5cWRnRUxBTzNnRGd3UFRCeS8zcHZSb1dDM2dNa1VtM3BTRFQ2UmtxSmNsM2l5WFFRV0lzMVpnWFlVbzIzOWc0TTFzS3oxZm83TUFkc0FQd2JBTDloZnR2VGxOa2RBQUFBQUVsRlRrU3VRbUNDKSAyMCUgNTAlIG5vLXJlcGVhdCwgIzExMTMxNDsgICAgICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCAjMTMxMzEzIGluc2V0LCAtMXB4IDJweCAwIDAgIzEyMTMxNCBpbnNldDsgfSAgI2NvbnRyb2xLaXQgLnBpY2tlciB7ICAgIHBvaW50ZXItZXZlbnRzOiBhdXRvOyAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgYmFja2dyb3VuZC1jb2xvcjogIzMwMzYzOTsgICAgZm9udC1mYW1pbHk6IGFyaWFsLCBzYW5zLXNlcmlmOyAgICBmb250LXNpemU6IDExcHg7ICAgIGNvbG9yOiB3aGl0ZTsgICAgdGV4dC1zaGFkb3c6IDFweCAxcHggYmxhY2s7ICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgICAgei1pbmRleDogMjE0NzQ4MzYzMTsgICAgd2lkdGg6IDM2MHB4OyAgICAtd2Via2l0LXRvdWNoLWNhbGxvdXQ6IG5vbmU7ICAgIC13ZWJraXQtdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1raHRtbC11c2VyLXNlbGVjdDogbm9uZTsgICAgLW1vei11c2VyLXNlbGVjdDogbm9uZTsgICAgLW1zLXVzZXItc2VsZWN0OiBub25lOyAgICB1c2VyLXNlbGVjdDogbm9uZTsgICAgYm94LXNoYWRvdzogMCAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjI1KTsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIGNhbnZhcyB7ICAgICAgdmVydGljYWwtYWxpZ246IGJvdHRvbTsgICAgICBjdXJzb3I6IHBvaW50ZXI7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIHBhZGRpbmc6IDEwcHg7ICAgICAgZmxvYXQ6IGxlZnQ7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGRXcmFwIHsgICAgICBwYWRkaW5nOiAzcHg7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyV3JhcCB7ICAgICAgcGFkZGluZzogM3B4IDEzcHggM3B4IDNweDsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIC5maWVsZFdyYXAsICNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlcldyYXAsICNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0V3JhcCB7ICAgICAgaGVpZ2h0OiBhdXRvOyAgICAgIG92ZXJmbG93OiBoaWRkZW47ICAgICAgZmxvYXQ6IGxlZnQ7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXRXcmFwIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm9yZGVyOiAxcHggc29saWQgIzFlMjIyNDsgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgYm94LXNoYWRvdzogMCAxcHggMCAwICMzYjQ0NDc7ICAgICAgd2lkdGg6IDE0MHB4OyAgICAgIGZsb2F0OiByaWdodDsgICAgICBwYWRkaW5nOiA1cHggMTBweCAxcHggMDsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIC5pbnB1dEZpZWxkIHsgICAgICB3aWR0aDogNTAlOyAgICAgIGZsb2F0OiByaWdodDsgICAgICBtYXJnaW4tYm90dG9tOiA0cHg7IH0gICAgICAjY29udHJvbEtpdCAucGlja2VyIC5pbnB1dEZpZWxkIC5sYWJlbCB7ICAgICAgICBwYWRkaW5nOiA0cHggMCAwIDA7ICAgICAgICBjb2xvcjogIzg3ODc4NzsgICAgICAgIHRleHQtYWxpZ246IGNlbnRlcjsgICAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7ICAgICAgICBmb250LXdlaWdodDogYm9sZDsgICAgICAgIHRleHQtc2hhZG93OiAxcHggMXB4ICMxYTFhMWE7ICAgICAgICB3aWR0aDogNDAlOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXRGaWVsZCAud3JhcCB7ICAgICAgICBwYWRkaW5nOiAwOyAgICAgICAgd2lkdGg6IDYwJTsgICAgICAgIGhlaWdodDogYXV0bzsgICAgICAgIGZsb2F0OiByaWdodDsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIC5jb250cm9sc1dyYXAgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICB3aWR0aDogMTAwJTsgICAgICBoZWlnaHQ6IGF1dG87ICAgICAgZmxvYXQ6IHJpZ2h0OyAgICAgIHBhZGRpbmc6IDlweCAwIDAgMDsgfSAgICAgICNjb250cm9sS2l0IC5waWNrZXIgLmNvbnRyb2xzV3JhcCBpbnB1dFt0eXBlPSdidXR0b24nXSB7ICAgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgICB3aWR0aDogNjVweDsgICAgICAgIG1hcmdpbjogMCAwIDAgMTBweDsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIC5jb2xvckNvbnRyYXN0IHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm9yZGVyOiBub25lOyAgICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4wMTI1KSBpbnNldCwgMCAwIDFweCAxcHggIzExMTMxNCBpbnNldDsgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzYjQ0NDc7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgaGVpZ2h0OiAyNXB4OyAgICAgIHBhZGRpbmc6IDNweDsgICAgICB3aWR0aDogODAlOyAgICAgIG1hcmdpbi1ib3R0b206IDRweDsgICAgICBmbG9hdDogcmlnaHQ7IH0gICAgICAjY29udHJvbEtpdCAucGlja2VyIC5jb2xvckNvbnRyYXN0IGRpdiB7ICAgICAgICB3aWR0aDogNTAlOyAgICAgICAgaGVpZ2h0OiAxMDAlOyAgICAgICAgZmxvYXQ6IGxlZnQ7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciBpbnB1dFt0eXBlPSd0ZXh0J10geyAgICAgIHBhZGRpbmc6IDA7ICAgICAgdGV4dC1hbGlnbjogY2VudGVyOyAgICAgIHdpZHRoOiA2MCU7ICAgICAgZmxvYXQ6IHJpZ2h0OyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0V3JhcDpudGgtb2YtdHlwZSgzKSB7ICAgICAgYm9yZGVyLWJvdHRvbS1sZWZ0LXJhZGl1czogMDsgICAgICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogMDsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dFdyYXA6bnRoLW9mLXR5cGUoNCkgeyAgICAgIGJvcmRlci10b3A6IG5vbmU7ICAgICAgYm9yZGVyLXRvcC1sZWZ0LXJhZGl1czogMDsgICAgICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMDsgfSAgICAgICNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0V3JhcDpudGgtb2YtdHlwZSg0KSAuaW5wdXRGaWVsZCB7ICAgICAgICB3aWR0aDogMTAwJTsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXRXcmFwOm50aC1vZi10eXBlKDQpIC5pbnB1dEZpZWxkIC5sYWJlbCB7ICAgICAgICAgIHdpZHRoOiAyMCU7IH0gICAgICAjY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dFdyYXA6bnRoLW9mLXR5cGUoNCkgaW5wdXRbdHlwZT0ndGV4dCddIHsgICAgICAgIHdpZHRoOiA4MCU7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGRXcmFwLCAjY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXJXcmFwIHsgICAgICBiYWNrZ3JvdW5kOiAjMWUyMjI0OyAgICAgIGJvcmRlcjogbm9uZTsgICAgICBib3gtc2hhZG93OiAwIDAgMXB4IDJweCByZ2JhKDAsIDAsIDAsIDAuMDEyNSkgaW5zZXQsIDAgMCAxcHggMXB4ICMxMTEzMTQgaW5zZXQ7ICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjM2I0NDQ3OyAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsgICAgICBtYXJnaW4tcmlnaHQ6IDVweDsgfSAgICAgICNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkV3JhcCAuaW5kaWNhdG9yLCAjY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXJXcmFwIC5pbmRpY2F0b3IgeyAgICAgICAgcG9zaXRpb246IGFic29sdXRlOyAgICAgICAgYm9yZGVyOiAycHggc29saWQgd2hpdGU7ICAgICAgICBib3gtc2hhZG93OiAwIDFweCBibGFjaywgMCAxcHggYmxhY2sgaW5zZXQ7ICAgICAgICBjdXJzb3I6IHBvaW50ZXI7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGRXcmFwIC5pbmRpY2F0b3IgeyAgICAgIHdpZHRoOiA4cHg7ICAgICAgaGVpZ2h0OiA4cHg7ICAgICAgbGVmdDogNTAlOyAgICAgIHRvcDogNTAlOyAgICAgIGJvcmRlci1yYWRpdXM6IDUwJTsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDUwJTsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXJXcmFwIC5pbmRpY2F0b3IgeyAgICAgIHdpZHRoOiAxNHB4OyAgICAgIGhlaWdodDogM3B4OyAgICAgIGJvcmRlci1yYWRpdXM6IDhweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDhweDsgICAgICBsZWZ0OiAxcHg7ICAgICAgdG9wOiAxcHg7IH0gICAgICAjY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXJXcmFwIC5pbmRpY2F0b3I6YWZ0ZXIgeyAgICAgICAgY29udGVudDogJyc7ICAgICAgICB3aWR0aDogMDsgICAgICAgIGhlaWdodDogMDsgICAgICAgIGJvcmRlci10b3A6IDQuNXB4IHNvbGlkIHRyYW5zcGFyZW50OyAgICAgICAgYm9yZGVyLWJvdHRvbTogNC41cHggc29saWQgdHJhbnNwYXJlbnQ7ICAgICAgICBib3JkZXItcmlnaHQ6IDRweCBzb2xpZCB3aGl0ZTsgICAgICAgIGZsb2F0OiByaWdodDsgICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgICAgICAgIHRvcDogLTJweDsgICAgICAgIGxlZnQ6IDE5cHg7IH0gICAgICAjY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXJXcmFwIC5pbmRpY2F0b3I6YmVmb3JlIHsgICAgICAgIGNvbnRlbnQ6ICcnOyAgICAgICAgd2lkdGg6IDA7ICAgICAgICBoZWlnaHQ6IDA7ICAgICAgICBib3JkZXItdG9wOiA0LjVweCBzb2xpZCB0cmFuc3BhcmVudDsgICAgICAgIGJvcmRlci1ib3R0b206IDQuNXB4IHNvbGlkIHRyYW5zcGFyZW50OyAgICAgICAgYm9yZGVyLXJpZ2h0OiA0cHggc29saWQgYmxhY2s7ICAgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7ICAgICAgICB0b3A6IC0zcHg7ICAgICAgICBsZWZ0OiAxOXB4OyB9ICAjY29udHJvbEtpdCAub3B0aW9ucyB7ICAgIHBvaW50ZXItZXZlbnRzOiBhdXRvOyAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgYm9yZGVyOiAxcHggc29saWQgIzEzMTMxMzsgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgcG9zaXRpb246IGFic29sdXRlOyAgICBsZWZ0OiAwOyAgICB0b3A6IDA7ICAgIHdpZHRoOiBhdXRvOyAgICBoZWlnaHQ6IGF1dG87ICAgIHotaW5kZXg6IDIxNDc0ODM2Mzg7ICAgIGZvbnQtZmFtaWx5OiBhcmlhbCwgc2Fucy1zZXJpZjsgICAgZm9udC1zaXplOiAxMXB4OyAgICBjb2xvcjogd2hpdGU7ICAgIHRleHQtc2hhZG93OiAxcHggMXB4IGJsYWNrOyAgICBib3gtc2hhZG93OiAwIDFweCAwIDAgIzU2NjE2NiBpbnNldDsgICAgb3ZlcmZsb3c6IGhpZGRlbjsgICAgYmFja2dyb3VuZC1jb2xvcjogIzNjNDk0ZTsgfSAgICAjY29udHJvbEtpdCAub3B0aW9ucyB1bCB7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgbGlzdC1zdHlsZTogbm9uZTsgICAgICBtYXJnaW46IDA7ICAgICAgcGFkZGluZzogMDsgfSAgICAgICNjb250cm9sS2l0IC5vcHRpb25zIHVsIGxpIHsgICAgICAgIG1hcmdpbjogMDsgICAgICAgIHdpZHRoOiAxMDAlOyAgICAgICAgaGVpZ2h0OiAyOHB4OyAgICAgICAgbGluZS1oZWlnaHQ6IDI4cHg7ICAgICAgICBwYWRkaW5nOiAwIDIwcHggMCAxMHB4OyAgICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsgICAgICAgIHdoaXRlLXNwYWNlOiBub3JtYWw7ICAgICAgICB0ZXh0LW92ZXJmbG93OiBlbGxpcHNpczsgICAgICAgIGN1cnNvcjogcG9pbnRlcjsgfSAgICAgICAgI2NvbnRyb2xLaXQgLm9wdGlvbnMgdWwgbGk6aG92ZXIgeyAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMWYyMzI1OyB9ICAgICAgI2NvbnRyb2xLaXQgLm9wdGlvbnMgdWwgLmxpU2VsZWN0ZWQgeyAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzI5MmQzMDsgfSAgICAjY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgfSAgICAgICNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciBsaSwgI2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIC5saVNlbGVjdGVkIHsgICAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICBwYWRkaW5nOiAwOyAgICAgICAgaGVpZ2h0OiAyNXB4OyAgICAgICAgbGluZS1oZWlnaHQ6IDI1cHg7ICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7IH0gICAgICAgICNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciBsaTpob3ZlciwgI2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIC5saVNlbGVjdGVkOmhvdmVyIHsgICAgICAgICAgYmFja2dyb3VuZDogbm9uZTsgICAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7IH0gICAgICAjY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgLmxpU2VsZWN0ZWQgeyAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7IH1cIlxufTsgXG5tb2R1bGUuZXhwb3J0cyA9IFN0eWxlOyIsImZ1bmN0aW9uIEV2ZW50XyhzZW5kZXIsdHlwZSxkYXRhKSB7XG4gICAgdGhpcy5zZW5kZXIgPSBzZW5kZXI7XG4gICAgdGhpcy50eXBlICAgPSB0eXBlO1xuICAgIHRoaXMuZGF0YSAgID0gZGF0YTtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRfOyIsImZ1bmN0aW9uIEV2ZW50RGlzcGF0Y2hlcigpIHtcbiAgICB0aGlzLl9saXN0ZW5lcnMgPSBbXTtcbn1cblxuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSA9IHtcbiAgICBhZGRFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAoZXZlbnRUeXBlLCBsaXN0ZW5lciwgY2FsbGJhY2tNZXRob2QpIHtcbiAgICAgICAgdGhpcy5fbGlzdGVuZXJzW2V2ZW50VHlwZV0gPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRUeXBlXSB8fCBbXTtcbiAgICAgICAgdGhpcy5fbGlzdGVuZXJzW2V2ZW50VHlwZV0ucHVzaCh7b2JqOiBsaXN0ZW5lciwgbWV0aG9kOiBjYWxsYmFja01ldGhvZH0pO1xuICAgIH0sXG5cbiAgICBkaXNwYXRjaEV2ZW50OiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIHR5cGUgPSBldmVudC50eXBlO1xuXG4gICAgICAgIGlmICghdGhpcy5oYXNFdmVudExpc3RlbmVyKHR5cGUpKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnNbdHlwZV07XG4gICAgICAgIHZhciBpID0gLTEsIGwgPSBsaXN0ZW5lcnMubGVuZ3RoO1xuXG4gICAgICAgIHZhciBvYmosIG1ldGhvZDtcblxuICAgICAgICB3aGlsZSAoKytpIDwgbCkge1xuICAgICAgICAgICAgb2JqID0gbGlzdGVuZXJzW2ldLm9iajtcbiAgICAgICAgICAgIG1ldGhvZCA9IGxpc3RlbmVyc1tpXS5tZXRob2Q7XG5cbiAgICAgICAgICAgIGlmICghb2JqW21ldGhvZF0pe1xuICAgICAgICAgICAgICAgIHRocm93IG9iaiArICcgaGFzIG5vIG1ldGhvZCAnICsgbWV0aG9kO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBvYmpbbWV0aG9kXShldmVudCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gKHR5cGUsIG9iaiwgbWV0aG9kKSB7XG4gICAgICAgIGlmICghdGhpcy5oYXNFdmVudExpc3RlbmVyKHR5cGUpKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnNbdHlwZV07XG5cbiAgICAgICAgdmFyIGkgPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoLS1pID4gLTEpIHtcbiAgICAgICAgICAgIGlmIChsaXN0ZW5lcnNbaV0ub2JqID09IG9iaiAmJiBsaXN0ZW5lcnNbaV0ubWV0aG9kID09IG1ldGhvZCkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVycy5sZW5ndGggPT0gMCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9saXN0ZW5lcnNbdHlwZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIHJlbW92ZUFsbEV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2xpc3RlbmVycyA9IFtdO1xuICAgIH0sXG5cblxuICAgIGhhc0V2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9saXN0ZW5lcnNbdHlwZV0gIT0gdW5kZWZpbmVkICYmIHRoaXMuX2xpc3RlbmVyc1t0eXBlXSAhPSBudWxsO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnREaXNwYXRjaGVyOyIsInZhciBMYXlvdXRNb2RlID0ge1xuICAgIExFRlQgICA6ICdsZWZ0JyxcbiAgICBSSUdIVCAgOiAncmlnaHQnLFxuICAgIFRPUCAgICA6ICd0b3AnLFxuICAgIEJPVFRPTSA6ICdib3R0b20nLFxuICAgIE5PTkUgICA6ICdub25lJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXRNb2RlOyIsInZhciBOb2RlID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvTm9kZScpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4uL01ldHJpYycpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L0NTUycpO1xudmFyIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9kb2N1bWVudC9Nb3VzZScpO1xuXG4vLyAvVE9ETzogQWRkIG1vdXNlb2Zmc2V0ICYgcmVzZXQuLlxuZnVuY3Rpb24gU2Nyb2xsQmFyKHBhcmVudE5vZGUsdGFyZ2V0Tm9kZSx3cmFwSGVpZ2h0KSB7XG4gICAgdGhpcy5fcGFyZW50Tm9kZSA9IHBhcmVudE5vZGU7XG4gICAgdGhpcy5fdGFyZ2V0Tm9kZSA9IHRhcmdldE5vZGU7XG4gICAgdGhpcy5fd3JhcEhlaWdodCA9IHdyYXBIZWlnaHQ7XG5cbiAgICB2YXIgd3JhcCAgID0gdGhpcy5fd3JhcE5vZGUgICA9IG5ldyBOb2RlKCksXG4gICAgICAgIG5vZGUgICA9IHRoaXMuX25vZGUgICAgICAgPSBuZXcgTm9kZSgpLFxuICAgICAgICB0cmFjayAgPSB0aGlzLl90cmFja05vZGUgID0gbmV3IE5vZGUoKSxcbiAgICAgICAgdGh1bWIgID0gdGhpcy5fdGh1bWJOb2RlICA9IG5ldyBOb2RlKCk7XG5cbiAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRhcmdldE5vZGUpO1xuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGQod3JhcCk7XG4gICAgcGFyZW50Tm9kZS5hZGRDaGlsZEF0KG5vZGUsMCk7XG5cbiAgICB3cmFwLmFkZENoaWxkKHRhcmdldE5vZGUpO1xuICAgIG5vZGUuYWRkQ2hpbGQodHJhY2spO1xuICAgIHRyYWNrLmFkZENoaWxkKHRodW1iKTtcblxuICAgIHdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsV3JhcCk7XG4gICAgbm9kZS5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCYXIpO1xuICAgIHRyYWNrLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJhclRyYWNrKTtcbiAgICB0aHVtYi5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCYXJUaHVtYik7XG5cbiAgICB0aGlzLl9zY3JvbGxIZWlnaHQgPSAwO1xuICAgIHRoaXMuX3Njcm9sbFVuaXQgICA9IDA7XG5cbiAgICB0aGlzLl9zY3JvbGxNaW4gICAgPSAwO1xuICAgIHRoaXMuX3Njcm9sbE1heCAgICA9IDE7XG4gICAgdGhpcy5fc2Nyb2xsUG9zICAgID0gMDtcblxuICAgIHRodW1iLnNldFBvc2l0aW9uWShNZXRyaWMuU0NST0xMQkFSX1RSQUNLX1BBRERJTkcpO1xuICAgIHRodW1iLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sdGhpcy5fb25UaHVtYkRyYWdTdGFydC5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMuX2lzVmFsaWQgID0gZmFsc2U7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xufVxuXG5TY3JvbGxCYXIucHJvdG90eXBlID1cbntcbiAgICB1cGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRhcmdldCA9IHRoaXMuX3RhcmdldE5vZGUsXG4gICAgICAgICAgICB0aHVtYiA9IHRoaXMuX3RodW1iTm9kZTtcblxuICAgICAgICB2YXIgcGFkZGluZyA9IE1ldHJpYy5TQ1JPTExCQVJfVFJBQ0tfUEFERElORztcblxuICAgICAgICB2YXIgdGFyZ2V0V3JhcEhlaWdodCA9IHRoaXMuX3dyYXBIZWlnaHQsXG4gICAgICAgICAgICB0YXJnZXRIZWlnaHQgPSB0YXJnZXQuZ2V0SGVpZ2h0KCksXG4gICAgICAgICAgICB0cmFja0hlaWdodCA9IHRhcmdldFdyYXBIZWlnaHQgLSBwYWRkaW5nICogMjtcblxuICAgICAgICB0aHVtYi5zZXRIZWlnaHQodHJhY2tIZWlnaHQpO1xuXG4gICAgICAgIHZhciByYXRpbyA9IHRhcmdldFdyYXBIZWlnaHQgLyB0YXJnZXRIZWlnaHQ7XG5cbiAgICAgICAgdGhpcy5faXNWYWxpZCA9IGZhbHNlO1xuXG4gICAgICAgIGlmIChyYXRpbyA+IDEuMCl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdGh1bWJIZWlnaHQgPSB0cmFja0hlaWdodCAqIHJhdGlvO1xuXG4gICAgICAgIHRoaXMuX3Njcm9sbEhlaWdodCA9IHRyYWNrSGVpZ2h0IC0gdGh1bWJIZWlnaHQ7XG4gICAgICAgIHRoaXMuX3Njcm9sbFVuaXQgPSB0YXJnZXRIZWlnaHQgLSB0cmFja0hlaWdodCAtIHBhZGRpbmcgKiAyO1xuXG4gICAgICAgIHRodW1iLnNldEhlaWdodCh0aHVtYkhlaWdodCk7XG5cbiAgICAgICAgdGhpcy5faXNWYWxpZCA9IHRydWU7XG5cbiAgICAgICAgLypcbiAgICAgICAgIHZhciBzY3JvbGxNaW4gPSB0aGlzLl9zY3JvbGxNaW4sXG4gICAgICAgICBzY3JvbGxNYXggPSB0aGlzLl9zY3JvbGxNYXgsXG4gICAgICAgICBzY3JvbGxQb3MgPSB0aGlzLl9zY3JvbGxQb3M7XG5cbiAgICAgICAgIHZhciBzY3JvbGxQb3NOb3JtID0gKHNjcm9sbFBvcyAtIHNjcm9sbE1pbikgLyAoc2Nyb2xsTWF4IC0gc2Nyb2xsUG9zKTtcbiAgICAgICAgICovXG4gICAgfSxcblxuICAgIF9zY3JvbGxUaHVtYjogZnVuY3Rpb24gKHkpIHtcbiAgICAgICAgdmFyIHRodW1iID0gdGhpcy5fdGh1bWJOb2RlLFxuICAgICAgICAgICAgdGh1bWJIZWlnaHQgPSB0aHVtYi5nZXRIZWlnaHQoKTtcblxuICAgICAgICB2YXIgdHJhY2sgPSB0aGlzLl90cmFja05vZGUsXG4gICAgICAgICAgICB0cmFja0hlaWdodCA9IHRoaXMuX3dyYXBIZWlnaHQsXG4gICAgICAgICAgICB0cmFja1RvcCA9IHRyYWNrLmdldFBvc2l0aW9uR2xvYmFsWSgpLFxuICAgICAgICAgICAgdHJhY2tDZW50ZXIgPSB0cmFja0hlaWdodCAqIDAuNTtcblxuICAgICAgICB2YXIgdGFyZ2V0ID0gdGhpcy5fdGFyZ2V0Tm9kZTtcblxuICAgICAgICB2YXIgc2Nyb2xsSGVpZ2h0ID0gdGhpcy5fc2Nyb2xsSGVpZ2h0LFxuICAgICAgICAgICAgc2Nyb2xsVW5pdCA9IHRoaXMuX3Njcm9sbFVuaXQ7XG5cbiAgICAgICAgdmFyIG1pbiA9IHRoaXMuX3Njcm9sbE1pbiA9IHRyYWNrQ2VudGVyIC0gc2Nyb2xsSGVpZ2h0ICogMC41LFxuICAgICAgICAgICAgbWF4ID0gdGhpcy5fc2Nyb2xsTWF4ID0gdHJhY2tDZW50ZXIgKyBzY3JvbGxIZWlnaHQgKiAwLjU7XG5cbiAgICAgICAgdmFyIHBvcyA9IE1hdGgubWF4KG1pbiwgTWF0aC5taW4oeSAtIHRyYWNrVG9wLCBtYXgpKTtcblxuICAgICAgICB2YXIgdGh1bWJQb3MgPSB0aGlzLl9zY3JvbGxQb3MgPSBwb3MgLSB0aHVtYkhlaWdodCAqIDAuNSxcbiAgICAgICAgICAgIHRhcmdldFBvcyA9IC0ocG9zIC0gbWluKSAvIChtYXggLSBtaW4pICogc2Nyb2xsVW5pdDtcblxuICAgICAgICB0aHVtYi5zZXRQb3NpdGlvblkodGh1bWJQb3MpO1xuICAgICAgICB0YXJnZXQuc2V0UG9zaXRpb25ZKHRhcmdldFBvcyk7XG4gICAgfSxcblxuICAgIF9vblRodW1iRHJhZ1N0YXJ0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghdGhpcy5faXNWYWxpZCB8fCB0aGlzLl9pc0Rpc2FibGVkKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBtb3VzZSA9IE1vdXNlLmdldEluc3RhbmNlKCk7XG5cbiAgICAgICAgLy9UT0RPOmFkZFxuICAgICAgICB0aGlzLl9zY3JvbGxPZmZzZXQgPSBtb3VzZS5nZXRZKCkgLSB0aGlzLl90aHVtYk5vZGUuZ2V0UG9zaXRpb25HbG9iYWxZKCk7XG5cbiAgICAgICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9zY3JvbGxUaHVtYihtb3VzZS5nZXRZKCkpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsVGh1bWIobW91c2UuZ2V0WSgpKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICB9LFxuXG4gICAgZW5hYmxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lzRGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgIH0sXG4gICAgZGlzYWJsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pc0Rpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgIH0sXG5cbiAgICByZXNldDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zY3JvbGxUaHVtYigwKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUFwcGVhcmFuY2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzRGlzYWJsZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgICAgICB0aGlzLl90YXJnZXROb2RlLnNldFBvc2l0aW9uWSgwKTtcbiAgICAgICAgICAgIHRoaXMuX3RodW1iTm9kZS5zZXRQb3NpdGlvblkoTWV0cmljLlNDUk9MTEJBUl9UUkFDS19QQURESU5HKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGlzVmFsaWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lzVmFsaWQ7XG4gICAgfSxcblxuICAgIHNldFdyYXBIZWlnaHQ6IGZ1bmN0aW9uIChoZWlnaHQpIHtcbiAgICAgICAgdGhpcy5fd3JhcEhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlVGFyZ2V0Tm9kZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fd3JhcE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5fdGFyZ2V0Tm9kZSk7XG4gICAgfSxcblxuICAgIHJlbW92ZUZyb21QYXJlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHBhcmVudE5vZGUgPSB0aGlzLl9wYXJlbnROb2RlLFxuICAgICAgICAgICAgcm9vdE5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICAgICAgdGFyZ2V0Tm9kZSA9IHRoaXMuX3RhcmdldE5vZGU7XG5cbiAgICAgICAgcm9vdE5vZGUucmVtb3ZlQ2hpbGQodGFyZ2V0Tm9kZSk7XG4gICAgICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5fd3JhcE5vZGUpO1xuICAgICAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKHJvb3ROb2RlKTtcblxuICAgICAgICByZXR1cm4gdGFyZ2V0Tm9kZTtcbiAgICB9LFxuXG4gICAgZ2V0V3JhcE5vZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dyYXBOb2RlO1xuICAgIH0sXG4gICAgZ2V0Tm9kZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbm9kZTtcbiAgICB9LFxuICAgIGdldFRhcmdldE5vZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RhcmdldE5vZGU7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTY3JvbGxCYXI7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIFNjcm9sbEJhciA9IHJlcXVpcmUoJy4uL2NvcmUvbGF5b3V0L1Njcm9sbEJhcicpO1xuXG5mdW5jdGlvbiBBYnN0cmFjdEdyb3VwKHBhcmVudCwgcGFyYW1zKSB7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLmhlaWdodCA9IHBhcmFtcy5oZWlnaHQgfHwgbnVsbDtcbiAgICBwYXJhbXMuZW5hYmxlID0gcGFyYW1zLmVuYWJsZSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IHBhcmFtcy5lbmFibGU7XG5cbiAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5faGVpZ2h0ID0gcGFyYW1zLmhlaWdodDtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gIXBhcmFtcy5lbmFibGU7XG4gICAgdGhpcy5fc2Nyb2xsQmFyID0gbnVsbDtcblxuICAgIHRoaXMuX25vZGUgPSBuZXcgTm9kZShOb2RlLkxJU1RfSVRFTSk7XG4gICAgdGhpcy5fd3JhcE5vZGUgPSBuZXcgTm9kZSgpO1xuICAgIHRoaXMuX2xpc3ROb2RlID0gbmV3IE5vZGUoTm9kZS5MSVNUKTtcblxuICAgIHRoaXMuX3BhcmVudC5nZXRMaXN0KCkuYWRkQ2hpbGQodGhpcy5fbm9kZSk7XG59XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuYWRkU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgbWF4SGVpZ2h0ID0gdGhpcy5nZXRNYXhIZWlnaHQoKTtcblxuICAgIHRoaXMuX3Njcm9sbEJhciA9IG5ldyBTY3JvbGxCYXIod3JhcE5vZGUsIHRoaXMuX2xpc3ROb2RlLCBtYXhIZWlnaHQpO1xuICAgIGlmICh0aGlzLmlzRW5hYmxlZCgpKSB7XG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodChtYXhIZWlnaHQpO1xuICAgIH1cbn07XG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLnByZXZlbnRTZWxlY3REcmFnID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3BhcmVudC5wcmV2ZW50U2VsZWN0RHJhZygpO1xuXG4gICAgaWYgKCF0aGlzLmhhc1Njcm9sbFdyYXAoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX3dyYXBOb2RlLmdldEVsZW1lbnQoKS5zY3JvbGxUb3AgPSAwO1xufTtcblxuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5oYXNNYXhIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodCAhPSBudWxsO1xufTtcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmdldE1heEhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xufTtcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmhhc1Njcm9sbFdyYXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Njcm9sbEJhciAhPSBudWxsO1xufTtcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmhhc0xhYmVsID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9sYWJsTm9kZSAhPSBudWxsO1xufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gZmFsc2U7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gdHJ1ZTtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faXNEaXNhYmxlZDtcbn07XG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5pc0VuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICF0aGlzLl9pc0Rpc2FibGVkO1xufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuZ2V0TGlzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbGlzdE5vZGU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0R3JvdXA7XG5cbiIsInZhciBBYnN0cmFjdEdyb3VwID0gcmVxdWlyZSgnLi9BYnN0cmFjdEdyb3VwJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG5cbnZhciBTdWJHcm91cCA9IHJlcXVpcmUoJy4vU3ViR3JvdXAnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBQYW5lbEV2ZW50ID0gcmVxdWlyZSgnLi9QYW5lbEV2ZW50JyksXG4gICAgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4vR3JvdXBFdmVudCcpO1xuXG5mdW5jdGlvbiBHcm91cChwYXJlbnQscGFyYW1zKSB7XG4gICAgcGFyYW1zICAgICAgICAgICA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMubGFiZWwgICAgID0gcGFyYW1zLmxhYmVsICAgICB8fCBudWxsO1xuICAgIHBhcmFtcy51c2VMYWJlbHMgPSBwYXJhbXMudXNlTGFiZWxzIHx8IHRydWU7XG4gICAgcGFyYW1zLmVuYWJsZSAgICA9IHBhcmFtcy5lbmFibGUgICAgID09PSB1bmRlZmluZWQgPyB0cnVlIDogcGFyYW1zLmVuYWJsZTtcblxuICAgIEFic3RyYWN0R3JvdXAuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5fY29tcG9uZW50cyA9IFtdO1xuICAgIHRoaXMuX3N1Ykdyb3VwcyAgPSBbXTtcblxuICAgIHZhciByb290Tm9kZSA9IHRoaXMuX25vZGUsXG4gICAgICAgIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIGxpc3ROb2RlID0gdGhpcy5fbGlzdE5vZGU7XG5cbiAgICAgICAgcm9vdE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuR3JvdXApO1xuICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcbiAgICAgICAgbGlzdE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU3ViR3JvdXBMaXN0KTtcblxuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChsaXN0Tm9kZSk7XG5cbiAgICB2YXIgbGFiZWwgPSBwYXJhbXMubGFiZWw7XG5cbiAgICBpZihsYWJlbCl7XG4gICAgICAgIHZhciBoZWFkTm9kZSAgPSBuZXcgTm9kZSgpLFxuICAgICAgICAgICAgbGFibFdyYXAgID0gbmV3IE5vZGUoKSxcbiAgICAgICAgICAgIGxhYmxOb2RlICA9IG5ldyBOb2RlKE5vZGUuU1BBTiksXG4gICAgICAgICAgICBpbmRpTm9kZSAgPSB0aGlzLl9pbmRpTm9kZSA9IG5ldyBOb2RlKCk7XG5cbiAgICAgICAgICAgIGhlYWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpO1xuICAgICAgICAgICAgbGFibFdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG4gICAgICAgICAgICBsYWJsTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XG4gICAgICAgICAgICBpbmRpTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5BcnJvd0JNYXgpO1xuICAgICAgICAgICAgbGFibE5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsbGFiZWwpO1xuXG4gICAgICAgICAgICBoZWFkTm9kZS5hZGRDaGlsZChpbmRpTm9kZSk7XG4gICAgICAgICAgICBsYWJsV3JhcC5hZGRDaGlsZChsYWJsTm9kZSk7XG4gICAgICAgICAgICBoZWFkTm9kZS5hZGRDaGlsZChsYWJsV3JhcCk7XG4gICAgICAgICAgICByb290Tm9kZS5hZGRDaGlsZChoZWFkTm9kZSk7XG5cbiAgICAgICAgaGVhZE5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTix0aGlzLl9vbkhlYWRUcmlnZ2VyLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9MSVNUX1NJWkVfQ0hBTkdFLHRoaXMuX3BhcmVudCwnb25Hcm91cExpc3RTaXplQ2hhbmdlJyk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgIH1cblxuICAgIGlmKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICB0aGlzLmFkZFNjcm9sbFdyYXAoKTtcbiAgICB9XG5cbiAgICByb290Tm9kZS5hZGRDaGlsZCh3cmFwTm9kZSk7XG5cbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgaWYoIWxhYmVsKXtcbiAgICAgICAgICAgIHZhciBidWZmZXJUb3AgPSB0aGlzLl9zY3JvbGxCdWZmZXJUb3AgPSBuZXcgTm9kZSgpO1xuICAgICAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCdWZmZXIpO1xuXG4gICAgICAgICAgICByb290Tm9kZS5hZGRDaGlsZEF0KGJ1ZmZlclRvcCwwKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYnVmZmVyQm90dG9tID0gdGhpcy5fc2Nyb2xsQnVmZmVyQm90dG9tID0gbmV3IE5vZGUoKTtcbiAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCdWZmZXIpO1xuXG4gICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKGJ1ZmZlckJvdHRvbSk7XG4gICAgfVxuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0JFR0lOLCB0aGlzLCAnb25QYW5lbE1vdmVCZWdpbicpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRSwgdGhpcywgJ29uUGFuZWxNb3ZlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0VORCwgdGhpcywgJ29uUGFuZWxNb3ZlRW5kJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9ISURFLCB0aGlzLCAnb25QYW5lbEhpZGUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NIT1csIHRoaXMsICdvblBhbmVsU2hvdycpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfU0NST0xMX1dSQVBfQURERUQsIHRoaXMsICdvblBhbmVsU2Nyb2xsV3JhcEFkZGVkJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TQ1JPTExfV1JBUF9SRU1PVkVELCB0aGlzLCAnb25QYW5lbFNjcm9sbFdyYXBSZW1vdmVkJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TSVpFX0NIQU5HRSwgdGhpcywgJ29uUGFuZWxTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5XSU5ET1dfUkVTSVpFLCB0aGlzLCAnb25XaW5kb3dSZXNpemUnKTtcblxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLHRoaXMuX3BhcmVudCwnb25Hcm91cExpc3RTaXplQ2hhbmdlJyk7XG59XG5cbkdyb3VwLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQWJzdHJhY3RHcm91cC5wcm90b3R5cGUpO1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbE1vdmVCZWdpbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfQkVHSU4sIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsTW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkUsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsTW92ZUVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbFNjcm9sbFdyYXBBZGRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbFNjcm9sbFdyYXBSZW1vdmVkID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsSGlkZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LlNVQkdST1VQX0RJU0FCTEUsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2hvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LlNVQkdST1VQX0VOQUJMRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTaXplQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vbldpbmRvd1Jlc2l6ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KGUpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uU3ViR3JvdXBUcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuXG4gICAgaWYoIXRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHNjcm9sbEJhciA9IHRoaXMuX3Njcm9sbEJhcixcbiAgICAgICAgd3JhcE5vZGUgID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICB2YXIgYnVmZmVyVG9wICAgID0gdGhpcy5fc2Nyb2xsQnVmZmVyVG9wLFxuICAgICAgICBidWZmZXJCb3R0b20gPSB0aGlzLl9zY3JvbGxCdWZmZXJCb3R0b207XG5cbiAgICBzY3JvbGxCYXIudXBkYXRlKCk7XG5cbiAgICBpZiAoIXNjcm9sbEJhci5pc1ZhbGlkKCkpIHtcbiAgICAgICAgc2Nyb2xsQmFyLmRpc2FibGUoKTtcbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KHdyYXBOb2RlLmdldENoaWxkQXQoMSkuZ2V0SGVpZ2h0KCkpO1xuXG4gICAgICAgIGlmIChidWZmZXJUb3Ape1xuICAgICAgICAgICAgYnVmZmVyVG9wLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChidWZmZXJCb3R0b20pe1xuICAgICAgICAgICAgYnVmZmVyQm90dG9tLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzY3JvbGxCYXIuZW5hYmxlKCk7XG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodCh0aGlzLmdldE1heEhlaWdodCgpKTtcblxuICAgICAgICBpZiAoYnVmZmVyVG9wKXtcbiAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJ1ZmZlckJvdHRvbSl7XG4gICAgICAgICAgICBidWZmZXJCb3R0b20uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5fb25IZWFkVHJpZ2dlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gIXRoaXMuX2lzRGlzYWJsZWQ7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfTElTVF9TSVpFX0NIQU5HRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLmFkZENvbXBvbmVudCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIENsYXNzXyA9IGFyZ3VtZW50c1swXTtcbiAgICB2YXIgYXJncyAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgYXJncy5zaGlmdCgpO1xuICAgICAgICBhcmdzLnVuc2hpZnQodGhpcy5fZ2V0U3ViR3JvdXAoKSk7XG5cbiAgICB2YXIgaW5zdGFuY2UgPSBPYmplY3QuY3JlYXRlKENsYXNzXy5wcm90b3R5cGUpO1xuICAgIENsYXNzXy5hcHBseShpbnN0YW5jZSxhcmdzKTtcblxuICAgIHRoaXMuX2NvbXBvbmVudHMucHVzaChpbnN0YW5jZSk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuX3VwZGF0ZUhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9nZXRTdWJHcm91cCgpLnVwZGF0ZSgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSxudWxsKSk7XG4gICAgaWYodGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIHRoaXMuX3Njcm9sbEJhci51cGRhdGUoKTtcbiAgICB9XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuX3VwZGF0ZUFwcGVhcmFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIGluaWROb2RlID0gdGhpcy5faW5kaU5vZGU7XG5cbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyO1xuXG4gICAgdmFyIGJ1ZmZlclRvcCAgICA9IHRoaXMuX3Njcm9sbEJ1ZmZlclRvcCxcbiAgICAgICAgYnVmZmVyQm90dG9tID0gdGhpcy5fc2Nyb2xsQnVmZmVyQm90dG9tO1xuXG4gICAgaWYgKHRoaXMuaXNEaXNhYmxlZCgpKSB7XG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodCgwKTtcbiAgICAgICAgaWYgKGluaWROb2RlKXtcbiAgICAgICAgICAgIGluaWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkFycm93Qk1pbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2Nyb2xsQmFyKSB7XG4gICAgICAgICAgICBpZiAoYnVmZmVyVG9wKXtcbiAgICAgICAgICAgICAgICBidWZmZXJUb3Auc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYnVmZmVyQm90dG9tKXtcbiAgICAgICAgICAgICAgICBidWZmZXJCb3R0b20uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmhhc01heEhlaWdodCgpKSB7XG4gICAgICAgIHZhciBtYXhIZWlnaHQgPSB0aGlzLmdldE1heEhlaWdodCgpLFxuICAgICAgICAgICAgbGlzdEhlaWdodCA9IHdyYXBOb2RlLmdldENoaWxkQXQoMSkuZ2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KGxpc3RIZWlnaHQgPCBtYXhIZWlnaHQgPyBsaXN0SGVpZ2h0IDogbWF4SGVpZ2h0KTtcblxuICAgICAgICBpZiAoc2Nyb2xsQmFyLmlzVmFsaWQoKSkge1xuICAgICAgICAgICAgaWYgKGJ1ZmZlclRvcCl7XG4gICAgICAgICAgICAgICAgYnVmZmVyVG9wLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChidWZmZXJCb3R0b20pe1xuICAgICAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHdyYXBOb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ2hlaWdodCcpO1xuICAgIH1cblxuICAgIGlmIChpbmlkTm9kZSl7XG4gICAgICAgIGluaWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkFycm93Qk1heCk7XG4gICAgfVxufTtcblxuR3JvdXAucHJvdG90eXBlLm9uR3JvdXBTaXplVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICBpZiAodGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIHRoaXMuX3Njcm9sbEJhci51cGRhdGUoKTtcbiAgICB9XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuYWRkU3ViR3JvdXAgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgdGhpcy5fc3ViR3JvdXBzLnB1c2gobmV3IFN1Ykdyb3VwKHRoaXMsIHBhcmFtcykpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuR3JvdXAucHJvdG90eXBlLl9nZXRTdWJHcm91cCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ViR3JvdXBzID0gdGhpcy5fc3ViR3JvdXBzO1xuICAgIGlmIChzdWJHcm91cHMubGVuZ3RoID09IDApe1xuICAgICAgICBzdWJHcm91cHMucHVzaChuZXcgU3ViR3JvdXAodGhpcykpO1xuICAgIH1cbiAgICByZXR1cm4gc3ViR3JvdXBzW3N1Ykdyb3Vwcy5sZW5ndGggLSAxXTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5nZXRDb21wb25lbnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9jb21wb25lbnRzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHcm91cDtcbiIsInZhciBHcm91cEV2ZW50ID0ge1xuXHRHUk9VUF9TSVpFX0NIQU5HRSAgICAgICAgOiAnZ3JvdXBTaXplQ2hhbmdlJyxcblx0R1JPVVBfTElTVF9TSVpFX0NIQU5HRSAgIDogJ2dyb3VwTGlzdFNpemVDaGFuZ2UnLFxuXHRHUk9VUF9TSVpFX1VQREFURSAgICAgICAgOiAnZ3JvdXBTaXplVXBkYXRlJyxcblx0U1VCR1JPVVBfVFJJR0dFUiAgICAgICAgIDogJ3N1Ykdyb3VwVHJpZ2dlcicsXG5cblx0U1VCR1JPVVBfRU5BQkxFICAgICAgICAgIDogJ2VuYWJsZVN1Ykdyb3VwJyxcblx0U1VCR1JPVVBfRElTQUJMRSAgICAgICAgIDogJ2Rpc2FibGVTdWJHcm91cCdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR3JvdXBFdmVudDsiLCJ2YXIgTWVudUV2ZW50ID0ge1xuXHRVUERBVEVfTUVOVTogJ3VwZGF0ZU1lbnUnXG59O1xubW9kdWxlLmV4cG9ydHMgPSBNZW51RXZlbnQ7IiwidmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKSxcbiAgICBHcm91cCA9IHJlcXVpcmUoJy4vR3JvdXAnKSxcbiAgICBTY3JvbGxCYXIgPSByZXF1aXJlKCcuLi9jb3JlL2xheW91dC9TY3JvbGxCYXInKTtcblxudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTGF5b3V0TW9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvbGF5b3V0L0xheW91dE1vZGUnKTtcbnZhciBIaXN0b3J5ID0gcmVxdWlyZSgnLi4vY29yZS9IaXN0b3J5Jyk7XG5cbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuICAgIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBQYW5lbEV2ZW50ID0gcmVxdWlyZSgnLi9QYW5lbEV2ZW50JyksXG4gICAgTWVudUV2ZW50ID0gcmVxdWlyZSgnLi9NZW51RXZlbnQnKTtcblxudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xuXG52YXIgU3RyaW5nSW5wdXQgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvU3RyaW5nSW5wdXQnKSxcbiAgICBOdW1iZXJJbnB1dCA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9OdW1iZXJJbnB1dCcpLFxuICAgIFJhbmdlID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1JhbmdlJyksXG4gICAgQ2hlY2tib3ggPSByZXF1aXJlKCcuLi9jb21wb25lbnQvQ2hlY2tib3gnKSxcbiAgICBDb2xvciA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9Db2xvcicpLFxuICAgIEJ1dHRvbiA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9CdXR0b24nKSxcbiAgICBTZWxlY3QgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvU2VsZWN0JyksXG4gICAgU2xpZGVyID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1NsaWRlcicpLFxuICAgIEZ1bmN0aW9uUGxvdHRlciA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9GdW5jdGlvblBsb3R0ZXInKSxcbiAgICBQYWQgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvUGFkJyksXG4gICAgVmFsdWVQbG90dGVyID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1ZhbHVlUGxvdHRlcicpLFxuICAgIE51bWJlck91dHB1dCA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9OdW1iZXJPdXRwdXQnKSxcbiAgICBTdHJpbmdPdXRwdXQgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvU3RyaW5nT3V0cHV0JyksXG4gICAgQ2FudmFzXyA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9DYW52YXMnKSxcbiAgICBTVkdfID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L1NWRycpO1xuXG52YXIgREVGQVVMVF9QQU5FTF9QT1NJVElPTiA9IG51bGwsXG4gICAgREVGQVVMVF9QQU5FTF9XSURUSCAgICAgID0gMzAwLFxuICAgIERFRkFVTFRfUEFORUxfSEVJR0hUICAgICA9IG51bGwsXG4gICAgREVGQVVMVF9QQU5FTF9XSURUSF9NSU4gID0gMTAwLFxuICAgIERFRkFVTFRfUEFORUxfV0lEVEhfTUFYICA9IDYwMCxcbiAgICBERUZBVUxUX1BBTkVMX1JBVElPICAgICAgPSA0MCxcbiAgICBERUZBVUxUX1BBTkVMX0xBQkVMICAgICAgPSAnQ29udHJvbCBQYW5lbCcsXG4gICAgREVGQVVMVF9QQU5FTF9WQUxJR04gICAgID0gTGF5b3V0TW9kZS5UT1AsXG4gICAgREVGQVVMVF9QQU5FTF9BTElHTiAgICAgID0gTGF5b3V0TW9kZS5SSUdIVCxcbiAgICBERUZBVUxUX1BBTkVMX0RPQ0sgICAgICAgPSB7YWxpZ246TGF5b3V0TW9kZS5SSUdIVCxyZXNpemFibGU6dHJ1ZX0sXG4gICAgREVGQVVMVF9QQU5FTF9FTkFCTEUgICAgID0gdHJ1ZSxcbiAgICBERUZBVUxUX1BBTkVMX09QQUNJVFkgICAgPSAxLjAsXG4gICAgREVGQVVMVF9QQU5FTF9GSVhFRCAgICAgID0gdHJ1ZSxcbiAgICBERUZBVUxUX1BBTkVMX1ZDT05TVFJBSU4gPSB0cnVlO1xuXG5mdW5jdGlvbiBQYW5lbChjb250cm9sS2l0LHBhcmFtcyl7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcbiAgICB0aGlzLl9wYXJlbnQgPSBjb250cm9sS2l0O1xuXG5cbiAgICBwYXJhbXMgICAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLnZhbGlnbiAgICAgPSBwYXJhbXMudmFsaWduICAgIHx8IERFRkFVTFRfUEFORUxfVkFMSUdOO1xuICAgIHBhcmFtcy5hbGlnbiAgICAgID0gcGFyYW1zLmFsaWduICAgICB8fCBERUZBVUxUX1BBTkVMX0FMSUdOO1xuICAgIHBhcmFtcy5wb3NpdGlvbiAgID0gcGFyYW1zLnBvc2l0aW9uICB8fCBERUZBVUxUX1BBTkVMX1BPU0lUSU9OO1xuICAgIHBhcmFtcy53aWR0aCAgICAgID0gcGFyYW1zLndpZHRoICAgICB8fCBERUZBVUxUX1BBTkVMX1dJRFRIO1xuICAgIHBhcmFtcy5oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCAgICB8fCBERUZBVUxUX1BBTkVMX0hFSUdIVDtcbiAgICBwYXJhbXMucmF0aW8gICAgICA9IHBhcmFtcy5yYXRpbyAgICAgfHwgREVGQVVMVF9QQU5FTF9SQVRJTztcbiAgICBwYXJhbXMubGFiZWwgICAgICA9IHBhcmFtcy5sYWJlbCAgICAgfHwgREVGQVVMVF9QQU5FTF9MQUJFTDtcbiAgICBwYXJhbXMub3BhY2l0eSAgICA9IHBhcmFtcy5vcGFjaXR5ICAgfHwgREVGQVVMVF9QQU5FTF9PUEFDSVRZO1xuICAgIHBhcmFtcy5maXhlZCAgICAgID0gcGFyYW1zLmZpeGVkICAgICAgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxfRklYRUQgICAgICA6IHBhcmFtcy5maXhlZDtcbiAgICBwYXJhbXMuZW5hYmxlICAgICA9IHBhcmFtcy5lbmFibGUgICAgID09PSB1bmRlZmluZWQgPyBERUZBVUxUX1BBTkVMX0VOQUJMRSAgICAgOiBwYXJhbXMuZW5hYmxlO1xuICAgIHBhcmFtcy52Y29uc3RyYWluID0gcGFyYW1zLnZjb25zdHJhaW4gPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxfVkNPTlNUUkFJTiA6IHBhcmFtcy52Y29uc3RyYWluO1xuXG4gICAgaWYgKHBhcmFtcy5kb2NrKSB7XG4gICAgICAgIHBhcmFtcy5kb2NrLmFsaWduID0gcGFyYW1zLmRvY2suYWxpZ24gfHwgREVGQVVMVF9QQU5FTF9ET0NLLmFsaWduO1xuICAgICAgICBwYXJhbXMuZG9jay5yZXNpemFibGUgPSBwYXJhbXMuZG9jay5yZXNpemFibGUgfHwgREVGQVVMVF9QQU5FTF9ET0NLLnJlc2l6YWJsZTtcbiAgICB9XG5cbiAgICB0aGlzLl93aWR0aCAgICAgID0gTWF0aC5tYXgoREVGQVVMVF9QQU5FTF9XSURUSF9NSU4sXG4gICAgICAgICAgICAgICAgICAgICAgIE1hdGgubWluKHBhcmFtcy53aWR0aCxERUZBVUxUX1BBTkVMX1dJRFRIX01BWCkpO1xuICAgIHRoaXMuX2hlaWdodCAgICAgPSBwYXJhbXMuaGVpZ2h0ID8gIE1hdGgubWF4KDAsTWF0aC5taW4ocGFyYW1zLmhlaWdodCx3aW5kb3cuaW5uZXJIZWlnaHQpKSA6IG51bGw7XG4gICAgdGhpcy5fZml4ZWQgICAgICA9IHBhcmFtcy5maXhlZDtcbiAgICB0aGlzLl9kb2NrICAgICAgID0gcGFyYW1zLmRvY2s7XG4gICAgdGhpcy5fcG9zaXRpb24gICA9IHBhcmFtcy5wb3NpdGlvbjtcbiAgICB0aGlzLl92Q29uc3RyYWluID0gcGFyYW1zLnZjb25zdHJhaW47XG4gICAgdGhpcy5fbGFiZWwgICAgICA9IHBhcmFtcy5sYWJlbDtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gIXBhcmFtcy5lbmFibGU7XG4gICAgdGhpcy5fZ3JvdXBzICAgICA9IFtdO1xuXG5cbiAgICB2YXIgd2lkdGggICAgPSB0aGlzLl93aWR0aCxcbiAgICAgICAgaXNGaXhlZCAgPSB0aGlzLl9maXhlZCxcbiAgICAgICAgZG9jayAgICAgPSB0aGlzLl9kb2NrLFxuICAgICAgICBwb3NpdGlvbiA9IHRoaXMuX3Bvc2l0aW9uLFxuICAgICAgICBsYWJlbCAgICA9IHRoaXMuX2xhYmVsLFxuICAgICAgICBhbGlnbiAgICA9IHBhcmFtcy5hbGlnbixcbiAgICAgICAgb3BhY2l0eSAgPSBwYXJhbXMub3BhY2l0eTtcblxuXG4gICAgdmFyIHJvb3ROb2RlICA9IHRoaXMuX25vZGUgICAgID0gbmV3IE5vZGUoKSxcbiAgICAgICAgaGVhZE5vZGUgID0gdGhpcy5faGVhZE5vZGUgPSBuZXcgTm9kZSgpLFxuICAgICAgICBtZW51Tm9kZSAgPSAgICAgICAgICAgICAgICAgIG5ldyBOb2RlKCksXG4gICAgICAgIGxhYmxXcmFwICA9ICAgICAgICAgICAgICAgICAgbmV3IE5vZGUoKSxcbiAgICAgICAgbGFibE5vZGUgID0gICAgICAgICAgICAgICAgICBuZXcgTm9kZShOb2RlLlNQQU4pLFxuICAgICAgICB3cmFwTm9kZSAgPSB0aGlzLl93cmFwTm9kZSA9IG5ldyBOb2RlKE5vZGUuRElWKSxcbiAgICAgICAgbGlzdE5vZGUgID0gdGhpcy5fbGlzdE5vZGUgPSBuZXcgTm9kZShOb2RlLkxJU1QpO1xuXG4gICAgICAgIHJvb3ROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLlBhbmVsKTtcbiAgICAgICAgaGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG4gICAgICAgIG1lbnVOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnUpO1xuICAgICAgICBsYWJsV3JhcC5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcbiAgICAgICAgbGFibE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpO1xuICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcbiAgICAgICAgbGlzdE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuR3JvdXBMaXN0KTtcblxuICAgICAgICByb290Tm9kZS5zZXRXaWR0aCh3aWR0aCk7XG4gICAgICAgIGxhYmxOb2RlLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLGxhYmVsKTtcblxuICAgICAgICBoZWFkTm9kZS5hZGRDaGlsZChtZW51Tm9kZSk7XG4gICAgICAgIGxhYmxXcmFwLmFkZENoaWxkKGxhYmxOb2RlKTtcbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGQobGFibFdyYXApO1xuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChsaXN0Tm9kZSk7XG4gICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKGhlYWROb2RlKTtcbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQod3JhcE5vZGUpO1xuXG4gICAgICAgIGNvbnRyb2xLaXQuZ2V0Tm9kZSgpLmFkZENoaWxkKHJvb3ROb2RlKTtcblxuXG4gICAgaWYgKCFkb2NrKSB7XG5cbiAgICAgICAgdmFyIG1lbnVIaWRlID0gdGhpcy5fbWVudUhpZGUgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG4gICAgICAgICAgICBtZW51SGlkZS5zZXRTdHlsZUNsYXNzKENTUy5NZW51QnRuSGlkZSk7XG4gICAgICAgICAgICBtZW51SGlkZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbk1lbnVIaWRlTW91c2VEb3duLmJpbmQodGhpcykpO1xuXG4gICAgICAgIG1lbnVOb2RlLmFkZENoaWxkKG1lbnVIaWRlKTtcblxuICAgICAgICBpZiAodGhpcy5fcGFyZW50LnBhbmVsc0FyZUNsb3NhYmxlKCkpIHtcbiAgICAgICAgICAgIHZhciBtZW51Q2xvc2UgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG4gICAgICAgICAgICBtZW51Q2xvc2Uuc2V0U3R5bGVDbGFzcyhDU1MuTWVudUJ0bkNsb3NlKTtcbiAgICAgICAgICAgIG1lbnVDbG9zZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLmRpc2FibGUuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgICAgIG1lbnVOb2RlLmFkZENoaWxkKG1lbnVDbG9zZSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmICh0aGlzLmhhc01heEhlaWdodCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9hZGRTY3JvbGxXcmFwKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzRml4ZWQpIHtcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIGlmIChhbGlnbiA9PSBMYXlvdXRNb2RlLkxFRlQgfHxcbiAgICAgICAgICAgICAgICAgICAgYWxpZ24gPT0gTGF5b3V0TW9kZS5UT1AgfHxcbiAgICAgICAgICAgICAgICAgICAgYWxpZ24gPT0gTGF5b3V0TW9kZS5CT1RUT00pIHtcbiAgICAgICAgICAgICAgICAgICAgcm9vdE5vZGUuc2V0UG9zaXRpb25HbG9iYWwocG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJvb3ROb2RlLnNldFBvc2l0aW9uR2xvYmFsKHdpbmRvdy5pbm5lcldpZHRoIC0gd2lkdGggLSBwb3NpdGlvblswXSwgcG9zaXRpb25bMV0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wb3NpdGlvbiA9IHJvb3ROb2RlLmdldFBvc2l0aW9uKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB0aGlzLl9wb3NpdGlvbiA9IHJvb3ROb2RlLmdldFBvc2l0aW9uKCk7XG5cbiAgICAgICAgICAgIHRoaXMuX21vdXNlT2Zmc2V0ID0gWzAsIDBdO1xuXG4gICAgICAgICAgICByb290Tm9kZS5zZXRTdHlsZVByb3BlcnR5KCdwb3NpdGlvbicsICdhYnNvbHV0ZScpO1xuICAgICAgICAgICAgaGVhZE5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25IZWFkRHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvc2l0aW9uWCA9IHBvc2l0aW9uWzBdLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvblkgPSBwb3NpdGlvblsxXTtcblxuICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvblkgIT0gMClyb290Tm9kZS5zZXRQb3NpdGlvblkocG9zaXRpb25ZKTtcbiAgICAgICAgICAgICAgICBpZiAocG9zaXRpb25YICE9IDApaWYgKGFsaWduID09IExheW91dE1vZGUuUklHSFQpcm9vdE5vZGUuZ2V0RWxlbWVudCgpLm1hcmdpblJpZ2h0ID0gcG9zaXRpb25YO1xuICAgICAgICAgICAgICAgIGVsc2Ugcm9vdE5vZGUuc2V0UG9zaXRpb25YKHBvc2l0aW9uWCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJvb3ROb2RlLnNldFN0eWxlUHJvcGVydHkoJ2Zsb2F0JywgYWxpZ24pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgZG9ja0FsaWdubWVudCA9IGRvY2suYWxpZ247XG5cbiAgICAgICAgaWYgKGRvY2tBbGlnbm1lbnQgPT0gTGF5b3V0TW9kZS5MRUZUIHx8XG4gICAgICAgICAgICBkb2NrQWxpZ25tZW50ID09IExheW91dE1vZGUuUklHSFQpIHtcbiAgICAgICAgICAgIGFsaWduID0gZG9ja0FsaWdubWVudDtcbiAgICAgICAgICAgIHRoaXMuX2hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkb2NrQWxpZ25tZW50ID09IExheW91dE1vZGUuVE9QIHx8XG4gICAgICAgICAgICBkb2NrQWxpZ25tZW50ID09IExheW91dE1vZGUuQk9UVE9NKSB7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIC8qXG4gICAgICAgICBpZihkb2NrLnJlc2l6YWJsZSlcbiAgICAgICAgIHtcbiAgICAgICAgIHZhciBzaXplSGFuZGxlID0gbmV3IENvbnRyb2xLaXQuTm9kZShDb250cm9sS2l0Lk5vZGVUeXBlLkRJVik7XG4gICAgICAgICBzaXplSGFuZGxlLnNldFN0eWxlQ2xhc3MoQ29udHJvbEtpdC5DU1MuU2l6ZUhhbmRsZSk7XG4gICAgICAgICByb290Tm9kZS5hZGRDaGlsZChzaXplSGFuZGxlKTtcbiAgICAgICAgIH1cbiAgICAgICAgICovXG5cbiAgICAgICAgcm9vdE5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZmxvYXQnLCBhbGlnbik7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BhcmVudC5oaXN0b3J5SXNFbmFibGVkKCkpIHtcbiAgICAgICAgdmFyIG1lbnVVbmRvID0gdGhpcy5fbWVudVVuZG8gPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTik7XG4gICAgICAgICAgICBtZW51VW5kby5zZXRTdHlsZUNsYXNzKENTUy5NZW51QnRuVW5kbyk7XG4gICAgICAgICAgICBtZW51VW5kby5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIG1lbnVVbmRvLnNldFByb3BlcnR5KCd2YWx1ZScsIEhpc3RvcnkuZ2V0SW5zdGFuY2UoKS5nZXROdW1TdGF0ZXMoKSk7XG4gICAgICAgICAgICBtZW51Tm9kZS5hZGRDaGlsZEF0KG1lbnVVbmRvLCAwKTtcblxuICAgICAgICAgICAgbWVudVVuZG8uYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25NZW51VW5kb1RyaWdnZXIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBoZWFkTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9PVkVSLCB0aGlzLl9vbkhlYWRNb3VzZU92ZXIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBoZWFkTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9PVVQsIHRoaXMuX29uSGVhZE1vdXNlT3V0LmJpbmQodGhpcykpXG4gICAgfVxuXG4gICAgaWYgKG9wYWNpdHkgIT0gMS4wICYmIG9wYWNpdHkgIT0gMC4wKSB7XG4gICAgICAgIHJvb3ROb2RlLnNldFN0eWxlUHJvcGVydHkoJ29wYWNpdHknLCBvcGFjaXR5KTtcbiAgICB9XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihNZW51RXZlbnQuVVBEQVRFX01FTlUsICAgICAgdGhpcywgJ29uVXBkYXRlTWVudScpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSx0aGlzLl9vbldpbmRvd1Jlc2l6ZS5iaW5kKHRoaXMpKTtcbn1cblxuUGFuZWwucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblxuXG5QYW5lbC5wcm90b3R5cGUuX29uTWVudUhpZGVNb3VzZURvd24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9ICF0aGlzLl9pc0Rpc2FibGVkO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcm9vdE5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICBoZWFkTm9kZSA9IHRoaXMuX2hlYWROb2RlLFxuICAgICAgICBtZW51SGlkZSA9IHRoaXMuX21lbnVIaWRlO1xuXG4gICAgaWYgKHRoaXMuX2lzRGlzYWJsZWQpIHtcbiAgICAgICAgaGVhZE5vZGUuZ2V0U3R5bGUoKS5ib3JkZXJCb3R0b20gPSAnbm9uZSc7XG5cbiAgICAgICAgcm9vdE5vZGUuc2V0SGVpZ2h0KGhlYWROb2RlLmdldEhlaWdodCgpKTtcbiAgICAgICAgbWVudUhpZGUuc2V0U3R5bGVDbGFzcyhDU1MuTWVudUJ0blNob3cpO1xuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfSElERSwgbnVsbCkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcm9vdE5vZGUuc2V0SGVpZ2h0KGhlYWROb2RlLmdldEhlaWdodCgpICsgdGhpcy5fd3JhcE5vZGUuZ2V0SGVpZ2h0KCkpO1xuICAgICAgICByb290Tm9kZS5kZWxldGVTdHlsZVByb3BlcnR5KCdoZWlnaHQnKTtcbiAgICAgICAgbWVudUhpZGUuc2V0U3R5bGVDbGFzcyhDU1MuTWVudUJ0bkhpZGUpO1xuICAgICAgICBoZWFkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkKTtcblxuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NIT1csIG51bGwpKTtcbiAgICB9XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX29uSGVhZE1vdXNlT3ZlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9tZW51VW5kby5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2lubGluZScpXG59O1xuUGFuZWwucHJvdG90eXBlLl9vbkhlYWRNb3VzZU91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9tZW51VW5kby5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKVxufTtcblBhbmVsLnByb3RvdHlwZS5vblVwZGF0ZU1lbnUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fbWVudVVuZG8uc2V0UHJvcGVydHkoJ3ZhbHVlJywgSGlzdG9yeS5nZXRJbnN0YW5jZSgpLmdldE51bVN0YXRlcygpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fb25NZW51VW5kb1RyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgSGlzdG9yeS5nZXRJbnN0YW5jZSgpLnBvcFN0YXRlKCk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX29uSGVhZERyYWdTdGFydCA9IGZ1bmN0aW9uKClcbntcbiAgICB2YXIgcGFyZW50Tm9kZSA9IHRoaXMuX3BhcmVudC5nZXROb2RlKCksXG4gICAgICAgIG5vZGUgICAgICAgPSB0aGlzLl9ub2RlO1xuXG4gICAgdmFyIG5vZGVQb3MgICA9IG5vZGUuZ2V0UG9zaXRpb25HbG9iYWwoKSxcbiAgICAgICAgbW91c2VQb3MgID0gTW91c2UuZ2V0SW5zdGFuY2UoKS5nZXRQb3NpdGlvbigpLFxuICAgICAgICBvZmZzZXRQb3MgPSB0aGlzLl9tb3VzZU9mZnNldDtcblxuICAgICAgICBvZmZzZXRQb3NbMF0gPSBtb3VzZVBvc1swXSAtIG5vZGVQb3NbMF07XG4gICAgICAgIG9mZnNldFBvc1sxXSA9IG1vdXNlUG9zWzFdIC0gbm9kZVBvc1sxXTtcblxuICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRNb3VzZVVwICAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuX3VwZGF0ZVBvc2l0aW9uKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCBudWxsKSk7XG4gICAgICAgIH07XG5cbiAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGQoICAgbm9kZSk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsICAgIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgICBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0JFR0lOLG51bGwpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fdXBkYXRlUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG1vdXNlUG9zID0gTW91c2UuZ2V0SW5zdGFuY2UoKS5nZXRQb3NpdGlvbigpLFxuICAgICAgICBvZmZzZXRQb3MgPSB0aGlzLl9tb3VzZU9mZnNldDtcblxuICAgIHZhciBwb3NpdGlvbiA9IHRoaXMuX3Bvc2l0aW9uO1xuICAgIHBvc2l0aW9uWzBdID0gbW91c2VQb3NbMF0gLSBvZmZzZXRQb3NbMF07XG4gICAgcG9zaXRpb25bMV0gPSBtb3VzZVBvc1sxXSAtIG9mZnNldFBvc1sxXTtcblxuICAgIHRoaXMuX2NvbnN0cmFpbkhlaWdodCgpO1xuICAgIHRoaXMuX2NvbnN0cmFpblBvc2l0aW9uKCk7XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkUsIG51bGwpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fb25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNEb2NrZWQoKSkge1xuICAgICAgICB2YXIgZG9jayA9IHRoaXMuX2RvY2s7XG5cbiAgICAgICAgaWYgKGRvY2suYWxpZ24gPT0gTGF5b3V0TW9kZS5SSUdIVCB8fFxuICAgICAgICAgICAgZG9jay5hbGlnbiA9PSBMYXlvdXRNb2RlLkxFRlQpIHtcbiAgICAgICAgICAgIHZhciB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQsXG4gICAgICAgICAgICAgICAgbGlzdEhlaWdodCA9IHRoaXMuX2xpc3ROb2RlLmdldEhlaWdodCgpLFxuICAgICAgICAgICAgICAgIGhlYWRIZWlnaHQgPSB0aGlzLl9oZWFkTm9kZS5nZXRIZWlnaHQoKTtcblxuICAgICAgICAgICAgdGhpcy5faGVpZ2h0ID0gd2luZG93SGVpZ2h0O1xuXG4gICAgICAgICAgICBpZiAoKHdpbmRvd0hlaWdodCAtIGhlYWRIZWlnaHQpID4gbGlzdEhlaWdodCl7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLmRpc2FibGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLmVuYWJsZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NJWkVfQ0hBTkdFKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmICghdGhpcy5pc0ZpeGVkKCkpe1xuICAgICAgICAgICAgdGhpcy5fY29uc3RyYWluUG9zaXRpb24oKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9jb25zdHJhaW5IZWlnaHQoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fY29uc3RyYWluUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlO1xuXG4gICAgdmFyIG1heFggPSB3aW5kb3cuaW5uZXJXaWR0aCAtIG5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgbWF4WSA9IHdpbmRvdy5pbm5lckhlaWdodCAtIG5vZGUuZ2V0SGVpZ2h0KCk7XG5cbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbjtcbiAgICBwb3NpdGlvblswXSA9IE1hdGgubWF4KDAsIE1hdGgubWluKHBvc2l0aW9uWzBdLCBtYXhYKSk7XG4gICAgcG9zaXRpb25bMV0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihwb3NpdGlvblsxXSwgbWF4WSkpO1xuXG4gICAgbm9kZS5zZXRQb3NpdGlvbkdsb2JhbChwb3NpdGlvblswXSwgcG9zaXRpb25bMV0pO1xufTtcblxuUGFuZWwucHJvdG90eXBlLl9jb25zdHJhaW5IZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl92Q29uc3RyYWluKXJldHVybjtcblxuICAgIHZhciBoYXNNYXhIZWlnaHQgPSB0aGlzLmhhc01heEhlaWdodCgpLFxuICAgICAgICBoYXNTY3JvbGxXcmFwID0gdGhpcy5oYXNTY3JvbGxXcmFwKCk7XG5cbiAgICB2YXIgaGVhZE5vZGUgPSB0aGlzLl9oZWFkTm9kZSxcbiAgICAgICAgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcblxuICAgIHZhciBzY3JvbGxCYXIgPSB0aGlzLl9zY3JvbGxCYXI7XG5cbiAgICB2YXIgcGFuZWxUb3AgPSB0aGlzLmlzRG9ja2VkKCkgPyAwIDpcbiAgICAgICAgdGhpcy5pc0ZpeGVkKCkgPyAwIDpcbiAgICAgICAgICAgIHRoaXMuX3Bvc2l0aW9uWzFdO1xuXG4gICAgdmFyIHBhbmVsSGVpZ2h0ID0gaGFzTWF4SGVpZ2h0ID8gdGhpcy5nZXRNYXhIZWlnaHQoKSA6XG4gICAgICAgIGhhc1Njcm9sbFdyYXAgPyBzY3JvbGxCYXIuZ2V0VGFyZ2V0Tm9kZSgpLmdldEhlaWdodCgpIDpcbiAgICAgICAgICAgIHdyYXBOb2RlLmdldEhlaWdodCgpO1xuXG4gICAgdmFyIHBhbmVsQm90dG9tID0gcGFuZWxUb3AgKyBwYW5lbEhlaWdodDtcbiAgICB2YXIgaGVhZEhlaWdodCA9IGhlYWROb2RlLmdldEhlaWdodCgpO1xuXG4gICAgdmFyIHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCxcbiAgICAgICAgaGVpZ2h0RGlmZiA9IHdpbmRvd0hlaWdodCAtIHBhbmVsQm90dG9tIC0gaGVhZEhlaWdodCxcbiAgICAgICAgaGVpZ2h0U3VtO1xuXG4gICAgaWYgKGhlaWdodERpZmYgPCAwLjApIHtcbiAgICAgICAgaGVpZ2h0U3VtID0gcGFuZWxIZWlnaHQgKyBoZWlnaHREaWZmO1xuXG4gICAgICAgIGlmICghaGFzU2Nyb2xsV3JhcCkge1xuICAgICAgICAgICAgdGhpcy5fYWRkU2Nyb2xsV3JhcChoZWlnaHRTdW0pO1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9TQ1JPTExfV1JBUF9BRERFRCwgbnVsbCkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgc2Nyb2xsQmFyLnNldFdyYXBIZWlnaHQoaGVpZ2h0U3VtKTtcbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KGhlaWdodFN1bSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAoIWhhc01heEhlaWdodCAmJiBoYXNTY3JvbGxXcmFwKSB7XG4gICAgICAgICAgICBzY3JvbGxCYXIucmVtb3ZlRnJvbVBhcmVudCgpO1xuICAgICAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQodGhpcy5fbGlzdE5vZGUpO1xuICAgICAgICAgICAgd3JhcE5vZGUuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XG5cbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbEJhciA9IG51bGw7XG5cbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfU0NST0xMX1dSQVBfUkVNT1ZFRCwgbnVsbCkpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuUGFuZWwucHJvdG90eXBlLm9uR3JvdXBMaXN0U2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5oYXNTY3JvbGxXcmFwKCkpe1xuICAgICAgICB0aGlzLl91cGRhdGVTY3JvbGxXcmFwKCk7XG4gICAgfVxuICAgIHRoaXMuX2NvbnN0cmFpbkhlaWdodCgpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLl91cGRhdGVTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICBzY3JvbGxCYXIgPSB0aGlzLl9zY3JvbGxCYXIsXG4gICAgICAgIGhlaWdodCA9IHRoaXMuaGFzTWF4SGVpZ2h0KCkgP1xuICAgICAgICAgICAgdGhpcy5nZXRNYXhIZWlnaHQoKSA6IDEwMCxcbiAgICAgICAgbGlzdEhlaWdodCA9IHRoaXMuX2xpc3ROb2RlLmdldEhlaWdodCgpO1xuXG4gICAgd3JhcE5vZGUuc2V0SGVpZ2h0KGxpc3RIZWlnaHQgPCBoZWlnaHQgPyBsaXN0SGVpZ2h0IDogaGVpZ2h0KTtcblxuICAgIHNjcm9sbEJhci51cGRhdGUoKTtcblxuICAgIGlmICghc2Nyb2xsQmFyLmlzVmFsaWQoKSkge1xuICAgICAgICBzY3JvbGxCYXIuZGlzYWJsZSgpO1xuICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQod3JhcE5vZGUuZ2V0Q2hpbGRBdCgxKS5nZXRIZWlnaHQoKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzY3JvbGxCYXIuZW5hYmxlKCk7XG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodChoZWlnaHQpO1xuICAgIH1cbn07XG5cblBhbmVsLnByb3RvdHlwZS5fYWRkU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZSxcbiAgICAgICAgaGVpZ2h0ID0gYXJndW1lbnRzLmxlbmd0aCA9PSAwID9cbiAgICAgICAgICAgIHRoaXMuZ2V0TWF4SGVpZ2h0KCkgOlxuICAgICAgICAgICAgYXJndW1lbnRzWzBdO1xuXG4gICAgdGhpcy5fc2Nyb2xsQmFyID0gbmV3IFNjcm9sbEJhcih3cmFwTm9kZSwgbGlzdE5vZGUsIGhlaWdodCk7XG4gICAgaWYgKHRoaXMuaXNFbmFibGVkKCkpe1xuICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQoaGVpZ2h0KTtcbiAgICB9XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaGFzU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2Nyb2xsQmFyICE9IG51bGw7XG59O1xuXG5cblBhbmVsLnByb3RvdHlwZS5wcmV2ZW50U2VsZWN0RHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuaGFzU2Nyb2xsV3JhcCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl93cmFwTm9kZS5nZXRFbGVtZW50KCkuc2Nyb2xsVG9wID0gMDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5cblxuUGFuZWwucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gdHJ1ZTtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhdGhpcy5faXNEaXNhYmxlZDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5pc0Rpc2FibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9pc0Rpc2FibGVkO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmhhc01heEhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faGVpZ2h0ICE9IG51bGw7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0TWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaXNEb2NrZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2RvY2s7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaXNGaXhlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fZml4ZWQ7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0R3JvdXBzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9ncm91cHM7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbm9kZTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRMaXN0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9saXN0Tm9kZTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRXaWR0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fd2lkdGg7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0UG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvc2l0aW9uO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmdldFBhcmVudCA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuX3BhcmVudDtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBHcm91cCB0byB0aGUgUGFuZWwuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBHcm91cCBvcHRpb25zLlxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9J0NvbnRyb2wgUGFuZWwnXSAtIFRoZSBHcm91cCBsYWJlbCBzdHJpbmcuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtwYXJhbXMudXNlTGFiZWw9dHJ1ZV0gLSBUcmlnZ2VyIHdoZXRoZXIgYWxsIGNvbnRhaW5lZCBTdWJHcm91cHMgYW5kIENvbXBvbmVudHMgc2hvdWxkIHVzZSBsYWJlbHMuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtwYXJhbXMuZW5hYmxlPXRydWVdIC0gRGVmaW5lcyBpbml0aWFsIHN0YXRlIG9wZW4gLyBjbG9zZWQuXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5oZWlnaHQ9bnVsbF0gLSBEZWZpbmVzIGlmIHRoZSBoZWlnaHQgb2YgdGhlIEdyb3VwIHNob3VsZCBiZSBjb25zdHJhaW5lZCB0byBjZXJ0YWluIGhlaWdodC5cbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkR3JvdXAgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgdmFyIGdyb3VwID0gbmV3IEdyb3VwKHRoaXMsIHBhcmFtcyk7XG4gICAgdGhpcy5fZ3JvdXBzLnB1c2goZ3JvdXApO1xuICAgIGlmICh0aGlzLmlzRG9ja2VkKCkpe1xuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NJWkVfQ0hBTkdFKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFN1Ykdyb3VwIHRvIHRoZSBsYXN0IGFkZGVkIEdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gU3ViR3JvdXAgb3B0aW9ucy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPW51bGxdIC0gVGhlIFN1Ykdyb3VwIGxhYmVsIHN0cmluZy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy51c2VMYWJlbD10cnVlXSAtIFRyaWdnZXIgd2hldGhlciBhbGwgY29udGFpbmVkIFN1Ykdyb3VwcyBhbmQgQ29tcG9uZW50cyBzaG91bGQgdXNlIGxhYmVscy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy5lbmFibGU9dHJ1ZV0gLSBEZWZpbmVzIGluaXRpYWwgc3RhdGUgb3BlbiAvIGNsb3NlZC5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmhlaWdodD1udWxsXSAtIERlZmluZXMgaWYgdGhlIGhlaWdodCBvZiB0aGUgU3ViR3JvdXAgc2hvdWxkIGJlIGNvbnN0cmFpbmVkIHRvIGNlcnRhaW4gaGVpZ2h0LlxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRTdWJHcm91cCA9IGZ1bmN0aW9uKHBhcmFtcyl7XG4gICAgdmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcztcbiAgICBpZihncm91cHMubGVuZ3RoID09IDApe1xuICAgICAgICB0aGlzLmFkZEdyb3VwKCk7XG4gICAgfVxuICAgIGdyb3Vwc1tncm91cHMubGVuZ3RoIC0gMV0uYWRkU3ViR3JvdXAocGFyYW1zKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fYWRkQ29tcG9uZW50ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLFxuICAgICAgICBncm91cDtcbiAgICBpZihncm91cHMubGVuZ3RoID09IDApe1xuICAgICAgICBncm91cHMucHVzaChuZXcgR3JvdXAodGhpcykpO1xuICAgIH1cbiAgICBncm91cCA9IGdyb3Vwc1tncm91cHMubGVuZ3RoLTFdO1xuXG4gICAgZ3JvdXAuYWRkQ29tcG9uZW50LmFwcGx5KGdyb3VwLGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgU3RyaW5nSW5wdXQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0LlxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIFN0cmluZ0lucHV0IG9wdGlvbnMuXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBTdHJpbmdJbnB1dCBsYWJlbFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkNoYW5nZV0gLSBDYWxsYmFjayBvblxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRTdHJpbmdJbnB1dCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFN0cmluZ0lucHV0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IE51bWJlcklucHV0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9ucy5cbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkTnVtYmVySW5wdXQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChOdW1iZXJJbnB1dCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBSYW5nZSBpbnB1dCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3QuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5LlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFJhbmdlID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoUmFuZ2Usb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgQ2hlY2tib3ggdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0LlxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zLlxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRDaGVja2JveCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KENoZWNrYm94LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IENvbG9yIG1vZGlmaWVyIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9ucy5cbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkQ29sb3IgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChDb2xvcixvYmplY3QsdmFsdWUsIHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgQnV0dG9uIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge1N0cmluZ30gbGFiZWwgLSBUaGUgb2JqZWN0LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gb25QcmVzcyAtIENhbGxiYWNrLlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZEJ1dHRvbiA9IGZ1bmN0aW9uIChsYWJlbCwgb25QcmVzcywgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChCdXR0b24sbGFiZWwsb25QcmVzcyxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFNlbGVjdCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3QuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5LlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFNlbGVjdCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFNlbGVjdCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBTbGlkZXIgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0LlxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleS5cbiAqIEBwYXJhbSB7U3RyaW5nfSByYW5nZSAtIFRoZSBtaW4vbWF4IGFycmF5IGtleSB0byBiZSB1c2VkLlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFNsaWRlciA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCByYW5nZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChTbGlkZXIsb2JqZWN0LHZhbHVlLHJhbmdlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgRnVuY3Rpb25QbG90dGVyIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9ucy5cbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkRnVuY3Rpb25QbG90dGVyID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoRnVuY3Rpb25QbG90dGVyLG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFhZLVBhZCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3QuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5LlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFBhZCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFBhZCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBWYWx1ZVBsb3R0ZXIgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0LlxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zLlxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRWYWx1ZVBsb3R0ZXIgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChWYWx1ZVBsb3R0ZXIsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgTnVtYmVyT3V0cHV0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9ucy5cbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkTnVtYmVyT3V0cHV0ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoTnVtYmVyT3V0cHV0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFN0cmluZ091dHB1dCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3QuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5LlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFN0cmluZ091dHB1dCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFN0cmluZ091dHB1dCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5hZGRDYW52YXMgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChDYW52YXNfLHBhcmFtcyk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkU1ZHID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoU1ZHXyxwYXJhbXMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYW5lbDsiLCJ2YXIgUGFuZWxFdmVudCA9IHtcblx0UEFORUxfTU9WRV9CRUdJTiAgICAgICAgICA6ICdwYW5lbE1vdmVCZWdpbicsXG5cdFBBTkVMX01PVkUgICAgICAgICAgICAgICAgOiAncGFuZWxNb3ZlJyxcblx0UEFORUxfTU9WRV9FTkQgICAgICAgICAgICA6ICdwYW5lbE1vdmVFbmQnLFxuXG5cdFBBTkVMX1NIT1cgICAgICAgICAgICAgICAgOiAncGFuZWxTaG93Jyxcblx0UEFORUxfSElERSAgICAgICAgICAgICAgICA6ICdwYW5lbEhpZGUnLFxuXG5cdFBBTkVMX1NDUk9MTF9XUkFQX0FEREVEICAgOiAncGFuZWxTY3JvbGxXcmFwQWRkZWQnLFxuXHRQQU5FTF9TQ1JPTExfV1JBUF9SRU1PVkVEIDogJ3BhbmVsU2Nyb2xsV3JhcFJlbW92ZWQnLFxuXG5cdFBBTkVMX1NJWkVfQ0hBTkdFICAgICAgICA6ICdwYW5lbFNpemVDaGFuZ2UnXG59O1xubW9kdWxlLmV4cG9ydHMgPSBQYW5lbEV2ZW50OyIsInZhciBBYnN0cmFjdEdyb3VwID0gcmVxdWlyZSgnLi9BYnN0cmFjdEdyb3VwJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIFBhbmVsRXZlbnQgPSByZXF1aXJlKCcuL1BhbmVsRXZlbnQnKSxcbiAgICBHcm91cEV2ZW50ID0gcmVxdWlyZSgnLi9Hcm91cEV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIFN1Ykdyb3VwKHBhcmVudCxwYXJhbXMpe1xuICAgIHBhcmFtcyAgICAgICAgICAgID0gcGFyYW1zICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5sYWJlbCAgICAgID0gcGFyYW1zLmxhYmVsICAgIHx8IG51bGw7XG4gICAgcGFyYW1zLnVzZUxhYmVscyAgPSBwYXJhbXMudXNlTGFiZWxzICA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IHBhcmFtcy51c2VMYWJlbHM7XG5cbiAgICBBYnN0cmFjdEdyb3VwLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHZhciByb290Tm9kZSA9IHRoaXMuX25vZGUsXG4gICAgICAgIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIGxpc3ROb2RlID0gdGhpcy5fbGlzdE5vZGU7XG5cbiAgICAgICAgcm9vdE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU3ViR3JvdXApO1xuICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcblxuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChsaXN0Tm9kZSk7XG4gICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKHdyYXBOb2RlKTtcblxuICAgIHRoaXMuX3VzZUxhYmVscyAgPSBwYXJhbXMudXNlTGFiZWxzO1xuXG4gICAgdmFyIGxhYmVsID0gcGFyYW1zLmxhYmVsO1xuXG4gICAgaWYgKGxhYmVsICYmIGxhYmVsLmxlbmd0aCAhPSAwICYmIGxhYmVsICE9ICdub25lJykge1xuICAgICAgICB2YXIgaGVhZE5vZGUgPSB0aGlzLl9oZWFkTm9kZSA9IG5ldyBOb2RlKCksXG4gICAgICAgICAgICBsYWJsV3JhcCA9IG5ldyBOb2RlKCksXG4gICAgICAgICAgICBsYWJsTm9kZSA9IG5ldyBOb2RlKE5vZGUuU1BBTik7XG5cbiAgICAgICAgaGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG4gICAgICAgIGxhYmxXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuICAgICAgICBsYWJsTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XG5cbiAgICAgICAgbGFibE5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGxhYmVsKTtcblxuICAgICAgICBsYWJsV3JhcC5hZGRDaGlsZChsYWJsTm9kZSk7XG4gICAgICAgIGhlYWROb2RlLmFkZENoaWxkKGxhYmxXcmFwKTtcblxuXG4gICAgICAgIHZhciBpbmRpTm9kZSA9IHRoaXMuX2luZGlOb2RlID0gbmV3IE5vZGUoKTtcbiAgICAgICAgaW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCU3ViTWF4KTtcbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGRBdChpbmRpTm9kZSwgMCk7XG5cbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGRBdChoZWFkTm9kZSwgMCk7XG5cbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuU1VCR1JPVVBfVFJJR0dFUiwgdGhpcy5fcGFyZW50LCAnb25TdWJHcm91cFRyaWdnZXInKTtcbiAgICAgICAgaGVhZE5vZGUuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uSGVhZE1vdXNlRG93bi5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG5cbiAgICB9XG5cbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgdGhpcy5hZGRTY3JvbGxXcmFwKCk7XG4gICAgfVxuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5TVUJHUk9VUF9FTkFCTEUsICB0aGlzLCAnb25FbmFibGUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LlNVQkdST1VQX0RJU0FCTEUsIHRoaXMsICdvbkRpc2FibGUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCAgIHRoaXMsICdvblBhbmVsTW92ZUVuZCcpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsdGhpcywgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TSVpFX0NIQU5HRSx0aGlzLCAnb25QYW5lbFNpemVDaGFuZ2UnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsICAgIHRoaXMsICdvbldpbmRvd1Jlc2l6ZScpO1xuXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsdGhpcy5fcGFyZW50LCdvbkdyb3VwU2l6ZVVwZGF0ZScpO1xufVxuXG5TdWJHcm91cC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEFic3RyYWN0R3JvdXAucHJvdG90eXBlKTtcblxuLy9GSVhNRVxuU3ViR3JvdXAucHJvdG90eXBlLl9vbkhlYWRNb3VzZURvd24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9ICF0aGlzLl9pc0Rpc2FibGVkO1xuICAgIHRoaXMuX29uVHJpZ2dlcigpO1xuXG4gICAgdmFyIGV2ZW50ID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUCxcbiAgICAgICAgc2VsZiAgPSB0aGlzO1xuICAgIHZhciBvbkRvY3VtZW50TW91c2VVcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5fb25UcmlnZ2VyKCk7XG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIG9uRG9jdW1lbnRNb3VzZVVwKTtcbiAgICB9O1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudCxvbkRvY3VtZW50TW91c2VVcCk7XG59O1xuXG5TdWJHcm91cC5wcm90b3R5cGUuX29uVHJpZ2dlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLEdyb3VwRXZlbnQuU1VCR1JPVVBfVFJJR0dFUixudWxsKSk7XG59O1xuXG5cblN1Ykdyb3VwLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pc0Rpc2FibGVkKCkpIHtcbiAgICAgICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KDApO1xuICAgICAgICBpZiAodGhpcy5oYXNMYWJlbCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9oZWFkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkSW5hY3RpdmUpO1xuICAgICAgICAgICAgdGhpcy5faW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCU3ViTWluKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3dyYXBOb2RlLnNldEhlaWdodCh0aGlzLmdldE1heEhlaWdodCgpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3dyYXBOb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ2hlaWdodCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmhhc0xhYmVsKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2hlYWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpO1xuICAgICAgICAgICAgdGhpcy5faW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCU3ViTWF4KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblN1Ykdyb3VwLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICB0aGlzLl9zY3JvbGxCYXIudXBkYXRlKCk7XG4gICAgfVxufTtcblxuU3ViR3JvdXAucHJvdG90eXBlLm9uQ29tcG9uZW50U2VsZWN0RHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnByZXZlbnRTZWxlY3REcmFnKCk7XG59O1xuXG5TdWJHcm91cC5wcm90b3R5cGUub25FbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNEaXNhYmxlZCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5FTkFCTEUsIG51bGwpKTtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUub25EaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlzRGlzYWJsZWQoKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuRElTQUJMRSwgbnVsbCkpO1xufTtcblxuLy9idWJibGVcblN1Ykdyb3VwLnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCBudWxsKSk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLm9uR3JvdXBTaXplVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIG51bGwpKTtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUub25QYW5lbE1vdmVFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0VORCwgbnVsbCkpO1xufTtcblN1Ykdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLm9uV2luZG93UmVzaXplID0gZnVuY3Rpb24gKGUpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZSk7XG59O1xuXG5TdWJHcm91cC5wcm90b3R5cGUuaGFzTGFiZWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlYWROb2RlICE9IG51bGw7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLmFkZENvbXBvbmVudE5vZGUgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIHRoaXMuX2xpc3ROb2RlLmFkZENoaWxkKG5vZGUpO1xufTtcblN1Ykdyb3VwLnByb3RvdHlwZS51c2VzTGFiZWxzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl91c2VMYWJlbHM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN1Ykdyb3VwOyJdfQ==
(1)
});
