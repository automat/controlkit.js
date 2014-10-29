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

var DEFAULT_HISTORY = false,
    DEFAULT_OPACITY = 1.0;

function ControlKit_(params) {
    params = params || {};
    params.history = params.history === undefined ? DEFAULT_HISTORY : params.history;
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
        var css = !params.style ? _dereq_('./core/document/Style').string : params.styleString;
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

ControlKit_.prototype = Object.create(EventDispatcher.prototype);

ControlKit_.prototype._onTriggerDown = function () {
    this._node.setStyleProperty('visibility', this._isDisabled = !this._isDisabled ? 'hidden' : 'visible');
};

ControlKit_.prototype.addPanel = function (params) {
    var panel = new Panel(this, params);
    this._panels.push(panel);
    return panel;
};

ControlKit_.prototype.update = function () {
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

ControlKit_.prototype.historyIsEnabled = function () {
    return this._historyEnabled;
};

ControlKit_.prototype.enable = function () {
    this._isDisabled = false;
};

ControlKit_.prototype.disable = function () {
    this._isDisabled = true;
};

ControlKit_.prototype.disableAllPanels = function () {
    var i = -1, p = this._panels, l = p.length;
    while (++i < l){
        p[i].enable();
    }
};

ControlKit_.prototype.enableAllPanels = function () {
    var i = -1, p = this._panels, l = p.length;
    while (++i < l){
        p[i].disable();
    }
};

ControlKit_.prototype.onHistoryStatePush = function () {
    this.dispatchEvent(new Event_(this, MenuEvent.UPDATE_MENU, null));
};

ControlKit_.prototype.onHistoryStatePop = function () {
    this.dispatchEvent(new Event_(this, ComponentEvent.UPDATE_VALUE, {origin: null}));
    this.dispatchEvent(new Event_(this, MenuEvent.UPDATE_MENU, null));
};

ControlKit_.prototype.getNode = function () {
    return this._node;
};

//
var instance = null;
var ControlKit = {};

/**
 * Initializes ControlKit.
 * @param {Object} [options] - ControlKit options
 * @param {Number} [options.opacity=1.0] - Overall opacity
 * @param {Boolean} [options.useExternalStyle=false] - If true, an external style is used instead of the build-in one
 * @param {String} [options.styleString] - If true, an external style is used instead of the build-in one
 */
ControlKit.setup = function(options){
    instance = new ControlKit(options);
};

/**
 * Updates all ControlKit components if the wat
 */
ControlKit.update = function(){
    if(!instance){
        return;
    }
    instance.update();
};

/**
 * Adds a panel.
 * @param {Object} [params] - Panel options
 * @param {String} [params.label='Control Panel'] - The panel label
 * @param {Number} [params.width=300] - The width
 * @param {Number} [params.height] - Constrained panel height
 * @param {Number} [params.ratio=40] - The ratio of label (default:40%) and component (default:60%) width
 * @param {String} [params.align='right'] - Float 'left' or 'right', multiple panels get aligned next to each other
 * @param {Boolean} [params.fixed=true] - If false the panel can be moved
 * @param {Array} [params.position=[0,0]] - If unfixed, the panel panel position relative to alignment (eg. if 'left' 0 + position[0] or if 'right' window.innerHeight - position[0] - panelWidth)
 * @param {Number} [params.opacity=1.0] - The panel´s opacity
 * @param {String} [params.dock=false] - (Experimental) Indicates whether the panel should be docked to either the left or right window border (depending on params.align), docked panels height equal window height
 * @param {Boolean}[params.history=false] - (Experimental) Enables a value history for all components
 * @returns {Panel}
 */
ControlKit.addPanel = function(params){
    if(!instance){
        return undefined;
    }
    return instance.addPanel(params);
};

/*
ControlKit.enable = function(){
    if(!instance){
        return;
    }
    instance.enable();
};

ControlKit.disable = function(){
    if(!instance){
        return;
    }
    instance.disable();
};
*/

ControlKit.destroy = function(){
    if(!instance){
        return;
    }
    Options.get().destroy();
    Picker.get().destroy();
    instance.destroy();
};

module.exports = ControlKit;
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
				this._value = Picker.get().getHEX();
				break;
			case colorModeRGB:
				//if val = Float32array or so
				temp = Picker.get().getRGB();
				value[0] = temp[0];
				value[1] = temp[1];
				value[2] = temp[2];
				break;

			case colorModeRGBfv:
				temp = Picker.get().getRGBfv();
				value[0] = temp[0];
				value[1] = temp[1];
				value[2] = temp[2];
				break;

			case colorModeHSV:
				this._value = Picker.get().getHSV();
				break;
		}

		this.applyValue();

	}.bind(this);

	var picker = Picker.get();

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

    var mousePos = Mouse.get().getPosition(),
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

    var mouse = Mouse.get();

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
Options.destroy = function(){Options._instance = null;};

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
        mouse = Mouse.get().getPosition(),
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
            mousePos = Mouse.get().getPosition();

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
            mousePosY = Mouse.get().getY();

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
            mousePos = Mouse.get().getPosition(),
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
        var mousePos = Mouse.get().getPosition(),
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
Picker.get = function () {
    return Picker._instance;
};
Picker.destroy = function(){
    Picker._instance = null;
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
    History.get().pushState(obj, key, obj[key]);
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
    params.onFinish = params.onFinish || function(){};

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
    History.get().pushState(obj, key, obj[key]);
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
    var mx = Mouse.get().getX(),
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

History.get = function () {
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
    History.get().pushState(obj, key, obj[key]);
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

Mouse.get = function () {
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

        var mouse = Mouse.get();

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
            menuUndo.setProperty('value', History.get().getNumStates());
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
    this._menuUndo.setProperty('value', History.get().getNumStates());
};

Panel.prototype._onMenuUndoTrigger = function () {
    History.get().popState();
};

Panel.prototype._onHeadDragStart = function()
{
    var parentNode = this._parent.getNode(),
        node       = this._node;

    var nodePos   = node.getPositionGlobal(),
        mousePos  = Mouse.get().getPosition(),
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
    var mousePos = Mouse.get().getPosition(),
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
 * @param {Object} [params] - Group options
 * @param {String} [params.label='Control Panel'] - The Group label string
 * @param {Boolean} [params.useLabel=true] - Trigger whether all contained SubGroups and Components should use labels
 * @param {Boolean} [params.enable=true] - Defines initial state open / closed
 * @param {Number} [params.height=null] - Defines if the height of the Group should be constrained to certain height
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
 * @param {Object} [params] - SubGroup options
 * @param {String} [params.label=null] - The SubGroup label string
 * @param {Boolean} [params.useLabel=true] - Trigger whether all contained SubGroups and Components should use labels
 * @param {Boolean} [params.enable=true] - Defines initial state open / closed
 * @param {Number} [params.height=null] - Defines if the height of the SubGroup should be constrained to certain height
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
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - StringInput options
 * @param {String} [params.label=value] - StringInput label
 * @param {Function} [params.onChange] - Callback on change
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
 * @param {String} [params.label=value] - NumberInput label
 * @param {Function} [params.onChange] - Callback on change
 * @param {Number} [params.step] - Amount subbed/added on arrowDown/arrowUp press
 * @param {Number} [params.dp] - Decimal places displayed
 * @returns {Panel}
 */

Panel.prototype.addNumberInput = function (object, value, params) {
    return this._addComponent(NumberInput,object,value,params);
};

/**
 * Adds a new Range input to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Range label
 * @param {Function} [params.onChange] - Callback on change
 * @param {Number} [params.step] - Amount subbed/added on arrowDown/arrowUp press
 * @param {Number} [params.dp] - Decimal places displayed
 * @returns {Panel}
 */

Panel.prototype.addRange = function (object, value, params) {
    return this._addComponent(Range,object,value,params);
};

/**
 * Adds a new Checkbox to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Checkbox label
 * @param {Function} [params.onChange] - Callback on change
 * @returns {Panel}
 */

Panel.prototype.addCheckbox = function (object, value, params) {
    return this._addComponent(Checkbox,object,value,params);
};

/**
 * Adds a new Color modifier to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Color label
 * @param {Function} [params.onChange] - Callback on change
 * @param {String} [params.colorMode='rgb'] - The colorMode to be used: 'hex' #ff00ff, 'rgb' [255,0,255], 'rgbfv' [1,0,1]
 * @param {Array} [params.presets] - A set of preset colors matching params.colorMode
 * @returns {Panel}
 */

Panel.prototype.addColor = function (object, value, params) {
    return this._addComponent(Color,object,value, params);
};

/**
 * Adds a new Button to last added SubGroup.
 * @param {String} label - The object
 * @param {Function} onPress - Callback
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Button label
 * @returns {Panel}
 */

Panel.prototype.addButton = function (label, onPress, params) {
    return this._addComponent(Button,label,onPress,params);
};

/**
 * Adds a new Select to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Button label
 * @param {Function} [params.onChange] - Callback on change - function(index){}
 * @param {String} [params.target] - The property to be set on select
 * @returns {Panel}
 */

Panel.prototype.addSelect = function (object, value, params) {
    return this._addComponent(Select,object,value,params);
};

/**
 * Adds a new Slider to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {String} range - The min/max array key to be used
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Slider label
 * @param {Function} [params.onChange] - Callback on change
 * @param {Function} [params.onFinish] - Callback on finish
 * @param {Number} [params.step] - Amount subbed/added on arrowDown/arrowUp press inside the input
 * @param {Number} [params.dp] - Decimal places displayed
 * @returns {Panel}
 */

Panel.prototype.addSlider = function (object, value, range, params) {
    return this._addComponent(Slider,object,value,range,params);
};

/**
 * Adds a new FunctionPlotter to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key - f(x), f(x,y)
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - FunctionPlotter label
 * @returns {Panel}
 */

Panel.prototype.addFunctionPlotter = function (object, value, params) {
    return this._addComponent(FunctionPlotter,object,value,params);
};

/**
 * Adds a new XY-Pad to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Pad label
 * @returns {Panel}
 */

Panel.prototype.addPad = function (object, value, params) {
    return this._addComponent(Pad,object,value,params);
};

/**
 * Adds a new ValuePlotter to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Plotter label
 * @param {Number} [params.height] - Plotter height
 * @param {Number} [params.resolution] - Graph resolution
 * @returns {Panel}
 */

Panel.prototype.addValuePlotter = function (object, value, params) {
    return this._addComponent(ValuePlotter,object,value,params);
};

/**
 * Adds a new NumberOutput to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Output label
 * @param {Number} [params.dp] - Decimal places displayed
 * @returns {Panel}
 */

Panel.prototype.addNumberOutput = function (object, value, params) {
    return this._addComponent(NumberOutput,object,value,params);
};

/**
 * Adds a new StringOutput to last added SubGroup.
 * @param {Object} object - The object
 * @param {String} value - The property key
 * @param {Object} [params] - Component options
 * @param {String} [params.label=value] - Output label
 * @param {Number} [params.dp] - Decimal places displayed
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9pbmRleC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvQ29udHJvbEtpdC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0J1dHRvbi5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0NhbnZhcy5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L0NoZWNrYm94LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvQ29sb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9GdW5jdGlvblBsb3RUeXBlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvRnVuY3Rpb25QbG90dGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9GdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L051bWJlcklucHV0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvTnVtYmVySW5wdXRfSW50ZXJuYWwuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9OdW1iZXJPdXRwdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9PcHRpb25zLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvT3V0cHV0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGFkLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGlja2VyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvUGxvdHRlci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1ByZXNldEJ0bi5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29tcG9uZW50L1JhbmdlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU1ZHLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU1ZHQ29tcG9uZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2VsZWN0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2xpZGVyLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU2xpZGVyX0ludGVybmFsLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb21wb25lbnQvU3RyaW5nSW5wdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9TdHJpbmdPdXRwdXQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvbXBvbmVudC9WYWx1ZVBsb3R0ZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvQ29tcG9uZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0NvbXBvbmVudEV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0NvbXBvbmVudE9iamVjdEVycm9yLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL0hpc3RvcnkuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvSGlzdG9yeUV2ZW50LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL01ldHJpYy5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9PYmplY3RDb21wb25lbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvT3B0aW9uRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvUHJlc2V0LmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2NvbG9yL0NvbG9yRm9ybWF0RXJyb3IuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvY29sb3IvQ29sb3JNb2RlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2NvbG9yL0NvbG9yVXRpbC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9DU1MuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9Nb3VzZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9Ob2RlLmpzIiwiL1VzZXJzL2F1dG9tYXQvV2Vic3Rvcm1Qcm9qZWN0cy9jb250cm9sS2l0LmpzL2xpYi9jb3JlL2RvY3VtZW50L05vZGVFdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9kb2N1bWVudC9TdHlsZS5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9ldmVudC9FdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXIuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvbGF5b3V0L0xheW91dE1vZGUuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2NvcmUvbGF5b3V0L1Njcm9sbEJhci5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvQWJzdHJhY3RHcm91cC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvR3JvdXAuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL0dyb3VwRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL01lbnVFdmVudC5qcyIsIi9Vc2Vycy9hdXRvbWF0L1dlYnN0b3JtUHJvamVjdHMvY29udHJvbEtpdC5qcy9saWIvZ3JvdXAvUGFuZWwuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL1BhbmVsRXZlbnQuanMiLCIvVXNlcnMvYXV0b21hdC9XZWJzdG9ybVByb2plY3RzL2NvbnRyb2xLaXQuanMvbGliL2dyb3VwL1N1Ykdyb3VwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9RQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFpQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDenlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDemJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcndCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIENvbnRyb2xLaXQgPSByZXF1aXJlKCcuL2xpYi9Db250cm9sS2l0Jyk7XG5cdENvbnRyb2xLaXQuQ2FudmFzID0gcmVxdWlyZSgnLi9saWIvY29tcG9uZW50L0NhbnZhcycpO1xuXHRDb250cm9sS2l0LlNWRyA9IHJlcXVpcmUoJy4vbGliL2NvbXBvbmVudC9TVkcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sS2l0OyIsInZhciBOb2RlID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L05vZGUnKSxcbiAgICBQYW5lbCA9IHJlcXVpcmUoJy4vZ3JvdXAvUGFuZWwnKSxcbiAgICBPcHRpb25zID0gcmVxdWlyZSgnLi9jb21wb25lbnQvT3B0aW9ucycpLFxuICAgIFBpY2tlciA9IHJlcXVpcmUoJy4vY29tcG9uZW50L1BpY2tlcicpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi9jb3JlL2RvY3VtZW50L0NTUycpO1xuXG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuICAgIEV2ZW50XyA9IHJlcXVpcmUoJy4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4vY29yZS9Db21wb25lbnRFdmVudCcpLFxuICAgIEhpc3RvcnlFdmVudCA9IHJlcXVpcmUoJy4vY29yZS9IaXN0b3J5RXZlbnQnKSxcbiAgICBNZW51RXZlbnQgPSByZXF1aXJlKCcuL2dyb3VwL01lbnVFdmVudCcpO1xuXG52YXIgSGlzdG9yeSA9IHJlcXVpcmUoJy4vY29yZS9IaXN0b3J5Jyk7XG52YXIgTW91c2UgPSByZXF1aXJlKCcuL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcblxudmFyIFZhbHVlUGxvdHRlciA9IHJlcXVpcmUoJy4vY29tcG9uZW50L1ZhbHVlUGxvdHRlcicpO1xudmFyIFN0cmluZ091dHB1dCA9IHJlcXVpcmUoJy4vY29tcG9uZW50L1N0cmluZ091dHB1dCcpLFxuICAgIE51bWJlck91dHB1dCA9IHJlcXVpcmUoJy4vY29tcG9uZW50L051bWJlck91dHB1dCcpO1xuXG52YXIgREVGQVVMVF9ISVNUT1JZID0gZmFsc2UsXG4gICAgREVGQVVMVF9PUEFDSVRZID0gMS4wO1xuXG5mdW5jdGlvbiBDb250cm9sS2l0XyhwYXJhbXMpIHtcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLmhpc3RvcnkgPSBwYXJhbXMuaGlzdG9yeSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9ISVNUT1JZIDogcGFyYW1zLmhpc3Rvcnk7XG4gICAgcGFyYW1zLm9wYWNpdHkgPSBwYXJhbXMub3BhY2l0eSA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9PUEFDSVRZIDogcGFyYW1zLm9wYWNpdHk7XG4gICAgcGFyYW1zLnVzZUV4dGVybmFsU3R5bGUgPSBwYXJhbXMudXNlRXh0ZXJuYWxTdHlsZSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBwYXJhbXMudXNlRXh0ZXJuYWxTdHlsZTtcblxuICAgIEV2ZW50RGlzcGF0Y2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdmFyIG5vZGUgPSBudWxsO1xuICAgIGlmICghcGFyYW1zLnBhcmVudERvbUVsZW1lbnRJZCkge1xuICAgICAgICBub2RlID0gbmV3IE5vZGUoKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlLmdldEVsZW1lbnQoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZSA9IE5vZGUuZ2V0Tm9kZUJ5SWQocGFyYW1zLnBhcmVudERvbUVsZW1lbnRJZCk7XG4gICAgfVxuXG4gICAgaWYoIXBhcmFtcy51c2VFeHRlcm5hbFN0eWxlKXtcbiAgICAgICAgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgICAgICAgIHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuICAgICAgICB2YXIgY3NzID0gIXBhcmFtcy5zdHlsZSA/IHJlcXVpcmUoJy4vY29yZS9kb2N1bWVudC9TdHlsZScpLnN0cmluZyA6IHBhcmFtcy5zdHlsZVN0cmluZztcbiAgICAgICAgaWYoc3R5bGUuc3R5bGVzaGVldCl7XG4gICAgICAgICAgICBzdHlsZS5zdHlsZXNoZWV0LmNzc1RleHQgPSBjc3M7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgICAgICAgfVxuICAgICAgICAoZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdKS5hcHBlbmRDaGlsZChzdHlsZSk7XG4gICAgfVxuXG4gICAgbm9kZS5zZXRQcm9wZXJ0eSgnaWQnLCBDU1MuQ29udHJvbEtpdCk7XG5cbiAgICB0aGlzLl9ub2RlID0gbm9kZTtcbiAgICB0aGlzLl9wYW5lbHMgPSBbXTtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gZmFsc2U7XG4gICAgdGhpcy5faGlzdG9yeUVuYWJsZWQgPSBwYXJhbXMuaGlzdG9yeTtcbiAgICB0aGlzLl9wYW5lbHNDbG9zYWJsZSA9IHBhcmFtcy5wYW5lbHNDbG9zYWJsZTtcblxuICAgIHZhciBoaXN0b3J5ID0gSGlzdG9yeS5zZXR1cCgpO1xuXG4gICAgaWYgKCF0aGlzLl9oaXN0b3J5RW5hYmxlZCl7XG4gICAgICAgIGhpc3RvcnkuZGlzYWJsZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGhpc3RvcnkuYWRkRXZlbnRMaXN0ZW5lcihIaXN0b3J5RXZlbnQuU1RBVEVfUFVTSCwgdGhpcywgJ29uSGlzdG9yeVN0YXRlUHVzaCcpO1xuICAgICAgICBoaXN0b3J5LmFkZEV2ZW50TGlzdGVuZXIoSGlzdG9yeUV2ZW50LlNUQVRFX1BPUCwgdGhpcywgJ29uSGlzdG9yeVN0YXRlUG9wJyk7XG4gICAgfVxuXG4gICAgTW91c2Uuc2V0dXAoKTtcbiAgICBQaWNrZXIuc2V0dXAodGhpcy5nZXROb2RlKCkpO1xuICAgIE9wdGlvbnMuc2V0dXAodGhpcy5nZXROb2RlKCkpO1xuXG4gICAgaWYgKHBhcmFtcy50cmlnZ2VyKSB7XG4gICAgICAgIHZhciB0cmlnZ2VyID0gbmV3IE5vZGUoKTtcbiAgICAgICAgICAgIHRyaWdnZXIuc2V0UHJvcGVydHkoJ2lkJywgQ1NTLlRyaWdnZXIpO1xuICAgICAgICAgICAgdHJpZ2dlci5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vblRyaWdnZXJEb3duLmJpbmQodGhpcykpO1xuXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodHJpZ2dlci5nZXRFbGVtZW50KCkpO1xuICAgIH1cblxuICAgIGlmIChwYXJhbXMub3BhY2l0eSAhPSAxLjAgJiYgcGFyYW1zLm9wYWNpdHkgIT0gMC4wKSB7XG4gICAgICAgIG5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnb3BhY2l0eScsIHBhcmFtcy5vcGFjaXR5KTtcbiAgICB9XG5cbiAgICB0aGlzLl9jYW5VcGRhdGUgPSB0cnVlO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBpbnRlcnZhbCxcbiAgICAgICAgY291bnQgPSAwLFxuICAgICAgICBjb3VudE1heCA9IDEwO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5XSU5ET1dfUkVTSVpFLGZ1bmN0aW9uKCl7XG4gICAgICAgIHNlbGYuX2NhblVwZGF0ZSA9IGZhbHNlO1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgaWYoY291bnQgPj0gY291bnRNYXgpe1xuICAgICAgICAgICAgICAgIGNvdW50ID0gMDtcbiAgICAgICAgICAgICAgICBzZWxmLl9jYW5VcGRhdGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgfSwyNSlcbiAgICB9KTtcbn1cblxuQ29udHJvbEtpdF8ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblxuQ29udHJvbEtpdF8ucHJvdG90eXBlLl9vblRyaWdnZXJEb3duID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgndmlzaWJpbGl0eScsIHRoaXMuX2lzRGlzYWJsZWQgPSAhdGhpcy5faXNEaXNhYmxlZCA/ICdoaWRkZW4nIDogJ3Zpc2libGUnKTtcbn07XG5cbkNvbnRyb2xLaXRfLnByb3RvdHlwZS5hZGRQYW5lbCA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICB2YXIgcGFuZWwgPSBuZXcgUGFuZWwodGhpcywgcGFyYW1zKTtcbiAgICB0aGlzLl9wYW5lbHMucHVzaChwYW5lbCk7XG4gICAgcmV0dXJuIHBhbmVsO1xufTtcblxuQ29udHJvbEtpdF8ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5faXNEaXNhYmxlZCB8fCAhdGhpcy5fY2FuVXBkYXRlKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaSwgaiwgaztcbiAgICB2YXIgbCwgbSwgbjtcblxuICAgIHZhciBwYW5lbHMgPSB0aGlzLl9wYW5lbHMsXG4gICAgICAgIHBhbmVsLFxuICAgICAgICBncm91cHMsXG4gICAgICAgIGNvbXBvbmVudHMsXG4gICAgICAgIGNvbXBvbmVudDtcblxuICAgIGkgPSAtMTsgbCA9IHBhbmVscy5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgcGFuZWwgPSBwYW5lbHNbaV07XG4gICAgICAgIGlmIChwYW5lbC5pc0Rpc2FibGVkKCkpe1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZ3JvdXBzID0gcGFuZWwuZ2V0R3JvdXBzKCk7XG4gICAgICAgIGogPSAtMTsgbSA9IGdyb3Vwcy5sZW5ndGg7XG5cbiAgICAgICAgd2hpbGUgKCsraiA8IG0pIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMgPSBncm91cHNbal0uZ2V0Q29tcG9uZW50cygpO1xuICAgICAgICAgICAgayA9IC0xOyBuID0gY29tcG9uZW50cy5sZW5ndGg7XG5cbiAgICAgICAgICAgIHdoaWxlICgrK2sgPCBuKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50ID0gY29tcG9uZW50c1trXTtcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LmlzRGlzYWJsZWQoKSl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50IGluc3RhbmNlb2YgVmFsdWVQbG90dGVyIHx8XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudCBpbnN0YW5jZW9mIFN0cmluZ091dHB1dCB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQgaW5zdGFuY2VvZiBOdW1iZXJPdXRwdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50LnVwZGF0ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkNvbnRyb2xLaXRfLnByb3RvdHlwZS5oaXN0b3J5SXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oaXN0b3J5RW5hYmxlZDtcbn07XG5cbkNvbnRyb2xLaXRfLnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xufTtcblxuQ29udHJvbEtpdF8ucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IHRydWU7XG59O1xuXG5Db250cm9sS2l0Xy5wcm90b3R5cGUuZGlzYWJsZUFsbFBhbmVscyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaSA9IC0xLCBwID0gdGhpcy5fcGFuZWxzLCBsID0gcC5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IGwpe1xuICAgICAgICBwW2ldLmVuYWJsZSgpO1xuICAgIH1cbn07XG5cbkNvbnRyb2xLaXRfLnByb3RvdHlwZS5lbmFibGVBbGxQYW5lbHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGkgPSAtMSwgcCA9IHRoaXMuX3BhbmVscywgbCA9IHAubGVuZ3RoO1xuICAgIHdoaWxlICgrK2kgPCBsKXtcbiAgICAgICAgcFtpXS5kaXNhYmxlKCk7XG4gICAgfVxufTtcblxuQ29udHJvbEtpdF8ucHJvdG90eXBlLm9uSGlzdG9yeVN0YXRlUHVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBNZW51RXZlbnQuVVBEQVRFX01FTlUsIG51bGwpKTtcbn07XG5cbkNvbnRyb2xLaXRfLnByb3RvdHlwZS5vbkhpc3RvcnlTdGF0ZVBvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5VUERBVEVfVkFMVUUsIHtvcmlnaW46IG51bGx9KSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgTWVudUV2ZW50LlVQREFURV9NRU5VLCBudWxsKSk7XG59O1xuXG5Db250cm9sS2l0Xy5wcm90b3R5cGUuZ2V0Tm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbm9kZTtcbn07XG5cbi8vXG52YXIgaW5zdGFuY2UgPSBudWxsO1xudmFyIENvbnRyb2xLaXQgPSB7fTtcblxuLyoqXG4gKiBJbml0aWFsaXplcyBDb250cm9sS2l0LlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSAtIENvbnRyb2xLaXQgb3B0aW9uc1xuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm9wYWNpdHk9MS4wXSAtIE92ZXJhbGwgb3BhY2l0eVxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy51c2VFeHRlcm5hbFN0eWxlPWZhbHNlXSAtIElmIHRydWUsIGFuIGV4dGVybmFsIHN0eWxlIGlzIHVzZWQgaW5zdGVhZCBvZiB0aGUgYnVpbGQtaW4gb25lXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMuc3R5bGVTdHJpbmddIC0gSWYgdHJ1ZSwgYW4gZXh0ZXJuYWwgc3R5bGUgaXMgdXNlZCBpbnN0ZWFkIG9mIHRoZSBidWlsZC1pbiBvbmVcbiAqL1xuQ29udHJvbEtpdC5zZXR1cCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgIGluc3RhbmNlID0gbmV3IENvbnRyb2xLaXQob3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgYWxsIENvbnRyb2xLaXQgY29tcG9uZW50cyBpZiB0aGUgd2F0XG4gKi9cbkNvbnRyb2xLaXQudXBkYXRlID0gZnVuY3Rpb24oKXtcbiAgICBpZighaW5zdGFuY2Upe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGluc3RhbmNlLnVwZGF0ZSgpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgcGFuZWwuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBQYW5lbCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD0nQ29udHJvbCBQYW5lbCddIC0gVGhlIHBhbmVsIGxhYmVsXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy53aWR0aD0zMDBdIC0gVGhlIHdpZHRoXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5oZWlnaHRdIC0gQ29uc3RyYWluZWQgcGFuZWwgaGVpZ2h0XG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5yYXRpbz00MF0gLSBUaGUgcmF0aW8gb2YgbGFiZWwgKGRlZmF1bHQ6NDAlKSBhbmQgY29tcG9uZW50IChkZWZhdWx0OjYwJSkgd2lkdGhcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmFsaWduPSdyaWdodCddIC0gRmxvYXQgJ2xlZnQnIG9yICdyaWdodCcsIG11bHRpcGxlIHBhbmVscyBnZXQgYWxpZ25lZCBuZXh0IHRvIGVhY2ggb3RoZXJcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy5maXhlZD10cnVlXSAtIElmIGZhbHNlIHRoZSBwYW5lbCBjYW4gYmUgbW92ZWRcbiAqIEBwYXJhbSB7QXJyYXl9IFtwYXJhbXMucG9zaXRpb249WzAsMF1dIC0gSWYgdW5maXhlZCwgdGhlIHBhbmVsIHBhbmVsIHBvc2l0aW9uIHJlbGF0aXZlIHRvIGFsaWdubWVudCAoZWcuIGlmICdsZWZ0JyAwICsgcG9zaXRpb25bMF0gb3IgaWYgJ3JpZ2h0JyB3aW5kb3cuaW5uZXJIZWlnaHQgLSBwb3NpdGlvblswXSAtIHBhbmVsV2lkdGgpXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5vcGFjaXR5PTEuMF0gLSBUaGUgcGFuZWzCtHMgb3BhY2l0eVxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMuZG9jaz1mYWxzZV0gLSAoRXhwZXJpbWVudGFsKSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgcGFuZWwgc2hvdWxkIGJlIGRvY2tlZCB0byBlaXRoZXIgdGhlIGxlZnQgb3IgcmlnaHQgd2luZG93IGJvcmRlciAoZGVwZW5kaW5nIG9uIHBhcmFtcy5hbGlnbiksIGRvY2tlZCBwYW5lbHMgaGVpZ2h0IGVxdWFsIHdpbmRvdyBoZWlnaHRcbiAqIEBwYXJhbSB7Qm9vbGVhbn1bcGFyYW1zLmhpc3Rvcnk9ZmFsc2VdIC0gKEV4cGVyaW1lbnRhbCkgRW5hYmxlcyBhIHZhbHVlIGhpc3RvcnkgZm9yIGFsbCBjb21wb25lbnRzXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cbkNvbnRyb2xLaXQuYWRkUGFuZWwgPSBmdW5jdGlvbihwYXJhbXMpe1xuICAgIGlmKCFpbnN0YW5jZSl7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiBpbnN0YW5jZS5hZGRQYW5lbChwYXJhbXMpO1xufTtcblxuLypcbkNvbnRyb2xLaXQuZW5hYmxlID0gZnVuY3Rpb24oKXtcbiAgICBpZighaW5zdGFuY2Upe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGluc3RhbmNlLmVuYWJsZSgpO1xufTtcblxuQ29udHJvbEtpdC5kaXNhYmxlID0gZnVuY3Rpb24oKXtcbiAgICBpZighaW5zdGFuY2Upe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGluc3RhbmNlLmRpc2FibGUoKTtcbn07XG4qL1xuXG5Db250cm9sS2l0LmRlc3Ryb3kgPSBmdW5jdGlvbigpe1xuICAgIGlmKCFpbnN0YW5jZSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgT3B0aW9ucy5nZXQoKS5kZXN0cm95KCk7XG4gICAgUGlja2VyLmdldCgpLmRlc3Ryb3koKTtcbiAgICBpbnN0YW5jZS5kZXN0cm95KCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xLaXQ7IiwidmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpLFxuICAgIENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50Jyk7XG5cbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xuXG52YXIgREVGQVVMVF9MQUJFTCA9ICcnO1xuXG5mdW5jdGlvbiBCdXR0b24ocGFyZW50LGxhYmVsLG9uUHJlc3MscGFyYW1zKSB7XG4gICAgb25QcmVzcyAgICAgID0gb25QcmVzcyB8fCBmdW5jdGlvbigpe307XG4gICAgcGFyYW1zICAgICAgID0gcGFyYW1zICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5sYWJlbCA9IHBhcmFtcy5sYWJlbCB8fCBERUZBVUxUX0xBQkVMO1xuXG4gICAgQ29tcG9uZW50LmFwcGx5KHRoaXMsW3BhcmVudCxwYXJhbXMubGFiZWxdKTtcblxuICAgIHZhciBpbnB1dCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcblxuICAgIGlucHV0LnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbik7XG4gICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJyxsYWJlbCk7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuT05fQ0xJQ0ssXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvblByZXNzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8oc2VsZixDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVEKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgIHRoaXMuX3dyYXBOb2RlLmFkZENoaWxkKGlucHV0KTtcbn1cbkJ1dHRvbi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1dHRvbjtcbiIsInZhciBDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudCcpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi4vY29yZS9NZXRyaWMnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBHcm91cEV2ZW50ID0gcmVxdWlyZSgnLi4vZ3JvdXAvR3JvdXBFdmVudCcpO1xuXG5mdW5jdGlvbiBDYW52YXMocGFyZW50LHBhcmFtcykge1xuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcbiAgICAgICAgd3JhcE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQ2FudmFzV3JhcCk7XG5cbiAgICB2YXIgd3JhcFdpZHRoID0gd3JhcE5vZGUuZ2V0V2lkdGgoKTtcblxuICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgd3JhcE5vZGUuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKGNhbnZhcyk7XG5cbiAgICB0aGlzLl9jYW52YXNXaWR0aCA9IHRoaXMuX2NhbnZhc0hlaWdodCA9IDA7XG4gICAgdGhpcy5fc2V0Q2FudmFzU2l6ZSh3cmFwV2lkdGgsd3JhcFdpZHRoKTtcblxuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuXG4gICAgdGhpcy5fbm9kZS5zZXRTdHlsZUNsYXNzKENTUy5DYW52YXNMaXN0SXRlbSk7XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLHRoaXMsICAnb25Hcm91cFNpemVDaGFuZ2UnKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSx0aGlzLl9wYXJlbnQsJ29uR3JvdXBTaXplVXBkYXRlJyk7XG59XG5cbkNhbnZhcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5DYW52YXMucHJvdG90eXBlLl91cGRhdGVIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhbnZhc0hlaWdodCA9IHRoaXMuX2NhbnZhcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQoY2FudmFzSGVpZ2h0KTtcbiAgICB0aGlzLl9ub2RlLnNldEhlaWdodChjYW52YXNIZWlnaHQgKyBNZXRyaWMuUEFERElOR19XUkFQUEVSKTtcblxufTtcblxuQ2FudmFzLnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd2lkdGggPSB0aGlzLl93cmFwTm9kZS5nZXRXaWR0aCgpO1xuXG4gICAgdGhpcy5fc2V0Q2FudmFzU2l6ZSh3aWR0aCwgd2lkdGgpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHRoaXMuX3JlZHJhdygpO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX1VQREFURSwgbnVsbCkpO1xufTtcblxuQ2FudmFzLnByb3RvdHlwZS5fc2V0Q2FudmFzU2l6ZSA9IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIGNhbnZhc1dpZHRoID0gdGhpcy5fY2FudmFzV2lkdGggPSB3aWR0aCxcbiAgICAgICAgY2FudmFzSGVpZ2h0ID0gdGhpcy5fY2FudmFzSGVpZ2h0ID0gaGVpZ2h0O1xuXG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhcztcbiAgICAgICAgY2FudmFzLnN0eWxlLndpZHRoID0gY2FudmFzV2lkdGggKyAncHgnO1xuICAgICAgICBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gY2FudmFzSGVpZ2h0ICsgJ3B4JztcbiAgICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzV2lkdGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXNIZWlnaHQ7XG59O1xuXG5DYW52YXMucHJvdG90eXBlLmdldENhbnZhcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY2FudmFzO1xufTtcblxuQ2FudmFzLnByb3RvdHlwZS5nZXRDb250ZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FudmFzO1xuIiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50JyksXG4gICAgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIENoZWNrYm94KHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgdGhpcy5fb25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2U7XG5cbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQ0hFQ0tCT1gpO1xuICAgIGlucHV0LnNldFByb3BlcnR5KCdjaGVja2VkJyx0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuQ0hBTkdFLHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLl93cmFwTm9kZS5hZGRDaGlsZCh0aGlzLl9pbnB1dCk7XG59XG5cbkNoZWNrYm94LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5cbkNoZWNrYm94LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xuXG4gICAgdmFyIG9iaiA9IHRoaXMuX29iamVjdCwga2V5ID0gdGhpcy5fa2V5O1xuICAgIG9ialtrZXldID0gIW9ialtrZXldO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xufTtcblxuQ2hlY2tib3gucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX29uQ2hhbmdlKCk7XG59O1xuXG5DaGVja2JveC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faW5wdXQuc2V0UHJvcGVydHkoJ2NoZWNrZWQnLCB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENoZWNrYm94OyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XG5cbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgQ29sb3JNb2RlID0gcmVxdWlyZSgnLi4vY29yZS9jb2xvci9Db2xvck1vZGUnKTtcbnZhciBQaWNrZXIgPSByZXF1aXJlKCcuL1BpY2tlcicpO1xudmFyIENvbG9yVXRpbCA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JVdGlsJyk7XG52YXIgT3B0aW9ucyA9IHJlcXVpcmUoJy4vT3B0aW9ucycpO1xudmFyIFByZXNldEJ0biA9IHJlcXVpcmUoJy4vUHJlc2V0QnRuJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi4vY29yZS9NZXRyaWMnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuXHROb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuXHRDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIENvbG9yRm9ybWF0RXJyb3IgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yRm9ybWF0RXJyb3InKTtcblxudmFyIERFRkFVTFRfQ09MT1JfTU9ERSA9IENvbG9yTW9kZS5IRVgsXG5cdERFRkFVTFRfUFJFU0VUUyA9IG51bGw7XG5cbnZhciBNU0dfQ09MT1JfRk9STUFUX0hFWCA9ICdDb2xvciBmb3JtYXQgc2hvdWxkIGJlIGhleC4gU2V0IGNvbG9yTW9kZSB0byByZ2IsIHJnYmZ2IG9yIGhzdi4nLFxuXHRNU0dfQ09MT1JfRk9STUFUX1JHQl9SR0JGVl9IU1YgPSAnQ29sb3IgZm9ybWF0IHNob3VsZCBiZSByZ2IsIHJnYmZ2IG9yIGhzdi4gU2V0IGNvbG9yTW9kZSB0byBoZXguJyxcblx0TVNHX0NPTE9SX1BSRVNFVF9GT1JNQVRfSEVYID0gJ1ByZXNldCBjb2xvciBmb3JtYXQgc2hvdWxkIGJlIGhleC4nLFxuXHRNU0dfQ09MT1JfUFJFU0VUX0ZPUk1BVF9SR0JfUkdCRlZfSFNWID0gJ1ByZXNldCBjb2xvciBmb3JtYXQgc2hvdWxkIGJlIHJnYiwgcmdiZnYgb3IgaHN2Lic7XG5cbmZ1bmN0aW9uIENvbG9yKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG5cdE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcblx0cGFyYW1zLnByZXNldHMgPSBwYXJhbXMucHJlc2V0cyB8fCBERUZBVUxUX1BSRVNFVFM7XG5cdHBhcmFtcy5jb2xvck1vZGUgPSBwYXJhbXMuY29sb3JNb2RlIHx8IERFRkFVTFRfQ09MT1JfTU9ERTtcblxuXHR0aGlzLl9wcmVzZXRzS2V5ID0gcGFyYW1zLnByZXNldHM7XG5cblx0dmFyIGNvbG9yID0gdGhpcy5fY29sb3IgPSBuZXcgTm9kZSgpO1xuXHR2YWx1ZSA9IHRoaXMuX3ZhbHVlID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG5cblx0dmFyIGNvbG9yTW9kZSA9IHRoaXMuX2NvbG9yTW9kZSA9IHBhcmFtcy5jb2xvck1vZGU7XG5cblx0dGhpcy5fdmFsaWRhdGVDb2xvckZvcm1hdCh2YWx1ZSwgTVNHX0NPTE9SX0ZPUk1BVF9IRVgsIE1TR19DT0xPUl9GT1JNQVRfUkdCX1JHQkZWX0hTVik7XG5cblx0dmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG5cblx0aWYgKCF0aGlzLl9wcmVzZXRzS2V5KSB7XG5cdFx0Y29sb3Iuc2V0U3R5bGVDbGFzcyhDU1MuQ29sb3IpO1xuXHRcdHdyYXBOb2RlLmFkZENoaWxkKGNvbG9yKTtcblx0fVxuXHRlbHNlIHtcblx0XHRjb2xvci5zZXRTdHlsZUNsYXNzKENTUy5Db2xvcik7XG5cblx0XHR2YXIgY29sb3JXcmFwID0gbmV3IE5vZGUoKTtcblx0XHRjb2xvcldyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcENvbG9yV1ByZXNldCk7XG5cblx0XHR3cmFwTm9kZS5hZGRDaGlsZChjb2xvcldyYXApO1xuXHRcdGNvbG9yV3JhcC5hZGRDaGlsZChjb2xvcik7XG5cblx0XHR2YXIgcHJlc2V0cyA9IHRoaXMuX29iamVjdFt0aGlzLl9wcmVzZXRzS2V5XTtcblxuXHRcdHZhciBpID0gLTE7XG5cdFx0d2hpbGUgKCsraSA8IHByZXNldHMubGVuZ3RoKSB7XG5cdFx0XHR0aGlzLl92YWxpZGF0ZUNvbG9yRm9ybWF0KHByZXNldHNbaV0sIE1TR19DT0xPUl9QUkVTRVRfRk9STUFUX0hFWCxcblx0XHRcdFx0TVNHX0NPTE9SX1BSRVNFVF9GT1JNQVRfUkdCX1JHQkZWX0hTVik7XG5cdFx0fVxuXG5cdFx0dmFyIG9wdGlvbnMgPSBPcHRpb25zLmdldCgpLFxuXHRcdFx0cHJlc2V0QnRuID0gbmV3IFByZXNldEJ0bih3cmFwTm9kZSk7XG5cblx0XHR2YXIgb25QcmVzZXREZWFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0b3B0aW9ucy5jbGVhcigpO1xuXHRcdFx0cHJlc2V0QnRuLmRlYWN0aXZhdGUoKTtcblx0XHR9O1xuXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBvblByZXNldEFjdGl2YXRlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0b3B0aW9ucy5idWlsZChwcmVzZXRzLFxuXHRcdFx0XHRzZWxmLl92YWx1ZSxcblx0XHRcdFx0Y29sb3IsXG5cdFx0XHRcdGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRzZWxmLnB1c2hIaXN0b3J5U3RhdGUoKTtcblx0XHRcdFx0XHRzZWxmLl92YWx1ZSA9IHByZXNldHNbb3B0aW9ucy5nZXRTZWxlY3RlZEluZGV4KCldO1xuXHRcdFx0XHRcdHNlbGYuYXBwbHlWYWx1ZSgpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblByZXNldERlYWN0aXZhdGUsXG5cdFx0XHRcdE1ldHJpYy5QQURESU5HX1BSRVNFVCxcblx0XHRcdFx0dHJ1ZSxcblx0XHRcdFx0Y29sb3JNb2RlKTtcblx0XHR9O1xuXHRcdHByZXNldEJ0bi5zZXRPbkFjdGl2ZShvblByZXNldEFjdGl2YXRlKTtcblx0XHRwcmVzZXRCdG4uc2V0T25EZWFjdGl2ZShvblByZXNldERlYWN0aXZhdGUpO1xuXHR9XG5cblx0Y29sb3IuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25Db2xvclRyaWdnZXIuYmluZCh0aGlzKSk7XG5cdHRoaXMuX3VwZGF0ZUNvbG9yKCk7XG59XG5cbkNvbG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5cbkNvbG9yLnByb3RvdHlwZS5fb25Db2xvclRyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBjb2xvck1vZGUgPSB0aGlzLl9jb2xvck1vZGUsXG5cdFx0Y29sb3JNb2RlSEVYID0gQ29sb3JNb2RlLkhFWCxcblx0XHRjb2xvck1vZGVSR0IgPSBDb2xvck1vZGUuUkdCLFxuXHRcdGNvbG9yTW9kZVJHQmZ2ID0gQ29sb3JNb2RlLlJHQmZ2LFxuXHRcdGNvbG9yTW9kZUhTViA9IENvbG9yTW9kZS5IU1Y7XG5cblx0dmFyIHZhbHVlID0gdGhpcy5fdmFsdWUsXG5cdFx0dGVtcDtcblxuXHR2YXIgb25QaWNrZXJQaWNrID0gZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xuXG5cdFx0c3dpdGNoIChjb2xvck1vZGUpIHtcblx0XHRcdGNhc2UgY29sb3JNb2RlSEVYOlxuXHRcdFx0XHR0aGlzLl92YWx1ZSA9IFBpY2tlci5nZXQoKS5nZXRIRVgoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIGNvbG9yTW9kZVJHQjpcblx0XHRcdFx0Ly9pZiB2YWwgPSBGbG9hdDMyYXJyYXkgb3Igc29cblx0XHRcdFx0dGVtcCA9IFBpY2tlci5nZXQoKS5nZXRSR0IoKTtcblx0XHRcdFx0dmFsdWVbMF0gPSB0ZW1wWzBdO1xuXHRcdFx0XHR2YWx1ZVsxXSA9IHRlbXBbMV07XG5cdFx0XHRcdHZhbHVlWzJdID0gdGVtcFsyXTtcblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdGNhc2UgY29sb3JNb2RlUkdCZnY6XG5cdFx0XHRcdHRlbXAgPSBQaWNrZXIuZ2V0KCkuZ2V0UkdCZnYoKTtcblx0XHRcdFx0dmFsdWVbMF0gPSB0ZW1wWzBdO1xuXHRcdFx0XHR2YWx1ZVsxXSA9IHRlbXBbMV07XG5cdFx0XHRcdHZhbHVlWzJdID0gdGVtcFsyXTtcblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdGNhc2UgY29sb3JNb2RlSFNWOlxuXHRcdFx0XHR0aGlzLl92YWx1ZSA9IFBpY2tlci5nZXQoKS5nZXRIU1YoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0dGhpcy5hcHBseVZhbHVlKCk7XG5cblx0fS5iaW5kKHRoaXMpO1xuXG5cdHZhciBwaWNrZXIgPSBQaWNrZXIuZ2V0KCk7XG5cblx0c3dpdGNoIChjb2xvck1vZGUpIHtcblx0XHRjYXNlIGNvbG9yTW9kZUhFWDpcblx0XHRcdHBpY2tlci5zZXRDb2xvckhFWCh2YWx1ZSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIGNvbG9yTW9kZVJHQjpcblx0XHRcdHBpY2tlci5zZXRDb2xvclJHQih2YWx1ZVswXSwgdmFsdWVbMV0sIHZhbHVlWzJdKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgY29sb3JNb2RlUkdCZnY6XG5cdFx0XHRwaWNrZXIuc2V0Q29sb3JSR0Jmdih2YWx1ZVswXSwgdmFsdWVbMV0sIHZhbHVlWzJdKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgY29sb3JNb2RlSFNWOlxuXHRcdFx0cGlja2VyLnNldENvbG9ySFNWKHZhbHVlWzBdLCB2YWx1ZVsxXSwgdmFsdWVbMl0pO1xuXHRcdFx0YnJlYWs7XG5cdH1cblxuXHRwaWNrZXIuc2V0Q2FsbGJhY2tQaWNrKG9uUGlja2VyUGljayk7XG5cdHBpY2tlci5vcGVuKCk7XG59O1xuXG5Db2xvci5wcm90b3R5cGUuYXBwbHlWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fb2JqZWN0W3RoaXMuX2tleV0gPSB0aGlzLl92YWx1ZTtcblx0dGhpcy5fdXBkYXRlQ29sb3IoKTtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xufTtcblxuQ29sb3IucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuXHRpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXJldHVybjtcblx0dGhpcy5fdmFsdWUgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcblx0dGhpcy5fdXBkYXRlQ29sb3IoKTtcbn07XG5cbkNvbG9yLnByb3RvdHlwZS5fdXBkYXRlQ29sb3IgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBjb2xvciA9IHRoaXMuX3ZhbHVlLFxuXHRcdGNvbG9yTm9kZSA9IHRoaXMuX2NvbG9yLFxuXHRcdG5vZGVDb2xvcjtcblxuXHRjb2xvck5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGNvbG9yKTtcblxuXHRzd2l0Y2ggKHRoaXMuX2NvbG9yTW9kZSkge1xuXHRcdGNhc2UgQ29sb3JNb2RlLkhFWDpcblx0XHRcdG5vZGVDb2xvciA9IGNvbG9yO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIENvbG9yTW9kZS5SR0I6XG5cdFx0XHRub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCMkhFWChjb2xvclswXSwgY29sb3JbMV0sIGNvbG9yWzJdKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSBDb2xvck1vZGUuUkdCZnY6XG5cdFx0XHRub2RlQ29sb3IgPSBDb2xvclV0aWwuUkdCZnYySEVYKGNvbG9yWzBdLCBjb2xvclsxXSwgY29sb3JbMl0pO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlIENvbG9yTW9kZS5IU1Y6XG5cdFx0XHRub2RlQ29sb3IgPSBDb2xvclV0aWwuSFNWMlJHQihjb2xvclswXSwgY29sb3JbMV0sIGNvbG9yWzJdKTtcblx0XHRcdGJyZWFrO1xuXHR9XG5cblx0Y29sb3JOb2RlLmdldFN0eWxlKCkuYmFja2dyb3VuZENvbG9yID0gbm9kZUNvbG9yO1xufTtcblxuQ29sb3IucHJvdG90eXBlLl92YWxpZGF0ZUNvbG9yRm9ybWF0ID0gZnVuY3Rpb24gKHZhbHVlLCBtc2dIZXgsIG1zZ0Fycikge1xuXHR2YXIgY29sb3JNb2RlID0gdGhpcy5fY29sb3JNb2RlO1xuXG5cdGlmIChjb2xvck1vZGUgPT0gQ29sb3JNb2RlLkhFWCAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nIHx8XG5cdFx0Y29sb3JNb2RlID09IENvbG9yTW9kZS5IRVggJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRmxvYXQzMkFycmF5XScpIHtcblx0XHR0aHJvdyBuZXcgQ29sb3JGb3JtYXRFcnJvcihtc2dIZXgpO1xuXHR9XG5cdGlmICgoY29sb3JNb2RlID09IENvbG9yTW9kZS5SR0IgfHxcblx0XHRjb2xvck1vZGUgPT0gQ29sb3JNb2RlLlJHQmZ2IHx8XG5cdFx0Y29sb3JNb2RlID09IENvbG9yTW9kZS5IU1YpICYmXG5cdFx0T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSAhPT0gJ1tvYmplY3QgQXJyYXldJyB8fFxuXHRcdGNvbG9yTW9kZSA9PSBDb2xvck1vZGUuSFNWICYmXG5cdFx0T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSAhPT0gJ1tvYmplY3QgRmxvYXQzMkFycmF5XScpIHtcblx0XHR0aHJvdyBuZXcgQ29sb3JGb3JtYXRFcnJvcihtc2dBcnIpO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9yOyIsInZhciBGdW5jdGlvblBsb3RUeXBlID0ge1xuICAgIElNUExJQ0lUOiAnaW1wbGljaXQnLFxuICAgIE5PTl9JTVBMSUNJVDogJ25vbkltcGxpY2l0J1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvblBsb3RUeXBlOyIsInZhciBQbG90dGVyID0gcmVxdWlyZSgnLi9QbG90dGVyJyk7XG5cbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBGdW5jdGlvblBsb3RUeXBlID0gcmVxdWlyZSgnLi9GdW5jdGlvblBsb3RUeXBlJyk7XG52YXIgUHJlc2V0ID0gcmVxdWlyZSgnLi4vY29yZS9QcmVzZXQnKTtcblxudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4uL2NvcmUvTWV0cmljJyk7XG5cbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50JyksXG4gICAgTm9kZUV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKTtcblxudmFyIEZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yID0gcmVxdWlyZSgnLi9GdW5jdGlvblBsb3R0ZXJPYmplY3RFcnJvcicpLFxuICAgIEZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yID0gcmVxdWlyZSgnLi9GdW5jdGlvblBsb3R0ZXJGdW5jdGlvbkFyZ3NFcnJvcicpO1xuXG52YXIgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudE5vdGlmaWVyJyk7XG5cbnZhciBERUZBVUxUX1NIT1dfTUlOX01BWF9MQUJFTFMgPSB0cnVlO1xuXG5mdW5jdGlvbiBGdW5jdGlvblBsb3R0ZXIocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLnNob3dNaW5NYXhMYWJlbHMgPSBwYXJhbXMuc2hvd01pbk1heExhYmVscyA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9TSE9XX01JTl9NQVhfTEFCRUxTIDogcGFyYW1zLnNob3dNaW5NYXhMYWJlbHM7XG5cbiAgICBQbG90dGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICBpZiAodHlwZW9mIG9iamVjdFt2YWx1ZV0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yKG9iamVjdCx2YWx1ZSk7XG4gICAgfVxuXG4gICAgdmFyIGZ1bmNBcmdMZW5ndGggPSBvYmplY3RbdmFsdWVdLmxlbmd0aDtcblxuICAgIGlmIChmdW5jQXJnTGVuZ3RoID4gMiB8fCBmdW5jQXJnTGVuZ3RoID09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yKCk7XG4gICAgfVxuXG4gICAgdmFyIHN2Z1Jvb3QgPSB0aGlzLl9zdmdSb290LFxuICAgICAgICBwYXRoID0gdGhpcy5fcGF0aDtcblxuICAgIHZhciBheGVzID0gdGhpcy5fYXhlcyA9IHN2Z1Jvb3QuaW5zZXJ0QmVmb3JlKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgncGF0aCcpLCBwYXRoKTtcbiAgICBheGVzLnN0eWxlLnN0cm9rZVdpZHRoID0gMTtcblxuICAgIHZhciBheGVzTGFiZWxzID0gdGhpcy5fYXhlc0xhYmVscyA9IHN2Z1Jvb3QuaW5zZXJ0QmVmb3JlKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgncGF0aCcpLCBwYXRoKTtcbiAgICBheGVzTGFiZWxzLnN0eWxlLnN0cm9rZSA9ICdyZ2IoNDMsNDgsNTEpJztcbiAgICBheGVzTGFiZWxzLnN0eWxlLnN0cm9rZVdpZHRoID0gMTtcblxuICAgIHZhciBncmlkID0gdGhpcy5fZ3JpZDtcblxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXG4gICAgICAgIHNpemUgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSk7XG5cbiAgICB2YXIgc2xpZGVyWFdyYXAgPSBuZXcgTm9kZSgpO1xuICAgICAgICBzbGlkZXJYV3JhcC5zZXRTdHlsZUNsYXNzKENTUy5HcmFwaFNsaWRlclhXcmFwKTtcblxuICAgIHZhciBzbGlkZXJZV3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHNsaWRlcllXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLkdyYXBoU2xpZGVyWVdyYXApO1xuXG4gICAgdmFyIHNsaWRlclhUcmFjayA9IHRoaXMuX3NsaWRlclhUcmFjayA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHNsaWRlclhUcmFjay5zZXRTdHlsZUNsYXNzKENTUy5HcmFwaFNsaWRlclgpO1xuXG4gICAgdmFyIHNsaWRlcllUcmFjayA9IHRoaXMuX3NsaWRlcllUcmFjayA9IG5ldyBOb2RlKCk7XG4gICAgICAgIHNsaWRlcllUcmFjay5zZXRTdHlsZUNsYXNzKENTUy5HcmFwaFNsaWRlclkpO1xuXG4gICAgdmFyIHNsaWRlclhIYW5kbGUgPSB0aGlzLl9zbGlkZXJYSGFuZGxlID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWEhhbmRsZS5zZXRTdHlsZUNsYXNzKENTUy5HcmFwaFNsaWRlclhIYW5kbGUpO1xuXG4gICAgdmFyIHNsaWRlcllIYW5kbGUgPSB0aGlzLl9zbGlkZXJZSGFuZGxlID0gbmV3IE5vZGUoKTtcbiAgICAgICAgc2xpZGVyWUhhbmRsZS5zZXRTdHlsZUNsYXNzKENTUy5HcmFwaFNsaWRlcllIYW5kbGUpO1xuXG4gICAgc2xpZGVyWFRyYWNrLmFkZENoaWxkKHNsaWRlclhIYW5kbGUpO1xuICAgIHNsaWRlcllUcmFjay5hZGRDaGlsZChzbGlkZXJZSGFuZGxlKTtcbiAgICBzbGlkZXJYV3JhcC5hZGRDaGlsZChzbGlkZXJYVHJhY2spO1xuICAgIHNsaWRlcllXcmFwLmFkZENoaWxkKHNsaWRlcllUcmFjayk7XG5cbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcblxuICAgIHZhciBwbG90TW9kZSA9IHRoaXMuX3Bsb3RNb2RlID0gZnVuY0FyZ0xlbmd0aCA9PSAxID9cbiAgICAgICAgRnVuY3Rpb25QbG90VHlwZS5OT05fSU1QTElDSVQgOlxuICAgICAgICBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUO1xuXG4gICAgaWYgKHBsb3RNb2RlID09IEZ1bmN0aW9uUGxvdFR5cGUuSU1QTElDSVQpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gc2l6ZSArICdweCc7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5oZWlnaHQgPSBzaXplO1xuXG4gICAgICAgIHdyYXBOb2RlLmdldEVsZW1lbnQoKS5pbnNlcnRCZWZvcmUoY2FudmFzLCBzdmcpO1xuXG4gICAgICAgIHRoaXMuX2NhbnZhc0NvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgdGhpcy5fY2FudmFzSW1hZ2VEYXRhID0gdGhpcy5fY2FudmFzQ29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgc2l6ZSwgc2l6ZSk7XG5cbiAgICAgICAgYXhlcy5zdHlsZS5zdHJva2UgPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9BWEVTX0NPTE9SO1xuICAgICAgICBncmlkLnN0eWxlLnN0cm9rZSA9IFByZXNldC5GVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX0dSSURfQ09MT1I7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBheGVzLnN0eWxlLnN0cm9rZSA9IFByZXNldC5GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9BWEVTX0NPTE9SO1xuICAgICAgICBncmlkLnN0eWxlLnN0cm9rZSA9IFByZXNldC5GVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9HUklEX0NPTE9SO1xuICAgIH1cblxuICAgIHdyYXBOb2RlLmFkZENoaWxkKHNsaWRlclhXcmFwKTtcbiAgICB3cmFwTm9kZS5hZGRDaGlsZChzbGlkZXJZV3JhcCk7XG5cbiAgICBzbGlkZXJYSGFuZGxlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uU2xpZGVyWEhhbmRsZURvd24uYmluZCh0aGlzKSk7XG4gICAgc2xpZGVyWUhhbmRsZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vblNsaWRlcllIYW5kbGVEb3duLmJpbmQodGhpcykpO1xuXG4gICAgdmFyIHVuaXRzID0gdGhpcy5fdW5pdHMgPSBbbnVsbCwgbnVsbF07XG4gICAgdGhpcy5fc2NhbGUgPSBudWxsO1xuXG4gICAgaWYgKHBsb3RNb2RlID09IEZ1bmN0aW9uUGxvdFR5cGUuTk9OX0lNUExJQ0lUKSB7XG4gICAgICAgIHVuaXRzWzBdID0gUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX1VOSVRfWDtcbiAgICAgICAgdW5pdHNbMV0gPSBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfVU5JVF9ZO1xuXG4gICAgICAgIHRoaXMuX3NjYWxlID0gUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfTk9OX0lNUExJQ0lUX1NDQUxFO1xuICAgIH1cbiAgICBlbHNlIGlmIChwbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUKSB7XG4gICAgICAgIHVuaXRzWzBdID0gUHJlc2V0LkZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfVU5JVF9YO1xuICAgICAgICB1bml0c1sxXSA9IFByZXNldC5GVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1VOSVRfWTtcblxuICAgICAgICB0aGlzLl9zY2FsZSA9IFByZXNldC5GVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1NDQUxFO1xuICAgIH1cblxuICAgIHRoaXMuX3VuaXRzTWluTWF4ID0gW1ByZXNldC5GVU5DVElPTl9QTE9UVEVSX1VOSVRfTUlOLCBQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9VTklUX01BWF07IC8vMS84LT40XG5cbiAgICB0aGlzLl9zY2FsZU1pbk1heCA9IFtQcmVzZXQuRlVOQ1RJT05fUExPVFRFUl9TQ0FMRV9NSU4sIFByZXNldC5GVU5DVElPTl9QTE9UVEVSX1NDQUxFX01BWF07IC8vMS81MCAtPiAyNVxuXG4gICAgdGhpcy5fY2VudGVyID0gW01hdGgucm91bmQoc2l6ZSAqIDAuNSksTWF0aC5yb3VuZChzaXplICogMC41KV07XG4gICAgdGhpcy5fc3ZnUG9zID0gWzAsIDBdO1xuXG4gICAgdGhpcy5fZnVuYyA9IG51bGw7XG4gICAgdGhpcy5zZXRGdW5jdGlvbih0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG5cbiAgICB0aGlzLl9zbGlkZXJYSGFuZGxlVXBkYXRlKCk7XG4gICAgdGhpcy5fc2xpZGVyWUhhbmRsZVVwZGF0ZSgpO1xuXG4gICAgc3ZnLmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbkRyYWdTdGFydC5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gICAgdGhpcy5fd3JhcE5vZGUuZ2V0RWxlbWVudCgpLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXdoZWVsXCIsIHRoaXMuX29uU2NhbGUuYmluZCh0aGlzLCBmYWxzZSkpO1xuXG4gICAgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCkuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5VUERBVEVfVkFMVUUsIHRoaXMsICdvblZhbHVlVXBkYXRlJyk7XG59XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBsb3R0ZXIucHJvdG90eXBlKTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fdXBkYXRlQ2VudGVyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXG4gICAgICAgIHdpZHRoID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBoZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuXG4gICAgdmFyIG1vdXNlUG9zID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgc3ZnUG9zID0gdGhpcy5fc3ZnUG9zLFxuICAgICAgICBjZW50ZXIgPSB0aGlzLl9jZW50ZXI7XG5cbiAgICBjZW50ZXJbMF0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1swXSAtIHN2Z1Bvc1swXSwgd2lkdGgpKTtcbiAgICBjZW50ZXJbMV0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1sxXSAtIHN2Z1Bvc1sxXSwgaGVpZ2h0KSk7XG5cbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uRHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMuX3N2ZztcblxuICAgIHZhciBzdmdQb3MgPSB0aGlzLl9zdmdQb3M7XG4gICAgc3ZnUG9zWzBdID0gMDtcbiAgICBzdmdQb3NbMV0gPSAwO1xuXG4gICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgc3ZnUG9zWzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgc3ZnUG9zWzFdICs9IGVsZW1lbnQub2Zmc2V0VG9wO1xuICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgfVxuXG4gICAgdmFyIGV2ZW50TW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgb25EcmFnID0gdGhpcy5fdXBkYXRlQ2VudGVyLmJpbmQodGhpcyksXG4gICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUNlbnRlci5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgICAgICB9LmJpbmQodGhpcyk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgIHRoaXMuX3VwZGF0ZUNlbnRlcigpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TY2FsZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgZSA9IHdpbmRvdy5ldmVudCB8fCBlO1xuICAgIHRoaXMuX3NjYWxlICs9IE1hdGgubWF4KC0xLCBNYXRoLm1pbigxLCAoZS53aGVlbERlbHRhIHx8IC1lLmRldGFpbCkpKSAqIC0xO1xuXG4gICAgdmFyIHNjYWxlTWluTWF4ID0gdGhpcy5fc2NhbGVNaW5NYXg7XG4gICAgdGhpcy5fc2NhbGUgPSBNYXRoLm1heChzY2FsZU1pbk1heFswXSwgTWF0aC5taW4odGhpcy5fc2NhbGUsIHNjYWxlTWluTWF4WzFdKSk7XG5cbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0RnVuY3Rpb24odGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fcmVkcmF3ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9wbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLklNUExJQ0lUKSB7XG4gICAgICAgIHZhciBzaXplID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgICAgIGNhbnZhcyA9IHRoaXMuX2NhbnZhcztcblxuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gc2l6ZSArICdweCc7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5oZWlnaHQgPSBzaXplO1xuXG4gICAgICAgIHRoaXMuX2NhbnZhc0ltYWdlRGF0YSA9IHRoaXMuX2NhbnZhc0NvbnRleHQuZ2V0SW1hZ2VEYXRhKDAsIDAsIHNpemUsIHNpemUpO1xuICAgIH1cblxuICAgIHRoaXMuX3NsaWRlclhIYW5kbGVVcGRhdGUoKTtcbiAgICB0aGlzLl9zbGlkZXJZSGFuZGxlVXBkYXRlKCk7XG5cbiAgICB0aGlzLnNldEZ1bmN0aW9uKHRoaXMuX29iamVjdFt0aGlzLl9rZXldKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuc2V0RnVuY3Rpb24gPSBmdW5jdGlvbiAoZnVuYykge1xuICAgIHRoaXMuX2Z1bmMgPSBmdW5jLmJpbmQodGhpcy5fb2JqZWN0KTtcbiAgICB0aGlzLl9wbG90R3JhcGgoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3Bsb3RHcmFwaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9kcmF3R3JpZCgpO1xuICAgIHRoaXMuX2RyYXdBeGVzKCk7XG4gICAgdGhpcy5fZHJhd1Bsb3QoKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX2RyYXdBeGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcsXG4gICAgICAgIHN2Z1dpZHRoID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBzdmdIZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuXG4gICAgdmFyIGNlbnRlciA9IHRoaXMuX2NlbnRlcixcbiAgICAgICAgY2VudGVyWCA9IGNlbnRlclswXSxcbiAgICAgICAgY2VudGVyWSA9IGNlbnRlclsxXTtcblxuICAgIHZhciBwYXRoQ21kID0gJyc7XG4gICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCBjZW50ZXJZLCBzdmdXaWR0aCwgY2VudGVyWSk7XG4gICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZShjZW50ZXJYLCAwLCBjZW50ZXJYLCBzdmdIZWlnaHQpO1xuXG4gICAgdGhpcy5fYXhlcy5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX2RyYXdQbG90ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3aWR0aCwgaGVpZ2h0O1xuXG4gICAgdmFyIGNlbnRlciA9IHRoaXMuX2NlbnRlcixcbiAgICAgICAgY2VudGVyWCA9IGNlbnRlclswXSxcbiAgICAgICAgY2VudGVyWSA9IGNlbnRlclsxXTtcblxuICAgIHZhciB1bml0cyA9IHRoaXMuX3VuaXRzLFxuICAgICAgICB1bml0WCwgdW5pdFk7XG5cbiAgICB2YXIgc2NhbGUgPSB0aGlzLl9zY2FsZTtcbiAgICB2YXIgbm9ybXZhbCwgc2NhbGVkVmFsLCB2YWx1ZSwgaW5kZXg7XG4gICAgdmFyIG9mZnNldFgsIG9mZnNldFk7XG5cbiAgICB2YXIgaTtcblxuICAgIGlmICh0aGlzLl9wbG90TW9kZSA9PSBGdW5jdGlvblBsb3RUeXBlLk5PTl9JTVBMSUNJVCkge1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnO1xuXG4gICAgICAgIHdpZHRoID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpO1xuICAgICAgICBoZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuICAgICAgICB1bml0WCA9IHVuaXRzWzBdICogc2NhbGU7XG4gICAgICAgIHVuaXRZID0gaGVpZ2h0IC8gKHVuaXRzWzFdICogc2NhbGUpO1xuICAgICAgICBvZmZzZXRYID0gY2VudGVyWCAvIHdpZHRoO1xuXG4gICAgICAgIHZhciBsZW4gPSBNYXRoLmZsb29yKHdpZHRoKSxcbiAgICAgICAgICAgIHBvaW50cyA9IG5ldyBBcnJheShsZW4gKiAyKTtcblxuICAgICAgICBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIG5vcm12YWwgPSAoLW9mZnNldFggKyBpIC8gbGVuKTtcbiAgICAgICAgICAgIHNjYWxlZFZhbCA9IG5vcm12YWwgKiB1bml0WDtcbiAgICAgICAgICAgIHZhbHVlID0gY2VudGVyWSAtIHRoaXMuX2Z1bmMoc2NhbGVkVmFsKSAqIHVuaXRZO1xuXG4gICAgICAgICAgICBpbmRleCA9IGkgKiAyO1xuXG4gICAgICAgICAgICBwb2ludHNbaW5kZXhdID0gaTtcbiAgICAgICAgICAgIHBvaW50c1tpbmRleCArIDFdID0gdmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcGF0aENtZCA9ICcnO1xuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRNb3ZlVG8ocG9pbnRzWzBdLCBwb2ludHNbMV0pO1xuXG4gICAgICAgIGkgPSAyO1xuICAgICAgICB3aGlsZSAoaSA8IHBvaW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmVUbyhwb2ludHNbaV0sIHBvaW50c1tpICsgMV0pO1xuICAgICAgICAgICAgaSArPSAyO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXMsXG4gICAgICAgICAgICBjb250ZXh0ID0gdGhpcy5fY2FudmFzQ29udGV4dCxcbiAgICAgICAgICAgIGltZ0RhdGEgPSB0aGlzLl9jYW52YXNJbWFnZURhdGE7XG5cbiAgICAgICAgd2lkdGggPSBjYW52YXMud2lkdGg7XG4gICAgICAgIGhlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG5cbiAgICAgICAgdW5pdFggPSB1bml0c1swXSAqIHNjYWxlO1xuICAgICAgICB1bml0WSA9IHVuaXRzWzFdICogc2NhbGU7XG5cbiAgICAgICAgb2Zmc2V0WCA9IGNlbnRlclggLyB3aWR0aDtcbiAgICAgICAgb2Zmc2V0WSA9IGNlbnRlclkgLyBoZWlnaHQ7XG5cbiAgICAgICAgdmFyIGludldpZHRoID0gMSAvIHdpZHRoLFxuICAgICAgICAgICAgaW52SGVpZ2h0ID0gMSAvIGhlaWdodDtcbiAgICAgICAgdmFyIHJnYiA9IFswLCAwLCAwXTtcblxuICAgICAgICB2YXIgY29sMCA9IFszMCwgMzQsIDM2XSxcbiAgICAgICAgICAgIGNvbDEgPSBbMjU1LCAyNTUsIDI1NV07XG5cbiAgICAgICAgaSA9IC0xO1xuICAgICAgICB2YXIgajtcbiAgICAgICAgd2hpbGUgKCsraSA8IGhlaWdodCkge1xuICAgICAgICAgICAgaiA9IC0xO1xuXG4gICAgICAgICAgICB3aGlsZSAoKytqIDwgd2lkdGgpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMuX2Z1bmMoKC1vZmZzZXRYICsgaiAqIGludldpZHRoKSAqIHVuaXRYLFxuICAgICAgICAgICAgICAgICAgICAoLW9mZnNldFkgKyBpICogaW52SGVpZ2h0KSAqIHVuaXRZKTtcblxuICAgICAgICAgICAgICAgIHJnYlswXSA9IE1hdGguZmxvb3IoKGNvbDFbMF0gLSBjb2wwWzBdKSAqIHZhbHVlICsgY29sMFswXSk7XG4gICAgICAgICAgICAgICAgcmdiWzFdID0gTWF0aC5mbG9vcigoY29sMVsxXSAtIGNvbDBbMV0pICogdmFsdWUgKyBjb2wwWzFdKTtcbiAgICAgICAgICAgICAgICByZ2JbMl0gPSBNYXRoLmZsb29yKChjb2wxWzJdIC0gY29sMFsyXSkgKiB2YWx1ZSArIGNvbDBbMl0pO1xuXG4gICAgICAgICAgICAgICAgaW5kZXggPSAoaSAqIHdpZHRoICsgaikgKiA0O1xuXG4gICAgICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2luZGV4XSA9IHJnYlswXTtcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXggKyAxXSA9IHJnYlsxXTtcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXggKyAyXSA9IHJnYlsyXTtcbiAgICAgICAgICAgICAgICBpbWdEYXRhLmRhdGFbaW5kZXggKyAzXSA9IDI1NTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKTtcbiAgICB9XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9kcmF3R3JpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnLFxuICAgICAgICB3aWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgaGVpZ2h0ID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKTtcblxuICAgIHZhciBzY2FsZSA9IHRoaXMuX3NjYWxlO1xuXG4gICAgdmFyIGdyaWRSZXMgPSB0aGlzLl91bml0cyxcbiAgICAgICAgZ3JpZFNwYWNpbmdYID0gd2lkdGggLyAoZ3JpZFJlc1swXSAqIHNjYWxlKSxcbiAgICAgICAgZ3JpZFNwYWNpbmdZID0gaGVpZ2h0IC8gKGdyaWRSZXNbMV0gKiBzY2FsZSk7XG5cbiAgICB2YXIgY2VudGVyID0gdGhpcy5fY2VudGVyLFxuICAgICAgICBjZW50ZXJYID0gY2VudGVyWzBdLFxuICAgICAgICBjZW50ZXJZID0gY2VudGVyWzFdO1xuXG4gICAgdmFyIGdyaWROdW1Ub3AgPSBNYXRoLnJvdW5kKGNlbnRlclkgLyBncmlkU3BhY2luZ1kpICsgMSxcbiAgICAgICAgZ3JpZE51bUJvdHRvbSA9IE1hdGgucm91bmQoKGhlaWdodCAtIGNlbnRlclkpIC8gZ3JpZFNwYWNpbmdZKSArIDEsXG4gICAgICAgIGdyaWROdW1MZWZ0ID0gTWF0aC5yb3VuZChjZW50ZXJYIC8gZ3JpZFNwYWNpbmdYKSArIDEsXG4gICAgICAgIGdyaWROdW1SaWdodCA9IE1hdGgucm91bmQoKHdpZHRoIC0gY2VudGVyWCkgLyBncmlkU3BhY2luZ1gpICsgMTtcblxuICAgIHZhciBwYXRoQ21kR3JpZCA9ICcnLFxuICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyA9ICcnO1xuXG4gICAgdmFyIGksIHRlbXA7XG5cbiAgICB2YXIgc3Ryb2tlU2l6ZSA9IE1ldHJpYy5TVFJPS0VfU0laRTtcblxuICAgIHZhciBsYWJlbFRpY2tTaXplID0gTWV0cmljLkZVTkNUSU9OX1BMT1RURVJfTEFCRUxfVElDS19TSVpFLFxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nUmlnaHQgPSB3aWR0aCAtIGxhYmVsVGlja1NpemUgLSBzdHJva2VTaXplLFxuICAgICAgICBsYWJlbFRpY2tQYWRkaW5nQm90dG9tID0gaGVpZ2h0IC0gbGFiZWxUaWNrU2l6ZSAtIHN0cm9rZVNpemUsXG4gICAgICAgIGxhYmVsVGlja1BhZGRpbmdSaWdodE9mZnNldCA9IGxhYmVsVGlja1BhZGRpbmdSaWdodCAtIGxhYmVsVGlja1NpemUsXG4gICAgICAgIGxhYmVsVGlja1BhZGRpbmdCb3R0b21PZmZzZXQgPSBsYWJlbFRpY2tQYWRkaW5nQm90dG9tIC0gbGFiZWxUaWNrU2l6ZSxcbiAgICAgICAgbGFiZWxUaWNrT2Zmc2V0UmlnaHQgPSBsYWJlbFRpY2tQYWRkaW5nUmlnaHQgLSAobGFiZWxUaWNrU2l6ZSArIHN0cm9rZVNpemUpICogMixcbiAgICAgICAgbGFiZWxUaWNrT2Zmc2V0Qm90dG9tID0gbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSAtIChsYWJlbFRpY2tTaXplICsgc3Ryb2tlU2l6ZSkgKiAyO1xuXG4gICAgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBncmlkTnVtVG9wKSB7XG4gICAgICAgIHRlbXAgPSBNYXRoLnJvdW5kKGNlbnRlclkgLSBncmlkU3BhY2luZ1kgKiBpKTtcbiAgICAgICAgcGF0aENtZEdyaWQgKz0gdGhpcy5fcGF0aENtZExpbmUoMCwgdGVtcCwgd2lkdGgsIHRlbXApO1xuXG4gICAgICAgIGlmICh0ZW1wID4gbGFiZWxUaWNrU2l6ZSl7XG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZShsYWJlbFRpY2tQYWRkaW5nUmlnaHQsIHRlbXAsXG4gICAgICAgICAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0T2Zmc2V0LCB0ZW1wKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgZ3JpZE51bUJvdHRvbSkge1xuICAgICAgICB0ZW1wID0gTWF0aC5yb3VuZChjZW50ZXJZICsgZ3JpZFNwYWNpbmdZICogaSk7XG4gICAgICAgIHBhdGhDbWRHcmlkICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIHRlbXAsIHdpZHRoLCB0ZW1wKTtcblxuICAgICAgICBpZiAodGVtcCA8IGxhYmVsVGlja09mZnNldEJvdHRvbSl7XG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZShsYWJlbFRpY2tQYWRkaW5nUmlnaHQsIHRlbXAsXG4gICAgICAgICAgICAgICAgbGFiZWxUaWNrUGFkZGluZ1JpZ2h0T2Zmc2V0LCB0ZW1wKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgZ3JpZE51bUxlZnQpIHtcbiAgICAgICAgdGVtcCA9IE1hdGgucm91bmQoY2VudGVyWCAtIGdyaWRTcGFjaW5nWCAqIGkpO1xuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCAwLCB0ZW1wLCBoZWlnaHQpO1xuXG4gICAgICAgIGlmICh0ZW1wID4gbGFiZWxUaWNrU2l6ZSl7XG4gICAgICAgICAgICBwYXRoQ21kQXhlc0xhYmVscyArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCBsYWJlbFRpY2tQYWRkaW5nQm90dG9tLFxuICAgICAgICAgICAgICAgIHRlbXAsIGxhYmVsVGlja1BhZGRpbmdCb3R0b21PZmZzZXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPCBncmlkTnVtUmlnaHQpIHtcbiAgICAgICAgdGVtcCA9IE1hdGgucm91bmQoY2VudGVyWCArIGdyaWRTcGFjaW5nWCAqIGkpO1xuICAgICAgICBwYXRoQ21kR3JpZCArPSB0aGlzLl9wYXRoQ21kTGluZSh0ZW1wLCAwLCB0ZW1wLCBoZWlnaHQpO1xuXG4gICAgICAgIGlmICh0ZW1wIDwgbGFiZWxUaWNrT2Zmc2V0UmlnaHQpe1xuICAgICAgICAgICAgcGF0aENtZEF4ZXNMYWJlbHMgKz0gdGhpcy5fcGF0aENtZExpbmUodGVtcCwgbGFiZWxUaWNrUGFkZGluZ0JvdHRvbSxcbiAgICAgICAgICAgICAgICB0ZW1wLCBsYWJlbFRpY2tQYWRkaW5nQm90dG9tT2Zmc2V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX2dyaWQuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZEdyaWQpO1xuICAgIHRoaXMuX2F4ZXNMYWJlbHMuc2V0QXR0cmlidXRlKCdkJywgcGF0aENtZEF4ZXNMYWJlbHMpO1xufTtcblxuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9zbGlkZXJYU3RlcCA9IGZ1bmN0aW9uIChtb3VzZVBvcykge1xuICAgIHZhciBtb3VzZVggPSBtb3VzZVBvc1swXTtcblxuICAgIHZhciBoYW5kbGUgPSB0aGlzLl9zbGlkZXJYSGFuZGxlLFxuICAgICAgICBoYW5kbGVXaWR0aCA9IGhhbmRsZS5nZXRXaWR0aCgpLFxuICAgICAgICBoYW5kbGVXaWR0aEhhbGYgPSBoYW5kbGVXaWR0aCAqIDAuNTtcblxuICAgIHZhciB0cmFjayA9IHRoaXMuX3NsaWRlclhUcmFjayxcbiAgICAgICAgdHJhY2tXaWR0aCA9IHRyYWNrLmdldFdpZHRoKCksXG4gICAgICAgIHRyYWNrTGVmdCA9IHRyYWNrLmdldFBvc2l0aW9uR2xvYmFsWCgpO1xuXG4gICAgdmFyIHN0cm9rZVNpemUgPSBNZXRyaWMuU1RST0tFX1NJWkU7XG5cbiAgICB2YXIgbWF4ID0gdHJhY2tXaWR0aCAtIGhhbmRsZVdpZHRoSGFsZiAtIHN0cm9rZVNpemUgKiAyO1xuXG4gICAgdmFyIHBvcyA9IE1hdGgubWF4KGhhbmRsZVdpZHRoSGFsZiwgTWF0aC5taW4obW91c2VYIC0gdHJhY2tMZWZ0LCBtYXgpKSxcbiAgICAgICAgaGFuZGxlUG9zID0gcG9zIC0gaGFuZGxlV2lkdGhIYWxmO1xuXG4gICAgaGFuZGxlLnNldFBvc2l0aW9uWChoYW5kbGVQb3MpO1xuXG4gICAgdmFyIHVuaXRzTWluID0gdGhpcy5fdW5pdHNNaW5NYXhbMF0sXG4gICAgICAgIHVuaXRzTWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMV07XG5cbiAgICB2YXIgbm9ybVZhbCA9IChwb3MgLSBoYW5kbGVXaWR0aEhhbGYpIC8gKG1heCAtIGhhbmRsZVdpZHRoSGFsZiksXG4gICAgICAgIG1hcHBlZFZhbCA9IHVuaXRzTWluICsgKHVuaXRzTWF4IC0gdW5pdHNNaW4pICogbm9ybVZhbDtcblxuICAgIHRoaXMuX3VuaXRzWzBdID0gbWFwcGVkVmFsO1xuXG4gICAgdGhpcy5fcGxvdEdyYXBoKCk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9zbGlkZXJZU3RlcCA9IGZ1bmN0aW9uIChtb3VzZVBvcykge1xuICAgIHZhciBtb3VzZVkgPSBtb3VzZVBvc1sxXTtcblxuICAgIHZhciBoYW5kbGUgPSB0aGlzLl9zbGlkZXJZSGFuZGxlLFxuICAgICAgICBoYW5kbGVIZWlnaHQgPSBoYW5kbGUuZ2V0SGVpZ2h0KCksXG4gICAgICAgIGhhbmRsZUhlaWdodEhhbGYgPSBoYW5kbGVIZWlnaHQgKiAwLjU7XG5cbiAgICB2YXIgdHJhY2sgPSB0aGlzLl9zbGlkZXJZVHJhY2ssXG4gICAgICAgIHRyYWNrSGVpZ2h0ID0gdHJhY2suZ2V0SGVpZ2h0KCksXG4gICAgICAgIHRyYWNrVG9wID0gdHJhY2suZ2V0UG9zaXRpb25HbG9iYWxZKCk7XG5cbiAgICB2YXIgbWF4ID0gdHJhY2tIZWlnaHQgLSBoYW5kbGVIZWlnaHRIYWxmIC0gMjtcblxuICAgIHZhciBwb3MgPSBNYXRoLm1heChoYW5kbGVIZWlnaHRIYWxmLCBNYXRoLm1pbihtb3VzZVkgLSB0cmFja1RvcCwgbWF4KSksXG4gICAgICAgIGhhbmRsZVBvcyA9IHBvcyAtIGhhbmRsZUhlaWdodEhhbGY7XG5cbiAgICBoYW5kbGUuc2V0UG9zaXRpb25ZKGhhbmRsZVBvcyk7XG5cbiAgICB2YXIgdW5pdHNNYXggPSB0aGlzLl91bml0c01pbk1heFswXSxcbiAgICAgICAgdW5pdHNNaW4gPSB0aGlzLl91bml0c01pbk1heFsxXTtcblxuICAgIHZhciBub3JtVmFsID0gKHBvcyAtIGhhbmRsZUhlaWdodEhhbGYpIC8gKG1heCAtIGhhbmRsZUhlaWdodEhhbGYpLFxuICAgICAgICBtYXBwZWRWYWwgPSB1bml0c01pbiArICh1bml0c01heCAtIHVuaXRzTWluKSAqIG5vcm1WYWw7XG5cbiAgICB0aGlzLl91bml0c1sxXSA9IG1hcHBlZFZhbDtcblxuICAgIHRoaXMuX3Bsb3RHcmFwaCgpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fb25TbGlkZXJYSGFuZGxlRG93biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9vblNsaWRlckhhbmRsZURvd24odGhpcy5fc2xpZGVyWFN0ZXAuYmluZCh0aGlzKSk7XG59O1xuXG5GdW5jdGlvblBsb3R0ZXIucHJvdG90eXBlLl9vblNsaWRlcllIYW5kbGVEb3duID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX29uU2xpZGVySGFuZGxlRG93bih0aGlzLl9zbGlkZXJZU3RlcC5iaW5kKHRoaXMpKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX29uU2xpZGVySGFuZGxlRG93biA9IGZ1bmN0aW9uIChzbGlkZXJTdGVwRnVuYykge1xuICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRNb3VzZVVwID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUDtcblxuICAgIHZhciBtb3VzZSA9IE1vdXNlLmdldCgpO1xuXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNsaWRlclN0ZXBGdW5jKG1vdXNlLmdldFBvc2l0aW9uKCkpXG4gICAgICAgIH0sXG4gICAgICAgIG9uRHJhZ0VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgc2xpZGVyU3RlcEZ1bmMobW91c2UuZ2V0UG9zaXRpb24oKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xufTtcblxuRnVuY3Rpb25QbG90dGVyLnByb3RvdHlwZS5fc2xpZGVyWEhhbmRsZVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdW5pdE1pbiA9IHRoaXMuX3VuaXRzTWluTWF4WzBdLFxuICAgICAgICB1bml0TWF4ID0gdGhpcy5fdW5pdHNNaW5NYXhbMV0sXG4gICAgICAgIHVuaXRYID0gdGhpcy5fdW5pdHNbMF07XG5cbiAgICB2YXIgaGFuZGxlWCA9IHRoaXMuX3NsaWRlclhIYW5kbGUsXG4gICAgICAgIGhhbmRsZVhXaWR0aCA9IGhhbmRsZVguZ2V0V2lkdGgoKSxcbiAgICAgICAgaGFuZGxlWFdpZHRoSGFsZiA9IGhhbmRsZVhXaWR0aCAqIDAuNSxcbiAgICAgICAgdHJhY2tYV2lkdGggPSB0aGlzLl9zbGlkZXJYVHJhY2suZ2V0V2lkdGgoKTtcblxuICAgIHZhciBzdHJva2VTaXplID0gTWV0cmljLlNUUk9LRV9TSVpFO1xuXG4gICAgdmFyIGhhbmRsZVhNaW4gPSBoYW5kbGVYV2lkdGhIYWxmLFxuICAgICAgICBoYW5kbGVYTWF4ID0gdHJhY2tYV2lkdGggLSBoYW5kbGVYV2lkdGhIYWxmIC0gc3Ryb2tlU2l6ZSAqIDI7XG5cbiAgICBoYW5kbGVYLnNldFBvc2l0aW9uWCgoaGFuZGxlWE1pbiArIChoYW5kbGVYTWF4IC0gaGFuZGxlWE1pbikgKiAoKHVuaXRYIC0gdW5pdE1pbikgLyAodW5pdE1heCAtIHVuaXRNaW4pKSkgLSBoYW5kbGVYV2lkdGhIYWxmKTtcbn07XG5cbkZ1bmN0aW9uUGxvdHRlci5wcm90b3R5cGUuX3NsaWRlcllIYW5kbGVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHVuaXRNaW4gPSB0aGlzLl91bml0c01pbk1heFswXSxcbiAgICAgICAgdW5pdE1heCA9IHRoaXMuX3VuaXRzTWluTWF4WzFdLFxuICAgICAgICB1bml0WSA9IHRoaXMuX3VuaXRzWzFdO1xuXG4gICAgdmFyIGhhbmRsZVkgPSB0aGlzLl9zbGlkZXJZSGFuZGxlLFxuICAgICAgICBoYW5kbGVZSGVpZ2h0ID0gaGFuZGxlWS5nZXRIZWlnaHQoKSxcbiAgICAgICAgaGFuZGxlWUhlaWdodEhhbGYgPSBoYW5kbGVZSGVpZ2h0ICogMC41LFxuICAgICAgICB0cmFja1lIZWlnaHQgPSB0aGlzLl9zbGlkZXJZVHJhY2suZ2V0SGVpZ2h0KCk7XG5cbiAgICB2YXIgc3Ryb2tlU2l6ZSA9IE1ldHJpYy5TVFJPS0VfU0laRTtcblxuICAgIHZhciBoYW5kbGVZTWluID0gdHJhY2tZSGVpZ2h0IC0gaGFuZGxlWUhlaWdodEhhbGYgLSBzdHJva2VTaXplICogMixcbiAgICAgICAgaGFuZGxlWU1heCA9IGhhbmRsZVlIZWlnaHRIYWxmO1xuXG4gICAgaGFuZGxlWS5zZXRQb3NpdGlvblkoKGhhbmRsZVlNaW4gKyAoaGFuZGxlWU1heCAtIGhhbmRsZVlNaW4pICogKCh1bml0WSAtIHVuaXRNaW4pIC8gKHVuaXRNYXggLSB1bml0TWluKSkpIC0gaGFuZGxlWUhlaWdodEhhbGYpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGdW5jdGlvblBsb3R0ZXI7IiwiZnVuY3Rpb24gRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IoKXtcblx0RXJyb3IuYXBwbHkodGhpcyk7XG5cdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3IpO1xuXHR0aGlzLm5hbWUgPSAnRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3InO1xuXHR0aGlzLm1lc3NhZ2UgPSAnRnVuY3Rpb24gc2hvdWxkIGJlIG9mIGZvcm0gZih4KSBvciBmKHgseSkuJztcbn1cbkZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkZ1bmN0aW9uUGxvdHRlckZ1bmN0aW9uQXJnc0Vycm9yLmNvbnN0cnVjdG9yID0gRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gRnVuY3Rpb25QbG90dGVyRnVuY3Rpb25BcmdzRXJyb3I7IiwiZnVuY3Rpb24gRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3Iob2JqZWN0LGtleSl7XG5cdEVycm9yLmFwcGx5KHRoaXMpO1xuXHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLEZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yKTtcblx0dGhpcy5uYW1lID0gJ0NvbXBvbmVudE9iamVjdEVycm9yJztcblx0dGhpcy5tZXNzYWdlID0gJ09iamVjdCAnICsgb2JqZWN0LmNvbnN0cnVjdG9yLm5hbWUgKyAnICcgKyBrZXkgKyAnc2hvdWxkIGJlIG9mIHR5cGUgRnVuY3Rpb24uJztcbn1cbkZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkZ1bmN0aW9uUGxvdHRlck9iamVjdEVycm9yLmNvbnN0cnVjdG9yID0gRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gRnVuY3Rpb25QbG90dGVyT2JqZWN0RXJyb3I7IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XG52YXIgTnVtYmVySW5wdXRfSW50ZXJuYWwgPSByZXF1aXJlKCcuL051bWJlcklucHV0X0ludGVybmFsJyk7XG5cbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE9wdGlvbnMgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcbnZhciBQcmVzZXRCdG4gPSByZXF1aXJlKCcuL1ByZXNldEJ0bicpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4uL2NvcmUvTWV0cmljJyk7XG5cbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbnZhciBPYmplY3RDb21wb25lbnROb3RpZmllciA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Tm90aWZpZXInKTtcblxudmFyIERFRkFVTFRfSU5QVVRfRFAgICAgID0gMixcbiAgICBERUZBVUxUX0lOUFVUX1NURVAgICA9IDEsXG4gICAgREVGQVVMVF9JTlBVVF9QUkVTRVQgPSBudWxsO1xuXG5mdW5jdGlvbiBOdW1iZXJJbnB1dChwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICBwYXJhbXMgICAgICAgICAgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHBhcmFtcy5kcCAgICAgICA9IHBhcmFtcy5kcCAgICAgICB8fCBERUZBVUxUX0lOUFVUX0RQO1xuICAgIHBhcmFtcy5zdGVwICAgICA9IHBhcmFtcy5zdGVwICAgICB8fCBERUZBVUxUX0lOUFVUX1NURVA7XG4gICAgcGFyYW1zLnByZXNldHMgID0gcGFyYW1zLnByZXNldHMgIHx8IERFRkFVTFRfSU5QVVRfUFJFU0VUO1xuXG4gICAgdGhpcy5fb25DaGFuZ2UgICAgPSBwYXJhbXMub25DaGFuZ2U7XG4gICAgdGhpcy5fcHJlc2V0c0tleSAgPSBwYXJhbXMucHJlc2V0cztcblxuXG4gICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXQgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwocGFyYW1zLnN0ZXAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmRwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRGaW5pc2guYmluZCh0aGlzKSk7XG5cbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcblxuICAgIHZhciBwcmVzZXRzID0gIHBhcmFtcy5wcmVzZXRzO1xuICAgIGlmICghcHJlc2V0cykge1xuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChpbnB1dC5nZXROb2RlKCkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIGlucHV0V3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgICAgICBpbnB1dFdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcElucHV0V1ByZXNldCk7XG5cbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQoaW5wdXRXcmFwKTtcbiAgICAgICAgaW5wdXRXcmFwLmFkZENoaWxkKGlucHV0LmdldE5vZGUoKSk7XG5cbiAgICAgICAgdmFyIG9wdGlvbnMgICA9IE9wdGlvbnMuZ2V0KCk7XG4gICAgICAgIHZhciBwcmVzZXRCdG4gPSB0aGlzLl9wcmVzZXRCdG4gPSBuZXcgUHJlc2V0QnRuKHRoaXMuX3dyYXBOb2RlKTtcblxuICAgICAgICB2YXIgb25QcmVzZXREZWFjdGl2YXRlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKTtcbiAgICAgICAgICAgIHByZXNldEJ0bi5kZWFjdGl2YXRlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgb25QcmVzZXRBY3RpdmF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuYnVpbGQocHJlc2V0cywgaW5wdXQuZ2V0VmFsdWUoKSwgaW5wdXQuZ2V0Tm9kZSgpLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuc2V0VmFsdWUocHJlc2V0c1tvcHRpb25zLmdldFNlbGVjdGVkSW5kZXgoKV0pO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUHJlc2V0RGVhY3RpdmF0ZSwgTWV0cmljLlBBRERJTkdfUFJFU0VULFxuICAgICAgICAgICAgICAgIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgICAgICBwcmVzZXRCdG4uc2V0T25BY3RpdmUob25QcmVzZXRBY3RpdmF0ZSk7XG4gICAgICAgIHByZXNldEJ0bi5zZXRPbkRlYWN0aXZlKG9uUHJlc2V0RGVhY3RpdmF0ZSlcbiAgICB9XG5cbiAgICBpbnB1dC5nZXROb2RlKCkuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgICB0aGlzLl9vbklucHV0RHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRyx0aGlzLl9wYXJlbnQsJ29uQ29tcG9uZW50U2VsZWN0RHJhZycpO1xuXG4gICAgaW5wdXQuc2V0VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufVxuXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cbk51bWJlcklucHV0LnByb3RvdHlwZS5fb25JbnB1dEZpbmlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbn07XG5cbk51bWJlcklucHV0LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgdGhpcy5fb2JqZWN0W3RoaXMuX2tleV0gPSB0aGlzLl9pbnB1dC5nZXRWYWx1ZSgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCxudWxsKSk7XG59O1xuXG5OdW1iZXJJbnB1dC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faW5wdXQuc2V0VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufTtcblxuLy9QcmV2ZW50IGNocm9tZSBzZWxlY3QgZHJhZ1xuTnVtYmVySW5wdXQucHJvdG90eXBlLl9vbklucHV0RHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBldmVudE1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50VXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIGV2ZW50ID0gQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUc7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgZXZlbnQsIG51bGwpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbkRyYWdGaW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuXG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnRmluaXNoLCBmYWxzZSk7XG4gICAgICAgIH07XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRVcCwgb25EcmFnRmluaXNoLCBmYWxzZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlcklucHV0OyIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpO1xudmFyIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgUFJFU0VUX1NISUZUX01VTFRJUExJRVIgID0gMTA7XG5cbk51bWJlcklucHV0X0ludGVybmFsID0gZnVuY3Rpb24gKHN0ZXBWYWx1ZSwgZGVjaW1hbFBsYWNlcywgb25CZWdpbiwgb25DaGFuZ2UsIG9uRmluaXNoKSB7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsIG51bGwpO1xuXG4gICAgdGhpcy5fdmFsdWUgPSAwO1xuICAgIHRoaXMuX3ZhbHVlU3RlcCA9IHN0ZXBWYWx1ZTtcbiAgICB0aGlzLl92YWx1ZURQbGFjZSA9IGRlY2ltYWxQbGFjZXMgKyAxO1xuXG4gICAgdGhpcy5fb25CZWdpbiA9IG9uQmVnaW4gfHwgZnVuY3Rpb24gKCl7fTtcbiAgICB0aGlzLl9vbkNoYW5nZSA9IG9uQ2hhbmdlIHx8IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgdGhpcy5fcHJldktleUNvZGUgPSBudWxsO1xuXG4gICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXQgPSBuZXcgTm9kZShOb2RlLklOUFVUX1RFWFQpO1xuICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsIHRoaXMuX3ZhbHVlKTtcblxuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50LktFWV9ET1dOLCB0aGlzLl9vbklucHV0S2V5RG93bi5iaW5kKHRoaXMpKTtcbiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5LRVlfVVAsIHRoaXMuX29uSW5wdXRLZXlVcC5iaW5kKHRoaXMpKTtcbiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5DSEFOR0UsIHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSk7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuX29uSW5wdXRLZXlEb3duID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgc3RlcCA9IChlLnNoaWZ0S2V5ID8gUFJFU0VUX1NISUZUX01VTFRJUExJRVIgOiAxKSAqIHRoaXMuX3ZhbHVlU3RlcCxcbiAgICAgICAga2V5Q29kZSA9IGUua2V5Q29kZTtcblxuICAgIGlmIChrZXlDb2RlID09IDM4IHx8XG4gICAgICAgIGtleUNvZGUgPT0gNDApIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIHZhciBtdWx0aXBsaWVyID0ga2V5Q29kZSA9PSAzOCA/IDEuMCA6IC0xLjA7XG4gICAgICAgIHRoaXMuX3ZhbHVlICs9IChzdGVwICogbXVsdGlwbGllcik7XG5cbiAgICAgICAgdGhpcy5fb25CZWdpbigpO1xuICAgICAgICB0aGlzLl9vbkNoYW5nZSgpO1xuICAgICAgICB0aGlzLl9mb3JtYXQoKTtcbiAgICB9XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuX29uSW5wdXRLZXlVcCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgdmFyIGtleUNvZGUgPSBlLmtleUNvZGU7XG5cblxuICAgIGlmIChlLnNoaWZ0S2V5IHx8IGtleUNvZGUgPT0gMzggfHxcbiAgICAgICAga2V5Q29kZSA9PSA0MCB8fCBrZXlDb2RlID09IDE5MCB8fFxuICAgICAgICBrZXlDb2RlID09IDggfHwga2V5Q29kZSA9PSAzOSB8fFxuICAgICAgICBrZXlDb2RlID09IDM3IHx8IGtleUNvZGUgPT0gMTg5KSB7XG4gICAgICAgIHRoaXMuX3ByZXZLZXlDb2RlID0ga2V5Q29kZTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wcmV2S2V5Q29kZSA9PSAxODkgJiYga2V5Q29kZSA9PSA0OCkge1xuICAgICAgICByZXR1cm47XG4gICAgfSAvLy0wXG4gICAgaWYgKHRoaXMuX3ByZXZLZXlDb2RlID09IDE5MCAmJiBrZXlDb2RlID09IDQ4KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9IC8vMC4wXG5cbiAgICB0aGlzLl92YWxpZGF0ZSgpO1xuICAgIHRoaXMuX2Zvcm1hdCgpO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl9vbklucHV0Q2hhbmdlID0gZnVuY3Rpb24gKGUpIHtcbiAgICB0aGlzLl92YWxpZGF0ZSgpO1xuICAgIHRoaXMuX2Zvcm1hdCgpO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLl92YWxpZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pbnB1dElzTnVtYmVyKCkpIHtcbiAgICAgICAgdmFyIGlucHV0ID0gdGhpcy5fZ2V0SW5wdXQoKTtcbiAgICAgICAgaWYgKGlucHV0ICE9ICctJyl0aGlzLl92YWx1ZSA9IE51bWJlcihpbnB1dCk7XG4gICAgICAgIHRoaXMuX29uQ2hhbmdlKCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl9zZXRPdXRwdXQodGhpcy5fdmFsdWUpO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLmlucHV0SXNOdW1iZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5fZ2V0SW5wdXQoKTtcblxuICAgIC8vVE9ETzpGSVhcbiAgICBpZiAodmFsdWUgPT0gJy0nIHx8IHZhbHVlID09ICcwJylyZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gL15cXHMqLT9bMC05XVxcZCooXFwuXFxkezEsMTAwMDAwMH0pP1xccyokLy50ZXN0KHZhbHVlKTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5fZm9ybWF0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdHJpbmcgPSB0aGlzLl92YWx1ZS50b1N0cmluZygpLFxuICAgICAgICBpbmRleCA9IHN0cmluZy5pbmRleE9mKCcuJyk7XG5cbiAgICBpZiAoaW5kZXggPiAwKSB7XG4gICAgICAgIHN0cmluZyA9IHN0cmluZy5zbGljZSgwLCBpbmRleCArIHRoaXMuX3ZhbHVlRFBsYWNlKTtcbiAgICB9XG4gICAgdGhpcy5fc2V0T3V0cHV0KHN0cmluZyk7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuX3NldE91dHB1dCA9IGZ1bmN0aW9uIChuKSB7XG4gICAgdGhpcy5faW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJywgbik7XG59O1xuXG5OdW1iZXJJbnB1dF9JbnRlcm5hbC5wcm90b3R5cGUuX2dldElucHV0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9pbnB1dC5nZXRQcm9wZXJ0eSgndmFsdWUnKVxufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl92YWx1ZTtcbn07XG5cbk51bWJlcklucHV0X0ludGVybmFsLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uIChuKSB7XG4gICAgdGhpcy5fdmFsdWUgPSBuO1xuICAgIHRoaXMuX2Zvcm1hdCgpO1xufTtcblxuTnVtYmVySW5wdXRfSW50ZXJuYWwucHJvdG90eXBlLmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lucHV0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXJJbnB1dF9JbnRlcm5hbDtcbiIsInZhciBPdXRwdXQgPSByZXF1aXJlKCcuL091dHB1dCcpO1xuXG52YXIgREVGQVVMVF9PVVRQVVRfRFAgPSAyO1xuXG5mdW5jdGlvbiBOdW1iZXJPdXRwdXQocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcblx0cGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuXHRwYXJhbXMuZHAgPSBwYXJhbXMuZHAgfHwgREVGQVVMVF9PVVRQVVRfRFA7XG5cblx0T3V0cHV0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdHRoaXMuX3ZhbHVlRFBsYWNlID0gcGFyYW1zLmRwICsgMTtcbn1cblxuTnVtYmVyT3V0cHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT3V0cHV0LnByb3RvdHlwZSk7XG5cbi8vRklYTUVcbk51bWJlck91dHB1dC5wcm90b3R5cGUuX3NldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuXHRpZiAodGhpcy5fcGFyZW50LmlzRGlzYWJsZWQoKSl7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dmFyIHZhbHVlID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV0sXG5cdFx0dGV4dEFyZWEgPSB0aGlzLl90ZXh0QXJlYSxcblx0XHRkcCA9IHRoaXMuX3ZhbHVlRFBsYWNlO1xuXG5cdHZhciBpbmRleCxcblx0XHRvdXQ7XG5cblx0aWYgKHR5cGVvZih2YWx1ZSkgPT09ICdvYmplY3QnICYmXG5cdFx0dHlwZW9mKHZhbHVlLmxlbmd0aCkgPT09ICdudW1iZXInICYmXG5cdFx0dHlwZW9mKHZhbHVlLnNwbGljZSkgPT09ICdmdW5jdGlvbicgJiZcblx0XHQhdmFsdWUucHJvcGVydHlJc0VudW1lcmFibGUoJ2xlbmd0aCcpKSB7XG5cblx0XHRvdXQgPSB2YWx1ZS5zbGljZSgpO1xuXG5cdFx0dmFyIGkgPSAtMTtcblx0XHR2YXIgdGVtcDtcblx0XHR2YXIgd3JhcCA9IHRoaXMuX3dyYXA7XG5cblx0XHR3aGlsZSAoKytpIDwgb3V0Lmxlbmd0aCkge1xuXHRcdFx0dGVtcCA9IG91dFtpXSA9IG91dFtpXS50b1N0cmluZygpO1xuXHRcdFx0aW5kZXggPSB0ZW1wLmluZGV4T2YoJy4nKTtcblx0XHRcdGlmIChpbmRleCA+IDApe1xuXHRcdFx0XHRvdXRbaV0gPSB0ZW1wLnNsaWNlKDAsIGluZGV4ICsgZHApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh3cmFwKSB7XG5cdFx0XHR0ZXh0QXJlYS5zZXRTdHlsZVByb3BlcnR5KCd3aGl0ZS1zcGFjZScsICdub3dyYXAnKTtcblx0XHRcdG91dCA9IG91dC5qb2luKCdcXG4nKTtcblx0XHR9XG5cblx0XHR0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgndmFsdWUnLCBvdXQpO1xuXHR9ZWxzZSB7XG5cdFx0b3V0ID0gdmFsdWUudG9TdHJpbmcoKTtcblx0XHRpbmRleCA9IG91dC5pbmRleE9mKCcuJyk7XG5cdFx0dGV4dEFyZWEuc2V0UHJvcGVydHkoJ3ZhbHVlJywgaW5kZXggPiAwID8gb3V0LnNsaWNlKDAsIGluZGV4ICsgZHApIDogb3V0KTtcblx0fVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlck91dHB1dDsiLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZUV2ZW50Jyk7XG5cbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIENvbG9yTW9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvY29sb3IvQ29sb3JNb2RlJyk7XG52YXIgQ29sb3JVdGlsID0gcmVxdWlyZSgnLi4vY29yZS9jb2xvci9Db2xvclV0aWwnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xuXG5mdW5jdGlvbiBPcHRpb25zKHBhcmVudE5vZGUpIHtcbiAgICB0aGlzLl9wYXJlbk5vZGUgPSBwYXJlbnROb2RlO1xuXG4gICAgdmFyIG5vZGUgPSB0aGlzLl9ub2RlID0gbmV3IE5vZGUoKTtcbiAgICB2YXIgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVCk7XG5cbiAgICBub2RlLnNldFN0eWxlQ2xhc3MoQ1NTLk9wdGlvbnMpO1xuICAgIG5vZGUuYWRkQ2hpbGQobGlzdE5vZGUpO1xuXG4gICAgdGhpcy5fc2VsZWN0ZWRJbmRleCA9IG51bGw7XG4gICAgdGhpcy5fY2FsbGJhY2tPdXQgPSBmdW5jdGlvbiAoKSB7IH07XG5cbiAgICB0aGlzLl91bmZvY3VzYWJsZSA9IGZhbHNlO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uRG9jdW1lbnRNb3VzZURvd24uYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX1VQLCB0aGlzLl9vbkRvY3VtZW50TW91c2VVcC5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMuY2xlYXIoKTtcbn1cblxuT3B0aW9ucy5wcm90b3R5cGUgPSB7XG4gICAgX29uRG9jdW1lbnRNb3VzZURvd246IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl91bmZvY3VzYWJsZSlyZXR1cm47XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrT3V0KCk7XG4gICAgfSxcblxuICAgIF9vbkRvY3VtZW50TW91c2VVcDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl91bmZvY3VzYWJsZSA9IHRydWU7XG4gICAgfSxcblxuICAgIGJ1aWxkOiBmdW5jdGlvbiAoZW50cmllcywgc2VsZWN0ZWQsIGVsZW1lbnQsIGNhbGxiYWNrU2VsZWN0LCBjYWxsYmFja091dCwgcGFkZGluZ1JpZ2h0LCBhcmVDb2xvcnMsIGNvbG9yTW9kZSkge1xuICAgICAgICB0aGlzLl9jbGVhckxpc3QoKTtcblxuICAgICAgICB0aGlzLl9wYXJlbk5vZGUuYWRkQ2hpbGQodGhpcy5nZXROb2RlKCkpO1xuXG4gICAgICAgIHZhciByb290Tm9kZSA9IHRoaXMuX25vZGUsXG4gICAgICAgICAgICBsaXN0Tm9kZSA9IHRoaXMuX2xpc3ROb2RlO1xuXG4gICAgICAgIHBhZGRpbmdSaWdodCA9IHBhZGRpbmdSaWdodCB8fCAwO1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAvLyBidWlsZCBsaXN0XG4gICAgICAgIHZhciBpdGVtTm9kZSwgZW50cnk7XG4gICAgICAgIHZhciBpID0gLTE7XG5cbiAgICAgICAgaWYgKGFyZUNvbG9ycykge1xuICAgICAgICAgICAgY29sb3JNb2RlID0gY29sb3JNb2RlIHx8IENvbG9yTW9kZS5IRVg7XG5cbiAgICAgICAgICAgIGxpc3ROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkNvbG9yKTtcblxuICAgICAgICAgICAgdmFyIGNvbG9yLCBub2RlQ29sb3I7XG5cbiAgICAgICAgICAgIHdoaWxlICgrK2kgPCBlbnRyaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGVudHJ5ID0gZW50cmllc1tpXTtcbiAgICAgICAgICAgICAgICBpdGVtTm9kZSA9IGxpc3ROb2RlLmFkZENoaWxkKG5ldyBOb2RlKE5vZGUuTElTVF9JVEVNKSk7XG4gICAgICAgICAgICAgICAgY29sb3IgPSBpdGVtTm9kZS5hZGRDaGlsZChuZXcgTm9kZSgpKTtcblxuICAgICAgICAgICAgICAgIHN3aXRjaCAoY29sb3JNb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ29sb3JNb2RlLkhFWDpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVDb2xvciA9IGVudHJ5O1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ29sb3JNb2RlLlJHQjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVDb2xvciA9IENvbG9yVXRpbC5SR0IySEVYKGVudHJ5WzBdLCBlbnRyeVsxXSwgZW50cnlbMl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ29sb3JNb2RlLlJHQmZ2OlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUNvbG9yID0gQ29sb3JVdGlsLlJHQmZ2MkhFWChlbnRyeVswXSwgZW50cnlbMV0sIGVudHJ5WzJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIENvbG9yTW9kZS5IU1Y6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ29sb3IgPSBDb2xvclV0aWwuSFNWMlJHQihlbnRyeVswXSwgZW50cnlbMV0sIGVudHJ5WzJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbG9yLmdldFN0eWxlKCkuYmFja2dyb3VuZENvbG9yID0gbm9kZUNvbG9yO1xuICAgICAgICAgICAgICAgIGNvbG9yLmdldFN0eWxlKCkuYmFja2dyb3VuZEltYWdlID0gJ2xpbmVhci1ncmFkaWVudCggcmdiYSgwLDAsMCwwKSAwJSwgcmdiYSgwLDAsMCwwLjEpIDEwMCUpJztcbiAgICAgICAgICAgICAgICBjb2xvci5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywgZW50cnkpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5ID09IHNlbGVjdGVkKWl0ZW1Ob2RlLnNldFN0eWxlQ2xhc3MoQ1NTLk9wdGlvbnNTZWxlY3RlZCk7XG5cbiAgICAgICAgICAgICAgICBpdGVtTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9zZWxlY3RlZEluZGV4ID0gQXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLnBhcmVudE5vZGUuY2hpbGRyZW4sIHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tTZWxlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxpc3ROb2RlLmRlbGV0ZVN0eWxlQ2xhc3MoKTtcblxuICAgICAgICAgICAgd2hpbGUgKCsraSA8IGVudHJpZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZW50cnkgPSBlbnRyaWVzW2ldO1xuXG4gICAgICAgICAgICAgICAgaXRlbU5vZGUgPSBsaXN0Tm9kZS5hZGRDaGlsZChuZXcgTm9kZShOb2RlLkxJU1RfSVRFTSkpO1xuICAgICAgICAgICAgICAgIGl0ZW1Ob2RlLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCBlbnRyeSk7XG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5ID09IHNlbGVjdGVkKWl0ZW1Ob2RlLnNldFN0eWxlQ2xhc3MoQ1NTLk9wdGlvbnNTZWxlY3RlZCk7XG5cbiAgICAgICAgICAgICAgICBpdGVtTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9zZWxlY3RlZEluZGV4ID0gQXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLnBhcmVudE5vZGUuY2hpbGRyZW4sIHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tTZWxlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvL3Bvc2l0aW9uLCBzZXQgd2lkdGggYW5kIGVuYWJsZVxuXG4gICAgICAgIHZhciBlbGVtZW50UG9zID0gZWxlbWVudC5nZXRQb3NpdGlvbkdsb2JhbCgpLFxuICAgICAgICAgICAgZWxlbWVudFdpZHRoID0gZWxlbWVudC5nZXRXaWR0aCgpIC0gcGFkZGluZ1JpZ2h0LFxuICAgICAgICAgICAgZWxlbWVudEhlaWdodCA9IGVsZW1lbnQuZ2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgdmFyIGxpc3RXaWR0aCA9IGxpc3ROb2RlLmdldFdpZHRoKCksXG4gICAgICAgICAgICBsaXN0SGVpZ2h0ID0gbGlzdE5vZGUuZ2V0SGVpZ2h0KCksXG4gICAgICAgICAgICBzdHJva2VPZmZzZXQgPSBNZXRyaWMuU1RST0tFX1NJWkUgKiAyO1xuXG4gICAgICAgIHZhciBwYWRkaW5nT3B0aW9ucyA9IE1ldHJpYy5QQURESU5HX09QVElPTlM7XG5cbiAgICAgICAgdmFyIHdpZHRoID0gKGxpc3RXaWR0aCA8IGVsZW1lbnRXaWR0aCA/IGVsZW1lbnRXaWR0aCA6IGxpc3RXaWR0aCkgLSBzdHJva2VPZmZzZXQsXG4gICAgICAgICAgICBwb3NYID0gZWxlbWVudFBvc1swXSxcbiAgICAgICAgICAgIHBvc1kgPSBlbGVtZW50UG9zWzFdICsgZWxlbWVudEhlaWdodCAtIHBhZGRpbmdPcHRpb25zO1xuXG4gICAgICAgIHZhciB3aW5kb3dXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoLFxuICAgICAgICAgICAgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuXG4gICAgICAgIHZhciByb290UG9zWCA9IChwb3NYICsgd2lkdGgpID4gd2luZG93V2lkdGggPyAocG9zWCAtIHdpZHRoICsgZWxlbWVudFdpZHRoIC0gc3Ryb2tlT2Zmc2V0KSA6IHBvc1gsXG4gICAgICAgICAgICByb290UG9zWSA9IChwb3NZICsgbGlzdEhlaWdodCkgPiB3aW5kb3dIZWlnaHQgPyAocG9zWSAtIGxpc3RIZWlnaHQgKiAwLjUgLSBlbGVtZW50SGVpZ2h0ICogMC41KSA6IHBvc1k7XG5cbiAgICAgICAgbGlzdE5vZGUuc2V0V2lkdGgod2lkdGgpO1xuICAgICAgICByb290Tm9kZS5zZXRQb3NpdGlvbkdsb2JhbChyb290UG9zWCwgcm9vdFBvc1kpO1xuXG4gICAgICAgIHRoaXMuX2NhbGxiYWNrT3V0ID0gY2FsbGJhY2tPdXQ7XG4gICAgICAgIHRoaXMuX3VuZm9jdXNhYmxlID0gZmFsc2U7XG4gICAgfSxcblxuICAgIF9jbGVhckxpc3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fbGlzdE5vZGUucmVtb3ZlQWxsQ2hpbGRyZW4oKTtcbiAgICAgICAgdGhpcy5fbGlzdE5vZGUuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnd2lkdGgnKTtcbiAgICAgICAgdGhpcy5fc2VsZWN0ZWRJbmRleCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2J1aWxkID0gZmFsc2U7XG4gICAgfSxcblxuICAgIGNsZWFyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2NsZWFyTGlzdCgpO1xuICAgICAgICB0aGlzLl9jYWxsYmFja091dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fcGFyZW5Ob2RlLnJlbW92ZUNoaWxkKHRoaXMuZ2V0Tm9kZSgpKTtcblxuICAgIH0sXG5cbiAgICBpc0J1aWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9idWlsZDtcbiAgICB9LFxuICAgIGdldE5vZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX25vZGU7XG4gICAgfSxcbiAgICBnZXRTZWxlY3RlZEluZGV4OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZWxlY3RlZEluZGV4O1xuICAgIH1cbn07XG5cbk9wdGlvbnMuc2V0dXAgPSBmdW5jdGlvbihwYXJlbnROb2RlKXtyZXR1cm4gT3B0aW9ucy5faW5zdGFuY2UgPSBuZXcgT3B0aW9ucyhwYXJlbnROb2RlKTt9O1xuT3B0aW9ucy5nZXQgICA9IGZ1bmN0aW9uKCl7cmV0dXJuIE9wdGlvbnMuX2luc3RhbmNlO307XG5PcHRpb25zLmRlc3Ryb3kgPSBmdW5jdGlvbigpe09wdGlvbnMuX2luc3RhbmNlID0gbnVsbDt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9wdGlvbnM7IiwidmFyIE9iamVjdENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvT2JqZWN0Q29tcG9uZW50Jyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xudmFyIFNjcm9sbEJhciA9IHJlcXVpcmUoJy4uL2NvcmUvbGF5b3V0L1Njcm9sbEJhcicpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9IRUlHSFQgPSBudWxsLFxuICAgIERFRkFVTFRfV1JBUCAgID0gZmFsc2UsXG4gICAgREVGQVVMVF9VUERBVEUgPSB0cnVlO1xuXG5mdW5jdGlvbiBPdXRwdXQocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zICAgICAgICAgICAgPSBwYXJhbXMgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5oZWlnaHQgICAgID0gcGFyYW1zLmhlaWdodCB8fCBERUZBVUxUX0hFSUdIVDtcbiAgICBwYXJhbXMud3JhcCAgICAgICA9IHBhcmFtcy53cmFwICAgPT09IHVuZGVmaW5lZCA/XG4gICAgICAgICAgICAgICAgICAgICAgICBERUZBVUxUX1dSQVAgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLndyYXA7XG4gICAgcGFyYW1zLnVwZGF0ZSAgICAgPSBwYXJhbXMudXBkYXRlID09PSB1bmRlZmluZWQgP1xuICAgICAgICAgICAgICAgICAgICAgICAgREVGQVVMVF9VUERBVEUgOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnVwZGF0ZTtcblxuICAgIHRoaXMuX3dyYXAgPSBwYXJhbXMud3JhcDtcbiAgICB0aGlzLl91cGRhdGUgPSBwYXJhbXMudXBkYXRlO1xuXG4gICAgdmFyIHRleHRBcmVhID0gdGhpcy5fdGV4dEFyZWEgPSBuZXcgTm9kZShOb2RlLlRFWFRBUkVBKSxcbiAgICAgICAgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgcm9vdE5vZGUgPSB0aGlzLl9ub2RlO1xuXG4gICAgICAgIHRleHRBcmVhLnNldFByb3BlcnR5KCdyZWFkT25seScsdHJ1ZSk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKHRleHRBcmVhKTtcblxuICAgICAgICB0ZXh0QXJlYS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uSW5wdXREcmFnU3RhcnQuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRyx0aGlzLl9wYXJlbnQsJ29uQ29tcG9uZW50U2VsZWN0RHJhZycpO1xuXG5cbiAgICBpZihwYXJhbXMuaGVpZ2h0KXtcbiAgICAgICAgdmFyIHRleHRBcmVhV3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgICAgICB0ZXh0QXJlYVdyYXAuc2V0U3R5bGVDbGFzcyhDU1MuVGV4dEFyZWFXcmFwKTtcbiAgICAgICAgICAgIHRleHRBcmVhV3JhcC5hZGRDaGlsZCh0ZXh0QXJlYSk7XG4gICAgICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZCh0ZXh0QXJlYVdyYXApO1xuXG4gICAgICAgIC8vRklYTUVcbiAgICAgICAgdmFyIGhlaWdodCAgPSB0aGlzLl9oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0LFxuICAgICAgICAgICAgcGFkZGluZyA9IDQ7XG5cbiAgICAgICAgICAgIHRleHRBcmVhLnNldEhlaWdodChNYXRoLm1heChoZWlnaHQgKyBwYWRkaW5nICAsTWV0cmljLkNPTVBPTkVOVF9NSU5fSEVJR0hUKSk7XG4gICAgICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQodGV4dEFyZWEuZ2V0SGVpZ2h0KCkpO1xuICAgICAgICAgICAgcm9vdE5vZGUuc2V0SGVpZ2h0KHdyYXBOb2RlLmdldEhlaWdodCgpICsgcGFkZGluZyk7XG5cbiAgICAgICAgdGhpcy5fc2Nyb2xsQmFyID0gbmV3IFNjcm9sbEJhcih0ZXh0QXJlYVdyYXAsdGV4dEFyZWEsaGVpZ2h0IC0gcGFkZGluZylcbiAgICB9XG5cbiAgICBpZihwYXJhbXMud3JhcCl7XG4gICAgICAgIHRleHRBcmVhLnNldFN0eWxlUHJvcGVydHkoJ3doaXRlLXNwYWNlJywncHJlLXdyYXAnKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wcmV2U3RyaW5nID0gJyc7XG4gICAgdGhpcy5fcHJldlNjcm9sbEhlaWdodCA9IC0xO1xuICAgIHRoaXMuX3NldFZhbHVlKCk7XG59XG5cbk91dHB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5cbi8vT3ZlcnJpZGUgaW4gc3ViY2xhc3Ncbk91dHB1dC5wcm90b3R5cGUuX3NldFZhbHVlID0gZnVuY3Rpb24gKCkge307XG5cblxuT3V0cHV0LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3NldFZhbHVlKCk7XG59O1xuXG5PdXRwdXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZighdGhpcy5fdXBkYXRlKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9zZXRWYWx1ZSgpO1xufTtcblxuXG4vL1ByZXZlbnQgY2hyb21lIHNlbGVjdCBkcmFnXG5cbk91dHB1dC5wcm90b3R5cGUuX29uRHJhZyA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsIG51bGwpKTtcbn07XG5cbk91dHB1dC5wcm90b3R5cGUuX29uRHJhZ0ZpbmlzaCA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsIG51bGwpKTtcblxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLCB0aGlzLl9vbkRyYWcsIGZhbHNlKTtcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25EcmFnRmluaXNoLCBmYWxzZSk7XG59O1xuXG5PdXRwdXQucHJvdG90eXBlLl9vbklucHV0RHJhZ1N0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUcsIG51bGwpKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25EcmFnLmJpbmQodGhpcyksIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfVVAsICAgdGhpcy5fb25EcmFnRmluaXNoLmJpbmQodGhpcyksIGZhbHNlKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBPdXRwdXQ7XG4iLCJ2YXIgUGxvdHRlciA9IHJlcXVpcmUoJy4vUGxvdHRlcicpO1xudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Nb3VzZScpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIERFRkFVTFRfQk9VTkRTX1ggPSBbLTEsMV0sXG4gICAgREVGQVVMVF9CT1VORFNfWSA9IFstMSwxXSxcbiAgICBERUZBVUxUX0xBQkVMX1ggID0gJycsXG4gICAgREVGQVVMVF9MQUJFTF9ZICA9ICcnO1xuXG5mdW5jdGlvbiBQYWQocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICBQbG90dGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyAgICAgICAgICAgID0gcGFyYW1zICAgICAgICAgICAgfHwge307XG4gICAgcGFyYW1zLmJvdW5kc1ggICAgPSBwYXJhbXMuYm91bmRzWCAgICB8fCBERUZBVUxUX0JPVU5EU19YO1xuICAgIHBhcmFtcy5ib3VuZHNZICAgID0gcGFyYW1zLmJvdW5kc1kgICAgfHwgREVGQVVMVF9CT1VORFNfWTtcbiAgICBwYXJhbXMubGFiZWxYICAgICA9IHBhcmFtcy5sYWJlbFggICAgIHx8IERFRkFVTFRfTEFCRUxfWDtcbiAgICBwYXJhbXMubGFiZWxZICAgICA9IHBhcmFtcy5sYWJlbFkgICAgIHx8IERFRkFVTFRfTEFCRUxfWTtcblxuICAgIHBhcmFtcy5zaG93Q3Jvc3MgID0gcGFyYW1zLnNob3dDcm9zcyAgfHwgdHJ1ZTtcblxuXG4gICAgdGhpcy5fb25DaGFuZ2UgICAgID0gcGFyYW1zLm9uQ2hhbmdlIHx8IHRoaXMuX29uQ2hhbmdlO1xuICAgIHRoaXMuX29uRmluaXNoICAgICA9IHBhcmFtcy5vbkZpbmlzaCB8fCBmdW5jdGlvbigpe307XG5cbiAgICB0aGlzLl9ib3VuZHNYICAgICAgPSBwYXJhbXMuYm91bmRzWDtcbiAgICB0aGlzLl9ib3VuZHNZICAgICAgPSBwYXJhbXMuYm91bmRzWTtcbiAgICB0aGlzLl9sYWJlbEF4aXNYICAgPSBwYXJhbXMubGFiZWxYICE9ICcnICYmIHBhcmFtcy5sYWJlbFggIT0gJ25vbmUnID8gcGFyYW1zLmxhYmVsWCA6IG51bGw7XG4gICAgdGhpcy5fbGFiZWxBeGlzWSAgID0gcGFyYW1zLmxhYmVsWSAhPSAnJyAmJiBwYXJhbXMubGFiZWxZICE9ICdub25lJyA/IHBhcmFtcy5sYWJlbFkgOiBudWxsO1xuXG4gICAgdmFyIHBhdGggPSB0aGlzLl9wYXRoO1xuICAgICAgICBwYXRoLnN0eWxlLnN0cm9rZVdpZHRoID0gMTtcbiAgICAgICAgcGF0aC5zdHlsZS5zdHJva2UgICAgICA9ICcjMzYzYzQwJztcblxuICAgIHRoaXMuX2dyaWQuc3R5bGUuc3Ryb2tlID0gJ3JnYigyNSwyNSwyNSknO1xuXG4gICAgdGhpcy5fc3ZnUG9zID0gWzAsMF07XG5cblxuICAgIHZhciBoYW5kbGUgPSB0aGlzLl9oYW5kbGUgPSB0aGlzLl9zdmdSb290LmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnZycpKTtcbiAgICB2YXIgaGFuZGxlQ2lyY2xlMCA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMC5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZygxMSkpO1xuICAgICAgICBoYW5kbGVDaXJjbGUwLnNldEF0dHJpYnV0ZSgnZmlsbCcsJ3JnYmEoMCwwLDAsMC4wNSknKTtcbiAgICB2YXIgaGFuZGxlQ2lyY2xlMSA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMS5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZygxMCkpO1xuICAgICAgICBoYW5kbGVDaXJjbGUxLnNldEF0dHJpYnV0ZSgnZmlsbCcsJ3JnYig4Myw5Myw5OCknKTtcblxuICAgIHZhciBoYW5kbGVDaXJjbGUyID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xuICAgICAgICBoYW5kbGVDaXJjbGUyLnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDkpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlMi5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCdyZ2IoNTcsNjksNzYpJyk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTIuc2V0QXR0cmlidXRlKCdjeScsU3RyaW5nKDAuNzUpKTtcblxuICAgIHZhciBoYW5kbGVDaXJjbGUzID0gaGFuZGxlLmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgnY2lyY2xlJykpO1xuICAgICAgICBoYW5kbGVDaXJjbGUzLnNldEF0dHJpYnV0ZSgncicsU3RyaW5nKDEwKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTMuc2V0QXR0cmlidXRlKCdzdHJva2UnLCdyZ2IoMTcsMTksMjApJyk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTMuc2V0QXR0cmlidXRlKCdzdHJva2Utd2lkdGgnLFN0cmluZygxKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTMuc2V0QXR0cmlidXRlKCdmaWxsJywnbm9uZScpO1xuXG4gICAgdmFyIGhhbmRsZUNpcmNsZTQgPSBoYW5kbGUuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdjaXJjbGUnKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTQuc2V0QXR0cmlidXRlKCdyJyxTdHJpbmcoNikpO1xuICAgICAgICBoYW5kbGVDaXJjbGU0LnNldEF0dHJpYnV0ZSgnZmlsbCcsJ3JnYigzMCwzNCwzNiknKTtcbiAgICB2YXIgaGFuZGxlQ2lyY2xlNSA9IGhhbmRsZS5hcHBlbmRDaGlsZCh0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ2NpcmNsZScpKTtcbiAgICAgICAgaGFuZGxlQ2lyY2xlNS5zZXRBdHRyaWJ1dGUoJ3InLFN0cmluZygzKSk7XG4gICAgICAgIGhhbmRsZUNpcmNsZTUuc2V0QXR0cmlidXRlKCdmaWxsJywncmdiKDI1NSwyNTUsMjU1KScpO1xuXG4gICAgICAgIGhhbmRsZS5zZXRBdHRyaWJ1dGUoJ3RyYW5mb3JtJywndHJhbnNsYXRlKDAgMCknKTtcblxuICAgIHRoaXMuX3N2Zy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfRE9XTix0aGlzLl9vbkRyYWdTdGFydC5iaW5kKHRoaXMpLGZhbHNlKTtcbiAgICB0aGlzLl9kcmF3VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufVxuXG5QYWQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQbG90dGVyLnByb3RvdHlwZSk7XG5cblBhZC5wcm90b3R5cGUuX29uRHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBlbGVtZW50ID0gdGhpcy5fc3ZnO1xuXG4gICAgdmFyIHN2Z1BvcyA9IHRoaXMuX3N2Z1BvcztcbiAgICAgICAgc3ZnUG9zWzBdID0gMDtcbiAgICAgICAgc3ZnUG9zWzFdID0gMDtcblxuICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgIHN2Z1Bvc1swXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgIHN2Z1Bvc1sxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuICAgIH1cblxuICAgIHZhciBldmVudE1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50VXAgICA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9kcmF3VmFsdWVJbnB1dCgpO1xuICAgICAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgdGhpcy5fb25DaGFuZ2UoKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB2YXIgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICAgICAgdGhpcy5fZHJhd1ZhbHVlSW5wdXQoKTtcbiAgICAgICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgICAgIHRoaXMuX29uRmluaXNoKCk7XG5cbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsICAgIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VXAsICAgb25EcmFnRW5kLCBmYWxzZSk7XG5cbiAgICB0aGlzLl9kcmF3VmFsdWVJbnB1dCgpO1xuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX29uQ2hhbmdlKCk7XG59O1xuXG5QYWQucHJvdG90eXBlLl9yZWRyYXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fZHJhd1ZhbHVlKHRoaXMuX29iamVjdFt0aGlzLl9rZXldKTtcbn07XG5cblBhZC5wcm90b3R5cGUuX2RyYXdWYWx1ZUlucHV0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2RyYXdWYWx1ZSh0aGlzLl9nZXRNb3VzZU5vcm1hbGl6ZWQoKSk7XG59O1xuXG5QYWQucHJvdG90eXBlLl9kcmF3VmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSA9IHZhbHVlO1xuICAgIHRoaXMuX2RyYXdHcmlkKCk7XG4gICAgdGhpcy5fZHJhd1BvaW50KCk7XG59O1xuXG5QYWQucHJvdG90eXBlLl9kcmF3R3JpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3ZnU2l6ZSA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgc3ZnTWlkWCA9IE1hdGguZmxvb3Ioc3ZnU2l6ZSAqIDAuNSksXG4gICAgICAgIHN2Z01pZFkgPSBNYXRoLmZsb29yKHN2Z1NpemUgKiAwLjUpO1xuXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcbiAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRMaW5lKDAsIHN2Z01pZFksIHN2Z1NpemUsIHN2Z01pZFkpO1xuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUoc3ZnTWlkWCwgMCwgc3ZnTWlkWCwgc3ZnU2l6ZSk7XG5cbiAgICB0aGlzLl9ncmlkLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xufTtcblxuXG5QYWQucHJvdG90eXBlLl9kcmF3UG9pbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2Z1NpemUgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnd2lkdGgnKSksXG4gICAgICAgIHN2Z01pZFggPSBzdmdTaXplICogMC41LFxuICAgICAgICBzdmdNaWRZID0gc3ZnU2l6ZSAqIDAuNTtcblxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX29iamVjdFt0aGlzLl9rZXldO1xuXG4gICAgdmFyIGxvY2FsWCA9ICggMC41ICsgdmFsdWVbMF0gKiAwLjUgKSAqIHN2Z1NpemUsXG4gICAgICAgIGxvY2FsWSA9ICggMC41ICsgLXZhbHVlWzFdICogMC41ICkgKiBzdmdTaXplO1xuXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcbiAgICAgICAgcGF0aENtZCArPSB0aGlzLl9wYXRoQ21kTGluZSgwLCBsb2NhbFksIHN2Z1NpemUsIGxvY2FsWSk7XG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmUobG9jYWxYLCAwLCBsb2NhbFgsIHN2Z1NpemUpO1xuXG4gICAgdGhpcy5fcGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbiAgICB0aGlzLl9oYW5kbGUuc2V0QXR0cmlidXRlKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyBsb2NhbFggKyAnICcgKyBsb2NhbFkgKyAnKScpO1xufTtcblxuUGFkLnByb3RvdHlwZS5fZ2V0TW91c2VOb3JtYWxpemVkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvZmZzZXQgPSB0aGlzLl9zdmdQb3MsXG4gICAgICAgIG1vdXNlID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgc3ZnU2l6ZSA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKTtcblxuICAgIHJldHVybiBbLTEgKyBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVswXSAtIG9mZnNldFswXSwgc3ZnU2l6ZSkpIC8gc3ZnU2l6ZSAqIDIsXG4gICAgICAgICggMSAtIE1hdGgubWF4KDAsIE1hdGgubWluKG1vdXNlWzFdIC0gb2Zmc2V0WzFdLCBzdmdTaXplKSkgLyBzdmdTaXplICogMildO1xuXG59O1xuXG5QYWQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xufTtcblxuUGFkLnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS5kYXRhLm9yaWdpbiA9PSB0aGlzKXJldHVybjtcbiAgICB0aGlzLl9kcmF3VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYWQ7XG4iLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcbnZhciBDb2xvclV0aWwgPSByZXF1aXJlKCcuLi9jb3JlL2NvbG9yL0NvbG9yVXRpbCcpO1xudmFyIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xuXG52YXIgREVGQVVMVF9WQUxVRV9IVUUgPSAyMDAuMCxcbiAgICBERUZBVUxUX1ZBTFVFX1NBVCA9IDUwLjAsXG4gICAgREVGQVVMVF9WQUxVRV9WQUwgPSA1MC4wO1xuXG5mdW5jdGlvbiBQaWNrZXIocGFyZW50Tm9kZSl7XG4gICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSAgICAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlciksXG4gICAgICAgIGhlYWROb2RlID0gdGhpcy5faGVhZE5vZGUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpLFxuICAgICAgICBsYWJsV3JhcCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCksXG4gICAgICAgIGxhYmxOb2RlID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCksXG4gICAgICAgIG1lbnVOb2RlID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5NZW51KSxcbiAgICAgICAgd3JhcE5vZGUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuXG4gICAgdmFyIG1lbnVDbG9zZSA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcbiAgICAgICAgbWVudUNsb3NlLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnVCdG5DbG9zZSk7XG5cbiAgICB2YXIgZmllbGRXcmFwICA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyggQ1NTLlBpY2tlckZpZWxkV3JhcCksXG4gICAgICAgIHNsaWRlcldyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNsaWRlcldyYXApLFxuICAgICAgICBpbnB1dFdyYXAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKCBDU1MuUGlja2VySW5wdXRXcmFwKTtcblxuICAgIHZhciBjYW52YXNGaWVsZCAgPSB0aGlzLl9jYW52YXNGaWVsZCAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKSxcbiAgICAgICAgY2FudmFzU2xpZGVyID0gdGhpcy5fY2FudmFzU2xpZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnQ2FudmFzJyk7XG5cbiAgICAgICAgZmllbGRXcmFwLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChjYW52YXNGaWVsZCk7XG4gICAgICAgIHNsaWRlcldyYXAuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKGNhbnZhc1NsaWRlcik7XG5cbiAgICAgICAgdGhpcy5fc2V0U2l6ZUNhbnZhc0ZpZWxkKDE1NCwxNTQpO1xuICAgICAgICB0aGlzLl9zZXRTaXplQ2FudmFzU2xpZGVyKDE0LDE1NCk7XG5cbiAgICB2YXIgY29udGV4dENhbnZhc0ZpZWxkICA9IHRoaXMuX2NvbnRleHRDYW52YXNGaWVsZCAgPSBjYW52YXNGaWVsZC5nZXRDb250ZXh0KCcyZCcpLFxuICAgICAgICBjb250ZXh0Q2FudmFzU2xpZGVyID0gdGhpcy5fY29udGV4dENhbnZhc1NsaWRlciA9IGNhbnZhc1NsaWRlci5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgdmFyIGhhbmRsZUZpZWxkICA9IHRoaXMuX2hhbmRsZUZpZWxkICA9IG5ldyBOb2RlKCk7XG4gICAgICAgIGhhbmRsZUZpZWxkLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckhhbmRsZUZpZWxkKTtcblxuICAgIHZhciBoYW5kbGVTbGlkZXIgPSB0aGlzLl9oYW5kbGVTbGlkZXIgPSBuZXcgTm9kZSgpO1xuICAgICAgICBoYW5kbGVTbGlkZXIuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySGFuZGxlU2xpZGVyKTtcblxuICAgIHZhciBzdGVwID0gMS4wLFxuICAgICAgICBkcCAgID0gMDtcblxuICAgIHZhciBjYWxsYmFja0h1ZSA9IHRoaXMuX29uSW5wdXRIdWVDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgY2FsbGJhY2tTYXQgPSB0aGlzLl9vbklucHV0U2F0Q2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgIGNhbGxiYWNrVmFsID0gdGhpcy5fb25JbnB1dFZhbENoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICBjYWxsYmFja1IgICA9IHRoaXMuX29uSW5wdXRSQ2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgIGNhbGxiYWNrRyAgID0gdGhpcy5fb25JbnB1dEdDaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgY2FsbGJhY2tCICAgPSB0aGlzLl9vbklucHV0QkNoYW5nZS5iaW5kKHRoaXMpO1xuXG5cbiAgICB2YXIgaW5wdXRIdWUgPSB0aGlzLl9pbnB1dEh1ZSA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tIdWUsY2FsbGJhY2tIdWUpLFxuICAgICAgICBpbnB1dFNhdCA9IHRoaXMuX2lucHV0U2F0ID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja1NhdCxjYWxsYmFja1NhdCksXG4gICAgICAgIGlucHV0VmFsID0gdGhpcy5faW5wdXRWYWwgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrVmFsLGNhbGxiYWNrVmFsKSxcbiAgICAgICAgaW5wdXRSICAgPSB0aGlzLl9pbnB1dFIgICA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLG51bGwsY2FsbGJhY2tSLGNhbGxiYWNrUiksXG4gICAgICAgIGlucHV0RyAgID0gdGhpcy5faW5wdXRHICAgPSBuZXcgTnVtYmVySW5wdXRfSW50ZXJuYWwoc3RlcCxkcCxudWxsLGNhbGxiYWNrRyxjYWxsYmFja0cpLFxuICAgICAgICBpbnB1dEIgICA9IHRoaXMuX2lucHV0QiAgID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsbnVsbCxjYWxsYmFja0IsY2FsbGJhY2tCKTtcblxuICAgIHZhciBjb250cm9sc1dyYXAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckNvbnRyb2xzV3JhcCk7XG5cbiAgICB2YXIgYnV0dG9uUGljayAgID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pLnNldFN0eWxlQ2xhc3MoQ1NTLkJ1dHRvbikuc2V0UHJvcGVydHkoJ3ZhbHVlJywncGljaycpLFxuICAgICAgICBidXR0b25DYW5jZWwgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTikuc2V0U3R5bGVDbGFzcyhDU1MuQnV0dG9uKS5zZXRQcm9wZXJ0eSgndmFsdWUnLCdjYW5jZWwnKTtcblxuXG4gICAgdmFyIGNvbG9yQ29udHJhc3QgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlckNvbG9yQ29udHJhc3QpO1xuXG4gICAgdmFyIGNvbG9yMCA9IHRoaXMuX2NvbG9yQ3Vyck5vZGUgPSBuZXcgTm9kZSgpLFxuICAgICAgICBjb2xvcjEgPSB0aGlzLl9jb2xvclByZXZOb2RlID0gbmV3IE5vZGUoKTtcblxuICAgIGNvbG9yQ29udHJhc3QuYWRkQ2hpbGQoY29sb3IwKTtcbiAgICBjb2xvckNvbnRyYXN0LmFkZENoaWxkKGNvbG9yMSk7XG5cbiAgICBjb250cm9sc1dyYXAuYWRkQ2hpbGQoYnV0dG9uQ2FuY2VsKTtcbiAgICBjb250cm9sc1dyYXAuYWRkQ2hpbGQoYnV0dG9uUGljayk7XG4gICAgY29udHJvbHNXcmFwLmFkZENoaWxkKGNvbG9yQ29udHJhc3QpO1xuXG4gICAgdGhpcy5fc2V0Q29udHJhc1ByZXZDb2xvcigwLDAsMCk7XG5cbiAgICB2YXIgaW5wdXRGaWVsZFdyYXBIdWUgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlBpY2tlcklucHV0RmllbGQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcFNhdCA9IG5ldyBOb2RlKCkuc2V0U3R5bGVDbGFzcyhDU1MuUGlja2VySW5wdXRGaWVsZCksXG4gICAgICAgIGlucHV0RmllbGRXcmFwVmFsID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKTtcblxuICAgIHZhciBpbnB1dEZpZWxkV3JhcEh1ZUxhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ0gnKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBTYXRMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdTJyksXG4gICAgICAgIGlucHV0RmllbGRXcmFwVmFsTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnVicpO1xuXG4gICAgICAgIGlucHV0RmllbGRXcmFwSHVlLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwSHVlTGFiZWwsaW5wdXRIdWUuZ2V0Tm9kZSgpKTtcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBTYXQuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBTYXRMYWJlbCxpbnB1dFNhdC5nZXROb2RlKCkpO1xuICAgICAgICBpbnB1dEZpZWxkV3JhcFZhbC5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFZhbExhYmVsLGlucHV0VmFsLmdldE5vZGUoKSk7XG5cbiAgICB2YXIgaW5wdXRGaWVsZFdyYXBSID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBHID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBCID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKTtcblxuICAgIHZhciBpbnB1dEZpZWxkV3JhcFJMYWJlbCA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdSJyksXG4gICAgICAgIGlucHV0RmllbGRXcmFwR0xhYmVsID0gbmV3IE5vZGUoTm9kZS5TUEFOKS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCkuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJ0cnKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBCTGFiZWwgPSBuZXcgTm9kZShOb2RlLlNQQU4pLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnQicpO1xuXG4gICAgICAgIGlucHV0RmllbGRXcmFwUi5hZGRDaGlsZHJlbihpbnB1dEZpZWxkV3JhcFJMYWJlbCxpbnB1dFIuZ2V0Tm9kZSgpKTtcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBHLmFkZENoaWxkcmVuKGlucHV0RmllbGRXcmFwR0xhYmVsLGlucHV0Ry5nZXROb2RlKCkpO1xuICAgICAgICBpbnB1dEZpZWxkV3JhcEIuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBCTGFiZWwsaW5wdXRCLmdldE5vZGUoKSk7XG5cblxuICAgICAgICBpbnB1dFdyYXAuYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBSLGlucHV0RmllbGRXcmFwSHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRGaWVsZFdyYXBHLGlucHV0RmllbGRXcmFwU2F0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRGaWVsZFdyYXBCLGlucHV0RmllbGRXcmFwVmFsLGNvbG9yQ29udHJhc3QpO1xuXG4gICAgdmFyIGhleElucHV0V3JhcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgIGhleElucHV0V3JhcC5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dFdyYXApO1xuXG4gICAgdmFyIGlucHV0SEVYID0gdGhpcy5faW5wdXRIRVggPSBuZXcgTm9kZShOb2RlLklOUFVUX1RFWFQpLFxuICAgICAgICBpbnB1dEZpZWxkV3JhcEhFWCAgICAgICAgID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5QaWNrZXJJbnB1dEZpZWxkKSxcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBIRVhMYWJlbCAgICA9IG5ldyBOb2RlKE5vZGUuU1BBTikuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpO1xuXG4gICAgICAgIGlucHV0RmllbGRXcmFwSEVYTGFiZWwuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsJyMnKTtcbiAgICAgICAgaW5wdXRGaWVsZFdyYXBIRVguYWRkQ2hpbGRyZW4oaW5wdXRGaWVsZFdyYXBIRVhMYWJlbCxpbnB1dEhFWCk7XG5cbiAgICAgICAgaGV4SW5wdXRXcmFwLmFkZENoaWxkKGlucHV0RmllbGRXcmFwSEVYKTtcblxuICAgICAgICBpbnB1dEhFWC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5DSEFOR0UsdGhpcy5fb25JbnB1dEhFWEZpbmlzaC5iaW5kKHRoaXMpKTtcblxuICAgICAgICBsYWJsTm9kZS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJywnQ29sb3IgUGlja2VyJyk7XG5cbiAgICAgICAgbWVudU5vZGUuYWRkQ2hpbGQobWVudUNsb3NlKTtcbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGQobWVudU5vZGUpO1xuICAgICAgICBsYWJsV3JhcC5hZGRDaGlsZChsYWJsTm9kZSk7XG4gICAgICAgIGhlYWROb2RlLmFkZENoaWxkKGxhYmxXcmFwKTtcbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQoaGVhZE5vZGUpO1xuICAgICAgICByb290Tm9kZS5hZGRDaGlsZCh3cmFwTm9kZSk7XG5cbiAgICAgICAgLy93cmFwTm9kZS5hZGRDaGlsZChwYWxldHRlV3JhcCk7XG5cbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQoZmllbGRXcmFwKTtcbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQoc2xpZGVyV3JhcCk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGlucHV0V3JhcCk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGhleElucHV0V3JhcCk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGNvbnRyb2xzV3JhcCk7XG5cbiAgICAgICAgZmllbGRXcmFwLmFkZENoaWxkKCBoYW5kbGVGaWVsZCk7XG4gICAgICAgIHNsaWRlcldyYXAuYWRkQ2hpbGQoaGFuZGxlU2xpZGVyKTtcblxuICAgIHZhciBldmVudE1vdXNlRG93biA9IE5vZGVFdmVudC5NT1VTRV9ET1dOLFxuICAgICAgICBjYWxsYmFjayAgICAgICA9IHRoaXMuX29uQ2FudmFzRmllbGRNb3VzZURvd24uYmluZCh0aGlzKTtcblxuICAgICAgICBmaWVsZFdyYXAuYWRkRXZlbnRMaXN0ZW5lciggIGV2ZW50TW91c2VEb3duLCBjYWxsYmFjayk7XG4gICAgICAgIGhhbmRsZUZpZWxkLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcblxuICAgICAgICBjYWxsYmFjayA9IHRoaXMuX29uQ2FudmFzU2xpZGVyTW91c2VEb3duLmJpbmQodGhpcyk7XG5cbiAgICAgICAgc2xpZGVyV3JhcC5hZGRFdmVudExpc3RlbmVyKCAgZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcbiAgICAgICAgaGFuZGxlU2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIGNhbGxiYWNrKTtcblxuICAgICAgICBtZW51Q2xvc2UuYWRkRXZlbnRMaXN0ZW5lciggICBldmVudE1vdXNlRG93biwgdGhpcy5fb25DbG9zZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgYnV0dG9uUGljay5hZGRFdmVudExpc3RlbmVyKCAgZXZlbnRNb3VzZURvd24sIHRoaXMuX29uUGljay5iaW5kKHRoaXMpKTtcbiAgICAgICAgYnV0dG9uQ2FuY2VsLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZURvd24sIHRoaXMuX29uQ2xvc2UuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgaGVhZE5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25IZWFkRHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5fcGFyZW50Tm9kZSA9IHBhcmVudE5vZGU7XG5cbiAgICB0aGlzLl9tb3VzZU9mZnNldCA9IFswLDBdO1xuICAgIHRoaXMuX3Bvc2l0aW9uICAgID0gWzAsMF07XG5cbiAgICB0aGlzLl9jYW52YXNTbGlkZXJQb3MgPSBbMCwwXTtcbiAgICB0aGlzLl9jYW52YXNGaWVsZFBvcyAgPSBbMCwwXTtcbiAgICB0aGlzLl9oYW5kbGVGaWVsZFNpemUgICAgPSAxMjtcbiAgICB0aGlzLl9oYW5kbGVTbGlkZXJIZWlnaHQgPSA3O1xuXG4gICAgdGhpcy5faW1hZ2VEYXRhU2xpZGVyID0gY29udGV4dENhbnZhc1NsaWRlci5jcmVhdGVJbWFnZURhdGEoY2FudmFzU2xpZGVyLndpZHRoLGNhbnZhc1NsaWRlci5oZWlnaHQpO1xuICAgIHRoaXMuX2ltYWdlRGF0YUZpZWxkICA9IGNvbnRleHRDYW52YXNGaWVsZC5jcmVhdGVJbWFnZURhdGEoIGNhbnZhc0ZpZWxkLndpZHRoLCBjYW52YXNGaWVsZC5oZWlnaHQpO1xuXG4gICAgdGhpcy5fdmFsdWVIdWVNaW5NYXggPSBbMCwzNjBdO1xuICAgIHRoaXMuX3ZhbHVlU2F0TWluTWF4ID0gdGhpcy5fdmFsdWVWYWxNaW5NYXggPSBbMCwxMDBdO1xuICAgIHRoaXMuX3ZhbHVlUkdCTWluTWF4ID0gWzAsMjU1XTtcblxuICAgIHRoaXMuX3ZhbHVlSHVlID0gREVGQVVMVF9WQUxVRV9IVUU7XG4gICAgdGhpcy5fdmFsdWVTYXQgPSBERUZBVUxUX1ZBTFVFX1NBVDtcbiAgICB0aGlzLl92YWx1ZVZhbCA9IERFRkFVTFRfVkFMVUVfVkFMO1xuICAgIHRoaXMuX3ZhbHVlUiAgID0gMDtcbiAgICB0aGlzLl92YWx1ZUcgICA9IDA7XG4gICAgdGhpcy5fdmFsdWVCICAgPSAwO1xuXG4gICAgdGhpcy5fdmFsdWVIRVggPSAnIzAwMDAwMCc7XG4gICAgdGhpcy5fdmFsdWVIRVhWYWxpZCA9IHRoaXMuX3ZhbHVlSEVYO1xuXG4gICAgdGhpcy5fY2FsbGJhY2tQaWNrID0gZnVuY3Rpb24oKXt9O1xuXG4gICAgLy90aGlzLl9jYW52YXNGaWVsZEltYWdlRGF0YUZ1bmMgPSBmdW5jdGlvbihpLGope3JldHVybiB0aGlzLl9IU1YyUkdCKHRoaXMuX3ZhbHVlSHVlLGopfVxuXG4gICAgdGhpcy5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgdGhpcy5fZHJhd0NhbnZhc1NsaWRlcigpO1xuXG4gICAgdGhpcy5fc2V0Q29sb3JIU1YodGhpcy5fdmFsdWVIdWUsdGhpcy5fdmFsdWVTYXQsdGhpcy5fdmFsdWVWYWwpO1xuXG4gICAgdGhpcy5fdXBkYXRlQ29sb3JSR0JGcm9tSFNWKCk7XG4gICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG5cbiAgICB0aGlzLl91cGRhdGVIYW5kbGVzKCk7XG59XG5cblBpY2tlci5wcm90b3R5cGUgPVxue1xuICAgIF9kcmF3SGFuZGxlRmllbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc0ZpZWxkLFxuICAgICAgICAgICAgbm9kZVBvcyA9IHRoaXMuX2NhbnZhc0ZpZWxkUG9zLFxuICAgICAgICAgICAgbW91c2VQb3MgPSBNb3VzZS5nZXQoKS5nZXRQb3NpdGlvbigpO1xuXG4gICAgICAgIHZhciBwb3NYID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VQb3NbMF0gLSBub2RlUG9zWzBdLCBjYW52YXMud2lkdGgpKSxcbiAgICAgICAgICAgIHBvc1kgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihtb3VzZVBvc1sxXSAtIG5vZGVQb3NbMV0sIGNhbnZhcy5oZWlnaHQpKSxcbiAgICAgICAgICAgIHBvc1hOb3JtID0gcG9zWCAvIGNhbnZhcy53aWR0aCxcbiAgICAgICAgICAgIHBvc1lOb3JtID0gcG9zWSAvIGNhbnZhcy5oZWlnaHQ7XG5cbiAgICAgICAgdmFyIHNhdCA9IE1hdGgucm91bmQocG9zWE5vcm0gKiB0aGlzLl92YWx1ZVNhdE1pbk1heFsxXSksXG4gICAgICAgICAgICB2YWwgPSBNYXRoLnJvdW5kKCgxLjAgLSBwb3NZTm9ybSkgKiB0aGlzLl92YWx1ZVZhbE1pbk1heFsxXSk7XG5cbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YodGhpcy5fdmFsdWVIdWUsIHNhdCwgdmFsKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUhhbmRsZUZpZWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB3aWR0aCA9IHRoaXMuX2NhbnZhc0ZpZWxkLndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0ID0gdGhpcy5fY2FudmFzRmllbGQuaGVpZ2h0LFxuICAgICAgICAgICAgb2Zmc2V0SGFuZGxlID0gdGhpcy5faGFuZGxlRmllbGRTaXplICogMC4yNTtcblxuICAgICAgICB2YXIgc2F0Tm9ybSA9IHRoaXMuX3ZhbHVlU2F0IC8gdGhpcy5fdmFsdWVTYXRNaW5NYXhbMV0sXG4gICAgICAgICAgICB2YWxOb3JtID0gdGhpcy5fdmFsdWVWYWwgLyB0aGlzLl92YWx1ZVZhbE1pbk1heFsxXTtcblxuICAgICAgICB0aGlzLl9oYW5kbGVGaWVsZC5zZXRQb3NpdGlvbkdsb2JhbChzYXROb3JtICogd2lkdGggLSBvZmZzZXRIYW5kbGUsXG4gICAgICAgICAgICAoMS4wIC0gdmFsTm9ybSkgKiBoZWlnaHQgLSBvZmZzZXRIYW5kbGUpO1xuXG4gICAgfSxcblxuICAgIF9kcmF3SGFuZGxlU2xpZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjYW52YXMgPSB0aGlzLl9jYW52YXNTbGlkZXIsXG4gICAgICAgICAgICBjYW52YXNQb3NZID0gdGhpcy5fY2FudmFzU2xpZGVyUG9zWzFdLFxuICAgICAgICAgICAgbW91c2VQb3NZID0gTW91c2UuZ2V0KCkuZ2V0WSgpO1xuXG4gICAgICAgIHZhciBwb3NZID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obW91c2VQb3NZIC0gY2FudmFzUG9zWSwgY2FudmFzLmhlaWdodCkpLFxuICAgICAgICAgICAgcG9zWU5vcm0gPSBwb3NZIC8gY2FudmFzLmhlaWdodDtcblxuICAgICAgICB2YXIgaHVlID0gTWF0aC5mbG9vcigoMS4wIC0gcG9zWU5vcm0pICogdGhpcy5fdmFsdWVIdWVNaW5NYXhbMV0pO1xuXG4gICAgICAgIHRoaXMuX3NldENvbG9ySFNWKGh1ZSwgdGhpcy5fdmFsdWVTYXQsIHRoaXMuX3ZhbHVlVmFsKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlU2xpZGVyKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVIYW5kbGVTbGlkZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhlaWdodCA9IHRoaXMuX2NhbnZhc1NsaWRlci5oZWlnaHQsXG4gICAgICAgICAgICBvZmZzZXRIYW5kbGUgPSB0aGlzLl9oYW5kbGVTbGlkZXJIZWlnaHQgKiAwLjI1O1xuXG4gICAgICAgIHZhciBodWVOb3JtID0gdGhpcy5fdmFsdWVIdWUgLyB0aGlzLl92YWx1ZUh1ZU1pbk1heFsxXTtcblxuICAgICAgICB0aGlzLl9oYW5kbGVTbGlkZXIuc2V0UG9zaXRpb25HbG9iYWxZKChoZWlnaHQgLSBvZmZzZXRIYW5kbGUpICogKDEuMCAtIGh1ZU5vcm0pKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUhhbmRsZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlRmllbGQoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlU2xpZGVyKCk7XG4gICAgfSxcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIF9zZXRIdWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgbWluTWF4ID0gdGhpcy5fdmFsdWVIdWVNaW5NYXg7XG5cbiAgICAgICAgdGhpcy5fdmFsdWVIdWUgPSB2YWx1ZSA9PSBtaW5NYXhbMV0gPyBtaW5NYXhbMF0gOiB2YWx1ZTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1YoKTtcbiAgICAgICAgdGhpcy5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgfSxcblxuICAgIF9zZXRTYXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl92YWx1ZVNhdCA9IE1hdGgucm91bmQodmFsdWUpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhTVigpO1xuICAgIH0sXG5cbiAgICBfc2V0VmFsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fdmFsdWVWYWwgPSBNYXRoLnJvdW5kKHZhbHVlKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1YoKTtcbiAgICB9LFxuXG4gICAgX3NldFI6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl92YWx1ZVIgPSBNYXRoLnJvdW5kKHZhbHVlKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0IoKTtcbiAgICB9LFxuXG4gICAgX3NldEc6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl92YWx1ZUcgPSBNYXRoLnJvdW5kKHZhbHVlKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0IoKTtcbiAgICB9LFxuXG4gICAgX3NldEI6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl92YWx1ZUIgPSBNYXRoLnJvdW5kKHZhbHVlKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JSR0IoKTtcbiAgICB9LFxuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgX29uSW5wdXRIdWVDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXRIdWUsXG4gICAgICAgICAgICBpbnB1dFZhbCA9IHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZChpbnB1dCwgdGhpcy5fdmFsdWVIdWVNaW5NYXgpO1xuXG4gICAgICAgIHZhciBtaW5NYXggPSB0aGlzLl92YWx1ZUh1ZU1pbk1heDtcblxuICAgICAgICBpZiAoaW5wdXRWYWwgPT0gbWluTWF4WzFdKSB7XG4gICAgICAgICAgICBpbnB1dFZhbCA9IG1pbk1heFswXTtcbiAgICAgICAgICAgIGlucHV0LnNldFZhbHVlKGlucHV0VmFsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3NldEh1ZShpbnB1dFZhbCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9yUkdCRnJvbUhTVigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlU2xpZGVyKCk7XG5cbiAgICAgICAgdGhpcy5fZHJhd0NhbnZhc0ZpZWxkKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0U2F0Q2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldFNhdCh0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQodGhpcy5faW5wdXRTYXQsIHRoaXMuX3ZhbHVlU2F0TWluTWF4KSk7XG4gICAgICAgIHRoaXMuX29uSW5wdXRTVkNoYW5nZSgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dFZhbENoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRWYWwodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0VmFsLCB0aGlzLl92YWx1ZVZhbE1pbk1heCkpO1xuICAgICAgICB0aGlzLl9vbklucHV0U1ZDaGFuZ2UoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRSQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3NldFIodGhpcy5fZ2V0VmFsdWVDb250cmFpbmVkKHRoaXMuX2lucHV0UiwgdGhpcy5fdmFsdWVSR0JNaW5NYXgpKTtcbiAgICAgICAgdGhpcy5fb25JbnB1dFJHQkNoYW5nZSgpO1xuICAgIH0sXG5cbiAgICBfb25JbnB1dEdDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Ryh0aGlzLl9nZXRWYWx1ZUNvbnRyYWluZWQodGhpcy5faW5wdXRHLCB0aGlzLl92YWx1ZVJHQk1pbk1heCkpO1xuICAgICAgICB0aGlzLl9vbklucHV0UkdCQ2hhbmdlKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0QkNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRCKHRoaXMuX2dldFZhbHVlQ29udHJhaW5lZCh0aGlzLl9pbnB1dEIsIHRoaXMuX3ZhbHVlUkdCTWluTWF4KSk7XG4gICAgICAgIHRoaXMuX29uSW5wdXRSR0JDaGFuZ2UoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRIRVhGaW5pc2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXRIRVgsXG4gICAgICAgICAgICB2YWx1ZSA9IGlucHV0LmdldFByb3BlcnR5KCd2YWx1ZScpO1xuXG4gICAgICAgIGlmICghQ29sb3JVdGlsLmlzVmFsaWRIRVgodmFsdWUpKSB7XG4gICAgICAgICAgICBpbnB1dC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl92YWx1ZUhFWFZhbGlkKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3ZhbHVlSEVYID0gdGhpcy5fdmFsdWVIRVhWYWxpZCA9IHZhbHVlO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckZyb21IRVgoKTtcbiAgICB9LFxuXG4gICAgX29uSW5wdXRTVkNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUhhbmRsZUZpZWxkKCk7XG4gICAgfSxcblxuICAgIF9vbklucHV0UkdCQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSGFuZGxlcygpO1xuICAgIH0sXG5cbiAgICBfZ2V0VmFsdWVDb250cmFpbmVkOiBmdW5jdGlvbiAoaW5wdXQsIG1pbk1heCkge1xuICAgICAgICB2YXIgaW5wdXRWYWwgPSBNYXRoLnJvdW5kKGlucHV0LmdldFZhbHVlKCkpLFxuICAgICAgICAgICAgbWluID0gbWluTWF4WzBdLFxuICAgICAgICAgICAgbWF4ID0gbWluTWF4WzFdO1xuXG4gICAgICAgIGlmIChpbnB1dFZhbCA8PSBtaW4pIHtcbiAgICAgICAgICAgIGlucHV0VmFsID0gbWluO1xuICAgICAgICAgICAgaW5wdXQuc2V0VmFsdWUoaW5wdXRWYWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbnB1dFZhbCA+PSBtYXgpIHtcbiAgICAgICAgICAgIGlucHV0VmFsID0gbWF4O1xuICAgICAgICAgICAgaW5wdXQuc2V0VmFsdWUoaW5wdXRWYWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGlucHV0VmFsO1xuICAgIH0sXG5cblxuICAgIF91cGRhdGVJbnB1dEh1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dEh1ZS5zZXRWYWx1ZSh0aGlzLl92YWx1ZUh1ZSk7XG4gICAgfSxcbiAgICBfdXBkYXRlSW5wdXRTYXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRTYXQuc2V0VmFsdWUodGhpcy5fdmFsdWVTYXQpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUlucHV0VmFsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0VmFsLnNldFZhbHVlKHRoaXMuX3ZhbHVlVmFsKTtcbiAgICB9LFxuICAgIF91cGRhdGVJbnB1dFI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faW5wdXRSLnNldFZhbHVlKHRoaXMuX3ZhbHVlUik7XG4gICAgfSxcbiAgICBfdXBkYXRlSW5wdXRHOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lucHV0Ry5zZXRWYWx1ZSh0aGlzLl92YWx1ZUcpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUlucHV0QjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dEIuc2V0VmFsdWUodGhpcy5fdmFsdWVCKTtcbiAgICB9LFxuICAgIF91cGRhdGVJbnB1dEhFWDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9pbnB1dEhFWC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl92YWx1ZUhFWCk7XG4gICAgfSxcblxuXG4gICAgX3NldENvbG9ySFNWOiBmdW5jdGlvbiAoaHVlLCBzYXQsIHZhbCkge1xuICAgICAgICB0aGlzLl92YWx1ZUh1ZSA9IGh1ZTtcbiAgICAgICAgdGhpcy5fdmFsdWVTYXQgPSBzYXQ7XG4gICAgICAgIHRoaXMuX3ZhbHVlVmFsID0gdmFsO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0SHVlKCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0U2F0KCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0VmFsKCk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlQ29udHJhc3RDdXJyQ29sb3IoKTtcbiAgICB9LFxuXG4gICAgX3NldENvbG9yUkdCOiBmdW5jdGlvbiAociwgZywgYikge1xuICAgICAgICB0aGlzLl92YWx1ZVIgPSByO1xuICAgICAgICB0aGlzLl92YWx1ZUcgPSBnO1xuICAgICAgICB0aGlzLl92YWx1ZUIgPSBiO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUlucHV0UigpO1xuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dEcoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlSW5wdXRCKCk7XG5cbiAgICAgICAgdGhpcy5fdXBkYXRlQ29udHJhc3RDdXJyQ29sb3IoKTtcbiAgICB9LFxuXG4gICAgX3NldENvbG9ySEVYOiBmdW5jdGlvbiAoaGV4KSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlSEVYID0gaGV4O1xuICAgICAgICB0aGlzLl91cGRhdGVJbnB1dEhFWCgpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29sb3JIU1Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JIU1YodGhpcy5fdmFsdWVIdWUsIHRoaXMuX3ZhbHVlU2F0LCB0aGlzLl92YWx1ZVZhbCk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbnRyYXN0Q3VyckNvbG9yKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvclJHQjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRDb2xvclJHQih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29udHJhc3RDdXJyQ29sb3IoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZUNvbG9ySFNWRnJvbVJHQjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaHN2ID0gQ29sb3JVdGlsLlJHQjJIU1YodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XG4gICAgICAgIHRoaXMuX3NldENvbG9ySFNWKGhzdlswXSwgaHN2WzFdLCBoc3ZbMl0pO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29sb3JSR0JGcm9tSFNWOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZ2IgPSBDb2xvclV0aWwuSFNWMlJHQih0aGlzLl92YWx1ZUh1ZSwgdGhpcy5fdmFsdWVTYXQsIHRoaXMuX3ZhbHVlVmFsKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JSR0IocmdiWzBdLCByZ2JbMV0sIHJnYlsyXSk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb2xvckhFWEZyb21SR0I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhleCA9IENvbG9yVXRpbC5SR0IySEVYKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpO1xuICAgICAgICB0aGlzLl9zZXRDb2xvckhFWChoZXgpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ29sb3JGcm9tSEVYOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZ2IgPSBDb2xvclV0aWwuSEVYMlJHQih0aGlzLl92YWx1ZUhFWCk7XG5cbiAgICAgICAgdGhpcy5fc2V0Q29sb3JSR0IocmdiWzBdLCByZ2JbMV0sIHJnYlsyXSk7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUNvbG9ySFNWRnJvbVJHQigpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVzKCk7XG4gICAgfSxcblxuICAgIF91cGRhdGVDb250cmFzdEN1cnJDb2xvcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRDb250cmFzdEN1cnJDb2xvcih0aGlzLl92YWx1ZVIsIHRoaXMuX3ZhbHVlRywgdGhpcy5fdmFsdWVCKTtcbiAgICB9LFxuICAgIF91cGRhdGVDb250cmFzdFByZXZDb2xvcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zZXRDb250cmFzUHJldkNvbG9yKHRoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUIpXG4gICAgfSxcblxuICAgIF9zZXRDb250cmFzdEN1cnJDb2xvcjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgdGhpcy5fY29sb3JDdXJyTm9kZS5zZXRTdHlsZVByb3BlcnR5KCdiYWNrZ3JvdW5kJywgJ3JnYignICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJyknKVxuICAgIH0sXG4gICAgX3NldENvbnRyYXNQcmV2Q29sb3I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgICAgIHRoaXMuX2NvbG9yUHJldk5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnYmFja2dyb3VuZCcsICdyZ2IoJyArIHIgKyAnLCcgKyBnICsgJywnICsgYiArICcpJylcbiAgICB9LFxuXG4gICAgX29uSGVhZERyYWdTdGFydDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGUsXG4gICAgICAgICAgICBwYXJlbnROb2RlID0gdGhpcy5fcGFyZW50Tm9kZTtcblxuICAgICAgICB2YXIgbm9kZVBvcyA9IG5vZGUuZ2V0UG9zaXRpb25HbG9iYWwoKSxcbiAgICAgICAgICAgIG1vdXNlUG9zID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgICAgIG9mZnNldFBvcyA9IHRoaXMuX21vdXNlT2Zmc2V0O1xuXG4gICAgICAgIG9mZnNldFBvc1swXSA9IG1vdXNlUG9zWzBdIC0gbm9kZVBvc1swXTtcbiAgICAgICAgb2Zmc2V0UG9zWzFdID0gbW91c2VQb3NbMV0gLSBub2RlUG9zWzFdO1xuXG4gICAgICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlUG9zaXRpb24oKTtcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVDYW52YXNOb2RlUG9zaXRpb25zKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9ucygpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICAgICAgcGFyZW50Tm9kZS5hZGRDaGlsZChub2RlKTtcblxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNhbnZhc05vZGVQb3NpdGlvbnMoKTtcbiAgICB9LFxuXG4gICAgX3VwZGF0ZVBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBtb3VzZVBvcyA9IE1vdXNlLmdldCgpLmdldFBvc2l0aW9uKCksXG4gICAgICAgICAgICBvZmZzZXRQb3MgPSB0aGlzLl9tb3VzZU9mZnNldDtcblxuICAgICAgICB2YXIgY3VyclBvc2l0aW9uWCA9IG1vdXNlUG9zWzBdIC0gb2Zmc2V0UG9zWzBdLFxuICAgICAgICAgICAgY3VyclBvc2l0aW9uWSA9IG1vdXNlUG9zWzFdIC0gb2Zmc2V0UG9zWzFdO1xuXG4gICAgICAgIHZhciBub2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgICAgIGhlYWQgPSB0aGlzLl9oZWFkTm9kZSxcbiAgICAgICAgICAgIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb247XG5cbiAgICAgICAgdmFyIG1heFggPSB3aW5kb3cuaW5uZXJXaWR0aCAtIG5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgICAgIG1heFkgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBoZWFkLmdldEhlaWdodCgpO1xuXG4gICAgICAgIHBvc2l0aW9uWzBdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oY3VyclBvc2l0aW9uWCwgbWF4WCkpO1xuICAgICAgICBwb3NpdGlvblsxXSA9IE1hdGgubWF4KDAsIE1hdGgubWluKGN1cnJQb3NpdGlvblksIG1heFkpKTtcblxuICAgICAgICBub2RlLnNldFBvc2l0aW9uR2xvYmFsKHBvc2l0aW9uWzBdLCBwb3NpdGlvblsxXSk7XG4gICAgfSxcblxuICAgIF9kcmF3Q2FudmFzRmllbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhc0ZpZWxkLFxuICAgICAgICAgICAgY29udGV4dCA9IHRoaXMuX2NvbnRleHRDYW52YXNGaWVsZDtcblxuICAgICAgICB2YXIgd2lkdGggPSBjYW52YXMud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0LFxuICAgICAgICAgICAgaW52V2lkdGggPSAxIC8gd2lkdGgsXG4gICAgICAgICAgICBpbnZIZWlnaHQgPSAxIC8gaGVpZ2h0O1xuXG4gICAgICAgIHZhciBpbWFnZURhdGEgPSB0aGlzLl9pbWFnZURhdGFGaWVsZCxcbiAgICAgICAgICAgIHJnYiA9IFtdLFxuICAgICAgICAgICAgaW5kZXggPSAwO1xuXG4gICAgICAgIHZhciB2YWx1ZUh1ZSA9IHRoaXMuX3ZhbHVlSHVlO1xuXG4gICAgICAgIHZhciBpID0gLTEsIGo7XG4gICAgICAgIHdoaWxlICgrK2kgPCBoZWlnaHQpIHtcbiAgICAgICAgICAgIGogPSAtMTtcblxuICAgICAgICAgICAgd2hpbGUgKCsraiA8IHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgcmdiID0gQ29sb3JVdGlsLkhTVjJSR0IodmFsdWVIdWUsIGogKiBpbnZXaWR0aCAqIDEwMC4wLCAoIDEuMCAtIGkgKiBpbnZIZWlnaHQgKSAqIDEwMC4wKTtcbiAgICAgICAgICAgICAgICBpbmRleCA9IChpICogd2lkdGggKyBqKSAqIDQ7XG5cbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleF0gPSByZ2JbMF07XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAxXSA9IHJnYlsxXTtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDJdID0gcmdiWzJdO1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgM10gPSAyNTU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApO1xuICAgIH0sXG5cbiAgICBfZHJhd0NhbnZhc1NsaWRlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzU2xpZGVyLFxuICAgICAgICAgICAgY29udGV4dCA9IHRoaXMuX2NvbnRleHRDYW52YXNTbGlkZXI7XG5cbiAgICAgICAgdmFyIHdpZHRoID0gY2FudmFzLndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0ID0gY2FudmFzLmhlaWdodCxcbiAgICAgICAgICAgIGludkhlaWdodCA9IDEgLyBoZWlnaHQ7XG5cbiAgICAgICAgdmFyIGltYWdlRGF0YSA9IHRoaXMuX2ltYWdlRGF0YVNsaWRlcixcbiAgICAgICAgICAgIHJnYiA9IFtdLFxuICAgICAgICAgICAgaW5kZXggPSAwO1xuXG4gICAgICAgIHZhciBpID0gLTEsIGo7XG4gICAgICAgIHdoaWxlICgrK2kgPCBoZWlnaHQpIHtcbiAgICAgICAgICAgIGogPSAtMTtcblxuICAgICAgICAgICAgd2hpbGUgKCsraiA8IHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgcmdiID0gQ29sb3JVdGlsLkhTVjJSR0IoKDEuMCAtIGkgKiBpbnZIZWlnaHQpICogMzYwLjAsIDEwMC4wLCAxMDAuMCk7XG4gICAgICAgICAgICAgICAgaW5kZXggPSAoaSAqIHdpZHRoICsgaikgKiA0O1xuXG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXhdID0gcmdiWzBdO1xuICAgICAgICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2luZGV4ICsgMV0gPSByZ2JbMV07XG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaW5kZXggKyAyXSA9IHJnYlsyXTtcbiAgICAgICAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpbmRleCArIDNdID0gMjU1O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKTtcblxuICAgIH0sXG5cbiAgICBfb25DYW52YXNGaWVsZE1vdXNlRG93bjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgICAgICBldmVudE1vdXNlVXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuX2RyYXdIYW5kbGVGaWVsZCgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgICAgICBzZWxmLl9kcmF3SGFuZGxlRmllbGQoKTtcbiAgICB9LFxuXG4gICAgX29uQ2FudmFzU2xpZGVyTW91c2VEb3duOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgICAgIGV2ZW50TW91c2VVcCA9IERvY3VtZW50RXZlbnQuTU9VU0VfVVA7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fZHJhd0hhbmRsZVNsaWRlcigpO1xuICAgICAgICAgICAgICAgIHNlbGYuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZU1vdmUsIG9uRHJhZywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBzZWxmLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRNb3VzZVVwLCBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgICAgICBzZWxmLl9kcmF3SGFuZGxlU2xpZGVyKCk7XG4gICAgICAgIHNlbGYuX2RyYXdDYW52YXNGaWVsZCgpO1xuICAgIH0sXG5cbiAgICBfc2V0U2l6ZUNhbnZhc0ZpZWxkOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzRmllbGQ7XG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuXG4gICAgfSxcblxuICAgIF9zZXRTaXplQ2FudmFzU2xpZGVyOiBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgY2FudmFzID0gdGhpcy5fY2FudmFzU2xpZGVyO1xuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XG4gICAgICAgIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyAncHgnO1xuICAgICAgICBjYW52YXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGhlaWdodDtcbiAgICB9LFxuXG4gICAgb3BlbjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGU7XG5cbiAgICAgICAgdGhpcy5fcGFyZW50Tm9kZS5hZGRDaGlsZChub2RlKTtcbiAgICAgICAgbm9kZS5zZXRQb3NpdGlvbkdsb2JhbCh3aW5kb3cuaW5uZXJXaWR0aCAqIDAuNSAtIG5vZGUuZ2V0V2lkdGgoKSAqIDAuNSxcbiAgICAgICAgICAgIHdpbmRvdy5pbm5lckhlaWdodCAqIDAuNSAtIG5vZGUuZ2V0SGVpZ2h0KCkgKiAwLjUpO1xuXG4gICAgICAgIHRoaXMuX3VwZGF0ZUNhbnZhc05vZGVQb3NpdGlvbnMoKTtcbiAgICB9LFxuXG4gICAgY2xvc2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fcGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLl9ub2RlKTtcbiAgICB9LFxuXG4gICAgX29uQ2xvc2U6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH0sXG4gICAgX29uUGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9jYWxsYmFja1BpY2soKTtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQ2FudmFzTm9kZVBvc2l0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2FudmFzU2xpZGVyUG9zID0gdGhpcy5fY2FudmFzU2xpZGVyUG9zLFxuICAgICAgICAgICAgY2FudmFzRmllbGRQb3MgPSB0aGlzLl9jYW52YXNGaWVsZFBvcztcblxuICAgICAgICBjYW52YXNTbGlkZXJQb3NbMF0gPSBjYW52YXNTbGlkZXJQb3NbMV0gPSAwO1xuICAgICAgICBjYW52YXNGaWVsZFBvc1swXSA9IGNhbnZhc0ZpZWxkUG9zWzFdID0gMDtcblxuICAgICAgICB2YXIgZWxlbWVudCA9IHRoaXMuX2NhbnZhc1NsaWRlcjtcblxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICAgICAgY2FudmFzU2xpZGVyUG9zWzBdICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgICAgIGNhbnZhc1NsaWRlclBvc1sxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW1lbnQgPSB0aGlzLl9jYW52YXNGaWVsZDtcblxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICAgICAgY2FudmFzRmllbGRQb3NbMF0gKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICAgICAgY2FudmFzRmllbGRQb3NbMV0gKz0gZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgc2V0Q2FsbGJhY2tQaWNrOiBmdW5jdGlvbiAoZnVuYykge1xuICAgICAgICB0aGlzLl9jYWxsYmFja1BpY2sgPSBmdW5jO1xuICAgIH0sXG5cbiAgICBzZXRDb2xvckhFWDogZnVuY3Rpb24gKGhleCkge1xuICAgICAgICB0aGlzLl9zZXRDb2xvckhFWChoZXgpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckZyb21IRVgoKTtcbiAgICAgICAgdGhpcy5fc2V0Q29sb3IoKTtcbiAgICB9LFxuXG4gICAgc2V0Q29sb3JSR0I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgICAgIHRoaXMuX3NldENvbG9yUkdCKHIsIGcsIGIpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvckhFWEZyb21SR0IoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIU1ZGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3NldENvbG9yKCk7XG4gICAgfSxcblxuICAgIHNldENvbG9yUkdCZnY6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgICAgIHRoaXMuc2V0Q29sb3JSR0IoTWF0aC5mbG9vcihyICogMjU1LjApLFxuICAgICAgICAgICAgTWF0aC5mbG9vcihnICogMjU1LjApLFxuICAgICAgICAgICAgTWF0aC5mbG9vcihiICogMjU1LjApKTtcbiAgICB9LFxuXG4gICAgc2V0Q29sb3JIU1Y6IGZ1bmN0aW9uIChoLCBzLCB2KSB7XG4gICAgICAgIHRoaXMuX3NldENvbG9ySFNWKGgsIHMsIHYpO1xuICAgICAgICB0aGlzLl91cGRhdGVDb2xvclJHQkZyb21IU1YoKTtcbiAgICAgICAgdGhpcy5fdXBkYXRlQ29sb3JIRVhGcm9tUkdCKCk7XG4gICAgICAgIHRoaXMuX3NldENvbG9yKCk7XG4gICAgfSxcblxuICAgIF9zZXRDb2xvcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzRmllbGQoKTtcbiAgICAgICAgdGhpcy5fZHJhd0NhbnZhc1NsaWRlcigpO1xuICAgICAgICB0aGlzLl91cGRhdGVIYW5kbGVzKCk7XG4gICAgICAgIHRoaXMuX3NldENvbnRyYXNQcmV2Q29sb3IodGhpcy5fdmFsdWVSLCB0aGlzLl92YWx1ZUcsIHRoaXMuX3ZhbHVlQik7XG4gICAgfSxcblxuICAgIGdldFI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlUjtcbiAgICB9LFxuICAgIGdldEc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlRztcbiAgICB9LFxuICAgIGdldEI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlQjtcbiAgICB9LFxuICAgIGdldFJHQjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gW3RoaXMuX3ZhbHVlUiwgdGhpcy5fdmFsdWVHLCB0aGlzLl92YWx1ZUJdO1xuICAgIH0sXG4gICAgZ2V0SHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZUh1ZTtcbiAgICB9LFxuICAgIGdldFNhdDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWVTYXQ7XG4gICAgfSxcbiAgICBnZXRWYWw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlVmFsO1xuICAgIH0sXG4gICAgZ2V0SFNWOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbdGhpcy5fdmFsdWVIdWUsIHRoaXMuX3ZhbHVlU2F0LCB0aGlzLl92YWx1ZVZhbF07XG4gICAgfSxcbiAgICBnZXRIRVg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlSEVYO1xuICAgIH0sXG4gICAgZ2V0UkdCZnY6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFt0aGlzLl92YWx1ZVIgLyAyNTUuMCwgdGhpcy5fdmFsdWVHIC8gMjU1LjAsIHRoaXMuX3ZhbHVlQiAvIDI1NS4wXTtcbiAgICB9LFxuXG4gICAgZ2V0Tm9kZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbm9kZTtcbiAgICB9XG59O1xuXG5QaWNrZXIuc2V0dXAgPSBmdW5jdGlvbiAocGFyZW50Tm9kZSkge1xuICAgIHJldHVybiBQaWNrZXIuX2luc3RhbmNlID0gbmV3IFBpY2tlcihwYXJlbnROb2RlKTtcbn07XG5QaWNrZXIuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBQaWNrZXIuX2luc3RhbmNlO1xufTtcblBpY2tlci5kZXN0cm95ID0gZnVuY3Rpb24oKXtcbiAgICBQaWNrZXIuX2luc3RhbmNlID0gbnVsbDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGlja2VyOyIsInZhciBTVkdDb21wb25lbnQgPSByZXF1aXJlKCcuL1NWR0NvbXBvbmVudCcpO1xuXG5mdW5jdGlvbiBQbG90dGVyKHBhcmVudCxvYmplY3QsdmFsdWUscGFyYW1zKSB7XG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5saW5lV2lkdGggID0gcGFyYW1zLmxpbmVXaWR0aCAgfHwgMjtcbiAgICBwYXJhbXMubGluZUNvbG9yICA9IHBhcmFtcy5saW5lQ29sb3IgIHx8IFsyNTUsMjU1LDI1NV07XG5cbiAgICBTVkdDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdmFyIGxpbmVXaWR0aCA9IHRoaXMuX2xpbmVXaWR0aCA9IHBhcmFtcy5saW5lV2lkdGg7XG4gICAgdmFyIGxpbmVDb2xvciA9IHBhcmFtcy5saW5lQ29sb3I7XG5cbiAgICB2YXIgZ3JpZCA9IHRoaXMuX2dyaWQgPSB0aGlzLl9zdmdSb290LmFwcGVuZENoaWxkKHRoaXMuX2NyZWF0ZVNWR09iamVjdCgncGF0aCcpKTtcbiAgICAgICAgZ3JpZC5zdHlsZS5zdHJva2UgPSAncmdiKDI2LDI5LDMxKSc7XG5cblxuICAgIHZhciBwYXRoID0gdGhpcy5fcGF0aCA9IHRoaXMuX3N2Z1Jvb3QuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdwYXRoJykpO1xuICAgICAgICBwYXRoLnN0eWxlLnN0cm9rZSAgICAgID0gJ3JnYignK2xpbmVDb2xvclswXSsnLCcrbGluZUNvbG9yWzFdKycsJytsaW5lQ29sb3JbMl0rJyknO1xuICAgICAgICBwYXRoLnN0eWxlLnN0cm9rZVdpZHRoID0gbGluZVdpZHRoIDtcbiAgICAgICAgcGF0aC5zdHlsZS5maWxsICAgICAgICA9ICdub25lJztcbn1cblxuUGxvdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNWR0NvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBsb3R0ZXI7XG4iLCJ2YXIgRXZlbnREaXNwYXRjaGVyICAgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpO1xudmFyIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllcicpO1xuXG52YXIgRXZlbnRfICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgT3B0aW9uRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL09wdGlvbkV2ZW50JyksXG4gICAgTm9kZUV2ZW50ICAgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbmZ1bmN0aW9uIFByZXNldEJ0bihwYXJlbnROb2RlKSB7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMpO1xuICAgIHZhciBidG5Ob2RlICA9IHRoaXMuX2J0bk5vZGUgPSBuZXcgTm9kZShOb2RlLklOUFVUX0JVVFRPTiksXG4gICAgICAgIGluZGlOb2RlID0gdGhpcy5faW5kaU5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgdGhpcy5fb25BY3RpdmUgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICB0aGlzLl9vbkRlYWN0aXZlID0gZnVuY3Rpb24gKCkge307XG4gICAgdGhpcy5faXNBY3RpdmUgPSBmYWxzZTtcblxuICAgIGJ0bk5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuUHJlc2V0QnRuKTtcbiAgICBidG5Ob2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uTW91c2VEb3duLmJpbmQodGhpcykpO1xuXG4gICAgYnRuTm9kZS5hZGRDaGlsZChpbmRpTm9kZSk7XG4gICAgcGFyZW50Tm9kZS5hZGRDaGlsZEF0KGJ0bk5vZGUsIDApO1xuXG4gICAgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCkuYWRkRXZlbnRMaXN0ZW5lcihPcHRpb25FdmVudC5UUklHR0VSLCB0aGlzLCAnb25PcHRpb25UcmlnZ2VyJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKE9wdGlvbkV2ZW50LlRSSUdHRVJFRCwgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCksICdvbk9wdGlvblRyaWdnZXJlZCcpO1xufVxuXG5QcmVzZXRCdG4ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblxuUHJlc2V0QnRuLnByb3RvdHlwZS5vbk9wdGlvblRyaWdnZXIgPSBmdW5jdGlvbihlKXtcbiAgICBpZihlLmRhdGEub3JpZ2luID09IHRoaXMpe1xuICAgICAgICBpZighdGhpcy5faXNBY3RpdmUpe1xuICAgICAgICAgICAgdGhpcy5fb25BY3RpdmUoKTtcbiAgICAgICAgICAgIHRoaXMuX2J0bk5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuUHJlc2V0QnRuQWN0aXZlKTtcbiAgICAgICAgICAgIHRoaXMuX2lzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNle1xuICAgICAgICAgICAgdGhpcy5fb25EZWFjdGl2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZih0aGlzLl9pc0FjdGl2ZSl7XG4gICAgICAgIHRoaXMuZGVhY3RpdmF0ZSgpO1xuICAgIH1cbn07XG5cblByZXNldEJ0bi5wcm90b3R5cGUuX29uTW91c2VEb3duID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBPcHRpb25FdmVudC5UUklHR0VSRUQsIG51bGwpKTtcbn07XG5cblByZXNldEJ0bi5wcm90b3R5cGUuc2V0T25BY3RpdmUgPSBmdW5jdGlvbihmdW5jKXtcbiAgICB0aGlzLl9vbkFjdGl2ZSA9IGZ1bmM7XG59O1xuXG5QcmVzZXRCdG4ucHJvdG90eXBlLnNldE9uRGVhY3RpdmUgPSBmdW5jdGlvbihmdW5jKXtcbiAgICB0aGlzLl9vbkRlYWN0aXZlID0gZnVuYztcbn07XG5cblByZXNldEJ0bi5wcm90b3R5cGUuZGVhY3RpdmF0ZSA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5faXNBY3RpdmUgPSBmYWxzZTtcbiAgICB0aGlzLl9idG5Ob2RlLnNldFN0eWxlQ2xhc3MoQ1NTLlByZXNldEJ0bik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByZXNldEJ0bjtcbiIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9TVEVQID0gMS4wLFxuICAgIERFRkFVTFRfRFAgICA9IDI7XG5cbmZ1bmN0aW9uIFJhbmdlKHBhcmVudCwgb2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgT2JqZWN0Q29tcG9uZW50LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyAgICAgICAgICA9IHBhcmFtcyAgICAgICAgICB8fCB7fTtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgcGFyYW1zLnN0ZXAgICAgID0gcGFyYW1zLnN0ZXAgfHwgREVGQVVMVF9TVEVQO1xuICAgIHBhcmFtcy5kcCAgICAgICA9IHBhcmFtcy5kcCAgIHx8IERFRkFVTFRfRFA7XG5cbiAgICB0aGlzLl9vbkNoYW5nZSAgPSBwYXJhbXMub25DaGFuZ2U7XG5cbiAgICB2YXIgc3RlcCA9IHRoaXMuX3N0ZXAgPSBwYXJhbXMuc3RlcCxcbiAgICAgICAgZHAgICA9IHRoaXMuX2RwICAgPSBwYXJhbXMuZHA7XG5cbiAgICAvL0ZJWE1FOiBoaXN0b3J5IHB1c2ggcG9wXG5cbiAgICB2YXIgbGFibE1pbk5vZGUgPSBuZXcgTm9kZSgpO1xuICAgIHZhciBpbnB1dE1pbiAgICA9IHRoaXMuX2lucHV0TWluID0gbmV3IE51bWJlcklucHV0X0ludGVybmFsKHN0ZXAsZHAsIHRoaXMucHVzaEhpc3RvcnlTdGF0ZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uSW5wdXRNaW5DaGFuZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0TWluRmluaXNoLmJpbmQodGhpcykpO1xuXG4gICAgdmFyIGxhYmxNYXhOb2RlID0gbmV3IE5vZGUoKTtcbiAgICB2YXIgaW5wdXRNYXggICAgPSB0aGlzLl9pbnB1dE1heCA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbChzdGVwLGRwLCB0aGlzLnB1c2hIaXN0b3J5U3RhdGUuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0TWF4Q2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25JbnB1dE1heEZpbmlzaC5iaW5kKHRoaXMpKTtcblxuICAgIHZhciB3cmFwTGFibE1pbiAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApLFxuICAgICAgICB3cmFwSW5wdXRNaW4gPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApLFxuICAgICAgICB3cmFwTGFibE1heCAgPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApLFxuICAgICAgICB3cmFwSW5wdXRNYXggPSBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuXG5cbiAgICAgICAgbGFibE1pbk5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdNSU4nKTtcbiAgICAgICAgbGFibE1heE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuTGFiZWwpLnNldFByb3BlcnR5KCdpbm5lckhUTUwnLCdNQVgnKTtcblxuICAgIHZhciB2YWx1ZXMgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcblxuICAgIGlucHV0TWluLnNldFZhbHVlKHZhbHVlc1swXSk7XG4gICAgaW5wdXRNYXguc2V0VmFsdWUodmFsdWVzWzFdKTtcblxuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlO1xuXG4gICAgICAgIHdyYXBMYWJsTWluLmFkZENoaWxkKGxhYmxNaW5Ob2RlKTtcbiAgICAgICAgd3JhcElucHV0TWluLmFkZENoaWxkKGlucHV0TWluLmdldE5vZGUoKSk7XG4gICAgICAgIHdyYXBMYWJsTWF4LmFkZENoaWxkKGxhYmxNYXhOb2RlKTtcbiAgICAgICAgd3JhcElucHV0TWF4LmFkZENoaWxkKGlucHV0TWF4LmdldE5vZGUoKSk7XG5cbiAgICAgICAgd3JhcE5vZGUuYWRkQ2hpbGQod3JhcExhYmxNaW4pO1xuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZCh3cmFwSW5wdXRNaW4pO1xuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZCh3cmFwTGFibE1heCk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKHdyYXBJbnB1dE1heCk7XG59XG5cblJhbmdlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5cblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG4gICAgdGhpcy5fb25DaGFuZ2UoKTtcbn07XG5cblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dEZpbmlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG59O1xuXG5SYW5nZS5wcm90b3R5cGUuX3VwZGF0ZVZhbHVlTWluID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcblxuICAgIHZhciBpbnB1dE1pbiA9IHRoaXMuX2lucHV0TWluLFxuICAgICAgICBpbnB1dFZhbHVlID0gaW5wdXRNaW4uZ2V0VmFsdWUoKTtcblxuICAgIGlmIChpbnB1dFZhbHVlID49IHRoaXMuX2lucHV0TWF4LmdldFZhbHVlKCkpIHtcbiAgICAgICAgaW5wdXRNaW4uc2V0VmFsdWUodmFsdWVzWzBdKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YWx1ZXNbMF0gPSBpbnB1dFZhbHVlO1xuXG59O1xuXG5SYW5nZS5wcm90b3R5cGUuX3VwZGF0ZVZhbHVlTWF4ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcblxuICAgIHZhciBpbnB1dE1heCA9IHRoaXMuX2lucHV0TWF4LFxuICAgICAgICBpbnB1dFZhbHVlID0gaW5wdXRNYXguZ2V0VmFsdWUoKTtcblxuICAgIGlmIChpbnB1dFZhbHVlIDw9IHRoaXMuX2lucHV0TWluLmdldFZhbHVlKCkpIHtcbiAgICAgICAgaW5wdXRNYXguc2V0VmFsdWUodmFsdWVzWzFdKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YWx1ZXNbMV0gPSBpbnB1dFZhbHVlO1xufTtcblxuXG5SYW5nZS5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gbnVsbCkge1xuICAgIH1cblxuICAgIHZhciB2YWx1ZXMgPSB0aGlzLl9vYmplY3RbdGhpcy5fa2V5XTtcbiAgICB0aGlzLl9pbnB1dE1pbi5zZXRWYWx1ZSh0aGlzLl9vYmplY3RbdGhpcy5fa2V5XVswXSk7XG4gICAgdGhpcy5faW5wdXRNYXguc2V0VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX2tleV1bMV0pO1xufTtcblxuXG5SYW5nZS5wcm90b3R5cGUuX29uSW5wdXRNaW5DaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVNaW4oKTtcbiAgICB0aGlzLl9vbklucHV0Q2hhbmdlKCk7XG59O1xuUmFuZ2UucHJvdG90eXBlLl9vbklucHV0TWluRmluaXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3VwZGF0ZVZhbHVlTWluKCk7XG4gICAgdGhpcy5fb25JbnB1dEZpbmlzaCgpO1xufTtcblJhbmdlLnByb3RvdHlwZS5fb25JbnB1dE1heENoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVWYWx1ZU1heCgpO1xuICAgIHRoaXMuX29uSW5wdXRDaGFuZ2UoKTtcbn07XG5SYW5nZS5wcm90b3R5cGUuX29uSW5wdXRNYXhGaW5pc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVNYXgoKTtcbiAgICB0aGlzLl9vbklucHV0RmluaXNoKCk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gUmFuZ2U7IiwidmFyIENvbXBvbmVudCA9IHJlcXVpcmUoJy4vLi4vY29yZS9Db21wb25lbnQnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE1ldHJpYyA9IHJlcXVpcmUoJy4uL2NvcmUvTWV0cmljJyk7XG52YXIgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKTtcblxuZnVuY3Rpb24gU1ZHKHBhcmVudCwgcGFyYW1zKSB7XG4gICAgQ29tcG9uZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcbiAgICB3cmFwTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5DYW52YXNXcmFwKTtcbiAgICB2YXIgd3JhcFNpemUgPSB3cmFwTm9kZS5nZXRXaWR0aCgpO1xuXG5cbiAgICB2YXIgc3ZnID0gdGhpcy5fc3ZnID0gdGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdzdmcnKTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd2ZXJzaW9uJywgJzEuMicpO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2Jhc2VQcm9maWxlJywgJ3RpbnknKTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCdwcmVzZXJ2ZUFzcGVjdFJhdGlvJywgJ3RydWUnKTtcblxuICAgIHdyYXBOb2RlLmdldEVsZW1lbnQoKS5hcHBlbmRDaGlsZChzdmcpO1xuXG4gICAgdGhpcy5fc3ZnU2V0U2l6ZSh3cmFwU2l6ZSwgd3JhcFNpemUpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuXG5cbiAgICB0aGlzLl9ub2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkNhbnZhc0xpc3RJdGVtKTtcblxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIHRoaXMsICdvbkdyb3VwU2l6ZUNoYW5nZScpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX1NJWkVfVVBEQVRFLCB0aGlzLl9wYXJlbnQsICdvbkdyb3VwU2l6ZVVwZGF0ZScpO1xufVxuXG5TVkcucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb21wb25lbnQucHJvdG90eXBlKTtcblxuU1ZHLnByb3RvdHlwZS5fdXBkYXRlSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdmdIZWlnaHQgPSBOdW1iZXIodGhpcy5fc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuICAgIHRoaXMuX3dyYXBOb2RlLnNldEhlaWdodChzdmdIZWlnaHQpO1xuICAgIHRoaXMuX25vZGUuc2V0SGVpZ2h0KHN2Z0hlaWdodCArIE1ldHJpYy5QQURESU5HX1dSQVBQRVIpO1xufTtcblxuU1ZHLnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd2lkdGggPSB0aGlzLl93cmFwTm9kZS5nZXRXaWR0aCgpO1xuICAgIHRoaXMuX3N2Z1NldFNpemUod2lkdGgsIHdpZHRoKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcbn07XG5cblNWRy5wcm90b3R5cGUuX3N2Z1NldFNpemUgPSBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aCk7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd2aWV3Ym94JywgJzAgMCAnICsgd2lkdGggKyAnICcgKyBoZWlnaHQpO1xufTtcblxuU1ZHLnByb3RvdHlwZS5nZXRTVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N2Zztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU1ZHOyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgR3JvdXBFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL0dyb3VwRXZlbnQnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xuXG5mdW5jdGlvbiBTVkdDb21wb25lbnQocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpe1xuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZTtcbiAgICAgICAgd3JhcE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU1ZHV3JhcCk7XG4gICAgdmFyIHdyYXBTaXplID0gd3JhcE5vZGUuZ2V0V2lkdGgoKTtcblxuICAgIHZhciBzdmcgPSB0aGlzLl9zdmcgPSB0aGlzLl9jcmVhdGVTVkdPYmplY3QoJ3N2ZycpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCd2ZXJzaW9uJywgJzEuMicpO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCdiYXNlUHJvZmlsZScsICd0aW55Jyk7XG5cbiAgICAgICAgd3JhcE5vZGUuZ2V0RWxlbWVudCgpLmFwcGVuZENoaWxkKHN2Zyk7XG5cbiAgICB2YXIgc3ZnUm9vdCA9IHRoaXMuX3N2Z1Jvb3QgPSBzdmcuYXBwZW5kQ2hpbGQodGhpcy5fY3JlYXRlU1ZHT2JqZWN0KCdnJykpO1xuICAgICAgICBzdmdSb290LnNldEF0dHJpYnV0ZSgndHJhbnNmb3JtJywndHJhbnNsYXRlKDAuNSAwLjUpJyk7XG5cbiAgICB0aGlzLl9zdmdTZXRTaXplKHdyYXBTaXplLHdyYXBTaXplKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcblxuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU1ZHTGlzdEl0ZW0pO1xuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgdGhpcywgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIHRoaXMuX3BhcmVudCwgJ29uR3JvdXBTaXplVXBkYXRlJyk7XG59XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3VwZGF0ZUhlaWdodCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHN2Z0hlaWdodCA9IE51bWJlcih0aGlzLl9zdmcuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSk7XG5cbiAgICB0aGlzLl93cmFwTm9kZS5zZXRIZWlnaHQoc3ZnSGVpZ2h0KTtcbiAgICB0aGlzLl9ub2RlLnNldEhlaWdodChzdmdIZWlnaHQgKyBNZXRyaWMuUEFERElOR19XUkFQUEVSKTtcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3JlZHJhdyA9IGZ1bmN0aW9uKCl7fTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHdpZHRoID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKTtcblxuICAgIHRoaXMuX3N2Z1NldFNpemUod2lkdGgsd2lkdGgpO1xuICAgIHRoaXMuX3VwZGF0ZUhlaWdodCgpO1xuICAgIHRoaXMuX3JlZHJhdygpO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fY3JlYXRlU1ZHT2JqZWN0ID0gZnVuY3Rpb24odHlwZSkge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLHR5cGUpO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fc3ZnU2V0U2l6ZSA9IGZ1bmN0aW9uKHdpZHRoLGhlaWdodCkge1xuICAgIHZhciBzdmcgPSB0aGlzLl9zdmc7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgIHdpZHRoKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgndmlld2JveCcsICcwIDAgJyArIHdpZHRoICsgJyAnICsgaGVpZ2h0KTtcbn07XG5cblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZE1vdmVUbyA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgcmV0dXJuICdNICcgKyB4ICsgJyAnICsgeSArICcgJztcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRMaW5lVG8gPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiAnTCAnICsgeCArICcgJyArIHkgKyAnICc7XG59O1xuXG5TVkdDb21wb25lbnQucHJvdG90eXBlLl9wYXRoQ21kQ2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICdaJztcbn07XG5cblNWR0NvbXBvbmVudC5wcm90b3R5cGUuX3BhdGhDbWRMaW5lID0gZnVuY3Rpb24gKHgwLCB5MCwgeDEsIHkxKSB7XG4gICAgcmV0dXJuICdNICcgKyB4MCArICcgJyArIHkwICsgJyBMICcgKyB4MSArICcgJyArIHkxO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZEJlemllckN1YmljID0gZnVuY3Rpb24gKGNtZCwgeDAsIHkwLCBjeDAsIGN5MCwgY3gxLCBjeTEsIHgxLCB5MSkge1xuICAgIHJldHVybiAnTSAnICsgeDAgKyAnICcgKyB5MCArICcgQyAnICsgY3gwICsgJyAnICsgY3kwICsgJywgJyArIGN4MSArICcgJyArIGN5MSArICcsICcgKyB4MSArICcgJyArIHkxO1xufTtcblxuU1ZHQ29tcG9uZW50LnByb3RvdHlwZS5fcGF0aENtZEJlemllclF1YWRyYXRpYyA9IGZ1bmN0aW9uIChjbWQsIHgwLCB5MCwgY3gsIGN5LCB4MSwgeTEpIHtcbiAgICByZXR1cm4gJ00gJyArIHgwICsgJyAnICsgeTAgKyAnIFEgJyArIGN4ICsgJyAnICsgY3kgKyAnLCAnICsgeDEgKyAnICcgKyB5MTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU1ZHQ29tcG9uZW50OyIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcbnZhciBDU1MgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcblxudmFyIE9wdGlvbnMgPSByZXF1aXJlKCcuL09wdGlvbnMnKTtcblxudmFyIEV2ZW50XyAgICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIE5vZGVFdmVudCAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlRXZlbnQnKSxcbiAgICBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKSxcbiAgICBPcHRpb25FdmVudCAgICA9IHJlcXVpcmUoJy4uL2NvcmUvT3B0aW9uRXZlbnQnKTtcblxudmFyIE9iamVjdENvbXBvbmVudE5vdGlmaWVyID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnROb3RpZmllcicpO1xuXG5mdW5jdGlvbiBTZWxlY3QocGFyZW50LCBvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgdGhpcy5fb25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2U7XG5cbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqZWN0LFxuICAgICAgICBrZXkgPSB0aGlzLl9rZXk7XG5cbiAgICB2YXIgdGFyZ2V0S2V5ID0gdGhpcy5fdGFyZ2V0S2V5ID0gcGFyYW1zLnRhcmdldCxcbiAgICAgICAgdmFsdWVzID0gdGhpcy5fdmFsdWVzID0gb2JqW2tleV07XG5cblxuICAgIHRoaXMuX3NlbGVjdGVkSW5kZXggPSAtMTtcbiAgICB0aGlzLl9zZWxlY3RlZCA9IG51bGw7XG5cbiAgICB2YXIgc2VsZWN0ID0gdGhpcy5fc2VsZWN0ID0gbmV3IE5vZGUoTm9kZS5JTlBVVF9CVVRUT04pO1xuICAgICAgICBzZWxlY3Quc2V0U3R5bGVDbGFzcyhDU1MuU2VsZWN0KTtcbiAgICAgICAgc2VsZWN0LmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uT3B0aW9uVHJpZ2dlci5iaW5kKHRoaXMpKTtcblxuICAgIGlmKHRoaXMuX2hhc1RhcmdldCgpKSB7XG4gICAgICAgIHZhciB0YXJnZXRPYmogPSBvYmpbdGFyZ2V0S2V5XSB8fCAnJztcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IHZhbHVlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICh0YXJnZXRPYmogPT0gdmFsdWVzW2ldKXtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZWxlY3RlZCA9IHZhbHVlc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGFyZ2V0T2JqLnRvU3RyaW5nKCkubGVuZ3RoID4gMCA/IHRhcmdldE9iaiA6IHZhbHVlc1swXSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJywgcGFyYW1zLnNlbGVjdGVkID8gdmFsdWVzW3BhcmFtcy5zZWxlY3RlZF0gOiAnQ2hvb3NlIC4uLicpO1xuICAgIH1cblxuICAgIHRoaXMuX3dyYXBOb2RlLmFkZENoaWxkKHNlbGVjdCk7XG5cbiAgICBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKS5hZGRFdmVudExpc3RlbmVyKE9wdGlvbkV2ZW50LlRSSUdHRVIsIHRoaXMsICdvbk9wdGlvblRyaWdnZXInKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoT3B0aW9uRXZlbnQuVFJJR0dFUkVELCBPYmplY3RDb21wb25lbnROb3RpZmllci5nZXQoKSwgJ29uT3B0aW9uVHJpZ2dlcmVkJyk7XG59XG5cblNlbGVjdC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5TZWxlY3QucHJvdG90eXBlLm9uT3B0aW9uVHJpZ2dlciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcykge1xuICAgICAgICB0aGlzLl9hY3RpdmUgPSAhdGhpcy5fYWN0aXZlO1xuICAgICAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuICAgICAgICAgICAgdGhpcy5fYnVpbGRPcHRpb25zKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBPcHRpb25zLmdldCgpLmNsZWFyKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fYWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5fYnVpbGRPcHRpb25zID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvcHRpb25zID0gT3B0aW9ucy5nZXQoKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBvcHRpb25zLmJ1aWxkKHRoaXMuX3ZhbHVlcywgdGhpcy5fc2VsZWN0ZWQsIHRoaXMuX3NlbGVjdCxcbiAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuYXBwbHlWYWx1ZSgpO1xuICAgICAgICAgICAgc2VsZi5fYWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICBzZWxmLl91cGRhdGVBcHBlYXJhbmNlKCk7XG4gICAgICAgICAgICBzZWxmLl9zZWxlY3RlZEluZGV4ID0gb3B0aW9ucy5nZXRTZWxlY3RlZEluZGV4KCk7XG4gICAgICAgICAgICBzZWxmLl9vbkNoYW5nZShzZWxmLl9zZWxlY3RlZEluZGV4KTtcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuX2FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgc2VsZi5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgICAgICAgICAgb3B0aW9ucy5jbGVhcigpXG4gICAgICAgIH0sIGZhbHNlKTtcbn07XG5cblxuU2VsZWN0LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpbmRleCA9IE9wdGlvbnMuZ2V0KCkuZ2V0U2VsZWN0ZWRJbmRleCgpLFxuICAgICAgICBzZWxlY3RlZCA9IHRoaXMuX3NlbGVjdGVkID0gdGhpcy5fdmFsdWVzW2luZGV4XTtcblxuICAgIGlmICh0aGlzLl9oYXNUYXJnZXQoKSkge1xuICAgICAgICB0aGlzLnB1c2hIaXN0b3J5U3RhdGUoKTtcbiAgICAgICAgdGhpcy5fb2JqZWN0W3RoaXMuX3RhcmdldEtleV0gPSBzZWxlY3RlZDtcbiAgICB9XG5cbiAgICB0aGlzLl9zZWxlY3Quc2V0UHJvcGVydHkoJ3ZhbHVlJywgc2VsZWN0ZWQpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUucHVzaEhpc3RvcnlTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqZWN0LFxuICAgICAgICBrZXkgPSB0aGlzLl90YXJnZXRLZXk7XG4gICAgSGlzdG9yeS5nZXQoKS5wdXNoU3RhdGUob2JqLCBrZXksIG9ialtrZXldKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuX29uT3B0aW9uVHJpZ2dlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBPcHRpb25FdmVudC5UUklHR0VSRUQsIG51bGwpKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuX3VwZGF0ZUFwcGVhcmFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fc2VsZWN0LnNldFN0eWxlQ2xhc3ModGhpcy5fYWN0aXZlID8gQ1NTLlNlbGVjdEFjdGl2ZSA6IENTUy5TZWxlY3QpO1xufTtcblxuU2VsZWN0LnByb3RvdHlwZS5vblZhbHVlVXBkYXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoIXRoaXMuX2hhc1RhcmdldCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9zZWxlY3RlZCA9IHRoaXMuX29iamVjdFt0aGlzLl90YXJnZXRLZXldO1xuICAgIHRoaXMuX3NlbGVjdC5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0aGlzLl9zZWxlY3RlZC50b1N0cmluZygpKTtcbn07XG5cblNlbGVjdC5wcm90b3R5cGUuX2hhc1RhcmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGFyZ2V0S2V5ICE9IG51bGw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdDtcbiIsInZhciBPYmplY3RDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jb3JlL09iamVjdENvbXBvbmVudCcpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG52YXIgU2xpZGVyX0ludGVybmFsID0gcmVxdWlyZSgnLi9TbGlkZXJfSW50ZXJuYWwnKTtcblxudmFyIEhpc3RvcnkgPSByZXF1aXJlKCcuLi9jb3JlL0hpc3RvcnknKTtcbnZhciBSYW5nZSA9IHJlcXVpcmUoJy4vUmFuZ2UnKTtcbnZhciBOdW1iZXJJbnB1dF9JbnRlcm5hbCA9IHJlcXVpcmUoJy4vTnVtYmVySW5wdXRfSW50ZXJuYWwnKTtcblxudmFyIEV2ZW50XyA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnQnKSxcbiAgICBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Eb2N1bWVudEV2ZW50JyksXG4gICAgUGFuZWxFdmVudCA9IHJlcXVpcmUoJy4uL2dyb3VwL1BhbmVsRXZlbnQnKSxcbiAgICBHcm91cEV2ZW50ID0gcmVxdWlyZSgnLi4vZ3JvdXAvR3JvdXBFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gcmVxdWlyZSgnLi4vY29yZS9Db21wb25lbnRFdmVudCcpO1xuXG52YXIgREVGQVVMVF9TVEVQID0gMS4wLFxuICAgIERFRkFVTFRfRFAgICA9IDI7XG5cblxuZnVuY3Rpb24gU2xpZGVyKHBhcmVudCxvYmplY3QsdmFsdWUscmFuZ2UscGFyYW1zKSB7XG4gICAgcGFyYW1zICAgICAgICAgID0gcGFyYW1zICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5sYWJlbCAgICA9IHBhcmFtcy5sYWJlbCAgICB8fCB2YWx1ZTtcblxuICAgIE9iamVjdENvbXBvbmVudC5hcHBseSh0aGlzLFtwYXJlbnQsb2JqZWN0LHJhbmdlLHBhcmFtc10pO1xuXG4gICAgdGhpcy5fdmFsdWVzICA9IHRoaXMuX29iamVjdFt0aGlzLl9rZXldO1xuICAgIHRoaXMuX3RhcmdldEtleSA9IHZhbHVlO1xuXG4gICAgcGFyYW1zLnN0ZXAgICAgID0gcGFyYW1zLnN0ZXAgICAgIHx8IERFRkFVTFRfU1RFUDtcbiAgICBwYXJhbXMuZHAgICAgICAgPSBwYXJhbXMuZHAgICAgICAgfHwgREVGQVVMVF9EUDtcbiAgICBwYXJhbXMub25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2UgfHwgdGhpcy5fb25DaGFuZ2U7XG4gICAgcGFyYW1zLm9uRmluaXNoID0gcGFyYW1zLm9uRmluaXNoIHx8IGZ1bmN0aW9uKCl7fTtcblxuICAgIHRoaXMuX3N0ZXAgICAgID0gcGFyYW1zLnN0ZXA7XG4gICAgdGhpcy5fb25DaGFuZ2UgPSBwYXJhbXMub25DaGFuZ2U7XG4gICAgdGhpcy5fb25GaW5pc2ggPSBwYXJhbXMub25GaW5pc2g7XG4gICAgdGhpcy5fZHAgICAgICAgPSBwYXJhbXMuZHA7XG5cbiAgICB2YXIgdmFsdWVzICAgID0gdGhpcy5fdmFsdWVzLFxuICAgICAgICBvYmogICAgICAgPSB0aGlzLl9vYmplY3QsXG4gICAgICAgIHRhcmdldEtleSA9IHRoaXMuX3RhcmdldEtleTtcblxuICAgIHZhciB3cmFwTm9kZSAgPSB0aGlzLl93cmFwTm9kZTtcbiAgICAgICAgd3JhcE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcFNsaWRlcik7XG5cbiAgICB2YXIgc2xpZGVyID0gdGhpcy5fc2xpZGVyID0gbmV3IFNsaWRlcl9JbnRlcm5hbCh3cmFwTm9kZSwgdGhpcy5fb25TbGlkZXJCZWdpbi5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25TbGlkZXJNb3ZlLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vblNsaWRlckVuZC5iaW5kKHRoaXMpKTtcblxuICAgIHNsaWRlci5zZXRCb3VuZE1pbih2YWx1ZXNbMF0pO1xuICAgIHNsaWRlci5zZXRCb3VuZE1heCh2YWx1ZXNbMV0pO1xuICAgIHNsaWRlci5zZXRWYWx1ZShvYmpbdGFyZ2V0S2V5XSk7XG5cblxuICAgIHZhciBpbnB1dCAgPSB0aGlzLl9pbnB1dCA9IG5ldyBOdW1iZXJJbnB1dF9JbnRlcm5hbCh0aGlzLl9zdGVwLCB0aGlzLl9kcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25JbnB1dENoYW5nZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbklucHV0Q2hhbmdlLmJpbmQodGhpcykpO1xuXG4gICAgaW5wdXQuc2V0VmFsdWUob2JqW3RhcmdldEtleV0pO1xuXG4gICAgd3JhcE5vZGUuYWRkQ2hpbGQoaW5wdXQuZ2V0Tm9kZSgpKTtcblxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsICAgIHRoaXMsICdvblBhbmVsTW92ZUVuZCcpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIHRoaXMsICdvbkdyb3VwV2lkdGhDaGFuZ2UnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsICB0aGlzLCAnb25XaW5kb3dSZXNpemUnKTtcbn1cblxuU2xpZGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZSk7XG5cblNsaWRlci5wcm90b3R5cGUucHVzaEhpc3RvcnlTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqZWN0LFxuICAgICAgICBrZXkgPSB0aGlzLl90YXJnZXRLZXk7XG4gICAgSGlzdG9yeS5nZXQoKS5wdXNoU3RhdGUob2JqLCBrZXksIG9ialtrZXldKTtcbn07XG5cblNsaWRlci5wcm90b3R5cGUuX29uU2xpZGVyQmVnaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLl9vblNsaWRlck1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVGaWVsZCgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkNoYW5nZSgpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5fb25TbGlkZXJFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgdGhpcy5fdXBkYXRlVmFsdWVGaWVsZCgpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIENvbXBvbmVudEV2ZW50LlZBTFVFX1VQREFURUQsIG51bGwpKTtcbiAgICB0aGlzLl9vbkZpbmlzaCgpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5fb25JbnB1dENoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW5wdXQgPSB0aGlzLl9pbnB1dCxcbiAgICAgICAgdmFsdWVNaW4gPSB0aGlzLl92YWx1ZXNbMF0sXG4gICAgICAgIHZhbHVlTWF4ID0gdGhpcy5fdmFsdWVzWzFdO1xuXG4gICAgaWYgKGlucHV0LmdldFZhbHVlKCkgPj0gdmFsdWVNYXgpe1xuICAgICAgICBpbnB1dC5zZXRWYWx1ZSh2YWx1ZU1heCk7XG4gICAgfVxuICAgIGlmIChpbnB1dC5nZXRWYWx1ZSgpIDw9IHZhbHVlTWluKXtcbiAgICAgICAgaW5wdXQuc2V0VmFsdWUodmFsdWVNaW4pO1xuICAgIH1cblxuICAgIHZhciB2YWx1ZSA9IGlucHV0LmdldFZhbHVlKCk7XG5cbiAgICB0aGlzLl9zbGlkZXIuc2V0VmFsdWUodmFsdWUpO1xuICAgIHRoaXMuX29iamVjdFt0aGlzLl90YXJnZXRLZXldID0gdmFsdWU7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgbnVsbCkpO1xuICAgIHRoaXMuX29uRmluaXNoKCk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5fc2xpZGVyLmdldFZhbHVlKCk7XG4gICAgdGhpcy5fb2JqZWN0W3RoaXMuX3RhcmdldEtleV0gPSB2YWx1ZTtcbiAgICB0aGlzLl9pbnB1dC5zZXRWYWx1ZSh2YWx1ZSk7XG59O1xuXG4vL1RPRE86RklYIE1FXG5TbGlkZXIucHJvdG90eXBlLm9uVmFsdWVVcGRhdGUgPSBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBvcmlnaW4gPSBlLmRhdGEub3JpZ2luO1xuXG4gICAgaWYgKG9yaWdpbiA9PSB0aGlzKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzbGlkZXIgPSB0aGlzLl9zbGlkZXI7XG5cbiAgICBpZiAoIShvcmlnaW4gaW5zdGFuY2VvZiBTbGlkZXIpKSB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSB0aGlzLl92YWx1ZXM7XG5cbiAgICAgICAgLy9UT0RPOiBGSVggTUUhXG4gICAgICAgIGlmIChvcmlnaW4gaW5zdGFuY2VvZiBSYW5nZSkge1xuICAgICAgICAgICAgc2xpZGVyLnNldEJvdW5kTWluKHZhbHVlc1swXSk7XG4gICAgICAgICAgICBzbGlkZXIuc2V0Qm91bmRNYXgodmFsdWVzWzFdKTtcbiAgICAgICAgICAgIC8vc2xpZGVyLnNldFZhbHVlKHRoaXMuX29iamVjdFt0aGlzLl90YXJnZXRLZXldKTtcbiAgICAgICAgICAgIC8vdGhpcy5fc2xpZGVyLnVwZGF0ZUludGVycG9sYXRlZFZhbHVlKCk7XG4gICAgICAgICAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNsaWRlci5zZXRCb3VuZE1pbih2YWx1ZXNbMF0pO1xuICAgICAgICAgICAgc2xpZGVyLnNldEJvdW5kTWF4KHZhbHVlc1sxXSk7XG4gICAgICAgICAgICBzbGlkZXIuc2V0VmFsdWUodGhpcy5fb2JqZWN0W3RoaXMuX3RhcmdldEtleV0pO1xuICAgICAgICAgICAgdGhpcy5hcHBseVZhbHVlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHNsaWRlci5zZXRWYWx1ZSh0aGlzLl9vYmplY3RbdGhpcy5fdGFyZ2V0S2V5XSk7XG4gICAgICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIH1cbn07XG5cblxuU2xpZGVyLnByb3RvdHlwZS5fdXBkYXRlVmFsdWVGaWVsZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pbnB1dC5zZXRWYWx1ZSh0aGlzLl9zbGlkZXIuZ2V0VmFsdWUoKSk7XG59O1xuXG5TbGlkZXIucHJvdG90eXBlLm9uUGFuZWxNb3ZlRW5kID1cbiAgICBTbGlkZXIucHJvdG90eXBlLm9uR3JvdXBXaWR0aENoYW5nZSA9XG4gICAgICAgIFNsaWRlci5wcm90b3R5cGUub25XaW5kb3dSZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9zbGlkZXIucmVzZXRPZmZzZXQoKTtcbiAgICAgICAgfTtcblxubW9kdWxlLmV4cG9ydHMgPSBTbGlkZXI7IiwidmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTW91c2UnKTtcblxuZnVuY3Rpb24gU2xpZGVyX0ludGVybmFsKHBhcmVudE5vZGUsb25CZWdpbixvbkNoYW5nZSxvbkZpbmlzaCkge1xuICAgIHRoaXMuX2JvdW5kcyAgID0gWzAsMV07XG4gICAgdGhpcy5fdmFsdWUgICAgPSAwO1xuICAgIHRoaXMuX2ludGVycGwgID0gMDtcbiAgICB0aGlzLl9mb2N1cyAgICA9IGZhbHNlO1xuXG5cbiAgICB0aGlzLl9vbkJlZ2luICAgID0gb25CZWdpbiAgfHwgZnVuY3Rpb24oKXt9O1xuICAgIHRoaXMuX29uQ2hhbmdlICAgPSBvbkNoYW5nZSB8fCBmdW5jdGlvbigpe307XG4gICAgdGhpcy5fb25GaW5pc2ggICA9IG9uRmluaXNoIHx8IGZ1bmN0aW9uKCl7fTtcblxuXG4gICAgdmFyIHdyYXBOb2RlID0gbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJXcmFwKTtcbiAgICBwYXJlbnROb2RlLmFkZENoaWxkKHdyYXBOb2RlKTtcblxuICAgIHZhciBzbG90ICAgPSB0aGlzLl9zbG90ICAgPSB7bm9kZTogICAgbmV3IE5vZGUoKS5zZXRTdHlsZUNsYXNzKENTUy5TbGlkZXJTbG90KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldFg6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogM307XG5cbiAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlID0ge25vZGUgICAgOiBuZXcgTm9kZSgpLnNldFN0eWxlQ2xhc3MoQ1NTLlNsaWRlckhhbmRsZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aCAgIDogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdnaW5nOiBmYWxzZX07XG5cbiAgICB3cmFwTm9kZS5hZGRDaGlsZChzbG90Lm5vZGUpO1xuICAgIHNsb3Qubm9kZS5hZGRDaGlsZChoYW5kbGUubm9kZSk7XG5cbiAgICBzbG90Lm9mZnNldFggPSBzbG90Lm5vZGUuZ2V0UG9zaXRpb25HbG9iYWxYKCk7XG4gICAgc2xvdC53aWR0aCAgID0gTWF0aC5mbG9vcihzbG90Lm5vZGUuZ2V0V2lkdGgoKSAtIHNsb3QucGFkZGluZyAqIDIpIDtcblxuICAgIGhhbmRsZS5ub2RlLnNldFdpZHRoKGhhbmRsZS53aWR0aCk7XG5cbiAgICBzbG90Lm5vZGUuYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTix0aGlzLl9vblNsb3RNb3VzZURvd24uYmluZCh0aGlzKSk7XG4gICAgc2xvdC5ub2RlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX1VQLCAgdGhpcy5fb25TbG90TW91c2VVcC5iaW5kKHRoaXMpKTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoRG9jdW1lbnRFdmVudC5NT1VTRV9NT1ZFLHRoaXMuX29uRG9jdW1lbnRNb3VzZU1vdmUuYmluZCh0aGlzKSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX1VQLCAgdGhpcy5fb25Eb2N1bWVudE1vdXNlVXAuYmluZCh0aGlzKSk7XG59XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX29uRG9jdW1lbnRNb3VzZU1vdmUgPSBmdW5jdGlvbigpe1xuICAgIGlmKCF0aGlzLl9oYW5kbGUuZHJhZ2dpbmcpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX3VwZGF0ZSgpO1xuICAgIHRoaXMuX29uQ2hhbmdlKCk7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl9vbkRvY3VtZW50TW91c2VVcCA9IGZ1bmN0aW9uKCl7XG4gICAgaWYodGhpcy5faGFuZGxlLmRyYWdnaW5nKXtcbiAgICAgICAgdGhpcy5fb25GaW5pc2goKTtcbiAgICB9XG4gICAgdGhpcy5faGFuZGxlLmRyYWdnaW5nID0gZmFsc2U7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl9vblNsb3RNb3VzZURvd24gPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX29uQmVnaW4oKTtcbiAgICB0aGlzLl9mb2N1cyA9IHRydWU7XG4gICAgdGhpcy5faGFuZGxlLmRyYWdnaW5nID0gdHJ1ZTtcbiAgICB0aGlzLl9oYW5kbGUubm9kZS5nZXRFbGVtZW50KCkuZm9jdXMoKTtcbiAgICB0aGlzLl91cGRhdGUoKTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX29uU2xvdE1vdXNlVXAgPSBmdW5jdGlvbigpe1xuICAgIGlmICh0aGlzLl9mb2N1cykge1xuICAgICAgICB2YXIgaGFuZGxlID0gdGhpcy5faGFuZGxlO1xuICAgICAgICBpZiAoaGFuZGxlLmRyYWdnaW5nKXtcbiAgICAgICAgICAgIHRoaXMuX29uRmluaXNoKCk7XG4gICAgICAgIH1cbiAgICAgICAgaGFuZGxlLmRyYWdnaW5nID0gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuX2ZvY3VzID0gZmFsc2U7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBteCA9IE1vdXNlLmdldCgpLmdldFgoKSxcbiAgICAgICAgc3ggPSB0aGlzLl9zbG90Lm9mZnNldFgsXG4gICAgICAgIHN3ID0gdGhpcy5fc2xvdC53aWR0aCxcbiAgICAgICAgcHggPSAobXggPCBzeCkgPyAwIDogKG14ID4gKHN4ICsgc3cpKSA/IHN3IDogKG14IC0gc3gpO1xuXG4gICAgdGhpcy5faGFuZGxlLm5vZGUuc2V0V2lkdGgoTWF0aC5yb3VuZChweCkpO1xuICAgIHRoaXMuX2ludHJwbCA9IHB4IC8gc3c7XG4gICAgdGhpcy5faW50ZXJwb2xhdGVWYWx1ZSgpO1xufTtcblxuLy9GSVggTUVcblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX3VwZGF0ZUhhbmRsZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNsb3RXaWR0aCAgID0gdGhpcy5fc2xvdC53aWR0aCxcbiAgICAgICAgaGFuZGxlV2lkdGggPSBNYXRoLnJvdW5kKHRoaXMuX2ludHJwbCAqIHNsb3RXaWR0aCk7XG5cbiAgICB0aGlzLl9oYW5kbGUubm9kZS5zZXRXaWR0aChNYXRoLm1pbihoYW5kbGVXaWR0aCxzbG90V2lkdGgpKTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuX2ludGVycG9sYXRlVmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGludHJwbCA9IHRoaXMuX2ludHJwbDtcbiAgICB0aGlzLl92YWx1ZSA9IHRoaXMuX2JvdW5kc1swXSAqICgxLjAgLSBpbnRycGwpICsgdGhpcy5fYm91bmRzWzFdICogaW50cnBsO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5yZXNldE9mZnNldCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2xvdCA9IHRoaXMuX3Nsb3Q7XG4gICAgc2xvdC5vZmZzZXRYID0gc2xvdC5ub2RlLmdldFBvc2l0aW9uR2xvYmFsWCgpO1xuICAgIHNsb3Qud2lkdGggPSBNYXRoLmZsb29yKHNsb3Qubm9kZS5nZXRXaWR0aCgpIC0gc2xvdC5wYWRkaW5nICogMilcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuc2V0Qm91bmRNaW4gPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgYm91bmRzID0gdGhpcy5fYm91bmRzO1xuICAgIGlmICh2YWx1ZSA+PSBib3VuZHNbMV0pe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYm91bmRzWzBdID0gdmFsdWU7XG4gICAgdGhpcy5faW50ZXJwb2xhdGVWYWx1ZVJlbGF0aXZlKCk7XG4gICAgdGhpcy5fdXBkYXRlSGFuZGxlKCk7XG59O1xuXG5TbGlkZXJfSW50ZXJuYWwucHJvdG90eXBlLnNldEJvdW5kTWF4ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIGJvdW5kcyA9IHRoaXMuX2JvdW5kcztcbiAgICBpZiAodmFsdWUgPD0gYm91bmRzWzBdKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGJvdW5kc1sxXSA9IHZhbHVlO1xuICAgIHRoaXMuX2ludGVycG9sYXRlVmFsdWVSZWxhdGl2ZSgpO1xuICAgIHRoaXMuX3VwZGF0ZUhhbmRsZSgpO1xufTtcblxuU2xpZGVyX0ludGVybmFsLnByb3RvdHlwZS5faW50ZXJwb2xhdGVWYWx1ZVJlbGF0aXZlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBib3VuZHNNaW4gPSB0aGlzLl9ib3VuZHNbMF0sXG4gICAgICAgIGJvdW5kc01heCA9IHRoaXMuX2JvdW5kc1sxXSxcbiAgICAgICAgcHJldkludHJwbCA9IE1hdGguYWJzKCh0aGlzLl92YWx1ZSAtIGJvdW5kc01pbikgLyAoYm91bmRzTWluIC0gYm91bmRzTWF4KSk7XG5cbiAgICB0aGlzLl92YWx1ZSA9IGJvdW5kc01pbiAqICgxLjAgLSBwcmV2SW50cnBsKSArIGJvdW5kc01heCAqIHByZXZJbnRycGw7XG4gICAgdGhpcy5faW50cnBsID0gTWF0aC5hYnMoKHRoaXMuX3ZhbHVlIC0gYm91bmRzTWluKSAvIChib3VuZHNNaW4gLSBib3VuZHNNYXgpKTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgYm91bmRzTWluID0gdGhpcy5fYm91bmRzWzBdLFxuICAgICAgICBib3VuZHNNYXggPSB0aGlzLl9ib3VuZHNbMV07XG5cbiAgICBpZiAodmFsdWUgPCBib3VuZHNNaW4gfHwgdmFsdWUgPiBib3VuZHNNYXgpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2ludHJwbCA9IE1hdGguYWJzKCh2YWx1ZSAtIGJvdW5kc01pbikgLyAoYm91bmRzTWluIC0gYm91bmRzTWF4KSk7XG4gICAgdGhpcy5fdXBkYXRlSGFuZGxlKCk7XG4gICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbn07XG5cblNsaWRlcl9JbnRlcm5hbC5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFNsaWRlcl9JbnRlcm5hbDsiLCJ2YXIgT2JqZWN0Q29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY29yZS9PYmplY3RDb21wb25lbnQnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBPcHRpb25zID0gcmVxdWlyZSgnLi9PcHRpb25zJyk7XG52YXIgUHJlc2V0QnRuID0gcmVxdWlyZSgnLi9QcmVzZXRCdG4nKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpYycpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIENvbXBvbmVudEV2ZW50ID0gIHJlcXVpcmUoJy4uL2NvcmUvQ29tcG9uZW50RXZlbnQnKTtcblxudmFyIERFRkFVTFRfUFJFU0VUID0gbnVsbDtcblxuZnVuY3Rpb24gU3RyaW5nSW5wdXQocGFyZW50LG9iamVjdCx2YWx1ZSxwYXJhbXMpIHtcbiAgICBPYmplY3RDb21wb25lbnQuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgcGFyYW1zICAgICAgICAgID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5vbkNoYW5nZSA9IHBhcmFtcy5vbkNoYW5nZSB8fCB0aGlzLl9vbkNoYW5nZTtcbiAgICBwYXJhbXMucHJlc2V0cyAgPSBwYXJhbXMucHJlc2V0cyAgfHwgREVGQVVMVF9QUkVTRVQ7XG5cbiAgICB0aGlzLl9vbkNoYW5nZSAgID0gcGFyYW1zLm9uQ2hhbmdlO1xuXG4gICAgdmFyIGlucHV0ID0gdGhpcy5faW5wdXQgPSBuZXcgTm9kZShOb2RlLklOUFVUX1RFWFQpO1xuXG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICB2YXIgcHJlc2V0cyA9IHBhcmFtcy5wcmVzZXRzO1xuICAgIGlmICghcHJlc2V0cykge1xuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChpbnB1dCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgaW5wdXRXcmFwID0gbmV3IE5vZGUoKTtcbiAgICAgICAgaW5wdXRXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXBJbnB1dFdQcmVzZXQpO1xuXG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGlucHV0V3JhcCk7XG4gICAgICAgIGlucHV0V3JhcC5hZGRDaGlsZChpbnB1dCk7XG5cbiAgICAgICAgdmFyIG9wdGlvbnMgPSBPcHRpb25zLmdldCgpLFxuICAgICAgICAgICAgcHJlc2V0QnRuID0gbmV3IFByZXNldEJ0bih0aGlzLl93cmFwTm9kZSk7XG5cbiAgICAgICAgdmFyIG9uUHJlc2V0RGVhY3RpdmF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXIoKTtcbiAgICAgICAgICAgIHByZXNldEJ0bi5kZWFjdGl2YXRlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgb25QcmVzZXRBY3RpdmF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuYnVpbGQocHJlc2V0cyxcbiAgICAgICAgICAgICAgICBpbnB1dC5nZXRQcm9wZXJ0eSgndmFsdWUnKSxcbiAgICAgICAgICAgICAgICBpbnB1dCxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0LnNldFByb3BlcnR5KCd2YWx1ZScsIHByZXNldHNbb3B0aW9ucy5nZXRTZWxlY3RlZEluZGV4KCldKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuYXBwbHlWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25QcmVzZXREZWFjdGl2YXRlLFxuICAgICAgICAgICAgICAgIE1ldHJpYy5QQURESU5HX1BSRVNFVCxcbiAgICAgICAgICAgICAgICBmYWxzZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcHJlc2V0QnRuLnNldE9uQWN0aXZlKG9uUHJlc2V0QWN0aXZhdGUpO1xuICAgICAgICBwcmVzZXRCdG4uc2V0T25EZWFjdGl2ZShvblByZXNldERlYWN0aXZhdGUpXG4gICAgfVxuXG4gICAgaW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJyx0aGlzLl9vYmplY3RbdGhpcy5fa2V5XSk7XG5cbiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5LRVlfVVAsIHRoaXMuX29uSW5wdXRLZXlVcC5iaW5kKHRoaXMpKTtcbiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5DSEFOR0UsIHRoaXMuX29uSW5wdXRDaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbklucHV0RHJhZ1N0YXJ0LmJpbmQodGhpcykpO1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5JTlBVVF9TRUxFQ1RfRFJBRyx0aGlzLl9wYXJlbnQsJ29uQ29tcG9uZW50U2VsZWN0RHJhZycpO1xufVxuXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE9iamVjdENvbXBvbmVudC5wcm90b3R5cGUpO1xuXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUuX29uSW5wdXRLZXlVcCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKHRoaXMuX2tleUlzQ2hhcihlLmtleUNvZGUpKXtcbiAgICAgICAgdGhpcy5wdXNoSGlzdG9yeVN0YXRlKCk7XG4gICAgfVxuICAgIHRoaXMuYXBwbHlWYWx1ZSgpO1xuICAgIHRoaXMuX29uQ2hhbmdlKCk7XG59O1xuXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUuX29uSW5wdXRDaGFuZ2UgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmICh0aGlzLl9rZXlJc0NoYXIoZS5rZXlDb2RlKSl7XG4gICAgICAgIHRoaXMucHVzaEhpc3RvcnlTdGF0ZSgpO1xuICAgIH1cbiAgICB0aGlzLmFwcGx5VmFsdWUoKTtcbn07XG5cbi8vVE9ETzogRmluaXNoIGNoZWNrXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUuX2tleUlzQ2hhciA9IGZ1bmN0aW9uIChrZXlDb2RlKSB7XG4gICAgcmV0dXJuIGtleUNvZGUgIT0gMTcgJiZcbiAgICAgICAga2V5Q29kZSAhPSAxOCAmJlxuICAgICAgICBrZXlDb2RlICE9IDIwICYmXG4gICAgICAgIGtleUNvZGUgIT0gMzcgJiZcbiAgICAgICAga2V5Q29kZSAhPSAzOCAmJlxuICAgICAgICBrZXlDb2RlICE9IDM5ICYmXG4gICAgICAgIGtleUNvZGUgIT0gNDAgJiZcbiAgICAgICAga2V5Q29kZSAhPSAxNjtcbn07XG5cblxuU3RyaW5nSW5wdXQucHJvdG90eXBlLmFwcGx5VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fb2JqZWN0W3RoaXMuX2tleV0gPSB0aGlzLl9pbnB1dC5nZXRQcm9wZXJ0eSgndmFsdWUnKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5WQUxVRV9VUERBVEVELCBudWxsKSk7XG59O1xuXG5TdHJpbmdJbnB1dC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuZGF0YS5vcmlnaW4gPT0gdGhpcylyZXR1cm47XG4gICAgdGhpcy5faW5wdXQuc2V0UHJvcGVydHkoJ3ZhbHVlJywgdGhpcy5fb2JqZWN0W3RoaXMuX2tleV0pO1xufTtcblxuLy9QcmV2ZW50IGNocm9tZSBzZWxlY3QgZHJhZ1xuU3RyaW5nSW5wdXQucHJvdG90eXBlLl9vbklucHV0RHJhZ1N0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBldmVudE1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgIGV2ZW50VXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIGV2ZW50ID0gQ29tcG9uZW50RXZlbnQuSU5QVVRfU0VMRUNUX0RSQUc7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBvbkRyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBldmVudCwgbnVsbCkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uRHJhZ0ZpbmlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XG5cbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRNb3ZlLCBvbkRyYWdGaW5pc2gsIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIGV2ZW50LCBudWxsKSk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFVwLCBvbkRyYWdGaW5pc2gsIGZhbHNlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RyaW5nSW5wdXQ7IiwidmFyIE91dHB1dCA9IHJlcXVpcmUoJy4vT3V0cHV0Jyk7XG5cblN0cmluZ091dHB1dCA9IGZ1bmN0aW9uIChwYXJlbnQsIG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIE91dHB1dC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuU3RyaW5nT3V0cHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT3V0cHV0LnByb3RvdHlwZSk7XG5cblN0cmluZ091dHB1dC5wcm90b3R5cGUuX3NldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9wYXJlbnQuaXNEaXNhYmxlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRleHRBcmVhU3RyaW5nID0gdGhpcy5fb2JqZWN0W3RoaXMuX2tleV07XG5cbiAgICBpZiAodGV4dEFyZWFTdHJpbmcgPT0gdGhpcy5fcHJldlN0cmluZyl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRleHRBcmVhID0gdGhpcy5fdGV4dEFyZWEsXG4gICAgICAgIHRleHRBcmVhRWxlbWVudCA9IHRleHRBcmVhLmdldEVsZW1lbnQoKSxcbiAgICAgICAgdGV4dEFyZWFTY3JvbGxIZWlnaHQ7XG5cbiAgICB0ZXh0QXJlYS5zZXRQcm9wZXJ0eSgndmFsdWUnLCB0ZXh0QXJlYVN0cmluZyk7XG4gICAgdGV4dEFyZWFTY3JvbGxIZWlnaHQgPSB0ZXh0QXJlYUVsZW1lbnQuc2Nyb2xsSGVpZ2h0O1xuICAgIHRleHRBcmVhLnNldEhlaWdodCh0ZXh0QXJlYVNjcm9sbEhlaWdodCk7XG5cbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyO1xuXG4gICAgaWYgKHNjcm9sbEJhcikge1xuICAgICAgICBpZiAodGV4dEFyZWFTY3JvbGxIZWlnaHQgPD0gdGhpcy5fd3JhcE5vZGUuZ2V0SGVpZ2h0KCkpIHtcbiAgICAgICAgICAgIHNjcm9sbEJhci5kaXNhYmxlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzY3JvbGxCYXIuZW5hYmxlKCk7XG4gICAgICAgICAgICBzY3JvbGxCYXIudXBkYXRlKCk7XG4gICAgICAgICAgICBzY3JvbGxCYXIucmVzZXQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9wcmV2U3RyaW5nID0gdGV4dEFyZWFTdHJpbmc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmluZ091dHB1dDtcbiIsInZhciBQbG90dGVyID0gcmVxdWlyZSgnLi9QbG90dGVyJyk7XG52YXIgTWV0cmljID0gcmVxdWlyZSgnLi4vY29yZS9NZXRyaWMnKTtcblxudmFyIERFRkFVTFRfUkVTT0xVVElPTiA9IDE7XG5cbmZ1bmN0aW9uIFZhbHVlUGxvdHRlcihwYXJlbnQsb2JqZWN0LHZhbHVlLHBhcmFtcykge1xuICAgIFBsb3R0ZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgdmFyIHN2ZyAgICAgICA9IHRoaXMuX3N2ZyxcbiAgICAgICAgc3ZnV2lkdGggID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICBzdmdIZWlnaHQgPSBOdW1iZXIoc3ZnLmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykpO1xuXG4gICAgcGFyYW1zICAgICAgICAgICAgPSBwYXJhbXMgICAgICAgICAgICB8fCB7fTtcbiAgICBwYXJhbXMuaGVpZ2h0ICAgICA9IHBhcmFtcy5oZWlnaHQgICAgIHx8IHN2Z0hlaWdodDtcbiAgICBwYXJhbXMucmVzb2x1dGlvbiA9IHBhcmFtcy5yZXNvbHV0aW9uIHx8IERFRkFVTFRfUkVTT0xVVElPTjtcblxuICAgIHZhciByZXNvbHV0aW9uID0gcGFyYW1zLnJlc29sdXRpb24sXG4gICAgICAgIGxlbmd0aCAgICAgPSBNYXRoLmZsb29yKHN2Z1dpZHRoIC8gcmVzb2x1dGlvbik7XG5cbiAgICB2YXIgcG9pbnRzICAgICA9IHRoaXMuX3BvaW50cyAgPSBuZXcgQXJyYXkobGVuZ3RoICogMiksXG4gICAgICAgIGJ1ZmZlcjAgICAgPSB0aGlzLl9idWZmZXIwID0gbmV3IEFycmF5KGxlbmd0aCksXG4gICAgICAgIGJ1ZmZlcjEgICAgPSB0aGlzLl9idWZmZXIxID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cbiAgICB2YXIgbWluID0gdGhpcy5fbGluZVdpZHRoICogMC41O1xuXG4gICAgdmFyIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgbGVuZ3RoKSB7XG4gICAgICAgIGJ1ZmZlcjBbaV0gPSBidWZmZXIxW2ldID0gcG9pbnRzW2kgKiAyXSA9IHBvaW50c1tpICogMiArIDFdID0gbWluO1xuICAgIH1cblxuICAgIHRoaXMuX2hlaWdodCA9IHBhcmFtcy5oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0ICA8IE1ldHJpYy5DT01QT05FTlRfTUlOX0hFSUdIVCA/XG4gICAgICAgICAgICAgICAgICAgTWV0cmljLkNPTVBPTkVOVF9NSU5fSEVJR0hUIDogcGFyYW1zLmhlaWdodDtcblxuICAgIHRoaXMuX3N2Z1NldFNpemUoc3ZnSGVpZ2h0LE1hdGguZmxvb3IocGFyYW1zLmhlaWdodCkpO1xuICAgIHRoaXMuX2dyaWQuc3R5bGUuc3Ryb2tlID0gJ3JnYigzOSw0NCw0NiknO1xuXG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG4gICAgdGhpcy5fZHJhd1ZhbHVlKCk7XG59XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBsb3R0ZXIucHJvdG90eXBlKTtcblxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fcmVkcmF3ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwb2ludHMgPSB0aGlzLl9wb2ludHMsXG4gICAgICAgIGJ1ZmZlckxlbiA9IHRoaXMuX2J1ZmZlcjAubGVuZ3RoO1xuXG4gICAgdmFyIHdpZHRoID0gTnVtYmVyKHRoaXMuX3N2Zy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykpLFxuICAgICAgICByYXRpbyA9IHdpZHRoIC8gKGJ1ZmZlckxlbiAtIDEpO1xuXG4gICAgdmFyIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgYnVmZmVyTGVuKSB7XG4gICAgICAgIHBvaW50c1tpICogMl0gPSB3aWR0aCAtIGkgKiByYXRpbztcbiAgICB9XG5cbiAgICB0aGlzLl9kcmF3VmFsdWUoKTtcbn07XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUub25Hcm91cFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy5fd3JhcE5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgaGVpZ2h0ID0gdGhpcy5faGVpZ2h0O1xuXG4gICAgdGhpcy5fc3ZnU2V0U2l6ZSh3aWR0aCwgaGVpZ2h0KTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcbiAgICB0aGlzLl9kcmF3R3JpZCgpO1xuICAgIHRoaXMuX3JlZHJhdygpO1xufTtcblxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fZHJhd1ZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2RyYXdDdXJ2ZSgpO1xufTtcblxuVmFsdWVQbG90dGVyLnByb3RvdHlwZS5fZHJhd0dyaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZztcblxuICAgIHZhciBzdmdXaWR0aCA9IE51bWJlcihzdmcuZ2V0QXR0cmlidXRlKCd3aWR0aCcpKSxcbiAgICAgICAgc3ZnSGVpZ2h0SGFsZiA9IE1hdGguZmxvb3IoTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKSAqIDAuNSk7XG5cbiAgICB2YXIgcGF0aENtZCA9ICcnO1xuICAgICAgICBwYXRoQ21kICs9IHRoaXMuX3BhdGhDbWRNb3ZlVG8oMCwgc3ZnSGVpZ2h0SGFsZik7XG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmVUbyhzdmdXaWR0aCwgc3ZnSGVpZ2h0SGFsZik7XG5cbiAgICB0aGlzLl9ncmlkLnNldEF0dHJpYnV0ZSgnZCcsIHBhdGhDbWQpO1xufTtcblxuLy9UT0RPOiBtZXJnZSB1cGRhdGUgKyBwYXRoY21kXG5WYWx1ZVBsb3R0ZXIucHJvdG90eXBlLl9kcmF3Q3VydmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN2ZyA9IHRoaXMuX3N2ZztcblxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX29iamVjdFt0aGlzLl9rZXldO1xuXG4gICAgdmFyIGJ1ZmZlcjAgPSB0aGlzLl9idWZmZXIwLFxuICAgICAgICBidWZmZXIxID0gdGhpcy5fYnVmZmVyMSxcbiAgICAgICAgcG9pbnRzID0gdGhpcy5fcG9pbnRzO1xuXG4gICAgdmFyIGJ1ZmZlckxlbmd0aCA9IGJ1ZmZlcjAubGVuZ3RoO1xuXG4gICAgdmFyIHBhdGhDbWQgPSAnJztcblxuICAgIHZhciBoZWlnaHRIYWxmID0gTnVtYmVyKHN2Zy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpKSAqIDAuNSxcbiAgICAgICAgdW5pdCA9IGhlaWdodEhhbGYgLSB0aGlzLl9saW5lV2lkdGggKiAwLjU7XG5cbiAgICBwb2ludHNbMV0gPSBidWZmZXIwWzBdO1xuICAgIGJ1ZmZlcjBbYnVmZmVyTGVuZ3RoIC0gMV0gPSAodmFsdWUgKiB1bml0KSAqIC0xICsgTWF0aC5mbG9vcihoZWlnaHRIYWxmKTtcblxuICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZE1vdmVUbyhwb2ludHNbMF0sIHBvaW50c1sxXSk7XG5cbiAgICB2YXIgaSA9IDAsIGluZGV4O1xuXG4gICAgd2hpbGUgKCsraSA8IGJ1ZmZlckxlbmd0aCkge1xuICAgICAgICBpbmRleCA9IGkgKiAyO1xuXG4gICAgICAgIGJ1ZmZlcjFbaSAtIDFdID0gYnVmZmVyMFtpXTtcbiAgICAgICAgcG9pbnRzW2luZGV4ICsgMV0gPSBidWZmZXIwW2kgLSAxXSA9IGJ1ZmZlcjFbaSAtIDFdO1xuXG4gICAgICAgIHBhdGhDbWQgKz0gdGhpcy5fcGF0aENtZExpbmVUbyhwb2ludHNbaW5kZXhdLCBwb2ludHNbaW5kZXggKyAxXSk7XG4gICAgfVxuXG4gICAgdGhpcy5fcGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBwYXRoQ21kKTtcbn07XG5cblZhbHVlUGxvdHRlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9wYXJlbnQuaXNEaXNhYmxlZCgpKXJldHVybjtcbiAgICB0aGlzLl9kcmF3VmFsdWUoKTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbHVlUGxvdHRlcjtcblxuIiwidmFyIE5vZGUgPSByZXF1aXJlKCcuL2RvY3VtZW50L05vZGUnKSxcbiAgICBDU1MgPSByZXF1aXJlKCcuL2RvY3VtZW50L0NTUycpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuL0NvbXBvbmVudEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIENvbXBvbmVudChwYXJlbnQsbGFiZWwpIHtcbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG4gICAgbGFiZWwgPSBwYXJlbnQudXNlc0xhYmVscygpID8gbGFiZWwgOiAnbm9uZSc7XG5cbiAgICB0aGlzLl9wYXJlbnQgICA9IHBhcmVudDtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gZmFsc2U7XG5cbiAgICB2YXIgcm9vdE5vZGUgPSB0aGlzLl9ub2RlID0gbmV3IE5vZGUoTm9kZS5MSVNUX0lURU0pLFxuICAgICAgICB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlID0gbmV3IE5vZGUoKTtcbiAgICAgICAgd3JhcE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuV3JhcCk7XG4gICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKHdyYXBOb2RlKTtcblxuICAgIGlmIChsYWJlbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChsYWJlbC5sZW5ndGggIT0gMCAmJiBsYWJlbCAhPSAnbm9uZScpIHtcbiAgICAgICAgICAgIHZhciBsYWJsTm9kZSA9IHRoaXMuX2xhYmxOb2RlID0gbmV3IE5vZGUoTm9kZS5TUEFOKTtcbiAgICAgICAgICAgICAgICBsYWJsTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XG4gICAgICAgICAgICAgICAgbGFibE5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGxhYmVsKTtcbiAgICAgICAgICAgICAgICByb290Tm9kZS5hZGRDaGlsZChsYWJsTm9kZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGFiZWwgPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZVByb3BlcnR5KCdtYXJnaW5MZWZ0JywgJzAnKTtcbiAgICAgICAgICAgIHdyYXBOb2RlLnNldFN0eWxlUHJvcGVydHkoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKENvbXBvbmVudEV2ZW50LkVOQUJMRSwgdGhpcywnb25FbmFibGUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5ESVNBQkxFLHRoaXMsJ29uRGlzYWJsZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRDb21wb25lbnROb2RlKHJvb3ROb2RlKTtcbn1cblxuQ29tcG9uZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5cbkNvbXBvbmVudC5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSBmYWxzZTtcbn07XG5cbkNvbXBvbmVudC5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pc0Rpc2FibGVkID0gdHJ1ZTtcbn07XG5cbkNvbXBvbmVudC5wcm90b3R5cGUuaXNFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhdGhpcy5faXNEaXNhYmxlZDtcbn07XG5Db21wb25lbnQucHJvdG90eXBlLmlzRGlzYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzRGlzYWJsZWRcbn07XG5cbkNvbXBvbmVudC5wcm90b3R5cGUub25FbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbmFibGUoKTtcbn07XG5cbkNvbXBvbmVudC5wcm90b3R5cGUub25EaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzYWJsZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIENvbXBvbmVudEV2ZW50ID0ge1xuXHRWQUxVRV9VUERBVEVEOiAndmFsdWVVcGRhdGVkJyxcblx0VVBEQVRFX1ZBTFVFOiAndXBkYXRlVmFsdWUnLFxuXG5cdElOUFVUX1NFTEVDVF9EUkFHOiAnaW5wdXRTZWxlY3REcmFnJyxcblxuXHRFTkFCTEUgIDogJ2VuYWJsZScsXG5cdERJU0FCTEUgOiAnZGlzYWJsZSdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50RXZlbnQ7IiwiZnVuY3Rpb24gQ29tcG9uZW50T2JqZWN0RXJyb3Iob2JqZWN0LGtleSkge1xuXHRFcnJvci5hcHBseSh0aGlzKTtcblx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcyxDb21wb25lbnRPYmplY3RFcnJvcik7XG5cdHRoaXMubmFtZSA9ICdDb21wb25lbnRPYmplY3RFcnJvcic7XG5cdHRoaXMubWVzc2FnZSA9ICdPYmplY3Qgb2YgdHlwZSAnICsgb2JqZWN0LmNvbnN0cnVjdG9yLm5hbWUgKyAnIGhhcyBubyBtZW1iZXIgJyArIGtleSArICcuJztcbn1cbkNvbXBvbmVudE9iamVjdEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkNvbXBvbmVudE9iamVjdEVycm9yLmNvbnN0cnVjdG9yID0gQ29tcG9uZW50T2JqZWN0RXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50T2JqZWN0RXJyb3I7IiwidmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG4gICAgRXZlbnRfID0gcmVxdWlyZSgnLi9ldmVudC9FdmVudCcpLFxuICAgIEhpc3RvcnlFdmVudCA9IHJlcXVpcmUoJy4vSGlzdG9yeUV2ZW50Jyk7XG5cbnZhciBNQVhfU1RBVEVTID0gMzA7XG5cbmZ1bmN0aW9uIEhpc3RvcnkoKSB7XG4gICAgRXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdGhpcy5fc3RhdGVzID0gW107XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xufVxuXG5IaXN0b3J5LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZSk7XG5cbkhpc3RvcnkucHJvdG90eXBlLnB1c2hTdGF0ZSA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSwgdmFsdWUpIHtcbiAgICBpZiAodGhpcy5faXNEaXNhYmxlZCl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgIGlmIChzdGF0ZXMubGVuZ3RoID49IE1BWF9TVEFURVMpe1xuICAgICAgICBzdGF0ZXMuc2hpZnQoKTtcbiAgICB9XG4gICAgc3RhdGVzLnB1c2goe29iamVjdDogb2JqZWN0LCBrZXk6IGtleSwgdmFsdWU6IHZhbHVlfSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgSGlzdG9yeUV2ZW50LlNUQVRFX1BVU0gsIG51bGwpKTtcbn07XG5cbkhpc3RvcnkucHJvdG90eXBlLmdldFN0YXRlID0gZnVuY3Rpb24gKG9iamVjdCwga2V5KSB7XG4gICAgdmFyIHN0YXRlcyA9IHRoaXMuX3N0YXRlcyxcbiAgICAgICAgc3RhdGVzTGVuID0gc3RhdGVzLmxlbmd0aDtcblxuICAgIGlmIChzdGF0ZXNMZW4gPT0gMCl7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHZhciBzdGF0ZSwgdmFsdWU7XG4gICAgdmFyIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgc3RhdGVzTGVuKSB7XG4gICAgICAgIHN0YXRlID0gc3RhdGVzW2ldO1xuICAgICAgICBpZiAoc3RhdGUub2JqZWN0ID09PSBvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5rZXkgPT09IGtleSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gc3RhdGUudmFsdWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuSGlzdG9yeS5wcm90b3R5cGUucG9wU3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX2lzRGlzYWJsZWQpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICBpZiAoc3RhdGVzLmxlbmd0aCA8IDEpe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGxhc3RTdGF0ZSA9IHN0YXRlcy5wb3AoKTtcbiAgICBsYXN0U3RhdGUub2JqZWN0W2xhc3RTdGF0ZS5rZXldID0gbGFzdFN0YXRlLnZhbHVlO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgSGlzdG9yeUV2ZW50LlNUQVRFX1BPUCwgbnVsbCkpO1xufTtcblxuSGlzdG9yeS5wcm90b3R5cGUuZ2V0TnVtU3RhdGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZXMubGVuZ3RoO1xufTtcblxuSGlzdG9yeS5faW5zdGFuY2UgPSBudWxsO1xuXG5IaXN0b3J5LnNldHVwID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBIaXN0b3J5Ll9pbnN0YW5jZSA9IG5ldyBIaXN0b3J5KCk7XG59O1xuXG5IaXN0b3J5LmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gSGlzdG9yeS5faW5zdGFuY2U7XG59O1xuXG5IaXN0b3J5LnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xufTtcbkhpc3RvcnkucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IHRydWU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEhpc3Rvcnk7IiwidmFyIEhpc3RvcnlFdmVudCA9IHtcblx0U1RBVEVfUFVTSDogJ2hpc3RvcnlTdGF0ZVB1c2gnLFxuXHRTVEFURV9QT1A6ICdoaXN0b3J5U3RhdGVQb3AnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEhpc3RvcnlFdmVudDsiLCJ2YXIgTWV0cmljID0ge1xuXHRDT01QT05FTlRfTUlOX0hFSUdIVDogMjUsXG5cdFNUUk9LRV9TSVpFOiAxLFxuXHRQQURESU5HX1dSQVBQRVI6IDEyLFxuXHRQQURESU5HX09QVElPTlM6IDIsXG5cdFBBRERJTkdfUFJFU0VUOiAyMCxcblxuXHRTQ1JPTExCQVJfVFJBQ0tfUEFERElORzogMixcblx0RlVOQ1RJT05fUExPVFRFUl9MQUJFTF9USUNLX1NJWkU6IDZcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWV0cmljOyIsInZhciBDb21wb25lbnQgPSByZXF1aXJlKCcuL0NvbXBvbmVudCcpO1xudmFyIEhpc3RvcnkgPSByZXF1aXJlKCcuL0hpc3RvcnknKTtcbnZhciBDb21wb25lbnRFdmVudCA9IHJlcXVpcmUoJy4vQ29tcG9uZW50RXZlbnQnKTtcbnZhciBPYmplY3RDb21wb25lbnROb3RpZmllciA9IHJlcXVpcmUoJy4vT2JqZWN0Q29tcG9uZW50Tm90aWZpZXInKTtcbnZhciBDb21wb25lbnRPYmplY3RFcnJvciA9IHJlcXVpcmUoJy4vQ29tcG9uZW50T2JqZWN0RXJyb3InKTtcblxuXG5mdW5jdGlvbiBPYmplY3RDb21wb25lbnQocGFyZW50LG9iamVjdCxrZXkscGFyYW1zKSB7XG4gICAgaWYob2JqZWN0W2tleV0gPT09IHVuZGVmaW5lZCl7XG4gICAgICAgIHRocm93IG5ldyBDb21wb25lbnRPYmplY3RFcnJvcihvYmplY3Qsa2V5KTtcbiAgICB9XG5cbiAgICBwYXJhbXMgICAgICAgPSBwYXJhbXMgfHwge307XG4gICAgcGFyYW1zLmxhYmVsID0gcGFyYW1zLmxhYmVsIHx8IGtleTtcblxuICAgIENvbXBvbmVudC5hcHBseSh0aGlzLFtwYXJlbnQscGFyYW1zLmxhYmVsXSk7XG5cbiAgICB0aGlzLl9vYmplY3QgICA9IG9iamVjdDtcbiAgICB0aGlzLl9rZXkgICAgICA9IGtleTtcblxuICAgIHRoaXMuX29uQ2hhbmdlID0gZnVuY3Rpb24oKXt9O1xuXG4gICAgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCkuYWRkRXZlbnRMaXN0ZW5lcihDb21wb25lbnRFdmVudC5VUERBVEVfVkFMVUUsIHRoaXMsJ29uVmFsdWVVcGRhdGUnKTtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoQ29tcG9uZW50RXZlbnQuVkFMVUVfVVBEQVRFRCwgT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZ2V0KCksICdvblZhbHVlVXBkYXRlZCcpO1xufVxuXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb21wb25lbnQucHJvdG90eXBlKTtcblxuLy9PdmVycmlkZSBpbiBTdWJjbGFzc1xuT2JqZWN0Q29tcG9uZW50LnByb3RvdHlwZS5hcHBseVZhbHVlID0gZnVuY3Rpb24oKSB7fTtcbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUub25WYWx1ZVVwZGF0ZSA9IGZ1bmN0aW9uKGUpIHt9O1xuXG5PYmplY3RDb21wb25lbnQucHJvdG90eXBlLnB1c2hIaXN0b3J5U3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgb2JqID0gdGhpcy5fb2JqZWN0LCBrZXkgPSB0aGlzLl9rZXk7XG4gICAgSGlzdG9yeS5nZXQoKS5wdXNoU3RhdGUob2JqLCBrZXksIG9ialtrZXldKTtcbn07XG5cbk9iamVjdENvbXBvbmVudC5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMuX29iamVjdFt0aGlzLl9rZXldID0gdmFsdWU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdENvbXBvbmVudDtcbiIsInZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50RGlzcGF0Y2hlcicpLFxuXHRFdmVudF8gXHRcdFx0PSByZXF1aXJlKCcuL2V2ZW50L0V2ZW50Jyk7XG52YXIgQ29tcG9uZW50RXZlbnQgID0gcmVxdWlyZSgnLi9Db21wb25lbnRFdmVudCcpLFxuXHRPcHRpb25FdmVudFx0XHQ9IHJlcXVpcmUoJy4vT3B0aW9uRXZlbnQnKTtcblxuZnVuY3Rpb24gT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIoKXtcblx0RXZlbnREaXNwYXRjaGVyLmFwcGx5KHRoaXMpO1xufVxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIucHJvdG90eXBlLm9uVmFsdWVVcGRhdGVkID0gZnVuY3Rpb24gKGUpIHtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuVVBEQVRFX1ZBTFVFLCB7b3JpZ2luOiBlLnNlbmRlcn0pKTtcbn07XG5cbk9iamVjdENvbXBvbmVudE5vdGlmaWVyLnByb3RvdHlwZS5vbk9wdGlvblRyaWdnZXJlZCA9IGZ1bmN0aW9uKGUpIHtcblx0dGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgT3B0aW9uRXZlbnQuVFJJR0dFUiwge29yaWdpbjogZS5zZW5kZXJ9KSk7XG59O1xuXG52YXIgaW5zdGFuY2UgPSBudWxsO1xuXG5PYmplY3RDb21wb25lbnROb3RpZmllci5nZXQgPSBmdW5jdGlvbigpe1xuXHRpZighaW5zdGFuY2Upe1xuXHRcdGluc3RhbmNlID0gbmV3IE9iamVjdENvbXBvbmVudE5vdGlmaWVyKCk7XG5cdH1cblx0cmV0dXJuIGluc3RhbmNlO1xufTtcblxuT2JqZWN0Q29tcG9uZW50Tm90aWZpZXIuZGVzdHJveSA9IGZ1bmN0aW9uKCl7XG5cdGluc3RhbmNlID0gbnVsbDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0Q29tcG9uZW50Tm90aWZpZXI7IiwidmFyIE9wdGlvbkV2ZW50ID0ge1xuXHRUUklHR0VSRUQ6ICdzZWxlY3RUcmlnZ2VyJyxcblx0VFJJR0dFUjogJ3RyaWdnZXJTZWxlY3QnXG59O1xubW9kdWxlLmV4cG9ydHMgPSBPcHRpb25FdmVudDsiLCJ2YXIgUHJlc2V0ID1cbntcbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICAvL0hJU1RPUllfTUFYX1NUQVRFUyA6IDMwLFxuICAgIE5VTUJFUl9JTlBVVF9TSElGVF9NVUxUSVBMSUVSIDogMTAsXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICBGVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1ggICAgOiAgMSxcbiAgICBGVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9VTklUX1kgICAgOiAgMSxcbiAgICBGVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX1VOSVRfWCAgICA6ICAwLjI1LFxuICAgIEZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfVU5JVF9ZICAgIDogIDAuMjUsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9VTklUX01JTiAgOiAwLjE1LFxuICAgIEZVTkNUSU9OX1BMT1RURVJfVU5JVF9NQVggIDogNCxcbiAgICBGVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9TQ0FMRSAgICAgOiAxMC4wLFxuICAgIEZVTkNUSU9OX1BMT1RURVJfSU1QTElDSVRfU0NBTEUgICAgIDoxLjAsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9TQ0FMRV9NSU4gOiAwLjAyLFxuICAgIEZVTkNUSU9OX1BMT1RURVJfU0NBTEVfTUFYIDogMjUsXG5cbiAgICBGVU5DVElPTl9QTE9UVEVSX0lNUExJQ0lUX0FYRVNfQ09MT1IgOiAncmdiYSgyNTUsMjU1LDI1NSwwLjc1KScsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9JTVBMSUNJVF9HUklEX0NPTE9SIDogJ3JnYmEoMjUsMjUsMjUsMC43NSknLFxuXG4gICAgRlVOQ1RJT05fUExPVFRFUl9OT05fSU1QTElDSVRfQVhFU19DT0xPUiA6ICdyZ2IoNTQsNjAsNjQpJyxcbiAgICBGVU5DVElPTl9QTE9UVEVSX05PTl9JTVBMSUNJVF9HUklEX0NPTE9SIDogJ3JnYigyNSwyNSwyNSknLFxuXG4gICAgRlVOQ1RJT05fUExPVFRFUl9DSVJDTEVfTEFCRUxfUkFESVVTIDogMyxcbiAgICBGVU5DVElPTl9QTE9UVEVSX0NJUkNMRV9MQUJFTF9GSUxMICAgOiAncmdiKDI1NSwyNTUsMjU1KScsXG4gICAgRlVOQ1RJT05fUExPVFRFUl9DSVJDTEVfU1RST0tFICAgICAgIDogJyNiMTIzMzQnXG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJlc2V0OyIsImZ1bmN0aW9uIENvbG9yRm9ybWF0RXJyb3IobXNnKSB7XG5cdEVycm9yLmFwcGx5KHRoaXMpO1xuXHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLENvbG9yRm9ybWF0RXJyb3IpO1xuXHR0aGlzLm5hbWUgPSAnQ29sb3JGb3JtYXRFcnJvcic7XG5cdHRoaXMubWVzc2FnZSA9IG1zZztcbn1cbkNvbG9yRm9ybWF0RXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuQ29sb3JGb3JtYXRFcnJvci5jb25zdHJ1Y3RvciA9IENvbG9yRm9ybWF0RXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sb3JGb3JtYXRFcnJvcjsiLCJ2YXIgQ29sb3JNb2RlID0ge1xuXHRSR0I6ICdyZ2InLFxuXHRIU1Y6ICdoc3YnLFxuXHRIRVg6ICdoZXgnLFxuXHRSR0JmdjogJ3JnYmZ2J1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xvck1vZGU7IiwidmFyIENvbG9yVXRpbCA9IHtcblx0SFNWMlJHQjogZnVuY3Rpb24gKGh1ZSwgc2F0LCB2YWwpIHtcblx0XHR2YXIgbWF4X2h1ZSA9IDM2MC4wLFxuXHRcdFx0bWF4X3NhdCA9IDEwMC4wLFxuXHRcdFx0bWF4X3ZhbCA9IDEwMC4wO1xuXG5cdFx0dmFyIG1pbl9odWUgPSAwLjAsXG5cdFx0XHRtaW5fc2F0ID0gMCxcblx0XHRcdG1pbl92YWwgPSAwO1xuXG5cdFx0aHVlID0gaHVlICUgbWF4X2h1ZTtcblx0XHR2YWwgPSBNYXRoLm1heChtaW5fdmFsLCBNYXRoLm1pbih2YWwsIG1heF92YWwpKSAvIG1heF92YWwgKiAyNTUuMDtcblxuXHRcdGlmIChzYXQgPD0gbWluX3NhdCkge1xuXHRcdFx0dmFsID0gTWF0aC5yb3VuZCh2YWwpO1xuXHRcdFx0cmV0dXJuIFt2YWwsIHZhbCwgdmFsXTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoc2F0ID4gbWF4X3NhdClzYXQgPSBtYXhfc2F0O1xuXG5cdFx0c2F0ID0gc2F0IC8gbWF4X3NhdDtcblxuXHRcdC8vaHR0cDovL2QuaGF0ZW5hLm5lLmpwL2phOS8yMDEwMDkwMy8xMjgzNTA0MzRcblxuXHRcdHZhciBoaSA9IE1hdGguZmxvb3IoaHVlIC8gNjAuMCkgJSA2LFxuXHRcdFx0ZiA9IChodWUgLyA2MC4wKSAtIGhpLFxuXHRcdFx0cCA9IHZhbCAqICgxIC0gc2F0KSxcblx0XHRcdHEgPSB2YWwgKiAoMSAtIGYgKiBzYXQpLFxuXHRcdFx0dCA9IHZhbCAqICgxIC0gKDEgLSBmKSAqIHNhdCk7XG5cblx0XHR2YXIgciA9IDAsXG5cdFx0XHRnID0gMCxcblx0XHRcdGIgPSAwO1xuXG5cdFx0c3dpdGNoIChoaSkge1xuXHRcdFx0Y2FzZSAwOlxuXHRcdFx0XHRyID0gdmFsO1xuXHRcdFx0XHRnID0gdDtcblx0XHRcdFx0YiA9IHA7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHRyID0gcTtcblx0XHRcdFx0ZyA9IHZhbDtcblx0XHRcdFx0YiA9IHA7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHRyID0gcDtcblx0XHRcdFx0ZyA9IHZhbDtcblx0XHRcdFx0YiA9IHQ7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHRyID0gcDtcblx0XHRcdFx0ZyA9IHE7XG5cdFx0XHRcdGIgPSB2YWw7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSA0OlxuXHRcdFx0XHRyID0gdDtcblx0XHRcdFx0ZyA9IHA7XG5cdFx0XHRcdGIgPSB2YWw7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSA1OlxuXHRcdFx0XHRyID0gdmFsO1xuXHRcdFx0XHRnID0gcDtcblx0XHRcdFx0YiA9IHE7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0ciA9IE1hdGgucm91bmQocik7XG5cdFx0ZyA9IE1hdGgucm91bmQoZyk7XG5cdFx0YiA9IE1hdGgucm91bmQoYik7XG5cblx0XHRyZXR1cm4gW3IsIGcsIGJdO1xuXG5cdH0sXG5cblx0UkdCMkhTVjogZnVuY3Rpb24gKHIsIGcsIGIpIHtcblx0XHR2YXIgaCA9IDAsXG5cdFx0XHRzID0gMCxcblx0XHRcdHYgPSAwO1xuXG5cdFx0ciA9IHIgLyAyNTUuMDtcblx0XHRnID0gZyAvIDI1NS4wO1xuXHRcdGIgPSBiIC8gMjU1LjA7XG5cblx0XHR2YXIgbWluUkdCID0gTWF0aC5taW4ociwgTWF0aC5taW4oZywgYikpLFxuXHRcdFx0bWF4UkdCID0gTWF0aC5tYXgociwgTWF0aC5tYXgoZywgYikpO1xuXG5cdFx0aWYgKG1pblJHQiA9PSBtYXhSR0IpIHtcblx0XHRcdHYgPSBtaW5SR0I7XG5cdFx0XHRyZXR1cm4gWzAsIDAsIE1hdGgucm91bmQodildO1xuXHRcdH1cblxuXHRcdHZhciBkZCA9IChyID09IG1pblJHQikgPyBnIC0gYiA6ICgoYiA9PSBtaW5SR0IpID8gciAtIGcgOiBiIC0gciksXG5cdFx0XHRoaCA9IChyID09IG1pblJHQikgPyAzIDogKChiID09IG1pblJHQikgPyAxIDogNSk7XG5cblx0XHRoID0gTWF0aC5yb3VuZCg2MCAqIChoaCAtIGRkIC8gKG1heFJHQiAtIG1pblJHQikpKTtcblx0XHRzID0gTWF0aC5yb3VuZCgobWF4UkdCIC0gbWluUkdCKSAvIG1heFJHQiAqIDEwMC4wKTtcblx0XHR2ID0gTWF0aC5yb3VuZChtYXhSR0IgKiAxMDAuMCk7XG5cblx0XHRyZXR1cm4gW2gsIHMsIHZdO1xuXHR9LFxuXG5cdFJHQjJIRVg6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG5cdFx0cmV0dXJuIFwiI1wiICsgKCgxIDw8IDI0KSArIChyIDw8IDE2KSArIChnIDw8IDgpICsgYikudG9TdHJpbmcoMTYpLnNsaWNlKDEpO1xuXHR9LFxuXG5cdFJHQmZ2MkhFWDogZnVuY3Rpb24gKHIsIGcsIGIpIHtcblx0XHRyZXR1cm4gQ29sb3JVdGlsLlJHQjJIRVgoTWF0aC5mbG9vcihyICogMjU1LjApLFxuXHRcdFx0TWF0aC5mbG9vcihnICogMjU1LjApLFxuXHRcdFx0TWF0aC5mbG9vcihiICogMjU1LjApKTtcblx0fSxcblxuXHRIU1YySEVYOiBmdW5jdGlvbiAoaCwgcywgdikge1xuXHRcdHZhciByZ2IgPSBDb250cm9sS2l0LkNvbG9yVXRpbC5IU1YyUkdCKGgsIHMsIHYpO1xuXHRcdHJldHVybiBDb250cm9sS2l0LkNvbG9yVXRpbC5SR0IySEVYKHJnYlswXSwgcmdiWzFdLCByZ2JbMl0pO1xuXHR9LFxuXG5cdEhFWDJSR0I6IGZ1bmN0aW9uIChoZXgpIHtcblx0XHR2YXIgc2hvcnRoYW5kUmVnZXggPSAvXiM/KFthLWZcXGRdKShbYS1mXFxkXSkoW2EtZlxcZF0pJC9pO1xuXHRcdGhleCA9IGhleC5yZXBsYWNlKHNob3J0aGFuZFJlZ2V4LCBmdW5jdGlvbiAobSwgciwgZywgYikge1xuXHRcdFx0cmV0dXJuIHIgKyByICsgZyArIGcgKyBiICsgYjtcblx0XHR9KTtcblxuXHRcdHZhciByZXN1bHQgPSAvXiM/KFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pJC9pLmV4ZWMoaGV4KTtcblx0XHRyZXR1cm4gcmVzdWx0ID8gW3BhcnNlSW50KHJlc3VsdFsxXSwgMTYpLCBwYXJzZUludChyZXN1bHRbMl0sIDE2KSwgcGFyc2VJbnQocmVzdWx0WzNdLCAxNildIDogbnVsbDtcblxuXHR9LFxuXG5cdGlzVmFsaWRIRVg6IGZ1bmN0aW9uIChoZXgpIHtcblx0XHRyZXR1cm4gL14jWzAtOUEtRl17Nn0kL2kudGVzdChoZXgpO1xuXHR9LFxuXG5cdGlzVmFsaWRSR0I6IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG5cdFx0cmV0dXJuIHIgPj0gMCAmJiByIDw9IDI1NSAmJlxuXHRcdFx0ZyA+PSAwICYmIGcgPD0gMjU1ICYmXG5cdFx0XHRiID49IDAgJiYgYiA8PSAyNTU7XG5cdH0sXG5cblx0aXNWYWxpZFJHQmZ2OiBmdW5jdGlvbiAociwgZywgYikge1xuXHRcdHJldHVybiByID49IDAgJiYgciA8PSAxLjAgJiZcblx0XHRcdGcgPj0gMCAmJiBnIDw9IDEuMCAmJlxuXHRcdFx0YiA+PSAwICYmIGIgPD0gMS4wO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9yVXRpbDsiLCJ2YXIgQ1NTID0ge1xuICAgIENvbnRyb2xLaXQgICA6ICdjb250cm9sS2l0JyxcblxuICAgIFBhbmVsICAgICAgICA6ICdwYW5lbCcsXG4gICAgSGVhZCAgICAgICAgIDogJ2hlYWQnLFxuICAgIExhYmVsICAgICAgICA6ICdsYWJlbCcsXG4gICAgTWVudSAgICAgICAgIDogJ21lbnUnLFxuICAgIFdyYXAgICAgICAgICA6ICd3cmFwJyxcblxuICAgIE1lbnVCdG5DbG9zZSA6ICdidG5DbG9zZScsXG4gICAgTWVudUJ0bkhpZGUgIDogJ2J0bkhpZGUnLFxuICAgIE1lbnVCdG5TaG93ICA6ICdidG5TaG93JyxcbiAgICBNZW51QnRuVW5kbyAgOiAnYnRuVW5kbycsXG5cbiAgICBXcmFwSW5wdXRXUHJlc2V0IDogJ2lucHV0V1ByZXNldFdyYXAnLFxuICAgIFdyYXBDb2xvcldQcmVzZXQgOiAnY29sb3JXUHJlc2V0V3JhcCcsXG5cbiAgICBIZWFkSW5hY3RpdmUgOiAnaGVhZEluYWN0aXZlJyxcbiAgICBQYW5lbEhlYWRJbmFjdGl2ZSA6ICdwYW5lbEhlYWRJbmFjdGl2ZScsXG5cbiAgICBHcm91cExpc3QgOiAnZ3JvdXBMaXN0JyxcbiAgICBHcm91cCAgICAgOiAnZ3JvdXAnLFxuICAgIFN1Ykdyb3VwTGlzdCAgOiAnc3ViR3JvdXBMaXN0JyxcbiAgICBTdWJHcm91cCAgICAgIDogJ3N1Ykdyb3VwJyxcblxuXG4gICAgVGV4dEFyZWFXcmFwIDogJ3RleHRBcmVhV3JhcCcsXG5cbiAgICBJY29uQXJyb3dVcEJpZyA6ICdpY29uQXJyb3dVcEJpZycsXG5cbiAgICBCdXR0b24gICAgICAgOiAnYnV0dG9uJyxcblxuICAgIFdyYXBTbGlkZXIgICA6ICd3cmFwU2xpZGVyJyxcblxuICAgIFNsaWRlcldyYXAgICA6ICdzbGlkZXJXcmFwJyxcbiAgICBTbGlkZXJTbG90ICAgOiAnc2xpZGVyU2xvdCcsXG4gICAgU2xpZGVySGFuZGxlIDogJ3NsaWRlckhhbmRsZScsXG5cbiAgICBBcnJvd0JNaW4gICAgOiAnYXJyb3dCTWluJyxcbiAgICBBcnJvd0JNYXggICAgOiAnYXJyb3dCTWF4JyxcbiAgICBBcnJvd0JTdWJNaW4gOiAnYXJyb3dCU3ViTWluJyxcbiAgICBBcnJvd0JTdWJNYXggOiAnYXJyb3dCU3ViTWF4JyxcbiAgICBBcnJvd1NNaW4gICAgOiAnYXJyb3dTTWluJyxcbiAgICBBcnJvd1NNYXggICAgOiAnYXJyb3dTTWF4JyxcblxuICAgIFNlbGVjdCAgICAgICA6ICdzZWxlY3QnLFxuICAgIFNlbGVjdEFjdGl2ZSA6ICdzZWxlY3RBY3RpdmUnLFxuXG4gICAgT3B0aW9ucyAgICAgICAgIDogJ29wdGlvbnMnLFxuICAgIE9wdGlvbnNTZWxlY3RlZCA6ICdsaVNlbGVjdGVkJyxcblxuICAgIFNlbGVjdENvbG9yIDogJ3NlbGVjdENvbG9yJyxcblxuICAgIFByZXNldEJ0biAgICAgICAgOiAncHJlc2V0QnRuJyxcbiAgICBQcmVzZXRCdG5BY3RpdmUgIDogJ3ByZXNldEJ0bkFjdGl2ZScsXG5cbiAgICBDYW52YXNMaXN0SXRlbSAgOiAnY2FudmFzTGlzdEl0ZW0nLFxuICAgIENhbnZhc1dyYXAgICAgICA6ICdjYW52YXNXcmFwJyxcblxuICAgIFNWR0xpc3RJdGVtICAgICA6ICdzdmdMaXN0SXRlbScsXG4gICAgU1ZHV3JhcCAgICAgICAgIDogJ3N2Z1dyYXAnLFxuXG4gICAgR3JhcGhTbGlkZXJYV3JhcCAgIDogJ2dyYXBoU2xpZGVyWFdyYXAnLFxuICAgIEdyYXBoU2xpZGVyWVdyYXAgICA6ICdncmFwaFNsaWRlcllXcmFwJyxcbiAgICBHcmFwaFNsaWRlclggICAgICAgOiAnZ3JhcGhTbGlkZXJYJyxcbiAgICBHcmFwaFNsaWRlclkgICAgICAgOiAnZ3JhcGhTbGlkZXJZJyxcbiAgICBHcmFwaFNsaWRlclhIYW5kbGUgOiAnZ3JhcGhTbGlkZXJYSGFuZGxlJyxcbiAgICBHcmFwaFNsaWRlcllIYW5kbGUgOiAnZ3JhcGhTbGlkZXJZSGFuZGxlJyxcblxuICAgIFBpY2tlciAgICAgICAgICAgICAgOiAncGlja2VyJyxcbiAgICBQaWNrZXJQYWxsZXRlV3JhcCAgIDogJ3BhbGxldGVXcmFwJyxcbiAgICBQaWNrZXJGaWVsZFdyYXAgICAgIDogJ2ZpZWxkV3JhcCcsXG4gICAgUGlja2VySW5wdXRXcmFwICAgICA6ICdpbnB1dFdyYXAnLFxuICAgIFBpY2tlcklucHV0RmllbGQgICAgOiAnaW5wdXRGaWVsZCcsXG4gICAgUGlja2VyQ29udHJvbHNXcmFwICA6ICdjb250cm9sc1dyYXAnLFxuICAgIFBpY2tlckNvbG9yQ29udHJhc3QgOiAnY29sb3JDb250cmFzdCcsXG5cbiAgICBQaWNrZXJIYW5kbGVGaWVsZCAgOiAnaW5kaWNhdG9yJyxcbiAgICBQaWNrZXJIYW5kbGVTbGlkZXIgOiAnaW5kaWNhdG9yJyxcblxuICAgIENvbG9yIDogJ2NvbG9yJyxcblxuICAgIFNjcm9sbEJhciAgICAgICAgOiAnc2Nyb2xsQmFyJyxcbiAgICBTY3JvbGxXcmFwICAgICAgIDogJ3Njcm9sbFdyYXAnLFxuICAgIFNjcm9sbEJhckJ0blVwICAgOiAnYnRuVXAnLFxuICAgIFNjcm9sbEJhckJ0bkRvd24gOiAnYnRuRG93bicsXG4gICAgU2Nyb2xsQmFyVHJhY2sgICA6ICd0cmFjaycsXG4gICAgU2Nyb2xsQmFyVGh1bWIgICA6ICd0aHVtYicsXG4gICAgU2Nyb2xsQnVmZmVyICAgICA6ICdzY3JvbGxCdWZmZXInLFxuXG4gICAgVHJpZ2dlciA6ICdjb250cm9sS2l0VHJpZ2dlcicsXG5cbiAgICBTaXplSGFuZGxlIDogJ3NpemVIYW5kbGUnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENTUztcbiIsInZhciBEb2N1bWVudEV2ZW50ID0ge1xuICAgIE1PVVNFX01PVkUgOiAnbW91c2Vtb3ZlJyxcbiAgICBNT1VTRV9VUCAgIDogJ21vdXNldXAnLFxuICAgIE1PVVNFX0RPV04gOiAnbW91c2Vkb3duJyxcblxuICAgIFdJTkRPV19SRVNJWkUgOiAncmVzaXplJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudEV2ZW50OyIsInZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi9Eb2N1bWVudEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIE1vdXNlKCkge1xuICAgIHRoaXMuX3BvcyA9IFswLCAwXTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSwgdGhpcy5fb25Eb2N1bWVudE1vdXNlTW92ZS5iaW5kKHRoaXMpKTtcbn1cblxuTW91c2UuX2luc3RhbmNlID0gbnVsbDtcblxuTW91c2UucHJvdG90eXBlLl9vbkRvY3VtZW50TW91c2VNb3ZlID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgZHggPSAwLFxuICAgICAgICBkeSA9IDA7XG5cbiAgICBpZiAoIWUpZSA9IHdpbmRvdy5ldmVudDtcbiAgICBpZiAoZS5wYWdlWCkge1xuICAgICAgICBkeCA9IGUucGFnZVg7XG4gICAgICAgIGR5ID0gZS5wYWdlWTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZS5jbGllbnRYKSB7XG4gICAgICAgIGR4ID0gZS5jbGllbnRYICsgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0ICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XG4gICAgICAgIGR5ID0gZS5jbGllbnRZICsgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AgKyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuICAgIH1cbiAgICB0aGlzLl9wb3NbMF0gPSBkeDtcbiAgICB0aGlzLl9wb3NbMV0gPSBkeTtcbn07XG5cbk1vdXNlLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcG9zO1xufTtcblxuTW91c2UucHJvdG90eXBlLmdldFggPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvc1swXTtcbn07XG5cbk1vdXNlLnByb3RvdHlwZS5nZXRZID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9wb3NbMV07XG59O1xuXG5Nb3VzZS5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZihNb3VzZS5faW5zdGFuY2Upe1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIE1vdXNlLl9pbnN0YW5jZSA9IG5ldyBNb3VzZSgpO1xufTtcblxuTW91c2UuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBNb3VzZS5faW5zdGFuY2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1vdXNlOyIsImZ1bmN0aW9uIE5vZGUoKSB7XG4gICAgdGhpcy5fZWxlbWVudCA9IG51bGw7XG5cbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpe1xuICAgICAgICBjYXNlIDEgOlxuICAgICAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgICAgIGlmIChhcmcgIT0gTm9kZS5JTlBVVF9URVhUICYmXG4gICAgICAgICAgICAgICAgYXJnICE9IE5vZGUuSU5QVVRfQlVUVE9OICYmXG4gICAgICAgICAgICAgICAgYXJnICE9IE5vZGUuSU5QVVRfU0VMRUNUICYmXG4gICAgICAgICAgICAgICAgYXJnICE9IE5vZGUuSU5QVVRfQ0hFQ0tCT1gpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChhcmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZWxlbWVudC50eXBlID0gYXJnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn1cblxuTm9kZS5ESVYgPSAnZGl2Jztcbk5vZGUuSU5QVVRfVEVYVCA9ICcnO1xuTm9kZS5JTlBVVF9URVhUID0gJ3RleHQnO1xuTm9kZS5JTlBVVF9CVVRUT04gPSAnYnV0dG9uJztcbk5vZGUuSU5QVVRfU0VMRUNUID0gJ3NlbGVjdCc7XG5Ob2RlLklOUFVUX0NIRUNLQk9YID0gJ2NoZWNrYm94Jztcbk5vZGUuT1BUSU9OID0gJ29wdGlvbic7XG5Ob2RlLkxJU1QgPSAndWwnO1xuTm9kZS5MSVNUX0lURU0gPSAnbGknO1xuTm9kZS5TUEFOID0gJ3NwYW4nO1xuTm9kZS5URVhUQVJFQSA9ICd0ZXh0YXJlYSc7XG5cbk5vZGUucHJvdG90eXBlID0ge1xuICAgIGFkZENoaWxkOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmFwcGVuZENoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcblxuICAgIGFkZENoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpID0gLTEsIGwgPSBhcmd1bWVudHMubGVuZ3RoLCBlID0gdGhpcy5fZWxlbWVudDtcbiAgICAgICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgICAgIGUuYXBwZW5kQ2hpbGQoYXJndW1lbnRzW2ldLmdldEVsZW1lbnQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGFkZENoaWxkQXQ6IGZ1bmN0aW9uIChub2RlLCBpbmRleCkge1xuICAgICAgICB0aGlzLl9lbGVtZW50Lmluc2VydEJlZm9yZShub2RlLmdldEVsZW1lbnQoKSwgdGhpcy5fZWxlbWVudC5jaGlsZHJlbltpbmRleF0pO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlQ2hpbGQ6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIGlmICghdGhpcy5jb250YWlucyhub2RlKSlyZXR1cm4gbnVsbDtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVDaGlsZChub2RlLmdldEVsZW1lbnQoKSk7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG5cbiAgICByZW1vdmVDaGlsZHJlbjogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaSA9IC0xLCBsID0gYXJndW1lbnRzLmxlbmd0aCwgZSA9IHRoaXMuX2VsZW1lbnQ7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsKSB7XG4gICAgICAgICAgICBlLnJlbW92ZUNoaWxkKGFyZ3VtZW50c1tpXS5nZXRFbGVtZW50KCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICByZW1vdmVDaGlsZEF0OiBmdW5jdGlvbiAobm9kZSwgaW5kZXgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5zKG5vZGUpKXJldHVybiBudWxsO1xuICAgICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUNoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcblxuICAgIHJlbW92ZUFsbENoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcbiAgICAgICAgd2hpbGUgKGVsZW1lbnQuaGFzQ2hpbGROb2RlcygpKWVsZW1lbnQucmVtb3ZlQ2hpbGQoZWxlbWVudC5sYXN0Q2hpbGQpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc2V0V2lkdGg6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLndpZHRoID0gdmFsdWUgKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGdldFdpZHRoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldFdpZHRoO1xuICAgIH0sXG5cbiAgICBzZXRIZWlnaHQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLmhlaWdodCA9IHZhbHVlICsgJ3B4JztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBnZXRIZWlnaHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0SGVpZ2h0O1xuICAgIH0sXG5cbiAgICBzZXRQb3NpdGlvbjogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0UG9zaXRpb24oeCkuc2V0UG9zaXRpb24oeSk7XG4gICAgfSxcbiAgICBzZXRQb3NpdGlvblg6IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUubWFyZ2luTGVmdCA9IHggKyAncHgnO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFBvc2l0aW9uWTogZnVuY3Rpb24gKHkpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5tYXJnaW5Ub3AgPSB5ICsgJ3B4JztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHNldFBvc2l0aW9uR2xvYmFsOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRQb3NpdGlvbkdsb2JhbFgoeCkuc2V0UG9zaXRpb25HbG9iYWxZKHkpO1xuICAgIH0sXG4gICAgc2V0UG9zaXRpb25HbG9iYWxYOiBmdW5jdGlvbiAoeCkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLmxlZnQgPSB4ICsgJ3B4JztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBzZXRQb3NpdGlvbkdsb2JhbFk6IGZ1bmN0aW9uICh5KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUudG9wID0geSArICdweCc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBnZXRQb3NpdGlvbjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gW3RoaXMuZ2V0UG9zaXRpb25YKCksIHRoaXMuZ2V0UG9zaXRpb25ZKCldO1xuICAgIH0sXG4gICAgZ2V0UG9zaXRpb25YOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgfSxcbiAgICBnZXRQb3NpdGlvblk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0VG9wO1xuICAgIH0sXG5cbiAgICBnZXRQb3NpdGlvbkdsb2JhbDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gWzAsIDBdLFxuICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XG5cbiAgICAgICAgd2hpbGUgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIG9mZnNldFswXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgICAgICBvZmZzZXRbMV0gKz0gZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb2Zmc2V0O1xuICAgIH0sXG5cbiAgICBnZXRQb3NpdGlvbkdsb2JhbFg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9mZnNldCA9IDAsXG4gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcblxuICAgICAgICB3aGlsZSAoZWxlbWVudCkge1xuICAgICAgICAgICAgb2Zmc2V0ICs9IGVsZW1lbnQub2Zmc2V0TGVmdDtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgfSxcblxuICAgIGdldFBvc2l0aW9uR2xvYmFsWTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gMCxcbiAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuXG4gICAgICAgIHdoaWxlIChlbGVtZW50KSB7XG4gICAgICAgICAgICBvZmZzZXQgKz0gZWxlbWVudC5vZmZzZXRUb3A7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb2Zmc2V0O1xuICAgIH0sXG5cbiAgICBhZGRFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICByZW1vdmVFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAodHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHNldFN0eWxlQ2xhc3M6IGZ1bmN0aW9uIChzdHlsZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmNsYXNzTmFtZSA9IHN0eWxlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFN0eWxlUHJvcGVydHk6IGZ1bmN0aW9uIChwcm9wZXJ0eSwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBnZXRTdHlsZVByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldO1xuICAgIH0sXG4gICAgc2V0U3R5bGVQcm9wZXJ0aWVzOiBmdW5jdGlvbiAocHJvcGVydGllcykge1xuICAgICAgICBmb3IgKHZhciBwIGluIHByb3BlcnRpZXMpdGhpcy5fZWxlbWVudC5zdHlsZVtwXSA9IHByb3BlcnRpZXNbcF07XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBkZWxldGVTdHlsZUNsYXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuY2xhc3NOYW1lID0gJyc7XG4gICAgICAgIHJldHVybiB0aGlzXG4gICAgfSxcbiAgICBkZWxldGVTdHlsZVByb3BlcnR5OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtwcm9wZXJ0eV0gPSAnJztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBkZWxldGVTdHlsZVByb3BlcnRpZXM6IGZ1bmN0aW9uIChwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGZvciAodmFyIHAgaW4gcHJvcGVydGllcyl0aGlzLl9lbGVtZW50LnN0eWxlW3BdID0gJyc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBnZXRDaGlsZEF0OiBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBOb2RlKCkuc2V0RWxlbWVudCh0aGlzLl9lbGVtZW50LmNoaWxkcmVuW2luZGV4XSk7XG4gICAgfSxcbiAgICBnZXRDaGlsZEluZGV4OiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXhPZih0aGlzLl9lbGVtZW50LCBub2RlLmdldEVsZW1lbnQoKSk7XG4gICAgfSxcbiAgICBnZXROdW1DaGlsZHJlbjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5jaGlsZHJlbi5sZW5ndGg7XG4gICAgfSxcbiAgICBnZXRGaXJzdENoaWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICB9LFxuICAgIGdldExhc3RDaGlsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IE5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQubGFzdENoaWxkKTtcbiAgICB9LFxuICAgIGhhc0NoaWxkcmVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50LmNoaWxkcmVuLmxlbmd0aCAhPSAwO1xuICAgIH0sXG4gICAgY29udGFpbnM6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleE9mKHRoaXMuX2VsZW1lbnQsIG5vZGUuZ2V0RWxlbWVudCgpKSAhPSAtMTtcbiAgICB9LFxuXG4gICAgX2luZGV4T2Y6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50LCBlbGVtZW50KSB7XG4gICAgICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHBhcmVudEVsZW1lbnQuY2hpbGRyZW4sIGVsZW1lbnQpO1xuICAgIH0sXG5cbiAgICBzZXRQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgICAgICB0aGlzLl9lbGVtZW50W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNldFByb3BlcnRpZXM6IGZ1bmN0aW9uIChwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGZvciAodmFyIHAgaW4gcHJvcGVydGllcyl0aGlzLl9lbGVtZW50W3BdID0gcHJvcGVydGllc1twXTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBnZXRQcm9wZXJ0eTogZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50W3Byb3BlcnR5XTtcbiAgICB9LFxuXG5cbiAgICBzZXRFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBnZXRFbGVtZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbGVtZW50O1xuICAgIH0sXG5cbiAgICBnZXRTdHlsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5zdHlsZTtcbiAgICB9LFxuXG4gICAgZ2V0UGFyZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5wYXJlbnROb2RlKTtcbiAgICB9XG59O1xuXG5Ob2RlLmdldE5vZGVCeUVsZW1lbnQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQoZWxlbWVudCk7XG59O1xuTm9kZS5nZXROb2RlQnlJZCA9IGZ1bmN0aW9uIChpZCkge1xuICAgIHJldHVybiBuZXcgTm9kZSgpLnNldEVsZW1lbnQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9kZTtcblxuLy9Db250cm9sS2l0Lk5vZGUgPSBmdW5jdGlvbigpXG4vL3tcbi8vICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuLy9cbi8vICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMSlcbi8vICAgIHtcbi8vICAgICAgICB2YXIgYXJnICA9IGFyZ3VtZW50c1swXTtcbi8vXG4vLyAgICAgICAgaWYoYXJnICE9IENvbnRyb2xLaXQuTm9kZVR5cGUuSU5QVVRfVEVYVCAgICYmXG4vLyAgICAgICAgICAgYXJnICE9IENvbnRyb2xLaXQuTm9kZVR5cGUuSU5QVVRfQlVUVE9OICYmXG4vLyAgICAgICAgICAgYXJnICE9IENvbnRyb2xLaXQuTm9kZVR5cGUuSU5QVVRfU0VMRUNUICYmXG4vLyAgICAgICAgICAgYXJnICE9IENvbnRyb2xLaXQuTm9kZVR5cGUuSU5QVVRfQ0hFQ0tCT1gpXG4vLyAgICAgICAge1xuLy8gICAgICAgICAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChhcmcpO1xuLy8gICAgICAgIH1cbi8vICAgICAgICBlbHNlXG4vLyAgICAgICAge1xuLy8gICAgICAgICAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbi8vICAgICAgICAgICAgdGhpcy5fZWxlbWVudC50eXBlID0gYXJnO1xuLy8gICAgICAgIH1cbi8vICAgIH1cbi8vfTtcbi8vXG4vL0NvbnRyb2xLaXQuTm9kZS5wcm90b3R5cGUgPVxuLy97XG4vLyAgICBhZGRDaGlsZCAgIDogZnVuY3Rpb24obm9kZSlcbi8vICAgIHtcbi8vICAgICAgICB0aGlzLl9lbGVtZW50LmFwcGVuZENoaWxkKG5vZGUuZ2V0RWxlbWVudCgpKTtcbi8vICAgICAgICByZXR1cm4gbm9kZTtcbi8vICAgIH0sXG4vL1xuLy8gICAgYWRkQ2hpbGRyZW4gOiBmdW5jdGlvbigpXG4vLyAgICB7XG4vLyAgICAgICAgdmFyIGkgPSAtMSxsID0gYXJndW1lbnRzLmxlbmd0aCxlID0gdGhpcy5fZWxlbWVudDtcbi8vICAgICAgICB3aGlsZSgrK2kgPCBsKXtlLmFwcGVuZENoaWxkKGFyZ3VtZW50c1tpXS5nZXRFbGVtZW50KCkpO31cbi8vICAgICAgICByZXR1cm4gdGhpcztcbi8vICAgIH0sXG4vL1xuLy8gICAgYWRkQ2hpbGRBdCA6IGZ1bmN0aW9uKG5vZGUsaW5kZXgpXG4vLyAgICB7XG4vLyAgICAgICAgdGhpcy5fZWxlbWVudC5pbnNlcnRCZWZvcmUobm9kZS5nZXRFbGVtZW50KCksdGhpcy5fZWxlbWVudC5jaGlsZHJlbltpbmRleF0pO1xuLy8gICAgICAgIHJldHVybiBub2RlO1xuLy8gICAgfSxcbi8vXG4vLyAgICByZW1vdmVDaGlsZCA6IGZ1bmN0aW9uKG5vZGUpXG4vLyAgICB7XG4vLyAgICAgICAgaWYoIXRoaXMuY29udGFpbnMobm9kZSkpcmV0dXJuIG51bGw7XG4vLyAgICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVDaGlsZChub2RlLmdldEVsZW1lbnQoKSk7XG4vLyAgICAgICAgcmV0dXJuIG5vZGU7XG4vLyAgICB9LFxuLy9cbi8vICAgIHJlbW92ZUNoaWxkcmVuIDogZnVuY3Rpb24oKVxuLy8gICAge1xuLy8gICAgICAgIHZhciBpID0gLTEsIGwgPSBhcmd1bWVudHMubGVuZ3RoLCBlID0gdGhpcy5fZWxlbWVudDtcbi8vICAgICAgICB3aGlsZSgrK2k8bCl7ZS5yZW1vdmVDaGlsZChhcmd1bWVudHNbaV0uZ2V0RWxlbWVudCgpKTt9XG4vLyAgICAgICAgcmV0dXJuIHRoaXM7XG4vLyAgICB9LFxuLy9cbi8vICAgIHJlbW92ZUNoaWxkQXQgOiBmdW5jdGlvbihub2RlLGluZGV4KVxuLy8gICAge1xuLy8gICAgICAgIGlmKCF0aGlzLmNvbnRhaW5zKG5vZGUpKXJldHVybiBudWxsO1xuLy8gICAgICAgIHRoaXMuX2VsZW1lbnQucmVtb3ZlQ2hpbGQobm9kZS5nZXRFbGVtZW50KCkpO1xuLy8gICAgICAgIHJldHVybiBub2RlO1xuLy8gICAgfSxcbi8vXG4vLyAgICByZW1vdmVBbGxDaGlsZHJlbiA6IGZ1bmN0aW9uKClcbi8vICAgIHtcbi8vICAgICAgICB2YXIgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XG4vLyAgICAgICAgd2hpbGUoZWxlbWVudC5oYXNDaGlsZE5vZGVzKCkpZWxlbWVudC5yZW1vdmVDaGlsZChlbGVtZW50Lmxhc3RDaGlsZCk7XG4vLyAgICAgICAgcmV0dXJuIHRoaXM7XG4vLyAgICB9LFxuLy9cbi8vICAgIHNldFdpZHRoICA6IGZ1bmN0aW9uKHZhbHVlKXt0aGlzLl9lbGVtZW50LnN0eWxlLndpZHRoID0gdmFsdWUgKyAncHgnOyByZXR1cm4gdGhpczt9LFxuLy8gICAgZ2V0V2lkdGggIDogZnVuY3Rpb24oKSAgICAge3JldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldFdpZHRoO30sXG4vL1xuLy8gICAgc2V0SGVpZ2h0IDogZnVuY3Rpb24odmFsdWUpe3RoaXMuX2VsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gdmFsdWUgKyAncHgnOyByZXR1cm4gdGhpczt9LFxuLy8gICAgZ2V0SGVpZ2h0IDogZnVuY3Rpb24oKSAgICAge3JldHVybiB0aGlzLl9lbGVtZW50Lm9mZnNldEhlaWdodDt9LFxuLy9cbi8vICAgIHNldFBvc2l0aW9uICA6IGZ1bmN0aW9uKHgseSl7IHJldHVybiB0aGlzLnNldFBvc2l0aW9uKHgpLnNldFBvc2l0aW9uKHkpO30sXG4vLyAgICBzZXRQb3NpdGlvblggOiBmdW5jdGlvbih4KSAge3RoaXMuX2VsZW1lbnQuc3R5bGUubWFyZ2luTGVmdCA9IHggKyAncHgnO3JldHVybiB0aGlzO30sXG4vLyAgICBzZXRQb3NpdGlvblkgOiBmdW5jdGlvbih5KSAge3RoaXMuX2VsZW1lbnQuc3R5bGUubWFyZ2luVG9wICA9IHkgKyAncHgnO3JldHVybiB0aGlzO30sXG4vL1xuLy8gICAgc2V0UG9zaXRpb25HbG9iYWwgIDogZnVuY3Rpb24oeCx5KXtyZXR1cm4gdGhpcy5zZXRQb3NpdGlvbkdsb2JhbFgoeCkuc2V0UG9zaXRpb25HbG9iYWxZKHkpO30sXG4vLyAgICBzZXRQb3NpdGlvbkdsb2JhbFggOiBmdW5jdGlvbih4KSAge3RoaXMuX2VsZW1lbnQuc3R5bGUubGVmdCA9IHggKyAncHgnO3JldHVybiB0aGlzO30sXG4vLyAgICBzZXRQb3NpdGlvbkdsb2JhbFkgOiBmdW5jdGlvbih5KSAge3RoaXMuX2VsZW1lbnQuc3R5bGUudG9wICA9IHkgKyAncHgnO3JldHVybiB0aGlzO30sXG4vL1xuLy8gICAgZ2V0UG9zaXRpb24gIDogZnVuY3Rpb24oKXtyZXR1cm4gW3RoaXMuZ2V0UG9zaXRpb25YKCksdGhpcy5nZXRQb3NpdGlvblkoKV07fSxcbi8vICAgIGdldFBvc2l0aW9uWCA6IGZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2VsZW1lbnQub2Zmc2V0TGVmdDt9LFxuLy8gICAgZ2V0UG9zaXRpb25ZIDogZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fZWxlbWVudC5vZmZzZXRUb3A7fSxcbi8vXG4vLyAgICBnZXRQb3NpdGlvbkdsb2JhbCA6IGZ1bmN0aW9uKClcbi8vICAgIHtcbi8vICAgICAgICB2YXIgb2Zmc2V0ICA9IFswLDBdLFxuLy8gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcbi8vXG4vLyAgICAgICAgd2hpbGUoZWxlbWVudClcbi8vICAgICAgICB7XG4vLyAgICAgICAgICAgIG9mZnNldFswXSArPSBlbGVtZW50Lm9mZnNldExlZnQ7XG4vLyAgICAgICAgICAgIG9mZnNldFsxXSArPSBlbGVtZW50Lm9mZnNldFRvcDtcbi8vICAgICAgICAgICAgZWxlbWVudCAgICA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuLy8gICAgICAgIH1cbi8vXG4vLyAgICAgICAgcmV0dXJuIG9mZnNldDtcbi8vICAgIH0sXG4vL1xuLy8gICAgZ2V0UG9zaXRpb25HbG9iYWxYIDogZnVuY3Rpb24oKVxuLy8gICAge1xuLy8gICAgICAgIHZhciBvZmZzZXQgID0gMCxcbi8vICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XG4vL1xuLy8gICAgICAgIHdoaWxlKGVsZW1lbnQpXG4vLyAgICAgICAge1xuLy8gICAgICAgICAgICBvZmZzZXQgKz0gZWxlbWVudC5vZmZzZXRMZWZ0O1xuLy8gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4vLyAgICAgICAgfVxuLy9cbi8vICAgICAgICByZXR1cm4gb2Zmc2V0O1xuLy8gICAgfSxcbi8vXG4vLyAgICBnZXRQb3NpdGlvbkdsb2JhbFkgOiBmdW5jdGlvbigpXG4vLyAgICB7XG4vLyAgICAgICAgdmFyIG9mZnNldCAgPSAwLFxuLy8gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcbi8vXG4vLyAgICAgICAgd2hpbGUoZWxlbWVudClcbi8vICAgICAgICB7XG4vLyAgICAgICAgICAgIG9mZnNldCArPSBlbGVtZW50Lm9mZnNldFRvcDtcbi8vICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50O1xuLy8gICAgICAgIH1cbi8vXG4vLyAgICAgICAgcmV0dXJuIG9mZnNldDtcbi8vICAgIH0sXG4vL1xuLy8gICAgYWRkRXZlbnRMaXN0ZW5lciAgICA6IGZ1bmN0aW9uKHR5cGUsbGlzdGVuZXIsdXNlQ2FwdHVyZSl7dGhpcy5fZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCAgIHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTsgcmV0dXJuIHRoaXM7fSxcbi8vICAgIHJlbW92ZUV2ZW50TGlzdGVuZXIgOiBmdW5jdGlvbih0eXBlLGxpc3RlbmVyLHVzZUNhcHR1cmUpe3RoaXMuX2VsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSk7cmV0dXJuIHRoaXM7fSxcbi8vXG4vLyAgICBzZXRTdHlsZUNsYXNzICAgICAgOiBmdW5jdGlvbihzdHlsZSkgICAgICAgICB7dGhpcy5fZWxlbWVudC5jbGFzc05hbWUgPSBzdHlsZTsgcmV0dXJuIHRoaXM7fSxcbi8vICAgIHNldFN0eWxlUHJvcGVydHkgICA6IGZ1bmN0aW9uKHByb3BlcnR5LHZhbHVlKXt0aGlzLl9lbGVtZW50LnN0eWxlW3Byb3BlcnR5XSA9IHZhbHVlOyByZXR1cm4gdGhpczt9LFxuLy8gICAgZ2V0U3R5bGVQcm9wZXJ0eSAgIDogZnVuY3Rpb24ocHJvcGVydHkpICAgICAge3JldHVybiB0aGlzLl9lbGVtZW50LnN0eWxlW3Byb3BlcnR5XTt9LFxuLy8gICAgc2V0U3R5bGVQcm9wZXJ0aWVzIDogZnVuY3Rpb24ocHJvcGVydGllcykgICAge2Zvcih2YXIgcCBpbiBwcm9wZXJ0aWVzKXRoaXMuX2VsZW1lbnQuc3R5bGVbcF0gPSBwcm9wZXJ0aWVzW3BdO3JldHVybiB0aGlzO30sXG4vL1xuLy8gICAgZGVsZXRlU3R5bGVDbGFzcyAgICAgIDogZnVuY3Rpb24oKSAgICAgICAgICAge3RoaXMuX2VsZW1lbnQuY2xhc3NOYW1lID0gJyc7cmV0dXJuIHRoaXN9LFxuLy8gICAgZGVsZXRlU3R5bGVQcm9wZXJ0eSAgIDogZnVuY3Rpb24ocHJvcGVydHkpICAge3RoaXMuX2VsZW1lbnQuc3R5bGVbcHJvcGVydHldID0gJyc7cmV0dXJuIHRoaXM7fSxcbi8vICAgIGRlbGV0ZVN0eWxlUHJvcGVydGllcyA6IGZ1bmN0aW9uKHByb3BlcnRpZXMpIHtmb3IodmFyIHAgaW4gcHJvcGVydGllcyl0aGlzLl9lbGVtZW50LnN0eWxlW3BdID0gJyc7cmV0dXJuIHRoaXM7fSxcbi8vXG4vLyAgICBnZXRDaGlsZEF0ICAgICA6IGZ1bmN0aW9uKGluZGV4KSB7cmV0dXJuIG5ldyBDb250cm9sS2l0Lk5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQuY2hpbGRyZW5baW5kZXhdKTt9LFxuLy8gICAgZ2V0Q2hpbGRJbmRleCAgOiBmdW5jdGlvbihub2RlKSAge3JldHVybiB0aGlzLl9pbmRleE9mKHRoaXMuX2VsZW1lbnQsbm9kZS5nZXRFbGVtZW50KCkpO30sXG4vLyAgICBnZXROdW1DaGlsZHJlbiA6IGZ1bmN0aW9uKCkgICAgICB7cmV0dXJuIHRoaXMuX2VsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoO30sXG4vLyAgICBnZXRGaXJzdENoaWxkICA6IGZ1bmN0aW9uKCkgICAgICB7cmV0dXJuIG5ldyBDb250cm9sS2l0Lk5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQuZmlyc3RDaGlsZCk7fSxcbi8vICAgIGdldExhc3RDaGlsZCAgIDogZnVuY3Rpb24oKSAgICAgIHtyZXR1cm4gbmV3IENvbnRyb2xLaXQuTm9kZSgpLnNldEVsZW1lbnQodGhpcy5fZWxlbWVudC5sYXN0Q2hpbGQpO30sXG4vLyAgICBoYXNDaGlsZHJlbiAgICA6IGZ1bmN0aW9uKCkgICAgICB7cmV0dXJuIHRoaXMuX2VsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoICE9IDA7fSxcbi8vICAgIGNvbnRhaW5zICAgICAgIDogZnVuY3Rpb24obm9kZSkgIHtyZXR1cm4gdGhpcy5faW5kZXhPZih0aGlzLl9lbGVtZW50LG5vZGUuZ2V0RWxlbWVudCgpKSAhPSAtMTt9LFxuLy9cbi8vICAgIF9pbmRleE9mICAgICAgIDogZnVuY3Rpb24ocGFyZW50RWxlbWVudCxlbGVtZW50KXtyZXR1cm4gQXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbChwYXJlbnRFbGVtZW50LmNoaWxkcmVuLGVsZW1lbnQpO30sXG4vL1xuLy8gICAgc2V0UHJvcGVydHkgICA6IGZ1bmN0aW9uKHByb3BlcnR5LCB2YWx1ZSl7dGhpcy5fZWxlbWVudFtwcm9wZXJ0eV0gPSB2YWx1ZTtyZXR1cm4gdGhpczt9LFxuLy8gICAgc2V0UHJvcGVydGllcyA6IGZ1bmN0aW9uKHByb3BlcnRpZXMpICAgICB7Zm9yKHZhciBwIGluIHByb3BlcnRpZXMpdGhpcy5fZWxlbWVudFtwXSA9IHByb3BlcnRpZXNbcF07cmV0dXJuIHRoaXM7fSxcbi8vICAgIGdldFByb3BlcnR5ICAgOiBmdW5jdGlvbihwcm9wZXJ0eSkgICAgICAge3JldHVybiB0aGlzLl9lbGVtZW50W3Byb3BlcnR5XTt9LFxuLy9cbi8vXG4vLyAgICBzZXRFbGVtZW50IDogZnVuY3Rpb24oZWxlbWVudCl7dGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7cmV0dXJuIHRoaXM7fSxcbi8vICAgIGdldEVsZW1lbnQgOiBmdW5jdGlvbigpICAgICAgIHsgcmV0dXJuIHRoaXMuX2VsZW1lbnQ7fSxcbi8vXG4vLyAgICBnZXRTdHlsZSAgIDogZnVuY3Rpb24oKSAgICAgICB7cmV0dXJuIHRoaXMuX2VsZW1lbnQuc3R5bGU7fSxcbi8vXG4vLyAgICBnZXRQYXJlbnQgIDogZnVuY3Rpb24oKXsgcmV0dXJuIG5ldyBDb250cm9sS2l0Lk5vZGUoKS5zZXRFbGVtZW50KHRoaXMuX2VsZW1lbnQucGFyZW50Tm9kZSk7IH1cbi8vfTtcbi8vXG4vL0NvbnRyb2xLaXQuTm9kZS5nZXROb2RlQnlFbGVtZW50ID0gZnVuY3Rpb24oZWxlbWVudCl7cmV0dXJuIG5ldyBDb250cm9sS2l0Lk5vZGUoKS5zZXRFbGVtZW50KGVsZW1lbnQpO307XG4vL0NvbnRyb2xLaXQuTm9kZS5nZXROb2RlQnlJZCAgICAgID0gZnVuY3Rpb24oaWQpICAgICB7cmV0dXJuIG5ldyBDb250cm9sS2l0Lk5vZGUoKS5zZXRFbGVtZW50KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKSk7fTtcbi8vXG4iLCJ2YXIgTm9kZUV2ZW50ID0ge1xuICAgIE1PVVNFX0RPV04gICA6ICdtb3VzZWRvd24nLFxuICAgIE1PVVNFX1VQICAgICA6ICdtb3VzZXVwJyxcbiAgICBNT1VTRV9PVkVSICAgOiAnbW91c2VvdmVyJyxcbiAgICBNT1VTRV9NT1ZFICAgOiAnbW91c2Vtb3ZlJyxcbiAgICBNT1VTRV9PVVQgICAgOiAnbW91c2VvdXQnLFxuICAgIEtFWV9ET1dOICAgICA6ICdrZXlkb3duJyxcbiAgICBLRVlfVVAgICAgICAgOiAna2V5dXAnLFxuICAgIENIQU5HRSAgICAgICA6ICdjaGFuZ2UnLFxuICAgIEZJTklTSCAgICAgICA6ICdmaW5pc2gnLFxuICAgIERCTF9DTElDSyAgICA6ICdkYmxjbGljaycsXG4gICAgT05fQ0xJQ0sgICAgIDogJ2NsaWNrJyxcbiAgICBTRUxFQ1RfU1RBUlQgOiAnc2VsZWN0c3RhcnQnLFxuICAgIERSQUdfU1RBUlQgICA6ICdkcmFnc3RhcnQnLFxuICAgIERSQUcgICAgICAgICA6ICdkcmFnJyxcbiAgICBEUkFHX0VORCAgICAgOiAnZHJhZ2VuZCcsXG5cbiAgICBEUkFHX0VOVEVSICAgOiAnZHJhZ2VudGVyJyxcbiAgICBEUkFHX09WRVIgICAgOiAnZHJhZ292ZXInLFxuICAgIERSQUdfTEVBVkUgICA6ICdkcmFnbGVhdmUnLFxuXG4gICAgUkVTSVpFICAgICAgIDogJ3Jlc2l6ZSdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9kZUV2ZW50OyIsInZhciBTdHlsZSA9IHsgXG5cdHN0cmluZyA6IFwiLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICogUGFuZWwgKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qLy8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqIENvbXBvbmVudHMgKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qLy8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqIENhbnZhcyAqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICogU2Nyb2xsQmFyICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi8vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKiBHcm91cCAmIHN1Ykdyb3VwICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi8vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKiBNZW51ICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi8vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKiBPcHRpb25zICotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi8vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKiBQaWNrZXIgKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL2JvZHkgeyAgbWFyZ2luOiAwOyAgcGFkZGluZzogMDsgfSNjb250cm9sS2l0IHsgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgIHRvcDogMDsgIGxlZnQ6IDA7ICB3aWR0aDogMTAwJTsgIGhlaWdodDogMTAwJTsgIC13ZWJraXQtdXNlci1zZWxlY3Q6IG5vbmU7ICB1c2VyLXNlbGVjdDogbm9uZTsgIHBvaW50ZXItZXZlbnRzOiBub25lOyB9ICAjY29udHJvbEtpdCAqIHsgICAgb3V0bGluZTogMDsgfSAgI2NvbnRyb2xLaXQgLnBhbmVsIGlucHV0W3R5cGU9J3RleHQnXSwgICNjb250cm9sS2l0IC5wYW5lbCB0ZXh0YXJlYSwgICNjb250cm9sS2l0IC5wYW5lbCAuY29sb3IsICAjY29udHJvbEtpdCAucGlja2VyIGlucHV0W3R5cGU9J3RleHQnXSB7ICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICBoZWlnaHQ6IDI1cHg7ICAgIHdpZHRoOiAxMDAlOyAgICBwYWRkaW5nOiAwIDAgMCA4cHg7ICAgIGZvbnQtZmFtaWx5OiBhcmlhbCwgc2Fucy1zZXJpZjsgICAgZm9udC1zaXplOiAxMXB4OyAgICBjb2xvcjogd2hpdGU7ICAgIHRleHQtc2hhZG93OiAxcHggMXB4IGJsYWNrOyAgICBiYWNrZ3JvdW5kOiAjMjIyNzI5OyAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCUsIHJnYmEoMCwgMCwgMCwgMC4xMjUpIDEwMCUpOyAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCUsIHJnYmEoMCwgMCwgMCwgMC4xMjUpIDEwMCUpOyAgICBib3JkZXI6IG5vbmU7ICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4wMTI1KSBpbnNldCwgMCAwIDFweCAxcHggIzExMTMxNCBpbnNldDsgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzYjQ0NDc7ICAgIC13ZWJraXQtdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1raHRtbC11c2VyLXNlbGVjdDogbm9uZTsgICAgLW1vei11c2VyLXNlbGVjdDogbm9uZTsgICAgLW8tdXNlci1zZWxlY3Q6IG5vbmU7IH0gICNjb250cm9sS2l0IC5wYW5lbCAuY29sb3IgeyAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgd2lkdGg6IDEwMCU7ICAgIGhlaWdodDogMjVweDsgICAgbGluZS1oZWlnaHQ6IDI1cHg7ICAgIGJhY2tncm91bmQ6ICNmZmY7ICAgIHRleHQtYWxpZ246IGNlbnRlcjsgICAgcGFkZGluZzogMDsgICAgLXdlYmtpdC10b3VjaC1jYWxsb3V0OiBub25lOyAgICAtd2Via2l0LXVzZXItc2VsZWN0OiBub25lOyAgICAta2h0bWwtdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1tb3otdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1tcy11c2VyLXNlbGVjdDogbm9uZTsgICAgdXNlci1zZWxlY3Q6IG5vbmU7ICAgIGN1cnNvcjogcG9pbnRlcjsgICAgYm9yZGVyOiBub25lOyAgICBib3gtc2hhZG93OiAwIDAgMCAxcHggIzExMTMxNCBpbnNldDsgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzYjQ0NDc7IH0gICNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uLCAgI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9uLCAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3QsICAjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdEFjdGl2ZSB7ICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICB3aWR0aDogMTAwJTsgICAgaGVpZ2h0OiAyNnB4OyAgICBtYXJnaW46IC0ycHggMCAwIDA7ICAgIGN1cnNvcjogcG9pbnRlcjsgICAgYmFja2dyb3VuZDogIzNjNDk0ZTsgICAgYmFja2dyb3VuZC1pbWFnZTogLW8tbGluZWFyLWdyYWRpZW50KHJnYmEoMzQsIDM5LCA0MSwgMCkgMCUsIHJnYmEoMzQsIDM5LCA0MSwgMC42NSkgMTAwJSk7ICAgIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudChyZ2JhKDM0LCAzOSwgNDEsIDApIDAlLCByZ2JhKDM0LCAzOSwgNDEsIDAuNjUpIDEwMCUpOyAgICBmb250LWZhbWlseTogYXJpYWwsIHNhbnMtc2VyaWY7ICAgIGNvbG9yOiB3aGl0ZTsgICAgYm9yZGVyOiBub25lOyAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICBib3gtc2hhZG93OiAwIDAgMCAxcHggIzEzMTMxMyBpbnNldCwgLTFweCAycHggMCAwICMzMjNhNDQgaW5zZXQ7ICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjM2I0NDQ3OyAgICBvdXRsaW5lOiAwOyB9ICAjY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbiwgI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9uIHsgICAgZm9udC1zaXplOiAxMHB4OyAgICBmb250LXdlaWdodDogYm9sZDsgICAgdGV4dC1zaGFkb3c6IDAgLTFweCBibGFjazsgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmJ1dHRvbjpob3ZlciwgI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9uOmhvdmVyIHsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBub25lOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuYnV0dG9uOmFjdGl2ZSwgI2NvbnRyb2xLaXQgLnBpY2tlciAuYnV0dG9uOmFjdGl2ZSB7ICAgICAgYmFja2dyb3VuZC1pbWFnZTogLW8tbGluZWFyLWdyYWRpZW50KHJnYmEoMCwgMCwgMCwgMC4xKSAwJSwgdHJhbnNwYXJlbnQgMTAwJSk7ICAgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KHJnYmEoMCwgMCwgMCwgMC4xKSAwJSwgdHJhbnNwYXJlbnQgMTAwJSk7IH0gICNjb250cm9sS2l0IC5wYW5lbCB7ICAgIHBvaW50ZXItZXZlbnRzOiBhdXRvOyAgICBwb3NpdGlvbjogcmVsYXRpdmU7ICAgIHotaW5kZXg6IDE7ICAgIG1hcmdpbjogMDsgICAgcGFkZGluZzogMDsgICAgd2lkdGg6IDMwMHB4OyAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMzAzNjM5OyAgICBib3gtc2hhZG93OiAwIDAgMXB4IDFweCByZ2JhKDAsIDAsIDAsIDAuMjUpOyAgICBmb250LWZhbWlseTogYXJpYWwsIHNhbnMtc2VyaWY7ICAgIC13ZWJraXQtdG91Y2gtY2FsbG91dDogbm9uZTsgICAgLXdlYmtpdC11c2VyLXNlbGVjdDogbm9uZTsgICAgLWtodG1sLXVzZXItc2VsZWN0OiBub25lOyAgICAtbW96LXVzZXItc2VsZWN0OiBub25lOyAgICAtbXMtdXNlci1zZWxlY3Q6IG5vbmU7ICAgIHVzZXItc2VsZWN0OiBub25lOyAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgb3ZlcmZsb3c6IGhpZGRlbjsgICAgb3BhY2l0eTogMS4wOyAgICBmbG9hdDogbGVmdDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgdGV4dGFyZWEgeyAgICAgIHBhZGRpbmc6IDVweCA4cHggMnB4IDhweDsgICAgICBvdmVyZmxvdzogaGlkZGVuOyAgICAgIHJlc2l6ZTogbm9uZTsgICAgICB2ZXJ0aWNhbC1hbGlnbjogdG9wOyAgICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIGlucHV0W3R5cGU9J2NoZWNrYm94J10geyAgICAgIG1hcmdpbjogNXB4IDAgMCAwOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0LCAjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdEFjdGl2ZSB7ICAgICAgcGFkZGluZy1sZWZ0OiAxMHB4OyAgICAgIHBhZGRpbmctcmlnaHQ6IDIwcHg7ICAgICAgZm9udC1zaXplOiAxMXB4OyAgICAgIHRleHQtYWxpZ246IGxlZnQ7ICAgICAgdGV4dC1zaGFkb3c6IDFweCAxcHggYmxhY2s7ICAgICAgY3Vyc29yOiBwb2ludGVyOyAgICAgIG92ZXJmbG93OiBoaWRkZW47ICAgICAgd2hpdGUtc3BhY2U6IG5vd3JhcDsgICAgICB0ZXh0LW92ZXJmbG93OiBlbGxpcHNpczsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnNlbGVjdCB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQkFBQUFBTENBWUFBQUIyNGcwNUFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFNTkpSRUZVZU5xY2tqRUt3akFVaGo4bDUzQVE1MjZCSEtLTEloU2xIa0h4QmtrdUlGV1BJTFFPUVFkM1Y0VnVYaWd1RmxyRlJQemhMWGw4MzN1QjEwdXpuQ2FQK3E0QkVxbHM4M1k1SGdoRnRPSDFhbWtBaXQyK0l3a216WElHdzVIZUZGdmZaRk5zL1dBNDBtbVc0NzBQMWdmOExva0pSQ0lWMTF2TjliYjQyQzZSS3ZvREFkaFgvUlh4cU84RzBGLzZGakJCUVNJVjgrbUUyWFRjYVZUdVRPbE8wUTM2Z0NuZHlWYnUvQTVIcDdmdndMeW1hZUJudUhOSUxRbS93Z0RQQVFBUE5Jc0huTzc5NFFBQUFBQkpSVTVFcmtKZ2dnPT0pIDEwMCUgNTAlIG5vLXJlcGVhdCwgLW8tbGluZWFyLWdyYWRpZW50KCMzYTQ2NGIgMCUsIHJnYmEoNDQsIDUyLCA1NSwgMCkgMTAwJSk7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQkFBQUFBTENBWUFBQUIyNGcwNUFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFNTkpSRUZVZU5xY2tqRUt3akFVaGo4bDUzQVE1MjZCSEtLTEloU2xIa0h4QmtrdUlGV1BJTFFPUVFkM1Y0VnVYaWd1RmxyRlJQemhMWGw4MzN1QjEwdXpuQ2FQK3E0QkVxbHM4M1k1SGdoRnRPSDFhbWtBaXQyK0l3a216WElHdzVIZUZGdmZaRk5zL1dBNDBtbVc0NzBQMWdmOExva0pSQ0lWMTF2TjliYjQyQzZSS3ZvREFkaFgvUlh4cU84RzBGLzZGakJCUVNJVjgrbUUyWFRjYVZUdVRPbE8wUTM2Z0NuZHlWYnUvQTVIcDdmdndMeW1hZUJudUhOSUxRbS93Z0RQQVFBUE5Jc0huTzc5NFFBQUFBQkpSVTVFcmtKZ2dnPT0pIDEwMCUgNTAlIG5vLXJlcGVhdCwgbGluZWFyLWdyYWRpZW50KCMzYTQ2NGIgMCUsIHJnYmEoNDQsIDUyLCA1NSwgMCkgMTAwJSk7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zZWxlY3Q6aG92ZXIsICNjb250cm9sS2l0IC5wYW5lbCAuc2VsZWN0QWN0aXZlIHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCQUFBQUFMQ0FZQUFBQjI0ZzA1QUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQU1OSlJFRlVlTnFja2pFS3dqQVVoajhsNTNBUTUyNkJIS0tMSWhTbEhrSHhCa2t1SUZXUElMUU9RUWQzVjRWdVhpZ3VGbHJGUlB6aExYbDgzM3VCMTB1em5DYVArcTRCRXFsczgzWTVIZ2hGdE9IMWFta0FpdDIrSXdrbXpYSUd3NUhlRkZ2ZlpGTnMvV0E0MG1tVzQ3MFAxZ2Y4TG9rSlJDSVYxMXZOOWJiNDJDNlJLdm9EQWRoWC9SWHhxTzhHMEYvNkZqQkJRU0lWOCttRTJYVGNhVlR1VE9sTzBRMzZnQ25keVZidS9BNUhwN2Z2d0x5bWFlQm51SE5JTFFtL3dnRFBBUUFQTklzSG5PNzk0UUFBQUFCSlJVNUVya0pnZ2c9PSkgMTAwJSA1MCUgbm8tcmVwZWF0LCAjM2M0OTRlOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAucHJlc2V0QnRuLCAjY29udHJvbEtpdCAucGFuZWwgLnByZXNldEJ0bkFjdGl2ZSB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgICAgICByaWdodDogMDsgICAgICB3aWR0aDogMjBweDsgICAgICBoZWlnaHQ6IDI1cHg7ICAgICAgbWFyZ2luOiAwIDAgMCAwOyAgICAgIGN1cnNvcjogcG9pbnRlcjsgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgYm9yZGVyOiBub25lOyAgICAgIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiAycHg7ICAgICAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDJweDsgICAgICBib3gtc2hhZG93OiAwIDAgMCAxcHggIzEzMTMxMyBpbnNldCwgLTFweCAycHggMCAwICMzMjNhNDQgaW5zZXQ7ICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzYjQ0NDc7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5wcmVzZXRCdG5BY3RpdmUsICNjb250cm9sS2l0IC5wYW5lbCAucHJlc2V0QnRuOmhvdmVyIHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUc1SlJFRlVlTnBpNU9EaWFtUmdZS2hqd0E0YW1WeDhneGptTDFyQzhQM3JWeFE4YitFU0JoZmZJQVptTlIyOUE1ZXZYV2RpWkdDMDE5WFNaR0JnWUdCWXZtWTl3N0kxNnhvWkdCZ2FXS0JHMVM5YnMrNC9Bd05EUFFNREExeVNnWUdCZ2RFblBBYlp6Z1kwbWdFd0FFOWxKVDFscnNmZkFBQUFBRWxGVGtTdVFtQ0MpIDUwJSA1MCUgbm8tcmVwZWF0LCAjM2M0OTRlOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAucHJlc2V0QnRuIHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUc1SlJFRlVlTnBpNU9EaWFtUmdZS2hqd0E0YW1WeDhneGptTDFyQzhQM3JWeFE4YitFU0JoZmZJQVptTlIyOUE1ZXZYV2RpWkdDMDE5WFNaR0JnWUdCWXZtWTl3N0kxNnhvWkdCZ2FXS0JHMVM5YnMrNC9Bd05EUFFNREExeVNnWUdCZ2RFblBBYlp6Z1kwbWdFd0FFOWxKVDFscnNmZkFBQUFBRWxGVGtTdVFtQ0MpIDUwJSA1MCUgbm8tcmVwZWF0LCAtby1saW5lYXItZ3JhZGllbnQoIzNhNDY0YiAwJSwgIzJjMzQzNyAxMDAlKTsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUc1SlJFRlVlTnBpNU9EaWFtUmdZS2hqd0E0YW1WeDhneGptTDFyQzhQM3JWeFE4YitFU0JoZmZJQVptTlIyOUE1ZXZYV2RpWkdDMDE5WFNaR0JnWUdCWXZtWTl3N0kxNnhvWkdCZ2FXS0JHMVM5YnMrNC9Bd05EUFFNREExeVNnWUdCZ2RFblBBYlp6Z1kwbWdFd0FFOWxKVDFscnNmZkFBQUFBRWxGVGtTdVFtQ0MpIDUwJSA1MCUgbm8tcmVwZWF0LCBsaW5lYXItZ3JhZGllbnQoIzNhNDY0YiAwJSwgIzJjMzQzNyAxMDAlKTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnNjcm9sbEJhciB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBjb250ZW50LWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGNvbnRlbnQtYm94OyAgICAgIGJveC1zaXppbmc6IGNvbnRlbnQtYm94OyAgICAgIHdpZHRoOiAxN3B4OyAgICAgIGhlaWdodDogMTAwJTsgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgdG9wOiAwOyAgICAgIHBhZGRpbmc6IDA7ICAgICAgbWFyZ2luOiAwOyAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsgICAgICBiYWNrZ3JvdW5kOiAjMjEyNjI4OyAgICAgIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCh0byByaWdodCwgIzE1MTgxYSAwJSwgcmdiYSgyNiwgMjksIDMxLCAwKSAxMDAlKTsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsQmFyIC50cmFjayB7ICAgICAgICBwYWRkaW5nOiAwIDNweCAwIDJweDsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zY3JvbGxCYXIgLnRyYWNrIC50aHVtYiB7ICAgICAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICB3aWR0aDogMTNweDsgICAgICAgICAgcG9zaXRpb246IGFic29sdXRlOyAgICAgICAgICBjdXJzb3I6IHBvaW50ZXI7ICAgICAgICAgIGJhY2tncm91bmQ6ICMzYjQ4NGU7ICAgICAgICAgIGJhY2tncm91bmQtaW1hZ2U6IC1vLWxpbmVhci1ncmFkaWVudCgjM2E0MTQ1IDAlLCAjMzYzYzQwIDEwMCUpOyAgICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQoIzNhNDE0NSAwJSwgIzM2M2M0MCAxMDAlKTsgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgIzE1MTgxYTsgICAgICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICAgICAgYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMCAwICM0MzRiNTA7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwIHsgICAgICB3aWR0aDogYXV0bzsgICAgICBoZWlnaHQ6IGF1dG87ICAgICAgbWFyZ2luOiAwOyAgICAgIHBhZGRpbmc6IDA7ICAgICAgcG9zaXRpb246IHJlbGF0aXZlOyAgICAgIG92ZXJmbG93OiBoaWRkZW47IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5pbnB1dFdQcmVzZXRXcmFwLCAjY29udHJvbEtpdCAucGFuZWwgLmNvbG9yV1ByZXNldFdyYXAgeyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIGZsb2F0OiBsZWZ0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuaW5wdXRXUHJlc2V0V3JhcCBpbnB1dFt0eXBlPSd0ZXh0J10sICNjb250cm9sS2l0IC5wYW5lbCAuY29sb3JXUHJlc2V0V3JhcCAuY29sb3IgeyAgICAgIHBhZGRpbmctcmlnaHQ6IDI1cHg7ICAgICAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDJweDsgICAgICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogMnB4OyAgICAgIGZsb2F0OiBsZWZ0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAudGV4dEFyZWFXcmFwIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgcGFkZGluZzogMDsgICAgICBmbG9hdDogbGVmdDsgICAgICBoZWlnaHQ6IDEwMCU7ICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgYm9yZGVyOiBub25lOyAgICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4wMTI1KSBpbnNldCwgMCAwIDFweCAxcHggIzExMTMxNCBpbnNldDsgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzYjQ0NDc7ICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzIyMjcyOTsgICAgICBib3gtc2hhZG93OiAwIDAgMXB4IDJweCByZ2JhKDAsIDAsIDAsIDAuMDEyNSkgaW5zZXQsIDAgMCAxcHggMXB4ICMxMTEzMTQgaW5zZXQ7ICAgICAgYmFja2dyb3VuZC1pbWFnZTogLW8tbGluZWFyLWdyYWRpZW50KHRyYW5zcGFyZW50IDAlLCByZ2JhKDAsIDAsIDAsIDAuMTI1KSAxMDAlKTsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCUsIHJnYmEoMCwgMCwgMCwgMC4xMjUpIDEwMCUpOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC50ZXh0QXJlYVdyYXAgdGV4dGFyZWEgeyAgICAgICAgYm9yZGVyOiBub25lOyAgICAgICAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDA7ICAgICAgICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogMDsgICAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgICAgYm94LXNoYWRvdzogbm9uZTsgICAgICAgIGJhY2tncm91bmQ6IG5vbmU7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLnRleHRBcmVhV3JhcCAuc2Nyb2xsQmFyIHsgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkICMxMDEyMTM7ICAgICAgICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogMnB4OyAgICAgICAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDJweDsgICAgICAgIGJvcmRlci1sZWZ0OiBub25lOyAgICAgICAgYm94LXNoYWRvdzogMCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjAxMjUpIGluc2V0LCAwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJYV3JhcCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlcllXcmFwIHsgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJYV3JhcCB7ICAgICAgYm90dG9tOiAwOyAgICAgIGxlZnQ6IDA7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgcGFkZGluZzogNnB4IDIwcHggNnB4IDZweDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWVdyYXAgeyAgICAgIHRvcDogMDsgICAgICByaWdodDogMDsgICAgICBoZWlnaHQ6IDEwMCU7ICAgICAgcGFkZGluZzogNnB4IDZweCAyMHB4IDZweDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlclkgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgYmFja2dyb3VuZDogcmdiYSgyNCwgMjcsIDI5LCAwLjUpOyAgICAgIGJvcmRlcjogMXB4IHNvbGlkICMxODFiMWQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlclggeyAgICAgIGhlaWdodDogOHB4OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJZIHsgICAgICB3aWR0aDogOHB4OyAgICAgIGhlaWdodDogMTAwJTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyYXBoU2xpZGVyWEhhbmRsZSwgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncmFwaFNsaWRlcllIYW5kbGUgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBjdXJzb3I6IHBvaW50ZXI7ICAgICAgYm9yZGVyOiAxcHggc29saWQgIzE4MWIxZDsgICAgICBiYWNrZ3JvdW5kOiAjMzAzNjM5OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJYSGFuZGxlIHsgICAgICB3aWR0aDogMjBweDsgICAgICBoZWlnaHQ6IDEwMCU7ICAgICAgYm9yZGVyLXRvcDogbm9uZTsgICAgICBib3JkZXItYm90dG9tOiBub25lOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JhcGhTbGlkZXJZSGFuZGxlIHsgICAgICB3aWR0aDogMTAwJTsgICAgICBoZWlnaHQ6IDIwcHg7ICAgICAgYm9yZGVyLWxlZnQ6IG5vbmU7ICAgICAgYm9yZGVyLXJpZ2h0OiBub25lOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuc2Nyb2xsV3JhcCB7ICAgICAgcG9zaXRpb246IHJlbGF0aXZlOyAgICAgIG92ZXJmbG93OiBoaWRkZW47IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zY3JvbGxCdWZmZXIgeyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIGhlaWdodDogOHB4OyAgICAgIGJvcmRlci10b3A6IDFweCBzb2xpZCAjM2I0NDQ3OyAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMWUyMjI0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCBjYW52YXMgeyAgICAgIGN1cnNvcjogcG9pbnRlcjsgICAgICB2ZXJ0aWNhbC1hbGlnbjogYm90dG9tOyAgICAgIGJvcmRlcjogbm9uZTsgICAgICBib3gtc2hhZG93OiAwIDAgMXB4IDJweCByZ2JhKDAsIDAsIDAsIDAuMDEyNSkgaW5zZXQsIDAgMCAxcHggMXB4ICMxMTEzMTQgaW5zZXQ7ICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjM2I0NDQ3OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuc3ZnV3JhcCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5jYW52YXNXcmFwIHsgICAgICBtYXJnaW46IDZweCAwIDAgMDsgICAgICBwb3NpdGlvbjogcmVsYXRpdmU7ICAgICAgd2lkdGg6IDcwJTsgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJvcmRlcjogbm9uZTsgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgYmFja2dyb3VuZDogIzFlMjIyNDsgICAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQodHJhbnNwYXJlbnQgMCUsIHJnYmEoMCwgMCwgMCwgMC4wNSkgMTAwJSk7ICAgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KHRyYW5zcGFyZW50IDAlLCByZ2JhKDAsIDAsIDAsIDAuMDUpIDEwMCUpOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zdmdXcmFwIHN2ZywgI2NvbnRyb2xLaXQgLnBhbmVsIC5jYW52YXNXcmFwIHN2ZyB7ICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7ICAgICAgICBsZWZ0OiAwOyAgICAgICAgdG9wOiAwOyAgICAgICAgY3Vyc29yOiBwb2ludGVyOyAgICAgICAgdmVydGljYWwtYWxpZ246IGJvdHRvbTsgICAgICAgIGJvcmRlcjogbm9uZTsgICAgICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4wMTI1KSBpbnNldCwgMCAwIDFweCAxcHggIzExMTMxNCBpbnNldDsgICAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzYjQ0NDc7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIHVsIHsgICAgICBtYXJnaW46IDA7ICAgICAgcGFkZGluZzogMDsgICAgICBsaXN0LXN0eWxlOiBub25lOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuaGVhZCB7ICAgICAgaGVpZ2h0OiAzOHB4OyAgICAgIGJvcmRlci10b3A6IDFweCBzb2xpZCAjNTY2MTY2OyAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMWExZDFmOyAgICAgIHBhZGRpbmc6IDAgMjBweCAwIDE1cHg7ICAgICAgYmFja2dyb3VuZC1pbWFnZTogLW8tbGluZWFyLWdyYWRpZW50KCMzYzRhNGYgMCUsICMzODNmNDcgMTAwJSk7ICAgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KCMzYzRhNGYgMCUsICMzODNmNDcgMTAwJSk7ICAgICAgY3Vyc29yOiBwb2ludGVyOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5oZWFkIC5sYWJlbCB7ICAgICAgICBmb250LXNpemU6IDEycHg7ICAgICAgICBsaW5lLWhlaWdodDogMzhweDsgICAgICAgIGNvbG9yOiB3aGl0ZTsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuaGVhZDpob3ZlciB7ICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiAtby1saW5lYXItZ3JhZGllbnQoIzNjNGE0ZiAwJSwgIzNjNGE0ZiAxMDAlKTsgICAgICAgIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCgjM2M0YTRmIDAlLCAjM2M0YTRmIDEwMCUpOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCBsaSB7ICAgICAgaGVpZ2h0OiAzNXB4OyAgICAgIHBhZGRpbmc6IDAgMTBweCAwIDEwcHg7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgeyAgICAgIHBhZGRpbmc6IDEwcHg7ICAgICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICMzYjQ0NDc7ICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMxZTIyMjQ7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgeyAgICAgICAgcGFkZGluZzogMDsgICAgICAgIG1hcmdpbi10b3A6IDZweDsgICAgICAgIGhlaWdodDogYXV0bzsgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkICMxZTIyMjQ7ICAgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICAgIGJveC1zaGFkb3c6IDAgMXB4IDAgMCAjM2I0NDQ3OyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgdWwgeyAgICAgICAgICBvdmVyZmxvdzogaGlkZGVuOyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXA6Zmlyc3QtY2hpbGQgeyAgICAgICAgICBtYXJnaW4tdG9wOiAwOyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLmhlYWQgeyAgICAgICAgICBoZWlnaHQ6IDI2cHg7ICAgICAgICAgIHBhZGRpbmc6IDAgMTBweCAwIDEwcHg7ICAgICAgICAgIGJvcmRlci10b3A6IG5vbmU7ICAgICAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMWUyMjI0OyAgICAgICAgICBib3JkZXItdG9wLWxlZnQtcmFkaXVzOiAycHg7ICAgICAgICAgIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiAycHg7ICAgICAgICAgIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7ICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICMyNTI4MmI7ICAgICAgICAgIGN1cnNvcjogcG9pbnRlcjsgfSAgICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLmhlYWQ6aG92ZXIgeyAgICAgICAgICAgIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7ICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzIyMjYyOTsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIGxpOm50aC1jaGlsZChvZGQpIHsgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzI5MmQzMDsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIGxpOm50aC1jaGlsZChldmVuKSB7ICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICMzMDM2Mzk7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAuaGVhZEluYWN0aXZlIHsgICAgICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIGhlaWdodDogMjZweDsgICAgICAgICAgcGFkZGluZzogMCAxMHB4IDAgMTBweDsgICAgICAgICAgYmFja2dyb3VuZC1pbWFnZTogLW8tbGluZWFyLWdyYWRpZW50KCMzYTQxNDUgMCUsICMzNjNjNDAgMTAwJSk7ICAgICAgICAgIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCgjM2E0MTQ1IDAlLCAjMzYzYzQwIDEwMCUpOyAgICAgICAgICBib3gtc2hhZG93OiAwIDFweCAwIDAgIzQzNGI1MCBpbnNldDsgICAgICAgICAgY3Vyc29yOiBwb2ludGVyOyB9ICAgICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAuaGVhZEluYWN0aXZlOmhvdmVyIHsgICAgICAgICAgICBiYWNrZ3JvdW5kLWltYWdlOiBub25lOyAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICMzYTQxNDU7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAuaGVhZCAubGFiZWwsICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAuaGVhZEluYWN0aXZlIC5sYWJlbCB7ICAgICAgICAgIG1hcmdpbjogMDsgICAgICAgICAgcGFkZGluZzogMDsgICAgICAgICAgbGluZS1oZWlnaHQ6IDI2cHg7ICAgICAgICAgIGNvbG9yOiB3aGl0ZTsgICAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7ICAgICAgICAgIGZvbnQtc2l6ZTogMTFweDsgICAgICAgICAgdGV4dC1zaGFkb3c6IDFweCAxcHggYmxhY2s7ICAgICAgICAgIHRleHQtdHJhbnNmb3JtOiBjYXBpdGFsaXplOyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLmhlYWQgLndyYXAgLmxhYmVsLCAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLmhlYWRJbmFjdGl2ZSAud3JhcCAubGFiZWwgeyAgICAgICAgICB3aWR0aDogMTAwJTsgICAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7ICAgICAgICAgIGNvbG9yOiB3aGl0ZTsgICAgICAgICAgcGFkZGluZzogMDsgfSAgICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLnN1Ykdyb3VwIC53cmFwIC5sYWJlbCB7ICAgICAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgICBoZWlnaHQ6IDEwMCU7ICAgICAgICAgIHdpZHRoOiAzMCU7ICAgICAgICAgIHBhZGRpbmc6IDEwcHggNXB4IDAgMDsgICAgICAgICAgZmxvYXQ6IGxlZnQ7ICAgICAgICAgIGZvbnQtc2l6ZTogMTFweDsgICAgICAgICAgZm9udC13ZWlnaHQ6IG5vcm1hbDsgICAgICAgICAgY29sb3I6ICNhZWI1Yjg7ICAgICAgICAgIHRleHQtc2hhZG93OiAxcHggMXB4IGJsYWNrOyB9ICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLndyYXAgLndyYXAgeyAgICAgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAgICAgd2lkdGg6IDcwJTsgICAgICAgICAgcGFkZGluZzogNnB4IDAgMCAwOyAgICAgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgICAgIGhlaWdodDogMTAwJTsgfSAgICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLndyYXAgLndyYXAgLndyYXAgeyAgICAgICAgICAgIHdpZHRoOiAyNSU7ICAgICAgICAgICAgcGFkZGluZzogMDsgICAgICAgICAgICBmbG9hdDogbGVmdDsgfSAgICAgICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAud3JhcCAud3JhcCAud3JhcCAubGFiZWwgeyAgICAgICAgICAgICAgd2lkdGg6IDEwMCU7ICAgICAgICAgICAgICBwYWRkaW5nOiA0cHggMCAwIDA7ICAgICAgICAgICAgICBjb2xvcjogIzg3ODc4NzsgICAgICAgICAgICAgIHRleHQtYWxpZ246IGNlbnRlcjsgICAgICAgICAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7ICAgICAgICAgICAgICBmb250LXdlaWdodDogYm9sZDsgICAgICAgICAgICAgIHRleHQtc2hhZG93OiAxcHggMXB4ICMxYTFhMWE7IH0gICAgICAgICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuc3ViR3JvdXAgLndyYXAgLndyYXAgLndyYXAgaW5wdXRbdHlwZT0ndGV4dCddIHsgICAgICAgICAgICAgIHBhZGRpbmc6IDA7ICAgICAgICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAud3JhcCB7ICAgICAgICAgIGJhY2tncm91bmQ6ICMyNTI4MmI7IH0gICAgICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cCAuc3ViR3JvdXBMaXN0IC5zdWJHcm91cCAud3JhcCAud3JhcCB7ICAgICAgICAgIGJhY2tncm91bmQ6IG5vbmU7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLmdyb3VwTGlzdCAuZ3JvdXAgLnN1Ykdyb3VwTGlzdCAuaGVhZCAud3JhcCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwIC5zdWJHcm91cExpc3QgLmhlYWRJbmFjdGl2ZSAud3JhcCB7ICAgICAgICBiYWNrZ3JvdW5kOiBub25lOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cDpsYXN0LWNoaWxkIC5zdWJHcm91cExpc3QsICNjb250cm9sS2l0IC5wYW5lbCAuZ3JvdXBMaXN0IC5ncm91cDpsYXN0LWNoaWxkIC5zY3JvbGxCdWZmZXI6bnRoLW9mLXR5cGUoMykgeyAgICAgIGJvcmRlci1ib3R0b206IG5vbmU7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5ncm91cExpc3QgLmdyb3VwOmxhc3QtY2hpbGQgLnNjcm9sbFdyYXAgLnN1Ykdyb3VwTGlzdCB7ICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMxZTIyMjQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC53cmFwU2xpZGVyIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgd2lkdGg6IDcwJTsgICAgICBwYWRkaW5nOiA2cHggMCAwIDA7ICAgICAgZmxvYXQ6IHJpZ2h0OyAgICAgIGhlaWdodDogMTAwJTsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAud3JhcFNsaWRlciBpbnB1dFt0eXBlPSd0ZXh0J10geyAgICAgICAgd2lkdGg6IDI1JTsgICAgICAgIHRleHQtYWxpZ246IGNlbnRlcjsgICAgICAgIHBhZGRpbmc6IDA7ICAgICAgICBmbG9hdDogcmlnaHQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zbGlkZXJXcmFwIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgZmxvYXQ6IGxlZnQ7ICAgICAgY3Vyc29yOiBldy1yZXNpemU7ICAgICAgd2lkdGg6IDcwJTsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLnNsaWRlclNsb3QgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICB3aWR0aDogMTAwJTsgICAgICBoZWlnaHQ6IDI1cHg7ICAgICAgcGFkZGluZzogM3B4OyAgICAgIGJhY2tncm91bmQtY29sb3I6ICMxZTIyMjQ7ICAgICAgYm9yZGVyOiBub25lOyAgICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4wMTI1KSBpbnNldCwgMCAwIDFweCAxcHggIzExMTMxNCBpbnNldDsgICAgICBib3JkZXItcmFkaXVzOiAycHg7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzYjQ0NDc7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5zbGlkZXJIYW5kbGUgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBwb3NpdGlvbjogcmVsYXRpdmU7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgaGVpZ2h0OiAxMDAlOyAgICAgIGJhY2tncm91bmQ6ICNiMzI0MzU7ICAgICAgYmFja2dyb3VuZC1pbWFnZTogLW8tbGluZWFyLWdyYWRpZW50KHRyYW5zcGFyZW50IDAlLCByZ2JhKDAsIDAsIDAsIDAuMSkgMTAwJSk7ICAgICAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KHRyYW5zcGFyZW50IDAlLCByZ2JhKDAsIDAsIDAsIDAuMSkgMTAwJSk7ICAgICAgYm94LXNoYWRvdzogMCAxcHggMCAwICMwZjBmMGY7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5jYW52YXNMaXN0SXRlbSwgI2NvbnRyb2xLaXQgLnBhbmVsIC5zdmdMaXN0SXRlbSB7ICAgICAgcGFkZGluZzogMCAxMHB4IDAgMTBweDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmFycm93U01heCB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHNUpSRUZVZU5waTVPRGlhbVJnWUtoandBNGFtVng4Z3hqbUwxckM4UDNyVnhROGIrRVNCaGZmSUFabU5SMjlBNWV2WFdkaVpHQzAxOVhTWkdCZ1lHQll2bVk5dzdJMTZ4b1pHQmdhV0tCRzFTOWJzKzQvQXdORFBRTURBMXlTZ1lHQmdkRW5QQWJaemdZMG1nRXdBRTlsSlQxbHJzZmZBQUFBQUVsRlRrU3VRbUNDKSBjZW50ZXIgbm8tcmVwZWF0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dTTWluIHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUZwSlJFRlVlTnBzaWlFT2dEQU1SZjhTeE5KeklZZkIxUFFrUTdSa1pjZkJZTG5iVUFzTDRjbjNYa2dzNk56WHFRQXdMK3ZlM1RUR0xXY0RnS1BXZDBvc2lFUmEzRnVudUxkSXBJa0ZpRVEyeHU4VUVvc0JVUHhqendBVFNqVi84cWxNR0FBQUFBQkpSVTVFcmtKZ2dnPT0pIGNlbnRlciBuby1yZXBlYXQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd1NNYXgsICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dTTWluIHsgICAgICB3aWR0aDogMTAwJTsgICAgICBoZWlnaHQ6IDIwcHg7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd0JNYXggeyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBREpKUkVGVWVOcHN5c0VOQUNBTUF6RTI5K2poQXhLbFBTbXZlSzJhc3pFSU1pSEk3VWZsYkNoSmZ4KzNBUUFBLy84REFQTGtTYW1IYXN0eEFBQUFBRWxGVGtTdVFtQ0MpIGNlbnRlciBuby1yZXBlYXQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd0JNaW4geyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFnQUFBQUZDQVlBQUFCNGthMVZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBQzlKUkVGVWVOcUVqREVPQUNBUWd4aDhPRC9IMlJoUGtrNDBBQWowbUt2aVMyVTNUaWVuMGlFM0FBQUEvLzhEQUVkMU50SUNWNEV1QUFBQUFFbEZUa1N1UW1DQykgY2VudGVyIG5vLXJlcGVhdDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmFycm93QlN1Yk1heCB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQW9BQUFBR0NBWUFBQUQ2OEEvR0FBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHSkpSRUZVZU5waTlBbVBZVUFHZXphdnEyZGdZR0J3OFExcVJCWm5RVmRrYWUvY0FHV2pLR1pXMDlGRFVXVHA0TUlncTZERXdNREE0SEJvMXpZR0pYWE5nM0NGeUlwZ0FGMHg4NlA3ZHhyUUZXRlR6T2dUSHRQQXdNQlF6NEFmTkFBR0FOMUNLUHM0TkRMdkFBQUFBRWxGVGtTdVFtQ0MpIGNlbnRlciBuby1yZXBlYXQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd0JTdWJNaW4geyAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFvQUFBQUdDQVlBQUFENjhBL0dBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBRzlKUkVGVWVOcDh6ckVPUURBQWhPRy9HRVNZQmJ0SnZBS0QxZUtCUk4rc0wxTk41N2E3aVNEaXBrdnVHMDZrV1NhQmxmL0laSm9YeXFxaHJPcFBZYzJPTlpxNDdYb1Z2SXRBREhsUmZDRUpiSEhiOVFBcWVDZEFqQ2UrSTRBVFBuRHc3b0VBa3RlbHpScDk5ZnR3REFDZnNTMFhBYno0UHdBQUFBQkpSVTVFcmtKZ2dnPT0pIGNlbnRlciBuby1yZXBlYXQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd0JNYXgsICNjb250cm9sS2l0IC5wYW5lbCAuYXJyb3dCTWluLCAjY29udHJvbEtpdCAucGFuZWwgLmFycm93QlN1Yk1heCwgI2NvbnRyb2xLaXQgLnBhbmVsIC5hcnJvd0JTdWJNaW4geyAgICAgIHdpZHRoOiAxMHB4OyAgICAgIGhlaWdodDogMTAwJTsgICAgICBmbG9hdDogcmlnaHQ7IH0gICNjb250cm9sS2l0IC5wYW5lbCAuc2l6ZUhhbmRsZSB7ICAgIGZsb2F0OiBsZWZ0OyAgICB3aWR0aDogMTBweDsgICAgaGVpZ2h0OiAxMDBweDsgICAgYm9yZGVyLWxlZnQ6IDEgcHk7IH0gICNjb250cm9sS2l0IC5wYW5lbCAubGFiZWwsICNjb250cm9sS2l0IC5waWNrZXIgLmxhYmVsIHsgICAgd2lkdGg6IDEwMCU7ICAgIGZsb2F0OiBsZWZ0OyAgICBmb250LXNpemU6IDExcHg7ICAgIGZvbnQtd2VpZ2h0OiBib2xkOyAgICB0ZXh0LXNoYWRvdzogMCAtMXB4IGJsYWNrOyAgICBvdmVyZmxvdzogaGlkZGVuOyAgICB3aGl0ZS1zcGFjZTogbm93cmFwOyAgICB0ZXh0LW92ZXJmbG93OiBlbGxpcHNpczsgICAgY3Vyc29yOiBkZWZhdWx0OyB9ICAjY29udHJvbEtpdCAucGFuZWwgLmhlYWQsICNjb250cm9sS2l0IC5waWNrZXIgLmhlYWQsICNjb250cm9sS2l0IC5wYW5lbCAucGFuZWxIZWFkSW5hY3RpdmUgeyAgICBoZWlnaHQ6IDMwcHg7ICAgIHBhZGRpbmc6IDAgMTBweCAwIDEwcHg7ICAgIGJhY2tncm91bmQ6ICMxYTFkMWY7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5oZWFkIC53cmFwLCAjY29udHJvbEtpdCAucGlja2VyIC5oZWFkIC53cmFwLCAjY29udHJvbEtpdCAucGFuZWwgLnBhbmVsSGVhZEluYWN0aXZlIC53cmFwIHsgICAgICB3aWR0aDogYXV0bzsgICAgICBoZWlnaHQ6IGF1dG87ICAgICAgbWFyZ2luOiAwOyAgICAgIHBhZGRpbmc6IDA7ICAgICAgcG9zaXRpb246IHJlbGF0aXZlOyAgICAgIG92ZXJmbG93OiBoaWRkZW47IH0gICNjb250cm9sS2l0IC5wYW5lbCAuaGVhZCwgI2NvbnRyb2xLaXQgLnBpY2tlciAuaGVhZCB7ICAgIGJvcmRlci10b3A6IDFweCBzb2xpZCAjMjAyNDI2OyAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzExMTMxNDsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLmhlYWQgLmxhYmVsLCAjY29udHJvbEtpdCAucGlja2VyIC5oZWFkIC5sYWJlbCB7ICAgICAgY3Vyc29yOiBwb2ludGVyOyAgICAgIGxpbmUtaGVpZ2h0OiAzMHB4OyAgICAgIGNvbG9yOiAjNjU2OTZiOyB9ICAjY29udHJvbEtpdCAucGFuZWwgLnBhbmVsSGVhZEluYWN0aXZlIHsgICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICMyMDI0MjY7IH0gICNjb250cm9sS2l0IC5wYW5lbCAubWVudSwgI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSB7ICAgIGZsb2F0OiByaWdodDsgICAgcGFkZGluZzogNXB4IDAgMCAwOyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAubWVudSBpbnB1dFt0eXBlPSdidXR0b24nXSwgI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSBpbnB1dFt0eXBlPSdidXR0b24nXSB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGN1cnNvcjogcG9pbnRlcjsgICAgICBoZWlnaHQ6IDIwcHg7ICAgICAgbWFyZ2luLWxlZnQ6IDRweDsgICAgICBib3JkZXI6IG5vbmU7ICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIGZvbnQtZmFtaWx5OiBhcmlhbCwgc2Fucy1zZXJpZjsgICAgICBmb250LXNpemU6IDEwcHg7ICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7ICAgICAgY29sb3I6ICNhYWFhYWE7ICAgICAgdGV4dC1zaGFkb3c6IDAgLTFweCBibGFjazsgICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyAgICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCAjMTMxMzEzIGluc2V0LCAtMXB4IDJweCAwIDAgIzIxMjUyNyBpbnNldDsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzI0MjkyYjsgfSAgICAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ0bkhpZGUsICNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnRuU2hvdywgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5DbG9zZSwgI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnRuSGlkZSwgI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnRuU2hvdywgI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnRuQ2xvc2UgeyAgICAgIHdpZHRoOiAyMHB4OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnRuSGlkZSwgI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnRuSGlkZSB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFHUkpSRUZVZU5waWRQVU5Zb0NCVTBjTzFETXdNRENZMlRnMHdzUllrQ1ZsRlpVYm9HeTRJbVpsZFUyNHBKeVNDZ08vb0JBREF3T0R3L1ZMNXhtazVSUU9Ncjk5L1JJdUNRUElpbGpNYkJ3WUdCZ1lHSDcvL01tQURDU2xaUmtrcFdVWkFBTUF2VHNnWEJ2T3NxMEFBQUFBU1VWT1JLNUNZSUk9KSA1MCUgNTAlIG5vLXJlcGVhdCwgIzFhMWQxZjsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnRuSGlkZTpob3ZlciwgI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnRuSGlkZTpob3ZlciB7ICAgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUdSSlJFRlVlTnBpZFBVTllvQ0JVMGNPMURNd01EQ1kyVGcwd3NSWWtDVmxGWlVib0d5NEltWmxkVTI0cEp5U0NnTy9vQkFEQXdPRHcvVkw1eG1rNVJRT01yOTkvUkl1Q1FQSWlsak1iQndZR0JnWUdINy8vTW1BRENTbFpSa2twV1VaQUFNQXZUc2dYQnZPc3EwQUFBQUFTVVZPUks1Q1lJST0pIDUwJSA1MCUgbm8tcmVwZWF0LCAjMTExMzE0OyAgICAgICAgYm94LXNoYWRvdzogMCAwIDAgMXB4ICMxMzEzMTMgaW5zZXQsIC0xcHggMnB4IDAgMCAjMTIxMzE0IGluc2V0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnRuU2hvdywgI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnRuU2hvdyB7ICAgICAgYmFja2dyb3VuZDogdXJsKGRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQWdBQUFBRkNBWUFBQUI0a2ExVkFBQUFDWEJJV1hNQUFBc1RBQUFMRXdFQW1wd1lBQUFLVDJsRFExQlFhRzkwYjNOb2IzQWdTVU5ESUhCeWIyWnBiR1VBQUhqYW5WTm5WRlBwRmozMzN2UkNTNGlBbEV0dlVoVUlJRkpDaTRBVWtTWXFJUWtRU29naG9ka1ZVY0VSUlVVRUc4aWdpQU9Pam9DTUZWRXNESW9LMkFma0lhS09nNk9JaXNyNzRYdWphOWE4OStiTi9yWFhQdWVzODUyenp3ZkFDQXlXU0ROUk5ZQU1xVUllRWVDRHg4VEc0ZVF1UUlFS0pIQUFFQWl6WkNGei9TTUJBUGgrUER3cklzQUh2Z0FCZU5NTENBREFUWnZBTUJ5SC93L3FRcGxjQVlDRUFjQjBrVGhMQ0lBVUFFQjZqa0ttQUVCR0FZQ2RtQ1pUQUtBRUFHRExZMkxqQUZBdEFHQW5mK2JUQUlDZCtKbDdBUUJibENFVkFhQ1JBQ0FUWlloRUFHZzdBS3pQVm9wRkFGZ3dBQlJtUzhRNUFOZ3RBREJKVjJaSUFMQzNBTURPRUF1eUFBZ01BREJSaUlVcEFBUjdBR0RJSXlONEFJU1pBQlJHOGxjODhTdXVFT2NxQUFCNG1iSTh1U1E1UllGYkNDMXhCMWRYTGg0b3pra1hLeFEyWVFKaG1rQXV3bm1aR1RLQk5BL2c4OHdBQUtDUkZSSGdnL1A5ZU00T3JzN09ObzYyRGw4dDZyOEcveUppWXVQKzVjK3JjRUFBQU9GMGZ0SCtMQyt6R29BN0JvQnQvcUlsN2dSb1hndWdkZmVMWnJJUFFMVUFvT25hVi9OdytINDhQRVdoa0xuWjJlWGs1TmhLeEVKYlljcFhmZjVud2wvQVYvMXMrWDQ4L1BmMTRMN2lKSUV5WFlGSEJQamd3c3owVEtVY3o1SUpoR0xjNW85SC9MY0wvL3dkMHlMRVNXSzVXQ29VNDFFU2NZNUVtb3p6TXFVaWlVS1NLY1VsMHY5azR0OHMrd00rM3pVQXNHbytBWHVSTGFoZFl3UDJTeWNRV0hUQTR2Y0FBUEs3YjhIVUtBZ0RnR2lENGM5My8rOC8vVWVnSlFDQVprbVNjUUFBWGtRa0xsVEtzei9IQ0FBQVJLQ0JLckJCRy9UQkdDekFCaHpCQmR6QkMveGdOb1JDSk1UQ1FoQkNDbVNBSEhKZ0theUNRaWlHemJBZEttQXYxRUFkTk1CUmFJYVRjQTR1d2xXNERqMXdEL3BoQ0o3QktMeUJDUVJCeUFnVFlTSGFpQUZpaWxnampnZ1htWVg0SWNGSUJCS0xKQ0RKaUJSUklrdVJOVWd4VW9wVUlGVklIZkk5Y2dJNWgxeEd1cEU3eUFBeWd2eUd2RWN4bElHeVVUM1VETFZEdWFnM0dvUkdvZ3ZRWkhReG1vOFdvSnZRY3JRYVBZdzJvZWZRcTJnUDJvOCtROGN3d09nWUJ6UEViREF1eHNOQ3NUZ3NDWk5qeTdFaXJBeXJ4aHF3VnF3RHU0bjFZOCt4ZHdRU2dVWEFDVFlFZDBJZ1lSNUJTRmhNV0U3WVNLZ2dIQ1EwRWRvSk53a0RoRkhDSnlLVHFFdTBKcm9SK2NRWVlqSXhoMWhJTENQV0VvOFRMeEI3aUVQRU55UVNpVU15SjdtUUFrbXhwRlRTRXRKRzBtNVNJK2tzcVpzMFNCb2prOG5hWkd1eUJ6bVVMQ0FyeUlYa25lVEQ1RFBrRytRaDhsc0tuV0pBY2FUNFUrSW9Vc3BxU2hubEVPVTA1UVpsbURKQlZhT2FVdDJvb1ZRUk5ZOWFRcTJodGxLdlVZZW9FelIxbWpuTmd4WkpTNld0b3BYVEdtZ1hhUGRwcitoMHVoSGRsUjVPbDlCWDBzdnBSK2lYNkFQMGR3d05oaFdEeDRobktCbWJHQWNZWnhsM0dLK1lUS1laMDRzWngxUXdOekhybU9lWkQ1bHZWVmdxdGlwOEZaSEtDcFZLbFNhVkd5b3ZWS21xcHFyZXFndFY4MVhMVkkrcFhsTjlya1pWTTFQanFRblVscXRWcXAxUTYxTWJVMmVwTzZpSHFtZW9iMVEvcEg1Wi9Za0dXY05NdzA5RHBGR2dzVi9qdk1ZZ0MyTVpzM2dzSVdzTnE0WjFnVFhFSnJITjJYeDJLcnVZL1IyN2l6MnFxYUU1UXpOS00xZXpVdk9VWmo4SDQ1aHgrSngwVGdubktLZVg4MzZLM2hUdktlSXBHNlkwVExreFpWeHJxcGFYbGxpclNLdFJxMGZydlRhdTdhZWRwcjFGdTFuN2dRNUJ4MG9uWENkSFo0L09CWjNuVTlsVDNhY0tweFpOUFRyMXJpNnFhNlVib2J0RWQ3OXVwKzZZbnI1ZWdKNU1iNmZlZWIzbitoeDlMLzFVL1czNnAvVkhERmdHc3d3a0J0c016aGc4eFRWeGJ6d2RMOGZiOFZGRFhjTkFRNlZobFdHWDRZU1J1ZEU4bzlWR2pVWVBqR25HWE9NazQyM0diY2FqSmdZbUlTWkxUZXBON3BwU1RibW1LYVk3VER0TXg4M016YUxOMXBrMW16MHgxekxubStlYjE1dmZ0MkJhZUZvc3RxaTJ1R1ZKc3VSYXBsbnV0cnh1aFZvNVdhVllWVnBkczBhdG5hMGwxcnV0dTZjUnA3bE9rMDZybnRabnc3RHh0c20ycWJjWnNPWFlCdHV1dG0yMmZXRm5ZaGRudDhXdXcrNlR2Wk45dW4yTi9UMEhEWWZaRHFzZFdoMStjN1J5RkRwV090NmF6cHp1UDMzRjlKYnBMMmRZenhEUDJEUGp0aFBMS2NScG5WT2IwMGRuRjJlNWM0UHppSXVKUzRMTExwYytMcHNieHQzSXZlUktkUFZ4WGVGNjB2V2RtN09id3UybzI2L3VOdTVwN29mY244dzBueW1lV1ROejBNUElRK0JSNWRFL0M1K1ZNR3Zmckg1UFEwK0JaN1huSXk5akw1RlhyZGV3dDZWM3F2ZGg3eGMrOWo1eW4rTSs0enczM2pMZVdWL01OOEMzeUxmTFQ4TnZubCtGMzBOL0kvOWsvM3IvMFFDbmdDVUJad09KZ1VHQld3TDcrSHA4SWIrT1B6cmJaZmF5MmUxQmpLQzVRUlZCajRLdGd1WEJyU0ZveU95UXJTSDM1NWpPa2M1cERvVlFmdWpXMEFkaDVtR0x3MzRNSjRXSGhWZUdQNDV3aUZnYTBUR1hOWGZSM0VOejMwVDZSSlpFM3B0bk1VODVyeTFLTlNvK3FpNXFQTm8zdWpTNlA4WXVabG5NMVZpZFdFbHNTeHc1TGlxdU5tNXN2dC84N2ZPSDRwM2lDK043RjVndnlGMXdlYUhPd3ZTRnB4YXBMaElzT3BaQVRJaE9PSlR3UVJBcXFCYU1KZklUZHlXT0NubkNIY0puSWkvUk50R0kyRU5jS2g1TzhrZ3FUWHFTN0pHOE5Ya2t4VE9sTE9XNWhDZXBrTHhNRFV6ZG16cWVGcHAySUcweVBUcTlNWU9Ta1pCeFFxb2hUWk8yWitwbjVtWjJ5NnhsaGJMK3hXNkx0eThlbFFmSmE3T1FyQVZaTFFxMlFxYm9WRm9vMXlvSHNtZGxWMmEvelluS09aYXJuaXZON2N5enl0dVFONXp2bi8vdEVzSVM0WksycFlaTFZ5MGRXT2E5ckdvNXNqeHhlZHNLNHhVRks0WldCcXc4dUlxMkttM1ZUNnZ0VjVldWZyMG1lazFyZ1Y3QnlvTEJ0UUZyNnd0VkN1V0ZmZXZjMSsxZFQxZ3ZXZCsxWWZxR25ScytGWW1LcmhUYkY1Y1ZmOWdvM0hqbEc0ZHZ5citaM0pTMHFhdkV1V1RQWnRKbTZlYmVMWjViRHBhcWwrYVhEbTROMmRxMERkOVd0TzMxOWtYYkw1Zk5LTnU3ZzdaRHVhTy9QTGk4WmFmSnpzMDdQMVNrVlBSVStsUTI3dExkdFdIWCtHN1I3aHQ3dlBZMDdOWGJXN3ozL1Q3SnZ0dFZBVlZOMVdiVlpmdEorN1AzUDY2SnF1bjRsdnR0WGExT2JYSHR4d1BTQS8wSEl3NjIxN25VMVIzU1BWUlNqOVlyNjBjT3h4KysvcDN2ZHkwTk5nMVZqWnpHNGlOd1JIbms2ZmNKMy9jZURUcmFkb3g3ck9FSDB4OTJIV2NkTDJwQ212S2FScHRUbXZ0YllsdTZUOHcrMGRicTNucjhSOXNmRDV3MFBGbDVTdk5VeVduYTZZTFRrMmZ5ejR5ZGxaMTlmaTc1M0dEYm9yWjc1MlBPMzJvUGIrKzZFSFRoMGtYL2krYzd2RHZPWFBLNGRQS3kyK1VUVjdoWG1xODZYMjNxZE9vOC9wUFRUOGU3bkx1YXJybGNhN251ZXIyMWUyYjM2UnVlTjg3ZDlMMTU4UmIvMXRXZU9UM2R2Zk42Yi9mRjkvWGZGdDErY2lmOXpzdTcyWGNuN3EyOFQ3eGY5RUR0UWRsRDNZZlZQMXYrM05qdjNIOXF3SGVnODlIY1IvY0doWVBQL3BIMWp3OURCWStaajh1R0RZYnJuamcrT1RuaVAzTDk2ZnluUTg5a3p5YWVGLzZpL3N1dUZ4WXZmdmpWNjlmTzBaalJvWmZ5bDVPL2JYeWwvZXJBNnhtdjI4YkN4aDYreVhnek1WNzBWdnZ0d1hmY2R4M3ZvOThQVCtSOElIOG8vMmo1c2ZWVDBLZjdreG1Uay84RUE1anovR016TGRzQUFBQWdZMGhTVFFBQWVpVUFBSUNEQUFENS93QUFnT2tBQUhVd0FBRHFZQUFBT3BnQUFCZHZrbC9GUmdBQUFGcEpSRUZVZU5wc2pERU9nQ0FRQk9jNGVxTmZvQ0I4d01yQ253ay84MkVIV0Vrd2NhdEpackt5ckZzR0x2NVgvSDZjcVBjNDFZOXB0VkxOMEJEVDNWc1RFVG5GdVZrV0lHdUlDV0JFdmZjaEFmejBtcXZaNEJlZUFRRHpWaU16SnkwUlhnQUFBQUJKUlU1RXJrSmdnZz09KSA1MCUgNTAlIG5vLXJlcGVhdCwgIzFhMWQxZjsgfSAgICAgICNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnRuU2hvdzpob3ZlciwgI2NvbnRyb2xLaXQgLnBpY2tlciAubWVudSAuYnRuU2hvdzpob3ZlciB7ICAgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFGQ0FZQUFBQjRrYTFWQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQUZwSlJFRlVlTnBzakRFT2dDQVFCT2M0ZXFOZm9DQjh3TXJDbndrLzgyRUhXRWt3Y2F0SlpyS3lyRnNHTHY1WC9INmNxUGM0MVk5cHRWTE4wQkRUM1ZzVEVUbkZ1VmtXSUd1SUNXQkV2ZmNoQWZ6MG1xdlo0QmVlQVFEelZpTXpKeTBSWGdBQUFBQkpSVTVFcmtKZ2dnPT0pIDUwJSA1MCUgbm8tcmVwZWF0LCAjMTExMzE0OyAgICAgICAgYm94LXNoYWRvdzogMCAwIDAgMXB4ICMxMzEzMTMgaW5zZXQsIC0xcHggMnB4IDAgMCAjMTIxMzE0IGluc2V0OyB9ICAgICNjb250cm9sS2l0IC5wYW5lbCAubWVudSAuYnRuQ2xvc2UsICNjb250cm9sS2l0IC5waWNrZXIgLm1lbnUgLmJ0bkNsb3NlIHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFKQ0FZQUFBQVBVMjB1QUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQVExSlJFRlVlTnBNMEQ5TEFtRUF4L0h2UFhlRFRxZVhwVmVZWWpwWUdRMWhCUTdTbnhmUTBwQTFGRVZicjZGZVJnWnVDYjJFb09DZ20yNnNwb0lnaUtCUVFhSVVudWNlVzI3d3QzNkhEL3dNTytuY0FuYTFWbDlqYklIdnRZQU5hMmxsdFlKaHVJSHZYVlZyOVpNb0hwWG1Gdy90cENPdFdDeCtMMHh6djFoZU9BNThMdzY4cHFkbnpsTnBsMURLTndzNDBHSDRrSnJLWEFwaE5nWi92MlR6QlpTVWJhQWhJckxaL2Y2Nm04eTR6QmFLL1BUN1hhQUJJQ0x6YkRnY2JPa3dKRlFLUGRJVGdlKzFBUXc3NmR5NDJkeHVmcTVFcUZRTGVCZENYUFI2SFY2ZUh6K005ZnIyWjhKeFhDVmxFemlOeUQzVHNxNlZrc29zVjVZM3RkWWRZR2ZzaHFlUjFqa0RJL0UvQU84cllSbHdYQnF1QUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsICMxYTFkMWY7IH0gICAgICAjY29udHJvbEtpdCAucGFuZWwgLm1lbnUgLmJ0bkNsb3NlOmhvdmVyLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5DbG9zZTpob3ZlciB7ICAgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBZ0FBQUFKQ0FZQUFBQVBVMjB1QUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQVExSlJFRlVlTnBNMEQ5TEFtRUF4L0h2UFhlRFRxZVhwVmVZWWpwWUdRMWhCUTdTbnhmUTBwQTFGRVZicjZGZVJnWnVDYjJFb09DZ20yNnNwb0lnaUtCUVFhSVVudWNlVzI3d3QzNkhEL3dNTytuY0FuYTFWbDlqYklIdnRZQU5hMmxsdFlKaHVJSHZYVlZyOVpNb0hwWG1Gdy90cENPdFdDeCtMMHh6djFoZU9BNThMdzY4cHFkbnpsTnBsMURLTndzNDBHSDRrSnJLWEFwaE5nWi92MlR6QlpTVWJhQWhJckxaL2Y2Nm04eTR6QmFLL1BUN1hhQUJJQ0x6YkRnY2JPa3dKRlFLUGRJVGdlKzFBUXc3NmR5NDJkeHVmcTVFcUZRTGVCZENYUFI2SFY2ZUh6K005ZnIyWjhKeFhDVmxFemlOeUQzVHNxNlZrc29zVjVZM3RkWWRZR2ZzaHFlUjFqa0RJL0UvQU84cllSbHdYQnF1QUFBQUFFbEZUa1N1UW1DQykgNTAlIDUwJSBuby1yZXBlYXQsICMxMTEzMTQ7ICAgICAgICBib3gtc2hhZG93OiAwIDAgMCAxcHggIzEzMTMxMyBpbnNldCwgLTFweCAycHggMCAwICMxMjEzMTQgaW5zZXQ7IH0gICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5VbmRvLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5VbmRvIHsgICAgICBiYWNrZ3JvdW5kOiB1cmwoZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBd0FBQUFMQ0FZQUFBQkxjR3hmQUFBQUNYQklXWE1BQUFzVEFBQUxFd0VBbXB3WUFBQUtUMmxEUTFCUWFHOTBiM05vYjNBZ1NVTkRJSEJ5YjJacGJHVUFBSGphblZOblZGUHBGajMzM3ZSQ1M0aUFsRXR2VWhVSUlGSkNpNEFVa1NZcUlRa1FTb2dob2RrVlVjRVJSVVVFRzhpZ2lBT09qb0NNRlZFc0RJb0syQWZrSWFLT2c2T0lpc3I3NFh1amE5YTg5K2JOL3JYWFB1ZXM4NTJ6endmQUNBeVdTRE5STllBTXFVSWVFZUNEeDhURzRlUXVRSUVLSkhBQUVBaXpaQ0Z6L1NNQkFQaCtQRHdySXNBSHZnQUJlTk1MQ0FEQVRadkFNQnlIL3cvcVFwbGNBWUNFQWNCMGtUaExDSUFVQUVCNmprS21BRUJHQVlDZG1DWlRBS0FFQUdETFkyTGpBRkF0QUdBbmYrYlRBSUNkK0psN0FRQmJsQ0VWQWFDUkFDQVRaWWhFQUdnN0FLelBWb3BGQUZnd0FCUm1TOFE1QU5ndEFEQkpWMlpJQUxDM0FNRE9FQXV5QUFnTUFEQlJpSVVwQUFSN0FHRElJeU40QUlTWkFCUkc4bGM4OFN1dUVPY3FBQUI0bWJJOHVTUTVSWUZiQ0MxeEIxZFhMaDRvemtrWEt4UTJZUUpobWtBdXdubVpHVEtCTkEvZzg4d0FBS0NSRlJIZ2cvUDllTTRPcnM3T05vNjJEbDh0NnI4Ry95SmlZdVArNWMrcmNFQUFBT0YwZnRIK0xDK3pHb0E3Qm9CdC9xSWw3Z1JvWGd1Z2RmZUxacklQUUxVQW9PbmFWL053K0g0OFBFV2hrTG5aMmVYazVOaEt4RUpiWWNwWGZmNW53bC9BVi8xcytYNDgvUGYxNEw3aUpJRXlYWUZIQlBqZ3dzejBUS1VjejVJSmhHTGM1bzlIL0xjTC8vd2QweUxFU1dLNVdDb1U0MUVTY1k1RW1venpNcVVpaVVLU0tjVWwwdjlrNHQ4cyt3TSszelVBc0dvK0FYdVJMYWhkWXdQMlN5Y1FXSFRBNHZjQUFQSzdiOEhVS0FnRGdHaUQ0YzkzLys4Ly9VZWdKUUNBWmttU2NRQUFYa1FrTGxUS3N6L0hDQUFBUktDQktyQkJHL1RCR0N6QUJoekJCZHpCQy94Z05vUkNKTVRDUWhCQ0NtU0FISEpnS2F5Q1FpaUd6YkFkS21BdjFFQWROTUJSYUlhVGNBNHV3bFc0RGoxd0QvcGhDSjdCS0x5QkNRUkJ5QWdUWVNIYWlBRmlpbGdqamdnWG1ZWDRJY0ZJQkJLTEpDREppQlJSSWt1Uk5VZ3hVb3BVSUZWSUhmSTljZ0k1aDF4R3VwRTd5QUF5Z3Z5R3ZFY3hsSUd5VVQzVURMVkR1YWczR29SR29ndlFaSFF4bW84V29KdlFjclFhUFl3Mm9lZlFxMmdQMm84K1E4Y3d3T2dZQnpQRWJEQXV4c05Dc1Rnc0NaTmp5N0VpckF5cnhocXdWcXdEdTRuMVk4K3hkd1FTZ1VYQUNUWUVkMElnWVI1QlNGaE1XRTdZU0tnZ0hDUTBFZG9KTndrRGhGSENKeUtUcUV1MEpyb1IrY1FZWWpJeGgxaElMQ1BXRW84VEx4QjdpRVBFTnlRU2lVTXlKN21RQWtteHBGVFNFdEpHMG01U0kra3NxWnMwU0Jvams4bmFaR3V5QnptVUxDQXJ5SVhrbmVURDVEUGtHK1FoOGxzS25XSkFjYVQ0VStJb1VzcHFTaG5sRU9VMDVRWmxtREpCVmFPYVV0Mm9vVlFSTlk5YVFxMmh0bEt2VVllb0V6UjFtam5OZ3haSlM2V3RvcFhUR21nWGFQZHByK2gwdWhIZGxSNU9sOUJYMHN2cFIraVg2QVAwZHd3TmhoV0R4NGhuS0JtYkdBY1laeGwzR0srWVRLWVowNHNaeDFRd056SHJtT2VaRDVsdlZWZ3F0aXA4RlpIS0NwVktsU2FWR3lvdlZLbXFwcXJlcWd0VjgxWExWSStwWGxOOXJrWlZNMVBqcVFuVWxxdFZxcDFRNjFNYlUyZXBPNmlIcW1lb2IxUS9wSDVaL1lrR1djTk13MDlEcEZHZ3NWL2p2TVlnQzJNWnMzZ3NJV3NOcTRaMWdUWEVKckhOMlh4MktydVkvUjI3aXoycXFhRTVRek5LTTFlelV2T1VaajhINDVoeCtKeDBUZ25uS0tlWDgzNkszaFR2S2VJcEc2WTBUTGt4WlZ4cnFwYVhsbGlyU0t0UnEwZnJ2VGF1N2FlZHByMUZ1MW43Z1E1Qngwb25YQ2RIWjQvT0JaM25VOWxUM2FjS3B4Wk5QVHIxcmk2cWE2VWJvYnRFZDc5dXArNllucjVlZ0o1TWI2ZmVlYjNuK2h4OUwvMVUvVzM2cC9WSERGZ0dzd3drQnRzTXpoZzh4VFZ4Ynp3ZEw4ZmI4VkZEWGNOQVE2VmhsV0dYNFlTUnVkRThvOVZHalVZUGpHbkdYT01rNDIzR2JjYWpKZ1ltSVNaTFRlcE43cHBTVGJtbUthWTdURHRNeDgzTXphTE4xcGsxbXoweDF6TG5tK2ViMTV2ZnQyQmFlRm9zdHFpMnVHVkpzdVJhcGxudXRyeHVoVm81V2FWWVZWcGRzMGF0bmEwbDFydXR1NmNScDdsT2swNnJudFpudzdEeHRzbTJxYmNac09YWUJ0dXV0bTIyZldGblloZG50OFd1dys2VHZaTjl1bjJOL1QwSERZZlpEcXNkV2gxK2M3UnlGRHBXT3Q2YXpwenVQMzNGOUpicEwyZFl6eERQMkRQanRoUExLY1JwblZPYjAwZG5GMmU1YzRQemlJdUpTNExMTHBjK0xwc2J4dDNJdmVSS2RQVnhYZUY2MHZXZG03T2J3dTJvMjYvdU51NXA3b2Zjbjh3MG55bWVXVE56ME1QSVErQlI1ZEUvQzUrVk1HdmZySDVQUTArQlo3WG5JeTlqTDVGWHJkZXd0NlYzcXZkaDd4Yys5ajV5bitNKzR6dzMzakxlV1YvTU44QzN5TGZMVDhOdm5sK0YzME4vSS85ay8zci8wUUNuZ0NVQlp3T0pnVUdCV3dMNytIcDhJYitPUHpyYlpmYXkyZTFCaktDNVFSVkJqNEt0Z3VYQnJTRm95T3lRclNIMzU1ak9rYzVwRG9WUWZ1alcwQWRoNW1HTHczNE1KNFdIaFZlR1A0NXdpRmdhMFRHWE5YZlIzRU56MzBUNlJKWkUzcHRuTVU4NXJ5MUtOU28rcWk1cVBObzN1alM2UDhZdVpsbk0xVmlkV0Vsc1N4dzVMaXF1Tm01c3Z0Lzg3Zk9INHAzaUMrTjdGNWd2eUYxd2VhSE93dlNGcHhhcExoSXNPcFpBVEloT09KVHdRUkFxcUJhTUpmSVRkeVdPQ25uQ0hjSm5JaS9STnRHSTJFTmNLaDVPOGtncVRYcVM3Skc4Tlhra3hUT2xMT1c1aENlcGtMeE1EVXpkbXpxZUZwcDJJRzB5UFRxOU1ZT1NrWkJ4UXFvaFRaTzJaK3BuNW1aMnk2eGxoYkwreFc2THR5OGVsUWZKYTdPUXJBVlpMUXEyUXFib1ZGb28xeW9Ic21kbFYyYS96WW5LT1phcm5pdk43Y3l6eXR1UU41enZuLy90RXNJUzRaSzJwWVpMVnkwZFdPYTlyR281c2p4eGVkc0s0eFVGSzRaV0Jxdzh1SXEyS20zVlQ2dnRWNWV1ZnIwbWVrMXJnVjdCeW9MQnRRRnI2d3RWQ3VXRmZldmMxKzFkVDFndldkKzFZZnFHblJzK0ZZbUtyaFRiRjVjVmY5Z28zSGpsRzRkdnlyK1ozSlMwcWF2RXVXVFBadEptNmViZUxaNWJEcGFxbCthWERtNE4yZHEwRGQ5V3RPMzE5a1hiTDVmTktOdTdnN1pEdWFPL1BMaThaYWZKenMwN1AxU2tWUFJVK2xRMjd0TGR0V0hYK0c3UjdodDd2UFkwN05YYlc3ejMvVDdKdnR0VkFWVk4xV2JWWmZ0Sis3UDNQNjZKcXVuNGx2dHRYYTFPYlhIdHh3UFNBLzBISXc2MjE3blUxUjNTUFZSU2o5WXI2MGNPeHgrKy9wM3ZkeTBOTmcxVmpaekc0aU53UkhuazZmY0ozL2NlRFRyYWRveDdyT0VIMHg5MkhXY2RMMnBDbXZLYVJwdFRtdnRiWWx1NlQ4dyswZGJxM25yOFI5c2ZENXcwUEZsNVN2TlV5V25hNllMVGsyZnl6NHlkbFoxOWZpNzUzR0Rib3JaNzUyUE8zMm9QYisrNkVIVGgwa1gvaStjN3ZEdk9YUEs0ZFBLeTIrVVRWN2hYbXE4NlgyM3FkT284L3BQVFQ4ZTduTHVhcnJsY2E3bnVlcjIxZTJiMzZSdWVOODdkOUwxNThSYi8xdFdlT1QzZHZmTjZiL2ZGOS9YZkZ0MStjaWY5enN1NzJYY243cTI4VDd4ZjlFRHRRZGxEM1lmVlAxdiszTmp2M0g5cXdIZWc4OUhjUi9jR2hZUFAvcEgxanc5REJZK1pqOHVHRFlicm5qZytPVG5pUDNMOTZmeW5RODlrenlhZUYvNmkvc3V1RnhZdmZ2alY2OWZPMFpqUm9aZnlsNU8vYlh5bC9lckE2eG12MjhiQ3hoNit5WGd6TVY3MFZ2dnR3WGZjZHgzdm85OFBUK1I4SUg4by8yajVzZlZUMEtmN2t4bVRrLzhFQTVqei9HTXpMZHNBQUFBZ1kwaFNUUUFBZWlVQUFJQ0RBQUQ1L3dBQWdPa0FBSFV3QUFEcVlBQUFPcGdBQUJkdmtsL0ZSZ0FBQVlWSlJFRlVlTnBja0QxSVcxRVlocDl6N3JtM29xa2h6Wi94RDZ0UjFFcEZLZWxnaGxCb25Wd0tEcGFXRG5icTJsVkYwTUhCVWJkQ3A1YUNVaWdkbklTZ29VUEFxV01sWXNHbE50WUsxWmh6enIxZFZHN3pidC9MOTd4ODd5Y2VUejBsckhLcCtCSllCSHF1ckcvQWZDNWYrQXdnd2tDNVZIeWJ5clRQZHZkbUE5ZjFCRUpRTy8vTFlXV2ZrK09mUzdsOFllRUdLSmVLcjdORDk5YVQ2UXpXbUhQZ0UrQUFNNDdyY25SNHdJL0svcVM4VHM5MGRxK2xNaDFZWTFhQkZ1QUY4QXlRVnV2TnJydDl4T0tKanlJYXUvTU9HSnA0OU9SaHJYWmg5cjd1YmdQUGMvbkNyM0EzNlRqRzkzMUhEWStPVHlqUDZ3OEFLUjAxTXZhZ2NGcXR4b0gvZ0xQVDN3ZXhSREtySXJkYmQ2VGo5QXNoY0QwUFFhVGEzQkk1b1VGYTEzc0lBaVR3eXJkMndXcU5xVi91QVIzQWNjT3JQeVJTYlVyWDYzL1VsYmZrKzM0RnhKZHlxZGdFTEFPM2dEZ3dQVEJ5LzNwdlJvV0MzZ01rVW0zcFNEVDZSa3FKY2wzaXlYUVFXSXMxWmdYWVVvMjM5ZzRNMXNLejFmbzdNQWRzQVB3YkFMOWhmdHZUbE5rZEFBQUFBRWxGVGtTdVFtQ0MpIDIwJSA1MCUgbm8tcmVwZWF0LCAjMWExZDFmOyAgICAgIHBhZGRpbmc6IDAgNnB4IDFweCAwOyAgICAgIHdpZHRoOiAzOHB4OyAgICAgIHZlcnRpY2FsLWFsaWduOiB0b3A7ICAgICAgdGV4dC1hbGlnbjogZW5kOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBhbmVsIC5tZW51IC5idG5VbmRvOmhvdmVyLCAjY29udHJvbEtpdCAucGlja2VyIC5tZW51IC5idG5VbmRvOmhvdmVyIHsgICAgICAgIGJhY2tncm91bmQ6IHVybChkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUF3QUFBQUxDQVlBQUFCTGNHeGZBQUFBQ1hCSVdYTUFBQXNUQUFBTEV3RUFtcHdZQUFBS1QybERRMUJRYUc5MGIzTm9iM0FnU1VORElIQnliMlpwYkdVQUFIamFuVk5uVkZQcEZqMzMzdlJDUzRpQWxFdHZVaFVJSUZKQ2k0QVVrU1lxSVFrUVNvZ2hvZGtWVWNFUlJVVUVHOGlnaUFPT2pvQ01GVkVzRElvSzJBZmtJYUtPZzZPSWlzcjc0WHVqYTlhODkrYk4vclhYUHVlczg1Mnp6d2ZBQ0F5V1NETlJOWUFNcVVJZUVlQ0R4OFRHNGVRdVFJRUtKSEFBRUFpelpDRnovU01CQVBoK1BEd3JJc0FIdmdBQmVOTUxDQURBVFp2QU1CeUgvdy9xUXBsY0FZQ0VBY0Iwa1RoTENJQVVBRUI2amtLbUFFQkdBWUNkbUNaVEFLQUVBR0RMWTJMakFGQXRBR0FuZitiVEFJQ2QrSmw3QVFCYmxDRVZBYUNSQUNBVFpZaEVBR2c3QUt6UFZvcEZBRmd3QUJSbVM4UTVBTmd0QURCSlYyWklBTEMzQU1ET0VBdXlBQWdNQURCUmlJVXBBQVI3QUdESUl5TjRBSVNaQUJSRzhsYzg4U3V1RU9jcUFBQjRtYkk4dVNRNVJZRmJDQzF4QjFkWExoNG96a2tYS3hRMllRSmhta0F1d25tWkdUS0JOQS9nODh3QUFLQ1JGUkhnZy9QOWVNNE9yczdPTm82MkRsOHQ2cjhHL3lKaVl1UCs1YytyY0VBQUFPRjBmdEgrTEMrekdvQTdCb0J0L3FJbDdnUm9YZ3VnZGZlTFpySVBRTFVBb09uYVYvTncrSDQ4UEVXaGtMbloyZVhrNU5oS3hFSmJZY3BYZmY1bndsL0FWLzFzK1g0OC9QZjE0TDdpSklFeVhZRkhCUGpnd3N6MFRLVWN6NUlKaEdMYzVvOUgvTGNMLy93ZDB5TEVTV0s1V0NvVTQxRVNjWTVFbW96ek1xVWlpVUtTS2NVbDB2OWs0dDhzK3dNKzN6VUFzR28rQVh1UkxhaGRZd1AyU3ljUVdIVEE0dmNBQVBLN2I4SFVLQWdEZ0dpRDRjOTMvKzgvL1VlZ0pRQ0Faa21TY1FBQVhrUWtMbFRLc3ovSENBQUFSS0NCS3JCQkcvVEJHQ3pBQmh6QkJkekJDL3hnTm9SQ0pNVENRaEJDQ21TQUhISmdLYXlDUWlpR3piQWRLbUF2MUVBZE5NQlJhSWFUY0E0dXdsVzREajF3RC9waENKN0JLTHlCQ1FSQnlBZ1RZU0hhaUFGaWlsZ2pqZ2dYbVlYNEljRklCQktMSkNESmlCUlJJa3VSTlVneFVvcFVJRlZJSGZJOWNnSTVoMXhHdXBFN3lBQXlndnlHdkVjeGxJR3lVVDNVRExWRHVhZzNHb1JHb2d2UVpIUXhtbzhXb0p2UWNyUWFQWXcyb2VmUXEyZ1AybzgrUThjd3dPZ1lCelBFYkRBdXhzTkNzVGdzQ1pOank3RWlyQXlyeGhxd1Zxd0R1NG4xWTgreGR3UVNnVVhBQ1RZRWQwSWdZUjVCU0ZoTVdFN1lTS2dnSENRMEVkb0pOd2tEaEZIQ0p5S1RxRXUwSnJvUitjUVlZakl4aDFoSUxDUFdFbzhUTHhCN2lFUEVOeVFTaVVNeUo3bVFBa214cEZUU0V0SkcwbTVTSStrc3FaczBTQm9qazhuYVpHdXlCem1VTENBcnlJWGtuZVRENURQa0crUWg4bHNLbldKQWNhVDRVK0lvVXNwcVNobmxFT1UwNVFabG1ESkJWYU9hVXQyb29WUVJOWTlhUXEyaHRsS3ZVWWVvRXpSMW1qbk5neFpKUzZXdG9wWFRHbWdYYVBkcHIraDB1aEhkbFI1T2w5Qlgwc3ZwUitpWDZBUDBkd3dOaGhXRHg0aG5LQm1iR0FjWVp4bDNHSytZVEtZWjA0c1p4MVF3TnpIcm1PZVpENWx2VlZncXRpcDhGWkhLQ3BWS2xTYVZHeW92VkttcXBxcmVxZ3RWODFYTFZJK3BYbE45cmtaVk0xUGpxUW5VbHF0VnFwMVE2MU1iVTJlcE82aUhxbWVvYjFRL3BINVovWWtHV2NOTXcwOURwRkdnc1YvanZNWWdDMk1aczNnc0lXc05xNFoxZ1RYRUpySE4yWHgyS3J1WS9SMjdpejJxcWFFNVF6TktNMWV6VXZPVVpqOEg0NWh4K0p4MFRnbm5LS2VYODM2SzNoVHZLZUlwRzZZMFRMa3haVnhycXBhWGxsaXJTS3RScTBmcnZUYXU3YWVkcHIxRnUxbjdnUTVCeDBvblhDZEhaNC9PQlozblU5bFQzYWNLcHhaTlBUcjFyaTZxYTZVYm9idEVkNzl1cCs2WW5yNWVnSjVNYjZmZWViM24raHg5TC8xVS9XMzZwL1ZIREZnR3N3d2tCdHNNemhnOHhUVnhiendkTDhmYjhWRkRYY05BUTZWaGxXR1g0WVNSdWRFOG85VkdqVVlQakduR1hPTWs0MjNHYmNhakpnWW1JU1pMVGVwTjdwcFNUYm1tS2FZN1REdE14ODNNemFMTjFwazFtejB4MXpMbm0rZWIxNXZmdDJCYWVGb3N0cWkydUdWSnN1UmFwbG51dHJ4dWhWbzVXYVZZVlZwZHMwYXRuYTBsMXJ1dHU2Y1JwN2xPazA2cm50Wm53N0R4dHNtMnFiY1pzT1hZQnR1dXRtMjJmV0ZuWWhkbnQ4V3V3KzZUdlpOOXVuMk4vVDBIRFlmWkRxc2RXaDErYzdSeUZEcFdPdDZhenB6dVAzM0Y5SmJwTDJkWXp4RFAyRFBqdGhQTEtjUnBuVk9iMDBkbkYyZTVjNFB6aUl1SlM0TExMcGMrTHBzYnh0M0l2ZVJLZFBWeFhlRjYwdldkbTdPYnd1Mm8yNi91TnU1cDdvZmNuOHcwbnltZVdUTnowTVBJUStCUjVkRS9DNStWTUd2ZnJINVBRMCtCWjdYbkl5OWpMNUZYcmRld3Q2VjNxdmRoN3hjKzlqNXluK00rNHp3MzNqTGVXVi9NTjhDM3lMZkxUOE52bmwrRjMwTi9JLzlrLzNyLzBRQ25nQ1VCWndPSmdVR0JXd0w3K0hwOEliK09QenJiWmZheTJlMUJqS0M1UVJWQmo0S3RndVhCclNGb3lPeVFyU0gzNTVqT2tjNXBEb1ZRZnVqVzBBZGg1bUdMdzM0TUo0V0hoVmVHUDQ1d2lGZ2EwVEdYTlhmUjNFTnozMFQ2UkpaRTNwdG5NVTg1cnkxS05TbytxaTVxUE5vM3VqUzZQOFl1WmxuTTFWaWRXRWxzU3h3NUxpcXVObTVzdnQvODdmT0g0cDNpQytON0Y1Z3Z5RjF3ZWFIT3d2U0ZweGFwTGhJc09wWkFUSWhPT0pUd1FSQXFxQmFNSmZJVGR5V09Dbm5DSGNKbklpL1JOdEdJMkVOY0toNU84a2dxVFhxUzdKRzhOWGtreFRPbExPVzVoQ2Vwa0x4TURVemRtenFlRnBwMklHMHlQVHE5TVlPU2taQnhRcW9oVFpPMlorcG41bVoyeTZ4bGhiTCt4VzZMdHk4ZWxRZkphN09RckFWWkxRcTJRcWJvVkZvbzF5b0hzbWRsVjJhL3pZbktPWmFybml2TjdjeXp5dHVRTjV6dm4vL3RFc0lTNFpLMnBZWkxWeTBkV09hOXJHbzVzanh4ZWRzSzR4VUZLNFpXQnF3OHVJcTJLbTNWVDZ2dFY1ZXVmcjBtZWsxcmdWN0J5b0xCdFFGcjZ3dFZDdVdGZmV2YzErMWRUMWd2V2QrMVlmcUduUnMrRlltS3JoVGJGNWNWZjlnbzNIamxHNGR2eXIrWjNKUzBxYXZFdVdUUFp0Sm02ZWJlTFo1YkRwYXFsK2FYRG00TjJkcTBEZDlXdE8zMTlrWGJMNWZOS051N2c3WkR1YU8vUExpOFphZkp6czA3UDFTa1ZQUlUrbFEyN3RMZHRXSFgrRzdSN2h0N3ZQWTA3TlhiVzd6My9UN0p2dHRWQVZWTjFXYlZaZnRKKzdQM1A2NkpxdW40bHZ0dFhhMU9iWEh0eHdQU0EvMEhJdzYyMTduVTFSM1NQVlJTajlZcjYwY094eCsrL3AzdmR5ME5OZzFWalp6RzRpTndSSG5rNmZjSjMvY2VEVHJhZG94N3JPRUgweDkySFdjZEwycENtdkthUnB0VG12dGJZbHU2VDh3KzBkYnEzbnI4UjlzZkQ1dzBQRmw1U3ZOVXlXbmE2WUxUazJmeXo0eWRsWjE5Zmk3NTNHRGJvclo3NTJQTzMyb1BiKys2RUhUaDBrWC9pK2M3dkR2T1hQSzRkUEt5MitVVFY3aFhtcTg2WDIzcWRPbzgvcFBUVDhlN25MdWFycmxjYTdudWVyMjFlMmIzNlJ1ZU44N2Q5TDE1OFJiLzF0V2VPVDNkdmZONmIvZkY5L1hmRnQxK2NpZjl6c3U3MlhjbjdxMjhUN3hmOUVEdFFkbEQzWWZWUDF2KzNOanYzSDlxd0hlZzg5SGNSL2NHaFlQUC9wSDFqdzlEQlkrWmo4dUdEWWJybmpnK09UbmlQM0w5NmZ5blE4OWt6eWFlRi82aS9zdXVGeFl2ZnZqVjY5Zk8wWmpSb1pmeWw1Ty9iWHlsL2VyQTZ4bXYyOGJDeGg2K3lYZ3pNVjcwVnZ2dHdYZmNkeDN2bzk4UFQrUjhJSDhvLzJqNXNmVlQwS2Y3a3htVGsvOEVBNWp6L0dNekxkc0FBQUFnWTBoU1RRQUFlaVVBQUlDREFBRDUvd0FBZ09rQUFIVXdBQURxWUFBQU9wZ0FBQmR2a2wvRlJnQUFBWVZKUkVGVWVOcGNrRDFJVzFFWWhwOXo3cm0zb3FraHpaL3hENnRSMUVwRktlbGdobEJvblZ3S0RwYVdEbmJxMmxWRjBNSEJVYmRDcDVhQ1VpZ2RuSVNnb1VQQXFXTWxZc0dsTnRZSzFaaHp6cjFkVkc3emJ0L0w5N3g4N3ljZVR6MGxySEtwK0JKWUJIcXVyRy9BZkM1ZitBd2d3a0M1Vkh5YnlyVFBkdmRtQTlmMUJFSlFPLy9MWVdXZmsrT2ZTN2w4WWVFR0tKZUtyN05EOTlhVDZReldtSFBnRStBQU00N3JjblI0d0kvSy9xUzhUczkwZHErbE1oMVlZMWFCRnVBRjhBeVFWdXZOcnJ0OXhPS0pqeUlhdS9NT0dKcDQ5T1JoclhaaDlyN3ViZ1BQYy9uQ3IzQTM2VGpHOTMxSERZK09UeWpQNnc4QUtSMDFNdmFnY0ZxdHhvSC9nTFBUM3dleFJES3JJcmRiZDZUajlBc2hjRDBQUWFUYTNCSTVvVUZhMTNzSUFpVHd5cmQyd1dxTnFWL3VBUjNBY2NPclB5UlNiVXJYNjMvVWxiZmsrMzRGeEpkeXFkZ0VMQU8zZ0Rnd1BUQnkvM3B2Um9XQzNnTWtVbTNwU0RUNlJrcUpjbDNpeVhRUVdJczFaZ1hZVW8yMzlnNE0xc0t6MWZvN01BZHNBUHdiQUw5aGZ0dlRsTmtkQUFBQUFFbEZUa1N1UW1DQykgMjAlIDUwJSBuby1yZXBlYXQsICMxMTEzMTQ7ICAgICAgICBib3gtc2hhZG93OiAwIDAgMCAxcHggIzEzMTMxMyBpbnNldCwgLTFweCAycHggMCAwICMxMjEzMTQgaW5zZXQ7IH0gICNjb250cm9sS2l0IC5waWNrZXIgeyAgICBwb2ludGVyLWV2ZW50czogYXV0bzsgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgIGJhY2tncm91bmQtY29sb3I6ICMzMDM2Mzk7ICAgIGZvbnQtZmFtaWx5OiBhcmlhbCwgc2Fucy1zZXJpZjsgICAgZm9udC1zaXplOiAxMXB4OyAgICBjb2xvcjogd2hpdGU7ICAgIHRleHQtc2hhZG93OiAxcHggMXB4IGJsYWNrOyAgICBwb3NpdGlvbjogYWJzb2x1dGU7ICAgIHotaW5kZXg6IDIxNDc0ODM2MzE7ICAgIHdpZHRoOiAzNjBweDsgICAgLXdlYmtpdC10b3VjaC1jYWxsb3V0OiBub25lOyAgICAtd2Via2l0LXVzZXItc2VsZWN0OiBub25lOyAgICAta2h0bWwtdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1tb3otdXNlci1zZWxlY3Q6IG5vbmU7ICAgIC1tcy11c2VyLXNlbGVjdDogbm9uZTsgICAgdXNlci1zZWxlY3Q6IG5vbmU7ICAgIGJveC1zaGFkb3c6IDAgMCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4yNSk7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciBjYW52YXMgeyAgICAgIHZlcnRpY2FsLWFsaWduOiBib3R0b207ICAgICAgY3Vyc29yOiBwb2ludGVyOyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgeyAgICAgIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBwYWRkaW5nOiAxMHB4OyAgICAgIGZsb2F0OiBsZWZ0OyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkV3JhcCB7ICAgICAgcGFkZGluZzogM3B4OyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLnNsaWRlcldyYXAgeyAgICAgIHBhZGRpbmc6IDNweCAxM3B4IDNweCAzcHg7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuZmllbGRXcmFwLCAjY29udHJvbEtpdCAucGlja2VyIC5zbGlkZXJXcmFwLCAjY29udHJvbEtpdCAucGlja2VyIC5pbnB1dFdyYXAgeyAgICAgIGhlaWdodDogYXV0bzsgICAgICBvdmVyZmxvdzogaGlkZGVuOyAgICAgIGZsb2F0OiBsZWZ0OyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0V3JhcCB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJvcmRlcjogMXB4IHNvbGlkICMxZTIyMjQ7ICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIGJveC1zaGFkb3c6IDAgMXB4IDAgMCAjM2I0NDQ3OyAgICAgIHdpZHRoOiAxNDBweDsgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgcGFkZGluZzogNXB4IDEwcHggMXB4IDA7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXRGaWVsZCB7ICAgICAgd2lkdGg6IDUwJTsgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgbWFyZ2luLWJvdHRvbTogNHB4OyB9ICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuaW5wdXRGaWVsZCAubGFiZWwgeyAgICAgICAgcGFkZGluZzogNHB4IDAgMCAwOyAgICAgICAgY29sb3I6ICM4Nzg3ODc7ICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7ICAgICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7ICAgICAgICB0ZXh0LXNoYWRvdzogMXB4IDFweCAjMWExYTFhOyAgICAgICAgd2lkdGg6IDQwJTsgfSAgICAgICNjb250cm9sS2l0IC5waWNrZXIgLmlucHV0RmllbGQgLndyYXAgeyAgICAgICAgcGFkZGluZzogMDsgICAgICAgIHdpZHRoOiA2MCU7ICAgICAgICBoZWlnaHQ6IGF1dG87ICAgICAgICBmbG9hdDogcmlnaHQ7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuY29udHJvbHNXcmFwIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgd2lkdGg6IDEwMCU7ICAgICAgaGVpZ2h0OiBhdXRvOyAgICAgIGZsb2F0OiByaWdodDsgICAgICBwYWRkaW5nOiA5cHggMCAwIDA7IH0gICAgICAjY29udHJvbEtpdCAucGlja2VyIC5jb250cm9sc1dyYXAgaW5wdXRbdHlwZT0nYnV0dG9uJ10geyAgICAgICAgZmxvYXQ6IHJpZ2h0OyAgICAgICAgd2lkdGg6IDY1cHg7ICAgICAgICBtYXJnaW46IDAgMCAwIDEwcHg7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuY29sb3JDb250cmFzdCB7ICAgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJvcmRlcjogbm9uZTsgICAgICBib3gtc2hhZG93OiAwIDAgMXB4IDJweCByZ2JhKDAsIDAsIDAsIDAuMDEyNSkgaW5zZXQsIDAgMCAxcHggMXB4ICMxMTEzMTQgaW5zZXQ7ICAgICAgYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIC1tb3otYm9yZGVyLXJhZGl1czogMnB4OyAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjM2I0NDQ3OyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIGhlaWdodDogMjVweDsgICAgICBwYWRkaW5nOiAzcHg7ICAgICAgd2lkdGg6IDgwJTsgICAgICBtYXJnaW4tYm90dG9tOiA0cHg7ICAgICAgZmxvYXQ6IHJpZ2h0OyB9ICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuY29sb3JDb250cmFzdCBkaXYgeyAgICAgICAgd2lkdGg6IDUwJTsgICAgICAgIGhlaWdodDogMTAwJTsgICAgICAgIGZsb2F0OiBsZWZ0OyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgaW5wdXRbdHlwZT0ndGV4dCddIHsgICAgICBwYWRkaW5nOiAwOyAgICAgIHRleHQtYWxpZ246IGNlbnRlcjsgICAgICB3aWR0aDogNjAlOyAgICAgIGZsb2F0OiByaWdodDsgfSAgICAjY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dFdyYXA6bnRoLW9mLXR5cGUoMykgeyAgICAgIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDA7ICAgICAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDA7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXRXcmFwOm50aC1vZi10eXBlKDQpIHsgICAgICBib3JkZXItdG9wOiBub25lOyAgICAgIGJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDA7ICAgICAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDA7IH0gICAgICAjY29udHJvbEtpdCAucGlja2VyIC53cmFwIC5pbnB1dFdyYXA6bnRoLW9mLXR5cGUoNCkgLmlucHV0RmllbGQgeyAgICAgICAgd2lkdGg6IDEwMCU7IH0gICAgICAgICNjb250cm9sS2l0IC5waWNrZXIgLndyYXAgLmlucHV0V3JhcDpudGgtb2YtdHlwZSg0KSAuaW5wdXRGaWVsZCAubGFiZWwgeyAgICAgICAgICB3aWR0aDogMjAlOyB9ICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAud3JhcCAuaW5wdXRXcmFwOm50aC1vZi10eXBlKDQpIGlucHV0W3R5cGU9J3RleHQnXSB7ICAgICAgICB3aWR0aDogODAlOyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkV3JhcCwgI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyV3JhcCB7ICAgICAgYmFja2dyb3VuZDogIzFlMjIyNDsgICAgICBib3JkZXI6IG5vbmU7ICAgICAgYm94LXNoYWRvdzogMCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjAxMjUpIGluc2V0LCAwIDAgMXB4IDFweCAjMTExMzE0IGluc2V0OyAgICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgICAtbW96LWJvcmRlci1yYWRpdXM6IDJweDsgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzNiNDQ0NzsgICAgICBwb3NpdGlvbjogcmVsYXRpdmU7ICAgICAgbWFyZ2luLXJpZ2h0OiA1cHg7IH0gICAgICAjY29udHJvbEtpdCAucGlja2VyIC5maWVsZFdyYXAgLmluZGljYXRvciwgI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyV3JhcCAuaW5kaWNhdG9yIHsgICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgICAgICAgIGJvcmRlcjogMnB4IHNvbGlkIHdoaXRlOyAgICAgICAgYm94LXNoYWRvdzogMCAxcHggYmxhY2ssIDAgMXB4IGJsYWNrIGluc2V0OyAgICAgICAgY3Vyc29yOiBwb2ludGVyOyB9ICAgICNjb250cm9sS2l0IC5waWNrZXIgLmZpZWxkV3JhcCAuaW5kaWNhdG9yIHsgICAgICB3aWR0aDogOHB4OyAgICAgIGhlaWdodDogOHB4OyAgICAgIGxlZnQ6IDUwJTsgICAgICB0b3A6IDUwJTsgICAgICBib3JkZXItcmFkaXVzOiA1MCU7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiA1MCU7IH0gICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyV3JhcCAuaW5kaWNhdG9yIHsgICAgICB3aWR0aDogMTRweDsgICAgICBoZWlnaHQ6IDNweDsgICAgICBib3JkZXItcmFkaXVzOiA4cHg7ICAgICAgLW1vei1ib3JkZXItcmFkaXVzOiA4cHg7ICAgICAgbGVmdDogMXB4OyAgICAgIHRvcDogMXB4OyB9ICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyV3JhcCAuaW5kaWNhdG9yOmFmdGVyIHsgICAgICAgIGNvbnRlbnQ6ICcnOyAgICAgICAgd2lkdGg6IDA7ICAgICAgICBoZWlnaHQ6IDA7ICAgICAgICBib3JkZXItdG9wOiA0LjVweCBzb2xpZCB0cmFuc3BhcmVudDsgICAgICAgIGJvcmRlci1ib3R0b206IDQuNXB4IHNvbGlkIHRyYW5zcGFyZW50OyAgICAgICAgYm9yZGVyLXJpZ2h0OiA0cHggc29saWQgd2hpdGU7ICAgICAgICBmbG9hdDogcmlnaHQ7ICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7ICAgICAgICB0b3A6IC0ycHg7ICAgICAgICBsZWZ0OiAxOXB4OyB9ICAgICAgI2NvbnRyb2xLaXQgLnBpY2tlciAuc2xpZGVyV3JhcCAuaW5kaWNhdG9yOmJlZm9yZSB7ICAgICAgICBjb250ZW50OiAnJzsgICAgICAgIHdpZHRoOiAwOyAgICAgICAgaGVpZ2h0OiAwOyAgICAgICAgYm9yZGVyLXRvcDogNC41cHggc29saWQgdHJhbnNwYXJlbnQ7ICAgICAgICBib3JkZXItYm90dG9tOiA0LjVweCBzb2xpZCB0cmFuc3BhcmVudDsgICAgICAgIGJvcmRlci1yaWdodDogNHB4IHNvbGlkIGJsYWNrOyAgICAgICAgZmxvYXQ6IHJpZ2h0OyAgICAgICAgcG9zaXRpb246IGFic29sdXRlOyAgICAgICAgdG9wOiAtM3B4OyAgICAgICAgbGVmdDogMTlweDsgfSAgI2NvbnRyb2xLaXQgLm9wdGlvbnMgeyAgICBwb2ludGVyLWV2ZW50czogYXV0bzsgICAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgIGJvcmRlcjogMXB4IHNvbGlkICMxMzEzMTM7ICAgIGJvcmRlci1yYWRpdXM6IDJweDsgICAgLW1vei1ib3JkZXItcmFkaXVzOiAycHg7ICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgICAgbGVmdDogMDsgICAgdG9wOiAwOyAgICB3aWR0aDogYXV0bzsgICAgaGVpZ2h0OiBhdXRvOyAgICB6LWluZGV4OiAyMTQ3NDgzNjM4OyAgICBmb250LWZhbWlseTogYXJpYWwsIHNhbnMtc2VyaWY7ICAgIGZvbnQtc2l6ZTogMTFweDsgICAgY29sb3I6IHdoaXRlOyAgICB0ZXh0LXNoYWRvdzogMXB4IDFweCBibGFjazsgICAgYm94LXNoYWRvdzogMCAxcHggMCAwICM1NjYxNjYgaW5zZXQ7ICAgIG92ZXJmbG93OiBoaWRkZW47ICAgIGJhY2tncm91bmQtY29sb3I6ICMzYzQ5NGU7IH0gICAgI2NvbnRyb2xLaXQgLm9wdGlvbnMgdWwgeyAgICAgIHdpZHRoOiAxMDAlOyAgICAgIGxpc3Qtc3R5bGU6IG5vbmU7ICAgICAgbWFyZ2luOiAwOyAgICAgIHBhZGRpbmc6IDA7IH0gICAgICAjY29udHJvbEtpdCAub3B0aW9ucyB1bCBsaSB7ICAgICAgICBtYXJnaW46IDA7ICAgICAgICB3aWR0aDogMTAwJTsgICAgICAgIGhlaWdodDogMjhweDsgICAgICAgIGxpbmUtaGVpZ2h0OiAyOHB4OyAgICAgICAgcGFkZGluZzogMCAyMHB4IDAgMTBweDsgICAgICAgIG92ZXJmbG93OiBoaWRkZW47ICAgICAgICB3aGl0ZS1zcGFjZTogbm9ybWFsOyAgICAgICAgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7ICAgICAgICBjdXJzb3I6IHBvaW50ZXI7IH0gICAgICAgICNjb250cm9sS2l0IC5vcHRpb25zIHVsIGxpOmhvdmVyIHsgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzFmMjMyNTsgfSAgICAgICNjb250cm9sS2l0IC5vcHRpb25zIHVsIC5saVNlbGVjdGVkIHsgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICMyOTJkMzA7IH0gICAgI2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIHsgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7IH0gICAgICAjY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgbGksICNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciAubGlTZWxlY3RlZCB7ICAgICAgICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7ICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyAgICAgICAgcGFkZGluZzogMDsgICAgICAgIGhlaWdodDogMjVweDsgICAgICAgIGxpbmUtaGVpZ2h0OiAyNXB4OyAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyOyB9ICAgICAgICAjY29udHJvbEtpdCAub3B0aW9ucyAuY29sb3IgbGk6aG92ZXIsICNjb250cm9sS2l0IC5vcHRpb25zIC5jb2xvciAubGlTZWxlY3RlZDpob3ZlciB7ICAgICAgICAgIGJhY2tncm91bmQ6IG5vbmU7ICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkOyB9ICAgICAgI2NvbnRyb2xLaXQgLm9wdGlvbnMgLmNvbG9yIC5saVNlbGVjdGVkIHsgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkOyB9XCJcbn07IFxubW9kdWxlLmV4cG9ydHMgPSBTdHlsZTsiLCJmdW5jdGlvbiBFdmVudF8oc2VuZGVyLHR5cGUsZGF0YSkge1xuICAgIHRoaXMuc2VuZGVyID0gc2VuZGVyO1xuICAgIHRoaXMudHlwZSAgID0gdHlwZTtcbiAgICB0aGlzLmRhdGEgICA9IGRhdGE7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50XzsiLCJmdW5jdGlvbiBFdmVudERpc3BhdGNoZXIoKSB7XG4gICAgdGhpcy5fbGlzdGVuZXJzID0gW107XG59XG5cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUgPSB7XG4gICAgYWRkRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gKGV2ZW50VHlwZSwgbGlzdGVuZXIsIGNhbGxiYWNrTWV0aG9kKSB7XG4gICAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudFR5cGVdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50VHlwZV0gfHwgW107XG4gICAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudFR5cGVdLnB1c2goe29iajogbGlzdGVuZXIsIG1ldGhvZDogY2FsbGJhY2tNZXRob2R9KTtcbiAgICB9LFxuXG4gICAgZGlzcGF0Y2hFdmVudDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHZhciB0eXBlID0gZXZlbnQudHlwZTtcblxuICAgICAgICBpZiAoIXRoaXMuaGFzRXZlbnRMaXN0ZW5lcih0eXBlKSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuICAgICAgICB2YXIgaSA9IC0xLCBsID0gbGlzdGVuZXJzLmxlbmd0aDtcblxuICAgICAgICB2YXIgb2JqLCBtZXRob2Q7XG5cbiAgICAgICAgd2hpbGUgKCsraSA8IGwpIHtcbiAgICAgICAgICAgIG9iaiA9IGxpc3RlbmVyc1tpXS5vYmo7XG4gICAgICAgICAgICBtZXRob2QgPSBsaXN0ZW5lcnNbaV0ubWV0aG9kO1xuXG4gICAgICAgICAgICBpZiAoIW9ialttZXRob2RdKXtcbiAgICAgICAgICAgICAgICB0aHJvdyBvYmogKyAnIGhhcyBubyBtZXRob2QgJyArIG1ldGhvZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb2JqW21ldGhvZF0oZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uICh0eXBlLCBvYmosIG1ldGhvZCkge1xuICAgICAgICBpZiAoIXRoaXMuaGFzRXZlbnRMaXN0ZW5lcih0eXBlKSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuXG4gICAgICAgIHZhciBpID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKC0taSA+IC0xKSB7XG4gICAgICAgICAgICBpZiAobGlzdGVuZXJzW2ldLm9iaiA9PSBvYmogJiYgbGlzdGVuZXJzW2ldLm1ldGhvZCA9PSBtZXRob2QpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lcnMubGVuZ3RoID09IDApe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fbGlzdGVuZXJzW3R5cGVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICByZW1vdmVBbGxFdmVudExpc3RlbmVyczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9saXN0ZW5lcnMgPSBbXTtcbiAgICB9LFxuXG5cbiAgICBoYXNFdmVudExpc3RlbmVyOiBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbGlzdGVuZXJzW3R5cGVdICE9IHVuZGVmaW5lZCAmJiB0aGlzLl9saXN0ZW5lcnNbdHlwZV0gIT0gbnVsbDtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RGlzcGF0Y2hlcjsiLCJ2YXIgTGF5b3V0TW9kZSA9IHtcbiAgICBMRUZUICAgOiAnbGVmdCcsXG4gICAgUklHSFQgIDogJ3JpZ2h0JyxcbiAgICBUT1AgICAgOiAndG9wJyxcbiAgICBCT1RUT00gOiAnYm90dG9tJyxcbiAgICBOT05FICAgOiAnbm9uZSdcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTGF5b3V0TW9kZTsiLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L05vZGUnKTtcbnZhciBNZXRyaWMgPSByZXF1aXJlKCcuLi9NZXRyaWMnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9kb2N1bWVudC9DU1MnKTtcbnZhciBEb2N1bWVudEV2ZW50ID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIE5vZGVFdmVudCA9IHJlcXVpcmUoJy4uL2RvY3VtZW50L05vZGVFdmVudCcpO1xudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vZG9jdW1lbnQvTW91c2UnKTtcblxuLy8gL1RPRE86IEFkZCBtb3VzZW9mZnNldCAmIHJlc2V0Li5cbmZ1bmN0aW9uIFNjcm9sbEJhcihwYXJlbnROb2RlLHRhcmdldE5vZGUsd3JhcEhlaWdodCkge1xuICAgIHRoaXMuX3BhcmVudE5vZGUgPSBwYXJlbnROb2RlO1xuICAgIHRoaXMuX3RhcmdldE5vZGUgPSB0YXJnZXROb2RlO1xuICAgIHRoaXMuX3dyYXBIZWlnaHQgPSB3cmFwSGVpZ2h0O1xuXG4gICAgdmFyIHdyYXAgICA9IHRoaXMuX3dyYXBOb2RlICAgPSBuZXcgTm9kZSgpLFxuICAgICAgICBub2RlICAgPSB0aGlzLl9ub2RlICAgICAgID0gbmV3IE5vZGUoKSxcbiAgICAgICAgdHJhY2sgID0gdGhpcy5fdHJhY2tOb2RlICA9IG5ldyBOb2RlKCksXG4gICAgICAgIHRodW1iICA9IHRoaXMuX3RodW1iTm9kZSAgPSBuZXcgTm9kZSgpO1xuXG4gICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0YXJnZXROb2RlKTtcbiAgICBwYXJlbnROb2RlLmFkZENoaWxkKHdyYXApO1xuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGRBdChub2RlLDApO1xuXG4gICAgd3JhcC5hZGRDaGlsZCh0YXJnZXROb2RlKTtcbiAgICBub2RlLmFkZENoaWxkKHRyYWNrKTtcbiAgICB0cmFjay5hZGRDaGlsZCh0aHVtYik7XG5cbiAgICB3cmFwLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbFdyYXApO1xuICAgIG5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsQmFyKTtcbiAgICB0cmFjay5zZXRTdHlsZUNsYXNzKENTUy5TY3JvbGxCYXJUcmFjayk7XG4gICAgdGh1bWIuc2V0U3R5bGVDbGFzcyhDU1MuU2Nyb2xsQmFyVGh1bWIpO1xuXG4gICAgdGhpcy5fc2Nyb2xsSGVpZ2h0ID0gMDtcbiAgICB0aGlzLl9zY3JvbGxVbml0ICAgPSAwO1xuXG4gICAgdGhpcy5fc2Nyb2xsTWluICAgID0gMDtcbiAgICB0aGlzLl9zY3JvbGxNYXggICAgPSAxO1xuICAgIHRoaXMuX3Njcm9sbFBvcyAgICA9IDA7XG5cbiAgICB0aHVtYi5zZXRQb3NpdGlvblkoTWV0cmljLlNDUk9MTEJBUl9UUkFDS19QQURESU5HKTtcbiAgICB0aHVtYi5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uVGh1bWJEcmFnU3RhcnQuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLl9pc1ZhbGlkICA9IGZhbHNlO1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSBmYWxzZTtcbn1cblxuU2Nyb2xsQmFyLnByb3RvdHlwZSA9XG57XG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0YXJnZXQgPSB0aGlzLl90YXJnZXROb2RlLFxuICAgICAgICAgICAgdGh1bWIgPSB0aGlzLl90aHVtYk5vZGU7XG5cbiAgICAgICAgdmFyIHBhZGRpbmcgPSBNZXRyaWMuU0NST0xMQkFSX1RSQUNLX1BBRERJTkc7XG5cbiAgICAgICAgdmFyIHRhcmdldFdyYXBIZWlnaHQgPSB0aGlzLl93cmFwSGVpZ2h0LFxuICAgICAgICAgICAgdGFyZ2V0SGVpZ2h0ID0gdGFyZ2V0LmdldEhlaWdodCgpLFxuICAgICAgICAgICAgdHJhY2tIZWlnaHQgPSB0YXJnZXRXcmFwSGVpZ2h0IC0gcGFkZGluZyAqIDI7XG5cbiAgICAgICAgdGh1bWIuc2V0SGVpZ2h0KHRyYWNrSGVpZ2h0KTtcblxuICAgICAgICB2YXIgcmF0aW8gPSB0YXJnZXRXcmFwSGVpZ2h0IC8gdGFyZ2V0SGVpZ2h0O1xuXG4gICAgICAgIHRoaXMuX2lzVmFsaWQgPSBmYWxzZTtcblxuICAgICAgICBpZiAocmF0aW8gPiAxLjApe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRodW1iSGVpZ2h0ID0gdHJhY2tIZWlnaHQgKiByYXRpbztcblxuICAgICAgICB0aGlzLl9zY3JvbGxIZWlnaHQgPSB0cmFja0hlaWdodCAtIHRodW1iSGVpZ2h0O1xuICAgICAgICB0aGlzLl9zY3JvbGxVbml0ID0gdGFyZ2V0SGVpZ2h0IC0gdHJhY2tIZWlnaHQgLSBwYWRkaW5nICogMjtcblxuICAgICAgICB0aHVtYi5zZXRIZWlnaHQodGh1bWJIZWlnaHQpO1xuXG4gICAgICAgIHRoaXMuX2lzVmFsaWQgPSB0cnVlO1xuXG4gICAgICAgIC8qXG4gICAgICAgICB2YXIgc2Nyb2xsTWluID0gdGhpcy5fc2Nyb2xsTWluLFxuICAgICAgICAgc2Nyb2xsTWF4ID0gdGhpcy5fc2Nyb2xsTWF4LFxuICAgICAgICAgc2Nyb2xsUG9zID0gdGhpcy5fc2Nyb2xsUG9zO1xuXG4gICAgICAgICB2YXIgc2Nyb2xsUG9zTm9ybSA9IChzY3JvbGxQb3MgLSBzY3JvbGxNaW4pIC8gKHNjcm9sbE1heCAtIHNjcm9sbFBvcyk7XG4gICAgICAgICAqL1xuICAgIH0sXG5cbiAgICBfc2Nyb2xsVGh1bWI6IGZ1bmN0aW9uICh5KSB7XG4gICAgICAgIHZhciB0aHVtYiA9IHRoaXMuX3RodW1iTm9kZSxcbiAgICAgICAgICAgIHRodW1iSGVpZ2h0ID0gdGh1bWIuZ2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcy5fdHJhY2tOb2RlLFxuICAgICAgICAgICAgdHJhY2tIZWlnaHQgPSB0aGlzLl93cmFwSGVpZ2h0LFxuICAgICAgICAgICAgdHJhY2tUb3AgPSB0cmFjay5nZXRQb3NpdGlvbkdsb2JhbFkoKSxcbiAgICAgICAgICAgIHRyYWNrQ2VudGVyID0gdHJhY2tIZWlnaHQgKiAwLjU7XG5cbiAgICAgICAgdmFyIHRhcmdldCA9IHRoaXMuX3RhcmdldE5vZGU7XG5cbiAgICAgICAgdmFyIHNjcm9sbEhlaWdodCA9IHRoaXMuX3Njcm9sbEhlaWdodCxcbiAgICAgICAgICAgIHNjcm9sbFVuaXQgPSB0aGlzLl9zY3JvbGxVbml0O1xuXG4gICAgICAgIHZhciBtaW4gPSB0aGlzLl9zY3JvbGxNaW4gPSB0cmFja0NlbnRlciAtIHNjcm9sbEhlaWdodCAqIDAuNSxcbiAgICAgICAgICAgIG1heCA9IHRoaXMuX3Njcm9sbE1heCA9IHRyYWNrQ2VudGVyICsgc2Nyb2xsSGVpZ2h0ICogMC41O1xuXG4gICAgICAgIHZhciBwb3MgPSBNYXRoLm1heChtaW4sIE1hdGgubWluKHkgLSB0cmFja1RvcCwgbWF4KSk7XG5cbiAgICAgICAgdmFyIHRodW1iUG9zID0gdGhpcy5fc2Nyb2xsUG9zID0gcG9zIC0gdGh1bWJIZWlnaHQgKiAwLjUsXG4gICAgICAgICAgICB0YXJnZXRQb3MgPSAtKHBvcyAtIG1pbikgLyAobWF4IC0gbWluKSAqIHNjcm9sbFVuaXQ7XG5cbiAgICAgICAgdGh1bWIuc2V0UG9zaXRpb25ZKHRodW1iUG9zKTtcbiAgICAgICAgdGFyZ2V0LnNldFBvc2l0aW9uWSh0YXJnZXRQb3MpO1xuICAgIH0sXG5cbiAgICBfb25UaHVtYkRyYWdTdGFydDogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2lzVmFsaWQgfHwgdGhpcy5faXNEaXNhYmxlZCl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZXZlbnRNb3VzZU1vdmUgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX01PVkUsXG4gICAgICAgICAgICBldmVudE1vdXNlVXAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgbW91c2UgPSBNb3VzZS5nZXQoKTtcblxuICAgICAgICAvL1RPRE86YWRkXG4gICAgICAgIHRoaXMuX3Njcm9sbE9mZnNldCA9IG1vdXNlLmdldFkoKSAtIHRoaXMuX3RodW1iTm9kZS5nZXRQb3NpdGlvbkdsb2JhbFkoKTtcblxuICAgICAgICB2YXIgb25EcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuX3Njcm9sbFRodW1iKG1vdXNlLmdldFkoKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkRyYWdFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICB0aGlzLl9zY3JvbGxUaHVtYihtb3VzZS5nZXRZKCkpO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlVXAsIG9uRHJhZ0VuZCwgZmFsc2UpO1xuICAgIH0sXG5cbiAgICBlbmFibGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5faXNEaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG4gICAgfSxcbiAgICBkaXNhYmxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lzRGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG4gICAgfSxcblxuICAgIHJlc2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3Njcm9sbFRodW1iKDApO1xuICAgIH0sXG5cbiAgICBfdXBkYXRlQXBwZWFyYW5jZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5faXNEaXNhYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5fbm9kZS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIHRoaXMuX3RhcmdldE5vZGUuc2V0UG9zaXRpb25ZKDApO1xuICAgICAgICAgICAgdGhpcy5fdGh1bWJOb2RlLnNldFBvc2l0aW9uWShNZXRyaWMuU0NST0xMQkFSX1RSQUNLX1BBRERJTkcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fbm9kZS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaXNWYWxpZDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faXNWYWxpZDtcbiAgICB9LFxuXG4gICAgc2V0V3JhcEhlaWdodDogZnVuY3Rpb24gKGhlaWdodCkge1xuICAgICAgICB0aGlzLl93cmFwSGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgIH0sXG5cbiAgICByZW1vdmVUYXJnZXROb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93cmFwTm9kZS5yZW1vdmVDaGlsZCh0aGlzLl90YXJnZXROb2RlKTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlRnJvbVBhcmVudDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcGFyZW50Tm9kZSA9IHRoaXMuX3BhcmVudE5vZGUsXG4gICAgICAgICAgICByb290Tm9kZSA9IHRoaXMuX25vZGUsXG4gICAgICAgICAgICB0YXJnZXROb2RlID0gdGhpcy5fdGFyZ2V0Tm9kZTtcblxuICAgICAgICByb290Tm9kZS5yZW1vdmVDaGlsZCh0YXJnZXROb2RlKTtcbiAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLl93cmFwTm9kZSk7XG4gICAgICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQocm9vdE5vZGUpO1xuXG4gICAgICAgIHJldHVybiB0YXJnZXROb2RlO1xuICAgIH0sXG5cbiAgICBnZXRXcmFwTm9kZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fd3JhcE5vZGU7XG4gICAgfSxcbiAgICBnZXROb2RlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ub2RlO1xuICAgIH0sXG4gICAgZ2V0VGFyZ2V0Tm9kZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdGFyZ2V0Tm9kZTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjcm9sbEJhcjsiLCJ2YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudERpc3BhdGNoZXInKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9Ob2RlJyk7XG52YXIgU2Nyb2xsQmFyID0gcmVxdWlyZSgnLi4vY29yZS9sYXlvdXQvU2Nyb2xsQmFyJyk7XG5cbmZ1bmN0aW9uIEFic3RyYWN0R3JvdXAocGFyZW50LCBwYXJhbXMpIHtcbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBwYXJhbXMuaGVpZ2h0ID0gcGFyYW1zLmhlaWdodCB8fCBudWxsO1xuICAgIHBhcmFtcy5lbmFibGUgPSBwYXJhbXMuZW5hYmxlID09PSB1bmRlZmluZWQgPyB0cnVlIDogcGFyYW1zLmVuYWJsZTtcblxuICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLl9oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0O1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSAhcGFyYW1zLmVuYWJsZTtcbiAgICB0aGlzLl9zY3JvbGxCYXIgPSBudWxsO1xuXG4gICAgdGhpcy5fbm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVF9JVEVNKTtcbiAgICB0aGlzLl93cmFwTm9kZSA9IG5ldyBOb2RlKCk7XG4gICAgdGhpcy5fbGlzdE5vZGUgPSBuZXcgTm9kZShOb2RlLkxJU1QpO1xuXG4gICAgdGhpcy5fcGFyZW50LmdldExpc3QoKS5hZGRDaGlsZCh0aGlzLl9ub2RlKTtcbn1cblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUpO1xuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5hZGRTY3JvbGxXcmFwID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3cmFwTm9kZSA9IHRoaXMuX3dyYXBOb2RlLFxuICAgICAgICBtYXhIZWlnaHQgPSB0aGlzLmdldE1heEhlaWdodCgpO1xuXG4gICAgdGhpcy5fc2Nyb2xsQmFyID0gbmV3IFNjcm9sbEJhcih3cmFwTm9kZSwgdGhpcy5fbGlzdE5vZGUsIG1heEhlaWdodCk7XG4gICAgaWYgKHRoaXMuaXNFbmFibGVkKCkpIHtcbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KG1heEhlaWdodCk7XG4gICAgfVxufTtcblxuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUucHJldmVudFNlbGVjdERyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fcGFyZW50LnByZXZlbnRTZWxlY3REcmFnKCk7XG5cbiAgICBpZiAoIXRoaXMuaGFzU2Nyb2xsV3JhcCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fd3JhcE5vZGUuZ2V0RWxlbWVudCgpLnNjcm9sbFRvcCA9IDA7XG59O1xuXG5cbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmhhc01heEhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faGVpZ2h0ICE9IG51bGw7XG59O1xuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuZ2V0TWF4SGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG59O1xuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuaGFzU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2Nyb2xsQmFyICE9IG51bGw7XG59O1xuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuaGFzTGFiZWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xhYmxOb2RlICE9IG51bGw7XG59O1xuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSBmYWxzZTtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuQWJzdHJhY3RHcm91cC5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSB0cnVlO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5pc0Rpc2FibGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9pc0Rpc2FibGVkO1xufTtcbkFic3RyYWN0R3JvdXAucHJvdG90eXBlLmlzRW5hYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gIXRoaXMuX2lzRGlzYWJsZWQ7XG59O1xuXG5BYnN0cmFjdEdyb3VwLnByb3RvdHlwZS5nZXRMaXN0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9saXN0Tm9kZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RHcm91cDtcblxuIiwidmFyIEFic3RyYWN0R3JvdXAgPSByZXF1aXJlKCcuL0Fic3RyYWN0R3JvdXAnKTtcbnZhciBDU1MgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0NTUycpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGUnKTtcblxudmFyIFN1Ykdyb3VwID0gcmVxdWlyZSgnLi9TdWJHcm91cCcpO1xuXG52YXIgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIFBhbmVsRXZlbnQgPSByZXF1aXJlKCcuL1BhbmVsRXZlbnQnKSxcbiAgICBHcm91cEV2ZW50ID0gcmVxdWlyZSgnLi9Hcm91cEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIEdyb3VwKHBhcmVudCxwYXJhbXMpIHtcbiAgICBwYXJhbXMgICAgICAgICAgID0gcGFyYW1zIHx8IHt9O1xuICAgIHBhcmFtcy5sYWJlbCAgICAgPSBwYXJhbXMubGFiZWwgICAgIHx8IG51bGw7XG4gICAgcGFyYW1zLnVzZUxhYmVscyA9IHBhcmFtcy51c2VMYWJlbHMgfHwgdHJ1ZTtcbiAgICBwYXJhbXMuZW5hYmxlICAgID0gcGFyYW1zLmVuYWJsZSAgICAgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBwYXJhbXMuZW5hYmxlO1xuXG4gICAgQWJzdHJhY3RHcm91cC5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cbiAgICB0aGlzLl9jb21wb25lbnRzID0gW107XG4gICAgdGhpcy5fc3ViR3JvdXBzICA9IFtdO1xuXG4gICAgdmFyIHJvb3ROb2RlID0gdGhpcy5fbm9kZSxcbiAgICAgICAgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgbGlzdE5vZGUgPSB0aGlzLl9saXN0Tm9kZTtcblxuICAgICAgICByb290Tm9kZS5zZXRTdHlsZUNsYXNzKENTUy5Hcm91cCk7XG4gICAgICAgIHdyYXBOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuICAgICAgICBsaXN0Tm9kZS5zZXRTdHlsZUNsYXNzKENTUy5TdWJHcm91cExpc3QpO1xuXG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGxpc3ROb2RlKTtcblxuICAgIHZhciBsYWJlbCA9IHBhcmFtcy5sYWJlbDtcblxuICAgIGlmKGxhYmVsKXtcbiAgICAgICAgdmFyIGhlYWROb2RlICA9IG5ldyBOb2RlKCksXG4gICAgICAgICAgICBsYWJsV3JhcCAgPSBuZXcgTm9kZSgpLFxuICAgICAgICAgICAgbGFibE5vZGUgID0gbmV3IE5vZGUoTm9kZS5TUEFOKSxcbiAgICAgICAgICAgIGluZGlOb2RlICA9IHRoaXMuX2luZGlOb2RlID0gbmV3IE5vZGUoKTtcblxuICAgICAgICAgICAgaGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG4gICAgICAgICAgICBsYWJsV3JhcC5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcbiAgICAgICAgICAgIGxhYmxOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkxhYmVsKTtcbiAgICAgICAgICAgIGluZGlOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkFycm93Qk1heCk7XG4gICAgICAgICAgICBsYWJsTm9kZS5zZXRQcm9wZXJ0eSgnaW5uZXJIVE1MJyxsYWJlbCk7XG5cbiAgICAgICAgICAgIGhlYWROb2RlLmFkZENoaWxkKGluZGlOb2RlKTtcbiAgICAgICAgICAgIGxhYmxXcmFwLmFkZENoaWxkKGxhYmxOb2RlKTtcbiAgICAgICAgICAgIGhlYWROb2RlLmFkZENoaWxkKGxhYmxXcmFwKTtcbiAgICAgICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKGhlYWROb2RlKTtcblxuICAgICAgICBoZWFkTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLHRoaXMuX29uSGVhZFRyaWdnZXIuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LkdST1VQX0xJU1RfU0laRV9DSEFOR0UsdGhpcy5fcGFyZW50LCdvbkdyb3VwTGlzdFNpemVDaGFuZ2UnKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG4gICAgfVxuXG4gICAgaWYodGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIHRoaXMuYWRkU2Nyb2xsV3JhcCgpO1xuICAgIH1cblxuICAgIHJvb3ROb2RlLmFkZENoaWxkKHdyYXBOb2RlKTtcblxuICAgIGlmKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICBpZighbGFiZWwpe1xuICAgICAgICAgICAgdmFyIGJ1ZmZlclRvcCA9IHRoaXMuX3Njcm9sbEJ1ZmZlclRvcCA9IG5ldyBOb2RlKCk7XG4gICAgICAgICAgICAgICAgYnVmZmVyVG9wLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJ1ZmZlcik7XG5cbiAgICAgICAgICAgIHJvb3ROb2RlLmFkZENoaWxkQXQoYnVmZmVyVG9wLDApO1xuICAgICAgICB9XG4gICAgICAgIHZhciBidWZmZXJCb3R0b20gPSB0aGlzLl9zY3JvbGxCdWZmZXJCb3R0b20gPSBuZXcgTm9kZSgpO1xuICAgICAgICAgICAgYnVmZmVyQm90dG9tLnNldFN0eWxlQ2xhc3MoQ1NTLlNjcm9sbEJ1ZmZlcik7XG5cbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQoYnVmZmVyQm90dG9tKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkVfQkVHSU4sIHRoaXMsICdvblBhbmVsTW92ZUJlZ2luJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9NT1ZFLCB0aGlzLCAnb25QYW5lbE1vdmUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCB0aGlzLCAnb25QYW5lbE1vdmVFbmQnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX0hJREUsIHRoaXMsICdvblBhbmVsSGlkZScpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKFBhbmVsRXZlbnQuUEFORUxfU0hPVywgdGhpcywgJ29uUGFuZWxTaG93Jyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TQ1JPTExfV1JBUF9BRERFRCwgdGhpcywgJ29uUGFuZWxTY3JvbGxXcmFwQWRkZWQnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NDUk9MTF9XUkFQX1JFTU9WRUQsIHRoaXMsICdvblBhbmVsU2Nyb2xsV3JhcFJlbW92ZWQnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX1NJWkVfQ0hBTkdFLCB0aGlzLCAnb25QYW5lbFNpemVDaGFuZ2UnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsIHRoaXMsICdvbldpbmRvd1Jlc2l6ZScpO1xuXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsdGhpcy5fcGFyZW50LCdvbkdyb3VwTGlzdFNpemVDaGFuZ2UnKTtcbn1cblxuR3JvdXAucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShBYnN0cmFjdEdyb3VwLnByb3RvdHlwZSk7XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsTW92ZUJlZ2luID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfTU9WRV9CRUdJTiwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxNb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfTU9WRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxNb3ZlRW5kID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfTU9WRV9FTkQsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2Nyb2xsV3JhcEFkZGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsIG51bGwpKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2Nyb2xsV3JhcFJlbW92ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxIaWRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuU1VCR1JPVVBfRElTQUJMRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uUGFuZWxTaG93ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuU1VCR1JPVVBfRU5BQkxFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25QYW5lbFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9TSVpFX0NIQU5HRSwgbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm9uV2luZG93UmVzaXplID0gZnVuY3Rpb24gKGUpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25TdWJHcm91cFRyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG5cbiAgICBpZighdGhpcy5oYXNNYXhIZWlnaHQoKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyLFxuICAgICAgICB3cmFwTm9kZSAgPSB0aGlzLl93cmFwTm9kZTtcblxuICAgIHZhciBidWZmZXJUb3AgICAgPSB0aGlzLl9zY3JvbGxCdWZmZXJUb3AsXG4gICAgICAgIGJ1ZmZlckJvdHRvbSA9IHRoaXMuX3Njcm9sbEJ1ZmZlckJvdHRvbTtcblxuICAgIHNjcm9sbEJhci51cGRhdGUoKTtcblxuICAgIGlmICghc2Nyb2xsQmFyLmlzVmFsaWQoKSkge1xuICAgICAgICBzY3JvbGxCYXIuZGlzYWJsZSgpO1xuICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQod3JhcE5vZGUuZ2V0Q2hpbGRBdCgxKS5nZXRIZWlnaHQoKSk7XG5cbiAgICAgICAgaWYgKGJ1ZmZlclRvcCl7XG4gICAgICAgICAgICBidWZmZXJUb3Auc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJ1ZmZlckJvdHRvbSl7XG4gICAgICAgICAgICBidWZmZXJCb3R0b20uc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHNjcm9sbEJhci5lbmFibGUoKTtcbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KHRoaXMuZ2V0TWF4SGVpZ2h0KCkpO1xuXG4gICAgICAgIGlmIChidWZmZXJUb3Ape1xuICAgICAgICAgICAgYnVmZmVyVG9wLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYnVmZmVyQm90dG9tKXtcbiAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsbnVsbCkpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLl9vbkhlYWRUcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSAhdGhpcy5faXNEaXNhYmxlZDtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgR3JvdXBFdmVudC5HUk9VUF9MSVNUX1NJWkVfQ0hBTkdFLCBudWxsKSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuYWRkQ29tcG9uZW50ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgQ2xhc3NfID0gYXJndW1lbnRzWzBdO1xuICAgIHZhciBhcmdzICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICBhcmdzLnNoaWZ0KCk7XG4gICAgICAgIGFyZ3MudW5zaGlmdCh0aGlzLl9nZXRTdWJHcm91cCgpKTtcblxuICAgIHZhciBpbnN0YW5jZSA9IE9iamVjdC5jcmVhdGUoQ2xhc3NfLnByb3RvdHlwZSk7XG4gICAgQ2xhc3NfLmFwcGx5KGluc3RhbmNlLGFyZ3MpO1xuXG4gICAgdGhpcy5fY29tcG9uZW50cy5wdXNoKGluc3RhbmNlKTtcbiAgICB0aGlzLl91cGRhdGVIZWlnaHQoKTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5fdXBkYXRlSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2dldFN1Ykdyb3VwKCkudXBkYXRlKCk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcyxHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLG51bGwpKTtcbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLnVwZGF0ZSgpO1xuICAgIH1cbn07XG5cbkdyb3VwLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgaW5pZE5vZGUgPSB0aGlzLl9pbmRpTm9kZTtcblxuICAgIHZhciBzY3JvbGxCYXIgPSB0aGlzLl9zY3JvbGxCYXI7XG5cbiAgICB2YXIgYnVmZmVyVG9wICAgID0gdGhpcy5fc2Nyb2xsQnVmZmVyVG9wLFxuICAgICAgICBidWZmZXJCb3R0b20gPSB0aGlzLl9zY3JvbGxCdWZmZXJCb3R0b207XG5cbiAgICBpZiAodGhpcy5pc0Rpc2FibGVkKCkpIHtcbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KDApO1xuICAgICAgICBpZiAoaW5pZE5vZGUpe1xuICAgICAgICAgICAgaW5pZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCTWluKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzY3JvbGxCYXIpIHtcbiAgICAgICAgICAgIGlmIChidWZmZXJUb3Ape1xuICAgICAgICAgICAgICAgIGJ1ZmZlclRvcC5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChidWZmZXJCb3R0b20pe1xuICAgICAgICAgICAgICAgIGJ1ZmZlckJvdHRvbS5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpIHtcbiAgICAgICAgdmFyIG1heEhlaWdodCA9IHRoaXMuZ2V0TWF4SGVpZ2h0KCksXG4gICAgICAgICAgICBsaXN0SGVpZ2h0ID0gd3JhcE5vZGUuZ2V0Q2hpbGRBdCgxKS5nZXRIZWlnaHQoKTtcblxuICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQobGlzdEhlaWdodCA8IG1heEhlaWdodCA/IGxpc3RIZWlnaHQgOiBtYXhIZWlnaHQpO1xuXG4gICAgICAgIGlmIChzY3JvbGxCYXIuaXNWYWxpZCgpKSB7XG4gICAgICAgICAgICBpZiAoYnVmZmVyVG9wKXtcbiAgICAgICAgICAgICAgICBidWZmZXJUb3Auc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGJ1ZmZlckJvdHRvbSl7XG4gICAgICAgICAgICAgICAgYnVmZmVyQm90dG9tLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgd3JhcE5vZGUuZGVsZXRlU3R5bGVQcm9wZXJ0eSgnaGVpZ2h0Jyk7XG4gICAgfVxuXG4gICAgaWYgKGluaWROb2RlKXtcbiAgICAgICAgaW5pZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCTWF4KTtcbiAgICB9XG59O1xuXG5Hcm91cC5wcm90b3R5cGUub25Hcm91cFNpemVVcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xuICAgIGlmICh0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgdGhpcy5fc2Nyb2xsQmFyLnVwZGF0ZSgpO1xuICAgIH1cbn07XG5cbkdyb3VwLnByb3RvdHlwZS5hZGRTdWJHcm91cCA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICB0aGlzLl9zdWJHcm91cHMucHVzaChuZXcgU3ViR3JvdXAodGhpcywgcGFyYW1zKSk7XG4gICAgdGhpcy5fdXBkYXRlSGVpZ2h0KCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuX2dldFN1Ykdyb3VwID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdWJHcm91cHMgPSB0aGlzLl9zdWJHcm91cHM7XG4gICAgaWYgKHN1Ykdyb3Vwcy5sZW5ndGggPT0gMCl7XG4gICAgICAgIHN1Ykdyb3Vwcy5wdXNoKG5ldyBTdWJHcm91cCh0aGlzKSk7XG4gICAgfVxuICAgIHJldHVybiBzdWJHcm91cHNbc3ViR3JvdXBzLmxlbmd0aCAtIDFdO1xufTtcblxuR3JvdXAucHJvdG90eXBlLmdldENvbXBvbmVudHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbXBvbmVudHM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwO1xuIiwidmFyIEdyb3VwRXZlbnQgPSB7XG5cdEdST1VQX1NJWkVfQ0hBTkdFICAgICAgICA6ICdncm91cFNpemVDaGFuZ2UnLFxuXHRHUk9VUF9MSVNUX1NJWkVfQ0hBTkdFICAgOiAnZ3JvdXBMaXN0U2l6ZUNoYW5nZScsXG5cdEdST1VQX1NJWkVfVVBEQVRFICAgICAgICA6ICdncm91cFNpemVVcGRhdGUnLFxuXHRTVUJHUk9VUF9UUklHR0VSICAgICAgICAgOiAnc3ViR3JvdXBUcmlnZ2VyJyxcblxuXHRTVUJHUk9VUF9FTkFCTEUgICAgICAgICAgOiAnZW5hYmxlU3ViR3JvdXAnLFxuXHRTVUJHUk9VUF9ESVNBQkxFICAgICAgICAgOiAnZGlzYWJsZVN1Ykdyb3VwJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHcm91cEV2ZW50OyIsInZhciBNZW51RXZlbnQgPSB7XG5cdFVQREFURV9NRU5VOiAndXBkYXRlTWVudSdcbn07XG5tb2R1bGUuZXhwb3J0cyA9IE1lbnVFdmVudDsiLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpLFxuICAgIEdyb3VwID0gcmVxdWlyZSgnLi9Hcm91cCcpLFxuICAgIFNjcm9sbEJhciA9IHJlcXVpcmUoJy4uL2NvcmUvbGF5b3V0L1Njcm9sbEJhcicpO1xuXG52YXIgQ1NTID0gcmVxdWlyZSgnLi4vY29yZS9kb2N1bWVudC9DU1MnKTtcbnZhciBMYXlvdXRNb2RlID0gcmVxdWlyZSgnLi4vY29yZS9sYXlvdXQvTGF5b3V0TW9kZScpO1xudmFyIEhpc3RvcnkgPSByZXF1aXJlKCcuLi9jb3JlL0hpc3RvcnknKTtcblxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2NvcmUvZXZlbnQvRXZlbnREaXNwYXRjaGVyJyksXG4gICAgRXZlbnRfID0gcmVxdWlyZSgnLi4vY29yZS9ldmVudC9FdmVudCcpLFxuICAgIERvY3VtZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L0RvY3VtZW50RXZlbnQnKSxcbiAgICBOb2RlRXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L05vZGVFdmVudCcpLFxuICAgIFBhbmVsRXZlbnQgPSByZXF1aXJlKCcuL1BhbmVsRXZlbnQnKSxcbiAgICBNZW51RXZlbnQgPSByZXF1aXJlKCcuL01lbnVFdmVudCcpO1xuXG52YXIgTW91c2UgPSByZXF1aXJlKCcuLi9jb3JlL2RvY3VtZW50L01vdXNlJyk7XG5cbnZhciBTdHJpbmdJbnB1dCA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TdHJpbmdJbnB1dCcpLFxuICAgIE51bWJlcklucHV0ID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L051bWJlcklucHV0JyksXG4gICAgUmFuZ2UgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvUmFuZ2UnKSxcbiAgICBDaGVja2JveCA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9DaGVja2JveCcpLFxuICAgIENvbG9yID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0NvbG9yJyksXG4gICAgQnV0dG9uID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0J1dHRvbicpLFxuICAgIFNlbGVjdCA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TZWxlY3QnKSxcbiAgICBTbGlkZXIgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvU2xpZGVyJyksXG4gICAgRnVuY3Rpb25QbG90dGVyID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0Z1bmN0aW9uUGxvdHRlcicpLFxuICAgIFBhZCA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9QYWQnKSxcbiAgICBWYWx1ZVBsb3R0ZXIgPSByZXF1aXJlKCcuLi9jb21wb25lbnQvVmFsdWVQbG90dGVyJyksXG4gICAgTnVtYmVyT3V0cHV0ID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L051bWJlck91dHB1dCcpLFxuICAgIFN0cmluZ091dHB1dCA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudC9TdHJpbmdPdXRwdXQnKSxcbiAgICBDYW52YXNfID0gcmVxdWlyZSgnLi4vY29tcG9uZW50L0NhbnZhcycpLFxuICAgIFNWR18gPSByZXF1aXJlKCcuLi9jb21wb25lbnQvU1ZHJyk7XG5cbnZhciBERUZBVUxUX1BBTkVMX1BPU0lUSU9OID0gbnVsbCxcbiAgICBERUZBVUxUX1BBTkVMX1dJRFRIICAgICAgPSAzMDAsXG4gICAgREVGQVVMVF9QQU5FTF9IRUlHSFQgICAgID0gbnVsbCxcbiAgICBERUZBVUxUX1BBTkVMX1dJRFRIX01JTiAgPSAxMDAsXG4gICAgREVGQVVMVF9QQU5FTF9XSURUSF9NQVggID0gNjAwLFxuICAgIERFRkFVTFRfUEFORUxfUkFUSU8gICAgICA9IDQwLFxuICAgIERFRkFVTFRfUEFORUxfTEFCRUwgICAgICA9ICdDb250cm9sIFBhbmVsJyxcbiAgICBERUZBVUxUX1BBTkVMX1ZBTElHTiAgICAgPSBMYXlvdXRNb2RlLlRPUCxcbiAgICBERUZBVUxUX1BBTkVMX0FMSUdOICAgICAgPSBMYXlvdXRNb2RlLlJJR0hULFxuICAgIERFRkFVTFRfUEFORUxfRE9DSyAgICAgICA9IHthbGlnbjpMYXlvdXRNb2RlLlJJR0hULHJlc2l6YWJsZTp0cnVlfSxcbiAgICBERUZBVUxUX1BBTkVMX0VOQUJMRSAgICAgPSB0cnVlLFxuICAgIERFRkFVTFRfUEFORUxfT1BBQ0lUWSAgICA9IDEuMCxcbiAgICBERUZBVUxUX1BBTkVMX0ZJWEVEICAgICAgPSB0cnVlLFxuICAgIERFRkFVTFRfUEFORUxfVkNPTlNUUkFJTiA9IHRydWU7XG5cbmZ1bmN0aW9uIFBhbmVsKGNvbnRyb2xLaXQscGFyYW1zKXtcbiAgICBFdmVudERpc3BhdGNoZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuICAgIHRoaXMuX3BhcmVudCA9IGNvbnRyb2xLaXQ7XG5cblxuICAgIHBhcmFtcyAgICAgICAgICAgID0gcGFyYW1zICAgICAgICAgICB8fCB7fTtcbiAgICBwYXJhbXMudmFsaWduICAgICA9IHBhcmFtcy52YWxpZ24gICAgfHwgREVGQVVMVF9QQU5FTF9WQUxJR047XG4gICAgcGFyYW1zLmFsaWduICAgICAgPSBwYXJhbXMuYWxpZ24gICAgIHx8IERFRkFVTFRfUEFORUxfQUxJR047XG4gICAgcGFyYW1zLnBvc2l0aW9uICAgPSBwYXJhbXMucG9zaXRpb24gIHx8IERFRkFVTFRfUEFORUxfUE9TSVRJT047XG4gICAgcGFyYW1zLndpZHRoICAgICAgPSBwYXJhbXMud2lkdGggICAgIHx8IERFRkFVTFRfUEFORUxfV0lEVEg7XG4gICAgcGFyYW1zLmhlaWdodCAgICAgPSBwYXJhbXMuaGVpZ2h0ICAgIHx8IERFRkFVTFRfUEFORUxfSEVJR0hUO1xuICAgIHBhcmFtcy5yYXRpbyAgICAgID0gcGFyYW1zLnJhdGlvICAgICB8fCBERUZBVUxUX1BBTkVMX1JBVElPO1xuICAgIHBhcmFtcy5sYWJlbCAgICAgID0gcGFyYW1zLmxhYmVsICAgICB8fCBERUZBVUxUX1BBTkVMX0xBQkVMO1xuICAgIHBhcmFtcy5vcGFjaXR5ICAgID0gcGFyYW1zLm9wYWNpdHkgICB8fCBERUZBVUxUX1BBTkVMX09QQUNJVFk7XG4gICAgcGFyYW1zLmZpeGVkICAgICAgPSBwYXJhbXMuZml4ZWQgICAgICA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9QQU5FTF9GSVhFRCAgICAgIDogcGFyYW1zLmZpeGVkO1xuICAgIHBhcmFtcy5lbmFibGUgICAgID0gcGFyYW1zLmVuYWJsZSAgICAgPT09IHVuZGVmaW5lZCA/IERFRkFVTFRfUEFORUxfRU5BQkxFICAgICA6IHBhcmFtcy5lbmFibGU7XG4gICAgcGFyYW1zLnZjb25zdHJhaW4gPSBwYXJhbXMudmNvbnN0cmFpbiA9PT0gdW5kZWZpbmVkID8gREVGQVVMVF9QQU5FTF9WQ09OU1RSQUlOIDogcGFyYW1zLnZjb25zdHJhaW47XG5cbiAgICBpZiAocGFyYW1zLmRvY2spIHtcbiAgICAgICAgcGFyYW1zLmRvY2suYWxpZ24gPSBwYXJhbXMuZG9jay5hbGlnbiB8fCBERUZBVUxUX1BBTkVMX0RPQ0suYWxpZ247XG4gICAgICAgIHBhcmFtcy5kb2NrLnJlc2l6YWJsZSA9IHBhcmFtcy5kb2NrLnJlc2l6YWJsZSB8fCBERUZBVUxUX1BBTkVMX0RPQ0sucmVzaXphYmxlO1xuICAgIH1cblxuICAgIHRoaXMuX3dpZHRoICAgICAgPSBNYXRoLm1heChERUZBVUxUX1BBTkVMX1dJRFRIX01JTixcbiAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5taW4ocGFyYW1zLndpZHRoLERFRkFVTFRfUEFORUxfV0lEVEhfTUFYKSk7XG4gICAgdGhpcy5faGVpZ2h0ICAgICA9IHBhcmFtcy5oZWlnaHQgPyAgTWF0aC5tYXgoMCxNYXRoLm1pbihwYXJhbXMuaGVpZ2h0LHdpbmRvdy5pbm5lckhlaWdodCkpIDogbnVsbDtcbiAgICB0aGlzLl9maXhlZCAgICAgID0gcGFyYW1zLmZpeGVkO1xuICAgIHRoaXMuX2RvY2sgICAgICAgPSBwYXJhbXMuZG9jaztcbiAgICB0aGlzLl9wb3NpdGlvbiAgID0gcGFyYW1zLnBvc2l0aW9uO1xuICAgIHRoaXMuX3ZDb25zdHJhaW4gPSBwYXJhbXMudmNvbnN0cmFpbjtcbiAgICB0aGlzLl9sYWJlbCAgICAgID0gcGFyYW1zLmxhYmVsO1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSAhcGFyYW1zLmVuYWJsZTtcbiAgICB0aGlzLl9ncm91cHMgICAgID0gW107XG5cblxuICAgIHZhciB3aWR0aCAgICA9IHRoaXMuX3dpZHRoLFxuICAgICAgICBpc0ZpeGVkICA9IHRoaXMuX2ZpeGVkLFxuICAgICAgICBkb2NrICAgICA9IHRoaXMuX2RvY2ssXG4gICAgICAgIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb24sXG4gICAgICAgIGxhYmVsICAgID0gdGhpcy5fbGFiZWwsXG4gICAgICAgIGFsaWduICAgID0gcGFyYW1zLmFsaWduLFxuICAgICAgICBvcGFjaXR5ICA9IHBhcmFtcy5vcGFjaXR5O1xuXG5cbiAgICB2YXIgcm9vdE5vZGUgID0gdGhpcy5fbm9kZSAgICAgPSBuZXcgTm9kZSgpLFxuICAgICAgICBoZWFkTm9kZSAgPSB0aGlzLl9oZWFkTm9kZSA9IG5ldyBOb2RlKCksXG4gICAgICAgIG1lbnVOb2RlICA9ICAgICAgICAgICAgICAgICAgbmV3IE5vZGUoKSxcbiAgICAgICAgbGFibFdyYXAgID0gICAgICAgICAgICAgICAgICBuZXcgTm9kZSgpLFxuICAgICAgICBsYWJsTm9kZSAgPSAgICAgICAgICAgICAgICAgIG5ldyBOb2RlKE5vZGUuU1BBTiksXG4gICAgICAgIHdyYXBOb2RlICA9IHRoaXMuX3dyYXBOb2RlID0gbmV3IE5vZGUoTm9kZS5ESVYpLFxuICAgICAgICBsaXN0Tm9kZSAgPSB0aGlzLl9saXN0Tm9kZSA9IG5ldyBOb2RlKE5vZGUuTElTVCk7XG5cbiAgICAgICAgcm9vdE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuUGFuZWwpO1xuICAgICAgICBoZWFkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkKTtcbiAgICAgICAgbWVudU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuTWVudSk7XG4gICAgICAgIGxhYmxXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuICAgICAgICBsYWJsTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XG4gICAgICAgIHdyYXBOb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuICAgICAgICBsaXN0Tm9kZS5zZXRTdHlsZUNsYXNzKENTUy5Hcm91cExpc3QpO1xuXG4gICAgICAgIHJvb3ROb2RlLnNldFdpZHRoKHdpZHRoKTtcbiAgICAgICAgbGFibE5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsbGFiZWwpO1xuXG4gICAgICAgIGhlYWROb2RlLmFkZENoaWxkKG1lbnVOb2RlKTtcbiAgICAgICAgbGFibFdyYXAuYWRkQ2hpbGQobGFibE5vZGUpO1xuICAgICAgICBoZWFkTm9kZS5hZGRDaGlsZChsYWJsV3JhcCk7XG4gICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKGxpc3ROb2RlKTtcbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGQoaGVhZE5vZGUpO1xuICAgICAgICByb290Tm9kZS5hZGRDaGlsZCh3cmFwTm9kZSk7XG5cbiAgICAgICAgY29udHJvbEtpdC5nZXROb2RlKCkuYWRkQ2hpbGQocm9vdE5vZGUpO1xuXG5cbiAgICBpZiAoIWRvY2spIHtcblxuICAgICAgICB2YXIgbWVudUhpZGUgPSB0aGlzLl9tZW51SGlkZSA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcbiAgICAgICAgICAgIG1lbnVIaWRlLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnVCdG5IaWRlKTtcbiAgICAgICAgICAgIG1lbnVIaWRlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uTWVudUhpZGVNb3VzZURvd24uYmluZCh0aGlzKSk7XG5cbiAgICAgICAgbWVudU5vZGUuYWRkQ2hpbGQobWVudUhpZGUpO1xuXG4gICAgICAgIGlmICh0aGlzLl9wYXJlbnQucGFuZWxzQXJlQ2xvc2FibGUoKSkge1xuICAgICAgICAgICAgdmFyIG1lbnVDbG9zZSA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcbiAgICAgICAgICAgIG1lbnVDbG9zZS5zZXRTdHlsZUNsYXNzKENTUy5NZW51QnRuQ2xvc2UpO1xuICAgICAgICAgICAgbWVudUNsb3NlLmFkZEV2ZW50TGlzdGVuZXIoTm9kZUV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuZGlzYWJsZS5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgbWVudU5vZGUuYWRkQ2hpbGQobWVudUNsb3NlKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2FkZFNjcm9sbFdyYXAoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXNGaXhlZCkge1xuICAgICAgICAgICAgaWYgKHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFsaWduID09IExheW91dE1vZGUuTEVGVCB8fFxuICAgICAgICAgICAgICAgICAgICBhbGlnbiA9PSBMYXlvdXRNb2RlLlRPUCB8fFxuICAgICAgICAgICAgICAgICAgICBhbGlnbiA9PSBMYXlvdXRNb2RlLkJPVFRPTSkge1xuICAgICAgICAgICAgICAgICAgICByb290Tm9kZS5zZXRQb3NpdGlvbkdsb2JhbChwb3NpdGlvblswXSwgcG9zaXRpb25bMV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcm9vdE5vZGUuc2V0UG9zaXRpb25HbG9iYWwod2luZG93LmlubmVyV2lkdGggLSB3aWR0aCAtIHBvc2l0aW9uWzBdLCBwb3NpdGlvblsxXSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3Bvc2l0aW9uID0gcm9vdE5vZGUuZ2V0UG9zaXRpb24oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHRoaXMuX3Bvc2l0aW9uID0gcm9vdE5vZGUuZ2V0UG9zaXRpb24oKTtcblxuICAgICAgICAgICAgdGhpcy5fbW91c2VPZmZzZXQgPSBbMCwgMF07XG5cbiAgICAgICAgICAgIHJvb3ROb2RlLnNldFN0eWxlUHJvcGVydHkoJ3Bvc2l0aW9uJywgJ2Fic29sdXRlJyk7XG4gICAgICAgICAgICBoZWFkTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9ET1dOLCB0aGlzLl9vbkhlYWREcmFnU3RhcnQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAocG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICB2YXIgcG9zaXRpb25YID0gcG9zaXRpb25bMF0sXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uWSA9IHBvc2l0aW9uWzFdO1xuXG4gICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uWSAhPSAwKXJvb3ROb2RlLnNldFBvc2l0aW9uWShwb3NpdGlvblkpO1xuICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvblggIT0gMClpZiAoYWxpZ24gPT0gTGF5b3V0TW9kZS5SSUdIVClyb290Tm9kZS5nZXRFbGVtZW50KCkubWFyZ2luUmlnaHQgPSBwb3NpdGlvblg7XG4gICAgICAgICAgICAgICAgZWxzZSByb290Tm9kZS5zZXRQb3NpdGlvblgocG9zaXRpb25YKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcm9vdE5vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZmxvYXQnLCBhbGlnbik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBkb2NrQWxpZ25tZW50ID0gZG9jay5hbGlnbjtcblxuICAgICAgICBpZiAoZG9ja0FsaWdubWVudCA9PSBMYXlvdXRNb2RlLkxFRlQgfHxcbiAgICAgICAgICAgIGRvY2tBbGlnbm1lbnQgPT0gTGF5b3V0TW9kZS5SSUdIVCkge1xuICAgICAgICAgICAgYWxpZ24gPSBkb2NrQWxpZ25tZW50O1xuICAgICAgICAgICAgdGhpcy5faGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRvY2tBbGlnbm1lbnQgPT0gTGF5b3V0TW9kZS5UT1AgfHxcbiAgICAgICAgICAgIGRvY2tBbGlnbm1lbnQgPT0gTGF5b3V0TW9kZS5CT1RUT00pIHtcblxuICAgICAgICB9XG5cbiAgICAgICAgLypcbiAgICAgICAgIGlmKGRvY2sucmVzaXphYmxlKVxuICAgICAgICAge1xuICAgICAgICAgdmFyIHNpemVIYW5kbGUgPSBuZXcgQ29udHJvbEtpdC5Ob2RlKENvbnRyb2xLaXQuTm9kZVR5cGUuRElWKTtcbiAgICAgICAgIHNpemVIYW5kbGUuc2V0U3R5bGVDbGFzcyhDb250cm9sS2l0LkNTUy5TaXplSGFuZGxlKTtcbiAgICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKHNpemVIYW5kbGUpO1xuICAgICAgICAgfVxuICAgICAgICAgKi9cblxuICAgICAgICByb290Tm9kZS5zZXRTdHlsZVByb3BlcnR5KCdmbG9hdCcsIGFsaWduKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGFyZW50Lmhpc3RvcnlJc0VuYWJsZWQoKSkge1xuICAgICAgICB2YXIgbWVudVVuZG8gPSB0aGlzLl9tZW51VW5kbyA9IG5ldyBOb2RlKE5vZGUuSU5QVVRfQlVUVE9OKTtcbiAgICAgICAgICAgIG1lbnVVbmRvLnNldFN0eWxlQ2xhc3MoQ1NTLk1lbnVCdG5VbmRvKTtcbiAgICAgICAgICAgIG1lbnVVbmRvLnNldFN0eWxlUHJvcGVydHkoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgICAgbWVudVVuZG8uc2V0UHJvcGVydHkoJ3ZhbHVlJywgSGlzdG9yeS5nZXQoKS5nZXROdW1TdGF0ZXMoKSk7XG4gICAgICAgICAgICBtZW51Tm9kZS5hZGRDaGlsZEF0KG1lbnVVbmRvLCAwKTtcblxuICAgICAgICAgICAgbWVudVVuZG8uYWRkRXZlbnRMaXN0ZW5lcihOb2RlRXZlbnQuTU9VU0VfRE9XTiwgdGhpcy5fb25NZW51VW5kb1RyaWdnZXIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBoZWFkTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9PVkVSLCB0aGlzLl9vbkhlYWRNb3VzZU92ZXIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBoZWFkTm9kZS5hZGRFdmVudExpc3RlbmVyKE5vZGVFdmVudC5NT1VTRV9PVVQsIHRoaXMuX29uSGVhZE1vdXNlT3V0LmJpbmQodGhpcykpXG4gICAgfVxuXG4gICAgaWYgKG9wYWNpdHkgIT0gMS4wICYmIG9wYWNpdHkgIT0gMC4wKSB7XG4gICAgICAgIHJvb3ROb2RlLnNldFN0eWxlUHJvcGVydHkoJ29wYWNpdHknLCBvcGFjaXR5KTtcbiAgICB9XG5cbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihNZW51RXZlbnQuVVBEQVRFX01FTlUsICAgICAgdGhpcywgJ29uVXBkYXRlTWVudScpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKERvY3VtZW50RXZlbnQuV0lORE9XX1JFU0laRSx0aGlzLl9vbldpbmRvd1Jlc2l6ZS5iaW5kKHRoaXMpKTtcbn1cblxuUGFuZWwucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudERpc3BhdGNoZXIucHJvdG90eXBlKTtcblxuXG5QYW5lbC5wcm90b3R5cGUuX29uTWVudUhpZGVNb3VzZURvd24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9ICF0aGlzLl9pc0Rpc2FibGVkO1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcm9vdE5vZGUgPSB0aGlzLl9ub2RlLFxuICAgICAgICBoZWFkTm9kZSA9IHRoaXMuX2hlYWROb2RlLFxuICAgICAgICBtZW51SGlkZSA9IHRoaXMuX21lbnVIaWRlO1xuXG4gICAgaWYgKHRoaXMuX2lzRGlzYWJsZWQpIHtcbiAgICAgICAgaGVhZE5vZGUuZ2V0U3R5bGUoKS5ib3JkZXJCb3R0b20gPSAnbm9uZSc7XG5cbiAgICAgICAgcm9vdE5vZGUuc2V0SGVpZ2h0KGhlYWROb2RlLmdldEhlaWdodCgpKTtcbiAgICAgICAgbWVudUhpZGUuc2V0U3R5bGVDbGFzcyhDU1MuTWVudUJ0blNob3cpO1xuXG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfSElERSwgbnVsbCkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcm9vdE5vZGUuc2V0SGVpZ2h0KGhlYWROb2RlLmdldEhlaWdodCgpICsgdGhpcy5fd3JhcE5vZGUuZ2V0SGVpZ2h0KCkpO1xuICAgICAgICByb290Tm9kZS5kZWxldGVTdHlsZVByb3BlcnR5KCdoZWlnaHQnKTtcbiAgICAgICAgbWVudUhpZGUuc2V0U3R5bGVDbGFzcyhDU1MuTWVudUJ0bkhpZGUpO1xuICAgICAgICBoZWFkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkKTtcblxuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NIT1csIG51bGwpKTtcbiAgICB9XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX29uSGVhZE1vdXNlT3ZlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9tZW51VW5kby5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ2lubGluZScpXG59O1xuUGFuZWwucHJvdG90eXBlLl9vbkhlYWRNb3VzZU91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9tZW51VW5kby5zZXRTdHlsZVByb3BlcnR5KCdkaXNwbGF5JywgJ25vbmUnKVxufTtcblBhbmVsLnByb3RvdHlwZS5vblVwZGF0ZU1lbnUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fbWVudVVuZG8uc2V0UHJvcGVydHkoJ3ZhbHVlJywgSGlzdG9yeS5nZXQoKS5nZXROdW1TdGF0ZXMoKSk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX29uTWVudVVuZG9UcmlnZ2VyID0gZnVuY3Rpb24gKCkge1xuICAgIEhpc3RvcnkuZ2V0KCkucG9wU3RhdGUoKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fb25IZWFkRHJhZ1N0YXJ0ID0gZnVuY3Rpb24oKVxue1xuICAgIHZhciBwYXJlbnROb2RlID0gdGhpcy5fcGFyZW50LmdldE5vZGUoKSxcbiAgICAgICAgbm9kZSAgICAgICA9IHRoaXMuX25vZGU7XG5cbiAgICB2YXIgbm9kZVBvcyAgID0gbm9kZS5nZXRQb3NpdGlvbkdsb2JhbCgpLFxuICAgICAgICBtb3VzZVBvcyAgPSBNb3VzZS5nZXQoKS5nZXRQb3NpdGlvbigpLFxuICAgICAgICBvZmZzZXRQb3MgPSB0aGlzLl9tb3VzZU9mZnNldDtcblxuICAgICAgICBvZmZzZXRQb3NbMF0gPSBtb3VzZVBvc1swXSAtIG5vZGVQb3NbMF07XG4gICAgICAgIG9mZnNldFBvc1sxXSA9IG1vdXNlUG9zWzFdIC0gbm9kZVBvc1sxXTtcblxuICAgIHZhciBldmVudE1vdXNlTW92ZSA9IERvY3VtZW50RXZlbnQuTU9VU0VfTU9WRSxcbiAgICAgICAgZXZlbnRNb3VzZVVwICAgPSBEb2N1bWVudEV2ZW50Lk1PVVNFX1VQO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIG9uRHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuX3VwZGF0ZVBvc2l0aW9uKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25EcmFnRW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE1vdXNlTW92ZSwgb25EcmFnLCBmYWxzZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgb25EcmFnRW5kLCBmYWxzZSk7XG4gICAgICAgICAgICBzZWxmLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCBudWxsKSk7XG4gICAgICAgIH07XG5cbiAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgIHBhcmVudE5vZGUuYWRkQ2hpbGQoICAgbm9kZSk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VNb3ZlLCBvbkRyYWcsICAgIGZhbHNlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TW91c2VVcCwgICBvbkRyYWdFbmQsIGZhbHNlKTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0JFR0lOLG51bGwpKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fdXBkYXRlUG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG1vdXNlUG9zID0gTW91c2UuZ2V0KCkuZ2V0UG9zaXRpb24oKSxcbiAgICAgICAgb2Zmc2V0UG9zID0gdGhpcy5fbW91c2VPZmZzZXQ7XG5cbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLl9wb3NpdGlvbjtcbiAgICBwb3NpdGlvblswXSA9IG1vdXNlUG9zWzBdIC0gb2Zmc2V0UG9zWzBdO1xuICAgIHBvc2l0aW9uWzFdID0gbW91c2VQb3NbMV0gLSBvZmZzZXRQb3NbMV07XG5cbiAgICB0aGlzLl9jb25zdHJhaW5IZWlnaHQoKTtcbiAgICB0aGlzLl9jb25zdHJhaW5Qb3NpdGlvbigpO1xuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFLCBudWxsKSk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX29uV2luZG93UmVzaXplID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlzRG9ja2VkKCkpIHtcbiAgICAgICAgdmFyIGRvY2sgPSB0aGlzLl9kb2NrO1xuXG4gICAgICAgIGlmIChkb2NrLmFsaWduID09IExheW91dE1vZGUuUklHSFQgfHxcbiAgICAgICAgICAgIGRvY2suYWxpZ24gPT0gTGF5b3V0TW9kZS5MRUZUKSB7XG4gICAgICAgICAgICB2YXIgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0LFxuICAgICAgICAgICAgICAgIGxpc3RIZWlnaHQgPSB0aGlzLl9saXN0Tm9kZS5nZXRIZWlnaHQoKSxcbiAgICAgICAgICAgICAgICBoZWFkSGVpZ2h0ID0gdGhpcy5faGVhZE5vZGUuZ2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgICAgIHRoaXMuX2hlaWdodCA9IHdpbmRvd0hlaWdodDtcblxuICAgICAgICAgICAgaWYgKCh3aW5kb3dIZWlnaHQgLSBoZWFkSGVpZ2h0KSA+IGxpc3RIZWlnaHQpe1xuICAgICAgICAgICAgICAgIHRoaXMuX3Njcm9sbEJhci5kaXNhYmxlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHRoaXMuX3Njcm9sbEJhci5lbmFibGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9TSVpFX0NIQU5HRSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAoIXRoaXMuaXNGaXhlZCgpKXtcbiAgICAgICAgICAgIHRoaXMuX2NvbnN0cmFpblBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fY29uc3RyYWluSGVpZ2h0KCk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgRG9jdW1lbnRFdmVudC5XSU5ET1dfUkVTSVpFKSk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX2NvbnN0cmFpblBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBub2RlID0gdGhpcy5fbm9kZTtcblxuICAgIHZhciBtYXhYID0gd2luZG93LmlubmVyV2lkdGggLSBub2RlLmdldFdpZHRoKCksXG4gICAgICAgIG1heFkgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBub2RlLmdldEhlaWdodCgpO1xuXG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5fcG9zaXRpb247XG4gICAgcG9zaXRpb25bMF0gPSBNYXRoLm1heCgwLCBNYXRoLm1pbihwb3NpdGlvblswXSwgbWF4WCkpO1xuICAgIHBvc2l0aW9uWzFdID0gTWF0aC5tYXgoMCwgTWF0aC5taW4ocG9zaXRpb25bMV0sIG1heFkpKTtcblxuICAgIG5vZGUuc2V0UG9zaXRpb25HbG9iYWwocG9zaXRpb25bMF0sIHBvc2l0aW9uWzFdKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fY29uc3RyYWluSGVpZ2h0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5fdkNvbnN0cmFpbilyZXR1cm47XG5cbiAgICB2YXIgaGFzTWF4SGVpZ2h0ID0gdGhpcy5oYXNNYXhIZWlnaHQoKSxcbiAgICAgICAgaGFzU2Nyb2xsV3JhcCA9IHRoaXMuaGFzU2Nyb2xsV3JhcCgpO1xuXG4gICAgdmFyIGhlYWROb2RlID0gdGhpcy5faGVhZE5vZGUsXG4gICAgICAgIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGU7XG5cbiAgICB2YXIgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyO1xuXG4gICAgdmFyIHBhbmVsVG9wID0gdGhpcy5pc0RvY2tlZCgpID8gMCA6XG4gICAgICAgIHRoaXMuaXNGaXhlZCgpID8gMCA6XG4gICAgICAgICAgICB0aGlzLl9wb3NpdGlvblsxXTtcblxuICAgIHZhciBwYW5lbEhlaWdodCA9IGhhc01heEhlaWdodCA/IHRoaXMuZ2V0TWF4SGVpZ2h0KCkgOlxuICAgICAgICBoYXNTY3JvbGxXcmFwID8gc2Nyb2xsQmFyLmdldFRhcmdldE5vZGUoKS5nZXRIZWlnaHQoKSA6XG4gICAgICAgICAgICB3cmFwTm9kZS5nZXRIZWlnaHQoKTtcblxuICAgIHZhciBwYW5lbEJvdHRvbSA9IHBhbmVsVG9wICsgcGFuZWxIZWlnaHQ7XG4gICAgdmFyIGhlYWRIZWlnaHQgPSBoZWFkTm9kZS5nZXRIZWlnaHQoKTtcblxuICAgIHZhciB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQsXG4gICAgICAgIGhlaWdodERpZmYgPSB3aW5kb3dIZWlnaHQgLSBwYW5lbEJvdHRvbSAtIGhlYWRIZWlnaHQsXG4gICAgICAgIGhlaWdodFN1bTtcblxuICAgIGlmIChoZWlnaHREaWZmIDwgMC4wKSB7XG4gICAgICAgIGhlaWdodFN1bSA9IHBhbmVsSGVpZ2h0ICsgaGVpZ2h0RGlmZjtcblxuICAgICAgICBpZiAoIWhhc1Njcm9sbFdyYXApIHtcbiAgICAgICAgICAgIHRoaXMuX2FkZFNjcm9sbFdyYXAoaGVpZ2h0U3VtKTtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfU0NST0xMX1dSQVBfQURERUQsIG51bGwpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHNjcm9sbEJhci5zZXRXcmFwSGVpZ2h0KGhlaWdodFN1bSk7XG4gICAgICAgIHdyYXBOb2RlLnNldEhlaWdodChoZWlnaHRTdW0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKCFoYXNNYXhIZWlnaHQgJiYgaGFzU2Nyb2xsV3JhcCkge1xuICAgICAgICAgICAgc2Nyb2xsQmFyLnJlbW92ZUZyb21QYXJlbnQoKTtcbiAgICAgICAgICAgIHdyYXBOb2RlLmFkZENoaWxkKHRoaXMuX2xpc3ROb2RlKTtcbiAgICAgICAgICAgIHdyYXBOb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ2hlaWdodCcpO1xuXG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxCYXIgPSBudWxsO1xuXG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBQYW5lbEV2ZW50LlBBTkVMX1NDUk9MTF9XUkFQX1JFTU9WRUQsIG51bGwpKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblBhbmVsLnByb3RvdHlwZS5vbkdyb3VwTGlzdFNpemVDaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaGFzU2Nyb2xsV3JhcCgpKXtcbiAgICAgICAgdGhpcy5fdXBkYXRlU2Nyb2xsV3JhcCgpO1xuICAgIH1cbiAgICB0aGlzLl9jb25zdHJhaW5IZWlnaHQoKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fdXBkYXRlU2Nyb2xsV3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgd3JhcE5vZGUgPSB0aGlzLl93cmFwTm9kZSxcbiAgICAgICAgc2Nyb2xsQmFyID0gdGhpcy5fc2Nyb2xsQmFyLFxuICAgICAgICBoZWlnaHQgPSB0aGlzLmhhc01heEhlaWdodCgpID9cbiAgICAgICAgICAgIHRoaXMuZ2V0TWF4SGVpZ2h0KCkgOiAxMDAsXG4gICAgICAgIGxpc3RIZWlnaHQgPSB0aGlzLl9saXN0Tm9kZS5nZXRIZWlnaHQoKTtcblxuICAgIHdyYXBOb2RlLnNldEhlaWdodChsaXN0SGVpZ2h0IDwgaGVpZ2h0ID8gbGlzdEhlaWdodCA6IGhlaWdodCk7XG5cbiAgICBzY3JvbGxCYXIudXBkYXRlKCk7XG5cbiAgICBpZiAoIXNjcm9sbEJhci5pc1ZhbGlkKCkpIHtcbiAgICAgICAgc2Nyb2xsQmFyLmRpc2FibGUoKTtcbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KHdyYXBOb2RlLmdldENoaWxkQXQoMSkuZ2V0SGVpZ2h0KCkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2Nyb2xsQmFyLmVuYWJsZSgpO1xuICAgICAgICB3cmFwTm9kZS5zZXRIZWlnaHQoaGVpZ2h0KTtcbiAgICB9XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuX2FkZFNjcm9sbFdyYXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIGxpc3ROb2RlID0gdGhpcy5fbGlzdE5vZGUsXG4gICAgICAgIGhlaWdodCA9IGFyZ3VtZW50cy5sZW5ndGggPT0gMCA/XG4gICAgICAgICAgICB0aGlzLmdldE1heEhlaWdodCgpIDpcbiAgICAgICAgICAgIGFyZ3VtZW50c1swXTtcblxuICAgIHRoaXMuX3Njcm9sbEJhciA9IG5ldyBTY3JvbGxCYXIod3JhcE5vZGUsIGxpc3ROb2RlLCBoZWlnaHQpO1xuICAgIGlmICh0aGlzLmlzRW5hYmxlZCgpKXtcbiAgICAgICAgd3JhcE5vZGUuc2V0SGVpZ2h0KGhlaWdodCk7XG4gICAgfVxufTtcblxuUGFuZWwucHJvdG90eXBlLmhhc1Njcm9sbFdyYXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Njcm9sbEJhciAhPSBudWxsO1xufTtcblxuXG5QYW5lbC5wcm90b3R5cGUucHJldmVudFNlbGVjdERyYWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmhhc1Njcm9sbFdyYXAoKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fd3JhcE5vZGUuZ2V0RWxlbWVudCgpLnNjcm9sbFRvcCA9IDA7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdibG9jaycpO1xuICAgIHRoaXMuX2lzRGlzYWJsZWQgPSBmYWxzZTtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuXG5cblBhbmVsLnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX25vZGUuc2V0U3R5bGVQcm9wZXJ0eSgnZGlzcGxheScsICdub25lJyk7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9IHRydWU7XG4gICAgdGhpcy5fdXBkYXRlQXBwZWFyYW5jZSgpO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmlzRW5hYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gIXRoaXMuX2lzRGlzYWJsZWQ7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faXNEaXNhYmxlZDtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5oYXNNYXhIZWlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodCAhPSBudWxsO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmdldE1heEhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xufTtcblxuUGFuZWwucHJvdG90eXBlLmlzRG9ja2VkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9kb2NrO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmlzRml4ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2ZpeGVkO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmdldEdyb3VwcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fZ3JvdXBzO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmdldE5vZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGU7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0TGlzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbGlzdE5vZGU7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuZ2V0V2lkdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3dpZHRoO1xufTtcblxuUGFuZWwucHJvdG90eXBlLmdldFBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9wb3NpdGlvbjtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5nZXRQYXJlbnQgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiB0aGlzLl9wYXJlbnQ7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgR3JvdXAgdG8gdGhlIFBhbmVsLlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gR3JvdXAgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9J0NvbnRyb2wgUGFuZWwnXSAtIFRoZSBHcm91cCBsYWJlbCBzdHJpbmdcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy51c2VMYWJlbD10cnVlXSAtIFRyaWdnZXIgd2hldGhlciBhbGwgY29udGFpbmVkIFN1Ykdyb3VwcyBhbmQgQ29tcG9uZW50cyBzaG91bGQgdXNlIGxhYmVsc1xuICogQHBhcmFtIHtCb29sZWFufSBbcGFyYW1zLmVuYWJsZT10cnVlXSAtIERlZmluZXMgaW5pdGlhbCBzdGF0ZSBvcGVuIC8gY2xvc2VkXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5oZWlnaHQ9bnVsbF0gLSBEZWZpbmVzIGlmIHRoZSBoZWlnaHQgb2YgdGhlIEdyb3VwIHNob3VsZCBiZSBjb25zdHJhaW5lZCB0byBjZXJ0YWluIGhlaWdodFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRHcm91cCA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICB2YXIgZ3JvdXAgPSBuZXcgR3JvdXAodGhpcywgcGFyYW1zKTtcbiAgICB0aGlzLl9ncm91cHMucHVzaChncm91cCk7XG4gICAgaWYgKHRoaXMuaXNEb2NrZWQoKSl7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIFBhbmVsRXZlbnQuUEFORUxfU0laRV9DSEFOR0UpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgU3ViR3JvdXAgdG8gdGhlIGxhc3QgYWRkZWQgR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBTdWJHcm91cCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD1udWxsXSAtIFRoZSBTdWJHcm91cCBsYWJlbCBzdHJpbmdcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3BhcmFtcy51c2VMYWJlbD10cnVlXSAtIFRyaWdnZXIgd2hldGhlciBhbGwgY29udGFpbmVkIFN1Ykdyb3VwcyBhbmQgQ29tcG9uZW50cyBzaG91bGQgdXNlIGxhYmVsc1xuICogQHBhcmFtIHtCb29sZWFufSBbcGFyYW1zLmVuYWJsZT10cnVlXSAtIERlZmluZXMgaW5pdGlhbCBzdGF0ZSBvcGVuIC8gY2xvc2VkXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5oZWlnaHQ9bnVsbF0gLSBEZWZpbmVzIGlmIHRoZSBoZWlnaHQgb2YgdGhlIFN1Ykdyb3VwIHNob3VsZCBiZSBjb25zdHJhaW5lZCB0byBjZXJ0YWluIGhlaWdodFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRTdWJHcm91cCA9IGZ1bmN0aW9uKHBhcmFtcyl7XG4gICAgdmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcztcbiAgICBpZihncm91cHMubGVuZ3RoID09IDApe1xuICAgICAgICB0aGlzLmFkZEdyb3VwKCk7XG4gICAgfVxuICAgIGdyb3Vwc1tncm91cHMubGVuZ3RoIC0gMV0uYWRkU3ViR3JvdXAocGFyYW1zKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblBhbmVsLnByb3RvdHlwZS5fYWRkQ29tcG9uZW50ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLFxuICAgICAgICBncm91cDtcbiAgICBpZihncm91cHMubGVuZ3RoID09IDApe1xuICAgICAgICBncm91cHMucHVzaChuZXcgR3JvdXAodGhpcykpO1xuICAgIH1cbiAgICBncm91cCA9IGdyb3Vwc1tncm91cHMubGVuZ3RoLTFdO1xuXG4gICAgZ3JvdXAuYWRkQ29tcG9uZW50LmFwcGx5KGdyb3VwLGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgU3RyaW5nSW5wdXQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBTdHJpbmdJbnB1dCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBTdHJpbmdJbnB1dCBsYWJlbFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkNoYW5nZV0gLSBDYWxsYmFjayBvbiBjaGFuZ2VcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkU3RyaW5nSW5wdXQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChTdHJpbmdJbnB1dCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBOdW1iZXJJbnB1dCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3QuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5LlxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnMuXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBOdW1iZXJJbnB1dCBsYWJlbFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkNoYW5nZV0gLSBDYWxsYmFjayBvbiBjaGFuZ2VcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLnN0ZXBdIC0gQW1vdW50IHN1YmJlZC9hZGRlZCBvbiBhcnJvd0Rvd24vYXJyb3dVcCBwcmVzc1xuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuZHBdIC0gRGVjaW1hbCBwbGFjZXMgZGlzcGxheWVkXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZE51bWJlcklucHV0ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoTnVtYmVySW5wdXQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgUmFuZ2UgaW5wdXQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gUmFuZ2UgbGFiZWxcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwYXJhbXMub25DaGFuZ2VdIC0gQ2FsbGJhY2sgb24gY2hhbmdlXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5zdGVwXSAtIEFtb3VudCBzdWJiZWQvYWRkZWQgb24gYXJyb3dEb3duL2Fycm93VXAgcHJlc3NcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmRwXSAtIERlY2ltYWwgcGxhY2VzIGRpc3BsYXllZFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRSYW5nZSA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFJhbmdlLG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IENoZWNrYm94IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIENoZWNrYm94IGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRDaGVja2JveCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KENoZWNrYm94LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IENvbG9yIG1vZGlmaWVyIHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIENvbG9yIGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMuY29sb3JNb2RlPSdyZ2InXSAtIFRoZSBjb2xvck1vZGUgdG8gYmUgdXNlZDogJ2hleCcgI2ZmMDBmZiwgJ3JnYicgWzI1NSwwLDI1NV0sICdyZ2JmdicgWzEsMCwxXVxuICogQHBhcmFtIHtBcnJheX0gW3BhcmFtcy5wcmVzZXRzXSAtIEEgc2V0IG9mIHByZXNldCBjb2xvcnMgbWF0Y2hpbmcgcGFyYW1zLmNvbG9yTW9kZVxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRDb2xvciA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KENvbG9yLG9iamVjdCx2YWx1ZSwgcGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBCdXR0b24gdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBsYWJlbCAtIFRoZSBvYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9uUHJlc3MgLSBDYWxsYmFja1xuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIEJ1dHRvbiBsYWJlbFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGRCdXR0b24gPSBmdW5jdGlvbiAobGFiZWwsIG9uUHJlc3MsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoQnV0dG9uLGxhYmVsLG9uUHJlc3MscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBTZWxlY3QgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gQnV0dG9uIGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZSAtIGZ1bmN0aW9uKGluZGV4KXt9XG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy50YXJnZXRdIC0gVGhlIHByb3BlcnR5IHRvIGJlIHNldCBvbiBzZWxlY3RcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkU2VsZWN0ID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoU2VsZWN0LG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IFNsaWRlciB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcbiAqIEBwYXJhbSB7U3RyaW5nfSByYW5nZSAtIFRoZSBtaW4vbWF4IGFycmF5IGtleSB0byBiZSB1c2VkXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gU2xpZGVyIGxhYmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcGFyYW1zLm9uQ2hhbmdlXSAtIENhbGxiYWNrIG9uIGNoYW5nZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3BhcmFtcy5vbkZpbmlzaF0gLSBDYWxsYmFjayBvbiBmaW5pc2hcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLnN0ZXBdIC0gQW1vdW50IHN1YmJlZC9hZGRlZCBvbiBhcnJvd0Rvd24vYXJyb3dVcCBwcmVzcyBpbnNpZGUgdGhlIGlucHV0XG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5kcF0gLSBEZWNpbWFsIHBsYWNlcyBkaXNwbGF5ZWRcbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkU2xpZGVyID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHJhbmdlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFNsaWRlcixvYmplY3QsdmFsdWUscmFuZ2UscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBGdW5jdGlvblBsb3R0ZXIgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5IC0gZih4KSwgZih4LHkpXG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gRnVuY3Rpb25QbG90dGVyIGxhYmVsXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZEZ1bmN0aW9uUGxvdHRlciA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KEZ1bmN0aW9uUGxvdHRlcixvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBYWS1QYWQgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gUGFkIGxhYmVsXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFBhZCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFBhZCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBWYWx1ZVBsb3R0ZXIgdG8gbGFzdCBhZGRlZCBTdWJHcm91cC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgLSBUaGUgcHJvcGVydHkga2V5XG4gKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gLSBDb21wb25lbnQgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtwYXJhbXMubGFiZWw9dmFsdWVdIC0gUGxvdHRlciBsYWJlbFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuaGVpZ2h0XSAtIFBsb3R0ZXIgaGVpZ2h0XG4gKiBAcGFyYW0ge051bWJlcn0gW3BhcmFtcy5yZXNvbHV0aW9uXSAtIEdyYXBoIHJlc29sdXRpb25cbiAqIEByZXR1cm5zIHtQYW5lbH1cbiAqL1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkVmFsdWVQbG90dGVyID0gZnVuY3Rpb24gKG9iamVjdCwgdmFsdWUsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoVmFsdWVQbG90dGVyLG9iamVjdCx2YWx1ZSxwYXJhbXMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IE51bWJlck91dHB1dCB0byBsYXN0IGFkZGVkIFN1Ykdyb3VwLlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSAtIFRoZSBwcm9wZXJ0eSBrZXlcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyYW1zXSAtIENvbXBvbmVudCBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW3BhcmFtcy5sYWJlbD12YWx1ZV0gLSBPdXRwdXQgbGFiZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcGFyYW1zLmRwXSAtIERlY2ltYWwgcGxhY2VzIGRpc3BsYXllZFxuICogQHJldHVybnMge1BhbmVsfVxuICovXG5cblBhbmVsLnByb3RvdHlwZS5hZGROdW1iZXJPdXRwdXQgPSBmdW5jdGlvbiAob2JqZWN0LCB2YWx1ZSwgcGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChOdW1iZXJPdXRwdXQsb2JqZWN0LHZhbHVlLHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgU3RyaW5nT3V0cHV0IHRvIGxhc3QgYWRkZWQgU3ViR3JvdXAuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIC0gVGhlIHByb3BlcnR5IGtleVxuICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIC0gQ29tcG9uZW50IG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFyYW1zLmxhYmVsPXZhbHVlXSAtIE91dHB1dCBsYWJlbFxuICogQHBhcmFtIHtOdW1iZXJ9IFtwYXJhbXMuZHBdIC0gRGVjaW1hbCBwbGFjZXMgZGlzcGxheWVkXG4gKiBAcmV0dXJucyB7UGFuZWx9XG4gKi9cblxuUGFuZWwucHJvdG90eXBlLmFkZFN0cmluZ091dHB1dCA9IGZ1bmN0aW9uIChvYmplY3QsIHZhbHVlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gdGhpcy5fYWRkQ29tcG9uZW50KFN0cmluZ091dHB1dCxvYmplY3QsdmFsdWUscGFyYW1zKTtcbn07XG5cblBhbmVsLnByb3RvdHlwZS5hZGRDYW52YXMgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZENvbXBvbmVudChDYW52YXNfLHBhcmFtcyk7XG59O1xuXG5QYW5lbC5wcm90b3R5cGUuYWRkU1ZHID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLl9hZGRDb21wb25lbnQoU1ZHXyxwYXJhbXMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYW5lbDsiLCJ2YXIgUGFuZWxFdmVudCA9IHtcblx0UEFORUxfTU9WRV9CRUdJTiAgICAgICAgICA6ICdwYW5lbE1vdmVCZWdpbicsXG5cdFBBTkVMX01PVkUgICAgICAgICAgICAgICAgOiAncGFuZWxNb3ZlJyxcblx0UEFORUxfTU9WRV9FTkQgICAgICAgICAgICA6ICdwYW5lbE1vdmVFbmQnLFxuXG5cdFBBTkVMX1NIT1cgICAgICAgICAgICAgICAgOiAncGFuZWxTaG93Jyxcblx0UEFORUxfSElERSAgICAgICAgICAgICAgICA6ICdwYW5lbEhpZGUnLFxuXG5cdFBBTkVMX1NDUk9MTF9XUkFQX0FEREVEICAgOiAncGFuZWxTY3JvbGxXcmFwQWRkZWQnLFxuXHRQQU5FTF9TQ1JPTExfV1JBUF9SRU1PVkVEIDogJ3BhbmVsU2Nyb2xsV3JhcFJlbW92ZWQnLFxuXG5cdFBBTkVMX1NJWkVfQ0hBTkdFICAgICAgICA6ICdwYW5lbFNpemVDaGFuZ2UnXG59O1xubW9kdWxlLmV4cG9ydHMgPSBQYW5lbEV2ZW50OyIsInZhciBBYnN0cmFjdEdyb3VwID0gcmVxdWlyZSgnLi9BYnN0cmFjdEdyb3VwJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvTm9kZScpO1xudmFyIENTUyA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvQ1NTJyk7XG5cbnZhciBFdmVudF8gPSByZXF1aXJlKCcuLi9jb3JlL2V2ZW50L0V2ZW50JyksXG4gICAgRG9jdW1lbnRFdmVudCA9IHJlcXVpcmUoJy4uL2NvcmUvZG9jdW1lbnQvRG9jdW1lbnRFdmVudCcpLFxuICAgIFBhbmVsRXZlbnQgPSByZXF1aXJlKCcuL1BhbmVsRXZlbnQnKSxcbiAgICBHcm91cEV2ZW50ID0gcmVxdWlyZSgnLi9Hcm91cEV2ZW50JyksXG4gICAgQ29tcG9uZW50RXZlbnQgPSByZXF1aXJlKCcuLi9jb3JlL0NvbXBvbmVudEV2ZW50Jyk7XG5cbmZ1bmN0aW9uIFN1Ykdyb3VwKHBhcmVudCxwYXJhbXMpe1xuICAgIHBhcmFtcyAgICAgICAgICAgID0gcGFyYW1zICAgICAgICAgIHx8IHt9O1xuICAgIHBhcmFtcy5sYWJlbCAgICAgID0gcGFyYW1zLmxhYmVsICAgIHx8IG51bGw7XG4gICAgcGFyYW1zLnVzZUxhYmVscyAgPSBwYXJhbXMudXNlTGFiZWxzICA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IHBhcmFtcy51c2VMYWJlbHM7XG5cbiAgICBBYnN0cmFjdEdyb3VwLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuICAgIHZhciByb290Tm9kZSA9IHRoaXMuX25vZGUsXG4gICAgICAgIHdyYXBOb2RlID0gdGhpcy5fd3JhcE5vZGUsXG4gICAgICAgIGxpc3ROb2RlID0gdGhpcy5fbGlzdE5vZGU7XG5cbiAgICAgICAgcm9vdE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuU3ViR3JvdXApO1xuICAgICAgICB3cmFwTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5XcmFwKTtcblxuICAgICAgICB3cmFwTm9kZS5hZGRDaGlsZChsaXN0Tm9kZSk7XG4gICAgICAgIHJvb3ROb2RlLmFkZENoaWxkKHdyYXBOb2RlKTtcblxuICAgIHRoaXMuX3VzZUxhYmVscyAgPSBwYXJhbXMudXNlTGFiZWxzO1xuXG4gICAgdmFyIGxhYmVsID0gcGFyYW1zLmxhYmVsO1xuXG4gICAgaWYgKGxhYmVsICYmIGxhYmVsLmxlbmd0aCAhPSAwICYmIGxhYmVsICE9ICdub25lJykge1xuICAgICAgICB2YXIgaGVhZE5vZGUgPSB0aGlzLl9oZWFkTm9kZSA9IG5ldyBOb2RlKCksXG4gICAgICAgICAgICBsYWJsV3JhcCA9IG5ldyBOb2RlKCksXG4gICAgICAgICAgICBsYWJsTm9kZSA9IG5ldyBOb2RlKE5vZGUuU1BBTik7XG5cbiAgICAgICAgaGVhZE5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuSGVhZCk7XG4gICAgICAgIGxhYmxXcmFwLnNldFN0eWxlQ2xhc3MoQ1NTLldyYXApO1xuICAgICAgICBsYWJsTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5MYWJlbCk7XG5cbiAgICAgICAgbGFibE5vZGUuc2V0UHJvcGVydHkoJ2lubmVySFRNTCcsIGxhYmVsKTtcblxuICAgICAgICBsYWJsV3JhcC5hZGRDaGlsZChsYWJsTm9kZSk7XG4gICAgICAgIGhlYWROb2RlLmFkZENoaWxkKGxhYmxXcmFwKTtcblxuXG4gICAgICAgIHZhciBpbmRpTm9kZSA9IHRoaXMuX2luZGlOb2RlID0gbmV3IE5vZGUoKTtcbiAgICAgICAgaW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCU3ViTWF4KTtcbiAgICAgICAgaGVhZE5vZGUuYWRkQ2hpbGRBdChpbmRpTm9kZSwgMCk7XG5cbiAgICAgICAgcm9vdE5vZGUuYWRkQ2hpbGRBdChoZWFkTm9kZSwgMCk7XG5cbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuU1VCR1JPVVBfVFJJR0dFUiwgdGhpcy5fcGFyZW50LCAnb25TdWJHcm91cFRyaWdnZXInKTtcbiAgICAgICAgaGVhZE5vZGUuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50Lk1PVVNFX0RPV04sIHRoaXMuX29uSGVhZE1vdXNlRG93bi5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG5cbiAgICB9XG5cbiAgICBpZih0aGlzLmhhc01heEhlaWdodCgpKXtcbiAgICAgICAgdGhpcy5hZGRTY3JvbGxXcmFwKCk7XG4gICAgfVxuXG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoR3JvdXBFdmVudC5TVUJHUk9VUF9FTkFCTEUsICB0aGlzLCAnb25FbmFibGUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihHcm91cEV2ZW50LlNVQkdST1VQX0RJU0FCTEUsIHRoaXMsICdvbkRpc2FibGUnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihQYW5lbEV2ZW50LlBBTkVMX01PVkVfRU5ELCAgIHRoaXMsICdvblBhbmVsTW92ZUVuZCcpO1xuICAgIHRoaXMuX3BhcmVudC5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9DSEFOR0UsdGhpcywgJ29uR3JvdXBTaXplQ2hhbmdlJyk7XG4gICAgdGhpcy5fcGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoUGFuZWxFdmVudC5QQU5FTF9TSVpFX0NIQU5HRSx0aGlzLCAnb25QYW5lbFNpemVDaGFuZ2UnKTtcbiAgICB0aGlzLl9wYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcihEb2N1bWVudEV2ZW50LldJTkRPV19SRVNJWkUsICAgIHRoaXMsICdvbldpbmRvd1Jlc2l6ZScpO1xuXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsdGhpcy5fcGFyZW50LCdvbkdyb3VwU2l6ZVVwZGF0ZScpO1xufVxuXG5TdWJHcm91cC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEFic3RyYWN0R3JvdXAucHJvdG90eXBlKTtcblxuLy9GSVhNRVxuU3ViR3JvdXAucHJvdG90eXBlLl9vbkhlYWRNb3VzZURvd24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNEaXNhYmxlZCA9ICF0aGlzLl9pc0Rpc2FibGVkO1xuICAgIHRoaXMuX29uVHJpZ2dlcigpO1xuXG4gICAgdmFyIGV2ZW50ID0gRG9jdW1lbnRFdmVudC5NT1VTRV9VUCxcbiAgICAgICAgc2VsZiAgPSB0aGlzO1xuICAgIHZhciBvbkRvY3VtZW50TW91c2VVcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5fb25UcmlnZ2VyKCk7XG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIG9uRG9jdW1lbnRNb3VzZVVwKTtcbiAgICB9O1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudCxvbkRvY3VtZW50TW91c2VVcCk7XG59O1xuXG5TdWJHcm91cC5wcm90b3R5cGUuX29uVHJpZ2dlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3VwZGF0ZUFwcGVhcmFuY2UoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLEdyb3VwRXZlbnQuU1VCR1JPVVBfVFJJR0dFUixudWxsKSk7XG59O1xuXG5cblN1Ykdyb3VwLnByb3RvdHlwZS5fdXBkYXRlQXBwZWFyYW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5pc0Rpc2FibGVkKCkpIHtcbiAgICAgICAgdGhpcy5fd3JhcE5vZGUuc2V0SGVpZ2h0KDApO1xuICAgICAgICBpZiAodGhpcy5oYXNMYWJlbCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9oZWFkTm9kZS5zZXRTdHlsZUNsYXNzKENTUy5IZWFkSW5hY3RpdmUpO1xuICAgICAgICAgICAgdGhpcy5faW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCU3ViTWluKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3dyYXBOb2RlLnNldEhlaWdodCh0aGlzLmdldE1heEhlaWdodCgpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3dyYXBOb2RlLmRlbGV0ZVN0eWxlUHJvcGVydHkoJ2hlaWdodCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmhhc0xhYmVsKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2hlYWROb2RlLnNldFN0eWxlQ2xhc3MoQ1NTLkhlYWQpO1xuICAgICAgICAgICAgdGhpcy5faW5kaU5vZGUuc2V0U3R5bGVDbGFzcyhDU1MuQXJyb3dCU3ViTWF4KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblN1Ykdyb3VwLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaGFzTWF4SGVpZ2h0KCkpe1xuICAgICAgICB0aGlzLl9zY3JvbGxCYXIudXBkYXRlKCk7XG4gICAgfVxufTtcblxuU3ViR3JvdXAucHJvdG90eXBlLm9uQ29tcG9uZW50U2VsZWN0RHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnByZXZlbnRTZWxlY3REcmFnKCk7XG59O1xuXG5TdWJHcm91cC5wcm90b3R5cGUub25FbmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNEaXNhYmxlZCgpKXtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBDb21wb25lbnRFdmVudC5FTkFCTEUsIG51bGwpKTtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUub25EaXNhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlzRGlzYWJsZWQoKSl7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgQ29tcG9uZW50RXZlbnQuRElTQUJMRSwgbnVsbCkpO1xufTtcblxuLy9idWJibGVcblN1Ykdyb3VwLnByb3RvdHlwZS5vbkdyb3VwU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50Xyh0aGlzLCBHcm91cEV2ZW50LkdST1VQX1NJWkVfQ0hBTkdFLCBudWxsKSk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLm9uR3JvdXBTaXplVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnRfKHRoaXMsIEdyb3VwRXZlbnQuR1JPVVBfU0laRV9VUERBVEUsIG51bGwpKTtcbn07XG5TdWJHcm91cC5wcm90b3R5cGUub25QYW5lbE1vdmVFbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudF8odGhpcywgUGFuZWxFdmVudC5QQU5FTF9NT1ZFX0VORCwgbnVsbCkpO1xufTtcblN1Ykdyb3VwLnByb3RvdHlwZS5vblBhbmVsU2l6ZUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91cGRhdGVBcHBlYXJhbmNlKCk7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLm9uV2luZG93UmVzaXplID0gZnVuY3Rpb24gKGUpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZSk7XG59O1xuXG5TdWJHcm91cC5wcm90b3R5cGUuaGFzTGFiZWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlYWROb2RlICE9IG51bGw7XG59O1xuU3ViR3JvdXAucHJvdG90eXBlLmFkZENvbXBvbmVudE5vZGUgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIHRoaXMuX2xpc3ROb2RlLmFkZENoaWxkKG5vZGUpO1xufTtcblN1Ykdyb3VwLnByb3RvdHlwZS51c2VzTGFiZWxzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl91c2VMYWJlbHM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN1Ykdyb3VwOyJdfQ==
(1)
});
