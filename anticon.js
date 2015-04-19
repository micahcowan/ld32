"use strict";

/*
    TODO:

    - Sound for player hit
    - player death
    - score
    - more complex play/baddies
    - graphics
*/

var AntiCon = new (function() {
    // Just a namespace.

    var AC = this; // Internal-only shorthand for AntiCon namespace
    AC.game = null;
    AC.songInst = null;

    AC.init = function() {
        var cvs = AC.canvas = document.getElementById('anticonCvs');
        var scr = AC.screen = cvs.getContext("2d");
        scr.fillStyle = 'black';
        scr.textAlign = 'center';
        scr.font = '24px Arial, Helvetica, sans-serif';
        scr.fillText("Click here to begin!", ACK.WIDTH / 2, ACK.HEIGHT / 2);

        // Listen for clickies.
        cvs.addEventListener('mouseup', AC.start);
        cvs.addEventListener('click', AC.start);
        cvs.addEventListener('touchstart', AC.start);
        cvs.addEventListener('touchmove', AC.start);

        // Start loading sounds.
        createjs.Sound.registerPlugins([createjs.WebAudioPlugin,
                                        createjs.HTMLAudioPlugin]);
        AC.laughSnds = [
            'high-whoo'
          , 'laugh1'
          , 'squee'
          , 'whee'
          , 'whoo'
          , 'whoo2'
        ];
        for (var i=0; i < AC.laughSnds.length; ++i) {
            var sound = AC.laughSnds[i];
            createjs.Sound.registerSound(sound + '.mp3', sound);
        }
        var otherSnds = [
            'whoosh'
          , 'pop'
          , 'ouch'
          , 'aw-man'
        ];
        for (var i=0; i < otherSnds.length; ++i) {
            var sound = otherSnds[i];
            createjs.Sound.registerSound(sound + '.mp3', sound);
        }

        createjs.Sound.registerSound('anticon-intro.mp3', 'intro');
        createjs.Sound.registerSound('anticon-loop.mp3', 'loop');
        createjs.Sound.on('fileload', AC.handleLoad);
    };

    AC.songLoaded = 0;
    AC.handleLoad = function(ev) {
        if (ev.id == 'intro' || ev.id == 'loop')
            AC.songLoaded++;
        if (AC.songLoaded == 2 && AC.game !== null) {
            AC.playIntro();
        }
    };

    AC.playIntro = function() {
        AC.songInst = createjs.Sound.play('intro');
        AC.songInst.on('complete', AC.playLoop);
        window.addEventListener("keyup",
            function(ev) { AC.handleKeyUp(ev); }, false);
    };
    AC.playLoop = function(ev) {
        AC.songInst = createjs.Sound.play('loop', {loop: -1});
    };

    AC.handleKeyUp = function(ev) {
        var k = getKProp(ev);
        var music = AC.songInst;
        var MUSIC_KEYS = ['M', 'm', 'U+004D'];
        if (MUSIC_KEYS.indexOf(k) != -1 && music != undefined) {
            music.pause() || music.resume();
        }
    };

    // Finds the right property to look up key names.
    function getKProp(ev) {
        var k = ev.key;
        if (k === undefined) {
            k = ev.keyIdentifier;
        }
        return k;
    }

    AC.start = function(ev) {
        var cvs = AC.canvas;
        cvs.removeEventListener('mouseup', AC.start);
        cvs.removeEventListener('click', AC.start);
        cvs.removeEventListener('touchstart', AC.start);
        cvs.removeEventListener('touchmove', AC.start);
        ev.stopPropagation();
        ev.preventDefault();
        AC.game = new AC.Game(ev);
    };

    AC.Game = function(ev) {
        var ACG = this;

        if (AC.songLoaded == 2) {
            AC.playIntro();
        }

        ACG.state = new AC.GameState(ev);

        // Function, not a method. Called via timeout.
        ACG.update = function() {
            ACG.state.update();
            ACG.draw();
            if (ACG.state.laughing) {
                ACG.state.laughing = false;
                var i = Math.floor( Math.random() * AC.laughSnds.length );
                var inst = createjs.Sound.play(AC.laughSnds[i]);
                inst.volume = 0.40;
            }
            while (ACG.state.sounds.length != 0) {
                var sound = ACG.state.sounds.pop();
                var inst = createjs.Sound.play(sound);
            }
            ACG.tmout = window.setTimeout(ACG.update, ACK.MSECS_PER_FRAME);
        };

        ACG.draw = function() {
            var scr = AC.screen;
            var st = this.state;

            // Clear screen
            scr.clearRect(0, 0, ACK.WIDTH, ACK.HEIGHT);

            // Draw sprites
            for (var i=0; i < st.sprites.length; ++i) {
                st.sprites[i].draw(scr);
            }

            // Draw tether
            scr.beginPath();
            if (false) {
                // Uncomment this to see the tensor
                scr.lineWidth = 1.5;
                scr.moveTo(st.playerPos.x, st.playerPos.y)
                scr.lineTo(st.tensorPos.x, st.tensorPos.y);
                scr.lineTo(st.weaponPos.x, st.weaponPos.y);
                scr.strokeStyle = 'silver';
                scr.stroke();
            }
            scr.beginPath();
            scr.moveTo(st.playerPos.x, st.playerPos.y)
            scr.quadraticCurveTo(st.tensorPos.x, st.tensorPos.y,
                                 st.weaponPos.x, st.weaponPos.y);
            scr.lineWidth = 4;
            scr.strokeStyle = 'black';
            scr.stroke();

            // Draw weapon
            scr.beginPath();
            scr.arc(st.weaponPos.x, st.weaponPos.y, ACK.WEAPON_RADIUS, 0, 2 * Math.PI);
            scr.fillStyle = 'red';
            scr.fill();
            if (st.weaponMomentum.length >= ACK.MIN_WEAPON_SPEED) {
                scr.lineWidth = 3.5;
                scr.strokeStyle = 'yellow';
            }
            else {
                scr.lineWidth = 1.5;
                scr.strokeStyle = 'black';
            }
            scr.stroke();

            // Draw player
            scr.beginPath();
            scr.arc(st.playerPos.x, st.playerPos.y, ACK.PLAYER_RADIUS, 0, 2 * Math.PI);
            var cycle = ACK.HIT_INVINCIBILITY / ACK.INVINCIBLE_FLASHES;
            if (st.invincible > 0 && (st.invincible % cycle)/cycle > 0.5)
                scr.fillStyle = 'silver';
            else
                scr.fillStyle = 'green';
            scr.fill();
            scr.lineWidth = 2;
            scr.strokeStyle = 'black';
            scr.stroke();
        };

        ACG.handleMouseMove = function(ev) {
            var x, y;
            if ('touches' in ev) {
                x = ev.touches[0].clientX;
                y = ev.touches[0].clientY;
            }
            else {
                x = ev.clientX;
                y = ev.clientY;
            }
            x -= AC.canvas.offsetLeft;
            y -= AC.canvas.offsetTop;
            ACG.state.mousePos = new P(x, y);

            ev.stopPropagation();
            ev.preventDefault();
        };

        AC.canvas.addEventListener('mousemove', ACG.handleMouseMove);
        AC.canvas.addEventListener('touchmove', ACG.handleMouseMove);
        AC.canvas.addEventListener('touchstart', ACG.handleMouseMove);
        ACG.tmout = window.setTimeout(ACG.update, ACK.MSECS_PER_FRAME);
    };

    AC.GameState = function(ev) {
        var S = this;

        S.lastFrameTime = new Date();
        S.gameElapsed = 0;

        var startPos = ACK.PLAYER_START;
        var oL = AC.canvas.offsetLeft;
        var oT = AC.canvas.offsetTop;
        if ('touches' in ev) {
            startPos = new P(ev.touches[0].clientX - oL,
                                    ev.touches[0].clientY - oT);
        }
        else if ('clientX' in ev) {
            startPos = new P(ev.clientX - oL, ev.clientY - oT);
        }

        S.mousePos  = startPos;
        S.playerPos = startPos;
        S.weaponPos = P.move(startPos, ACK.WEAPON_OFFSET);
        S.tensorPos = P.move(startPos, ACK.TENSOR_OFFSET);
        S.tensorMomentum = ACK.WEAPON_MOMENTUM;
        S.weaponMomentum = ACK.WEAPON_MOMENTUM;

        S.fastTime = 0;
        S.lastLaugh = 0;
        S.laughing = false;
        S.sounds = [];
        S.invincible = 0;

        this.sprites = [];
        this.track = new AC.LevelTrack();
    };
    AC.GameState.prototype = new (function() {
        this.addSprite = function(sprite) {
            this.sprites.push(sprite);
        };
        this.update = function() {
            var st = this;

            var now = new Date();
            var delta = now - st.lastFrameTime;
            st.lastFrameTime = now;
            if (delta > ACK.MAX_MSECS_PER_FRAME) {
                delta = ACK.MAX_MSECS_PER_FRAME;
            }
            st.gameElapsed += delta;

            if (st.invincible > 0) {
                st.invincible -= delta;
                if (st.invincible < 0)
                    st.invincible = 0;
            }

            // TODO: speed limit the player slightly?
            st.playerPos = st.mousePos;

            // WEAPON PHYSICS
            var weaponPos = st.weaponPos;
            var startWeaponPos = weaponPos;
            var weaponMomentum = st.weaponMomentum;
            var tensorPos = st.tensorPos;
            var tensorMomentum = st.tensorMomentum

            // First, apply any existing momentum.
            if (weaponMomentum.isNonZero) {
                var weaponMomentumThisFrame = V.scaleBy(weaponMomentum,
                                                        delta / 1000);
                weaponPos = V.move(weaponPos, weaponMomentumThisFrame);

                // Apply friction.
                var friction = ACK.WEAPON_FRICTION * delta/1000
                if (weaponMomentum.length <= ACK.WEAPON_FRICTION) {
                    weaponMomentum = new V(0, 0);
                }
                else {
                    weaponMomentum = V.lengthen(weaponMomentum,
                                                -ACK.WEAPON_FRICTION);
                }
            }
            if (tensorMomentum.isNonZero) {
                var tensorMomentumThisFrame = V.scaleBy(tensorMomentum,
                                                        delta / 1000);
                tensorPos = V.move(tensorPos, tensorMomentumThisFrame);

                // Apply friction.
                var friction = ACK.TENSOR_FRICTION * delta/1000
                if (tensorMomentum.length <= ACK.TENSOR_FRICTION) {
                    tensorMomentum = new V(0, 0);
                }
                else {
                    tensorMomentum = V.lengthen(tensorMomentum, -ACK.TENSOR_FRICTION);
                }
            }

            // Enforce the tether, and translate that into new momentum.
            var distVec = P.diff(st.playerPos, tensorPos);
            if (distVec.length > ACK.TENSOR_TETHER_STRETCH_LENGTH) {
                distVec = V.scaleTo(distVec,
                                    distVec.length - ACK.TENSOR_TETHER_STRETCH_LENGTH);
                tensorPos = P.move(tensorPos, distVec);
                var distVecPerSec = V.scaleBy(distVec, 1000 / delta);
                tensorMomentum = V.move(tensorMomentum, distVecPerSec);
                if (tensorMomentum.length > ACK.MAX_WEAPON_MOMENTUM) {
                    tensorMomentum = V.scaleTo(tensorMomentum,
                                               ACK.MAX_WEAPON_MOMENTUM);
                }
            }
            distVec = P.diff(tensorPos, weaponPos);
            if (distVec.length > ACK.WEAPON_TETHER_STRETCH_LENGTH) {
                distVec = V.scaleTo(distVec,
                                    distVec.length - ACK.WEAPON_TETHER_STRETCH_LENGTH);
                weaponPos = P.move(weaponPos, distVec);
                var distVecPerSec = V.scaleBy(distVec, 1000 / delta);
                weaponMomentum = V.move(weaponMomentum, distVecPerSec);
                if (weaponMomentum.length > ACK.MAX_WEAPON_MOMENTUM) {
                    weaponMomentum = V.scaleTo(weaponMomentum,
                                               ACK.MAX_WEAPON_MOMENTUM);
                }
            }
            // Is the tether stretched? Adjust momentum as needed.
            distVec = P.diff(st.playerPos, tensorPos);
            if (distVec.length > ACK.TENSOR_TETHER_LENGTH) {
                var tetherMomentum = V.lengthen(distVec, -ACK.TENSOR_TETHER_LENGTH);
                tetherMomentum = V.scaleBy(tetherMomentum,
                                           ACK.TETHER_SNAP * 1000 / delta);
                tensorMomentum = V.move(tensorMomentum, tetherMomentum);
            }
            distVec = P.diff(st.tensorPos, weaponPos);
            if (distVec.length > ACK.WEAPON_TETHER_LENGTH) {
                // Differs from one above - tensor and weapon each share
                // the tension, moving toward eachother.
                var tetherMomentum = V.lengthen(distVec, -ACK.WEAPON_TETHER_LENGTH);
                tetherMomentum = V.scaleBy(tetherMomentum,
                                           ACK.TETHER_SNAP * 1000 / delta);
                var w = V.scaleBy(tetherMomentum, 0.5);
                var t = V.scaleBy(tetherMomentum, -0.5);
                weaponMomentum = V.move(weaponMomentum, w);
                tensorMomentum = V.move(tensorMomentum, t);
            }
            // Save the new values back into state object.
            st.weaponPos = weaponPos;
            st.tensorPos = tensorPos;
            st.tensorMomentum = tensorMomentum;
            st.weaponMomentum = weaponMomentum;

            // Track weapon momentum, for laughing purposes.
            if (weaponMomentum.length >= ACK.LAUGH_SPEED) {
                st.fastTime += delta;

                if (st.fastTime >= ACK.LAUGH_MIN_TIME &&
                    (st.lastLaugh == 0
                     || st.fastTime - st.lastLaugh >= ACK.LAUGH_WAIT)) {
                    st.laughing = true;
                    st.lastLaugh = st.fastTime;
                }

                if (startWeaponPos.y < st.playerPos.y
                         && weaponPos.y < st.playerPos.y
                         && ((weaponPos.x < st.playerPos.x)
                             != (startWeaponPos.x < st.playerPos.x))) {
                    // We just passed above the player going reasonably
                    // fast. Go "whoosh".
                    st.sounds.push('whoosh');
                }
            }
            else {
                st.laughing = false;
                st.fastTime = 0;
                st.lastLaugh = 0;
            }

            this.track.run(st);
            for (var i=0; i < this.sprites.length; ) {
                var sprite = this.sprites[i];
                sprite.update(st, delta);

                if (sprite.isDead)
                    this.sprites.splice(i, 1);
                else
                    ++i;
            }
        };

        this.hurtPlayer = function() {
            this.sounds.push('ouch');
            this.invincible = ACK.HIT_INVINCIBILITY;
        };
    })();

    AC.Point = function(_x, _y) {
        var _length = undefined; // Used in "get" clojure for "length" prop.
        Object.defineProperties(this, {
            x: {
                value: _x
              , writable: false
              , configurable: false
            }
          , y: {
                value: _y
              , writable: false
              , configurable: false
            }
          , length: {
                get: function() {
                    if (_length === undefined) {
                        // Pythagorean theorem
                        _length = Math.sqrt(_x * _x + _y * _y);
                    }
                    return _length;
                }
            }
          , isNonZero: {
                get: function() {
                    return _x != 0 || _y != 0;
                }
            }
        });
    };
    AC.Point.prototype = {};
    AC.Point.prototype.constructor = AC.Point;
    AC.Point.prototype.create = function() {
        return new this.constructor(arguments);
    };

    AC.Point.move = function() {
        var pt, xOff, yOff;
        if (arguments.length == 3) {
            pt = arguments[0];
            xOff = arguments[1];
            yOff = arguments[2];
        }
        else if (arguments.length == 2) {
            // second arg is a vector
            pt = arguments[0];
            xOff = arguments[1].x;
            yOff = arguments[1].y;
        }
        else {
            throw ("Bad number of args (" + arguments.length
                   + ") to AntiCon.Point.move");
        }
        return new AC.Point(pt.x + xOff, pt.y + yOff);
    };

    // FIXME (make it a separate class that inherits?)
    AC.Vector = AC.Point;
    AC.Vector.diff = function(vecA, vecB) {
        return new AC.Vector(vecA.x - vecB.x, vecA.y - vecB.y);
    };
    AC.Vector.scaleBy = function(vec, scale) {
        return new AC.Vector(vec.x * scale, vec.y * scale);
    };
    AC.Vector.scaleTo = function(vec, length) {
        return AC.Vector.scaleBy(vec, length / vec.length);
    };
    AC.Vector.lengthen = function(vec, lengthDelta) {
        var remove = AC.Vector.scaleTo(vec, lengthDelta);
        return AC.Vector.move(vec, remove);
    };

    var P = AC.Point;
    var V = AC.Vector;

    // Object class for generating game events (like enemies)
    AC.LevelTrack = function() {
        this.nextEvent = [1000, AC.Enemy, new V(ACK.WIDTH / 3, 0),
                          new V(0, 80), new V(-5, 0)];
    };
    AC.LevelTrack.prototype = new (function() {
        this.run = function(state) {
            var ev = this.nextEvent;
            if (ev !== null && state.gameElapsed >= ev[0]) {
                var ctor = ev[1];
                ctor = ctor.bind.apply(ctor, [null].concat(ev.slice(2)));
                var thing = new ctor();
                state.addSprite(thing);
                thing.update(state, state.gameElapsed - ev[0]);

                // XXX
                this.nextEvent[0] += 1000;
                this.nextEvent[2] = new V(ACK.WIDTH - ev[2].x, 0);
                this.nextEvent[4] = new V(-ev[4].x, 0);
            }
        };
    })();

    AC.Enemy = function(_pos, _vel, _accel) {
        this.position = _pos;
        this.velocity = _vel;
        this.accel = _accel;
        this.isDead = false;

        if (_pos.y == 0) {
            this.position = P.move(_pos, 0, - this.height/2);
        }
    };
    AC.Enemy.prototype = new (function() {
        this.update = function(state, delta) {
            var frameVel = V.scaleBy(this.velocity, delta / 1000);
            this.position = P.move(this.position, frameVel);
            var frameAccel = V.scaleBy(this.accel, delta / 1000);
            this.velocity = V.move(this.velocity, frameAccel);
            if (this.position.y > ACK.HEIGHT + this.height/2) {
                this.isDead = true;
            }
            else if (this.killed) {
                this.killed -= delta;
                if (this.killed <= 0)
                    this.isDead = true;
            }
            else {
                if (state.weaponMomentum.length >= ACK.MIN_WEAPON_SPEED) {
                    // Check collision
                    if (AC.isCircleInRect(state.weaponPos,
                                          ACK.WEAPON_RADIUS, this.rect)) {
                        this.killed = ACK.SCORE_LINGER;
                        createjs.Sound.play('pop');
                    }
                }

                // Check player collision
                if (state.invincible == 0
                    && AC.isCircleInRect(state.playerPos, ACK.PLAYER_RADIUS,
                                         this.rect)) {
                    state.hurtPlayer();
                    // Kamikaze
                    this.killed = ACK.SCORE_LINGER;
                }
            }
        };
        this.draw = function(scr) {
            if (this.killed) {
                scr.save();
                scr.translate(this.position.x, this.position.y);
                scr.textAlign = 'center';
                scr.font = '14px Arial, Helvetica, sans-serif';
                scr.strokeStyle = 'WhiteSmoke';
                scr.lineWidth = 8;
                scr.strokeText(this.points, 0, 0);
                scr.fillStyle = 'black';
                scr.fillText(this.points, 0, 0);
                scr.restore();
            }
            else {
                // fillRect wants x, y, w, h.
                var rect = [this.position.x - this.width/2, this.position.y - this.height/2, this.width, this.height];
                scr.fillStyle = 'blue';
                scr.fillRect.apply(scr, rect);
                scr.lineWidth = 1.5;
                scr.strokeStyle = 'black';
                scr.strokeRect.apply(scr, rect);
            }
        }
        this.points = 100;
        this.position = new P(0,0);
        this.velocity = new V(0,0);
        this.width = 40;
        this.height = 60;
        Object.defineProperty(this, 'rect', {
            get: function() {
                     // t, l, b, r
                     var p = this.position;
                     var h = this.height;
                     var w = this.width;
                     return {
                         t: p.y - h/2
                       , l: p.x - w/2
                       , b: p.y + h/2
                       , r: p.x + w/2
                     };
                 }
        });
    })();

    // Utility function for collision detection
    AC.isCircleInRect = function(pos, r, rect) {
        // Note that checking whether a circle of radius r is within a
        // rect is the same as checking whether the center of that
        // circle is within a larger rectangle with rounded corners.
        var expRect = {
            t: rect.t - r
          , l: rect.l - r
          , b: rect.b + r
          , r: rect.r + r
        };

        // Are we within the maximum bounds of the expanded rectangle?
        if (AC.isPointInRect(pos, expRect)) {
            // Yes we are, so it's probably a collision. But additional
            // checking is necessary to be certain.
            if ((pos.x > rect.l && pos.x < rect.r)
                    || (pos.y > rect.t && pos.y < rect.b)) {
                // We're inside, away from corners, so we're good.
                return true;
            }
            else {
                var verts = ['t', 'b'];
                var hors  = ['l', 'r'];
                // corners: LT RT LB RB
                var corners = hors.map(function(a) {
                    return verts.map(function(b) { return [rect[a], rect[b]]; });
                });
                corners = corners[0].concat(corners[1]);
                for (var i=0; i < corners.length; ++i) {
                    var c = corners[i];
                    if (AC.isPointInRect(pos, {t: c[1] - r, l: c[0] - r,
                                               b: c[1] + r, r: c[0] + r})
                            && r >= Math.sqrt((pos.x - c[0]) * (pos.x - c[0])
                                              + (pos.y - c[1]) * (pos.y - c[1]))) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    AC.isPointInRect = function(pos, rect) {
        return (pos.x >= rect.l && pos.x <= rect.r
                && pos.y >= rect.t && pos.y <= rect.b);
    };

    AC.defs = new (function() {
        var K = this;
        K.WIDTH = 640;
        K.HEIGHT = 480;
        K.FRAMES_PER_SEC = 50;
        K.MSECS_PER_FRAME = 1000 / K.FRAMES_PER_SEC;
        K.MAX_MSECS_PER_FRAME = K.MSECS_PER_FRAME * 3;

        K.PLAYER_RADIUS = 14;
        K.WEAPON_RADIUS = 12;

        K.PLAYER_START = new P(K.WIDTH/2, K.HEIGHT/2);
        K.WEAPON_OFFSET = new V(-50, 70);
        K.WEAPON_MOMENTUM = new V(-400, -400);

        K.TETHER_LENGTH = 120;
        K.TETHER_STRETCH = 0.65; // fraction of tether length
        K.TETHER_STRETCH_LENGTH = K.TETHER_LENGTH * (1 + K.TETHER_STRETCH);
        K.TETHER_SNAP = 0.1;
        K.TENSOR = 0.67; // fraction of tether length where tensor lives
        K.TENSOR_OFFSET = V.scaleBy(K.WEAPON_OFFSET, K.TENSOR);
        K.TENSOR_TETHER_LENGTH = K.TETHER_LENGTH * K.TENSOR;
        K.TENSOR_TETHER_STRETCH_LENGTH = K.TENSOR_TETHER_LENGTH
            * (1 + K.TETHER_STRETCH);
        K.WEAPON_TETHER_LENGTH = K.TETHER_LENGTH - K.TENSOR_TETHER_LENGTH;
        K.WEAPON_TETHER_STRETCH_LENGTH = K.WEAPON_TETHER_LENGTH
            * (1 + K.TETHER_STRETCH);
        K.MAX_WEAPON_MOMENTUM = 1200; // pixels per second.
        K.WEAPON_FRICTION = 17; // pixels per second^2.
        K.TENSOR_FRICTION = 24; // pixels per second^2.
        K.MIN_WEAPON_SPEED = 400;

        K.LAUGH_SPEED = K.MAX_WEAPON_MOMENTUM * 3/4;
        K.LAUGH_MIN_TIME = 1500;
        K.LAUGH_WAIT = 5000;

        K.HIT_INVINCIBILITY = 1000; // ms spent invincible after being hit
        K.INVINCIBLE_FLASHES = 5; // How many flashes during invincibility

        K.SCORE_LINGER = 1000;
    })();
    var ACK = AC.defs;
})();

window.addEventListener('load', AntiCon.init);
