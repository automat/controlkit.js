var imports = [
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
{
    string = '"' + '../../src/controlKit/' + imports[i] + '"';
    document.write('<script type="text/javascript" src=' + string + '></script>');
}


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


    var f = 1 / 6;
    var t = 0.0;
    var sint;

    function updateObject()
    {


        t += object.slideValue;

        object.changeValue0 = sin(t);//object.funcTarget(t);//sgn(sint);

        sint = Math.sin(t);

        object.changeValue1 = tri(sint);
        object.changeValue2 = rect(sint);
        object.changeValue3 = saw(sint);
        object.changeValue6 = object.funcTarget(sint);


        controlKit.update();
    }

    function loop()
    {
        requestAnimationFrame(loop);
        updateObject();
    }

    loop();

    function randomString(len, charSet)
    {
        charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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

