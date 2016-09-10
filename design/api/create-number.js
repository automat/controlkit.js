const object = {
    numberValue : 1,
    numberValuePreset : [10,11,12],
    numberValueMultiple : [2,3,4]
};

const controlKit = new ControlKit();
//single

//minimal
controlKit.addNumber(object,'numberValue');

//all options
controlKit.addString(object,'numberValue',{
    label : 'Some Label',
    readonly : false,
    preset : object.numberValuePreset,
    onChange : (value)=>{
        console.log(value);
    },
    onFinish : (value)=>{
        console.log(value);
    },
    colorInput : 'white',
    colorInputBackground : 'blue',
    colorInputShadow : 'black',
    colorBackground : 'black',
    colorLabel : 'black',
    colorLabelShadow : 'black'
});

controlKit.addObject({

});


//multiple

//minimal multiple
controlKit.addNumber(object,'numberValueMultiple');

controlKit.addNumber(object,'numberValueMultiple',{
    label : ['Some Label A','Some Label B','Some Label C'],
    readonly : [true,true,false],
    preset : [object.numberValuePreset],
    onChange : [
        (value)=>{},
        (value)=>{},
        (value)=>{}
    ],
    onFinish : (value)=>{},
    colorInput : 'white',
    colorInputBackground : 'blue',
    colorInputShadow : 'black',
    colorBackground : 'black',
    colorLabel : 'black',
    colorLabelShadow : 'black'
};