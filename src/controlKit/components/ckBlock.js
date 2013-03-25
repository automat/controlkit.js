

function CKBlock(parent,label,params)
{
    this._parent = parent;

    params       = params || {};
    this._hidden = params.show  = !params.show || false;
    this._heightMax = params.maxHeight;
    this._update = this._parent.updateValues;
    this._height = 0;

    this._comps  = [];

    var d = CKDOM,
        c = d.CSS;

    this._divBlock     = d.addDiv(this._parent._ulBlocks, {className:c.Block});
    this._divHead      = d.addDiv(this._divBlock,         {className:c.Head});
    this._divHeadLabel = d.addDiv(this._divHead,          {className:c.HeadLabel,innerHTML:label});
    this._divHeadArrow = d.addDiv(this._divHead,          {className:c.HeadExpandedArrow});


    this._content      = d.addDiv(this._divBlock,{className: c.Content});
    this._ulContent    = d.addElement(this._content, 'ul', {className:c.List});
    this._updateHeight();

    this._divHead.onclick = function()
    {
        this._hidden = !this._hidden;
        this._updateVisibility();

    }.bind(this);



}

CKBlock.prototype._defocus = function()
{
    this._parent._defocus();
};

CKBlock.prototype.show = function()
{
    this._hidden = false;
    this._updateVisibility();
};

CKBlock.prototype.hide = function()
{
    this._hidden = true;
    this._updateVisibility();
};

CKBlock.prototype._updateHeight = function()
{
    this._height = this._divBlock.offsetHeight;
};

CKBlock.prototype._updateVisibility = function()
{
    var h = this._hidden,
        d = CKDOM,
        c = d.CSS;

    var height = !h ? 0 : this._height;
    d.set(this._divHeadArrow,{className: !h ? c.HeadCollapsedArrow : c.HeadExpandedArrow});

    var style = this._content.style;

    /*
     style.paddingTop   = style.paddingBottom = !h ? 0 : '20px';
     style.marginBottom = !h ? '-2px' : 'auto';
     */
    style.height       = height  + 'px';
};


CKBlock.prototype._forceUpdate = function()
{
    this._parent._forceUpdate();
};

CKBlock.prototype.addCheckbox = function(object,label,value,params)
{
    this._comps.push(new CKCheckbox(this,object,value,label,params));
    this._updateHeight();
    return this;
};

CKBlock.prototype.addStringInput = function(object,label,value,params)
{
    this._comps.push(new CKTextField(this,object,value,label,params));
    this._updateHeight();
    return this;
};

CKBlock.prototype.addSelect = function(object,label,value,targetValue,params)
{
    this._comps.push(new CKSelect(this,object,value,label,targetValue,params));
    this._updateHeight();
    return this;
};

CKBlock.prototype.addRange = function(object,label,value,params)
{
    this._comps.push(new CKRange(this,object,value,label,params));
    this._updateHeight();
    return this;
};


CKBlock.prototype.addSlider = function(object,label,value,targetValue,params)
{
    this._comps.push(new CKSlider(this,object,value,label,targetValue,params));
    this._updateHeight();
    return this;
};

CKBlock.prototype.addButton = function(label,onclick)
{
    this._comps.push(new CKButton(this,null,'',label,onclick));
    this._updateHeight();
    return this;
};

CKBlock.prototype.addNumberInput = function(object,label,value,params)
{
    this._comps.push(new CKNumberInput(this,object,value,label,params));
    this._updateHeight();
    return this;

};