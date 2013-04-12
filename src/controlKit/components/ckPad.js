function CKPad(parent,object,value,label,params)
{
    CKCanvasComponent_Internal.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params          || {};
    params.gridRes  = params.gridRes  || [10,10];
    params.bounds   = params.bounds   || [-1,1,-1,1];

    /*---------------------------------------------------------------------------------*/

    this._gridRes      = params.gridRes;
    this._bounds       = params.bounds;

    this.setFunction();
}

CKPad.prototype = Object.create(CKCanvasComponent_Internal.prototype);

CKPad.prototype.setFunction = function()
{
    var c = this._canvas;

    c.background(0,0);
    c.noFill();
    c.push();
    c.translateHalfFloat();
    this._drawGrid();
    c.pop();
};

CKPad.prototype._drawGrid = function()
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

