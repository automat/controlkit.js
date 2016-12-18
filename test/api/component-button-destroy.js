import ControlKit from '../../index';

window.addEventListener('load',()=>{
    const controlKit = new ControlKit();
    controlKit.addPanel()
        .addButton('test',{id:'button',onChange:function(){
            this.name = Math.random();
        }})
    controlKit.get('button').destroy();
});