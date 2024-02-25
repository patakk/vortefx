precision mediump float;

uniform vec2 u_resolution;
uniform vec3 u_globalcolor;
uniform float u_version;
uniform sampler2D u_randomTexture;

varying vec2 v_uv;
varying vec3 v_diffuse;

#define NUM_OCTAVES 3

float hash12(vec2 p){
	vec3 co = vec3(p, 0.)*1013.31;
    vec2 uv = fract(co.xy+co.z*1.13141);
    return texture2D(u_randomTexture, uv).r;
}

float noise3(vec2 _st,float t) {
    vec2 i = floor(_st+t);
    vec2 f = fract(_st+t);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

float power(float p, float g) {
    if (p < 0.5)
        return 0.5 * pow(2.*p, g);
    else
        return 1. - 0.5 * pow(2.*(1. - p), g);
}

float fbm3(vec3 vecin) {
    vec2 _st = vecin.xy;
    float t = vecin.z;
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5),
                    -sin(0.5), cos(0.50));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise3(_st, t);
        _st = rot * _st * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}


void main() {
    vec3 color = v_diffuse;
    vec2 noisy_uv = v_uv;
    noisy_uv.x += .5*(-.5+fbm3(vec3(v_uv.x * .6, v_uv.y * .1, 31.30+color.x*12.31)));
    noisy_uv.y += .5*(-.5+fbm3(vec3(v_uv.x * .6, v_uv.y * .1, 14.540+color.x*44.13)));
    float sx = power(1. - 2. * (noisy_uv.x - .5), 2.);
    float sy = power(1. - 2. * (noisy_uv.y - .5), 2.);

    float round = power(1. - abs(2.*(noisy_uv.y-.05)), 2.);
    float stroke_nz = fbm3(vec3(v_uv.x, v_uv.y*14., color.x))*.5+.5;
    stroke_nz = clamp(stroke_nz, 0., 1.);
    stroke_nz = smoothstep(.3, .8, stroke_nz);

    float oo = 1.;
    float edge = smoothstep(0.04,0.05,v_uv.y);
    float ffa = .5+.5*sin(v_uv.x*(1. + 3.*color.x));
    float ssa = smoothstep(-1., -.3, sin(v_uv.x*333.));
    float ssb = smoothstep(.1, .3, sin(v_uv.x*343.));

    vec4 result;

    if(u_version < 0.01){
        result = vec4(vec3(color)*edge+vec3(u_globalcolor*.96)*(1.-edge), stroke_nz);
    }
    else if(u_version < 1.01){
        result = vec4(color, stroke_nz*round);
    }
    else if(u_version < 2.01){
        result = vec4(color*round+(1.-round)*u_globalcolor, stroke_nz);
    }
    else if(u_version < 3.01){
        result = vec4(vec3(color)*ffa+(1.-ffa)*color, stroke_nz*sqrt(ffa));
    }
    else if(u_version < 4.01){
        vec3 c1 = vec3(color)*ssa+(1.-ssa)*u_globalcolor;
        result = vec4(c1, stroke_nz*ssb);
    }
    else if(u_version < 5.01){
        vec3 c1 = vec3(color)*ssa+(1.-ssa)*u_globalcolor;
        result = vec4(vec3(c1), stroke_nz);
    }
    else if(u_version < 6.01){
        ssa = smoothstep(-1.+1.4*0., -.3+1.4*0., sin(noisy_uv.x*333.));
        vec3 c1 = mix(vec3(color), vec3(u_globalcolor), smoothstep(.0, .999, 1.-v_uv.y))*ssa+(1.-ssa)*mix(u_globalcolor, u_globalcolor*.7, smoothstep(.0, .999, v_uv.y));
        result = vec4(vec3(c1), stroke_nz);
    }
    gl_FragColor = result;
}