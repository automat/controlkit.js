import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {range : [0,1]};

    new ControlKit().addPanel()
        .addRange(settings,'range');
});