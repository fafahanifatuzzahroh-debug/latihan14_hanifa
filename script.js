const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

const brainCanvas = document.getElementById("brain");
const brainCtx = brainCanvas.getContext("2d");

const chartCanvas = document.getElementById("chart");
const chartCtx = chartCanvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

const POP = 50;

let generation = 1;
let history = [];

let obstacles = [];

let target = {
    x:800,
    y:300,
    r:15
};

////////////////////////////////////////////////
// Neural Network
////////////////////////////////////////////////

class Brain{

    constructor(){

        this.i = 5;
        this.h = 6;
        this.o = 2;

        this.w1 = [];
        this.w2 = [];

        for(let a=0;a<this.i;a++){
            this.w1[a]=[];
            for(let b=0;b<this.h;b++){
                this.w1[a][b]=Math.random()*2-1;
            }
        }

        for(let a=0;a<this.h;a++){
            this.w2[a]=[];
            for(let b=0;b<this.o;b++){
                this.w2[a][b]=Math.random()*2-1;
            }
        }
    }

    clone(){

        let b=new Brain();

        b.w1=JSON.parse(JSON.stringify(this.w1));
        b.w2=JSON.parse(JSON.stringify(this.w2));

        return b;
    }

    mutate(rate=.2){

        for(let i=0;i<this.i;i++)
        for(let j=0;j<this.h;j++)
        if(Math.random()<rate)
            this.w1[i][j]+= (Math.random()*2-1)*0.5;

        for(let i=0;i<this.h;i++)
        for(let j=0;j<this.o;j++)
        if(Math.random()<rate)
            this.w2[i][j]+= (Math.random()*2-1)*0.5;
    }

    feed(input){

        let hidden=[];

        for(let h=0;h<this.h;h++){

            let sum=0;

            for(let i=0;i<this.i;i++)
                sum+=input[i]*this.w1[i][h];

            hidden[h]=Math.tanh(sum);
        }

        let out=[];

        for(let o=0;o<this.o;o++){

            let sum=0;

            for(let h=0;h<this.h;h++)
                sum+=hidden[h]*this.w2[h][o];

            out[o]=Math.tanh(sum);
        }

        return {
            hidden,
            out
        };
    }
}

////////////////////////////////////////////////
// Drone
////////////////////////////////////////////////

class Drone{

    constructor(brain){

        this.x=80;
        this.y=300;

        this.vx=0;
        this.vy=0;

        this.r=6;

        this.alive=true;

        this.score=0;

        this.brain=brain || new Brain();
    }

    sense(){

        return [

            this.x/W,
            this.y/H,

            (target.x-this.x)/W,
            (target.y-this.y)/H,

            this.nearestObstacle()
        ];
    }

    nearestObstacle(){

        let d=1;

        obstacles.forEach(o=>{

            let dx=o.x-this.x;
            let dy=o.y-this.y;

            let dist=Math.sqrt(dx*dx+dy*dy)/300;

            if(dist<d) d=dist;
        });

        return d;
    }

    update(){

        if(!this.alive) return;

        let brainData=this.brain.feed(this.sense());

        let ax=brainData.out[0];
        let ay=brainData.out[1];

        this.vx+=ax*0.3;
        this.vy+=ay*0.3;

        this.vx*=0.95;
        this.vy*=0.95;

        this.x+=this.vx;
        this.y+=this.vy;

        if(this.x<0||this.x>W||this.y<0||this.y>H)
            this.alive=false;

        obstacles.forEach(o=>{

            let dx=this.x-o.x;
            let dy=this.y-o.y;

            if(dx*dx+dy*dy<(o.r+this.r)*(o.r+this.r))
                this.alive=false;
        });

        let tx=this.x-target.x;
        let ty=this.y-target.y;

        let d=Math.sqrt(tx*tx+ty*ty);

        this.score=1000-d;

        if(d<20){

            this.score+=5000;

            target.x=Math.random()*700+150;
            target.y=Math.random()*500+50;
        }

        return brainData;
    }

    draw(){

        ctx.beginPath();
        ctx.fillStyle=this.alive ? "#c084fc":"#444";
        ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
        ctx.fill();
    }
}

////////////////////////////////////////////////

let drones=[];

for(let i=0;i<POP;i++)
    drones.push(new Drone());

let frame=0;

////////////////////////////////////////////////

function evolve(){

    drones.sort((a,b)=>b.score-a.score);

    let best=drones[0];

    history.push(best.score);

    document.getElementById("best").innerText=
    Math.floor(best.score);

    let next=[];

    next.push(new Drone(best.brain.clone()));

    for(let i=1;i<POP;i++){

        let child=best.brain.clone();

        child.mutate();

        next.push(new Drone(child));
    }

    drones=next;

    generation++;

    document.getElementById("gen").innerText=generation;
}

////////////////////////////////////////////////

function drawBrain(drone){

    brainCtx.clearRect(0,0,300,250);

    let inputX=40;
    let hiddenX=150;
    let outputX=260;

    let data=drone.brain.feed(drone.sense());

    let inp=[];
    let hid=[];
    let out=[];

    for(let i=0;i<5;i++)
        inp.push([inputX,40+i*35]);

    for(let i=0;i<6;i++)
        hid.push([hiddenX,30+i*30]);

    for(let i=0;i<2;i++)
        out.push([outputX,90+i*60]);

    brainCtx.strokeStyle="#c084fc";

    inp.forEach((a,ai)=>{

        hid.forEach((b,bi)=>{

            brainCtx.globalAlpha=
            Math.abs(drone.brain.w1[ai][bi]);

            brainCtx.beginPath();
            brainCtx.moveTo(...a);
            brainCtx.lineTo(...b);
            brainCtx.stroke();
        });
    });

    hid.forEach((a,ai)=>{

        out.forEach((b,bi)=>{

            brainCtx.globalAlpha=
            Math.abs(drone.brain.w2[ai][bi]);

            brainCtx.beginPath();
            brainCtx.moveTo(...a);
            brainCtx.lineTo(...b);
            brainCtx.stroke();
        });
    });

    brainCtx.globalAlpha=1;

    [...inp,...hid,...out].forEach(n=>{

        brainCtx.fillStyle="#d8b4fe";

        brainCtx.beginPath();
        brainCtx.arc(n[0],n[1],8,0,Math.PI*2);
        brainCtx.fill();
    });
}

////////////////////////////////////////////////

function drawChart(){

    chartCtx.clearRect(0,0,300,250);

    if(history.length<2) return;

    let max=Math.max(...history);

    chartCtx.strokeStyle="#c084fc";
    chartCtx.lineWidth=3;

    chartCtx.beginPath();

    history.forEach((v,i)=>{

        let x=i*(300/history.length);

        let y=220-(v/max)*180;

        if(i===0)
            chartCtx.moveTo(x,y);
        else
            chartCtx.lineTo(x,y);
    });

    chartCtx.stroke();
}

////////////////////////////////////////////////

function loop(){

    ctx.clearRect(0,0,W,H);

    frame++;

    let bestDrone=drones[0];

    drones.forEach(d=>{

        let b=d.update();

        if(d.score>bestDrone.score)
            bestDrone=d;

        d.draw();
    });

    obstacles.forEach(o=>{

        ctx.beginPath();
        ctx.fillStyle="#ef4444";
        ctx.arc(o.x,o.y,o.r,0,Math.PI*2);
        ctx.fill();
    });

    ctx.beginPath();
    ctx.fillStyle="#22c55e";
    ctx.arc(target.x,target.y,target.r,0,Math.PI*2);
    ctx.fill();

    drawBrain(bestDrone);
    drawChart();

    if(frame>600){

        evolve();
        frame=0;
    }

    requestAnimationFrame(loop);
}

loop();

////////////////////////////////////////////////
// DRAW OBSTACLE
////////////////////////////////////////////////

let drawing=false;

canvas.addEventListener("mousedown",()=>{
    drawing=true;
});

canvas.addEventListener("mouseup",()=>{
    drawing=false;
});

canvas.addEventListener("mousemove",(e)=>{

    if(!drawing) return;

    let r=canvas.getBoundingClientRect();

    obstacles.push({
        x:e.clientX-r.left,
        y:e.clientY-r.top,
        r:15
    });
});

////////////////////////////////////////////////
// MOVE TARGET
////////////////////////////////////////////////

canvas.addEventListener("dblclick",(e)=>{

    let r=canvas.getBoundingClientRect();

    target.x=e.clientX-r.left;
    target.y=e.clientY-r.top;
});

////////////////////////////////////////////////

document.getElementById("clearBtn")
.onclick=()=>obstacles=[];