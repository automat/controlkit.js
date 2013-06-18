ControlKit.SVG = function(parent,params)
{
    ControlKit.Component.apply(this,arguments);

    /*---------------------------------------------------------------------------------*/

    var wrapNode = this._wrapNode;
    wrapNode.setStyleClass(ControlKit.CSS.CanvasWrap);
    var wrapSize = wrapNode.getWidth();


    var svg = this._svg = this._createSVGObject('svg');
    svg.setAttribute('version', '1.2');
    svg.setAttribute('baseProfile', 'tiny');
    svg.setAttribute('preserveAspectRatio','true');

    wrapNode.getElement().appendChild(svg);

    this._svgSetSize(wrapSize,wrapSize);
    this._updateHeight();

    /*---------------------------------------------------------------------------------*/

    this._node.setStyleClass(ControlKit.CSS.CanvasListItem);

    this._parent.addEventListener(ControlKit.EventType.GROUP_SIZE_CHANGE, this, 'onGroupSizeChange');
    this.addEventListener(ControlKit.EventType.GROUP_SIZE_UPDATE, this._parent, 'onGroupSizeUpdate');
};

ControlKit.Component.prototype = Object.create(ControlKit.Component.prototype);

/*---------------------------------------------------------------------------------*/

ControlKit.SVG.prototype._updateHeight = function()
{
    var svgHeight = Number(this._svg.getAttribute('height'));

    this._wrapNode.setHeight(svgHeight);
    this._node.setHeight(svgHeight + ControlKit.Metric.PADDING_WRAPPER);
};

ControlKit.SVG.prototype.onGroupSizeChange = function()
{
    var width = this._wrapNode.getWidth();

    this._svgSetSize(width,width);
    this._updateHeight();
};

/*---------------------------------------------------------------------------------*/

ControlKit.SVG.prototype._svgSetSize = function(width,height)
{
    var svg = this._svg;
    svg.setAttribute('width',  width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewbox', '0 0 ' + width + ' ' + height);
};

ControlKit.SVG.prototype.getSVG = function(){return this._svg;};