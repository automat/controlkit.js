import ControlKit from '../../../index';

function main(){
    const settings = {a:0.5};

    const controlKit = new ControlKit();
    controlKit.addPanel()
        .addSlider(settings,'a',{id:'slider'});

    const ranges = [
        [0.0,1.0],
        [0.25,0.75],
        [0.0, 10.0],
        [-1.0,1.0],
        [0.0,0.5]
    ];

    let index = 0;
    setInterval(()=>{
        controlKit.get('slider').range = ranges[index];
        index = (index + 1) % ranges.length;
    },250);
}

window.addEventListener('load',main);