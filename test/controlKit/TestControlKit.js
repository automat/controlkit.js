
var imports = [

               'event/ckEvent.js',
               'event/ckEventDispatcher.js',
               'event/ckEventType.js',

               'dom/ckCSS.js',
               'dom/ckMouse.js',

               'dom/ckNodeEvent.js',
               'dom/ckNodeType.js',
               'dom/ckNode.js',

               'layout/ckLayout.js',
               'controlKit.js',

               'components/internal/ckOptions.js',


               'ckPanel.js',

               'components/internal/ckComponent.js',
               'components/internal/ckObjectComponent.js',
               'components/internal/ckNumberInput_Internal.js',
               'components/internal/ckSlider_Internal.js',
               'components/internal/ckCanvas.js',
               'components/internal/ckCanvasComponent.js',
               'components/internal/ckPlotter.js',


               'components/ckGroup.js',
               'components/ckSubGroup.js',

               'components/ckStringInput.js',
               'components/ckButton.js',

               'components/ckNumberInput.js',
               'components/ckRange.js',
               'components/ckCheckbox.js',
               'components/ckSlider.js',
               'components/ckSelect.js',

               'components/ckFunctionPlotter.js',
               'components/ckPad.js',
               'components/ckValuePlotter.js',
               'components/ckStringOutput.js',
               'components/ckNumberOutput.js',

               'components/internal/ckPicker.js'


              ];
var i = -1,string;
while(++i < imports.length)
{
    string = '"' + '../../src/controlKit/' + imports[i] + '"';
    document.write('<script type="text/javascript" src=' + string + '></script>');
}



function TestControlKit(parentDomElementId)
{
    var object = {string:'lorem ipsum',
                  number:26.0,
                  range:[0,1],
                  bool:true,
                  slideValue:0.5,
                  selectOptions:['hello','bello','cello'],
                  selectTarget:null,
                  func:function(x){return Math.sin(x*Math.PI*4)*0.5;},
        func2:function(x){return x*x;},
                  xyValue:[0.25,-0.35],
                  changeValue0:0.0,
                  changeValue1:0.0,
        changeValue2:0.0,
        changeValue3:0.0,
        changeValue4:0.0,
        changeValue5:0.0,
        changeValue6:0.0,
                 xyChangeValue:[0.1,0.1]
                  };

    var controlKit = new ControlKit(parentDomElementId);

    var control0   = controlKit.addPanel({width:200,position:[10,10],fixed:false});


    control0.addGroup()
        /*
            .addValuePlotter(object,'changeValue0','valuePlotter',{height:25})
            .addNumberOutput(object,'changeValue0','',{dp:4})
            .addValuePlotter(object,'changeValue1','valuePlotter',{height:25})
            .addNumberOutput(object,'changeValue1','',{dp:4})
            .addPad(object,'xyValue','Pad Comp')
            .addNumberOutput(object,'xyValue')
            .addPad(object,'xyValue','Pad Comp')
            .addNumberOutput(object,'xyValue','',{wrap:true,height:40,dp:4})
            .addStringInput(object,'string','String Comp')
            .addStringInput(object,'string','String Comp')
            .addNumberInput(object,'number','Number Comp')
            .addButton('BUMM',function(){})
            */
            .addSubGroup()
            .addRange(object,'range','Range Comp')
            .addSlider(object,'range','slideValue','slider');


    var control1 = controlKit.addPanel({width:200,position:[300,10]});

    control1.addGroup().addSubGroup()
            .addSlider(object,'range','slideValue','slider');

    /*
    control0.addGroup({label:'Group'})
            .addSubGroup()
            .addSelect(object,'selectOptions','selectTarget','Select Comp')
            .addFunctionPlotter(object,'func','Function',{bounds:[-1,1,-1,1]})
            .addSubGroup()
            .addRange(object,'range','Range Comp')
            .addCheckbox(object,'bool','Bool Comp')
            .addSubGroup()
            .addPad(object,'xyValue','Pad Comp')
            .addNumberOutput(object,'xyValue','',{wrap:true,height:40,dp:4});

    var control1 = controlKit.addPanel({label:'Basic Controls',width:180,position:[300,10]});


    control1.addGroup({label:'Group 1'})
        .addSubGroup()
        .addValuePlotter(object,'changeValue0','valuePlotter',{height:100})
        .addNumberOutput(object,'changeValue0','',{dp:4})
        .addSubGroup()
        .addValuePlotter(object,'changeValue1','valuePlotter',{height:100})
        .addNumberOutput(object,'changeValue1','',{dp:4});
    control1.addGroup({label:'Group 1'})
        .addRange(object,'range','Range Comp')
        .addCheckbox(object,'bool','Bool Comp')
        .addSelect(object,'selectOptions','selectTarget','Select Comp')
        .addFunctionPlotter(object,'func','Function',{bounds:[-1,1,-1,1]});

    var control2 = controlKit.addPanel({label:'YAY Panel',width:200,position:[490,10]});

    control2.addGroup()
        .addValuePlotter(object,'changeValue0','sgn',{height:35})
        .addValuePlotter(object,'changeValue1','tri',{height:35})
        .addValuePlotter(object,'changeValue2','randF',{height:35,lineWidth:2,lineColor:[237, 20, 91]})
        .addValuePlotter(object,'changeValue3','rect',{height:35,lineWidth:0.5})
        .addValuePlotter(object,'changeValue4','randI',{height:35,lineWidth:2,lineColor:[237, 20, 91]})
        .addValuePlotter(object,'changeValue5','frac',{height:35})
        .addValuePlotter(object,'changeValue6','sin',{height:35});

    var control3 = controlKit.addPanel({label:'Numbers',width:150,position:[700,10]});

    control3.addGroup()
        .addNumberOutput(object,'changeValue0','sgn')
        .addNumberOutput(object,'changeValue1','tri')
        .addNumberOutput(object,'changeValue2','randF')
        .addNumberOutput(object,'changeValue3','rect')
        .addNumberOutput(object,'changeValue4','randI')
        .addNumberOutput(object,'changeValue5','frac')
        .addNumberOutput(object,'changeValue6','sin');

    var control4 = controlKit.addPanel({label:'Swing',width:200,position:[700,500]});

    control4.addGroup()
        .addPad(object,'xyChangeValue','Freq Transform',{axisLabels:['SPEED','random'],showCross:false})
        .addNumberOutput(object,'xyChangeValue')
        .addButton('reset',function(){object.xyChangeValue = [0.1,0.1]});

    var control5 = controlKit.addPanel({label:'YAY Panel Big',width:200,position:[490,405]});

    control5.addGroup()
        .addValuePlotter(object,'changeValue1','tri x1',{height:60,lineWidth:1,lineColor:[237, 20, 91]})
        .addValuePlotter(object,'changeValue1','tri x2',{height:60,lineWidth:2,lineColor:[237, 20, 91],resolution:2})
        .addValuePlotter(object,'changeValue1','tri x4',{height:60,lineWidth:4,lineColor:[237, 20, 91],resolution:4})
        .addValuePlotter(object,'changeValue1','tri x8',{height:60,lineWidth:8,lineColor:[237, 20, 91],resolution:8})
        .addValuePlotter(object,'changeValue1','tri x16',{height:60,lineWidth:16,lineColor:[237, 20, 91],resolution:16});







    var t = 0.0;
    var sint;
    function updateObject()
    {
        t+=object.xyChangeValue[0];
        t+=randomFloat(-1,1)*object.xyChangeValue[1];
        sint = Math.sin(t);
        object.changeValue0 = sgn(sint);
        object.changeValue1 = tri(sint);

        object.changeValue2 = randomFloat(-1,1);
        object.changeValue3 = rect(sint);
        object.changeValue4 = randomInteger(-1,1);
        object.changeValue5 = frac(sint);
        object.changeValue6 = sint;
        controlKit.update();
    }

    function loop(){requestAnimationFrame(loop);updateObject();}loop();

    */
}

/**
 * Provides requestAnimationFrame in a cross browser way.
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */
if ( !window.requestAnimationFrame ) {

    window.requestAnimationFrame = ( function() {

        return window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame || // comment out if FF4 is slow (it caps framerate at ~30fps: https://bugzilla.mozilla.org/show_bug.cgi?id=630127)
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {

                window.setTimeout( callback, 1000 / 60 );

            };

    } )();

}


