import ControlKit from '../../index';

function main(){
    const settings = {a:0};

    new ControlKit()
        .addPanel()
        .addSlider(settings,'a',{
            type : 'float',
            range : [0,1],
            step : 0.125,
            onChange : (value)=>{
                console.log(value);
            }
        });
}

window.addEventListener('load',main);