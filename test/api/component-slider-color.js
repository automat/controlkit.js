import ControlKit from '../../index';

function main(){
    const settings = {a:0.5};

    new ControlKit().add({
        components : [
            {type: 'slider', label: 'slider a', object:settings, key: 'a'},
            {type: 'slider', label: 'slider b', object:settings, key: 'a', color: '#fff'},
            {type: 'slider', label: 'slider c', object:settings, key: 'a', color: '#ff0'},
            {type: 'slider', label: 'slider d', object:settings, key: 'a', color: '#0ff'}
        ]
    })
}

window.addEventListener('load',main);