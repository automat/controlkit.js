var ObjectComponent = require('../core/component/ObjectComponent');

var Error = require('../core/error/ckError');

var Node = require('../core/document/Node');
var ColorMode = require('../core/color/ColorMode');
var Picker = require('./internal/Picker');
var ColorUtil = require('../core/color/ColorUtil');
var Options = require('./internal/Options');
var PresetBtn = require('./internal/PresetBtn');
var Metric = require('../core/Metric');
var CSS = require('../core/document/CSS');

var Event_ = require('../core/event/Event'),
    NodeEvent = require('../core/document/NodeEvent'),
    ComponentEvent = require('../core/component/ComponentEvent');

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