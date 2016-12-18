import ControlKit from '../../index';

window.addEventListener('load',()=>{
    new ControlKit().addPanel()
        .addButton('test',{onChange:function(){
            this.name = Math.random();
        }})
});