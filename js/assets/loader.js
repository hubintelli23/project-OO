// =============================================================
//  에셋 로더 — GLB 모델 / 이미지 텍스처 (manifest 에 경로가 있을 때만 사용)
//  로딩 실패 시 기본 모델이 그대로 남으므로 게임은 계속 동작함
// =============================================================
import * as THREE from 'three';

const gltfCache = new Map();
const texCache = new Map();
let GLTFLoaderClass = null;

async function getGLTFLoader() {
  if (!GLTFLoaderClass) {
    const mod = await import('three/addons/loaders/GLTFLoader.js');
    GLTFLoaderClass = mod.GLTFLoader;
  }
  return new GLTFLoaderClass();
}

export function loadGLB(url) {
  if (!gltfCache.has(url)) {
    gltfCache.set(url, getGLTFLoader().then(l => new Promise((res, rej) => l.load(url, g => res(g), undefined, rej))));
  }
  return gltfCache.get(url);
}

export function loadTexture(url, { repeat = null, srgb = true } = {}) {
  const key = url + (repeat ?? '');
  if (!texCache.has(key)) {
    const t = new THREE.TextureLoader().load(url, undefined, undefined, () => console.warn(`[asset] 텍스처 로드 실패: ${url}`));
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    texCache.set(key, t);
  }
  return texCache.get(key);
}

/**
 * 그룹에 GLB 모델을 붙임
 * @param group  붙일 대상
 * @param entry  { url, scale, rotationY, rotation, position, offsetY }
 * @param opt    { hideExisting: 기존 프리미티브 숨김, keep: 숨기지 않을 그룹들, offsetY }
 */
export function attachModel(group, entry, opt = {}) {
  if (!entry?.url) return;
  const existing = [];
  group.traverse(o => { if (o.isMesh) existing.push(o); });
  const keep = new Set();
  for (const k of opt.keep ?? []) k.traverse(o => keep.add(o));

  loadGLB(entry.url).then(gltf => {
    const model = gltf.scene.clone(true);
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    model.scale.setScalar(entry.scale ?? 1);
    if (entry.rotation) model.rotation.set(...entry.rotation);
    else model.rotation.y = entry.rotationY ?? 0;
    if (entry.position) model.position.set(...entry.position);
    model.position.y += (opt.offsetY ?? 0) + (entry.offsetY ?? 0);
    group.add(model);
    if (opt.hideExisting) for (const m of existing) if (!keep.has(m)) m.visible = false;
  }).catch(err => console.warn(`[asset] 모델 로드 실패: ${entry.url}`, err));
}
