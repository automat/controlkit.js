/**
 *
 * controlKit.js - A lightweight controller library
 *
 * controlKit.js is available under the terms of the MIT license.  The full text of the
 * MIT license is included below.
 *
 * MIT License
 * ===========
 *
 * Copyright (c) 2013 Henryk Wollik. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */


function ControlKit(parentDomElementId,params)
{
    params            = params || {};

    this._width       = params.width    || 300;
    this._height      = params.height   || window.innerHeight-40;
    this._position    = params.position || [20,20];
    this._ratioLabel  = params.labelRatio || 40;
    this._ratioComp   = 100 - this._ratioLabel;
    this._hidden      = !params.show || false;
    this.updateValues = params.update || false;

    this._blocks = [];

    var d = ControlKit.DOM,
        c = d.CSS;

    this._divParent = document.getElementById(parentDomElementId);

    this._divKit    = d.addDiv(this._divParent, {className:c.Kit});
    this._divHead   = d.addDiv(this._divKit,    {className:c.Head,innerHTML:'Controls'});
    this._ulBlocks  = d.addElement(this._divKit,'ul',{className:c.Content});

    //this._updateCSS();

    this._addMouseListener();

}

ControlKit._Mouse = [0,0];

ControlKit.prototype._addMouseListener = function()
{
    var m = ControlKit._Mouse;
    var mx,my;

    var doconmousemove = document.onmousemove || function(){};
    document.onmousemove = function(e)
    {
        doconmousemove(e);

        mx = my = 0;
        if(!e)e = window.event;
        if(e.pageX)
        {
            mx = e.pageX;
            my= e.pageY;
        }
        else if(e.clientX)
        {
            mx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            my = e.clientY + document.body.scrollTop  + document.documentElement.scrollTop;
        }
        m[0] = mx;
        m[1] = my;
    };
};

ControlKit.prototype.addBlock = function(label,params)
{
    var b = this._blocks;
    b.push(new ControlKit.Block(this,label,params));
    return b[b.length-1];
};

ControlKit.prototype._updateCSS = function()
{
    this._ulBlocks.style.height = this._height + 'px';
};

ControlKit.prototype._forceUpdate = function()
{
    var i = -1,j;
    var b = this._blocks,c;
    while(++i< b.length)
    {
        c=b[i]._comps;
        j=-1;
        while(++j< c.length)
        {
            c[j]._forceUpdate();
        }
    }
};

ControlKit.prototype._defocus = function()
{
    var i = -1,j;
    var b = this._blocks,c;
    while(++i< b.length)
    {
        c=b[i]._comps;
        j=-1;
        while(++j< c.length)
        {
            c[j]._focus = false;
        }
    }
};

ControlKit.prototype.update = function()
{
    if(!this._update)return;

    this._forceUpdate();

};

/*------------------------------------------------------------------------------*/

ControlKit.Block = function(parent,label,params)
{
    this._parent = parent;

    params       = params || {};
    this._hidden = params.show  = !params.show || false;
    this._update = this._parent.updateValues;
    this._height = 0;

    this._comps  = [];

    var d = ControlKit.DOM,
        c = d.CSS;

    this._divBlock     = d.addDiv(this._parent._ulBlocks, {className:d.CSS.Block});
    this._divHead      = d.addDiv(this._divBlock,         {className:c.Head});
    this._divHeadLabel = d.addDiv(this._divHead,          {className:c.HeadLabel,innerHTML:label});
    this._divHeadArrow = d.addDiv(this._divHead,          {className:c.HeadArrow});

    this._ulContent    = d.addElement(this._divBlock, 'ul', {className:c.Content});

    this._divHead.onclick = function()
                            {
                                this._hidden = !this._hidden;
                                this._updateVisibility();

                            }.bind(this);



};

ControlKit.Block.prototype._defocus = function()
{
    this._parent._defocus();
};

ControlKit.Block.prototype.show = function()
{
    this._hidden = false;
    this._updateVisibility();
};

ControlKit.Block.prototype.hide = function()
{
    this._hidden = true;
    this._updateVisibility();
};

ControlKit.Block.prototype._updateHeight = function()
{
    //transitions
    this._height = this._ulContent.offsetHeight;
};

ControlKit.Block.prototype._updateVisibility = function()
{
    var height = this._hidden ? 0 : this._height;
    this._ulContent.style.height = height + 'px';
};


ControlKit.Block.prototype._forceUpdate = function()
{
    this._parent._forceUpdate();
};

ControlKit.Block.prototype.addCheckbox = function(object,label,value,params)
{
    this._comps.push(new ControlKit.CheckBox(this,object,value,label,params));
    this._updateHeight();
    return this;
};

ControlKit.Block.prototype.addTextField = function(object,label,value,params)
{
    this._comps.push(new ControlKit.TextField(this,object,value,label,params));
    this._updateHeight();
    return this;
};

ControlKit.Block.prototype.addStepper = function(object,label,value,params)
{
    this._comps.push(new ControlKit.Stepper(this,object,value,label,params));
    this._updateHeight();
    return this;
};

ControlKit.Block.prototype.addSelect = function(object,label,value,params)
{
    this._comps.push(new ControlKit.Select(this,object,value,label,params));
    this._updateHeight();
    return this;
};

ControlKit.Block.prototype.addRange = function(object,label,value,params)
{
    this._comps.push(new ControlKit.Range(this,object,value,label,params));
    this._updateHeight();
    return this;
};


ControlKit.Block.prototype.addSlider = function(object,label,value,targetvalue,params)
{
    this._comps.push(new ControlKit.Slider(this,object,value,label,targetvalue,params));
    this._updateHeight();
    return this;
};

/*------------------------------------------------------------------------------*/

ControlKit.Component = function(parent,object,value)
{
    this._parent   = parent;
    this._object   = object;
    this._key      = value;
    this._update   = parent._update;
    this._focus    = false;
    this._onChange = function(){};
    this._onFinish = function(){};

    var d = ControlKit.DOM;
    this._liComponent = d.addElement(this._parent._ulContent,'li');

    this._divLabel    = d.addDiv(this._liComponent);
    this._divComp     = d.addDiv(this._liComponent);
};

ControlKit.Component.prototype._forceUpdate   = function(){};
ControlKit.Component.prototype._refreshValues = function(){};

ControlKit.Component.prototype._doFocus       = function()
{
    this._parent._defocus();
    this._focus = true;
};



/*------------------------------------------------------------------------------*/

ControlKit.CheckBox = function(parent,object,value,label,params)
{
    ControlKit.Component.apply(this,arguments);

    params = params || {};
    this._onChange  = params.onChange = params.onChange || this._onChange;
    this._onFinish  = params.onFinish = params.onFinish || this._onFinish;

    var d = ControlKit.DOM,
        c = d.CSS;

    d.set(this._divLabel,{className:d.CSS.CompLabel,innerHTML:label});
    d.set(this._divComp, {className:d.CSS.CompSlot});

    this._checkbox = d.addInput(this._divComp,{type:'checkbox'});

    this._checkbox.checked  = this._object[this._key];
    this._checkbox.onchange = function()
                              {
                                  this._doFocus();
                                  this._object[this._key] = !this._object[this._key];
                                  this._onChange();

                                  //this._parent._forceUpdate();

                              }.bind(this);


};

ControlKit.CheckBox.prototype = Object.create((ControlKit.Component).prototype);

ControlKit.CheckBox.prototype._forceUpdate = function()
{
    if(this._focus)return;
    this._checkbox.checked  = this._object[this._key];
};

/*------------------------------------------------------------------------------*/

ControlKit.TextField = function(parent,object,value,label,params)
{
    ControlKit.Component.apply(this,arguments);

    params = params || {};
    this._onChange  = params.onChange = params.onChange || this._onChange;
    this._onFinish  = params.onFinish = params.onFinish || this._onFinish;

    var d = ControlKit.DOM;

    d.set(this._divLabel,{className:d.CSS.CompLabel,innerHTML:label});
    d.set(this._divComp, {className:d.CSS.CompSlot});

    var ovalue = this._object[this._key];

    this._textfield = d.addInput(this._divComp,{type:'text',value:ovalue});

    var ovalueIsNumber = ovalue === ovalue + 0,
        tvalue,tvalueIsNumber;


    this._textfield.onchange = function()
                               {

                                   this._doFocus();

                                   tvalue = this._textfield.value;
                                   tvalueIsNumber = tvalue === tvalue+0;

                                   if(( ovalueIsNumber && tvalueIsNumber) ||
                                      (!ovalueIsNumber && !tvalueIsNumber))
                                   {
                                       this._object[this._key] = this._textfield.value;
                                       this._onChange();

                                   }
                                   else if(( ovalueIsNumber  && !tvalueIsNumber) ||
                                           (!ovalueIsNumber) && tvalueIsNumber)
                                   {
                                       this._textfield.value = this._object[this._key];
                                   }

                                   this._parent._forceUpdate();

                               }.bind(this);
};

ControlKit.TextField.prototype = Object.create((ControlKit.Component).prototype);

ControlKit.TextField.prototype._forceUpdate = function()
{
    if(this._focus)return;
    //this._textfield.value = this._object[this._key];
};

/*------------------------------------------------------------------------------*/

ControlKit.Stepper = function(parent,object,value,label,params)
{
    ControlKit.Component.apply(this,arguments);

    params = params || {};
    this._onChange  = params.onChange = params.onChange || this._onChange;
    this._onFinish  = params.onFinish = params.onFinish || this._onFinish;
    this._dp        = params.dp       = params.dp   || 2;
    this._stepValue = params.step     = params.step || 1;



    var d = ControlKit.DOM,
        c = d.CSS;

    d.set(this._divLabel,{className:d.CSS.CompLabel,innerHTML:label});
    d.set(this._divComp, {className:d.CSS.CompStepperSlot});

    this._numberField = new ControlKit._NumberInput(this._divComp,this._stepValue,this._dp,function()
                                                                                                {
                                                                                                    this._doFocus();
                                                                                                    this._updateValue();
                                                                                                    this._onChange();
                                                                                                    //this._parent._forceUpdate();

                                                                                                }.bind(this),
                                                                                                function()
                                                                                                {
                                                                                                    this._doFocus();
                                                                                                    this._updateValue();
                                                                                                    this._onFinish();
                                                                                                    //this._parent._forceUpdate();
                                                                                                }.bind(this));


    this._numberField.setValue(this._object[this._key]);

    this._divStepperBtns   = d.addDiv(  this._divComp,       {className:c.StepperBtns});
    this._stepperBtnUp     = d.addInput(this._divStepperBtns,{type:'button',className:c.StepperBtnUp, value:'+'});
    this._stepperBtnDown   = d.addInput(this._divStepperBtns,{type:'button',className:c.StepperBtnDown,value:'-'});

    this._stepperBtnUp.onclick   = function()
                                  {
                                      this._doFocus();
                                      this._numberField.stepUp();
                                      this._updateValue();
                                      //this._parent._forceUpdate();

                                  }.bind(this);

    this._stepperBtnDown.onclick = function()
                                   {
                                       this._doFocus();
                                       this._numberField.stepDown();
                                       this._updateValue();
                                       //this._parent._forceUpdate();

                                   }.bind(this);

};

ControlKit.Stepper.prototype = Object.create((ControlKit.Component).prototype);

ControlKit.Stepper.prototype._updateValue = function()
{
    this._object[this._key] = this._numberField.getValue();
};

ControlKit.Stepper.prototype._forceUpdate = function()
{
    if(this._focus)return;
    this._numberField.setValue(this._object[this._key]);
    //this._numberField.value = this._object[this._key];
};

/*------------------------------------------------------------------------------*/

ControlKit.Select = function(parent,object,value,label,params)
{
    ControlKit.Component.apply(this,arguments);

    params = params || {};
    this._onChange  = params.onChange = params.onChange || this._onChange;

    var d = ControlKit.DOM,
        c = d.CSS;

    this._values = this._object[this._key];

    d.set(this._divLabel,{className:d.CSS.CompLabel,innerHTML:label});
    d.set(this._divComp, {className:d.CSS.CompSlot});

    this._select = d.addDiv(this._divComp,{className:c.Select});
    this._select.innerHTML = this._values[0];

};

ControlKit.Select.prototype = Object.create((ControlKit.Component).prototype);

ControlKit.Select.prototype._forceUpdate = function()
{
    if(this._focus)return;
    //this._textFieldStepper.value = this._object[this._key];
};

/*------------------------------------------------------------------------------*/

ControlKit.Range = function(parent,object,value,label,params)
{
    ControlKit.Component.apply(this,arguments);

    this._values    = this._object[this._key];

    params          = params          || {};

    this._step      = params.step     = params.step     || 1;
    this._onChange  = params.onChange = params.onChange || this._onChange;
    this._onFinish  = params.onFinish = params.onFinish || this._onFinish;
    this._dp        = params.dp       = params.dp   || 2;


    var d = ControlKit.DOM,
        c = d.CSS;

    d.set(this._divLabel,{className:c.CompLabel,innerHTML:label});
    d.set(this._divComp, {className:c.CompRangeFieldSlot});

    this._divLabelMin  = d.addDiv(  this._divComp,{className:c.CompLabel,innerHTML:'min'});
    this._numberFieldMin = new ControlKit._NumberInput(this._divComp,this._step,this._dp,function()
                                                                       {
                                                                           this._doFocus();
                                                                           this._updateValueMin();
                                                                           this._onChange();
                                                                           this._parent._forceUpdate();

                                                                       }.bind(this),
                                                                       function()
                                                                       {
                                                                           this._doFocus();
                                                                           this._updateValueMin();
                                                                           this._onFinish();
                                                                           this._parent._forceUpdate();

                                                                       }.bind(this));
    this._divLabelMax  = d.addDiv(  this._divComp,{className:c.CompLabel,innerHTML:'max'});
    this._numberFieldMax = new ControlKit._NumberInput(this._divComp,this._step,this._dp,function()
                                                                       {
                                                                           this._doFocus();
                                                                           this._updateValueMax();
                                                                           this._onChange();
                                                                           this._parent._forceUpdate();

                                                                       }.bind(this),
                                                                       function()
                                                                       {
                                                                           this._doFocus();
                                                                           this._updateValueMax();
                                                                           this._onFinish();
                                                                           this._parent._forceUpdate();

                                                                       }.bind(this));
    this._numberFieldMin.setValue(this._values[0]);
    this._numberFieldMax.setValue(this._values[1]);


};


ControlKit.Range.prototype = Object.create((ControlKit.Component).prototype);


ControlKit.Range.prototype._updateValueMin = function()
{
    var value = this._numberFieldMin.getValue();

    if(value > this._numberFieldMax.getValue())
    {
        this._numberFieldMin.setValue(this._values[0]);
        return;
    }
    this._values[0] = value;
};

ControlKit.Range.prototype._updateValueMax = function()
{
    var value = this._numberFieldMax.getValue();
    if(value < this._numberFieldMin.getValue())
    {
        this._numberFieldMax.setValue(this._values[1]);
        return;
    }
    this._values[1] = value;
};

ControlKit.Range.prototype._forceUpdate = function()
{
    if(this._focus)return;
    this._numberFieldMin.setValue(this._values[0]);
    this._numberFieldMax.setValue(this._values[1]);
};

/*------------------------------------------------------------------------------*/


ControlKit.Slider = function(parent,object,value,label,target,params)
{
    ControlKit.Component.apply(this,arguments);

    this._values    = this._object[this._key];
    this._targetKey = target;

    params          = params          || {};

    this._step      = params.step     = params.step     || 1;
    this._onChange  = params.onChange = params.onChange || this._onChange;
    this._onFinish  = params.onFinish = params.onFinish || this._onFinish;
    this._dp        = params.dp       = params.dp   || 2;

    var d = ControlKit.DOM,
        c = d.CSS;

    d.set(this._divLabel,{className:c.CompLabel,innerHTML:label});
    d.set(this._divComp, {className:c.CompSliderSlot});

    this._slider    = new ControlKit._Slider(this,false,this._onSliderChange.bind(this),this._onSliderFinish.bind(this));
    this._slider.setBoundMin(this._values[0]);
    this._slider.setBoundMax(this._values[1]);
    this._slider.setInitialValue(this._object[this._targetKey]);

    this._textfield = new ControlKit._NumberInput(this._divComp,this._step,this._dp,null,null);
    this._textfield.setValue(this._object[this._targetKey]);
};

ControlKit.Slider.prototype = Object.create((ControlKit.Component).prototype);


ControlKit.Slider.prototype._onSliderChange = function()
{
    this._doFocus();
    this._applyValue();
    this._updateValueField();
    this._onChange();
    this._parent._forceUpdate();
};

ControlKit.Slider.prototype._onSliderFinish = function()
{
    this._doFocus();
    this._applyValue();
    this._updateValueField();
    this._onFinish();
    this._parent._forceUpdate();
};

ControlKit.Slider.prototype._updateValueField = function()
{
    this._textfield.setValue(this._slider.getValue());
};

ControlKit.Slider.prototype._applyValue = function()
{
    var value = this._slider.getValue();

    this._object[this._targetKey] = value;
    this._textfield.setValue(value);

};


ControlKit.Slider.prototype._forceUpdate = function()
{
    if(this._focus)return;
    this._slider.setBoundMin(this._values[0]);
    this._slider.setBoundMax(this._values[1]);
    this._applyValue();
    this._slider.setValue(this._object[this._targetKey]);
    this._updateValueField();

};

/*------------------------------------------------------------------------------*/


ControlKit._Slider = function(parent,fixed,onChange,onFinish)
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

    var d = ControlKit.DOM,
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
                               if(this._dragging)this.onFinish();
                               this._dragging = false;
                               this._focus    = false;

                           }.bind(this);

};

ControlKit._Slider.prototype._update = function()
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

ControlKit._Slider.prototype._interpolateValue = function()
{
    var intrpl = this._intrpl;
    this._value = this._bounds[0]*(1.0-intrpl)+this._bounds[1]*intrpl;
    return this._value;
};

ControlKit._Slider.prototype.setBoundMin = function(n)
{
    this._bounds[0] = n;
};

ControlKit._Slider.prototype.setBoundMax = function(n)
{
    this._bounds[1] = n;
};

ControlKit._Slider.prototype.getValue = function()
{
    return this._interpolateValue();
};

ControlKit._Slider.prototype.setValue = function(n)
{
    this._intrpl = n/this._bounds[1];
    this._value = n;
};

ControlKit._Slider.prototype.setInitialValue = function(n)
{
    this._intrpl = n/this._bounds[1];
    this._handle.style.width = Math.round(this._intrpl*this._slotWidth) + 'px';
    this._value = n;
};

/*------------------------------------------------------------------------------*/



ControlKit._NumberInput = function(parentDiv,stepValue,decimalPlaces,onChange,onFinish)
{
    this._value        = this._temp  = 0;
    this._valueStep    = stepValue || 1.0;
    this._valueDPlace  = decimalPlaces + 1;

    this._onChange  = onChange || function(){};
    this._onFinish  = onFinish || function(){};

    var d = ControlKit.DOM;

    this._input = d.addInput(parentDiv,{type:'text'});
    this._input.value = this._value;

    var mult,keycode;

    this._input.onkeydown = function(e)
                            {
                                mult    = e.shiftKey ? 10 : 1;
                                keycode = e.keyCode;


                                if(keycode == 38 || keycode == 40)
                                {
                                    e.preventDefault();
                                    this._validateNumber();
                                    this._value = this._temp  = this._value + (this._valueStep * mult) * (keycode == 38 ? 1.0 : -1.0);
                                    this._onChange();
                                    this._formatDisplayOutput();
                                }

                            }.bind(this);

    this._input.onkeyup = function(e)
                          {
                              keycode = e.keyCode;

                              if(e.shiftKey || keycode == 38 || keycode == 40 || keycode == 190 || keycode == 8 )return;
                              this._validateInput();
                              this._onChange();

                          }.bind(this);

    this._input.onchange = function()
                           {
                               this._validateInput();
                               this._formatDisplayOutput();

                               this._onFinish();

                           }.bind(this);

};

ControlKit._NumberInput.prototype._validateInput = function()
{
    if(this._inputIsNumber())
    {
        this._temp = this._value = Number(this._input.value);
        return;
    }

    this._temp = this._input.value = this._value;
};

ControlKit._NumberInput.prototype._validateNumber = function()
{
    if(this._inputIsNumber())return;

    this._temp = this._value;
};

ControlKit._NumberInput.prototype._inputIsNumber = function()
{
    if(this._input.value == '-')return true;
    return /^\s*-?[0-9]\d*(\.\d{1,1000000})?\s*$/.test(this._input.value);
};

ControlKit._NumberInput.prototype._formatDisplayOutput = function()
{
    this._temp   = this._value;
    this._out    = this._temp.toString();

    var output = this._out,
        index  = output.indexOf('.');

    if(index>0)this._out = output.slice(0,index+this._valueDPlace);

    this._input.value = (this._out);
};


ControlKit._NumberInput.prototype.getValue = function()
{
    return this._value;
};

ControlKit._NumberInput.prototype.setValue = function(n)
{
    this._value = this._temp = n;
    this._formatDisplayOutput();
};

ControlKit._NumberInput.prototype.stepUp = function()
{
    this._value = this._temp  = this._value + (this._valueStep);
    this._formatDisplayOutput();
};

ControlKit._NumberInput.prototype.stepDown = function()
{
    this._value = this._temp  = this._value - (this._valueStep);
    this._formatDisplayOutput();
};


/*------------------------------------------------------------------------------*/


ControlKit.DOM = {};

ControlKit.DOM.addElement = function(parent,type,params)
{
    var element = document.createElement(type);
    if(params)for(var p in params)element[p] = params[p];

    return parent.appendChild(element);
};

ControlKit.DOM.addDiv = function(parent,params)
{
    return ControlKit.DOM.addElement(parent,'div',params);
};

ControlKit.DOM.addInput = function(parent,params)
{
    return ControlKit.DOM.addElement(parent,'input',params);
};

ControlKit.DOM.set = function(element,params)
{
    for(var p in params)element[p] = params[p];
    return element;
};

ControlKit.DOM.getElementPos = function(element)
{
    var offset  = [0,0];
    var e = element;

    while(e)
    {
        offset[0] += e.offsetLeft;
        offset[1] += e.offsetTop;
        e = e.offsetParent;
    }

    return offset;

};

/*------------------------------------------------------------------------------*/

ControlKit.DOM.CSS =
{
    Kit:                'kit',
    Head:               'head',
    Block:              'block',
    Content:            'content',
    HeadLabel:          'headLabel',
    HeadArrow:          'headArrow',
    CompLabel:          'compLabel',
    CompSlot:           'compSlot',
    CompStepperSlot:    'compStepperSlot',
    CompRangeSliderSlot:'compRangeSliderSlot',
    CompSliderSlot:     'compSliderSlot',
    CompRangeFieldSlot: 'compRangeFieldSlot',
    StepperBtns:        'stepperBtns',
    StepperBtnUp:       'stepperUp',
    StepperBtnDown:     'stepperDown',
    Select:             'selectBox',
    SliderSlot:         'sliderSlot',
    SliderBg:           'sliderBg',
    Slider:             'slider'
};

/*------------------------------------------------------------------------------*/
