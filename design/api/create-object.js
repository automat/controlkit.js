const image0 = new Image();
const image1 = new Image();
const image2 = new Image();

//image loading...

const object = {
    numberValue : 1.0,
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

const controlKit = new ControlKit();
const panel = controkKit.addPanel()
    .addFromObject(object);