function CKValuePlotter(parent,object,value,label,params)
{
    CKPlotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params        || {};
    params.height   = params.height || this._canvas.height * 0.5;

    /*---------------------------------------------------------------------------------*/

    var length = this._canvas.width;

    this._points  = new Array(length * 2);
    this._buffer0 = new Array(length);
    this._buffer1 = new Array(length);

    var i = 0; while(i < this._points.length){this._points[i]=length-i;this._points[i+1]=0.0;i+=2;}
        i =-1; while(++i < length){this._buffer0[i] = this._buffer1[i] = 0.0;}

    params.height = params.height  < CKCSS.MinHeight ?
                    CKCSS.MinHeight : params.height;

    this._canvas.setSize(this._canvas.width,Math.floor(params.height));
    this._updateHeight();

    this._drawValue();


}

CKValuePlotter.prototype = Object.create(CKPlotter.prototype);

CKValuePlotter.prototype._drawValue = function()
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

CKValuePlotter.prototype._drawGrid = function()
{
    var canvas           = this._canvas,
        canvasWidth      = canvas.width,
        canvasHeightHalf = Math.floor(canvas.height * 0.5);

    canvas.setLineWidth(1);
    canvas.stroke(39,44,46);
    canvas.line(0,canvasHeightHalf,canvasWidth,canvasHeightHalf);
};

CKValuePlotter.prototype._drawCurve = function()
{
    var value = this._object[this._key];

    var canvas       = this._canvas,
        canvasHeight = this._canvas.height-2;

    canvas.push();
    canvas.translate(0,(Math.floor(canvasHeight)*0.5+0.5));
    canvas.setLineWidth(this._lineWidth);
    canvas.stroke(255);

    var i = 0;

    var length  = this._buffer0.length;

    var buffer0 = this._buffer0,
        buffer1 = this._buffer1,
        points  = this._points;

   buffer0[length - 1] = value * (canvasHeight * 0.5) * -1;

    while(++i < length)
    {
        buffer1[i - 1] = buffer0[i];
        points[i*2+1] = buffer0[i - 1] = buffer1[i - 1];
    }

    points[1] = buffer0[0];



    //var i=0;while(i<this._points.length){this._points[i+1]=value*(canvasHeight*0.5);i+=2;}
    canvas.lineArray(this._points);
    canvas.pop();

};

CKValuePlotter.prototype.update = function()
{

    this._drawValue();
};


