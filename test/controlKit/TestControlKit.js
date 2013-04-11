
var imports = [

               'dom/ckCSS.js',
               'dom/ckMouse.js',

               'dom/ckNodeEvent.js',
               'dom/ckNodeType.js',
               'dom/ckNode.js',

               'components/internal/ckOptions_Internal.js',

               'controlKit.js',

               'components/internal/ckComponent_Internal.js',
               'components/internal/ckNumberInput_Internal.js',
               'components/internal/ckSlider_Internal.js',


               'components/ckBlock.js',

               'components/ckStringInput.js',
               'components/ckButton.js',

               'components/ckNumberInput.js',
               'components/ckRange.js',
               'components/ckCheckbox.js',
               'components/ckSlider.js',
               'components/ckSelect.js'

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
                  selectTarget:null
                  };

    var control0 = new ControlKit(parentDomElementId);

    var block01 = control0.addBlock('Block 1');

    block01.addStringInput(object,'string','String Comp')
          .addStringInput(object,'string','String Comp')
          .addNumberInput(object,'number','Number Comp')
          .addButton('labba',function(){})
          .addRange(object,'range','Range Comp')
          .addCheckbox(object,'bool','Bool Comp')
          .addSlider(object,'range','slideValue','slider')
          .addSelect(object,'selectOptions','selectTarget','Select Comp');

    var block02 = control0.addBlock('Block 2');

    block02.addStringInput(object,'string','String Comp')
        .addStringInput(object,'string','String Comp')
        .addNumberInput(object,'number','Number Comp')
        .addButton('labba',function(){})
        .addRange(object,'range','Range Comp')
        .addCheckbox(object,'bool','Bool Comp')
        .addSlider(object,'range','slideValue','slider')
        .addSelect(object,'selectOptions','selectTarget','Select Comp');


    var block2 = control0.addBlock('Block 2');

    var control1 = new ControlKit(parentDomElementId,{position:[330,20]});

    var block11 = control1.addBlock('Block 1');

    block11.addStringInput(object,'string','String Comp')
        .addStringInput(object,'string','String Comp')
        .addNumberInput(object,'number','Number Comp')
        .addButton('labba',function(){})
        .addRange(object,'range','Range Comp')
        .addCheckbox(object,'bool','Bool Comp')
        .addSlider(object,'range','slideValue','slider')
        .addSelect(object,'selectOptions','selectTarget','Select Comp');

    var control2 = new ControlKit(parentDomElementId,{position:[640,20]});

    var block21 = control2.addBlock('Block 1');

    block21.addStringInput(object,'string','String Comp')
        .addStringInput(object,'string','String Comp')
        .addNumberInput(object,'number','Number Comp')
        .addButton('labba',function(){})
        .addRange(object,'range','Range Comp')
        .addCheckbox(object,'bool','Bool Comp')
        .addSlider(object,'range','slideValue','slider')
        .addSelect(object,'selectOptions','selectTarget','Select Comp');


}

