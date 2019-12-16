function schemeHandlers() {
    for (let radio of document.getElementsByName('scheme')) {
        radio.addEventListener('click', function () {
            checkRadios('scheme');
        });
    }
}

function seedSizeHandlers() {
    for (let radio of document.getElementsByName('seedsize')) {
        radio.addEventListener('click', function () {
            checkRadios('seedsize');
        });
    }
}

function checkRadios(name) {
    for (let radio of document.getElementsByName(name)) {
        document.getElementById(radio.id + '-label').className = radio.checked ? 'btn btn-secondary active' : 'btn btn-secondary';
    }
}

function anySeedValidityCheck() {
    for (let i = 0; i < 5; i++) {
        document.getElementById('seed-' + i).addEventListener('keyup', function () {
            if (this.value.includes(':')) {
                if (this.value.match(/spotify:(track|artist):[a-zA-Z0-9]+/g) === null) {
                    this.className += ' error-field';
                } else {
                    this.className = 'form-control';
                }
            } else if (this.value.includes(' ')) {
                this.className += ' error-field';
            } else {
                this.className = 'form-control'
            }
        });
    }
}

function checkBoxValidity(size) {
    for (let i = 0; i < size; i++) {
        document.getElementById('seed-' + i).addEventListener('change', function () {
            if (isSelectionPresent(size)) {
                document.getElementById('seed-select-btn').className = 'btn btn-custom';
            } else {
                document.getElementById('seed-select-btn').className = 'btn btn-custom inactive';
            }
            isSeedSelectionMax(size);
        });
    }
}

function isSelectionPresent(size) {
    for (let i = 0; i < size; i++) {
        if (document.getElementById('seed-' + i).checked === true) return true;
    }
    return false;
}

function isSeedSelectionMax(size) {
    let seeds = 0;
    for (let i = 0; i < size; i++) {
        if (document.getElementById('seed-' + i).checked === true) seeds++;
        if (seeds === 5) setCheckboxDisabled(true, size);
        else setCheckboxDisabled(false, size);
    }
}

function setCheckboxDisabled(state, size) {
    for (let i = 0; i < size; i++) {
        if (document.getElementById('seed-' + i).checked === false)
            document.getElementById('seed-' + i).disabled = state;
    }
}