function CKOptions(parentDiv)
{
    this._parentDiv    = parentDiv;
    this._hover        = false;
    this._selected     = null;
    this._ul           = CKDOM.addElement(this._parentDiv,'ul',{className: CKDOM.CSS.Options});
}

CKOptions.prototype.build = function(values,selected,compPos,compWidth,compHeight,callbackSelect,callbackOut)
{
    this._clear();

    this._selected     = null;

    var d      = CKDOM,
        ul     = this._ul;

    var li;

    var getIndex = function(node)
    {
        var children = ul.childNodes;
        var index    = 0;
        var j = -1;
        while(++j<children.length){index = j;if(node == children[j])break;}
        this._selected = index;

    }.bind(this);

    var hide = function(){this._hide();}.bind(this);

    var i = -1,index;
    while(++i<values.length)
    {
        li = d.addElement(ul,'li',{innerHTML:values[i]});

        if(li.innerHTML == selected)li.className = d.CSS.LiSelected;

        li.onmousedown = function()
        {
            getIndex(this);
            hide();
            callbackSelect();
        };

    }



    var style = ul.style;

    style.width      = (ul.offsetWidth < compWidth) ? (compWidth + 'px') : 'auto';
    style.height     = 'auto';
    style.visibility = 'visible';
    style.left       = compPos[0] + -20 + 'px';
    style.top        = compPos[1] + compHeight + -20 + -2 +  'px';

    this._ul.onmouseover = function(){this._hover = true; }.bind(this);
    this._ul.onmouseout  = function(){this._hover = false;}.bind(this);

    var doconmousedown = document.onmousedown || function(){};

    document.onmousedown = function()
    {
        doconmousedown();
        if(!this._hover)this._hide();
        callbackOut();

    }.bind(this);

};

CKOptions.prototype.getSelected = function()
{
    return this._selected;
};


CKOptions.prototype._clear = function()
{
    var ul = this._ul;
    while(ul.hasChildNodes())ul.removeChild(ul.lastChild);
};

CKOptions.prototype._hide = function()
{
    this._clear();

    var style = this._ul.style;

    style.width      = '0px';
    style.height     = '0px';
    style.visibility = 'hidden';
    style.left       = '-1px';
    style.top        = '-1px';

};

