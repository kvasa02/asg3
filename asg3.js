// Global Variables for WebGL and Scene Management
var gl;              // WebGL rendering context
var canvas;          // HTML canvas element reference
var a_Position;      // Attribute pointer for vertex position in shader
var a_UV;            // Attribute pointer for texture coordinates (UVs)
var u_FragColor;     // Uniform for fragment color in shader
var u_ModelMatrix;   // Uniform for object transformation matrix
var u_ProjectionMatrix; // Uniform for camera projection matrix
var u_ViewMatrix;     // Uniform for camera view matrix
var u_GlobalRotateMatrix; // Uniform for global scene rotation
var u_Sampler0;       // Texture sampler uniform for texture unit 0
var u_Sampler1;       // Texture sampler uniform for texture unit 1
var u_whichTexture;   // Uniform to select texture/color mode
var u_Clicked;        // Uniform for mouse click state

// Camera Control
var g_camera;         // Camera object for view control

// User Interface State
var gAnimalGlobalRotation = 0; // Rotation angle from UI slider
var head_animation = 0;        // Head animation angle
var g_Animation = false;       // Animation toggle state

var g_bodyAngle = 0;       // Body sway
var g_tailWag = 0;        // Tail wagging
var g_legAngle = 0;       // Leg movement
var g_earFlop = 0;        // Ear flopping
var g_dogHoverLocation = 0; // Vertical hover position
var g_breathe = 0;        // Breathing animation
var g_headTilt = 0;       // Head tilting animation

// Animation Timing
var g_startTime = performance.now()/1000.0; // Animation start timestamp
var g_seconds = performance.now()/1000.0 - g_startTime; // Elapsed time


// Vertex shader program ==========================================
var VSHADER_SOURCE =`
   precision mediump float;
   attribute vec4 a_Position;
   attribute vec2 a_UV;
   varying vec2 v_UV;
   uniform mat4 u_ModelMatrix;
   uniform mat4 u_GlobalRotateMatrix;
   uniform mat4 u_ViewMatrix;
   uniform mat4 u_ProjectionMatrix;
   uniform bool u_Clicked; // Mouse is pressed
   void main() {
      if(u_Clicked){
         vec4(1,1,1,1);
      }
      gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
      v_UV = a_UV;
   }`

// Fragment shader program ========================================
var FSHADER_SOURCE =`
    precision mediump float;
    varying vec2 v_UV;
    uniform vec4 u_FragColor;
    uniform sampler2D u_Sampler0;
    uniform sampler2D u_Sampler1;
    uniform int u_whichTexture;
    void main() {
      if(u_whichTexture == -2){
         gl_FragColor = u_FragColor;                  // Use color
      } else if (u_whichTexture == -1){
         gl_FragColor = vec4(v_UV, 1.0, 1.0);         // Use UV debug color
      } else if(u_whichTexture == 0){
         gl_FragColor = texture2D(u_Sampler0, v_UV);  // Use texture0
      } else if(u_whichTexture == 1){
         gl_FragColor = texture2D(u_Sampler1, v_UV);  // Use texture1
      } else {
         gl_FragColor = vec4(1,.2,.2,1);              // Error, Red
      }
    }`


// HTML UI Event Binding
function addActionsForHtmlUI(){
   // Camera rotation slider event
   document.getElementById('camera').addEventListener('mousemove', function() { 
       gAnimalGlobalRotation = this.value; 
       renderScene();
   });
   
   // Animation control buttons
   document.getElementById('animate_on').onclick = function() {g_Animation = true;};
   document.getElementById('animate_off').onclick = function() {g_Animation = false;};
}

// WebGL Context Initialization
function setupWebGL(){
   canvas = document.getElementById('asg3'); // Get canvas element
   if (!canvas) {
       console.log('Canvas element not found');
       return;
   }

   gl = getWebGLContext(canvas); // Get WebGL 1.0 context
   if(!gl){
       console.log('WebGL context initialization failed');
       return;
   }

   gl.enable(gl.DEPTH_TEST); // Enable depth testing for 3D
}

// Compile Shader Programs and connect js to GLSL =================
function connectVariablesToGLSL(){
   // Initialize shaders ==========================================
   if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
       console.log('Failed to intialize shaders.');
       return;
   }

   // Get the storage location of attribute variable ==============
   a_Position = gl.getAttribLocation(gl.program, 'a_Position');
   if (a_Position < 0) {
       console.log('Failed to get the storage location of a_Position');
       return;
   }

   a_UV = gl.getAttribLocation(gl.program, 'a_UV');
   if (a_UV < 0) {
       console.log('Failed to get the storage location of a_UV');
       return;
   }

   // Get the storage location of attribute variable ==============
   u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
   if (!u_whichTexture) {
       console.log('Failed to get u_whichTexture');
       return;
   }

   u_Clicked = gl.getUniformLocation(gl.program, 'u_Clicked');
   if (!u_Clicked) {
       console.log('Failed to get u_Clicked');
       return;
   }

   // Get the storage location of attribute variable ==============
   u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
   if (!u_FragColor) {
       console.log('Failed to get u_FragColor');
       return;
   }

   u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
   if (!u_ModelMatrix) {
       console.log('Failed to get u_ModelMatrix');
       return;
   }

   u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
   if (!u_GlobalRotateMatrix) {
       console.log('Failed to get u_GlobalRotateMatrix');
       return;
   }

   u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
   if (!u_ViewMatrix) {
       console.log('Failed to get u_ViewMatrix');
       return;
   }

   u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
   if (!u_ProjectionMatrix) {
       console.log('Failed to get u_ProjectionMatrix');
       return;
   }

   // Get the storage location of u_Sampler0
   u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
   if (!u_Sampler0) {
     console.log('Failed to get the storage location of u_Sampler0');
     return false;
   }

   u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
   if (!u_Sampler1) {
     console.log('Failed to get the storage location of u_Sampler1');
     return false;
   }

   var identityM = new Matrix4();
   gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

}

// Texture Stuff ==================================================
function initTextures() {
   var image = new Image();
   var image1 = new Image();
   var stoneImage = new Image();  // Add stone texture

   image.onload = function() { 
       console.log("Grass texture loaded successfully!");
       sendTextureToTEXTURE0(image); 
   };
   image1.onload = function() { 
       console.log("Sky texture loaded successfully!");
       sendTextureToTEXTURE1(image1); 
   };
   stoneImage.onload = function() {
       console.log("Stone texture loaded successfully!");
       sendTextureToTEXTURE2(stoneImage);
   };

   image.src = 'grass.webp';
   image1.src = 'sky.webp';
   stoneImage.src = 'stone.jpg';
}


function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

function sendTextureToTEXTURE0(image) {
   var texture = gl.createTexture();
   if (!texture) {
      console.log('Failed to create the texture object');
      return false;
   }

   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y-axis
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, texture);
   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

   // Apply texture settings
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

   gl.uniform1i(u_Sampler0, 0);

   console.log("Grass texture applied to TEXTURE0!");
}

// ================================SKY
function sendTextureToTEXTURE1(image) {
   var texture = gl.createTexture();
   if(!texture){
      console.log('Failed to create the texture object');
      return false;
   }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
  // Enable texture unit0
  gl.activeTexture(gl.TEXTURE1);
  // Bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
     gl.generateMipmap(gl.TEXTURE_2D);
  } else {
     // Set the texture parameters
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }

  // Set the texture unit 1 to the sampler
  gl.uniform1i(u_Sampler1, 1);


  console.log("Finished loadTexture1");
}


// Main Initialization Function
function main() {
   setupWebGL();          // Initialize WebGL context
   connectVariablesToGLSL(); // Link shaders and variables
   addActionsForHtmlUI(); // Set up UI event handlers

   g_camera = new Camera(); // Create camera object

   // Input handlers
   document.onkeydown = keydown;       // Keyboard input
   canvas.onmousemove = mouseCam;      // Mouse movement
   canvas.onmousedown = check;         // Mouse click

   initTextures();         // Load textures
   gl.clearColor(0.0, 0.0, 0.0, 1.0); // Set clear color to black

   requestAnimationFrame(tick); // Start animation loop
}

function check(ev) {
  var picked = false;
  var x = ev.clientX, y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();
  if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) { // inside canvas
     var x_in_canvas = x - rect.left, y_in_canvas = rect.bottom - y;
     gl.uniform1i(u_Clicked, 1);  // Pass true to u_Clicked
     // Read pixel at the clicked position
     var pixels = new Uint8Array(4); // Array for storing the pixel value
     gl.readPixels(x_in_canvas, y_in_canvas, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
     console.log(pixels[0]);
     if (pixels[0] == 255) 
       picked = true;

     gl.uniform1i(u_Clicked, 0); 
  }
}

// Movement =======================================================
function convertCoordinatesEventToGL(ev){
   var x = ev.clientX; // x coordinate of a mouse pointer
   var y = ev.clientY; // y coordinate of a mouse pointer
   var rect = ev.target.getBoundingClientRect() ;

   // set coordinates based on origin
   x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
   y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);


   return [x,y];
}

function mouseCam(ev){
   coord = convertCoordinatesEventToGL(ev);
   if(coord[0] < 0.5){ // left side
      g_camera.panMLeft(coord[0]*-10);
   } else{
      g_camera.panMRight(coord[0]*-10);
   }
}

function keydown(ev){
   switch (ev.key) {
      case 'w': case 'W': g_camera.forward(); break;
      case 's': case 'S': g_camera.back(); break;
      case 'a': case 'A': g_camera.right(); break;
      case 'd': case 'D': g_camera.left(); break;
      case 'q': case 'Q': g_camera.panLeft(); break;
      case 'e': case 'E': g_camera.panRight(); break;
      case 'u': case 'U': g_camera.upward(); break;
      case 'z': case 'Z': g_camera.downward(); break;
   }
   renderScene();
}

// TICK ===========================================================
function tick() {
   g_seconds = performance.now()/1000.0 - g_startTime;
   updateAnimationAngles();
   
   adjustVisuals();

   renderScene();
   requestAnimationFrame(tick);
}



// Function to draw the ground (grass)
function drawGround() {
   let ground = new Cube();
   ground.color = [1, 1, 1, 1]; // White color, will be overridden by texture
   ground.textureNum = 0; // Use grass texture
   ground.matrix.translate(-50, -0.1, -50);
   ground.matrix.scale(100, 0.1, 100); // Increased ground size for more space
   ground.renderfast();
}

// Function to draw the skybox
function drawSkybox() {
   let skybox = new Cube();
   skybox.color = [1, 1, 1, 1];
   skybox.textureNum = 1;
   skybox.matrix.translate(-200, -200, -200);
   skybox.matrix.scale(400, 400, 400); 
   skybox.renderfast();
}

// renderScene ====================================================

// Modify renderScene to include skybox and ground
function renderScene() {
   // Pass the projection matrix
   var projMat = g_camera.projMat;
   gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

   // Pass the view matrix
   var viewMat = g_camera.viewMat;
   gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

   // Pass the matrix to u_ModelMatrix attribute
   var globalRotMat = new Matrix4().rotate(gAnimalGlobalRotation, 0, 1, 0);
   gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

   // Clear <canvas>
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
   
   // Draw the skybox first so it's always behind
   drawSkybox();
   
   // Draw the ground
   drawGround();

   // Apply additional visual adjustments
   adjustVisuals();
   
   // Draw other objects in the scene
   drawAllShapes();
}


function adjustVisuals() {
   // Modify ground to have slight elevation variance
   var ground = new Cube();
   ground.color = [1, 1, 1, 1];
   ground.textureNum = 0;
   ground.matrix.translate(-16, -0.1, -16);
   ground.matrix.scale(32, 0.15, 32); // Adjusted slight height variation
   ground.renderfast();

   // Add additional sky variation with blending
   let skybox = new Cube();
   skybox.color = [0.8, 0.9, 1, 1]; // Softer sky gradient
   skybox.textureNum = 1;
   skybox.matrix.translate(-50, -50, -50);
   skybox.matrix.scale(100, 100, 100);
   skybox.renderfast();
}




// -------------- RENDER DOG --------------
function renderDogShapes() {
   // Enhanced color palette with subtle variations
   let dogColor = [0.82, 0.63, 0.43, 1];     // Natural fur color
   let bellyColor = [0.88, 0.73, 0.58, 1];   // Lighter underbelly
   let noseColor = [0.15, 0.15, 0.15, 1];    // Deep black nose
   let eyeColor = [0.25, 0.15, 0.05, 1];     // Rich brown eyes
   let pawColor = [0.3, 0.2, 0.15, 1];       // Darker paw pads
   
   // BODY - More anatomically correct proportions
   var body = new Cube();
   body.color = dogColor;
   body.matrix.translate(10, g_dogHoverLocation + 0.7, 5.5);
   body.matrix.rotate(g_bodyAngle * 0.7, 1, 0, 0); // Reduced rotation for natural movement
   var bodyCoordMat = new Matrix4(body.matrix);
   body.matrix.scale(1.0, 0.8, 1.4); // Longer, more natural body shape
   body.render();
   
   // CHEST - Added chest definition
   var chest = new Cube();
   chest.color = bellyColor;
   chest.matrix = bodyCoordMat;
   chest.matrix.translate(0.1, -0.2, -0.2);
   chest.matrix.scale(0.8, 0.6, 0.4);
   chest.matrix.rotate(g_breathe * 0.5, 0, 0, 1); // Subtle breathing
   chest.render();
   
   // BELLY - More natural curve
   var belly = new Cube();
   belly.color = bellyColor;
   belly.matrix = bodyCoordMat;
   belly.matrix.translate(0.1, -0.3, 0.2);
   belly.matrix.scale(0.7, 0.4, 1.0);
   belly.matrix.rotate(g_breathe * 0.3, 0, 0, 1); // Gentler breathing movement
   belly.render();
   
   var bodyCoordMatForNeck = new Matrix4(body.matrix);
   var bodyCoordMatForLegs = new Matrix4(body.matrix);
   var bodyCoordMatForTail = new Matrix4(body.matrix);
   
   renderDogHead(dogColor, bellyColor, noseColor, eyeColor, bodyCoordMatForNeck);
   renderDogLegs(dogColor, bellyColor, pawColor, bodyCoordMatForLegs);
   renderDogTail(dogColor, bodyCoordMatForTail);
}


function renderDogHead(dogColor, bellyColor, noseColor, eyeColor, bodyCoordMatForNeck) {
   // NECK - More muscular definition
   var neck = new Cube();
   neck.color = dogColor;
   neck.matrix = bodyCoordMatForNeck;
   neck.matrix.translate(0.4, 0.7, -0.2);
   neck.matrix.rotate(g_headTilt * 0.6, 0, 0, 1); // Smoother head movement
   var neckCoordMat = new Matrix4(neck.matrix);
   neck.matrix.scale(0.5, 0.5, 0.5);
   neck.render();
   
   // HEAD - More natural skull shape
   var head = new Cube();
   head.color = dogColor;
   head.matrix = neckCoordMat;
   head.matrix.translate(0, 0.35, -0.3);
   var headCoordMat = new Matrix4(head.matrix);
   head.matrix.scale(0.6, 0.5, 0.55);
   head.render();
   
   renderDogSnout(dogColor, bellyColor, noseColor, headCoordMat);
   renderDogEars(dogColor, bellyColor, headCoordMat);
   renderDogEyes(eyeColor, headCoordMat);
}


function renderDogSnout(dogColor, bellyColor, noseColor, headCoordMat) {
   // Upper snout - More defined muzzle
   var upperSnout = new Cube();
   upperSnout.color = dogColor;
   upperSnout.matrix = headCoordMat;
   upperSnout.matrix.translate(0.15, -0.05, -0.5);
   upperSnout.matrix.scale(0.35, 0.25, 0.45);
   upperSnout.render();
   
   // Lower jaw - Better defined
   var lowerSnout = new Cube();
   lowerSnout.color = bellyColor;
   lowerSnout.matrix = headCoordMat;
   lowerSnout.matrix.translate(0.15, -0.2, -0.45);
   lowerSnout.matrix.scale(0.3, 0.15, 0.4);
   lowerSnout.render();
   
   // Nose - More detailed
   var nose = new Cube();
   nose.color = noseColor;
   nose.matrix = headCoordMat;
   nose.matrix.translate(0.25, 0, -0.55);
   nose.matrix.scale(0.12, 0.12, 0.06);
   nose.render();
   
   // Add nose bridge
   var noseBridge = new Cube();
   noseBridge.color = dogColor;
   noseBridge.matrix = headCoordMat;
   noseBridge.matrix.translate(0.25, 0.1, -0.5);
   noseBridge.matrix.scale(0.1, 0.1, 0.3);
   noseBridge.render();
}


function renderDogEars(dogColor, bellyColor, headCoordMat) {
   // Left ear - two segments for floppiness
   var leftEarBase = new Cube();
   leftEarBase.color = dogColor;
   leftEarBase.matrix = headCoordMat;
   leftEarBase.matrix.translate(0.4, 0.4, 0);
   leftEarBase.matrix.rotate(g_earFlop, 0, 0, 1);
   var leftEarTipMat = new Matrix4(leftEarBase.matrix);
   leftEarBase.matrix.scale(0.15, 0.25, 0.08);
   leftEarBase.render();
   
   var leftEarTip = new Cube();
   leftEarTip.color = bellyColor;
   leftEarTip.matrix = leftEarTipMat;
   leftEarTip.matrix.translate(0, 0.25, 0);
   leftEarTip.matrix.rotate(g_earFlop * 1.5, 0, 0, 1);
   leftEarTip.matrix.scale(0.15, 0.2, 0.08);
   leftEarTip.render();
   
   // Right ear - mirrored
   var rightEarBase = new Cube();
   rightEarBase.color = dogColor;
   rightEarBase.matrix = headCoordMat;
   rightEarBase.matrix.translate(-0.1, 0.4, 0);
   rightEarBase.matrix.rotate(-g_earFlop, 0, 0, 1);
   var rightEarTipMat = new Matrix4(rightEarBase.matrix);
   rightEarBase.matrix.scale(0.15, 0.25, 0.08);
   rightEarBase.render();
   
   var rightEarTip = new Cube();
   rightEarTip.color = bellyColor;
   rightEarTip.matrix = rightEarTipMat;
   rightEarTip.matrix.translate(0, 0.25, 0);
   rightEarTip.matrix.rotate(-g_earFlop * 1.5, 0, 0, 1);
   rightEarTip.matrix.scale(0.15, 0.2, 0.08);
   rightEarTip.render();
}

function renderDogEyes(eyeColor, headCoordMat) {
   // Eye whites
   var leftEyeWhite = new Cube();
   leftEyeWhite.color = [1, 1, 1, 1];
   leftEyeWhite.matrix = headCoordMat;
   leftEyeWhite.matrix.translate(0.35, 0.15, -0.25);
   leftEyeWhite.matrix.scale(0.12, 0.12, 0.05);
   leftEyeWhite.render();
   
   var rightEyeWhite = new Cube();
   rightEyeWhite.color = [1, 1, 1, 1];
   rightEyeWhite.matrix = headCoordMat;
   rightEyeWhite.matrix.translate(0.05, 0.15, -0.25);
   rightEyeWhite.matrix.scale(0.12, 0.12, 0.05);
   rightEyeWhite.render();
   
   // Eye pupils
   var leftEye = new Cube();
   leftEye.color = eyeColor;
   leftEye.matrix = headCoordMat;
   leftEye.matrix.translate(0.38, 0.18, -0.26);
   leftEye.matrix.scale(0.06, 0.06, 0.05);
   leftEye.render();
   
   var rightEye = new Cube();
   rightEye.color = eyeColor;
   rightEye.matrix = headCoordMat;
   rightEye.matrix.translate(0.08, 0.18, -0.26);
   rightEye.matrix.scale(0.06, 0.06, 0.05);
   rightEye.render();
}

function renderDogLegs(dogColor, bellyColor, pawColor, bodyCoordMatForLegs) {
   var legPositions = [
       {x: 0.2, z: 0.2, angle: 1, length: 1.0},    // Front Right
       {x: 0.8, z: 0.2, angle: -1, length: 1.0},   // Front Left
       {x: 0.2, z: 1.0, angle: -1, length: 0.9},   // Back Right
       {x: 0.8, z: 1.0, angle: 1, length: 0.9}     // Back Left
   ];
   
   legPositions.forEach((pos) => {
       // Upper leg - More muscular
       var upperLeg = new Cube();
       upperLeg.color = dogColor;
       upperLeg.matrix = bodyCoordMatForLegs;
       upperLeg.matrix.translate(pos.x, -0.2, pos.z);
       upperLeg.matrix.rotate(pos.angle * g_legAngle * 0.8, 1, 0, 0);
       var lowerLegMat = new Matrix4(upperLeg.matrix);
       upperLeg.matrix.scale(0.25, 0.45 * pos.length, 0.25);
       upperLeg.render();
       
       // Lower leg - Better joint definition
       var lowerLeg = new Cube();
       lowerLeg.color = dogColor;
       lowerLeg.matrix = lowerLegMat;
       lowerLeg.matrix.translate(0, -0.45, 0);
       lowerLeg.matrix.rotate(pos.angle * g_legAngle * 0.4, 1, 0, 0);
       var pawMat = new Matrix4(lowerLeg.matrix);
       lowerLeg.matrix.scale(0.2, 0.35 * pos.length, 0.2);
       lowerLeg.render();
       
       // Paw - More detailed
       var paw = new Cube();
       paw.color = pawColor;
       paw.matrix = pawMat;
       paw.matrix.translate(0, -0.35, 0);
       paw.matrix.scale(0.25, 0.12, 0.3);
       paw.render();
       
       // Paw pad
       var pawPad = new Cube();
       pawPad.color = pawColor;
       pawPad.matrix = pawMat;
       pawPad.matrix.translate(0, -0.38, 0.1);
       pawPad.matrix.scale(0.2, 0.05, 0.15);
       pawPad.render();
   });
}


function renderDogTail(dogColor, bodyCoordMatForTail) {
   // Tail base
   var tailBase = new Cube();
   tailBase.color = dogColor;
   tailBase.matrix = bodyCoordMatForTail;
   tailBase.matrix.translate(0.4, 0.3, 1.2);
   tailBase.matrix.rotate(30 + g_tailWag, 0, 1, 0);
   tailBase.matrix.rotate(45, 1, 0, 0);
   var tailTipMat = new Matrix4(tailBase.matrix);
   tailBase.matrix.scale(0.15, 0.15, 0.3);
   tailBase.render();
   
   // Tail tip
   var tailTip = new Cube();
   tailTip.color = dogColor;
   tailTip.matrix = tailTipMat;
   tailTip.matrix.translate(0, 0, 0.3);
   tailTip.matrix.rotate(g_tailWag * 1.5, 0, 1, 0);
   tailTip.matrix.scale(0.12, 0.12, 0.25);
   tailTip.render();
}

function updateAnimationAngles() {
   if(g_Animation) {
       g_seconds = performance.now()/1000.0 - g_startTime;
       
       // Smoother, more natural movements
       g_bodyAngle = 3 * Math.sin(g_seconds * 1.5);  // Gentler body sway
       g_tailWag = 35 * Math.sin(g_seconds * 6);     // More natural tail movement
       g_legAngle = 20 * Math.sin(g_seconds * 3);    // Smoother walking motion
       g_earFlop = 10 * Math.sin(g_seconds * 2);     // Subtle ear movement
       g_dogHoverLocation = 0.08 * Math.sin(g_seconds * 1.5); // Subtle body bounce
       g_breathe = 5 * Math.sin(g_seconds * 1.2);    // Natural breathing rhythm
       g_headTilt = 5 * Math.sin(g_seconds * 0.8);   // Occasional head tilts
   }
}