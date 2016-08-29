const image0 = new Image();
const image1 = new Image();
const image2 = new Image();

//image loading...

const object = {
    numberValue : 1.0,
    numberValueOptions : [2.0,3.0],
    stringValueA : 'a',
    stringValueB : 'b',
    sliderValue : 1.0,
    sub : {
        imageSelected : image0,
        imageOptions : [
            image0,
            image1,
            image2
        ]
    }
};

//ambiguous
const controlKit = new ControlKit();
controlKit.addPanel()
    .add(object,'numberValue') //creates number input
    .add(object,'numberValue',{options:'numberValueOptions'}) //creates select
    .add(object,'numberVlaue',{range:[0,1]}) //creates slider
    .add(object,'numberValue',{options:'numberValueOptions',range:[0,1]}) //throws, select or slider?
    .add(object,'numberValue',{preset:'numberValueOptions'}) //creates number input with preset
    .add(object,'numberValue',{range:[0,1],preset:'numberValueOptions'}) //throws, slider doesnt have preset
    .add(object,'numberValue',{range:[0,1],options:'numberValueOptions'}) //throws, slider doenst have options