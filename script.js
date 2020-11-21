//framerate
const FPS = 50;

var gameScreen = document.getElementById("output");
var ctx = gameScreen.getContext("2d");

const GAMEWIDTH = gameScreen.width;
const GAMEHEIGHT = gameScreen.height;
const SAVE_KEY_SCORE = "highscore"; //save key for local storage of highscore
const SOUND_ON = false; //flag to prevent background sounds
const MUSIC_ON = false;
const GAME_LIVES = 5; //starting number of lives
const SHIP_SIZE = 30;
const TURN_SPEED = 360; // in degrees per second
const SHIP_ACCL = 2;
const FRICTION_COEFF = 0.5;
const SHIP_EXPLODE_DUR = 0.5;
const SHIP_INVLB_DUR = 3; // time dur for which the ship is invulnerable after spawn
const SHIP_BLINK_DUR = 0.1; // time dur for which the ship blinks after spawn
const MAX_LASERS = 10 // maximum number of lasers at one time
const LASER_SPD = 500; //laser spd in pixel per sec
const LASER_DIST = 0.6; //max dist laser can travel in terms of screen size 
const LASER_EXPLD_DUR = 3; // exlosion animation duration (always keep more than 2)

const ROID_NUM = 1; // min roids starting number
const ROID_SIZE = 100; //max starting size in pixels
const ROID_SPD = 50; //max roids starting speed in pixels per second
const ROID_SIDE = 10; //avg number of vertices
const ROID_JAG = 0.7; //asteroids's jageredness(0: none, 1: max)
const ROID_PTS_LR = 20; //points large asteroid is worth
const ROID_PTS_ME = 50; //points medium asteroid is worth
const ROID_PTS_SM = 100; //points small asteroid is worth

const SHOW_CENTER_DOT = false;
const SHOW_BOUNDS = false; //show/hide collision bounding 

const TEXT_FADE_TIME = 2.5; //text fade time in seconds
const TEXT_SIZE = 40; //text height in pixels

//set up sounds
var fxLaser = new Sound("sound/laser.m4a", 5, 0.5);
var fxExplode = new Sound("sound/explode.m4a");
var fxHit = new Sound("sound/hit.m4a", 5, 0.5);
var fxThrust = new Sound("sound/thrust.m4a");

//set up the music
var music = new Music("sound/music-low.m4a", "sound/music-high.m4a");
var roidsLeft, roidsTotal;

//set up the game parameters
var level, ship, roids, score, scoreHigh, text, lives, textAlpha;
newGame();

function createAsteroidBelt() {
    roids = []; //clearing the array
    roidsTotal = (ROID_NUM + level) * 7;
    roidsLeft = roidsTotal

    var x, y;
    for (var i = 0; i < ROID_NUM + level; i++) {
        do {
            x = Math.floor(Math.random() * GAMEWIDTH);
            y = Math.floor(Math.random() * GAMEHEIGHT);
        } while (distBetweenPoints(ship.x, ship.y, x, y) < ROID_SIZE * 1.5 + ship.r); // 1.5 is the buffer zone coefficient
        roids.push(newAsteroid(x, y, Math.ceil(ROID_SIZE / 2)));
    }
}

function distBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

//function creating indvd asteroids
function newAsteroid(x, y, r) {
    //level 
    var lvlMult = 1 + 0.1 * level;
    var roid = {
        x: x,
        y: y,
        xv: Math.random() * ROID_SPD * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1), // x velocity, +ve for < 0.5 and -ve otherwise
        yv: Math.random() * ROID_SPD * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1), // y velocity, +ve for < 0.5 and -ve otherwise
        r: r,
        a: Math.random() * Math.PI * 2, // angle in radians
        sides: Math.floor(Math.random() * (ROID_SIDE + 1) + ROID_SIDE / 2),
        offset: []
    }

    //create the vertex offset
    for (var i = 0; i < roid.sides; i++) {
        roid.offset.push(Math.random() * ROID_JAG * 2 + (1 - ROID_JAG))
    }
    return roid;
}

function destroyAsteroid(i) {
    var x = roids[i].x;
    var y = roids[i].y;
    var r = roids[i].r;

    //split asteroid
    if (r == Math.ceil(ROID_SIZE / 2)) {
        //original size
        roids.push(newAsteroid(x, y, r / 2));
        roids.push(newAsteroid(x, y, r / 2));
        score += ROID_PTS_LR;
    } else if (r == Math.ceil(ROID_SIZE / 4)) {
        //secong gen
        roids.push(newAsteroid(x, y, r / 4));
        roids.push(newAsteroid(x, y, r / 4));
        score += ROID_PTS_ME;
    } else {
        score += ROID_PTS_SM;
    }

    //checking for high score
    if (score > scoreHigh) {
        scoreHigh = score;
        localStorage.setItem(SAVE_KEY_SCORE, score);
    }

    //last gen destroid
    roids.splice(i, 1);

    //playing hit sound
    fxHit.play();

    //calc ratio roidsleft : roidstotal
    roidsLeft--;
    music.setAsteroidRatio(roidsLeft == 0 ? 1 : roidsLeft / roidsTotal);

    //new level when all asteroids destroyed
    if (roids.length == 0) {
        level++;
        newLevel();
    }
}

function newShip() {
    return {
        x: GAMEWIDTH / 2,
        y: GAMEHEIGHT / 2,
        r: SHIP_SIZE / 2,
        a: 90 / 180 * Math.PI, //facing upwards pi/2 radians
        rot: 0, //rotation speed
        blinkTime: Math.ceil(SHIP_BLINK_DUR * FPS),
        blinkNum: Math.ceil(SHIP_INVLB_DUR / SHIP_BLINK_DUR),
        thrustOn: false,
        xThrust: 0,
        yThrust: 0,
        explodeTime: 0,
        canShoot: true,
        lasers: [],
        dead: false
    };
}

function Sound(src, maxStreams = 1, vol = 1.0) {
    this.streamNum = 0;
    this.streams = [];
    for (var i = 0; i < maxStreams; i++) {
        this.streams.push(new Audio(src));
        this.streams[i].volume = vol;
    }

    this.play = function() {
        if (SOUND_ON) {
            this.streamNum = (this.streamNum + 1) % maxStreams;
            this.streams[this.streamNum].play();
        }
    }

    this.stop = function() {
        this.streams[this.streamNum].pause();
        this.streams[this.streamNum].currentTime = 0;
    }

}

function Music(src1, src2) {
    this.soundLow = new Audio(src1);
    this.soundHigh = new Audio(src2);
    this.low = true; // true is low sound is playing
    this.temp = 1.0; // secs per beat
    this.beatTime = 0; // frames left until next beat

    this.play = function() {
        if(MUSIC_ON){
            if (this.low) {
                this.soundLow.play();
            } else {
                this.soundHigh.play();
            }
            this.low = !this.low; // switching
        }
    }

    this.setAsteroidRatio = function(ratio) {
        this.tempo = 1.0 - 0.75 * (1.0 - this.ratio);
    }

    this.tick = function() {
        if(MUSIC_ON){
            if (this.beatTime == 0) {
                this.beatTime = Math.ceil(this.tempo * FPS);
            } else {
                this.beatTime--;
            }
        }
    }
}

function newGame() {
    score = 0;
    level = 0;
    scoreStr = localStorage.getItem(SAVE_KEY_SCORE);
    if (!scoreStr) {
        scoreHigh = 0;
    } else {
        scoreHigh = parseInt(scoreStr);
    }
    //create ship
    lives = GAME_LIVES;
    ship = newShip();
    newLevel();
}

function drawShip(x, y, a) {
    ctx.strokeStyle = "white";
    ctx.lineWidth = SHIP_SIZE / 20;
    ctx.beginPath();
    ctx.moveTo( // nose of the ship
        x + 4 / 3 * ship.r * Math.cos(a), // 4 / 3 is multiplied so that the centeroid of the ship is represented by the blue traingle
        y - 4 / 3 * ship.r * Math.sin(a)
    );
    ctx.lineTo( // rear left of the ship
        x - ship.r * (2 / 3 * Math.cos(a) + Math.sin(a)), // 2 / 3 is multiplied so that the centeroid of the ship is represented by the blue traingle
        y + ship.r * (2 / 3 * Math.sin(a) - Math.cos(a))
    );
    ctx.lineTo( // rear right of the ship
        x - ship.r * (2 / 3 * Math.cos(a) - Math.sin(a)), // 2 / 3 is multiplied so that the centeroid of the ship is represented by the blue traingle
        y + ship.r * (2 / 3 * Math.sin(a) + Math.cos(a))
    );
    ctx.closePath();
    ctx.stroke();
}

function newLevel() {
    text = "Level " + (level + 1);
    textAlpha = 1.0;
    createAsteroidBelt();
}

//set up event handler
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

function shootLaser() {
    //create laser obj
    if (ship.canShoot) {
        if (ship.lasers.length < 10) {
            //pushing laser object
            ship.lasers.push({
                x: ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
                y: ship.y - 4 / 3 * ship.r * Math.sin(ship.a),
                xv: LASER_SPD * Math.cos(ship.a) / FPS,
                yv: -(LASER_SPD * Math.sin(ship.a) / FPS),
                dist: 0,
                explodeTime: 0
            })
            fxLaser.play();
        }
    }

    //prevent further shooting
    ship.canShoot = false;
}

function keyUp(evt) {
    if (ship.dead) {
        return;
    }
    switch (evt.keyCode) {
        case 37:
            //stop left
            ship.rot = 0;
            break;
        case 38:
            //stop thrust
            ship.thrustOn = false;
            break;
        case 39:
            //stop right
            ship.rot = 0;
            break;
        case 32:
            //shoot lasers
            shootLaser();
            break;
    }
}

function keyDown(evt) {
    if (ship.dead) {
        return;
    }
    switch (evt.keyCode) {
        case 37:
            //left
            ship.rot = TURN_SPEED / 180 * Math.PI / FPS;
            break;
        case 38:
            //thrust
            ship.thrustOn = true;
            break;
        case 39:
            //right
            ship.rot = -(TURN_SPEED / 180 * Math.PI / FPS);
            break;
        case 32:
            ship.canShoot = true;
            break;
    }
}

function orientationChange(){
    console.log(screen.orientation);
}

function explodeShip() {
    ship.explodeTime = SHIP_EXPLODE_DUR * FPS; //duration of exploding affect of ship
    fxExplode.play();
}

function gameOver() {
    ship.dead = true;
    text = "Game Over";
    textAlpha = 1.0;
}

//gameloop
setInterval(update, 1000 / FPS);

function update() {
    //music play
    music.tick();
    music.play();

    var blinkOn = ship.blinkNum % 2 == 0 ? true : false;
    var exploding = ship.explodeTime > 0;

    //draw space
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, GAMEWIDTH, GAMEHEIGHT);

    if (!ship.dead) {
        //draw triangular ship
        if (!exploding) {
            if (blinkOn) {
                drawShip(ship.x, ship.y, ship.a);
            }

            //handle blinking
            if (ship.blinkNum > 0) {
                //reduce blink time
                ship.blinkTime--;

                //reduce blink num
                if (ship.blinkTime == 0) {
                    ship.blinkTime = Math.ceil(SHIP_BLINK_DUR * FPS);
                    ship.blinkNum--;
                }
            }

        } else {
            //draw the explosion
            ctx.beginPath();
            ctx.fillStyle = "darkestred";
            ctx.arc(ship.x, ship.y, 1.6 * ship.r, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = "darkred";
            ctx.arc(ship.x, ship.y, 1.4 * ship.r, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = "red";
            ctx.arc(ship.x, ship.y, 1.2 * ship.r, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = "orange";
            ctx.arc(ship.x, ship.y, ship.r, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = "yellow";
            ctx.arc(ship.x, ship.y, 0.8 * ship.r, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = "white";
            ctx.arc(ship.x, ship.y, 0.6 * ship.r, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();
        }
    }

    if (SHOW_BOUNDS) {
        //adding circular bounds
        ctx.strokeStyle = "lime";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r, 0, 2 * Math.PI, false);
        ctx.closePath();
        ctx.stroke();
    }

    if (SHOW_CENTER_DOT) {
        //center of the ship
        ctx.fillStyle = "blue"
        ctx.fillRect(ship.x - 1, ship.y - 1, 3, 3);
    }

    //draw laser
    for (var i = 0; i < ship.lasers.length; i++) {
        if (ship.lasers[i].explodeTime == 0) {
            ctx.fillStyle = "salmon";
            ctx.beginPath();
            ctx.arc(ship.lasers[i].x, ship.lasers[i].y, SHIP_SIZE / 15, 0, Math.PI * 2, false);
            ctx.closePath();
            ctx.fill();
        } else {
            //draw the explosion
            ctx.fillStyle = "orangered";
            ctx.beginPath();
            ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.75, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "salmon";
            ctx.beginPath();
            ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.50, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "pink";
            ctx.beginPath();
            ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.25, 0, Math.PI * 2, false);
            ctx.fill();
        }
    }

    //detect laser hits
    var ax, ay, ar, lx, ly;
    for (var i = roids.length - 1; i >= 0; i--) {
        //asteroid properties
        ax = roids[i].x;
        ay = roids[i].y;
        ar = roids[i].r;

        //loop over the lasers
        for (var j = ship.lasers.length - 1; j >= 0; j--) {
            lx = ship.lasers[j].x;
            ly = ship.lasers[j].y;

            //detect hits
            if (ship.lasers[j].explodeTime == 0 && distBetweenPoints(ax, ay, lx, ly) <= ar) {
                // //remove the laser
                // ship.lasers.splice(j, 1);

                //destroy asteroid and show laser explosion
                destroyAsteroid(i);
                ship.lasers[j].explodeTime = Math.ceil(LASER_EXPLD_DUR);
                break;
            }
        }
    }

    //moving the lasers
    for (var i = ship.lasers.length - 1; i >= 0; i--) {
        //check dist traveled
        if (ship.lasers[i].dist > LASER_DIST * GAMEWIDTH) {
            ship.lasers.splice(i, 1);
            continue;
        }

        //handle explosion
        if (ship.lasers[i].explodeTime > 0) {
            ship.lasers[i].explodeTime--;

            // destroy the laser after explosion
            if (ship.lasers[i].explodeTime == 0) {
                ship.lasers.splice(i, 1);
                continue;
            }
        } else {
            //move the lasers
            ship.lasers[i].x += ship.lasers[i].xv;
            ship.lasers[i].y += ship.lasers[i].yv;

            //calculate distance travelled
            ship.lasers[i].dist += Math.sqrt(Math.pow(ship.lasers[i].xv, 2) + Math.pow(ship.lasers[i].yv, 2));

            //handling edges of screen
            if (ship.lasers[i].x < 0) {
                ship.lasers[i].x = GAMEWIDTH;
            } else if (ship.lasers[i].x > GAMEWIDTH) {
                ship.lasers[i].x = 0;
            } else if (ship.lasers[i].y < 0) {
                ship.lasers[i].y = GAMEHEIGHT;
            } else if (ship.lasers[i].y > GAMEHEIGHT) {
                ship.lasers[i].y = 0;
            }
        }
    }

    if (!exploding && blinkOn) {
        //move the ship
        if (ship.thrustOn && !ship.dead) {
            //angle of the ship gives the direction of movement
            ship.yThrust += -(SHIP_ACCL * (Math.sin(ship.a))) / FPS;
            ship.xThrust += SHIP_ACCL * (Math.cos(ship.a)) / FPS;

            // drawing the thruster
            ctx.fillStyle = "cyan";
            ctx.strokeStyle = "blue";
            ctx.lineWidth = SHIP_SIZE / 10;
            ctx.beginPath();
            ctx.moveTo( // rear left of ship
                ship.x - ship.r * (2 / 3 * Math.cos(ship.a) + 0.6 * Math.sin(ship.a)), // 0.6 controls the thruster size
                ship.y + ship.r * (2 / 3 * Math.sin(ship.a) - 0.6 * Math.cos(ship.a))
            );
            ctx.lineTo( // rear center
                ship.x - ship.r * 6 / 3 * Math.cos(ship.a),
                ship.y + ship.r * 6 / 3 * Math.sin(ship.a)
            );
            ctx.lineTo( // rear right of the ship
                ship.x - ship.r * (2 / 3 * Math.cos(ship.a) - 0.6 * Math.sin(ship.a)),
                ship.y + ship.r * (2 / 3 * Math.sin(ship.a) + 0.6 * Math.cos(ship.a))
            );
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            fxThrust.play();
        } else {
            //when thrust is off, friction of the space(in this case it exists) will slow the ship down
            if (ship.xThrust != 0) ship.xThrust -= ship.xThrust * FRICTION_COEFF / FPS;
            if (ship.yThrust != 0) ship.yThrust -= ship.yThrust * FRICTION_COEFF / FPS;
            fxThrust.stop();
        }
        ship.x += ship.xThrust;
        ship.y += ship.yThrust;

        //rotate the ship
        ship.a += ship.rot;
    }

    if (!exploding && !ship.dead) {
        //collision b/w asteroids and ship
        if (ship.blinkNum == 0) {
            for (var i = 0; i < roids.length; i++) {
                if (distBetweenPoints(ship.x, ship.y, roids[i].x, roids[i].y) <= ship.r + roids[i].r) {
                    explodeShip();
                    destroyAsteroid(i);
                    break;
                }
            }
        }
    } else {
        ship.explodeTime--;

        if (ship.explodeTime == 0) {
            ship = newShip();
            //decrementing lives
            lives--;

            if (lives == 0) {
                gameOver();
            }
        }
    }

    //handling edges of the screen
    if (ship.x + SHIP_SIZE / 2 < 0) {
        //left edge
        ship.x = GAMEWIDTH; // ship appears in from right
    }
    if (ship.x - SHIP_SIZE / 2 > GAMEWIDTH) {
        //right edge
        ship.x = 0;
    }
    if (ship.y + SHIP_SIZE / 2 < 0) {
        //top edge
        ship.y = GAMEHEIGHT;
    }
    if (ship.y - SHIP_SIZE / 2 > GAMEHEIGHT) {
        ship.y = 0;
    }

    //draw asteroids
    var x, y, r, a, sides, offset;
    for (var i = 0; i < roids.length; i++) {
        ctx.strokeStyle = "grey";
        ctx.lineWidth = SHIP_SIZE / 20;
        //getting asteroid properties
        x = roids[i].x;
        y = roids[i].y;
        r = roids[i].r;
        a = roids[i].a;
        sides = roids[i].sides;
        offset = roids[i].offset;

        //draw a path
        ctx.beginPath();
        ctx.moveTo(
            x + r * offset[0] * Math.cos(a),
            y + r * Math.sin(a) //the center of the asteroid
        );
        //polygon
        for (var j = 1; j < sides; j++) {
            ctx.lineTo(
                x + r * offset[j] * Math.cos(a + j * Math.PI * 2 / sides), //modifies the angle acc to sides
                y + r * Math.sin(a + j * Math.PI * 2 / sides)
            );
        }
        ctx.closePath();
        ctx.stroke();

        //move the asteroid
        roids[i].x += roids[i].xv;
        roids[i].y += roids[i].yv;

        //handle edge of screen
        if (roids[i].x + roids[i].r / 2 < 0) {
            //left edge
            roids[i].x = GAMEWIDTH + roids[i].r * 0.25; // ship appears in from right
        }
        if (roids[i].x - roids[i].r / 2 > GAMEWIDTH) {
            //right edge
            roids[i].x = -roids[i].r * 0.25;
        }
        if (roids[i].y + roids[i].r / 2 < 0) {
            //top edge
            roids[i].y = GAMEHEIGHT + roids[i].r * 0.25;
        }
        if (roids[i].y - roids[i].r / 2 > GAMEHEIGHT) {
            //bottom edge
            roids[i].y = -roids[i].r * 0.25;
        }

        if (SHOW_BOUNDS) {
            //adding circular bounds
            ctx.strokeStyle = "lime";
            ctx.beginPath();
            ctx.arc(roids[i].x, roids[i].y, roids[i].r, 0, 2 * Math.PI, false);
            ctx.closePath();
            ctx.stroke();
        }
    }
    //draw ufos


    //move the ufos


    //drawing lives on game screen
    for (var i = 0; i < lives; i++) {
        drawShip(SHIP_SIZE + i * 1.2 * SHIP_SIZE, SHIP_SIZE, 0.5 * Math.PI);
    }

    //drawing score
    ctx.textAlign = "center";
    ctx.textBaseline = "right";
    ctx.fillStyle = "white"
    ctx.font = "small-caps " + (TEXT_SIZE - 10) + " arial";
    ctx.fillText(score, GAMEWIDTH - SHIP_SIZE * 1.25, SHIP_SIZE);

    //drawing high score
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white"
    ctx.font = "small-caps " + (TEXT_SIZE - 10) + " arial";
    ctx.fillText("BEST " + scoreHigh, GAMEWIDTH / 2 - SHIP_SIZE / 2, SHIP_SIZE);

    //drawing the game text
    if (textAlpha >= 0) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255, 255, 255, " + textAlpha + ")";
        ctx.font = "small-caps " + (TEXT_SIZE - 10) + "px arial";
        ctx.fillText(text, GAMEWIDTH * 0.43, GAMEHEIGHT / 4);
        textAlpha -= (1.0 / TEXT_FADE_TIME / FPS);
    } else if (ship.dead) {
        newGame();
    }

    //event listener for changing orientation;
    screen.addEventListener("orientationchange", orientationChange());
}

update();