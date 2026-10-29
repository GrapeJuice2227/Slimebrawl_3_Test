//________________________________________________________________ Preload ________________________________________________________________
function preload() {
  textures = { ent: loadImage("textures/ent.png"), environments: loadImage("textures/environments.png") };
  sounds = { hop: loadSound("sounds/hop.mp3") };
  music = { default: loadSound("sounds/idlebob.mp3"), neonGrit: loadSound("sounds/neogrit.mp3") };
}

//________________________________ Variables

// Keys: <W E>  <I O> <C V> <Left Right>
var controlKeys = [{ left: 87, right: 69 }, { left: 73, right: 79 }, { left: 67, right: 86 }, { left: 37, right: 39 }];

var world = { zoom: 8, width: 16 * 16, height: 8 * 16, g: 0.5, airResistance: 0.02, groundFriction: 0.2 };
var game = { mode: "Menu", firstLoopOnMode: false, bombSpawnCooldown: 600, entityRepulsion: 1.2 };
var ballGame = { aScore: 0, bScore: 0, scoreCooldown: 0 };
var slime = { players: 4, xJump: 2.5, yJump: 6, chargeSpeed: 0.05, knockoutVelocity: 3, michCharge: 0.25, respawnSpeed: 0.005 };
// Save { players: 4, xJump: 2.5, yJump: 6.2, chargeSpeed: 0.05, knockoutVelocity: 2, michCharge: 0.2, respawnSpeed: 0.005 };

var presetSlime = {
  class: "Slime", type: 0, enabled: false, xVel: 0, yVel: 0, ledgeSlip: 0, xSpawn: 0, ySpawn: 4 * 16, charge: 0, radius: 7, deathTimer: 0,
  leftKey: 0, rightKey: 0, idleBob: -0.5, blink: 0, hat: 0, yHat: 0, hatVel: 0
};

var debug = false;
var pauseFrame = false;
var ballScore = { yellow: 0, blue: 0 }
var entities = [];
var blocks = [];


var hats = [
  { type: "" },
  { type: "Top Hat" },
  { type: "Cap" },
  { type: "Headphones", ofs: 6 },
  { type: "Beanie", ofs: 4, lock: 1 },
  { type: "Bucket Hat" },
  { type: "Staw Hat" },
  { type: "Cowboy", var: 1 },
  { type: "Goggles", var: 2, ofs: 2 },
  { type: "Hard Hat", var: 2, lock: 1 },
  { type: "Space", var: 2, ofs: 6, lock: 1 },
  { type: "Party" },
  { type: "Christmas", var: 1 },
  { type: "Halloween", ofs: 4, lock: 1 },
  { type: "Globe", var: 1, ofs: 6, lock: 1 },
  { type: "Fantasy", ofs: 4, lock: 1 },
  { type: "Floral", lock: 1 },
  { type: "Gem", lock: 1 },
  { type: "Breakfast", var: 3 },
  { type: "Autumnal", var: 2 },
  { type: "Sports", ofs: 4, lock: 1 }
];

//________________________________________________________________ Setup ________________________________________________________________
function setup() {
  testAtlas = loadImage("test.png");
  createCanvas();
}

//________________________________ Object Collision Function
function entityCollision(obj1, obj2) {
  if (obj1 != obj2) {
    distance = dist(obj1.x, obj1.y, obj2.x, obj2.y);
    if (distance != 0 && distance < (obj1.radius + obj2.radius)) {

      obj1.xVel += (obj1.x - obj2.x) / distance * game.entityRepulsion * (1 + 2 * obj1.onGround);

      if (obj1.class == "Ball") { obj1.yVel += (obj1.y - obj2.y) / distance * 8; }
      else { obj1.yVel += (obj1.y - obj2.y) / distance * game.entityRepulsion * 2; }

      // Knockout
      if (obj1.class == "Slime" && obj2.class == "Slime" && obj2.yVel > slime.knockoutVelocity && obj2.y < obj1.y) {
        if (obj1.stun) { obj1.kill = true; obj2.yVel = -6; } else { obj1.stun = 10 + obj2.yVel * 60; obj2.yVel = -4; }
      }
    }
  }
}

//________________________________ Object Physics Function
function entityPhysics(obj) {
  if (obj.xVel == null) { obj.xVel = 0; obj.yVel = 0; };
  obj.x += obj.xVel; obj.y += obj.yVel;

  obj.yVel += world.g;
  obj.xVel /= 1 + world.airResistance; obj.yVel /= 1 + world.airResistance;

  // Block Collision
  if (obj.ledgeSlip != 0 && obj.onGround == false) { obj.yVel = -8; }
  obj.onGround = false;
  obj.slipOffset = obj.ledgeSlip * obj.ledgeSlip * 50;
  obj.ledgeSlip = 0;
  stable = false;

  for (i2 = 0; i2 < blocks.length; i2++) {
    if (obj.x >= blocks[i2].x - obj.radius && obj.x < blocks[i2].x + blocks[i2].width + obj.radius &&
      obj.y >= blocks[i2].y - obj.radius) {

      if (obj.y - obj.yVel <= blocks[i2].y - obj.radius + obj.slipOffset) {
        obj.onGround = true;
        obj.y = blocks[i2].y - obj.radius + obj.slipOffset;

        // Ledge Slip
        if (obj.x < blocks[i2].x) { obj.ledgeSlip = (obj.x - blocks[i2].x) / 15; } else
          if (obj.x > blocks[i2].x + blocks[i2].width) { obj.ledgeSlip = (obj.x - blocks[i2].x - blocks[i2].width) / 20; }
          else { stable = true; }

        if (obj.class == "Ball") {
          obj.xVel /= 1 + world.groundFriction / 12; obj.yVel *= -0.8 * constrain(obj.yVel / 4, 0, 1);
          if (abs(obj.yVel) < 0.1) { obj.yVel = 0; }
        }
        else { obj.xVel /= 1 + world.groundFriction; obj.yVel *= abs(obj.ledgeSlip * 2); }

      } else if (blocks[i2].type != "Platform") {
        if (obj.xVel > 0) { obj.x = blocks[i2].x - obj.radius; } else if (obj.xVel < 0) { obj.x = blocks[i2].x + blocks[i2].width + obj.radius; }
        if (obj.class == "Ball") { obj.xVel *= -0.8; } else { obj.xVel /= 1.2; }
      }

    }
  }

  if (stable) { obj.ledgeSlip = 0; } else { obj.xVel += obj.ledgeSlip; }
  obj.slipOffset = 0;
}

//________________________________ Run Animation Function
function runAnimations() {
  for (i = 0; i < entities.length; i++) {
    e = entities[i];

    // Slime Animations
    if (random() < 0.3) { e.idleBob += 0.1; }
    if (e.idleBob >= 1.5) { e.idleBob = -0.49; }

    e.blink = constrain(e.blink - 0.05, 0, 1.5);
    if (random() < 0.002) { e.blink = random(1, 1.5); }

    if (e.charge != 0) { e.idleBob = -0.49; e.blink = 0; }


    // Hat
    if (e.hat < 0) { e.hat = hats.length - 1; } if (e.hat > hats.length - 1) { e.hat = 0; }
    if (hats[e.hat].lock) { e.yHat = e.y; } else {
      e.yHat = constrain(e.yHat + e.hatVel, e.y - 32, e.y);
      if (e.yHat == e.y) { e.hatVel = 0; } else { e.hatVel += world.g / 2; }
    }
  }
}

//________________________________ Spawn Block Function
function block(x, y, width, height, type) {
  blocks.push({ x: x * 16, y: y * 16, width: width * 16, height: height * 16, type: type });
}

//________________________________ Spawn Starting Entities
for (i = 0; i < slime.players; i++) {
  var newSlime = { ...presetSlime };
  newSlime.type = i;
  newSlime.xSpawn = (2.5 + i) * 32; newSlime.x = newSlime.xSpawn; newSlime.y = newSlime.ySpawn;
  newSlime.leftKey = controlKeys[newSlime.type].left; newSlime.rightKey = controlKeys[newSlime.type].right;
  if (i == 0) { newSlime.enabled = true; }
  entities.push(newSlime);
}

if (game.mode == "Ball") {
  var newBall = { class: "Ball", x: world.width / 2, y: 0, radius: 6 };
  entities.push(newBall);
}

//________________________________________________________________ Run ________________________________________________________________
function run() {

  //________________________________ Blocks
  if (blocks.length == 0) {
    if (game.mode == "Ball") {
      block(2, 7, 12, 1); block(0, 8, 16, 1);
      block(-1, 0, 1, 8); block(16, 0, 1, 8);
    } else {
      elevation = -1;
      block(1, 8 + elevation, 14, 1); block(6, 7 + elevation, 4, 1);
      block(0, 6 + elevation, 3, 1, "Platform"); block(13, 6 + elevation, 3, 1, "Platform");
    }
  }

  //________________________________ Entities

  // Spawn Bombs
  if (game.bombSpawnCooldown <= 0) {
    var newBomb = { class: "Bomb", x: random(3, 13) * 16, y: -16, radius: 6, fuse: 0.1, burn: 0, exploding: false, blastPressure: 120, blastRadius: 48 };
    entities.push(newBomb);
    game.bombSpawnCooldown = random(200, 1200);
  }

  //________________ Run
  for (i = 0; i < entities.length; i++) {
    e = entities[i];
    if (e.class == "Slime" && e.enabled == false) { entities.splice(i, 1); }

    //________________ Slimes
    if (e.class == "Slime") {

      // Jump Controls

      if (e.onGround) {
        if (keyIsDown(e.leftKey) || keyIsDown(e.rightKey)) {
          if (keyIsDown(e.leftKey)) { e.charge = constrain(e.charge - slime.chargeSpeed, -1, -slime.michCharge); };
          if (keyIsDown(e.rightKey)) { e.charge = constrain(e.charge + slime.chargeSpeed, slime.michCharge, 1); };
          if (e.stun) { e.charge = constrain(e.charge, -0.5, 0.5) }
        } else if (e.charge != 0) {
          e.xVel += slime.xJump * constrain(e.charge * 4, -1, 1);
          e.yVel -= slime.yJump * abs(e.charge);
          r = 1; if (i == 1) { r = 0.4; }; if (i == 3) { r = 1.6; };
          sounds.hop.setVolume(1.5); sounds.hop.rate(r + abs(e.charge / 4)); sounds.hop.play();
        }
      } else { e.charge = 0; if (keyIsDown(e.leftKey)) { e.xVel -= 0.05; } if (keyIsDown(e.rightKey)) { e.xVel += 0.05; } }
    }

    //________________ Ball
    if (e.class == "Ball") {
      if (e.y > 7.5 * 16) {
        if (e.x > world.width / 2 - 64) { ballGame.aScore++; }
        if (e.x < world.width / 2 + 64) { ballGame.bScore++; }
        console.log("Y" + ballScore.yellow + " B" + ballScore.blue);
        e.y = 0; e.x = world.width / 2;
      }
    }

    //________________ Bombs
    if (e.class == "Bomb") {
      e.burn += e.fuse / 10;
      if (e.burn >= 1) {
        e.burn = 0; e.fuse += 0.1;
        if (e.exploding) { e.kill = true; }
      }

      // Explosion Collision
      if (e.fuse > 0.99) {
        e.burn -= e.burn / 12;
        if (e.exploding == false) {
          for (i2 = 0; i2 < entities.length; i2++) {
            distance = dist(e.x, e.y, entities[i2].x, entities[i2].y);
            if (i != i2 && entities[i2].exploding != true && distance < e.blastRadius) {
              entities[i2].xVel += (entities[i2].x - e.x) / distance / distance * e.blastPressure;
              entities[i2].yVel += (entities[i2].y - e.y - 8) / distance / distance * e.blastPressure;
            }
          }
        }
        e.exploding = true;
      }
    }

    // Physics and Collision
    entityPhysics(e);
    for (i2 = 0; i2 < entities.length; i2++) { entityCollision(e, entities[i2]); }
    e.stun = constrain(e.stun - 1, 0, Infinity);

    // Despawn and Kill
    if (e.class == "Slime") {
      if (e.dead) {
        e.y = -128;
        e.deathTimer += slime.respawnSpeed;
        if (e.deathTimer >= 1) {
          e.x = e.xSpawn; e.y = e.ySpawn; e.xVel = 0; e.yVel = 0;
          e.kill = false; e.stun = 0; e.dead = false;
        }
      } else { e.deathTimer -= e.deathTimer / 4; }
    }


    if (e.kill || e.y > 16 * 16) {
      if (e.class == "Slime") { e.dead = true; }
      else { entities.splice(i, 1); }
    }
  }
}

//________________________________________________________________ Render ________________________________________________________________
function render() {
  resizeCanvas(windowWidth, windowHeight);
  background(0); noSmooth();
  translate((windowWidth - world.width * world.zoom) / 2, (windowHeight - world.height * world.zoom) / 2);
  scale(world.zoom, world.zoom);

  //________________________________ Blocks
  fill(150, 200, 255); noStroke(); rect(0, 0, world.width, world.height);
  for (i = 0; i < blocks.length; i++) { b = blocks[i]; fill(255); rect(b.x, b.y - 8, b.width, 8); }
  for (i = 0; i < blocks.length; i++) {
    b = blocks[i]; height = b.height; if (b.type == "Platform") { height = 4; }
    fill(100); rect(b.x, b.y, b.width, height);
  }

  //________________________________ Entities
  for (i = 0; i < entities.length; i++) {
    e = entities[i];

    //________________ Slimes
    if (e.class == "Slime") {
      squash = (2 + round(abs(e.charge * 2) - 0.5) - round(e.idleBob));
      if (e.onGround == false || e.ledgeSlip) { squash = 0; }

      if (e.enabled == false) { tint(63); }

      // Slime
      push(); translate(round(e.x), round(e.y - 2));
      image(textures.ent, -8, -8, 16, 16, e.type * 16, squash * 16, 16, 16);

      // Eyes
      stunSpin = 12;
      if (e.stun / (stunSpin * 2) - round(e.stun / (stunSpin * 2) - 0.5) < 0.5) { scale(-1, 1); }

      v = (11 + round(abs(e.charge * 2)) - round(e.blink));
      vHat = v;
      if (e.ledgeSlip != 0) { v = 14; }
      if (e.stun) { v = 15; }
      image(textures.ent, round(e.xVel / 2 - 8), round(-e.yVel / 2 - e.idleBob), 16, 8,
        e.type * 16, v * 8, 16, 8);
      pop();

      // Hat
      if (e.hat && hats[e.hat] != null) {
        push(); translate(round(e.x - constrain(e.xVel * (e.y - e.yHat) / 6, -8, 8)), round(e.yHat));
        vHat = 0; setHat = hats[e.hat];
        if (setHat.var) { vHat = e.type - round(e.type / setHat.var - 0.5) * setHat.var; } else { setHat.var = 4; }
        if (setHat.ofs == null) { setHat.ofs = 0; }
        if (v >= 14) { v = 11; }
        image(textures.ent, -8, -27 + v + setHat.ofs - round(e.idleBob), 16, 16, (4 + vHat) * 16, (e.hat - 1) * 16, 16, 16);
        pop();
      }

      // Stun Stars
      if (e.stun) {
        push(); translate(round(e.x), round(e.y - 8));
        v = e.stun / stunSpin - round(e.stun / stunSpin - 0.5);
        if (e.stun / (stunSpin * 2) - round(e.stun / (stunSpin * 2) - 0.5) < 0.5) { scale(-1, 1); }
        image(textures.ent, -8, -8, 16, 16, 10 * 16, round(v) * 16, 16, 16);
        pop();
      }

      noTint();
    } else {

      push(); translate(round(e.x), round(e.y - 3));

      //________________ Ball
      if (e.class == "Ball") {
        sx = 16; sy = e.x / 4 - round(e.x / 4 / 3) * 3;
        if (e.yVel < -2) { sy = -2; }
        image(textures.ent, -8, -7, 16, 16, sx * 16, round(sy + 2) * 16, 16, 16);
      }

      //________________ Bombs
      if (e.class == "Bomb") {
        sx = 17; sy = 0;
        if (e.exploding) { image(textures.ent, -24, -24, 48, 48, sx * 16, (sy + 1) * 16 + round(e.burn * 3) * 48, 48, 48); } else {
          image(textures.ent, -8, -8, 16, 16, round(sx + e.fuse * e.burn * 2.5 + 0.25) * 16, sy * 16, 16, 16);
        }
      }
      pop();
    }
  }

  //________________________________ Drop Pipes
  if (game.mode != "Menu") {
    for (i = 0; i < entities.length; i++) {
      e = entities[i];
      if (e.class == "Slime") {
        sx = 0; sy = 8; t = 1 - e.deathTimer;
        push(); translate(e.xSpawn, 16 + 16 - round(t * t * 16));
        image(textures.ent, -16, -16, 32, 32, sx * 16, sy * 16, 32, 32);
        sx = 2; image(textures.ent, -16, 7, 32, 8, sx * 16, sy * 16 + e.type * 8, 32, 8);
        pop();
      }
    }
  }
}

//________________________________________________________________ Main Menu ________________________________________________________________
function mainMenu() {

  // Player Select
  for (i = 0; i < 4; i++) {
    width = 2 * 16; x = (4 * 16) + width * i;
    if (mouseX / world.zoom >= x && mouseX / world.zoom < x + width) {
      fill(255, 255, 255, 63); noStroke(); rect(x, 0, width - 1, world.width);
      if (mouseIsPressed) { entities[i].enabled = true; }
    }
  }
}

//________________________________________________________________ Debug Render ________________________________________________________________
function debugRender() {
  background(0, 0, 0, 127); strokeWeight(0.5); textSize(2.5);

  // Blocks
  for (i = 0; i < blocks.length; i++) {
    noFill(); stroke(127); if (blocks[i].type == "Platform") { stroke(255, 127, 0); }
    rect(blocks[i].x, blocks[i].y, blocks[i].width, blocks[i].height);

    debugText = "Block " + i;
    fill(255); noStroke(); text(debugText, blocks[i].x, blocks[i].y + 2);
  }

  // Entities
  for (i = 0; i < entities.length; i++) {
    e = entities[i];
    push(); translate(e.x, e.y);
    debugColor = color(255, 255, 0); if (entities[i].class == "Slime") { debugColor = color(255); }
    noFill(); stroke(debugColor); ellipse(0, 0, e.radius * 2); line(0, 0, e.xVel * 4, e.yVel * 4);

    debugText = e.class + " " + i; if (e.hat) { debugText += " " + hats[e.hat].type; }
    debugText += "\nx" + round(e.xVel * 100) / 100 + " y" + round(e.yVel * 100) / 100;
    if (e.onGround) { debugText += "\nOn Ground"; }
    fill(debugColor); noStroke(); text(debugText, -e.radius * 2, -e.radius * 2);

    pop();
  }

  // Data
  debugText = "Frames " + frameCount + " - Rate " + round(frameRate());
  debugText += "\nEntities " + entities.length
  fill(255); noStroke(); text(debugText, 0, 20);
  textSize(5); text("- Debugging -", 0, 16);
}

//________________________________ Key Pressed
function keyPressed() {
  if (key == "`") { debug = !debug; }
  if (key == "q") { pauseFrame = !pauseFrame; }
  if (key == "=") { for (i = 0; i < entities.length; i++) { entities[i].hat++; } }
  if (key == "-") { for (i = 0; i < entities.length; i++) { entities[i].hat--; } }
  if (key == ".") { run(); }

  if (key == " ") { if (game.mode == "Menu") { game.mode = "Brawl" } else game.mode = "Menu" }


  // Hat Select
  if (game.mode == "Menu") {
    for (i = 0; i < entities.length; i++) {
      e = entities[i];
      if (keyCode == e.leftKey) { e.hat--; }
      if (keyCode == e.rightKey) { e.hat++; }
    }
  }
}

//________________________________________________________________ Draw ________________________________________________________________
previousMode = "";
function draw() {
  if (game.mode != previousMode) { game.firstLoopOnMode = true; } else { game.firstLoopOnMode = false; }
  previousMode = game.mode;

  // Music
  if (music.default.isPlaying() == false && music.neonGrit.isPlaying() == false) {
    setSong = round(random(0, 1))

    if (setSong == 0) {
      music.default.setVolume(0.5);
      music.default.play();
    }
    if (setSong == 1) {
      music.neonGrit.setVolume(0.5);
      music.neonGrit.play();
    }
  }

  render();
  if (pauseFrame == false) {
    runAnimations();
    if (game.mode == "Menu") { mainMenu(); }
    else { run(); }
  }

  if (debug) { debugRender(); }
}