
var imports = [

               'dom/ckCSS.js',
               'dom/ckMouse.js',

               'dom/ckNodeEvent.js',
               'dom/ckNodeType.js',
               'dom/ckNode.js',

               'global/ckLayout.js',
               'global/ckManager.js',

               'components/internal/ckOptions.js',

               'controlKit.js',

               'components/internal/ckComponent.js',
               'components/internal/ckObjectComponent.js',
               'components/internal/ckNumberInput_Internal.js',
               'components/internal/ckSlider_Internal.js',
               'components/internal/ckCanvas.js',
               'components/internal/ckCanvasComponent.js',


               'components/ckBlock.js',

               'components/ckStringInput.js',
               'components/ckButton.js',

               'components/ckNumberInput.js',
               'components/ckRange.js',
               'components/ckCheckbox.js',
               'components/ckSlider.js',
               'components/ckSelect.js',

               'components/ckFunctionPlotter.js',
               'components/ckPad.js'

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
                  xyValue:[0.25,-0.35]
                  };

    ControlKit.init(parentDomElementId);

    var control0 = new ControlKit({label:'Basic Controls',width:250,position:[10,10]});

    /*
    control0.addBlock('Block 1')
            .addStringInput(object,'string','String Comp')
            .addStringInput(object,'string','String Comp')
            .addNumberInput(object,'number','Number Comp')
            .addButton('BUMM',function(){})
            .addRange(object,'range','Range Comp')
            .addCheckbox(object,'bool','Bool Comp')
            .addSlider(object,'range','slideValue','slider')
            .addSelect(object,'selectOptions','selectTarget','Select Comp')
            .addFunctionPlotter(object,'func','Function',{bounds:[-1,1,-1,1]});
            */

    control0.addBlock('Block 1')
            .addPad(object,'xyValue','Pad Comp')
        .addStringInput(object,'xyValue')
            .addPad(object,'xyValue','Pad Comp')
            .addStringInput(object,'xyValue')
        .addStringInput(object,'string','String Comp')
        .addStringInput(object,'string','String Comp')
        .addNumberInput(object,'number','Number Comp')
        .addButton('BUMM',function(){})
        .addRange(object,'range','Range Comp')
        .addCheckbox(object,'bool','Bool Comp')
        .addSlider(object,'range','slideValue','slider')
        .addSelect(object,'selectOptions','selectTarget','Select Comp')
        .addFunctionPlotter(object,'func','Function',{bounds:[-1,1,-1,1]});






}

