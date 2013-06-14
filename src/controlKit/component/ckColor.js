ControlKit.Color = function(parent,object,value,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params || {};
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.presets  = params.presets  || null;

    /*---------------------------------------------------------------------------------*/

    this._onChange = this._onFinish = params._onChange;

    this._presetsKey = params.presets;

    /*---------------------------------------------------------------------------------*/

    var wrapNode = this._wrapNode;

    var color = this._color = new ControlKit.Node(ControlKit.NodeType.DIV);
        color.addChild(new ControlKit.Node(ControlKit.NodeType.DIV));

    this._value = this._object[this._key];

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

        var presets   = this._object[this._presetsKey],
            options   = ControlKit.Options.getInstance(),
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
                                      ControlKit.Constant.PADDING_PRESET,
                                      true);
                                  };

            presetBtn.setCallbackActive(onPresetActivate);
            presetBtn.setCallbackInactive(onPresetDeactivate);
    }

    color.getFirstChild().setEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onColorTrigger.bind(this));

    /*---------------------------------------------------------------------------------*/

    this._updateColor();

};

ControlKit.Color.prototype = Object.create(ControlKit.ObjectComponent.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.Color.prototype._onColorTrigger = function()
{
    var onPickerPick = function()
                       {
                           this.pushHistoryState();
                           this._value = ControlKit.Picker.getInstance().getHEX();
                           this.applyValue();

                       }.bind(this);

    var picker = ControlKit.Picker.getInstance();
        picker.setColorHEX(this._value);
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
    var colorHEX  = this._value;

    var colorNode = this._color.getFirstChild();
    colorNode.setProperty('innerHTML',colorHEX);
    colorNode.getStyle().backgroundColor = colorHEX;
    colorNode.getStyle().backgroundImage = 'linear-gradient( rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 100%)';
    colorNode.getStyle().boxShadow       = '0 1px 0 0 rgba(0,0,0,0.25) inset';
};