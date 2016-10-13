import NumberInput from '../../src/component/NumberInput';

function main(){
    const input = new NumberInput({min:0});

    document.body.appendChild(input.element);
}

window.addEventListener('load',main);
