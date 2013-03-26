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

    var divParent = this._divParent   = document.getElementById(parentDomElementId);

    this._width       = params.width      || 300;
    this._height      = params.height     || (window.innerHeight - divParent.style.paddingBottom - divParent.style.paddingTop) ;
    this._position    = params.position   || [20,20];
    this._ratioLabel  = params.labelRatio || 40;
    this._ratioComp   = 100 - this._ratioLabel;
    this._hidden      = !params.show      || false;
    this._headLabel   = params.label      || 'Controls';
    this._align       = params.align      || 'vertical';





    this.updateValues = params.update || false;

    this._blocks = [];

    var d = CKDOM,
        c = d.CSS;

    this._divKit    = d.addDiv(this._divParent, {className:c.Kit});
    this._divHead   = d.addDiv(this._divKit,    {className:c.Head,innerHTML:this._headLabel});
    this._ulBlocks  = d.addElement(this._divKit,'ul',{className:c.Content});

    if(!ControlKit._Options)ControlKit._Options = new CKOptions(this._divKit);

    this._divKit.style.width    = this._width + 'px';
    this._ulBlocks.style.height = this._height + 'px';

    this._scrollbar = null;

    //this._updateCSS();

    this._addMouseListener();

}






ControlKit._Options = null;
ControlKit._Mouse   = [0,0];

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
    b.push(new CKBlock(this,label,params));

    if(!this._scrollbar)this._scrollbar = new CKScrollBar(this._ulBlocks);
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

ControlKit.prototype.onElementAdded = function()
{
    if(!this._scrollbar)return;

    console.log('hello');

    this._scrollbar.onScrollContentChange();

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



