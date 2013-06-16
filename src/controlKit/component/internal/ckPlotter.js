ControlKit.Plotter = function(parent,object,value,params)
{
    ControlKit.SVGComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params            || {};
    params.gridRes    = params.gridRes    || [10,10];
    params.lineWidth  = params.lineWidth  || 2;
    params.lineColor  = params.lineColor  || [255,255,255];

    /*---------------------------------------------------------------------------------*/

    this._gridRes = params.gridRes;
    var lineWidth = this._lineWidth = params.lineWidth;
    var lineColor = params.lineColor;

    /*---------------------------------------------------------------------------------*/

    var grid = this._grid = this._svgRoot.appendChild(this._createSVGObject('path'));
        grid.style.stroke = 'rgb(26,29,31)';

    var path = this._path = this._svgRoot.appendChild(this._createSVGObject('path'));
        path.style.stroke      = 'rgb('+lineColor[0]+','+lineColor[1]+','+lineColor[2]+')';
        path.style.strokeWidth = lineWidth ;
        path.style.fill        = 'none';

};

ControlKit.Plotter.prototype = Object.create(ControlKit.SVGComponent.prototype);

ControlKit.Plotter.prototype._drawGrid = function()
{
    var svg = this._svg;

    var gridResX     = this._gridRes[0],
        gridResY     = this._gridRes[1],
        width        = Math.round(Number(svg.getAttribute('width'))),
        height       = Math.round(Number(svg.getAttribute('height')));

    var spacingGridX = width  / gridResX,
        spacingGridY = height / gridResY;

    var pathCmd = '';

    var temp;
    var i = -1;

    while(++i < gridResX)
    {
        temp = Math.round(spacingGridX + spacingGridX * i);
        pathCmd += this._pathCmdLine(0,temp,width,temp);
    }
    i = -1;
    while(++i < gridResY)
    {
        temp = Math.round(spacingGridY + spacingGridY * i);
        pathCmd += this._pathCmdLine(temp,0,temp,height);
    }

    this._grid.setAttribute('d',pathCmd);
};
