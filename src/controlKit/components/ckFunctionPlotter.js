function CKFunctionPlotter(parent,object,value,label,params)
{
    CKCanvasComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params          || {};
    params.gridRes  = params.gridRes  || [10,10];
    params.bounds   = params.bounds   || [-1,1,-1,1];

    /*---------------------------------------------------------------------------------*/

    this._gridRes      = params.gridRes;
    this._bounds       = params.bounds;


    this._func = null;
    this.setFunction(this._object[this._key]);
}

CKFunctionPlotter.prototype = Object.create(CKCanvasComponent.prototype);

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

CKFunctionPlotter.prototype._drawGrid = function()
{
    var c = this._canvas;

    var gridResX     = this._gridRes[0],
        gridResY     = this._gridRes[1],
        canvasWidth  = c.width,
        canvasHeight = c.height;


    var spacingGridX = canvasWidth  / (gridResX),
        spacingGridY = canvasHeight / gridResY;

    var temp;
    var i = -1;

    c.stroke(26,29,31);

    while(++i < gridResX)
    {
        temp = Math.round(spacingGridX + spacingGridX * i);
        c.line(0,temp,canvasWidth,temp);
    }
    i = -1;
    while(++i < gridResY)
    {
        temp = Math.round(spacingGridY + spacingGridY * i);
        c.line(temp,0,temp,canvasHeight);
    }

    var midX = Math.round(canvasWidth  * 0.5),
        midY = Math.round(canvasHeight * 0.5);

    c.stroke(75,84,89);


    c.line(0,midY,canvasWidth,midY);
    c.line(midX,0,midX,canvasHeight);
};

