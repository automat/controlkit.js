import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {a : 'abc'};

    const controlKit = new ControlKit();
    controlKit.addPanel()
        .addString(settings,'a',{id : 'string'});

    controlKit.get('string').destroy();
});