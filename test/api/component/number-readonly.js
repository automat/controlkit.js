import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {a:0};

    const controlKit = new ControlKit();

    controlKit.addPanel()
        .addNumber(settings,'a',{id:'number'});

    controlKit.get('number').destroy();
});