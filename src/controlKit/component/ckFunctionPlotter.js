ControlKit.FunctionPlotter = function(parent,object,value,label,params)
{
    ControlKit.Plotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params          || {};
    params.bounds   = params.bounds   || [-1,1,-1,1];

    /*---------------------------------------------------------------------------------*/

    this._bounds       = params.bounds;

    this._func = null;
    this.setFunction(this._object[this._key]);
};

ControlKit.FunctionPlotter.prototype = Object.create(ControlKit.Plotter.prototype);

ControlKit.FunctionPlotter.prototype.setFunction = function(func)
{
    this._func = func;

    var c = this._canvas;

    c.background(0,0);
    c.noFill();
    c.push();
    {
        c.translateHalfFloat();
        this._drawGrid();
        this._drawPlot();
    }
    c.pop();
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



