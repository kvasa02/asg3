var g_map = [];

function drawAllShapes() {
    // Colors
    var wool = [.62, .77, .64, 1.0];
    var skin = [1, .91, .65, 1.0];

    // Draw Sky ====================================
    var sky = new Cube();
    sky.color = [.6, .9, .95, 1];
    sky.textureNum = 1; 
    sky.matrix.scale(400, 400, 400); 
    sky.matrix.translate(-0.5, -0.5, -0.5);
    sky.render();

    // Draw Floor ====================================
    var floor = new Cube();
    floor.color = [.2, .9, .4, 1]; 
    floor.textureNum = 0; 
    floor.matrix.translate(0, -0.1, 0);
    floor.matrix.scale(100, 0.1, 100);
    floor.matrix.translate(-0.5, 0, -0.5);
    floor.render();
        

    // Body =====================================
    var body = new Cube();
    body.color = wool;
    body.textureNum = -2;
    body.matrix.rotate(170, 0, 1, 0);
    body.matrix.scale(0.25, 0.25, 0.35);
    body.matrix.translate(-0.5, 0, -0.25);
    body.renderfast();

    // Head =====================================
    var head = new Cube();
    head.color = wool;
    head.textureNum = -2;
    head.matrix.rotate(170, 0, 1, 0);
    head.matrix.rotate(-head_animation, 1, 0, 0);
    head.matrix.scale(0.35, 0.35, 0.35);
    head.matrix.translate(-0.5, 0.25, -1.25);
    head.renderfast();

    renderDogShapes();
}
