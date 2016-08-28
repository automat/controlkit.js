const controlKit = new ControlKit();
//minimal
controlKit.addString(object,'stringValue');

//all options
controlKit.addString(object,'stringValue',{
    label : 'Some Label',
    readonly : false,
    color : 'white',
    lines : 4,
    preset : object.stringValuePreset,
    onChange : (value,comp)=>{
        console.log(value);
    },
    onFinish : (value)=>{
        console.log(value);
    }
});