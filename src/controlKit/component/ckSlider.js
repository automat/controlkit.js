ControlKit.Slider = function(parent,object,value,label,target,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    this._values  = this._object[this._key];
    this._targetKey = target;

    /*---------------------------------------------------------------------------------*/

    params          = params          || {};
    params.step     = params.step     || 1;
    params.onChange = params.onChange || this._onChange;
    params.onFinish = params.onFinish || this._onFinish;
    params.dp       = params.dp       || 2;

    console.log(label);

    /*---------------------------------------------------------------------------------*/

    this._step     = params.step;
    this._onChange = params.onChange;
    this._onFinish = params.onFinish;
    this._dp       = params.dp;

    var values    = this._values,
        obj       = this._object,
        targetKey = this._targetKey;

    var wrapNode  = this._wrapNode;

    /*---------------------------------------------------------------------------------*/

    wrapNode.setStyleClass(ControlKit.CSS.WrapSlider);

    var slider = this._slider = new ControlKit.Slider_Internal(wrapNode,
                                                               this._onSliderBegin.bind(this),
                                                               this._onSliderMove.bind(this),
                                                               this._onSliderEnd.bind(this));

    slider.setBoundMin(values[0]);
    slider.setBoundMax(values[1]);
    slider.setValue(obj[targetKey]);

    /*---------------------------------------------------------------------------------*/

    var input  = this._input = new ControlKit.NumberInput_Internal(this._step,
                                                                   this._dp,
                                                                   null,
                                                                   this._onInputChange.bind(this),
                                                                   this._onInputChange.bind(this));

    input.setValue(obj[targetKey]);

    wrapNode.addChild(input.getNode());

    /*---------------------------------------------------------------------------------*/

    this._parent.addEventListener(ControlKit.EventType.PANEL_MOVE_END,    this, 'onPanelMoveEnd');
    this._parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE, this, 'onGroupWidthChange');
};

ControlKit.Slider.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.Slider.prototype.pushHistoryState = function(){var obj = this._object,key = this._targetKey;ControlKit.History.getInstance().pushState(obj,key,obj[key]);};

ControlKit.Slider.prototype._onSliderBegin  = function(){this.pushHistoryState();};

ControlKit.Slider.prototype._onSliderMove = function()
{
    this.applyValue();
    this._updateValueField();
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
    this._onChange();
};

ControlKit.Slider.prototype._onSliderEnd = function()
{
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
    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
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
        var values = this._values;

        //TODO: FIX ME!
        if(origin instanceof ControlKit.Range)
        {
            slider.setBoundMin(values[0]);
            slider.setBoundMax(values[1]);


            //slider.setValue(this._object[this._targetKey]);
            //this._slider.updateInterpolatedValue();
            this.applyValue();
        }
        else
        {
            slider.setBoundMin(values[0]);
            slider.setBoundMax(values[1]);
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


ControlKit.Slider.prototype._updateValueField  = function(){this._input.setValue(this._slider.getValue());};

ControlKit.Slider.prototype.onPanelMoveEnd     =
ControlKit.Slider.prototype.onGroupWidthChange = function(){this._slider.resetOffset();};
