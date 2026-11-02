import{A as e,B as t,C as n,G as r,H as i,I as a,M as o,Q as s,R as c,S as l,U as u,V as d,X as f,Z as p,_ as m,b as h,c as g,j as _,k as v,l as y,n as b,p as x,q as S,s as C,t as w,u as T,v as E,w as D}from"./index-BhhN-9_L.js";var O=2654435769;function k(){O=O+1831565813|0;let e=O;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function A(e,t){return e+(t-e)*k()}var j={petals:{colors:[16758741,16765411,16777215,16751810],size:[.09,.15],vel:[.9,-.55,.3],jitter:.3,sway:.8,additive:0,shape:1,alpha:.95,intensity:1.1},fireflies:{colors:[16773754,14221178,16769162],size:[.08,.14],vel:[0,.05,0],jitter:.25,sway:1.2,additive:1,shape:0,alpha:1,intensity:6},snow:{colors:[16777215,15791871],size:[.05,.11],vel:[.3,-1.1,.1],jitter:.3,sway:.5,additive:0,shape:2,alpha:.95,intensity:1.3},dust:{colors:[16773584,16769712],size:[.025,.05],vel:[.25,.04,.1],jitter:.15,sway:.4,additive:1,shape:0,alpha:.5,intensity:1.6},embers:{colors:[16747066,16757575,16734762],size:[.04,.08],vel:[.2,.8,0],jitter:.3,sway:.9,additive:1,shape:0,alpha:1,intensity:5}},M=`
uniform float uTime;
uniform vec3 uBoxMin;
uniform vec3 uBoxSize;
attribute vec4 aBase;
attribute vec4 aVel;
attribute vec4 aCol;
varying vec4 vCol;
varying vec2 vUv;
varying float vPhase;
void main() {
  float t = uTime;
  vec3 p = aBase.xyz + aVel.xyz * t;
  float ph = aBase.w;
  p.x += sin(t * 0.9 + ph * 6.2831) * aVel.w;
  p.z += cos(t * 0.7 + ph * 4.0) * aVel.w;
  p.y += sin(t * 1.3 + ph * 9.0) * aVel.w * 0.4;
  vec3 q = mod(p - uBoxMin, uBoxSize);
  vec3 e = min(q, uBoxSize - q) / (uBoxSize * 0.08);
  float edge = clamp(min(e.x, min(e.y, e.z)), 0.0, 1.0);
  vec3 wp = uBoxMin + q;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  float ang = t * (1.0 + ph * 2.0) + ph * 6.2831;
  vec2 c = position.xy;
  #if AMBIENT_SHAPE == 1
    c.x *= 0.55 + 0.45 * sin(ang * 1.7);
  #endif
  float cs = cos(ang), sn = sin(ang);
  c = mat2(cs, sn, -sn, cs) * c;
  mv.xy += c * aCol.w;
  gl_Position = projectionMatrix * mv;
  float blink = 1.0;
  #if AMBIENT_SHAPE == 0
    blink = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(t * (1.2 + ph * 2.5) + ph * 30.0), 2.0);
  #endif
  vCol = vec4(aCol.rgb, edge * blink);
  vUv = position.xy + 0.5;
  vPhase = ph;
}
`,N=`
uniform float uAlpha;
uniform float uAdditive;
varying vec4 vCol;
varying vec2 vUv;
varying float vPhase;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float a;
  vec3 col = vCol.rgb;
  #if AMBIENT_SHAPE == 0
    a = exp(-r * r * 4.0);
    col *= 1.0 + 2.0 * exp(-r * r * 30.0);
  #elif AMBIENT_SHAPE == 1
    vec2 q = vec2(p.x, p.y * 1.35 - 0.1);
    a = 1.0 - smoothstep(0.75, 0.95, length(q) + 0.35 * abs(p.x) * step(0.0, p.y));
    col *= 0.85 + 0.25 * (1.0 - r);
  #else
    a = 1.0 - smoothstep(0.55, 1.0, r);
  #endif
  a *= vCol.a * uAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(col * a, a * (1.0 - uAdditive));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;function P(t){let r=j[t.kind],o=new a(1,1),s=new n;s.index=o.index,s.setAttribute(`position`,o.getAttribute(`position`));let c=t.count,u=new Float32Array(c*4),d=new Float32Array(c*4),f=new Float32Array(c*4),p=new g,m=t.center.clone().addScaledVector(t.size,-.5);for(let e=0;e<c;e++)u[e*4]=m.x+k()*t.size.x,u[e*4+1]=m.y+k()*t.size.y,u[e*4+2]=m.z+k()*t.size.z,u[e*4+3]=k(),d[e*4]=r.vel[0]*A(.6,1.3)+A(-r.jitter,r.jitter),d[e*4+1]=r.vel[1]*A(.6,1.3)+A(-r.jitter,r.jitter)*.3,d[e*4+2]=r.vel[2]*A(.6,1.3)+A(-r.jitter,r.jitter),d[e*4+3]=r.sway*A(.4,1),p.setHex(r.colors[e%r.colors.length]).multiplyScalar(r.intensity),f[e*4]=p.r,f[e*4+1]=p.g,f[e*4+2]=p.b,f[e*4+3]=A(r.size[0],r.size[1]);s.setAttribute(`aBase`,new l(u,4)),s.setAttribute(`aVel`,new l(d,4)),s.setAttribute(`aCol`,new l(f,4)),s.instanceCount=c;let h={value:0},_=new i({vertexShader:M,fragmentShader:N,defines:{AMBIENT_SHAPE:r.shape},uniforms:{uTime:h,uBoxMin:{value:m},uBoxSize:{value:t.size.clone()},uAlpha:{value:r.alpha},uAdditive:{value:r.additive}},transparent:!0,depthWrite:!1,blending:5,blendSrc:201,blendDst:205}),v=new e(s,_);return v.frustumCulled=!1,v.renderOrder=9,v.name=`fx-ambient`,{mesh:v,time:h,dispose(){v.removeFromParent(),s.dispose(),o.dispose(),_.dispose()}}}var F=`
float fxHash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float fxHash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float fxNoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(fxHash13(i), fxHash13(i + vec3(1, 0, 0)), f.x),
        mix(fxHash13(i + vec3(0, 1, 0)), fxHash13(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(fxHash13(i + vec3(0, 0, 1)), fxHash13(i + vec3(1, 0, 1)), f.x),
        mix(fxHash13(i + vec3(0, 1, 1)), fxHash13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fxNoise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(fxHash12(i), fxHash12(i + vec2(1, 0)), f.x),
             mix(fxHash12(i + vec2(0, 1)), fxHash12(i + vec2(1, 1)), f.x), f.y);
}
float fxFbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * fxNoise3(p);
    p = p * 2.03 + vec3(1.7, 9.2, 4.1);
    a *= 0.5;
  }
  return v;
}
float fxFbm2(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * fxNoise2(p);
    p = p * 2.02 + vec2(5.3, 1.9);
    a *= 0.5;
  }
  return v;
}
`,I={hills:0,mountains:1,canyon:2,dunes:3,craters:4,ice:5},L=`
varying vec2 vUv;
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`,ee=`
uniform float uStyle;
uniform float uRadius;
uniform vec3 uFar;
uniform vec3 uMid;
uniform vec3 uNear;
uniform vec3 uHaze;
uniform vec3 uSnow;
uniform vec3 uSunDir;
varying vec2 vUv;
varying vec3 vWorld;
#include <fog_pars_fragment>
${F}

float ring1(float a, float f, float seed) {
  return fxFbm3(vec3(cos(a) * f, sin(a) * f, seed));
}
float ridge1(float a, float f, float seed) {
  float n = 0.0;
  float amp = 0.55;
  vec3 p = vec3(cos(a) * f, sin(a) * f, seed);
  for (int i = 0; i < 4; i++) {
    n += amp * (1.0 - abs(fxNoise3(p) * 2.0 - 1.0));
    p = p * 2.1 + 3.7;
    amp *= 0.5;
  }
  return n;
}

void main() {
  float a = atan(vWorld.x, vWorld.z);
  float y = vWorld.y;
  float s = uStyle;
  float hFar, hMid, hNear;
  if (s < 0.5) {
    hFar = 22.0 + 52.0 * pow(ridge1(a, 2.2, 1.0), 1.6);
    hMid = 9.0 + 12.0 * ring1(a, 3.0, 5.0);
    hNear = 2.5 + 7.0 * ring1(a, 4.5, 9.0);
  } else if (s < 1.5) {
    hFar = 30.0 + 70.0 * pow(ridge1(a, 2.6, 2.0), 1.4);
    hMid = 14.0 + 30.0 * pow(ridge1(a, 4.0, 6.0), 1.5);
    hNear = 3.0 + 8.0 * ring1(a, 5.0, 7.0);
  } else if (s < 2.5) {
    float m1 = ring1(a, 3.0, 3.0);
    float m2 = ring1(a, 5.5, 8.0);
    hFar = 20.0 + 38.0 * smoothstep(0.45, 0.5, m1) + 6.0 * m2;
    hMid = 10.0 + 30.0 * smoothstep(0.5, 0.54, m2) + 3.0 * m1;
    hNear = 2.0 + 14.0 * smoothstep(0.55, 0.58, ring1(a, 7.0, 4.0));
  } else if (s < 3.5) {
    hFar = 10.0 + 18.0 * ring1(a, 2.0, 1.0);
    hMid = 6.0 + 9.0 * (0.5 + 0.5 * sin(a * 9.0 + 4.0 * ring1(a, 3.0, 2.0)));
    hNear = 2.0 + 4.0 * (0.5 + 0.5 * sin(a * 17.0 + 5.0 * ring1(a, 4.0, 6.0)));
  } else if (s < 4.5) {
    hFar = 12.0 + 26.0 * pow(ridge1(a, 2.0, 4.0), 1.8);
    hMid = 5.0 + 9.0 * ring1(a, 3.5, 2.0);
    hNear = 1.5 + 4.0 * ring1(a, 6.0, 3.0);
  } else {
    hFar = 26.0 + 64.0 * pow(ridge1(a, 3.2, 6.0), 1.3);
    hMid = 10.0 + 26.0 * pow(ridge1(a, 4.6, 1.0), 1.6);
    hNear = 2.0 + 6.0 * ring1(a, 6.0, 2.0);
  }
  float tree = 0.0;
  if (s < 0.5) {
    float cells = 180.0;
    float x = a / 6.2831853 * cells;
    float id = floor(x);
    float f = fract(x) - 0.5;
    float hsh = fxHash12(vec2(id, 3.0));
    if (hsh > 0.55) {
      float r = 0.25 + 0.2 * hsh;
      tree = sqrt(max(r * r - f * f, 0.0)) * 10.0;
    }
  }
  vec3 col = vec3(0.0);
  float alpha = 1.0;
  float tShade = 0.0;
  if (y < hNear + tree) {
    tShade = clamp(y / (hNear + tree + 0.01), 0.0, 1.0);
    col = mix(uNear * 0.78, uNear * 1.08, tShade);
    if (y > hNear - 0.3) col = mix(col, uNear * 0.62, smoothstep(0.0, 0.5, tree));
  } else if (y < hMid) {
    tShade = clamp(y / hMid, 0.0, 1.0);
    col = mix(uMid * 0.82, uMid * 1.08, tShade);
    col = mix(col, uHaze, 0.06);
  } else if (y < hFar) {
    tShade = clamp(y / hFar, 0.0, 1.0);
    float n = fxNoise2(vec2(a * 30.0, y * 0.08));
    float facing = fxFbm2(vec2(a * 24.0, y * 0.05));
    col = uFar * mix(0.86, 1.06, facing) * (0.9 + 0.14 * tShade);
    float snowLine = hFar - (4.0 + 7.0 * n);
    float snowy = (s < 1.5 || s > 4.5) ? smoothstep(38.0, 52.0, hFar) : 0.0;
    col = mix(col, uSnow * mix(0.8, 1.05, facing), smoothstep(snowLine - 0.6, snowLine + 0.6, y) * snowy);
    if (s > 1.5 && s < 2.5) col *= 0.88 + 0.12 * sin(y * 1.4 + n);
    col = mix(col, uHaze, 0.22);
  } else {
    discard;
  }
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`,R=`
uniform sampler2D uMap;
uniform vec3 uHaze;
uniform vec3 uEdge;
uniform float uEdgeOn;
uniform vec2 uFadeV;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vec4 t = texture2D(uMap, vec2(1.0 - vUv.x, vUv.y));
  float edge = smoothstep(0.0, 0.07, vUv.x) * smoothstep(1.0, 0.93, vUv.x);
  float top = 1.0 - smoothstep(uFadeV.y, 1.0, vUv.y);
  vec3 c = mix(t.rgb, uEdge, uEdgeOn * (1.0 - smoothstep(uFadeV.x, uFadeV.x + 0.1, vUv.y)));
  gl_FragColor = vec4(c, t.a * edge * top);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`,z=40,B=32,V=.08;function H(n){let a=new E;a.name=`fx-backdrop`;let o=[],s=(t=0,r=Math.PI*2)=>{if(n.style===`none`)return null;let s=new y(n.radius,n.radius,150,128,1,!0,t,r);s.translate(0,29,0);let c=new i({vertexShader:L,fragmentShader:ee,uniforms:{...S.clone(b.fog),uStyle:{value:I[n.style]},uRadius:{value:n.radius},uFar:{value:new g(n.colors[0])},uMid:{value:new g(n.colors[1])},uNear:{value:new g(n.colors[2])},uHaze:{value:new g(n.haze)},uSnow:{value:new g(n.snow)},uSunDir:{value:n.sunDir.clone().normalize()}},side:1,fog:!0}),l=new e(s,c);return l.renderOrder=-900,a.add(l),o.push(s,c),l};if(n.url){let c=v.degToRad(n.arcDeg),l=new y(n.radius-2,n.radius-2,n.height+z,96,1,!0,Math.PI-c/2,c);l.translate(0,(n.height+z)/2+n.yOffset-z,0);let u=l.getAttribute(`uv`);for(let e=0;e<u.count;e++)u.setY(e,u.getY(e)*(1+z/n.height)-z/n.height);let d=new i({vertexShader:L,fragmentShader:R,uniforms:{uMap:{value:null},uHaze:{value:new g(n.haze)},uEdge:{value:new g},uEdgeOn:{value:0},uFadeV:{value:new f(Math.max(0,-n.yOffset/n.height),.74)}},side:1,transparent:!0,fog:!1}),p=new e(l,d);p.visible=!1,p.renderOrder=-890,a.add(p),o.push(l,d);let m=c*.07,h=n.arcDeg<359?s(Math.PI+c/2-m,Math.PI*2-c+m*2):null;new r().load(n.url,e=>{e.colorSpace=t,e.anisotropy=4,d.uniforms.uMap.value=e,p.visible=!0,o.push(e);let r=e.image,i=G(r);i&&(d.uniforms.uEdge.value.copy(i),d.uniforms.uEdgeOn.value=1,n.onEdgeColor?.(i));let a=n.onSkyBand?W(r):null;if(a){o.push(a);let e=n.height+n.yOffset,t=n.height*.74+n.yOffset;n.onSkyBand({texture:a,thetaStart:Math.PI-c/2,arc:c,sinTop:e/Math.hypot(e,n.radius),sinFade:t/Math.hypot(t,n.radius)})}},void 0,()=>{h?.removeFromParent(),s()})}else s();return{group:a,dispose(){a.removeFromParent();for(let e of o)e.dispose()}}}function U(e,t,n){let r=[];for(let i=0;i<t;i++){let a=0,o=0,s=0;for(let r=0;r<n;r++){let n=(r*t+i)*4;a+=e[n],o+=e[n+1],s+=e[n+2]}r.push([a/n,o/n,s/n])}let i=e=>{let t=r.map(t=>t[e]).sort((e,t)=>e-t);return t[t.length>>1]},a=[i(0),i(1),i(2)],o=r.map(e=>{let t=Math.hypot(e[0]-a[0],e[1]-a[1],e[2]-a[2])/255;return Math.exp(-(t*t)/(.2*.1))}),s=new Uint8Array(t*4);for(let e=0;e<t;e++){let n=0,i=0,c=0,l=0;for(let a=-2;a<=2;a++){let s=Math.min(t-1,Math.max(0,e+a)),u=o[s];n+=r[s][0]*u,i+=r[s][1]*u,c+=r[s][2]*u,l+=u}let u=l/5*.65;s[e*4]=Math.round((l>.001?n/l:a[0])*u+a[0]*(1-u)),s[e*4+1]=Math.round((l>.001?i/l:a[1])*u+a[1]*(1-u)),s[e*4+2]=Math.round((l>.001?c/l:a[2])*u+a[2]*(1-u)),s[e*4+3]=255}return s}function W(e){if(typeof document>`u`||!e?.width)return null;let n=document.createElement(`canvas`);n.width=B,n.height=6;let r=n.getContext(`2d`,{willReadFrequently:!0});if(!r)return null;r.drawImage(e,0,0,e.width,e.height*V,0,0,B,6);let i=U(r.getImageData(0,0,B,6).data,B,6),a=new T(i,B,1);return a.colorSpace=t,a.magFilter=D,a.minFilter=D,a.needsUpdate=!0,a}function G(e){if(typeof document>`u`||!e?.width)return null;let n=document.createElement(`canvas`);n.width=32,n.height=4;let r=n.getContext(`2d`,{willReadFrequently:!0});if(!r)return null;r.drawImage(e,0,e.height*.9,e.width,e.height*.1,0,0,32,4);let i=r.getImageData(0,0,32,4).data,a=0,o=0,s=0;for(let e=0;e<i.length;e+=4)a+=i[e],o+=i[e+1],s+=i[e+2];let c=i.length/4;return new g().setRGB(a/c/255,o/c/255,s/c/255,t)}var K={grass:0,regolith:1,sand:2,ice:3,rock:4,metal:5},q=`
uniform float uStyle;
uniform vec3 uBase;
uniform vec3 uDirt;
uniform vec4 uDirtCircle;
varying vec3 vFxWorld;
${F}

vec2 fxWorley(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(fxHash12(i + g), fxHash12(i + g + 17.0));
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
  }
  return vec2(d1, d2);
}

vec3 fxGroundColor(out float rough, out float metal) {
  vec2 p = vFxWorld.xz;
  float big = fxFbm2(p * 0.035);
  float mid = fxFbm2(p * 0.22 + 7.0);
  float fine = fxNoise2(p * 3.1);
  float dist = length(p - vec2(0.0, -15.0));
  vec3 c = uBase;
  rough = 0.95;
  metal = 0.0;
  if (uStyle < 0.5) {
    c *= 0.74 + 0.46 * big + 0.16 * mid + 0.08 * fine;
    c = mix(c, c * vec3(1.18, 1.1, 0.7), smoothstep(0.5, 0.75, mid) * 0.55);
    c = mix(c, c * vec3(0.75, 0.9, 0.85), smoothstep(0.55, 0.3, big) * 0.5);
    c *= 1.0 - 0.22 * smoothstep(35.0, 140.0, dist);
  } else if (uStyle < 1.5) {
    c *= 0.82 + 0.3 * big + 0.12 * mid + 0.05 * fine;
    vec2 w = fxWorley(p * 0.11);
    float bowl = smoothstep(0.45, 0.1, w.x);
    float rim = smoothstep(0.35, 0.47, w.x) * smoothstep(0.62, 0.48, w.x);
    c *= 1.0 - bowl * 0.22 + rim * 0.22;
    vec2 w2 = fxWorley(p * 0.45 + 3.0);
    c *= 1.0 - smoothstep(0.3, 0.05, w2.x) * 0.15 + smoothstep(0.3, 0.38, w2.x) * smoothstep(0.46, 0.38, w2.x) * 0.1;
  } else if (uStyle < 2.5) {
    float rip = sin(p.x * 0.9 + p.y * 0.35 + mid * 6.0);
    c *= 0.88 + 0.2 * big + 0.06 * rip + 0.05 * fine;
    vec2 w = fxWorley(p * 0.6);
    c *= 1.0 - smoothstep(0.12, 0.04, w.x) * 0.3;
  } else if (uStyle < 3.5) {
    vec2 w = fxWorley(p * 0.12);
    float crack = smoothstep(0.06, 0.0, w.y - w.x);
    c *= 0.92 + 0.12 * big + 0.05 * fine;
    c = mix(c, c * vec3(0.55, 0.75, 0.95), crack * 0.7);
    rough = 0.32;
  } else if (uStyle < 4.5) {
    c *= 0.78 + 0.35 * big + 0.15 * mid + 0.08 * fine;
    vec2 w = fxWorley(p * 0.2);
    c = mix(c, c * vec3(0.5, 0.45, 0.4), smoothstep(0.2, 0.05, w.x) * 0.6);
  } else {
    vec2 g = abs(fract(p / 2.5) - 0.5);
    float seam = smoothstep(0.47, 0.49, max(g.x, g.y));
    float tile = fxHash12(floor(p / 2.5));
    c *= 0.9 + 0.12 * tile;
    c *= 1.0 - seam * 0.45;
    float stripe = step(0.5, fract((p.x + p.y) * 0.5)) * smoothstep(13.5, 13.6, dist) * smoothstep(14.6, 14.5, dist);
    c = mix(c, vec3(1.0, 0.75, 0.1), stripe);
    rough = 0.38;
    metal = 0.55;
  }
  if (uDirtCircle.z > 0.0) {
    vec2 dp = p - uDirtCircle.xy;
    float edgeN = fxFbm2(p * 0.7) - 0.5;
    float d = length(dp) / uDirtCircle.z + edgeN * 0.16;
    vec3 dirt = uDirt * (0.9 + 0.14 * mid + 0.08 * fine);
    vec2 pw = fxWorley(p * 2.4);
    dirt = mix(dirt, dirt * 1.18, smoothstep(0.16, 0.08, pw.x) * step(0.7, fxHash12(floor(p * 2.4))));
    dirt *= 1.0 - 0.12 * smoothstep(0.55, 0.98, d);
    float inDirt = 1.0 - smoothstep(0.96, 1.0, d);
    float rimDark = smoothstep(0.94, 1.0, d) * (1.0 - smoothstep(1.0, 1.14, d));
    c = mix(c * (1.0 - rimDark * 0.18), dirt, inDirt);
  }
  return c;
}
`;function J(n){let i=new C(n.radius,128);i.rotateX(-Math.PI/2);let a=new o({color:16777215,roughness:.95,metalness:0}),l=[i,a],u=!!n.textureUrl;if(n.textureUrl){let e=new r().load(n.textureUrl);e.colorSpace=t,e.wrapS=e.wrapT=c,e.repeat.set(n.radius/4,n.radius/4),e.anisotropy=8,a.map=e,a.color.setHex(n.color),l.push(e)}let d={uStyle:{value:K[n.style]},uBase:{value:new g(n.color)},uDirt:{value:new g(n.dirt?.color??14201466)},uDirtCircle:{value:new s(n.dirt?.x??0,n.dirt?.z??0,n.dirt?.radius??0,0)},uEdge:{value:new g(0,0,0)},uEdgeOn:{value:0},uEdgeRange:{value:new f(n.radius*.15,n.radius*.62)}};a.onBeforeCompile=e=>{Object.assign(e.uniforms,d),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
varying vec3 vFxWorld;`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
vFxWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`);let t=e.fragmentShader.replace(`#include <common>`,`#include <common>
uniform vec3 uEdge;
uniform float uEdgeOn;
uniform vec2 uEdgeRange;
`+(u?`varying vec3 vFxWorld;`:q));u||(t=t.replace(`#include <color_fragment>`,`#include <color_fragment>
float fxRough; float fxMetal;
diffuseColor.rgb *= fxGroundColor(fxRough, fxMetal);`).replace(`#include <roughnessmap_fragment>`,`#include <roughnessmap_fragment>
roughnessFactor = fxRough;`).replace(`#include <metalnessmap_fragment>`,`#include <metalnessmap_fragment>
metalnessFactor = fxMetal;`)),t=t.replace(`#include <fog_fragment>`,[`#include <fog_fragment>`,`vec3 fxEdge = uEdge;`,`#ifdef TONE_MAPPING`,`fxEdge = toneMapping(fxEdge);`,`#endif`,`fxEdge = linearToOutputTexel(vec4(fxEdge, 1.0)).rgb;`,`gl_FragColor.rgb = mix(gl_FragColor.rgb, fxEdge, uEdgeOn * smoothstep(uEdgeRange.x, uEdgeRange.y, length(vFxWorld.xz)));`].join(`
`)),e.fragmentShader=t},a.customProgramCacheKey=()=>u?`fx-ground-tex-v3`:`fx-ground-v3`;let p=new e(i,a);return p.name=`fx-ground`,p.userData.uniforms=d,p.receiveShadow=!0,p.renderOrder=-800,{mesh:p,setEdgeColor(e){d.uEdge.value.copy(e),d.uEdgeOn.value=1},dispose(){p.removeFromParent();for(let e of l)e.dispose()}}}var Y=`
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`,X=`
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uBottom;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSpace;
uniform float uStars;
uniform float uNebula;
uniform float uClouds;
uniform float uTime;
uniform vec4 uPlanet;
uniform vec3 uPlanetColor;
uniform vec3 uPlanetColor2;
uniform float uPlanetStyle;
uniform sampler2D uBand;
uniform vec4 uBandGeom;
uniform float uBandFade;
uniform float uBandOn;
varying vec3 vDir;
${F}

vec3 starField(vec3 d, float scale, float thresh) {
  vec3 p = d * scale;
  vec3 cell = floor(p);
  float h = fxHash13(cell);
  if (h < thresh) return vec3(0.0);
  vec3 jitter = vec3(fxHash13(cell + 11.1), fxHash13(cell + 23.7), fxHash13(cell + 41.3));
  float dist = length(p - (cell + 0.2 + 0.6 * jitter));
  float tw = 0.65 + 0.35 * sin(uTime * (1.5 + h * 4.0) + h * 80.0);
  float b = smoothstep(0.16, 0.0, dist) * tw * (h - thresh) / (1.0 - thresh);
  vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.85, 0.7), fxHash13(cell + 5.0));
  return tint * b * 5.0;
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col;
  if (h >= 0.0) {
    col = mix(uHorizon, uTop, pow(h, 0.55));
  } else {
    col = mix(uHorizon, uBottom, pow(-h, 0.35));
  }
  if (uBandOn > 0.5) {
    float u = mod(atan(d.x, d.z) - uBandGeom.x, 6.2831853) / uBandGeom.y;
    if (u > 1.0) u = u < 0.5 * (1.0 + 6.2831853 / uBandGeom.y) ? 1.0 : 0.0;
    vec3 band = texture2D(uBand, vec2(1.0 - u, 0.5)).rgb;
    col = mix(col, band, smoothstep(uBandFade - 0.04, uBandFade, h) * (1.0 - smoothstep(uBandGeom.z, uBandGeom.w, h)));
  }
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunColor * (pow(sd, 8.0) * 0.18 + pow(sd, 64.0) * 0.35) * (1.0 - uSpace * 0.6);
  col += uSunColor * smoothstep(0.9993, 0.99965, sd) * 8.0;

  if (uNebula > 0.5) {
    float n1 = fxFbm3(d * 2.2 + vec3(3.1, 0.0, 1.7));
    float n2 = fxFbm3(d * 4.5 - vec3(uTime * 0.002, 2.0, 0.0));
    float mask = smoothstep(0.42, 0.78, n1) * (0.55 + 0.6 * n2);
    vec3 neb = mix(vec3(0.32, 0.08, 0.55), vec3(0.05, 0.42, 0.62), smoothstep(0.3, 0.7, n2));
    neb = mix(neb, vec3(0.85, 0.22, 0.55), smoothstep(0.62, 0.85, n1) * 0.7);
    col += neb * mask * 0.55;
    col += vec3(0.5, 0.35, 0.8) * pow(smoothstep(0.55, 0.9, n1), 2.0) * 0.25;
  }
  if (uStars > 0.5) {
    float vis = uSpace > 0.5 ? 1.0 : 0.35;
    col += (starField(d, 180.0, 0.985) + starField(d, 420.0, 0.993) * 0.6) * vis * smoothstep(-0.05, 0.08, h + uSpace);
  }

  if (uClouds > 0.5 && h > 0.0) {
    vec2 uv = d.xz / (h + 0.1) * 0.42 + vec2(uTime * 0.004, uTime * 0.0015);
    vec2 warp = vec2(fxFbm2(uv * 0.7), fxFbm2(uv * 0.7 + 9.0)) - 0.5;
    vec2 cuv = uv * 1.15 + warp * 0.9;
    float c = fxFbm2(cuv);
    float c2 = fxFbm2(cuv + vec2(0.05, -0.09));
    float cloud = smoothstep(0.5, 0.6, c) * smoothstep(0.02, 0.2, h);
    float shade = clamp((c - c2) * 7.0 + 0.55, 0.0, 1.0) * smoothstep(0.5, 0.66, c);
    vec3 cloudCol = mix(mix(uTop, vec3(0.85), 0.55), vec3(1.02, 1.0, 0.98) + uSunColor * 0.06, shade);
    col = mix(col, cloudCol, cloud);
  }

  if (uPlanet.w > 0.0) {
    vec3 P = normalize(uPlanet.xyz);
    float sinA = sin(uPlanet.w);
    vec3 u = normalize(cross(P, abs(P.y) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
    vec3 v = cross(u, P);
    float pd = dot(d, P);
    vec2 q = vec2(dot(d, u), dot(d, v)) / sinA;
    float rr = dot(q, q);
    if (pd > 0.0 && rr < 1.0) {
      float z = sqrt(1.0 - rr);
      vec3 N = normalize(q.x * u + q.y * v - z * P);
      float lit = smoothstep(-0.15, 0.35, dot(N, uSunDir));
      vec3 surf;
      vec3 sp = vec3(q, z);
      if (uPlanetStyle < 0.5) {
        float lat = q.y + 0.08 * fxFbm3(sp * 3.0 + vec3(uTime * 0.01, 0.0, 0.0));
        float bands = 0.5 + 0.5 * sin(lat * 18.0 + 1.3 * fxNoise3(sp * 6.0));
        surf = mix(uPlanetColor, uPlanetColor2, bands);
        float spot = smoothstep(0.16, 0.08, length((q - vec2(0.35, -0.28)) * vec2(1.0, 1.7)));
        surf = mix(surf, vec3(0.75, 0.32, 0.18), spot * 0.8);
      } else if (uPlanetStyle < 1.5) {
        float land = smoothstep(0.5, 0.56, fxFbm3(sp * 2.4 + 4.0));
        surf = mix(uPlanetColor, uPlanetColor2, land);
        float cl = smoothstep(0.5, 0.75, fxFbm3(sp * 3.5 + vec3(uTime * 0.01)));
        surf = mix(surf, vec3(1.0), cl * 0.85);
      } else {
        float n = fxFbm3(sp * 4.0);
        surf = mix(uPlanetColor, uPlanetColor2, n);
      }
      vec3 pc = surf * (0.04 + 1.1 * lit);
      float rim = pow(1.0 - z, 3.0);
      pc += uPlanetColor * rim * 0.6 * lit;
      col = mix(col, pc, smoothstep(1.0, 0.985, rr));
    } else if (pd > 0.0) {
      float atm = exp(-(sqrt(rr) - 1.0) * 30.0) * 0.5;
      col += uPlanetColor * atm * smoothstep(-0.3, 0.4, dot(d, uSunDir) + 0.2);
    }
  }

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`,Z={bands:0,earth:1,rock:2};function Q(t){let n={value:0},r=t.planet,a=new s(0,0,0,0);r&&a.set(r.dir[0],r.dir[1],r.dir[2],v.degToRad(r.size));let o=new i({vertexShader:Y,fragmentShader:X,uniforms:{uTop:{value:new g(t.top)},uHorizon:{value:new g(t.horizon)},uBottom:{value:new g(t.bottom)},uSunDir:{value:t.sunDir.clone().normalize()},uSunColor:{value:new g(t.sunColor)},uSpace:{value:+!!t.space},uStars:{value:+!!t.stars},uNebula:{value:+!!t.nebula},uClouds:{value:+!!t.clouds},uTime:n,uPlanet:{value:a},uPlanetColor:{value:new g(r?.color??16777215)},uPlanetColor2:{value:new g(r?.color2??r?.color??16777215)},uPlanetStyle:{value:Z[r?.style??`rock`]},uBand:{value:null},uBandGeom:{value:new s},uBandFade:{value:0},uBandOn:{value:0}},side:1,depthWrite:!1,depthFunc:3,fog:!1}),c=new u(10,64,32),l=new e(c,o);return l.name=`fx-sky`,l.frustumCulled=!1,l.renderOrder=-1e3,l.onBeforeRender=(e,t,n)=>{l.position.copy(n.position),l.updateMatrixWorld()},{mesh:l,time:n,setBand(e){o.uniforms.uBand.value=e.texture,o.uniforms.uBandGeom.value.set(e.thetaStart,e.arc,e.sinTop,e.sinTop+.3),o.uniforms.uBandFade.value=e.sinFade,o.uniforms.uBandOn.value=1},dispose(){c.dispose(),o.dispose()}}}var $=131850,te=659242,ne={meadow:{id:`meadow`,sky:{top:3111132,horizon:11854079,bottom:6987850},ground:{color:6468908,style:`grass`,textureUrl:`./assets/textures/grass.jpg`,dirtCircle:{color:14923895,radius:8.5,x:0,z:-20}},backdrop:{url:`./assets/backdrops/meadow.jpg`,arcDeg:150},fog:{color:12904191,near:90,far:480},sun:{color:16773592,intensity:2.6,dir:[-.45,.85,.4],shadow:!0},hemi:{sky:13363455,ground:7315004,intensity:1.15},clouds:!0,ambient:`petals`,backdropStyle:`hills`,backdropColors:[8363990,8176716,6270522],envIntensity:.7},"zen-sunset":{id:`zen-sunset`,sky:{top:2899343,horizon:16757370,bottom:8018538},ground:{color:8368974,style:`grass`,textureUrl:`./assets/textures/grass.jpg`},backdrop:{url:`./assets/backdrops/zen.jpg`,arcDeg:150},fog:{color:15971468,near:60,far:240},sun:{color:16757611,intensity:2.2,dir:[.35,.22,-.9],shadow:!0},hemi:{sky:16763296,ground:4872762,intensity:1},clouds:!0,stars:!0,ambient:`fireflies`,backdropStyle:`hills`,backdropColors:[9071264,6060632,4218942],envIntensity:.6},canyon:{id:`canyon`,sky:{top:4034016,horizon:16769208,bottom:12085818},ground:{color:14256718,style:`sand`,textureUrl:`./assets/textures/sand.jpg`},backdrop:{url:`./assets/backdrops/canyon.jpg`,arcDeg:160},fog:{color:15979181,near:100,far:560},sun:{color:16769720,intensity:2.8,dir:[-.5,.75,.35],shadow:!0},hemi:{sky:12574975,ground:10902064,intensity:1.05},clouds:!0,ambient:`dust`,backdropStyle:`canyon`,backdropColors:[13660234,12080431,10241062],envIntensity:.6},mars:{id:`mars`,sky:{top:7227976,horizon:15776138,bottom:9062954},ground:{color:12085055,style:`sand`,textureUrl:`./assets/textures/marssand.jpg`},backdrop:{url:`./assets/backdrops/mars.jpg`,arcDeg:150},fog:{color:14459002,near:90,far:520},sun:{color:16773344,intensity:2.3,dir:[.4,.7,.4],shadow:!0},hemi:{sky:15775888,ground:8010272,intensity:1},ambient:`dust`,backdropStyle:`craters`,backdropColors:[11035722,9390640,8010788],planet:{color:10128e3,color2:6969936,dir:[.6,.35,-.7],size:1.6,style:`rock`},envIntensity:.55},moon:{id:`moon`,sky:`space`,ground:{color:11119024,style:`regolith`,textureUrl:`./assets/textures/regolith.jpg`},backdrop:{url:`./assets/backdrops/moon.jpg`,arcDeg:150},sun:{color:16777215,intensity:3.4,dir:[-.6,.55,.3],shadow:!0},hemi:{sky:4870256,ground:2763312,intensity:.45},stars:!0,ambient:`none`,backdropStyle:`craters`,backdropColors:[9079442,10132130,10921646],planet:{color:2779864,color2:5216842,dir:[.35,.3,-.9],size:6,style:`earth`},envIntensity:.3},jupiter:{id:`jupiter`,sky:`space`,ground:{color:15389358,style:`sand`},backdrop:{url:`./assets/backdrops/jupiter.jpg`,arcDeg:150},sun:{color:16774888,intensity:2.6,dir:[.7,.45,.2],shadow:!0},hemi:{sky:9075306,ground:3820122,intensity:.6},stars:!0,ambient:`snow`,backdropStyle:`ice`,backdropColors:[12110040,13162726,14214896],planet:{color:14198904,color2:15917768,dir:[-.2,.42,-.88],size:15,style:`bands`},envIntensity:.35},ice:{id:`ice`,sky:{top:4032224,horizon:14216959,bottom:12376302},ground:{color:13953528,style:`ice`,textureUrl:`./assets/textures/snow.jpg`},backdrop:{url:`./assets/backdrops/ice.jpg`,arcDeg:150},fog:{color:14216447,near:90,far:520},sun:{color:16775408,intensity:2.4,dir:[-.4,.6,.5],shadow:!0},hemi:{sky:14216447,ground:9087176,intensity:1.2},clouds:!0,ambient:`snow`,backdropStyle:`mountains`,backdropColors:[8036304,10272224,12901616],envIntensity:.75},space:{id:`space`,sky:`space`,ground:null,sun:{color:16774376,intensity:2.2,dir:[.5,.6,.6],shadow:!1},hemi:{sky:6974122,ground:1708080,intensity:.7},stars:!0,nebula:!0,ambient:`none`,backdropStyle:`none`,envIntensity:.35},station:{id:`station`,sky:`space`,ground:{color:10135224,style:`metal`},backdrop:{url:`./assets/backdrops/station.jpg`,arcDeg:200},sun:{color:16777215,intensity:3,dir:[-.5,.6,.5],shadow:!0},hemi:{sky:7375040,ground:2107448,intensity:.7},stars:!0,nebula:!0,ambient:`none`,backdropStyle:`none`,planet:{color:2779864,color2:5216842,dir:[.2,-.12,-1],size:34,style:`earth`},envIntensity:.45}},re={hills:[8363990,8176716,6270522],mountains:[9086672,6986346,5212740],canyon:[14254170,12607546,11030318],dunes:[14725242,13933146,13142090],craters:[9079442,10132130,10921646],ice:[12110040,13162726,14214896],none:[0,0,0]},ie={low:1024,medium:2048,high:2048},ae={low:90,medium:240,high:420};function oe(t,n,r,o,s){let c=new d,l=new u(50,32,16),f=new i({vertexShader:`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uGround;
      varying vec3 vP;
      void main() {
        float h = normalize(vP).y;
        vec3 c = h > 0.0 ? mix(uHorizon, uTop, pow(h, 0.6)) : mix(uHorizon * 0.8, uGround, pow(-h, 0.4));
        gl_FragColor = vec4(c, 1.0);
      }`,uniforms:{uTop:{value:new g(n)},uHorizon:{value:new g(r)},uGround:{value:new g(o)}},side:1});c.add(new e(l,f));let p=new a(1,1),m=new _({color:new g(5,5,5),side:2}),h=[[s.x*40,Math.max(s.y,.3)*40,s.z*40,22,14],[-30,25,-20,18,10],[25,18,30,14,8]];for(let[t,n,r,i,a]of h){let o=new e(p,m);o.position.set(t,n,r),o.scale.set(i,a,1),o.lookAt(0,0,0),c.add(o)}let v=new w(t),y=v.fromScene(c,.03);return v.dispose(),l.dispose(),f.dispose(),p.dispose(),m.dispose(),y}function se(e,t){let{scene:n,renderer:r,camera:i}=e,a=new E;a.name=`fx-env-${t.id}`,n.add(a);let o=[],s=[],c=t.sky===`space`,l=c?$:t.sky.top,u=c?te:t.sky.horizon,d=c?$:t.sky.bottom??u,f=new p(...t.sun.dir).normalize(),g=Q({space:c,top:l,horizon:u,bottom:d,sunDir:f,sunColor:t.sun.color,stars:t.stars??c,nebula:t.nebula??!1,clouds:t.clouds??!1,planet:t.planet});a.add(g.mesh),s.push(g.time),o.push(()=>g.dispose());let _=null,v=null,y=Math.min(t.backdrop?.radius??240,i.far*.8),b=t.backdropStyle??(c?`none`:`hills`);if(t.ground!==null&&(t.backdrop||b!==`none`)){let e=H({radius:y,height:t.backdrop?.height??y*.42,yOffset:t.backdrop?.yOffset??-6,arcDeg:t.backdrop?.arcDeg??140,url:t.backdrop?.url,onEdgeColor:e=>_?_(e):v=e,onSkyBand:e=>g.setBand(e),style:b,colors:t.backdropColors??re[b],haze:t.fog?.color??u,snow:16054527,sunDir:f});a.add(e.group),o.push(()=>e.dispose())}let S=null;if(t.ground){let e=t.ground,n=J({color:e.color,style:e.style??`grass`,radius:e.size?e.size/2:y-1,textureUrl:e.textureUrl,dirt:e.dirtCircle?{color:e.dirtCircle.color,radius:e.dirtCircle.radius,x:e.dirtCircle.x??0,z:e.dirtCircle.z??0}:void 0});a.add(n.mesh),o.push(()=>n.dispose()),_=e=>n.setEdgeColor(e),v&&n.setEdgeColor(v),S=0}let C=n.fog;n.fog=t.fog?new m(t.fog.color,t.fog.near,t.fog.far):null;let w=new h(t.hemi.sky,t.hemi.ground,t.hemi.intensity);a.add(w);let T=new x(t.sun.color,t.sun.intensity);T.castShadow=t.sun.shadow;let D=ie[e.quality];T.shadow.mapSize.set(D,D),T.shadow.bias=-4e-4,T.shadow.normalBias=.03,a.add(T,T.target),o.push(()=>{T.shadow.map?.dispose(),T.dispose(),w.dispose()});let O=(e,t)=>{let[n,r,i]=e;T.target.position.set(n,r,i),T.position.set(n+f.x*80,r+f.y*80,i+f.z*80);let a=T.shadow.camera,o=t/2;a.left=-o,a.right=o,a.top=o,a.bottom=-o,a.near=1,a.far=200,a.updateProjectionMatrix(),T.target.updateMatrixWorld(),T.updateMatrixWorld()},k=t.shadowBounds??{center:[0,0,-16],size:56};O(k.center,k.size);let A=n.environment,j=n.environmentIntensity,M=oe(r,c?1054768:l,c?2107464:u,t.ground?.color??1052696,f),N=M.texture;if(n.environment=N,n.environmentIntensity=t.envIntensity??.6,o.push(()=>M.dispose()),t.ambient&&t.ambient!==`none`){let n=P({kind:t.ambient,count:ae[e.quality],center:new p(0,6,-16),size:new p(56,14,56)});a.add(n.mesh),s.push(n.time),o.push(()=>n.dispose())}return{def:t,groundY:S,hemiLight:w,sunLight:T,update(e){for(let t=0;t<s.length;t++)s[t].value+=e},setShadowBounds:O,dispose(){for(let e of o)e();a.removeFromParent(),n.environment===N&&(n.environment=A,n.environmentIntensity=j),n.fog=C}}}export{ne as WORLD_PRESETS,se as createEnvironment,k as n,A as r,F as t};