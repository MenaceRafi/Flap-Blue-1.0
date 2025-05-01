// Canvas & context
const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

// Audio
const menuMusic = new Audio("https://audio.jukehost.co.uk/bztf39eY1AuXRLFmNuo0xP2rkJVCCFv7");
menuMusic.loop = true;
menuMusic.volume = 1;

const gameMusic = new Audio("https://audio.jukehost.co.uk/4m6MklWaa8utAAb4i5d6fcwNkmJGvFqc");
gameMusic.loop = true;
gameMusic.volume = 1;

// State
let bird, obstacles = [], score = 0, highScore = 0, coinCount = 0;
let totalCoins = 0, ownKokil = false, ownMurgi = false, selectedBird = 'blue';
let speed = 2, gravity = 0.5, birdY = 150, birdVelocity = 0;
let passedPillars = 0, lastScoreUpdateTime = 0, isGameOver = false;
let gameInterval, obstacleInterval;

// Images
const vine1 = new Image(), vine2 = new Image();
vine1.src = 'https://i.postimg.cc/CK4zq9r6/vines.png';
vine2.src = 'https://i.postimg.cc/c1cGN0gz/Untitled-design-4.png';
const trunks = [
  'https://i.postimg.cc/mkt9c06W/Webp-net-resizeimage.png',
  'https://i.postimg.cc/KzkjH4vC/Untitled-design-3.png'
].map(src => { const i = new Image(); i.src = src; return i; });

const birdUp   = new Image(), birdDown   = new Image();
const kokilUp  = new Image(), kokilDown  = new Image();
const murgiUp  = new Image(), murgiDown  = new Image();
birdUp.src    = 'https://i.postimg.cc/RFxHy52d/wings-up.png';
birdDown.src  = 'https://i.postimg.cc/VNnSjZ5C/wings-down.png';
kokilUp.src   = 'https://i.postimg.cc/FKzCr0YB/kokil-wings-up.png';
kokilDown.src = 'https://i.postimg.cc/DZbCsFdQ/Untitled-design-5.png';
murgiUp.src   = 'https://i.postimg.cc/C1ZQMwfp/murgi-wing-up.png';
murgiDown.src = 'https://i.postimg.cc/4NRSZkfj/murgi-wing-down.png';

const coinImg = new Image(); coinImg.src = 'https://i.postimg.cc/C12m9bRG/coins.png';
const bgImg   = new Image(); bgImg.src   = 'https://i.postimg.cc/1RDTnY2w/in-game-bg.png';

// Persistence loaders
function loadHighScore()   { highScore   = +localStorage.getItem('flappyHighScore')   || 0; }
function loadTotalCoins()  { totalCoins  = +localStorage.getItem('flappyTotalCoins')  || 300; }
function loadKokilOwnership() {
  ownKokil = localStorage.getItem('kokilPurchased') === 'true';
  const b = document.getElementById('buyKokilButton');
  if (ownKokil) { b.disabled = true; b.innerText = 'Owned'; }
}
function loadMurgiOwnership() {
  ownMurgi = localStorage.getItem('murgiPurchased') === 'true';
  const b = document.getElementById('buyMurgiButton');
  if (ownMurgi) { b.disabled = true; b.innerText = 'Owned'; }
}
function loadSelectedBird(){
  selectedBird = localStorage.getItem('selectedBird') || 'blue';
}

// Store UI updates
function updateStoreButtons(){
  const sb = document.getElementById('selectBlueButton');
  sb.disabled = (selectedBird==='blue');
  sb.innerText = sb.disabled?'Selected':'Select';

  const bk = document.getElementById('buyKokilButton'),
        sk = document.getElementById('selectKokilButton');
  if(!ownKokil) sk.style.display='none';
  else {
    sk.style.display='block';
    sk.disabled = (selectedBird==='kokil');
    sk.innerText = sk.disabled?'Selected':'Select';
  }

  const bm = document.getElementById('buyMurgiButton'),
        sm = document.getElementById('selectMurgiButton');
  if(!ownMurgi) sm.style.display='none';
  else {
    sm.style.display='block';
    sm.disabled = (selectedBird==='murgi');
    sm.innerText = sm.disabled?'Selected':'Select';
  }
  document.getElementById('totalCoinsDisplay').innerText = `Total Coins: ${totalCoins}`;
}

function showStoreMessage(txt){
  const e = document.getElementById('storeMessage');
  e.innerText = txt; e.style.display = 'block';
  setTimeout(()=> e.style.display='none', 2000);
}

function buyKokil(){
  if(totalCoins<350){
    showStoreMessage("You need more coins, keep playing!"); return;
  }
  totalCoins -= 350;
  localStorage.setItem('flappyTotalCoins', totalCoins);
  localStorage.setItem('kokilPurchased','true');
  loadKokilOwnership(); updateStoreButtons();
}

function buyMurgi(){
  if(totalCoins<250){
    showStoreMessage("You need more coins, keep playing!"); return;
  }
  totalCoins -= 250;
  localStorage.setItem('flappyTotalCoins', totalCoins);
  localStorage.setItem('murgiPurchased','true');
  loadMurgiOwnership(); updateStoreButtons();
}

function selectBird(name){
  if(name==='kokil' && !ownKokil) return;
  if(name==='murgi' && !ownMurgi) return;
  selectedBird = name;
  localStorage.setItem('selectedBird', name);
  updateStoreButtons();
}

// Bird class
function Bird(){
  this.width  = 40; this.height = 40;
  this.x      = 50; this.y      = birdY;
  if(selectedBird==='kokil'){
    this.upImg = kokilUp; this.downImg = kokilDown;
  } else if(selectedBird==='murgi'){
    this.upImg = murgiUp; this.downImg = murgiDown;
  } else {
    this.upImg = birdUp; this.downImg = birdDown;
  }
  this.isFlap = true;
  this.jump   = ()=>{ birdVelocity = -6; this.isFlap = true; };
  this.update = ()=>{
    birdVelocity += gravity;
    this.y += birdVelocity;
    if(this.y < 0) this.y = 0;
    if(this.y + this.height > canvas.height){
      this.y = canvas.height - this.height;
      if(!isGameOver) endGame();
    }
    this.isFlap = !(this.y > birdY && birdVelocity > 0);
  };
  this.draw = ()=> {
    ctx.drawImage(
      this.isFlap ? this.upImg : this.downImg,
      this.x, this.y,
      this.width, this.height
    );
  };
}

// Obstacle class
function Obstacle(){
  this.width = 40;
  this.height = Math.random()*200 + 50;
  this.x = canvas.width;
  this.gap = 150;
  this.passed = false;
  this.hasCoin = true;
  this.vineImage  = (Math.random()>0.5) ? vine1 : vine2;
  this.trunkImage = trunks[Math.floor(Math.random() * trunks.length)];
}
Obstacle.prototype.update = function(){
  this.x -= speed;
  if(this.x + this.width < 0) obstacles.shift();
};
Obstacle.prototype.draw = function(){
  const vw = this.width + 10,
        vh = this.height,
        tx = this.x,
        ty = this.height + this.gap,
        tw = this.width + 10,
        th = canvas.height - ty;

  if(this.vineImage.complete){
    ctx.drawImage(this.vineImage, tx, 0, vw, vh);
    if(
      bird.x + bird.width > tx &&
      bird.x < tx + vw &&
      bird.y < vh
    ) return endGame();
  }

  if(this.trunkImage.complete){
    ctx.drawImage(this.trunkImage, tx, ty, tw, th);
    const pw = 20;
    if(
      (bird.x + bird.width > tx && bird.x < tx + pw && bird.y + bird.height > ty) ||
      (bird.x + bird.width > tx + pw && bird.x < tx + tw &&
       bird.y + bird.height > ty && bird.y < ty + th)
    ) return endGame();
  }

  if(this.hasCoin && coinImg.complete){
    const cx = tx + tw/2 - 10,
          cy = ty - this.gap/2 - 10;
    ctx.drawImage(coinImg, cx, cy, 20, 20);
    if(
      bird.x < cx + 20 && bird.x + bird.width > cx &&
      bird.y < cy + 20 && bird.y + bird.height > cy
    ){
      this.hasCoin = false;
      coinCount++;
      totalCoins++;
      localStorage.setItem('flappyTotalCoins', totalCoins);
      document.getElementById('coinCount').innerText = `Coins: ${coinCount}`;
      document.getElementById('totalCoinsDisplay').innerText = `Total Coins: ${totalCoins}`;
    }
  }
};

// Compliments
const compliments = [ "Nice job!", "You're awesome!", "Keep going!", "Great work!", "Fantastic!" ];
function showCompliment(){
  const e = document.getElementById('compliment');
  e.innerText = compliments[Math.floor(Math.random()*compliments.length)];
  e.style.display = 'block';
  setTimeout(()=> e.style.display='none', 2000);
}

// Music helpers
function showHomeMusic(){
  gameMusic.pause();
  menuMusic.play().catch(()=>{});
}
function showGameMusic(){
  menuMusic.pause();
  gameMusic.play().catch(()=>{});
}

// Navigation
function showHighScore(){
  loadHighScore();
  document.getElementById('highScoreDisplay').innerText = `High Score: ${highScore}`;
  ['homepage','gameScreen','gameOverScreen','storeScreen']
    .forEach(id=> document.getElementById(id).style.display='none');
  document.getElementById('highScoreScreen').style.display='flex';
  showHomeMusic();
}

function showStore(){
  loadTotalCoins(); loadKokilOwnership(); loadMurgiOwnership(); loadSelectedBird();
  updateStoreButtons();
  ['homepage','gameScreen','gameOverScreen','highScoreScreen']
    .forEach(id=> document.getElementById(id).style.display='none');
  document.getElementById('storeScreen').style.display='block';
  showHomeMusic();
}

// Start & loop
function startGame(){
  ['homepage','gameOverScreen','highScoreScreen','storeScreen']
    .forEach(id=> document.getElementById(id).style.display='none');
  document.getElementById('gameScreen').style.display='block';

  bird = new Bird();
  obstacles = [];
  score = 0;
  coinCount = 0;
  passedPillars = 0;
  isGameOver = false;
  birdVelocity = 0;
  lastScoreUpdateTime = 0;
  document.getElementById('coinCount').innerText = `Coins: ${coinCount}`;

  clearInterval(gameInterval);
  clearInterval(obstacleInterval);
  gameInterval     = setInterval(gameLoop,    1000 / 60);
  obstacleInterval = setInterval(() => obstacles.push(new Obstacle()), 1500);

  showGameMusic();
}

function gameLoop(){
  if(isGameOver) return;
  ctx.clearRect(0,0,canvas.width, canvas.height);
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  bird.update();
  bird.draw();

  obstacles.forEach(obs => {
    obs.update();
    obs.draw();

    if(!obs.passed && bird.x + bird.width > obs.x){
      obs.passed = true;
      passedPillars++;
      if(Date.now() - lastScoreUpdateTime >= 1000){
        score += 10;
        lastScoreUpdateTime = Date.now();
      }
      if(passedPillars % 3 === 0) showCompliment();
    }
  });

  document.getElementById('score').innerText    = `Score: ${score}`;
  document.getElementById('coinCount').innerText= `Coins: ${coinCount}`;
}

function endGame(){
  clearInterval(gameInterval);
  clearInterval(obstacleInterval);
  isGameOver = true;

  if(score > highScore){
    highScore = score;
    localStorage.setItem('flappyHighScore', highScore);
  }

  document.getElementById('scoreDisplay').innerText = `Score: ${score}`;
  ['homepage','gameScreen','highScoreScreen','storeScreen']
    .forEach(id=> document.getElementById(id).style.display='none');
  document.getElementById('gameOverScreen').style.display='flex';
  showHomeMusic();
}

function returnHome(){
  ['gameScreen','gameOverScreen','highScoreScreen','storeScreen']
    .forEach(id=> document.getElementById(id).style.display='none');
  document.getElementById('homepage').style.display = 'block';
  showHomeMusic();
}

// Input
document.addEventListener('click', ()=>{ if(!isGameOver) bird.jump(); });

// Initialize
window.onload = () => {
  loadHighScore();
  loadTotalCoins();
  loadKokilOwnership();
  loadMurgiOwnership();
  loadSelectedBird();
  updateStoreButtons();

  document.getElementById('homepage').style.display = 'block';
  showHomeMusic();
};

// expose to window for inline onclicks
window.startGame     = startGame;
window.showHighScore = showHighScore;
window.showStore     = showStore;
window.returnHome    = returnHome;
window.buyKokil      = buyKokil;
window.buyMurgi      = buyMurgi;
window.selectBird    = selectBird;
