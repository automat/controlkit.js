ControlKit.Picker = function(parentNode)
{
    var rootNode = this._node     = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Picker),
        headNode = this._headNode = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Head),
        lablWrap = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Wrap),
        lablNode = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Label),
        menuNode = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Menu),
        wrapNode = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.Wrap);

    var menuClose = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON);
        menuClose.setStyleClass(ControlKit.CSS.MenuBtnClose);

    /*---------------------------------------------------------------------------------*/

    var fieldWrap  = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass( ControlKit.CSS.PickerFieldWrap),
        sliderWrap = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.SliderWrap),
        inputWrap  = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass( ControlKit.CSS.PickerInputWrap);

    /*---------------------------------------------------------------------------------*/

    var canvasField  = this._canvasField  = document.createElement('canvas'),
        canvasSlider = this._canvasSlider = document.createElement('Canvas');

        fieldWrap.getElement().appendChild(canvasField);
        sliderWrap.getElement().appendChild(canvasSlider);

        this._setSizeCanvasField(154,154);
        this._setSizeCanvasSlider(14,154);

    var contextCanvasField  = this._contextCanvasField  = canvasField.getContext('2d'),
        contextCanvasSlider = this._contextCanvasSlider = canvasSlider.getContext('2d');

    var handleField  = this._handleField  = new ControlKit.Node(ControlKit.NodeType.DIV);
        handleField.setStyleClass(ControlKit.CSS.PickerHandleField);

    var handleSlider = this._handleSlider = new ControlKit.Node(ControlKit.NodeType.DIV);
        handleSlider.setStyleClass(ControlKit.CSS.PickerHandleSlider);

    /*---------------------------------------------------------------------------------*/

    var step = 1.0,
        dp   = 0;

    var callbackHue = this._onInputHueChange.bind(this),
        callbackSat = this._onInputSatChange.bind(this),
        callbackVal = this._onInputValChange.bind(this),
        callbackR   = this._onInputRChange.bind(this),
        callbackG   = this._onInputGChange.bind(this),
        callbackB   = this._onInputBChange.bind(this);


    var inputHue = this._inputHue = new ControlKit.NumberInput_Internal(step,dp,null,callbackHue,callbackHue),
        inputSat = this._inputSat = new ControlKit.NumberInput_Internal(step,dp,null,callbackSat,callbackSat),
        inputVal = this._inputVal = new ControlKit.NumberInput_Internal(step,dp,null,callbackVal,callbackVal),
        inputR   = this._inputR   = new ControlKit.NumberInput_Internal(step,dp,null,callbackR,callbackR),
        inputG   = this._inputG   = new ControlKit.NumberInput_Internal(step,dp,null,callbackG,callbackG),
        inputB   = this._inputB   = new ControlKit.NumberInput_Internal(step,dp,null,callbackB,callbackB);

    /*---------------------------------------------------------------------------------*/

    var controlsWrap = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerControlsWrap);

    var buttonPick   = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON).setStyleClass(ControlKit.CSS.Button).setProperty('value','pick'),
        buttonCancel = new ControlKit.Node(ControlKit.NodeType.INPUT_BUTTON).setStyleClass(ControlKit.CSS.Button).setProperty('value','cancel');


    var colorContrast = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerColorContrast);

    var color0 = this._colorCurrNode = new ControlKit.Node(ControlKit.NodeType.DIV),
        color1 = this._colorPrevNode = new ControlKit.Node(ControlKit.NodeType.DIV);

    colorContrast.addChild(color0);
    colorContrast.addChild(color1);

    controlsWrap.addChild(buttonCancel);
    controlsWrap.addChild(buttonPick);
    controlsWrap.addChild(colorContrast);

    this._setContrasPrevColor(0,0,0);

    /*---------------------------------------------------------------------------------*/

    //CLEAN UP, TABle

    var inputFieldWrapHue = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerInputField),
        inputFieldWrapSat = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerInputField),
        inputFieldWrapVal = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerInputField);

    var inputFieldWrapHueLabel = new ControlKit.Node(ControlKit.NodeType.SPAN).setStyleClass(ControlKit.CSS.Label).setProperty('innerHTML','H'),
        inputFieldWrapSatLabel = new ControlKit.Node(ControlKit.NodeType.SPAN).setStyleClass(ControlKit.CSS.Label).setProperty('innerHTML','S'),
        inputFieldWrapValLabel = new ControlKit.Node(ControlKit.NodeType.SPAN).setStyleClass(ControlKit.CSS.Label).setProperty('innerHTML','V');

        inputFieldWrapHue.addChildren(inputFieldWrapHueLabel,inputHue.getNode());
        inputFieldWrapSat.addChildren(inputFieldWrapSatLabel,inputSat.getNode());
        inputFieldWrapVal.addChildren(inputFieldWrapValLabel,inputVal.getNode());

    var inputFieldWrapR = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerInputField),
        inputFieldWrapG = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerInputField),
        inputFieldWrapB = new ControlKit.Node(ControlKit.NodeType.DIV).setStyleClass(ControlKit.CSS.PickerInputField);

    var inputFieldWrapRLabel = new ControlKit.Node(ControlKit.NodeType.SPAN).setStyleClass(ControlKit.CSS.Label).setProperty('innerHTML','R'),
        inputFieldWrapGLabel = new ControlKit.Node(ControlKit.NodeType.SPAN).setStyleClass(ControlKit.CSS.Label).setProperty('innerHTML','G'),
        inputFieldWrapBLabel = new ControlKit.Node(ControlKit.NodeType.SPAN).setStyleClass(ControlKit.CSS.Label).setProperty('innerHTML','B');

        inputFieldWrapR.addChildren(inputFieldWrapRLabel,inputR.getNode());
        inputFieldWrapG.addChildren(inputFieldWrapGLabel,inputG.getNode());
        inputFieldWrapB.addChildren(inputFieldWrapBLabel,inputB.getNode());


        inputWrap.addChildren(inputFieldWrapR,inputFieldWrapHue,
                              inputFieldWrapG,inputFieldWrapSat,
                              inputFieldWrapB,inputFieldWrapVal,colorContrast);

    /*---------------------------------------------------------------------------------*/

    var hexInputWrap = new ControlKit.Node(ControlKit.NodeType.DIV);
        hexInputWrap.setStyleClass(ControlKit.CSS.PickerInputWrap);

    var inputHEX = this._inputHEX = new ControlKit.Node(ControlKit.NodeType.INPUT_TEXT),
        inputFieldWrapHEX         = new ControlKit.Node(ControlKit.NodeType.DIV ).setStyleClass(ControlKit.CSS.PickerInputField),
        inputFieldWrapHEXLabel    = new ControlKit.Node(ControlKit.NodeType.SPAN).setStyleClass(ControlKit.CSS.Label);

        inputFieldWrapHEXLabel.setProperty('innerHTML','#');
        inputFieldWrapHEX.addChildren(inputFieldWrapHEXLabel,inputHEX);

        hexInputWrap.addChild(inputFieldWrapHEX);

        inputHEX.addEventListener(ControlKit.NodeEventType.CHANGE,this._onInputHEXFinish.bind(this));

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

        fieldWrap.addChild( handleField);
        sliderWrap.addChild(handleSlider);

    /*---------------------------------------------------------------------------------*/

    var eventMouseDown = ControlKit.NodeEventType.MOUSE_DOWN,
        callback       = this._onCanvasFieldMouseDown.bind(this);

        fieldWrap.addEventListener(  eventMouseDown, callback);
        handleField.addEventListener(eventMouseDown, callback);

        callback = this._onCanvasSliderMouseDown.bind(this);

        sliderWrap.addEventListener(  eventMouseDown, callback);
        handleSlider.addEventListener(eventMouseDown, callback);

        menuClose.addEventListener(   eventMouseDown, this._onClose.bind(this));
        buttonPick.addEventListener(  eventMouseDown, this._onPick.bind(this));
        buttonCancel.addEventListener(eventMouseDown, this._onClose.bind(this));

        headNode.addEventListener(ControlKit.NodeEventType.MOUSE_DOWN, this._onHeadDragStart.bind(this));

    /*---------------------------------------------------------------------------------*/

    this._parentNode = parentNode;

    this._mouseOffset = [0,0];
    this._position    = [0,0];

    this._canvasSliderPos = [0,0];
    this._canvasFieldPos  = [0,0];
    this._handleFieldSize    = 12;
    this._handleSliderHeight = 7;

    this._imageDataSlider = contextCanvasSlider.createImageData(canvasSlider.width,canvasSlider.height);
    this._imageDataField  = contextCanvasField.createImageData( canvasField.width, canvasField.height);

    this._valueHueMinMax = [0,360];
    this._valueSatMinMax = this._valueValMinMax = [0,100];
    this._valueRGBMinMax = [0,255];

    this._valueHue = ControlKit.Default.COLOR_PICKER_VALUE_HUE;
    this._valueSat = ControlKit.Default.COLOR_PICKER_VALUE_SAT;
    this._valueVal = ControlKit.Default.COLOR_PICKER_VALUE_VAL;
    this._valueR   = 0;
    this._valueG   = 0;
    this._valueB   = 0;

    this._valueHEX = '#000000';
    this._valueHEXValid = this._valueHEX;

    this._callbackPick = function(){};

    //this._canvasFieldImageDataFunc = function(i,j){return this._HSV2RGB(this._valueHue,j)}

    /*---------------------------------------------------------------------------------*/

    this._drawCanvasField();
    this._drawCanvasSlider();

    this._setColorHSV(this._valueHue,this._valueSat,this._valueVal);

    this._updateColorRGBFromHSV();
    this._updateColorHEXFromRGB();

    this._updateHandles();
};

/*---------------------------------------------------------------------------------*/

ControlKit.Picker.prototype =
{
    _drawHandleField : function()
    {
        var canvas   = this._canvasField,
            nodePos  = this._canvasFieldPos,
            mousePos = ControlKit.Mouse.getInstance().getPosition();

        var posX     = Math.max(0,Math.min(mousePos[0] - nodePos[0],canvas.width)),
            posY     = Math.max(0,Math.min(mousePos[1] - nodePos[1],canvas.height)),
            posXNorm = posX / canvas.width,
            posYNorm = posY / canvas.height;

        var sat = Math.round(       posXNorm   * this._valueSatMinMax[1]),
            val = Math.round((1.0 - posYNorm) * this._valueValMinMax[1]);

        this._setColorHSV(this._valueHue,sat,val);

        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();

        this._updateHandleField();
    },

    _updateHandleField : function()
    {
        var width        = this._canvasField.width,
            height       = this._canvasField.height,
            offsetHandle = this._handleFieldSize * 0.25;

        var satNorm      = this._valueSat / this._valueSatMinMax[1],
            valNorm      = this._valueVal / this._valueValMinMax[1];

       this._handleField.setPositionGlobal(satNorm * width          - offsetHandle,
                                           (1.0 - valNorm) * height - offsetHandle);

    },

    _drawHandleSlider : function()
    {
        var canvas     = this._canvasSlider,
            canvasPosY = this._canvasSliderPos[1],
            mousePosY  = ControlKit.Mouse.getInstance().getY();

        var posY     = Math.max(0,Math.min(mousePosY - canvasPosY,canvas.height)),
            posYNorm = posY / canvas.height;

        var hue  = Math.floor((1.0 - posYNorm) * this._valueHueMinMax[1]);

        this._setColorHSV(hue,this._valueSat,this._valueVal);

        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();

        this._updateHandleSlider();
    },

    _updateHandleSlider : function()
    {
        var height       = this._canvasSlider.height,
            offsetHandle = this._handleSliderHeight * 0.25;

        var hueNorm = this._valueHue / this._valueHueMinMax[1];

        this._handleSlider.setPositionGlobalY((height - offsetHandle) * (1.0 - hueNorm));
    },

    _updateHandles : function()
    {
        this._updateHandleField();
        this._updateHandleSlider();
    },

    /*---------------------------------------------------------------------------------*/

    _setHue : function(value)
    {
        var minMax = this._valueHueMinMax;

        this._valueHue = value == minMax[1] ? minMax[0] : value;
        this._updateColorHSV();
        this._drawCanvasField();
    },

    _setSat : function(value)
    {
        this._valueSat = Math.round(value);
        this._updateColorHSV();
    },

    _setVal : function(value)
    {
        this._valueVal = Math.round(value);
        this._updateColorHSV();
    },

    _setR : function(value)
    {
        this._valueR = Math.round(value);
        this._updateColorRGB();
    },

    _setG : function(value)
    {
        this._valueG = Math.round(value);
        this._updateColorRGB();
    },

    _setB : function(value)
    {
        this._valueB = Math.round(value);
        this._updateColorRGB();
    },

    /*---------------------------------------------------------------------------------*/

    _onInputHueChange : function()
    {
        var input    = this._inputHue,
            inputVal = this._getValueContrained(input,this._valueHueMinMax);

        var minMax = this._valueHueMinMax;

        if(inputVal == minMax[1]){inputVal = minMax[0]; input.setValue(inputVal);}

        this._setHue(inputVal);
        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();
        this._updateHandleSlider();

        this._drawCanvasField();
    },

    _onInputSatChange : function()
    {
        this._setSat(this._getValueContrained(this._inputSat,this._valueSatMinMax));
        this._onInputSVChange();
    },

    _onInputValChange : function()
    {
        this._setVal(this._getValueContrained(this._inputVal,this._valueValMinMax));
        this._onInputSVChange();
    },

    _onInputRChange   : function()
    {
        this._setR(this._getValueContrained(this._inputR,this._valueRGBMinMax));
        this._onInputRGBChange();
    },

    _onInputGChange   : function()
    {
        this._setG(this._getValueContrained(this._inputG,this._valueRGBMinMax));
        this._onInputRGBChange();
    },

    _onInputBChange   : function()
    {
        this._setB(this._getValueContrained(this._inputB,this._valueRGBMinMax));
        this._onInputRGBChange();
    },

    _onInputHEXFinish : function()
    {
        var input = this._inputHEX,
            value = input.getProperty('value');

        if(!this._isValidHEX(value))
        {
            input.setProperty('value',this._valueHEXValid);
            return;
        }

        this._valueHEX = this._valueHEXValid = value;
        this._updateColorFromHEX();
    },

    _onInputSVChange : function()
    {
        this._updateColorRGBFromHSV();
        this._updateColorHEXFromRGB();
        this._updateHandleField();
    },

    _onInputRGBChange : function()
    {
        this._updateColorHSVFromRGB();
        this._updateColorHEXFromRGB();
        this._updateHandles();
    },

    _getValueContrained : function(input,minMax)
    {
        var inputVal = Math.round(input.getValue()),
            min      = minMax[0],
            max      = minMax[1];

        if(inputVal <= min){inputVal = min;input.setValue(inputVal);}
        if(inputVal >= max){inputVal = max;input.setValue(inputVal);}

        return inputVal;
    },



    /*---------------------------------------------------------------------------------*/

    _updateInputHue : function(){this._inputHue.setValue(this._valueHue);},
    _updateInputSat : function(){this._inputSat.setValue(this._valueSat);},
    _updateInputVal : function(){this._inputVal.setValue(this._valueVal);},
    _updateInputR   : function(){this._inputR.setValue(this._valueR);},
    _updateInputG   : function(){this._inputG.setValue(this._valueG);},
    _updateInputB   : function(){this._inputB.setValue(this._valueB);},
    _updateInputHEX : function(){this._inputHEX.setProperty('value',this._valueHEX);},

    /*---------------------------------------------------------------------------------*/

    _setColorHSV  : function(hue,sat,val)
    {
        this._valueHue = hue;
        this._valueSat = sat;
        this._valueVal = val;

        this._updateInputHue();
        this._updateInputSat();
        this._updateInputVal();

        this._updateContrastCurrColor();
    },

    _setColorRGB  : function(r,g,b)
    {
        this._valueR = r;
        this._valueG = g;
        this._valueB = b;

        this._updateInputR();
        this._updateInputG();
        this._updateInputB();

        this._updateContrastCurrColor();
    },

    _setColorHEX : function(hex)
    {
        this._valueHEX = hex;
        this._updateInputHEX();
    },

    _updateColorHSV : function()
    {
        this._setColorHSV(this._valueHue,this._valueSat,this._valueVal);
        this._updateContrastCurrColor();
    },

    _updateColorRGB : function()
    {
        this._setColorRGB(this._valueR,this._valueG,this._valueB);
        this._updateContrastCurrColor();
    },

    _updateColorHSVFromRGB : function()
    {
        var hsv = this._RGB2HSV(this._valueR,this._valueG,this._valueB);
        this._setColorHSV(hsv[0],hsv[1],hsv[2]);
    },

    _updateColorRGBFromHSV : function()
    {
        var rgb = this._HSV2RGB(this._valueHue,this._valueSat,this._valueVal);
        this._setColorRGB(rgb[0],rgb[1],rgb[2]);
    },

    _updateColorHEXFromRGB : function()
    {
        var hex = this._RGB2HEX(this._valueR, this._valueG, this._valueB);
        this._setColorHEX(hex);
    },

    _updateColorFromHEX : function()
    {
        var rgb = this._HEX2RGB(this._valueHEX);

        this._setColorRGB(rgb[0],rgb[1],rgb[2]);
        this._updateColorHSVFromRGB();
        this._updateHandles();
    },



    /*---------------------------------------------------------------------------------*/

    _updateContrastCurrColor : function(){this._setContrastCurrColor(this._valueR, this._valueG, this._valueB);},
    _updateContrastPrevColor : function(){this._setContrasPrevColor( this._valueR, this._valueG, this._valueB)},

    _setContrastCurrColor  : function(r,g,b){this._colorCurrNode.setStyleProperty('background','rgb('+r+','+g+','+b+')')},
    _setContrasPrevColor   : function(r,g,b){this._colorPrevNode.setStyleProperty('background','rgb('+r+','+g+','+b+')')},

    /*---------------------------------------------------------------------------------*/

    _HSV2RGB : function(hue,sat,val)
    {
        var hueMinMax = this._valueHueMinMax,
            satMinMax = this._valueSatMinMax,
            valMinMax = this._valueValMinMax;

        var max_hue = hueMinMax[1],
            max_sat = satMinMax[1],
            max_val = valMinMax[1];

        var min_hue = hueMinMax[0],
            min_sat = satMinMax[0],
            min_val = valMinMax[0];

        hue = hue % max_hue;
        val = Math.max(min_val,Math.min(val,max_val))/max_val * 255.0;

        if(sat <= min_sat)
        {
            val = Math.round(val);
            return[val,val,val];
        }
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
            case 0: r = val; g = t; b = p;break;
            case 1: r = q; g = val; b = p;break;
            case 2: r = p; g = val; b = t;break;
            case 3: r = p; g = q; b = val;break;
            case 4: r = t; g = p; b = val;break;
            case 5: r = val; g = p; b = q;break;
            default: break;
        }

        r = Math.round(r);
        g = Math.round(g);
        b = Math.round(b);

        return [r,g,b];

    },

    _RGB2HSV: function (r, g, b)
    {
        var h = 0,
            s = 0,
            v = 0;

        r = r / 255.0;
        g = g / 255.0;
        b = b / 255.0;

        var minRGB = Math.min(r, Math.min(g, b)),
            maxRGB = Math.max(r, Math.max(g, b));

        if (minRGB == maxRGB) { v = minRGB;return [0, 0, Math.round(v)];}

        var dd = (r == minRGB) ? g - b : ((b == minRGB) ? r - g : b - r),
            hh = (r == minRGB) ? 3 : ((b == minRGB) ? 1 : 5);

        h = Math.round(60 * (hh - dd / (maxRGB - minRGB)));
        s = Math.round((maxRGB - minRGB) / maxRGB * 100.0);
        v = Math.round( maxRGB * 100.0);

        return [h, s, v];
    },

    _isValidHEX : function(hex)
    {
        return /^#[0-9A-F]{6}$/i.test(hex);
    },

    //http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb

    _RGB2HEX : function(r,g,b)
    {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    _HEX2RGB : function(hex)
    {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16),parseInt(result[2], 16),parseInt(result[3], 16)] : null;
    },

    /*---------------------------------------------------------------------------------*/

    _onHeadDragStart : function()
    {
        var node       = this._node,
            parentNode = this._parentNode;

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
                self._updateCanvasNodePositions();
            },

            onDragEnd = function()
            {
                self._updateCanvasNodePositions();
                document.removeEventListener(eventMouseMove, onDrag,    false);
                document.removeEventListener(eventMouseUp,   onDragEnd, false);
            };

        parentNode.removeChild(node);
        parentNode.addChild(   node);

        document.addEventListener(eventMouseMove, onDrag,    false);
        document.addEventListener(eventMouseUp,   onDragEnd, false);

        this._updateCanvasNodePositions();
    },

    _updatePosition : function()
    {
        var mousePos  = ControlKit.Mouse.getInstance().getPosition(),
            offsetPos = this._mouseOffset;

        var currPositionX = mousePos[0] - offsetPos[0],
            currPositionY = mousePos[1] - offsetPos[1];

        var node     = this._node,
            head     = this._headNode,
            position = this._position;

        var maxX = window.innerWidth  - node.getWidth(),
            maxY = window.innerHeight - head.getHeight();

        position[0] = Math.max(0,Math.min(currPositionX,maxX));
        position[1] = Math.max(0,Math.min(currPositionY,maxY));

        node.setPositionGlobal(position[0],position[1]);
    },

    /*---------------------------------------------------------------------------------*/

    _drawCanvasField : function()
    {
        var canvas  = this._canvasField,
            context = this._contextCanvasField;

        var width     = canvas.width,
            height    = canvas.height,
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

        context.putImageData(imageData,0,0);

    },


    _drawCanvasSlider : function()
    {
        var canvas  = this._canvasSlider,
            context = this._contextCanvasSlider;

        var width     = canvas.width,
            height    = canvas.height,
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

        context.putImageData(imageData,0,0);

    },

    /*---------------------------------------------------------------------------------*/

    _onCanvasFieldMouseDown : function()
    {
        var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
            eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

        var self = this;

        var onDrag     = function()
            {
                self._drawHandleField();
            },

            onDragEnd  = function()
            {
                document.removeEventListener(eventMouseMove, onDrag,    false);
                document.removeEventListener(eventMouseUp,   onDragEnd, false);
            };

        document.addEventListener(eventMouseMove, onDrag,    false);
        document.addEventListener(eventMouseUp,   onDragEnd, false);

        self._drawHandleField();
    },

    _onCanvasSliderMouseDown : function()
    {
        var eventMouseMove = ControlKit.DocumentEventType.MOUSE_MOVE,
            eventMouseUp   = ControlKit.DocumentEventType.MOUSE_UP;

        var self = this;

        var onDrag     = function()
            {
                self._drawHandleSlider();
                self._drawCanvasField();
            },

            onDragEnd  = function()
            {
                document.removeEventListener(eventMouseMove, onDrag,    false);
                document.removeEventListener(eventMouseUp,   onDragEnd, false);
                self._drawCanvasField();
            };

        document.addEventListener(eventMouseMove, onDrag,    false);
        document.addEventListener(eventMouseUp,   onDragEnd, false);

        self._drawHandleSlider();
        self._drawCanvasField();
    },

    _setSizeCanvasField : function(width,height)
    {
        var canvas = this._canvasField;
            canvas.style.width  = width  + 'px';
            canvas.style.height = height + 'px';
            canvas.width  = width;
            canvas.height = height;

    },

    _setSizeCanvasSlider : function(width,height)
    {
        var canvas = this._canvasSlider;
            canvas.style.width  = width  + 'px';
            canvas.style.height = height + 'px';
            canvas.width  = width;
            canvas.height = height;
    },

    /*---------------------------------------------------------------------------------*/

    open  : function()
    {
        this._parentNode.addChild(this._node);
        this._updateCanvasNodePositions();
    },

    close : function(){this._parentNode.removeChild(this._node);},

    _onClose : function(e){e.cancelBubble = true;this.close();},
    _onPick  : function(){this._callbackPick();this.close();},

    _updateCanvasNodePositions : function()
    {
        var canvasSliderPos = this._canvasSliderPos,
            canvasFieldPos  = this._canvasFieldPos;

            canvasSliderPos[0] = canvasSliderPos[1] = 0;
            canvasFieldPos[0]  = canvasFieldPos[1]  = 0;

        var element = this._canvasSlider;

        while(element)
        {
            canvasSliderPos[0] += element.offsetLeft;
            canvasSliderPos[1] += element.offsetTop;
            element             = element.offsetParent;
        }

        element = this._canvasField;

        while(element)
        {
            canvasFieldPos[0] += element.offsetLeft;
            canvasFieldPos[1] += element.offsetTop;
            element            = element.offsetParent;
        }
    },

    setCallbackPick : function(func){this._callbackPick = func;},

    /*---------------------------------------------------------------------------------*/

    setColorHEX : function(hex)
    {
        this._setColorHEX(hex);
        this._updateColorFromHEX();

        this._drawCanvasField();

        this._updateHandles();

        var rgb = this._HEX2RGB(hex);
        this._setContrasPrevColor(rgb[0],rgb[1],rgb[2]);
    },

    //TODO ADD
    setColorRGB : function(r,g,b){},
    setColorHSV : function(h,s,v){},


    getR    : function(){return this._valueR;},
    getG    : function(){return this._valueG;},
    getB    : function(){return this._valueB;},
    getRGB  : function(){return [this._valueR,this._valueG,this._valueB];},
    getHue  : function(){return this._valueHue;},
    getSat  : function(){return this._valueSat;},
    getVal  : function(){return this._valueVal;},
    getHSV  : function(){return [this._valueHue,this._valueSat,this._valueVal];},
    getHEX  : function(){return this._valueHEX;},

    getNode : function(){return this._node;}

};

ControlKit.Picker.init        = function(parentNode){return ControlKit.Picker._instance = new ControlKit.Picker(parentNode);};
ControlKit.Picker.getInstance = function(){return ControlKit.Picker._instance;};
