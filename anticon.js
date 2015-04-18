"use strict";

var AntiCon = new (function() {
    // Just a namespace.

    var AC = this;
    AC.game = null;

    AC.init = function() {
        var cvs = AC.canvas = document.getElementById('anticonCvs');
        var scr = AC.screen = cvs.getContext("2d");
        scr.fillStyle = 'black';
        scr.font = '24px Arial, Helvetica, sans-serif';
        scr.fillText("Click here to begin!", 50, 100);

        // Listen for clickies.
        cvs.addEventListener('mouseup', AC.start);
        cvs.addEventListener('click', AC.start);
        cvs.addEventListener('touchstart', AC.start);
        cvs.addEventListener('touchmove', AC.start);
    };

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

        ACG.state = new AC.GameState(ev);

        // Function, not a method. Called via timeout.
        ACG.update = function() {
            ACG.updateState();
            ACG.draw();
            ACG.tmout = window.setTimeout(ACG.update, ACK.MSECS_PER_FRAME);
        };

        ACG.updateState = function() {
            var st = ACG.state;

            var now = new Date();
            var delta = now - st.lastFrameTime;
            st.lastFrameTime = now;
            if (delta > ACK.MAX_MSECS_PER_FRAME) {
                delta = ACK.MAX_MSECS_PER_FRAME;
            }
            st.gameElapsed += delta;

            // TODO: speed limit the player slightly?
            st.playerPos = st.mousePos;

            // WEAPON PHYSICS
            var weaponPos = st.weaponPos;
            var weaponMomentum = st.weaponMomentum;
            var P = AC.Point;
            var V = AC.Vector;

            // First, apply any existing momentum.
            if (weaponMomentum.isNonZero) {
                var weaponMomentumThisFrame = V.scaleBy(weaponMomentum,
                                                        delta / 1000);
                weaponPos = V.move(weaponPos, weaponMomentumThisFrame);

                // Apply friction.
                var friction = ACK.WEAPON_FRICTION * delta/1000
                if (weaponMomentum.length <= ACK.WEAPON_FRICTION) {
                    weaponMomentum = new AC.Vector(0, 0);
                }
                else {
                    weaponMomentum = V.lengthen(weaponMomentum,
                                                -ACK.WEAPON_FRICTION);
                }
            }

            // Enforce the tether, and translate that into new momentum.
            var distVec = P.diff(st.playerPos, weaponPos);
            if (distVec.length > ACK.TETHER_STRETCH_LENGTH) {
                distVec = V.scaleTo(distVec,
                                    distVec.length - ACK.TETHER_STRETCH_LENGTH);
                weaponPos = P.move(weaponPos, distVec);
                var distVecPerSec = V.scaleBy(distVec, 1000 / delta);
                weaponMomentum = V.move(weaponMomentum, distVecPerSec);
                if (weaponMomentum.length > ACK.MAX_WEAPON_MOMENTUM) {
                    weaponMomentum = V.scaleTo(weaponMomentum,
                                               ACK.MAX_WEAPON_MOMENTUM);
                }
            }
            // Is the tether stretched? Adjust momentum as needed.
            distVec = P.diff(st.playerPos, weaponPos);
            if (distVec.length > ACK.TETHER_LENGTH) {
                var tetherMomentum = V.lengthen(distVec, -ACK.TETHER_LENGTH);
                tetherMomentum = V.scaleBy(tetherMomentum,
                                           ACK.TETHER_SNAP * 1000 / delta);
                weaponMomentum = V.move(weaponMomentum, tetherMomentum);
            }
            // Save the new values back into state object.
            st.weaponPos = weaponPos;
            st.weaponMomentum = weaponMomentum;
        };

        ACG.draw = function() {
            var scr = AC.screen;
            var st = this.state;

            // Clear screen
            scr.clearRect(0, 0, ACK.WIDTH, ACK.HEIGHT);

            // Draw tether
            scr.beginPath();
            // simple line, for now
            scr.moveTo(st.playerPos.x, st.playerPos.y)
            scr.lineTo(st.weaponPos.x, st.weaponPos.y);
            scr.strokeStyle = '1.5px black';
            scr.stroke();

            // Draw weapon
            scr.beginPath();
            scr.arc(st.weaponPos.x, st.weaponPos.y, ACK.WEAPON_RADIUS, 0, 2 * Math.PI);
            scr.fillStyle = 'red';
            scr.fill();
            scr.strokeStyle = '1.5px black';
            scr.stroke();

            // Draw player
            scr.beginPath();
            scr.arc(st.playerPos.x, st.playerPos.y, ACK.PLAYER_RADIUS, 0, 2 * Math.PI);
            scr.fillStyle = 'green';
            scr.fill();
            scr.strokeStyle = '2px black';
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
            ACG.state.mousePos = new AC.Point(x, y);
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
            startPos = new AC.Point(ev.touches[0].clientX - oL,
                                    ev.touches[0].clientY - oT);
        }
        else if ('clientX' in ev) {
            startPos = new AC.Point(ev.clientX - oL, ev.clientY - oT);
        }
        ev.stopPropagation();
        ev.preventDefault();

        S.mousePos  = startPos;
        S.playerPos = startPos;
        S.weaponPos = AC.Point.move(startPos, ACK.WEAPON_OFFSET);
        S.weaponMomentum = new AC.Vector(0, 0);
    };

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

    AC.defs = new (function() {
        var K = this;
        K.WIDTH = 640;
        K.HEIGHT = 480;
        K.FRAMES_PER_SEC = 50;
        K.MSECS_PER_FRAME = 1000 / K.FRAMES_PER_SEC;
        K.MAX_MSECS_PER_FRAME = K.MSECS_PER_FRAME * 3;

        K.PLAYER_RADIUS = 14;
        K.WEAPON_RADIUS = 12;

        K.PLAYER_START = new AC.Point(K.WIDTH/2, K.HEIGHT/2);
        K.WEAPON_OFFSET = new AC.Vector(-50, 70);

        K.TETHER_LENGTH = 100;
        K.TETHER_STRETCH = 0.85; // fraction of tether length
        K.TETHER_STRETCH_LENGTH = K.TETHER_LENGTH * (1 + K.TETHER_STRETCH);
        K.TETHER_SNAP = 0.1;
        K.MAX_WEAPON_MOMENTUM = 800; // pixels per second.
        K.WEAPON_FRICTION = 27; // pixels per second^2.
    })();
    var ACK = AC.defs;
})();

window.addEventListener('load', AntiCon.init);
