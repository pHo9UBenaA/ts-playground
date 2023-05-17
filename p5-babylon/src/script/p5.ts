import p5 from 'p5';

const POSITION_X = 10;

const SNOW = {
	POSITION_X: POSITION_X,
	POSITION_Y: 10,
	CANVAS_WIDTH: 400,
	CANVAS_HEIGHT: 400,
};

const KALEIDOSCOPE = {
	POSITION_X: POSITION_X,
	POSITION_Y: SNOW.POSITION_Y + SNOW.CANVAS_HEIGHT + 10,
	CANVAS_WIDTH: 400,
	CANVAS_HEIGHT: 400,
};

const snow = (sketch: any) => {
	// 雪の数と大きさの範囲
	const snowflakeCount = 50;
	const snowflakeSizeRange = [3, 10];

	// 雪と積雪の配列
	const snowflakes: any[] = [];
	const integrationCounts: any[] = [];

	// 雪の速度
	const snowflakeSpeed = 2;

	// 背景画像
	let backgroundImage: any;

	sketch.setup = () => {
		const canvas = sketch.createCanvas(SNOW.CANVAS_WIDTH, SNOW.CANVAS_HEIGHT);
		canvas.position(SNOW.POSITION_X, SNOW.POSITION_Y);

		// 背景画像の設定
		backgroundImage = sketch.createImage(SNOW.CANVAS_HEIGHT, SNOW.CANVAS_WIDTH);
		backgroundImage.loadPixels();
		for (let x = 0; x < backgroundImage.width; x++) {
			for (let y = 0; y < backgroundImage.height; y++) {
				backgroundImage.set(x, y, sketch.color(0, 90, 102));
			}
		}
		backgroundImage.updatePixels();
		sketch.image(backgroundImage, 0, 0);

		// 雪の初期化
		for (let i = 0; i < snowflakeCount; i++) {
			snowflakes.push([
				sketch.random(SNOW.CANVAS_WIDTH),
				sketch.random(SNOW.CANVAS_HEIGHT),
				sketch.random(...snowflakeSizeRange),
			]);
		}

		// 積雪の初期化
		for (let j = 0; j < SNOW.CANVAS_WIDTH / 4; j++) {
			integrationCounts.push(0);
		}
	};

	sketch.draw = () => {
		// 背景画像の描画
		sketch.image(backgroundImage, 0, 0);

		// 雪の描画と位置の更新
		sketch.noStroke();
		snowflakes.forEach((snowflake) => {
			drawSnowflake(snowflake);
			snowflake[1] += snowflakeSpeed;
		});

		// 積雪の描画と更新
		drawIntegration();
		const index = sketch.int(sketch.random(400 / 4));
		integrationCounts[index]++;
	};

	// 雪の描画
	const drawSnowflake = (snowflake: any) => {
		const lightCount = 5;
		const colorAlpha = 255 / lightCount;
		for (let i = 0; i < lightCount; i++) {
			const alpha = colorAlpha * (lightCount - i);
			sketch.fill(255, alpha);
			sketch.ellipse(
				snowflake[0],
				snowflake[1] % SNOW.CANVAS_HEIGHT,
				(snowflake[2] / lightCount) * (i + 1)
			);
		}
	};

	// 積雪の描画
	const drawIntegration = () => {
		const integrationWidth = 4;
		const integrationHeightMultiplier = 2;
		const integrationMaxHeight = 200;
		for (let j = 0; j < integrationCounts.length; j++) {
			const integrationCount = integrationCounts[j];
			const integrationHeight = integrationCount * integrationHeightMultiplier;
			const integrationX = j * integrationWidth;
			const integrationY = SNOW.CANVAS_HEIGHT;
			const integrationSize = sketch.min(
				integrationCount * integrationWidth,
				integrationMaxHeight
			);
			sketch.fill(255, 200);
			sketch.ellipse(integrationX, integrationY, integrationSize, integrationHeight);
		}
	};
};

const kaleidoscope = (sketch: any) => {
	const symmetry = 6;
	const angle = 360 / symmetry;
	let saveButton: any;
	let clearButton: any;
	let fullscreenButton: any;
	let brushSizeSlider: any;
	let sizeSlider: any;

	sketch.setup = () => {
		const canvas = sketch.createCanvas(KALEIDOSCOPE.CANVAS_WIDTH, KALEIDOSCOPE.CANVAS_HEIGHT);
		canvas.position(KALEIDOSCOPE.POSITION_X, KALEIDOSCOPE.POSITION_Y);
		sketch.angleMode(sketch.DEGREES);
		sketch.background(127);

		saveButton = sketch.createButton('Save');
		saveButton.mousePressed(saveFile);
		saveButton.position(
			KALEIDOSCOPE.POSITION_X + 0,
			KALEIDOSCOPE.CANVAS_WIDTH + KALEIDOSCOPE.POSITION_Y + 5
		);

		clearButton = sketch.createButton('Clear');
		clearButton.mousePressed(clearScreen);
		clearButton.position(
			KALEIDOSCOPE.POSITION_X + 50,
			KALEIDOSCOPE.CANVAS_WIDTH + KALEIDOSCOPE.POSITION_Y + 5
		);

		fullscreenButton = sketch.createButton('Full Screen');
		fullscreenButton.mousePressed(screenFull);
		fullscreenButton.position(
			KALEIDOSCOPE.POSITION_X + 100,
			KALEIDOSCOPE.CANVAS_WIDTH + KALEIDOSCOPE.POSITION_Y + 5
		);

		brushSizeSlider = sketch.createButton('Brush Size Slider');
		sizeSlider = sketch.createSlider(1, 32, 4, 0.1);
		brushSizeSlider.position(
			KALEIDOSCOPE.POSITION_X + 200,
			KALEIDOSCOPE.CANVAS_WIDTH + KALEIDOSCOPE.POSITION_Y + 5
		);
		sizeSlider.position(
			KALEIDOSCOPE.POSITION_X + 350,
			KALEIDOSCOPE.CANVAS_WIDTH + KALEIDOSCOPE.POSITION_Y + 5
		);
	};

	const saveFile = () => {
		sketch.save('design.jpg');
	};

	const clearScreen = () => {
		sketch.background(127);
	};

	const screenFull = () => {
		const fs = sketch.fullscreen();
		sketch.fullscreen(!fs);
	};

	sketch.draw = () => {
		// キャンバスの中心を原点として座標系を移動
		sketch.translate(sketch.width / 2, sketch.height / 2);

		// マウスポインターがキャンバス内にある場合の処理
		if (
			sketch.mouseX > 0 &&
			sketch.mouseX < sketch.width &&
			sketch.mouseY > 0 &&
			sketch.mouseY < sketch.height
		) {
			// マウスポインターの座標と、直前の座標を取得
			const mx = sketch.mouseX - sketch.width / 2;
			const my = sketch.mouseY - sketch.height / 2;
			const pmx = sketch.pmouseX - sketch.width / 2;
			const pmy = sketch.pmouseY - sketch.height / 2;

			// マウスが押されている場合の処理
			if (sketch.mouseIsPressed) {
				// symmetryの数だけ回転しながら線を描画する
				for (let i = 0; i < symmetry; i++) {
					sketch.rotate(angle);
					const sw = sizeSlider.value();
					sketch.strokeWeight(sw);
					sketch.line(mx, my, pmx, pmy);
					// 線を上下反転して描画する
					sketch.push();
					sketch.scale(1, -1);
					sketch.line(mx, my, pmx, pmy);
					sketch.pop();
				}
			}
		}
	};
};

new p5(snow);
new p5(kaleidoscope);
