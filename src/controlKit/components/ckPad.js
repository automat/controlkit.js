function CKPad(parent,object,value,label,params)
{
    CKCanvasComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params            || {};
    params.onChange   = params.onChange   || null;
    params.onFinish   = params.onFinish   || null;
    params.gridRes    = params.gridRes    || [10,10];
    params.bounds     = params.bounds     || [-1,1,-1,1];
    params.axisLabels = params.axisLabels || [null,null];

    /*---------------------------------------------------------------------------------*/

    this._onChange     = params.onChange || this._onChange;
    this._onFinish     = params.onFinish || this._onFinish;

    this._gridRes      = params.gridRes;
    this._bounds       = params.bounds;
    this._axisLabels   = params.axisLabels;
    this._value        = this._object[this._key];

    this._dragging     = false;

    /*---------------------------------------------------------------------------------*/

    var canvas = this._canvas;
        canvas.setFontFamily('Arial');
        canvas.setFontSize(10);

    /*---------------------------------------------------------------------------------*/

    canvas = this._canvas.getElement();

    canvas.onmousedown = function()
    {
        this._dragging = true;
        this._drawValue(this._getMouseNormalized());
        this._applyValue()

    }.bind(this);

    canvas.onmouseup   = function()
    {
        this._dragging = false;
    }.bind(this);

    var doconmousemove = document.onmousemove || function(){},
        doconmouseup   = document.onmouseup   || function(){};

    document.onmousemove = function(e)
    {
        doconmousemove(e);
        if(this._dragging)
        {
            this._drawValue(this._getMouseNormalized());
            this._applyValue();
            this._onChange();
        }
    }.bind(this);

    document.onmouseup = function(e)
    {
        doconmouseup(e);
        if(this._dragging)
        {
            this._dragging = false;
            this._applyValue();
            this._onFinish();
        }

    }.bind(this);

    /*---------------------------------------------------------------------------------*/


    this._drawValue(this._value);
}

CKPad.prototype = Object.create(CKCanvasComponent.prototype);

CKPad.prototype._setListener = function()
{
    var canvas = this._canvas.getElement();

    canvas.onmousedown = function()
                        {
                            this._dragging = true;
                            this._drawValue(this._getMouseNormalized());
                            this._applyValue()

                        }.bind(this);

    canvas.onmouseup   = function()
                         {
                             this._dragging = false;
                         }.bind(this);

    var doconmousemove = document.onmousemove || function(){},
        doconmouseup   = document.onmouseup   || function(){};

    document.onmousemove = function(e)
    {
        doconmousemove(e);
        if(this._dragging)
        {
            this._drawValue(this._getMouseNormalized());
            this._applyValue();
            this._onChange();
        }
    }.bind(this);

    document.onmouseup = function(e)
    {
        doconmouseup(e);
        if(this._dragging)
        {
            this._dragging = false;
            this._applyValue();
            this._onFinish();
        }

    }.bind(this);
};

CKPad.prototype._drawValue = function(value)
{
    this._value = value;

    var canvas = this._canvas;

    canvas.clear();
    canvas.background(0,0);
    canvas.push();
    canvas.translateHalfFloat();
    this._drawGrid();
    this._drawPoint();
    canvas.pop();
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


};

CKPad.prototype._drawPoint = function()
{
    var canvas       = this._canvas,
        canvasWidth  = canvas.width  - 1,
        canvasHeight = canvas.height - 1,
        canvasMidX   = canvas.width * 0.5,
        canvasMidY   = canvas.height * 0.5;

    var axisLabels   = this._axisLabels;

    var localX = ( 0.5 +  this._value[0] * 0.5 ) * canvasWidth,
        localY = ( 0.5 + -this._value[1] * 0.5 ) * canvasHeight;

    canvas.stroke(39,44,46);
    canvas.line(0,canvasMidY,canvasWidth,canvasMidY);
    canvas.line(canvasMidX,0,canvasMidX,canvasHeight);

    canvas.stroke(39,44,46);
    canvas.line(0,canvasMidY,canvasWidth,canvasMidY);
    canvas.line(canvasMidX,0,canvasMidX,canvasHeight);


    //TODO:FIX
    if(!(!axisLabels[0] && !axisLabels[1]))
    {
        canvas.fill(64,72,77);

        if(axisLabels[0])
        {
            var stringX = axisLabels[0].toUpperCase();
            canvas.text(stringX,Math.floor(canvasMidX*0.5-canvas.getTextWidth(stringX)*0.5),
                Math.floor(canvasMidY)+12);
        }

        if(axisLabels[1])
        {
            var stringY = axisLabels[1].toUpperCase();
            canvas.push();
            {
                canvas.translate(Math.floor(canvasMidX)+5,
                    Math.floor(canvasMidY*0.5-canvas.getTextWidth(stringY)*0.5));
                canvas.rotate(Math.PI*0.5);
                canvas.text(stringY,0,0);

            }
            canvas.pop();
        }

        canvas.noFill();
    }

    canvas.stroke(75,84,89);
    canvas.line(0,localY,canvasWidth,localY);
    canvas.line(localX,0,localX,canvasHeight);

    canvas.noStroke();
    canvas.fill(0,0.05);
    canvas.circle(localX,localY,11);

    canvas.fill(83,93,98);
    canvas.circle(localX,localY,10);

    canvas.fill(57,69,76);
    canvas.circle(localX,localY+1,9);

    canvas.stroke(17,19,20);
    canvas.noFill();
    canvas.circle(localX,localY,10);

    canvas.fill(30,34,36);
    canvas.circle(localX,localY,6);

    canvas.fill(255);
    canvas.circle(localX,localY,3);
};

CKPad.prototype._getMouseNormalized = function()
{
    var offset       = this._canvasNode.getPositionGlobal(),
        mouse        = CKMouse.getInstance().getPosition();

    var canvas       = this._canvas,
        canvasWidth  = canvas.width  - 1,
        canvasHeight = canvas.height - 1;

    return [ -1 + Math.max(0,Math.min(mouse[0]-offset[0],canvasWidth )) / canvasWidth  * 2,
            ( 1 - Math.max(0,Math.min(mouse[1]-offset[1],canvasHeight)) / canvasHeight * 2)];
};

CKPad.prototype._applyValue = function()
{
    var objectValue = this._object[this._key],
        value       = this._value;

    objectValue[0] = value[0];
    objectValue[1] = value[1];

    this._parent.forceUpdate();
};

CKPad.prototype.forceUpdate = function()
{
    this._drawValue(this._object[this._key]);
};




