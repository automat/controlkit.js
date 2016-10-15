import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const settings = {string:'abc'};

    const controlKit = new ControlKit();
    controlKit.addPanel({fixed : true})
        .addString(settings,'string')
});