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
    params           = params || {};

    this._width      = params.width      = params.width  || 300;
    this._height     = params.height     = params.height || window.innerHeight-40;
    this._ratioLabel = params.labelRatio = params.labelRatio || 40;
    this._ratioComp  = 100 - this._ratioLabel;
    this._hidden     = params.show       = !params.show || false;

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
    while(++i< b.length){j=-1;c=b[i]._comps;while(++j< c.length){c[i]._forceUpdate();}}
};

/*------------------------------------------------------------------------------*/

ControlKit.Block = function(parent,label,params)
{
    this._parent = parent;

    params       = params || {};
    this._hidden = params.show  = !params.show || false;
    this._delay  = params.delay = params.delay || false;
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

ControlKit.Block._applyChanges = function()
{
    var i = -1;
    while(++i<this._comps.length){this._comps[i]._applyChange();}
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

ControlKit.Block.prototype.addRangeField = function(object,label,value,params)
{
    this._comps.push(new ControlKit.RangeField(this,object,value,label,params));
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
    this._onChange = function(){};
    this._onFinish = function(){};
    this._cache    = null;

    this._delay  = this._parent._delay;

    var d = ControlKit.DOM;
    this._liComponent = d.addElement(this._parent._ulContent,'li');

    this._divLabel    = d.addDiv(this._liComponent);
    this._divComp     = d.addDiv(this._liComponent);
};

ControlKit.Component.prototype._forceUpdate = function(){};

ControlKit.Component.prototype._applyChange = function()
{
    this._object[this._key] = this._cache;
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
                                  if(!this._delay)
                                  {
                                      this._object[this._key] = !this._object[this._key];
                                      this._onChange();
                                  }
                                  else
                                  {
                                      this._cache = this._checkbox.checked;
                                  }

                                  this._parent._forceUpdate();

                              }.bind(this);


};

ControlKit.CheckBox.prototype = Object.create((ControlKit.Component).prototype);

ControlKit.CheckBox.prototype._forceUpdate = function()
{
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
                                   tvalue = this._textfield.value;
                                   tvalueIsNumber = tvalue === tvalue+0;

                                   if(( ovalueIsNumber && tvalueIsNumber) ||
                                      (!ovalueIsNumber && !tvalueIsNumber))
                                   {
                                       if(!this._delay)
                                       {
                                           this._object[this._key] = this._textfield.value;
                                           this._onChange();
                                       }
                                       else
                                       {
                                           this._cache = this._textfield.value;
                                       }
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
    this._textfield.value = this._object[this._key];
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

    this._textFieldStepper = new ControlKit._NumberField(this._divComp,this._stepValue,this._dp,function(){this._updateValue();this._onChange();this._parent._forceUpdate();}.bind(this),
                                                                                                function(){this._updateValue();this._onFinish();this._parent._forceUpdate();}.bind(this));
    this._divStepperBtns   = d.addDiv(  this._divComp,       {className:c.StepperBtns});
    this._stepperBtnUp     = d.addInput(this._divStepperBtns,{type:'button',className:c.StepperBtnUp, value:'+'});
    this._stepperBtnDown   = d.addInput(this._divStepperBtns,{type:'button',className:c.StepperBtnDown,value:'-'});

    this._textFieldStepper.value = this._object[this._key];

    this._stepperBtnUp.onclick   = function(){this._textFieldStepper.stepUp();this._parent._forceUpdate();}.bind(this);
    this._stepperBtnDown.onclick = function(){this._textFieldStepper.stepDown();this._parent._forceUpdate();}.bind(this);

};

ControlKit.Stepper.prototype = Object.create((ControlKit.Component).prototype);

ControlKit.Stepper.prototype._updateValue = function()
{
    var value = this._textFieldStepper.getValue();
    if(this._delay)this._cache = value;else this._object[this._key] = value;
};

ControlKit.Stepper.prototype._step =  function(n)
{
    this._object[this._key]+=this._stepValue * n;
    this._textFieldStepper.value = this._object[this._key];
};

ControlKit.Stepper.prototype._forceUpdate = function()
{
    this._textFieldStepper.value = this._object[this._key];
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
    //this._textFieldStepper.value = this._object[this._key];
};

/*------------------------------------------------------------------------------*/

ControlKit.RangeField = function(parent,object,value,label,params)
{
    ControlKit.Component.apply(this,arguments);

    this._cache     = new Array(2);
    this._values    = this._object[this._key];

    params          = params          || {};

    this._step      = params.step     = params.step     || 1;
    this._onChange  = params.onChange = params.onChange || this._onChange;
    this._onFinish  = params.onFinish = params.onFinish || this._onFinish;
    this._dp        = params.dp       = params.dp   || 2;


    var d = ControlKit.DOM,
        c = d.CSS;

    d.set(this._divLabel,{className:d.CSS.CompLabel,innerHTML:label});
    d.set(this._divComp, {className:d.CSS.CompRangeFieldSlot});

    this._divLabelMin  = d.addDiv(  this._divComp,{className:c.CompLabel,innerHTML:'min'});
    this._textfieldMin = new ControlKit._NumberField(this._divComp,this._step,this._dp,function()
                                                                       {
                                                                           this._updateValueMin();
                                                                           this._onChange();
                                                                           this._parent._forceUpdate();
                                                                       }.bind(this),
                                                                       function()
                                                                       {
                                                                           this._updateValueMin();
                                                                           this._onFinish();
                                                                           this._parent._forceUpdate();
                                                                       }.bind(this));
    this._divLabelMax  = d.addDiv(  this._divComp,{className:c.CompLabel,innerHTML:'max'});
    this._textfieldMax = new ControlKit._NumberField(this._divComp,this._step,this._dp,function()
                                                                       {
                                                                           this._updateValueMax();
                                                                           this._onChange();
                                                                           this._parent._forceUpdate();
                                                                       }.bind(this),
                                                                       function()
                                                                       {
                                                                           this._updateValueMax();
                                                                           this._onFinish();
                                                                           this._parent._forceUpdate();
                                                                       }.bind(this));
    this._textfieldMin.setValue(this._values[0]);
    this._textfieldMax.setValue(this._values[1]);


};


ControlKit.RangeField.prototype = Object.create((ControlKit.Component).prototype);


ControlKit.RangeField.prototype._updateValueMin = function()
{
    var value = this._textfieldMin.getValue();
    if(this._delay) this._cache[0] = value; else this._values[0] = value;
};

ControlKit.RangeField.prototype._updateValueMax = function()
{
    var value = this._textfieldMax.getValue();
    if(this._delay)this._cache[1] = value; else this._values[1] = value;
};

ControlKit.RangeField.prototype._forceUpdate = function()
{
    this._textfieldMin.setValue(this._values[0]);
    this._textfieldMax.setValue(this._values[1]);
};

/*------------------------------------------------------------------------------*/


ControlKit.Slider = function(parent,object,value,label,target,params)
{
    ControlKit.Component.apply(this,arguments);

    this._values = this._object[this._key];
    this._target = target;
    this._onFinish = params ? params.onFinish : function(){};

    var d = ControlKit.DOM,
        c = d.CSS;

    d.set(this._divLabel,{className:c.CompLabel,innerHTML:label});
    d.set(this._divComp, {className:c.CompSliderSlot});

    this._slider    = new ControlKit._Slider(this,false,null,null);
    this._textfield = d.addInput(this._divComp,{type:'text'});
    this._textfield.value = 0.0;
};

ControlKit.Slider.prototype = Object.create((ControlKit.Component).prototype);


ControlKit.Slider.prototype._onSliderChange = function()
{
    this._updateValueField();
    this._onChange();
    this._parent._forceUpdate();
};

ControlKit.Slider.prototype._onSliderFinish = function()
{
    this._updateValueField();
    this._onFinish();
    this._parent._forceUpdate();
};

ControlKit.Slider.prototype._updateValueField = function()
{
    //this._textfield.value = this._delay ? this._cache : this._object[this._target];
};

ControlKit.Slider.prototype._applyChange = function()
{
    this._object[this._target] = this._cache;
};

ControlKit.Slider.prototype._forceUpdate = function()
{

};

/*------------------------------------------------------------------------------*/


ControlKit._Slider = function(parent,fixed,callbackOnChange,callbackOnFinish)
{
    this._parent    = parent;
    this._bounds    = this._parent._values;
    this._delay     = this._parent._delay;
    this._dragging  = false;
    this._fixed     = fixed;
    this._focus     = false;

    this._callbackC = callbackOnChange || function(){};
    this._callbackF = callbackOnFinish || function(){};

    var d = ControlKit.DOM,
        c = d.CSS;

    this._cont   = d.addDiv(parent._divComp, {className:c.SliderSlot});
    this._slot   = d.addDiv(this._cont,      {className:c.SliderBg});
    this._handle = d.addDiv(this._slot,      {className:c.Slider});

    this._handleWidth = 10;

    this._handle.style.width    = this._handleWidth + 'px';

    this._slotOffset = d.getElementPos(this._slot);
    this._slotWidth  = this._slot.offsetWidth - 6 - this._handleWidth;

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
                                       this._callbackF();
                                   }
                                   this._dragging = false;
                               }

                               this._focus = false;

                           }.bind(this);

    var _this = this;

    var doconmousemove = document.onmousemove || function(){},
        doconmouseup   = document.onmouseup   || function(){};

    document.onmousemove = function(e)
                           {
                               doconmousemove(e);
                               if(_this._dragging)
                               {
                                   _this._update();
                                   _this._callbackC();
                               }
                           };

    document.onmouseup   = function(e)
                           {
                               doconmouseup(e);
                               if(_this._dragging)_this._callbackF();
                               _this._dragging = false;
                               _this._focus    = false;
                           };

};

ControlKit._Slider.prototype._update = function()
{
    var fixed = this._fixed;

    var mx = ControlKit._Mouse[0] ,
        sx = this._slotOffset[0],
        sw = this._slotWidth ,
        px = (mx < sx) ? 0 : (mx > (sx + sw)) ? sw : (mx - sx),
        pn = px / sw;

    if(fixed)
    {
        this._handle.style.left = Math.round(px) + 'px';
    }
    else
    {
        this._handle.style.width = Math.round(px) + 'px';
    }

    var result = this._bounds[0]*(1.0-pn)+this._bounds[1]*pn;

    if(!this._delay)this._parent._object[this._parent._target] = result;else this._cache = result;
};

/*------------------------------------------------------------------------------*/



ControlKit._NumberField = function(parentDiv,stepValue,decimalPlaces,onChange,onFinish)
{
    var d = ControlKit.DOM;

    this._value        = 0;
    this._temp         = this._value;
    this._valueStep    = stepValue || 1;
    this._valueDPlace  = decimalPlaces + 1;


    this._onChange  = onChange || function(){};
    this._onFinish  = onFinish || function(){};

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
                                    console.log(this._value);

                                    this._output();
                                }

                                this._onChange();

                            }.bind(this);

    this._input.onchange = function()
                           {
                               this._validateInput();
                               this._output();

                               this._onFinish();

                           }.bind(this);

};

ControlKit._NumberField.prototype._validateInput = function()
{
    if(this.inputValueIsNumber())
    {
        this._temp = this._value = Number(this._input.value);
        return;
    }

    this._temp = this._input.value = this._value;
};

ControlKit._NumberField.prototype._output = function()
{
    this._temp   = this._value;
    this._out    = this._temp.toString();

    var output = this._out,
        index  = output.indexOf('.');

    if(index>0)this._out = output.slice(0,index+this._valueDPlace);

    this._input.value = Number(this._out);
};

ControlKit._NumberField.prototype._validateNumber = function()
{
    if(this.inputValueIsNumber())return;

    this._temp = this._value;
};

ControlKit._NumberField.prototype.inputValueIsNumber = function()
{
    return /^\s*-?[1-9]\d*(\.\d{1,100})?\s*$/.test(this._input.value);
};

ControlKit._NumberField.prototype.getValue = function()
{
    return this._value;
};

ControlKit._NumberField.prototype.setValue = function(n)
{
    this._value = this._temp = n;
    this._output();
};

ControlKit._NumberField.prototype.stepUp = function()
{
    this._value = this._temp  = this._value + (this._valueStep);
    this._output();
};

ControlKit._NumberField.prototype.stepDown = function()
{
    this._value = this._temp  = this._value - (this._valueStep);
    this._output();
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
