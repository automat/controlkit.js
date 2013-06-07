ControlKit.CanvasComponent = function(parent,object,value,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    var wrapNode  = this._wrapNode;
        wrapNode.setStyleClass(ControlKit.CSS.CanvasWrap);

    var wrapWidth = wrapNode.getWidth();

    var canvas = this._canvas = new ControlKit.Canvas(wrapNode);

        canvas.setSize(wrapWidth,wrapWidth);
        canvas.setAntialias( ControlKit.Constant.CANVAS_ANTIALIAS);
        canvas.setFontFamily(ControlKit.Constant.CANVAS_FONT_FAMILY);
        canvas.setFontSize(  ControlKit.Constant.CANVAS_FONT_SIZE);

    this._updateHeight();

    /*---------------------------------------------------------------------------------*/

    this._node.setStyleClass(ControlKit.CSS.CanvasListItem);


    this._parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE,this,  'onGroupSizeChange');
    this.addEventListener(ControlKit.EventType.GROUP_SIZE_UPDATE,this._parent,'onGroupSizeUpdate');
};

ControlKit.CanvasComponent.prototype = Object.create(ControlKit.ObjectComponent.prototype);

/*---------------------------------------------------------------------------------*/


ControlKit.CanvasComponent.prototype._updateHeight = function()
{
    var canvasHeight = this._canvas.height;

    this._wrapNode.setHeight(canvasHeight);
    this._node.setHeight(canvasHeight + ControlKit.Constant.PADDING_WRAPPER);
};

ControlKit.CanvasComponent.prototype._redraw = function(){};

ControlKit.CanvasComponent.prototype.onGroupSizeChange = function()
{
    var width = this._wrapNode.getWidth();

    this._canvas.setSize(width,width);
    this._updateHeight();
    this._redraw();

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_UPDATE,null));
};



