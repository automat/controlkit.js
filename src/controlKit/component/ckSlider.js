function CKSlider(parent,object,value,target,label,params)
{
    CKObjectComponent.apply(this,arguments);

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

    this._wrapNode.setStyleClass(CKCSS.WrapSlider);

    var slider = this._slider = new CKSlider_Internal(this._wrapNode,
                                                      this._onSliderChange.bind(this),
                                                      this._onSliderFinish.bind(this));

    slider.setBoundMin(this._values[0]);
    slider.setBoundMax(this._values[1]);
    slider.setValue(this._object[this._targetKey]);

    var input  = this._input = new CKNumberInput_Internal(this._step,
                                                          this._dp,
                                                          this._onInputChange.bind(this),
                                                          this._onInputChange.bind(this));

    input.setValue(this._object[this._targetKey]);

    this._wrapNode.addChild(input.getNode());

    this._parent.addEventListener(CKEventType.PANEL_MOVE_END,this,'onPanelMoveEnd');
}

CKSlider.prototype = Object.create(CKObjectComponent.prototype);

CKSlider.prototype._onSliderChange = function()
{
    this._applyValue();
    this._updateValueField();
    this.dispatchEvent(new CKEvent(this,CKEventType.VALUE_UPDATED));
    this._onChange();

};

CKSlider.prototype._onSliderFinish = function()
{
    this._applyValue();
    this._updateValueField();
    this.dispatchEvent(new CKEvent(this,CKEventType.VALUE_UPDATED));
    this._onFinish();

};

CKSlider.prototype._onInputChange = function()
{
    var input = this._input,
        valueMin = this._values[0],
        valueMax = this._values[1];

    if(input.getValue() >= valueMax)input.setValue(valueMax);
    if(input.getValue() <= valueMin)input.setValue(valueMin);

    var value = input.getValue();

    this._slider.setValue(value);
    this._object[this._targetKey] = value;
    this.dispatchEvent(new CKEvent(this,CKEventType.VALUE_UPDATED));
    this._onFinish();
};

CKSlider.prototype._applyValue = function()
{
    var value = this._slider.getValue();
    this._object[this._targetKey] = value;
    this._input.setValue(value);
};

//TODO:FIX ME
CKSlider.prototype.onValueUpdate = function(e)
{
    var origin = e.data.origin;

    if(origin == this)return;

    if(!(origin instanceof CKSlider))
    {
        //TODO: FIX ME!
        if(origin instanceof CKRange)
        {
            this._slider.setBoundMin(this._values[0]);
            this._slider.setBoundMax(this._values[1]);
            this._slider.setValue(this._object[this._targetKey]);
            //this._slider.updateInterpolatedValue();
            this._applyValue();
        }
        else
        {
            this._slider.setBoundMin(this._values[0]);
            this._slider.setBoundMax(this._values[1]);
            this._slider.setValue(this._object[this._targetKey]);
            this._applyValue();
        }
    }
    else
    {
        this._slider.setValue(this._object[this._targetKey]);
        this._applyValue();
    }
};



CKSlider.prototype._updateValueField = function(){this._input.setValue(this._slider.getValue());};
CKSlider.prototype.onPanelMoveEnd    = function(){this._slider.resetOffset();};
