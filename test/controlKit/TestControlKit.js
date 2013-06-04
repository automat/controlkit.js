
var imports = [

               //'style/style.js',
               'controlKit.js',


               'core/event/ckEvent.js',
               'core/event/ckEventDispatcher.js',
               'core/event/ckEventType.js',

                'core/ckConstant.js',
                'core/ckHistory.js',
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

               'core/layout/ckScrollBar.js',
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
               'component/internal/ckOutput.js',

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

               'component/ckConsole.js',

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
                  slideValue:0.01,
                  selectOptions:['hello','bello','cello'],
                  selectTarget:'hello',
                  func:function(x){return Math.sin(x);},
                  func2:function(x){return x*x;},
                  funcs:[function(x){return Math.sin(x*x*Math.PI);},
                         function(x){return x*x}],
                  funcTarget : null,

                  xyValue:[0.25,-0.35],
                  changeValue0:0.0,
                  changeValue1:0.0,
                  changeValue2:0.0,
                  changeValue3:0.0,
                  changeValue4:0.0,
                  changeValue5:0.0,
                  changeValue6:0.0,
                    xyChangeValue:[0.1,0.1],
                  output:'',
        slideValue0:0.01,
        slideValue1:0.01,
        slideValue2:0.01,
        slideValue3:0.01,
        slideValue4:0.01,
        slideValue5:0.01,
        slideValue6:0.01,
        slideValue7:0.01
                  };

    object.funcTarget = object.funcs[0];

    var controlKit = new ControlKit.Kit(parentDomElementId,{trigger:true});


    var panel0 = controlKit.addPanel({width: 200,height:300, align: 'left', fixed: false, position: [20, 20]});
    var group01 = panel0.addGroup({height:300})
        .addSubGroup({label: 'Function Select'})
        .addButton('hello')

        .addFunctionPlotter(object, 'funcTarget', {label: 'Graph'})
        .addStringOutput(object, 'funcTarget')
        .addSelect(object, 'funcs', 'funcTarget')
        .addSubGroup({label: 'Function Plot'})
        .addValuePlotter(object, 'changeValue0', {lineColor: [237, 20, 91]})
        .addRange(object, 'range')
        .addSlider(object, 'range', 'slideValue');






    var control0 = controlKit.addPanel({width: 200, height:300,align: 'left', fixed: false, position: [220, 20]}),
        group00 = control0.addGroup({label:'label',height:300})
            .addSubGroup()
            .addValuePlotter(object, 'changeValue2', {height: 35, lineWidth: 2, lineColor: [237, 20, 91]})
            .addValuePlotter(object, 'changeValue3', {height: 35, lineWidth: 2})
            .addValuePlotter(object, 'changeValue2', {height: 35, lineColor: [237, 20, 91]})
            .addValuePlotter(object, 'changeValue3', {height: 35})
            .addValuePlotter(object, 'changeValue3', {height: 35})
            .addNumberOutput(object, 'changeValue0')
            .addNumberOutput(object, 'changeValue0')
            control0.addGroup({height:150})
            .addSubGroup({label:'label',height:150})
            .addNumberOutput(object, 'changeValue1')
            .addStringOutput(object, 'selectOptions', {height: 60, wrap: true})
            .addNumberOutput(object, 'changeValue1')
            .addStringInput(object, 'string')
            .addRange(object, 'range')
            .addSelect(object, 'selectOptions', 'selectTarget')
                .addSubGroup({label:'hello'})
                .addStringInput(object, 'string'  )





    var control0 = controlKit.addPanel({width: 200, height:300,align: 'left', fixed: false, position: [420, 20]});
        control0.addGroup({label: 'level'})
        .addSubGroup({label: 'noise', height: 200})
        .addNumberInput(object, 'number',  {presets: 'numberPresets'})
        .addNumberInput(object, 'number')
        .addStringInput(object, 'string',{presets: 'stringPresets'})
        .addNumberOutput(object, 'changeValue1')
        .addStringInput(object, 'string', 'Input Comp')
        .addRange(object, 'range')
      //  .addSlider(object, 'range', 'slideValue', 'slider')
        .addSelect(object, 'selectOptions', 'selectTarget')


        .addSubGroup({label: 'grain', show: false, height: 150})
        .addRange(object, 'range')
        //.addSlider(object, 'range', 'slideValue', 'slider')
        .addSelect(object, 'selectOptions', 'selectTarget')
        .addRange(object, 'range')
   //     .addSlider(object, 'range', 'slideValue', 'slider')
        .addSelect(object, 'selectOptions', 'selectTarget');



    control0 = controlKit.addPanel({width:200,fixed:false,label:'Pad'})
        .addGroup().addSubGroup().addPad(object, 'xyValue',{label:'none'})
        .addNumberOutput(object,'xyValue');


    var control0 = controlKit.addPanel({width: 200,align: 'left', fixed: false, position: [620, 20]})
        .addGroup().addSubGroup()
        .addSlider(object,'range','slideValue')
        .addSlider(object,'range','slideValue0')
        .addSlider(object,'range','slideValue1')
        .addSlider(object,'range','slideValue2')
        .addSlider(object,'range','slideValue3')
        .addSlider(object,'range','slideValue4')




    /*
    var kitConsole = controlKit.addConsole({fixed:false});
    */
    /*
    var output = controlKit.addPanel({width:300,fixed:false,position:[200,400]});
        output.addGroup().addSubGroup().addStringOutput(object,'changeValue01',{height:300});
        */


    /*

    control0.addGroup()
        .addSubGroup('functions')

        .addSelect(object, 'selectOptions', 'selectTarget', 'Select Comp')
        .addFunctionPlotter(object, 'func', 'Function', {bounds: [-1, 1, -1, 1]})
        .addButton('body go!')
        .addSubGroup()
        .addRange(object, 'range', 'Range Comp')
        .addCheckbox(object, 'bool', 'Bool Comp');


    var control1 = controlKit.addPanel({width: 250, position: [205, 0], fixed: false});

    control1.addGroup()
        .addSubGroup('subgroup 1')
        .addSelect(object, 'selectOptions', 'selectTarget', 'select')
        .addSelect(object, 'selectOptions', 'selectTarget', 'Select Comp')
        .addFunctionPlotter(object, 'func', 'Function', {bounds: [-1, 1, -1, 1]})
        .addSubGroup('subgroup 2')
        .addRange(object, 'range', 'Range Comp')
        .addCheckbox(object, 'bool', 'Bool Comp')
        .addSubGroup('subgroup 3')
        .addPad(object, 'xyValue', 'Pad Comp')
        .addNumberOutput(object, 'xyValue', '', {wrap: true, height: 40, dp: 4});


    var control2 = controlKit.addPanel({label: 'YAY Panel', width: 200, position: [460, 0], fixed: false});

    control2.addGroup()
        .addSubGroup({label: 'values1'})
        .addValuePlotter(object, 'changeValue0', 'sgn', {height: 35})
        .addValuePlotter(object, 'changeValue1', 'tri', {height: 35})
        .addSubGroup({label: 'values2'})
        .addValuePlotter(object, 'changeValue2', 'randF', {height: 35, lineWidth: 2, lineColor: [237, 20, 91]})
        .addValuePlotter(object, 'changeValue3', 'rect', {height: 35, lineWidth: 0.5})
        .addSubGroup({label: 'values3'})
        .addValuePlotter(object, 'changeValue4', 'randI', {height: 35, lineWidth: 2, lineColor: [237, 20, 91]})
        .addValuePlotter(object, 'changeValue5', 'frac', {height: 35})
        .addValuePlotter(object, 'changeValue6', 'sin', {height: 35});



    control0.addGroup({label: 'Group'})
        .addSubGroup()
        .addSelect(object, 'selectOptions', 'selectTarget', 'Select Comp')
        .addFunctionPlotter(object, 'func', 'Function', {bounds: [-1, 1, -1, 1]})
        .addSubGroup()
        .addRange(object, 'range', 'Range Comp')
        .addCheckbox(object, 'bool', 'Bool Comp')
        .addSubGroup()
        .addPad(object, 'xyValue', 'Pad Comp')
        .addNumberOutput(object, 'xyValue', '', {wrap: true, height: 40, dp: 4});


    var control1 = controlKit.addPanel({label: 'Basic Controls', width: 180, position: [300, 10], fixed: false});


    control1.addGroup({label: 'Group 1'})
        .addSubGroup()
        .addValuePlotter(object, 'changeValue0', 'valuePlotter', {height: 100})
        .addNumberOutput(object, 'changeValue0', '', {dp: 4})
        .addSubGroup()
        .addValuePlotter(object, 'changeValue1', 'valuePlotter', {height: 100})
        .addNumberOutput(object, 'changeValue1', '', {dp: 4});
    control1.addGroup({label: 'Group 1'})
        .addSubGroup()
        .addRange(object, 'range', 'Range Comp')
        .addCheckbox(object, 'bool', 'Bool Comp')
        .addSelect(object, 'selectOptions', 'selectTarget', 'Select Comp')
        .addFunctionPlotter(object, 'func', 'Function', {bounds: [-1, 1, -1, 1]});

    var control2 = controlKit.addPanel({label: 'YAY Panel', width: 200, position: [700, 10], fixed: false});

    control2.addGroup()
        .addSubGroup('values 1')
        .addValuePlotter(object, 'changeValue0', 'sgn', {height: 100})
        .addValuePlotter(object, 'changeValue1', 'tri', {height: 25})
        .addSubGroup('values 2')
        .addValuePlotter(object, 'changeValue2', 'randF', {height: 25, lineWidth: 2, lineColor: [237, 20, 91]})
        .addValuePlotter(object, 'changeValue3', 'rect', {height: 25, lineWidth: 0.5})
        .addSubGroup('values 3')
        .addValuePlotter(object, 'changeValue4', 'randI', {height: 25, lineWidth: 2, lineColor: [237, 20, 91]})
        .addValuePlotter(object, 'changeValue5', 'frac', {height: 25})
        .addValuePlotter(object, 'changeValue6', 'sin', {height: 25});

    var control3 = controlKit.addPanel({label: 'Numbers', width: 150, position: [490, 10], fixed: false});

    control3.addGroup()
        .addSubGroup()
        .addNumberOutput(object, 'changeValue0', 'sgn')
        .addNumberOutput(object, 'changeValue1', 'tri')
        .addNumberOutput(object, 'changeValue2', 'randF')
        .addNumberOutput(object, 'changeValue3', 'rect')
        .addNumberOutput(object, 'changeValue4', 'randI')
        .addNumberOutput(object, 'changeValue5', 'frac')
        .addNumberOutput(object, 'changeValue6', 'sin');

    var control4 = controlKit.addPanel({label: 'Swing', width: 200, position: [700, 510], fixed: false});

    control4.addGroup()
        .addSubGroup()
        .addPad(object, 'xyChangeValue', 'Freq Transform', {axisLabels: ['SPEED', 'random'], showCross: false})
        .addNumberOutput(object, 'xyChangeValue')
        .addButton('reset', function ()
        {
            object.xyChangeValue = [0.1, 0.1]
        });

    var control5 = controlKit.addPanel({label: 'YAY Panel Big', width: 200, position: [490, 405], fixed: false});

    control5.addGroup()
        .addSubGroup()
        .addValuePlotter(object, 'changeValue1', 'tri x1', {height: 60, lineWidth: 1, lineColor: [237, 20, 91]})
        .addValuePlotter(object, 'changeValue1', 'tri x2', {height: 60, lineWidth: 2, lineColor: [237, 20, 91], resolution: 2})
        .addValuePlotter(object, 'changeValue1', 'tri x4', {height: 60, lineWidth: 4, lineColor: [237, 20, 91], resolution: 4})
        .addValuePlotter(object, 'changeValue1', 'tri x8', {height: 60, lineWidth: 8, lineColor: [237, 20, 91], resolution: 8})
        .addValuePlotter(object, 'changeValue1', 'tri x16', {height: 60, lineWidth: 16, lineColor: [237, 20, 91], resolution: 16});

    control5 = controlKit.addPanel({label: 'YAY Panel Big', width: 100, position: [690, 405], fixed: false});

    control5.addGroup()
        .addSubGroup()
        .addPad(object, 'xyValue', 'pad')
        .addPad(object, 'xyValue', 'pad')
        .addPad(object, 'xyValue', 'pad')
        .addPad(object, 'xyValue', 'pad');

    */







        var t = 0.0;
        var sint;
        function updateObject()
        {
            object.output = randomString(2000);

            t+=object.slideValue;

            object.changeValue0 = object.funcTarget(t);//sgn(sint);
            sint = Math.sin(t);

            object.changeValue1 = tri(sint);

            object.changeValue2 = randomFloat(-1,1);
            object.changeValue3 = rect(sint);
            object.changeValue4 = randomInteger(-1,1);
            object.changeValue5 = frac(sint);
            object.changeValue6 = sint;

            object.slideValue0 = sin(object.slideValue+0.1);

            /*
            t+=object.xyChangeValue[0];
            t+=randomFloat(-1,1)*object.xyChangeValue[1];
            sint = Math.sin(t);

            object.changeValue1 = tri(sint);

            object.changeValue2 = randomFloat(-1,1);
            object.changeValue3 = rect(sint);
            object.changeValue4 = randomInteger(-1,1);
            object.changeValue5 = frac(sint);
            object.changeValue6 = sint;
            controlKit.update();
            */

            controlKit.update();
        }

        function loop(){requestAnimationFrame(loop);updateObject();}loop();

    function randomString(len, charSet) {
        charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var randomString = '';
        for (var i = 0; i < len; i++) {
            var randomPoz = Math.floor(Math.random() * charSet.length);
            randomString += charSet.substring(randomPoz,randomPoz+1);
        }
        return randomString;
    }




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


