import ControlKit from '../../../index';

window.addEventListener('load',()=>{
    const settings = {a : 'abc'};

    new ControlKit().addPanel()
        .addString(settings,'a',{
            onChange : (value)=>{
                console.log(value);
            }
        });
});