/**
 * @Instructions
 * 		@task1 : Complete the setTexture function to handle non power of 2 sized textures
 * 		@task2 : Implement the lighting by modifying the fragment shader, constructor,
 *      @task3:
 *      @task4:
 * 		setMesh, draw, setAmbientLight, setSpecularLight and enableLighting functions
 */

function GetModelViewProjection(
	projectionMatrix,
	translationX,
	translationY,
	translationZ,
	rotationX,
	rotationY
) {
	var trans1 = [
		1,
		0,
		0,
		0,
		0,
		1,
		0,
		0,
		0,
		0,
		1,
		0,
		translationX,
		translationY,
		translationZ,
		1,
	];
	var rotatXCos = Math.cos(rotationX);
	var rotatXSin = Math.sin(rotationX);

	var rotatYCos = Math.cos(rotationY);
	var rotatYSin = Math.sin(rotationY);

	var rotatx = [
		1,
		0,
		0,
		0,
		0,
		rotatXCos,
		-rotatXSin,
		0,
		0,
		rotatXSin,
		rotatXCos,
		0,
		0,
		0,
		0,
		1,
	];

	var rotaty = [
		rotatYCos,
		0,
		-rotatYSin,
		0,
		0,
		1,
		0,
		0,
		rotatYSin,
		0,
		rotatYCos,
		0,
		0,
		0,
		0,
		1,
	];

	var test1 = MatrixMult(rotaty, rotatx);
	var test2 = MatrixMult(trans1, test1);
	var mvp = MatrixMult(projectionMatrix, test2);

	return mvp;
}

class MeshDrawer {
	// The constructor is a good place for taking care of the necessary initializations.
	constructor() {
		this.prog = InitShaderProgram(meshVS, meshFS);
		this.mvpLoc = gl.getUniformLocation(this.prog, "mvp");
		this.showTexLoc = gl.getUniformLocation(this.prog, "showTex");

		this.colorLoc = gl.getUniformLocation(this.prog, "color");

		this.vertPosLoc = gl.getAttribLocation(this.prog, "pos");
		this.texCoordLoc = gl.getAttribLocation(this.prog, "texCoord");

		this.vertbuffer = gl.createBuffer();
		this.texbuffer = gl.createBuffer();

		this.numTriangles = 0;

		// #region Task 2
		this.normalPosLoc = gl.getAttribLocation(this.prog, "normal");

		this.normalbuffer = gl.createBuffer();

		this.lightPos = [0, 0, 0];
		this.ambient = 0.5;
		this.enableLight = false;

		this.lightPosLoc = gl.getUniformLocation(this.prog, "lightPos");
		this.ambientLoc = gl.getUniformLocation(this.prog, "ambient");
		this.enableLightLoc = gl.getUniformLocation(this.prog, "enableLighting");
		// #endregion
	}

	setMesh(vertPos, texCoords, normalCoords) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		// update texture coordinates
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		this.numTriangles = vertPos.length / 3;

		// #region Task 2
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalbuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(normalCoords),
			gl.STATIC_DRAW
		);
		// #endregion
	}

	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw(trans) {
		gl.useProgram(this.prog);

		gl.uniformMatrix4fv(this.mvpLoc, false, trans);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.enableVertexAttribArray(this.vertPosLoc);
		gl.vertexAttribPointer(this.vertPosLoc, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
		gl.enableVertexAttribArray(this.texCoordLoc);
		gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);

		// #region Task 2
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalbuffer);
		gl.enableVertexAttribArray(this.normalPosLoc);
		gl.vertexAttribPointer(this.normalPosLoc, 3, gl.FLOAT, false, 0, 0);
		// #endregion

		updateLightPos();

		// #region Task 2
		gl.uniform3fv(this.lightPosLoc, new Float32Array([5, lightY, lightX]));

		gl.uniform1f(this.ambientLoc, this.ambient);
		// #endregion

		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}

	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img) {
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// You can set the texture image data using the following command.
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

		// Set texture parameters
		if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			// #region Task 1
			// Set wrapping to CLAMP_TO_EDGE
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			// Set filtering to linear
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			// #endregion
		}

		gl.useProgram(this.prog);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		const sampler = gl.getUniformLocation(this.prog, "tex");
		gl.uniform1i(sampler, 0);
	}

	showTexture(show) {
		gl.useProgram(this.prog);
		gl.uniform1i(this.showTexLoc, show);
	}

	enableLighting(show) {
		// #region Task 2
		gl.useProgram(this.prog);
		gl.uniform1f(this.enableLightLoc, show);
		// #endregion
	}

	setAmbientLight(ambient) {
		// #region Task 2
		this.ambient = ambient;
		// #endregion
	}

	setSpecularLight(specular) {}
}

function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}

function normalize(v, dst) {
	dst = dst || new Float32Array(3);
	var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	// make sure we don't divide by 0.
	if (length > 0.00001) {
		dst[0] = v[0] / length;
		dst[1] = v[1] / length;
		dst[2] = v[2] / length;
	}
	return dst;
}

// Vertex shader source code
const meshVS = `
			attribute vec3 pos; 
			attribute vec2 texCoord; 
			attribute vec3 normal;

			uniform mat4 mvp; 

			varying vec2 v_texCoord; 
			varying vec3 v_normal; 

			void main()
			{
				v_texCoord = texCoord;
				v_normal = normal;

				gl_Position = mvp * vec4(pos,1);
			}`;

// Fragment shader source code
/**
 * @Task2 : You should update the fragment shader to handle the lighting
 */
const meshFS = `
			precision mediump float;

			uniform bool showTex;
			uniform bool enableLighting;
			uniform sampler2D tex;
			uniform vec3 color; 
			uniform vec3 lightPos;
			uniform float ambient;

			varying vec2 v_texCoord;
			varying vec3 v_normal;

			void main()
			{
				if(showTex && enableLighting){
					vec3 lightDir = normalize(lightPos);
					
					// Ambient light
					vec3 ambientLight = vec3(ambient);

					// Diffuse ligting
					float light = max(dot(v_normal, lightDir), 0.0);
					vec3 diffuse = vec3(1.0) * light;

					gl_FragColor = vec4((ambientLight + diffuse), 1.0) * texture2D(tex, v_texCoord);
				}
				else if(showTex){
					gl_FragColor = texture2D(tex, v_texCoord);
				}
				else{
					gl_FragColor =  vec4(1.0, 0, 0, 1.0);
				}
			}`;

// Light direction parameters for Task 2
var lightX = 1;
var lightY = 1;

const keys = {};
function updateLightPos() {
	const translationSpeed = 1;
	if (keys["ArrowUp"]) lightY -= translationSpeed;
	if (keys["ArrowDown"]) lightY += translationSpeed;
	if (keys["ArrowRight"]) lightX -= translationSpeed;
	if (keys["ArrowLeft"]) lightX += translationSpeed;
}
///////////////////////////////////////////////////////////////////////////////////
