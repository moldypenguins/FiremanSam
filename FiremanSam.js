"use strict";
/**
 * FiremanSam
 * Copyright (c) 2023 The Old Republic - Craig Roberts
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
 * @name FiremanSam.js
 * @version 2023-05-20
 * @summary The Dumpster Fire
 **/



import Config from "./config.js";
import { DB } from "./db.js";
import minimist from "minimist";
import util from "util";

import BotCommands from "./BotCommands/BotCommands.js";
import BotEvents from "./BotEvents/BotEvents.js";

let argv = minimist(process.argv.slice(2), {
    string: [],
    boolean: ["register"],
    alias: { r: "register" },
    default: { "register": false },
    unknown: false
});


import { ActivityType, Client, Collection, Events, GatewayIntentBits, Routes, REST, Guild } from "discord.js";



//register discord commands
if(argv.register) {
    const rest = new REST().setToken(Config.discord.token);
    (async () => {
        try {
            const dsCommands = [];
            Config.discord.commands.forEach(function(name) {
                if(BotCommands[name]) {
                    dsCommands.push(BotCommands[name].data.toJSON());
                }
            });
            const data = await rest.put(Routes.applicationCommands(Config.discord.client_id), {body: dsCommands});
            console.log(`Reloaded ${data.length} discord commands.`);
        } catch (err) {
            console.error(err);
        }
    })();
}

// connect to database
DB.connection.once("open", async () => {

    const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildModeration,
          GatewayIntentBits.GuildIntegrations,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.GuildMessageReactions,
          GatewayIntentBits.GuildMessageTyping,
          GatewayIntentBits.GuildVoiceStates,
          GatewayIntentBits.GuildPresences,
          GatewayIntentBits.GuildScheduledEvents,
          GatewayIntentBits.GuildEmojisAndStickers,
          GatewayIntentBits.GuildInvites,
          GatewayIntentBits.GuildMembers,
          GatewayIntentBits.GuildWebhooks,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.DirectMessageReactions,
          GatewayIntentBits.DirectMessageTyping,
          GatewayIntentBits.MessageContent
        ]
    });

    let dsCommands = new Collection();
    for(let [name, command] of Object.entries(BotCommands)) {
        if(BotCommands[name]) {
            if("data" in command && "execute" in command) {
                dsCommands.set(command.data.name, command);
            }
            else {
                console.log(`[WARNING] The command ${name} is missing a required "data" or "execute" property.`);
            }
        }
        else {
            console.log(`[WARNING] The command ${name} was not found.`);
        }
    }
    client.commands = dsCommands;


    //console.error(`EVENTS: ${util.inspect(Object.keys(BotEvents).length, true, null, true)}`);
    for (const ev in BotEvents) {
      //console.error(`HERE: ${util.inspect(BotEvents[ev], true, null, true)}`);
      if (BotEvents[ev].once) {
        client.once(BotEvents[ev].name, (...args) => BotEvents[ev].execute(client, ...args));
      } else {
        client.on(BotEvents[ev].name, (...args) => BotEvents[ev].execute(client, ...args));
      }
    }







    client.on('messageCreate', (msg) => {
        if(msg.channelId === Config.discord.channel_id && !msg.author.bot) {
            console.log("text: ", util.inspect(msg.cleanContent, true, null, true));
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if(!interaction.isChatInputCommand()) { return; }
        console.log(interaction);

        const command = interaction.client.commands.get(interaction.commandName);

        if(!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
        }
        else {
            try {
                await command.execute(interaction);
            }
            catch(err) {
                console.error(err);
                await interaction.reply({content: "There was an error while executing this command!", ephemeral: true});
            }
        }

    });



    // *******************************************************************************************************************
    // Run bot
    // *******************************************************************************************************************
    console.log("Starting...");
    await client.login(Config.discord.token);




});


