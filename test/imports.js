function importCK(pathToCK)
{
    var string;
    var imports = ['controlKit/components/ckDom.js',
                   'controlKit/components/ckOptions.js',
                   'controlKit/controlKit.js',
                   'controlKit/components/ckBlock.js',
                   'controlKit/components/ckComponent.js',
                   'controlKit/components/ckCheckbox.js',
                   'controlKit/components/ckTextField.js',
                   'controlKit/components/ckNumberInput_Internal.js',
                   'controlKit/components/ckButton.js',
                   'controlKit/components/ckRange.js',
                   'controlKit/components/ckStepper.js',
                   'controlKit/components/ckSlider_Internal.js',
                   'controlKit/components/ckSlider.js',
                   'controlKit/components/ckSelect.js',
                   'controlKit/components/ckPicker.js'
                  ];
    var i = -1;
    while(++i < imports.length)
    {
        string = '"'+ pathToCK + imports[i] + '"';
        document.write('<script type="text/javascript" src=' + string + '></script>' );
    }
}

importCK('../src/');



