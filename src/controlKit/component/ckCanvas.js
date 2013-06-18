ControlKit.Canvas = function(parent,params)
{
    ControlKit.Component.apply(this,arguments);

    /*-------------------------------------------------------------------------------------*/

    var wrapNode = this._wrapNode;
        wrapNode.setStyleClass(ControlKit.CSS.CanvasWrap);

    var wrapWidth = wrapNode.getWidth();

    var canvas = this._canvas = document.createElement('canvas');
        wrapNode.getElement().appendChild(canvas);

    this._canvasWidth = this._canvasHeight = 0;
    this._setCanvasSize(wrapWidth,wrapWidth);

    this._updateHeight();

    /*-------------------------------------------------------------------------------------*/

    this._node.setStyleClass(ControlKit.CSS.CanvasListItem);

    this._parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE,this,  'onGroupSizeChange');
    this.addEventListener(ControlKit.EventType.GROUP_SIZE_UPDATE,this._parent,'onGroupSizeUpdate');

};

ControlKit.Canvas.prototype = Object.create(ControlKit.Component.prototype);

/*-------------------------------------------------------------------------------------*/


ControlKit.Canvas.prototype._updateHeight = function()
{
    var canvasHeight = this._canvas.height;

    this._wrapNode.setHeight(canvasHeight);
    this._node.setHeight(canvasHeight + ControlKit.Metric.PADDING_WRAPPER);

};

ControlKit.Canvas.prototype.onGroupSizeChange = function()
{
    var width = this._wrapNode.getWidth();

    this._setCanvasSize(width,width);
    this._updateHeight();
    this._redraw();

    this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.GROUP_SIZE_UPDATE,null));
};

ControlKit.Canvas.prototype._setCanvasSize = function(width,height)
{
    var canvasWidth  = this._canvasWidth  = width,
        canvasHeight = this._canvasHeight = height;

    var canvas = this._canvas;
        canvas.setStyleProperty('width', canvasWidth  + 'px');
        canvas.setStyleProperty('height',canvasHeight + 'px');
        canvas.width  = canvasWidth;
        canvas.height = canvasHeight;
};

ControlKit.Canvas.prototype.getCanvas  = function(){return this._canvas;};
ControlKit.Canvas.prototype.getContext = function(){return this._canvas.getContext('2d');};