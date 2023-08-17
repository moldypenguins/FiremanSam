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
 * @name Application.js
 * @version 2023/07/25
 * @summary Mongoose Model
 **/


import mongoose from "mongoose";

let ApplicationSchema = new mongoose.Schema({
  _id:                   {type:mongoose.Schema.Types.ObjectId, required:true},
  application_userid:    {type:Number, unique:true, required:true},
  application_name:      {type:Boolean, required:true},
  application_level:     {type:Number},
  application_message:   {type:String},
  application_expires:   {type:Date},
  application_status:    {type:String},
  application_messageid: {type:Number}
});

export default mongoose.model("Application", ApplicationSchema, "Applications");
