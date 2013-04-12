function CKCanvasComponent_Internal(parent,object,value,label)
{
    CKComponent_Internal.apply(this,arguments);

    var node     = this._node.setStyleClass(CKCSS.CanvasListItem);
    var wrapNode = this._wrapNode.setStyleClass(CKCSS.CanvasWrap);

    var canvas = this._canvas = new CKCanvas_Internal(wrapNode);
        canvas.setAntialias(false);
        canvas.setSize(wrapNode.getWidth(),wrapNode.getWidth());


    //TODO:FIX
    wrapNode.setHeight(wrapNode.getHeight() - 6);
    node.setHeight(wrapNode.getHeight() + 12);

    this._lablNode.setProperty('innerHTML',label);
}

CKCanvasComponent_Internal.prototype = Object.create(CKComponent_Internal.prototype);