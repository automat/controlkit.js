/*
    TODO: FIX draw error, last point glitch
 */

ControlKit.ValuePlotter = function(parent,object,value,params)
{
    ControlKit.Plotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    var svg       = this._svg,
        svgWidth  = Number(svg.getAttribute('width')),
        svgHeight = Number(svg.getAttribute('height'));

    params            = params            || {};
    params.height     = params.height     || svgHeight;
    params.resolution = params.resolution || 1;

    /*---------------------------------------------------------------------------------*/

    var resolution = params.resolution,
        length     = Math.floor(svgWidth / resolution);

    var points     = this._points  = new Array(length * 2),
        buffer0    = this._buffer0 = new Array(length),
        buffer1    = this._buffer1 = new Array(length);

    var min = this._lineWidth * 0.5;

    var i = -1; while(++i < length){buffer0[i] =  buffer1[i] = points[i*2] = points[i*2+1] = min;}

    this._height = params.height = params.height  < ControlKit.Constant.MIN_HEIGHT ?
                   ControlKit.Constant.MIN_HEIGHT : params.height;

    /*---------------------------------------------------------------------------------*/

    this._svgSetSize(svgHeight,Math.floor(params.height));
    this._grid.style.stroke = 'rgb(39,44,46)';

    /*---------------------------------------------------------------------------------*/

    this._updateHeight();
    this._drawValue();
};

ControlKit.ValuePlotter.prototype = Object.create(ControlKit.Plotter.prototype);

ControlKit.ValuePlotter.prototype._redraw = function()
{
    var points    = this._points,
        bufferLen = this._buffer0.length;

    var width = Number(this._svg.getAttribute('width')),
        ratio = width / (bufferLen-1);

    var i = -1;while(++i < bufferLen){points[i*2] = width - i * ratio;}

    this._drawValue();
};

ControlKit.ValuePlotter.prototype.onGroupSizeChange = function()
{
    var width  = this._wrapNode.getWidth(),
        height = this._height;

    this._svgSetSize(width,height);
    this._updateHeight();
    this._drawGrid();
    this._redraw();
};

ControlKit.ValuePlotter.prototype._drawValue = function()
{
    this._drawCurve();
};

ControlKit.ValuePlotter.prototype._drawGrid = function()
{
    var svg = this._svg;

    var svgWidth      = Number(svg.getAttribute('width')),
        svgHeightHalf = Math.floor(Number(svg.getAttribute('height')) * 0.5);

    var pathCmd = '';
        pathCmd += this._pathCmdMoveTo(0,svgHeightHalf);
        pathCmd += this._pathCmdLineTo(svgWidth,svgHeightHalf);

    this._grid.setAttribute('d',pathCmd);
};

//TODO: merge update + pathcmd
ControlKit.ValuePlotter.prototype._drawCurve = function()
{
    var svg = this._svg;

    var value = this._object[this._key];

    var buffer0 = this._buffer0,
        buffer1 = this._buffer1,
        points  = this._points;

    var bufferLength = buffer0.length;

    var pathCmd = '';

    var heightHalf = Number(svg.getAttribute('height')) * 0.5,
        unit       = heightHalf - this._lineWidth * 0.5;

        points[1] = buffer0[0];
        buffer0[bufferLength - 1] =  (value * unit) * -1 + Math.floor(heightHalf);

    pathCmd += this._pathCmdMoveTo(points[0],points[1]);

    var i = 0,index;

    while(++i < bufferLength)
    {
        index = i * 2;

        buffer1[i-1]    = buffer0[i];
        points[index+1] = buffer0[i-1] = buffer1[i-1];

        pathCmd += this._pathCmdLineTo(points[index],points[index+1]);
    }

    this._path.setAttribute('d',pathCmd);
};

ControlKit.ValuePlotter.prototype.update = function()
{
    if(this._parent.isDisabled())return;
    this._drawValue();
};


