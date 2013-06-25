ControlKit.Pad = function(parent,object,value,params)
{
    ControlKit.Plotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params            || {};
    params.boundsX    = params.boundsX    || ControlKit.Default.PAD_BOUNDS_X;
    params.boundsY    = params.boundsY    || ControlKit.Default.PAD_BOUNDS_Y;
    params.labelX     = params.labelX     || ControlKit.Default.PAD_LABEL_X;
    params.labelY     = params.labelY     || ControlKit.Default.PAD_LABEL_Y;

    params.showCross  = params.showCross  || true;

    /*---------------------------------------------------------------------------------*/

    this._onChange     = params.onChange || this._onChange;
    this._onFinish     = params.onFinish || this._onFinish;

    this._boundsX      = params.boundsX;
    this._boundsY      = params.boundsY;
    this._labelAxisX   = params.labelX != '' && params.labelX != 'none' ? params.labelX : null;
    this._labelAxisY   = params.labelY != '' && params.labelY != 'none' ? params.labelY : null;

    var path = this._path;
        path.style.strokeWidth = 1;
        path.style.stroke      = '#363c40';

    this._grid.style.stroke = 'rgb(25,25,25)';

    this._svgPos = [0,0];


    var handle = this._handle = this._svgRoot.appendChild(this._createSVGObject('g'));
    var handleCircle0 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle0.setAttribute('r',String(11));
        handleCircle0.setAttribute('fill','rgba(0,0,0,0.05)');
    var handleCircle1 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle1.setAttribute('r',String(10));
        handleCircle1.setAttribute('fill','rgb(83,93,98)');

    var handleCircle2 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle2.setAttribute('r',String(9));
        handleCircle2.setAttribute('fill','rgb(57,69,76)');
        handleCircle2.setAttribute('cy',String(0.75));

    var handleCircle3 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle3.setAttribute('r',String(10));
        handleCircle3.setAttribute('stroke','rgb(17,19,20)');
        handleCircle3.setAttribute('stroke-width',String(1));
        handleCircle3.setAttribute('fill','none');

    var handleCircle4 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle4.setAttribute('r',String(6));
        handleCircle4.setAttribute('fill','rgb(30,34,36)');
    var handleCircle5 = handle.appendChild(this._createSVGObject('circle'));
        handleCircle5.setAttribute('r',String(3));
        handleCircle5.setAttribute('fill','rgb(255,255,255)');

        handle.setAttribute('tranform','translate(0 0)');

    this._svg.addEventListener(ControlKit.DocumentEventType.MOUSE_DOWN,this._onDragStart.bind(this),false);



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

ControlKit.Pad.prototype._onDragStart = function()
{
    var element = this._svg;

    var svgPos = this._svgPos;
        svgPos[0] = 0;
        svgPos[1] = 0;

    while(element)
    {
        svgPos[0] += element.offsetLeft;
        svgPos[1] += element.offsetTop;
        element    = element.offsetParent;
    }

    var eventMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventUp   = ControlKit.DocumentEventType.MOUSE_UP;

    var onDrag    = function()
        {
            this._drawValueInput();
            this.applyValue();
            this._onChange();

        }.bind(this);

    var onDragEnd = function()
        {
            this.pushHistoryState();
            this._drawValueInput();
            this.applyValue();
            this._onFinish();

            document.removeEventListener(eventMove,onDrag,   false);
            document.removeEventListener(eventUp,  onDragEnd,false);

        }.bind(this);

    document.addEventListener(eventMove, onDrag,    false);
    document.addEventListener(eventUp,   onDragEnd, false);

    this._drawValueInput();
    this.applyValue();
    this._onChange();
};

ControlKit.Pad.prototype._redraw = function(){this._drawValue(this._object[this._key]);};

ControlKit.Pad.prototype._drawValueInput = function()
{
    this._drawValue(this._getMouseNormalized());
};

ControlKit.Pad.prototype._drawValue = function(value)
{
    this._object[this._key] = value;

    this._drawGrid();
    this._drawPoint();
};

ControlKit.Pad.prototype._drawGrid = function()
{
    var svgSize = Number(this._svg.getAttribute('width')),
        svgMidX = Math.floor(svgSize * 0.5),
        svgMidY = Math.floor(svgSize * 0.5);

    var pathCmd = '';
        pathCmd+= this._pathCmdLine(0,svgMidY,svgSize,svgMidY);
        pathCmd+= this._pathCmdLine(svgMidX,0,svgMidX,svgSize);

    this._grid.setAttribute('d',pathCmd);
};


ControlKit.Pad.prototype._drawPoint = function()
{
    var svgSize = Number(this._svg.getAttribute('width')),
        svgMidX = svgSize * 0.5,
        svgMidY = svgSize * 0.5;

    var value = this._object[this._key];

    var localX = ( 0.5 +  value[0] * 0.5 ) * svgSize,
        localY = ( 0.5 + -value[1] * 0.5 ) * svgSize;

    var pathCmd = '';
        pathCmd+= this._pathCmdLine(0,localY,svgSize,localY);
        pathCmd+= this._pathCmdLine(localX,0,localX,svgSize);

    this._path.setAttribute('d',pathCmd);
    this._handle.setAttribute('transform','translate('+localX +' '+localY+')');
};

ControlKit.Pad.prototype._getMouseNormalized = function()
{
    var offset  = this._svgPos,
        mouse   = ControlKit.Mouse.getInstance().getPosition(),
        svgSize = Number(this._svg.getAttribute('width'));

    return [ -1 + Math.max(0,Math.min(mouse[0]-offset[0],svgSize)) / svgSize * 2,
            ( 1 - Math.max(0,Math.min(mouse[1]-offset[1],svgSize)) / svgSize * 2)];

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
