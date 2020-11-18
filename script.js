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

const ROID_NUM = 3; // min roids starting number
const ROID_SIZE = 80; //max starting size in pixels
const ROID_SPD = 50; //max roids starting speed in pixels per second
const ROID_SIDE = 10; //avg number of vertices
const ROID_JAG = 0.7; //asteroids's jageredness(0: none, 1: max)

const SHOW_CENTER_DOT = true;
const SHOW_BOUNDS = true; //show/hide collision bounding 


//create ship
var ship = {
    x: GAMEWIDTH / 2,
    y: GAMEHEIGHT / 2,
    r: SHIP_SIZE / 2,
    a: 90 / 180 * Math.PI, //facing upwards pi/2 radians
    rot: 0, //rotation speed
    thrustOn: false,
    xThrust: 0,
    yThrust: 0
};

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

//set up event handler
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

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
    }
}

//gameloop
setInterval(update, 1000 / FPS );

function update(){
    //draw space
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, GAMEWIDTH, GAMEHEIGHT);

    //draw triangular ship
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
    
    if(SHOW_CENTER_DOT){
        //center of the ship
        ctx.fillStyle = "blue"
        ctx.fillRect(ship.x - 1, ship.y - 1, 3, 3);
    }

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

    //rotate the ship
    ship.a += ship.rot;

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
    ctx.strokeStyle = "green";
    ctx.lineWidth = SHIP_SIZE / 20;
    var x, y, r, a, sides, offset;
    for(var i = 0; i < roids.length; i++){
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

        //collision detection
        if(roids[i].x == ship.x){
            if(roids[i].y == ship.y){
                alert("Collision");
            }
        }

    }


    //draw ufos


    //move the ufos


}

update();