/**
 * Circuit
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
 * @name config.example.js
 * @version 2024/03/05
 * @summary example configuration file
 **/

const Configuration = {
  discord: {
    token: "",
    client_id: "",
    guild_id: ""
  },
  db: {
    url: "127.0.0.1:27017",
    name: "",
    user: "",
    pass: ""
  }
};

export default Configuration;
