function map(value, min1, max1, min2, max2) {
    return min2 + (max2 - min2) * ((value - min1) / (max1 - min1));
}

let palettesstrings = [
    '5da6fb-fc1859-995dff-3c5e85-77a0d0-8c70ba-a8415e-ce935b-dbbb6f-69995d-5c5cfa-fc4319-e45cff-3c3c85-7777d1-af70ba-a85442-cfc95b-c9db70-5d996d-6c6cea-af4666-b86cef-43437e-7f7fc7-9a76b2-865765-a7a381-adb795-638479-9f6cb8-e5432f-e26cbb-5a4366-9c7faa-ad769a-9f554c-c39a65-c8af7b-757f6a-eb7d6c-89cb7c-f0ca6c-7d4a42-c7897f-b3a376-5f8758-80a5a6-95a8b8-7d6285-fab05c-dd4523-c3ff5c-85633c-d1a777-9eba70-42a88b-5b97cf-7090db-8d5d99',
    'ffffff',
    '050505',
    'ffbe0b-fb5607-ff0000-9C80C2-3a86ff',
];

function getFromStrings(strings) {
    let palettes = [];
    strings.forEach(element => {
        palettes.push(element);
    });
    for (var k = 0; k < palettes.length; k++) {
        let text = palettes[k];
        let cols = text.split('-')
        let caca = [];
        cols.forEach((e) => {
            caca.push(hexToRgb(e))
        });
        shuffle(caca)
        var coco = [];
        caca.forEach((e, i) => {
            coco.push([
                (caca[i][0] + 0.00 * map($fx.rand(), 0, 1, -.2, .2)),
                (caca[i][1] + 0.00 * map($fx.rand(), 0, 1, -.2, .2)),
                (caca[i][2] + 0.00 * map($fx.rand(), 0, 1, -.2, .2))
            ])
        });
        palettes[k] = coco;
    }
    return palettes;
}

function getPalette() {
    let palettes = getFromStrings(palettesstrings);
    let bgpalettes = getFromStrings([
        'f6bd60-84a59d-f28482-d88c9a-f2d0a9-99c1b9-8e7dbe-edc1a4-f78972-d98db9-f2b3aa-99c2a9-7e87bf-d88c95-f2c1a9-a9b1ac-a27da4-889ca9-90a5b8-6e8998-7f8f9b-7c8da3',]);

    return { palettes, bgpalettes };
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [
            parseInt(result[1], 16) / 255.,
            parseInt(result[2], 16) / 255.,
            parseInt(result[3], 16) / 255.
        ]
        : null;
}


function shuffle(array) {
    let currentIndex = array.length
    var randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor($fx.rand() * currentIndex);
        currentIndex--;
        [
            array[currentIndex], array[randomIndex]
        ] = [
                array[randomIndex], array[currentIndex]
            ];
    }

    return array;
}


export { getPalette, shuffle }