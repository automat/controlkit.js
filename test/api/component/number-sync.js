import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {a:0};

    const controlKit = new ControlKit();

    controlKit.add({
        comps : [
            {type:'number', object: settings, key: 'a', onChange: ()=>{console.log('changed 0');}},
            {type:'number', object: settings, key: 'a', onChange: ()=>{console.log('changed 1');}},
            {type:'slider', object: settings, key: 'a', range:[0,10]}
        ]
    });

    settings.a = 4;
    controlKit.sync();
});