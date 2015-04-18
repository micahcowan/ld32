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
        window.addEventListener('click', AC.start);
    };

    AC.start = function() {
        window.removeEventListener('click', AC.start);
        AC.game = new AC.Game();
    };

    AC.Game = function() {
        var ACG = this;
        AC.screen.clearRect(0, 0, ACK.WIDTH, ACK.HEIGHT);
        AC.screen.fillText("Congratulations!", 50, 100);

        ACG.state = new AC.GameState();

        // Function, not a method. Called via timeout.
        ACG.update = function() {
            ACG.updateState();
            ACG.draw();
            ACG.tmout = window.setTimeout(ACG.update, ACK.MSECS_PER_FRAME);
        };

        ACG.updateState = function() {
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

            // Draw player
            scr.beginPath();
            scr.arc(st.playerPos.x, st.playerPos.y, ACK.PLAYER_RADIUS, 0, 2 * Math.PI);
            scr.fillStyle = 'green';
            scr.fill();
            scr.strokeStyle = '2px black';
            scr.stroke();

            // Draw weapon
            scr.beginPath();
            scr.arc(st.weaponPos.x, st.weaponPos.y, ACK.WEAPON_RADIUS, 0, 2 * Math.PI);
            scr.fillStyle = 'red';
            scr.fill();
            scr.strokeStyle = '1.5px black';
            scr.stroke();
        };

        ACG.handleMouseMove = function(ev) {
            ACG.state.mousePos = new AC.Point(ev.clientX, ev.clientY);
            ACG.state.playerPos = ACG.state.mousePos;
        };

        AC.canvas.addEventListener('mousemove', ACG.handleMouseMove);
        ACG.tmout = window.setTimeout(ACG.update, ACK.MSECS_PER_FRAME);
    };

    AC.GameState = function() {
        var S = this;

        S.mousePos  = ACK.PLAYER_START;
        S.playerPos = ACK.PLAYER_START;
        S.weaponPos = ACK.WEAPON_START;
    };

    AC.Point = function(_x, _y) {
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
        });
    };
    AC.Point.prototype = {};
    AC.Point.prototype.constructor = AC.Point;
    AC.Point.prototype.create = function() {
        return new this.constructor(arguments);
    };

    AC.Point.move = function(pt, xOff, yOff) {
        return new AC.Point(pt.x + xOff, pt.y + yOff);
    };

    // FIXME (make it a separate class that inherits)
    AC.Vector = AC.Point;

    AC.defs = new (function() {
        var K = this;
        K.WIDTH = 640;
        K.HEIGHT = 480;
        K.FRAMES_PER_SEC = 50;
        K.MSECS_PER_FRAME = 1000 / K.FRAMES_PER_SEC;

        K.PLAYER_RADIUS = 14;
        K.WEAPON_RADIUS = 12;

        K.PLAYER_START = new AC.Point(K.WIDTH/2, K.HEIGHT/2);
        K.WEAPON_START = AC.Vector.move(K.PLAYER_START, -50, 70);
    })();
    var ACK = AC.defs;
})();

window.addEventListener('load', AntiCon.init);
