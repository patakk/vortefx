
import { getShaderSource, createShader, createProgram } from "./webglutils.js";
import { Vector, noiseSeed, noise } from "./utils.js";
import { getPalette, shuffle } from "./palette.js";

let canvas;
let gl;
let debugcanvas;
let debugctx;

let curves = [];
let quads = [];
let uvs = [];
let diffuse = [];
let addinfo = [];
let curveslengths = [];

let PALETTES;
let DEBUG = false;
let SCALE = 1;
let ASPECT = 4/5;
let EDGE_OFFSET;
let VERSION;
let MINTHICKNESS = -1;
let MAXTHICKNESS = -1;
let DOM = false;
let BUSO = false;
let CURVECOUNTSCALE = 1;
let CURVESCALESPOW = 1;

const DIM = 2000;
let REN = window.innerHeight * 2;
const search = new URLSearchParams(window.location.search);

const combinedFeatures = {};

const featureName = "class";

function getVersionFeatureString(version) {
    switch (version) {
        case 0: return "kangu";
        case 1: return "bu";
        case 2: return "boma";
        case 3: return "besa";
        case 4: return "zuno";
        case 5: return "kena";
        case 6: return "kuno";
        case 7: return "zare";
        case 8: return "teka";
        case 9: return "so";
        case 10: return "mai";
        case 11: return "ata";
    }
}

function main() {
    canvas = canvas || document.getElementById("busocanvas");
    gl = gl || canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: true });

    if (search.get("resx") != null) {
        REN = parseFloat(search.get("resx"));
    }
    if ($fx.isPreview) {
        REN = 1600;
    }
    if(search.get("debug") != null){
        DEBUG = true;
    }
    if(DEBUG){
        debugcanvas = debugcanvas || document.getElementById("debugcanvas");
        debugctx = debugcanvas.getContext('2d');
        debugcanvas.width = DIM;
        debugcanvas.height = Math.round(DIM / ASPECT);
        debugctx.fillStyle = 'black';
        debugctx.fillRect(0, 0, DIM, Math.round(DIM / ASPECT));
    }

    noiseSeed(Math.floor(rand(0, 1) * 10000));
    PALETTES = getPalette().palettes;
    shuffle(PALETTES[0]);

    curves = [], curveslengths = [], quads = [], uvs = [], diffuse = [], addinfo = [];
    //VERSION = Math.floor((1. - Math.pow(rand(0, 1), 1.)) * 10);
    // VERSION = 6;
    // VERSION = ($fx.iteration-1+11)%11;
    // VERSION = Math.max(0, VERSION);

    VERSION = Math.floor(rand(0, 11));

    MINTHICKNESS = 11;
    MAXTHICKNESS = 366;

    CURVESCALESPOW = 2.5;
    if(rand(0,1) < .5){
        CURVESCALESPOW = 2.5;
    }

    CURVECOUNTSCALE = 1;
    // if(VERSION == 9)
    //     MINTHICKNESS = 222;

    if(rand(0,1) < .1){
        MINTHICKNESS = rand(77, 199);
        MAXTHICKNESS = MINTHICKNESS;
        CURVECOUNTSCALE = 1;
    }

    if(VERSION == 1 && rand(0,1)<.5){
        MINTHICKNESS = rand(77, 199);
        MAXTHICKNESS = MINTHICKNESS;
    }

    combinedFeatures[featureName] = getVersionFeatureString(VERSION);
    DOM = false;
    if(rand(0,1) < .025){
        DOM = true;
        combinedFeatures[featureName] = combinedFeatures[featureName] + " dom";
    }

    BUSO = false;
    if(rand(0,1) < .05){
        BUSO = true;
        combinedFeatures[featureName] = combinedFeatures[featureName] + " buso";
        CURVECOUNTSCALE = .1;
        CURVESCALESPOW = 12.5;
    }

    EDGE_OFFSET = window.innerHeight * .035;
    if ($fx.isPreview) EDGE_OFFSET = 0;

    onresize(null);

    let setupchoice = Math.floor(rand(0, 3));
    if (setupchoice == 0) {
        setupCurves();
    }
    else if (setupchoice == 1) {
        setupCurves2();
    }
    else {
        setupCurves3();
    }

    let numtwirls = 13;
    let subdivcutoff = rand(0, 1) < .5 ? .5 : rand(.9, .99);
    for (let k = 0; k < numtwirls; k++) {
         twirl(false);
    }

    curves.forEach(curve => {
        curve.forEach(point => {
            point.u = map(point.x, 0, DIM, 0, 1);
            point.v = map(point.y, 0, DIM / ASPECT, 0, 1);
        });
    });

    let bounds = calculateBounds(curves);
    let boundsratio = (bounds.maxx - bounds.minx) / (bounds.maxy - bounds.miny);

    stretchCurves(curves, bounds);

    bounds = calculateBounds(curves);
    boundsratio = (bounds.maxx - bounds.minx) / (bounds.maxy - bounds.miny);

    if(DEBUG){
        curves.forEach((curve, i) => {
            curve.forEach((point, j) => {
                debugctx.beginPath();
                debugctx.arc(point.x, DIM/ASPECT-point.y, 2, 0, 2 * Math.PI);
                debugctx.fillStyle = 'white';
                debugctx.fill();
            });
        });
    }

    constructQuads();
    finishupQuadInfo();
    render();
    
    // $fx.features(combinedFeatures);
    $fx.preview();
}

function setupCurves() {
    let curveCount = rand(38, 39)*CURVECOUNTSCALE;
    for (let k = 0; k < curveCount; k++) {
        setupCurve(k / curveCount);
    }
}

function setupCurves2() {
    let curveCount = rand(30, 50)*CURVECOUNTSCALE;
    for(let k = 0; k < curveCount; k++){
        let thickness = k / curveCount;
        let curve = [];
        let numAngles = rand(0, 1) < 0.5 ? 2 : Math.floor(rand(3, 11));
        numAngles = 111;

        let initialPosition = new Vector(DIM / 2 + DIM*rand(-.5,.5), Math.floor(DIM / ASPECT) / 2 + DIM*rand(-.5,-.4) / ASPECT);
        let initialPosition2 = new Vector(DIM / 2 + DIM*rand(-.5,.5)*.5, Math.floor(DIM / ASPECT) / 2 + DIM*rand(.4,.5) / ASPECT);
        let initialDirection = new Vector(rand(-1, 1), rand(-1, 1)).normalize();

        curve = [initialPosition, initialPosition2];

        // let pathSteps = Math.round(rand(4, 12));

        // for (let i = 0; i < pathSteps; i++) {
        //     let adjustedDirection = adjustDirection(initialDirection, numAngles).multiplyScalar(SCALE * rand(350, 450));
        //     let newPosition = initialPosition.clone();
        //     newPosition.add(adjustedDirection);
            
        //     initialDirection = adjustedDirection.clone();
        //     initialPosition = newPosition.clone();
        //     curve.push(newPosition);
        // }
        let subdivided = [];
        for (let i = 0; i < curve.length - 1; i++) {
            const p1 = curve[i];
            const p2 = curve[i + 1];
            const dist = p1.distance(p2);
            const parts = Math.max(2, Math.floor(dist / 22));
            for (let j = 0; j < parts; j++) {
                let p = new Vector(p1.x + (p2.x - p1.x) * j / parts, p1.y + (p2.y - p1.y) * j / parts);
                p.u = map(p.x, 0, DIM, 0, 1);
                p.v = map(p.y, 0, Math.floor(DIM / ASPECT), 0, 1);
                subdivided.push(p);
            }
        }

        curve = subdivided;
        curve.thickness = MINTHICKNESS + (MAXTHICKNESS-MINTHICKNESS) * Math.pow(1 - thickness, CURVESCALESPOW);
        curves.push(curve);
    }
}

function setupCurves3() {
    let curveCount = 30*CURVECOUNTSCALE;
    for(let k = 0; k < curveCount; k++){
        let thickness = k / curveCount;
        let curve = [];
        let numAngles = rand(0, 1) < 0.5 ? 2 : Math.floor(rand(3, 11));
        numAngles = 111;

        let initialPosition = new Vector(DIM / 2 + DIM*rand(-.5,.5), Math.floor(DIM / ASPECT) / 2 + DIM*rand(-.5,-.4) / ASPECT);
        let initialPosition2 = new Vector(DIM / 2 + DIM*rand(-.5,.5)*.5, Math.floor(DIM / ASPECT) / 2 + DIM*rand(.4,.5) / ASPECT);
        let initialDirection = new Vector(rand(-1, 1), rand(-1, 1)).normalize();

        curve = [initialPosition, initialPosition2];
        let subdivided = [];
        for (let i = 0; i < curve.length - 1; i++) {
            const p1 = curve[i];
            const p2 = curve[i + 1];
            const dist = p1.distance(p2);
            const parts = Math.max(2, Math.floor(dist / 22));
            for (let j = 0; j < parts; j++) {
                let p = new Vector(p1.x + (p2.x - p1.x) * j / parts, p1.y + (p2.y - p1.y) * j / parts);
                p.u = map(p.x, 0, DIM, 0, 1);
                p.v = map(p.y, 0, Math.floor(DIM / ASPECT), 0, 1);
                subdivided.push(p);
            }
        }

        curve = subdivided;
        curve.thickness = MINTHICKNESS + (MAXTHICKNESS-MINTHICKNESS) * Math.pow(1 - thickness, CURVESCALESPOW);
        curves.push(curve);
    }
    for(let k = 0; k < curveCount; k++){
        let thickness = k / curveCount;
        let curve = [];
        let numAngles = rand(0, 1) < 0.5 ? 2 : Math.floor(rand(3, 11));
        numAngles = 111;

        let initialPosition = new Vector(DIM / 2 + DIM*rand(-.5,-.4), Math.floor(DIM / ASPECT) / 2 + DIM*rand(-.5,.5) / ASPECT);
        let initialPosition2 = new Vector(DIM / 2 + DIM*rand(.4,.5), Math.floor(DIM / ASPECT) / 2 + DIM*rand(-.5,.5) / ASPECT);
        let initialDirection = new Vector(rand(-1, 1), rand(-1, 1)).normalize();

        curve = [initialPosition, initialPosition2];
        let subdivided = [];
        for (let i = 0; i < curve.length - 1; i++) {
            const p1 = curve[i];
            const p2 = curve[i + 1];
            const dist = p1.distance(p2);
            const parts = Math.max(2, Math.floor(dist / 22));
            for (let j = 0; j < parts; j++) {
                let p = new Vector(p1.x + (p2.x - p1.x) * j / parts, p1.y + (p2.y - p1.y) * j / parts);
                p.u = map(p.x, 0, DIM, 0, 1);
                p.v = map(p.y, 0, Math.floor(DIM / ASPECT), 0, 1);
                subdivided.push(p);
            }
        }

        curve = subdivided;
        curve.thickness = MINTHICKNESS + (MAXTHICKNESS-MINTHICKNESS) * Math.pow(1 - thickness, CURVESCALESPOW);
        curves.push(curve);
    }
}

function render() {
    gl.canvas.width = REN;
    gl.canvas.height = Math.round(REN / ASPECT);
    gl.viewport(0, 0, REN, Math.round(REN / ASPECT));

    const fragmentCode = getShaderSource("frag.glsl");
    const vertexCode = getShaderSource("vert.glsl");
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexCode);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentCode);
    const program = createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(program);
    gl.lineWidth(11);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const simulationUniformLocation = gl.getUniformLocation(program, "u_simulation");
    const zoomUniformLocation = gl.getUniformLocation(program, "u_zoom");
    const shiftxyUniformLocation = gl.getUniformLocation(program, "u_shiftxy");
    const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
    const globalcolorUniformLocation = gl.getUniformLocation(program, "u_globalcolor");
    const versionUniformLocation = gl.getUniformLocation(program, "u_version");
    const stripefreqUniformLocation = gl.getUniformLocation(program, "u_stripefrq");
    const uvdragUniformLocation = gl.getUniformLocation(program, "u_uvdrag");
    
    const randomtexture = getRandomTexture();

    let _c = PALETTES[3][Math.floor(rand(0, PALETTES[3].length))];
    if(rand(0,1) < .02){
        if(rand(0,1) < .5) _c = [1,0,0];
    }

    let shx = 0.;
    let shy = 0.;
    let zoom = 1.;
    let stripefrq = 1.;
    stripefrq = rand(.2, 2);
    if(VERSION == 9)
        stripefrq = map(Math.pow(rand(0, 1), 2), 0, 1, 1, 6);
    let uvdrag = 0;
    if(rand(0,1) < .1){
        uvdrag = 1;
    }

    if(search.get("dx") != null){
        shx = parseFloat(search.get("dx"));
    }
    if(search.get("dy") != null){
        shy = parseFloat(search.get("dy"));
    }
    if(search.get("scale") != null){
        zoom = parseFloat(search.get("scale"));
    }

    gl.uniform2f(simulationUniformLocation, DIM, Math.round(DIM / ASPECT));
    gl.uniform2f(resolutionUniformLocation, REN, Math.round(REN / ASPECT));
    gl.uniform3f(globalcolorUniformLocation, _c[0], _c[1], _c[2]);
    gl.uniform1f(versionUniformLocation, VERSION);
    gl.uniform1f(stripefreqUniformLocation, stripefrq);
    gl.uniform1f(uvdragUniformLocation, uvdrag);
    gl.uniform1f(zoomUniformLocation, zoom);
    gl.uniform2f(shiftxyUniformLocation, shx, shy);
    
    createAndSetupBuffer(gl, quads, gl.getAttribLocation(program, "a_position"), 3);
    createAndSetupBuffer(gl, uvs, gl.getAttribLocation(program, "a_uv"), 2);
    createAndSetupBuffer(gl, diffuse, gl.getAttribLocation(program, "a_diffuse"), 3);
    createAndSetupBuffer(gl, addinfo, gl.getAttribLocation(program, "a_addinfo"), 3);

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, REN, Math.round(REN / ASPECT), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.error('Error setting up framebuffer');
    }

    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, randomtexture);
    gl.uniform1i(gl.getUniformLocation(program, "u_randomTexture"), 0);

    gl.clearColor(0.98, 0.98, 0.98, 1.);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // drawing the strips
    for (let i = 0, offset = 0; i < curves.length; i++) {
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, curveslengths[i]);
        offset += curveslengths[i];
    }

    let bgFragmentCode = getShaderSource("bgfrag.glsl");
    let bgVertexCode = getShaderSource("bgvert.glsl");
    let bgVertexShader = createShader(gl, gl.VERTEX_SHADER, bgVertexCode);
    let bgFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, bgFragmentCode);
    let bgProgram = createProgram(gl, bgVertexShader, bgFragmentShader);

    gl.useProgram(bgProgram);
    let backgroundPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, backgroundPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    let bgPositionAttributeLocation = gl.getAttribLocation(bgProgram, "a_position");
    let uTextureUniformLocation = gl.getUniformLocation(bgProgram, "u_texture");

    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uTextureUniformLocation, 0);
    gl.uniform2f(gl.getUniformLocation(bgProgram, "u_resolution"), REN, Math.round(REN / ASPECT));
    gl.uniform3f(gl.getUniformLocation(bgProgram, "u_seed"), rand(0, 1), rand(0, 1), rand(0, 1));

    let edgec = PALETTES[0][Math.floor(rand(0, PALETTES[0].length))];
    gl.uniform3f(gl.getUniformLocation(bgProgram, "u_edgecolor"), edgec[0], edgec[1], edgec[2]);

    gl.enableVertexAttribArray(bgPositionAttributeLocation);
    gl.vertexAttribPointer( bgPositionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // postproc draw call
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function calculateBounds(curves){
    let bounds = { minx: Infinity, maxx: -Infinity, miny: Infinity, maxy: -Infinity };
    
    curves.flat().forEach(({ x, y }) => {
        bounds.minx = Math.min(x, bounds.minx);
        bounds.maxx = Math.max(x, bounds.maxx);
        bounds.miny = Math.min(y, bounds.miny);
        bounds.maxy = Math.max(y, bounds.maxy);
    });

    return bounds;
};


function stretchCurves(curves, bounds){
    let margin = DIM * .025;
    let hasStretch = rand(0, 1) < .5;

    if(MINTHICKNESS == MAXTHICKNESS)
        hasStretch = true;

    if(DOM)
        hasStretch = false;
    
    let stretchFactor = hasStretch ? rand(0.1, 0.2) : 0;

    let stretchOption = 0;
    if(rand(0,1) < .05){
        stretchOption = 1;
    }

    curves.forEach((curve, j) => {
        curve.forEach(point => {
            let curvemargin = curve.thickness + margin
            let ppx = map(point.x, bounds.minx, bounds.maxx, 0, 1);
            let ppy = map(point.y, bounds.miny, bounds.maxy, 0, 1);
            let powerFactor;
            if(stretchOption == 0){
                powerFactor = j < curves.length * stretchFactor ? 5 : 1;
            }else{
                powerFactor = 1 + hasStretch*4*Math.pow(j/curves.length, 1);
            }
            point.x = map(power(ppx, powerFactor), 0, 1, curvemargin, DIM - curvemargin);
            point.y = map(power(ppy, powerFactor), 0, 1, curvemargin, DIM / ASPECT - curvemargin);
        });
    });
};

function stretchCurves2(curves, bounds){
    let margin = DIM * .025;
    let hasStretch = rand(0, 1) < .5;
    let stretchFactor = hasStretch ? rand(0.1, 0.2) : 0;

    if(hasStretch){
        combinedFeatures[featureName] = combinedFeatures[featureName] + " dom";
    }

    curves.forEach((curve, j) => {
        curve.forEach(point => {
            let curvemargin = curve.thickness + margin
            let ppx = map(point.x, bounds.minx, bounds.maxx, 0, 1);
            let ppy = map(point.y, bounds.miny, bounds.maxy, 0, 1);
            //let powerFactor = j < curves.length * stretchFactor ? 5 : 1;
            let powerFactor = 1 + hasStretch*4*Math.pow(j/curves.length, 5);
            point.x = map(power(ppx, powerFactor), 0, 1, curvemargin, DIM - curvemargin);
            point.y = map(power(ppy, powerFactor), 0, 1, curvemargin, DIM / ASPECT - curvemargin);
        });
    });
};

function twirl(subdivide = false) {
    const direction = rand(0, 1) > 0.5 ? 1 : -1;
    let strength = rand(0.6, 0.7);
    const centerX = DIM * (0.5 + 2.*rand(-1 / 3, 1 / 3));
    const centerY = (DIM / ASPECT) * (0.5 + 2.*rand(-1 / 3, 1 / 3));
    const center = new Vector(centerX, centerY);
    const maxDistance = Math.min(DIM, DIM / ASPECT) / 3 * rand(1.4, 2);
    let twirlFrequency = 3.0;

    if(DOM){
        strength = rand(0.6, 0.7)*3;
        twirlFrequency = 13.0;
    }
    if(BUSO){
        strength = rand(0.6, 0.7)*1;
        twirlFrequency = 13.0;
    }

    curves.forEach((curve, i) => {
        curve.forEach((point, j) => {
            const distanceToCenter = point.distance(center);
            if (distanceToCenter < maxDistance) {
                const angle = Math.atan2(point.y - centerY, point.x - centerX);
                const t = Math.pow(1 - distanceToCenter / maxDistance, 2);
                const newAngle = angle + t * Math.PI * direction * strength * (1 + 2 * Math.pow(noise(point.u * twirlFrequency, point.v * twirlFrequency, 0), 1));
                //const newAngle = angle + t * Math.PI * direction * strength;
                let fromCenter = new Vector(Math.cos(newAngle), Math.sin(newAngle));
                fromCenter.multiplyScalar(distanceToCenter);
                const newPos = center.clone().add(fromCenter);
                newPos.u = point.u;
                newPos.v = point.v;
                curve[j] = newPos;
            }
        });

        if (subdivide) {
            let newCurve = [];
            for (let j = 0; j < curve.length - 1; j++) {
                const p1 = curve[j];
                const p2 = curve[j + 1];
                const dist = p1.distance(p2);
                const parts = Math.max(2, Math.floor(dist / 23));

                for (let k = 0; k < parts; k++) {
                    const p = new Vector(p1.x + (p2.x - p1.x) * k / parts, 
                                         p1.y + (p2.y - p1.y) * k / parts);
                    p.u = map(p.x, 0, DIM, 0, 1);
                    p.v = map(p.y, 0, DIM / ASPECT, 0, 1);
                    newCurve.push(p);
                }
            }
            newCurve.thickness = curve.thickness;
            curves[i] = newCurve;
        }
    });
}

function getRandomTexture() {
    var width = 1024;
    var height = 1024;
    var data = new Uint8Array(width * height * 4);
    for (var i = 0; i < data.length; i++) {
        data[i] = Math.floor(rand(0, 1) * 256);
    }
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    return texture;
}

function createAndSetupBuffer(gl, data, attributeLocation, size) {
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(attributeLocation);
    gl.vertexAttribPointer(attributeLocation, size, gl.FLOAT, false, 0, 0);
    return buffer;
}


function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
}

function finishupQuadInfo() {
    quads = new Float32Array(quads);
    uvs = new Float32Array(uvs);
    diffuse = new Float32Array(diffuse);
    addinfo = new Float32Array(addinfo);
}

function constructQuads() {
    let palette = PALETTES[0];
    let ismono = false;
    if(rand(0,1) < .05 && VERSION > 0){
        ismono = true;
        if(rand(0,1) < .5){
            palette = PALETTES[1];
        }
        else{
            palette = PALETTES[2];
        
        }
    }
    let powp = rand(0, 1) < .75 ? 1 : rand(.4, 15);
    let monofactor = 0.1;
    
    if(rand(0, 1) < .05){
        monofactor = 1;
        ismono = true;
    }

    if(ismono){
        // combinedFeatures[featureName] = combinedFeatures[featureName] + " suli";
    }

    let accentcolor = PALETTES[3][Math.floor(rand(0, PALETTES[3].length))];
    let gradientToAccent = rand(0, 1) < .25;
    for (let i = 0; i < curves.length; i++) {
        let points = curves[i];
        curveslengths.push(0)
        let c1 = [rand(.3, 1), rand(.3, 1), rand(.3, 1)];
        let pidx = 123. * Math.floor(Math.pow(rand(0, 1), powp) * palette.length);
        c1 = palette[pidx % palette.length];
        if(i == 0){
            c1 = PALETTES[3][pidx%PALETTES[3].length];
        }
        if (rand(0, 1) < monofactor) {
            if (rand(0, 1) < 0.5) {
                c1 = [0, 0, 0]
            }
            else {
                c1 = [1, 1, 1]
            }
        }

        if(gradientToAccent){
            let cfac = Math.pow(i/curves.length, 3);
            c1[0] = cfac*accentcolor[0] + c1[0]*(1-cfac);
            c1[1] = cfac*accentcolor[1] + c1[1]*(1-cfac);
            c1[2] = cfac*accentcolor[2] + c1[2]*(1-cfac);
        }
        if(false){
            for (let j = 1, length = 0; j < points.length - 1; j++) {
                let pt0 = points[j - 1];
                let pt1 = points[j];
                let pt2 = points[j + 1];
                let dist = pt1.distance(pt2);
                length += dist / 1000.;
                let pos = pt2.clone()
                let angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x);
                let angleprev = Math.atan2(pt1.y - pt0.y, pt1.x - pt0.x);
                angle = (angle + angleprev) / 2;
                let right = new Vector(Math.cos(angle + Math.PI / 2), Math.sin(angle + Math.PI / 2));
                let left = new Vector(Math.cos(angle - Math.PI / 2), Math.sin(angle - Math.PI / 2));
                let p1 = pos.add(right.multiplyScalar(curves[i].thickness)).clone();
                let p2 = pos.add(left.multiplyScalar(curves[i].thickness)).clone();
                let c11 = c1.slice();
                c11[0] = c1[0]*(1.-.21*power(noise(i, j*.001, 0.0), 5));
                c11[1] = c1[1]*(1.-.21*power(noise(i, j*.001, 0.0), 5));
                c11[2] = c1[2]*(1.-.21*power(noise(i, j*.001, 0.0), 5));
                addstripattribs(p1, p2, [length, 0], [length, 1], c11, curves[i].thickness);
                curveslengths[i] += 2;
            }
        }
        else{
            for (let j = 1, length = 0; j < points.length - 1; j++) {
                let pt0 = points[j - 1];
                let pt1 = points[j];
                let pt2 = points[j + 1];
                let dist = pt1.distance(pt2);
                length += dist / 1000.;
                let pos = pt2.clone()
                let angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x);
                let angleprev = Math.atan2(pt1.y - pt0.y, pt1.x - pt0.x);
                angle = (angle + angleprev) / 2;
                let vec12 = new Vector(pt2.x - pt1.x, pt2.y - pt1.y);
                let vec01 = new Vector(pt1.x - pt0.x, pt1.y - pt0.y);
                let vec012 = new Vector(pt2.x - pt0.x, pt2.y - pt0.y);
                angle = vec012.heading();
                let right = new Vector(Math.cos(angle + Math.PI / 2), Math.sin(angle + Math.PI / 2));
                let left = new Vector(Math.cos(angle - Math.PI / 2), Math.sin(angle - Math.PI / 2));
                let p1 = pos.add(right.multiplyScalar(curves[i].thickness)).clone();
                let p2 = pos.add(left.multiplyScalar(curves[i].thickness)).clone();
                
                let c11 = c1.slice();
                c11[0] = c1[0]*(1.11-.21*power(noise(i, j*.001, 0.0), 5));
                c11[1] = c1[1]*(1.11-.21*power(noise(i, j*.001, 20.0), 5));
                c11[2] = c1[2]*(1.11-.21*power(noise(i, j*.001, 50.0), 5));
    
                addstripattribs(p1, p2, [length, 0], [length, 1], c11, curves[i].thickness, i);
                curveslengths[i] += 2;
            }
        }
    }

}

function addstripattribs(p1, p2, uv1 = [0, 0], uv2 = [1, 0], color = [1, 0, 0], thickness = 1.0, curveindex = 0) {
    quads.push(p1.x); quads.push(p1.y); quads.push(p1.z);
    quads.push(p2.x); quads.push(p2.y); quads.push(p2.z);
    uvs.push(uv1[0]); uvs.push(uv1[1]);
    uvs.push(uv2[0]); uvs.push(uv2[1]);
    diffuse.push(color[0]); diffuse.push(color[1]); diffuse.push(color[2]);
    diffuse.push(color[0]); diffuse.push(color[1]); diffuse.push(color[2]);
    addinfo.push(thickness); addinfo.push(curveindex); addinfo.push(0.);
    addinfo.push(thickness); addinfo.push(curveindex); addinfo.push(0.);
}


function rand(a, b) {
    return a + $fx.rand() * (b - a);
}

function map(value, min1, max1, min2, max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}


function adjustDirection(direction, numAngles) {
    let directionClone = direction.clone();
    let angleAdjustment = map(power(rand(0, 1), 3), 0, 1, Math.PI / 2, Math.PI * 3 / 2);
    directionClone.rotate(angleAdjustment);
    let heading = directionClone.heading();
    heading = Math.round(heading / (Math.PI / numAngles)) * (Math.PI / numAngles);
    directionClone = new Vector(Math.cos(heading), Math.sin(heading)).normalize();
    return directionClone;
}

function setupCurve(thickness) {
    let curve = [];
    let numAngles = rand(0, 1) < 0.5 ? 2 : Math.floor(rand(3, 11));
    numAngles = 111;

    let initialPosition = new Vector(DIM / 2 + rand(-555, 555), Math.floor(DIM / ASPECT) / 2 + rand(-555, 555) / ASPECT);
    let initialDirection = new Vector(rand(-1, 1), rand(-1, 1)).normalize();

    curve = [initialPosition];

    let pathSteps = Math.round(rand(4, 12));

    for (let i = 0; i < pathSteps; i++) {
        let adjustedDirection = adjustDirection(initialDirection, numAngles).multiplyScalar(SCALE * rand(350, 450));
        let newPosition = initialPosition.clone();
        newPosition.add(adjustedDirection);
        
        initialDirection = adjustedDirection.clone();
        initialPosition = newPosition.clone();
        curve.push(newPosition);
    }
    let subdivided = [];
    for (let i = 0; i < curve.length - 1; i++) {
        const p1 = curve[i];
        const p2 = curve[i + 1];
        const dist = p1.distance(p2);
        const parts = Math.max(2, Math.floor(dist / 22));
        for (let j = 0; j < parts; j++) {
            let p = new Vector(p1.x + (p2.x - p1.x) * j / parts, p1.y + (p2.y - p1.y) * j / parts);
            p.u = map(p.x, 0, DIM, 0, 1);
            p.v = map(p.y, 0, Math.floor(DIM / ASPECT), 0, 1);
            subdivided.push(p);
        }
    }

    curve = subdivided;
    curve.thickness = MINTHICKNESS + (MAXTHICKNESS-MINTHICKNESS) * Math.pow(1 - thickness, CURVESCALESPOW);
    curves.push(curve);
}


function power(p, g) {
    if (p < 0.5)
        return 0.5 * Math.pow(2 * p, g);
    else
        return 1 - 0.5 * Math.pow(2 * (1 - p), g);
}

function handleWindowSize() {
    let clientWidth = window.innerWidth;
    let clientHeight = window.innerHeight;
    let caspect = (clientWidth - EDGE_OFFSET * 2) / (clientHeight - EDGE_OFFSET * 2);
    let aspect = ASPECT;
    let sw, sh;
    if (caspect > aspect) {
        sh = Math.round(clientHeight) - EDGE_OFFSET * 2;
        sw = Math.round(sh * aspect);
    } else {
        sw = Math.round(clientWidth) - EDGE_OFFSET * 2;
        sh = Math.round(sw / aspect);
    }
    canvas.style.width = sw + 'px';
    canvas.style.height = sh + 'px';
    canvas.style.position = 'absolute';
    canvas.style.left = clientWidth / 2 - sw / 2 + 'px';
    canvas.style.top = clientHeight / 2 - sh / 2 + 'px';
}

function onresize(event) {
    handleWindowSize();
}

function save() {
    console.log('preparing canvas for saving...');
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'buso_' + $fx.hash + '.png';
    link.href = dataURL;
    link.click();
}


window.onload = main;
window.addEventListener('resize', onresize, false);
document.addEventListener('keydown', function (event) {
    if (event.key == 's') {
        save();
    }
});