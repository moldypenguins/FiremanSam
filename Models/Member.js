"use strict";
/**
 * Fireman Sam
 * Copyright (c) 2023 Craig Roberts
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
 * @name Member.js
 * @version 2021/11/14
 * @summary Mongoose Model
 **/

import mongoose from "mongoose";

let MemberSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true },
  member_id: { type: String },
  member_nickname: { type: String, unique: true, required: true },
  member_telegram: { type: String, unique: true, required: true },
});

MemberSchema.index({ member_id: 1 }, { unique: true, sparse: true });

export default mongoose.model("Member", MemberSchema, "Members");
