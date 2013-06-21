ControlKit.FunctionPlotter = function(parent,object,value,params)
{
    ControlKit.Plotter.apply(this,arguments);

    if(!ControlKit.ErrorUtil.TypeError(object,value,Function))
    {
        throw new TypeError(ControlKit.Error.COMPONENT_OBJECT +
                            object.constructor.name + ' ' +
                            value +
                            ControlKit.Error.TYPE +
                            'Function');
    }

    var funcArgLength = object[value].length;

    if(funcArgLength > 2 || funcArgLength == 0)
    {
        throw new Error(ControlKit.Error.COMPONENT_FUNCTION_LENGTH);
    }

    /*---------------------------------------------------------------------------------*/

    params = params || {};

    /*---------------------------------------------------------------------------------*/

    var svgRoot = this._svgRoot,
        path    = this._path;

    var axes = this._axes = svgRoot.insertBefore(this._createSVGObject('path'),path);
        axes.style.stroke = 'rgb(54,60,64)';
        axes.style.lineWidth = 1;

    var axesLabels = this._axesLabels = svgRoot.insertBefore(this._createSVGObject('path'),path);
        axesLabels.style.stroke = 'rgb(43,48,51)';
        axesLabels.style.lineWidth = 1;

    var svg    = this._svg,
        width  = Number(svg.getAttribute('width')),
        height = Number(svg.getAttribute('height'));

    var sliderXWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderXWrap.setStyleClass(ControlKit.CSS.GraphSliderXWrap);

    var sliderYWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderYWrap.setStyleClass(ControlKit.CSS.GraphSliderYWrap);

    var sliderXTrack = this._sliderXTrack = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderXTrack.setStyleClass(ControlKit.CSS.GraphSliderX);

    var sliderYTrack = this._sliderYTrack = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderYTrack.setStyleClass(ControlKit.CSS.GraphSliderY);

    var sliderXHandle = this._sliderXHandle  = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderXHandle.setStyleClass(ControlKit.CSS.GraphSliderXHandle);

    var sliderYHandle = this._sliderYHandle = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderYHandle.setStyleClass(ControlKit.CSS.GraphSliderYHandle);

        sliderXTrack.addChild(sliderXHandle);
        sliderYTrack.addChild(sliderYHandle);
        sliderXWrap.addChild(sliderXTrack);
        sliderYWrap.addChild(sliderYTrack);

    var wrapNode = this._wrapNode;

    var plotMode = this._plotMode = funcArgLength == 1 ?
                                    ControlKit.FunctionPlotType.NON_IMPLICIT :
                                    ControlKit.FunctionPlotType.IMPLICIT;

    if(plotMode == ControlKit.FunctionPlotType.IMPLICIT)
    {
        var canvas = this._canvas = document.createElement('canvas');
            canvas.style.width  = canvas.style.height =  width  + 'px';
            canvas.width        = canvas.height = width;

        var canvasContext = this._canvasContext   = canvas.getContext('2d');
        this._canvasImageData = canvasContext.getImageData(0,0,width,height);

        wrapNode.getElement().insertBefore(canvas,svg);

        this._grid.style.stroke = 'rgba(25,25,25,0.25)';

    }
    else
    {
        this._grid.style.stroke = 'rgb(25,25,25)';
    }

        wrapNode.addChild(sliderXWrap);
        wrapNode.addChild(sliderYWrap);

        sliderXHandle.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onSliderXHandleDown.bind(this));
        sliderYHandle.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN,this._onSliderYHandleDown.bind(this));

    /*---------------------------------------------------------------------------------*/

    this._units       = [ControlKit.Preset.FUNCTION_PLOTTER_UNIT_X,
                         ControlKit.Preset.FUNCTION_PLOTTER_UNIT_Y];
    this._unitsMinMax = [ControlKit.Preset.FUNCTION_PLOTTER_UNIT_MIN,
                         ControlKit.Preset.FUNCTION_PLOTTER_UNIT_MAX]; //1/8->4

    this._scale       =  ControlKit.Preset.FUNCTION_PLOTTER_SCALE;
    this._scaleMinMax = [ControlKit.Preset.FUNCTION_PLOTTER_SCALE_MIN,
                         ControlKit.Preset.FUNCTION_PLOTTER_SCALE_MAX]; //1/50 -> 25

    /*---------------------------------------------------------------------------------*/

    this._center = [Math.round(width * 0.5),
                    Math.round(width * 0.5)];
    this._svgPos = [0,0];

    this._func = null;
    this.setFunction(this._object[this._key]);

    this._setSliderInitial();

    /*---------------------------------------------------------------------------------*/

    svg.addEventListener(ControlKit.DocumentEventType.MOUSE_DOWN,this._onDragStart.bind(this),false);
    this._wrapNode.getElement().addEventListener("mousewheel",   this._onScale.bind(this, false));

    ControlKit.getKitInstance().addEventListener(ControlKit.EventType.UPDATE_VALUE,this,'onValueUpdate');
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

ControlKit.FunctionPlotter.prototype._onDragStart = function(e)
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
            this._updateCenter.bind(this);
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
ControlKit.FunctionPlotter.prototype._redraw       = function()
{
    if(this._plotMode == ControlKit.FunctionPlotType.IMPLICIT)
    {
        var size  = this._wrapNode.getWidth(),
            canvas = this._canvas;

            canvas.style.width  = canvas.style.height =  size  + 'px';
            canvas.width        = canvas.height = size;

        this._canvasImageData = this._canvasContext.getImageData(0,0,size,size);

    }

    this.setFunction(this._object[this._key]);
};

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
    var width,height;

    var center  = this._center,
        centerX = center[0],
        centerY = center[1];

    var units = this._units,
        unitX,unitY;

    var scale = this._scale;

    var normval, value, index;
    var offsetX;

    var i;

    if(this._plotMode == ControlKit.FunctionPlotType.NON_IMPLICIT)
    {
        var svg    = this._svg;

        width  = Number(svg.getAttribute('width'));
        height = Number(svg.getAttribute('height'));

        unitX = units[0]  * scale;
        unitY = height / (units[1] * scale);

        offsetX = centerX / width;

        var len    = Math.floor(width),
            points = new Array(len * 2);

        i = -1;
        while(++i < len)
        {
            normval = (-offsetX + i / len) * unitX;
            value   = centerY - this._func(normval) * unitY;
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
    }
    else
    {
        var canvas  = this._canvas,
            context = this._canvasContext,
            imgData = this._canvasImageData;

        width     = canvas.width;
        height    = canvas.height;

        unitX = units[0] * scale;
        unitY = units[1] * scale;


        offsetX = centerX / width;
        var offsetY = centerY / height;

        var invWidth  = 1 / width,
            invHeight = 1 / height;
        var rgb       = [0,0,0];

        var col0 = [30,34,36],
            col1 = [255,255,255];

        i = -1;
        var j;
        while(++i < height)
        {
            j = -1;

            while(++j < width)
            {
                value    = this._func((-offsetX + j * invWidth) * unitX,
                                      (-offsetY + i * invHeight)* unitY);

                rgb[0] = floor((col1[0]-col0[0])*value + col0[0]);
                rgb[1] = floor((col1[1]-col0[1])*value + col0[1]);
                rgb[2] = floor((col1[2]-col0[2])*value + col0[2]);

                index = (i * width + j) * 4;

                imgData.data[index  ] = rgb[0];
                imgData.data[index+1] = rgb[1];
                imgData.data[index+2] = rgb[2];
                imgData.data[index+3] = 255;
            }

        }
        context.putImageData(imgData,0,0);
    }
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

    var gridNumTop    = Math.round(centerY / gridSpacingY) + 1,
        gridNumBottom = Math.round((height - centerY) / gridSpacingY) + 1,
        gridNumLeft   = Math.round(centerX / gridSpacingX) + 1,
        gridNumRight  = Math.round((width - centerX) / gridSpacingX) + 1;

    var pathCmdGrid       = '',
        pathCmdAxesLabels = '';

    var i,temp;

    var strokeSize = ControlKit.Metric.STROKE_SIZE;

    var labelTickSize                = ControlKit.Metric.FUNCTION_PLOTTER_LABEL_TICK_SIZE,
        labelTickPaddingRight        = width  - labelTickSize - strokeSize,
        labelTickPaddingBottom       = height - labelTickSize - strokeSize,
        labelTickPaddingRightOffset  = labelTickPaddingRight  - labelTickSize,
        labelTickPaddingBottomOffset = labelTickPaddingBottom - labelTickSize,
        labelTickOffsetRight         = labelTickPaddingRight  - (labelTickSize + strokeSize) * 2,
        labelTickOffsetBottom        = labelTickPaddingBottom - (labelTickSize + strokeSize) * 2;

    i = -1;
    while(++i < gridNumTop)
    {
        temp = Math.round(centerY - gridSpacingY * i);
        pathCmdGrid += this._pathCmdLine(0,temp,width,temp);

        if(temp > labelTickSize)
        pathCmdAxesLabels += this._pathCmdLine(labelTickPaddingRight,      temp,
                                               labelTickPaddingRightOffset,temp);
    }

    i = -1;
    while(++i < gridNumBottom)
    {
        temp = Math.round(centerY + gridSpacingY * i);
        pathCmdGrid += this._pathCmdLine(0,temp,width,temp);

        if(temp < labelTickOffsetBottom)
        pathCmdAxesLabels += this._pathCmdLine(labelTickPaddingRight,      temp,
                                               labelTickPaddingRightOffset,temp);
    }

    i = -1;
    while(++i < gridNumLeft)
    {
        temp = Math.round(centerX - gridSpacingX * i);
        pathCmdGrid += this._pathCmdLine(temp,0,temp,height);

        if(temp > labelTickSize)
        pathCmdAxesLabels += this._pathCmdLine(temp, labelTickPaddingBottom,
                                               temp, labelTickPaddingBottomOffset);
    }

    i = -1;
    while(++i < gridNumRight)
    {
        temp = Math.round(centerX + gridSpacingX * i);
        pathCmdGrid += this._pathCmdLine(temp,0,temp,height);

        if(temp < labelTickOffsetRight)
        pathCmdAxesLabels += this._pathCmdLine(temp, labelTickPaddingBottom,
                                               temp, labelTickPaddingBottomOffset);
    }


    this._grid.setAttribute('d',pathCmdGrid);
    this._axesLabels.setAttribute('d',pathCmdAxesLabels);
};

/*---------------------------------------------------------------------------------*/

ControlKit.FunctionPlotter.prototype._sliderXStep = function(mousePos)
{
    var mouseX = mousePos[0];

    var handle          = this._sliderXHandle,
        handleWidth     = handle.getWidth(),
        handleWidthHalf = handleWidth * 0.5;

    var track       = this._sliderXTrack,
        trackWidth  = track.getWidth(),
        trackLeft   = track.getPositionGlobalX();

    var strokeSize = ControlKit.Metric.STROKE_SIZE;

    var max = trackWidth - handleWidthHalf - strokeSize * 2;

    var pos       = Math.max(handleWidthHalf,Math.min(mouseX - trackLeft,max)),
        handlePos = pos - handleWidthHalf;

    handle.setPositionX(handlePos);

    var unitsMin = this._unitsMinMax[0],
        unitsMax = this._unitsMinMax[1];

    var normVal   = (pos - handleWidthHalf) / (max - handleWidthHalf),
        mappedVal = unitsMin + (unitsMax  - unitsMin) * normVal;

    this._units[0] = mappedVal;

    this._plotGraph();
};


//FIXME
ControlKit.FunctionPlotter.prototype._setSliderInitial = function()
{
    var unitMin = this._unitsMinMax[0],
        unitMax = this._unitsMinMax[1];

    var unitX = this._units[0],
        unitY = this._units[1];

    var handleX           = this._sliderXHandle,
        handleXWidth      = handleX.getWidth(),
        handleXWidthHalf  = handleXWidth * 0.5,
        trackXWidth       = this._sliderXTrack.getWidth();

    var handleY           = this._sliderYHandle,
        handleYHeight     = handleY.getHeight(),
        handleYHeightHalf = handleYHeight * 0.5,
        trackYHeight      = this._sliderYTrack.getHeight();

    var strokeSize = ControlKit.Preset.STROKE_SIZE;

    var handleXMin = handleXWidthHalf,
        handleXMax = trackXWidth  - handleXWidthHalf  - strokeSize * 2,
        handleYMin = trackYHeight - handleYHeightHalf - strokeSize * 2,
        handleYMax = handleYHeightHalf;

    handleX.setPositionX((handleXMin + (handleXMax - handleXMin) * ((unitX - unitMin) / (unitMax - unitMin))) - handleXWidthHalf);
    handleY.setPositionY((handleYMin + (handleYMax - handleYMin) * ((unitY - unitMin) / (unitMax - unitMin))) - handleYHeightHalf);

};

ControlKit.FunctionPlotter.prototype._sliderYStep = function(mousePos)
{
    var mouseY = mousePos[1];

    var handle = this._sliderYHandle,
        handleHeight = handle.getHeight(),
        handleHeightHalf = handleHeight * 0.5;

    var track = this._sliderYTrack,
        trackHeight = track.getHeight(),
        trackTop    = track.getPositionGlobalY();

    var max = trackHeight -  handleHeightHalf - 2;

    var pos       = Math.max(handleHeightHalf,Math.min(mouseY - trackTop,max)),
        handlePos = pos - handleHeightHalf;

    handle.setPositionY(handlePos);

    var unitsMax = this._unitsMinMax[0],
        unitsMin = this._unitsMinMax[1];

    var normVal = (pos - handleHeightHalf) / (max - handleHeightHalf),
        mappedVal = unitsMin + (unitsMax - unitsMin) * normVal;

    this._units[1] = mappedVal;

    this._plotGraph();
};

ControlKit.FunctionPlotter.prototype._onSliderXHandleDown = function()
{
    this._onSliderHandleDown(this._sliderXStep.bind(this));
};

ControlKit.FunctionPlotter.prototype._onSliderYHandleDown = function()
{
    this._onSliderHandleDown(this._sliderYStep.bind(this));
};

ControlKit.FunctionPlotter.prototype._onSliderHandleDown = function(sliderStepFunc)
{
    var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
        eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

    var mouse = ControlKit.Mouse.getInstance();

    var onDrag    = function(){sliderStepFunc(mouse.getPosition())},
        onDragEnd = function()
        {
            document.removeEventListener(eventMouseMove,onDrag,    false);
            document.removeEventListener(eventMouseUp,  onDragEnd, false);
        };

    sliderStepFunc(mouse.getPosition());
    document.addEventListener(eventMouseMove, onDrag,    false);
    document.addEventListener(eventMouseUp,   onDragEnd, false);
};
