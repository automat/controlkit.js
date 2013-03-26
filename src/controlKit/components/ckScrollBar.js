function CKScrollBar(parentDiv)
{
    var d = CKDOM,
        c = d.CSS;

    this._parentDiv         = parentDiv;

    this._div               = d.addDivBefore(this._parentDiv,{className: c.Scrollbar});
    this._btnUp             = d.addDiv(this._div,  {className: c.ScrollbarBtnUp});
                              d.addDiv(this._btnUp,{className: c.ArrowSmallMin});

    var track = this._track = {div:d.addDiv(this._div,{className: c.ScrollbarTrack}),
                               offset:0,
                               height:0,
                               paddingTB:2,
                               scrollAreaHeight:0};

    this._btnDown           = d.addDiv(this._div,     {className: c.ScrollbarBtnDown});
                              d.addDiv(this._btnDown, {className: c.ArrowSmallMax});

    this._scrollContent     = {div:parentDiv.children[1],
                               scrollUnit : 0};

    this._updateHeight();



    var thumb = this._thumb = {div:d.addDiv(track.div,{className: c.ScrollbarThumb}),
                               dragging:false,
                               top:0,
                               mid:0,
                               height: 20,
                               heightMin : 1,
                               heightMax : 20,
                               mouseOffset:0,
                               prevInterpl:0};


    this._updateThumb();

    thumb.div.onmousedown = function(e)
    {
        e.preventDefault();
        thumb.dragging    = true;
        thumb.mouseOffset = ControlKit._Mouse[1] - d.getElementPos(thumb.div)[1];
        thumb.div.focus();
        this._update();


    }.bind(this);

    var doconmousemove = document.onmousemove || function(){},
        doconmouseup   = document.onmouseup   || function(){};

    document.onmousemove = function(e)
    {
        doconmousemove(e);
        if(thumb.dragging)
        {
            this._update();
        }

    }.bind(this);

    document.onmouseup   = function(e)
    {
        doconmouseup(e);
        thumb.dragging = false;

    }.bind(this);
}

CKScrollBar.prototype._updateHeight = function()
{
    var d         = CKDOM,
        track     = this._track,
        thumb     = this._thumb,
        div       = this._div,
        parentDiv = this._parentDiv,
        btnUp     = this._btnUp,
        btnDown   = this._btnDown,
        scrlc     = this._scrollContent;



    div.style.height       = parentDiv.offsetHeight + 'px';

    track.div.style.height = (div.offsetHeight - btnDown.offsetHeight * 2) + 'px';
    track.offset           = d.getElementPos(track.div)[1];
    track.height           = track.div.offsetHeight;

    scrlc.scrollUnit       = btnUp.offsetHeight + track.height + btnDown.offsetHeight;
};

CKScrollBar.prototype._updateThumb = function()
{
    var track = this._track,
        thumb = this._thumb,
        srclc = this._scrollContent;

    thumb.heightMax        = track.height - track.paddingTB * 2;
    thumb.height           = thumb.heightMax * (srclc.scrollUnit / srclc.div.offsetHeight) ;
    thumb.height           = thumb.height < thumb.heightMin ? thumb.heightMin : thumb.height;

    thumb.div.style.height = thumb.height + 'px';

    track.scrollAreaHeight = thumb.heightMax - thumb.height;

};

CKScrollBar.prototype._scroll = function()
{
    var track = this._track,
        thumb = this._thumb,
        scrlc = this._scrollContent;

    var scrollIntrpl = thumb.prevInterpl = (thumb.top - track.paddingTB) / (track.scrollAreaHeight  + thumb.height);

    scrlc.div.style.marginTop = (scrlc.div.offsetHeight * -scrollIntrpl) + 'px';
};

CKScrollBar.prototype.onScrollContentChange = function()
{
    var thumb = this._thumb,
        track = this._track;



    this._updateHeight();
    this._updateThumb();

    thumb.top = thumb.heightMax * thumb.prevInterpl;
    thumb.div.style.top = thumb.top + 'px';
    this._setThumbPos(thumb.top);

};

CKScrollBar.prototype.updateRatio = function()
{
    this._updateThumb();
};

CKScrollBar.prototype._update = function()
{
    var thumb = this._thumb;
    this._setThumbPos(ControlKit._Mouse[1] - this._thumb.mouseOffset);
    this._scroll();
};

CKScrollBar.prototype._setThumbPos = function(posy)
{
    var track = this._track,
        thumb = this._thumb;

    var miny         = track.offset + track.paddingTB,
        maxy         = track.offset + track.height - track.paddingTB - thumb.height;

    thumb.top = (posy < miny) ? track.paddingTB :
                (posy > maxy) ? maxy  - track.offset:
                (posy - track.offset );

    thumb.div.style.top = Math.round(thumb.top) + 'px';
};