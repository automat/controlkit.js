var imports = [
<<<<<<< HEAD
    'controlKit.js',
    'core/event/ckEvent.js',
    'core/event/ckEventDispatcher.js',
    'core/event/ckEventType.js',
    'core/color/ckColorMode.js',
    'core/layout/ckLayoutMode.js',
    'core/ckMetric.js',
    'core/ckPreset.js',
    'core/ckDefault.js',
    'core/ckHistory.js',
    'core/error/ckError.js',
    'core/error/ckErrorUtil.js',
    'core/ckKit.js',
    'core/dom/css/ckCSS.js',
    'core/dom/event/ckDocumentEventType.js',
    'core/dom/ckMouse.js',
    'core/dom/event/ckNodeEventType.js',
    'core/dom/ckNodeType.js',
    'core/dom/ckNode.js',
    'core/component/ckComponent.js',
    'core/component/ckObjectComponent.js',
    'core/component/ckSVGComponent.js',
    'core/color/ckColorUtil.js',
    'core/layout/ckScrollBar.js',
    'core/group/ckAbstractGroup.js',
    'core/group/ckGroup.js',
    'core/group/ckSubGroup.js',
    'core/ckPanel.js',
    'component/internal/ckOptions.js',
    'component/internal/ckNumberInput_Internal.js',
    'component/internal/ckSlider_Internal.js',
    'component/internal/ckPlotter.js',
    'component/internal/ckPresetBtn.js',
    'component/internal/ckOutput.js',
    'component/internal/ckFunctionPlotType.js',
    'component/ckStringInput.js',
    'component/ckNumberInput.js',
    'component/ckButton.js',
    'component/ckRange.js',
    'component/ckCheckbox.js',
    'component/ckSlider.js',
    'component/ckSelect.js',
    'component/ckColor.js',
    'component/ckFunctionPlotter.js',
    'component/ckPad.js',
    'component/ckValuePlotter.js',
    'component/ckStringOutput.js',
    'component/ckNumberOutput.js',
    'component/internal/ckPicker.js',
    'component/ckCanvas.js',
    'component/ckSVG.js'









];
var i = -1, string;
while (++i < imports.length)
=======
               'controlKit.js',

               'core/event/ckEvent.js',
               'core/event/ckEventDispatcher.js',
               'core/event/ckEventType.js',

               'core/color/ckColorMode.js',
               'core/layout/ckLayoutMode.js',
               'core/ckMetric.js',
               'core/ckPreset.js',

               'core/ckDefault.js',
               'core/ckHistory.js',

               'core/error/ckError.js',
               'core/error/ckErrorUtil.js',
               'core/ckKit.js',

               'core/dom/css/ckCSS.js',

               'core/dom/event/ckDocumentEventType.js',
               'core/dom/ckMouse.js',

               'core/dom/event/ckNodeEventType.js',
               'core/dom/ckNodeType.js',
               'core/dom/ckNode.js',

               'core/component/ckComponent.js',
               'core/component/ckObjectComponent.js',
               'core/component/ckSVGComponent.js',

               'core/color/ckColorUtil.js',


               'core/layout/ckScrollBar.js',
               'core/group/ckAbstractGroup.js',
               'core/group/ckGroup.js',
               'core/group/ckSubGroup.js',


               'core/ckPanel.js',

               'component/internal/ckOptions.js',
               'component/internal/ckNumberInput_Internal.js',
               'component/internal/ckSlider_Internal.js',
               'component/internal/ckPlotter.js',
               'component/internal/ckPresetBtn.js',
               'component/internal/ckOutput.js',
               'component/internal/ckFunctionPlotType.js',

               'component/ckStringInput.js',
               'component/ckNumberInput.js',

               'component/ckButton.js',

               'component/ckRange.js',
               'component/ckCheckbox.js',
               'component/ckSlider.js',
               'component/ckSelect.js',
               'component/ckColor.js',

               'component/ckFunctionPlotter.js',
               'component/ckPad.js',
               'component/ckValuePlotter.js',
               'component/ckStringOutput.js',
               'component/ckNumberOutput.js',

               'component/internal/ckPicker.js',

               'component/ckCanvas.js',
               'component/ckSVG.js'
              ];

var i = -1,string;
while(++i < imports.length)
>>>>>>> 57e07ce22ec20386faf89ac773b044ea0cd14145
{
    string = '"' + '../../src/controlKit/' + imports[i] + '"';
    document.write('<script type="text/javascript" src=' + string + '></script>');
}


<<<<<<< HEAD
function TestControlKit(parentDomElementId)
{
    var object = {string: 'lorem ipsum',
        stringPresets: ['hy', 'well', 'bummm'],
        number: 26.0,
        numberPresets: [10.0, 20.0, 345.0, 12.0],
        range: [-1, 1],
        bool: true,
        slideValue: 0.1,
        selectOptions: ['hello', 'bello', 'cello'],
        selectTarget: 'hello',
        func: function (x)
=======



function TestControlKit(parentDomElementId)
{
    var object = {string:'lorem ipsum',
                  randomString : '',
                  stringPresets:['hy','well','bummm'],
                  number:26.0,
                  numberPresets:[10.0,20.0,345.0,12.0],
                  range:[-10,10],
                  bool:true,
                  slideValue:0.0,
                  selectOptions:['hello','bello','cello'],
                  selectTarget:'hello',
                  func:function(x){return sin(x);},
                  func2:function(x){return x*x;},

                  funcs:[function(x){return randomFloat(sin(x));},
                         function(x){return stepSmooth(sin(x))},
                         function(x){return stepSmoothSquared(sin(x))},
                         function(x){return stepSmoothInvCubed(sin(x))},
                         function(x){return stepSmoothSquared(sin(x))},
                         function(x){return stepSmoothInvSquared(sin(x))},
                      function(x){return stepSmoothCubed(sin(x))},
                      function(x){return stepSmoothInvCubed(sin(x))},
                      function(x){return stepSquared(sin(x))},
                      function(x){return stepInvSquared(sin(x))},
                      function(x){return stepCubed(sin(x))},
                      function(x){return stepInvCubed(sin(x))}],
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
        slideValue7:0.01,
        implicitFunc : function(x,y)
        {
            var t = this.slideValue + this.funcs[0](x)*this.slideValue0,
                v = this.slideValue1,
                u = this.slideValue2;

            return sin(v*abs(x)+t)*sin(u*abs(y)+t);
        },

                   selectColorOptions : ['#5b3f95','#121212','#B32435'],
                   selectColorTarget  : null,
                   color0 : '#5b3f95',
                   colorArrInt : [255,255,255],
                   colorArrIntPreset : [[0,0,0],[0,255,0],[0,0,255],[255,0,0]],
                   colorArrFloat : [0.2,0.1225,0.5],
                   colorArrFloatPreset : [[0,0.1,0],[0.25,0.1,0]]
                  };

    object.funcTarget = object.funcs[0];
    object.selectColorTarget = object.selectColorOptions[0];

    var controlKit = new ControlKit.Kit(parentDomElementId);

    var panel0 = controlKit.addPanel({width:200,dock:{align:'left'}});

        panel0.addGroup({label:'File IO'})
            .addSubGroup({label:'Sub Settings'})
            .addNumberInput(object,'number',{dp:4,presets:'numberPresets'})
            .addStringInput(object,'string')
            .addColor(   object, 'color0',       {presets:'selectColorOptions'})
            .addColor(   object, 'colorArrInt',  {colorMode:'rgb',presets:'colorArrIntPreset'})
            .addColor(   object, 'colorArrFloat',{colorMode:'rgbfv',presets:'colorArrFloatPreset'})
            .addSelect(  object, 'selectOptions')
            .addCheckbox(object, 'bool')
            .addSlider(  object, 'slideValue', 'range')
            .addRange(   object, 'range')
            .addSlider(  object, 'slideValue0', 'range')
            .addSlider(  object, 'slideValue1', 'range')
            .addSlider(  object, 'slideValue2', 'range')
            .addSubGroup({label:'Track Vals'})
            .addValuePlotter(object, 'changeValue2', {height: 35, lineWidth: 2, lineColor: [237, 20, 91]})
            .addValuePlotter(object, 'changeValue3', {height: 35, lineWidth: 2})
            .addValuePlotter(object, 'changeValue2', {height: 35, lineColor: [237, 20, 91]})
            .addValuePlotter(object, 'changeValue3', {height: 35})
            .addValuePlotter(object, 'changeValue3', {height: 35})



    var panel1 = controlKit.addPanel({width:150,dock:{align:'right'}});

        panel1.addGroup()
              .addSubGroup({useLabels:false})
              .addFunctionPlotter(object,'funcTarget')
              .addFunctionPlotter(object,'implicitFunc')
            .addFunctionPlotter(object,'implicitFunc')
            .addFunctionPlotter(object,'implicitFunc')
            .addFunctionPlotter(object,'implicitFunc')
             // .addStringOutput(object,'implicitFunc',{height:100});

    panel0 = controlKit.addPanel({width:200,align:'left'});

    panel0.addGroup({label:'File IO',align:'left'})
        .addSubGroup({label:'Sub Settings'})
        .addNumberInput(object,'number',{dp:4,presets:'numberPresets'})
        .addStringInput(object,'string')
        .addColor( object, 'color0',{presets:'selectColorOptions'})
        .addColor(   object, 'colorArrInt',{colorMode:'rgb',presets:'colorArrIntPreset'})
        .addColor(   object, 'colorArrFloat',{colorMode:'rgbfv',presets:'colorArrFloatPreset'})
        .addSelect(  object, 'selectOptions')
        .addCheckbox(object,'bool')
        .addSlider(  object, 'slideValue', 'range')
        .addRange(   object,'range')
        .addSlider(  object,'slideValue0', 'range')
        .addSlider(  object,'slideValue1', 'range')
        .addSlider(  object,'slideValue2', 'range')







    panel1 = controlKit.addPanel({width:50});
    group0 = panel1.addGroup({label:'Button Bay'})
        .addSubGroup({useLabels:false})
        .addButton('boom')
        .addButton('boom')
        .addButton('boom')
        .addButton('boom')
        .addButton('boom')
        .addButton('boom')
        .addButton('boom')
        .addButton('boom')
        .addButton('boom')
        .addButton('boom')
        .addButton('boom')


    var panel1 = controlKit.addPanel({label:'non-fixed',
                                      width: 200,
                                      fixed: false,
                                      align: 'left',
                                      position:[100,100]}),
        group0 = panel1.addGroup()
            .addSubGroup({label:'Graph'})
            .addSlider(  object, 'slideValue', 'range')
            .addFunctionPlotter(object,'funcTarget',{label:'none'})
            .addSelect(object,'funcs',{target:'funcTarget'})
            //.addStringOutput(object,'funcTarget')
           // .addStringOutput(object,'randomString',{wrap:true,height:100,label:'none'})
           // .addStringOutput(object,'range',{wrap:true,height:100,label:'none'});

    panel1 = controlKit.addPanel({label:'non-fixed right',
                                      width: 200,
                                      fixed: false,
                                      align:'right',
                                      position:[0,100]});
        panel1.addGroup()
            .addSubGroup({label:'Graph',enable:false})
            .addSlider(  object, 'slideValue', 'range')
            .addFunctionPlotter(object,'funcTarget',{height:100})
            .addSubGroup()
            .addPad(object,'xyChangeValue')
            //.addStringOutput(object,'xyChangeValue',{height:50});




    /*
    var panel1 = controlKit.addPanel({width: 100,
                                      align:'right',
                                      position:[100,200],
                                      fixed:false,
                                      label:'Graph Control'}),
        group0 = panel1.addGroup()
            .addSubGroup({label:'Graph'})
            .addSlider(  object, 'slideValue', 'range')
            .addFunctionPlotter(object,'funcTarget',{label:'none'})
            */




    /*

        panel0 = controlKit.addPanel({width: 200, dock:{align:'left'}});
        panel0.addGroup()
              .addSubGroup({label: 'File IO'})
              .addButton('Load',null,{label:'none'})
              .addButton('Save',null,{label:'none'})
              .addButton('Save As',null,{label:'none'})
            .addSubGroup({label: 'Color Setup'})
              .addColor(object,'color0')
              .addColor(object,'color0',{presets:'selectColorOptions'})
              .addSelect(object,'selectColorOptions','selectColorTarget')
              .addButton('Apply value')
            .addSubGroup({label:'Misc'})
              .addNumberInput(object,'number',{presets: 'numberPresets'})

              .addFunctionPlotter(object, 'funcTarget', {label: 'Graph'})
              .addStringOutput(object, 'funcTarget')
              .addSelect(object, 'funcs', 'funcTarget')
              .addSubGroup({label: 'Function Plot'})

              .addRange(object, 'range')
              .addSlider(object, 'range', 'slideValue');

    panel0.addGroup()
        .addSubGroup({label: 'File IO'})
        .addButton('Load',null,{label:'none'})
        .addButton('Save',null,{label:'none'})
        .addButton('Save As',null,{label:'none'})
        .addSubGroup({label: 'Color Setup'})
        .addColor(object,'color0')
        .addColor(object,'color0',{presets:'selectColorOptions'})
        .addSelect(object,'selectColorOptions','selectColorTarget')
        .addButton('Apply value')
        .addSubGroup({label:'Misc'})
        .addNumberInput(object,'number',{presets: 'numberPresets'})

        .addFunctionPlotter(object, 'funcTarget', {label: 'Graph'})
        .addStringOutput(object, 'funcTarget')
        .addSelect(object, 'funcs', 'funcTarget')
        .addSubGroup({label: 'Function Plot'})

        .addRange(object, 'range')
        .addSlider(object, 'range', 'slideValue');





    var panel1 = controlKit.addPanel({width: 100, align:'left', fixed: false, position:[400,20]}),
        group0 = panel1.addGroup()
            .addSubGroup({label:'Graph'})
            .addSelect(object,'funcs','funcTarget',{label:'Choose'})
            .addFunctionPlotter(object,'funcTarget',{label:'none'})
            .addStringOutput(object,'funcTarget',{label:'none'})

        ;


    var panel0 = controlKit.addPanel({width: 200, align:'left', fixed: false, position:[20,20]}),
        group0 = panel0.addGroup()
                       .addSubGroup()
                       .addValuePlotter(object, 'changeValue1',{height:35,lineWidth:2,resolution:4})
            .addValuePlotter(object, 'changeValue2',{lineWidth:2})
            .addSubGroup({label:'Graph'})
            .addSelect(object,'funcs','funcTarget',{label:'Choose'})
            .addFunctionPlotter(object,'funcTarget',{label:'none'})
            .addStringOutput(object,'funcTarget',{label:'none'})
            ;







    panel0.addGroup()
        .addSubGroup()
        .addSelect(object, 'selectOptions', 'selectTarget')
        .addSelect(object, 'selectOptions', 'selectTarget')
        .addSubGroup('subgroup 2')
        .addRange(object, 'range' )
        .addCheckbox(object, 'bool')
        .addSubGroup('subgroup 3')
        .addNumberOutput(object, 'xyValue', {wrap: true, height: 40, dp: 4})








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





    var control0 = controlKit.addPanel({width: 200,align: 'left', fixed: false, position: [420, 20]});
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


        .addSubGroup({label: 'grain', show: false})
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
        .addSlider(object,'range','slideValue3')
        .addSlider(object,'range','slideValue2')
        .addSlider(object,'range','slideValue1')
        .addSlider(object,'range','slideValue0')
        .addSlider(object,'range','slideValue')









    var control0 = controlKit.addPanel({width: 200,align: 'left', fixed: false, position: [620, 20]})


    control0.addGroup()
        .addSubGroup()

        .addSelect(object, 'selectOptions', 'selectTarget')
        .addButton('body go!')
        .addSubGroup()
        .addRange(object, 'range')
        .addCheckbox(object, 'bool');

    */















        /*
    */

    /*
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
>>>>>>> 57e07ce22ec20386faf89ac773b044ea0cd14145
        {
            return sin(x);
        },
        func2: function (x)
        {
            return x * x;
        },


        funcs: [function (x)
        {
            return randomFloat(sin(x));
        },
            function (x)
            {
                return stepSmooth(sin(x))
            },
            function (x)
            {
                return stepSmoothSquared(sin(x))
            },
            function (x)
            {
                return stepSmoothInvCubed(sin(x))
            },
            function (x)
            {
                return stepSmoothSquared(sin(x))
            },
            function (x)
            {
                return stepSmoothInvSquared(sin(x))
            },
            function (x)
            {
                return stepSmoothCubed(sin(x))
            },
            function (x)
            {
                return stepSmoothInvCubed(sin(x))
            },
            function (x)
            {
                return stepSquared(sin(x))
            },
            function (x)
            {
                return stepInvSquared(sin(x))
            },
            function (x)
            {
                return stepCubed(sin(x))
            },
            function (x)
            {
                return stepInvCubed(sin(x))
            }],
        funcTarget: null,

        xyValue: [0.25, -0.35],
        changeValue0: 0.0,
        changeValue1: 0.0,
        changeValue2: 0.0,
        changeValue3: 0.0,
        changeValue4: 0.0,
        changeValue5: 0.0,
        changeValue6: 0.0,
        xyChangeValue: [0.1, 0.1],
        output: '',
        slideValue0: 0.01,
        slideValue1: 0.01,
        slideValue2: 0.01,
        slideValue3: 0.01,
        slideValue4: 0.01,
        slideValue5: 0.01,
        slideValue6: 0.01,
        slideValue7: 0.01,

        implFunc0: function (x, y)
        {
            return cos(x * 8 + randomFloat(-1, 1) * this.xyValue[0] * 4) * sin(y * 8 + randomFloat(-1, 1) * this.xyValue[1] * 4)
        },
        implFunc1: function (x, y)
        {
            return pow(sin((x + randomFloat(-1, 1) * this.xyValue[0]) * (y + randomFloat(-1, 1) * this.xyValue[1]) * 100), 8)
        },

        selectColorOptions: ['#5b3f95', '#121212', '#B32435'],
        selectColorTarget: null,
        color0: '#5b3f95',
        color1: '#ed4063',
        color2: [1, 1, 1]
    };

    object.funcTarget = object.funcs[0];
    object.selectColorTarget = object.selectColorOptions[0];

    var controlKit = new ControlKit.Kit(parentDomElementId, {history: true});
    var panel = controlKit.addPanel({label: 'Panel 1 Left', align: 'left', width: 200}),
        group = panel.addGroup();
    group.addSubGroup({label: 'SubGroup 1'})
        .addNumberInput(object, 'number', {label: 'Num'})
        .addNumberInput(object, 'number', {presets: 'numberPresets', label: 'Num/wP'})
    group.addSubGroup({label: 'SubGroup 2'})
        .addStringInput(object, 'string', {label: 'Str'})
        .addStringInput(object, 'string', {presets: 'stringPresets', label: 'Str/wP'})
    group.addSubGroup()
        .addSlider(object, 'slideValue', 'range', {label: 'Slide'})
        .addNumberInput(object, 'slideValue');

    panel = controlKit.addPanel({label: 'Panel 2 Left Floated', width: 250, align: 'left'})
    group = panel.addGroup({label: 'Group 1'})
    group.addSubGroup({label: 'Sub Group 1'})
        .addCheckbox(object, 'bool', {label: 'Bool'})
        .addSelect(object, 'selectOptions', {label: 'Select', selectTarget: 'selectTarget'})
        .addButton('Button')
    group.addSubGroup({label: 'Sub Group with Visual Comps', height: 150})
        .addValuePlotter(object, 'changeValue0', {height: 80, label: 'Val 0 x1'})
        .addValuePlotter(object, 'changeValue1', {height: 80, label: 'Val 1 x1'})
        .addValuePlotter(object, 'changeValue2', {height: 80, label: 'Val 2 x1'})
        .addValuePlotter(object, 'changeValue3', {height: 80, label: 'Val 3 x1'})
    group.addSubGroup({label: 'Sub Group with Visual Comps'})
        .addValuePlotter(object, 'changeValue0', {height: 30, label: 'Val 0 x2', resolution: 2})
        .addValuePlotter(object, 'changeValue0', {height: 30, label: 'Val 0 x4', resolution: 4, lineWidth: 4, lineColor: [44, 123, 230]})
        .addValuePlotter(object, 'changeValue0', {height: 30, label: 'Val 0 x8', resolution: 8, lineWidth: 8})
        .addValuePlotter(object, 'changeValue0', {height: 30, label: 'Val 0 x16', resolution: 16, lineWidth: 16})
    group = panel.addGroup({label: 'Group 2'})
    group.addSubGroup()
        .addSlider(object, 'slideValue', 'range', {label: 'Slide'})
        .addRange(object, 'range', {label: 'Range'})
        .addNumberInput(object, 'slideValue');

    panel = controlKit.addPanel({label: 'Panel 3 Left Floated', align: 'left', width: 220})
    group = panel.addGroup({label: 'Group 1'})
    group.addSubGroup({label: 'Function Selection'})
        .addFunctionPlotter(object, 'funcTarget', {label: 'none'})
        .addSelect(object, 'funcs', {label: 'Functions', onChange: function (index)
        {
            object.funcTarget = object.funcs[index];
        }});
    group.addSubGroup({label: 'Function Output'})
        .addValuePlotter(object, 'changeValue6', {label: 'none', height: 100})
    group = panel.addGroup({label: 'Group 2 - Constrained Height'})
    group.addSubGroup({label: 'Function List', height: 200})
        .addFunctionPlotter(object, 'func')
        .addFunctionPlotter(object, 'func2')


    panel = controlKit.addPanel({label: 'Floating Color Panel', align: 'left', fixed: false, position: [650, 200], width: 200})
    group = panel.addGroup()
    group.addSubGroup({label: 'System Colors'})
        .addColor(object, 'color0')
        .addColor(object, 'color1')
        .addColor(object, 'color2', {colorMode: 'rgbfv'})
    group.addSubGroup({label: 'System Colors Compressed'})
        .addColor(object, 'color0', {presets: 'selectColorOptions'})

    group.addSubGroup({label: 'Button Battery'})
        .addButton('FIRE', {label: 'Label'})


    panel = controlKit.addPanel({dock: {align: 'right'}})
    group = panel.addGroup({label: 'Docked Panel Group 1'})
    group.addSubGroup({label: 'SubGroup 1'})
        .addNumberInput(object, 'number', {label: 'Num'})
        .addNumberInput(object, 'number', {presets: 'numberPresets', label: 'Num/wP'})
    group.addSubGroup({label: 'SubGroup 2'})
        .addStringInput(object, 'string', {label: 'Str'})
        .addStringInput(object, 'string', {presets: 'stringPresets', label: 'Str/wP'})
    group.addSubGroup()
        .addSlider(object, 'slideValue', 'range', {label: 'Slide'})
        .addNumberInput(object, 'slideValue');
    group = panel.addGroup({label: 'Group 1', enable: false})
    group.addSubGroup({label: 'Sub Group 1'})
        .addCheckbox(object, 'bool', {label: 'Bool'})
        .addSelect(object, 'selectOptions', {label: 'Select', selectTarget: 'selectTarget'})
        .addButton('Button')
    group.addSubGroup({label: 'Sub Group with Visual Comps', height: 150})
        .addValuePlotter(object, 'changeValue0', {height: 80, label: 'Val 0 x1'})
        .addValuePlotter(object, 'changeValue1', {height: 80, label: 'Val 1 x1'})
        .addValuePlotter(object, 'changeValue2', {height: 80, label: 'Val 2 x1'})
        .addValuePlotter(object, 'changeValue3', {height: 80, label: 'Val 3 x1'})
    group.addSubGroup({label: 'Sub Group with Visual Comps'})
        .addValuePlotter(object, 'changeValue0', {height: 30, label: 'Val 0 x2', resolution: 2})
        .addValuePlotter(object, 'changeValue0', {height: 30, label: 'Val 0 x4', resolution: 4, lineWidth: 4, lineColor: [44, 123, 230]})
        .addValuePlotter(object, 'changeValue0', {height: 30, label: 'Val 0 x8', resolution: 8, lineWidth: 8})
        .addValuePlotter(object, 'changeValue0', {height: 30, label: 'Val 0 x16', resolution: 16, lineWidth: 16})
    group = panel.addGroup({label: 'Group 2'})
    group.addSubGroup()
        .addSlider(object, 'slideValue', 'range', {label: 'Slide'})
        .addRange(object, 'range', {label: 'Range'})
        .addNumberInput(object, 'slideValue');
    group.addSubGroup({label: 'System Colors'})
        .addColor(object, 'color0')
        .addColor(object, 'color1')
        .addColor(object, 'color2', {colorMode: 'rgbfv'})
    group.addSubGroup({label: 'System Colors Compressed'})
        .addColor(object, 'color0', {presets: 'selectColorOptions'})

    group.addSubGroup({label: 'Button Battery'})
        .addButton('FIRE', {label: 'Label'})

    panel = controlKit.addPanel({align: 'right', width: 240})
    group = panel.addGroup()
    group.addSubGroup({label: 'Sub Group 1'})
        .addPad(object, 'xyValue', {label: 'none'})
    group.addSubGroup({label: 'Sub Group 2'})
        .addFunctionPlotter(object, 'implFunc0', {label: 'none'})
        .addFunctionPlotter(object, 'implFunc1', {label: 'none'});

    panel = controlKit.addPanel({label: 'Button Floater', width: 120, fixed: false, align: 'left'})
    panel.addGroup().addSubGroup()
        .addButton('Trigger 1', function ()
        {
        }, {label: 'none'})
        .addButton('Trigger 2', function ()
        {
        }, {label: 'none'})
        .addButton('Trigger 3', function ()
        {
        }, {label: 'none'})
        .addButton('Trigger 4', function ()
        {
        }, {label: 'none'})
        .addButton('Trigger 5', function ()
        {
        }, {label: 'none'})
        .addButton('Trigger 6', function ()
        {
        }, {label: 'none'})
        .addButton('Trigger 7', function ()
        {
        }, {label: 'none'})
        .addButton('Trigger 8', function ()
        {
        }, {label: 'none'})
        .addButton('Trigger 9', function ()
        {
        }, {label: 'none'})
        .addButton('Trigger 10', function ()
        {
        }, {label: 'none'})


<<<<<<< HEAD
    var f = 1 / 6;
    var t = 0.0;
    var sint;
=======
        var f = 1/6;
        var t = 0.0;
        var sint;
        function updateObject()
        {
            object.output = randomString(1000);
>>>>>>> 57e07ce22ec20386faf89ac773b044ea0cd14145

    function updateObject()
    {

<<<<<<< HEAD
=======
            /*
            object.changeValue0 = sin(t);//object.funcTarget(t);//sgn(sint);
            sint = Math.sin(t);
>>>>>>> 57e07ce22ec20386faf89ac773b044ea0cd14145

        t += object.slideValue;

        object.changeValue0 = sin(t);//object.funcTarget(t);//sgn(sint);

<<<<<<< HEAD
        sint = Math.sin(t);

        object.changeValue1 = tri(sint);
        object.changeValue2 = rect(sint);
        object.changeValue3 = saw(sint);
        object.changeValue6 = object.funcTarget(sint);
=======
            object.slideValue0 = sin(object.slideValue+f);
            object.slideValue1 = sin(object.slideValue0+f);
            object.slideValue2 = sin(object.slideValue1+f);
            object.slideValue3 = sin(object.slideValue2+f);
            object.slideValue4 = sin(object.slideValue3+f);
            object.slideValue5 = sin(object.slideValue4+f);
            */


            t+=object.xyChangeValue[0];
            t+=randomFloat(-1,1)*object.xyChangeValue[1];
            sint = Math.sin(t);
>>>>>>> 57e07ce22ec20386faf89ac773b044ea0cd14145


<<<<<<< HEAD
        controlKit.update();
    }

    function loop()
    {
        requestAnimationFrame(loop);
        updateObject();
    }
=======
            object.randomString = 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata ';//randomString(200);

            object.changeValue2 = randomFloat(-1,1);
            object.changeValue3 = rect(sint);
            object.changeValue4 = randomInteger(-1,1);
            object.changeValue5 = frac(sint);
            object.changeValue6 = sint;
            controlKit.update();

        }
>>>>>>> 57e07ce22ec20386faf89ac773b044ea0cd14145

    loop();

<<<<<<< HEAD
    function randomString(len, charSet)
    {
        charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
=======
    function randomString(len, charSet) {
        charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
>>>>>>> 57e07ce22ec20386faf89ac773b044ea0cd14145
        var randomString = '';
        for (var i = 0; i < len; i++)
        {
            var randomPoz = Math.floor(Math.random() * charSet.length);
            randomString += charSet.substring(randomPoz, randomPoz + 1);
        }
        return randomString;
    }


}

/**
 * Provides requestAnimationFrame in a cross browser way.
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */
if (!window.requestAnimationFrame)
{

    window.requestAnimationFrame = (function ()
    {

        return window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame || // comment out if FF4 is slow (it caps framerate at ~30fps: https://bugzilla.mozilla.org/show_bug.cgi?id=630127)
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function FrameRequestCallback */ callback, /* DOMElement Element */ element)
            {

                window.setTimeout(callback, 1000 / 60);

            };

    })();

}


