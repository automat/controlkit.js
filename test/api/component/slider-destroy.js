import ControlKit from '../../../index';

function main(){
    const settings = {a:0};

    const controlKit = new ControlKit();
    controlKit.addPanel()
        .addSlider(settings,'a',{id:'slider'});

    controlKit.get('slider').destroy();
}

window.addEventListener('load',main);