import ControlKit from '../../index';

function loadImages(srcs,success,error){
    let index = 0;
    const loaded = [];
    const load = (src)=>{
        const image = new Image();
        image.onload = ()=>{
            loaded.push(image);
            if(index == srcs.length){
                success(loaded);
                return;
            }
            load(srcs[index++]);
        };
        image.src = src;
        image.onerror = error;
    };
    load(srcs[index++]);
}

function main(imgs){
    const panel = new ControlKit().addPanel();
    for(const img of imgs){
        panel.addImage(img);
    }
}

window.addEventListener('load',()=>{
    loadImages([
        '../test/assets/images/image-2.png',
        '../test/assets/images/image-1.png',
        '../test/assets/images/image-0.png'
    ],main,(e)=>{
        console.log(e);
    })
});