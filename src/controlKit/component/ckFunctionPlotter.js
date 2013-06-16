ControlKit.FunctionPlotter = function(parent,object,value,params)
{
    ControlKit.Plotter.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params = params || {};

    /*---------------------------------------------------------------------------------*/

    var axes = this._axes = this._svgRoot.insertBefore(this._createSVGObject('path'),this._path);
        axes.style.stroke = 'rgb(39,44,46)';
        axes.style.lineWidth = 1;

    this._grid.style.stroke = 'rgb(25,25,25)';

    var svg    = this._svg,
        width  = Number(svg.getAttribute('width')),
        height = Number(svg.getAttribute('height'));

    var sliderXWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderXWrap.setStyleClass(ControlKit.CSS.GraphSliderXWrap);

    var sliderYWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderYWrap.setStyleClass(ControlKit.CSS.GraphSliderYWrap);

    var sliderX = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderX.setStyleClass(ControlKit.CSS.GraphSliderX);

    var sliderY = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderY.setStyleClass(ControlKit.CSS.GraphSliderY);

    var sliderXHandle = this._sliderXHandle  = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderXHandle.setStyleClass(ControlKit.CSS.GraphSliderXHandle);

    var sliderYHandle = this._sliderYHandle = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderYHandle.setStyleClass(ControlKit.CSS.GraphSliderYHandle);

        sliderX.addChild(sliderXHandle);
        sliderY.addChild(sliderYHandle);
        sliderXWrap.addChild(sliderX);
        sliderYWrap.addChild(sliderY);

    var wrapNode = this._wrapNode;
        wrapNode.addChild(sliderXWrap);
        wrapNode.addChild(sliderYWrap);

    /*---------------------------------------------------------------------------------*/

    this._units       = [1,1];
    this._unitsMinMax = [0.15,8];

    this._scale       = 10.0;
    this._scaleMinMax = [0.02,50];

    this._center = [Math.round(width * 0.5),Math.round(width*0.5)];
    this._svgPos = [0,0];

    this._func = null;
    this.setFunction(this._object[this._key]);

    svg.addEventListener(ControlKit.DocumentEventType.MOUSE_DOWN,this._onDragStart.bind(this),false);
    this._wrapNode.getElement().addEventListener("mousewheel",   this._onScale.bind(this, false));

    /*---------------------------------------------------------------------------------*/

    var kit = ControlKit.getKitInstance();
        kit.addEventListener(ControlKit.EventType.UPDATE_VALUE,this,'onValueUpdate');
};

ControlKit.FunctionPlotter.prototype = Object.create(ControlKit.Plotter.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.FunctionPlotter.prototype._updateCenter = function()
{
    var svg    = this._svg,
        width  = Number(svg.getAttribute('width')),
        height = Number(svg.getAttribute('height'));

    var mousePos = ControlKit.Mouse.getInstance().getPosition(),
        svgPos   = this._svgPos,
        center   = this._center;

    center[0] = Math.max(0,Math.min(mousePos[0]-svgPos[0],width));
    center[1] = Math.max(0,Math.min(mousePos[1]-svgPos[1],height));

    this._plotGraph();
};

ControlKit.FunctionPlotter.prototype._onDragStart = function()
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

    var onDrag    = this._updateCenter.bind(this),
        onDragEnd = function()
                    {
                        this._updateCenter.bind(this)
                        document.removeEventListener(eventMove,onDrag,   false);
                        document.removeEventListener(eventUp,  onDragEnd,false);
                    }.bind(this);

    document.addEventListener(eventMove, onDrag,    false);
    document.addEventListener(eventUp,   onDragEnd, false);

    this._updateCenter();
};

ControlKit.FunctionPlotter.prototype._onScale = function(e)
{
    e = window.event || e;
    this._scale += Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) * -1;

    var scaleMinMax = this._scaleMinMax;
    this._scale = Math.max(scaleMinMax[0],Math.min(this._scale,scaleMinMax[1]));

    this._plotGraph();
};

/*---------------------------------------------------------------------------------*/

ControlKit.FunctionPlotter.prototype.onValueUpdate = function(){this.setFunction(this._object[this._key]);};
ControlKit.FunctionPlotter.prototype._redraw       = function(){this.setFunction(this._object[this._key]);};

ControlKit.FunctionPlotter.prototype.setFunction = function(func)
{
    this._func = func;
    this._plotGraph();
};

ControlKit.FunctionPlotter.prototype._plotGraph = function()
{
    this._drawGrid();
    this._drawAxes();
    this._drawPlot();
};

ControlKit.FunctionPlotter.prototype._drawAxes = function()
{
    var svg           = this._svg,
        svgWidth      = Number(svg.getAttribute('width')),
        svgHeight     = Number(svg.getAttribute('height'));

    var center  = this._center,
        centerX = center[0],
        centerY = center[1];

    var pathCmd = '';
        pathCmd += this._pathCmdLine(0,centerY,svgWidth,centerY);
        pathCmd += this._pathCmdLine(centerX,0,centerX,svgHeight);

    this._axes.setAttribute('d',pathCmd);
};

ControlKit.FunctionPlotter.prototype._drawPlot = function()
{
    var svg    = this._svg,
        width  = Number(svg.getAttribute('width')),
        height = Number(svg.getAttribute('height'));

    var center  = this._center,
        centerX = center[0],
        centerY = center[1];

    var scale = this._scale;
    var unit  = height / (this._units[1] * scale);

    var len    = Math.floor(width);
    var points = new Array(len * 2);

    var i = -1;
    var normval, value, index;
    var offsetX = centerX / width;

    while(++i < len)
    {
        normval =  (-offsetX + i / len) * scale;
        value   = centerY - this._func(normval) * unit;
        index   = i * 2;

        points[index]     = i;
        points[index + 1] = value;
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

ControlKit.Plotter.prototype._drawGrid = function()
{
    var svg    = this._svg,
        width  = Number(svg.getAttribute('width')),
        height = Number(svg.getAttribute('height'));

    var scale = this._scale;

    var gridRes      = this._units,
        gridSpacingX = width  / (gridRes[0] * scale),
        gridSpacingY = height / (gridRes[1] * scale);

    var center  = this._center,
        centerX = center[0],
        centerY = center[1];

    var gridNumTop    = Math.round(centerY / gridSpacingY),
        gridNumBottom = Math.round((height - centerY) / gridSpacingY) + 1,
        gridNumLeft   = Math.round(centerX / gridSpacingX),
        gridNumRight  = Math.round((width - centerX) / gridSpacingX) + 1;

    var pathCmd = '';

    var i,temp;

    i = -1;
    while(++i < gridNumTop)
    {
        temp = Math.round(centerY - gridSpacingY * i);
        pathCmd += this._pathCmdLine(0,temp,width,temp);
    }

    i = -1;
    while(++i < gridNumBottom)
    {
        temp = Math.round(centerY + gridSpacingY * i);
        pathCmd += this._pathCmdLine(0,temp,width,temp);
    }

    i = -1;
    while(++i < gridNumLeft)
    {
        temp = Math.round(centerX - gridSpacingX * i);
        pathCmd += this._pathCmdLine(temp,0,temp,height);
    }

    i = -1;
    while(++i < gridNumRight)
    {
        temp = Math.round(centerX + gridSpacingX * i);
        pathCmd += this._pathCmdLine(temp,0,temp,height);
    }


    this._grid.setAttribute('d',pathCmd);
};
