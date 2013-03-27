
var imports = ['controlKit/dom/ckNode.js',
               'controlKit/dom/ckCSS.js',
               'controlKit/controlKit.js',

               'controlKit/components/ckBlock.js',
               'controlKit/components/ckComponent_Internal.js',
               'controlKit/components/ckStringInput.js',
               'controlKit/components/ckButton.js',
               'controlKit/components/ckNumberInput_Internal.js',
               'controlKit/components/ckNumberInput.js',
               'controlKit/components/ckRange.js',
               'controlKit/components/ckCheckbox.js'
              ];
var i = -1,string;
while(++i < imports.length)
{
    string = '"' + '../src/' + imports[i] + '"';
    document.write('<script type="text/javascript" src=' + string + '></script>');
}

function TestControlKit(parentDomElementId)
{
    var object = {string:'lorem ipsum',
                  number:26.0,
                  range:[0,1],
                  bool:true};

    var control = new ControlKit(parentDomElementId);

    var block1 = control.addBlock('Block 1');

    block1.addStringInput(object,'string','String Comp')
          .addStringInput(object,'string','String Comp')
          .addNumberInput(object,'number','Number Comp')
          .addButton('labba',function(){})
          .addRange(object,'range','Range Comp')
          .addCheckbox(object,'bool','Bool Comp');


    var block2 = control.addBlock('Block 2');

}

