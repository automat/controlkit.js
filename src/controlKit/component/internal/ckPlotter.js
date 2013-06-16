ControlKit.Plotter = function(parent,object,value,params)
{
    ControlKit.SVGComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    params            = params            || {};
    params.lineWidth  = params.lineWidth  || 2;
    params.lineColor  = params.lineColor  || [255,255,255];

    /*---------------------------------------------------------------------------------*/

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

