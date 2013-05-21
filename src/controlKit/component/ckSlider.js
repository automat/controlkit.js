ControlKit.Slider = function(parent,object,value,target,label,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    this._values    = this._object[this._key];
    this._targetKey = target;

    /*---------------------------------------------------------------------------------*/

    params          = params          || {};
    params.step     = params.step     || 1;
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.dp       = params.dp       || 2;

    /*---------------------------------------------------------------------------------*/

    this._step     = params.step;
    this._onChange = params.onChange;
    this._onFinish = params.onFinish;
    this._dp       = params.dp;

    this._wrapNode.setStyleClass(ControlKit.CSS.WrapSlider);

    var slider = this._slider = new ControlKit.Slider_Internal(this._wrapNode,
                                                      this._onSliderChange.bind(this),
                                                      this._onSliderFinish.bind(this));

    slider.setBoundMin(this._values[0]);
    slider.setBoundMax(this._values[1]);
    slider.setValue(this._object[this._targetKey]);

    var input  = this._input = new ControlKit.NumberInput_Internal(this._step,
                                                          this._dp,
                                                          this._onInputChange.bind(this),
                                                          this._onInputChange.bind(this));

    input.setValue(this._object[this._targetKey]);

    this._wrapNode.addChild(input.getNode());

    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE_END,this,'onPanelMoveEnd');
};

ControlKit.Slider.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.Slider.prototype._onSliderChange = function()
{
    this.applyValue();
    this._updateValueField();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
    this._onChange();

};

ControlKit.Slider.prototype._onSliderFinish = function()
{
    this.pushHistoryState();
    this.applyValue();
    this._updateValueField();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
    this._onFinish();
};

ControlKit.Slider.prototype._onInputChange = function()
{
    var input = this._input,
        valueMin = this._values[0],
        valueMax = this._values[1];

    if(input.getValue() >= valueMax)input.setValue(valueMax);
    if(input.getValue() <= valueMin)input.setValue(valueMin);

    var value = input.getValue();

    this._slider.setValue(value);
    this._object[this._targetKey] = value;
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED));
    this._onFinish();
};

ControlKit.Slider.prototype.applyValue = function()
{
    var value = this._slider.getValue();
    this._object[this._targetKey] = value;
    this._input.setValue(value);
};

//TODO:FIX ME
ControlKit.Slider.prototype.onValueUpdate = function(e)
{
    var origin = e.data.origin;

    if(origin == this)return;

    var slider = this._slider;

    if(!(origin instanceof ControlKit.Slider))
    {
        //TODO: FIX ME!
        if(origin instanceof ControlKit.Range)
        {
            slider.setBoundMin(this._values[0]);
            slider.setBoundMax(this._values[1]);
            slider.setValue(this._object[this._targetKey]);
            //this._slider.updateInterpolatedValue();
            this.applyValue();
        }
        else
        {
            slider.setBoundMin(this._values[0]);
            slider.setBoundMax(this._values[1]);
            slider.setValue(this._object[this._targetKey]);
            this.applyValue();
        }
    }
    else
    {
        slider.setValue(this._object[this._targetKey]);
        this.applyValue();
    }
};



ControlKit.Slider.prototype._updateValueField = function(){this._input.setValue(this._slider.getValue());};
ControlKit.Slider.prototype.onPanelMoveEnd    = function(){this._slider.resetOffset();};
