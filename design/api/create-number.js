const controlKit = new ControlKit();
//minimal
controlKit.addNumber(object,'numberValue');

//all options
controlKit.addString(object,'numberValue',{
    label : 'Some Label',
    readonly : false,
    color : 'white',
    preset : object.numberValuePreset,
    onChange : (value)=>{
        console.log(value);
    },
    onFinish : (value)=>{
        console.log(value);
    }
});

controlKit.addObject({

});