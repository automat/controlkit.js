function CKScrollBar(parentDiv)
{
    var d = CKDOM,
        c = d.CSS;

    this._div     = d.addDivBefore(parentDiv,{className: c.Scrollbar});
    this._btnUp   = d.addDiv(this._div,{className: c.ScrollbarBtnUp});
                    d.addDiv(this._btnUp,{className: c.ArrowSmallMax});
    this._track   = d.addDiv(this._div,{className: c.ScrollbarTrack});
    this._btnDown = d.addDiv(this._div,{className: c.ScrollbarBtnDown});
                    d.addDiv(this._btnDown,{className: c.ArrowSmallMin});


    this._btnDown = null;
    this._thumb   = null;

}