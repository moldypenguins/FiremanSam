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
 * @name FactionMember.js
 * @version 2023/07/22
 * @summary Mongoose Model
 **/


import mongoose from "mongoose";

let FactionMemberSchema = new mongoose.Schema({
  _id:           {type:mongoose.Schema.Types.ObjectId, required:true},
  factionmember_id:         {type:Number, unique:true, required:true},
  factionmember_name:  {type:String, required:true},
  factionmember_level: Number,
  factionmember_days_in_faction: Number,
  factionmember_position: String,
  factionmember_last_action: {
    status: String,
    timestamp: Number,
    relative: String
  },
  factionmember_status: {
    description: String,
    details: String,
    state: String,
    color: String,
    until: Number
  },
  factionmember_faction: {type:mongoose.Schema.Types.ObjectId, required:true, ref:"Faction"}
});

export default mongoose.model("FactionMember", FactionMemberSchema, "FactionMembers");
