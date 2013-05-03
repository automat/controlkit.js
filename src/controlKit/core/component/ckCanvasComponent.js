ControlKit.CanvasComponent = function(parent,object,value,label)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    this._rootNode.setStyleClass(ControlKit.CSS.CanvasListItem);
    this._wrapNode.setStyleClass(ControlKit.CSS.CanvasWrap);

    this._canvas = new ControlKit.Canvas(this._wrapNode);
    this._canvas.setAntialias(false);
    this._canvas.setSize(this._wrapNode.getWidth(),
                         this._wrapNode.getWidth());

    this._canvas.setFontFamily('Arial');
    this._canvas.setFontSize(10);

    this._canvasNode = ControlKit.Node.getNodeByElement(this._canvas.getElement());

    this._updateHeight();
}

ControlKit.CanvasComponent.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.CanvasComponent.prototype._updateHeight = function()
{
    this._wrapNode.setHeight(this._canvas.height);
    this._rootNode.setHeight(    this._canvas.height + ControlKit.CSS.WrapperPadding);
};

