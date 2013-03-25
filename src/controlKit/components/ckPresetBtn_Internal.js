function CKPresetBtn_Internal(parentDiv)
{
    var d = CKDOM,
        c = d.CSS;

    this._presetBtn = d.addDiv(parentDiv,      {className: c.PresetBtn    });
    this._arrow     = d.addDiv(this._presetBtn,{className: c.ArrowSmallMax});
}

CKPresetBtn_Internal.prototype.setOnMouseDown = function(func)
{
    this._presetBtn.onmouseup = func;
};

CKPresetBtn_Internal.prototype.setOnMouseUp = function(func)
{
    this._presetBtn.onmousedown = function(){func();};
};

CKPresetBtn_Internal.prototype.setStateActive = function()
{
    var d = CKDOM,c = d.CSS;

    d.set(this._presetBtn,{className: c.PresetBtnActive});
};

CKPresetBtn_Internal.prototype.setStateInActive = function()
{
    var d = CKDOM,c = d.CSS;

    d.set(this._presetBtn,{className: c.PresetBtn});
};
