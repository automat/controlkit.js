function CKSlider_Internal(parent,fixed,onChange,onFinish)
{
    this._parent    = parent;
    this._bounds    = [0,1];
    this._value     = 0;
    this._dragging  = false;
    this._fixed     = fixed;
    this._focus     = false;
    this._intrpl    = 0;

    this._onChange   = onChange || function(){};
    this._onFinish   = onFinish || function(){};

    var d = CKDOM,
        c = d.CSS;

    this._cont   = d.addDiv(parent._divComp, {className:c.SliderSlot});
    this._slot   = d.addDiv(this._cont,      {className:c.SliderBg});
    this._handle = d.addDiv(this._slot,      {className:c.Slider});

    this._handleWidth = 10;

    this._handle.style.width    = this._handleWidth + 'px';

    this._slotOffset = d.getElementPos(this._slot);
    this._slotWidth  = this._slot.offsetWidth - 6 ;

    this._slot.onmousedown = function()
    {
        this._focus = true;
        this._dragging = true;
        this._handle.focus();
        this._update();

    }.bind(this);


    this._slot.onmouseup =  function(e)
    {
        if(this._focus)
        {
            if(this._dragging)
            {
                this._onFinish();
            }
            this._dragging = false;
        }

        this._focus = false;

    }.bind(this);

    var doconmousemove = document.onmousemove || function(){},
        doconmouseup   = document.onmouseup   || function(){};

    document.onmousemove = function(e)
    {
        doconmousemove(e);
        if(this._dragging)
        {
            this._update();
            this._onChange();
        }

    }.bind(this);

    document.onmouseup   = function(e)
    {
        doconmouseup(e);
        if(this._dragging)this._onFinish();
        this._dragging = false;
        this._focus    = false;

    }.bind(this);

}

CKSlider_Internal.prototype._update = function()
{
    var fixed = this._fixed;

    var mx = ControlKit._Mouse[0] ,
        sx = this._slotOffset[0],
        sw = this._slotWidth ,
        px = (mx < sx) ? 0 : (mx > (sx + sw)) ? sw : (mx - sx);

    if(fixed)
    {
        this._handle.style.left = Math.round(px) + 'px';
    }
    else
    {
        this._handle.style.width = Math.round(px) + 'px';
    }


    this._intrpl = px / sw;
    this._interpolateValue();
};

CKSlider_Internal.prototype._interpolateValue = function()
{
    var intrpl = this._intrpl;
    this._value = this._bounds[0]*(1.0-intrpl)+this._bounds[1]*intrpl;
    return this._value;
};

CKSlider_Internal.prototype.setBoundMin = function(n)
{
    this._bounds[0] = n;
    this._interpolateValue();
};

CKSlider_Internal.prototype.setBoundMax = function(n)
{
    this._bounds[1] = n;
    this._interpolateValue();
};

CKSlider_Internal.prototype.getValue = function()
{
    return this._value;
};

CKSlider_Internal.prototype.setValue = function(n)
{
    this._intrpl = n/this._bounds[1];
    this._value = n;
};

CKSlider_Internal.prototype.setInitialValue = function(n)
{
    this._intrpl = n/this._bounds[1];
    this._handle.style.width = Math.round(this._intrpl*this._slotWidth) + 'px';
    this._value = n;
};
