/*
    TODO: FIX draw error, last point glitch
 */

ControlKit.ValuePlotter = function(parent,object,value,params)
{
    ControlKit.Plotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    var canvas = this._canvas;

    params            = params            || {};
    params.height     = params.height     || canvas.height * 0.5;
    params.resolution = params.resolution || 1;

    /*---------------------------------------------------------------------------------*/

    var resolution = params.resolution,
        length     = Math.floor(canvas.width / resolution);

    var points     = this._points  = new Array(length * 2),
        buffer0    = this._buffer0 = new Array(length),
        buffer1    = this._buffer1 = new Array(length);

    var pointsLength = points.length;

    var i = 0; while(i   < pointsLength){points[i]  = (length-i+1)*resolution;points[i+1]=0.0;i+=2;}
        i =-1; while(++i < length    )  {buffer0[i] =  buffer1[i] = 0.0;}

    this._height = params.height = params.height  < ControlKit.Constant.MIN_HEIGHT ?
                   ControlKit.Constant.MIN_HEIGHT : params.height;

    /*---------------------------------------------------------------------------------*/

    canvas.setSize(canvas.width,Math.floor(params.height));

    /*---------------------------------------------------------------------------------*/

    this._updateHeight();
    this._drawValue();
};

ControlKit.ValuePlotter.prototype = Object.create(ControlKit.Plotter.prototype);

ControlKit.ValuePlotter.prototype._redraw = function()
{
    var width  = this._wrapNode.getWidth(),
        points = this._points,
        length = points.length,
        ratio  = width / (length * 0.5 ) ;

    var i = 0;while(i < length){points[i] = width - i * ratio;i+=2;}

    this._drawValue();
};

ControlKit.ValuePlotter.prototype.onGroupSizeChange = function()
{
    var width  = this._wrapNode.getWidth(),
        height = this._height;

    this._canvas.setSize(width,height);
    this._updateHeight();
    this._redraw();
};

ControlKit.ValuePlotter.prototype._drawValue = function()
{
    var canvas = this._canvas;

    canvas.clear();
    canvas.background(0,0);
    canvas.push();
    {
        canvas.translateHalfFloat();
        this._drawGrid();
        this._drawCurve();
    }
    canvas.pop();
};

ControlKit.ValuePlotter.prototype._drawGrid = function()
{
    var canvas           = this._canvas,
        canvasWidth      = canvas.width,
        canvasHeightHalf = Math.floor(canvas.height * 0.5);

    canvas.setLineWidth(1);
    canvas.stroke(39,44,46);
    canvas.line(0,canvasHeightHalf,canvasWidth,canvasHeightHalf);
};

ControlKit.ValuePlotter.prototype._drawCurve = function()
{
    var value = this._object[this._key];

    var canvas       = this._canvas,
        canvasHeight = this._canvas.height-2;

    var i = 0;

    var length  = this._buffer0.length;

    var buffer0 = this._buffer0,
        buffer1 = this._buffer1,
        points  = this._points;

    buffer0[length - 1] = value * (canvasHeight * 0.5) * -1;

    while(++i < length)
    {
        buffer1[i - 1 ] = buffer0[i];
        points[ i*2+1 ] = buffer0[i - 1] = buffer1[i - 1];
    }

    points[1] = buffer0[0];

    var strokeColor = this._lineColor;

    canvas.push();
    {
        canvas.translate(0,(Math.floor(canvasHeight)*0.5+0.5));
        //canvas.setLineWidth(this._lineWidth+3);
        //canvas.stroke(0);
        //canvas.lineArray(this._points);
        canvas.setLineWidth(this._lineWidth+0.5);
        canvas.stroke(strokeColor[0],strokeColor[1],strokeColor[2]);
        canvas.lineArray(this._points);
    }
    canvas.pop();

};

ControlKit.ValuePlotter.prototype.update = function()
{
    if(this._parent.isDisabled())return;
    this._drawValue();
};


