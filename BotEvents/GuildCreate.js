"use strict";

import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events } from "discord.js";

export default {
  name: Events.GuildCreate,
  once: false,
  async execute(client, guild) {
    console.log(`Discord: Joined guild ${guild.name} (${guild.id})!`);

    let res = await Guild.create({
      _id: new DB.Types.ObjectId(),
      guild_id: guild.id,
      guild_ownerId: guild.ownerId,
      guild_name: guild.name,
      guild_description: guild.description
    });
    
    //admin logging
    client.channels.cache.get(Config.discord.channel_id).send(`GuildCreate: joined guild ${guild.name} (${guild.id}).`);
  },
};
