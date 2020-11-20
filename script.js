//framerate
const FPS = 50;

var gameScreen = document.getElementById("output");
var ctx = gameScreen.getContext("2d");

const GAMEWIDTH = gameScreen.width;
const GAMEHEIGHT = gameScreen.height;
const SHIP_SIZE = 30;
const TURN_SPEED = 360; // in degrees per second
const SHIP_ACCL = 2;
const FRICTION_COEFF = 0.5;
const SHIP_EXPLODE_DUR = 0.5;
const SHIP_INVLB_DUR = 1; // time dur for which the ship is invulnerable after spawn
const SHIP_BLINK_DUR = 0.1; // time dur for which the ship blinks after spawn
const MAX_LASERS = 10 // maximum number of lasers at one time
const LASER_SPD = 500; //laser spd in pixel per sec
const LASER_DIST = 0.6; //max dist laser can travel in terms of screen size 

const ROID_NUM = 3; // min roids starting number
const ROID_SIZE = 80; //max starting size in pixels
const ROID_SPD = 50; //max roids starting speed in pixels per second
const ROID_SIDE = 10; //avg number of vertices
const ROID_JAG = 0.7; //asteroids's jageredness(0: none, 1: max)

const SHOW_CENTER_DOT = false;
const SHOW_BOUNDS = false; //show/hide collision bounding 


//create ship
var ship = newShip();

//create asteroids
var roids = [];
createAsteroidBelt();

function createAsteroidBelt(){
    roids = []; //clearing the array
    var x, y;
    for(var i = 0; i < ROID_NUM; i++){
        do{
            x = Math.floor(Math.random() * GAMEWIDTH);
            y = Math.floor(Math.random() * GAMEHEIGHT);
        } while(distBetweenPoints(ship.x, ship.y, x, y) < ROID_SIZE * 1.5 + ship.r); // 1.5 is the buffer zone coefficient
        roids.push(newAsteroid(x, y));
    }
}

function distBetweenPoints(x1, y1, x2, y2){
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

//function creating indvd asteroids
function newAsteroid(x, y){
    var roid = {
        x: x,
        y: y,
        xv: Math.random() * ROID_SPD / FPS * (Math.random() < 0.5 ? 1 : -1),// x velocity, +ve for < 0.5 and -ve otherwise
        yv: Math.random() * ROID_SPD / FPS * (Math.random() < 0.5 ? 1 : -1),// y velocity, +ve for < 0.5 and -ve otherwise
        r: ROID_SIZE / 2,
        a: Math.random() * Math.PI * 2, // angle in radians
        sides: Math.floor(Math.random() * (ROID_SIDE + 1) + ROID_SIDE / 2),
        offset: []
    }   

    //create the vertex offset
    for(var i = 0; i < roid.sides; i++){
        roid.offset.push(Math.random() * ROID_JAG * 2 + (1 - ROID_JAG))
    }
    return roid;
}

function newShip(){
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
        lasers: []        
    };
}

//set up event handler
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

function shootLaser(){
    //create laser obj
    if(ship.canShoot){
        if(ship.lasers.length < 10){
            //pushing laser object
            ship.lasers.push({
                x: ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
                y: ship.y - 4 / 3 * ship.r * Math.sin(ship.a),
                xv: LASER_SPD * Math.cos(ship.a) / FPS,
                yv: - (LASER_SPD * Math.sin(ship.a) / FPS),
                dist: 0
            })
        }
    }

    //prevent further shooting
    ship.canShoot = false;
}

function keyUp(evt){
    switch(evt.keyCode){
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

function keyDown(evt){
    switch(evt.keyCode){
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
            ship.rot = - (TURN_SPEED / 180 * Math.PI / FPS);
            break;
        case 32:
            ship.canShoot = true;
            break;
    }
}

function explodeShip(){
    ship.explodeTime = SHIP_EXPLODE_DUR * FPS; //duration of exploding affect of ship
}

//gameloop
setInterval(update, 1000 / FPS );

function update(){
    var blinkOn = ship.blinkNum % 2 == 0 ? true : false;
    var exploding = ship.explodeTime > 0;

    //draw space
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, GAMEWIDTH, GAMEHEIGHT);

    //draw triangular ship
    if(!exploding){   
        if(blinkOn){
            ctx.strokeStyle = "white";
            ctx.lineWidth = SHIP_SIZE / 20;
            ctx.beginPath();
            ctx.moveTo( // nose of the ship
                ship.x + 4 / 3 * ship.r * Math.cos(ship.a), // 4 / 3 is multiplied so that the centeroid of the ship is represented by the blue traingle
                ship.y - 4 / 3 * ship.r * Math.sin(ship.a)
            );
            ctx.lineTo( // rear left of the ship
                ship.x - ship.r * (2 / 3 * Math.cos(ship.a) + Math.sin(ship.a)),// 2 / 3 is multiplied so that the centeroid of the ship is represented by the blue traingle
                ship.y + ship.r * (2 / 3 *Math.sin(ship.a) - Math.cos(ship.a))
            );
            ctx.lineTo( // rear right of the ship
                ship.x - ship.r * (2 / 3 * Math.cos(ship.a) - Math.sin(ship.a)),// 2 / 3 is multiplied so that the centeroid of the ship is represented by the blue traingle
                ship.y + ship.r * (2 / 3 * Math.sin(ship.a) + Math.cos(ship.a))
            );
            ctx.closePath();
            ctx.stroke();
        }

        //handle blinking
        if(ship.blinkNum > 0){
            //reduce blink time
            ship.blinkTime--;

            //reduce blink num
            if(ship.blinkTime == 0){
                ship.blinkTime = Math.ceil(SHIP_BLINK_DUR * FPS);
                ship.blinkNum--;
            }
        }

    }
    else{
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


    if(SHOW_BOUNDS){
        //adding circular bounds
        ctx.strokeStyle = "lime";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r, 0, 2 * Math.PI, false);
        ctx.closePath();
        ctx.stroke();
    }

    if(SHOW_CENTER_DOT){
        //center of the ship
        ctx.fillStyle = "blue"
        ctx.fillRect(ship.x - 1, ship.y - 1, 3, 3);
    }

    //draw laser
    for(var i = 0; i < ship.lasers.length; i++){
        ctx.fillStyle = "salmon";
        ctx.beginPath();
        ctx.arc(ship.lasers[i].x, ship.lasers[i].y, SHIP_SIZE / 15, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fill();
    }

    //moving the lasers
    for(var i = ship.lasers.length - 1; i >= 0; i--){
        //check dist traveled
        if(ship.lasers[i].dist > LASER_DIST * GAMEWIDTH){
            ship.lasers.splice(i, 1);
            continue;
        }

        ship.lasers[i].x += ship.lasers[i].xv;
        ship.lasers[i].y += ship.lasers[i].yv;

        //calculate diatnce travelled
        ship.lasers[i].dist += Math.sqrt(Math.pow(ship.lasers[i].xv, 2) + Math.pow(ship.lasers[i].yv, 2));
        
        //handling edges of screen
        if(ship.lasers[i].x < 0){
            ship.lasers[i].x = GAMEWIDTH;
        }
        else if(ship.lasers[i].x > GAMEWIDTH){
            ship.lasers[i].x = 0;
        }
        else if(ship.lasers[i].y < 0){
            ship.lasers[i].y = GAMEHEIGHT;
        }
        else if(ship.lasers[i].y > GAMEHEIGHT){
            ship.lasers[i].y = 0;
        }
    }

    if(!exploding && blinkOn){
        //move the ship
        if(ship.thrustOn){
            //angle of the ship gives the direction of movement
            ship.yThrust += -(SHIP_ACCL * (Math.sin(ship.a))) / FPS;
            ship.xThrust += SHIP_ACCL * (Math.cos(ship.a)) / FPS;
            
            // drawing the thruster
            ctx.fillStyle = "cyan";
            ctx.strokeStyle = "blue";
            ctx.lineWidth = SHIP_SIZE / 10;
            ctx.beginPath();
            ctx.moveTo( // rear left of ship
                ship.x - ship.r * (2 / 3 * Math.cos(ship.a) + 0.6 * Math.sin(ship.a)),// 0.6 controls the thruster size
                ship.y + ship.r * (2 / 3 *Math.sin(ship.a) - 0.6 * Math.cos(ship.a))
            );
            ctx.lineTo( // rear center
                ship.x - ship.r * 6 / 3 * Math.cos(ship.a),
                ship.y + ship.r * 6 / 3 *Math.sin(ship.a)
            );
            ctx.lineTo( // rear right of the ship
                ship.x - ship.r * (2 / 3 * Math.cos(ship.a) - 0.6 * Math.sin(ship.a)),
                ship.y + ship.r * (2 / 3 * Math.sin(ship.a) + 0.6 *  Math.cos(ship.a))
            );
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        else{
            //when thrust is off friction of the space(in this case it exists) will slow the ship down
            if(ship.xThrust != 0) ship.xThrust -= ship.xThrust * FRICTION_COEFF / FPS;
            if(ship.yThrust != 0)ship.yThrust -= ship.yThrust * FRICTION_COEFF / FPS;
        }
        ship.x += ship.xThrust;
        ship.y += ship.yThrust;
    }

    if(!exploding){
        //collision b/w asteroids and ship
        if(ship.blinkNum == 0){
            for(var i = 0; i < roids.length; i++){
                if(distBetweenPoints(ship.x, ship.y, roids[i].x, roids[i].y) <= ship.r + roids[i].r){
                    explodeShip(); 
                }
            }
        }


        //rotate the ship
        ship.a += ship.rot;
    }
    else{
        ship.explodeTime--;

        if(ship.explodeTime == 0){
            ship = newShip();
        }
    }

    //handling edges of the screen
    if(ship.x + SHIP_SIZE / 2 < 0){
        //left edge
        ship.x = GAMEWIDTH; // ship appears in from right
    }
    if(ship.x - SHIP_SIZE / 2 > GAMEWIDTH){
        //right edge
        ship.x = 0;
    }
    if(ship.y + SHIP_SIZE / 2 < 0){
        //top edge
        ship.y = GAMEHEIGHT;
    }
    if(ship.y - SHIP_SIZE / 2 > GAMEHEIGHT){
        ship.y = 0;
    }

    //draw asteroids
    var x, y, r, a, sides, offset;
    for(var i = 0; i < roids.length; i++){
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
        for(var j = 1; j < sides; j++){
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
        if(roids[i].x + ROID_SIZE / 2 < 0){
            //left edge
            roids[i].x = GAMEWIDTH + ROID_SIZE / 3; // ship appears in from right
        }
        if(roids[i].x - ROID_SIZE / 2 > GAMEWIDTH){
            //right edge
            roids[i].x = - ROID_SIZE / 3;
        }
        if(roids[i].y + ROID_SIZE / 2 < 0){
            //top edge
            roids[i].y = GAMEHEIGHT + ROID_SIZE / 3;
        }
        if(roids[i].y - ROID_SIZE / 2 > GAMEHEIGHT){
            //bottom edge
            roids[i].y = - ROID_SIZE / 3;
        }

        if(SHOW_BOUNDS){
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


}

update();