"use strict";
/**
 * Gandalf
 * Copyright (c) 2020 Gandalf Planetarion Tools
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see https://www.gnu.org/licenses/gpl-3.0.html
 *
 * @name Faction.js
 * @version 2023/07/22
 * @summary Mongoose Model
 **/

import util from "util";
import Config from "../config.js";
import { DB, Faction, FactionMember } from "../db.js";
import { TornAPI } from "ts-torn-api";

let FactionSchema = new DB.Schema({
  _id:           {type:DB.Schema.Types.ObjectId, required:true},
  faction_id:         {type:Number, unique:true, required:true},
  faction_name:  {type:String, required:true},
  faction_tag: String,
  faction_tag_image: String,
  faction_respect: Number,
  faction_age: Number,
  faction_capacity: Number,
  faction_best_chain: Number,
  faction_last_updated: Date,
  faction_type: String,
  faction_member_role: String,
  faction_bank_channel: String,
  faction_banker_role: String
});







FactionSchema.statics.api_add = async(faction_id, faction_type) => {
  let torn = new TornAPI(Config.torn.api_keys[Math.floor(Math.random()*Config.torn.api_keys.length)]);
  let faction = await torn.faction.faction(faction_id);
  //console.log(`FAC: ${util.inspect(faction, true, null, true)}`);
  if(faction != null) {
    let fac = new Faction({
      _id: new DB.Types.ObjectId(),
      faction_id: faction.ID,
      faction_name: faction.name,
      faction_tag: faction.tag,
      faction_tag_image: faction.tag_image,
      faction_respect: faction.respect,
      faction_age: faction.age,
      faction_capacity: faction.capacity,
      faction_best_chain: faction.best_chain,
      faction_last_updated: new Date(),
      faction_type: faction_type
    });
    await fac.save();

    //add faction members
    for(let m = 0; m < faction.members.length; m++) {
      if(!(await FactionMember.exists({factionmember_id: faction.members[m].id}))) {
        let facmem = new FactionMember({
          _id: new DB.Types.ObjectId(),
          factionmember_id: faction.members[m].id,
          factionmember_name: faction.members[m].name,

          factionmember_level: faction.members[m].level,
          factionmember_days_in_faction: faction.members[m].days_in_faction,
          factionmember_position: faction.members[m].position,
          factionmember_faction: fac
        });
        await facmem.save();
      }
    }
    return fac;
  } else {
    return null;
  }
};


FactionSchema.statics.api_update = async(faction_id) => {
  let torn = new TornAPI(Config.torn.api_keys[Math.floor(Math.random()*Config.torn.api_keys.length)]);
  let faction = await torn.faction.faction(faction_id);
  //console.log(`FAC: ${util.inspect(faction, true, null, true)}`);
  if(faction != null) {
    let fac;
    if(await Faction.exists({faction_id: faction.ID})) {
      await Faction.updateOne({faction_id: faction.ID}, {
        faction_name: faction.name,
        faction_tag: faction.tag,
        faction_tag_image: faction.tag_image,
        faction_respect: faction.respect,
        faction_age: faction.age,
        faction_capacity: faction.capacity,
        faction_best_chain: faction.best_chain,
        faction_last_updated: new Date()
      });

      fac = await Faction.findOne({faction_id: faction.ID});
    
      //update faction members
      for(let m = 0; m < faction.members.length; m++) {
        if(!(await FactionMember.exists({factionmember_id: faction.members[m].id}))) {
          let facmem = new FactionMember({
            _id: new DB.Types.ObjectId(),
            factionmember_id: faction.members[m].id,
            factionmember_name: faction.members[m].name,

            factionmember_level: faction.members[m].level,
            factionmember_days_in_faction: faction.members[m].days_in_faction,
            factionmember_position: faction.members[m].position,
            factionmember_faction: fac
          });
          await facmem.save();
        }
      }
    }
    return true;
  } else {
    return false;
  }
};


export default DB.model("Faction", FactionSchema, "Factions");
