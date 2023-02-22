//VARIABLES
var WIDTH = 4;
var HEIGHT = 4;
var DEPTH = 8;
var FOCUS = 0;
var SIZE = 8;
var SCALE = 1;
var BACKGROUNDCOLOR = "cyan";
var FOGTHICKNESS = 1;
var COLLISIONSIZE = .99;

//Create canvas
var canvas = document.createElement("canvas");
document.body.appendChild(canvas);
var screen = canvas.getContext("2d");
var SPRITES = new Image();
SPRITES.src = "sprites.png"
var SHADOWS = new Image();
SHADOWS.src = "shadows.png"
var layers = []; //Stores a list of layer, each layer is a list of sprites

//Create objects
function vector(x,y,z) { //Store x,y,z coords
  this.x = x;
  this.y = y;
  this.z = z;
  this.add = function(that) {
    this.x += that.x;
    this.y += that.y;
    this.z += that.z;
    return this;
  }
  this.subtract = function(that) {
    this.x -= that.x;
    this.y -= that.y;
    this.z -= that.z;
    return this;
  }
  this.set = function(x,y,z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  this.distance = function(that) {
    return Math.sqrt(Math.pow(that.x-this.x,2)+Math.pow(that.y-this.y,2)+Math.pow(that.z-this.z,2));
  }
}

function vector2(x,y) { //Stores x,y coords
  this.x = x;
  this.y = y;
  this.equals = function(that) {
    if (this.x == that.x && this.y == that.y) {
      return true;
    } else {
      return false;
    }
  }
}

function sprite(pos, src) { //Image with a 3D position
  this.pos = pos;
  this.src = src;
  this.layer = this.pos.z;
  this.updateLayers = function() {
    if (this.layer != this.pos.z) { //Layer changed
      var curLayer = layers[this.layer];
      curLayer.splice(curLayer.indexOf(this),1); //Remove from old layer
    }
    while (layers.length < this.pos.z+1) {
      layers.push([]); //Expand layers to support this depth
    }
    if (layers[this.pos.z].indexOf(this) == -1) {
      layers[this.pos.z].push(this); //Add to proper layer
    }
    this.layer = this.pos.z;
  }
  this.updateLayers();
  this.move = function(distance) { //Adds a vector to the pos
    this.pos.add(distance);
    if (this.pos.z < 0) {
      this.pos.z = 0;
    }
    if (this.pos.z > DEPTH-1) {
      this.pos.z = DEPTH-1;
    }
    this.updateLayers();
  }
  this.position = function(target) { //Changes the pos
    this.pos.x = target.x;
    this.pos.y = target.y;
    this.pos.z = target.z;
    if (this.pos.z < 0) {
      this.pos.z = 0;
    }
    if (this.pos.z > DEPTH-1) {
      this.pos.z = DEPTH-1;
    }    
    this.updateLayers();
  }
  this.collisions = function() { //Returns sprites the sprite is touching
    var hits = checkPosition(this.pos);
    if (hits[0] == this) {
      hits.splice(hits.indexOf(this),1);
    }
    return hits;
  }
  this.canMove = function(distance) { //Returns if a space is free
    var hits = checkPosition(new vector(this.pos.x+distance.x, this.pos.y+distance.y, this.pos.z+distance.z));
    if (hits[0] == this) {
      hits.splice(hits.indexOf(this),1);
    }
    if (hits.length < 1) {
      return true;
    } else {
      return false;
    }
  }
  this.tryMove = function(distance) { //Moves if space is free
    var moved = false;
    if (this.canMove(new vector(distance.x,0,0)) && distance.x != 0) {
      this.move(new vector(distance.x,0,0));
      moved = true;
    }
    if (this.canMove(new vector(0,distance.y,0)) && distance.y != 0) {
      this.move(new vector(0,distance.y,0));
      moved = true;
    }
    if (this.canMove(new vector(0,0,distance.z)) && distance.z != 0) {
      this.move(new vector(0,0,distance.z));
      moved = true;
    }
    return moved;
  }
  this.lerp = function(distance, attempts) {
    for (var i=0;i<attempts;i++) {
      this.tryMove(new vector(distance.x/attempts,distance.y/attempts,distance.z/attempts));
    }
  }
  this.remove = function() {
    layers[this.pos.z].splice(layers[this.pos.z].indexOf(this),1);
  }
}

//Create functions
function resize(w,h) {
  canvas.width = w*SIZE*SCALE;
  canvas.height = h*SIZE*SCALE;
}

function render(start, end) { //Draws sprites within a region
  screen.imageSmoothingEnabled = false;  
  screen.globalAlpha=1;
  screen.fillStyle = BACKGROUNDCOLOR;
  screen.fillRect(0,0,canvas.width,canvas.height);
  if (end.z > layers.length) {
    end.z = layers.length;
  }
  for (var z=start.z;z<end.z;z++) {
    if (layers[z]) {
      for (var s=0;s<layers[z].length;s++) {
        var spr = layers[z][s];
        if (spr.pos.x >= start.x && spr.pos.x < end.x && spr.pos.y >= start.y-1 && spr.pos.y < end.y) {
          var sprSize = calculateSize(z);
          var sprOffset = calculateOffset(z);
          var adjustedSprPos = new vector(spr.pos.x-start.x, spr.pos.y-start.y, spr.pos.z-start.z)
          var sprPos = calculatePosition(adjustedSprPos, sprSize, sprOffset);
          var depthPos = calculatePosition(new vector(spr.pos.x, spr.pos.y, z-1), calculateSize(z-1), calculateOffset(z-1));
          screen.globalAlpha=1;
          screen.drawImage(SPRITES, 
          spr.src.x*SIZE, spr.src.y*SIZE, 
          SIZE, SIZE, 
          sprPos.x, sprPos.y,
          sprSize*SCALE, sprSize*SCALE); //Render sprite
          screen.globalAlpha=0*FOGTHICKNESS;
          screen.drawImage(SHADOWS, 
          spr.src.x*SIZE, spr.src.y*SIZE, 
          SIZE, SIZE, 
          sprPos.x, sprPos.y,
          sprSize*SCALE, sprSize*SCALE); //Render sprite
        }
      }
    }
  }
}

function checkPosition(pos) { //Checks for all sprites in a pos
  var hits = [];
  if (layers[pos.z]) {
    for (var s=0;s<layers[pos.z].length;s++) {
      var that = layers[pos.z][s];
      if (!(that.pos.x > pos.x+COLLISIONSIZE || that.pos.x+COLLISIONSIZE < pos.x || that.pos.y > pos.y+COLLISIONSIZE || that.pos.y+COLLISIONSIZE < pos.y)) {
        hits.push(that);
      }
    }
  }
  return hits;
}

function calculateSize(z) {
  return [SIZE+SIZE*(z-FOCUS)*(.25/(layers.length))];
}

function calculateOffset(z) {
  return new vector2((z-FOCUS)*-SIZE/2,(z-FOCUS)*SIZE/4);
}

function calculatePosition(vector, sprSize, sprOffset) {
  return new vector2((vector.x*sprSize+sprOffset.x)*SCALE, (vector.y*sprSize+sprOffset.y)*SCALE);  
}

function line(x,y,dX,dY) {
  screen.beginPath();
  screen.moveTo(x,y);
  screen.lineTo(dX,dY);
  screen.stroke();  
}

function skewedImage(src,pos,size,slope) {
  for (var y=0;y<SIZE-1;y++) {
    screen.drawImage(SPRITES, 
    src.x*SIZE, src.y*SIZE+y, 
    SIZE, 1,
    pos.x+slope*y, pos.y+y*SCALE,
    size*SCALE, SCALE); //Render sprite
  }
}
//End of 3DR

//Start of 3D Pocketblocks
//Small = 16, 24
//Classic = 24, 32
//Large = 40, 48
WIDTH = 12;
HEIGHT = 12;
DEPTH = 1;
var ACCURACY = 32;
var FPS = 15;
var DAYLENGTH = 480;
var NIGHTALPHA = .5;
var HEIGHTMAP;
var OREMAPS;
var BLOCKS = [
  new vector2(0,0), //0 Grass
  new vector2(1,0), //1 Dirt
  new vector2(2,0), //2 Stone
  new vector2(3,0), //3 Lava
  new vector2(4,0), //4 Sand
  new vector2(5,0), //5 Snow
  new vector2(1,2), //6 Tree
  new vector2(2,2), //7 Snowman
  new vector2(3,2), //8 Cactus
  new vector2(4,2), //9 Mushroom
  new vector2(0,1), //10 Copper
  new vector2(1,1), //11 Iron
  new vector2(2,1), //12 Gold
  new vector2(0,3), //13 Pickaxe
  new vector2(1,3), //14 Health Potion
  new vector2(3,1), //15 Coal
  new vector2(5,2), //16 Torch
  new vector2(6,0), //17 Glass
  new vector2(0,5), //18 Voidite
  new vector2(1,5), //19 Voidite Soil
  new vector2(2,5), //20 Kauru
  new vector2(3,5), //21 Void Fog
  new vector2(4,5), //22 Sparkulite
  new vector2(6,2), //23 Campfire
  new vector2(3,1), //24 Drill
];
var BLOCKHARDNESS = [
  1, //0 Grass
  .8, //1 Dirt
  2, //2 Stone
  NaN, //3 Lava
  .4, //4 Sand
  .3, //5 Snow
  1.5, //6 Tree
  .2, //7 Snowman
  1, //8 Cactus
  .1, //9 Mushroom
  2.3, //10 Copper
  3, //11 Iron
  1.8, //12 Gold
  0, //13 Pickaxe
  0, //14 Health Potion
  1.9, //15 Coal
  .1, //16 Torch
  .2, //17 Glass
  4, //18 Voidite
  2, //19 Voidite Soil
  4, //20 Kauru
  NaN, //21 Void Fog
  2.5, //22 Sparkulite
  .3, //23 Campfire
  0, //24 Drill
];
var BLOCKSOUNDS = [
  "powerUp.wav",
  "powerUp(1).wav",
  "hitHurt.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
  "powerUp.wav",
];
var MOBS = [
  [new vector2(0,4), new vector2(1,4)], //-1 Angry Snowman
  [new vector2(2,4), new vector2(3,4)], //-2 Ant
  [new vector2(0,4), new vector2(1,4)], //-3 Zombie
];
var BIOMENOISE = [
  [.3, .1, HEIGHT*.38, HEIGHT*.55], //Tundra
  [.6, .3, HEIGHT*.45, HEIGHT*.85], //Mountain
  [.2, .2, HEIGHT*.35, HEIGHT*.6], //Forest 
  [.8, .8, HEIGHT*.35, HEIGHT*.7], //Mushroom
  [.1, .25, HEIGHT*.3, HEIGHT*.65], //Desert
  [.7, .6, HEIGHT*.37, HEIGHT*.75], //Volcano
  [.2, .1, HEIGHT*.3, HEIGHT*.55], //Void
  [.1, .2, HEIGHT*.1, HEIGHT*.4], //Void top
]
var BIOMETREES = [
  [.05, 7, 3], //Tundra Snowmen
  [.1, 6, 9], //Mountain Trees
  [.25, 6, 5], //Forest Trees
  [.3, 9, 16], //Mushroom Mushrooms
  [.15, 8, 4], //Desert Cacti
  [.2, 8, 1], //Volcano Cacti
  0, 
  0
];
var RECIPES = [
  [6,[[11,4]],13], //Tree + 4 Iron = Pickaxe
  [6,[[15,2]],16], //Tree + 2 Coal = Torch
  [16,[[4,1]],17], //Torch + Sand = Glass
  [17,[[9,6]],14], //Glass + 6 Mushrooms = Health Potion
  [16,[[16,2]],23], //Torch + 2 Torches = Campfire
  [23,[[7,1],[8,1]],-1], //Campfire + Snowman + Cactus = Angry Snowman
  [23,[[8,1],[1,1]],-1], //Campfire + Cactus + Snowman = Angry Snowman
  [12,[[10,3],[11,7]],24] //Gold + 3 Copper + 7 Iron = Drill
];
var NORMALORES = [
  [10, [1,.6,10,100], 65, 5], //Copper 1.6
  [11, [.8,.5,10,100], 60, 2], //Iron 1.3
  [12, [.7,1,10,100], 70, 10], //Gold 1.7
  [15, [.5,.7,10,100], 55, 1], //Coal 1.2
];
var VOIDORES = [
  [22, [.8,.6,10,100], 75, 2], //Sparkulite 1.4
  [19, [.4,.4,10,100], 60, 10], //Voidite Soil .8
  [20, [.5,.7,10,100], 65, 1], //Kauru 1.2
  [21, [.3,.2,10,100], 65, 5], //Void Fog .8
];
var ORENOISE = [
  NORMALORES, //Tundra
  NORMALORES, //Mountain
  NORMALORES, //Forest
  NORMALORES, //Mushroom
  NORMALORES, //Desert
  NORMALORES, //Volcano
  VOIDORES, //Void
  VOIDORES, //Void top
];
var tick = 0;
var dayNight = true;
var chunks = [];
var chunksTemps = [];
var mobs = [];
var allSprites = [];
var allObjects = [];
var startTemp = 50;
var chunk = 0;
var player = new object(new sprite(new vector(5,1,DEPTH-1), new vector2(0,2)));
var lastDir = new vector(0,1,0);
var inventory = player.storing;
inventory.push([6,1]);
var p = player.pos;
var G = .005;
var walkSpeed = .25;
var jumpPower = .4;
var terminalVelocity = .8;
var keys = [];
var keyTicks = [];
var breakingProgress = 0;
var lastKey = [0];
var doubleKeyTime = .3;
var dimension = 0;

//Loop
window.onload = function() {
  generateTerrain();
  screen.imageSmoothingEnabled = false;
  centerPlayer();
  setInterval(function() {
    player.physics();
    mobAi();
    changeChunk();
    SCALE = (window.innerHeight-20)/(SIZE*HEIGHT); //Adjust screen size
    CAMERA = new vector(WIDTH,p.y,DEPTH*2);
    resize(WIDTH,HEIGHT);
    if (dimension == 0) {
      dayNightCycle();
    }
    render(new vector(0,0,0), new vector(WIDTH,HEIGHT,DEPTH));
    renderGuis();
    heightMap();
    layers = chunks[chunk];
    tick++;
  }, 1000/FPS)
;}

//Controls
//Keydown
var placing = false;
document.addEventListener("keydown", function(){
  var key = event.keyCode;
  if (keys.indexOf(key) == -1) {
    keys.push(key); //Remember this held key
    keyTicks.push(tick-1);
  }
  var keyIndex = keys.indexOf(key);
  //Left and right
  if (key == 65 && keys.indexOf(16) == -1) { //A
    player.vel.x = -walkSpeed;
  }
  if (key == 68 && keys.indexOf(16) == -1) { //D
    player.vel.x = walkSpeed;
  }
  breakingProgress = 0; //Reset breaking indicator
  lastDir.set(0,1,0);
  //Digging
  if (key == 87) { //W
    lastDir.set(0,-1,0);
    dig(new vector(0,-1,0), keyTicks[keyIndex]);
  }
  if (key == 83) { //S
    lastDir.set(0,1,0);
    dig(new vector(0,1,0),keyTicks[keyIndex]);
  }
  if (key == 65) { //A
    lastDir.set(-1,0,0);
    dig(new vector(-1,0,0),keyTicks[keyIndex]);
  }
  if (key == 68) { //D
    lastDir.set(1,0,0);
    dig(new vector(1,0,0),keyTicks[keyIndex]);
  }
  if (key == 81) { //Q
    lastDir.set(0,0,-1);
    dig(new vector(0,-.5,-1),keyTicks[keyIndex]);
  }
  if (key == 69) { //E
    lastDir.set(0,0,1);  
    dig(new vector(0,-.5,1),keyTicks[keyIndex]);
  }
  if (key == 74) { //B button
    placing = true;
  }
  if (key == 77) { //M to summon Zombie
    new object(new sprite(new vector(WIDTH-2,p.y,p.z), new vector2(0,0)), -2);    
  }
  function dig(dir,startTick) {
    var hits = checkPosition(new vector(Math.round(p.x+dir.x),Math.round(p.y+dir.y),Math.round(p.z+dir.z)));
    var time = (tick-startTick)/FPS;
    if (hits.length < 1) {
      keyTicks[keyIndex] = tick; //Reset key hold, no hits
    }
    for (var i=0;i<hits.length;i++) {
      var endTime = getHardness(hits[i]);
      breakingProgress = Math.round(time/endTime*100);
      if (!breakingProgress || breakingProgress > 100) {
        breakingProgress = "0";
      } else if (breakingProgress < 75) {
        var mine = new Audio(BLOCKSOUNDS[getObjFromSpr(hits[i]).id]);
        mine.play();
      }
      //Set breaking indicator
      if (endTime <= time) {
        var layer = layers[p.z+dir.z];
        var block = hits[i];
        var blockObj = getObjFromSpr(block);
        var blockInv = blockObj.storing;
        for (var b=0;b<blockInv.length;b++) { //Loop through the block's inventory
          var entry = blockInv[b];
          if (entry) {
            for (var c=0;c<entry[1];c++) {
              addToInventory(entry[0], inventory); //Add blocks to player's inventory
            }
          }
        }
        for (var b=0;b<blockInv.length;b++) { //Loop through the block's inventory again
          var entry = blockInv[b];
          if (entry) {
            for (var c=0;c<entry[1];c++) {
              useInInventory(entry[0], blockInv); //Remove blocks from block inventory
            }
          }
        }
        block.remove(); //Delete block
        var above = checkPosition(new vector(Math.round(block.pos.x+block.pos.x-p.x),Math.round(block.pos.y+block.pos.y-p.y),Math.round(block.pos.z+block.pos.z-p.z)));
        for (var i=0;i<above.length;i++) {
          above[i].pos.y += 1;
        }
        addToInventory(blockObj.id, inventory); //Add to inventory
        keyTicks[keyIndex] = tick; //Reset key hold
      }
    }
  }  
  //Block placement
  function place(dir) {
    var dirPos = new vector(Math.round(p.x+dir.x), Math.round(p.y+dir.y), Math.round(p.z+dir.z));
    if (inventory.length > 0) {
      if (inventory[0][0] == 14) { //Health Potion
        player.health = player.maxHealth;
      }
      if (checkPosition(dirPos).length < 1) { //Place block in air
        new object(new sprite(dirPos, new vector2(0,0)), inventory[0][0]);
        useInInventory(inventory[0][0],inventory);
      } else { //Place block inside another
        var hit = checkPosition(dirPos)[0];
        var hitObj = getObjFromSpr(hit);
        for (var r=0;r<RECIPES.length;r++) { //Crafting recipes
          var recipe = RECIPES[r];
          var hitId = hitObj.id;
          var base = recipe[0];
          var inv = recipe[1];
          var result = recipe[2];
          if (hitId == base) { //Correct base
            addToInventory(inventory[0][0], hitObj.storing); //Put a block in another's inventory
            useInInventory(inventory[0][0],inventory);
            if (hitObj.storing.toString() == inv.toString()) { //Correct recipe
              hitObj.id = result; //New id
              if (result < 0) {
                result = -result-1;
                mobs.push(hitObj); //Summon mob
              } else {
                hit.src = BLOCKS[result]; //New spr
              }
              hitObj.storing = []; //Clear inv
            }
          }
        }
      }
    }
  }  
  if (placing) {
    var itemID = inventory[0][0];
    if (BLOCKHARDNESS[itemID] > 0) {
      place(lastDir); //Place block
    } else { //Item
      if (itemID == 24) { //Drill
        var hit = checkPosition(dir.add(p))[0];
        if (getHardness(hit)) {
          hit.remove();
        }
      }
    }
  }
})

//Keyup
document.addEventListener("keyup", function(){
  var key = event.keyCode;
  var keyIndex = keys.indexOf(key);
  var doubleTap = false;
  if ((tick-lastKey[0])/FPS < doubleKeyTime && key == lastKey[1]) {
    doubleTap = true; //Double tapped key
  }
  lastKey = [tick, key]; //Reset double key timer
  if (key == 74) { //B button
    placing = false;
  }  
  //Cancelling l/r
  if (key == 65 && player.vel.x == -walkSpeed) {
    player.vel.x = 0;
  }
  if (key == 68 && player.vel.x == walkSpeed) {
    player.vel.x = 0;
  }
  //Jumping
  if (key == 75 && !player.airborne) {
    player.vel.y = -jumpPower;
  }
  //Forward and back
  if (key == 81 && keys.indexOf(16) == -1) { //Q
    player.spr.tryMove(new vector(0,0,-1));
  }
  if (key == 69 && keys.indexOf(16) == -1) { //E
    player.spr.tryMove(new vector(0,0,1));
  }
  //Cycling through the inventory
  if (key == 70) {
    var item = inventory[0];
    inventory.splice(0,1); //Remove first item
    inventory.push(item); //Move it to the end
  }
  if (key == 188) {
    p.x = -1;
    p.y = 0;
    changeChunk();
    centerPlayer();
  }
  if (key == 190) {
    p.x = WIDTH;
    p.y = 0;
    changeChunk();
    centerPlayer();    
  }
  keys.splice(keyIndex, 1); //Release key
  keyTicks.splice(keyIndex, 1);  
})

//Objects
function object(spr, id) {
  this.spr = spr;
  this.pos = this.spr.pos;
  this.vel = new vector(0,0,0);
  this.accel = new vector(0,0,0);
  this.airborne = false;
  this.id = id;
  this.storing = [];
  this.health = 100;
  this.maxHealth = 100;
  if (this.id && this.id >= 0) { //Set block id sprites
    this.spr.src = BLOCKS[this.id];
  } else if (this.id) { //Set mob id sprites
    mobs.push(this);
    this.spr.src = MOBS[-this.id-1][0];
  }
  allSprites.push(spr);
  allObjects.push(this);
  this.physics = function() {
    var pos = this.spr.pos;
    if (this.spr.canMove(new vector(0,1/ACCURACY,0))) { //In the air
      this.accel.add(new vector(0,G,0));
      this.airborne = true;
    } else { //Hit the ground
      this.accel.y = 0;
      if (this.airborne) {
        this.vel.y = 0;
      }
      this.airborne = false;
    }
    if (!this.spr.canMove(new vector(0,-1/ACCURACY,0))) { //Block above player
      if (this.vel.y < 0) {
        this.vel.y = 0;
      }
    }
    this.vel.add(this.accel);
    if (this.vel.y > terminalVelocity) {
      this.vel.y = terminalVelocity;
    }    
    this.spr.lerp(this.vel, ACCURACY);
    var attempts = 0;
    while (this.spr.collisions().length > 0) { //Stuck inside a block
      if (attempts < 4*ACCURACY) {
        if (p.x-lastDir.x < 0 || p.x-lastDir.x > WIDTH-1) {
          lastDir = new vector(0,1,0);
        }
        this.spr.move(new vector(-lastDir.x/ACCURACY,-lastDir.y/ACCURACY,-lastDir.z)); //Push out from last dir
      } else {
        this.spr.move(new vector(0,-1,0)); //Push up
      }
      attempts++;
    }
  }
  this.addToStoring = function(id) {
    var found = 0;
    for (var i=0;i<this.storing.length;i++) {
      if (this.storing[i][0] == id) {
        this.storing[i][1]++; //Increase the amount of this item
        found = 1;
      }
    }
    if (found == 0) {
      this.storing.push([id,1]); //Add a new item
    }   
  }
}

//Functions
function addToInventory(id, list) { //Adds an item to an inventory
  var found = 0;
  for (var i=0;i<list.length;i++) {
    if (list[i][0] == id) {
      list[i][1]++; //Increase the amount of this item
      found = 1;
    }
  }
  if (found == 0) {
    list.push([id,1]); //Add a new item
  }
}

function useInInventory(id, list) { //Uses an item in an inventory
  for (var i=0;i<list.length;i++) {
    if (list[i][0] == id) {
      list[i][1]--; //Decrease the amount of this item
      if (list[i][1] < 1) {
        list.splice(i,1);
      }
    }
  }
}

function changeChunk() { //Changes the player's current chunk
  var changed = false;
  if (p.x < 0) { //Far left
    p.x = WIDTH-1;
    if (chunk-1 >= 0) {
      chunk--;
    }
    changed = -1;
  }
  if (p.x > WIDTH-1) { //Far right
    p.x = 0;
    if (chunk+1 > chunks.length-1) {
      generateTerrain(); //New chunk
    }
    chunk++;
    changed = 1;
  }
  if (changed) {
    var curChunk = chunks[chunk-changed];
    for (var l=0;l<curChunk.length;l++) {
      var curLayer = curChunk[l];
      for (var s=0;s<curLayer.length;s++) {
        if (curLayer[s] == player.spr) {
          curLayer.splice(s, 1); //Remove old/clone player from old chunk
        }
      }
    }
  }
  lastDir = new vector(changed,0,0);
}

function dayNightCycle() { //Change the lighting for the day/night cycle
  var progress = tick%DAYLENGTH;
  var section = DAYLENGTH/2;
  screen.fillStyle = "black";
  if (progress <= section) { //Day fade to night
    screen.globalAlpha = progress/section*NIGHTALPHA;
  } else { //Night fade to day
    screen.globalAlpha = (DAYLENGTH-progress)/section*NIGHTALPHA;
  }
  if (screen.globalAlpha > NIGHTALPHA*.9 && mobs.length < 10) {
    //mobs.push(new object(new sprite(new vector(WIDTH-p.x,p.y+2,p.z), new vector2(0,0)), -3)); //Summon zombie
  }
  var background = (1-screen.globalAlpha)*255;
  BACKGROUNDCOLOR = "rgb(0,"+background+","+background+")"
  screen.fillRect(0,0,canvas.width,canvas.height); 
}

function centerPlayer() { //Force the player to the ground
  p.y = HEIGHT*.8;
  lastDir = new vector(0,1,0);
}

function generate2DNoise(noise, wid, dep) { //Generates a 2D noise map from many 1D noise maps
  var xLayers = [];
  for (var z=0;z<dep;z++) {
    xLayers.push(generateNoise(wid, (noise[2]+noise[3])/2, noise[0], noise[2], noise[3])); //Generate layers of noise lines
  }
  var yLayers = [];
  for (var z=0;z<wid;z++) {
    yLayers.push(generateNoise(dep, xLayers[0][z], noise[1], noise[2], noise[3])); //Generate a perendicular list of layers of noise lines
  }

  var outputLayers = [];
  for (var z=0;z<xLayers.length;z++) {
    var layer = xLayers[z];
    outputLayers.push([]);
    for (var x=0;x<layer.length-1;x++) {
      var value = layer[x];
      outputLayers[outputLayers.length-1].push((value+yLayers[x][z])/2); //Average the noise lines
    }
  }
  return outputLayers
}
function generateHeightMap(noise) { //Generates a height map from a noise map
  return generate2DNoise(noise, WIDTH, DEPTH)
}

function generateNoise(length,start,change,min,max) { //Generates a 1D noise list
  var value = start;
  var output = [start];
  for (var i=0;i<length;i++) {
    value += (Math.random()-.5)*value*change;
    if (value < min) {
      value = min;
    }
    if (value > max) {
      value = max;
    }
    output.push(value);
  }
  return output;
}

function generateOreMaps(noise) { //Generate ore maps
  var maps = [];
  for (var i=0;i<noise.length;i++) {
    var top = [];
    var right = [];
    var front = [];
    for (var y=0;y<HEIGHT;y++) {
      top.push(generate2DNoise(noise[i][1],WIDTH,DEPTH));
    }
    for (var x=0;x<WIDTH;x++) {
      right.push(generate2DNoise(noise[i][1],DEPTH,HEIGHT));
    }
    for (var z=0;z<DEPTH;z++) {
      front.push(generate2DNoise(noise[i][1],WIDTH,HEIGHT));
    }
    var average = [[[]],];
    for (var z=0;z<DEPTH;z++) {
      for (var y=0;y<HEIGHT;y++) {
        average[z].push([]);
        for (var x=0;x<WIDTH;x++) {
          average[z][y].push((front[z][y][x] + top[y][z][x] + right[x][y][z])/3);
        }
      }
      average.push([]);
    }
    maps.push(average);
  }
  return maps;
}

function generateTerrain() { //Generates a chunk of terrain
  if (chunksTemps.length > 0) {
    var lastTemp = chunksTemps[chunksTemps.length-1];
  } else {
    var lastTemp = startTemp; //Initial temp
  }
  var newTemp = lastTemp + (Math.random()-.5)*25
  if (newTemp > 100) {
    newTemp = 100;
  } else if (newTemp < 0) {
    newTemp = 0;
  }
  chunksTemps.push(newTemp); //New temp
  var biomeID = getBiome(chunksTemps[chunksTemps.length-1]);
  layers = []; //New chunk, empty layers
  for (var z=0;z<DEPTH;z++) {
    for (var x=0;x<WIDTH;x++) {
      if (dimension == 0) { //Overworld
        HEIGHTMAP = generateHeightMap(BIOMENOISE[biomeID]); //Generate height map based on biome noise
        OREMAPS = generateOreMaps(ORENOISE[biomeID]); //Generate ore maps
        var height = Math.ceil(HEIGHTMAP[z][x]);
        var hasTree = Math.random() < BIOMETREES[biomeID][0];
        for (var y=0;y<height;y++) {
          var realHeight = HEIGHT-height+y;
          var id = 0; //Grass
          if (biomeID == 0) { //Tundra
            id = 5; //Snow
            if (y == 2) {
              id = 0; //Grass
            }
            if (y >= 3) {
              id = 1; //Dirt
            }
            if (y == 4) {
              id = 5; //Snow
            }         
            if (y > 5) {
              id = 2; //Stone
            }
            if (y >= height-1) {
              id = 3; //Lava
            }
          }
          if (biomeID == 1 || biomeID == 2 || biomeID == 3) { //Mountain, Mushroom, or Forest
            if (y >= 1) {
              id = 1; //Dirt
            }
            if (y > 3) {
              id = 2; //Stone
            }
            if (y >= height-1) {
              id = 3; //Lava
            }
          }
          if (biomeID == 1) { //Mountain
            if (realHeight <= HEIGHT/3) {
              if (y < 2) {
                id = 5; //Snow
              } else {
                id = 2; //Stone
              }
            }
          }        
          if (biomeID == 4) { //Desert
            id = 4; //Sand
            if (y >= 3) {
              id = 1; //Dirt
            }
            if (y >= 5) {
              id = 4; //Sand
            }
            if (y >= 6) {
              id = 1; //Dirt
            }
            if (y >= 7) {
              id = 2; //Stone
            }
            if (y >= height-1) {
              id = 3; //Lava
            }
          }
          if (biomeID == 5) { //Volcano
            id = 1; //Dirt
            if (y >= 3) {
              id = 3; //Lava
            }
            if (y >= 5) {
              id = 1; //Dirt
            }
            if (y >= 7) {
              id = 3; //Lava
            }
            if (y > 9) {
              id = 2; //Stone
            }
            if (y >= height-2) {
              id = 3; //Lava
            }
          }
          if (id == 2) { //Ore frequencies
            id = getOre(x,y,z,OREMAPS,ORENOISE[biomeID],2);
          }
          if (hasTree) {
            for (var i=0;i<BIOMETREES[biomeID][2];i++) {
              new object(new sprite(new vector(x,HEIGHT-height-1-i,z), new vector2(0,0)), BIOMETREES[biomeID][1]); //Place a tree
            }
            hasTree = false;
          }
          new object(new sprite(new vector(x,realHeight,z), new vector2(0,0)), id);
        }
      } else if (dimension == 1) { //Void
        BACKGROUNDCOLOR = "black";
        for (var i=0;i<2;i++) {
          if (i == 1) {
            HEIGHTMAP = generateHeightMap(BIOMENOISE[7]); //Generate top noise
          } else {
            HEIGHTMAP = generateHeightMap(BIOMENOISE[6]);
          }
          OREMAPS = generateOreMaps(ORENOISE[6]);
          height = Math.ceil(HEIGHTMAP[z][x]);
          for (var y=0;y<height;y++) {
            var realHeight = HEIGHT-height+y; //Generate bottom layer
            if (i == 1) {
              realHeight = y; //Generate top layer
            }
            var id = getOre(x,y,z,OREMAPS,ORENOISE[biomeID],18);
            new object(new sprite(new vector(x,realHeight,z), new vector2(0,0)), id); //Voidite
          }
        }
      } else { //Spherical world
        for (var y=0;y<HEIGHT;y++) {  
          if (Math.sqrt(Math.pow(x-WIDTH/4,2)+Math.pow(y-HEIGHT/4,2)+Math.pow(z-DEPTH/2,2)) < DEPTH/2) {
            new object(new sprite(new vector(x,HEIGHT+y,z), new vector2(5,0)),5);
          }
        }
      }
    }
  }
  chunks.push(layers); //Save this chunk
}

function getBiome(temp) {
  if (dimension == 0) {
    if (temp < 20) { //Tundra
      return 0;
    }
    if (temp >= 20 && temp < 40) { //Mountain
      return 1;
    }
    if (temp >= 40 && temp < 60) { //Forest
      return 2;
    }
    if (temp >= 60 && temp < 70) { //Mushroom
      return 3;
    }
    if (temp >= 70 && temp < 90) { //Desert
      return 4;
    }
    if (temp >= 90) { //Volcano
      return 5;
    }
  } else {
    return 6;
  }
}

function getHardness(spr) { //Returns the time it takes to break this block
  var id = getObjFromSpr(spr).id;
  var hardness = BLOCKHARDNESS[id];
  var multiplier = 1;
  if (inventory.length > 0 && inventory[0][0] == 13) {
    multiplier = .4;
  }
  return hardness*multiplier;
}

function getObjFromSpr(spr) { //Returns the block id from a src image
  return allObjects[allSprites.indexOf(spr)];
}

function getOre(x,y,z,maps,noise,def) { //Returns the ore id from an ore map
  var ore = def;
  var oreHeightRatio = 0;
  for (var o=0;o<noise.length;o++) {
    var thisNoise = noise[o];
    var thisHeight = thisNoise[2];
    var thisMax = thisNoise[1][3];
    if (maps[o][z][y][x] > thisHeight) { //Ore can gen
      if (thisNoise[3] > oreHeightRatio) {
        ore = noise[o][0];
        oreHeightRatio = thisNoise[3];
      }
    }
  }
  return ore;
}

function heightMap() {
  screen.shadowOffsetX = 0;
  screen.shadowOffsetY = 0;  
  for (var z=0;z<DEPTH;z++) {
    for (var x=0;x<WIDTH;x++) {
      if (HEIGHTMAP) {
        var val = (HEIGHTMAP[z][x]/HEIGHT)*255;
        screen.fillStyle = "rgb("+val+","+val+","+val+")";
        screen.fillRect(x*SCALE,canvas.height-z*SCALE,SCALE,SCALE);
      }
    }
  }
}

function mobAi() { //Mob Ai's
  for (var m=0;m<mobs.length;m++) {
    var mob = mobs[m];
    var mobSpr = mob.spr;
    var mobPos = mobSpr.pos;
    if (mob.id == -1) { //Angry Snowman
      chasePlayer();
    }
    if (mob.id == -2) { //Ant
      chasePlayer();
      if ((!mobSpr.canMove(new vector(-walkSpeed*2,0,0)) || !mobSpr.canMove(new vector(walkSpeed*2,0,0))) && Math.abs(p.x-mobPos.x) > 1) {
        mobSpr.tryMove(new vector(0,-walkSpeed,0));
      } else {
        mob.physics();
      }
      mobSpr.tryMove(new vector(0,0,p.z-mobPos.z));
      if (mobPos.distance(p) < 1) {
        player.health -= 10;
      }
      if (mobPos.y > HEIGHT/2) {
        mobSpr.remove();
      }
    }
    if (mob.id == -3) { //Zombie
      chasePlayer();
      if ((!mobSpr.canMove(new vector(-walkSpeed*2,0,0)) || !mobSpr.canMove(new vector(walkSpeed*2,0,0))) && !mobSpr.canMove(new vector(0,walkSpeed,0))) {
        mob.vel.y = -jumpPower;
      }
      mob.physics();
      if (mobPos.distance(p) < 1.1 && tick % 10) {
        player.health -= 10;
      }      
    }
    function chasePlayer() {
      if (Math.round(p.x) < mobPos.x) {
        mobSpr.src = MOBS[Math.abs(mob.id)-1][0] //Left spr
        mobSpr.tryMove(new vector(-walkSpeed,0,0));
      } else if (Math.round(p.x) > mobPos.x) {
        mobSpr.src = MOBS[Math.abs(mob.id)-1][1] //Right spr
        mobSpr.tryMove(new vector(walkSpeed,0,0));
      }
      if (Math.round(p.z) < mobPos.z) {
        mobSpr.tryMove(new vector(0,0,-1));
      } else if (Math.round(p.z) > mobPos.z) {
        mobSpr.tryMove(new vector(0,0,1));
      }      
    }
  }
}

function renderGuis() {
  screen.fillStyle = "black";
  screen.shadowColor = "white";
  screen.shadowOffsetX = 1;
  screen.shadowOffsetY = 2;
  screen.font = SIZE*SCALE+"px Arial"
  screen.globalAlpha = 1;
  var center = SIZE*SCALE*WIDTH/2;

  screen.fillText(Math.round(p.x)+chunk*WIDTH+","+Math.round(p.y)+","+Math.round(p.z), center,SIZE*SCALE); //Display player coords

  if (breakingProgress != "0") {
    screen.fillText(breakingProgress+"%", center, player.pos.y*SIZE*SCALE); //Display breaking progress indicator
  }

  screen.fillText(player.health+"/"+player.maxHealth, center,SIZE*SCALE*3); //Display player health

  screen.fillText(Math.round(chunksTemps[chunk])+"°", SIZE*SCALE, SIZE*SCALE) //Display chunk temperature

  for (var i=0;i<WIDTH/3;i++) {
    var max = WIDTH/3;
    if (inventory.length > i) {
      var id = inventory[i][0];
      var count = inventory[i][1];
      var src = BLOCKS[id];
      var pos = i*SIZE*SCALE+center-(max*SIZE*SCALE)/2;
      screen.drawImage(SPRITES, 
      src.x*SIZE, src.y*SIZE, 
      SIZE, SIZE, 
      pos, HEIGHT*SIZE*SCALE-SIZE*SCALE,
      SIZE*SCALE, SIZE*SCALE); //Render inventory block
      screen.fillText("x"+count, pos, HEIGHT*SIZE*SCALE); //Display block count
    }
  } 
}