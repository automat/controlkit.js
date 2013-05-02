function CKCanvasComponent(parent,object,value,label)
{
    CKObjectComponent.apply(this,arguments);

    this._rootNode.setStyleClass(CKCSS.CanvasListItem);
    this._wrapNode.setStyleClass(CKCSS.CanvasWrap);

    this._canvas = new CKCanvas(this._wrapNode);
    this._canvas.setAntialias(false);
    this._canvas.setSize(this._wrapNode.getWidth(),
                         this._wrapNode.getWidth());

    this._canvas.setFontFamily('Arial');
    this._canvas.setFontSize(10);

    this._canvasNode = CKNode.getNodeByElement(this._canvas.getElement());

    this._updateHeight();
}

CKCanvasComponent.prototype = Object.create(CKObjectComponent.prototype);

CKCanvasComponent.prototype._updateHeight = function()
{
    this._wrapNode.setHeight(this._canvas.height);
    this._rootNode.setHeight(    this._canvas.height + CKCSS.WrapperPadding);
};

