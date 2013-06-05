ControlKit.Picker = function()
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

    var paletteWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
        paletteWrap.setStyleClass(ControlKit.CSS.PalleteWrap);

    var paletteWrapInner = new ControlKit.Node(ControlKit.NodeType.DIV);
        paletteWrapInner.setStyleClass(ControlKit.CSS.PaletteWrapInner);

    var sliderWrapInner  = new ControlKit.Node(ControlKit.NodeType.DIV);
        sliderWrapInner.setStyleClass(ControlKit.CSS.PaletteWrapInner);

    /*---------------------------------------------------------------------------------*/

    var paletteCanvas = this._paletteCanvas = new ControlKit.Canvas(paletteWrapInner);
        paletteCanvas.setAntialias(false);
        paletteCanvas.setSize(154,154);


    var sliderCanvas  = this._sliderCanvas  = new ControlKit.Canvas(sliderWrapInner);
        sliderCanvas.setAntialias(false);
        sliderCanvas.setSize(24,154);

    /*---------------------------------------------------------------------------------*/

    labl.setProperty('innerHTML','Color Picker');

    head.addChild(labl);
    node.addChild(head);
    node.addChild(wrap);

    wrap.addChild(paletteWrap);
    paletteWrap.addChild(paletteWrapInner);
    paletteWrap.addChild(sliderWrapInner);

    /*---------------------------------------------------------------------------------*/

    this._colorMode = ControlKit.Picker.ColorModeType.HUE_MODE;

    this._drawPalette();
    this._drawSlider();

    //for testing
    node.setPositionGlobal(300,200);
};

ControlKit.Picker.prototype =
{
    getNode : function(){return this._rootNode;},

    _drawPalette : function()
    {
        var c = this._paletteCanvas;

        var width  = c.width,
            height = c.height;

        c.clear();
        c.noStroke();
        c.push();
        {
            c.translateHalfFloat();
            c.fill(255);
            c.rect(0,0,width,height);



        }
        c.pop();
    },

    _drawSlider : function()
    {
        var c = this._sliderCanvas;

        var width  = c.width,
            height = c.height;

        c.clear();

        var imageData = c.createImageData();

        /*
        c.noStroke();
        c.push();
        {
            c.translateHalfFloat();
            c.fill(255);
            c.rect(0,0,width,height);
        }
        c.pop();
        */
    },

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