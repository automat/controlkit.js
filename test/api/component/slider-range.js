import ControlKit from '../../../index';

function main(){
    const settings = {a:0};

    new ControlKit()
        .addPanel()
        .addSlider(settings,'a',{
            // type : 'int',
            range : [-20,20],
            onChange : (value)=>{
                console.log(value);
            }
        });
}

window.addEventListener('load',main);