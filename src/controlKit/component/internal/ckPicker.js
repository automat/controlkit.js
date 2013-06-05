ControlKit.Picker = function(params)
{
    /*---------------------------------------------------------------------------------*/

    var node = this._rootNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        head = new ControlKit.Node(ControlKit.NodeType.DIV),
        labl = new ControlKit.Node(ControlKit.NodeType.DIV),
        wrap = new ControlKit.Node(ControlKit.NodeType.DIV);

        node.setStyleClass(ControlKit.CSS.Picker);
        head.setStyleClass(ControlKit.CSS.Head);
        labl.setStyleClass(ControlKit.CSS.Label);
        wrap.setStyleClass(ControlKit.CSS.Wrap);

    /*---------------------------------------------------------------------------------*/

    var fieldWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
        fieldWrap.setStyleClass(ControlKit.CSS.PalleteWrap);

    var fieldWrapInner = new ControlKit.Node(ControlKit.NodeType.DIV);
        fieldWrapInner.setStyleClass(ControlKit.CSS.PaletteWrapInner);

    var sliderWrapInner  = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderWrapInner.setStyleClass(ControlKit.CSS.PaletteWrapInner);

    /*---------------------------------------------------------------------------------*/

    labl.setProperty('innerHTML','Color Picker');

    head.addChild(labl);
    node.addChild(head);
    node.addChild(wrap);

    wrap.addChild(fieldWrap);
    fieldWrap.addChild(fieldWrapInner);
    fieldWrap.addChild(sliderWrapInner);

    /*---------------------------------------------------------------------------------*/

    var canvasField = this._canvasField = new ControlKit.Canvas(fieldWrapInner);
        canvasField.setAntialias(false);
        canvasField.setSize(154,154);


    var canvasSlider  = this._canvasSlider  = new ControlKit.Canvas(sliderWrapInner);
        canvasSlider.setAntialias(false);
        canvasSlider.setSize(20,154);

    /*---------------------------------------------------------------------------------*/

    this._imageDataSlider = this._canvasSlider.createImageData();
    this._imageDataField  = this._canvasField.createImageData();

    this._colorMode = ControlKit.Picker.ColorModeType.HUE_MODE;

    this._valueHue = 0;
    this._valueSat = 0;
    this._valueVal = 0;
    this._valueR   = 0;
    this._valueG   = 0;
    this._valueB   = 0;
    this._valueA   = 0;

    this._drawCanvasField();
    this._drawCanvasSlider();

    //for testing
    node.setPositionGlobal(300,200);
};

ControlKit.Picker.prototype =
{
    getNode : function(){return this._rootNode;},

    _drawCanvasField : function()
    {
        var c = this._canvasField;

        var width     = c.width,
            height    = c.height,
            invWidth  = 1 / width,
            invHeight = 1 / height;

        var imageData = this._imageDataField,
            rgb       = [],
            index     = 0;

        var valueHue  = this._valueHue,
            valueSat  = this._valueSat,
            valueVal  = this._valueVal;

        var i = -1, j;
        while(++i < height)
        {
            j = -1;

        }

        c.clear();
        c.putImageData(imageData,0,0);

    },

    _drawIndicatorField : function(){},

    _drawCanvasSlider : function()
    {
        var c = this._canvasSlider;

        var width     = c.width,
            height    = c.height,
            invHeight = 1 / height;

        var imageData = this._imageDataSlider,
            rgb       = [],
            index     = 0;

        var i = -1,j;
        while(++i < height)
        {
            j = -1;

            while(++j < width)
            {
                rgb   = this._HSV2RGB( (1.0 - i * invHeight) * 360.0,100.0,100.0);
                index = (i * width + j) * 4;

                imageData.data[index  ] = rgb[0];
                imageData.data[index+1] = rgb[1];
                imageData.data[index+2] = rgb[2];
                imageData.data[index+3] = 255;
            }
        }

        c.clear();
        c.putImageData(imageData,0,0);
    },

    _drawIndicatorSlider : function(){},

    _HSV2RGB : function(hue,sat,val)
    {
        var max_hue = 360.0,
            max_sat = 100.0,
            max_val = 100.0;

        var min_hue = 0.0,
            min_sat = 0.0,
            min_val = 0.0;

        hue = hue % max_hue;
        val = Math.max(min_val,Math.min(val,max_val))/max_val * 255.0;

        if(sat <= min_sat){val = Math.round(val);return[val,val,val];}
        else if(sat > max_sat)sat = max_sat;

        sat = sat/max_sat;

        //http://d.hatena.ne.jp/ja9/20100903/128350434

        var hi = Math.floor(hue/60.0)% 6,
            f  = (hue/60.0) - hi,
            p  = val * (1 - sat),
            q  = val * (1 - f * sat),
            t  = val * (1 - (1 - f) * sat);

        var r = 0,
            g = 0,
            b = 0;

        switch(hi)
        {
            case 0:
                r = val; g = t; b = p;
                break;
            case 1:
                r = q; g = val; b = p;
                break;
            case 2:
                r = p; g = val; b = t;
                break;
            case 3:
                r = p; g = q; b = val;
                break;
            case 4:
                r = t; g = p; b = val;
                break;
            case 5:
                r = val; g = p; b = q;
                break;
            default:
                break;
        }

        return [r,g,b];

    },

    _RGB2HSV : function(){},



    setHue        : function(value) {},
    setSaturation : function(value) {},
    setValue      : function(value) {},

    setR : function(value) {},
    setG : function(value) {},
    setB : function(value) {}
};



ControlKit.Picker.init        = function(){return ControlKit.Picker._instance = new ControlKit.Picker();};
ControlKit.Picker.getInstance = function(){return ControlKit.Picker._instance;};

ControlKit.Picker.ColorModeType =
{
    HUE_MODE        : 'hueMode',
    SATURATION_MODE : 'saturationMode',
    BRIGHTNESS_MODE : 'brightnessMode'

}