var sketchProc = function(processingInstance) {
  with(processingInstance) {
    size(600, 600);
    frameRate(60);
    console.log("hi");

    var start, time, level, allBalls, allBricks, allOptions, bar, ball, limit_height, systems;
    var currentScene = 'intro';

    //BRICK && OPTIONS
    var Common = function() {
      this.update = function() {
        this.position.add(this.velocity);
        this.velocity.add(this.acceleration);
      };

      this.collide_wall = function() {
        if (this.position.x < this.size / 2) {
          this.velocity.x = Math.abs(this.velocity.x);
        } else if (this.position.x > width - this.size / 2) {
          this.velocity.x = -Math.abs(this.velocity.x);
        }
        if (this.position.y < this.size / 2) {
          this.velocity.y = Math.abs(this.velocity.y);
        }
      };
    };

    var Brick = function(i, j) {
      Common.call(this);
      this.i = i;
      this.j = j;
      this.mass = 10;
      this.size = 28;
      this.position = new PVector(random(this.size / 2, width - this.size / 2), random(this.size / 2, 100 - this.size / 2));
      this.velocity = new PVector(random(-3, 3), random(-3, 3));
      this.acceleration = new PVector();
      allBricks.push(this);
    };

    Brick.prototype.collide_ball = function(ball) {
      var d = this.size / 2 + ball.size / 2;
      var p = PVector.sub(this.position, ball.position);
      return p.dot(p) <= d * d;
    };

    Brick.prototype.align = function(ball) {
      var d = ball.size / 2 + this.size / 2, // dist between centers at impact
        p = PVector.sub(ball.position, this.position), // delta positions
        v = PVector.sub(ball.velocity, this.velocity), // delta velocities
        // Quadratic formula for (a)t² + (b)t + c = 0
        a = v.dot(v), // t² coefficient
        b = p.dot(v) * 2, // t coefficient
        c = p.dot(p) - d * d, // constant
        t = (-b - sqrt(b * b - 4 * a * c)) / (2 * a); // the answer!

      // Back them up to the touching point
      ball.position.add(PVector.mult(ball.velocity, t));
      this.position.add(PVector.mult(this.velocity, t));
    };

    Brick.prototype.bounce = function(ball) {
      var p = PVector.sub(ball.position, this.position), // delta positions
        v = PVector.sub(ball.velocity, this.velocity), // delta velocities
        cf = ball.size / 2 + this.size / 2; // common factor
      cf = 2 * v.dot(p) / (cf * cf * (ball.mass + this.mass));

      ball.velocity.sub(PVector.mult(p, cf * this.mass));
      this.velocity.add(PVector.mult(p, cf * ball.mass));
    };

    Brick.prototype.collide_limit_height = function() {
      limit_height = 100 + (millis() - start) / 250;

      stroke(230, 67, 67);
      line(0, limit_height, width, limit_height);
      stroke(190, 191, 196);
      line(0, height - 30, width, height - 30);

      if (this.position.y > limit_height - this.size / 2) {
        this.velocity.y = -Math.abs(this.velocity.y);
      }
    };

    Brick.prototype.display = function() {
      this.color = color(255, 240 - level[this.i][this.j] * 20, 260 - level[this.i][this.j] * 20);
      this.fill = color(255, 240 - level[this.i][this.j] * 20, 260 - level[this.i][this.j] * 20, 50);
      stroke(this.color);
      fill(this.fill);
      ellipse(this.position.x, this.position.y, this.size, this.size);
      textAlign(CENTER, CENTER);
      fill(255, 255, 255);
      textSize(10);
      text(level[this.i][this.j], this.position.x, this.position.y);
    };

    Brick.prototype.run = function() {
      this.collide_limit_height();
      this.display();
      this.update();
      this.collide_wall();
    };

    var Particle = function(position, velocity, color) {
      this.acceleration = new PVector();
      this.position = position.get();
      this.velocity = velocity;
      this.color = color;
      this.timeToLive = 28;
    };

    Particle.prototype.run = function() {
      this.update();
      this.display();
    };

    Particle.prototype.update = function() {
      this.velocity.add(this.acceleration);
      this.position.add(this.velocity);
      this.timeToLive -= 1;
    };

    Particle.prototype.display = function() {
      stroke(this.color);
      fill(155, 155, 155, this.timeToLive);
      ellipse(this.position.x, this.position.y, this.timeToLive, this.timeToLive);
    };

    Particle.prototype.isDead = function() {
      if (this.timeToLive < 0) {
        return true;
      } else {
        return false;
      }
    };

    var ParticleSystem = function(brick) {
      this.origin = brick.position;
      this.velocity = brick.velocity;
      this.color = brick.color;
      this.particles = [];
      this.timeToLive = 28;
    };

    ParticleSystem.prototype.addParticle = function() {
      this.particles.push(new Particle(this.origin, this.velocity, this.color));
    };

    ParticleSystem.prototype.run = function() {
      for (var i = this.particles.length - 1; i >= 0; i--) {
        var p = this.particles[i];
        p.run();
        if (p.isDead()) {
          this.particles.splice(i, 1);
        }
      }
      this.timeToLive -= 1;
    };

    var op1 = ["V+", color(121, 227, 102)];
    var op2 = ["V-", color(121, 227, 102)];
    var op3 = ["S+", color(191, 199, 76)];
    var op4 = ["S-", color(191, 199, 76)];
    var op5 = ["W+", color(238, 255, 0)];
    var op6 = ["W-", color(238, 255, 0)];
    var op7 = ["P+", color(255, 82, 189)];
    var op8 = ["N+", color(154, 159, 230)];
    var options = [op1, op2, op3, op4, op5, op6, op7, op8];

    var Options = function(id) {
      Common.call(this);
      this.id = id;
      this.size = 20;
      this.position = new PVector(random(this.size / 2, width - this.size / 2), random(this.size / 2, height / 2 - this.size / 2 - 50));
      this.velocity = new PVector(random(-2, 2), random(-3, 0));
      this.acceleration = new PVector(0, 0.03);
      allOptions.push(this);
    };

    Options.prototype.display = function() {
      noStroke();
      fill(this.id[1]);
      ellipse(this.position.x, this.position.y, this.size, this.size);
      textAlign(CENTER, CENTER);
      textSize(10);
      fill(0, 0, 0);
      text(this.id[0], this.position.x, this.position.y);
    };

    Options.prototype.collide_bar = function(bar) {
      return (dist(0, this.position.y, 0, bar.position.y) < (bar.height + this.size) / 2 &&
        dist(this.position.x, 0, bar.position.x, 0) < (bar.width + this.size) / 2);
    };

    Options.prototype.run = function() {
      this.display();
      this.update();
      this.collide_wall();
    };

    //BAR
    var Bar = function(position, width) {
      this.position = position;
      this.width = width;
      this.height = 10;
    };

    Bar.prototype.display = function() {
      noStroke();
      fill(0, 155, 255);
      rectMode(CENTER);
      rect(this.position.x, this.position.y, this.width, this.height);
    };

    //BALL
    var Ball = function(config) {
      Common.call(this);
      this.size = config.size || 15;
      this.mass = this.size * 0.2;
      this.position = config.position || new PVector(bar.position.x, bar.position.y - 15);
      this.velocity = config.velocity || new PVector(random(-2, 2), -4);
      this.acceleration = new PVector();
      this.color = config.color || color(255, 191, 0);
      this.power = config.power || false;
      this.powerTime = config.powerTime || 0;
      allBalls.push(this);
    };

    Ball.prototype.display = function() {
      noStroke();
      fill(this.color);
      ellipse(this.position.x, this.position.y, this.size, this.size);
    };

    Ball.prototype.collide_bar = function() {
      if (this.position.y >= bar.position.y - this.size / 2 - 5 &&
        this.position.y <= bar.position.y - this.size / 2 + 5 &&
        this.position.x > bar.position.x - (bar.width / 2 + this.size / 2) &&
        this.position.x < bar.position.x + (bar.width / 2 + this.size / 2)) {
        var velocity_dx;
        if (this.position.x < bar.position.x) {
          velocity_dx = -0.04 * dist(bar.position.x, 0, this.position.x, 0);
        } else {
          velocity_dx = 0.04 * dist(bar.position.x, 0, this.position.x, 0);
        }
        this.velocity.x += velocity_dx;
        this.velocity.y = -Math.abs(this.velocity.y);
      }
    };

    Ball.prototype.run = function() {
      this.display();
      this.update();
      this.collide_wall();
      this.collide_bar();
    };

    var reset = function(lev) {
      start = millis();
      if (lev === 1) {
        level = [
          [1, 3, 5, 7, 9, 7, 5, 3, 1],
          [1, 3, 5, 7, 9, 7, 5, 3, 1],
          [1, 3, 5, 7, 9, 7, 5, 3, 1]
        ];
      }
      bar = new Bar(new PVector(width / 2, height - 25), 80);
      allBalls = [];
      allBricks = [];
      allOptions = [];
      ball = new Ball({});
      for (var i = 0; i < level.length; i++) {
        for (var j = 0; j < level[0].length; j++) {
          var brick = new Brick(i, j);
        }
      }
      systems = [];
    };

    var mainScene = function() {
      currentScene = 'main';
      time = ((millis() - start) / 1000).toFixed(2);
      background(41, 35, 41);

      bar.display();

      for (var i = allBalls.length - 1; i >= 0; i--) {
        var ball = allBalls[i];
        ball.run();

        if (ball.position.y > height) {
          allBalls.splice(i, 1);
        }

        if (frameCount - ball.powerTime > 300) {
          ball.power = false;
          ball.color = color(255, 191, 0);
        }
      }

      for (var l = allBricks.length - 1; l >= 0; l--) {
        var brick = allBricks[l];
        brick.run();

        for (var k = allBalls.length - 1; k >= 0; k--) {
          var ball = allBalls[k];

          if (brick.collide_ball(ball)) {
            systems.push(new ParticleSystem(brick));
            if (level[brick.i][brick.j] === 1) {
              allBricks.splice(l, 1);
            }
            if (ball.power === true) {
              level[brick.i][brick.j] = 1;
            } else {
              level[brick.i][brick.j] -= 1;
              brick.align(ball);
              brick.bounce(ball);
            }
          }
        }
      }

      for (var i = 0; i < systems.length; i++) {
        if (frameCount % 3 === 0) {
          systems[i].addParticle();
        }
        systems[i].run();
        if (systems[i].timeToLive < 0) {
          systems.splice(i, 1);
        }
      }

      for (var m = allOptions.length - 1; m >= 0; m--) {
        var option = allOptions[m];
        option.run();

        if (option.position.y > height) {
          allOptions.splice(m, 1);
        }

        if (option.collide_bar(bar)) {
          switch (option.id) {
            case op1:
              for (var n = 0; n < allBalls.length; n++) {
                var ball = allBalls[n];
                if (ball.velocity.mag() < 14) {
                  var mag = ball.velocity.mag();
                  ball.velocity.normalize();
                  ball.velocity.mult(mag + 3);
                }
              }
              break;
            case op2:
              for (var n = 0; n < allBalls.length; n++) {
                var ball = allBalls[n];
                if (ball.velocity.mag() > 2) {
                  var mag = ball.velocity.mag();
                  ball.velocity.normalize();
                  ball.velocity.mult(mag - 1);
                }
              }
              break;
            case op3:
              for (var n = 0; n < allBalls.length; n++) {
                var ball = allBalls[n];
                if (ball.size < width / 3) {
                  ball.size += 10;
                }
              }
              break;
            case op4:
              for (var n = 0; n < allBalls.length; n++) {
                var ball = allBalls[n];
                if (ball.size > 5) {
                  ball.size -= 5;
                }
              }
              break;
            case op5:
              if (bar.width < width / 1.5) {
                bar.width += 30;
              }
              break;
            case op6:
              if (bar.width > width / 8) {
                bar.width -= 15;
              }
              break;
            case op7:
              for (var n = 0; n < allBalls.length; n++) {
                var ball = allBalls[n];
                if (ball.power === false) {
                  ball.power = true;
                  ball.powerTime = frameCount;
                  ball.color = color(217, 59, 59);
                }
              }
              break;
            case op8:
              var ball = new Ball({});
              break;
          }
          allOptions.splice(m, 1);
        }
      }

      if (frameCount % 300 === 0) {
        var ran_op = options[floor(random(0, options.length))];
        var new_op = new Options(ran_op);
      }

      fill(255, 255, 255);
      textAlign(LEFT, CENTER);
      text(allBricks.length + "\n" + time, 8, height - 15);

      if (allBalls.length === 0 || limit_height > height - 30) {
        currentScene = 'fail';
      } else if (allBricks.length === 0) {
        currentScene = 'success';
      }
    };

    var introScene = function() {
      currentScene = 'intro';
      background(color(0, 0, 0));
      textAlign(CENTER, CENTER);
      fill(0, 155, 255);
      textSize(39);
      text("BRICK BREAKER", width / 2, height / 4);
    };

    var failScene = function() {
      currentScene = 'fail';
      background(0, 0, 0);
      fill(253, 249, 22);
      rectMode(CORNER);
      rect(width / 5.7, height / 4.0, width / 1.5, height / 6);

      textAlign(CENTER, CENTER);
      textSize(25);
      fill(0, 0, 0);
      text("GAME OVER", width / 2.0, height / 3);
    };

    var successScene = function() {
      currentScene = 'success';
      background(0, 0, 0);
      rectMode(CORNER);
      fill(165, 237, 50);
      rect(width / 5.0, height / 3.8, width / 1.7, height / 3.0);
      fill(255, 232, 25);
      rect(width / 2.9, height / 5.3, width / 3.3, height / 8);

      textAlign(CENTER, CENTER);
      textSize(25);
      fill(0, 0, 0);
      text(time + "sec", width / 2.0, height / 3.95);
      text("Success!!", width / 2.0, height / 2.30);
    };

    var Button = function(config) {
      this.x = config.x;
      this.y = config.y;
      this.text_x = config.text_x;
      this.text_y = config.text_y;
      this.label = config.label;
      this.onClick = config.onClick || function() {};
      this.width = config.width || 150;
      this.height = config.height || 50;
    };

    Button.prototype.display = function() {
      noStroke();
      fill(0, 155, 255);
      rect(this.x, this.y, this.width, this.height, 5);
      textAlign(CENTER, CENTER);
      fill(0, 0, 0);
      textSize(25);
      text(this.label, this.x + this.text_x, this.y + this.text_y);
    };

    Button.prototype.isMouseInside = function() {
      return mouseX > this.x &&
        mouseX < (this.x + this.width) &&
        mouseY > this.y &&
        mouseY < (this.y + this.height);
    };

    Button.prototype.handleMouseClick = function() {
      if (this.isMouseInside()) {
        this.onClick();
      }
    };

    var playbtn = new Button({
      x: width / 2 - 70,
      y: height / 1.5,
      text_x: 73,
      text_y: 25,
      label: "PLAY",
      onClick: function() {
        reset(1);
        currentScene = 'main';
      }
    });

    var rebtn = new Button({
      x: width / 2 - 70,
      y: height / 1.5,
      text_x: 76,
      text_y: 26,
      label: "REPLAY",
      onClick: function() {
        reset(1);
        currentScene = 'main';
      }
    });

    mouseClicked = function() {
      if (currentScene === 'intro') {
        playbtn.handleMouseClick();
      } else if (currentScene === 'fail' || currentScene === 'success') {
        rebtn.handleMouseClick();
      }
    };

    mouseMoved = function() {
      if (currentScene === 'main') {
        bar.position.x = mouseX;
        bar.position.x = constrain(bar.position.x, bar.width / 2, width - bar.width / 2);
        bar.position.y = height - 25;
      }
    };

    draw = function() {
      if (currentScene === 'main') {
        mainScene();
      } else if (currentScene === 'intro') {
        introScene();
        playbtn.display();
      } else if (currentScene === 'fail') {
        failScene();
        rebtn.display();
      } else {
        successScene();
        rebtn.display();
      }
    };

  }
};

// Get the canvas that Processing-js will use
var canvas = document.getElementById("mycanvas");
// Pass the function sketchProc (defined in myCode.js) to Processing's constructor.
var processingInstance = new Processing(canvas, sketchProc);