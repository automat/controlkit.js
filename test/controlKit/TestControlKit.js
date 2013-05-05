
var imports = [

               'controlKit.js',


               'core/event/ckEvent.js',
               'core/event/ckEventDispatcher.js',
               'core/event/ckEventType.js',

                'core/ckConstant.js',
                'core/ckKit.js',

               'core/dom/css/ckCSS.js',

               'core/dom/event/ckDocumentEventType.js',
               'core/dom/ckMouse.js',

               'core/dom/event/ckNodeEventType.js',
               'core/dom/ckNodeType.js',
               'core/dom/ckNode.js',

               'core/layout/ckLayout.js',

               'core/component/ckComponent.js',
               'core/component/ckObjectComponent.js',
               'core/component/ckCanvas.js',
               'core/component/ckCanvasComponent.js',

               'core/group/ckAbstractGroup.js',
               'core/group/ckGroup.js',
               'core/group/ckSubGroup.js',

               'core/ckDefault.js',
               'core/ckPanel.js',

               'component/internal/ckOptions.js',
               'component/internal/ckNumberInput_Internal.js',
               'component/internal/ckSlider_Internal.js',
               'component/internal/ckPlotter.js',
               'component/internal/ckPresetBtn.js',

               'component/ckStringInput.js',
               'component/ckNumberInput.js',

               'component/ckButton.js',

               'component/ckRange.js',
               'component/ckCheckbox.js',
               'component/ckSlider.js',
               'component/ckSelect.js',

               'component/ckFunctionPlotter.js',
               'component/ckPad.js',
               'component/ckValuePlotter.js',
               'component/ckStringOutput.js',
               'component/ckNumberOutput.js',

               'component/internal/ckPicker.js'









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
                  stringPresets:['hy','well','bummm'],
                  number:26.0,
                  numberPresets:[10.0,20.0,345.0,12.0],
                  range:[0,1],
                  bool:true,
                  slideValue:0.5,
                  selectOptions:['hello','bello','cello'],
                  selectTarget:'hello',
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

    var controlKit = new ControlKit.Kit(parentDomElementId);

    var control0   = controlKit.addPanel({width:300,position:[0,0],fixed:false});


    control0.addGroup()
            .addSubGroup('noise')
            .addNumberInput(object,'number','Input Comp',{presets:'numberPresets'})
            .addNumberInput(object,'number','Input Comp')
            .addStringInput(object,'string','Input Comp',{presets:'stringPresets'})
            .addStringInput(object,'string','Input Comp')
            .addRange( object,'range','Range Comp')
            .addSlider(object,'range','slideValue','slider')
            .addSelect(object,'selectOptions','selectTarget','select')



.addSubGroup('grain',{show:false})
    .addRange(object,'range','Range Comp')
    .addSlider(object,'range','slideValue','slider')
    .addSelect(object,'selectOptions','selectTarget','select');




    control0.addGroup({label:'Group'})
            .addSubGroup('functions')

        .addSelect(object,'selectOptions','selectTarget','Select Comp')
        .addFunctionPlotter(object,'func','Function',{bounds:[-1,1,-1,1]})
        .addButton('body go!')
        .addSubGroup()
        .addRange(object,'range','Range Comp')
        .addCheckbox(object,'bool','Bool Comp')




    var control1 = controlKit.addPanel({width:250,position:[205,0]});

    control1.addGroup()
        .addSubGroup('subgroup 1')
            .addSelect(object,'selectOptions','selectTarget','select')
    .addSelect(object,'selectOptions','selectTarget','Select Comp')
    .addFunctionPlotter(object,'func','Function',{bounds:[-1,1,-1,1]})
        .addSubGroup('subgroup 2')
    .addRange(object,'range','Range Comp')
    .addCheckbox(object,'bool','Bool Comp')
        .addSubGroup('subgroup 3')
    .addPad(object,'xyValue','Pad Comp')
    .addNumberOutput(object,'xyValue','',{wrap:true,height:40,dp:4});

    var control2 = controlKit.addPanel({label:'YAY Panel',width:200,position:[460,0]});

    control2.addGroup()
        .addSubGroup('values 1')
        .addValuePlotter(object,'changeValue0','sgn',{height:35})
        .addValuePlotter(object,'changeValue1','tri',{height:35})
        .addSubGroup('values 2')
        .addValuePlotter(object,'changeValue2','randF',{height:35,lineWidth:2,lineColor:[237, 20, 91]})
        .addValuePlotter(object,'changeValue3','rect',{height:35,lineWidth:0.5})
        .addSubGroup('values 3')
        .addValuePlotter(object,'changeValue4','randI',{height:35,lineWidth:2,lineColor:[237, 20, 91]})
        .addValuePlotter(object,'changeValue5','frac',{height:35})
        .addValuePlotter(object,'changeValue6','sin',{height:35});






        var control1 = controlKit.addPanel({width:200,position:[300,10]});

        control1.addGroup().addSubGroup()
                .addSlider(object,'range','slideValue','slider');


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

        var control2 = controlKit.addPanel({label:'YAY Panel',width:200,position:[700,10]});

        control2.addGroup()
            .addSubGroup('values 1')
            .addValuePlotter(object,'changeValue0','sgn',{height:35})
            .addValuePlotter(object,'changeValue1','tri',{height:35})
            .addSubGroup('values 2')
            .addValuePlotter(object,'changeValue2','randF',{height:35,lineWidth:2,lineColor:[237, 20, 91]})
            .addValuePlotter(object,'changeValue3','rect',{height:35,lineWidth:0.5})
            .addSubGroup('values 3')
            .addValuePlotter(object,'changeValue4','randI',{height:35,lineWidth:2,lineColor:[237, 20, 91]})
            .addValuePlotter(object,'changeValue5','frac',{height:35})
            .addValuePlotter(object,'changeValue6','sin',{height:35});

        var control3 = controlKit.addPanel({label:'Numbers',width:150,position:[490,10]});

        control3.addGroup()
            .addNumberOutput(object,'changeValue0','sgn')
            .addNumberOutput(object,'changeValue1','tri')
            .addNumberOutput(object,'changeValue2','randF')
            .addNumberOutput(object,'changeValue3','rect')
            .addNumberOutput(object,'changeValue4','randI')
            .addNumberOutput(object,'changeValue5','frac')
            .addNumberOutput(object,'changeValue6','sin');

        var control4 = controlKit.addPanel({label:'Swing',width:200,position:[700,510]});

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

    control5 = controlKit.addPanel({label:'YAY Panel Big',width:100,position:[690,405],fixed:false});

    control5.addGroup()
        .addPad(object,'xyValue','pad')
.addPad(object,'xyValue','pad')
.addPad(object,'xyValue','pad')
.addPad(object,'xyValue','pad');




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


