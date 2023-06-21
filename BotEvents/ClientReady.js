'use strict';

import Config from "../config.js";
import { ActivityType, Events } from "discord.js";

export default {
	name: Events.ClientReady,
	once: true,
	async execute(discordBot) {
    console.log(`Discord: Logged in as ${discordBot.user.tag}!`);
    discordBot.user.setActivity("your mother undress", { type: ActivityType.Watching });
    discordBot.channels.cache.get(Config.discord.channel_id).send("FiremanSam reporting for duty!");
	},
};
