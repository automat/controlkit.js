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
const panel = controlKit.addPanel()
    .addFromDescription([{
        label : 'Group-A',
        subGroup : [{
            label : 'Sub-Group-A',
            height : 300,
            comps : [{
                object : object,
                value : 'numberValue'
            },{
                object : object,
                value : 'stringValueA',
                readonly : true,
                label : 'String'
            },{
                object : object,
                value : 'stringValueB',
                readonly : true
            }]
        }]
    },{
        label : 'Group-B',
        subGroup : [{
            label : 'Sub-Group-B',
            comps : [{
                object : object.sub,
                value : 'sliderValue',
                type : 'slider',
                range : [0,1]
            },{
                object : object.sub,
                value : 'imageSelected',
                type: 'select',
                options : object.sub.imageOptions,
                selected : object.sub.imageOptions[0]
            },{
                object : object.sub,
                value: 'imageOptions',
                selected : object.sub.imageOptions[0],
                type: 'image-matrix-2'
            }]
        }]
    }]);