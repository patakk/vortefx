precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_simulation;
uniform float u_zoom;
uniform vec2 u_shiftxy;
uniform vec3 u_globalcolor;
uniform float u_version;
uniform float u_stripefrq;
uniform float u_uvdrag;
uniform sampler2D u_randomTexture;

varying vec2 v_uv;
varying vec3 v_diffuse;
varying vec3 v_addinfo;

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
                    -sin(0.5), cos(0.5));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise3(_st, t);
        _st = rot * _st * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

float remap(float x, float a, float b, float c, float d) {
    return c + (x - a) * (d - c) / (b - a);
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
    
    float stroke_nz2 = fbm3(vec3(noisy_uv.x, noisy_uv.y*.08*v_addinfo.x, color.x+13.13))*.5+.5;
    stroke_nz2 = clamp(stroke_nz2, 0., 1.);

    float drag1 = clamp(remap(v_uv.y, .0, 66./v_addinfo.x, 0., 1.), 0., 1.);
    float drag2 = 1. - clamp(remap(v_uv.y, 1.-66./v_addinfo.x, 1., 0., 1.), 0., 1.);
    float drag = drag1*drag2;
    drag = 1.-pow(1.-drag, 4.);
    vec2 drag_uv = v_uv;
    drag_uv.x += drag*0.0471*sin(v_uv.x*10.)*u_uvdrag;

    float oo = 1.;
    float edge = smoothstep(0.04,0.05,v_uv.y);
    float ffa = .9+.1*sin(drag_uv.x*(1. + 3.*color.x));
    float ssx = smoothstep(-1., -.3, sin(drag_uv.x*333.*u_stripefrq + 0.*sin(v_uv.y*v_addinfo.x/3.)));
    float ssxc = smoothstep(.1, .3, sin(drag_uv.x*343.));
    float ssy = smoothstep(-.1, .5, cos(v_uv.y*floor(v_addinfo.x*.08*u_stripefrq)*3.14));
    float ssdiagnoal = smoothstep(-.1, .5, sin(drag_uv.x*343. + v_uv.y*v_addinfo.x*.23));
    
    float sxu = 3./v_addinfo.x;
    float smoothedge1 = smoothstep(.0,sxu,v_uv.y);
    float smoothedge2 = 1. - smoothstep(1.-sxu, 1., v_uv.y);
    float smoothedge = smoothedge1*smoothedge2;

    vec4 result;
    vec3 globalc = u_globalcolor;

    if(u_version < 0.01){
        result = vec4(vec3(color)*edge+vec3(globalc*.96)*(1.-edge), stroke_nz);
    }
    else if(u_version < 1.01){
        result = vec4(color, stroke_nz*round);
    }
    else if(u_version < 2.01){
        vec3 cc = mix(color, globalc, smoothstep(.0, .8, 1.-stroke_nz2));
        result = vec4(color*round+(1.-round)*globalc, stroke_nz);
    }
    else if(u_version < 3.01){
        vec3 c1 = vec3(color)*ffa+(1.-ffa)*color;
        vec3 cc = mix(c1, globalc, smoothstep(.0, .8, 1.-stroke_nz2));
        result = vec4(cc, stroke_nz*sqrt(ffa));
    }
    else if(u_version < 4.01){
        vec3 c1 = vec3(color)*ssx+(1.-ssx)*globalc;
        result = vec4(c1, stroke_nz*ssxc);
    }
    else if(u_version < 5.01){
        vec3 c1 = vec3(color)*ssx+(1.-ssx)*globalc;
        result = vec4(vec3(c1), stroke_nz);
    }
    else if(u_version < 6.01){
        ssx = smoothstep(-1.+1.4*0., -.3+1.4*0., sin(noisy_uv.x*333.));
        vec3 c1 = mix(vec3(color), vec3(globalc), smoothstep(.55, .99, abs(v_uv.y-.5)*2.))*ssx+(1.-ssx)*mix(globalc, globalc*.7, smoothstep(.0, .999, v_uv.y));
        result = vec4(vec3(c1), stroke_nz);
    }
    else if(u_version < 7.01){
        result = vec4(mix(vec3(color), vec3(globalc), ssy), stroke_nz);
    }
    else if(u_version < 8.01){
        ssx = smoothstep(-1., -.3, sin((1.+3.*hash12(vec2(v_addinfo.y)))*drag_uv.x*222. + 0.*sin(v_uv.y*v_addinfo.x/3.)));
        ssxc = smoothstep(.1, .3, sin(drag_uv.x*343.));
        ssy = smoothstep(-.1, .5, cos((1.+3.*hash12(vec2(v_addinfo.y)))*v_uv.y*floor(v_addinfo.x*.08)*3.14));
        ssdiagnoal = smoothstep(-.1, .5, sin(drag_uv.x*343. + v_uv.y*v_addinfo.x*.23));
        result = vec4(mix(color, globalc, ssy*ssx), stroke_nz);
    }
    else if(u_version < 9.01){
        vec2 guv = gl_FragCoord.xy/u_simulation.xy;
        float ang = v_addinfo.y*100.134;
        mat2 rot = mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
        guv = guv - .5 + color.xy;
        guv = rot*guv/u_zoom;
        guv += vec2(drag*.01, 0.);
        guv = guv + .5;
        float stfra = 20. + 140.*hash12(vec2(v_addinfo.y));
        float sinx = smoothstep(.4, .4+.06, sin(guv.x*133.*u_stripefrq));
        float siny = smoothstep(.4, .4+.06, sin(guv.y*133.*u_stripefrq));
        float idx = mod(floor(guv.x*stfra*(1.1+.1*u_stripefrq)), 3.);
        float idy = mod(floor(guv.y*stfra*(1.1+.1*u_stripefrq)), 3.);
        idx = 1.-min(idx, 1.);
        idy = 1.-min(idy, 1.);
        guv = mod(guv*stfra*(1.1 +.1*u_stripefrq), 1.);
        // guv += vec2(
        //     -.22+.22*2.*fbm3(vec3((guv.x-.5)*2.*(.1+.5*u_stripefrq), (guv.y-.5)*2.*(.1+.5*u_stripefrq), 1.)),
        //     -.22+.22*2.*fbm3(vec3((guv.x-.5)*2.*(.1+.5*u_stripefrq), (guv.y-.5)*2.*(.1+.5*u_stripefrq), 2.))
        // );
        float circle = smoothstep(.5, .4, length(guv-.5));
        float square = smoothstep(.2, .3, min(abs(guv.x-.5), abs(guv.y-.5)));
        result = vec4(vec3(square*idx*idy), stroke_nz);
        result = vec4(mix(color, globalc, square), stroke_nz);
    }
    else if(u_version < 10.01){
        result = vec4(vec3(color), ssy*ssx);
        result = vec4(color, ssdiagnoal*stroke_nz);
    }
    else if(u_version < 11.01){
        vec2 guv = v_uv;
        guv.x = mod(guv.x/v_addinfo.x*1400., 1.);
        float circle = smoothstep(.5, .48, length(guv-.5));
        result = vec4(vec3(circle), stroke_nz);
        result = vec4(mix(color, globalc, 1.-circle), circle*stroke_nz);
    }
    else if(u_version < 12.01){
        result = vec4(vec3(color), ssy*ssx);
        result = vec4(color, ssy*ssx*stroke_nz);
    }
    result.a *= smoothedge;

    gl_FragColor = result;
}