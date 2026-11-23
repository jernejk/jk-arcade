import * as T from '../vendor/three.module.min.js';
import { greedyMesh, palette } from './mesher.js';
import { SEA, WIDTH, LENGTH, random, clamp } from './world.js';
import { RAD, DT, launch, preview } from './duel.js';
import { Batch, makeToy, backdrop, islandProps } from './toys.js';

const v = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const vec = (p) => v(p.x, p.y, p.z);
const damp = (dt, k) => 1 - (1 + k * dt) * Math.exp(-k * dt);
const smooth = (t) => t * t * (3 - 2 * t);
const fog = new T.Fog('#dcc0bd', 60, 137);
const dummy = new T.Object3D();
const debrisColors = palette.map((hex) => new T.Color(hex));
const splashColors = ['#88ddd4', '#d4f5da'].map((hex) => new T.Color(hex));
const sparkColor = new T.Color('#f4b45e');

function sky() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext('2d'),
    g = ctx.createLinearGradient(0, 0, 0, 512);
  for (const [a, c] of [
    [0, '#4d5982'],
    [0.25, '#827796'],
    [0.4, '#dc9fa9'],
    [0.48, '#ffc391'],
    [0.51, '#ffdda1'],
    [1, '#b9c0c0'],
  ])
    g.addColorStop(a, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2048, 512);
  const rng = random(181);
  for (let i = 0; i < 115; i++) {
    const x = rng() * 2048,
      y = 105 + rng() * 142,
      w = 17 + rng() * 100,
      h = 3 + rng() * 15;
    for (let j = 0; j < 7; j++) {
      const px = x + (w * j) / 8,
        py = y + Math.sin(j * 1.2) * h * 0.45;
      for (const shift of [-2048, 0, 2048]) {
        const cloud = ctx.createRadialGradient(
          px + shift,
          py,
          0,
          px + shift,
          py,
          w * 0.36,
        );
        cloud.addColorStop(
          0,
          y > 300 ? 'rgba(255,221,173,.52)' : 'rgba(222,174,184,.49)',
        );
        cloud.addColorStop(1, 'rgba(239,184,180,0)');
        ctx.save();
        ctx.translate(0, py);
        ctx.scale(1, h / (w * 0.36));
        ctx.translate(0, -py);
        ctx.fillStyle = cloud;
        ctx.fillRect(px + shift - w, py - w, w * 2, w * 2);
        ctx.restore();
      }
    }
  }
  const glow = ctx.createRadialGradient(405, 239, 9, 405, 239, 90);
  glow.addColorStop(0, '#ffedb1');
  glow.addColorStop(0.13, '#ffe7a2');
  glow.addColorStop(0.16, 'rgba(255,219,150,.65)');
  glow.addColorStop(1, 'rgba(255,222,162,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(311, 145, 188, 188);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const geometry = new T.SphereGeometry(195, 40, 24);
  const mesh = new T.Mesh(
    geometry,
    new T.MeshBasicMaterial({
      map: texture,
      side: T.BackSide,
      fog: false,
      depthWrite: false,
    }),
  );
  mesh.renderOrder = -5;
  return mesh;
}

function terrainPaint() {
  const mat = new T.MeshBasicMaterial({ vertexColors: true });
  mat.onBeforeCompile = (s) => {
    s.vertexShader =
      'attribute float blockKind; varying float kind; varying vec3 blocks;\n' +
      s.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n blocks=position; kind=blockKind;',
      );
    s.fragmentShader =
      'varying float kind; varying vec3 blocks;\n' +
      s.fragmentShader.replace(
        '#include <color_fragment>',
        `
      #include <color_fragment>
      vec3 face=floor(blocks-0.001*normalize(cross(dFdx(blocks),dFdy(blocks))));
      float grain=fract(sin(dot(mod(face,64.0),vec3(12.5,41.3,7.7)))*2137.1);
      vec3 edge=abs(fract(blocks+0.5)-0.5);
      vec3 fw=max(fwidth(blocks),vec3(.002));
      vec3 line=1.0-smoothstep(vec3(.0),fw*0.65+0.014,edge);
      float joint=max(min(line.x,line.y),max(min(line.y,line.z),min(line.z,line.x)));
      diffuseColor.rgb *= (0.87+0.20*grain)*(1.0-0.13*joint);
      vec3 axis=abs(normalize(cross(dFdx(blocks),dFdy(blocks))));
      vec2 uv=axis.y>.5?blocks.xz:(axis.x>.5?blocks.zy:blocks.xy);
      if(kind>=5.0 && kind<=8.0){
        vec2 cell=fract(uv);
        float ribs=.5+.5*cos(uv.x*31.416);
        diffuseColor.rgb*=.83+.20*ribs;
        float rim=min(min(cell.x,1.-cell.x),min(cell.y,1.-cell.y));
        if(rim<.052) diffuseColor.rgb*=.55;
        float rivet=length(abs(cell-.5)-.39);
        if(rivet<.042) diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.74,.49,.20),.85);
        if(kind>7.5 && min(abs(cell.x-cell.y),abs(cell.x+cell.y-1.))<.064) diffuseColor.rgb*=.63;
      }else{
        vec2 fine=floor(uv*9.);
        float grit=fract(sin(dot(mod(fine,83.),vec2(19.1,43.7)))*371.5);
        float speck=step(.92,grit)*(1.-smoothstep(.025,.12,max(fwidth(uv.x),fwidth(uv.y))));
        diffuseColor.rgb*=1.-speck*.14;
      }
    `,
      );
  };
  return mat;
}
function ocean() {
  const uniforms = { time: { value: 0 }, depthMap: { value: null } };
  const mat = new T.ShaderMaterial({
    uniforms,
    vertexShader: `
    varying vec3 pos;
    uniform float time;
    void main(){
      pos=(modelMatrix*vec4(position,1.)).xyz;
      pos.y+=.055*sin(pos.z*.45+pos.x*.28+time*1.3);
      gl_Position=projectionMatrix*viewMatrix*vec4(pos,1.);
    }`,
    fragmentShader: `
    uniform float time; uniform sampler2D depthMap; varying vec3 pos;
    void main(){
      vec2 uv=pos.xz/vec2(48.,112.);
      float bed=texture2D(depthMap,clamp(uv,0.,1.)).r*40.;
      float shore=(1.-smoothstep(.0,4.5,6.-bed))*step(0.,min(uv.x,uv.y))*step(max(uv.x,uv.y),1.);
      float wave=sin(pos.z*2.1+sin(pos.x*.84+time*.85+pos.z*.24)*1.7+time*1.6);
      float streak=smoothstep(.83,.99,wave)*smoothstep(.35,.94,sin(pos.x*1.31+pos.z*.33-time*.7));
      vec3 c=mix(vec3(.055,.39,.48),vec3(.22,.73,.70),.4+.26*sin(pos.z*.29+pos.x*.47)+shore*.38);
      c+=streak*vec3(.22,.21,.16)+shore*smoothstep(-.15,.7,wave+.45*sin(pos.x*2.1))*.38;
      c=mix(c,vec3(.79,.72,.73),smoothstep(50.,145.,distance(pos,cameraPosition))*.88);
      gl_FragColor=vec4(c,1.);
    }`,
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(360, 360, 32, 32), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(24, SEA - 0.02, 56);
  return mesh;
}

export class Battlefield {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor('#b8a1ae');
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.scene = new T.Scene();
    this.scene.fog = fog;
    this.camera = new T.PerspectiveCamera(58, 1, 0.09, 290);
    this.look = v();
    this.sky = sky();
    this.water = ocean();
    this.scene.add(
      this.sky,
      this.water,
      backdrop(),
      new T.HemisphereLight('#fff3d8', '#8c8da2', 1.7),
    );
    const key = new T.DirectionalLight('#ffe2c1', 1.85);
    key.position.set(22, 35, -18);
    this.scene.add(key);
    this.material = terrainPaint();
    this.chunks = new Map();
    this.pending = new Map();
    this.revision = 0;
    try {
      this.worker = new Worker(new URL('./mesh-worker.js', import.meta.url), {
        type: 'module',
      });
      this.worker.onmessage = ({ data: { chunks, revision } }) => {
        for (const { id, mesh } of chunks) {
          if (this.pending.get(id) !== revision) continue;
          this.replaceChunk(id, mesh);
          this.pending.delete(id);
        }
      };
      this.worker.onerror = () => {
        this.worker.terminate();
        this.worker = null;
        for (const id of this.pending.keys())
          this.replaceChunk(id, greedyMesh(this.round.world, id));
        this.pending.clear();
      };
    } catch {
      this.worker = null;
    }
    this.toys = [makeToy(false), makeToy(true)];
    this.toys.forEach((t) => this.scene.add(t.group));
    const shadow = new T.MeshBasicMaterial({
      color: '#615441',
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this.shadows = [0, 1].map(() => {
      const s = new T.Mesh(new T.CircleGeometry(1, 18), shadow);
      s.rotation.x = -Math.PI / 2;
      s.scale.set(1.65, 1.9, 1);
      this.scene.add(s);
      return s;
    });
    this.pips = new T.InstancedMesh(
      new T.IcosahedronGeometry(0.1, 1),
      new T.MeshBasicMaterial({ color: '#fff5bc' }),
      14,
    );
    const shotToy = new Batch();
    shotToy.ball([0, 0, 0], [0.22, 0.22, 0.31], '#eda555');
    shotToy.tube([0, 0, -0.04], [0.226, 0.055, 0.226], '#3b6c70', [
      Math.PI / 2,
      0,
      0,
    ]);
    shotToy.tube([0, 0, -0.2], [0.174, 0.07, 0.174], '#eace86', [
      Math.PI / 2,
      0,
      0,
    ]);
    this.shell = shotToy.mesh();
    const plumage = new Batch();
    plumage.ball([0, 0, 0], [0.2, 0.18, 0.49], '#fff0c0');
    plumage.box([0, 0, 0.47], [0.14, 0.1, 0.2], '#f4ae53');
    for (const side of [-1, 1])
      plumage.box([side * 0.45, 0.15, 0], [0.85, 0.1, 0.32], '#59a399', [
        0,
        0,
        side * 0.32,
      ]);
    this.birds = [0, 1, 2].map(() => {
      const b = plumage.mesh();
      this.scene.add(b);
      return b;
    });
    this.bombs = new T.InstancedMesh(
      new T.SphereGeometry(0.24, 8, 6),
      new T.MeshStandardMaterial({ color: '#ba7353', roughness: 0.45 }),
      3,
    );
    this.bombs.frustumCulled = false;
    this.scene.add(this.bombs);
    this.dust = new T.InstancedMesh(
      new T.BoxGeometry(1, 1, 1),
      new T.MeshBasicMaterial(),
      220,
    );
    // Allocate the instance-colour attribute before the first render so the
    // first impact uses the same shader program as the idle particle batch.
    this.dust.setColorAt(0, sparkColor);
    this.mist = new T.InstancedMesh(
      new T.IcosahedronGeometry(1, 0),
      new T.MeshBasicMaterial({
        color: '#ffe7bd',
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
      }),
      64,
    );
    this.dust.frustumCulled =
      this.mist.frustumCulled =
      this.pips.frustumCulled =
        false;
    this.scene.add(this.dust, this.mist, this.shell, this.pips);
    this.scale = 1;
    this.slow = 0;
    this.time = 0;
    this.resetCamera = true;
    this.lastSize = '';
  }
  load(round) {
    this.round = round;
    this.pending.clear();
    for (const mesh of this.chunks.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.chunks.clear();
    if (this.props) {
      this.scene.remove(this.props);
      this.props.geometry.dispose();
    }
    this.props = islandProps(round.world, round.number * 317);
    this.scene.add(this.props);
    const data = new Uint8Array(WIDTH * LENGTH);
    this.depth?.dispose();
    this.depth = new T.DataTexture(data, WIDTH, LENGTH, T.RedFormat);
    this.depth.magFilter = this.depth.minFilter = T.LinearFilter;
    this.water.material.uniforms.depthMap.value = this.depth;
    this.sync(true);
    this.resetCamera = true;
  }
  replaceChunk(id, { positions, colors, materials, indices }) {
    const previous = this.chunks.get(id);
    if (previous) {
      this.scene.remove(previous);
      previous.geometry.dispose();
      this.chunks.delete(id);
    }
    if (!indices.length) return;
    const geo = new T.BufferGeometry();
    const attribute = (data, size, Type) =>
      new T.BufferAttribute(data instanceof Type ? data : new Type(data), size);
    geo.setAttribute('position', attribute(positions, 3, Float32Array));
    geo.setAttribute('color', attribute(colors, 3, Float32Array));
    geo.setAttribute('blockKind', attribute(materials, 1, Float32Array));
    geo.setIndex(attribute(indices, 1, Uint16Array));
    // Every vertex is bounded by its fixed 16-block chunk.
    const centre = v(
      (id % 3) * 16 + 8,
      (Math.floor(id / 3) % 3) * 16 + 8,
      Math.floor(id / 9) * 16 + 8,
    );
    geo.boundingSphere = new T.Sphere(centre, Math.sqrt(3) * 8);
    const mesh = new T.Mesh(geo, this.material);
    this.scene.add(mesh);
    this.chunks.set(id, mesh);
  }
  sync(immediate = false) {
    const world = this.round.world,
      ids = [...world.dirty];
    if (this.worker && !immediate) {
      const revision = ++this.revision,
        cells = world.cells.slice();
      for (const id of ids) this.pending.set(id, revision);
      this.worker.postMessage({ ids, cells, revision }, [cells.buffer]);
    } else for (const id of ids) this.replaceChunk(id, greedyMesh(world, id));
    const props = this.props,
      indices = props.geometry.index;
    for (const a of props.userData.anchors) {
      if (!a.gone && !world.get(a.x, a.y, a.z)) {
        indices.array.fill(0, a.first, a.end);
        indices.needsUpdate = true;
        a.gone = true;
      }
    }
    world.dirty.clear();
    const columns = new Set(ids.map((id) => (id % 3) + 3 * Math.floor(id / 9)));
    for (const c of columns) {
      const left = (c % 3) * 16,
        front = Math.floor(c / 3) * 16;
      for (let z = front; z < front + 16; z++)
        for (let x = left; x < left + 16; x++)
          this.depth.image.data[z * WIDTH + x] = Math.round(
            (world.top(x, z) * 255) / 40,
          );
    }
    this.depth.needsUpdate = true;
  }
  burst(shot, result) {
    const rng = random(
      this.round.number * 83 + Math.round(shot.p.z * 131 + shot.p.x * 53),
    );
    this.chips = [];
    const splash = shot.hit === 'water',
      pieces = result.debris,
      amount = splash ? 34 : Math.min(208, Math.max(25, pieces.length * 4));
    for (let i = 0; i < amount; i++) {
      const p = pieces[i % pieces.length] || shot.p;
      this.chips.push({
        p: vec(p),
        vel: v((rng() - 0.5) * 9, 2 + rng() * 9, (rng() - 0.5) * 9),
        s: 0.08 + rng() * 0.25,
      });
      this.dust.setColorAt(
        i,
        splash ? splashColors[i % 2] : debrisColors[p.m] || sparkColor,
      );
    }
    this.dust.instanceColor.needsUpdate = true;
  }
  resize(dt) {
    if (dt > 0.018) {
      if (++this.slow >= 3) this.scale = 0.8;
    } else this.slow = 0;
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight,
      dpr = Math.min(2, devicePixelRatio) * this.scale;
    const size = [w, h, dpr].join('/');
    if (this.lastSize !== size) {
      this.lastSize = size;
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }
  shoulder(tank, aim, dir, right) {
    const key = [
      tank.x,
      tank.y,
      tank.z,
      tank.side,
      aim.heading,
      aim.angle,
      aim.power,
      this.camera.aspect,
    ].join('/');
    if (this.shoulderFrame?.key === key) return this.shoulderFrame;
    const eye = vec(tank)
      .addScaledVector(dir, -10.5)
      .addScaledVector(right, 2.2);
    eye.y += 5.8;
    const path = [launch(tank, aim).origin, ...preview(tank, aim, 84)].map(vec);
    const elevation = (p) =>
      Math.atan2(p.y - eye.y, Math.hypot(p.x - eye.x, p.z - eye.z));
    const highest = Math.max(...path.map(elevation));
    const lowest = elevation(tank);
    // Reserve the upper quarter for the HUD and the lower edge for the hull.
    const fov = Math.max(58, (highest - lowest) / (0.24 + 0.4) / RAD);
    const pitch = Math.max(
      -7 * RAD,
      highest - Math.atan(0.45 * Math.tan(0.5 * fov * RAD)),
    );
    const look = vec(tank).addScaledVector(dir, 16);
    look.y =
      eye.y + Math.tan(pitch) * Math.hypot(look.x - eye.x, look.z - eye.z);
    const rig = new T.PerspectiveCamera(fov, this.camera.aspect, 0.09, 290);
    rig.position.copy(eye);
    rig.lookAt(look);
    rig.updateMatrixWorld();

    // Space centres by their apparent distance along the real windless curve.
    // The final centre is the exact 35% endpoint.
    const screen = path.map((p) => p.clone().project(rig));
    const lengths = [0];
    for (let i = 1; i < screen.length; i++) {
      lengths.push(
        lengths[i - 1] +
          Math.hypot(
            (screen[i].x - screen[i - 1].x) * rig.aspect,
            screen[i].y - screen[i - 1].y,
          ),
      );
    }
    let segment = 1;
    for (let i = 0; i < this.pips.count; i++) {
      const at = (lengths.at(-1) * (i + 1)) / this.pips.count;
      while (segment < screen.length - 1 && lengths[segment] < at) segment++;
      const span = lengths[segment] - lengths[segment - 1];
      dummy.position
        .copy(path[segment - 1])
        .lerp(path[segment], span ? (at - lengths[segment - 1]) / span : 1);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.7 + i * 0.05);
      dummy.updateMatrix();
      this.pips.setMatrixAt(i, dummy.matrix);
    }
    this.pips.instanceMatrix.needsUpdate = true;
    this.shoulderFrame = { key, eye, look, fov };
    return this.shoulderFrame;
  }
  draw(view, dt) {
    const { phase, actor, aim, elapsed, shot, flightTime, result, calm } = view;
    this.resize(dt);
    if (!calm) this.time += dt;
    const tanks = this.round.tanks,
      tank = tanks[actor],
      enemy = tanks[1 - actor];
    const aiming = phase === 'aim' || phase === 'their-shot',
      flying = phase === 'shell-cam',
      orbit = phase === 'impact';
    const yaw = (actor ? Math.PI : 0) - aim.heading * RAD,
      dir = v(Math.sin(yaw), 0, Math.cos(yaw)),
      right = v(-dir.z, 0, dir.x);
    const base = vec(tank);
    const previous = view.aims;
    for (let i = 0; i < 2; i++) {
      const toy = this.toys[i],
        t = tanks[i],
        a = previous[i];
      const p = vec(t),
        s = result?.settles[i];
      if (s && orbit && !calm) {
        p.copy(vec(s.from)).lerp(
          vec(s.to),
          smooth(clamp((elapsed - 0.16) / 0.67, 0, 1)),
        );
      }
      toy.group.position.copy(p);
      toy.group.visible = p.y + 1 > SEA - 0.2;
      const parked = i ? -0.19 : 0.27;
      toy.group.rotation.set(
        0,
        (i ? Math.PI : 0) + parked,
        s?.tipped && orbit && !calm
          ? Math.sin(Math.PI * clamp(elapsed / 0.83, 0, 1)) * 0.42
          : 0,
      );
      toy.turret.rotation.y = -a.heading * RAD - parked;
      toy.barrel.rotation.x = -a.angle * RAD;
      this.shadows[i].position.copy(p);
      this.shadows[i].position.y += 0.015;
      this.shadows[i].visible = toy.group.visible;
    }
    const shoulder = this.shoulder(tank, aim, dir, right);
    let { eye, look } = shoulder;
    const fov = aiming ? shoulder.fov : 58;
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.shell.visible = flying;
    this.pips.visible =
      aiming && (phase !== 'their-shot' || calm || elapsed >= 0.6);
    this.mist.count = 0;
    this.dust.count = 0;
    this.bombs.count = 0;
    this.birds.forEach((b) => (b.visible = false));
    if (flying) {
      const n = Math.min(shot.path.length - 1, flightTime / DT),
        idx = Math.floor(n);
      const p = vec(shot.path[idx]).lerp(
        vec(shot.path[Math.min(idx + 1, shot.path.length - 1)]),
        n - idx,
      );
      const velocity = vec(shot.path[Math.min(idx + 1, shot.path.length - 1)])
        .sub(vec(shot.path[Math.max(0, idx - 1)]))
        .normalize();
      this.shell.position.copy(p);
      this.shell.quaternion.setFromUnitVectors(v(0, 0, 1), velocity);
      if (calm) {
        eye = base
          .clone()
          .add(v(17, 13, 0))
          .addScaledVector(dir, 15);
        look = base
          .clone()
          .addScaledVector(dir, 24)
          .add(v(0, 5, 0));
      } else if (elapsed >= 0.15) {
        eye = p
          .clone()
          .addScaledVector(velocity, -4)
          .add(v(0, 1.5, 0));
        look = p.clone().addScaledVector(velocity, 5);
        // Keep the lens above ground on shots that immediately meet the cover.
        eye.y = Math.max(SEA + 1, eye.y);
        const lead = (shot.path.length - 1) * DT - flightTime;
        if (lead < 0.25 && shot.path.length > 45) {
          const f = smooth(clamp(1 - lead / 0.25, 0, 1));
          const end = vec(shot.p);
          eye.lerp(
            end
              .clone()
              .addScaledVector(dir, -11)
              .add(v(0, 11, 0)),
            f,
          );
          look.lerp(end, f);
        }
      }
      if (!calm) {
        for (let i = 0; i < 28 && idx - i * 3 >= 0; i++) {
          dummy.position.copy(shot.path[idx - i * 3]);
          dummy.scale.setScalar(0.09 + i * 0.009);
          dummy.rotation.set(0, i * 0.7, 0);
          dummy.updateMatrix();
          this.mist.setMatrixAt(i, dummy.matrix);
          this.mist.count++;
        }
      }
    }
    if (orbit) {
      const centre = vec(
        result?.blasts[Math.floor(result.blasts.length / 2)] || shot.p,
      );
      const a = yaw + (0.19 + (calm ? 0 : 0.436 * clamp(elapsed / 1.6, 0, 1)));
      eye = centre.clone().add(v(-Math.sin(a) * 14, 18, -Math.cos(a) * 14));
      look = centre;
      if (result?.drill?.length && Math.abs(shot.vector.y) < 0.4) {
        // Stay on the entry side of the tunnel. Keep its mouth and broken
        // material in the same frame even when the charge exits into air.
        const mouth = vec(result.drill[0]);
        look = mouth.clone().lerp(centre, 0.24);
        const travel = Math.atan2(shot.vector.x, shot.vector.z);
        const orbitStep = calm ? 0 : clamp(elapsed / 1.6, 0, 1);
        const angle = travel + 0.025 + 0.16 * orbitStep;
        eye = mouth
          .clone()
          .add(
            v(
              -Math.sin(angle) * 8,
              1.2 + 0.65 * orbitStep,
              -Math.cos(angle) * 8,
            ),
          );
      }
      const blastAge = elapsed - (aim.ammo === 2 ? 0.58 : 0);
      if (!calm && this.chips && blastAge >= 0) {
        const t = blastAge < 0.4 ? blastAge * 0.35 : blastAge - 0.26;
        this.chips.forEach(({ p, vel, s }, i) => {
          dummy.position.copy(p).addScaledVector(vel, t);
          dummy.position.y -= 8 * t * t;
          dummy.scale.setScalar(
            dummy.position.y < SEA || blastAge > 1.6 ? 0 : s,
          );
          dummy.rotation.set(t * (i % 6), i + t * 3, 0);
          dummy.updateMatrix();
          this.dust.setMatrixAt(i, dummy.matrix);
        });
        this.dust.count = this.chips.length;
        for (let i = 0; i < 18; i++) {
          const a = i * 2.4,
            r = (0.2 + t * 2) * (1 + (i % 3) * 0.34);
          dummy.position
            .copy(centre)
            .add(v(Math.cos(a) * r, t * (1 + (i % 5)) + 0.3, Math.sin(a) * r));
          dummy.scale.setScalar(
            Math.max(0, 1 - blastAge / 1.35) * (0.22 + t * 0.6),
          );
          dummy.updateMatrix();
          this.mist.setMatrixAt(i, dummy.matrix);
        }
        this.mist.count = 18;
        for (const settle of result.settles) {
          if (!settle.sunk || blastAge < 0.52) continue;
          const t = blastAge - 0.52;
          for (let i = 0; i < 18; i++) {
            const angle = i * 2.4,
              r = t * (2 + (i % 3) * 0.9) + 0.8;
            dummy.position.set(
              settle.to.x + Math.sin(angle) * r,
              SEA + Math.max(0, t * (3 + (i % 4)) - 5 * t * t),
              settle.to.z + Math.cos(angle) * r,
            );
            dummy.scale.setScalar(Math.max(0, 0.42 * (1 - t / 1.45)));
            dummy.updateMatrix();
            this.mist.setMatrixAt(this.mist.count++, dummy.matrix);
          }
        }
      }
      if (aim.ammo === 2)
        this.birds.forEach((b, i) => {
          b.visible = elapsed < 1.45;
          b.rotation.y = yaw;
          const target = vec(result.blasts[i] || shot.p);
          b.position
            .copy(target)
            .addScaledVector(dir, calm ? 0 : (elapsed - 0.18) * 8);
          b.position.y += 4 + i * 0.45;
          if (elapsed < 0.58) {
            const release = clamp((elapsed - 0.18) / 0.4, 0, 1);
            dummy.position
              .copy(target)
              .addScaledVector(
                dir,
                calm ? 0 : Math.min(0, (elapsed - 0.18) * 8),
              );
            dummy.position.y +=
              (4 + i * 0.45) * (calm ? 0.55 : 1 - release * release);
            dummy.scale.set(1, 1.3, 1);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            this.bombs.setMatrixAt(i, dummy.matrix);
            this.bombs.count++;
          }
        });
    }
    this.bombs.instanceMatrix.needsUpdate = this.bombs.count > 0;
    this.dust.instanceMatrix.needsUpdate = this.dust.count > 0;
    this.mist.instanceMatrix.needsUpdate = this.mist.count > 0;
    const cut = this.resetCamera || calm || (phase !== this.lastPhase && orbit);
    if (phase !== this.lastPhase) {
      this.startEye = this.camera.position.clone();
      this.startLook = this.look.clone();
    }
    if (cut) {
      this.camera.position.copy(eye);
      this.look.copy(look);
      this.startEye = eye.clone();
      this.startLook = look.clone();
    } else if (aiming && elapsed < 0.6) {
      const f = smooth(elapsed / 0.6);
      this.camera.position.copy(this.startEye).lerp(eye, f);
      this.look.copy(this.startLook).lerp(look, f);
    } else {
      const f = flying ? 1 - Math.exp(-dt * 18) : damp(dt, 44);
      this.camera.position.lerp(eye, f);
      this.look.lerp(look, f);
    }
    this.resetCamera = false;
    this.lastPhase = phase;
    this.camera.lookAt(this.look);
    this.sky.position.copy(this.camera.position);
    this.water.material.uniforms.time.value = this.time;
    this.renderer.render(this.scene, this.camera);
    const pin = vec(enemy)
      .add(v(0, 3.35, 0))
      .project(this.camera);
    return {
      pin,
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
    };
  }
}
