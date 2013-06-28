var fs = require('fs');

var rootPath = '../../src/controlKit/',
    files    = [
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


function concat(rootPath, fileList, stylePath, distPath)
{
    var out = fileList.map(function(filePath){return fs.readFileSync(rootPath + filePath, 'utf-8');}).join('\n') /*+ "\nControlKit.CSS.Style=\"" + fs.readFileSync(rootPath + stylePath,'utf-8').replace(/\s/gm,' ') + "\";" */;
    fs.writeFileSync(distPath, out, 'utf-8');
}

concat(rootPath,files,'style/style.css','../../bin/controlKit.js');



