import ControlKit from '../../../index';

function main(){
    const settings = {a:0};

    new ControlKit()
        .addPanel()
        .addSlider(settings,'a');
}

window.addEventListener('load',main);