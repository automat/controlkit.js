import ControlKit from '../../../index';

function main(){
    const settings = {a:0.5};

    new ControlKit().addPanel()
        .addSlider(settings,'a', {color: '#fff'})
        .addSlider(settings,'a', {color: '#ff0'})
        .addSlider(settings,'a', {color: '#f0f'});
}

window.addEventListener('load',main);