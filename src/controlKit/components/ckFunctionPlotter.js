function CKFunctionPlotter(parent,object,value,label,params)
{
    CKPlotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params          || {};
    params.bounds   = params.bounds   || [-1,1,-1,1];

    /*---------------------------------------------------------------------------------*/

    this._bounds       = params.bounds;

    this._func = null;
    this.setFunction(this._object[this._key]);
}

CKFunctionPlotter.prototype = Object.create(CKPlotter.prototype);

CKFunctionPlotter.prototype.setFunction = function(func)
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

CKFunctionPlotter.prototype._drawPlot = function()
{
    var c = this._canvas;

    var width  = Math.floor(c.width),
        height = Math.floor(c.height);

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
    c.setLineWidth(2);
    c.translate(0,height*0.5);
    c.stroke(255);
    c.lineArray(points);

};



