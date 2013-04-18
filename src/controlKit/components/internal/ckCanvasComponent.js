function CKCanvasComponent(parent,object,value,label)
{
    CKObjectComponent.apply(this,arguments);

    var node     = this._node.setStyleClass(CKCSS.CanvasListItem);
    var wrapNode = this._wrapNode.setStyleClass(CKCSS.CanvasWrap);

    var canvas = this._canvas = new CKCanvas(wrapNode);
        canvas.setAntialias(false);
        canvas.setSize(wrapNode.getWidth(),wrapNode.getWidth());

    this._canvasNode = CKNode.getNodeByElement(this._canvas.getElement());


    //TODO:FIX
    wrapNode.setHeight(wrapNode.getHeight() - 6);
    node.setHeight(    wrapNode.getHeight() + 12);
}

CKCanvasComponent.prototype = Object.create(CKObjectComponent.prototype);