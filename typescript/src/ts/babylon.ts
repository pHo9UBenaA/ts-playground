import * as BABYLON from 'babylonjs';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const engine = new BABYLON.Engine(canvas, true);

const createCamera = (scene: BABYLON.Scene) => {
	const alpha = Math.PI / 4;
	const beta = Math.PI / 3;
	const radius = 8;
	const target = new BABYLON.Vector3(0, 0, 0);

	const camera = new BABYLON.ArcRotateCamera('Camera', alpha, beta, radius, target, scene);
	camera.attachControl(canvas, true);
	return camera;
};

const createLight = (scene: BABYLON.Scene) => {
	const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(1, 1, 0), scene);
	return light;
};

const createBox = (scene: BABYLON.Scene) => {
	const box = BABYLON.MeshBuilder.CreateBox('box', {});
	box.position.x = 0;
	box.position.y = 1;
	const boxMaterial = new BABYLON.StandardMaterial('material', scene);
	boxMaterial.diffuseColor = BABYLON.Color3.Random();
	box.material = boxMaterial;
	return { box, boxMaterial };
};

const createGround = (scene: BABYLON.Scene) => {
	const ground = BABYLON.MeshBuilder.CreateGround('ground', {
		width: 4,
		height: 4,
	});
	return ground;
};

const addBoxAction = (
	scene: BABYLON.Scene,
	box: BABYLON.Mesh,
	boxMaterial: BABYLON.StandardMaterial
) => {
	box.actionManager = new BABYLON.ActionManager(scene);
	box.actionManager.registerAction(
		new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, function (event) {
			const sourceBox = event.meshUnderPointer;

			if (typeof sourceBox?.position.x === 'number') {
				sourceBox.position.x += 0.1;
			}
			if (typeof sourceBox?.position.y === 'number') {
				sourceBox.position.y += 0.1;
			}

			boxMaterial.diffuseColor = BABYLON.Color3.Random();
		})
	);
};

const createScene = function () {
	const scene = new BABYLON.Scene(engine);
	scene.clearColor = BABYLON.Color4.FromColor3(BABYLON.Color3.Black());

	const camera = createCamera(scene);
	const light = createLight(scene);
	const { box, boxMaterial } = createBox(scene);
	const ground = createGround(scene);

	addBoxAction(scene, box, boxMaterial);

	const xrPromise = scene.createDefaultXRExperienceAsync({
		floorMeshes: [ground],
	});

	return xrPromise.then((xrExperience) => {
		console.log('Done, WebXR is enabled.');
		return scene;
	});
};

const sceneToRender = createScene().then((sceneToRender) => {
	engine.runRenderLoop(() => sceneToRender.render());
});
