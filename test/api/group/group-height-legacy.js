import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    const panel = new ControlKit().addPanel().addGroup({label: 'group a', height: 300})

    for(let i = 0; i < 20; ++i){
        panel.addNumber(settings,'number');
    }

});