import * as BABYLON from '@babylonjs/core/Legacy/legacy';
import * as CANNON from 'cannon';

export function createScene(engine, canvas) {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color3.Purple();

  const camera = new BABYLON.FreeCamera('Camera', new BABYLON.Vector3(0, 0, -20), scene);
  camera.attachControl(canvas, true);
  camera.checkCollisions = true;
  camera.applyGravity = true;
  camera.setTarget(new BABYLON.Vector3(0, 0, 0));

  const light = new BABYLON.DirectionalLight('dir02', new BABYLON.Vector3(0.2, -1, 0), scene);
  light.position = new BABYLON.Vector3(0, 80, 0);

  // Shadows
  const shadowGenerator = new BABYLON.ShadowGenerator(2048, light);

  // Physics
  scene.enablePhysics(null, new BABYLON.CannonJSPlugin(true, 10, CANNON));
  // scene.enablePhysics(null, new BABYLON.OimoJSPlugin());

  // Spheres
  let y = 0;
  for (let index = 0; index < 100; index += 1) {
    const sphere = BABYLON.Mesh.CreateSphere('Sphere0', 16, 3, scene);

    sphere.position = new BABYLON.Vector3(Math.random() * 20 - 10, y, Math.random() * 10 - 5);

    shadowGenerator.addShadowCaster(sphere);

    sphere.physicsImpostor = new BABYLON.PhysicsImpostor(
      sphere, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1 }, scene,
    );

    y += 2;
  }

  // Box
  const box0 = BABYLON.Mesh.CreateBox('Box0', 3, scene);
  box0.position = new BABYLON.Vector3(3, 30, 0);

  shadowGenerator.addShadowCaster(box0);

  // Compound
  const part0 = BABYLON.Mesh.CreateBox('part0', 3, scene);
  part0.position = new BABYLON.Vector3(3, 30, 0);

  const part1 = BABYLON.Mesh.CreateBox('part1', 3, scene);
  part1.parent = part0; // We need a hierarchy for compound objects
  part1.position = new BABYLON.Vector3(0, 3, 0);

  shadowGenerator.addShadowCaster(part0);
  shadowGenerator.addShadowCaster(part1);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.useKernelBlur = true;
  shadowGenerator.blurKernel = 32;

  // Playground
  const ground = BABYLON.Mesh.CreateBox('Ground', 1, scene);
  ground.scaling = new BABYLON.Vector3(100, 1, 100);
  ground.position.y = -5.0;
  ground.checkCollisions = true;

  const border0 = BABYLON.Mesh.CreateBox('border0', 1, scene);
  border0.scaling = new BABYLON.Vector3(1, 100, 100);
  border0.position.y = -5.0;
  border0.position.x = -50.0;
  border0.checkCollisions = true;

  const border1 = BABYLON.Mesh.CreateBox('border1', 1, scene);
  border1.scaling = new BABYLON.Vector3(1, 100, 100);
  border1.position.y = -5.0;
  border1.position.x = 50.0;
  border1.checkCollisions = true;

  const border2 = BABYLON.Mesh.CreateBox('border2', 1, scene);
  border2.scaling = new BABYLON.Vector3(100, 100, 1);
  border2.position.y = -5.0;
  border2.position.z = 50.0;
  border2.checkCollisions = true;

  const border3 = BABYLON.Mesh.CreateBox('border3', 1, scene);
  border3.scaling = new BABYLON.Vector3(100, 100, 1);
  border3.position.y = -5.0;
  border3.position.z = -50.0;
  border3.checkCollisions = true;

  const groundMat = new BABYLON.StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  groundMat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
  groundMat.backFaceCulling = false;
  ground.material = groundMat;
  border0.material = groundMat;
  border1.material = groundMat;
  border2.material = groundMat;
  border3.material = groundMat;
  ground.receiveShadows = true;

  // Physics
  box0.physicsImpostor = new BABYLON.PhysicsImpostor(
    box0, BABYLON.PhysicsImpostor.BoxImpostor, {
      mass: 2,
      friction: 0.4,
      restitution: 0.3,
    }, scene,
  );
  ground.physicsImpostor = new BABYLON.PhysicsImpostor(
    ground, BABYLON.PhysicsImpostor.BoxImpostor, {
      mass: 0,
      friction: 0.5,
      restitution: 0.7,
    }, scene,
  );
  border0.physicsImpostor = new BABYLON.PhysicsImpostor(
    border0, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene,
  );
  border1.physicsImpostor = new BABYLON.PhysicsImpostor(
    border1, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene,
  );
  border2.physicsImpostor = new BABYLON.PhysicsImpostor(
    border2, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene,
  );
  border3.physicsImpostor = new BABYLON.PhysicsImpostor(
    border3, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene,
  );

  part0.physicsImpostor = new BABYLON.PhysicsImpostor(
    part0, BABYLON.PhysicsImpostor.BoxImpostor, {
      mass: 2,
      friction: 0.4,
      restitution: 0.3,
    }, scene,
  );

  return scene;
}
