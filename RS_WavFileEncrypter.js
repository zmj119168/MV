/*:
 * @plugindesc Wav File Encrypter
 * @author biud436
 *
 * @param key
 * @desc
 * @default myKey
 *
 */

var Imported = Imported || {};
Imported.RS_WavFileEncrypter = true;

function Encrypter() {
    throw new Error('This is a static class');
}

(function() {

  var parameters = PluginManager.parameters('RS_WavFileEncrypter');

  var fs = require('fs');

  Encrypter.SIGNATURE = "5250474d56000000";
  Encrypter.VER = "000301";
  Encrypter.REMAIN = "0000000000";
  Encrypter._headerlength = 16;
  Encrypter.key = parameters['key'] || 'myKey';
  Encrypter._path = 'js/libs/CryptoJS/';
  Encrypter._wavPath = 'audio/wav/';
  Encrypter._encryptionKey = ["d4", "1d", "8c", "d9", "8f", "00", "b2", "04", "e9", "80", "09", "98", "ec", "f8", "42", "7e"];

  Encrypter.loadScript = function(name) {
    var url = Encrypter.getCurrentPath() + this._path + name;
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.async = false;
    script._url = url;
    document.body.appendChild(script);
  };

  Encrypter.getWaveFiles = function() {
    if(!!process === false) return;
    var index = 0;
    if(process.versions.node && process.versions.v8) {
        var path = require('path'),
        fs = require('fs'),
        root = path.join(".", path.dirname(window.location.pathname), 'audio', 'wav');
        var files = fs.readdirSync(root);
        return files.filter(function(i) {
            var reg = /^[^\.]+$/
            return !reg.test(i);
        });
    }
  };

  Encrypter.isNodeWebkit = function () {
    return Utils.isNwjs();
  };

  Encrypter.readWavStream = function (path) {
    if(!this.isNodeWebkit()) return;

    var requestFile = new XMLHttpRequest();
    requestFile.open("GET", Encrypter.getCurrentPath() + path);
    requestFile.responseType = "arraybuffer";
    requestFile.send();

    requestFile.onload = function () {
        if(this.status < 400) {
          var buffer = Encrypter.encryptArrayBuffer(requestFile.response);
          Encrypter.writeEncryptWaveStream(Encrypter.getCurrentPath() + path, Encrypter.toBuffer(buffer));
        }
    };
  };

  Encrypter.writeEncryptWaveStream = function (path, bin) {
    if(!this.isNodeWebkit()) return;
    var mpath = path.slice( 0, path.lastIndexOf(".") );
    var ext = path.slice( path.lastIndexOf(".") );
    var writeStream = fs.createWriteStream( mpath + ".rpgmvw",  {flags: 'w+'});
    writeStream.write( bin );
    writeStream.end();
    writeStream.on('finish', function() {
    	console.log('finish');
    });
  };

  Encrypter.getCurrentPath = function () {
    if(Utils.isNwjs()) {
      var path = require('path');
      return path.join(".", path.dirname(window.location.pathname), '/');
    } else {
      return window.location.pathname.slice(0, window.location.pathname.lastIndexOf("/")) + "/";
    }
  };

  Encrypter.createHeader = function (size) {
    var bin = new ArrayBuffer(size);
    var dataView = new DataView(bin);
    var i, ref = this.SIGNATURE + this.VER + this.REMAIN;
    for (i = 0; i < size; i++) {
        dataView.setUint8(i, parseInt("0x" + ref.substr(i * 2, 2), size) );
    }
    return bin;
  };

  Encrypter.generateKey = function (encryptKey) {
    var compressedKey = CryptoJS.MD5(encryptKey).toString();
    this._encryptionKey = compressedKey.split(/(.{2})/).filter(Boolean);
  };

  Encrypter.toBuffer = function (bin) {
    var buf = new Buffer(bin.byteLength);
    var headerView = new Uint8Array(bin);
    for (i = 0; i < bin.byteLength; i++) {
      buf[i] = headerView[i];
    }
    return buf;
  };

  Encrypter.encryptArrayBuffer = function(arrayBuffer) {

    if (!arrayBuffer) return null;

    var i = 0;

    // header
    var ref = this.SIGNATURE + this.VER + this.REMAIN;
    var refBytes = new Uint8Array(16);
    for (i = 0; i < this._headerlength; i++) {
        refBytes[i] = parseInt("0x" + ref.substr(i * 2, 2), 16);
    }

    var resultBuffer = new ArrayBuffer(refBytes.byteLength + arrayBuffer.byteLength);

    var view = new DataView(resultBuffer);

    Encrypter.generateKey( Encrypter.key );

    // Address  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | a | b | c | d | e | f | DUMP
    // 00000000 | ------------------------------------------------------------- | RPGMV........................
    // 00000010 | ------------------------------------------------------------- | .wav file header (encrypted)
    // 00000020 | ------------------------------------------------------------- | Do not encrypt

    if (arrayBuffer) {

      // source data
      var resultArray = new Uint8Array(resultBuffer);
      var byteArray = new Uint8Array(arrayBuffer);

      // 0x00 ~ 0x0F
      for (i = 0; i < this._headerlength; i++) {
          resultArray[i] = refBytes[i];
          view.setUint8(i, resultArray[i]);
      }

      // 0x10 ~ 0x1F
      for (i = 0x10; i < 0x20; i++) {
          resultArray[i] = byteArray[i - 0x10] ^ parseInt(this._encryptionKey[i - 0x10], 16);
          view.setUint8(i, resultArray[i]);
      }

      for (i = 0x20; i < resultArray.length; i++) {
          resultArray[i] = byteArray[i -  0x10];
          view.setUint8(i, resultArray[i]);
      }

    }

    return resultBuffer;
  };

  Encrypter.startBuild = function () {
    var files = Encrypter.getWaveFiles();
    files.forEach(function (i) {
      Encrypter.readWavStream(Encrypter._wavPath + i);
    });
  };

  // https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/components/core-min.js
  Encrypter.loadScript('core-min.js');

  // https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/md5.js
  Encrypter.loadScript('md5.js');

  Decrypter.extToEncryptExt = function(url) {
      var ext = url.split('.').pop();
      var encryptedExt = ext;

      if(ext === "ogg") encryptedExt = ".rpgmvo";
      else if(ext === "m4a") encryptedExt = ".rpgmvm";
      else if(ext === "png") encryptedExt = ".rpgmvp";
      else if(ext === "wav") encryptedExt = ".rpgmvw";
      else encryptedExt = ext;

      return url.slice(0, url.lastIndexOf(ext) - 1) + encryptedExt;
  };

})();
