ControlKit.Picker = function(params)
{
    /*---------------------------------------------------------------------------------*/

    var rootNode = this._rootNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        headNode = this._headNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        lablWrap = new ControlKit.Node(ControlKit.NodeType.DIV),
        lablNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        menuNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV);

        rootNode.setStyleClass(ControlKit.CSS.Picker);
        headNode.setStyleClass(ControlKit.CSS.Head);
        lablWrap.setStyleClass(ControlKit.CSS.Wrap);
        lablNode.setStyleClass(ControlKit.CSS.Label);
        menuNode.setStyleClass(ControlKit.CSS.Menu);
        wrapNode.setStyleClass(ControlKit.CSS.Wrap);

    var menuClose = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
        menuClose.setStyleClass(ControlKit.CSS.MenuBtnClose);

    /*---------------------------------------------------------------------------------*/

    //var paletteWrap = new ControlKit.Node(ControlKit.NodeType.DIV),
    var fieldWrap   = new ControlKit.Node(ControlKit.NodeType.DIV),
        sliderWrap  = new ControlKit.Node(ControlKit.NodeType.DIV),
        inputWrap   = new ControlKit.Node(ControlKit.NodeType.DIV);

       // paletteWrap.setStyleClass(ControlKit.CSS.PalleteWrap);
        fieldWrap.setStyleClass(  ControlKit.CSS.FieldWrap);
        sliderWrap.setStyleClass( ControlKit.CSS.SliderWrap);
        inputWrap.setStyleClass(  ControlKit.CSS.InputWrap);

    /*---------------------------------------------------------------------------------*/

    var canvasField = this._canvasField = new ControlKit.Canvas(fieldWrap);
        canvasField.setAntialias(false);
        canvasField.setSize(154,154);

    var canvasSlider  = this._canvasSlider  = new ControlKit.Canvas(sliderWrap);
        canvasSlider.setAntialias(false);
        canvasSlider.setSize(14,154);

    var indiField  = this._indiField  = new ControlKit.Node(ControlKit.NodeType.DIV);
        indiField.setStyleClass(ControlKit.CSS.IndicatorField);

    var indiSlider = this._indiSlider = new ControlKit.Node(ControlKit.NodeType.DIV);
        indiSlider.setStyleClass(ControlKit.CSS.IndicatorSlider);

        fieldWrap.setEventListener(             ControlKit.NodeEventType.MOUSE_DOWN, this._onCanvasFieldMouseDown.bind(this));
        canvasField.getNode().setEventListener( ControlKit.NodeEventType.MOUSE_DOWN, this._onCanvasFieldMouseDown.bind(this));
        indiField.setEventListener(             ControlKit.NodeEventType.MOUSE_DOWN, this._onCanvasFieldMouseDown.bind(this));

        sliderWrap.setEventListener(            ControlKit.NodeEventType.MOUSE_DOWN, this._onCanvasSliderMouseDown.bind(this));
        canvasSlider.getNode().setEventListener(ControlKit.NodeEventType.MOUSE_DOWN, this._onCanvasSliderMouseDown.bind(this));
        indiSlider.setEventListener(            ControlKit.NodeEventType.MOUSE_DOWN, this._onCanvasSliderMouseDown.bind(this));

    /*---------------------------------------------------------------------------------*/

    var inputHue = this._inputHue = new ControlKit.NumberInput_Internal(1.0,0,null,this._onInputHueChange.bind(this),
                                                                                   this._onInputHueFinish.bind(this));

    var inputSat = this._inputSat = new ControlKit.NumberInput_Internal(1.0,0,null,this._onInputSatChange.bind(this),
                                                                                   this._onInputSatFinish.bind(this));

    var inputVal = this._inputVal = new ControlKit.NumberInput_Internal(1.0,0,null,this._onInputValChange.bind(this),
                                                                                   this._onInputValFinish.bind(this));

    var inputR   = this._inputR   = new ControlKit.NumberInput_Internal(1.0,0,null,this._onInputRChange.bind(this),
                                                                                   this._onInputRFinish.bind(this));

    var inputG   = this._inputG   = new ControlKit.NumberInput_Internal(1.0,0,null,this._onInputGChange.bind(this),
                                                                                   this._onInputGFinish.bind(this));

    var inputB   = this._inputB   = new ControlKit.NumberInput_Internal(1.0,0,null,this._onInputBChange.bind(this),
                                                                                   this._onInputBFinish.bind(this));

    var inputA   = this._inputA   = new ControlKit.NumberInput_Internal(1.0,0,null,this._onInputAChange.bind(this),
                                                                                   this._onInputAFinish.bind(this));



    //CLEAN UP, TABle

    var inputFieldWrapHue = new ControlKit.Node(ControlKit.NodeType.DIV),
        inputFieldWrapSat = new ControlKit.Node(ControlKit.NodeType.DIV),
        inputFieldWrapVal = new ControlKit.Node(ControlKit.NodeType.DIV);

        inputFieldWrapHue.setStyleClass(ControlKit.CSS.InputFieldWrap);
        inputFieldWrapSat.setStyleClass(ControlKit.CSS.InputFieldWrap);
        inputFieldWrapVal.setStyleClass(ControlKit.CSS.InputFieldWrap);

    var inputFieldWrapHueLabel = new ControlKit.Node(ControlKit.NodeType.SPAN),
        inputFieldWrapSatLabel = new ControlKit.Node(ControlKit.NodeType.SPAN),
        inputFieldWrapValLabel = new ControlKit.Node(ControlKit.NodeType.SPAN);

        inputFieldWrapHueLabel.setStyleClass(ControlKit.CSS.Label);
        inputFieldWrapSatLabel.setStyleClass(ControlKit.CSS.Label);
        inputFieldWrapValLabel.setStyleClass(ControlKit.CSS.Label);

        inputFieldWrapHueLabel.setProperty('innerHTML','H');
        inputFieldWrapSatLabel.setProperty('innerHTML','S');
        inputFieldWrapValLabel.setProperty('innerHTML','V');

        inputFieldWrapHue.addChild(inputFieldWrapHueLabel);
        inputFieldWrapHue.addChild(inputHue.getNode());
        inputFieldWrapSat.addChild(inputFieldWrapSatLabel);
        inputFieldWrapSat.addChild(inputSat.getNode());
        inputFieldWrapVal.addChild(inputFieldWrapValLabel);
        inputFieldWrapVal.addChild(inputVal.getNode());

    var inputFieldWrapR = new ControlKit.Node(ControlKit.NodeType.DIV),
        inputFieldWrapG = new ControlKit.Node(ControlKit.NodeType.DIV),
        inputFieldWrapB = new ControlKit.Node(ControlKit.NodeType.DIV),
        inputFieldWrapA = new ControlKit.Node(ControlKit.NodeType.DIV);

        inputFieldWrapR.setStyleClass(ControlKit.CSS.InputFieldWrap);
        inputFieldWrapG.setStyleClass(ControlKit.CSS.InputFieldWrap);
        inputFieldWrapB.setStyleClass(ControlKit.CSS.InputFieldWrap);
        inputFieldWrapA.setStyleClass(ControlKit.CSS.InputFieldWrap);

    var inputFieldWrapRLabel = new ControlKit.Node(ControlKit.NodeType.SPAN),
        inputFieldWrapGLabel = new ControlKit.Node(ControlKit.NodeType.SPAN),
        inputFieldWrapBLabel = new ControlKit.Node(ControlKit.NodeType.SPAN),
        inputFieldWrapALabel = new ControlKit.Node(ControlKit.NodeType.SPAN);

        inputFieldWrapRLabel.setStyleClass(ControlKit.CSS.Label);
        inputFieldWrapGLabel.setStyleClass(ControlKit.CSS.Label);
        inputFieldWrapBLabel.setStyleClass(ControlKit.CSS.Label);
        inputFieldWrapALabel.setStyleClass(ControlKit.CSS.Label);

        inputFieldWrapRLabel.setProperty('innerHTML','R');
        inputFieldWrapGLabel.setProperty('innerHTML','G');
        inputFieldWrapBLabel.setProperty('innerHTML','B');
        inputFieldWrapALabel.setProperty('innerHTML','A');

        inputFieldWrapR.addChild(inputFieldWrapRLabel);
        inputFieldWrapR.addChild(inputR.getNode());
        inputFieldWrapG.addChild(inputFieldWrapGLabel);
        inputFieldWrapG.addChild(inputG.getNode());
        inputFieldWrapB.addChild(inputFieldWrapBLabel);
        inputFieldWrapB.addChild(inputB.getNode());
        inputFieldWrapA.addChild(inputFieldWrapALabel);
        inputFieldWrapA.addChild(inputA.getNode());

        inputWrap.addChild(inputFieldWrapR);
        inputWrap.addChild(inputFieldWrapHue);
        inputWrap.addChild(inputFieldWrapG);
        inputWrap.addChild(inputFieldWrapSat);
        inputWrap.addChild(inputFieldWrapB);
        inputWrap.addChild(inputFieldWrapVal);
        inputWrap.addChild(inputFieldWrapA);

    var hexInputWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
        hexInputWrap.setStyleClass(ControlKit.CSS.InputWrap);

    var inputHEX               = this._inputHEX = new ControlKit.Node(ControlKit.NodeType.INPUT_TEXT);

    var inputFieldWrapHEX      = new ControlKit.Node(ControlKit.NodeType.DIV);
        inputFieldWrapHEX.setStyleClass(ControlKit.CSS.InputFieldWrap);

    var inputFieldWrapHEXLabel = new ControlKit.Node(ControlKit.NodeType.SPAN);
        inputFieldWrapHEXLabel.setStyleClass(ControlKit.CSS.Label);
        inputFieldWrapHEXLabel.setProperty('innerHTML','#');

        inputFieldWrapHEX.addChild(inputFieldWrapHEXLabel);
        inputFieldWrapHEX.addChild(inputHEX);

        hexInputWrap.addChild(inputFieldWrapHEX);

    /*---------------------------------------------------------------------------------*/

    var controlsWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
        controlsWrap.setStyleClass(ControlKit.CSS.ControlsWrap);

    var buttonCancel = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON),
        buttonPick   = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
        buttonCancel.setStyleClass(ControlKit.CSS.Button);
        buttonPick.setStyleClass(ControlKit.CSS.Button);
        buttonPick.setProperty('value','pick');
        buttonCancel.setProperty('value','cancel');

    controlsWrap.addChild(buttonCancel);
    controlsWrap.addChild(buttonPick);



    /*---------------------------------------------------------------------------------*/

        lablNode.setProperty('innerHTML','Color Picker');

        menuNode.addChild(menuClose);
        headNode.addChild(menuNode);
        lablWrap.addChild(lablNode);
        headNode.addChild(lablWrap);
        rootNode.addChild(headNode);
        rootNode.addChild(wrapNode);

        //wrapNode.addChild(paletteWrap);

        wrapNode.addChild(fieldWrap);
        wrapNode.addChild(sliderWrap);
        wrapNode.addChild(inputWrap);
        wrapNode.addChild(hexInputWrap);
        wrapNode.addChild(controlsWrap);

        fieldWrap.addChild( indiField);
        sliderWrap.addChild(indiSlider);

    /*---------------------------------------------------------------------------------*/

    this._mouseOffset = [0,0];
    this._position    = [0,0];
    headNode.setEventListener(ControlKit.NodeEventType.MOUSE_DOWN, this._onHeadDragStart.bind(this));

    this._imageDataSlider = this._canvasSlider.createImageData();
    this._imageDataField  = this._canvasField.createImageData();

    this._fieldFocused  = false;
    this._sliderFocused = false;

    this._colorMode = ControlKit.Picker.ColorModeType.HUE_MODE;


    this._valueHueMinMax = [0,360];
    this._valueSatMinMax = this._valueValMi = [0,100];
    this._valueRMinMax   = this._valueGMinMax = this._valueRMinMax = [0,255];

    this._valueHue = 0;
    this._valueSat = 0;
    this._valueVal = 0;
    this._valueR   = 0;
    this._valueG   = 0;
    this._valueB   = 0;
    this._valueA   = 0;
    this._valueHEX = '#000000';

    this._drawCanvasField();
    this._drawCanvasSlider();

    //for testing
    rootNode.setPositionGlobal(300,200);
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

        var valueHue  = this._valueHue;

        var i = -1, j;
        while(++i < height)
        {
            j = -1;

            while(++j < width)
            {
                rgb   = this._HSV2RGB(valueHue, j * invWidth * 100.0,( 1.0 - i * invHeight ) * 100.0);
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

    _onCanvasFieldMouseDown : function()
    {
        var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
            eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

        var self = this;

        var onDrag     = function()
                         {
                             self._drawIndicatorField();
                         },

            onDragEnd  = function()
                         {
                             document.removeEventListener(eventMouseMove, onDrag,    false);
                             document.removeEventListener(eventMouseUp,   onDragEnd, false);
                         };

        document.addEventListener(eventMouseMove, onDrag,    false);
        document.addEventListener(eventMouseUp,   onDragEnd, false);

        self._drawIndicatorField();
    },

    _drawIndicatorField : function()
    {
        var node       = this._canvasField.getNode(),
            nodePos    = node.getPositionGlobal(),
            mousePos   = ControlKit.Mouse.getInstance().getPosition();

        var indiNode = this._indiField,
            indiNodeWidth  = indiNode.getWidth(),
            indiNodeHeight = indiNode.getHeight();

        var padding = 3;

        var minX = -indiNodeWidth  * 0.5 + padding, maxX = node.getWidth()  - padding,
            minY = -indiNodeHeight * 0.5 + padding, maxY = node.getHeight() - padding;

        var offsetPosX = Math.max(minX,Math.min(mousePos[0] - nodePos[0] - indiNodeWidth  * 0.25,maxX)),
            offsetPosY = Math.max(minY,Math.min(mousePos[1] - nodePos[1] - indiNodeHeight * 0.25,maxY));

        this.setSaturation((offsetPosX - minX) / (maxX - minX) * 100.0);
        this.setValue(     ( 1.0 - (offsetPosY - minY) / (maxY - minY)) * 100.0);

        this._updateInputSat();
        this._updateInputVal();

        indiNode.setPositionGlobal(offsetPosX,offsetPosY);
    },

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

    _onCanvasSliderMouseDown : function()
    {
        var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
            eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

        var self = this;

        var onDrag     = function()
            {
                self._drawIndicatorSlider();
            },

            onDragEnd  = function()
            {
                document.removeEventListener(eventMouseMove, onDrag,    false);
                document.removeEventListener(eventMouseUp,   onDragEnd, false);
            };

        document.addEventListener(eventMouseMove, onDrag,    false);
        document.addEventListener(eventMouseUp,   onDragEnd, false);

        self._drawIndicatorSlider();
    },

    _drawIndicatorSlider : function()
    {
        var node       = this._canvasSlider.getNode(),
            nodePos    = node.getPositionGlobal(),
            mousePos   = ControlKit.Mouse.getInstance().getPosition();

        var indiNode = this._indiSlider,
            indiNodeWidth  = indiNode.getWidth(),
            indiNodeHeight = indiNode.getHeight();

        var padding = 1;

        var minY       = -indiNodeHeight*0.5 + 4,maxY = node.getHeight() - 2;
        var offsetPosY = Math.max(minY,Math.min(mousePos[1] - nodePos[1] - indiNodeHeight * 0.25,maxY));

        this.setHue(( 1.0 - (offsetPosY - minY) / (maxY - minY)) * 360.0);
        this._updateInputHue();

        indiNode.setPositionGlobalY(offsetPosY);

    },


    _RGB2HSV : function(){},

    setHue        : function(value)
    {
        value = Math.round(value);
        this._valueHue = value == 360.0 ? 0.0 : value;

        this._drawCanvasField();
    },

    setSaturation : function(value) {this._valueSat = Math.round(value);},
    setValue      : function(value) {this._valueVal = Math.round(value);},

    setR : function(value) {},
    setG : function(value) {},
    setB : function(value) {},


    _onHeadDragStart : function()
    {
        var node       = this._rootNode,
            parentNode = node.getParent();

        var nodePos    = node.getPositionGlobal(),
            mousePos   = ControlKit.Mouse.getInstance().getPosition(),
            offsetPos  = this._mouseOffset;

        offsetPos[0] = mousePos[0] - nodePos[0];
        offsetPos[1] = mousePos[1] - nodePos[1];

        var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
            eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

        var self = this;

        var onDrag = function()
                     {
                         self._updatePosition();
                     },

                     onDragEnd = function()
                     {
                         document.removeEventListener(eventMouseMove, onDrag,    false);
                         document.removeEventListener(eventMouseUp,   onDragEnd, false);
                     };

        parentNode.removeChild(node);
        parentNode.addChild(   node);

        document.addEventListener(eventMouseMove, onDrag,    false);
        document.addEventListener(eventMouseUp,   onDragEnd, false);
    },

    _updatePosition : function()
    {
        var mousePos  = ControlKit.Mouse.getInstance().getPosition(),
            offsetPos = this._mouseOffset;

        var currPositionX = mousePos[0] - offsetPos[0],
            currPositionY = mousePos[1] - offsetPos[1];

        var node     = this._rootNode,
            head     = this._headNode,
            position = this._position;

        var maxX = window.innerWidth  - node.getWidth(),
            maxY = window.innerHeight - head.getHeight();

        position[0] = Math.max(0,Math.min(currPositionX,maxX));
        position[1] = Math.max(0,Math.min(currPositionY,maxY));

        node.setPositionGlobal(position[0],position[1]);
    },

    _onInputHueChange : function(){},
    _onInputHueFinish : function(){},
    _onInputSatChange : function(){},
    _onInputSatFinish : function(){},
    _onInputValChange : function(){},
    _onInputValFinish : function(){},
    _onInputRChange   : function(){},
    _onInputRFinish   : function(){},
    _onInputGChange   : function(){},
    _onInputGFinish   : function(){},
    _onInputBChange   : function(){},
    _onInputBFinish   : function(){},
    _onInputAChange   : function(){},
    _onInputAFinish   : function(){},

    _updateInputHue : function(){this._inputHue.setValue(this._valueHue);},
    _updateInputSat : function(){this._inputSat.setValue(this._valueSat);},
    _updateInputVal : function(){this._inputVal.setValue(this._valueVal);},
    _updateInputR   : function(){this._inputR.setValue(this._inputR);},
    _updateInputG   : function(){this._inputG.setValue(this._inputG);},
    _updateInputB   : function(){this._inputB.setValue(this._inputB);},
    _updateInputA   : function(){this._inputA.setValue(this._inputA);},

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

    }
};

ControlKit.Picker.init        = function(){return ControlKit.Picker._instance = new ControlKit.Picker();};
ControlKit.Picker.getInstance = function(){return ControlKit.Picker._instance;};

ControlKit.Picker.ColorModeType =
{
    HUE_MODE        : 'hueMode',
    SATURATION_MODE : 'saturationMode',
    BRIGHTNESS_MODE : 'brightnessMode'
};