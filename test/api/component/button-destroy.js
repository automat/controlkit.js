import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const controlKit = new ControlKit();
    controlKit.addPanel().addButton('test',{id:'button'});
    controlKit.get('button').destroy();
});