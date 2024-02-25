precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec3 u_seed;
uniform vec3 u_edgecolor;

varying vec2 v_uv;

float rand(vec2 co){
    float r1 = fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
    float r2 = fract(sin(dot(co.xy + .4132, vec2(12.9898,78.233))) * 43758.5453);
    float r3 = fract(sin(dot(co.xy + vec2(r1, r2),vec2(12.9898, 78.233))) * 43758.5453);
    return r1;
}

float edgedetection(sampler2D texture, vec2 uv, vec2 res, float amp) {
    vec3 colorr = texture2D(texture, uv + vec2(amp, 0.) / res).rgb;
    vec3 colorl = texture2D(texture, uv + vec2(-amp, 0.) / res).rgb;
    vec3 colort = texture2D(texture, uv + vec2(0., amp) / res).rgb;
    vec3 colord = texture2D(texture, uv + vec2(0, -amp) / res).rgb;
    vec3 diff1 = colorr - colorl;
    vec3 diff2 = colort - colord;
    vec3 diff = (abs(diff1) + abs(diff2))/2.;
    float maxdiff = max(diff.r, max(diff.g, diff.b));
    return maxdiff;
}

void main() {
    float saltx = rand(v_uv + 0.3 + u_seed.x);
    float salty = rand(v_uv + 0.3 + u_seed.x);
    float salt = rand(v_uv + 0.3 + u_seed.x + saltx*2.314 + salty*2.314);
    vec3 color = texture2D(u_texture, v_uv).rgb;
    float edges = edgedetection(u_texture, v_uv, u_resolution, 3.0)*0.75;
    vec3 result = color;
    result = mix(result, u_edgecolor, edges);
    result = result + .05*(-.5 + salt);
    result = clamp(result, 0., 1.);

    gl_FragColor = vec4(vec3(result), 1.);
    
}
