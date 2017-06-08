import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const controlKit = new ControlKit();
    controlKit.addPanel()
        .addButton('test',{id : 'test'})
        .addButton('hide',{
            label : 'toggle',
            onChange : function(){
                const btn = controlKit.get('test');
                btn.hide = !btn.hide;
                this.name = btn.hide ? 'show' : 'hide';
            }
        })
});