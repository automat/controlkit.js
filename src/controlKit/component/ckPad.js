ControlKit.Pad = function(parent,object,value,params)
{
    ControlKit.Plotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params            || {};
    params.onChange   = params.onChange   || null;
    params.onFinish   = params.onFinish   || null;
    params.bounds     = params.bounds     || [-1,1,-1,1];
    params.axisLabels = params.axisLabels || [null,null];
    params.showCross  = params.showCross  || true;

    /*---------------------------------------------------------------------------------*/

    this._onChange     = params.onChange || this._onChange;
    this._onFinish     = params.onFinish || this._onFinish;

    this._bounds       = params.bounds;
    this._axisLabels   = params.axisLabels;
    this._showCross    = params.showCross;

    this._dragging     = false;

    /*---------------------------------------------------------------------------------*/

    /*
    var canvas = this._canvas;
        canvas.setFontFamily('Arial');
        canvas.setFontSize(10);

        */

    /*---------------------------------------------------------------------------------*/

    /*
    canvas = this._canvas.getElement();

    canvas.onmousedown = function()
    {
        this._dragging = true;
        this.pushHistoryState();
        this._drawValue(this._getMouseNormalized());
        this.applyValue()

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
            this.applyValue();
            this._onChange();
        }
    }.bind(this);

    document.onmouseup = function(e)
    {
        doconmouseup(e);
        if(this._dragging)
        {
            this.pushHistoryState();
            this._dragging = false;
            this.applyValue();
            this._onFinish();
        }

    }.bind(this);

    */

    /*---------------------------------------------------------------------------------*/

    this._drawValue(this._object[this._key]);
};

ControlKit.Pad.prototype = Object.create(ControlKit.Plotter.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.Pad.prototype._redraw = function(){this._drawValue(this._object[this._key]);};

ControlKit.Pad.prototype._drawValue = function(value)
{
    this._object[this._key] = value;

    /*
    var canvas = this._canvas;

    canvas.clear();
    canvas.background(0,0);
    canvas.push();
    canvas.translateHalfFloat();
    this._drawGrid();
    this._drawPoint();
    canvas.pop();
    */
};


ControlKit.Pad.prototype._drawPoint = function()
{
    /*

    var canvas       = this._canvas,
        canvasWidth  = canvas.width  - 1,
        canvasHeight = canvas.height - 1,
        canvasMidX   = canvas.width  * 0.5,
        canvasMidY   = canvas.height * 0.5;

    var axisLabels   = this._axisLabels;

    var value = this._object[this._key];

    var localX = ( 0.5 +  value[0] * 0.5 ) * canvasWidth,
        localY = ( 0.5 + -value[1] * 0.5 ) * canvasHeight;

    canvas.stroke(39,44,46);
    canvas.line(0,canvasMidY,canvasWidth,canvasMidY);
    canvas.line(canvasMidX,0,canvasMidX,canvasHeight);
    canvas.line(0,canvasMidY,canvasWidth,canvasMidY);
    canvas.line(canvasMidX,0,canvasMidX,canvasHeight);
    canvas.noStroke();

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

    if(this._showCross)
    {
        canvas.stroke(75,84,89);
        canvas.line(0,localY,canvasWidth,localY);
        canvas.line(localX,0,localX,canvasHeight);
    }

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

    */



};

ControlKit.Pad.prototype._getMouseNormalized = function()
{
    /*

    var offset       = this._canvas.getNode().getPositionGlobal(),
        mouse        = ControlKit.Mouse.getInstance().getPosition();

    var canvas       = this._canvas,
        canvasWidth  = canvas.width  - 1,
        canvasHeight = canvas.height - 1;

    return [ -1 + Math.max(0,Math.min(mouse[0]-offset[0],canvasWidth )) / canvasWidth  * 2,
            ( 1 - Math.max(0,Math.min(mouse[1]-offset[1],canvasHeight)) / canvasHeight * 2)];
            */
};

ControlKit.Pad.prototype.applyValue = function()
{
   this.dispatchEvent(new ControlKit.Event(this,ControlKit.EventType.VALUE_UPDATED,null));
};

ControlKit.Pad.prototype.onValueUpdate = function(e)
{
    if(e.data.origin == this)return;
    this._drawValue(this._object[this._key]);
};
