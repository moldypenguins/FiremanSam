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
 * @name db.js
 * @version 2023/01/18
 * @summary Database
 **/

import mongoose from "mongoose";
import Config from "./config.js";
import Guild from "./Models/Guild.js";
import Message from "./Models/Message.js";
import Member from "./Models/Member.js";

mongoose.set("strictQuery", true);
mongoose
  .connect(`mongodb://${Config.db.url}`, {
    //user: Config.db.user,
    //pass: Config.db.pass,
    dbName: Config.db.name,
  })
  .catch((err) => console.log(err.reason));
mongoose.connection.on("error", (err) => console.log(err.reason));
mongoose.connection.once("open", () => console.log("Database loaded."));

export { mongoose as DB, Guild, Message, Member };
