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

const controkKit = new ControlKit();
const panel = controkKit.addPanel()
    .addGroup({label:'Group-A'})
        .addSubGroup({label:'Sub-Group-A',height:300})
            .addNumber(object,'numberValue')
            .addString(object,'stringValueA',{label:'String',readonly:true})
            .addString(object,'stringValueB',{readonly:true})
    .addGroup({label:'Group-B'});
        .addSubGroup({label:'Sub-Group-B'})
            .addSlider(object.sub,'sliderValue',[0,1])
            .addSelect(object.sub,'imageSelected','imageOptions')
            .addSelect(object.sub,'imageSelected','imageOptions',{type:'matrix-2'});