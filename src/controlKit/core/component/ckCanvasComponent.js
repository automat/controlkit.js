ControlKit.CanvasComponent = function(parent,object,value,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    this._rootNode.setStyleClass(ControlKit.CSS.CanvasListItem);

    var wrapNode  = this._wrapNode.setStyleClass(ControlKit.CSS.CanvasWrap),
        wrapWidth = wrapNode.getWidth();

    var canvas = this._canvas = new ControlKit.Canvas(wrapNode);
        canvas.setSize(wrapWidth,wrapWidth);

        canvas.setAntialias( ControlKit.Constant.CANVAS_ANTIALIAS);
        canvas.setFontFamily(ControlKit.Constant.CANVAS_FONT_FAMILY);
        canvas.setFontSize(  ControlKit.Constant.CANVAS_FONT_SIZE);

    this._canvasNode = ControlKit.Node.getNodeByElement(canvas.getElement());

    this._updateHeight();

    this._parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE,this,  'onGroupSizeChange');
    this.addEventListener(  ControlKit.EventType.GROUP_SIZE_UPDATE,this._parent,'onGroupSizeUpdate');
};

ControlKit.CanvasComponent.prototype = Object.create(ControlKit.ObjectComponent.prototype);

ControlKit.CanvasComponent.prototype._updateHeight = function()
{
    var canvasHeight = this._canvas.height;

    this._wrapNode.setHeight(canvasHeight);
    this._rootNode.setHeight(canvasHeight + ControlKit.Constant.PADDING_WRAPPER);
};

ControlKit.CanvasComponent.prototype._redraw = function(){};

ControlKit.CanvasComponent.prototype.onGroupSizeChange = function()
{
    var wrapNodeWidth = this._wrapNode.getWidth();

    this._canvas.setSize(wrapNodeWidth,wrapNodeWidth);
    this._updateHeight();
    this._redraw();

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_UPDATE,null));
};



