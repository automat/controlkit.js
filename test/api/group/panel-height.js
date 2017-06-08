import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {number:0};

    const panel = new ControlKit().addPanel({height : 200});
    for(let i = 0; i < 100; ++i){
        panel.addNumber(settings,'number');
    }
});