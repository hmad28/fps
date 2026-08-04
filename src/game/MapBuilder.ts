import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Point3D } from '../types';

export interface InteractiveConsole {
  id: string;
  type: string;
  position: Point3D;
  mesh: THREE.Mesh;
  label: string;
  active: boolean;
}

export interface TrainSystem {
  trainGroup: THREE.Group;
  trackLength: number;
  direction: number;
  active: boolean;
  positionX: number;
}

export interface ElevatorSystem {
  elevatorGroup: THREE.Group;
  minY: number;
  maxY: number;
  direction: number; // -1 for down, 1 for up, 0 for idle
  active: boolean;
}

export interface GateValve {
  id: string;
  valveMesh: THREE.Mesh;
  drained: boolean;
}

export interface BreakerBox {
  id: string;
  breakerMesh: THREE.Mesh;
  online: boolean;
}

export interface MapData {
  scene: THREE.Scene;
  obstacles: THREE.Box3[]; // Colliders for player & enemy movement
  obstacleMeshes: THREE.Object3D[]; // Visual meshes for raycast collision
  enemyPatrolRoutes: Point3D[][]; // Array of patrol waypoints for AI
  pickupSpawns: Point3D[];
  playerSpawn: Point3D;
  ambientLight: THREE.AmbientLight;
  sunLight: THREE.DirectionalLight;
  pointLamps: THREE.PointLight[];
  acidPools?: THREE.Box3[]; // Special environmental hazard boxes
  particles?: THREE.Points; // Rain/dust/snow particles
  
  // Interactive Elements for Blacksite: Fallen City
  interactiveConsoles: InteractiveConsole[];
  trains: TrainSystem[];
  elevators: ElevatorSystem[];
  valves: GateValve[];
  breakers: BreakerBox[];
}

export function buildFPSMap(scene: THREE.Scene, districtOrBiome: string = 'collapsed_gate'): MapData {
  const obstacles: THREE.Box3[] = [];
  const obstacleMeshes: THREE.Object3D[] = [];
  const pointLamps: THREE.PointLight[] = [];
  const acidPools: THREE.Box3[] = [];
  
  // Immersive sim systems
  const interactiveConsoles: InteractiveConsole[] = [];
  const trains: TrainSystem[] = [];
  const elevators: ElevatorSystem[] = [];
  const valves: GateValve[] = [];
  const breakers: BreakerBox[] = [];

  // Translate old biomes to districts for backward compatibility
  let district = districtOrBiome;
  if (districtOrBiome === 'neon') district = 'neon_market';
  else if (districtOrBiome === 'bio') district = 'undercity';
  else if (districtOrBiome === 'frozen') district = 'flooded_city';

  // 1. CHOOSE WEATHER, FOG AND LIGHTING SCHEME BASED ON DISTRICT
  let fogColor = 0x0a0f1d;
  let fogDensity = 0.02;
  let ambientColor = 0x1e293b;
  let sunColor = 0x0f172a;
  let floorBg = '#0f172a';
  let floorGrid = '#334155';
  let accentColor = '#38bdf8';
  let isWetFloor = true;

  if (district === 'collapsed_gate') {
    // Gloomy dusk, rain, smoke, military tone
    fogColor = 0x111625;
    fogDensity = 0.025;
    ambientColor = 0x475569;
    sunColor = 0x1e293b;
    floorBg = '#0b0f19';
    floorGrid = '#1e293b';
    accentColor = '#f43f5e'; // Red warning colors
  } else if (district === 'neon_market') {
    // Glowing neon, rainy twilight, high contrast
    fogColor = 0x0b0214;
    fogDensity = 0.018;
    ambientColor = 0xa21caf; // Magenta tint
    sunColor = 0xec4899; // Pink neon sun
    floorBg = '#05010a';
    floorGrid = '#4a044e';
    accentColor = '#06b6d4'; // Cyan highlights
  } else if (district === 'transit_hub') {
    // Underground orange tungsten, clinical fluorescent, grid
    fogColor = 0x110d0c;
    fogDensity = 0.035; // Dense dust haze underground
    ambientColor = 0xd97706; // Amber tint
    sunColor = 0x27272a;
    floorBg = '#1c1917';
    floorGrid = '#44403c';
    accentColor = '#fbbf24';
  } else if (district === 'flooded_city') {
    // Storm, cold torrential rains, dark blue
    fogColor = 0x081121;
    fogDensity = 0.03;
    ambientColor = 0x0369a1;
    sunColor = 0x0c4a6e;
    floorBg = '#021526';
    floorGrid = '#0f172a';
    accentColor = '#38bdf8';
  } else if (district === 'industrial_spine') {
    // Factory fumes, soot gray, warm orange boilers
    fogColor = 0x1e1e1e;
    fogDensity = 0.022;
    ambientColor = 0xca8a04; // Yellow/orange tint
    sunColor = 0x3f3f46;
    floorBg = '#18181b';
    floorGrid = '#27272a';
    accentColor = '#ea580c'; // Industrial orange
  } else if (district === 'corporate_skyline') {
    // Luxury dark gray, cold skybridge, glass cyan reflection
    fogColor = 0x030712;
    fogDensity = 0.015; // Crisp night air
    ambientColor = 0x111827;
    sunColor = 0x0ea5e9;
    floorBg = '#0f172a';
    floorGrid = '#1e293b';
    accentColor = '#22d3ee';
  } else if (district === 'undercity') {
    // Biohazard green, secret lab purple, hazard orange
    fogColor = 0x022c22;
    fogDensity = 0.04; // Deep vapor haze
    ambientColor = 0x047857;
    sunColor = 0xa855f7;
    floorBg = '#022c22';
    floorGrid = '#065f46';
    accentColor = '#10b981';
  } else if (district === 'safehouse') {
    // Warm cozy shelter, wood grid, soft incandescent lighting
    fogColor = 0x1e1510;
    fogDensity = 0.01;
    ambientColor = 0xf59e0b;
    sunColor = 0x451a03;
    floorBg = '#271c19';
    floorGrid = '#78350f';
    accentColor = '#f59e0b';
    isWetFloor = false;
  }

  // Assign Fog
  scene.fog = new THREE.FogExp2(fogColor, fogDensity);

  // 2. PRIMARY AMBIENT AND DIRECTIONAL LIGHTS
  const ambientLight = new THREE.AmbientLight(ambientColor, 0.65);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(sunColor, 1.2);
  sunLight.position.set(40, 60, 30);
  scene.add(sunLight);

  // 3. BASE GROUND PLANE (120x120 units)
  const floorSize = 120;
  const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);

  // Canvas texture generation
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 512;
  floorCanvas.height = 512;
  const ctx = floorCanvas.getContext('2d')!;
  ctx.fillStyle = floorBg;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = floorGrid;
  ctx.lineWidth = 3;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 496);

  const floorTexture = new THREE.CanvasTexture(floorCanvas);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(12, 12);

  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: isWetFloor ? 0.22 : 0.85,
    metalness: district === 'neon_market' || district === 'corporate_skyline' ? 0.6 : 0.2,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);
  obstacleMeshes.push(floorMesh);

  // Outer Boundary Walls
  const wallHeight = 15;
  const wallThickness = 4;
  const halfSize = floorSize / 2;
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.9,
    metalness: 0.1,
  });

  const addBoundaryWall = (x: number, z: number, w: number, depth: number) => {
    const geo = new THREE.BoxGeometry(w, wallHeight, depth);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(x, wallHeight / 2, z);
    scene.add(mesh);
    const bbox = new THREE.Box3().setFromObject(mesh);
    obstacles.push(bbox);
    obstacleMeshes.push(mesh);
  };

  addBoundaryWall(0, -halfSize, floorSize, wallThickness); // North boundary
  addBoundaryWall(0, halfSize, floorSize, wallThickness);  // South boundary
  addBoundaryWall(-halfSize, 0, wallThickness, floorSize); // West boundary
  addBoundaryWall(halfSize, 0, wallThickness, floorSize);  // East boundary

  // 4. HELPER BUILDERS FOR URBAN PROP ASSETS
  const addBlock = (x: number, y: number, z: number, w: number, h: number, d: number, colorHex: number, roughness = 0.7, metalness = 0.2) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness, metalness });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    scene.add(mesh);

    const bbox = new THREE.Box3().setFromObject(mesh);
    obstacles.push(bbox);
    obstacleMeshes.push(mesh);
    return mesh;
  };

  const addLighthouseBeacon = (x: number, z: number, colorHex: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Pillar base
    const baseGeo = new THREE.CylinderGeometry(0.8, 1.2, 5.0, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const base = new THREE.Mesh(baseGeo, mat);
    base.position.y = 2.5;
    group.add(base);

    // Light head
    const headGeo = new THREE.SphereGeometry(0.6, 12, 12);
    const headMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 5.3;
    group.add(head);

    // Light source
    const light = new THREE.PointLight(colorHex, 3.5, 20);
    light.position.set(0, 5.3, 0);
    group.add(light);
    pointLamps.push(light);

    scene.add(group);
    const bbox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 2.5, z), new THREE.Vector3(2.5, 5.0, 2.5));
    obstacles.push(bbox);
    obstacleMeshes.push(base);
  };

  const addInteractiveConsole = (id: string, type: string, x: number, y: number, z: number, label: string, colorHex = 0x38bdf8) => {
    const termGeo = new THREE.BoxGeometry(1.0, 1.2, 0.8);
    const termMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
    const mesh = new THREE.Mesh(termGeo, termMat);
    mesh.position.set(x, y + 0.6, z);
    scene.add(mesh);

    const screenGeo = new THREE.PlaneGeometry(0.8, 0.5);
    const screenMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(x, y + 1.2, z + 0.41);
    screen.rotation.x = -Math.PI / 6;
    scene.add(screen);

    // Pulse ring glow
    const glowGeo = new THREE.RingGeometry(0.4, 0.6, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(x, y + 1.6, z);
    glow.rotation.x = Math.PI / 2;
    scene.add(glow);

    const bbox = new THREE.Box3().setFromObject(mesh);
    obstacles.push(bbox);
    obstacleMeshes.push(mesh);

    interactiveConsoles.push({
      id,
      type,
      position: { x, y: y + 0.6, z },
      mesh,
      label,
      active: true,
    });
  };

  // 5. DISTRICT-SPECIFIC LEVEL ARCHITECTURE
  if (district === 'collapsed_gate') {
    // Landmark: THE FALLEN ARCH (Toll gate, crashed highway bus)
    // Left toll pillar
    addBlock(-12, 0, -10, 4, 12, 4, 0x1e293b, 0.8, 0.3);
    // Right toll pillar
    addBlock(12, 0, -10, 4, 12, 4, 0x1e293b, 0.8, 0.3);
    // Collapsed Overpass beam (slanted bar)
    const beamGeo = new THREE.BoxGeometry(32, 2.5, 4.5);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 7, -10);
    beam.rotation.z = -0.22; // Slanted
    scene.add(beam);
    obstacleMeshes.push(beam);
    obstacles.push(new THREE.Box3().setFromObject(beam));

    // Crashed Cargo Bus / Container Truck
    addBlock(-6, 0, 8, 3.5, 4.0, 10.0, 0x94a3b8, 0.6, 0.4); // Truck cab/body
    addBlock(-6, 4.0, 4, 3.2, 3.0, 4.0, 0xef4444, 0.9, 0.1); // Crimson container

    // Concrete highway dividers (Cover points)
    addBlock(-15, 0, 12, 8, 1.8, 1.2, 0x475569);
    addBlock(15, 0, 12, 8, 1.8, 1.2, 0x475569);
    addBlock(0, 0, 22, 10, 1.8, 1.2, 0x475569);
    addBlock(-22, 0, -15, 6, 2.2, 6.0, 0x334155);

    // Apartment Block Ruins
    addBlock(-35, 0, -25, 12, 20, 12, 0x0f172a, 0.9, 0.0);
    // Rooftop Skybridge base
    addBlock(35, 0, -25, 12, 18, 12, 0x0f172a, 0.9, 0.0);

    // Street Lamps
    addLighthouseBeacon(-15, -12, 0xef4444);
    addLighthouseBeacon(15, -12, 0xf59e0b);
    addLighthouseBeacon(0, 18, 0xef4444);

    // Interconnects
    addInteractiveConsole('gate_transmitter', 'objective', 0, 0, -12, 'BOOT TRANSMITTER TERMINAL');
    addInteractiveConsole('travel_market', 'travel_neon_market', 35, 0, -25, 'ASCEND TO NEON MARKET (ROOFTOP ROUTE)');
    addInteractiveConsole('travel_sewer', 'travel_undercity', -35, 0, -25, 'DESCEND INTRO SEWER MAINTENANCE PIPELINE');

  } else if (district === 'neon_market') {
    // Landmark: THE NEON CATHEDRAL (Towering high tech marketplace)
    // Central Gothic-inspired market cathedral facade
    addBlock(0, 0, -15, 18, 16, 6, 0x110c1a, 0.8, 0.4);
    addBlock(0, 16, -15, 6, 8, 4, 0x110c1a, 0.8, 0.4);

    // Glowing cathedral arches and holographic screens
    const haloGeo = new THREE.BoxGeometry(18.2, 0.5, 6.2);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
    const haloBar = new THREE.Mesh(haloGeo, haloMat);
    haloBar.position.set(0, 8, -15);
    scene.add(haloBar);

    // Market stalls / stands
    addBlock(-12, 0, -2, 4, 3, 4, 0xf43f5e, 0.5, 0.5); // pink stall
    addBlock(-12, 0, 8, 4, 3, 4, 0x06b6d4, 0.5, 0.5); // cyan stall
    addBlock(12, 0, -2, 4, 3, 4, 0xa855f7, 0.5, 0.5); // purple stall
    addBlock(12, 0, 8, 4, 3, 4, 0xf59e0b, 0.5, 0.5); // yellow stall

    // Tall towering neon billboards with text
    const addNeonSign = (x: number, z: number, text: string, colorHex: number) => {
      const parent = addBlock(x, 0, z, 3, 14, 3, 0x1e1b4b, 0.9, 0.1);
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 256;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#1e1b4b'; c.fillRect(0, 0, 128, 256);
      c.font = 'bold 32px monospace'; c.fillStyle = '#fff'; c.textAlign = 'center';
      c.fillText('VEYRA', 64, 60);
      c.fillStyle = text === 'HELIOS' ? '#f43f5e' : '#06b6d4';
      c.fillText(text, 64, 130);
      c.strokeRect(4, 4, 120, 248);

      const signTex = new THREE.CanvasTexture(canvas);
      const signGeo = new THREE.PlaneGeometry(2.8, 10);
      const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true });
      const signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.position.set(0, 2, 1.55);
      parent.add(signMesh);
    };

    addNeonSign(-24, -20, 'HELIOS', 0xf43f5e);
    addNeonSign(24, -20, 'ONLINE', 0x06b6d4);

    // Rooftop and skybridges (verticallity)
    addBlock(-28, 0, 15, 10, 8, 10, 0x1c1917); // Low roof
    addBlock(-28, 8, 15, 6, 6, 6, 0x1c1917); // Mid balcony block

    // High Tech point beacons
    addLighthouseBeacon(-28, 15, 0x06b6d4);
    addLighthouseBeacon(24, -20, 0xec4899);
    addLighthouseBeacon(0, 4, 0xa855f7);

    // Interconnects & Consoles
    addInteractiveConsole('neon_grid_hack', 'objective', 0, 0, -10, 'OVERRIDE HELIOS GRID SENSOR PANEL');
    addInteractiveConsole('travel_gate', 'travel_collapsed_gate', -30, 0, -30, 'DESCEND TO COLLAPSED HIGHWAY GATE');
    addInteractiveConsole('travel_transit', 'travel_transit_hub', 30, 0, 30, 'ENTER TRANSIT TICKET TERMINAL');

  } else if (district === 'transit_hub') {
    // Landmark: THE INFINITE PLATFORM (Train track, ticket terminal, massive moving express train!)
    // Raised passenger platforms (concrete decks)
    addBlock(-15, 0, 0, 15, 1.2, 70, 0x27272a, 0.8, 0.3); // West Platform
    addBlock(15, 0, 0, 15, 1.2, 70, 0x27272a, 0.8, 0.3);  // East Platform

    // Central Subway Train Track Pit
    const trackGeo = new THREE.PlaneGeometry(12, 110);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.rotation.x = -Math.PI / 2;
    trackMesh.position.set(0, 0.05, 0);
    scene.add(trackMesh);

    // Visual rails
    addBlock(-3, 0, 0, 0.3, 0.1, 110, 0x52525b, 0.2, 0.9);
    addBlock(3, 0, 0, 0.3, 0.1, 110, 0x52525b, 0.2, 0.9);

    // MOVING TRAIN CARRIAGE (Immersive vehicle!)
    const trainGroup = new THREE.Group();
    trainGroup.position.set(0, 0.15, -40); // Spawn down the track

    // Main steel car body
    const bodyGeo = new THREE.BoxGeometry(7.0, 3.8, 22.0);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.9, roughness: 0.1 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.9;
    trainGroup.add(body);

    // Glowing glass windows
    const winGeo = new THREE.BoxGeometry(7.2, 0.8, 4.0);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8 });
    const win1 = new THREE.Mesh(winGeo, winMat); win1.position.set(0, 2.2, -6); trainGroup.add(win1);
    const win2 = new THREE.Mesh(winGeo, winMat); win2.position.set(0, 2.2, 0); trainGroup.add(win2);
    const win3 = new THREE.Mesh(winGeo, winMat); win3.position.set(0, 2.2, 6); trainGroup.add(win3);

    scene.add(trainGroup);
    // Note: train doesn't block player completely, or we add dynamic collider updating in engine
    const trainCollider = new THREE.Box3();
    trainCollider.setFromObject(body);
    obstacles.push(trainCollider);
    obstacleMeshes.push(body);

    trains.push({
      trainGroup,
      trackLength: 100,
      direction: 1, // Moving
      active: true,
      positionX: 0,
    });

    // Escalators and stairs blocks
    addBlock(-18, 1.2, -30, 6, 8, 12, 0x27272a);
    addBlock(18, 1.2, 30, 6, 8, 12, 0x27272a);

    // Pillars supporting underpass
    addBlock(-10, 1.2, -15, 1.5, 6, 1.5, 0x52525b);
    addBlock(-10, 1.2, 15, 1.5, 6, 1.5, 0x52525b);
    addBlock(10, 1.2, -15, 1.5, 6, 1.5, 0x52525b);
    addBlock(10, 1.2, 15, 1.5, 6, 1.5, 0x52525b);

    addLighthouseBeacon(-15, -30, 0xfbbf24);
    addLighthouseBeacon(15, 30, 0xfbbf24);

    // Interconnects & Consoles
    addInteractiveConsole('transit_reboot', 'objective', -15, 1.2, 5, 'ACTIVATE MAIN TERMINAL (REBOOT RAIL SYSTEM)');
    addInteractiveConsole('travel_market_transit', 'travel_neon_market', -18, 1.2, -33, 'EXIT TO NEON MARKET STREETS');
    addInteractiveConsole('travel_flooded', 'travel_flooded_city', 18, 1.2, 33, 'ENTER METRO SUBWAY LINK TO FLOODED OLD CITY');

  } else if (district === 'flooded_city') {
    // Landmark: THE DROWNED PLAZA (Submerged traditional stones, water hazard, statue)
    // Water layer plane
    const waterGeo = new THREE.PlaneGeometry(120, 120);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      transparent: true,
      opacity: 0.65,
      roughness: 0.05,
      metalness: 0.8,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.3; // Half foot deep
    scene.add(waterMesh);

    // Monumental Statue pedestal in center
    addBlock(0, 0, 0, 6, 2.5, 6, 0x1e293b, 0.9, 0.1);
    // Statue torso/figure represented by a majestic dodecahedron or group of geometries
    const statGeo = new THREE.DodecahedronGeometry(1.8);
    const statMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.7 });
    const statMesh = new THREE.Mesh(statGeo, statMat);
    statMesh.position.set(0, 4.0, 0);
    scene.add(statMesh);
    obstacleMeshes.push(statMesh);
    obstacles.push(new THREE.Box3().setFromObject(statMesh));

    // Semi-submerged stone housing blocks (elevated safety walkways!)
    addBlock(-18, 0, -18, 14, 5, 14, 0x334155);
    addBlock(18, 0, -18, 14, 5, 14, 0x334155);
    addBlock(-18, 0, 18, 14, 5, 14, 0x334155);
    addBlock(18, 0, 18, 14, 5, 14, 0x334155);

    // Flood drainage pumps & active electric generator (immersive hazard!)
    const genGeo = new THREE.BoxGeometry(2.5, 2.2, 2.5);
    const genMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x0284c7, emissiveIntensity: 0.8 });
    const genMesh = new THREE.Mesh(genGeo, genMat);
    genMesh.position.set(0, 0.4, -20);
    scene.add(genMesh);
    obstacleMeshes.push(genMesh);
    obstacles.push(new THREE.Box3().setFromObject(genMesh));

    // Hazardous shock zone marker
    const ringGeo = new THREE.RingGeometry(4.0, 4.3, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.35, -20);
    scene.add(ring);

    // Let's create a valve and add it to valves
    const valveGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 12);
    valveGeo.rotateX(Math.PI / 2);
    const valveMesh = new THREE.Mesh(valveGeo, new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 }));
    valveMesh.position.set(0, 1.2, -22);
    scene.add(valveMesh);
    valves.push({ id: 'floodgate_valve', valveMesh, drained: false });

    // Acid / hazard pools list representation for active shock check
    acidPools.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 0.3, -20), new THREE.Vector3(8.0, 1.0, 8.0)));

    addLighthouseBeacon(-18, -18, 0x0ea5e9);
    addLighthouseBeacon(18, 18, 0x0ea5e9);

    // Interconnects
    addInteractiveConsole('drain_flood', 'objective', 0, 0, -18, 'SHUT WATER GATE VALVE (DRAIN WATER)');
    addInteractiveConsole('travel_transit_f', 'travel_transit_hub', -18, 5, -18, 'RETREAT TO CENTRAL METRO STATION');
    addInteractiveConsole('travel_industrial', 'travel_industrial_spine', 18, 5, 18, 'CLIMB OVER WALL TO INDUSTRIAL COAL COMPLEX');

  } else if (district === 'industrial_spine') {
    // Landmark: THE IRON SPINE (Crany gantry, factory boilers, conveyor grids)
    // Towering metal smokestacks
    addBlock(-20, 0, -15, 5, 18, 5, 0x1e1b4b, 0.5, 0.8);
    addBlock(-20, 0, 15, 5, 18, 5, 0x1e1b4b, 0.5, 0.8);

    // Gantry Crane framework bridging the sky
    const gantry = addBlock(0, 8, 0, 40, 2, 4, 0xd97706, 0.7, 0.5); // Crane girder
    
    // Hanging cargo container that can be interactive!
    const container = addBlock(8, 2, 0, 6, 3.5, 4, 0xea580c, 0.6, 0.4);
    container.name = 'droppable_cargo';
    
    // Heavy furnaces
    addBlock(18, 0, -10, 8, 6, 8, 0x27272a, 0.8, 0.5);
    addBlock(18, 0, 10, 8, 6, 8, 0x27272a, 0.8, 0.5);

    // Conveyor platform walkway
    addBlock(0, 0, 22, 28, 1.5, 5, 0x44403c);

    addLighthouseBeacon(-20, -15, 0xea580c);
    addLighthouseBeacon(18, -10, 0xea580c);

    // Interconnects & Consoles
    addInteractiveConsole('crane_drop', 'objective', 0, 0, 22, 'ACTIVATE GANTRY CRANE OVERRIDE (DROP CONTAINER)');
    addInteractiveConsole('travel_flooded_i', 'travel_flooded_city', -18, 0, 22, 'CROSS BACK INTO FLOODED OLD CITY');
    addInteractiveConsole('travel_skyline', 'travel_corporate_skyline', 18, 0, -22, 'TAKE SECURITY ELEVATOR TO CORPORATE OFFICES');

  } else if (district === 'corporate_skyline') {
    // Landmark: THE HELIOS SPIRE (Mega obelisk, glass office desk, functional vertical elevator!)
    // Gigantic mega obelisk tower mesh in North center background
    const spireGroup = new THREE.Group();
    spireGroup.position.set(0, 0, -45);
    const spBaseGeo = new THREE.CylinderGeometry(4.0, 7.0, 40.0, 4);
    const spBaseMat = new THREE.MeshStandardMaterial({ color: 0x030712, roughness: 0.1, metalness: 0.9 });
    const spBase = new THREE.Mesh(spBaseGeo, spBaseMat);
    spBase.position.y = 20;
    spireGroup.add(spBase);

    // Pulse red beacon on spire
    const spBulbGeo = new THREE.SphereGeometry(0.8, 12, 12);
    const spBulbMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const spBulb = new THREE.Mesh(spBulbGeo, spBulbMat);
    spBulb.position.y = 40.5;
    spireGroup.add(spBulb);

    const spLight = new THREE.PointLight(0xf43f5e, 5, 50);
    spLight.position.set(0, 40.5, 0);
    spireGroup.add(spLight);

    scene.add(spireGroup);
    obstacleMeshes.push(spBase);
    obstacles.push(new THREE.Box3().setFromObject(spBase));

    // High tech glass executive boardrooms
    addBlock(-18, 0, -12, 12, 8, 10, 0x0f172a, 0.1, 0.9); // Left Executive floor
    addBlock(18, 0, -12, 12, 8, 10, 0x0f172a, 0.1, 0.9);  // Right Executive floor

    // Central Glass Skybridge linking the two boardrooms
    const bridgeGeo = new THREE.BoxGeometry(24, 1.2, 3.5);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.95 });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(0, 4.6, -12);
    scene.add(bridge);
    obstacleMeshes.push(bridge);
    obstacles.push(new THREE.Box3().setFromObject(bridge));

    // FUNCTIONAL ELEVATOR LIFT
    const elevatorGroup = new THREE.Group();
    elevatorGroup.position.set(0, 0.1, 15);

    // Lift deck floor
    const elFloor = addBlock(0, 0, 0, 5, 0.2, 5, 0x1e293b, 0.4, 0.9);
    elevatorGroup.add(elFloor);

    // Support rails
    const railGeo = new THREE.CylinderGeometry(0.1, 0.1, 30.0, 8);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x374151 });
    const rail1 = new THREE.Mesh(railGeo, railMat); rail1.position.set(-2.5, 15.0, 0); scene.add(rail1);
    const rail2 = new THREE.Mesh(railGeo, railMat); rail2.position.set(2.5, 15.0, 0); scene.add(rail2);

    scene.add(elevatorGroup);
    elevators.push({
      elevatorGroup,
      minY: 0.1,
      maxY: 12.0,
      direction: 0, // Idle
      active: true,
    });

    addLighthouseBeacon(-18, -12, 0x22d3ee);
    addLighthouseBeacon(18, -12, 0x22d3ee);

    // Interconnects
    addInteractiveConsole('spire_terminal', 'objective', 0, 4.6, -12, 'HACK HELIOS SPIRE NETWORK CONTROLLER');
    addInteractiveConsole('travel_industrial_s', 'travel_industrial_spine', -18, 0, 15, 'DESCEND FREIGHT LIFT TO INDUSTRIAL COMPLEX');
    addInteractiveConsole('travel_safehouse_s', 'travel_safehouse', 18, 0, 15, 'RETREAT TO HIDDEN RESISTANCE APARTMENT');

  } else if (district === 'undercity') {
    // Landmark: THE BURIED CORE (Subterranean radioactive containment dome, glowing green bio labs)
    // Geothermal glowing core dome in center
    const domeGeo = new THREE.SphereGeometry(3.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.8,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(0, 0.05, -5);
    scene.add(dome);
    obstacleMeshes.push(dome);
    obstacles.push(new THREE.Box3().setFromObject(dome));

    // Toxic pipe structures leaking vapor
    addBlock(-12, 0, 12, 3, 5, 3, 0x064e3b);
    addBlock(12, 0, 12, 3, 5, 3, 0x064e3b);

    // Bio lab pods
    addBlock(-15, 0, -18, 6, 4.5, 6, 0x047857);
    addBlock(15, 0, -18, 6, 4.5, 6, 0x047857);

    addLighthouseBeacon(-15, -15, 0x10b981);
    addLighthouseBeacon(15, -15, 0x10b981);

    // Interconnects
    addInteractiveConsole('undercity_core', 'objective', 0, 0, 8, 'OVERRIDE UNDERGROUND REACTOR ISOLATOR VALVE');
    addInteractiveConsole('travel_gate_u', 'travel_collapsed_gate', -12, 0, 12, 'RETREAT BACK THROUGH SEWER PIPES TO HIGHWAY GATE');
    addInteractiveConsole('travel_safehouse_u', 'travel_safehouse', 12, 0, 12, 'ASCEND SEWER SHAFT TO APARTMENT SAFEHOUSE');

  } else if (district === 'safehouse') {
    // Landmark: APARTMENT SHELTER (Central Base, glowing workbench, world war chart table, windows)
    // Wood desk for active tactical layout
    addBlock(0, 0, -5, 5, 1.2, 3, 0x451a03, 0.9, 0.0); // Table desk

    // Glowing workbench crate
    const benchGeo = new THREE.BoxGeometry(2.0, 1.0, 1.2);
    const benchMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0x78350f, roughness: 0.4 });
    const benchMesh = new THREE.Mesh(benchGeo, benchMat);
    benchMesh.position.set(-6, 0.5, 6);
    scene.add(benchMesh);
    obstacleMeshes.push(benchMesh);
    obstacles.push(new THREE.Box3().setFromObject(benchMesh));

    // Wooden bookshelves & weapon storage racks on walls
    addBlock(-10, 0, -8, 2, 8, 6, 0x451a03);
    addBlock(10, 0, -8, 2, 8, 6, 0x451a03);

    addLighthouseBeacon(-6, 6, 0xf59e0b); // workbench lamp
    addLighthouseBeacon(0, -5, 0xf59e0b); // desk lamp

    // Interconnects
    addInteractiveConsole('view_tactical_map', 'tactical_terminal', 0, 1.2, -5, 'VIEW CAMPAIGN MAP & LOGS');
    addInteractiveConsole('travel_gate_s', 'travel_collapsed_gate', 6, 0, -12, 'VENTURE TO COLLAPSED CITY GATE');
    addInteractiveConsole('travel_market_s', 'travel_neon_market', -6, 0, -12, 'VENTURE INTO NEON MARKET');
    addInteractiveConsole('travel_skyline_s', 'travel_corporate_skyline', 8, 0, 10, 'VENTURE INTO CORPORATE DISTRICT');
  }

  // 6. WEATHER PARTICLE GENERATION
  let particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * floorSize;
    positions[i + 1] = Math.random() * 20;
    positions[i + 2] = (Math.random() - 0.5) * floorSize;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const pCanvas = document.createElement('canvas');
  pCanvas.width = 16; pCanvas.height = 16;
  const pCtx = pCanvas.getContext('2d')!;
  const grad = pCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
  if (district === 'flooded_city' || district === 'collapsed_gate') {
    // Wet glowing rain line texture
    pCtx.strokeStyle = 'rgba(186, 230, 253, 0.6)';
    pCtx.lineWidth = 2;
    pCtx.beginPath(); pCtx.moveTo(8, 0); pCtx.lineTo(8, 16); pCtx.stroke();
  } else {
    // Round dust/spore glow particle
    grad.addColorStop(0, district === 'undercity' ? 'rgba(52, 211, 153, 0.9)' : 'rgba(251, 191, 36, 0.7)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    pCtx.fillStyle = grad; pCtx.fillRect(0, 0, 16, 16);
  }
  
  const pTexture = new THREE.CanvasTexture(pCanvas);
  const pMat = new THREE.PointsMaterial({
    size: district === 'flooded_city' ? 0.4 : 0.18,
    map: pTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeo, pMat);
  scene.add(particles);

  // Patrol Routes Specific to each District
  const enemyPatrolRoutes = getCampaignPatrolRoutes(district);

  // Load 3D Environment GLTF Props (Street Lamps, Crates, Vehicles)
  const propLoader = new GLTFLoader();

  // 1. 3D Street Lamps
  propLoader.load(
    '/models/lamp.glb',
    (gltf) => {
      const lampPositions = [
        { x: -18, z: 12 }, { x: 18, z: 12 },
        { x: -18, z: -12 }, { x: 18, z: -12 },
        { x: -30, z: 0 }, { x: 30, z: 0 },
      ];
      lampPositions.forEach((pos) => {
        const lamp = gltf.scene.clone();
        lamp.scale.set(0.015, 0.015, 0.015);
        const bbox = new THREE.Box3().setFromObject(lamp);
        lamp.position.set(pos.x, -bbox.min.y, pos.z);
        lamp.traverse((c: any) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        scene.add(lamp);

        const light = new THREE.PointLight(0xf59e0b, 2.5, 18);
        light.position.set(pos.x, 4.5, pos.z);
        scene.add(light);
        pointLamps.push(light);

        const colliderBox = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(pos.x, 2.25, pos.z),
          new THREE.Vector3(1.2, 4.5, 1.2)
        );
        obstacles.push(colliderBox);
        obstacleMeshes.push(lamp);
      });
    },
    undefined,
    (err) => console.warn('Lamp GLB load error:', err)
  );

  // 2. 3D Supply Crates & Containers
  propLoader.load(
    '/models/crate.glb',
    (gltf) => {
      const cratePositions = [
        { x: -8, z: 8, rot: 0.2 }, { x: 8, z: -8, rot: -0.4 },
        { x: -22, z: -15, rot: 0.8 }, { x: 22, z: 15, rot: -0.1 },
        { x: 0, z: -18, rot: 0.5 }, { x: -12, z: -25, rot: -0.3 },
      ];
      cratePositions.forEach((pos) => {
        const crate = gltf.scene.clone();
        crate.scale.set(0.8, 0.8, 0.8);
        const bbox = new THREE.Box3().setFromObject(crate);
        crate.position.set(pos.x, -bbox.min.y, pos.z);
        crate.rotation.y = pos.rot;
        crate.traverse((c: any) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        scene.add(crate);
        const crateBox = new THREE.Box3().setFromObject(crate);
        obstacles.push(crateBox);
        obstacleMeshes.push(crate);
      });
    },
    undefined,
    (err) => console.warn('Crate GLB load error:', err)
  );

  // 3. 3D Military Vehicles
  propLoader.load(
    '/models/vehicle.glb',
    (gltf) => {
      const vehPositions = [
        { x: -22, z: 22, rot: Math.PI / 4 },
        { x: 22, z: -22, rot: -Math.PI / 3 },
      ];
      vehPositions.forEach((pos) => {
        const veh = gltf.scene.clone();
        veh.scale.set(1.5, 1.5, 1.5);
        const bbox = new THREE.Box3().setFromObject(veh);
        veh.position.set(pos.x, -bbox.min.y, pos.z);
        veh.rotation.y = pos.rot;
        veh.traverse((c: any) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        scene.add(veh);
        const vehBox = new THREE.Box3().setFromObject(veh);
        obstacles.push(vehBox);
        obstacleMeshes.push(veh);
      });
    },
    undefined,
    (err) => console.warn('Vehicle GLB load error:', err)
  );

  return {
    scene,
    obstacles,
    obstacleMeshes,
    enemyPatrolRoutes,
    pickupSpawns: getCampaignPickupSpawns(district),
    playerSpawn: getCampaignPlayerSpawn(district),
    ambientLight,
    sunLight,
    pointLamps,
    acidPools,
    particles,
    
    // Immersive Systems
    interactiveConsoles,
    trains,
    elevators,
    valves,
    breakers,
  };
}

function getCampaignPlayerSpawn(district: string): Point3D {
  if (district === 'safehouse') return { x: 0, y: 1.8, z: 2 };
  if (district === 'corporate_skyline') return { x: 0, y: 1.8, z: 28 };
  if (district === 'transit_hub') return { x: -12, y: 1.8, z: 25 };
  return { x: 0, y: 1.8, z: 35 };
}

function getCampaignPickupSpawns(district: string): Point3D[] {
  if (district === 'safehouse') {
    return [
      { x: -5, y: 0.8, z: 4 },
      { x: 5, y: 0.8, z: -4 },
    ];
  }
  return [
    { x: 0, y: 0.8, z: 12 },
    { x: -22, y: 0.8, z: -5 },
    { x: 22, y: 0.8, z: -5 },
    { x: -10, y: 0.8, z: 22 },
    { x: 10, y: 0.8, z: -22 },
  ];
}

function getCampaignPatrolRoutes(district: string): Point3D[][] {
  const routes: Point3D[][] = [];
  if (district === 'safehouse') return [];

  routes.push([
    { x: -20, y: 1.2, z: -15 },
    { x: -10, y: 1.2, z: -15 },
    { x: -10, y: 1.2, z: -5 },
  ]);
  routes.push([
    { x: 20, y: 1.2, z: -15 },
    { x: 10, y: 1.2, z: -15 },
    { x: 10, y: 1.2, z: -5 },
  ]);
  routes.push([
    { x: -15, y: 1.2, z: 15 },
    { x: 15, y: 1.2, z: 15 },
  ]);
  return routes;
}
