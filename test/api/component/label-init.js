import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    new ControlKit().addPanel()
        .addLabel('A label component')
});