ControlKit.SVGComponent = function(parent,object,value,params)
{
    ControlKit.ObjectComponent.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    var wrapNode = this._wrapNode;
        wrapNode.setStyleClass(ControlKit.CSS.CanvasWrap);
    var wrapSize = wrapNode.getWidth();

    var svg = this._svg = this._createSVGObject('svg');
        svg.setAttribute('version', '1.2');
        svg.setAttribute('baseProfile', 'tiny');
        svg.setAttribute('preserveAspectRatio','true');

        wrapNode.getElement().appendChild(svg);

    var svgRoot = this._svgRoot = svg.appendChild(this._createSVGObject('g'));
        svgRoot.setAttribute('transform','translate(0.5 0.5)');

    this._svgSetSize(wrapSize,wrapSize);
    this._updateHeight();

    /*---------------------------------------------------------------------------------*/

    this._node.setStyleClass(ControlKit.CSS.CanvasListItem);

    this._parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE, this, 'onGroupSizeChange');
    this.addEventListener(ControlKit.EventType.GROUP_SIZE_UPDATE, this._parent, 'onGroupSizeUpdate');
};

ControlKit.SVGComponent.prototype = Object.create(ControlKit.ObjectComponent.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.SVGComponent.prototype._updateHeight = function()
{
    var svgHeight = Number(this._svg.getAttribute('height'));

    this._wrapNode.setHeight(svgHeight);
    this._node.setHeight(svgHeight + ControlKit.Constant.PADDING_WRAPPER);
};

ControlKit.SVGComponent.prototype._redraw = function(){};

ControlKit.SVGComponent.prototype.onGroupSizeChange = function()
{
    var width = this._wrapNode.getWidth();

    this._svgSetSize(width,width);
    this._updateHeight();
    this._redraw();
};

/*---------------------------------------------------------------------------------*/

ControlKit.SVGComponent.prototype._createSVGObject = function(type)
{
    return document.createElementNS("http://www.w3.org/2000/svg",type);
};

ControlKit.SVGComponent.prototype._svgSetSize = function(width,height)
{
    var svg = this._svg;
        svg.setAttribute('width',  width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewbox', '0 0 ' + width + ' ' + height);
};

/*---------------------------------------------------------------------------------*/

ControlKit.SVGComponent.prototype._pathCmdMoveTo          = function(x,y){return 'M ' + x + ' ' + y + ' ';};
ControlKit.SVGComponent.prototype._pathCmdLineTo          = function(x,y){return 'L ' + x + ' ' + y + ' ';};
ControlKit.SVGComponent.prototype._pathCmdClose           = function()   {return 'Z';};
ControlKit.SVGComponent.prototype._pathCmdLine            = function(x0,y0,x1,y1){return 'M ' + x0 + ' ' + y0 + ' L ' + x1 + ' ' + y1; };
ControlKit.SVGComponent.prototype._pathCmdBezierCubic     = function(cmd,x0,y0,cx0,cy0,cx1,cy1,x1,y1){return 'M ' + x0 + ' ' + y0 + ' C ' + cx0 + ' ' + cy0 + ', ' + cx1 + ' ' + cy1 + ', ' + x1 + ' ' + y1;};
ControlKit.SVGComponent.prototype._pathCmdBezierQuadratic = function(cmd,x0,y0,cx,cy,x1,y1)          {return 'M ' + x0 + ' '+ y0 + ' Q ' + cx + ' ' + cy + ', ' + x1 + ' ' + y1;};
