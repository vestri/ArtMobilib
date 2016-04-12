/******************


DeviceOrientationControl
Orient a THREE.Object3D using the gyroscope


Constructor

DeviceOrientationControl(object: THREE.Object3D)


Methods

Connect() 
Listen to the orientation events

Update()
Sets the rotation of the object accordingly to the last orientation event

Disconnect()
Remove the listeners


*******************/


/** @namespace */
var AM = AM || {};


/**
 * Wrapper class for the Cordova plugin
 * @class
 * @param {Object3D}
 */
AM.DeviceOrientationControl = function(object) {
	var that = this;

  this.object = object;
  this.object.rotation.reorder("YXZ");

  var _first_event_ignored = false;
  var _enabled = false;

  var _screen_orientation = 0;

  var _smooth = new this.CoefMethod();


  var OnDeviceOrientationChangeEvent = function (event) {
    if (_first_event_ignored) {
      _smooth.OnOrientationChange(event);
      _enabled = true;
    }
    else
      _first_event_ignored = true;
  };

  var OnScreenOrientationChangeEvent = function () {
    _screen_orientation = window.orientation || 0;
  };

  // The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

  /**
   * Listen to the orientation events
   * @inner
   */
  this.Connect = function() {
    OnScreenOrientationChangeEvent();

    window.addEventListener('orientationchange', OnScreenOrientationChangeEvent, false);
    window.addEventListener('deviceorientation', OnDeviceOrientationChangeEvent, false);
  };

  /**
   * Listen to the orientation events
   * @inner
   */
  this.Disconnect = function() {
    window.removeEventListener('orientationchange', OnScreenOrientationChangeEvent, false);
    window.removeEventListener('deviceorientation', OnDeviceOrientationChangeEvent, false);

    _enabled = false;
  };

  /**
   * Sets the rotation of the object accordingly to the last orientation event
   * @inner
   */
  this.Update = function () {

    var SetObjectQuaternion = function () {
      var zee = new THREE.Vector3( 0, 0, 1 );
      var euler = new THREE.Euler();
      var q0 = new THREE.Quaternion();
      var q1 = new THREE.Quaternion( - Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ); // - PI/2 around the x-axis

      return function (quaternion, alpha, beta, gamma, orient) {
        euler.set( beta, alpha, - gamma, 'YXZ' );                       // 'ZXY' for the device, but 'YXZ' for us
        quaternion.setFromEuler( euler );                               // orient the device
        quaternion.multiply( q1 );                                      // camera looks out the back of the device, not the top
        quaternion.multiply( q0.setFromAxisAngle( zee, - orient ) );    // adjust for screen orientation
      };
    }();

    if (_enabled) {
      var orient = _screen_orientation ? THREE.Math.degToRad(_screen_orientation) : 0;

      _smooth.Update();

      SetObjectQuaternion(that.object.quaternion, _smooth.alpha, _smooth.beta, _smooth.gamma, orient);
    }

  };
};


AM.DeviceOrientationControl.prototype.PowerMethod = function() {
  var that = this;

  var _event;

  var _power = 2;


  this.alpha = 0;
  this.beta = 0;
  this.gamma = 0;

  this.OnOrientationChange = function(e) {
    _event = e;
  };

  function power_lerp_rad(a, b, power) {
    var diff = AM.DeviceOrientationControl.prototype.Mod2Pi(b - a);
    var sign = Math.sign(diff);
    var coef = Math.abs(diff / Math.PI);
    coef = Math.pow(coef, power);

    return AM.DeviceOrientationControl.prototype.Mod2Pi(a + coef * Math.PI * sign);
  }

  this.Update = function() {
    that.alpha = power_lerp_rad(that.alpha, THREE.Math.degToRad(_event.alpha), _power);
    that.beta  = power_lerp_rad(that.beta,  THREE.Math.degToRad(_event.beta),  _power);
    that.gamma = power_lerp_rad(that.gamma, THREE.Math.degToRad(_event.gamma), _power);
  };
};


AM.DeviceOrientationControl.prototype.CoefMethod = function() {
  var that = this;

  this.coef = 0.2;

  this.alpha = 0;
  this.beta = 0;
  this.gamma = 0;

  var _event = false;

  this.OnOrientationChange = function(e) {
    _event = e;
  };

  function lerp_rad(a, b, coef) {
    return a + AM.DeviceOrientationControl.prototype.Mod2Pi(b - a) * coef;
  }

  this.Update = function() {
    if (_event) {
      var alpha = lerp_rad(that.alpha, THREE.Math.degToRad(_event.alpha), that.coef);
      var beta  = lerp_rad(that.beta,  THREE.Math.degToRad(_event.beta),  that.coef);
      var gamma = lerp_rad(that.gamma, THREE.Math.degToRad(_event.gamma), that.coef);

      that.alpha = alpha;
      that.beta = beta;
      that.gamma = gamma;
    }
  };
};


AM.DeviceOrientationControl.prototype.AverageMethod = function() {
  var that = this;

  this.history = [];
  this.history_max = 10;

  this.alpha = 0;
  this.beta = 0;
  this.gamma = 0;

  this.OnOrientationChange = function(event) {
    if (that.history.length > that.history_max)
      that.history.shift();
    that.history.push(event);
  };

  this.Update = function(alpha, beta, gamma) {
    var alpha = 0;
    var beta = 0;
    var gamma = 0;

    if (that.history.length != 0) {
      for (var i = 0, c = that.history.length; i < c; i++) {
        alpha += AM.DeviceOrientationControl.prototype.Mod360(that.history[i].alpha);
        beta += AM.DeviceOrientationControl.prototype.Mod360(that.history[i].beta);
        gamma += AM.DeviceOrientationControl.prototype.Mod360(that.history[i].gamma);
      }
      alpha /= that.history.length;
      beta /= that.history.length;
      gamma /= that.history.length;
      that.alpha = THREE.Math.degToRad(alpha);
      that.beta = THREE.Math.degToRad(beta);
      that.gamma = THREE.Math.degToRad(gamma);
    }
  };
};



AM.DeviceOrientationControl.prototype.Mod2Pi = function () {
  var n = Math.PI;
  var k = Math.PI * 2;

  return function(val) {
    if (val > n) {
      do {
        val -= k;
      } while (val > n);
    }
    else if (val < -n) {
      do {
        val += k;
      } while (val < -n);
    }
    return val;
  };
}();


AM.DeviceOrientationControl.prototype.Mod360 = function(val) {
  val = val % 360;
  return (val < 180) ? val : val - 360;
};