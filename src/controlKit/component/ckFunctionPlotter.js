ControlKit.FunctionPlotter = function(parent,object,value,params)
{
    ControlKit.Plotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params          || {};
    params.bounds   = params.bounds   || [-1,1,-1,1];

    /*---------------------------------------------------------------------------------*/

    this._bounds       = params.bounds;

    this._func = null;
    this.setFunction(this._object[this._key]);

    var canvas = this._canvas;
        canvas.setFontWeight('normal');
        canvas.setFontFamily('Arial');
        canvas.setFontSize(10);

    var kit = ControlKit.getKitInstance();
        kit.addEventListener(ControlKit.EventType.UPDATE_VALUE,this,'onValueUpdate');
};

ControlKit.FunctionPlotter.prototype = Object.create(ControlKit.Plotter.prototype);

ControlKit.FunctionPlotter.prototype.onValueUpdate = function(){this.setFunction(this._object[this._key]);};
ControlKit.FunctionPlotter.prototype._redraw       = function(){this.setFunction(this._object[this._key]);}

ControlKit.FunctionPlotter.prototype.setFunction = function(func)
{
    this._func = func;

    var c = this._canvas;

    c.clear();
    c.background(0,0);
    c.noFill();
    c.push();
    {
        c.translateHalfFloat();
        this._drawGrid();
        this._drawAxes();
        this._drawBoundsPanel();
        this._drawPlot();
    }
    c.pop();
};

ControlKit.FunctionPlotter.prototype._drawAxes = function()
{
    var canvas           = this._canvas,
        canvasWidth      = canvas.width,
        canvasHeight     = canvas.height,
        canvasWidthHalf  = canvasWidth * 0.5,
        canvasHeightHalf = canvasHeight * 0.5;

    canvas.setLineWidth(1);
    canvas.stroke(39,44,46);
    canvas.line(0,canvasHeightHalf,canvasWidth,canvasHeightHalf);
    canvas.line(canvasWidthHalf,0,canvasWidthHalf,canvasHeight);
};

ControlKit.FunctionPlotter.prototype._drawBoundsPanel = function()
{
    var canvas = this._canvas,
        panelX = 8,
        panelY = 16,
        bounds = this._bounds;

    canvas.noStroke();

    canvas.fill(100);
    canvas.text('x=['+bounds[0] + ' ,' +bounds[1] + ']\ny=['+bounds[2] + ' ,' +bounds[3] + ']' ,panelX,panelY);
};


ControlKit.FunctionPlotter.prototype._drawPlot = function()
{
    var canvas = this._canvas;

    var width  = Math.floor(canvas.width),
        height = Math.floor(canvas.height);

    var bounds = this._bounds,
        minx = bounds[0],
        maxx = bounds[1],
        miny = bounds[2],
        maxy = bounds[3];

    var points = new Array(width * 2);
    var i = 0, l = points.length;
    var normval;
    while(i<l)
    {
        normval =  i/l;
        points[i]   = normval*width;
        points[i+1] = this._func(normval)*height*0.5;
        i+=2;
    }

    canvas.push();
    {
        canvas.translate(0,(Math.floor(height)*0.5+0.5));
        canvas.setLineWidth(this._lineWidth+3);
        canvas.stroke(0);
        canvas.lineArray(points);
        canvas.setLineWidth(this._lineWidth+0.5);
        canvas.stroke(255);
        canvas.lineArray(points);
    }
    canvas.pop();

};
