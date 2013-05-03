ControlKit.CKCanvasComponent = function(parent,object,value,label)
{
    ControlKit.CKObjectComponent.apply(this,arguments);

    this._rootNode.setStyleClass(ControlKit.CKCSS.CanvasListItem);
    this._wrapNode.setStyleClass(ControlKit.CKCSS.CanvasWrap);

    this._canvas = new ControlKit.CKCanvas(this._wrapNode);
    this._canvas.setAntialias(false);
    this._canvas.setSize(this._wrapNode.getWidth(),
                         this._wrapNode.getWidth());

    this._canvas.setFontFamily('Arial');
    this._canvas.setFontSize(10);

    this._canvasNode = ControlKit.CKNode.getNodeByElement(this._canvas.getElement());

    this._updateHeight();
}

ControlKit.CKCanvasComponent.prototype = Object.create(ControlKit.CKObjectComponent.prototype);

ControlKit.CKCanvasComponent.prototype._updateHeight = function()
{
    this._wrapNode.setHeight(this._canvas.height);
    this._rootNode.setHeight(    this._canvas.height + ControlKit.CKCSS.WrapperPadding);
};

