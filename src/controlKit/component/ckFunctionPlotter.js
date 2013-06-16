ControlKit.FunctionPlotter = function(parent,object,value,params)
{
    ControlKit.Plotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params          = params          || {};
    params.bounds   = params.bounds   || [-1,1,-1,1];

    /*---------------------------------------------------------------------------------*/

    this._bounds       = params.bounds;

    var axes = this._axes = this._svgRoot.insertBefore(this._createSVGObject('path'),this._path);
        axes.style.stroke = 'rgb(39,44,46)';
        axes.style.lineWidth = 1;

    this._func = null;
    this.setFunction(this._object[this._key]);

    this._svg.onclick = this._onDragStart.bind(this);

    /*---------------------------------------------------------------------------------*/

    var kit = ControlKit.getKitInstance();
        kit.addEventListener(ControlKit.EventType.UPDATE_VALUE,this,'onValueUpdate');
};

ControlKit.FunctionPlotter.prototype = Object.create(ControlKit.Plotter.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.FunctionPlotter.prototype._onDragStart = function()
{
    var eventMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventUp   = ControlKit.DocumentEventType.MOUSE_UP;

    var self = this;

    var onDrag    = function()
                    {

                    };

    var onDragEnd = function()
                    {
                        document.removeEventListener(eventMove,onDrag,   false);
                        document.removeEventListener(eventMove,onDragEnd,false)
                    };

    document.addEventListener(eventMove, onDrag,    false);
    document.addEventListener(eventUp,   onDragEnd, false);
};

/*---------------------------------------------------------------------------------*/

ControlKit.FunctionPlotter.prototype.onValueUpdate = function(){this.setFunction(this._object[this._key]);};
ControlKit.FunctionPlotter.prototype._redraw       = function(){this.setFunction(this._object[this._key]);};

ControlKit.FunctionPlotter.prototype.setFunction = function(func)
{
    this._func = func;

    this._drawGrid();
    this._drawAxes();
    this._drawBoundsPanel();
    this._drawPlot();
};

ControlKit.FunctionPlotter.prototype._drawAxes = function()
{
    var svg           = this._svg,
        svgWidth      = Number(svg.getAttribute('width')),
        svgHeight     = Number(svg.getAttribute('height')),
        svgWidthHalf  = Math.floor(svgWidth  * 0.5),
        svgHeightHalf = Math.floor(svgHeight * 0.5);

    var pathCmd = '';
        pathCmd += this._pathCmdLine(0,svgHeightHalf,svgWidth,svgHeightHalf);
        pathCmd += this._pathCmdLine(svgWidthHalf,0,svgWidthHalf,svgHeight);

    this._axes.setAttribute('d',pathCmd);
};


//TODO: add
ControlKit.FunctionPlotter.prototype._drawBoundsPanel = function()
{

};

//TODO: merge update + pathcmd
ControlKit.FunctionPlotter.prototype._drawPlot = function()
{
    var svg       = this._svg,
        svgWidth  = Number(svg.getAttribute('width')),
        svgHeight = Number(svg.getAttribute('height'));

    var bounds = this._bounds,
        minx   = bounds[0],
        maxx   = bounds[1],
        miny   = bounds[2],
        maxy   = bounds[3];

    var points = new Array(Math.floor(svgWidth) * 2);
    var i = 0, l = points.length;
    var normval;
    while(i<l)
    {
        normval =  i/l;
        points[i]   = normval*svgWidth;
        points[i+1] = this._func(normval)*svgHeight*0.5;
        i+=2;
    }

    var pathCmd = '';
    pathCmd += this._pathCmdMoveTo(points[0],points[1]);

    i = 2;
    while(i < points.length)
    {
        pathCmd += this._pathCmdLineTo(points[i],points[i+1]);
        i+=2;
    }

    this._path.setAttribute('d',pathCmd);
};
