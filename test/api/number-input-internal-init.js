import NumberInput from '../../src/component/internal/NumberInputInternal';

function main(){
    const input = new NumberInput();

    document.body.appendChild(input.element);
}

window.addEventListener('load',main);
