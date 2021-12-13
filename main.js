'use strict';

let gl;                         // The webgl context.

let iAttribVertex;              // Location of the attribute variable in the shader program.
let iAttribTexture;             // Location of the attribute variable in the shader program.

let iColor;                     // Location of the uniform specifying a color for the primitive.
let iColorCoef;                 // Location of the uniform specifying a color for the primitive.
let iModelViewProjectionMatrix; // Location of the uniform matrix representing the combined transformation.
let iTextureMappingUnit;

let iVertexBuffer;              // Buffer to hold the values.
let iTexBuffer;                 // Buffer to hold the values.
let iIndexBuffer;

let isShowingGrid = false;
let stereo_cam;
let filled;

let dingdong;
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.


/* Draws a WebGL primitive.  The first parameter must be one of the constants
 * that specify primitives:  gl.POINTS, gl.LINES, gl.LINE_LOOP, gl.LINE_STRIP,
 * gl.TRIANGLES, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN.  The second parameter must
 * be an array of 4 numbers in the range 0.0 to 1.0, giving the RGBA color of
 * the color of the primitive.  The third parameter must be an array of numbers.
 * The length of the array must be a multiple of 3.  Each triple of numbers provides
 * xyz-coords for one vertex for the primitive.  This assumes that u_color is the
 * location of a color uniform in the shader program, a_coords_loc is the location of
 * the coords attribute, and a_coords_buffer is a VBO for the coords attribute.
 * 
 */
class DingDong {
    #vertices;
    #indices;

    constructor(r = 1, rr = 2, scale = 2, sphere_div = 100) {
        this.r = r;
        this.rr = rr;
        this.sphere_div = sphere_div;
        this.scale = scale;
        this.#vertices = [];
        this.#indices = [];
    }

    #calc_vertices() {
        this.#vertices = [];
        var ai, aj, tmp, si, ci;
        for (let j = -this.sphere_div; j <= this.sphere_div; j ++) {
            tmp = j / this.sphere_div;
            aj = tmp * Math.sqrt(1 - tmp) * this.r;
            for (let i = 0; i <= this.sphere_div; i++) {
                ai = i * 2 * Math.PI / this.sphere_div * this.rr;
                si = Math.sin(ai);
                ci = Math.cos(ai);
                this.#vertices.push(aj * ci * this.scale);
                this.#vertices.push(aj * si * this.scale);
                this.#vertices.push(tmp * this.scale);
            }
        }
    }

    get vertices() {
        this.#calc_vertices();
        return this.#vertices;
    }

    #calc_indices() {
        this.#indices = [];
        let p1, p2;
        for (let j = 0; j < 2 * this.sphere_div; j++) {
            for (let i = 0; i < this.sphere_div; i++) {
              p1 = j * (this.sphere_div + 1) + i;
              p2 = p1 + (this.sphere_div + 1);
      
            //   this.#indices.push(p1, p2, p1 + 1);
      
            //   this.#indices.push(p1 + 1, p2, p2 + 1);
              this.#indices.push(p1);
              this.#indices.push(p2);
              this.#indices.push(p1 + 1);

              this.#indices.push(p1 + 1);
              this.#indices.push(p2);
              this.#indices.push(p2 + 1);
            }
          }
    }


//     // Indices
//     for (j = 0; j < 2 * SPHERE_DIV; j++) {
//       for (i = 0; i < SPHERE_DIV; i++) {
//         p1 = j * (SPHERE_DIV+1) + i;
//         p2 = p1 + (SPHERE_DIV+1);

//         indices.push(p1);
//         indices.push(p2);
//         indices.push(p1 + 1);

//         indices.push(p1 + 1);
//         indices.push(p2);
//         indices.push(p2 + 1);
//       }
//     }


    get indices() {
        this.#calc_indices();
        return this.#indices;
    }
};


function drawPrimitive(primitiveType, color, vertices, texCoords, indices )
{
     gl.uniform4fv(iColor, color);
     gl.uniform1f(iColorCoef, 0);
 
     gl.enableVertexAttribArray(iAttribVertex);
     gl.bindBuffer(gl.ARRAY_BUFFER, iVertexBuffer);
     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
     if (indices) {
         gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iIndexBuffer);
         gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STREAM_DRAW);
     }
     gl.vertexAttribPointer(iAttribVertex, 3, gl.FLOAT, false, 0, 0);
 
     if (texCoords.length != 0) {
         gl.enableVertexAttribArray(iAttribTexture);
         gl.bindBuffer(gl.ARRAY_BUFFER, iTexBuffer);
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STREAM_DRAW);
         gl.vertexAttribPointer(iAttribTexture, 2, gl.FLOAT, false, 0, 0);
     } else {
         gl.disableVertexAttribArray(iAttribTexture);
         gl.vertexAttrib2f(iAttribTexture, 0.0, 0.0);
         gl.uniform1f(iColorCoef, 1.0);
     }
     if (!indices) {
         gl.drawArrays(primitiveType, 0, vertices.length / 3);
     } else {
         gl.drawElements(primitiveType, indices.length, gl.UNSIGNED_SHORT, 0);
     }
}

/* Draws dingdong
 */
function drawSurface() {
    let primitive;
    if (filled) {
        primitive = gl.TRIANGLES;
    } else {
        primitive = gl.LINES;
    }
    drawPrimitive(primitive, [.7, .7, .7, .7], dingdong.vertices, [], dingdong.indices);
}

/* Draws anaglyphic stereo image of a cornucopia
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();
    let projection = m4.perspective(Math.PI/20, 1, 6, 20); 

    /* Rotate and translate matrixes */
    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
    let modelViewProjection = m4.multiply(projection, matAccum1 );

    /*red color */
    let modelViewProjectionLeft = m4.multiply(stereo_cam.ApplyLeftFrustum(), matAccum1);
    gl.uniformMatrix4fv(iModelViewProjectionMatrix, false, modelViewProjectionLeft);
    gl.uniform1i(iTextureMappingUnit, 0);
    gl.colorMask(1, 0, 0, 0);
    drawSurface();

    gl.clear(gl.DEPTH_BUFFER_BIT);

    /*blue color */
    let modelViewProjectionRight = m4.multiply(stereo_cam.ApplyRightFrustum(), matAccum1);
    gl.uniformMatrix4fv(iModelViewProjectionMatrix, false, modelViewProjectionRight);
    gl.uniform1i(iTextureMappingUnit, 0);
    gl.colorMask(0, 1, 1, 0);
    drawSurface();

    /* Set previous matrix mode */
    gl.colorMask(1, 1, 1, 1);
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
// function draw() { 
//     gl.clearColor(0,0,0,1);
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
//     /* Set the values of the projection transformation */
//     let projection = m4.perspective(Math.PI/8, 1, 8, 12); 
    
//     /* Get the view matrix from the SimpleRotator object.*/
//     let modelView = spaceball.getViewMatrix();

//     let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
//     let translateToPointZero = m4.translation(0,0,-10);

//     let matAccum0 = m4.multiply(rotateToPointZero, modelView );
//     let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );
        
//     /* Multiply the projection matrix times the modelview matrix to give the
//        combined transformation matrix, and send that to the shader program. */
//     let modelViewProjection = m4.multiply(projection, matAccum1 );

//     gl.uniformMatrix4fv(iModelViewProjectionMatrix, false, modelViewProjection );

//     gl.uniform1i(iTextureMappingUnit, 0);

//     var SPHERE_DIV = 50;
//     var i, ai, si, ci;
//     var j, aj, sj, cj;
//     var p1, p2, tmp;
//     var a = 0.1

//     // Vertices
//     var vertices = [], indices = [], texCoords = [];
//     for (j = -SPHERE_DIV; j <= SPHERE_DIV; j++) {
//         tmp = j / SPHERE_DIV;
//       aj = tmp * Math.sqrt(1 - tmp) ;
//     //   sj = Math.sin(aj);
//     //   cj = Math.cos(aj);
//       for (i = 0; i <= SPHERE_DIV; i++) {
//         ai = i * 2 * Math.PI / SPHERE_DIV;
//         si = Math.sin(ai);
//         ci = Math.cos(ai);

//         vertices.push(aj * ci);  // X
//         vertices.push(aj * si);       // Y
//         vertices.push(tmp); // Z


//         var s = tmp / SPHERE_DIV;
//         var t = i / SPHERE_DIV;
//         texCoords.push(s);
//         texCoords.push(t);
//       }
//     }

//     // Indices
//     for (j = 0; j < 2 * SPHERE_DIV; j++) {
//       for (i = 0; i < SPHERE_DIV; i++) {
//         p1 = j * (SPHERE_DIV+1) + i;
//         p2 = p1 + (SPHERE_DIV+1);

//         indices.push(p1);
//         indices.push(p2);
//         indices.push(p1 + 1);

//         indices.push(p1 + 1);
//         indices.push(p2);
//         indices.push(p2 + 1);
//       }
//     }

//     gl.uniform4fv(iColor, [0.5, 0.9, 0.7, 0.1]);
//     gl.uniform1f(iColorCoef, 0.0);

//     // vertices
//     gl.bindBuffer(gl.ARRAY_BUFFER, iVertexBuffer);
//     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

//     // indices
//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iIndexBuffer);
//     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STREAM_DRAW);

//     // textures
//     if (isShowingGrid) {
//         gl.enableVertexAttribArray(iAttribTexture);
//         gl.bindBuffer(gl.ARRAY_BUFFER, iTexBuffer);
//         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STREAM_DRAW);
//         gl.vertexAttribPointer(iAttribTexture, 2, gl.FLOAT, false, 0, 0);

//         gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_SHORT, 0);
//   } else {
//         gl.enableVertexAttribArray(iAttribTexture);
//         gl.bindBuffer(gl.ARRAY_BUFFER, iTexBuffer);
//         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STREAM_DRAW);
//         gl.vertexAttribPointer(iAttribTexture, 2, gl.FLOAT, false, 0, 0);

//         gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
//     }


    
//     /* Draw the six faces of a cube, with different colors. */
//     // gl.drawElements(gl.TRIANGLES, 0.2, gl.UNSIGNED_BYTE, 0);
//     // drawPrimitive( gl.TRIANGLE_FAN, [0,0,1,1], [ -1,1,-1,  -1,1,1,   1,1,1,   1,1,-1 ],  [ 0,0, 0,1, 1,1, 1,0 ]);
//     // drawPrimitive( gl.TRIANGLE_FAN, [1,1,0,1], [ -1,-1,-1,  1,-1,-1, 1,-1,1, -1,-1,1 ],  [ 0,0, 1,0, 1,1, 0,1 ]);
//     // drawPrimitive( gl.TRIANGLE_FAN, [1,0,1,1], vertices, indices);
//     // drawPrimitive( gl.TRIANGLE_FAN, [0,1,1,1], [ -1,-1,-1, -1,-1,1, -1,1,1,  -1,1,-1 ],  [ 0,0, 0,1 ,1,1, 1,0 ]);
    
//     /* Draw coordinate axes as thick colored lines that extend through the cube. */
//     gl.lineWidth(4);
//     drawPrimitive( gl.LINES, [1,0,0,1], [ -2,0,0, 2,0,0]);
//     drawPrimitive( gl.LINES, [0,1,0,1], [ 0,-2,0, 0,2,0]);
//     drawPrimitive( gl.LINES, [0,0,1,1], [ 0,0,-2, 0,0,2]);
//     gl.lineWidth(1);
// }


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );
    gl.useProgram(prog);

    iAttribVertex  =  gl.getAttribLocation(prog, "vertex");
    iAttribTexture =  gl.getAttribLocation(prog, "texCoord");

    iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    iColor                     = gl.getUniformLocation(prog, "color");
    iColorCoef                 = gl.getUniformLocation(prog, "fColorCoef");
    iTextureMappingUnit        = gl.getUniformLocation(prog, "u_texture");

    iVertexBuffer = gl.createBuffer();
    iTexBuffer    = gl.createBuffer();
    iIndexBuffer  = gl.createBuffer();

    LoadTexture();

    gl.enable(gl.DEPTH_TEST);
}

function LoadTexture()
{
    // Create a texture.
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
    // Asynchronously load an image
    var image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = "https://webglfundamentals.org/webgl/resources/f-texture.png";
    image.addEventListener('load', () => {
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);

        draw();
    });
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    dingdong = new DingDong()
    filled = false;

    stereo_cam = new StereoCamera(
        70,         // eye separation
        2000.0,     // Convergence
        1.3333,     // Aspect Ratio
        .7,         // FOV along Y in degrees
        1.0,        // Near Clipping Distance
        20000.0,    // Far Clipping Distance
    );
    Array.from([ 'sphere_div', 'eye_separation']).forEach(elementId => {
        document.getElementById(elementId).addEventListener('change', (event) => {
            let value = parseFloat(event.target.value);
            if (elementId != 'eye_separation') {
                dingdong[elementId] = value;
            } else {
                stereo_cam['eyeSeparation'] = value;
            }
            draw();
        });
        var evt = new Event('change');
        document.getElementById(elementId).dispatchEvent(evt);
    });
    document.getElementById('filling').addEventListener('change', () => {
        filled = !filled;
        draw();
    });
    window.addEventListener('deviceorientation', (event) => {
        draw();
    }, true);
}


