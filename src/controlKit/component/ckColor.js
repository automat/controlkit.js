ControlKit.Color = function(parent,object,value,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params           = params           || {};
    params.onChange  = params.onChange  || this._onChange;
    params.onFinish  = params.onFinish  || this._onFinish;
    params.presets   = params.presets   || ControlKit.Default.COLOR_PRESETS;
    params.colorMode = params.colorMode || ControlKit.Default.COLOR_COLOR_MODE;

    /*---------------------------------------------------------------------------------*/

    this._onChange   = this._onFinish = params.onChange;
    this._presetsKey = params.presets;

    /*---------------------------------------------------------------------------------*/

    var color = this._color = new ControlKit.Node(ControlKit.NodeType.DIV);
    var value = this._value = this._object[this._key];

    var colorMode = this._colorMode = params.colorMode;

    this._validateColorFormat(value, ControlKit.Error.COLOR_FORMAT_HEX,
                                     ControlKit.Error.COLOR_FORMAT_RGB_RGBFV_HSV);

    var wrapNode = this._wrapNode;

    if(!this._presetsKey)
    {
        color.setStyleClass(ControlKit.CSS.Color);
        wrapNode.addChild(color);
    }
    else
    {
        color.setStyleClass(ControlKit.CSS.Color);

        var colorWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
            colorWrap.setStyleClass(ControlKit.CSS.WrapColorWPreset);

            wrapNode.addChild(colorWrap);
            colorWrap.addChild(color);

        var presets   = this._object[this._presetsKey];

        var i = -1;
        while(++i < presets.length)
        {
            this._validateColorFormat(presets[i], ControlKit.Error.COLOR_PRESET_FORMAT_HEX,
                                                  ControlKit.Error.COLOR_PRESET_FORMAT_RGB_RGBFV_HSV);
        }

        var options   = ControlKit.Options.getInstance(),
            presetBtn = new ControlKit.PresetBtn(wrapNode);

        var onPresetDeactivate = function(){options.clear();presetBtn.deactivate();};

        var self = this;
        var onPresetActivate    = function()
                                  {
                                      options.build(presets,
                                      self._value,
                                      color,
                                      function()
                                      {
                                          self.pushHistoryState();
                                          self._value = presets[options.getSelectedIndex()];
                                          self.applyValue();
                                      },
                                      onPresetDeactivate,
                                      ControlKit.Metric.PADDING_PRESET,
                                      true,
                                      colorMode);
                                  };

            presetBtn.setOnActive(onPresetActivate);
            presetBtn.setOnDeactive(onPresetDeactivate);
    }

    color.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onColorTrigger.bind(this));

    /*---------------------------------------------------------------------------------*/

    this._updateColor();

};

ControlKit.Color.prototype = Object.create(ControlKit.ObjectComponent.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.Color.prototype._onColorTrigger = function()
{
    var colorMode      = this._colorMode,
        colorModeHEX   = ControlKit.ColorMode.HEX,
        colorModeRGB   = ControlKit.ColorMode.RGB,
        colorModeRGBfv = ControlKit.ColorMode.RGBfv,
        colorModeHSV   = ControlKit.ColorMode.HSV;

    var value = this._value,
        temp;

    var onPickerPick = function()
                       {
                           this.pushHistoryState();

                           switch(colorMode)
                           {
                               case colorModeHEX:   this._value = ControlKit.Picker.getInstance().getHEX();break;
                               case colorModeRGB:

                                   //if val = Float32array or so
                                   temp = ControlKit.Picker.getInstance().getRGB();
                                   value[0] = temp[0];
                                   value[1] = temp[1];
                                   value[2] = temp[2];
                                   break;

                               case colorModeRGBfv:

                                   temp = ControlKit.Picker.getInstance().getRGBfv();
                                   value[0] = temp[0];
                                   value[1] = temp[1];
                                   value[2] = temp[2];
                                   break;

                               case colorModeHSV:   this._value = ControlKit.Picker.getInstance().getHSV();break;
                           }

                           this.applyValue();

                       }.bind(this);

    var picker = ControlKit.Picker.getInstance();

    switch(colorMode)
    {
        case colorModeHEX:   picker.setColorHEX(value);break;
        case colorModeRGB:   picker.setColorRGB(value[0],value[1],value[2]);break;
        case colorModeRGBfv: picker.setColorRGBfv(value[0],value[1],value[2]);break;
        case colorModeHSV:   picker.setColorHSV(value[0],value[1],value[2]);break;
    }

        picker.setCallbackPick(onPickerPick);
        picker.open();
};

/*---------------------------------------------------------------------------------*/

ControlKit.Color.prototype.applyValue = function()
{
    this._object[this._key] = this._value;
    this._updateColor();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));

};

ControlKit.Color.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._value = this._object[this._key];
    this._updateColor();
};

/*---------------------------------------------------------------------------------*/

ControlKit.Color.prototype._updateColor = function()
{
    var color  = this._value,
        colorNode = this._color,
        nodeColor;

    colorNode.setProperty('innerHTML',color)

    switch(this._colorMode)
    {
        case ControlKit.ColorMode.HEX:
            nodeColor = color;
            break;

        case ControlKit.ColorMode.RGB:
            nodeColor = ControlKit.ColorUtil.RGB2HEX(color[0],color[1],color[2]);
            break;

        case ControlKit.ColorMode.RGBfv:
            nodeColor = ControlKit.ColorUtil.RGBfv2HEX(color[0],color[1],color[2]);
            break;

        case ControlKit.ColorMode.HSV:
            nodeColor = ControlKit.ColorUtil.HSV2RGB(color[0],color[1],color[2]);
            break;
    }

    colorNode.getStyle().backgroundColor = nodeColor;
};

ControlKit.Color.prototype._validateColorFormat = function(value,msgHex,msgArr)
{
    var colorMode = this._colorMode;


    if(colorMode == ControlKit.ColorMode.HEX && Object.prototype.toString.call(value) === '[object Array]' ||
       colorMode == ControlKit.ColorMode.HEX && Object.prototype.toString.call(value) === '[object Float32Array]')
    {
        throw new TypeError(msgHex);
    }
    if((colorMode == ControlKit.ColorMode.RGB   ||
        colorMode == ControlKit.ColorMode.RGBfv ||
        colorMode == ControlKit.ColorMode.HSV) &&
        Object.prototype.toString.call(value) !== '[object Array]' ||
        colorMode == ControlKit.ColorMode.HSV &&
        Object.prototype.toString.call(value) !== '[object Float32Array]')
    {
        throw new TypeError(msgArr);
    }
};