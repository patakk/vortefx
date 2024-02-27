uniform vec2 u_simulation;
uniform float u_zoom;
uniform vec2 u_shiftxy;

attribute vec3 a_position;
attribute vec2 a_uv;
attribute vec3 a_diffuse;
attribute vec3 a_addinfo;

varying vec2 v_uv;
varying vec3 v_diffuse;
varying vec3 v_addinfo;

void main() {
    vec3 position = (a_position + vec3(u_shiftxy, 0.)) / vec3(u_simulation, 1.) * 2. - 1.;
    position.xy *= u_zoom*vec2(1., 1.);
    gl_Position = vec4(position, 1);
    v_uv = a_uv;
    v_diffuse = a_diffuse;
    v_addinfo = a_addinfo;
}