
/*:
 * @plugindesc Adds an MMO style aggro table to enemies.
 * @author Artlis
 *
 * @param Aggro Rate
 * @desc Adjust how much damage is converted to aggro by multiplying by this number.
 * @default 1

 */
var Imported = Imported || {};

(function() {

var parameters = PluginManager.parameters('ART_AggroSystem');

var Veil = Veil || {};
Veil.aggroRate = 0.1;//Number(parameters['Aggro Rate']);

//=============================================================================
// Game_Enemy
//=============================================================================

//since the aggro functions use actorId i make an array that ahs all actors
var Game_Enemy_setup = Game_Enemy.prototype.setup;
Game_Enemy.prototype.setup = function(enemyId, x, y) {
  this.aggroTable = new Array($gameActors.length);
    this.aggroReset();
  Game_Enemy_setup.call(this, enemyId, x, y);
};

Game_Enemy.prototype.aggroReset = function() {
  //might not need with the update aggro function
  //this.aggroTable.forEach(function(value){
  //  value = 0;
  //}, 0);
  $gameParty.aliveMembers().forEach(function(member){
    this.aggroTable[member._actorId-1] = member.tgr;
  },this  );
  //apply biases
  this.updateAggro();
};


  Game_Enemy.prototype.aggroSum = function() {
    return this.aggroTable.reduce(function(a,b) {
      return a+b;
    },0);
  };

  Game_Enemy.prototype.updateAggro = function() {
    for (i = 0; i < this.aggroTable.length; ++i) {
      if ($gameParty.aliveMemberHasID(i+1)) //make sure only to modify aggro for alive party
      {
        this.aggroTable[i] = (this.aggroTable[i] / 2) + $gameActors.actor(i+1).tgr;
        //if prefferred target and whatnot

      }
      else {
        this.aggroTable[i] = 0;
      }

    }
    console.log(this.aggroTable);
  };

  var Game_Enemy_gainhp = Game_Enemy.prototype.gainHp;
  Game_Enemy.prototype.gainHp = function(value) {
    if (BattleManager._subject instanceof Game_Actor){
      this.aggroTable[BattleManager._subject._actorId-1] -= (value * 0.01);//Veil.aggroRate);
    }
    Game_Enemy_gainhp.call(this, value);
  }

//=============================================================================
// Game_Party
//=============================================================================

  Game_Party.prototype.aggroTarget = function(enemy) {
    var tgrRand = Math.random() * (this.tgrSum() + enemy.aggroSum());
    var target = null;
    this.aliveMembers().forEach(function(member) {
        tgrRand -= member.tgr + enemy.aggroTable[member._actorId-1];
        if (tgrRand <= 0 && !target) {
            target = member;
        }
    });
    return target;
  };

  Game_Party.prototype.aliveMemberHasID = function (value) {
    var hasID = false;
    this.aliveMembers().forEach(function (member) {
      if (member._actorId === value) {
        hasID = true;
      }
    }, 0);
    return hasID;
  }


  var Game_Party_randomTarget = Game_Party.prototype.randomTarget;
    Game_Party.prototype.randomTarget = function() {
      if (BattleManager._subject instanceof Game_Enemy) {
        return this.aggroTarget(BattleManager._subject);
      }
	  Game_Party_randomTarget.call(this);
  };

//=============================================================================
// Game_Troop
//=============================================================================
  var Game_Troop_increaseTurn = Game_Troop.prototype.increaseTurn;
  Game_Troop.prototype.increaseTurn = function() {
    Game_Troop_increaseTurn.call(this);
    this._enemies.forEach(function(member) {
      member.updateAggro();
    }, 0);
  };


if (Imported.YEP_BattleAICore){
  Game_Action_initialize = Game_Action.prototype.initialize
  Game_Action.prototype.initialize = function(subject, forcing) {
    this.aggroToAdd = -1;
    Game_Action_initialize.call(this, subject, forcing);
  };

    Game_Action_settarget = Game_Action.prototype.setTarget
    Game_Action.prototype.setTarget = function(targetIndex) {
      console.log(targetIndex);
    if (this.aggroToAdd >= 0) {
      this.subject().aggroTable[this.opponentsUnit().smoothTarget(targetIndex)._actorId-1] += this.aggroToAdd;
    } else {
      Game_Action_settarget.call(this, targetIndex)
    }
  };

  AIManager.setProperTarget = function(group) {
      var action = this.action();
      var randomTarget = group[Math.floor(Math.random() * group.length)];
      if (!randomTarget) return action.setTarget(0);
      if (group.length <= 0) return action.setTarget(randomTarget.index());
      var line = this._aiTarget.toUpperCase();
      if (line.match(/AGGRO[ ](\d+)/i)) {
        action.aggroToAdd = parseFloat(RegExp.$1);
        console.log("adding " + action.aggroToAdd);
      }
      if (line.match(/FIRST/i)) {
        action.setTarget(0);
      } else if (line.match(/HIGHEST[ ](.*)/i)) {
        var param = this.getParamId(String(RegExp.$1));
        if (param < 0) return action.setTarget(randomTarget.index());
        if (param === 8) return this.setHighestHpFlatTarget(group);
        if (param === 9) return this.setHighestMpFlatTarget(group);
        if (param === 10) return this.setHighestHpRateTarget(group);
        if (param === 11) return this.setHighestMpRateTarget(group);
        if (param === 12) return this.setHighestLevelTarget(group);
        if (param === 13) return this.setHighestMaxTpTarget(group);
        if (param > 14) return action.setTarget(randomTarget.index());
        this.setHighestParamTarget(group, param);
      } else if (line.match(/LOWEST[ ](.*)/i)) {
        var param = this.getParamId(String(RegExp.$1));
        if (param < 0) return action.setTarget(randomTarget.index());
        if (param === 8) return this.setLowestHpFlatTarget(group);
        if (param === 9) return this.setLowestMpFlatTarget(group);
        if (param === 10) return this.setLowestHpRateTarget(group);
        if (param === 11) return this.setLowestMpRateTarget(group);
        if (param === 12) return this.setLowestLevelTarget(group);
        if (param === 13) return this.setLowestMaxTpTarget(group);
        if (param > 14) return action.setTarget(randomTarget.index());
        this.setLowestParamTarget(group, param);
      } else {
        this.setRandomTarget(group);
      }
  };

  AIManager.setLowestHpFlatTarget = function(group) {
    console.log("look herere now...");
      var maintarget = group[Math.floor(Math.random() * group.length)];
      for (var i = 0; i < group.length; ++i) {
        var target = group[i];
        if (target.hp < maintarget.hp) maintarget = target;
      }
      this.action().setTarget(maintarget.index())
  };
}


  })();  // dont touch this.
