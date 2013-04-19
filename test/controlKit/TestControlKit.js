
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
               'components/internal/ckPlotter.js',


               'components/ckBlock.js',

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
               'components/ckNumberOutput.js'


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
        changeValue1:0.0
                  };

    ControlKit.init(parentDomElementId);

    var control0 = new ControlKit({label:'Basic Controls',width:280,position:[10,10]});


    control0.addBlock('Block 1')
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
            .addRange(object,'range','Range Comp')
            .addCheckbox(object,'bool','Bool Comp')
            .addSlider(object,'range','slideValue','slider')
            .addSelect(object,'selectOptions','selectTarget','Select Comp')
            .addFunctionPlotter(object,'func','Function',{bounds:[-1,1,-1,1]});




    var t = 0.0;
    function updateObject()
    {
        t+=0.1;
        object.changeValue0 = sgn(Math.sin(t));
        object.changeValue1 = tri(Math.sin(t));
        ControlKit.update();
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


