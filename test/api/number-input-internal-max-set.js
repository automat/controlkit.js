import NumberInput from '../../src/component/internal/NumberInputInternal';

function main(){
    const input = new NumberInput({max:20});
    input.value = 100;

    document.body.appendChild(input.element);
}

window.addEventListener('load',main);
